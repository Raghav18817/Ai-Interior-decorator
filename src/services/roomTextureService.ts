import * as THREE from 'three'

/**
 * Generates an in-memory procedural canvas texture for realistic hardwood flooring.
 */
export function createWoodFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas)
    return fallback
  }

  // Base warm wood tone
  ctx.fillStyle = '#b49774'
  ctx.fillRect(0, 0, 1024, 1024)

  // Plank lines & grain
  const plankHeight = 64
  const plankCount = 1024 / plankHeight

  for (let i = 0; i < plankCount; i++) {
    const y = i * plankHeight

    // Individual plank tint variation
    const variation = (Math.sin(i * 1.7) * 15 + Math.cos(i * 3.1) * 10) | 0
    ctx.fillStyle = `rgba(${180 + variation}, ${145 + variation}, ${110 + variation}, 0.35)`
    ctx.fillRect(0, y, 1024, plankHeight)

    // Wood grain horizontal streaks
    for (let g = 0; g < 12; g++) {
      const gy = y + Math.random() * plankHeight
      ctx.fillStyle = 'rgba(100, 70, 45, 0.08)'
      ctx.fillRect(0, gy, 1024, 1.5)
    }

    // Horizontal seam gap between planks
    ctx.fillStyle = '#5c4033'
    ctx.fillRect(0, y + plankHeight - 2, 1024, 2)

    // Vertical plank end joints staggered
    const stagger = (i % 3) * 340
    for (let x = stagger; x < 1024; x += 340) {
      ctx.fillStyle = '#5c4033'
      ctx.fillRect(x, y, 2, plankHeight)
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  return texture
}

/**
 * Generates an in-memory procedural wall texture with subtle plaster matte grain.
 */
export function createWallTexture(baseColorHex: string = '#f1f5f9'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return new THREE.CanvasTexture(canvas)
  }

  ctx.fillStyle = baseColorHex
  ctx.fillRect(0, 0, 512, 512)

  // Subtle stipple noise
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    const opacity = Math.random() * 0.05
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`
    ctx.fillRect(x, y, 2, 2)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 1)
  return texture
}

/**
 * Generates a realistic outdoor horizon panorama for windows.
 */
export function createOutdoorBackdropTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  if (!ctx) return new THREE.CanvasTexture(canvas)

  // Sky gradient (daylight horizon)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 300)
  skyGrad.addColorStop(0, '#38bdf8')
  skyGrad.addColorStop(0.6, '#bae6fd')
  skyGrad.addColorStop(1, '#fef08a')
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, 1024, 300)

  // Green garden / distant trees & city line
  ctx.fillStyle = '#15803d'
  ctx.beginPath()
  ctx.moveTo(0, 320)
  for (let x = 0; x <= 1024; x += 40) {
    const y = 300 + Math.sin(x * 0.02) * 15
    ctx.lineTo(x, y)
  }
  ctx.lineTo(1024, 512)
  ctx.lineTo(0, 512)
  ctx.closePath()
  ctx.fill()

  const texture = new THREE.CanvasTexture(canvas)
  return texture
}
