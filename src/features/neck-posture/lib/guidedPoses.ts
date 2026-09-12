/**
 * The Guided Practice movements — easy, safe, and checkable from a webcam.
 *
 * The sequence adapts to what the camera can see: if your legs are in view you
 * get the standing set (with knee lifts); at a desk you get the seated set
 * (gentle side-bends instead). Both are five simple positions, framed as
 * general wellness movement — nothing strenuous, nothing medical, all skippable.
 */
import type { PoseFrame } from '../types'
import {
  armsVisible,
  bodyScale,
  hipMid,
  legsVisible,
  shoulderMid,
  shoulderSpan,
  type MatchResult,
} from './poseMatch'
import { FKF, type FrontSkeleton } from './frontPoses'

/** Context threaded between checks (e.g. which side you just used). */
export interface MatchContext {
  lastLiftedSide?: 'left' | 'right'
  lastLeanSide?: 'left' | 'right'
}

export interface GuidedPose {
  id: string
  label: string
  instruction: string
  /** Demonstrator loop — `to` is the target position. */
  from: FrontSkeleton
  to: FrontSkeleton
  loopMs: number
  /** Does this pose need the legs visible? (used to pick the sequence) */
  needsLegs?: boolean
  check: (
    f: PoseFrame,
    ctx: MatchContext,
  ) => MatchResult & { liftedSide?: 'left' | 'right'; leanSide?: 'left' | 'right' }
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

const POSE_TALL: GuidedPose = {
  id: 'tall',
  label: 'Sit or stand tall',
  instruction: 'Lengthen up, drop your shoulders level, and stack your head over your hips.',
  from: FKF.slouch,
  to: FKF.base,
  loopMs: 3200,
  check: (f) => {
    const level = Math.abs(f.leftShoulder.y - f.rightShoulder.y) / shoulderSpan(f)
    const anchorX = f.lowerConfidence > 0.4 ? hipMid(f).x : shoulderMid(f).x
    const off = Math.abs(f.nose.x - anchorX) / shoulderSpan(f)
    const levelOk = level < 0.2
    const centredOk = off < 0.45
    return {
      matched: levelOk && centredOk,
      progress: clamp01(1 - (level / 0.2) * 0.5 - (off / 0.45) * 0.5),
      hint: !levelOk
        ? 'Even out your shoulders so they sit level.'
        : 'Bring your head back over the centre of your body.',
    }
  },
}

const POSE_REACH_UP: GuidedPose = {
  id: 'reach-up',
  label: 'Reach both hands up',
  instruction: 'Stretch both arms overhead, hands above your shoulders. Breathe out as you reach.',
  from: FKF.base,
  to: FKF.armsUp,
  loopMs: 2800,
  check: (f) => {
    if (!armsVisible(f)) {
      return { matched: false, progress: 0.05, hint: 'Move back a little so your hands stay in view.' }
    }
    const sY = shoulderMid(f).y
    const scale = bodyScale(f)
    const liftL = clamp01((sY - f.leftWrist.y) / (scale * 0.5))
    const liftR = clamp01((sY - f.rightWrist.y) / (scale * 0.5))
    const upL = liftL > 0.2
    const upR = liftR > 0.2
    return {
      matched: upL && upR,
      progress: (liftL + liftR) / 2,
      hint:
        upL !== upR
          ? 'Almost — get your other hand up above your shoulder too.'
          : 'Reach both hands up above your head.',
    }
  },
}

const POSE_ARMS_WIDE: GuidedPose = {
  id: 'arms-wide',
  label: 'Open your arms wide',
  instruction: 'Reach both arms straight out to the sides at shoulder height, like a T.',
  from: FKF.base,
  to: FKF.armsWide,
  loopMs: 2800,
  check: (f) => {
    if (!armsVisible(f)) {
      return { matched: false, progress: 0.05, hint: 'Move back so both hands stay in the frame.' }
    }
    const span = Math.abs(f.leftWrist.x - f.rightWrist.x)
    const wide = span > shoulderSpan(f) * 1.7
    const sY = shoulderMid(f).y
    const scale = bodyScale(f)
    const atHeight =
      Math.abs((f.leftWrist.y + f.rightWrist.y) / 2 - sY) < scale * 0.6
    return {
      matched: wide && atHeight,
      progress: clamp01((span / (shoulderSpan(f) * 2)) * (atHeight ? 1 : 0.6)),
      hint: wide
        ? 'Bring your hands up level with your shoulders.'
        : 'Stretch both arms further out to the sides.',
    }
  },
}

function kneePose(id: string, label: string, instruction: string, to: FrontSkeleton): GuidedPose {
  return {
    id,
    label,
    instruction,
    from: FKF.base,
    to,
    loopMs: 2600,
    needsLegs: true,
    check: (f, ctx) => {
      if (!legsVisible(f)) {
        return {
          matched: false,
          progress: 0.05,
          hint: 'Step back so your knees are visible in the camera.',
        }
      }
      const scale = bodyScale(f)
      const diff = (f.leftKnee.y - f.rightKnee.y) / scale // <0 => left knee higher
      const side: 'left' | 'right' = diff < 0 ? 'left' : 'right'
      const lifted = Math.abs(diff) > 0.13
      const isOther = !ctx.lastLiftedSide || side !== ctx.lastLiftedSide
      const wantOther = id === 'knee-b'
      const good = wantOther ? lifted && isOther : lifted
      return {
        matched: good,
        progress: clamp01(Math.abs(diff) / 0.2) * (wantOther && !isOther ? 0.4 : 1),
        hint:
          wantOther && lifted && !isOther
            ? 'Switch legs — lift the other knee this time.'
            : 'Lift one knee up a little higher.',
        liftedSide: side,
      }
    },
  }
}

function leanPose(id: string, label: string, instruction: string, to: FrontSkeleton): GuidedPose {
  return {
    id,
    label,
    instruction,
    from: FKF.base,
    to,
    loopMs: 3000,
    check: (f, ctx) => {
      const scale = shoulderSpan(f)
      // Upper body shifted sideways relative to the hips.
      const shift = (shoulderMid(f).x - hipMid(f).x) / scale // >0 => shoulders right of hips
      const side: 'left' | 'right' = shift < 0 ? 'left' : 'right'
      const leaned = Math.abs(shift) > 0.16
      const isOther = !ctx.lastLeanSide || side !== ctx.lastLeanSide
      const wantOther = id === 'lean-b'
      const good = wantOther ? leaned && isOther : leaned
      return {
        matched: good,
        progress: clamp01(Math.abs(shift) / 0.24) * (wantOther && !isOther ? 0.4 : 1),
        hint:
          wantOther && leaned && !isOther
            ? 'Come back to centre, then lean gently the other way.'
            : 'Lean your upper body gently to one side, keeping your hips still.',
        leanSide: side,
      }
    },
  }
}

const POSE_KNEE_A = kneePose(
  'knee-a',
  'Lift one knee',
  'Bring either knee up toward your chest and hold it there for a moment.',
  FKF.kneeLeft,
)
const POSE_KNEE_B = kneePose(
  'knee-b',
  'Lift the other knee',
  'Lower that leg and bring the opposite knee up instead.',
  FKF.kneeRight,
)
const POSE_LEAN_A = leanPose(
  'lean-a',
  'Lean gently to one side',
  'Slide your upper body softly to one side, keeping your hips settled. Only as far as is comfortable.',
  FKF.leanLeft,
)
const POSE_LEAN_B = leanPose(
  'lean-b',
  'Lean gently the other way',
  'Return through the middle and lean softly to the other side.',
  FKF.leanRight,
)

/** Legs in view — includes knee lifts. */
export const STANDING_SEQUENCE: GuidedPose[] = [
  POSE_TALL,
  POSE_REACH_UP,
  POSE_KNEE_A,
  POSE_ARMS_WIDE,
  POSE_KNEE_B,
]

/** Seated at a desk — upper-body only, gentle side-bends instead of knee lifts. */
export const SEATED_SEQUENCE: GuidedPose[] = [
  POSE_TALL,
  POSE_REACH_UP,
  POSE_LEAN_A,
  POSE_ARMS_WIDE,
  POSE_LEAN_B,
]

/** Every pose, for the dev gallery / tests. */
export const ALL_POSES: GuidedPose[] = [
  POSE_TALL,
  POSE_REACH_UP,
  POSE_ARMS_WIDE,
  POSE_KNEE_A,
  POSE_KNEE_B,
  POSE_LEAN_A,
  POSE_LEAN_B,
]
