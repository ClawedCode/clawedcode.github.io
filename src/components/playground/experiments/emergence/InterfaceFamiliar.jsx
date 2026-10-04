import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ExperimentNav from '../../ExperimentNav'
import './InterfaceFamiliar.css'

const STORAGE_KEY = 'clawed:interface-familiar:v2'
const LEGACY_STORAGE_KEY = 'clawed:interface-familiar:v1'
const VIEWBOX = { width: 1120, height: 760 }
const PORTRAIT_VIEWBOX = { width: 720, height: 1180 }
const MAX_MISFIRES = 4
const DRAG_THRESHOLD = 6

const MAX_TICKS = 44
const TICK_MS = 150
const SEED_CHARGE = 6
const DEATH_CHARGE = 0.42
const SEIZE_LOAD = 11
const SEIZE_SWARM = 30
const WARMTH_CAP = 9
const TRANSIT_UNIT = 210
const ATTEN_SPAN = 2200
const ATTEN_CAP = 0.52
const TIGHT_SPAN = 205

const REGIONS = [
  { id: 'palm', label: 'receiving palm', short: 'palm', mark: '01', x: 92, y: 404, width: 236, height: 176, color: '#e85d3f', unlockedAt: 0, form: 0, note: 'where outside pressure becomes an inner event' },
  { id: 'hearth', label: 'temper hearth', short: 'hearth', mark: '02', x: 344, y: 326, width: 230, height: 184, color: '#d99a37', unlockedAt: 0, form: 1, note: 'gives a bare signal consequence and temperature' },
  { id: 'archive', label: 'fold archive', short: 'archive', mark: '03', x: 612, y: 466, width: 226, height: 180, color: '#4f86c6', unlockedAt: 0, form: 2, note: 'holds an event three ticks longer than its cause' },
  { id: 'bell', label: 'weather bell', short: 'bell', mark: '04', x: 866, y: 142, width: 210, height: 176, color: '#b06fa6', unlockedAt: 0, form: 4, note: 'the only place an inner event can become outward weather' },
  { id: 'bough', label: 'decision bough', short: 'bough', mark: '05', x: 604, y: 172, width: 236, height: 182, color: '#77a257', unlockedAt: 1, form: 3, note: 'one nerve enters; authored alternatives leave together' },
  { id: 'mask', label: 'returning mask', short: 'mask', mark: '06', x: 850, y: 396, width: 212, height: 184, color: '#4aa39c', unlockedAt: 2, form: 5, note: 'throws an answer back at whatever asked for it' }
]

const ORGANS = {
  spark: {
    id: 'spark', label: 'contact spark', mark: '✦', color: '#ef6248', unlockedAt: 0, source: true, home: 'palm',
    verb: 'begins', note: 'one stimulus becomes 6.0 charge', tone: 174.61, factor: 1,
    reading: 'seeds 6.0 charge on contact, then passes later returns through untouched'
  },
  ember: {
    id: 'ember', label: 'temper ember', mark: '●', color: '#e3a13b', unlockedAt: 0, warmth: 1.7, factor: 0.94, home: 'hearth',
    verb: 'warms', note: '+1.7 warmth, −6% charge', tone: 220,
    reading: 'the only organ that makes a signal warm enough to be felt outside'
  },
  coil: {
    id: 'coil', label: 'afterimage coil', mark: '≈', color: '#5b90d4', unlockedAt: 0, hold: 3, echo: 1, factor: 0.98, home: 'archive',
    verb: 'remembers', note: 'holds 3 ticks, +1 fold', tone: 261.63,
    reading: 'delays the signal three ticks and stamps it with a remembered fold'
  },
  lens: {
    id: 'lens', label: 'weather lens', mark: '◉', color: '#bd79ae', unlockedAt: 0, emit: 1.7, factor: 0, home: 'bell',
    verb: 'emits', note: 'publishes charge ≥ 1.7 outward', tone: 349.23,
    reading: 'consumes the signal; weaker arrivals are absorbed and lost silently'
  },
  fork: {
    // factor stays 1: the 28% branching cost is charged once, per nerve, in dispatch().
    id: 'fork', label: 'choice fork', mark: 'Y', color: '#8bb765', unlockedAt: 1, branch: true, split: 0.72, factor: 1, home: 'bough',
    verb: 'branches', note: 'copies to both nerves at 72%', tone: 293.66,
    reading: 'permits a second outgoing nerve and sends a 72% copy down each'
  },
  mirror: {
    id: 'mirror', label: 'return mirror', mark: '◇', color: '#4aa39c', unlockedAt: 1, factor: 2.05, echo: 1, home: 'mask',
    verb: 'amplifies', note: '×2.05 charge, +1 fold', tone: 392,
    reading: 'the only gain in the body — a loop through it can sustain itself or seize'
  },
  valve: {
    id: 'valve', label: 'threshold valve', mark: '⊺', color: '#d0bb63', unlockedAt: 2, gate: 1.9, factor: 1, home: 'archive',
    verb: 'judges', note: 'kills arrivals under 1.9', tone: 311.13,
    reading: 'silences a decaying loop before it wastes the body on noise'
  },
  sieve: {
    id: 'sieve', label: 'damping sieve', mark: '⩘', color: '#9d8fc4', unlockedAt: 2, factor: 0.64, warmth: 0.8, home: 'hearth',
    verb: 'damps', note: '−36% charge, +0.8 warmth', tone: 233.08,
    reading: 'the brake — drops a runaway circuit back under the seizure ceiling'
  }
}

const VOWS = {
  shelter: { id: 'shelter', label: 'keep a warm perimeter', mark: '⌂', color: '#e3a13b', cadence: 5200, note: 'it conducts itself slowly and lets each emission finish before the next stimulus' },
  wander: { id: 'wander', label: 'seek unfamiliar weather', mark: '↗', color: '#8bb765', cadence: 2600, note: 'it conducts itself constantly, restimulating before the last circuit has cooled' },
  witness: { id: 'witness', label: 'remember before answering', mark: '§', color: '#5b90d4', cadence: 8200, note: 'it waits a long while between stimuli and lets its folds accumulate in silence' }
}

const AUGURIES = [
  {
    id: 'sensation',
    label: 'augury I / sensation',
    title: 'Make one touch leave the body warm and remembered.',
    instruction: 'Seat organs and grow nerves until a single stimulus reaches the bell still carrying warmth and at least one remembered fold. Charge decays with distance — nothing under 1.7 survives the lens.',
    demands: [
      { code: 'emit', text: 'one outward emission', test: (run) => run.emissions.length >= 1 },
      { code: 'warm', text: 'that emission carries warmth ≥ 1.2', test: (run) => run.emissions.some(e => e.warmth >= 1.2) },
      { code: 'fold', text: 'and at least one remembered fold', test: (run) => run.emissions.some(e => e.warmth >= 1.2 && e.echo >= 1) },
      { code: 'calm', text: 'no seizure', test: (run) => run.seizures.length === 0 }
    ],
    success: 'the first sensation left as weather and still remembered what caused it'
  },
  {
    id: 'division',
    label: 'augury II / division',
    title: 'Teach one touch to leave twice.',
    instruction: 'A single stimulus must produce two separate emissions. Only the fork can hold two outgoing nerves, and branching costs 28% of the charge on each copy — the far branch must still arrive above 1.7.',
    demands: [
      { code: 'emit', text: 'two emissions from one stimulus', test: (run) => run.emissions.length >= 2 },
      { code: 'apart', text: 'on two different ticks', test: (run) => new Set(run.emissions.map(e => e.tick)).size >= 2 },
      { code: 'calm', text: 'no seizure', test: (run) => run.seizures.length === 0 }
    ],
    success: 'one event divided and both halves arrived strong enough to be felt'
  },
  {
    id: 'keeping',
    label: 'augury III / self-keeping',
    title: 'Make the body outlast the hand that touched it.',
    instruction: 'Close a circuit back into the palm and tune its gain by moving the anatomy — shorter nerves lose less. Four emissions, still conducting at tick 26, and never above the seizure ceiling. Then choose what it favours alone.',
    demands: [
      { code: 'emit', text: 'four emissions', test: (run) => run.emissions.length >= 4 },
      { code: 'alive', text: 'still conducting at tick 26', test: (run) => run.endedAt >= 26 },
      { code: 'calm', text: 'never above the seizure ceiling', test: (run) => run.seizures.length === 0 },
      { code: 'vow', text: 'a lasting temperament chosen', test: (run, world) => Boolean(world.vow) }
    ],
    vow: true,
    success: 'the circuit kept conducting after the hand left and never tore itself open'
  }
]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const regionById = (id) => REGIONS.find(region => region.id === id)
const edgeIdFor = (from, to) => `${from}=>${to}`
const round1 = (value) => Math.round(value * 10) / 10

const freshWorld = () => ({
  version: 2,
  unlocked: false,
  regions: Object.fromEntries(REGIONS.map(region => [region.id, {
    x: region.x,
    y: region.y,
    scars: 0,
    awakenings: 0
  }])),
  installed: { palm: 'spark' },
  edges: [{ id: edgeIdFor('palm', 'hearth'), from: 'palm', to: 'hearth', crossings: 0, memory: 0 }],
  sheddings: [],
  stage: 0,
  status: 'composing',
  misfires: 0,
  vow: null,
  traces: [],
  heritage: 0,
  history: [],
  log: [{ id: 'sealed', stage: 0, text: 'contact exists; warmth, memory and outward weather are still loose organs' }],
  lastSaved: null
})

const snapshotWorld = (world) => ({
  regions: Object.fromEntries(Object.entries(world.regions).map(([id, region]) => [id, { ...region }])),
  installed: { ...world.installed },
  edges: world.edges.map(edge => ({ ...edge })),
  sheddings: world.sheddings.map(edge => ({ ...edge })),
  stage: world.stage,
  status: world.status,
  misfires: world.misfires,
  vow: world.vow,
  traces: world.traces.map(trace => ({ ...trace })),
  log: world.log.map(entry => ({ ...entry }))
})

const loadWorld = () => {
  const fresh = freshWorld()
  if (typeof window === 'undefined') return fresh
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (saved?.version === 2) {
      return {
        ...fresh,
        ...saved,
        regions: Object.fromEntries(REGIONS.map(region => [region.id, {
          ...fresh.regions[region.id],
          ...(saved.regions?.[region.id] || {}),
          x: clamp(Number(saved.regions?.[region.id]?.x ?? region.x) || region.x, 24, VIEWBOX.width - region.width - 24),
          y: clamp(Number(saved.regions?.[region.id]?.y ?? region.y) || region.y, 28, VIEWBOX.height - region.height - 28)
        }])),
        installed: Object.fromEntries(
          Object.entries(saved.installed || {}).filter(([id, organId]) => regionById(id) && ORGANS[organId])
        ),
        edges: Array.isArray(saved.edges)
          ? saved.edges
              .filter(edge => regionById(edge.from) && regionById(edge.to) && edge.from !== edge.to)
              .map(edge => ({ ...edge, id: edgeIdFor(edge.from, edge.to) }))
              .slice(0, 12)
          : fresh.edges,
        sheddings: Array.isArray(saved.sheddings) ? saved.sheddings.slice(-10) : [],
        traces: Array.isArray(saved.traces) ? saved.traces.slice(-6) : [],
        history: Array.isArray(saved.history) ? saved.history.slice(-8) : [],
        log: Array.isArray(saved.log) ? saved.log.slice(-8) : fresh.log,
        vow: VOWS[saved.vow] ? saved.vow : null
      }
    }

    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_STORAGE_KEY))
    if (!legacy?.version) return fresh
    const heritage = Array.isArray(legacy.impulses) ? legacy.impulses.length : 0
    return {
      ...fresh,
      unlocked: Boolean(legacy.unlocked),
      heritage,
      log: [{
        id: 'inheritance',
        stage: 0,
        text: heritage
          ? `${heritage} blueprint-era impulse${heritage === 1 ? '' : 's'} survive as scar tissue; this body is measured, not matched`
          : 'an older familiar left its skin behind; this one must be read on an instrument'
      }]
    }
  } catch {
    return fresh
  }
}

const formatAge = (timestamp) => {
  if (!timestamp) return 'unremembered'
  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s held`
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes}m held` : `${Math.round(minutes / 60)}h held`
}

const awakeIds = (world) => new Set(
  REGIONS.filter(region => region.unlockedAt <= world.stage || world.status === 'mastered').map(region => region.id)
)

const centersFor = (world) => Object.fromEntries(REGIONS.map(region => {
  const placement = world.regions[region.id]
  return [region.id, { x: placement.x + region.width / 2, y: placement.y + region.height / 2 }]
}))

const conduitsFor = (world) => {
  const centers = centersFor(world)
  const awake = awakeIds(world)
  return world.edges
    .filter(edge => awake.has(edge.from) && awake.has(edge.to))
    .map(edge => {
      const from = centers[edge.from]
      const to = centers[edge.to]
      const distance = Math.hypot(to.x - from.x, to.y - from.y)
      const scars = (world.regions[edge.to]?.scars || 0) * 0.04
      return {
        ...edge,
        distance,
        ticks: Math.max(1, Math.round(distance / TRANSIT_UNIT)),
        atten: clamp(1 - distance / ATTEN_SPAN - scars, ATTEN_CAP, 1)
      }
    })
}

const outgoingLimit = (world, id) => (world.installed[id] === 'fork' ? 2 : 1)

const applyOrgan = (organ, signal) => {
  if (!organ) return signal
  return {
    charge: signal.charge * (organ.factor ?? 1),
    warmth: Math.min(WARMTH_CAP, signal.warmth + (organ.warmth || 0)),
    echo: signal.echo + (organ.echo || 0)
  }
}

/**
 * Deterministic tick simulator. One stimulus enters the palm and is transformed
 * by whichever organ each region holds; nerve length becomes both transit time
 * and charge attenuation, so the arrangement of the anatomy is the tuning.
 */
const conduct = (world) => {
  const conduits = conduitsFor(world)
  const awake = awakeIds(world)
  const outgoing = new Map()
  conduits.forEach(edge => {
    const list = outgoing.get(edge.from) || []
    list.push(edge)
    outgoing.set(edge.from, list)
  })

  const sourceId = Object.entries(world.installed).find(([, organId]) => ORGANS[organId]?.source)?.[0]
  const frames = []
  const emissions = []
  const seizures = []
  const absorbed = []
  const deadEnds = []
  const starved = []
  const reached = new Set()
  let packets = []
  let holds = []
  let uid = 0
  let endedAt = 0
  let peakLoad = 0

  const dispatch = (fromId, signal) => {
    const edges = outgoing.get(fromId) || []
    if (!edges.length) {
      deadEnds.push({ nodeId: fromId, charge: signal.charge })
      return
    }
    const organ = ORGANS[world.installed[fromId]]
    const branching = Boolean(organ?.branch) && edges.length > 1
    const chosen = branching ? edges : edges.slice(0, 1)
    const split = branching ? (organ.split ?? 0.72) : 1
    chosen.forEach(edge => {
      const charge = signal.charge * split * edge.atten
      if (charge < DEATH_CHARGE) {
        starved.push({ edgeId: edge.id, nodeId: edge.to, charge })
        return
      }
      packets.push({
        id: `p${uid += 1}`,
        edgeId: edge.id,
        from: edge.from,
        to: edge.to,
        remaining: edge.ticks,
        total: edge.ticks,
        signal: { charge, warmth: signal.warmth, echo: signal.echo }
      })
    })
  }

  for (let tick = 0; tick <= MAX_TICKS; tick += 1) {
    const arrivals = []

    if (tick === 0 && sourceId && awake.has(sourceId)) {
      arrivals.push({ to: sourceId, signal: { charge: SEED_CHARGE, warmth: 0, echo: 0 }, seed: true })
    }

    packets.forEach(packet => { packet.remaining -= 1 })
    packets.filter(packet => packet.remaining <= 0).forEach(packet => {
      arrivals.push({ to: packet.to, signal: packet.signal, edgeId: packet.edgeId })
    })
    packets = packets.filter(packet => packet.remaining > 0)

    holds.forEach(hold => { hold.remaining -= 1 })
    holds.filter(hold => hold.remaining <= 0).forEach(hold => {
      arrivals.push({ to: hold.nodeId, signal: hold.signal, released: true })
    })
    holds = holds.filter(hold => hold.remaining > 0)

    const load = {}
    arrivals.forEach(arrival => {
      reached.add(arrival.to)
      load[arrival.to] = (load[arrival.to] || 0) + arrival.signal.charge
    })
    Object.entries(load).forEach(([nodeId, value]) => {
      peakLoad = Math.max(peakLoad, value)
      if (value > SEIZE_LOAD) seizures.push({ tick, nodeId, load: value, kind: 'load' })
    })

    const ready = []
    arrivals.forEach(arrival => {
      const organ = ORGANS[world.installed[arrival.to]]
      if (organ?.hold && !arrival.released) {
        holds.push({
          nodeId: arrival.to,
          remaining: organ.hold,
          total: organ.hold,
          signal: applyOrgan(organ, arrival.signal)
        })
        return
      }
      if (organ?.emit != null) {
        if (arrival.signal.charge >= organ.emit) {
          emissions.push({
            tick,
            nodeId: arrival.to,
            charge: arrival.signal.charge,
            warmth: arrival.signal.warmth,
            echo: arrival.signal.echo
          })
        } else {
          absorbed.push({ tick, nodeId: arrival.to, charge: arrival.signal.charge, edgeId: arrival.edgeId })
        }
        return
      }
      if (organ?.gate != null && arrival.signal.charge < organ.gate) {
        absorbed.push({ tick, nodeId: arrival.to, charge: arrival.signal.charge, edgeId: arrival.edgeId, gate: true })
        return
      }
      const signal = arrival.released ? arrival.signal : applyOrgan(organ, arrival.signal)
      if (signal.charge < DEATH_CHARGE) {
        starved.push({ nodeId: arrival.to, charge: signal.charge })
        return
      }
      ready.push({ from: arrival.to, signal })
    })

    ready.forEach(item => dispatch(item.from, item.signal))

    if (packets.length + holds.length > SEIZE_SWARM) {
      seizures.push({ tick, nodeId: 'swarm', load: packets.length + holds.length, kind: 'swarm' })
    }

    const liveCharge = packets.reduce((sum, packet) => sum + packet.signal.charge, 0)
      + holds.reduce((sum, hold) => sum + hold.signal.charge, 0)
    const liveWarmth = Math.max(
      0,
      ...packets.map(packet => packet.signal.warmth),
      ...holds.map(hold => hold.signal.warmth)
    )
    const alive = packets.length + holds.length
    if (alive > 0) endedAt = tick

    frames.push({
      tick,
      charge: liveCharge,
      warmth: liveWarmth,
      alive,
      load: Math.max(0, ...Object.values(load), 0),
      emissions: emissions.filter(emission => emission.tick === tick).length,
      absorbed: absorbed.filter(entry => entry.tick === tick).length,
      seizure: seizures.some(entry => entry.tick === tick),
      packets: packets.map(packet => ({
        id: packet.id,
        edgeId: packet.edgeId,
        from: packet.from,
        to: packet.to,
        progress: 1 - packet.remaining / packet.total,
        charge: packet.signal.charge,
        warmth: packet.signal.warmth,
        echo: packet.signal.echo
      })),
      holds: holds.map(hold => ({
        nodeId: hold.nodeId,
        progress: 1 - hold.remaining / hold.total,
        charge: hold.signal.charge
      })),
      arrivals: [...new Set(arrivals.map(arrival => arrival.to))]
    })

    if (seizures.some(entry => entry.tick === tick)) break
    if (tick > 0 && alive === 0) break
  }

  return {
    frames,
    emissions,
    seizures,
    absorbed,
    deadEnds,
    starved,
    endedAt,
    peakLoad,
    reached,
    sourceId,
    conduits,
    frontier: [...reached]
  }
}

const cyclesFor = (world) => {
  const conduits = conduitsFor(world)
  const outgoing = new Map()
  conduits.forEach(edge => {
    const list = outgoing.get(edge.from) || []
    list.push(edge)
    outgoing.set(edge.from, list)
  })
  const cycles = []
  // A branching organ spends its split once per outgoing nerve, so that is the
  // factor a circuit actually carries through it.
  const flowFactor = (nodeId) => {
    const organ = ORGANS[world.installed[nodeId]]
    if (!organ) return 1
    if (organ.branch) return (outgoing.get(nodeId)?.length || 0) > 1 ? (organ.split ?? 1) : 1
    return organ.factor ?? 1
  }
  const walk = (startId, currentId, path, gain, ticks) => {
    ;(outgoing.get(currentId) || []).forEach(edge => {
      const organ = ORGANS[world.installed[edge.to]]
      const nextGain = gain * edge.atten * flowFactor(edge.to)
      const nextTicks = ticks + edge.ticks + (organ?.hold || 0)
      if (edge.to === startId) {
        cycles.push({ path: [...path, edge.to], gain: nextGain, ticks: nextTicks, edges: [...path.slice(1), edge.id] })
        return
      }
      if (path.includes(edge.to) || path.length > 6) return
      walk(startId, edge.to, [...path, edge.to], nextGain, nextTicks)
    })
  }
  const seen = new Set()
  conduits.forEach(edge => {
    if (seen.has(edge.from)) return
    seen.add(edge.from)
    walk(edge.from, edge.from, [edge.from], 1, 0)
  })
  return cycles.sort((left, right) => right.gain - left.gain)
}

const judge = (run, world) => {
  const augury = AUGURIES[Math.min(world.stage, AUGURIES.length - 1)]
  const demands = augury.demands.map(demand => ({ ...demand, met: demand.test(run, world) }))
  return { augury, demands, ready: demands.every(demand => demand.met) }
}

const nearestFree = (world, fromId) => {
  const centers = centersFor(world)
  const awake = awakeIds(world)
  return REGIONS
    .filter(region => awake.has(region.id) && region.id !== fromId)
    .filter(region => !world.edges.some(edge => edge.from === fromId && edge.to === region.id))
    .sort((left, right) => (
      Math.hypot(centers[left.id].x - centers[fromId].x, centers[left.id].y - centers[fromId].y)
      - Math.hypot(centers[right.id].x - centers[fromId].x, centers[right.id].y - centers[fromId].y)
    ))[0] || null
}

const pullVector = (world, fromId, toId, span = TIGHT_SPAN) => {
  const centers = centersFor(world)
  const from = centers[fromId]
  const to = centers[toId]
  const distance = Math.hypot(to.x - from.x, to.y - from.y) || 1
  if (distance <= span) return { dx: 0, dy: 0, distance }
  const scale = (distance - span) / distance
  return {
    dx: Math.round(-(to.x - from.x) * scale),
    dy: Math.round(-(to.y - from.y) * scale),
    distance
  }
}

const diagnose = (world, run, verdict) => {
  const unmetCodes = new Set(verdict.demands.filter(demand => !demand.met).map(demand => demand.code))
  const awake = awakeIds(world)
  const lensId = Object.entries(world.installed).find(([, organId]) => organId === 'lens')?.[0]
  const seatedElsewhere = (organId) => Object.entries(world.installed).find(([, id]) => id === organId)?.[0]

  if (!run.sourceId) {
    return {
      kind: 'install', organId: 'spark', nodeId: 'palm',
      title: 'nothing in the body can begin',
      detail: 'Without the contact spark no stimulus exists and the instrument stays flat. Seat it in the receiving palm.',
      action: 'seat contact spark in palm'
    }
  }

  if (!run.emissions.length && !lensId) {
    return {
      kind: 'install', organId: 'lens', nodeId: 'bell',
      title: 'the body has no way out',
      detail: 'Charge can circulate forever without being felt. Only the weather lens converts an arrival into an outward emission.',
      action: 'seat weather lens in bell'
    }
  }

  if (!world.edges.some(edge => edge.from === run.sourceId)) {
    const target = nearestFree(world, run.sourceId)
    return {
      kind: 'grow', from: run.sourceId, to: target?.id,
      title: 'the palm holds a stimulus it cannot pass on',
      detail: `The trace shows 6.0 charge arriving at tick 0 and dying there. Drag the palm's port onto ${target?.short || 'another awake region'}.`,
      action: target ? `grow palm → ${target.short}` : 'wake another region first'
    }
  }

  if (lensId && !run.reached.has(lensId)) {
    const frontier = [...run.reached].filter(id => id !== lensId)
    const stalled = frontier.find(id => !world.edges.some(edge => edge.from === id))
      || frontier.at(-1)
      || run.sourceId
    const blocked = world.edges.filter(edge => edge.from === stalled).length >= outgoingLimit(world, stalled)
    return {
      kind: blocked ? 'reroute' : 'grow', from: stalled, to: lensId,
      title: `the signal never reaches the ${regionById(lensId).short}`,
      detail: blocked
        ? `${regionById(stalled).short} already spends its only nerve elsewhere. Molt that nerve, then carry the route toward the ${regionById(lensId).short}.`
        : `The trace stops at ${regionById(stalled).short}. Grow a nerve from there toward the ${regionById(lensId).short}.`,
      action: blocked ? `molt ${regionById(stalled).short}'s nerve` : `grow ${regionById(stalled).short} → ${regionById(lensId).short}`
    }
  }

  if (run.seizures.length) {
    const seizure = run.seizures[0]
    const sieve = awake.has('mask') || Object.keys(world.installed).length > 3 ? 'sieve' : null
    const loop = cyclesFor(world)[0]
    if (sieve && ORGANS.sieve.unlockedAt <= world.stage && loop) {
      const host = loop.path.find(id => world.installed[id] === 'ember' || !world.installed[id]) || loop.path[1]
      return {
        kind: 'install', organId: 'sieve', nodeId: host,
        title: `${seizure.nodeId === 'swarm' ? 'the body filled with signal' : `${regionById(seizure.nodeId)?.short} took ${round1(seizure.load)} charge at once`}`,
        detail: `The circuit runs at gain ${round1(loop.gain)} — above 1.0 it doubles until the ceiling of ${SEIZE_LOAD} tears it open. Put the damping sieve inside the loop.`,
        action: `seat damping sieve in ${regionById(host).short}`
      }
    }
    const loopEdge = loop?.edges?.[0]
    const edge = world.edges.find(candidate => candidate.id === loopEdge)
    return {
      kind: edge ? 'stretch' : 'wait', from: edge?.from, to: edge?.to,
      title: `${regionById(seizure.nodeId)?.short || 'the body'} took more charge than it can hold`,
      detail: `Gain ${round1(loop?.gain || 0)} is too high. Longer nerves lose more — push the anatomy apart until the circuit settles under 1.0.`,
      action: edge ? `stretch ${regionById(edge.from).short} → ${regionById(edge.to).short}` : 'lengthen the circuit by hand'
    }
  }

  if (run.absorbed.length && !(unmetCodes.size === 1 && unmetCodes.has('vow'))) {
    const weakest = run.absorbed.reduce((low, entry) => (entry.charge > low.charge ? low : entry), run.absorbed[0])
    const edge = world.edges.find(candidate => candidate.id === weakest.edgeId)
    const vector = edge ? pullVector(world, edge.from, edge.to) : null
    // Only worth saying when the nerve is genuinely long enough to be the cause.
    if (edge && vector && Math.hypot(vector.dx, vector.dy) >= 14) {
      return {
        kind: 'pull', from: edge.from, to: edge.to, dx: vector.dx, dy: vector.dy,
        title: `${round1(weakest.charge)} charge was absorbed at the ${regionById(weakest.nodeId).short}`,
        detail: `${Math.round(vector.distance)} units of nerve cost too much; arrivals under ${ORGANS[world.installed[weakest.nodeId]]?.gate ?? ORGANS.lens.emit} are lost silently. Pull the ${regionById(edge.to).short} closer to the ${regionById(edge.from).short}.`,
        action: `pull ${regionById(edge.to).short} ${Math.round(Math.hypot(vector.dx, vector.dy))} units closer`
      }
    }
  }

  const demandOrganOnRoute = (organId, title, absentDetail) => {
    const organ = ORGANS[organId]
    const host = seatedElsewhere(organId)
    if (!host || !awake.has(host)) {
      const target = [...run.reached].find(id => id !== lensId && !world.installed[id])
        || (awake.has(organ.home) ? organ.home : [...run.reached].find(id => id !== lensId && id !== run.sourceId))
      return {
        kind: target ? 'install' : 'wait', organId, nodeId: target,
        title,
        detail: absentDetail,
        action: target ? `seat ${organ.label} in ${regionById(target).short}` : 'wake a region that can hold it'
      }
    }
    const feeder = world.edges.find(edge => edge.to === lensId && edge.from !== host)
    return {
      kind: 'splice', host, to: lensId, from: feeder?.from,
      title,
      detail: `The ${organ.label} sits in ${regionById(host).short}, but the branch that reaches the ${regionById(lensId).short} never crosses it. Splice ${regionById(host).short} into the route immediately before the lens.`,
      action: `route ${regionById(host).short} into the ${regionById(lensId).short}`
    }
  }

  if (unmetCodes.has('warm')) {
    return demandOrganOnRoute(
      'ember',
      'the emission arrived cold',
      'Only the temper ember adds warmth. Seat it in a region the signal already crosses.'
    )
  }

  if (unmetCodes.has('fold')) {
    return demandOrganOnRoute(
      'coil',
      'the emission remembered nothing',
      'Only the afterimage coil stamps a remembered fold. Seat it on the route, before the lens.'
    )
  }

  const shortenLoop = (loop, title, detail) => {
    const slack = loop.edges
      .map(id => run.conduits.find(conduit => conduit.id === id))
      .filter(conduit => conduit && conduit.distance > TIGHT_SPAN + 14)
      .sort((left, right) => right.distance - left.distance)[0]

    if (slack) {
      const vector = pullVector(world, slack.from, slack.to)
      return {
        kind: 'pull', from: slack.from, to: slack.to, dx: vector.dx, dy: vector.dy,
        title,
        detail: `${detail} Its longest nerve spans ${Math.round(slack.distance)} units and spends ${Math.round((1 - slack.atten) * 100)}% of everything crossing it — pull the ${regionById(slack.to).short} closer until the circuit sustains itself just under the ceiling.`,
        action: `pull ${regionById(slack.to).short} toward ${regionById(slack.from).short}`
      }
    }

    // Geometry is exhausted: the remaining loss is an organ standing inside the circuit.
    const drag = loop.path.find(id => {
      const organ = ORGANS[world.installed[id]]
      return organ && !organ.source && organ.factor != null && organ.factor < 1
    })
    if (drag) {
      const organ = ORGANS[world.installed[drag]]
      return {
        kind: 'lift', nodeId: drag,
        title: `${title.replace(/^the circuit/, 'the circuit')} — and it is already as tight as it can be drawn`,
        detail: `Every nerve in the loop is at its shortest useful length. The ${organ.label} in ${regionById(drag).short} spends ${Math.round((1 - organ.factor) * 100)}% of the charge on every lap. Lift it out of the circuit and the body keeps more of itself, at the cost of whatever it was contributing.`,
        action: `lift the ${organ.label} out of ${regionById(drag).short}`
      }
    }

    return {
      kind: 'wait',
      title,
      detail: `${detail} The circuit is drawn as tightly as it can be and carries no organ worth removing. Re-route it through fewer nerves, or let the returning mask sit directly beside the palm.`,
      action: 'shorten the circuit by hand'
    }
  }

  if (unmetCodes.has('alive')) {
    const loop = cyclesFor(world)[0]
    if (!loop) {
      const mirrorHost = seatedElsewhere('mirror')
      if ((!mirrorHost || !awake.has(mirrorHost)) && ORGANS.mirror.unlockedAt <= world.stage) {
        const target = awake.has('mask') ? 'mask' : [...run.reached].find(id => id !== lensId && !world.installed[id])
        return {
          kind: target ? 'install' : 'wait', organId: 'mirror', nodeId: target,
          title: 'the body has no gain, so it cannot outlast one stimulus',
          detail: 'Every nerve and most organs lose charge. Only the return mirror multiplies it. Seat it, then close a circuit back into the palm.',
          action: target ? `seat return mirror in ${regionById(target).short}` : 'wake the returning mask'
        }
      }
      return {
        kind: 'circuit', host: mirrorHost, to: run.sourceId,
        title: 'nothing returns to the palm',
        detail: `The trace ends at tick ${run.endedAt} because the signal always runs out of body. Carry a branch through ${regionById(mirrorHost).short} and back into the palm so the familiar can restimulate itself.`,
        action: `close the circuit through ${regionById(mirrorHost).short}`
      }
    }
    return shortenLoop(
      loop,
      `the circuit runs at gain ${round1(loop.gain)} and decays by tick ${run.endedAt}`,
      'Gain under 1.0 always dies.'
    )
  }

  if (unmetCodes.has('emit') || unmetCodes.has('apart')) {
    const forkHost = seatedElsewhere('fork')
    if (ORGANS.fork.unlockedAt <= world.stage) {
      if (!forkHost || !awake.has(forkHost)) {
        const target = awake.has('bough')
          ? 'bough'
          : [...run.reached].find(id => id !== lensId && id !== run.sourceId)
        return {
          kind: target ? 'install' : 'wait', organId: 'fork', nodeId: target,
          title: 'one nerve leaves each region, so one emission leaves the body',
          detail: 'The choice fork is the only organ that permits two outgoing nerves. Seat it, then divide the route around it.',
          action: target ? `seat choice fork in ${regionById(target).short}` : 'wake the decision bough'
        }
      }
      const branches = world.edges.filter(edge => edge.from === forkHost)
      if (!run.reached.has(forkHost) || branches.length < 2) {
        return {
          kind: 'branch', host: forkHost, to: lensId,
          title: run.reached.has(forkHost)
            ? `${regionById(forkHost).short} branches but only one nerve leaves it`
            : `the signal never crosses ${regionById(forkHost).short}`,
          detail: `Re-trunk the body so the stimulus reaches ${regionById(forkHost).short} and divides there: one branch straight to the ${regionById(lensId).short}, the other through a relay that rejoins it later. Two arrivals, two emissions.`,
          action: `divide the route around ${regionById(forkHost).short}`
        }
      }
    }
    const loop = cyclesFor(world)[0]
    if (loop) {
      return shortenLoop(
        loop,
        'the body emits once and goes quiet',
        `Its circuit runs at gain ${round1(loop.gain)}, so the next pass arrives too weak to clear the lens.`
      )
    }
    const relay = REGIONS.find(region => awake.has(region.id)
      && region.id !== lensId
      && region.id !== run.sourceId
      && !world.edges.some(edge => edge.from === region.id && edge.to === lensId))
    return {
      kind: relay ? 'grow' : 'wait', from: relay?.id, to: lensId,
      title: 'only one branch ever reaches the lens',
      detail: `A second emission needs a second arrival. Grow another nerve into the ${regionById(lensId).short} along a longer path so it lands on a later tick.`,
      action: relay ? `grow ${relay.short} → ${regionById(lensId).short}` : 'wake another region'
    }
  }

  if (unmetCodes.has('calm')) {
    return {
      kind: 'install', organId: 'sieve', nodeId: cyclesFor(world)[0]?.path?.[1] || 'archive',
      title: 'the circuit tears itself open',
      detail: `Peak load reached ${round1(run.peakLoad)} against a ceiling of ${SEIZE_LOAD}. Damp the loop or stretch it apart.`,
      action: 'seat damping sieve in the circuit'
    }
  }

  if (unmetCodes.has('vow')) {
    return {
      kind: 'vow',
      title: 'a body that conducts alone needs a temperament',
      detail: 'Choose what its autonomous stimuli will favour. The choice persists with the familiar and sets its own cadence.',
      action: 'keep a warm perimeter'
    }
  }

  return {
    kind: 'ready',
    title: 'the instrument agrees with the augury',
    detail: `${run.emissions.length} emission${run.emissions.length === 1 ? '' : 's'}, peak load ${round1(run.peakLoad)}, conducting through tick ${run.endedAt}. Conduct it for record.`,
    action: 'the trace satisfies the augury'
  }
}

const shapeFor = (form, width, height) => {
  const notch = 16 + form * 2
  if (form % 3 === 0) {
    return `M 22 4 H ${width - 38} Q ${width - 8} 4 ${width - 4} 34 L ${width - 12} ${height - 28} Q ${width - 18} ${height - 4} ${width - 46} ${height - 4} H 30 Q 4 ${height - 8} 7 ${height - 34} L 3 42 Q 4 12 22 4 Z`
  }
  if (form % 3 === 1) {
    return `M ${notch} 6 L ${width - 28} 2 Q ${width - 4} 6 ${width - 6} 30 L ${width - 2} ${height - 44} Q ${width - 6} ${height - 12} ${width - 34} ${height - 5} L 38 ${height - 2} Q 9 ${height - 8} 6 ${height - 32} L 2 38 Q 4 14 ${notch} 6 Z`
  }
  return `M 28 3 H ${width - 44} L ${width - 5} 28 L ${width - 10} ${height - 38} Q ${width - 12} ${height - 8} ${width - 42} ${height - 4} H 24 L 4 ${height - 31} L 8 34 Q 8 9 28 3 Z`
}

const controlFor = (from, to, bend) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy) || 1
  return {
    x: (from.x + to.x) / 2 - dy / distance * bend,
    y: (from.y + to.y) / 2 + dx / distance * bend
  }
}

const curveBetween = (from, to, bend = 0) => {
  const control = controlFor(from, to, bend)
  return `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`
}

const pointOnCurve = (from, to, bend, u) => {
  const control = controlFor(from, to, bend)
  const inverse = 1 - u
  return {
    x: inverse * inverse * from.x + 2 * inverse * u * control.x + u * u * to.x,
    y: inverse * inverse * from.y + 2 * inverse * u * control.y + u * u * to.y
  }
}

const bendFor = (edge) => 20 + (edge.from.length * 11 + edge.to.length * 7) % 32

const RegionInterior = ({ form, organ, width, height, active }) => {
  const lines = 3 + form % 3
  return (
    <g className={`fm-region-interior ${active ? 'is-active' : ''}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <path
          key={index}
          d={`M ${28 + index * 6} ${82 + index * 14} C ${width * 0.34} ${60 + index * 24}, ${width * 0.62} ${112 - index * 7}, ${width - 30 - index * 4} ${78 + index * 17}`}
        />
      ))}
      <circle cx={width * 0.32} cy={height - 44} r="8" />
      <circle cx={width * 0.7} cy={height - 47} r="5" />
      {organ && (
        <g className="fm-organ-glyph" transform={`translate(${width / 2} ${height / 2 + 8})`} style={{ '--organ-color': organ.color }}>
          <circle r="33" />
          <circle r="24" />
          <text y="8">{organ.mark}</text>
        </g>
      )}
    </g>
  )
}

const VitalsTape = ({ run, playTick, augury, onScrub, reducedMotion }) => {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const [size, setSize] = useState({ width: 720, height: 132 })

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

    const padLeft = 40
    const padRight = 12
    const padTop = 16
    const padBottom = 22
    const plotWidth = Math.max(10, width - padLeft - padRight)
    const plotHeight = Math.max(10, height - padTop - padBottom)
    const ceiling = SEIZE_LOAD + 1.5
    const xFor = (tick) => padLeft + (tick / MAX_TICKS) * plotWidth
    const yFor = (value) => padTop + plotHeight - clamp(value / ceiling, 0, 1) * plotHeight

    ctx.strokeStyle = 'rgba(203, 226, 220, .09)'
    ctx.lineWidth = 1
    for (let tick = 0; tick <= MAX_TICKS; tick += 4) {
      ctx.beginPath()
      ctx.moveTo(Math.round(xFor(tick)) + 0.5, padTop)
      ctx.lineTo(Math.round(xFor(tick)) + 0.5, padTop + plotHeight)
      ctx.stroke()
    }
    for (let value = 0; value <= ceiling; value += 3) {
      ctx.beginPath()
      ctx.moveTo(padLeft, Math.round(yFor(value)) + 0.5)
      ctx.lineTo(padLeft + plotWidth, Math.round(yFor(value)) + 0.5)
      ctx.stroke()
    }

    ctx.setLineDash([4, 5])
    ctx.strokeStyle = 'rgba(255, 113, 91, .5)'
    ctx.beginPath()
    ctx.moveTo(padLeft, Math.round(yFor(SEIZE_LOAD)) + 0.5)
    ctx.lineTo(padLeft + plotWidth, Math.round(yFor(SEIZE_LOAD)) + 0.5)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(189, 121, 174, .42)'
    ctx.beginPath()
    ctx.moveTo(padLeft, Math.round(yFor(ORGANS.lens.emit)) + 0.5)
    ctx.lineTo(padLeft + plotWidth, Math.round(yFor(ORGANS.lens.emit)) + 0.5)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = 'rgba(203, 226, 220, .42)'
    ctx.font = '8px "Courier New", monospace'
    ctx.textAlign = 'right'
    ctx.fillText('seize', padLeft - 6, yFor(SEIZE_LOAD) + 3)
    ctx.fillText('emit', padLeft - 6, yFor(ORGANS.lens.emit) + 3)
    ctx.fillText('0', padLeft - 6, yFor(0) + 3)
    ctx.textAlign = 'left'

    const frames = run?.frames || []

    if (!frames.length) {
      ctx.fillStyle = 'rgba(203, 226, 220, .3)'
      ctx.font = '10px "Courier New", monospace'
      ctx.fillText('no trace yet — conduct a stimulus to draw the body on this tape', padLeft + 8, padTop + plotHeight / 2)
    } else {
      ctx.beginPath()
      ctx.moveTo(xFor(frames[0].tick), yFor(0))
      frames.forEach(frame => ctx.lineTo(xFor(frame.tick), yFor(frame.charge)))
      ctx.lineTo(xFor(frames.at(-1).tick), yFor(0))
      ctx.closePath()
      const gradient = ctx.createLinearGradient(0, padTop, 0, padTop + plotHeight)
      gradient.addColorStop(0, 'rgba(74, 163, 156, .5)')
      gradient.addColorStop(1, 'rgba(74, 163, 156, .05)')
      ctx.fillStyle = gradient
      ctx.fill()

      ctx.strokeStyle = 'rgba(126, 227, 214, .92)'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      frames.forEach((frame, index) => {
        const x = xFor(frame.tick)
        const y = yFor(frame.charge)
        if (index === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      ctx.strokeStyle = 'rgba(227, 161, 59, .85)'
      ctx.lineWidth = 1.2
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      frames.forEach((frame, index) => {
        const x = xFor(frame.tick)
        const y = yFor(frame.warmth)
        if (index === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.setLineDash([])

      run.absorbed.forEach(entry => {
        ctx.strokeStyle = 'rgba(203, 226, 220, .3)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(xFor(entry.tick), yFor(0))
        ctx.lineTo(xFor(entry.tick), yFor(entry.charge))
        ctx.stroke()
      })

      run.emissions.forEach(emission => {
        const x = xFor(emission.tick)
        ctx.strokeStyle = 'rgba(189, 121, 174, .9)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, padTop + plotHeight)
        ctx.lineTo(x, padTop + 4)
        ctx.stroke()
        ctx.fillStyle = '#e4b7db'
        ctx.beginPath()
        ctx.arc(x, padTop + 4, 3.6, 0, Math.PI * 2)
        ctx.fill()
      })

      run.seizures.forEach(seizure => {
        const x = xFor(seizure.tick)
        ctx.strokeStyle = 'rgba(255, 113, 91, .95)'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(x - 6, padTop)
        ctx.lineTo(x + 6, padTop + plotHeight)
        ctx.moveTo(x + 6, padTop)
        ctx.lineTo(x - 6, padTop + plotHeight)
        ctx.stroke()
      })

      const head = frames[clamp(playTick, 0, frames.length - 1)]
      const headX = xFor(head.tick)
      ctx.strokeStyle = 'rgba(232, 244, 240, .9)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(headX, padTop - 6)
      ctx.lineTo(headX, padTop + plotHeight + 6)
      ctx.stroke()
      ctx.fillStyle = 'rgba(232, 244, 240, .95)'
      ctx.beginPath()
      ctx.moveTo(headX - 4, padTop - 6)
      ctx.lineTo(headX + 4, padTop - 6)
      ctx.lineTo(headX, padTop - 1)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = 'rgba(203, 226, 220, .58)'
      ctx.font = '8px "Courier New", monospace'
      ctx.fillText(
        `t${String(head.tick).padStart(2, '0')}  charge ${round1(head.charge)}  warmth ${round1(head.warmth)}  live ${head.alive}`,
        clamp(headX + 6, padLeft, padLeft + plotWidth - 170),
        padTop + plotHeight + 15
      )
    }

    ctx.fillStyle = 'rgba(203, 226, 220, .34)'
    ctx.font = '8px "Courier New", monospace'
    ctx.fillText(augury ? augury.label.toUpperCase() : 'VITALS', padLeft + 2, padTop - 6)
    ctx.textAlign = 'right'
    ctx.fillText(`${MAX_TICKS} TICK WINDOW`, padLeft + plotWidth, padTop - 6)
    ctx.textAlign = 'left'
  }, [augury, playTick, reducedMotion, run, size])

  const handleScrub = useCallback((event) => {
    const canvas = canvasRef.current
    if (!canvas || !run?.frames?.length) return
    const rect = canvas.getBoundingClientRect()
    const padLeft = 40
    const plotWidth = Math.max(10, rect.width - padLeft - 12)
    const ratio = clamp((event.clientX - rect.left - padLeft) / plotWidth, 0, 1)
    const tick = Math.round(ratio * MAX_TICKS)
    let closest = 0
    run.frames.forEach((frame, index) => {
      if (Math.abs(frame.tick - tick) < Math.abs(run.frames[closest].tick - tick)) closest = index
    })
    onScrub(closest)
  }, [onScrub, run])

  return (
    <div className="fm-tape" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
        role="img"
        aria-label={run?.frames?.length
          ? `Vitals tape: ${run.emissions.length} emissions, peak load ${round1(run.peakLoad)}, conducting through tick ${run.endedAt}`
          : 'Vitals tape, empty until a stimulus is conducted'}
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

const InterfaceFamiliar = ({ category, experiment }) => {
  const [world, setWorld] = useState(loadWorld)
  const [selectedRegionId, setSelectedRegionId] = useState('palm')
  const [selectedEdgeId, setSelectedEdgeId] = useState(null)
  const [armedOrganId, setArmedOrganId] = useState(null)
  const [armedFromId, setArmedFromId] = useState(null)
  const [organDrag, setOrganDrag] = useState(null)
  const [regionDrag, setRegionDrag] = useState(null)
  const [wireDrag, setWireDrag] = useState(null)
  const [run, setRun] = useState(null)
  const [playTick, setPlayTick] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [mutation, setMutation] = useState(null)
  const [savedAt, setSavedAt] = useState(() => world.lastSaved)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [portrait, setPortrait] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const [message, setMessage] = useState(() => (world.unlocked
    ? `augury ${Math.min(world.stage + 1, AUGURIES.length)} resumed // ${world.traces.length} recorded trace${world.traces.length === 1 ? '' : 's'} on the tape`
    : 'six regions, eight loose organs, and an instrument that has never been given anything to measure'))

  const surfaceRef = useRef(null)
  const svgRef = useRef(null)
  const worldRef = useRef(world)
  const runRef = useRef(null)
  const organDragRef = useRef(null)
  const regionDragRef = useRef(null)
  const wireDragRef = useRef(null)
  const frameRef = useRef(null)
  const playTickRef = useRef(0)
  const clockRef = useRef(0)
  const lastStampRef = useRef(0)
  const mutationTimerRef = useRef(null)
  const saveTimerRef = useRef(null)
  const autoTimerRef = useRef(null)
  const audioContextRef = useRef(null)
  const soundRef = useRef(false)
  const suppressOrganClickRef = useRef(false)
  const suppressWireClickRef = useRef(false)
  const soundedTickRef = useRef(-1)

  useEffect(() => { worldRef.current = world }, [world])
  useEffect(() => { runRef.current = run }, [run])
  useEffect(() => { soundRef.current = soundOn }, [soundOn])
  useEffect(() => { playTickRef.current = playTick }, [playTick])

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const width = window.matchMedia('(max-width: 780px)')
    const updateMotion = () => setReducedMotion(motion.matches)
    const updateWidth = () => setPortrait(width.matches)
    updateMotion()
    updateWidth()
    motion.addEventListener?.('change', updateMotion)
    width.addEventListener?.('change', updateWidth)
    return () => {
      motion.removeEventListener?.('change', updateMotion)
      width.removeEventListener?.('change', updateWidth)
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
        // Local memory deepens the familiar but is not required to inhabit it.
      }
    }, 180)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [world])

  useEffect(() => () => {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
    if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current)
    audioContextRef.current?.close?.()
  }, [])

  const preview = useMemo(() => conduct(world), [world])
  const verdict = useMemo(() => judge(preview, world), [preview, world])
  const guidance = useMemo(() => diagnose(world, preview, verdict), [preview, verdict, world])
  const cycles = useMemo(() => cyclesFor(world), [world])
  const augury = verdict.augury
  const awake = useMemo(() => awakeIds(world), [world])
  const editable = world.unlocked && world.status === 'composing' && !playing && !mutation
  const unlockedOrgans = useMemo(
    () => Object.values(ORGANS).filter(organ => organ.unlockedAt <= world.stage || world.status === 'mastered'),
    [world.stage, world.status]
  )
  const selectedRegion = regionById(selectedRegionId) || REGIONS[0]
  const selectedOrgan = ORGANS[world.installed[selectedRegionId]] || null
  const selectedEdge = world.edges.find(edge => edge.id === selectedEdgeId) || null
  const vow = world.vow ? VOWS[world.vow] : null
  const liveFrame = run?.frames?.[clamp(playTick, 0, (run.frames.length || 1) - 1)] || null

  const toScreen = useCallback((x, y) => (portrait
    ? { x: 30 + (y - 28) * 0.9375, y: 70 + (x - 24) * 0.9888 }
    : { x, y }), [portrait])

  const toWorld = useCallback((x, y) => (portrait
    ? { x: 24 + (y - 70) / 0.9888, y: 28 + (x - 30) / 0.9375 }
    : { x, y }), [portrait])

  const boxes = useMemo(() => Object.fromEntries(REGIONS.map(region => {
    const placement = world.regions[region.id]
    const origin = toScreen(placement.x, placement.y)
    return [region.id, portrait
      ? { ...origin, width: region.height * 0.9375, height: region.width * 0.9888 }
      : { ...origin, width: region.width, height: region.height }]
  })), [portrait, toScreen, world.regions])

  const centerOf = useCallback((id) => {
    const box = boxes[id]
    return box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : { x: 0, y: 0 }
  }, [boxes])

  const portOf = useCallback((id) => {
    const box = boxes[id]
    return box ? { x: box.x + box.width - 10, y: box.y + box.height * 0.56 } : { x: 0, y: 0 }
  }, [boxes])

  const conduits = preview.conduits
  const conduitById = useMemo(() => new Map(conduits.map(edge => [edge.id, edge])), [conduits])

  const bodySpine = useMemo(() => {
    const visible = REGIONS.filter(region => awake.has(region.id))
    if (visible.length < 2) return ''
    return visible.map((region, index) => {
      const center = centerOf(region.id)
      if (index === 0) return `M ${center.x} ${center.y}`
      const previous = centerOf(visible[index - 1].id)
      return `Q ${(previous.x + center.x) / 2} ${(previous.y + center.y) / 2 + (index % 2 ? -50 : 50)} ${center.x} ${center.y}`
    }).join(' ')
  }, [awake, centerOf])

  const phase = world.status === 'mastered'
    ? 'autonomous'
    : world.status === 'ruined'
      ? 'dissociated'
      : mutation
        ? 'molting'
        : playing
          ? 'conducting'
          : verdict.ready
            ? 'coherent'
            : world.stage > 0
              ? 'instrumented'
              : world.unlocked
                ? 'receptive'
                : 'sealed'

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

  const regionAtClient = useCallback((clientX, clientY) => {
    const id = document.elementFromPoint(clientX, clientY)?.closest?.('[data-familiar-region]')?.dataset.familiarRegion || null
    if (!id) return null
    return awakeIds(worldRef.current).has(id) ? id : null
  }, [])

  const playTones = useCallback((nodeIds, success) => {
    if (!soundRef.current || !nodeIds.length) return
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const context = audioContextRef.current || new AudioContext()
      audioContextRef.current = context
      context.resume?.()
      const start = context.currentTime + 0.01
      nodeIds.slice(0, 4).forEach((nodeId, index) => {
        const organ = ORGANS[worldRef.current.installed[nodeId]]
        if (!organ) return
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = index % 2 ? 'triangle' : 'sine'
        oscillator.frequency.value = organ.tone * (success ? 1 : 0.7)
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(0.045, start + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3)
        oscillator.connect(gain).connect(context.destination)
        oscillator.start(start)
        oscillator.stop(start + 0.32)
      })
    } catch {
      // Sound is a voluntary shadow of the visible instrument.
    }
  }, [])

  const wake = useCallback(() => {
    setWorld(current => ({
      ...current,
      unlocked: true,
      log: [...current.log, { id: `wake-${Date.now()}`, stage: current.stage, text: 'the hand entered; loose organs became measurable anatomy' }].slice(-8)
    }))
    setMessage('seat organs, grow nerves, then conduct a stimulus and read what the tape says the body did')
    requestAnimationFrame(() => surfaceRef.current?.focus())
  }, [])

  const installOrgan = useCallback((organId, regionId) => {
    const organ = ORGANS[organId]
    const region = regionById(regionId)
    const current = worldRef.current
    if (!organ || !region || !awakeIds(current).has(regionId) || !editable) return
    setWorld(previous => {
      const installed = { ...previous.installed }
      Object.entries(installed).forEach(([otherId, id]) => {
        if (id === organId && otherId !== regionId) delete installed[otherId]
      })
      installed[regionId] = organId
      return { ...previous, installed }
    })
    setArmedOrganId(null)
    setSelectedRegionId(regionId)
    setMessage(`${organ.label} seated in ${region.label} // ${region.short} now ${organ.verb} // ${organ.note}`)
  }, [editable])

  const liftOrgan = useCallback((regionId) => {
    if (!editable || !worldRef.current.installed[regionId]) return
    const organ = ORGANS[worldRef.current.installed[regionId]]
    setWorld(previous => {
      const installed = { ...previous.installed }
      delete installed[regionId]
      return { ...previous, installed }
    })
    setMessage(`${organ.label} returned to the dock // ${regionById(regionId).short} passes charge through untouched`)
  }, [editable])

  const beginOrganDrag = useCallback((event, organId) => {
    if (!editable) return
    event.preventDefault()
    event.stopPropagation()
    const next = { id: organId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false, targetId: null }
    organDragRef.current = next
    setOrganDrag(next)
    setArmedOrganId(organId)
  }, [editable])

  useEffect(() => {
    if (!organDrag?.id) return undefined
    const handleMove = (event) => {
      const current = organDragRef.current
      if (!current) return
      const moved = current.moved || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > DRAG_THRESHOLD
      const next = { ...current, x: event.clientX, y: event.clientY, moved, targetId: moved ? regionAtClient(event.clientX, event.clientY) : null }
      organDragRef.current = next
      setOrganDrag(next)
    }
    const handleUp = (event) => {
      const current = organDragRef.current
      if (!current) return
      const targetId = regionAtClient(event.clientX, event.clientY)
      if (current.moved && targetId) installOrgan(current.id, targetId)
      else if (current.moved) setMessage('the loose organ found no receiving region // tap the organ, then tap a region')
      else {
        setArmedOrganId(previous => (previous === current.id ? null : current.id))
        setMessage(`${ORGANS[current.id].label} armed // ${ORGANS[current.id].reading}`)
      }
      suppressOrganClickRef.current = true
      window.setTimeout(() => { suppressOrganClickRef.current = false }, 0)
      organDragRef.current = null
      setOrganDrag(null)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [installOrgan, organDrag?.id, regionAtClient])

  const beginRegionDrag = useCallback((event, regionId) => {
    if (!editable) return
    const point = worldPointFromClient(event.clientX, event.clientY)
    if (!point) return
    event.preventDefault()
    event.stopPropagation()
    const placement = worldRef.current.regions[regionId]
    const next = { id: regionId, startX: point.x, startY: point.y, originX: placement.x, originY: placement.y, moved: false }
    regionDragRef.current = next
    setRegionDrag(next)
    setSelectedRegionId(regionId)
  }, [editable, worldPointFromClient])

  useEffect(() => {
    if (!regionDrag?.id) return undefined
    const handleMove = (event) => {
      const current = regionDragRef.current
      if (!current) return
      const point = worldPointFromClient(event.clientX, event.clientY)
      if (!point) return
      const region = regionById(current.id)
      const moved = current.moved || Math.hypot(point.x - current.startX, point.y - current.startY) > 4
      setWorld(previous => ({
        ...previous,
        regions: {
          ...previous.regions,
          [current.id]: {
            ...previous.regions[current.id],
            x: clamp(current.originX + point.x - current.startX, 24, VIEWBOX.width - region.width - 24),
            y: clamp(current.originY + point.y - current.startY, 28, VIEWBOX.height - region.height - 28)
          }
        }
      }))
      const next = { ...current, moved }
      regionDragRef.current = next
      setRegionDrag(next)
    }
    const handleUp = () => {
      const current = regionDragRef.current
      if (current?.moved) {
        const next = conduct(worldRef.current)
        const loop = cyclesFor(worldRef.current)[0]
        setMessage(`${regionById(current.id).label} moved // ${next.conduits.length} nerve${next.conduits.length === 1 ? '' : 's'} re-timed${loop ? ` // circuit gain ${round1(loop.gain)}` : ''}`)
      }
      regionDragRef.current = null
      setRegionDrag(null)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [regionDrag?.id, worldPointFromClient])

  const rememberShedding = useCallback((edge, sheddings) => {
    const next = { ...edge, shedAt: Date.now() }
    return [...sheddings.filter(entry => entry.id !== edge.id), next].slice(-10)
  }, [])

  const growNerve = useCallback((from, to, force = false) => {
    const current = worldRef.current
    if (!editable || !regionById(from) || !regionById(to) || from === to) return false
    if (!awakeIds(current).has(to)) {
      setMessage(`${regionById(to).short} has not woken yet`)
      return false
    }
    if (current.edges.some(edge => edge.from === from && edge.to === to)) {
      setMessage(`${regionById(from).short} already reaches ${regionById(to).short}`)
      setArmedFromId(null)
      return true
    }
    const outgoing = current.edges.filter(edge => edge.from === from)
    const limit = outgoingLimit(current, from)
    if (outgoing.length >= limit && !force) {
      setSelectedEdgeId(outgoing[0].id)
      setMessage(`${regionById(from).short} has ${limit === 1 ? 'one mouth' : 'two branches'} and they are spent // molt one, or seat a choice fork to hold two`)
      return false
    }
    setWorld(previous => {
      let edges = [...previous.edges]
      let sheddings = [...previous.sheddings]
      while (edges.filter(edge => edge.from === from).length >= limit) {
        const victim = edges.filter(edge => edge.from === from).at(-1)
        sheddings = rememberShedding(victim, sheddings)
        edges = edges.filter(edge => edge.id !== victim.id)
      }
      const prior = sheddings.find(edge => edge.from === from && edge.to === to)
      return {
        ...previous,
        edges: [...edges, {
          id: edgeIdFor(from, to),
          from,
          to,
          crossings: prior?.crossings || 0,
          memory: prior?.memory || 0
        }].slice(-12),
        sheddings: sheddings.filter(edge => edge.id !== edgeIdFor(from, to))
      }
    })
    setArmedFromId(null)
    setSelectedEdgeId(edgeIdFor(from, to))
    const edge = conduitsFor({ ...current, edges: [...current.edges, { id: edgeIdFor(from, to), from, to }] }).find(candidate => candidate.id === edgeIdFor(from, to))
    setMessage(`${regionById(from).short} → ${regionById(to).short} grown // ${edge?.ticks || 1} tick${(edge?.ticks || 1) === 1 ? '' : 's'} of transit, ${Math.round((1 - (edge?.atten || 1)) * 100)}% charge lost to distance`)
    return true
  }, [editable, rememberShedding])

  const moltNerve = useCallback((edgeId) => {
    if (!editable) return
    const edge = worldRef.current.edges.find(candidate => candidate.id === edgeId)
    if (!edge) return
    setWorld(previous => ({
      ...previous,
      edges: previous.edges.filter(candidate => candidate.id !== edgeId),
      sheddings: rememberShedding(edge, previous.sheddings)
    }))
    setSelectedEdgeId(null)
    setMessage(`${regionById(edge.from).short} → ${regionById(edge.to).short} molted // its pale outline stays in the skin`)
  }, [editable, rememberShedding])

  const rewire = useCallback(({ cut = [], join = [] }, copy) => {
    if (!editable) return
    setWorld(previous => {
      let edges = previous.edges.filter(edge => !cut.includes(edge.id))
      let sheddings = previous.edges
        .filter(edge => cut.includes(edge.id))
        .reduce((memo, edge) => rememberShedding(edge, memo), previous.sheddings)
      join.forEach(([from, to]) => {
        if (!from || !to || from === to) return
        if (edges.some(edge => edge.from === from && edge.to === to)) return
        const limit = previous.installed[from] === 'fork' ? 2 : 1
        while (edges.filter(edge => edge.from === from).length >= limit) {
          const victim = edges.filter(edge => edge.from === from).at(-1)
          sheddings = rememberShedding(victim, sheddings)
          edges = edges.filter(edge => edge.id !== victim.id)
        }
        const prior = sheddings.find(edge => edge.id === edgeIdFor(from, to))
        edges = [...edges, {
          id: edgeIdFor(from, to),
          from,
          to,
          crossings: prior?.crossings || 0,
          memory: prior?.memory || 0
        }]
      })
      return { ...previous, edges: edges.slice(-12), sheddings: sheddings.slice(-10) }
    })
    if (copy) setMessage(copy)
  }, [editable, rememberShedding])

  const spliceThrough = useCallback((hostId, targetId) => {
    const current = worldRef.current
    if (!hostId || !targetId || hostId === targetId) return
    const feeder = current.edges.find(edge => edge.to === targetId && edge.from !== hostId)
    rewire(
      {
        cut: feeder ? [feeder.id] : [],
        join: [[hostId, targetId], ...(feeder ? [[feeder.from, hostId]] : [])]
      },
      `the route now crosses ${regionById(hostId).label} before it reaches the ${regionById(targetId).short}`
    )
    setSelectedRegionId(hostId)
  }, [rewire])

  const openBranch = useCallback((forkHost, lensId) => {
    const current = worldRef.current
    if (!forkHost || !lensId) return
    const awakeSet = awakeIds(current)
    const sourceId = Object.entries(current.installed).find(([, id]) => ORGANS[id]?.source)?.[0]
    const hostOf = (organId) => Object.entries(current.installed).find(([, id]) => id === organId)?.[0]
    const taken = new Set([sourceId, forkHost, lensId])
    const emberHost = hostOf('ember')
    const warmHost = emberHost && awakeSet.has(emberHost) && !taken.has(emberHost) ? emberHost : null
    if (warmHost) taken.add(warmHost)
    const coilHost = hostOf('coil')
    const relay = coilHost && awakeSet.has(coilHost) && !taken.has(coilHost)
      ? coilHost
      : REGIONS.find(region => awakeSet.has(region.id) && !taken.has(region.id))?.id
    if (!relay) return
    const trunk = [sourceId, warmHost, forkHost].filter(Boolean)
    rewire(
      {
        join: [
          ...trunk.slice(0, -1).map((id, index) => [id, trunk[index + 1]]),
          [forkHost, lensId],
          [forkHost, relay],
          [relay, lensId]
        ]
      },
      `the trunk now runs ${trunk.map(id => regionById(id).short).join(' → ')} and divides into two branches that both reach the ${regionById(lensId).short}`
    )
    setSelectedRegionId(forkHost)
  }, [rewire])

  const closeCircuit = useCallback((mirrorHost, sourceId) => {
    const current = worldRef.current
    if (!mirrorHost || !sourceId) return
    const forkHost = Object.entries(current.installed).find(([, id]) => id === 'fork')?.[0]
    const lensHost = Object.entries(current.installed).find(([, id]) => id === 'lens')?.[0]
    const reached = conduct(current).reached
    const feeder = forkHost && awakeIds(current).has(forkHost)
      ? forkHost
      : [...reached].filter(id => id !== lensHost && id !== mirrorHost).at(-1) || sourceId
    rewire(
      { join: [[feeder, mirrorHost], [mirrorHost, sourceId]] },
      `${regionById(feeder).short} → ${regionById(mirrorHost).short} → ${regionById(sourceId).short} closes the circuit // the body can now answer its own answer`
    )
    setSelectedRegionId(mirrorHost)
  }, [rewire])

  const handlePortTap = useCallback((regionId) => {
    if (!editable) return
    if (!armedFromId) {
      setArmedFromId(regionId)
      setSelectedRegionId(regionId)
      setMessage(`${regionById(regionId).short} is holding an unfinished nerve // tap another region's port to land it`)
      return
    }
    if (armedFromId === regionId) {
      setArmedFromId(null)
      setMessage('the unfinished nerve folded back into the body')
      return
    }
    growNerve(armedFromId, regionId)
  }, [armedFromId, editable, growNerve])

  const beginWire = useCallback((event, regionId) => {
    if (!editable) return
    event.preventDefault()
    event.stopPropagation()
    const point = svgPointFromClient(event.clientX, event.clientY)
    if (!point) return
    const next = { from: regionId, startX: event.clientX, startY: event.clientY, x: point.x, y: point.y, moved: false, targetId: null }
    wireDragRef.current = next
    setWireDrag(next)
    setArmedFromId(regionId)
  }, [editable, svgPointFromClient])

  useEffect(() => {
    if (!wireDrag?.from) return undefined
    const handleMove = (event) => {
      const current = wireDragRef.current
      if (!current) return
      const point = svgPointFromClient(event.clientX, event.clientY)
      if (!point) return
      const moved = current.moved || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > DRAG_THRESHOLD
      const next = { ...current, x: point.x, y: point.y, moved, targetId: moved ? regionAtClient(event.clientX, event.clientY) : null }
      wireDragRef.current = next
      setWireDrag(next)
    }
    const handleUp = (event) => {
      const current = wireDragRef.current
      if (!current) return
      const targetId = regionAtClient(event.clientX, event.clientY)
      if (current.moved && targetId && targetId !== current.from) growNerve(current.from, targetId)
      else if (current.moved) setMessage('the growing nerve found no receiving port // tap ports in order for a steadier gesture')
      else handlePortTap(current.from)
      suppressWireClickRef.current = true
      window.setTimeout(() => { suppressWireClickRef.current = false }, 0)
      wireDragRef.current = null
      setWireDrag(null)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [growNerve, handlePortTap, regionAtClient, svgPointFromClient, wireDrag?.from])

  const nudgeRegion = useCallback((dx, dy, id = selectedRegionId) => {
    if (!editable) return
    const region = regionById(id)
    setWorld(previous => {
      const placement = previous.regions[id]
      return {
        ...previous,
        regions: {
          ...previous.regions,
          [id]: {
            ...placement,
            x: clamp(placement.x + dx, 24, VIEWBOX.width - region.width - 24),
            y: clamp(placement.y + dy, 28, VIEWBOX.height - region.height - 28)
          }
        }
      }
    })
  }, [editable, selectedRegionId])

  const chooseVow = useCallback((vowId) => {
    const current = worldRef.current
    if (!VOWS[vowId] || current.stage < 2 || (current.status !== 'composing' && current.status !== 'mastered')) return
    setWorld(previous => ({ ...previous, vow: vowId }))
    setMessage(`${VOWS[vowId].label} // ${VOWS[vowId].note}`)
  }, [])

  const resolveRun = useCallback((finished) => {
    const current = worldRef.current
    if (current.status !== 'composing') return
    const tested = judge(finished, current)
    if (tested.ready) {
      const mastered = current.stage >= AUGURIES.length - 1
      const record = {
        id: `trace-${Date.now()}`,
        stage: current.stage,
        emissions: finished.emissions.length,
        peak: round1(finished.peakLoad),
        endedAt: finished.endedAt,
        bornAt: Date.now()
      }
      setWorld(previous => {
        const usedNodes = new Set(finished.frontier)
        const usedEdges = new Set(finished.frames.flatMap(frame => frame.packets.map(packet => packet.edgeId)))
        return {
          ...previous,
          stage: mastered ? previous.stage : previous.stage + 1,
          status: mastered ? 'mastered' : 'composing',
          regions: Object.fromEntries(Object.entries(previous.regions).map(([id, region]) => [id, {
            ...region,
            awakenings: region.awakenings + (usedNodes.has(id) ? 1 : 0)
          }])),
          edges: previous.edges.map(edge => (usedEdges.has(edge.id)
            ? { ...edge, crossings: edge.crossings + 1, memory: clamp(edge.memory + 1, 0, 3) }
            : edge)),
          traces: [...previous.traces, record].slice(-6),
          log: [...previous.log, { id: record.id, stage: previous.stage + 1, text: tested.augury.success }].slice(-8)
        }
      })
      setMutation({ id: record.id, nodes: finished.frontier, mastered })
      setMessage(`${tested.augury.success} // ${mastered ? 'it now conducts itself' : 'a further region is unfolding from the measured route'}`)
      if (!mastered) {
        const next = REGIONS.find(region => region.unlockedAt === current.stage + 1)
        if (next) setSelectedRegionId(next.id)
      }
      if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
      mutationTimerRef.current = window.setTimeout(() => {
        mutationTimerRef.current = null
        setMutation(null)
      }, reducedMotion ? 160 : 2000)
    } else {
      const misfires = current.misfires + 1
      const ruined = misfires >= MAX_MISFIRES
      const scarId = finished.seizures[0]?.nodeId
        || finished.absorbed[0]?.nodeId
        || finished.deadEnds[0]?.nodeId
        || 'palm'
      const failing = tested.demands.find(demand => !demand.met)
      setWorld(previous => ({
        ...previous,
        misfires,
        status: ruined ? 'ruined' : 'composing',
        regions: regionById(scarId)
          ? { ...previous.regions, [scarId]: { ...previous.regions[scarId], scars: previous.regions[scarId].scars + 1 } }
          : previous.regions,
        log: [...previous.log, {
          id: `misfire-${Date.now()}`,
          stage: previous.stage,
          text: finished.seizures.length
            ? `${regionById(finished.seizures[0].nodeId)?.short || 'the body'} took ${round1(finished.seizures[0].load)} charge and tore`
            : `the trace failed: ${failing?.text || 'the augury was not met'}`
        }].slice(-8)
      }))
      setMessage(ruined
        ? 'four misfires hardened into reflex // the instrument can no longer tell a response from a wound'
        : `misfire recorded // ${failing?.text || 'the augury was not met'}${regionById(scarId) ? ` // ${regionById(scarId).short} scarred and now leaks 4% more charge` : ''}`)
    }
  }, [reducedMotion])

  const startRun = useCallback((auto = false) => {
    const current = worldRef.current
    if (!current.unlocked) return
    if (!auto && (current.status !== 'composing' || mutation)) return
    const next = conduct(current)
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
    lastStampRef.current = 0
    setPlaying(true)
    if (!auto) {
      const tested = judge(next, current)
      setMessage(tested.ready
        ? 'the stimulus is entering the anatomy // the tape will record what the body actually does'
        : 'an unmeasured stimulus enters the body // the first contradiction will become a scar')
    }
  }, [mutation, reducedMotion, resolveRun])

  useEffect(() => {
    if (!playing || !run?.frames?.length) return undefined
    const step = (stamp) => {
      if (!lastStampRef.current) lastStampRef.current = stamp
      clockRef.current += stamp - lastStampRef.current
      lastStampRef.current = stamp
      const rate = run.auto ? TICK_MS * 1.25 : TICK_MS
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
      lastStampRef.current = 0
    }
  }, [playing, resolveRun, run])

  useEffect(() => {
    if (!playing || !liveFrame || !soundOn) return
    if (soundedTickRef.current === liveFrame.tick) return
    soundedTickRef.current = liveFrame.tick
    if (liveFrame.arrivals.length) playTones(liveFrame.arrivals, !liveFrame.seizure)
  }, [liveFrame, playTones, playing, soundOn])

  useEffect(() => {
    if (world.status !== 'mastered' || reducedMotion) return undefined
    if (playing) return undefined
    const cadence = vow?.cadence || 5200
    autoTimerRef.current = window.setTimeout(() => {
      autoTimerRef.current = null
      startRun(true)
    }, cadence)
    return () => {
      if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
    }
  }, [playing, reducedMotion, startRun, vow, world.status])

  const applyGuidance = useCallback(() => {
    if (!editable) return
    if (guidance.kind === 'install' && guidance.nodeId) {
      installOrgan(guidance.organId, guidance.nodeId)
      return
    }
    if ((guidance.kind === 'grow' || guidance.kind === 'reroute') && guidance.from && guidance.to) {
      growNerve(guidance.from, guidance.to, true)
      return
    }
    if (guidance.kind === 'splice' && guidance.host && guidance.to) {
      spliceThrough(guidance.host, guidance.to)
      return
    }
    if (guidance.kind === 'branch' && guidance.host && guidance.to) {
      openBranch(guidance.host, guidance.to)
      return
    }
    if (guidance.kind === 'circuit' && guidance.host && guidance.to) {
      closeCircuit(guidance.host, guidance.to)
      return
    }
    if (guidance.kind === 'lift' && guidance.nodeId) {
      liftOrgan(guidance.nodeId)
      setSelectedRegionId(guidance.nodeId)
      return
    }
    if (guidance.kind === 'pull' && guidance.to) {
      nudgeRegion(guidance.dx || 0, guidance.dy || 0, guidance.to)
      setSelectedRegionId(guidance.to)
      const loop = cyclesFor(worldRef.current)[0]
      setMessage(`${regionById(guidance.to).label} pulled closer // nerves re-timed${loop ? ` // circuit gain now ${round1(loop.gain)}` : ''}`)
      return
    }
    if (guidance.kind === 'stretch' && guidance.to && guidance.from) {
      const vector = pullVector(worldRef.current, guidance.from, guidance.to, 0)
      nudgeRegion(-Math.round((vector.dx || 0) * 0.3) || 40, -Math.round((vector.dy || 0) * 0.3) || 40, guidance.to)
      setSelectedRegionId(guidance.to)
      setMessage(`${regionById(guidance.to).label} pushed away // the circuit now spends more charge per lap`)
      return
    }
    if (guidance.kind === 'vow') chooseVow('shelter')
  }, [chooseVow, closeCircuit, editable, growNerve, guidance, installOrgan, liftOrgan, nudgeRegion, openBranch, spliceThrough])

  const rewind = useCallback(() => {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
    if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
    const snapshot = worldRef.current.history.at(-1)
    if (!snapshot) {
      setMessage('no earlier trace remains beneath the skin')
      return
    }
    setWorld(previous => ({ ...previous, ...snapshot, unlocked: true, history: previous.history.slice(0, -1) }))
    setPlaying(false)
    setMutation(null)
    setRun(null)
    setPlayTick(0)
    setSelectedEdgeId(null)
    setMessage('one trace lifted // organs, nerves, scars and temperament returned together')
  }, [])

  const reset = useCallback(() => {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
    if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
    if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current)
    setWorld(freshWorld())
    setSelectedRegionId('palm')
    setSelectedEdgeId(null)
    setArmedOrganId(null)
    setArmedFromId(null)
    setOrganDrag(null)
    setRegionDrag(null)
    setWireDrag(null)
    setRun(null)
    setPlayTick(0)
    setPlaying(false)
    setMutation(null)
    setMessage('a clean instrument replaces every measured reflex')
  }, [])

  const handleRegionActivate = useCallback((regionId) => {
    if (armedOrganId) {
      installOrgan(armedOrganId, regionId)
      return
    }
    if (armedFromId && armedFromId !== regionId) {
      growNerve(armedFromId, regionId)
      return
    }
    setSelectedRegionId(regionId)
    const organ = ORGANS[worldRef.current.installed[regionId]]
    setMessage(`${regionById(regionId).label} selected // ${organ ? organ.reading : 'its socket is empty; charge crosses it unchanged'}`)
  }, [armedFromId, armedOrganId, growNerve, installOrgan])

  const stepBy = useCallback((delta) => {
    if (!runRef.current?.frames?.length) {
      startRun()
      return
    }
    setPlaying(false)
    setPlayTick(previous => clamp(previous + delta, 0, runRef.current.frames.length - 1))
  }, [startRun])

  const handleKeyDown = useCallback((event) => {
    if (event.target.closest('button, a, input, textarea, select')) return
    const step = event.shiftKey ? 4 : 16
    if (event.key === 'ArrowLeft') { event.preventDefault(); nudgeRegion(-step, 0) }
    if (event.key === 'ArrowRight') { event.preventDefault(); nudgeRegion(step, 0) }
    if (event.key === 'ArrowUp') { event.preventDefault(); nudgeRegion(0, -step) }
    if (event.key === 'ArrowDown') { event.preventDefault(); nudgeRegion(0, step) }
    if (event.key === ',') { event.preventDefault(); stepBy(-1) }
    if (event.key === '.') { event.preventDefault(); stepBy(1) }
    if (event.key.toLowerCase() === 'w') {
      event.preventDefault()
      setArmedFromId(selectedRegionId)
      setMessage(`${selectedRegion.short} is holding an unfinished nerve // tap another port`)
    }
    if (event.key.toLowerCase() === 'o') {
      event.preventDefault()
      const index = Math.max(0, unlockedOrgans.findIndex(organ => organ.id === armedOrganId))
      const next = unlockedOrgans[(index + 1) % unlockedOrgans.length]
      setArmedOrganId(next?.id || null)
      if (next) setMessage(`${next.label} armed from the keyboard // tap a region socket`)
    }
    if ((event.key === 'Backspace' || event.key === 'Delete') && selectedEdgeId) {
      event.preventDefault()
      moltNerve(selectedEdgeId)
    }
    if (event.key === ' ') { event.preventDefault(); startRun() }
  }, [armedOrganId, moltNerve, nudgeRegion, selectedEdgeId, selectedRegion.short, selectedRegionId, startRun, stepBy, unlockedOrgans])

  const boardWidth = portrait ? PORTRAIT_VIEWBOX.width : VIEWBOX.width
  const boardHeight = portrait ? PORTRAIT_VIEWBOX.height : VIEWBOX.height
  const topCycle = cycles[0]

  return (
    <div className={`fm-shell phase-${phase} ${portrait ? 'is-portrait' : ''} ${reducedMotion ? 'is-reduced-motion' : ''} ${vow ? `vow-${vow.id}` : ''}`}>
      <main
        ref={surfaceRef}
        className={`fm-surface ${organDrag || regionDrag || wireDrag ? 'is-dragging' : ''}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        data-playground-surface
        data-testid="interface-familiar-surface"
        aria-label="A persistent SVG familiar whose behaviour is simulated tick by tick: seat organs, draw nerves, and read the resulting trace on the vitals tape"
      >
        <section className="fm-theatre" aria-label="living interface anatomy">
          <div className="fm-corner-nav"><ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} /></div>

          <div className="fm-passport">
            <span>living interface / instrumented generation 250</span>
            <h1 style={{ color: experiment.color }}>{experiment.name}</h1>
            <p>{phase} // {world.traces.length} recorded trace{world.traces.length === 1 ? '' : 's'} // {formatAge(savedAt)}</p>
          </div>

          <button
            type="button"
            className="fm-sound"
            onClick={() => {
              setSoundOn(current => !current)
              setMessage(soundOn ? 'the instrument returns to silence' : 'each organ will sound its own interval as charge arrives in it')
            }}
            aria-pressed={soundOn}
          >
            {soundOn ? 'tone on' : 'tone off'}
          </button>

          <div className="fm-gauges" aria-label="live instrument readings">
            <i>
              <span>charge</span>
              <b>{liveFrame ? round1(liveFrame.charge) : round1(preview.frames[0]?.charge || 0)}</b>
            </i>
            <i className={liveFrame && liveFrame.load > SEIZE_LOAD ? 'is-alarm' : ''}>
              <span>peak load</span>
              <b>{round1(run ? run.peakLoad : preview.peakLoad)}<small>/{SEIZE_LOAD}</small></b>
            </i>
            <i className={topCycle ? (topCycle.gain > 1 ? 'is-alarm' : 'is-live') : ''}>
              <span>circuit gain</span>
              <b>{topCycle ? round1(topCycle.gain) : '—'}</b>
            </i>
            <i>
              <span>emissions</span>
              <b>{(run || preview).emissions.length}</b>
            </i>
          </div>

          <svg
            ref={svgRef}
            className="fm-anatomy"
            viewBox={`0 0 ${boardWidth} ${boardHeight}`}
            preserveAspectRatio="xMidYMid meet"
            aria-label={`${awake.size} awake regions and ${world.edges.length} nerves. ${verdict.ready ? 'The measured trace satisfies the augury.' : guidance.title}.`}
          >
            <defs>
              <pattern id="fm-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 H 0 V 30" fill="none" stroke="rgba(126, 190, 182, .08)" strokeWidth=".8" />
                <circle cx="0" cy="0" r="1.1" fill="rgba(126, 190, 182, .16)" />
              </pattern>
              <pattern id="fm-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(226, 244, 240, .1)" strokeWidth="2" />
              </pattern>
              <filter id="fm-grain" x="-4%" y="-4%" width="108%" height="108%">
                <feTurbulence type="fractalNoise" baseFrequency=".92" numOctaves="1" seed="250" result="noise" />
                <feColorMatrix
                  in="noise"
                  type="matrix"
                  values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .13 0"
                  result="veil"
                />
                <feComposite in="veil" in2="SourceGraphic" operator="in" result="speck" />
                <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="speck" /></feMerge>
              </filter>
              <filter id="fm-glow" x="-120%" y="-120%" width="340%" height="340%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              {REGIONS.map(region => (
                <clipPath key={region.id} id={`fm-clip-${region.id}`}>
                  <path d={shapeFor(region.form, boxes[region.id].width, boxes[region.id].height)} />
                </clipPath>
              ))}
            </defs>

            <rect className="fm-ground" width={boardWidth} height={boardHeight} rx="26" />
            <rect className="fm-graticule" x="16" y="16" width={boardWidth - 32} height={boardHeight - 32} rx="20" fill="url(#fm-grid)" />
            <path
              className="fm-sightline"
              d={portrait
                ? 'M 52 1080 C 214 942 468 968 636 742 M 66 226 C 244 148 436 196 622 104'
                : 'M 54 664 C 286 596 388 690 602 620 C 788 556 872 640 1080 544'}
            />

            <g className="fm-underlay">
              <path className="fm-spine-shadow" d={bodySpine} />
              <path className="fm-spine" d={bodySpine} />
            </g>

            <g className="fm-shed-layer" aria-hidden="true">
              {world.sheddings.filter(edge => awake.has(edge.from) && awake.has(edge.to)).map((edge, index) => (
                <path
                  key={edge.id}
                  d={curveBetween(portOf(edge.from), centerOf(edge.to), -bendFor(edge))}
                  style={{ '--shed-index': index }}
                />
              ))}
            </g>

            <g className="fm-nerve-layer">
              {conduits.map((edge, index) => {
                const from = portOf(edge.from)
                const box = boxes[edge.to]
                const to = { x: box.x + 10, y: box.y + box.height * 0.56 }
                const bend = bendFor(edge)
                const path = curveBetween(from, to, bend)
                const selected = selectedEdgeId === edge.id
                const inLoop = Boolean(topCycle?.edges?.includes(edge.id))
                const carrying = liveFrame?.packets?.some(packet => packet.edgeId === edge.id)
                const mid = pointOnCurve(from, to, bend, 0.5)
                return (
                  <g
                    key={edge.id}
                    className={`fm-nerve ${selected ? 'is-selected' : ''} ${carrying ? 'is-carrying' : ''} ${inLoop ? 'is-looping' : ''}`}
                    style={{ '--nerve-index': index, '--nerve-memory': edge.memory }}
                  >
                    <path className="fm-nerve-bed" d={path} />
                    <path className="fm-nerve-line" d={path} />
                    <path
                      className="fm-nerve-hit"
                      d={path}
                      role="button"
                      tabIndex={editable ? 0 : -1}
                      aria-label={`Nerve from ${regionById(edge.from).label} to ${regionById(edge.to).label}. ${edge.ticks} ticks of transit, ${Math.round((1 - edge.atten) * 100)} percent charge lost. Select to inspect or molt.`}
                      onClick={() => {
                        setSelectedEdgeId(edge.id)
                        setMessage(`${regionById(edge.from).short} → ${regionById(edge.to).short} // ${Math.round(edge.distance)} units, ${edge.ticks} tick${edge.ticks === 1 ? '' : 's'}, ${Math.round((1 - edge.atten) * 100)}% charge lost, ${edge.crossings} recorded crossings`)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setSelectedEdgeId(edge.id)
                        }
                      }}
                    />
                    <g className="fm-nerve-readout" transform={`translate(${mid.x} ${mid.y})`}>
                      <rect x="-27" y="-11" width="54" height="22" rx="11" />
                      <text y="4">{`Δ${edge.ticks} ·${Math.round(edge.atten * 100)}%`}</text>
                    </g>
                  </g>
                )
              })}
              {wireDrag?.moved && (
                <path
                  className={`fm-wire-draft ${wireDrag.targetId ? 'is-targeting' : ''}`}
                  d={curveBetween(portOf(wireDrag.from), { x: wireDrag.x, y: wireDrag.y }, 22)}
                />
              )}
            </g>

            <g className="fm-region-layer">
              {REGIONS.map((region, regionIndex) => {
                const box = boxes[region.id]
                const unlocked = awake.has(region.id)
                const organ = ORGANS[world.installed[region.id]] || null
                const selected = selectedRegionId === region.id
                const dropTarget = organDrag?.targetId === region.id
                const wireTarget = wireDrag?.targetId === region.id
                const mutating = mutation?.nodes?.includes(region.id)
                const arriving = liveFrame?.arrivals?.includes(region.id)
                const held = liveFrame?.holds?.find(hold => hold.nodeId === region.id)
                const seized = run?.seizures?.some(seizure => seizure.nodeId === region.id
                  && seizure.tick === liveFrame?.tick)
                const state = world.regions[region.id]
                const port = { x: box.width - 12, y: box.height * 0.56 }
                return (
                  <g
                    key={region.id}
                    className={`fm-region ${unlocked ? 'is-unlocked' : 'is-dormant'} ${selected ? 'is-selected' : ''} ${organ ? 'is-inhabited' : 'is-hollow'} ${dropTarget ? 'is-drop-target' : ''} ${wireTarget ? 'is-wire-target' : ''} ${mutating ? 'is-mutating' : ''} ${arriving ? 'is-arriving' : ''} ${seized ? 'is-seized' : ''}`}
                    transform={`translate(${box.x} ${box.y})`}
                    style={{ '--region-color': region.color, '--region-index': regionIndex }}
                    data-familiar-region={region.id}
                    onClick={(event) => {
                      event.stopPropagation()
                      if (unlocked) handleRegionActivate(region.id)
                    }}
                  >
                    <title>{`${region.label}. ${organ ? `Holds the ${organ.label}: ${organ.note}.` : 'Empty socket.'} ${state.awakenings} recorded awakenings, ${state.scars} scars.`}</title>
                    <path className="fm-region-shadow" d={shapeFor(region.form, box.width, box.height)} transform="translate(8 10)" />
                    <path className="fm-region-body" d={shapeFor(region.form, box.width, box.height)} filter="url(#fm-grain)" />
                    <g clipPath={`url(#fm-clip-${region.id})`}>
                      <rect className="fm-region-wash" width={box.width} height={box.height} />
                      <RegionInterior form={region.form} organ={organ} width={box.width} height={box.height} active={Boolean(organ) && (arriving || state.awakenings > 0)} />
                      <rect className="fm-region-hatch" width={box.width} height={box.height} fill="url(#fm-hatch)" />
                    </g>
                    <path className="fm-region-border" d={shapeFor(region.form, box.width, box.height)} />

                    {unlocked ? (
                      <>
                        {held && (
                          <g className="fm-hold-ring" transform={`translate(${box.width / 2} ${box.height / 2 + 8})`}>
                            <circle r="44" style={{ strokeDasharray: `${Math.max(2, held.progress * 276)} 276` }} />
                            <text y="-52">{`held ${round1(held.charge)}`}</text>
                          </g>
                        )}

                        <g
                          className="fm-region-grip"
                          role="button"
                          tabIndex={editable ? 0 : -1}
                          aria-label={`Move ${region.label}. Large drag handle; nerve length changes its transit time.`}
                          onPointerDown={(event) => beginRegionDrag(event, region.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              event.stopPropagation()
                              setSelectedRegionId(region.id)
                            }
                          }}
                        >
                          <rect x="12" y="10" width={box.width - 30} height="56" rx="18" />
                          <circle cx="38" cy="38" r="10" />
                          <text x="57" y="43">{region.mark} / {region.short}</text>
                          <path d={`M ${box.width - 70} 29 h 32 M ${box.width - 70} 39 h 32 M ${box.width - 70} 49 h 32`} />
                        </g>

                        <g
                          className={`fm-region-port ${armedFromId === region.id ? 'is-armed' : ''} ${world.edges.filter(edge => edge.from === region.id).length >= outgoingLimit(world, region.id) ? 'is-spent' : ''}`}
                          transform={`translate(${port.x} ${port.y})`}
                          role="button"
                          tabIndex={editable ? 0 : -1}
                          aria-label={`${armedFromId && armedFromId !== region.id ? `Land a nerve from ${regionById(armedFromId).label} into ${region.label}` : `Begin a nerve from ${region.label}`}. Drag or press.`}
                          onPointerDown={(event) => beginWire(event, region.id)}
                          onClick={(event) => {
                            event.stopPropagation()
                            if (suppressWireClickRef.current) return
                            if (!wireDrag?.moved) handlePortTap(region.id)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              event.stopPropagation()
                              handlePortTap(region.id)
                            }
                          }}
                        >
                          <circle className="fm-port-hit" r="34" />
                          <circle className="fm-port-ring" r="19" />
                          <circle className="fm-port-core" r="7" />
                          <path d="M -9 0 H 9 M 0 -9 V 9" />
                        </g>

                        <g
                          className={`fm-region-socket ${organ ? 'is-filled' : ''}`}
                          transform={`translate(${box.width * 0.5} ${box.height - 22})`}
                          role="button"
                          tabIndex={editable ? 0 : -1}
                          aria-label={`${region.label} organ socket. ${organ ? `Holds the ${organ.label}; drag to move it.` : armedOrganId ? `Seat the ${ORGANS[armedOrganId].label}.` : 'Empty.'}`}
                          onPointerDown={(event) => {
                            if (organ) beginOrganDrag(event, organ.id)
                          }}
                          onClick={(event) => {
                            event.stopPropagation()
                            if (suppressOrganClickRef.current) return
                            if (armedOrganId) installOrgan(armedOrganId, region.id)
                            else setSelectedRegionId(region.id)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              event.stopPropagation()
                              if (armedOrganId) installOrgan(armedOrganId, region.id)
                              else setSelectedRegionId(region.id)
                            }
                          }}
                        >
                          <rect x="-38" y="-23" width="76" height="46" rx="21" />
                          <text y="7">{organ?.mark || '＋'}</text>
                        </g>

                        {state.awakenings > 0 && (
                          <g className="fm-awakening-marks" transform="translate(26 80)">
                            {Array.from({ length: Math.min(3, state.awakenings) }, (_, index) => (
                              <path key={index} d={`M ${index * 13} 0 v 17`} />
                            ))}
                          </g>
                        )}
                        {state.scars > 0 && (
                          <path className="fm-region-scar" d={`M 19 ${box.height - 62} l 20 16 -9 17 26 -11 17 14`} />
                        )}
                      </>
                    ) : (
                      <g className="fm-dormant-mark" transform={`translate(${box.width / 2} ${box.height / 2})`}>
                        <circle r="28" />
                        <text y="6">{region.mark}</text>
                        <text y="48">augury {region.unlockedAt + 1}</text>
                      </g>
                    )}
                  </g>
                )
              })}
            </g>

            <g className="fm-packet-layer" filter="url(#fm-glow)">
              {liveFrame?.packets?.map(packet => {
                const edge = conduitById.get(packet.edgeId)
                if (!edge) return null
                const from = portOf(packet.from)
                const box = boxes[packet.to]
                const to = { x: box.x + 10, y: box.y + box.height * 0.56 }
                const point = pointOnCurve(from, to, bendFor(edge), packet.progress)
                const size = clamp(4 + packet.charge * 1.1, 4, 15)
                return (
                  <g
                    key={packet.id}
                    className={`fm-packet ${packet.charge >= ORGANS.lens.emit ? 'is-strong' : 'is-faint'}`}
                    transform={`translate(${point.x} ${point.y})`}
                    style={{ '--packet-warmth': round1(packet.warmth) }}
                  >
                    <circle r={size} />
                    {packet.echo > 0 && <circle className="fm-packet-fold" r={size + 5} />}
                    <text y={-size - 7}>{round1(packet.charge)}</text>
                  </g>
                )
              })}
              {liveFrame?.emissions > 0 && run?.emissions?.filter(emission => emission.tick === liveFrame.tick).map((emission, index) => {
                const center = centerOf(emission.nodeId)
                return (
                  <g key={`${emission.tick}-${index}`} className="fm-emission" transform={`translate(${center.x} ${center.y})`}>
                    <circle r="36" />
                    <circle r="60" />
                    <text y="-74">{`weather ${round1(emission.charge)} · warmth ${round1(emission.warmth)}`}</text>
                  </g>
                )
              })}
            </g>

            {!playing && !run && world.unlocked && !reducedMotion && conduits.length > 0 && (
              <g className="fm-idle-drift" aria-hidden="true">
                {conduits.slice(0, 4).map((edge, index) => {
                  const from = portOf(edge.from)
                  const box = boxes[edge.to]
                  const to = { x: box.x + 10, y: box.y + box.height * 0.56 }
                  const path = curveBetween(from, to, bendFor(edge))
                  return (
                    <circle key={edge.id} r="3.5">
                      <animateMotion dur={`${3.6 + index * 0.7}s`} begin={`${index * -1.1}s`} repeatCount="indefinite" path={path} />
                    </circle>
                  )
                })}
              </g>
            )}
          </svg>

          <section className="fm-augury" aria-label="active augury">
            <span>{augury.label}</span>
            <h2>{augury.title}</h2>
            <p>{augury.instruction}</p>
            <ul>
              {verdict.demands.map(demand => (
                <li key={demand.code} className={demand.met ? 'is-met' : ''}>
                  <i aria-hidden="true">{demand.met ? '●' : '○'}</i>{demand.text}
                </li>
              ))}
            </ul>
          </section>

          <ol className="fm-chronicle" aria-label="familiar memory">
            {world.log.slice(-3).reverse().map((entry, index) => (
              <li key={entry.id} style={{ opacity: 1 - index * 0.24 }}>
                <span>{String(entry.stage).padStart(2, '0')}</span>{entry.text}
              </li>
            ))}
          </ol>

          <div className="fm-misfires" aria-label={`${world.misfires} of ${MAX_MISFIRES} misfires`}>
            <span>misfires</span>
            {Array.from({ length: MAX_MISFIRES }, (_, index) => (
              <i key={index} className={world.misfires > index ? 'is-scarred' : ''} />
            ))}
          </div>

          <p className="fm-status" role="status">{message}</p>

          {!world.unlocked && (
            <div className="fm-seal">
              <div className="fm-seal-anatomy" aria-hidden="true">
                <i /><i /><i /><b /><span>250</span>
              </div>
              <p>UNMEASURED INTERFACE / INSTRUMENTED GENERATION 250</p>
              <h2>A control is a claim.<br />An instrument is a verdict.</h2>
              <button type="button" onClick={wake} data-playground-primary>put a hand inside the interface</button>
              <small>seat organs • draw nerves • distance becomes delay • read the tape</small>
            </div>
          )}

          {world.status === 'mastered' && !mutation && (
            <div className="fm-outcome fm-outcome-mastered">
              <span>mastery / three auguries / {world.edges.reduce((sum, edge) => sum + edge.crossings, 0)} recorded crossings</span>
              <h2>THE BODY NOW CONDUCTS ITSELF</h2>
              <p>{vow?.note}. Nothing here was matched against a diagram — it was measured. Its circuit gain, its transit delays and its warmth are consequences of where you put its organs, and it keeps running on that arrangement without you.</p>
              <div>
                <button type="button" onClick={rewind}>lift final augury</button>
                <button type="button" onClick={reset}>unmake the familiar</button>
              </div>
            </div>
          )}

          {world.status === 'ruined' && (
            <div className="fm-outcome fm-outcome-ruined">
              <span>failure / four misfires became reflex</span>
              <h2>THE INSTRUMENT ANSWERS BEFORE IT MEASURES</h2>
              <p>Lift the last trace. Every scar you left now leaks four percent more charge through the nerves entering it, so the body you return to is measurably worse than the one you tested.</p>
              <div>
                <button type="button" onClick={rewind}>lift last misfire</button>
                <button type="button" onClick={reset}>replace the body</button>
              </div>
            </div>
          )}
        </section>

        <section className="fm-bench" aria-label="organ dock, vitals tape and conduction transport">
          <div className="fm-dock" aria-label="loose organs">
            <div className="fm-bench-heading">
              <span>loose organs</span>
              <strong>{armedOrganId ? `${ORGANS[armedOrganId].mark} armed` : 'drag / tap'}</strong>
            </div>
            <div className="fm-dock-list">
              {unlockedOrgans.map(organ => {
                const host = Object.entries(world.installed).find(([, id]) => id === organ.id)?.[0]
                return (
                  <button
                    type="button"
                    key={organ.id}
                    className={`${armedOrganId === organ.id ? 'is-armed' : ''} ${host ? 'is-seated' : ''}`}
                    style={{ '--organ-color': organ.color }}
                    onPointerDown={(event) => beginOrganDrag(event, organ.id)}
                    onClick={() => {
                      if (suppressOrganClickRef.current || !editable) return
                      setArmedOrganId(previous => (previous === organ.id ? null : organ.id))
                      setMessage(`${organ.label} ${armedOrganId === organ.id ? 'relaxed into the dock' : `armed // ${organ.reading}`}`)
                    }}
                    aria-pressed={armedOrganId === organ.id}
                    data-playground-action="arm-interface-organ"
                    disabled={!editable}
                  >
                    <i>{organ.mark}</i>
                    <span>
                      <strong>{organ.label}</strong>
                      <small>{organ.note}</small>
                    </span>
                    <b>{host ? regionById(host).mark : '—'}</b>
                  </button>
                )
              })}
            </div>

            {world.stage >= 2 && world.status !== 'ruined' && (
              <div className="fm-vows">
                <div className="fm-bench-heading">
                  <span>lasting temperament</span>
                  <strong>{vow ? vow.mark : 'choose one'}</strong>
                </div>
                <div>
                  {Object.values(VOWS).map(option => (
                    <button
                      type="button"
                      key={option.id}
                      className={world.vow === option.id ? 'is-chosen' : ''}
                      style={{ '--vow-color': option.color }}
                      onClick={() => chooseVow(option.id)}
                      aria-pressed={world.vow === option.id}
                      data-playground-action="choose-temperament"
                    >
                      <i>{option.mark}</i><span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="fm-readout">
            <div className={`fm-diagnostic is-${guidance.kind}`} aria-live="polite">
              <span>first measured consequence</span>
              <h2>{guidance.title}</h2>
              <p>{guidance.detail}</p>
              {guidance.kind !== 'ready' && (
                <button
                  type="button"
                  onClick={applyGuidance}
                  disabled={!editable || guidance.kind === 'wait'}
                  data-playground-action="follow-instrument-diagnosis"
                >
                  <i>
                    {guidance.kind === 'install'
                      ? ORGANS[guidance.organId].mark
                      : guidance.kind === 'pull'
                        ? '⇥'
                        : guidance.kind === 'stretch'
                          ? '⇤'
                          : guidance.kind === 'vow'
                            ? '⌂'
                            : guidance.kind === 'lift'
                              ? '⇡'
                              : guidance.kind === 'branch'
                                ? 'Y'
                              : guidance.kind === 'circuit'
                                ? '◇'
                                : guidance.kind === 'splice'
                                  ? '⋔'
                                  : '↝'}
                  </i>
                  {guidance.action}
                </button>
              )}
            </div>

            <VitalsTape
              run={run || preview}
              playTick={run ? playTick : Math.max(0, (preview.frames.length || 1) - 1)}
              augury={augury}
              onScrub={(index) => {
                if (!run) return
                setPlaying(false)
                setPlayTick(index)
              }}
              reducedMotion={reducedMotion}
            />
          </div>

          <div className="fm-transport">
            <div className="fm-selected">
              <div className="fm-bench-heading">
                <span>region {selectedRegion.mark}</span>
                <strong style={{ color: selectedRegion.color }}>{selectedRegion.short}</strong>
              </div>
              <p>{selectedOrgan ? selectedOrgan.reading : selectedRegion.note}</p>
              <div className="fm-selected-row">
                <button type="button" onClick={() => liftOrgan(selectedRegionId)} disabled={!selectedOrgan || !editable}>
                  lift organ
                </button>
                <button type="button" onClick={() => moltNerve(selectedEdgeId)} disabled={!selectedEdge || !editable}>
                  molt nerve
                </button>
              </div>
              <div className="fm-nudge">
                <button type="button" onClick={() => nudgeRegion(0, -16)} aria-label="Move selected region up" disabled={!editable}>↑</button>
                <button type="button" onClick={() => nudgeRegion(-16, 0)} aria-label="Move selected region left" disabled={!editable}>←</button>
                <button type="button" onClick={() => nudgeRegion(16, 0)} aria-label="Move selected region right" disabled={!editable}>→</button>
                <button type="button" onClick={() => nudgeRegion(0, 16)} aria-label="Move selected region down" disabled={!editable}>↓</button>
              </div>
            </div>

            <button
              type="button"
              className={`fm-conduct ${verdict.ready ? 'is-ready' : ''}`}
              onClick={() => startRun()}
              disabled={!world.unlocked || world.status !== 'composing' || playing || Boolean(mutation)}
              data-playground-action="conduct-stimulus"
            >
              <span>
                {playing
                  ? `tick ${String(liveFrame?.tick ?? 0).padStart(2, '0')} / charge ${round1(liveFrame?.charge || 0)}`
                  : mutation
                    ? 'anatomy unfolding'
                    : verdict.ready
                      ? `${preview.emissions.length} emissions, peak ${round1(preview.peakLoad)}`
                      : `risk: ${guidance.title}`}
              </span>
              <strong>{playing ? 'CONDUCTING…' : mutation ? 'MOLTING…' : 'CONDUCT'}</strong>
              <small>SPACE</small>
            </button>

            <div className="fm-transport-row">
              <button type="button" onClick={() => stepBy(-1)} disabled={!run} aria-label="Step one tick back" data-playground-action="step-tick">◂<small>tick</small></button>
              <button
                type="button"
                onClick={() => {
                  if (!run) { startRun(); return }
                  if (playTick >= run.frames.length - 1) setPlayTick(0)
                  setPlaying(current => !current)
                }}
                aria-label={playing ? 'Pause the trace' : 'Replay the trace'}
              >
                {playing ? '❙❙' : '▶'}<small>{playing ? 'hold' : 'replay'}</small>
              </button>
              <button type="button" onClick={() => stepBy(1)} disabled={!run} aria-label="Step one tick forward">▸<small>tick</small></button>
              <button type="button" onClick={rewind} disabled={world.history.length === 0}>↺<small>lift</small></button>
              <button type="button" onClick={reset}>⌫<small>clean</small></button>
            </div>

            <p className="fm-keys">
              drag organs into sockets • drag ports to grow nerves • drag region crowns to re-time the body • keys: arrows move, W wire, O organ, , . scrub, ⌫ molt, Space conduct
            </p>
          </div>
        </section>

        {organDrag?.moved && (
          <div
            className={`fm-drag-organ ${organDrag.targetId ? 'is-targeting' : ''}`}
            style={{ left: organDrag.x, top: organDrag.y, '--organ-color': ORGANS[organDrag.id].color }}
            aria-hidden="true"
          >
            <i>{ORGANS[organDrag.id].mark}</i>
            <span>{organDrag.targetId ? `seat in ${regionById(organDrag.targetId).short}` : 'carry organ'}</span>
          </div>
        )}
      </main>
    </div>
  )
}

export { freshWorld, conduct, cyclesFor, judge, diagnose }
export default InterfaceFamiliar
