import type { CSSProperties } from 'react'
import { Button, Card, Notice, ShieldIcon } from '../../../design-system/ui'
import type { ChallengeDuration } from '../types'

const CONFETTI = ['🎉', '😊', '✨', '🎊', '💫', '😄', '🌟']

/** Per-particle position, stagger and horizontal drift for the confetti-fall keyframes. */
function confettiStyle(i: number): CSSProperties {
  const style: Record<string, string> = {
    left: `${8 + i * 13}%`,
    animationDelay: `${i * 0.08}s`,
    '--_dx': `${(i % 2 === 0 ? 1 : -1) * (14 + i * 4)}px`,
  }
  return style as CSSProperties
}

export function CompletionScreen({
  duration,
  onPlayAgain,
  onBackHome,
}: {
  duration: ChallengeDuration
  onPlayAgain: () => void
  onBackHome: () => void
}) {
  return (
    <div className="cs-grid cs-grid--split">
      <Card className="cs-stack">
        <div className="cs-celebrate">
          <span className="cs-celebrate__emoji" aria-hidden="true">
            🎉
          </span>
          <div className="cs-confetti" aria-hidden="true">
            {CONFETTI.map((emoji, i) => (
              <span key={i} style={confettiStyle(i)}>
                {emoji}
              </span>
            ))}
          </div>
        </div>
        <h1 className="cs-title" style={{ textAlign: 'center' }}>
          You did it! 🎉
        </h1>
        <p className="cs-subtitle" style={{ textAlign: 'center', margin: '0 auto' }}>
          You smiled together for {duration} seconds.
        </p>

        <hr className="cs-divider" />

        <div className="cs-actions" style={{ justifyContent: 'center' }}>
          <Button size="lg" onClick={onPlayAgain}>
            Play Again
          </Button>
          <Button size="lg" variant="secondary" onClick={onBackHome}>
            Back Home
          </Button>
        </div>
      </Card>

      <div className="cs-stack">
        <Notice title="Wellness play, not medical care" tone="safety" icon={ShieldIcon}>
          Couple Smile is a lighthearted wellness activity for two people. It does not diagnose
          or treat any condition and makes no claims about mood or health outcomes.
        </Notice>
      </div>
    </div>
  )
}
