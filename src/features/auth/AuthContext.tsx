import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError } from '../../lib/api'
import type { AuthUser } from '../../lib/postureTypes'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface RequestCodeResult {
  ok: true
  /** Only ever present in local dev (netlify dev) — see auth-request-code.ts. */
  debugCode?: string
  /**
   * Only present on the stateless Vercel deployment target (see
   * api/auth/request-code.ts) — must be carried through to verifyCode
   * unchanged. The Netlify backend ignores it if present.
   */
  verificationToken?: string
}

interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  /** True for the client-only demo session started by loginAsDemo — never a real signed-in user. */
  isDemoSession: boolean
  /** Emails a 6-digit sign-in code to this address (works for both new and returning users). */
  requestCode: (email: string) => Promise<RequestCodeResult>
  /** Verifies the code; `name` is only used the first time an email signs in. */
  verifyCode: (input: { email: string; code: string; name?: string; verificationToken?: string }) => Promise<void>
  /**
   * Client-only fallback for static deploys with no backend at all (e.g. a
   * Vercel/GitHub Pages preview of this Netlify-Functions app) — lets a
   * viewer see the Dashboard without a real account. Never touches the
   * server, never claims to be a real signed-in user (see isDemoSession).
   */
  loginAsDemo: () => void
  logout: () => Promise<void>
}

const DEMO_USER: AuthUser = { id: 'demo', name: 'Demo Viewer', email: 'demo@posturama.app' }

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isDemoSession, setIsDemoSession] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .get<{ user: AuthUser }>('/api/auth/me')
      .then((res) => {
        if (cancelled) return
        setUser(res.user)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        setUser(null)
        setStatus('unauthenticated')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const requestCode = useCallback((email: string) => api.post<RequestCodeResult>('/api/auth/request-code', { email }), [])

  const verifyCode = useCallback(
    async (input: { email: string; code: string; name?: string; verificationToken?: string }) => {
      const res = await api.post<{ user: AuthUser }>('/api/auth/verify-code', input)
      setUser(res.user)
      setStatus('authenticated')
    },
    [],
  )

  const loginAsDemo = useCallback(() => {
    setUser(DEMO_USER)
    setIsDemoSession(true)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    if (!isDemoSession) {
      try {
        await api.post('/api/auth/logout')
      } catch {
        // Even if the network call fails, clear local state so the UI doesn't
        // strand the user in a signed-in-looking screen.
      }
    }
    setUser(null)
    setIsDemoSession(false)
    setStatus('unauthenticated')
  }, [isDemoSession])

  const value = useMemo(
    () => ({ status, user, isDemoSession, requestCode, verifyCode, loginAsDemo, logout }),
    [status, user, isDemoSession, requestCode, verifyCode, loginAsDemo, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export function authErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  return 'Something went wrong. Please try again.'
}
