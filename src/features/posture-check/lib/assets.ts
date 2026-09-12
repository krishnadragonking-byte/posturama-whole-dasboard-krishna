/**
 * Reuses the same vendored MediaPipe WASM runtime + pose model that the
 * neck-posture module downloads via `npm run setup` — no separate download,
 * same on-device, nothing-leaves-the-device guarantee.
 */
const BASE_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || './'

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
  poseModel: assetUrl('mediapipe/models/pose_landmarker_lite.task'),
}
