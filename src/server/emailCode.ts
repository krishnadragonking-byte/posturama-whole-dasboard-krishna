/**
 * Passwordless email sign-in: a short numeric code, emailed to the user,
 * verified server-side. No password is ever stored — see resend.ts for the
 * actual send, and netlify/functions/auth-request-code.ts /
 * auth-verify-code.ts for the HTTP layer.
 */
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

export const CODE_LENGTH = 6
export const CODE_TTL_MS = 10 * 60 * 1000 // 10 minutes
export const RESEND_COOLDOWN_MS = 60 * 1000 // minimum time between two codes for the same email
export const MAX_ATTEMPTS = 5 // wrong guesses allowed before a code is dead

export interface VerificationCodeRecord {
  codeHash: string
  expiresAt: number
  attempts: number
  sentAt: number
}

/** A cryptographically random 6-digit code — not sequential, not guessable from timing. */
export function generateVerificationCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0')
}

function getCodeSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not configured on the server.')
  return secret
}

/** Codes are short-lived and single-use, so a fast HMAC (not scrypt) is the right tool here. */
export function hashVerificationCode(code: string, secret = getCodeSecret()): string {
  return createHmac('sha256', secret).update(code).digest('hex')
}

function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

export function buildVerificationRecord(
  code: string,
  now = Date.now(),
  secret = getCodeSecret(),
): VerificationCodeRecord {
  return { codeHash: hashVerificationCode(code, secret), expiresAt: now + CODE_TTL_MS, attempts: 0, sentAt: now }
}

/** Rate limit: don't let someone (or something) spam an inbox / burn Resend quota. */
export function canRequestNewCode(existing: VerificationCodeRecord | null, now = Date.now()): boolean {
  if (!existing) return true
  return now - existing.sentAt >= RESEND_COOLDOWN_MS
}

export function secondsUntilNextRequest(existing: VerificationCodeRecord | null, now = Date.now()): number {
  if (!existing) return 0
  return Math.max(0, Math.ceil((RESEND_COOLDOWN_MS - (now - existing.sentAt)) / 1000))
}

export interface CodeCheckResult {
  ok: boolean
  message?: string
}

/**
 * Pure check against a stored record — does not mutate `attempts` itself
 * (the caller persists the incremented count so a failed guess is only ever
 * counted once).
 */
export function checkVerificationCode(
  record: VerificationCodeRecord | null,
  code: string,
  now = Date.now(),
  secret = getCodeSecret(),
): CodeCheckResult {
  if (!record) return { ok: false, message: 'Please request a new code.' }
  if (now > record.expiresAt) return { ok: false, message: 'That code has expired. Please request a new one.' }
  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, message: 'Too many incorrect attempts. Please request a new code.' }
  }
  if (!hashesMatch(hashVerificationCode(code, secret), record.codeHash)) {
    return { ok: false, message: 'Incorrect code. Please try again.' }
  }
  return { ok: true }
}
