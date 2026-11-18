// Sigils are signed-distance shapes in projector space, u and v in [-1, 1]
// with v up. The same function rasterises the paint texture and chooses the
// sample points the sight tests use, so the gauge and the picture agree.

const ring = (u, v, cx, cy, r, w) => Math.abs(Math.hypot(u - cx, v - cy) - r) - w
const disc = (u, v, cx, cy, r) => Math.hypot(u - cx, v - cy) - r
const segment = (u, v, ax, ay, bx, by, w) => {
  const px = u - ax; const py = v - ay; const ex = bx - ax; const ey = by - ay
  const h = Math.max(0, Math.min(1, (px * ex + py * ey) / (ex * ex + ey * ey)))
  return Math.hypot(px - ex * h, py - ey * h) - w
}
const min = Math.min

// the cat that was here first: a head, two ears and two eyes
const visitor = (u, v) => {
  const head = ring(u, v, 0, -0.08, 0.6, 0.075)
  const earL = min(segment(u, v, -0.52, 0.22, -0.62, 0.9, 0.07), segment(u, v, -0.62, 0.9, -0.16, 0.5, 0.07))
  const earR = min(segment(u, v, 0.52, 0.22, 0.62, 0.9, 0.07), segment(u, v, 0.62, 0.9, 0.16, 0.5, 0.07))
  const eyeL = Math.max(disc(u, v, -0.24, 0.0, 0.13), -disc(u, v, -0.24, 0.0, 0.045))
  const eyeR = Math.max(disc(u, v, 0.24, 0.0, 0.13), -disc(u, v, 0.24, 0.0, 0.045))
  const nose = segment(u, v, -0.07, -0.25, 0.07, -0.25, 0.05)
  return min(head, earL, earR, eyeL, eyeR, nose)
}

// three rings and a heart-dot: the oldest trick in the trade
const rings = (u, v) => min(
  ring(u, v, 0, 0, 0.86, 0.075),
  ring(u, v, 0, 0, 0.58, 0.075),
  ring(u, v, 0, 0, 0.31, 0.075),
  disc(u, v, 0, 0, 0.09)
)

// an open eye with a slit pupil, for someone who watches from above
const eye = (u, v) => {
  const lidTop = ring(u, v, 0, -0.95, 1.32, 0.07)
  const lidBot = ring(u, v, 0, 0.95, 1.32, 0.07)
  const inside = Math.max(disc(u, v, 0, -0.95, 1.32), disc(u, v, 0, 0.95, 1.32))
  const lids = Math.max(min(lidTop, lidBot), inside - 0.07)
  const iris = ring(u, v, 0, 0, 0.36, 0.06)
  const pupil = Math.max(Math.abs(u) / 0.42 - 0.12 + Math.abs(v) * 0.05, Math.abs(v) - 0.3)
  const lash = min(
    segment(u, v, -0.42, 0.33, -0.55, 0.62, 0.045),
    segment(u, v, 0, 0.37, 0, 0.7, 0.045),
    segment(u, v, 0.42, 0.33, 0.55, 0.62, 0.045)
  )
  return min(lids, iris, pupil, lash)
}

export const SIGILS = {
  visitor: { label: 'a cat face', sdf: visitor },
  rings: { label: 'three rings', sdf: rings },
  eye: { label: 'an open eye', sdf: eye }
}

const RES = 512

// Rasterise a sigil into an alpha mask. For typed words a canvas draws the
// letters and the mask is read back.
export function rasterSigil(kind, word, doc = typeof document !== 'undefined' ? document : null) {
  const mask = new Float32Array(RES * RES)
  if (kind === 'word') {
    if (!doc) return blockWordMask(word)
    const c = doc.createElement('canvas')
    c.width = RES; c.height = RES
    const g = c.getContext('2d')
    g.fillStyle = '#fff'
    g.strokeStyle = '#fff'
    const text = (word || 'stay').toUpperCase().slice(0, 7)
    let size = 300
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    do {
      g.font = `900 ${size}px Georgia, 'Times New Roman', serif`
      size -= 8
    } while (g.measureText(text).width > RES * 0.9 && size > 60)
    g.fillText(text, RES / 2, RES * 0.47)
    g.lineWidth = 22
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(RES * 0.16, RES * 0.8)
    g.quadraticCurveTo(RES * 0.5, RES * 0.92, RES * 0.84, RES * 0.8)
    g.stroke()
    const data = g.getImageData(0, 0, RES, RES).data
    for (let i = 0; i < RES * RES; i++) mask[i] = data[i * 4 + 3] / 255
    return { mask, res: RES }
  }
  const sdf = SIGILS[kind].sdf
  const px = 2 / RES
  for (let y = 0; y < RES; y++) {
    const v = 1 - (y + 0.5) * px
    for (let x = 0; x < RES; x++) {
      const u = (x + 0.5) * px - 1
      const d = sdf(u, v)
      mask[y * RES + x] = Math.max(0, Math.min(1, 0.5 - d / (px * 1.4)))
    }
  }
  return { mask, res: RES }
}

// A stand-in for typed words outside the browser: letter-ish slabs.
function blockWordMask(word) {
  const mask = new Float32Array(RES * RES)
  const n = Math.max(1, Math.min(7, (word || 'stay').length))
  const cw = (RES * 0.86) / n
  for (let i = 0; i < n; i++) {
    const x0 = Math.round(RES * 0.07 + i * cw + cw * 0.12)
    const x1 = Math.round(RES * 0.07 + (i + 1) * cw - cw * 0.12)
    for (let y = Math.round(RES * 0.3); y < RES * 0.64; y++) {
      for (let x = x0; x < x1; x++) {
        const stroke = (x - x0 < cw * 0.2) || (x1 - x < cw * 0.2) || (y - RES * 0.3 < 22) || (RES * 0.64 - y < 22)
        if (stroke) mask[y * RES + x] = 1
      }
    }
  }
  return { mask, res: RES }
}

// Deterministic jittered grid over the inked pixels, aiming for `target` samples.
export function sampleMask({ mask, res }, target = 360) {
  let ink = 0
  for (let i = 0; i < mask.length; i++) if (mask[i] > 0.5) ink++
  const step = Math.max(2, Math.round(Math.sqrt(ink / target)))
  const out = []
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  for (let y = 0; y < res; y += step) {
    for (let x = 0; x < res; x += step) {
      const jx = Math.min(res - 1, x + Math.floor(rnd() * step))
      const jy = Math.min(res - 1, y + Math.floor(rnd() * step))
      if (mask[jy * res + jx] > 0.5) out.push([((jx + 0.5) / res) * 2 - 1, 1 - ((jy + 0.5) / res) * 2])
    }
  }
  return out
}

export const SIGIL_RES = RES
