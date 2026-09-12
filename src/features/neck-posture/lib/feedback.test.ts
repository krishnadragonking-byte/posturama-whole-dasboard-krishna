import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PostureReading } from '../types'
import { pickFeedback } from './feedback'

const good = (over: Partial<PostureReading> = {}): PostureReading => ({
  forwardHead: { category: 'good', value: 0 },
  headTilt: { category: 'good', value: 0, direction: 'level' },
  shoulderBalance: { category: 'good', value: 0, lowerSide: 'even' },
  confidence: 0.9,
  personPresent: true,
  ...over,
})

test('no person takes priority over everything', () => {
  assert.equal(pickFeedback(good({ personPresent: false })), 'no-person')
})

test('low confidence beats posture adjustments', () => {
  assert.equal(
    pickFeedback(good({ confidence: 0.3, forwardHead: { category: 'adjust', value: 0.2 } })),
    'low-confidence',
  )
})

test('forward-head outranks shoulder and tilt', () => {
  assert.equal(
    pickFeedback(
      good({
        forwardHead: { category: 'adjust', value: 0.16 },
        shoulderBalance: { category: 'adjust', value: 0.1, lowerSide: 'left' },
      }),
    ),
    'forward-head',
  )
})

test('a large forward-head drop suggests raising the screen', () => {
  assert.equal(
    pickFeedback(good({ forwardHead: { category: 'adjust', value: 0.3 } })),
    'screen-higher',
  )
})

test('all-good posture returns "good"', () => {
  assert.equal(pickFeedback(good()), 'good')
})
