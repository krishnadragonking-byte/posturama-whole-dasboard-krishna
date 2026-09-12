/**
 * Pure posture-geometry helpers.
 *
 * Every function here works on *normalised* landmark coordinates (0..1) and
 * produces *relative* quantities that are then compared against the user's own
 * calibration baseline elsewhere. Nothing in this file makes an absolute claim
 * about "correct" posture — see constants.ts for the rationale.
 */
import { POSE, THRESHOLDS } from '../constants'
import type {
  CalibrationBaseline,
  Point,
  PoseFrame,
  PostureReading,
} from '../types'

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Extract the landmarks we care about from MediaPipe's 33-point array. */
export function toPoseFrame(landmarks: Point[]): PoseFrame | null {
  if (!landmarks || landmarks.length < 29) return null
  const pick = (i: number): Point => {
    const p = landmarks[i] ?? { x: 0.5, y: 0.5, visibility: 0 }
    return { x: p.x, y: p.y, visibility: p.visibility ?? 0 }
  }
  const frame: Omit<PoseFrame, 'confidence' | 'lowerConfidence' | 'raw'> = {
    nose: pick(POSE.nose),
    leftEye: pick(POSE.leftEye),
    rightEye: pick(POSE.rightEye),
    leftEar: pick(POSE.leftEar),
    rightEar: pick(POSE.rightEar),
    leftShoulder: pick(POSE.leftShoulder),
    rightShoulder: pick(POSE.rightShoulder),
    leftElbow: pick(POSE.leftElbow),
    rightElbow: pick(POSE.rightElbow),
    leftWrist: pick(POSE.leftWrist),
    rightWrist: pick(POSE.rightWrist),
    leftHip: pick(POSE.leftHip),
    rightHip: pick(POSE.rightHip),
    leftKnee: pick(POSE.leftKnee),
    rightKnee: pick(POSE.rightKnee),
    leftAnkle: pick(POSE.leftAnkle),
    rightAnkle: pick(POSE.rightAnkle),
  }
  const mean = (pts: Point[]) =>
    pts.reduce((sum, p) => sum + clamp01(p.visibility), 0) / pts.length
  const confidence = mean([
    frame.leftEye,
    frame.rightEye,
    frame.leftShoulder,
    frame.rightShoulder,
  ])
  const lowerConfidence = mean([
    frame.leftHip,
    frame.rightHip,
    frame.leftKnee,
    frame.rightKnee,
  ])
  return { ...frame, confidence, lowerConfidence, raw: landmarks }
}

/** Shoulder width in normalised units — the scale we divide everything by. */
export function shoulderWidth(f: PoseFrame): number {
  return Math.max(0.05, dist(f.leftShoulder, f.rightShoulder))
}

/**
 * Head-height ratio: vertical gap between the eye-line and the shoulder-line,
 * divided by shoulder width.
 *
 * Front-on, a forward/down head drift makes the face sink toward the shoulders,
 * shrinking this ratio. Dividing by shoulder width keeps it roughly invariant
 * to how close you sit to the camera.
 */
export function headHeightRatio(f: PoseFrame): number {
  const eyeLineY = (f.leftEye.y + f.rightEye.y) / 2
  const shoulderLineY = (f.leftShoulder.y + f.rightShoulder.y) / 2
  return (shoulderLineY - eyeLineY) / shoulderWidth(f)
}

/** Head roll: angle of the eye-line vs. horizontal, in degrees (+ = right ear down). */
export function headTiltDeg(f: PoseFrame): number {
  const dy = f.rightEye.y - f.leftEye.y
  const dx = f.rightEye.x - f.leftEye.x
  return (Math.atan2(dy, dx) * 180) / Math.PI
}

/** Normalised shoulder height difference (signed: + = right shoulder lower). */
export function shoulderDelta(f: PoseFrame): number {
  return (f.rightShoulder.y - f.leftShoulder.y) / shoulderWidth(f)
}

/** Average a set of good frames into a calibration baseline. */
export function buildBaseline(frames: PoseFrame[]): CalibrationBaseline {
  const avg = (fn: (f: PoseFrame) => number) =>
    frames.reduce((s, f) => s + fn(f), 0) / frames.length
  return {
    headHeightRatio: avg(headHeightRatio),
    tiltDeg: avg(headTiltDeg),
    shoulderDelta: avg(shoulderDelta),
    capturedAt: Date.now(),
  }
}

/**
 * Turn a smoothed frame + baseline into categorical posture signals.
 * `smoothed` values are already EMA-filtered upstream.
 */
export function evaluate(
  smoothed: { headHeightRatio: number; tiltDeg: number; shoulderDelta: number },
  baseline: CalibrationBaseline,
  confidence: number,
  personPresent: boolean,
): PostureReading {
  const lowConf = confidence < THRESHOLDS.confidence.minVisible

  // --- Forward head: how far the head has dropped below baseline ---
  const drop = baseline.headHeightRatio - smoothed.headHeightRatio
  const forwardHeadCategory = lowConf
    ? 'low-confidence'
    : drop >= THRESHOLDS.forwardHead.adjust
      ? 'adjust'
      : 'good'

  // --- Head tilt: absolute deviation from the baseline roll angle ---
  const tiltDelta = smoothed.tiltDeg - baseline.tiltDeg
  const tiltCategory = lowConf
    ? 'low-confidence'
    : Math.abs(tiltDelta) >= THRESHOLDS.headTilt.adjustDeg
      ? 'adjust'
      : 'good'
  const tiltDirection =
    tiltCategory !== 'adjust' ? 'level' : tiltDelta > 0 ? 'right' : 'left'

  // --- Shoulder balance: deviation from baseline height difference ---
  const balDelta = smoothed.shoulderDelta - baseline.shoulderDelta
  const balCategory = lowConf
    ? 'low-confidence'
    : Math.abs(balDelta) >= THRESHOLDS.shoulderBalance.adjust
      ? 'adjust'
      : 'good'
  const lowerSide =
    balCategory !== 'adjust' ? 'even' : balDelta > 0 ? 'right' : 'left'

  return {
    forwardHead: { category: forwardHeadCategory, value: drop },
    headTilt: { category: tiltCategory, value: tiltDelta, direction: tiltDirection },
    shoulderBalance: { category: balCategory, value: balDelta, lowerSide },
    confidence,
    personPresent,
  }
}

/** Whether a reading is "within acceptable range" for the challenge timer. */
export function isWithinRange(r: PostureReading): boolean {
  return (
    r.personPresent &&
    r.confidence >= THRESHOLDS.confidence.minVisible &&
    r.forwardHead.category === 'good' &&
    r.headTilt.category === 'good' &&
    r.shoulderBalance.category === 'good'
  )
}

export function isForwardHeadSevere(r: PostureReading): boolean {
  return r.forwardHead.value >= THRESHOLDS.forwardHead.screenHigher
}
