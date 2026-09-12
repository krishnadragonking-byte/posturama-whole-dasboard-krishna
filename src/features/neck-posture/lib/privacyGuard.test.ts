import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isTelemetryHost } from './privacyGuard'

test('recognises MediaPipe / analytics telemetry hosts', () => {
  assert.equal(isTelemetryHost('https://odml.pa.googleapis.com/v1/log'), true)
  assert.equal(isTelemetryHost('https://www.google-analytics.com/collect'), true)
  assert.equal(isTelemetryHost('https://firebaselogging-pa.googleapis.com/x'), true)
})

test('lets the app’s own static assets through', () => {
  const base = 'http://localhost:5173/'
  assert.equal(isTelemetryHost('/mediapipe/models/pose_landmarker_lite.task', base), false)
  assert.equal(isTelemetryHost('/mediapipe/wasm/vision_wasm_internal.wasm', base), false)
  assert.equal(isTelemetryHost('http://localhost:5173/assets/index.js', base), false)
})

test('does not over-block other googleapis subdomains (e.g. model bucket)', () => {
  assert.equal(isTelemetryHost('https://storage.googleapis.com/mediapipe-models/x.task'), false)
})

test('malformed URLs are treated as not-telemetry (fail open for the app, closed by CSP)', () => {
  assert.equal(isTelemetryHost('not a url'), false)
})
