/**
 * DEV-ONLY visual gallery for the data-driven pieces (feedback banner, signal
 * cards, challenge ring, completion) so their states can be screenshotted
 * without a live webcam. Open `/#gallery` under `npm run dev`.
 *
 * Behind `import.meta.env.DEV` at the call site → tree-shaken from production.
 */
import type { PostureReading } from '../types'
import { ModuleShell } from '../components/ModuleShell'
import { FeedbackBanner } from '../components/FeedbackBanner'
import { SignalCards } from '../components/SignalCards'
import { ProgressRing } from '../components/ProgressRing'
import { DemoFigure } from '../components/DemoFigure'
import { FrontDemoFigure } from '../components/FrontDemoFigure'
import { CompletionScreen } from '../components/CompletionScreen'
import { CUES } from '../lib/cues'
import { ALL_POSES } from '../lib/guidedPoses'
import { Card } from '../../../design-system/ui'

const GOOD: PostureReading = {
  forwardHead: { category: 'good', value: 0.02 },
  headTilt: { category: 'good', value: 1, direction: 'level' },
  shoulderBalance: { category: 'good', value: 0.01, lowerSide: 'even' },
  confidence: 0.92,
  personPresent: true,
}
const FWD: PostureReading = { ...GOOD, forwardHead: { category: 'adjust', value: 0.18 } }
const TILT: PostureReading = { ...GOOD, headTilt: { category: 'adjust', value: 9, direction: 'right' } }
const SHOULDER: PostureReading = {
  ...GOOD,
  shoulderBalance: { category: 'adjust', value: 0.09, lowerSide: 'left' },
}

export function ScreenGallery() {
  return (
    <ModuleShell screen="live" showStepper={false}>
      <div className="np-stack">
        <Card className="np-stack--tight">
          <p className="np-section-label">Feedback states</p>
          <FeedbackBanner feedback="good" />
          <FeedbackBanner feedback="forward-head" />
          <FeedbackBanner feedback="screen-higher" />
          <FeedbackBanner feedback="head-tilt" />
          <FeedbackBanner feedback="shoulder-balance" />
          <FeedbackBanner feedback="no-person" />
          <FeedbackBanner feedback="low-confidence" />
        </Card>

        <Card className="np-stack--tight">
          <p className="np-section-label">Signal cards — good / forward-head / tilt / shoulders</p>
          <SignalCards reading={GOOD} />
          <SignalCards reading={FWD} />
          <SignalCards reading={TILT} />
          <SignalCards reading={SHOULDER} />
        </Card>

        <Card className="np-stack--tight">
          <p className="np-section-label">Follow-along demonstrator — one loop per cue</p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {CUES.map((c) => (
              <div key={c.id} style={{ width: 150, textAlign: 'center' }}>
                <div
                  style={{
                    height: 200,
                    background: '#0c1412',
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'end center',
                    padding: 8,
                  }}
                >
                  <DemoFigure cue={c} />
                </div>
                <p className="np-fineprint" style={{ marginTop: 6 }}>
                  {c.label}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="np-stack--tight">
          <p className="np-section-label">Guided practice — copy-the-figure positions</p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {ALL_POSES.map((g) => (
              <div key={g.id} style={{ width: 160, textAlign: 'center' }}>
                <div className="np-front-stage">
                  <FrontDemoFigure pose={g} still />
                </div>
                <p className="np-fineprint" style={{ marginTop: 6 }}>
                  {g.label}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="np-stack--tight">
          <p className="np-section-label">Challenge ring — running / paused / complete</p>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <ProgressRing value={0.4} bigNumber={36} unit="seconds left" />
            <ProgressRing value={0.7} bigNumber={18} unit="seconds left" paused />
            <ProgressRing value={1} bigNumber="✓" unit="done" />
          </div>
        </Card>

        <CompletionScreen
          cameraActive
          onRestart={() => {}}
          onBackToGuidance={() => {}}
          onStop={() => {}}
        />
      </div>
    </ModuleShell>
  )
}
