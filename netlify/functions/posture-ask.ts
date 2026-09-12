import type { Config } from '@netlify/functions'
import { askPostureQuestion, getDemoAskResponse, validateQuestion } from '../../src/server/ask'
import { errorResponse, jsonResponse } from '../../src/server/http'
import { getUid } from './lib/session'

/**
 * POST /api/posture/ask — text version of the AI guidance feature. A user
 * describes how they're feeling in their own words; the server calls OpenAI
 * with a prompt that explicitly defers to a professional for anything beyond
 * general wellness (see src/server/ask.ts ASK_SYSTEM_PROMPT) rather than
 * attempting to answer it. Same demo-mode fallback as posture-analyze when
 * OPENAI_API_KEY isn't configured.
 */
export default async (req: Request) => {
  if (req.method !== 'POST') return errorResponse('Method not allowed.', 405)

  const uid = getUid(req)
  if (!uid) return errorResponse('Please sign in.', 401)

  let body: { question?: unknown }
  try {
    body = await req.json()
  } catch {
    return errorResponse('Invalid request body.', 400)
  }

  const validation = validateQuestion(body.question)
  if (!validation.ok) return errorResponse(validation.message, 400)

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return jsonResponse(getDemoAskResponse(validation.question))
  }

  try {
    const answer = await askPostureQuestion(validation.question, apiKey)
    return jsonResponse(answer)
  } catch (err) {
    console.error('posture-ask: OpenAI call failed:', err instanceof Error ? err.message : String(err))
    return errorResponse('Could not get guidance right now. Please try again in a moment.', 502)
  }
}

export const config: Config = { path: '/api/posture/ask' }
