/**
 * Pure state-transition for the 60-second challenge clock.
 *
 * Rules (from the brief):
 *  - time only accrues while posture is within range
 *  - leaving range PAUSES (never resets) the accrued time
 *  - a short grace window absorbs brief shifts / one-frame detection blips
 *  - reaching the target latches "complete"
 */
import { TIMING } from '../constants'

export interface ClockState {
  elapsedMs: number
  outOfRangeSince: number | null
  phase: 'running' | 'paused' | 'complete'
}

export const initialClock: ClockState = {
  elapsedMs: 0,
  outOfRangeSince: null,
  phase: 'running',
}

export function stepClock(
  state: ClockState,
  opts: { dtMs: number; now: number; withinRange: boolean; targetMs?: number },
): ClockState {
  const targetMs = opts.targetMs ?? TIMING.challengeSeconds * 1000
  if (state.elapsedMs >= targetMs) {
    return { ...state, phase: 'complete' }
  }

  const outOfRangeSince = opts.withinRange
    ? null
    : (state.outOfRangeSince ?? opts.now)

  const inGrace =
    outOfRangeSince !== null && opts.now - outOfRangeSince < TIMING.challengePauseGraceMs
  const counting = opts.withinRange || inGrace

  const elapsedMs = counting
    ? Math.min(state.elapsedMs + opts.dtMs, targetMs)
    : state.elapsedMs

  const phase: ClockState['phase'] =
    elapsedMs >= targetMs ? 'complete' : counting ? 'running' : 'paused'

  return { elapsedMs, outOfRangeSince, phase }
}
