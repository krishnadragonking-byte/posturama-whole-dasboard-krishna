import { Button, Card, Notice, ShieldIcon } from '../../../design-system/ui'

export function ConsentScreen({ onAllow, onCancel }: { onAllow: () => void; onCancel: () => void }) {
  return (
    <div className="pchk-grid pchk-grid--split pchk-center">
      <Card className="pchk-stack">
        <p className="pchk-eyebrow">Before we begin</p>
        <h1 className="pchk-title">Posturama uses your camera for posture guidance</h1>
        <p className="pchk-subtitle">
          We&rsquo;ll capture a single image and send it securely for AI-assisted posture guidance. We do
          not need to permanently store the image to provide the result — only the guidance itself is saved
          to your history.
        </p>

        <div className="pchk-actions">
          <Button size="lg" onClick={onAllow}>
            Allow Camera & Continue
          </Button>
          <Button size="lg" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <p className="pchk-fineprint">Educational guidance only — not medical diagnosis or treatment.</p>
      </Card>

      <div className="pchk-stack">
        <Notice title="Your privacy" icon={ShieldIcon}>
          The camera only turns on after you allow it here. Your photo is analyzed once on our server and
          is not permanently stored — we save the AI&rsquo;s guidance, not the image.
        </Notice>
      </div>
    </div>
  )
}
