/**
 * Stateless (no database) auth primitives — Vercel deployment target only.
 *
 * Netlify's functions (see netlify/functions/auth-*.ts) use Netlify Blobs to
 * remember pending verification codes and user records between requests.
 * Vercel serverless functions have no equivalent storage, and this prototype
 * deliberately avoids standing up a real database just for that. Instead,
 * everything a later request needs is HMAC-signed (SESSION_SECRET) and
 * handed back to the client to carry forward — request-code signs the code's
 * hash + expiry into a token the browser holds onto; verify-code checks that
 * signature rather than looking anything up server-side.
 */
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

const CODE_LENGTH = 6
const CODE_TTL_MS = 10 * 60 * 1000
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30
const SESSION_COOKIE = 'posturama_session'

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not configured.')
  return secret
}

function sign(body: string): string {
  return createHmac('sha256', getSecret()).update(body).digest('base64url')
}

function pack<T extends object>(payload: T): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${body}.${sign(body)}`
}

function unpack<T>(token: string): T | null {
  const dot = token.indexOf('.')
  if (dot === -1) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = sign(body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}

function hashCode(code: string): string {
  return createHmac('sha256', getSecret()).update(code).digest('hex')
}

export function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0')
}

interface VerificationPayload {
  email: string
  codeHash: string
  exp: number
  name?: string
}

/** Signs a code's hash + email + expiry into a token the client carries to verify-code. Never contains the raw code. */
export function buildVerificationToken(email: string, code: string, name?: string): string {
  const payload: VerificationPayload = { email, codeHash: hashCode(code), exp: Date.now() + CODE_TTL_MS, name }
  return pack(payload)
}

export function checkVerificationToken(
  token: string,
  email: string,
  code: string,
): { ok: true; name?: string } | { ok: false; message: string } {
  const payload = unpack<VerificationPayload>(token)
  if (!payload) return { ok: false, message: 'This code has expired or is invalid. Please request a new one.' }
  if (payload.email !== email) return { ok: false, message: 'This code was issued for a different email address.' }
  if (Date.now() > payload.exp) return { ok: false, message: 'This code has expired. Please request a new one.' }

  const submittedHash = hashCode(code)
  const a = Buffer.from(submittedHash)
  const b = Buffer.from(payload.codeHash)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, message: 'Incorrect code. Please try again.' }
  }
  return { ok: true, name: payload.name }
}

interface SessionPayload {
  email: string
  name: string
  exp: number
}

export function createSessionToken(email: string, name: string): string {
  const payload: SessionPayload = { email, name, exp: Date.now() + SESSION_TTL_SECONDS * 1000 }
  return pack(payload)
}

export function verifySessionToken(token: string | undefined): { email: string; name: string } | null {
  if (!token) return null
  const payload = unpack<SessionPayload>(token)
  if (!payload) return null
  if (Date.now() > payload.exp) return null
  return { email: payload.email, name: payload.name }
}

export function sessionCookieName(): string {
  return SESSION_COOKIE
}

export function buildSessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}; Secure`
}

export function buildClearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`
}

export function parseCookies(header: string | undefined): Record<string, string> {
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

/** Deterministic, non-reversible id for a user derived from their email — mirrors src/server/auth.ts's userIdFromEmail. */
export function userIdFromEmail(email: string): string {
  return createHmac('sha256', getSecret()).update(email.trim().toLowerCase()).digest('hex').slice(0, 32)
}
