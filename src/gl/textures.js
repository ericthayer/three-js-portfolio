import * as THREE from 'three'

/**
 * Generates an elegant procedural gradient texture for a project.
 * Returns both the THREE texture and a data URL (used for the seamless
 * case-study hero handoff).
 */
export function createProjectTexture(colorA, colorB, seed = 0) {
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = Math.round(size * 0.75)
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createLinearGradient(0, 0, size, canvas.height)
  gradient.addColorStop(0, colorB)
  gradient.addColorStop(1, colorA)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, canvas.height)

  // Soft radial glow
  const glow = ctx.createRadialGradient(
    size * (0.3 + 0.4 * pseudoRandom(seed)),
    canvas.height * (0.3 + 0.4 * pseudoRandom(seed + 1)),
    0,
    size * 0.5,
    canvas.height * 0.5,
    size * 0.7
  )
  glow.addColorStop(0, hexWithAlpha(colorA, 0.85))
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, size, canvas.height)

  // Fine concentric arcs for texture
  ctx.strokeStyle = 'rgba(244, 241, 236, 0.08)'
  ctx.lineWidth = 1.5
  const cx = size * (0.25 + 0.5 * pseudoRandom(seed + 2))
  const cy = canvas.height * (0.25 + 0.5 * pseudoRandom(seed + 3))
  for (let i = 1; i <= 14; i++) {
    ctx.beginPath()
    ctx.arc(cx, cy, i * (size / 22), 0, Math.PI * 2)
    ctx.stroke()
  }

  // Grain
  const imageData = ctx.getImageData(0, 0, size, canvas.height)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 12
    data[i] += n
    data[i + 1] += n
    data[i + 2] += n
  }
  ctx.putImageData(imageData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  return { texture, dataUrl: canvas.toDataURL('image/jpeg', 0.9) }
}

function pseudoRandom(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

function hexWithAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
