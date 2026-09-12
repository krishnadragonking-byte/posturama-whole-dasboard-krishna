import { useRef } from 'react'
import { Button, Card } from '../../../design-system/ui'
import { readFileAsDataUrl } from '../lib/captureFrame'

interface CameraTroubleScreenProps {
  variant: 'denied' | 'unavailable'
  detail?: string | null
  onRetry: () => void
  onCancel: () => void
  onPhotoSelected: (dataUrl: string) => void
  onUploadError: (message: string) => void
}

export function CameraTroubleScreen({
  variant,
  detail,
  onRetry,
  onCancel,
  onPhotoSelected,
  onUploadError,
}: CameraTroubleScreenProps) {
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

  const title =
    variant === 'denied' ? 'Camera access was denied' : 'Camera unavailable'
  const body =
    variant === 'denied'
      ? 'You can enable camera access in your browser settings, or use another supported posture image option below.'
      : 'We couldn’t start your camera. Another app may be using it, or this device may not have one. You can use another supported posture image option below.'

  return (
    <div className="pchk-grid pchk-grid--split pchk-center">
      <Card className="pchk-stack">
        <p className="pchk-eyebrow">Camera</p>
        <h1 className="pchk-title">{title}</h1>
        <p className="pchk-subtitle">{body}</p>
        {detail ? <p className="pchk-fineprint">Details: {detail}</p> : null}

        <div className="pchk-actions">
          <Button size="lg" onClick={onRetry}>
            Try Again
          </Button>
          <Button size="lg" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Upload a Photo Instead
          </Button>
          <Button size="lg" variant="ghost" onClick={onCancel}>
            Back to Dashboard
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

        {variant === 'denied' ? (
          <ul className="pchk-list">
            <li>Open your browser&rsquo;s site settings for this page.</li>
            <li>Set the Camera permission to &ldquo;Allow&rdquo;, then choose Try Again.</li>
          </ul>
        ) : (
          <ul className="pchk-list">
            <li>Check that no other app is currently using the camera.</li>
            <li>Make sure a camera is connected and enabled.</li>
          </ul>
        )}
      </Card>
    </div>
  )
}
