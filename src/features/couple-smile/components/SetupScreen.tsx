import { Button, Card } from '../../../design-system/ui'
import { TIMING } from '../constants'
import type { ChallengeDuration } from '../types'
import type { CoupleSmileEngine } from '../hooks/useCoupleSmileEngine'
import { CameraStage } from './CameraStage'
import { PersonPanel } from './PersonPanel'

export function SetupScreen({
  engine,
  duration,
  onDurationChange,
  onStartChallenge,
  onStop,
}: {
  engine: CoupleSmileEngine
  duration: ChallengeDuration
  onDurationChange: (d: ChallengeDuration) => void
  onStartChallenge: () => void
  onStop: () => void
}) {
  const { faceCount, tooManyFaces, personOne, personTwo, running } = engine
  const bothIn = running && !tooManyFaces && faceCount >= 2

  let heading = "We can't see anyone yet."
  let sub = 'Move into the camera frame.'
  if (running && !tooManyFaces) {
    if (faceCount === 1) {
      heading = 'We found one person.'
      sub = 'Invite your partner to join!'
    } else if (faceCount >= 2) {
      heading = 'Both people detected!'
      sub = 'Get ready to smile 😊'
    }
  }

  return (
    <div className="cs-grid cs-grid--split">
      <div className="cs-stack">
        <CameraStage engine={engine} />
        <div className="cs-people">
          <PersonPanel label="Person 1" person={personOne} />
          <PersonPanel label="Person 2" person={personTwo} />
        </div>
      </div>

      <Card className="cs-stack">
        <p className="cs-section-label">Setup</p>
        <h1 className="cs-title" style={{ fontSize: '1.6rem' }}>
          {heading}
        </h1>
        <p className="cs-subtitle">{sub}</p>

        {bothIn && (
          <>
            <hr className="cs-divider" />
            <p className="cs-section-label">Choose your challenge</p>
            <div className="cs-chip-row" role="group" aria-label="Challenge duration">
              {TIMING.durations.map((secs) => (
                <button
                  key={secs}
                  type="button"
                  className="cs-chip"
                  aria-pressed={duration === secs}
                  onClick={() => onDurationChange(secs)}
                >
                  {secs} seconds
                </button>
              ))}
            </div>
            <Button size="lg" onClick={onStartChallenge}>
              Start Smiling
            </Button>
          </>
        )}

        <div className="cs-actions">
          <Button variant="danger" onClick={onStop}>
            Stop Camera
          </Button>
        </div>

        {import.meta.env.DEV && !bothIn && (
          // Dev-only: the synthetic/screenshot camera has no real second face,
          // so this is how the Setup → Challenge camera hand-off gets exercised
          // without two real people. Tree-shaken from production builds.
          <button type="button" className="cs-back" onClick={onStartChallenge}>
            Skip to Challenge (dev only)
          </button>
        )}
      </Card>
    </div>
  )
}
