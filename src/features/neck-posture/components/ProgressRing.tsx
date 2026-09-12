/** Circular progress + big number readout (challenge timer, guided-practice hold). */
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
  /** Gently pulses — used while a guided-practice pose is being held. */
  active?: boolean
}) {
  const r = 46
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.max(0, Math.min(1, value)))
  return (
    <div className={`np-ring${active ? ' np-ring--active' : ''}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="np-ring__track" cx="50" cy="50" r={r} fill="none" strokeWidth="7" />
        <circle
          className={`np-ring__value${paused ? ' np-ring__value--paused' : ''}`}
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="np-ring__center">
        <span className="np-ring__num">{bigNumber}</span>
        <span className="np-ring__unit">{unit}</span>
      </div>
    </div>
  )
}
