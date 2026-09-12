import { Button, Card } from '../../../design-system/ui'
import { CheckIcon } from './icons'
import { BreakReminder } from './BreakReminder'
import { SafetyNotice } from './SafetyNotice'

export function CompletionScreen({
  onRestart,
  onBackToGuidance,
  onStop,
  cameraActive,
}: {
  onRestart: () => void
  onBackToGuidance: () => void
  onStop: () => void
  cameraActive: boolean
}) {
  return (
    <div className="np-grid np-grid--split">
      <Card className="np-stack">
        <span className="np-celebrate" aria-hidden="true">
          <CheckIcon />
        </span>
        <h1 className="np-title" style={{ textAlign: 'center' }}>
          Nice work.
        </h1>
        <p className="np-subtitle" style={{ textAlign: 'center', margin: '0 auto' }}>
          You’ve completed your posture practice. Consider taking a short movement
          break before continuing your work.
        </p>

        <hr className="np-divider" />

        <div className="np-actions" style={{ justifyContent: 'center' }}>
          <Button size="lg" onClick={onRestart}>
            Do it again
          </Button>
          {cameraActive && (
            <Button size="lg" variant="secondary" onClick={onBackToGuidance}>
              Back to live guidance
            </Button>
          )}
          {cameraActive && (
            <Button variant="danger" onClick={onStop}>
              Stop Camera
            </Button>
          )}
        </div>
      </Card>

      <div className="np-stack">
        <BreakReminder autoStart />
        <SafetyNotice />
      </div>
    </div>
  )
}
