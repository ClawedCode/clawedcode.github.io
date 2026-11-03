// The stepwell: a square pool at the foot of nine stepped tiers, its floor cut
// into three terraces, seven clutches of glass eggs, and the sun's road over it.

export const HALF = 6 // the pool spans [-HALF, HALF] on x (east) and z (south)
export const POOL = HALF * 2
export const N = 128 // wave and light grid cells per side
export const DX = POOL / N
export const TIERS = 12
export const RIM = 12 // rim height above the water
export const TIER_RISE = RIM / TIERS
export const TIER_RUN = 0.42
export const RIM_OUT = HALF + TIERS * TIER_RUN // where the top ground begins

export const TERRACES = [
  { id: 'shelf', depth: 0.95, word: 'shelf', color: '#f2b43c' },
  { id: 'middle', depth: 1.6, word: 'middle', color: '#5fd0b5' },
  { id: 'deep', depth: 2.45, word: 'deep', color: '#8f9cff' }
]

export const terraceAt = (x, z) => {
  const m = Math.max(Math.abs(x), Math.abs(z))
  return m > 4 ? 0 : m > 2 ? 1 : 2
}
export const depthAt = (x, z) => TERRACES[terraceAt(x, z)].depth

// Seven clutches. Positions were chosen so each has its own window of sun.
export const CLUTCHES = [
  { id: 'a', x: -4.9, z: -1.3 },
  { id: 'b', x: -2.9, z: 3.1 },
  { id: 'c', x: 0.7, z: -1.1 },
  { id: 'd', x: 1.6, z: 4.9 },
  { id: 'e', x: 3.1, z: -2.8 },
  { id: 'f', x: 5.0, z: 1.8 },
  { id: 'g', x: -1.2, z: 0.9 }
].map(c => ({ ...c, terrace: terraceAt(c.x, c.z) }))

// Height of the stepped architecture at a horizontal point outside the pool.
export const wallHeight = (x, z) => {
  const u = Math.max(Math.abs(x), Math.abs(z)) - HALF
  if (u <= 0) return 0
  if (u >= TIERS * TIER_RUN) return RIM
  return Math.min(RIM, (Math.floor(u / TIER_RUN) + 1) * TIER_RISE)
}

// The sun over a stepwell at 27 degrees north in late spring.
const PHI = 27 * Math.PI / 180
const DEC = 13 * Math.PI / 180
export const DAY_START = 8 * 60
export const DAY_END = 16 * 60 + 30

export function sunAt(minute) {
  const H = (minute / 60 - 12) * 15 * Math.PI / 180
  const up = Math.sin(PHI) * Math.sin(DEC) + Math.cos(PHI) * Math.cos(DEC) * Math.cos(H)
  const east = -Math.cos(DEC) * Math.sin(H)
  const north = Math.sin(DEC) * Math.cos(PHI) - Math.cos(DEC) * Math.cos(H) * Math.sin(PHI)
  const len = Math.hypot(up, east, north)
  // toward the sun, in scene axes (x east, y up, z south)
  return { x: east / len, y: up / len, z: -north / len, elevation: Math.asin(up / len) }
}

// Is a point on the water surface in direct sun?
export function litAt(x, z, sun) {
  if (sun.y <= 0.02) return 0
  const hl = Math.hypot(sun.x, sun.z) || 1e-6
  const dx = sun.x / hl
  const dz = sun.z / hl
  const climb = sun.y / hl
  for (let t = 0.05; t < 40; t += 0.08) {
    const rise = t * climb
    if (rise >= RIM) return 1
    if (wallHeight(x + dx * t, z + dz * t) > rise) return 0
  }
  return 1
}

export const MASK_N = 64
export function computeMask(sun, out = new Float32Array(MASK_N * MASK_N)) {
  for (let j = 0; j < MASK_N; j++) {
    for (let i = 0; i < MASK_N; i++) {
      const x = -HALF + (i + 0.5) * POOL / MASK_N
      const z = -HALF + (j + 0.5) * POOL / MASK_N
      out[j * MASK_N + i] = litAt(x, z, sun)
    }
  }
  return out
}

export const sunStrength = sun => Math.max(0, Math.min(1, (sun.y - 0.05) / 0.85)) ** 0.7

export function formatClock(minute) {
  const h = Math.floor(minute / 60)
  const m = Math.floor(minute % 60)
  const hh = ((h + 11) % 12) + 1
  return `${hh}:${String(m).padStart(2, '0')}${h < 12 ? ' a.m.' : ' p.m.'}`
}
