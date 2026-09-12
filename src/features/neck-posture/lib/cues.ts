/**
 * The "follow-along" posture cues. On the live and challenge screens the
 * demonstrator figure walks through these one at a time; when the camera flags
 * a specific adjustment, the figure jumps to the matching cue.
 *
 * Copy is gentle wellness guidance — a comfortable position to explore, never a
 * medically "correct" posture you must hold.
 */
import type { PrimaryFeedback } from '../types'
import { KF, type Skeleton } from './poses'

export interface Cue {
  id: string
  label: string
  instruction: string
  /** Two-keyframe loop; `to` is the relaxed position. */
  from: Skeleton
  to: Skeleton
  loopMs: number
}

export const CUES: Cue[] = [
  {
    id: 'sit-tall',
    label: 'Sit tall',
    instruction: 'Grow gently through the crown of your head and let your spine lengthen.',
    from: KF.slouch,
    to: KF.tall,
    loopMs: 3000,
  },
  {
    id: 'head-back',
    label: 'Ease your head back',
    instruction: 'Let your ears drift back over your shoulders. Keep it light — no forcing.',
    from: KF.headForward,
    to: KF.headStacked,
    loopMs: 2800,
  },
  {
    id: 'look-level',
    label: 'Look softly ahead',
    instruction: 'Bring your gaze level, as if the top of the screen were at eye height.',
    from: KF.lookDown,
    to: KF.lookLevel,
    loopMs: 2800,
  },
  {
    id: 'drop-shoulders',
    label: 'Let your shoulders drop',
    instruction: 'Breathe out and let both shoulders settle down away from your ears.',
    from: KF.shouldersUp,
    to: KF.shouldersDown,
    loopMs: 2800,
  },
  {
    id: 'settle',
    label: 'Settle and breathe',
    instruction: 'Stay comfortable and take a few slow, easy breaths in this position.',
    from: KF.tall,
    to: KF.breatheIn,
    loopMs: 4600,
  },
]

export const SETTLE_CUE = CUES[CUES.length - 1]

/** Which cue best matches a reactive correction (null = just keep rotating). */
export function cueForFeedback(fb: PrimaryFeedback): Cue | null {
  switch (fb) {
    case 'forward-head':
      return CUES.find((c) => c.id === 'head-back') ?? null
    case 'screen-higher':
    case 'head-tilt':
      return CUES.find((c) => c.id === 'look-level') ?? null
    case 'shoulder-balance':
      return CUES.find((c) => c.id === 'drop-shoulders') ?? null
    default:
      return null
  }
}
