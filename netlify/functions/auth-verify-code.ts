import type { Config } from '@netlify/functions'
import { buildSessionCookie, createSessionToken, isSecureRequest, userIdFromEmail } from '../../src/server/auth'
import { checkVerificationCode, type VerificationCodeRecord } from '../../src/server/emailCode'
import { errorResponse, isValidEmail, jsonResponse } from '../../src/server/http'
import { authCodesStore, publicUser, usersStore, type UserRecord } from './lib/stores'

const CODE_RE = /^\d{6}$/

/**
 * POST /api/auth/verify-code — checks the code emailed by
 * auth-request-code.ts. On success, creates the account if this is a new
 * email (no password to set — sign-in is code-only) and starts a session.
 * A wrong guess is counted against the stored record so a code can only be
 * brute-forced a bounded number of times (see emailCode.ts MAX_ATTEMPTS)
 * before the user has to request a new one.
 */
export default async (req: Request) => {
  if (req.method !== 'POST') return errorResponse('Method not allowed.', 405)

  let body: { email?: unknown; code?: unknown; name?: unknown }
  try {
    body = await req.json()
  } catch {
    return errorResponse('Invalid request body.', 400)
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const code = typeof body.code === 'string' ? body.code.trim() : ''
  if (!isValidEmail(email)) return errorResponse('Enter a valid email address.', 400)
  if (!CODE_RE.test(code)) return errorResponse('Enter the 6-digit code from your email.', 400)

  const codesStore = authCodesStore()
  const id = userIdFromEmail(email)
  const record = (await codesStore.get(id, { type: 'json' })) as VerificationCodeRecord | null

  const result = checkVerificationCode(record, code)
  if (!result.ok) {
    if (record) {
      // Persist the failed attempt so repeated wrong guesses eventually
      // exhaust MAX_ATTEMPTS, even across separate requests.
      await codesStore.setJSON(id, { ...record, attempts: record.attempts + 1 })
    }
    return errorResponse(result.message ?? 'Invalid code.', 401)
  }

  // Correct code is single-use — remove it immediately so it can't be replayed.
  await codesStore.delete(id)

  const usersDb = usersStore()
  let user = (await usersDb.get(id, { type: 'json' })) as UserRecord | null
  if (!user) {
    const name = typeof body.name === 'string' && body.name.trim().length > 0 ? body.name.trim() : email.split('@')[0]
    user = { id, email, name, createdAt: new Date().toISOString() }
    await usersDb.setJSON(id, user)
  }

  const token = createSessionToken(id)
  return jsonResponse({ user: publicUser(user) }, 200, {
    'Set-Cookie': buildSessionCookie(token, isSecureRequest(req.url)),
  })
}

export const config: Config = { path: '/api/auth/verify-code' }
