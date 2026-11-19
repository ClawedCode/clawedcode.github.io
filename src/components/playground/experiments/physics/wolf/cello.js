// Painting the hall and the instrument. Everything is drawn in "cello units":
// x is centred on the instrument, y runs 0 (top of the scroll) to 1 (bottom of the
// body). One unit is 1.232 m, so the 0.69 m string runs NUT_Y..BRIDGE_Y.
import { STRING_LEN, STRINGS, stopAt } from './strings.js'

export const UNIT_M = 1.232
export const NUT_Y = 0.16
export const BRIDGE_Y = NUT_Y + STRING_LEN / UNIT_M
export const FB_END = 0.585
export const TAIL_TOP = 0.775
export const TAIL_BOT = 0.935
const NUT_SPREAD = 0.0102
const BRIDGE_SPREAD = 0.0205
const TAIL_SPREAD = 0.0125

// right half of the outline, as cubic segments [c1x c1y c2x c2y x y]
const OUTLINE = [
  [0.045, 0.386, 0.132, 0.396, 0.141, 0.472],
  [0.147, 0.515, 0.15, 0.553, 0.153, 0.579],
  [0.13, 0.572, 0.108, 0.576, 0.099, 0.592],
  [0.085, 0.618, 0.085, 0.66, 0.099, 0.686],
  [0.108, 0.7, 0.135, 0.7, 0.162, 0.694],
  [0.165, 0.716, 0.19, 0.762, 0.188, 0.84],
  [0.186, 0.94, 0.11, 0.997, 0, 0.997]
]

export function layoutFor(w, h) {
  const portrait = h / w > 1.05
  const narrow = w < 640
  let s
  let cx
  let top
  if (narrow) {
    s = Math.min(h * 0.74, (w * 0.62) / 0.37)
    cx = w * 0.5
    top = h - s - Math.max(112, h * 0.135)
  } else if (portrait) {
    s = Math.min(h * 0.93, (w * 0.5) / 0.37)
    cx = w * 0.5
    top = h - s - h * 0.035
  } else {
    s = Math.min(h * 0.95, (w * 0.34) / 0.37)
    cx = w * 0.47
    top = h - s - h * 0.03
  }
  const floor = top + s * 1.0 + s * 0.018
  return { w, h, s, cx, top, floor, narrow, portrait }
}

export const px = (L, x) => L.cx + x * L.s
export const py = (L, y) => L.top + y * L.s

export function stringX(i, y) {
  const k = i - 1.5
  if (y <= BRIDGE_Y) {
    const t = (y - NUT_Y) / (BRIDGE_Y - NUT_Y)
    return k * (NUT_SPREAD + (BRIDGE_SPREAD - NUT_SPREAD) * t)
  }
  const t = (y - BRIDGE_Y) / (TAIL_TOP - BRIDGE_Y)
  return k * (BRIDGE_SPREAD + (TAIL_SPREAD - BRIDGE_SPREAD) * t)
}

// y of a stopped note (finger) and of the bow (distance d metres from the bridge)
export const fingerY = semi => NUT_Y + stopAt(semi) * (BRIDGE_Y - NUT_Y)
export const bowY = d => BRIDGE_Y - d / UNIT_M

function outlinePath(ctx, L, ox = 0, oy = 0, sx = 1, sy = 1) {
  const X = x => L.cx + ox + x * L.s * sx
  const Y = y => L.top + oy + y * L.s * sy
  ctx.beginPath()
  ctx.moveTo(X(0), Y(0.387))
  for (const [a, b, c, d, e, f] of OUTLINE) ctx.bezierCurveTo(X(a), Y(b), X(c), Y(d), X(e), Y(f))
  for (let i = OUTLINE.length - 1; i >= 0; i--) {
    const [a, b, c, d] = OUTLINE[i]
    const prev = i > 0 ? OUTLINE[i - 1] : [0, 0, 0, 0, 0, 0.387]
    ctx.bezierCurveTo(X(-c), Y(d), X(-a), Y(b), X(-prev[4]), Y(prev[5]))
  }
  ctx.closePath()
}

function rand(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// the hall: wall, two tall windows, panelling and floor. dawn is 0..1
export function paintRoom(ctx, L, dawn) {
  const { w, h } = L
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
  const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`
  const wallTop = mix([24, 20, 34], [92, 70, 78], dawn)
  const wallBot = mix([36, 28, 40], [128, 92, 84], dawn)
  const g = ctx.createLinearGradient(0, 0, 0, L.floor)
  g.addColorStop(0, rgb(wallTop))
  g.addColorStop(1, rgb(wallBot))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // windows
  const winW = Math.max(70, L.s * 0.16)
  const winH = L.s * 0.56
  const winTop = Math.max(18, L.floor - L.s * 0.98)
  const off = Math.min(L.s * 0.52, w * 0.38)
  const spots = L.narrow ? [w * 0.12] : [L.cx - off, L.cx + off]
  for (const wx of spots) {
    const x0 = wx - winW / 2
    const glass = ctx.createLinearGradient(0, winTop, 0, winTop + winH)
    glass.addColorStop(0, rgb(mix([56, 70, 104], [250, 196, 150], dawn)))
    glass.addColorStop(1, rgb(mix([30, 38, 62], [236, 150, 112], dawn)))
    ctx.fillStyle = glass
    ctx.beginPath()
    ctx.moveTo(x0, winTop + winH)
    ctx.lineTo(x0, winTop + winW / 2)
    ctx.arc(wx, winTop + winW / 2, winW / 2, Math.PI, 0)
    ctx.lineTo(x0 + winW, winTop + winH)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = rgb(mix([14, 12, 20], [70, 46, 44], dawn))
    ctx.lineWidth = Math.max(3, winW * 0.06)
    ctx.stroke()
    ctx.lineWidth = Math.max(1.5, winW * 0.025)
    ctx.beginPath()
    ctx.moveTo(wx, winTop + 4)
    ctx.lineTo(wx, winTop + winH)
    for (let k = 1; k < 5; k++) {
      const yy = winTop + winW / 2 + (k * (winH - winW / 2)) / 5
      ctx.moveTo(x0, yy)
      ctx.lineTo(x0 + winW, yy)
    }
    ctx.stroke()
    // light falling through it onto the floor
    const beam = ctx.createLinearGradient(0, winTop, 0, L.floor + L.s * 0.08)
    const lc = mix([120, 150, 200], [255, 200, 150], dawn)
    beam.addColorStop(0, `rgba(${lc[0]},${lc[1]},${lc[2]},0)`)
    beam.addColorStop(1, `rgba(${lc[0]},${lc[1]},${lc[2]},${0.08 + dawn * 0.1})`)
    ctx.fillStyle = beam
    ctx.beginPath()
    const lean = (wx < L.cx ? 1 : -1) * L.s * 0.22
    ctx.moveTo(x0, winTop + winH * 0.3)
    ctx.lineTo(x0 + winW, winTop + winH * 0.3)
    ctx.lineTo(x0 + winW + lean + winW * 0.5, L.floor + L.s * 0.09)
    ctx.lineTo(x0 + lean - winW * 0.2, L.floor + L.s * 0.09)
    ctx.closePath()
    ctx.fill()
  }
  // wainscot
  const wain = L.floor - L.s * 0.26
  ctx.fillStyle = rgb(mix([20, 15, 22], [76, 50, 46], dawn))
  ctx.fillRect(0, wain, w, L.floor - wain)
  ctx.strokeStyle = rgb(mix([42, 32, 40], [120, 84, 70], dawn))
  ctx.lineWidth = 1.5
  const pw = Math.max(90, L.s * 0.2)
  for (let x = -((L.cx % pw) + pw); x < w + pw; x += pw) {
    ctx.strokeRect(x + 10, wain + 14, pw - 20, L.floor - wain - 28)
  }
  ctx.fillStyle = rgb(mix([46, 34, 40], [140, 98, 80], dawn))
  ctx.fillRect(0, wain - 6, w, 6)
  // floor
  const fg = ctx.createLinearGradient(0, L.floor, 0, h)
  fg.addColorStop(0, rgb(mix([40, 28, 26], [120, 78, 56], dawn)))
  fg.addColorStop(1, rgb(mix([16, 11, 12], [70, 44, 34], dawn)))
  ctx.fillStyle = fg
  ctx.fillRect(0, L.floor, w, h - L.floor)
  ctx.strokeStyle = 'rgba(0,0,0,0.28)'
  ctx.lineWidth = 1
  for (let k = -12; k <= 12; k++) {
    ctx.beginPath()
    ctx.moveTo(L.cx + k * L.s * 0.06, L.floor)
    ctx.lineTo(L.cx + k * L.s * 0.3, h)
    ctx.stroke()
  }
  // the lamp throws a warm patch on the wall behind, where the shadow stands
  const wx = L.cx + L.s * (L.narrow ? 0.27 : 0.36)
  const wy = L.floor - L.s * 0.5
  const wall = ctx.createRadialGradient(wx, wy, 10, wx, wy, L.s * 0.5)
  wall.addColorStop(0, `rgba(236, 170, 104, ${0.2 + dawn * 0.05})`)
  wall.addColorStop(0.6, `rgba(236, 170, 104, ${0.07 + dawn * 0.03})`)
  wall.addColorStop(1, 'rgba(236, 170, 104, 0)')
  ctx.fillStyle = wall
  ctx.fillRect(0, 0, w, L.floor)
  // the lamp's pool around the instrument
  const pool = ctx.createRadialGradient(L.cx, L.floor - L.s * 0.3, 10, L.cx, L.floor - L.s * 0.3, L.s * 0.75)
  pool.addColorStop(0, `rgba(255, 196, 120, ${0.2 - dawn * 0.08})`)
  pool.addColorStop(1, 'rgba(255, 196, 120, 0)')
  ctx.fillStyle = pool
  ctx.fillRect(0, 0, w, h)
}

// the instrument's shadow on the wall; the scroll is its head. wolf and cat are 0..1
export function paintShadow(ctx, L, wolf, cat, dawn) {
  // a smaller copy standing on the same floor, so the head (and its ears) stays on the wall
  const sc = 0.62
  const ox = L.s * (L.narrow ? 0.27 : 0.36)
  const oy = L.floor - L.top - L.s * sc - L.s * 0.004
  const alpha = 0.5 + 0.12 * wolf - dawn * 0.14
  ctx.save()
  ctx.fillStyle = `rgba(6, 4, 10, ${alpha})`
  outlinePath(ctx, L, ox, oy, sc, sc)
  ctx.fill()
  const X = x => L.cx + ox + x * L.s * sc
  const Y = y => L.top + oy + y * L.s * sc
  // neck, pegbox, scroll: the head
  ctx.beginPath()
  ctx.moveTo(X(-0.02), Y(0.39))
  ctx.lineTo(X(-0.018), Y(0.08))
  ctx.lineTo(X(0.018), Y(0.08))
  ctx.lineTo(X(0.02), Y(0.39))
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.arc(X(0), Y(0.045), L.s * sc * 0.034, 0, Math.PI * 2)
  ctx.fill()
  // the endpin
  ctx.fillRect(X(-0.004), Y(0.99), L.s * sc * 0.008, L.floor - Y(0.99))
  if (wolf > 0.02) {
    const e = wolf
    // ears that prick up and a muzzle lifted to howl
    ctx.beginPath()
    ctx.moveTo(X(-0.03), Y(0.035))
    ctx.lineTo(X(-0.05 - 0.02 * e), Y(-0.04 - 0.07 * e))
    ctx.lineTo(X(-0.004), Y(0.01))
    ctx.closePath()
    ctx.moveTo(X(0.012), Y(0.012))
    ctx.lineTo(X(0.03 + 0.012 * e), Y(-0.05 - 0.07 * e))
    ctx.lineTo(X(0.036), Y(0.03))
    ctx.closePath()
    ctx.moveTo(X(0.02), Y(0.03))
    ctx.quadraticCurveTo(X(0.06 + 0.06 * e), Y(-0.01 - 0.05 * e), X(0.09 + 0.09 * e), Y(-0.04 - 0.08 * e))
    ctx.lineTo(X(0.098 + 0.09 * e), Y(-0.02 - 0.075 * e))
    ctx.quadraticCurveTo(X(0.06 + 0.05 * e), Y(0.03), X(0.026), Y(0.075))
    ctx.closePath()
    ctx.fill()
  }
  if (cat > 0.02) {
    const c = cat
    ctx.fillStyle = `rgba(6, 4, 10, ${alpha * c})`
    // small upright cat ears
    ctx.beginPath()
    ctx.moveTo(X(-0.032), Y(0.032))
    ctx.lineTo(X(-0.026), Y(0.032 - 0.05 * c))
    ctx.lineTo(X(-0.006), Y(0.016))
    ctx.closePath()
    ctx.moveTo(X(0.006), Y(0.016))
    ctx.lineTo(X(0.026), Y(0.032 - 0.05 * c))
    ctx.lineTo(X(0.032), Y(0.032))
    ctx.closePath()
    ctx.fill()
    // and a tail curled round the endpin
    ctx.strokeStyle = `rgba(6, 4, 10, ${alpha * c})`
    ctx.lineWidth = L.s * 0.018
    ctx.lineCap = 'round'
    ctx.beginPath()
    const bx = X(0.005)
    const by = L.floor - 4
    ctx.moveTo(bx, by)
    ctx.bezierCurveTo(bx + L.s * 0.16 * c, by + 2, bx + L.s * 0.2 * c, by - L.s * 0.1 * c, bx + L.s * 0.12 * c, by - L.s * 0.16 * c)
    ctx.stroke()
  }
  ctx.restore()
}

function fHole(ctx, L, side) {
  const X = x => px(L, side * x)
  const Y = y => py(L, y)
  ctx.beginPath()
  // upper eye
  ctx.moveTo(X(0.052) + L.s * 0.0058, Y(0.648))
  ctx.arc(X(0.052), Y(0.648), L.s * 0.0058, 0, Math.PI * 2)
  ctx.moveTo(X(0.088) + L.s * 0.0068, Y(0.792))
  ctx.arc(X(0.088), Y(0.792), L.s * 0.0068, 0, Math.PI * 2)
  ctx.fill()
  // the stem: a long thin S, widest at the waist
  ctx.beginPath()
  ctx.moveTo(X(0.054), Y(0.652))
  ctx.bezierCurveTo(X(0.066), Y(0.672), X(0.06), Y(0.7), X(0.066), Y(0.72))
  ctx.bezierCurveTo(X(0.07), Y(0.745), X(0.088), Y(0.762), X(0.087), Y(0.787))
  ctx.bezierCurveTo(X(0.082), Y(0.763), X(0.064), Y(0.746), X(0.061), Y(0.72))
  ctx.bezierCurveTo(X(0.057), Y(0.698), X(0.062), Y(0.674), X(0.051), Y(0.655))
  ctx.closePath()
  ctx.fill()
  // the notches the bridge stands between
  ctx.fillRect(X(0.06) - (side < 0 ? L.s * 0.012 : 0), Y(0.719), L.s * 0.012, Math.max(1.5, L.s * 0.0022))
}

// the instrument itself, painted once per size into its own bitmap
export function paintCello(ctx, L) {
  const s = L.s
  const R = rand(7)
  ctx.save()
  // drop shadow on the floor
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(L.cx + s * 0.03, L.floor + s * 0.006, s * 0.2, s * 0.018, 0, 0, Math.PI * 2)
  ctx.fill()
  // endpin
  ctx.strokeStyle = '#9a9a92'
  ctx.lineWidth = Math.max(2, s * 0.005)
  ctx.beginPath()
  ctx.moveTo(px(L, 0), py(L, 0.99))
  ctx.lineTo(px(L, 0), L.floor)
  ctx.stroke()
  // ribs peeking out as a darker rim
  ctx.fillStyle = '#3b170c'
  outlinePath(ctx, L, s * 0.004, s * 0.006, 1.012, 1.004)
  ctx.fill()
  // the top: varnish over spruce
  outlinePath(ctx, L)
  const varnish = ctx.createRadialGradient(px(L, -0.03), py(L, 0.72), s * 0.02, px(L, 0), py(L, 0.7), s * 0.34)
  varnish.addColorStop(0, '#d98b3c')
  varnish.addColorStop(0.45, '#b4602a')
  varnish.addColorStop(0.8, '#7c3517')
  varnish.addColorStop(1, '#4a1c0c')
  ctx.fillStyle = varnish
  ctx.fill()
  ctx.save()
  outlinePath(ctx, L)
  ctx.clip()
  // straight spruce grain, widening toward the flanks
  for (let i = -60; i <= 60; i++) {
    const x = i / 60
    const xx = px(L, x * 0.19 * (0.6 + 0.4 * Math.abs(x)))
    ctx.strokeStyle = `rgba(60, 22, 8, ${0.05 + R() * 0.09})`
    ctx.lineWidth = 0.6 + R() * 1.2
    ctx.beginPath()
    ctx.moveTo(xx, py(L, 0.38))
    const wob = (R() - 0.5) * s * 0.004
    ctx.bezierCurveTo(xx + wob, py(L, 0.55), xx - wob, py(L, 0.8), xx + wob * 0.5, py(L, 1))
    ctx.stroke()
  }
  // wear where a bow has scraped and a hand has rested
  const wear = ctx.createRadialGradient(px(L, 0.06), py(L, 0.66), 2, px(L, 0.06), py(L, 0.66), s * 0.09)
  wear.addColorStop(0, 'rgba(240, 190, 120, 0.28)')
  wear.addColorStop(1, 'rgba(240, 190, 120, 0)')
  ctx.fillStyle = wear
  ctx.fillRect(px(L, -0.2), py(L, 0.4), s * 0.4, s * 0.6)
  // lamp highlight along the upper bout arch
  const hi = ctx.createLinearGradient(px(L, -0.18), 0, px(L, 0.18), 0)
  hi.addColorStop(0, 'rgba(255,220,170,0.0)')
  hi.addColorStop(0.32, 'rgba(255,220,170,0.16)')
  hi.addColorStop(0.42, 'rgba(255,220,170,0.0)')
  ctx.fillStyle = hi
  ctx.fillRect(px(L, -0.2), py(L, 0.38), s * 0.4, s * 0.62)
  ctx.restore()
  // purfling, just inside the edge
  ctx.strokeStyle = 'rgba(20, 8, 4, 0.75)'
  ctx.lineWidth = Math.max(1, s * 0.0024)
  outlinePath(ctx, L, 0, s * 0.0075, 0.94, 0.985)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255, 214, 160, 0.35)'
  ctx.lineWidth = Math.max(1, s * 0.0014)
  outlinePath(ctx, L)
  ctx.stroke()
  // f-holes
  ctx.fillStyle = '#140804'
  fHole(ctx, L, 1)
  fHole(ctx, L, -1)
  // tailpiece
  const tw = 0.034
  ctx.fillStyle = '#17110f'
  ctx.beginPath()
  ctx.moveTo(px(L, -tw), py(L, TAIL_TOP))
  ctx.quadraticCurveTo(px(L, 0), py(L, TAIL_TOP - 0.012), px(L, tw), py(L, TAIL_TOP))
  ctx.lineTo(px(L, 0.017), py(L, TAIL_BOT))
  ctx.quadraticCurveTo(px(L, 0), py(L, TAIL_BOT + 0.008), px(L, -0.017), py(L, TAIL_BOT))
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  ctx.stroke()
  // tail gut to the saddle
  ctx.strokeStyle = '#2a2420'
  ctx.lineWidth = Math.max(2, s * 0.004)
  ctx.beginPath()
  ctx.moveTo(px(L, -0.008), py(L, TAIL_BOT))
  ctx.lineTo(px(L, -0.004), py(L, 0.994))
  ctx.moveTo(px(L, 0.008), py(L, TAIL_BOT))
  ctx.lineTo(px(L, 0.004), py(L, 0.994))
  ctx.stroke()
  // fine tuner on the A
  ctx.fillStyle = '#b89545'
  ctx.beginPath()
  ctx.arc(px(L, stringX(3, TAIL_TOP)), py(L, TAIL_TOP + 0.016), Math.max(2.5, s * 0.0055), 0, Math.PI * 2)
  ctx.fill()
  // fingerboard, ebony
  const fbg = ctx.createLinearGradient(px(L, -0.03), 0, px(L, 0.03), 0)
  fbg.addColorStop(0, '#0b0a0a')
  fbg.addColorStop(0.5, '#2a2624')
  fbg.addColorStop(1, '#0d0b0b')
  ctx.fillStyle = fbg
  ctx.beginPath()
  ctx.moveTo(px(L, -0.019), py(L, NUT_Y))
  ctx.lineTo(px(L, 0.019), py(L, NUT_Y))
  ctx.lineTo(px(L, 0.034), py(L, FB_END - 0.006))
  ctx.quadraticCurveTo(px(L, 0), py(L, FB_END + 0.008), px(L, -0.034), py(L, FB_END - 0.006))
  ctx.closePath()
  ctx.fill()
  // position marks on the fingerboard edge, faint: where the cellist's fingers went
  ctx.fillStyle = 'rgba(230, 210, 170, 0.22)'
  for (const k of [2, 4, 5, 7, 9, 12]) {
    const y = fingerY(k)
    const half = 0.019 + (0.034 - 0.019) * ((y - NUT_Y) / (FB_END - NUT_Y))
    ctx.fillRect(px(L, -half) - 4, py(L, y) - 0.5, 3, 1.5)
  }
  // pegbox and scroll
  ctx.fillStyle = '#5a2412'
  ctx.beginPath()
  ctx.moveTo(px(L, -0.019), py(L, NUT_Y + 0.004))
  ctx.lineTo(px(L, -0.017), py(L, 0.07))
  ctx.lineTo(px(L, 0.017), py(L, 0.07))
  ctx.lineTo(px(L, 0.019), py(L, NUT_Y + 0.004))
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#120806'
  ctx.fillRect(px(L, -0.01), py(L, 0.078), s * 0.02, s * (NUT_Y - 0.085))
  for (let k = 0; k < 4; k++) {
    const y = py(L, 0.088 + k * 0.019)
    const side = k % 2 ? 1 : -1
    ctx.fillStyle = '#1a100c'
    ctx.beginPath()
    ctx.ellipse(px(L, side * 0.04), y, s * 0.022, s * 0.0065, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#c7a046'
    ctx.beginPath()
    ctx.arc(px(L, side * 0.02), y, Math.max(1.5, s * 0.003), 0, Math.PI * 2)
    ctx.fill()
  }
  const scx = px(L, 0)
  const scy = py(L, 0.045)
  const sr = s * 0.031
  const sg = ctx.createRadialGradient(scx - sr * 0.3, scy - sr * 0.3, 1, scx, scy, sr)
  sg.addColorStop(0, '#b0602e')
  sg.addColorStop(1, '#4a1a0b')
  ctx.fillStyle = sg
  ctx.beginPath()
  ctx.arc(scx, scy, sr, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(20,8,4,0.8)'
  ctx.lineWidth = Math.max(1, s * 0.0022)
  ctx.beginPath()
  for (let a = 0; a < Math.PI * 5; a += 0.12) {
    const r = sr * (0.95 - a / (Math.PI * 5.6))
    const x = scx + Math.cos(a) * r
    const y = scy + Math.sin(a) * r
    if (a === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  // nut
  ctx.fillStyle = '#e8dcc0'
  ctx.fillRect(px(L, -0.02), py(L, NUT_Y) - Math.max(1.5, s * 0.003), s * 0.04, Math.max(3, s * 0.006))
  // bridge, maple, seen nearly edge-on
  const by = py(L, BRIDGE_Y)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(px(L, -0.046), by + s * 0.004, s * 0.092, s * 0.009)
  const bg = ctx.createLinearGradient(0, by - s * 0.006, 0, by + s * 0.008)
  bg.addColorStop(0, '#f3e1b8')
  bg.addColorStop(1, '#b8955f')
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.moveTo(px(L, -0.044), by + s * 0.007)
  ctx.quadraticCurveTo(px(L, 0), by - s * 0.012, px(L, 0.044), by + s * 0.007)
  ctx.lineTo(px(L, 0.044), by + s * 0.01)
  ctx.lineTo(px(L, -0.044), by + s * 0.01)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

// where each string's winding colour comes from
export const stringColour = i => STRINGS[i].wound
