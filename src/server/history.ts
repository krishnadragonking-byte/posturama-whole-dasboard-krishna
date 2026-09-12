/**
 * Posture-check history record shape + validation. Deliberately holds only
 * the analysis result and metadata — never the captured image — so a saved
 * check is a few hundred bytes of text, not a photo.
 */
import type { PostureAnalysis, PostureStatus } from './posture'
import { EDUCATIONAL_DISCLAIMER } from './posture'

export interface HistoryRecord extends PostureAnalysis {
  id: string
  createdAt: string // ISO 8601
  activityType: 'posture-check'
}

const STATUS_VALUES: readonly PostureStatus[] = ['aligned', 'mostly-aligned', 'needs-adjustment']
const MAX_LIST_LENGTH = 12
const MAX_ITEM_LENGTH = 300

export interface HistoryInputError {
  ok: false
  message: string
}
export interface HistoryInputOk {
  ok: true
  analysis: PostureAnalysis
}

/** Validates the body of POST /api/posture/history without trusting any client-supplied field blindly. */
export function validateHistoryInput(body: unknown): HistoryInputOk | HistoryInputError {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Invalid request body.' }
  }
  const obj = body as Record<string, unknown>

  if (!STATUS_VALUES.includes(obj.status as PostureStatus)) {
    return { ok: false, message: 'Missing or invalid posture status.' }
  }
  if (typeof obj.summary !== 'string' || obj.summary.trim().length === 0) {
    return { ok: false, message: 'Missing posture summary.' }
  }
  if (!Array.isArray(obj.observations) || !obj.observations.every((s) => typeof s === 'string')) {
    return { ok: false, message: 'Invalid observations list.' }
  }
  if (!Array.isArray(obj.suggestions) || !obj.suggestions.every((s) => typeof s === 'string')) {
    return { ok: false, message: 'Invalid suggestions list.' }
  }

  return {
    ok: true,
    analysis: {
      status: obj.status as PostureStatus,
      summary: obj.summary.trim().slice(0, MAX_ITEM_LENGTH),
      observations: (obj.observations as string[])
        .filter((s) => s.trim().length > 0)
        .slice(0, MAX_LIST_LENGTH)
        .map((s) => s.trim().slice(0, MAX_ITEM_LENGTH)),
      suggestions: (obj.suggestions as string[])
        .filter((s) => s.trim().length > 0)
        .slice(0, MAX_LIST_LENGTH)
        .map((s) => s.trim().slice(0, MAX_ITEM_LENGTH)),
      // The disclaimer is always the fixed educational-guidance line — never trust a
      // client-supplied disclaimer string.
      disclaimer: EDUCATIONAL_DISCLAIMER,
      // Purely informational UI labeling (whether this came from the demo
      // fallback or a real OpenAI call, or whether it deferred to a
      // professional) — not security-relevant, so a plain boolean coercion
      // is enough here.
      isDemo: obj.isDemo === true,
      needsProfessional: obj.needsProfessional === true,
    },
  }
}

export function buildHistoryRecord(analysis: PostureAnalysis, id: string, createdAt: string): HistoryRecord {
  return { ...analysis, id, activityType: 'posture-check', createdAt }
}

/** Blob key for one history record: sortable by time, namespaced per user. */
export function historyKey(uid: string, createdAt: string, id: string): string {
  return `history/${uid}/${createdAt}_${id}`
}

export function historyPrefix(uid: string): string {
  return `history/${uid}/`
}
