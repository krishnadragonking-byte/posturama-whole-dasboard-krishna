import { Button, Card } from '../../../design-system/ui'
import type { CameraStatus } from '../types'

/** Handles both "permission denied" and "camera unavailable / no camera" — never crashes. */
export function CameraProblemScreen({
  reason,
  detail,
  onRetry,
  onBack,
}: {
  reason: CameraStatus
  detail?: string | null
  onRetry: () => void
  onBack: () => void
}) {
  const denied = reason === 'denied'
  return (
    <div className="cs-grid cs-center">
      <Card className="cs-stack" style={{ maxWidth: 560, margin: '0 auto' }}>
        <p className="cs-section-label">Camera</p>
        <h1 className="cs-title">{denied ? 'Camera access was denied.' : "We couldn't access your camera."}</h1>
        <p className="cs-subtitle">
          {denied
            ? 'Allow camera access in your browser settings to use this experience.'
            : 'Check that a camera is connected and not in use by another application, then try again.'}
        </p>
        {detail ? <p className="cs-fineprint">Details: {detail}</p> : null}

        <div className="cs-actions">
          <Button size="lg" onClick={onRetry}>
            Try Again
          </Button>
          <Button size="lg" variant="secondary" onClick={onBack}>
            Go Back
          </Button>
        </div>

        {denied && (
          <ul className="cs-list">
            <li>Open your browser's site settings for this page.</li>
            <li>Set the Camera permission to "Allow", then choose Try Again.</li>
          </ul>
        )}
      </Card>
    </div>
  )
}
