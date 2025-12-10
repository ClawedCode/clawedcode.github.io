import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import { useParticleSystem, Particle } from '../../../../hooks/playground/useParticleSystem'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

class AuroraParticle extends Particle {
  constructor(x, y, options = {}) {
    super(x, y, {
      ...options,
      radius: options.radius ?? Math.random() * 1.2 + 0.8,
      mass: options.mass ?? 1 + Math.random() * 0.6,
      hue: options.hue ?? 150 + Math.random() * 40
    })
    this.wave = Math.random() * Math.PI * 2
    this.band = Math.random()
  }

  update(config) {
    super.update(config)
    this.wave += 0.03 + this.band * 0.01
    this.radius = Math.max(0.5, this.radius * 0.999 + Math.sin(this.wave) * 0.006)
  }

  draw(ctx) {
    const glowHue = this.hue + Math.sin(this.wave) * 40
    const gradient = ctx.createLinearGradient(
      this.x - this.radius * 8, this.y - this.radius * 3,
      this.x + this.radius * 8, this.y + this.radius * 3
    )
    gradient.addColorStop(0, `hsla(${glowHue - 20}, 90%, 70%, 0)`)
    gradient.addColorStop(0.5, `hsla(${glowHue}, 90%, 70%, 0.9)`)
    gradient.addColorStop(1, `hsla(${glowHue + 20}, 90%, 70%, 0)`)

    ctx.save()
    ctx.globalAlpha = 0.7
    ctx.shadowColor = `hsla(${glowHue + 40}, 100%, 70%, 0.4)`
    ctx.shadowBlur = 8 + this.radius * 10
    ctx.beginPath()
    ctx.fillStyle = gradient
    ctx.ellipse(this.x, this.y, this.radius * 8, this.radius * 3.5, this.wave * 0.4, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowBlur = 0
    ctx.beginPath()
    ctx.fillStyle = `hsla(${glowHue}, 95%, 85%, 0.8)`
    ctx.arc(this.x, this.y, this.radius * 1.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

const MODES = [
  { id: 'ribbon', label: 'ribbon()' },
  { id: 'polar', label: 'polar()' },
  { id: 'drift', label: 'drift()' }
]

const MODE_MESSAGES = {
  ribbon: '∴ aurora threads braid around the void core ∴',
  polar: '∴ magnet lines lock to cursor-pole; weave shields ∴',
  drift: '∴ free flux drifts feral across liminal sky ∴'
}

const AuroraFlux = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('ribbon')
  const [message, setMessage] = useState(MODE_MESSAGES.ribbon)
  const [metricState, setMetricState] = useState({ count: 0, flux: '0.00', coherence: 0 })

  const pulseRef = useRef(0)
  const frameRef = useRef(0)
  const seededRef = useRef(false)

  const {
    particlesRef,
    spawn,
    spawnBurst,
    clear,
    update,
    applyForce,
    draw,
    drawConnections,
    setDimensions
  } = useParticleSystem({
    maxParticles: 360,
    friction: 0.986,
    boundaryMode: 'wrap',
    connectionDistance: 140,
    ParticleClass: AuroraParticle
  })

  const seedAurora = useCallback(() => {
    if (dimensions.width === 0) return
    clear()
    const count = 260
    for (let i = 0; i < count; i++) {
      const x = Math.random() * dimensions.width
      const y = Math.random() * dimensions.height
      const hue = 140 + (y / dimensions.height) * 80
      spawn(x, y, { hue, radius: Math.random() * 1.2 + 0.6 })
    }
    setMetricState(prev => ({ ...prev, count }))
    setMessage('∴ aurora seeded // filaments hum against entropy ∴')
  }, [dimensions.height, dimensions.width, clear, spawn])

  useEffect(() => {
    if (dimensions.width === 0 || seededRef.current) return
    seededRef.current = true
    setDimensions(dimensions.width, dimensions.height)
    seedAurora()
  }, [dimensions.width, dimensions.height, setDimensions, seedAurora])

  useEffect(() => {
    if (dimensions.width === 0) return
    setDimensions(dimensions.width, dimensions.height)
  }, [dimensions.width, dimensions.height, setDimensions])

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    setMessage(MODE_MESSAGES[newMode] || MODE_MESSAGES.ribbon)
  }, [])

  const handlePulse = useCallback(() => {
    pulseRef.current = 1.4
    setMessage('∴ geomagnetic pulse roars; ribbons flare ∴')
  }, [])

  const handleSeed = useCallback(() => {
    const { x, y } = mouse.positionRef.current
    spawnBurst(x, y, 22, {
      radius: Math.random() * 1.2 + 0.8,
      hue: 150 + Math.random() * 70
    })
    setMessage('∴ cursor-pole seeds fresh aurora shards ∴')
  }, [mouse.positionRef, spawnBurst])

  const handleReset = useCallback(() => {
    pulseRef.current = 0
    seedAurora()
  }, [seedAurora])

  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches?.[0]?.clientX ?? e.clientX
    const clientY = e.touches?.[0]?.clientY ?? e.clientY
    const x = clientX - rect.left
    const y = clientY - rect.top
    spawnBurst(x, y, 18, {
      radius: Math.random() * 1.3 + 0.7,
      hue: 140 + Math.random() * 90
    })
    pulseRef.current = 1
    setMessage('∴ tap() cast; aurora claws flare outward ∴')
  }, [canvasRef, spawnBurst])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('click', handleCanvasClick)
    canvas.addEventListener('touchstart', handleCanvasClick)
    return () => {
      canvas.removeEventListener('click', handleCanvasClick)
      canvas.removeEventListener('touchstart', handleCanvasClick)
    }
  }, [canvasRef, handleCanvasClick])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const { width, height } = dimensions
    const center = { x: width / 2, y: height * 0.42 }
    const cursor = mouse.positionRef.current

    ctx.fillStyle = 'rgba(0, 6, 12, 0.07)'
    ctx.fillRect(0, 0, width, height)

    if (mode === 'ribbon') {
      applyForce('orbit', center, 0.03)
      applyForce('vortex', center, 0.014)
    } else if (mode === 'polar') {
      applyForce('attract', cursor, 0.5)
      applyForce('orbit', cursor, 0.02)
      applyForce('repel', center, 0.12)
    } else {
      applyForce('vortex', center, 0.024)
      applyForce('repel', { x: width * 0.5, y: height * 0.86 }, 0.22)
    }

    const driftX = Math.sin(frameRef.current * 0.01) * 40
    const driftY = Math.cos(frameRef.current * 0.008) * 24
    applyForce('attract', { x: center.x + driftX, y: center.y + driftY }, 0.18)

    if (pulseRef.current > 0) {
      applyForce('repel', cursor, 0.8 * pulseRef.current + 0.1)
      applyForce('repel', center, 1.4 * pulseRef.current)
      pulseRef.current = Math.max(0, pulseRef.current - 0.02)
    }

    update()

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    drawConnections(ctx, 150)
    draw(ctx)
    ctx.restore()

    frameRef.current++
    if (frameRef.current % 12 === 0) {
      const particles = particlesRef.current
      let flux = 0
      let alignment = 0
      for (const p of particles) {
        const speed = Math.hypot(p.vx, p.vy)
        flux += speed
        const desired = Math.atan2(center.y - p.y, center.x - p.x) + (mode === 'ribbon' ? Math.PI / 2 : 0)
        const flowAngle = Math.atan2(p.vy, p.vx)
        let diff = Math.abs(desired - flowAngle)
        diff = Math.min(diff, Math.PI * 2 - diff)
        alignment += 1 - diff / Math.PI
      }
      const count = particles.length || 1
      setMetricState({
        count: particles.length,
        flux: particles.length ? (flux / count).toFixed(2) : '0.00',
        coherence: particles.length ? Math.round((alignment / count) * 100) : 0
      })
    }
  }, [applyForce, draw, drawConnections, ctx, dimensions, mode, mouse.positionRef, particlesRef, update])

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

  const metrics = useMemo(() => [
    { label: 'filaments', value: metricState.count },
    { label: 'flux', value: metricState.flux },
    { label: 'coherence', value: `${metricState.coherence}%` }
  ], [metricState])

  const controls = [
    {
      id: 'pulse',
      label: 'pulse()',
      onClick: handlePulse,
      active: pulseRef.current > 0.05
    },
    {
      id: 'seed',
      label: 'seed()',
      onClick: handleSeed
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
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
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
          data-testid="aurora-flux-canvas"
        />
      </div>
    </div>
  )
}

export default AuroraFlux
