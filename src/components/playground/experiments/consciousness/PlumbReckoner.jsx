import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react'
import ExperimentNav from '../../ExperimentNav'
import './PlumbReckoner.css'

const STORAGE_KEY = 'clawed:plumb-reckoner:v1'
const DEG = Math.PI / 180
const MAX_TILT = 25
const TILT_PER_TORQUE = 1.7
const SHEAR_TORQUE = 16
const SHEAR_MS = 3200
const SETTLE_MS = 1700
const CREEP_MS = 5600
const STILL_MS = 4200
const STILL_COOLDOWN_MS = 9000
const GRIP_WEAR = 2
const MAX_SHEARS = 4
const DRAG_THRESHOLD = 6

const LANDSCAPE = { width: 1020, height: 700, ceilingX: 510, ceilingY: 74, rootCord: 104, cord: 116, spacing: 30 }
const PORTRAIT = { width: 660, height: 1010, ceilingX: 330, ceilingY: 70, rootCord: 108, cord: 126, spacing: 25 }

const BEAMS = {
  crown: { id: 'crown', label: 'crown beam', short: 'crown', mark: 'I', span: 5, mass: 2, unlockedAt: 0, note: 'the first arm; everything else must hang beneath its verdict' },
  ribs: { id: 'ribs', label: 'rib beam', short: 'ribs', mark: 'II', span: 4, mass: 2, unlockedAt: 1, note: 'a wide arm that can carry the heaviest arguments' },
  throat: { id: 'throat', label: 'throat beam', short: 'throat', mark: 'III', span: 3, mass: 2, unlockedAt: 1, note: 'a short arm; small distances, sharp consequences' },
  tail: { id: 'tail', label: 'tail beam', short: 'tail', mark: 'IV', span: 3, mass: 2, unlockedAt: 2, note: 'the last arm, for what the reckoning could not place' }
}

const WEIGHTS = {
  hunger: { id: 'hunger', label: 'hunger', mass: 4, mark: '◆', color: '#dd7038', unlockedAt: 0, note: 'pulls hard and never explains itself', tone: 174.61 },
  memory: { id: 'memory', label: 'memory', mass: 3, mark: '§', color: '#6f9ec4', unlockedAt: 0, note: 'heavy in proportion to what it refuses to drop', tone: 220 },
  signal: { id: 'signal', label: 'signal', mass: 2, mark: '≋', color: '#8fb457', unlockedAt: 0, note: 'light, but it changes the meaning of its neighbours', tone: 261.63 },
  silence: { id: 'silence', label: 'silence', mass: 6, mark: '●', color: '#9a86c6', unlockedAt: 1, note: 'the densest thing on the rack', tone: 146.83 },
  witness: { id: 'witness', label: 'witness', mass: 1, mark: '◇', color: '#e0bb52', unlockedAt: 1, note: 'weighs almost nothing and decides almost everything', tone: 329.63 },
  ember: { id: 'ember', label: 'ember', mass: 5, mark: '✦', color: '#cf5049', unlockedAt: 2, note: 'wants the far notch; the far notch is where arms break', tone: 196 },
  tide: { id: 'tide', label: 'tide', mass: 2, mark: '↯', color: '#4fa8a1', unlockedAt: 2, note: 'arrives on a schedule you did not author', tone: 392 }
}

const STAGES = [
  {
    label: 'plumb I / the first nothing',
    title: 'Make three convictions weigh the same nothing.',
    instruction: 'Hang hunger, memory and signal from the crown beam until its lean reads zero, then hold it still.',
    beamsSet: 1,
    minHung: 3,
    success: 'the crown held zero // its occupied notches wore a groove that will grip next time'
  },
  {
    label: 'plumb II / the hanging branch',
    title: 'Give the reckoning a second arm and keep both true.',
    instruction: 'Graft a beam onto a free crown notch. A whole sub-mobile hangs there as one mass — balance it, then rebalance the crown around it.',
    beamsSet: 2,
    minHung: 4,
    graft: 1,
    success: 'two arms held zero at once // a branch of the argument became load-bearing'
  },
  {
    label: 'plumb III / the standing verdict',
    title: 'Three arms, one reckoning, nothing heavy sharing an arm.',
    instruction: 'Set three beams at once, seat at least one weight in a worn notch, and keep hunger and silence on separate arms.',
    beamsSet: 3,
    minHung: 5,
    graft: 2,
    grip: true,
    separate: ['hunger', 'silence'],
    success: 'three arms held zero together // the reckoning can now stand without a hand on it'
  }
]

const READ_HIGH = ['keeps the high air', 'rides above the argument', 'is held nearest the ceiling']
const READ_LOW = ['hangs nearest the floor', 'has been argued downward', 'carries the lowest air']

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const notchKey = (beamId, notch) => `${beamId}:${notch}`
const formatLean = (torque) => `${torque > 0 ? '+' : torque < 0 ? '−' : '±'}${Math.abs(torque)}`

const formatAge = (timestamp) => {
  if (!timestamp) return 'unremembered'
  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s held`
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes}m held` : `${Math.round(minutes / 60)}h held`
}

const freshWorld = () => ({
  version: 1,
  unlocked: false,
  grafts: {},
  hangs: {},
  wear: {},
  settled: {},
  scars: {},
  stage: 0,
  status: 'reckoning',
  shears: 0,
  records: [],
  log: [{ id: 'sealed', stage: 0, text: 'one arm hangs empty; every conviction is still lying on the rack' }],
  lastSaved: null
})

const snapshot = (world) => ({
  grafts: { ...world.grafts },
  hangs: Object.fromEntries(Object.entries(world.hangs).map(([id, hang]) => [id, { ...hang }])),
  wear: { ...world.wear },
  settled: { ...world.settled },
  scars: { ...world.scars },
  stage: world.stage,
  status: world.status,
  shears: world.shears,
  log: world.log.map(entry => ({ ...entry }))
})

const loadWorld = () => {
  const fresh = freshWorld()
  if (typeof window === 'undefined') return fresh
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (!saved || saved.version !== 1) return fresh
    const grafts = Object.fromEntries(
      Object.entries(saved.grafts || {}).filter(([id, graft]) => BEAMS[id] && id !== 'crown' && BEAMS[graft?.parent])
    )
    const hangs = Object.fromEntries(
      Object.entries(saved.hangs || {}).filter(([id, hang]) => WEIGHTS[id] && BEAMS[hang?.beam] && Number.isInteger(hang?.notch))
    )
    return {
      ...fresh,
      ...saved,
      grafts,
      hangs,
      wear: saved.wear && typeof saved.wear === 'object' ? saved.wear : {},
      settled: saved.settled && typeof saved.settled === 'object' ? saved.settled : {},
      scars: saved.scars && typeof saved.scars === 'object' ? saved.scars : {},
      records: Array.isArray(saved.records) ? saved.records.slice(-6) : [],
      log: Array.isArray(saved.log) ? saved.log.slice(-8) : fresh.log
    }
  } catch {
    return fresh
  }
}

/** Pure topology + integer statics. The machine reasons in whole notches; only the body sways in real numbers. */
const deriveMobile = (world, metrics) => {
  const parentOf = { crown: null }
  const notchOf = { crown: 0 }
  Object.entries(world.grafts).forEach(([id, graft]) => {
    if (!BEAMS[id] || id === 'crown') return
    parentOf[id] = graft.parent
    notchOf[id] = graft.notch
  })

  const order = []
  const walk = (id, depth, guard) => {
    if (order.some(beam => beam.id === id) || guard > 6) return
    order.push({ id, depth })
    Object.keys(parentOf).forEach(childId => {
      if (parentOf[childId] === id) walk(childId, depth + 1, guard + 1)
    })
  }
  walk('crown', 0, 0)

  const occupants = {}
  order.forEach(({ id }) => {
    occupants[id] = []
  })
  Object.entries(world.hangs).forEach(([weightId, hang]) => {
    if (occupants[hang.beam]) occupants[hang.beam].push({ kind: 'weight', id: weightId, notch: hang.notch, mass: WEIGHTS[weightId].mass })
  })

  const childMass = {}
  const beams = {}

  for (let index = order.length - 1; index >= 0; index -= 1) {
    const { id, depth } = order[index]
    const blueprint = BEAMS[id]
    const hung = occupants[id]
    const children = order
      .filter(entry => parentOf[entry.id] === id)
      .map(entry => ({ kind: 'beam', id: entry.id, notch: notchOf[entry.id], mass: childMass[entry.id] }))
    const subtreeMass = blueprint.mass
      + hung.reduce((sum, item) => sum + item.mass, 0)
      + children.reduce((sum, item) => sum + item.mass, 0)
    childMass[id] = subtreeMass
    const torque = [...hung, ...children].reduce((sum, item) => sum + item.mass * item.notch, 0)
    beams[id] = {
      ...blueprint,
      depth,
      parent: parentOf[id],
      notch: notchOf[id],
      hung,
      children,
      subtreeMass,
      torque,
      loaded: hung.length + children.length > 0,
      occupied: new Set([...hung, ...children].map(item => item.notch))
    }
  }

  // Idealised (unswayed) coordinates: stable enough to read a verdict from.
  order.forEach(({ id }) => {
    const beam = beams[id]
    if (!beam.parent) {
      beam.idealX = metrics.ceilingX
      beam.idealY = metrics.ceilingY + metrics.rootCord
      return
    }
    const parent = beams[beam.parent]
    beam.idealX = parent.idealX + beam.notch * metrics.spacing
    beam.idealY = parent.idealY + metrics.cord
  })

  const list = order.map(({ id }) => beams[id])
  return { beams, list, ids: order.map(entry => entry.id) }
}

const composeReading = (mobile, world) => {
  const hung = Object.entries(world.hangs)
    .filter(([, hang]) => mobile.beams[hang.beam])
    .map(([id, hang]) => {
      const beam = mobile.beams[hang.beam]
      return {
        ...WEIGHTS[id],
        beam: hang.beam,
        notch: hang.notch,
        x: beam.idealX + hang.notch * 30,
        y: beam.idealY
      }
    })

  if (hung.length === 0) {
    return { headline: 'the reckoning is empty', body: 'nothing has been argued yet // the crown hangs true because it hangs alone' }
  }

  const sorted = [...hung].sort((left, right) => left.y - right.y || left.x - right.x)
  const high = sorted[0]
  const low = sorted.at(-1)
  const lean = mobile.beams.crown.torque
  const pivot = mobile.list.reduce((best, beam) => Math.abs(beam.torque) > Math.abs(best.torque) ? beam : best, mobile.list[0])
  const wornKey = Object.entries(world.wear).sort((left, right) => right[1] - left[1])[0]
  const seed = hung.length + Math.abs(lean)

  const headline = high.id === low.id
    ? `${high.label} hangs alone and therefore hangs true`
    : `${high.label} ${READ_HIGH[seed % READ_HIGH.length]}; ${low.label} ${READ_LOW[seed % READ_LOW.length]}`

  const leanClause = lean === 0
    ? 'the crown asks for nothing further'
    : `the crown leans ${lean > 0 ? 'right' : 'left'} by ${Math.abs(lean)}`
  const strainClause = Math.abs(pivot.torque) > 0 && pivot.id !== 'crown'
    ? ` // ${pivot.short} is the argument under strain`
    : ''
  const wornClause = wornKey && wornKey[1] >= GRIP_WEAR
    ? ` // the groove at ${wornKey[0].replace(':', ' notch ')} has been trusted ${wornKey[1]} times and now grips`
    : ''

  return { headline, body: `${leanClause}${strainClause}${wornClause}` }
}

const freeNotch = (beam, preferred = 0) => {
  for (let step = 0; step <= beam.span * 2; step += 1) {
    for (const direction of step === 0 ? [0] : [-1, 1]) {
      const candidate = clamp(preferred + direction * Math.ceil(step / 2), -beam.span, beam.span)
      if (!beam.occupied.has(candidate)) return candidate
    }
  }
  return null
}

const inspectMobile = (world, mobile, validation) => {
  if (!validation.enoughHung) {
    const next = Object.values(WEIGHTS).find(weight => weight.unlockedAt <= world.stage && !world.hangs[weight.id])
    return {
      kind: 'hang',
      weightId: next?.id,
      title: `${validation.stage.minHung - validation.hungCount} more conviction${validation.stage.minHung - validation.hungCount === 1 ? '' : 's'} must hang`,
      detail: next
        ? `Drag ${next.label} (mass ${next.mass}) from the rack onto any notch, or tap it and then tap a notch.`
        : 'Return a weight from the silt tray to the arms.',
      action: next ? `hang ${next.label}` : 'return a weight'
    }
  }
  if (!validation.enoughGrafts) {
    const blank = Object.values(BEAMS).find(beam => beam.id !== 'crown' && beam.unlockedAt <= world.stage && !world.grafts[beam.id])
    return {
      kind: 'graft',
      beamId: blank?.id,
      title: `${validation.stage.graft - validation.graftCount} more arm${validation.stage.graft - validation.graftCount === 1 ? '' : 's'} must be grafted`,
      detail: blank
        ? `Drag ${blank.label} from the rack onto a free notch. Its whole subtree will then hang there as a single mass.`
        : 'No arm remains on the rack; lift one from the mobile and regraft it.',
      action: blank ? `graft ${blank.short}` : 'free an arm'
    }
  }

  const unbalanced = mobile.list.filter(beam => beam.torque !== 0 && beam.loaded)
  if (unbalanced.length) {
    const beam = unbalanced.reduce((worst, candidate) => Math.abs(candidate.torque) > Math.abs(worst.torque) ? candidate : worst, unbalanced[0])
    let best = null
    beam.hung.forEach(item => {
      ;[-1, 1].forEach(direction => {
        const notch = item.notch + direction
        if (Math.abs(notch) > beam.span || beam.occupied.has(notch)) return
        const after = Math.abs(beam.torque + item.mass * direction)
        if (after < Math.abs(beam.torque) && (!best || after < best.after)) {
          best = { weightId: item.id, from: item.notch, notch, after, direction }
        }
      })
    })
    if (best) {
      const toward = Math.abs(best.notch) < Math.abs(best.from) ? 'toward the fulcrum' : 'outward'
      return {
        kind: 'shift',
        beamId: beam.id,
        weightId: best.weightId,
        notch: best.notch,
        title: `${beam.short} leans ${formatLean(beam.torque)}`,
        detail: `Slide ${WEIGHTS[best.weightId].label} one notch ${toward}. That alone takes the lean to ${formatLean(beam.torque + WEIGHTS[best.weightId].mass * best.direction)} — it will not finish the arm for you.`,
        action: `shift ${WEIGHTS[best.weightId].label} ${toward}`
      }
    }
    return {
      kind: 'shift',
      beamId: beam.id,
      title: `${beam.short} leans ${formatLean(beam.torque)} and cannot be nudged out of it`,
      detail: 'No single notch on this arm improves the lean. Move a different mass onto it, or lift one off entirely.',
      action: 'lift a weight from this arm'
    }
  }

  if (validation.stage.grip && !validation.gripHeld) {
    return {
      kind: 'grip',
      title: 'no weight sits in a worn notch',
      detail: `Grooves reach grip at ${GRIP_WEAR} wearings. Re-use a notch this mobile has already set into, and that weight will stop creeping.`,
      action: 'seat a weight in an old groove'
    }
  }
  if (validation.stage.separate && !validation.separated) {
    const [left, right] = validation.stage.separate
    return {
      kind: 'separate',
      weightId: right,
      title: `${WEIGHTS[left].label} and ${WEIGHTS[right].label} share one arm`,
      detail: 'The two densest arguments cannot hang from the same beam. Move one of them to another arm and rebalance both.',
      action: `move ${WEIGHTS[right].label} to another arm`
    }
  }
  if (!validation.allSet) {
    return {
      kind: 'hold',
      title: `${validation.setCount} of ${validation.stage.beamsSet} arms are holding`,
      detail: 'Every required arm reads zero. Keep your hands off them until each groove finishes wearing in.',
      action: 'let the air still'
    }
  }
  return {
    kind: 'ready',
    title: 'the reckoning is standing on its own',
    detail: 'Nothing here needs a hand. The grooves are wearing in and the verdict below is the one the mobile will keep.',
    action: 'standing'
  }
}

const validateWorld = (world, mobile) => {
  const stage = STAGES[Math.min(world.stage, STAGES.length - 1)]
  const hungCount = Object.keys(world.hangs).filter(id => mobile.beams[world.hangs[id].beam]).length
  const graftCount = Object.keys(world.grafts).filter(id => mobile.beams[id]).length
  const setIds = mobile.list.filter(beam => world.settled[beam.id]).map(beam => beam.id)
  const gripHeld = Object.entries(world.hangs).some(([, hang]) => (world.wear[notchKey(hang.beam, hang.notch)] || 0) >= GRIP_WEAR)
  const separated = !stage.separate || (() => {
    const [left, right] = stage.separate
    const leftHang = world.hangs[left]
    const rightHang = world.hangs[right]
    return Boolean(leftHang && rightHang && leftHang.beam !== rightHang.beam)
  })()
  const enoughHung = hungCount >= stage.minHung
  const enoughGrafts = graftCount >= (stage.graft || 0)
  const allSet = setIds.length >= stage.beamsSet
  return {
    stage,
    hungCount,
    graftCount,
    setCount: setIds.length,
    setIds,
    gripHeld,
    separated,
    enoughHung,
    enoughGrafts,
    allSet,
    complete: enoughHung && enoughGrafts && allSet && separated && (!stage.grip || gripHeld)
  }
}

const BeamGrain = ({ span, spacing, mark }) => {
  const half = span * spacing
  return (
    <g className="pr-beam-grain" aria-hidden="true">
      <path d={`M ${-half - 18} -3 H ${half + 18}`} />
      <path d={`M ${-half - 12} 4 H ${half + 12}`} />
      <text className="pr-beam-mark" x={-half - 30} y="5">{mark}</text>
    </g>
  )
}

const PlumbReckoner = ({ category, experiment }) => {
  const [world, setWorld] = useState(loadWorld)
  const [portrait, setPortrait] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [armedWeightId, setArmedWeightId] = useState(null)
  const [armedBeamId, setArmedBeamId] = useState(null)
  const [selectedWeightId, setSelectedWeightId] = useState('hunger')
  const [drag, setDrag] = useState(null)
  const [hoverNotch, setHoverNotch] = useState(null)
  const [still, setStill] = useState({ until: 0, ready: 0 })
  const [flash, setFlash] = useState(null)
  const [savedAt, setSavedAt] = useState(() => world.lastSaved)
  const [soundOn, setSoundOn] = useState(false)
  const [history, setHistory] = useState([])
  const [message, setMessage] = useState(() => world.unlocked
    ? `plumb ${world.stage + 1} resumed // ${Object.values(world.wear).filter(count => count >= GRIP_WEAR).length} grooves already grip`
    : 'a brass arm hangs from the ceiling, empty and perfectly honest')

  const surfaceRef = useRef(null)
  const svgRef = useRef(null)
  const worldRef = useRef(world)
  const mobileRef = useRef(null)
  const metricsRef = useRef(LANDSCAPE)
  const runtimeRef = useRef({})
  const layoutRef = useRef({})
  const beamNodes = useRef(new Map())
  const cordNodes = useRef(new Map())
  const pendantNodes = useRef(new Map())
  const dragRef = useRef(null)
  const tickRef = useRef(() => {})
  const creepRef = useRef(0)
  const stillRef = useRef(still)
  const soundRef = useRef(false)
  const audioRef = useRef(null)
  const saveTimerRef = useRef(null)
  const flashTimerRef = useRef(null)
  const suppressClickRef = useRef(false)

  const metrics = portrait ? PORTRAIT : LANDSCAPE
  const mobile = useMemo(() => deriveMobile(world, metrics), [metrics, world])
  const validation = useMemo(() => validateWorld(world, mobile), [mobile, world])
  const guidance = useMemo(() => inspectMobile(world, mobile, validation), [mobile, validation, world])
  const reading = useMemo(() => composeReading(mobile, world), [mobile, world])

  const editable = world.unlocked && world.status === 'reckoning'
  const trayWeights = useMemo(
    () => Object.values(WEIGHTS).filter(weight => weight.unlockedAt <= world.stage || world.status === 'standing'),
    [world.stage, world.status]
  )
  const rackBeams = useMemo(
    () => Object.values(BEAMS).filter(beam => beam.id !== 'crown' && (beam.unlockedAt <= world.stage || world.status === 'standing')),
    [world.stage, world.status]
  )

  useEffect(() => { worldRef.current = world }, [world])
  useEffect(() => { mobileRef.current = mobile }, [mobile])
  useEffect(() => { metricsRef.current = metrics }, [metrics])
  useEffect(() => { stillRef.current = still }, [still])
  useEffect(() => { soundRef.current = soundOn }, [soundOn])

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const narrow = window.matchMedia('(max-width: 860px)')
    const syncMotion = () => setReducedMotion(motion.matches)
    const syncWidth = () => setPortrait(narrow.matches)
    syncMotion()
    syncWidth()
    motion.addEventListener?.('change', syncMotion)
    narrow.addEventListener?.('change', syncWidth)
    return () => {
      motion.removeEventListener?.('change', syncMotion)
      narrow.removeEventListener?.('change', syncWidth)
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
        // The mobile still hangs when local memory refuses to keep it.
      }
    }, 200)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [world])

  useEffect(() => () => {
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current)
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    audioRef.current?.close?.()
  }, [])

  const chime = useCallback((frequency, kind = 'set') => {
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
      oscillator.type = kind === 'shear' ? 'sawtooth' : kind === 'creep' ? 'triangle' : 'sine'
      oscillator.frequency.setValueAtTime(frequency, start)
      if (kind === 'shear') oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.42, start + 0.5)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(kind === 'creep' ? 0.02 : 0.06, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + (kind === 'set' ? 1.1 : 0.5))
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + 1.2)
    } catch {
      // Sound is a voluntary shadow of the brass.
    }
  }, [])

  const raise = useCallback((tone, text) => {
    setFlash({ tone, text, id: Date.now() })
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current)
    flashTimerRef.current = window.setTimeout(() => setFlash(null), 2600)
  }, [])

  const remember = useCallback(() => {
    setHistory(previous => [...previous, snapshot(worldRef.current)].slice(-12))
  }, [])

  /* ---------------------------------------------------------------- physics */

  const syncRuntime = useCallback(() => {
    const runtime = runtimeRef.current
    const ids = mobileRef.current?.ids || ['crown']
    ids.forEach((id, index) => {
      if (!runtime[id]) runtime[id] = { angle: 0, vel: 0, poised: 0, strain: 0, phase: index * 1.9 }
    })
    Object.keys(runtime).forEach(id => {
      if (!ids.includes(id)) delete runtime[id]
    })
  }, [])

  useEffect(() => {
    syncRuntime()
  }, [mobile, syncRuntime])

  const writeLayout = useCallback(() => {
    const current = mobileRef.current
    const runtime = runtimeRef.current
    const config = metricsRef.current
    if (!current) return
    const layout = {}

    current.list.forEach(beam => {
      const state = runtime[beam.id] || { angle: 0, vel: 0 }
      let originX
      let originY
      let cordX
      let cordY
      if (!beam.parent) {
        originX = config.ceilingX
        originY = config.ceilingY + config.rootCord
        cordX = config.ceilingX
        cordY = config.ceilingY
      } else {
        const parent = layout[beam.parent]
        if (!parent) return
        const radians = parent.angle * DEG
        cordX = parent.x + Math.cos(radians) * beam.notch * config.spacing
        cordY = parent.y + Math.sin(radians) * beam.notch * config.spacing
        originX = cordX
        originY = cordY + config.cord
      }
      layout[beam.id] = { x: originX, y: originY, angle: state.angle, span: beam.span }

      const node = beamNodes.current.get(beam.id)
      if (node) node.setAttribute('transform', `translate(${originX.toFixed(2)} ${originY.toFixed(2)}) rotate(${state.angle.toFixed(3)})`)
      const cord = cordNodes.current.get(beam.id)
      if (cord) {
        cord.setAttribute('x1', cordX.toFixed(2))
        cord.setAttribute('y1', cordY.toFixed(2))
        cord.setAttribute('x2', originX.toFixed(2))
        cord.setAttribute('y2', originY.toFixed(2))
      }

      beam.hung.forEach(item => {
        const pendant = pendantNodes.current.get(item.id)
        if (!pendant) return
        const swing = clamp(-state.vel * 0.05, -11, 11)
        pendant.setAttribute('transform', `rotate(${(-state.angle + swing).toFixed(3)})`)
      })
    })

    layoutRef.current = layout
  }, [])

  const settleBeam = useCallback((beamId) => {
    const current = worldRef.current
    if (current.settled[beamId]) return
    const beam = mobileRef.current?.beams[beamId]
    if (!beam) return
    setWorld(previous => {
      const wear = { ...previous.wear }
      beam.hung.forEach(item => {
        const key = notchKey(beamId, item.notch)
        wear[key] = (wear[key] || 0) + 1
      })
      return {
        ...previous,
        wear,
        settled: { ...previous.settled, [beamId]: true },
        log: [...previous.log, { id: `set-${beamId}-${Date.now()}`, stage: previous.stage, text: `${BEAMS[beamId].label} held zero // ${beam.hung.length} groove${beam.hung.length === 1 ? '' : 's'} wore deeper` }].slice(-8)
      }
    })
    raise('set', `${BEAMS[beamId].short} set // its grooves wore deeper and will grip`)
    chime(WEIGHTS[beam.hung[0]?.id]?.tone || 261.63, 'set')
  }, [chime, raise])

  const breakBeam = useCallback((beamId) => {
    setWorld(previous => {
      if (!previous.settled[beamId]) return previous
      const settled = { ...previous.settled }
      delete settled[beamId]
      return { ...previous, settled }
    })
  }, [])

  const shearBeam = useCallback((beamId) => {
    const current = worldRef.current
    if (current.status !== 'reckoning') return
    remember()
    setWorld(previous => {
      const shears = previous.shears + 1
      const hangs = Object.fromEntries(Object.entries(previous.hangs).filter(([, hang]) => hang.beam !== beamId))
      const grafts = Object.fromEntries(Object.entries(previous.grafts).filter(([id, graft]) => graft.parent !== beamId && id !== beamId))
      const settled = { ...previous.settled }
      delete settled[beamId]
      return {
        ...previous,
        shears,
        hangs,
        grafts: beamId === 'crown' ? {} : grafts,
        settled,
        status: shears >= MAX_SHEARS ? 'collapsed' : previous.status,
        scars: { ...previous.scars, [beamId]: (previous.scars[beamId] || 0) + 1 },
        log: [...previous.log, { id: `shear-${Date.now()}`, stage: previous.stage, text: `${BEAMS[beamId].label} sheared // everything it carried fell to the silt tray` }].slice(-8)
      }
    })
    raise('shear', `${BEAMS[beamId].short} sheared under a lean it was never going to survive`)
    chime(110, 'shear')
  }, [chime, raise, remember])

  const creep = useCallback(() => {
    const current = worldRef.current
    const currentMobile = mobileRef.current
    if (!current.unlocked || current.status !== 'reckoning' || !currentMobile) return
    const candidates = []
    currentMobile.list.forEach(beam => {
      if (beam.torque === 0 || current.settled[beam.id]) return
      const heavySide = Math.sign(beam.torque)
      beam.hung.forEach(item => {
        if (Math.sign(item.notch) !== heavySide || item.notch === 0) return
        if ((current.wear[notchKey(beam.id, item.notch)] || 0) >= GRIP_WEAR) return
        const target = item.notch + heavySide
        if (Math.abs(target) > beam.span || beam.occupied.has(target)) return
        candidates.push({ beamId: beam.id, weightId: item.id, from: item.notch, to: target })
      })
    })
    if (!candidates.length) return
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    setWorld(previous => ({
      ...previous,
      hangs: { ...previous.hangs, [pick.weightId]: { beam: pick.beamId, notch: pick.to } },
      log: [...previous.log, { id: `creep-${Date.now()}`, stage: previous.stage, text: `${WEIGHTS[pick.weightId].label} crept outward on ${BEAMS[pick.beamId].short} // an unworn notch cannot hold an unbalanced arm` }].slice(-8)
    }))
    raise('creep', `${WEIGHTS[pick.weightId].label} slipped a notch outward // worn grooves grip, fresh ones do not`)
    chime(WEIGHTS[pick.weightId].tone * 0.5, 'creep')
  }, [chime, raise])

  const tick = useCallback((dt, now) => {
    const current = worldRef.current
    const currentMobile = mobileRef.current
    const runtime = runtimeRef.current
    if (!currentMobile) return
    const stilled = now < stillRef.current.until
    const live = current.unlocked && current.status !== 'collapsed'

    currentMobile.list.forEach(beam => {
      const state = runtime[beam.id]
      if (!state) return
      const breeze = reducedMotion || stilled ? 0 : Math.sin(now * 0.00052 + state.phase) * 0.85 + Math.sin(now * 0.00121 + state.phase * 1.7) * 0.4
      const target = clamp(beam.torque * TILT_PER_TORQUE + breeze, -MAX_TILT, MAX_TILT)
      const stiffness = reducedMotion ? 90 : 26
      const damping = reducedMotion ? 19 : stilled ? 8.5 : 4.1
      state.vel += ((target - state.angle) * stiffness - state.vel * damping) * dt
      state.vel = clamp(state.vel, -420, 420)
      state.angle = clamp(state.angle + state.vel * dt, -MAX_TILT - 4, MAX_TILT + 4)

      if (!live) return

      if (beam.torque === 0 && beam.loaded && Math.abs(state.vel) < 26) {
        state.poised += dt * 1000
        if (state.poised >= SETTLE_MS && !current.settled[beam.id]) settleBeam(beam.id)
      } else {
        state.poised = 0
        if (beam.torque !== 0 && current.settled[beam.id]) breakBeam(beam.id)
      }

      if (Math.abs(beam.torque) >= SHEAR_TORQUE) {
        state.strain += dt * 1000
        if (state.strain >= SHEAR_MS) {
          state.strain = 0
          shearBeam(beam.id)
        }
      } else {
        state.strain = Math.max(0, state.strain - dt * 900)
      }
    })

    if (live && !stilled) {
      creepRef.current += dt * 1000
      if (creepRef.current >= CREEP_MS) {
        creepRef.current = 0
        creep()
      }
    }

    writeLayout()
  }, [breakBeam, creep, reducedMotion, settleBeam, shearBeam, writeLayout])

  useEffect(() => { tickRef.current = tick }, [tick])

  useLayoutEffect(() => {
    syncRuntime()
    writeLayout()
  }, [mobile, metrics, syncRuntime, writeLayout])

  useEffect(() => {
    let frame
    let last = performance.now()
    const step = (now) => {
      const dt = Math.min(0.04, Math.max(0.001, (now - last) / 1000))
      last = now
      tickRef.current(dt, now)
      frame = window.requestAnimationFrame(step)
    }
    frame = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  /* ------------------------------------------------------------ progression */

  useEffect(() => {
    if (!world.unlocked || world.status !== 'reckoning' || !validation.complete) return
    const stage = STAGES[world.stage]
    const mastered = world.stage >= STAGES.length - 1
    setWorld(previous => ({
      ...previous,
      stage: mastered ? previous.stage : previous.stage + 1,
      status: mastered ? 'standing' : 'reckoning',
      records: [...previous.records, { id: `plumb-${Date.now()}`, stage: previous.stage, at: Date.now() }].slice(-6),
      log: [...previous.log, { id: `stage-${Date.now()}`, stage: previous.stage + 1, text: stage.success }].slice(-8)
    }))
    raise('stage', stage.success)
    chime(392, 'set')
  }, [chime, raise, validation.complete, world.stage, world.status, world.unlocked])

  /* -------------------------------------------------------------- authoring */

  const svgPoint = useCallback((clientX, clientY) => {
    const svg = svgRef.current
    if (!svg) return null
    const matrix = svg.getScreenCTM()
    if (!matrix) return null
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    return point.matrixTransform(matrix.inverse())
  }, [])

  const notchAtClient = useCallback((clientX, clientY) => {
    const point = svgPoint(clientX, clientY)
    if (!point) return null
    const config = metricsRef.current
    let best = null
    Object.entries(layoutRef.current).forEach(([beamId, placement]) => {
      const radians = -placement.angle * DEG
      const dx = point.x - placement.x
      const dy = point.y - placement.y
      const localX = dx * Math.cos(radians) - dy * Math.sin(radians)
      const localY = dx * Math.sin(radians) + dy * Math.cos(radians)
      if (Math.abs(localY) > 54) return
      const notch = clamp(Math.round(localX / config.spacing), -placement.span, placement.span)
      const distance = Math.abs(localY) + Math.abs(localX - notch * config.spacing) * 0.6
      if (Math.abs(localX) > (placement.span + 0.9) * config.spacing) return
      if (!best || distance < best.distance) best = { beamId, notch, distance }
    })
    return best
  }, [svgPoint])

  const hangWeight = useCallback((weightId, beamId, notch) => {
    const current = worldRef.current
    const beam = mobileRef.current?.beams[beamId]
    if (!WEIGHTS[weightId] || !beam || !editable) return false
    if (WEIGHTS[weightId].unlockedAt > current.stage && current.status !== 'standing') return false
    const target = clamp(notch, -beam.span, beam.span)
    const existing = current.hangs[weightId]
    const occupiedByOther = beam.occupied.has(target) && !(existing?.beam === beamId && existing.notch === target)
    if (occupiedByOther) {
      const alternative = freeNotch(beam, target)
      if (alternative === null) {
        setMessage(`${BEAMS[beamId].label} has no free notch // lift something from it first`)
        return false
      }
      notch = alternative
    } else {
      notch = target
    }
    remember()
    setWorld(previous => ({
      ...previous,
      hangs: { ...previous.hangs, [weightId]: { beam: beamId, notch } },
      settled: Object.fromEntries(Object.entries(previous.settled).filter(([id]) => id !== beamId && id !== existing?.beam))
    }))
    const runtime = runtimeRef.current[beamId]
    if (runtime && !reducedMotion) runtime.vel += (notch >= 0 ? 1 : -1) * WEIGHTS[weightId].mass * 5
    setArmedWeightId(null)
    setSelectedWeightId(weightId)
    const wear = current.wear[notchKey(beamId, notch)] || 0
    setMessage(`${WEIGHTS[weightId].label} (mass ${WEIGHTS[weightId].mass}) hung at notch ${notch > 0 ? `+${notch}` : notch} of ${BEAMS[beamId].short} // ${wear >= GRIP_WEAR ? `worn groove, it grips` : wear ? `groove worn ${wear}/${GRIP_WEAR}` : 'a fresh notch, it can still slip'}`)
    return true
  }, [editable, reducedMotion, remember])

  const unhangWeight = useCallback((weightId) => {
    const current = worldRef.current
    if (!editable || !current.hangs[weightId]) return
    const beamId = current.hangs[weightId].beam
    remember()
    setWorld(previous => {
      const hangs = { ...previous.hangs }
      delete hangs[weightId]
      const settled = { ...previous.settled }
      delete settled[beamId]
      return { ...previous, hangs, settled }
    })
    setMessage(`${WEIGHTS[weightId].label} returned to the rack // ${BEAMS[beamId].short} lost its argument and its zero`)
  }, [editable, remember])

  const graftBeam = useCallback((beamId, parentId, notch) => {
    const current = worldRef.current
    const parent = mobileRef.current?.beams[parentId]
    if (!BEAMS[beamId] || beamId === 'crown' || !parent || !editable) return false
    if (BEAMS[beamId].unlockedAt > current.stage && current.status !== 'standing') return false
    if (beamId === parentId) return false
    let target = clamp(notch, -parent.span, parent.span)
    if (parent.occupied.has(target) && current.grafts[beamId]?.notch !== target) {
      const alternative = freeNotch(parent, target)
      if (alternative === null) {
        setMessage(`${parent.label} has no free notch for an arm`)
        return false
      }
      target = alternative
    }
    remember()
    setWorld(previous => ({
      ...previous,
      grafts: { ...previous.grafts, [beamId]: { parent: parentId, notch: target } },
      settled: Object.fromEntries(Object.entries(previous.settled).filter(([id]) => id !== parentId)),
      log: [...previous.log, { id: `graft-${Date.now()}`, stage: previous.stage, text: `${BEAMS[beamId].label} grafted to ${parent.short} at notch ${target} // its whole subtree now hangs as one mass` }].slice(-8)
    }))
    setArmedBeamId(null)
    setMessage(`${BEAMS[beamId].label} grafted at notch ${target > 0 ? `+${target}` : target} of ${parent.short} // it now contributes its entire subtree mass there`)
    return true
  }, [editable, remember])

  const ungraftBeam = useCallback((beamId) => {
    const current = worldRef.current
    if (!editable || !current.grafts[beamId]) return
    remember()
    setWorld(previous => {
      const grafts = Object.fromEntries(Object.entries(previous.grafts).filter(([id, graft]) => id !== beamId && graft.parent !== beamId))
      const hangs = Object.fromEntries(Object.entries(previous.hangs).filter(([, hang]) => hang.beam !== beamId))
      return { ...previous, grafts, hangs, settled: {} }
    })
    setMessage(`${BEAMS[beamId].label} lifted off the mobile // anything it carried went back to the rack`)
  }, [editable, remember])

  const dropAt = useCallback((clientX, clientY) => {
    const target = notchAtClient(clientX, clientY)
    const current = dragRef.current
    if (!current) return
    if (!target) {
      if (current.kind === 'weight' && worldRef.current.hangs[current.id]) unhangWeight(current.id)
      else setMessage('nothing receiving there // tap a weight, then tap a notch on an arm')
      return
    }
    if (current.kind === 'weight') hangWeight(current.id, target.beamId, target.notch)
    else graftBeam(current.id, target.beamId, target.notch)
  }, [graftBeam, hangWeight, notchAtClient, unhangWeight])

  const beginDrag = useCallback((event, kind, id) => {
    if (!editable) return
    event.preventDefault()
    event.stopPropagation()
    const next = { kind, id, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false }
    dragRef.current = next
    setDrag(next)
    if (kind === 'weight') {
      setArmedWeightId(id)
      setArmedBeamId(null)
      setSelectedWeightId(id)
    } else {
      setArmedBeamId(id)
      setArmedWeightId(null)
    }
  }, [editable])

  useEffect(() => {
    if (!drag?.id) return undefined
    const handleMove = (event) => {
      const current = dragRef.current
      if (!current) return
      const moved = current.moved || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > DRAG_THRESHOLD
      const next = { ...current, x: event.clientX, y: event.clientY, moved }
      dragRef.current = next
      setDrag(next)
      const target = moved ? notchAtClient(event.clientX, event.clientY) : null
      setHoverNotch(previous => {
        const key = target ? notchKey(target.beamId, target.notch) : null
        return previous === key ? previous : key
      })
    }
    const handleUp = (event) => {
      const current = dragRef.current
      if (current?.moved) dropAt(event.clientX, event.clientY)
      else if (current) {
        setMessage(current.kind === 'weight'
          ? `${WEIGHTS[current.id].label} armed // tap any notch on an arm to hang it`
          : `${BEAMS[current.id].label} armed // tap a free notch to graft it`)
      }
      suppressClickRef.current = true
      window.setTimeout(() => { suppressClickRef.current = false }, 0)
      dragRef.current = null
      setDrag(null)
      setHoverNotch(null)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [drag?.id, dropAt, notchAtClient])

  const tapNotch = useCallback((beamId, notch) => {
    if (suppressClickRef.current) return
    if (armedBeamId) {
      graftBeam(armedBeamId, beamId, notch)
      return
    }
    if (armedWeightId) {
      hangWeight(armedWeightId, beamId, notch)
      return
    }
    const occupant = Object.entries(worldRef.current.hangs).find(([, hang]) => hang.beam === beamId && hang.notch === notch)
    if (occupant) {
      setSelectedWeightId(occupant[0])
      setArmedWeightId(occupant[0])
      setMessage(`${WEIGHTS[occupant[0]].label} lifted off the notch // tap another notch to re-seat it`)
      return
    }
    setMessage(`notch ${notch > 0 ? `+${notch}` : notch} of ${BEAMS[beamId].short} is empty // arm a weight from the rack first`)
  }, [armedBeamId, armedWeightId, graftBeam, hangWeight])

  const stillTheAir = useCallback(() => {
    const now = performance.now()
    if (now < stillRef.current.ready) {
      setMessage('the air has not finished moving again yet')
      return
    }
    setStill({ until: now + STILL_MS, ready: now + STILL_MS + STILL_COOLDOWN_MS })
    setMessage('the air is held still // no breeze, no creep, four seconds to read the brass honestly')
    chime(523.25, 'creep')
  }, [chime])

  const applyGuidance = useCallback(() => {
    if (!editable) return
    if (guidance.kind === 'hang' && guidance.weightId) {
      const beam = mobile.list.find(candidate => freeNotch(candidate, 0) !== null) || mobile.beams.crown
      hangWeight(guidance.weightId, beam.id, freeNotch(beam, 0) ?? 0)
      return
    }
    if (guidance.kind === 'graft' && guidance.beamId) {
      const parent = mobile.list.find(candidate => freeNotch(candidate, 2) !== null) || mobile.beams.crown
      graftBeam(guidance.beamId, parent.id, freeNotch(parent, 2) ?? 1)
      return
    }
    if (guidance.kind === 'shift' && guidance.weightId) {
      hangWeight(guidance.weightId, guidance.beamId, guidance.notch)
      return
    }
    if (guidance.kind === 'separate' && guidance.weightId) {
      const source = world.hangs[guidance.weightId]?.beam
      const beam = mobile.list.find(candidate => candidate.id !== source && freeNotch(candidate, 0) !== null)
      if (beam) hangWeight(guidance.weightId, beam.id, freeNotch(beam, 0) ?? 0)
      else setMessage('no other arm has a free notch // graft one or lift a weight')
      return
    }
    if (guidance.kind === 'hold' || guidance.kind === 'grip') stillTheAir()
  }, [editable, graftBeam, guidance, hangWeight, mobile, stillTheAir, world.hangs])

  const undo = useCallback(() => {
    const previous = history.at(-1)
    if (!previous) {
      setMessage('nothing earlier is hanging behind this arrangement')
      return
    }
    setHistory(entries => entries.slice(0, -1))
    setWorld(current => ({ ...current, ...previous, unlocked: true }))
    setMessage('one arrangement lifted // grooves, grafts and scars came back with it')
  }, [history])

  const reset = useCallback(() => {
    setWorld(freshWorld())
    setHistory([])
    setArmedWeightId(null)
    setArmedBeamId(null)
    setSelectedWeightId('hunger')
    runtimeRef.current = {}
    creepRef.current = 0
    setMessage('clean brass // every worn groove forgotten, every conviction back on the rack')
  }, [])

  const wake = useCallback(() => {
    setWorld(current => ({
      ...current,
      unlocked: true,
      log: [...current.log, { id: `wake-${Date.now()}`, stage: current.stage, text: 'a hand entered the hall; the arm began to answer for what it carries' }].slice(-8)
    }))
    setMessage('drag hunger, memory and signal onto the crown // the number on the arm is its lean, and you want zero')
    requestAnimationFrame(() => surfaceRef.current?.focus())
  }, [])

  const shiftSelected = useCallback((direction) => {
    const hang = world.hangs[selectedWeightId]
    if (!hang) {
      setMessage(`${WEIGHTS[selectedWeightId].label} is on the rack // hang it before sliding it`)
      return
    }
    hangWeight(selectedWeightId, hang.beam, hang.notch + direction)
  }, [hangWeight, selectedWeightId, world.hangs])

  const moveSelectedBeam = useCallback((direction) => {
    const hang = world.hangs[selectedWeightId]
    const ids = mobile.ids
    const index = hang ? ids.indexOf(hang.beam) : -1
    const nextId = ids[clamp(index + direction, 0, ids.length - 1)] || ids[0]
    if (!nextId || nextId === hang?.beam) {
      setMessage('no further arm in that direction')
      return
    }
    const beam = mobile.beams[nextId]
    const notch = freeNotch(beam, hang?.notch ?? 0)
    if (notch === null) {
      setMessage(`${beam.short} has no free notch`)
      return
    }
    hangWeight(selectedWeightId, nextId, notch)
  }, [hangWeight, mobile, selectedWeightId, world.hangs])

  const handleKeyDown = useCallback((event) => {
    if (event.target.closest('button, a, input, select, textarea')) return
    const key = event.key.toLowerCase()
    if (event.key === 'ArrowLeft') { event.preventDefault(); shiftSelected(-1) }
    if (event.key === 'ArrowRight') { event.preventDefault(); shiftSelected(1) }
    if (event.key === 'ArrowUp') { event.preventDefault(); moveSelectedBeam(-1) }
    if (event.key === 'ArrowDown') { event.preventDefault(); moveSelectedBeam(1) }
    if (key === 'x') { event.preventDefault(); unhangWeight(selectedWeightId) }
    if (key === 'g') {
      event.preventDefault()
      const blank = rackBeams.find(beam => !world.grafts[beam.id])
      const parent = mobile.list.find(candidate => freeNotch(candidate, 2) !== null)
      if (blank && parent) graftBeam(blank.id, parent.id, freeNotch(parent, 2) ?? 1)
      else setMessage('no free arm or no free notch to graft into')
    }
    if (key === 'q') {
      event.preventDefault()
      const ids = trayWeights.map(weight => weight.id)
      const next = ids[(ids.indexOf(selectedWeightId) + 1) % ids.length]
      setSelectedWeightId(next)
      setArmedWeightId(next)
      setMessage(`${WEIGHTS[next].label} selected // arrows slide it, X returns it to the rack`)
    }
    if (event.key === ' ') { event.preventDefault(); stillTheAir() }
  }, [graftBeam, mobile, moveSelectedBeam, rackBeams, selectedWeightId, shiftSelected, stillTheAir, trayWeights, unhangWeight, world.grafts])

  /* ----------------------------------------------------------------- render */

  const stage = validation.stage
  const phase = world.status === 'standing'
    ? 'standing'
    : world.status === 'collapsed'
      ? 'collapsed'
      : !world.unlocked
        ? 'sealed'
        : validation.allSet
          ? 'holding'
          : mobile.list.some(beam => Math.abs(beam.torque) >= SHEAR_TORQUE)
            ? 'straining'
            : 'reckoning'

  const heldWeightIds = new Set(Object.keys(world.hangs))
  const stillActive = still.until > performance.now()

  return (
    <div className={`pr-shell phase-${phase} ${portrait ? 'is-portrait' : ''} ${reducedMotion ? 'is-reduced-motion' : ''}`}>
      <main
        ref={surfaceRef}
        className={`pr-surface ${drag ? 'is-dragging' : ''}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        data-playground-surface
        data-testid="plumb-reckoner-surface"
        aria-label="A continuously swaying brass mobile whose hanging weights are quantised convictions"
      >
        <section className="pr-hall" aria-label="the hanging hall">
          <div className="pr-corner-nav"><ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} /></div>

          <div className="pr-plaque">
            <span>living interface / generation 229</span>
            <h1 style={{ color: experiment.color }}>{experiment.name}</h1>
            <p>{phase} // {Object.values(world.wear).filter(count => count >= GRIP_WEAR).length} gripping grooves // {formatAge(savedAt)}</p>
          </div>

          <button
            type="button"
            className="pr-sound"
            onClick={() => {
              setSoundOn(current => !current)
              setMessage(soundOn ? 'the hall returns to silence' : 'the brass will sound when an arm sets or slips')
            }}
            aria-pressed={soundOn}
          >
            {soundOn ? 'brass on' : 'brass off'}
          </button>

          <svg
            ref={svgRef}
            className="pr-mobile"
            viewBox={`0 0 ${metrics.width} ${metrics.height}`}
            preserveAspectRatio="xMidYMid meet"
            aria-label={`${mobile.list.length} arms hanging. ${validation.setCount} are holding zero. ${guidance.title}.`}
          >
            <defs>
              <pattern id="pr-weave" width="34" height="34" patternUnits="userSpaceOnUse">
                <path d="M 34 0 H 0 V 34" fill="none" stroke="rgba(226,214,186,.06)" strokeWidth=".8" />
                <circle cx="0" cy="0" r="1.1" fill="rgba(226,214,186,.13)" />
              </pattern>
              <linearGradient id="pr-brass" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d9bd7c" />
                <stop offset="42%" stopColor="#a8873f" />
                <stop offset="100%" stopColor="#6b5222" />
              </linearGradient>
              <filter id="pr-grain" x="-12%" y="-12%" width="124%" height="124%">
                <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="229" result="noise" />
                <feColorMatrix in="noise" type="saturate" values="0" result="gray" />
                <feBlend in="SourceGraphic" in2="gray" mode="soft-light" />
              </filter>
              <filter id="pr-halo" x="-120%" y="-120%" width="340%" height="340%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            <rect className="pr-ground" width={metrics.width} height={metrics.height} />
            <rect className="pr-weave" x="14" y="14" width={metrics.width - 28} height={metrics.height - 28} fill="url(#pr-weave)" />

            <g className="pr-ceiling">
              <path d={`M ${metrics.ceilingX - 168} ${metrics.ceilingY - 22} H ${metrics.ceilingX + 168}`} />
              <path d={`M ${metrics.ceilingX - 130} ${metrics.ceilingY - 14} H ${metrics.ceilingX + 130}`} />
              <circle cx={metrics.ceilingX} cy={metrics.ceilingY} r="9" />
              <text x={metrics.ceilingX} y={metrics.ceilingY - 34}>the only fixed point</text>
            </g>

            <path
              className="pr-silt"
              d={`M 0 ${metrics.height - 46} C ${metrics.width * 0.28} ${metrics.height - 66}, ${metrics.width * 0.66} ${metrics.height - 28}, ${metrics.width} ${metrics.height - 54} L ${metrics.width} ${metrics.height} L 0 ${metrics.height} Z`}
            />

            <g className="pr-cords">
              {mobile.list.map(beam => (
                <line
                  key={beam.id}
                  ref={(node) => {
                    if (node) cordNodes.current.set(beam.id, node)
                    else cordNodes.current.delete(beam.id)
                  }}
                  className={world.settled[beam.id] ? 'is-set' : ''}
                  x1={metrics.ceilingX}
                  y1={metrics.ceilingY}
                  x2={metrics.ceilingX}
                  y2={metrics.ceilingY + metrics.rootCord}
                />
              ))}
            </g>

            <g className="pr-beam-layer">
              {mobile.list.map(beam => {
                const half = beam.span * metrics.spacing
                const isSet = Boolean(world.settled[beam.id])
                const straining = Math.abs(beam.torque) >= SHEAR_TORQUE
                const scars = world.scars[beam.id] || 0
                return (
                  <g
                    key={beam.id}
                    ref={(node) => {
                      if (node) beamNodes.current.set(beam.id, node)
                      else beamNodes.current.delete(beam.id)
                    }}
                    className={`pr-beam ${isSet ? 'is-set' : ''} ${straining ? 'is-straining' : ''} ${beam.torque === 0 && beam.loaded ? 'is-level' : ''}`}
                    style={{ '--beam-depth': beam.depth }}
                  >
                    <title>{`${beam.label}. Lean ${formatLean(beam.torque)}. Subtree mass ${beam.subtreeMass}. ${isSet ? 'Holding zero.' : 'Not yet holding.'}`}</title>

                    <rect className="pr-beam-shadow" x={-half - 24} y="-5" width={half * 2 + 48} height="16" rx="8" transform="translate(4 7)" />
                    <rect className="pr-beam-body" x={-half - 24} y="-6" width={half * 2 + 48} height="17" rx="8" fill="url(#pr-brass)" filter="url(#pr-grain)" />
                    <BeamGrain span={beam.span} spacing={metrics.spacing} mark={beam.mark} />

                    <g className="pr-fulcrum">
                      <path d="M 0 -30 L -13 -7 H 13 Z" />
                      <circle cy="-30" r="5" />
                    </g>

                    {Array.from({ length: beam.span * 2 + 1 }, (_, index) => {
                      const notch = index - beam.span
                      const x = notch * metrics.spacing
                      const wear = world.wear[notchKey(beam.id, notch)] || 0
                      const filled = beam.occupied.has(notch)
                      const hovered = hoverNotch === notchKey(beam.id, notch)
                      return (
                        <g
                          key={notch}
                          className={`pr-notch ${filled ? 'is-filled' : ''} ${wear >= GRIP_WEAR ? 'is-gripping' : ''} ${hovered ? 'is-hovered' : ''} ${notch === 0 ? 'is-pivot' : ''}`}
                          transform={`translate(${x} 0)`}
                          role="button"
                          tabIndex={editable ? 0 : -1}
                          aria-label={`${beam.label}, notch ${notch}. ${filled ? 'Occupied' : 'Free'}. Groove worn ${wear} of ${GRIP_WEAR}.`}
                          onClick={(event) => {
                            event.stopPropagation()
                            tapNotch(beam.id, notch)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              event.stopPropagation()
                              tapNotch(beam.id, notch)
                            }
                          }}
                        >
                          <circle className="pr-notch-hit" r="21" />
                          <path className="pr-notch-cut" d="M 0 -7 V 8" />
                          {wear > 0 && <circle className="pr-notch-wear" r={4 + Math.min(wear, 3)} />}
                          {notch !== 0 && <text className="pr-notch-index" y="30">{notch > 0 ? `+${notch}` : notch}</text>}
                        </g>
                      )
                    })}

                    {beam.hung.map(item => {
                      const weight = WEIGHTS[item.id]
                      const gripping = (world.wear[notchKey(beam.id, item.notch)] || 0) >= GRIP_WEAR
                      const selected = selectedWeightId === item.id
                      return (
                        <g key={item.id} className="pr-hung" transform={`translate(${item.notch * metrics.spacing} 0)`}>
                          <g
                            ref={(node) => {
                              if (node) pendantNodes.current.set(item.id, node)
                              else pendantNodes.current.delete(item.id)
                            }}
                            className={`pr-pendant ${gripping ? 'is-gripping' : ''} ${selected ? 'is-selected' : ''}`}
                            style={{ '--weight-color': weight.color }}
                          >
                            <line className="pr-pendant-cord" y1="4" y2={26 + weight.mass * 2} />
                            <g
                              className="pr-pendant-body"
                              transform={`translate(0 ${26 + weight.mass * 2})`}
                              role="button"
                              tabIndex={editable ? 0 : -1}
                              aria-label={`${weight.label}, mass ${weight.mass}, hanging at notch ${item.notch} of ${beam.label}. Drag to re-hang.`}
                              onPointerDown={(event) => beginDrag(event, 'weight', item.id)}
                              onClick={(event) => {
                                event.stopPropagation()
                                if (suppressClickRef.current) return
                                setSelectedWeightId(item.id)
                                setMessage(`${weight.label} // mass ${weight.mass} × notch ${item.notch} = ${weight.mass * item.notch} of ${beam.short}'s lean`)
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  setSelectedWeightId(item.id)
                                  setArmedWeightId(item.id)
                                }
                              }}
                            >
                              <circle className="pr-pendant-hit" r="26" />
                              <path className="pr-pendant-plate" d={`M ${-9 - weight.mass * 1.7} -10 H ${9 + weight.mass * 1.7} L ${6 + weight.mass * 1.7} ${11 + weight.mass} H ${-6 - weight.mass * 1.7} Z`} />
                              <text className="pr-pendant-mark" y="4">{weight.mark}</text>
                              <text className="pr-pendant-mass" y={22 + weight.mass}>{weight.mass}</text>
                              {gripping && <path className="pr-grip-mark" d="M -13 -14 l 6 -6 M 13 -14 l -6 -6" />}
                            </g>
                          </g>
                        </g>
                      )
                    })}

                    {scars > 0 && <path className="pr-beam-scar" d={`M ${-half * 0.4} 12 l 14 9 -7 8 18 -6`} />}

                    <g className={`pr-gauge ${isSet ? 'is-set' : ''} ${beam.torque === 0 ? 'is-zero' : ''}`} transform={`translate(${half + 46} 2)`}>
                      <rect x="-27" y="-15" width="54" height="30" rx="15" />
                      <text className="pr-gauge-value" y="2">{formatLean(beam.torque)}</text>
                      <text className="pr-gauge-label" y="26">{isSet ? 'set' : beam.torque === 0 ? 'holding' : 'lean'}</text>
                    </g>
                  </g>
                )
              })}
            </g>

            {stillActive && (
              <g className="pr-still-veil" filter="url(#pr-halo)">
                <line x1={metrics.ceilingX} y1={metrics.ceilingY} x2={metrics.ceilingX} y2={metrics.height - 60} />
                <text x={metrics.ceilingX} y={metrics.height - 40}>plumb held</text>
              </g>
            )}
          </svg>

          <div className="pr-stage-card">
            <span>{stage.label}</span>
            <h2>{stage.title}</h2>
            <p>{stage.instruction}</p>
            <div className="pr-stage-pips" aria-label={`${validation.setCount} of ${stage.beamsSet} arms holding`}>
              {Array.from({ length: stage.beamsSet }, (_, index) => (
                <i key={index} className={validation.setCount > index ? 'is-held' : ''} />
              ))}
              <small>{validation.setCount}/{stage.beamsSet} arms at zero</small>
            </div>
          </div>

          <div className="pr-shear-rail" aria-label={`${world.shears} of ${MAX_SHEARS} sheared arms`}>
            <span>sheared arms</span>
            {Array.from({ length: MAX_SHEARS }, (_, index) => (
              <i key={index} className={world.shears > index ? 'is-broken' : ''} />
            ))}
          </div>

          {flash && <div className={`pr-flash is-${flash.tone}`} role="status">{flash.text}</div>}

          {!world.unlocked && (
            <div className="pr-seal">
              <div className="pr-seal-arm" aria-hidden="true"><i /><i /><i /><span>229</span></div>
              <p>UNWEIGHED RECKONING / LIVING INTERFACE 229</p>
              <h2>A belief has no weight.<br />Its distance from the pivot does.</h2>
              <button type="button" onClick={wake} data-playground-primary>take the arm by its empty notches</button>
              <small>hang convictions • graft arms • wear grooves until they grip • hold zero</small>
            </div>
          )}

          {world.status === 'standing' && (
            <div className="pr-outcome pr-outcome-standing">
              <span>standing verdict / three arms / {Object.values(world.wear).filter(count => count >= GRIP_WEAR).length} gripping grooves</span>
              <h2>THE RECKONING NO LONGER NEEDS A HAND</h2>
              <p>{reading.headline}. Worn notches hold what fresh ones dropped; the arms keep answering for their own load. Keep rearranging, or take it apart and find a different zero.</p>
              <div><button type="button" onClick={undo} disabled={history.length === 0}>lift last arrangement</button><button type="button" onClick={reset}>strip the brass</button></div>
            </div>
          )}

          {world.status === 'collapsed' && (
            <div className="pr-outcome pr-outcome-collapsed">
              <span>failure / four arms sheared under their own argument</span>
              <h2>THE HALL IS FULL OF FALLEN BRASS</h2>
              <p>Every arm that carried an unbearable lean for too long tore free. Lift the last arrangement, or begin again and keep the heavy convictions nearer the pivot.</p>
              <div><button type="button" onClick={undo} disabled={history.length === 0}>lift last arrangement</button><button type="button" onClick={reset}>rehang the hall</button></div>
            </div>
          )}
        </section>

        <aside className="pr-rack" aria-label="conviction rack and reckoning instruments">
          <section className={`pr-inspector is-${guidance.kind}`} aria-live="polite">
            <span>first thing out of true</span>
            <h2>{guidance.title}</h2>
            <p>{guidance.detail}</p>
            {guidance.kind !== 'ready' && (
              <button type="button" onClick={applyGuidance} disabled={!editable} data-playground-action="follow-plumb-hint">
                {guidance.action}
              </button>
            )}
          </section>

          <section className="pr-bank" aria-label="convictions">
            <div className="pr-heading"><span>convictions</span><strong>{armedWeightId ? `${WEIGHTS[armedWeightId].mark} armed` : 'drag / tap'}</strong></div>
            <div className="pr-bank-list">
              {trayWeights.map(weight => {
                const hang = world.hangs[weight.id]
                const gripping = hang && (world.wear[notchKey(hang.beam, hang.notch)] || 0) >= GRIP_WEAR
                return (
                  <button
                    type="button"
                    key={weight.id}
                    className={`${armedWeightId === weight.id ? 'is-armed' : ''} ${heldWeightIds.has(weight.id) ? 'is-hung' : ''} ${selectedWeightId === weight.id ? 'is-selected' : ''}`}
                    style={{ '--weight-color': weight.color }}
                    onPointerDown={(event) => beginDrag(event, 'weight', weight.id)}
                    onClick={() => {
                      if (suppressClickRef.current || !editable) return
                      setSelectedWeightId(weight.id)
                      setArmedWeightId(armedWeightId === weight.id ? null : weight.id)
                      setArmedBeamId(null)
                      setMessage(`${weight.label} ${armedWeightId === weight.id ? 'returned to the rack' : `armed // ${weight.note}`}`)
                    }}
                    aria-pressed={armedWeightId === weight.id}
                    data-playground-action="arm-conviction"
                    disabled={!editable}
                  >
                    <i>{weight.mark}</i>
                    <span>
                      <strong>{weight.label}</strong>
                      <small>{hang ? `${BEAMS[hang.beam].short} ${hang.notch > 0 ? `+${hang.notch}` : hang.notch}${gripping ? ' // gripping' : ''}` : weight.note}</small>
                    </span>
                    <b>{weight.mass}</b>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="pr-arms" aria-label="arms">
            <div className="pr-heading"><span>arms</span><strong>{armedBeamId ? `${BEAMS[armedBeamId].mark} armed` : `${mobile.list.length} hanging`}</strong></div>
            <div className="pr-arm-list">
              {rackBeams.map(beam => {
                const grafted = Boolean(world.grafts[beam.id])
                return (
                  <button
                    type="button"
                    key={beam.id}
                    className={`${armedBeamId === beam.id ? 'is-armed' : ''} ${grafted ? 'is-grafted' : ''}`}
                    onPointerDown={(event) => { if (!grafted) beginDrag(event, 'beam', beam.id) }}
                    onClick={() => {
                      if (suppressClickRef.current || !editable) return
                      if (grafted) {
                        ungraftBeam(beam.id)
                        return
                      }
                      setArmedBeamId(armedBeamId === beam.id ? null : beam.id)
                      setArmedWeightId(null)
                      setMessage(`${beam.label} ${armedBeamId === beam.id ? 'laid back on the rack' : `armed // ${beam.note}`}`)
                    }}
                    aria-pressed={armedBeamId === beam.id}
                    data-playground-action="graft-arm"
                    disabled={!editable}
                  >
                    <i>{beam.mark}</i>
                    <span><strong>{beam.label}</strong><small>{grafted ? `hanging from ${BEAMS[world.grafts[beam.id].parent].short} // tap to lift` : `span ±${beam.span} // mass ${beam.mass}`}</small></span>
                    <b>{grafted ? '↓' : '＋'}</b>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="pr-console">
            <button
              type="button"
              className={`pr-still ${stillActive ? 'is-active' : ''}`}
              onClick={stillTheAir}
              disabled={!editable}
              data-playground-action="still-the-air"
            >
              <span>{stillActive ? 'the air is held' : 'breeze and creep are working against you'}</span>
              <strong>{stillActive ? 'STILL…' : 'STILL THE AIR'}</strong>
              <small>SPACE</small>
            </button>
            <div className="pr-console-row">
              <button type="button" onClick={undo} disabled={history.length === 0}>lift arrangement</button>
              <button type="button" onClick={() => unhangWeight(selectedWeightId)} disabled={!editable || !world.hangs[selectedWeightId]}>unhang {WEIGHTS[selectedWeightId].label}</button>
              <button type="button" onClick={reset}>strip brass</button>
            </div>
          </section>

          <ol className="pr-chronicle" aria-label="hall memory">
            {world.log.slice(-3).reverse().map((entry, index) => (
              <li key={entry.id} style={{ opacity: 1 - index * 0.26 }}><span>{String(entry.stage).padStart(2, '0')}</span>{entry.text}</li>
            ))}
          </ol>

          <p className="pr-keys">drag convictions onto notches • arrows slide • ↑↓ change arm • Q select • X unhang • G graft • Space still</p>
        </aside>

        <footer className="pr-reading" aria-label="standing reading" aria-live="polite">
          <div>
            <span>standing reading</span>
            <h2>{reading.headline}</h2>
            <p>{reading.body}</p>
          </div>
          <div className="pr-reading-side">
            <strong>{message}</strong>
          </div>
        </footer>

        {drag?.moved && (
          <div
            className="pr-drag-chip"
            style={{
              left: drag.x,
              top: drag.y,
              '--weight-color': drag.kind === 'weight' ? WEIGHTS[drag.id].color : '#c8a55f'
            }}
            aria-hidden="true"
          >
            <i>{drag.kind === 'weight' ? WEIGHTS[drag.id].mark : BEAMS[drag.id].mark}</i>
            <span>{hoverNotch ? `seat at ${hoverNotch.replace(':', ' notch ')}` : drag.kind === 'weight' ? `carry ${WEIGHTS[drag.id].label}` : `carry ${BEAMS[drag.id].short}`}</span>
          </div>
        )}
      </main>
    </div>
  )
}

export { freshWorld, deriveMobile, validateWorld }
export default PlumbReckoner
