/**
 * Pure hold-and-advance logic for Guided Practice, factored out of the hook so
 * the "match → hold ~1s → next position" behaviour can be unit-tested.
 */
import { TIMING } from '../constants'

export interface PracticeClock {
  index: number
  holdMs: number
  /** 'active' while working a pose, 'celebrate' for the brief tick after a hold. */
  phase: 'active' | 'celebrate' | 'complete'
  celebrateUntil: number
}

export function initialPractice(): PracticeClock {
  return { index: 0, holdMs: 0, phase: 'active', celebrateUntil: 0 }
}

export function stepPractice(
  s: PracticeClock,
  opts: { dtMs: number; now: number; matched: boolean; total: number },
): PracticeClock {
  if (s.phase === 'complete') return s

  if (s.phase === 'celebrate') {
    if (opts.now < s.celebrateUntil) return s
    const next = s.index + 1
    return next >= opts.total
      ? { ...s, phase: 'complete' }
      : { index: next, holdMs: 0, phase: 'active', celebrateUntil: 0 }
  }

  // Fill while matched, ease back down (forgiving) while not.
  const holdMs = opts.matched
    ? Math.min(s.holdMs + opts.dtMs, TIMING.guidedHoldMs)
    : Math.max(0, s.holdMs - opts.dtMs * 2)

  if (holdMs >= TIMING.guidedHoldMs) {
    return {
      ...s,
      holdMs: TIMING.guidedHoldMs,
      phase: 'celebrate',
      celebrateUntil: opts.now + TIMING.guidedAdvanceMs,
    }
  }
  return { ...s, holdMs }
}

/** Manual skip — jump straight to the next pose (or finish). */
export function skipPractice(s: PracticeClock, total: number): PracticeClock {
  if (s.phase === 'complete') return s
  const next = s.index + 1
  return next >= total
    ? { ...s, phase: 'complete' }
    : { index: next, holdMs: 0, phase: 'active', celebrateUntil: 0 }
}
