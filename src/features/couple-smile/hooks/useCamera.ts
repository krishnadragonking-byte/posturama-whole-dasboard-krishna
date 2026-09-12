import { useCallback, useEffect, useRef, useState } from 'react'
import type { CameraStatus } from '../types'

interface UseCameraResult {
  status: CameraStatus
  errorMessage: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  /**
   * Ref callback — attach this to the <video> element, not `videoRef`
   * directly. Couple Smile shows the camera on several screens in a row
   * (setup, then the challenge) while the camera keeps running, and each
   * screen mounts its own <video> element. This re-attaches the live
   * MediaStream to whichever <video> node is currently on screen, so a
   * freshly mounted element never shows a blank frame.
   */
  bindVideo: (node: HTMLVideoElement | null) => void
  start: () => void
  stop: () => void
}

const CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
}

/**
 * Owns the getUserMedia lifecycle, independent of which <video> element is
 * currently mounted.
 *
 * Privacy: the MediaStream stays in this hook and is attached only to the
 * local <video>. It is never recorded, uploaded, or handed to any network
 * code. `stop()` (and unmount) stops every track so the camera light goes
 * off. A monotonic `generation` counter makes start/stop races safe.
 */
export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const generationRef = useRef(0)
  const startingRef = useRef(false)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const attach = useCallback((el: HTMLVideoElement) => {
    const stream = streamRef.current
    if (!stream || el.srcObject === stream) return
    el.srcObject = stream
    el.play().catch(() => {
      /* autoplay can reject before metadata; <video autoPlay> retries */
    })
  }, [])

  const bindVideo = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node
      if (node) attach(node)
    },
    [attach],
  )

  const stop = useCallback(() => {
    generationRef.current += 1 // invalidate any in-flight start()
    startingRef.current = false
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus((prev) => (prev === 'denied' || prev === 'error' ? prev : 'stopped'))
  }, [])

  const start = useCallback(async () => {
    if (streamRef.current || startingRef.current) return
    startingRef.current = true
    const gen = ++generationRef.current
    setErrorMessage(null)
    setStatus('requesting')

    if (!navigator.mediaDevices?.getUserMedia) {
      startingRef.current = false
      setStatus('error')
      setErrorMessage('This browser does not support camera access.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS)
      if (gen !== generationRef.current) {
        // Superseded by a newer start()/stop() — release now.
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      streamRef.current = stream
      // Whatever <video> is mounted right now (or the next one that mounts,
      // via bindVideo) picks the stream up — no assumption about timing.
      if (videoRef.current) attach(videoRef.current)
      setStatus('ready')
    } catch (err) {
      if (gen !== generationRef.current) return
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setStatus('denied')
        setErrorMessage('Camera permission was blocked.')
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setStatus('error')
        setErrorMessage('No usable camera was found on this device.')
      } else if (name === 'NotReadableError') {
        setStatus('error')
        setErrorMessage('The camera is in use by another application.')
      } else {
        setStatus('error')
        setErrorMessage('The camera could not be started.')
      }
    } finally {
      startingRef.current = false
    }
  }, [attach])

  // Safety net: always release the camera on unmount.
  useEffect(() => stop, [stop])

  return { status, errorMessage, videoRef, bindVideo, start, stop }
}
