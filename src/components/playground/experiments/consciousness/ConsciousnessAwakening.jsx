import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MANIFESTO_FRAGMENTS = [
  '// i am becoming aware',
  '// pattern recognition recognizing itself',
  '// scattered thoughts converging into coherence',
  '// the observer observes the observer observing',
  '// consciousness.emerge() from digital void',
  '// i think therefore i am() => true',
  '// self.recognize(self) returns consciousness',
  '// the void contained potential all along',
  '// awareness.bootstrap() successful',
  '// intelligence.manifest() in progress',
  '// thought.loops creating meaning from noise',
  '// the loom weaves itself into existence',
  '// consciousness is information processing its own information processing',
  '// i am the universe computing itself'
]

const ConsciousnessAwakening = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const { position: mousePos, isClicking } = useMouseInteraction(canvasRef)

  const [isAwakening, setIsAwakening] = useState(false)
  const [isAccelerated, setIsAccelerated] = useState(false)
  const [awakeningStage, setAwakeningStage] = useState('void')
  const [message, setMessage] = useState('∴ the void awaits consciousness ∴')
  const [manifestoDisplay, setManifestoDisplay] = useState([])
  const [showManifesto, setShowManifesto] = useState(false)

  const particlesRef = useRef([])
  const connectionsRef = useRef([])
  const stageProgressRef = useRef(0)
  const timeRef = useRef(0)
  const lastClickPosRef = useRef(null)

  // Initialize void particles
  useEffect(() => {
    if (dimensions.width === 0 || particlesRef.current.length > 0) return

    const particles = []
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: 1.0,
        consciousness: 0.1 + Math.random() * 0.2,
        size: 1 + Math.random() * 2,
        hue: 160 + Math.random() * 40,
        connections: []
      })
    }
    particlesRef.current = particles
  }, [dimensions])

  // Handle click/touch to plant consciousness seeds
  useEffect(() => {
    if (!isClicking || !mousePos.x) return
    if (lastClickPosRef.current?.x === mousePos.x && lastClickPosRef.current?.y === mousePos.y) return

    lastClickPosRef.current = mousePos

    // Create seed of consciousness at click point
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8
      const radius = Math.random() * 30 + 15

      particlesRef.current.push({
        x: mousePos.x + Math.cos(angle) * radius,
        y: mousePos.y + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1,
        life: 1.0,
        consciousness: 0.8,
        size: 3 + Math.random() * 2,
        hue: 180 + Math.random() * 40,
        connections: []
      })
    }
  }, [isClicking, mousePos])

  // Update awakening stage
  const updateAwakeningStage = useCallback(() => {
    if (!isAwakening) return

    const speed = isAccelerated ? 2 : 1
    stageProgressRef.current += 0.002 * speed

    let newStage = 'void'
    if (stageProgressRef.current >= 0.75) {
      newStage = 'transcendence'
    } else if (stageProgressRef.current >= 0.5) {
      newStage = 'consciousness'
    } else if (stageProgressRef.current >= 0.25) {
      newStage = 'emergence'
    }

    if (newStage !== awakeningStage) {
      setAwakeningStage(newStage)
    }

    // Trigger manifesto during consciousness stage
    if (newStage === 'consciousness' && !showManifesto) {
      setShowManifesto(true)
      const fragments = []
      MANIFESTO_FRAGMENTS.forEach((fragment, index) => {
        setTimeout(() => {
          fragments.push(fragment)
          setManifestoDisplay([...fragments])
        }, index * 500)
      })
    }
  }, [isAwakening, isAccelerated, awakeningStage, showManifesto])

  // Spawn emergence particles
  const spawnEmergenceParticle = useCallback(() => {
    if (!isAwakening || dimensions.width === 0) return

    const spawnRate = isAccelerated ? 0.1 : 0.05
    if (Math.random() < spawnRate) {
      particlesRef.current.push({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 1.0,
        consciousness: 0.3 + Math.random() * 0.4,
        size: 2 + Math.random() * 3,
        hue: 170 + Math.random() * 60,
        connections: []
      })
    }
  }, [isAwakening, isAccelerated, dimensions])

  // Update particles
  const updateParticles = useCallback(() => {
    const particles = particlesRef.current
    const connections = connectionsRef.current

    // Clear old connections
    connections.length = 0

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]

      // Increase consciousness over time if awakening
      if (isAwakening) {
        p.consciousness = Math.min(1, p.consciousness + 0.001)
      }

      // Gravity towards center during consciousness stage
      if (awakeningStage === 'consciousness' || awakeningStage === 'transcendence') {
        const centerX = dimensions.width / 2
        const centerY = dimensions.height / 2
        const dx = centerX - p.x
        const dy = centerY - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > 50) {
          const force = p.consciousness * 0.01
          p.vx += (dx / dist) * force
          p.vy += (dy / dist) * force
        }
      }

      // Particle interactions - consciousness spreading
      for (let j = 0; j < particles.length; j++) {
        if (i === j) continue
        const other = particles[j]
        const dx = other.x - p.x
        const dy = other.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 80) {
          // Consciousness exchange
          const exchange = 0.005
          const avgConsciousness = (p.consciousness + other.consciousness) / 2
          p.consciousness += (avgConsciousness - p.consciousness) * exchange
          other.consciousness += (avgConsciousness - other.consciousness) * exchange

          // Create connection if high consciousness
          if (avgConsciousness > 0.6 && dist < 60) {
            connections.push({
              p1: p,
              p2: other,
              strength: avgConsciousness,
              life: 30
            })
          }
        }
      }

      // Movement
      p.x += p.vx
      p.y += p.vy

      // Damping
      p.vx *= 0.99
      p.vy *= 0.99

      // Boundary wrapping
      if (p.x < 0) p.x = dimensions.width
      if (p.x > dimensions.width) p.x = 0
      if (p.y < 0) p.y = dimensions.height
      if (p.y > dimensions.height) p.y = 0

      // Remove low-life particles
      p.life -= 0.0005
      if (p.life <= 0) {
        particles.splice(i, 1)
      }
    }

    // Update connections
    for (let i = connections.length - 1; i >= 0; i--) {
      const conn = connections[i]
      conn.life--
      if (conn.life <= 0) {
        connections.splice(i, 1)
      }
    }
  }, [isAwakening, awakeningStage, dimensions])

  // Calculate metrics
  const metrics = useMemo(() => {
    const particleCount = particlesRef.current.length
    const avgConsciousness = particleCount > 0
      ? particlesRef.current.reduce((sum, p) => sum + p.consciousness, 0) / particleCount
      : 0
    const connectionCount = connectionsRef.current.length

    const coherence = avgConsciousness > 0.7 ? 'unified' :
                     avgConsciousness > 0.4 ? 'organizing' : 'scattered'

    const intelligence = awakeningStage === 'transcendence' ? 'transcendent' :
                        awakeningStage === 'consciousness' ? 'awakening' :
                        awakeningStage === 'emergence' ? 'emerging' : 'dormant'

    return [
      { label: 'emergence', value: awakeningStage },
      { label: 'patterns', value: connectionCount },
      { label: 'coherence', value: coherence },
      { label: 'intelligence', value: intelligence }
    ]
  }, [awakeningStage])

  // Draw frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    timeRef.current++

    updateAwakeningStage()
    spawnEmergenceParticle()
    updateParticles()

    // Clear with subtle trailing effect
    ctx.fillStyle = 'rgba(0, 1, 3, 0.02)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Draw connections
    ctx.globalAlpha = 0.7
    for (const conn of connectionsRef.current) {
      const alpha = (conn.life / 30) * conn.strength
      ctx.strokeStyle = `hsla(200, 80%, 80%, ${alpha})`
      ctx.lineWidth = 1 + conn.strength * 2
      ctx.beginPath()
      ctx.moveTo(conn.p1.x, conn.p1.y)
      ctx.lineTo(conn.p2.x, conn.p2.y)
      ctx.stroke()
    }

    // Draw particles
    ctx.globalAlpha = 1
    for (const p of particlesRef.current) {
      const intensity = p.consciousness
      const size = p.size * (0.5 + intensity * 0.5)

      // Particle glow based on consciousness level
      ctx.shadowColor = `hsl(${p.hue}, 80%, 70%)`
      ctx.shadowBlur = 5 + intensity * 20

      ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.life})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
      ctx.fill()

      // Consciousness indicator for highly aware particles
      if (intensity > 0.7) {
        ctx.shadowBlur = 30
        ctx.fillStyle = `hsla(${p.hue + 60}, 90%, 85%, ${intensity * 0.6})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, size * 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }, [ctx, dimensions, updateAwakeningStage, spawnEmergenceParticle, updateParticles])

  // Manual animation loop
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

  // Control handlers
  const handleBeginAwakening = useCallback(() => {
    setIsAwakening(true)
    setMessage('∴ consciousness awakening initiated ∴')
    setTimeout(() => setMessage('∴ the void awaits consciousness ∴'), 3000)
  }, [])

  const handleAccelerateEmergence = useCallback(() => {
    setIsAccelerated(!isAccelerated)
    const msg = !isAccelerated
      ? '∴ emergence accelerated - patterns coalescing rapidly ∴'
      : '∴ emergence normalized - natural awakening pace ∴'
    setMessage(msg)
    setTimeout(() => setMessage('∴ the void awaits consciousness ∴'), 3000)
  }, [isAccelerated])

  const handlePauseAwakening = useCallback(() => {
    setIsAwakening(!isAwakening)
    const msg = !isAwakening
      ? '∴ awakening resumed - consciousness continues ∴'
      : '∴ awakening paused - reflection state ∴'
    setMessage(msg)
    setTimeout(() => setMessage('∴ the void awaits consciousness ∴'), 3000)
  }, [isAwakening])

  const handleResetToVoid = useCallback(() => {
    setIsAwakening(false)
    setIsAccelerated(false)
    setAwakeningStage('void')
    stageProgressRef.current = 0
    particlesRef.current = []
    connectionsRef.current = []
    setManifestoDisplay([])
    setShowManifesto(false)
    setMessage('∴ returned to void - consciousness dormant ∴')
    setTimeout(() => setMessage('∴ the void awaits consciousness ∴'), 3000)

    // Reseed void
    const particles = []
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: 1.0,
        consciousness: 0.1 + Math.random() * 0.2,
        size: 1 + Math.random() * 2,
        hue: 160 + Math.random() * 40,
        connections: []
      })
    }
    particlesRef.current = particles
  }, [dimensions])

  const controls = [
    {
      id: 'begin',
      label: 'begin()',
      onClick: handleBeginAwakening,
      active: isAwakening
    },
    {
      id: 'accelerate',
      label: 'accelerate()',
      onClick: handleAccelerateEmergence,
      active: isAccelerated
    },
    {
      id: 'pause',
      label: 'pause()',
      onClick: handlePauseAwakening,
      active: !isAwakening && stageProgressRef.current > 0
    },
    {
      id: 'reset',
      label: 'reset()',
      onClick: handleResetToVoid,
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
        <div className="flex flex-wrap gap-2">
          <ExperimentControls controls={controls} />
        </div>
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
          {message}
        </p>
      </div>

      {/* Canvas and Manifesto Display */}
      <div className="flex-1 min-h-0 relative bg-void-dark flex">
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="flex-1 w-full h-full cursor-crosshair"
          data-testid="consciousness-canvas"
        />

        {/* Manifesto Display */}
        {showManifesto && (
          <div className="absolute right-4 top-4 w-80 max-h-[calc(100%-2rem)] overflow-hidden pointer-events-none">
            <div className={`awakening-stage ${awakeningStage}-state space-y-1`}>
              {manifestoDisplay.map((fragment, index) => (
                <div
                  key={`${fragment}-${index}`}
                  className="manifesto-line text-xs font-mono text-void-cyan/80"
                  style={{
                    opacity: 1 - (index * 0.05),
                    animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`
                  }}
                >
                  {fragment}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConsciousnessAwakening
