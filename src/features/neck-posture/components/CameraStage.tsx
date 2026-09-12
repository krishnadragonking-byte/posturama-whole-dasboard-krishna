import { Button } from '../../../design-system/ui'
import type { PostureEngine } from '../hooks/usePostureEngine'

interface CameraStageProps {
  engine: PostureEngine
  onStop: () => void
  /** Optional extra scrim (e.g. calibration countdown) rendered above the video. */
  children?: React.ReactNode
  /** Suppress the built-in "no person / low confidence" scrims (challenge screen shows its own). */
  quietScrims?: boolean
  /** Translucent "follow-along" demonstrator drawn behind the landmark overlay. */
  demo?: React.ReactNode
  /** Coloured frame around the stage — used by Guided Practice for match feedback. */
  frameTone?: 'good' | 'adjust'
}

/**
 * The mirrored webcam preview with landmark overlay and graceful state scrims.
 * The <video> MediaStream lives in useCamera; this component only displays it.
 */
export function CameraStage({
  engine,
  onStop,
  children,
  quietScrims,
  demo,
  frameTone,
}: CameraStageProps) {
  const {
    cameraStatus,
    modelStatus,
    personPresent,
    confidence,
    videoRef,
    canvasRef,
    errorMessage,
    running,
  } = engine

  const loading =
    cameraStatus === 'requesting' ||
    cameraStatus === 'idle' ||
    (cameraStatus === 'ready' && modelStatus === 'loading')

  const modelError = modelStatus === 'error'
  const lowConfidence =
    !quietScrims && running && personPresent && confidence > 0 && confidence < 0.55
  const noPerson = !quietScrims && running && !personPresent

  const badge = running
    ? personPresent
      ? confidence >= 0.55
        ? 'Live · tracking'
        : 'Live · low confidence'
      : 'Live · no person'
    : 'Camera off'

  return (
    <div className={`np-stage${frameTone ? ` np-stage--${frameTone}` : ''}`}>
      <video
        ref={videoRef}
        className="np-stage__video"
        playsInline
        muted
        autoPlay
        aria-label="Webcam preview, mirrored like a selfie camera"
      />
      {demo && running ? (
        <div
          className={`np-stage__demo${personPresent ? '' : ' is-dim'}`}
          aria-hidden="true"
        >
          {demo}
        </div>
      ) : null}

      <canvas ref={canvasRef} className="np-stage__overlay" aria-hidden="true" />

      {running && personPresent && <div className="np-stage__frame" aria-hidden="true" />}

      <span className="np-stage__badge">
        <span className="pt-pill__dot" aria-hidden="true" />
        {badge}
      </span>

      {children}

      {loading && (
        <div className="np-stage__scrim" role="status">
          <div>
            <div className="np-spinner" aria-hidden="true" />
            <h3>{cameraStatus === 'ready' ? 'Loading posture model…' : 'Starting camera…'}</h3>
            <p>This runs entirely on your device. It only takes a moment.</p>
          </div>
        </div>
      )}

      {modelError && (
        <div className="np-stage__scrim" role="alert">
          <div>
            <h3>Posture model unavailable</h3>
            <p>{errorMessage ?? 'Run “npm run setup” and reload the page.'}</p>
          </div>
        </div>
      )}

      {noPerson && (
        <div className="np-stage__scrim" role="status">
          <div>
            <h3>No person detected</h3>
            <p>Sit comfortably in view of the camera so Posturama can provide guidance.</p>
          </div>
        </div>
      )}

      {lowConfidence && !noPerson && (
        <div className="np-stage__scrim" role="status">
          <div>
            <h3>Low confidence</h3>
            <p>Add a little more light or adjust your camera so your head and shoulders are clearly visible.</p>
          </div>
        </div>
      )}

      {running && (
        <div className="np-stage__stopbtn">
          <Button variant="danger" onClick={onStop} aria-label="Stop the camera and end this session">
            Stop Camera
          </Button>
        </div>
      )}
    </div>
  )
}
