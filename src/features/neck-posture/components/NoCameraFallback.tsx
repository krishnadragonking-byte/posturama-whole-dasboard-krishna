import { useEffect, useRef, useState } from 'react'
import { Button, Card, ProgressBar } from '../../../design-system/ui'
import { TIMING } from '../constants'
import { SafetyNotice } from './SafetyNotice'
import { BreakReminder } from './BreakReminder'

const TIPS = [
  'Sit back so your hips are against the chair and your feet rest flat.',
  'Raise the top of your screen to roughly eye level.',
  'Let your shoulders drop away from your ears.',
  'Keep your head balanced over your shoulders — ears roughly above shoulders.',
  'Take a slow breath and relax your jaw.',
]

/**
 * Fallback when the camera is unavailable or declined. No detection — a calm,
 * self-guided version of the same practice so the page stays useful.
 */
export function NoCameraFallback({ onTryCamera }: { onTryCamera: () => void }) {
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const startRef = useRef(0)

  useEffect(() => {
    if (!running) return
    startRef.current = performance.now()
    let raf = 0
    const loop = (now: number) => {
      const s = (now - startRef.current) / 1000
      if (s >= TIMING.challengeSeconds) {
        setSeconds(TIMING.challengeSeconds)
        setRunning(false)
        setDone(true)
        return
      }
      setSeconds(s)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running])

  return (
    <div className="np-grid np-grid--split">
      <Card className="np-stack">
        <p className="np-section-label">Self-guided practice</p>
        <h1 className="np-title">Practise without the camera</h1>
        <p className="np-subtitle">
          The camera isn’t active, so Posturama can’t give live feedback. You can
          still run the practice using this checklist.
        </p>

        <ol className="np-steps">
          {TIPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>

        {!done ? (
          <>
            <ProgressBar
              value={seconds / TIMING.challengeSeconds}
              label="Self-guided practice progress"
            />
            <div className="np-challenge-status">
              {running
                ? `${Math.ceil(TIMING.challengeSeconds - seconds)}s remaining`
                : 'Ready when you are'}
            </div>
            <div className="np-actions">
              {!running ? (
                <Button size="lg" onClick={() => setRunning(true)}>
                  Start 60-Second Practice
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => {
                    setRunning(false)
                    setSeconds(0)
                  }}
                >
                  Stop
                </Button>
              )}
              <Button size="lg" variant="ghost" onClick={onTryCamera}>
                Try the camera
              </Button>
            </div>
          </>
        ) : (
          <>
            <Card className="np-stack--tight" style={{ background: 'var(--pt-good-bg)' }}>
              <strong>Nice work.</strong>
              <span className="np-fineprint">
                You’ve completed your posture practice. Consider taking a short
                movement break before continuing your work.
              </span>
            </Card>
            <div className="np-actions">
              <Button
                onClick={() => {
                  setDone(false)
                  setSeconds(0)
                }}
              >
                Practise again
              </Button>
              <Button variant="ghost" onClick={onTryCamera}>
                Try the camera
              </Button>
            </div>
          </>
        )}
      </Card>

      <div className="np-stack">
        <BreakReminder />
        <SafetyNotice />
      </div>
    </div>
  )
}
