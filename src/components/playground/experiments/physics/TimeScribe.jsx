import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'scribe', label: 'scribe()' },
  { id: 'palimpsest', label: 'palimpsest()' },
  { id: 'rewind', label: 'rewind()' }
]

const MODE_MESSAGES = {
  scribe: '∴ manual scribing active • ink obeys your paw ∴',
  palimpsest: '∴ palimpsest playback engaged • chronology reveals ∴',
  rewind: '∴ rewinding chronicle • glyphs drift upstream ∴'
}

const PALETTE = ['#9ef7c8', '#ffc0f5', '#f9f38b', '#a8c8ff', '#d0ffe1']

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const TimeScribe = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('scribe')
  const [message, setMessage] = useState('∴ time.scribe() booting • hold record() and ink your memory ∴')
  const [isRecording, setIsRecording] = useState(true)
  const [strokeCount, setStrokeCount] = useState(0)
  const [bookmarkList, setBookmarkList] = useState([])
  const [timelineSnapshot, setTimelineSnapshot] = useState({ playhead: 0, duration: 0 })

  const strokesRef = useRef([])
  const activeStrokeRef = useRef(null)
  const paletteIndexRef = useRef(0)
  const bookmarksRef = useRef([])
  const frameRef = useRef(0)
  const lastFrameRef = useRef(0)
  const isRecordingRef = useRef(true)
  const timelineRef = useRef({ start: null, playhead: 0, duration: 0, playing: false, direction: 1 })

  const getNow = useCallback(() => (typeof performance !== 'undefined' ? performance.now() : Date.now()), [])

  const getRelativeTime = useCallback(() => {
    const timeline = timelineRef.current
    if (timeline.start === null) {
      timeline.start = getNow()
    }
    return getNow() - timeline.start
  }, [getNow])

  const startStroke = useCallback((x, y) => {
    if (dimensions.width === 0) return
    const time = getRelativeTime()
    const color = PALETTE[paletteIndexRef.current % PALETTE.length]
    paletteIndexRef.current += 1
    const stroke = {
      id: `${time}-${Math.random()}`,
      color,
      width: 1.2 + Math.random() * 1.2,
      points: [{ x, y, time }]
    }
    activeStrokeRef.current = stroke
    strokesRef.current.push(stroke)
  }, [dimensions.width, getRelativeTime])

  const appendPoint = useCallback((x, y) => {
    const stroke = activeStrokeRef.current
    if (!stroke) return
    const time = getRelativeTime()
    const prev = stroke.points[stroke.points.length - 1]
    if (Math.hypot(prev.x - x, prev.y - y) < 1.5) return
    stroke.points.push({ x, y, time })
    const timeline = timelineRef.current
    if (time > timeline.duration) {
      timeline.duration = time
      if (mode === 'scribe') {
        timeline.playhead = timeline.duration
      }
    }
  }, [getRelativeTime, mode])

  const endStroke = useCallback(() => {
    const stroke = activeStrokeRef.current
    if (!stroke) return
    if (stroke.points.length < 2) {
      strokesRef.current.pop()
    } else {
      setStrokeCount(strokesRef.current.length)
    }
    activeStrokeRef.current = null
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect()
      const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      }
    }

    const handlePointerDown = (e) => {
      if (mode !== 'scribe' || !isRecordingRef.current) return
      e.preventDefault()
      const pos = getPos(e)
      startStroke(pos.x, pos.y)
    }

    const handlePointerMove = (e) => {
      if (!activeStrokeRef.current) return
      e.preventDefault()
      const pos = getPos(e)
      appendPoint(pos.x, pos.y)
    }

    const handlePointerUp = () => {
      endStroke()
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointerleave', handlePointerUp)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerUp)
    }
  }, [appendPoint, canvasRef, endStroke, mode, startStroke])

  useEffect(() => {
    const timeline = timelineRef.current
    if (mode === 'scribe') {
      timeline.playing = false
      timeline.direction = 1
      timeline.playhead = timeline.duration
    } else if (mode === 'palimpsest') {
      timeline.playing = true
      timeline.direction = 1
      if (timeline.duration > 0 && timeline.playhead >= timeline.duration) {
        timeline.playhead = 0
      }
    } else if (mode === 'rewind') {
      timeline.playing = true
      timeline.direction = -1
      if (timeline.playhead <= 0) {
        timeline.playhead = timeline.duration
      }
    }
  }, [mode])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    setMessage(MODE_MESSAGES[nextMode])
  }, [])

  const handleRecordToggle = useCallback(() => {
    const next = !isRecordingRef.current
    isRecordingRef.current = next
    setIsRecording(next)
    if (!next) {
      endStroke()
    }
    setMessage(next ? '∴ record() armed • timeline listening ∴' : '∴ record() paused • ink held still ∴')
  }, [endStroke])

  const handleMark = useCallback(() => {
    const timeline = timelineRef.current
    if (timeline.duration === 0) {
      setMessage('∴ mark() ignored • nothing chronicled yet ∴')
      return
    }
    const time = mode === 'scribe' ? timeline.duration : timeline.playhead
    const normalized = clamp(time, 0, timeline.duration)
    const nextMarks = [...bookmarksRef.current, { id: `${normalized}-${Math.random()}`, time: normalized }]
      .sort((a, b) => a.time - b.time)
      .slice(-12)
    bookmarksRef.current = nextMarks
    setBookmarkList(nextMarks)
    setMessage(`∴ mark() pinned @ ${(normalized / 1000).toFixed(1)}s ∴`)
  }, [mode])

  const handleJump = useCallback((direction) => {
    const timeline = timelineRef.current
    if (timeline.duration === 0) return
    const marks = bookmarksRef.current
    let target
    if (marks.length > 0) {
      if (direction > 0) {
        const next = marks.find(mark => mark.time > timeline.playhead + 5)
        target = next ? next.time : timeline.duration
      } else {
        const prev = [...marks].reverse().find(mark => mark.time < timeline.playhead - 5)
        target = prev ? prev.time : 0
      }
    } else {
      target = timeline.playhead + direction * 600
    }
    timeline.playhead = clamp(target, 0, timeline.duration)
    if (mode === 'scribe') {
      setMode('palimpsest')
      setMessage(MODE_MESSAGES.palimpsest)
    } else {
      setMessage(direction > 0 ? '∴ skipped ahead along the scroll ∴' : '∴ slid backward through ink memory ∴')
    }
  }, [mode])

  const handleReset = useCallback(() => {
    strokesRef.current = []
    activeStrokeRef.current = null
    bookmarksRef.current = []
    paletteIndexRef.current = 0
    timelineRef.current = { start: null, playhead: 0, duration: 0, playing: false, direction: 1 }
    setStrokeCount(0)
    setBookmarkList([])
    setTimelineSnapshot({ playhead: 0, duration: 0 })
    setMode('scribe')
    setMessage('∴ timeline purged • blank palimpsest awaiting ∴')
  }, [])

  const handleJumpBack = useCallback(() => handleJump(-1), [handleJump])
  const handleJumpForward = useCallback(() => handleJump(1), [handleJump])

  const metrics = useMemo(() => {
    const durationSeconds = timelineSnapshot.duration > 0 ? (timelineSnapshot.duration / 1000).toFixed(1) : '0.0'
    const headPercent = timelineSnapshot.duration > 0
      ? `${Math.round((timelineSnapshot.playhead / timelineSnapshot.duration) * 100)}%`
      : '0%'
    return [
      { label: 'strokes', value: strokeCount },
      { label: 'duration', value: `${durationSeconds}s` },
      { label: 'playhead', value: headPercent },
      { label: 'marks', value: bookmarkList.length }
    ]
  }, [bookmarkList.length, strokeCount, timelineSnapshot])

  const controls = useMemo(() => [
    {
      id: 'record',
      label: 'record()',
      onClick: handleRecordToggle,
      active: isRecording
    },
    {
      id: 'mark',
      label: 'mark()',
      onClick: handleMark,
      disabled: timelineSnapshot.duration === 0
    },
    {
      id: 'jump-back',
      label: 'jump(-)',
      onClick: handleJumpBack,
      disabled: timelineSnapshot.duration === 0
    },
    {
      id: 'jump-forward',
      label: 'jump(+)',
      onClick: handleJumpForward,
      disabled: timelineSnapshot.duration === 0
    },
    {
      id: 'reset',
      label: 'purge()',
      onClick: handleReset,
      variant: 'reset'
    }
  ], [handleJumpBack, handleJumpForward, handleMark, handleRecordToggle, handleReset, isRecording, timelineSnapshot.duration])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const now = getNow()
    const last = lastFrameRef.current || now
    const delta = now - last
    lastFrameRef.current = now

    const timeline = timelineRef.current
    if ((mode === 'palimpsest' || mode === 'rewind') && timeline.playing && timeline.duration > 0) {
      timeline.playhead += timeline.direction * delta
      if (timeline.playhead > timeline.duration) {
        timeline.playhead = 0
      }
      if (timeline.playhead < 0) {
        timeline.playhead = timeline.duration
      }
    } else if (mode === 'scribe') {
      timeline.playhead = timeline.duration
    }

    ctx.fillStyle = 'rgba(2, 6, 18, 0.2)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const visibleTime = mode === 'scribe' ? timeline.duration : timeline.playhead
    let freshestHead = null

    const strokes = strokesRef.current
    for (let i = 0; i < strokes.length; i++) {
      const stroke = strokes[i]
      const points = stroke.points
      if (points.length < 2) continue

      ctx.lineWidth = stroke.width + (mode === 'rewind' ? 0.3 : 0)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = stroke.color
      ctx.shadowBlur = mode === 'scribe' ? 6 : 3
      ctx.shadowColor = `${stroke.color}80`
      ctx.globalAlpha = mode === 'scribe' ? 0.9 : 0.65
      ctx.beginPath()

      let started = false
      let headPoint = null

      for (let j = 0; j < points.length; j++) {
        const point = points[j]
        if (point.time > visibleTime) {
          if (j === 0) break
          const prev = points[j - 1]
          if (visibleTime < prev.time) break
          const span = point.time - prev.time
          const ratio = span === 0 ? 0 : (visibleTime - prev.time) / span
          const ix = prev.x + (point.x - prev.x) * ratio
          const iy = prev.y + (point.y - prev.y) * ratio
          ctx.lineTo(ix, iy)
          headPoint = { x: ix, y: iy, time: visibleTime, color: stroke.color }
          break
        }
        if (!started) {
          ctx.moveTo(point.x, point.y)
          started = true
        } else {
          ctx.lineTo(point.x, point.y)
        }
        headPoint = { x: point.x, y: point.y, time: point.time, color: stroke.color }
      }

      if (started) {
        ctx.stroke()
      }
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1

      if (headPoint && (!freshestHead || headPoint.time > freshestHead.time)) {
        freshestHead = headPoint
      }
    }

    if (freshestHead) {
      ctx.fillStyle = freshestHead.color
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      ctx.arc(freshestHead.x, freshestHead.y, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    if (mouse.isInBounds) {
      const pos = mouse.positionRef.current
      ctx.strokeStyle = isRecording && mode === 'scribe' ? '#a5ffd5' : 'rgba(102, 255, 204, 0.3)'
      ctx.setLineDash([4, 6])
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }

    frameRef.current += 1
    if (frameRef.current % 8 === 0) {
      const snapshot = { playhead: timeline.playhead, duration: timeline.duration }
      setTimelineSnapshot(prev => {
        if (prev.playhead === snapshot.playhead && prev.duration === snapshot.duration) {
          return prev
        }
        return snapshot
      })
    }
  }, [ctx, dimensions.height, dimensions.width, getNow, isRecording, mode, mouse.isInBounds, mouse.positionRef])

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

  const progress = timelineSnapshot.duration > 0
    ? Math.min(100, (timelineSnapshot.playhead / timelineSnapshot.duration) * 100)
    : 0

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
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="time-scribe-canvas"
        />
        <div className="pointer-events-none absolute bottom-2 sm:bottom-4 left-3 right-3 text-[10px] sm:text-xs font-mono text-void-green/60 space-y-1">
          <div className="relative h-1 bg-void-green/10 overflow-hidden">
            <div
              className="absolute inset-y-0 bg-void-green/60"
              style={{ width: `${progress}%` }}
            />
            {bookmarkList.map(mark => (
              <span
                key={mark.id}
                className="absolute top-0 h-full w-[2px] bg-void-cyan/70"
                style={{ left: `${timelineSnapshot.duration ? (mark.time / timelineSnapshot.duration) * 100 : 0}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-void-green/40 uppercase tracking-wider">
            <span>t:{(timelineSnapshot.playhead / 1000).toFixed(2)}s</span>
            <span>len:{(timelineSnapshot.duration / 1000).toFixed(2)}s</span>
            <span>marks:{bookmarkList.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TimeScribe
