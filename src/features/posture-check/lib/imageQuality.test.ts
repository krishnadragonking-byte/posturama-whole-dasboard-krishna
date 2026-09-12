import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assessImageQuality, type ImagePixels } from './imageQuality'

function solid(width: number, height: number, value: number): ImagePixels {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = value
    data[i * 4 + 1] = value
    data[i * 4 + 2] = value
    data[i * 4 + 3] = 255
  }
  return { data, width, height }
}

function checkerboard(width: number, height: number, cell = 4): ImagePixels {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const on = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0
      const value = on ? 235 : 20
      const i = (y * width + x) * 4
      data[i] = value
      data[i + 1] = value
      data[i + 2] = value
      data[i + 3] = 255
    }
  }
  return { data, width, height }
}

// Deterministic pseudo-random noise around a mid-brightness mean — stands in
// for "real photo texture" (skin, hair, clothing, background) without needing
// an actual webcam frame.
function noisy(width: number, height: number, mean = 130, amplitude = 60): ImagePixels {
  const data = new Uint8ClampedArray(width * height * 4)
  let seed = 42
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  for (let i = 0; i < width * height; i++) {
    const value = Math.max(0, Math.min(255, mean + (rand() - 0.5) * 2 * amplitude))
    data[i * 4] = value
    data[i * 4 + 1] = value
    data[i * 4 + 2] = value
    data[i * 4 + 3] = 255
  }
  return { data, width, height }
}

test('assessImageQuality: a uniform mid-gray frame is flagged as blurry, not dark/bright', () => {
  const result = assessImageQuality(solid(64, 64, 128))
  assert.equal(result.sharpness, 0)
  assert.deepEqual(
    result.warnings.map((w) => w.code),
    ['blurry'],
  )
})

test('assessImageQuality: a near-black frame is flagged as dark, not blurry', () => {
  const result = assessImageQuality(solid(64, 64, 5))
  assert.ok(result.meanBrightness < 35)
  assert.deepEqual(
    result.warnings.map((w) => w.code),
    ['dark'],
  )
})

test('assessImageQuality: a near-white frame is flagged as bright', () => {
  const result = assessImageQuality(solid(64, 64, 250))
  assert.ok(result.meanBrightness > 240)
  assert.deepEqual(
    result.warnings.map((w) => w.code),
    ['bright'],
  )
})

test('assessImageQuality: a sharp high-contrast image has no warnings', () => {
  const result = assessImageQuality(checkerboard(64, 64))
  assert.ok(result.sharpness > 100, `expected high sharpness, got ${result.sharpness}`)
  assert.deepEqual(result.warnings, [])
})

test('assessImageQuality: a normal, mid-brightness, textured photo has no warnings', () => {
  const result = assessImageQuality(noisy(96, 96))
  assert.ok(result.meanBrightness > 35 && result.meanBrightness < 240)
  assert.deepEqual(result.warnings, [], `unexpected warnings: ${JSON.stringify(result.warnings)}`)
})

test('assessImageQuality: never throws on a 1x1 frame', () => {
  assert.doesNotThrow(() => assessImageQuality(solid(1, 1, 128)))
})
