import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../../lib/api'
import type { PostureAnalysis } from '../../lib/postureTypes'
import { AnalyzeErrorScreen } from './components/AnalyzeErrorScreen'
import { AnalyzingScreen } from './components/AnalyzingScreen'
import { CameraTroubleScreen } from './components/CameraTroubleScreen'
import { CaptureScreen } from './components/CaptureScreen'
import { ConsentScreen } from './components/ConsentScreen'
import { PostureCheckShell } from './components/PostureCheckShell'
import { ResultScreen, type SaveState } from './components/ResultScreen'
import { ReviewScreen } from './components/ReviewScreen'
import { useCamera } from './hooks/useCamera'
import { usePersonDetector } from './hooks/usePersonDetector'
import { assessDataUrlQuality, captureFrame, readFileAsDataUrl } from './lib/captureFrame'
import type { QualityWarning } from './lib/imageQuality'
import { takePendingUploadImage } from './lib/pendingUpload'
import type { Screen } from './types'

type PhotoSource = 'camera' | 'upload'

/**
 * State machine: consent → (camera-denied | camera-unavailable | capture) →
 * review → analyzing → (analyze-error | result). The camera is only ever
 * requested from `requestCamera`, which is only ever called in response to
 * a user click (never automatically) — see ConsentScreen's "Allow Camera &
 * Continue" and the various "Try Again" / "Retake" / "Check Again" actions.
 *
 * The Dashboard's "Upload a Photo" button skips this module's camera
 * entirely (see pendingUpload.ts) and lands directly on the review screen —
 * `photoSource` remembers that choice so "Retake" reopens the file picker
 * again instead of silently starting the camera, which would bypass camera
 * consent for a session that never asked for it.
 */
export function PostureCheckModule({ onExit }: { onExit: () => void }) {
  const camera = useCamera()
  // Starts loading the on-device pose model as soon as this module mounts,
  // so it's normally ready well before the user reaches Capture — used only
  // to check "is a person actually visible in this photo", never sent
  // anywhere and never blocking capture if it isn't ready yet.
  const personDetector = usePersonDetector()

  // A pending upload from the Dashboard (if any) is consumed exactly once,
  // synchronously, so the module opens straight on the review screen with no
  // flash of the camera consent screen.
  const [pendingImage] = useState<string | null>(() => takePendingUploadImage())
  const [screen, setScreen] = useState<Screen>(() => (pendingImage ? 'review' : 'consent'))
  const [photoSource, setPhotoSource] = useState<PhotoSource>(() => (pendingImage ? 'upload' : 'camera'))
  const [capturedImage, setCapturedImage] = useState<string | null>(pendingImage)
  const [qualityWarnings, setQualityWarnings] = useState<QualityWarning[]>([])
  // Optional "describe what you're feeling" note, submitted only when the
  // user clicks Analyze Posture — never automatically, never on its own.
  const [description, setDescription] = useState('')
  const [analysis, setAnalysis] = useState<PostureAnalysis | null>(null)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const retakeFileInputRef = useRef<HTMLInputElement | null>(null)

  // The pending image's quality/person check couldn't run before this
  // component existed to hold a person-detector instance — run it once,
  // now, and fill in any warnings a moment after the review screen appears.
  useEffect(() => {
    if (!pendingImage) return
    assessDataUrlQuality(pendingImage, personDetector.detectPerson)
      .then((quality) => setQualityWarnings(quality.warnings))
      .catch(() => {})
    // Only ever run this once, for the image the module was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Enter the capture screen first (mounting its <video>), *then* start the
  // camera in an effect that runs after commit — mirrors usePostureEngine's
  // enabled-flag pattern. Calling camera.start() synchronously from a click
  // handler here would race the <video> element's mount and silently stall
  // in the "requesting" state forever, since useCamera bails out when its
  // videoRef isn't attached yet.
  const requestCamera = useCallback(() => {
    setUploadError(null)
    setPhotoSource('camera')
    setScreen('capture')
  }, [])

  useEffect(() => {
    if (screen === 'capture') camera.start()
  }, [screen, camera.start])

  useEffect(() => {
    if (screen !== 'capture') return
    if (camera.status === 'denied') setScreen('camera-denied')
    else if (camera.status === 'error') setScreen('camera-unavailable')
  }, [screen, camera.status])

  const analyze = useCallback(
    async (image: string) => {
      setScreen('analyzing')
      setAnalyzeError(null)
      try {
        const trimmedDescription = description.trim()
        const result = await api.post<PostureAnalysis>('/api/posture/analyze', {
          image,
          ...(trimmedDescription ? { context: trimmedDescription } : {}),
        })
        setAnalysis(result)
        setSaveState('idle')
        setSaveError(null)
        setScreen('result')
      } catch (err) {
        setAnalyzeError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
        setScreen('analyze-error')
      }
    },
    [description],
  )

  const handlePhotoReady = useCallback((dataUrl: string, warnings: QualityWarning[]) => {
    camera.stop()
    setCapturedImage(dataUrl)
    setQualityWarnings(warnings)
    setDescription('')
    setAnalysis(null)
    setAnalyzeError(null)
    setSaveState('idle')
    setSaveError(null)
    setScreen('review')
  }, [camera])

  const handleCapture = useCallback(() => {
    if (!camera.videoRef.current) return
    try {
      const { dataUrl, quality } = captureFrame(camera.videoRef.current, personDetector.detectPerson)
      handlePhotoReady(dataUrl, quality.warnings)
    } catch {
      setUploadError('Could not capture a photo right now. Please try again.')
    }
  }, [camera, personDetector.detectPerson, handlePhotoReady])

  // The "upload a photo instead" option (offered on the capture screen, the
  // camera-trouble screens, and via the Dashboard) hands us a data URL
  // directly — run the same local quality + person checks on it before
  // moving to the review screen, falling back to "no warnings" if the check
  // itself fails (it's a nice-to-have, never a blocker).
  const handleUploadedPhoto = useCallback(
    (dataUrl: string) => {
      setPhotoSource('upload')
      assessDataUrlQuality(dataUrl, personDetector.detectPerson)
        .then((quality) => handlePhotoReady(dataUrl, quality.warnings))
        .catch(() => handlePhotoReady(dataUrl, []))
    },
    [personDetector.detectPerson, handlePhotoReady],
  )

  const handleRetakeFileChosen = useCallback(
    (file: File | undefined) => {
      if (!file) return
      if (!file.type.startsWith('image/')) {
        setUploadError('Please choose an image file.')
        return
      }
      readFileAsDataUrl(file)
        .then((dataUrl) => handleUploadedPhoto(dataUrl))
        .catch(() => setUploadError('Could not read that photo. Please try another one.'))
    },
    [handleUploadedPhoto],
  )

  const handleExit = useCallback(() => {
    camera.stop()
    onExit()
  }, [camera, onExit])

  // A session that started from the Dashboard's "Upload a Photo" (or fell
  // back to upload after a camera problem) never went through camera
  // consent — "Retake"/"Check Again" must not silently start the camera in
  // that case, so it reopens the file picker instead. Nothing about the
  // previous photo is cleared until a new one actually arrives, so
  // cancelling the file dialog just leaves the current result on screen.
  const startOver = useCallback(() => {
    if (photoSource === 'upload') {
      retakeFileInputRef.current?.click()
      return
    }
    setCapturedImage(null)
    setQualityWarnings([])
    setAnalysis(null)
    setAnalyzeError(null)
    requestCamera()
  }, [photoSource, requestCamera])

  const handleSave = useCallback(async () => {
    if (!analysis) return
    setSaveState('saving')
    setSaveError(null)
    try {
      await api.post('/api/posture/history', analysis)
      setSaveState('saved')
    } catch (err) {
      setSaveState('error')
      setSaveError(err instanceof ApiError ? err.message : 'Could not save this result. Please try again.')
    }
  }, [analysis])

  // Always mounted (not just on upload-sourced screens) so `startOver` can
  // reopen it via a plain ref click for a "Retake" that arrived via upload.
  const retakeFileInput = (
    <input
      ref={retakeFileInputRef}
      type="file"
      accept="image/*"
      style={{ display: 'none' }}
      onChange={(e) => {
        const file = e.target.files?.[0]
        e.target.value = '' // allow choosing the same file twice in a row
        handleRetakeFileChosen(file)
      }}
    />
  )

  let body: React.ReactNode
  switch (screen) {
    case 'consent':
      body = <ConsentScreen onAllow={requestCamera} onCancel={handleExit} />
      break

    case 'camera-denied':
    case 'camera-unavailable':
      body = (
        <CameraTroubleScreen
          variant={screen === 'camera-denied' ? 'denied' : 'unavailable'}
          detail={camera.errorMessage ?? uploadError}
          onRetry={requestCamera}
          onCancel={handleExit}
          onPhotoSelected={handleUploadedPhoto}
          onUploadError={setUploadError}
        />
      )
      break

    case 'capture':
      body = (
        <CaptureScreen
          videoRef={camera.videoRef}
          cameraStatus={camera.status}
          onCapture={handleCapture}
          onPhotoSelected={handleUploadedPhoto}
          onUploadError={setUploadError}
          onCancel={handleExit}
        />
      )
      break

    case 'review':
      body = (
        <ReviewScreen
          image={capturedImage!}
          warnings={qualityWarnings}
          description={description}
          onDescriptionChange={setDescription}
          onRetake={startOver}
          onAnalyze={() => analyze(capturedImage!)}
        />
      )
      break

    case 'analyzing':
      body = <AnalyzingScreen image={capturedImage!} />
      break

    case 'analyze-error':
      body = (
        <AnalyzeErrorScreen
          message={analyzeError ?? 'Something went wrong. Please try again.'}
          onRetry={() => analyze(capturedImage!)}
          onRetake={startOver}
          onCancel={handleExit}
        />
      )
      break

    case 'result':
      body = (
        <ResultScreen
          analysis={analysis!}
          saveState={saveState}
          saveError={saveError}
          onSave={handleSave}
          onCheckAgain={startOver}
          onBackToDashboard={handleExit}
        />
      )
      break

    default:
      body = null
  }

  return (
    <PostureCheckShell onExit={handleExit}>
      {body}
      {retakeFileInput}
    </PostureCheckShell>
  )
}
