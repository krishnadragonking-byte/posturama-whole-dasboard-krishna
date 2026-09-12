/**
 * Pure state-transition for the Couple Smile challenge clock.
 *
 * Rules (from the brief):
 *  - time only accrues while BOTH people are smiling
 *  - either person stopping smiling PAUSES (never resets) the accrued time
 *  - a short grace window absorbs a single dropped/blipped detection frame
 *  - reaching the chosen duration latches "complete"
 */
import { TIMING } from '../constants'

export interface ClockState {
  elapsedMs: number
  outOfSyncSince: number | null
  phase: 'running' | 'paused' | 'complete'
}

export const initialClock: ClockState = {
  elapsedMs: 0,
  outOfSyncSince: null,
  phase: 'running',
}

export function stepClock(
  state: ClockState,
  opts: { dtMs: number; now: number; bothSmiling: boolean; targetMs: number },
): ClockState {
  const { targetMs } = opts
  if (state.elapsedMs >= targetMs) {
    return { ...state, phase: 'complete' }
  }

  const outOfSyncSince = opts.bothSmiling ? null : (state.outOfSyncSince ?? opts.now)

  const inGrace = outOfSyncSince !== null && opts.now - outOfSyncSince < TIMING.pauseGraceMs
  const counting = opts.bothSmiling || inGrace

  const elapsedMs = counting
    ? Math.min(state.elapsedMs + opts.dtMs, targetMs)
    : state.elapsedMs

  const phase: ClockState['phase'] =
    elapsedMs >= targetMs ? 'complete' : counting ? 'running' : 'paused'

  return { elapsedMs, outOfSyncSince, phase }
}
