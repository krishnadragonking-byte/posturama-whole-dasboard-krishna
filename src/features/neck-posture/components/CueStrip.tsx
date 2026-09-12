import type { GuidedCues } from '../hooks/useGuidedCues'

/**
 * The "follow-along" control: shows the current position, one at a time, with
 * dot progress and manual prev/next + pause. The demonstrator figure behind the
 * camera animates the same cue.
 */
export function CueStrip({ cues }: { cues: GuidedCues }) {
  const { current, index, total, pinned, paused } = cues
  return (
    <div className="np-cue" role="group" aria-label="Follow-along posture positions">
      <div className="np-cue__head">
        <span className="np-section-label">
          {pinned ? 'Try this position' : `Follow along · position ${index + 1} of ${total}`}
        </span>
        {!pinned && (
          <div className="np-cue__nav">
            <button
              type="button"
              className="np-icon-btn"
              onClick={cues.goPrev}
              aria-label="Previous position"
            >
              ‹
            </button>
            <button
              type="button"
              className="np-icon-btn"
              onClick={cues.togglePause}
              aria-pressed={paused}
              aria-label={paused ? 'Resume rotating positions' : 'Pause on this position'}
            >
              {paused ? '▶' : '❚❚'}
            </button>
            <button
              type="button"
              className="np-icon-btn"
              onClick={cues.goNext}
              aria-label="Next position"
            >
              ›
            </button>
          </div>
        )}
      </div>

      <p className="np-cue__label" aria-live="polite">
        {current.label}
      </p>
      <p className="np-cue__text">{current.instruction}</p>

      <div className="np-cue__dots" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`np-cue__dot${i === index ? ' is-active' : ''}`} />
        ))}
      </div>
    </div>
  )
}
