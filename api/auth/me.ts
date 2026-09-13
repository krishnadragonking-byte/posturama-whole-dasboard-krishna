/**
 * GET /api/auth/me — Vercel serverless equivalent of
 * netlify/functions/auth-me.ts. Reads the session cookie and decodes the
 * user directly from its signed payload (see api/_lib/statelessAuth.ts) —
 * no storage lookup needed.
 */
import { parseCookies, sessionCookieName, userIdFromEmail, verifySessionToken } from '../_lib/statelessAuth'

interface VercelReq {
  method?: string
  headers: { cookie?: string }
}
interface VercelRes {
  status(code: number): VercelRes
  json(data: unknown): void
}

export default function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  const cookies = parseCookies(req.headers.cookie)
  const session = verifySessionToken(cookies[sessionCookieName()])
  if (!session) {
    res.status(401).json({ error: 'Not signed in.' })
    return
  }

  res.status(200).json({ user: { id: userIdFromEmail(session.email), email: session.email, name: session.name } })
}
