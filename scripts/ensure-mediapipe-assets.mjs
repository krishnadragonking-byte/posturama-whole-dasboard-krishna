// Ensures the on-device MediaPipe assets are present in /public before dev/build.
//
// Everything Posturama's neck-posture module needs for landmark detection runs
// locally in the browser. This script vendors those static assets so the app
// never has to reach a CDN at runtime:
//   - the Tasks-Vision WASM runtime (copied from node_modules)
//   - the Pose Landmarker "lite" model (downloaded once from Google's public
//     model bucket; this is a one-time asset fetch, never webcam data)
//
// Run automatically via the `predev` / `prebuild` npm hooks.

import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const wasmSrcDir = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const wasmOutDir = join(root, 'public', 'mediapipe', 'wasm')
const modelOutDir = join(root, 'public', 'mediapipe', 'models')
const modelFile = join(modelOutDir, 'pose_landmarker_lite.task')
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'
// Face Landmarker — powers the Couple Smile experience (face + smile detection).
// Same on-device model family as the pose model above; vendored the same way.
const faceModelFile = join(modelOutDir, 'face_landmarker.task')
const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task'

function ensureDir(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true })
}

function copyWasm() {
  if (!existsSync(wasmSrcDir)) {
    console.warn('[mediapipe-assets] node_modules/@mediapipe/tasks-vision not found — run `npm install` first.')
    return
  }
  ensureDir(wasmOutDir)
  for (const name of readdirSync(wasmSrcDir)) {
    const out = join(wasmOutDir, name)
    if (!existsSync(out)) copyFileSync(join(wasmSrcDir, name), out)
  }
}

async function fetchModel() {
  ensureDir(modelOutDir)
  if (existsSync(modelFile) && statSync(modelFile).size > 1_000_000) return
  console.log('[mediapipe-assets] downloading pose_landmarker_lite.task (~5.5 MB, one time)…')
  const res = await fetch(MODEL_URL)
  if (!res.ok) throw new Error(`Failed to download model: ${res.status} ${res.statusText}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const { writeFileSync } = await import('node:fs')
  writeFileSync(modelFile, buf)
  console.log('[mediapipe-assets] model saved to public/mediapipe/models/')
}

async function fetchFaceModel() {
  ensureDir(modelOutDir)
  if (existsSync(faceModelFile) && statSync(faceModelFile).size > 1_000_000) return
  console.log('[mediapipe-assets] downloading face_landmarker.task (~3.7 MB, one time)…')
  const res = await fetch(FACE_MODEL_URL)
  if (!res.ok) throw new Error(`Failed to download face model: ${res.status} ${res.statusText}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const { writeFileSync } = await import('node:fs')
  writeFileSync(faceModelFile, buf)
  console.log('[mediapipe-assets] face model saved to public/mediapipe/models/')
}

try {
  copyWasm()
  await fetchModel()
  await fetchFaceModel()
} catch (err) {
  console.warn(`[mediapipe-assets] ${err.message}`)
  console.warn('[mediapipe-assets] The app still runs; the camera module will show a load error until assets are available.')
}
