/**
 * Lightweight "are you doing the pose?" checks for Guided Practice.
 *
 * Everything is deliberately forgiving — generous tolerances, relative
 * measurements, and no penalty for getting it wrong. The goal is a friendly
 * "copy the figure" game, not precise motion capture. A pose only needs to be
 * roughly right and held briefly to advance.
 */
import type { Point, PoseFrame } from '../types'

export interface MatchResult {
  matched: boolean
  /** 0..1, how close the person is to the target (drives the hold ring fill). */
  progress: number
  /** Gentle nudge shown when the pose isn't matched yet. */
  hint: string
}

const mid = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
  visibility: Math.min(a.visibility, b.visibility),
})
export function shoulderMid(f: PoseFrame) {
  return mid(f.leftShoulder, f.rightShoulder)
}
export function hipMid(f: PoseFrame) {
  return mid(f.leftHip, f.rightHip)
}
export function shoulderSpan(f: PoseFrame) {
  return Math.max(0.06, Math.abs(f.leftShoulder.x - f.rightShoulder.x))
}
/** A body-scale reference that survives hips being out of frame. */
export function bodyScale(f: PoseFrame) {
  const torso = Math.abs(shoulderMid(f).y - hipMid(f).y)
  return torso > 0.12 && f.lowerConfidence > 0.4 ? torso : shoulderSpan(f) * 1.4
}

export function armsVisible(f: PoseFrame) {
  return Math.min(f.leftWrist.visibility, f.rightWrist.visibility) >= 0.3
}
export function legsVisible(f: PoseFrame) {
  return f.lowerConfidence >= 0.4
}
