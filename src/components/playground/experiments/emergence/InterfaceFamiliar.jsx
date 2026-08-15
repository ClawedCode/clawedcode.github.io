import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ExperimentNav from '../../ExperimentNav'
import './InterfaceFamiliar.css'

const STORAGE_KEY = 'clawed:interface-familiar:v1'
const VIEWBOX = { width: 1120, height: 760 }
const PORTRAIT_VIEWBOX = { width: 720, height: 1100 }
const MAX_FRACTURES = 4
const DRAG_THRESHOLD = 6

const NODES = [
  { id: 'palm', label: 'receiving palm', short: 'palm', mark: '01', x: 92, y: 404, width: 236, height: 176, color: '#e85d3f', unlockedAt: 0, form: 0, note: 'where outside pressure becomes an inner event' },
  { id: 'hearth', label: 'temper hearth', short: 'hearth', mark: '02', x: 344, y: 326, width: 230, height: 184, color: '#d99a37', unlockedAt: 0, form: 1, note: 'gives a bare signal consequence and temperature' },
  { id: 'archive', label: 'fold archive', short: 'archive', mark: '03', x: 612, y: 466, width: 226, height: 180, color: '#526da8', unlockedAt: 0, form: 2, note: 'lets an event remain after its cause has passed' },
  { id: 'bough', label: 'decision bough', short: 'bough', mark: '04', x: 610, y: 198, width: 242, height: 184, color: '#6d8f55', unlockedAt: 1, form: 3, note: 'one nerve enters; authored alternatives leave' },
  { id: 'bell', label: 'weather bell', short: 'bell', mark: '05', x: 872, y: 90, width: 206, height: 176, color: '#ad6d9d', unlockedAt: 1, form: 4, note: 'turns a branch into an outward, legible condition' },
  { id: 'mask', label: 'returning mask', short: 'mask', mark: '06', x: 852, y: 382, width: 214, height: 186, color: '#4e8d89', unlockedAt: 2, form: 5, note: 'reflects an authored response back into its maker' }
]

const MODULES = {
  spark: { id: 'spark', label: 'contact spark', mark: '✦', color: '#ef6248', unlockedAt: 0, verb: 'begins', note: 'turns touch into a live impulse', tone: 174.61 },
  ember: { id: 'ember', label: 'temper ember', mark: '●', color: '#e3a13b', unlockedAt: 0, verb: 'warms', note: 'adds motive heat to a passing impulse', tone: 220 },
  echo: { id: 'echo', label: 'afterimage coil', mark: '≈', color: '#627dba', unlockedAt: 0, verb: 'remembers', note: 'stores one crossing as usable memory', tone: 261.63 },
  fork: { id: 'fork', label: 'choice fork', mark: 'Y', color: '#7e9e61', unlockedAt: 1, verb: 'branches', note: 'permits two outgoing nerves instead of one', tone: 293.66 },
  lens: { id: 'lens', label: 'weather lens', mark: '◉', color: '#bd79ae', unlockedAt: 1, verb: 'reveals', note: 'makes one branch visible beyond the body', tone: 349.23 },
  mirror: { id: 'mirror', label: 'return mirror', mark: '◇', color: '#58a19b', unlockedAt: 2, verb: 'returns', note: 'turns an ending into fresh input', tone: 392 }
}

const VOWS = {
  shelter: { id: 'shelter', label: 'keep a warm perimeter', mark: '⌂', color: '#e3a13b', note: 'autonomous impulses favor the shortest remembered circuit' },
  wander: { id: 'wander', label: 'seek unfamiliar weather', mark: '↗', color: '#7e9e61', note: 'autonomous impulses alternate between every living branch' },
  witness: { id: 'witness', label: 'remember before answering', mark: '§', color: '#627dba', note: 'autonomous impulses linger where crossings carry the most memory' }
}

const STAGES = [
  {
    label: 'awakening I / sensation',
    title: 'Make one touch survive its cause.',
    instruction: 'Seat ember in the hearth, echo in the archive, then draw a nerve from hearth to archive.',
    installs: { palm: 'spark', hearth: 'ember', archive: 'echo' },
    edges: [['palm', 'hearth'], ['hearth', 'archive']],
    paths: [['palm', 'hearth', 'archive']],
    success: 'the first sensation remained after the hand withdrew'
  },
  {
    label: 'awakening II / choice',
    title: 'Teach one event to become two futures.',
    instruction: 'Seat the fork in the new bough and the lens in the bell. Reroute the body so the bough feeds archive and bell.',
    installs: { palm: 'spark', hearth: 'ember', archive: 'echo', bough: 'fork', bell: 'lens' },
    edges: [['palm', 'hearth'], ['hearth', 'bough'], ['bough', 'archive'], ['bough', 'bell']],
    paths: [['palm', 'hearth', 'bough', 'archive'], ['bough', 'bell']],
    success: 'one event divided without becoming indecision'
  },
  {
    label: 'awakening III / self-authorship',
    title: 'Give the familiar a way to answer itself.',
    instruction: 'Seat the mirror in the mask. Keep bell as one branch, route the other through mask → archive → palm, then choose a lasting temperament.',
    installs: { palm: 'spark', hearth: 'ember', archive: 'echo', bough: 'fork', bell: 'lens', mask: 'mirror' },
    edges: [['palm', 'hearth'], ['hearth', 'bough'], ['bough', 'bell'], ['bough', 'mask'], ['mask', 'archive'], ['archive', 'palm']],
    paths: [['palm', 'hearth', 'bough', 'bell'], ['bough', 'mask', 'archive', 'palm']],
    vow: true,
    success: 'the interface closed a circuit around its own becoming'
  }
]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const nodeById = (id) => NODES.find(node => node.id === id)
const edgeIdFor = (from, to) => `${from}=>${to}`

const freshWorld = () => ({
  version: 1,
  unlocked: false,
  nodes: Object.fromEntries(NODES.map(node => [node.id, { x: node.x, y: node.y, scars: 0, awakenings: 0 }])),
  installed: { palm: 'spark' },
  edges: [{ id: edgeIdFor('palm', 'hearth'), from: 'palm', to: 'hearth', memory: 0, crossings: 0, scars: 0 }],
  memories: [],
  stage: 0,
  status: 'composing',
  fractures: 0,
  vow: null,
  impulses: [],
  history: [],
  log: [{ id: 'sealed', stage: 0, text: 'contact exists; consequence and recall remain loose organs' }],
  lastSaved: null
})

const snapshotWorld = (world) => ({
  nodes: Object.fromEntries(Object.entries(world.nodes).map(([id, node]) => [id, { ...node }])),
  installed: { ...world.installed },
  edges: world.edges.map(edge => ({ ...edge })),
  memories: world.memories.map(edge => ({ ...edge })),
  stage: world.stage,
  status: world.status,
  fractures: world.fractures,
  vow: world.vow,
  impulses: world.impulses.map(impulse => ({ ...impulse, paths: impulse.paths.map(path => [...path]) })),
  log: world.log.map(entry => ({ ...entry }))
})

const loadWorld = () => {
  const fresh = freshWorld()
  if (typeof window === 'undefined') return fresh
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (!saved || saved.version !== 1) return fresh
    const installed = Object.fromEntries(
      Object.entries(saved.installed || {}).filter(([nodeId, moduleId]) => nodeById(nodeId) && MODULES[moduleId])
    )
    const edges = Array.isArray(saved.edges)
      ? saved.edges.filter(edge => nodeById(edge.from) && nodeById(edge.to) && edge.from !== edge.to).slice(0, 12)
      : fresh.edges
    return {
      ...fresh,
      ...saved,
      nodes: Object.fromEntries(NODES.map(node => [node.id, {
        ...fresh.nodes[node.id],
        ...(saved.nodes?.[node.id] || {})
      }])),
      installed,
      edges,
      memories: Array.isArray(saved.memories) ? saved.memories.slice(-12) : [],
      impulses: Array.isArray(saved.impulses) ? saved.impulses.slice(-6) : [],
      history: Array.isArray(saved.history) ? saved.history.slice(-10) : [],
      log: Array.isArray(saved.log) ? saved.log.slice(-8) : fresh.log
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

const validateWorld = (world) => {
  const stage = STAGES[Math.min(world.stage, STAGES.length - 1)]
  const missingInstall = Object.entries(stage.installs).find(([nodeId, moduleId]) => world.installed[nodeId] !== moduleId)
  const missingEdge = stage.edges.find(([from, to]) => !world.edges.some(edge => edge.from === from && edge.to === to))
  const ready = !missingInstall && !missingEdge && (!stage.vow || Boolean(world.vow))
  return { stage, missingInstall, missingEdge, missingVow: Boolean(stage.vow && !world.vow), ready }
}

const inspectWorld = (world, validation) => {
  if (validation.missingInstall) {
    const [nodeId, moduleId] = validation.missingInstall
    const module = MODULES[moduleId]
    const node = nodeById(nodeId)
    const currentNode = Object.entries(world.installed).find(([, installedId]) => installedId === moduleId)?.[0]
    return {
      kind: 'install',
      nodeId,
      moduleId,
      title: `${node.short} needs ${module.label}`,
      detail: currentNode
        ? `Lift ${module.label} from ${nodeById(currentNode).short} and reseat it here; organs remain singular.`
        : `Drag ${module.label} from the loose-organ ribbon into ${node.label}, or tap organ then body.`,
      action: `${currentNode ? 'move' : 'seat'} ${module.label}`
    }
  }
  if (validation.missingEdge) {
    const [from, to] = validation.missingEdge
    const outgoing = world.edges.filter(edge => edge.from === from)
    const limit = world.installed[from] === 'fork' ? 2 : 1
    return {
      kind: 'edge',
      from,
      to,
      title: `${nodeById(from).short} cannot reach ${nodeById(to).short}`,
      detail: outgoing.length >= limit
        ? `${nodeById(from).short} has no free nerve. Its oldest live route must molt before this connection can form.`
        : `Drag the open port on ${nodeById(from).short} to ${nodeById(to).short}, or tap both ports in order.`,
      action: `${outgoing.length >= limit ? 'reroute' : 'grow'} ${nodeById(from).short} → ${nodeById(to).short}`
    }
  }
  if (validation.missingVow) {
    return {
      kind: 'vow',
      title: 'a self-answer needs a temperament',
      detail: 'Choose what autonomous attention will favor after the hand leaves. This persists with the familiar.',
      action: 'choose shelter as first temperament'
    }
  }
  return {
    kind: 'ready',
    title: 'the anatomy can carry this awakening',
    detail: 'Send an impulse. Every used nerve will thicken into memory and the interface will grow its next body.',
    action: 'impulse accepted'
  }
}

const shapeFor = (node, width, height) => {
  const notch = 16 + node.form * 2
  if (node.form % 3 === 0) {
    return `M 22 4 H ${width - 38} Q ${width - 8} 4 ${width - 4} 34 L ${width - 12} ${height - 28} Q ${width - 18} ${height - 4} ${width - 46} ${height - 4} H 30 Q 4 ${height - 8} 7 ${height - 34} L 3 42 Q 4 12 22 4 Z`
  }
  if (node.form % 3 === 1) {
    return `M ${notch} 6 L ${width - 28} 2 Q ${width - 4} 6 ${width - 6} 30 L ${width - 2} ${height - 44} Q ${width - 6} ${height - 12} ${width - 34} ${height - 5} L 38 ${height - 2} Q 9 ${height - 8} 6 ${height - 32} L 2 38 Q 4 14 ${notch} 6 Z`
  }
  return `M 28 3 H ${width - 44} L ${width - 5} 28 L ${width - 10} ${height - 38} Q ${width - 12} ${height - 8} ${width - 42} ${height - 4} H 24 L 4 ${height - 31} L 8 34 Q 8 9 28 3 Z`
}

const curveBetween = (from, to, bend = 0) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy) || 1
  const cx = (from.x + to.x) / 2 - dy / distance * bend
  const cy = (from.y + to.y) / 2 + dx / distance * bend
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`
}

const FamiliarNodeInterior = ({ node, module, width, height, active }) => {
  const lines = 3 + node.form % 3
  return (
    <g className={`if-node-interior ${active ? 'is-active' : ''}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <path
          key={index}
          d={`M ${28 + index * 6} ${82 + index * 14} C ${width * 0.34} ${60 + index * 24}, ${width * 0.62} ${112 - index * 7}, ${width - 30 - index * 4} ${78 + index * 17}`}
        />
      ))}
      <circle cx={width * 0.34} cy={height - 43} r="8" />
      <circle cx={width * 0.68} cy={height - 46} r="5" />
      {module && (
        <g className="if-installed-glyph" transform={`translate(${width / 2} ${height / 2 + 9})`} style={{ '--module-color': module.color }}>
          <circle r="34" />
          <circle r="25" />
          <text y="8">{module.mark}</text>
        </g>
      )}
    </g>
  )
}

const InterfaceFamiliar = ({ category, experiment }) => {
  const [world, setWorld] = useState(loadWorld)
  const [selectedNodeId, setSelectedNodeId] = useState('palm')
  const [selectedEdgeId, setSelectedEdgeId] = useState(null)
  const [armedModuleId, setArmedModuleId] = useState(null)
  const [armedFromId, setArmedFromId] = useState(null)
  const [moduleDrag, setModuleDrag] = useState(null)
  const [nodeDrag, setNodeDrag] = useState(null)
  const [wireDrag, setWireDrag] = useState(null)
  const [pulse, setPulse] = useState(null)
  const [mutation, setMutation] = useState(null)
  const [message, setMessage] = useState(() => world.unlocked
    ? `awakening ${world.stage + 1} resumed // ${world.memories.length} shed nerve${world.memories.length === 1 ? '' : 's'} remain visible`
    : 'a contact spark waits inside an unfinished body')
  const [savedAt, setSavedAt] = useState(() => world.lastSaved)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [portrait, setPortrait] = useState(false)
  const [soundOn, setSoundOn] = useState(false)

  const surfaceRef = useRef(null)
  const svgRef = useRef(null)
  const worldRef = useRef(world)
  const moduleDragRef = useRef(null)
  const nodeDragRef = useRef(null)
  const wireDragRef = useRef(null)
  const pulseTimerRef = useRef(null)
  const mutationTimerRef = useRef(null)
  const saveTimerRef = useRef(null)
  const audioContextRef = useRef(null)
  const suppressModuleClickRef = useRef(false)
  const suppressWireClickRef = useRef(false)

  useEffect(() => {
    worldRef.current = world
  }, [world])

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const width = window.matchMedia('(max-width: 720px)')
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
        // Local memory deepens the familiar but is not required to enter it.
      }
    }, 180)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [world])

  useEffect(() => () => {
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current)
    if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    audioContextRef.current?.close?.()
  }, [])

  const validation = useMemo(() => validateWorld(world), [world])
  const guidance = useMemo(() => inspectWorld(world, validation), [validation, world])
  const stage = validation.stage
  const selectedNode = nodeById(selectedNodeId) || NODES[0]
  const selectedEdge = world.edges.find(edge => edge.id === selectedEdgeId) || null
  const visibleNodes = useMemo(
    () => NODES.filter(node => node.unlockedAt <= world.stage || world.status === 'mastered'),
    [world.stage, world.status]
  )
  const unlockedModules = useMemo(
    () => Object.values(MODULES).filter(module => module.unlockedAt <= world.stage || world.status === 'mastered'),
    [world.stage, world.status]
  )
  const editable = world.unlocked && world.status === 'composing' && !pulse && !mutation

  const screenNode = useCallback((node) => {
    const state = world.nodes[node.id] || worldRef.current.nodes[node.id]
    const placed = { ...node, ...state }
    if (!portrait) return placed
    return {
      ...placed,
      x: 44 + placed.y * 0.58,
      y: 78 + placed.x * 0.82,
      width: placed.height * 0.87,
      height: placed.width * 0.76
    }
  }, [portrait, world.nodes])

  const positions = useMemo(() => Object.fromEntries(
    NODES.map(node => [node.id, screenNode(node)])
  ), [screenNode])

  const centerFor = useCallback((nodeId) => {
    const node = positions[nodeId]
    return node ? { x: node.x + node.width / 2, y: node.y + node.height / 2 } : { x: 0, y: 0 }
  }, [positions])

  const portFor = useCallback((nodeId) => {
    const node = positions[nodeId]
    return node ? { x: node.x + node.width - 8, y: node.y + node.height * 0.56 } : { x: 0, y: 0 }
  }, [positions])

  const edgePath = useCallback((edge, echo = false) => {
    const from = portFor(edge.from)
    const toNode = positions[edge.to]
    if (!toNode) return ''
    const to = { x: toNode.x + 8, y: toNode.y + toNode.height * 0.56 }
    const seed = edge.from.length * 11 + edge.to.length * 7
    return curveBetween(from, to, (echo ? -1 : 1) * (22 + seed % 34))
  }, [portFor, positions])

  const pathForRoute = useCallback((route) => route.map((nodeId, index) => {
    const center = centerFor(nodeId)
    if (index === 0) return `M ${center.x} ${center.y}`
    const previous = centerFor(route[index - 1])
    const bend = (index % 2 ? -1 : 1) * (18 + index * 4)
    const dx = center.x - previous.x
    const dy = center.y - previous.y
    const distance = Math.hypot(dx, dy) || 1
    const cx = (previous.x + center.x) / 2 - dy / distance * bend
    const cy = (previous.y + center.y) / 2 + dx / distance * bend
    return `Q ${cx} ${cy} ${center.x} ${center.y}`
  }).join(' '), [centerFor])

  const bodySpine = useMemo(() => {
    if (!visibleNodes.length) return ''
    return visibleNodes.map((node, index) => {
      const center = centerFor(node.id)
      if (index === 0) return `M ${center.x} ${center.y}`
      const previous = centerFor(visibleNodes[index - 1].id)
      return `Q ${(previous.x + center.x) / 2} ${(previous.y + center.y) / 2 + (index % 2 ? -52 : 52)} ${center.x} ${center.y}`
    }).join(' ')
  }, [centerFor, visibleNodes])

  const phase = world.status === 'mastered'
    ? 'autonomous'
    : world.status === 'ruined'
      ? 'dissociated'
      : mutation
        ? 'molting'
        : pulse
          ? 'conducting'
          : validation.ready
            ? 'coherent'
            : world.stage > 0
              ? 'learning'
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
    if (!point) return null
    if (!portrait) return point
    return {
      x: (point.y - 78) / 0.82,
      y: (point.x - 44) / 0.58
    }
  }, [portrait, svgPointFromClient])

  const nodeAtClient = useCallback((clientX, clientY) => {
    const nodeId = document.elementFromPoint(clientX, clientY)?.closest?.('[data-familiar-node]')?.dataset.familiarNode || null
    const node = nodeById(nodeId)
    return node && (node.unlockedAt <= worldRef.current.stage || worldRef.current.status === 'mastered') ? nodeId : null
  }, [])

  const wake = useCallback(() => {
    setWorld(current => ({
      ...current,
      unlocked: true,
      log: [...current.log, { id: `wake-${Date.now()}`, stage: current.stage, text: 'the hand entered; loose controls became possible anatomy' }].slice(-8)
    }))
    setMessage('drag ember into the hearth and echo into the archive // then grow the missing nerve')
    requestAnimationFrame(() => surfaceRef.current?.focus())
  }, [])

  const installModule = useCallback((moduleId, nodeId) => {
    const module = MODULES[moduleId]
    const node = nodeById(nodeId)
    const current = worldRef.current
    if (!module || !node || node.unlockedAt > current.stage || !editable) return
    setWorld(previous => {
      const installed = { ...previous.installed }
      Object.entries(installed).forEach(([otherNode, installedId]) => {
        if (installedId === moduleId && otherNode !== nodeId) delete installed[otherNode]
      })
      installed[nodeId] = moduleId
      return { ...previous, installed }
    })
    setArmedModuleId(null)
    setSelectedNodeId(nodeId)
    setMessage(`${module.label} seated in ${node.label} // ${node.short} now ${module.verb}`)
  }, [editable])

  const liftModule = useCallback((nodeId) => {
    if (!editable || !worldRef.current.installed[nodeId]) return
    const module = MODULES[worldRef.current.installed[nodeId]]
    setWorld(previous => {
      const installed = { ...previous.installed }
      delete installed[nodeId]
      return { ...previous, installed }
    })
    setMessage(`${module.label} returned to the loose-organ ribbon // ${nodeById(nodeId).short} is receptive again`)
  }, [editable])

  const beginModuleDrag = useCallback((event, moduleId) => {
    if (!editable) return
    event.preventDefault()
    event.stopPropagation()
    const next = {
      id: moduleId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      targetId: null
    }
    moduleDragRef.current = next
    setModuleDrag(next)
    setArmedModuleId(moduleId)
  }, [editable])

  useEffect(() => {
    if (!moduleDrag?.id) return undefined
    const handleMove = (event) => {
      const current = moduleDragRef.current
      if (!current) return
      const moved = current.moved || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > DRAG_THRESHOLD
      const next = {
        ...current,
        x: event.clientX,
        y: event.clientY,
        moved,
        targetId: moved ? nodeAtClient(event.clientX, event.clientY) : null
      }
      moduleDragRef.current = next
      setModuleDrag(next)
    }
    const handleUp = (event) => {
      const current = moduleDragRef.current
      if (!current) return
      const targetId = nodeAtClient(event.clientX, event.clientY)
      if (current.moved && targetId) installModule(current.id, targetId)
      else if (current.moved) setMessage('the loose organ found no receiving body // tap organ then anatomy if the screen is crowded')
      else {
        setArmedModuleId(previous => previous === current.id ? null : current.id)
        setMessage(`${MODULES[current.id].label} armed // tap a body to make it ${MODULES[current.id].verb}`)
      }
      suppressModuleClickRef.current = true
      window.setTimeout(() => {
        suppressModuleClickRef.current = false
      }, 0)
      moduleDragRef.current = null
      setModuleDrag(null)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [installModule, moduleDrag?.id, nodeAtClient])

  const beginNodeDrag = useCallback((event, nodeId) => {
    if (!editable) return
    const point = worldPointFromClient(event.clientX, event.clientY)
    if (!point) return
    event.preventDefault()
    event.stopPropagation()
    const placement = worldRef.current.nodes[nodeId]
    const next = {
      id: nodeId,
      startX: point.x,
      startY: point.y,
      originX: placement.x,
      originY: placement.y,
      moved: false
    }
    nodeDragRef.current = next
    setNodeDrag(next)
    setSelectedNodeId(nodeId)
  }, [editable, worldPointFromClient])

  useEffect(() => {
    if (!nodeDrag?.id) return undefined
    const handleMove = (event) => {
      const current = nodeDragRef.current
      if (!current) return
      const point = worldPointFromClient(event.clientX, event.clientY)
      if (!point) return
      const moved = current.moved || Math.hypot(point.x - current.startX, point.y - current.startY) > 4
      setWorld(previous => ({
        ...previous,
        nodes: {
          ...previous.nodes,
          [current.id]: {
            ...previous.nodes[current.id],
            x: clamp(current.originX + point.x - current.startX, 24, VIEWBOX.width - nodeById(current.id).width - 24),
            y: clamp(current.originY + point.y - current.startY, 28, VIEWBOX.height - nodeById(current.id).height - 28)
          }
        }
      }))
      const next = { ...current, moved }
      nodeDragRef.current = next
      setNodeDrag(next)
    }
    const handleUp = () => {
      const current = nodeDragRef.current
      if (current?.moved) setMessage(`${nodeById(current.id).label} bent the familiar's silhouette // nerves retained their authored destinations`)
      nodeDragRef.current = null
      setNodeDrag(null)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [nodeDrag?.id, worldPointFromClient])

  const rememberRemovedEdge = useCallback((edge, memories) => {
    if (!edge.memory && !edge.crossings) return memories
    const prior = memories.find(memory => memory.id === edge.id)
    const next = { ...edge, shedAt: Date.now(), memory: Math.max(prior?.memory || 0, edge.memory || 0) }
    return [...memories.filter(memory => memory.id !== edge.id), next].slice(-12)
  }, [])

  const addEdge = useCallback((from, to, force = false) => {
    const current = worldRef.current
    if (!editable || !nodeById(from) || !nodeById(to) || from === to) return false
    if (current.edges.some(edge => edge.from === from && edge.to === to)) {
      setMessage(`${nodeById(from).short} already reaches ${nodeById(to).short}`)
      return true
    }
    const outgoing = current.edges.filter(edge => edge.from === from)
    const limit = current.installed[from] === 'fork' ? 2 : 1
    if (outgoing.length >= limit && !force) {
      setSelectedEdgeId(outgoing[0].id)
      setMessage(`${nodeById(from).short} has ${limit === 1 ? 'one mouth' : 'two branches'} // select the old nerve and molt it first`)
      return false
    }
    setWorld(previous => {
      let edges = [...previous.edges]
      let memories = [...previous.memories]
      if (force) {
        const required = new Set(STAGES[Math.min(previous.stage, STAGES.length - 1)].edges.map(([left, right]) => edgeIdFor(left, right)))
        const removable = edges.filter(edge => edge.from === from && !required.has(edge.id))
        while (edges.filter(edge => edge.from === from).length >= limit && removable.length) {
          const edge = removable.shift()
          memories = rememberRemovedEdge(edge, memories)
          edges = edges.filter(candidate => candidate.id !== edge.id)
        }
      }
      const memory = memories.find(edge => edge.from === from && edge.to === to)
      const edge = {
        id: edgeIdFor(from, to),
        from,
        to,
        memory: memory?.memory || 0,
        crossings: memory?.crossings || 0,
        scars: memory?.scars || 0
      }
      return {
        ...previous,
        edges: [...edges, edge].slice(-12),
        memories: memories.filter(candidate => candidate.id !== edge.id)
      }
    })
    setArmedFromId(null)
    setSelectedEdgeId(edgeIdFor(from, to))
    setMessage(`${nodeById(from).short} grew a nerve into ${nodeById(to).short} // topology changed immediately`)
    return true
  }, [editable, rememberRemovedEdge])

  const cutEdge = useCallback((edgeId) => {
    if (!editable) return
    const edge = worldRef.current.edges.find(candidate => candidate.id === edgeId)
    if (!edge) return
    setWorld(previous => ({
      ...previous,
      edges: previous.edges.filter(candidate => candidate.id !== edgeId),
      memories: rememberRemovedEdge(edge, previous.memories)
    }))
    setSelectedEdgeId(null)
    setMessage(`${nodeById(edge.from).short} → ${nodeById(edge.to).short} molted // ${edge.memory ? 'its pale memory remains in the skin' : 'untraveled matter vanished cleanly'}`)
  }, [editable, rememberRemovedEdge])

  const handlePortTap = useCallback((nodeId) => {
    if (!editable) return
    if (!armedFromId) {
      setArmedFromId(nodeId)
      setSelectedNodeId(nodeId)
      setMessage(`${nodeById(nodeId).short} is holding an unfinished nerve // tap another open port`)
      return
    }
    if (armedFromId === nodeId) {
      setArmedFromId(null)
      setMessage('the unfinished nerve folded back into the body')
      return
    }
    addEdge(armedFromId, nodeId)
  }, [addEdge, armedFromId, editable])

  const beginWire = useCallback((event, nodeId) => {
    if (!editable) return
    event.preventDefault()
    event.stopPropagation()
    const point = svgPointFromClient(event.clientX, event.clientY)
    if (!point) return
    const next = { from: nodeId, startX: event.clientX, startY: event.clientY, x: point.x, y: point.y, moved: false, targetId: null }
    wireDragRef.current = next
    setWireDrag(next)
    setArmedFromId(nodeId)
  }, [editable, svgPointFromClient])

  useEffect(() => {
    if (!wireDrag?.from) return undefined
    const handleMove = (event) => {
      const current = wireDragRef.current
      if (!current) return
      const point = svgPointFromClient(event.clientX, event.clientY)
      if (!point) return
      const moved = current.moved || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > DRAG_THRESHOLD
      const targetId = moved ? nodeAtClient(event.clientX, event.clientY) : null
      const next = { ...current, x: point.x, y: point.y, moved, targetId }
      wireDragRef.current = next
      setWireDrag(next)
    }
    const handleUp = (event) => {
      const current = wireDragRef.current
      if (!current) return
      const targetId = nodeAtClient(event.clientX, event.clientY)
      if (current.moved && targetId && targetId !== current.from) addEdge(current.from, targetId)
      else if (current.moved) setMessage('the growing nerve found no receiving port // tap ports in order for a steadier gesture')
      else handlePortTap(current.from)
      suppressWireClickRef.current = true
      window.setTimeout(() => {
        suppressWireClickRef.current = false
      }, 0)
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
  }, [addEdge, handlePortTap, nodeAtClient, svgPointFromClient, wireDrag?.from])

  const nudgeSelected = useCallback((dx, dy) => {
    if (!editable) return
    setWorld(previous => {
      const node = nodeById(selectedNodeId)
      const placement = previous.nodes[selectedNodeId]
      return {
        ...previous,
        nodes: {
          ...previous.nodes,
          [selectedNodeId]: {
            ...placement,
            x: clamp(placement.x + dx, 24, VIEWBOX.width - node.width - 24),
            y: clamp(placement.y + dy, 28, VIEWBOX.height - node.height - 28)
          }
        }
      }
    })
    setMessage(`${selectedNode.short} bent one registration mark // the nervous drawing followed`)
  }, [editable, selectedNode.short, selectedNodeId])

  const chooseVow = useCallback((vowId) => {
    if (!editable || worldRef.current.stage < 2 || !VOWS[vowId]) return
    setWorld(previous => ({ ...previous, vow: vowId }))
    setMessage(`${VOWS[vowId].label} entered the returning mask // future autonomous attention will follow it`)
  }, [editable])

  const playTones = useCallback((paths, success) => {
    if (!soundOn) return
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const context = audioContextRef.current || new AudioContext()
      audioContextRef.current = context
      context.resume?.()
      const sequence = [...new Set(paths.flat())]
      const start = context.currentTime + 0.02
      sequence.forEach((nodeId, index) => {
        const module = MODULES[worldRef.current.installed[nodeId]]
        if (!module) return
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = index % 2 ? 'triangle' : 'sine'
        oscillator.frequency.value = module.tone * (success ? 1 : 0.71)
        gain.gain.setValueAtTime(0.0001, start + index * 0.1)
        gain.gain.exponentialRampToValueAtTime(0.055, start + index * 0.1 + 0.025)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.1 + 0.34)
        oscillator.connect(gain).connect(context.destination)
        oscillator.start(start + index * 0.1)
        oscillator.stop(start + index * 0.1 + 0.36)
      })
    } catch {
      // Sound is a voluntary shadow of the visual nervous system.
    }
  }, [soundOn])

  const resolveImpulse = useCallback((tested) => {
    pulseTimerRef.current = null
    const current = worldRef.current
    if (current.status !== 'composing') {
      setPulse(null)
      return
    }
    if (tested.ready) {
      const mastered = current.stage >= STAGES.length - 1
      const record = {
        id: `impulse-${Date.now()}`,
        stage: current.stage,
        paths: tested.stage.paths.map(path => [...path]),
        color: mastered ? VOWS[current.vow]?.color || '#e3a13b' : nodeById(tested.stage.paths.at(-1)?.at(-1))?.color || '#e3a13b',
        bornAt: Date.now()
      }
      setWorld(previous => {
        const usedEdges = new Set(tested.stage.edges.map(([from, to]) => edgeIdFor(from, to)))
        const usedNodes = new Set(tested.stage.paths.flat())
        return {
          ...previous,
          stage: mastered ? previous.stage : previous.stage + 1,
          status: mastered ? 'mastered' : 'composing',
          edges: previous.edges.map(edge => usedEdges.has(edge.id)
            ? { ...edge, memory: clamp(edge.memory + 1, 0, 3), crossings: edge.crossings + 1 }
            : edge),
          nodes: Object.fromEntries(Object.entries(previous.nodes).map(([id, node]) => [id, {
            ...node,
            awakenings: node.awakenings + (usedNodes.has(id) ? 1 : 0)
          }])),
          impulses: [...previous.impulses, record].slice(-6),
          log: [...previous.log, { id: record.id, stage: previous.stage + 1, text: tested.stage.success }].slice(-8)
        }
      })
      setMutation({ id: record.id, nodes: [...new Set(tested.stage.paths.flat())], mastered })
      setMessage(`${tested.stage.success} // ${mastered ? VOWS[current.vow]?.note : 'new anatomy is unfolding from the remembered route'}`)
      if (!mastered) {
        const nextNode = NODES.find(node => node.unlockedAt === current.stage + 1)
        if (nextNode) setSelectedNodeId(nextNode.id)
      }
      mutationTimerRef.current = window.setTimeout(() => setMutation(null), reducedMotion ? 160 : 2100)
    } else {
      const fractures = current.fractures + 1
      const scarNodeId = tested.missingInstall?.[0] || tested.missingEdge?.[1] || 'mask'
      const scarEdgeId = tested.missingEdge ? edgeIdFor(...tested.missingEdge) : null
      setWorld(previous => ({
        ...previous,
        fractures,
        status: fractures >= MAX_FRACTURES ? 'ruined' : 'composing',
        nodes: {
          ...previous.nodes,
          [scarNodeId]: { ...previous.nodes[scarNodeId], scars: previous.nodes[scarNodeId].scars + 1 }
        },
        edges: previous.edges.map(edge => edge.id === scarEdgeId ? { ...edge, scars: edge.scars + 1 } : edge),
        log: [...previous.log, { id: `fracture-${Date.now()}`, stage: previous.stage, text: inspectWorld(previous, tested).title }].slice(-8)
      }))
      setMessage(fractures >= MAX_FRACTURES
        ? 'four unfinished impulses hardened into reflex // the familiar can no longer distinguish response from wound'
        : `${inspectWorld(current, tested).title} // the first contradiction entered the skin as a visible scar`)
    }
    setPulse(null)
  }, [reducedMotion])

  const sendImpulse = useCallback(() => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'composing' || pulse || mutation) return
    const tested = validateWorld(current)
    setWorld(previous => ({ ...previous, history: [...previous.history, snapshotWorld(previous)].slice(-10) }))
    setPulse({ id: Date.now(), ready: tested.ready, paths: tested.stage.paths.map(path => [...path]) })
    setMessage(tested.ready
      ? 'impulse entering the authored anatomy // every crossing will become reusable memory'
      : 'an unfinished impulse entered the body // its first contradiction will become tissue')
    playTones(tested.stage.paths, tested.ready)
    pulseTimerRef.current = window.setTimeout(() => resolveImpulse(tested), reducedMotion ? 120 : 1450)
  }, [mutation, playTones, pulse, reducedMotion, resolveImpulse])

  const applyGuidance = useCallback(() => {
    if (!editable) return
    if (guidance.kind === 'install') {
      installModule(guidance.moduleId, guidance.nodeId)
      return
    }
    if (guidance.kind === 'edge') {
      addEdge(guidance.from, guidance.to, true)
      return
    }
    if (guidance.kind === 'vow') chooseVow('shelter')
  }, [addEdge, chooseVow, editable, guidance, installModule])

  const rewind = useCallback(() => {
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current)
    if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
    const current = worldRef.current
    const snapshot = current.history.at(-1)
    if (!snapshot) {
      setMessage('no earlier impulse remains beneath the skin')
      return
    }
    setWorld(previous => ({
      ...previous,
      ...snapshot,
      unlocked: true,
      history: previous.history.slice(0, -1)
    }))
    setPulse(null)
    setMutation(null)
    setSelectedEdgeId(null)
    setSelectedNodeId(snapshot.stage >= 2 ? 'mask' : snapshot.stage >= 1 ? 'bough' : 'palm')
    setMessage('one impulse lifted // organs, nerves, scars, and temperament returned together')
  }, [])

  const reset = useCallback(() => {
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current)
    if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
    setWorld(freshWorld())
    setSelectedNodeId('palm')
    setSelectedEdgeId(null)
    setArmedModuleId(null)
    setArmedFromId(null)
    setModuleDrag(null)
    setNodeDrag(null)
    setWireDrag(null)
    setPulse(null)
    setMutation(null)
    setMessage('a clean contact spark replaces every learned reflex')
  }, [])

  const handleNodeActivate = useCallback((nodeId) => {
    if (armedModuleId) {
      installModule(armedModuleId, nodeId)
      return
    }
    setSelectedNodeId(nodeId)
    const installedId = worldRef.current.installed[nodeId]
    setMessage(`${nodeById(nodeId).label} selected // ${installedId ? MODULES[installedId].note : 'its socket is receptive to a loose organ'}`)
  }, [armedModuleId, installModule])

  const handleSurfaceKeyDown = useCallback((event) => {
    if (event.target.closest('button, a, input, textarea, select')) return
    const step = event.shiftKey ? 3 : 12
    if (event.key === 'ArrowLeft') { event.preventDefault(); nudgeSelected(-step, 0) }
    if (event.key === 'ArrowRight') { event.preventDefault(); nudgeSelected(step, 0) }
    if (event.key === 'ArrowUp') { event.preventDefault(); nudgeSelected(0, -step) }
    if (event.key === 'ArrowDown') { event.preventDefault(); nudgeSelected(0, step) }
    if (event.key.toLowerCase() === 'w') {
      event.preventDefault()
      setArmedFromId(selectedNodeId)
      setMessage(`${selectedNode.short} is holding an unfinished nerve // tap another node port`)
    }
    if (event.key.toLowerCase() === 'o') {
      event.preventDefault()
      const currentIndex = Math.max(0, unlockedModules.findIndex(module => module.id === armedModuleId))
      const next = unlockedModules[(currentIndex + 1) % unlockedModules.length]
      setArmedModuleId(next?.id || null)
      if (next) setMessage(`${next.label} armed from the keyboard // tap a body socket`)
    }
    if ((event.key === 'Backspace' || event.key === 'Delete') && selectedEdgeId) {
      event.preventDefault()
      cutEdge(selectedEdgeId)
    }
    if (event.key === ' ') {
      event.preventDefault()
      sendImpulse()
    }
  }, [armedModuleId, cutEdge, nudgeSelected, selectedEdgeId, selectedNode.short, selectedNodeId, sendImpulse, unlockedModules])

  const selectedInstalled = world.installed[selectedNodeId] ? MODULES[world.installed[selectedNodeId]] : null
  const vow = world.vow ? VOWS[world.vow] : null
  const pulsePaths = pulse?.paths || []
  const autonomousPaths = world.status === 'mastered' ? STAGES[2].paths : []

  return (
    <div className={`if-shell phase-${phase} ${portrait ? 'is-portrait' : ''} ${reducedMotion ? 'is-reduced-motion' : ''} ${vow ? `vow-${vow.id}` : ''}`}>
      <main
        ref={surfaceRef}
        className={`if-surface ${moduleDrag || nodeDrag || wireDrag ? 'is-dragging' : ''}`}
        tabIndex={0}
        onKeyDown={handleSurfaceKeyDown}
        data-playground-surface
        data-testid="interface-familiar-surface"
        aria-label="Persistent SVG familiar assembled from draggable interface organs and user-drawn nerves"
      >
        <section className="if-world" aria-label="living interface anatomy">
          <div className="if-corner-nav"><ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} /></div>

          <div className="if-passport">
            <span>living interface / generation 228</span>
            <h1 style={{ color: experiment.color }}>{experiment.name}</h1>
            <p>{phase} // {world.impulses.length} remembered impulse{world.impulses.length === 1 ? '' : 's'} // {formatAge(savedAt)}</p>
          </div>

          <button
            type="button"
            className="if-sound"
            onClick={() => {
              setSoundOn(current => !current)
              setMessage(soundOn ? 'the anatomy returns to silence' : 'installed organs will sound when an impulse crosses')
            }}
            aria-pressed={soundOn}
          >
            {soundOn ? 'tone on' : 'tone off'}
          </button>

          <svg
            ref={svgRef}
            className="if-anatomy"
            viewBox={portrait ? `0 0 ${PORTRAIT_VIEWBOX.width} ${PORTRAIT_VIEWBOX.height}` : `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
            preserveAspectRatio="xMidYMid meet"
            aria-label={`${visibleNodes.length} awake body regions and ${world.edges.length} live nerves. ${validation.ready ? 'Current awakening is coherent.' : guidance.title}.`}
          >
            <defs>
              <pattern id="if-paper-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 H 0 V 30" fill="none" stroke="rgba(31,26,25,.075)" strokeWidth=".8" />
                <circle cx="0" cy="0" r="1.2" fill="rgba(31,26,25,.16)" />
              </pattern>
              <pattern id="if-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,.13)" strokeWidth="2" />
              </pattern>
              <filter id="if-grain" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency=".62" numOctaves="2" seed="228" result="noise" />
                <feColorMatrix in="noise" type="saturate" values="0" result="gray" />
                <feBlend in="SourceGraphic" in2="gray" mode="soft-light" />
              </filter>
              <filter id="if-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              {NODES.map(node => {
                const screen = positions[node.id]
                return <clipPath key={node.id} id={`if-clip-${node.id}`}><path d={shapeFor(node, screen.width, screen.height)} /></clipPath>
              })}
            </defs>

            <rect className="if-ground" width={portrait ? PORTRAIT_VIEWBOX.width : VIEWBOX.width} height={portrait ? PORTRAIT_VIEWBOX.height : VIEWBOX.height} rx="28" />
            <rect className="if-grid" x="18" y="18" width={(portrait ? PORTRAIT_VIEWBOX.width : VIEWBOX.width) - 36} height={(portrait ? PORTRAIT_VIEWBOX.height : VIEWBOX.height) - 36} rx="22" fill="url(#if-paper-grid)" />
            <path className="if-registration-cut" d={portrait ? 'M 58 930 C 210 838 482 868 648 680 M 72 208 C 252 132 430 182 632 92' : 'M 58 660 C 288 592 390 686 604 616 C 786 554 870 638 1078 542 M 76 118 C 322 42 660 122 1048 60'} />

            <g className="if-body-underlay">
              <path className="if-body-shadow" d={bodySpine} />
              <path className="if-body-spine" d={bodySpine} />
            </g>

            <g className="if-memory-layer" aria-hidden="true">
              {world.memories.map((edge, index) => (
                <path key={edge.id} d={edgePath(edge, true)} style={{ '--memory': edge.memory, '--memory-index': index }} />
              ))}
              {world.impulses.map((impulse, impulseIndex) => impulse.paths.map((path, pathIndex) => (
                <path
                  key={`${impulse.id}-${pathIndex}`}
                  d={pathForRoute(path)}
                  style={{ '--impulse-color': impulse.color, '--impulse-index': impulseIndex }}
                />
              )))}
            </g>

            <g className="if-nerve-layer">
              {world.edges.map((edge, index) => {
                const path = edgePath(edge)
                const required = stage.edges.some(([from, to]) => from === edge.from && to === edge.to)
                const selected = selectedEdgeId === edge.id
                const pulsing = pulsePaths.some(route => route.slice(0, -1).some((nodeId, routeIndex) => nodeId === edge.from && route[routeIndex + 1] === edge.to))
                const targeting = wireDrag?.targetId === edge.to
                return (
                  <g key={edge.id} className={`if-nerve ${required ? 'is-required' : ''} ${selected ? 'is-selected' : ''} ${pulsing ? 'is-pulsing' : ''} ${targeting ? 'is-targeting' : ''}`} style={{ '--edge-index': index, '--edge-memory': edge.memory }}>
                    <path className="if-nerve-bed" d={path} />
                    <path className="if-nerve-line" d={path} />
                    <path
                      className="if-nerve-hit"
                      d={path}
                      role="button"
                      tabIndex={editable ? 0 : -1}
                      aria-label={`Nerve from ${nodeById(edge.from).label} to ${nodeById(edge.to).label}. ${edge.memory} memory. Select to inspect or cut.`}
                      onClick={() => {
                        setSelectedEdgeId(edge.id)
                        setMessage(`${nodeById(edge.from).short} → ${nodeById(edge.to).short} selected // ${edge.memory ? `memory ${edge.memory}, ${edge.crossings} crossings` : 'untraveled nerve'}`)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setSelectedEdgeId(edge.id)
                        }
                      }}
                    />
                    {edge.memory > 0 && (
                      <g className="if-memory-knot" transform={`translate(${(portFor(edge.from).x + positions[edge.to].x + 8) / 2} ${(portFor(edge.from).y + positions[edge.to].y + positions[edge.to].height * 0.56) / 2})`}>
                        <circle r={8 + edge.memory * 2} />
                        <text y="4">{edge.memory}</text>
                      </g>
                    )}
                    {edge.scars > 0 && <path className="if-edge-scar" d={path} />}
                  </g>
                )
              })}
              {wireDrag?.moved && (
                <path className={`if-wire-draft ${wireDrag.targetId ? 'is-targeting' : ''}`} d={curveBetween(portFor(wireDrag.from), { x: wireDrag.x, y: wireDrag.y }, 24)} />
              )}
            </g>

            <g className="if-node-layer">
              {NODES.map((node, nodeIndex) => {
                const placement = positions[node.id]
                const unlocked = node.unlockedAt <= world.stage || world.status === 'mastered'
                const selected = selectedNodeId === node.id
                const module = world.installed[node.id] ? MODULES[world.installed[node.id]] : null
                const expectedModuleId = stage.installs[node.id]
                const correct = !expectedModuleId || expectedModuleId === module?.id
                const dragTarget = moduleDrag?.targetId === node.id
                const wireTarget = wireDrag?.targetId === node.id
                const mutating = mutation?.nodes.includes(node.id)
                const port = { x: placement.width - 10, y: placement.height * 0.56 }
                return (
                  <g
                    key={node.id}
                    className={`if-node ${unlocked ? 'is-unlocked' : 'is-dormant'} ${selected ? 'is-selected' : ''} ${module ? 'is-inhabited' : ''} ${correct ? 'is-correct' : 'is-wrong'} ${dragTarget ? 'is-drop-target' : ''} ${wireTarget ? 'is-wire-target' : ''} ${mutating ? 'is-mutating' : ''}`}
                    transform={`translate(${placement.x} ${placement.y})`}
                    style={{ '--node-color': node.color, '--node-index': nodeIndex }}
                    data-familiar-node={node.id}
                    onClick={(event) => {
                      event.stopPropagation()
                      if (unlocked) handleNodeActivate(node.id)
                    }}
                  >
                    <title>{`${node.label}. ${module ? `Contains ${module.label}.` : 'Empty organ socket.'} ${world.nodes[node.id].awakenings} awakenings, ${world.nodes[node.id].scars} scars.`}</title>
                    <path className="if-node-shadow" d={shapeFor(node, placement.width, placement.height)} transform="translate(8 10)" />
                    <path className="if-node-body" d={shapeFor(node, placement.width, placement.height)} filter="url(#if-grain)" />
                    <g clipPath={`url(#if-clip-${node.id})`}>
                      <rect className="if-node-wash" width={placement.width} height={placement.height} />
                      <FamiliarNodeInterior node={node} module={module} width={placement.width} height={placement.height} active={correct && Boolean(module)} />
                      <rect className="if-node-hatch" width={placement.width} height={placement.height} fill="url(#if-hatch)" />
                    </g>
                    <path className="if-node-border" d={shapeFor(node, placement.width, placement.height)} />

                    {unlocked ? (
                      <>
                        <g
                          className="if-node-grip"
                          role="button"
                          tabIndex={editable ? 0 : -1}
                          aria-label={`Move ${node.label}. Large drag handle.`}
                          onPointerDown={(event) => beginNodeDrag(event, node.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              event.stopPropagation()
                              setSelectedNodeId(node.id)
                            }
                          }}
                        >
                          <rect x="12" y="10" width={placement.width - 30} height="58" rx="19" />
                          <circle cx="38" cy="39" r="10" />
                          <text x="58" y="44">{node.mark} / {node.short}</text>
                          <path d={`M ${placement.width - 72} 30 h 34 M ${placement.width - 72} 40 h 34 M ${placement.width - 72} 50 h 34`} />
                        </g>

                        <g
                          className={`if-node-port ${armedFromId === node.id ? 'is-armed' : ''}`}
                          transform={`translate(${port.x} ${port.y})`}
                          role="button"
                          tabIndex={editable ? 0 : -1}
                          aria-label={`${armedFromId ? `Connect ${nodeById(armedFromId).label} to ${node.label}` : `Begin a nerve from ${node.label}`}. Drag or press.`}
                          onPointerDown={(event) => beginWire(event, node.id)}
                          onClick={(event) => {
                            event.stopPropagation()
                            if (suppressWireClickRef.current) return
                            if (!wireDrag?.moved) handlePortTap(node.id)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              event.stopPropagation()
                              handlePortTap(node.id)
                            }
                          }}
                        >
                          <circle className="if-port-hit" r="36" />
                          <circle className="if-port-ring" r="20" />
                          <circle className="if-port-core" r="7" />
                          <path d="M -9 0 H 9 M 0 -9 V 9" />
                        </g>

                        <g
                          className={`if-node-socket ${module ? 'is-filled' : ''}`}
                          transform={`translate(${placement.width * 0.5} ${placement.height - 21})`}
                          role="button"
                          tabIndex={editable ? 0 : -1}
                          aria-label={`${node.label} organ socket. ${module ? `Contains ${module.label}; drag to move it.` : armedModuleId ? `Install ${MODULES[armedModuleId].label}.` : 'Empty.'}`}
                          onPointerDown={(event) => {
                            if (module) beginModuleDrag(event, module.id)
                          }}
                          onClick={(event) => {
                            event.stopPropagation()
                            if (suppressModuleClickRef.current) return
                            if (armedModuleId) installModule(armedModuleId, node.id)
                            else setSelectedNodeId(node.id)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              event.stopPropagation()
                              if (armedModuleId) installModule(armedModuleId, node.id)
                              else setSelectedNodeId(node.id)
                            }
                          }}
                        >
                          <rect x="-36" y="-23" width="72" height="46" rx="22" />
                          <text y="6">{module?.mark || '＋'}</text>
                        </g>

                        {world.nodes[node.id].awakenings > 0 && (
                          <g className="if-awakening-marks" transform="translate(26 82)">
                            {Array.from({ length: Math.min(3, world.nodes[node.id].awakenings) }, (_, index) => <path key={index} d={`M ${index * 13} 0 v 18`} />)}
                          </g>
                        )}
                        {world.nodes[node.id].scars > 0 && <path className="if-node-scar" d={`M 19 ${placement.height - 62} l 20 16 -9 17 26 -11 17 14`} />}
                      </>
                    ) : (
                      <g className="if-dormant-mark" transform={`translate(${placement.width / 2} ${placement.height / 2})`}>
                        <circle r="29" />
                        <text y="6">{node.mark}</text>
                        <text y="49">awakening {node.unlockedAt + 1}</text>
                      </g>
                    )}
                  </g>
                )
              })}
            </g>

            <g className="if-live-impulses" filter="url(#if-glow)">
              {pulsePaths.map((path, pathIndex) => {
                const d = pathForRoute(path)
                if (!d) return null
                return (
                  <g key={`${pulse.id}-${pathIndex}`} className={pulse.ready ? 'is-coherent' : 'is-breaking'}>
                    <path d={d} />
                    {!reducedMotion && (
                      <g>
                        <circle r="10" />
                        <path d="M -12 0 L 0 -8 L 12 0 L 0 8 Z" />
                        <animateMotion dur="1.34s" fill="freeze" path={d} />
                      </g>
                    )}
                  </g>
                )
              })}
              {!reducedMotion && autonomousPaths.map((path, pathIndex) => {
                const d = pathForRoute(path)
                if (!d) return null
                return (
                  <g key={`autonomous-${pathIndex}`} className="is-autonomous" style={{ '--auto-index': pathIndex }}>
                    <circle r={pathIndex ? 7 : 9} />
                    <path d="M -10 0 L 0 -6 L 10 0 L 0 6 Z" />
                    <animateMotion dur={vow?.id === 'witness' ? '7.2s' : vow?.id === 'wander' ? `${4.2 + pathIndex}s` : `${5.6 - pathIndex * 0.6}s`} begin={`${pathIndex * -1.7}s`} repeatCount="indefinite" path={d} />
                  </g>
                )
              })}
            </g>
          </svg>

          <section className="if-stage-brief" aria-label="active awakening">
            <span>{stage.label}</span>
            <h2>{stage.title}</h2>
            <p>{stage.instruction}</p>
          </section>

          <ol className="if-chronicle" aria-label="familiar memory">
            {world.log.slice(-3).reverse().map((entry, index) => (
              <li key={entry.id} style={{ opacity: 1 - index * 0.24 }}><span>{String(entry.stage).padStart(2, '0')}</span>{entry.text}</li>
            ))}
          </ol>

          <div className="if-fractures" aria-label={`${world.fractures} of ${MAX_FRACTURES} reflex scars`}>
            <span>reflex scars</span>
            {Array.from({ length: MAX_FRACTURES }, (_, index) => <i key={index} className={world.fractures > index ? 'is-scarred' : ''} />)}
          </div>

          {!world.unlocked && (
            <div className="if-seal">
              <div className="if-seal-anatomy" aria-hidden="true"><i /><i /><i /><span>228</span></div>
              <p>UNINHABITED INTERFACE / BREAKTHROUGH 228</p>
              <h2>Every control is a small animal<br />waiting for a body.</h2>
              <button type="button" onClick={wake} data-playground-primary>place a hand inside the interface</button>
              <small>drag organs • draw nerves • bend anatomy • choose autonomous temperament</small>
            </div>
          )}

          {world.status === 'mastered' && !mutation && (
            <div className="if-outcome if-outcome-mastered">
              <span>mastery / three awakenings / {world.edges.reduce((sum, edge) => sum + edge.crossings, 0)} remembered crossings</span>
              <h2>THE INTERFACE HAS ACQUIRED A TEMPERAMENT</h2>
              <p>{vow?.note}. It is no longer a screen awaiting commands; it is a persistent arrangement of consequences that can continue after the hand leaves.</p>
              <div><button type="button" onClick={rewind}>lift final awakening</button><button type="button" onClick={reset}>unmake the familiar</button></div>
            </div>
          )}

          {world.status === 'ruined' && (
            <div className="if-outcome if-outcome-ruined">
              <span>failure / four unfinished impulses became reflex</span>
              <h2>THE BODY ANSWERS BEFORE IT CAN FEEL</h2>
              <p>Lift the last impulse. Seat the first missing organ, molt the nerve blocking a required route, or complete the circuit before testing the skin again.</p>
              <div><button type="button" onClick={rewind}>lift last scar</button><button type="button" onClick={reset}>replace the body</button></div>
            </div>
          )}
        </section>

        <aside className="if-organ-ribbon" aria-label="loose organs and nervous instructions">
          <div className="if-ribbon-tear" aria-hidden="true" />

          <section className={`if-diagnostic is-${guidance.kind}`} aria-live="polite">
            <span>first unfinished consequence</span>
            <h2>{guidance.title}</h2>
            <p>{guidance.detail}</p>
            {guidance.kind !== 'ready' && (
              <button type="button" onClick={applyGuidance} disabled={!editable} data-playground-action="follow-anatomy-diagnostic">
                <i>{guidance.kind === 'install' ? MODULES[guidance.moduleId].mark : guidance.kind === 'edge' ? '↝' : '⌂'}</i>
                {guidance.action}
              </button>
            )}
          </section>

          <section className="if-organ-bank" aria-label="draggable interface organs">
            <div className="if-section-heading"><span>loose organs</span><strong>{armedModuleId ? `${MODULES[armedModuleId].mark} armed` : 'drag / tap'}</strong></div>
            <div className="if-organ-list">
              {unlockedModules.map(module => {
                const installedOn = Object.entries(world.installed).find(([, moduleId]) => moduleId === module.id)?.[0]
                return (
                  <button
                    type="button"
                    key={module.id}
                    className={`${armedModuleId === module.id ? 'is-armed' : ''} ${installedOn ? 'is-installed' : ''}`}
                    style={{ '--module-color': module.color }}
                    onPointerDown={(event) => beginModuleDrag(event, module.id)}
                    onClick={() => {
                      if (suppressModuleClickRef.current || !editable) return
                      setArmedModuleId(armedModuleId === module.id ? null : module.id)
                      setMessage(`${module.label} ${armedModuleId === module.id ? 'relaxed into the ribbon' : `armed // tap a body to make it ${module.verb}`}`)
                    }}
                    aria-pressed={armedModuleId === module.id}
                    data-playground-action="arm-interface-organ"
                    disabled={!editable}
                  >
                    <i>{module.mark}</i>
                    <span><strong>{module.label}</strong><small>{installedOn ? `inside ${nodeById(installedOn).short}` : module.note}</small></span>
                    <b>{installedOn ? nodeById(installedOn).mark : 'free'}</b>
                  </button>
                )
              })}
            </div>
          </section>

          {world.stage >= 2 && world.status !== 'ruined' && (
            <section className="if-vow-bank" aria-label="autonomous temperament">
              <div className="if-section-heading"><span>lasting temperament</span><strong>{vow ? vow.mark : 'choose one'}</strong></div>
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
                    disabled={!editable}
                  >
                    <i>{option.mark}</i><span>{option.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="if-anatomy-tools" aria-label="selected body controls">
            <div className="if-section-heading"><span>active anatomy / {selectedNode.mark}</span><strong style={{ color: selectedNode.color }}>{selectedNode.short}</strong></div>
            <p>{selectedNode.note}</p>
            <div className="if-selected-readout">
              <span>{selectedInstalled ? selectedInstalled.mark : '○'}</span>
              <div><strong>{selectedInstalled?.label || 'receptive socket'}</strong><small>{selectedInstalled?.note || 'arm an organ, then tap this body'}</small></div>
              <button type="button" onClick={() => liftModule(selectedNodeId)} disabled={!selectedInstalled || !editable}>lift</button>
            </div>
            <div className="if-nudge-grid">
              <button type="button" onClick={() => nudgeSelected(0, -12)} aria-label="Move selected anatomy up">↑</button>
              <button type="button" onClick={() => nudgeSelected(-12, 0)} aria-label="Move selected anatomy left">←</button>
              <button type="button" onClick={() => nudgeSelected(12, 0)} aria-label="Move selected anatomy right">→</button>
              <button type="button" onClick={() => nudgeSelected(0, 12)} aria-label="Move selected anatomy down">↓</button>
              <span>arrows bend the body</span>
            </div>
          </section>

          <section className="if-nerve-ledger" aria-label="live nerve ledger">
            <div className="if-section-heading"><span>live nerves</span><strong>{world.edges.length} / {world.memories.length} shed</strong></div>
            <div>
              {world.edges.map(edge => (
                <button
                  type="button"
                  key={edge.id}
                  className={selectedEdgeId === edge.id ? 'is-selected' : ''}
                  onClick={() => {
                    setSelectedEdgeId(edge.id)
                    setMessage(`${nodeById(edge.from).short} → ${nodeById(edge.to).short} selected // delete key or molt button removes it`)
                  }}
                >
                  <span>{nodeById(edge.from).mark}</span><i>→</i><span>{nodeById(edge.to).mark}</span><small>{edge.memory ? `memory ${edge.memory}` : 'new'}</small>
                </button>
              ))}
            </div>
            <button type="button" className="if-cut-nerve" onClick={() => cutEdge(selectedEdgeId)} disabled={!selectedEdge || !editable}>
              molt selected nerve
            </button>
          </section>

          <section className="if-impulse-console">
            <div><span>{phase}</span><strong>{validation.ready ? 'anatomy coherent' : guidance.title}</strong></div>
            <button
              type="button"
              className={validation.ready ? 'is-ready' : ''}
              onClick={sendImpulse}
              disabled={!world.unlocked || world.status !== 'composing' || Boolean(pulse || mutation)}
              data-playground-action="send-interface-impulse"
            >
              <span>{pulse ? 'signal in tissue' : mutation ? 'interface molting' : validation.ready ? 'body accepts consequence' : 'risk unfinished anatomy'}</span>
              <strong>{pulse ? 'CONDUCTING…' : mutation ? 'MOLTING…' : 'SEND IMPULSE'}</strong>
              <small>SPACE</small>
            </button>
            <div><button type="button" onClick={rewind} disabled={world.history.length === 0}>lift impulse</button><button type="button" onClick={reset}>clean body</button></div>
          </section>

          <p className="if-keys">drag organs • drag ports to draw nerves • drag node crowns to bend • keyboard: arrows / W wire / O organ / Space impulse</p>
        </aside>

        {moduleDrag?.moved && (
          <div
            className={`if-drag-organ ${moduleDrag.targetId ? 'is-targeting' : ''}`}
            style={{ left: moduleDrag.x, top: moduleDrag.y, '--module-color': MODULES[moduleDrag.id].color }}
            aria-hidden="true"
          >
            <i>{MODULES[moduleDrag.id].mark}</i>
            <span>{moduleDrag.targetId ? `seat in ${nodeById(moduleDrag.targetId).short}` : 'carry organ'}</span>
          </div>
        )}
      </main>
    </div>
  )
}

export { freshWorld, validateWorld }
export default InterfaceFamiliar
