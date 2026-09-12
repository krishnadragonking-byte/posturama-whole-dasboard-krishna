import { useEffect } from 'react'
import { Button, Card, Notice } from '../../../design-system/ui'
import type { CalibrationBaseline } from '../types'
import type { PostureEngine } from '../hooks/usePostureEngine'
import { useCalibration } from '../hooks/useCalibration'
import { SETTLE_CUE } from '../lib/cues'
import { CameraStage } from './CameraStage'
import { DemoFigure } from './DemoFigure'
import { SafetyNotice } from './SafetyNotice'

const STEPS = [
  'Sit comfortably.',
  'Place your screen at a comfortable height.',
  'Keep your shoulders relaxed.',
  'Look naturally toward the screen.',
  'Hold still briefly while Posturama learns your starting position.',
]

export function CalibrationScreen({
  engine,
  onComplete,
  onStop,
}: {
  engine: PostureEngine
  onComplete: (baseline: CalibrationBaseline) => void
  onStop: () => void
}) {
  const cal = useCalibration(engine.latestFrame, engine.confidence)

  useEffect(() => {
    if (cal.phase === 'done' && cal.baseline) onComplete(cal.baseline)
  }, [cal.phase, cal.baseline, onComplete])

  const canStart = engine.running && engine.personPresent

  return (
    <div className="np-grid np-grid--split">
      <div className="np-stack">
        <CameraStage
          engine={engine}
          onStop={onStop}
          demo={<DemoFigure cue={SETTLE_CUE} />}
          quietScrims={cal.phase === 'counting' || cal.phase === 'capturing'}
        >
          {cal.phase === 'counting' && (
            <div className="np-stage__scrim" role="status">
              <div>
                <span className="np-ring__num" aria-live="assertive">
                  {cal.countdown}
                </span>
                <p>Hold your natural position…</p>
              </div>
            </div>
          )}
          {cal.phase === 'capturing' && (
            <div className="np-stage__scrim" role="status">
              <div>
                <div className="np-spinner" aria-hidden="true" />
                <h3>Learning your starting position</h3>
                <p>
                  {cal.samplesCollected} / {cal.samplesNeeded} samples — keep still
                </p>
              </div>
            </div>
          )}
        </CameraStage>

        <Notice title="Camera angle matters">
          Your camera angle can affect these measurements, so use a consistent
          setup. Calibration records where you started from — it is not a claim
          about medically correct posture.
        </Notice>
      </div>

      <Card className="np-stack">
        <p className="np-section-label">Calibration</p>
        <h1 className="np-title">Find your neutral position</h1>

        <ol className="np-steps">
          {STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>

        {cal.phase === 'failed' && (
          <Notice title="Let’s try that again" tone="safety">
            Posturama couldn’t get a clear enough view. Add some light, center
            yourself in the frame, and start calibration again.
          </Notice>
        )}

        <div className="np-actions">
          {cal.phase === 'idle' || cal.phase === 'failed' ? (
            <Button size="lg" onClick={cal.begin} disabled={!canStart}>
              {canStart ? 'Start calibration' : 'Waiting for camera…'}
            </Button>
          ) : cal.phase === 'done' ? (
            <Button size="lg" disabled>
              Calibration complete ✓
            </Button>
          ) : (
            <Button size="lg" variant="secondary" onClick={cal.reset}>
              Cancel
            </Button>
          )}
        </div>

        <SafetyNotice compact />
      </Card>
    </div>
  )
}
