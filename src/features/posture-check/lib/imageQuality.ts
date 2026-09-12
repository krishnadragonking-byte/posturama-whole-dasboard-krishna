/**
 * A cheap, local, best-effort check of whether a captured photo looks too
 * dark, too bright, or blurry/flat — run entirely on-device against the
 * captured frame's own pixels, never sent anywhere. This is a heuristic, not
 * a guarantee: it exists so the review screen only warns the user when it has
 * actually detected something, instead of always showing a generic "if it
 * looks blurry, retake it" line regardless of the real photo.
 */

export interface ImagePixels {
  /** RGBA bytes, length = width * height * 4 (a browser ImageData's `.data`, or equivalent). */
  data: ArrayLike<number>
  width: number
  height: number
}

export type QualityWarningCode = 'dark' | 'bright' | 'blurry' | 'no-person'

export interface QualityWarning {
  code: QualityWarningCode
  message: string
}

export const NO_PERSON_WARNING: QualityWarning = {
  code: 'no-person',
  message: 'We couldn’t clearly detect a person in this photo.',
}

export interface ImageQualityAssessment {
  /** 0 (black) .. 255 (white) */
  meanBrightness: number
  /** Variance of a discrete Laplacian over a downsampled grayscale grid — a standard, cheap blur proxy. Higher = sharper. */
  sharpness: number
  warnings: QualityWarning[]
}

// Grid the frame down to this many samples per axis before analysis — plenty
// to catch "this is basically a flat/frozen frame" without doing real work on
// a full-resolution capture.
const SAMPLE_GRID = 96

const DARK_MEAN_BRIGHTNESS = 35
const BRIGHT_MEAN_BRIGHTNESS = 240
// Deliberately conservative: only flags near-flat/frozen frames. A wrong
// "this looks blurry" is worse than occasionally missing a genuinely blurry
// one — the message is phrased with "may", and it never blocks the user.
const BLUR_VARIANCE_THRESHOLD = 4

function toGrayscaleGrid(pixels: ImagePixels): { gray: Float64Array; w: number; h: number } {
  const { data, width, height } = pixels
  const w = Math.max(2, Math.min(SAMPLE_GRID, width))
  const h = Math.max(2, Math.min(SAMPLE_GRID, height))
  const gray = new Float64Array(w * h)
  for (let y = 0; y < h; y++) {
    const sy = Math.min(height - 1, Math.floor((y / h) * height))
    for (let x = 0; x < w; x++) {
      const sx = Math.min(width - 1, Math.floor((x / w) * width))
      const idx = (sy * width + sx) * 4
      gray[y * w + x] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
    }
  }
  return { gray, w, h }
}

export function assessImageQuality(pixels: ImagePixels): ImageQualityAssessment {
  const { gray, w, h } = toGrayscaleGrid(pixels)

  let sum = 0
  for (let i = 0; i < gray.length; i++) sum += gray[i]
  const meanBrightness = sum / gray.length

  const responses: number[] = []
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      responses.push(gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w] - 4 * gray[i])
    }
  }
  const respMean = responses.length > 0 ? responses.reduce((a, b) => a + b, 0) / responses.length : 0
  const sharpness =
    responses.length > 0 ? responses.reduce((a, b) => a + (b - respMean) ** 2, 0) / responses.length : 0

  const warnings: QualityWarning[] = []
  if (meanBrightness < DARK_MEAN_BRIGHTNESS) {
    warnings.push({ code: 'dark', message: 'This photo may be too dark to analyze well.' })
  } else if (meanBrightness > BRIGHT_MEAN_BRIGHTNESS) {
    warnings.push({ code: 'bright', message: 'This photo may be too bright or washed out.' })
  } else if (sharpness < BLUR_VARIANCE_THRESHOLD) {
    // Only checked once brightness is in a normal range — a very dark or
    // blown-out frame also has low edge variance, and the warning above is
    // the more useful one to show in that case.
    warnings.push({ code: 'blurry', message: 'This photo may be blurry or out of focus.' })
  }

  return { meanBrightness, sharpness, warnings }
}

/** Runs assessImageQuality against a canvas's current contents. */
export function assessCanvasQuality(canvas: HTMLCanvasElement): ImageQualityAssessment {
  const ctx = canvas.getContext('2d')
  if (!ctx) return { meanBrightness: 128, sharpness: Infinity, warnings: [] }
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return assessImageQuality(imageData)
}
