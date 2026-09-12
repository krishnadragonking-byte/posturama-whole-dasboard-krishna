import type { HistoryRecord } from '../../lib/postureTypes'

export interface ProgressSummary {
  totalChecks: number
  activeDays: number
  latest: HistoryRecord | null
}

/** Derives dashboard progress stats from real saved history — nothing here is fabricated. */
export function computeProgress(records: HistoryRecord[]): ProgressSummary {
  const days = new Set(records.map((r) => r.createdAt.slice(0, 10)))
  const latest = records.reduce<HistoryRecord | null>(
    (best, r) => (best === null || r.createdAt > best.createdAt ? r : best),
    null,
  )
  return { totalChecks: records.length, activeDays: days.size, latest }
}
