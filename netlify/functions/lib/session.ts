import { parseCookies, sessionCookieName, verifySessionToken } from '../../../src/server/auth'

/** Verified user id from the request's session cookie, or null if absent/invalid/expired. */
export function getUid(req: Request): string | null {
  const cookies = parseCookies(req.headers.get('cookie'))
  return verifySessionToken(cookies[sessionCookieName()])
}
