import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ExperimentNav from '../../ExperimentNav'
import './RemainderTransit.css'

const STORAGE_KEY = 'clawed:remainder-transit:v1'
const VIEWBOX = { width: 1100, height: 720 }
const PORTRAIT_VIEWBOX = { width: 720, height: 1100 }
const PORTRAIT_SCALE = 0.84
const PORTRAIT_OFFSET = 100
const MAX_FRACTURES = 4
const TOUCH_HANDLE = 84

const CARRIAGES = [
  { id: 'intake', label: 'intake carriage', short: 'intake', mark: 'I', color: '#f0a54a', x: 86, y: 392, width: 252, height: 170, a: 8, b: 6, depth: 0 },
  { id: 'kiln', label: 'subtraction kiln', short: 'kiln', mark: 'K', color: '#e15f47', x: 286, y: 330, width: 246, height: 166, a: 10, b: 4, depth: 1 },
  { id: 'ledger', label: 'residue ledger', short: 'ledger', mark: 'L', color: '#6f88b8', x: 526, y: 178, width: 244, height: 168, a: 15, b: 4, depth: 2 },
  { id: 'gate', label: 'terminal gate', short: 'gate', mark: 'G', color: '#b6c85a', x: 814, y: 350, width: 232, height: 164, a: 17, b: 4, depth: 3 }
]

const COMMISSIONS = [
  {
    pair: [43, 30],
    target: 'gate',
    label: 'commission I / finite measure',
    instruction: 'route 43:30 through q1 → q2 → q3 → q4',
    remembered: 0,
    graft: false,
    release: { id: 'stamp-two', value: 2, label: 'borrowed double', mark: 'Ⅱ' },
    success: '43 and 30 surrendered a common unit // every used seam retained the order of crossing'
  },
  {
    pair: [51, 35],
    target: 'gate',
    label: 'commission II / elastic theorem',
    instruction: 're-cut the four cars for q1 → q2 → q5 → q3',
    remembered: 1,
    graft: false,
    release: { id: 'stamp-five', value: 5, label: 'fifth remainder', mark: 'Ⅴ' },
    success: 'the changed proof crossed an old seam // memory became transport instead of monument'
  },
  {
    pair: [65, 27],
    target: 'ledger',
    label: 'commission III / transplanted quotient',
    instruction: 'carry 65:27 through q2 → q2 → q2 → q5 using one graft',
    remembered: 1,
    graft: true,
    release: null,
    success: 'a portable quotient entered the theorem // the transit now composes proofs beyond its original metal'
  }
]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const carriageById = (id) => CARRIAGES.find(carriage => carriage.id === id)
const edgeIdFor = (left, right) => [left, right].sort().join('::')

const gcd = (a, b) => {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    ;[x, y] = [y, x % y]
  }
  return x || 1
}

const proofFor = (left, right) => {
  const steps = []
  let a = Math.max(left, right)
  let b = Math.min(left, right)
  let guard = 0
  while (b > 0 && guard < 8) {
    const q = Math.floor(a / b)
    const r = a % b
    steps.push({ index: guard, a, b, q, r })
    ;[a, b] = [b, r]
    guard += 1
  }
  return steps
}

const quotientFor = (pane) => Math.floor(Math.max(pane.a, pane.b) / Math.min(pane.a, pane.b))

const tileProofFor = (a, b) => {
  const tiles = []
  let x = 0
  let y = 0
  let width = Math.max(a, b)
  let height = Math.min(a, b)
  let step = 0
  while (width > 0 && height > 0 && step < 8) {
    const horizontal = width >= height
    const count = Math.floor((horizontal ? width : height) / (horizontal ? height : width))
    for (let index = 0; index < count; index += 1) {
      tiles.push(horizontal
        ? { x: x + index * height, y, size: height, step }
        : { x, y: y + index * width, size: width, step })
    }
    if (horizontal) {
      x += count * height
      width -= count * height
    } else {
      y += count * width
      height -= count * width
    }
    step += 1
  }
  return { tiles, width: Math.max(a, b), height: Math.min(a, b) }
}

const intersectionFor = (left, right) => {
  const x = Math.max(left.x, right.x)
  const y = Math.max(left.y, right.y)
  const width = Math.min(left.x + left.width, right.x + right.width) - x
  const height = Math.min(left.y + left.height, right.y + right.height) - y
  if (width <= 0 || height <= 0) return null
  return { x, y, width, height, area: width * height }
}

const distanceBetween = (left, right) => {
  const gapX = Math.max(left.x - (right.x + right.width), right.x - (left.x + left.width), 0)
  const gapY = Math.max(left.y - (right.y + right.height), right.y - (left.y + left.height), 0)
  return Math.hypot(gapX, gapY)
}

const deriveEdge = (left, right, world) => {
  const id = edgeIdFor(left.id, right.id)
  const seam = intersectionFor(left, right)
  const depthGap = Math.abs(left.depth - right.depth)
  const latch = world.latches[id]
  const stable = Boolean(seam && seam.width >= 22 && seam.height >= 22 && seam.area >= 1100 && depthGap <= 2)
  const distance = distanceBetween(left, right)
  const remembered = Boolean(latch?.memory)
  const elastic = remembered && !stable && distance <= 112 + latch.memory * 42 && depthGap <= 3
  return {
    id,
    left: left.id,
    right: right.id,
    seam,
    depthGap,
    stable,
    remembered,
    elastic,
    playable: stable || elastic,
    memory: latch?.memory || 0,
    crossings: latch?.crossings || 0,
    distance
  }
}

const freshWorld = () => ({
  version: 1,
  unlocked: false,
  panes: Object.fromEntries(CARRIAGES.map(carriage => [carriage.id, {
    x: carriage.x,
    y: carriage.y,
    width: carriage.width,
    height: carriage.height,
    a: carriage.a,
    b: carriage.b,
    depth: carriage.depth,
    scars: 0,
    inscriptions: 0,
    stampId: null
  }])),
  route: ['intake', 'kiln'],
  latches: {},
  stamps: [],
  stage: 0,
  fractures: 0,
  status: 'composing',
  passages: [],
  history: [],
  log: [{ id: 'sealed', stage: 0, text: 'two quotient cars are coupled; the unfinished proof waits beyond open rail' }],
  lastSaved: null
})

const cloneWorldSnapshot = (world) => ({
  panes: Object.fromEntries(Object.entries(world.panes).map(([id, pane]) => [id, { ...pane }])),
  route: [...world.route],
  latches: Object.fromEntries(Object.entries(world.latches).map(([id, latch]) => [id, { ...latch }])),
  stamps: world.stamps.map(stamp => ({ ...stamp })),
  stage: world.stage,
  fractures: world.fractures,
  status: world.status,
  passages: world.passages.map(passage => ({ ...passage, path: [...passage.path] })),
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
      panes: Object.fromEntries(CARRIAGES.map(carriage => [carriage.id, {
        ...fresh.panes[carriage.id],
        ...(saved.panes?.[carriage.id] || {})
      }])),
      route: Array.isArray(saved.route) ? saved.route.filter(id => carriageById(id)).slice(0, CARRIAGES.length) : fresh.route,
      latches: saved.latches && typeof saved.latches === 'object' ? saved.latches : {},
      stamps: Array.isArray(saved.stamps) ? saved.stamps.slice(0, 4) : [],
      passages: Array.isArray(saved.passages) ? saved.passages.slice(-6) : [],
      history: Array.isArray(saved.history) ? saved.history.slice(-10) : [],
      log: Array.isArray(saved.log) ? saved.log.slice(-8) : fresh.log
    }
  } catch {
    return fresh
  }
}

const deriveWorld = (world) => {
  const panes = CARRIAGES.map(carriage => ({ ...carriage, ...world.panes[carriage.id] }))
  const edges = []
  for (let leftIndex = 0; leftIndex < panes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < panes.length; rightIndex += 1) {
      edges.push(deriveEdge(panes[leftIndex], panes[rightIndex], world))
    }
  }
  return { panes, edges }
}

const effectiveQuotient = (pane, world) => {
  const stamp = world.stamps.find(option => option.id === pane.stampId)
  return stamp?.value || quotientFor(pane)
}

const validateRoute = (world, derived) => {
  const commission = COMMISSIONS[Math.min(world.stage, COMMISSIONS.length - 1)]
  const proof = proofFor(...commission.pair)
  const paneMap = new Map(derived.panes.map(pane => [pane.id, pane]))
  const edgeMap = new Map(derived.edges.map(edge => [edge.id, edge]))
  const route = world.route.filter(id => paneMap.has(id)).slice(0, proof.length)
  const beats = route.map((id, index) => {
    const pane = paneMap.get(id)
    const stamp = world.stamps.find(option => option.id === pane.stampId)
    return {
      id,
      pane,
      index,
      expected: proof[index]?.q,
      actual: effectiveQuotient(pane, world),
      stamp,
      correct: effectiveQuotient(pane, world) === proof[index]?.q
    }
  })
  const connections = route.slice(0, -1).map((id, index) => {
    const nextId = route[index + 1]
    const edge = edgeMap.get(edgeIdFor(id, nextId))
    return { index, from: id, to: nextId, edge, playable: Boolean(edge?.playable) }
  })
  const unique = new Set(route).size === route.length
  const complete = route.length === proof.length
  const starts = route[0] === 'intake'
  const arrives = route.at(-1) === commission.target
  const broken = connections.filter(connection => !connection.playable)
  const wrong = beats.filter(beat => !beat.correct)
  const rememberedCount = connections.filter(connection => connection.edge?.remembered && connection.playable).length
  const graftUsed = beats.some(beat => beat.stamp)
  const ready = Boolean(
    complete && unique && starts && arrives && broken.length === 0 && wrong.length === 0 &&
    rememberedCount >= commission.remembered && (!commission.graft || graftUsed)
  )
  return { commission, proof, route, beats, connections, unique, complete, starts, arrives, broken, wrong, rememberedCount, graftUsed, ready }
}

const arcBetween = (left, right, bend = 24) => {
  const x1 = left.x + left.width / 2
  const y1 = left.y + left.height / 2
  const x2 = right.x + right.width / 2
  const y2 = right.y + right.height / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy) || 1
  const cx = (x1 + x2) / 2 - dy / length * bend
  const cy = (y1 + y2) / 2 + dx / length * bend
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
}

const routePathFor = (route, positions) => route.map((id, index) => {
  const pane = positions[id]
  if (!pane) return ''
  const x = pane.x + pane.width / 2
  const y = pane.y + pane.height / 2
  if (index === 0) return `M ${x} ${y}`
  const prior = positions[route[index - 1]]
  const px = prior.x + prior.width / 2
  const py = prior.y + prior.height / 2
  return `Q ${(px + x) / 2} ${(py + y) / 2 + (index % 2 ? -24 : 24)} ${x} ${y}`
}).join(' ')

const formatAge = (timestamp) => {
  if (!timestamp) return 'unsaved'
  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s held`
  return `${Math.round(seconds / 60)}m held`
}

const ProofInterior = ({ pane, width, height, active }) => {
  const proof = tileProofFor(pane.a, pane.b)
  const top = TOUCH_HANDLE + 10
  const availableHeight = Math.max(28, height - top - 12)
  const scale = Math.min((width - 18) / proof.width, availableHeight / proof.height)
  const offsetX = (width - proof.width * scale) / 2
  const offsetY = top + (availableHeight - proof.height * scale) / 2
  return (
    <g className={`rt-proof-interior ${active ? 'is-active' : ''}`}>
      {proof.tiles.map((tile, index) => (
        <rect
          key={`${tile.step}-${index}`}
          x={offsetX + tile.x * scale}
          y={offsetY + tile.y * scale}
          width={Math.max(2, tile.size * scale)}
          height={Math.max(2, tile.size * scale)}
          style={{ '--tile-step': tile.step }}
        />
      ))}
      <path d={`M ${offsetX} ${offsetY + proof.height * scale + 6} H ${offsetX + proof.width * scale}`} />
    </g>
  )
}

const RemainderTransit = ({ category, experiment }) => {
  const [world, setWorld] = useState(loadWorld)
  const [selectedId, setSelectedId] = useState('intake')
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [armedStampId, setArmedStampId] = useState(null)
  const [drag, setDrag] = useState(null)
  const [stampDrag, setStampDrag] = useState(null)
  const [transit, setTransit] = useState(null)
  const [mutation, setMutation] = useState(null)
  const [message, setMessage] = useState(() => world.unlocked
    ? `commission ${world.stage + 1} resumed // the rail remembers ${Object.keys(world.latches).length} theorem seams`
    : 'four quotient cars wait under a proof that has not yet acquired distance')
  const [savedAt, setSavedAt] = useState(() => world.lastSaved)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [portrait, setPortrait] = useState(false)

  const surfaceRef = useRef(null)
  const svgRef = useRef(null)
  const worldRef = useRef(world)
  const dragRef = useRef(null)
  const stampDragRef = useRef(null)
  const transitTimerRef = useRef(null)
  const mutationTimerRef = useRef(null)
  const saveTimerRef = useRef(null)

  useEffect(() => { worldRef.current = world }, [world])

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const width = window.matchMedia('(max-width: 700px)')
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
        // The transit remains playable without local memory.
      }
    }, 180)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [world])

  useEffect(() => () => {
    if (transitTimerRef.current) window.clearTimeout(transitTimerRef.current)
    if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
  }, [])

  const derived = useMemo(() => deriveWorld(world), [world])
  const validation = useMemo(() => validateRoute(world, derived), [derived, world])
  const selectedPane = derived.panes.find(pane => pane.id === selectedId) || derived.panes[0]
  const commission = validation.commission
  const busy = Boolean(transit || mutation)

  const screenPane = useCallback((pane) => portrait ? {
    ...pane,
    x: pane.y,
    y: PORTRAIT_OFFSET + pane.x * PORTRAIT_SCALE,
    width: pane.height,
    height: pane.width * PORTRAIT_SCALE
  } : pane, [portrait])

  const screenSeam = useCallback((seam) => portrait && seam ? {
    ...seam,
    x: seam.y,
    y: PORTRAIT_OFFSET + seam.x * PORTRAIT_SCALE,
    width: seam.height,
    height: seam.width * PORTRAIT_SCALE
  } : seam, [portrait])

  const positions = useMemo(() => Object.fromEntries(
    derived.panes.map(pane => [pane.id, screenPane(pane)])
  ), [derived.panes, screenPane])

  const routePath = useMemo(() => routePathFor(validation.route, positions), [positions, validation.route])

  const phase = world.status === 'mastered'
    ? 'self-proving'
    : world.status === 'ruined'
      ? 'derailed'
      : mutation
        ? 'inscribing'
        : transit
          ? 'in-transit'
          : validation.ready
            ? 'coupled'
            : world.stage > 0
              ? 'recommissioned'
              : world.unlocked
                ? 'switching'
                : 'sealed'

  const svgPointFromClient = useCallback((clientX, clientY) => {
    const svg = svgRef.current
    if (!svg) return null
    const matrix = svg.getScreenCTM()
    if (!matrix) return null
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const screen = point.matrixTransform(matrix.inverse())
    return portrait ? { x: (screen.y - PORTRAIT_OFFSET) / PORTRAIT_SCALE, y: screen.x } : screen
  }, [portrait])

  const paneAtClient = useCallback((clientX, clientY) => {
    const point = svgPointFromClient(clientX, clientY)
    if (!point) return null
    return [...deriveWorld(worldRef.current).panes]
      .sort((left, right) => right.depth - left.depth)
      .find(pane => point.x >= pane.x && point.x <= pane.x + pane.width && point.y >= pane.y && point.y <= pane.y + pane.height)?.id || null
  }, [svgPointFromClient])

  const wake = useCallback(() => {
    setWorld(current => ({
      ...current,
      unlocked: true,
      log: [...current.log, { id: `wake-${Date.now()}`, stage: current.stage, text: 'the hand entered; division acquired rail and consequence' }].slice(-8)
    }))
    setMessage('cue all four cars in quotient order // drag their crowns until every consecutive pair can exchange a body')
    requestAnimationFrame(() => surfaceRef.current?.focus())
  }, [])

  const beginPaneDrag = useCallback((event, kind, id) => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'composing' || busy) return
    const point = svgPointFromClient(event.clientX, event.clientY)
    if (!point) return
    event.preventDefault()
    event.stopPropagation()
    const pane = current.panes[id]
    const next = {
      kind,
      id,
      startX: point.x,
      startY: point.y,
      originX: pane.x,
      originY: pane.y,
      originWidth: pane.width,
      originHeight: pane.height,
      moved: false
    }
    dragRef.current = next
    setDrag(next)
    setSelectedId(id)
  }, [busy, svgPointFromClient])

  useEffect(() => {
    if (!drag?.id) return undefined
    const handleMove = (event) => {
      const current = dragRef.current
      if (!current) return
      const point = svgPointFromClient(event.clientX, event.clientY)
      if (!point) return
      const moved = current.moved || Math.hypot(point.x - current.startX, point.y - current.startY) > 4
      const dx = point.x - current.startX
      const dy = point.y - current.startY
      setWorld(previous => {
        const pane = previous.panes[current.id]
        const nextPane = current.kind === 'resize'
          ? {
              ...pane,
              width: clamp(current.originWidth + dx, 174, 306),
              height: clamp(current.originHeight + dy, 138, 226)
            }
          : {
              ...pane,
              x: clamp(current.originX + dx, 18, VIEWBOX.width - pane.width - 18),
              y: clamp(current.originY + dy, 18, VIEWBOX.height - pane.height - 18)
            }
        return { ...previous, panes: { ...previous.panes, [current.id]: nextPane } }
      })
      const next = { ...current, moved }
      dragRef.current = next
      setDrag(next)
    }
    const handleUp = () => {
      const current = dragRef.current
      if (current?.moved) {
        const nextDerived = deriveWorld(worldRef.current)
        const live = nextDerived.edges.filter(edge => edge.stable).length
        const elastic = nextDerived.edges.filter(edge => edge.elastic).length
        setMessage(`${carriageById(current.id).label} ${current.kind === 'resize' ? 're-bodied' : 'switched'} // ${live} live couplings + ${elastic} elastic theorem bridges`)
      }
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
  }, [drag?.id, svgPointFromClient])

  const installStamp = useCallback((stampId, paneId) => {
    const current = worldRef.current
    const stamp = current.stamps.find(option => option.id === stampId)
    if (!stamp || !current.panes[paneId] || current.status !== 'composing' || busy) return
    setWorld(previous => ({
      ...previous,
      panes: Object.fromEntries(Object.entries(previous.panes).map(([id, pane]) => [id, {
        ...pane,
        stampId: id === paneId ? stampId : pane.stampId === stampId ? null : pane.stampId
      }]))
    }))
    setSelectedId(paneId)
    setArmedStampId(null)
    setMessage(`${stamp.label} pressed into ${carriageById(paneId).label} // its native quotient is now overridden by q${stamp.value}`)
  }, [busy])

  const beginStampDrag = useCallback((event, stampId) => {
    if (busy || worldRef.current.status !== 'composing') return
    event.preventDefault()
    const next = { id: stampId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false, targetId: null }
    stampDragRef.current = next
    setStampDrag(next)
    setArmedStampId(stampId)
  }, [busy])

  useEffect(() => {
    if (!stampDrag?.id) return undefined
    const handleMove = (event) => {
      const current = stampDragRef.current
      if (!current) return
      const moved = current.moved || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 6
      const next = { ...current, x: event.clientX, y: event.clientY, moved, targetId: moved ? paneAtClient(event.clientX, event.clientY) : null }
      stampDragRef.current = next
      setStampDrag(next)
    }
    const handleUp = (event) => {
      const current = stampDragRef.current
      if (!current) return
      const targetId = paneAtClient(event.clientX, event.clientY)
      if (current.moved && targetId) installStamp(current.id, targetId)
      else if (current.moved) setMessage('the borrowed quotient found no receiving carriage // tap the stamp, then tap a car')
      stampDragRef.current = null
      setStampDrag(null)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [installStamp, paneAtClient, stampDrag?.id])

  const selectPane = useCallback((paneId) => {
    if (armedStampId) {
      installStamp(armedStampId, paneId)
      return
    }
    setSelectedId(paneId)
    const pane = worldRef.current.panes[paneId]
    const native = quotientFor(pane)
    const effective = effectiveQuotient(pane, worldRef.current)
    setMessage(`${carriageById(paneId).label} selected // ${pane.a} = ${native}×${pane.b} + ${pane.a % pane.b}${effective !== native ? ` // graft speaks q${effective}` : ''}`)
  }, [armedStampId, installStamp])

  const appendRoute = useCallback((paneId = selectedId) => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'composing' || busy) return
    if (current.route.includes(paneId)) {
      setMessage(`${carriageById(paneId).short} already occupies a proof beat // reorder it instead of duplicating matter`)
      return
    }
    if (current.route.length >= 4) {
      setMessage('four cars fill the transit // lift or reorder one before cueing another')
      return
    }
    setWorld(previous => ({ ...previous, route: [...previous.route, paneId] }))
    setSelectedId(paneId)
    setSelectedRouteIndex(current.route.length)
    setMessage(`${carriageById(paneId).label} coupled at beat ${current.route.length + 1} // quotient and adjacency recalculated`)
  }, [busy, selectedId])

  const removeRouteAt = useCallback((index) => {
    if (index <= 0 || busy || worldRef.current.status !== 'composing') return
    setWorld(previous => ({ ...previous, route: previous.route.filter((_, routeIndex) => routeIndex !== index) }))
    setSelectedRouteIndex(Math.max(0, index - 1))
    setMessage('one carriage lifted from the proof // the arithmetic will not invent its replacement')
  }, [busy])

  const moveRouteBeat = useCallback((from, to) => {
    const current = worldRef.current
    if (from <= 0 || to <= 0 || from === to || to >= current.route.length || busy || current.status !== 'composing') return
    setWorld(previous => {
      const route = [...previous.route]
      const [beat] = route.splice(from, 1)
      route.splice(to, 0, beat)
      return { ...previous, route }
    })
    setSelectedRouteIndex(to)
    setMessage(`beat ${from + 1} switched to rail ${to + 1} // the traveling pair will encounter a different quotient`)
  }, [busy])

  const clearRoute = useCallback(() => {
    if (busy || worldRef.current.status !== 'composing') return
    setWorld(previous => ({ ...previous, route: ['intake'] }))
    setSelectedId('intake')
    setSelectedRouteIndex(0)
    setMessage('the train returned to intake // author the proof from its first division')
  }, [busy])

  const alterSelected = useCallback((change, copy) => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'composing' || busy) return
    setWorld(previous => ({
      ...previous,
      panes: {
        ...previous.panes,
        [selectedId]: { ...previous.panes[selectedId], ...change(previous.panes[selectedId], previous.panes) }
      }
    }))
    setMessage(copy)
  }, [busy, selectedId])

  const nudgeSelected = useCallback((dx, dy) => {
    alterSelected(pane => ({
      x: clamp(pane.x + dx, 18, VIEWBOX.width - pane.width - 18),
      y: clamp(pane.y + dy, 18, VIEWBOX.height - pane.height - 18)
    }), `${selectedPane.label} nudged // contact geometry re-read`)
  }, [alterSelected, selectedPane.label])

  const changeDimension = useCallback((axis, direction) => {
    alterSelected(pane => ({ [axis]: clamp(pane[axis] + direction, axis === 'a' ? 5 : 2, axis === 'a' ? 24 : 9) }), `${selectedPane.label} re-cut along ${axis} // its Euclidean interior and effective quotient changed`)
  }, [alterSelected, selectedPane.label])

  const shiftDepth = useCallback((direction) => {
    alterSelected((pane, panes) => ({
      depth: direction > 0
        ? Math.max(...Object.values(panes).map(item => item.depth)) + 1
        : Math.min(...Object.values(panes).map(item => item.depth)) - 1
    }), `${selectedPane.label} moved ${direction > 0 ? 'toward the hand' : 'beneath the rail'} // distant layers stress every coupling`)
  }, [alterSelected, selectedPane.label])

  const removeStamp = useCallback(() => {
    if (!selectedPane.stampId || busy) return
    setWorld(previous => ({
      ...previous,
      panes: { ...previous.panes, [selectedId]: { ...previous.panes[selectedId], stampId: null } }
    }))
    setMessage(`borrowed quotient lifted from ${selectedPane.label} // native q${quotientFor(selectedPane)} speaks again`)
  }, [busy, selectedId, selectedPane])

  const guidance = useMemo(() => {
    if (!validation.starts) return { kind: 'clear', title: 'the proof must enter through intake', detail: 'Clear the rail; intake is the fixed first operation.', action: 'return to intake' }
    if (!validation.unique) return { kind: 'clear', title: 'matter appears twice on one rail', detail: 'A carriage cannot perform two divisions without leaving and returning.', action: 'clear repeated route' }
    if (!validation.complete) {
      const expected = validation.proof[validation.route.length]?.q
      const candidate = derived.panes.find(pane => !validation.route.includes(pane.id) && effectiveQuotient(pane, world) === expected)
      return candidate
        ? { kind: 'cue', paneId: candidate.id, title: `beat ${validation.route.length + 1} needs q${expected}`, detail: `${candidate.label} already speaks q${expected}; couple it next.`, action: `cue ${candidate.short}` }
        : { kind: 'tune', paneId: derived.panes.find(pane => !validation.route.includes(pane.id))?.id, expected, title: `no free carriage speaks q${expected}`, detail: `Select an unused car and re-cut its long side to ${expected} times its short side.`, action: `prepare q${expected}` }
    }
    if (!validation.arrives) return { kind: 'target', paneId: commission.target, routeIndex: validation.route.indexOf(commission.target), title: `the proof must terminate at ${carriageById(commission.target).short}`, detail: 'Reorder the target into the final rail position.', action: `switch ${carriageById(commission.target).short} to final rail` }
    if (validation.wrong.length) {
      const beat = validation.wrong[0]
      return { kind: 'tune', paneId: beat.id, expected: beat.expected, title: `beat ${beat.index + 1} speaks q${beat.actual}, not q${beat.expected}`, detail: `Its local rectangle must confess quotient ${beat.expected}, or receive that borrowed stamp.`, action: `tune ${beat.pane.short} to q${beat.expected}` }
    }
    if (validation.broken.length) {
      const connection = validation.broken[0]
      return { kind: 'couple', paneId: connection.to, fromId: connection.from, title: `${carriageById(connection.from).short} cannot hand measure to ${carriageById(connection.to).short}`, detail: 'Overlap the two bodies with a substantial seam; remembered bridges may later stretch.', action: `couple ${carriageById(connection.to).short}` }
    }
    if (validation.rememberedCount < commission.remembered) {
      const rememberedEdge = derived.edges.find(edge => edge.remembered && edge.playable)
      return { kind: 'memory', paneId: rememberedEdge?.left, edgeId: rememberedEdge?.id, title: 'this route ignores its learned theorem', detail: rememberedEdge ? `Keep ${carriageById(rememberedEdge.left).short} and ${carriageById(rememberedEdge.right).short} consecutive so old architecture participates.` : 'Keep one previously inscribed pair consecutive so old architecture participates in the new proof.', action: rememberedEdge ? `select ${carriageById(rememberedEdge.left).short} / remembered pair` : 'inspect remembered rails' }
    }
    if (commission.graft && !validation.graftUsed) return { kind: 'stamp', stampId: world.stamps[0]?.id, title: 'the final commission requires transplanted arithmetic', detail: 'Drag a released quotient stamp into any cued car, or tap the stamp then the car.', action: 'arm a quotient stamp' }
    return { kind: 'ready', title: 'space and arithmetic agree', detail: 'The route can carry the pair through every subtraction. Performing will make each seam remember.', action: 'transit accepts the proof' }
  }, [commission, derived.panes, validation, world])

  const applyGuidance = useCallback(() => {
    if (busy) return
    if (guidance.kind === 'clear') {
      clearRoute()
      return
    }
    if (guidance.kind === 'cue' && guidance.paneId) {
      appendRoute(guidance.paneId)
      return
    }
    if (guidance.kind === 'target' && guidance.paneId) {
      setSelectedId(guidance.paneId)
      if (guidance.routeIndex > 0) moveRouteBeat(guidance.routeIndex, worldRef.current.route.length - 1)
      else setMessage(`${carriageById(guidance.paneId).label} selected // cue it as the final carriage`)
      return
    }
    if (guidance.kind === 'memory' && guidance.paneId) {
      setSelectedId(guidance.paneId)
      setMessage(`${carriageById(guidance.paneId).label} selected by the route inspector`)
      return
    }
    if (guidance.kind === 'tune' && guidance.paneId) {
      setSelectedId(guidance.paneId)
      setWorld(previous => {
        const pane = previous.panes[guidance.paneId]
        return { ...previous, panes: { ...previous.panes, [guidance.paneId]: { ...pane, a: clamp(guidance.expected * pane.b, 5, 24), stampId: null } } }
      })
      setMessage(`${carriageById(guidance.paneId).label} cut to q${guidance.expected} // remainder zero is allowed but not required by the rail`)
      return
    }
    if (guidance.kind === 'couple' && guidance.paneId && guidance.fromId) {
      setSelectedId(guidance.paneId)
      setWorld(previous => {
        const from = previous.panes[guidance.fromId]
        const pane = previous.panes[guidance.paneId]
        return {
          ...previous,
          panes: {
            ...previous.panes,
            [guidance.paneId]: {
              ...pane,
              x: clamp(from.x + from.width - 58, 18, VIEWBOX.width - pane.width - 18),
              y: clamp(from.y + 34, 18, VIEWBOX.height - pane.height - 18),
              depth: clamp(from.depth + 1, from.depth - 2, from.depth + 2)
            }
          }
        }
      })
      setMessage(`${carriageById(guidance.paneId).label} pulled onto the preceding rail // inspect the new seam`)
      return
    }
    if (guidance.kind === 'stamp' && guidance.stampId) {
      setArmedStampId(guidance.stampId)
      setMessage('borrowed quotient armed // tap any cued carriage to transplant it')
    }
  }, [appendRoute, busy, clearRoute, guidance, moveRouteBeat])

  const resolveTransit = useCallback((tested) => {
    transitTimerRef.current = null
    const current = worldRef.current
    if (current.status !== 'composing') {
      setTransit(null)
      return
    }
    if (tested.ready) {
      const mastered = current.stage >= COMMISSIONS.length - 1
      const record = { id: `transit-${Date.now()}`, stage: current.stage, path: [...tested.route], bornAt: Date.now(), pair: tested.commission.pair.join(':') }
      setWorld(previous => {
        const latches = { ...previous.latches }
        tested.connections.forEach(connection => {
          const id = edgeIdFor(connection.from, connection.to)
          const prior = latches[id] || { memory: 0, crossings: 0 }
          latches[id] = { memory: clamp(prior.memory + 1, 0, 3), crossings: prior.crossings + 1 }
        })
        const released = tested.commission.release && !previous.stamps.some(stamp => stamp.id === tested.commission.release.id)
          ? [...previous.stamps, tested.commission.release]
          : previous.stamps
        return {
          ...previous,
          stage: mastered ? previous.stage : previous.stage + 1,
          status: mastered ? 'mastered' : 'composing',
          route: mastered ? previous.route : ['intake'],
          latches,
          stamps: released,
          panes: Object.fromEntries(Object.entries(previous.panes).map(([id, pane]) => [id, {
            ...pane,
            inscriptions: pane.inscriptions + (tested.route.includes(id) ? 1 : 0)
          }])),
          passages: [...previous.passages, record].slice(-6),
          log: [...previous.log, { id: record.id, stage: previous.stage + 1, text: tested.commission.success }].slice(-8)
        }
      })
      setMutation({ id: record.id, path: [...tested.route], label: tested.commission.release ? `${tested.commission.release.label} released` : 'counterproof becoming native' })
      setMessage(`${tested.commission.success}${tested.commission.release ? ` // ${tested.commission.release.label} entered the stamp rack` : ''}`)
      setSelectedId(mastered ? 'ledger' : 'intake')
      setSelectedRouteIndex(0)
      setArmedStampId(null)
      mutationTimerRef.current = window.setTimeout(() => setMutation(null), reducedMotion ? 160 : 2200)
    } else {
      const fracture = current.fractures + 1
      const firstWrong = tested.wrong[0]
      const firstBroken = tested.broken[0]
      const scarId = firstWrong?.id || firstBroken?.to || tested.route.at(-1) || 'intake'
      setWorld(previous => ({
        ...previous,
        fractures: fracture,
        status: fracture >= MAX_FRACTURES ? 'ruined' : 'composing',
        panes: { ...previous.panes, [scarId]: { ...previous.panes[scarId], scars: previous.panes[scarId].scars + 1 } },
        log: [...previous.log, {
          id: `fracture-${Date.now()}`,
          stage: previous.stage,
          text: firstWrong
            ? `beat ${firstWrong.index + 1} divided by q${firstWrong.actual} where q${firstWrong.expected} was required`
            : firstBroken
              ? `${carriageById(firstBroken.from).short} could not hand the remainder to ${carriageById(firstBroken.to).short}`
              : 'the proof entered the rail with an incomplete body'
        }].slice(-8)
      }))
      setMessage(fracture >= MAX_FRACTURES
        ? 'four false divisions entered the axles // the transit can no longer distinguish theorem from collision'
        : firstWrong
          ? `beat ${firstWrong.index + 1} emitted q${firstWrong.actual}; commission requires q${firstWrong.expected} // the carriage scarred`
          : firstBroken
            ? `${carriageById(firstBroken.from).short} → ${carriageById(firstBroken.to).short} broke in open rail`
            : guidance.title)
    }
    setTransit(null)
  }, [guidance.title, reducedMotion])

  const performTransit = useCallback(() => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'composing' || busy) return
    const tested = validateRoute(current, deriveWorld(current))
    setWorld(previous => ({ ...previous, history: [...previous.history, cloneWorldSnapshot(previous)].slice(-10) }))
    setTransit({ ...tested, id: Date.now() })
    setMessage(tested.ready
      ? `${tested.commission.pair.join(':')} entering the authored rail // each quotient will consume the traveling remainder`
      : 'an unresolved proof entered the transit // the first contradiction will become physical damage')
    transitTimerRef.current = window.setTimeout(() => resolveTransit(tested), reducedMotion ? 120 : 1500)
  }, [busy, reducedMotion, resolveTransit])

  const rewind = useCallback(() => {
    if (transitTimerRef.current) window.clearTimeout(transitTimerRef.current)
    if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
    const current = worldRef.current
    const snapshot = current.history.at(-1)
    if (!snapshot) {
      setMessage('no earlier transit remains beneath the rail')
      return
    }
    setWorld(previous => ({ ...previous, ...snapshot, unlocked: true, history: previous.history.slice(0, -1) }))
    setTransit(null)
    setMutation(null)
    setSelectedId(snapshot.route.at(-1) || 'intake')
    setSelectedRouteIndex(Math.max(0, snapshot.route.length - 1))
    setMessage('one transit lifted // quotient cuts, theorem bridges, grafts, and scars returned together')
  }, [])

  const reset = useCallback(() => {
    if (transitTimerRef.current) window.clearTimeout(transitTimerRef.current)
    if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
    setWorld(freshWorld())
    setSelectedId('intake')
    setSelectedRouteIndex(0)
    setArmedStampId(null)
    setDrag(null)
    setStampDrag(null)
    setTransit(null)
    setMutation(null)
    setMessage('clean brass replaces every remembered quotient and collision')
  }, [])

  const handleSurfaceKeyDown = useCallback((event) => {
    if (event.target.closest('button, a, input, textarea, select')) return
    const step = event.shiftKey ? 3 : 12
    if (event.key === 'ArrowLeft') { event.preventDefault(); nudgeSelected(-step, 0) }
    if (event.key === 'ArrowRight') { event.preventDefault(); nudgeSelected(step, 0) }
    if (event.key === 'ArrowUp') { event.preventDefault(); nudgeSelected(0, -step) }
    if (event.key === 'ArrowDown') { event.preventDefault(); nudgeSelected(0, step) }
    if (event.key.toLowerCase() === 'a') { event.preventDefault(); changeDimension('a', event.shiftKey ? -1 : 1) }
    if (event.key.toLowerCase() === 'b') { event.preventDefault(); changeDimension('b', event.shiftKey ? -1 : 1) }
    if (event.key.toLowerCase() === 's') { event.preventDefault(); appendRoute() }
    if (event.key.toLowerCase() === 'r') { event.preventDefault(); clearRoute() }
    if (event.key === '[') { event.preventDefault(); shiftDepth(-1) }
    if (event.key === ']') { event.preventDefault(); shiftDepth(1) }
    if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); removeRouteAt(selectedRouteIndex) }
    if (event.key === ' ') { event.preventDefault(); performTransit() }
  }, [appendRoute, changeDimension, clearRoute, nudgeSelected, performTransit, removeRouteAt, selectedRouteIndex, shiftDepth])

  const diagnostic = validation.ready ? 'proof physically inhabitable' : guidance.title

  return (
    <div className={`rt-shell phase-${phase} ${portrait ? 'is-portrait' : ''} ${reducedMotion ? 'is-reduced-motion' : ''}`}>
      <header className="rt-crownbar">
        <div className="rt-nav"><ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} /></div>
        <div className="rt-title">
          <span>living theorem transit / generation 227</span>
          <h1 style={{ color: experiment.color }}>{experiment.name}</h1>
        </div>
        <div className="rt-memory"><i /> {world.passages.length} proofs // {formatAge(savedAt)}</div>
      </header>

      <main
        ref={surfaceRef}
        className={`rt-surface ${drag ? 'is-dragging' : ''}`}
        tabIndex={0}
        onKeyDown={handleSurfaceKeyDown}
        data-playground-surface
        data-testid="remainder-transit-surface"
        aria-label="Persistent SVG theorem transit built from draggable Euclidean quotient carriages"
      >
        <section className="rt-yard" aria-label="quotient carriage switching yard">
          <svg
            ref={svgRef}
            className="rt-map"
            viewBox={portrait ? `0 0 ${PORTRAIT_VIEWBOX.width} ${PORTRAIT_VIEWBOX.height}` : `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
            preserveAspectRatio="xMidYMid meet"
            aria-label={`${derived.edges.filter(edge => edge.stable).length} live couplings and ${derived.edges.filter(edge => edge.elastic).length} elastic theorem bridges`}
          >
            <defs>
              <pattern id="rt-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M 28 0 H 0 V 28" fill="none" stroke="rgba(236,222,185,.085)" strokeWidth=".8" />
                <circle cx="0" cy="0" r="1.4" fill="rgba(236,222,185,.18)" />
              </pattern>
              <pattern id="rt-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,.11)" strokeWidth="2" />
              </pattern>
              <filter id="rt-grain" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="2" seed="227" result="noise" />
                <feColorMatrix in="noise" type="saturate" values="0" result="gray" />
                <feBlend in="SourceGraphic" in2="gray" mode="soft-light" />
              </filter>
              <filter id="rt-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              {derived.panes.map(pane => {
                const screen = screenPane(pane)
                return <clipPath key={pane.id} id={`rt-clip-${pane.id}`}><rect width={screen.width} height={screen.height} rx="12" /></clipPath>
              })}
            </defs>

            <rect className="rt-ground" width={portrait ? PORTRAIT_VIEWBOX.width : VIEWBOX.width} height={portrait ? PORTRAIT_VIEWBOX.height : VIEWBOX.height} rx="26" />
            <rect className="rt-registration" x="18" y="18" width={(portrait ? PORTRAIT_VIEWBOX.width : VIEWBOX.width) - 36} height={(portrait ? PORTRAIT_VIEWBOX.height : VIEWBOX.height) - 36} rx="20" fill="url(#rt-grid)" />
            <path className="rt-dead-rail" d={portrait ? 'M 86 1004 C 118 786 560 694 620 430 C 654 280 558 146 346 64' : 'M 46 628 C 238 570 280 290 534 338 C 752 380 858 114 1052 92'} />
            <path className="rt-measure-axis" d={portrait ? 'M 82 950 H 640 M 82 708 H 640 M 82 466 H 640 M 82 224 H 640' : 'M 92 650 V 74 M 348 650 V 74 M 604 650 V 74 M 860 650 V 74'} />

            <g className="rt-ghost-proofs">
              {world.passages.map((passage, index) => {
                const path = routePathFor(passage.path, positions)
                return path ? <path key={passage.id} d={path} style={{ '--ghost-index': index }} /> : null
              })}
            </g>

            <g className="rt-couplings">
              {derived.edges.filter(edge => edge.stable || edge.remembered).map(edge => {
                const left = positions[edge.left]
                const right = positions[edge.right]
                const seam = screenSeam(edge.seam)
                const scored = validation.connections.some(connection => connection.edge?.id === edge.id)
                const mutating = mutation && validation.connections.some(connection => connection.edge?.id === edge.id)
                return (
                  <g key={edge.id} className={`${edge.stable ? 'is-live' : 'is-elastic'} ${edge.playable ? 'is-playable' : 'is-broken'} ${scored ? 'is-scored' : ''} ${mutating ? 'is-mutating' : ''}`}>
                    {edge.stable && seam && <rect className="rt-seam" x={seam.x} y={seam.y} width={seam.width} height={seam.height} rx="6" />}
                    {edge.remembered && (
                      <>
                        <path className="rt-memory-rail" d={arcBetween(left, right, 28 + edge.memory * 8)} />
                        <path className="rt-memory-rail is-return" d={arcBetween(left, right, -(18 + edge.memory * 6))} />
                        <g className="rt-memory-knot" transform={`translate(${(left.x + left.width / 2 + right.x + right.width / 2) / 2} ${(left.y + left.height / 2 + right.y + right.height / 2) / 2})`}>
                          <circle r={9 + edge.memory * 2} />
                          <text y="4">{edge.memory}</text>
                        </g>
                      </>
                    )}
                  </g>
                )
              })}
            </g>

            <g className="rt-authored-route">
              {validation.connections.map((connection, index) => {
                const left = positions[connection.from]
                const right = positions[connection.to]
                if (!left || !right) return null
                return <path key={`${connection.from}-${connection.to}`} className={`${connection.playable ? 'is-valid' : 'is-invalid'} ${connection.edge?.remembered ? 'is-remembered' : ''}`} d={arcBetween(left, right, (index % 2 ? -1 : 1) * (34 + index * 4))} />
              })}
              {validation.ready && routePath && <path className="rt-ready-route" d={routePath} />}
            </g>

            <g className="rt-pane-layer">
              {[...derived.panes].sort((left, right) => left.depth - right.depth).map((pane, paneIndex) => {
                const placement = screenPane(pane)
                const selected = selectedId === pane.id
                const beats = validation.beats.filter(beat => beat.id === pane.id)
                const beat = beats[0]
                const stamp = world.stamps.find(option => option.id === pane.stampId)
                const target = commission.target === pane.id
                const mutating = mutation?.path.includes(pane.id)
                const dragTarget = stampDrag?.targetId === pane.id
                return (
                  <g
                    key={pane.id}
                    className={`rt-pane ${selected ? 'is-selected' : ''} ${beat ? 'is-cued' : ''} ${beat && !beat.correct ? 'is-wrong' : ''} ${target ? 'is-target' : ''} ${mutating ? 'is-mutating' : ''} ${dragTarget ? 'is-stamp-target' : ''}`}
                    transform={`translate(${placement.x} ${placement.y})`}
                    style={{ '--pane-color': pane.color, '--pane-order': paneIndex }}
                    onClick={(event) => { event.stopPropagation(); selectPane(pane.id) }}
                  >
                    <title>{`${pane.label}. Native quotient ${quotientFor(pane)}. Effective quotient ${effectiveQuotient(pane, world)}. Layer ${pane.depth}. ${pane.inscriptions} proof inscriptions.`}</title>
                    <rect className="rt-pane-shadow" x="9" y="11" width={placement.width} height={placement.height} rx="13" />
                    <rect className="rt-pane-body" width={placement.width} height={placement.height} rx="13" filter="url(#rt-grain)" />
                    <g clipPath={`url(#rt-clip-${pane.id})`}>
                      <rect className="rt-pane-wash" width={placement.width} height={placement.height} />
                      <ProofInterior pane={pane} width={placement.width} height={placement.height} active={Boolean(beat) || pane.inscriptions > 0} />
                      <rect className="rt-pane-hatch" width={placement.width} height={placement.height} fill="url(#rt-hatch)" />
                    </g>
                    <rect className="rt-pane-border" width={placement.width} height={placement.height} rx="13" />

                    <g
                      className="rt-pane-crown"
                      role="button"
                      tabIndex={world.unlocked ? 0 : -1}
                      aria-label={`Move ${pane.label}. Quotient ${effectiveQuotient(pane, world)}. Large drag handle.`}
                      onPointerDown={(event) => beginPaneDrag(event, 'move', pane.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); selectPane(pane.id) }
                      }}
                    >
                      <rect width={placement.width} height={TOUCH_HANDLE} rx="13" />
                      <circle cx="31" cy={TOUCH_HANDLE / 2} r="13" />
                      <text x="55" y={TOUCH_HANDLE / 2 + 5}>{pane.mark} / {pane.short}</text>
                      <text className="rt-pane-quotient" x={placement.width - 16} y={TOUCH_HANDLE / 2 + 6}>q{effectiveQuotient(pane, world)}</text>
                    </g>

                    <g
                      className="rt-pane-resize"
                      transform={`translate(${placement.width - TOUCH_HANDLE} ${placement.height - TOUCH_HANDLE})`}
                      role="button"
                      tabIndex={world.unlocked ? 0 : -1}
                      aria-label={`Resize ${pane.label}. Large corner drag handle.`}
                      onPointerDown={(event) => beginPaneDrag(event, 'resize', pane.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); setSelectedId(pane.id); changeDimension('a', 1) }
                      }}
                    >
                      <rect width={TOUCH_HANDLE} height={TOUCH_HANDLE} rx="13" />
                      <path d={`M 24 ${TOUCH_HANDLE - 20} L ${TOUCH_HANDLE - 20} 24 M 43 ${TOUCH_HANDLE - 20} L ${TOUCH_HANDLE - 20} 43`} />
                    </g>

                    <g
                      className="rt-pane-cue"
                      transform={`translate(46 ${placement.height - 44})`}
                      role="button"
                      tabIndex={world.unlocked ? 0 : -1}
                      aria-label={`Cue ${pane.label} as next route beat`}
                      onClick={(event) => { event.stopPropagation(); appendRoute(pane.id) }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); appendRoute(pane.id) }
                      }}
                    >
                      <circle r="35" />
                      <path d="M -12 0 H 12 M 0 -12 V 12" />
                    </g>

                    {beat && <g className="rt-beat-flag" transform={`translate(${placement.width - 25} ${placement.height - 33})`}><circle r="19" /><text y="5">{beat.index + 1}</text></g>}
                    {stamp && <g className="rt-installed-stamp" transform={`translate(${placement.width - 36} ${TOUCH_HANDLE + 20})`}><circle r="19" /><text y="6">{stamp.mark}</text></g>}
                    {pane.inscriptions > 0 && <g className="rt-inscriptions" transform={`translate(22 ${TOUCH_HANDLE + 24})`}>{Array.from({ length: Math.min(3, pane.inscriptions) }, (_, index) => <path key={index} d={`M ${index * 13} 0 v 18`} />)}</g>}
                    {pane.scars > 0 && <path className="rt-scar" d={`M 18 ${placement.height - 62} l 19 15 -8 17 25 -11 16 13`} />}
                  </g>
                )
              })}
            </g>

            {transit && routePath && (
              <g key={transit.id} className={`${transit.ready ? 'rt-live-transit' : 'rt-live-transit is-breaking'}`} filter="url(#rt-glow)">
                <path d={routePath} />
                {!reducedMotion && (
                  <g>
                    <circle r="13" />
                    <path d="M -15 0 L 0 -9 L 15 0 L 0 9 Z" />
                    <animateMotion dur="1.38s" fill="freeze" path={routePath} />
                  </g>
                )}
              </g>
            )}
          </svg>

          <section className="rt-commission" aria-label="active Euclidean commission">
            <span>{commission.label}</span>
            <h2>{commission.pair[0]} : {commission.pair[1]}</h2>
            <p>{commission.instruction}</p>
            <div className="rt-equation-tape">
              {validation.proof.map((step, index) => {
                const beat = validation.beats[index]
                return (
                  <i key={step.index} className={`${beat?.correct ? 'is-matched' : ''} ${beat && !beat.correct ? 'is-wrong' : ''}`}>
                    <b>q{step.q}</b><small>{step.a}={step.q}×{step.b}{step.r ? `+${step.r}` : ''}</small>
                  </i>
                )
              })}
            </div>
          </section>

          <section className={`rt-inspector is-${guidance.kind}`} aria-label="first consequence inspector" aria-live="polite">
            <span>first consequence</span>
            <h2>{guidance.title}</h2>
            <p>{guidance.detail}</p>
            {guidance.kind !== 'ready' && (
              <button type="button" onClick={applyGuidance} disabled={busy} data-playground-action="repair-transit">
                {guidance.action}
              </button>
            )}
          </section>

          <ol className="rt-chronicle" aria-label="transit chronicle">
            {world.log.slice(-3).reverse().map((entry, index) => <li key={entry.id} style={{ opacity: 1 - index * 0.24 }}><span>{String(entry.stage).padStart(2, '0')}</span>{entry.text}</li>)}
          </ol>

          <div className="rt-fractures" aria-label={`${world.fractures} of ${MAX_FRACTURES} false divisions`}>
            <span>false divisions</span>
            {Array.from({ length: MAX_FRACTURES }, (_, index) => <i key={index} className={world.fractures > index ? 'is-broken' : ''} />)}
          </div>
        </section>

        <section className="rt-caliper-dock" aria-label="selected carriage calipers">
          <div className="rt-caliper-heading"><span>active car / {selectedPane.mark}</span><strong style={{ color: selectedPane.color }}>{selectedPane.short}</strong></div>
          <div className="rt-native-equation">
            <b>{selectedPane.a}</b><span>= q{quotientFor(selectedPane)} ×</span><b>{selectedPane.b}</b><span>+ {selectedPane.a % selectedPane.b}</span>
          </div>
          <div className="rt-cut-row">
            <button type="button" onClick={() => changeDimension('a', -1)} aria-label="Decrease long side">−</button>
            <span>long {selectedPane.a}<small>A / ⇧A</small></span>
            <button type="button" onClick={() => changeDimension('a', 1)} data-playground-action="recut-carriage" aria-label="Increase long side">＋</button>
          </div>
          <div className="rt-cut-row">
            <button type="button" onClick={() => changeDimension('b', -1)} aria-label="Decrease short side">−</button>
            <span>short {selectedPane.b}<small>B / ⇧B</small></span>
            <button type="button" onClick={() => changeDimension('b', 1)} aria-label="Increase short side">＋</button>
          </div>
          <div className="rt-layer-row">
            <button type="button" onClick={() => shiftDepth(-1)}>↓<small>bury</small></button>
            <button type="button" onClick={() => shiftDepth(1)}>↑<small>surface</small></button>
            <button type="button" onClick={removeStamp} disabled={!selectedPane.stampId}>◇<small>lift graft</small></button>
          </div>
          <div className="rt-nudge-grid" aria-label="Touch movement controls">
            <button type="button" onClick={() => nudgeSelected(0, -12)} aria-label="Move carriage up">↑</button>
            <button type="button" onClick={() => nudgeSelected(-12, 0)} aria-label="Move carriage left">←</button>
            <button type="button" onClick={() => nudgeSelected(12, 0)} aria-label="Move carriage right">→</button>
            <button type="button" onClick={() => nudgeSelected(0, 12)} aria-label="Move carriage down">↓</button>
          </div>
        </section>

        <section className="rt-route-deck" aria-label="authored proof route">
          <div className="rt-route-heading">
            <div><span>authored transit</span><strong>{diagnostic}</strong></div>
            <div className="rt-stamp-rack" aria-label="released quotient stamps">
              {world.stamps.length === 0 && <small>stamps release after proof I</small>}
              {world.stamps.map(stamp => {
                const installed = derived.panes.find(pane => pane.stampId === stamp.id)
                return (
                  <button
                    type="button"
                    key={stamp.id}
                    className={`${armedStampId === stamp.id ? 'is-armed' : ''} ${installed ? 'is-installed' : ''}`}
                    onClick={() => { setArmedStampId(armedStampId === stamp.id ? null : stamp.id); setMessage(`${stamp.label} ${armedStampId === stamp.id ? 'returned to the rack' : 'armed // tap a carriage to transplant q' + stamp.value}`) }}
                    onPointerDown={(event) => beginStampDrag(event, stamp.id)}
                    aria-pressed={armedStampId === stamp.id}
                    data-playground-action="graft-quotient"
                  >
                    <b>{stamp.mark}</b><span>q{stamp.value}</span><small>{installed ? installed.short : 'drag'}</small>
                  </button>
                )
              })}
            </div>
          </div>

          <ol className="rt-route-list">
            {validation.route.map((paneId, index) => {
              const pane = derived.panes.find(option => option.id === paneId)
              const beat = validation.beats[index]
              const incoming = index > 0 ? validation.connections[index - 1] : null
              return (
                <li key={paneId} className={`${selectedRouteIndex === index ? 'is-selected' : ''} ${beat?.correct ? 'is-correct' : 'is-wrong'} ${incoming && !incoming.playable ? 'is-broken' : ''}`} style={{ '--beat-color': pane.color }}>
                  {incoming && <i className={`rt-route-joint ${incoming.playable ? 'is-live' : ''} ${incoming.edge?.remembered ? 'is-remembered' : ''}`} />}
                  <button type="button" className="rt-route-beat" onClick={() => { setSelectedRouteIndex(index); setSelectedId(paneId); setMessage(`beat ${index + 1}: ${pane.label} // expected q${validation.proof[index]?.q}, effective q${beat?.actual}`) }} aria-pressed={selectedRouteIndex === index}>
                    <small>{String(index + 1).padStart(2, '0')}</small><strong>{pane.short}</strong><b>q{beat?.actual}</b>
                  </button>
                  <div className="rt-route-switches">
                    <button type="button" onClick={() => moveRouteBeat(index, index - 1)} disabled={index <= 1 || busy} aria-label={`Move ${pane.short} earlier`}>←</button>
                    <button type="button" onClick={() => moveRouteBeat(index, index + 1)} disabled={index <= 0 || index >= validation.route.length - 1 || busy} aria-label={`Move ${pane.short} later`}>→</button>
                    <button type="button" onClick={() => removeRouteAt(index)} disabled={index === 0 || busy} aria-label={`Remove ${pane.short}`}>×</button>
                  </div>
                </li>
              )
            })}
            {Array.from({ length: Math.max(0, 4 - validation.route.length) }, (_, index) => <li key={`empty-${index}`} className="is-empty"><span>open rail {validation.route.length + index + 1}</span></li>)}
          </ol>

          <div className="rt-route-actions">
            <button type="button" onClick={() => appendRoute()} disabled={!world.unlocked || world.route.length >= 4 || busy}><span>＋</span> cue {selectedPane.short}<small>S</small></button>
            <button type="button" onClick={clearRoute} disabled={busy}><span>↺</span> return intake<small>R</small></button>
          </div>

          <button
            type="button"
            className={`rt-perform ${validation.ready ? 'is-ready' : ''}`}
            onClick={performTransit}
            disabled={!world.unlocked || world.status !== 'composing' || busy}
            data-playground-action="perform-transit"
          >
            <span>{transit ? `${commission.pair.join(':')} moving` : mutation ? mutation.label : validation.ready ? 'rail accepts the proof' : `risk: ${guidance.title}`}</span>
            <strong>{transit ? 'IN TRANSIT…' : mutation ? 'INSCRIBING…' : 'SEND MEASURE'}</strong>
            <small>SPACE</small>
          </button>

          <div className="rt-history-tools"><button type="button" onClick={rewind} disabled={world.history.length === 0}>lift transit</button><button type="button" onClick={reset}>strip all rail</button></div>
        </section>

        {!world.unlocked && (
          <div className="rt-seal">
            <div className="rt-seal-machine" aria-hidden="true"><i /><i /><i /><i /><span>43:30</span></div>
            <p>UNCOMMISSIONED TRANSIT / LIVING INTERFACE 227</p>
            <h2>A remainder is not waste.<br />It is the next room asking to exist.</h2>
            <button type="button" onClick={wake} data-playground-primary>open the switching yard</button>
            <small>re-cut quotients • couple bodies • author rail • transplant learned arithmetic</small>
          </div>
        )}

        {world.status === 'mastered' && !mutation && (
          <div className="rt-outcome rt-outcome-mastered">
            <span>mastery / three commissions / {Object.keys(world.latches).length} theorem bridges</span>
            <h2>THE PROOF HAS LEARNED TO CHANGE TRAINS</h2>
            <p>Spatial couplings remembered sequence. Euclidean cuts became portable organs. The transit can now carry a ratio through architecture that was not present when its first theorem arrived.</p>
            <div><button type="button" onClick={rewind}>lift final transit</button><button type="button" onClick={reset}>strip the yard</button></div>
          </div>
        )}

        {world.status === 'ruined' && (
          <div className="rt-outcome rt-outcome-ruined">
            <span>failure / four false divisions entered the axles</span>
            <h2>THE RAIL REMEMBERED COLLISION AS LAW</h2>
            <p>Lift the last transit. Re-cut the first wrong quotient, close the first broken coupling, or transplant a released rule before moving the pair again.</p>
            <div><button type="button" onClick={rewind}>lift last fracture</button><button type="button" onClick={reset}>replace the rail</button></div>
          </div>
        )}

        {stampDrag?.moved && (
          <div className={`rt-drag-stamp ${stampDrag.targetId ? 'is-targeting' : ''}`} style={{ left: stampDrag.x, top: stampDrag.y }} aria-hidden="true">
            <b>{world.stamps.find(stamp => stamp.id === stampDrag.id)?.mark}</b>
            <span>{stampDrag.targetId ? `press into ${carriageById(stampDrag.targetId).short}` : 'carry quotient'}</span>
          </div>
        )}
      </main>
    </div>
  )
}

export { freshWorld, proofFor, deriveWorld, validateRoute }
export default RemainderTransit
