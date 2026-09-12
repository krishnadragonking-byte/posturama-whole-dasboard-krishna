import type { ReactNode } from 'react'
import type { Screen } from '../types'
import { PostureLogo } from './icons'
import { JourneyStepper } from './JourneyStepper'
import '../neck-posture.css'

/** Page frame shared by every screen in the module. */
export function ModuleShell({
  children,
  screen,
  showStepper = true,
  onExit,
}: {
  children: ReactNode
  screen: Screen
  showStepper?: boolean
  /** Optional "← Back to Home" link, shown only when the app has a home screen to return to. */
  onExit?: () => void
}) {
  return (
    <div className="np-shell">
      <div className="np-container">
        <header className="np-header">
          {onExit ? (
            <button type="button" className="np-back" onClick={onExit}>
              <span aria-hidden="true">←</span> Home
            </button>
          ) : null}
          <span className="np-logo" aria-hidden="true">
            <PostureLogo />
          </span>
          <span className="np-wordmark">Posturama</span>
          {showStepper ? <JourneyStepper screen={screen} /> : null}
        </header>
        <main className="np-screen" key={screen}>
          {children}
        </main>
      </div>
    </div>
  )
}
