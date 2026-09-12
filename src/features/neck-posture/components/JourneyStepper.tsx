import type { Screen } from '../types'

const STEPS = ['Setup', 'Calibrate', 'Guidance', 'Practice', 'Done'] as const

const SCREEN_STEP: Record<Screen, number> = {
  permission: 0,
  'no-camera': 0,
  calibration: 1,
  live: 2,
  guided: 3,
  challenge: 3,
  complete: 4,
}

/** Compact progress rail for the overall journey, shown in the header. */
export function JourneyStepper({ screen }: { screen: Screen }) {
  const active = SCREEN_STEP[screen]
  return (
    <ol className="np-stepper" aria-label={`Progress: step ${active + 1} of ${STEPS.length}, ${STEPS[active]}`}>
      {STEPS.map((label, i) => {
        const state = i < active ? 'done' : i === active ? 'active' : 'todo'
        return (
          <li key={label} className={`np-stepper__item is-${state}`}>
            <span className="np-stepper__dot" aria-hidden="true">
              {state === 'done' ? '✓' : i + 1}
            </span>
            <span className="np-stepper__label">{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
