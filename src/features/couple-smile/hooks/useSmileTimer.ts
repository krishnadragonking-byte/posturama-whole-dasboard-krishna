import { useCallback, useEffect, useRef, useState } from 'react'
import { initialClock, stepClock, type ClockState } from '../lib/timerClock'

export interface SmileTimerState {
  phase: ClockState['phase']
  /** Whole seconds accumulated while both people were smiling (0..target). */
  elapsed: number
  target: number
  progress: number // 0..1
  restart: () => void
}

/**
 * Drives the pure `stepClock` helper (unit-tested) from a rAF loop and
 * mirrors the result into throttled React state — the same shape as the
 * neck-posture module's `useChallenge` hook.
 */
export function useSmileTimer(bothSmiling: boolean, active: boolean, targetSeconds: number): SmileTimerState {
  const targetMs = targetSeconds * 1000

  const clockRef = useRef<ClockState>(initialClock)
  const lastTickRef = useRef<number | null>(null)
  const lastPushRef = useRef(0)
  const bothSmilingRef = useRef(bothSmiling)
  useEffect(() => {
    bothSmilingRef.current = bothSmiling
  }, [bothSmiling])

  const [elapsedMs, setElapsedMs] = useState(0)
  const [phase, setPhase] = useState<ClockState['phase']>('running')

  const restart = useCallback(() => {
    clockRef.current = initialClock
    lastTickRef.current = null
    setElapsedMs(0)
    setPhase('running')
  }, [])

  useEffect(() => {
    if (!active) return
    let rafId: number

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop)
      const last = lastTickRef.current
      lastTickRef.current = now
      if (last === null) return

      clockRef.current = stepClock(clockRef.current, {
        dtMs: now - last,
        now,
        bothSmiling: bothSmilingRef.current,
        targetMs,
      })

      setPhase(clockRef.current.phase)
      if (now - lastPushRef.current > 120 || clockRef.current.elapsedMs >= targetMs) {
        lastPushRef.current = now
        setElapsedMs(clockRef.current.elapsedMs)
      }
    }

    rafId = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafId)
      lastTickRef.current = null
    }
  }, [active, targetMs])

  const elapsed = Math.min(targetSeconds, Math.floor(elapsedMs / 1000))
  return {
    phase,
    elapsed,
    target: targetSeconds,
    progress: Math.min(1, elapsedMs / targetMs),
    restart,
  }
}
