import { Button, Card, Notice, ShieldIcon } from '../../../design-system/ui'
import { SafetyNotice } from './SafetyNotice'

export function PermissionScreen({
  onAllow,
  onContinueWithout,
  requesting,
}: {
  onAllow: () => void
  onContinueWithout: () => void
  requesting: boolean
}) {
  return (
    <div className="np-grid np-grid--split np-center">
      <Card className="np-stack">
        <p className="np-section-label">Webcam posture practice</p>
        <h1 className="np-title">Practice Better Posture</h1>
        <p className="np-subtitle">
          Use your camera for gentle, real-time posture guidance while you work
          or practise.
        </p>

        <div className="np-actions">
          <Button size="lg" onClick={onAllow} disabled={requesting}>
            {requesting ? 'Requesting camera…' : 'Allow Camera'}
          </Button>
          <Button size="lg" variant="secondary" onClick={onContinueWithout}>
            Continue Without Camera
          </Button>
        </div>
        <p className="np-fineprint">
          You can stop the camera at any time. Nothing is recorded.
        </p>
      </Card>

      <div className="np-stack">
        <Notice title="Privacy-first processing" icon={ShieldIcon}>
          Camera information is processed on your device where practical.
          Posturama does not record or upload camera images by default.
        </Notice>
        <SafetyNotice />
      </div>
    </div>
  )
}
