import { useCallback, useEffect, useRef, useState } from 'react'
import { THRESHOLDS, TIMING } from '../constants'
import type { Point, PoseFrame } from '../types'
import { Ema } from '../lib/smoothing'
import {
  headHeightRatio,
  headTiltDeg,
  shoulderDelta,
  toPoseFrame,
} from '../lib/postureMath'
import { drawOverlay, type OverlayTone } from '../lib/overlay'
import { useCamera } from './useCamera'
import { usePoseLandmarker } from './usePoseLandmarker'

export interface EngineMetrics {
  headHeightRatio: number
  tiltDeg: number
  shoulderDelta: number
}

export interface PostureEngine {
  cameraStatus: ReturnType<typeof useCamera>['status']
  modelStatus: ReturnType<typeof usePoseLandmarker>['status']
  errorMessage: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  /** EMA-smoothed geometry, or null until we have a confident frame. */
  metrics: EngineMetrics | null
  confidence: number
  personPresent: boolean
  /** Most recent well-detected frame (raw, unsmoothed) — used by calibration. */
  latestFrame: PoseFrame | null
  running: boolean
  start: () => void
  stop: () => void
  retry: () => void
  /** Force the landmark overlay colour (Guided Practice match feedback). */
  setOverlayTone: (tone: OverlayTone) => void
}

/**
 * Central runtime: wires the local camera to the on-device pose model, runs a
 * detection loop, smooths the geometry, and draws the landmark overlay.
 */
export function usePostureEngine(enabled: boolean): PostureEngine {
  const camera = useCamera()
  const model = usePoseLandmarker()

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastDetectTs = useRef(0)
  const noPersonFrames = useRef(0)
  const overlayToneRef = useRef<OverlayTone>('auto')
  const setOverlayTone = useCallback((tone: OverlayTone) => {
    overlayToneRef.current = tone
  }, [])

  // One smoother per signal. Lower alpha = calmer feedback (see constants).
  const emaHead = useRef(new Ema(TIMING.emaAlpha))
  const emaTilt = useRef(new Ema(TIMING.emaAlpha))
  const emaShoulder = useRef(new Ema(TIMING.emaAlpha))

  const [metrics, setMetrics] = useState<EngineMetrics | null>(null)
  const [confidence, setConfidence] = useState(0)
  const [personPresent, setPersonPresent] = useState(false)
  const [latestFrame, setLatestFrame] = useState<PoseFrame | null>(null)

  const resetSmoothing = useCallback(() => {
    emaHead.current.reset()
    emaTilt.current.reset()
    emaShoulder.current.reset()
    noPersonFrames.current = 0
    setMetrics(null)
    setConfidence(0)
    setPersonPresent(false)
    setLatestFrame(null)
  }, [])

  const { start: cameraStart, stop: cameraStop } = camera

  const start = useCallback(() => {
    resetSmoothing()
    cameraStart()
  }, [cameraStart, resetSmoothing])

  const stop = useCallback(() => {
    cameraStop()
    resetSmoothing()
  }, [cameraStop, resetSmoothing])

  const retry = useCallback(() => {
    resetSmoothing()
    cameraStart()
  }, [cameraStart, resetSmoothing])

  // Auto-start / auto-stop with the `enabled` flag.
  useEffect(() => {
    if (enabled) start()
    else stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  const running = enabled && camera.status === 'ready' && model.status === 'ready'
  const detectPose = model.detect
  const { videoRef } = camera

  // ---- Detection loop -------------------------------------------------------
  useEffect(() => {
    if (!running) return
    const video = videoRef.current
    if (!video) return

    let stopped = false
    const targetIntervalMs = 1000 / 18 // cap detection ~18 fps — plenty for guidance

    const tick = () => {
      if (stopped) return
      rafRef.current = requestAnimationFrame(tick)

      const now = performance.now()
      if (now - lastDetectTs.current < targetIntervalMs) return
      if (video.readyState < 2 || video.videoWidth === 0) return
      lastDetectTs.current = now

      const result = detectPose(video, now)
      const landmarks = result?.landmarks?.[0] as Point[] | undefined
      const frame = landmarks ? toPoseFrame(landmarks) : null

      const canvas = canvasRef.current
      if (canvas) {
        drawOverlay(canvas, video, frame, frame ? frame.confidence : 0, overlayToneRef.current)
      }

      if (!frame || frame.confidence < 0.2) {
        noPersonFrames.current = Math.min(noPersonFrames.current + 1, 999)
        if (noPersonFrames.current >= THRESHOLDS.confidence.noPersonFrames) {
          setPersonPresent(false)
          setConfidence(frame?.confidence ?? 0)
        }
        return
      }

      noPersonFrames.current = 0
      setPersonPresent(true)
      setConfidence(frame.confidence)
      setLatestFrame(frame)

      // Only feed the smoothers when the frame is trustworthy, so a noisy
      // low-confidence frame can't yank the guidance around.
      if (frame.confidence >= THRESHOLDS.confidence.minVisible) {
        setMetrics({
          headHeightRatio: emaHead.current.push(headHeightRatio(frame)),
          tiltDeg: emaTilt.current.push(headTiltDeg(frame)),
          shoulderDelta: emaShoulder.current.push(shoulderDelta(frame)),
        })
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      stopped = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [running, videoRef, detectPose])

  const errorMessage = camera.errorMessage ?? model.errorMessage

  return {
    cameraStatus: camera.status,
    modelStatus: model.status,
    errorMessage,
    videoRef: camera.videoRef,
    canvasRef,
    metrics,
    confidence,
    personPresent,
    latestFrame,
    running,
    start,
    stop,
    retry,
    setOverlayTone,
  }
}
