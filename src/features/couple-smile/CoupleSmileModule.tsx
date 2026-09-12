import { useCallback, useState } from 'react'
import type { ChallengeDuration, CoupleScreen } from './types'
import { TIMING } from './constants'
import { useCoupleSmileEngine } from './hooks/useCoupleSmileEngine'
import { CoupleSmileShell } from './components/CoupleSmileShell'
import { IntroScreen } from './components/IntroScreen'
import { PermissionScreen } from './components/PermissionScreen'
import { CameraProblemScreen } from './components/CameraProblemScreen'
import { SetupScreen } from './components/SetupScreen'
import { ChallengeScreen } from './components/ChallengeScreen'
import { CompletionScreen } from './components/CompletionScreen'

const CAMERA_SCREENS: CoupleScreen[] = ['permission', 'setup', 'challenge']

/**
 * Top-level state machine for Couple Smile:
 *
 *   intro -> permission -> setup -> challenge -> complete
 *        with a recoverable "camera problem" branch at any camera step
 *
 * `cameraSession` is the single source of truth for whether the webcam
 * should be live, mirroring the neck-posture module's approach.
 */
export function CoupleSmileModule({ onExit }: { onExit?: () => void } = {}) {
  const [screen, setScreen] = useState<CoupleScreen>('intro')
  const [cameraSession, setCameraSession] = useState(false)
  const [duration, setDuration] = useState<ChallengeDuration>(TIMING.defaultDuration)

  const wantCamera = cameraSession && CAMERA_SCREENS.includes(screen)
  const engine = useCoupleSmileEngine(wantCamera)

  const cameraProblem =
    cameraSession && (engine.cameraStatus === 'denied' || engine.cameraStatus === 'error')

  const backToIntro = useCallback(() => {
    engine.stop()
    setCameraSession(false)
    setScreen('intro')
  }, [engine])

  const goHome = useCallback(() => {
    engine.stop()
    setCameraSession(false)
    onExit?.()
  }, [engine, onExit])

  const startCamera = useCallback(() => {
    setCameraSession(true)
    setScreen('setup')
  }, [])

  // Stable reference: ChallengeScreen schedules a 900ms timeout off this in
  // an effect keyed on it. An inline arrow here would be a new function every
  // render (this component re-renders on every detection frame), cancelling
  // and rescheduling that timeout before it ever gets a chance to fire.
  const goToComplete = useCallback(() => setScreen('complete'), [])

  let body: React.ReactNode

  if (cameraProblem) {
    body = (
      <CameraProblemScreen
        reason={engine.cameraStatus}
        detail={engine.errorMessage}
        onRetry={() => engine.retry()}
        onBack={backToIntro}
      />
    )
  } else {
    switch (screen) {
      case 'intro':
        body = <IntroScreen onStart={() => setScreen('permission')} />
        break
      case 'permission':
        body = (
          <PermissionScreen
            requesting={cameraSession && engine.cameraStatus === 'requesting'}
            onAllow={startCamera}
            onBack={() => setScreen('intro')}
          />
        )
        break
      case 'setup':
        body = (
          <SetupScreen
            engine={engine}
            duration={duration}
            onDurationChange={setDuration}
            onStartChallenge={() => setScreen('challenge')}
            onStop={backToIntro}
          />
        )
        break
      case 'challenge':
        body = (
          <ChallengeScreen
            engine={engine}
            duration={duration}
            onComplete={goToComplete}
            onStop={backToIntro}
          />
        )
        break
      case 'complete':
        body = (
          <CompletionScreen
            duration={duration}
            onPlayAgain={() => setScreen('setup')}
            onBackHome={goHome}
          />
        )
        break
    }
  }

  return <CoupleSmileShell onExit={goHome}>{body}</CoupleSmileShell>
}
