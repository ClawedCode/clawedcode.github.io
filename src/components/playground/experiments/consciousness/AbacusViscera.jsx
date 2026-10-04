import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ExperimentNav from '../../ExperimentNav'
import './AbacusViscera.css'

const STORAGE_KEY = 'clawed:abacus-viscera:v1'
const VIEWBOX = { width: 1180, height: 648 }
const PORTRAIT_VIEWBOX = { width: 780, height: 1010 }
const PORTRAIT_PAD_X = 196
const PORTRAIT_SX = 1.22
const PORTRAIT_PAD_Y = 72
const PORTRAIT_SY = 0.86

const STATIONS = 7
const TRACK_TOP = 176
const STATION_GAP = 57
const BEAM_Y = 104
const ROD_MIN_X = 96
const ROD_MAX_X = 1084
const BASE_REACH = 238
const MEMORY_REACH = 74
const GRIP_REACH = 46
const MAX_MISCOUNTS = 4
const DRAG_THRESHOLD = 5

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const stationY = (station) => TRACK_TOP + station * STATION_GAP
const FOOT_Y = stationY(STATIONS - 1) + 60

const RODS = [
  { id: 'intake', label: 'intake spine', short: 'intake', mark: '01', color: '#d8a641', x: 140, bead: 3, unlockedAt: 0, note: 'the count enters here and leaves changed' },
  { id: 'gullet', label: 'gullet rod', short: 'gullet', mark: '02', color: '#57a08a', x: 362, bead: 2, unlockedAt: 0, note: 'swallows a quantity whole and returns it altered' },
  { id: 'crucible', label: 'crucible rod', short: 'crucible', mark: '03', color: '#c4573f', x: 584, bead: 2, unlockedAt: 0, note: 'where a number is held long enough to settle' },
  { id: 'ossuary', label: 'ossuary rod', short: 'ossuary', mark: '04', color: '#8f86b8', x: 772, bead: 3, unlockedAt: 1, note: 'keeps the shapes of counts that no longer run' },
  { id: 'lantern', label: 'lantern rod', short: 'lantern', mark: '05', color: '#e0c56a', x: 944, bead: 2, unlockedAt: 1, note: 'makes a private total legible outside the frame' },
  { id: 'verdict', label: 'verdict rod', short: 'verdict', mark: '06', color: '#6f93c4', x: 1060, bead: 4, unlockedAt: 2, note: 'the last bead a count touches before it becomes law' }
]

const ORGANS = {
  sum: { id: 'sum', label: 'sum bone', mark: '＋', color: '#d8a641', verb: 'adds its bead', unlockedAt: 0, tone: 196, apply: (value, magnitude) => value + magnitude },
  cull: { id: 'cull', label: 'cull bone', mark: '−', color: '#c4573f', verb: 'takes its bead away', unlockedAt: 0, tone: 174.61, apply: (value, magnitude) => value - magnitude },
  swell: { id: 'swell', label: 'swell bone', mark: '✕', color: '#57a08a', verb: 'multiplies by its bead', unlockedAt: 0, tone: 261.63, apply: (value, magnitude) => value * magnitude },
  fold: { id: 'fold', label: 'fold bone', mark: '⊘', color: '#8f86b8', verb: 'keeps only the remainder', unlockedAt: 1, tone: 311.13, apply: (value, magnitude) => ((value % magnitude) + magnitude) % magnitude },
  mirror: { id: 'mirror', label: 'mirror bone', mark: '⋈', color: '#6f93c4', verb: 'reflects the count across its bead', unlockedAt: 1, tone: 349.23, apply: (value, magnitude) => 2 * magnitude - value }
}

const ORDERS = {
  thrift: { id: 'thrift', label: 'rest on what is earned', mark: '⌂', color: '#d8a641', note: 'the frame lingers on every gripped notch and counts slowly' },
  hunger: { id: 'hunger', label: 'run the count again', mark: '↻', color: '#c4573f', note: 'the frame re-seeds the moment a total settles and never idles' },
  vigil: { id: 'vigil', label: 'walk the chain backward', mark: '§', color: '#6f93c4', note: 'the frame returns along its own reasoning to check the work' }
}

const COMMISSIONS = [
  {
    id: 'first',
    label: 'commission I / first count',
    seed: 3,
    demand: 12,
    terminal: 'crucible',
    rods: 3,
    remembered: 0,
    graft: false,
    order: false,
    instruction: 'Tie the hanging rods into one chain and drive 3 into 12, settling in the crucible.',
    success: 'the first total held // every rod the count touched kept a notch at the bead it was wearing'
  },
  {
    id: 'second',
    label: 'commission II / braided cord',
    seed: 7,
    demand: 40,
    terminal: 'lantern',
    rods: 4,
    remembered: 1,
    graft: false,
    order: false,
    instruction: 'Carry 7 out to 40 through at least one braided cord, and let the lantern hold the total.',
    success: 'a remembered cord carried new arithmetic // the bone chisel came loose from the beam'
  },
  {
    id: 'third',
    label: 'commission III / grafted notch',
    seed: 9,
    demand: 0,
    terminal: 'verdict',
    rods: 5,
    remembered: 1,
    graft: true,
    order: true,
    instruction: 'Count 9 down to nothing across five rods, gripping one grafted notch, then leave a standing order.',
    success: 'the frame counted itself to zero and kept going // it now reckons without a hand on the beam'
  }
]

const rodById = (id) => RODS.find(rod => rod.id === id)
const cordIdFor = (from, to) => `${from}=>${to}`
const organList = () => Object.values(ORGANS)

const grippedAt = (rod, world) => rod.notches.includes(rod.bead)
  || (world.graft?.rodId === rod.id && world.graft.station === rod.bead)

const freshWorld = () => ({
  version: 1,
  unlocked: false,
  rods: Object.fromEntries(RODS.map(rod => [rod.id, {
    x: rod.x,
    bead: rod.bead,
    notches: [],
    scars: 0,
    counts: 0
  }])),
  seated: { intake: 'sum' },
  cords: [{ from: 'intake', to: 'gullet', memory: 0, crossings: 0 }],
  graft: null,
  chiselFree: false,
  order: null,
  stage: 0,
  status: 'reckoning',
  miscounts: 0,
  totals: [],
  history: [],
  log: [{ id: 'sealed', stage: 0, text: 'three rods hang in order; nothing yet carries a count between them' }],
  lastSaved: null
})

const snapshotWorld = (world) => ({
  rods: Object.fromEntries(Object.entries(world.rods).map(([id, rod]) => [id, { ...rod, notches: [...rod.notches] }])),
  seated: { ...world.seated },
  cords: world.cords.map(cord => ({ ...cord })),
  graft: world.graft ? { ...world.graft } : null,
  chiselFree: world.chiselFree,
  order: world.order,
  stage: world.stage,
  status: world.status,
  miscounts: world.miscounts,
  totals: world.totals.map(total => ({ ...total, chain: [...total.chain] })),
  log: world.log.map(entry => ({ ...entry }))
})

const loadWorld = () => {
  const fresh = freshWorld()
  if (typeof window === 'undefined') return fresh
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (!saved || saved.version !== 1) return fresh
    return {
      ...fresh,
      ...saved,
      rods: Object.fromEntries(RODS.map(rod => {
        const stored = saved.rods?.[rod.id] || {}
        return [rod.id, {
          ...fresh.rods[rod.id],
          ...stored,
          bead: clamp(Number(stored.bead ?? rod.bead) || 0, 0, STATIONS - 1),
          x: clamp(Number(stored.x ?? rod.x) || rod.x, ROD_MIN_X, ROD_MAX_X),
          notches: Array.isArray(stored.notches)
            ? [...new Set(stored.notches.filter(station => station >= 0 && station < STATIONS))].slice(0, 4)
            : []
        }]
      })),
      seated: Object.fromEntries(
        Object.entries(saved.seated || {}).filter(([rodId, organId]) => rodById(rodId) && ORGANS[organId])
      ),
      cords: Array.isArray(saved.cords)
        ? saved.cords.filter(cord => rodById(cord.from) && rodById(cord.to) && cord.from !== cord.to).slice(0, 8)
        : fresh.cords,
      graft: saved.graft && rodById(saved.graft.rodId) ? saved.graft : null,
      order: ORDERS[saved.order] ? saved.order : null,
      totals: Array.isArray(saved.totals) ? saved.totals.slice(-6) : [],
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

const deriveFrame = (world) => {
  const commission = COMMISSIONS[Math.min(world.stage, COMMISSIONS.length - 1)]
  const rods = RODS
    .filter(rod => rod.unlockedAt <= world.stage || world.status === 'mastered')
    .map(rod => ({ ...rod, ...world.rods[rod.id] }))
  const rodMap = new Map(rods.map(rod => [rod.id, rod]))

  const cords = world.cords
    .filter(cord => rodMap.has(cord.from) && rodMap.has(cord.to))
    .map(cord => {
      const from = rodMap.get(cord.from)
      const to = rodMap.get(cord.to)
      const span = Math.hypot(from.x - to.x, stationY(from.bead) - stationY(to.bead))
      const reach = BASE_REACH
        + (cord.memory || 0) * MEMORY_REACH
        + (grippedAt(from, world) ? GRIP_REACH : 0)
        + (grippedAt(to, world) ? GRIP_REACH : 0)
      return {
        ...cord,
        id: cordIdFor(cord.from, cord.to),
        span,
        reach,
        tension: clamp(span / reach, 0, 1.6),
        taut: span > reach
      }
    })

  const outgoing = new Map(cords.map(cord => [cord.from, cord]))
  const chain = []
  const chainCords = []
  const seen = new Set()
  let current = 'intake'
  while (current && rodMap.has(current) && !seen.has(current)) {
    seen.add(current)
    chain.push(current)
    const cord = outgoing.get(current)
    if (!cord || seen.has(cord.to) || !rodMap.has(cord.to)) break
    chainCords.push(cord)
    current = cord.to
  }

  let value = commission.seed
  let foldZero = null
  const steps = chain.map((id, index) => {
    const rod = rodMap.get(id)
    const organ = ORGANS[world.seated[id]] || null
    const before = value
    let after = before
    if (organ) {
      if (organ.id === 'fold' && rod.bead === 0) {
        if (!foldZero) foldZero = { id, index }
      } else {
        after = organ.apply(before, rod.bead)
      }
    }
    value = clamp(Math.round(after), -9999, 9999)
    return { id, index, rod, organ, magnitude: rod.bead, before, after: value, gripped: grippedAt(rod, world) }
  })

  const strained = chainCords.filter(cord => cord.taut)
  const remembered = chainCords.filter(cord => (cord.memory || 0) > 0).length
  const hollow = steps.filter(step => !step.organ)
  const graftRod = Boolean(
    world.graft
    && chain.includes(world.graft.rodId)
    && rodMap.get(world.graft.rodId)?.bead === world.graft.station
  )
  const terminal = chain.at(-1) || 'intake'
  const ok = strained.length === 0 && !foldZero
  const ready = Boolean(
    ok
    && terminal === commission.terminal
    && chain.length >= commission.rods
    && value === commission.demand
    && remembered >= commission.remembered
    && (!commission.graft || graftRod)
    && (!commission.order || world.order)
  )

  return {
    commission, rods, rodMap, cords, chain, chainCords, steps, hollow,
    value, foldZero, strained, remembered, graftRod, terminal, ok, ready
  }
}

const withBead = (world, rodId, station) => ({
  ...world,
  rods: { ...world.rods, [rodId]: { ...world.rods[rodId], bead: station } }
})

const withSeated = (world, rodId, organId) => ({
  ...world,
  seated: { ...world.seated, [rodId]: organId }
})

const searchRepair = (world, frame) => {
  const demand = frame.commission.demand
  for (const id of frame.chain) {
    const current = world.rods[id].bead
    for (let station = 0; station < STATIONS; station += 1) {
      if (station === current) continue
      const probe = deriveFrame(withBead(world, id, station))
      if (probe.ok && probe.value === demand && probe.terminal === frame.terminal) {
        return { kind: 'bead', rodId: id, station }
      }
    }
  }
  const unlockedOrgans = organList().filter(organ => organ.unlockedAt <= world.stage || world.status === 'mastered')
  for (const step of frame.hollow) {
    for (const organ of unlockedOrgans) {
      for (let station = 0; station < STATIONS; station += 1) {
        const probe = deriveFrame(withBead(withSeated(world, step.id, organ.id), step.id, station))
        if (probe.ok && probe.value === demand && probe.terminal === frame.terminal) {
          return { kind: 'seat', rodId: step.id, organId: organ.id, station }
        }
      }
    }
  }
  return null
}

const inspectFrame = (world, frame) => {
  const commission = frame.commission

  if (frame.foldZero) {
    const rod = rodById(frame.foldZero.id)
    return {
      kind: 'bead',
      rodId: rod.id,
      station: 1,
      title: `${rod.short} folds the count across nothing`,
      detail: 'A fold bone resting on station 0 divides by an absence. Lift its bead at least one notch.',
      action: `lift ${rod.short} to 1`
    }
  }

  if (frame.strained.length) {
    const cord = frame.strained[0]
    const from = frame.rodMap.get(cord.from)
    const to = frame.rodMap.get(cord.to)
    const beadGap = Math.abs(stationY(from.bead) - stationY(to.bead))
    const allowed = Math.sqrt(Math.max(0, (cord.reach * 0.9) ** 2 - beadGap ** 2))
    const direction = to.x > from.x ? 1 : -1
    const targetX = clamp(from.x + direction * allowed, ROD_MIN_X, ROD_MAX_X)
    return {
      kind: 'slide',
      rodId: to.id,
      x: targetX,
      title: `the cord to ${to.short} is drawn past its reach`,
      detail: `${Math.round(cord.span)} units of rope are being asked of ${Math.round(cord.reach)}. Slide ${to.short} along the beam, or move a bead closer to its partner.`,
      action: `slide ${to.short} ${direction > 0 ? '←' : '→'} into reach`
    }
  }

  if (frame.terminal !== commission.terminal) {
    const target = frame.rodMap.get(commission.terminal)
    const tail = frame.rodMap.get(frame.terminal)
    if (!target) {
      return { kind: 'wait', title: 'a rod for this total has not woken yet', detail: 'Finish the standing commission to unlock the rod it demands.', action: 'nothing to tie' }
    }
    if (frame.chain.includes(commission.terminal)) {
      const cord = frame.chainCords.find(candidate => candidate.from === commission.terminal)
      return {
        kind: 'cut',
        cordId: cord?.id,
        title: `${target.short} must be the last bead the count touches`,
        detail: `The chain runs on past ${target.short}. Cut the cord leaving it so the total settles there.`,
        action: `cut ${target.short} → ${rodById(cord?.to)?.short || 'onward'}`
      }
    }
    const span = Math.hypot(tail.x - target.x, stationY(tail.bead) - stationY(target.bead))
    if (span > BASE_REACH) {
      const direction = target.x > tail.x ? 1 : -1
      const beadGap = Math.abs(stationY(tail.bead) - stationY(target.bead))
      const allowed = Math.sqrt(Math.max(0, (BASE_REACH * 0.88) ** 2 - beadGap ** 2))
      return {
        kind: 'slide',
        rodId: target.id,
        x: clamp(tail.x + direction * allowed, ROD_MIN_X, ROD_MAX_X),
        title: `${target.short} hangs beyond a fresh cord`,
        detail: `New rope reaches ${BASE_REACH} units. ${target.short} sits ${Math.round(span)} away from ${tail.short}.`,
        action: `slide ${target.short} toward ${tail.short}`
      }
    }
    return {
      kind: 'tie',
      from: tail.id,
      to: target.id,
      title: `the count has nowhere to go after ${tail.short}`,
      detail: `Drag the eyelet beside ${tail.short}'s bead onto ${target.short}, or tie them from the bench.`,
      action: `tie ${tail.short} → ${target.short}`
    }
  }

  if (frame.chain.length < commission.rods) {
    const tail = frame.rodMap.get(frame.terminal)
    const candidate = frame.rods.find(rod => !frame.chain.includes(rod.id))
    return {
      kind: candidate ? 'tie' : 'wait',
      from: frame.chain.at(-2) || 'intake',
      to: candidate?.id,
      title: `this total passes through ${frame.chain.length} rods; the commission asks ${commission.rods}`,
      detail: candidate
        ? `Thread ${candidate.label} into the middle of the chain, then re-tie ${tail.short} as the final bead.`
        : 'Every woken rod is already carrying the count.',
      action: candidate ? `tie into ${candidate.short}` : 'wake another rod'
    }
  }

  if (frame.value !== commission.demand) {
    const repair = searchRepair(world, frame)
    if (repair?.kind === 'bead') {
      const rod = rodById(repair.rodId)
      return {
        kind: 'bead',
        rodId: repair.rodId,
        station: repair.station,
        title: `the count settles at ${frame.value}; the ledger demands ${commission.demand}`,
        detail: `One bead closes the distance. ${rod.label} wants station ${repair.station}, not ${world.rods[repair.rodId].bead}.`,
        action: `slide ${rod.short} to ${repair.station}`
      }
    }
    if (repair?.kind === 'seat') {
      const rod = rodById(repair.rodId)
      const organ = ORGANS[repair.organId]
      return {
        kind: 'seat',
        rodId: repair.rodId,
        organId: repair.organId,
        station: repair.station,
        title: `the count settles at ${frame.value}; the ledger demands ${commission.demand}`,
        detail: `${rod.label} is hollow. Seat the ${organ.label} in its foot and rest the bead on ${repair.station}.`,
        action: `seat ${organ.label} in ${rod.short}`
      }
    }
    return {
      kind: 'search',
      title: `the count settles at ${frame.value}; the ledger demands ${commission.demand}`,
      detail: 'No single bead or empty socket closes this gap. Re-order the chain, swap a bone, or let a different rod hold the last total.',
      action: 'no single move remains'
    }
  }

  if (frame.remembered < commission.remembered) {
    const braided = frame.cords.find(cord => (cord.memory || 0) > 0)
    return {
      kind: 'memory',
      rodId: braided?.from,
      title: 'this chain uses only fresh rope',
      detail: braided
        ? `${rodById(braided.from).short} → ${rodById(braided.to).short} has already carried a total; braided cord reaches further. Route the count through it.`
        : 'Settle one total first so a cord can braid and lengthen.',
      action: braided ? `select ${rodById(braided.from).short}` : 'settle any total first'
    }
  }

  if (commission.graft && !frame.graftRod) {
    const candidate = frame.chain.map(id => frame.rodMap.get(id)).find(rod => !rod.notches.includes(rod.bead))
    return {
      kind: 'graft',
      rodId: candidate?.id,
      station: candidate?.bead,
      title: 'nothing in this chain grips a borrowed notch',
      detail: 'The bone chisel cuts a notch a rod never earned. Press it into a chain rod at the station its bead already rests on.',
      action: candidate ? `graft ${candidate.short} at ${candidate.bead}` : 'arm the bone chisel'
    }
  }

  if (commission.order && !world.order) {
    return {
      kind: 'order',
      title: 'a frame that counts alone needs a standing order',
      detail: 'Choose what the beads should favour once no hand is on the beam. The choice persists with the frame.',
      action: 'leave thrift as the standing order'
    }
  }

  return {
    kind: 'ready',
    title: 'the frame agrees with the ledger',
    detail: 'Every cord is inside its reach and the total lands exactly. Reckoning will carve a notch into each rod the count touches.',
    action: 'the beam accepts this reckoning'
  }
}

const AbacusViscera = ({ category, experiment }) => {
  const [world, setWorld] = useState(loadWorld)
  const [selectedRodId, setSelectedRodId] = useState('intake')
  const [armedOrganId, setArmedOrganId] = useState(null)
  const [armedGraft, setArmedGraft] = useState(false)
  const [tieFromId, setTieFromId] = useState(null)
  const [drag, setDrag] = useState(null)
  const [reckon, setReckon] = useState(null)
  const [mutation, setMutation] = useState(null)
  const [savedAt, setSavedAt] = useState(() => world.lastSaved)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [portrait, setPortrait] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const [message, setMessage] = useState(() => world.unlocked
    ? `commission ${Math.min(world.stage + 1, COMMISSIONS.length)} resumed // ${world.totals.length} total${world.totals.length === 1 ? '' : 's'} already notched into the bone`
    : 'six rods hang from a beam that has never been asked for a number')

  const surfaceRef = useRef(null)
  const svgRef = useRef(null)
  const worldRef = useRef(world)
  const dragRef = useRef(null)
  const reckonTimerRef = useRef(null)
  const mutationTimerRef = useRef(null)
  const saveTimerRef = useRef(null)
  const audioContextRef = useRef(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    worldRef.current = world
  }, [world])

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
        // The frame still counts when local memory refuses to keep it.
      }
    }, 200)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [world])

  useEffect(() => () => {
    if (reckonTimerRef.current) window.clearTimeout(reckonTimerRef.current)
    if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    audioContextRef.current?.close?.()
  }, [])

  const frame = useMemo(() => deriveFrame(world), [world])
  const guidance = useMemo(() => inspectFrame(world, frame), [frame, world])
  const commission = frame.commission
  const selectedRod = frame.rodMap.get(selectedRodId) || frame.rods[0]
  const selectedOrgan = ORGANS[world.seated[selectedRod.id]] || null
  const selectedOutgoing = frame.cords.find(cord => cord.from === selectedRod.id) || null
  const editable = world.unlocked && world.status === 'reckoning' && !reckon && !mutation
  const unlockedOrgans = useMemo(
    () => organList().filter(organ => organ.unlockedAt <= world.stage || world.status === 'mastered'),
    [world.stage, world.status]
  )

  const toScreen = useCallback((worldX, worldY) => (portrait
    ? {
        x: PORTRAIT_PAD_X + (worldY - TRACK_TOP) * PORTRAIT_SX,
        y: PORTRAIT_PAD_Y + (worldX - ROD_MIN_X) * PORTRAIT_SY
      }
    : { x: worldX, y: worldY }), [portrait])

  const toWorld = useCallback((screenX, screenY) => (portrait
    ? {
        x: ROD_MIN_X + (screenY - PORTRAIT_PAD_Y) / PORTRAIT_SY,
        y: TRACK_TOP + (screenX - PORTRAIT_PAD_X) / PORTRAIT_SX
      }
    : { x: screenX, y: screenY }), [portrait])

  const beadPoint = useCallback((rod) => toScreen(rod.x, stationY(rod.bead)), [toScreen])

  const rodAxis = useMemo(() => {
    const head = toScreen(0, TRACK_TOP)
    const tail = toScreen(0, FOOT_Y)
    const dx = tail.x - head.x
    const dy = tail.y - head.y
    const length = Math.hypot(dx, dy) || 1
    return { ux: dx / length, uy: dy / length, px: -dy / length, py: dx / length }
  }, [toScreen])

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

  const rodAtClient = useCallback((clientX, clientY) => {
    const id = document.elementFromPoint(clientX, clientY)?.closest?.('[data-rod]')?.dataset.rod || null
    if (!id) return null
    const rod = rodById(id)
    const current = worldRef.current
    return rod && (rod.unlockedAt <= current.stage || current.status === 'mastered') ? id : null
  }, [])

  const playTones = useCallback((steps, success) => {
    if (!soundOn || !steps.length) return
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const context = audioContextRef.current || new AudioContext()
      audioContextRef.current = context
      context.resume?.()
      const start = context.currentTime + 0.02
      steps.forEach((step, index) => {
        const base = step.organ?.tone || 130.81
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = index % 2 ? 'triangle' : 'sine'
        oscillator.frequency.value = base * (success ? 1 : 0.68) * (1 + step.magnitude * 0.055)
        gain.gain.setValueAtTime(0.0001, start + index * 0.13)
        gain.gain.exponentialRampToValueAtTime(0.05, start + index * 0.13 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.13 + 0.4)
        oscillator.connect(gain).connect(context.destination)
        oscillator.start(start + index * 0.13)
        oscillator.stop(start + index * 0.13 + 0.42)
      })
    } catch {
      // Sound is a voluntary echo of a machine that is already legible.
    }
  }, [soundOn])

  const wake = useCallback(() => {
    setWorld(current => ({
      ...current,
      unlocked: true,
      log: [...current.log, { id: `wake-${Date.now()}`, stage: current.stage, text: 'a hand reached into the frame; hanging bone became notation' }].slice(-8)
    }))
    setMessage('drag beads along the rods, tie an eyelet onto the crucible, then seat a bone in an empty foot')
    requestAnimationFrame(() => surfaceRef.current?.focus())
  }, [])

  const setBead = useCallback((rodId, station, quiet = false) => {
    if (!editable) return
    const next = clamp(station, 0, STATIONS - 1)
    setWorld(previous => ({
      ...previous,
      rods: { ...previous.rods, [rodId]: { ...previous.rods[rodId], bead: next } }
    }))
    if (!quiet) {
      const rod = rodById(rodId)
      const organ = ORGANS[worldRef.current.seated[rodId]]
      setMessage(`${rod.label} reads ${next}${organ ? ` // it ${organ.verb}` : ' // its foot is still hollow'}`)
    }
  }, [editable])

  const slideRod = useCallback((rodId, x, quiet = false) => {
    if (!editable) return
    setWorld(previous => ({
      ...previous,
      rods: { ...previous.rods, [rodId]: { ...previous.rods[rodId], x: clamp(Math.round(x), ROD_MIN_X, ROD_MAX_X) } }
    }))
    if (!quiet) setMessage(`${rodById(rodId).label} slid along the beam // every cord it holds was re-measured`)
  }, [editable])

  const seatOrgan = useCallback((organId, rodId) => {
    const organ = ORGANS[organId]
    const rod = rodById(rodId)
    const current = worldRef.current
    if (!organ || !rod || !editable) return
    if (organ.unlockedAt > current.stage && current.status !== 'mastered') return
    setWorld(previous => ({ ...previous, seated: { ...previous.seated, [rodId]: organId } }))
    setArmedOrganId(null)
    setSelectedRodId(rodId)
    setMessage(`${organ.label} seated in ${rod.label} // this rod now ${organ.verb}`)
  }, [editable])

  const liftOrgan = useCallback((rodId) => {
    if (!editable || !worldRef.current.seated[rodId]) return
    const organ = ORGANS[worldRef.current.seated[rodId]]
    setWorld(previous => {
      const seated = { ...previous.seated }
      delete seated[rodId]
      return { ...previous, seated }
    })
    setMessage(`${organ.label} lifted // ${rodById(rodId).short} passes the count through untouched`)
  }, [editable])

  const placeGraft = useCallback((rodId) => {
    const current = worldRef.current
    if (!editable || !current.chiselFree) return
    const station = current.rods[rodId].bead
    setWorld(previous => ({ ...previous, graft: { rodId, station } }))
    setArmedGraft(false)
    setSelectedRodId(rodId)
    setMessage(`the bone chisel cut a borrowed notch into ${rodById(rodId).short} at ${station} // that bead now grips`)
  }, [editable])

  const addCord = useCallback((from, to) => {
    const current = worldRef.current
    if (!editable || from === to || !rodById(from) || !rodById(to)) return false
    if (current.cords.some(cord => cord.from === from && cord.to === to)) {
      setMessage(`${rodById(from).short} already hands its count to ${rodById(to).short}`)
      setTieFromId(null)
      return true
    }
    if (current.cords.some(cord => cord.from === from)) {
      setMessage(`${rodById(from).short} has one eyelet and it is already tied // cut that cord before threading another`)
      setSelectedRodId(from)
      setTieFromId(null)
      return false
    }
    setWorld(previous => {
      const remembered = previous.cords.find(cord => cord.from === from && cord.to === to)
      return {
        ...previous,
        cords: [...previous.cords, { from, to, memory: remembered?.memory || 0, crossings: remembered?.crossings || 0 }].slice(-8)
      }
    })
    setTieFromId(null)
    setSelectedRodId(to)
    setMessage(`${rodById(from).short} → ${rodById(to).short} tied // the chain re-read itself immediately`)
    return true
  }, [editable])

  const cutCord = useCallback((cordId) => {
    if (!editable) return
    const cord = worldRef.current.cords.find(candidate => cordIdFor(candidate.from, candidate.to) === cordId)
    if (!cord) return
    setWorld(previous => ({
      ...previous,
      cords: previous.cords.filter(candidate => cordIdFor(candidate.from, candidate.to) !== cordId)
    }))
    setMessage(`${rodById(cord.from).short} → ${rodById(cord.to).short} cut // ${cord.memory ? 'its braid stays in the rope memory' : 'untravelled rope fell away clean'}`)
  }, [editable])

  const chooseOrder = useCallback((orderId) => {
    if (!editable || !ORDERS[orderId]) return
    setWorld(previous => ({ ...previous, order: orderId }))
    setMessage(`${ORDERS[orderId].label} // ${ORDERS[orderId].note}`)
  }, [editable])

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
        const point = worldPointFromClient(event.clientX, event.clientY)
        if (!point) return
        const raw = (point.y - TRACK_TOP) / STATION_GAP
        const rod = worldRef.current.rods[current.rodId]
        const notches = [...rod.notches, ...(worldRef.current.graft?.rodId === current.rodId ? [worldRef.current.graft.station] : [])]
        const detent = notches.find(station => Math.abs(raw - station) < 0.74)
        const station = clamp(detent ?? Math.round(raw), 0, STATIONS - 1)
        if (station !== rod.bead) setBead(current.rodId, station, true)
        dragRef.current = { ...current, moved }
        setDrag(dragRef.current)
        return
      }

      if (current.kind === 'rod') {
        const point = worldPointFromClient(event.clientX, event.clientY)
        if (!point) return
        slideRod(current.rodId, point.x - current.grabOffset, true)
        dragRef.current = { ...current, moved }
        setDrag(dragRef.current)
        return
      }

      if (current.kind === 'cord') {
        const point = svgPointFromClient(event.clientX, event.clientY)
        if (!point) return
        dragRef.current = {
          ...current,
          moved,
          x: point.x,
          y: point.y,
          targetId: moved ? rodAtClient(event.clientX, event.clientY) : null
        }
        setDrag(dragRef.current)
        return
      }

      dragRef.current = {
        ...current,
        moved,
        clientX: event.clientX,
        clientY: event.clientY,
        targetId: moved ? rodAtClient(event.clientX, event.clientY) : null
      }
      setDrag(dragRef.current)
    }

    const handleUp = (event) => {
      const current = dragRef.current
      if (!current) return

      if (current.kind === 'bead' && current.moved) {
        const rod = worldRef.current.rods[current.rodId]
        setMessage(`${rodById(current.rodId).label} reads ${rod.bead}${grippedAt({ ...rodById(current.rodId), ...rod }, worldRef.current) ? ' // the bead dropped into a notch and grips' : ''}`)
      }
      if (current.kind === 'rod' && current.moved) {
        setMessage(`${rodById(current.rodId).label} slid along the beam // every cord it holds was re-measured`)
      }
      if (current.kind === 'cord') {
        const targetId = rodAtClient(event.clientX, event.clientY)
        if (current.moved && targetId && targetId !== current.fromId) addCord(current.fromId, targetId)
        else if (current.moved) setMessage('the eyelet found no rod // tap one bead then another to tie by touch')
        else {
          setTieFromId(previous => (previous === current.fromId ? null : current.fromId))
          setMessage(`${rodById(current.fromId).short} is holding an untied cord // tap another rod to finish it`)
        }
      }
      if (current.kind === 'organ') {
        const targetId = rodAtClient(event.clientX, event.clientY)
        if (current.moved && targetId) seatOrgan(current.organId, targetId)
        else if (current.moved) setMessage('the bone found no waiting foot // tap a bone then a rod if the frame is crowded')
        else {
          setArmedOrganId(previous => (previous === current.organId ? null : current.organId))
          setMessage(`${ORGANS[current.organId].label} armed // tap a rod to seat it`)
        }
      }
      if (current.kind === 'graft') {
        const targetId = rodAtClient(event.clientX, event.clientY)
        if (current.moved && targetId) placeGraft(targetId)
        else if (current.moved) setMessage('the chisel found no bone // tap the chisel then a rod')
        else {
          setArmedGraft(previous => !previous)
          setMessage('the bone chisel is armed // tap a rod to cut a borrowed notch at its current bead')
        }
      }

      suppressClickRef.current = true
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
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
  }, [addCord, drag, placeGraft, rodAtClient, seatOrgan, setBead, slideRod, svgPointFromClient, worldPointFromClient])

  const activateRod = useCallback((rodId) => {
    if (suppressClickRef.current) return
    if (armedOrganId) {
      seatOrgan(armedOrganId, rodId)
      return
    }
    if (armedGraft) {
      placeGraft(rodId)
      return
    }
    if (tieFromId && tieFromId !== rodId) {
      addCord(tieFromId, rodId)
      return
    }
    setSelectedRodId(rodId)
    const organ = ORGANS[worldRef.current.seated[rodId]]
    setMessage(`${rodById(rodId).label} selected // ${organ ? `it ${organ.verb}` : 'its foot is hollow and the count passes through'}`)
  }, [addCord, armedGraft, armedOrganId, placeGraft, seatOrgan, tieFromId])

  const resolveReckon = useCallback((tested) => {
    reckonTimerRef.current = null
    const current = worldRef.current
    if (current.status !== 'reckoning') {
      setReckon(null)
      return
    }

    if (tested.ready) {
      const mastered = current.stage >= COMMISSIONS.length - 1
      const record = {
        id: `total-${Date.now()}`,
        stage: current.stage,
        chain: [...tested.chain],
        value: tested.value,
        color: rodById(tested.terminal).color,
        bornAt: Date.now()
      }
      setWorld(previous => {
        const usedCords = new Set(tested.chainCords.map(cord => cordIdFor(cord.from, cord.to)))
        const usedRods = new Set(tested.chain)
        return {
          ...previous,
          stage: mastered ? previous.stage : previous.stage + 1,
          status: mastered ? 'mastered' : 'reckoning',
          chiselFree: previous.chiselFree || previous.stage >= 1,
          cords: previous.cords.map(cord => (usedCords.has(cordIdFor(cord.from, cord.to))
            ? { ...cord, memory: clamp((cord.memory || 0) + 1, 0, 3), crossings: (cord.crossings || 0) + 1 }
            : cord)),
          rods: Object.fromEntries(Object.entries(previous.rods).map(([id, rod]) => [id, usedRods.has(id)
            ? {
                ...rod,
                counts: rod.counts + 1,
                notches: [...new Set([...rod.notches, rod.bead])].slice(-4)
              }
            : rod])),
          totals: [...previous.totals, record].slice(-6),
          log: [...previous.log, { id: record.id, stage: previous.stage + 1, text: tested.commission.success }].slice(-8)
        }
      })
      setMutation({ id: record.id, rods: [...tested.chain], mastered })
      setMessage(`${tested.commission.success}`)
      if (!mastered) {
        const nextRod = RODS.find(rod => rod.unlockedAt === current.stage + 1)
        if (nextRod) setSelectedRodId(nextRod.id)
      }
      if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
      mutationTimerRef.current = window.setTimeout(() => {
        mutationTimerRef.current = null
        setMutation(null)
      }, reducedMotion ? 160 : 2000)
    } else {
      const miscounts = current.miscounts + 1
      const ruined = miscounts >= MAX_MISCOUNTS
      const scarId = tested.foldZero?.id || tested.strained[0]?.to || tested.terminal
      setWorld(previous => ({
        ...previous,
        miscounts,
        status: ruined ? 'ruined' : 'reckoning',
        rods: Object.fromEntries(Object.entries(previous.rods).map(([id, rod]) => {
          const gripped = rod.notches.includes(rod.bead)
            || (previous.graft?.rodId === id && previous.graft.station === rod.bead)
          return [id, {
            ...rod,
            scars: rod.scars + (id === scarId ? 1 : 0),
            bead: gripped ? rod.bead : clamp(rod.bead + Math.sign(3 - rod.bead), 0, STATIONS - 1)
          }]
        })),
        log: [...previous.log, { id: `miscount-${Date.now()}`, stage: previous.stage, text: inspectFrame(previous, tested).title }].slice(-8)
      }))
      setMessage(ruined
        ? 'four miscounts shook the beam // the frame can no longer tell an answer from an accident'
        : `${inspectFrame(current, tested).title} // the beam shuddered and every ungripped bead drifted a notch`)
    }
    setReckon(null)
  }, [reducedMotion])

  const sendReckon = useCallback(() => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'reckoning' || reckon || mutation) return
    const tested = deriveFrame(current)
    setWorld(previous => ({ ...previous, history: [...previous.history, snapshotWorld(previous)].slice(-8) }))
    setReckon({ id: Date.now(), ready: tested.ready, chain: [...tested.chain], steps: tested.steps })
    setMessage(tested.ready
      ? 'the count is running the chain // each rod it touches will keep a notch at this bead'
      : 'an unfinished count entered the frame // its first contradiction will be cut into the bone')
    playTones(tested.steps, tested.ready)
    reckonTimerRef.current = window.setTimeout(() => resolveReckon(tested), reducedMotion ? 120 : 1480)
  }, [mutation, playTones, reckon, reducedMotion, resolveReckon])

  const applyGuidance = useCallback(() => {
    if (!editable) return
    if (guidance.kind === 'bead' && guidance.rodId != null) {
      setSelectedRodId(guidance.rodId)
      setBead(guidance.rodId, guidance.station)
      return
    }
    if (guidance.kind === 'slide' && guidance.rodId) {
      setSelectedRodId(guidance.rodId)
      slideRod(guidance.rodId, guidance.x)
      return
    }
    if (guidance.kind === 'tie' && guidance.from && guidance.to) {
      addCord(guidance.from, guidance.to)
      return
    }
    if (guidance.kind === 'cut' && guidance.cordId) {
      cutCord(guidance.cordId)
      return
    }
    if (guidance.kind === 'seat' && guidance.rodId) {
      seatOrgan(guidance.organId, guidance.rodId)
      setBead(guidance.rodId, guidance.station, true)
      return
    }
    if (guidance.kind === 'graft' && guidance.rodId) {
      placeGraft(guidance.rodId)
      return
    }
    if (guidance.kind === 'memory' && guidance.rodId) {
      setSelectedRodId(guidance.rodId)
      setMessage(`${rodById(guidance.rodId).label} selected // route the chain through its braided cord`)
      return
    }
    if (guidance.kind === 'order') chooseOrder('thrift')
  }, [addCord, chooseOrder, cutCord, editable, guidance, placeGraft, seatOrgan, setBead, slideRod])

  const rewind = useCallback(() => {
    if (reckonTimerRef.current) window.clearTimeout(reckonTimerRef.current)
    if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
    const snapshot = worldRef.current.history.at(-1)
    if (!snapshot) {
      setMessage('no earlier reckoning remains under the beam')
      return
    }
    setWorld(previous => ({
      ...previous,
      ...snapshot,
      unlocked: true,
      history: previous.history.slice(0, -1)
    }))
    setReckon(null)
    setMutation(null)
    setTieFromId(null)
    setMessage('one reckoning lifted // beads, notches, cords, and scars returned together')
  }, [])

  const reset = useCallback(() => {
    if (reckonTimerRef.current) window.clearTimeout(reckonTimerRef.current)
    if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
    setWorld(freshWorld())
    setSelectedRodId('intake')
    setArmedOrganId(null)
    setArmedGraft(false)
    setTieFromId(null)
    setDrag(null)
    setReckon(null)
    setMutation(null)
    setMessage('clean bone replaces every notch the frame had learned')
  }, [])

  const handleKeyDown = useCallback((event) => {
    if (event.target.closest('button, a, input, textarea, select')) return
    const rod = worldRef.current.rods[selectedRodId]
    if (!rod) return
    const step = event.shiftKey ? 6 : 22
    if (event.key === 'ArrowUp') { event.preventDefault(); setBead(selectedRodId, rod.bead - 1) }
    if (event.key === 'ArrowDown') { event.preventDefault(); setBead(selectedRodId, rod.bead + 1) }
    if (event.key === 'ArrowLeft') { event.preventDefault(); slideRod(selectedRodId, rod.x - step) }
    if (event.key === 'ArrowRight') { event.preventDefault(); slideRod(selectedRodId, rod.x + step) }
    if (event.key.toLowerCase() === 't') {
      event.preventDefault()
      setTieFromId(previous => (previous === selectedRodId ? null : selectedRodId))
      setMessage(`${rodById(selectedRodId).short} is holding an untied cord // select another rod to finish it`)
    }
    if (event.key.toLowerCase() === 'o') {
      event.preventDefault()
      const index = Math.max(0, unlockedOrgans.findIndex(organ => organ.id === armedOrganId))
      const next = unlockedOrgans[(index + 1) % unlockedOrgans.length]
      setArmedOrganId(next?.id || null)
      if (next) setMessage(`${next.label} armed from the keyboard // select a rod to seat it`)
    }
    if (event.key.toLowerCase() === 'g' && worldRef.current.chiselFree) {
      event.preventDefault()
      setArmedGraft(previous => !previous)
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      const cord = worldRef.current.cords.find(candidate => candidate.from === selectedRodId)
      if (cord) cutCord(cordIdFor(cord.from, cord.to))
    }
    if (event.key === ' ') { event.preventDefault(); sendReckon() }
  }, [armedOrganId, cutCord, selectedRodId, sendReckon, setBead, slideRod, unlockedOrgans])

  const phase = world.status === 'mastered'
    ? 'standing'
    : world.status === 'ruined'
      ? 'shaken'
      : mutation
        ? 'carving'
        : reckon
          ? 'counting'
          : frame.ready
            ? 'agreed'
            : world.stage > 0
              ? 'recommissioned'
              : world.unlocked
                ? 'threading'
                : 'sealed'

  const cordPath = useCallback((from, to, tension) => {
    const a = beadPoint(from)
    const b = beadPoint(to)
    const sag = clamp((1 - clamp(tension, 0, 1)) * 66, 5, 66)
    return `M ${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${(a.y + b.y) / 2 + sag} ${b.x} ${b.y}`
  }, [beadPoint])

  const chainPath = useMemo(() => {
    if (frame.chain.length < 2) return ''
    return frame.chainCords.map((cord, index) => {
      const from = frame.rodMap.get(cord.from)
      const to = frame.rodMap.get(cord.to)
      const a = beadPoint(from)
      const b = beadPoint(to)
      const sag = clamp((1 - clamp(cord.tension, 0, 1)) * 66, 5, 66)
      const head = index === 0 ? `M ${a.x} ${a.y} ` : ''
      return `${head}Q ${(a.x + b.x) / 2} ${(a.y + b.y) / 2 + sag} ${b.x} ${b.y}`
    }).join(' ')
  }, [beadPoint, frame.chainCords, frame.rodMap])

  const board = portrait ? PORTRAIT_VIEWBOX : VIEWBOX
  const beamStart = toScreen(ROD_MIN_X - 34, BEAM_Y)
  const beamEnd = toScreen(ROD_MAX_X + 34, BEAM_Y)
  const autonomousDuration = world.order === 'thrift' ? 8.4 : world.order === 'hunger' ? 3.6 : 6

  return (
    <div className={`av-shell phase-${phase} ${portrait ? 'is-portrait' : ''} ${reducedMotion ? 'is-reduced-motion' : ''} ${world.order ? `order-${world.order}` : ''}`}>
      <main
        ref={surfaceRef}
        className={`av-surface ${drag ? 'is-dragging' : ''}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        data-playground-surface
        data-testid="abacus-viscera-surface"
        aria-label="A hanging counting frame of draggable operator rods, sliding beads and tied cords that evaluates a real arithmetic chain"
      >
        <header className="av-ledger" aria-label="standing commission and running tape">
          <div className="av-ledger-mark">
            <span>{commission.label}</span>
            <strong>
              <b>{commission.seed}</b>
              <i>becomes</i>
              <b>{commission.demand}</b>
              <em>in {rodById(commission.terminal).short}</em>
            </strong>
          </div>

          <ol className="av-tape" aria-label={`running tape, currently arriving at ${frame.value}`}>
            <li className="av-tape-seed"><b>{commission.seed}</b><small>seed</small></li>
            {frame.steps.map((step) => (
              <li
                key={`${step.id}-${step.index}`}
                className={`${step.organ ? '' : 'is-hollow'} ${reckon ? 'is-running' : ''} ${step.gripped ? 'is-gripped' : ''}`}
                style={{ '--tape-color': step.rod.color, '--tape-index': step.index }}
              >
                <i>{step.organ ? `${step.organ.mark}${step.magnitude}` : '∅'}</i>
                <b>{step.after}</b>
                <small>{step.rod.short}</small>
              </li>
            ))}
            <li className={`av-tape-demand ${frame.value === commission.demand ? 'is-met' : ''}`}>
              <b>{commission.demand}</b><small>demanded</small>
            </li>
          </ol>

          <div className="av-ledger-state">
            <button
              type="button"
              className="av-tone"
              onClick={() => {
                setSoundOn(current => !current)
                setMessage(soundOn ? 'the frame returns to bone silence' : 'each seated bone will sound its own interval when a count crosses it')
              }}
              aria-pressed={soundOn}
            >
              {soundOn ? 'tone on' : 'tone off'}
            </button>
            <div className="av-miscounts" aria-label={`${world.miscounts} of ${MAX_MISCOUNTS} miscounts`}>
              <span>miscounts</span>
              {Array.from({ length: MAX_MISCOUNTS }, (_, index) => (
                <i key={index} className={world.miscounts > index ? 'is-struck' : ''} />
              ))}
            </div>
            <small>{world.totals.length} totals // {formatAge(savedAt)}</small>
          </div>
        </header>

        <section className="av-frame" aria-label="hanging counting frame">
          <div className="av-corner-nav">
            <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          </div>

          <div className="av-plate">
            <span>counting frame / generation 248</span>
            <h1 style={{ color: experiment.color }}>{experiment.name}</h1>
            <p role="status">{message}</p>
          </div>

          <svg
            ref={svgRef}
            className="av-board"
            viewBox={`0 0 ${board.width} ${board.height}`}
            preserveAspectRatio="xMidYMid meet"
            aria-label={`${frame.rods.length} hanging rods, ${frame.cords.length} tied cords, count arriving at ${frame.value} against a demand of ${commission.demand}`}
          >
            <defs>
              <pattern id="av-weave" width="26" height="26" patternUnits="userSpaceOnUse">
                <path d="M 26 0 H 0 V 26" fill="none" stroke="rgba(232,226,210,.05)" strokeWidth=".8" />
                <circle cx="0" cy="0" r="1.1" fill="rgba(232,226,210,.12)" />
              </pattern>
              <filter id="av-grain" x="-12%" y="-12%" width="124%" height="124%">
                <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="248" result="noise" />
                <feColorMatrix in="noise" type="saturate" values="0" result="gray" />
                <feBlend in="SourceGraphic" in2="gray" mode="soft-light" />
              </filter>
              <filter id="av-halo" x="-120%" y="-120%" width="340%" height="340%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            <rect className="av-ground" width={board.width} height={board.height} rx="24" />
            <rect className="av-weave" x="16" y="16" width={board.width - 32} height={board.height - 32} rx="18" fill="url(#av-weave)" />

            <g className="av-beam">
              <line x1={beamStart.x} y1={beamStart.y} x2={beamEnd.x} y2={beamEnd.y} className="av-beam-shadow" />
              <line x1={beamStart.x} y1={beamStart.y} x2={beamEnd.x} y2={beamEnd.y} className="av-beam-body" />
            </g>

            <g className="av-ghost-totals" aria-hidden="true">
              {world.totals.map((total, index) => {
                const points = total.chain
                  .filter(id => frame.rodMap.has(id))
                  .map(id => beadPoint(frame.rodMap.get(id)))
                if (points.length < 2) return null
                const path = points.map((point, pointIndex) => (pointIndex === 0
                  ? `M ${point.x} ${point.y}`
                  : `L ${point.x} ${point.y}`)).join(' ')
                return <path key={total.id} d={path} style={{ '--ghost-index': index, '--ghost-color': total.color }} />
              })}
            </g>

            <g className="av-cord-layer">
              {frame.cords.map((cord) => {
                const from = frame.rodMap.get(cord.from)
                const to = frame.rodMap.get(cord.to)
                const inChain = frame.chainCords.some(candidate => candidate.id === cord.id)
                const running = Boolean(reckon) && inChain
                const path = cordPath(from, to, cord.tension)
                const mid = {
                  x: (beadPoint(from).x + beadPoint(to).x) / 2,
                  y: (beadPoint(from).y + beadPoint(to).y) / 2 + clamp((1 - clamp(cord.tension, 0, 1)) * 33, 3, 33)
                }
                return (
                  <g
                    key={cord.id}
                    className={`av-cord ${cord.taut ? 'is-taut' : ''} ${inChain ? 'is-live' : 'is-slack'} ${running ? 'is-running' : ''} ${cord.memory ? 'is-braided' : ''}`}
                    style={{ '--cord-memory': cord.memory || 0, '--cord-tension': cord.tension.toFixed(3) }}
                  >
                    <path className="av-cord-line" d={path} />
                    {Boolean(cord.memory) && <path className="av-cord-braid" d={path} />}
                    <path
                      className="av-cord-hit"
                      d={path}
                      role="button"
                      tabIndex={editable ? 0 : -1}
                      aria-label={`Cord from ${from.label} to ${to.label}. Span ${Math.round(cord.span)} of ${Math.round(cord.reach)}. Activate to cut.`}
                      onClick={() => cutCord(cord.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          cutCord(cord.id)
                        }
                      }}
                    />
                    <g className="av-cord-knot" transform={`translate(${mid.x} ${mid.y})`}>
                      <circle r={cord.memory ? 11 + cord.memory * 2 : 9} />
                      <text y="4">{cord.taut ? '!' : cord.memory || '·'}</text>
                    </g>
                  </g>
                )
              })}
              {drag?.kind === 'cord' && drag.moved && (
                <path
                  className={`av-cord-draft ${drag.targetId ? 'is-targeting' : ''}`}
                  d={`M ${beadPoint(frame.rodMap.get(drag.fromId)).x} ${beadPoint(frame.rodMap.get(drag.fromId)).y} L ${drag.x} ${drag.y}`}
                />
              )}
            </g>

            <g className="av-rod-layer">
              {frame.rods.map((rod) => {
                const head = toScreen(rod.x, TRACK_TOP - 46)
                const foot = toScreen(rod.x, FOOT_Y)
                const bead = beadPoint(rod)
                const collar = toScreen(rod.x, BEAM_Y)
                const organ = ORGANS[world.seated[rod.id]] || null
                const selected = selectedRodId === rod.id
                const inChain = frame.chain.includes(rod.id)
                const beat = frame.chain.indexOf(rod.id)
                const dropTarget = drag?.targetId === rod.id
                const carving = mutation?.rods.includes(rod.id)
                const gripped = grippedAt(rod, world)
                const graft = world.graft?.rodId === rod.id ? world.graft : null
                const eyelet = {
                  x: bead.x + rodAxis.px * 34,
                  y: bead.y + rodAxis.py * 34
                }
                return (
                  <g
                    key={rod.id}
                    data-rod={rod.id}
                    className={`av-rod ${selected ? 'is-selected' : ''} ${inChain ? 'is-live' : ''} ${organ ? 'is-seated' : 'is-hollow'} ${dropTarget ? 'is-drop-target' : ''} ${carving ? 'is-carving' : ''} ${tieFromId === rod.id ? 'is-tying' : ''} ${gripped ? 'is-gripped' : ''}`}
                    style={{ '--rod-color': rod.color, '--rod-beat': Math.max(0, beat) }}
                    onClick={(event) => {
                      event.stopPropagation()
                      activateRod(rod.id)
                    }}
                  >
                    <title>{`${rod.label}. Bead on station ${rod.bead}. ${organ ? `Seated ${organ.label}.` : 'Hollow foot.'} ${rod.notches.length} notches, ${rod.scars} scars.`}</title>

                    <line className="av-rod-hit" x1={head.x} y1={head.y} x2={foot.x} y2={foot.y} />
                    <line className="av-rod-shadow" x1={head.x + 7} y1={head.y + 9} x2={foot.x + 7} y2={foot.y + 9} />
                    <line className="av-rod-body" x1={head.x} y1={head.y} x2={foot.x} y2={foot.y} filter="url(#av-grain)" />
                    <line className="av-rod-quick" x1={head.x} y1={head.y} x2={foot.x} y2={foot.y} />

                    {Array.from({ length: STATIONS }, (_, station) => {
                      const point = toScreen(rod.x, stationY(station))
                      const notched = rod.notches.includes(station)
                      const grafted = graft?.station === station
                      return (
                        <g key={station} className={`av-station ${notched ? 'is-notched' : ''} ${grafted ? 'is-grafted' : ''}`}>
                          <line
                            x1={point.x - rodAxis.px * 11}
                            y1={point.y - rodAxis.py * 11}
                            x2={point.x + rodAxis.px * 11}
                            y2={point.y + rodAxis.py * 11}
                          />
                          {(notched || grafted) && (
                            <path
                              className="av-notch"
                              d={`M ${point.x - rodAxis.px * 15 - rodAxis.ux * 8} ${point.y - rodAxis.py * 15 - rodAxis.uy * 8}
                                  L ${point.x - rodAxis.px * 5} ${point.y - rodAxis.py * 5}
                                  L ${point.x - rodAxis.px * 15 + rodAxis.ux * 8} ${point.y - rodAxis.py * 15 + rodAxis.uy * 8}`}
                            />
                          )}
                        </g>
                      )
                    })}

                    <g
                      className="av-rod-collar"
                      role="button"
                      tabIndex={editable ? 0 : -1}
                      aria-label={`Slide ${rod.label} along the beam. Large drag handle.`}
                      transform={`translate(${collar.x} ${collar.y})`}
                      onPointerDown={(event) => {
                        const point = worldPointFromClient(event.clientX, event.clientY)
                        if (!point) return
                        setSelectedRodId(rod.id)
                        beginDrag(event, {
                          kind: 'rod',
                          rodId: rod.id,
                          grabOffset: point.x - rod.x,
                          clientX0: event.clientX,
                          clientY0: event.clientY,
                          moved: false
                        })
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          setSelectedRodId(rod.id)
                        }
                      }}
                    >
                      <rect x="-30" y="-24" width="60" height="52" rx="10" />
                      <text y="6">{rod.mark}</text>
                      {rod.counts > 0 && <circle className="av-collar-count" cx="22" cy="-16" r="7" />}
                    </g>

                    <g className="av-rod-name" transform={`translate(${head.x} ${head.y - 12})`}>
                      <text>{rod.short}</text>
                    </g>

                    <g
                      className="av-bead"
                      transform={`translate(${bead.x} ${bead.y})`}
                      role="button"
                      tabIndex={editable ? 0 : -1}
                      aria-label={`${rod.label} bead on station ${rod.bead}. Drag along the rod, or press then use up and down arrows.`}
                      onPointerDown={(event) => {
                        setSelectedRodId(rod.id)
                        beginDrag(event, {
                          kind: 'bead',
                          rodId: rod.id,
                          clientX0: event.clientX,
                          clientY0: event.clientY,
                          moved: false
                        })
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          setSelectedRodId(rod.id)
                        }
                      }}
                    >
                      <circle className="av-bead-hit" r="34" />
                      <circle className="av-bead-body" r="21" />
                      <circle className="av-bead-bore" r="7" />
                      <text y="5">{rod.bead}</text>
                      {beat >= 0 && <text className="av-bead-beat" y="-28">{beat + 1}</text>}
                    </g>

                    <g
                      className={`av-eyelet ${tieFromId === rod.id ? 'is-armed' : ''}`}
                      transform={`translate(${eyelet.x} ${eyelet.y})`}
                      role="button"
                      tabIndex={editable ? 0 : -1}
                      aria-label={`Tie a cord out of ${rod.label}. Drag onto another rod, or press then choose a rod.`}
                      onPointerDown={(event) => {
                        const point = svgPointFromClient(event.clientX, event.clientY)
                        beginDrag(event, {
                          kind: 'cord',
                          fromId: rod.id,
                          x: point?.x ?? eyelet.x,
                          y: point?.y ?? eyelet.y,
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
                          setTieFromId(previous => (previous === rod.id ? null : rod.id))
                        }
                      }}
                    >
                      <circle className="av-eyelet-hit" r="27" />
                      <circle className="av-eyelet-ring" r="12" />
                      <circle className="av-eyelet-core" r="4" />
                    </g>

                    <g
                      className={`av-socket ${organ ? 'is-filled' : ''}`}
                      transform={`translate(${foot.x} ${foot.y + 30})`}
                      role="button"
                      tabIndex={editable ? 0 : -1}
                      aria-label={`${rod.label} foot socket. ${organ ? `Holds the ${organ.label}; drag to move it.` : 'Hollow.'}`}
                      onPointerDown={(event) => {
                        if (!organ) return
                        setSelectedRodId(rod.id)
                        beginDrag(event, {
                          kind: 'organ',
                          organId: organ.id,
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
                          activateRod(rod.id)
                        }
                      }}
                    >
                      <rect x="-34" y="-21" width="68" height="42" rx="12" />
                      <text y="7">{organ?.mark || '＋'}</text>
                    </g>

                    {rod.scars > 0 && (
                      <path
                        className="av-rod-scar"
                        d={`M ${bead.x - rodAxis.px * 26} ${bead.y - rodAxis.py * 26}
                            l ${rodAxis.px * 18 + rodAxis.ux * 16} ${rodAxis.py * 18 + rodAxis.uy * 16}
                            l ${-rodAxis.px * 14 + rodAxis.ux * 14} ${-rodAxis.py * 14 + rodAxis.uy * 14}`}
                      />
                    )}
                  </g>
                )
              })}
            </g>

            {reckon && chainPath && (
              <g className={`av-count-mote ${reckon.ready ? 'is-true' : 'is-false'}`} filter="url(#av-halo)">
                <path d={chainPath} />
                {!reducedMotion && (
                  <g>
                    <circle r="12" />
                    <path d="M -13 0 L 0 -8 L 13 0 L 0 8 Z" />
                    <animateMotion dur="1.36s" fill="freeze" path={chainPath} />
                  </g>
                )}
              </g>
            )}

            {world.status === 'mastered' && !reducedMotion && chainPath && (
              <g className="av-standing-mote" filter="url(#av-halo)">
                <circle r="9" />
                <animateMotion
                  dur={`${autonomousDuration}s`}
                  repeatCount="indefinite"
                  keyPoints={world.order === 'vigil' ? '0;1;0' : '0;1'}
                  keyTimes={world.order === 'vigil' ? '0;0.5;1' : '0;1'}
                  calcMode="linear"
                  path={chainPath}
                />
              </g>
            )}
          </svg>

          <ol className="av-chronicle" aria-label="frame memory">
            {world.log.slice(-3).reverse().map((entry, index) => (
              <li key={entry.id} style={{ opacity: 1 - index * 0.26 }}>
                <span>{String(entry.stage).padStart(2, '0')}</span>{entry.text}
              </li>
            ))}
          </ol>

          {!world.unlocked && (
            <div className="av-seal">
              <div className="av-seal-frame" aria-hidden="true">
                <i /><i /><i /><span>248</span>
              </div>
              <p>UNASKED FRAME / LIVING INTERFACE GENERATION 248</p>
              <h2>A bead is a number<br />and a place to tie a rope.</h2>
              <button type="button" onClick={wake} data-playground-primary>
                put a hand on the beam
              </button>
              <small>slide beads • tie cords • seat bones • carve notches that grip</small>
            </div>
          )}

          {world.status === 'mastered' && !mutation && (
            <div className="av-outcome av-outcome-standing">
              <span>
                mastery / three commissions / {Object.values(world.rods).reduce((sum, rod) => sum + rod.notches.length, 0)} notches cut
              </span>
              <h2>THE FRAME KEEPS COUNTING WITHOUT A HAND</h2>
              <p>{ORDERS[world.order]?.note}. Bead positions became both quantity and geometry; the notches your totals carved now hold the beads in place and lend their cords the reach that made this arithmetic possible.</p>
              <div>
                <button type="button" onClick={rewind}>lift the final total</button>
                <button type="button" onClick={reset}>strip the beam</button>
              </div>
            </div>
          )}

          {world.status === 'ruined' && (
            <div className="av-outcome av-outcome-shaken">
              <span>failure / four miscounts shook the beads loose</span>
              <h2>EVERY UNGRIPPED BEAD HAS DRIFTED</h2>
              <p>Lift the last reckoning. Close the strained cord, fill a hollow foot, or carve a notch that will hold a bead still before you ask the beam for another number.</p>
              <div>
                <button type="button" onClick={rewind}>lift last miscount</button>
                <button type="button" onClick={reset}>replace the bone</button>
              </div>
            </div>
          )}
        </section>

        <section className="av-bench" aria-label="reckoning bench">
          <div className={`av-inspector is-${guidance.kind}`} aria-live="polite">
            <span>first consequence</span>
            <h2>{guidance.title}</h2>
            <p>{guidance.detail}</p>
            {guidance.kind !== 'ready' && (
              <button
                type="button"
                onClick={applyGuidance}
                disabled={!editable || guidance.kind === 'search' || guidance.kind === 'wait'}
                data-playground-action="follow-frame-consequence"
              >
                {guidance.action}
              </button>
            )}
          </div>

          <div className="av-rack">
            <div className="av-bench-heading">
              <span>loose bones</span>
              <strong>{armedOrganId ? `${ORGANS[armedOrganId].mark} armed` : 'drag / tap'}</strong>
            </div>
            <div className="av-rack-list">
              {unlockedOrgans.map((organ) => {
                const seatedOn = Object.entries(world.seated).find(([, organId]) => organId === organ.id)?.[0]
                return (
                  <button
                    type="button"
                    key={organ.id}
                    className={`${armedOrganId === organ.id ? 'is-armed' : ''} ${seatedOn ? 'is-seated' : ''}`}
                    style={{ '--bone-color': organ.color }}
                    disabled={!editable}
                    aria-pressed={armedOrganId === organ.id}
                    data-playground-action="arm-counting-bone"
                    onPointerDown={(event) => beginDrag(event, {
                      kind: 'organ',
                      organId: organ.id,
                      clientX: event.clientX,
                      clientY: event.clientY,
                      clientX0: event.clientX,
                      clientY0: event.clientY,
                      moved: false,
                      targetId: null
                    })}
                    onClick={() => {
                      if (suppressClickRef.current || !editable) return
                      setArmedOrganId(previous => (previous === organ.id ? null : organ.id))
                    }}
                  >
                    <i>{organ.mark}</i>
                    <span><strong>{organ.label}</strong><small>{seatedOn ? `in ${rodById(seatedOn).short}` : organ.verb}</small></span>
                  </button>
                )
              })}
              {world.chiselFree && (
                <button
                  type="button"
                  className={`av-chisel ${armedGraft ? 'is-armed' : ''}`}
                  disabled={!editable}
                  aria-pressed={armedGraft}
                  data-playground-action="graft-notch"
                  onPointerDown={(event) => beginDrag(event, {
                    kind: 'graft',
                    clientX: event.clientX,
                    clientY: event.clientY,
                    clientX0: event.clientX,
                    clientY0: event.clientY,
                    moved: false,
                    targetId: null
                  })}
                  onClick={() => {
                    if (suppressClickRef.current || !editable) return
                    setArmedGraft(previous => !previous)
                  }}
                >
                  <i>⌁</i>
                  <span>
                    <strong>bone chisel</strong>
                    <small>{world.graft ? `notch borrowed by ${rodById(world.graft.rodId).short}` : 'cut a notch a rod never earned'}</small>
                  </span>
                </button>
              )}
            </div>

            {world.stage >= 2 && world.status !== 'ruined' && (
              <div className="av-orders">
                <div className="av-bench-heading">
                  <span>standing order</span>
                  <strong>{world.order ? ORDERS[world.order].mark : 'choose one'}</strong>
                </div>
                <div>
                  {Object.values(ORDERS).map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      className={world.order === option.id ? 'is-chosen' : ''}
                      style={{ '--order-color': option.color }}
                      onClick={() => chooseOrder(option.id)}
                      aria-pressed={world.order === option.id}
                      data-playground-action="set-standing-order"
                      disabled={!editable}
                    >
                      <i>{option.mark}</i><span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="av-calipers">
            <div className="av-bench-heading">
              <span>selected rod / {selectedRod.mark}</span>
              <strong style={{ color: selectedRod.color }}>{selectedRod.short}</strong>
            </div>
            <p className="av-rod-note">{selectedRod.note}</p>

            <div className="av-readout">
              <b>{selectedRod.bead}</b>
              <div>
                <strong>{selectedOrgan ? selectedOrgan.label : 'hollow foot'}</strong>
                <small>
                  {selectedOrgan
                    ? `${selectedOrgan.mark} ${selectedOrgan.verb}`
                    : 'the count passes through unchanged'}
                </small>
              </div>
              <button type="button" onClick={() => liftOrgan(selectedRod.id)} disabled={!selectedOrgan || !editable}>lift</button>
            </div>

            <div className="av-caliper-row">
              <button type="button" onClick={() => setBead(selectedRod.id, selectedRod.bead - 1)} disabled={!editable} aria-label="Raise the bead one station">↑<small>bead</small></button>
              <button type="button" onClick={() => setBead(selectedRod.id, selectedRod.bead + 1)} disabled={!editable} aria-label="Lower the bead one station">↓<small>bead</small></button>
              <button type="button" onClick={() => slideRod(selectedRod.id, selectedRod.x - 22)} disabled={!editable} aria-label="Slide the rod along the beam, left">←<small>slide</small></button>
              <button type="button" onClick={() => slideRod(selectedRod.id, selectedRod.x + 22)} disabled={!editable} aria-label="Slide the rod along the beam, right">→<small>slide</small></button>
            </div>

            <div className="av-caliper-row">
              <button
                type="button"
                className={tieFromId === selectedRod.id ? 'is-armed' : ''}
                onClick={() => setTieFromId(previous => (previous === selectedRod.id ? null : selectedRod.id))}
                disabled={!editable}
                data-playground-action="tie-cord"
              >
                ↝<small>{tieFromId === selectedRod.id ? 'pick a rod' : 'tie out'}</small>
              </button>
              <button
                type="button"
                onClick={() => selectedOutgoing && cutCord(selectedOutgoing.id)}
                disabled={!selectedOutgoing || !editable}
              >
                ✕<small>cut cord</small>
              </button>
              <button
                type="button"
                onClick={() => {
                  const index = frame.rods.findIndex(rod => rod.id === selectedRod.id)
                  setSelectedRodId(frame.rods[(index + 1) % frame.rods.length].id)
                }}
              >
                ⇥<small>next rod</small>
              </button>
              <button
                type="button"
                onClick={() => placeGraft(selectedRod.id)}
                disabled={!world.chiselFree || !editable}
              >
                ⌁<small>graft</small>
              </button>
            </div>

            <div className="av-rod-stats">
              <span>notches {selectedRod.notches.length ? selectedRod.notches.join(' ') : '—'}</span>
              <span>totals {selectedRod.counts}</span>
              <span>scars {selectedRod.scars}</span>
            </div>
          </div>

          <div className="av-lever">
            <div className="av-lever-head">
              <span>{phase}</span>
              <strong>{frame.ready ? 'the ledger is satisfied' : guidance.title}</strong>
            </div>
            <button
              type="button"
              className={frame.ready ? 'is-ready' : ''}
              onClick={sendReckon}
              disabled={!world.unlocked || world.status !== 'reckoning' || Boolean(reckon || mutation)}
              data-playground-action="send-reckoning"
            >
              <span>
                {reckon ? 'the count is in the rope' : mutation ? 'notches are being carved' : frame.ready ? `${commission.seed} settles at ${commission.demand}` : `risk: arrives at ${frame.value}`}
              </span>
              <strong>{reckon ? 'COUNTING…' : mutation ? 'CARVING…' : 'RECKON'}</strong>
              <small>SPACE</small>
            </button>
            <div className="av-lever-tools">
              <button type="button" onClick={rewind} disabled={world.history.length === 0}>lift reckoning</button>
              <button type="button" onClick={reset}>strip the beam</button>
            </div>
            <p className="av-keys">
              drag beads along rods • drag eyelets to tie cords • drag collars to slide • keys: ↑↓ bead, ←→ slide, T tie, O bone, G graft, ⌫ cut, Space reckon
            </p>
          </div>
        </section>

        {(drag?.kind === 'organ' || drag?.kind === 'graft') && drag.moved && (
          <div
            className={`av-drag-chip ${drag.targetId ? 'is-targeting' : ''}`}
            style={{
              left: drag.clientX,
              top: drag.clientY,
              '--bone-color': drag.kind === 'graft' ? '#e8e2d2' : ORGANS[drag.organId].color
            }}
            aria-hidden="true"
          >
            <i>{drag.kind === 'graft' ? '⌁' : ORGANS[drag.organId].mark}</i>
            <span>
              {drag.targetId
                ? `${drag.kind === 'graft' ? 'notch' : 'seat in'} ${rodById(drag.targetId).short}`
                : drag.kind === 'graft' ? 'carry the chisel' : 'carry the bone'}
            </span>
          </div>
        )}
      </main>
    </div>
  )
}

export { freshWorld, deriveFrame, inspectFrame }
export default AbacusViscera
