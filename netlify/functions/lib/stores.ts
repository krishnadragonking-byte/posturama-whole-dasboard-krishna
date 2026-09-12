/**
 * Netlify Blobs store handles. Kept in their own module (rather than inline
 * in each handler) purely so every function talks to the same named stores.
 * Netlify Blobs auto-configures itself from the function's runtime
 * environment — no manual siteID/token wiring needed in `netlify dev` or in
 * production.
 */
import { getStore } from '@netlify/blobs'

export function usersStore() {
  return getStore('posturama-users')
}

export function historyStore() {
  return getStore('posturama-history')
}

/** One pending/most-recent verification code per email — see emailCode.ts. */
export function authCodesStore() {
  return getStore('posturama-auth-codes')
}

export interface UserRecord {
  id: string
  email: string
  name: string
  createdAt: string
}

export function publicUser(user: UserRecord) {
  return { id: user.id, email: user.email, name: user.name }
}
