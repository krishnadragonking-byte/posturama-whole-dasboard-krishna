import { Button, Card } from '../../../design-system/ui'
import { SafetyNotice } from './SafetyNotice'

export function PermissionDeniedScreen({
  onRetry,
  onContinueWithout,
  detail,
}: {
  onRetry: () => void
  onContinueWithout: () => void
  detail?: string | null
}) {
  return (
    <div className="np-grid np-grid--split np-center">
      <Card className="np-stack">
        <p className="np-section-label">Camera</p>
        <h1 className="np-title">Camera access is unavailable</h1>
        <p className="np-subtitle">
          Posturama needs camera access for live posture guidance. You can
          continue without the camera or enable permission in your browser
          settings.
        </p>
        {detail ? <p className="np-fineprint">Details: {detail}</p> : null}

        <div className="np-actions">
          <Button size="lg" onClick={onRetry}>
            Try Again
          </Button>
          <Button size="lg" variant="secondary" onClick={onContinueWithout}>
            Continue Without Camera
          </Button>
        </div>

        <ul className="np-list">
          <li>Open your browser’s site settings for this page.</li>
          <li>Set the Camera permission to “Allow”, then choose Try Again.</li>
          <li>Check that no other app is currently using the camera.</li>
        </ul>
      </Card>

      <div className="np-stack">
        <SafetyNotice />
      </div>
    </div>
  )
}
