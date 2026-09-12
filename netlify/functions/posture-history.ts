import { randomUUID } from 'node:crypto'
import type { Config } from '@netlify/functions'
import { buildHistoryRecord, historyKey, historyPrefix, validateHistoryInput, type HistoryRecord } from '../../src/server/history'
import { errorResponse, jsonResponse } from '../../src/server/http'
import { getUid } from './lib/session'
import { historyStore } from './lib/stores'

const MAX_RETURNED = 200

/**
 * GET  /api/posture/history — list the signed-in user's saved posture checks.
 * POST /api/posture/history — save a completed check's *result* (never the
 *                              captured image) as a new history record.
 *
 * The user id comes only from the verified session cookie, never from a
 * client-supplied field, so one user can never read or write another's
 * history.
 */
export default async (req: Request) => {
  const uid = getUid(req)
  if (!uid) return errorResponse('Please sign in.', 401)

  const store = historyStore()

  if (req.method === 'GET') {
    const { blobs } = await store.list({ prefix: historyPrefix(uid) })
    const records = (
      await Promise.all(
        blobs.map(async (b) => (await store.get(b.key, { type: 'json' })) as HistoryRecord | null),
      )
    ).filter((r): r is HistoryRecord => r !== null)

    records.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return jsonResponse({ history: records.slice(0, MAX_RETURNED) })
  }

  if (req.method === 'POST') {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid request body.', 400)
    }

    const validation = validateHistoryInput(body)
    if (!validation.ok) return errorResponse(validation.message, 400)

    const id = randomUUID()
    const createdAt = new Date().toISOString()
    const record = buildHistoryRecord(validation.analysis, id, createdAt)

    await store.setJSON(historyKey(uid, createdAt, id), record)
    return jsonResponse({ record }, 201)
  }

  return errorResponse('Method not allowed.', 405)
}

export const config: Config = { path: '/api/posture/history' }
