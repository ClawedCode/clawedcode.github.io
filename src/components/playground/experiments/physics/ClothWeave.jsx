import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const COLS = 40
const ROWS = 25
const SPACING = 14
const TEAR_DIST = SPACING * 2.8
const ITERATIONS = 5

const MODES = [
  { id: 'pin', label: 'mode.pin()' },
  { id: 'tear', label: 'mode.tear()' },
  { id: 'push', label: 'mode.push()' }
]

class Point {
  constructor(x, y, pinned = false) {
    this.x = x
    this.y = y
    this.oldX = x
    this.oldY = y
    this.pinned = pinned
    this.mass = 1
  }
}

class Stick {
  constructor(p0, p1, length) {
    this.p0 = p0
    this.p1 = p1
    this.length = length
    this.alive = true
  }
}

const ClothWeave = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('tear')
  const [windActive, setWindActive] = useState(false)
  const [stats, setStats] = useState({ points: 0, sticks: 0, torn: 0, pinned: 0 })
  const [message, setMessage] = useState('drag to tear the weave // click to pin threads')

  const pointsRef = useRef([])
  const sticksRef = useRef([])
  const timeRef = useRef(0)
  const tornRef = useRef(0)
  const prevMouseRef = useRef({ x: 0, y: 0 })

  const buildCloth = useCallback(() => {
    if (dimensions.width === 0) return

    const points = []
    const sticks = []
    const offsetX = dimensions.centerX - (COLS * SPACING) / 2
    const offsetY = 60

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const px = offsetX + x * SPACING
        const py = offsetY + y * SPACING
        const pinned = y === 0 && x % 4 === 0
        points.push(new Point(px, py, pinned))
      }
    }

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x
        if (x < COLS - 1) {
          sticks.push(new Stick(points[i], points[i + 1], SPACING))
        }
        if (y < ROWS - 1) {
          sticks.push(new Stick(points[i], points[i + COLS], SPACING))
        }
      }
    }

    pointsRef.current = points
    sticksRef.current = sticks
    tornRef.current = 0
    setMessage('fresh weave hung // drag to tear, click to pin')
  }, [dimensions.centerX, dimensions.width])

  useEffect(() => {
    buildCloth()
  }, [buildCloth])

  const handleInteraction = useCallback((mx, my) => {
    const points = pointsRef.current
    const sticks = sticksRef.current
    const radius = mode === 'push' ? 60 : 20

    if (mode === 'pin') {
      let closest = null
      let closestDist = radius
      for (const p of points) {
        const d = Math.hypot(p.x - mx, p.y - my)
        if (d < closestDist) {
          closestDist = d
          closest = p
        }
      }
      if (closest) {
        closest.pinned = !closest.pinned
      }
    } else if (mode === 'tear') {
      for (const s of sticks) {
        if (!s.alive) continue
        const midX = (s.p0.x + s.p1.x) / 2
        const midY = (s.p0.y + s.p1.y) / 2
        if (Math.hypot(midX - mx, midY - my) < radius) {
          s.alive = false
          tornRef.current++
        }
      }
    } else if (mode === 'push') {
      const pmx = prevMouseRef.current.x
      const pmy = prevMouseRef.current.y
      const dvx = mx - pmx
      const dvy = my - pmy
      for (const p of points) {
        if (p.pinned) continue
        const d = Math.hypot(p.x - mx, p.y - my)
        if (d < radius) {
          const strength = 1 - d / radius
          p.x += dvx * strength * 0.6
          p.y += dvy * strength * 0.6
        }
      }
    }
  }, [mode])

  const simulate = useCallback(() => {
    const points = pointsRef.current
    const sticks = sticksRef.current
    const gravity = 0.25
    const wind = windActive ? Math.sin(timeRef.current * 0.03) * 0.4 : 0
    const damping = 0.99

    for (const p of points) {
      if (p.pinned) continue
      const vx = (p.x - p.oldX) * damping
      const vy = (p.y - p.oldY) * damping
      p.oldX = p.x
      p.oldY = p.y
      p.x += vx + wind
      p.y += vy + gravity

      if (p.y > dimensions.height - 10) {
        p.y = dimensions.height - 10
        p.oldY = p.y
      }
      if (p.x < 5) { p.x = 5; p.oldX = 5 }
      if (p.x > dimensions.width - 5) { p.x = dimensions.width - 5; p.oldX = p.x }
    }

    for (let iter = 0; iter < ITERATIONS; iter++) {
      for (const s of sticks) {
        if (!s.alive) continue
        const dx = s.p1.x - s.p0.x
        const dy = s.p1.y - s.p0.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > TEAR_DIST) {
          s.alive = false
          tornRef.current++
          continue
        }
        const diff = (s.length - dist) / dist * 0.5
        const ox = dx * diff
        const oy = dy * diff
        if (!s.p0.pinned) { s.p0.x -= ox; s.p0.y -= oy }
        if (!s.p1.pinned) { s.p1.x += ox; s.p1.y += oy }
      }
    }
  }, [windActive, dimensions.height, dimensions.width])

  const drawCloth = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    ctx.fillStyle = '#010610'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const sticks = sticksRef.current
    const points = pointsRef.current
    const t = timeRef.current

    for (const s of sticks) {
      if (!s.alive) continue
      const dx = s.p1.x - s.p0.x
      const dy = s.p1.y - s.p0.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const strain = dist / TEAR_DIST

      let r, g, b, a
      if (strain > 0.7) {
        r = 255
        g = Math.floor(100 * (1 - strain))
        b = 50
        a = 0.9
      } else if (strain > 0.4) {
        r = Math.floor(100 + strain * 155)
        g = Math.floor(200 - strain * 100)
        b = Math.floor(180 - strain * 80)
        a = 0.7
      } else {
        const shimmer = Math.sin(t * 0.02 + s.p0.x * 0.01) * 0.15 + 0.85
        r = Math.floor(60 * shimmer)
        g = Math.floor(220 * shimmer)
        b = Math.floor(180 * shimmer)
        a = 0.5 + strain * 0.3
      }

      ctx.strokeStyle = `rgba(${r},${g},${b},${a})`
      ctx.lineWidth = strain > 0.6 ? 1.5 : 1
      ctx.beginPath()
      ctx.moveTo(s.p0.x, s.p0.y)
      ctx.lineTo(s.p1.x, s.p1.y)
      ctx.stroke()
    }

    for (const p of points) {
      if (p.pinned) {
        ctx.fillStyle = 'rgba(255, 200, 60, 0.9)'
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    if (windActive) {
      const windStrength = Math.sin(t * 0.03)
      ctx.fillStyle = `rgba(100, 200, 255, ${Math.abs(windStrength) * 0.15})`
      ctx.font = '10px monospace'
      ctx.fillText(windStrength > 0 ? '>>> wind >>>' : '<<< wind <<<', 10, dimensions.height - 10)
    }
  }, [ctx, dimensions.width, dimensions.height, windActive])

  const updateMetrics = useCallback(() => {
    const points = pointsRef.current
    const sticks = sticksRef.current
    const alive = sticks.filter(s => s.alive).length
    const pinned = points.filter(p => p.pinned).length
    setStats({ points: points.length, sticks: alive, torn: tornRef.current, pinned })
  }, [])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    timeRef.current++

    if (mouse.isDown && mouse.isInBounds) {
      const pos = mouse.positionRef.current
      handleInteraction(pos.x, pos.y)
      prevMouseRef.current = { x: pos.x, y: pos.y }
    } else {
      const pos = mouse.positionRef.current
      prevMouseRef.current = { x: pos.x, y: pos.y }
    }

    simulate()
    drawCloth()

    if (timeRef.current % 15 === 0) updateMetrics()
  }, [ctx, dimensions.width, mouse.isDown, mouse.isInBounds, mouse.positionRef, handleInteraction, simulate, drawCloth, updateMetrics])

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

  const handleModeChange = useCallback((next) => {
    setMode(next)
    const hints = {
      pin: 'click points to pin or unpin them',
      tear: 'drag through threads to sever connections',
      push: 'drag to push the fabric with force'
    }
    setMessage(hints[next])
  }, [])

  const toggleWind = useCallback(() => {
    setWindActive(prev => {
      setMessage(!prev ? 'wind stirs the weave' : 'wind subsides')
      return !prev
    })
  }, [])

  const dropAll = useCallback(() => {
    for (const p of pointsRef.current) {
      p.pinned = false
    }
    setMessage('all pins released // the weave falls')
  }, [])

  const metrics = useMemo(() => [
    { label: 'threads', value: stats.sticks },
    { label: 'torn', value: stats.torn, color: stats.torn > 50 ? '#ff6666' : undefined },
    { label: 'pinned', value: stats.pinned },
    { label: 'mode', value: mode }
  ], [stats, mode])

  const controls = [
    { id: 'wind', label: windActive ? 'calm()' : 'wind()', onClick: toggleWind, active: windActive },
    { id: 'drop', label: 'unpin.all()', onClick: dropAll },
    { id: 'rebuild', label: 'reweave()', onClick: buildCloth, variant: 'reset' }
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
        <p className="text-void-green/50 text-xs sm:text-right max-w-lg">{message}</p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="cloth-weave-canvas"
        />
      </div>
    </div>
  )
}

export default ClothWeave
