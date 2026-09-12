import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TIMING } from '../constants'
import { CUES, cueForFeedback, type Cue } from '../lib/cues'
import type { PrimaryFeedback } from '../types'

export interface GuidedCues {
  current: Cue
  index: number
  total: number
  /** True while the figure is showing a reactive correction rather than rotating. */
  pinned: boolean
  paused: boolean
  togglePause: () => void
  goPrev: () => void
  goNext: () => void
}

/**
 * Walks the demonstrator figure through the posture cues one at a time.
 *
 * - Auto-advances every `cueRotateMs` while `running` and not paused.
 * - If `feedback` maps to a specific correction (e.g. forward-head), the figure
 *   pins to that cue until the correction clears, then resumes rotating.
 * - The viewer can pause or step through cues manually.
 */
export function useGuidedCues(running: boolean, feedback: PrimaryFeedback): GuidedCues {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const pinnedCue = useMemo(() => cueForFeedback(feedback), [feedback])
  const pinned = pinnedCue !== null

  const goNext = useCallback(() => setIndex((i) => (i + 1) % CUES.length), [])
  const goPrev = useCallback(() => setIndex((i) => (i - 1 + CUES.length) % CUES.length), [])
  const togglePause = useCallback(() => setPaused((p) => !p), [])

  // Keep the rotation index in step with a pinned correction so that, once the
  // correction clears, rotation continues from the cue the viewer just saw.
  const pinnedIndex = pinnedCue ? CUES.indexOf(pinnedCue) : -1
  const lastPinnedRef = useRef(-1)
  useEffect(() => {
    if (pinnedIndex >= 0 && pinnedIndex !== lastPinnedRef.current) {
      lastPinnedRef.current = pinnedIndex
      setIndex(pinnedIndex)
    }
    if (pinnedIndex < 0) lastPinnedRef.current = -1
  }, [pinnedIndex])

  useEffect(() => {
    if (!running || paused || pinned) return
    const id = window.setInterval(goNext, TIMING.cueRotateMs)
    return () => window.clearInterval(id)
  }, [running, paused, pinned, goNext])

  return {
    current: pinnedCue ?? CUES[index],
    index: pinnedCue ? pinnedIndex : index,
    total: CUES.length,
    pinned,
    paused,
    togglePause,
    goPrev,
    goNext,
  }
}
