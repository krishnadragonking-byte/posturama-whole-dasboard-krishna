import { Button, Card, Notice, ShieldIcon } from '../../../design-system/ui'

export function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="cs-grid cs-grid--split cs-center">
      <Card className="cs-stack">
        <p className="cs-section-label">Two-person challenge</p>
        <h1 className="cs-title">
          Couple Smile <span aria-hidden="true">😊</span>
        </h1>
        <p className="cs-subtitle">Smile together. Complete the challenge together.</p>
        <p className="cs-subtitle">
          Two people can use the same camera and work together to complete a smile challenge.
        </p>

        <div className="cs-actions">
          <Button size="lg" onClick={onStart}>
            Start Challenge
          </Button>
        </div>

        <p className="cs-fineprint">
          Camera access is used for the experience. No recording is required.
        </p>
      </Card>

      <div className="cs-stack">
        <Notice title="Privacy-first processing" icon={ShieldIcon}>
          Camera information is processed on your device where practical. Posturama does not
          record or upload camera images by default.
        </Notice>
      </div>
    </div>
  )
}
