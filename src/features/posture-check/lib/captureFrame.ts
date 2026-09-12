import { assessCanvasQuality, NO_PERSON_WARNING, type ImageQualityAssessment } from './imageQuality'
import type { PersonCheckResult } from '../hooks/usePersonDetector'

const MAX_DIMENSION = 960
const JPEG_QUALITY = 0.85

export interface CapturedFrame {
  dataUrl: string
  quality: ImageQualityAssessment
}

/** Optional on-device pose-model check — returns null to skip (model not loaded yet, never blocks capture on it). */
type DetectPerson = (source: HTMLCanvasElement | HTMLImageElement) => PersonCheckResult | null

function withPersonCheck(quality: ImageQualityAssessment, personResult: PersonCheckResult | null): ImageQualityAssessment {
  if (!personResult || personResult.present) return quality
  return { ...quality, warnings: [...quality.warnings, NO_PERSON_WARNING] }
}

/**
 * Draws the current video frame onto an off-screen canvas, downscaled to a
 * reasonable size, and returns it as a JPEG data URL alongside a real,
 * locally-computed quality check (see imageQuality.ts) — so the review screen
 * can warn about an actually-dark/blurry/person-not-visible photo instead of
 * showing the same generic caveat on every capture. Nothing here touches the
 * network — the data URL is only used locally until the user explicitly
 * chooses "Analyze Posture".
 */
export function captureFrame(video: HTMLVideoElement, detectPerson?: DetectPerson): CapturedFrame {
  const { videoWidth, videoHeight } = video
  if (!videoWidth || !videoHeight) {
    throw new Error('Camera is not ready yet.')
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(videoWidth, videoHeight))
  const width = Math.max(1, Math.round(videoWidth * scale))
  const height = Math.max(1, Math.round(videoHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not access canvas context.')
  }
  ctx.drawImage(video, 0, 0, width, height)
  const quality = withPersonCheck(assessCanvasQuality(canvas), detectPerson?.(canvas) ?? null)
  return { dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY), quality }
}

/** Reads a user-selected file (the "upload a photo instead" fallback) as a data URL. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read the selected file.'))
    reader.readAsDataURL(file)
  })
}

/** Same quality check as captureFrame, but for an already-have data URL (the upload fallback path). */
export function assessDataUrlQuality(dataUrl: string, detectPerson?: DetectPerson): Promise<ImageQualityAssessment> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || 1
      canvas.height = img.naturalHeight || 1
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not access canvas context.'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(withPersonCheck(assessCanvasQuality(canvas), detectPerson?.(canvas) ?? null))
    }
    img.onerror = () => reject(new Error('Could not read that image.'))
    img.src = dataUrl
  })
}
