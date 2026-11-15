// The wind over the race area. It is never drawn as arrows: it exists as a
// slowly swinging gradient wind plus discrete puffs and lulls that are born
// upwind and travel down the course with the breeze. The water shader is
// handed a baked texture of this same field, so what a sailor reads on the
// water is exactly what the boats feel.
//
// Coordinates are metres, x east and y north. Directions are compass radians
// the wind blows FROM (0 = from the north, clockwise positive).

export const TAU = Math.PI * 2
export const DEG = Math.PI / 180

export const wrap = a => {
  let r = (a + Math.PI) % TAU
  if (r < 0) r += TAU
  return r - Math.PI
}

export function makeRng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// the area the water texture covers; outside it the gradient wind still blows
export const AREA = { minX: -260, minY: -160, size: 520 }
const TOP = AREA.minY + AREA.size // upwind edge of the area

function baseOffset(cfg, t) {
  let d = cfg.drift * t
  for (const o of cfg.osc) d += o.amp * Math.sin((TAU * t) / o.period + o.phase)
  return d
}

// a sea breeze fills in over the race
export const buildFactor = (cfg, t) => 1 + Math.min(cfg.buildMax || 0, (cfg.build || 0) * Math.max(0, t))

function baseGust(cfg, t) {
  return buildFactor(cfg, t) + cfg.gustiness * (0.6 * Math.sin(t * 0.31 + 1.3) + 0.4 * Math.sin(t * 0.83 + 0.2))
}

export function createWind(cfg) {
  const rng = makeRng(cfg.seed)
  const field = { cfg, rng, t: 0, puffs: [], spawnAcc: 0, nextId: 1 }
  // the water is already busy when the warning signal goes
  const n = Math.round(cfg.puffRate * (AREA.size / (cfg.speed * 0.85)))
  for (let i = 0; i < n; i++) spawnPuff(field, AREA.minY + rng() * AREA.size, rng() * 0.7)
  return field
}

function spawnPuff(field, y, ageFrac = 0) {
  const { cfg, rng } = field
  const lull = rng() < cfg.lullShare
  const r = cfg.puffRadius[0] + rng() * (cfg.puffRadius[1] - cfg.puffRadius[0])
  const str = lull
    ? -(0.18 + rng() * 0.16)
    : cfg.puffStrength[0] + rng() * (cfg.puffStrength[1] - cfg.puffStrength[0])
  const shift = (rng() * 2 - 1) * cfg.puffShift
  const life = (AREA.size + 2 * r) / (cfg.speed * 0.85) * (0.75 + rng() * 0.5)
  field.puffs.push({
    id: field.nextId++,
    x: -230 + rng() * 460,
    y,
    r,
    str,
    shift,
    life,
    age: ageFrac * life
  })
}

// one step of the field; puffs ride the local gradient wind downwind
export function stepWind(field, dt) {
  const { cfg } = field
  field.t += dt
  field.spawnAcc += dt * cfg.puffRate
  while (field.spawnAcc >= 1) {
    field.spawnAcc -= 1
    spawnPuff(field, TOP + 30 + field.rng() * 40)
  }
  const t = field.t
  for (const p of field.puffs) {
    const dir = cfg.dir + baseOffset(cfg, t - delayAt(cfg, p.y))
    const v = cfg.speed * baseGust(cfg, t) * (1 + Math.max(0, p.str) * 0.5) * 0.85
    p.x -= Math.sin(dir + p.shift * 0.5) * v * dt
    p.y -= Math.cos(dir + p.shift * 0.5) * v * dt
    p.age += dt
  }
  field.puffs = field.puffs.filter(p => p.age < p.life && p.y > AREA.minY - 2 * p.r)
}

// shifts are born at the top of the course and arrive later further down it
function delayAt(cfg, y) {
  return Math.max(0, (TOP - y) / (cfg.speed * 0.85))
}

function envelope(p) {
  const a = p.age / p.life
  return Math.min(1, a / 0.12) * Math.min(1, (1 - a) / 0.18)
}

// gradient + puffs, before any boat's wind shadow
export function windAt(field, x, y, out = { dir: 0, spd: 0, puff: 0 }, puffs = field.puffs) {
  const { cfg, t } = field
  const off = baseOffset(cfg, t - delayAt(cfg, y))
  let dir = cfg.dir + off
  let gain = 0
  let shift = 0
  const sd = Math.sin(dir)
  const cd = Math.cos(dir)
  for (const p of puffs) {
    const dx = x - p.x
    const dy = y - p.y
    const r2 = p.r * p.r * 9
    if (dx * dx + dy * dy > r2) continue
    // along-wind and across-wind distance; puffs are fans, wider than long
    const along = dx * sd + dy * cd
    const across = dx * cd - dy * sd
    const w = envelope(p) * Math.exp(-(across * across) / (p.r * p.r) - (along * along) / (p.r * p.r * 0.55))
    if (w < 0.004) continue
    gain += w * p.str
    shift += w * p.shift
  }
  out.dir = dir + shift
  out.spd = Math.max(0.35, cfg.speed * baseGust(cfg, t) * (1 + gain))
  out.puff = gain
  return out
}

// the slab of disturbed air behind a sail
export function shadowAt(boats, x, y, dir, self) {
  let s = 0
  const ux = -Math.sin(dir)
  const uy = -Math.cos(dir)
  for (let i = 0; i < boats.length; i++) {
    if (i === self) continue
    const b = boats[i]
    if (b.capsized || b.finished) continue
    const dx = x - b.x
    const dy = y - b.y
    const along = dx * ux + dy * uy
    if (along < 1 || along > 34) continue
    const across = Math.abs(dx * uy - dy * ux)
    const half = 2.5 + along * 0.22
    if (across > half) continue
    s += 0.3 * (1 - along / 34) * (1 - across / half)
  }
  return Math.min(0.45, s)
}

// the true wind a particular boat sails in
export function windForBoat(field, boats, i, out) {
  const b = boats[i]
  windAt(field, b.x, b.y, out)
  out.shadow = shadowAt(boats, b.x, b.y, out.dir, i)
  out.spd *= 1 - out.shadow
  return out
}

// the mean gradient direction at a point, as a sailor's compass would learn it
export function meanDirAt(field, y) {
  const { cfg, t } = field
  let d = cfg.dir + cfg.drift * (t - delayAt(cfg, y))
  return d
}

export function currentAt(cfg, x) {
  const c = cfg.current
  if (!c) return { x: 0, y: 0 }
  const k = Math.min(1, Math.max(0, (x - c.from) / (c.to - c.from)))
  const s = c.min + (c.max - c.min) * (k * k * (3 - 2 * k))
  return { x: Math.sin(c.dir) * s, y: Math.cos(c.dir) * s }
}

// bake the field (with every boat's shadow) for the water shader:
// R = speed / (2 x race speed), G = direction offset from the race axis
export function bakeWind(field, boats, data, n) {
  const { cfg } = field
  const tmp = { dir: 0, spd: 0, puff: 0 }
  const step = AREA.size / (n - 1)
  const norm = 1 / (cfg.speed * 2)
  for (let j = 0; j < n; j++) {
    const y = AREA.minY + j * step
    const row = field.puffs.filter(p => Math.abs(p.y - y) < p.r * 3)
    for (let i = 0; i < n; i++) {
      const x = AREA.minX + i * step
      windAt(field, x, y, tmp, row)
      const sh = shadowAt(boats, x, y, tmp.dir, -1)
      const spd = tmp.spd * (1 - sh)
      const k = (j * n + i) * 4
      data[k] = Math.min(255, Math.round(spd * norm * 255))
      data[k + 1] = Math.min(255, Math.max(0, Math.round((0.5 + wrap(tmp.dir - cfg.dir) / 1.2) * 255)))
      data[k + 2] = Math.min(255, Math.round(sh * 400))
      data[k + 3] = 255
    }
  }
}
