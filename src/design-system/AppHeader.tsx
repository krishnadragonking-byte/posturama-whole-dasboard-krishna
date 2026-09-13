/**
 * Shared header for the authenticated pages (Dashboard, History, Posture
 * Check). Kept separate from the marketing Home page's own header so that
 * page's existing markup is untouched.
 */
import './ui.css'
import type { Route } from '../routes'
import { Button, StatusPill } from './ui'

const Logo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5.5" r="2.5" />
    <path d="M12 8v6M12 14c-3 0-5 2-5.5 5M12 14c3 0 5 2 5.5 5" />
  </svg>
)

const NAV_LINKS: { route: Route; label: string }[] = [
  { route: 'dashboard', label: 'Dashboard' },
  { route: 'history', label: 'History' },
]

export function AppHeader({
  userName,
  activeRoute,
  onNavigate,
  onLogout,
  isDemoSession = false,
}: {
  userName: string
  activeRoute: Route
  onNavigate: (route: Route) => void
  onLogout: () => void
  isDemoSession?: boolean
}) {
  return (
    <header className="pt-appheader">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          type="button"
          className="pt-appheader__brand"
          onClick={() => onNavigate('dashboard')}
          aria-label="Go to dashboard"
        >
          <span className="pt-appheader__logo" aria-hidden="true">
            <Logo />
          </span>
          <span className="pt-appheader__wordmark">Posturama</span>
        </button>
        {isDemoSession ? <StatusPill tone="info">Demo mode — not a real account</StatusPill> : null}
      </div>

      <nav className="pt-appheader__nav" aria-label="Dashboard">
        {NAV_LINKS.map((link) => (
          <button
            key={link.route}
            type="button"
            className={`pt-appheader__link${activeRoute === link.route ? ' is-active' : ''}`}
            onClick={() => onNavigate(link.route)}
            aria-current={activeRoute === link.route ? 'page' : undefined}
          >
            {link.label}
          </button>
        ))}
      </nav>

      <div className="pt-appheader__user">
        <span className="pt-appheader__name" title={userName}>
          {userName}
        </span>
        <Button variant="secondary" onClick={onLogout}>
          Log out
        </Button>
      </div>
    </header>
  )
}
