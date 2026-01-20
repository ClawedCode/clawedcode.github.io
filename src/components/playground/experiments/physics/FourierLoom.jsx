import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'sketch', label: 'sketch()' },
  { id: 'epicycles', label: 'epicycles()' }
]

const SPEED_STEPS = [0.6, 1, 1.5, 2.2]
const SAMPLE_COUNT = 240

const FourierLoom = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  useMouseInteraction(canvasRef)

  const [currentMode, setCurrentMode] = useState('sketch')
  const [isPlaying, setIsPlaying] = useState(false)
  const [harmonics, setHarmonics] = useState(18)
  const [message, setMessage] = useState('draw a glyph, then transform() into spinning sums')
  const [speedIndex, setSpeedIndex] = useState(1)
  const [coverage, setCoverage] = useState(0)
  const [strokeVersion, setStrokeVersion] = useState(0)
  const [isReverse, setIsReverse] = useState(false)

  const pathRef = useRef([])
  const resampledRef = useRef([])
  const fourierRef = useRef([])
  const traceRef = useRef([])
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef(null)
  const timeRef = useRef(0)

  const speed = SPEED_STEPS[speedIndex]

  const getCanvasPosition = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }, [canvasRef])

  const resamplePath = useCallback((points, targetCount = SAMPLE_COUNT) => {
    if (points.length < 2) return points

    const distances = [0]
    let total = 0
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x
      const dy = points[i].y - points[i - 1].y
      total += Math.hypot(dx, dy)
      distances.push(total)
    }

    const resampled = [points[0]]
    const step = total / (targetCount - 1)
    let current = step
    let idx = 1

    for (let i = 1; i < targetCount - 1; i++) {
      while (idx < points.length && distances[idx] < current) {
        idx++
      }

      const prevIdx = Math.max(idx - 1, 0)
      const prevDist = distances[prevIdx]
      const nextDist = distances[idx] ?? total
      const t = nextDist === prevDist ? 0 : (current - prevDist) / (nextDist - prevDist)

      const prevPoint = points[prevIdx]
      const nextPoint = points[Math.min(idx, points.length - 1)]

      resampled.push({
        x: prevPoint.x + (nextPoint.x - prevPoint.x) * t,
        y: prevPoint.y + (nextPoint.y - prevPoint.y) * t
      })

      current += step
    }

    resampled.push(points[points.length - 1])
    return resampled
  }, [])

  const recalcCoverage = useCallback((count = harmonics) => {
    const coeffs = fourierRef.current
    if (!coeffs.length) {
      setCoverage(0)
      return
    }

    const total = coeffs.reduce((sum, c) => sum + c.amp, 0) || 1
    const used = coeffs.slice(0, Math.max(1, count)).reduce((sum, c) => sum + c.amp, 0)
    setCoverage(Math.min(100, (used / total) * 100))
  }, [harmonics])

  const beginStroke = useCallback((pos) => {
    if (!pos) return
    pathRef.current = [pos]
    resampledRef.current = []
    fourierRef.current = []
    traceRef.current = []
    isDrawingRef.current = true
    lastPosRef.current = pos
    timeRef.current = 0
    setIsPlaying(false)
    setCurrentMode('sketch')
    setMessage('sketching luminous ink')
  }, [])

  const extendStroke = useCallback((pos) => {
    if (!isDrawingRef.current || !pos) return

    const last = lastPosRef.current
    const dx = pos.x - last.x
    const dy = pos.y - last.y
    if (dx * dx + dy * dy < 2) return

    pathRef.current.push(pos)
    lastPosRef.current = pos
  }, [])

  const endStroke = useCallback(() => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    setMessage('stroke captured • transform() to weave epicycles')
    setStrokeVersion(v => v + 1)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleDown = (e) => {
      e.preventDefault()
      const pos = getCanvasPosition(e)
      beginStroke(pos)
    }

    const handleMove = (e) => {
      if (!isDrawingRef.current) return
      e.preventDefault()
      const pos = getCanvasPosition(e)
      extendStroke(pos)
    }

    const handleUp = (e) => {
      e.preventDefault()
      endStroke()
    }

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
  }, [canvasRef, getCanvasPosition, beginStroke, extendStroke, endStroke])

  const computeFourier = useCallback(() => {
    if (pathRef.current.length < 6 || dimensions.width === 0) {
      setMessage('need a longer stroke to weave frequencies')
      return
    }

    const resampled = resamplePath(pathRef.current, SAMPLE_COUNT)
    resampledRef.current = resampled

    const centroid = resampled.reduce((acc, p) => ({
      x: acc.x + p.x / resampled.length,
      y: acc.y + p.y / resampled.length
    }), { x: 0, y: 0 })

    const centered = resampled.map(p => ({
      x: p.x - centroid.x,
      y: p.y - centroid.y
    }))

    const N = centered.length
    const coeffs = []

    for (let k = 0; k < N; k++) {
      let re = 0
      let im = 0
      for (let n = 0; n < N; n++) {
        const angle = (-2 * Math.PI * k * n) / N
        const px = centered[n].x
        const py = centered[n].y
        re += px * Math.cos(angle) - py * Math.sin(angle)
        im += px * Math.sin(angle) + py * Math.cos(angle)
      }
      re /= N
      im /= N
      const amp = Math.hypot(re, im)
      const phase = Math.atan2(im, re)
      coeffs.push({ freq: k, amp, phase })
    }

    coeffs.sort((a, b) => b.amp - a.amp)
    fourierRef.current = coeffs
    traceRef.current = []
    timeRef.current = 0
    setCurrentMode('epicycles')
    setMessage('epicycles ready • press play()')
    setStrokeVersion(v => v + 1)
    recalcCoverage(harmonics)
  }, [dimensions.width, resamplePath, harmonics, recalcCoverage])

  const togglePlay = useCallback(() => {
    if (!fourierRef.current.length) {
      setMessage('transform() before playing epicycles')
      return
    }
    setIsPlaying(p => !p)
    setMessage(isPlaying ? 'paused epicycles' : 'epicycles spinning')
  }, [isPlaying])

  const toggleReverse = useCallback(() => {
    setIsReverse(v => !v)
    setMessage('time rewound through harmonics')
  }, [])

  const adjustHarmonics = useCallback((delta) => {
    setHarmonics(h => {
      const max = Math.max(4, Math.min(SAMPLE_COUNT, fourierRef.current.length || SAMPLE_COUNT))
      const next = Math.min(max, Math.max(3, h + delta))
      recalcCoverage(next)
      return next
    })
  }, [recalcCoverage])

  const cycleSpeed = useCallback(() => {
    setSpeedIndex(i => (i + 1) % SPEED_STEPS.length)
    setMessage('tempo shifted')
  }, [])

  const handleReset = useCallback(() => {
    pathRef.current = []
    resampledRef.current = []
    fourierRef.current = []
    traceRef.current = []
    timeRef.current = 0
    setIsPlaying(false)
    setCurrentMode('sketch')
    setMessage('void cleared • sketch anew')
    setStrokeVersion(v => v + 1)
    setCoverage(0)
  }, [])

  const computeState = useCallback((t) => {
    const coeffs = fourierRef.current.slice(0, Math.max(1, harmonics))
    let x = dimensions.centerX
    let y = dimensions.centerY
    const vectors = []

    coeffs.forEach((c, index) => {
      const direction = isReverse ? -c.freq : c.freq
      const angle = 2 * Math.PI * direction * t + c.phase
      const dx = c.amp * Math.cos(angle)
      const dy = c.amp * Math.sin(angle)
      const start = { x, y }
      const end = { x: x + dx, y: y + dy }
      vectors.push({ start, end, radius: c.amp, hue: (index * 11) % 360 })
      x = end.x
      y = end.y
    })

    return { vectors, tip: { x, y } }
  }, [harmonics, dimensions.centerX, dimensions.centerY, isReverse])

  const drawSketchPath = useCallback(() => {
    if (!ctx || pathRef.current.length < 2) return
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.55)'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(pathRef.current[0].x, pathRef.current[0].y)
    for (let i = 1; i < pathRef.current.length; i++) {
      ctx.lineTo(pathRef.current[i].x, pathRef.current[i].y)
    }
    ctx.stroke()
  }, [ctx])

  const drawTrace = useCallback(() => {
    if (!ctx || traceRef.current.length < 2) return
    ctx.strokeStyle = 'rgba(136, 221, 255, 0.85)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(traceRef.current[0].x, traceRef.current[0].y)
    for (let i = 1; i < traceRef.current.length; i++) {
      ctx.lineTo(traceRef.current[i].x, traceRef.current[i].y)
    }
    ctx.stroke()
  }, [ctx])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    ctx.fillStyle = 'rgba(0, 2, 8, 0.12)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    if (pathRef.current.length > 1 && !fourierRef.current.length) {
      drawSketchPath()
    }

    if (fourierRef.current.length) {
      const { vectors, tip } = computeState(timeRef.current)

      vectors.forEach(v => {
        ctx.strokeStyle = `hsla(${v.hue}, 70%, 65%, 0.25)`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(v.start.x, v.start.y, Math.max(1, v.radius), 0, Math.PI * 2)
        ctx.stroke()

        ctx.strokeStyle = `hsla(${v.hue + 50}, 90%, 75%, 0.9)`
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(v.start.x, v.start.y)
        ctx.lineTo(v.end.x, v.end.y)
        ctx.stroke()
      })

      if (isPlaying || traceRef.current.length === 0) {
        traceRef.current.push(tip)
        if (traceRef.current.length > resampledRef.current.length + 40) {
          traceRef.current.shift()
        }
      }

      drawTrace()

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.beginPath()
      ctx.arc(tip.x, tip.y, 3, 0, Math.PI * 2)
      ctx.fill()

      if (isPlaying) {
        timeRef.current = (timeRef.current + 0.0016 * speed) % 1
      }
    }
  }, [ctx, dimensions.width, computeState, drawTrace, drawSketchPath, isPlaying, speed])

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
    recalcCoverage(harmonics)
  }, [harmonics, recalcCoverage])

  const metrics = useMemo(() => {
    const harmonicCount = fourierRef.current.length
      ? Math.min(harmonics, fourierRef.current.length)
      : harmonics

    return [
      { label: 'points', value: pathRef.current.length },
      { label: 'harmonics', value: harmonicCount },
      { label: 'coverage', value: `${coverage.toFixed(0)}%` },
      { label: 'tempo', value: `${speed.toFixed(1)}x` }
    ]
  }, [harmonics, coverage, speed, strokeVersion])

  const controls = [
    {
      id: 'transform',
      label: 'transform()',
      onClick: computeFourier
    },
    {
      id: 'play',
      label: isPlaying ? 'pause()' : 'play()',
      onClick: togglePlay,
      active: isPlaying
    },
    {
      id: 'reverse',
      label: 'reverse()',
      onClick: toggleReverse,
      active: isReverse
    },
    {
      id: 'speed',
      label: 'tempo()',
      onClick: cycleSpeed
    },
    {
      id: 'more-harmonics',
      label: 'harmonics+',
      onClick: () => adjustHarmonics(4)
    },
    {
      id: 'less-harmonics',
      label: 'harmonics-',
      onClick: () => adjustHarmonics(-4)
    },
    {
      id: 'reset',
      label: 'clear()',
      onClick: handleReset,
      variant: 'reset'
    }
  ]

  const handleModeChange = useCallback((mode) => {
    setCurrentMode(mode)
    setMessage(mode === 'sketch'
      ? 'sketch in raw space'
      : 'epicycles revealed')
  }, [])

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

      <div className="flex items-center justify-between p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={currentMode}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          data-testid="fourier-loom-canvas"
        />

        {!pathRef.current.length && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-void-green/30 text-sm font-mono">
              ∴ sketch any rune • transform into epicycle chants ∴
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FourierLoom
