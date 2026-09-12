import { useState, type FormEvent } from 'react'
import { Button, Card, Notice } from '../../../design-system/ui'
import { api, ApiError } from '../../../lib/api'
import type { AskResponse } from '../../../lib/postureTypes'

type Status = 'idle' | 'loading' | 'error'

/**
 * "Describe how you're feeling" — a text alternative to the photo-based
 * check. Same safety posture as the rest of the app: educational only, and
 * the server prompt explicitly defers to a professional (rather than
 * attempting to answer) for anything beyond general wellness — see
 * src/server/ask.ts. This card never diagnoses; it only ever shows what the
 * server returns, verbatim.
 */
export function AskCard() {
  const [question, setQuestion] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<AskResponse | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setError(null)
    try {
      const result = await api.post<AskResponse>('/api/posture/ask', { question })
      setResponse(result)
      setStatus('idle')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <Card pad>
      <p className="dash-section-title">Describe how you&rsquo;re feeling</p>
      <p className="dash-status-summary" style={{ marginBottom: '0.9rem' }}>
        No camera needed — describe what you&rsquo;re noticing and get general, educational movement ideas.
      </p>

      <form onSubmit={handleSubmit}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. My neck feels stiff after sitting at my desk all day"
          rows={3}
          maxLength={800}
          required
          style={{
            width: '100%',
            resize: 'vertical',
            padding: '0.7rem 0.9rem',
            borderRadius: 'var(--pt-radius-sm)',
            border: '1.5px solid var(--pt-border-strong)',
            background: 'var(--pt-surface)',
            color: 'var(--pt-text)',
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            marginBottom: '0.75rem',
          }}
        />
        <Button type="submit" disabled={status === 'loading' || question.trim().length < 3}>
          {status === 'loading' ? 'Asking…' : 'Ask'}
        </Button>
      </form>

      {status === 'error' && error ? (
        <p className="dash-error" style={{ marginTop: '0.9rem' }}>
          {error}
        </p>
      ) : null}

      {response ? (
        <div style={{ marginTop: '1.1rem', display: 'grid', gap: '0.75rem' }}>
          {response.isDemo ? (
            <Notice title="Demo mode — not AI-generated" tone="safety">
              OPENAI_API_KEY isn&rsquo;t configured (or has no usable credits), so this is a sample
              response for previewing the layout.
            </Notice>
          ) : null}

          {response.needsProfessional ? (
            <Notice title="Consider a professional" tone="safety">
              {response.answer}
            </Notice>
          ) : (
            <p className="dash-status-summary">{response.answer}</p>
          )}

          {response.suggestions.length > 0 ? (
            <ul className="dash-suggestion-list">
              {response.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : null}

          <p style={{ fontSize: '0.78rem', color: 'var(--pt-text-faint)' }}>{response.disclaimer}</p>
        </div>
      ) : null}
    </Card>
  )
}
