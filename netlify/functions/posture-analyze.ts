import type { Config } from '@netlify/functions'
import { analyzePostureImage, getDemoAnalysis, validateAnalysisContext, validatePostureImage } from '../../src/server/posture'
import { errorResponse, jsonResponse } from '../../src/server/http'
import { getUid } from './lib/session'

/**
 * POST /api/posture/analyze — the only place in this app that talks to
 * OpenAI. The browser sends a captured image once, optionally alongside a
 * short user-typed description of what they're feeling; this function reads
 * OPENAI_API_KEY from the server environment (never sent by, or echoed back
 * to, the client), calls the vision model, and returns structured,
 * educational-only guidance. The image is used in-memory for this one
 * request and is never written to Blobs or logged.
 *
 * Without OPENAI_API_KEY configured, this returns a clearly-flagged demo
 * result (`isDemo: true`) instead of a hard error, so the flow is still
 * usable end-to-end during setup — the UI is required to show that flag
 * prominently and must never present it as a real analysis.
 */
export default async (req: Request) => {
  if (req.method !== 'POST') return errorResponse('Method not allowed.', 405)

  const uid = getUid(req)
  if (!uid) return errorResponse('Please sign in to use posture analysis.', 401)

  let body: { image?: unknown; context?: unknown }
  try {
    body = await req.json()
  } catch {
    return errorResponse('Invalid request body.', 400)
  }

  const imageValidation = validatePostureImage(body.image)
  if (!imageValidation.ok) return errorResponse(imageValidation.message, 400)

  const contextValidation = validateAnalysisContext(body.context)
  if (!contextValidation.ok) return errorResponse(contextValidation.message, 400)

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return jsonResponse(getDemoAnalysis(body.image as string))
  }

  try {
    const analysis = await analyzePostureImage(body.image as string, apiKey, { context: contextValidation.context })
    return jsonResponse(analysis)
  } catch (err) {
    // Log only the error message — never the image data or the user's note.
    console.error('posture-analyze: OpenAI call failed:', err instanceof Error ? err.message : String(err))
    return errorResponse('AI posture analysis failed. Please try again in a moment.', 502)
  }
}

export const config: Config = { path: '/api/posture/analyze' }
