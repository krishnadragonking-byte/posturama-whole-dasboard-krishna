import type { Config } from '@netlify/functions'
import { errorResponse, jsonResponse } from '../../src/server/http'
import { getUid } from './lib/session'
import { publicUser, usersStore, type UserRecord } from './lib/stores'

export default async (req: Request) => {
  if (req.method !== 'GET') return errorResponse('Method not allowed.', 405)

  const uid = getUid(req)
  if (!uid) return errorResponse('Not signed in.', 401)

  const record = (await usersStore().get(uid, { type: 'json' })) as UserRecord | null
  if (!record) return errorResponse('Not signed in.', 401)

  return jsonResponse({ user: publicUser(record) })
}

export const config: Config = { path: '/api/auth/me' }
