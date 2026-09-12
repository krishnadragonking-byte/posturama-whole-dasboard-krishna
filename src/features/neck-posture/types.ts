/** Shared types for the neck-posture module. */

export interface Point {
  x: number // normalised 0..1 (fraction of frame width)
  y: number // normalised 0..1 (fraction of frame height)
  visibility: number // 0..1, MediaPipe's per-landmark confidence
}

/** The subset of pose landmarks the module relies on, already extracted. */
export interface PoseFrame {
  nose: Point
  leftEye: Point
  rightEye: Point
  leftEar: Point
  rightEar: Point
  leftShoulder: Point
  rightShoulder: Point
  // Arms + lower body — used by Guided Practice (may be low-visibility when
  // seated at a desk; consumers check `lowerConfidence`).
  leftElbow: Point
  rightElbow: Point
  leftWrist: Point
  rightWrist: Point
  leftHip: Point
  rightHip: Point
  leftKnee: Point
  rightKnee: Point
  leftAnkle: Point
  rightAnkle: Point
  /** Mean visibility across the head + shoulder points (neck-posture signals). */
  confidence: number
  /** Mean visibility across hips + knees (lower-body / leg poses). */
  lowerConfidence: number
  /** All 33 landmarks for the overlay renderer. */
  raw: Point[]
}

export type SignalCategory = 'good' | 'adjust' | 'low-confidence'

export interface PostureSignal {
  category: SignalCategory
  /** Signed, smoothed, normalised deviation from baseline (for debugging / meters). */
  value: number
}

export interface PostureReading {
  forwardHead: PostureSignal
  headTilt: PostureSignal & { direction: 'left' | 'right' | 'level' }
  shoulderBalance: PostureSignal & { lowerSide: 'left' | 'right' | 'even' }
  /** Overall confidence for this frame (0..1). */
  confidence: number
  /** True while a person is framed well enough to analyse. */
  personPresent: boolean
}

export interface CalibrationBaseline {
  /** eye-to-shoulder vertical gap / shoulder width */
  headHeightRatio: number
  /** eye-line angle vs horizontal, degrees */
  tiltDeg: number
  /** normalised shoulder height difference */
  shoulderDelta: number
  capturedAt: number
}

export type PrimaryFeedback =
  | 'good'
  | 'forward-head'
  | 'screen-higher'
  | 'head-tilt'
  | 'shoulder-balance'
  | 'no-person'
  | 'low-confidence'

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'loading-model'
  | 'ready'
  | 'denied'
  | 'error'
  | 'stopped'

export type Screen =
  | 'permission'
  | 'no-camera'
  | 'calibration'
  | 'live'
  | 'guided'
  | 'challenge'
  | 'complete'
