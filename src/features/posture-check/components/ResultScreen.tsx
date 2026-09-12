import { Button, Card, Notice, StatusPill } from '../../../design-system/ui'
import type { PostureAnalysis, PostureStatus } from '../../../lib/postureTypes'
import { STATUS_LABEL } from '../../../lib/postureTypes'

const STATUS_TONE: Record<PostureStatus, 'good' | 'adjust'> = {
  aligned: 'good',
  'mostly-aligned': 'good',
  'needs-adjustment': 'adjust',
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function ResultScreen({
  analysis,
  saveState,
  saveError,
  onSave,
  onCheckAgain,
  onBackToDashboard,
}: {
  analysis: PostureAnalysis
  saveState: SaveState
  saveError: string | null
  onSave: () => void
  onCheckAgain: () => void
  onBackToDashboard: () => void
}) {
  return (
    <div className="pchk-grid pchk-grid--split">
      <Card className="pchk-stack">
        <p className="pchk-eyebrow">Your posture check</p>
        {analysis.isDemo ? (
          <Notice title="Demo mode — not AI-generated" tone="safety">
            OPENAI_API_KEY isn&rsquo;t configured on the server, so this is a sample result for previewing the
            layout, not a real analysis of your photo. Add a key and try again to get real AI guidance.
          </Notice>
        ) : null}
        {analysis.needsProfessional ? (
          <Notice title="Consider a professional" tone="safety">
            {analysis.summary}
          </Notice>
        ) : (
          <>
            <div className="pchk-result-status">
              <StatusPill tone={STATUS_TONE[analysis.status]}>{STATUS_LABEL[analysis.status]}</StatusPill>
            </div>
            <p className="pchk-subtitle">{analysis.summary}</p>
          </>
        )}

        <div>
          <p className="pchk-eyebrow" style={{ marginBottom: '0.6rem' }}>
            What we noticed
          </p>
          <ul className="pchk-check-list">
            {analysis.observations.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>

        {!analysis.needsProfessional ? (
          <div>
            <p className="pchk-eyebrow" style={{ marginBottom: '0.6rem' }}>
              Simple adjustments
            </p>
            <ul className="pchk-suggestion-list">
              {analysis.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="pchk-fineprint">{analysis.disclaimer}</p>
      </Card>

      <div className="pchk-stack">
        <Card className="pchk-stack">
          <div className="pchk-actions">
            <Button size="lg" onClick={onSave} disabled={saveState === 'saving' || saveState === 'saved'}>
              {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save Result'}
            </Button>
            <Button size="lg" variant="secondary" onClick={onCheckAgain}>
              Check Again
            </Button>
            <Button size="lg" variant="ghost" onClick={onBackToDashboard}>
              Back to Dashboard
            </Button>
          </div>
          {saveState === 'saved' ? (
            <p className="pchk-save-status">Saved to your activity history.</p>
          ) : null}
          {saveState === 'error' ? (
            <p className="pchk-save-status is-error">{saveError ?? 'Could not save this result. Please try again.'}</p>
          ) : null}
        </Card>
      </div>
    </div>
  )
}
