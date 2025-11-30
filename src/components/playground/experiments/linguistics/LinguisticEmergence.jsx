import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

// Language primitives by mode
const PHONEMES = ['m', 'n', 'p', 't', 'k', 's', 'a', 'e', 'i', 'o', 'u', 'l', 'r', 'w', 'y']
const WORDS = ['void', 'cat', 'code', 'purr', 'meow', 'claw', 'liminal', 'emerge', 'echo', 'glitch']
const SYNTAX = ['[', ']', '{', '}', '(', ')', '<', '>', '/', '\\', '-', '+', '=', '*']

const MODES = [
  { id: 'phonemes', label: 'phoneme.clusters()' },
  { id: 'words', label: 'word.formation()' },
  { id: 'syntax', label: 'syntax.patterns()' }
]

const MODE_MESSAGES = {
  phonemes: '∴ phonemes coalesce into proto-words // m, n, p, t... ∴',
  words: '∴ words cluster into meaning networks // void, cat, code... ∴',
  syntax: '∴ syntax patterns emerge from chaos // [, ], {, }... ∴'
}

const SYMBOL_SETS = {
  phonemes: PHONEMES,
  words: WORDS,
  syntax: SYNTAX
}

/**
 * Particle class with linguistic symbols
 */
class Particle {
  constructor(x, y, symbol, mode, width, height) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 2
    this.vy = (Math.random() - 0.5) * 2
    this.symbol = symbol
    this.mode = mode
    this.size = mode === 'phonemes' ? 8 : mode === 'words' ? 12 : 10
    this.connections = []
    this.clusterId = null
    this.energy = 1.0
    this.hue = Math.random() * 60 + 270 // Purple to magenta range
    this.width = width
    this.height = height
  }

  update(particles) {
    // Apply physics
    this.vx *= 0.98
    this.vy *= 0.98

    // Boundary wrapping
    this.x = (this.x + this.vx + this.width) % this.width
    this.y = (this.y + this.vy + this.height) % this.height

    // Attraction to nearby particles (linguistic clustering)
    this.connections = []
    const attractionRadius = this.mode === 'phonemes' ? 80 : this.mode === 'words' ? 120 : 100

    for (let other of particles) {
      if (other === this) continue

      const dx = other.x - this.x
      const dy = other.y - this.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < attractionRadius) {
        this.connections.push(other)

        // Attraction force
        const force = 0.02 * (1 - dist / attractionRadius)
        this.vx += (dx / dist) * force
        this.vy += (dy / dist) * force
      }
    }

    // Energy decay
    this.energy *= 0.9995
  }

  draw(ctx) {
    // Draw connections
    ctx.strokeStyle = `hsla(${this.hue}, 70%, 60%, ${0.1 * this.energy})`
    ctx.lineWidth = 0.5

    for (let other of this.connections) {
      ctx.beginPath()
      ctx.moveTo(this.x, this.y)
      ctx.lineTo(other.x, other.y)
      ctx.stroke()
    }

    // Draw particle
    const alpha = 0.3 + (0.7 * this.energy)
    ctx.fillStyle = `hsla(${this.hue}, 80%, 70%, ${alpha})`
    ctx.font = `${this.size}px 'Courier New'`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Glow effect for high-connection particles
    if (this.connections.length > 3) {
      ctx.shadowBlur = 10
      ctx.shadowColor = `hsla(${this.hue}, 80%, 70%, 0.5)`
    }

    ctx.fillText(this.symbol, this.x, this.y)
    ctx.shadowBlur = 0
  }
}

const LinguisticEmergence = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)
  const hasInitialized = useRef(false)

  const [mode, setMode] = useState('phonemes')
  const [paused, setPaused] = useState(false)
  const [message, setMessage] = useState(MODE_MESSAGES.phonemes)

  const particlesRef = useRef([])
  const clustersRef = useRef([])

  // Initialize particles
  const initParticles = useCallback(() => {
    if (dimensions.width === 0) return

    const symbolSet = SYMBOL_SETS[mode]
    const count = mode === 'words' ? 30 : 50

    particlesRef.current = []
    for (let i = 0; i < count; i++) {
      const x = Math.random() * dimensions.width
      const y = Math.random() * dimensions.height
      const symbol = symbolSet[Math.floor(Math.random() * symbolSet.length)]
      particlesRef.current.push(new Particle(x, y, symbol, mode, dimensions.width, dimensions.height))
    }
  }, [mode, dimensions.width, dimensions.height])

  // Initialize on mount
  useEffect(() => {
    if (dimensions.width === 0) return
    if (hasInitialized.current) return

    hasInitialized.current = true
    initParticles()
  }, [dimensions.width, initParticles])

  // Reinitialize when mode changes
  useEffect(() => {
    if (!hasInitialized.current) return
    initParticles()
  }, [mode, initParticles])

  // Cluster detection (emergence metric)
  const detectClusters = useCallback(() => {
    const clusters = []
    const visited = new Set()

    for (let particle of particlesRef.current) {
      if (visited.has(particle)) continue

      if (particle.connections.length >= 2) {
        const cluster = [particle]
        const queue = [particle]
        visited.add(particle)

        while (queue.length > 0) {
          const current = queue.shift()

          for (let connected of current.connections) {
            if (!visited.has(connected)) {
              visited.add(connected)
              cluster.push(connected)
              queue.push(connected)
            }
          }
        }

        if (cluster.length >= 3) {
          clusters.push(cluster)
        }
      }
    }

    clustersRef.current = clusters
    return clusters
  }, [])

  // Calculate coherence (how organized the system is)
  const calculateCoherence = useCallback(() => {
    const particles = particlesRef.current
    if (particles.length === 0) return 0

    const avgConnections = particles.reduce((sum, p) => sum + p.connections.length, 0) / particles.length
    return Math.min(100, (avgConnections / 5) * 100)
  }, [])

  // Spawn particles at location
  const spawnParticles = useCallback((x, y, count = 5) => {
    const symbolSet = SYMBOL_SETS[mode]

    for (let i = 0; i < count; i++) {
      const symbol = symbolSet[Math.floor(Math.random() * symbolSet.length)]
      particlesRef.current.push(new Particle(
        x + (Math.random() - 0.5) * 20,
        y + (Math.random() - 0.5) * 20,
        symbol,
        mode,
        dimensions.width,
        dimensions.height
      ))
    }
  }, [mode, dimensions.width, dimensions.height])

  // Handle canvas click
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      spawnParticles(x, y)
    }

    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [canvasRef, spawnParticles])

  // Calculate metrics
  const metrics = useMemo(() => {
    const particles = particlesRef.current
    const clusters = clustersRef.current

    const emergenceLevel = Math.min(100, (clusters.length / 5) * 100)
    const coherence = calculateCoherence()

    return [
      { label: 'particles', value: particles.length },
      { label: 'clusters', value: clusters.length },
      { label: 'emergence', value: `${Math.round(emergenceLevel)}%` },
      { label: 'coherence', value: `${Math.round(coherence)}%` }
    ]
  }, [calculateCoherence])

  // Animation frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0 || paused) return

    // Clear with trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Update and draw particles
    const particles = particlesRef.current
    for (let particle of particles) {
      particle.update(particles)
      particle.draw(ctx)
    }

    // Remove low-energy particles
    particlesRef.current = particles.filter(p => p.energy > 0.1)

    // Spawn new particles occasionally
    if (Math.random() < 0.01 && particles.length < 100) {
      const symbolSet = SYMBOL_SETS[mode]
      const symbol = symbolSet[Math.floor(Math.random() * symbolSet.length)]
      particlesRef.current.push(new Particle(
        Math.random() * dimensions.width,
        Math.random() * dimensions.height,
        symbol,
        mode,
        dimensions.width,
        dimensions.height
      ))
    }

    // Detect emergence
    detectClusters()
  }, [ctx, dimensions.width, dimensions.height, paused, mode, detectClusters])

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

  // Mode change handler
  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    setMessage(MODE_MESSAGES[newMode])
  }, [])

  // Control handlers
  const handleReset = useCallback(() => {
    hasInitialized.current = false
    setPaused(false)
    setMode('phonemes')
    setMessage('∴ system reset // void awaits new language ∴')
    setTimeout(() => {
      hasInitialized.current = true
      initParticles()
    }, 0)
  }, [initParticles])

  const handlePause = useCallback(() => {
    setPaused(prev => {
      const newPaused = !prev
      setMessage(newPaused
        ? '∴ time frozen // particles suspended ∴'
        : '∴ time flows // emergence continues ∴'
      )
      return newPaused
    })
  }, [])

  const handleSpawn = useCallback(() => {
    const symbolSet = SYMBOL_SETS[mode]
    for (let i = 0; i < 10; i++) {
      const symbol = symbolSet[Math.floor(Math.random() * symbolSet.length)]
      particlesRef.current.push(new Particle(
        Math.random() * dimensions.width,
        Math.random() * dimensions.height,
        symbol,
        mode,
        dimensions.width,
        dimensions.height
      ))
    }
    setMessage('∴ particles spawned // system enriched ∴')
  }, [mode, dimensions.width, dimensions.height])

  const controls = [
    {
      id: 'pause',
      label: paused ? 'resume()' : 'pause()',
      onClick: handlePause,
      active: paused
    },
    {
      id: 'spawn',
      label: 'spawn.burst()',
      onClick: handleSpawn
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
          data-testid="linguistic-canvas"
        />
      </div>
    </div>
  )
}

export default LinguisticEmergence
