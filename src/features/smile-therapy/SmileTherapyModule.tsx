import { useEffect, useRef, useState } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import './smile-therapy.css'

const TARGET_SECONDS = 60
const SMILE_THRESHOLD = 0.45

function getSmileScore(result: any): number {
  const categories = result?.faceBlendshapes?.[0]?.categories ?? []

  const left = categories.find((item: any) => item.categoryName === 'mouthSmileLeft')?.score ?? 0
  const right = categories.find((item: any) => item.categoryName === 'mouthSmileRight')?.score ?? 0

  return (left + right) / 2
}

export function SmileTherapyModule({ onExit }: { onExit?: () => void } = {}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const landmarkerRef = useRef<FaceLandmarker | null>(null)
  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const elapsedRef = useRef(0)

  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [smiling, setSmiling] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [cameraError, setCameraError] = useState('')

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false

    async function setup() {
      try {
        setCameraError('')

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })

        if (cancelled || !videoRef.current) return

        videoRef.current.srcObject = stream
        await videoRef.current.play()

        const vision = await FilesetResolver.forVisionTasks(
          '/mediapipe/wasm',
        )

        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/mediapipe/models/face_landmarker.task',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
        })

        if (cancelled) {
          landmarker.close()
          return
        }

        landmarkerRef.current = landmarker

        const detect = () => {
          if (cancelled) return

          const video = videoRef.current
          const landmarker = landmarkerRef.current

          if (video && landmarker && video.readyState >= 2) {
            const now = performance.now()
            const result = landmarker.detectForVideo(video, now)

            const hasFace = result.faceLandmarks.length > 0
            const score = getSmileScore(result)
            const isSmiling = hasFace && score >= SMILE_THRESHOLD

            setFaceDetected(hasFace)
            setSmiling(isSmiling)

            if (lastTimeRef.current !== null && running) {
              const delta = (now - lastTimeRef.current) / 1000

              if (isSmiling) {
                elapsedRef.current = Math.min(
                  TARGET_SECONDS,
                  elapsedRef.current + delta,
                )
                setElapsed(elapsedRef.current)

                if (elapsedRef.current >= TARGET_SECONDS) {
                  setRunning(false)
                }
              }
            }

            lastTimeRef.current = now
          }

          animationRef.current = requestAnimationFrame(detect)
        }

        animationRef.current = requestAnimationFrame(detect)
      } catch (error) {
        console.error(error)
        setCameraError(
          'Camera access or Smile Therapy setup failed. Please allow camera access and try again.',
        )
      }
    }

    setup()

    return () => {
      cancelled = true

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }

      landmarkerRef.current?.close()
      landmarkerRef.current = null

      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [running])

  const restart = () => {
    elapsedRef.current = 0
    lastTimeRef.current = null
    setElapsed(0)
    setSmiling(false)
    setRunning(true)
  }

  const toggleRunning = () => {
    lastTimeRef.current = null
    setRunning((value) => !value)
  }

  const remaining = Math.max(0, TARGET_SECONDS - Math.floor(elapsed))
  const progress = Math.min(100, (elapsed / TARGET_SECONDS) * 100)

  return (
    <main className="smile-therapy">
      <section className="smile-therapy__card">
        <button
          type="button"
          className="smile-therapy__back"
          onClick={onExit}
        >
          ← Back
        </button>

        <div className="smile-therapy__heading">
          <p className="smile-therapy__eyebrow">Posturama</p>
          <h1>Smile Therapy 😊</h1>
          <p>
            Keep smiling to keep the timer moving.
          </p>
        </div>

        <div className="smile-therapy__camera">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
          />

          <div
            className={`smile-therapy__status ${
              smiling ? 'is-smiling' : ''
            }`}
          >
            {smiling
              ? '😊 Smiling — timer is running'
              : faceDetected
                ? '🙂 Keep smiling — timer is paused'
                : '👤 Face the camera'}
          </div>
        </div>

        {cameraError && (
          <p className="smile-therapy__error" role="alert">
            {cameraError}
          </p>
        )}

        <div className="smile-therapy__timer">
          <span className="smile-therapy__timer-label">
            Smile Time
          </span>

          <strong>
            {String(Math.floor(remaining / 60)).padStart(2, '0')}:
            {String(remaining % 60).padStart(2, '0')}
          </strong>

          <div className="smile-therapy__progress">
            <div style={{ width: `${progress}%` }} />
          </div>

          <span className="smile-therapy__hint">
            {elapsed >= TARGET_SECONDS
              ? '🎉 Goal complete!'
              : smiling
                ? 'Keep smiling!'
                : 'The timer pauses when you stop smiling.'}
          </span>
        </div>

        <div className="smile-therapy__controls">
          <button
            type="button"
            className="smile-therapy__primary"
            onClick={toggleRunning}
            disabled={elapsed >= TARGET_SECONDS}
          >
            {running ? 'Pause Session' : 'Start Session'}
          </button>

          <button
            type="button"
            className="smile-therapy__secondary"
            onClick={restart}
          >
            Restart
          </button>
        </div>

        <p className="smile-therapy__privacy">
          Your camera is processed on your device for this experience.
          Smile Therapy does not record your video.
        </p>
      </section>
    </main>
  )
}
