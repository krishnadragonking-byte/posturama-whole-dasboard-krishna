import assert from 'node:assert/strict'
import { test } from 'node:test'
import { TIMING } from '../constants'
import { initialClock, stepClock, type ClockState } from './challengeClock'

const TARGET = TIMING.challengeSeconds * 1000

/** Run a sequence of 100ms frames, returning the final state. */
function run(
  frames: Array<{ withinRange: boolean; count: number }>,
  start: ClockState = initialClock,
) {
  let s = start
  let now = 0
  for (const f of frames) {
    for (let i = 0; i < f.count; i++) {
      now += 100
      s = stepClock(s, { dtMs: 100, now, withinRange: f.withinRange, targetMs: TARGET })
    }
  }
  return { state: s, now }
}

test('accrues time only while within range', () => {
  const { state } = run([{ withinRange: true, count: 30 }]) // 3s
  assert.equal(Math.round(state.elapsedMs), 3000)
  assert.equal(state.phase, 'running')
})

test('leaving range pauses (does not reset) after the grace window', () => {
  const { state } = run([
    { withinRange: true, count: 50 }, // 5s accrued
    { withinRange: false, count: 30 }, // 3s out of range (> grace)
  ])
  assert.ok(state.elapsedMs > 5000 && state.elapsedMs < 6500, `got ${state.elapsedMs}`)
  assert.equal(state.phase, 'paused')
})

test('grace window keeps counting through a brief blip', () => {
  const graceFrames = Math.floor(TIMING.challengePauseGraceMs / 100) - 2
  const { state } = run([
    { withinRange: true, count: 20 },
    { withinRange: false, count: graceFrames }, // shorter than grace
    { withinRange: true, count: 10 },
  ])
  // ~2s + brief blip (still counted) + 1s  => close to 3s + graceFrames*100
  assert.equal(state.phase, 'running')
  assert.ok(state.elapsedMs >= 3000)
})

test('resumes from where it paused', () => {
  const a = run([
    { withinRange: true, count: 40 },
    { withinRange: false, count: 30 },
  ])
  const b = run([{ withinRange: true, count: 20 }], a.state)
  assert.ok(b.state.elapsedMs >= a.state.elapsedMs + 1900)
  assert.equal(b.state.phase, 'running')
})

test('latches complete at the target and never exceeds it', () => {
  const { state } = run([{ withinRange: true, count: 800 }]) // 80s of frames
  assert.equal(state.elapsedMs, TARGET)
  assert.equal(state.phase, 'complete')
  const after = stepClock(state, { dtMs: 100, now: 999999, withinRange: false, targetMs: TARGET })
  assert.equal(after.phase, 'complete')
  assert.equal(after.elapsedMs, TARGET)
})
