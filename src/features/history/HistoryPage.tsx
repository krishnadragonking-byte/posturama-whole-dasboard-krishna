import { AppHeader } from '../../design-system/AppHeader'
import { Button, Card, StatusPill } from '../../design-system/ui'
import { formatDateTime } from '../../lib/formatDate'
import type { PostureStatus } from '../../lib/postureTypes'
import { STATUS_LABEL } from '../../lib/postureTypes'
import type { Route } from '../../routes'
import { useAuth } from '../auth'
import './history.css'
import { useHistory } from './useHistory'

const STATUS_TONE: Record<PostureStatus, 'good' | 'adjust'> = {
  aligned: 'good',
  'mostly-aligned': 'good',
  'needs-adjustment': 'adjust',
}

export function HistoryPage({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const { user, logout } = useAuth()
  const { records, status, error, refresh } = useHistory()

  const handleLogout = async () => {
    await logout()
    onNavigate('home')
  }

  return (
    <div className="hist-shell">
      <div className="hist-container">
        <AppHeader userName={user?.name ?? ''} activeRoute="history" onNavigate={onNavigate} onLogout={handleLogout} />

        <h1 className="hist-title">Activity History</h1>
        <p className="hist-subtitle">Every posture check you&rsquo;ve completed and saved.</p>

        {status === 'loading' ? (
          <div className="hist-list">
            <div className="hist-skeleton" />
            <div className="hist-skeleton" />
            <div className="hist-skeleton" />
          </div>
        ) : null}

        {status === 'error' ? (
          <Card pad>
            <p className="hist-error">{error}</p>
            <div style={{ marginTop: '0.9rem' }}>
              <Button variant="secondary" onClick={refresh}>
                Try again
              </Button>
            </div>
          </Card>
        ) : null}

        {status === 'ready' && records.length === 0 ? (
          <Card className="hist-empty">
            <h2 className="hist-empty__title">No posture checks yet</h2>
            <p className="hist-empty__body">
              Complete your first posture check to begin tracking your progress.
            </p>
            <Button size="lg" onClick={() => onNavigate('posture-check')}>
              Start Posture Check
            </Button>
          </Card>
        ) : null}

        {status === 'ready' && records.length > 0 ? (
          <div className="hist-list">
            {records.map((r) => (
              <Card key={r.id} className="hist-item">
                <div className="hist-item__top">
                  <div>
                    <div className="hist-item__date">{formatDateTime(r.createdAt)}</div>
                    <div className="hist-item__type">Posture Check</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {r.isDemo ? <StatusPill tone="info">Demo</StatusPill> : null}
                    <StatusPill tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</StatusPill>
                  </div>
                </div>
                <p className="hist-item__summary">{r.summary}</p>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
