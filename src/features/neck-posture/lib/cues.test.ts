import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CUES, SETTLE_CUE, cueForFeedback } from './cues'
import { lerpSkeleton } from './poses'

test('every cue has both keyframes and a positive loop', () => {
  for (const c of CUES) {
    assert.ok(c.label && c.instruction)
    assert.ok(c.loopMs > 0)
    assert.ok(c.from && c.to)
  }
})

test('lerpSkeleton returns the endpoints at t=0 and t=1', () => {
  const c = CUES[1]
  assert.deepEqual(lerpSkeleton(c.from, c.to, 0), c.from)
  assert.deepEqual(lerpSkeleton(c.from, c.to, 1), c.to)
})

test('forward-head feedback maps to the "ease your head back" cue', () => {
  assert.equal(cueForFeedback('forward-head')?.id, 'head-back')
})

test('shoulder-balance feedback maps to the shoulder cue', () => {
  assert.equal(cueForFeedback('shoulder-balance')?.id, 'drop-shoulders')
})

test('good / no-person / low-confidence do not pin a cue', () => {
  assert.equal(cueForFeedback('good'), null)
  assert.equal(cueForFeedback('no-person'), null)
  assert.equal(cueForFeedback('low-confidence'), null)
})

test('SETTLE_CUE is the calm hold used on the challenge screen', () => {
  assert.equal(SETTLE_CUE.id, 'settle')
})
