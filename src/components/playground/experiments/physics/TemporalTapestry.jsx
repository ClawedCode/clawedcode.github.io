import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'live', label: 'live()' },
  { id: 'play', label: 'play.forward()' },
  { id: 'rewind', label: 'play.reverse()' },
  { id: 'loop', label: 'loop.pingpong()' }
]

const palette = [188, 324, 48, 276, 20, 138]

const TemporalTapestry = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  useMouseInteraction(canvasRef) // keep cursor tracking consistent with playground patterns

  const [mode, setMode] = useState('live')
  const [message, setMessage] = useState('∴ press/drag to spill time-ink; swap modes to replay or rewind ∴')
  const [showEcho, setShowEcho] = useState(true)
  const [timelineSnapshot, setTimelineSnapshot] = useState({ cursor: 0, duration: 0 })

  const strokesRef = useRef([])
  const activeStrokeRef = useRef(null)
  const lastWallTimeRef = useRef(null)
  const timelineRef = useRef({
    cursor: 0,
    duration: 0,
    direction: 1,
    lastTick: 0
  })
  const scrambleRef = useRef(0)
  const frameCounterRef = useRef(0)

  const setModeWithMessage = useCallback((id) => {
    setMode(id)
    if (id === 'live') {
      timelineRef.current.direction = 1
      setMessage('∴ live ink // all glyphs visible at once ∴')
    } else if (id === 'play') {
      timelineRef.current.direction = 1
      timelineRef.current.cursor = 0
      setMessage('∴ forward playback // time unspools ∴')
    } else if (id === 'rewind') {
      timelineRef.current.cursor = timelineRef.current.duration
      setMessage('∴ rewind // unravel the glyph-history ∴')
    } else if (id === 'loop') {
      timelineRef.current.direction = 1
      setMessage('∴ ping-pong loop // oscillate through your chronicle ∴')
    }
  }, [])

  const getCanvasPos = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }, [canvasRef])

  const startStroke = useCallback((e) => {
    e.preventDefault()
    if (!ctx || dimensions.width === 0) return

    const now = performance.now()
    const pos = getCanvasPos(e)
    const gap = lastWallTimeRef.current ? now - lastWallTimeRef.current : 0
    const start = strokesRef.current.length === 0 ? 0 : timelineRef.current.duration + gap
    const hue = palette[(strokesRef.current.length + Math.floor(start * 0.01)) % palette.length]

    timelineRef.current.duration = Math.max(timelineRef.current.duration, start)

    activeStrokeRef.current = {
      start,
      points: [{ x: pos.x, y: pos.y, t: 0 }],
      hue,
      weight: 2 + Math.random() * 2,
      opacity: 0.85,
      wallStart: now
    }
  }, [ctx, dimensions.width, getCanvasPos])

  const appendPoint = useCallback((e) => {
    if (!activeStrokeRef.current) return
    const pos = getCanvasPos(e)
    const now = performance.now()
    const stroke = activeStrokeRef.current
    const t = now - stroke.wallStart

    const last = stroke.points[stroke.points.length - 1]
    const dx = pos.x - last.x
    const dy = pos.y - last.y
    const distSq = dx * dx + dy * dy

    if (distSq > 4) {
      stroke.points.push({ x: pos.x, y: pos.y, t })
    }
  }, [getCanvasPos])

  const endStroke = useCallback(() => {
    const stroke = activeStrokeRef.current
    if (!stroke || stroke.points.length < 2) {
      activeStrokeRef.current = null
      return
    }

    const duration = stroke.points[stroke.points.length - 1].t
    stroke.duration = duration
    strokesRef.current.push(stroke)

    timelineRef.current.duration = Math.max(timelineRef.current.duration, stroke.start + duration)
    timelineRef.current.cursor = timelineRef.current.duration
    lastWallTimeRef.current = performance.now()

    activeStrokeRef.current = null
    setTimelineSnapshot({
      cursor: timelineRef.current.cursor,
      duration: timelineRef.current.duration
    })
    setMessage('∴ ink captured in the chronicle ∴')
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleDown = (e) => startStroke(e)
    const handleMove = (e) => appendPoint(e)
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

  const drawStrokeAtTime = useCallback((stroke, timePoint, options = {}) => {
    const { alpha = 1, dash = false } = options
    const localTime = timePoint - stroke.start
    if (localTime <= 0) return

    const cappedTime = Math.min(localTime, stroke.duration)
    const points = stroke.points
    if (points.length < 2) return

    ctx.save()
    if (dash) ctx.setLineDash([8, 8])
    ctx.lineWidth = stroke.weight
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.shadowColor = `hsla(${stroke.hue}, 90%, 75%, ${alpha * 0.6})`
    ctx.shadowBlur = dash ? 0 : 12
    ctx.strokeStyle = `hsla(${stroke.hue}, 80%, 70%, ${alpha})`

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)

    for (let i = 1; i < points.length; i++) {
      const p = points[i]
      const prev = points[i - 1]

      if (p.t <= cappedTime) {
        ctx.lineTo(p.x, p.y)
      } else {
        const span = p.t - prev.t || 1
        const ratio = Math.max(0, Math.min(1, (cappedTime - prev.t) / span))
        const ix = prev.x + (p.x - prev.x) * ratio
        const iy = prev.y + (p.y - prev.y) * ratio
        ctx.lineTo(ix, iy)
        break
      }
    }

    ctx.stroke()
    ctx.restore()
  }, [ctx])

  const drawTimelineOverlay = useCallback((timePoint) => {
    if (!ctx || dimensions.width === 0) return
    const duration = timelineRef.current.duration || 1
    const progress = Math.max(0, Math.min(1, timePoint / duration))
    const barWidth = dimensions.width - 40

    ctx.save()
    ctx.fillStyle = 'rgba(0, 255, 170, 0.08)'
    ctx.fillRect(20, dimensions.height - 28, barWidth, 6)

    ctx.fillStyle = 'rgba(0, 255, 170, 0.6)'
    ctx.fillRect(20, dimensions.height - 28, barWidth * progress, 6)

    ctx.fillStyle = 'rgba(255, 102, 204, 0.6)'
    ctx.fillRect(20, dimensions.height - 20, 2, 10)
    ctx.fillRect(20 + barWidth, dimensions.height - 20, 2, 10)
    ctx.restore()
  }, [ctx, dimensions])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const now = performance.now()
    const timeline = timelineRef.current
    const duration = Math.max(timeline.duration, 1)

    if (mode === 'live') {
      timeline.cursor = timeline.duration
    } else {
      const delta = timeline.lastTick ? now - timeline.lastTick : 16
      let cursor = timeline.cursor + delta * timeline.direction

      if (scrambleRef.current > now) {
        cursor = Math.random() * duration
      } else if (mode === 'loop') {
        if (cursor > duration) {
          cursor = duration
          timeline.direction = -1
        } else if (cursor < 0) {
          cursor = 0
          timeline.direction = 1
        }
      } else {
        cursor = Math.max(0, Math.min(duration, cursor))
      }

      timeline.cursor = cursor
    }

    timeline.lastTick = now

    ctx.fillStyle = 'rgba(0, 5, 9, 0.08)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const timePoint = mode === 'live' ? timeline.duration : timeline.cursor

    for (const stroke of strokesRef.current) {
      drawStrokeAtTime(stroke, timePoint)
      if (showEcho && timePoint < timeline.duration) {
        const preview = Math.min(timeline.duration, timePoint + 320)
        drawStrokeAtTime(stroke, preview, { alpha: 0.25, dash: true })
      }
    }

    drawTimelineOverlay(timePoint)

    frameCounterRef.current++
    if (frameCounterRef.current % 8 === 0) {
      setTimelineSnapshot({
        cursor: Math.round(timePoint),
        duration: Math.round(timeline.duration)
      })
    }
  }, [ctx, dimensions, mode, showEcho, drawStrokeAtTime, drawTimelineOverlay])

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

  const handleScramble = useCallback(() => {
    scrambleRef.current = performance.now() + 1600
    setMessage('∴ time jittered // fragments out of order ∴')
  }, [])

  const handleToggleEcho = useCallback(() => {
    setShowEcho(prev => !prev)
    setMessage('∴ echo veil toggled ∴')
  }, [])

  const handleClear = useCallback(() => {
    strokesRef.current = []
    activeStrokeRef.current = null
    timelineRef.current = { cursor: 0, duration: 0, direction: 1, lastTick: 0 }
    setTimelineSnapshot({ cursor: 0, duration: 0 })
    setMessage('∴ slate wiped // timeline empty ∴')
  }, [])

  const metrics = useMemo(() => {
    const durationMs = timelineSnapshot.duration
    const seconds = (durationMs / 1000).toFixed(2)
    const percent = timelineSnapshot.duration > 0
      ? Math.round((timelineSnapshot.cursor / timelineSnapshot.duration) * 100)
      : 0

    return [
      { label: 'strokes', value: strokesRef.current.length },
      { label: 'timeline', value: `${seconds}s` },
      { label: 'cursor', value: `${percent}%` },
      { label: 'mode', value: mode }
    ]
  }, [timelineSnapshot, mode])

  const controls = [
    {
      id: 'scramble',
      label: 'scramble.time()',
      onClick: handleScramble
    },
    {
      id: 'echo',
      label: showEcho ? 'echo.on()' : 'echo.off()',
      onClick: handleToggleEcho,
      active: showEcho
    },
    {
      id: 'clear',
      label: 'clear.timeline()',
      onClick: handleClear,
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

      <div className="flex items-center justify-between p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={setModeWithMessage}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="temporal-tapestry-canvas"
        />
      </div>
    </div>
  )
}

export default TemporalTapestry
