/**
 * POST /api/auth/logout — Vercel serverless equivalent of
 * netlify/functions/auth-logout.ts. Clears the session cookie.
 */
import { buildClearSessionCookie } from '../_lib/statelessAuth.js'

interface VercelReq {
  method?: string
}
interface VercelRes {
  status(code: number): VercelRes
  json(data: unknown): void
  setHeader(name: string, value: string): void
}

export default function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  res.setHeader('Set-Cookie', buildClearSessionCookie())
  res.status(200).json({ ok: true })
}
