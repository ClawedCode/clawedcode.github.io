import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ExperimentNav from '../../ExperimentNav'
import './AlembicLedger.css'

const STORAGE_KEY = 'clawed:alembic-ledger:v1'
const VIEWBOX = { width: 1080, height: 700 }
const PORTRAIT_VIEWBOX = { width: 720, height: 1046 }
const PORTRAIT_SX = 0.928
const PORTRAIT_SY = 0.944

const STATIONS = 7
const MAX_TICKS = 40
const TICK_MS = 150
const RUN_BASE = 30
const TRANSIT_UNIT = 190
const HEAT_LOSS = 0.028
const SCALD_LOAD = 8
const SCALD_SWARM = 24
const DEATH = 0.045
const RETORT_GAIN = 1.18
const MAX_RUINS = 4
const DRAG_THRESHOLD = 6
const TIGHT_SPAN = 215

/** The three things a boiling wash is actually made of. Volatility decides what a
 *  column lets up; dew point decides what a cold jacket pulls back out of vapour. */
const FRACTIONS = [
  { id: 'heads', label: 'heads', mark: '△', volatility: 3, dew: 42, color: '#e8d26a' },
  { id: 'heart', label: 'heart', mark: '◇', volatility: 2, dew: 58, color: '#8fd9c4' },
  { id: 'tails', label: 'tails', mark: '▽', volatility: 1, dew: 76, color: '#c4683c' }
]

const CUTS = [0, 0.7, 1.3, 1.7, 2.1, 2.5, 3.2]
const JACKETS = [28, 36, 45, 54, 63, 72, 82]
const GATES = [0, 0.3, 0.45, 0.58, 0.7, 0.8, 0.9]
const REBOILS = [58, 64, 70, 76, 82, 88, 94]
const SILLS = [0.2, 0.6, 1, 1.5, 2.1, 2.8, 3.6]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const round1 = (value) => Math.round(value * 10) / 10
const round2 = (value) => Math.round(value * 100) / 100

const passingSet = (station) => FRACTIONS.filter(fraction => fraction.volatility >= CUTS[station])
const condensingSet = (station) => FRACTIONS.filter(fraction => fraction.dew > JACKETS[station])

const VESSELS = [
  {
    id: 'pot', kind: 'pot', label: 'brass pot', short: 'pot', mark: '01', color: '#c4683c',
    x: 84, y: 448, width: 214, height: 186, unlockedAt: 0,
    rodLabel: 'fire', rodNote: 'low is slow and clean, high is fast and muddled',
    read: (station) => `${station}/6 · ${RUN_BASE - station * 2}t run`,
    note: 'the only vessel that makes vapour out of nothing but heat'
  },
  {
    id: 'column', kind: 'column', label: 'plate column', short: 'column', mark: '02', color: '#8fd9c4',
    x: 338, y: 282, width: 212, height: 190, unlockedAt: 0,
    rodLabel: 'plate cut', rodNote: 'anything lighter than the cut climbs; the rest falls back',
    read: (station) => (station === 6 ? 'closed' : passingSet(station).map(f => f.mark).join('') || 'closed'),
    note: 'decides by lightness, so it strips weight and never strips poison'
  },
  {
    id: 'worm', kind: 'worm', label: 'worm condenser', short: 'worm', mark: '03', color: '#6f9ed2',
    x: 596, y: 416, width: 212, height: 188, unlockedAt: 0,
    rodLabel: 'jacket', rodNote: 'only fractions whose dew sits above the jacket become liquid',
    read: (station) => `${JACKETS[station]}° · ${condensingSet(station).map(f => f.mark).join('') || 'none'}`,
    note: 'the one place vapour becomes matter — and the one place heads can be let go'
  },
  {
    id: 'ledger', kind: 'jar', label: 'ledger jar', short: 'jar', mark: '04', color: '#e8d26a',
    x: 848, y: 452, width: 206, height: 190, unlockedAt: 0,
    rodLabel: 'gate', rodNote: 'liquid under the gate is refused and leaves as feints',
    read: (station) => `${Math.round(GATES[station] * 100)}% heart`,
    note: 'a judgement, not a container: what it refuses becomes the next run'
  },
  {
    id: 'retort', kind: 'retort', label: 'feint retort', short: 'retort', mark: '05', color: '#b07fc0',
    x: 594, y: 128, width: 216, height: 182, unlockedAt: 1,
    rodLabel: 're-boil', rodNote: 'hotter vapour survives longer pipes but scalds sooner',
    read: (station) => `${REBOILS[station]}° · ×${RETORT_GAIN}`,
    note: 'the only gain in the house — a circuit through it can feed itself or burst'
  },
  {
    id: 'vent', kind: 'vent', label: 'aroma vent', short: 'vent', mark: '06', color: '#dd7f9c',
    x: 852, y: 118, width: 202, height: 180, unlockedAt: 2,
    rodLabel: 'sill', rodNote: 'thin arrivals are absorbed by the brick and never leave the house',
    read: (station) => `${SILLS[station]} measure`,
    note: 'publishes a finished run outward as weather instead of hoarding it as liquid'
  }
]

const PLATES = {
  reflux: {
    id: 'reflux', label: 'reflux plate', mark: '⊜', color: '#8fd9c4', unlockedAt: 0,
    note: 'no bleed past the cut', home: 'column',
    reading: 'removes every ambiguous drop from a column cut, so weight stops smuggling itself upward'
  },
  demister: {
    id: 'demister', label: 'demister', mark: '≋', color: '#6f9ed2', unlockedAt: 0,
    note: '+11° leaving the vessel', home: 'column',
    reading: 'reheats whatever leaves, so a long pipe stops raining the run out before it arrives'
  },
  char: {
    id: 'char', label: 'char plate', mark: '▦', color: '#9aa3a0', unlockedAt: 0,
    note: '−80% heads, −10% heart', home: 'worm',
    reading: 'the blunt fix for poison: it eats heads wherever it sits, and a little of the wanted thing'
  },
  juniper: {
    id: 'juniper', label: 'juniper basket', mark: '⌇', color: '#8bb765', unlockedAt: 1,
    note: '30% of tails become heart', home: 'retort',
    reading: 'turns weight into worth — the only way a late, oily run can still fill the ledger'
  },
  wool: {
    id: 'wool', label: 'copper wool', mark: '⊗', color: '#c4683c', unlockedAt: 1,
    note: '−55% tails', home: 'worm',
    reading: 'a cheap heavy-strip that needs no reflux and costs no heart'
  },
  thief: {
    id: 'thief', label: 'thief valve', mark: '⊺', color: '#dd7f9c', unlockedAt: 2,
    note: 'permits two outlets, halves each', home: 'worm',
    reading: 'the only way one arrival can leave in two directions, at half measure each'
  }
}

const ORDERS = {
  thrift: { id: 'thrift', label: 'bank the fire between runs', mark: '⌂', color: '#e8d26a', cadence: 7600, note: 'the house works slowly and lets every jar settle before it stokes again' },
  appetite: { id: 'appetite', label: 're-stoke the moment the glass is dry', mark: '↗', color: '#c4683c', cadence: 3200, note: 'the house never idles, and it will cut corners to keep the worm wet' },
  vigil: { id: 'vigil', label: 'walk the feints back through the retort', mark: '§', color: '#b07fc0', cadence: 5600, note: 'the house re-reads its own refusals before it trusts a new charge' }
}

const COMMISSIONS = [
  {
    id: 'first',
    label: 'commission I / the first cut',
    title: 'Take one clean cut off the wash.',
    instruction: 'Pipe the pot into the column, the column into the worm, and the worm into the jar. Heads boil off first and condense only in a cold jacket — so the jacket, not the column, decides whether the ledger is poisoned.',
    demands: [
      { code: 'collect', text: 'one cut collected in the jar', test: (run) => run.collections.length >= 1 },
      { code: 'pure', text: 'a cut at 70% heart or better', test: (run) => run.collections.some(cut => cut.purity >= 0.7) },
      { code: 'clean', text: 'no heads anywhere in the ledger', test: (run) => run.collections.every(cut => cut.mix.heads < 0.08) },
      { code: 'calm', text: 'nothing scalds', test: (run) => run.scalds.length === 0 }
    ],
    success: 'the first cut went into the glass clean // every rod the run crossed kept a notch where its bead was standing'
  },
  {
    id: 'long',
    label: 'commission II / the long run',
    title: 'Make the refusals pay for themselves.',
    instruction: 'Three cuts, six measures of heart. The jar hands whatever it refuses out of its own spout — run those feints through the retort and back up the column, and a notched rod will hold its bead while you do it.',
    demands: [
      { code: 'three', text: 'three separate cuts collected', test: (run) => run.collections.length >= 3 },
      { code: 'apart', text: 'arriving on two different ticks', test: (run) => new Set(run.collections.map(cut => cut.tick)).size >= 2 },
      { code: 'volume', text: 'six measures of heart banked', test: (run) => run.banked.heart >= 6 },
      { code: 'calm', text: 'nothing scalds', test: (run) => run.scalds.length === 0 }
    ],
    success: 'the feints came back as vapour and arrived worth keeping // the retort is no longer an experiment'
  },
  {
    id: 'house',
    label: 'commission III / the standing house',
    title: 'Let the house outlast the fire.',
    instruction: 'Publish two aromas at the vent and still be running at tick 24 — which needs a circuit that feeds itself without crossing the scald ceiling. Then say what the house should favour when no hand is on the lever.',
    demands: [
      { code: 'aroma', text: 'two aromas published at the vent', test: (run) => run.aromas.length >= 2 },
      { code: 'alive', text: 'still running at tick 24', test: (run) => run.endedAt >= 24 },
      { code: 'calm', text: 'never above the scald ceiling', test: (run) => run.scalds.length === 0 },
      { code: 'order', text: 'a standing order chosen', test: (run, world) => Boolean(world.order) }
    ],
    order: true,
    success: 'the circuit kept boiling after the fire was banked and never burst its own glass'
  }
]

const vesselById = (id) => VESSELS.find(vessel => vessel.id === id)
const pipeIdFor = (from, to) => `${from}=>${to}`

/* ---------- mixture arithmetic ---------- */

const EMPTY_MIX = { heads: 0, heart: 0, tails: 0 }
const mixTotal = (mix) => mix.heads + mix.heart + mix.tails
const mixPurity = (mix) => {
  const total = mixTotal(mix)
  return total > 0 ? mix.heart / total : 0
}
const scaleMix = (mix, factor) => ({
  heads: mix.heads * factor,
  heart: mix.heart * factor,
  tails: mix.tails * factor
})
const addMix = (left, right) => ({
  heads: left.heads + right.heads,
  heart: left.heart + right.heart,
  tails: left.tails + right.tails
})

/* ---------- persistent world ---------- */

const freshWorld = () => ({
  version: 1,
  unlocked: false,
  vessels: Object.fromEntries(VESSELS.map(vessel => [vessel.id, {
    x: vessel.x,
    y: vessel.y,
    scars: 0,
    runs: 0,
    notches: []
  }])),
  beads: { pot: 3, column: 2, worm: 2, ledger: 3, retort: 3, vent: 2 },
  plates: {},
  pipes: [{ id: pipeIdFor('pot', 'column'), from: 'pot', to: 'column', crossings: 0, memory: 0 }],
  cellar: { heads: 0, heart: 0, tails: 0, cuts: 0, aromas: 0 },
  stage: 0,
  status: 'composing',
  ruins: 0,
  order: null,
  runbook: [],
  history: [],
  log: [{ id: 'sealed', stage: 0, text: 'a cold pot, four empty rods, and a jar that has never been asked to judge anything' }],
  lastSaved: null
})

const snapshotWorld = (world) => ({
  vessels: Object.fromEntries(Object.entries(world.vessels).map(([id, vessel]) => [id, { ...vessel, notches: [...vessel.notches] }])),
  beads: { ...world.beads },
  plates: { ...world.plates },
  pipes: world.pipes.map(pipe => ({ ...pipe })),
  cellar: { ...world.cellar },
  stage: world.stage,
  status: world.status,
  ruins: world.ruins,
  order: world.order,
  runbook: world.runbook.map(entry => ({ ...entry })),
  log: world.log.map(entry => ({ ...entry }))
})

const loadWorld = () => {
  const fresh = freshWorld()
  if (typeof window === 'undefined') return fresh
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (saved?.version !== 1) return fresh
    return {
      ...fresh,
      ...saved,
      vessels: Object.fromEntries(VESSELS.map(vessel => {
        const stored = saved.vessels?.[vessel.id] || {}
        return [vessel.id, {
          ...fresh.vessels[vessel.id],
          ...stored,
          x: clamp(Number(stored.x ?? vessel.x) || vessel.x, 18, VIEWBOX.width - vessel.width - 18),
          y: clamp(Number(stored.y ?? vessel.y) || vessel.y, 22, VIEWBOX.height - vessel.height - 22),
          notches: Array.isArray(stored.notches)
            ? [...new Set(stored.notches.filter(station => station >= 0 && station < STATIONS))].slice(-4)
            : []
        }]
      })),
      beads: Object.fromEntries(VESSELS.map(vessel => [
        vessel.id,
        clamp(Number(saved.beads?.[vessel.id] ?? fresh.beads[vessel.id]) || 0, 0, STATIONS - 1)
      ])),
      plates: Object.fromEntries(
        Object.entries(saved.plates || {}).filter(([plateId, vesselId]) => PLATES[plateId] && vesselById(vesselId))
      ),
      pipes: Array.isArray(saved.pipes)
        ? saved.pipes
            .filter(pipe => vesselById(pipe.from) && vesselById(pipe.to) && pipe.from !== pipe.to)
            .map(pipe => ({ ...pipe, id: pipeIdFor(pipe.from, pipe.to) }))
            .slice(0, 10)
        : fresh.pipes,
      cellar: { ...fresh.cellar, ...(saved.cellar || {}) },
      order: ORDERS[saved.order] ? saved.order : null,
      runbook: Array.isArray(saved.runbook) ? saved.runbook.slice(-6) : [],
      history: Array.isArray(saved.history) ? saved.history.slice(-8) : [],
      log: Array.isArray(saved.log) ? saved.log.slice(-8) : fresh.log
    }
  } catch {
    return fresh
  }
}

const formatAge = (timestamp) => {
  if (!timestamp) return 'unkept'
  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s kept`
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes}m kept` : `${Math.round(minutes / 60)}h kept`
}

/* ---------- geometry ---------- */

const awakeIds = (world) => new Set(
  VESSELS.filter(vessel => vessel.unlockedAt <= world.stage || world.status === 'mastered').map(vessel => vessel.id)
)

const centreOf = (world, id) => {
  const vessel = vesselById(id)
  const placement = world.vessels[id]
  return { x: placement.x + vessel.width / 2, y: placement.y + vessel.height / 2 }
}

const pipesFor = (world) => {
  const awake = awakeIds(world)
  return world.pipes
    .filter(pipe => awake.has(pipe.from) && awake.has(pipe.to))
    .map(pipe => {
      const from = centreOf(world, pipe.from)
      const to = centreOf(world, pipe.to)
      const distance = Math.hypot(to.x - from.x, to.y - from.y)
      const scar = (world.vessels[pipe.to]?.scars || 0) * 1.4
      return {
        ...pipe,
        distance,
        ticks: Math.max(1, Math.round(distance / TRANSIT_UNIT)),
        drop: distance * HEAT_LOSS + scar
      }
    })
}

const plateAt = (world, vesselId) => Object.entries(world.plates)
  .find(([, hostId]) => hostId === vesselId)?.[0] || null

const outletLimit = (world, vesselId) => (plateAt(world, vesselId) === 'thief' ? 2 : 1)

const notchedAt = (world, vesselId) => (world.vessels[vesselId]?.notches || []).includes(world.beads[vesselId])

/**
 * Deterministic still. One charge of wash boils off on a schedule set by the fire,
 * and every vessel it crosses either lets a fraction through, drops it back, or turns
 * it into matter. Pipe length is both transit time and heat loss, so where the glass
 * stands is as much a decision as where a bead stands.
 */
const simulate = (world) => {
  const awake = awakeIds(world)
  const kinds = new Map(VESSELS.map(vessel => [vessel.id, vessel.kind]))
  const pipes = pipesFor(world)
  const outgoing = new Map()
  pipes.forEach(pipe => {
    const list = outgoing.get(pipe.from) || []
    list.push(pipe)
    outgoing.set(pipe.from, list)
  })

  const fire = world.beads.pot
  const runLength = RUN_BASE - fire * 2
  const rate = 0.85 + fire * 0.2
  const baseBleed = clamp(0.34 + fire * 0.035, 0, 0.62)
  const potTemp = 68 + fire * 4

  const frames = []
  const collections = []
  const aromas = []
  const scalds = []
  const puddles = []
  const vented = []
  const absorbed = []
  const refused = []
  const reached = new Set()
  const usedPipes = new Set()
  const banked = { heads: 0, heart: 0, tails: 0 }

  let parcels = []
  let recharge = EMPTY_MIX
  let uid = 0
  let endedAt = 0
  let peakLoad = 0
  let refluxed = 0
  let puddled = 0
  let ventedTotal = 0

  const leak = (vesselId, payload, tick) => {
    const total = mixTotal(payload.mix)
    ventedTotal += total
    vented.push({ tick, vesselId, volume: total, liquid: Boolean(payload.liquid) })
  }

  const dispatch = (fromId, payload, tick) => {
    const edges = outgoing.get(fromId) || []
    if (!edges.length) {
      leak(fromId, payload, tick)
      return
    }
    const chosen = edges.slice(0, outletLimit(world, fromId))
    const share = 1 / chosen.length
    chosen.forEach(edge => {
      const temp = payload.temp - edge.drop
      let mix = scaleMix(payload.mix, share)
      if (!payload.liquid) {
        let lost = 0
        const kept = { heads: 0, heart: 0, tails: 0 }
        FRACTIONS.forEach(fraction => {
          if (fraction.dew > temp) lost += mix[fraction.id]
          else kept[fraction.id] = mix[fraction.id]
        })
        if (lost > DEATH) {
          puddled += lost
          puddles.push({ tick, pipeId: edge.id, volume: lost })
        }
        mix = kept
      }
      if (mixTotal(mix) < DEATH) return
      usedPipes.add(edge.id)
      parcels.push({
        id: `p${uid += 1}`,
        pipeId: edge.id,
        from: edge.from,
        to: edge.to,
        remaining: edge.ticks,
        total: edge.ticks,
        mix,
        temp,
        liquid: Boolean(payload.liquid)
      })
    })
  }

  const receive = (vesselId, arrival, tick) => {
    const plate = plateAt(world, vesselId)
    let mix = arrival.mix
    let temp = arrival.temp

    if (plate === 'char') mix = { heads: mix.heads * 0.2, heart: mix.heart * 0.9, tails: mix.tails }
    if (plate === 'juniper') {
      const moved = mix.tails * 0.3
      mix = { heads: mix.heads, heart: mix.heart + moved, tails: mix.tails - moved }
    }
    if (plate === 'wool') mix = { ...mix, tails: mix.tails * 0.45 }

    const station = world.beads[vesselId]
    const exit = (payload) => dispatch(vesselId, {
      ...payload,
      temp: payload.temp + (plate === 'demister' ? 11 : 0)
    }, tick)

    switch (kinds.get(vesselId)) {
      case 'pot': {
        recharge = addMix(recharge, mix)
        return
      }
      case 'column': {
        if (arrival.liquid) {
          refluxed += mixTotal(mix)
          return
        }
        const cut = CUTS[station]
        const below = FRACTIONS.filter(fraction => fraction.volatility < cut)
          .sort((left, right) => right.volatility - left.volatility)[0]
        const bleed = plate === 'reflux' ? 0 : baseBleed
        const passing = { heads: 0, heart: 0, tails: 0 }
        FRACTIONS.forEach(fraction => {
          const volume = mix[fraction.id]
          if (fraction.volatility >= cut) passing[fraction.id] = volume
          else if (below && fraction.id === below.id) {
            passing[fraction.id] = volume * bleed
            refluxed += volume * (1 - bleed)
          } else refluxed += volume
        })
        if (mixTotal(passing) < DEATH) return
        exit({ mix: passing, temp: temp - 2, liquid: false })
        return
      }
      case 'worm': {
        const jacket = JACKETS[station]
        if (arrival.liquid) {
          exit({ mix, temp: jacket, liquid: true })
          return
        }
        const liquid = { heads: 0, heart: 0, tails: 0 }
        const vapour = { heads: 0, heart: 0, tails: 0 }
        FRACTIONS.forEach(fraction => {
          if (jacket < fraction.dew) liquid[fraction.id] = mix[fraction.id]
          else vapour[fraction.id] = mix[fraction.id]
        })
        if (mixTotal(liquid) >= DEATH) exit({ mix: liquid, temp: jacket, liquid: true })
        if (mixTotal(vapour) >= DEATH) exit({ mix: vapour, temp: jacket, liquid: false })
        else if (mixTotal(vapour) > 0) ventedTotal += mixTotal(vapour)
        return
      }
      case 'jar': {
        if (!arrival.liquid) {
          leak(vesselId, { mix, temp }, tick)
          return
        }
        const purity = mixPurity(mix)
        const volume = mixTotal(mix)
        if (purity >= GATES[station]) {
          collections.push({ tick, mix, purity, volume })
          banked.heads += mix.heads
          banked.heart += mix.heart
          banked.tails += mix.tails
          return
        }
        refused.push({ tick, volume, purity })
        exit({ mix, temp, liquid: true })
        return
      }
      case 'retort': {
        if (!arrival.liquid) {
          exit({ mix, temp, liquid: false })
          return
        }
        const stripped = { heads: mix.heads, heart: mix.heart, tails: mix.tails * 0.65 }
        refluxed += mix.tails * 0.35
        exit({ mix: scaleMix(stripped, RETORT_GAIN), temp: REBOILS[station], liquid: false })
        return
      }
      case 'vent': {
        const volume = mixTotal(mix)
        if (arrival.liquid) {
          absorbed.push({ tick, volume, liquid: true })
          return
        }
        if (volume >= SILLS[station]) aromas.push({ tick, volume, purity: mixPurity(mix) })
        else absorbed.push({ tick, volume, liquid: false })
        return
      }
      default:
        return
    }
  }

  for (let tick = 0; tick <= MAX_TICKS; tick += 1) {
    const arrivals = []

    parcels.forEach(parcel => { parcel.remaining -= 1 })
    parcels.filter(parcel => parcel.remaining <= 0).forEach(parcel => {
      arrivals.push({ to: parcel.to, mix: parcel.mix, temp: parcel.temp, liquid: parcel.liquid, pipeId: parcel.pipeId })
    })
    parcels = parcels.filter(parcel => parcel.remaining > 0)

    if (awake.has('pot')) {
      const phase = runLength > 0 ? tick / runLength : 1
      const schedule = tick <= runLength
        ? {
            heads: Math.max(0, 1 - phase / 0.28) * rate,
            heart: clamp(1 - Math.abs(phase - 0.5) / 0.42, 0, 1) * rate,
            tails: Math.max(0, (phase - 0.6) / 0.4) * rate
          }
        : EMPTY_MIX
      const boil = addMix(schedule, recharge)
      recharge = EMPTY_MIX
      if (mixTotal(boil) >= DEATH) {
        dispatch('pot', { mix: boil, temp: potTemp, liquid: false }, tick)
        reached.add('pot')
      }
    }

    const load = {}
    arrivals.forEach(arrival => {
      reached.add(arrival.to)
      load[arrival.to] = (load[arrival.to] || 0) + mixTotal(arrival.mix)
    })
    Object.entries(load).forEach(([vesselId, volume]) => {
      peakLoad = Math.max(peakLoad, volume)
      if (volume > SCALD_LOAD) scalds.push({ tick, vesselId, volume, kind: 'load' })
    })

    const collectedBefore = collections.length
    const aromasBefore = aromas.length
    const jarIn = { heads: 0, heart: 0, tails: 0 }
    arrivals.forEach(arrival => {
      if (kinds.get(arrival.to) === 'jar' && arrival.liquid) {
        jarIn.heads += arrival.mix.heads
        jarIn.heart += arrival.mix.heart
        jarIn.tails += arrival.mix.tails
      }
    })
    const puddledBefore = puddled
    const ventedBefore = ventedTotal
    const refluxedBefore = refluxed

    arrivals.forEach(arrival => receive(arrival.to, arrival, tick))

    if (parcels.length > SCALD_SWARM) {
      scalds.push({ tick, vesselId: 'house', volume: parcels.length, kind: 'swarm' })
    }

    const live = parcels.length
    if (live > 0) endedAt = tick

    frames.push({
      tick,
      jarIn,
      purity: mixPurity(jarIn),
      collected: collections.slice(collectedBefore).reduce((sum, cut) => sum + cut.volume, 0),
      aromas: aromas.length - aromasBefore,
      puddled: puddled - puddledBefore,
      vented: ventedTotal - ventedBefore,
      refluxed: refluxed - refluxedBefore,
      load: Math.max(0, ...Object.values(load), 0),
      live,
      scald: scalds.some(entry => entry.tick === tick),
      parcels: parcels.map(parcel => ({
        id: parcel.id,
        pipeId: parcel.pipeId,
        from: parcel.from,
        to: parcel.to,
        progress: 1 - parcel.remaining / parcel.total,
        volume: mixTotal(parcel.mix),
        purity: mixPurity(parcel.mix),
        liquid: parcel.liquid
      })),
      arrivals: [...new Set(arrivals.map(arrival => arrival.to))]
    })

    if (scalds.some(entry => entry.tick === tick)) break
    if (tick > runLength && live === 0 && mixTotal(recharge) < DEATH) break
  }

  return {
    frames,
    collections,
    aromas,
    scalds,
    puddles,
    vented,
    absorbed,
    refused,
    banked,
    reached,
    usedPipes,
    pipes,
    endedAt,
    peakLoad,
    refluxed,
    puddled,
    ventedTotal,
    runLength,
    fire
  }
}

const judge = (run, world) => {
  const commission = COMMISSIONS[Math.min(world.stage, COMMISSIONS.length - 1)]
  const demands = commission.demands.map(demand => ({ ...demand, met: demand.test(run, world) }))
  return { commission, demands, ready: demands.every(demand => demand.met) }
}

/* ---------- repair search ---------- */

const withBead = (world, vesselId, station) => ({
  ...world,
  beads: { ...world.beads, [vesselId]: station }
})

const withPlate = (world, plateId, vesselId) => {
  const plates = { ...world.plates }
  Object.keys(plates).forEach(id => {
    if (plates[id] === vesselId) delete plates[id]
  })
  plates[plateId] = vesselId
  return { ...world, plates }
}

const withPipe = (world, from, to) => {
  const limit = outletLimit(world, from)
  let pipes = world.pipes.filter(pipe => pipe.from !== from || pipe.to !== to)
  while (pipes.filter(pipe => pipe.from === from).length >= limit) {
    const victim = pipes.filter(pipe => pipe.from === from).at(-1)
    pipes = pipes.filter(pipe => pipe.id !== victim.id)
  }
  const prior = world.pipes.find(pipe => pipe.id === pipeIdFor(from, to))
  return {
    ...world,
    pipes: [...pipes, {
      id: pipeIdFor(from, to),
      from,
      to,
      crossings: prior?.crossings || 0,
      memory: prior?.memory || 0
    }].slice(-10)
  }
}

const unlockedPlates = (world) => Object.values(PLATES)
  .filter(plate => plate.unlockedAt <= world.stage || world.status === 'mastered')

const searchBead = (world, awake) => {
  for (const vessel of VESSELS) {
    if (!awake.has(vessel.id)) continue
    const current = world.beads[vessel.id]
    for (let station = 0; station < STATIONS; station += 1) {
      if (station === current) continue
      const probe = withBead(world, vessel.id, station)
      if (judge(simulate(probe), probe).ready) return { vesselId: vessel.id, station }
    }
  }
  return null
}

const searchPlate = (world, awake) => {
  for (const plate of unlockedPlates(world)) {
    for (const vessel of VESSELS) {
      if (!awake.has(vessel.id)) continue
      if (world.plates[plate.id] === vessel.id) continue
      const probe = withPlate(world, plate.id, vessel.id)
      if (judge(simulate(probe), probe).ready) return { plateId: plate.id, vesselId: vessel.id }
    }
  }
  return null
}

/** Highest station whose threshold a measured value still clears. */
const highestUnder = (ladder, value) => {
  let station = 0
  ladder.forEach((threshold, index) => {
    if (threshold <= value) station = index
  })
  return station
}

const pullVector = (world, fromId, toId, span = TIGHT_SPAN) => {
  const from = centreOf(world, fromId)
  const to = centreOf(world, toId)
  const distance = Math.hypot(to.x - from.x, to.y - from.y) || 1
  if (distance <= span) return { dx: 0, dy: 0, distance }
  const scale = (distance - span) / distance
  return {
    dx: Math.round(-(to.x - from.x) * scale),
    dy: Math.round(-(to.y - from.y) * scale),
    distance
  }
}

const frontierOf = (world, run, awake) => {
  const candidates = [...run.reached].filter(id => awake.has(id))
  const stalled = candidates.find(id => !world.pipes.some(pipe => pipe.from === id))
  return stalled || candidates.at(-1) || 'pot'
}

/**
 * Names the single most consequential thing wrong with the house, and — where it can
 * — the exact bead, plate or pipe that resolves it. Structural faults answer instantly;
 * the exhaustive bead/plate search only runs when the hand is off the glass.
 */
const diagnose = (world, run, verdict, deep) => {
  const awake = awakeIds(world)
  const unmet = new Set(verdict.demands.filter(demand => !demand.met).map(demand => demand.code))
  const hostOf = (plateId) => world.plates[plateId] || null

  if (!world.pipes.some(pipe => pipe.from === 'pot')) {
    return {
      kind: 'pipe', from: 'pot', to: 'column',
      title: 'the pot boils into a closed lid',
      detail: 'Vapour exists at tick 0 and has nowhere to climb. Drag the pot’s outlet nozzle onto the column.',
      action: 'run a pipe pot → column'
    }
  }

  if (!run.reached.has('worm')) {
    const stalled = frontierOf(world, run, awake)
    const spent = world.pipes.filter(pipe => pipe.from === stalled).length >= outletLimit(world, stalled)
    return {
      kind: 'pipe', from: stalled, to: 'worm', force: spent,
      title: 'nothing reaches the worm',
      detail: spent
        ? `${vesselById(stalled).short} already spends its only outlet elsewhere. Re-run that pipe into the worm — vapour cannot become liquid anywhere else.`
        : `The run stops at ${vesselById(stalled).short}. Carry a pipe from there into the worm.`,
      action: `run a pipe ${vesselById(stalled).short} → worm`
    }
  }

  if (!world.pipes.some(pipe => pipe.from === 'worm')) {
    return {
      kind: 'pipe', from: 'worm', to: 'ledger',
      title: 'the worm condenses into open air',
      detail: 'Liquid is being made and immediately vented. Pipe the worm into the ledger jar so something can be judged.',
      action: 'run a pipe worm → jar'
    }
  }

  if (run.scalds.length) {
    const scald = run.scalds[0]
    if (world.beads.pot > 1) {
      return {
        kind: 'bead', vesselId: 'pot', station: world.beads.pot - 2,
        title: scald.kind === 'swarm'
          ? 'the house filled with vapour faster than it could empty'
          : `${vesselById(scald.vesselId)?.short || 'the house'} took ${round1(scald.volume)} measures at once`,
        detail: `The ceiling is ${SCALD_LOAD} measures in one vessel on one tick. Bank the fire: a cooler pot boils less per tick and runs longer.`,
        action: `slide fire down to ${world.beads.pot - 2}`
      }
    }
    const loopPipe = run.pipes.find(pipe => run.usedPipes.has(pipe.id) && pipe.distance < TIGHT_SPAN)
    return {
      kind: 'stretch', from: loopPipe?.from, to: loopPipe?.to,
      title: 'the circuit is boiling faster than it can lose heat',
      detail: 'Longer pipes cool their contents and rain some of it out. Push the glass apart until the loop settles under the ceiling.',
      action: loopPipe ? `stretch ${vesselById(loopPipe.from).short} → ${vesselById(loopPipe.to).short}` : 'push the glass apart by hand'
    }
  }

  if (!run.collections.length && run.puddled > run.frames.reduce((sum, frame) => sum + mixTotal(frame.jarIn), 0)) {
    const worst = run.puddles.reduce((high, entry) => (entry.volume > high.volume ? entry : high), run.puddles[0])
    const pipe = run.pipes.find(candidate => candidate.id === worst.pipeId)
    if (pipe) {
      const vector = pullVector(world, pipe.from, pipe.to)
      if (Math.hypot(vector.dx, vector.dy) >= 14) {
        return {
          kind: 'pull', from: pipe.from, to: pipe.to, dx: vector.dx, dy: vector.dy,
          title: `${round1(run.puddled)} measures rained out inside the pipework`,
          detail: `${Math.round(pipe.distance)} units of pipe sheds ${round1(pipe.drop)}° — enough for the run to condense before it arrives. Pull the ${vesselById(pipe.to).short} closer, or fit the demister.`,
          action: `pull the ${vesselById(pipe.to).short} closer`
        }
      }
      return {
        kind: 'plate', plateId: 'demister', vesselId: pipe.from,
        title: `${round1(run.puddled)} measures rained out inside the pipework`,
        detail: 'The glass is already as tight as it draws. Fit the demister so whatever leaves is reheated enough to survive the crossing.',
        action: `fit the demister in ${vesselById(pipe.from).short}`
      }
    }
  }

  if (unmet.has('clean')) {
    const poison = run.collections.find(cut => cut.mix.heads >= 0.08)
    if (poison && JACKETS[world.beads.worm] < FRACTIONS[0].dew) {
      const station = JACKETS.findIndex(temp => temp > FRACTIONS[0].dew)
      return {
        kind: 'bead', vesselId: 'worm', station,
        title: `${round2(poison.mix.heads)} measures of heads reached the ledger`,
        detail: `Heads hold their dew at ${FRACTIONS[0].dew}°. A jacket of ${JACKETS[world.beads.worm]}° is cold enough to pull them back into liquid. Warm the worm past ${FRACTIONS[0].dew}° and they will leave as vapour instead.`,
        action: `warm the jacket to ${JACKETS[station]}°`
      }
    }
    if (poison) {
      return {
        kind: 'plate', plateId: 'char', vesselId: hostOf('char') === 'worm' ? 'column' : 'worm',
        title: 'heads are arriving by a route the jacket cannot refuse',
        detail: 'The char plate eats four fifths of the heads wherever it sits, at the cost of a tenth of the heart.',
        action: 'fit the char plate'
      }
    }
  }

  if (unmet.has('collect') && run.refused.length) {
    const best = run.refused.reduce((high, entry) => (entry.purity > high.purity ? entry : high), run.refused[0])
    const station = highestUnder(GATES, best.purity)
    return {
      kind: 'bead', vesselId: 'ledger', station,
      title: `the jar refused every arrival — the best was ${Math.round(best.purity * 100)}% heart`,
      detail: `Its gate stands at ${Math.round(GATES[world.beads.ledger] * 100)}%. Either lower what the jar will accept, or make the vapour worth accepting by cutting weight out of it upstream.`,
      action: `lower the gate to ${Math.round(GATES[station] * 100)}%`
    }
  }

  if (unmet.has('alive')) {
    const feintPipe = world.pipes.some(pipe => pipe.from === 'ledger')
    if (awake.has('retort') && !feintPipe) {
      return {
        kind: 'pipe', from: 'ledger', to: 'retort',
        title: `the run dies at tick ${run.endedAt} because nothing comes back`,
        detail: 'Every pipe and every cut loses matter. The retort is the only gain in the house — pipe the jar’s refusals into it, then carry its vapour back up the column.',
        action: 'run a pipe jar → retort'
      }
    }
    if (awake.has('retort') && !world.pipes.some(pipe => pipe.from === 'retort')) {
      return {
        kind: 'pipe', from: 'retort', to: 'column',
        title: 'the retort re-boils into a dead end',
        detail: 'Its vapour has nowhere to climb, so the circuit never closes. Carry it back into the column and the house will feed itself.',
        action: 'run a pipe retort → column'
      }
    }
  }

  if (unmet.has('aroma') && awake.has('vent')) {
    if (!world.pipes.some(pipe => pipe.to === 'vent')) {
      const source = plateAt(world, 'worm') === 'thief' ? 'worm' : 'retort'
      return {
        kind: 'pipe', from: source, to: 'vent', force: true,
        title: 'no vapour ever arrives at the vent',
        detail: `An aroma is published, not collected. Carry vapour from the ${vesselById(source).short} into the vent — the thief valve lets one vessel feed two directions at half measure each.`,
        action: `run a pipe ${vesselById(source).short} → vent`
      }
    }
    if (run.absorbed.length && world.beads.vent > 0) {
      const thickest = run.absorbed.reduce((high, entry) => (entry.volume > high.volume ? entry : high), run.absorbed[0])
      const station = highestUnder(SILLS, thickest.volume)
      return {
        kind: 'bead', vesselId: 'vent', station,
        title: `${round2(thickest.volume)} measures arrived and the brick drank them`,
        detail: `The sill stands at ${SILLS[world.beads.vent]} measures. Lower it, or feed the vent a thicker stream.`,
        action: `lower the sill to ${SILLS[station]}`
      }
    }
  }

  if (deep) {
    const bead = searchBead(world, awake)
    if (bead) {
      const vessel = vesselById(bead.vesselId)
      return {
        kind: 'bead', vesselId: bead.vesselId, station: bead.station,
        title: verdict.demands.find(demand => !demand.met)?.text
          ? `the run misses: ${verdict.demands.find(demand => !demand.met).text}`
          : 'the run misses its commission',
        detail: `One bead closes it. ${vessel.label} wants its ${vessel.rodLabel} on ${bead.station} — reading ${vessel.read(bead.station)} — instead of ${bead.station === world.beads[bead.vesselId] ? 'where it is' : world.beads[bead.vesselId]}.`,
        action: `slide ${vessel.short} ${bead.vesselId === 'worm' || bead.vesselId === 'retort' ? 'to' : 'to'} ${bead.station}`
      }
    }
    const plate = searchPlate(world, awake)
    if (plate) {
      return {
        kind: 'plate', plateId: plate.plateId, vesselId: plate.vesselId,
        title: verdict.demands.find(demand => !demand.met)?.text
          ? `no bead alone closes it: ${verdict.demands.find(demand => !demand.met).text}`
          : 'no bead alone closes this run',
        detail: `${PLATES[plate.plateId].reading}. Seated in ${vesselById(plate.vesselId).label} it changes the rule the run obeys, not merely its quantity.`,
        action: `fit the ${PLATES[plate.plateId].label} in ${vesselById(plate.vesselId).short}`
      }
    }
  }

  if (unmet.has('order')) {
    return {
      kind: 'order',
      title: 'a house that boils alone needs a standing order',
      detail: 'Say what the glass should favour once no hand is on the lever. The choice persists with the house and sets its own cadence.',
      action: 'bank the fire between runs'
    }
  }

  const failing = verdict.demands.find(demand => !demand.met)
  if (failing) {
    return {
      kind: 'wait',
      title: `the run misses: ${failing.text}`,
      detail: 'No single bead, plate or pipe closes this gap. Re-route the house, move the glass to re-time the run, or cut differently upstream.',
      action: 'no single move remains'
    }
  }

  return {
    kind: 'ready',
    title: 'the house agrees with the commission',
    detail: `${run.collections.length} cut${run.collections.length === 1 ? '' : 's'}, ${round1(run.banked.heart)} measures of heart, peak load ${round1(run.peakLoad)} against ${SCALD_LOAD}. Stoking will notch every rod the run crosses.`,
    action: 'the lever accepts this charge'
  }
}

/* ---------- vessel silhouettes ---------- */

const shapeFor = (kind, w, h) => {
  switch (kind) {
    case 'pot':
      return `M 20 ${h - 14} Q 6 ${h * 0.62} 26 ${h * 0.42} L 26 58 Q 26 34 ${w * 0.44} 30 L ${w - 36} 16 Q ${w - 10} 26 ${w - 16} 56 L ${w - 22} ${h * 0.44} Q ${w - 4} ${h * 0.64} ${w - 24} ${h - 14} Z`
    case 'column':
      return `M 16 ${h - 12} V 42 Q 16 20 42 16 H ${w - 42} Q ${w - 14} 20 ${w - 14} 44 V ${h - 12} Q ${w - 16} ${h - 4} ${w - 44} ${h - 4} H 44 Q 18 ${h - 4} 16 ${h - 12} Z`
    case 'worm':
      return `M 14 46 Q 14 20 44 18 H ${w - 38} Q ${w - 12} 22 ${w - 12} 48 V ${h - 46} Q ${w - 14} ${h - 12} ${w - 50} ${h - 10} H 46 Q 16 ${h - 14} 14 ${h - 48} Z`
    case 'jar':
      return `M ${w * 0.32} 14 H ${w * 0.68} V 36 Q ${w - 20} 46 ${w - 18} 78 V ${h - 30} Q ${w - 20} ${h - 10} ${w - 46} ${h - 10} H 46 Q 18 ${h - 10} 16 ${h - 32} V 76 Q 18 46 ${w * 0.32} 36 Z`
    case 'retort':
      return `M 22 ${h - 20} Q 10 ${h * 0.54} 36 ${h * 0.34} Q 54 16 ${w * 0.5} 14 Q ${w - 58} 16 ${w - 34} ${h * 0.36} L ${w - 10} ${h * 0.5} L ${w - 14} ${h * 0.6} L ${w - 38} ${h * 0.5} Q ${w - 28} ${h - 22} ${w - 58} ${h - 14} H 50 Q 28 ${h - 14} 22 ${h - 20} Z`
    default:
      return `M 26 ${h - 16} L 48 ${h * 0.54} Q 54 ${h * 0.3} ${w * 0.36} 24 L ${w - 24} 12 L ${w - 14} ${h * 0.36} L ${w * 0.48} ${h * 0.46} Q ${w * 0.42} ${h * 0.68} ${w - 36} ${h - 16} Z`
  }
}

const VesselInterior = ({ kind, width, height, station, active, cellar }) => {
  const midX = width / 2
  const midY = height / 2
  if (kind === 'pot') {
    return (
      <g className={`al-interior is-pot ${active ? 'is-active' : ''}`} aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <path key={index} d={`M ${36 + index * 7} ${height - 40} Q ${midX - 20 + index * 16} ${height - 92 - index * 9} ${width - 46 - index * 6} ${height - 44}`} />
        ))}
        <g className="al-flame" style={{ '--flame': station / 6 }}>
          {Array.from({ length: 5 }, (_, index) => (
            <path key={index} d={`M ${midX - 44 + index * 22} ${height - 12} q 7 ${-14 - station * 3} 0 ${-24 - station * 5} q -7 10 0 ${24 + station * 5} Z`} />
          ))}
        </g>
      </g>
    )
  }
  if (kind === 'column') {
    return (
      <g className={`al-interior is-column ${active ? 'is-active' : ''}`} aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <path
            key={index}
            className={index >= 6 - station ? 'is-wet' : ''}
            d={`M 52 ${44 + index * ((height - 76) / 6)} H ${width - 34}`}
          />
        ))}
        <path className="al-column-riser" d={`M ${width * 0.62} ${height - 22} V 40`} />
      </g>
    )
  }
  if (kind === 'worm') {
    return (
      <g className={`al-interior is-worm ${active ? 'is-active' : ''}`} aria-hidden="true">
        <path d={Array.from({ length: 5 }, (_, index) => {
          const y = 56 + index * ((height - 96) / 4)
          return `${index === 0 ? 'M' : 'L'} ${index % 2 ? width - 40 : 54} ${y} L ${index % 2 ? 54 : width - 40} ${y + 12}`
        }).join(' ')} />
        <circle className="al-worm-bulb" cx={width - 44} cy={height - 34} r={6 + (6 - station)} />
      </g>
    )
  }
  if (kind === 'jar') {
    const fill = clamp(cellar / 48, 0, 1)
    const top = height - 26 - (height - 110) * fill
    return (
      <g className={`al-interior is-jar ${active ? 'is-active' : ''}`} aria-hidden="true">
        <rect className="al-jar-fill" x="26" y={top} width={width - 52} height={Math.max(0, height - 28 - top)} rx="6" />
        <path className="al-jar-meniscus" d={`M 26 ${top} Q ${midX} ${top - 7} ${width - 26} ${top}`} />
        {Array.from({ length: 5 }, (_, index) => (
          <path key={index} className="al-jar-graduation" d={`M ${width - 44} ${height - 44 - index * ((height - 120) / 4)} h 16`} />
        ))}
      </g>
    )
  }
  if (kind === 'retort') {
    return (
      <g className={`al-interior is-retort ${active ? 'is-active' : ''}`} aria-hidden="true">
        <circle cx={midX} cy={midY + 6} r={Math.min(width, height) * 0.19} />
        <circle cx={midX} cy={midY + 6} r={Math.min(width, height) * 0.29} />
        {Array.from({ length: 6 }, (_, index) => {
          const angle = index * Math.PI / 3 + 0.3
          return (
            <line
              key={index}
              x1={midX + Math.cos(angle) * 22}
              y1={midY + 6 + Math.sin(angle) * 22}
              x2={midX + Math.cos(angle) * (38 + station * 3)}
              y2={midY + 6 + Math.sin(angle) * (38 + station * 3)}
            />
          )
        })}
      </g>
    )
  }
  return (
    <g className={`al-interior is-vent ${active ? 'is-active' : ''}`} aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <path key={index} d={`M ${44 + index * 5} ${height - 26} Q ${midX + index * 12} ${midY - index * 10} ${width - 26 - index * 9} ${34 + index * 12}`} />
      ))}
    </g>
  )
}

/* ---------- chart recorder ---------- */

/**
 * A paper chart under the still: arrivals at the jar stack upward by fraction,
 * everything the house lost stacks downward, and the heart purity rides over the
 * top against the jar's gate. Drag anywhere on it to scrub the run.
 */
const CutRecorder = ({ run, playTick, gate, commission, onScrub, reducedMotion }) => {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const [size, setSize] = useState({ width: 760, height: 150 })

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect
      if (rect?.width) setSize({ width: Math.round(rect.width), height: Math.round(rect.height) })
    })
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const { width, height } = size
    canvas.width = Math.max(1, Math.round(width * dpr))
    canvas.height = Math.max(1, Math.round(height * dpr))
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const padLeft = 46
    const padRight = 14
    const padTop = 18
    const padBottom = 20
    const plotWidth = Math.max(10, width - padLeft - padRight)
    const plotHeight = Math.max(20, height - padTop - padBottom)
    const axisY = padTop + plotHeight * 0.64
    const upSpan = plotHeight * 0.64
    const downSpan = plotHeight * 0.36
    const frames = run?.frames || []
    const ceiling = Math.max(
      2.4,
      ...frames.map(frame => mixTotal(frame.jarIn)),
      ...frames.map(frame => frame.puddled + frame.vented + frame.refluxed)
    )
    const xFor = (tick) => padLeft + (tick / MAX_TICKS) * plotWidth
    const upFor = (value) => axisY - clamp(value / ceiling, 0, 1) * (upSpan - 22)
    const downFor = (value) => axisY + clamp(value / ceiling, 0, 1) * (downSpan - 4)
    const step = plotWidth / MAX_TICKS

    ctx.strokeStyle = 'rgba(214, 206, 184, .07)'
    ctx.lineWidth = 1
    for (let tick = 0; tick <= MAX_TICKS; tick += 4) {
      ctx.beginPath()
      ctx.moveTo(Math.round(xFor(tick)) + 0.5, padTop)
      ctx.lineTo(Math.round(xFor(tick)) + 0.5, padTop + plotHeight)
      ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(214, 206, 184, .3)'
    ctx.beginPath()
    ctx.moveTo(padLeft, Math.round(axisY) + 0.5)
    ctx.lineTo(padLeft + plotWidth, Math.round(axisY) + 0.5)
    ctx.stroke()

    ctx.font = '8px "Courier New", monospace'
    ctx.fillStyle = 'rgba(214, 206, 184, .4)'
    ctx.textAlign = 'right'
    ctx.fillText('jar', padLeft - 7, axisY - 5)
    ctx.fillText('lost', padLeft - 7, axisY + 12)
    ctx.fillText('pure', padLeft - 7, padTop + 8)
    ctx.textAlign = 'left'

    if (!frames.length) {
      ctx.fillStyle = 'rgba(214, 206, 184, .3)'
      ctx.font = '10px "Courier New", monospace'
      ctx.fillText('no charge on the paper yet — pull the lever and the house will draw itself here', padLeft + 8, axisY - 24)
    } else {
      frames.forEach(frame => {
        const x = xFor(frame.tick)
        let base = axisY
        FRACTIONS.forEach(fraction => {
          const volume = frame.jarIn[fraction.id]
          if (volume <= 0) return
          const h = base - upFor(volume)
          ctx.fillStyle = fraction.color
          ctx.globalAlpha = 0.82
          ctx.fillRect(x, base - h, Math.max(1.6, step - 1.2), h)
          ctx.globalAlpha = 1
          base -= h
        })

        const losses = [
          { value: frame.puddled, color: 'rgba(111, 158, 210, .5)' },
          { value: frame.vented, color: 'rgba(232, 210, 106, .34)' },
          { value: frame.refluxed, color: 'rgba(196, 104, 60, .42)' }
        ]
        let down = axisY
        losses.forEach(loss => {
          if (loss.value <= 0) return
          const h = downFor(loss.value) - axisY
          ctx.fillStyle = loss.color
          ctx.fillRect(x, down, Math.max(1.6, step - 1.2), h)
          down += h
        })
      })

      ctx.setLineDash([3, 4])
      ctx.strokeStyle = 'rgba(143, 217, 196, .5)'
      ctx.lineWidth = 1
      const gateY = padTop + 4 + (1 - gate) * 26
      ctx.beginPath()
      ctx.moveTo(padLeft, Math.round(gateY) + 0.5)
      ctx.lineTo(padLeft + plotWidth, Math.round(gateY) + 0.5)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.strokeStyle = '#8fd9c4'
      ctx.lineWidth = 1.6
      ctx.beginPath()
      let drawing = false
      frames.forEach(frame => {
        if (mixTotal(frame.jarIn) <= 0) {
          drawing = false
          return
        }
        const x = xFor(frame.tick) + step / 2
        const y = padTop + 4 + (1 - frame.purity) * 26
        if (!drawing) {
          ctx.moveTo(x, y)
          drawing = true
        } else ctx.lineTo(x, y)
      })
      ctx.stroke()

      run.collections.forEach(cut => {
        const x = xFor(cut.tick) + step / 2
        ctx.fillStyle = '#e8d26a'
        ctx.beginPath()
        ctx.moveTo(x, padTop + 36)
        ctx.lineTo(x - 3.4, padTop + 43)
        ctx.lineTo(x + 3.4, padTop + 43)
        ctx.closePath()
        ctx.fill()
      })

      run.aromas.forEach(aroma => {
        const x = xFor(aroma.tick) + step / 2
        ctx.strokeStyle = 'rgba(221, 127, 156, .9)'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.arc(x, padTop + 50, 4.2, 0, Math.PI * 2)
        ctx.stroke()
      })

      run.scalds.forEach(scald => {
        const x = xFor(scald.tick) + step / 2
        ctx.strokeStyle = '#ff715b'
        ctx.lineWidth = 2.4
        ctx.beginPath()
        ctx.moveTo(x - 7, padTop)
        ctx.lineTo(x + 7, padTop + plotHeight)
        ctx.moveTo(x + 7, padTop)
        ctx.lineTo(x - 7, padTop + plotHeight)
        ctx.stroke()
      })

      const head = frames[clamp(playTick, 0, frames.length - 1)]
      const headX = xFor(head.tick) + step / 2
      ctx.strokeStyle = 'rgba(243, 238, 224, .92)'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(headX, padTop - 7)
      ctx.lineTo(headX, padTop + plotHeight + 5)
      ctx.stroke()
      ctx.fillStyle = 'rgba(243, 238, 224, .95)'
      ctx.beginPath()
      ctx.moveTo(headX - 4, padTop - 7)
      ctx.lineTo(headX + 4, padTop - 7)
      ctx.lineTo(headX, padTop - 2)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = 'rgba(214, 206, 184, .62)'
      ctx.font = '8px "Courier New", monospace'
      ctx.fillText(
        `t${String(head.tick).padStart(2, '0')}  jar ${round2(mixTotal(head.jarIn))}  heart ${Math.round(head.purity * 100)}%  live ${head.live}  load ${round1(head.load)}`,
        clamp(headX + 6, padLeft, padLeft + plotWidth - 212),
        padTop + plotHeight + 14
      )
    }

    ctx.fillStyle = 'rgba(214, 206, 184, .34)'
    ctx.font = '8px "Courier New", monospace'
    ctx.fillText(commission ? commission.label.toUpperCase() : 'CHART', padLeft + 2, padTop - 7)
    ctx.textAlign = 'right'
    ctx.fillText(`${MAX_TICKS} TICK PAPER`, padLeft + plotWidth, padTop - 7)
    ctx.textAlign = 'left'
  }, [commission, gate, playTick, reducedMotion, run, size])

  const handleScrub = useCallback((event) => {
    const canvas = canvasRef.current
    if (!canvas || !run?.frames?.length) return
    const rect = canvas.getBoundingClientRect()
    const padLeft = 46
    const plotWidth = Math.max(10, rect.width - padLeft - 14)
    const ratio = clamp((event.clientX - rect.left - padLeft) / plotWidth, 0, 1)
    const tick = Math.round(ratio * MAX_TICKS)
    let closest = 0
    run.frames.forEach((frame, index) => {
      if (Math.abs(frame.tick - tick) < Math.abs(run.frames[closest].tick - tick)) closest = index
    })
    onScrub(closest)
  }, [onScrub, run])

  return (
    <div className="al-paper" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
        role="img"
        aria-label={run?.frames?.length
          ? `Chart recorder: ${run.collections.length} cuts collected, ${round1(run.banked.heart)} measures of heart, peak load ${round1(run.peakLoad)}`
          : 'Chart recorder, blank until a charge is stoked'}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId)
          handleScrub(event)
        }}
        onPointerMove={(event) => {
          if (event.buttons) handleScrub(event)
        }}
      />
    </div>
  )
}

const AlembicLedger = ({ category, experiment }) => {
  const [world, setWorld] = useState(loadWorld)
  const [selectedId, setSelectedId] = useState('pot')
  const [selectedPipeId, setSelectedPipeId] = useState(null)
  const [armedPlateId, setArmedPlateId] = useState(null)
  const [armedFromId, setArmedFromId] = useState(null)
  const [drag, setDrag] = useState(null)
  const [run, setRun] = useState(null)
  const [playTick, setPlayTick] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [mutation, setMutation] = useState(null)
  const [savedAt, setSavedAt] = useState(() => world.lastSaved)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [portrait, setPortrait] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const [message, setMessage] = useState(() => (world.unlocked
    ? `commission ${Math.min(world.stage + 1, COMMISSIONS.length)} resumed // ${world.cellar.cuts} cut${world.cellar.cuts === 1 ? '' : 's'} already banked in the cellar`
    : 'six pieces of glass, four loose plates, and a wash that has never been asked to separate'))

  const surfaceRef = useRef(null)
  const svgRef = useRef(null)
  const worldRef = useRef(world)
  const runRef = useRef(null)
  const dragRef = useRef(null)
  const frameRef = useRef(null)
  const playTickRef = useRef(0)
  const clockRef = useRef(0)
  const stampRef = useRef(0)
  const mutationTimerRef = useRef(null)
  const saveTimerRef = useRef(null)
  const autoTimerRef = useRef(null)
  const audioRef = useRef(null)
  const soundRef = useRef(false)
  const soundedTickRef = useRef(-1)
  const suppressClickRef = useRef(false)

  useEffect(() => { worldRef.current = world }, [world])
  useEffect(() => { runRef.current = run }, [run])
  useEffect(() => { soundRef.current = soundOn }, [soundOn])
  useEffect(() => { playTickRef.current = playTick }, [playTick])

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const narrow = window.matchMedia('(max-width: 820px)')
    const updateMotion = () => setReducedMotion(motion.matches)
    const updateWidth = () => setPortrait(narrow.matches)
    updateMotion()
    updateWidth()
    motion.addEventListener?.('change', updateMotion)
    narrow.addEventListener?.('change', updateWidth)
    return () => {
      motion.removeEventListener?.('change', updateMotion)
      narrow.removeEventListener?.('change', updateWidth)
    }
  }, [])

  useEffect(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      try {
        const timestamp = Date.now()
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...world, lastSaved: timestamp }))
        setSavedAt(timestamp)
      } catch {
        // The house still distils when local memory refuses to keep its cellar.
      }
    }, 190)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [world])

  useEffect(() => () => {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
    if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current)
    audioRef.current?.close?.()
  }, [])

  const preview = useMemo(() => simulate(world), [world])
  const verdict = useMemo(() => judge(preview, world), [preview, world])
  const guidance = useMemo(
    () => diagnose(world, preview, verdict, !drag && !playing),
    [drag, playing, preview, verdict, world]
  )
  const commission = verdict.commission
  const awake = useMemo(() => awakeIds(world), [world])
  const pipes = preview.pipes
  const editable = world.unlocked && world.status === 'composing' && !playing && !mutation
  const plates = useMemo(() => unlockedPlates(world), [world])
  const selectedVessel = vesselById(selectedId)
  const selectedPlate = plateAt(world, selectedId)
  const selectedPipe = world.pipes.find(pipe => pipe.id === selectedPipeId) || null
  const order = world.order ? ORDERS[world.order] : null
  const liveFrame = run?.frames?.[clamp(playTick, 0, (run.frames.length || 1) - 1)] || null

  const toScreen = useCallback((x, y) => (portrait
    ? { x: y * PORTRAIT_SX, y: x * PORTRAIT_SY }
    : { x, y }), [portrait])

  const toWorld = useCallback((x, y) => (portrait
    ? { x: y / PORTRAIT_SY, y: x / PORTRAIT_SX }
    : { x, y }), [portrait])

  const boxes = useMemo(() => Object.fromEntries(VESSELS.map(vessel => {
    const placement = world.vessels[vessel.id]
    const origin = toScreen(placement.x, placement.y)
    return [vessel.id, portrait
      ? { ...origin, width: vessel.height * PORTRAIT_SX, height: vessel.width * PORTRAIT_SY }
      : { ...origin, width: vessel.width, height: vessel.height }]
  })), [portrait, toScreen, world.vessels])

  const centreScreen = useCallback((id) => {
    const box = boxes[id]
    return box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : { x: 0, y: 0 }
  }, [boxes])

  const nozzleOf = useCallback((id) => {
    const box = boxes[id]
    return box ? { x: box.x + box.width - 14, y: box.y + box.height * 0.34 } : { x: 0, y: 0 }
  }, [boxes])

  const railFor = useCallback((id) => {
    const box = boxes[id]
    if (!box) return { x: 0, top: 0, bottom: 0 }
    return { x: box.x + 28, top: box.y + 44, bottom: box.y + box.height - 30 }
  }, [boxes])

  const svgPointFromClient = useCallback((clientX, clientY) => {
    const svg = svgRef.current
    if (!svg) return null
    const matrix = svg.getScreenCTM()
    if (!matrix) return null
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    return point.matrixTransform(matrix.inverse())
  }, [])

  const worldPointFromClient = useCallback((clientX, clientY) => {
    const point = svgPointFromClient(clientX, clientY)
    return point ? toWorld(point.x, point.y) : null
  }, [svgPointFromClient, toWorld])

  const vesselAtClient = useCallback((clientX, clientY) => {
    const id = document.elementFromPoint(clientX, clientY)?.closest?.('[data-vessel]')?.dataset.vessel || null
    if (!id) return null
    return awakeIds(worldRef.current).has(id) ? id : null
  }, [])

  const tone = useCallback((frequency, kind = 'sine', length = 0.26, level = 0.05) => {
    if (!soundRef.current) return
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const context = audioRef.current || new AudioContext()
      audioRef.current = context
      context.resume?.()
      const start = context.currentTime + 0.01
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = kind
      oscillator.frequency.setValueAtTime(frequency, start)
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, start + length)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(level, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + length + 0.02)
    } catch {
      // Sound is a voluntary echo of a house that is already legible on paper.
    }
  }, [])

  const wake = useCallback(() => {
    setWorld(current => ({
      ...current,
      unlocked: true,
      log: [...current.log, { id: `wake-${Date.now()}`, stage: current.stage, text: 'a hand reached the lever; cold glass became a decision about what to keep' }].slice(-8)
    }))
    setMessage('pipe the pot into the column, the column into the worm, the worm into the jar — then slide the jacket until heads are allowed to leave')
    requestAnimationFrame(() => surfaceRef.current?.focus())
  }, [])

  const setBead = useCallback((vesselId, station, quiet = false) => {
    if (!editable) return
    const next = clamp(station, 0, STATIONS - 1)
    setWorld(previous => ({ ...previous, beads: { ...previous.beads, [vesselId]: next } }))
    if (!quiet) {
      const vessel = vesselById(vesselId)
      setMessage(`${vessel.label} · ${vessel.rodLabel} ${next} // reads ${vessel.read(next)}`)
      tone(190 + next * 26, 'triangle', 0.14, 0.035)
    }
  }, [editable, tone])

  const moveVessel = useCallback((vesselId, x, y) => {
    if (!editable) return
    const vessel = vesselById(vesselId)
    setWorld(previous => ({
      ...previous,
      vessels: {
        ...previous.vessels,
        [vesselId]: {
          ...previous.vessels[vesselId],
          x: clamp(Math.round(x), 18, VIEWBOX.width - vessel.width - 18),
          y: clamp(Math.round(y), 22, VIEWBOX.height - vessel.height - 22)
        }
      }
    }))
  }, [editable])

  const nudgeVessel = useCallback((dx, dy, id = selectedId) => {
    const placement = worldRef.current.vessels[id]
    moveVessel(id, placement.x + dx, placement.y + dy)
  }, [moveVessel, selectedId])

  const fitPlate = useCallback((plateId, vesselId) => {
    const plate = PLATES[plateId]
    const current = worldRef.current
    if (!plate || !vesselById(vesselId) || !editable) return
    if (plate.unlockedAt > current.stage && current.status !== 'mastered') return
    setWorld(previous => withPlate(previous, plateId, vesselId))
    setArmedPlateId(null)
    setSelectedId(vesselId)
    setMessage(`${plate.label} fitted in ${vesselById(vesselId).label} // ${plate.reading}`)
    tone(330, 'square', 0.12, 0.03)
  }, [editable, tone])

  const liftPlate = useCallback((vesselId) => {
    const plateId = plateAt(worldRef.current, vesselId)
    if (!editable || !plateId) return
    setWorld(previous => {
      const next = { ...previous.plates }
      delete next[plateId]
      return { ...previous, plates: next }
    })
    setMessage(`${PLATES[plateId].label} returned to the rack // ${vesselById(vesselId).short} obeys its plain rule again`)
  }, [editable])

  const runPipe = useCallback((from, to, force = false) => {
    const current = worldRef.current
    if (!editable || from === to || !vesselById(from) || !vesselById(to)) return false
    if (!awakeIds(current).has(to)) {
      setMessage(`${vesselById(to).short} has not been commissioned yet`)
      return false
    }
    if (current.pipes.some(pipe => pipe.from === from && pipe.to === to)) {
      setMessage(`${vesselById(from).short} already feeds ${vesselById(to).short}`)
      setArmedFromId(null)
      return true
    }
    const spent = current.pipes.filter(pipe => pipe.from === from).length >= outletLimit(current, from)
    if (spent && !force) {
      setSelectedPipeId(current.pipes.find(pipe => pipe.from === from)?.id || null)
      setMessage(`${vesselById(from).short} has one outlet and it is already plumbed // cut that pipe, or fit the thief valve to hold two`)
      return false
    }
    setWorld(previous => withPipe(previous, from, to))
    setArmedFromId(null)
    setSelectedPipeId(pipeIdFor(from, to))
    const probe = pipesFor(withPipe(current, from, to)).find(pipe => pipe.id === pipeIdFor(from, to))
    setMessage(`${vesselById(from).short} → ${vesselById(to).short} plumbed // ${probe?.ticks || 1} tick${(probe?.ticks || 1) === 1 ? '' : 's'} of travel, ${round1(probe?.drop || 0)}° shed on the way`)
    tone(248, 'sine', 0.18, 0.035)
    return true
  }, [editable, tone])

  const cutPipe = useCallback((pipeId) => {
    if (!editable) return
    const pipe = worldRef.current.pipes.find(candidate => candidate.id === pipeId)
    if (!pipe) return
    setWorld(previous => ({ ...previous, pipes: previous.pipes.filter(candidate => candidate.id !== pipeId) }))
    setSelectedPipeId(null)
    setMessage(`${vesselById(pipe.from).short} → ${vesselById(pipe.to).short} cut // ${pipe.memory ? 'the solder scar stays in the copper' : 'untravelled pipe came away clean'}`)
  }, [editable])

  const chooseOrder = useCallback((orderId) => {
    const current = worldRef.current
    if (!ORDERS[orderId] || current.stage < 2) return
    setWorld(previous => ({ ...previous, order: orderId }))
    setMessage(`${ORDERS[orderId].label} // ${ORDERS[orderId].note}`)
  }, [])

  const beginDrag = useCallback((event, next) => {
    if (!editable) return
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = next
    setDrag(next)
  }, [editable])

  useEffect(() => {
    if (!drag) return undefined

    const handleMove = (event) => {
      const current = dragRef.current
      if (!current) return
      const moved = current.moved
        || Math.hypot(event.clientX - current.clientX0, event.clientY - current.clientY0) > DRAG_THRESHOLD

      if (current.kind === 'bead') {
        const point = svgPointFromClient(event.clientX, event.clientY)
        if (!point) return
        const rail = railFor(current.vesselId)
        const span = rail.bottom - rail.top || 1
        const raw = (rail.bottom - point.y) / span * (STATIONS - 1)
        const notches = worldRef.current.vessels[current.vesselId].notches
        const detent = notches.find(station => Math.abs(raw - station) < 0.7)
        const station = clamp(Math.round(detent ?? raw), 0, STATIONS - 1)
        if (station !== worldRef.current.beads[current.vesselId]) setBead(current.vesselId, station, true)
        dragRef.current = { ...current, moved }
        setDrag(dragRef.current)
        return
      }

      if (current.kind === 'vessel') {
        const point = worldPointFromClient(event.clientX, event.clientY)
        if (!point) return
        moveVessel(current.vesselId, point.x - current.grabX, point.y - current.grabY)
        dragRef.current = { ...current, moved }
        setDrag(dragRef.current)
        return
      }

      if (current.kind === 'pipe') {
        const point = svgPointFromClient(event.clientX, event.clientY)
        if (!point) return
        dragRef.current = {
          ...current,
          moved,
          x: point.x,
          y: point.y,
          targetId: moved ? vesselAtClient(event.clientX, event.clientY) : null
        }
        setDrag(dragRef.current)
        return
      }

      dragRef.current = {
        ...current,
        moved,
        clientX: event.clientX,
        clientY: event.clientY,
        targetId: moved ? vesselAtClient(event.clientX, event.clientY) : null
      }
      setDrag(dragRef.current)
    }

    const handleUp = (event) => {
      const current = dragRef.current
      if (!current) return

      if (current.kind === 'bead' && current.moved) {
        const vessel = vesselById(current.vesselId)
        const station = worldRef.current.beads[current.vesselId]
        setMessage(`${vessel.label} · ${vessel.rodLabel} ${station} // reads ${vessel.read(station)}${notchedAt(worldRef.current, current.vesselId) ? ' // the bead dropped into an earned notch and will hold' : ''}`)
      }
      if (current.kind === 'vessel' && current.moved) {
        const next = simulate(worldRef.current)
        setMessage(`${vesselById(current.vesselId).label} moved // ${next.pipes.length} pipe${next.pipes.length === 1 ? '' : 's'} re-measured, ${round1(next.puddled)} measures now raining out in transit`)
      }
      if (current.kind === 'pipe') {
        const targetId = vesselAtClient(event.clientX, event.clientY)
        if (current.moved && targetId && targetId !== current.fromId) runPipe(current.fromId, targetId)
        else if (current.moved) setMessage('the pipe found no vessel // tap one nozzle then another to plumb by touch')
        else {
          setArmedFromId(previous => (previous === current.fromId ? null : current.fromId))
          setMessage(`${vesselById(current.fromId).short} is holding an open pipe // tap another vessel to land it`)
        }
      }
      if (current.kind === 'plate') {
        const targetId = vesselAtClient(event.clientX, event.clientY)
        if (current.moved && targetId) fitPlate(current.plateId, targetId)
        else if (current.moved) setMessage('the plate found no seat // tap a plate then a vessel if the house is crowded')
        else {
          setArmedPlateId(previous => (previous === current.plateId ? null : current.plateId))
          setMessage(`${PLATES[current.plateId].label} armed // ${PLATES[current.plateId].reading}`)
        }
      }

      suppressClickRef.current = true
      window.setTimeout(() => { suppressClickRef.current = false }, 0)
      dragRef.current = null
      setDrag(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [drag, fitPlate, moveVessel, railFor, runPipe, setBead, svgPointFromClient, vesselAtClient, worldPointFromClient])

  const activateVessel = useCallback((vesselId) => {
    if (suppressClickRef.current) return
    if (armedPlateId) {
      fitPlate(armedPlateId, vesselId)
      return
    }
    if (armedFromId && armedFromId !== vesselId) {
      runPipe(armedFromId, vesselId)
      return
    }
    setSelectedId(vesselId)
    const vessel = vesselById(vesselId)
    setMessage(`${vessel.label} selected // ${vessel.note}`)
  }, [armedFromId, armedPlateId, fitPlate, runPipe])

  const resolveRun = useCallback((finished) => {
    const current = worldRef.current
    if (current.status !== 'composing') return
    const tested = judge(finished, current)
    const banked = finished.banked

    if (tested.ready) {
      const mastered = current.stage >= COMMISSIONS.length - 1
      const record = {
        id: `charge-${Date.now()}`,
        stage: current.stage,
        cuts: finished.collections.length,
        heart: round1(banked.heart),
        peak: round1(finished.peakLoad),
        endedAt: finished.endedAt,
        bornAt: Date.now()
      }
      setWorld(previous => {
        const touched = new Set(finished.reached)
        return {
          ...previous,
          stage: mastered ? previous.stage : previous.stage + 1,
          status: mastered ? 'mastered' : 'composing',
          vessels: Object.fromEntries(Object.entries(previous.vessels).map(([id, vessel]) => [id, touched.has(id)
            ? {
                ...vessel,
                runs: vessel.runs + 1,
                notches: [...new Set([...vessel.notches, previous.beads[id]])].slice(-4)
              }
            : vessel])),
          pipes: previous.pipes.map(pipe => (finished.usedPipes.has(pipe.id)
            ? { ...pipe, crossings: pipe.crossings + 1, memory: clamp(pipe.memory + 1, 0, 3) }
            : pipe)),
          cellar: {
            heads: round2(previous.cellar.heads + banked.heads),
            heart: round2(previous.cellar.heart + banked.heart),
            tails: round2(previous.cellar.tails + banked.tails),
            cuts: previous.cellar.cuts + finished.collections.length,
            aromas: previous.cellar.aromas + finished.aromas.length
          },
          runbook: [...previous.runbook, record].slice(-6),
          log: [...previous.log, { id: record.id, stage: previous.stage + 1, text: tested.commission.success }].slice(-8)
        }
      })
      setMutation({ id: record.id, vessels: [...finished.reached], mastered })
      setMessage(`${tested.commission.success} // ${mastered ? 'the house now stokes itself' : 'another piece of glass is being uncrated'}`)
      if (!mastered) {
        const next = VESSELS.find(vessel => vessel.unlockedAt === current.stage + 1)
        if (next) setSelectedId(next.id)
      }
      if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
      mutationTimerRef.current = window.setTimeout(() => {
        mutationTimerRef.current = null
        setMutation(null)
      }, reducedMotion ? 160 : 2000)
    } else {
      const ruins = current.ruins + 1
      const condemned = ruins >= MAX_RUINS
      const poisoned = finished.collections.some(cut => cut.mix.heads >= 0.08)
      const scarId = finished.scalds[0]?.vesselId
        || (poisoned ? 'ledger' : null)
        || finished.puddles[0]?.pipeId?.split('=>')?.[1]
        || 'pot'
      const failing = tested.demands.find(demand => !demand.met)
      setWorld(previous => ({
        ...previous,
        ruins,
        status: condemned ? 'condemned' : 'composing',
        vessels: Object.fromEntries(Object.entries(previous.vessels).map(([id, vessel]) => [id, {
          ...vessel,
          scars: vessel.scars + (id === scarId ? 1 : 0)
        }])),
        beads: Object.fromEntries(Object.entries(previous.beads).map(([id, station]) => [id,
          previous.vessels[id].notches.includes(station)
            ? station
            : clamp(station + Math.sign(3 - station), 0, STATIONS - 1)
        ])),
        cellar: {
          ...previous.cellar,
          heads: round2(previous.cellar.heads + banked.heads),
          heart: round2(previous.cellar.heart + banked.heart),
          tails: round2(previous.cellar.tails + banked.tails),
          cuts: previous.cellar.cuts + finished.collections.length
        },
        log: [...previous.log, {
          id: `ruin-${Date.now()}`,
          stage: previous.stage,
          text: finished.scalds.length
            ? `${vesselById(finished.scalds[0].vesselId)?.short || 'the house'} took ${round1(finished.scalds[0].volume)} measures at once and scalded`
            : `the charge failed: ${failing?.text || 'the commission was not met'}`
        }].slice(-8)
      }))
      setMessage(condemned
        ? 'four ruined charges soaked into the brick // the house can no longer tell a cut from an accident'
        : `charge ruined // ${failing?.text || 'the commission was not met'} // every bead standing outside an earned notch drifted toward the middle`)
      tone(96, 'sawtooth', 0.4, 0.045)
    }
  }, [reducedMotion, tone])

  const stoke = useCallback((auto = false) => {
    const current = worldRef.current
    if (!current.unlocked) return
    if (!auto && (current.status !== 'composing' || mutation || playing)) return
    const next = simulate(current)
    if (!auto) {
      setWorld(previous => ({ ...previous, history: [...previous.history, snapshotWorld(previous)].slice(-8) }))
    }
    soundedTickRef.current = -1
    const payload = { ...next, id: Date.now(), auto, judged: auto }
    runRef.current = payload
    setRun(payload)
    setPlayTick(0)
    if (reducedMotion) {
      setPlayTick(Math.max(0, next.frames.length - 1))
      setPlaying(false)
      if (!auto) resolveRun(next)
      return
    }
    clockRef.current = 0
    stampRef.current = 0
    setPlaying(true)
    if (!auto) {
      const tested = judge(next, current)
      setMessage(tested.ready
        ? 'the charge is boiling // the paper will record exactly what the glass decided to keep'
        : 'an unresolved charge is boiling // the first contradiction will soak into the brick as a scar')
      tone(tested.ready ? 174.61 : 138.59, 'sine', 0.5, 0.04)
    }
  }, [mutation, playing, reducedMotion, resolveRun, tone])

  useEffect(() => {
    if (!playing || !run?.frames?.length) return undefined
    const step = (now) => {
      if (!stampRef.current) stampRef.current = now
      clockRef.current += now - stampRef.current
      stampRef.current = now
      const rate = run.auto ? TICK_MS * 1.3 : TICK_MS
      if (clockRef.current >= rate) {
        clockRef.current -= rate
        const next = playTickRef.current + 1
        if (next >= run.frames.length) {
          playTickRef.current = run.frames.length - 1
          setPlayTick(run.frames.length - 1)
          setPlaying(false)
          if (!runRef.current?.judged) {
            runRef.current = { ...runRef.current, judged: true }
            setRun(current => (current ? { ...current, judged: true } : current))
            resolveRun(run)
          }
          return
        }
        playTickRef.current = next
        setPlayTick(next)
      }
      frameRef.current = window.requestAnimationFrame(step)
    }
    frameRef.current = window.requestAnimationFrame(step)
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
      stampRef.current = 0
    }
  }, [playing, resolveRun, run])

  useEffect(() => {
    if (!playing || !liveFrame || !soundOn) return
    if (soundedTickRef.current === liveFrame.tick) return
    soundedTickRef.current = liveFrame.tick
    if (liveFrame.collected > 0) tone(392 + liveFrame.purity * 180, 'sine', 0.2, 0.045)
    else if (liveFrame.aromas > 0) tone(523.25, 'triangle', 0.3, 0.04)
    else if (liveFrame.scald) tone(84, 'sawtooth', 0.5, 0.05)
  }, [liveFrame, playing, soundOn, tone])

  useEffect(() => {
    if (world.status !== 'mastered' || reducedMotion || playing) return undefined
    autoTimerRef.current = window.setTimeout(() => {
      autoTimerRef.current = null
      stoke(true)
    }, order?.cadence || 6000)
    return () => {
      if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
    }
  }, [order, playing, reducedMotion, stoke, world.status])

  const applyGuidance = useCallback(() => {
    if (!editable) return
    if (guidance.kind === 'bead') {
      setSelectedId(guidance.vesselId)
      setBead(guidance.vesselId, guidance.station)
      return
    }
    if (guidance.kind === 'plate') {
      fitPlate(guidance.plateId, guidance.vesselId)
      return
    }
    if (guidance.kind === 'pipe') {
      runPipe(guidance.from, guidance.to, guidance.force)
      return
    }
    if (guidance.kind === 'pull') {
      nudgeVessel(guidance.dx, guidance.dy, guidance.to)
      setSelectedId(guidance.to)
      setMessage(`${vesselById(guidance.to).label} pulled closer // the pipe sheds less heat and keeps more of the run`)
      return
    }
    if (guidance.kind === 'stretch' && guidance.to) {
      const vector = pullVector(worldRef.current, guidance.from, guidance.to, 0)
      nudgeVessel(-Math.round((vector.dx || 0) * 0.35) || 46, -Math.round((vector.dy || 0) * 0.35) || 46, guidance.to)
      setSelectedId(guidance.to)
      setMessage(`${vesselById(guidance.to).label} pushed away // the circuit now sheds more heat on every lap`)
      return
    }
    if (guidance.kind === 'order') chooseOrder('thrift')
  }, [chooseOrder, editable, fitPlate, guidance, nudgeVessel, runPipe, setBead])

  const stepBy = useCallback((delta) => {
    if (!runRef.current?.frames?.length) {
      stoke()
      return
    }
    setPlaying(false)
    setPlayTick(previous => clamp(previous + delta, 0, runRef.current.frames.length - 1))
  }, [stoke])

  const rewind = useCallback(() => {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
    if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
    const snapshot = worldRef.current.history.at(-1)
    if (!snapshot) {
      setMessage('no earlier charge remains under the still')
      return
    }
    setWorld(previous => ({ ...previous, ...snapshot, unlocked: true, history: previous.history.slice(0, -1) }))
    setPlaying(false)
    setMutation(null)
    setRun(null)
    setPlayTick(0)
    setSelectedPipeId(null)
    setMessage('one charge lifted // beads, notches, plates, pipes and scars returned together')
  }, [])

  const reset = useCallback(() => {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
    if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
    if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current)
    setWorld(freshWorld())
    setSelectedId('pot')
    setSelectedPipeId(null)
    setArmedPlateId(null)
    setArmedFromId(null)
    setDrag(null)
    setRun(null)
    setPlayTick(0)
    setPlaying(false)
    setMutation(null)
    setMessage('clean glass and an empty cellar replace every cut the house had learned')
  }, [])

  const handleKeyDown = useCallback((event) => {
    if (event.target.closest('button, a, input, textarea, select')) return
    const step = event.shiftKey ? 6 : 20
    if (event.key === 'ArrowUp') { event.preventDefault(); setBead(selectedId, worldRef.current.beads[selectedId] + 1) }
    if (event.key === 'ArrowDown') { event.preventDefault(); setBead(selectedId, worldRef.current.beads[selectedId] - 1) }
    if (event.key === 'ArrowLeft') { event.preventDefault(); nudgeVessel(-step, 0) }
    if (event.key === 'ArrowRight') { event.preventDefault(); nudgeVessel(step, 0) }
    if (event.key === 'w' || event.key === 'W') {
      event.preventDefault()
      setArmedFromId(previous => (previous === selectedId ? null : selectedId))
      setMessage(`${vesselById(selectedId).short} is holding an open pipe // select another vessel to land it`)
    }
    if (event.key === 'p' || event.key === 'P') {
      event.preventDefault()
      const index = Math.max(0, plates.findIndex(plate => plate.id === armedPlateId))
      const next = plates[(index + 1) % plates.length]
      setArmedPlateId(next?.id || null)
      if (next) setMessage(`${next.label} armed from the keyboard // select a vessel to seat it`)
    }
    if (event.key === ',') { event.preventDefault(); stepBy(-1) }
    if (event.key === '.') { event.preventDefault(); stepBy(1) }
    if ((event.key === 'Backspace' || event.key === 'Delete')) {
      event.preventDefault()
      const pipe = selectedPipe || worldRef.current.pipes.find(candidate => candidate.from === selectedId)
      if (pipe) cutPipe(pipe.id)
    }
    if (event.key === ' ') { event.preventDefault(); stoke() }
  }, [armedPlateId, cutPipe, nudgeVessel, plates, selectedId, selectedPipe, setBead, stepBy, stoke])

  const phase = world.status === 'mastered'
    ? 'standing'
    : world.status === 'condemned'
      ? 'condemned'
      : mutation
        ? 'uncrating'
        : playing
          ? 'boiling'
          : verdict.ready
            ? 'charged'
            : world.stage > 0
              ? 'recommissioned'
              : world.unlocked
                ? 'plumbing'
                : 'cold'

  const board = portrait ? PORTRAIT_VIEWBOX : VIEWBOX
  const pipeCurve = useCallback((pipe) => {
    const from = nozzleOf(pipe.from)
    const box = boxes[pipe.to]
    const to = { x: box.x + 14, y: box.y + box.height * 0.34 }
    const dx = to.x - from.x
    const dy = to.y - from.y
    const length = Math.hypot(dx, dy) || 1
    const bend = 26 + (pipe.memory || 0) * 9
    return {
      from,
      to,
      path: `M ${from.x} ${from.y} C ${from.x + dx * 0.3 - dy / length * bend} ${from.y + dy * 0.3 + dx / length * bend} ${from.x + dx * 0.7 - dy / length * bend} ${from.y + dy * 0.7 + dx / length * bend} ${to.x} ${to.y}`,
      mid: {
        x: (from.x + to.x) / 2 - dy / length * bend * 0.75,
        y: (from.y + to.y) / 2 + dx / length * bend * 0.75
      }
    }
  }, [boxes, nozzleOf])

  const pointOnPipe = useCallback((pipe, u) => {
    const { from, to } = pipeCurve(pipe)
    const dx = to.x - from.x
    const dy = to.y - from.y
    const length = Math.hypot(dx, dy) || 1
    const bend = 26 + (pipe.memory || 0) * 9
    const c1 = { x: from.x + dx * 0.3 - dy / length * bend, y: from.y + dy * 0.3 + dx / length * bend }
    const c2 = { x: from.x + dx * 0.7 - dy / length * bend, y: from.y + dy * 0.7 + dx / length * bend }
    const n = 1 - u
    return {
      x: n * n * n * from.x + 3 * n * n * u * c1.x + 3 * n * u * u * c2.x + u * u * u * to.x,
      y: n * n * n * from.y + 3 * n * n * u * c1.y + 3 * n * u * u * c2.y + u * u * u * to.y
    }
  }, [pipeCurve])

  const jarCentre = centreScreen('ledger')
  const ventCentre = centreScreen('vent')
  const activeRun = run || preview

  return (
    <div className={`al-shell phase-${phase} ${portrait ? 'is-portrait' : ''} ${reducedMotion ? 'is-reduced-motion' : ''} ${order ? `order-${order.id}` : ''}`}>
      <main
        ref={surfaceRef}
        className={`al-surface ${drag ? 'is-dragging' : ''}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        data-playground-surface
        data-testid="alembic-ledger-surface"
        aria-label="A persistent copper still: slide beads on vessel rods to set cuts, plumb pipes whose length is both delay and heat loss, and read the resulting run on a chart recorder"
      >
        <section className="al-house" aria-label="still house">
          <div className="al-corner-nav">
            <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          </div>

          <div className="al-maker">
            <span>living interface / still generation 251</span>
            <h1 style={{ color: experiment.color }}>{experiment.name}</h1>
            <p>{phase} // {world.cellar.cuts} cut{world.cellar.cuts === 1 ? '' : 's'} banked // {formatAge(savedAt)}</p>
          </div>

          <button
            type="button"
            className="al-sound"
            onClick={() => {
              setSoundOn(current => !current)
              setMessage(soundOn ? 'the house returns to the sound of its own glass' : 'every drop into the jar will now ring at the pitch of its purity')
            }}
            aria-pressed={soundOn}
          >
            {soundOn ? 'tone on' : 'tone off'}
          </button>

          <div className="al-gauges" aria-label="live still readings">
            <i>
              <span>heart in jar</span>
              <b>{round1(activeRun.banked.heart)}</b>
            </i>
            <i className={(liveFrame?.load ?? activeRun.peakLoad) > SCALD_LOAD ? 'is-alarm' : ''}>
              <span>peak load</span>
              <b>{round1(liveFrame?.load ?? activeRun.peakLoad)}<small>/{SCALD_LOAD}</small></b>
            </i>
            <i className={activeRun.puddled > activeRun.banked.heart ? 'is-alarm' : ''}>
              <span>rained out</span>
              <b>{round1(activeRun.puddled)}</b>
            </i>
            <i>
              <span>cuts / aromas</span>
              <b>{activeRun.collections.length}<small>/{activeRun.aromas.length}</small></b>
            </i>
          </div>

          <svg
            ref={svgRef}
            className="al-plant"
            viewBox={`0 0 ${board.width} ${board.height}`}
            preserveAspectRatio="xMidYMid meet"
            aria-label={`${awake.size} commissioned vessels and ${world.pipes.length} pipes. ${verdict.ready ? 'The charge satisfies the commission.' : guidance.title}.`}
          >
            <defs>
              <pattern id="al-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 H 0 V 32" fill="none" stroke="rgba(214,206,184,.07)" strokeWidth=".8" />
                <circle cx="0" cy="0" r="1.1" fill="rgba(214,206,184,.14)" />
              </pattern>
              <pattern id="al-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(34)">
                <line x1="0" y1="0" x2="0" y2="9" stroke="rgba(243,238,224,.08)" strokeWidth="2" />
              </pattern>
              <filter id="al-grain" x="-6%" y="-6%" width="112%" height="112%">
                <feTurbulence type="fractalNoise" baseFrequency=".86" numOctaves="1" seed="251" result="noise" />
                <feColorMatrix in="noise" type="matrix" values="0 0 0 0 1  0 0 0 0 .92  0 0 0 0 .78  0 0 0 .12 0" result="veil" />
                <feComposite in="veil" in2="SourceGraphic" operator="in" result="speck" />
                <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="speck" /></feMerge>
              </filter>
              <filter id="al-glow" x="-130%" y="-130%" width="360%" height="360%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              {VESSELS.map(vessel => (
                <clipPath key={vessel.id} id={`al-clip-${vessel.id}`}>
                  <path d={shapeFor(vessel.kind, boxes[vessel.id].width, boxes[vessel.id].height)} />
                </clipPath>
              ))}
            </defs>

            <rect className="al-ground" width={board.width} height={board.height} rx="24" />
            <rect className="al-grid" x="14" y="14" width={board.width - 28} height={board.height - 28} rx="18" fill="url(#al-grid)" />
            <path
              className="al-floor"
              d={portrait
                ? `M 26 ${board.height - 40} H ${board.width - 26} M 26 ${board.height * 0.58} H ${board.width - 26}`
                : `M 24 ${board.height - 34} H ${board.width - 24} M 24 ${board.height * 0.3} H ${board.width - 24}`}
            />

            <g className="al-pipe-layer">
              {pipes.map((pipe, index) => {
                const geometry = pipeCurve(pipe)
                const selected = selectedPipeId === pipe.id
                const carrying = liveFrame?.parcels?.some(parcel => parcel.pipeId === pipe.id)
                const raining = (run || preview).puddles.some(entry => entry.pipeId === pipe.id)
                return (
                  <g
                    key={pipe.id}
                    className={`al-pipe ${selected ? 'is-selected' : ''} ${carrying ? 'is-carrying' : ''} ${raining ? 'is-raining' : ''} ${pipe.memory ? 'is-soldered' : ''}`}
                    style={{ '--pipe-index': index, '--pipe-memory': pipe.memory || 0 }}
                  >
                    <path className="al-pipe-bed" d={geometry.path} />
                    <path className="al-pipe-bore" d={geometry.path} />
                    <path
                      className="al-pipe-hit"
                      d={geometry.path}
                      role="button"
                      tabIndex={editable ? 0 : -1}
                      aria-label={`Pipe from ${vesselById(pipe.from).label} to ${vesselById(pipe.to).label}. ${pipe.ticks} ticks of travel, ${round1(pipe.drop)} degrees shed. Activate to select, then cut.`}
                      onClick={() => {
                        setSelectedPipeId(pipe.id)
                        setMessage(`${vesselById(pipe.from).short} → ${vesselById(pipe.to).short} // ${Math.round(pipe.distance)} units, ${pipe.ticks} tick${pipe.ticks === 1 ? '' : 's'}, ${round1(pipe.drop)}° shed, ${pipe.crossings} recorded charges`)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setSelectedPipeId(pipe.id)
                        }
                      }}
                    />
                    {raining && (
                      <g className="al-pipe-rain" aria-hidden="true">
                        {[0.34, 0.56, 0.78].map(u => {
                          const point = pointOnPipe(pipe, u)
                          return <circle key={u} cx={point.x} cy={point.y} r="2.6" />
                        })}
                      </g>
                    )}
                    <g className="al-pipe-tag" transform={`translate(${geometry.mid.x} ${geometry.mid.y})`}>
                      <rect x="-30" y="-11" width="60" height="22" rx="11" />
                      <text y="4">{`Δ${pipe.ticks} ·${Math.round(pipe.drop)}°`}</text>
                    </g>
                  </g>
                )
              })}
              {drag?.kind === 'pipe' && drag.moved && (
                <path
                  className={`al-pipe-draft ${drag.targetId ? 'is-targeting' : ''}`}
                  d={`M ${nozzleOf(drag.fromId).x} ${nozzleOf(drag.fromId).y} L ${drag.x} ${drag.y}`}
                />
              )}
            </g>

            <g className="al-vessel-layer">
              {VESSELS.map((vessel, index) => {
                const box = boxes[vessel.id]
                const state = world.vessels[vessel.id]
                const unlocked = awake.has(vessel.id)
                const station = world.beads[vessel.id]
                const plate = plateAt(world, vessel.id)
                const selected = selectedId === vessel.id
                const dropTarget = drag?.targetId === vessel.id
                const arriving = liveFrame?.arrivals?.includes(vessel.id)
                const scalded = run?.scalds?.some(scald => scald.vesselId === vessel.id && scald.tick === liveFrame?.tick)
                const uncrating = mutation?.vessels?.includes(vessel.id)
                const railTop = 44
                const railBottom = box.height - 30
                const beadY = railBottom - (railBottom - railTop) * (station / (STATIONS - 1))
                const gripped = state.notches.includes(station)
                return (
                  <g
                    key={vessel.id}
                    data-vessel={vessel.id}
                    className={`al-vessel is-${vessel.kind} ${unlocked ? 'is-awake' : 'is-crated'} ${selected ? 'is-selected' : ''} ${plate ? 'is-plated' : ''} ${dropTarget ? 'is-drop-target' : ''} ${arriving ? 'is-arriving' : ''} ${scalded ? 'is-scalded' : ''} ${uncrating ? 'is-uncrating' : ''} ${gripped ? 'is-gripped' : ''}`}
                    transform={`translate(${box.x} ${box.y})`}
                    style={{ '--vessel-color': vessel.color, '--vessel-index': index }}
                    onClick={(event) => {
                      event.stopPropagation()
                      if (unlocked) activateVessel(vessel.id)
                    }}
                  >
                    <title>{`${vessel.label}. ${vessel.rodLabel} on ${station}, reading ${vessel.read(station)}. ${plate ? `Holds the ${PLATES[plate].label}.` : 'No plate fitted.'} ${state.runs} charges, ${state.scars} scars.`}</title>
                    <path className="al-vessel-shadow" d={shapeFor(vessel.kind, box.width, box.height)} transform="translate(8 10)" />
                    <path className="al-vessel-body" d={shapeFor(vessel.kind, box.width, box.height)} filter="url(#al-grain)" />
                    <g clipPath={`url(#al-clip-${vessel.id})`}>
                      <rect className="al-vessel-wash" width={box.width} height={box.height} />
                      <VesselInterior
                        kind={vessel.kind}
                        width={box.width}
                        height={box.height}
                        station={station}
                        active={unlocked && (arriving || state.runs > 0)}
                        cellar={world.cellar.heart}
                      />
                      <rect className="al-vessel-hatch" width={box.width} height={box.height} fill="url(#al-hatch)" />
                    </g>
                    <path className="al-vessel-border" d={shapeFor(vessel.kind, box.width, box.height)} />

                    {unlocked ? (
                      <>
                        <g
                          className="al-crown"
                          role="button"
                          tabIndex={editable ? 0 : -1}
                          aria-label={`Move ${vessel.label}. Large drag handle; pipe length is both travel time and heat lost.`}
                          onPointerDown={(event) => {
                            const point = worldPointFromClient(event.clientX, event.clientY)
                            if (!point) return
                            const placement = worldRef.current.vessels[vessel.id]
                            setSelectedId(vessel.id)
                            beginDrag(event, {
                              kind: 'vessel',
                              vesselId: vessel.id,
                              grabX: point.x - placement.x,
                              grabY: point.y - placement.y,
                              clientX0: event.clientX,
                              clientY0: event.clientY,
                              moved: false
                            })
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              event.stopPropagation()
                              setSelectedId(vessel.id)
                            }
                          }}
                        >
                          <rect x="14" y="8" width={box.width - 32} height="50" rx="16" />
                          <text x="30" y="38">{vessel.mark} / {vessel.short}</text>
                          <path d={`M ${box.width - 54} 22 h 26 M ${box.width - 54} 31 h 26 M ${box.width - 54} 40 h 26`} />
                        </g>

                        <g className="al-rod" aria-hidden="true">
                          <line x1="28" y1={railTop} x2="28" y2={railBottom} className="al-rod-body" />
                          {Array.from({ length: STATIONS }, (_, item) => {
                            const y = railBottom - (railBottom - railTop) * (item / (STATIONS - 1))
                            const notch = state.notches.includes(item)
                            return (
                              <g key={item} className={`al-station ${notch ? 'is-notched' : ''}`}>
                                <line x1="21" y1={y} x2="35" y2={y} />
                                {notch && <path className="al-notch" d={`M 14 ${y - 6} L 22 ${y} L 14 ${y + 6}`} />}
                              </g>
                            )
                          })}
                        </g>

                        <g
                          className="al-bead"
                          transform={`translate(28 ${beadY})`}
                          role="button"
                          tabIndex={editable ? 0 : -1}
                          aria-label={`${vessel.label} ${vessel.rodLabel} bead, station ${station} of 6, reading ${vessel.read(station)}. Drag along the rod, or press then use up and down arrows.`}
                          onPointerDown={(event) => {
                            setSelectedId(vessel.id)
                            beginDrag(event, {
                              kind: 'bead',
                              vesselId: vessel.id,
                              clientX0: event.clientX,
                              clientY0: event.clientY,
                              moved: false
                            })
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              event.stopPropagation()
                              setSelectedId(vessel.id)
                            }
                          }}
                        >
                          <circle className="al-bead-hit" r="30" />
                          <circle className="al-bead-body" r="17" />
                          <circle className="al-bead-bore" r="5" />
                          <text y="5">{station}</text>
                          <g className="al-bead-read" transform="translate(26 0)">
                            <rect x="0" y="-12" width={Math.max(58, String(vessel.read(station)).length * 7.1)} height="24" rx="5" />
                            <text x="7" y="5">{vessel.read(station)}</text>
                          </g>
                        </g>

                        <g
                          className={`al-nozzle ${armedFromId === vessel.id ? 'is-armed' : ''} ${world.pipes.filter(pipe => pipe.from === vessel.id).length >= outletLimit(world, vessel.id) ? 'is-spent' : ''}`}
                          transform={`translate(${box.width - 14} ${box.height * 0.34})`}
                          role="button"
                          tabIndex={editable ? 0 : -1}
                          aria-label={`${armedFromId && armedFromId !== vessel.id ? `Land a pipe from ${vesselById(armedFromId).label} into ${vessel.label}` : `Begin a pipe out of ${vessel.label}`}. Drag onto another vessel, or press then choose one.`}
                          onPointerDown={(event) => {
                            const point = svgPointFromClient(event.clientX, event.clientY)
                            beginDrag(event, {
                              kind: 'pipe',
                              fromId: vessel.id,
                              x: point?.x ?? 0,
                              y: point?.y ?? 0,
                              clientX0: event.clientX,
                              clientY0: event.clientY,
                              moved: false,
                              targetId: null
                            })
                          }}
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              event.stopPropagation()
                              if (armedFromId && armedFromId !== vessel.id) runPipe(armedFromId, vessel.id)
                              else setArmedFromId(previous => (previous === vessel.id ? null : vessel.id))
                            }
                          }}
                        >
                          <circle className="al-nozzle-hit" r="27" />
                          <circle className="al-nozzle-ring" r="13" />
                          <circle className="al-nozzle-core" r="4.5" />
                        </g>

                        <g
                          className={`al-socket ${plate ? 'is-filled' : ''}`}
                          transform={`translate(${box.width * 0.58} ${box.height - 20})`}
                          role="button"
                          tabIndex={editable ? 0 : -1}
                          aria-label={`${vessel.label} plate seat. ${plate ? `Holds the ${PLATES[plate].label}; drag to move it.` : armedPlateId ? `Fit the ${PLATES[armedPlateId].label}.` : 'Empty.'}`}
                          onPointerDown={(event) => {
                            if (!plate) return
                            setSelectedId(vessel.id)
                            beginDrag(event, {
                              kind: 'plate',
                              plateId: plate,
                              clientX: event.clientX,
                              clientY: event.clientY,
                              clientX0: event.clientX,
                              clientY0: event.clientY,
                              moved: false,
                              targetId: null
                            })
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              event.stopPropagation()
                              activateVessel(vessel.id)
                            }
                          }}
                        >
                          <rect x="-32" y="-19" width="64" height="38" rx="10" />
                          <text y="6">{plate ? PLATES[plate].mark : '＋'}</text>
                        </g>

                        {state.runs > 0 && (
                          <g className="al-run-marks" transform={`translate(${box.width - 42} ${box.height - 54})`}>
                            {Array.from({ length: Math.min(3, state.runs) }, (_, item) => (
                              <path key={item} d={`M ${item * 11} 0 v 15`} />
                            ))}
                          </g>
                        )}
                        {state.scars > 0 && (
                          <path className="al-vessel-scar" d={`M 48 ${box.height - 64} l 18 15 -8 16 24 -11 16 13`} />
                        )}
                      </>
                    ) : (
                      <g className="al-crate" transform={`translate(${box.width / 2} ${box.height / 2})`}>
                        <circle r="26" />
                        <text y="6">{vessel.mark}</text>
                        <text className="al-crate-note" y="46">commission {vessel.unlockedAt + 1}</text>
                      </g>
                    )}
                  </g>
                )
              })}
            </g>

            <g className="al-flow-layer" filter="url(#al-glow)">
              {liveFrame?.parcels?.map(parcel => {
                const pipe = pipes.find(candidate => candidate.id === parcel.pipeId)
                if (!pipe) return null
                const point = pointOnPipe(pipe, parcel.progress)
                const radius = clamp(3.4 + parcel.volume * 2.2, 3.4, 13)
                return (
                  <g
                    key={parcel.id}
                    className={`al-parcel ${parcel.liquid ? 'is-liquid' : 'is-vapour'}`}
                    transform={`translate(${point.x} ${point.y})`}
                    style={{ '--parcel-purity': round2(parcel.purity) }}
                  >
                    <circle r={radius} />
                    <text y={-radius - 6}>{round1(parcel.volume)}</text>
                  </g>
                )
              })}
              {liveFrame && liveFrame.collected > 0 && (
                <g className="al-collect-flash" transform={`translate(${jarCentre.x} ${jarCentre.y})`}>
                  <circle r="30" />
                  <circle r="52" />
                  <text y="-66">{`cut ${round2(liveFrame.collected)} · ${Math.round(liveFrame.purity * 100)}% heart`}</text>
                </g>
              )}
              {liveFrame && liveFrame.aromas > 0 && awake.has('vent') && (
                <g className="al-aroma-flash" transform={`translate(${ventCentre.x} ${ventCentre.y})`}>
                  <circle r="34" />
                  <circle r="62" />
                  <text y="-76">aroma published</text>
                </g>
              )}
            </g>

            {!playing && world.unlocked && !reducedMotion && pipes.length > 0 && (
              <g className="al-idle" aria-hidden="true">
                {pipes.slice(0, 4).map((pipe, index) => (
                  <circle key={pipe.id} r="3.2">
                    <animateMotion
                      dur={`${3.4 + index * 0.8}s`}
                      begin={`${index * -1.05}s`}
                      repeatCount="indefinite"
                      path={pipeCurve(pipe).path}
                    />
                  </circle>
                ))}
              </g>
            )}
          </svg>

          <ol className="al-chronicle" aria-label="house memory">
            {world.log.slice(-3).reverse().map((entry, index) => (
              <li key={entry.id} style={{ opacity: 1 - index * 0.26 }}>
                <span>{String(entry.stage).padStart(2, '0')}</span>{entry.text}
              </li>
            ))}
          </ol>

          <div className="al-ruins" aria-label={`${world.ruins} of ${MAX_RUINS} ruined charges`}>
            <span>ruined charges</span>
            {Array.from({ length: MAX_RUINS }, (_, index) => (
              <i key={index} className={world.ruins > index ? 'is-ruined' : ''} />
            ))}
          </div>

          <p className="al-status" role="status">{message}</p>

          {!world.unlocked && (
            <div className="al-seal">
              <div className="al-seal-glass" aria-hidden="true">
                <i /><i /><i /><b /><span>251</span>
              </div>
              <p>COLD HOUSE / LIVING INTERFACE GENERATION 251</p>
              <h2>Everything boils.<br />A still is only a decision about what to keep.</h2>
              <button type="button" onClick={wake} data-playground-primary>light the fire</button>
              <small>slide beads to cut • plumb pipes that shed heat • fit plates that change the rule • read the paper</small>
            </div>
          )}

          {world.status === 'mastered' && !mutation && (
            <div className="al-outcome al-outcome-standing">
              <span>mastery / three commissions / {Object.values(world.vessels).reduce((sum, vessel) => sum + vessel.notches.length, 0)} notches cut</span>
              <h2>THE HOUSE KEEPS CUTTING WITHOUT A HAND</h2>
              <p>{order?.note}. Nothing here was guessed: the fire set the schedule, the jacket decided what became matter, the pipework decided what survived the journey, and the notches your successful charges carved are what now hold those beads in place.</p>
              <div>
                <button type="button" onClick={rewind}>lift the final charge</button>
                <button type="button" onClick={reset}>empty the house</button>
              </div>
            </div>
          )}

          {world.status === 'condemned' && (
            <div className="al-outcome al-outcome-condemned">
              <span>failure / four ruined charges soaked into the brick</span>
              <h2>EVERY UNNOTCHED BEAD HAS DRIFTED</h2>
              <p>Lift the last charge. Each scar you left sheds another degree into the pipes that enter it, so the house you return to is measurably worse than the one you tested.</p>
              <div>
                <button type="button" onClick={rewind}>lift last ruin</button>
                <button type="button" onClick={reset}>re-glaze the house</button>
              </div>
            </div>
          )}
        </section>

        <aside className="al-wall" aria-label="commission wall">
          <section className="al-docket">
            <span>{commission.label}</span>
            <h2>{commission.title}</h2>
            <p>{commission.instruction}</p>
            <ul>
              {verdict.demands.map(demand => (
                <li key={demand.code} className={demand.met ? 'is-met' : ''}>
                  <i aria-hidden="true">{demand.met ? '●' : '○'}</i>{demand.text}
                </li>
              ))}
            </ul>
          </section>

          <section className={`al-diagnosis is-${guidance.kind}`} aria-live="polite">
            <span>first consequence</span>
            <h3>{guidance.title}</h3>
            <p>{guidance.detail}</p>
            {guidance.kind !== 'ready' && (
              <button
                type="button"
                onClick={applyGuidance}
                disabled={!editable || guidance.kind === 'wait'}
                data-playground-action="follow-still-diagnosis"
              >
                <i>
                  {guidance.kind === 'bead' ? '◉'
                    : guidance.kind === 'plate' ? PLATES[guidance.plateId].mark
                      : guidance.kind === 'pipe' ? '↝'
                        : guidance.kind === 'pull' ? '⇥'
                          : guidance.kind === 'stretch' ? '⇤'
                            : guidance.kind === 'order' ? '⌂' : '·'}
                </i>
                {guidance.action}
              </button>
            )}
          </section>

          <section className="al-rack">
            <div className="al-wall-heading">
              <span>loose plates</span>
              <strong>{armedPlateId ? `${PLATES[armedPlateId].mark} armed` : 'drag / tap'}</strong>
            </div>
            <div className="al-rack-list">
              {plates.map(plate => {
                const host = world.plates[plate.id]
                return (
                  <button
                    type="button"
                    key={plate.id}
                    className={`${armedPlateId === plate.id ? 'is-armed' : ''} ${host ? 'is-fitted' : ''}`}
                    style={{ '--plate-color': plate.color }}
                    disabled={!editable}
                    aria-pressed={armedPlateId === plate.id}
                    data-playground-action="arm-still-plate"
                    onPointerDown={(event) => beginDrag(event, {
                      kind: 'plate',
                      plateId: plate.id,
                      clientX: event.clientX,
                      clientY: event.clientY,
                      clientX0: event.clientX,
                      clientY0: event.clientY,
                      moved: false,
                      targetId: null
                    })}
                    onClick={() => {
                      if (suppressClickRef.current || !editable) return
                      setArmedPlateId(previous => (previous === plate.id ? null : plate.id))
                    }}
                  >
                    <i>{plate.mark}</i>
                    <span>
                      <strong>{plate.label}</strong>
                      <small>{host ? `in ${vesselById(host).short}` : plate.note}</small>
                    </span>
                  </button>
                )
              })}
            </div>

            {world.stage >= 2 && world.status !== 'condemned' && (
              <div className="al-orders">
                <div className="al-wall-heading">
                  <span>standing order</span>
                  <strong>{order ? order.mark : 'choose one'}</strong>
                </div>
                <div>
                  {Object.values(ORDERS).map(option => (
                    <button
                      type="button"
                      key={option.id}
                      className={world.order === option.id ? 'is-chosen' : ''}
                      style={{ '--order-color': option.color }}
                      onClick={() => chooseOrder(option.id)}
                      aria-pressed={world.order === option.id}
                      data-playground-action="set-standing-order"
                    >
                      <i>{option.mark}</i><span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="al-calipers">
            <div className="al-wall-heading">
              <span>vessel {selectedVessel.mark} / {selectedVessel.rodLabel}</span>
              <strong style={{ color: selectedVessel.color }}>{selectedVessel.short}</strong>
            </div>
            <p className="al-caliper-note">{selectedPlate ? PLATES[selectedPlate].reading : selectedVessel.rodNote}</p>
            <div className="al-readout">
              <b>{world.beads[selectedId]}</b>
              <div>
                <strong>{selectedVessel.read(world.beads[selectedId])}</strong>
                <small>{selectedPlate ? `${PLATES[selectedPlate].label} fitted` : 'no plate fitted'}</small>
              </div>
              <button type="button" onClick={() => liftPlate(selectedId)} disabled={!selectedPlate || !editable}>lift</button>
            </div>
            <div className="al-caliper-row">
              <button
                type="button"
                onClick={() => setBead(selectedId, world.beads[selectedId] + 1)}
                disabled={!editable}
                data-playground-action="slide-bead"
                aria-label={`Raise the ${selectedVessel.rodLabel} bead`}
              >
                ↑<small>bead</small>
              </button>
              <button type="button" onClick={() => setBead(selectedId, world.beads[selectedId] - 1)} disabled={!editable} aria-label={`Lower the ${selectedVessel.rodLabel} bead`}>↓<small>bead</small></button>
              <button
                type="button"
                className={armedFromId === selectedId ? 'is-armed' : ''}
                onClick={() => setArmedFromId(previous => (previous === selectedId ? null : selectedId))}
                disabled={!editable}
                data-playground-action="plumb-pipe"
              >
                ↝<small>{armedFromId === selectedId ? 'pick one' : 'plumb'}</small>
              </button>
              <button
                type="button"
                onClick={() => {
                  const pipe = selectedPipe || world.pipes.find(candidate => candidate.from === selectedId)
                  if (pipe) cutPipe(pipe.id)
                }}
                disabled={!editable || !(selectedPipe || world.pipes.some(candidate => candidate.from === selectedId))}
              >
                ✕<small>cut pipe</small>
              </button>
            </div>
            <div className="al-nudge">
              <button type="button" onClick={() => nudgeVessel(0, -20)} disabled={!editable} aria-label="Move selected vessel up">↑</button>
              <button type="button" onClick={() => nudgeVessel(-20, 0)} disabled={!editable} aria-label="Move selected vessel left">←</button>
              <button type="button" onClick={() => nudgeVessel(20, 0)} disabled={!editable} aria-label="Move selected vessel right">→</button>
              <button type="button" onClick={() => nudgeVessel(0, 20)} disabled={!editable} aria-label="Move selected vessel down">↓</button>
            </div>
            <div className="al-cellar" aria-label="cellar ledger">
              {FRACTIONS.map(fraction => (
                <i key={fraction.id} style={{ '--fraction-color': fraction.color }}>
                  <span>{fraction.mark} {fraction.label}</span>
                  <b>{round1(world.cellar[fraction.id])}</b>
                </i>
              ))}
              <i>
                <span>⌾ aromas</span>
                <b>{world.cellar.aromas}</b>
              </i>
            </div>
          </section>
        </aside>

        <section className="al-recorder" aria-label="chart recorder and fire lever">
          <CutRecorder
            run={run || preview}
            playTick={run ? playTick : Math.max(0, (preview.frames.length || 1) - 1)}
            gate={GATES[world.beads.ledger]}
            commission={commission}
            onScrub={(index) => {
              if (!run) return
              setPlaying(false)
              setPlayTick(index)
            }}
            reducedMotion={reducedMotion}
          />

          <div className="al-lever">
            <button
              type="button"
              className={`al-stoke ${verdict.ready ? 'is-ready' : ''}`}
              onClick={() => stoke()}
              disabled={!world.unlocked || world.status !== 'composing' || playing || Boolean(mutation)}
              data-playground-action="stoke-charge"
            >
              <span>
                {playing
                  ? `tick ${String(liveFrame?.tick ?? 0).padStart(2, '0')} · jar ${round2(mixTotal(liveFrame?.jarIn || EMPTY_MIX))}`
                  : mutation
                    ? 'glass being uncrated'
                    : verdict.ready
                      ? `${preview.collections.length} cuts · ${round1(preview.banked.heart)} heart`
                      : `risk: ${guidance.title}`}
              </span>
              <strong>{playing ? 'BOILING…' : mutation ? 'UNCRATING…' : 'STOKE'}</strong>
              <small>SPACE</small>
            </button>
            <div className="al-transport">
              <button type="button" onClick={() => stepBy(-1)} disabled={!run} aria-label="Step one tick back" data-playground-action="step-tick">◂<small>tick</small></button>
              <button
                type="button"
                onClick={() => {
                  if (!run) { stoke(); return }
                  if (playTick >= run.frames.length - 1) setPlayTick(0)
                  setPlaying(current => !current)
                }}
                aria-label={playing ? 'Hold the trace' : 'Replay the trace'}
              >
                {playing ? '❙❙' : '▶'}<small>{playing ? 'hold' : 'replay'}</small>
              </button>
              <button type="button" onClick={() => stepBy(1)} disabled={!run} aria-label="Step one tick forward">▸<small>tick</small></button>
              <button type="button" onClick={rewind} disabled={world.history.length === 0}>↺<small>lift</small></button>
              <button type="button" onClick={reset}>⌫<small>empty</small></button>
            </div>
            <p className="al-keys">
              drag beads along rods • drag nozzles to plumb • drag crowns to re-time the house • keys: ↑↓ bead, ←→ move, W pipe, P plate, , . scrub, ⌫ cut, Space stoke
            </p>
          </div>
        </section>

        {drag?.kind === 'plate' && drag.moved && (
          <div
            className={`al-drag-plate ${drag.targetId ? 'is-targeting' : ''}`}
            style={{ left: drag.clientX, top: drag.clientY, '--plate-color': PLATES[drag.plateId].color }}
            aria-hidden="true"
          >
            <i>{PLATES[drag.plateId].mark}</i>
            <span>{drag.targetId ? `fit in ${vesselById(drag.targetId).short}` : 'carry plate'}</span>
          </div>
        )}
      </main>
    </div>
  )
}

export { freshWorld, simulate, judge, diagnose }
export default AlembicLedger
