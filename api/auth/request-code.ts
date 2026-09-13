/**
 * POST /api/auth/request-code — Vercel serverless equivalent of
 * netlify/functions/auth-request-code.ts. Sends a real 6-digit sign-in code
 * via Resend, same as the Netlify deployment; see api/_lib/statelessAuth.ts
 * for why this one is stateless rather than using Netlify Blobs.
 */
import { isValidEmail } from '../../src/server/http'
import { sendVerificationEmail } from '../../src/server/resend'
import { buildVerificationToken, generateCode } from '../_lib/statelessAuth'

interface VercelReq {
  method?: string
  body: unknown
}
interface VercelRes {
  status(code: number): VercelRes
  json(data: unknown): void
}

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  const body = (req.body ?? {}) as { email?: unknown; name?: unknown }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const name = typeof body.name === 'string' && body.name.trim().length > 0 ? body.name.trim() : undefined

  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Enter a valid email address.' })
    return
  }

  const apiKey = process.env.RESEND_EMAIL_API_KEY
  if (!apiKey) {
    res
      .status(503)
      .json({ error: 'Email sign-in is not configured on the server. Set RESEND_EMAIL_API_KEY and try again.' })
    return
  }

  const code = generateCode()
  try {
    await sendVerificationEmail(email, code, apiKey)
  } catch (err) {
    console.error('api/auth/request-code: Resend call failed:', err instanceof Error ? err.message : String(err))
    res.status(502).json({ error: 'Could not send the verification email. Please try again in a moment.' })
    return
  }

  // Unlike the Netlify version, there's no server-side rate-limit / attempt
  // counter here (that needs storage this stateless design deliberately
  // doesn't have) — an acceptable trade-off for a prototype demo, not a
  // production auth system.
  res.status(200).json({ ok: true, verificationToken: buildVerificationToken(email, code, name) })
}
