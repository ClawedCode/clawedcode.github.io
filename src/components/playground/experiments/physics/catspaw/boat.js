// A single-handed dinghy: a polar diagram for drive, apparent wind for trim,
// a heeling moment the crew must hike against, momentum through tacks, and a
// capsize when the gust wins.

import { DEG, wrap, currentAt } from './wind'

export const BOAT_R = 2.2 // contact radius, metres
export const CLOSE = 44 * DEG // close-hauled true wind angle
export const BROAD = 152 * DEG // best downwind angle
export const NO_GO = 30 * DEG
export const CAPSIZE_HEEL = 50
export const RIGHT_TIME = 6.5

// speed relative to close-hauled, against true wind angle in degrees
const POLAR = [
  [0, 0], [28, 0], [33, 0.55], [38, 0.82], [42, 0.95], [45, 1], [52, 1.1], [60, 1.22],
  [75, 1.38], [90, 1.45], [110, 1.45], [135, 1.36], [150, 1.22], [165, 1.06], [180, 0.95]
]

export function polarShape(twaDeg) {
  const a = Math.min(180, Math.abs(twaDeg))
  for (let i = 1; i < POLAR.length; i++) {
    if (a <= POLAR[i][0]) {
      const [a0, v0] = POLAR[i - 1]
      const [a1, v1] = POLAR[i]
      const k = (a - a0) / (a1 - a0)
      return v0 + (v1 - v0) * k
    }
  }
  return POLAR[POLAR.length - 1][1]
}

// close-hauled speed in a given true wind
export const beatSpeed = tws => 2.6 * Math.pow(Math.max(0.1, tws) / 4.5, 0.6)
export const targetSpeed = (tws, twa) => beatSpeed(tws) * polarShape(twa / DEG)

// best velocity made good, for the debrief's yardstick
export function bestVmg(tws, upwind) {
  return upwind ? targetSpeed(tws, CLOSE) * Math.cos(CLOSE) : -targetSpeed(tws, BROAD) * Math.cos(BROAD)
}

export function createBoat(opts) {
  return {
    id: opts.id,
    name: opts.name,
    you: !!opts.you,
    x: opts.x,
    y: opts.y,
    h: opts.h, // heading, compass radians
    v: opts.v ?? 0,
    sheet: 0.4, // 0 = boom hard in, 1 = boom right out
    boom: 20 * DEG,
    heel: 0, // degrees, + to leeward
    hike: 0, // 0..1 actual body out
    hikeCmd: false,
    rudder: 0,
    crew: opts.crew ?? true,
    capsized: 0,
    capsizes: 0,
    penalty: 0, // turns owed
    penaltyTurn: 0,
    contactCooldown: 0,
    // the race
    leg: 'prestart',
    ocs: false,
    rounding: 0,
    finished: false,
    finishTime: 0,
    // what the sails see, for drawing and instruments
    tws: 0, twd: 0, twa: 0, aws: 0, awa: 0, eff: 1, luff: 0, stall: 0, ideal: 0, shadow: 0, puff: 0,
    drift: { x: 0, y: 0 }
  }
}

export const tackOf = b => (b.twa >= 0 ? 'port' : 'starboard')

// ideal boom angle for an apparent wind angle
export const idealBoom = awa => Math.min(88 * DEG, Math.max(6 * DEG, Math.abs(awa) - 20 * DEG))
export const boomMax = sheet => (6 + sheet * 84) * DEG
export const sheetFor = boom => Math.min(1, Math.max(0, (boom / DEG - 6) / 84))

// advance one boat by dt in the wind it feels
export function stepBoat(b, w, cfg, dt) {
  b.tws = w.spd
  b.twd = w.dir
  b.shadow = w.shadow || 0
  b.puff = w.puff || 0
  b.twa = wrap(b.h - w.dir)

  if (b.contactCooldown > 0) b.contactCooldown -= dt

  // apparent wind: the true wind minus the boat's own motion
  const wx = -Math.sin(w.dir) * w.spd
  const wy = -Math.cos(w.dir) * w.spd
  const ax = wx - Math.sin(b.h) * b.v
  const ay = wy - Math.cos(b.h) * b.v
  b.aws = Math.hypot(ax, ay)
  const from = Math.atan2(-ax, -ay)
  b.awa = wrap(b.h - from)

  if (b.capsized > 0) {
    b.capsized -= dt
    b.v *= Math.exp(-dt * 1.6)
    b.heel = 90 * Math.min(1, b.capsized / 1.2 + 0.2)
    b.eff = 0
    b.luff = 0
    b.stall = 0
    if (b.capsized <= 0) {
      b.capsized = 0
      b.heel = 10
      // she comes up lying head to wind
      b.h = w.dir + (b.twa >= 0 ? 34 : -34) * DEG
      b.sheet = 0.8
    }
    move(b, cfg, dt)
    return
  }

  // the crew trims for shape, a beat slow, a hair eased
  const ideal = idealBoom(b.awa)
  b.ideal = ideal
  if (b.crew) {
    const want = sheetFor(ideal + 2 * DEG)
    b.sheet += (want - b.sheet) * Math.min(1, dt / 1.3)
  }
  // the boom goes as far as the sheet lets it, never past the wind
  const boomTarget = Math.min(boomMax(b.sheet), Math.abs(b.awa))
  b.boom += (boomTarget - b.boom) * Math.min(1, dt * 5)
  const d = (b.boom - ideal) / DEG
  const eff = d > 0 ? Math.exp(-((d / 9) ** 2)) : Math.exp(-((d / 20) ** 2))
  b.eff = eff
  b.luff = Math.max(0, Math.min(1, (d - 2) / 10))
  b.stall = Math.max(0, Math.min(1, (-d - 6) / 14))

  // heeling moment against the crew's weight
  b.hike += ((b.hikeCmd ? 1 : 0) - b.hike) * Math.min(1, dt * 2.2)
  const force = (b.aws / 7.3) ** 2 * (d > 0 ? Math.exp(-((d / 9) ** 2)) : 1) * Math.pow(Math.cos(b.boom), 1.2)
  const heelTarget = 22 * (force - 1.1 * b.hike)
  b.heel += (heelTarget - b.heel) * Math.min(1, dt / 0.55)
  if (b.heel > CAPSIZE_HEEL) {
    b.capsized = RIGHT_TIME
    b.capsizes += 1
    b.events?.push({ type: 'capsize', x: b.x, y: b.y })
    move(b, cfg, dt)
    return
  }
  const over = Math.max(0, b.heel - 24) / 26
  const windward = Math.max(0, -b.heel - 6) / 12
  const heelLoss = 1 - Math.min(0.6, over * 0.55) - Math.min(0.15, windward * 0.15)

  const vt = targetSpeed(w.spd, b.twa) * Math.pow(eff, 0.6) * heelLoss
  const tau = vt > b.v ? 3.2 : 5.5
  b.v += (vt - b.v) * Math.min(1, dt / tau)

  // rudder: bite grows with speed, and a hard helm drags
  const omega = b.rudder * (0.35 + 0.55 * Math.min(1, b.v / 2.5))
  b.h = wrap(b.h + omega * dt)
  b.v *= 1 - 0.09 * Math.abs(b.rudder) * dt
  if (b.penalty > 0) {
    b.penaltyTurn += omega * dt
    if (Math.abs(b.penaltyTurn) >= Math.PI * 2) {
      b.penalty -= 1
      b.penaltyTurn = 0
      b.events?.push({ type: 'served', x: b.x, y: b.y })
    }
  }
  move(b, cfg, dt)
}

function move(b, cfg, dt) {
  const c = currentAt(cfg, b.x)
  b.drift = c
  b.x += (Math.sin(b.h) * b.v + c.x) * dt
  b.y += (Math.cos(b.h) * b.v + c.y) * dt
}

// two hulls touching: separate them, slow them, and decide who was in the wrong
export function resolveContacts(boats, counts, onFoul) {
  for (let i = 0; i < boats.length; i++) {
    const a = boats[i]
    if (a.finished) continue
    for (let j = i + 1; j < boats.length; j++) {
      const b = boats[j]
      if (b.finished) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.hypot(dx, dy)
      if (dist >= BOAT_R * 2 || dist < 1e-6) continue
      const push = (BOAT_R * 2 - dist) / 2
      const nx = dx / dist
      const ny = dy / dist
      a.x -= nx * push
      a.y -= ny * push
      b.x += nx * push
      b.y += ny * push
      a.v *= 0.996
      b.v *= 0.996
      if (a.contactCooldown > 0 || b.contactCooldown > 0) continue
      a.contactCooldown = b.contactCooldown = 4
      a.v *= 0.6
      b.v *= 0.6
      const fouler = whoFouled(a, b)
      if (fouler && fouler.penalty < 1 && counts(a, b)) {
        fouler.penalty += 1
        fouler.penaltyTurn = 0
        onFoul?.(fouler, fouler === a ? b : a)
      }
    }
  }
}

// port gives way to starboard; on the same tack the windward boat keeps clear
export function whoFouled(a, b) {
  if (a.capsized || b.capsized) return null
  const ta = tackOf(a)
  const tb = tackOf(b)
  if (ta !== tb) return ta === 'port' ? a : b
  const ux = Math.sin(a.twd)
  const uy = Math.cos(a.twd)
  const ua = a.x * ux + a.y * uy
  const ub = b.x * ux + b.y * uy
  return ua > ub ? a : b
}
