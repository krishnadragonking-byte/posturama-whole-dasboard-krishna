import { useRef, useState } from 'react'
import { AppHeader } from '../../design-system/AppHeader'
import { Button, Card, StatusPill } from '../../design-system/ui'
import { formatDate } from '../../lib/formatDate'
import type { PostureStatus } from '../../lib/postureTypes'
import { STATUS_LABEL } from '../../lib/postureTypes'
import type { Route } from '../../routes'
import { useAuth } from '../auth'
import { useHistory } from '../history/useHistory'
import { readFileAsDataUrl } from '../posture-check/lib/captureFrame'
import { setPendingUploadImage } from '../posture-check/lib/pendingUpload'
import { AskCard } from './components/AskCard'
import { HomeExerciseSessionCard } from './components/HomeExerciseSessionCard'
import './dashboard.css'
import { greetingForHour } from './greeting'
import { computeProgress } from './progress'

const STATUS_TONE: Record<PostureStatus, 'good' | 'adjust'> = {
  aligned: 'good',
  'mostly-aligned': 'good',
  'needs-adjustment': 'adjust',
}

const RECENT_ACTIVITY_LIMIT = 5

export function DashboardPage({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const { user, logout } = useAuth()
  const { records, status, error, refresh } = useHistory()
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleLogout = async () => {
    await logout()
    onNavigate('home')
  }

  const handleUploadFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.')
      return
    }
    setUploadError(null)
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setPendingUploadImage(dataUrl)
      onNavigate('posture-check')
    } catch {
      setUploadError('Could not read that photo. Please try another one.')
    }
  }

  const progress = computeProgress(records)
  const greeting = greetingForHour(new Date().getHours())
  const firstName = user?.name.split(' ')[0] ?? 'there'

  return (
    <div className="dash-shell">
      <div className="dash-container">
        <AppHeader
          userName={user?.name ?? ''}
          activeRoute="dashboard"
          onNavigate={onNavigate}
          onLogout={handleLogout}
        />

        <Card className="dash-hero">
          <div>
            <p className="dash-hero__eyebrow">Your posture journey</p>
            <h1 className="dash-hero__title">
              {greeting}, {firstName}
            </h1>
            <p className="dash-hero__subtitle">
              Take a moment for a quick posture check — a photo, a few seconds of AI guidance, and you're done.
            </p>
          </div>
          <div className="dash-hero__actions">
            <Button size="lg" onClick={() => onNavigate('posture-check')}>
              Start Posture Check
            </Button>
            <Button size="lg" variant="secondary" onClick={() => uploadInputRef.current?.click()}>
              Upload a Photo
            </Button>
          </div>
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              handleUploadFile(file)
            }}
          />
        </Card>
        {uploadError ? (
          <p className="dash-error" style={{ marginTop: '-1rem', marginBottom: '1rem' }}>
            {uploadError}
          </p>
        ) : null}

        <div style={{ marginBottom: '1.5rem' }}>
          <HomeExerciseSessionCard />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <AskCard />
        </div>

        {status === 'loading' ? <DashboardSkeleton /> : null}

        {status === 'error' ? (
          <Card pad>
            <p className="dash-error">{error}</p>
            <div style={{ marginTop: '0.9rem' }}>
              <Button variant="secondary" onClick={refresh}>
                Try again
              </Button>
            </div>
          </Card>
        ) : null}

        {status === 'ready' && records.length === 0 ? (
          <Card className="dash-empty">
            <h2 className="dash-empty__title">Start your posture journey</h2>
            <p className="dash-empty__body">
              Complete your first posture check to begin tracking your progress.
            </p>
            <Button size="lg" onClick={() => onNavigate('posture-check')}>
              Start Posture Check
            </Button>
          </Card>
        ) : null}

        {status === 'ready' && records.length > 0 ? (
          <div className="dash-grid">
            <div className="dash-stack">
              <Card pad>
                <p className="dash-section-title">Today&rsquo;s status</p>
                <div className="dash-status-row">
                  {progress.latest!.isDemo ? <StatusPill tone="info">Demo</StatusPill> : null}
                  <StatusPill tone={STATUS_TONE[progress.latest!.status]}>
                    {STATUS_LABEL[progress.latest!.status]}
                  </StatusPill>
                </div>
                <p className="dash-status-summary">{progress.latest!.summary}</p>
              </Card>

              <Card pad>
                <p className="dash-section-title">Progress</p>
                <div className="dash-stats">
                  <div className="dash-stat">
                    <div className="dash-stat__value">{progress.totalChecks}</div>
                    <div className="dash-stat__label">Posture checks</div>
                  </div>
                  <div className="dash-stat">
                    <div className="dash-stat__value">{progress.activeDays}</div>
                    <div className="dash-stat__label">Days active</div>
                  </div>
                  <div className="dash-stat">
                    <div className="dash-stat__value">{formatDate(progress.latest!.createdAt)}</div>
                    <div className="dash-stat__label">Latest check</div>
                  </div>
                </div>
              </Card>

              <Card pad>
                <p className="dash-section-title">Recent activity</p>
                <div className="dash-activity-list">
                  {records.slice(0, RECENT_ACTIVITY_LIMIT).map((r) => (
                    <div className="dash-activity-item" key={r.id}>
                      <div>
                        <div className="dash-activity-item__date">{formatDate(r.createdAt)}</div>
                        <div className="dash-activity-item__type">Posture Check</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {r.isDemo ? <StatusPill tone="info">Demo</StatusPill> : null}
                        <StatusPill tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</StatusPill>
                      </div>
                    </div>
                  ))}
                </div>
                {records.length > RECENT_ACTIVITY_LIMIT ? (
                  <div style={{ marginTop: '0.9rem' }}>
                    <Button variant="ghost" onClick={() => onNavigate('history')}>
                      View all history
                    </Button>
                  </div>
                ) : null}
              </Card>
            </div>

            <div className="dash-stack">
              <Card pad>
                <p className="dash-section-title">Recent recommendations</p>
                <ul className="dash-suggestion-list">
                  {progress.latest!.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="dash-stack">
      <Card pad>
        <div className="dash-skeleton" style={{ width: '40%', marginBottom: '0.75rem' }} />
        <div className="dash-skeleton" style={{ width: '70%' }} />
      </Card>
      <Card pad>
        <div className="dash-skeleton" style={{ width: '30%', marginBottom: '0.75rem' }} />
        <div className="dash-skeleton" style={{ width: '90%' }} />
      </Card>
    </div>
  )
}
