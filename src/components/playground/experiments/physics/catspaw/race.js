// The evening series: three races off the harbour wall, a start sequence,
// a windward mark left to port, the rules of the road, five rival cats who
// sail the same physics in the same wind, and a log of everything that
// happened so the debrief can say where the race was won or lost.

import { DEG, wrap, createWind, stepWind, windForBoat, windAt, makeRng } from './wind'
import {
  createBoat, stepBoat, resolveContacts, tackOf, CLOSE, BROAD, BOAT_R, targetSpeed, bestVmg, beatSpeed
} from './boat'

export const COUNTDOWN = 45
export const SIGNALS = [
  { at: 45, flag: 'class', text: 'warning signal: the class flag goes up', horn: 1 },
  { at: 30, flag: 'p', text: 'preparatory: P flag up, rules are on', horn: 1 },
  { at: 10, flag: 'p-down', text: 'P flag down: ten seconds', horn: 2 },
  { at: 0, flag: 'start', text: 'gun. the race is on', horn: 3 }
]
export const LINE_HALF = 28
export const WINDOW = 90// finishing window after the first boat home
export const TIME_LIMIT = 480
const MARK_R = 1.4

export const RACES = [
  {
    key: 'harbour',
    title: 'race one: the harbour breeze',
    short: 'harbour breeze',
    brief: 'a gentle northerly full of cat\'s paws. dark water is more wind: sail from patch to patch and the boats around you will seem to stop.',
    lesson: 'pressure',
    L: 120,
    sun: { az: -62, el: 9 },
    wind: {
      seed: 7101, dir: 0, speed: 4.4, drift: 0, gustiness: 0.05,
      osc: [{ amp: 5 * DEG, period: 120, phase: 0.6 }, { amp: 2 * DEG, period: 37, phase: 2.1 }],
      puffRate: 0.32, puffRadius: [22, 42], puffStrength: [0.22, 0.42], puffShift: 7 * DEG, lullShare: 0.25,
      build: 0, buildMax: 0, current: null
    }
  },
  {
    key: 'northwesterly',
    title: 'race two: the northwesterly',
    short: 'northwesterly',
    brief: 'a fresh breeze that swings left and right every minute or so. tack when the compass says headed, and hike before the gust lands or it will put you in the water.',
    lesson: 'shifts',
    L: 140,
    sun: { az: -78, el: 6 },
    wind: {
      seed: 2252, dir: 0, speed: 6.3, drift: 0, gustiness: 0.07,
      osc: [{ amp: 13 * DEG, period: 78, phase: 0.2 }, { amp: 3 * DEG, period: 29, phase: 1.1 }],
      puffRate: 0.34, puffRadius: [20, 38], puffStrength: [0.3, 0.56], puffShift: 9 * DEG, lullShare: 0.2,
      build: 0, buildMax: 0, current: null
    }
  },
  {
    key: 'lastlight',
    title: 'race three: last light',
    short: 'last light',
    brief: 'the sea breeze fills in and keeps swinging right, while the ebb runs hardest down the right-hand channel. one side has the shift, the other has the tide. choose.',
    lesson: 'strategy',
    L: 120,
    sun: { az: -92, el: 2.5 },
    wind: {
      seed: 9903, dir: -4 * DEG, speed: 4.1, drift: 0.0011, gustiness: 0.04,
      osc: [{ amp: 4 * DEG, period: 90, phase: 2.6 }],
      puffRate: 0.28, puffRadius: [24, 46], puffStrength: [0.2, 0.4], puffShift: 6 * DEG, lullShare: 0.3,
      build: 0.0016, buildMax: 0.32,
      current: { dir: Math.PI, from: -130, to: 130, min: 0.06, max: 0.42 }
    }
  }
]

export const RIVALS = [
  { name: 'Old Tom', fur: '#d8d2c4', sail: '#e9e2d0', hull: '#2b3a44', num: '11', header: 5, start: 1.0, react: 0.25, hikeAt: 11, noise: 1.5, lane: -5 },
  { name: 'Saffron', fur: '#d68b3c', sail: '#f0c35a', hull: '#7c2a24', num: '23', header: 7, start: 1.8, react: 0.35, hikeAt: 12, noise: 2.5, lane: 11 },
  { name: 'Mackerel', fur: '#7d8a8f', sail: '#dfe7e4', hull: '#3f6b74', num: '47', header: 9, start: 2.8, react: 0.5, hikeAt: 13, noise: 3, lane: -16 },
  { name: 'Biscuit', fur: '#c9a77a', sail: '#c8352e', hull: '#e6dcc4', num: '58', header: 8, start: -1.6, react: 0.4, hikeAt: 12, noise: 3, lane: 19 },
  { name: 'Pilchard', fur: '#4a4a52', sail: '#b9c8d8', hull: '#565046', num: '62', header: 12, start: 3.6, react: 0.7, hikeAt: 15, noise: 4, lane: 5 }
]

export const PIN = { x: -LINE_HALF, y: 0 }
export const COMMITTEE = { x: LINE_HALF, y: 0 }

export function createRace(idx, opts = {}) {
  const def = RACES[idx]
  const cfg = { ...def.wind }
  const wind = createWind(cfg)
  const rng = makeRng(def.wind.seed * 7 + 3)
  const mark = { x: 0, y: def.L }
  const boats = []
  // you, then the fleet, spread below the line on a reach
  const you = createBoat({ id: 0, name: 'you', you: true, x: 14, y: -34, h: -100 * DEG, v: 1.6, crew: opts.crew ?? true })
  you.fur = '#0d0d10'
  you.sailColor = '#efe7d4'
  you.hullColor = '#14161c'
  you.num = '9'
  you.skill = { name: 'you', header: 8, start: 2.2, react: 0.4, hikeAt: 12, noise: 2.5, lane: -22 }
  boats.push(you)
  RIVALS.forEach((r, i) => {
    const b = createBoat({
      id: i + 1, name: r.name,
      x: -36 + i * 15 + rng() * 6, y: -26 - rng() * 16, h: (rng() < 0.5 ? -95 : 95) * DEG, v: 1.4
    })
    b.skill = r
    b.fur = r.fur
    b.sailColor = r.sail
    b.hullColor = r.hull
    b.num = r.num
    boats.push(b)
  })
  for (const b of boats) {
    b.events = []
    b.mean = cfg.dir
    b.ai = { mode: 'hold', lastTack: -99, tackTo: null, think: 0, finX: (rng() * 2 - 1) * 16, gybe: null, lastGybe: -99, duck: 0 }
    b.track = []
    b.roundTime = 0
    b.roundPlace = 0
    b.prevY = b.y
    b.prevAng = null
    b.markAcc = 0
    b.startTime = 0
  }
  const race = {
    idx, def, cfg, wind, rng, boats, mark,
    t: 0, // seconds since the warning signal
    gunAt: COUNTDOWN,
    phase: 'countdown',
    attract: !!opts.attract,
    signalsFired: 0,
    firstFinish: null,
    finishOrder: [],
    toasts: [],
    sfx: [],
    hails: [],
    windLog: [],
    sampleAcc: 0,
    windAcc: 0,
    tacks: [],
    youMean: cfg.dir,
    done: false,
    results: null
  }
  return race
}

export const raceClock = race => race.t - race.gunAt // negative before the gun

function toast(race, text, kind = 'info', you = true) {
  if (race.attract || race.ff) return
  race.toasts.push({ text, kind, you, t: race.t })
}
function sfx(race, name, arg) {
  if (race.attract || race.ff) return
  race.sfx.push({ name, arg })
}

// distance still to sail, for live standings
function toGo(race, b) {
  if (b.finished) return -1e6 + b.finishTime
  const L = race.def.L
  if (b.leg === 'run') return Math.hypot(b.x, b.y)
  const d = Math.hypot(b.x - race.mark.x, b.y - race.mark.y) + L
  return b.leg === 'prestart' || b.ocs ? d + 60 : d
}

export function stepRace(race, dt, input) {
  const { wind, boats, cfg } = race
  race.t += dt
  stepWind(wind, dt)
  const clock = raceClock(race)

  // signals
  while (race.signalsFired < SIGNALS.length && race.t >= race.gunAt - SIGNALS[race.signalsFired].at) {
    const s = SIGNALS[race.signalsFired]
    race.signalsFired += 1
    toast(race, s.text, s.flag === 'start' ? 'go' : 'signal')
    sfx(race, 'horn', s.horn)
    if (s.flag === 'start') startGun(race)
  }
  if (clock < 0 && clock > -5.5 && Math.floor(clock - dt) !== Math.floor(clock)) sfx(race, 'beep', Math.ceil(-clock))

  const w = { dir: 0, spd: 0, puff: 0, shadow: 0 }
  for (let i = 0; i < boats.length; i++) {
    const b = boats[i]
    if (b.finished) {
      // drift on, sails eased, out of the way
      b.v *= Math.exp(-dt * 0.4)
      b.x += Math.sin(b.h) * b.v * dt
      b.y += Math.cos(b.h) * b.v * dt
      continue
    }
    windForBoat(wind, boats, i, w)
    b.mean += wrap(w.dir - b.mean) * Math.min(1, dt / 40)
    if (b.you && !race.attract) playerControl(race, b, input, w, dt)
    else aiControl(race, b, w, dt)
    const twaBefore = b.twa
    b.prevY = b.y
    const px = b.x
    const evs = b.events.length
    stepBoat(b, w, cfg, dt)
    if (b.you && b.events.length > evs) {
      const e = b.events[b.events.length - 1]
      e.t = clock
      if (e.type === 'capsize') {
        toast(race, 'capsized. the cat is standing on the centreboard...', 'bad')
        sfx(race, 'capsize')
      } else if (e.type === 'served') {
        toast(race, 'penalty turn done. back to racing', 'good')
        sfx(race, 'served')
      }
    }
    detectManoeuvre(race, b, twaBefore)
    rules(race, b, px, clock)
  }
  // the protest committee only hears cases the player is part of
  resolveContacts(boats, (a, b) => !race.attract && (a.you || b.you), (fouler, other) => {
    if (fouler.you) {
      toast(race, `foul: ${tackOf(fouler) === 'port' && tackOf(other) === 'starboard' ? 'port gives way to starboard' : 'windward boat keeps clear'}. turn a full circle to clear it`, 'bad')
      sfx(race, 'protest')
      fouler.events.push({ type: 'foul', x: fouler.x, y: fouler.y, t: clock, other: other.name })
    } else if (other.you) {
      toast(race, `${fouler.name} fouled you and owes a turn`, 'good')
      sfx(race, 'bump')
    }
  })
  for (const b of boats) markContact(race, b, clock)

  race.standings = [...boats].sort((a, b) => toGo(race, a) - toGo(race, b))

  // the log the debrief is drawn from
  race.sampleAcc += dt
  if (race.sampleAcc >= 0.5) {
    race.sampleAcc -= 0.5
    for (const b of boats) {
      if (b.finished && b.track.length && b.track[b.track.length - 1].fin) continue
      const up = b.leg !== 'run'
      const vmgNow = up ? b.v * Math.cos(b.twa) : -b.v * Math.cos(b.twa)
      b.track.push({
        t: clock, x: b.x, y: b.y, leg: b.leg, v: b.v, tws: b.tws, puff: b.puff, shadow: b.shadow,
        r: b.leg === 'prestart' ? null : Math.max(0, vmgNow) / Math.max(0.2, bestVmg(b.tws, up)),
        fin: b.finished
      })
    }
  }
  race.windAcc += dt
  if (race.windAcc >= 1) {
    race.windAcc -= 1
    const s = windAt(wind, 0, race.def.L * 0.5)
    race.windLog.push({ t: clock, dir: s.dir, spd: s.spd, mean: cfg.dir + cfg.drift * clock })
  }

  // end of race
  const you = boats[0]
  if (!race.done && clock > 0) {
    const windowShut = race.firstFinish !== null && clock > race.firstFinish + WINDOW
    if (windowShut || clock > TIME_LIMIT || boats.every(b => b.finished)) {
      finishRace(race)
    } else if (race.firstFinish !== null && !you.finished && !race.warnedWindow && clock > race.firstFinish + WINDOW - 30) {
      race.warnedWindow = true
      toast(race, 'thirty seconds left in the finishing window', 'bad')
    }
  }
}

// sail the rest of the race without drawing it
function completeRace(race) {
  const input = { steer: 0, sheet: 0, sheetAbs: null, hike: false, crew: true, tack: false }
  race.ff = true
  for (let n = 0; n < 60 * (TIME_LIMIT + WINDOW) && !race.done; n++) stepRace(race, 1 / 60, input)
  race.ff = false
  if (!race.done) finishRace(race)
}
export { completeRace }

function startGun(race) {
  race.phase = 'racing'
  for (const b of race.boats) {
    if (b.y > 0 && Math.abs(b.x) < LINE_HALF + 40) {
      b.ocs = true
      b.events.push({ type: 'ocs', x: b.x, y: b.y, t: 0 })
      if (b.you) {
        toast(race, 'individual recall: you were over. dip back below the line and start again', 'bad')
        sfx(race, 'recall')
      }
    }
  }
}

// starts, rounding and finishing
function rules(race, b, px, clock) {
  const onLine = x => x >= PIN.x && x <= COMMITTEE.x
  if (b.leg === 'prestart') {
    if (clock < 0) return
    if (b.ocs) {
      if (b.y < -0.5) {
        b.ocs = false
        if (b.you) toast(race, 'clear of the line. now start properly', 'good')
      }
      return
    }
    if (b.you && b.prevY < 0 && b.y >= 0 && !onLine((px + b.x) / 2) && !b.toldLine) {
      b.toldLine = true
      toast(race, 'that was outside the line. start between the pin buoy and the committee boat', 'bad')
    }
    if (b.prevY < 0 && b.y >= 0 && onLine((px + b.x) / 2)) {
      b.leg = 'beat'
      b.startTime = clock
      if (b.you) {
        const ahead = race.boats.filter(o => o !== b && o.leg !== 'prestart').length
        toast(race, clock < 4 ? 'a clean start, right on the gun' : `started ${clock.toFixed(0)} s after the gun${ahead ? `, ${ahead} ahead of you` : ''}`, clock < 4 ? 'good' : 'info')
      }
    }
    return
  }
  if (b.leg === 'beat') {
    const dx = b.x - race.mark.x
    const dy = b.y - race.mark.y
    const dist = Math.hypot(dx, dy)
    if (dist < 42) {
      const ang = Math.atan2(dy, dx)
      if (b.prevAng !== null) b.markAcc += wrap(ang - b.prevAng)
      b.prevAng = ang
      // round it anticlockwise and get past its top onto the west side
      if (b.markAcc >= 150 * DEG && Math.cos(ang) < -0.17) {
        b.leg = 'run'
        b.roundTime = clock
        const rounded = race.boats.filter(o => o.leg === 'run' || o.finished).length
        b.roundPlace = rounded
        if (b.you) {
          toast(race, `rounded the windward mark ${ordinal(rounded)}. bear away and run for home`, 'good')
          sfx(race, 'bell')
        }
      }
    } else {
      b.prevAng = null
      b.markAcc = 0
    }
    return
  }
  if (b.leg === 'run') {
    if (b.prevY > 0 && b.y <= 0 && onLine((px + b.x) / 2)) {
      b.finished = true
      b.finishTime = clock
      b.leg = 'finished'
      race.finishOrder.push(b)
      if (race.firstFinish === null) race.firstFinish = clock
      sfx(race, b.you ? 'finish' : 'finishOther', race.finishOrder.length)
      if (b.you) toast(race, `finished ${ordinal(race.finishOrder.length)}`, 'go')
      else if (race.finishOrder.length === 1) toast(race, `${b.name} takes the gun. the finishing window is open for ${WINDOW} s`, 'info')
    }
  }
}

function markContact(race, b, clock) {
  const marks = [race.mark, PIN, { x: COMMITTEE.x + 3.2, y: 0 }]
  marks.forEach((m, k) => {
    const r = k === 2 ? 4.4 : MARK_R
    const dx = b.x - m.x
    const dy = b.y - m.y
    const d = Math.hypot(dx, dy)
    if (d < BOAT_R + r && d > 1e-6) {
      const push = BOAT_R + r - d
      b.x += (dx / d) * push
      b.y += (dy / d) * push
      if (b.contactCooldown <= 0) {
        b.contactCooldown = 3
        b.v *= 0.5
        if (k === 0 && b.leg === 'beat' && b.penalty < 1) {
          b.penalty += 1
          b.penaltyTurn = 0
          b.events.push({ type: 'mark', x: b.x, y: b.y, t: clock })
          if (b.you) {
            toast(race, 'you touched the mark. one full circle to clear it', 'bad')
            sfx(race, 'bump')
          }
        }
      }
    }
  })
}

function detectManoeuvre(race, b, twaBefore) {
  if (b.capsized || Math.sign(twaBefore) === Math.sign(b.twa) || twaBefore === 0) return
  const kind = Math.abs(b.twa) < Math.PI / 2 ? 'tack' : 'gybe'
  const clock = raceClock(race)
  // how headed was the tack we just left?
  const oldTack = twaBefore >= 0 ? 'port' : 'starboard'
  const off = wrap(b.twd - b.mean) / DEG
  const headed = oldTack === 'starboard' ? -off : off
  const atMark = Math.hypot(b.x - race.mark.x, b.y - race.mark.y) < 28
  b.events.push({ type: kind, x: b.x, y: b.y, t: clock, headed, leg: atMark && b.leg !== 'prestart' ? 'rounding' : b.leg })
  if (b.you && kind === 'tack' && b.leg === 'beat') sfx(race, 'tack')
}

function finishRace(race) {
  race.done = true
  race.phase = 'done'
  const placed = race.finishOrder.map(b => ({ b, time: b.finishTime + b.penalty * 20 }))
  placed.sort((a, b) => a.time - b.time)
  const fleet = race.boats.length
  const results = placed.map((p, i) => ({ id: p.b.id, name: p.b.name, you: p.b.you, time: p.time, penalty: p.b.penalty, place: i + 1, points: i + 1 }))
  for (const b of race.boats) {
    if (!b.finished) results.push({ id: b.id, name: b.name, you: b.you, time: null, penalty: b.penalty, place: null, points: fleet + 1, dnf: true })
  }
  race.results = results
  race.analysis = analyse(race)
}

export const ordinal = n => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// ---------------------------------------------------------------------------
// the player at the tiller

function playerControl(race, b, input, w, dt) {
  b.crew = input.crew
  b.hikeCmd = input.hike
  if (!input.crew) {
    if (input.sheetAbs !== null && input.sheetAbs !== undefined) b.sheet += (input.sheetAbs - b.sheet) * Math.min(1, dt * 8)
    else b.sheet += input.sheet * dt * 0.55
    b.sheet = Math.min(1, Math.max(0, b.sheet))
  }
  if (input.tack) {
    input.tack = false
    if (!b.capsized) {
      // a tack turns the bow through the wind, a gybe turns the stern through it
      const down = Math.abs(b.twa) > Math.PI / 2
      const twa = (b.twa >= 0 ? -1 : 1) * (down ? BROAD : CLOSE)
      const dir = down ? (b.twa >= 0 ? 1 : -1) : (b.twa >= 0 ? -1 : 1)
      b.auto = { twa, dir, t: 0, kind: down ? 'gybe' : 'tack' }
    }
  }
  if (Math.abs(input.steer) > 0.05) b.auto = null
  if (b.auto) {
    b.auto.t += dt
    const err = wrap(w.dir + b.auto.twa - b.h)
    if (Math.abs(err) < 6 * DEG || b.auto.t > 6) {
      b.auto = null
      b.rudder = 0
    } else {
      b.rudder = b.auto.dir * Math.min(1, Math.abs(err) / (25 * DEG) + 0.3)
    }
  } else {
    b.rudder = input.steer
  }
  playerHints(race, b, w)
}

// a few words from the committee boat's loudhailer, sparingly
function playerHints(race, b, w) {
  const h = race.hint || (race.hint = { at: {}, said: {} })
  const say = (key, text, gap = 30, kind = 'hint') => {
    if (race.t - (h.at[key] ?? -1e9) < gap) return
    h.at[key] = race.t
    h.said[key] = (h.said[key] || 0) + 1
    toast(race, text, kind)
  }
  const clock = raceClock(race)
  if (b.capsized) return
  if (!b.crew && b.luff > 0.6 && b.v > 0.4 && clock > -20) say('luff', 'the sail is flapping: sheet in until it stops', 25)
  if (!b.crew && b.stall > 0.7 && Math.abs(b.twa) > 70 * DEG) say('stall', 'sheeted in too hard for a reach: ease out', 25)
  if (b.heel > 36 && !b.hikeCmd) say('hike', 'she is heeling hard: hike out (space)', 18, 'bad')
  if (Math.abs(b.twa) < 26 * DEG && b.v < 0.7 && clock > 3) say('irons', 'in irons, head to wind: steer away until the sail fills', 20, 'bad')
  if (b.leg === 'beat') {
    const off = wrap(w.dir - b.mean) / DEG
    const headed = tackOf(b) === 'starboard' ? -off : off
    if (headed > 7 && Math.abs(b.twa) < 60 * DEG && (h.said.header || 0) < 3) say('header', `headed ${headed.toFixed(0)}°. the other tack is lifted now`, 35)
    if (b.puff > 0.2 && (h.said.puff || 0) < 2 && race.idx === 0) say('puff', 'pressure: the dark water is a puff, feel her go', 40, 'good')
    const dx = b.x - race.mark.x
    const dy = b.y - race.mark.y
    if (Math.hypot(dx, dy) < 40 && b.markAcc < -100 * DEG) say('wrongway', 'leave the mark to port: go round it anticlockwise', 20, 'bad')
  }
}

// ---------------------------------------------------------------------------
// the rival cats

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
function steerTo(b, target, gain = 2.4) {
  b.rudder = clamp(wrap(target + (b.ai?.avoid || 0) - b.h) * gain, -1, 1)
}

// a nudge away from any hull close ahead
function avoidance(race, b) {
  let best = 0
  let near = 9
  for (const o of race.boats) {
    if (o === b || o.finished) continue
    const dx = o.x - b.x
    const dy = o.y - b.y
    const d = Math.hypot(dx, dy)
    if (d > near) continue
    const rel = wrap(Math.atan2(dx, dy) - b.h)
    if (Math.abs(rel) > 70 * DEG) continue
    near = d
    best = (rel >= 0 ? -1 : 1) * 22 * DEG * (1 - d / 10)
  }
  return best
}
// head for a point; if it lies inside the no-go zone, stay on this tack until it can be fetched on the other
function fetch(b, w, p) {
  const brg = Math.atan2(p.x - b.x, p.y - b.y)
  const off = wrap(brg - w.dir)
  if (Math.abs(off) >= CLOSE) return steerTo(b, brg)
  steerTo(b, w.dir + (b.twa >= 0 ? 1 : -1) * CLOSE)
}

function aiControl(race, b, w, dt) {
  const sk = b.skill || RIVALS[2]
  const ai = b.ai
  const clock = raceClock(race)
  b.crew = true
  ai.think -= dt
  if (ai.think <= 0) {
    ai.think = sk.react
    b.hikeCmd = b.heel > sk.hikeAt || (b.hikeCmd && b.heel > -2)
  }
  if (b.capsized) return
  // a penalty is served at once, turning away from the fleet
  if (b.penalty > 0 && b.leg !== 'prestart' && Math.hypot(b.x - race.mark.x, b.y - race.mark.y) > 16) {
    b.rudder = 1
    return
  }
  const jitter = Math.sin(race.t * 0.7 + b.id * 3.1) * sk.noise * DEG
  ai.avoid = b.leg === 'prestart' && clock < 0 && ai.mode !== 'go' ? 0 : avoidance(race, b)

  if (b.leg === 'prestart') {
    if (b.ocs) {
      steerTo(b, Math.PI)
      return
    }
    const T = -clock
    const slotX = sk.lane ?? 0
    const P = { x: slotX, y: 0 }
    const dP = Math.hypot(P.x - b.x, P.y - b.y)
    const need = dP / (beatSpeed(w.spd) * 0.78) + 3 + (sk.start ?? 1.5)
    if (clock < 0 && T > need && ai.mode !== 'go') {
      // hold station a little below the line, luffing
      const S = { x: slotX + 10, y: -11 }
      const d = Math.hypot(S.x - b.x, S.y - b.y)
      if (d > 7) {
        const brg = Math.atan2(S.x - b.x, S.y - b.y)
        const off = wrap(brg - w.dir)
        steerTo(b, Math.abs(off) < 50 * DEG ? w.dir + Math.sign(off || -1) * 50 * DEG : brg)
      } else {
        b.crew = false
        b.sheet = 1
        steerTo(b, w.dir - 40 * DEG)
      }
      return
    }
    ai.mode = 'go'
    if (clock >= 0 && b.y > 0) {
      // crossed outside the ends: go back below the line and come again
      fetch(b, w, { x: slotX, y: -8 })
      return
    }
    if (clock < 0 && b.y > -1.5) {
      // early: stop on the line rather than be over it
      b.crew = false
      b.sheet = 1
      steerTo(b, w.dir - 38 * DEG)
      return
    }
    // where a close-hauled starboard board from here meets the line
    const hs = w.dir - CLOSE
    const xc = b.x + b.y * Math.tan(-hs)
    if (xc > PIN.x + 4 && xc < COMMITTEE.x - 6) {
      steerTo(b, hs + jitter * 0.3)
      return
    }
    fetch(b, w, { x: xc <= PIN.x + 4 ? b.x + 10 : slotX, y: Math.min(-6, b.y - 2) })
    return
  }

  if (b.leg === 'beat') {
    const L = race.def.L
    const A = { x: race.mark.x + 7, y: race.mark.y + 6 }
    const dist = Math.hypot(A.x - b.x, A.y - b.y)
    const rel = wrap(Math.atan2(A.x - b.x, A.y - b.y) - w.dir)
    const tack = tackOf(b)
    if (ai.tackTo !== null) {
      steerTo(b, ai.tackTo, 3)
      if (Math.abs(wrap(ai.tackTo - b.h)) < 8 * DEG) ai.tackTo = null
      return
    }
    // approaching the mark: fetch A on starboard, then bear away round it
    if (ai.wp === undefined && dist < 10 && tack === 'starboard') ai.wp = 0
    const dm = Math.hypot(b.x - race.mark.x, b.y - race.mark.y)
    if (ai.wp === undefined && b.y > race.mark.y - 3 && dm < 80) {
      // overstood: east of the mark, round it; west of it, go back below and come in from the east
      if (b.x > race.mark.x + 3) ai.wp = 0
      else ai.recover = true
    }
    if (ai.recover) {
      // back down the west side, then across below the mark, never over it
      const E = b.y > race.mark.y - 9 && b.x < race.mark.x + 4
        ? { x: race.mark.x - 11, y: race.mark.y - 15 }
        : { x: race.mark.x + 10, y: race.mark.y - 9 }
      if (Math.hypot(race.mark.x + 10 - b.x, race.mark.y - 9 - b.y) < 6) ai.recover = false
      else {
        fetch(b, w, E)
        return
      }
    }
    if (ai.wp !== undefined) {
      const wps = [A, { x: race.mark.x - 7, y: race.mark.y + 8 }, { x: race.mark.x - 8, y: race.mark.y - 9 }]
      let tgt = wps[ai.wp]
      if (ai.wp === 0 ? b.y > race.mark.y + 5 : Math.hypot(tgt.x - b.x, tgt.y - b.y) < 6) ai.wp += 1
      if (ai.wp > 2) {
        ai.wp = undefined // went past without rounding: beat again
        return
      }
      fetch(b, w, wps[ai.wp])
      return
    }
    const since = clock - ai.lastTack
    const off = wrap(w.dir - b.mean) / DEG
    const headed = tack === 'starboard' ? -off : off
    let want = false
    if (tack === 'port' && rel <= -(CLOSE + 1 * DEG)) want = true // laid the mark on starboard
    else if (tack === 'starboard' && rel >= CLOSE + 2 * DEG && b.y < race.mark.y - 6) want = true // past the port layline
    else if (since > 11 && headed > sk.header && b.y < L - 30) want = true
    else if (Math.abs(b.x) > 150) want = (tack === 'port') === (b.x > 0)
    // keep clear of starboard boats when on port
    if (tack === 'port' && !want) {
      for (const o of race.boats) {
        if (o === b || o.leg !== 'beat' || tackOf(o) !== 'starboard') continue
        const dx = o.x - b.x
        const dy = o.y - b.y
        if (Math.hypot(dx, dy) < 16 && Math.abs(wrap(Math.atan2(dx, dy) - b.h)) < 55 * DEG) ai.duck = 2.5
      }
    }
    if (tack === 'starboard') {
      const you = race.boats[0]
      if (you !== b && you.leg === 'beat' && tackOf(you) === 'port') {
        const d = Math.hypot(you.x - b.x, you.y - b.y)
        const ahead = Math.abs(wrap(Math.atan2(you.x - b.x, you.y - b.y) - b.h)) < 60 * DEG
        if (d < 18 && ahead && !race.hails.find(h => h.from === b.id && race.t - h.t < 5)) {
          race.hails.push({ from: b.id, text: 'starboard!', t: race.t })
          sfx(race, 'hail')
        }
      }
    }
    if (want && since > 4) {
      ai.lastTack = clock
      ai.tackTo = tack === 'port' ? w.dir - CLOSE : w.dir + CLOSE
      steerTo(b, ai.tackTo, 3)
      return
    }
    if (ai.duck > 0) {
      ai.duck -= dt
      steerTo(b, w.dir + CLOSE + 28 * DEG)
      return
    }
    steerTo(b, (tack === 'port' ? w.dir + CLOSE : w.dir - CLOSE) + jitter)
    return
  }

  if (b.leg === 'run') {
    ai.wp = undefined
    const F = { x: ai.finX, y: -2 }
    const brg = Math.atan2(F.x - b.x, F.y - b.y)
    const dist = Math.hypot(F.x - b.x, F.y - b.y)
    const relF = Math.abs(wrap(brg - w.dir))
    if (dist < 26 && relF > 100 * DEG) {
      steerTo(b, brg)
      return
    }
    const hP = w.dir + BROAD
    const hS = w.dir - BROAD
    const vmc = h => targetSpeed(w.spd, BROAD) * Math.cos(wrap(h - brg))
    const now = b.twa >= 0 ? 'port' : 'starboard'
    const cur = now === 'port' ? hP : hS
    const other = now === 'port' ? hS : hP
    const since = clock - ai.lastGybe
    // the fleet sails the wind and ignores the tide; a human need not
    const gain = (vmc(other) - vmc(cur)) / Math.max(0.3, Math.abs(vmc(cur)))
    if (since > 9 && gain > 0.12) {
      ai.lastGybe = clock
      ai.gybe = other
    }
    if (ai.gybe !== null) {
      steerTo(b, ai.gybe, 2.6)
      if (Math.abs(wrap(ai.gybe - b.h)) < 8 * DEG) ai.gybe = null
      return
    }
    steerTo(b, cur + jitter)
  }
}

// ---------------------------------------------------------------------------
// the debrief

export function analyse(race) {
  const you = race.boats[0]
  const res = race.results.find(r => r.you)
  const tr = you.track.filter(s => s.leg !== 'prestart' && !s.fin)
  const beat = tr.filter(s => s.leg === 'beat')
  const run = tr.filter(s => s.leg === 'run')
  const avg = (arr, f) => (arr.length ? arr.reduce((a, s) => a + f(s), 0) / arr.length : 0)
  const pressure = beat.length ? beat.filter(s => s.puff > 0.12).length / beat.length : 0
  const lull = beat.length ? beat.filter(s => s.puff < -0.08 || s.shadow > 0.08).length * 0.5 : 0
  const shadowed = tr.filter(s => s.shadow > 0.08).length * 0.5
  const tacks = you.events.filter(e => e.type === 'tack' && e.leg === 'beat')
  const goodTacks = tacks.filter(e => e.headed > 4).length
  const badTacks = tacks.filter(e => e.headed < -4).length
  const capsizes = you.events.filter(e => e.type === 'capsize').length
  const fouls = you.events.filter(e => e.type === 'foul').length
  const touches = you.events.filter(e => e.type === 'mark').length
  const ocs = you.events.some(e => e.type === 'ocs')
  const notes = []
  if (ocs) notes.push({ kind: 'bad', text: 'over the line at the gun. the recall cost more than any shift did' })
  else if (you.startTime && you.startTime < 4) notes.push({ kind: 'good', text: `crossed the line ${you.startTime.toFixed(1)} s after the gun` })
  else if (you.startTime) notes.push({ kind: 'info', text: `crossed the line ${you.startTime.toFixed(0)} s late. the fleet had clear air you did not` })
  if (beat.length) notes.push({ kind: pressure > 0.4 ? 'good' : 'info', text: `${Math.round(pressure * 100)}% of your beat was sailed in a puff` })
  if (lull > 12) notes.push({ kind: 'bad', text: `${Math.round(lull)} s on the beat in a lull or someone's wind shadow` })
  if (tacks.length) {
    notes.push({
      kind: goodTacks >= badTacks ? 'good' : 'bad',
      text: `${tacks.length} tack${tacks.length > 1 ? 's' : ''} upwind: ${goodTacks} on a header, ${badTacks} on a lift`
    })
  } else if (beat.length) notes.push({ kind: 'info', text: 'you never tacked off the first board' })
  if (capsizes) notes.push({ kind: 'bad', text: `capsized ${capsizes === 1 ? 'once' : `${capsizes} times`}: hike before the dark water reaches you` })
  if (fouls) notes.push({ kind: 'bad', text: `${fouls} foul${fouls > 1 ? 's' : ''} against another boat` })
  if (touches) notes.push({ kind: 'bad', text: `touched the windward mark${touches > 1 ? ` ${touches} times` : ''}` })
  if ((fouls || touches) && you.finished) notes.push({ kind: you.penalty ? 'bad' : 'good', text: you.penalty ? `${you.penalty} penalty turn unserved: +${you.penalty * 20} s on your time` : 'every penalty turn served' })
  if (shadowed > 10) notes.push({ kind: 'info', text: `${Math.round(shadowed)} s spent in another sail's shadow, the pale water behind a boat` })
  const beatEff = avg(beat.filter(s => s.r !== null), s => Math.min(1.2, s.r))
  const runEff = avg(run.filter(s => s.r !== null), s => Math.min(1.2, s.r))
  // the cat's verdict
  const place = res?.place
  let line
  if (!place) line = 'the committee boat went home without you. the water keeps its own log.'
  else if (place === 1) line = 'first gun. the wind was writing on the water and you read every word.'
  else if (place <= 3) line = 'on the podium. somewhere on the beat a darker patch went past you unread.'
  else line = 'the fleet sailed the same wind. they simply looked at it longer.'
  return {
    place, points: res?.points, time: res?.time, roundPlace: you.roundPlace, tacks: tacks.length,
    goodTacks, badTacks, pressure, capsizes, fouls, beatEff, runEff, notes, line
  }
}

// a short headless race between AI boats, for the opening shot
export function prerollAttract(race, seconds) {
  const input = { steer: 0, sheet: 0, sheetAbs: null, hike: false, crew: true, tack: false }
  const n = Math.round(seconds * 60)
  for (let i = 0; i < n; i++) stepRace(race, 1 / 60, input)
  race.toasts.length = 0
  race.sfx.length = 0
  race.hails.length = 0
}

export function seriesTable(scores) {
  const fleet = [{ id: 0, name: 'you', you: true }, ...RIVALS.map((r, i) => ({ id: i + 1, name: r.name }))]
  const rows = fleet.map(f => {
    const pts = scores.map(s => s?.results.find(r => r.id === f.id)?.points ?? null)
    const total = pts.reduce((a, p) => a + (p ?? 0), 0)
    return { ...f, pts, total }
  })
  rows.sort((a, b) => a.total - b.total || (b.pts.filter(Boolean).length - a.pts.filter(Boolean).length) || (a.pts[a.pts.length - 1] ?? 9) - (b.pts[b.pts.length - 1] ?? 9))
  return rows
}
