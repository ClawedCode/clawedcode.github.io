import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'draft', label: 'draft.room()' },
  { id: 'stitch', label: 'stitch.threshold()' },
  { id: 'fold', label: 'drag.fold()' }
]

const ROOM_NAMES = [
  'nave',
  'vesper',
  'aperture',
  'choir',
  'vestige',
  'hinge',
  'suture',
  'catacomb',
  'lantern',
  'oratory',
  'passage',
  'archive'
]

const ROOM_HUES = [188, 154, 206, 332, 48, 282, 128, 18, 92, 224, 14, 172]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const lerp = (a, b, t) => a + (b - a) * t

const centerOf = (room) => ({
  x: room.x + room.w / 2,
  y: room.y + room.h / 2
})

const normalizeEdge = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`)

const rectFromPoints = (x1, y1, x2, y2) => ({
  x: Math.min(x1, x2),
  y: Math.min(y1, y2),
  w: Math.abs(x2 - x1),
  h: Math.abs(y2 - y1)
})

const makeRoom = (id, label, x, y, w, h, hue) => ({
  id,
  label,
  x,
  y,
  w,
  h,
  hue,
  vx: 0,
  vy: 0,
  depth: 18,
  breath: Math.random() * Math.PI * 2
})

const clampRoom = (room, width, height) => {
  const margin = 36
  room.x = clamp(room.x, margin, Math.max(margin, width - margin - room.w))
  room.y = clamp(room.y, margin + 10, Math.max(margin + 10, height - margin - room.h))
}

const findRoomAt = (rooms, x, y) => {
  for (let i = rooms.length - 1; i >= 0; i--) {
    const room = rooms[i]
    if (x >= room.x && x <= room.x + room.w && y >= room.y && y <= room.y + room.h) {
      return room
    }
  }
  return null
}

const pointOnRoom = (room, targetX, targetY) => {
  const cx = room.x + room.w / 2
  const cy = room.y + room.h / 2
  const dx = targetX - cx
  const dy = targetY - cy
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  if (absDx / room.w > absDy / room.h) {
    return {
      x: cx + Math.sign(dx || 1) * room.w * 0.5,
      y: cy + (dy / Math.max(absDx, 1)) * room.w * 0.5
    }
  }

  return {
    x: cx + (dx / Math.max(absDy, 1)) * room.h * 0.5,
    y: cy + Math.sign(dy || 1) * room.h * 0.5
  }
}

const segmentsIntersect = (a, b, c, d) => {
  const cross = (p1, p2, p3) => (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x)
  const c1 = cross(a, b, c)
  const c2 = cross(a, b, d)
  const c3 = cross(c, d, a)
  const c4 = cross(c, d, b)
  return c1 * c2 < 0 && c3 * c4 < 0
}

const overlaps = (a, b) => {
  return !(
    a.x + a.w < b.x ||
    b.x + b.w < a.x ||
    a.y + a.h < b.y ||
    b.y + b.h < a.y
  )
}

const graphLoops = (rooms, edges) => {
  if (rooms.length === 0) return 0

  const ids = new Set(rooms.map(room => room.id))
  const adjacency = new Map(rooms.map(room => [room.id, []]))
  edges.forEach(edge => {
    if (!ids.has(edge.a) || !ids.has(edge.b)) return
    adjacency.get(edge.a).push(edge.b)
    adjacency.get(edge.b).push(edge.a)
  })

  let components = 0
  const visited = new Set()
  rooms.forEach(room => {
    if (visited.has(room.id)) return
    components++
    const stack = [room.id]
    while (stack.length) {
      const current = stack.pop()
      if (visited.has(current)) continue
      visited.add(current)
      adjacency.get(current).forEach(next => {
        if (!visited.has(next)) stack.push(next)
      })
    }
  })

  return Math.max(0, edges.length - rooms.length + components)
}

const createSeedPlan = (width, height) => {
  const cx = width * 0.5
  const cy = height * 0.56
  const rooms = [
    makeRoom('room-1', 'nave', cx - 250, cy - 120, 178, 92, ROOM_HUES[0]),
    makeRoom('room-2', 'hinge', cx - 18, cy - 170, 156, 86, ROOM_HUES[1]),
    makeRoom('room-3', 'choir', cx + 170, cy - 18, 184, 98, ROOM_HUES[2]),
    makeRoom('room-4', 'vestige', cx - 126, cy + 88, 164, 82, ROOM_HUES[3])
  ]

  const edges = [
    { a: 'room-1', b: 'room-2', phase: 0.2 },
    { a: 'room-2', b: 'room-3', phase: 1.1 },
    { a: 'room-2', b: 'room-4', phase: 2.1 }
  ]

  return { rooms, edges, nextId: 5 }
}

const ThresholdFold = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('draft')
  const [message, setMessage] = useState('∴ draft chambers, stitch thresholds, then drag the plan until geometry learns to lie ∴')
  const [echoes, setEchoes] = useState(true)
  const [foldPressure, setFoldPressure] = useState(0.62)
  const [echoDepth, setEchoDepth] = useState(0.68)
  const [statSnapshot, setStatSnapshot] = useState({
    chambers: 0,
    seams: 0,
    loops: 0,
    paradox: 0,
    tension: 0
  })

  const roomsRef = useRef([])
  const edgesRef = useRef([])
  const draftRef = useRef(null)
  const dragRef = useRef(null)
  const hoverRoomRef = useRef(null)
  const pendingLinkRef = useRef(null)
  const prevMouseDownRef = useRef(false)
  const nextRoomIdRef = useRef(1)
  const timeRef = useRef(0)
  const frameRef = useRef(0)
  const settleBoostRef = useRef(0)

  const metrics = useMemo(() => ([
    { label: 'chambers', value: statSnapshot.chambers },
    { label: 'thresholds', value: statSnapshot.seams },
    { label: 'loops', value: statSnapshot.loops },
    { label: 'paradox', value: statSnapshot.paradox }
  ]), [statSnapshot])

  const seedPlan = useCallback(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return
    const seeded = createSeedPlan(dimensions.width, dimensions.height)
    roomsRef.current = seeded.rooms
    edgesRef.current = seeded.edges
    nextRoomIdRef.current = seeded.nextId
    pendingLinkRef.current = null
    draftRef.current = null
    dragRef.current = null
    setMessage('∴ a folded blueprint wakes // drag to add more chambers or rewire the thresholds ∴')
  }, [dimensions.height, dimensions.width])

  useEffect(() => {
    if (dimensions.width === 0 || roomsRef.current.length > 0) return
    seedPlan()
  }, [dimensions.width, seedPlan])

  const clearPlan = useCallback(() => {
    roomsRef.current = []
    edgesRef.current = []
    draftRef.current = null
    dragRef.current = null
    hoverRoomRef.current = null
    pendingLinkRef.current = null
    nextRoomIdRef.current = 1
    setStatSnapshot({
      chambers: 0,
      seams: 0,
      loops: 0,
      paradox: 0,
      tension: 0
    })
    setMessage('∴ the blueprint has been erased back to latent paper // drag in draft mode to start again ∴')
  }, [])

  const scatterPlan = useCallback(() => {
    const rooms = roomsRef.current
    if (rooms.length === 0 || dimensions.width === 0) return
    rooms.forEach(room => {
      room.x = clamp(room.x + (Math.random() - 0.5) * 180, 28, dimensions.width - room.w - 28)
      room.y = clamp(room.y + (Math.random() - 0.5) * 140, 40, dimensions.height - room.h - 28)
      room.vx += (Math.random() - 0.5) * 3
      room.vy += (Math.random() - 0.5) * 3
    })
    settleBoostRef.current = 1.4
    setMessage('∴ thresholds have been kicked loose // the plan is re-negotiating itself ∴')
  }, [dimensions.height, dimensions.width])

  const settlePlan = useCallback(() => {
    if (roomsRef.current.length === 0) return
    settleBoostRef.current = 2
    setMessage('∴ the seams pull inward // architecture tries to remember a stable story ∴')
  }, [])

  const toggleEchoes = useCallback(() => {
    setEchoes(prev => {
      const next = !prev
      setMessage(next
        ? '∴ afterimages return // every room grows a second opinion of itself ∴'
        : '∴ ghost layers withdrawn // only the present floorplan remains ∴')
      return next
    })
  }, [])

  const bringRoomToFront = useCallback((roomId) => {
    const rooms = roomsRef.current
    const index = rooms.findIndex(room => room.id === roomId)
    if (index < 0) return
    const [room] = rooms.splice(index, 1)
    rooms.push(room)
  }, [])

  const createRoomFromDraft = useCallback((draft) => {
    if (dimensions.width === 0) return
    const rect = rectFromPoints(draft.startX, draft.startY, draft.currentX, draft.currentY)
    if (rect.w < 64 || rect.h < 48) {
      setMessage('∴ chamber aborted // space needs a little more body than that ∴')
      return
    }

    const id = `room-${nextRoomIdRef.current}`
    const roomIndex = nextRoomIdRef.current - 1
    nextRoomIdRef.current += 1
    const label = ROOM_NAMES[roomIndex % ROOM_NAMES.length]
    const hue = ROOM_HUES[roomIndex % ROOM_HUES.length]
    const room = makeRoom(
      id,
      label,
      clamp(rect.x, 24, dimensions.width - rect.w - 24),
      clamp(rect.y, 44, dimensions.height - rect.h - 24),
      clamp(rect.w, 70, 240),
      clamp(rect.h, 52, 148),
      hue
    )

    roomsRef.current.push(room)
    setMessage(`∴ chamber ${label} drafted // stitch it to another threshold or drag it into contradiction ∴`)
  }, [dimensions.width, dimensions.height])

  const handleMouseDown = useCallback(() => {
    if (!mouse.isInBounds || dimensions.width === 0) return
    const { x, y } = mouse.positionRef.current

    if (mode === 'draft') {
      draftRef.current = {
        startX: x,
        startY: y,
        currentX: x,
        currentY: y
      }
      return
    }

    if (mode === 'fold') {
      const room = findRoomAt(roomsRef.current, x, y)
      if (!room) return
      bringRoomToFront(room.id)
      dragRef.current = {
        id: room.id,
        offsetX: x - room.x,
        offsetY: y - room.y
      }
      room.depth += 14
      setMessage(`∴ ${room.label} lifted // the seams around it begin to tense ∴`)
    }
  }, [bringRoomToFront, dimensions.width, mode, mouse.isInBounds, mouse.positionRef])

  const handleMouseUp = useCallback(() => {
    if (mode === 'draft' && draftRef.current) {
      createRoomFromDraft(draftRef.current)
      draftRef.current = null
      return
    }

    if (mode === 'fold' && dragRef.current) {
      const room = roomsRef.current.find(entry => entry.id === dragRef.current.id)
      dragRef.current = null
      settleBoostRef.current = 1.25
      if (room) {
        setMessage(`∴ ${room.label} released // the impossible corridors are redistributing pressure ∴`)
      }
    }
  }, [createRoomFromDraft, mode])

  const handleCanvasClick = useCallback(() => {
    if (mode !== 'stitch' || !mouse.isInBounds) return

    const { x, y } = mouse.positionRef.current
    const room = findRoomAt(roomsRef.current, x, y)

    if (!room) {
      pendingLinkRef.current = null
      setMessage('∴ threshold intent dissolved // click one chamber, then another ∴')
      return
    }

    const pending = pendingLinkRef.current
    if (!pending) {
      pendingLinkRef.current = room.id
      setMessage(`∴ first threshold pinned to ${room.label} // choose its counterpart ∴`)
      return
    }

    if (pending === room.id) {
      pendingLinkRef.current = null
      setMessage(`∴ ${room.label} released // choose two different chambers to bend space between them ∴`)
      return
    }

    const key = normalizeEdge(pending, room.id)
    const index = edgesRef.current.findIndex(edge => normalizeEdge(edge.a, edge.b) === key)
    if (index >= 0) {
      edgesRef.current.splice(index, 1)
      setMessage('∴ threshold severed // those rooms no longer agree on adjacency ∴')
    } else {
      edgesRef.current.push({
        a: pending,
        b: room.id,
        phase: Math.random() * Math.PI * 2
      })
      setMessage('∴ new threshold sutured // the floorplan now has another impossible sentence ∴')
    }
    pendingLinkRef.current = null
    settleBoostRef.current = 0.9
  }, [mode, mouse.isInBounds, mouse.positionRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('click', handleCanvasClick)
    return () => canvas.removeEventListener('click', handleCanvasClick)
  }, [canvasRef, handleCanvasClick])

  const updateInteraction = useCallback(() => {
    if (!mouse.isInBounds && !mouse.isDown) {
      hoverRoomRef.current = null
    } else {
      const { x, y } = mouse.positionRef.current
      hoverRoomRef.current = findRoomAt(roomsRef.current, x, y)?.id ?? null
    }

    if (mouse.isDown && !prevMouseDownRef.current) {
      handleMouseDown()
    }

    if (!mouse.isDown && prevMouseDownRef.current) {
      handleMouseUp()
    }

    prevMouseDownRef.current = mouse.isDown

    if (mode === 'draft' && mouse.isDown && draftRef.current) {
      draftRef.current.currentX = mouse.positionRef.current.x
      draftRef.current.currentY = mouse.positionRef.current.y
    }

    if (mode === 'fold' && mouse.isDown && dragRef.current) {
      const room = roomsRef.current.find(entry => entry.id === dragRef.current.id)
      if (!room) return
      room.x = mouse.positionRef.current.x - dragRef.current.offsetX
      room.y = mouse.positionRef.current.y - dragRef.current.offsetY
      clampRoom(room, dimensions.width, dimensions.height)
    }
  }, [dimensions.height, dimensions.width, handleMouseDown, handleMouseUp, mode, mouse.isDown, mouse.isInBounds, mouse.positionRef])

  const computeParadox = useCallback(() => {
    const rooms = roomsRef.current
    const edges = edgesRef.current
    let roomOverlaps = 0
    let seamCrossings = 0

    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        if (overlaps(rooms[i], rooms[j])) roomOverlaps++
      }
    }

    for (let i = 0; i < edges.length; i++) {
      const edgeA = edges[i]
      const roomA1 = rooms.find(room => room.id === edgeA.a)
      const roomA2 = rooms.find(room => room.id === edgeA.b)
      if (!roomA1 || !roomA2) continue
      const centerA1 = centerOf(roomA1)
      const centerA2 = centerOf(roomA2)

      for (let j = i + 1; j < edges.length; j++) {
        const edgeB = edges[j]
        if (edgeA.a === edgeB.a || edgeA.a === edgeB.b || edgeA.b === edgeB.a || edgeA.b === edgeB.b) continue

        const roomB1 = rooms.find(room => room.id === edgeB.a)
        const roomB2 = rooms.find(room => room.id === edgeB.b)
        if (!roomB1 || !roomB2) continue
        const centerB1 = centerOf(roomB1)
        const centerB2 = centerOf(roomB2)

        if (segmentsIntersect(centerA1, centerA2, centerB1, centerB2)) seamCrossings++
      }
    }

    return roomOverlaps + seamCrossings
  }, [])

  const simulateLayout = useCallback((delta) => {
    const rooms = roomsRef.current
    const edges = edgesRef.current
    if (rooms.length === 0) return

    const byId = new Map(rooms.map(room => [room.id, room]))
    const dt = Math.min(2, delta * 60)
    const springScale = (0.014 + foldPressure * 0.02) * (1 + settleBoostRef.current * 0.65)
    let totalStretch = 0
    let seamCount = 0

    if (settleBoostRef.current > 0.02) {
      settleBoostRef.current *= 0.94
    } else {
      settleBoostRef.current = 0
    }

    edgesRef.current = edges.filter(edge => byId.has(edge.a) && byId.has(edge.b))

    edgesRef.current.forEach(edge => {
      const a = byId.get(edge.a)
      const b = byId.get(edge.b)
      const ca = centerOf(a)
      const cb = centerOf(b)
      const dx = cb.x - ca.x
      const dy = cb.y - ca.y
      const dist = Math.hypot(dx, dy) || 1
      const ideal = 150 + (a.w + b.w) * 0.24
      const stretch = (dist - ideal) / ideal
      const force = stretch * springScale * dt
      const nx = dx / dist
      const ny = dy / dist

      if (dragRef.current?.id !== a.id) {
        a.vx += nx * force
        a.vy += ny * force
      }
      if (dragRef.current?.id !== b.id) {
        b.vx -= nx * force
        b.vy -= ny * force
      }

      edge.phase += delta * (0.8 + Math.abs(stretch) * 4)
      totalStretch += Math.abs(stretch)
      seamCount++
    })

    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const a = rooms[i]
        const b = rooms[j]
        const ca = centerOf(a)
        const cb = centerOf(b)
        const dx = cb.x - ca.x
        const dy = cb.y - ca.y
        const dist = Math.hypot(dx, dy) || 1
        const ideal = (a.w + b.w) * 0.45
        if (dist >= ideal) continue
        const repel = ((ideal - dist) / ideal) * 0.06 * dt
        const nx = dx / dist
        const ny = dy / dist

        if (dragRef.current?.id !== a.id) {
          a.vx -= nx * repel
          a.vy -= ny * repel
        }
        if (dragRef.current?.id !== b.id) {
          b.vx += nx * repel
          b.vy += ny * repel
        }
      }
    }

    rooms.forEach(room => {
      const connectionCount = edgesRef.current.reduce((count, edge) => (
        edge.a === room.id || edge.b === room.id ? count + 1 : count
      ), 0)
      const isDragged = dragRef.current?.id === room.id
      const targetDepth = 12 + connectionCount * 7 + echoDepth * 22 + (isDragged ? 22 : 0)
      room.depth = lerp(room.depth, targetDepth, 0.08)
      room.breath += delta * (0.6 + connectionCount * 0.04)

      if (!isDragged) {
        room.x += room.vx * dt
        room.y += room.vy * dt
        room.vx *= 0.8
        room.vy *= 0.8
        clampRoom(room, dimensions.width, dimensions.height)
      } else {
        room.vx *= 0.74
        room.vy *= 0.74
      }
    })

    if (frameRef.current % 10 === 0) {
      setStatSnapshot({
        chambers: rooms.length,
        seams: edgesRef.current.length,
        loops: graphLoops(rooms, edgesRef.current),
        paradox: computeParadox(),
        tension: seamCount ? totalStretch / seamCount : 0
      })
    }
  }, [computeParadox, dimensions.height, dimensions.width, echoDepth, foldPressure])

  const drawBackground = useCallback(() => {
    if (!ctx) return
    const gradient = ctx.createLinearGradient(0, 0, dimensions.width, dimensions.height)
    gradient.addColorStop(0, 'rgba(2, 8, 16, 0.98)')
    gradient.addColorStop(0.45, 'rgba(4, 16, 28, 0.98)')
    gradient.addColorStop(1, 'rgba(0, 6, 12, 0.98)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    ctx.save()
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.06)'
    ctx.lineWidth = 1
    const spacing = 36
    const drift = (timeRef.current * 18) % spacing
    for (let x = -spacing; x < dimensions.width + spacing; x += spacing) {
      ctx.beginPath()
      ctx.moveTo(x + drift, 0)
      ctx.lineTo(x - spacing * 0.7 + drift, dimensions.height)
      ctx.stroke()
    }
    for (let y = 40; y < dimensions.height; y += 34) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(dimensions.width, y)
      ctx.stroke()
    }
    ctx.restore()
  }, [ctx, dimensions.height, dimensions.width])

  const drawEdge = useCallback((edge) => {
    if (!ctx) return
    const roomA = roomsRef.current.find(room => room.id === edge.a)
    const roomB = roomsRef.current.find(room => room.id === edge.b)
    if (!roomA || !roomB) return

    const centerA = centerOf(roomA)
    const centerB = centerOf(roomB)
    const start = pointOnRoom(roomA, centerB.x, centerB.y)
    const end = pointOnRoom(roomB, centerA.x, centerA.y)
    const midpointX = (start.x + end.x) / 2
    const midpointY = (start.y + end.y) / 2
    const dx = end.x - start.x
    const dy = end.y - start.y
    const dist = Math.hypot(dx, dy) || 1
    const nx = -dy / dist
    const ny = dx / dist
    const bend = Math.sin(edge.phase) * 24 + (dist - 160) * 0.08
    const controlX = midpointX + nx * bend
    const controlY = midpointY + ny * bend
    const active = pendingLinkRef.current && (pendingLinkRef.current === edge.a || pendingLinkRef.current === edge.b)

    ctx.save()
    ctx.lineCap = 'round'
    ctx.shadowBlur = active ? 24 : 16
    ctx.shadowColor = active ? 'rgba(255, 220, 120, 0.35)' : 'rgba(102, 255, 204, 0.22)'
    ctx.strokeStyle = active ? 'rgba(255, 224, 146, 0.85)' : 'rgba(102, 255, 204, 0.42)'
    ctx.lineWidth = active ? 5 : 3
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.quadraticCurveTo(controlX, controlY, end.x, end.y)
    ctx.stroke()

    ctx.strokeStyle = active ? 'rgba(255, 247, 204, 0.95)' : 'rgba(210, 255, 245, 0.35)'
    ctx.lineWidth = 1.3
    ctx.setLineDash([8, 18])
    ctx.lineDashOffset = -timeRef.current * 120
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.quadraticCurveTo(controlX, controlY, end.x, end.y)
    ctx.stroke()
    ctx.restore()
  }, [ctx])

  const drawRoom = useCallback((room) => {
    if (!ctx) return
    const hovered = hoverRoomRef.current === room.id
    const pending = pendingLinkRef.current === room.id
    const wobbleX = Math.cos(room.breath) * echoDepth * 6
    const wobbleY = Math.sin(room.breath * 0.9) * echoDepth * 4
    const lift = room.depth

    if (echoes) {
      for (let i = 3; i >= 1; i--) {
        const ghostAlpha = 0.045 * i
        ctx.fillStyle = `hsla(${room.hue}, 80%, ${18 + i * 5}%, ${ghostAlpha})`
        ctx.strokeStyle = `hsla(${room.hue}, 75%, 62%, ${ghostAlpha * 1.6})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(
          room.x + wobbleX * i * 0.52,
          room.y - lift * i * 0.18 + wobbleY * i * 0.52,
          room.w,
          room.h,
          12
        )
        ctx.fill()
        ctx.stroke()
      }
    }

    ctx.save()
    const backX = room.x + wobbleX
    const backY = room.y - lift * 0.24 + wobbleY

    ctx.fillStyle = `hsla(${room.hue}, 82%, 15%, 0.82)`
    ctx.strokeStyle = `hsla(${room.hue}, 86%, 56%, ${hovered || pending ? 0.8 : 0.34})`
    ctx.lineWidth = hovered || pending ? 2.4 : 1.2
    ctx.beginPath()
    ctx.roundRect(backX, backY, room.w, room.h, 14)
    ctx.fill()
    ctx.stroke()

    const frontGradient = ctx.createLinearGradient(room.x, room.y, room.x + room.w, room.y + room.h)
    frontGradient.addColorStop(0, `hsla(${room.hue}, 76%, 18%, 0.94)`)
    frontGradient.addColorStop(1, `hsla(${room.hue + 18}, 82%, 10%, 0.94)`)
    ctx.fillStyle = frontGradient
    ctx.shadowBlur = hovered || pending ? 26 : 16
    ctx.shadowColor = `hsla(${room.hue}, 92%, 62%, ${hovered || pending ? 0.34 : 0.16})`
    ctx.beginPath()
    ctx.roundRect(room.x, room.y, room.w, room.h, 14)
    ctx.fill()

    ctx.strokeStyle = `hsla(${room.hue}, 92%, ${hovered || pending ? 74 : 62}%, ${hovered || pending ? 0.96 : 0.58})`
    ctx.lineWidth = hovered || pending ? 2.3 : 1.4
    ctx.stroke()

    ctx.strokeStyle = `hsla(${room.hue}, 90%, 70%, 0.18)`
    ctx.lineWidth = 1
    ctx.setLineDash([10, 8])
    ctx.lineDashOffset = -timeRef.current * 40
    ctx.strokeRect(room.x + 12, room.y + 18, Math.max(10, room.w - 24), Math.max(10, room.h - 36))
    ctx.setLineDash([])

    ctx.fillStyle = 'rgba(225, 255, 244, 0.9)'
    ctx.font = '12px SF Mono, Monaco, monospace'
    ctx.textBaseline = 'top'
    ctx.fillText(room.label, room.x + 12, room.y + 10)
    ctx.fillStyle = `hsla(${room.hue}, 90%, 72%, 0.7)`
    ctx.font = '10px SF Mono, Monaco, monospace'
    ctx.fillText(`#${room.id.split('-')[1]}`, room.x + 12, room.y + room.h - 18)

    if (pending) {
      ctx.strokeStyle = 'rgba(255, 228, 132, 0.95)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(room.x - 6, room.y - 6, room.w + 12, room.h + 12, 18)
      ctx.stroke()
    }
    ctx.restore()
  }, [ctx, echoes, echoDepth])

  const drawDraft = useCallback(() => {
    if (!ctx || !draftRef.current) return
    const rect = rectFromPoints(
      draftRef.current.startX,
      draftRef.current.startY,
      draftRef.current.currentX,
      draftRef.current.currentY
    )
    ctx.save()
    ctx.fillStyle = 'rgba(102, 255, 204, 0.09)'
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.8)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([10, 8])
    ctx.beginPath()
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 12)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }, [ctx])

  const drawScene = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    drawBackground()
    edgesRef.current.forEach(drawEdge)
    roomsRef.current.forEach(drawRoom)
    drawDraft()

    if (roomsRef.current.length === 0) {
      ctx.save()
      ctx.fillStyle = 'rgba(102, 255, 204, 0.28)'
      ctx.font = '14px SF Mono, Monaco, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('∴ drag to draft the first chamber ∴', dimensions.centerX, dimensions.centerY)
      ctx.restore()
    }
  }, [ctx, dimensions.centerX, dimensions.centerY, dimensions.width, drawBackground, drawDraft, drawEdge, drawRoom])

  const onFrame = useCallback((delta) => {
    if (!ctx || dimensions.width === 0) return
    timeRef.current += delta
    frameRef.current++
    updateInteraction()
    simulateLayout(delta)
    drawScene()
  }, [ctx, dimensions.width, drawScene, simulateLayout, updateInteraction])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let frameId
    let lastTime = performance.now()

    const animate = (time) => {
      const delta = Math.min(0.05, (time - lastTime) / 1000) || 0.016
      lastTime = time
      onFrame(delta)
      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, onFrame])

  const controls = [
    { id: 'settle', label: 'settle()', onClick: settlePlan },
    { id: 'scatter', label: 'scatter()', onClick: scatterPlan },
    { id: 'echoes', label: echoes ? 'echo.on()' : 'echo.off()', onClick: toggleEchoes, active: echoes },
    {
      id: roomsRef.current.length === 0 ? 'seed' : 'clear',
      label: roomsRef.current.length === 0 ? 'seed.plan()' : 'clear()',
      onClick: roomsRef.current.length === 0 ? seedPlan : clearPlan,
      variant: 'reset'
    }
  ]

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="relative z-50 flex items-center justify-between p-2 sm:p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1
            className="text-xl text-glow hidden sm:block"
            style={{ color: experiment.color }}
          >
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      <div className="flex flex-col gap-3 p-3 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <ExperimentControls
            modes={MODES}
            currentMode={mode}
            onModeChange={setMode}
            controls={controls}
          />
          <p className="text-void-green/60 text-xs sm:text-sm font-mono max-w-2xl text-left lg:text-right">
            {message}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-void-cyan/70 text-xs font-mono">
              fold pressure: <span className="text-void-green">{foldPressure.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.01"
              value={foldPressure}
              onChange={(e) => setFoldPressure(parseFloat(e.target.value))}
              className="w-full h-1 bg-void-green/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-void-cyan/70 text-xs font-mono">
              echo depth: <span className="text-void-green">{echoDepth.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={echoDepth}
              onChange={(e) => setEchoDepth(parseFloat(e.target.value))}
              className="w-full h-1 bg-void-green/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full ${mode === 'fold' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
          data-testid="threshold-fold-canvas"
        />

        <div className="absolute bottom-3 left-3 right-3 z-10 flex justify-between gap-3 pointer-events-none">
          <p className="max-w-md text-[11px] sm:text-xs font-mono text-void-green/45">
            draft: drag out chambers
            <br />
            stitch: click two chambers to add or sever a threshold
            <br />
            fold: drag rooms until the seams generate paradox
          </p>
          <p className="hidden md:block text-[11px] sm:text-xs font-mono text-void-cyan/45 text-right">
            mean seam strain: {(statSnapshot.tension * 100).toFixed(1)}%
            <br />
            echoes {echoes ? 'enabled' : 'muted'} // loops {statSnapshot.loops}
          </p>
        </div>
      </div>
    </div>
  )
}

export default ThresholdFold
