import { Button, Card } from '../../../design-system/ui'

export function AnalyzeErrorScreen({
  message,
  onRetry,
  onRetake,
  onCancel,
}: {
  message: string
  onRetry: () => void
  onRetake: () => void
  onCancel: () => void
}) {
  return (
    <div className="pchk-grid pchk-grid--split pchk-center">
      <Card className="pchk-stack">
        <p className="pchk-eyebrow">Analysis failed</p>
        <h1 className="pchk-title">We couldn&rsquo;t analyze that photo</h1>
        <p className="pchk-subtitle">{message}</p>

        <div className="pchk-actions">
          <Button size="lg" onClick={onRetry}>
            Try Again
          </Button>
          <Button size="lg" variant="secondary" onClick={onRetake}>
            Retake Photo
          </Button>
          <Button size="lg" variant="ghost" onClick={onCancel}>
            Back to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  )
}
