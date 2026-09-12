import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'
import { ASSETS } from '../constants'
import { installPrivacyGuard } from '../lib/privacyGuard'

type ModelStatus = 'loading' | 'ready' | 'error'

/**
 * Loads the MediaPipe Face Landmarker once, entirely on-device — the same
 * WASM runtime and vendoring approach the neck-posture module uses for its
 * Pose Landmarker, just a different task bundle.
 *
 * `numFaces: 3` lets us tell "more than two people" apart from "exactly two",
 * even though the game itself only ever uses the first two.
 */
export function useFaceLandmarker() {
  const landmarkerRef = useRef<FaceLandmarker | null>(null)
  const [status, setStatus] = useState<ModelStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let created: FaceLandmarker | null = null

    ;(async () => {
      try {
        installPrivacyGuard() // block ML telemetry before the runtime loads
        const fileset = await FilesetResolver.forVisionTasks(ASSETS.wasmDir)
        created = await FaceLandmarker.createFromOptions(fileset, {
          // CPU, not GPU: the blendshape head (which the smile score depends
          // on) has been unreliable over the GPU delegate across browsers/GPUs
          // in this library — landmarks come through fine but blendshape
          // scores can stay stuck near zero. CPU is what Couple Smile actually
          // needs (blendshapes), and this model is light enough that CPU is
          // still comfortably real-time.
          baseOptions: { modelAssetPath: ASSETS.faceModel, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numFaces: 3,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: false,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
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
        console.error('[posturama] face model failed to load', err)
        setStatus('error')
        setErrorMessage(
          'The on-device face model could not be loaded. Run "npm run setup" and reload.',
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
    (video: HTMLVideoElement, timestampMs: number): FaceLandmarkerResult | null => {
      const lm = landmarkerRef.current
      if (!lm || status !== 'ready') return null
      try {
        return lm.detectForVideo(video, timestampMs)
      } catch (err) {
        console.warn('[posturama] detectForVideo (face) failed', err)
        return null
      }
    },
    [status],
  )

  return { status, errorMessage, detect }
}
