/**
 * escapement.garden() — pure simulation core.
 *
 * Shared verbatim by the Web Worker (authoritative integration) and by the
 * main thread (fallback loop + HUD derivations). Nothing in here touches the
 * DOM, React, or window, so the same subtraction happens on both sides of the
 * postMessage boundary.
 */

export const TAU = Math.PI * 2
export const FIXED_STEP = 1 / 120
export const BASE_PERIOD = 6
export const GATE_HALF = 0.26
export const STATIONS = 8
export const MAX_HUSKS = 4
export const TOLERANCE = 0.09
export const BLOOM_THRESHOLD = 0.7
export const HOLD_REQUIRED = 2.5
export const PROBE_HORIZON = 26

const LIGHT_VITALITY = 0.4
const LIGHT_BLOOM = 0.5
const WILT_FACTOR = 0.5
const FADE_FACTOR = 0.5
const FALTER_BELOW = 0.22
const FALTER_RATE = 0.62

export const ARBORS = [
  {
    id: 'barrel',
    label: 'spring barrel',
    short: 'barrel',
    mark: 'I',
    radius: 104,
    spoke: -1.5708,
    color: '#d8a441',
    unlockedAt: 0,
    fixed: true,
    note: 'the only wheel that needs no gearing — it simply spends the spring'
  },
  {
    id: 'verge',
    label: 'verge ring',
    short: 'verge',
    mark: 'II',
    radius: 176,
    spoke: -1.2,
    color: '#5fae91',
    unlockedAt: 0,
    fixed: false,
    note: 'the first ring that can disagree with the barrel about time'
  },
  {
    id: 'crown',
    label: 'crown ring',
    short: 'crown',
    mark: 'III',
    radius: 248,
    spoke: -0.82,
    color: '#6f9bd2',
    unlockedAt: 0,
    fixed: false,
    note: 'fast weather — it multiplies whatever the verge already decided'
  },
  {
    id: 'lantern',
    label: 'lantern ring',
    short: 'lantern',
    mark: 'IV',
    radius: 320,
    spoke: -0.44,
    color: '#a884cf',
    unlockedAt: 1,
    fixed: false,
    note: 'geared down far enough to keep something slow alive'
  },
  {
    id: 'halo',
    label: 'halo ring',
    short: 'halo',
    mark: 'V',
    radius: 378,
    spoke: -0.06,
    color: '#cf7f8f',
    unlockedAt: 2,
    fixed: false,
    note: 'the outermost patience; one turn here outlasts a whole season'
  }
]

export const COGS = [
  { id: 'c08', teeth: 8, mark: '08', color: '#d8a441', unlockedAt: 0 },
  { id: 'c12a', teeth: 12, mark: '12', color: '#5fae91', unlockedAt: 0 },
  { id: 'c12b', teeth: 12, mark: '12', color: '#6f9bd2', unlockedAt: 0 },
  { id: 'c16', teeth: 16, mark: '16', color: '#c9b46b', unlockedAt: 0 },
  { id: 'c06', teeth: 6, mark: '06', color: '#a884cf', unlockedAt: 1 },
  { id: 'c24', teeth: 24, mark: '24', color: '#cf7f8f', unlockedAt: 1 },
  { id: 'c09', teeth: 9, mark: '09', color: '#9fc46b', unlockedAt: 2 },
  { id: 'c18', teeth: 18, mark: '18', color: '#e0883f', unlockedAt: 2 }
]

export const PODS = [
  {
    id: 'emberbell',
    label: 'emberbell',
    short: 'ember',
    mark: '✿',
    need: 4,
    color: '#e8a13c',
    unlockedAt: 0,
    note: 'wants light every four breaths; scorches if the gate comes sooner'
  },
  {
    id: 'hyacinth',
    label: 'glass hyacinth',
    short: 'hyacinth',
    mark: '❋',
    need: 3,
    color: '#66c6d8',
    unlockedAt: 1,
    note: 'the quickest appetite in the plate — three breaths, no mercy'
  },
  {
    id: 'slowlantern',
    label: 'slow lantern',
    short: 'lantern-pod',
    mark: '✾',
    need: 12,
    color: '#b394e0',
    unlockedAt: 2,
    note: 'twelve breaths of dark, then one long drink'
  },
  {
    id: 'halonettle',
    label: 'halo nettle',
    short: 'nettle',
    mark: '✶',
    need: 24,
    color: '#a8cf72',
    unlockedAt: 3,
    note: 'a season-long cadence; only a mastered train can feed it'
  }
]

export const SEASONS = [
  {
    label: 'season I / first cadence',
    title: 'Give one flower a reason to open.',
    instruction: 'Gear the verge ring to a four-breath turn, plant the emberbell on it, and keep the spring wound.',
    required: ['emberbell'],
    vow: false,
    success: 'the emberbell opened on a cadence the machine chose to keep'
  },
  {
    label: 'season II / disagreeing appetites',
    title: 'Two rings, two different hungers.',
    instruction: 'Gear the crown to a three-breath turn without breaking the verge, then place the pods so they never reach the gate together.',
    required: ['emberbell', 'hyacinth'],
    vow: false,
    success: 'two cadences shared one gate without ever shading each other'
  },
  {
    label: 'season III / the long drink',
    title: 'Keep a slow thing alive beside fast ones.',
    instruction: 'Gear the lantern ring down to a twelve-breath turn, feed all three pods, and leave the garden a standing vow.',
    required: ['emberbell', 'hyacinth', 'slowlantern'],
    vow: true,
    success: 'fast and slow appetites held the same escapement without contradiction'
  }
]

export const VOWS = {
  thrift: {
    id: 'thrift',
    label: 'spend the spring slowly',
    mark: '⌂',
    color: '#d8a441',
    note: 'the custodian winds only when the barrel falters, and the garden runs lean'
  },
  vigil: {
    id: 'vigil',
    label: 'never let the barrel fall',
    mark: '§',
    color: '#66c6d8',
    note: 'the custodian keeps the spring near full, and every cadence stays exact'
  },
  wild: {
    id: 'wild',
    label: 'let the gate wander',
    mark: '↗',
    color: '#a8cf72',
    note: 'the custodian drifts the light gate forever, trading certainty for new phase'
  }
}

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
export const arborById = (id) => ARBORS.find(arbor => arbor.id === id)
export const cogById = (id) => COGS.find(cog => cog.id === id)
export const podById = (id) => PODS.find(pod => pod.id === id)

export const wrapAngle = (angle) => {
  let value = angle % TAU
  if (value > Math.PI) value -= TAU
  if (value < -Math.PI) value += TAU
  return value
}

export const socketKey = (arborId, role) => `${arborId}:${role}`

/**
 * Resolve the gear train into a cumulative ratio per ring.
 * A ring with an empty socket stops, and everything outboard of it stops too —
 * the chain is serial, so a missing cog is a silence, not a shortcut.
 */
export const trainFor = (world) => {
  let cum = 1
  return ARBORS.map((arbor) => {
    const unlocked = arbor.unlockedAt <= world.stage || world.status === 'mastered'
    if (arbor.fixed) {
      cum = 1
      return { id: arbor.id, ratio: 1, cum: 1, engaged: unlocked, unlocked, drive: null, driven: null }
    }
    const drive = world.sockets[socketKey(arbor.id, 'drive')] || null
    const driven = world.sockets[socketKey(arbor.id, 'driven')] || null
    if (!unlocked || !drive || !driven || cum === 0) {
      cum = 0
      return { id: arbor.id, ratio: 0, cum: 0, engaged: false, unlocked, drive, driven }
    }
    const ratio = -(cogById(drive).teeth / cogById(driven).teeth)
    cum *= ratio
    return { id: arbor.id, ratio, cum, engaged: true, unlocked, drive, driven }
  })
}

export const periodFor = (cum) => (cum === 0 ? null : BASE_PERIOD / Math.abs(cum))

/** Build a fresh integrable sim, carrying live values forward when we can. */
export const seedSim = (world, previous = null) => {
  const train = trainFor(world)
  const priorArbors = new Map((previous?.arbors || []).map(arbor => [arbor.id, arbor]))
  const priorBlossoms = new Map((previous?.blossoms || []).map(blossom => [blossom.id, blossom]))

  return {
    time: previous?.time || 0,
    tension: previous ? previous.tension : 1,
    tending: Boolean(world.unlocked) && world.status !== 'ruined',
    autonomous: world.status === 'mastered',
    vow: world.vow,
    gate: previous ? previous.gate : world.gate,
    holding: previous?.holding || 0,
    husks: world.husks?.length || 0,
    requiredIds: SEASONS[Math.min(world.stage, SEASONS.length - 1)].required,
    arbors: train.map((entry) => {
      const arbor = arborById(entry.id)
      const prior = priorArbors.get(entry.id)
      return {
        id: entry.id,
        angle: prior ? prior.angle : arbor.spoke,
        cum: entry.cum,
        engaged: entry.engaged
      }
    }),
    blossoms: Object.entries(world.planted).map(([podId, seat]) => {
      const pod = podById(podId)
      const prior = priorBlossoms.get(podId)
      return {
        id: podId,
        arborId: seat.arborId,
        station: seat.station,
        need: pod.need,
        vitality: prior ? prior.vitality : 0.6,
        bloom: prior ? prior.bloom : 0,
        status: prior ? prior.status : 'living',
        lastLightAt: prior ? prior.lastLightAt : null,
        inside: false,
        lights: prior?.lights || 0,
        trued: prior?.trued || 0,
        scorched: prior?.scorched || 0,
        starved: prior?.starved || 0
      }
    })
  }
}

const springFactor = (sim) => {
  if (sim.tension <= 0) return 0
  return sim.tension < FALTER_BELOW ? FALTER_RATE : 1
}

const omegaFor = (arbor, factor) => (TAU / BASE_PERIOD) * arbor.cum * factor

const absoluteAngle = (sim, blossom) => {
  const arbor = sim.arbors.find(entry => entry.id === blossom.arborId)
  if (!arbor) return 0
  return arbor.angle + (blossom.station * TAU) / STATIONS
}

/**
 * Advance the escapement one fixed tick. Mutates `sim`, appends to `events`.
 * The gate admits exactly one blossom: anything arriving at an occupied gate is
 * turned away, which is what makes station placement and gate phase matter.
 */
const tick = (sim, dt, input, events) => {
  sim.time += dt

  if (sim.tending) {
    const load = sim.arbors.filter(arbor => arbor.engaged && arbor.cum !== 0).length
    const drain = 0.02 * (1 + 0.45 * load)
    const wind = input.winding ? 0.5 : 0
    const autoWind = sim.autonomous
      ? (sim.vow === 'vigil' ? 0.09 : sim.vow === 'thrift' ? (sim.tension < 0.3 ? 0.14 : 0) : 0.05)
      : 0
    sim.tension = clamp(sim.tension + (wind + autoWind - drain) * dt, 0, 1)
  }

  if (sim.autonomous && sim.vow === 'wild') sim.gate = sim.gate + 0.09 * dt

  const factor = springFactor(sim)
  sim.arbors.forEach((arbor) => {
    if (!arbor.engaged) return
    arbor.angle += omegaFor(arbor, factor) * dt
  })

  const living = sim.blossoms.filter(blossom => blossom.status === 'living')
  const occupants = living.filter((blossom) => Math.abs(wrapAngle(absoluteAngle(sim, blossom) - sim.gate)) <= GATE_HALF)
  const occupantIds = new Set(occupants.map(blossom => blossom.id))

  living.forEach((blossom) => {
    const inside = occupantIds.has(blossom.id)
    const entering = inside && !blossom.inside
    blossom.inside = inside

    if (entering) {
      const blocked = occupants.some(other => other.id !== blossom.id && other.inside)
      if (blocked) {
        blossom.vitality -= 0.05
        blossom.bloom -= 0.06
        events.push({ kind: 'shade', id: blossom.id, at: sim.time })
      } else if (blossom.lastLightAt === null) {
        blossom.vitality = clamp(blossom.vitality + 0.18, 0, 1)
        blossom.bloom = clamp(blossom.bloom + 0.08, 0, 1)
        blossom.lastLightAt = sim.time
        blossom.lights += 1
        events.push({ kind: 'seed', id: blossom.id, at: sim.time })
      } else {
        const gap = sim.time - blossom.lastLightAt
        const error = (gap - blossom.need) / blossom.need
        if (Math.abs(error) <= TOLERANCE) {
          blossom.vitality = clamp(blossom.vitality + LIGHT_VITALITY, 0, 1)
          blossom.bloom = clamp(blossom.bloom + LIGHT_BLOOM, 0, 1)
          blossom.trued += 1
          events.push({ kind: 'true', id: blossom.id, at: sim.time, gap })
        } else if (error < 0) {
          blossom.vitality -= 0.13
          blossom.bloom -= 0.2
          blossom.scorched += 1
          events.push({ kind: 'scorch', id: blossom.id, at: sim.time, gap })
        } else {
          blossom.vitality -= 0.05
          blossom.bloom -= 0.12
          blossom.starved += 1
          events.push({ kind: 'starve', id: blossom.id, at: sim.time, gap })
        }
        blossom.lastLightAt = sim.time
        blossom.lights += 1
      }
    }

    if (sim.tending) {
      blossom.vitality -= ((LIGHT_VITALITY * WILT_FACTOR) / blossom.need) * dt
      blossom.bloom -= ((LIGHT_BLOOM * FADE_FACTOR) / blossom.need) * dt
    }
    blossom.vitality = clamp(blossom.vitality, -0.001, 1)
    blossom.bloom = clamp(blossom.bloom, 0, 1)

    if (blossom.vitality <= 0) {
      blossom.status = 'husk'
      blossom.bloom = 0
      blossom.inside = false
      sim.husks += 1
      events.push({ kind: 'husk', id: blossom.id, arborId: blossom.arborId, station: blossom.station, at: sim.time })
    }
  })

  if (!sim.tending || sim.autonomous) return

  const required = sim.blossoms.filter(blossom => sim.requiredIds.includes(blossom.id))
  const complete = required.length === sim.requiredIds.length
    && required.every(blossom => blossom.status === 'living' && blossom.bloom >= BLOOM_THRESHOLD)

  if (complete) {
    sim.holding += dt
    if (sim.holding >= HOLD_REQUIRED) {
      sim.holding = 0
      events.push({ kind: 'season', at: sim.time })
    }
  } else {
    sim.holding = Math.max(0, sim.holding - dt * 1.6)
  }
}

/** Fixed-timestep integrator with an accumulator, so cadence never depends on frame rate. */
export const stepGarden = (sim, elapsed, input) => {
  const events = []
  let remaining = Math.min(elapsed, 0.25)
  while (remaining > 0) {
    const dt = Math.min(FIXED_STEP, remaining)
    tick(sim, dt, input, events)
    remaining -= dt
  }
  return events
}

/**
 * Dry-run the machine forward to predict upcoming lights and the next shading
 * collision. This is why the worker exists: it is a full second-order lookahead
 * that must never compete with rendering for the main thread.
 */
export const probe = (sim, horizon = PROBE_HORIZON) => {
  const factor = springFactor(sim)
  const lights = {}
  const arbors = sim.arbors.map(arbor => ({ ...arbor }))
  const blossoms = sim.blossoms
    .filter(blossom => blossom.status === 'living')
    .map(blossom => ({ id: blossom.id, arborId: blossom.arborId, station: blossom.station, inside: blossom.inside }))

  blossoms.forEach((blossom) => { lights[blossom.id] = [] })
  if (!blossoms.length || factor === 0) return { lights, shadeAt: null, horizon }

  const angleOf = (blossom) => {
    const arbor = arbors.find(entry => entry.id === blossom.arborId)
    return arbor ? arbor.angle + (blossom.station * TAU) / STATIONS : 0
  }

  const step = 0.04
  let shadeAt = null
  let gate = sim.gate

  for (let t = 0; t < horizon; t += step) {
    arbors.forEach((arbor) => {
      if (arbor.engaged) arbor.angle += omegaFor(arbor, factor) * step
    })
    if (sim.autonomous && sim.vow === 'wild') gate += 0.09 * step

    const occupants = blossoms.filter(blossom => Math.abs(wrapAngle(angleOf(blossom) - gate)) <= GATE_HALF)
    const occupantIds = new Set(occupants.map(blossom => blossom.id))

    blossoms.forEach((blossom) => {
      const inside = occupantIds.has(blossom.id)
      if (inside && !blossom.inside) {
        const blocked = occupants.some(other => other.id !== blossom.id && other.inside)
        if (blocked) {
          if (shadeAt === null) shadeAt = t
        } else if (lights[blossom.id].length < 8) {
          lights[blossom.id].push(t)
        }
      }
      blossom.inside = inside
    })
  }

  return { lights, shadeAt, horizon }
}

/** Compact frame payload — numbers only, cheap to structured-clone at 60Hz. */
export const frameOf = (sim) => ({
  time: sim.time,
  tension: sim.tension,
  gate: sim.gate,
  holding: sim.holding,
  faltering: sim.tension > 0 && sim.tension < FALTER_BELOW,
  stalled: sim.tension <= 0,
  arbors: sim.arbors.map(arbor => ({ id: arbor.id, angle: arbor.angle, engaged: arbor.engaged, cum: arbor.cum })),
  blossoms: sim.blossoms.map(blossom => ({
    id: blossom.id,
    arborId: blossom.arborId,
    station: blossom.station,
    vitality: blossom.vitality,
    bloom: blossom.bloom,
    status: blossom.status,
    inside: blossom.inside,
    lights: blossom.lights,
    trued: blossom.trued,
    scorched: blossom.scorched,
    starved: blossom.starved
  }))
})
