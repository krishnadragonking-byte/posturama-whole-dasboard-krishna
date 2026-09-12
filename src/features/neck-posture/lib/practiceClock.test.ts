import assert from 'node:assert/strict'
import { test } from 'node:test'
import { TIMING } from '../constants'
import {
  initialPractice,
  skipPractice,
  stepPractice,
  type PracticeClock,
} from './practiceClock'

const TOTAL = 5
const HOLD = TIMING.guidedHoldMs

function run(
  frames: Array<{ matched: boolean; count: number }>,
  start: PracticeClock = initialPractice(),
) {
  let s = start
  let now = 0
  for (const f of frames) {
    for (let i = 0; i < f.count; i++) {
      now += 50
      s = stepPractice(s, { dtMs: 50, now, matched: f.matched, total: TOTAL })
    }
  }
  return { state: s, now }
}

test('holding a correct pose long enough advances to the next position', () => {
  const held = Math.ceil(HOLD / 50) + 1
  let { state, now } = run([{ matched: true, count: held }])
  assert.equal(state.phase, 'celebrate')
  // tick past the celebrate window
  now += TIMING.guidedAdvanceMs + 50
  state = stepPractice(state, { dtMs: 50, now, matched: false, total: TOTAL })
  assert.equal(state.index, 1)
  assert.equal(state.phase, 'active')
})

test('a wrong pose never advances and eases the meter back down', () => {
  const { state } = run([
    { matched: true, count: 6 }, // partway
    { matched: false, count: 40 }, // long miss
  ])
  assert.equal(state.index, 0)
  assert.equal(state.holdMs, 0)
  assert.equal(state.phase, 'active')
})

test('a brief miss does not reset all progress (decays, not snaps)', () => {
  const { state } = run([
    { matched: true, count: 10 }, // 500ms held
    { matched: false, count: 2 }, // 100ms miss -> -200ms
  ])
  assert.ok(state.holdMs > 200 && state.holdMs < 500, `got ${state.holdMs}`)
})

test('completing the final position latches "complete"', () => {
  let s = initialPractice()
  let now = 0
  for (let pose = 0; pose < TOTAL; pose++) {
    for (let i = 0; i < Math.ceil(HOLD / 50) + 1; i++) {
      now += 50
      s = stepPractice(s, { dtMs: 50, now, matched: true, total: TOTAL })
    }
    now += TIMING.guidedAdvanceMs + 50
    s = stepPractice(s, { dtMs: 50, now, matched: true, total: TOTAL })
  }
  assert.equal(s.phase, 'complete')
})

test('skip advances without holding, and finishes on the last one', () => {
  let s = initialPractice()
  for (let i = 0; i < TOTAL - 1; i++) s = skipPractice(s, TOTAL)
  assert.equal(s.index, TOTAL - 1)
  assert.equal(s.phase, 'active')
  s = skipPractice(s, TOTAL)
  assert.equal(s.phase, 'complete')
})
