import { castRay, PAINTABLE } from './geometry'

// An eye (or a projector, which is the same thing run backwards): a position,
// a point it looks at, and a field of view. Image coordinates are tangent-space
// (x / z, y / z in the eye's frame), which keeps every mapping a pure perspective.

const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l] }
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

export function makeEye(pos, aim, fov = 50, extra = {}) {
  const fwd = norm([aim[0] - pos[0], aim[1] - pos[1], aim[2] - pos[2]])
  const right = norm(cross(fwd, [0, 1, 0]))
  const up = cross(right, fwd)
  return { pos: [...pos], aim: [...aim], fov, fwd, right, up, tan: Math.tan((fov * Math.PI) / 360), ...extra }
}

// Lay paint: one ray per sigil sample. A sample is caught when the first
// thing its ray meets will take paint.
export function layPaint(solids, eye, samples) {
  const hits = new Array(samples.length)
  let caught = 0
  const [ox, oy, oz] = eye.pos
  for (let i = 0; i < samples.length; i++) {
    const [u, v] = samples[i]
    const x = u * eye.tan; const y = v * eye.tan
    const d = norm([
      eye.fwd[0] + eye.right[0] * x + eye.up[0] * y,
      eye.fwd[1] + eye.right[1] * x + eye.up[1] * y,
      eye.fwd[2] + eye.right[2] * x + eye.up[2] * y
    ])
    const h = castRay(solids, ox, oy, oz, d[0], d[1], d[2])
    if (h && PAINTABLE[h.solid.mat]) {
      hits[i] = { u, v, p: [ox + d[0] * h.t, oy + d[1] * h.t, oz + d[2] * h.t], solid: h.solid.id }
      caught++
    } else {
      hits[i] = { u, v, p: null, solid: h ? h.solid.id : null, lost: h ? h.solid.mat : 'sky' }
    }
  }
  return { hits, coverage: samples.length ? caught / samples.length : 0 }
}

const normalise = pts => {
  const n = pts.length
  let cx = 0; let cy = 0
  for (const [x, y] of pts) { cx += x; cy += y }
  cx /= n; cy /= n
  let r = 0
  for (const [x, y] of pts) r += (x - cx) ** 2 + (y - cy) ** 2
  const s = Math.sqrt(r / n) || 1
  return pts.map(([x, y]) => [(x - cx) / s, (y - cy) / s])
}

// Least-squares homography (DLT, h33 = 1) over the chosen indices.
const M = Array.from({ length: 8 }, () => new Float64Array(8))
const b = new Float64Array(8)
const row = new Float64Array(8)
function fitHomography(A, B, idx) {
  for (let i = 0; i < 8; i++) { M[i].fill(0); b[i] = 0 }
  const accum = rhs => {
    for (let i = 0; i < 8; i++) {
      const ri = row[i]
      if (ri === 0) continue
      const Mi = M[i]
      for (let j = 0; j < 8; j++) Mi[j] += ri * row[j]
      b[i] += ri * rhs
    }
  }
  for (const k of idx) {
    const [u, v] = A[k]; const [x, y] = B[k]
    row.fill(0); row[0] = u; row[1] = v; row[2] = 1; row[6] = -u * x; row[7] = -v * x; accum(x)
    row.fill(0); row[3] = u; row[4] = v; row[5] = 1; row[6] = -u * y; row[7] = -v * y; accum(y)
  }
  for (let i = 0; i < 8; i++) M[i][i] += 1e-6
  for (let c = 0; c < 8; c++) {
    let p = c
    for (let r = c + 1; r < 8; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    if (Math.abs(M[p][c]) < 1e-12) return null
    if (p !== c) { const t = M[p]; M[p] = M[c]; M[c] = t; const tb = b[p]; b[p] = b[c]; b[c] = tb }
    for (let r = c + 1; r < 8; r++) {
      const f = M[r][c] / M[c][c]
      if (f === 0) continue
      for (let j = c; j < 8; j++) M[r][j] -= f * M[c][j]
      b[r] -= f * b[c]
    }
  }
  const h = new Float64Array(8)
  for (let r = 7; r >= 0; r--) {
    let s = b[r]
    for (let j = r + 1; j < 8; j++) s -= M[r][j] * h[j]
    h[r] = s / M[r][r]
  }
  return h
}

const errorsOf = (h, A, B, out) => {
  for (let k = 0; k < A.length; k++) {
    const [u, v] = A[k]; const [x, y] = B[k]
    const w = h[6] * u + h[7] * v + 1
    if (Math.abs(w) < 1e-6) { out[k] = 2; continue }
    const px = (h[0] * u + h[1] * v + h[2]) / w
    const py = (h[3] * u + h[4] * v + h[5]) / w
    out[k] = Math.min(2, Math.hypot(px - x, py - y))
  }
  return out
}

const smooth = (a, b2, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b2 - a))); return t * t * (3 - 2 * t) }

// How much of the message can this viewer read as one picture?
//   seen    the share of the sigil that lands where the viewer can see it
//   joined  the share of the sigil that one clean perspective picture explains,
//           within `tol` of the viewer's image size: the biggest piece that reads
//   resid   median misfit of everything seen against that picture (0 = perfect)
//   score   joined: 1 is the message whole, under a third is shards
export const JOIN_TOL = 0.045

export function legibility(solids, paint, viewer, opts = {}) {
  const { hits } = paint
  const total = hits.length
  const tol = opts.tol ?? JOIN_TOL
  const src = []; const dst = []; const group = []; const from = []
  const [vx, vy, vz] = viewer.pos
  const cone = Math.cos(((viewer.cone ?? viewer.fov * 0.62) * Math.PI) / 180)
  for (let hi = 0; hi < total; hi++) {
    const h = hits[hi]
    if (!h.p) continue
    const dx = h.p[0] - vx; const dy = h.p[1] - vy; const dz = h.p[2] - vz
    const dist = Math.hypot(dx, dy, dz)
    const d = [dx / dist, dy / dist, dz / dist]
    const f = dot(d, viewer.fwd)
    if (f < cone) continue
    if (!opts.skipOcclusion) {
      // occluders can differ from the paint-catching solids: a watcher walks
      // the lane, so boards stood in the way hide nothing from him
      const o = castRay(opts.occluders || solids, vx, vy, vz, d[0], d[1], d[2], dist + 1)
      if (o && o.t < dist - Math.max(0.03, dist * 0.004)) continue
    }
    src.push([h.u, h.v])
    dst.push([dot(d, viewer.right) / f, dot(d, viewer.up) / f])
    group.push(h.solid)
    from.push(hi)
  }
  const n = src.length
  const seen = total ? n / total : 0
  if (n < 10) return { seen, joined: 0, resid: 1, global: 1, score: 0, n, inliers: null }
  const A = normalise(src); const B = normalise(dst)
  // candidate pictures: everything at once, and each surface's own piece
  const groups = new Map()
  for (let k = 0; k < n; k++) {
    if (!groups.has(group[k])) groups.set(group[k], [])
    groups.get(group[k]).push(k)
  }
  const candidates = [Array.from({ length: n }, (_, k) => k)]
  for (const g of groups.values()) if (g.length >= 10) candidates.push(g)
  const err = new Float64Array(n)
  let best = -1; let bestH = null; let global = 1
  for (const idx of candidates) {
    let h = fitHomography(A, B, idx)
    if (!h) continue
    if (idx === candidates[0]) {
      errorsOf(h, A, B, err)
      let s = 0
      for (let k = 0; k < n; k++) s += err[k] * err[k]
      global = Math.sqrt(s / n)
    }
    // one refinement on its own inliers lets a piece grow across seams that agree with it
    for (let pass = 0; pass < 2; pass++) {
      errorsOf(h, A, B, err)
      const inl = []
      for (let k = 0; k < n; k++) if (err[k] < tol * 1.6) inl.push(k)
      if (inl.length < 10) break
      const h2 = fitHomography(A, B, inl)
      if (!h2) break
      h = h2
    }
    errorsOf(h, A, B, err)
    let c = 0
    for (let k = 0; k < n; k++) if (err[k] < tol) c++
    if (c > best) { best = c; bestH = h }
  }
  if (!bestH) return { seen, joined: 0, resid: 1, global, score: 0, n, inliers: null }
  errorsOf(bestH, A, B, err)
  const sorted = Array.from(err).sort((a, b2) => a - b2)
  const resid = sorted[Math.floor(n / 2)]
  // per sample: 0 unseen, 1 seen but stray, 2 joined into the picture
  let inliers = null
  if (opts.keepInliers) {
    inliers = new Uint8Array(total)
    for (let k = 0; k < n; k++) inliers[from[k]] = err[k] < tol ? 2 : 1
  }
  const joined = best / total
  return { seen, joined, resid, global, score: joined, n, inliers }
}

// closeness of an eye to the painter's own, 0..1: the mean parallax, the angle
// between how each fragment is seen and how it was painted. Zero only at the
// painter's eye, and it grows steadily with every step away (log scale).
export function tuning(paint, painterPos, pos) {
  let sum = 0; let n = 0
  for (const h of paint.hits) {
    if (!h.p) continue
    const a = norm([h.p[0] - painterPos[0], h.p[1] - painterPos[1], h.p[2] - painterPos[2]])
    const b = norm([h.p[0] - pos[0], h.p[1] - pos[1], h.p[2] - pos[2]])
    sum += Math.acos(Math.max(-1, Math.min(1, dot(a, b))))
    n++
  }
  if (!n) return 0
  const deg = Math.max(0.35, (sum / n) * 180 / Math.PI)
  return 1 - Math.min(1, Math.log(deg / 0.35) / Math.log(120 / 0.35))
}
