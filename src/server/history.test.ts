import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EDUCATIONAL_DISCLAIMER } from './posture'
import { buildHistoryRecord, historyKey, historyPrefix, validateHistoryInput } from './history'

const VALID_BODY = {
  status: 'mostly-aligned',
  summary: 'Posture appears mostly aligned in this image.',
  observations: ['Head appears reasonably centered.'],
  suggestions: ['Gently relax your shoulders.'],
  disclaimer: 'ignored, should be overridden',
}

test('validateHistoryInput accepts a well-formed body', () => {
  const result = validateHistoryInput(VALID_BODY)
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.analysis.status, 'mostly-aligned')
    // The client-supplied disclaimer must never be trusted verbatim.
    assert.equal(result.analysis.disclaimer, EDUCATIONAL_DISCLAIMER)
  }
})

test('validateHistoryInput rejects a missing/invalid status', () => {
  const result = validateHistoryInput({ ...VALID_BODY, status: 'diagnosed' })
  assert.equal(result.ok, false)
})

test('validateHistoryInput rejects a missing summary', () => {
  const result = validateHistoryInput({ ...VALID_BODY, summary: '' })
  assert.equal(result.ok, false)
})

test('validateHistoryInput rejects non-array observations/suggestions', () => {
  assert.equal(validateHistoryInput({ ...VALID_BODY, observations: 'not-an-array' }).ok, false)
  assert.equal(validateHistoryInput({ ...VALID_BODY, suggestions: 'not-an-array' }).ok, false)
})

test('validateHistoryInput rejects non-object bodies', () => {
  assert.equal(validateHistoryInput(null).ok, false)
  assert.equal(validateHistoryInput('a string').ok, false)
  assert.equal(validateHistoryInput(undefined).ok, false)
})

test('buildHistoryRecord stamps id, activityType and createdAt', () => {
  const result = validateHistoryInput(VALID_BODY)
  assert.equal(result.ok, true)
  if (!result.ok) return
  const record = buildHistoryRecord(result.analysis, 'abc123', '2026-09-04T00:00:00.000Z')
  assert.equal(record.id, 'abc123')
  assert.equal(record.activityType, 'posture-check')
  assert.equal(record.createdAt, '2026-09-04T00:00:00.000Z')
  assert.equal(record.status, 'mostly-aligned')
})

test('historyKey is namespaced per user and sortable by time', () => {
  const key = historyKey('user-1', '2026-09-04T00:00:00.000Z', 'abc123')
  assert.equal(key, 'history/user-1/2026-09-04T00:00:00.000Z_abc123')
  assert.ok(key.startsWith(historyPrefix('user-1')))
})

test('validateHistoryInput passes through isDemo: true (client-labeled demo result)', () => {
  const result = validateHistoryInput({ ...VALID_BODY, isDemo: true })
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.analysis.isDemo, true)
})

test('validateHistoryInput defaults isDemo to false when absent or not literally true', () => {
  const a = validateHistoryInput(VALID_BODY)
  const b = validateHistoryInput({ ...VALID_BODY, isDemo: 'yes' })
  assert.equal(a.ok, true)
  assert.equal(b.ok, true)
  if (a.ok) assert.equal(a.analysis.isDemo, false)
  if (b.ok) assert.equal(b.analysis.isDemo, false)
})
