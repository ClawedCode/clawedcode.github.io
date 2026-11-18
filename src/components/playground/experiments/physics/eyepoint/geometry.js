// The lane: every solid is either a box rotated about Y or an upright cylinder.
// The same list feeds the CPU sight tests and the WebGL scene, so what the
// numbers say and what the picture shows can never disagree.
//
// Units are metres. x runs along the lane (west to east), z runs from the back
// wall (negative) toward the open south side, y is up. A box stands on y with
// height h; x/z are its footprint centre.

export const PAINTABLE = {
  plaster: true, stone: true, cobble: true, board: true, wood: true, terracotta: true,
  cloth: true, shutter: true, glass: false, water: false, leaf: false, brass: false
}

export const box = (id, mat, x, y, z, w, h, d, ry = 0, extra = {}) => ({ id, kind: 'box', mat, x, y, z, w, h, d, ry, ...extra })
export const cyl = (id, mat, x, y, z, r, h, extra = {}) => ({ id, kind: 'cyl', mat, x, y, z, r, h, ry: 0, ...extra })

const steps = () => {
  const out = []
  // a flight rising westward up the side of the west house, to a landing
  for (let i = 0; i < 9; i++) {
    out.push(box(`step${i}`, 'stone', -6.4 - i * 0.4, 0, 3.6, 0.4 + 0.01, 0.34 * (i + 1), 1.5))
  }
  out.push(box('landing', 'stone', -9.6, 0, 1.6, 1.6, 3.06, 5.4))
  out.push(box('landing-wall', 'plaster', -8.86, 3.06, 0.2, 0.14, 0.95, 2.6))
  return out
}

export const LANE = [
  // ground and the drop to the sea beyond the arch
  box('cobbles', 'cobble', 0, -0.4, -1.4, 26, 0.4, 16.4),
  box('terrace', 'stone', 0, -0.4, -7.7, 6, 0.4, 1.4),
  box('sea', 'water', 0, -7, -160, 600, 0.2, 300),
  box('cliff', 'stone', 0, -7, -9.7, 26, 6.6, 1),

  // back wall: two house fronts split by an archway that frames the sea
  box('house-nw', 'plaster', -5.75, 0, -7, 8.5, 6.2, 2),
  box('house-ne', 'plaster', 5.75, 0, -7, 8.5, 5.3, 2),
  box('lintel', 'plaster', 0, 3.3, -7, 3.1, 2.9, 2),
  box('roof-nw', 'terracotta', -5.75, 6.2, -6.6, 8.7, 0.35, 2.4),
  box('roof-ne', 'terracotta', 5.75, 5.3, -6.6, 8.7, 0.35, 2.4),
  box('door-nw', 'shutter', -6.6, 0, -5.97, 1.2, 2.3, 0.08),
  box('window-ne', 'glass', 4.6, 1.7, -5.96, 1.7, 1.6, 0.06),
  box('shutter-ne-l', 'shutter', 3.45, 1.7, -5.96, 0.55, 1.6, 0.06),
  box('shutter-ne-r', 'shutter', 5.75, 1.7, -5.96, 0.55, 1.6, 0.06),
  box('window-nw', 'glass', -3.2, 3.4, -5.96, 1.2, 1.3, 0.06),

  // west house with the stair, east house with the balcony
  box('house-w', 'plaster', -11.2, 0, -0.5, 2.4, 6.6, 13),
  ...steps(),
  box('house-e', 'plaster', 11.2, 0, -0.5, 2.4, 6.0, 13),
  box('balcony', 'stone', 9.35, 3.0, 0.4, 1.3, 0.22, 2.8),
  box('balcony-rail', 'brass', 8.74, 3.22, 0.4, 0.06, 0.9, 2.8),
  box('door-e', 'shutter', 9.98, 0, 3.2, 0.08, 2.3, 1.2),

  // fixtures in the lane
  cyl('well', 'stone', 2.8, 0, -2.4, 0.75, 0.95),
  cyl('column-a', 'stone', -2.6, 0, -3.6, 0.28, 3.6),
  cyl('lamp-a', 'brass', 6.6, 0, 1.6, 0.07, 3.4),
  cyl('olive', 'wood', -6.2, 0, -2.8, 0.22, 2.4),
  cyl('olive-crown', 'leaf', -6.2, 2.2, -2.8, 1.35, 1.7),
  box('bench', 'wood', -4.4, 0, 3.2, 1.8, 0.48, 0.5),
  box('table', 'wood', 0.1, 0, 4.4, 1.0, 0.78, 1.0),
  cyl('jar-a', 'terracotta', 7.8, 0, -4.7, 0.36, 0.9),
  cyl('jar-b', 'terracotta', 8.6, 0, -4.4, 0.3, 0.7)
]

// Props are delivered per commission. Once that commission's paint is laid
// they stay where they were put, paint and all, for the rest of the evening.
export const PROP_SHAPES = {
  board: { kind: 'box', mat: 'board', w: 1.9, h: 2.4, d: 0.1, label: 'plaster board' },
  screen: { kind: 'box', mat: 'cloth', w: 2.6, h: 1.8, d: 0.06, label: 'sail screen' },
  crate: { kind: 'box', mat: 'wood', w: 1.1, h: 1.1, d: 1.1, label: 'crate' },
  slat: { kind: 'box', mat: 'board', w: 0.9, h: 3.0, d: 0.1, label: 'narrow board' }
}

export const makeProp = (shape, id, x, z, ry = 0) => {
  const s = PROP_SHAPES[shape]
  return { id, shape, kind: s.kind, mat: s.mat, x, y: 0, z, w: s.w, h: s.h, d: s.d, ry, movable: true }
}

export const BOUNDS = { x0: -8.6, x1: 8.4, z0: -7.4, z1: 6.0 }

// 2D footprint corners for overlap checks
const corners = s => {
  if (s.kind === 'cyl') return [[s.x - s.r, s.z - s.r], [s.x + s.r, s.z - s.r], [s.x + s.r, s.z + s.r], [s.x - s.r, s.z + s.r]]
  const c = Math.cos(s.ry); const n = Math.sin(s.ry)
  const hw = s.w / 2; const hd = s.d / 2
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([a, b]) => [s.x + a * c + b * n, s.z - a * n + b * c])
}
const axesOf = pts => [0, 1].map(i => {
  const [a, b] = pts[i]; const [c, d] = pts[i + 1]
  const ex = c - a; const ez = d - b; const l = Math.hypot(ex, ez) || 1
  return [-ez / l, ex / l]
})
const overlap2d = (A, B) => {
  for (const [ax, az] of [...axesOf(A), ...axesOf(B)]) {
    let a0 = Infinity; let a1 = -Infinity; let b0 = Infinity; let b1 = -Infinity
    for (const [x, z] of A) { const p = x * ax + z * az; a0 = Math.min(a0, p); a1 = Math.max(a1, p) }
    for (const [x, z] of B) { const p = x * ax + z * az; b0 = Math.min(b0, p); b1 = Math.max(b1, p) }
    if (a1 <= b0 + 0.02 || b1 <= a0 + 0.02) return false
  }
  return true
}

// distance from a ground point to a prop's footprint
export function footprintDistance(prop, x, z) {
  const c = Math.cos(prop.ry); const n = Math.sin(prop.ry)
  const rx = x - prop.x; const rz = z - prop.z
  const lx = rx * c - rz * n; const lz = rx * n + rz * c
  const dx = Math.max(0, Math.abs(lx) - prop.w / 2)
  const dz = Math.max(0, Math.abs(lz) - prop.d / 2)
  return Math.hypot(dx, dz)
}

// Can a prop stand here? Inside the lane, not through a wall, a fixture or
// another prop, and not in anybody's face: seats and watchers keep a clear ring.
export const CLEAR_RING = 3.4
export function placeable(prop, solids, zones = []) {
  const C = corners(prop)
  for (const [x, z] of C) {
    if (x < BOUNDS.x0 || x > BOUNDS.x1 || z < BOUNDS.z0 || z > BOUNDS.z1) return false
  }
  for (const zn of zones) if (footprintDistance(prop, zn.x, zn.z) < zn.r) return false
  for (const s of solids) {
    if (s === prop || s.id === prop.id) continue
    if (s.mat === 'water' || s.id === 'cobbles' || s.id === 'terrace' || s.id === 'cliff') continue
    if (s.y > prop.h - 0.05) continue // things overhead (roofs, crowns) do not block
    if (s.y + (s.h || 0) < 0.05) continue
    if (overlap2d(C, corners(s))) return false
  }
  return true
}

const EPS = 1e-9

// Ray against one solid. Returns entry distance or Infinity.
export function hitSolid(s, ox, oy, oz, dx, dy, dz) {
  if (s.kind === 'cyl') {
    const px = ox - s.x; const pz = oz - s.z
    const a = dx * dx + dz * dz
    let best = Infinity
    if (a > EPS) {
      const b = 2 * (px * dx + pz * dz)
      const c = px * px + pz * pz - s.r * s.r
      const disc = b * b - 4 * a * c
      if (disc >= 0) {
        const t = (-b - Math.sqrt(disc)) / (2 * a)
        if (t > 1e-4) {
          const y = oy + dy * t
          if (y >= s.y && y <= s.y + s.h) best = t
        }
      }
    }
    if (Math.abs(dy) > EPS) {
      for (const cy of [s.y, s.y + s.h]) {
        const t = (cy - oy) / dy
        if (t > 1e-4 && t < best) {
          const x = px + dx * t; const z = pz + dz * t
          if (x * x + z * z <= s.r * s.r) best = t
        }
      }
    }
    return best
  }
  // box: move into local frame
  const c = Math.cos(s.ry); const n = Math.sin(s.ry)
  const rx = ox - s.x; const rz = oz - s.z
  const lx = rx * c - rz * n; const lz = rx * n + rz * c
  const ldx = dx * c - dz * n; const ldz = dx * n + dz * c
  const ly = oy - (s.y + s.h / 2)
  const hw = s.w / 2; const hh = s.h / 2; const hd = s.d / 2
  let t0 = -Infinity; let t1 = Infinity
  const slab = (o, d, h) => {
    if (Math.abs(d) < EPS) return o >= -h && o <= h
    let a = (-h - o) / d; let b = (h - o) / d
    if (a > b) { const tmp = a; a = b; b = tmp }
    if (a > t0) t0 = a
    if (b < t1) t1 = b
    return t0 <= t1
  }
  if (!slab(lx, ldx, hw) || !slab(ly, dy, hh) || !slab(lz, ldz, hd)) return Infinity
  if (t1 < 1e-4) return Infinity
  return t0 > 1e-4 ? t0 : Infinity // a ray that starts inside a solid sees nothing of it
}

export function castRay(solids, ox, oy, oz, dx, dy, dz, maxT = 400) {
  let best = maxT; let hit = null
  for (let i = 0; i < solids.length; i++) {
    const t = hitSolid(solids[i], ox, oy, oz, dx, dy, dz)
    if (t < best) { best = t; hit = solids[i] }
  }
  return hit ? { t: best, solid: hit } : null
}
