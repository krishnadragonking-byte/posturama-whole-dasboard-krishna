import { useEffect } from 'react'
import { Button, Card } from '../../../design-system/ui'
import type { PostureEngine } from '../hooks/usePostureEngine'
import { useGuidedPractice, type MatchState } from '../hooks/useGuidedPractice'
import { CameraStage } from './CameraStage'
import { FrontDemoFigure } from './FrontDemoFigure'
import { ProgressRing } from './ProgressRing'
import { SafetyNotice } from './SafetyNotice'

const STATUS: Record<
  MatchState,
  { chip: string; title: string; tone: 'good' | 'adjust' | 'info' }
> = {
  idle: { chip: 'Step into view', title: 'Step into the camera view', tone: 'info' },
  wrong: { chip: '✗ Not yet', title: 'Not matching yet', tone: 'adjust' },
  close: { chip: 'Almost…', title: 'Almost there — keep going', tone: 'adjust' },
  correct: { chip: '✓ Correct', title: 'Correct — hold it still', tone: 'good' },
  done: { chip: '✓ Got it', title: 'Nice — got it!', tone: 'good' },
}

export function GuidedPracticeScreen({
  engine,
  onComplete,
  onStop,
}: {
  engine: PostureEngine
  onComplete: () => void
  onStop: () => void
}) {
  const gp = useGuidedPractice(engine.latestFrame, engine.personPresent, engine.running)
  const { setOverlayTone } = engine

  const isRight = gp.state === 'correct' || gp.state === 'done'

  // Tint the on-camera skeleton to match: green when you've nailed the pose.
  useEffect(() => {
    setOverlayTone(gp.state === 'idle' ? 'auto' : isRight ? 'good' : 'adjust')
    return () => setOverlayTone('auto')
  }, [gp.state, isRight, setOverlayTone])

  useEffect(() => {
    if (gp.phase === 'complete') {
      const id = setTimeout(onComplete, 700)
      return () => clearTimeout(id)
    }
  }, [gp.phase, onComplete])

  const s = STATUS[gp.state]
  const pct = Math.round(gp.holdProgress * 100)
  const detecting = gp.mode === 'detecting'
  const detail = detecting
    ? 'Reading your setup — legs in view means knee lifts, otherwise gentle side-bends.'
    : gp.state === 'correct'
      ? `Holding… ${pct}%`
      : gp.state === 'done'
        ? 'Next position coming up'
        : gp.hint

  return (
    <div className="np-grid np-grid--split">
      <div className="np-stack">
        <CameraStage
          engine={engine}
          onStop={onStop}
          frameTone={gp.state === 'idle' ? undefined : isRight ? 'good' : 'adjust'}
          demo={<FrontDemoFigure pose={gp.pose} done={isRight} />}
        >
          {engine.running && (
            <div
              className={`np-stage__status np-stage__status--${detecting ? 'info' : s.tone}`}
              role="status"
              aria-live="polite"
            >
              {detecting ? 'Reading your setup…' : s.chip}
            </div>
          )}
        </CameraStage>

        <div
          className={`np-feedback np-feedback--${detecting ? 'info' : s.tone}`}
          role="status"
          aria-live="polite"
        >
          <span className="np-feedback__glyph" aria-hidden="true">
            {isRight ? '✓' : gp.state === 'idle' || detecting ? '◎' : '↺'}
          </span>
          <div>
            <div className="np-feedback__msg">{detecting ? 'Getting ready…' : s.title}</div>
            <div className="np-feedback__detail">
              {!detecting && <strong>{gp.pose.label}. </strong>}
              {detail}
            </div>
          </div>
        </div>
      </div>

      <Card className="np-stack">
        <div className="np-cue__head">
          <p className="np-section-label">
            Guided practice · position {gp.index + 1} of {gp.total}
          </p>
          {gp.mode !== 'detecting' && (
            <span className="pt-pill pt-pill--info" style={{ textTransform: 'capitalize' }}>
              <span className="pt-pill__dot" aria-hidden="true" />
              {gp.mode}
            </span>
          )}
        </div>
        <h1 className="np-title" style={{ fontSize: '1.5rem' }}>
          {gp.pose.label}
        </h1>
        <p className="np-fineprint">{gp.pose.instruction}</p>

        <div
          className={`np-front-stage${isRight ? ' is-match' : ''}${gp.state === 'done' ? ' is-done' : ''}`}
          aria-hidden="true"
        >
          <FrontDemoFigure pose={gp.pose} done={isRight} />
        </div>

        <ProgressRing
          value={gp.holdProgress}
          paused={gp.state === 'wrong' || gp.state === 'idle'}
          active={gp.state === 'correct'}
          bigNumber={gp.state === 'done' ? '✓' : gp.state === 'correct' ? `${pct}%` : gp.index + 1}
          unit={isRight ? 'hold' : `of ${gp.total}`}
        />

        <div className="np-cue__dots" aria-hidden="true" style={{ justifyContent: 'center' }}>
          {Array.from({ length: gp.total }, (_, i) => (
            <span
              key={i}
              className={`np-cue__dot${i === gp.index ? ' is-active' : ''}${i < gp.index ? ' is-done' : ''}`}
            />
          ))}
        </div>

        <div className="np-actions" style={{ justifyContent: 'center' }}>
          <Button
            variant={gp.showSkip ? 'secondary' : 'ghost'}
            onClick={gp.skip}
            aria-label="Skip this position and move to the next"
          >
            Skip this one
          </Button>
          <Button variant="ghost" onClick={gp.restart}>
            Restart
          </Button>
          <Button variant="danger" onClick={onStop}>
            Stop Camera
          </Button>
        </div>

        <p className="np-fineprint" style={{ textAlign: 'center' }}>
          Move gently and only as far as is comfortable. Skip anything that doesn’t feel right —
          your camera angle affects what it can see.
        </p>
        <SafetyNotice compact />
      </Card>
    </div>
  )
}
