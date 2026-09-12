import { lazy, Suspense, useCallback, useEffect, useSyncExternalStore } from 'react'
import { NeckPostureModule } from './features/neck-posture'
import type { Screen } from './features/neck-posture/types'
import { HomePage } from './features/home'
import { CoupleSmileModule } from './features/couple-smile'
import { SmileTherapyModule } from './features/smile-therapy/SmileTherapyModule'
import { AuthProvider, EmailCodeAuthPage, useAuth } from './features/auth'
import { DashboardPage } from './features/dashboard'
import { HistoryPage } from './features/history'
import { PostureCheckModule } from './features/posture-check'
import { navigate, routeFromHash, PROTECTED_ROUTES } from './routes'

// Dev-only screen gallery at /#gallery (tree-shaken from production builds).
const ScreenGallery = lazy(() =>
  import('./features/neck-posture/dev/ScreenGallery').then((m) => ({ default: m.ScreenGallery })),
)

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

const DEV_SCREENS: Screen[] = ['calibration', 'live', 'guided', 'challenge', 'complete']

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--pt-text-muted)',
        fontSize: '0.95rem',
      }}
      role="status"
    >
      Loading…
    </div>
  )
}

function AppRoutes({ hash }: { hash: string }) {
  const { status } = useAuth()
  const goHome = useCallback(() => navigate('home'), [])
  const goDashboard = useCallback(() => navigate('dashboard'), [])
  const route = routeFromHash(hash)
  const isProtected = PROTECTED_ROUTES.includes(route)
  const isAuthOnly = route === 'login' || route === 'signup'

  // Server-side authorization is enforced by every /api/* Netlify Function
  // (each verifies the session cookie itself) — these redirects are purely a
  // client-side UX nicety, not the security boundary.
  useEffect(() => {
    if (isProtected && status === 'unauthenticated') navigate('login')
    if (isAuthOnly && status === 'authenticated') navigate('dashboard')
  }, [isProtected, isAuthOnly, status])

  if (import.meta.env.DEV) {
    // Dev-only, no-login preview of the Dashboard (for reviewing UI changes
    // without wiring up the email-code auth backend).
    if (hash === '#dashboard-preview') {
      return <DashboardPage onNavigate={navigate} />
    }
    if (hash === '#gallery') {
      return (
        <Suspense fallback={null}>
          <ScreenGallery />
        </Suspense>
      )
    }
    // e.g. /#screen=guided — jump straight to a screen for testing.
    const m = /^#screen=(\w+)/.exec(hash)
    const target = m?.[1] as Screen | undefined
    if (target && DEV_SCREENS.includes(target)) {
      return <NeckPostureModule devStart={target} onExit={goHome} />
    }
  }

  if ((isProtected && status !== 'authenticated') || (isAuthOnly && status === 'authenticated')) {
    return <LoadingScreen />
  }

  switch (route) {
    case 'neck-posture':
      return <NeckPostureModule onExit={goHome} />
    case 'couple-smile':
      return <CoupleSmileModule onExit={goHome} />
    case 'smile-therapy':
      return <SmileTherapyModule onExit={goHome} />
    case 'login':
    case 'signup':
      return <EmailCodeAuthPage onNavigate={navigate} />
    case 'dashboard':
      return <DashboardPage onNavigate={navigate} />
    case 'history':
      return <HistoryPage onNavigate={navigate} />
    case 'posture-check':
      return <PostureCheckModule onExit={goDashboard} />
    default:
      return <HomePage onNavigate={navigate} />
  }
}

export default function App() {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  )
  return (
    <AuthProvider>
      <AppRoutes hash={hash} />
    </AuthProvider>
  )
}
