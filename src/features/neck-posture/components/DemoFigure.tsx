import { useEffect, useRef, useState } from 'react'
import type { Cue } from '../lib/cues'
import { lerpSkeleton, type Pt } from '../lib/poses'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const easeInOut = (t: number) => t * t * (3 - 2 * t)

function poseT(phase: number): number {
  if (phase < 0.42) return easeInOut(phase / 0.42)
  if (phase < 0.72) return 1
  return easeInOut(1 - (phase - 0.72) / 0.28)
}

/**
 * A soft seated side-profile demonstrator for the live "follow-along" cues —
 * filled silhouette, gentle breathing idle. Decorative (aria-hidden).
 */
export function DemoFigure({ cue }: { cue: Cue }) {
  const [anim, setAnim] = useState({ t: 1, breathe: 0 })
  const reduced = useRef(prefersReducedMotion())

  useEffect(() => {
    if (reduced.current) {
      setAnim({ t: 1, breathe: 0 })
      return
    }
    let raf = 0
    const start = performance.now()
    const loop = (now: number) => {
      const ms = now - start
      setAnim({
        t: poseT((ms % cue.loopMs) / cue.loopMs),
        breathe: Math.sin(ms / 1300) * 0.6,
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [cue])

  const s = lerpSkeleton(cue.from, cue.to, anim.t)
  const L = (p: Pt) => `${p.x} ${p.y}`

  return (
    <svg
      className="np-fig np-fig--side"
      viewBox="0 0 100 120"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMax meet"
    >
      <ellipse className="np-fig__shadow" cx={s.foot.x - 4} cy={112} rx={15} ry={3} />

      <g transform={`translate(0 ${anim.breathe})`}>
        <g className="np-fig__limb">
          {/* thigh + shin */}
          <path d={`M ${L(s.hip)} L ${L(s.knee)}`} strokeWidth={10} />
          <path d={`M ${L(s.knee)} L ${L(s.foot)}`} strokeWidth={7.5} />
          {/* upper arm + forearm */}
          <path d={`M ${L(s.shoulder)} L ${L(s.elbow)}`} strokeWidth={7} />
          <path d={`M ${L(s.elbow)} L ${L(s.hand)}`} strokeWidth={5.5} />
          {/* spine (torso) */}
          <path
            d={`M ${L(s.hip)} Q ${L(s.midBack)} ${L(s.shoulder)}`}
            strokeWidth={12}
            fill="none"
          />
          {/* neck */}
          <path d={`M ${L(s.shoulder)} L ${s.head.x} ${s.head.y + s.headR * 0.6}`} strokeWidth={7} />
        </g>

        {/* hand + foot */}
        <circle className="np-fig__body" cx={s.hand.x} cy={s.hand.y} r={3.4} />
        <ellipse className="np-fig__body" cx={s.foot.x} cy={s.foot.y} rx={5.5} ry={2.8} />

        {/* head + short nose to show facing direction */}
        <circle className="np-fig__body" cx={s.head.x} cy={s.head.y} r={s.headR} />
        <path
          className="np-fig__edge"
          d={`M ${L(s.head)} L ${L(s.nose)}`}
          strokeWidth={2.4}
        />

        <g className="np-fig__edge">
          <path d={`M ${L(s.shoulder)} L ${L(s.elbow)} L ${L(s.hand)}`} />
          <path d={`M ${L(s.hip)} L ${L(s.knee)} L ${L(s.foot)}`} />
        </g>
      </g>
    </svg>
  )
}
