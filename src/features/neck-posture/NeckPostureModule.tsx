import { useCallback, useState } from 'react'
import type { CalibrationBaseline, Screen } from './types'
import { usePostureEngine } from './hooks/usePostureEngine'
import { ModuleShell } from './components/ModuleShell'
import { PermissionScreen } from './components/PermissionScreen'
import { PermissionDeniedScreen } from './components/PermissionDeniedScreen'
import { NoCameraFallback } from './components/NoCameraFallback'
import { CalibrationScreen } from './components/CalibrationScreen'
import { LiveGuidance } from './components/LiveGuidance'
import { GuidedPracticeScreen } from './components/GuidedPracticeScreen'
import { ChallengeScreen } from './components/ChallengeScreen'
import { CompletionScreen } from './components/CompletionScreen'

const CAMERA_SCREENS: Screen[] = ['calibration', 'live', 'guided', 'challenge']

/**
 * Top-level state machine for the neck-posture module:
 *
 *   permission -> calibration -> live -> challenge -> complete
 *        with no-camera (fallback) and denied (recoverable) branches
 *
 * `cameraSession` is the single source of truth for whether the webcam should
 * be live; the engine starts/stops the MediaStream from it, and every "Stop
 * Camera" path clears it.
 */
export function NeckPostureModule({
  devStart,
  onExit,
}: {
  devStart?: Screen
  /** Optional "← Back to Home" handler, wired up when the app has a home screen. */
  onExit?: () => void
} = {}) {
  const [screen, setScreen] = useState<Screen>(devStart ?? 'permission')
  const [cameraSession, setCameraSession] = useState(
    !!devStart && CAMERA_SCREENS.includes(devStart),
  )
  const [baseline, setBaseline] = useState<CalibrationBaseline | null>(null)

  const wantCamera = cameraSession && CAMERA_SCREENS.includes(screen)
  const engine = usePostureEngine(wantCamera)

  const denied = cameraSession && (engine.cameraStatus === 'denied' || engine.cameraStatus === 'error')

  const endSession = useCallback(() => {
    engine.stop()
    setCameraSession(false)
    setBaseline(null)
    setScreen('permission')
  }, [engine])

  const startCamera = useCallback(() => {
    setBaseline(null)
    setCameraSession(true)
    setScreen('calibration')
  }, [])

  const continueWithout = useCallback(() => {
    engine.stop()
    setCameraSession(false)
    setScreen('no-camera')
  }, [engine])

  // If the camera is lost mid-session (unplugged, taken by another app) the
  // `denied` flag below gates the render to the recoverable screen, so we never
  // show a broken camera view.

  let body: React.ReactNode

  if (denied) {
    body = (
      <PermissionDeniedScreen
        detail={engine.errorMessage}
        onRetry={() => {
          setScreen('calibration')
          engine.retry()
        }}
        onContinueWithout={continueWithout}
      />
    )
  } else {
    switch (screen) {
      case 'permission':
        body = (
          <PermissionScreen
            requesting={cameraSession && engine.cameraStatus === 'requesting'}
            onAllow={startCamera}
            onContinueWithout={continueWithout}
          />
        )
        break
      case 'no-camera':
        body = <NoCameraFallback onTryCamera={startCamera} />
        break
      case 'calibration':
        body = (
          <CalibrationScreen
            engine={engine}
            onStop={endSession}
            onComplete={(b) => {
              setBaseline(b)
              setScreen('live')
            }}
          />
        )
        break
      case 'live':
        body = (
          <LiveGuidance
            engine={engine}
            baseline={baseline}
            onStartGuided={() => setScreen('guided')}
            onStartChallenge={() => setScreen('challenge')}
            onRecalibrate={() => setScreen('calibration')}
            onStop={endSession}
          />
        )
        break
      case 'guided':
        body = (
          <GuidedPracticeScreen
            engine={engine}
            onComplete={() => setScreen('complete')}
            onStop={endSession}
          />
        )
        break
      case 'challenge':
        body = (
          <ChallengeScreen
            engine={engine}
            baseline={baseline}
            onComplete={() => setScreen('complete')}
            onStop={endSession}
          />
        )
        break
      case 'complete':
        body = (
          <CompletionScreen
            cameraActive={cameraSession}
            onRestart={() => setScreen('challenge')}
            onBackToGuidance={() => setScreen('live')}
            onStop={endSession}
          />
        )
        break
    }
  }

  return (
    <ModuleShell screen={screen} showStepper={!denied} onExit={onExit}>
      {body}
    </ModuleShell>
  )
}
