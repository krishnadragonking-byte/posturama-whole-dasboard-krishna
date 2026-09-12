import type { ChallengeDuration } from './types'

/**
 * Smile detection is deliberately forgiving: a webcam smile reads noisier
 * frame-to-frame than a fixed pose, so we smooth the raw blendshape score and
 * use two different thresholds for turning "smiling" on vs. off (hysteresis).
 * That stops the state flickering when someone's smile hovers near the line.
 */
export const SMILE = {
  // MediaPipe's mouthSmileLeft/Right blendshapes read lower than you'd guess
  // for an ordinary, non-exaggerated smile — thresholds tuned generously so a
  // genuine smile registers, not just a big toothy grin.
  enterThreshold: 0.32, // score needed to become "smiling"
  exitThreshold: 0.16, // score must drop below this to stop being "smiling"
  smoothing: 0.45, // EMA weight given to each new frame (0..1, higher = snappier)
}

export const TIMING = {
  /** Grace window (ms): absorbs a single dropped/blipped frame, not a real pause. */
  pauseGraceMs: 250,
  /** Detection loop cap, plenty smooth for a smile game. */
  detectFps: 15,
  durations: [30, 60] as const satisfies readonly ChallengeDuration[],
  defaultDuration: 30 as ChallengeDuration,
  /** Consecutive no-face frames before we call it "no one in frame". */
  noFaceFrames: 10,
}

/**
 * Local, on-device asset paths (served from /public — never a remote call at
 * runtime), resolved the same way as the neck-posture module's assets so the
 * app works from the domain root or any sub-path.
 */
const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || './'

function assetUrl(path: string): string {
  try {
    const doc = typeof document !== 'undefined' ? document.baseURI : 'http://localhost/'
    return new URL(`${BASE_URL}${path}`, doc).href
  } catch {
    return `${BASE_URL}${path}`
  }
}

export const ASSETS = {
  wasmDir: assetUrl('mediapipe/wasm'),
  faceModel: assetUrl('mediapipe/models/face_landmarker.task'),
}
