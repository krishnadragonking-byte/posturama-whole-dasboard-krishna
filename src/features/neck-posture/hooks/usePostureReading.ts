import { useMemo } from 'react'
import type { CalibrationBaseline, PostureReading, PrimaryFeedback } from '../types'
import type { PostureEngine } from './usePostureEngine'
import { evaluate } from '../lib/postureMath'
import { pickFeedback } from '../lib/feedback'
import { useHeldFeedback } from './useHeldFeedback'

const NEUTRAL: PostureReading = {
  forwardHead: { category: 'low-confidence', value: 0 },
  headTilt: { category: 'low-confidence', value: 0, direction: 'level' },
  shoulderBalance: { category: 'low-confidence', value: 0, lowerSide: 'even' },
  confidence: 0,
  personPresent: false,
}

/**
 * Combines the raw engine output with the calibration baseline into a
 * categorical reading plus a single, debounced feedback message.
 */
export function usePostureReading(
  engine: PostureEngine,
  baseline: CalibrationBaseline | null,
): { reading: PostureReading; feedback: PrimaryFeedback } {
  const reading = useMemo<PostureReading>(() => {
    if (!baseline) return { ...NEUTRAL, personPresent: engine.personPresent }
    if (!engine.metrics) {
      return {
        ...NEUTRAL,
        confidence: engine.confidence,
        personPresent: engine.personPresent,
      }
    }
    return evaluate(engine.metrics, baseline, engine.confidence, engine.personPresent)
  }, [engine.metrics, engine.confidence, engine.personPresent, baseline])

  const candidate = useMemo(() => pickFeedback(reading), [reading])
  const feedback = useHeldFeedback(candidate)

  return { reading, feedback }
}
