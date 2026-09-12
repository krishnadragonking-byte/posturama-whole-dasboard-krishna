import { useEffect, useRef, useState } from 'react'
import type { GuidedPose } from '../lib/guidedPoses'
import { lerpFront, type FrontSkeleton, type Pt } from '../lib/frontPoses'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const easeInOut = (t: number) => t * t * (3 - 2 * t)

/**
 * Loop shape: ease into the target, dwell there, ease back. Feels like a person
 * demonstrating a move rather than a metronome.
 */
function poseT(phase: number): number {
  if (phase < 0.42) return easeInOut(phase / 0.42)
  if (phase < 0.72) return 1
  return easeInOut(1 - (phase - 0.72) / 0.28)
}

interface Anim {
  t: number
  breathe: number
}

/**
 * A soft humanoid demonstrator for Guided Practice — a filled silhouette with
 * real-ish proportions, hands, feet, a ground shadow and a gentle breathing
 * idle. Decorative (aria-hidden); the pose label carries the instruction.
 */
export function FrontDemoFigure({
  pose,
  done = false,
  still = false,
}: {
  pose: GuidedPose
  done?: boolean
  /** Freeze at the target position (no loop) — used in the dev gallery. */
  still?: boolean
}) {
  const [a, setA] = useState<Anim>({ t: 1, breathe: 0 })
  const reduced = useRef(prefersReducedMotion())

  useEffect(() => {
    if (reduced.current || still) {
      setA({ t: 1, breathe: 0 })
      return
    }
    let raf = 0
    const start = performance.now()
    const loop = (now: number) => {
      const ms = now - start
      setA({
        t: poseT((ms % pose.loopMs) / pose.loopMs),
        breathe: Math.sin(ms / 1300) * 0.7,
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [pose, still])

  const s: FrontSkeleton = lerpFront(pose.from, pose.to, a.t)
  const L = (p: Pt) => `${p.x} ${p.y}`
  const hipC: Pt = { x: (s.hipL.x + s.hipR.x) / 2, y: (s.hipL.y + s.hipR.y) / 2 }
  const shoulderC: Pt = {
    x: (s.shoulderL.x + s.shoulderR.x) / 2,
    y: (s.shoulderL.y + s.shoulderR.y) / 2,
  }
  const feetX = (s.ankleL.x + s.ankleR.x) / 2

  // Torso silhouette: shoulders tapering to a slight waist then to the hips.
  const waistL = { x: s.shoulderL.x * 0.4 + s.hipL.x * 0.6 - 1, y: (shoulderC.y + hipC.y) / 2 }
  const waistR = { x: s.shoulderR.x * 0.4 + s.hipR.x * 0.6 + 1, y: (shoulderC.y + hipC.y) / 2 }
  const torso = `M ${L(s.shoulderL)} Q ${L(waistL)} ${L(s.hipL)} L ${L(s.hipR)} Q ${L(waistR)} ${L(s.shoulderR)} Z`

  return (
    <svg
      className={`np-fig${done ? ' is-match' : ''}`}
      viewBox="0 0 100 122"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMax meet"
    >
      <ellipse className="np-fig__shadow" cx={feetX} cy={119} rx={16} ry={3.2} />

      <g transform={`translate(0 ${a.breathe})`}>
        {/* limbs — drawn thick so the figure reads as a body, not a wireframe */}
        <g className="np-fig__limb">
          <path d={`M ${L(s.hipL)} L ${L(s.kneeL)}`} strokeWidth={10} />
          <path d={`M ${L(s.kneeL)} L ${L(s.ankleL)}`} strokeWidth={7.5} />
          <path d={`M ${L(s.hipR)} L ${L(s.kneeR)}`} strokeWidth={10} />
          <path d={`M ${L(s.kneeR)} L ${L(s.ankleR)}`} strokeWidth={7.5} />
          <path d={`M ${L(s.shoulderL)} L ${L(s.elbowL)}`} strokeWidth={7} />
          <path d={`M ${L(s.elbowL)} L ${L(s.wristL)}`} strokeWidth={5.5} />
          <path d={`M ${L(s.shoulderR)} L ${L(s.elbowR)}`} strokeWidth={7} />
          <path d={`M ${L(s.elbowR)} L ${L(s.wristR)}`} strokeWidth={5.5} />
        </g>

        {/* hands + feet */}
        <circle className="np-fig__body" cx={s.wristL.x} cy={s.wristL.y} r={3.4} />
        <circle className="np-fig__body" cx={s.wristR.x} cy={s.wristR.y} r={3.4} />
        <ellipse className="np-fig__body" cx={s.ankleL.x + 1.5} cy={s.ankleL.y + 1} rx={5} ry={2.8} />
        <ellipse className="np-fig__body" cx={s.ankleR.x + 1.5} cy={s.ankleR.y + 1} rx={5} ry={2.8} />

        {/* torso + neck + head */}
        <path className="np-fig__body" d={torso} />
        <path
          className="np-fig__limb"
          d={`M ${L(shoulderC)} L ${s.head.x} ${s.head.y + s.headR * 0.6}`}
          strokeWidth={7}
        />
        <ellipse
          className="np-fig__body"
          cx={s.head.x}
          cy={s.head.y}
          rx={s.headR}
          ry={s.headR * 1.12}
        />

        {/* subtle definition line + joint accents */}
        <g className="np-fig__edge">
          <path d={`M ${L(s.shoulderL)} L ${L(s.elbowL)} L ${L(s.wristL)}`} />
          <path d={`M ${L(s.shoulderR)} L ${L(s.elbowR)} L ${L(s.wristR)}`} />
          <path d={`M ${L(s.hipL)} L ${L(s.kneeL)} L ${L(s.ankleL)}`} />
          <path d={`M ${L(s.hipR)} L ${L(s.kneeR)} L ${L(s.ankleR)}`} />
        </g>
      </g>
    </svg>
  )
}
