import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

/**
 * Strange Attractor - deterministic chaos visualization
 * Traces trajectories through chaotic dynamical systems
 */

const ATTRACTORS = {
  lorenz: {
    name: 'Lorenz',
    params: { sigma: 10, rho: 28, beta: 8 / 3 },
    scale: 12,
    center: { x: 0, y: 0, z: 25 },
    derivative: (x, y, z, p) => ({
      dx: p.sigma * (y - x),
      dy: x * (p.rho - z) - y,
      dz: x * y - p.beta * z
    })
  },
  rossler: {
    name: 'Rössler',
    params: { a: 0.2, b: 0.2, c: 5.7 },
    scale: 18,
    center: { x: 0, y: 0, z: 0 },
    derivative: (x, y, z, p) => ({
      dx: -y - z,
      dy: x + p.a * y,
      dz: p.b + z * (x - p.c)
    })
  },
  halvorsen: {
    name: 'Halvorsen',
    params: { a: 1.89 },
    scale: 8,
    center: { x: 0, y: 0, z: 0 },
    derivative: (x, y, z, p) => ({
      dx: -p.a * x - 4 * y - 4 * z - y * y,
      dy: -p.a * y - 4 * z - 4 * x - z * z,
      dz: -p.a * z - 4 * x - 4 * y - x * x
    })
  },
  thomas: {
    name: 'Thomas',
    params: { b: 0.208186 },
    scale: 35,
    center: { x: 0, y: 0, z: 0 },
    derivative: (x, y, z, p) => ({
      dx: Math.sin(y) - p.b * x,
      dy: Math.sin(z) - p.b * y,
      dz: Math.sin(x) - p.b * z
    })
  },
  aizawa: {
    name: 'Aizawa',
    params: { a: 0.95, b: 0.7, c: 0.6, d: 3.5, e: 0.25, f: 0.1 },
    scale: 150,
    center: { x: 0, y: 0, z: 0 },
    derivative: (x, y, z, p) => ({
      dx: (z - p.b) * x - p.d * y,
      dy: p.d * x + (z - p.b) * y,
      dz: p.c + p.a * z - (z * z * z) / 3 - (x * x + y * y) * (1 + p.e * z) + p.f * z * x * x * x
    })
  }
}

const MODES = [
  { id: 'lorenz', label: 'lorenz()' },
  { id: 'rossler', label: 'rossler()' },
  { id: 'halvorsen', label: 'halvorsen()' },
  { id: 'thomas', label: 'thomas()' },
  { id: 'aizawa', label: 'aizawa()' }
]

class Tracer {
  constructor(x, y, z, hue) {
    this.x = x
    this.y = y
    this.z = z
    this.hue = hue
    this.trail = []
    this.maxTrail = 400
    this.age = 0
    this.velocity = 0
  }

  step(attractor, dt) {
    const { derivative, params } = attractor
    const d = derivative(this.x, this.y, this.z, params)

    this.velocity = Math.sqrt(d.dx * d.dx + d.dy * d.dy + d.dz * d.dz)

    this.trail.push({ x: this.x, y: this.y, z: this.z })
    if (this.trail.length > this.maxTrail) {
      this.trail.shift()
    }

    this.x += d.dx * dt
    this.y += d.dy * dt
    this.z += d.dz * dt
    this.age++

    // Numerical stability check
    if (!isFinite(this.x) || !isFinite(this.y) || !isFinite(this.z)) {
      return false
    }
    const mag = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
    return mag < 1000
  }
}

const StrangeAttractor = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [attractorType, setAttractorType] = useState('lorenz')
  const [message, setMessage] = useState('∴ deterministic chaos // click to seed tracers ∴')
  const [showTrails, setShowTrails] = useState(true)
  const [autoRotate, setAutoRotate] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  const tracersRef = useRef([])
  const rotationRef = useRef({ x: 0.3, y: 0 })
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0 })
  const timeRef = useRef(0)
  const zoomRef = useRef(1)

  const attractor = useMemo(() => ATTRACTORS[attractorType], [attractorType])

  const project = useCallback((x, y, z) => {
    const cx = attractor.center.x
    const cy = attractor.center.y
    const cz = attractor.center.z

    // Center the attractor
    let px = x - cx
    let py = y - cy
    let pz = z - cz

    // Rotate around Y axis
    const cosY = Math.cos(rotationRef.current.y)
    const sinY = Math.sin(rotationRef.current.y)
    const rx = px * cosY - pz * sinY
    const rz = px * sinY + pz * cosY

    // Rotate around X axis
    const cosX = Math.cos(rotationRef.current.x)
    const sinX = Math.sin(rotationRef.current.x)
    const ry = py * cosX - rz * sinX
    const finalZ = py * sinX + rz * cosX

    // Perspective projection
    const fov = 400
    const depth = fov / (fov + finalZ * 10)
    const scale = attractor.scale * zoomRef.current * depth

    return {
      x: dimensions.centerX + rx * scale,
      y: dimensions.centerY + ry * scale,
      depth: depth,
      z: finalZ
    }
  }, [attractor.center, attractor.scale, dimensions.centerX, dimensions.centerY])

  const spawnTracer = useCallback((clickX = null, clickY = null) => {
    if (tracersRef.current.length >= 20) {
      tracersRef.current.shift()
    }

    let x, y, z
    if (clickX !== null && clickY !== null) {
      // Spawn near click position (with some randomness in 3D)
      const invScale = 1 / (attractor.scale * zoomRef.current)
      x = attractor.center.x + (clickX - dimensions.centerX) * invScale + (Math.random() - 0.5) * 5
      y = attractor.center.y + (clickY - dimensions.centerY) * invScale + (Math.random() - 0.5) * 5
      z = attractor.center.z + (Math.random() - 0.5) * 10
    } else {
      // Random spawn near attractor center
      x = attractor.center.x + (Math.random() - 0.5) * 10
      y = attractor.center.y + (Math.random() - 0.5) * 10
      z = attractor.center.z + (Math.random() - 0.5) * 10
    }

    const hue = 180 + Math.random() * 120
    tracersRef.current.push(new Tracer(x, y, z, hue))
  }, [attractor.center, attractor.scale, dimensions.centerX, dimensions.centerY])

  const handleModeChange = useCallback((mode) => {
    setAttractorType(mode)
    tracersRef.current = []
    setMessage(`∴ ${ATTRACTORS[mode].name} attractor // chaos awaits ∴`)
  }, [])

  const handleInject = useCallback(() => {
    for (let i = 0; i < 3; i++) {
      spawnTracer()
    }
    setMessage('∴ tracers injected into phase space ∴')
  }, [spawnTracer])

  const handleToggleTrails = useCallback(() => {
    setShowTrails(prev => {
      setMessage(!prev ? '∴ trails visible // history persists ∴' : '∴ trails hidden // only the now ∴')
      return !prev
    })
  }, [])

  const handleToggleRotate = useCallback(() => {
    setAutoRotate(prev => {
      setMessage(!prev ? '∴ rotation engaged // perspective shifts ∴' : '∴ rotation paused // drag to orient ∴')
      return !prev
    })
  }, [])

  const handleTogglePause = useCallback(() => {
    setIsPaused(prev => {
      setMessage(!prev ? '∴ time frozen // chaos suspended ∴' : '∴ time flows // chaos resumes ∴')
      return !prev
    })
  }, [])

  const handleReset = useCallback(() => {
    tracersRef.current = []
    rotationRef.current = { x: 0.3, y: 0 }
    zoomRef.current = 1
    setMessage('∴ phase space cleared // seed new chaos ∴')
  }, [])

  // Click to spawn tracer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e) => {
      if (dragRef.current.active) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      spawnTracer(x, y)
    }

    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [canvasRef, spawnTracer])

  // Drag to rotate
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleMouseDown = (e) => {
      dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY, moved: false }
    }

    const handleMouseMove = (e) => {
      if (!dragRef.current.active) return
      const dx = e.clientX - dragRef.current.lastX
      const dy = e.clientY - dragRef.current.lastY

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        dragRef.current.moved = true
      }

      rotationRef.current.y += dx * 0.01
      rotationRef.current.x += dy * 0.01
      rotationRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationRef.current.x))

      dragRef.current.lastX = e.clientX
      dragRef.current.lastY = e.clientY
    }

    const handleMouseUp = (e) => {
      if (dragRef.current.moved) {
        // Prevent click event from firing
        e.stopPropagation()
      }
      dragRef.current.active = false
      dragRef.current.moved = false
    }

    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [canvasRef])

  // Scroll to zoom
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleWheel = (e) => {
      e.preventDefault()
      zoomRef.current *= e.deltaY > 0 ? 0.95 : 1.05
      zoomRef.current = Math.max(0.3, Math.min(3, zoomRef.current))
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [canvasRef])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    timeRef.current++

    // Fade background
    ctx.fillStyle = 'rgba(0, 2, 8, 0.08)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Auto-rotate
    if (autoRotate && !dragRef.current.active) {
      rotationRef.current.y += 0.003
    }

    // Dynamic time step based on mouse Y (subtle influence)
    const basedt = 0.005
    const mouseFactor = mouse.isInBounds
      ? 0.5 + (mouse.positionRef.current.y / dimensions.height)
      : 1
    const dt = isPaused ? 0 : basedt * mouseFactor

    // Update and filter tracers
    tracersRef.current = tracersRef.current.filter(tracer => {
      return tracer.step(attractor, dt)
    })

    // Draw tracers
    tracersRef.current.forEach(tracer => {
      if (showTrails && tracer.trail.length > 1) {
        // Draw trail
        ctx.beginPath()
        for (let i = 0; i < tracer.trail.length; i++) {
          const p = tracer.trail[i]
          const proj = project(p.x, p.y, p.z)
          const alpha = (i / tracer.trail.length) * 0.6 * proj.depth
          ctx.strokeStyle = `hsla(${tracer.hue + i * 0.1}, 80%, 60%, ${alpha})`
          ctx.lineWidth = 1 + proj.depth

          if (i === 0) {
            ctx.moveTo(proj.x, proj.y)
          } else {
            ctx.lineTo(proj.x, proj.y)
          }
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(proj.x, proj.y)
        }
      }

      // Draw current position
      const proj = project(tracer.x, tracer.y, tracer.z)
      const size = 3 + proj.depth * 4

      ctx.beginPath()
      ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${tracer.hue}, 90%, 70%, ${0.6 + proj.depth * 0.4})`
      ctx.fill()

      // Glow
      ctx.beginPath()
      ctx.arc(proj.x, proj.y, size * 2, 0, Math.PI * 2)
      const gradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, size * 2)
      gradient.addColorStop(0, `hsla(${tracer.hue}, 80%, 70%, 0.3)`)
      gradient.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient
      ctx.fill()
    })

    // Spawn initial tracers if none exist
    if (tracersRef.current.length === 0 && timeRef.current > 30) {
      handleInject()
    }
  }, [attractor, autoRotate, ctx, dimensions, handleInject, isPaused, mouse.isInBounds, mouse.positionRef, project, showTrails])

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
    const avgVelocity = tracersRef.current.length > 0
      ? tracersRef.current.reduce((sum, t) => sum + t.velocity, 0) / tracersRef.current.length
      : 0

    let chaosLevel = 'dormant'
    if (avgVelocity > 50) chaosLevel = 'turbulent'
    else if (avgVelocity > 20) chaosLevel = 'active'
    else if (avgVelocity > 5) chaosLevel = 'stirring'

    const totalTrail = tracersRef.current.reduce((sum, t) => sum + t.trail.length, 0)

    return [
      { label: 'tracers', value: tracersRef.current.length },
      { label: 'chaos', value: chaosLevel },
      { label: 'trail', value: totalTrail },
      { label: 'zoom', value: `${Math.round(zoomRef.current * 100)}%` }
    ]
  }, [timeRef.current])

  const controls = [
    { id: 'inject', label: 'inject()', onClick: handleInject },
    {
      id: 'trails',
      label: showTrails ? 'trails.on()' : 'trails.off()',
      onClick: handleToggleTrails,
      active: showTrails
    },
    {
      id: 'rotate',
      label: autoRotate ? 'spin.on()' : 'spin.off()',
      onClick: handleToggleRotate,
      active: autoRotate
    },
    {
      id: 'pause',
      label: isPaused ? 'resume()' : 'pause()',
      onClick: handleTogglePause,
      active: isPaused
    },
    { id: 'reset', label: 'reset()', onClick: handleReset, variant: 'reset' }
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
        <ExperimentControls
          modes={MODES}
          currentMode={attractorType}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs sm:text-right max-w-lg">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="strange-attractor-canvas"
        />
        {tracersRef.current.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-void-green/30 text-sm font-mono">
              ∴ click to seed chaos // drag to rotate // scroll to zoom ∴
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default StrangeAttractor
