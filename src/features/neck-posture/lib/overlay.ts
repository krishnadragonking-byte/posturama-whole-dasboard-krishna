/**
 * Renders a calm posture overlay onto a canvas that sits above the <video>.
 * The canvas and video share the same CSS mirror transform, so we draw in the
 * video's native (un-mirrored) coordinate space.
 */
import type { PoseFrame } from '../types'

// Head triangle + shoulder line + neck — always drawn.
const EDGES: Array<[keyof PoseFrame, keyof PoseFrame]> = [
  ['leftEye', 'rightEye'],
  ['leftEar', 'leftEye'],
  ['rightEar', 'rightEye'],
  ['leftShoulder', 'rightShoulder'],
]

// Arms + lower body — drawn only when those landmarks are confidently tracked
// (Guided Practice), so a seated desk user still gets a clean neck overlay.
const LIMB_EDGES: Array<[keyof PoseFrame, keyof PoseFrame]> = [
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'],
  ['rightKnee', 'rightAnkle'],
]

export type OverlayTone = 'auto' | 'good' | 'adjust'

function color(confidence: number, tone: OverlayTone): string {
  // Guided Practice forces the colour to reflect the match state; otherwise it
  // tracks tracking confidence. Colour is never the only cue (text always shown).
  if (tone === 'good') return 'rgba(22, 163, 127, 0.98)'
  if (tone === 'adjust') return 'rgba(184, 121, 27, 0.98)'
  return confidence >= 0.55 ? 'rgba(22, 163, 127, 0.95)' : 'rgba(184, 121, 27, 0.95)'
}

export function drawOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  frame: PoseFrame | null,
  confidence: number,
  tone: OverlayTone = 'auto',
): void {
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) return
  if (canvas.width !== w) canvas.width = w
  if (canvas.height !== h) canvas.height = h

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, w, h)
  if (!frame) return

  const px = (p: { x: number; y: number }) => [p.x * w, p.y * h] as const
  const stroke = color(confidence, tone)

  // Edges
  ctx.lineWidth = Math.max(2, w * 0.004)
  ctx.strokeStyle = stroke
  ctx.lineCap = 'round'
  const drawEdge = (a: keyof PoseFrame, b: keyof PoseFrame) => {
    const pa = frame[a] as { x: number; y: number }
    const pb = frame[b] as { x: number; y: number }
    ctx.beginPath()
    ctx.moveTo(...px(pa))
    ctx.lineTo(...px(pb))
    ctx.stroke()
  }
  for (const [a, b] of EDGES) drawEdge(a, b)

  if (frame.lowerConfidence >= 0.4 || (frame.leftWrist.visibility ?? 0) >= 0.4) {
    ctx.globalAlpha = 0.85
    for (const [a, b] of LIMB_EDGES) {
      const va = (frame[a] as { visibility: number }).visibility ?? 0
      const vb = (frame[b] as { visibility: number }).visibility ?? 0
      if (Math.min(va, vb) >= 0.4) drawEdge(a, b)
    }
    ctx.globalAlpha = 1
  }

  // Neck line: nose → shoulder midpoint
  const midShoulder = {
    x: (frame.leftShoulder.x + frame.rightShoulder.x) / 2,
    y: (frame.leftShoulder.y + frame.rightShoulder.y) / 2,
  }
  ctx.setLineDash([w * 0.012, w * 0.012])
  ctx.beginPath()
  ctx.moveTo(...px(frame.nose))
  ctx.lineTo(...px(midShoulder))
  ctx.stroke()
  ctx.setLineDash([])

  // Key points
  const dots: Array<keyof PoseFrame> = [
    'nose',
    'leftEye',
    'rightEye',
    'leftEar',
    'rightEar',
    'leftShoulder',
    'rightShoulder',
  ]
  const r = Math.max(3, w * 0.006)
  ctx.fillStyle = stroke
  for (const key of dots) {
    const p = frame[key] as { x: number; y: number }
    const [cx, cy] = px(p)
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Halo on the shoulder midpoint as the reference anchor
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(1.5, w * 0.002)
  ctx.beginPath()
  ctx.arc(...px(midShoulder), r * 2.4, 0, Math.PI * 2)
  ctx.stroke()
}
