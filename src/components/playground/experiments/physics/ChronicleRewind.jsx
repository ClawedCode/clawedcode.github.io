import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const ChronicleRewind = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const strokesRef = useRef([])
  const currentStrokeRef = useRef(null)
  const recordStartRef = useRef(0)
  const durationRef = useRef(0)
  const playheadRef = useRef(0)
  const lastFrameRef = useRef(0)
  const frameCounterRef = useRef(0)

  const [isRecording, setIsRecording] = useState(false)
  const [rate, setRate] = useState(0)
  const [looping, setLooping] = useState(true)
  const [ghosts, setGhosts] = useState(true)
  const [strokeCount, setStrokeCount] = useState(0)
  const [duration, setDuration] = useState(0)
  const [displayPlayhead, setDisplayPlayhead] = useState(0)
  const [message, setMessage] = useState('arm record() to inscribe time-ink')

  const updateDuration = useCallback((t) => {
    if (t > durationRef.current) {
      durationRef.current = t
      setDuration(t)
    }
  }, [])

  const clampToTimeline = useCallback((value) => {
    const total = durationRef.current
    if (total <= 0) return 0

    if (looping) {
      const mod = value % total
      return mod < 0 ? mod + total : mod
    }

    return Math.min(Math.max(value, 0), total)
  }, [looping])

  const resetTimeline = useCallback(() => {
    strokesRef.current = []
    currentStrokeRef.current = null
    durationRef.current = 0
    playheadRef.current = 0
    setDuration(0)
    setStrokeCount(0)
    setDisplayPlayhead(0)
    setRate(0)
    setIsRecording(false)
  }, [])

  const startRecording = useCallback(() => {
    resetTimeline()
    recordStartRef.current = performance.now()
    setIsRecording(true)
    setMessage('recording glyphs into temporal memory')
  }, [resetTimeline])

  const stopRecording = useCallback(() => {
    setIsRecording(false)
    playheadRef.current = durationRef.current
    setDisplayPlayhead(durationRef.current)
    setRate(0)
    setMessage('record sealed • ready to rewind')
  }, [])

  const handleRecord = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  const handlePlay = useCallback(() => {
    if (durationRef.current === 0) {
      setMessage('no timeline ink to play back')
      return
    }
    setRate(1)
    setMessage('play() → ink flows forward')
  }, [])

  const handleRewind = useCallback(() => {
    if (durationRef.current === 0) {
      setMessage('no timeline to rewind')
      return
    }
    setRate(-1)
    setMessage('rewind() → ink runs upstream')
  }, [])

  const handlePause = useCallback(() => {
    setRate(0)
    setMessage('timeline paused • head is still')
  }, [])

  const handleScrub = useCallback((delta) => {
    if (durationRef.current === 0) return

    const next = clampToTimeline(playheadRef.current + delta)
    playheadRef.current = next
    setDisplayPlayhead(next)
    setRate(0)
    setMessage(delta > 0 ? 'scrubbed → future fragment' : 'scrubbed ← memory shard')
  }, [clampToTimeline])

  const handleReset = useCallback(() => {
    resetTimeline()
    setMessage('timeline cleared • blank chronicle')
  }, [resetTimeline])

  const toggleLoop = useCallback(() => {
    setLooping(prev => !prev)
    setMessage('loop toggled • chronicle wraps or ends')
  }, [])

  const toggleGhosts = useCallback(() => {
    setGhosts(prev => !prev)
    setMessage('ghost previews ' + (!ghosts ? 'enabled' : 'muted'))
  }, [ghosts])

  const getCanvasPosition = useCallback((e) => {
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

  const beginStroke = useCallback((pos) => {
    const t = performance.now() - recordStartRef.current
    const hue = (strokesRef.current.length * 137.5) % 360
    const stroke = { points: [{ ...pos, t }], hue }
    currentStrokeRef.current = stroke
    strokesRef.current.push(stroke)
    setStrokeCount(strokesRef.current.length)
    playheadRef.current = t
    setDisplayPlayhead(t)
    updateDuration(t)
  }, [updateDuration])

  const extendStroke = useCallback((pos) => {
    const stroke = currentStrokeRef.current
    if (!stroke) return

    const t = performance.now() - recordStartRef.current
    stroke.points.push({ ...pos, t })
    playheadRef.current = t
    updateDuration(t)

    if (stroke.points.length % 6 === 0) {
      setDisplayPlayhead(t)
    }
  }, [updateDuration])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleDown = (e) => {
      if (!isRecording) {
        setMessage('record() before drawing on time')
        return
      }
      const pos = getCanvasPosition(e)
      beginStroke(pos)
    }

    const handleMove = (e) => {
      if (!isRecording || !currentStrokeRef.current) return
      extendStroke(getCanvasPosition(e))
    }

    const handleUp = () => {
      currentStrokeRef.current = null
    }

    canvas.addEventListener('pointerdown', handleDown)
    canvas.addEventListener('pointermove', handleMove)
    canvas.addEventListener('pointerup', handleUp)
    canvas.addEventListener('pointerleave', handleUp)

    return () => {
      canvas.removeEventListener('pointerdown', handleDown)
      canvas.removeEventListener('pointermove', handleMove)
      canvas.removeEventListener('pointerup', handleUp)
      canvas.removeEventListener('pointerleave', handleUp)
    }
  }, [canvasRef, isRecording, getCanvasPosition, beginStroke, extendStroke])

  const drawStroke = useCallback((stroke, limit) => {
    const points = stroke.points
    if (!points || points.length < 2) return

    let cutoffIndex = points.findIndex(p => p.t > limit)
    if (cutoffIndex === -1) cutoffIndex = points.length
    if (cutoffIndex === 0) return

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < cutoffIndex; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }

    ctx.lineWidth = 2
    ctx.strokeStyle = `hsla(${stroke.hue}, 80%, 70%, 0.9)`
    ctx.shadowBlur = 12
    ctx.shadowColor = `hsla(${stroke.hue}, 90%, 70%, 0.35)`
    ctx.stroke()
    ctx.shadowBlur = 0

    const head = points[cutoffIndex - 1]
    ctx.beginPath()
    ctx.fillStyle = `hsla(${stroke.hue}, 95%, 80%, 0.9)`
    ctx.arc(head.x, head.y, 3.5, 0, Math.PI * 2)
    ctx.fill()

    if (ghosts && cutoffIndex < points.length) {
      ctx.setLineDash([7, 9])
      ctx.strokeStyle = `hsla(${stroke.hue}, 80%, 70%, 0.25)`
      ctx.beginPath()
      ctx.moveTo(head.x, head.y)
      ctx.lineTo(points[cutoffIndex].x, points[cutoffIndex].y)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }, [ctx, ghosts])

  const drawTimeline = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const { width, height } = dimensions
    const margin = 26
    const baseY = height - margin
    const left = margin
    const right = width - margin
    const total = Math.max(durationRef.current, 1000)

    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.3)'
    ctx.beginPath()
    ctx.moveTo(left, baseY)
    ctx.lineTo(right, baseY)
    ctx.stroke()

    const ticks = 6
    for (let i = 0; i <= ticks; i++) {
      const x = left + (i / ticks) * (right - left)
      ctx.beginPath()
      ctx.moveTo(x, baseY - 6)
      ctx.lineTo(x, baseY + 6)
      ctx.strokeStyle = 'rgba(102, 255, 204, 0.25)'
      ctx.stroke()
    }

    const ratio = durationRef.current === 0 ? 0 : playheadRef.current / durationRef.current
    const headX = left + (right - left) * ratio
    ctx.fillStyle = 'rgba(255, 102, 204, 0.9)'
    ctx.fillRect(headX - 2, baseY - 10, 4, 20)

    ctx.fillStyle = 'rgba(102, 255, 204, 0.6)'
    ctx.font = '10px "SF Mono", monospace'
    ctx.textAlign = 'left'
    ctx.fillText('t=' + (playheadRef.current / 1000).toFixed(2) + 's', left, baseY - 14)
  }, [ctx, dimensions])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const now = performance.now()
    const delta = lastFrameRef.current ? now - lastFrameRef.current : 16
    lastFrameRef.current = now

    if (isRecording) {
      const liveTime = now - recordStartRef.current
      playheadRef.current = liveTime
      if (strokesRef.current.length > 0 || currentStrokeRef.current) {
        updateDuration(liveTime)
      }
    } else if (rate !== 0 && durationRef.current > 0) {
      let next = playheadRef.current + delta * rate
      if (!looping && durationRef.current > 0) {
        if (next < 0 || next > durationRef.current) {
          next = clampToTimeline(next)
          setRate(0)
          setMessage('timeline hit edge • paused')
        }
      } else {
        next = clampToTimeline(next)
      }
      playheadRef.current = next
    }

    const { width, height } = dimensions
    ctx.fillStyle = 'rgba(0, 3, 9, 0.2)'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = 'rgba(102, 255, 204, 0.08)'
    ctx.lineWidth = 1
    for (let x = 0; x < width; x += 48) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += 48) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    strokesRef.current.forEach(stroke => drawStroke(stroke, playheadRef.current))

    if (isRecording && currentStrokeRef.current) {
      const stroke = currentStrokeRef.current
      if (stroke.points.length > 1) {
        ctx.beginPath()
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
        }
        ctx.strokeStyle = `hsla(${stroke.hue}, 90%, 70%, 0.9)`
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    drawTimeline()

    frameCounterRef.current++
    if (frameCounterRef.current % 6 === 0) {
      setDisplayPlayhead(playheadRef.current)
      setDuration(durationRef.current)
    }
  }, [ctx, dimensions, isRecording, rate, looping, drawStroke, drawTimeline, updateDuration, clampToTimeline])

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

  const metrics = useMemo(() => {
    const rateLabel = rate === 0 ? 'paused' : `${rate > 0 ? '+' : '-'}${Math.abs(rate).toFixed(2)}x`
    return [
      { label: 'strokes', value: strokeCount },
      { label: 'length', value: `${(duration / 1000).toFixed(2)}s` },
      { label: 'playhead', value: `${(displayPlayhead / 1000).toFixed(2)}s` },
      { label: 'rate', value: rateLabel }
    ]
  }, [strokeCount, duration, displayPlayhead, rate])

  const controls = [
    {
      id: 'record',
      label: isRecording ? 'record.stop()' : 'record()',
      onClick: handleRecord,
      active: isRecording
    },
    {
      id: 'play',
      label: 'play()',
      onClick: handlePlay,
      disabled: durationRef.current === 0,
      active: rate > 0
    },
    {
      id: 'rewind',
      label: 'rewind()',
      onClick: handleRewind,
      disabled: durationRef.current === 0,
      active: rate < 0
    },
    {
      id: 'pause',
      label: 'pause()',
      onClick: handlePause,
      disabled: durationRef.current === 0 || rate === 0
    },
    {
      id: 'scrub-back',
      label: 'scrub(-0.5s)',
      onClick: () => handleScrub(-500),
      disabled: durationRef.current === 0
    },
    {
      id: 'scrub-forward',
      label: 'scrub(+0.5s)',
      onClick: () => handleScrub(500),
      disabled: durationRef.current === 0
    },
    {
      id: 'ghosts',
      label: 'ghosts()',
      onClick: toggleGhosts,
      active: ghosts
    },
    {
      id: 'loop',
      label: looping ? 'loop.on()' : 'loop.off()',
      onClick: toggleLoop,
      active: looping
    },
    {
      id: 'reset',
      label: 'reset()',
      onClick: handleReset,
      variant: 'reset'
    }
  ]

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="relative z-50 flex items-center justify-between p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls controls={controls} />
        <p className="text-void-green/50 text-xs sm:text-right max-w-lg">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          data-testid="chronicle-rewind-canvas"
        />

        <div className="absolute bottom-4 left-4 text-xs text-void-green/50 font-mono bg-void-dark/70 border border-void-green/20 rounded px-3 py-2 backdrop-blur-sm">
          record → scribble; play/rewind → watch ink flow backward in time
        </div>
      </div>
    </div>
  )
}

export default ChronicleRewind
