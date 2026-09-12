export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'error' | 'stopped'

export type Screen =
  | 'consent'
  | 'camera-denied'
  | 'camera-unavailable'
  | 'capture'
  | 'review'
  | 'analyzing'
  | 'analyze-error'
  | 'result'
