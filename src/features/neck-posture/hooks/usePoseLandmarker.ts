import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision'
import { ASSETS } from '../constants'
import { installPrivacyGuard } from '../lib/privacyGuard'

type ModelStatus = 'loading' | 'ready' | 'error'

/**
 * Loads the MediaPipe Pose Landmarker once, entirely on-device.
 *
 * Both the WASM runtime and the ~5.5 MB model file are served from /public
 * (see scripts/ensure-mediapipe-assets.mjs). After load, every call to
 * `detect()` runs locally in a WebAssembly graph — webcam pixels never leave
 * the browser.
 */
export function usePoseLandmarker() {
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const [status, setStatus] = useState<ModelStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let created: PoseLandmarker | null = null

    ;(async () => {
      try {
        installPrivacyGuard() // block ML telemetry before the runtime loads
        const fileset = await FilesetResolver.forVisionTasks(ASSETS.wasmDir)
        created = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: ASSETS.poseModel, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
        if (cancelled) {
          created.close()
          return
        }
        landmarkerRef.current = created
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        console.error('[posturama] pose model failed to load', err)
        setStatus('error')
        setErrorMessage(
          'The on-device posture model could not be loaded. Run "npm run setup" and reload.',
        )
      }
    })()

    return () => {
      cancelled = true
      landmarkerRef.current?.close()
      landmarkerRef.current = null
      created?.close()
    }
  }, [])

  /** Detect for one video frame. Returns null if the model isn't ready. */
  const detect = useCallback(
    (video: HTMLVideoElement, timestampMs: number): PoseLandmarkerResult | null => {
      const lm = landmarkerRef.current
      if (!lm || status !== 'ready') return null
      try {
        return lm.detectForVideo(video, timestampMs)
      } catch (err) {
        console.warn('[posturama] detectForVideo failed', err)
        return null
      }
    },
    [status],
  )

  return { status, errorMessage, detect }
}
