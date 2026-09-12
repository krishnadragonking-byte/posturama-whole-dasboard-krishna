import { SMILE } from '../constants'

/** Minimal shape we need from a MediaPipe FaceLandmarker blendshape category. */
export interface BlendshapeCategory {
  categoryName: string
  score: number
}

/**
 * A smile score (0..1) from the face's blendshape coefficients: the mean of
 * the left/right "mouth smile" shapes MediaPipe's Face Landmarker reports for
 * every tracked face — the same on-device model already vendored for the
 * neck-posture module's pose detection, just a different task bundle.
 */
export function smileScoreFromBlendshapes(categories: BlendshapeCategory[] | undefined): number {
  if (!categories || categories.length === 0) return 0
  const left = categories.find((c) => c.categoryName === 'mouthSmileLeft')?.score ?? 0
  const right = categories.find((c) => c.categoryName === 'mouthSmileRight')?.score ?? 0
  return (left + right) / 2
}

/**
 * Turns a per-frame score into a stable smiling/not-smiling boolean using
 * hysteresis: once smiling, the score has to drop further before we call it
 * "stopped", so a smile that briefly dips near the threshold doesn't flicker.
 */
export function isSmilingWithHysteresis(score: number, wasSmiling: boolean): boolean {
  return wasSmiling ? score > SMILE.exitThreshold : score >= SMILE.enterThreshold
}

/** Exponential moving average — one new frame folded into the running score. */
export function smoothSmileScore(previous: number, raw: number, weight = SMILE.smoothing): number {
  return previous + (raw - previous) * weight
}
