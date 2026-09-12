/** Circular progress + big number readout for the smile-together timer. */
export function ProgressRing({
  value, // 0..1
  bigNumber,
  unit,
  paused = false,
  active = false,
}: {
  value: number
  bigNumber: number | string
  unit: string
  paused?: boolean
  /** Gently pulses — used while both people are currently smiling. */
  active?: boolean
}) {
  const r = 46
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.max(0, Math.min(1, value)))
  return (
    <div className={`cs-ring${active ? ' cs-ring--active' : ''}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="cs-ring__track" cx="50" cy="50" r={r} fill="none" strokeWidth="7" />
        <circle
          className={`cs-ring__value${paused ? ' cs-ring__value--paused' : ''}`}
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="cs-ring__center">
        <span className="cs-ring__num">{bigNumber}</span>
        <span className="cs-ring__unit">{unit}</span>
      </div>
    </div>
  )
}
