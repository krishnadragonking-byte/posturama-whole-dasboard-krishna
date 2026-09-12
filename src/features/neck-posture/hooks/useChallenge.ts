import { useCallback, useEffect, useRef, useState } from 'react'
import { TIMING } from '../constants'
import { initialClock, stepClock, type ClockState } from '../lib/challengeClock'

export type ChallengePhase = ClockState['phase']

export interface ChallengeState {
  phase: ChallengePhase
  /** Whole seconds accumulated while posture was within range (0..target). */
  elapsed: number
  target: number
  progress: number // 0..1
  restart: () => void
}

/**
 * The 60-second challenge timer. All transition logic lives in the pure
 * `stepClock` helper (unit-tested); this hook just drives it from a rAF loop
 * and mirrors the result into throttled React state.
 */
export function useChallenge(withinRange: boolean, active: boolean): ChallengeState {
  const target = TIMING.challengeSeconds
  const targetMs = target * 1000

  const clockRef = useRef<ClockState>(initialClock)
  const lastTickRef = useRef<number | null>(null)
  const lastPushRef = useRef(0)
  const withinRangeRef = useRef(withinRange)
  useEffect(() => {
    withinRangeRef.current = withinRange
  }, [withinRange])

  const [elapsedMs, setElapsedMs] = useState(0)
  const [phase, setPhase] = useState<ChallengePhase>('running')

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
        withinRange: withinRangeRef.current,
        targetMs,
      })

      setPhase(clockRef.current.phase)
      if (now - lastPushRef.current > 160 || clockRef.current.elapsedMs >= targetMs) {
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

  const elapsed = Math.min(target, Math.floor(elapsedMs / 1000))
  return {
    phase,
    elapsed,
    target,
    progress: Math.min(1, elapsedMs / targetMs),
    restart,
  }
}
