import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Point, PoseFrame } from '../types'
import { ALL_POSES, SEATED_SEQUENCE, STANDING_SEQUENCE } from './guidedPoses'

const p = (x: number, y: number, visibility = 0.9): Point => ({ x, y, visibility })

/** A relaxed, upright, front-facing full-body frame; override any joint. */
function frame(over: Partial<PoseFrame> = {}): PoseFrame {
  const base: PoseFrame = {
    nose: p(0.5, 0.16),
    leftEye: p(0.47, 0.15),
    rightEye: p(0.53, 0.15),
    leftEar: p(0.44, 0.16),
    rightEar: p(0.56, 0.16),
    leftShoulder: p(0.4, 0.3),
    rightShoulder: p(0.6, 0.3),
    leftElbow: p(0.37, 0.42),
    rightElbow: p(0.63, 0.42),
    leftWrist: p(0.38, 0.52),
    rightWrist: p(0.62, 0.52),
    leftHip: p(0.44, 0.55),
    rightHip: p(0.56, 0.55),
    leftKnee: p(0.44, 0.75),
    rightKnee: p(0.56, 0.75),
    leftAnkle: p(0.44, 0.95),
    rightAnkle: p(0.56, 0.95),
    confidence: 0.9,
    lowerConfidence: 0.9,
    raw: [],
  }
  return { ...base, ...over }
}

const pose = (id: string) => ALL_POSES.find((g) => g.id === id)!

test('every pose is defined with copy + a checker', () => {
  for (const g of ALL_POSES) {
    assert.ok(g.label && g.instruction)
    assert.equal(typeof g.check, 'function')
  }
})

test('both sequences are 5 easy positions; seated has no leg poses', () => {
  assert.equal(SEATED_SEQUENCE.length, 5)
  assert.equal(STANDING_SEQUENCE.length, 5)
  assert.ok(SEATED_SEQUENCE.every((p) => !p.needsLegs))
  assert.ok(STANDING_SEQUENCE.some((p) => p.needsLegs))
})

test('seated set uses gentle side-bends instead of knee lifts', () => {
  const ids = SEATED_SEQUENCE.map((p) => p.id)
  assert.ok(ids.includes('lean-a') && ids.includes('lean-b'))
  assert.ok(!ids.includes('knee-a'))
})

test('tall: a level, centred frame matches', () => {
  assert.equal(pose('tall').check(frame(), {}).matched, true)
})

test('tall: a clearly dropped shoulder does not match', () => {
  const r = pose('tall').check(frame({ rightShoulder: p(0.6, 0.42) }), {})
  assert.equal(r.matched, false)
  assert.match(r.hint, /shoulder/i)
})

test('reach-up: both wrists well above the shoulders matches', () => {
  const r = pose('reach-up').check(
    frame({ leftWrist: p(0.43, 0.04), rightWrist: p(0.57, 0.04) }),
    {},
  )
  assert.equal(r.matched, true)
})

test('reach-up: invisible arms ask you to step back, no match', () => {
  const r = pose('reach-up').check(
    frame({ leftWrist: p(0.4, 0.5, 0.1), rightWrist: p(0.6, 0.5, 0.1) }),
    {},
  )
  assert.equal(r.matched, false)
  assert.match(r.hint, /view|back/i)
})

test('knee-a: lifting one knee matches and reports the side', () => {
  const r = pose('knee-a').check(frame({ leftKnee: p(0.44, 0.58) }), {})
  assert.equal(r.matched, true)
  assert.equal(r.liftedSide, 'left')
})

test('knee-a: knees out of view do not fail the user harshly', () => {
  const r = pose('knee-a').check(
    frame({
      leftHip: p(0.44, 0.55, 0.1),
      rightHip: p(0.56, 0.55, 0.1),
      leftKnee: p(0.44, 0.75, 0.1),
      rightKnee: p(0.56, 0.75, 0.1),
      lowerConfidence: 0.1,
    }),
    {},
  )
  assert.equal(r.matched, false)
  assert.match(r.hint, /visible|camera|back/i)
})

test('knee-b: must be the opposite knee from knee-a', () => {
  const other = pose('knee-b').check(frame({ rightKnee: p(0.56, 0.58) }), {
    lastLiftedSide: 'left',
  })
  assert.equal(other.matched, true)

  const same = pose('knee-b').check(frame({ leftKnee: p(0.44, 0.58) }), {
    lastLiftedSide: 'left',
  })
  assert.equal(same.matched, false)
})

test('tall: a small, natural shoulder tilt is still accepted (forgiving)', () => {
  assert.equal(pose('tall').check(frame({ rightShoulder: p(0.6, 0.33) }), {}).matched, true)
})

test('reach-up: one hand up = partial credit, not a match', () => {
  const r = pose('reach-up').check(frame({ leftWrist: p(0.43, 0.05) }), {})
  assert.equal(r.matched, false)
  assert.ok(r.progress > 0.35 && r.progress < 0.75, `expected partial progress, got ${r.progress}`)
  assert.match(r.hint, /other hand/i)
})

test('lean-a: shifting the upper body off the hips matches', () => {
  const r = pose('lean-a').check(
    frame({ leftShoulder: p(0.32, 0.3), rightShoulder: p(0.52, 0.3), nose: p(0.4, 0.16) }),
    {},
  )
  assert.equal(r.matched, true)
  assert.ok(r.leanSide === 'left' || r.leanSide === 'right')
})

test('lean-b: must be the opposite side from lean-a', () => {
  const leftLean = { leftShoulder: p(0.32, 0.3), rightShoulder: p(0.52, 0.3), nose: p(0.4, 0.16) }
  const same = pose('lean-b').check(frame(leftLean), { lastLeanSide: 'left' })
  assert.equal(same.matched, false)
  const other = pose('lean-b').check(
    frame({ leftShoulder: p(0.48, 0.3), rightShoulder: p(0.68, 0.3), nose: p(0.6, 0.16) }),
    { lastLeanSide: 'left' },
  )
  assert.equal(other.matched, true)
})

test('lean: sitting upright and centred does not match', () => {
  assert.equal(pose('lean-a').check(frame(), {}).matched, false)
})

test('arms-wide: a wide T at shoulder height matches', () => {
  const r = pose('arms-wide').check(
    frame({
      leftWrist: p(0.06, 0.3),
      rightWrist: p(0.94, 0.3),
      leftElbow: p(0.22, 0.3),
      rightElbow: p(0.78, 0.3),
    }),
    {},
  )
  assert.equal(r.matched, true)
})
