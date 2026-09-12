import type { ReactNode } from 'react'
import type { CoupleSmileEngine } from '../hooks/useCoupleSmileEngine'

interface CameraStageProps {
  engine: CoupleSmileEngine
  /** Extra content drawn above the video (both-smiling banner, etc). */
  children?: ReactNode
}

/**
 * The mirrored webcam preview with the face-detection overlay and graceful
 * state scrims. The <video> MediaStream lives in useCamera; this component
 * only displays it.
 */
export function CameraStage({ engine, children }: CameraStageProps) {
  const { cameraStatus, modelStatus, bindVideo, canvasRef, errorMessage, running, tooManyFaces } = engine

  const loading =
    cameraStatus === 'requesting' ||
    cameraStatus === 'idle' ||
    (cameraStatus === 'ready' && modelStatus === 'loading')
  const modelError = modelStatus === 'error'

  const badge = running ? (tooManyFaces ? 'Live · too many people' : 'Live · watching') : 'Camera off'

  return (
    <div className="cs-stage">
      <video
        ref={bindVideo}
        className="cs-stage__video"
        playsInline
        muted
        autoPlay
        aria-label="Webcam preview, mirrored like a selfie camera"
      />
      <canvas ref={canvasRef} className="cs-stage__overlay" aria-hidden="true" />

      <span className="cs-stage__badge">
        <span className="pt-pill__dot" aria-hidden="true" />
        {badge}
      </span>

      {children}

      {loading && (
        <div className="cs-stage__scrim" role="status">
          <div>
            <div className="cs-spinner" aria-hidden="true" />
            <h3>{cameraStatus === 'ready' ? 'Loading face model…' : 'Starting camera…'}</h3>
            <p>This runs entirely on your device. It only takes a moment.</p>
          </div>
        </div>
      )}

      {modelError && (
        <div className="cs-stage__scrim" role="alert">
          <div>
            <h3>Face model unavailable</h3>
            <p>{errorMessage ?? 'Run "npm run setup" and reload the page.'}</p>
          </div>
        </div>
      )}

      {running && tooManyFaces && (
        <div className="cs-stage__scrim" role="status">
          <div>
            <h3>We found more than two people.</h3>
            <p>Please have only two participants in the frame.</p>
          </div>
        </div>
      )}
    </div>
  )
}
