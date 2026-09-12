/**
 * Server-only auth primitives: signed session tokens and cookie helpers. No
 * secrets are hard-coded — the HMAC key comes from the SESSION_SECRET
 * environment variable, which only ever exists server-side (Netlify
 * Functions runtime), never in the browser bundle.
 *
 * Sign-in is passwordless (a short emailed code — see emailCode.ts and
 * resend.ts), so there's no password to hash here. Sessions are a stateless
 * signed token (uid + expiry, HMAC-SHA256'd) stored in an HttpOnly cookie —
 * no separate session store needed, and the cookie is never readable from
 * client-side JS.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

const SESSION_COOKIE = 'posturama_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

/** Deterministic, non-reversible id for a user derived from their email. */
export function userIdFromEmail(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured on the server.')
  }
  return secret
}

interface SessionPayload {
  uid: string
  exp: number
}

export function createSessionToken(uid: string, secret = getSessionSecret()): string {
  const payload: SessionPayload = { uid, exp: Date.now() + SESSION_TTL_SECONDS * 1000 }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

/** Returns the verified uid, or null if the token is missing, malformed, forged, or expired. */
export function verifySessionToken(token: string | undefined | null, secret = getSessionSecret()): string | null {
  if (!token) return null
  const dot = token.indexOf('.')
  if (dot === -1) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!body || !sig) return null

  const expectedSig = createHmac('sha256', secret).update(body).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<SessionPayload>
    if (typeof payload.uid !== 'string' || typeof payload.exp !== 'number') return null
    if (Date.now() > payload.exp) return null
    return payload.uid
  } catch {
    return null
  }
}

export function parseCookies(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const val = part.slice(idx + 1).trim()
    if (key) {
      try {
        out[key] = decodeURIComponent(val)
      } catch {
        out[key] = val
      }
    }
  }
  return out
}

export function sessionCookieName(): string {
  return SESSION_COOKIE
}

export function buildSessionCookie(token: string, secure: boolean): string {
  const secureFlag = secure ? '; Secure' : ''
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secureFlag}`
}

export function buildClearSessionCookie(secure: boolean): string {
  const secureFlag = secure ? '; Secure' : ''
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`
}

/** True for anything served over https — used to decide the cookie's Secure flag. */
export function isSecureRequest(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}
