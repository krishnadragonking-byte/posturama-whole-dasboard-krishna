import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  isSmilingWithHysteresis,
  smileScoreFromBlendshapes,
  smoothSmileScore,
} from './smile'

test('smileScoreFromBlendshapes averages left/right mouth-smile categories', () => {
  const score = smileScoreFromBlendshapes([
    { categoryName: 'mouthSmileLeft', score: 0.8 },
    { categoryName: 'mouthSmileRight', score: 0.6 },
    { categoryName: 'jawOpen', score: 0.9 }, // ignored
  ])
  assert.equal(score, 0.7)
})

test('smileScoreFromBlendshapes is 0 with no data', () => {
  assert.equal(smileScoreFromBlendshapes(undefined), 0)
  assert.equal(smileScoreFromBlendshapes([]), 0)
})

test('hysteresis requires a higher score to start smiling than to keep smiling', () => {
  assert.equal(isSmilingWithHysteresis(0.25, false), false) // below enter threshold (0.32)
  assert.equal(isSmilingWithHysteresis(0.4, false), true) // crosses enter threshold
  assert.equal(isSmilingWithHysteresis(0.2, true), true) // still above exit threshold (0.16)
  assert.equal(isSmilingWithHysteresis(0.1, true), false) // drops below exit threshold
})

test('hysteresis never flickers on a score that hovers between the two thresholds', () => {
  let smiling = false
  const scores = [0.4, 0.25, 0.28, 0.2, 0.22] // all between exit(0.16) and enter(0.32) after the first
  const seen: boolean[] = []
  for (const s of scores) {
    smiling = isSmilingWithHysteresis(s, smiling)
    seen.push(smiling)
  }
  // Once it turns on at 0.4, it should stay on for every subsequent frame
  // above the exit threshold — no flicker.
  assert.deepEqual(seen, [true, true, true, true, true])
})

test('smoothSmileScore eases toward the new value without jumping straight to it', () => {
  const next = smoothSmileScore(0, 1, 0.5)
  assert.equal(next, 0.5)
  const settled = [0, 1, 1, 1, 1].reduce((acc, raw) => smoothSmileScore(acc, raw, 0.5), 0)
  assert.ok(settled > 0.9, `expected the EMA to approach 1, got ${settled}`)
})
