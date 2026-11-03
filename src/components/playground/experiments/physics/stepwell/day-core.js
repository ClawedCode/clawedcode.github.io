// One day at the stepwell: the clock, the sun, the drip pots that ring the
// water, and the clutches that need that light gathered onto them.
import { CLUTCHES, TERRACES, HALF, MASK_N, sunAt, computeMask, sunStrength, DAY_START, DAY_END } from './well'
import { STEPS_PER_SECOND, WAVE_SPEED, focalDepth } from './optics'

export const FIRST_LIGHT = DAY_START + 40
export const SECONDS_PER_HOUR = 30
export const FAST = 4
export const GAUGE_HZ = 30

export const TEMPO_MIN = 1.6
export const TEMPO_MAX = 2.6
export const TEMPO_STEP = 0.1
// Where a lone pot's rings come into focus on each floor, by drip tempo:
// the radius (world units from the pot) at which the surface's measured crest
// curvature puts the focal point on the shelf, middle and deep terraces.
// Measured with these optics, eight bearings averaged, then smoothed.
const RING_TABLE = [
  [1.6, 0.95, 1.43, 2.18],
  [1.7, 1.0, 2.0, 2.78],
  [1.8, 1.26, 2.45, 3.33],
  [1.9, 1.55, 2.85, 3.9],
  [2.0, 1.77, 3.15, 4.4],
  [2.1, 1.85, 3.4, 4.75],
  [2.2, 2.06, 3.65, 4.98],
  [2.3, 2.21, 3.92, 5.2],
  [2.4, 2.4, 4.05, 5.4],
  [2.5, 2.5, 4.28, 5.6],
  [2.6, 2.53, 4.49, 5.8]
]
function ringsAt(tempo) {
  const t = Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, tempo))
  const i = Math.min(RING_TABLE.length - 2, Math.floor((t - TEMPO_MIN) / TEMPO_STEP + 1e-6))
  const a = RING_TABLE[i]
  const b = RING_TABLE[i + 1]
  const u = (t - a[0]) / (b[0] - a[0])
  return [1, 2, 3].map(n => a[n] + (b[n] - a[n]) * u)
}
const DEPTHS = TERRACES.map(t => t.depth)
// piecewise-linear through (depth, radius) points, extrapolated past the ends
function radiusFor(points, depth) {
  const n = points.length
  let i = 0
  while (i < n - 2 && depth > points[i + 1][0]) i++
  const [d0, r0] = points[i]
  const [d1, r1] = points[i + 1]
  return Math.max(0.3, r0 + (r1 - r0) * (depth - d0) / (d1 - d0))
}
// Where a pot's ripples focus on each floor for today's light: a slanted sun
// travels farther through the water, so every ring sits farther out.
export function focusRings(tempo, slant = 1) {
  const r = ringsAt(tempo)
  const pts = DEPTHS.map((d, i) => [d, r[i]])
  return DEPTHS.map(d => radiusFor(pts, d * slant))
}
// A paw dip is one broad ring; as it spreads, its crest focuses ever deeper.
// Measured with these optics: focal depth at each radius from the dip.
const PAW_FOCUS = [[0.5, 0.45], [1, 1.17], [1.5, 1.47], [2, 1.8], [2.5, 2.33], [3, 2.95], [3.5, 3.82], [4, 5.12], [5, 5.8]]
const pawFocalAt = r => {
  if (r <= PAW_FOCUS[0][0]) return PAW_FOCUS[0][1]
  for (let i = 1; i < PAW_FOCUS.length; i++) {
    const [r1, f1] = PAW_FOCUS[i]
    const [r0, f0] = PAW_FOCUS[i - 1]
    if (r <= r1) return f0 + (f1 - f0) * (r - r0) / (r1 - r0)
  }
  return PAW_FOCUS[PAW_FOCUS.length - 1][1]
}
export function pawRings(slant = 1) {
  const pts = PAW_FOCUS.map(([r, f]) => [f, r])
  return DEPTHS.map(d => radiusFor(pts, d * slant))
}
// cos of the refracted angle: how much longer than the depth the light's path is
export function slantOf(sun) {
  const sinT = Math.sqrt(Math.max(0, 1 - sun.y * sun.y)) / 1.333
  return 1 / Math.sqrt(1 - sinT * sinT)
}

const POT_AMP = 4
const PAW_AMP = 1.6
const PAW_RADIUS = 0.4
const PAW_BURST = 0.09 // progress from one ring that passes a clutch's lens in focus
export const PAWS_START = 4
export const PAWS_PER_LAMP = 2
export const PAWS_MAX = 8
export const DROP_FALL = 0.32 // seconds a drop takes from the pot's lip to the water
const HATCH_RATE = 0.032 // a clutch in true focus under full sun hatches in ~35 s
const FOCUS_TOLERANCE = 0.3 // log-ratio of focal length to the light's path to the floor
const CHILL = 0.008 // progress lost per second while a clutch sits out of focus
const POT_REACH = HALF - 0.45
const POT_SOUTH = HALF - 1.6 // a pot hangs high; further south it would leave the frame

export const CLOUDS = [
  { from: 11 * 60 + 5, to: 11 * 60 + 35 },
  { from: 14 * 60 + 15, to: 14 * 60 + 35 }
]
export const cloudCover = minute => {
  let c = 0
  for (const cl of CLOUDS) {
    if (minute < cl.from - 4 || minute > cl.to + 4) continue
    const into = Math.min(minute - (cl.from - 4), cl.to + 4 - minute) / 4
    c = Math.max(c, Math.min(1, into))
  }
  return c
}

export const POT_UNLOCKS = [0, 1, 3] // hatched clutches needed before each pot arrives

export function freshDay() {
  return {
    phase: 'intro',
    minute: 10 * 60 + 20, // the title card shows the well at mid-morning
    simTime: 0,
    stepCarry: 0,
    gaugeCarry: 0,
    speed: 1,
    pots: [
      { id: 1, x: -3.9, z: -2.5, tempo: 1.7, unlocked: true, hung: true, phase: 0, drops: 0 },
      { id: 2, x: 0, z: -5.4, tempo: 2.0, unlocked: false, hung: false, phase: 0, drops: 0 },
      { id: 3, x: 0, z: 5.4, tempo: 2.0, unlocked: false, hung: false, phase: 0, drops: 0 }
    ],
    clutches: CLUTCHES.map(c => ({ ...c, progress: 0, kTrack: 0, kAvg: 0, focal: Infinity, match: 0, dose: 0, glow: 0, light: 1, lit: 0, lensX: c.x, lensZ: c.z, state: 'dormant', at: null })),
    sun: sunAt(FIRST_LIGHT - 10),
    strength: 0,
    cloud: 0,
    mask: null,
    maskMinute: -1,
    paws: 0,
    pawsLeft: PAWS_START,
    rings: [],
    slant: 1,
    drops: 0,
    hatched: 0,
    focusSeconds: 0,
    events: [],
    result: null,
    endedAt: null
  }
}

const clampPot = v => Math.max(-POT_REACH, Math.min(POT_REACH, v))

export function movePot(G, id, x, z) {
  const p = G.pots.find(q => q.id === id)
  if (!p || !p.unlocked) return
  p.hung = true
  p.x = clampPot(x)
  p.z = Math.min(POT_SOUTH, clampPot(z))
}

export function setTempo(G, id, tempo) {
  const p = G.pots.find(q => q.id === id)
  if (!p || !p.unlocked) return
  p.tempo = Math.round(Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, tempo)) * 10) / 10
}

// A paw dip spends one of the day's paws and sends a single ring outward.
export function paw(G, optics, x, z) {
  if (G.phase !== 'day' || Math.abs(x) > HALF || Math.abs(z) > HALF) return false
  if (G.pawsLeft <= 0) { emit(G, { type: 'no-paws' }); return false }
  optics.impulse(x, z, PAW_AMP, PAW_RADIUS)
  G.paws++
  G.pawsLeft--
  G.rings.push({ x, z, born: G.simTime })
  emit(G, { type: 'paw', x, z })
  return true
}

function emit(G, e) { G.events.push(e) }

// Advance the day by dt real seconds.
export function tick(G, optics, dt) {
  if (G.phase === 'intro' || G.phase === 'dusk') {
    // the water keeps moving under the title and the ending
    runWater(G, optics, dt)
    gauge(G, optics, dt, false)
    return
  }
  const sdt = dt * G.speed
  G.minute += sdt * 60 / SECONDS_PER_HOUR
  runWater(G, optics, sdt)
  gauge(G, optics, sdt, true)
  const open = G.clutches.filter(c => c.state === 'dormant')
  const dark = G.minute > 15 * 60 && G.mask && !G.mask.some(v => v > 0)
  if (G.minute >= DAY_END || dark || open.length === 0) endDay(G, open.length === 0 ? 'early' : 'dusk')
}

// Recompute the sun's shade mask when the sun has moved enough.
export function updateSun(G, minute) {
  if (G.mask && Math.abs(minute - G.maskMinute) <= 1.5) return
  G.sun = sunAt(minute)
  G.mask = computeMask(G.sun, G.mask || undefined)
  G.maskMinute = minute
}

function runWater(G, optics, dt) {
  G.stepCarry += dt * STEPS_PER_SECOND
  const steps = Math.floor(G.stepCarry)
  G.stepCarry -= steps
  for (let s = 0; s < steps; s++) {
    for (const p of G.pots) {
      if (!p.unlocked || !p.hung) continue
      const w = 2 * Math.PI * p.tempo
      const before = p.phase
      p.phase += w / STEPS_PER_SECOND
      const lambda = WAVE_SPEED / p.tempo
      optics.impulse(p.x, p.z, POT_AMP * Math.cos(p.phase) * (2 * Math.PI / STEPS_PER_SECOND), Math.max(0.17, lambda / 6))
      // one drop per cycle, let go a fall-time early so it lands on the push
      const lead = w * DROP_FALL
      if (Math.floor((p.phase + lead) / (2 * Math.PI)) !== Math.floor((before + lead) / (2 * Math.PI))) {
        p.drops++
        if (G.phase === 'day') G.drops++
        emit(G, { type: 'drop', pot: p.id })
      }
    }
    optics.step(1)
  }
  G.simTime += dt
}

// Read each clutch's lens: the crest curvature of the patch of surface whose
// light lands on it, smoothed into a focal depth, compared with its floor.
function gauge(G, optics, dt, dosing) {
  G.gaugeCarry += dt
  if (G.gaugeCarry < 1 / GAUGE_HZ) return
  const elapsed = G.gaugeCarry
  G.gaugeCarry = 0
  const minute = Math.max(G.minute, FIRST_LIGHT - 10)
  updateSun(G, minute)
  G.cloud = cloudCover(minute)
  G.strength = sunStrength(G.sun) * (1 - 0.72 * G.cloud)
  const sun = G.sun
  const hl = Math.hypot(sun.x, sun.z) || 1e-6
  const sinT = Math.sqrt(Math.max(0, 1 - sun.y * sun.y)) / 1.333
  const tanT = sinT / Math.sqrt(1 - sinT * sinT)
  G.slant = slantOf(sun)
  // paw rings: where each has spread to since the last reading
  const rings = G.rings.map(r => ({ ...r, from: Math.max(0, (G.simTime - elapsed - r.born) * WAVE_SPEED), to: (G.simTime - r.born) * WAVE_SPEED }))
  G.rings = G.rings.filter(r => (G.simTime - r.born) * WAVE_SPEED < 6.5)
  for (const c of G.clutches) {
    const depth = TERRACES[c.terrace].depth
    const path = depth * G.slant
    // the patch of surface whose light lands on this clutch lies upsun of it
    c.lensX = Math.max(-HALF, Math.min(HALF, c.x + sun.x / hl * depth * tanT))
    c.lensZ = Math.max(-HALF, Math.min(HALF, c.z + sun.z / hl * depth * tanT))
    const k = optics.crest(c.lensX, c.lensZ, 0.3)
    c.kTrack = Math.max(k, c.kTrack * Math.exp(-elapsed / 0.6))
    c.kAvg += (c.kTrack - c.kAvg) * (1 - Math.exp(-elapsed / 2))
    c.focal = focalDepth(c.kAvg)
    c.path = path
    const miss = Math.log(Math.min(40, c.focal) / path) / FOCUS_TOLERANCE
    c.match = Math.exp(-miss * miss)
    // light reaches the eggs only if it can enter the water at their lens
    const mi = Math.min(MASK_N - 1, Math.max(0, Math.floor((c.lensX + HALF) / (2 * HALF) * MASK_N)))
    const mj = Math.min(MASK_N - 1, Math.max(0, Math.floor((c.lensZ + HALF) / (2 * HALF) * MASK_N)))
    c.lit = G.mask[mj * MASK_N + mi]
    // the traced light on the eggs counts too: a bright caustic speeds them,
    // a dim patch slows them (light that is never traced counts as open sun)
    c.light = optics.lightReady ? optics.meanLight(c.x, c.z, 0.34) : 1
    c.dose = c.match * c.lit * G.strength * (0.55 + 0.45 * Math.min(1.6, c.light))
    if (c.state === 'hatched') { c.glow = Math.min(1, c.glow + elapsed * 0.6); continue }
    if (!dosing || c.state !== 'dormant') continue
    for (const r of rings) {
      const d = Math.hypot(c.lensX - r.x, c.lensZ - r.z)
      if (d <= r.from || d > r.to) continue
      const m = Math.log(pawFocalAt(d) / path) / FOCUS_TOLERANCE
      const burst = PAW_BURST * Math.exp(-m * m) * c.lit * G.strength
      if (burst > 0.01) {
        c.progress = Math.min(1, c.progress + burst)
        emit(G, { type: 'flare', clutch: c.id, amount: burst })
      }
    }
    if (c.dose > 0.12) G.focusSeconds += elapsed
    if (c.dose > 0.12) c.progress = Math.min(1, c.progress + c.dose * HATCH_RATE * elapsed)
    else c.progress = Math.max(0, c.progress - CHILL * elapsed)
    if (c.progress >= 1) {
      c.state = 'hatched'
      c.at = G.minute
      G.hatched++
      G.pawsLeft = Math.min(PAWS_MAX, G.pawsLeft + PAWS_PER_LAMP)
      emit(G, { type: 'hatch', clutch: c.id, terrace: c.terrace })
      G.pots.forEach((p, n) => {
        if (!p.unlocked && G.hatched >= POT_UNLOCKS[n]) {
          p.unlocked = true
          p.phase = 0
          emit(G, { type: 'pot', pot: p.id })
        }
      })
    }
  }
}

export function begin(G) {
  if (G.phase !== 'intro') return
  G.phase = 'day'
  G.minute = FIRST_LIGHT
  emit(G, { type: 'begin' })
}

function endDay(G, reason) {
  G.phase = 'dusk'
  G.speed = 1
  G.endedAt = G.minute
  G.result = {
    reason,
    hatched: G.hatched,
    dark: G.clutches.filter(c => c.state === 'dormant').length,
    drops: G.drops,
    paws: G.paws,
    focusSeconds: Math.round(G.focusSeconds),
    lastHatch: G.clutches.filter(c => c.state === 'hatched').reduce((m, c) => Math.max(m, c.at), 0),
    terraces: TERRACES.map((t, i) => G.clutches.filter(c => c.terrace === i && c.state === 'hatched').length)
  }
  emit(G, { type: 'dusk', reason })
}

export function epithet(r) {
  if (!r) return ''
  if (r.hatched === 7) return 'keeper of the sevenfold lamp'
  if (r.hatched >= 5) return 'lens-wright of the lower steps'
  if (r.hatched >= 3) return 'a patient refractor'
  if (r.hatched >= 1) return 'one bright thread in the dark'
  return 'the well kept its dark'
}

export const clutchWord = c => `${TERRACES[c.terrace].word} clutch ${c.id.toUpperCase()}`
