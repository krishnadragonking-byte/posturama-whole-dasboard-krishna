import { FEEDBACK_COPY } from '../lib/feedback'
import type { PrimaryFeedback } from '../types'
import { CheckIcon, HeadIcon, ScreenIcon, ShoulderIcon, TiltIcon } from './icons'

const GLYPH: Record<PrimaryFeedback, React.ReactNode> = {
  good: <CheckIcon />,
  'forward-head': <HeadIcon />,
  'screen-higher': <ScreenIcon />,
  'head-tilt': <TiltIcon />,
  'shoulder-balance': <ShoulderIcon />,
  'no-person': <HeadIcon />,
  'low-confidence': <ScreenIcon />,
}

/**
 * The single primary guidance message. Announced politely to screen readers so
 * the guidance is not conveyed by the visual banner alone.
 */
export function FeedbackBanner({ feedback }: { feedback: PrimaryFeedback }) {
  const copy = FEEDBACK_COPY[feedback]
  return (
    <div className={`np-feedback np-feedback--${copy.tone}`} role="status" aria-live="polite">
      <span className="np-feedback__glyph" aria-hidden="true">
        {GLYPH[feedback]}
      </span>
      <div>
        <div className="np-feedback__msg">{copy.message}</div>
        <div className="np-feedback__detail">{copy.detail}</div>
      </div>
    </div>
  )
}
