import { Button, Card, Notice } from '../../../design-system/ui'
import type { QualityWarning } from '../lib/imageQuality'

export function ReviewScreen({
  image,
  warnings,
  description,
  onDescriptionChange,
  onRetake,
  onAnalyze,
}: {
  image: string
  warnings: QualityWarning[]
  description: string
  onDescriptionChange: (value: string) => void
  onRetake: () => void
  onAnalyze: () => void
}) {
  return (
    <div className="pchk-grid pchk-grid--split">
      <div>
        <div className="pchk-stage">
          <img src={image} className="pchk-stage__image" alt="Your captured posture photo" />
        </div>
        <div className="pchk-actions" style={{ marginTop: '1rem' }}>
          <Button size="lg" onClick={onAnalyze}>
            Analyze Posture
          </Button>
          <Button size="lg" variant="secondary" onClick={onRetake}>
            Retake
          </Button>
        </div>
      </div>

      <Card className="pchk-stack">
        <p className="pchk-eyebrow">Review your photo</p>
        {warnings.length > 0 ? (
          <Notice title="Before you continue" tone="safety">
            {warnings.map((w) => w.message).join(' ')} You can retake it, or continue anyway — this is just a
            heads-up, not a hard rule.
          </Notice>
        ) : (
          <p className="pchk-subtitle">This photo looks ready to analyze.</p>
        )}

        <div>
          <label htmlFor="pchk-description" className="pchk-eyebrow" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Describe what you&rsquo;re feeling (optional)
          </label>
          <textarea
            id="pchk-description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="e.g. My neck feels stiff after sitting all day"
            rows={3}
            maxLength={800}
            className="pchk-description-input"
          />
          <p className="pchk-fineprint" style={{ marginTop: '0.4rem' }}>
            This is only sent when you click Analyze Posture — nothing happens automatically.
          </p>
        </div>

        <p className="pchk-fineprint">Educational guidance only — not medical diagnosis or treatment.</p>
      </Card>
    </div>
  )
}
