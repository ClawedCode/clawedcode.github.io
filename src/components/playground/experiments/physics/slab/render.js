/**
 * slab.season() — drawing.
 *
 * The pass is printed as a cyanotype: Prussian blue rock, paper-white snow,
 * and one true black, the cat at the watch hut. Stress shows as a red bloom
 * in the start zones. The strata wall is the forecaster's chart: one column
 * per day, every layer coloured by its grain in the international
 * snow-profile colours, or by how close it is to failing.
 */

import { PATHS, DAYS } from './winters.js'

export const GRAIN_COLORS = ['#86c440', '#2f7d4a', '#ecc6d0', '#5fa8dc', '#2a55c9', '#d23fae', '#d8453a']
export const siColor = (si) => (si < 1 ? '#c62d2d' : si < 1.3 ? '#ea7a35' : si < 1.8 ? '#efc75a' : si < 3 ? '#bfd2c4' : '#e3e9e2')
export const DANGER_COLORS = ['#ccd7d2', '#7fb069', '#f2d24b', '#f08a2c', '#d8312c', '#5b0f1a']
export const DANGER_NAMES = ['', 'low', 'moderate', 'considerable', 'high', 'very high']

const BASE_V = 0.64
const LINE_V = 0.8
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const lerp = (a, b, t) => a + (b - a) * t
const ease = (t) => t * t * (3 - 2 * t)

const rand = (seed) => {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hash2 = (x, y) => {
  let h = (x * 374761393 + y * 668265263) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
function vnoise(x, y) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
function fbm(x, y) {
  let s = 0
  let a = 0.5
  for (let o = 0; o < 4; o++) {
    s += a * vnoise(x, y)
    x *= 2.03
    y *= 2.03
    a *= 0.5
  }
  return s
}

const PEAKS = [
  ...PATHS.map((p, i) => ({ u: p.x + (i % 2 ? 0.02 : -0.015), v: 0.035 + p.top * 0.42 })),
  { u: 0.0, v: 0.3 },
  { u: 0.335, v: 0.16 },
  { u: 0.66, v: 0.2 },
  { u: 1.0, v: 0.34 }
]

function ridgeAt(u) {
  let v = 0.42
  for (const pk of PEAKS) v = Math.min(v, pk.v + 1.7 * Math.abs(u - pk.u) ** 1.08)
  return v + 0.018 * (fbm(u * 40, 3.1) - 0.5) + 0.006 * Math.sin(u * 140)
}

/** gully centreline: s=0 at the start zone, s=1 at the foot of the face */
export function gullyPoint(p, s) {
  const path = PATHS[p]
  const v0 = ridgeAt(path.x) + 0.035
  const v = lerp(v0, BASE_V, s)
  const bend = [0.035, -0.03, 0.028, -0.04, 0.03, -0.026][p]
  const wobble = bend * Math.sin(s * 3.1 + p * 0.9) - bend * Math.sin(p * 0.9) * (1 - s) + 0.008 * Math.sin(s * 11 + p)
  return { u: path.x + wobble, v }
}

function gullyHalf(p, s) {
  const w = PATHS[p].width
  // a bowl of a start zone, a narrow track, and a widening runout
  const funnel = Math.max(0, 1 - s / 0.34) ** 1.6
  return w * (0.2 + 0.62 * funnel + 0.2 * s * s * s)
}

function gullyPolygon(p, steps = 34) {
  const left = []
  const right = []
  for (let i = 0; i <= steps; i++) {
    const s = -0.07 + (i / steps) * 1.12
    const c = gullyPoint(p, s)
    const cap = Math.sqrt(clamp((s + 0.07) / 0.11, 0, 1))
    const h = gullyHalf(p, Math.max(0, s)) * cap * (1 + 0.08 * (vnoise(s * 9, p * 3.3) - 0.5))
    left.push([c.u - h, c.v])
    right.push([c.u + h * (1 + 0.1 * (vnoise(s * 7, p * 5.1) - 0.5)), c.v])
  }
  return left.concat(right.reverse())
}

const u0 = (x, fw) => x / (fw - 1)

const SKY = {
  storm: ['#6e7f93', '#a9b6c4'],
  clear: ['#0f2c52', '#5b84b5'],
  night: ['#081a33', '#23477a'],
  warm: ['#3d6ea8', '#b9cfe3'],
  rain: ['#4a5766', '#7d8a98'],
  grey: ['#36587f', '#8fa9c4']
}

export function createPanorama() {
  let W = 1
  let H = 1
  let dpr = 1
  let rock = null
  let snowBuckets = []
  let grain = null
  let far = null
  let apron = null

  const px = (u) => u * W
  const py = (v) => v * H

  function build() {
    const mk = (w = W, h = H, r = dpr) => {
      const c = document.createElement('canvas')
      c.width = Math.max(1, Math.round(w * r))
      c.height = Math.max(1, Math.round(h * r))
      const g = c.getContext('2d')
      g.scale(r, r)
      return [c, g]
    }
    // far range, paler, behind the face
    {
      const [c, g] = mk()
      const grad = g.createLinearGradient(0, py(0.05), 0, py(0.5))
      grad.addColorStop(0, '#a9c0db')
      grad.addColorStop(1, '#7392b8')
      g.fillStyle = grad
      g.beginPath()
      g.moveTo(0, py(0.5))
      for (let i = 0; i <= 120; i++) {
        const u = i / 120
        g.lineTo(px(u), py(0.15 + 0.07 * Math.sin(u * 7 + 2.4) + 0.06 * (fbm(u * 18, 9) - 0.5)))
      }
      g.lineTo(W, H)
      g.lineTo(0, H)
      g.fill()
      far = c
    }
    // the face, shaded from a heightfield: ribs, buttresses and carved gullies
    const scale = W * H > 260000 ? 0.5 : 1
    const fw = Math.max(3, Math.round(W * scale))
    const fh = Math.max(3, Math.round(H * scale))
    const hgt = new Float32Array(fw * fh)
    const ridgeRow = new Float32Array(fw)
    for (let x = 0; x < fw; x++) ridgeRow[x] = ridgeAt(x / (fw - 1))
    const gullyU = PATHS.map(() => new Float32Array(fh))
    const gullyW = PATHS.map(() => new Float32Array(fh))
    for (let p = 0; p < PATHS.length; p++) {
      const v0 = gullyPoint(p, 0).v
      for (let y = 0; y < fh; y++) {
        const v = y / (fh - 1)
        const sg = (v - v0) / (BASE_V - v0)
        if (sg < -0.05 || sg > 1.05) continue
        const sc = clamp(sg, 0, 1)
        gullyU[p][y] = gullyPoint(p, sc).u
        gullyW[p][y] = gullyHalf(p, sc) * 1.35
      }
    }
    for (let y = 0; y < fh; y++) {
      const v = y / (fh - 1)
      for (let x = 0; x < fw; x++) {
        const u = x / (fw - 1)
        const below = v - ridgeRow[x]
        const rib = 1 - Math.abs(2 * fbm(u * 16 + v * 2.5, v * 2.2) - 1)
        let bump = 0
        for (const pk of PEAKS) bump += Math.exp(-(((u - pk.u) / 0.075) ** 2)) * (0.42 - pk.v)
        let h = -v * 1.6 + bump * 0.5 + 0.11 * fbm(u * 5 + v * 4, v * 5 - u * 3) + 0.06 * Math.abs(fbm(u * 9 - v * 5, v * 6) - 0.5) + 0.025 * rib + 0.03 * fbm(u * 9 - v * 16, v * 11) + 0.01 * fbm(u * 60, v * 50)
        for (let p = 0; p < PATHS.length; p++) {
          const gw = gullyW[p][y]
          if (gw <= 0) continue
          const d = (u - gullyU[p][y]) / gw
          if (d > -2.5 && d < 2.5) h -= 0.022 * Math.exp(-d * d * 1.2)
        }
        hgt[y * fw + x] = h
      }
    }
    const face = document.createElement('canvas')
    face.width = fw
    face.height = fh
    const fg = face.getContext('2d')
    const img = fg.createImageData(fw, fh)
    const snowImgs = [0, 1, 2, 3, 4].map(() => fg.createImageData(fw, fh))
    for (let y = 1; y < fh - 1; y++) {
      const v = y / (fh - 1)
      for (let x = 1; x < fw - 1; x++) {
        if (v < ridgeRow[x] || v > BASE_V + 0.05) continue
        const i = y * fw + x
        const dx = (hgt[i + 1] - hgt[i - 1]) * (fw - 1) * 0.5
        const dy = (hgt[i + fw] - hgt[i - fw]) * (fh - 1) * 0.5
        const height = clamp((v - ridgeRow[x]) / Math.max(0.01, BASE_V - ridgeRow[x]), 0, 1)
        // light from the upper left; dx is the cross-slope
        let shade = clamp(0.5 - Math.tanh(dx * 0.5) * 0.45 + (dy + 1.6) * 0.18, 0, 1)
        shade = clamp(shade + (1 - height) * 0.1, 0, 1)
        const o = i * 4
        const edge = v > BASE_V ? clamp(1 - (v - BASE_V) / 0.05, 0, 1) : 1
        img.data[o] = lerp(9, 118, shade)
        img.data[o + 1] = lerp(30, 156, shade)
        img.data[o + 2] = lerp(62, 204, shade)
        img.data[o + 3] = 255 * edge
        // snow lies where the face is less steep across, and up high
        const steep = Math.abs(dx) * 0.9
        const aff = clamp(1.05 - steep + 0.7 * (fbm(u0(x, fw) * 20, v * 26) - 0.5) + (1 - height) * 0.15, 0, 1)
        const b = clamp(Math.floor((1 - aff) * 5), 0, 4)
        const sd = snowImgs[b].data
        const bright = 0.9 + 0.1 * shade
        sd[o] = 236 * bright
        sd[o + 1] = 243 * bright
        sd[o + 2] = 252 * bright
        sd[o + 3] = 240 * edge
      }
    }
    fg.putImageData(img, 0, 0)
    rock = mk()[0]
    {
      const g = rock.getContext('2d')
      g.imageSmoothingEnabled = true
      g.drawImage(face, 0, 0, W, H)
    }
    snowBuckets = snowImgs.map((im) => {
      const small = document.createElement('canvas')
      small.width = fw
      small.height = fh
      small.getContext('2d').putImageData(im, 0, 0)
      const [c, g] = mk()
      g.filter = `blur(${scale < 1 ? 0.9 : 0.5}px)`
      g.drawImage(small, 0, 0, W, H)
      g.filter = 'none'
      return c
    })
    // apron below the face: the runout zone, with forest left standing between the paths
    {
      const [c, g] = mk()
      const grad = g.createLinearGradient(0, py(BASE_V - 0.02), 0, py(LINE_V))
      grad.addColorStop(0, '#a7bfd8')
      grad.addColorStop(1, '#dbe6f1')
      g.fillStyle = grad
      g.beginPath()
      g.moveTo(0, py(BASE_V + 0.03))
      for (let i = 0; i <= 60; i++) g.lineTo(px(i / 60), py(BASE_V + 0.02 + 0.012 * Math.sin(i * 0.9)))
      g.lineTo(W, py(LINE_V))
      g.lineTo(0, py(LINE_V))
      g.closePath()
      g.fill()
      const rr = rand(1203)
      const trees = []
      for (let i = 0; i < 900; i++) {
        const u = rr()
        const v = lerp(BASE_V - 0.16, LINE_V - 0.012, Math.sqrt(rr()))
        if (v < ridgeAt(u) + 0.18) continue
        let clear = true
        for (let p = 0; p < PATHS.length; p++) {
          const top = gullyPoint(p, 0).v
          const sp = (v - top) / (BASE_V - top)
          const cu = gullyPoint(p, clamp(sp, 0, 1)).u
          const half = sp > 1 ? PATHS[p].width * (0.75 + (sp - 1) * 1.4) : gullyHalf(p, clamp(sp, 0, 1)) * 1.3
          if (Math.abs(u - cu) < half) clear = false
        }
        if (clear) trees.push({ u, v, r: rr() })
      }
      trees.sort((a, b) => a.v - b.v)
      for (const t of trees) {
        const th = 4 + t.r * 6 + (t.v - BASE_V + 0.16) * 34
        const x = px(t.u)
        const y = py(t.v)
        g.fillStyle = t.r < 0.5 ? '#061629' : '#0b2344'
        g.beginPath()
        g.moveTo(x, y - th)
        g.lineTo(x - th * 0.3, y)
        g.lineTo(x + th * 0.3, y)
        g.closePath()
        g.fill()
        g.fillStyle = 'rgba(232, 240, 250, 0.6)'
        g.fillRect(x - th * 0.15, y - th * 0.6, th * 0.3, 1)
        g.fillRect(x - th * 0.22, y - th * 0.3, th * 0.44, 1)
      }
      apron = c
    }
    // paper grain
    {
      const [c, g] = mk()
      const r = rand(9)
      for (let i = 0; i < (W * H) / 90; i++) {
        g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,10,30,0.07)'
        g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2)
      }
      grain = c
    }
  }

  function resize(w, h, ratio) {
    W = w
    H = h
    dpr = ratio
    build()
    if (typeof api !== 'undefined') api.sized += 1
  }

  function sky(g, wx, phase) {
    let key = 'grey'
    if (wx.rain > 0) key = 'rain'
    else if (wx.swe > 0) key = 'storm'
    else if (wx.tmax > 2) key = 'warm'
    else if (wx.cloud < 0.3) key = phase === 'night' ? 'night' : 'clear'
    const [a, b] = SKY[key]
    const grad = g.createLinearGradient(0, 0, 0, py(0.6))
    grad.addColorStop(0, a)
    grad.addColorStop(1, b)
    g.fillStyle = grad
    g.fillRect(0, 0, W, H)
    return key
  }

  function polygon(g, pts) {
    g.beginPath()
    pts.forEach(([u, v], i) => (i ? g.lineTo(px(u), py(v)) : g.moveTo(px(u), py(v))))
    g.closePath()
  }

  function drawGully(g, p, hs, si, state) {
    const poly = gullyPolygon(p)
    const cover = clamp(hs / 170, 0, 1)
    polygon(g, poly)
    g.fillStyle = `rgba(214, 228, 243, ${0.22 + 0.72 * cover})`
    g.fill()
    g.save()
    polygon(g, poly)
    g.clip()
    // the bed of the gully catches light; its right wall holds shadow
    g.lineCap = 'round'
    g.lineJoin = 'round'
    for (const [off, wdt, col] of [[0.35, 0.9, `rgba(20, 50, 90, ${0.18 + 0.12 * cover})`], [-0.15, 0.7, `rgba(250, 252, 255, ${0.25 + 0.6 * cover})`]]) {
      g.beginPath()
      for (let i = 0; i <= 30; i++) {
        const s = i / 30
        const c = gullyPoint(p, s)
        const x = px(c.u + off * gullyHalf(p, s))
        const y = py(c.v)
        i ? g.lineTo(x, y) : g.moveTo(x, y)
      }
      g.strokeStyle = col
      g.lineWidth = px(PATHS[p].width) * wdt * 0.5
      g.stroke()
    }
    // stress bloom in the start zone
    if (si < 1.7) {
      const c = gullyPoint(p, 0.1)
      const k = clamp((1.7 - si) / 0.8, 0, 1)
      const pulse = state.reduced ? 1 : 0.85 + 0.15 * Math.sin(state.t * 3 + p)
      const rad = px(PATHS[p].width) * (1.4 + k)
      const grad = g.createRadialGradient(px(c.u), py(c.v), 0, px(c.u), py(c.v), rad)
      grad.addColorStop(0, `rgba(214, 50, 40, ${0.62 * k * pulse})`)
      grad.addColorStop(1, 'rgba(214, 50, 40, 0)')
      g.fillStyle = grad
      g.fillRect(px(c.u) - rad, py(c.v) - rad, rad * 2, rad * 2)
    }
    if (state.stamped[p]) {
      g.fillStyle = 'rgba(30, 60, 100, 0.35)'
      const r = rand(500 + p)
      for (let i = 0; i < 40; i++) {
        const s = 0.05 + r() * 0.85
        const c = gullyPoint(p, s)
        const off = (r() - 0.5) * gullyHalf(p, s)
        g.fillRect(px(c.u + off), py(c.v), 2, 3)
      }
    }
    g.restore()
    if (state.fenced[p]) {
      const c = gullyPoint(p, 0)
      const hw = px(PATHS[p].width) * 1.1
      g.strokeStyle = '#08162b'
      g.lineWidth = 2
      g.beginPath()
      for (let i = 0; i <= 10; i++) {
        const x = px(c.u) - hw + (i / 10) * hw * 2
        const y = py(c.v) - 6 + (i % 2 ? -5 : 0)
        i ? g.lineTo(x, y) : g.moveTo(x, y)
      }
      g.stroke()
    }
    if (p === state.selected) {
      polygon(g, poly)
      g.setLineDash([5, 4])
      g.strokeStyle = 'rgba(255,255,255,0.95)'
      g.lineWidth = 1.6
      g.stroke()
      g.setLineDash([])
    }
  }

  function fan(g, p, M, reaches, alpha, seed) {
    const foot = gullyPoint(p, 1)
    const reachV = reaches ? LINE_V + 0.03 : lerp(BASE_V + 0.04, LINE_V - 0.02, clamp(M / PATHS[p].reach, 0, 1))
    const spread = PATHS[p].width * (0.55 + Math.sqrt(M) * 0.06)
    const r = rand(seed)
    // an irregular lobe of debris
    const pts = []
    const n = 18
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * (i / n)
      const rough = 0.9 + 0.14 * r()
      const du = Math.cos(a) * spread * rough * (0.3 + 0.7 * Math.sqrt(Math.sin(a)))
      const dv = Math.sin(a) * (reachV - foot.v) * (0.86 + 0.18 * r())
      pts.push([foot.u + du, foot.v - 0.012 + dv])
    }
    g.beginPath()
    g.moveTo(px(pts[0][0]), py(pts[0][1]))
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2
      const my = (pts[i][1] + pts[i + 1][1]) / 2
      g.quadraticCurveTo(px(pts[i][0]), py(pts[i][1]), px(mx), py(my))
    }
    g.lineTo(px(pts[pts.length - 1][0]), py(pts[pts.length - 1][1]))
    g.closePath()
    g.fillStyle = `rgba(196, 211, 228, ${0.95 * alpha})`
    g.fill()
    g.strokeStyle = `rgba(52, 82, 120, ${0.8 * alpha})`
    g.lineWidth = 1.3
    g.stroke()
    // blocks of slab, each with a shadow
    for (let i = 0; i < 34; i++) {
      const a = Math.PI * r()
      const k = Math.sqrt(r())
      const x = px(foot.u + Math.cos(a) * spread * k * 0.9)
      const y = py(foot.v + 0.012 + Math.sin(a) * (reachV - foot.v) * k * 0.92)
      const sz = 1.4 + r() * 3.2
      g.fillStyle = `rgba(40, 70, 110, ${0.5 * alpha})`
      g.fillRect(x - sz * 0.5, y + sz * 0.4, sz * 1.3, sz * 0.5)
      g.fillStyle = `rgba(248, 251, 255, ${alpha})`
      g.fillRect(x - sz * 0.6, y - sz * 0.4, sz * 1.2, sz * 0.8)
    }
    if (reaches) {
      g.strokeStyle = `rgba(225, 50, 40, ${alpha})`
      g.lineWidth = 3
      g.beginPath()
      g.moveTo(px(foot.u - spread * 0.85), py(LINE_V) + 3)
      g.lineTo(px(foot.u + spread * 0.85), py(LINE_V) + 3)
      g.stroke()
    }
  }

  function railway(g, state) {
    const y = py(LINE_V)
    // embankment
    g.fillStyle = '#1b3d63'
    g.fillRect(0, y - 2, W, py(1) - y + 2)
    g.fillStyle = 'rgba(232, 240, 248, 0.55)'
    g.fillRect(0, y - 3, W, 3)
    // sleepers and rails
    g.strokeStyle = 'rgba(8, 20, 38, 0.8)'
    g.lineWidth = 1
    for (let x = 0; x < W; x += 7) {
      g.beginPath()
      g.moveTo(x, y + 1)
      g.lineTo(x + 3, y + 5)
      g.stroke()
    }
    g.strokeStyle = state.lineStatus === 'open' ? '#e9f1f8' : '#d8453a'
    g.lineWidth = 1.4
    g.beginPath()
    g.moveTo(0, y + 1.5)
    g.lineTo(W, y + 1.5)
    g.moveTo(0, y + 4.5)
    g.lineTo(W, y + 4.5)
    g.stroke()
    // tunnel portal, right
    const tx = px(0.975)
    g.fillStyle = '#0a1c33'
    g.beginPath()
    g.moveTo(tx - 22, y + 6)
    g.lineTo(tx - 22, y - 16)
    g.arc(tx, y - 16, 22, Math.PI, 0)
    g.lineTo(tx + 22, y + 6)
    g.fill()
    g.fillStyle = '#000'
    g.beginPath()
    g.moveTo(tx - 13, y + 6)
    g.lineTo(tx - 13, y - 12)
    g.arc(tx, y - 12, 13, Math.PI, 0)
    g.lineTo(tx + 13, y + 6)
    g.fill()
    // valley floor and river
    g.fillStyle = '#123257'
    g.fillRect(0, py(0.88), W, H)
    g.strokeStyle = 'rgba(190, 215, 240, 0.35)'
    g.lineWidth = 1
    g.beginPath()
    for (let i = 0; i <= 60; i++) {
      const u = i / 60
      const yy = py(0.94 + 0.012 * Math.sin(u * 14))
      i ? g.lineTo(px(u), yy) : g.moveTo(px(u), yy)
    }
    g.stroke()
    // the train
    if (state.train != null) {
      const x = px(state.train)
      const dir = state.trainDir || 1
      const cw = Math.max(15, W * 0.018)
      const ch = cw * 0.62
      g.fillStyle = '#060d18'
      for (let k = 0; k < 4; k++) {
        const cx = x - dir * k * (cw + 2)
        g.fillRect(cx - cw / 2, y - ch, cw, ch)
        g.fillStyle = state.trainCaught ? 'rgba(120, 130, 150, 0.6)' : 'rgba(255, 236, 170, 0.9)'
        if (k > 0) for (let w = 0; w < 3; w++) g.fillRect(cx - cw / 2 + 2 + w * (cw / 3.2), y - ch + 2, cw / 6, ch / 3)
        g.fillStyle = '#060d18'
      }
      // head lamp
      g.fillStyle = state.trainCaught ? '#ff3b2f' : '#fff3c4'
      g.beginPath()
      g.arc(x + dir * (cw / 2 + 1.5), y - ch / 2, state.trainCaught ? 3.4 : 2.4, 0, Math.PI * 2)
      g.fill()
      if (state.trainCaught) {
        const glow = g.createRadialGradient(x + dir * cw / 2, y - ch / 2, 0, x + dir * cw / 2, y - ch / 2, 22)
        glow.addColorStop(0, 'rgba(255, 59, 47, 0.55)')
        glow.addColorStop(1, 'rgba(255, 59, 47, 0)')
        g.fillStyle = glow
        g.fillRect(x - 30, y - 30, 60, 50)
      }
    }
    // signal at the hut end
    const sx = px(0.165)
    g.fillStyle = '#081426'
    g.fillRect(sx, y - 28, 2, 28)
    g.beginPath()
    g.arc(sx + 1, y - 30, 4, 0, Math.PI * 2)
    g.fillStyle = state.lineStatus === 'open' ? '#9fe3a3' : state.lineStatus === 'hold' ? '#f2d24b' : '#ff5b4a'
    g.fill()
  }

  function hutAndCat(g, state) {
    const hx = px(0.07)
    const hy = py(0.9)
    g.fillStyle = '#0d2443'
    g.beginPath()
    g.ellipse(hx, hy + 6, 58, 16, 0, Math.PI, 0)
    g.fill()
    // hut
    g.fillStyle = '#163a62'
    g.fillRect(hx - 22, hy - 22, 44, 24)
    g.fillStyle = '#eef4fa'
    g.beginPath()
    g.moveTo(hx - 28, hy - 20)
    g.lineTo(hx, hy - 40)
    g.lineTo(hx + 28, hy - 20)
    g.closePath()
    g.fill()
    g.fillStyle = state.phase === 'night' ? '#ffe7a6' : '#9cc0e0'
    g.fillRect(hx - 12, hy - 14, 9, 8)
    g.fillRect(hx + 4, hy - 14, 9, 8)
    // the cat: the only true black in the print
    const cx = hx + 16
    const cy = hy - 30
    const tail = state.reduced ? 0 : Math.sin(state.t * 1.6) * 0.35
    g.fillStyle = '#000'
    g.beginPath()
    g.ellipse(cx, cy, 7.5, 9, 0, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.arc(cx, cy - 11, 5.6, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.moveTo(cx - 5, cy - 14)
    g.lineTo(cx - 3.5, cy - 21)
    g.lineTo(cx - 1, cy - 15)
    g.moveTo(cx + 5, cy - 14)
    g.lineTo(cx + 3.5, cy - 21)
    g.lineTo(cx + 1, cy - 15)
    g.fill()
    g.strokeStyle = '#000'
    g.lineWidth = 2.4
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(cx + 6, cy + 6)
    g.quadraticCurveTo(cx + 18, cy + 4 + tail * 10, cx + 16 + tail * 6, cy - 8)
    g.stroke()
    g.fillStyle = '#c7f0ff'
    const blink = !state.reduced && Math.sin(state.t * 0.7) > 0.985
    if (!blink) {
      g.fillRect(cx - 3.2, cy - 12, 2, 1.6)
      g.fillRect(cx + 1.4, cy - 12, 2, 1.6)
    }
  }

  function weather(g, wx, t, reduced, key) {
    if (key === 'night' || key === 'clear') {
      const r = rand(42)
      g.fillStyle = 'rgba(240, 248, 255, 0.85)'
      for (let i = 0; i < (key === 'night' ? 90 : 18); i++) {
        const x = r() * W
        const y = r() * py(0.32)
        if (y > py(ridgeAt(x / W))) continue
        const tw = reduced ? 1 : 0.6 + 0.4 * Math.sin(t * 2 + i)
        g.globalAlpha = tw
        g.fillRect(x, y, 1.4, 1.4)
      }
      g.globalAlpha = 1
    }
    if (wx.swe > 0 || wx.rain > 0) {
      const rain = wx.rain > 0
      const n = Math.min(420, 60 + (wx.swe || wx.rain * 2) * 9)
      const r = rand(7)
      const drift = (wx.dir === 0 ? 0 : 1) * (wx.wind / 10)
      g.fillStyle = 'rgba(245, 250, 255, 0.8)'
      g.strokeStyle = 'rgba(210, 225, 240, 0.45)'
      for (let i = 0; i < n; i++) {
        const sx = r()
        const sy = r()
        const sp = 0.5 + r()
        const time = reduced ? 0 : t
        const u = (sx + time * drift * 0.05 * sp + 10) % 1
        const v = (sy + time * (rain ? 0.6 : 0.07) * sp) % 1
        if (rain) {
          g.beginPath()
          g.moveTo(px(u), py(v))
          g.lineTo(px(u) - 2, py(v) + 8)
          g.stroke()
        } else {
          g.fillRect(px(u), py(v), 1.6 * sp, 1.6 * sp)
        }
      }
    }
    if (wx.wind > 8 && wx.swe === 0 && !reduced) {
      // spindrift off the ridge
      g.fillStyle = 'rgba(240, 246, 252, 0.28)'
      for (const p of PATHS) {
        const c = gullyPoint(PATHS.indexOf(p), 0)
        for (let k = 0; k < 6; k++) {
          const ph = (t * 0.6 + k / 6) % 1
          g.beginPath()
          g.ellipse(px(c.u + ph * 0.05), py(c.v - 0.04 + ph * 0.02), 10 + ph * 22, 3 + ph * 4, 0, 0, Math.PI * 2)
          g.fill()
        }
      }
    }
  }

  function slideAnim(g, a, now) {
    const k = clamp((now - a.start) / a.dur, 0, 1)
    if (k >= 1) return false
    const runEnd = a.reaches ? 1.28 : 0.98 + 0.25 * clamp(a.M / PATHS[a.path].reach, 0, 1)
    const head = ease(Math.min(1, k * 1.25)) * runEnd
    const r = rand(a.seed)
    const size = 6 + Math.sqrt(a.M) * 2.2
    // the crown: a fracture line opening across the start zone
    {
      const c = gullyPoint(a.path, 0.04)
      const hw = gullyHalf(a.path, 0.04) * 0.95
      const open = clamp(k / 0.12, 0, 1)
      g.strokeStyle = `rgba(6, 16, 32, ${0.9 * (1 - k * 0.4)})`
      g.lineWidth = 2
      g.beginPath()
      for (let i = 0; i <= 10; i++) {
        const f = (i / 10 - 0.5) * 2 * open
        const yy = py(c.v) + (i % 2 ? 2 : -1.5)
        i ? g.lineTo(px(c.u + f * hw), yy) : g.moveTo(px(c.u + f * hw), yy)
      }
      g.stroke()
    }
    // slab blocks breaking up and running down the track
    if (k > 0.08) {
      const kk = (k - 0.08) / 0.92
      for (let i = 0; i < 16; i++) {
        const lag = r() * 0.3
        const s0 = Math.max(0, ease(Math.min(1, kk * 1.35)) * runEnd - lag)
        const pt = s0 <= 1 ? gullyPoint(a.path, s0) : { u: gullyPoint(a.path, 1).u, v: lerp(gullyPoint(a.path, 1).v, LINE_V + 0.03, (s0 - 1) / 0.28) }
        const off = (r() - 0.5) * gullyHalf(a.path, Math.min(1, s0)) * 1.4
        const bw = 3 + r() * 5
        g.save()
        g.translate(px(pt.u + off), py(pt.v))
        g.rotate(kk * 8 * (r() - 0.5))
        g.fillStyle = `rgba(250, 252, 255, ${1 - kk * 0.5})`
        g.fillRect(-bw / 2, -bw / 3, bw, bw * 0.66)
        g.strokeStyle = `rgba(30, 60, 100, ${0.6 * (1 - kk * 0.5)})`
        g.lineWidth = 0.8
        g.strokeRect(-bw / 2, -bw / 3, bw, bw * 0.66)
        g.restore()
      }
    }
    for (let i = 0; i < 26; i++) {
      const lag = r() * 0.35
      const s = Math.max(0, head - lag)
      let pt
      if (s <= 1) pt = gullyPoint(a.path, s)
      else {
        const f = gullyPoint(a.path, 1)
        pt = { u: f.u, v: lerp(f.v, LINE_V + 0.03, (s - 1) / 0.28) }
      }
      const spread = (r() - 0.5) * gullyHalf(a.path, Math.min(1, s)) * 2.2
      const fade = (1 - k) * (1 - lag)
      g.fillStyle = `rgba(246, 250, 255, ${0.55 * fade})`
      g.beginPath()
      g.arc(px(pt.u + spread), py(pt.v) - r() * size, size * (0.5 + r()) * (0.6 + lag * 2), 0, Math.PI * 2)
      g.fill()
    }
    if (a.trigger === 'charge' && k < 0.25) {
      const c = gullyPoint(a.path, 0.08)
      g.fillStyle = `rgba(255, 120, 90, ${1 - k * 4})`
      g.beginPath()
      g.arc(px(c.u), py(c.v), 4 + k * 60, 0, Math.PI * 2)
      g.fill()
    }
    return true
  }

  /**
   * state: { day, row, wx, selected, lineStatus, debris:[{path,M,reaches,age,seed}],
   *          fenced[], stamped[], charges:[path], anims:[], t, reduced, train, phase }
   */
  function draw(g, state) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    const key = sky(g, state.wx, state.phase)
    g.drawImage(far, 0, 0, W, H)
    g.drawImage(rock, 0, 0, W, H)
    const mean = state.row.hs.reduce((a, b) => a + b, 0) / state.row.hs.length
    const cover = clamp(mean / 230, 0, 1)
    for (let b = 0; b < 5; b++) {
      const k = clamp(cover * 5 - b, 0, 1)
      if (k <= 0) continue
      g.globalAlpha = k
      g.drawImage(snowBuckets[b], 0, 0, W, H)
    }
    g.globalAlpha = 1
    for (let p = 0; p < PATHS.length; p++) drawGully(g, p, state.row.hs[p], state.row.minSI[p], state)
    g.drawImage(apron, 0, 0, W, H)
    for (const p of state.charges) {
      const c = gullyPoint(p, 0.08)
      g.strokeStyle = '#ff5b4a'
      g.lineWidth = 2.4
      g.beginPath()
      g.moveTo(px(c.u) - 6, py(c.v) - 6)
      g.lineTo(px(c.u) + 6, py(c.v) + 6)
      g.moveTo(px(c.u) + 6, py(c.v) - 6)
      g.lineTo(px(c.u) - 6, py(c.v) + 6)
      g.stroke()
    }
    railway(g, state)
    for (const d of state.debris) fan(g, d.path, d.M, d.reaches, clamp(1 - d.age / 14, 0.2, 1), d.seed)
    hutAndCat(g, state)
    state.anims = state.anims.filter((a) => slideAnim(g, a, state.t))
    weather(g, state.wx, state.t, state.reduced, key)
    g.globalCompositeOperation = 'source-over'
    g.drawImage(grain, 0, 0, W, H)
    // print margin
    g.strokeStyle = 'rgba(240, 246, 252, 0.6)'
    g.lineWidth = 1
    g.strokeRect(6.5, 6.5, W - 13, H - 13)
    return state.anims
  }

  const api = { resize, draw, label: (p) => gullyPoint(p, 0), sized: 0 }
  return api
}

/**
 * The strata wall.
 * strata: { offsets: Int32Array(DAYS+1), data: Float32Array(n*6) }
 * opts: { mode, day, events (this path), traceId, slabIds, maxH, ghost }
 */
export function drawStrata(g, W, H, dpr, strata, opts) {
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  g.fillStyle = '#eef1ec'
  g.fillRect(0, 0, W, H)
  const left = 34
  const right = 8
  const top = 10
  const bottom = 18
  const cw = (W - left - right) / DAYS
  const maxH = opts.maxH
  const y = (cm) => H - bottom - (cm / maxH) * (H - top - bottom)
  // grid
  g.strokeStyle = 'rgba(30, 50, 70, 0.12)'
  g.fillStyle = 'rgba(30, 50, 70, 0.6)'
  g.font = '10px ui-monospace, Menlo, monospace'
  g.lineWidth = 1
  for (let cm = 0; cm <= maxH; cm += 50) {
    g.beginPath()
    g.moveTo(left, y(cm) + 0.5)
    g.lineTo(W - right, y(cm) + 0.5)
    g.stroke()
    if (cm % 100 === 0) g.fillText(`${cm}`, 4, y(cm) + 3)
  }
  const { offsets, data } = strata
  let traceTops = []
  const weakMarks = []
  for (let d = 0; d < DAYS; d++) {
    const x = left + d * cw
    g.globalAlpha = opts.grow != null && d > opts.grow ? 0.16 : 1
    let base = 0
    for (let k = offsets[d]; k < offsets[d + 1]; k++) {
      const o = k * 6
      const id = data[o]
      const h = data[o + 1]
      const gr = data[o + 2]
      const si = data[o + 3]
      const wet = data[o + 5]
      const y0 = y(base)
      const y1 = y(base + h)
      g.fillStyle = opts.mode === 'stability' ? siColor(si) : GRAIN_COLORS[gr]
      g.fillRect(x, y1, cw + 0.6, Math.max(0.6, y0 - y1))
      if (opts.mode !== 'stability' && gr >= 3 && gr <= 6 && base > 0 && h < 30) weakMarks.push([x, (y0 + y1) / 2, gr, g.globalAlpha])
      if (wet) {
        g.fillStyle = 'rgba(30, 90, 200, 0.35)'
        g.fillRect(x, y1, cw + 0.6, Math.max(0.6, y0 - y1))
      }
      if (opts.traceId && id === opts.traceId) traceTops.push([x, y1, y0])
      else if (opts.slabIds && opts.slabIds.has(id) && d <= opts.traceDay) {
        g.fillStyle = 'rgba(255,255,255,0.28)'
        g.fillRect(x, y1, cw + 0.6, Math.max(0.6, y0 - y1))
      }
      base += h
    }
    // surface line
    g.fillStyle = 'rgba(10, 30, 60, 0.75)'
    g.fillRect(x, y(base) - 1, cw + 0.6, 1.2)
  }
  // buried weak layers are thin; give them a readable band with an outline
  for (const [x, ym, gr, a] of weakMarks) {
    g.globalAlpha = a
    g.fillStyle = 'rgba(11, 20, 36, 0.85)'
    g.fillRect(x, ym - 2.5, cw + 0.6, 5)
    g.fillStyle = GRAIN_COLORS[gr]
    g.fillRect(x, ym - 1.5, cw + 0.6, 3)
  }
  g.globalAlpha = 1
  if (traceTops.length) {
    g.strokeStyle = '#0b1424'
    g.lineWidth = 1.6
    g.beginPath()
    traceTops.forEach(([x, y1], i) => (i ? g.lineTo(x + cw / 2, y1) : g.moveTo(x + cw / 2, y1)))
    g.stroke()
    g.beginPath()
    traceTops.forEach(([x, , y0], i) => (i ? g.lineTo(x + cw / 2, y0) : g.moveTo(x + cw / 2, y0)))
    g.stroke()
  }
  // releases on this path
  for (const e of opts.events) {
    const x = left + e.day * cw + cw / 2
    g.strokeStyle = e.outcome === 'caught' ? '#c62d2d' : '#0b1424'
    g.lineWidth = e.key === opts.selectedKey ? 2.4 : 1.2
    g.setLineDash(e.trigger === 'charge' ? [3, 2] : [])
    g.beginPath()
    g.moveTo(x, top)
    g.lineTo(x, H - bottom)
    g.stroke()
    g.setLineDash([])
    g.fillStyle = e.outcome === 'caught' ? '#c62d2d' : e.reaches ? '#ffffff' : '#0b1424'
    g.strokeStyle = '#0b1424'
    g.beginPath()
    g.moveTo(x - 5, top)
    g.lineTo(x + 5, top)
    g.lineTo(x, top + 8)
    g.closePath()
    g.fill()
    g.stroke()
  }
  // month ticks
  g.fillStyle = 'rgba(30, 50, 70, 0.7)'
  ;[['Dec', 0], ['Jan', 31], ['Feb', 62], ['Mar', 90]].forEach(([m, d]) => {
    g.fillText(m, left + d * cw + 2, H - 5)
    g.fillRect(left + d * cw, H - bottom, 1, 4)
  })
  // the day cursor
  const cx = left + opts.day * cw + cw / 2
  g.strokeStyle = '#0b1424'
  g.lineWidth = 1
  g.setLineDash([2, 2])
  g.beginPath()
  g.moveTo(cx, top)
  g.lineTo(cx, H - bottom)
  g.stroke()
  g.setLineDash([])
  return { left, right, top, bottom, cw, y }
}
