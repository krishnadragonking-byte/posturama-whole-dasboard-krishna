import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { test } from 'node:test'
import {
  buildClearSessionCookie,
  buildSessionCookie,
  createSessionToken,
  isSecureRequest,
  parseCookies,
  sessionCookieName,
  userIdFromEmail,
  verifySessionToken,
} from './auth'

const SECRET = 'test-session-secret'

test('userIdFromEmail is deterministic and case/whitespace-insensitive', () => {
  const a = userIdFromEmail('Person@Example.com')
  const b = userIdFromEmail('  person@example.com  ')
  assert.equal(a, b)
  assert.match(a, /^[0-9a-f]{64}$/)
})

test('createSessionToken + verifySessionToken round-trip', () => {
  const token = createSessionToken('user-123', SECRET)
  assert.equal(verifySessionToken(token, SECRET), 'user-123')
})

test('verifySessionToken rejects a token signed with a different secret', () => {
  const token = createSessionToken('user-123', SECRET)
  assert.equal(verifySessionToken(token, 'a-different-secret'), null)
})

test('verifySessionToken rejects tampered payloads', () => {
  const token = createSessionToken('user-123', SECRET)
  const [body, sig] = token.split('.')
  const forgedBody = Buffer.from(JSON.stringify({ uid: 'someone-else', exp: Date.now() + 1e9 })).toString(
    'base64url',
  )
  assert.notEqual(forgedBody, body)
  assert.equal(verifySessionToken(`${forgedBody}.${sig}`, SECRET), null)
})

test('verifySessionToken rejects expired tokens', () => {
  const expiredPayload = Buffer.from(JSON.stringify({ uid: 'user-123', exp: Date.now() - 1000 })).toString(
    'base64url',
  )
  const sig = createHmac('sha256', SECRET).update(expiredPayload).digest('base64url')
  assert.equal(verifySessionToken(`${expiredPayload}.${sig}`, SECRET), null)
})

test('verifySessionToken rejects garbage input without throwing', () => {
  assert.equal(verifySessionToken(null, SECRET), null)
  assert.equal(verifySessionToken(undefined, SECRET), null)
  assert.equal(verifySessionToken('', SECRET), null)
  assert.equal(verifySessionToken('not-a-token', SECRET), null)
  assert.equal(verifySessionToken('a.b.c', SECRET), null)
})

test('parseCookies handles multiple cookies and encoded values', () => {
  const parsed = parseCookies('a=1; b=hello%20world; posturama_session=abc.def')
  assert.equal(parsed.a, '1')
  assert.equal(parsed.b, 'hello world')
  assert.equal(parsed[sessionCookieName()], 'abc.def')
})

test('parseCookies returns empty object for missing header', () => {
  assert.deepEqual(parseCookies(null), {})
  assert.deepEqual(parseCookies(undefined), {})
})

test('buildSessionCookie sets HttpOnly + SameSite=Lax, and Secure only when asked', () => {
  const insecure = buildSessionCookie('tok', false)
  assert.match(insecure, /HttpOnly/)
  assert.match(insecure, /SameSite=Lax/)
  assert.doesNotMatch(insecure, /Secure/)

  const secure = buildSessionCookie('tok', true)
  assert.match(secure, /Secure/)
})

test('buildClearSessionCookie expires immediately', () => {
  assert.match(buildClearSessionCookie(false), /Max-Age=0/)
})

test('isSecureRequest reflects the request URL protocol', () => {
  assert.equal(isSecureRequest('https://posturama.app/api/auth/me'), true)
  assert.equal(isSecureRequest('http://localhost:8888/api/auth/me'), false)
  assert.equal(isSecureRequest('not-a-url'), false)
})
