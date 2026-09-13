/**
 * POST /api/auth/verify-code — Vercel serverless equivalent of
 * netlify/functions/auth-verify-code.ts. Checks the signed verification
 * token request-code.ts handed back to the client (see
 * api/_lib/statelessAuth.ts) instead of looking a code up in storage, then
 * issues the same kind of session cookie.
 */
import { isValidEmail } from '../../src/server/http.js'
import { buildSessionCookie, checkVerificationToken, createSessionToken, userIdFromEmail } from '../_lib/statelessAuth.js'

interface VercelReq {
  method?: string
  body: unknown
}
interface VercelRes {
  status(code: number): VercelRes
  json(data: unknown): void
  setHeader(name: string, value: string): void
}

const CODE_RE = /^\d{6}$/

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  const body = (req.body ?? {}) as {
    email?: unknown
    code?: unknown
    name?: unknown
    verificationToken?: unknown
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const code = typeof body.code === 'string' ? body.code.trim() : ''
  const token = typeof body.verificationToken === 'string' ? body.verificationToken : ''

  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Enter a valid email address.' })
    return
  }
  if (!CODE_RE.test(code)) {
    res.status(400).json({ error: 'Enter the 6-digit code from your email.' })
    return
  }
  if (!token) {
    res.status(400).json({ error: 'Missing verification token — please request a new code.' })
    return
  }

  const result = checkVerificationToken(token, email, code)
  if (!result.ok) {
    res.status(401).json({ error: result.message })
    return
  }

  const name =
    (typeof body.name === 'string' && body.name.trim().length > 0 ? body.name.trim() : undefined) ??
    result.name ??
    email.split('@')[0]

  res.setHeader('Set-Cookie', buildSessionCookie(createSessionToken(email, name)))
  res.status(200).json({ user: { id: userIdFromEmail(email), email, name } })
}
