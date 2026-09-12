import { useEffect, useRef, useState } from 'react'
import { TIMING } from '../constants'
import type { PrimaryFeedback } from '../types'

/**
 * Debounces the primary feedback message: a new category must persist
 * continuously for `feedbackHoldMs` before it is shown, so the guidance text
 * never flickers between two states on borderline posture.
 */
export function useHeldFeedback(candidate: PrimaryFeedback): PrimaryFeedback {
  const [held, setHeld] = useState<PrimaryFeedback>(candidate)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (candidate === held) return
    // Wait for the candidate to hold steady; a change resets this timer.
    timerRef.current = setTimeout(() => setHeld(candidate), TIMING.feedbackHoldMs)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [candidate, held])

  return held
}
