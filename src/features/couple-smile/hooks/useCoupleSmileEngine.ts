import { useCallback, useEffect, useRef, useState } from 'react'
import { EMPTY_PERSON, type PersonState } from '../types'
import { TIMING } from '../constants'
import { isSmilingWithHysteresis, smileScoreFromBlendshapes, smoothSmileScore } from '../lib/smile'
import { drawFaceOverlay } from '../lib/overlay'
import { useCamera } from './useCamera'
import { useFaceLandmarker } from './useFaceLandmarker'

export interface CoupleSmileEngine {
  cameraStatus: ReturnType<typeof useCamera>['status']
  modelStatus: ReturnType<typeof useFaceLandmarker>['status']
  errorMessage: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  /** Attach this to the <video> element's `ref` (see useCamera for why). */
  bindVideo: (node: HTMLVideoElement | null) => void
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  /** How many faces are currently in frame (capped detection at 3, so >2 reads as "too many"). */
  faceCount: number
  tooManyFaces: boolean
  personOne: PersonState
  personTwo: PersonState
  bothSmiling: boolean
  running: boolean
  start: () => void
  stop: () => void
  retry: () => void
}

/**
 * Central runtime for Couple Smile: wires the local camera to the on-device
 * face model, runs a detection loop, assigns the (up to two) detected faces
 * to "Person 1" / "Person 2" by left-to-right position, and turns each
 * face's smile blendshapes into a smoothed, debounced smiling/not state.
 *
 * No image data is ever stored — only per-frame numeric state.
 */
export function useCoupleSmileEngine(enabled: boolean): CoupleSmileEngine {
  const camera = useCamera()
  const model = useFaceLandmarker()

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastDetectTs = useRef(0)
  const noFaceFrames = useRef(0)

  // Smoothing + hysteresis state per screen-position slot (0 = left, 1 = right).
  const smoothedScore = useRef<[number, number]>([0, 0])
  const wasSmiling = useRef<[boolean, boolean]>([false, false])
  // Consecutive frames each slot's face has gone undetected. Real tracking
  // drops a face for a frame or two very easily (a blink, a slight turn,
  // motion blur) — without this, that alone would zero out "present" and
  // "smiling" instantly and make the challenge look permanently paused.
  const missingFrames = useRef<[number, number]>([0, 0])

  const [faceCount, setFaceCount] = useState(0)
  const [tooManyFaces, setTooManyFaces] = useState(false)
  const [personOne, setPersonOne] = useState<PersonState>(EMPTY_PERSON)
  const [personTwo, setPersonTwo] = useState<PersonState>(EMPTY_PERSON)

  const resetState = useCallback(() => {
    smoothedScore.current = [0, 0]
    wasSmiling.current = [false, false]
    missingFrames.current = [0, 0]
    noFaceFrames.current = 0
    setFaceCount(0)
    setTooManyFaces(false)
    setPersonOne(EMPTY_PERSON)
    setPersonTwo(EMPTY_PERSON)
  }, [])

  const { start: cameraStart, stop: cameraStop } = camera

  const start = useCallback(() => {
    resetState()
    cameraStart()
  }, [cameraStart, resetState])

  const stop = useCallback(() => {
    cameraStop()
    resetState()
  }, [cameraStop, resetState])

  const retry = useCallback(() => {
    resetState()
    cameraStart()
  }, [cameraStart, resetState])

  // Auto-start / auto-stop with the `enabled` flag.
  useEffect(() => {
    if (enabled) start()
    else stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  const running = enabled && camera.status === 'ready' && model.status === 'ready'
  const detectFace = model.detect
  const { videoRef } = camera

  // ---- Detection loop -------------------------------------------------------
  useEffect(() => {
    if (!running) return

    let stopped = false
    const targetIntervalMs = 1000 / TIMING.detectFps

    const tick = () => {
      if (stopped) return
      rafRef.current = requestAnimationFrame(tick)

      // Re-read on every frame, never captured once — Couple Smile mounts a
      // fresh <video> element per screen while this same effect keeps running
      // underneath (see useCamera's bindVideo). A captured reference would
      // silently keep analysing the old, now-detached element forever after
      // the first screen change, frozen on whatever frame it last showed.
      const video = videoRef.current
      if (!video) return

      const now = performance.now()
      if (now - lastDetectTs.current < targetIntervalMs) return
      if (video.readyState < 2 || video.videoWidth === 0) return
      lastDetectTs.current = now

      const result = detectFace(video, now)
      const canvas = canvasRef.current
      const landmarksList = result?.faceLandmarks ?? []
      const blendshapesList = result?.faceBlendshapes ?? []

      if (landmarksList.length > 2) {
        noFaceFrames.current = 0
        setTooManyFaces(true)
        setFaceCount(landmarksList.length)
        setPersonOne(EMPTY_PERSON)
        setPersonTwo(EMPTY_PERSON)
        if (canvas) drawFaceOverlay(canvas, video, [])
        return
      }

      if (landmarksList.length === 0) {
        noFaceFrames.current = Math.min(noFaceFrames.current + 1, 999)
      } else {
        noFaceFrames.current = 0
      }

      setTooManyFaces(false)
      setFaceCount(landmarksList.length)

      // Sort left-to-right (by mean landmark x) so "Person 1" is stable as
      // long as people stay roughly on their own side of the frame.
      const faces = landmarksList
        .map((points, i) => ({
          points,
          blendshapes: blendshapesList[i]?.categories,
          cx: points.reduce((sum, p) => sum + p.x, 0) / points.length,
        }))
        .sort((a, b) => a.cx - b.cx)
        .slice(0, 2)

      const next: [PersonState, PersonState] = [EMPTY_PERSON, EMPTY_PERSON]
      faces.forEach((face, slot) => {
        missingFrames.current[slot] = 0
        const raw = smileScoreFromBlendshapes(face.blendshapes)
        smoothedScore.current[slot] = smoothSmileScore(smoothedScore.current[slot], raw)
        const smiling = isSmilingWithHysteresis(smoothedScore.current[slot], wasSmiling.current[slot])
        wasSmiling.current[slot] = smiling
        next[slot] = { present: true, smiling, smileScore: smoothedScore.current[slot] }
      })
      // A slot with no face *this* frame doesn't mean that person left — real
      // tracking misses a frame here and there. Hold its last known state for
      // a short run of missed frames (TIMING.noFaceFrames) before actually
      // clearing it, so a blink or brief turn never pauses the timer.
      for (let slot = faces.length; slot < 2; slot++) {
        missingFrames.current[slot] += 1
        if (missingFrames.current[slot] > TIMING.noFaceFrames) {
          smoothedScore.current[slot] = 0
          wasSmiling.current[slot] = false
          next[slot] = EMPTY_PERSON
        } else {
          next[slot] = {
            present: true,
            smiling: wasSmiling.current[slot],
            smileScore: smoothedScore.current[slot],
          }
        }
      }

      setPersonOne(next[0])
      setPersonTwo(next[1])

      if (canvas) {
        drawFaceOverlay(
          canvas,
          video,
          faces.map((face, slot) => ({
            points: face.points,
            smiling: next[slot].smiling,
            label: slot === 0 ? 'P1' : 'P2',
          })),
        )
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      stopped = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [running, videoRef, detectFace])

  const errorMessage = camera.errorMessage ?? model.errorMessage

  return {
    cameraStatus: camera.status,
    modelStatus: model.status,
    errorMessage,
    videoRef: camera.videoRef,
    bindVideo: camera.bindVideo,
    canvasRef,
    faceCount,
    tooManyFaces,
    personOne,
    personTwo,
    bothSmiling: personOne.present && personTwo.present && personOne.smiling && personTwo.smiling,
    running,
    start,
    stop,
    retry,
  }
}
