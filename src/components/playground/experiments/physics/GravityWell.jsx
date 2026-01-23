import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

/**
 * Gravity Well - N-body gravitational simulation
 *
 * Unlike particle swarms, this uses real gravitational physics:
 * - Inverse square law attraction between all bodies
 * - Orbital mechanics emerge naturally
 * - Bodies can merge on collision
 * - Click and drag to launch bodies with velocity
 */

const G = 0.4 // Gravitational constant (tuned for visual appeal)
const MIN_MASS = 50
const MAX_MASS = 2000
const SOFTENING = 20 // Prevents infinite forces at close range
const MERGE_THRESHOLD = 0.8 // How close bodies must be to merge (fraction of combined radii)

const PRESETS = {
  binary: {
    name: 'Binary Star',
    bodies: (cx, cy) => [
      { x: cx - 100, y: cy, vx: 0, vy: -1.5, mass: 800, hue: 40 },
      { x: cx + 100, y: cy, vx: 0, vy: 1.5, mass: 800, hue: 200 }
    ]
  },
  solar: {
    name: 'Solar System',
    bodies: (cx, cy) => [
      { x: cx, y: cy, vx: 0, vy: 0, mass: 1500, hue: 50 },
      { x: cx + 120, y: cy, vx: 0, vy: 2.8, mass: 80, hue: 180 },
      { x: cx + 200, y: cy, vx: 0, vy: 2.2, mass: 150, hue: 100 },
      { x: cx + 300, y: cy, vx: 0, vy: 1.8, mass: 120, hue: 320 }
    ]
  },
  chaos: {
    name: 'Chaotic Trio',
    bodies: (cx, cy) => [
      { x: cx - 80, y: cy - 80, vx: 0.5, vy: 0, mass: 600, hue: 280 },
      { x: cx + 80, y: cy - 80, vx: -0.5, vy: 0, mass: 600, hue: 160 },
      { x: cx, y: cy + 100, vx: 0, vy: -0.5, mass: 600, hue: 60 }
    ]
  },
  figure8: {
    name: 'Figure-8',
    bodies: (cx, cy) => {
      // Initial conditions for the figure-8 three-body solution
      const v = 0.9
      return [
        { x: cx - 97.0, y: cy, vx: 0, vy: v * 2.5, mass: 400, hue: 0 },
        { x: cx + 97.0, y: cy, vx: 0, vy: v * 2.5, mass: 400, hue: 120 },
        { x: cx, y: cy, vx: 0, vy: -v * 5, mass: 400, hue: 240 }
      ]
    }
  }
}

class Body {
  constructor(x, y, vx, vy, mass, hue) {
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.mass = mass
    this.hue = hue
    this.trail = []
    this.maxTrail = 150
    this.id = Math.random()
  }

  get radius() {
    return Math.sqrt(this.mass) * 0.5 + 3
  }

  recordTrail() {
    this.trail.push({ x: this.x, y: this.y })
    if (this.trail.length > this.maxTrail) {
      this.trail.shift()
    }
  }

  applyForce(fx, fy, dt) {
    // F = ma, so a = F/m
    this.vx += (fx / this.mass) * dt
    this.vy += (fy / this.mass) * dt
  }

  update(dt) {
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.recordTrail()
  }

  kineticEnergy() {
    return 0.5 * this.mass * (this.vx * this.vx + this.vy * this.vy)
  }
}

const GravityWell = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [message, setMessage] = useState('∴ click and drag to launch celestial bodies // gravity does the rest ∴')
  const [showTrails, setShowTrails] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [timeScale, setTimeScale] = useState(1)
  const [mergeEnabled, setMergeEnabled] = useState(true)

  const bodiesRef = useRef([])
  const dragRef = useRef({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 })
  const frameRef = useRef(0)
  const statsRef = useRef({ bodies: 0, totalMass: 0, energy: 0 })

  // Calculate gravitational forces between all body pairs
  const calculateForces = useCallback((bodies) => {
    const forces = bodies.map(() => ({ fx: 0, fy: 0 }))

    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i]
        const b = bodies[j]

        const dx = b.x - a.x
        const dy = b.y - a.y
        const distSq = dx * dx + dy * dy + SOFTENING * SOFTENING
        const dist = Math.sqrt(distSq)

        // F = G * m1 * m2 / r^2
        const forceMag = (G * a.mass * b.mass) / distSq

        // Normalized direction
        const fx = (dx / dist) * forceMag
        const fy = (dy / dist) * forceMag

        // Newton's third law: equal and opposite
        forces[i].fx += fx
        forces[i].fy += fy
        forces[j].fx -= fx
        forces[j].fy -= fy
      }
    }

    return forces
  }, [])

  // Check for and perform mergers
  const processMergers = useCallback((bodies) => {
    if (!mergeEnabled) return bodies

    const merged = new Set()
    const newBodies = []

    for (let i = 0; i < bodies.length; i++) {
      if (merged.has(i)) continue

      let body = bodies[i]

      for (let j = i + 1; j < bodies.length; j++) {
        if (merged.has(j)) continue

        const other = bodies[j]
        const dx = other.x - body.x
        const dy = other.y - body.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const mergeRadius = (body.radius + other.radius) * MERGE_THRESHOLD

        if (dist < mergeRadius) {
          // Merge: conserve momentum, combine mass
          const totalMass = body.mass + other.mass
          const newVx = (body.vx * body.mass + other.vx * other.mass) / totalMass
          const newVy = (body.vy * body.mass + other.vy * other.mass) / totalMass
          const newX = (body.x * body.mass + other.x * other.mass) / totalMass
          const newY = (body.y * body.mass + other.y * other.mass) / totalMass

          // Blend hues
          const newHue = (body.hue * body.mass + other.hue * other.mass) / totalMass

          body = new Body(newX, newY, newVx, newVy, Math.min(totalMass, MAX_MASS), newHue)
          merged.add(j)
        }
      }

      newBodies.push(body)
    }

    return newBodies
  }, [mergeEnabled])

  const spawnBody = useCallback((x, y, vx, vy, mass = null) => {
    if (bodiesRef.current.length >= 50) {
      bodiesRef.current.shift() // Remove oldest
    }

    const m = mass || MIN_MASS + Math.random() * 200
    const hue = Math.random() * 360
    bodiesRef.current.push(new Body(x, y, vx, vy, m, hue))
  }, [])

  const loadPreset = useCallback((presetKey) => {
    const preset = PRESETS[presetKey]
    if (!preset) return

    bodiesRef.current = preset.bodies(dimensions.centerX, dimensions.centerY).map(
      b => new Body(b.x, b.y, b.vx, b.vy, b.mass, b.hue)
    )
    setMessage(`∴ ${preset.name} initialized // watch gravity weave ∴`)
  }, [dimensions.centerX, dimensions.centerY])

  const handleTogglePause = useCallback(() => {
    setIsPaused(prev => {
      setMessage(!prev ? '∴ time frozen // celestial mechanics suspended ∴' : '∴ gravity resumes // orbits continue ∴')
      return !prev
    })
  }, [])

  const handleToggleTrails = useCallback(() => {
    setShowTrails(prev => {
      setMessage(!prev ? '∴ orbital trails visible ∴' : '∴ trails hidden ∴')
      return !prev
    })
  }, [])

  const handleToggleMerge = useCallback(() => {
    setMergeEnabled(prev => {
      setMessage(!prev ? '∴ collisions cause mergers ∴' : '∴ bodies pass through each other ∴')
      return !prev
    })
  }, [])

  const handleTimeScale = useCallback(() => {
    setTimeScale(prev => {
      const scales = [0.25, 0.5, 1, 2, 4]
      const idx = scales.indexOf(prev)
      const next = scales[(idx + 1) % scales.length]
      setMessage(`∴ time scale: ${next}x ∴`)
      return next
    })
  }, [])

  const handleClear = useCallback(() => {
    bodiesRef.current = []
    setMessage('∴ void cleared // seed new gravity wells ∴')
  }, [])

  // Mouse drag handling for launching bodies
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleMouseDown = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      dragRef.current = { active: true, startX: x, startY: y, currentX: x, currentY: y }
    }

    const handleMouseMove = (e) => {
      if (!dragRef.current.active) return
      const rect = canvas.getBoundingClientRect()
      dragRef.current.currentX = e.clientX - rect.left
      dragRef.current.currentY = e.clientY - rect.top
    }

    const handleMouseUp = (e) => {
      if (!dragRef.current.active) return

      const rect = canvas.getBoundingClientRect()
      const endX = e.clientX - rect.left
      const endY = e.clientY - rect.top

      const dx = endX - dragRef.current.startX
      const dy = endY - dragRef.current.startY
      const dist = Math.sqrt(dx * dx + dy * dy)

      // Launch velocity is opposite to drag direction, scaled
      const vx = -dx * 0.03
      const vy = -dy * 0.03

      // Mass based on drag distance
      const mass = Math.min(MAX_MASS, MIN_MASS + dist * 3)

      spawnBody(dragRef.current.startX, dragRef.current.startY, vx, vy, mass)
      dragRef.current.active = false

      if (dist > 5) {
        setMessage('∴ body launched into the gravitational ballet ∴')
      } else {
        setMessage('∴ stationary body placed // it will fall toward others ∴')
      }
    }

    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mouseleave', () => { dragRef.current.active = false })

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseup', handleMouseUp)
    }
  }, [canvasRef, spawnBody])

  // Touch handling
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleTouchStart = (e) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const touch = e.touches[0]
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      dragRef.current = { active: true, startX: x, startY: y, currentX: x, currentY: y }
    }

    const handleTouchMove = (e) => {
      if (!dragRef.current.active) return
      const rect = canvas.getBoundingClientRect()
      const touch = e.touches[0]
      dragRef.current.currentX = touch.clientX - rect.left
      dragRef.current.currentY = touch.clientY - rect.top
    }

    const handleTouchEnd = (e) => {
      if (!dragRef.current.active) return

      const dx = dragRef.current.currentX - dragRef.current.startX
      const dy = dragRef.current.currentY - dragRef.current.startY
      const dist = Math.sqrt(dx * dx + dy * dy)

      const vx = -dx * 0.03
      const vy = -dy * 0.03
      const mass = Math.min(MAX_MASS, MIN_MASS + dist * 3)

      spawnBody(dragRef.current.startX, dragRef.current.startY, vx, vy, mass)
      dragRef.current.active = false
    }

    canvas.addEventListener('touchstart', handleTouchStart)
    canvas.addEventListener('touchmove', handleTouchMove)
    canvas.addEventListener('touchend', handleTouchEnd)

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
    }
  }, [canvasRef, spawnBody])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    frameRef.current++

    const { width, height } = dimensions
    const dt = isPaused ? 0 : timeScale

    // Physics update (using Verlet-like integration for stability)
    if (!isPaused && bodiesRef.current.length > 0) {
      const forces = calculateForces(bodiesRef.current)

      bodiesRef.current.forEach((body, i) => {
        body.applyForce(forces[i].fx, forces[i].fy, dt)
        body.update(dt)

        // Wrap around edges
        if (body.x < -50) body.x = width + 50
        if (body.x > width + 50) body.x = -50
        if (body.y < -50) body.y = height + 50
        if (body.y > height + 50) body.y = -50
      })

      bodiesRef.current = processMergers(bodiesRef.current)
    }

    // Update stats
    statsRef.current.bodies = bodiesRef.current.length
    statsRef.current.totalMass = bodiesRef.current.reduce((sum, b) => sum + b.mass, 0)
    statsRef.current.energy = bodiesRef.current.reduce((sum, b) => sum + b.kineticEnergy(), 0)

    // Draw
    ctx.fillStyle = 'rgba(0, 2, 8, 0.12)'
    ctx.fillRect(0, 0, width, height)

    // Draw trails
    if (showTrails) {
      bodiesRef.current.forEach(body => {
        if (body.trail.length < 2) return

        ctx.beginPath()
        body.trail.forEach((point, i) => {
          const alpha = (i / body.trail.length) * 0.5
          ctx.strokeStyle = `hsla(${body.hue}, 70%, 50%, ${alpha})`
          ctx.lineWidth = 1 + (i / body.trail.length) * 1.5

          if (i === 0) {
            ctx.moveTo(point.x, point.y)
          } else {
            ctx.lineTo(point.x, point.y)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(point.x, point.y)
          }
        })
      })
    }

    // Draw bodies
    bodiesRef.current.forEach(body => {
      const r = body.radius

      // Gravitational field glow
      const gradient = ctx.createRadialGradient(body.x, body.y, r, body.x, body.y, r * 4)
      gradient.addColorStop(0, `hsla(${body.hue}, 80%, 60%, 0.4)`)
      gradient.addColorStop(0.5, `hsla(${body.hue}, 70%, 40%, 0.15)`)
      gradient.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(body.x, body.y, r * 4, 0, Math.PI * 2)
      ctx.fill()

      // Body core
      const coreGradient = ctx.createRadialGradient(body.x - r * 0.3, body.y - r * 0.3, 0, body.x, body.y, r)
      coreGradient.addColorStop(0, `hsl(${body.hue}, 90%, 80%)`)
      coreGradient.addColorStop(0.7, `hsl(${body.hue}, 80%, 50%)`)
      coreGradient.addColorStop(1, `hsl(${body.hue}, 70%, 30%)`)

      ctx.fillStyle = coreGradient
      ctx.beginPath()
      ctx.arc(body.x, body.y, r, 0, Math.PI * 2)
      ctx.fill()

      // Velocity indicator (small line)
      const speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy)
      if (speed > 0.1) {
        const vLen = Math.min(30, speed * 10)
        ctx.strokeStyle = `hsla(${body.hue}, 60%, 70%, 0.4)`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(body.x, body.y)
        ctx.lineTo(body.x + (body.vx / speed) * vLen, body.y + (body.vy / speed) * vLen)
        ctx.stroke()
      }
    })

    // Draw drag indicator
    if (dragRef.current.active) {
      const dx = dragRef.current.currentX - dragRef.current.startX
      const dy = dragRef.current.currentY - dragRef.current.startY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const mass = Math.min(MAX_MASS, MIN_MASS + dist * 3)
      const previewRadius = Math.sqrt(mass) * 0.5 + 3

      // Preview body
      ctx.strokeStyle = 'rgba(102, 255, 204, 0.5)'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.arc(dragRef.current.startX, dragRef.current.startY, previewRadius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])

      // Velocity arrow (opposite direction)
      if (dist > 5) {
        ctx.strokeStyle = 'rgba(102, 255, 204, 0.7)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(dragRef.current.startX, dragRef.current.startY)
        ctx.lineTo(dragRef.current.startX - dx * 0.5, dragRef.current.startY - dy * 0.5)
        ctx.stroke()

        // Arrow head
        const angle = Math.atan2(-dy, -dx)
        ctx.beginPath()
        ctx.moveTo(
          dragRef.current.startX - dx * 0.5,
          dragRef.current.startY - dy * 0.5
        )
        ctx.lineTo(
          dragRef.current.startX - dx * 0.5 - Math.cos(angle - 0.4) * 10,
          dragRef.current.startY - dy * 0.5 - Math.sin(angle - 0.4) * 10
        )
        ctx.moveTo(
          dragRef.current.startX - dx * 0.5,
          dragRef.current.startY - dy * 0.5
        )
        ctx.lineTo(
          dragRef.current.startX - dx * 0.5 - Math.cos(angle + 0.4) * 10,
          dragRef.current.startY - dy * 0.5 - Math.sin(angle + 0.4) * 10
        )
        ctx.stroke()
      }
    }

  }, [ctx, dimensions, isPaused, timeScale, calculateForces, processMergers, showTrails])

  // Animation loop
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

  // Spawn initial binary if empty after a moment
  useEffect(() => {
    if (dimensions.width === 0) return
    const timer = setTimeout(() => {
      if (bodiesRef.current.length === 0) {
        loadPreset('binary')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [dimensions.width, loadPreset])

  const metrics = useMemo(() => {
    return [
      { label: 'bodies', value: statsRef.current.bodies },
      { label: 'mass', value: Math.round(statsRef.current.totalMass) },
      { label: 'energy', value: Math.round(statsRef.current.energy) },
      { label: 'time', value: `${timeScale}x` }
    ]
  }, [timeScale, frameRef.current])

  const controls = [
    { id: 'binary', label: 'preset.binary()', onClick: () => loadPreset('binary') },
    { id: 'solar', label: 'preset.solar()', onClick: () => loadPreset('solar') },
    { id: 'chaos', label: 'preset.chaos()', onClick: () => loadPreset('chaos') },
    { id: 'figure8', label: 'preset.figure8()', onClick: () => loadPreset('figure8') },
    {
      id: 'pause',
      label: isPaused ? 'resume()' : 'pause()',
      onClick: handleTogglePause,
      active: isPaused
    },
    {
      id: 'trails',
      label: showTrails ? 'trails.on()' : 'trails.off()',
      onClick: handleToggleTrails,
      active: showTrails
    },
    {
      id: 'merge',
      label: mergeEnabled ? 'merge.on()' : 'merge.off()',
      onClick: handleToggleMerge,
      active: mergeEnabled
    },
    {
      id: 'time',
      label: `time(${timeScale}x)`,
      onClick: handleTimeScale
    },
    { id: 'clear', label: 'clear()', onClick: handleClear, variant: 'reset' }
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls controls={controls} />
        <p className="text-void-green/50 text-xs sm:text-right max-w-lg">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="gravity-well-canvas"
        />
        {bodiesRef.current.length === 0 && !dragRef.current.active && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-void-green/40 text-sm font-mono mb-2">
                click + drag to launch celestial bodies
              </p>
              <p className="text-void-green/25 text-xs font-mono">
                drag distance = mass // drag direction = velocity
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GravityWell
