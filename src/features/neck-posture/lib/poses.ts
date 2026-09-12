/**
 * Skeleton geometry for the "follow-along" demonstrator figure.
 *
 * A simple seated side-profile figure facing right (toward where the screen
 * would be). +x = forward / toward the screen, +y = down. Coordinates live in a
 * 0..100 x 0..120 box.
 *
 * Each posture cue is a short two-keyframe loop (`from` -> `to` -> `from` …) so
 * the corrective movement is obvious even though real posture changes are
 * small. `to` is always the relaxed, balanced position.
 */

export interface Pt {
  x: number
  y: number
}

export interface Skeleton {
  head: Pt
  /** Point in the direction the face looks — draws the nose / gaze line. */
  nose: Pt
  neck: Pt
  shoulder: Pt
  midBack: Pt
  hip: Pt
  knee: Pt
  foot: Pt
  elbow: Pt
  hand: Pt
  headR: number
}

/** Balanced, stacked seated posture — the shared starting point. */
export const BASE: Skeleton = {
  head: { x: 45, y: 24 },
  nose: { x: 54, y: 23 },
  neck: { x: 45, y: 38 },
  shoulder: { x: 44, y: 43 },
  midBack: { x: 43, y: 58 },
  hip: { x: 42, y: 74 },
  knee: { x: 68, y: 78 },
  foot: { x: 70, y: 104 },
  elbow: { x: 45, y: 61 },
  hand: { x: 62, y: 66 },
  headR: 8.5,
}

type JointKey = Exclude<keyof Skeleton, 'headR'>
type Partials = Partial<Record<JointKey, Partial<Pt>>>

function make(over: Partials): Skeleton {
  const s: Skeleton = structuredClone(BASE)
  for (const k of Object.keys(over) as JointKey[]) Object.assign(s[k], over[k])
  return s
}

/** Linear-interpolate every joint between two skeletons (t = 0..1). */
export function lerpSkeleton(a: Skeleton, b: Skeleton, t: number): Skeleton {
  const p = (pa: Pt, pb: Pt): Pt => ({
    x: pa.x + (pb.x - pa.x) * t,
    y: pa.y + (pb.y - pa.y) * t,
  })
  return {
    head: p(a.head, b.head),
    nose: p(a.nose, b.nose),
    neck: p(a.neck, b.neck),
    shoulder: p(a.shoulder, b.shoulder),
    midBack: p(a.midBack, b.midBack),
    hip: p(a.hip, b.hip),
    knee: p(a.knee, b.knee),
    foot: p(a.foot, b.foot),
    elbow: p(a.elbow, b.elbow),
    hand: p(a.hand, b.hand),
    headR: a.headR + (b.headR - a.headR) * t,
  }
}

/* ---- Named keyframes -------------------------------------------------- */

export const KF = {
  /** Rounded / slumped — the "before" for "sit tall". */
  slouch: make({
    head: { x: 52, y: 32 },
    nose: { x: 60, y: 33 },
    neck: { x: 50, y: 44 },
    shoulder: { x: 49, y: 48 },
    midBack: { x: 47, y: 60 },
    hip: { x: 43, y: 75 },
    elbow: { x: 48, y: 63 },
    hand: { x: 63, y: 68 },
  }),

  /** Tall, lengthened spine — the "after". */
  tall: BASE,

  /** Head jutting forward over the desk. */
  headForward: make({
    neck: { x: 46, y: 39 },
    head: { x: 55, y: 28 },
    nose: { x: 64, y: 28 },
  }),

  /** Head eased back so the ears sit over the shoulders. */
  headStacked: make({
    neck: { x: 45, y: 38 },
    head: { x: 44, y: 23 },
    nose: { x: 53, y: 22 },
  }),

  /** Looking down at a low screen. */
  lookDown: make({
    head: { x: 46, y: 27 },
    nose: { x: 52, y: 34 },
  }),

  /** Looking softly ahead, screen near eye level. */
  lookLevel: make({
    head: { x: 45, y: 23 },
    nose: { x: 55, y: 22 },
  }),

  /** Shoulders hiked up toward the ears. */
  shouldersUp: make({
    shoulder: { x: 44, y: 38 },
    neck: { x: 45, y: 33 },
    elbow: { x: 46, y: 57 },
    hand: { x: 62, y: 62 },
  }),

  /** Shoulders released and settled down. */
  shouldersDown: make({
    shoulder: { x: 44, y: 45 },
    neck: { x: 45, y: 39 },
    elbow: { x: 45, y: 62 },
    hand: { x: 62, y: 67 },
  }),

  /** Gentle mid-breath lift (used as the calm "hold" loop). */
  breatheIn: make({
    head: { x: 45, y: 22 },
    neck: { x: 45, y: 37 },
    shoulder: { x: 44, y: 42 },
    midBack: { x: 43, y: 57 },
  }),
} as const
