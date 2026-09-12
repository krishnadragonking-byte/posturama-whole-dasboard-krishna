import type { Config } from '@netlify/functions'
import { userIdFromEmail } from '../../src/server/auth'
import {
  buildVerificationRecord,
  canRequestNewCode,
  generateVerificationCode,
  secondsUntilNextRequest,
  type VerificationCodeRecord,
} from '../../src/server/emailCode'
import { errorResponse, isValidEmail, jsonResponse } from '../../src/server/http'
import { sendVerificationEmail } from '../../src/server/resend'
import { authCodesStore } from './lib/stores'

/**
 * POST /api/auth/request-code — the only place this app sends email. Emails
 * a 6-digit sign-in code to the given address via Resend (RESEND_EMAIL_API_KEY,
 * server-only, never sent to the browser) and stores only its HMAC hash,
 * never the raw code. Rate-limited per email (see emailCode.ts) so this
 * can't be used to spam an inbox or burn through Resend quota.
 */
export default async (req: Request) => {
  if (req.method !== 'POST') return errorResponse('Method not allowed.', 405)

  let body: { email?: unknown }
  try {
    body = await req.json()
  } catch {
    return errorResponse('Invalid request body.', 400)
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!isValidEmail(email)) return errorResponse('Enter a valid email address.', 400)

  const apiKey = process.env.RESEND_EMAIL_API_KEY
  if (!apiKey) {
    // Explicit, honest failure — never silently pretend an email was sent.
    return errorResponse(
      'Email sign-in is not configured on the server. Set RESEND_EMAIL_API_KEY and try again.',
      503,
    )
  }

  const store = authCodesStore()
  const id = userIdFromEmail(email)
  const existing = (await store.get(id, { type: 'json' })) as VerificationCodeRecord | null

  if (!canRequestNewCode(existing)) {
    return errorResponse(`Please wait ${secondsUntilNextRequest(existing)}s before requesting another code.`, 429)
  }

  const code = generateVerificationCode()

  try {
    await sendVerificationEmail(email, code, apiKey)
  } catch (err) {
    console.error('auth-request-code: Resend call failed:', err instanceof Error ? err.message : String(err))
    return errorResponse('Could not send the verification email. Please try again in a moment.', 502)
  }

  // Only start the resend cooldown once the email has actually gone out —
  // otherwise a failed send would lock the user out of retrying for 60s with
  // no way to see the real error (this was a real bug: it did exactly that).
  await store.setJSON(id, buildVerificationRecord(code))

  const response: { ok: true; debugCode?: string } = { ok: true }
  // Local-dev-only escape hatch so the flow can be tested end-to-end without
  // reading a real inbox. Netlify only ever sets CONTEXT="dev" for
  // `netlify dev` — never for deploy-preview, branch-deploy, or production —
  // so this can never leak a real code from a deployed site.
  if (process.env.CONTEXT === 'dev') {
    response.debugCode = code
  }
  return jsonResponse(response)
}

export const config: Config = { path: '/api/auth/request-code' }
