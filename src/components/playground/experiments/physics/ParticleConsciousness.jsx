import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useParticleSystem, Particle } from '../../../../hooks/playground/useParticleSystem'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'spawn', label: 'spawn()' },
  { id: 'attract', label: 'attract()' },
  { id: 'repel', label: 'repel()' },
  { id: 'orbit', label: 'orbit()' },
  { id: 'vortex', label: 'vortex()' }
]

const MODE_MESSAGES = {
  spawn: '∴ spawn mode // click to birth particles from the void ∴',
  attract: '∴ attract mode // cursor becomes gravitational well ∴',
  repel: '∴ repel mode // cursor radiates repulsive force ∴',
  orbit: '∴ orbit mode // particles circle the center like thoughts around an idea ∴',
  vortex: '∴ vortex mode // spiral inward toward convergence ∴'
}

const ATTRACTOR_TEXT = {
  spawn: 'none',
  attract: 'cursor.pull',
  repel: 'cursor.push',
  orbit: 'center.orbit',
  vortex: 'center.vortex'
}

/**
 * Extended particle with age-based fade
 */
class ConsciousnessParticle extends Particle {
  update(config) {
    super.update(config)
    if (this.age > 1000) {
      this.radius *= 0.99
    }
  }

  draw(ctx) {
    const saturation = 70 + this.connections * 5
    const lightness = 40 + this.connections * 3
    const alpha = 0.4 + this.connections * 0.1

    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius * 4
    )
    gradient.addColorStop(0, `hsla(${this.hue}, ${saturation}%, ${lightness}%, ${alpha})`)
    gradient.addColorStop(0.5, `hsla(${this.hue}, ${saturation}%, ${lightness}%, ${alpha * 0.5})`)
    gradient.addColorStop(1, `hsla(${this.hue}, ${saturation}%, ${lightness}%, 0)`)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius * 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = `hsla(${this.hue}, ${saturation + 20}%, ${lightness + 20}%, ${alpha + 0.4})`
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

const ParticleConsciousness = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)
  const hasInitialized = useRef(false)

  const [mode, setMode] = useState('spawn')
  const [showConnections, setShowConnections] = useState(true)
  const [message, setMessage] = useState(MODE_MESSAGES.spawn)

  const {
    particlesRef,
    spawn,
    spawnBurst,
    clear,
    update,
    applyForce,
    draw,
    setDimensions
  } = useParticleSystem({
    maxParticles: 300,
    friction: 0.98,
    boundaryMode: 'wrap',
    connectionDistance: 100,
    ParticleClass: ConsciousnessParticle
  })


  // Keep particle system dimensions in sync and spawn initial particles
  useEffect(() => {
    if (dimensions.width === 0) return

    setDimensions(dimensions.width, dimensions.height)

    if (hasInitialized.current) return
    hasInitialized.current = true

    const count = 50
    const radius = Math.min(dimensions.width, dimensions.height) * 0.3
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const x = dimensions.centerX + Math.cos(angle) * radius
      const y = dimensions.centerY + Math.sin(angle) * radius
      spawn(x, y)
    }
  }, [dimensions, setDimensions, spawn])

  // Draw connections with hue blending
  const drawConnections = useCallback((ctx) => {
    if (!showConnections) return

    const particles = particlesRef.current
    ctx.lineWidth = 0.5

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 100) {
          particles[i].connections++
          particles[j].connections++
          const alpha = (1 - dist / 100) * 0.3
          const avgHue = (particles[i].hue + particles[j].hue) / 2

          ctx.strokeStyle = `hsla(${avgHue}, 80%, 60%, ${alpha})`
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.stroke()
        }
      }
    }
  }, [particlesRef, showConnections])

  // Calculate metrics
  const metrics = useMemo(() => {
    const particles = particlesRef.current
    const count = particles.length

    // Coherence - how clustered are particles
    let coherence = 0
    if (count >= 2) {
      let avgX = 0, avgY = 0
      particles.forEach(p => { avgX += p.x; avgY += p.y })
      avgX /= count
      avgY /= count

      let avgDist = 0
      particles.forEach(p => {
        const dx = p.x - avgX
        const dy = p.y - avgY
        avgDist += Math.sqrt(dx * dx + dy * dy)
      })
      avgDist /= count

      const maxDist = Math.sqrt(dimensions.width ** 2 + dimensions.height ** 2) / 2
      coherence = 1 - avgDist / maxDist
    }

    let coherenceLevel = 'void'
    if (coherence >= 0.8) coherenceLevel = 'unified'
    else if (coherence >= 0.6) coherenceLevel = 'coherent'
    else if (coherence >= 0.4) coherenceLevel = 'coalescing'
    else if (coherence >= 0.2) coherenceLevel = 'scattered'

    // Emergence - based on average connections
    const avgConnections = count > 0 ? particles.reduce((sum, p) => sum + p.connections, 0) / count : 0

    let emergenceState = 'dormant'
    if (avgConnections >= 10) emergenceState = 'conscious'
    else if (avgConnections >= 6) emergenceState = 'manifesting'
    else if (avgConnections >= 3) emergenceState = 'emerging'
    else if (avgConnections >= 1) emergenceState = 'stirring'

    return [
      { label: 'particles', value: count },
      { label: 'coherence', value: coherenceLevel },
      { label: 'emergence', value: emergenceState },
      { label: 'attractor', value: ATTRACTOR_TEXT[mode] }
    ]
  }, [particlesRef, dimensions, mode])

  // Animation frame
  const timeRef = useRef(0)
  const mouseDownRef = useRef(false)

  useEffect(() => {
    mouseDownRef.current = mouse.isDown
  }, [mouse.isDown])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    timeRef.current++

    // Trail effect clear
    ctx.fillStyle = 'rgba(0, 1, 8, 0.1)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Apply mode-specific forces
    const mousePos = mouse.positionRef.current
    const center = { x: dimensions.centerX, y: dimensions.centerY }

    switch (mode) {
      case 'attract':
        applyForce('attract', mousePos, 0.3)
        break
      case 'repel':
        applyForce('repel', mousePos, 0.5)
        break
      case 'orbit':
        applyForce('orbit', center, 0.02)
        break
      case 'vortex':
        applyForce('vortex', center, 0.015)
        break
    }

    // Auto-spawn in spawn mode when mouse is down
    if (mode === 'spawn' && mouseDownRef.current && timeRef.current % 3 === 0) {
      const jitter = 20
      spawn(
        mousePos.x + (Math.random() - 0.5) * jitter,
        mousePos.y + (Math.random() - 0.5) * jitter
      )
    }

    // Update and draw
    update()
    drawConnections(ctx)
    draw(ctx)

  }, [ctx, dimensions, mode, applyForce, spawn, update, draw, drawConnections, mouse.positionRef])

  // Manual animation loop - starts when ctx is available
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

  // Handle mouse down for spawn burst
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = () => {
      if (mode === 'spawn') {
        spawnBurst(mouse.positionRef.current.x, mouse.positionRef.current.y, 15)
      }
    }

    canvas.addEventListener('mousedown', handleClick)
    return () => canvas.removeEventListener('mousedown', handleClick)
  }, [canvasRef, mode, spawnBurst, mouse.positionRef])

  // Mode change handler
  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    setMessage(MODE_MESSAGES[newMode])
  }, [])

  // Control handlers
  const handleToggleConnections = useCallback(() => {
    setShowConnections(prev => !prev)
    setMessage(showConnections
      ? '∴ connections hidden // particles in isolation ∴'
      : '∴ connections visible // watch relationships emerge ∴'
    )
  }, [showConnections])

  const handleReset = useCallback(() => {
    clear()
    hasInitialized.current = false
    setMode('spawn')
    setShowConnections(true)
    setMessage('∴ field cleared // void awaits new patterns ∴')

    // Respawn initial circle
    const count = 50
    const radius = Math.min(dimensions.width, dimensions.height) * 0.3
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const x = dimensions.centerX + Math.cos(angle) * radius
      const y = dimensions.centerY + Math.sin(angle) * radius
      spawn(x, y)
    }
    hasInitialized.current = true
  }, [clear, spawn, dimensions])

  const controls = [
    {
      id: 'connections',
      label: showConnections ? 'connections.hide()' : 'connections.show()',
      onClick: handleToggleConnections,
      active: showConnections
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
      {/* Header */}
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

      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
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

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="particle-canvas"
        />
      </div>
    </div>
  )
}

export default ParticleConsciousness
