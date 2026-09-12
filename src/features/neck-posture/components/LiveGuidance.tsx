import { Button, Card } from '../../../design-system/ui'
import type { CalibrationBaseline } from '../types'
import type { PostureEngine } from '../hooks/usePostureEngine'
import { usePostureReading } from '../hooks/usePostureReading'
import { useGuidedCues } from '../hooks/useGuidedCues'
import { CameraStage } from './CameraStage'
import { DemoFigure } from './DemoFigure'
import { CueStrip } from './CueStrip'
import { FeedbackBanner } from './FeedbackBanner'
import { SignalCards } from './SignalCards'
import { SafetyNotice } from './SafetyNotice'

export function LiveGuidance({
  engine,
  baseline,
  onStartGuided,
  onStartChallenge,
  onRecalibrate,
  onStop,
}: {
  engine: PostureEngine
  baseline: CalibrationBaseline | null
  onStartGuided: () => void
  onStartChallenge: () => void
  onRecalibrate: () => void
  onStop: () => void
}) {
  const { reading, feedback } = usePostureReading(engine, baseline)
  const cues = useGuidedCues(engine.running, feedback)

  return (
    <div className="np-grid np-grid--split">
      <div className="np-stack">
        <CameraStage engine={engine} onStop={onStop} demo={<DemoFigure cue={cues.current} />} />
        <FeedbackBanner feedback={feedback} />
        <CueStrip cues={cues} />
      </div>

      <div className="np-stack">
        <Card className="np-stack--tight">
          <p className="np-section-label">Live guidance</p>
          <h1 className="np-title" style={{ fontSize: '1.5rem' }}>
            Follow along, one position at a time
          </h1>
          <p className="np-fineprint">
            The figure behind your camera moves through a few comfortable positions.
            If a signal below needs attention, the figure shows that adjustment until
            it eases. Categories are relative to your calibration, not a medical standard.
          </p>
        </Card>

        <SignalCards reading={reading} />

        <div className="np-actions">
          <Button size="lg" onClick={onStartGuided}>
            Start Guided Practice
          </Button>
          <Button size="lg" variant="secondary" onClick={onStartChallenge}>
            60-Second Challenge
          </Button>
          <Button variant="ghost" onClick={onRecalibrate}>
            Recalibrate
          </Button>
        </div>
        <p className="np-fineprint">
          Guided practice walks you through five easy positions — copy the figure and
          hold each briefly to move on.
        </p>

        <SafetyNotice compact />
        <p className="np-fineprint" aria-live="off">
          Detection confidence: {Math.round(reading.confidence * 100)}%
        </p>
      </div>
    </div>
  )
}
