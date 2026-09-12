import { useCallback, useEffect, useRef, useState } from 'react'
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import { ASSETS } from '../lib/assets'
import { installPrivacyGuard } from '../lib/privacyGuard'

type ModelStatus = 'loading' | 'ready' | 'error'

export interface PersonCheckResult {
  present: boolean
  /** Average landmark visibility (0..1) when a pose was found. */
  confidence: number
}

/**
 * Loads the on-device pose model (same vendored files as the neck-posture
 * module, IMAGE running mode instead of VIDEO — we're checking one already
 * -captured photo, not a live stream) so the review screen can genuinely
 * check "is a person visible in this photo" instead of only looking at raw
 * pixel brightness/contrast. Starts loading as soon as the posture-check
 * module mounts so it's normally ready well before the user has framed and
 * captured a shot.
 */
export function usePersonDetector() {
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const [status, setStatus] = useState<ModelStatus>('loading')

  useEffect(() => {
    let cancelled = false
    let created: PoseLandmarker | null = null

    ;(async () => {
      try {
        installPrivacyGuard()
        const fileset = await FilesetResolver.forVisionTasks(ASSETS.wasmDir)
        created = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: ASSETS.poseModel, delegate: 'GPU' },
          runningMode: 'IMAGE',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
        })
        if (cancelled) {
          created.close()
          return
        }
        landmarkerRef.current = created
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        console.error('[posturama] person-check model failed to load', err)
        setStatus('error')
      }
    })()

    return () => {
      cancelled = true
      landmarkerRef.current?.close()
      landmarkerRef.current = null
      created?.close()
    }
  }, [])

  /** Returns null (skip the check) if the model isn't loaded yet — never blocks capture on this. */
  const detectPerson = useCallback(
    (source: HTMLCanvasElement | HTMLImageElement): PersonCheckResult | null => {
      const lm = landmarkerRef.current
      if (!lm || status !== 'ready') return null
      try {
        const result = lm.detect(source)
        const landmarks = result.landmarks[0]
        if (!landmarks || landmarks.length === 0) return { present: false, confidence: 0 }
        const confidence = landmarks.reduce((sum, p) => sum + p.visibility, 0) / landmarks.length
        return { present: confidence >= 0.5, confidence }
      } catch (err) {
        console.warn('[posturama] person detect() failed', err)
        return null
      }
    },
    [status],
  )

  return { status, detectPerson }
}
