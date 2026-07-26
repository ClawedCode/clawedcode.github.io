import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ExperimentNav from '../../ExperimentNav'
import './DaemonHabitat.css'

const STORAGE_KEY = 'clawed:daemon-habitat:v1'
const VIEWBOX = { width: 900, height: 720 }

const CHAMBERS = [
  { id: 'core', label: 'cardiac hub', affinity: 'heart', x: 450, y: 348, radius: 88 },
  { id: 'oculus', label: 'oculus', affinity: 'sight', x: 450, y: 120, radius: 70 },
  { id: 'bellows', label: 'bellows', affinity: 'air', x: 238, y: 252, radius: 72 },
  { id: 'scriptorium', label: 'scriptorium', affinity: 'memory', x: 662, y: 252, radius: 72 },
  { id: 'rootbed', label: 'rootbed', affinity: 'root', x: 278, y: 520, radius: 74 },
  { id: 'gatehouse', label: 'gatehouse', affinity: 'conduit', x: 622, y: 520, radius: 74 },
  { id: 'dreamwell', label: 'dreamwell', affinity: 'dream', x: 450, y: 638, radius: 74, hidden: true }
]

const EDGES = [
  ['core', 'oculus'],
  ['core', 'bellows'],
  ['core', 'scriptorium'],
  ['core', 'rootbed'],
  ['core', 'gatehouse'],
  ['oculus', 'bellows'],
  ['oculus', 'scriptorium'],
  ['bellows', 'rootbed'],
  ['scriptorium', 'gatehouse'],
  ['rootbed', 'dreamwell'],
  ['gatehouse', 'dreamwell']
]

const ORGANS = [
  {
    id: 'heart',
    label: 'heart',
    sigil: 'I',
    affinity: 'heart',
    color: '#ff6b55',
    ports: [0, 1, 2, 3, 4, 5],
    description: 'the fixed source // every living route begins here'
  },
  {
    id: 'bellows-organ',
    label: 'bellows',
    sigil: 'II',
    affinity: 'air',
    color: '#9fd6c8',
    ports: [0, 3],
    description: 'raises breath and cools the blood // a straight-through organ'
  },
  {
    id: 'lens',
    label: 'lens',
    sigil: 'III',
    affinity: 'sight',
    color: '#e7bf72',
    ports: [0, 2, 4],
    description: 'turns conducted heat into witness-memory // three alternating ports'
  },
  {
    id: 'archive',
    label: 'archive',
    sigil: 'IV',
    affinity: 'memory',
    color: '#d7b5a6',
    ports: [0, 1, 3],
    description: 'stores what the pulse discovers // hungry for one measure of breath'
  },
  {
    id: 'root',
    label: 'root',
    sigil: 'V',
    affinity: 'root',
    color: '#aebf82',
    ports: [0, 1, 5],
    description: 'repairs the specimen and draws breath upward from the floor'
  },
  {
    id: 'gate',
    label: 'gate',
    sigil: 'VI',
    affinity: 'conduit',
    color: '#c99b72',
    ports: [0, 3],
    description: 'amplifies a route at the cost of added heat // a straight hinge'
  },
  {
    id: 'dreamseed',
    label: 'dreamseed',
    sigil: 'VII',
    affinity: 'dream',
    color: '#f1dfad',
    ports: [0, 1, 2, 3, 4, 5],
    description: 'appears only after the body conducts // completes the inward weather'
  }
]

const RESOURCE_META = [
  { id: 'heat', label: 'heat', color: '#ff6b55', low: 3, high: 8 },
  { id: 'breath', label: 'breath', color: '#9fd6c8', low: 3, high: 12 },
  { id: 'memory', label: 'memory', color: '#e7bf72', low: 5, high: 12 },
  { id: 'integrity', label: 'integrity', color: '#aebf82', low: 5, high: 12 }
]

const EFFECTS = {
  'bellows-organ': { heat: -2, breath: 3, memory: 0, integrity: 0 },
  lens: { heat: 1, breath: 0, memory: 1, integrity: 0 },
  archive: { heat: 0, breath: -1, memory: 3, integrity: 0 },
  root: { heat: 0, breath: 1, memory: 0, integrity: 2 },
  gate: { heat: 1, breath: 0, memory: 1, integrity: 1 },
  dreamseed: { heat: 0, breath: 1, memory: 2, integrity: 1 }
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const freshWorld = () => ({
  unlocked: false,
  placements: { heart: 'core' },
  rotations: Object.fromEntries(ORGANS.map(organ => [organ.id, 0])),
  stats: { heat: 3, breath: 3, memory: 0, integrity: 5 },
  beat: 0,
  stableBeats: 0,
  strain: 0,
  dreamUnlocked: false,
  status: 'building',
  history: [],
  log: [
    { id: 'sealed', beat: 0, text: 'specimen sealed // circulation absent' }
  ],
  lastSaved: null
})

const loadWorld = () => {
  if (typeof window === 'undefined') return freshWorld()

  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (!saved || typeof saved !== 'object') return freshWorld()

    return {
      ...freshWorld(),
      ...saved,
      placements: { ...freshWorld().placements, ...(saved.placements || {}) },
      rotations: { ...freshWorld().rotations, ...(saved.rotations || {}) },
      stats: { ...freshWorld().stats, ...(saved.stats || {}) },
      history: Array.isArray(saved.history) ? saved.history.slice(-10) : [],
      log: Array.isArray(saved.log) ? saved.log.slice(-7) : freshWorld().log
    }
  } catch {
    return freshWorld()
  }
}

const organById = (id) => ORGANS.find(organ => organ.id === id)
const chamberById = (id) => CHAMBERS.find(chamber => chamber.id === id)

const hexPoints = (radius) => {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = index * Math.PI / 3
    return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`
  }).join(' ')
}

const sideBetween = (from, to) => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  return (Math.round(angle / (Math.PI / 3)) + 6) % 6
}

const hasPort = (organId, side, rotations) => {
  const organ = organById(organId)
  if (!organ) return false
  const rotation = rotations[organId] || 0
  return organ.ports.some(port => (port + rotation) % 6 === side)
}

const edgePath = (from, to) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy) || 1
  const curve = Math.min(34, distance * 0.11)
  const cx = (from.x + to.x) / 2 - (dy / distance) * curve
  const cy = (from.y + to.y) / 2 + (dx / distance) * curve
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`
}

const snapshotWorld = (world) => ({
  placements: { ...world.placements },
  rotations: { ...world.rotations },
  stats: { ...world.stats },
  beat: world.beat,
  stableBeats: world.stableBeats,
  strain: world.strain,
  dreamUnlocked: world.dreamUnlocked,
  status: world.status,
  log: world.log.map(entry => ({ ...entry }))
})

const formatAge = (timestamp) => {
  if (!timestamp) return 'first waking'
  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s remembered`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m remembered`
  return `${Math.round(minutes / 60)}h remembered`
}

const OrganGlyph = ({ organId, color = 'currentColor' }) => {
  if (organId === 'heart') {
    return (
      <g className="dh-glyph" fill="none" stroke={color} strokeWidth="4">
        <path d="M 0 30 C -34 8 -38 -23 -15 -34 C -3 -40 8 -31 12 -20 C 18 -34 34 -39 45 -29 C 64 -11 45 16 0 48 Z" transform="translate(-7 -7) scale(.82)" />
        <path d="M -5 -34 L 2 -12 M 23 -34 L 18 -12" />
      </g>
    )
  }

  if (organId === 'bellows-organ') {
    return (
      <g className="dh-glyph" fill="none" stroke={color} strokeWidth="4">
        <path d="M -5 -36 L -5 30 M 5 -36 L 5 30" />
        <path d="M -7 -12 C -18 -32 -43 -20 -42 8 C -41 35 -20 42 -7 25 M 7 -12 C 18 -32 43 -20 42 8 C 41 35 20 42 7 25" />
      </g>
    )
  }

  if (organId === 'lens') {
    return (
      <g className="dh-glyph" fill="none" stroke={color} strokeWidth="4">
        <path d="M -45 0 Q 0 -38 45 0 Q 0 38 -45 0 Z" />
        <circle cx="0" cy="0" r="14" />
        <circle cx="0" cy="0" r="3" fill={color} />
      </g>
    )
  }

  if (organId === 'archive') {
    return (
      <g className="dh-glyph" fill="none" stroke={color} strokeWidth="4">
        <path d="M -37 -31 H 28 L 38 -21 V 33 H -37 Z" />
        <path d="M -25 -15 H 24 M -25 0 H 24 M -25 15 H 12" />
        <path d="M 28 -31 V -21 H 38" />
      </g>
    )
  }

  if (organId === 'root') {
    return (
      <g className="dh-glyph" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round">
        <path d="M 0 -39 V -2 M 0 -2 L -30 24 M 0 -2 L 27 27 M -12 9 L -35 3 M 14 12 L 38 4 M -30 24 L -37 39 M -30 24 L -13 40 M 27 27 L 12 42 M 27 27 L 39 39" />
        <circle cx="0" cy="-40" r="7" />
      </g>
    )
  }

  if (organId === 'gate') {
    return (
      <g className="dh-glyph" fill="none" stroke={color} strokeWidth="4">
        <path d="M -37 35 V -5 Q -37 -39 0 -39 Q 37 -39 37 -5 V 35" />
        <path d="M -22 35 V -3 Q -22 -23 0 -23 Q 22 -23 22 -3 V 35" />
        <path d="M -48 35 H 48" />
      </g>
    )
  }

  return (
    <g className="dh-glyph" fill="none" stroke={color} strokeWidth="3.5">
      <path d="M 0 -45 L 13 -14 L 44 0 L 13 14 L 0 45 L -13 14 L -44 0 L -13 -14 Z" />
      <circle cx="0" cy="0" r="18" />
      <path d="M -13 -13 L 13 13 M 13 -13 L -13 13" />
    </g>
  )
}

const ResourceGauges = ({ stats }) => {
  return (
    <div className="dh-resources" aria-label="specimen resources">
      {RESOURCE_META.map(resource => {
        const value = stats[resource.id]
        const balanced = value >= resource.low && value <= resource.high
        return (
          <div
            key={resource.id}
            className={`dh-resource ${balanced ? 'is-balanced' : ''}`}
            title={`${resource.label}: ${value}/12`}
          >
            <div className="dh-resource-track" aria-hidden="true">
              <span
                style={{
                  height: `${(value / 12) * 100}%`,
                  backgroundColor: resource.color,
                  boxShadow: `0 0 15px ${resource.color}88`
                }}
              />
            </div>
            <strong style={{ color: resource.color }}>{value}</strong>
            <small>{resource.label}</small>
          </div>
        )
      })}
    </div>
  )
}

const Chronicle = ({ log }) => {
  return (
    <ol className="dh-chronicle" aria-label="pulse chronicle">
      {log.slice(-4).reverse().map((entry, index) => (
        <li key={entry.id} style={{ opacity: 1 - index * 0.2 }}>
          <span>{String(entry.beat).padStart(2, '0')}</span>
          {entry.text}
        </li>
      ))}
    </ol>
  )
}

const DaemonHabitat = ({ category, experiment }) => {
  const [world, setWorld] = useState(loadWorld)
  const [savedAt, setSavedAt] = useState(() => world.lastSaved)
  const [selectedId, setSelectedId] = useState('bellows-organ')
  const [message, setMessage] = useState(() => (
    world.unlocked
      ? 'the habitat remembered your last arrangement'
      : 'a sealed daemon waits beneath the glass'
  ))
  const [drag, setDrag] = useState(null)
  const [pulseNonce, setPulseNonce] = useState(0)
  const draggedOrganId = drag?.organId

  const surfaceRef = useRef(null)
  const svgRef = useRef(null)
  const dragRef = useRef(null)
  const worldRef = useRef(world)

  useEffect(() => {
    worldRef.current = world
  }, [world])

  useEffect(() => {
    try {
      const timestamp = Date.now()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...world,
        lastSaved: timestamp
      }))
      setSavedAt(timestamp)
    } catch {
      // The habitat still works when browser storage is unavailable.
    }
  }, [world])

  const chamberOrgans = useMemo(() => {
    const map = {}
    Object.entries(world.placements).forEach(([organId, chamberId]) => {
      if (chamberId) map[chamberId] = organId
    })
    return map
  }, [world.placements])

  const visibleChambers = useMemo(() => {
    return CHAMBERS.filter(chamber => !chamber.hidden || world.dreamUnlocked)
  }, [world.dreamUnlocked])

  const activeEdges = useMemo(() => {
    return EDGES.map(([fromId, toId]) => {
      const from = chamberById(fromId)
      const to = chamberById(toId)
      const fromOrgan = chamberOrgans[fromId]
      const toOrgan = chamberOrgans[toId]
      const visible = (!from.hidden || world.dreamUnlocked) && (!to.hidden || world.dreamUnlocked)
      const active = Boolean(
        visible &&
        fromOrgan &&
        toOrgan &&
        hasPort(fromOrgan, sideBetween(from, to), world.rotations) &&
        hasPort(toOrgan, sideBetween(to, from), world.rotations)
      )

      return {
        id: `${fromId}-${toId}`,
        fromId,
        toId,
        from,
        to,
        path: edgePath(from, to),
        visible,
        active
      }
    })
  }, [chamberOrgans, world.dreamUnlocked, world.rotations])

  const connectedChambers = useMemo(() => {
    const connected = new Set(['core'])
    let changed = true

    while (changed) {
      changed = false
      activeEdges.forEach(edge => {
        if (!edge.active) return
        if (connected.has(edge.fromId) && !connected.has(edge.toId)) {
          connected.add(edge.toId)
          changed = true
        }
        if (connected.has(edge.toId) && !connected.has(edge.fromId)) {
          connected.add(edge.fromId)
          changed = true
        }
      })
    }

    return connected
  }, [activeEdges])

  const connectedOrgans = useMemo(() => {
    return new Set(
      [...connectedChambers]
        .map(chamberId => chamberOrgans[chamberId])
        .filter(Boolean)
    )
  }, [chamberOrgans, connectedChambers])

  const selectedOrgan = organById(selectedId)
  const selectedChamber = world.placements[selectedId]
    ? chamberById(world.placements[selectedId])
    : null

  const phase = world.status === 'dreaming'
    ? 'lucid'
    : world.status === 'scarred'
      ? 'scarred'
      : !world.unlocked
        ? 'sealed'
        : world.dreamUnlocked
          ? 'circulating'
          : 'assembling'

  const balanceReady = (
    world.stats.heat >= 3 &&
    world.stats.heat <= 8 &&
    world.stats.breath >= 3 &&
    world.stats.memory >= 5 &&
    world.stats.integrity >= 5 &&
    connectedOrgans.has('dreamseed')
  )

  useEffect(() => {
    if (
      world.unlocked &&
      !world.dreamUnlocked &&
      world.status === 'building' &&
      connectedOrgans.size >= 5
    ) {
      setWorld(current => ({
        ...current,
        dreamUnlocked: true,
        log: [
          ...current.log,
          {
            id: `dreamwell-${Date.now()}`,
            beat: current.beat,
            text: 'four routes agreed // the dreamwell opened'
          }
        ].slice(-7)
      }))
      setSelectedId('dreamseed')
      setMessage('discovery: the lower fold opens and a seventh organ enters the tray')
    }
  }, [connectedOrgans.size, world.dreamUnlocked, world.status, world.unlocked])

  const wake = useCallback(() => {
    setWorld(current => ({
      ...current,
      unlocked: true,
      log: [
        ...current.log,
        { id: `wake-${Date.now()}`, beat: current.beat, text: 'glass opened // the hand entered' }
      ].slice(-7)
    }))
    setMessage('drag an organ into a chamber // rotate until its ports touch the red circulation')
    requestAnimationFrame(() => surfaceRef.current?.focus())
  }, [])

  const placeOrgan = useCallback((organId, chamberId) => {
    const current = worldRef.current
    const organ = organById(organId)
    const chamber = chamberById(chamberId)

    if (!organ || !chamber || organId === 'heart' || chamberId === 'core') return
    if (!current.unlocked || current.status !== 'building') return
    if (organId === 'dreamseed' && !current.dreamUnlocked) return
    if (chamber.hidden && !current.dreamUnlocked) return

    const displacedId = Object.entries(current.placements)
      .find(([id, placedChamber]) => id !== organId && placedChamber === chamberId)?.[0]

    setWorld(prev => ({
      ...prev,
      placements: {
        ...prev.placements,
        ...(displacedId ? { [displacedId]: null } : {}),
        [organId]: chamberId
      }
    }))
    setSelectedId(organId)
    setMessage(
      displacedId
        ? `${organ.label} displaced ${organById(displacedId)?.label} // the topology has changed`
        : `${organ.label} implanted in ${chamber.label} // rotate it until the ports conduct`
    )
  }, [])

  const removeOrgan = useCallback((organId) => {
    if (organId === 'heart' || worldRef.current.status !== 'building') return
    setWorld(prev => ({
      ...prev,
      placements: { ...prev.placements, [organId]: null }
    }))
    setMessage(`${organById(organId)?.label} returned to the specimen drawer`)
  }, [])

  const rotateOrgan = useCallback((organId, direction = 1) => {
    if (!organId || organId === 'heart' || worldRef.current.status !== 'building') return
    setWorld(prev => ({
      ...prev,
      rotations: {
        ...prev.rotations,
        [organId]: (prev.rotations[organId] + direction + 6) % 6
      }
    }))
    setSelectedId(organId)
    setMessage(`${organById(organId)?.label} rotated ${direction > 0 ? 'clockwise' : 'counterclockwise'} // watch the sutures`)
  }, [])

  const targetFromClient = useCallback((clientX, clientY) => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const scale = Math.min(rect.width / VIEWBOX.width, rect.height / VIEWBOX.height)
    const offsetX = (rect.width - VIEWBOX.width * scale) / 2
    const offsetY = (rect.height - VIEWBOX.height * scale) / 2
    const x = (clientX - rect.left - offsetX) / scale
    const y = (clientY - rect.top - offsetY) / scale

    let nearest = null
    let nearestDistance = Infinity
    visibleChambers.forEach(chamber => {
      if (chamber.id === 'core') return
      const distance = Math.hypot(x - chamber.x, y - chamber.y)
      if (distance < chamber.radius * 1.25 && distance < nearestDistance) {
        nearest = chamber.id
        nearestDistance = distance
      }
    })

    return nearest
  }, [visibleChambers])

  const beginDrag = useCallback((event, organId) => {
    if (!worldRef.current.unlocked || worldRef.current.status !== 'building') return
    if (organId === 'heart' || (organId === 'dreamseed' && !worldRef.current.dreamUnlocked)) return
    event.preventDefault()
    event.stopPropagation()
    setSelectedId(organId)

    const nextDrag = {
      organId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      targetId: null
    }
    dragRef.current = nextDrag
    setDrag(nextDrag)
  }, [])

  useEffect(() => {
    if (!draggedOrganId) return undefined

    const handleMove = (event) => {
      const current = dragRef.current
      if (!current) return
      const moved = current.moved || Math.hypot(
        event.clientX - current.startX,
        event.clientY - current.startY
      ) > 7
      const next = {
        ...current,
        x: event.clientX,
        y: event.clientY,
        moved,
        targetId: moved ? targetFromClient(event.clientX, event.clientY) : null
      }
      dragRef.current = next
      setDrag(next)
    }

    const handleUp = (event) => {
      const current = dragRef.current
      if (!current) return
      const targetId = targetFromClient(event.clientX, event.clientY)

      if (current.moved) {
        if (targetId) placeOrgan(current.organId, targetId)
        else if (worldRef.current.placements[current.organId]) removeOrgan(current.organId)
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
  }, [draggedOrganId, placeOrgan, removeOrgan, targetFromClient])

  const pulse = useCallback(() => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'building') return

    const placedByChamber = {}
    Object.entries(current.placements).forEach(([organId, chamberId]) => {
      if (chamberId) placedByChamber[chamberId] = organId
    })

    const nextStats = {
      heat: current.stats.heat + 2,
      breath: current.stats.breath - 1,
      memory: Math.max(0, current.stats.memory - 1),
      integrity: current.stats.integrity - 1
    }

    connectedChambers.forEach(chamberId => {
      const organId = placedByChamber[chamberId]
      if (!organId || organId === 'heart') return
      const effect = EFFECTS[organId]
      const organ = organById(organId)
      const chamber = chamberById(chamberId)
      if (!effect || !organ || !chamber) return

      Object.entries(effect).forEach(([resource, amount]) => {
        nextStats[resource] += amount
      })

      if (organ.affinity === chamber.affinity) {
        if (organId === 'bellows-organ') nextStats.breath += 1
        if (organId === 'lens' || organId === 'archive' || organId === 'dreamseed') nextStats.memory += 1
        if (organId === 'root' || organId === 'gate') nextStats.integrity += 1
      }
    })

    if (connectedOrgans.has('gate') && connectedOrgans.size >= 5) {
      nextStats.memory += 1
    }

    Object.keys(nextStats).forEach(resource => {
      nextStats[resource] = clamp(nextStats[resource], 0, 12)
    })

    const stableNow = (
      nextStats.heat >= 3 &&
      nextStats.heat <= 8 &&
      nextStats.breath >= 3 &&
      nextStats.memory >= 5 &&
      nextStats.integrity >= 5 &&
      connectedOrgans.has('dreamseed')
    )
    const critical = nextStats.heat > 10 || nextStats.breath < 2 || nextStats.integrity < 2
    const nextStable = stableNow ? current.stableBeats + 1 : 0
    const nextStrain = critical
      ? current.strain + 1
      : Math.max(0, current.strain - 1)
    const nextStatus = nextStable >= 2
      ? 'dreaming'
      : nextStrain >= 3
        ? 'scarred'
        : 'building'
    const nextBeat = current.beat + 1

    const pulseText = nextStatus === 'dreaming'
      ? 'two balanced pulses held // the habitat dreams around your hand'
      : nextStatus === 'scarred'
        ? 'the third imbalance became anatomy // circulation collapsed'
        : stableNow
          ? 'balance held once // one more lucid pulse will teach the body sleep'
          : critical
            ? `strain ${nextStrain}/3 // reroute before the wound becomes structural`
            : `${connectedOrgans.size}/${ORGANS.length} organs conducted // the body is not yet balanced`

    setWorld(prev => ({
      ...prev,
      stats: nextStats,
      beat: nextBeat,
      stableBeats: nextStable,
      strain: nextStrain,
      status: nextStatus,
      history: [...prev.history, snapshotWorld(prev)].slice(-10),
      log: [
        ...prev.log,
        { id: `pulse-${Date.now()}`, beat: nextBeat, text: pulseText }
      ].slice(-7)
    }))
    setPulseNonce(value => value + 1)
    setMessage(pulseText)
  }, [connectedChambers, connectedOrgans])

  const rewind = useCallback(() => {
    const current = worldRef.current
    const snapshot = current.history[current.history.length - 1]
    if (!snapshot) {
      setMessage('no earlier pulse remains beneath this one')
      return
    }

    setWorld(prev => ({
      ...prev,
      ...snapshot,
      history: prev.history.slice(0, -1)
    }))
    setMessage('one pulse unstitched // placement and blood returned together')
  }, [])

  const reset = useCallback(() => {
    setWorld(freshWorld())
    setSelectedId('bellows-organ')
    setMessage('a new sealed specimen replaces the old history')
    setPulseNonce(0)
  }, [])

  const handleSurfaceKeyDown = useCallback((event) => {
    if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) return
    if (event.key.toLowerCase() === 'r') {
      event.preventDefault()
      rotateOrgan(selectedId, event.shiftKey ? -1 : 1)
    }
    if (event.key === ' ') {
      event.preventDefault()
      pulse()
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      rotateOrgan(selectedId, -1)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      rotateOrgan(selectedId, 1)
    }
  }, [pulse, rotateOrgan, selectedId])

  const trayOrgans = ORGANS.filter(organ => (
    organ.id !== 'heart' &&
    (organ.id !== 'dreamseed' || world.dreamUnlocked)
  ))

  return (
    <div className={`dh-shell phase-${phase}`}>
      <header className="dh-crownbar">
        <div className="dh-nav">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
        </div>
        <div className="dh-title">
          <span>living specimen 216</span>
          <h1 style={{ color: experiment.color }}>{experiment.name}</h1>
        </div>
        <div className="dh-persistence" title="This composition is saved in this browser">
          <span className="dh-save-light" />
          local memory // {formatAge(savedAt)}
        </div>
      </header>

      <main
        ref={surfaceRef}
        className="dh-surface"
        tabIndex={0}
        onKeyDown={handleSurfaceKeyDown}
        data-playground-surface
        data-testid="daemon-habitat-surface"
        aria-label="Daemon habitat composition surface"
      >
        <section className="dh-atlas" aria-label="living anatomical map">
          <div className="dh-message" role="status">
            <span>{phase}</span>
            {message}
          </div>

          <svg
            ref={svgRef}
            className="dh-body-map"
            viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
            role="img"
            aria-label={`An anatomical network with ${connectedOrgans.size} conducting organs`}
          >
            <defs>
              <radialGradient id="dh-body-wash" cx="50%" cy="42%" r="68%">
                <stop offset="0%" stopColor="#4a211d" stopOpacity=".8" />
                <stop offset="58%" stopColor="#1f1514" stopOpacity=".55" />
                <stop offset="100%" stopColor="#070807" stopOpacity="0" />
              </radialGradient>
              <filter id="dh-soft-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="dh-paper">
                <feTurbulence baseFrequency=".34" numOctaves="2" seed="17" type="fractalNoise" result="noise" />
                <feColorMatrix in="noise" type="saturate" values="0" result="gray" />
                <feBlend in="SourceGraphic" in2="gray" mode="soft-light" />
              </filter>
            </defs>

            <rect width="900" height="720" fill="url(#dh-body-wash)" />

            <g className="dh-registration" aria-hidden="true">
              {Array.from({ length: 13 }, (_, index) => (
                <line
                  key={`vertical-${index}`}
                  x1={90 + index * 60}
                  y1="48"
                  x2={90 + index * 60}
                  y2="680"
                />
              ))}
              {Array.from({ length: 9 }, (_, index) => (
                <line
                  key={`horizontal-${index}`}
                  x1="76"
                  y1={80 + index * 70}
                  x2="824"
                  y2={80 + index * 70}
                />
              ))}
            </g>

            <path
              className="dh-body-outline"
              d="M450 34 C548 44 681 113 740 218 C792 310 763 444 696 568 C638 675 537 701 450 686 C363 701 262 675 204 568 C137 444 108 310 160 218 C219 113 352 44 450 34 Z"
              filter="url(#dh-paper)"
            />
            <path
              className="dh-spine"
              d="M450 46 C428 126 474 193 450 276 C426 356 476 426 450 506 C429 569 468 625 450 687"
            />

            <g className="dh-edge-layer">
              {activeEdges.filter(edge => edge.visible).map(edge => (
                <g key={edge.id}>
                  <path className="dh-nerve-bed" d={edge.path} />
                  <path
                    className={`dh-nerve ${edge.active ? 'is-active' : ''}`}
                    d={edge.path}
                    filter={edge.active ? 'url(#dh-soft-glow)' : undefined}
                  />
                  {edge.active && (
                    <circle className="dh-flow-dot" r="4" fill="#f8d7a3">
                      <animateMotion
                        dur={`${2.2 + (edge.id.length % 4) * 0.3}s`}
                        repeatCount="indefinite"
                        path={edge.path}
                      />
                    </circle>
                  )}
                </g>
              ))}
            </g>

            {visibleChambers.map((chamber, chamberIndex) => {
              const organId = chamberOrgans[chamber.id]
              const organ = organById(organId)
              const connected = connectedChambers.has(chamber.id)
              const selected = organId === selectedId
              const dragTarget = drag?.targetId === chamber.id
              const rotation = organId ? world.rotations[organId] || 0 : 0
              const matching = organ?.affinity === chamber.affinity

              return (
                <g
                  key={chamber.id}
                  className={`dh-chamber ${connected ? 'is-connected' : ''} ${selected ? 'is-selected' : ''} ${dragTarget ? 'is-drop-target' : ''} ${chamber.hidden ? 'is-revealed' : ''}`}
                  transform={`translate(${chamber.x} ${chamber.y})`}
                  role={chamber.id === 'core' ? undefined : 'button'}
                  tabIndex={chamber.id === 'core' ? -1 : 0}
                  aria-label={`${chamber.label}${organ ? ` containing ${organ.label}` : ', empty'}`}
                  onClick={() => {
                    if (selectedId && chamber.id !== 'core') placeOrgan(selectedId, chamber.id)
                  }}
                  onKeyDown={(event) => {
                    if ((event.key === 'Enter' || event.key === ' ') && selectedId) {
                      event.preventDefault()
                      placeOrgan(selectedId, chamber.id)
                    }
                  }}
                  style={{ '--chamber-index': chamberIndex }}
                >
                  <circle className="dh-chamber-aura" r={chamber.radius + 18} />
                  <polygon className="dh-chamber-shell" points={hexPoints(chamber.radius)} />
                  <polygon className="dh-chamber-inner" points={hexPoints(chamber.radius - 12)} />
                  {Array.from({ length: 6 }, (_, index) => {
                    const angle = index * Math.PI / 3
                    return (
                      <line
                        key={index}
                        className="dh-port-guide"
                        x1={Math.cos(angle) * (chamber.radius - 3)}
                        y1={Math.sin(angle) * (chamber.radius - 3)}
                        x2={Math.cos(angle) * (chamber.radius + 11)}
                        y2={Math.sin(angle) * (chamber.radius + 11)}
                      />
                    )
                  })}

                  {!organ && (
                    <g className="dh-empty-mark">
                      <circle r="20" />
                      <path d="M -12 0 H 12 M 0 -12 V 12" />
                      <text y="42">{chamber.affinity}</text>
                    </g>
                  )}

                  {organ && (
                    <g
                      className="dh-implanted-organ"
                      onPointerDown={(event) => beginDrag(event, organ.id)}
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedId(organ.id)
                      }}
                    >
                      <g
                        className="dh-rotating-glyph"
                        style={{ transform: `rotate(${rotation * 60}deg)` }}
                      >
                        <OrganGlyph organId={organ.id} color={organ.color} />
                        {organ.ports.map((port, index) => {
                          const angle = port * Math.PI / 3
                          return (
                            <circle
                              key={`${port}-${index}`}
                              className="dh-organ-port"
                              cx={Math.cos(angle) * 57}
                              cy={Math.sin(angle) * 57}
                              r="5.5"
                              fill={connected ? organ.color : '#5d4b43'}
                            />
                          )
                        })}
                      </g>
                      <text className="dh-organ-name" y={chamber.radius + 27} fill={organ.color}>
                        {organ.label}
                      </text>
                      <text className={`dh-affinity-mark ${matching ? 'is-matching' : ''}`} y={chamber.radius + 44}>
                        {matching ? 'native tissue' : `in ${chamber.affinity}`}
                      </text>
                    </g>
                  )}

                  <text className="dh-chamber-label" y={-chamber.radius - 19}>
                    {String(chamberIndex + 1).padStart(2, '0')} / {chamber.label}
                  </text>
                </g>
              )
            })}

            {pulseNonce > 0 && (
              <circle
                key={pulseNonce}
                className="dh-pulse-ring"
                cx="450"
                cy="348"
                r="74"
              />
            )}

            {world.status === 'scarred' && (
              <g className="dh-scars" aria-hidden="true">
                <path d="M 164 205 L 270 296 L 218 387 L 356 452 L 289 604" />
                <path d="M 733 221 L 641 315 L 704 401 L 568 468 L 633 597" />
              </g>
            )}

            {world.status === 'dreaming' && (
              <g className="dh-lucid-crown" aria-hidden="true">
                <circle cx="450" cy="348" r="294" />
                <circle cx="450" cy="348" r="310" />
                {Array.from({ length: 12 }, (_, index) => {
                  const angle = index * Math.PI / 6
                  return (
                    <path
                      key={index}
                      d={`M ${450 + Math.cos(angle) * 294} ${348 + Math.sin(angle) * 294} L ${450 + Math.cos(angle) * 325} ${348 + Math.sin(angle) * 325}`}
                    />
                  )
                })}
              </g>
            )}
          </svg>

          <ResourceGauges stats={world.stats} />
          <Chronicle log={world.log} />

          <div className="dh-pulse-console">
            <div className="dh-beat-readout">
              beat {String(world.beat).padStart(2, '0')}
              <span>{world.stableBeats}/2 lucid // {world.strain}/3 strain</span>
            </div>
            <button
              type="button"
              className="dh-pulse-button"
              onClick={pulse}
              disabled={!world.unlocked || world.status !== 'building'}
              data-playground-action="pulse"
              aria-label="Send one pulse through the habitat"
            >
              <span />
              {world.status === 'dreaming' ? 'dreaming' : world.status === 'scarred' ? 'scarred' : 'pulse'}
              <small>SPACE</small>
            </button>
            <div className={`dh-balance-readout ${balanceReady ? 'is-ready' : ''}`}>
              {balanceReady ? 'balance window open' : `${connectedOrgans.size}/${ORGANS.length} conducting`}
            </div>
          </div>

          {!world.unlocked && (
            <div className="dh-seal">
              <div className="dh-seal-mark" aria-hidden="true">
                <OrganGlyph organId="heart" color="#ff6b55" />
              </div>
              <p>SPECIMEN 216 / interface organism</p>
              <h2>Architecture is sleeping<br />inside its own instructions.</h2>
              <button
                type="button"
                onClick={wake}
                data-playground-primary
              >
                break glass // wake body
              </button>
              <small>your arrangement will be remembered in this browser</small>
            </div>
          )}

          {world.status === 'dreaming' && (
            <div className="dh-outcome dh-outcome-lucid">
              <span>mastery state</span>
              <h2>THE HABITAT DREAMS AROUND YOU</h2>
              <p>The interface is no longer a diagram. It has become the memory of your route.</p>
            </div>
          )}

          {world.status === 'scarred' && (
            <div className="dh-outcome dh-outcome-scarred">
              <span>failure state</span>
              <h2>THE WOUND BECAME A ROOM</h2>
              <p>Rewind one pulse and reroute the organs, or begin with new tissue.</p>
            </div>
          )}
        </section>

        <aside className="dh-organ-drawer" aria-label="organ specimen drawer">
          <div className="dh-drawer-heading">
            <div>
              <span>removable anatomy</span>
              <h2>organ drawer</h2>
            </div>
            <b>{Object.values(world.placements).filter(Boolean).length}/{ORGANS.length}</b>
          </div>

          <div className="dh-instructions">
            <p><strong>drag</strong> an organ into any empty chamber.</p>
            <p><strong>rotate</strong> until its ports illuminate the sutures.</p>
            <p><strong>pulse</strong> to let connected organs change the blood.</p>
          </div>

          <div className="dh-organ-list">
            {trayOrgans.map(organ => {
              const placedChamberId = world.placements[organ.id]
              const placedChamber = chamberById(placedChamberId)
              const selected = selectedId === organ.id
              const connected = connectedOrgans.has(organ.id)

              return (
                <button
                  type="button"
                  key={organ.id}
                  className={`dh-organ-card ${selected ? 'is-selected' : ''} ${placedChamber ? 'is-placed' : ''} ${connected ? 'is-connected' : ''}`}
                  style={{ '--organ-color': organ.color }}
                  onClick={() => {
                    setSelectedId(organ.id)
                    setMessage(
                      placedChamber
                        ? `${organ.label} selected in ${placedChamber.label} // tap another chamber to move it`
                        : `${organ.label} selected // tap a chamber or drag it into the body`
                    )
                  }}
                  onPointerDown={(event) => beginDrag(event, organ.id)}
                  aria-pressed={selected}
                >
                  <svg viewBox="-55 -55 110 110" aria-hidden="true">
                    <OrganGlyph organId={organ.id} color={organ.color} />
                  </svg>
                  <span>
                    <strong>{organ.label}</strong>
                    <small>{placedChamber ? placedChamber.label : 'in drawer'}</small>
                  </span>
                  <i>{connected ? 'live' : placedChamber ? 'mute' : organ.sigil}</i>
                </button>
              )
            })}
          </div>

          <div className="dh-inspector">
            <div className="dh-inspector-copy">
              <span>selected // {selectedOrgan?.sigil}</span>
              <strong style={{ color: selectedOrgan?.color }}>{selectedOrgan?.label}</strong>
              <p>{selectedOrgan?.description}</p>
            </div>

            <div className="dh-rotate-controls">
              <button
                type="button"
                onClick={() => rotateOrgan(selectedId, -1)}
                disabled={!selectedChamber || selectedId === 'heart' || world.status !== 'building'}
                data-playground-action="rotate-counterclockwise"
                aria-label={`Rotate ${selectedOrgan?.label} counterclockwise`}
              >
                ↶
              </button>
              <div>
                <span>{selectedChamber?.label || 'unplaced'}</span>
                <small>{selectedChamber ? `${world.rotations[selectedId] * 60}°` : 'choose chamber'}</small>
              </div>
              <button
                type="button"
                onClick={() => rotateOrgan(selectedId, 1)}
                disabled={!selectedChamber || selectedId === 'heart' || world.status !== 'building'}
                data-playground-action="rotate-clockwise"
                aria-label={`Rotate ${selectedOrgan?.label} clockwise`}
              >
                ↷
              </button>
            </div>
          </div>

          <div className="dh-drawer-actions">
            <button
              type="button"
              onClick={rewind}
              disabled={world.history.length === 0}
              data-playground-action="rewind"
            >
              rewind pulse
            </button>
            <button type="button" onClick={reset} className="is-danger">
              new specimen
            </button>
          </div>
        </aside>

        {drag && drag.moved && (
          <div
            className="dh-drag-ghost"
            style={{
              left: drag.x,
              top: drag.y,
              '--organ-color': organById(drag.organId)?.color
            }}
            aria-hidden="true"
          >
            <svg viewBox="-55 -55 110 110">
              <OrganGlyph organId={drag.organId} color={organById(drag.organId)?.color} />
            </svg>
            <span>{organById(drag.organId)?.label}</span>
          </div>
        )}
      </main>
    </div>
  )
}

export default DaemonHabitat
