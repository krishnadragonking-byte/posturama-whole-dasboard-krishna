import { useCallback, useEffect, useRef, useState } from 'react'
import type { CameraStatus } from '../types'

interface UseCameraResult {
  status: CameraStatus
  errorMessage: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
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
 * Owns the getUserMedia lifecycle for a single <video> element.
 *
 * Privacy: the MediaStream stays in this hook and is attached only to the local
 * <video>. It is never recorded, uploaded, or handed to any network code.
 * `stop()` (and unmount) stops every track so the camera light goes off.
 *
 * A monotonic `generation` counter makes start/stop races safe — including
 * React StrictMode's mount→unmount→mount double-invoke: if the stream arrives
 * after its request was superseded, we stop it immediately instead of leaking.
 */
export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const generationRef = useRef(0)
  const startingRef = useRef(false)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
      if (gen !== generationRef.current || !videoRef.current) {
        // Superseded by a newer start()/stop(), or unmounted — release now.
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play().catch(() => {
        /* autoplay can reject before metadata; <video autoPlay> retries */
      })
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
  }, [])

  // Safety net: always release the camera on unmount.
  useEffect(() => stop, [stop])

  return { status, errorMessage, videoRef, start, stop }
}
