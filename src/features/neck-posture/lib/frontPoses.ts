/**
 * Front-facing skeleton for the Guided Practice demonstrator.
 *
 * The figure faces the viewer so whole-body movements (arms overhead, a knee
 * lift, a gentle side-bend) read clearly. Coordinates are in a 0..100 x 0..120
 * box, +x right, +y down. Each guided pose supplies a `from` (near-neutral) and
 * `to` (the target) skeleton; the figure eases between them so it looks like a
 * person moving into the position.
 */

export interface Pt {
  x: number
  y: number
}

export interface FrontSkeleton {
  head: Pt
  neck: Pt
  shoulderL: Pt
  shoulderR: Pt
  elbowL: Pt
  elbowR: Pt
  wristL: Pt
  wristR: Pt
  hipL: Pt
  hipR: Pt
  kneeL: Pt
  kneeR: Pt
  ankleL: Pt
  ankleR: Pt
  headR: number
}

/** Relaxed, upright, arms resting at the sides. */
export const FRONT_BASE: FrontSkeleton = {
  head: { x: 50, y: 15 },
  neck: { x: 50, y: 27 },
  shoulderL: { x: 39, y: 31 },
  shoulderR: { x: 61, y: 31 },
  elbowL: { x: 36, y: 48 },
  elbowR: { x: 64, y: 48 },
  wristL: { x: 34, y: 63 },
  wristR: { x: 66, y: 63 },
  hipL: { x: 43, y: 65 },
  hipR: { x: 57, y: 65 },
  kneeL: { x: 42, y: 89 },
  kneeR: { x: 58, y: 89 },
  ankleL: { x: 41, y: 113 },
  ankleR: { x: 59, y: 113 },
  headR: 8,
}

type JointKey = Exclude<keyof FrontSkeleton, 'headR'>
type Partials = Partial<Record<JointKey, Partial<Pt>>>

export function front(over: Partials): FrontSkeleton {
  const s: FrontSkeleton = structuredClone(FRONT_BASE)
  for (const k of Object.keys(over) as JointKey[]) Object.assign(s[k], over[k])
  return s
}

export function lerpFront(a: FrontSkeleton, b: FrontSkeleton, t: number): FrontSkeleton {
  const p = (pa: Pt, pb: Pt): Pt => ({
    x: pa.x + (pb.x - pa.x) * t,
    y: pa.y + (pb.y - pa.y) * t,
  })
  const out = {} as FrontSkeleton
  for (const k of Object.keys(FRONT_BASE) as Array<keyof FrontSkeleton>) {
    if (k === 'headR') out.headR = a.headR + (b.headR - a.headR) * t
    else out[k] = p(a[k], b[k])
  }
  return out
}

/* ---- Named target keyframes ---------------------------------------- */

export const FKF = {
  base: FRONT_BASE,

  armsUp: front({
    elbowL: { x: 41, y: 12 },
    elbowR: { x: 59, y: 12 },
    wristL: { x: 43, y: 0 },
    wristR: { x: 57, y: 0 },
  }),

  armsWide: front({
    elbowL: { x: 22, y: 31 },
    elbowR: { x: 78, y: 31 },
    wristL: { x: 7, y: 31 },
    wristR: { x: 93, y: 31 },
  }),

  kneeLeft: front({
    hipL: { x: 44, y: 64 },
    kneeL: { x: 45, y: 64 },
    ankleL: { x: 47, y: 82 },
  }),

  kneeRight: front({
    hipR: { x: 56, y: 64 },
    kneeR: { x: 55, y: 64 },
    ankleR: { x: 53, y: 82 },
  }),

  leanLeft: front({
    head: { x: 41, y: 17 },
    neck: { x: 44, y: 28 },
    shoulderL: { x: 33, y: 34 },
    shoulderR: { x: 55, y: 29 },
    elbowL: { x: 30, y: 50 },
    elbowR: { x: 58, y: 46 },
    wristL: { x: 29, y: 64 },
    wristR: { x: 62, y: 60 },
  }),

  leanRight: front({
    head: { x: 59, y: 17 },
    neck: { x: 56, y: 28 },
    shoulderL: { x: 45, y: 29 },
    shoulderR: { x: 67, y: 34 },
    elbowL: { x: 42, y: 46 },
    elbowR: { x: 70, y: 50 },
    wristL: { x: 38, y: 60 },
    wristR: { x: 71, y: 64 },
  }),

  /** Slightly slumped / off-centre — the "before" for "sit tall". */
  slouch: front({
    head: { x: 54, y: 20 },
    neck: { x: 53, y: 30 },
    shoulderL: { x: 42, y: 35 },
    shoulderR: { x: 63, y: 34 },
    hipL: { x: 44, y: 66 },
    hipR: { x: 58, y: 66 },
  }),
} as const
