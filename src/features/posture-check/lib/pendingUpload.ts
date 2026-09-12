/**
 * A tiny hand-off slot for "Upload a Photo" from the Dashboard: the app's
 * routing is just a hash string with no way to carry a data URL along, so
 * DashboardPage stashes the read file here right before navigating to
 * `#posture-check`, and PostureCheckModule consumes it once on mount to skip
 * straight to the review screen instead of showing the camera consent
 * screen. Read-once by design (takePendingUploadImage clears it) so a later
 * unrelated visit to the module never accidentally reuses a stale photo.
 */
let pendingImage: string | null = null

export function setPendingUploadImage(dataUrl: string): void {
  pendingImage = dataUrl
}

export function takePendingUploadImage(): string | null {
  const image = pendingImage
  pendingImage = null
  return image
}
