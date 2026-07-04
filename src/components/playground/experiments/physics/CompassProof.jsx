import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'point', label: 'point()' },
  { id: 'line', label: 'straightedge()' },
  { id: 'circle', label: 'compass()' },
  { id: 'intersect', label: 'intersect()' }
]

const EPS = 0.001
const HIT_R = 15

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

const pointKey = (p) => `${Math.round(p.x / 4)}:${Math.round(p.y / 4)}`

const lineCircleIntersections = (line, circle) => {
  const dx = line.b.x - line.a.x
  const dy = line.b.y - line.a.y
  const fx = line.a.x - circle.c.x
  const fy = line.a.y - circle.c.y
  const aa = dx * dx + dy * dy
  const bb = 2 * (fx * dx + fy * dy)
  const cc = fx * fx + fy * fy - circle.r * circle.r
  const disc = bb * bb - 4 * aa * cc

  if (disc < -EPS || aa < EPS) return []
  if (Math.abs(disc) < EPS) {
    const t = -bb / (2 * aa)
    return [{ x: line.a.x + dx * t, y: line.a.y + dy * t }]
  }

  const root = Math.sqrt(disc)
  const t1 = (-bb - root) / (2 * aa)
  const t2 = (-bb + root) / (2 * aa)
  return [
    { x: line.a.x + dx * t1, y: line.a.y + dy * t1 },
    { x: line.a.x + dx * t2, y: line.a.y + dy * t2 }
  ]
}

const lineLineIntersection = (first, second) => {
  const x1 = first.a.x
  const y1 = first.a.y
  const x2 = first.b.x
  const y2 = first.b.y
  const x3 = second.a.x
  const y3 = second.a.y
  const x4 = second.b.x
  const y4 = second.b.y
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)

  if (Math.abs(den) < EPS) return null

  const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / den
  const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / den
  return { x: px, y: py }
}

const circleCircleIntersections = (first, second) => {
  const dx = second.c.x - first.c.x
  const dy = second.c.y - first.c.y
  const d = Math.hypot(dx, dy)

  if (d < EPS || d > first.r + second.r + EPS || d < Math.abs(first.r - second.r) - EPS) return []

  const a = (first.r * first.r - second.r * second.r + d * d) / (2 * d)
  const hSq = first.r * first.r - a * a
  if (hSq < -EPS) return []

  const xm = first.c.x + (a * dx) / d
  const ym = first.c.y + (a * dy) / d

  if (Math.abs(hSq) < EPS) return [{ x: xm, y: ym }]

  const h = Math.sqrt(hSq)
  const rx = -dy * (h / d)
  const ry = dx * (h / d)
  return [
    { x: xm + rx, y: ym + ry },
    { x: xm - rx, y: ym - ry }
  ]
}

const CompassProof = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('point')
  const [revision, setRevision] = useState(0)
  const [message, setMessage] = useState('Euclid wakes in the dark glass')

  const pointsRef = useRef([])
  const linesRef = useRef([])
  const circlesRef = useRef([])
  const selectedRef = useRef([])
  const intersectionsRef = useRef([])
  const nextPointRef = useRef(0)
  const frameRef = useRef(0)

  const bump = useCallback(() => setRevision(n => n + 1), [])

  const labelFor = useCallback((index) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    if (index < alphabet.length) return alphabet[index]
    return `P${index - alphabet.length + 1}`
  }, [])

  const addPoint = useCallback((x, y, kind = 'free') => {
    const existing = pointsRef.current.find(point => Math.hypot(point.x - x, point.y - y) < 7)
    if (existing) return existing

    const point = {
      id: `p-${nextPointRef.current}`,
      label: labelFor(nextPointRef.current),
      x,
      y,
      kind
    }
    nextPointRef.current++
    pointsRef.current.push(point)
    return point
  }, [labelFor])

  const getPoint = useCallback((id) => pointsRef.current.find(point => point.id === id), [])

  const currentLineModels = useCallback(() => {
    return linesRef.current
      .map(line => {
        const a = getPoint(line.a)
        const b = getPoint(line.b)
        return a && b ? { ...line, a, b } : null
      })
      .filter(Boolean)
  }, [getPoint])

  const currentCircleModels = useCallback(() => {
    return circlesRef.current
      .map(circle => {
        const c = getPoint(circle.c)
        const edge = getPoint(circle.edge)
        return c && edge ? { ...circle, c, edge, r: dist(c, edge) } : null
      })
      .filter(Boolean)
  }, [getPoint])

  const computeIntersections = useCallback(() => {
    const lines = currentLineModels()
    const circles = currentCircleModels()
    const hits = []
    const seen = new Set()
    const push = (point, source) => {
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return
      if (
        point.x < -80 ||
        point.y < -80 ||
        point.x > dimensions.width + 80 ||
        point.y > dimensions.height + 80
      ) return

      const key = pointKey(point)
      if (seen.has(key)) return
      if (pointsRef.current.some(existing => Math.hypot(existing.x - point.x, existing.y - point.y) < 7)) return
      seen.add(key)
      hits.push({ ...point, source })
    }

    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        push(lineLineIntersection(lines[i], lines[j]), 'line-line')
      }
    }

    lines.forEach(line => {
      circles.forEach(circle => {
        lineCircleIntersections(line, circle).forEach(point => push(point, 'line-circle'))
      })
    })

    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        circleCircleIntersections(circles[i], circles[j]).forEach(point => push(point, 'circle-circle'))
      }
    }

    intersectionsRef.current = hits
    return hits
  }, [currentLineModels, currentCircleModels, dimensions.width, dimensions.height])

  const resetSlate = useCallback(() => {
    pointsRef.current = []
    linesRef.current = []
    circlesRef.current = []
    selectedRef.current = []
    intersectionsRef.current = []
    nextPointRef.current = 0

    if (dimensions.width > 0 && dimensions.height > 0) {
      const y = dimensions.centerY + dimensions.height * 0.14
      const spread = Math.min(180, dimensions.width * 0.22)
      const a = addPoint(dimensions.centerX - spread, y, 'axiom')
      const b = addPoint(dimensions.centerX + spread, y, 'axiom')
      selectedRef.current = [a.id, b.id]
      setMessage('two axioms placed; choose a construction')
    }

    bump()
  }, [addPoint, bump, dimensions.width, dimensions.height, dimensions.centerX, dimensions.centerY])

  useEffect(() => {
    if (dimensions.width === 0 || pointsRef.current.length > 0) return
    resetSlate()
  }, [dimensions.width, resetSlate])

  const findNearestPoint = useCallback((x, y) => {
    let best = null
    let bestD = HIT_R
    pointsRef.current.forEach(point => {
      const d = Math.hypot(point.x - x, point.y - y)
      if (d < bestD) {
        bestD = d
        best = point
      }
    })
    return best
  }, [])

  const findNearestIntersection = useCallback((x, y) => {
    let best = null
    let bestD = HIT_R
    intersectionsRef.current.forEach(point => {
      const d = Math.hypot(point.x - x, point.y - y)
      if (d < bestD) {
        bestD = d
        best = point
      }
    })
    return best
  }, [])

  const selectPoint = useCallback((point) => {
    const next = selectedRef.current.filter(id => id !== point.id)
    next.push(point.id)
    selectedRef.current = next.slice(-2)
  }, [])

  const addLine = useCallback((a, b) => {
    if (a === b) return
    const exists = linesRef.current.some(line =>
      (line.a === a && line.b === b) || (line.a === b && line.b === a)
    )
    if (!exists) linesRef.current.push({ id: `l-${linesRef.current.length}`, a, b })
  }, [])

  const addCircle = useCallback((c, edge) => {
    if (c === edge) return
    const exists = circlesRef.current.some(circle => circle.c === c && circle.edge === edge)
    if (!exists) circlesRef.current.push({ id: `c-${circlesRef.current.length}`, c, edge })
  }, [])

  const handleCanvasDown = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const nearbyPoint = findNearestPoint(x, y)
    const nearbyIntersection = findNearestIntersection(x, y)

    if (mode === 'point') {
      const point = nearbyPoint || addPoint(x, y, 'free')
      selectPoint(point)
      setMessage(`${point.label} marked on the proof-skin`)
      computeIntersections()
      bump()
      return
    }

    if (mode === 'intersect') {
      if (!nearbyIntersection) {
        setMessage('no unresolved crossing under the paw')
        return
      }
      const point = addPoint(nearbyIntersection.x, nearbyIntersection.y, 'derived')
      selectPoint(point)
      setMessage(`${point.label} materialized from ${nearbyIntersection.source}`)
      computeIntersections()
      bump()
      return
    }

    const point = nearbyPoint || (nearbyIntersection && addPoint(nearbyIntersection.x, nearbyIntersection.y, 'derived'))
    if (!point) {
      setMessage('choose existing points, or resolve a crossing first')
      return
    }

    selectPoint(point)
    const [a, b] = selectedRef.current

    if (a && b) {
      if (mode === 'line') {
        addLine(a, b)
        setMessage('straightedge laid across selected stars')
      } else if (mode === 'circle') {
        addCircle(a, b)
        setMessage('compass radius remembered')
      }
      computeIntersections()
    } else {
      setMessage(`${point.label} selected; await the second mark`)
    }

    bump()
  }, [
    addCircle,
    addLine,
    addPoint,
    bump,
    canvasRef,
    computeIntersections,
    findNearestIntersection,
    findNearestPoint,
    mode,
    selectPoint
  ])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('pointerdown', handleCanvasDown)
    return () => canvas.removeEventListener('pointerdown', handleCanvasDown)
  }, [canvasRef, handleCanvasDown])

  const handleResolveAll = useCallback(() => {
    const hits = computeIntersections()
    let added = 0
    hits.forEach(hit => {
      const point = addPoint(hit.x, hit.y, 'derived')
      if (point.kind === 'derived') added++
    })
    selectedRef.current = pointsRef.current.slice(-2).map(point => point.id)
    setMessage(`${added} crossings condensed into selectable points`)
    bump()
  }, [addPoint, bump, computeIntersections])

  const handleEquilateral = useCallback(() => {
    const [a, b] = selectedRef.current
    if (!a || !b) {
      setMessage('select two points before invoking the equilateral rite')
      return
    }

    addCircle(a, b)
    addCircle(b, a)
    const hits = computeIntersections()
    const apex = hits.find(hit => hit.source === 'circle-circle')
    if (apex) {
      const point = addPoint(apex.x, apex.y, 'derived')
      addLine(a, point.id)
      addLine(b, point.id)
      selectedRef.current = [a, point.id]
    }
    setMessage('equilateral proof unfolded from twin compass bites')
    bump()
  }, [addCircle, addLine, addPoint, bump, computeIntersections])

  const handleBisect = useCallback(() => {
    const [aId, bId] = selectedRef.current
    const a = getPoint(aId)
    const b = getPoint(bId)
    if (!a || !b) {
      setMessage('select two points to split the segment')
      return
    }

    const mid = addPoint((a.x + b.x) / 2, (a.y + b.y) / 2, 'derived')
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const span = Math.max(dimensions.width, dimensions.height) * 0.18
    const p = addPoint(mid.x - (dy / len) * span, mid.y + (dx / len) * span, 'helper')
    const q = addPoint(mid.x + (dy / len) * span, mid.y - (dx / len) * span, 'helper')
    addLine(p.id, q.id)
    selectedRef.current = [aId, mid.id]
    setMessage(`${mid.label} bisects the chosen interval`)
    bump()
  }, [addLine, addPoint, bump, dimensions.width, dimensions.height, getPoint])

  const handleClearSelection = useCallback(() => {
    selectedRef.current = []
    setMessage('selection washed clean')
    bump()
  }, [bump])

  const drawInfiniteLine = useCallback((line) => {
    const dx = line.b.x - line.a.x
    const dy = line.b.y - line.a.y
    const len = Math.hypot(dx, dy)
    if (len < EPS) return

    const ux = dx / len
    const uy = dy / len
    const span = Math.max(dimensions.width, dimensions.height) * 2
    ctx.beginPath()
    ctx.moveTo(line.a.x - ux * span, line.a.y - uy * span)
    ctx.lineTo(line.a.x + ux * span, line.a.y + uy * span)
    ctx.stroke()
  }, [ctx, dimensions.width, dimensions.height])

  const draw = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    frameRef.current++
    const t = frameRef.current * 0.03
    const points = pointsRef.current
    const lines = currentLineModels()
    const circles = currentCircleModels()
    const intersections = computeIntersections()
    const selected = new Set(selectedRef.current)

    ctx.fillStyle = 'rgba(0, 2, 7, 0.34)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    ctx.lineWidth = 1
    for (let x = 0; x < dimensions.width; x += 36) {
      ctx.strokeStyle = x % 108 === 0 ? 'rgba(102, 255, 204, 0.07)' : 'rgba(102, 255, 204, 0.035)'
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, dimensions.height)
      ctx.stroke()
    }
    for (let y = 0; y < dimensions.height; y += 36) {
      ctx.strokeStyle = y % 108 === 0 ? 'rgba(102, 255, 204, 0.07)' : 'rgba(102, 255, 204, 0.035)'
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(dimensions.width, y)
      ctx.stroke()
    }

    ctx.lineWidth = 1.25
    circles.forEach(circle => {
      ctx.strokeStyle = 'rgba(255, 214, 122, 0.38)'
      ctx.shadowBlur = 10
      ctx.shadowColor = 'rgba(255, 214, 122, 0.16)'
      ctx.beginPath()
      ctx.arc(circle.c.x, circle.c.y, circle.r, 0, Math.PI * 2)
      ctx.stroke()
    })

    ctx.shadowBlur = 8
    ctx.shadowColor = 'rgba(126, 227, 255, 0.15)'
    ctx.strokeStyle = 'rgba(126, 227, 255, 0.5)'
    lines.forEach(drawInfiniteLine)
    ctx.shadowBlur = 0

    intersections.forEach((point, i) => {
      const pulse = 0.5 + Math.sin(t + i) * 0.25
      ctx.strokeStyle = `rgba(255, 102, 204, ${0.45 + pulse * 0.35})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(point.x - 6, point.y)
      ctx.lineTo(point.x + 6, point.y)
      ctx.moveTo(point.x, point.y - 6)
      ctx.lineTo(point.x, point.y + 6)
      ctx.stroke()
    })

    points.forEach(point => {
      const isSelected = selected.has(point.id)
      const isDerived = point.kind === 'derived'
      const isHelper = point.kind === 'helper'
      const radius = isSelected ? 7 : isDerived ? 5 : isHelper ? 4 : 5.5

      ctx.beginPath()
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = isHelper
        ? 'rgba(153, 255, 221, 0.58)'
        : isDerived
        ? 'rgba(255, 102, 204, 0.82)'
        : 'rgba(230, 255, 154, 0.9)'
      ctx.fill()

      ctx.strokeStyle = isSelected ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.42)'
      ctx.lineWidth = isSelected ? 2 : 1
      ctx.stroke()

      if (isSelected) {
        ctx.beginPath()
        ctx.arc(point.x, point.y, radius + 6 + Math.sin(t * 2) * 1.5, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(230, 255, 154, 0.35)'
        ctx.stroke()
      }

      ctx.fillStyle = 'rgba(235, 255, 245, 0.74)'
      ctx.font = '11px "Courier New", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(point.label, point.x, point.y - 13)
    })
  }, [
    computeIntersections,
    ctx,
    currentCircleModels,
    currentLineModels,
    dimensions.width,
    dimensions.height,
    drawInfiniteLine
  ])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return

    let frameId
    const animate = () => {
      draw()
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, draw])

  const metrics = useMemo(() => [
    { label: 'points', value: pointsRef.current.length },
    { label: 'lines', value: linesRef.current.length },
    { label: 'circles', value: circlesRef.current.length },
    { label: 'crossings', value: intersectionsRef.current.length }
  ], [revision])

  const controls = [
    { id: 'resolve', label: 'resolve.crossings()', onClick: handleResolveAll },
    { id: 'equilateral', label: 'equilateral()', onClick: handleEquilateral },
    { id: 'bisect', label: 'bisect()', onClick: handleBisect },
    { id: 'clear-selection', label: 'clear.selection()', onClick: handleClearSelection },
    { id: 'reset', label: 'reset.slate()', onClick: resetSlate, variant: 'reset' }
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

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 sm:gap-3 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={setMode}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs lg:text-right max-w-lg">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
          data-testid="compass-proof-canvas"
        />
      </div>
    </div>
  )
}

export default CompassProof
