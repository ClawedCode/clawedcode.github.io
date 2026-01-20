import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'scan', label: 'emitter.scan()' },
  { id: 'fan', label: 'emitter.fan()' },
  { id: 'ricochet', label: 'emitter.ricochet()' }
]

const MODE_MESSAGES = {
  scan: '∴ rotating beam sweeps the chamber ∴',
  fan: '∴ multi-ray fan cascades through mirrors ∴',
  ricochet: '∴ tight ricochet seeking looped paths ∴'
}

const normalize = (v) => {
  const mag = Math.hypot(v.x, v.y) || 1
  return { x: v.x / mag, y: v.y / mag }
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

const cross = (a, b) => a.x * b.y - a.y * b.x

const intersectRaySegment = (origin, dir, a, b) => {
  const s = { x: b.x - a.x, y: b.y - a.y }
  const rxs = cross(dir, s)
  if (Math.abs(rxs) < 1e-6) return null

  const qp = { x: a.x - origin.x, y: a.y - origin.y }
  const t = cross(qp, s) / rxs
  const u = cross(qp, dir) / rxs

  if (t > 0.001 && u >= 0 && u <= 1) {
    return {
      point: { x: origin.x + dir.x * t, y: origin.y + dir.y * t },
      t,
      segmentDirection: s
    }
  }

  return null
}

const reflect = (dir, normal) => {
  const dot = dir.x * normal.x + dir.y * normal.y
  return normalize({
    x: dir.x - 2 * dot * normal.x,
    y: dir.y - 2 * dot * normal.y
  })
}

const MirrorRitual = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('scan')
  const [message, setMessage] = useState('∴ carve mirrors with clicks • shift+click moves emitter ∴')
  const [tick, setTick] = useState(0)

  const anchorRef = useRef(null)
  const segmentsRef = useRef([])
  const echoesRef = useRef([])
  const statsRef = useRef({ beams: 0, bounces: 0, loops: 0, path: 0 })
  const timeRef = useRef(0)
  const emitterRef = useRef({ x: dimensions.centerX, y: dimensions.centerY, angle: -Math.PI / 6 })

  useEffect(() => {
    emitterRef.current.x = dimensions.centerX
    emitterRef.current.y = dimensions.centerY
  }, [dimensions.centerX, dimensions.centerY])

  const addMirror = useCallback((start, end) => {
    const direction = { x: end.x - start.x, y: end.y - start.y }
    const length = Math.hypot(direction.x, direction.y)
    if (length < 6) return

    const normal = normalize({ x: -direction.y, y: direction.x })
    segmentsRef.current.push({ a: start, b: end, normal })
  }, [])

  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (e.shiftKey) {
      emitterRef.current.x = x
      emitterRef.current.y = y
      setMessage('∴ emitter relocated • new origin in the chamber ∴')
      anchorRef.current = null
      return
    }

    if (!anchorRef.current) {
      anchorRef.current = { x, y }
      setMessage('∴ anchor set • place the exit point ∴')
    } else {
      const start = anchorRef.current
      const end = { x, y }
      addMirror(start, end)
      anchorRef.current = null
      setMessage('∴ mirror etched • watch for ricochets ∴')
    }
  }, [addMirror])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('click', handleCanvasClick)
    return () => canvas.removeEventListener('click', handleCanvasClick)
  }, [canvasRef, handleCanvasClick])

  const computeBoundaries = useCallback(() => {
    return [
      { a: { x: 0, y: 0 }, b: { x: dimensions.width, y: 0 }, normal: { x: 0, y: 1 }, type: 'wall' },
      { a: { x: dimensions.width, y: 0 }, b: { x: dimensions.width, y: dimensions.height }, normal: { x: -1, y: 0 }, type: 'wall' },
      { a: { x: dimensions.width, y: dimensions.height }, b: { x: 0, y: dimensions.height }, normal: { x: 0, y: -1 }, type: 'wall' },
      { a: { x: 0, y: dimensions.height }, b: { x: 0, y: 0 }, normal: { x: 1, y: 0 }, type: 'wall' }
    ]
  }, [dimensions.width, dimensions.height])

  const findIntersection = useCallback((origin, dir, mirrorSegments, boundaries) => {
    let closest = null
    let closestT = Infinity

    const candidates = [...mirrorSegments, ...boundaries]

    for (const seg of candidates) {
      const result = intersectRaySegment(origin, dir, seg.a, seg.b)
      if (!result) continue

      if (result.t < closestT) {
        closestT = result.t
        const normal = seg.normal ?? normalize({ x: -result.segmentDirection.y, y: result.segmentDirection.x })
        closest = {
          point: result.point,
          normal,
          type: seg.type || 'mirror'
        }
      }
    }

    return closest
  }, [])

  const traceBeam = useCallback((origin, angle, bounceLimit = 12) => {
    const mirrorSegments = segmentsRef.current
    const boundaries = computeBoundaries()

    let currentOrigin = { x: origin.x, y: origin.y }
    let currentDir = normalize({ x: Math.cos(angle), y: Math.sin(angle) })

    const traced = []
    let totalLength = 0
    let looped = false

    for (let i = 0; i < bounceLimit; i++) {
      const hit = findIntersection(currentOrigin, currentDir, mirrorSegments, boundaries)
      if (!hit) break

      const segmentLength = distance(currentOrigin, hit.point)
      totalLength += segmentLength

      traced.push({
        from: { ...currentOrigin },
        to: hit.point,
        bounce: i,
        type: hit.type
      })

      echoesRef.current.push({ x: hit.point.x, y: hit.point.y, life: 1, hue: 140 + i * 12 })
      if (echoesRef.current.length > 180) echoesRef.current.shift()

      if (distance(hit.point, origin) < 12 && i > 1) {
        looped = true
      }

      const reflected = reflect(currentDir, hit.normal)
      currentOrigin = {
        x: hit.point.x + reflected.x * 0.1,
        y: hit.point.y + reflected.y * 0.1
      }
      currentDir = reflected
    }

    return {
      segments: traced,
      bounces: traced.length,
      looped,
      length: totalLength
    }
  }, [computeBoundaries, findIntersection])

  const drawEchoes = useCallback(() => {
    if (!ctx) return

    ctx.save()
    for (let i = echoesRef.current.length - 1; i >= 0; i--) {
      const echo = echoesRef.current[i]
      echo.life *= 0.96
      if (echo.life < 0.05) {
        echoesRef.current.splice(i, 1)
        continue
      }

      ctx.beginPath()
      ctx.strokeStyle = `hsla(${echo.hue}, 80%, 70%, ${echo.life})`
      ctx.lineWidth = 1 + echo.life * 2
      ctx.arc(echo.x, echo.y, 6 + echo.life * 18, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
  }, [ctx])

  const draw = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    timeRef.current += 1

    ctx.fillStyle = 'rgba(0, 3, 12, 0.08)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Draw mirrors
    ctx.lineWidth = 1.5
    ctx.setLineDash([])
    segmentsRef.current.forEach((seg, idx) => {
      ctx.strokeStyle = `hsla(${180 + idx * 8}, 70%, 65%, 0.6)`
      ctx.beginPath()
      ctx.moveTo(seg.a.x, seg.a.y)
      ctx.lineTo(seg.b.x, seg.b.y)
      ctx.stroke()
    })

    // Preview drawing line
    if (anchorRef.current && mouse.isInBounds) {
      ctx.setLineDash([6, 6])
      ctx.strokeStyle = 'rgba(102, 255, 204, 0.4)'
      ctx.beginPath()
      ctx.moveTo(anchorRef.current.x, anchorRef.current.y)
      ctx.lineTo(mouse.positionRef.current.x, mouse.positionRef.current.y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    const emitter = emitterRef.current
    const t = timeRef.current

    let angles = []
    if (mode === 'scan') {
      emitter.angle += 0.004
      angles = [emitter.angle + Math.sin(t * 0.01) * 0.25]
    } else if (mode === 'fan') {
      const base = emitter.angle + Math.sin(t * 0.005) * 0.6
      const spread = 0.22
      angles = [-2, -1, 0, 1, 2].map(n => base + n * spread)
    } else {
      if (t % 90 === 0) emitter.angle += Math.PI / 3
      angles = [emitter.angle + Math.sin(t * 0.02) * 0.12]
    }

    const results = angles.map((angle, idx) => {
      const beam = traceBeam(emitter, angle, mode === 'ricochet' ? 16 : 12)

      beam.segments.forEach(segment => {
        const energy = 0.4 + 0.06 * segment.bounce + 0.1 * Math.sin(t * 0.05 + idx)
        ctx.strokeStyle = `hsla(${120 + segment.bounce * 14}, 80%, 70%, ${Math.min(1, energy)})`
        ctx.lineWidth = 1.2 + segment.bounce * 0.1
        ctx.beginPath()
        ctx.moveTo(segment.from.x, segment.from.y)
        ctx.lineTo(segment.to.x, segment.to.y)
        ctx.stroke()
      })

      return beam
    })

    const totalBounces = results.reduce((sum, r) => sum + r.bounces, 0)
    const loops = results.filter(r => r.looped).length
    const totalPath = results.reduce((sum, r) => sum + r.length, 0)

    statsRef.current = {
      beams: results.length,
      bounces: totalBounces,
      loops,
      path: totalPath
    }

    if (timeRef.current % 10 === 0) setTick(tick => tick + 1)

    drawEchoes()

    // Draw emitter
    ctx.fillStyle = 'hsla(155, 90%, 75%, 0.9)'
    ctx.beginPath()
    ctx.arc(emitter.x, emitter.y, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    const direction = angles[0] ?? emitter.angle
    ctx.beginPath()
    ctx.moveTo(emitter.x, emitter.y)
    ctx.lineTo(emitter.x + Math.cos(direction) * 18, emitter.y + Math.sin(direction) * 18)
    ctx.stroke()
  }, [ctx, dimensions.width, dimensions.height, drawEchoes, mode, mouse.isInBounds, mouse.positionRef, traceBeam])

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

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    setMessage(MODE_MESSAGES[nextMode])
  }, [])

  const handleUndo = useCallback(() => {
    segmentsRef.current.pop()
    setMessage('∴ last mirror reclaimed ∴')
  }, [])

  const handleClear = useCallback(() => {
    segmentsRef.current = []
    anchorRef.current = null
    setMessage('∴ chamber cleared • draw anew ∴')
  }, [])

  const handleCenter = useCallback(() => {
    emitterRef.current.x = dimensions.centerX
    emitterRef.current.y = dimensions.centerY
    emitterRef.current.angle = -Math.PI / 6
    setMessage('∴ emitter recentered • ritual resets ∴')
  }, [dimensions.centerX, dimensions.centerY])

  const handleAngleNudge = useCallback(() => {
    emitterRef.current.angle = Math.random() * Math.PI * 2
    setMessage('∴ angle rerolled • new trajectories possible ∴')
  }, [])

  const metrics = useMemo(() => {
    const beams = statsRef.current.beams || 1
    const avgBounces = statsRef.current.bounces / beams
    const avgPath = statsRef.current.path / beams

    return [
      { label: 'mirrors', value: segmentsRef.current.length },
      { label: 'beams', value: statsRef.current.beams },
      { label: 'avg bounces', value: avgBounces.toFixed(1) },
      { label: 'avg path', value: `${Math.round(avgPath)}px` },
      { label: 'loopbacks', value: statsRef.current.loops }
    ]
  }, [tick])

  const controls = [
    {
      id: 'undo',
      label: 'mirror.undo()',
      onClick: handleUndo
    },
    {
      id: 'clear',
      label: 'mirrors.clear()',
      onClick: handleClear,
      variant: 'reset'
    },
    {
      id: 'center',
      label: 'emitter.center()',
      onClick: handleCenter
    },
    {
      id: 'nudge',
      label: 'angle.nudge()',
      onClick: handleAngleNudge
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
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="mirror-ritual-canvas"
        />
        <div className="absolute top-3 left-3 text-void-green/40 text-[10px] font-mono">
          click to draw mirrors · shift+click moves emitter
        </div>
      </div>
    </div>
  )
}

export default MirrorRitual
