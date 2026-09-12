import { useEffect } from 'react'
import { Button, Card, ProgressBar } from '../../../design-system/ui'
import type { CalibrationBaseline } from '../types'
import type { PostureEngine } from '../hooks/usePostureEngine'
import { usePostureReading } from '../hooks/usePostureReading'
import { useChallenge } from '../hooks/useChallenge'
import { isWithinRange } from '../lib/postureMath'
import { FEEDBACK_COPY } from '../lib/feedback'
import { cueForFeedback, SETTLE_CUE } from '../lib/cues'
import { CameraStage } from './CameraStage'
import { DemoFigure } from './DemoFigure'
import { ProgressRing } from './ProgressRing'
import { FeedbackBanner } from './FeedbackBanner'
import { SafetyNotice } from './SafetyNotice'

export function ChallengeScreen({
  engine,
  baseline,
  onComplete,
  onStop,
}: {
  engine: PostureEngine
  baseline: CalibrationBaseline | null
  onComplete: () => void
  onStop: () => void
}) {
  const { reading, feedback } = usePostureReading(engine, baseline)
  const within = isWithinRange(reading)
  const challenge = useChallenge(within, engine.running)

  useEffect(() => {
    if (challenge.phase === 'complete') {
      const id = setTimeout(onComplete, 900)
      return () => clearTimeout(id)
    }
  }, [challenge.phase, onComplete])

  const remaining = challenge.target - challenge.elapsed
  const pauseReason =
    challenge.phase === 'paused' ? FEEDBACK_COPY[feedback].message : null

  // The figure holds a calm "settle" loop, or shows the specific fix if the
  // reading drifts out of range.
  const demoCue = cueForFeedback(feedback) ?? SETTLE_CUE

  return (
    <div className="np-grid np-grid--split">
      <div className="np-stack">
        <CameraStage engine={engine} onStop={onStop} demo={<DemoFigure cue={demoCue} />} />
        <FeedbackBanner feedback={feedback} />
      </div>

      <Card className="np-stack">
        <p className="np-section-label">60-second challenge</p>
        <h1 className="np-title" style={{ fontSize: '1.6rem' }}>
          60-Second Posture Challenge
        </h1>

        <ProgressRing
          value={challenge.progress}
          bigNumber={challenge.phase === 'complete' ? '✓' : remaining}
          unit={challenge.phase === 'complete' ? 'done' : 'seconds left'}
          paused={challenge.phase === 'paused'}
        />

        <ProgressBar
          value={challenge.progress}
          paused={challenge.phase === 'paused'}
          label={`Challenge progress: ${challenge.elapsed} of ${challenge.target} seconds`}
        />

        <div
          className={`np-challenge-status np-challenge-status--${
            challenge.phase === 'paused' ? 'paused' : 'running'
          }`}
          role="status"
          aria-live="polite"
        >
          {challenge.phase === 'complete' ? (
            <span>Challenge complete</span>
          ) : challenge.phase === 'paused' ? (
            <span>Challenge paused</span>
          ) : (
            <span>Counting — you’re in a comfortable range</span>
          )}
        </div>

        {challenge.phase === 'paused' && (
          <p className="np-fineprint" style={{ textAlign: 'center' }}>
            {pauseReason ? `${pauseReason}. ` : ''}
            Make a gentle adjustment and continue when you’re ready. The timer
            picks up where it left off — moving is fine.
          </p>
        )}

        <div className="np-actions" style={{ justifyContent: 'center' }}>
          <Button variant="secondary" onClick={challenge.restart}>
            Restart
          </Button>
          <Button variant="danger" onClick={onStop}>
            Stop Camera
          </Button>
        </div>

        <p className="np-fineprint" style={{ textAlign: 'center' }}>
          This is a short practice rep — not a target for how you should sit all day.
        </p>
        <SafetyNotice compact />
      </Card>
    </div>
  )
}
