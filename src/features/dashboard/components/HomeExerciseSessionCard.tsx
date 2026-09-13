import { useEffect, useId, useRef, useState } from 'react'
import { Button, Card, Notice } from '../../../design-system/ui'

type SessionStatus = 'idle' | 'running' | 'paused' | 'completed'

const STATUS_LABEL: Record<SessionStatus, string> = {
  idle: 'Not started',
  running: 'Session active',
  paused: 'Paused',
  completed: 'Completed',
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/**
 * Mock home-exercise session card — a self-contained timer demo, not a real
 * exercise tracker. It never prescribes activity and never claims to measure
 * recovery, health, or exercise effectiveness; see the Notice below.
 */
export function HomeExerciseSessionCard() {
  const [status, setStatus] = useState<SessionStatus>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const checkboxId = useId()

  // performance.now()-anchored clock (rather than a naive setInterval counter)
  // so pause/resume never drifts and stays accurate if the tab is backgrounded.
  const anchorRef = useRef(0)
  const elapsedRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (status !== 'running') return
    const loop = (now: number) => {
      const ms = now - anchorRef.current
      elapsedRef.current = ms
      setElapsedMs(ms)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [status])

  const handleStart = () => {
    if (status !== 'idle') return
    anchorRef.current = performance.now()
    elapsedRef.current = 0
    setElapsedMs(0)
    setStatus('running')
  }

  const handlePause = () => {
    if (status !== 'running') return
    setStatus('paused')
  }

  const handleResume = () => {
    if (status !== 'paused') return
    anchorRef.current = performance.now() - elapsedRef.current
    setStatus('running')
  }

  const handleReset = () => {
    if (status === 'running') return
    anchorRef.current = 0
    elapsedRef.current = 0
    setElapsedMs(0)
    setStatus('idle')
  }

  const handleToggleCompleted = (checked: boolean) => {
    if (checked) {
      setStatus('completed')
    } else {
      setStatus(elapsedRef.current > 0 ? 'paused' : 'idle')
    }
  }

  const canToggleCompleted = status !== 'idle'

  return (
    <Card pad className="dash-session">
      <div className="dash-session-header">
        <div>
          <h2 className="dash-session-title">Home Exercise Session</h2>
          <p className="dash-session-label">Therapist-provided activity</p>
          <p className="dash-session-activity">Mock Mobility Session</p>
          <p className="dash-session-desc">Example therapist-provided activity for prototype testing.</p>
        </div>
        <span
          className={`dash-session-status dash-session-status--${status}`}
          role="status"
          aria-live="polite"
        >
          {status === 'completed' ? (
            <span className="dash-session-status__check" aria-hidden="true">
              ✓
            </span>
          ) : (
            <span className="dash-session-status__dot" aria-hidden="true" />
          )}
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div
        className={`dash-session-timer dash-session-timer--${status}`}
        aria-live="off"
        aria-label={`Session timer, ${formatElapsed(elapsedMs)}`}
      >
        {formatElapsed(elapsedMs)}
      </div>

      <div className="dash-session-actions">
        {status === 'idle' ? (
          <Button size="lg" onClick={handleStart}>
            Start
          </Button>
        ) : null}
        {status === 'running' ? (
          <Button size="lg" variant="secondary" onClick={handlePause}>
            Pause
          </Button>
        ) : null}
        {status === 'paused' ? (
          <>
            <Button size="lg" onClick={handleResume}>
              Resume
            </Button>
            <Button size="lg" variant="secondary" onClick={handleReset}>
              Reset
            </Button>
          </>
        ) : null}
        {status === 'completed' ? (
          <Button size="lg" variant="secondary" onClick={handleReset}>
            Reset
          </Button>
        ) : null}
      </div>

      <div className={['dash-session-complete', !canToggleCompleted && 'dash-session-complete--disabled']
        .filter(Boolean)
        .join(' ')}
      >
        <input
          id={checkboxId}
          type="checkbox"
          checked={status === 'completed'}
          disabled={!canToggleCompleted}
          onChange={(e) => handleToggleCompleted(e.target.checked)}
        />
        <label htmlFor={checkboxId}>Mark session as completed</label>
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        <Notice title="Prototype only — mock data">
          This timer does not prescribe exercises or measure recovery.
        </Notice>
      </div>
    </Card>
  )
}
