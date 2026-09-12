import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { HistoryRecord } from '../../lib/postureTypes'
import { computeProgress } from './progress'

function record(overrides: Partial<HistoryRecord>): HistoryRecord {
  return {
    id: 'id',
    createdAt: '2026-09-04T10:00:00.000Z',
    activityType: 'posture-check',
    status: 'mostly-aligned',
    summary: 'summary',
    observations: [],
    suggestions: [],
    disclaimer: 'Educational guidance only — not medical diagnosis or treatment.',
    ...overrides,
  }
}

test('computeProgress on empty history', () => {
  const result = computeProgress([])
  assert.equal(result.totalChecks, 0)
  assert.equal(result.activeDays, 0)
  assert.equal(result.latest, null)
})

test('computeProgress counts total checks and distinct active days', () => {
  const records = [
    record({ id: '1', createdAt: '2026-09-02T09:00:00.000Z' }),
    record({ id: '2', createdAt: '2026-09-03T09:00:00.000Z' }),
    record({ id: '3', createdAt: '2026-09-04T08:00:00.000Z' }),
    record({ id: '4', createdAt: '2026-09-04T18:00:00.000Z' }), // same day as #3
  ]
  const result = computeProgress(records)
  assert.equal(result.totalChecks, 4)
  assert.equal(result.activeDays, 3)
})

test('computeProgress picks the most recent record as latest', () => {
  const records = [
    record({ id: 'old', createdAt: '2026-09-01T09:00:00.000Z' }),
    record({ id: 'new', createdAt: '2026-09-04T09:00:00.000Z' }),
    record({ id: 'mid', createdAt: '2026-09-02T09:00:00.000Z' }),
  ]
  const result = computeProgress(records)
  assert.equal(result.latest?.id, 'new')
})
