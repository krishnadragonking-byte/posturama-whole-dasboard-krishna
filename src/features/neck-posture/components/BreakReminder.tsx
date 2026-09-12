import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '../../../design-system/ui'
import { TIMING } from '../constants'

const STORAGE_KEY = 'posturama.breakIntervalMin'

function readStored(): number {
  try {
    const v = Number(localStorage.getItem(STORAGE_KEY))
    if (TIMING.breakReminderOptions.includes(v as never)) return v
  } catch {
    /* storage unavailable — fall through to default */
  }
  return TIMING.breakReminderOptions[0]
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * A simple, configurable movement-break reminder. Purely a convenience timer —
 * no notifications permission, no medical claim.
 */
export function BreakReminder({ autoStart = false }: { autoStart?: boolean }) {
  const [intervalMin, setIntervalMin] = useState(readStored)
  const [running, setRunning] = useState(autoStart)
  const [remainingMs, setRemainingMs] = useState(intervalMin * 60_000)
  const [due, setDue] = useState(false)
  const endRef = useRef(0)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(intervalMin))
    } catch {
      /* ignore */
    }
  }, [intervalMin])

  // Reset the countdown whenever the interval changes or we (re)start.
  useEffect(() => {
    if (!running) return
    endRef.current = performance.now() + intervalMin * 60_000
    // Clear a previous "due" state when the reminder (re)starts.
    // oxlint-disable-next-line react/set-state-in-effect
    setDue(false)
    let raf = 0
    const loop = (now: number) => {
      const left = endRef.current - now
      if (left <= 0) {
        setRemainingMs(0)
        setDue(true)
        setRunning(false)
        return
      }
      setRemainingMs(left)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running, intervalMin])

  const label = useMemo(
    () => (due ? 'Time for a movement break' : running ? 'Next break in' : 'Break reminder'),
    [due, running],
  )

  return (
    <Card className="np-stack--tight">
      <p className="np-section-label">Movement break</p>
      <p className="np-fineprint">
        Take a movement break after 30–60 minutes of focused work.
      </p>

      <div className="np-break__options" role="group" aria-label="Break interval in minutes">
        {TIMING.breakReminderOptions.map((min) => (
          <button
            key={min}
            type="button"
            className="np-chip"
            aria-pressed={intervalMin === min}
            onClick={() => {
              setIntervalMin(min)
              setRemainingMs(min * 60_000)
              setDue(false)
            }}
          >
            {min} min
          </button>
        ))}
      </div>

      <div className="np-challenge-status" style={{ justifyContent: 'flex-start' }}>
        <span>{label}</span>
        {!due && (
          <span className="np-break__live" aria-live="polite">
            {fmt(running ? remainingMs : intervalMin * 60_000)}
          </span>
        )}
      </div>

      {due ? (
        <p aria-live="assertive" style={{ color: 'var(--pt-teal-700)', fontWeight: 650 }}>
          Stand up, roll your shoulders, and look into the distance for a few breaths.
        </p>
      ) : null}

      <div className="np-actions">
        <button
          type="button"
          className="np-chip"
          onClick={() => {
            setDue(false)
            setRemainingMs(intervalMin * 60_000)
            setRunning((r) => !r)
          }}
        >
          {running ? 'Pause reminder' : due ? 'Restart reminder' : 'Start reminder'}
        </button>
      </div>
    </Card>
  )
}
