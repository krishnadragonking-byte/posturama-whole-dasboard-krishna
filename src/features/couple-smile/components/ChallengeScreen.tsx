import { useEffect } from 'react'
import { Button, Card, ProgressBar } from '../../../design-system/ui'
import type { ChallengeDuration } from '../types'
import type { CoupleSmileEngine } from '../hooks/useCoupleSmileEngine'
import { useSmileTimer } from '../hooks/useSmileTimer'
import { CameraStage } from './CameraStage'
import { PersonPanel } from './PersonPanel'
import { ProgressRing } from './ProgressRing'

export function ChallengeScreen({
  engine,
  duration,
  onComplete,
  onStop,
}: {
  engine: CoupleSmileEngine
  duration: ChallengeDuration
  onComplete: () => void
  onStop: () => void
}) {
  const { personOne, personTwo, bothSmiling, running, tooManyFaces } = engine
  const timer = useSmileTimer(bothSmiling, running, duration)

  useEffect(() => {
    if (timer.phase === 'complete') {
      const id = setTimeout(onComplete, 900)
      return () => clearTimeout(id)
    }
  }, [timer.phase, onComplete])

  const remaining = timer.target - timer.elapsed
  const paused = timer.phase === 'paused'

  return (
    <div className="cs-grid cs-grid--split">
      <div className="cs-stack">
        <CameraStage engine={engine}>
          {bothSmiling && (
            <div className="cs-stage__both">
              <span className="cs-banner">BOTH SMILING! 🎉</span>
            </div>
          )}
        </CameraStage>
        <div className="cs-people">
          <PersonPanel label="Person 1" person={personOne} />
          <PersonPanel label="Person 2" person={personTwo} />
        </div>
      </div>

      <Card className="cs-stack">
        <p className="cs-section-label">{duration}-second challenge</p>
        <h1 className="cs-title" style={{ fontSize: '1.6rem' }}>
          Smile Together
        </h1>

        <ProgressRing
          value={timer.progress}
          bigNumber={timer.phase === 'complete' ? '✓' : remaining}
          unit={timer.phase === 'complete' ? 'done' : 'seconds together'}
          paused={paused}
          active={bothSmiling}
        />

        <ProgressBar
          value={timer.progress}
          paused={paused}
          label={`Challenge progress: ${timer.elapsed} of ${timer.target} seconds`}
        />

        <div
          className={`cs-status-line cs-status-line--${paused ? 'paused' : 'running'}`}
          role="status"
          aria-live="polite"
        >
          {timer.phase === 'complete' ? (
            <span>Challenge complete</span>
          ) : paused ? (
            <span>Paused — smile together!</span>
          ) : bothSmiling ? (
            <span>Counting — keep smiling!</span>
          ) : (
            <span>Waiting for both of you to smile</span>
          )}
        </div>

        {tooManyFaces && (
          <p className="cs-fineprint">We found more than two people. Please have only two participants in the frame.</p>
        )}

        <div className="cs-actions" style={{ justifyContent: 'center' }}>
          <Button variant="secondary" onClick={timer.restart}>
            Restart
          </Button>
          <Button variant="danger" onClick={onStop}>
            Stop Camera
          </Button>
        </div>

        <p className="cs-fineprint" style={{ textAlign: 'center' }}>
          The timer only counts while you're both smiling — it pauses, never resets, if either of
          you stops.
        </p>
      </Card>
    </div>
  )
}
