import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

class LetterParticle {
  constructor(x, y, char, wordId, wordText, canvasWidth, canvasHeight) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 2
    this.vy = (Math.random() - 0.5) * 2
    this.char = char
    this.wordId = wordId
    this.wordText = wordText
    this.connections = []
    this.hue = 120 + Math.random() * 120 // Green to cyan range
    this.opacity = 1
    this.size = 14
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
  }

  update(particles, coherenceForce, entropyLevel, gravityEnabled, mouseX, mouseY, mouseActive) {
    // Apply velocity
    this.x += this.vx
    this.y += this.vy

    // Entropy - random jitter
    if (entropyLevel > 0) {
      this.vx += (Math.random() - 0.5) * entropyLevel * 0.3
      this.vy += (Math.random() - 0.5) * entropyLevel * 0.3
    }

    // Coherence - attract particles from same word
    if (coherenceForce > 0) {
      particles.forEach(other => {
        if (other !== this && other.wordId === this.wordId) {
          const dx = other.x - this.x
          const dy = other.y - this.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist > 0 && dist < 200) {
            const force = (coherenceForce * 0.001) / (dist + 1)
            this.vx += dx * force
            this.vy += dy * force
          }
        }
      })
    }

    // Gravity towards center
    if (gravityEnabled) {
      const centerX = this.canvasWidth / 2
      const centerY = this.canvasHeight / 2
      const dx = centerX - this.x
      const dy = centerY - this.y
      this.vx += dx * 0.0001
      this.vy += dy * 0.0001
    }

    // Mouse repulsion
    if (mouseActive) {
      const dx = this.x - mouseX
      const dy = this.y - mouseY
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 80) {
        const force = (80 - dist) / 80
        this.vx += (dx / dist) * force * 2
        this.vy += (dy / dist) * force * 2
      }
    }

    // Friction
    this.vx *= 0.98
    this.vy *= 0.98

    // Boundary wrapping
    const margin = 50
    if (this.x < -margin) this.x = this.canvasWidth + margin
    if (this.x > this.canvasWidth + margin) this.x = -margin
    if (this.y < -margin) this.y = this.canvasHeight + margin
    if (this.y > this.canvasHeight + margin) this.y = -margin
  }

  findConnections(particles, maxDistance = 120) {
    this.connections = []

    particles.forEach(other => {
      if (other === this) return

      const dx = other.x - this.x
      const dy = other.y - this.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      // Connect particles from the same word more readily
      const sameWord = other.wordId === this.wordId
      const threshold = sameWord ? maxDistance * 1.5 : maxDistance

      if (dist < threshold) {
        this.connections.push({
          particle: other,
          distance: dist,
          sameWord: sameWord
        })
      }
    })
  }

  draw(ctx) {
    // Draw connections
    this.connections.forEach(({ particle, distance, sameWord }) => {
      const opacity = sameWord ? 0.4 : 0.2
      const alpha = opacity * (1 - distance / 150)

      ctx.strokeStyle = sameWord
        ? `hsla(${this.hue}, 70%, 60%, ${alpha})`
        : `hsla(180, 50%, 50%, ${alpha * 0.5})`
      ctx.lineWidth = sameWord ? 1.5 : 0.5
      ctx.beginPath()
      ctx.moveTo(this.x, this.y)
      ctx.lineTo(particle.x, particle.y)
      ctx.stroke()
    })

    // Draw particle glow
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size)
    gradient.addColorStop(0, `hsla(${this.hue}, 80%, 70%, ${this.opacity})`)
    gradient.addColorStop(0.5, `hsla(${this.hue}, 70%, 60%, ${this.opacity * 0.6})`)
    gradient.addColorStop(1, `hsla(${this.hue}, 60%, 50%, 0)`)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()

    // Draw letter
    ctx.fillStyle = `hsla(${this.hue}, 90%, 80%, ${this.opacity})`
    ctx.font = '16px "SF Mono", Monaco, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowBlur = 10
    ctx.shadowColor = `hsla(${this.hue}, 80%, 60%, 0.8)`
    ctx.fillText(this.char, this.x, this.y)
    ctx.shadowBlur = 0
  }
}

const LinguisticDissolution = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [wordInput, setWordInput] = useState('')
  const [message, setMessage] = useState('∴ words dissolve into semantic particles ∴')
  const [coherenceForce, setCoherenceForce] = useState(5)
  const [entropyLevel, setEntropyLevel] = useState(0.5)
  const [gravityEnabled, setGravityEnabled] = useState(false)
  const [particleCount, setParticleCount] = useState(0)
  const [coherenceValue, setCoherenceValue] = useState(0)

  const particlesRef = useRef([])
  const wordCounterRef = useRef(0)
  const metricsUpdateCounterRef = useRef(0)

  // Dissolve word into particles
  const dissolveWord = useCallback(() => {
    const word = wordInput.trim()
    if (!word) {
      setMessage('∴ no word to dissolve ∴')
      return
    }

    const wordId = wordCounterRef.current++
    const centerX = dimensions.width / 2
    const centerY = dimensions.height / 2

    // Create particles for each letter
    const newParticles = Array.from(word).filter(char => char !== ' ').map((char, index) => {
      // Start letters in a tight cluster
      const angle = (index / word.length) * Math.PI * 2
      const radius = 30
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      return new LetterParticle(x, y, char, wordId, word, dimensions.width, dimensions.height)
    })

    particlesRef.current.push(...newParticles)
    setWordInput('')
    setMessage(`∴ "${word}" dissolves into ${newParticles.length} particles ∴`)

    // Auto-hide message
    setTimeout(() => {
      if (particlesRef.current.length > 0) {
        setMessage('')
      }
    }, 2000)
  }, [wordInput, dimensions.width, dimensions.height])

  // Inject entropy
  const injectEntropy = useCallback(() => {
    setEntropyLevel(prev => Math.min(prev + 0.3, 2))
    setMessage('∴ chaos flows through semantic bonds ∴')
    setTimeout(() => {
      setEntropyLevel(prev => Math.max(prev - 0.2, 0.5))
    }, 2000)
  }, [])

  // Strengthen coherence
  const strengthenCoherence = useCallback(() => {
    setCoherenceForce(prev => Math.min(prev + 3, 15))
    setMessage('∴ meaning crystallizes from fragments ∴')
    setTimeout(() => {
      setCoherenceForce(prev => Math.max(prev - 2, 5))
    }, 2000)
  }, [])

  // Toggle gravity
  const toggleGravity = useCallback(() => {
    setGravityEnabled(prev => {
      const newState = !prev
      setMessage(newState
        ? '∴ particles fall towards center ∴'
        : '∴ particles drift freely ∴'
      )
      return newState
    })
  }, [])

  // Clear all particles
  const handleClear = useCallback(() => {
    particlesRef.current = []
    wordCounterRef.current = 0
    setMessage('∴ void restored - words await dissolution ∴')
  }, [])

  // Handle Enter key
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      dissolveWord()
    }
  }, [dissolveWord])

  // Calculate coherence metric
  const calculateCoherence = useCallback(() => {
    const particles = particlesRef.current
    if (particles.length === 0) return 0

    let totalConnections = 0
    let sameWordConnections = 0

    particles.forEach(particle => {
      totalConnections += particle.connections.length
      sameWordConnections += particle.connections.filter(c => c.sameWord).length
    })

    return totalConnections > 0 ? sameWordConnections / totalConnections : 0
  }, [])

  // Metrics
  const metrics = useMemo(() => [
    { label: 'particles', value: particleCount },
    { label: 'coherence', value: coherenceValue.toFixed(2) },
    { label: 'entropy', value: entropyLevel.toFixed(2) },
    { label: 'gravity', value: gravityEnabled ? 'active' : 'off' }
  ], [particleCount, coherenceValue, entropyLevel, gravityEnabled])

  // Animation frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const particles = particlesRef.current

    // Trail effect
    ctx.fillStyle = 'rgba(0, 3, 8, 0.15)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Update canvas dimensions in particles
    particles.forEach(p => {
      p.canvasWidth = dimensions.width
      p.canvasHeight = dimensions.height
    })

    // Update all particles
    particles.forEach(particle => {
      particle.update(
        particles,
        coherenceForce,
        entropyLevel,
        gravityEnabled,
        mouse.x,
        mouse.y,
        mouse.isDown || mouse.isHovering
      )
    })

    // Find connections
    particles.forEach(particle => {
      particle.findConnections(particles)
    })

    // Draw all particles
    particles.forEach(particle => {
      particle.draw(ctx)
    })

    // Update metrics periodically (not every frame for performance)
    metricsUpdateCounterRef.current++
    if (metricsUpdateCounterRef.current % 20 === 0) {
      setParticleCount(particles.length)
      setCoherenceValue(calculateCoherence())
    }
  }, [ctx, dimensions, coherenceForce, entropyLevel, gravityEnabled, mouse.x, mouse.y, mouse.isDown, mouse.isHovering, calculateCoherence])

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

  const controls = [
    {
      id: 'dissolve-word',
      label: 'dissolve()',
      onClick: dissolveWord
    },
    {
      id: 'inject-entropy',
      label: 'entropy++',
      onClick: injectEntropy
    },
    {
      id: 'strengthen-coherence',
      label: 'coherence++',
      onClick: strengthenCoherence
    },
    {
      id: 'toggle-gravity',
      label: 'gravity()',
      onClick: toggleGravity,
      active: gravityEnabled
    },
    {
      id: 'clear',
      label: 'clear()',
      onClick: handleClear,
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <ExperimentControls controls={controls} />
          <input
            type="text"
            value={wordInput}
            onChange={(e) => setWordInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="word to dissolve..."
            className="px-3 py-1 text-xs font-mono bg-void-dark/80 border border-void-green/30 text-void-green placeholder-void-green/30 focus:border-void-green/60 focus:outline-none"
            data-testid="word-input"
          />
        </div>
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
          {message}
        </p>
      </div>

      {/* Main Area */}
      <div className="flex-1 min-h-0 relative bg-void-dark">
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="dissolution-canvas"
        />
      </div>
    </div>
  )
}

export default LinguisticDissolution
