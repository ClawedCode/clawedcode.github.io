// Pure survey model: terrain, sight lines, weather and the least-squares sheet.
// One world unit is ten metres. North is -z, bearings run clockwise from north.

export const WORLD = 640
export const SHEET = { x0: -210, z0: -215, size: 420 }
export const EYE = 2.2
export const SIGNAL = 3.4
export const DAYS = 12
export const READINGS_PER_DAY = 6
export const NOMINAL_SIGMA = 0.0009 // radians, used for drawing error ellipses
export const MIN_CUT = 12 // degrees between rays before a cairn can be fixed

const DEG = Math.PI / 180
const gauss = (x, z, cx, cz, h, sx, sz = sx) => h * Math.exp(-(((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2))
const smooth = (a, b, t) => {
  const k = Math.min(Math.max((t - a) / (b - a), 0), 1)
  return k * k * (3 - 2 * k)
}

function hash(ix, iz) {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
function valueNoise(x, z) {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = x - ix
  const fz = z - iz
  const ux = fx * fx * (3 - 2 * fx)
  const uz = fz * fz * (3 - 2 * fz)
  const a = hash(ix, iz)
  const b = hash(ix + 1, iz)
  const c = hash(ix, iz + 1)
  const d = hash(ix + 1, iz + 1)
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz
}
const fbm = (x, z) => valueNoise(x, z) * 0.55 + valueNoise(x * 2.1, z * 2.1) * 0.28 + valueNoise(x * 4.3, z * 4.3) * 0.17
// Sharp-crested noise for gullies and arêtes on the high ground.
const ridge = v => { const r = 1 - Math.abs(v * 2 - 1); return r * r }
const ridged = (x, z) => ridge(valueNoise(x, z)) * 0.5 + ridge(valueNoise(x * 2.03 + 5, z * 2.03 - 3)) * 0.3 + ridge(valueNoise(x * 4.1 - 7, z * 4.1 + 1)) * 0.2

export function height(x, z) {
  const ridgeZ = -72 + 9 * Math.sin(x / 70)
  const taper = 1 - smooth(150, 300, Math.abs(x))
  let h = 6 + smooth(-20, -110, z) * 14 // the land beyond the ridge sits higher than the valley
  h += 66 * taper * Math.exp(-(((z - ridgeZ) / 30) ** 2))
  h += gauss(x, z, -58, -74, 44, 24)
  h += gauss(x, z, 50, -78, 50, 25)
  h -= gauss(x, z, -4, -72, 26, 7.5, 44) // the notch the road must find
  h += 24 * (1 - smooth(110, 190, Math.abs(x))) * Math.exp(-(((z - 14) / 22) ** 2)) // the Brow
  h += gauss(x, z, -6, 8, 30, 20)
  h += gauss(x, z, -95, 22, 20, 22)
  h += gauss(x, z, 88, 30, 18, 24)
  h += gauss(x, z, -165, -35, 58, 40)
  h += gauss(x, z, 18, -182, 14, 26)
  h += gauss(x, z, 150, 95, 8, 22)
  h -= 5 * Math.exp(-(((x - 0.25 * (z - 100)) / 16) ** 2)) * smooth(40, 90, z) // river through the valley floor
  const craggy = smooth(26, 70, h) * smooth(16, 34, Math.hypot(x + 4, (z + 72) * 0.6))
  h += (ridged(x / 38 + 3, z / 38 + 9) - 0.42) * 26 * craggy
  h += (fbm(x / 34 + 11, z / 34 - 7) - 0.5) * 9 + (valueNoise(x / 7, z / 7) - 0.5) * 1.6
  h += smooth(250, 330, Math.hypot(x, z)) * 40 * fbm(x / 60, z / 60) // far hills close the horizon
  return Math.max(h, 1.2)
}

const CAIRN_SPECS = [
  { id: 'kirk', name: 'Kirk Base', x: -45, z: 150, known: true, code: [1] },
  { id: 'mill', name: 'Mill Base', x: 55, z: 142, known: true, code: [1, 1] },
  { id: 'lowfold', name: 'Lowfold Barn', x: 150, z: 95, code: [2] },
  { id: 'hob', name: "Hob's Knoll", x: -95, z: 22, code: [1, 2] },
  { id: 'weir', name: 'Weir Hill', x: 88, z: 30, code: [2, 1] },
  { id: 'lantern', name: 'Lantern Tor', x: -6, z: 8, code: [1, 1, 1] },
  { id: 'westcrown', name: 'West Crown', x: -58, z: -74, code: [2, 2] },
  { id: 'eastcrown', name: 'East Crown', x: 50, z: -78, code: [2, 1, 1] },
  { id: 'saddle', name: 'The Saddle', x: -4, z: -72, code: [1, 2, 1], mast: 9 },
  { id: 'raven', name: 'Raven Scar', x: -165, z: -35, code: [2, 2, 1] },
  { id: 'farshiel', name: 'Far Shiel', x: 18, z: -182, code: [1, 1, 2] }
]

// Hill cairns are built on the actual summit near their surveyed name.
function summit(c) {
  if (c.known || c.id === 'saddle') return c
  let best = { x: c.x, z: c.z, h: height(c.x, c.z) }
  for (let dz = -14; dz <= 14; dz += 1) {
    for (let dx = -14; dx <= 14; dx += 1) {
      const h = height(c.x + dx, c.z + dz)
      if (h > best.h) best = { x: c.x + dx, z: c.z + dz, h }
    }
  }
  return { ...c, x: best.x, z: best.z }
}

export const CAIRNS = CAIRN_SPECS.map((c, index) => {
  const s = summit(c)
  return { ...s, index, h: height(s.x, s.z), signal: c.mast || SIGNAL }
})
export const CAIRN = Object.fromEntries(CAIRNS.map(c => [c.id, c]))
export const VILLAGE = { x: -36, z: 172 }
export const BASELINE = Math.hypot(CAIRN.mill.x - CAIRN.kirk.x, CAIRN.mill.z - CAIRN.kirk.z)

export const bearingTo = (from, to) => {
  const a = Math.atan2(to.x - from.x, -(to.z - from.z)) / DEG
  return (a + 360) % 360
}
export const wrap = d => ((d + 540) % 360) - 180

export function lineOfSight(a, b) {
  const ax = a.x
  const az = a.z
  const ay = height(a.x, a.z) + EYE
  const by = height(b.x, b.z) + (b.signal || SIGNAL)
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 2.5)
  for (let i = 2; i < steps - 1; i++) {
    const t = i / steps
    const x = ax + (b.x - ax) * t
    const z = az + (b.z - az) * t
    if (height(x, z) > ay + (by - ay) * t - 0.4) return false
  }
  return true
}

// Which cairn signals each station can ever see on a clear day.
export const SIGHTS = Object.fromEntries(CAIRNS.map(a => [a.id, CAIRNS.filter(b => b.id !== a.id && lineOfSight(a, b)).map(b => b.id)]))

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const WEATHER = {
  clear: { id: 'clear', name: 'clear', note: 'sun on every mirror', reach: 520, sigma: 0.0002, fog: 0.0027, valleyFog: 0, readable: true },
  haze: { id: 'haze', name: 'haze', note: 'the air shimmers; long sights waver', reach: 300, sigma: 0.0011, fog: 0.0042, valleyFog: 0.2, readable: true },
  valley: { id: 'valley', name: 'valley fog', note: 'fog fills the valley to the Brow; the tops stand clear', reach: 520, fogTop: 24, sigma: 0.0004, fog: 0.0024, valleyFog: 1, readable: true },
  rain: { id: 'rain', name: 'rain on the tops', note: 'no mirror can catch the sun today', reach: 70, sigma: 0, fog: 0.012, valleyFog: 0.5, readable: false }
}

export function weatherSchedule(seed) {
  const rand = mulberry32(seed)
  const days = ['clear']
  for (let d = 1; d < DAYS + 4; d++) {
    const late = d / DAYS
    const r = rand()
    if (r < 0.42 - late * 0.22) days.push('clear')
    else if (r < 0.66 - late * 0.12) days.push('haze')
    else if (r < 0.86) days.push('valley')
    else days.push('rain')
  }
  return days
}

export function canSee(fromId, toId, weatherId) {
  const w = WEATHER[weatherId]
  if (!w.readable) return false
  const a = CAIRN[fromId]
  const b = CAIRN[toId]
  if (!SIGHTS[fromId].includes(toId)) return false
  if (Math.hypot(b.x - a.x, b.z - a.z) > w.reach) return false
  if (w.fogTop && (a.h < w.fogTop || b.h < w.fogTop)) return false
  return true
}

export function travelDays(fromId, toId) {
  const a = CAIRN[fromId]
  const b = CAIRN[toId]
  const d = Math.hypot(b.x - a.x, b.z - a.z)
  return Math.max(1, Math.round((d + 1.5 * Math.max(0, b.h - a.h)) / 120))
}

// Gaussian noise for the instrument itself; the player's aim is the larger error.
export function instrumentNoise(rand, sigma) {
  const u = Math.max(rand(), 1e-9)
  const v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sigma
}

const rayDir = az => [Math.sin(az * DEG), -Math.cos(az * DEG)]

function cutAngle(rays) {
  let best = 0
  for (let i = 0; i < rays.length; i++) {
    for (let j = i + 1; j < rays.length; j++) {
      const d = Math.abs(wrap(rays[i].az - rays[j].az)) % 180
      best = Math.max(best, Math.min(d, 180 - d))
    }
  }
  return best
}

function intersect(rays) {
  let a = 0, b = 0, c = 0, px = 0, pz = 0
  for (const r of rays) {
    const [dx, dz] = rayDir(r.az)
    const nx = -dz
    const nz = dx
    const w = 1 / Math.max(r.range || 100, 20) ** 2
    a += nx * nx * w
    b += nx * nz * w
    c += nz * nz * w
    const k = (nx * r.x + nz * r.z) * w
    px += nx * k
    pz += nz * k
  }
  const det = a * c - b * b
  if (Math.abs(det) < 1e-12) return null
  return { x: (c * px - b * pz) / det, z: (a * pz - b * px) / det, normal: [a, b, c] }
}

function ellipse(rays, at) {
  let a = 0, b = 0, c = 0
  for (const r of rays) {
    const [dx, dz] = rayDir(r.az)
    const nx = -dz
    const nz = dx
    const s = Math.max(Math.hypot(at.x - r.x, at.z - r.z), 5) * NOMINAL_SIGMA
    a += (nx * nx) / (s * s)
    b += (nx * nz) / (s * s)
    c += (nz * nz) / (s * s)
  }
  const det = a * c - b * b
  const ia = c / det
  const ib = -b / det
  const ic = a / det
  const tr = (ia + ic) / 2
  const disc = Math.sqrt(Math.max(tr * tr - (ia * ic - ib * ib), 0))
  const l1 = tr + disc
  const l2 = Math.max(tr - disc, 0)
  const angle = Math.atan2(l1 - ia, ib || 1e-9) / DEG
  return { rx: 2 * Math.sqrt(l1), rz: 2 * Math.sqrt(l2), angle }
}

// Rebuild the whole sheet from the field book. Stations sit where the sheet
// believes they are, so an early bad fix bends every ray drawn from it later.
export function adjustNetwork(observations) {
  const plotted = {}
  CAIRNS.filter(c => c.known).forEach(c => { plotted[c.id] = { x: c.x, z: c.z, h: c.h, rays: [], cut: 180, ellipse: null, known: true } })
  const raysFor = id => observations
    .filter(o => o.target === id && plotted[o.from])
    .map(o => {
      const from = plotted[o.from]
      return { x: from.x, z: from.z, az: o.az, from: o.from, elev: o.elev, fromH: from.h, range: null }
    })
  for (let pass = 0; pass < 6; pass++) {
    let changed = false
    for (const cairn of CAIRNS) {
      if (cairn.known) continue
      const rays = raysFor(cairn.id)
      const stations = new Set(rays.map(r => r.from))
      if (stations.size < 2 || cutAngle(rays) < MIN_CUT) continue
      let fix = intersect(rays)
      if (!fix) continue
      for (let k = 0; k < 2; k++) {
        rays.forEach(r => { r.range = Math.hypot(fix.x - r.x, fix.z - r.z) })
        fix = intersect(rays) || fix
      }
      const heights = rays.map(r => r.fromH + EYE + Math.hypot(fix.x - r.x, fix.z - r.z) * Math.tan(r.elev * DEG) - cairn.signal)
      const h = heights.reduce((s, v) => s + v, 0) / heights.length
      const prev = plotted[cairn.id]
      if (!prev || Math.hypot(prev.x - fix.x, prev.z - fix.z) > 1e-4) changed = true
      plotted[cairn.id] = { x: fix.x, z: fix.z, h, rays, cut: cutAngle(rays), ellipse: ellipse(rays, fix), known: false }
    }
    if (!changed) break
  }
  return plotted
}

// How far the sheet's own geometry disagrees with a reading of an already-plotted cairn.
export function misclosure(plotted, obs) {
  const from = plotted[obs.from]
  const to = plotted[obs.target]
  if (!from || !to) return null
  const expected = bearingTo(from, to)
  const range = Math.hypot(to.x - from.x, to.z - from.z)
  return Math.abs(Math.sin(wrap(obs.az - expected) * DEG)) * range
}

export function trueError(plotted, id) {
  const p = plotted[id]
  if (!p) return null
  return Math.hypot(p.x - CAIRN[id].x, p.z - CAIRN[id].z)
}

// The crews cut the road straight from the village through the sheet's saddle
// to the sheet's Far Shiel, across the real ground.
export function cutRoad(plotted) {
  const s = plotted.saddle
  const f = plotted.farshiel
  if (!s || !f) return null
  const legs = [[VILLAGE, s], [s, f]]
  const path = []
  legs.forEach(([a, b], leg) => {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 2)
    for (let i = leg ? 1 : 0; i <= n; i++) {
      const t = i / n
      const x = a.x + (b.x - a.x) * t
      const z = a.z + (b.z - a.z) * t
      path.push({ x, z, h: height(x, z) })
    }
  })
  let crest = path[0]
  path.forEach(p => { if (p.h > crest.h) crest = p })
  const saddleH = height(CAIRN.saddle.x, CAIRN.saddle.z)
  const extra = crest.h - saddleH
  const farMiss = Math.hypot(f.x - CAIRN.farshiel.x, f.z - CAIRN.farshiel.z)
  const saddleMiss = Math.hypot(s.x - CAIRN.saddle.x, s.z - CAIRN.saddle.z)
  const STALL = 10
  let stopAt = path.length - 1
  if (extra > STALL) stopAt = path.findIndex(p => p.h > saddleH + STALL)
  const outcome = extra > STALL ? 'stalled' : extra > 4 ? 'shoulder' : farMiss > 7 ? 'wrong-cleugh' : 'crown'
  return { path, crest, extra, farMiss, saddleMiss, stopAt, outcome, saddleH }
}

export function contours(step = 10, cells = 104) {
  const { x0, z0, size } = SHEET
  const d = size / cells
  const grid = []
  for (let j = 0; j <= cells; j++) {
    const row = []
    for (let i = 0; i <= cells; i++) row.push(height(x0 + i * d, z0 + j * d))
    grid.push(row)
  }
  const lines = []
  for (let level = step; level < 130; level += step) {
    let path = ''
    for (let j = 0; j < cells; j++) {
      for (let i = 0; i < cells; i++) {
        const v = [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]]
        const corners = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]
        const pts = []
        for (let e = 0; e < 4; e++) {
          const a = v[e]
          const b = v[(e + 1) % 4]
          if ((a < level) !== (b < level)) {
            const t = (level - a) / (b - a)
            const [ax, az] = corners[e]
            const [bx, bz] = corners[(e + 1) % 4]
            pts.push([x0 + (ax + (bx - ax) * t) * d, z0 + (az + (bz - az) * t) * d])
          }
        }
        for (let p = 0; p + 1 < pts.length; p += 2) {
          path += `M${pts[p][0].toFixed(1)} ${pts[p][1].toFixed(1)}L${pts[p + 1][0].toFixed(1)} ${pts[p + 1][1].toFixed(1)}`
        }
      }
    }
    lines.push({ level, path, index: level % 50 === 0 })
  }
  return lines
}

export const formatBearing = az => {
  const a = ((az % 360) + 360) % 360
  const d = Math.floor(a)
  const m = Math.floor((a - d) * 60)
  return `${String(d).padStart(3, '0')}°${String(m).padStart(2, '0')}′`
}
export const metres = units => `${Math.round(units * 10)} m`
