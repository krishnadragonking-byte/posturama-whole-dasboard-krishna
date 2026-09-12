import type { Config } from '@netlify/functions'
import { buildClearSessionCookie, isSecureRequest } from '../../src/server/auth'
import { errorResponse, jsonResponse } from '../../src/server/http'

export default async (req: Request) => {
  if (req.method !== 'POST') return errorResponse('Method not allowed.', 405)
  return jsonResponse({ ok: true }, 200, { 'Set-Cookie': buildClearSessionCookie(isSecureRequest(req.url)) })
}

export const config: Config = { path: '/api/auth/logout' }
