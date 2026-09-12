/**
 * Client-side mirror of the server's posture analysis / history shapes
 * (src/server/posture.ts, src/server/history.ts). Duplicated intentionally —
 * client code must never import server-only modules (they use Node's
 * `node:crypto` and read server env vars), so these are the two or three
 * small interfaces the UI actually needs, kept in sync by hand.
 */

export type PostureStatus = 'aligned' | 'mostly-aligned' | 'needs-adjustment'

export interface PostureAnalysis {
  status: PostureStatus
  summary: string
  observations: string[]
  suggestions: string[]
  disclaimer: string
  /** True only for the local placeholder shown when OPENAI_API_KEY isn't configured — never a real analysis. */
  isDemo?: boolean
  /** True when an optional user-typed description suggested something beyond general wellness. */
  needsProfessional?: boolean
}

export interface HistoryRecord extends PostureAnalysis {
  id: string
  createdAt: string
  activityType: 'posture-check'
}

export interface AuthUser {
  id: string
  email: string
  name: string
}

export interface AskResponse {
  answer: string
  suggestions: string[]
  needsProfessional: boolean
  disclaimer: string
  isDemo?: boolean
}

export const STATUS_LABEL: Record<PostureStatus, string> = {
  aligned: 'Appears aligned',
  'mostly-aligned': 'Appears mostly aligned',
  'needs-adjustment': 'Could use a small adjustment',
}
