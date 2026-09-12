import { SMILE } from '../constants'
import type { PersonState } from '../types'

export function PersonPanel({ label, person }: { label: string; person: PersonState }) {
  const state = !person.present ? 'absent' : person.smiling ? 'smiling' : 'waiting'
  // Shown relative to the "smiling" threshold, not the raw 0..1 score, so a
  // full meter lines up with the moment the status actually switches to
  // "Smiling" — a more useful readout than the underlying number would be.
  const meterPct = Math.round(Math.min(1, person.smileScore / SMILE.enterThreshold) * 100)

  return (
    <div
      // Green the moment this person is smiling; orange otherwise — whether
      // they're present-but-not-smiling or not detected at all, either way
      // they're the reason the timer isn't counting right now.
      className={`cs-person ${person.smiling ? 'cs-person--smiling' : 'cs-person--needs-smile'}${!person.present ? ' cs-person--absent' : ''}`}
      role="status"
    >
      <span className="cs-person__label">{label}</span>
      <span className="cs-person__emoji" aria-hidden="true">
        {state === 'smiling' ? '😊' : state === 'waiting' ? '🙂' : '👤'}
      </span>
      <span className="cs-person__status">
        {state === 'smiling' ? 'Smiling' : state === 'waiting' ? 'Keep smiling' : 'Waiting for face…'}
      </span>
      {state !== 'absent' && (
        <div className="cs-person__meter" aria-hidden="true">
          <i style={{ width: `${meterPct}%` }} />
        </div>
      )}
    </div>
  )
}
