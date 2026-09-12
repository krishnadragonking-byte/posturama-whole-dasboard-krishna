/** Shared types for the Couple Smile module. */

export type CoupleScreen = 'intro' | 'permission' | 'setup' | 'challenge' | 'complete'

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'ready'
  | 'denied'
  | 'error'
  | 'stopped'

/** Per-participant detection state for one frame. No image data is ever kept. */
export interface PersonState {
  present: boolean
  smiling: boolean
  /** Smoothed 0..1 smile confidence, for the progress/visual feedback only. */
  smileScore: number
}

export const EMPTY_PERSON: PersonState = { present: false, smiling: false, smileScore: 0 }

export type ChallengeDuration = 30 | 60

export type ClockPhase = 'running' | 'paused' | 'complete'
