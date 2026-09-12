/**
 * Chooses the ONE primary feedback message to show at a time.
 *
 * Priority order (most actionable first):
 *   1. No person / low confidence  → fix the camera setup first
 *   2. Forward-head                 → the signal most linked to neck strain
 *   3. Shoulder balance
 *   4. Head tilt
 *   5. Good posture
 *
 * All copy is gentle and non-clinical by design.
 */
import type { PostureReading, PrimaryFeedback } from '../types'
import { isForwardHeadSevere } from './postureMath'

interface FeedbackCopy {
  message: string
  detail: string
  tone: 'good' | 'adjust' | 'info'
}

export const FEEDBACK_COPY: Record<PrimaryFeedback, FeedbackCopy> = {
  good: {
    message: 'Good posture',
    detail: 'You look comfortable and balanced. Keep breathing normally.',
    tone: 'good',
  },
  'forward-head': {
    message: 'Bring your head back gently',
    detail: 'Let your ears drift back over your shoulders — no need to force it.',
    tone: 'adjust',
  },
  'screen-higher': {
    message: 'Move your screen a little higher',
    detail: 'Raising the screen toward eye level helps your head stay relaxed.',
    tone: 'adjust',
  },
  'head-tilt': {
    message: 'Level your head',
    detail: 'A small, easy adjustment so your head sits evenly.',
    tone: 'adjust',
  },
  'shoulder-balance': {
    message: 'Level your shoulders',
    detail: 'Let both shoulders settle down and even out.',
    tone: 'adjust',
  },
  'no-person': {
    message: 'Sit comfortably in view',
    detail: 'Move into the camera frame so Posturama can offer guidance.',
    tone: 'info',
  },
  'low-confidence': {
    message: 'Low confidence — adjust your camera position',
    detail: 'More light or a clearer view of your head and shoulders will help.',
    tone: 'info',
  },
}

export function pickFeedback(r: PostureReading): PrimaryFeedback {
  if (!r.personPresent) return 'no-person'
  if (r.confidence < 0.55) return 'low-confidence'

  if (r.forwardHead.category === 'adjust') {
    return isForwardHeadSevere(r) ? 'screen-higher' : 'forward-head'
  }
  if (r.shoulderBalance.category === 'adjust') return 'shoulder-balance'
  if (r.headTilt.category === 'adjust') return 'head-tilt'
  return 'good'
}
