import { Button, Card } from '../../../design-system/ui'

export function PermissionScreen({
  requesting,
  onAllow,
  onBack,
}: {
  requesting: boolean
  onAllow: () => void
  onBack: () => void
}) {
  return (
    <div className="cs-grid cs-center">
      <Card className="cs-stack" style={{ maxWidth: 560, margin: '0 auto' }}>
        <p className="cs-section-label">Camera permission</p>
        <h1 className="cs-title">Camera needed</h1>
        <p className="cs-subtitle">
          Posturama uses your camera to detect faces and smiles during the challenge.
        </p>

        <div className="cs-actions">
          <Button size="lg" onClick={onAllow} disabled={requesting}>
            {requesting ? 'Requesting camera…' : 'Allow Camera'}
          </Button>
          <Button size="lg" variant="secondary" onClick={onBack}>
            Go Back
          </Button>
        </div>

        <p className="cs-fineprint">
          You can stop the camera at any time. Nothing is recorded.
        </p>
      </Card>
    </div>
  )
}
