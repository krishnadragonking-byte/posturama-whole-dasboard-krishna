import { Card } from '../../../design-system/ui'

export function AnalyzingScreen({ image }: { image: string }) {
  return (
    <div className="pchk-grid pchk-grid--split pchk-center">
      <div className="pchk-stage">
        <img src={image} className="pchk-stage__image" alt="Your captured posture photo" />
        <div className="pchk-stage__scrim" role="status">
          <div>
            <div className="pchk-spinner" aria-hidden="true" />
            <h3>Analyzing your posture…</h3>
            <p>This usually takes a few seconds.</p>
          </div>
        </div>
      </div>
      <Card className="pchk-stack">
        <p className="pchk-eyebrow">What&rsquo;s happening</p>
        <p className="pchk-subtitle">
          Your photo is being analyzed once, securely, on our server. It is not stored — only the resulting
          guidance will be available to save.
        </p>
      </Card>
    </div>
  )
}
