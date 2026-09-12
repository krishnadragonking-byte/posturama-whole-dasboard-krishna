import { StatusPill, type StatusTone } from '../../../design-system/ui'
import { THRESHOLDS } from '../constants'
import type { PostureReading, SignalCategory } from '../types'
import { HeadIcon, ShoulderIcon, TiltIcon } from './icons'

function toneFor(cat: SignalCategory): StatusTone {
  return cat === 'good' ? 'good' : cat === 'adjust' ? 'adjust' : 'info'
}
function labelFor(cat: SignalCategory): string {
  return cat === 'good' ? 'Good' : cat === 'adjust' ? 'Adjust' : 'Low confidence'
}

/** Meter fill: how close the signal is to its "adjust" threshold (0..1, clamped). */
function fill(value: number, threshold: number): number {
  return Math.max(0.04, Math.min(1, Math.abs(value) / threshold))
}
function meterColor(cat: SignalCategory): string {
  return cat === 'good'
    ? 'var(--pt-good)'
    : cat === 'adjust'
      ? 'var(--pt-adjust)'
      : 'var(--pt-text-faint)'
}

interface Row {
  key: string
  name: string
  hint: string
  icon: React.ReactNode
  cat: SignalCategory
  pct: number
}

export function SignalCards({ reading }: { reading: PostureReading }) {
  const rows: Row[] = [
    {
      key: 'forward-head',
      name: 'Forward-head position',
      hint: 'Head balance over shoulders, vs. your baseline',
      icon: <HeadIcon />,
      cat: reading.forwardHead.category,
      pct: fill(reading.forwardHead.value, THRESHOLDS.forwardHead.adjust),
    },
    {
      key: 'head-tilt',
      name: 'Head tilt',
      hint:
        reading.headTilt.direction === 'level'
          ? 'Left / right head lean'
          : `Leaning ${reading.headTilt.direction}`,
      icon: <TiltIcon />,
      cat: reading.headTilt.category,
      pct: fill(reading.headTilt.value, THRESHOLDS.headTilt.adjustDeg),
    },
    {
      key: 'shoulder-balance',
      name: 'Shoulder balance',
      hint:
        reading.shoulderBalance.lowerSide === 'even'
          ? 'Relative height of left vs. right shoulder'
          : `${reading.shoulderBalance.lowerSide === 'left' ? 'Left' : 'Right'} shoulder lower`,
      icon: <ShoulderIcon />,
      cat: reading.shoulderBalance.category,
      pct: fill(reading.shoulderBalance.value, THRESHOLDS.shoulderBalance.adjust),
    },
  ]

  return (
    <div className="np-signals" aria-label="Posture signals">
      {rows.map((r) => (
        <div key={r.key} className="np-signal">
          <span className="np-signal__icon" aria-hidden="true">
            {r.icon}
          </span>
          <div className="np-signal__body">
            <div className="np-signal__name">{r.name}</div>
            <div className="np-signal__hint">{r.hint}</div>
            <div className="np-signal__meter" aria-hidden="true">
              <i style={{ width: `${r.pct * 100}%`, background: meterColor(r.cat) }} />
            </div>
          </div>
          <StatusPill tone={toneFor(r.cat)}>{labelFor(r.cat)}</StatusPill>
        </div>
      ))}
    </div>
  )
}
