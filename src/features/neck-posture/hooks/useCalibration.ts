import { useCallback, useEffect, useRef, useState } from 'react'
import { THRESHOLDS, TIMING } from '../constants'
import type { CalibrationBaseline, PoseFrame } from '../types'
import { headHeightRatio, buildBaseline } from '../lib/postureMath'

export type CalibrationPhase = 'idle' | 'counting' | 'capturing' | 'done' | 'failed'

export interface CalibrationState {
  phase: CalibrationPhase
  countdown: number
  samplesCollected: number
  samplesNeeded: number
  baseline: CalibrationBaseline | null
  begin: () => void
  reset: () => void
}

/**
 * Runs a short countdown, then averages several well-detected frames into a
 * personal baseline. This baseline is the reference every live signal is
 * measured against — it is NOT a claim about medically correct posture, just
 * "where you started from" for this camera setup.
 */
export function useCalibration(
  latestFrame: PoseFrame | null,
  confidence: number,
): CalibrationState {
  const [phase, setPhase] = useState<CalibrationPhase>('idle')
  const [countdown, setCountdown] = useState(TIMING.calibrationCountdown)
  const [baseline, setBaseline] = useState<CalibrationBaseline | null>(null)

  const samplesRef = useRef<PoseFrame[]>([])
  const [sampleCount, setSampleCount] = useState(0)
  const failTimerRef = useRef<number | null>(null)

  const reset = useCallback(() => {
    if (failTimerRef.current) window.clearTimeout(failTimerRef.current)
    samplesRef.current = []
    setSampleCount(0)
    setCountdown(TIMING.calibrationCountdown)
    setBaseline(null)
    setPhase('idle')
  }, [])

  const begin = useCallback(() => {
    samplesRef.current = []
    setSampleCount(0)
    setCountdown(TIMING.calibrationCountdown)
    setBaseline(null)
    setPhase('counting')
  }, [])

  // Countdown tick
  useEffect(() => {
    if (phase !== 'counting') return
    if (countdown <= 0) {
      // Countdown finished — advance the calibration state machine.
      // oxlint-disable-next-line react/set-state-in-effect
      setPhase('capturing')
      return
    }
    const id = window.setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => window.clearTimeout(id)
  }, [phase, countdown])

  // Sample collection during the "capturing" phase
  useEffect(() => {
    if (phase !== 'capturing') return

    // Give up gracefully if we can't get clean frames in a reasonable time.
    failTimerRef.current = window.setTimeout(() => {
      if (samplesRef.current.length < TIMING.calibrationSamples) setPhase('failed')
    }, 8000)

    return () => {
      if (failTimerRef.current) window.clearTimeout(failTimerRef.current)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'capturing' || !latestFrame) return
    if (confidence < THRESHOLDS.confidence.minForBaseline) return

    samplesRef.current.push(latestFrame)
    const n = samplesRef.current.length
    setSampleCount(n)

    if (n >= TIMING.calibrationSamples) {
      // Trim outliers: keep the middle 80% by head-height ratio before averaging.
      const sorted = [...samplesRef.current].sort(
        (a, b) => headHeightRatio(a) - headHeightRatio(b),
      )
      const cut = Math.floor(sorted.length * 0.1)
      const kept = sorted.slice(cut, sorted.length - cut)
      setBaseline(buildBaseline(kept))
      setPhase('done')
    }
  }, [phase, latestFrame, confidence])

  return {
    phase,
    countdown,
    samplesCollected: sampleCount,
    samplesNeeded: TIMING.calibrationSamples,
    baseline,
    begin,
    reset,
  }
}
