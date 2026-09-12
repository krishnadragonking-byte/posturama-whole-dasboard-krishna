import type { ReactNode } from 'react'
import '../couple-smile.css'

/** Page frame shared by every Couple Smile screen. */
export function CoupleSmileShell({ children, onExit }: { children: ReactNode; onExit: () => void }) {
  return (
    <div className="cs-shell">
      <div className="cs-container">
        <header className="cs-header">
          <button type="button" className="cs-back" onClick={onExit}>
            <span aria-hidden="true">←</span> Back to Home
          </button>
          <span className="cs-wordmark">
            Couple Smile <span aria-hidden="true">😊</span>
          </span>
        </header>
        <main className="cs-screen">{children}</main>
      </div>
    </div>
  )
}
