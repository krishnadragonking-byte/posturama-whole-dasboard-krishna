import type { ReactNode } from 'react'
import '../posture-check.css'

const Logo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5.5" r="2.5" />
    <path d="M12 8v6M12 14c-3 0-5 2-5.5 5M12 14c3 0 5 2 5.5 5" />
  </svg>
)

export function PostureCheckShell({ children, onExit }: { children: ReactNode; onExit: () => void }) {
  return (
    <div className="pchk-shell">
      <div className="pchk-container">
        <header className="pchk-header">
          <button type="button" className="pchk-back" onClick={onExit}>
            <span aria-hidden="true">←</span> Dashboard
          </button>
          <span className="pchk-logo" aria-hidden="true">
            <Logo />
          </span>
          <span className="pchk-wordmark">Posturama</span>
        </header>
        <main className="pchk-screen">{children}</main>
      </div>
    </div>
  )
}
