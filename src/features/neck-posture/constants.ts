/**
 * Centralised, easy-to-tune configuration for the neck-posture module.
 *
 * WHY THESE NUMBERS ARE CONSERVATIVE
 * ---------------------------------
 * A webcam only sees a 2D projection of you, and the camera angle, lens and
 * seating distance all distort the measurements. So every posture signal here
 * is *relative to your own calibrated baseline*, not to an absolute "correct"
 * value, and the thresholds are deliberately generous:
 *
 *   - We only nudge you when a change is clearly larger than natural sway and
 *     measurement noise.
 *   - Feedback is smoothed over ~1 second and must persist before it changes,
 *     so the message never flickers.
 *   - There is a wide "neutral zone" around baseline that always reads as Good.
 *
 * The goal is gentle guidance, not precision measurement.
 */

export const THRESHOLDS = {
  /**
   * Forward-head position.
   * Signal = vertical gap between eye-line and shoulder-line, divided by
   * shoulder width, then compared to baseline. When the head drifts forward /
   * down the face sinks toward the shoulders and this ratio shrinks.
   * Values are the *drop* from baseline (baseline - current), normalised.
   */
  forwardHead: {
    adjust: 0.14, // ratio drop before we suggest bringing the head back
    screenHigher: 0.24, // a larger drop usually means the screen is too low
  },

  /**
   * Head tilt (roll): angle of the line between the eyes vs. horizontal,
   * measured in degrees and compared to baseline.
   */
  headTilt: {
    adjustDeg: 7, // degrees away from baseline before we mention it
  },

  /**
   * Shoulder balance: |leftShoulderY - rightShoulderY| / shoulderWidth,
   * compared to baseline. Purely relative — a tilted camera is cancelled out
   * by the baseline subtraction.
   */
  shoulderBalance: {
    adjust: 0.06, // normalised height difference beyond baseline
  },

  /**
   * Landmark confidence. MediaPipe reports per-landmark "visibility" (0..1);
   * we average it across the points we rely on.
   */
  confidence: {
    minVisible: 0.55, // below this → "low confidence" state
    minForBaseline: 0.7, // calibration needs cleaner data than live guidance
    noPersonFrames: 12, // consecutive empty frames before "no person detected"
  },
} as const

export const TIMING = {
  /** Exponential-moving-average factor for signal smoothing (0..1, lower = smoother). */
  emaAlpha: 0.18,
  /** A feedback category must hold this long (ms) before it is shown. */
  feedbackHoldMs: 900,
  /** Calibration countdown length (seconds). */
  calibrationCountdown: 4,
  /** How many good frames to average into the calibration baseline. */
  calibrationSamples: 24,
  /** The posture challenge target (seconds). */
  challengeSeconds: 60,
  /**
   * Grace window: posture must stay out of range this long (ms) before the
   * challenge timer pauses — a brief shift or a detection blip won't stop it.
   */
  challengePauseGraceMs: 1200,
  /** Default break-reminder interval options (minutes). */
  breakReminderOptions: [30, 45, 60] as const,
  /** How long each "follow-along" cue stays on screen before rotating (ms). */
  cueRotateMs: 14000,
  /** Guided practice: how long a matched pose must be held before advancing (ms). */
  guidedHoldMs: 1100,
  /** Guided practice: short celebratory pause after a pose is completed (ms). */
  guidedAdvanceMs: 700,
  /** Guided practice: after this long stuck on one pose, gently surface "skip" (ms). */
  guidedHintAfterMs: 12000,
}

/** MediaPipe Pose landmark indices we use (BlazePose 33-point topology). */
export const POSE = {
  nose: 0,
  leftEyeInner: 1,
  leftEye: 2,
  rightEyeInner: 4,
  rightEye: 5,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const

/**
 * Local, on-device asset paths (served from /public — never a remote call at
 * runtime). Resolved to an *absolute* URL against the current document so the
 * MediaPipe runtime loads them correctly no matter where the site is hosted —
 * domain root or any sub-path — and from inside its Web Workers.
 */
const BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || './'

function assetUrl(path: string): string {
  try {
    const doc = typeof document !== 'undefined' ? document.baseURI : 'http://localhost/'
    return new URL(`${BASE_URL}${path}`, doc).href
  } catch {
    return `${BASE_URL}${path}`
  }
}

export const ASSETS = {
  wasmDir: assetUrl('mediapipe/wasm'),
  poseModel: assetUrl('mediapipe/models/pose_landmarker_lite.task'),
}
