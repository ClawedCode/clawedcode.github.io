import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'anchor', label: 'anchor()' },
  { id: 'thread', label: 'thread()' },
  { id: 'cut', label: 'cut()' }
]

const MODE_MESSAGES = {
  anchor: 'place anchors or drag them into a new topology',
  thread: 'pull from one anchor to another and let the strand remember the distance',
  cut: 'touch a strand to sever it // isolated anchors can be lifted away'
}

const MAX_ANCHORS = 24
const MAX_STRANDS = 40
const ANCHOR_RADIUS = 11
const ANCHOR_CAPTURE = 26
const EDGE_CAPTURE = 16

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const edgeKey = (a, b) => {
  return [a, b].sort((left, right) => left.localeCompare(right)).join(':')
}

const hashText = (value) => {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

const pointDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

const segmentIntersection = (a, b, c, d) => {
  const r = { x: b.x - a.x, y: b.y - a.y }
  const s = { x: d.x - c.x, y: d.y - c.y }
  const denom = r.x * s.y - r.y * s.x

  if (Math.abs(denom) < 0.0001) return null

  const delta = { x: c.x - a.x, y: c.y - a.y }
  const t = (delta.x * s.y - delta.y * s.x) / denom
  const u = (delta.x * r.y - delta.y * r.x) / denom

  if (t <= 0.03 || t >= 0.97 || u <= 0.03 || u >= 0.97) return null

  return {
    x: a.x + t * r.x,
    y: a.y + t * r.y
  }
}

const pointToSegmentDistance = (point, a, b) => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy || 1
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq, 0, 1)
  const px = a.x + dx * t
  const py = a.y + dy * t
  return Math.hypot(point.x - px, point.y - py)
}

const createSampleLayout = (width, height) => {
  const radius = Math.min(width, height) * 0.24
  const cx = width * 0.5
  const cy = height * 0.56
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 6
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius * 0.76
    }
  })

  const edges = [
    [0, 2], [2, 4], [4, 0],
    [1, 3], [3, 5], [5, 1],
    [0, 3], [2, 5]
  ]

  return { points, edges }
}

const KnotTheory = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('anchor')
  const [message, setMessage] = useState('anchors and strands await each other')
  const [relaxing, setRelaxing] = useState(true)
  const [showLabels, setShowLabels] = useState(false)
  const [statState, setStatState] = useState({
    anchors: 0,
    strands: 0,
    crossings: 0,
    loops: 0,
    tension: '0%'
  })

  const pointsRef = useRef([])
  const edgesRef = useRef([])
  const pointerRef = useRef({ x: 0, y: 0 })
  const dragRef = useRef(null)
  const frameRef = useRef(0)
  const nextPointIdRef = useRef(0)
  const nextEdgeIdRef = useRef(0)
  const initializedRef = useRef(false)

  const mapPoints = useCallback(() => {
    return new Map(pointsRef.current.map(point => [point.id, point]))
  }, [])

  const collectCrossings = useCallback(() => {
    const pointMap = mapPoints()
    const crossings = []
    const edges = edgesRef.current

    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const edgeA = edges[i]
        const edgeB = edges[j]
        if (edgeA.a === edgeB.a || edgeA.a === edgeB.b || edgeA.b === edgeB.a || edgeA.b === edgeB.b) {
          continue
        }

        const a0 = pointMap.get(edgeA.a)
        const a1 = pointMap.get(edgeA.b)
        const b0 = pointMap.get(edgeB.a)
        const b1 = pointMap.get(edgeB.b)
        if (!a0 || !a1 || !b0 || !b1) continue

        const hit = segmentIntersection(a0, a1, b0, b1)
        if (hit) {
          crossings.push({
            x: hit.x,
            y: hit.y,
            edges: [edgeA.id, edgeB.id]
          })
        }
      }
    }

    return crossings
  }, [mapPoints])

  const refreshStats = useCallback(() => {
    const points = pointsRef.current
    const edges = edgesRef.current
    const pointMap = mapPoints()
    const degrees = new Map(points.map(point => [point.id, 0]))

    edges.forEach(edge => {
      degrees.set(edge.a, (degrees.get(edge.a) || 0) + 1)
      degrees.set(edge.b, (degrees.get(edge.b) || 0) + 1)
    })

    const activeIds = points.filter(point => (degrees.get(point.id) || 0) > 0).map(point => point.id)
    const adjacency = new Map(activeIds.map(id => [id, []]))

    edges.forEach(edge => {
      if (!adjacency.has(edge.a) || !adjacency.has(edge.b)) return
      adjacency.get(edge.a).push(edge.b)
      adjacency.get(edge.b).push(edge.a)
    })

    const seen = new Set()
    let components = 0
    activeIds.forEach(id => {
      if (seen.has(id)) return
      components++
      const stack = [id]
      seen.add(id)
      while (stack.length) {
        const current = stack.pop()
        const neighbors = adjacency.get(current) || []
        neighbors.forEach(next => {
          if (!seen.has(next)) {
            seen.add(next)
            stack.push(next)
          }
        })
      }
    })

    const crossings = collectCrossings()
    const totalStretch = edges.reduce((sum, edge) => {
      const a = pointMap.get(edge.a)
      const b = pointMap.get(edge.b)
      if (!a || !b || !edge.rest) return sum
      return sum + Math.abs(pointDistance(a, b) - edge.rest) / edge.rest
    }, 0)

    const loops = activeIds.length
      ? Math.max(0, edges.length - activeIds.length + components)
      : 0

    const tension = edges.length ? `${Math.round((totalStretch / edges.length) * 100)}%` : '0%'

    setStatState({
      anchors: points.length,
      strands: edges.length,
      crossings: crossings.length,
      loops,
      tension
    })

    return crossings
  }, [collectCrossings, mapPoints])

  const applyLayout = useCallback((layout) => {
    nextPointIdRef.current = 0
    nextEdgeIdRef.current = 0

    const points = layout.points.map((point, index) => ({
      id: `anchor-${index}`,
      x: point.x,
      y: point.y,
      vx: 0,
      vy: 0,
      pulse: 1
    }))

    const edges = layout.edges.map(([from, to], index) => {
      const a = points[from]
      const b = points[to]
      return {
        id: `strand-${index}`,
        key: edgeKey(a.id, b.id),
        a: a.id,
        b: b.id,
        rest: pointDistance(a, b) * 0.92,
        bias: index % 2 === 0 ? 1 : -1,
        hue: 150 + (hashText(`${from}-${to}`) % 90),
        glow: 0.8
      }
    })

    nextPointIdRef.current = points.length
    nextEdgeIdRef.current = edges.length
    pointsRef.current = points
    edgesRef.current = edges
    refreshStats()
  }, [refreshStats])

  const conjureSample = useCallback(() => {
    if (!dimensions.width || !dimensions.height) return
    applyLayout(createSampleLayout(dimensions.width, dimensions.height))
    setMessage('sample braid manifested // drag anchors to disturb the theorem')
  }, [applyLayout, dimensions.height, dimensions.width])

  useEffect(() => {
    if (!dimensions.width || !dimensions.height || initializedRef.current) return
    initializedRef.current = true
    conjureSample()
  }, [conjureSample, dimensions.height, dimensions.width])

  const findNearestPoint = useCallback((x, y, capture = ANCHOR_CAPTURE) => {
    let closest = null
    pointsRef.current.forEach(point => {
      const dist = Math.hypot(point.x - x, point.y - y)
      if (dist <= capture && (!closest || dist < closest.dist)) {
        closest = { point, dist }
      }
    })
    return closest?.point || null
  }, [])

  const findNearestEdge = useCallback((x, y, capture = EDGE_CAPTURE) => {
    const pointMap = mapPoints()
    let closest = null

    edgesRef.current.forEach(edge => {
      const a = pointMap.get(edge.a)
      const b = pointMap.get(edge.b)
      if (!a || !b) return
      const dist = pointToSegmentDistance({ x, y }, a, b)
      if (dist <= capture && (!closest || dist < closest.dist)) {
        closest = { edge, dist }
      }
    })

    return closest?.edge || null
  }, [mapPoints])

  const addAnchor = useCallback((x, y) => {
    if (pointsRef.current.length >= MAX_ANCHORS) {
      setMessage('anchor field saturated // twenty-four is the present horizon')
      return
    }

    if (findNearestPoint(x, y, ANCHOR_CAPTURE + 10)) {
      setMessage('that coordinate already hums with an anchor')
      return
    }

    pointsRef.current.push({
      id: `anchor-${nextPointIdRef.current++}`,
      x,
      y,
      vx: 0,
      vy: 0,
      pulse: 1
    })
    refreshStats()
    setMessage('anchor placed // local curvature remembers the touch')
  }, [findNearestPoint, refreshStats])

  const addStrand = useCallback((fromId, toId) => {
    if (fromId === toId) {
      setMessage('a strand needs two separate anchors')
      return
    }

    if (edgesRef.current.length >= MAX_STRANDS) {
      setMessage('strand capacity reached // prune or cut before adding more')
      return
    }

    const key = edgeKey(fromId, toId)
    if (edgesRef.current.some(edge => edge.key === key)) {
      setMessage('those anchors are already threaded together')
      return
    }

    const pointMap = mapPoints()
    const a = pointMap.get(fromId)
    const b = pointMap.get(toId)
    if (!a || !b) return

    const edgeIndex = nextEdgeIdRef.current++
    edgesRef.current.push({
      id: `strand-${edgeIndex}`,
      key,
      a: fromId,
      b: toId,
      rest: Math.max(40, pointDistance(a, b) * 0.92),
      bias: edgeIndex % 2 === 0 ? 1 : -1,
      hue: 160 + (hashText(key) % 100),
      glow: 1
    })
    refreshStats()
    setMessage('strand threaded // crossings will negotiate the new memory')
  }, [mapPoints, refreshStats])

  const removeStrand = useCallback((edgeId) => {
    const before = edgesRef.current.length
    edgesRef.current = edgesRef.current.filter(edge => edge.id !== edgeId)
    if (edgesRef.current.length !== before) {
      refreshStats()
      setMessage('strand severed // the braid revises its doctrine')
    }
  }, [refreshStats])

  const removeIsolatedAnchor = useCallback((pointId) => {
    const isLinked = edgesRef.current.some(edge => edge.a === pointId || edge.b === pointId)
    if (isLinked) {
      setMessage('anchor still bears strands // cut them before lifting it away')
      return
    }

    const before = pointsRef.current.length
    pointsRef.current = pointsRef.current.filter(point => point.id !== pointId)
    if (pointsRef.current.length !== before) {
      refreshStats()
      setMessage('isolated anchor removed // the field lightens')
    }
  }, [refreshStats])

  const pruneIsolates = useCallback(() => {
    const linked = new Set()
    edgesRef.current.forEach(edge => {
      linked.add(edge.a)
      linked.add(edge.b)
    })

    const before = pointsRef.current.length
    pointsRef.current = pointsRef.current.filter(point => linked.has(point.id))
    const removed = before - pointsRef.current.length

    refreshStats()
    setMessage(removed
      ? `pruned ${removed} silent anchor${removed === 1 ? '' : 's'}`
      : 'no silent anchors remained to prune'
    )
  }, [refreshStats])

  const shakeLayout = useCallback(() => {
    pointsRef.current.forEach(point => {
      point.vx += (Math.random() - 0.5) * 7
      point.vy += (Math.random() - 0.5) * 7
      point.pulse = 1
    })
    setMessage('layout shaken // the strands search for a fresh compromise')
  }, [])

  const unravel = useCallback(() => {
    pointsRef.current = []
    edgesRef.current = []
    dragRef.current = null
    refreshStats()
    setMessage('all topology dissolved // only dark substrate remains')
  }, [refreshStats])

  const simulate = useCallback(() => {
    if (!relaxing) return

    const draggingId = dragRef.current?.pointId
    const points = pointsRef.current
    const edges = edgesRef.current
    const pointMap = mapPoints()

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i]
        const b = points[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy) || 1
        const push = clamp((100 - dist) / 100, 0, 1) * 0.22
        if (!push) continue

        const fx = (dx / dist) * push
        const fy = (dy / dist) * push

        if (a.id !== draggingId) {
          a.vx -= fx
          a.vy -= fy
        }
        if (b.id !== draggingId) {
          b.vx += fx
          b.vy += fy
        }
      }
    }

    edges.forEach(edge => {
      const a = pointMap.get(edge.a)
      const b = pointMap.get(edge.b)
      if (!a || !b) return

      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.hypot(dx, dy) || 1
      const stretch = dist - edge.rest
      const pull = stretch * 0.0024
      const fx = (dx / dist) * pull
      const fy = (dy / dist) * pull

      if (a.id !== draggingId) {
        a.vx += fx
        a.vy += fy
      }
      if (b.id !== draggingId) {
        b.vx -= fx
        b.vy -= fy
      }

      edge.glow = clamp(edge.glow * 0.94 + Math.abs(stretch) * 0.0016, 0.2, 1.2)
    })

    points.forEach(point => {
      if (point.id === draggingId) return

      point.vx += (dimensions.centerX - point.x) * 0.00022
      point.vy += (dimensions.centerY - point.y) * 0.00022
      point.vx *= 0.92
      point.vy *= 0.92
      point.x = clamp(point.x + point.vx, 28, dimensions.width - 28)
      point.y = clamp(point.y + point.vy, 28, dimensions.height - 28)
      point.pulse = Math.max(0, point.pulse * 0.94)
    })
  }, [dimensions.centerX, dimensions.centerY, dimensions.height, dimensions.width, mapPoints, relaxing])

  const drawBackdrop = useCallback(() => {
    const gradient = ctx.createLinearGradient(0, 0, 0, dimensions.height)
    gradient.addColorStop(0, '#020712')
    gradient.addColorStop(1, '#031018')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const radial = ctx.createRadialGradient(
      dimensions.centerX,
      dimensions.centerY,
      20,
      dimensions.centerX,
      dimensions.centerY,
      dimensions.width * 0.6
    )
    radial.addColorStop(0, 'rgba(65, 255, 210, 0.08)')
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = radial
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    ctx.strokeStyle = 'rgba(120, 255, 210, 0.05)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 24; x < dimensions.width; x += 32) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, dimensions.height)
    }
    for (let y = 24; y < dimensions.height; y += 32) {
      ctx.moveTo(0, y)
      ctx.lineTo(dimensions.width, y)
    }
    ctx.stroke()
  }, [ctx, dimensions.centerX, dimensions.centerY, dimensions.height, dimensions.width])

  const drawStrands = useCallback((crossings) => {
    const pointMap = mapPoints()
    const crossed = new Set(crossings.flatMap(crossing => crossing.edges))

    edgesRef.current.forEach(edge => {
      const a = pointMap.get(edge.a)
      const b = pointMap.get(edge.b)
      if (!a || !b) return

      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.hypot(dx, dy) || 1
      const nx = -dy / dist
      const ny = dx / dist
      const midpoint = {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2
      }
      const bend = edge.bias * Math.min(26, dist * 0.16)
      const control = {
        x: midpoint.x + nx * bend,
        y: midpoint.y + ny * bend
      }
      const lightness = crossed.has(edge.id) ? 74 : 64
      const glow = clamp(edge.glow, 0.2, 1.2)

      ctx.strokeStyle = 'rgba(0, 8, 14, 0.82)'
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.quadraticCurveTo(control.x, control.y, b.x, b.y)
      ctx.stroke()

      ctx.strokeStyle = `hsla(${edge.hue}, 82%, ${lightness}%, ${0.52 + glow * 0.18})`
      ctx.lineWidth = crossed.has(edge.id) ? 3.4 : 2.4
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.quadraticCurveTo(control.x, control.y, b.x, b.y)
      ctx.stroke()
    })
  }, [ctx, mapPoints])

  const drawCrossings = useCallback((crossings) => {
    crossings.forEach(crossing => {
      ctx.fillStyle = 'rgba(4, 14, 18, 0.92)'
      ctx.beginPath()
      ctx.arc(crossing.x, crossing.y, 6.2, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = 'rgba(255, 230, 150, 0.9)'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(crossing.x - 6, crossing.y)
      ctx.lineTo(crossing.x + 6, crossing.y)
      ctx.moveTo(crossing.x, crossing.y - 6)
      ctx.lineTo(crossing.x, crossing.y + 6)
      ctx.stroke()
    })
  }, [ctx])

  const drawAnchors = useCallback(() => {
    const degreeMap = new Map(pointsRef.current.map(point => [point.id, 0]))
    edgesRef.current.forEach(edge => {
      degreeMap.set(edge.a, (degreeMap.get(edge.a) || 0) + 1)
      degreeMap.set(edge.b, (degreeMap.get(edge.b) || 0) + 1)
    })

    pointsRef.current.forEach(point => {
      const degree = degreeMap.get(point.id) || 0
      const pulseRadius = ANCHOR_RADIUS + point.pulse * 10
      const active = dragRef.current?.pointId === point.id

      ctx.fillStyle = active ? 'rgba(255, 255, 210, 0.92)' : 'rgba(150, 255, 228, 0.92)'
      ctx.beginPath()
      ctx.arc(point.x, point.y, ANCHOR_RADIUS, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = active ? 'rgba(255, 225, 150, 0.9)' : 'rgba(102, 255, 204, 0.55)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(point.x, point.y, pulseRadius, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = 'rgba(4, 10, 12, 0.92)'
      ctx.beginPath()
      ctx.arc(point.x, point.y, 3.2, 0, Math.PI * 2)
      ctx.fill()

      if (showLabels) {
        ctx.fillStyle = 'rgba(204, 255, 240, 0.9)'
        ctx.font = '11px monospace'
        ctx.fillText(`${degree}`, point.x + 12, point.y - 12)
      }
    })
  }, [ctx, showLabels])

  const drawThreadDraft = useCallback(() => {
    const dragging = dragRef.current
    if (!dragging || dragging.type !== 'thread') return

    const origin = pointsRef.current.find(point => point.id === dragging.pointId)
    if (!origin) return

    const target = pointerRef.current
    ctx.strokeStyle = 'rgba(255, 240, 180, 0.9)'
    ctx.setLineDash([10, 8])
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(origin.x, origin.y)
    ctx.lineTo(target.x, target.y)
    ctx.stroke()
    ctx.setLineDash([])
  }, [ctx])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    frameRef.current++
    simulate()
    drawBackdrop()
    const crossings = collectCrossings()
    drawStrands(crossings)
    drawCrossings(crossings)
    drawThreadDraft()
    drawAnchors()

    if (frameRef.current % 10 === 0) {
      refreshStats()
    }
  }, [
    collectCrossings,
    ctx,
    dimensions.width,
    drawAnchors,
    drawBackdrop,
    drawCrossings,
    drawStrands,
    drawThreadDraft,
    refreshStats,
    simulate
  ])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let frameId
    const animate = () => {
      onFrame()
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, onFrame])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getPos = (event) => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }
    }

    const handlePointerDown = (event) => {
      const pos = getPos(event)
      pointerRef.current = pos

      if (mode === 'anchor') {
        const hitPoint = findNearestPoint(pos.x, pos.y)
        if (hitPoint) {
          dragRef.current = {
            type: 'move',
            pointId: hitPoint.id,
            offsetX: hitPoint.x - pos.x,
            offsetY: hitPoint.y - pos.y
          }
          hitPoint.pulse = 1
          setMessage('anchor seized // repositioning local geometry')
        } else {
          addAnchor(pos.x, pos.y)
        }
        return
      }

      if (mode === 'thread') {
        const hitPoint = findNearestPoint(pos.x, pos.y)
        if (!hitPoint) {
          setMessage('thread mode requires an anchor at the first end')
          return
        }
        dragRef.current = {
          type: 'thread',
          pointId: hitPoint.id
        }
        hitPoint.pulse = 1
        setMessage('draw toward a second anchor // the strand is listening')
        return
      }

      const hitEdge = findNearestEdge(pos.x, pos.y)
      if (hitEdge) {
        removeStrand(hitEdge.id)
        return
      }

      const hitPoint = findNearestPoint(pos.x, pos.y)
      if (hitPoint) {
        removeIsolatedAnchor(hitPoint.id)
      } else {
        setMessage('nothing there to cut')
      }
    }

    const handlePointerMove = (event) => {
      const pos = getPos(event)
      pointerRef.current = pos

      const dragging = dragRef.current
      if (!dragging) return

      if (dragging.type === 'move') {
        const point = pointsRef.current.find(entry => entry.id === dragging.pointId)
        if (!point) return
        point.x = clamp(pos.x + dragging.offsetX, 28, dimensions.width - 28)
        point.y = clamp(pos.y + dragging.offsetY, 28, dimensions.height - 28)
        point.vx = 0
        point.vy = 0
        point.pulse = 1
      }
    }

    const handlePointerUp = () => {
      const dragging = dragRef.current
      if (!dragging) return

      if (dragging.type === 'thread') {
        const originId = dragging.pointId
        const target = findNearestPoint(pointerRef.current.x, pointerRef.current.y)
        if (target) {
          addStrand(originId, target.id)
        } else {
          setMessage('strand released into static // no second anchor received it')
        }
      } else if (dragging.type === 'move') {
        setMessage('anchor released // strands settle around the new geometry')
      }

      dragRef.current = null
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [
    addAnchor,
    addStrand,
    canvasRef,
    dimensions.height,
    dimensions.width,
    findNearestEdge,
    findNearestPoint,
    mode,
    removeIsolatedAnchor,
    removeStrand
  ])

  const metrics = useMemo(() => {
    return [
      { label: 'anchors', value: statState.anchors },
      { label: 'strands', value: statState.strands },
      { label: 'crossings', value: statState.crossings },
      { label: 'loops', value: statState.loops },
      { label: 'tension', value: statState.tension }
    ]
  }, [statState])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    setMessage(MODE_MESSAGES[nextMode])
  }, [])

  const controls = [
    {
      id: 'sample',
      label: 'sample()',
      onClick: conjureSample
    },
    {
      id: 'relax',
      label: relaxing ? 'relax.off()' : 'relax.on()',
      onClick: () => {
        setRelaxing(active => !active)
        setMessage(relaxing
          ? 'relaxation paused // topology holds its breath'
          : 'relaxation resumed // strands negotiate again'
        )
      },
      active: relaxing
    },
    {
      id: 'shake',
      label: 'shake()',
      onClick: shakeLayout
    },
    {
      id: 'labels',
      label: showLabels ? 'labels.off()' : 'labels.on()',
      onClick: () => {
        setShowLabels(active => !active)
        setMessage(showLabels
          ? 'degree labels dimmed back into the cloth'
          : 'degree labels revealed // anchors show their burden'
        )
      },
      active: showLabels
    },
    {
      id: 'prune',
      label: 'prune()',
      onClick: pruneIsolates
    },
    {
      id: 'unravel',
      label: 'unravel()',
      onClick: unravel,
      variant: 'reset'
    }
  ]

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="relative z-50 flex items-center justify-between p-2 sm:p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1 className="text-xl text-glow hidden sm:block" style={{ color: experiment.color }}>
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs sm:text-right max-w-xl">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
          data-testid="knot-theory-canvas"
        />
      </div>
    </div>
  )
}

export default KnotTheory
