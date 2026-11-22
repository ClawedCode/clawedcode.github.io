// Darkroom physics for safe.light(): three negatives drawn analytically, a
// two-emulsion variable-contrast paper, developer kinetics and the judge that
// reads detail off the finished print. No DOM in here so the balance can be
// checked headless.

export const W = 300
export const H = 375
export const N = W * H
const PX = 1 / W

export const D_MIN = 0.06
export const D_MAX = 2.05
export const NEG_BASE = 0.22
export const NEG_GAMMA = 0.6
export const SEPARATION = 0.1
export const LAMP = 2

// variable contrast: filter grade sets how much light reaches each emulsion
export const GRADES = [
  { id: 0, label: '0', g: 1.0, b: 0.05 },
  { id: 1, label: '1', g: 0.78, b: 0.16 },
  { id: 2, label: '2', g: 0.55, b: 0.3 },
  { id: 3, label: '3', g: 0.34, b: 0.5 },
  { id: 4, label: '4', g: 0.16, b: 0.78 },
  { id: 5, label: '5', g: 0.04, b: 1.1 }
]
// soft (green) emulsion: long scale. hard (blue) emulsion: short scale.
const SOFT_C = 0.02
const SOFT_W = 0.26
const HARD_C = 0.05
const HARD_W = 0.085

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const mix = (a, b, t) => a + (b - a) * t
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
const cov = d => clamp(0.5 - d / PX, 0, 1)
const hash = (x, y) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
const vnoise = (x, y) => {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  return mix(mix(hash(xi, yi), hash(xi + 1, yi), u), mix(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v)
}
const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1 + 7, y * 2.1 + 3) * 0.3 + vnoise(x * 4.3 + 1, y * 4.3 + 9) * 0.15

const sdCircle = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) - r
const sdBox = (x, y, cx, cy, hx, hy) => {
  const dx = Math.abs(x - cx) - hx
  const dy = Math.abs(y - cy) - hy
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0)
}
const sdEllipse = (x, y, cx, cy, rx, ry) => (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry)
const sdSeg = (x, y, ax, ay, bx, by, r) => {
  const px = x - ax
  const py = y - ay
  const vx = bx - ax
  const vy = by - ay
  const h = clamp((px * vx + py * vy) / (vx * vx + vy * vy), 0, 1)
  return Math.hypot(px - vx * h, py - vy * h) - r
}
const sdTri = (x, y, ax, ay, bx, by, cx, cy) => {
  const e = [[ax, ay, bx, by], [bx, by, cx, cy], [cx, cy, ax, ay]]
  let d = Infinity
  let s = 0
  for (const [x0, y0, x1, y1] of e) {
    d = Math.min(d, sdSeg(x, y, x0, y0, x1, y1, 0))
    const c = (x1 - x0) * (y - y0) - (y1 - y0) * (x - x0)
    s += c > 0 ? 1 : -1
  }
  return Math.abs(s) === 3 ? -d : d
}
const smin = (a, b, k) => {
  const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1)
  return mix(b, a, h) - k * h * (1 - h)
}

// a seated cat, facing the camera. s scales; returns signed distance and eye centres
const catSit = (x, y, cx, cy, s) => {
  const body = sdEllipse(x, y, cx, cy + 0.02 * s, 0.075 * s, 0.1 * s)
  const haunch = sdEllipse(x, y, cx, cy + 0.075 * s, 0.092 * s, 0.05 * s)
  const head = sdEllipse(x, y, cx, cy - 0.105 * s, 0.056 * s, 0.05 * s)
  const earL = sdTri(x, y, cx - 0.054 * s, cy - 0.12 * s, cx - 0.044 * s, cy - 0.185 * s, cx - 0.014 * s, cy - 0.142 * s)
  const earR = sdTri(x, y, cx + 0.054 * s, cy - 0.12 * s, cx + 0.044 * s, cy - 0.185 * s, cx + 0.014 * s, cy - 0.142 * s)
  const tail = Math.min(
    sdSeg(x, y, cx + 0.07 * s, cy + 0.1 * s, cx + 0.13 * s, cy + 0.08 * s, 0.014 * s),
    sdSeg(x, y, cx + 0.13 * s, cy + 0.08 * s, cx + 0.15 * s, cy + 0.02 * s, 0.013 * s)
  )
  let d = smin(body, haunch, 0.02 * s)
  d = smin(d, head, 0.025 * s)
  d = Math.min(d, earL, earR, tail)
  return d
}
const catEyes = (cx, cy, s) => [
  [cx - 0.022 * s, cy - 0.108 * s, 0.0105 * s],
  [cx + 0.022 * s, cy - 0.108 * s, 0.0105 * s]
]

// ---------------------------------------------------------------------------
// Each frame on the roll: logL(x,y) is scene log-luminance; tag(x,y) names the
// region a judge pixel belongs to. Targets compare mean print density of two
// tagged regions; detail is held when they print at least SEPARATION apart.

const STAIR = {
  id: 'stair',
  frame: '07',
  title: 'The Stair',
  note: 'A cat on the second tread, under the hall lamp. A soft negative. Find the time.',
  targets: [
    { id: 'eyes', short: 'eyes', label: 'Lamp in its eyes', a: 'eye', b: 'face', kind: 'mid' },
    { id: 'grain', short: 'grain', label: 'Grain in the banister', a: 'grainA', b: 'grainB', kind: 'mid' },
    { id: 'shade', short: 'pleats', label: 'Pleats in the lampshade', a: 'pleatA', b: 'pleatB', kind: 'high' }
  ],
  sample (x, y) {
    let L = 1.0 + 0.85 * Math.exp(-((x - 0.8) ** 2 + (y - 0.24) ** 2) / 0.07)
    L += (fbm(x * 9, y * 9) - 0.5) * 0.05
    let tag = ''
    // sconce: shade with pleats, bulb glow above it
    const shade = sdTri(x, y, 0.74, 0.22, 0.86, 0.22, 0.8, 0.13)
    const shadeB = Math.max(sdBox(x, y, 0.8, 0.205, 0.07, 0.035), shade - 0.012)
    const glow = Math.exp(-((x - 0.8) ** 2 + (y - 0.11) ** 2) / 0.0012)
    L = Math.max(L, 1.6 + 0.35 * glow)
    const inShade = Math.min(shade, shadeB)
    if (inShade < 0) {
      const pleat = Math.sin((x - 0.8) * 160) > 0
      L = mix(L, pleat ? 1.62 : 1.42, cov(inShade))
      if (inShade < -0.006) tag = pleat ? 'pleatA' : 'pleatB'
    }
    // stairs: horizontal treads coming toward camera
    if (y > 0.7) {
      const k = (y - 0.7) / 0.11
      const f = k - Math.floor(k)
      const tread = f < 0.36
      const nose = f > 0.33 && f < 0.4
      const lit = 0.25 * Math.exp(-((x - 0.7) ** 2) / 0.2)
      L = tread ? 1.12 + lit : nose ? 0.55 : 0.68 + lit * 0.5
      L += (fbm(x * 30, y * 4) - 0.5) * 0.06
    }
    // banister: diagonal rail with grain, balusters down to the treads
    const rx0 = 0.0
    const ry0 = 0.5
    const rx1 = 1.0
    const ry1 = 0.84
    const rail = sdSeg(x, y, rx0, ry0, rx1, ry1, 0.03)
    for (let b = 0; b < 6; b++) {
      const bx = 0.06 + b * 0.18
      const by = mix(ry0, ry1, bx) + 0.02
      const bal = sdBox(x, y, bx, by + 0.25, 0.011, 0.25)
      if (bal < 0) L = mix(L, 0.62 + 0.18 * sstep(-0.011, 0.011, x - bx), cov(bal))
    }
    if (rail < 0) {
      const along = (x - rx0) * 0.95 + (y - ry0) * 0.3
      const across = ((y - ry0) - (x - rx0) * (ry1 - ry0))
      const g = Math.sin(across * 520 + Math.sin(along * 18) * 2.2)
      const top = sstep(0.03, -0.03, across)
      L = mix(L, 0.92 + 0.14 * top + (g > 0 ? 0.11 : -0.04), cov(rail))
      if (rail < -0.006) tag = g > 0.35 ? 'grainA' : g < -0.35 ? 'grainB' : tag
    }
    // the cat on the second tread
    const cx = 0.42
    const cy = 0.83
    const c = catSit(x, y, cx, cy, 1.25)
    if (c < 0) {
      const rim = sstep(-0.012, 0, c) * sstep(0.95, 0.7, y)
      L = mix(L, 0.46 + rim * 0.22, cov(c))
      if (c < -0.01) tag = 'face'
      if (y > cy - 0.04 || Math.abs(x - cx) > 0.07) tag = c < -0.01 ? 'body' : ''
    }
    for (const [ex, ey, er] of catEyes(cx, cy, 1.25)) {
      const e = sdEllipse(x, y, ex, ey, er, er * 0.8)
      if (e < 0) {
        L = mix(L, 1.08, cov(e))
        if (e < -0.002) tag = 'eye'
      }
    }
    return [L, tag]
  }
}

const WINDOW = {
  id: 'window',
  frame: '08',
  title: 'The Window',
  note: 'A cat on the sill against a moon window. The negative holds lace and fur. Paper will not hold both at once.',
  targets: [
    { id: 'lace', short: 'lace', label: 'Lace in the curtain', a: 'lace', b: 'gap', kind: 'high' },
    { id: 'eyes', short: 'eyes', label: 'Eyes against the dark', a: 'eye', b: 'fur', kind: 'low' },
    { id: 'paper', short: 'roses', label: 'Roses on the wallpaper', a: 'roseA', b: 'roseB', kind: 'low' }
  ],
  sample (x, y) {
    let tag = ''
    // damask wallpaper in a dark room
    const mx = (x * 9) % 1
    const my = ((y + (Math.floor(x * 9) % 2) * 0.055) * 9) % 1
    const rose = Math.hypot(mx - 0.5, my - 0.5) < 0.26 + 0.06 * Math.sin(Math.atan2(my - 0.5, mx - 0.5) * 5)
    let L = rose ? 0.68 : 0.52
    L += 0.1 * Math.exp(-((x - 0.55) ** 2 + (y - 0.8) ** 2) / 0.12)
    tag = rose ? 'roseA' : 'roseB'
    const win = sdBox(x, y, 0.55, 0.46, 0.3, 0.34)
    if (win < 0.025) {
      tag = ''
      L = mix(L, 0.42, cov(win - 0.025))
    }
    if (win < 0) {
      // night sky, a moon, the lace on the left pane
      let sky = 2.55 + 0.25 * sstep(0.8, 0.15, y)
      const moon = sdCircle(x, y, 0.71, 0.27, 0.055)
      sky = Math.max(sky, 2.85 + 0.3 * cov(moon))
      L = mix(L, sky, cov(win))
      const curtain = sdBox(x, y, 0.38, 0.46, 0.14, 0.34)
      if (curtain < 0) {
        const u = (x - 0.24) * 64
        const v = (y - 0.12) * 64
        const motif = Math.sin(u) * Math.sin(v) + 0.6 * Math.sin((u + v) * 0.5)
        const fold = 0.12 * Math.sin(x * 70)
        const thread = motif > 0.25
        L = mix(L, (thread ? 2.32 : 2.62) - fold + (curtain > -0.03 ? -0.12 : 0), cov(curtain))
        if (curtain < -0.01 && win < -0.01) tag = thread && motif > 0.55 ? 'lace' : motif < -0.1 ? 'gap' : ''
      }
      // mullions
      const mul = Math.min(sdBox(x, y, 0.55, 0.46, 0.013, 0.34), sdBox(x, y, 0.55, 0.47, 0.3, 0.011))
      if (mul < 0) {
        L = mix(L, 0.46, cov(mul))
        tag = ''
      }
    }
    // the sill, lit from above by the window
    const sill = sdBox(x, y, 0.55, 0.835, 0.36, 0.03)
    if (sill < 0) {
      L = mix(L, 1.15 - (y - 0.805) * 9, cov(sill))
      tag = ''
    }
    if (y > 0.865) {
      L = 0.36 + (fbm(x * 14, y * 14) - 0.5) * 0.04
      tag = ''
    }
    // the cat, backlit, sitting on the sill
    const cx = 0.57
    const cy = 0.66
    const c = catSit(x, y, cx, cy, 1.45)
    if (c < 0) {
      const rim = sstep(-0.01, 0, c) * sstep(0.7, 0.5, y)
      L = mix(L, 0.3 + rim * 0.55, cov(c))
      tag = c < -0.012 ? 'fur' : ''
    }
    for (const [ex, ey, er] of catEyes(cx, cy, 1.45)) {
      const e = sdEllipse(x, y, ex, ey, er, er * 0.75)
      if (e < 0) {
        L = mix(L, 0.66, cov(e))
        if (e < -0.002) tag = 'eye'
      }
    }
    return [L, tag]
  }
}

const LIGHTHOUSE = {
  id: 'lighthouse',
  frame: '09',
  title: 'The Lighthouse',
  note: 'The lamp, its beam through fog, and a small boat in the dark water. The last frame on the roll.',
  targets: [
    { id: 'lamp', short: 'bars', label: 'Bars across the lamp', a: 'bar', b: 'glow', kind: 'high' },
    { id: 'fog', short: 'fog', label: 'Fog banks in the beam', a: 'fogA', b: 'fogB', kind: 'high' },
    { id: 'boat', short: 'boat', label: 'The cat in the boat', a: 'boatcat', b: 'water', kind: 'low' }
  ],
  secret: { id: 'ghost', label: 'Something standing in the beam', a: 'ghost', b: 'ghostRing', kind: 'high' },
  sample (x, y) {
    let tag = ''
    let L = 0.42 + 0.22 * sstep(0.9, 0.1, y)
    const st = hash(Math.floor(x * 90), Math.floor(y * 90))
    if (st > 0.985 && y < 0.7) L = Math.max(L, 1.0 + (st - 0.985) * 60 * cov(Math.hypot((x * 90 % 1) - 0.5, (y * 90 % 1) - 0.5) * PX * 18 - PX * 4))
    const lx = 0.79
    const ly = 0.25
    // beam through fog, sweeping left
    const ang = Math.atan2(y - ly, x - lx)
    const dist = Math.hypot(x - lx, y - ly)
    const beamDir = Math.PI + 0.12
    const da = Math.abs(((ang - beamDir + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
    const spread = 0.12 + dist * 0.05
    const inBeam = sstep(spread, spread * 0.55, da) * sstep(0.02, 0.08, dist)
    const fogN = fbm(x * 7 + 3, y * 11)
    const beamL = 2.42 - dist * 0.55 + (fogN - 0.5) * 0.32
    L = mix(L, Math.max(L, beamL), inBeam)
    if (inBeam > 0.9 && dist > 0.12 && dist < 0.55) tag = fogN > 0.58 ? 'fogA' : fogN < 0.42 ? 'fogB' : ''
    // halo
    L = Math.max(L, 1.3 + 1.55 * Math.exp(-(dist * dist) / 0.0035))
    // headland and tower
    const head = y > 0.74 - 0.18 * sstep(0.55, 1.0, x) + 0.03 * Math.sin(x * 23)
    const tower = Math.max(sdBox(x, y, lx, 0.52, 0.05 + (y - 0.3) * 0.06, 0.24), -(y - 0.29))
    const gallery = sdBox(x, y, lx, 0.29, 0.07, 0.008)
    if (tower < 0 || gallery < 0) {
      const band = Math.floor((y - 0.3) / 0.07) % 2 === 0
      L = mix(L, band ? 0.34 : 0.27, cov(Math.min(tower, gallery)))
      tag = ''
    }
    const lantern = sdBox(x, y, lx, ly, 0.038, 0.035)
    if (lantern < 0) {
      const barPos = ((x - lx + 0.038) / 0.019) % 1
      const isBar = barPos < 0.24
      L = mix(L, isBar ? 2.42 : 3.0, cov(lantern))
      if (lantern < -0.004) tag = isBar ? 'bar' : barPos > 0.4 && barPos < 0.84 ? 'glow' : ''
    }
    const roof = sdTri(x, y, lx - 0.048, ly - 0.035, lx + 0.048, ly - 0.035, lx, ly - 0.085)
    if (roof < 0) {
      L = mix(L, 0.3, cov(roof))
      tag = ''
    }
    if (head && tower > 0 && x > 0.5) {
      L = 0.2 + (fbm(x * 20, y * 20) - 0.5) * 0.08
      tag = ''
    }
    // the sea, with the beam laid on it in broken streaks
    if (y > 0.78 && !(head && x > 0.5)) {
      const ripple = Math.sin(y * 260 + Math.sin(x * 40) * 2) * 0.5 + 0.5
      const streak = sstep(0.18, 0.0, Math.abs(x - 0.5 + (y - 0.78) * 0.2)) * ripple
      L = 0.44 + streak * 0.75 + (fbm(x * 30, y * 60) - 0.5) * 0.06
      tag = y > 0.86 && Math.abs(x - 0.3) < 0.16 && streak < 0.08 ? 'water' : ''
    }
    // a rowboat, a cat aboard
    const hull = Math.max(sdEllipse(x, y, 0.3, 0.94, 0.12, 0.035), -(y - 0.93))
    if (hull < 0) {
      L = mix(L, 0.17, cov(hull))
      tag = ''
    }
    const c = catSit(x, y, 0.3, 0.875, 0.55)
    if (c < 0) {
      L = mix(L, 0.13, cov(c))
      tag = c < -0.004 ? 'boatcat' : ''
    }
    // a second cat, standing in the fog where nobody was
    const g = catSit(x, y, 0.4, 0.29, 0.7)
    const gIn = inBeam > 0.8
    if (gIn && g < 0.03) {
      const ghost = sstep(0.004, -0.004, g)
      L -= ghost * 0.15 * inBeam
      if (g < -0.008) tag = 'ghost'
      else if (g > 0.012) tag = 'ghostRing'
    }
    return [L, tag]
  }
}

export const ROLL = [STAIR, WINDOW, LIGHTHOUSE]

// Build a negative: density per pixel with grain, the transmittance the
// enlarger light sees, and judge masks.
export function buildNegative (frame) {
  const dens = new Float32Array(N)
  const trans = new Float32Array(N)
  const tags = new Array(N)
  const masks = {}
  const sub = [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = j * W + i
      let acc = 0
      for (const [sx, sy] of sub) acc += frame.sample((i + sx) * PX, (j + sy) * PX)[0]
      const logL = acc / sub.length
      const [, tag] = frame.sample((i + 0.5) * PX, (j + 0.5) * PX)
      const grain = (hash(i * 1.37, j * 2.11) - 0.5) * 0.035 + (hash(i * 0.31 + 4, j * 0.29 + 1) - 0.5) * 0.02
      const d = NEG_BASE + NEG_GAMMA * Math.max(0, logL) + grain
      dens[k] = d
      trans[k] = Math.pow(10, -d)
      tags[k] = tag
      if (tag) (masks[tag] || (masks[tag] = [])).push(k)
    }
  }
  // a few dust specks on the negative print white on the paper
  const dust = []
  for (let n = 0; n < 7; n++) {
    const cx = hash(n * 9.1 + frame.frame.charCodeAt(1), 3.3) * W
    const cy = hash(2.7, n * 5.3 + frame.frame.charCodeAt(1)) * H
    const r = 0.6 + hash(n, n * 2) * 1.2
    dust.push([cx, cy, r])
  }
  for (const [cx, cy, r] of dust) {
    for (let j = Math.max(0, Math.floor(cy - r - 1)); j < Math.min(H, cy + r + 1); j++) {
      for (let i = Math.max(0, Math.floor(cx - r - 1)); i < Math.min(W, cx + r + 1); i++) {
        const f = clamp(r - Math.hypot(i - cx, j - cy) + 0.5, 0, 1)
        const k = j * W + i
        trans[k] *= 1 - f * 0.9
      }
    }
  }
  const masksTyped = {}
  for (const [k, v] of Object.entries(masks)) masksTyped[k] = Int32Array.from(v)
  return { frame, dens, trans, masks: masksTyped }
}

// unevenness field the developer leaves when the tray is not rocked
export function buildUnevenness (seed = 1) {
  const u = new Float32Array(N)
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      u[j * W + i] = fbm(i / 38 + seed * 3.1, j / 38 + seed * 1.7)
    }
  }
  return u
}

export function freshSheet () {
  return {
    eg: new Float32Array(N), // exposure seen by the soft emulsion
    eb: new Float32Array(N), // exposure seen by the hard emulsion
    latent: new Float32Array(N), // developed-to-completion fraction 0..1
    dev: new Float32Array(N), // per-pixel development in standard units
    exposures: [],
    latentDirty: true,
    fog: 0,
    devMax: 0
  }
}

const logistic = x => 1 / (1 + Math.exp(-x))

// light one frame of exposure through the negative and the tool mask
export function expose (sheet, neg, gradeId, seconds, mask) {
  const gr = GRADES[gradeId]
  const tg = seconds * gr.g * LAMP
  const tb = seconds * gr.b * LAMP
  const { eg, eb } = sheet
  const tr = neg.trans
  if (mask) {
    for (let k = 0; k < N; k++) {
      const e = tr[k] * mask[k]
      eg[k] += e * tg
      eb[k] += e * tb
    }
  } else {
    for (let k = 0; k < N; k++) {
      eg[k] += tr[k] * tg
      eb[k] += tr[k] * tb
    }
  }
  sheet.latentDirty = true
}

export function latentOf (eg, eb) {
  const s = logistic((Math.log10(eg + 1e-6) - SOFT_C) / SOFT_W)
  const h = logistic((Math.log10(eb + 1e-6) - HARD_C) / HARD_W)
  const c = 1 - (1 - s) * (1 - h)
  // subtract the threshold so unexposed paper stays paper white
  return clamp((c - 0.004) / 0.996, 0, 1)
}

export function updateLatent (sheet) {
  if (!sheet.latentDirty) return
  const { eg, eb, latent } = sheet
  for (let k = 0; k < N; k++) latent[k] = latentOf(eg[k], eb[k])
  sheet.latentDirty = false
}

// fraction of final density reached after u standard developments
const devFrac = (c, u) => 1 - Math.exp(-3.2 * u * (0.7 + 0.6 * c))
const devNorm = c => devFrac(c, 1)

export function densityAt (c, u) {
  if (u <= 0) return D_MIN
  const f = Math.min(1.05, devFrac(c, u) / devNorm(c))
  const over = u > 2 ? (u - 2) * 0.035 : 0
  return Math.min(D_MAX + 0.04, D_MIN + (D_MAX - D_MIN) * c * f + over)
}

// one developer step: agitation 0..1 keeps fresh developer at the surface
export function develop (sheet, uneven, du, agitation) {
  const { dev } = sheet
  const slack = (1 - agitation) * 0.55
  let mx = 0
  for (let k = 0; k < N; k++) {
    const v = dev[k] + du * (1 - slack * uneven[k])
    dev[k] = v
    if (v > mx) mx = v
  }
  sheet.devMax = mx
}

// whole-sheet developed density, with fog from room light on unfixed paper
export function finalDensity (sheet, out = new Float32Array(N)) {
  updateLatent(sheet)
  const { latent, dev, fog } = sheet
  for (let k = 0; k < N; k++) {
    const c = latent[k]
    let d = densityAt(c, dev[k])
    if (fog > 0) d = Math.min(D_MAX, d + fog * (1 - c * 0.55))
    out[k] = d
  }
  return out
}

const meanOf = (arr, idx) => {
  if (!idx || !idx.length) return NaN
  let s = 0
  for (let n = 0; n < idx.length; n++) s += arr[idx[n]]
  return s / idx.length
}

export function judgePrint (neg, density) {
  const frame = neg.frame
  const list = frame.secret ? [...frame.targets, frame.secret] : frame.targets
  const results = list.map(t => {
    const a = meanOf(density, neg.masks[t.a])
    const b = meanOf(density, neg.masks[t.b])
    const sep = Math.abs(a - b)
    let why = 'held'
    if (sep < SEPARATION) {
      const m = (a + b) / 2
      why = m > 1.55 ? 'blocked' : m < 0.4 ? 'burnt out' : 'flat'
    }
    return { id: t.id, label: t.label, held: sep >= SEPARATION, sep, a, b, why, secret: t === frame.secret }
  })
  let lo = Infinity
  let hi = -Infinity
  for (let k = 0; k < N; k += 3) {
    if (density[k] < lo) lo = density[k]
    if (density[k] > hi) hi = density[k]
  }
  return { results, white: lo, black: hi, fullScale: lo < 0.2 && hi > 1.75 }
}

// Read a developed test strip band by band: which targets that fall inside
// the strip are held at each step, and the mean tone of each band.
export function judgeStrip (neg, density, top, steps = 5) {
  const bw = W / steps
  const bottom = top + STRIP_H
  const pick = (idx, x0, x1) => {
    if (!idx) return NaN
    let s = 0
    let n = 0
    for (let q = 0; q < idx.length; q++) {
      const k = idx[q]
      const y = (k / W) | 0
      const x = k - y * W
      if (y >= top && y < bottom && x >= x0 && x < x1) {
        s += density[k]
        n++
      }
    }
    return n >= 6 ? s / n : NaN
  }
  return Array.from({ length: steps }, (_, b) => {
    const x0 = b * bw
    const x1 = (b + 1) * bw
    const results = []
    for (const t of neg.frame.targets) {
      const a = pick(neg.masks[t.a], x0, x1)
      const c = pick(neg.masks[t.b], x0, x1)
      if (Number.isNaN(a) || Number.isNaN(c)) continue
      const sep = Math.abs(a - c)
      results.push({ id: t.id, short: t.short, held: sep >= SEPARATION, sep })
    }
    let s = 0
    let n = 0
    for (let j = top; j < bottom; j++) {
      for (let i = Math.floor(x0); i < x1; i++) {
        s += density[j * W + i]
        n++
      }
    }
    return { band: b, results, mean: s / n }
  })
}

// Masks for the hand tools, in sheet pixels. pen = penumbra width in pixels.
export function toolMask (out, tool, cx, cy, r, pen) {
  if (tool === 'none') {
    out.fill(1)
    return out
  }
  const r0 = r - pen * 0.5
  const inv = 1 / pen
  const x0 = Math.max(0, Math.floor(cx - r - pen * 2))
  const x1 = Math.min(W, Math.ceil(cx + r + pen * 2))
  const y0 = Math.max(0, Math.floor(cy - r - pen * 2))
  const y1 = Math.min(H, Math.ceil(cy + r + pen * 2))
  if (tool === 'dodge') {
    out.fill(1)
    for (let j = y0; j < y1; j++) {
      for (let i = x0; i < x1; i++) {
        const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cy) - r0
        out[j * W + i] = clamp(d * inv, 0, 1) * 0.97 + 0.03
      }
    }
    // the wire the dodger hangs on: a thin shadow out to the sheet edge
    const wx = cx > W / 2 ? W : 0
    const steps = Math.ceil(Math.abs(wx - cx))
    for (let s = 0; s < steps; s++) {
      const i = Math.floor(cx + (wx - cx) * (s / steps))
      const j = Math.floor(cy + r * 0.2 + (s / steps) * 4)
      if (i >= 0 && i < W && j >= 0 && j < H) out[j * W + i] *= 0.82
    }
    return out
  }
  // burning card: blocks everything but the hole
  out.fill(0.02)
  for (let j = y0; j < y1; j++) {
    for (let i = x0; i < x1; i++) {
      const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cy) - r0
      out[j * W + i] = clamp(-d * inv + 0.5, 0, 1) * 0.98 + 0.02
    }
  }
  return out
}

// test strip: 5 bands across a horizontal strip centred at sy (pixels)
export const STRIP_H = Math.round(H * 0.24)
export function stripMask (out, sy, step, steps = 5) {
  out.fill(0)
  const top = clamp(Math.round(sy - STRIP_H / 2), 0, H - STRIP_H)
  const bw = W / steps
  for (let j = top; j < top + STRIP_H; j++) {
    for (let i = 0; i < W; i++) {
      out[j * W + i] = Math.floor(i / bw) >= steps - step ? 1 : 0
    }
  }
  return { top, bottom: top + STRIP_H }
}

export const helpers = { clamp, mix, sstep }
