import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ExperimentNav from '../../ExperimentNav'
import {
  ARBORS,
  BLOOM_THRESHOLD,
  COGS,
  GATE_HALF,
  HOLD_REQUIRED,
  MAX_HUSKS,
  PODS,
  PROBE_HORIZON,
  SEASONS,
  STATIONS,
  TAU,
  TOLERANCE,
  VOWS,
  arborById,
  clamp,
  cogById,
  frameOf,
  periodFor,
  podById,
  probe,
  seedSim,
  socketKey,
  stepGarden,
  trainFor
} from './escapement/garden-core'
import './EscapementGarden.css'

const STORAGE_KEY = 'clawed:escapement-garden:v1'
const CX = 430
const CY = 430
const PLATE_R = 404
const DRAG_THRESHOLD = 6
const RING_BAND = 46

const pointOn = (radius, angle) => ({
  x: CX + Math.cos(angle) * radius,
  y: CY + Math.sin(angle) * radius
})

const wedgePath = (inner, outer, half) => {
  const a = (radius, angle) => `${(CX + Math.cos(angle) * radius).toFixed(2)} ${(CY + Math.sin(angle) * radius).toFixed(2)}`
  return `M ${a(inner, -half)} L ${a(outer, -half)} A ${outer} ${outer} 0 0 1 ${a(outer, half)} L ${a(inner, half)} A ${inner} ${inner} 0 0 0 ${a(inner, -half)} Z`
}

const gearPath = (teeth, radius) => {
  const inner = radius * 0.71
  const points = []
  for (let index = 0; index < teeth * 2; index += 1) {
    const r = index % 2 === 0 ? radius : inner
    const angle = (index / (teeth * 2)) * TAU
    points.push(`${(Math.cos(angle) * r).toFixed(2)} ${(Math.sin(angle) * r).toFixed(2)}`)
  }
  return `M ${points.join(' L ')} Z`
}

const cogRadius = (teeth) => 12 + teeth * 0.82

const socketSeat = (arbor) => {
  const index = ARBORS.findIndex(entry => entry.id === arbor.id)
  const previous = ARBORS[index - 1]
  return {
    drive: pointOn(previous.radius, arbor.spoke),
    driven: pointOn(arbor.radius, arbor.spoke)
  }
}

const freshWorld = () => ({
  version: 1,
  unlocked: false,
  stage: 0,
  status: 'tending',
  sockets: {},
  planted: {},
  gate: -Math.PI / 2,
  vow: null,
  husks: [],
  heartwood: 0,
  log: [{ id: 'sealed', stage: 0, text: 'the barrel turns and the plate is bare; nothing here yet needs the light' }],
  lastSaved: null
})

const loadWorld = () => {
  const fresh = freshWorld()
  if (typeof window === 'undefined') return fresh
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (!saved || saved.version !== 1) return fresh
    const sockets = Object.fromEntries(
      Object.entries(saved.sockets || {}).filter(([key, cogId]) => {
        const [arborId, role] = key.split(':')
        return arborById(arborId) && (role === 'drive' || role === 'driven') && cogById(cogId)
      })
    )
    const planted = Object.fromEntries(
      Object.entries(saved.planted || {})
        .filter(([podId, seat]) => podById(podId) && arborById(seat?.arborId))
        .map(([podId, seat]) => [podId, {
          arborId: seat.arborId,
          station: clamp(Math.round(Number(seat.station) || 0), 0, STATIONS - 1)
        }])
    )
    return {
      ...fresh,
      ...saved,
      sockets,
      planted,
      stage: clamp(Math.round(Number(saved.stage) || 0), 0, SEASONS.length - 1),
      status: ['tending', 'mastered', 'ruined'].includes(saved.status) ? saved.status : 'tending',
      gate: Number.isFinite(saved.gate) ? saved.gate : fresh.gate,
      vow: VOWS[saved.vow] ? saved.vow : null,
      husks: Array.isArray(saved.husks) ? saved.husks.slice(-MAX_HUSKS) : [],
      heartwood: clamp(Math.round(Number(saved.heartwood) || 0), 0, 9),
      log: Array.isArray(saved.log) && saved.log.length ? saved.log.slice(-5) : fresh.log
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

/** One-cog-at-a-time inventory: a cog can occupy exactly one socket. */
const socketOwnerOf = (sockets, cogId) => Object.entries(sockets).find(([, id]) => id === cogId)?.[0] || null

const Blossom = ({ pod, radius }) => (
  <g className="eg-blossom-art">
    <circle className="eg-blossom-halo" r={radius * 1.9} />
    {Array.from({ length: 6 }, (_, index) => {
      const angle = (index / 6) * TAU
      return (
        <ellipse
          key={index}
          className="eg-petal"
          cx={Math.cos(angle) * radius * 0.62}
          cy={Math.sin(angle) * radius * 0.62}
          rx={radius * 0.56}
          ry={radius * 0.34}
          transform={`rotate(${(angle * 180) / Math.PI} ${Math.cos(angle) * radius * 0.62} ${Math.sin(angle) * radius * 0.62})`}
        />
      )
    })}
    <circle className="eg-blossom-core" r={radius * 0.42} />
    <text className="eg-blossom-mark" y={radius * 0.24}>{pod.mark}</text>
  </g>
)

const EscapementGarden = ({ category, experiment }) => {
  const [world, setWorld] = useState(loadWorld)
  const [selectedArborId, setSelectedArborId] = useState('verge')
  const [armedCogId, setArmedCogId] = useState(null)
  const [armedPodId, setArmedPodId] = useState(null)
  const [drag, setDrag] = useState(null)
  const [hud, setHud] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [savedAt, setSavedAt] = useState(() => world.lastSaved)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const [windingOn, setWindingOn] = useState(false)
  const [offThread, setOffThread] = useState(true)
  const [celebration, setCelebration] = useState(null)
  const [message, setMessage] = useState(() => (
    world.unlocked
      ? `season ${Math.min(world.stage + 1, SEASONS.length)} resumed // ${world.heartwood} heartwood ring${world.heartwood === 1 ? '' : 's'} already cut`
      : 'a wound barrel turns behind glass; no ring outboard of it has been geared yet'
  ))

  const surfaceRef = useRef(null)
  const svgRef = useRef(null)
  const plateRef = useRef(null)
  const gateRef = useRef(null)
  const springRef = useRef(null)
  const holdRef = useRef(null)
  const arborRefs = useRef({})
  const cogRefs = useRef({})
  const blossomRefs = useRef({})

  const worldRef = useRef(world)
  const workerRef = useRef(null)
  const frameRef = useRef(null)
  const inputRef = useRef({ winding: false })
  const dragRef = useRef(null)
  const frameHandlerRef = useRef(() => {})
  const fallbackSimRef = useRef(null)
  const fallbackClockRef = useRef(0)
  const fallbackProbeRef = useRef(0)
  const hudClockRef = useRef(0)
  const loggedRef = useRef(new Set())
  const logIdRef = useRef(0)
  const saveTimerRef = useRef(null)
  const celebrationTimerRef = useRef(null)
  const audioRef = useRef(null)
  const suppressClickRef = useRef(false)

  useEffect(() => { worldRef.current = world }, [world])

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
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...world, lastSaved: timestamp }))
        setSavedAt(timestamp)
      } catch {
        // The garden keeps its cadence even when local memory refuses it.
      }
    }, 220)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [world])

  const train = useMemo(() => trainFor(world), [world])
  const trainMap = useMemo(() => new Map(train.map(entry => [entry.id, entry])), [train])
  const season = SEASONS[Math.min(world.stage, SEASONS.length - 1)]
  const visibleArbors = useMemo(
    () => ARBORS.filter(arbor => arbor.unlockedAt <= world.stage || world.status === 'mastered'),
    [world.stage, world.status]
  )
  const availableCogs = useMemo(
    () => COGS.filter(cog => cog.unlockedAt <= world.stage || world.status === 'mastered'),
    [world.stage, world.status]
  )
  const availablePods = useMemo(
    () => PODS.filter(pod => pod.unlockedAt <= world.stage || world.status === 'mastered'),
    [world.stage, world.status]
  )
  const selectedArbor = arborById(selectedArborId) || ARBORS[1]
  const editable = world.unlocked && world.status !== 'ruined'
  const vow = world.vow ? VOWS[world.vow] : null

  /** Which pods ride which ring, and whether that ring's turn matches their appetite. */
  const seats = useMemo(() => Object.entries(world.planted).map(([podId, seat]) => {
    const pod = podById(podId)
    const entry = trainMap.get(seat.arborId)
    const period = entry ? periodFor(entry.cum) : null
    const drift = period === null ? null : (period - pod.need) / pod.need
    return {
      pod,
      seat,
      arbor: arborById(seat.arborId),
      period,
      drift,
      matched: drift !== null && Math.abs(drift) <= TOLERANCE
    }
  }), [trainMap, world.planted])

  const pushLog = useCallback((text, key = null) => {
    if (key) {
      if (loggedRef.current.has(key)) return
      loggedRef.current.add(key)
    }
    logIdRef.current += 1
    const id = `log-${logIdRef.current}-${Date.now()}`
    setWorld(previous => ({
      ...previous,
      log: [...previous.log, { id, stage: previous.stage, text }].slice(-5)
    }))
  }, [])

  const tone = useCallback((frequency, duration = 0.22, type = 'sine', gainPeak = 0.05) => {
    if (!soundOn) return
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const context = audioRef.current || new AudioContext()
      audioRef.current = context
      context.resume?.()
      const start = context.currentTime + 0.01
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = type
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + duration + 0.02)
    } catch {
      // Sound is a voluntary echo of a machine that is already legible.
    }
  }, [soundOn])

  const flashBlossom = useCallback((podId, kind) => {
    const node = blossomRefs.current[podId]
    if (!node) return
    node.classList.remove('is-true', 'is-hurt', 'is-shaded')
    // Force a reflow so a repeated flash of the same kind restarts its animation.
    void node.getBoundingClientRect().width
    node.classList.add(kind === 'true' ? 'is-true' : kind === 'shade' ? 'is-shaded' : 'is-hurt')
    window.setTimeout(() => node.classList.remove('is-true', 'is-hurt', 'is-shaded'), 620)
  }, [])

  const handleSeason = useCallback(() => {
    const current = worldRef.current
    const mastered = current.stage >= SEASONS.length - 1
    setWorld(previous => ({
      ...previous,
      stage: mastered ? previous.stage : previous.stage + 1,
      status: mastered ? 'mastered' : 'tending',
      heartwood: clamp(previous.heartwood + 1, 0, 9),
      log: [...previous.log, {
        id: `season-${Date.now()}`,
        stage: previous.stage + 1,
        text: SEASONS[Math.min(previous.stage, SEASONS.length - 1)].success
      }].slice(-5)
    }))
    setCelebration({ kind: mastered ? 'mastered' : 'season', label: SEASONS[Math.min(current.stage, SEASONS.length - 1)].success })
    setMessage(SEASONS[Math.min(current.stage, SEASONS.length - 1)].success)
    tone(392, 0.5, 'triangle', 0.07)
    window.setTimeout(() => tone(587.33, 0.6, 'sine', 0.05), 130)
    if (celebrationTimerRef.current) window.clearTimeout(celebrationTimerRef.current)
    celebrationTimerRef.current = window.setTimeout(() => setCelebration(null), reducedMotion ? 300 : 2400)
  }, [reducedMotion, tone])

  const handleHusk = useCallback((event) => {
    const current = worldRef.current
    const pod = podById(event.id)
    const husks = [...current.husks, { podId: event.id, arborId: event.arborId, station: event.station, at: Date.now() }]
    const ruined = husks.length >= MAX_HUSKS
    setWorld(previous => {
      const planted = { ...previous.planted }
      delete planted[event.id]
      return {
        ...previous,
        planted,
        husks: husks.slice(-MAX_HUSKS),
        status: ruined ? 'ruined' : previous.status,
        log: [...previous.log, {
          id: `husk-${Date.now()}`,
          stage: previous.stage,
          text: `the ${pod.label} went dark on ${arborById(event.arborId).short} // its husk stays in the plate`
        }].slice(-5)
      }
    })
    setMessage(ruined
      ? 'four husks have dried into the plate // the escapement keeps turning over a garden that cannot answer it'
      : `the ${pod.label} husked // replant it and correct the ring before the gate comes round again`)
    tone(92, 0.7, 'sawtooth', 0.05)
    const plate = plateRef.current
    if (plate && !reducedMotion) {
      plate.classList.add('is-shaken')
      window.setTimeout(() => plate.classList.remove('is-shaken'), 520)
    }
  }, [reducedMotion, tone])

  /** Single funnel for every worker frame, whether it came off-thread or not. */
  const onPayload = useCallback((payload) => {
    frameRef.current = payload.frame
    if (payload.probe) setForecast(payload.probe)

    payload.events.forEach((event) => {
      // One log line per event kind per pod per 20s window: the chronicle stays
      // readable while a repeated failure still re-announces itself later.
      const bucket = `${event.id}-${Math.floor((event.at || 0) / 20)}`

      if (event.kind === 'true') {
        flashBlossom(event.id, 'true')
        tone(podById(event.id).need >= 10 ? 174.61 : podById(event.id).need >= 4 ? 261.63 : 349.23, 0.24, 'sine', 0.045)
        pushLog(`the ${podById(event.id).label} drank on cadence // ${event.gap.toFixed(2)}s between lights`, `true-${bucket}`)
      }
      if (event.kind === 'seed') flashBlossom(event.id, 'true')
      if (event.kind === 'scorch') {
        flashBlossom(event.id, 'hurt')
        tone(110, 0.3, 'square', 0.035)
        pushLog(`the ${podById(event.id).label} scorched // the gate returned after ${event.gap.toFixed(2)}s, sooner than it can drink`, `scorch-${bucket}`)
      }
      if (event.kind === 'starve') {
        flashBlossom(event.id, 'hurt')
        pushLog(`the ${podById(event.id).label} waited ${event.gap.toFixed(2)}s for a ${podById(event.id).need}s appetite`, `starve-${bucket}`)
      }
      if (event.kind === 'shade') {
        flashBlossom(event.id, 'shade')
        tone(146.83, 0.2, 'triangle', 0.03)
        pushLog(`the ${podById(event.id).label} reached an occupied gate and was turned away`, `shade-${bucket}`)
      }
      if (event.kind === 'husk') handleHusk(event)
      if (event.kind === 'season') handleSeason()
    })
  }, [flashBlossom, handleHusk, handleSeason, pushLog, tone])

  useEffect(() => { frameHandlerRef.current = onPayload }, [onPayload])

  // Boot the escapement thread once. A refusing environment falls back to rAF.
  useEffect(() => {
    let worker = null
    try {
      worker = new Worker(new URL('./escapement/garden.worker.js', import.meta.url), { type: 'module' })
      worker.onmessage = (event) => frameHandlerRef.current(event.data)
      worker.onerror = () => {
        workerRef.current = null
        setOffThread(false)
      }
      workerRef.current = worker
      setOffThread(true)
    } catch {
      workerRef.current = null
      setOffThread(false)
    }
    return () => {
      try {
        worker?.postMessage({ type: 'stop' })
      } catch {
        // A terminated worker needs no farewell.
      }
      worker?.terminate()
      workerRef.current = null
    }
  }, [])

  useEffect(() => () => {
    if (celebrationTimerRef.current) window.clearTimeout(celebrationTimerRef.current)
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    audioRef.current?.close?.()
  }, [])

  const structureKey = useMemo(() => JSON.stringify({
    sockets: world.sockets,
    planted: world.planted,
    stage: world.stage,
    status: world.status,
    unlocked: world.unlocked,
    vow: world.vow
  }), [world.planted, world.sockets, world.stage, world.status, world.unlocked, world.vow])

  // Reseed the authoritative sim whenever structure changes, carrying live angles forward.
  useEffect(() => {
    const sim = seedSim(worldRef.current, frameRef.current)
    const frameInterval = reducedMotion ? 42 : 16
    if (workerRef.current) {
      fallbackSimRef.current = null
      workerRef.current.postMessage({ type: 'seed', sim, frameInterval })
      workerRef.current.postMessage({ type: 'input', input: inputRef.current })
    } else {
      fallbackSimRef.current = sim
      fallbackClockRef.current = performance.now()
    }
  }, [structureKey, reducedMotion])

  const sendInput = useCallback((patch) => {
    inputRef.current = { ...inputRef.current, ...patch }
    if (workerRef.current) workerRef.current.postMessage({ type: 'input', input: patch })
    else if (fallbackSimRef.current && typeof patch.gate === 'number') fallbackSimRef.current.gate = patch.gate
  }, [])

  // The only 60Hz path: imperative transforms, no reconciliation.
  useEffect(() => {
    let raf = 0
    const apply = () => {
      raf = requestAnimationFrame(apply)

      if (!workerRef.current && fallbackSimRef.current) {
        const now = performance.now()
        const elapsed = (now - fallbackClockRef.current) / 1000
        fallbackClockRef.current = now
        const events = stepGarden(fallbackSimRef.current, elapsed, inputRef.current)
        const payload = { type: 'frame', frame: frameOf(fallbackSimRef.current), events }
        if (now - fallbackProbeRef.current > 500) {
          fallbackProbeRef.current = now
          payload.probe = probe(fallbackSimRef.current)
        }
        frameHandlerRef.current(payload)
      }

      const frame = frameRef.current
      if (!frame) return

      frame.arbors.forEach((arbor) => {
        const degrees = (arbor.angle * 180) / Math.PI
        const ring = arborRefs.current[arbor.id]
        if (ring) ring.setAttribute('transform', `rotate(${degrees.toFixed(2)} ${CX} ${CY})`)
        const driven = cogRefs.current[`${arbor.id}:driven`]
        if (driven) driven.setAttribute('transform', `rotate(${(degrees * 2.4).toFixed(2)})`)
      })

      ARBORS.forEach((arbor, index) => {
        if (index === 0) return
        const previous = frame.arbors.find(entry => entry.id === ARBORS[index - 1].id)
        const node = cogRefs.current[`${arbor.id}:drive`]
        if (node && previous) node.setAttribute('transform', `rotate(${(((previous.angle * 180) / Math.PI) * 2.4).toFixed(2)})`)
      })

      if (gateRef.current) {
        gateRef.current.setAttribute('transform', `rotate(${((frame.gate * 180) / Math.PI).toFixed(2)} ${CX} ${CY})`)
      }

      frame.blossoms.forEach((blossom) => {
        const node = blossomRefs.current[blossom.id]
        if (!node) return
        node.style.setProperty('--vitality', blossom.vitality.toFixed(3))
        node.style.setProperty('--bloom', blossom.bloom.toFixed(3))
        if (blossom.inside) node.setAttribute('data-lit', 'true')
        else node.removeAttribute('data-lit')
      })

      if (springRef.current) {
        springRef.current.style.setProperty('--tension', frame.tension.toFixed(3))
      }
      if (holdRef.current) {
        holdRef.current.style.setProperty('--hold', (frame.holding / HOLD_REQUIRED).toFixed(3))
      }

      const now = performance.now()
      if (now - hudClockRef.current > 200) {
        hudClockRef.current = now
        setHud({
          tension: frame.tension,
          faltering: frame.faltering,
          stalled: frame.stalled,
          holding: frame.holding,
          gate: frame.gate,
          blossoms: frame.blossoms
        })
      }
    }
    raf = requestAnimationFrame(apply)
    return () => cancelAnimationFrame(raf)
  }, [])

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

  const wake = useCallback(() => {
    setWorld(previous => ({
      ...previous,
      unlocked: true,
      log: [...previous.log, {
        id: `wake-${Date.now()}`,
        stage: previous.stage,
        text: 'a hand reached past the glass; the barrel now spends itself on something that can die'
      }].slice(-5)
    }))
    setMessage('gear the verge ring to a four-breath turn, plant the emberbell on it, and hold the crank before the barrel runs dry')
    requestAnimationFrame(() => surfaceRef.current?.focus())
  }, [])

  const installCog = useCallback((cogId, arborId, role) => {
    const cog = cogById(cogId)
    const arbor = arborById(arborId)
    if (!cog || !arbor || arbor.fixed || !editable) return
    if (arbor.unlockedAt > worldRef.current.stage && worldRef.current.status !== 'mastered') return
    setWorld(previous => {
      const sockets = { ...previous.sockets }
      const owner = socketOwnerOf(sockets, cogId)
      if (owner) delete sockets[owner]
      sockets[socketKey(arborId, role)] = cogId
      return { ...previous, sockets }
    })
    setArmedCogId(null)
    setSelectedArborId(arborId)
    setMessage(`${cog.teeth}-tooth cog seated as the ${role} wheel of the ${arbor.label} // the train re-read itself immediately`)
    tone(220 + cog.teeth * 6, 0.16, 'triangle', 0.04)
  }, [editable, tone])

  const liftCog = useCallback((arborId, role) => {
    if (!editable) return
    const key = socketKey(arborId, role)
    if (!worldRef.current.sockets[key]) return
    setWorld(previous => {
      const sockets = { ...previous.sockets }
      delete sockets[key]
      return { ...previous, sockets }
    })
    setMessage(`${arborById(arborId).label} lost its ${role} wheel // every ring outboard of it has stopped`)
  }, [editable])

  const plantPod = useCallback((podId, arborId, station) => {
    const pod = podById(podId)
    const arbor = arborById(arborId)
    if (!pod || !arbor || !editable) return
    if (arbor.unlockedAt > worldRef.current.stage && worldRef.current.status !== 'mastered') return
    const slot = clamp(Math.round(station), 0, STATIONS - 1)
    const taken = Object.entries(worldRef.current.planted)
      .some(([otherId, seat]) => otherId !== podId && seat.arborId === arborId && seat.station === slot)
    if (taken) {
      setMessage(`station ${slot + 1} of the ${arbor.short} already holds a pod // choose another slot on the ring`)
      return
    }
    setWorld(previous => ({
      ...previous,
      planted: { ...previous.planted, [podId]: { arborId, station: slot } }
    }))
    setArmedPodId(null)
    setSelectedArborId(arborId)
    setMessage(`${pod.label} planted at station ${slot + 1} of the ${arbor.label} // it wants light every ${pod.need}s`)
    tone(330, 0.2, 'sine', 0.04)
  }, [editable, tone])

  const liftPod = useCallback((podId) => {
    if (!editable || !worldRef.current.planted[podId]) return
    setWorld(previous => {
      const planted = { ...previous.planted }
      delete planted[podId]
      return { ...previous, planted }
    })
    setMessage(`${podById(podId).label} lifted back into the pod tray // its vitality resets when replanted`)
  }, [editable])

  const rotateGate = useCallback((delta) => {
    const next = (frameRef.current?.gate ?? worldRef.current.gate) + delta
    setWorld(previous => ({ ...previous, gate: next }))
    sendInput({ gate: next })
  }, [sendInput])

  const setWinding = useCallback((winding) => {
    if (winding && !editable) return
    setWindingOn(winding)
    sendInput({ winding })
  }, [editable, sendInput])

  const chooseVow = useCallback((vowId) => {
    if (!editable || !VOWS[vowId] || world.stage < SEASONS.length - 1) return
    setWorld(previous => ({ ...previous, vow: vowId }))
    setMessage(`${VOWS[vowId].label} // ${VOWS[vowId].note}`)
  }, [editable, world.stage])

  const reset = useCallback(() => {
    loggedRef.current = new Set()
    frameRef.current = null
    setWorld(freshWorld())
    setSelectedArborId('verge')
    setArmedCogId(null)
    setArmedPodId(null)
    setDrag(null)
    setCelebration(null)
    setForecast(null)
    setMessage('clean brass replaces every gear ratio the garden had learned to survive')
  }, [])

  // ---- drag and drop -------------------------------------------------------

  const dropTargetAt = useCallback((clientX, clientY) => {
    const element = document.elementFromPoint(clientX, clientY)
    const socket = element?.closest?.('[data-socket]')?.dataset.socket
    if (socket) {
      const [arborId, role] = socket.split(':')
      return { kind: 'socket', arborId, role }
    }
    const point = svgPoint(clientX, clientY)
    if (!point) return null
    const radius = Math.hypot(point.x - CX, point.y - CY)
    const current = worldRef.current
    const arbor = ARBORS.find(entry => (
      (entry.unlockedAt <= current.stage || current.status === 'mastered')
      && Math.abs(radius - entry.radius) <= RING_BAND
      && !entry.fixed
    ))
    if (!arbor) return null
    const angle = Math.atan2(point.y - CY, point.x - CX)
    const ringAngle = frameRef.current?.arbors.find(entry => entry.id === arbor.id)?.angle ?? arbor.spoke
    const station = ((Math.round(((angle - ringAngle) / TAU) * STATIONS) % STATIONS) + STATIONS) % STATIONS
    return { kind: 'ring', arborId: arbor.id, station }
  }, [svgPoint])

  const beginDrag = useCallback((event, payload) => {
    if (!editable) return
    event.preventDefault()
    event.stopPropagation()
    const next = {
      ...payload,
      clientX: event.clientX,
      clientY: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      target: null
    }
    dragRef.current = next
    setDrag(next)
  }, [editable])

  useEffect(() => {
    if (!drag) return undefined

    const handleMove = (event) => {
      const current = dragRef.current
      if (!current) return
      const moved = current.moved
        || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > DRAG_THRESHOLD

      if (current.kind === 'gate') {
        const point = svgPoint(event.clientX, event.clientY)
        if (point) {
          // Stream to the escapement thread only; the frame drives the visual,
          // so dragging the gate never reconciles the whole plate.
          sendInput({ gate: Math.atan2(point.y - CY, point.x - CX) })
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
        target: moved ? dropTargetAt(event.clientX, event.clientY) : null
      }
      setDrag(dragRef.current)
    }

    const handleUp = (event) => {
      const current = dragRef.current
      if (!current) return

      if (current.kind === 'gate') {
        const settled = frameRef.current?.gate
        if (typeof settled === 'number') setWorld(previous => ({ ...previous, gate: settled }))
        setMessage('the light gate was re-hung // phase changed without touching a single ratio')
      }

      if (current.kind === 'cog') {
        const target = dropTargetAt(event.clientX, event.clientY)
        if (current.moved && target?.kind === 'socket') installCog(current.id, target.arborId, target.role)
        else if (current.moved) setMessage('the cog found no waiting socket // tap a cog, then tap a socket on the fan')
        else {
          setArmedCogId(previous => (previous === current.id ? null : current.id))
          setMessage(`${cogById(current.id).teeth}-tooth cog armed // tap a socket to seat it`)
        }
      }

      if (current.kind === 'pod') {
        const target = dropTargetAt(event.clientX, event.clientY)
        if (current.moved && target?.kind === 'ring') plantPod(current.id, target.arborId, target.station)
        else if (current.moved) setMessage('the pod found no ring // drop it onto a geared ring band, or use the station grid')
        else {
          setArmedPodId(previous => (previous === current.id ? null : current.id))
          setMessage(`${podById(current.id).label} armed // drop it on a ring or pick a station below`)
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
  }, [drag, dropTargetAt, installCog, plantPod, sendInput, svgPoint])

  const activateSocket = useCallback((arborId, role) => {
    if (suppressClickRef.current) return
    if (armedCogId) {
      installCog(armedCogId, arborId, role)
      return
    }
    setSelectedArborId(arborId)
    const cogId = worldRef.current.sockets[socketKey(arborId, role)]
    setMessage(cogId
      ? `${arborById(arborId).label} / ${role} wheel holds ${cogById(cogId).teeth} teeth // arm another cog to swap it`
      : `${arborById(arborId).label} / ${role} socket is empty // arm a cog from the rack`)
  }, [armedCogId, installCog])

  const handleSurfaceKeyDown = useCallback((event) => {
    if (event.target.closest('button, a, input, textarea, select')) return
    const step = event.shiftKey ? 0.02 : 0.09
    if (event.key === 'ArrowLeft') { event.preventDefault(); rotateGate(-step) }
    if (event.key === 'ArrowRight') { event.preventDefault(); rotateGate(step) }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      const pool = visibleArbors.filter(arbor => !arbor.fixed)
      if (!pool.length) return
      const index = Math.max(0, pool.findIndex(arbor => arbor.id === selectedArborId))
      const next = pool[(index + (event.key === 'ArrowDown' ? 1 : pool.length - 1)) % pool.length]
      setSelectedArborId(next.id)
      setMessage(`${next.label} selected // ${next.note}`)
    }
    if (event.key === ' ') {
      event.preventDefault()
      if (!inputRef.current.winding) setWinding(true)
    }
    if (event.key.toLowerCase() === 'c') {
      event.preventDefault()
      const index = Math.max(0, availableCogs.findIndex(cog => cog.id === armedCogId))
      const next = availableCogs[(index + 1) % availableCogs.length]
      setArmedCogId(next?.id || null)
      if (next) setMessage(`${next.teeth}-tooth cog armed from the keyboard // tap a socket`)
    }
    if (event.key.toLowerCase() === 'p') {
      event.preventDefault()
      const index = Math.max(0, availablePods.findIndex(pod => pod.id === armedPodId))
      const next = availablePods[(index + 1) % availablePods.length]
      setArmedPodId(next?.id || null)
      if (next) setMessage(`${next.label} armed from the keyboard // choose a station`)
    }
  }, [armedCogId, armedPodId, availableCogs, availablePods, rotateGate, selectedArborId, setWinding, visibleArbors])

  const handleSurfaceKeyUp = useCallback((event) => {
    if (event.key === ' ') setWinding(false)
  }, [setWinding])

  useEffect(() => {
    const release = () => setWinding(false)
    window.addEventListener('pointerup', release)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('pointerup', release)
      window.removeEventListener('blur', release)
    }
  }, [setWinding])

  // ---- derived narrative ---------------------------------------------------

  const guidance = useMemo(() => {
    if (!world.unlocked) {
      return { kind: 'sealed', title: 'the plate is still behind glass', detail: 'Nothing wilts until a hand enters.' }
    }
    if (world.status === 'ruined') {
      return { kind: 'ruined', title: 'the garden has no living answer left', detail: 'Strip the plate and begin a new train.' }
    }
    const missing = season.required.filter(podId => !world.planted[podId])
    const mismatched = seats.filter(entry => !entry.matched)

    if (hud?.stalled) {
      return {
        kind: 'spring',
        title: 'the barrel has run out',
        detail: 'Nothing turns, so nothing reaches the gate. Hold the crank until the spring has tension again.'
      }
    }
    if (mismatched.length) {
      const entry = mismatched[0]
      return {
        kind: 'gear',
        arborId: entry.arbor.id,
        title: entry.period === null
          ? `the ${entry.arbor.short} is not turning at all`
          : `the ${entry.arbor.short} turns every ${entry.period.toFixed(2)}s; the ${entry.pod.label} needs ${entry.pod.need}s`,
        detail: entry.period === null
          ? `Seat both cogs on the ${entry.arbor.label} — and on every ring inboard of it, since the train is serial.`
          : `Change the ratio: a drive wheel with fewer teeth than its driven wheel slows the ring down. You need a cumulative ${(6 / entry.pod.need).toFixed(3)}× the barrel.`
      }
    }
    if (missing.length) {
      const pod = podById(missing[0])
      return {
        kind: 'plant',
        podId: pod.id,
        title: `the ${pod.label} has not been planted`,
        detail: `${pod.note}. Drop it on a ring whose turn already matches, or use the station grid.`
      }
    }
    if (forecast?.shadeAt != null) {
      return {
        kind: 'shade',
        title: `two pods will reach the gate together in ${forecast.shadeAt.toFixed(1)}s`,
        detail: 'The gate admits one blossom at a time. Rotate the light gate or move a pod to another station until the forecast lanes stop colliding.'
      }
    }
    if (season.vow && !world.vow) {
      return {
        kind: 'vow',
        title: 'a garden that outlives its keeper needs a standing vow',
        detail: 'Choose what the custodian will favour once no hand is on the crank.'
      }
    }
    const holdingFor = hud?.holding || 0
    return {
      kind: 'ready',
      title: holdingFor > 0
        ? `every required bloom is open // holding ${holdingFor.toFixed(1)}s of ${HOLD_REQUIRED}s`
        : 'the train agrees with every appetite',
      detail: `Keep all ${season.required.length} required blooms above ${Math.round(BLOOM_THRESHOLD * 100)}% together for ${HOLD_REQUIRED}s and the season closes.`
    }
  }, [forecast, hud, season, seats, world.planted, world.status, world.unlocked, world.vow])

  const phase = world.status === 'mastered'
    ? 'perennial'
    : world.status === 'ruined'
      ? 'winter'
      : celebration
        ? 'cutting-heartwood'
        : hud?.stalled
          ? 'stalled'
          : hud?.faltering
            ? 'faltering'
            : guidance.kind === 'ready'
              ? 'in-cadence'
              : world.unlocked
                ? 'gearing'
                : 'sealed'

  const stationTaken = useCallback((arborId, station) => Object.entries(world.planted)
    .some(([podId, seat]) => seat.arborId === arborId && seat.station === station && podId !== armedPodId),
  [armedPodId, world.planted])

  const hudFor = useCallback((podId) => hud?.blossoms.find(blossom => blossom.id === podId) || null, [hud])
  const showStations = Boolean(armedPodId) || drag?.kind === 'pod'

  return (
    <div className={`eg-shell phase-${phase} ${narrow ? 'is-narrow' : ''} ${reducedMotion ? 'is-reduced-motion' : ''} ${vow ? `vow-${vow.id}` : ''}`}>
      <main
        ref={surfaceRef}
        className={`eg-surface ${drag ? 'is-dragging' : ''}`}
        tabIndex={0}
        onKeyDown={handleSurfaceKeyDown}
        onKeyUp={handleSurfaceKeyUp}
        data-playground-surface
        data-testid="escapement-garden-surface"
        aria-label="A continuously running gear-train orrery where planted blossoms must cross a light gate on the cadence their species needs"
      >
        <section className="eg-conservatory" aria-label="escapement plate">
          <div className="eg-corner-nav">
            <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          </div>

          <div className="eg-plaque">
            <span>living escapement / generation 249</span>
            <h1 style={{ color: experiment.color }}>{experiment.name}</h1>
            <p role="status">{message}</p>
          </div>

          <div className="eg-thread-badge" title={offThread ? 'physics integrate in a dedicated worker' : 'worker unavailable, integrating on the main thread'}>
            <i className={offThread ? 'is-off-thread' : ''} />
            {offThread ? 'escapement thread' : 'main-thread fallback'}
          </div>

          <div ref={plateRef} className="eg-plate-frame">
            <svg
              ref={svgRef}
              className="eg-plate"
              viewBox="0 0 860 860"
              preserveAspectRatio="xMidYMid meet"
              aria-label={`${visibleArbors.length - 1} geared rings, ${Object.keys(world.planted).length} planted pods, ${world.husks.length} husks`}
            >
              <defs>
                <radialGradient id="eg-plate-wash" cx="42%" cy="34%" r="78%">
                  <stop offset="0%" stopColor="#1d3833" />
                  <stop offset="58%" stopColor="#132523" />
                  <stop offset="100%" stopColor="#0a1516" />
                </radialGradient>
                <radialGradient id="eg-gate-wash" cx="50%" cy="50%" r="70%">
                  <stop offset="0%" stopColor="rgba(255, 233, 168, .5)" />
                  <stop offset="100%" stopColor="rgba(255, 210, 122, 0)" />
                </radialGradient>
                <filter id="eg-grain" x="-8%" y="-8%" width="116%" height="116%">
                  <feTurbulence type="fractalNoise" baseFrequency=".66" numOctaves="2" seed="249" result="noise" />
                  <feColorMatrix in="noise" type="saturate" values="0" result="grey" />
                  <feBlend in="SourceGraphic" in2="grey" mode="soft-light" />
                </filter>
                <filter id="eg-bloom-glow" x="-160%" y="-160%" width="420%" height="420%">
                  <feGaussianBlur stdDeviation="7" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              <circle className="eg-plate-ground" cx={CX} cy={CY} r={PLATE_R} fill="url(#eg-plate-wash)" filter="url(#eg-grain)" />
              <circle className="eg-plate-rim" cx={CX} cy={CY} r={PLATE_R} />

              {Array.from({ length: world.heartwood }, (_, index) => (
                <circle
                  key={`heartwood-${index}`}
                  className="eg-heartwood"
                  cx={CX}
                  cy={CY}
                  r={PLATE_R - 6 - index * 7}
                />
              ))}

              <g className="eg-gate-layer" ref={gateRef}>
                <path className="eg-gate-spill" d={wedgePath(62, PLATE_R - 4, GATE_HALF)} fill="url(#eg-gate-wash)" />
                <path className="eg-gate-edge" d={wedgePath(62, PLATE_R - 4, GATE_HALF)} />
                <line className="eg-gate-axis" x1={CX + 62} y1={CY} x2={CX + PLATE_R - 4} y2={CY} />
                <g
                  className={`eg-gate-grip ${drag?.kind === 'gate' ? 'is-held' : ''}`}
                  transform={`translate(${CX + PLATE_R - 30} ${CY})`}
                  role="button"
                  tabIndex={editable ? 0 : -1}
                  aria-label="Rotate the light gate. Drag, or use left and right arrow keys."
                  onPointerDown={(event) => beginDrag(event, { kind: 'gate' })}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      event.stopPropagation()
                      rotateGate(0.09)
                    }
                  }}
                >
                  <circle className="eg-grip-hit" r="46" />
                  <circle className="eg-grip-ring" r="24" />
                  <path className="eg-grip-arrows" d="M -11 -13 L -11 13 M 11 -13 L 11 13" />
                </g>
              </g>

              {visibleArbors.map((arbor) => {
                const entry = trainMap.get(arbor.id)
                const engaged = entry?.engaged && entry.cum !== 0
                const selected = selectedArborId === arbor.id
                return (
                  <g
                    key={`track-${arbor.id}`}
                    className={`eg-track ${engaged ? 'is-engaged' : 'is-idle'} ${selected ? 'is-selected' : ''} ${drag?.target?.kind === 'ring' && drag.target.arborId === arbor.id ? 'is-drop-target' : ''}`}
                    style={{ '--ring-color': arbor.color }}
                  >
                    <circle className="eg-track-bed" cx={CX} cy={CY} r={arbor.radius} />
                    <circle className="eg-track-line" cx={CX} cy={CY} r={arbor.radius} />
                  </g>
                )
              })}

              {/* Rotating ring contents: stations, blossoms and husks all ride their arbor. */}
              {visibleArbors.map((arbor) => {
                const entry = trainMap.get(arbor.id)
                const engaged = entry?.engaged && entry.cum !== 0
                return (
                  <g
                    key={`ring-${arbor.id}`}
                    className="eg-ring-content"
                    ref={(node) => { arborRefs.current[arbor.id] = node }}
                  >
                    {!arbor.fixed && showStations && Array.from({ length: STATIONS }, (_, station) => {
                      const seat = pointOn(arbor.radius, (station * TAU) / STATIONS)
                      const taken = stationTaken(arbor.id, station)
                      return (
                        <g
                          key={`station-${station}`}
                          className={`eg-station ${taken ? 'is-taken' : ''}`}
                          transform={`translate(${seat.x} ${seat.y})`}
                        >
                          <circle r="19" />
                          <text y="5">{station + 1}</text>
                        </g>
                      )
                    })}

                    {world.husks.filter(husk => husk.arborId === arbor.id).map((husk, index) => {
                      const seat = pointOn(arbor.radius, (husk.station * TAU) / STATIONS)
                      return (
                        <g key={`husk-${husk.podId}-${index}`} className="eg-husk" transform={`translate(${seat.x} ${seat.y})`}>
                          <path d="M -13 11 L -4 -9 L 3 5 L 11 -12 L 14 12 Z" />
                          <circle r="4" cy="13" />
                        </g>
                      )
                    })}

                    {seats.filter(item => item.seat.arborId === arbor.id).map((item) => {
                      const seat = pointOn(arbor.radius, (item.seat.station * TAU) / STATIONS)
                      const live = hudFor(item.pod.id)
                      return (
                        <g
                          key={`bloom-${item.pod.id}`}
                          ref={(node) => { blossomRefs.current[item.pod.id] = node }}
                          className={`eg-blossom ${item.matched ? 'is-tuned' : 'is-detuned'} ${engaged ? '' : 'is-becalmed'}`}
                          transform={`translate(${seat.x} ${seat.y})`}
                          style={{ '--pod-color': item.pod.color, '--vitality': live ? live.vitality : 0.6, '--bloom': live ? live.bloom : 0 }}
                          filter="url(#eg-bloom-glow)"
                        >
                          <title>{`${item.pod.label} on ${arbor.label}, station ${item.seat.station + 1}. Needs light every ${item.pod.need}s; this ring turns every ${item.period ? item.period.toFixed(2) : '—'}s.`}</title>
                          <Blossom pod={item.pod} radius={19} />
                        </g>
                      )
                    })}
                  </g>
                )
              })}

              {/* Gear fan: fixed sockets that visibly mesh between adjacent rings. */}
              {visibleArbors.filter(arbor => !arbor.fixed).map((arbor) => {
                const entry = trainMap.get(arbor.id)
                const fan = socketSeat(arbor)
                return (
                  <g key={`fan-${arbor.id}`} className={`eg-fan ${entry?.engaged ? 'is-engaged' : 'is-broken'}`} style={{ '--ring-color': arbor.color }}>
                    <line className="eg-mesh" x1={fan.drive.x} y1={fan.drive.y} x2={fan.driven.x} y2={fan.driven.y} />
                    {['drive', 'driven'].map((role) => {
                      const cogId = world.sockets[socketKey(arbor.id, role)]
                      const cog = cogId ? cogById(cogId) : null
                      const seat = fan[role]
                      const targeted = drag?.target?.kind === 'socket' && drag.target.arborId === arbor.id && drag.target.role === role
                      return (
                        <g
                          key={role}
                          className={`eg-socket ${cog ? 'is-filled' : 'is-empty'} ${targeted ? 'is-drop-target' : ''} ${armedCogId ? 'is-receptive' : ''}`}
                          transform={`translate(${seat.x} ${seat.y})`}
                          data-socket={`${arbor.id}:${role}`}
                          role="button"
                          tabIndex={editable ? 0 : -1}
                          aria-label={`${arbor.label} ${role} wheel. ${cog ? `Holds a ${cog.teeth}-tooth cog.` : 'Empty socket.'} Activate to ${armedCogId ? 'seat the armed cog' : 'select this ring'}.`}
                          onClick={(event) => {
                            event.stopPropagation()
                            activateSocket(arbor.id, role)
                          }}
                          onPointerDown={(event) => {
                            if (cog) beginDrag(event, { kind: 'cog', id: cog.id })
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              event.stopPropagation()
                              activateSocket(arbor.id, role)
                            }
                          }}
                        >
                          <circle className="eg-socket-hit" r="52" />
                          {cog ? (
                            <>
                              <g ref={(node) => { cogRefs.current[`${arbor.id}:${role}`] = node }}>
                                <path className="eg-cog-teeth" d={gearPath(cog.teeth, cogRadius(cog.teeth))} style={{ '--cog-color': cog.color }} />
                                <path className="eg-cog-spokes" d={`M ${-cogRadius(cog.teeth) * 0.5} 0 H ${cogRadius(cog.teeth) * 0.5} M 0 ${-cogRadius(cog.teeth) * 0.5} V ${cogRadius(cog.teeth) * 0.5}`} />
                              </g>
                              <circle className="eg-cog-bore" r="5" />
                              <text className="eg-cog-count" y={cogRadius(cog.teeth) + 17}>{cog.teeth}</text>
                            </>
                          ) : (
                            <>
                              <circle className="eg-socket-ghost" r="21" />
                              <text y="6">＋</text>
                              <text className="eg-socket-role" y={36}>{role}</text>
                            </>
                          )}
                        </g>
                      )
                    })}
                  </g>
                )
              })}

              {/* Mainspring barrel: the tension gauge is the machine's own coil. */}
              <g className="eg-barrel" ref={springRef}>
                <circle className="eg-barrel-shell" cx={CX} cy={CY} r="58" />
                {Array.from({ length: 5 }, (_, index) => (
                  <circle key={index} className="eg-coil" cx={CX} cy={CY} r={16 + index * 9} style={{ '--coil-index': index }} />
                ))}
                <circle className="eg-barrel-core" cx={CX} cy={CY} r="11" />
              </g>

              <g className="eg-hold-meter" ref={holdRef} transform={`translate(${CX} ${CY + 86})`} aria-hidden="true">
                <rect className="eg-hold-bed" x="-56" y="-4" width="112" height="8" rx="4" />
                <rect className="eg-hold-fill" x="-56" y="-4" height="8" rx="4" />
              </g>
            </svg>
          </div>

          <ol className="eg-chronicle" aria-label="glasshouse log">
            {world.log.slice(-3).reverse().map((entry, index) => (
              <li key={entry.id} style={{ opacity: 1 - index * 0.26 }}>
                <span>{String(entry.stage).padStart(2, '0')}</span>{entry.text}
              </li>
            ))}
          </ol>

          <div className="eg-husk-rail" aria-label={`${world.husks.length} of ${MAX_HUSKS} husks`}>
            <span>husks</span>
            {Array.from({ length: MAX_HUSKS }, (_, index) => (
              <i key={index} className={world.husks.length > index ? 'is-dried' : ''} />
            ))}
          </div>

          {!world.unlocked && (
            <div className="eg-seal">
              <div className="eg-seal-rings" aria-hidden="true"><i /><i /><i /><span>249</span></div>
              <p>UNTENDED ESCAPEMENT / LIVING INTERFACE 249</p>
              <h2>A gear ratio is a promise<br />about how often light returns.</h2>
              <button type="button" onClick={wake} data-playground-primary>
                reach past the glass
              </button>
              <small>gear the rings • plant the pods • rotate the gate • keep the barrel wound</small>
            </div>
          )}

          {celebration && (
            <div className={`eg-celebration is-${celebration.kind}`} role="status">
              <span>{celebration.kind === 'mastered' ? 'the last season closed' : 'heartwood ring cut'}</span>
              <strong>{celebration.label}</strong>
            </div>
          )}

          {world.status === 'mastered' && !celebration && (
            <div className="eg-outcome is-perennial">
              <span>mastery / three seasons / {world.heartwood} heartwood rings</span>
              <h2>THE GARDEN KEEPS ITS OWN CADENCE</h2>
              <p>{vow?.note}. The halo ring and its remaining cogs are unlocked — nothing is graded now, so gear the outermost patience and see what a twenty-four-breath appetite does to a plate that no longer needs you.</p>
              <div><button type="button" onClick={reset}>strip the plate</button></div>
            </div>
          )}

          {world.status === 'ruined' && (
            <div className="eg-outcome is-winter">
              <span>winter / four husks dried into the brass</span>
              <h2>THE ESCAPEMENT OUTLIVED ITS GARDEN</h2>
              <p>The rings still turn and the gate still opens on nothing. Every husk stayed where its cadence failed. Strip the plate to cut a new train.</p>
              <div><button type="button" onClick={reset}>strip the plate</button></div>
            </div>
          )}
        </section>

        <aside className="eg-bench" aria-label="gearing bench and pod tray">
          <section className="eg-season" aria-label="active season">
            <span>{season.label}</span>
            <h2>{season.title}</h2>
            <p>{season.instruction}</p>
          </section>

          <section className={`eg-diagnostic is-${guidance.kind}`} aria-live="polite">
            <span>the machine's own reading</span>
            <h3>{guidance.title}</h3>
            <p>{guidance.detail}</p>
          </section>

          <section className="eg-crank-console" aria-label="mainspring">
            <div className="eg-bench-heading">
              <span>mainspring barrel</span>
              <strong className={hud?.stalled ? 'is-alarm' : hud?.faltering ? 'is-warn' : ''}>
                {hud?.stalled ? 'run out' : hud?.faltering ? 'faltering' : 'in tension'}
              </strong>
            </div>
            <div className="eg-tension-bed">
              <div className="eg-tension-fill" style={{ width: `${Math.round((hud?.tension ?? 1) * 100)}%` }} />
              <i className="eg-falter-mark" />
            </div>
            <button
              type="button"
              className={`eg-crank ${windingOn ? 'is-winding' : ''}`}
              onPointerDown={() => setWinding(true)}
              onPointerUp={() => setWinding(false)}
              onPointerLeave={() => setWinding(false)}
              disabled={!editable}
              data-playground-action="wind-mainspring"
              aria-label="Hold to wind the mainspring. Space bar also winds."
            >
              <i>↻</i>
              <span><strong>hold to wind</strong><small>SPACE · {Math.round((hud?.tension ?? 1) * 100)}%</small></span>
            </button>
            <div className="eg-gate-row">
              <span>light gate</span>
              <button type="button" onClick={() => rotateGate(-0.12)} disabled={!editable} data-playground-action="rotate-gate" aria-label="Rotate the light gate counter-clockwise">↺</button>
              <b>{Math.round((((hud?.gate ?? world.gate) * 180) / Math.PI + 360) % 360)}°</b>
              <button type="button" onClick={() => rotateGate(0.12)} disabled={!editable} aria-label="Rotate the light gate clockwise">↻</button>
            </div>
          </section>

          <section className="eg-train" aria-label="gear train bench">
            <div className="eg-bench-heading">
              <span>gear train</span>
              <strong>{armedCogId ? `${cogById(armedCogId).teeth}t armed` : 'drag / tap'}</strong>
            </div>
            <div className="eg-train-list">
              {visibleArbors.filter(arbor => !arbor.fixed).map((arbor) => {
                const entry = trainMap.get(arbor.id)
                const period = entry ? periodFor(entry.cum) : null
                const riders = seats.filter(item => item.seat.arborId === arbor.id)
                return (
                  <button
                    type="button"
                    key={arbor.id}
                    className={`eg-train-row ${selectedArborId === arbor.id ? 'is-selected' : ''} ${entry?.engaged ? '' : 'is-broken'}`}
                    style={{ '--ring-color': arbor.color }}
                    onClick={() => {
                      setSelectedArborId(arbor.id)
                      setMessage(`${arbor.label} selected // ${arbor.note}`)
                    }}
                    aria-pressed={selectedArborId === arbor.id}
                  >
                    <i>{arbor.mark}</i>
                    <span>
                      <strong>{arbor.short}</strong>
                      <small>
                        {entry?.drive ? `${cogById(entry.drive).teeth}t` : '··'} → {entry?.driven ? `${cogById(entry.driven).teeth}t` : '··'}
                        {riders.length ? ` · ${riders.map(item => item.pod.short).join(' ')}` : ''}
                      </small>
                    </span>
                    <b className={riders.length && riders.every(item => item.matched) ? 'is-matched' : riders.length ? 'is-off' : ''}>
                      {period === null ? 'still' : `${period.toFixed(2)}s`}
                    </b>
                  </button>
                )
              })}
            </div>

            <div className="eg-socket-bench" aria-label={`${selectedArbor.label} sockets`}>
              {['drive', 'driven'].map((role) => {
                const cogId = world.sockets[socketKey(selectedArbor.id, role)]
                return (
                  <button
                    type="button"
                    key={role}
                    className={`eg-socket-slot ${cogId ? 'is-filled' : ''}`}
                    onClick={() => (armedCogId ? installCog(armedCogId, selectedArbor.id, role) : liftCog(selectedArbor.id, role))}
                    disabled={!editable || (!armedCogId && !cogId)}
                  >
                    <small>{role} wheel</small>
                    <strong>{cogId ? `${cogById(cogId).teeth} teeth` : armedCogId ? 'seat here' : 'empty'}</strong>
                  </button>
                )
              })}
            </div>

            <div className="eg-cog-rack">
              {availableCogs.map((cog) => {
                const owner = socketOwnerOf(world.sockets, cog.id)
                return (
                  <button
                    type="button"
                    key={cog.id}
                    className={`eg-cog-chip ${armedCogId === cog.id ? 'is-armed' : ''} ${owner ? 'is-seated' : ''}`}
                    style={{ '--cog-color': cog.color }}
                    disabled={!editable}
                    aria-pressed={armedCogId === cog.id}
                    data-playground-action="arm-cog"
                    onPointerDown={(event) => beginDrag(event, { kind: 'cog', id: cog.id })}
                    onClick={() => {
                      if (suppressClickRef.current || !editable) return
                      setArmedCogId(previous => (previous === cog.id ? null : cog.id))
                    }}
                  >
                    <i>{cog.teeth}</i>
                    <small>{owner ? `${arborById(owner.split(':')[0]).short} ${owner.split(':')[1]}` : 'loose'}</small>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="eg-tray" aria-label="pod tray">
            <div className="eg-bench-heading">
              <span>pod tray</span>
              <strong>{armedPodId ? `${podById(armedPodId).short} armed` : 'drag onto a ring'}</strong>
            </div>
            <div className="eg-pod-list">
              {availablePods.map((pod) => {
                const seat = world.planted[pod.id]
                const live = hudFor(pod.id)
                const required = season.required.includes(pod.id)
                return (
                  <div
                    key={pod.id}
                    className={`eg-pod ${seat ? 'is-planted' : ''} ${armedPodId === pod.id ? 'is-armed' : ''} ${required ? 'is-required' : ''}`}
                    style={{ '--pod-color': pod.color }}
                  >
                    <button
                      type="button"
                      className="eg-pod-grip"
                      disabled={!editable}
                      aria-pressed={armedPodId === pod.id}
                      data-playground-action="arm-pod"
                      onPointerDown={(event) => beginDrag(event, { kind: 'pod', id: pod.id })}
                      onClick={() => {
                        if (suppressClickRef.current || !editable) return
                        setArmedPodId(previous => (previous === pod.id ? null : pod.id))
                      }}
                    >
                      <i>{pod.mark}</i>
                      <span>
                        <strong>{pod.label}</strong>
                        <small>{seat ? `${arborById(seat.arborId).short} · station ${seat.station + 1}` : `wants light every ${pod.need}s`}</small>
                      </span>
                      <b>{pod.need}s</b>
                    </button>
                    {seat && (
                      <div className="eg-pod-vitals">
                        <div className="eg-vital">
                          <small>vitality</small>
                          <div><i style={{ width: `${Math.round(clamp(live?.vitality ?? 0, 0, 1) * 100)}%` }} /></div>
                        </div>
                        <div className="eg-vital is-bloom">
                          <small>bloom</small>
                          <div><i style={{ width: `${Math.round(clamp(live?.bloom ?? 0, 0, 1) * 100)}%` }} /></div>
                        </div>
                        <button type="button" onClick={() => liftPod(pod.id)} disabled={!editable}>lift</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="eg-station-grid" aria-label={`plant on ${selectedArbor.short}`}>
              <small>{armedPodId ? `plant ${podById(armedPodId).short} on ${selectedArbor.short} at` : `station grid · ${selectedArbor.short}`}</small>
              <div>
                {Array.from({ length: STATIONS }, (_, station) => (
                  <button
                    type="button"
                    key={station}
                    disabled={!editable || !armedPodId || selectedArbor.fixed || stationTaken(selectedArbor.id, station)}
                    onClick={() => plantPod(armedPodId, selectedArbor.id, station)}
                    data-playground-action="plant-pod"
                    aria-label={`Plant the armed pod at station ${station + 1} of the ${selectedArbor.label}`}
                  >
                    {station + 1}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="eg-forecast" aria-label="lookahead forecast">
            <div className="eg-bench-heading">
              <span>{PROBE_HORIZON}s lookahead</span>
              <strong className={forecast?.shadeAt != null ? 'is-warn' : ''}>
                {forecast?.shadeAt != null ? `shade in ${forecast.shadeAt.toFixed(1)}s` : 'no collisions'}
              </strong>
            </div>
            <div className="eg-lanes">
              {seats.length === 0 && <p className="eg-lanes-empty">plant a pod to see when the gate will reach it</p>}
              {seats.map((item) => {
                const lights = forecast?.lights?.[item.pod.id] || []
                return (
                  <div key={item.pod.id} className="eg-lane" style={{ '--pod-color': item.pod.color }}>
                    <b>{item.pod.short}</b>
                    <div className="eg-lane-track">
                      {lights.map((at, index) => (
                        <i key={index} style={{ left: `${(at / PROBE_HORIZON) * 100}%` }} />
                      ))}
                      {forecast?.shadeAt != null && (
                        <u style={{ left: `${(forecast.shadeAt / PROBE_HORIZON) * 100}%` }} />
                      )}
                    </div>
                    <small className={item.matched ? 'is-matched' : 'is-off'}>
                      {item.period === null ? 'still' : `${item.period.toFixed(2)}/${item.pod.need}s`}
                    </small>
                  </div>
                )
              })}
            </div>
          </section>

          {world.stage >= SEASONS.length - 1 && world.status !== 'ruined' && (
            <section className="eg-vows" aria-label="standing vow">
              <div className="eg-bench-heading">
                <span>standing vow</span>
                <strong>{vow ? vow.mark : 'choose one'}</strong>
              </div>
              <div>
                {Object.values(VOWS).map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    className={world.vow === option.id ? 'is-chosen' : ''}
                    style={{ '--vow-color': option.color }}
                    onClick={() => chooseVow(option.id)}
                    aria-pressed={world.vow === option.id}
                    data-playground-action="choose-vow"
                    disabled={!editable}
                  >
                    <i>{option.mark}</i><span>{option.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="eg-bench-foot">
            <button
              type="button"
              onClick={() => {
                setSoundOn(current => !current)
                setMessage(soundOn ? 'the plate returns to brass silence' : 'each light, scorch and shading will now sound its own interval')
              }}
              aria-pressed={soundOn}
            >
              {soundOn ? 'tone on' : 'tone off'}
            </button>
            <button type="button" onClick={reset}>strip plate</button>
            <small>{formatAge(savedAt)}</small>
          </div>

          <p className="eg-keys">
            drag cogs into sockets • drag pods onto ring bands • drag the gate grip • keys: ←→ gate, ↑↓ ring, C cog, P pod, hold SPACE to wind
          </p>
        </aside>

        {drag?.moved && (drag.kind === 'cog' || drag.kind === 'pod') && (
          <div
            className={`eg-drag-chip is-${drag.kind} ${drag.target ? 'is-targeting' : ''}`}
            style={{
              left: drag.clientX,
              top: drag.clientY,
              '--chip-color': drag.kind === 'cog' ? cogById(drag.id).color : podById(drag.id).color
            }}
            aria-hidden="true"
          >
            <i>{drag.kind === 'cog' ? cogById(drag.id).teeth : podById(drag.id).mark}</i>
            <span>
              {drag.target?.kind === 'socket'
                ? `seat in ${arborById(drag.target.arborId).short} ${drag.target.role}`
                : drag.target?.kind === 'ring'
                  ? `plant on ${arborById(drag.target.arborId).short} · station ${drag.target.station + 1}`
                  : drag.kind === 'cog' ? 'carry the cog' : 'carry the pod'}
            </span>
          </div>
        )}
      </main>
    </div>
  )
}

export { freshWorld, socketOwnerOf }
export default EscapementGarden
