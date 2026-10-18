import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ExperimentNav from '../../ExperimentNav'
import './SluiceMagistrate.css'

const STORAGE_KEY = 'clawed:sluice-magistrate:v1'

/* ------------------------------------------------------------------ geometry */

const BOARD = { w: 760, h: 920 }
const COLS = 6
const ROWS = 6
const CELL = 86
const GX = 122
const GY = 112
const LATTICE_W = COLS * CELL
const LATTICE_H = ROWS * CELL
const LATTICE_BOTTOM = GY + LATTICE_H
const WEIR_Y = 640
const WEIR_H = 60
const BAY_Y = 706
const BAY_H = 158
const BAY_W = LATTICE_W / 3
const CISTERN_H = 104

const cellKey = (col, row) => `${col}:${row}`
const cellCentre = (col, row) => ({ x: GX + col * CELL + CELL / 2, y: GY + row * CELL + CELL / 2 })
const bayX = (index) => GX + index * BAY_W
const paddleX = (index) => GX + index * BAY_W

/* ------------------------------------------------------------------ material */

const TEMPERS = [
  { id: 'ember', mark: '◆', label: 'ember', color: '#e8893f', lean: -1, tone: 196 },
  { id: 'brine', mark: '≈', label: 'brine', color: '#4f9fc4', lean: 0, tone: 261.63 },
  { id: 'loam', mark: '▲', label: 'loam', color: '#8aa84f', lean: 1, tone: 329.63 }
]

const temperById = (id) => TEMPERS.find(temper => temper.id === id) || TEMPERS[0]

const FITTINGS = {
  pin: {
    id: 'pin', label: 'deflector pin', short: 'pin', mark: '◢', color: '#c9a04a', unlockedAt: 0,
    note: 'throws a mote one way, always',
    reading: 'a dumb certainty — every mote that touches it leaves in the same direction. Press a seated pin to flip it.'
  },
  chute: {
    id: 'chute', label: 'guide chute', short: 'chute', mark: '║', color: '#7e8a96', unlockedAt: 0,
    note: 'straightens and drops faster',
    reading: 'kills sideways drift and adds fall speed. The only way to hold a column against a paddle kick.'
  },
  scale: {
    id: 'scale', label: 'balance scale', short: 'scale', mark: '⧗', color: '#d4cfa6', unlockedAt: 0,
    note: 'light goes left, heavy goes right',
    reading: 'sorts by weight against its own threshold. Press a seated scale to raise the threshold.'
  },
  prism: {
    id: 'prism', label: 'temper prism', short: 'prism', mark: '◈', color: '#b07fc0', unlockedAt: 1,
    note: 'sorts by temper, not weight',
    reading: 'ember goes left, brine falls straight, loam goes right. The only fitting that can read what a mote is made of.'
  },
  sump: {
    id: 'sump', label: 'holding sump', short: 'sump', mark: '⌣', color: '#5f9e90', unlockedAt: 1,
    note: 'catches a mote, then lets it go',
    reading: 'buys time. Two motes cannot share a bay mouth, so a sump is how a crowded lattice stops colliding with itself.'
  },
  kiln: {
    id: 'kiln', label: 'temper kiln', short: 'kiln', mark: '✦', color: '#e05c4a', unlockedAt: 1,
    note: 'turns a mote into the next temper',
    reading: 'the only way to make a mote some bay will actually accept. Ember becomes brine, brine becomes loam, loam becomes ember.'
  },
  shear: {
    id: 'shear', label: 'splitting shear', short: 'shear', mark: '⋔', color: '#dd7f9c', unlockedAt: 2,
    note: 'halves a heavy mote into two',
    reading: 'doubles your traffic and halves your weights. A 5 nobody wants becomes a 3 and a 2 somebody might.'
  }
}

const fittingList = () => Object.values(FITTINGS)

const DECREES = {
  thrift: {
    id: 'thrift', label: 'hold the head low', mark: '⌂', color: '#c9a04a', head: 2,
    note: 'the house runs slow and spills almost nothing, and it will never open the gate further than it can sort'
  },
  appetite: {
    id: 'appetite', label: 'open the gate wide', mark: '↗', color: '#e05c4a', head: 4,
    note: 'the house takes every mote the cistern will give it and accepts the leaks that come with the volume'
  },
  vigil: {
    id: 'vigil', label: 'dredge its own silt', mark: '§', color: '#5f9e90', head: 3,
    note: 'the house spends its hands clearing the lattice instead of catching what falls through it'
  }
}

/* ------------------------------------------------------------------ the writs */

const HEAD_CADENCE = [2100, 1480, 1060, 780, 585]
const HAND_MAX = 6
const HAND_REFILL_MS = 2100
const TONGS_COST = 2
const PADDLE_COST = 1
const DREDGE_COST = 2
const MAX_LEAKS = 6
const FUSE_AT = 3
const MOTE_CAP = 44
const PARTICLE_CAP = 240
const SILT_CAP = 8
const GRAVITY = 560
const TERMINAL = 440

const WRITS = [
  {
    id: 'first',
    label: 'writ I / the first tithe',
    title: 'Split one temper by its weight.',
    instruction:
      'While the gate is shut the sluice runs trial water — hollow motes that route through your lattice and land where a real tithe would, counting for nothing. Only ember comes today, at weights one to three: the left bay takes 1–2, the right takes 3 and up. Seat a balance scale until the trial water lands right, then open the gate and defend it.',
    tempers: 1,
    weightMax: 3,
    bays: 2,
    minHead: 1,
    silt: false,
    rewrite: false,
    leakCap: 1,
    writs: [{ temper: 'ember', min: 1, max: 2 }, { temper: 'ember', min: 3, max: 5 }, null],
    demands: [
      { code: 'tithe', text: 'eight tithes banked', read: (s) => `${Math.min(8, s.tithes)}/8`, test: (s) => s.tithes >= 8 },
      { code: 'head', text: 'the gate at least one notch open', read: (s) => `${s.head}/1`, test: (s) => s.head >= 1 },
      { code: 'dry', text: 'no more than one leak', read: (s) => `${s.leaks}/1`, test: (s) => s.leaks <= 1 }
    ],
    success: 'the first eight tithes went into the bays clean // every cell the motes crossed kept a stamp'
  },
  {
    id: 'second',
    label: 'writ II / two tempers',
    title: 'Sort what the motes are made of, not only how much they weigh.',
    instruction:
      'Brine arrives with the ember and the third bay is unboarded. A prism reads temper; a kiln changes it. Silt now settles in cells you never use — press a silted cell to dredge it, at the cost of two hands.',
    tempers: 2,
    weightMax: 4,
    bays: 3,
    minHead: 2,
    silt: true,
    rewrite: false,
    leakCap: 3,
    writs: [{ temper: 'ember', min: 1, max: 5 }, { temper: 'brine', min: 1, max: 2 }, { temper: 'brine', min: 3, max: 5 }],
    demands: [
      { code: 'tithe', text: 'eighteen tithes banked', read: (s) => `${Math.min(18, s.tithes)}/18`, test: (s) => s.tithes >= 18 },
      { code: 'both', text: 'both tempers banked somewhere', read: (s) => `${s.temperKinds}/2`, test: (s) => s.temperKinds >= 2 },
      { code: 'fuse', text: 'one cell worn until it fuses', read: (s) => `${Math.min(1, s.fused)}/1`, test: (s) => s.fused >= 1 },
      { code: 'head', text: 'the gate two notches open', read: (s) => `${s.head}/2`, test: (s) => s.head >= 2 },
      { code: 'dry', text: 'no more than three leaks', read: (s) => `${s.leaks}/3`, test: (s) => s.leaks <= 3 }
    ],
    success: 'two tempers found two different floors // a worn cell fused and silt can no longer take it'
  },
  {
    id: 'third',
    label: 'writ III / the standing house',
    title: 'Keep the floor dry while the magistrate changes its mind.',
    instruction:
      'Loam arrives, weights run to five, and the gate must stand three notches open. From here the magistrate rewrites one bay’s writ every twenty seconds — a lattice that was right becomes wrong with motes already in the air. Hold twenty-two unbroken seconds without a leak, then say what the house should favour alone.',
    tempers: 3,
    weightMax: 5,
    bays: 3,
    minHead: 3,
    silt: true,
    rewrite: true,
    leakCap: MAX_LEAKS,
    writs: [{ temper: 'ember', min: 1, max: 5 }, { temper: 'brine', min: 1, max: 5 }, { temper: 'loam', min: 1, max: 5 }],
    demands: [
      { code: 'tithe', text: 'thirty tithes banked', read: (s) => `${Math.min(30, s.tithes)}/30`, test: (s) => s.tithes >= 30 },
      { code: 'head', text: 'the gate three notches open', read: (s) => `${s.head}/3`, test: (s) => s.head >= 3 },
      { code: 'dry', text: 'twenty-two seconds without a leak', read: (s) => `${Math.floor(s.cleanFor)}/22s`, test: (s) => s.cleanFor >= 22 },
      { code: 'decree', text: 'a standing decree chosen', read: (s) => (s.decree ? 'set' : 'none'), test: (s) => Boolean(s.decree) }
    ],
    order: true,
    success: 'the floor stayed dry through three rewrites // the house can keep its own writs now'
  }
]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const round1 = (value) => Math.round(value * 10) / 10

/* ------------------------------------------------------------------ the world */

const freshCells = () => {
  const cells = {}
  for (let col = 0; col < COLS; col += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      cells[cellKey(col, row)] = { fitting: null, dir: 1, thr: 2, stamps: 0, fused: false, silt: false }
    }
  }
  return cells
}

const freshWorld = () => ({
  version: 1,
  rev: 0,
  unlocked: false,
  writ: 0,
  status: 'sorting',
  cells: freshCells(),
  paddles: [-1, 1, -1],
  bays: WRITS[0].writs.map(writ => (writ ? { ...writ, fill: 0 } : null)),
  head: 0,
  decree: null,
  tithes: 0,
  leaks: 0,
  banked: { ember: 0, brine: 0, loam: 0 },
  lifetime: { tithes: 0, leaks: 0, motes: 0, fused: 0, rewrites: 0 },
  log: [{ id: 'sealed', writ: 0, text: 'the cistern drips into a dry bay and nothing in the lattice yet has an opinion about where it lands' }],
  lastSaved: null
})

const snapshotWorld = (world) => ({
  cells: Object.fromEntries(Object.entries(world.cells).map(([key, cell]) => [key, { ...cell }])),
  paddles: [...world.paddles],
  bays: world.bays.map(bay => (bay ? { ...bay } : null)),
  head: world.head,
  writ: world.writ,
  status: world.status,
  tithes: world.tithes,
  leaks: world.leaks,
  decree: world.decree,
  banked: { ...world.banked },
  log: world.log.map(entry => ({ ...entry }))
})

const loadWorld = () => {
  const fresh = freshWorld()
  if (typeof window === 'undefined') return fresh
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (!saved || saved.version !== 1) return fresh
    const cells = freshCells()
    Object.entries(saved.cells || {}).forEach(([key, cell]) => {
      if (!cells[key] || !cell) return
      cells[key] = {
        fitting: FITTINGS[cell.fitting] ? cell.fitting : null,
        dir: cell.dir === -1 ? -1 : 1,
        thr: clamp(Math.round(Number(cell.thr) || 2), 1, 5),
        stamps: clamp(Math.round(Number(cell.stamps) || 0), 0, 99),
        fused: Boolean(cell.fused),
        silt: Boolean(cell.silt)
      }
    })
    const writ = clamp(Math.round(Number(saved.writ) || 0), 0, WRITS.length - 1)
    return {
      ...fresh,
      ...saved,
      rev: 0,
      cells,
      writ,
      status: ['sorting', 'standing', 'flooded'].includes(saved.status) ? saved.status : 'sorting',
      paddles: Array.isArray(saved.paddles) && saved.paddles.length === 3
        ? saved.paddles.map(lean => (lean === -1 ? -1 : 1))
        : fresh.paddles,
      bays: Array.isArray(saved.bays) && saved.bays.length === 3
        ? saved.bays.map((bay, index) => {
            if (index >= WRITS[writ].bays) return null
            if (!bay || !temperById(bay.temper)) return { ...WRITS[writ].writs[index], fill: 0 }
            return {
              temper: TEMPERS.some(temper => temper.id === bay.temper) ? bay.temper : 'ember',
              min: clamp(Math.round(Number(bay.min) || 1), 1, 5),
              max: clamp(Math.round(Number(bay.max) || 5), 1, 5),
              fill: clamp(Number(bay.fill) || 0, 0, 60)
            }
          })
        : WRITS[writ].writs.map(entry => (entry ? { ...entry, fill: 0 } : null)),
      head: clamp(Math.round(Number(saved.head ?? fresh.head) || 0), 0, HEAD_CADENCE.length - 1),
      decree: DECREES[saved.decree] ? saved.decree : null,
      banked: { ...fresh.banked, ...(saved.banked || {}) },
      lifetime: { ...fresh.lifetime, ...(saved.lifetime || {}) },
      log: Array.isArray(saved.log) && saved.log.length ? saved.log.slice(-6) : fresh.log
    }
  } catch {
    return fresh
  }
}

const formatAge = (timestamp) => {
  if (!timestamp) return 'undug'
  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s standing`
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes}m standing` : `${Math.round(minutes / 60)}h standing`
}

const accepts = (bay, mote) => Boolean(bay)
  && bay.temper === mote.temper
  && mote.weight >= bay.min
  && mote.weight <= bay.max

const describeWrit = (bay) => {
  if (!bay) return 'boarded over'
  const temper = temperById(bay.temper)
  return bay.min === bay.max
    ? `${temper.mark} at exactly ${bay.min}`
    : `${temper.mark} from ${bay.min} to ${bay.max}`
}

/* ------------------------------------------------------------------ component */

const SluiceMagistrate = ({ category, experiment }) => {
  const [world, setWorld] = useState(loadWorld)
  const [hud, setHud] = useState({
    hand: HAND_MAX, motes: 0, cleanFor: 0, flow: 0, orphans: 0, paddleHeat: [0, 0, 0]
  })
  const [armedFittingId, setArmedFittingId] = useState(null)
  const [pry, setPry] = useState(false)
  const [drag, setDrag] = useState(null)
  const [writDrag, setWritDrag] = useState(null)
  const [celebration, setCelebration] = useState(null)
  const [savedAt, setSavedAt] = useState(() => world.lastSaved)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const [history, setHistory] = useState([])
  const [message, setMessage] = useState(() => (world.unlocked
    ? `writ ${Math.min(world.writ + 1, WRITS.length)} resumed // ${world.lifetime.tithes} tithes in the house ledger`
    : 'a dry sluice house, a cistern that drips, and three bays that have never refused anything'))

  const surfaceRef = useRef(null)
  const svgRef = useRef(null)
  const frameRef = useRef(null)
  const canvasRef = useRef(null)
  const worldRef = useRef(world)
  const dragRef = useRef(null)
  const dirtyRef = useRef(false)
  const motesRef = useRef([])
  const partsRef = useRef([])
  const simRef = useRef({
    hand: HAND_MAX, handClock: 0, spawnClock: 0, siltClock: 0, rewriteClock: 0,
    cleanFor: 0, flowClock: 0, flow: 0, uid: 0, paddleHeat: [0, 0, 0], shake: 0,
    temperKinds: new Set(), orphans: 0
  })
  const paintRef = useRef({ scale: 1, dpr: 1, width: 1, height: 1 })
  const pointerRef = useRef({ x: 0, y: 0, px: 0, py: 0, moteId: null })
  const audioRef = useRef(null)
  const soundRef = useRef(false)
  const reducedRef = useRef(false)
  const saveTimerRef = useRef(null)
  const celebrationTimerRef = useRef(null)
  const suppressClickRef = useRef(false)

  useEffect(() => { worldRef.current = world }, [world])
  useEffect(() => { soundRef.current = soundOn }, [soundOn])
  useEffect(() => { reducedRef.current = reducedMotion }, [reducedMotion])

  const writ = WRITS[Math.min(world.writ, WRITS.length - 1)]
  const standing = world.status === 'standing'
  const flooded = world.status === 'flooded'
  const live = world.unlocked && !flooded
  const editable = world.unlocked && !flooded

  /* ---------------------------------------------------------- media + storage */

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const width = window.matchMedia('(max-width: 900px)')
    const syncMotion = () => setReducedMotion(motion.matches)
    const syncWidth = () => setNarrow(width.matches)
    syncMotion()
    syncWidth()
    motion.addEventListener?.('change', syncMotion)
    width.addEventListener?.('change', syncWidth)
    return () => {
      motion.removeEventListener?.('change', syncMotion)
      width.removeEventListener?.('change', syncWidth)
    }
  }, [])

  useEffect(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      try {
        const timestamp = Date.now()
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...worldRef.current, rev: 0, lastSaved: timestamp }))
        setSavedAt(timestamp)
      } catch {
        // The house keeps sorting when local memory refuses to keep its ledger.
      }
    }, 420)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [world])

  useEffect(() => () => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    if (celebrationTimerRef.current) window.clearTimeout(celebrationTimerRef.current)
    audioRef.current?.close?.()
    audioRef.current = null
  }, [])

  /* ------------------------------------------------------------------- sound */

  const tone = useCallback((frequency, kind = 'sine', length = 0.18, level = 0.045, bend = 1) => {
    if (!soundRef.current) return
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const context = audioRef.current || new AudioContext()
      audioRef.current = context
      context.resume?.()
      const start = context.currentTime + 0.008
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = kind
      oscillator.frequency.setValueAtTime(frequency, start)
      if (bend !== 1) oscillator.frequency.exponentialRampToValueAtTime(Math.max(24, frequency * bend), start + length)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(level, start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + length + 0.02)
    } catch {
      // Sound is a voluntary echo of a house that is already legible.
    }
  }, [])

  /* ------------------------------------------------------- world write helper */

  const commit = useCallback((mutator) => {
    const next = mutator(worldRef.current)
    if (!next) return
    next.rev = (worldRef.current.rev || 0) + 1
    worldRef.current = next
    setWorld(next)
  }, [])

  const remember = useCallback(() => {
    setHistory(entries => [...entries, snapshotWorld(worldRef.current)].slice(-10))
  }, [])

  const pushLog = useCallback((text) => {
    const current = worldRef.current
    current.log = [...current.log, { id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, writ: current.writ, text }].slice(-6)
    dirtyRef.current = true
  }, [])

  /* ----------------------------------------------------------------- particles */

  const spit = useCallback((x, y, count, color, spread = 150, kind = 'spark') => {
    if (reducedRef.current) return
    const parts = partsRef.current
    for (let index = 0; index < count; index += 1) {
      if (parts.length >= PARTICLE_CAP) break
      const angle = Math.random() * Math.PI * 2
      const speed = spread * (0.25 + Math.random() * 0.9)
      parts.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (kind === 'splash' ? 120 : 0),
        life: 0,
        max: 0.32 + Math.random() * 0.5,
        size: kind === 'splash' ? 1.6 + Math.random() * 2.4 : 1.2 + Math.random() * 2,
        color,
        kind
      })
    }
  }, [])

  /* ------------------------------------------------------------------- spawn */

  const spawnMote = useCallback(() => {
    const current = worldRef.current
    const motes = motesRef.current
    if (motes.length >= MOTE_CAP) return
    const stage = WRITS[Math.min(current.writ, WRITS.length - 1)]
    const kinds = current.status === 'standing' ? TEMPERS.length : stage.tempers
    const temper = TEMPERS[Math.floor(Math.random() * kinds)]
    const maxWeight = current.status === 'standing' ? 5 : stage.weightMax
    const weight = 1 + Math.floor(Math.random() * maxWeight)
    const sim = simRef.current
    sim.uid += 1
    // The gate only opens over floor that has a bay under it: boarded thirds are
    // never rained on, so a bare lattice is a coin toss, not a rigged loss.
    const openBays = Math.max(1, current.bays.filter(Boolean).length)
    const column = Math.floor(Math.random() * Math.min(COLS, openBays * 2))
    motes.push({
      id: sim.uid,
      x: GX + column * CELL + CELL / 2 + (Math.random() - 0.5) * 22,
      y: CISTERN_H - 10,
      vx: (Math.random() - 0.5) * 36,
      vy: 70,
      temper: temper.id,
      weight,
      r: 7 + weight * 2.4,
      // Water released under a shut gate is trial water for its whole fall: it
      // shows you what the lattice does without the floor counting it.
      trial: !current.unlocked || current.head === 0,
      applied: null,
      held: null,
      holdUntil: 0,
      trail: [],
      age: 0
    })
    current.lifetime.motes += 1
    dirtyRef.current = true
    spit(GX + column * CELL + CELL / 2, CISTERN_H - 6, 3, temper.color, 60)
  }, [spit])

  /* --------------------------------------------------------- the magistrate */

  const rewriteBay = useCallback(() => {
    const current = worldRef.current
    const open = current.bays.map((bay, index) => (bay ? index : -1)).filter(index => index >= 0)
    if (open.length < 2) return
    const target = open[Math.floor(Math.random() * open.length)]
    const others = open.filter(index => index !== target).map(index => current.bays[index].temper)
    const choices = TEMPERS.filter(temper => !others.includes(temper.id) || others.length < 2)
    const temper = choices[Math.floor(Math.random() * choices.length)] || TEMPERS[0]
    const min = 1 + Math.floor(Math.random() * 3)
    const max = clamp(min + 1 + Math.floor(Math.random() * 3), min, 5)
    current.bays = current.bays.map((bay, index) => (index === target
      ? { ...bay, temper: temper.id, min, max }
      : bay))
    current.lifetime.rewrites += 1
    pushLog(`the magistrate rewrote the ${['left', 'middle', 'right'][target]} bay // it now takes ${temper.mark} from ${min} to ${max}`)
    dirtyRef.current = true
    setMessage(`the ${['left', 'middle', 'right'][target]} bay was rewritten mid-fall // it now accepts ${temper.mark} ${min}–${max}`)
    tone(118, 'sawtooth', 0.46, 0.055, 0.6)
    simRef.current.shake = Math.max(simRef.current.shake, 7)
  }, [pushLog, tone])

  /* ----------------------------------------------------------- cell mechanics */

  const stampCell = useCallback((key) => {
    const current = worldRef.current
    const cell = current.cells[key]
    if (!cell) return
    cell.stamps += 1
    if (!cell.fused && cell.stamps >= FUSE_AT) {
      cell.fused = true
      cell.silt = false
      current.lifetime.fused += 1
      pushLog(`the ${FITTINGS[cell.fitting]?.short || 'cell'} at ${key.replace(':', '/')} fused // worn use made it silt-proof`)
      tone(523.25, 'triangle', 0.3, 0.05)
      const centre = cellCentre(Number(key.split(':')[0]), Number(key.split(':')[1]))
      spit(centre.x, centre.y, 16, '#f0e4c0', 180)
    }
    dirtyRef.current = true
  }, [pushLog, spit, tone])

  const applyFitting = useCallback((mote, key, now) => {
    const current = worldRef.current
    const cell = current.cells[key]
    if (!cell) return
    const [col, row] = key.split(':').map(Number)
    const centre = cellCentre(col, row)

    if (cell.silt) {
      mote.vx = -mote.vx * 0.72 + (Math.random() - 0.5) * 80
      mote.vy = Math.max(26, mote.vy * 0.4)
      mote.y = centre.y - CELL * 0.3
      spit(centre.x, centre.y, 5, '#5c5244', 90)
      tone(84 + Math.random() * 18, 'square', 0.1, 0.022)
      return
    }
    if (!cell.fitting) return

    const boost = cell.fused ? 1.32 : 1
    switch (cell.fitting) {
      case 'pin': {
        mote.vx = cell.dir * 178 * boost
        mote.vy *= cell.fused ? 0.82 : 0.73
        spit(centre.x, centre.y, 4, FITTINGS.pin.color, 110)
        tone(300 + mote.weight * 22, 'triangle', 0.07, 0.03)
        break
      }
      case 'chute': {
        mote.vx *= 0.12
        mote.vy = Math.min(TERMINAL, mote.vy * (cell.fused ? 1.16 : 1.08) + 30)
        mote.x = centre.x
        break
      }
      case 'scale': {
        const dir = mote.weight <= cell.thr ? -1 : 1
        mote.vx = dir * 186 * boost
        mote.vy *= cell.fused ? 0.86 : 0.79
        spit(centre.x, centre.y, 5, FITTINGS.scale.color, 120)
        tone(dir < 0 ? 392 : 233, 'sine', 0.09, 0.03)
        break
      }
      case 'prism': {
        const lean = temperById(mote.temper).lean
        mote.vx = lean * 192 * boost
        mote.vy *= cell.fused ? 0.88 : 0.8
        spit(centre.x, centre.y, 6, temperById(mote.temper).color, 130)
        tone(temperById(mote.temper).tone, 'sine', 0.1, 0.03)
        break
      }
      case 'sump': {
        mote.held = 'sump'
        mote.holdUntil = now + (cell.fused ? 330 : 620)
        mote.vx = 0
        mote.vy = 0
        mote.x = centre.x
        mote.y = centre.y
        spit(centre.x, centre.y, 4, FITTINGS.sump.color, 70)
        tone(174.61, 'sine', 0.14, 0.026)
        break
      }
      case 'kiln': {
        const index = TEMPERS.findIndex(temper => temper.id === mote.temper)
        mote.temper = TEMPERS[(index + 1) % TEMPERS.length].id
        mote.vy *= cell.fused ? 1 : 0.84
        spit(centre.x, centre.y, 14, temperById(mote.temper).color, 190)
        tone(temperById(mote.temper).tone * 1.5, 'triangle', 0.18, 0.038, 0.7)
        break
      }
      case 'shear': {
        if (mote.weight < 2 || motesRef.current.length >= MOTE_CAP) {
          mote.vy *= 0.92
          break
        }
        const left = Math.ceil(mote.weight / 2)
        const right = mote.weight - left
        mote.weight = left
        mote.r = 7 + left * 2.4
        mote.vx = -148
        mote.vy *= 0.7
        simRef.current.uid += 1
        motesRef.current.push({
          ...mote,
          id: simRef.current.uid,
          weight: Math.max(1, right),
          r: 7 + Math.max(1, right) * 2.4,
          vx: 148,
          trail: [],
          held: null,
          holdUntil: 0
        })
        spit(centre.x, centre.y, 12, FITTINGS.shear.color, 200)
        tone(466, 'square', 0.1, 0.03, 0.5)
        break
      }
      default:
        break
    }
    // Only water the house was actually judged on wears the stone. Trial runs
    // route and reveal, but they never earn a stamp or a fuse.
    if (!mote.trial) stampCell(key)
  }, [spit, stampCell, tone])

  /* ---------------------------------------------------------------- landings */

  const land = useCallback((mote) => {
    const current = worldRef.current
    const index = clamp(Math.floor((mote.x - GX) / BAY_W), 0, 2)
    const bay = current.bays[index]

    // Trial water is watched, not judged — but it still shows you the verdict.
    if (mote.trial) {
      spit(mote.x, BAY_Y + 20, 9, accepts(bay, mote) ? temperById(mote.temper).color : 'rgba(150, 170, 176, .7)', 140, 'splash')
      return
    }

    if (accepts(bay, mote)) {
      current.tithes += 1
      current.lifetime.tithes += 1
      current.banked[mote.temper] = round1((current.banked[mote.temper] || 0) + mote.weight)
      current.bays = current.bays.map((entry, slot) => (slot === index && entry
        ? { ...entry, fill: Math.min(60, entry.fill + mote.weight) }
        : entry))
      simRef.current.temperKinds.add(mote.temper)
      spit(mote.x, BAY_Y + 20, 14, temperById(mote.temper).color, 190, 'splash')
      tone(temperById(mote.temper).tone * 2, 'sine', 0.2, 0.042)
      dirtyRef.current = true
      return
    }

    current.leaks += 1
    current.lifetime.leaks += 1
    simRef.current.cleanFor = 0
    simRef.current.shake = Math.max(simRef.current.shake, 9)
    spit(mote.x, BAY_Y + 18, 18, '#ff6a52', 230, 'splash')
    tone(96, 'sawtooth', 0.34, 0.05, 0.5)
    pushLog(bay
      ? `${temperById(mote.temper).mark}${mote.weight} fell into a bay that takes ${describeWrit(bay)} // the floor is wet`
      : `${temperById(mote.temper).mark}${mote.weight} fell through boarding and out of the house`)
    if (current.leaks >= MAX_LEAKS && current.status === 'sorting') {
      current.status = 'flooded'
      setMessage('four leaks and the sluice floor is under water // the house can no longer tell a tithe from an accident')
    }
    dirtyRef.current = true
  }, [pushLog, spit, tone])

  const spill = useCallback((mote) => {
    const current = worldRef.current
    if (mote.trial) {
      spit(mote.x, mote.y, 7, 'rgba(150, 170, 176, .7)', 120, 'splash')
      return
    }
    current.leaks += 1
    current.lifetime.leaks += 1
    simRef.current.cleanFor = 0
    simRef.current.shake = Math.max(simRef.current.shake, 6)
    spit(mote.x, mote.y, 12, '#ff6a52', 170, 'splash')
    tone(120, 'sawtooth', 0.26, 0.04, 0.5)
    pushLog(`${temperById(mote.temper).mark}${mote.weight} was flung off the weir and out of the house entirely`)
    if (current.leaks >= MAX_LEAKS && current.status === 'sorting') {
      current.status = 'flooded'
      setMessage('four leaks and the sluice floor is under water // the house can no longer tell a tithe from an accident')
    }
    dirtyRef.current = true
  }, [pushLog, spit, tone])

  /* ---------------------------------------------------------- writ promotion */

  const liveStats = useCallback(() => {
    const current = worldRef.current
    return {
      tithes: current.tithes,
      leaks: current.leaks,
      head: current.head,
      decree: current.decree,
      fused: Object.values(current.cells).filter(cell => cell.fused).length,
      temperKinds: simRef.current.temperKinds.size,
      cleanFor: simRef.current.cleanFor
    }
  }, [])

  const promote = useCallback(() => {
    const current = worldRef.current
    const stage = WRITS[current.writ]
    const mastered = current.writ >= WRITS.length - 1
    const nextStage = WRITS[Math.min(current.writ + 1, WRITS.length - 1)]

    current.writ = mastered ? current.writ : current.writ + 1
    current.status = mastered ? 'standing' : 'sorting'
    current.tithes = 0
    current.leaks = 0
    if (!mastered) {
      current.bays = nextStage.writs.map((entry, index) => {
        const existing = current.bays[index]
        return entry ? { ...entry, fill: existing?.fill || 0 } : null
      })
      current.head = Math.max(current.head, nextStage.minHead)
    }
    simRef.current.temperKinds = new Set()
    simRef.current.cleanFor = 0
    pushLog(stage.success)
    setCelebration({ kind: mastered ? 'standing' : 'writ', label: stage.success })
    setMessage(stage.success)
    tone(392, 'triangle', 0.4, 0.06)
    window.setTimeout(() => tone(587.33, 'sine', 0.5, 0.05), 140)
    if (celebrationTimerRef.current) window.clearTimeout(celebrationTimerRef.current)
    celebrationTimerRef.current = window.setTimeout(() => setCelebration(null), reducedRef.current ? 400 : 2600)
    dirtyRef.current = true
  }, [pushLog, tone])

  /* -------------------------------------------------------------- simulation */

  const step = useCallback((dt, now) => {
    const current = worldRef.current
    const sim = simRef.current
    const motes = motesRef.current
    const parts = partsRef.current
    const stage = WRITS[Math.min(current.writ, WRITS.length - 1)]
    const decree = current.decree ? DECREES[current.decree] : null
    const headNotch = current.status === 'standing' && decree ? decree.head : current.head
    const running = current.unlocked && current.status !== 'flooded'

    /* hands refill */
    sim.handClock += dt * 1000
    const refill = current.status === 'standing' ? HAND_REFILL_MS * 0.7 : HAND_REFILL_MS
    while (sim.handClock >= refill) {
      sim.handClock -= refill
      sim.hand = Math.min(HAND_MAX, sim.hand + 1)
    }

    /* cistern cadence — a trickle before the house is woken */
    sim.spawnClock += dt * 1000
    // A shut gate still passes trial water, slowly, so the lattice is never a guess.
    const cadence = running && headNotch > 0 ? HEAD_CADENCE[clamp(headNotch, 0, HEAD_CADENCE.length - 1)] : 2400
    const scaled = reducedRef.current ? cadence * 1.5 : cadence
    while (sim.spawnClock >= scaled) {
      sim.spawnClock -= scaled
      spawnMote()
      if (running && headNotch >= 3 && Math.random() < 0.35) spawnMote()
    }

    /* silt accretion — the counter-agency */
    if (running && (stage.silt || current.status === 'standing')) {
      sim.siltClock += dt * 1000
      const siltEvery = current.status === 'standing' && decree?.id === 'vigil' ? 20000 : 11500
      if (sim.siltClock >= siltEvery) {
        sim.siltClock = 0
        if (current.status === 'standing' && decree?.id === 'vigil') {
          const dirty = Object.entries(current.cells).find(([, cell]) => cell.silt)
          if (dirty) {
            current.cells[dirty[0]].silt = false
            dirtyRef.current = true
          }
        } else {
          const candidates = Object.entries(current.cells)
            .filter(([, cell]) => !cell.silt && !cell.fused && cell.stamps === 0)
          const silted = Object.values(current.cells).filter(cell => cell.silt).length
          if (candidates.length && silted < SILT_CAP) {
            const pick = candidates[Math.floor(Math.random() * candidates.length)]
            current.cells[pick[0]].silt = true
            dirtyRef.current = true
            tone(70, 'square', 0.22, 0.02)
          }
        }
      }
    }

    /* the magistrate's rewrites */
    if (running && (stage.rewrite || current.status === 'standing')) {
      sim.rewriteClock += dt * 1000
      if (sim.rewriteClock >= 20000) {
        sim.rewriteClock = 0
        rewriteBay()
      }
    }

    /* passive paddle bias field */
    const weirTop = WEIR_Y
    const weirBottom = WEIR_Y + WEIR_H

    for (let index = motes.length - 1; index >= 0; index -= 1) {
      const mote = motes[index]
      mote.age += dt

      if (mote.held === 'hand') {
        mote.trail.push({ x: mote.x, y: mote.y })
        if (mote.trail.length > 6) mote.trail.shift()
        continue
      }
      if (mote.held === 'sump') {
        if (now >= mote.holdUntil) {
          mote.held = null
          mote.vy = 54
        }
        continue
      }

      mote.vy = Math.min(TERMINAL, mote.vy + GRAVITY * dt)
      mote.vx *= 1 - 1.25 * dt

      /* weir paddles bias whatever passes through them */
      if (mote.y > weirTop && mote.y < weirBottom) {
        const band = clamp(Math.floor((mote.x - GX) / BAY_W), 0, 2)
        mote.vx += current.paddles[band] * 74 * dt * 3
      }

      mote.x += mote.vx * dt
      mote.y += mote.vy * dt

      mote.trail.push({ x: mote.x, y: mote.y })
      if (mote.trail.length > 7) mote.trail.shift()

      /* lattice walls clack; the weir band is open to the gutters */
      if (mote.y < LATTICE_BOTTOM + 6) {
        if (mote.x - mote.r < GX) {
          mote.x = GX + mote.r
          mote.vx = Math.abs(mote.vx) * 0.58 + 24
          spit(GX, mote.y, 3, '#8b9aa4', 70)
        } else if (mote.x + mote.r > GX + LATTICE_W) {
          mote.x = GX + LATTICE_W - mote.r
          mote.vx = -Math.abs(mote.vx) * 0.58 - 24
          spit(GX + LATTICE_W, mote.y, 3, '#8b9aa4', 70)
        }
      } else if (mote.x < GX - 36 || mote.x > GX + LATTICE_W + 36) {
        spill(mote)
        motes.splice(index, 1)
        continue
      }

      /* fittings fire once per cell, at the cell's own waistline */
      if (mote.y >= GY && mote.y < LATTICE_BOTTOM) {
        const col = Math.floor((mote.x - GX) / CELL)
        const row = Math.floor((mote.y - GY) / CELL)
        if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
          const key = cellKey(col, row)
          if (mote.applied !== key && mote.y >= GY + row * CELL + CELL * 0.5) {
            mote.applied = key
            applyFitting(mote, key, now)
          }
        }
      }

      if (mote.y >= BAY_Y + 34) {
        land(mote)
        motes.splice(index, 1)
        continue
      }
      if (mote.y > BOARD.h + 80) motes.splice(index, 1)
    }

    /* particles */
    for (let index = parts.length - 1; index >= 0; index -= 1) {
      const part = parts[index]
      part.life += dt
      if (part.life >= part.max) {
        parts.splice(index, 1)
        continue
      }
      part.vy += 420 * dt
      part.x += part.vx * dt
      part.y += part.vy * dt
    }

    /* flow + clean streak */
    sim.flowClock += dt
    if (sim.flowClock > 0.5) {
      sim.flow = motes.length
      sim.flowClock = 0
    }
    if (running && headNotch >= stage.minHead) sim.cleanFor += dt
    sim.shake = Math.max(0, sim.shake - dt * 22)
    sim.paddleHeat = sim.paddleHeat.map(heat => Math.max(0, heat - dt * 2.4))

    /* orphan reading: motes aloft that no open bay would accept as they stand */
    sim.orphans = motes.reduce((count, mote) => (
      current.bays.some(bay => accepts(bay, mote)) ? count : count + 1
    ), 0)

    /* promotion */
    if (running && current.status === 'sorting') {
      const stats = liveStats()
      if (stage.demands.every(demand => demand.test(stats))) promote()
    }
  }, [applyFitting, land, liveStats, promote, rewriteBay, spawnMote, spill, spit, tone])

  /* ------------------------------------------------------------------- paint */

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const { scale, width, height } = paintRef.current
    const sim = simRef.current
    const current = worldRef.current

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, width, height)
    const jitter = reducedRef.current ? 0 : sim.shake
    ctx.setTransform(
      scale, 0, 0, scale,
      (Math.random() - 0.5) * jitter * scale,
      (Math.random() - 0.5) * jitter * scale
    )

    /* silt grain inside blocked cells */
    Object.entries(current.cells).forEach(([key, cell]) => {
      if (!cell.silt) return
      const [col, row] = key.split(':').map(Number)
      const centre = cellCentre(col, row)
      ctx.fillStyle = 'rgba(86, 76, 60, .72)'
      for (let index = 0; index < 22; index += 1) {
        const angle = (index / 22) * Math.PI * 2 + col * 0.7 + row
        const radius = 9 + ((index * 13) % 28)
        ctx.fillRect(
          centre.x + Math.cos(angle) * radius - 1.5,
          centre.y + Math.sin(angle) * radius * 0.78 - 1.5,
          3, 3
        )
      }
    })

    /* particles */
    partsRef.current.forEach(part => {
      const fade = 1 - part.life / part.max
      ctx.globalAlpha = Math.max(0, fade) * (part.kind === 'splash' ? 0.85 : 0.68)
      ctx.fillStyle = part.color
      ctx.beginPath()
      ctx.arc(part.x, part.y, part.size * (0.4 + fade), 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1

    /* motes */
    motesRef.current.forEach(mote => {
      const temper = temperById(mote.temper)

      if (!reducedRef.current && mote.trail.length > 1) {
        ctx.strokeStyle = temper.color
        ctx.globalAlpha = 0.2
        ctx.lineWidth = mote.r * 0.6
        ctx.lineCap = 'round'
        ctx.beginPath()
        mote.trail.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y)
          else ctx.lineTo(point.x, point.y)
        })
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      const orphan = !current.bays.some(bay => accepts(bay, mote))
      ctx.beginPath()
      ctx.arc(mote.x, mote.y, mote.r + 4.5, 0, Math.PI * 2)
      ctx.fillStyle = orphan ? 'rgba(255, 106, 82, .3)' : 'rgba(240, 232, 208, .13)'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(mote.x, mote.y, mote.r, 0, Math.PI * 2)
      if (mote.trial) {
        // Trial water reads as an outline: present, routed, but not banked.
        ctx.globalAlpha = 0.5
        ctx.fillStyle = 'rgba(16, 24, 26, .7)'
        ctx.fill()
        ctx.setLineDash([4, 3])
        ctx.lineWidth = 2
        ctx.strokeStyle = temper.color
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
      } else {
        ctx.fillStyle = temper.color
        ctx.fill()
        ctx.lineWidth = mote.held === 'hand' ? 3 : 1.4
        ctx.strokeStyle = mote.held === 'hand' ? '#f6efdd' : 'rgba(10, 14, 16, .6)'
        ctx.stroke()
      }

      if (mote.held === 'sump') {
        ctx.beginPath()
        ctx.arc(mote.x, mote.y, mote.r + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp((mote.holdUntil - performance.now()) / 620, 0, 1))
        ctx.strokeStyle = FITTINGS.sump.color
        ctx.lineWidth = 2.4
        ctx.stroke()
      }

      ctx.fillStyle = mote.trial ? temper.color : 'rgba(10, 13, 15, .92)'
      ctx.font = `700 ${Math.round(mote.r * 1.05)}px "Courier New", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(mote.weight), mote.x, mote.y + 0.5)
    })

    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }, [])

  /* ------------------------------------------------------ fixed-timestep loop */

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let accumulator = 0
    let hudClock = 0
    const FIXED = 1 / 120

    const loop = (now) => {
      raf = window.requestAnimationFrame(loop)
      const elapsed = Math.min(0.1, (now - last) / 1000)
      last = now
      accumulator += elapsed
      let guard = 0
      while (accumulator >= FIXED && guard < 12) {
        step(FIXED, now)
        accumulator -= FIXED
        guard += 1
      }
      if (guard >= 12) accumulator = 0
      paint()

      hudClock += elapsed
      if (hudClock >= 0.22) {
        hudClock = 0
        const sim = simRef.current
        setHud({
          hand: sim.hand,
          motes: motesRef.current.length,
          cleanFor: sim.cleanFor,
          flow: sim.flow,
          orphans: sim.orphans,
          paddleHeat: [...sim.paddleHeat]
        })
        if (dirtyRef.current) {
          dirtyRef.current = false
          setWorld({ ...worldRef.current, rev: (worldRef.current.rev || 0) + 1 })
        }
      }
    }
    raf = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(raf)
  }, [paint, step])

  /* --------------------------------------------------------- canvas sizing */

  useEffect(() => {
    const frame = frameRef.current
    const canvas = canvasRef.current
    if (!frame || !canvas) return undefined
    const resize = () => {
      const rect = frame.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      paintRef.current = {
        dpr,
        width: canvas.width,
        height: canvas.height,
        scale: (rect.width / BOARD.w) * dpr
      }
    }
    resize()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', resize)
      return () => window.removeEventListener('resize', resize)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  /* ------------------------------------------------------------------ actions */

  const boardPointFromClient = useCallback((clientX, clientY) => {
    const svg = svgRef.current
    if (!svg) return null
    const matrix = svg.getScreenCTM()
    if (!matrix) return null
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    return point.matrixTransform(matrix.inverse())
  }, [])

  const wake = useCallback(() => {
    commit(previous => ({
      ...previous,
      unlocked: true,
      log: [...previous.log, {
        id: `wake-${Date.now()}`,
        writ: previous.writ,
        text: 'a hand opened the cistern gate; the drip became a flow with somewhere it had to go'
      }].slice(-6)
    }))
    // Opening the gate flushes the dry-run drip: nothing that fell while the
    // house was unwatched is allowed to land on a floor that now counts.
    motesRef.current = []
    simRef.current.hand = HAND_MAX
    simRef.current.cleanFor = 0
    simRef.current.spawnClock = 0
    setMessage('trial water is falling and nothing counts yet // seat a balance scale, watch where the hollow motes land, then open the gate')
    requestAnimationFrame(() => surfaceRef.current?.focus())
  }, [commit])

  const seatFitting = useCallback((fittingId, key) => {
    const current = worldRef.current
    const fitting = FITTINGS[fittingId]
    if (!fitting || !current.cells[key] || !editable) return
    if (fitting.unlockedAt > current.writ && current.status !== 'standing') return
    remember()
    commit(previous => ({
      ...previous,
      cells: {
        ...previous.cells,
        [key]: { ...previous.cells[key], fitting: fittingId, silt: false }
      }
    }))
    setArmedFittingId(null)
    setPry(false)
    setMessage(`${fitting.label} seated at ${key.replace(':', '/')} // ${fitting.note}`)
    tone(262, 'triangle', 0.1, 0.03)
  }, [commit, editable, remember, tone])

  const cycleCell = useCallback((key) => {
    const cell = worldRef.current.cells[key]
    if (!cell?.fitting || !editable) return
    if (cell.fitting === 'pin') {
      commit(previous => ({
        ...previous,
        cells: { ...previous.cells, [key]: { ...previous.cells[key], dir: previous.cells[key].dir * -1 } }
      }))
      setMessage(`the pin at ${key.replace(':', '/')} now throws ${cell.dir === 1 ? 'left' : 'right'}`)
      tone(330, 'triangle', 0.07, 0.028)
      return
    }
    if (cell.fitting === 'scale') {
      const next = cell.thr >= 4 ? 1 : cell.thr + 1
      commit(previous => ({
        ...previous,
        cells: { ...previous.cells, [key]: { ...previous.cells[key], thr: next } }
      }))
      setMessage(`the scale at ${key.replace(':', '/')} now sends ${next} and under to the left`)
      tone(300 + next * 30, 'sine', 0.08, 0.028)
      return
    }
    setMessage(`${FITTINGS[cell.fitting].label} // ${FITTINGS[cell.fitting].reading}`)
  }, [commit, editable, tone])

  const dredge = useCallback((key) => {
    const current = worldRef.current
    const cell = current.cells[key]
    if (!cell?.silt || !editable) return false
    if (simRef.current.hand < DREDGE_COST) {
      setMessage('not enough hand left to dredge // the pump refills one every two seconds')
      return false
    }
    simRef.current.hand -= DREDGE_COST
    commit(previous => ({
      ...previous,
      cells: { ...previous.cells, [key]: { ...previous.cells[key], silt: false } }
    }))
    setMessage(`silt dredged out of ${key.replace(':', '/')} // two hands spent`)
    spit(cellCentre(...key.split(':').map(Number)).x, cellCentre(...key.split(':').map(Number)).y, 14, '#5c5244', 160)
    tone(146, 'triangle', 0.2, 0.034)
    return true
  }, [commit, editable, spit, tone])

  const liftFitting = useCallback((key) => {
    const cell = worldRef.current.cells[key]
    if (!cell?.fitting || !editable) return
    remember()
    commit(previous => ({
      ...previous,
      cells: { ...previous.cells, [key]: { ...previous.cells[key], fitting: null } }
    }))
    setMessage(`${FITTINGS[cell.fitting].label} pried out of ${key.replace(':', '/')} // its ${cell.stamps} stamps stay in the stone`)
    tone(196, 'square', 0.12, 0.03, 0.6)
  }, [commit, editable, remember, tone])

  const swingPaddle = useCallback((band) => {
    const current = worldRef.current
    if (!current.unlocked || current.status === 'flooded') return
    if (simRef.current.hand < PADDLE_COST) {
      setMessage('the hand pump is dry // paddles cost one hand each')
      tone(90, 'square', 0.08, 0.02)
      return
    }
    simRef.current.hand -= PADDLE_COST
    const lean = current.paddles[band] * -1
    commit(previous => ({
      ...previous,
      paddles: previous.paddles.map((entry, index) => (index === band ? lean : entry))
    }))
    simRef.current.paddleHeat[band] = 1
    let kicked = 0
    motesRef.current.forEach(mote => {
      if (mote.held === 'hand') return
      if (mote.y < WEIR_Y - 30 || mote.y > WEIR_Y + WEIR_H + 30) return
      const inBand = clamp(Math.floor((mote.x - GX) / BAY_W), 0, 2)
      if (inBand !== band) return
      mote.vx = lean * 248
      mote.vy *= 0.56
      mote.held = null
      kicked += 1
      spit(mote.x, mote.y, 7, '#f0e4c0', 180)
    })
    tone(lean < 0 ? 349 : 262, 'triangle', 0.1, 0.038, 1.4)
    setMessage(kicked
      ? `paddle ${band + 1} swung ${lean < 0 ? 'left' : 'right'} and threw ${kicked} mote${kicked === 1 ? '' : 's'}`
      : `paddle ${band + 1} now leans ${lean < 0 ? 'left' : 'right'} // nothing was passing through it`)
  }, [commit, spit, tone])

  const setHead = useCallback((notch) => {
    const current = worldRef.current
    if (!current.unlocked || current.status === 'flooded') return
    const next = clamp(notch, 0, HEAD_CADENCE.length - 1)

    /* Shutting the gate bails the sluice floor. The run's leaks go down the drain
     * and so do its tithes — the lattice you built is the only thing that keeps.
     * This is what makes a tight writ survivable: you can always stop the bleeding
     * and start the run again, but never halfway through a good one for free. */
    if (next === 0 && current.head > 0) {
      const spent = current.tithes
      motesRef.current = []
      simRef.current.cleanFor = 0
      simRef.current.temperKinds = new Set()
      commit(previous => ({
        ...previous,
        head: 0,
        tithes: 0,
        leaks: 0,
        bays: previous.bays.map(bay => (bay ? { ...bay, fill: 0 } : null)),
        log: [...previous.log, {
          id: `bail-${Date.now()}`,
          writ: previous.writ,
          text: `the gate was shut and the floor bailed // ${spent} tithe${spent === 1 ? '' : 's'} and every leak with them`
        }].slice(-6)
      }))
      setMessage(`the gate is shut and the floor bailed // this run's ${spent} tithe${spent === 1 ? '' : 's'} and all of its leaks are gone, but every fitting you seated stays`)
      tone(140, 'sine', 0.42, 0.042, 0.6)
      return
    }

    // Opening onto a dry floor flushes the trial water: a run starts clean.
    if (current.head === 0 && next > 0) motesRef.current = []
    commit(previous => ({ ...previous, head: next }))
    setMessage(`the gate stands ${next} notch${next === 1 ? '' : 'es'} open // a mote every ${(HEAD_CADENCE[next] / 1000).toFixed(2)}s, and from here every one of them counts`)
    tone(160 + next * 40, 'sine', 0.16, 0.032)
  }, [commit, tone])

  const swapWrits = useCallback((from, to) => {
    const current = worldRef.current
    if (from === to || !current.bays[from] || !current.bays[to] || !editable) return
    remember()
    commit(previous => {
      const bays = [...previous.bays]
      const left = bays[from]
      const right = bays[to]
      bays[from] = { ...right, fill: left.fill }
      bays[to] = { ...left, fill: right.fill }
      return { ...previous, bays }
    })
    setMessage(`the ${['left', 'middle', 'right'][from]} and ${['left', 'middle', 'right'][to]} writs changed bays // the lattice above them did not`)
    tone(233, 'triangle', 0.16, 0.034)
  }, [commit, editable, remember, tone])

  const chooseDecree = useCallback((decreeId) => {
    const current = worldRef.current
    if (!DECREES[decreeId] || current.writ < WRITS.length - 1) return
    commit(previous => ({ ...previous, decree: decreeId }))
    setMessage(`${DECREES[decreeId].label} // ${DECREES[decreeId].note}`)
    tone(392, 'sine', 0.3, 0.04)
  }, [commit, tone])

  const lift = useCallback(() => {
    const snapshot = history.at(-1)
    if (!snapshot) {
      setMessage('no earlier arrangement remains under the sluice')
      return
    }
    setHistory(entries => entries.slice(0, -1))
    simRef.current.cleanFor = 0
    commit(previous => ({ ...previous, ...snapshot, unlocked: true }))
    setMessage('one arrangement lifted // fittings, stamps, writs and leaks came back together')
  }, [commit, history])

  const reset = useCallback(() => {
    motesRef.current = []
    partsRef.current = []
    simRef.current = {
      hand: HAND_MAX, handClock: 0, spawnClock: 0, siltClock: 0, rewriteClock: 0,
      cleanFor: 0, flowClock: 0, flow: 0, uid: 0, paddleHeat: [0, 0, 0], shake: 0,
      temperKinds: new Set(), orphans: 0
    }
    setHistory([])
    setArmedFittingId(null)
    setPry(false)
    setCelebration(null)
    commit(() => freshWorld())
    setMessage('a clean cut of stone replaces every stamp the lattice had earned')
  }, [commit])

  /* --------------------------------------------------------- tongs + dragging */

  const grabMoteNear = useCallback((boardX, boardY) => {
    if (!worldRef.current.unlocked || worldRef.current.status === 'flooded') return null
    if (simRef.current.hand < TONGS_COST) return null
    let best = null
    let bestDistance = 46
    motesRef.current.forEach(mote => {
      if (mote.held === 'hand') return
      const distance = Math.hypot(mote.x - boardX, mote.y - boardY)
      if (distance < bestDistance + mote.r) {
        best = mote
        bestDistance = distance
      }
    })
    if (!best) return null
    simRef.current.hand -= TONGS_COST
    best.held = 'hand'
    best.vx = 0
    best.vy = 0
    best.applied = null
    spit(best.x, best.y, 8, '#f6efdd', 120)
    tone(466, 'sine', 0.09, 0.03)
    return best
  }, [spit, tone])

  const beginDrag = useCallback((event, payload) => {
    event.preventDefault()
    event.stopPropagation()
    const next = {
      ...payload,
      clientX: event.clientX,
      clientY: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      targetKey: null
    }
    dragRef.current = next
    setDrag(next)
  }, [])

  useEffect(() => {
    if (!drag) return undefined

    const keyAtClient = (clientX, clientY) => (
      document.elementFromPoint(clientX, clientY)?.closest?.('[data-cell]')?.dataset.cell || null
    )

    const handleMove = (event) => {
      const current = dragRef.current
      if (!current) return
      const moved = current.moved
        || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 6

      if (current.kind === 'tongs') {
        const point = boardPointFromClient(event.clientX, event.clientY)
        const mote = motesRef.current.find(entry => entry.id === current.moteId)
        if (point && mote) {
          mote.vx = (point.x - mote.x) / 0.05
          mote.vy = (point.y - mote.y) / 0.05
          mote.x = point.x
          mote.y = point.y
        }
        if (!current.moved) {
          dragRef.current = { ...current, moved: true }
          setDrag(dragRef.current)
        }
        return
      }

      dragRef.current = {
        ...current,
        clientX: event.clientX,
        clientY: event.clientY,
        moved,
        targetKey: moved && current.kind === 'fitting' ? keyAtClient(event.clientX, event.clientY) : null
      }
      setDrag(dragRef.current)
    }

    const handleUp = (event) => {
      const current = dragRef.current
      if (!current) return

      if (current.kind === 'tongs') {
        const mote = motesRef.current.find(entry => entry.id === current.moteId)
        if (mote) {
          mote.held = null
          mote.vx = clamp(mote.vx, -300, 300)
          mote.vy = clamp(Math.max(40, mote.vy), 40, 320)
          const point = boardPointFromClient(event.clientX, event.clientY)
          if (point && point.y > BAY_Y - 10) {
            mote.x = clamp(point.x, GX + 10, GX + LATTICE_W - 10)
            mote.y = BAY_Y + 36
            mote.vy = 90
          }
        }
      }

      if (current.kind === 'fitting') {
        const key = keyAtClient(event.clientX, event.clientY)
        if (current.moved && key) seatFitting(current.id, key)
        else if (current.moved) setMessage('the fitting found no cell // tap a fitting on the belt then tap a cell')
        else {
          setPry(false)
          setArmedFittingId(previous => (previous === current.id ? null : current.id))
          setMessage(`${FITTINGS[current.id].label} armed // ${FITTINGS[current.id].reading}`)
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
  }, [boardPointFromClient, drag, seatFitting])

  /** One gesture, two meanings: press where a mote is falling and you catch it;
   *  press bare stone and you work the lattice. */
  const cellPointerDown = useCallback((event, key) => {
    const point = boardPointFromClient(event.clientX, event.clientY)
    if (point) {
      const caught = grabMoteNear(point.x, point.y)
      if (caught) {
        pointerRef.current.moteId = caught.id
        beginDrag(event, { kind: 'tongs', moteId: caught.id })
        return
      }
    }
    const cell = worldRef.current.cells[key]
    if (cell?.fitting && !armedFittingId && !pry && editable) {
      beginDrag(event, { kind: 'fitting', id: cell.fitting, fromKey: key })
    }
  }, [armedFittingId, beginDrag, boardPointFromClient, editable, grabMoteNear, pry])

  const cellActivate = useCallback((key) => {
    if (suppressClickRef.current) return
    const cell = worldRef.current.cells[key]
    if (!cell) return
    if (cell.silt) {
      dredge(key)
      return
    }
    if (pry) {
      liftFitting(key)
      return
    }
    if (armedFittingId) {
      seatFitting(armedFittingId, key)
      return
    }
    if (cell.fitting) {
      cycleCell(key)
      return
    }
    setMessage(`cell ${key.replace(':', '/')} is bare stone // arm a fitting from the belt, or drag one onto it`)
  }, [armedFittingId, cycleCell, dredge, liftFitting, pry, seatFitting])

  /* ---------------------------------------------------------------- keyboard */

  const handleKeyDown = useCallback((event) => {
    if (event.target.closest('button, a, input, textarea, select')) return
    if (event.key === '1' || event.key === '2' || event.key === '3') {
      event.preventDefault()
      swingPaddle(Number(event.key) - 1)
      return
    }
    if (event.key === 'ArrowUp') { event.preventDefault(); setHead(worldRef.current.head + 1) }
    if (event.key === 'ArrowDown') { event.preventDefault(); setHead(worldRef.current.head - 1) }
    if (event.key.toLowerCase() === 'f') {
      event.preventDefault()
      const pool = fittingList().filter(fitting => fitting.unlockedAt <= worldRef.current.writ || standing)
      const index = Math.max(0, pool.findIndex(fitting => fitting.id === armedFittingId))
      const next = pool[(index + 1) % pool.length]
      setPry(false)
      setArmedFittingId(next?.id || null)
      if (next) setMessage(`${next.label} armed from the keyboard // tap a cell to seat it`)
    }
    if (event.key.toLowerCase() === 'x') {
      event.preventDefault()
      setArmedFittingId(null)
      setPry(previous => !previous)
    }
    if (event.key === ' ') {
      event.preventDefault()
      setHead(worldRef.current.head > 0 ? 0 : Math.max(1, writ.minHead))
    }
  }, [armedFittingId, setHead, standing, swingPaddle, writ.minHead])

  /* ------------------------------------------------------------------ reading */

  const reading = useMemo(() => {
    const stats = liveStats()
    if (!world.unlocked) {
      return {
        kind: 'sealed',
        title: 'the cistern is only dripping',
        body: 'Nothing is judged until the gate is opened. The bays are dry and the lattice has no opinion.'
      }
    }
    if (flooded) {
      return {
        kind: 'flooded',
        title: 'the floor is under water',
        body: 'Lift the last arrangement, or re-dig the house. Four leaks is all a sluice gets.'
      }
    }
    if (world.head === 0) {
      return {
        kind: 'shut',
        title: 'trial water is running and the bays are not counting',
        body: `Hollow motes are the sluice testing itself: they route through your lattice and land exactly where a real tithe would, but nothing is banked and nothing can leak. Seat fittings until the trial water lands where you want it, then open the gate — this writ wants it at least ${writ.minHead} notch${writ.minHead === 1 ? '' : 'es'} open.`
      }
    }
    if (hud.orphans > 0) {
      const sample = motesRef.current.find(mote => !world.bays.some(bay => accepts(bay, mote)))
      const temper = sample ? temperById(sample.temper) : TEMPERS[0]
      return {
        kind: 'orphan',
        title: `${hud.orphans} mote${hud.orphans === 1 ? '' : 's'} aloft that no bay will take`,
        body: sample
          ? `A ${temper.mark}${sample.weight} is falling and every open writ refuses it. Run it through a kiln to change its temper, a shear to halve its weight, or catch it with the tongs and carry it somewhere it fits.`
          : 'Something falling has no floor. Change it with a kiln or a shear before it lands.'
      }
    }
    const silted = Object.values(world.cells).filter(cell => cell.silt).length
    if (silted >= 4) {
      return {
        kind: 'silt',
        title: `${silted} cells are silted shut`,
        body: 'Silted stone bounces motes sideways at random. Press a silted cell to dredge it for two hands, or seat a fitting there — silt never settles on a cell that gets used.'
      }
    }
    if (stats.leaks >= MAX_LEAKS - 2) {
      return {
        kind: 'brink',
        title: `${MAX_LEAKS - stats.leaks} more leak${MAX_LEAKS - stats.leaks === 1 ? '' : 's'} floods the house`,
        body: `Shut the gate to bail the floor. It costs this run's ${stats.tithes} tithe${stats.tithes === 1 ? '' : 's'}, but it washes the leaks away with them and leaves every fitting where you seated it.`
      }
    }
    if (stats.leaks > writ.leakCap) {
      return {
        kind: 'wet',
        title: `${stats.leaks} leaks on the floor and this writ allows ${writ.leakCap}`,
        body: `This run can no longer be discharged. Shut the gate to bail it — you lose the ${stats.tithes} tithe${stats.tithes === 1 ? '' : 's'} you have banked, keep every fitting you seated, and begin again dry.`
      }
    }
    if (hud.hand <= 1) {
      return {
        kind: 'dry',
        title: 'the hand pump is almost dry',
        body: 'Paddles cost one, tongs and dredging cost two, and the pump returns one every two seconds. A lattice that sorts without you is the only way to keep a reserve.'
      }
    }
    const unmet = writ.demands.find(demand => !demand.test(stats))
    if (unmet) {
      return {
        kind: 'owed',
        title: `the writ still wants: ${unmet.text}`,
        body: `Standing at ${unmet.read(stats)}. The house is sorting ${hud.flow} mote${hud.flow === 1 ? '' : 's'} at a time and has been dry for ${Math.floor(stats.cleanFor)}s.`
      }
    }
    return {
      kind: 'clear',
      title: 'the house is sorting itself',
      body: `Every open bay is being fed what it asked for. ${Object.values(world.cells).filter(cell => cell.fused).length} cells have fused and silt can no longer take them.`
    }
  }, [flooded, hud.flow, hud.hand, hud.orphans, liveStats, world.bays, world.cells, world.head, world.unlocked, writ])

  const phase = standing
    ? 'standing'
    : flooded
      ? 'flooded'
      : celebration
        ? 'tithing'
        : !world.unlocked
          ? 'sealed'
          : world.head === 0
            ? 'shut'
            : reading.kind === 'orphan' || reading.kind === 'brink'
              ? 'straining'
              : reading.kind === 'clear'
                ? 'sorting'
                : 'digging'

  const belt = useMemo(
    () => fittingList().filter(fitting => fitting.unlockedAt <= world.writ || standing),
    [standing, world.writ]
  )
  const stats = liveStats()
  const fusedCount = Object.values(world.cells).filter(cell => cell.fused).length
  const siltCount = Object.values(world.cells).filter(cell => cell.silt).length

  /* ------------------------------------------------------------------- render */

  return (
    <div className={`sm-shell phase-${phase} ${narrow ? 'is-narrow' : ''} ${reducedMotion ? 'is-reduced-motion' : ''} ${world.decree ? `decree-${world.decree}` : ''}`}>
      <main
        ref={surfaceRef}
        className={`sm-surface ${drag ? 'is-dragging' : ''}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        data-playground-surface
        data-testid="sluice-magistrate-surface"
        aria-label="A continuously running gravity sluice house: assemble a lattice of fittings that sorts falling motes into bays, and intervene by hand with tongs and weir paddles"
      >
        {/* ---------------------------------------------------------- tool belt */}
        <aside className="sm-belt" aria-label="fitting belt">
          <div className="sm-belt-plate">
            <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          </div>

          <div className="sm-belt-heading">
            <span>fittings</span>
            <strong>{armedFittingId ? `${FITTINGS[armedFittingId].mark} armed` : pry ? '⌁ prying' : 'drag / tap'}</strong>
          </div>

          <div className="sm-belt-rail">
            {belt.map(fitting => {
              const seated = Object.values(world.cells).filter(cell => cell.fitting === fitting.id).length
              return (
                <button
                  type="button"
                  key={fitting.id}
                  className={`sm-tool ${armedFittingId === fitting.id ? 'is-armed' : ''} ${seated ? 'is-seated' : ''}`}
                  style={{ '--tool-color': fitting.color }}
                  disabled={!editable}
                  aria-pressed={armedFittingId === fitting.id}
                  data-playground-action="arm-fitting"
                  onPointerDown={(event) => { if (editable) beginDrag(event, { kind: 'fitting', id: fitting.id }) }}
                  onClick={() => {
                    if (suppressClickRef.current || !editable) return
                    setPry(false)
                    setArmedFittingId(previous => (previous === fitting.id ? null : fitting.id))
                  }}
                >
                  <i>{fitting.mark}</i>
                  <span>
                    <strong>{fitting.short}</strong>
                    <small>{fitting.note}</small>
                  </span>
                  <b>{seated || '·'}</b>
                </button>
              )
            })}
            <button
              type="button"
              className={`sm-tool sm-pry ${pry ? 'is-armed' : ''}`}
              disabled={!editable}
              aria-pressed={pry}
              data-playground-action="arm-pry"
              onClick={() => {
                setArmedFittingId(null)
                setPry(previous => !previous)
                setMessage(pry ? 'the pry bar is back on the belt' : 'the pry bar is armed // tap a seated fitting to lift it out')
              }}
            >
              <i>⌁</i>
              <span><strong>pry bar</strong><small>lift a seated fitting back out</small></span>
              <b>X</b>
            </button>
          </div>

          <p className="sm-tool-note">
            {armedFittingId ? FITTINGS[armedFittingId].reading : 'Press a falling mote to catch it in the tongs. Press bare stone to work the lattice.'}
          </p>
        </aside>

        {/* -------------------------------------------------------- sluice house */}
        <section className="sm-house" aria-label="sluice house elevation">
          <div className="sm-slate">
            <div className="sm-slate-mark">
              <span>living interface / sluice generation 252</span>
              <h1 style={{ color: experiment.color }}>{experiment.name}</h1>
            </div>
            <div className={`sm-slate-reading is-${reading.kind}`} aria-live="polite">
              <strong>{reading.title}</strong>
              <p>{reading.body}</p>
            </div>
            <p className="sm-slate-status" role="status">{message}</p>
          </div>

          <div className="sm-frame" ref={frameRef}>
            <svg
              ref={svgRef}
              className="sm-plate"
              viewBox={`0 0 ${BOARD.w} ${BOARD.h}`}
              preserveAspectRatio="xMidYMid meet"
              aria-label={`A sluice house with ${COLS} by ${ROWS} lattice cells, three weir paddles and ${world.bays.filter(Boolean).length} open bays. ${reading.title}.`}
            >
              <defs>
                <linearGradient id="sm-stone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1b2426" />
                  <stop offset="54%" stopColor="#121a1c" />
                  <stop offset="100%" stopColor="#0a1012" />
                </linearGradient>
                <linearGradient id="sm-water" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(120, 186, 200, .42)" />
                  <stop offset="100%" stopColor="rgba(60, 112, 126, .12)" />
                </linearGradient>
                <pattern id="sm-ashlar" width="64" height="32" patternUnits="userSpaceOnUse">
                  <path d="M0 32 H64 M0 16 H64 M16 16 V32 M48 0 V16" fill="none" stroke="rgba(214,224,220,.05)" strokeWidth="1" />
                </pattern>
                <filter id="sm-grain" x="-6%" y="-6%" width="112%" height="112%">
                  <feTurbulence type="fractalNoise" baseFrequency=".84" numOctaves="1" seed="252" result="noise" />
                  <feColorMatrix in="noise" type="matrix" values="0 0 0 0 .9  0 0 0 0 .95  0 0 0 0 .92  0 0 0 .1 0" result="veil" />
                  <feComposite in="veil" in2="SourceGraphic" operator="in" result="speck" />
                  <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="speck" /></feMerge>
                </filter>
                <filter id="sm-halo" x="-130%" y="-130%" width="360%" height="360%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              <rect className="sm-ground" width={BOARD.w} height={BOARD.h} rx="20" fill="url(#sm-stone)" filter="url(#sm-grain)" />
              <rect x="10" y="10" width={BOARD.w - 20} height={BOARD.h - 20} rx="14" fill="url(#sm-ashlar)" />

              {/* cistern */}
              <g className="sm-cistern">
                <path
                  className="sm-cistern-shell"
                  d={`M 54 18 H ${BOARD.w - 54} V ${CISTERN_H - 30} Q ${BOARD.w - 54} ${CISTERN_H} ${BOARD.w - 96} ${CISTERN_H} H 96 Q 54 ${CISTERN_H} 54 ${CISTERN_H - 30} Z`}
                />
                <rect
                  className="sm-cistern-water"
                  x="62" y="26"
                  width={BOARD.w - 124}
                  height={Math.max(6, (CISTERN_H - 48) * (0.3 + world.head * 0.17))}
                  fill="url(#sm-water)"
                />
                <text className="sm-cistern-label" x="78" y="48">cistern</text>
                <text className="sm-cistern-head" x={BOARD.w - 78} y="48">
                  {world.head === 0 ? 'gate shut' : `${(HEAD_CADENCE[world.head] / 1000).toFixed(2)}s / mote`}
                </text>

                {/* head gate: five notches, draggable and keyboard reachable */}
                <g className="sm-gate" transform={`translate(${BOARD.w - 108} 58)`}>
                  {HEAD_CADENCE.map((_, notch) => (
                    <g
                      key={notch}
                      className={`sm-notch ${world.head >= notch && notch > 0 ? 'is-open' : ''} ${world.head === notch ? 'is-set' : ''}`}
                      transform={`translate(${notch * 18} 0)`}
                      role="button"
                      tabIndex={live ? 0 : -1}
                      aria-label={`Open the cistern gate to notch ${notch}${notch === 0 ? ', shut' : ''}`}
                      onClick={(event) => { event.stopPropagation(); setHead(notch) }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          setHead(notch)
                        }
                      }}
                    >
                      <rect className="sm-notch-hit" x="-8" y="-20" width="18" height="44" />
                      <rect x="-5" y={-4 - notch * 3} width="10" height={10 + notch * 6} rx="2" />
                    </g>
                  ))}
                </g>
              </g>

              {/* lattice */}
              <g className="sm-lattice">
                <rect
                  className="sm-lattice-bed"
                  x={GX - 12} y={GY - 12}
                  width={LATTICE_W + 24} height={LATTICE_H + 24}
                  rx="10"
                />
                {Array.from({ length: COLS }, (_, col) => Array.from({ length: ROWS }, (_, row) => {
                  const key = cellKey(col, row)
                  const cell = world.cells[key]
                  const x = GX + col * CELL
                  const y = GY + row * CELL
                  const fitting = cell.fitting ? FITTINGS[cell.fitting] : null
                  const targeted = drag?.kind === 'fitting' && drag.targetKey === key
                  return (
                    <g
                      key={key}
                      data-cell={key}
                      className={`sm-cell ${fitting ? 'is-seated' : 'is-bare'} ${cell.silt ? 'is-silted' : ''} ${cell.fused ? 'is-fused' : ''} ${targeted ? 'is-drop-target' : ''} ${armedFittingId ? 'is-receptive' : ''}`}
                      transform={`translate(${x} ${y})`}
                      style={{ '--cell-color': fitting?.color || '#58666a' }}
                      role="button"
                      tabIndex={editable ? 0 : -1}
                      aria-label={`Cell ${col + 1} across, ${row + 1} down. ${cell.silt ? 'Silted shut; activate to dredge.' : fitting ? `${fitting.label}${cell.fitting === 'pin' ? `, throwing ${cell.dir < 0 ? 'left' : 'right'}` : ''}${cell.fitting === 'scale' ? `, threshold ${cell.thr}` : ''}, ${cell.stamps} stamps${cell.fused ? ', fused' : ''}.` : 'Bare stone.'}`}
                      onPointerDown={(event) => cellPointerDown(event, key)}
                      onClick={(event) => { event.stopPropagation(); cellActivate(key) }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          cellActivate(key)
                        }
                      }}
                    >
                      <rect className="sm-cell-floor" width={CELL} height={CELL} />
                      <rect className="sm-cell-edge" x="2.5" y="2.5" width={CELL - 5} height={CELL - 5} rx="4" />

                      {cell.silt && (
                        <g className="sm-silt-mark">
                          <path d={`M 10 ${CELL - 12} Q ${CELL / 2} ${CELL - 30} ${CELL - 10} ${CELL - 12} L ${CELL - 10} ${CELL - 6} L 10 ${CELL - 6} Z`} />
                          <text x={CELL / 2} y={CELL / 2 + 4}>silt</text>
                        </g>
                      )}

                      {fitting && !cell.silt && (
                        <g className="sm-fit" transform={`translate(${CELL / 2} ${CELL / 2})`}>
                          {cell.fitting === 'pin' && (
                            <path className="sm-fit-pin" d={`M ${-22 * cell.dir} -16 L ${24 * cell.dir} 6 L ${-22 * cell.dir} 18 Z`} />
                          )}
                          {cell.fitting === 'chute' && (
                            <path className="sm-fit-chute" d="M -13 -28 V 28 M 13 -28 V 28" />
                          )}
                          {cell.fitting === 'scale' && (
                            <g className="sm-fit-scale">
                              <path d="M -26 -4 H 26" />
                              <path d="M 0 -4 V 16" />
                              <circle cx="-26" cy="-4" r="6" />
                              <circle cx="26" cy="-4" r="6" />
                              <text y="30">{`≤${cell.thr}`}</text>
                            </g>
                          )}
                          {cell.fitting === 'prism' && (
                            <g className="sm-fit-prism">
                              <path d="M 0 -22 L 22 14 L -22 14 Z" />
                              {TEMPERS.map((temper, index) => (
                                <circle key={temper.id} cx={-18 + index * 18} cy="26" r="4.5" fill={temper.color} />
                              ))}
                            </g>
                          )}
                          {cell.fitting === 'sump' && (
                            <path className="sm-fit-sump" d="M -24 -14 Q -24 20 0 20 Q 24 20 24 -14" />
                          )}
                          {cell.fitting === 'kiln' && (
                            <g className="sm-fit-kiln">
                              <circle r="19" />
                              <path d="M 0 -26 V -13 M 0 13 V 26 M -26 0 H -13 M 13 0 H 26" />
                            </g>
                          )}
                          {cell.fitting === 'shear' && (
                            <path className="sm-fit-shear" d="M 0 -24 V -4 M 0 -4 L -22 22 M 0 -4 L 22 22" />
                          )}
                        </g>
                      )}

                      {cell.stamps > 0 && !cell.silt && (
                        <g className="sm-stamps" transform={`translate(7 ${CELL - 9})`}>
                          {Array.from({ length: Math.min(3, cell.stamps) }, (_, mark) => (
                            <path key={mark} d={`M ${mark * 7} 0 v -11`} />
                          ))}
                        </g>
                      )}
                      {cell.fused && <path className="sm-fuse-mark" d={`M ${CELL - 20} 10 l 8 7 -4 8 11 -5`} />}
                    </g>
                  )
                }))}
              </g>

              {/* weir paddles */}
              <g className="sm-weir">
                <rect className="sm-weir-bed" x={GX - 12} y={WEIR_Y - 4} width={LATTICE_W + 24} height={WEIR_H + 8} rx="8" />
                <path className="sm-gutter" d={`M ${GX - 12} ${WEIR_Y + WEIR_H / 2} H ${GX - 54}`} />
                <path className="sm-gutter" d={`M ${GX + LATTICE_W + 12} ${WEIR_Y + WEIR_H / 2} H ${GX + LATTICE_W + 54}`} />
                <text className="sm-gutter-label" x={GX - 56} y={WEIR_Y + WEIR_H / 2 + 20} textAnchor="end">spill</text>
                <text className="sm-gutter-label" x={GX + LATTICE_W + 56} y={WEIR_Y + WEIR_H / 2 + 20}>spill</text>

                {world.paddles.map((lean, band) => {
                  const x = paddleX(band)
                  const heat = hud.paddleHeat[band] || 0
                  return (
                    <g
                      key={band}
                      className={`sm-paddle ${lean < 0 ? 'leans-left' : 'leans-right'} ${heat > 0.1 ? 'is-hot' : ''}`}
                      transform={`translate(${x + BAY_W / 2} ${WEIR_Y + WEIR_H / 2})`}
                      role="button"
                      tabIndex={live ? 0 : -1}
                      aria-label={`Weir paddle ${band + 1}, leaning ${lean < 0 ? 'left' : 'right'}. Activate to flip it and kick whatever is passing. Keyboard ${band + 1}.`}
                      onClick={(event) => { event.stopPropagation(); swingPaddle(band) }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          swingPaddle(band)
                        }
                      }}
                    >
                      <rect className="sm-paddle-hit" x={-BAY_W / 2 + 4} y={-WEIR_H / 2} width={BAY_W - 8} height={WEIR_H} rx="6" />
                      {/* 18° on a shortened arm keeps the swing inside the weir band */}
                      <g className="sm-paddle-arm" transform={`rotate(${lean * 18})`}>
                        <rect x={-BAY_W / 2 + 28} y="-6" width={BAY_W - 56} height="12" rx="6" />
                        <circle cx={lean < 0 ? -BAY_W / 2 + 32 : BAY_W / 2 - 32} cy="0" r="8" />
                      </g>
                      <circle className="sm-paddle-pin" r="5" />
                      <text className="sm-paddle-key" y="-20">{band + 1}</text>
                    </g>
                  )
                })}
              </g>

              {/* bays */}
              <g className="sm-bays">
                {[0, 1, 2].map(index => {
                  const bay = world.bays[index]
                  const x = bayX(index)
                  const temper = bay ? temperById(bay.temper) : null
                  const fillHeight = bay ? Math.min(BAY_H - 44, (bay.fill / 60) * (BAY_H - 44)) : 0
                  const isDragSource = writDrag === index
                  return (
                    <g
                      key={index}
                      className={`sm-bay ${bay ? 'is-open' : 'is-boarded'} ${isDragSource ? 'is-lifted' : ''}`}
                      style={{ '--bay-color': temper?.color || '#57666a' }}
                    >
                      <rect className="sm-bay-shell" x={x + 4} y={BAY_Y} width={BAY_W - 8} height={BAY_H} rx="8" />
                      {bay && (
                        <>
                          <rect
                            className="sm-bay-fill"
                            x={x + 10}
                            y={BAY_Y + BAY_H - 8 - fillHeight}
                            width={BAY_W - 20}
                            height={fillHeight}
                            rx="4"
                          />
                          <g
                            className={`sm-writ ${writDrag != null ? 'is-swapping' : ''}`}
                            transform={`translate(${x + BAY_W / 2} ${BAY_Y + 34})`}
                            role="button"
                            tabIndex={editable ? 0 : -1}
                            aria-label={`${['Left', 'Middle', 'Right'][index]} bay writ: accepts ${describeWrit(bay)}. Activate to lift the writ, then activate another bay to swap them.`}
                            onClick={(event) => {
                              event.stopPropagation()
                              if (suppressClickRef.current) return
                              if (writDrag == null) {
                                setWritDrag(index)
                                setMessage(`the ${['left', 'middle', 'right'][index]} writ is in hand // tap another bay to trade them`)
                                return
                              }
                              if (writDrag === index) {
                                setWritDrag(null)
                                setMessage('the writ was set back in its own bay')
                                return
                              }
                              swapWrits(writDrag, index)
                              setWritDrag(null)
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                event.stopPropagation()
                                if (writDrag == null) setWritDrag(index)
                                else {
                                  swapWrits(writDrag, index)
                                  setWritDrag(null)
                                }
                              }
                            }}
                          >
                            <rect className="sm-writ-hit" x={-BAY_W / 2 + 8} y="-26" width={BAY_W - 16} height="56" rx="8" />
                            <rect className="sm-writ-card" x={-BAY_W / 2 + 12} y="-22" width={BAY_W - 24} height="48" rx="6" />
                            <text className="sm-writ-glyph" x={-BAY_W / 2 + 26} y="8">{temper.mark}</text>
                            <text className="sm-writ-range" x={-BAY_W / 2 + 50} y="2">
                              {bay.min === bay.max ? `exactly ${bay.min}` : `${bay.min} – ${bay.max}`}
                            </text>
                            <text className="sm-writ-sub" x={-BAY_W / 2 + 50} y="17">{temper.label}</text>
                          </g>
                          <text className="sm-bay-fill-read" x={x + BAY_W / 2} y={BAY_Y + BAY_H - 14}>
                            {Math.round(bay.fill)} banked
                          </text>
                        </>
                      )}
                      {!bay && (
                        <g className="sm-boarding" transform={`translate(${x + BAY_W / 2} ${BAY_Y + BAY_H / 2})`}>
                          <path d={`M ${-BAY_W / 2 + 18} -22 H ${BAY_W / 2 - 18} M ${-BAY_W / 2 + 18} 4 H ${BAY_W / 2 - 18}`} />
                          <text y="38">boarded</text>
                        </g>
                      )}
                    </g>
                  )
                })}
                <rect className="sm-plinth" x="26" y={BAY_Y + BAY_H + 8} width={BOARD.w - 52} height="20" rx="6" />
              </g>
            </svg>

            <canvas className="sm-bodies" ref={canvasRef} aria-hidden="true" />

            {/* ----------------------------------------------------- overlays */}
            {!world.unlocked && (
              <div className="sm-seal">
                <div className="sm-seal-sluice" aria-hidden="true"><i /><i /><i /><b /><span>252</span></div>
                <p>DRY SLUICE / LIVING INTERFACE GENERATION 252</p>
                <h2>A bay does not catch what falls.<br />It refuses everything else.</h2>
                <button type="button" onClick={wake} data-playground-primary>open the cistern gate</button>
                <small>test on trial water • seat fittings • flip paddles • catch motes with the tongs</small>
              </div>
            )}

            {celebration && (
              <div className={`sm-celebration is-${celebration.kind}`} role="status">
                <span>{celebration.kind === 'standing' ? 'the last writ closed' : 'writ discharged'}</span>
                <strong>{celebration.label}</strong>
              </div>
            )}

            {standing && !celebration && (
              <div className="sm-outcome is-standing">
                <span>mastery / three writs / {fusedCount} fused cells / {world.lifetime.rewrites} rewrites survived</span>
                <h2>THE HOUSE KEEPS ITS OWN WRITS</h2>
                <p>
                  {world.decree ? DECREES[world.decree].note : 'No decree was set, so the house keeps the last gate you left it.'}
                  {' '}All three tempers fall now and nothing is graded. The lattice you wore into the stone is the only reason the floor stays dry while you watch.
                </p>
                <div><button type="button" onClick={reset}>re-dig the house</button></div>
              </div>
            )}

            {flooded && (
              <div className="sm-outcome is-flooded">
                <span>failure / four leaks across the sluice floor</span>
                <h2>THE SLUICE IS UNDER WATER</h2>
                <p>
                  The cistern is still full and the lattice still has opinions, but nothing it sorts can be trusted.
                  Lift the last arrangement and shut the gate before you re-seat anything.
                </p>
                <div>
                  <button type="button" onClick={lift} disabled={history.length === 0}>lift last arrangement</button>
                  <button type="button" onClick={reset}>re-dig the house</button>
                </div>
              </div>
            )}
          </div>

          {/* thumb row: the touch twin of keys 1 2 3 */}
          <div className="sm-thumbs" aria-label="weir paddle controls">
            {world.paddles.map((lean, band) => (
              <button
                type="button"
                key={band}
                className={`sm-thumb ${lean < 0 ? 'leans-left' : 'leans-right'}`}
                onClick={() => swingPaddle(band)}
                disabled={!live || hud.hand < PADDLE_COST}
                data-playground-action="swing-paddle"
                aria-label={`Swing weir paddle ${band + 1}, currently leaning ${lean < 0 ? 'left' : 'right'}`}
              >
                <i>{lean < 0 ? '◀' : '▶'}</i>
                <span>paddle {band + 1}</span>
                <small>{band + 1}</small>
              </button>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------- ledger */}
        <aside className="sm-ledger" aria-label="writ docket and hand pump">
          <section className="sm-docket">
            <span>{writ.label}</span>
            <h2>{writ.title}</h2>
            <p>{writ.instruction}</p>
            <ul>
              {writ.demands.map(demand => {
                const met = demand.test(stats)
                return (
                  <li key={demand.code} className={met ? 'is-met' : ''}>
                    <i aria-hidden="true">{met ? '●' : '○'}</i>
                    <span>{demand.text}</span>
                    <b>{demand.read(stats)}</b>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="sm-pump" aria-label="hand pump">
            <div className="sm-pump-head">
              <span>hand</span>
              <strong className={hud.hand <= 1 ? 'is-alarm' : ''}>{hud.hand}/{HAND_MAX}</strong>
            </div>
            <div className="sm-pump-bank" aria-hidden="true">
              {Array.from({ length: HAND_MAX }, (_, index) => (
                <i key={index} className={hud.hand > index ? 'is-charged' : ''} />
              ))}
            </div>
            <p className="sm-pump-note">
              tongs {TONGS_COST} · paddle {PADDLE_COST} · dredge {DREDGE_COST} · one returns every {(HAND_REFILL_MS / 1000).toFixed(1)}s
            </p>
            <div className="sm-gate-row">
              <button
                type="button"
                onClick={() => setHead(world.head - 1)}
                disabled={!live}
                data-playground-action="shut-gate"
                aria-label={world.head === 1
                  ? 'Shut the cistern gate and bail the floor, clearing this run\'s leaks and tithes'
                  : 'Close the cistern gate one notch'}
              >
                ▾
              </button>
              <div className="sm-gate-read">
                <strong>gate {world.head}</strong>
                <small>{world.head === 0 ? 'shut · floor dry' : `${(HEAD_CADENCE[world.head] / 1000).toFixed(2)}s / mote · ▾ bails`}</small>
              </div>
              <button
                type="button"
                onClick={() => setHead(world.head + 1)}
                disabled={!live}
                data-playground-action="raise-head"
                aria-label="Open the cistern gate one notch"
              >
                ▴
              </button>
            </div>
            <div className="sm-vitals">
              <i><span>aloft</span><b>{hud.motes}</b></i>
              <i className={hud.orphans ? 'is-alarm' : ''}><span>unhoused</span><b>{hud.orphans}</b></i>
              <i><span>dry for</span><b>{Math.floor(hud.cleanFor)}s</b></i>
              <i className={siltCount >= 4 ? 'is-alarm' : ''}><span>silted</span><b>{siltCount}</b></i>
            </div>
            <div className="sm-leak-rail" aria-label={`${world.leaks} of ${MAX_LEAKS} leaks this writ`}>
              <span>leaks</span>
              {Array.from({ length: MAX_LEAKS }, (_, index) => (
                <i key={index} className={world.leaks > index ? 'is-wet' : ''} />
              ))}
            </div>
          </section>

          <section className="sm-cellar" aria-label="house cellar">
            <div className="sm-ledger-heading">
              <span>cellar</span>
              <strong>{world.lifetime.tithes} lifetime tithes</strong>
            </div>
            <div className="sm-cellar-rows">
              {TEMPERS.map(temper => (
                <i key={temper.id} style={{ '--temper-color': temper.color }}>
                  <span>{temper.mark} {temper.label}</span>
                  <b>{round1(world.banked[temper.id] || 0)}</b>
                </i>
              ))}
              <i><span>⌁ fused cells</span><b>{fusedCount}</b></i>
            </div>
          </section>

          {world.writ >= WRITS.length - 1 && !flooded && (
            <section className="sm-decrees" aria-label="standing decree">
              <div className="sm-ledger-heading">
                <span>standing decree</span>
                <strong>{world.decree ? DECREES[world.decree].mark : 'choose one'}</strong>
              </div>
              <div>
                {Object.values(DECREES).map(option => (
                  <button
                    type="button"
                    key={option.id}
                    className={world.decree === option.id ? 'is-chosen' : ''}
                    style={{ '--decree-color': option.color }}
                    onClick={() => chooseDecree(option.id)}
                    aria-pressed={world.decree === option.id}
                    data-playground-action="choose-decree"
                  >
                    <i>{option.mark}</i><span>{option.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <ol className="sm-chronicle" aria-label="house memory">
            {world.log.slice(-3).reverse().map((entry, index) => (
              <li key={entry.id} style={{ opacity: 1 - index * 0.26 }}>
                <span>{String(entry.writ).padStart(2, '0')}</span>{entry.text}
              </li>
            ))}
          </ol>

          <div className="sm-ledger-foot">
            <button
              type="button"
              onClick={() => {
                setSoundOn(current => !current)
                setMessage(soundOn ? 'the house returns to the sound of falling water' : 'every clack, tithe and leak will now sound at its own pitch')
              }}
              aria-pressed={soundOn}
            >
              {soundOn ? 'tone on' : 'tone off'}
            </button>
            <button type="button" onClick={lift} disabled={history.length === 0}>lift</button>
            <button type="button" onClick={reset}>re-dig</button>
            <small>{formatAge(savedAt)}</small>
          </div>

          <p className="sm-keys">
            drag fittings into cells • press a falling mote to catch it • keys: 1 2 3 paddles, ↑↓ gate, F fitting, X pry, Space shut the gate and bail the floor
          </p>
        </aside>

        {drag?.kind === 'fitting' && drag.moved && (
          <div
            className={`sm-drag-chip ${drag.targetKey ? 'is-targeting' : ''}`}
            style={{ left: drag.clientX, top: drag.clientY, '--tool-color': FITTINGS[drag.id].color }}
            aria-hidden="true"
          >
            <i>{FITTINGS[drag.id].mark}</i>
            <span>{drag.targetKey ? `seat at ${drag.targetKey.replace(':', '/')}` : `carry the ${FITTINGS[drag.id].short}`}</span>
          </div>
        )}
      </main>
    </div>
  )
}

export { freshWorld, accepts, describeWrit, WRITS, FITTINGS, TEMPERS }
export default SluiceMagistrate
