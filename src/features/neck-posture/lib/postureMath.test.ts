/**
 * Unit tests for the posture geometry. Run with:  npm test
 * (Node's built-in test runner + type stripping — no extra dependencies.)
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { POSE } from '../constants'
import type { Point } from '../types'
import {
  buildBaseline,
  evaluate,
  headHeightRatio,
  headTiltDeg,
  isWithinRange,
  shoulderDelta,
  toPoseFrame,
} from './postureMath'

/** Build a 33-point landmark array from a few key points (rest are filler). */
function makePose(opts: {
  eyeY?: number
  eyeXOffset?: number // right eye y relative to left (for tilt)
  shoulderY?: number
  shoulderRightY?: number
  vis?: number
}): Point[] {
  const {
    eyeY = 0.3,
    eyeXOffset = 0,
    shoulderY = 0.6,
    shoulderRightY = shoulderY,
    vis = 0.95,
  } = opts
  const pts: Point[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: vis }))
  pts[POSE.nose] = { x: 0.5, y: eyeY - 0.03, visibility: vis }
  pts[POSE.leftEye] = { x: 0.44, y: eyeY, visibility: vis }
  pts[POSE.rightEye] = { x: 0.56, y: eyeY + eyeXOffset, visibility: vis }
  pts[POSE.leftEar] = { x: 0.4, y: eyeY, visibility: vis }
  pts[POSE.rightEar] = { x: 0.6, y: eyeY + eyeXOffset, visibility: vis }
  pts[POSE.leftShoulder] = { x: 0.35, y: shoulderY, visibility: vis }
  pts[POSE.rightShoulder] = { x: 0.65, y: shoulderRightY, visibility: vis }
  return pts
}

test('toPoseFrame extracts key points and averages confidence', () => {
  const frame = toPoseFrame(makePose({ vis: 0.8 }))
  assert.ok(frame)
  assert.equal(Math.round(frame.confidence * 100), 80)
})

test('headHeightRatio shrinks as the head drops toward the shoulders', () => {
  const upright = toPoseFrame(makePose({ eyeY: 0.3, shoulderY: 0.6 }))!
  const slumped = toPoseFrame(makePose({ eyeY: 0.42, shoulderY: 0.6 }))!
  assert.ok(headHeightRatio(slumped) < headHeightRatio(upright))
})

test('headTiltDeg is ~0 when eyes are level and non-zero when tilted', () => {
  assert.ok(Math.abs(headTiltDeg(toPoseFrame(makePose({}))!)) < 1)
  const tilted = headTiltDeg(toPoseFrame(makePose({ eyeXOffset: 0.05 }))!)
  assert.ok(Math.abs(tilted) > 8)
})

test('shoulderDelta sign follows which shoulder is lower', () => {
  const rightLower = shoulderDelta(toPoseFrame(makePose({ shoulderY: 0.55, shoulderRightY: 0.65 }))!)
  assert.ok(rightLower > 0)
})

test('evaluate: matching the baseline reads as all-good and within range', () => {
  const frames = [makePose({}), makePose({}), makePose({})].map((p) => toPoseFrame(p)!)
  const baseline = buildBaseline(frames)
  const f = toPoseFrame(makePose({}))!
  const reading = evaluate(
    { headHeightRatio: headHeightRatio(f), tiltDeg: headTiltDeg(f), shoulderDelta: shoulderDelta(f) },
    baseline,
    0.95,
    true,
  )
  assert.equal(reading.forwardHead.category, 'good')
  assert.equal(reading.headTilt.category, 'good')
  assert.equal(reading.shoulderBalance.category, 'good')
  assert.equal(isWithinRange(reading), true)
})

test('evaluate: a clear forward-head drop is flagged as "adjust"', () => {
  const baseline = buildBaseline([toPoseFrame(makePose({ eyeY: 0.3 }))!])
  const dropped = toPoseFrame(makePose({ eyeY: 0.45 }))!
  const reading = evaluate(
    {
      headHeightRatio: headHeightRatio(dropped),
      tiltDeg: headTiltDeg(dropped),
      shoulderDelta: shoulderDelta(dropped),
    },
    baseline,
    0.95,
    true,
  )
  assert.equal(reading.forwardHead.category, 'adjust')
  assert.equal(isWithinRange(reading), false)
})

test('evaluate: low confidence overrides everything with "low-confidence"', () => {
  const baseline = buildBaseline([toPoseFrame(makePose({}))!])
  const f = toPoseFrame(makePose({}))!
  const reading = evaluate(
    { headHeightRatio: headHeightRatio(f), tiltDeg: headTiltDeg(f), shoulderDelta: shoulderDelta(f) },
    baseline,
    0.3, // below THRESHOLDS.confidence.minVisible
    true,
  )
  assert.equal(reading.forwardHead.category, 'low-confidence')
  assert.equal(isWithinRange(reading), false)
})

test('small natural sway stays within the neutral zone', () => {
  const baseline = buildBaseline([toPoseFrame(makePose({ eyeY: 0.3 }))!])
  const swayed = toPoseFrame(makePose({ eyeY: 0.315 }))! // tiny movement
  const reading = evaluate(
    {
      headHeightRatio: headHeightRatio(swayed),
      tiltDeg: headTiltDeg(swayed),
      shoulderDelta: shoulderDelta(swayed),
    },
    baseline,
    0.95,
    true,
  )
  assert.equal(reading.forwardHead.category, 'good')
})
