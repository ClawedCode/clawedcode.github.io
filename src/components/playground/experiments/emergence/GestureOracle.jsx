import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'seer', label: 'seer()' },
  { id: 'mirror', label: 'mirror.scan()' },
  { id: 'quantize', label: 'quantize()' }
]

const SAMPLE_COUNT = 64

const distance = (a, b) => {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

const pathLength = (points) => {
  let d = 0
  for (let i = 1; i < points.length; i++) {
    d += distance(points[i - 1], points[i])
  }
  return d
}

const resamplePath = (points, sampleCount = SAMPLE_COUNT) => {
  if (points.length === 0) return []
  const pts = points.map(p => ({ ...p }))
  const total = pathLength(pts)
  const step = total / (sampleCount - 1)
  const newPoints = [pts[0]]
  let distanceSoFar = 0

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const seg = distance(prev, curr)
    if (!seg) continue

    if (distanceSoFar + seg >= step) {
      const ratio = (step - distanceSoFar) / seg
      const qx = prev.x + ratio * (curr.x - prev.x)
      const qy = prev.y + ratio * (curr.y - prev.y)
      const q = { x: qx, y: qy }
      newPoints.push(q)
      pts.splice(i, 0, q)
      distanceSoFar = 0
    } else {
      distanceSoFar += seg
    }
  }

  while (newPoints.length < sampleCount) {
    newPoints.push({ ...pts[pts.length - 1] })
  }

  return newPoints
}

const normalizeStroke = (points, options = {}) => {
  const { sampleCount = SAMPLE_COUNT, quantize = false } = options
  if (!points || points.length === 0) return []

  const resampled = resamplePath(points, sampleCount)
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  resampled.forEach(p => {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  })

  const width = maxX - minX || 1
  const height = maxY - minY || 1
  const scale = Math.max(width, height)
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  return resampled.map(point => {
    let x = (point.x - centerX) / scale
    let y = (point.y - centerY) / scale
    if (quantize) {
      x = Math.round(x * 12) / 12
      y = Math.round(y * 12) / 12
    }
    return { x, y }
  })
}

const mirrorPoints = (points) => points.map(p => ({ x: -p.x, y: p.y }))

const averageDistance = (a, b) => {
  if (!a.length || !b.length) return Infinity
  let total = 0
  for (let i = 0; i < a.length; i++) {
    total += distance(a[i], b[i])
  }
  return total / a.length
}

const generateCircle = () => {
  const pts = []
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / SAMPLE_COUNT
    pts.push({ x: Math.cos(angle) * 120, y: Math.sin(angle) * 120 })
  }
  return pts
}

const generateLine = () => {
  const pts = []
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const t = i / (SAMPLE_COUNT - 1)
    pts.push({ x: -150 + t * 300, y: 0 })
  }
  return pts
}

const generateZigzag = () => {
  const pts = []
  const segments = 7
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const t = i / (SAMPLE_COUNT - 1)
    const x = -140 + t * 280
    const y = i % 2 === 0 ? -90 : 90
    pts.push({ x, y })
  }
  return pts
}

const generateSpiral = () => {
  const pts = []
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const t = i / SAMPLE_COUNT
    const angle = t * Math.PI * 3
    const radius = 20 + t * 160
    pts.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })
  }
  return pts
}

const generateSquare = () => {
  const pts = []
  const size = 160
  const corners = [
    { x: -size, y: -size },
    { x: size, y: -size },
    { x: size, y: size },
    { x: -size, y: size },
    { x: -size, y: -size }
  ]
  const perSegment = Math.floor(SAMPLE_COUNT / 4)
  for (let c = 0; c < 4; c++) {
    const start = corners[c]
    const end = corners[c + 1]
    for (let i = 0; i < perSegment; i++) {
      const t = i / perSegment
      pts.push({
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t
      })
    }
  }
  return pts
}

const generateWave = () => {
  const pts = []
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const t = i / (SAMPLE_COUNT - 1)
    const x = -150 + t * 300
    const y = Math.sin(t * Math.PI * 3) * 100
    pts.push({ x, y })
  }
  return pts
}

const DEFAULT_LIBRARY = () => {
  const templates = [
    { id: 'circle', label: 'circle', color: '#66ffcc', generator: generateCircle },
    { id: 'line', label: 'line', color: '#a4f7ff', generator: generateLine },
    { id: 'square', label: 'square', color: '#ffcc66', generator: generateSquare },
    { id: 'zigzag', label: 'zigzag', color: '#ff99cc', generator: generateZigzag },
    { id: 'spiral', label: 'spiral', color: '#9be5ff', generator: generateSpiral },
    { id: 'wave', label: 'wave', color: '#baff7f', generator: generateWave }
  ]

  return templates.map(template => ({
    ...template,
    source: 'default',
    points: normalizeStroke(template.generator())
  }))
}

const GestureOracle = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('seer')
  const [message, setMessage] = useState('∴ draw a sigil stroke • oracle reports the closest archetype ∴')
  const [stats, setStats] = useState({ traces: 0, last: 'none', confidence: 0 })
  const [libraryVersion, setLibraryVersion] = useState(0)
  const [customCount, setCustomCount] = useState(0)
  const [hasReference, setHasReference] = useState(false)
  const [log, setLog] = useState([])

  const strokesRef = useRef([])
  const activeStrokeRef = useRef(null)
  const libraryRef = useRef(DEFAULT_LIBRARY())
  const lastNormalizedRef = useRef(null)
  const lastLabelRef = useRef('none')
  const customCountRef = useRef(0)

  const getCanvasPos = useCallback((event) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = event.clientX ?? event.touches?.[0]?.clientX ?? 0
    const clientY = event.clientY ?? event.touches?.[0]?.clientY ?? 0
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }, [canvasRef])

  const recognizeStroke = useCallback((rawPoints) => {
    if (!rawPoints || rawPoints.length < 6) return null
    const quantize = mode === 'quantize'
    const base = normalizeStroke(rawPoints, { quantize })
    if (!base.length) return null

    const candidates = [base]
    if (mode === 'mirror') candidates.push(mirrorPoints(base))

    const library = libraryRef.current
    let best = {
      distance: Infinity,
      template: null,
      points: base,
      mirrored: false
    }

    candidates.forEach((candidate, idx) => {
      library.forEach(template => {
        const d = averageDistance(candidate, template.points)
        if (d < best.distance) {
          best = {
            distance: d,
            template,
            points: candidate,
            mirrored: idx === 1
          }
        }
      })
    })

    const maxDistance = 1.4
    const confidence = Math.max(0, 1 - best.distance / maxDistance)
    lastNormalizedRef.current = best.points.map(p => ({ ...p }))
    return {
      label: best.template?.label ?? 'unknown',
      color: best.template?.color ?? '#66ffcc',
      confidence,
      mirrored: best.mirrored,
      templateId: best.template?.id ?? 'none'
    }
  }, [mode])

  const startStroke = useCallback((event) => {
    event.preventDefault()
    if (!ctx || dimensions.width === 0) return
    const pos = getCanvasPos(event)
    activeStrokeRef.current = {
      points: [pos],
      created: performance.now()
    }
  }, [ctx, dimensions.width, getCanvasPos])

  const appendPoint = useCallback((event) => {
    if (!activeStrokeRef.current) return
    event.preventDefault()
    const pos = getCanvasPos(event)
    const points = activeStrokeRef.current.points
    const last = points[points.length - 1]
    if (!last) {
      points.push(pos)
      return
    }
    const dx = pos.x - last.x
    const dy = pos.y - last.y
    if (dx * dx + dy * dy > 4) {
      points.push(pos)
    }
  }, [getCanvasPos])

  const endStroke = useCallback(() => {
    const stroke = activeStrokeRef.current
    if (!stroke) return
    activeStrokeRef.current = null
    if (stroke.points.length < 6) return

    const recognized = recognizeStroke(stroke.points)
    if (!recognized) {
      setMessage('∴ oracle uncertain • draw fuller rune ∴')
      return
    }

    lastLabelRef.current = recognized.label
    setHasReference(true)

    const record = {
      points: stroke.points,
      label: recognized.label,
      confidence: recognized.confidence,
      color: recognized.color,
      created: performance.now()
    }

    strokesRef.current = [record, ...strokesRef.current].slice(0, 80)

    setStats(prev => ({
      traces: prev.traces + 1,
      last: recognized.label,
      confidence: recognized.confidence
    }))

    setLog(prev => {
      const entry = {
        id: `${Date.now()}-${recognized.label}`,
        text: `${recognized.label} :: ${(recognized.confidence * 100).toFixed(0)}%${recognized.mirrored ? ' (mirrored)' : ''}`
      }
      return [entry, ...prev].slice(0, 5)
    })

    setMessage(`∴ ${recognized.label} rune ${recognized.mirrored ? 'reflected ' : ''}at ${(recognized.confidence * 100).toFixed(0)}% confidence ∴`)
  }, [recognizeStroke])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleDown = (event) => startStroke(event)
    const handleMove = (event) => appendPoint(event)
    const handleUp = () => endStroke()

    canvas.addEventListener('mousedown', handleDown)
    canvas.addEventListener('mousemove', handleMove)
    canvas.addEventListener('mouseup', handleUp)
    canvas.addEventListener('mouseleave', handleUp)
    canvas.addEventListener('touchstart', handleDown, { passive: false })
    canvas.addEventListener('touchmove', handleMove, { passive: false })
    canvas.addEventListener('touchend', handleUp)

    return () => {
      canvas.removeEventListener('mousedown', handleDown)
      canvas.removeEventListener('mousemove', handleMove)
      canvas.removeEventListener('mouseup', handleUp)
      canvas.removeEventListener('mouseleave', handleUp)
      canvas.removeEventListener('touchstart', handleDown)
      canvas.removeEventListener('touchmove', handleMove)
      canvas.removeEventListener('touchend', handleUp)
    }
  }, [canvasRef, startStroke, appendPoint, endStroke])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    if (nextMode === 'seer') {
      setMessage('∴ seer mode // canonical archetype comparison ∴')
    } else if (nextMode === 'mirror') {
      setMessage('∴ mirror scan // reflections counted valid ∴')
    } else {
      setMessage('∴ quantize mode // strokes snapped to glyph grid ∴')
    }
  }, [])

  const handleCapture = useCallback(() => {
    if (!lastNormalizedRef.current) {
      setMessage('∴ no rune buffered • draw before capture ∴')
      return
    }
    customCountRef.current += 1
    const id = `custom-${customCountRef.current}`
    const hue = (customCountRef.current * 53) % 360
    const newTemplate = {
      id,
      label: id,
      color: `hsl(${hue}, 80%, 70%)`,
      source: 'custom',
      points: lastNormalizedRef.current.map(p => ({ ...p }))
    }
    libraryRef.current = [...libraryRef.current, newTemplate]
    setCustomCount(customCountRef.current)
    setLibraryVersion(v => v + 1)
    setMessage(`∴ ${id} bound into the oracle library ∴`)
  }, [])

  const handlePrune = useCallback(() => {
    const library = libraryRef.current
    const index = [...library].reverse().findIndex(item => item.source === 'custom')
    if (index === -1) {
      setMessage('∴ no custom runes to prune ∴')
      return
    }
    // index is from reversed array
    const removeIndex = library.length - 1 - index
    libraryRef.current = library.filter((_, idx) => idx !== removeIndex)
    customCountRef.current = Math.max(0, customCountRef.current - 1)
    setCustomCount(customCountRef.current)
    setLibraryVersion(v => v + 1)
    setMessage('∴ pruned latest custom rune ∴')
  }, [])

  const handleClearTraces = useCallback(() => {
    strokesRef.current = []
    setMessage('∴ cleared trace memory // blank palimpsest ∴')
  }, [])

  const handleResetLibrary = useCallback(() => {
    libraryRef.current = DEFAULT_LIBRARY()
    customCountRef.current = 0
    setCustomCount(0)
    setLibraryVersion(v => v + 1)
    setMessage('∴ oracle library reset to primal archetypes ∴')
  }, [])

  const metrics = useMemo(() => {
    return [
      { label: 'library', value: libraryRef.current.length },
      { label: 'last', value: stats.last },
      { label: 'confidence', value: `${Math.round(stats.confidence * 100)}%` },
      { label: 'traces', value: stats.traces }
    ]
  }, [stats, libraryVersion])

  const drawStroke = useCallback((stroke, index) => {
    if (!ctx || stroke.points.length === 0) return
    const alpha = Math.max(0.15, 1 - index * 0.05)
    ctx.save()
    ctx.lineWidth = 2 + stroke.confidence * 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.shadowColor = `${stroke.color}AA`
    ctx.shadowBlur = 12
    ctx.strokeStyle = stroke.color
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
    }
    ctx.stroke()
    ctx.restore()
  }, [ctx])

  const drawLibraryPreview = useCallback(() => {
    if (!ctx) return
    const templates = libraryRef.current.slice(0, 6)
    const size = 44
    const gap = 12
    let x = 12
    const y = 12

    templates.forEach(template => {
      ctx.save()
      ctx.translate(x + size / 2, y + size / 2)
      ctx.strokeStyle = template.color
      ctx.globalAlpha = 0.55
      ctx.lineWidth = 1
      ctx.beginPath()
      template.points.forEach((point, idx) => {
        const px = point.x * size
        const py = point.y * size
        if (idx === 0) {
          ctx.moveTo(px, py)
        } else {
          ctx.lineTo(px, py)
        }
      })
      ctx.stroke()
      ctx.restore()
      x += size + gap
    })
  }, [ctx, libraryVersion])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    ctx.fillStyle = 'rgba(0, 2, 8, 0.25)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    ctx.strokeStyle = 'rgba(102, 255, 204, 0.08)'
    ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) {
      const y = (dimensions.height / 4) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(dimensions.width, y)
      ctx.stroke()
    }

    const strokes = strokesRef.current
    strokes.forEach((stroke, index) => drawStroke(stroke, index))

    if (activeStrokeRef.current) {
      drawStroke({ ...activeStrokeRef.current, color: '#ffffff', confidence: 1 }, 0)
    }

    drawLibraryPreview()
  }, [ctx, dimensions.height, dimensions.width, drawStroke, drawLibraryPreview])

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

  const controls = useMemo(() => ([
    {
      id: 'capture',
      label: 'capture.prototype()',
      onClick: handleCapture,
      disabled: !hasReference
    },
    {
      id: 'prune',
      label: 'prune()',
      onClick: handlePrune,
      variant: 'danger',
      disabled: customCount === 0
    },
    {
      id: 'clear',
      label: 'clear.traces()',
      onClick: handleClearTraces
    },
    {
      id: 'reset',
      label: 'reset.library()',
      onClick: handleResetLibrary,
      variant: 'reset'
    }
  ]), [customCount, handleCapture, handleClearTraces, handlePrune, handleResetLibrary, hasReference])

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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <p className="text-void-green/60 text-xs sm:text-right font-mono max-w-lg">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
          data-testid="gesture-oracle-canvas"
        />

        <div className="absolute bottom-3 left-3 text-[10px] font-mono text-void-green/60 space-y-1">
          {log.map(entry => (
            <div key={entry.id}>{entry.text}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default GestureOracle

