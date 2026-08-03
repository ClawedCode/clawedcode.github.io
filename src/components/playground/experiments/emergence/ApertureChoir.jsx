import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ExperimentNav from '../../ExperimentNav'
import './ApertureChoir.css'

const STORAGE_KEY = 'clawed:aperture-choir:v1'
const VIEWBOX = { width: 960, height: 620 }
const MOBILE_VIEWBOX = { width: 620, height: 960 }
const MAX_FRACTURES = 3

const VOICES = {
  shelter: { label: 'shelter', sigil: 'H', color: '#ed6a5a', tone: 146.83 },
  rain: { label: 'rain', sigil: 'R', color: '#5b8fb9', tone: 196 },
  memory: { label: 'memory', sigil: 'M', color: '#9270c9', tone: 246.94 },
  light: { label: 'light', sigil: 'L', color: '#f2c14e', tone: 293.66 },
  seed: { label: 'seed', sigil: 'S', color: '#74a84a', tone: 369.99 },
  chorus: { label: 'chorus', sigil: 'C', color: '#d96c9d', tone: 440 }
}

const PANES = [
  {
    id: 'threshold',
    label: 'threshold room',
    number: '01',
    native: 'shelter',
    x: 96,
    y: 392,
    width: 222,
    height: 150,
    depth: 0,
    unlockedAt: 0,
    note: 'keeps a body coherent while the house is still deciding'
  },
  {
    id: 'cistern',
    label: 'rain cistern',
    number: '02',
    native: 'rain',
    x: 232,
    y: 308,
    width: 248,
    height: 166,
    depth: 1,
    unlockedAt: 0,
    note: 'turns pressure into a navigable current'
  },
  {
    id: 'archive',
    label: 'fold archive',
    number: '03',
    native: 'memory',
    x: 420,
    y: 224,
    width: 246,
    height: 166,
    depth: 2,
    unlockedAt: 0,
    note: 'remembers the shape of every crossing'
  },
  {
    id: 'observatory',
    label: 'low observatory',
    number: '04',
    native: 'light',
    x: 680,
    y: 116,
    width: 208,
    height: 162,
    depth: 3,
    unlockedAt: 0,
    note: 'makes an exit visible before it exists'
  },
  {
    id: 'nursery',
    label: 'hinge nursery',
    number: '05',
    native: 'seed',
    x: 650,
    y: 402,
    width: 224,
    height: 154,
    depth: 4,
    unlockedAt: 1,
    note: 'germinates new rooms inside old boundaries'
  },
  {
    id: 'choir',
    label: 'impossible choir',
    number: '06',
    native: 'chorus',
    x: 354,
    y: 54,
    width: 226,
    height: 154,
    depth: 5,
    unlockedAt: 2,
    note: 'lets the architecture answer its inhabitant'
  }
]

const INLAYS = [
  { id: 'sun-film', label: 'sun film', voice: 'light', mark: '◐', note: 'adds a second light-bearing surface' },
  { id: 'root-index', label: 'root index', voice: 'seed', mark: '⌇', note: 'makes one room capable of germination' },
  { id: 'rain-skin', label: 'rain skin', voice: 'rain', mark: '≋', note: 'carries weather through a dry seam' },
  { id: 'fossil-leaf', label: 'fossil leaf', voice: 'memory', mark: '§', note: 'lets a young room remember an old route' }
]

const STAGES = [
  {
    target: 'observatory',
    label: 'first crossing',
    instruction: 'dock a continuous house from threshold to observatory',
    needs: ['shelter', 'rain', 'memory', 'light'],
    success: 'the inhabitant found the sky // a fifth room germinated below the route'
  },
  {
    target: 'nursery',
    label: 'second crossing',
    instruction: 'rewire the house toward the new nursery',
    needs: ['shelter', 'rain', 'light', 'seed'],
    success: 'the nursery held a name // a room began singing above the remembered route'
  },
  {
    target: 'choir',
    label: 'last crossing',
    instruction: 'compose one path that can shelter, remember, seed, and answer',
    needs: ['shelter', 'memory', 'seed', 'chorus'],
    success: 'the route returned its own voice // interface and inhabitant became one weather'
  }
]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const paneById = (id) => PANES.find(pane => pane.id === id)
const inlayById = (id) => INLAYS.find(inlay => inlay.id === id)

const freshWorld = () => ({
  version: 1,
  unlocked: false,
  panes: Object.fromEntries(PANES.map(pane => [pane.id, {
    x: pane.x,
    y: pane.y,
    width: pane.width,
    height: pane.height,
    depth: pane.depth,
    inhabited: 0,
    scars: 0
  }])),
  inlays: {},
  stage: 0,
  status: 'composing',
  fractures: 0,
  passages: [],
  history: [],
  log: [
    { id: 'sealed', stage: 0, text: 'four windows wait for a body to make them adjacent' }
  ],
  lastSaved: null
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
      panes: Object.fromEntries(PANES.map(pane => [pane.id, {
        ...fresh.panes[pane.id],
        ...(saved.panes?.[pane.id] || {})
      }])),
      inlays: saved.inlays && typeof saved.inlays === 'object' ? saved.inlays : {},
      passages: Array.isArray(saved.passages) ? saved.passages.slice(-8) : [],
      history: Array.isArray(saved.history) ? saved.history.slice(-10) : [],
      log: Array.isArray(saved.log) ? saved.log.slice(-8) : fresh.log
    }
  } catch {
    return fresh
  }
}

const snapshotWorld = (world) => ({
  panes: Object.fromEntries(Object.entries(world.panes).map(([id, pane]) => [id, { ...pane }])),
  inlays: { ...world.inlays },
  stage: world.stage,
  status: world.status,
  fractures: world.fractures,
  passages: world.passages.map(passage => ({ ...passage, path: [...passage.path] })),
  log: world.log.map(entry => ({ ...entry }))
})

const formatAge = (timestamp) => {
  if (!timestamp) return 'unremembered'
  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s held`
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes}m held` : `${Math.round(minutes / 60)}h held`
}

const intersectionFor = (left, right) => {
  const x = Math.max(left.x, right.x)
  const y = Math.max(left.y, right.y)
  const width = Math.min(left.x + left.width, right.x + right.width) - x
  const height = Math.min(left.y + left.height, right.y + right.height) - y
  if (width <= 0 || height <= 0) return null
  return { x, y, width, height, area: width * height }
}

const deriveHouse = (world) => {
  const panes = PANES
    .filter(pane => pane.unlockedAt <= world.stage || world.status === 'mastered')
    .map(pane => ({ ...pane, ...world.panes[pane.id] }))
  const edges = []

  for (let leftIndex = 0; leftIndex < panes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < panes.length; rightIndex += 1) {
      const left = panes[leftIndex]
      const right = panes[rightIndex]
      const intersection = intersectionFor(left, right)
      if (!intersection) continue
      const depthGap = Math.abs(left.depth - right.depth)
      const stable = intersection.width >= 18 && intersection.height >= 18 && intersection.area >= 900 && depthGap <= 2
      const smallerArea = Math.min(left.width * left.height, right.width * right.height)
      edges.push({
        id: `${left.id}-${right.id}`,
        left: left.id,
        right: right.id,
        intersection,
        depthGap,
        stable,
        strength: clamp(intersection.area / (smallerArea * 0.28), 0, 1)
      })
    }
  }

  return { panes, edges }
}

const voicesForPane = (paneId, world) => {
  const pane = paneById(paneId)
  const inlay = Object.entries(world.inlays).find(([, targetId]) => targetId === paneId)?.[0]
  return [...new Set([pane.native, inlayById(inlay)?.voice].filter(Boolean))]
}

const routeForStage = (world, house) => {
  const stage = STAGES[Math.min(world.stage, STAGES.length - 1)]
  const target = stage.target
  const needs = stage.needs
  const fullMask = (1 << needs.length) - 1
  const adjacency = Object.fromEntries(house.panes.map(pane => [pane.id, []]))

  house.edges.filter(edge => edge.stable).forEach(edge => {
    adjacency[edge.left]?.push(edge.right)
    adjacency[edge.right]?.push(edge.left)
  })

  const maskFor = (paneId) => voicesForPane(paneId, world).reduce((mask, voice) => {
    const index = needs.indexOf(voice)
    return index < 0 ? mask : mask | (1 << index)
  }, 0)
  const queue = [{ node: 'threshold', mask: maskFor('threshold'), path: ['threshold'] }]
  let fallback = null
  let furthest = queue[0]

  while (queue.length) {
    const current = queue.shift()
    if (current.path.length > furthest.path.length) furthest = current
    if (current.node === target) {
      if (!fallback) fallback = current
      if ((current.mask & fullMask) === fullMask) {
        return {
          path: current.path,
          ready: true,
          connected: true,
          collected: needs.filter((_, index) => current.mask & (1 << index)),
          missing: []
        }
      }
    }

    ;(adjacency[current.node] || []).forEach(next => {
      if (current.path.includes(next)) return
      const mask = current.mask | maskFor(next)
      queue.push({ node: next, mask, path: [...current.path, next] })
    })
  }

  const result = fallback || furthest
  return {
    path: result?.path || ['threshold'],
    ready: false,
    connected: Boolean(fallback),
    collected: needs.filter((_, index) => (result?.mask || 0) & (1 << index)),
    missing: needs.filter((_, index) => !((result?.mask || 0) & (1 << index)))
  }
}

const pathThrough = (path, positions) => {
  if (!path.length) return ''
  return path.map((id, index) => {
    const pane = positions[id]
    if (!pane) return ''
    const x = pane.x + pane.width / 2
    const y = pane.y + pane.height / 2
    if (index === 0) return `M ${x} ${y}`
    const previous = positions[path[index - 1]]
    const previousX = previous.x + previous.width / 2
    const previousY = previous.y + previous.height / 2
    const bend = (index % 2 ? 1 : -1) * 18
    const midX = (previousX + x) / 2 - (y - previousY) * 0.08
    const midY = (previousY + y) / 2 + (x - previousX) * 0.08 + bend
    return `Q ${midX} ${midY} ${x} ${y}`
  }).join(' ')
}

const PaneInterior = ({ pane, width, height, active }) => {
  const voice = VOICES[pane.native]
  const centerX = width / 2
  const centerY = height / 2 + 8

  return (
    <g className={`ac-pane-interior is-${pane.native} ${active ? 'is-active' : ''}`}>
      {pane.native === 'shelter' && (
        <>
          <path d={`M 24 ${height - 28} V ${centerY} L ${centerX} 32 L ${width - 24} ${centerY} V ${height - 28}`} />
          <path d={`M ${centerX - 24} ${height - 28} V ${centerY + 12} H ${centerX + 24} V ${height - 28}`} />
          <circle cx={centerX} cy={centerY - 12} r="9" />
        </>
      )}
      {pane.native === 'rain' && Array.from({ length: 5 }, (_, index) => (
        <path key={index} d={`M 20 ${40 + index * 22} C ${centerX * 0.7} ${26 + index * 23}, ${centerX * 1.35} ${57 + index * 19}, ${width - 18} ${39 + index * 21}`} />
      ))}
      {pane.native === 'memory' && (
        <>
          {Array.from({ length: 5 }, (_, index) => <rect key={index} x={28 + index * 34} y={42 + (index % 2) * 12} width="24" height={height - 78 - (index % 2) * 12} />)}
          <path d={`M 22 ${height - 34} Q ${centerX} ${height - 62} ${width - 20} ${height - 34}`} />
        </>
      )}
      {pane.native === 'light' && (
        <>
          <circle cx={centerX} cy={centerY} r={Math.min(width, height) * 0.22} />
          <circle cx={centerX} cy={centerY} r={Math.min(width, height) * 0.34} />
          {Array.from({ length: 8 }, (_, index) => {
            const angle = index * Math.PI / 4
            return <line key={index} x1={centerX + Math.cos(angle) * 24} y1={centerY + Math.sin(angle) * 24} x2={centerX + Math.cos(angle) * 54} y2={centerY + Math.sin(angle) * 54} />
          })}
        </>
      )}
      {pane.native === 'seed' && (
        <>
          <path d={`M ${centerX} ${height - 24} C ${centerX - 8} ${centerY + 12}, ${centerX + 16} ${centerY - 12}, ${centerX} 38`} />
          <path d={`M ${centerX} ${centerY + 12} Q ${centerX - 54} ${centerY - 2} ${centerX - 62} 42 Q ${centerX - 14} 43 ${centerX} ${centerY + 12}`} />
          <path d={`M ${centerX + 2} ${centerY - 8} Q ${centerX + 52} ${centerY - 30} ${centerX + 64} 38 Q ${centerX + 20} 38 ${centerX + 2} ${centerY - 8}`} />
          <circle cx={centerX} cy={height - 24} r="8" />
        </>
      )}
      {pane.native === 'chorus' && (
        <>
          {Array.from({ length: 5 }, (_, index) => (
            <path key={index} d={`M 20 ${centerY + (index - 2) * 18} C ${centerX * 0.55} ${centerY + (index - 2) * 30}, ${centerX * 1.45} ${centerY - (index - 2) * 30}, ${width - 20} ${centerY + (index - 2) * 18}`} />
          ))}
          <circle cx={centerX} cy={centerY} r="13" />
        </>
      )}
      <text className="ac-native-mark" x={width - 25} y={height - 20}>{voice.sigil}</text>
    </g>
  )
}

const ApertureChoir = ({ category, experiment }) => {
  const [world, setWorld] = useState(loadWorld)
  const [selectedPaneId, setSelectedPaneId] = useState('threshold')
  const [selectedInlayId, setSelectedInlayId] = useState(null)
  const [message, setMessage] = useState(() => (
    world.unlocked
      ? `house resumed at crossing ${Math.min(world.stage + 1, 3)} // remembered apertures remain movable`
      : 'the house exists as six windows that have never shared a wall'
  ))
  const [drag, setDrag] = useState(null)
  const [passage, setPassage] = useState(null)
  const [savedAt, setSavedAt] = useState(() => world.lastSaved)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [soundOn, setSoundOn] = useState(false)

  const surfaceRef = useRef(null)
  const svgRef = useRef(null)
  const worldRef = useRef(world)
  const dragRef = useRef(null)
  const saveTimerRef = useRef(null)
  const passageTimerRef = useRef(null)
  const audioContextRef = useRef(null)

  useEffect(() => {
    worldRef.current = world
  }, [world])

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const width = window.matchMedia('(max-width: 640px)')
    const updateMotion = () => setReducedMotion(motion.matches)
    const updateWidth = () => setNarrow(width.matches)
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
        // The house can remain momentary when browser storage is unavailable.
      }
    }, 180)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [world])

  useEffect(() => () => {
    if (passageTimerRef.current) window.clearTimeout(passageTimerRef.current)
    audioContextRef.current?.close?.()
  }, [])

  const house = useMemo(() => deriveHouse(world), [world])
  const route = useMemo(() => routeForStage(world, house), [house, world])
  const currentStage = STAGES[Math.min(world.stage, STAGES.length - 1)]
  const selectedPane = paneById(selectedPaneId) || PANES[0]
  const selectedPlacement = world.panes[selectedPane.id]
  const stableSeams = house.edges.filter(edge => edge.stable)

  const screenPane = useCallback((pane) => {
    if (!narrow) return pane
    return {
      ...pane,
      x: pane.y,
      y: pane.x,
      width: pane.height,
      height: pane.width
    }
  }, [narrow])

  const screenIntersection = useCallback((intersection) => {
    if (!narrow) return intersection
    return {
      ...intersection,
      x: intersection.y,
      y: intersection.x,
      width: intersection.height,
      height: intersection.width
    }
  }, [narrow])

  const screenPositions = useMemo(() => Object.fromEntries(
    house.panes.map(pane => [pane.id, screenPane(pane)])
  ), [house.panes, screenPane])

  const routePath = useMemo(
    () => pathThrough(route.path, screenPositions),
    [route.path, screenPositions]
  )

  const passagePath = useMemo(
    () => passage ? pathThrough(passage.path, screenPositions) : '',
    [passage, screenPositions]
  )

  const phase = world.status === 'mastered'
    ? 'inhabited'
    : world.status === 'ruined'
      ? 'shattered'
      : passage
        ? 'crossing'
        : route.ready
          ? 'resonant'
          : world.stage > 0
            ? 'remembering'
            : world.unlocked
              ? 'docking'
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
    return narrow ? { x: screen.y, y: screen.x } : screen
  }, [narrow])

  const paneAtClient = useCallback((clientX, clientY) => {
    const point = svgPointFromClient(clientX, clientY)
    if (!point) return null
    return [...deriveHouse(worldRef.current).panes]
      .sort((left, right) => right.depth - left.depth)
      .find(pane => (
        point.x >= pane.x && point.x <= pane.x + pane.width &&
        point.y >= pane.y && point.y <= pane.y + pane.height
      ))?.id || null
  }, [svgPointFromClient])

  const wake = useCallback(() => {
    setWorld(current => ({
      ...current,
      unlocked: true,
      log: [
        ...current.log,
        { id: `wake-${Date.now()}`, stage: current.stage, text: 'the hand entered and adjacency became negotiable' }
      ].slice(-8)
    }))
    setMessage('drag window crowns to move them // overlap broad edges until the route becomes continuous')
    requestAnimationFrame(() => surfaceRef.current?.focus())
  }, [])

  const playVoices = useCallback((paneIds, success = true) => {
    if (!soundOn || reducedMotion) return
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const context = audioContextRef.current || new AudioContext()
      audioContextRef.current = context
      context.resume?.()
      const start = context.currentTime + 0.03
      paneIds.slice(0, 7).forEach((paneId, index) => {
        const pane = paneById(paneId)
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = index % 2 ? 'triangle' : 'sine'
        oscillator.frequency.value = VOICES[pane.native].tone * (success ? 1 : 0.78)
        gain.gain.setValueAtTime(0.0001, start + index * 0.12)
        gain.gain.exponentialRampToValueAtTime(0.055, start + index * 0.12 + 0.025)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.12 + 0.34)
        oscillator.connect(gain).connect(context.destination)
        oscillator.start(start + index * 0.12)
        oscillator.stop(start + index * 0.12 + 0.38)
      })
    } catch {
      // Sound is an optional shadow of the spatial instrument.
    }
  }, [reducedMotion, soundOn])

  const assignInlay = useCallback((inlayId, paneId) => {
    const inlay = inlayById(inlayId)
    const pane = paneById(paneId)
    if (!inlay || !pane || pane.unlockedAt > worldRef.current.stage || worldRef.current.status !== 'composing') return
    setWorld(current => {
      const inlays = { ...current.inlays }
      Object.entries(inlays).forEach(([otherInlay, targetId]) => {
        if (targetId === paneId && otherInlay !== inlayId) delete inlays[otherInlay]
      })
      inlays[inlayId] = paneId
      return { ...current, inlays }
    })
    setSelectedInlayId(inlayId)
    setSelectedPaneId(paneId)
    setMessage(`${inlay.label} pressed into ${pane.label} // ${VOICES[inlay.voice].label} now travels with its native voice`)
  }, [])

  const beginDrag = useCallback((event, kind, id) => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'composing' || passage) return
    const point = svgPointFromClient(event.clientX, event.clientY)
    if (!point) return
    event.preventDefault()
    event.stopPropagation()
    const placement = current.panes[id]
    const next = kind === 'inlay'
      ? {
          kind,
          id,
          startClientX: event.clientX,
          startClientY: event.clientY,
          clientX: event.clientX,
          clientY: event.clientY,
          moved: false,
          targetId: null
        }
      : {
          kind,
          id,
          startX: point.x,
          startY: point.y,
          originX: placement.x,
          originY: placement.y,
          originWidth: placement.width,
          originHeight: placement.height,
          moved: false
        }
    dragRef.current = next
    setDrag(next)
    if (kind !== 'inlay') setSelectedPaneId(id)
    else setSelectedInlayId(id)
  }, [passage, svgPointFromClient])

  useEffect(() => {
    if (!drag?.id) return undefined

    const handleMove = (event) => {
      const current = dragRef.current
      if (!current) return
      if (current.kind === 'inlay') {
        const moved = current.moved || Math.hypot(
          event.clientX - current.startClientX,
          event.clientY - current.startClientY
        ) > 6
        const next = {
          ...current,
          clientX: event.clientX,
          clientY: event.clientY,
          moved,
          targetId: moved ? paneAtClient(event.clientX, event.clientY) : null
        }
        dragRef.current = next
        setDrag(next)
        return
      }

      const point = svgPointFromClient(event.clientX, event.clientY)
      if (!point) return
      const moved = current.moved || Math.hypot(point.x - current.startX, point.y - current.startY) > 4
      const next = { ...current, moved }
      dragRef.current = next
      setDrag(next)
      setWorld(previous => {
        const placement = previous.panes[current.id]
        if (current.kind === 'resize') {
          return {
            ...previous,
            panes: {
              ...previous.panes,
              [current.id]: {
                ...placement,
                width: clamp(current.originWidth + point.x - current.startX, 158, 300),
                height: clamp(current.originHeight + point.y - current.startY, 118, 224)
              }
            }
          }
        }
        return {
          ...previous,
          panes: {
            ...previous.panes,
            [current.id]: {
              ...placement,
              x: clamp(current.originX + point.x - current.startX, 18, VIEWBOX.width - placement.width - 18),
              y: clamp(current.originY + point.y - current.startY, 18, VIEWBOX.height - placement.height - 18)
            }
          }
        }
      })
    }

    const handleUp = (event) => {
      const current = dragRef.current
      if (!current) return
      if (current.kind === 'inlay' && current.moved) {
        const targetId = paneAtClient(event.clientX, event.clientY)
        if (targetId) assignInlay(current.id, targetId)
        else setMessage('the inlay found no receiving window // tap it, then tap a room')
      } else if (current.kind !== 'inlay' && current.moved) {
        const nextHouse = deriveHouse(worldRef.current)
        const nextRoute = routeForStage(worldRef.current, nextHouse)
        setMessage(nextRoute.ready
          ? 'the seam brightened // a complete passage is now possible'
          : `${current.kind === 'resize' ? 'aperture cut' : 'window moved'} // ${nextHouse.edges.filter(edge => edge.stable).length} stable seams, ${nextRoute.missing.length} voices still absent`)
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
  }, [assignInlay, drag?.id, paneAtClient, svgPointFromClient])

  const alterSelected = useCallback((change, copy) => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'composing' || passage) return
    setWorld(previous => ({
      ...previous,
      panes: {
        ...previous.panes,
        [selectedPaneId]: {
          ...previous.panes[selectedPaneId],
          ...change(previous.panes[selectedPaneId], previous.panes)
        }
      }
    }))
    setMessage(copy)
  }, [passage, selectedPaneId])

  const nudgeSelected = useCallback((dx, dy) => {
    alterSelected(
      placement => ({
        x: clamp(placement.x + dx, 18, VIEWBOX.width - placement.width - 18),
        y: clamp(placement.y + dy, 18, VIEWBOX.height - placement.height - 18)
      }),
      `${selectedPane.label} nudged // seam geometry recalculated`
    )
  }, [alterSelected, selectedPane.label])

  const scaleSelected = useCallback((direction) => {
    alterSelected(
      placement => ({
        width: clamp(placement.width + direction * 18, 158, 300),
        height: clamp(placement.height + direction * 12, 118, 224)
      }),
      `${selectedPane.label} ${direction > 0 ? 'opened wider' : 'contracted'} // overlap and occlusion changed together`
    )
  }, [alterSelected, selectedPane.label])

  const shiftDepth = useCallback((direction) => {
    alterSelected(
      (placement, placements) => ({
        depth: direction > 0
          ? Math.max(...Object.values(placements).map(item => item.depth)) + 1
          : Math.min(...Object.values(placements).map(item => item.depth)) - 1
      }),
      `${selectedPane.label} moved ${direction > 0 ? 'toward the hand' : 'behind the house'} // seams beyond two layers fall silent`
    )
  }, [alterSelected, selectedPane.label])

  const removeSelectedInlay = useCallback(() => {
    const entry = Object.entries(worldRef.current.inlays).find(([, paneId]) => paneId === selectedPaneId)
    if (!entry) {
      setMessage(`${selectedPane.label} carries only its native ${selectedPane.native}`)
      return
    }
    setWorld(current => {
      const inlays = { ...current.inlays }
      delete inlays[entry[0]]
      return { ...current, inlays }
    })
    setMessage(`${inlayById(entry[0]).label} lifted // ${selectedPane.label} speaks only ${selectedPane.native} again`)
  }, [selectedPane.label, selectedPane.native, selectedPaneId])

  const resolvePassage = useCallback((tested) => {
    passageTimerRef.current = null
    const current = worldRef.current
    if (current.status !== 'composing') {
      setPassage(null)
      return
    }

    if (tested.ready) {
      const nextStage = current.stage + 1
      const mastered = nextStage >= STAGES.length
      const record = {
        id: `passage-${Date.now()}`,
        stage: current.stage,
        path: [...tested.path],
        color: VOICES[paneById(tested.path.at(-1)).native].color
      }
      setWorld(previous => ({
        ...previous,
        stage: mastered ? previous.stage : nextStage,
        status: mastered ? 'mastered' : 'composing',
        passages: [...previous.passages, record].slice(-8),
        panes: Object.fromEntries(Object.entries(previous.panes).map(([id, pane]) => [id, {
          ...pane,
          inhabited: pane.inhabited + (tested.path.includes(id) ? 1 : 0)
        }])),
        log: [
          ...previous.log,
          { id: record.id, stage: nextStage, text: STAGES[previous.stage].success }
        ].slice(-8)
      }))
      setSelectedPaneId(mastered ? 'choir' : STAGES[nextStage].target)
      setSelectedInlayId(null)
      setMessage(STAGES[current.stage].success)
      playVoices(tested.path, true)
    } else {
      const scarId = tested.path.at(-1) || selectedPaneId
      const fractures = current.fractures + 1
      const ruined = fractures >= MAX_FRACTURES
      setWorld(previous => ({
        ...previous,
        fractures,
        status: ruined ? 'ruined' : 'composing',
        panes: {
          ...previous.panes,
          [scarId]: {
            ...previous.panes[scarId],
            scars: previous.panes[scarId].scars + 1
          }
        },
        log: [
          ...previous.log,
          {
            id: `fracture-${Date.now()}`,
            stage: previous.stage,
            text: tested.connected
              ? `the route arrived without ${tested.missing.join(' + ')} // one aperture retained the wound`
              : 'the inhabitant reached an unjoined edge // absence cut the final window'
          }
        ].slice(-8)
      }))
      setMessage(ruined
        ? 'three passages broke against false adjacency // the house has become a set of sealed views'
        : tested.connected
          ? `arrival incomplete // carry ${tested.missing.join(' + ')} into the route before testing again`
          : 'the route ends at open air // broaden an overlap or repair the layer gap')
      playVoices(tested.path, false)
    }
    setPassage(null)
  }, [playVoices, selectedPaneId])

  const testPassage = useCallback(() => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'composing' || passage) return
    const currentHouse = deriveHouse(current)
    const tested = routeForStage(current, currentHouse)
    setWorld(previous => ({
      ...previous,
      history: [...previous.history, snapshotWorld(previous)].slice(-10)
    }))
    setPassage(tested)
    setMessage(tested.ready
      ? 'the inhabitant is crossing // each room contributes a rule to the body'
      : tested.connected
        ? `the body can arrive, but ${tested.missing.join(' + ')} is absent from the route`
        : 'the body is walking until architecture stops')
    playVoices(tested.path, tested.ready)
    passageTimerRef.current = window.setTimeout(
      () => resolvePassage(tested),
      reducedMotion ? 120 : 1500
    )
  }, [passage, playVoices, reducedMotion, resolvePassage])

  const rewind = useCallback(() => {
    if (passageTimerRef.current) window.clearTimeout(passageTimerRef.current)
    const current = worldRef.current
    const snapshot = current.history.at(-1)
    if (!snapshot) {
      setMessage('no earlier passage remains in the glass')
      return
    }
    setWorld(previous => ({
      ...previous,
      ...snapshot,
      unlocked: true,
      history: previous.history.slice(0, -1)
    }))
    setPassage(null)
    setSelectedPaneId('threshold')
    setMessage('one crossing lifted // apertures, inlays, scars, and inhabitants returned together')
  }, [])

  const reset = useCallback(() => {
    if (passageTimerRef.current) window.clearTimeout(passageTimerRef.current)
    setWorld(freshWorld())
    setSelectedPaneId('threshold')
    setSelectedInlayId(null)
    setDrag(null)
    setPassage(null)
    setMessage('six clean windows replace the remembered house')
  }, [])

  const handlePaneActivate = useCallback((paneId) => {
    setSelectedPaneId(paneId)
    if (selectedInlayId) {
      assignInlay(selectedInlayId, paneId)
      return
    }
    const pane = paneById(paneId)
    const voices = voicesForPane(paneId, worldRef.current)
    setMessage(`${pane.label} selected // ${voices.join(' + ')} // drag crown, pull corner, or use the sill keys`)
  }, [assignInlay, selectedInlayId])

  const handleSurfaceKeyDown = useCallback((event) => {
    if (event.target.closest('button, a, input, textarea, select')) return
    const step = event.shiftKey ? 3 : 12
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      nudgeSelected(-step, 0)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      nudgeSelected(step, 0)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      nudgeSelected(0, -step)
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      nudgeSelected(0, step)
    }
    if (event.key === '-' || event.key === '_') {
      event.preventDefault()
      scaleSelected(-1)
    }
    if (event.key === '=' || event.key === '+') {
      event.preventDefault()
      scaleSelected(1)
    }
    if (event.key === '[') {
      event.preventDefault()
      shiftDepth(-1)
    }
    if (event.key === ']') {
      event.preventDefault()
      shiftDepth(1)
    }
    if (event.key === ' ') {
      event.preventDefault()
      testPassage()
    }
  }, [nudgeSelected, scaleSelected, shiftDepth, testPassage])

  const selectedInlay = selectedInlayId ? inlayById(selectedInlayId) : null
  const targetPane = paneById(currentStage.target)
  const visiblePaneIds = new Set(house.panes.map(pane => pane.id))

  return (
    <div className={`ac-shell phase-${phase} ${narrow ? 'is-narrow' : ''} ${reducedMotion ? 'is-reduced-motion' : ''}`}>
      <header className="ac-crownbar">
        <div className="ac-nav"><ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} /></div>
        <div className="ac-title">
          <span>inhabitable window study / passage {Math.min(world.stage + 1, 3)}</span>
          <h1 style={{ color: experiment.color }}>{experiment.name}</h1>
        </div>
        <div className="ac-memory">
          <button
            type="button"
            onClick={() => {
              setSoundOn(current => !current)
              setMessage(soundOn ? 'the house returns to silence' : 'the glass will now answer crossings with restrained tones')
            }}
            aria-pressed={soundOn}
          >
            {soundOn ? 'sound on' : 'sound off'}
          </button>
          <span>local house // {formatAge(savedAt)}</span>
        </div>
      </header>

      <main
        ref={surfaceRef}
        className={`ac-surface ${drag ? 'is-dragging' : ''}`}
        tabIndex={0}
        onKeyDown={handleSurfaceKeyDown}
        data-playground-surface
        data-testid="aperture-choir-surface"
        aria-label="Persistent house composed from draggable SVG apertures"
      >
        <section className="ac-theatre" aria-label="aperture composition theatre">
          <div className="ac-stage-status" role="status">
            <span>{phase} / {currentStage.label}</span>
            <strong>{currentStage.instruction}</strong>
            <p>{message}</p>
          </div>

          <div className="ac-route-docket" aria-label="passage requirements">
            <span>route voices</span>
            <div>
              {currentStage.needs.map(voiceId => {
                const voice = VOICES[voiceId]
                const collected = route.collected.includes(voiceId)
                return <i key={voiceId} className={collected ? 'is-held' : ''} style={{ '--voice-color': voice.color }} title={voice.label}>{voice.sigil}</i>
              })}
            </div>
            <strong>{route.ready ? 'passage alive' : route.connected ? 'route incomplete' : 'seam broken'}</strong>
          </div>

          <svg
            ref={svgRef}
            className="ac-house"
            viewBox={narrow ? `0 0 ${MOBILE_VIEWBOX.width} ${MOBILE_VIEWBOX.height}` : `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
            preserveAspectRatio="xMidYMid meet"
            aria-label={`${stableSeams.length} stable seams. Route to ${targetPane.label} is ${route.ready ? 'ready' : 'incomplete'}.`}
          >
            <defs>
              <pattern id="ac-registration" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M 28 0 H 0 V 28" fill="none" stroke="rgba(238,230,205,.075)" strokeWidth=".8" />
                <circle cx="0" cy="0" r="1.25" fill="rgba(238,230,205,.16)" />
              </pattern>
              <pattern id="ac-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,.17)" strokeWidth="2" />
              </pattern>
              <filter id="ac-grain" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency=".68" numOctaves="2" seed="222" result="noise" />
                <feColorMatrix in="noise" type="saturate" values="0" result="gray" />
                <feBlend in="SourceGraphic" in2="gray" mode="soft-light" />
              </filter>
              <filter id="ac-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <marker id="ac-route-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 Z" />
              </marker>
              {house.panes.map(pane => {
                const screen = screenPane(pane)
                return <clipPath key={pane.id} id={`ac-clip-${pane.id}`}><rect width={screen.width} height={screen.height} rx="8" /></clipPath>
              })}
            </defs>

            <rect className="ac-stage-ground" width={narrow ? MOBILE_VIEWBOX.width : VIEWBOX.width} height={narrow ? MOBILE_VIEWBOX.height : VIEWBOX.height} rx="28" />
            <rect className="ac-stage-grid" x="18" y="18" width={(narrow ? MOBILE_VIEWBOX.width : VIEWBOX.width) - 36} height={(narrow ? MOBILE_VIEWBOX.height : VIEWBOX.height) - 36} rx="22" fill="url(#ac-registration)" />
            <path className="ac-house-outline" d={narrow ? 'M 82 896 V 102 H 520 V 896 M 82 202 H 520 M 82 532 H 520' : 'M 62 558 V 98 H 894 V 558 M 176 98 V 558 M 548 98 V 558'} />

            <g className="ac-memory-routes">
              {world.passages.map((record, index) => {
                const path = pathThrough(record.path.filter(id => visiblePaneIds.has(id)), screenPositions)
                if (!path) return null
                return <path key={record.id} d={path} style={{ '--memory-color': record.color, '--memory-index': index }} />
              })}
            </g>

            <g className="ac-seams">
              {house.edges.map(edge => {
                const seam = screenIntersection(edge.intersection)
                return (
                  <g key={edge.id} className={edge.stable ? 'is-stable' : 'is-weak'} style={{ '--seam-strength': edge.strength }}>
                    <rect x={seam.x} y={seam.y} width={seam.width} height={seam.height} rx="5" />
                    <path d={`M ${seam.x + 4} ${seam.y + seam.height / 2} H ${seam.x + seam.width - 4}`} />
                    {seam.width > 34 && seam.height > 28 && (
                      <text x={seam.x + seam.width / 2} y={seam.y + seam.height / 2 - 7}>{edge.stable ? 'OPEN' : `Δ${edge.depthGap}`}</text>
                    )}
                  </g>
                )
              })}
            </g>

            {routePath && !passage && (
              <path className={`ac-proposed-route ${route.ready ? 'is-ready' : ''}`} d={routePath} markerEnd="url(#ac-route-arrow)" />
            )}

            <g className="ac-pane-layer">
              {[...house.panes].sort((left, right) => left.depth - right.depth).map((pane, paneIndex) => {
                const placement = screenPane(pane)
                const voice = VOICES[pane.native]
                const selected = selectedPaneId === pane.id
                const target = currentStage.target === pane.id
                const inlayId = Object.entries(world.inlays).find(([, targetId]) => targetId === pane.id)?.[0]
                const inlay = inlayById(inlayId)
                const isRoute = route.path.includes(pane.id)
                const dragTarget = drag?.kind === 'inlay' && drag.targetId === pane.id
                return (
                  <g
                    key={pane.id}
                    className={`ac-pane ${selected ? 'is-selected' : ''} ${target ? 'is-target' : ''} ${isRoute ? 'is-route' : ''} ${drag?.id === pane.id ? 'is-dragging' : ''} ${dragTarget ? 'is-inlay-target' : ''} ${pane.unlockedAt === world.stage && pane.unlockedAt > 0 ? 'is-newborn' : ''}`}
                    transform={`translate(${placement.x} ${placement.y})`}
                    style={{ '--pane-color': voice.color, '--pane-order': paneIndex }}
                    role="button"
                    tabIndex={world.unlocked ? 0 : -1}
                    aria-label={`${pane.label}. Native voice ${voice.label}${inlay ? `, inlaid with ${VOICES[inlay.voice].label}` : ''}. Layer ${pane.depth}. ${pane.inhabited} remembered crossings.`}
                    onClick={(event) => {
                      event.stopPropagation()
                      handlePaneActivate(pane.id)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        event.stopPropagation()
                        handlePaneActivate(pane.id)
                      }
                    }}
                  >
                    <rect className="ac-pane-shadow" x="9" y="12" width={placement.width} height={placement.height} rx="9" />
                    <rect className="ac-pane-glass" width={placement.width} height={placement.height} rx="9" filter="url(#ac-grain)" />
                    <g clipPath={`url(#ac-clip-${pane.id})`}>
                      <rect className="ac-pane-wash" width={placement.width} height={placement.height} />
                      <PaneInterior pane={pane} width={placement.width} height={placement.height} active={isRoute || pane.inhabited > 0} />
                      <rect className="ac-pane-hatch" width={placement.width} height={placement.height} fill="url(#ac-hatch)" />
                    </g>
                    <rect className="ac-pane-border" width={placement.width} height={placement.height} rx="9" />

                    <g
                      className="ac-pane-crown"
                      onPointerDown={(event) => beginDrag(event, 'move', pane.id)}
                    >
                      <rect width={placement.width} height="34" rx="8" />
                      <circle cx="17" cy="17" r="5" />
                      <text x="30" y="21">{pane.number} / {pane.label}</text>
                      <text className="ac-depth-label" x={placement.width - 10} y="21">L{pane.depth}</text>
                    </g>

                    <g className="ac-pane-resize" transform={`translate(${placement.width - 22} ${placement.height - 22})`} onPointerDown={(event) => beginDrag(event, 'resize', pane.id)}>
                      <rect width="22" height="22" rx="3" />
                      <path d="M 6 17 L 17 6 M 11 17 L 17 11" />
                    </g>

                    {inlay && (
                      <g className="ac-installed-inlay" transform={`translate(${placement.width - 30} 48)`}>
                        <circle r="15" />
                        <text y="5">{inlay.mark}</text>
                      </g>
                    )}

                    {pane.inhabited > 0 && (
                      <g className="ac-inhabitants" transform={`translate(20 ${placement.height - 19})`}>
                        {Array.from({ length: Math.min(pane.inhabited, 3) }, (_, index) => <circle key={index} cx={index * 13} r="4" />)}
                      </g>
                    )}

                    {pane.scars > 0 && <path className="ac-pane-scar" d={`M 16 ${placement.height - 46} L 34 ${placement.height - 31} L 25 ${placement.height - 13} L 49 ${placement.height - 25} L 62 ${placement.height - 9}`} />}
                  </g>
                )
              })}
            </g>

            {passagePath && passage && (
              <g className={`ac-live-passage ${passage.ready ? 'is-ready' : 'is-breaking'}`} filter="url(#ac-glow)">
                <path d={passagePath} />
                {!reducedMotion && (
                  <g>
                    <circle r="10" />
                    <path d="M -10 0 L 0 -6 L 10 0 L 0 6 Z" />
                    <animateMotion dur="1.35s" fill="freeze" path={passagePath} />
                  </g>
                )}
              </g>
            )}
          </svg>

          <ol className="ac-chronicle" aria-label="house memory">
            {world.log.slice(-3).reverse().map((entry, index) => (
              <li key={entry.id} style={{ opacity: 1 - index * 0.24 }}><span>{String(entry.stage).padStart(2, '0')}</span>{entry.text}</li>
            ))}
          </ol>

          <div className="ac-fracture-rail" aria-label={`${world.fractures} of ${MAX_FRACTURES} fractures`}>
            <span>glass</span>
            {Array.from({ length: MAX_FRACTURES }, (_, index) => <i key={index} className={world.fractures > index ? 'is-broken' : ''} />)}
          </div>
        </section>

        <section className="ac-sill" aria-label="window composition sill">
          <div className="ac-inlay-case">
            <div className="ac-sill-heading">
              <span>portable rules / drag or tap</span>
              <strong>{selectedInlay ? `${selectedInlay.label} armed` : 'inlay case'}</strong>
            </div>
            <div className="ac-inlay-list">
              {INLAYS.map(inlay => {
                const voice = VOICES[inlay.voice]
                const placedOn = world.inlays[inlay.id]
                return (
                  <button
                    type="button"
                    key={inlay.id}
                    className={`${selectedInlayId === inlay.id ? 'is-selected' : ''} ${placedOn ? 'is-placed' : ''}`}
                    style={{ '--inlay-color': voice.color }}
                    onClick={() => {
                      setSelectedInlayId(selectedInlayId === inlay.id ? null : inlay.id)
                      setMessage(`${inlay.label} ${selectedInlayId === inlay.id ? 'returned to its sleeve' : `armed // tap a window to add ${voice.label}`}`)
                    }}
                    onPointerDown={(event) => beginDrag(event, 'inlay', inlay.id)}
                    aria-pressed={selectedInlayId === inlay.id}
                    data-playground-action="inlay-window"
                  >
                    <i>{inlay.mark}</i>
                    <span><strong>{inlay.label}</strong><small>{placedOn ? `in ${paneById(placedOn).label}` : inlay.note}</small></span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="ac-transform-console">
            <div className="ac-sill-heading">
              <span>active aperture / {selectedPane.number}</span>
              <strong style={{ color: VOICES[selectedPane.native].color }}>{selectedPane.label}</strong>
            </div>
            <p>{selectedPane.note}</p>
            <div className="ac-dpad">
              <button type="button" onClick={() => nudgeSelected(0, -12)} aria-label="Move selected window up">↑</button>
              <button type="button" onClick={() => nudgeSelected(-12, 0)} aria-label="Move selected window left">←</button>
              <button type="button" onClick={() => nudgeSelected(12, 0)} aria-label="Move selected window right">→</button>
              <button type="button" onClick={() => nudgeSelected(0, 12)} aria-label="Move selected window down">↓</button>
            </div>
            <div className="ac-transform-actions">
              <button type="button" onClick={() => scaleSelected(-1)}><span>−</span>contract <small>−</small></button>
              <button type="button" onClick={() => scaleSelected(1)} data-playground-action="resize-aperture"><span>＋</span>expand <small>＋</small></button>
              <button type="button" onClick={() => shiftDepth(-1)}><span>↓</span>bury <small>[</small></button>
              <button type="button" onClick={() => shiftDepth(1)}><span>↑</span>surface <small>]</small></button>
              <button type="button" onClick={removeSelectedInlay} className="is-lift"><span>◇</span>lift inlay</button>
            </div>
            <div className="ac-pane-reading">
              <span>{Math.round(selectedPlacement.width)}×{Math.round(selectedPlacement.height)}</span>
              <span>layer {selectedPlacement.depth}</span>
              <span>{selectedPlacement.inhabited} crossings</span>
            </div>
          </div>

          <div className="ac-passage-console">
            <div className="ac-passage-target">
              <span>destination / {targetPane.number}</span>
              <strong>{targetPane.label}</strong>
              <p>{route.connected ? `${route.path.length} rooms linked` : `${stableSeams.length} seams / destination isolated`}</p>
            </div>
            <button
              type="button"
              className={route.ready ? 'is-ready' : ''}
              onClick={testPassage}
              disabled={!world.unlocked || world.status !== 'composing' || Boolean(passage)}
              data-playground-action="test-passage"
            >
              <span>{passage ? 'body crossing' : route.ready ? 'house can carry' : route.connected ? 'risk incomplete arrival' : 'risk the open edge'}</span>
              <strong>{passage ? 'CROSSING…' : 'SEND INHABITANT'}</strong>
              <small>SPACE</small>
            </button>
            <div className="ac-history-actions">
              <button type="button" onClick={rewind} disabled={world.history.length === 0}>lift passage</button>
              <button type="button" onClick={reset}>unbuild house</button>
            </div>
          </div>
        </section>

        {!world.unlocked && (
          <div className="ac-seal">
            <div className="ac-seal-house" aria-hidden="true">
              <i /><i /><i /><i /><span>222</span>
            </div>
            <p>UNINHABITED INTERFACE / LIVING WINDOW STUDY 222</p>
            <h2>A window becomes a room<br />when something can cross it.</h2>
            <button type="button" onClick={wake} data-playground-primary>
              unlatch the house // enter
            </button>
            <small>move apertures • grow overlaps • carry rules • remember crossings</small>
          </div>
        )}

        {world.status === 'mastered' && (
          <div className="ac-outcome ac-outcome-mastered">
            <span>mastery / three remembered passages / {stableSeams.length} living seams</span>
            <h2>THE HOUSE HAS ACQUIRED AN INSIDE VOICE</h2>
            <p>You did not navigate an interface. You taught a set of surfaces to become adjacency, carried a body through their agreements, and left enough remembered crossings for the architecture to continue inhabiting itself.</p>
            <div><button type="button" onClick={rewind}>lift last crossing</button><button type="button" onClick={reset}>unbuild the house</button></div>
          </div>
        )}

        {world.status === 'ruined' && (
          <div className="ac-outcome ac-outcome-ruined">
            <span>failure / three false adjacencies entered the glass</span>
            <h2>EVERY WINDOW KEPT ITS VIEW. NONE BECAME A DOOR.</h2>
            <p>The fractures are persistent instructions: widen a seam, bring distant layers together, or carry a missing voice with an inlay before asking a body to cross.</p>
            <div><button type="button" onClick={rewind}>lift last fracture</button><button type="button" onClick={reset}>replace the glass</button></div>
          </div>
        )}

        {drag?.kind === 'inlay' && drag.moved && (
          <div
            className={`ac-drag-inlay ${drag.targetId ? 'is-targeting' : ''}`}
            style={{ left: drag.clientX, top: drag.clientY, '--inlay-color': VOICES[inlayById(drag.id).voice].color }}
            aria-hidden="true"
          >
            <i>{inlayById(drag.id).mark}</i>
            <span>{drag.targetId ? `press into ${paneById(drag.targetId).label}` : 'carry rule'}</span>
          </div>
        )}
      </main>
    </div>
  )
}

export { freshWorld, deriveHouse, routeForStage }
export default ApertureChoir
