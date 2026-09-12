import assert from 'node:assert/strict'
import { test } from 'node:test'
import { initialClock, stepClock, type ClockState } from './timerClock'

const TARGET = 30 * 1000

/** Run a sequence of 100ms frames, returning the final state. */
function run(frames: Array<{ bothSmiling: boolean; count: number }>, start: ClockState = initialClock) {
  let s = start
  let now = 0
  for (const f of frames) {
    for (let i = 0; i < f.count; i++) {
      now += 100
      s = stepClock(s, { dtMs: 100, now, bothSmiling: f.bothSmiling, targetMs: TARGET })
    }
  }
  return { state: s, now }
}

test('accrues time only while both people are smiling', () => {
  const { state } = run([{ bothSmiling: true, count: 30 }]) // 3s
  assert.equal(Math.round(state.elapsedMs), 3000)
  assert.equal(state.phase, 'running')
})

test('one person not smiling pauses the timer without resetting it', () => {
  const { state } = run([
    { bothSmiling: true, count: 50 }, // 5s accrued
    { bothSmiling: false, count: 30 }, // 3s out of sync (> grace)
  ])
  assert.ok(state.elapsedMs > 5000 && state.elapsedMs < 6000, `got ${state.elapsedMs}`)
  assert.equal(state.phase, 'paused')
})

test('a single dropped frame does not pause the challenge', () => {
  const { state } = run([
    { bothSmiling: true, count: 20 },
    { bothSmiling: false, count: 1 }, // one 100ms blip, well under the grace window
    { bothSmiling: true, count: 10 },
  ])
  assert.equal(state.phase, 'running')
  assert.ok(state.elapsedMs >= 3000)
})

test('resumes counting from where it paused once both smile again', () => {
  const a = run([
    { bothSmiling: true, count: 40 }, // 4s
    { bothSmiling: false, count: 30 }, // paused (well past grace)
  ])
  assert.equal(a.state.phase, 'paused')
  const b = run([{ bothSmiling: true, count: 20 }], a.state) // 2s more
  assert.ok(b.state.elapsedMs >= a.state.elapsedMs + 1900)
  assert.equal(b.state.phase, 'running')
})

test('latches complete at the target and never exceeds it', () => {
  const { state } = run([{ bothSmiling: true, count: 320 }]) // 32s of frames vs a 30s target
  assert.equal(state.elapsedMs, TARGET)
  assert.equal(state.phase, 'complete')
  const after = stepClock(state, { dtMs: 100, now: 999999, bothSmiling: false, targetMs: TARGET })
  assert.equal(after.phase, 'complete')
  assert.equal(after.elapsedMs, TARGET)
})

test('works for the 60-second duration too', () => {
  const target60 = 60 * 1000
  let s = initialClock
  let now = 0
  for (let i = 0; i < 600; i++) {
    now += 100
    s = stepClock(s, { dtMs: 100, now, bothSmiling: true, targetMs: target60 })
  }
  assert.equal(s.elapsedMs, target60)
  assert.equal(s.phase, 'complete')
})
