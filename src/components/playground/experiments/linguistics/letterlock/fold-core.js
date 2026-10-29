// Flat-folding engine for letterlock.post().
// A packet is a stack of facets. Each facet is a convex polygon in desk space,
// the affine map from sheet space to desk space (a chain of reflections, so an
// isometry) and a z order. Folding reflects every facet part on one side of a
// crease line through all layers, exactly as a bone folder would.

const EPS = 0.35
const INSET = 0.9

export const apply = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
export const det = m => m[0] * m[3] - m[1] * m[2]

const compose = (a, b) => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5]
]

export const invert = m => {
  const d = det(m)
  const a = m[3] / d
  const b = -m[1] / d
  const c = -m[2] / d
  const e = m[0] / d
  return [a, b, c, e, -(a * m[4] + c * m[5]), -(b * m[4] + e * m[5])]
}

// Reflection across the line through p with unit normal n, as an affine matrix.
const reflection = (p, n) => {
  const [nx, ny] = n
  const k = 2 * (p[0] * nx + p[1] * ny)
  return [1 - 2 * nx * nx, -2 * nx * ny, -2 * nx * ny, 1 - 2 * ny * ny, k * nx, k * ny]
}

// Rotation of the moving flap by theta about the crease, seen from above.
export const liftMatrix = (line, theta) => {
  const s = 1 - Math.cos(theta)
  const [nx, ny] = line.n
  const k = s * (line.p[0] * nx + line.p[1] * ny)
  return [1 - s * nx * nx, -s * nx * ny, -s * nx * ny, 1 - s * ny * ny, k * nx, k * ny]
}

export const area = pts => {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    a += x1 * y2 - x2 * y1
  }
  return a / 2
}

const side = (line, q) => (q[0] - line.p[0]) * line.n[0] + (q[1] - line.p[1]) * line.n[1]

// Sutherland-Hodgman against one half plane: keep points with sign * side >= 0.
const clip = (pts, line, sign) => {
  const out = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const da = side(line, a) * sign
    const db = side(line, b) * sign
    if (da >= -EPS) out.push(a)
    if ((da > EPS && db < -EPS) || (da < -EPS && db > EPS)) {
      const t = da / (da - db)
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  }
  const clean = []
  for (const q of out) {
    const last = clean[clean.length - 1]
    if (!last || Math.hypot(last[0] - q[0], last[1] - q[1]) > 0.05) clean.push(q)
  }
  if (clean.length > 2 && Math.hypot(clean[0][0] - clean.at(-1)[0], clean[0][1] - clean.at(-1)[1]) < 0.05) clean.pop()
  return clean.length > 2 && Math.abs(area(clean)) > 0.6 ? clean : null
}

let nextId = 1
const makeFacet = (pts, m, z) => ({ id: nextId++, pts, m, z, sheet: pts.map(q => apply(invert(m), q)) })

export const createPacket = (sheet, origin) => {
  const m = [1, 0, 0, 1, origin[0], origin[1]]
  return { facets: [makeFacet(sheet.poly.map(q => apply(m, q)), m, 0)], creases: [], folds: 0 }
}

// The crease that lays point a onto point b: their perpendicular bisector.
// The side holding a is the side that moves.
export const creaseFor = (a, b) => {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const len = Math.hypot(dx, dy)
  if (len < 4) return null
  return { p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], n: [dx / len, dy / len] }
}

const inside = (pts, q, inset = INSET) => {
  const s = Math.sign(area(pts)) || 1
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const ex = b[0] - a[0]
    const ey = b[1] - a[1]
    const len = Math.hypot(ex, ey) || 1
    const cross = (ex * (q[1] - a[1]) - ey * (q[0] - a[0])) / len
    if (cross * s < inset) return false
  }
  return true
}

const orient = pts => (area(pts) < 0 ? pts.slice().reverse() : pts)

// Split the packet along a crease. Returns parts that stay and parts that move.
export const splitPacket = (packet, line) => {
  const stay = []
  const move = []
  const cut = []
  for (const f of packet.facets) {
    const pos = clip(f.pts, line, 1)
    const neg = clip(f.pts, line, -1)
    if (pos) move.push({ ...f, pts: pos })
    if (neg) stay.push({ ...f, pts: neg })
    if (pos && neg) {
      const onLine = pos.filter(q => Math.abs(side(line, q)) <= EPS * 2)
      if (onLine.length >= 2) cut.push({ f, seg: [onLine[0], onLine.at(-1)] })
    } else if (pos) {
      // A flap folded along an existing edge still records that crease.
      const edge = pos.filter(q => Math.abs(side(line, q)) <= EPS * 2)
      if (edge.length >= 2) cut.push({ f, seg: [edge[0], edge.at(-1)] })
    }
  }
  return { stay, move, cut }
}

// Most layers the crease has to press through at one point.
export const thicknessAlong = (packet, line) => {
  const t = [-line.n[1], line.n[0]]
  let best = 0
  for (let s = -460; s <= 460; s += 3) {
    const q = [line.p[0] + t[0] * s, line.p[1] + t[1] * s]
    let c = 0
    for (const f of packet.facets) if (inside(f.pts, q, 0.2)) c++
    if (c > best) best = c
  }
  return best
}

export const foldPacket = (packet, line, mode = 'valley') => {
  const { stay, move, cut } = splitPacket(packet, line)
  if (!move.length || !stay.length) return null
  const R = reflection(line.p, line.n)
  const zs = packet.facets.map(f => f.z)
  const maxAll = Math.max(...zs)
  const minAll = Math.min(...zs)
  const mz = move.map(f => f.z)
  const maxM = Math.max(...mz)
  const minM = Math.min(...mz)
  const moved = move.map(f => {
    const z = mode === 'valley' ? maxAll + 1 + (maxM - f.z) : minAll - 1 - (f.z - minM)
    return { ...makeFacet(orient(f.pts.map(q => apply(R, q))), compose(R, f.m), z), moved: true }
  })
  const kept = stay.map(f => makeFacet(orient(f.pts), f.m, f.z))
  const all = [...kept, ...moved].sort((a, b) => a.z - b.z)
  all.forEach((f, i) => { f.z = i })
  const creases = packet.creases.slice()
  for (const { f, seg } of cut) {
    const inv = invert(f.m)
    // A valley seen from above is a valley on whichever face is up.
    const frontUp = det(f.m) > 0
    const valleyOnFront = (mode === 'valley') === frontUp
    creases.push({ a: apply(inv, seg[0]), b: apply(inv, seg[1]), type: valleyOnFront ? 'valley' : 'mountain', fold: packet.folds + 1 })
  }
  return { facets: all, creases, folds: packet.folds + 1 }
}

// Turn the whole packet over left to right, as a clerk turns a letter face down.
export const turnPacket = packet => {
  const xs = packet.facets.flatMap(f => f.pts.map(q => q[0]))
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const R = [-1, 0, 0, 1, 2 * cx, 0]
  const top = Math.max(...packet.facets.map(f => f.z))
  const facets = packet.facets
    .map(f => makeFacet(orient(f.pts.map(q => apply(R, q))), compose(R, f.m), top - f.z))
    .sort((a, b) => a.z - b.z)
  return { ...packet, facets }
}

// Spin the packet a quarter turn clockwise on the desk, about its middle.
export const rotatePacket = packet => {
  const hull = hullPoints(packet)
  const xs = hull.map(q => q[0])
  const ys = hull.map(q => q[1])
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  const R = [0, 1, -1, 0, cx + cy, cy - cx]
  return { ...packet, facets: packet.facets.map(f => makeFacet(orient(f.pts.map(q => apply(R, q))), compose(R, f.m), f.z)), spin: R }
}

export const hullPoints = packet => {
  const key = v => Math.round(v * 1000)
  const pts = packet.facets.flatMap(f => f.pts).slice().sort((a, b) => key(a[0]) - key(b[0]) || key(a[1]) - key(b[1]))
  if (pts.length < 3) return pts
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower = []
  for (const q of pts) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), q) <= 0.01) lower.pop()
    lower.push(q)
  }
  const upper = []
  for (const q of pts.slice().reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), q) <= 0.01) upper.pop()
    upper.push(q)
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1))
}

// Points a corner can be laid onto: every distinct vertex and the midpoints of
// the packet outline.
export const snapPoints = packet => {
  const out = []
  const add = q => { if (!out.some(o => Math.hypot(o[0] - q[0], o[1] - q[1]) < 1.5)) out.push(q) }
  for (const f of packet.facets) for (const q of f.pts) add(q)
  const hull = hullPoints(packet)
  hull.forEach((a, i) => {
    const b = hull[(i + 1) % hull.length]
    add([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])
  })
  return out
}

// Pencil ticks travel with whichever layer now carries them.
export const markPoints = (packet, marks) => marks.flatMap(s => {
  const f = packet.facets.find(o => inside(o.sheet, s, -0.6))
  return f ? [apply(f.m, s)] : []
})

// Keyboard order: landing points nearest the lifted corner first, ties broken
// by bearing, so the same packet always walks the same way.
export const targetsFrom = (packet, marks, a) => {
  const out = []
  for (const q of [...snapPoints(packet), ...markPoints(packet, marks)]) {
    if (Math.hypot(q[0] - a[0], q[1] - a[1]) > 3 && !out.some(o => Math.hypot(o[0] - q[0], o[1] - q[1]) < 1.5)) out.push(q)
  }
  const d = q => Math.round(Math.hypot(q[0] - a[0], q[1] - a[1]) * 10)
  const bearing = q => Math.round(Math.atan2(q[1] - a[1], q[0] - a[0]) * 1000)
  return out.sort((p, q) => d(p) - d(q) || bearing(p) - bearing(q))
}

export const nearest = (points, q, radius) => {
  let best = null
  let bd = radius
  for (const p of points) {
    const d = Math.hypot(p[0] - q[0], p[1] - q[1])
    if (d < bd) { bd = d; best = p }
  }
  return best
}

export const facetsAt = (packet, q, inset = INSET) => packet.facets.filter(f => inside(f.pts, q, inset))

export const onPaper = (packet, q) => packet.facets.some(f => inside(f.pts, q, -2))

// Smallest rotated footprint and whether it fits a slot in either orientation.
export const fitSlot = (packet, slot) => {
  const hull = hullPoints(packet)
  let best = null
  for (let deg = 0; deg < 180; deg += 1) {
    const r = deg * Math.PI / 180
    const c = Math.cos(r)
    const s = Math.sin(r)
    let x0 = Infinity; let x1 = -Infinity; let y0 = Infinity; let y1 = -Infinity
    for (const [x, y] of hull) {
      const u = x * c + y * s
      const v = -x * s + y * c
      if (u < x0) x0 = u
      if (u > x1) x1 = u
      if (v < y0) y0 = v
      if (v > y1) y1 = v
    }
    const w = x1 - x0
    const h = y1 - y0
    const slack = Math.min(slot.w - w, slot.h - h)
    const slackTurned = Math.min(slot.w - h, slot.h - w)
    const fit = Math.max(slack, slackTurned)
    if (!best || fit > best.slack + 1e-6) {
      const mu = (x0 + x1) / 2
      const mv = (y0 + y1) / 2
      const turned = slackTurned > slack
      best = { slack: fit, deg, turned, w: turned ? h : w, h: turned ? w : h, cx: mu * c - mv * s, cy: mu * s + mv * c }
    }
  }
  return { fits: best.slack >= 0, ...best }
}

// Sample points inside one printed word, in sheet space.
const wordSamples = word => {
  const out = []
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) {
    out.push([word.x + word.w * (0.08 + 0.84 * i / 5), word.y + word.h * (0.3 + 0.4 * j)])
  }
  return out
}

const facetOfSheetPoint = (packet, s) => packet.facets.find(f => inside(f.sheet, s, 0.4)) || packet.facets.find(f => inside(f.sheet, s, -0.4))

// Fraction of a word that can be read from outside the packet, and from where.
export const wordExposure = (packet, word) => {
  let top = 0
  let bottom = 0
  const samples = wordSamples(word)
  for (const s of samples) {
    const f = facetOfSheetPoint(packet, s)
    if (!f) continue
    const q = apply(f.m, s)
    const frontUp = det(f.m) > 0
    const faceUp = (word.face === 'front') === frontUp
    const over = packet.facets.some(o => o !== f && (faceUp ? o.z > f.z : o.z < f.z) && inside(o.pts, q, 0.4))
    if (!over) {
      if (faceUp) top++
      else bottom++
    }
  }
  return { top: top / samples.length, bottom: bottom / samples.length, any: (top + bottom) / samples.length }
}

const rawEdges = (packet, sheet, f) => {
  const edges = []
  const inv = invert(f.m)
  for (let i = 0; i < f.pts.length; i++) {
    const a = f.pts[i]
    const b = f.pts[(i + 1) % f.pts.length]
    const sa = apply(inv, a)
    const sb = apply(inv, b)
    const mid = [(sa[0] + sb[0]) / 2, (sa[1] + sb[1]) / 2]
    if (onBoundary(sheet.poly, sa) && onBoundary(sheet.poly, sb) && onBoundary(sheet.poly, mid)) edges.push([a, b])
  }
  return edges
}

const segDist = (q, a, b) => {
  const ex = b[0] - a[0]
  const ey = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * ex + (q[1] - a[1]) * ey) / (ex * ex + ey * ey || 1)))
  return { d: Math.hypot(q[0] - a[0] - ex * t, q[1] - a[1] - ey * t), foot: [a[0] + ex * t, a[1] + ey * t] }
}

const onBoundary = (poly, q) => {
  for (let i = 0; i < poly.length; i++) if (segDist(q, poly[i], poly[(i + 1) % poly.length]).d < 0.8) return true
  return false
}

// A seal locks the packet when it presses a loose (uncreased) edge of the top
// layer down onto paper beneath, so the flap cannot lift unseen.
export const sealCheck = (packet, sheet, q, radius) => {
  const under = facetsAt(packet, q, -radius * 0.25)
  if (!under.length) return { ok: false, reason: 'the wax needs paper under it' }
  const topZ = Math.max(...packet.facets.filter(f => inside(f.pts, q, -radius * 0.5)).map(f => f.z))
  const candidates = packet.facets.filter(f => f.z >= topZ - 0.5 || inside(f.pts, q, -radius * 0.5))
  const binding = new Set()
  let openEdge = null
  for (const f of candidates.sort((a, b) => b.z - a.z)) {
    for (const [a, b] of rawEdges(packet, sheet, f)) {
      const { d, foot } = segDist(q, a, b)
      if (d > radius * 0.75) continue
      // The edge must be uppermost where the seal touches it.
      const above = packet.facets.some(o => o.z > f.z && inside(o.pts, foot, 0.3))
      if (above) continue
      binding.add(f.id)
      if (!openEdge) openEdge = { edge: [a, b], foot }
      // Beyond the edge there must be paper for the wax to grip.
      const ex = b[0] - a[0]
      const ey = b[1] - a[1]
      const len = Math.hypot(ex, ey) || 1
      const nx = -ey / len
      const ny = ex / len
      const probeA = [foot[0] + nx * 3.5, foot[1] + ny * 3.5]
      const probeB = [foot[0] - nx * 3.5, foot[1] - ny * 3.5]
      const inF = inside(f.pts, probeA, 0.2) ? probeB : probeA
      const grip = packet.facets.some(o => o.z < f.z && inside(o.pts, inF, 0.2))
      if (grip) return { ok: true, kind: 'flap', edge: [a, b], foot }
    }
  }
  // Wax across an open side binds the loose edges of several layers together.
  if (binding.size >= 2) return { ok: true, kind: 'open', ...openEdge }
  return { ok: false, reason: 'no loose edge under the wax: it would only seal paper to itself' }
}

export const evaluatePacket = (packet, letter, seal) => {
  const fit = fitSlot(packet, letter.slot)
  const words = letter.words.map(w => ({ ...w, ...wordExposure(packet, w) }))
  const leaked = words.filter(w => w.role !== 'address' && w.any >= 0.34)
  const address = words.filter(w => w.role === 'address')
  const addressTop = address.every(w => w.top >= 0.75)
  const addressBottom = address.every(w => w.bottom >= 0.75)
  const sealed = seal ? sealCheck(packet, letter.sheet, seal, letter.sealRadius || 12) : { ok: false, reason: 'no seal yet' }
  return { fit, words, leaked, addressReadable: addressTop || addressBottom, addressFace: addressTop ? 'top' : addressBottom ? 'bottom' : null, sealed }
}
