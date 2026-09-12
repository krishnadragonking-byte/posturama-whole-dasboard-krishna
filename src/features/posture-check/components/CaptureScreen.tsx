import { useRef, type RefObject } from 'react'
import { Button, Card } from '../../../design-system/ui'
import { readFileAsDataUrl } from '../lib/captureFrame'
import type { CameraStatus } from '../types'

const INSTRUCTIONS = [
  'Stand or sit where your full upper body is visible.',
  'Keep your body relaxed, as you normally would.',
  'Face the camera naturally.',
]

export function CaptureScreen({
  videoRef,
  cameraStatus,
  onCapture,
  onPhotoSelected,
  onUploadError,
  onCancel,
}: {
  videoRef: RefObject<HTMLVideoElement | null>
  cameraStatus: CameraStatus
  onCapture: () => void
  /** "Upload a Photo Instead" — an additional option alongside the camera, not a replacement for it. */
  onPhotoSelected: (dataUrl: string) => void
  onUploadError: (message: string) => void
  onCancel: () => void
}) {
  const loading = cameraStatus === 'requesting' || cameraStatus === 'idle'
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      onUploadError('Please choose an image file.')
      return
    }
    try {
      onPhotoSelected(await readFileAsDataUrl(file))
    } catch {
      onUploadError('Could not read that photo. Please try another one.')
    }
  }

  return (
    <div className="pchk-grid pchk-grid--split">
      <div>
        <div className="pchk-stage">
          <video
            ref={videoRef}
            className="pchk-stage__video"
            playsInline
            muted
            autoPlay
            aria-label="Camera preview, mirrored like a selfie camera"
          />
          {loading ? (
            <div className="pchk-stage__scrim" role="status">
              <div>
                <div className="pchk-spinner" aria-hidden="true" />
                <h3>Starting camera…</h3>
                <p>This only takes a moment.</p>
              </div>
            </div>
          ) : null}
        </div>
        <div className="pchk-actions" style={{ marginTop: '1rem' }}>
          <Button size="lg" onClick={onCapture} disabled={loading}>
            Capture
          </Button>
          <Button size="lg" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Upload a Photo Instead
          </Button>
          <Button size="lg" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        <div className="pchk-upload-fallback">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      </div>

      <Card className="pchk-stack">
        <p className="pchk-eyebrow">Positioning tips</p>
        <ul className="pchk-list">
          {INSTRUCTIONS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        <p className="pchk-fineprint">
          No particular distance or angle is required for a useful result — Posturama gives general,
          educational observations based on what&rsquo;s visible in the photo.
        </p>
      </Card>
    </div>
  )
}
