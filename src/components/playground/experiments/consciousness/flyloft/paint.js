/**
 * fly.loft() — the scene shop and the view from a seat.
 *
 * Each cloth is painted once into its own canvas at a fixed number of pixels
 * per metre. The view from a seat is a true perspective projection: every
 * piece hangs in a plane square to the audience, so a piece at depth x is
 * that painting scaled by focal / (x - eye.x), placed about the eye line.
 * Only the proscenium opening lets anything through, so the stage is drawn
 * clipped to it and the house wall is laid over the top.
 */

import { PIPE } from './sightlines.js'

const PX = 64 // pixels per metre on a cloth

function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const mk = (w, h) => {
  const c = document.createElement('canvas')
  c.width = Math.max(2, Math.round(w))
  c.height = Math.max(2, Math.round(h))
  return c
}

// gouache grain: uneven wash plus brush flecks
function grain(g, w, h, rand, amount = 0.08, tone = '0,0,0') {
  for (let i = 0; i < (w * h) / 900; i++) {
    const x = rand() * w
    const y = rand() * h
    const r = 1 + rand() * 7
    g.fillStyle = `rgba(${tone},${(rand() * amount).toFixed(3)})`
    g.beginPath()
    g.ellipse(x, y, r * (1 + rand() * 2), r * 0.5, rand() * Math.PI, 0, Math.PI * 2)
    g.fill()
  }
}

function hemAndBattenPocket(g, w, h) {
  g.fillStyle = 'rgba(0,0,0,0.22)'
  g.fillRect(0, 0, w, 6)
  g.fillRect(0, h - 4, w, 4)
  g.strokeStyle = 'rgba(255,240,210,0.035)'
  for (let x = 48; x < w; x += 96) {
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x, h)
    g.stroke()
  }
}

function paintVelvet(w, h) {
  const c = mk(w, h)
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#0a0708')
  grad.addColorStop(1, '#16100f')
  g.fillStyle = grad
  g.fillRect(0, 0, w, h)
  // folds
  for (let x = 0; x < w; x += 22) {
    const f = g.createLinearGradient(x, 0, x + 22, 0)
    f.addColorStop(0, 'rgba(255,255,255,0.0)')
    f.addColorStop(0.5, 'rgba(255,230,220,0.035)')
    f.addColorStop(1, 'rgba(0,0,0,0.12)')
    g.fillStyle = f
    g.fillRect(x, 0, 22, h)
  }
  // the hem catches the front-of-house light, so each border reads as its own plane
  const hem = g.createLinearGradient(0, h - 26, 0, h)
  hem.addColorStop(0, 'rgba(120,70,60,0)')
  hem.addColorStop(1, 'rgba(150,95,80,0.42)')
  g.fillStyle = hem
  g.fillRect(0, h - 26, w, 26)
  g.fillStyle = 'rgba(110,60,55,0.35)'
  for (let x = 0; x < w; x += 22) {
    g.beginPath()
    g.arc(x + 11, h - 2, 11, 0, Math.PI)
    g.fill()
  }
  return c
}

// the house teaser: the first border, red velvet swagged with a gold fringe
function paintTeaser(w, h) {
  const c = mk(w, h)
  const g = c.getContext('2d')
  const grd = g.createLinearGradient(0, 0, w, 0)
  for (let i = 0; i <= 30; i++) grd.addColorStop(i / 30, i % 2 ? '#4a0c12' : '#7a1720')
  g.fillStyle = grd
  g.fillRect(0, 0, w, h)
  const shade = g.createLinearGradient(0, 0, 0, h)
  shade.addColorStop(0, 'rgba(0,0,0,0.55)')
  shade.addColorStop(0.7, 'rgba(0,0,0,0.05)')
  shade.addColorStop(1, 'rgba(255,200,150,0.12)')
  g.fillStyle = shade
  g.fillRect(0, 0, w, h)
  // swags
  const n = 7
  g.fillStyle = 'rgba(30,4,8,0.35)'
  for (let i = 0; i < n; i++) {
    const x0 = (w * i) / n
    const x1 = (w * (i + 1)) / n
    g.beginPath()
    g.moveTo(x0, h * 0.35)
    g.quadraticCurveTo((x0 + x1) / 2, h * 0.95, x1, h * 0.35)
    g.lineTo(x1, h * 0.42)
    g.quadraticCurveTo((x0 + x1) / 2, h * 1.02, x0, h * 0.42)
    g.closePath()
    g.fill()
  }
  // gold fringe along the hem
  g.fillStyle = '#b48a3a'
  g.fillRect(0, h - 14, w, 4)
  g.strokeStyle = 'rgba(214,170,80,0.85)'
  g.lineWidth = 2
  for (let x = 2; x < w; x += 5) {
    g.beginPath()
    g.moveTo(x, h - 10)
    g.lineTo(x + 1, h - 1)
    g.stroke()
  }
  return c
}

function paintPalace(w, h, rand) {
  const c = mk(w, h)
  const g = c.getContext('2d')
  const sky = g.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#16163d')
  sky.addColorStop(0.55, '#3b2b5c')
  sky.addColorStop(0.8, '#8a4a52')
  sky.addColorStop(1, '#3a1f2b')
  g.fillStyle = sky
  g.fillRect(0, 0, w, h)
  // stars, sparse
  for (let i = 0; i < 160; i++) {
    g.fillStyle = `rgba(255,240,215,${0.25 + rand() * 0.6})`
    g.fillRect(rand() * w, rand() * h * 0.55, 2, 2)
  }
  // far domes
  const base = h * 0.98
  const roofline = (fill, top, seed, domes) => {
    const r = rng(seed)
    g.fillStyle = fill
    g.beginPath()
    g.moveTo(0, base)
    let x = 0
    while (x < w) {
      const bw = 40 + r() * 110
      const bh = top + r() * h * 0.22
      g.lineTo(x, base - bh)
      if (domes && r() < 0.5) {
        g.lineTo(x + bw * 0.15, base - bh)
        g.quadraticCurveTo(x + bw * 0.5, base - bh - bw * 0.9, x + bw * 0.85, base - bh)
        // a finial
        g.lineTo(x + bw * 0.85, base - bh)
      } else if (r() < 0.5) {
        g.lineTo(x + bw * 0.5, base - bh - bw * 0.45)
      }
      g.lineTo(x + bw, base - bh)
      x += bw
    }
    g.lineTo(w, base)
    g.closePath()
    g.fill()
  }
  roofline('#5b3550', h * 0.25, 11, true)
  roofline('#7c3a3f', h * 0.14, 12, true)
  roofline('#2b1520', h * 0.05, 13, false)
  // lit windows on the near roofs
  for (let i = 0; i < 90; i++) {
    const x = rand() * w
    const y = h * 0.78 + rand() * h * 0.16
    g.fillStyle = rand() < 0.75 ? 'rgba(255,196,96,0.85)' : 'rgba(255,120,80,0.7)'
    g.fillRect(x, y, 5, 8)
  }
  // chimneys with gold leaf edges
  g.strokeStyle = 'rgba(214,170,80,0.55)'
  g.lineWidth = 2
  for (let i = 0; i < 26; i++) {
    const x = rand() * w
    const y = h * 0.74 + rand() * h * 0.1
    g.fillStyle = '#24121a'
    g.fillRect(x, y, 10, 26)
    g.strokeRect(x, y, 10, 26)
  }
  grain(g, w, h, rand, 0.12)
  hemAndBattenPocket(g, w, h)
  return c
}

function paintSea(w, h, rand) {
  const c = mk(w, h)
  const g = c.getContext('2d')
  const sky = g.createLinearGradient(0, 0, 0, h * 0.62)
  sky.addColorStop(0, '#0d1b33')
  sky.addColorStop(1, '#3d5f77')
  g.fillStyle = sky
  g.fillRect(0, 0, w, h * 0.62)
  const sea = g.createLinearGradient(0, h * 0.62, 0, h)
  sea.addColorStop(0, '#1d4e57')
  sea.addColorStop(1, '#0a2229')
  g.fillStyle = sea
  g.fillRect(0, h * 0.62, w, h * 0.38)
  // painted wave strokes, larger near the floor
  for (let row = 0; row < 26; row++) {
    const t = row / 25
    const y = h * 0.63 + t * t * h * 0.36
    const amp = 3 + t * 16
    g.strokeStyle = `rgba(${170 + row * 2},${220 - row},${210 - row * 2},${0.18 + t * 0.35})`
    g.lineWidth = 1.5 + t * 3
    g.beginPath()
    for (let x = -20; x < w + 20; x += 8) {
      const yy = y + Math.sin(x * (0.03 - t * 0.02) + row * 1.7) * amp * 0.4 + (rand() - 0.5) * 1.5
      if (x === -20) g.moveTo(x, yy)
      else g.lineTo(x, yy)
    }
    g.stroke()
  }
  // a horizon glint and clouds
  g.fillStyle = 'rgba(240,230,200,0.2)'
  g.fillRect(0, h * 0.618, w, 3)
  for (let i = 0; i < 14; i++) {
    const x = rand() * w
    const y = h * (0.1 + rand() * 0.35)
    g.fillStyle = `rgba(160,180,200,${0.06 + rand() * 0.08})`
    g.beginPath()
    g.ellipse(x, y, 60 + rand() * 120, 10 + rand() * 12, 0, 0, Math.PI * 2)
    g.fill()
  }
  grain(g, w, h, rand, 0.1)
  hemAndBattenPocket(g, w, h)
  return c
}

function paintNight(w, h, rand) {
  const c = mk(w, h)
  const g = c.getContext('2d')
  const sky = g.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#05050d')
  sky.addColorStop(1, '#1a1631')
  g.fillStyle = sky
  g.fillRect(0, 0, w, h)
  for (let i = 0; i < 520; i++) {
    const r = rand()
    g.fillStyle = `rgba(255,${230 + rand() * 25},${200 + rand() * 55},${0.2 + r * 0.8})`
    const s = r > 0.97 ? 4 : r > 0.85 ? 2.5 : 1.5
    g.fillRect(rand() * w, rand() * h * 0.9, s, s)
  }
  // a pale ring where the moon used to be
  g.strokeStyle = 'rgba(240,230,200,0.13)'
  g.lineWidth = 6
  g.beginPath()
  g.arc(w * 0.66, h * 0.32, 60, 0, Math.PI * 2)
  g.stroke()
  grain(g, w, h, rand, 0.12, '60,50,110')
  hemAndBattenPocket(g, w, h)
  return c
}

function paintLamps(w, h, rand) {
  const c = mk(w, h)
  const g = c.getContext('2d')
  const sky = g.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#1b1022')
  sky.addColorStop(0.6, '#4a2533')
  sky.addColorStop(1, '#170b10')
  g.fillStyle = sky
  g.fillRect(0, 0, w, h)
  // terrace fronts receding
  for (let i = 0; i < 9; i++) {
    const x = i * (w / 9)
    const top = h * (0.25 + rand() * 0.15)
    g.fillStyle = i % 2 ? '#3a1d27' : '#44222c'
    g.fillRect(x, top, w / 9 + 1, h - top)
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 2; k++) {
        g.fillStyle = rand() < 0.4 ? 'rgba(255,190,90,0.75)' : 'rgba(20,10,15,0.85)'
        g.fillRect(x + 18 + k * 44, top + 26 + r * 70, 22, 38)
      }
    }
  }
  // the lamps, each a cat with its eyes shut
  for (let i = 0; i < 6; i++) {
    const x = (i + 0.5) * (w / 6)
    g.strokeStyle = '#120a0c'
    g.lineWidth = 6
    g.beginPath()
    g.moveTo(x, h)
    g.lineTo(x, h * 0.45)
    g.stroke()
    const gl = g.createRadialGradient(x, h * 0.42, 4, x, h * 0.42, 90)
    gl.addColorStop(0, 'rgba(255,214,130,0.55)')
    gl.addColorStop(1, 'rgba(255,214,130,0)')
    g.fillStyle = gl
    g.fillRect(x - 90, h * 0.42 - 90, 180, 180)
    g.fillStyle = '#120a0c'
    g.beginPath()
    g.moveTo(x - 20, h * 0.44)
    g.lineTo(x - 22, h * 0.38)
    g.lineTo(x - 10, h * 0.405)
    g.lineTo(x + 10, h * 0.405)
    g.lineTo(x + 22, h * 0.38)
    g.lineTo(x + 20, h * 0.44)
    g.closePath()
    g.fill()
    g.strokeStyle = 'rgba(255,214,130,0.9)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(x - 12, h * 0.425)
    g.lineTo(x - 5, h * 0.427)
    g.moveTo(x + 5, h * 0.427)
    g.lineTo(x + 12, h * 0.425)
    g.stroke()
  }
  // one is awake
  const ax = 3.5 * (w / 6)
  g.fillStyle = '#ffd36a'
  g.beginPath()
  g.ellipse(ax - 8, h * 0.426, 4, 3, 0, 0, Math.PI * 2)
  g.ellipse(ax + 8, h * 0.426, 4, 3, 0, 0, Math.PI * 2)
  g.fill()
  // cobbles
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(255,220,180,${rand() * 0.06})`
    g.beginPath()
    g.ellipse(rand() * w, h * 0.9 + rand() * h * 0.1, 8, 3, 0, 0, Math.PI * 2)
    g.fill()
  }
  grain(g, w, h, rand, 0.1)
  hemAndBattenPocket(g, w, h)
  return c
}

function paintWaves(w, h, rand) {
  const c = mk(w, h)
  const g = c.getContext('2d')
  // a cut ground row: three crests of plywood waves, painted, with a ragged top
  g.fillStyle = '#123a45'
  g.beginPath()
  g.moveTo(0, h)
  for (let x = 0; x <= w; x += 6) {
    const y = h * 0.2 + Math.sin(x * 0.018) * h * 0.14 + Math.sin(x * 0.051 + 1) * h * 0.06
    g.lineTo(x, y)
  }
  g.lineTo(w, h)
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(220,240,230,0.7)'
  g.lineWidth = 4
  g.beginPath()
  for (let x = 0; x <= w; x += 6) {
    const y = h * 0.2 + Math.sin(x * 0.018) * h * 0.14 + Math.sin(x * 0.051 + 1) * h * 0.06
    if (x === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.stroke()
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(180,225,215,${0.15 + rand() * 0.3})`
    g.lineWidth = 2
    const x = rand() * w
    const y = h * (0.45 + rand() * 0.45)
    g.beginPath()
    g.arc(x, y, 10 + rand() * 18, Math.PI * 1.1, Math.PI * 1.9)
    g.stroke()
  }
  return c
}

function paintMoon(w, h, rand) {
  const c = mk(w, h)
  const g = c.getContext('2d')
  const r = Math.min(w, h) / 2 - 3
  const gl = g.createRadialGradient(w * 0.42, h * 0.4, r * 0.1, w / 2, h / 2, r)
  gl.addColorStop(0, '#fff8e4')
  gl.addColorStop(0.75, '#efe0b8')
  gl.addColorStop(1, '#c9b48a')
  g.fillStyle = gl
  g.beginPath()
  g.arc(w / 2, h / 2, r, 0, Math.PI * 2)
  g.fill()
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2
    const d = rand() * r * 0.7
    g.fillStyle = `rgba(150,128,90,${0.12 + rand() * 0.2})`
    g.beginPath()
    g.arc(w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d, 4 + rand() * r * 0.16, 0, Math.PI * 2)
    g.fill()
  }
  // the edge of the plywood
  g.strokeStyle = 'rgba(90,70,40,0.6)'
  g.lineWidth = 3
  g.beginPath()
  g.arc(w / 2, h / 2, r, 0, Math.PI * 2)
  g.stroke()
  return c
}

function paintCat(w, h) {
  const c = mk(w, h)
  const g = c.getContext('2d')
  // the void cat as a flat cut-out: sitting, enormous, ears up
  g.fillStyle = '#060507'
  g.beginPath()
  g.moveTo(w * 0.18, h)
  g.bezierCurveTo(w * 0.05, h * 0.62, w * 0.2, h * 0.4, w * 0.33, h * 0.38)
  g.lineTo(w * 0.3, h * 0.08)
  g.lineTo(w * 0.44, h * 0.26)
  g.quadraticCurveTo(w * 0.5, h * 0.24, w * 0.56, h * 0.26)
  g.lineTo(w * 0.7, h * 0.08)
  g.lineTo(w * 0.67, h * 0.38)
  g.bezierCurveTo(w * 0.8, h * 0.42, w * 0.95, h * 0.62, w * 0.82, h)
  g.closePath()
  g.fill()
  // tail
  g.lineWidth = w * 0.06
  g.lineCap = 'round'
  g.strokeStyle = '#060507'
  g.beginPath()
  g.moveTo(w * 0.8, h * 0.95)
  g.quadraticCurveTo(w * 1.0, h * 0.85, w * 0.92, h * 0.6)
  g.stroke()
  // eyes
  g.fillStyle = '#ffd34a'
  g.beginPath()
  g.ellipse(w * 0.42, h * 0.36, w * 0.045, h * 0.03, -0.2, 0, Math.PI * 2)
  g.ellipse(w * 0.58, h * 0.36, w * 0.045, h * 0.03, 0.2, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#060507'
  g.fillRect(w * 0.415, h * 0.335, w * 0.01, h * 0.05)
  g.fillRect(w * 0.575, h * 0.335, w * 0.01, h * 0.05)
  // whiskers
  g.strokeStyle = 'rgba(240,230,210,0.75)'
  g.lineWidth = 2
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      g.beginPath()
      g.moveTo(w * (0.5 + s * 0.05), h * (0.43 + k * 0.015))
      g.lineTo(w * (0.5 + s * 0.27), h * (0.4 + k * 0.03))
      g.stroke()
    }
  }
  // an edge highlight so it reads against the night
  g.strokeStyle = 'rgba(160,140,200,0.35)'
  g.lineWidth = 3
  g.stroke()
  return c
}

function paintShip(w, h, rand) {
  const c = mk(w, h)
  const g = c.getContext('2d')
  // a folded paper boat, ruled like a letter
  g.fillStyle = '#efe6d2'
  g.beginPath()
  g.moveTo(w * 0.04, h * 0.62)
  g.lineTo(w * 0.96, h * 0.62)
  g.lineTo(w * 0.8, h * 0.96)
  g.lineTo(w * 0.2, h * 0.96)
  g.closePath()
  g.fill()
  g.fillStyle = '#e3d6bb'
  g.beginPath()
  g.moveTo(w * 0.22, h * 0.62)
  g.lineTo(w * 0.5, h * 0.04)
  g.lineTo(w * 0.78, h * 0.62)
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(70,90,140,0.35)'
  g.lineWidth = 1.5
  for (let y = h * 0.2; y < h * 0.95; y += 9) {
    g.beginPath()
    g.moveTo(w * 0.1, y + rand())
    g.lineTo(w * 0.9, y)
    g.stroke()
  }
  g.strokeStyle = 'rgba(60,40,30,0.55)'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(w * 0.5, h * 0.04)
  g.lineTo(w * 0.5, h * 0.62)
  g.stroke()
  // the cat at the prow
  g.fillStyle = '#060507'
  g.beginPath()
  g.ellipse(w * 0.3, h * 0.56, w * 0.05, h * 0.07, 0, 0, Math.PI * 2)
  g.fill()
  g.beginPath()
  g.moveTo(w * 0.27, h * 0.49)
  g.lineTo(w * 0.28, h * 0.43)
  g.lineTo(w * 0.3, h * 0.48)
  g.lineTo(w * 0.32, h * 0.43)
  g.lineTo(w * 0.33, h * 0.49)
  g.fill()
  return c
}

const PAINTERS = {
  velvet: (w, h) => paintVelvet(w, h),
  teaser: (w, h) => paintTeaser(w, h),
  palace: paintPalace,
  sea: paintSea,
  night: paintNight,
  lamps: paintLamps,
  waves: paintWaves,
  moon: paintMoon,
  cat: (w, h) => paintCat(w, h),
  ship: paintShip
}

export function createScenery() {
  const cache = new Map()
  const back = (() => {
    // the bare back wall: brick, a radiator, a ladder, a painted FIRE EXIT
    const w = 16 * PX
    const h = 22 * PX
    const c = mk(w, h)
    const g = c.getContext('2d')
    const r = rng(77)
    g.fillStyle = '#5a3a2e'
    g.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y += 14) {
      for (let x = (y / 14) % 2 ? -18 : 0; x < w; x += 36) {
        g.fillStyle = `rgb(${110 + r() * 40},${62 + r() * 20},${46 + r() * 16})`
        g.fillRect(x + 1, y + 1, 34, 12)
      }
    }
    g.fillStyle = 'rgba(20,12,10,0.35)'
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#d8d0b0'
    g.font = `bold ${PX * 0.5}px sans-serif`
    g.fillText('NO SMOKING', w * 0.12, h - PX * 3)
    g.strokeStyle = '#2a2a2a'
    g.lineWidth = 6
    for (let k = 0; k < 2; k++) {
      g.beginPath()
      g.moveTo(w * 0.8 + k * 40, h)
      g.lineTo(w * 0.8 + k * 40, 0)
      g.stroke()
    }
    for (let y = h; y > 0; y -= 26) {
      g.beginPath()
      g.moveTo(w * 0.8, y)
      g.lineTo(w * 0.8 + 40, y)
      g.stroke()
    }
    return c
  })()

  // a piece hanging up in the flies is out of the light: same cloth, in shadow
  const get = (piece, lit = true) => {
    const key = `${piece.paint}:${piece.h}:${piece.w}`
    if (!cache.has(key)) {
      const rand = rng(key.length * 9301 + piece.h * 49297 + piece.w * 233)
      cache.set(key, PAINTERS[piece.paint](piece.w * PX, piece.h * PX, rand))
    }
    if (lit) return cache.get(key)
    const dark = `${key}:dark`
    if (!cache.has(dark)) {
      const src = cache.get(key)
      const c = mk(src.width, src.height)
      const g = c.getContext('2d')
      g.drawImage(src, 0, 0)
      g.globalCompositeOperation = 'source-atop'
      g.fillStyle = 'rgba(6,4,8,0.5)'
      g.fillRect(0, 0, c.width, c.height)
      cache.set(dark, c)
    }
    return cache.get(dark)
  }
  return { get, back }
}

// Where a cut-out stands across the stage (metres from centre line)
export const CUT_Z = { moon: 2.7, cat: -2.1, ship: 0.2 }

export const SCENE_TINT = {
  palace: 'rgba(255,170,90,0.06)',
  sea: 'rgba(60,140,170,0.07)',
  night: 'rgba(40,40,120,0.1)',
  lamps: 'rgba(255,170,90,0.08)'
}

/**
 * Project and draw the stage from one eye.
 * opts: { pieces (placed, with pipe), house, eye, faultsById, light (0..1 house lights), showFaults }
 */
export function drawView(ctx, W, H, scenery, opts) {
  const { pieces, house, eye, faults = [], dim = 0, curtain = 0, labels = true } = opts
  const prosW = 10
  const k0 = Math.min((W * 0.84) / prosW, (H * 0.8) / house.prosH)
  const F = k0 * (0 - eye.x)
  const T = (H - house.prosH * k0) / 2 + H * 0.02
  const cx = W / 2
  const cy = T + (house.prosH - eye.y) * k0
  const P = (x, y, z) => {
    const s = F / (x - eye.x)
    return [cx + z * s, cy - (y - eye.y) * s, s]
  }
  const [ox0, oy0] = P(0, house.prosH, -prosW / 2)
  const [ox1, oy1] = P(0, 0, prosW / 2)

  ctx.save()
  ctx.fillStyle = '#0d0607'
  ctx.fillRect(0, 0, W, H)

  // ---- inside the opening
  ctx.save()
  ctx.beginPath()
  ctx.rect(ox0, oy0, ox1 - ox0, oy1 - oy0)
  ctx.clip()
  ctx.fillStyle = '#040303'
  ctx.fillRect(ox0, oy0, ox1 - ox0, oy1 - oy0)

  const quad = (pts, fill) => {
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
  }
  const G = house.grid
  const BX = house.backX
  const SW = 8
  // the fly tower: roof grid, side walls, back wall, floor
  quad([P(0.05, G, -SW), P(0.05, G, SW), P(BX, G, SW), P(BX, G, -SW)].map((p) => p.slice(0, 2)), '#1b1714')
  ctx.strokeStyle = 'rgba(160,150,130,0.35)'
  ctx.lineWidth = 1
  for (let z = -SW; z <= SW; z += 0.8) {
    const a = P(0.05, G, z)
    const b = P(BX, G, z)
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.lineTo(b[0], b[1])
    ctx.stroke()
  }
  for (const side of [-SW, SW]) {
    quad([P(0.05, 0, side), P(0.05, G, side), P(BX, G, side), P(BX, 0, side)].map((p) => p.slice(0, 2)), '#120c0a')
  }
  {
    const [bx0, by0, bs] = P(BX, G, -SW)
    ctx.drawImage(scenery.back, bx0, by0, 16 * bs, G * bs)
  }
  quad([P(0.05, 0, -SW), P(0.05, 0, SW), P(BX, 0, SW), P(BX, 0, -SW)].map((p) => p.slice(0, 2)), '#2a1d16')
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  for (let x = 0.4; x < BX; x += 0.6) {
    const a = P(x, 0, -SW)
    const b = P(x, 0, SW)
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.lineTo(b[0], b[1])
    ctx.stroke()
  }

  // pieces, upstage first
  const sorted = [...pieces].sort((a, b) => b.x - a.x)
  for (const p of sorted) {
    const img = scenery.get(p, p.pipe - (p.wire || 0) - p.h < house.prosH + 0.5)
    const z = p.kind === 'cut' ? CUT_Z[p.paint] || 0 : 0
    const top = p.pipe - (p.wire || 0)
    const [x0, y0, s] = P(p.x, top, z - p.w / 2)
    // a ground row set on the deck stands on its own braces, its batten unclipped and gone
    const standing = p.kind === 'ground' && p.pipe - p.h <= 0.02
    if (standing) {
      ctx.drawImage(img, x0, y0, p.w * s, p.h * s)
      continue
    }
    // lift lines to the grid
    ctx.strokeStyle = 'rgba(150,140,120,0.5)'
    ctx.lineWidth = Math.max(0.6, s * 0.012)
    for (const lz of p.kind === 'cut' ? [z] : [-5, 0, 5]) {
      const a = P(p.x, p.pipe + PIPE, lz)
      const b = P(p.x, G, lz)
      ctx.beginPath()
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(b[0], b[1])
      ctx.stroke()
    }
    if (p.wire) {
      // black pick-up wires: there, but meant to vanish against the dark
      ctx.strokeStyle = 'rgba(40,36,40,0.7)'
      ctx.lineWidth = 1
      for (const dz of [-p.w * 0.3, p.w * 0.3]) {
        const a = P(p.x, top, z + dz)
        const b = P(p.x, p.pipe, z + dz)
        ctx.beginPath()
        ctx.moveTo(a[0], a[1])
        ctx.lineTo(b[0], b[1])
        ctx.stroke()
      }
    }
    ctx.drawImage(img, x0, y0, p.w * s, p.h * s)
    // the batten pipe
    const pw = (p.kind === 'cut' ? p.w + 0.6 : p.w + 1.2) * s
    const [px0, py0] = P(p.x, p.pipe + PIPE, z - (p.kind === 'cut' ? p.w + 0.6 : p.w + 1.2) / 2)
    ctx.fillStyle = '#8f8c86'
    ctx.fillRect(px0, py0, pw, Math.max(1.5, PIPE * s))
  }

  // the call: the cast cat walks down to the lip and bows to the house
  if (opts.bow > 0) {
    const cat = scenery.get({ paint: 'cat', h: 3.4, w: 3.6 })
    const ch = 1.5
    const cw = ch * (3.6 / 3.4)
    const [fx, fy, fs] = P(0.7, 0, 0)
    ctx.save()
    ctx.translate(fx, fy)
    ctx.scale(1, 1 - 0.28 * opts.bow)
    ctx.transform(1, 0, -0.35 * opts.bow, 1, 0, 0)
    ctx.drawImage(cat, (-cw / 2) * fs, -ch * fs, cw * fs, ch * fs)
    ctx.restore()
    const glow = ctx.createRadialGradient(fx, fy, 2, fx, fy, ch * fs * 1.6)
    glow.addColorStop(0, `rgba(255,214,150,${0.22 * opts.bow})`)
    glow.addColorStop(1, 'rgba(255,214,150,0)')
    ctx.fillStyle = glow
    ctx.fillRect(fx - ch * fs * 1.6, fy - ch * fs * 1.6, ch * fs * 3.2, ch * fs * 3.2)
  }

  // stage wash
  if (opts.tint) {
    ctx.fillStyle = opts.tint
    ctx.fillRect(ox0, oy0, ox1 - ox0, oy1 - oy0)
  }
  if (dim > 0) {
    ctx.fillStyle = `rgba(0,0,0,${dim})`
    ctx.fillRect(ox0, oy0, ox1 - ox0, oy1 - oy0)
  }
  ctx.restore()

  // ---- the house curtain, flying out (curtain 1 = down)
  if (curtain > 0) {
    const ch = (oy1 - oy0) * curtain
    const grd = ctx.createLinearGradient(ox0, 0, ox1, 0)
    for (let i = 0; i <= 12; i++) grd.addColorStop(i / 12, i % 2 ? '#5a0f16' : '#7d1a22')
    ctx.fillStyle = grd
    ctx.fillRect(ox0, oy0, ox1 - ox0, ch)
    ctx.fillStyle = '#c9a24a'
    ctx.fillRect(ox0, oy0 + ch - Math.max(3, k0 * 0.12), ox1 - ox0, Math.max(3, k0 * 0.12))
  }

  // ---- the proscenium wall
  drawPros(ctx, W, H, ox0, oy0, ox1, oy1, k0)
  drawHouseName(ctx, W, opts.houseName, ox0, oy0, ox1, k0)
  if (opts.ovation) {
    // house lights come up for a show that earned it
    const g = ctx.createRadialGradient(W / 2, H, 10, W / 2, H, Math.max(W, H))
    g.addColorStop(0, `rgba(255,196,120,${0.16 * opts.ovation})`)
    g.addColorStop(1, 'rgba(255,196,120,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  drawForeground(ctx, W, H, opts.foreground, eye, P, ox0, ox1, oy1, opts.ovation || 0, opts.t || 0)

  // ---- faults, pointed at
  if (labels) {
    ctx.font = `600 ${Math.max(11, Math.min(15, W / 70))}px ui-monospace, Menlo, monospace`
    ctx.textBaseline = 'middle'
    const placed = []
    const marks = faults
      .map((f) => ({ f, at: faultPoint(f, P, house, ox0, oy0, ox1, oy1) }))
      .filter((m) => m.at)
      .sort((a, b) => a.at[1] - b.at[1])
    for (const { f, at } of marks) {
      const [fx, fy] = at
      ctx.strokeStyle = '#ff5a3c'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 4])
      ctx.beginPath()
      ctx.arc(fx, fy, 16, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      const text = f.label
      const tw = ctx.measureText(text).width
      const lx = Math.min(Math.max(fx + 20, 6), W - tw - 14)
      let ly = Math.min(Math.max(fy - 18, 12), H - 12)
      // push a label down until it clears every label already set
      for (let guard = 0; guard < 12; guard++) {
        const hit = placed.find((r) => lx < r.x + r.w + 4 && lx + tw + 10 > r.x - 4 && Math.abs(ly - r.y) < 22)
        if (!hit) break
        ly = hit.y + 23
      }
      placed.push({ x: lx - 5, y: ly, w: tw + 10 })
      ctx.fillStyle = 'rgba(20,6,6,0.82)'
      ctx.fillRect(lx - 5, ly - 10, tw + 10, 20)
      ctx.fillStyle = '#ffd9c8'
      ctx.fillText(text, lx, ly)
    }
  }
  ctx.restore()
  return { ox0, oy0, ox1, oy1, P }
}

// The house in front of the seat: heads for the stalls, a gilt rail for the gods.
function drawHouseName(ctx, W, name, ox0, oy0, ox1, k0) {
  if (!name) return
  const t = Math.max(6, k0 * 0.28)
  const room = oy0 - t * 1.2
  if (room < 72) return
  const label = name.toUpperCase().split('').join(String.fromCharCode(8202))
  ctx.save()
  const font = (px) => `400 ${px}px Didot, 'Bodoni 72', 'Playfair Display', 'Times New Roman', serif`
  ctx.font = font(100)
  const unit = ctx.measureText(label).width / 100
  // the cartouche spans the text plus 2.8 font sizes; keep it inside the arch's width
  const size = Math.min(28, room * 0.3, ((ox1 - ox0) * 0.8) / (unit + 2.8))
  if (size < 11) { ctx.restore(); return }
  ctx.font = font(size)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const tw = unit * size
  const cx = (ox0 + ox1) / 2
  const cy = oy0 - t * 1.3 - size * 1.1
  // a cartouche
  ctx.strokeStyle = 'rgba(201,162,74,0.55)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(cx - tw / 2 - size * 1.4, cy)
  ctx.lineTo(cx - tw / 2 - size * 0.5, cy - size * 0.8)
  ctx.lineTo(cx + tw / 2 + size * 0.5, cy - size * 0.8)
  ctx.lineTo(cx + tw / 2 + size * 1.4, cy)
  ctx.lineTo(cx + tw / 2 + size * 0.5, cy + size * 0.8)
  ctx.lineTo(cx - tw / 2 - size * 0.5, cy + size * 0.8)
  ctx.closePath()
  ctx.stroke()
  ctx.fillStyle = '#c9a24a'
  ctx.fillText(label, cx, cy + 1)
  // two sconces
  for (const sx of [ox0 + (ox1 - ox0) * 0.06, ox1 - (ox1 - ox0) * 0.06]) {
    const g = ctx.createRadialGradient(sx, cy, 1, sx, cy, size * 1.6)
    g.addColorStop(0, 'rgba(255,214,140,0.9)')
    g.addColorStop(0.2, 'rgba(255,190,110,0.35)')
    g.addColorStop(1, 'rgba(255,190,110,0)')
    ctx.fillStyle = g
    ctx.fillRect(sx - size * 1.6, cy - size * 1.6, size * 3.2, size * 3.2)
  }
  ctx.restore()
}

function drawForeground(ctx, W, H, kind, eye, P, ox0, ox1, oy1, ovation = 0, t = 0) {
  if (!kind) return
  if (kind === 'A' || kind === 'eye') {
    if (ovation <= 0) return
    const r = Math.max(18, (ox1 - ox0) * 0.06)
    const rand = rng(31)
    ctx.save()
    for (let i = 0; i < 7; i++) {
      const side = i % 2 ? 1 : -1
      const cx = W / 2 + side * (W * 0.18 + Math.floor(i / 2) * r * 2.6) + (rand() - 0.5) * r
      const cy = H + r * 1.2 - ovation * r * (1.7 + 0.15 * Math.sin(t * 5 + i))
      ctx.fillStyle = '#060304'
      ctx.beginPath()
      ctx.ellipse(cx, cy, r * 0.82, r, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(cx - r * 1.5, cy + r * 0.8, r * 3, r * 3)
      const clap = Math.abs(Math.sin(t * 9 + i * 2.1))
      for (const sd of [-1, 1]) {
        ctx.beginPath()
        ctx.ellipse(cx + sd * r * (0.3 + clap * 0.4), cy - r * 1.3, r * 0.22, r * 0.3, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.strokeStyle = 'rgba(255,190,120,0.22)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.ellipse(cx, cy, r * 0.82, r, 0, Math.PI * 1.1, Math.PI * 1.75)
      ctx.stroke()
    }
    ctx.restore()
    return
  }
  ctx.save()
  if (kind === 'G') {
    const y = H * 0.93
    const g = ctx.createLinearGradient(0, y, 0, H)
    g.addColorStop(0, '#3a1418')
    g.addColorStop(1, '#14070a')
    ctx.fillStyle = g
    ctx.fillRect(0, y, W, H - y)
    ctx.fillStyle = '#b48a3a'
    ctx.fillRect(0, y - 4, W, 5)
    ctx.fillStyle = 'rgba(255,230,160,0.5)'
    ctx.fillRect(0, y - 4, W, 1)
    for (let x = 18; x < W; x += 36) {
      ctx.fillStyle = 'rgba(180,138,58,0.35)'
      ctx.beginPath()
      ctx.arc(x, y + (H - y) * 0.5, 6, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
    return
  }
  // a row of heads, scaled to how far back the seat is
  const depth = Math.min(1, Math.max(0.2, (-eye.x - 3) / 12))
  const r0 = Math.max(14, (ox1 - ox0) * 0.042 * (1.4 - depth * 0.5))
  const base0 = Math.min(H + r0 * 0.55, oy1 + r0 * 1.6)
  const rand = rng(Math.round(eye.x * 100) + 7)
  // rows nearer the seat are lower and larger; fill down to the frame's edge
  for (let row = 0; row < 4; row++) {
    const r = r0 * (1 + row * 0.38)
    const baseY = base0 + row * r0 * 1.7
    if (baseY - r > H) break
    if (row > 0) {
      ctx.fillStyle = `rgba(30,10,12,${0.5 - row * 0.1})`
      ctx.fillRect(0, baseY - r * 1.6, W, 2)
    }
    const n = Math.ceil(W / (r * 2.3)) + 1
    const off = (row % 2) * r * 1.15
  for (let i = 0; i < n; i++) {
    const cx = off + i * r * 2.3 + (rand() - 0.5) * r * 0.6
    // on their feet: the whole row rises, and each head bobs to its own clapping
    const rise = ovation * r * (0.9 + 0.1 * Math.sin(t * 5 + i * 1.7))
    const cy = baseY - rand() * r * 0.35 - rise
    const rr = r * (0.88 + rand() * 0.25)
    if (ovation > 0.25) {
      const clap = Math.abs(Math.sin(t * 9 + i * 2.3 + row))
      ctx.fillStyle = '#060304'
      for (const side of [-1, 1]) {
        ctx.beginPath()
        ctx.ellipse(cx + side * rr * (0.35 + clap * 0.35), cy - rr * 1.25 * ovation, rr * 0.22, rr * 0.3, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.fillStyle = '#060304'
    ctx.beginPath()
    ctx.ellipse(cx, cy, rr * 0.82, rr, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(cx - rr * 1.6, cy + rr * 0.8, rr * 3.2, rr * 2)
    if (rand() < 0.22) {
      // a cat in the audience, of course
      ctx.beginPath()
      ctx.moveTo(cx - rr * 0.7, cy - rr * 0.45)
      ctx.lineTo(cx - rr * 0.55, cy - rr * 1.35)
      ctx.lineTo(cx - rr * 0.15, cy - rr * 0.85)
      ctx.lineTo(cx + rr * 0.15, cy - rr * 0.85)
      ctx.lineTo(cx + rr * 0.55, cy - rr * 1.35)
      ctx.lineTo(cx + rr * 0.7, cy - rr * 0.45)
      ctx.fill()
    }
    ctx.strokeStyle = 'rgba(255,190,120,0.16)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.ellipse(cx, cy, rr * 0.82, rr, 0, Math.PI * 1.1, Math.PI * 1.75)
    ctx.stroke()
  }
  }
  ctx.restore()
}

function faultPoint(f, P, house, ox0, oy0, ox1, oy1) {
  const clampIn = ([x, y]) => [Math.min(Math.max(x, ox0 + 18), ox1 - 18), Math.min(Math.max(y, oy0 + 18), oy1 - 18)]
  const z = f.z || 0
  if (f.type === 'pipe') return clampIn(P(f.x, f.y, z))
  if (f.type === 'roof') return clampIn([(ox0 + ox1) / 2, oy0 + 20])
  if (f.spans && f.spans.length) {
    const [a, b] = f.spans[f.spans.length - 1]
    return clampIn(P(f.x, (a + b) / 2, z))
  }
  if (f.y != null) return clampIn(P(f.x, f.y, z))
  return null
}

function drawPros(ctx, W, H, ox0, oy0, ox1, oy1, k0) {
  ctx.save()
  // the wall itself, everything outside the opening
  ctx.beginPath()
  ctx.rect(0, 0, W, H)
  ctx.rect(ox0, oy0, ox1 - ox0, oy1 - oy0)
  ctx.fillStyle = '#1d0b0d'
  ctx.fill('evenodd')
  // gilt frame
  const t = Math.max(6, k0 * 0.28)
  ctx.strokeStyle = '#a07a2f'
  ctx.lineWidth = t
  ctx.strokeRect(ox0 - t / 2, oy0 - t / 2, ox1 - ox0 + t, oy1 - oy0 + t)
  ctx.strokeStyle = 'rgba(255,226,150,0.55)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(ox0 - t * 0.2, oy0 - t * 0.2, ox1 - ox0 + t * 0.4, oy1 - oy0 + t * 0.4)
  ctx.strokeRect(ox0 - t * 0.95, oy0 - t * 0.95, ox1 - ox0 + t * 1.9, oy1 - oy0 + t * 1.9)
  // the house tabs, gathered at the sides, and a valance
  const sw = Math.min((ox1 - ox0) * 0.07, 60)
  for (const [x0, dir] of [[ox0, 1], [ox1 - sw, -1]]) {
    const g = ctx.createLinearGradient(x0, 0, x0 + sw, 0)
    for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, i % 2 ? '#4a0c12' : '#7a1720')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(x0, oy0)
    ctx.lineTo(x0 + sw, oy0)
    ctx.quadraticCurveTo(x0 + sw * (dir > 0 ? 0.4 : 0.6), (oy0 + oy1) / 2, x0 + (dir > 0 ? sw * 0.9 : sw * 0.1), oy1)
    ctx.lineTo(dir > 0 ? x0 : x0 + sw, oy1)
    ctx.closePath()
    ctx.fill()
  }
  const vh = Math.max(10, (oy1 - oy0) * 0.06)
  const vg = ctx.createLinearGradient(ox0, 0, ox1, 0)
  for (let i = 0; i <= 24; i++) vg.addColorStop(i / 24, i % 2 ? '#4a0c12' : '#7a1720')
  ctx.fillStyle = vg
  ctx.beginPath()
  ctx.moveTo(ox0, oy0)
  ctx.lineTo(ox1, oy0)
  ctx.lineTo(ox1, oy0 + vh)
  const n = 9
  for (let i = n; i > 0; i--) {
    const xa = ox0 + ((ox1 - ox0) * i) / n
    const xb = ox0 + ((ox1 - ox0) * (i - 1)) / n
    ctx.quadraticCurveTo((xa + xb) / 2, oy0 + vh * 1.9, xb, oy0 + vh)
  }
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#c9a24a'
  ctx.fillRect(ox0, oy0 + vh * 0.15, ox1 - ox0, 2)
  // the stage lip / footlights
  ctx.fillStyle = '#26130f'
  ctx.fillRect(ox0 - t, oy1, ox1 - ox0 + 2 * t, Math.max(6, k0 * 0.25))
  ctx.fillStyle = 'rgba(255,214,140,0.8)'
  for (let x = ox0 + 14; x < ox1 - 8; x += 26) ctx.fillRect(x, oy1 + 2, 8, 2)
  ctx.restore()
}
