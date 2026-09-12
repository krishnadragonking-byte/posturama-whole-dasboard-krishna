/**
 * Draws a simple rounded frame around each detected face onto a canvas that
 * sits above the mirrored <video>. Colour reflects that face's smiling state
 * (never the only cue — each person panel also shows a text status).
 */
export interface OverlayFace {
  /** Normalised (0..1) landmark points for one face; only x/y are used. */
  points: Array<{ x: number; y: number }>
  smiling: boolean
  label: string
}

export function drawFaceOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  faces: OverlayFace[],
): void {
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) return
  if (canvas.width !== w) canvas.width = w
  if (canvas.height !== h) canvas.height = h

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, w, h)

  for (const face of faces) {
    let minX = 1
    let minY = 1
    let maxX = 0
    let maxY = 0
    for (const p of face.points) {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    }
    const padX = (maxX - minX) * 0.18
    const padY = (maxY - minY) * 0.22
    minX = Math.max(0, minX - padX)
    maxX = Math.min(1, maxX + padX)
    minY = Math.max(0, minY - padY)
    maxY = Math.min(1, maxY + padY)

    const x = minX * w
    const y = minY * h
    const bw = (maxX - minX) * w
    const bh = (maxY - minY) * h
    const color = face.smiling ? 'rgba(22, 163, 127, 0.95)' : 'rgba(184, 121, 27, 0.9)'
    const r = Math.min(bw, bh) * 0.16

    ctx.beginPath()
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, bw, bh, r)
    } else {
      ctx.rect(x, y, bw, bh)
    }
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(2.5, w * 0.005)
    ctx.stroke()

    // Label above the box. The canvas is CSS-mirrored (scaleX(-1)) to match
    // the selfie-view video, so text is drawn inside a counter-mirror to
    // read the right way round.
    ctx.save()
    ctx.translate(x + bw / 2, Math.max(16, y - 10))
    ctx.scale(-1, 1)
    ctx.fillStyle = color
    ctx.font = `700 ${Math.max(14, w * 0.018)}px -apple-system, BlinkMacSystemFont, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(face.label, 0, 0)
    ctx.restore()
  }
}
