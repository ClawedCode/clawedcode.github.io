/**
 * slab.season() — the snowpack model.
 *
 * Every path keeps a column of layers. Each day: snow falls (scaled by wind
 * loading and any snow fence), rain and thaw wet the surface, temperature
 * gradient rots weak layers into facets and depth hoar or lets them round
 * and bond, layers settle under their overburden, the morning's control work
 * runs, and then each column is tested. A layer whose shear strength is
 * below the shear stress of everything above it fails and the slab on top
 * runs. Big enough slabs cross the railway.
 *
 * Units: swe in mm water (kg/m2), density in kg/m3, height in cm,
 * stress and strength in kPa.
 */

import { DAYS, PATHS, TRAINS, dayLabel, weatherFor, compass } from './winters.js'

export const GRAIN = { PP: 0, DF: 1, RG: 2, FC: 3, DH: 4, SH: 5, MF: 6 }
export const GRAIN_KEYS = ['PP', 'DF', 'RG', 'FC', 'DH', 'SH', 'MF']
export const GRAIN_NAMES = ['new snow', 'settling snow', 'rounded grains', 'facets', 'depth hoar', 'buried surface hoar', 'melt crust']

const G = 0.00981 // kPa per mm of water
const NAT_MIN_SLAB = 20
const CHARGE_MIN_SLAB = 12
const STAMP_LIMIT = 70
const HOLD_HOUR = 10

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const rad = (d) => (d * Math.PI) / 180

const hash01 = (a, b, c) => {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

const heightOf = (L) => (L.swe * 100) / L.rho

function grainOf(L, fromGround) {
  if (L.kind === 'SH') return GRAIN.SH
  if (L.crust) return GRAIN.MF
  if (L.w > 0.6 && fromGround < 25) return GRAIN.DH
  if (L.w > 0.38) return GRAIN.FC
  if (L.age < 2) return GRAIN.PP
  if (L.age < 6) return GRAIN.DF
  return GRAIN.RG
}

function strengthOf(L, wet) {
  if (L.kind === 'SH') {
    // feathers stay weak for weeks; they gain a little as they are pressed
    return (0.24 + 0.0035 * L.age) * (wet ? 0.6 : 1)
  }
  if (L.crust) return wet ? 1.6 : 5
  const ageF = Math.min(1, 0.2 + 0.08 * L.age)
  const sound = 0.74 * (L.rho / 100) ** 2 * ageF
  let s = sound * (1 - L.w) + 0.5 * L.w
  if (L.onCrust > 0) s *= 0.5
  if (L.iface > 0) s *= 1 - 0.55 * L.iface
  if (wet) s *= 0.5
  return s
}

/** wind loading factor for a path: lee slopes gather, windward slopes scour */
function windFactor(path, wx) {
  const downwind = (wx.dir + 180) % 360
  const lee = Math.cos(rad(path.aspect - downwind))
  const k = Math.max(0, wx.wind - 3)
  if (lee >= 0) return 1 + 0.1 * k * lee
  return Math.max(0.35, 1 + 0.05 * k * lee)
}

function newDensity(t, wind) {
  let r = 72 + 5 * (t + 8)
  r = clamp(r, 55, 130)
  if (wind > 6) r += 7 * (wind - 6)
  return clamp(r, 55, 240)
}

let LAYER_SEQ = 0

function makeLayer(registry, day, swe, rho, kind, cause, origin) {
  const id = ++LAYER_SEQ
  registry[id] = { id, born: day, cause, origin, kind }
  return { id, swe, rho, kind, w: 0, age: 0, crust: false, wet: false, onCrust: 0, iface: 0, born: day }
}

function columnHeight(col) {
  let h = 0
  for (const L of col) h += heightOf(L)
  return h
}

/**
 * Test a column. extra(depthCm) adds stress from a charge.
 * Returns the weakest layer index whose slab clears minSlab, or -1.
 */
function weakest(col, path, extra, minSlab, wetSet) {
  const sc = Math.sin(rad(path.slope)) * Math.cos(rad(path.slope))
  let load = 0
  let depth = 0
  let best = -1
  let bestSI = Infinity
  // col[0] is the ground, the last item is the surface
  for (let i = col.length - 1; i >= 0; i--) {
    const L = col[i]
    if (depth >= minSlab) {
      const tau = load * sc + (extra ? extra(depth) : 0)
      const si = strengthOf(L, wetSet && L.wet) / Math.max(tau, 1e-6)
      if (si < bestSI) {
        bestSI = si
        best = i
      }
    }
    load += L.swe * G
    depth += heightOf(L)
  }
  return { index: best, si: bestSI }
}

function siProfile(col, path) {
  const sc = Math.sin(rad(path.slope)) * Math.cos(rad(path.slope))
  const out = new Array(col.length)
  let load = 0
  for (let i = col.length - 1; i >= 0; i--) {
    const L = col[i]
    const tau = load * sc
    out[i] = load <= 0 ? 9 : clamp(strengthOf(L, L.wet) / tau, 0, 9)
    load += L.swe * G
  }
  return out
}

function release(col, idx, path) {
  const failed = col[idx]
  const slab = col.slice(idx + 1)
  let D = 0
  let mass = 0
  let wet = false
  for (const L of slab) {
    D += heightOf(L)
    mass += L.swe
    if (L.wet) wet = true
  }
  const avgRho = D > 0 ? (mass * 100) / D : 100
  const M = D * clamp(avgRho / 150, 0.7, 1.6) * (wet ? 0.85 : 1)
  const keep = failed.kind === 'SH' || failed.w > 0.38 ? idx : idx + 1
  col.length = keep
  // the new bed surface has no fresh weak interface on it
  if (col.length) {
    col[col.length - 1].onCrust = 0
    col[col.length - 1].iface = 0
  }
  return { D, M, wet, failed, slab, reaches: M >= path.reach, size: M < 30 ? 1 : M < 60 ? 2 : M < 110 ? 3 : 4 }
}

/**
 * Run a whole winter.
 * plan: { charges: [{path, day}], fences: [{path, day}], stamps: [{path, day}], closures: [day] }
 */
export function simulate(winter, plan, variant = 'A') {
  LAYER_SEQ = 0
  const wx = weatherFor(winter, variant)
  const registry = {}
  const cols = PATHS.map(() => [])
  const fences = new Array(PATHS.length).fill(Infinity)
  for (const f of plan.fences || []) fences[f.path] = Math.min(fences[f.path], f.day)
  const chargeAt = new Map()
  for (const c of plan.charges || []) chargeAt.set(`${c.path}:${c.day}`, true)
  const stampAt = new Map()
  for (const s of plan.stamps || []) stampAt.set(`${s.path}:${s.day}`, true)
  const closed = new Set(plan.closures || [])

  const events = []
  const notes = []
  const line = new Array(DAYS).fill('open')
  const forcedClear = new Set()
  const snapshots = PATHS.map(() => [])
  const daily = []
  const debris = PATHS.map(() => [])

  for (let day = 0; day < DAYS; day++) {
    const w = wx[day]
    const dayEvents = []
    const rainDay = w.rain > 0 || (w.swe > 0 && w.tmax > 1.2)

    // 1. snowfall with wind loading and fences; also wind transport
    const gains = PATHS.map((p) => (w.swe > 0 && !rainDay ? w.swe * windFactor(p, w) : 0))
    for (let p = 0; p < PATHS.length; p++) {
      if (fences[p] <= day && gains[p] > w.swe) {
        const held = (gains[p] - w.swe) * 0.4
        gains[p] -= held
        gains[PATHS[p].spill] += held * 0.4
      }
    }
    const transport = w.wind > 8 && w.swe === 0
    for (let p = 0; p < PATHS.length; p++) {
      const path = PATHS[p]
      const col = cols[p]
      const reg = registry
      // sun and wind take yesterday's feathers off the surface
      const top = col[col.length - 1]
      const leeNow = Math.cos(rad(path.aspect - ((w.dir + 180) % 360)))
      if (top && top.kind === 'SH' && ((w.wind > 6 && (w.swe === 0 || leeNow < 0.2)) || path.sun * (1 - w.cloud) > 0.55 || path.sun * Math.max(0, w.tmax + 3) > 1.4)) {
        col.pop()
      }
      if (gains[p] > 0.2) {
        const rho = newDensity(w.tmax, w.wind)
        const last = col[col.length - 1]
        const cause = w.storm ? `${w.storm} (${dayLabel(day)})` : `snow of ${dayLabel(day)}`
        if (last && last.born === day && last.kind === 'snow') {
          last.swe += gains[p]
        } else {
          const L = makeLayer(reg, day, gains[p], rho, 'snow', cause, w.wind > 7 ? 'wind' : 'storm')
          reg[L.id].storm = w.storm
          if (last && last.crust) L.onCrust = 8
          else if (last && last.kind !== 'SH' && last.born < day - 1) L.iface = 1
          col.push(L)
        }
      }
      if (transport) {
        const downwind = (w.dir + 180) % 360
        const lee = Math.cos(rad(path.aspect - downwind))
        const amount = (w.wind - 8) * 3.2 * lee * (fences[p] <= day ? 0.35 : 1)
        if (amount > 1) {
          const L = makeLayer(reg, day, amount, 190 + 8 * (w.wind - 8), 'snow', `wind slab, ${compass(w.dir)} gale of ${dayLabel(day)}`, 'wind')
          L.age = 2
          const last = col[col.length - 1]
          if (last && last.crust) L.onCrust = 8
          else if (last && last.kind !== 'SH') L.iface = 0.8
          col.push(L)
        } else if (amount < -1) {
          // scour the loose top
          let take = -amount
          for (let i = col.length - 1; i >= 0 && take > 0; i--) {
            const L = col[i]
            if (L.age > 4 || L.crust) break
            const t = Math.min(take, L.swe)
            L.swe -= t
            take -= t
            if (L.swe < 0.5) col.splice(i, 1)
          }
        }
      }

      // 2. rain and thaw wet the top of the pack
      for (const L of col) L.wet = false
      let wetMm = 0
      if (rainDay) wetMm = (w.rain || w.swe) * 1.5 + 10
      const melt = w.tmax > 0.5 ? 1.6 * w.tmax * (0.25 + path.sun) : 0
      wetMm += melt * 3
      if (melt > 0 && col.length) {
        let m = melt
        for (let i = col.length - 1; i >= 0 && m > 0; i--) {
          const L = col[i]
          const t = Math.min(m, L.swe * 0.5)
          L.swe -= t
          m -= t
        }
      }
      if (rainDay && col.length) col[col.length - 1].swe += w.rain || w.swe
      if (wetMm > 0) {
        let left = wetMm
        for (let i = col.length - 1; i >= 0 && left > 0; i--) {
          col[i].wet = true
          left -= col[i].swe
        }
      }

      // 3. metamorphism and settlement
      const hs = columnHeight(col) / 100
      // sunny aspects warm at the surface by day, which slows rot from below
      const tsurf = Math.min(0, (w.tmax + w.tmin) / 2 - 3.5 * (1 - w.cloud) + path.sun * 14 * (1 - w.cloud))
      const tg = hs > 0.02 ? -tsurf / hs : 0
      let fromGround = 0
      let load = 0
      for (let i = col.length - 1; i >= 0; i--) load += col[i].swe * G
      for (let i = 0; i < col.length; i++) {
        const L = col[i]
        load -= L.swe * G
        L.age += 1
        if (L.onCrust > 0) L.onCrust -= 1
        if (L.iface > 0) L.iface = Math.max(0, L.iface - 0.17)
        if (L.kind === 'SH') {
          fromGround += heightOf(L)
          continue
        }
        if (!L.crust) {
          if (tg > 10) L.w = Math.min(1, L.w + 0.0042 * (tg - 10) * (L.wet ? 0 : 1))
          else if (tg < 5) L.w = Math.max(0, L.w - 0.004)
          const depthFromTop = hs * 100 - fromGround - heightOf(L)
          if (depthFromTop < 12 && w.cloud < 0.3 && w.tmin < -10) L.w = Math.min(1, L.w + 0.03)
          const rate = (L.age < 4 ? 0.03 : 0.011) * (1 + load * 0.6) * (1 - L.w * 0.9)
          L.rho = Math.min(L.wet ? 460 : 400, L.rho * (1 + rate) + (L.wet ? 18 : 0))
        }
        fromGround += heightOf(L)
      }
      for (let i = col.length - 1; i >= 0; i--) if (col[i].swe < 0.4) col.splice(i, 1)
    }

    // 4. the morning's work: stamping, then charges at first light
    const morning = []
    for (let p = 0; p < PATHS.length; p++) {
      const path = PATHS[p]
      const col = cols[p]
      if (stampAt.get(`${p}:${day}`)) {
        const hs = columnHeight(col)
        if (hs < STAMP_LIMIT) {
          for (let i = col.length - 1; i >= 0; i--) {
            if (col[i].kind === 'SH') col.splice(i, 1)
          }
          for (const L of col) {
            L.w = 0
            L.rho = Math.max(L.rho, 270)
            L.age = Math.max(L.age, 10)
            L.onCrust = 0
            L.iface = 0
          }
          notes.push({ day, path: p, kind: 'stamp', ok: true, text: `Boot crew stamped the ${path.name} (${Math.round(hs)} cm) into one firm layer.` })
        } else {
          notes.push({ day, path: p, kind: 'stamp', ok: false, text: `The ${path.name} was ${Math.round(hs)} cm deep: too deep to stamp.` })
        }
      }
      if (chargeAt.get(`${p}:${day}`)) {
        const extra = (depth) => 0.5 * Math.exp(-depth / 105)
        const { index, si } = weakest(col, path, extra, CHARGE_MIN_SLAB, true)
        if (index >= 0 && si < 1) {
          const r = release(col, index, path)
          const ev = makeEvent(registry, day, p, 7, 'charge', r, si)
          events.push(ev)
          dayEvents.push(ev)
          morning.push(ev)
        } else {
          // a clean shot packs the surface a little
          for (let i = col.length - 1, d = 0; i >= 0 && d < 30; i--) {
            col[i].rho = Math.min(400, col[i].rho + 12)
            d += heightOf(col[i])
          }
          notes.push({ day, path: p, kind: 'charge', ok: false, text: `Charge on the ${path.name}: nothing moved.` })
        }
      }
    }

    // 5. natural releases
    for (let p = 0; p < PATHS.length; p++) {
      const path = PATHS[p]
      const col = cols[p]
      const { index, si } = weakest(col, path, null, NAT_MIN_SLAB, true)
      if (index >= 0 && si < 1) {
        const anyWet = col.some((L) => L.wet)
        const r0 = hash01(winter.seed, day, p)
        const hour = w.swe > 0 || w.rain > 0 ? 1 + r0 * 21 : anyWet ? 12.5 + r0 * 4 : 3 + r0 * 17
        const r = release(col, index, path)
        const ev = makeEvent(registry, day, p, hour, 'natural', r, si)
        events.push(ev)
        dayEvents.push(ev)
        if (r.M >= 95) {
          for (const q of [p - 1, p + 1]) {
            if (q < 0 || q >= PATHS.length) continue
            if (dayEvents.some((e) => e.path === q)) continue
            const nb = weakest(cols[q], PATHS[q], null, NAT_MIN_SLAB, true)
            if (nb.index >= 0 && nb.si < 1.22) {
              const r2 = release(cols[q], nb.index, PATHS[q])
              const ev2 = makeEvent(registry, day, q, hour + 0.02, 'sympathetic', r2, nb.si)
              ev2.from = p
              events.push(ev2)
              dayEvents.push(ev2)
            }
          }
        }
      }
    }

    // 6. the night: feathers grow, wet snow refreezes into crust
    const calmClear = w.cloud < 0.3 && w.wind < 3.5 && w.tmin < -5
    for (let p = 0; p < PATHS.length; p++) {
      const col = cols[p]
      const top = col[col.length - 1]
      if (w.tmin < -1.5) {
        for (let i = col.length - 1, d = 0; i >= 0 && d < 18; i--) {
          const L = col[i]
          if (L.wet && L.kind !== 'SH') {
            L.crust = true
            L.w = 0
            L.rho = Math.max(L.rho, 380)
            if (!registry[L.id].crustDay) registry[L.id].crustDay = day
          }
          d += heightOf(L)
        }
      }
      if (calmClear && top && !top.wet && columnHeight(col) > 5) {
        if (top.kind === 'SH') top.swe = Math.min(3.2, top.swe + 0.6)
        else {
          const L = makeLayer(registry, day, 1.1, 75, 'SH', `surface hoar, the clear night of ${dayLabel(day)} (${Math.round(w.tmin)}°)`, 'hoar')
          col.push(L)
        }
      }
    }

    // 7. the line, in the order things happen through the day
    const reachEvents = dayEvents.filter((e) => e.reaches).sort((x, y) => x.hour - y.hour)
    const charged = morning.length > 0 || (plan.charges || []).some((c) => c.day === day)
    let status = closed.has(day) ? 'closed' : forcedClear.has(day) ? 'clearing' : charged ? 'hold' : 'open'
    // trains run from firstRun until shutAt
    const firstRun = status === 'hold' ? HOLD_HOUR : 0
    let shutAt = status === 'closed' || status === 'clearing' ? -1 : Infinity
    const caughtTrains = new Set()
    for (const e of reachEvents) {
      if (shutAt <= e.hour) {
        e.outcome = 'closed-line'
        continue
      }
      if (e.trigger === 'charge') {
        e.outcome = 'shot-line'
        status = 'clearing'
        shutAt = -1
        continue
      }
      const train = TRAINS.find((t) => t.hour >= e.hour && t.hour >= firstRun && !caughtTrains.has(t.name))
      if (!train) {
        e.outcome = 'night-line'
        shutAt = e.hour
        if (day + 1 < DAYS) forcedClear.add(day + 1)
        continue
      }
      // the next train runs into the debris; the line stops behind it
      e.outcome = 'caught'
      e.train = train.name
      caughtTrains.add(train.name)
      status = 'stopped'
      shutAt = e.hour
      if (day + 1 < DAYS) forcedClear.add(day + 1)
    }
    for (const e of dayEvents) if (!e.outcome) e.outcome = e.trigger === 'charge' ? 'shot' : 'short'
    line[day] = status

    // 8. snapshots
    const row = { day, wx: w, hs: [], minSI: [], status }
    for (let p = 0; p < PATHS.length; p++) {
      const col = cols[p]
      const si = siProfile(col, PATHS[p])
      const snap = []
      let fromGround = 0
      let minSI = 9
      let accum = 0
      for (let i = 0; i < col.length; i++) {
        const L = col[i]
        const h = heightOf(L)
        snap.push({ id: L.id, h, g: grainOf(L, fromGround), si: si[i], rho: L.rho, wet: L.wet })
        fromGround += h
      }
      for (let i = col.length - 1; i >= 0; i--) {
        if (accum >= NAT_MIN_SLAB) minSI = Math.min(minSI, si[i])
        accum += heightOf(col[i])
      }
      snapshots[p].push(snap)
      row.hs.push(fromGround)
      row.minSI.push(minSI)
      for (const e of dayEvents) if (e.path === p) debris[p].push({ day, M: e.M, reaches: e.reaches })
    }
    row.danger = dangerOf(row, w)
    daily.push(row)
  }

  for (let d = 0; d < DAYS - 1; d++) daily[d].danger = Math.max(daily[d].danger, daily[d + 1].danger)
  events.sort((a, b) => a.day - b.day || a.hour - b.hour)
  const caught = events.filter((e) => e.outcome === 'caught')
  const closures = line.filter((s) => s === 'closed').length
  const clearing = line.filter((s) => s === 'clearing' || s === 'stopped').length
  const holds = line.filter((s) => s === 'hold').length
  return {
    variant,
    events,
    notes,
    line,
    daily,
    snapshots,
    registry,
    summary: {
      caught: caught.length,
      closures,
      clearing,
      holds,
      lost: closures + clearing + holds * 0.5,
      slides: events.length,
      crossings: events.filter((e) => e.reaches).length
    }
  }
}

function dangerOf(row, w) {
  const m = Math.min(...row.minSI)
  let d = m < 1.12 ? 4 : m < 1.35 ? 3 : m < 1.8 ? 2 : 1
  if (w.swe > 25 || w.rain > 0) d = Math.min(5, d + 1)
  return d
}

function makeEvent(registry, day, path, hour, trigger, r, si) {
  let buried = day
  for (const L of r.slab) buried = Math.min(buried, L.born)
  const info = registry[r.failed.id]
  const slabIds = r.slab.map((L) => L.id)
  const storms = []
  for (const L of r.slab) {
    const c = registry[L.id]
    const name = c ? (c.storm || c.cause.replace(/ \(.*\)$/, '')) : null
    if (name && c.kind !== 'SH' && !storms.includes(name)) storms.push(name)
  }
  return {
    key: `${path}:${day}:${trigger}`,
    day,
    path,
    hour,
    trigger,
    D: r.D,
    M: r.M,
    size: r.size,
    wet: r.wet,
    reaches: r.reaches,
    failedId: r.failed.id,
    failedGrain: r.failed.kind === 'SH' ? GRAIN.SH : r.failed.crust ? GRAIN.MF : r.failed.w > 0.6 ? GRAIN.DH : r.failed.w > 0.38 ? GRAIN.FC : r.failed.age < 3 ? GRAIN.PP : GRAIN.DF,
    failedBorn: info ? info.born : day,
    failedCause: info ? info.cause : 'unknown',
    onCrust: r.failed.onCrust > 0 || false,
    slabIds,
    loads: storms.slice(-3),
    si,
    buriedDay: buried
  }
}

export const hourLabel = (h) => {
  const hh = Math.floor(h) % 24
  const mm = Math.floor((h - Math.floor(h)) * 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** compare two dreams: which slides vanished, which are new */
export function diffEvents(before, after) {
  if (!before) return { gone: [], fresh: [] }
  const k = (e) => `${e.path}:${e.day}`
  const a = new Map(before.events.map((e) => [k(e), e]))
  const b = new Map(after.events.map((e) => [k(e), e]))
  const gone = []
  const fresh = []
  for (const [key, e] of a) if (!b.has(key)) gone.push(e)
  for (const [key, e] of b) {
    const old = a.get(key)
    if (!old) fresh.push(e)
    else if (old.outcome !== e.outcome && (old.outcome === 'caught' || e.outcome === 'caught')) fresh.push(e)
  }
  return { gone, fresh }
}

/** pack the strata snapshots into transferable arrays for the main thread */
export function packSnapshots(result) {
  return result.snapshots.map((days) => {
    let n = 0
    for (const s of days) n += s.length
    const offsets = new Int32Array(days.length + 1)
    const data = new Float32Array(n * 6)
    let k = 0
    days.forEach((s, d) => {
      offsets[d] = k
      for (const L of s) {
        const o = k * 6
        data[o] = L.id
        data[o + 1] = L.h
        data[o + 2] = L.g
        data[o + 3] = L.si
        data[o + 4] = L.rho
        data[o + 5] = L.wet ? 1 : 0
        k++
      }
    })
    offsets[days.length] = k
    return { offsets, data }
  })
}

export function runDream(winter, plan) {
  const variants = winter.twoDreams ? ['A', 'B'] : ['A']
  return variants.map((v) => {
    const r = simulate(winter, plan, v)
    const packed = packSnapshots(r)
    return {
      variant: v,
      events: r.events,
      notes: r.notes,
      line: r.line,
      daily: r.daily.map((d) => ({ day: d.day, wx: d.wx, hs: d.hs, minSI: d.minSI, status: d.status, danger: d.danger })),
      registry: r.registry,
      summary: r.summary,
      strata: packed
    }
  })
}

export { DAYS, PATHS }
