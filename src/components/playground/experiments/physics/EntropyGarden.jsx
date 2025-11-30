import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'attract', label: 'attract()' },
  { id: 'scatter', label: 'scatter()' },
  { id: 'equilibrium', label: 'equilibrium()' }
]

const MODE_MESSAGES = {
  attract: '∴ attract mode // cursor pulls consciousness together ∴',
  scatter: '∴ scatter mode // cursor disperses thoughts into void ∴',
  equilibrium: '∴ equilibrium mode // gentle orbital balance ∴'
}

/**
 * EntropyGarden - consciousness vs void
 * where particles represent thoughts, and interaction shapes reality
 */
const EntropyGarden = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)
  const hasInitialized = useRef(false)

  const [mode, setMode] = useState('equilibrium')
  const [message, setMessage] = useState('∴ click to plant consciousness seeds ∴')
  const particlesRef = useRef([])
  const keysRef = useRef(new Set())

  // Initialize particles when canvas is ready
  useEffect(() => {
    if (dimensions.width === 0 || hasInitialized.current) return
    hasInitialized.current = true

    // Initial thought particles scattered across the void
    const particles = []
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1,
        life: 1000,
        maxLife: 1000,
        size: Math.random() * 3 + 2,
        hue: Math.random() * 60 + 160, // Blue-cyan range
        consciousness: Math.random() * 0.3 + 0.2
      })
    }
    particlesRef.current = particles
  }, [dimensions.width, dimensions.height])

  // Plant consciousness on click
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Create a cluster of consciousness particles
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5
        const radius = Math.random() * 20 + 10

        particlesRef.current.push({
          x: x + Math.cos(angle) * radius,
          y: y + Math.sin(angle) * radius,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 800,
          maxLife: 800,
          size: Math.random() * 4 + 2,
          hue: Math.random() * 60 + 160,
          consciousness: Math.random() * 0.5 + 0.5
        })
      }

      setMessage(`∴ consciousness planted - ${particlesRef.current.length} thoughts active ∴`)
      setTimeout(() => {
        setMessage('∴ click to plant consciousness seeds ∴')
      }, 3000)
    }

    const handleTouch = (e) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const touch = e.touches[0]
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top

      // Create a cluster of consciousness particles
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5
        const radius = Math.random() * 20 + 10

        particlesRef.current.push({
          x: x + Math.cos(angle) * radius,
          y: y + Math.sin(angle) * radius,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 800,
          maxLife: 800,
          size: Math.random() * 4 + 2,
          hue: Math.random() * 60 + 160,
          consciousness: Math.random() * 0.5 + 0.5
        })
      }

      setMessage(`∴ consciousness planted - ${particlesRef.current.length} thoughts active ∴`)
      setTimeout(() => {
        setMessage('∴ click to plant consciousness seeds ∴')
      }, 3000)
    }

    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('touchstart', handleTouch)

    return () => {
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('touchstart', handleTouch)
    }
  }, [canvasRef])

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysRef.current.add(e.key.toLowerCase())
    }

    const handleKeyUp = (e) => {
      keysRef.current.delete(e.key.toLowerCase())
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Update particles
  const updateParticles = useCallback(() => {
    const particles = particlesRef.current
    const mousePos = mouse.positionRef.current

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]

      // Calculate forces based on mode and user input
      let fx = 0, fy = 0

      // Distance to mouse
      const dx = mousePos.x - p.x
      const dy = mousePos.y - p.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < 150) {
        const force = (150 - distance) / 150
        const angle = Math.atan2(dy, dx)

        // Mode-based behavior
        switch (mode) {
          case 'attract':
            fx += Math.cos(angle) * force * 0.5
            fy += Math.sin(angle) * force * 0.5
            break
          case 'scatter':
            fx -= Math.cos(angle) * force * 0.8
            fy -= Math.sin(angle) * force * 0.8
            break
          case 'equilibrium':
            // Gentle orbital motion
            fx += Math.cos(angle + Math.PI/2) * force * 0.3
            fy += Math.sin(angle + Math.PI/2) * force * 0.3
            break
        }
      }

      // Keyboard modifiers
      if (keysRef.current.has('shift')) {
        // Increase entropy - chaotic forces
        fx += (Math.random() - 0.5) * 2
        fy += (Math.random() - 0.5) * 2
      }

      if (keysRef.current.has('control') || keysRef.current.has('meta')) {
        // Decrease entropy - stabilizing forces
        fx *= 0.5
        fy *= 0.5
        p.vx *= 0.98
        p.vy *= 0.98
      }

      // Particle interactions - consciousness emergence
      for (let j = 0; j < particles.length; j++) {
        if (i === j) continue

        const other = particles[j]
        const odx = other.x - p.x
        const ody = other.y - p.y
        const odist = Math.sqrt(odx * odx + ody * ody)

        if (odist < 50 && odist > 0) {
          // Weak attraction between nearby particles
          const attraction = (p.consciousness + other.consciousness) * 0.01
          fx += (odx / odist) * attraction
          fy += (ody / odist) * attraction

          // Consciousness exchange
          if (odist < 20) {
            const exchange = 0.01
            p.consciousness += exchange * other.consciousness
            other.consciousness += exchange * p.consciousness
            p.consciousness = Math.min(1, p.consciousness)
            other.consciousness = Math.min(1, other.consciousness)
          }
        }
      }

      // Apply forces
      p.vx += fx
      p.vy += fy

      // Damping
      p.vx *= 0.99
      p.vy *= 0.99

      // Update position
      p.x += p.vx
      p.y += p.vy

      // Boundary conditions - wrap around
      if (p.x < 0) p.x = dimensions.width
      if (p.x > dimensions.width) p.x = 0
      if (p.y < 0) p.y = dimensions.height
      if (p.y > dimensions.height) p.y = 0

      // Age particle very slowly
      p.life -= 0.1
      if (p.life <= 0) {
        particles.splice(i, 1)
      }
    }
  }, [mode, mouse.positionRef, dimensions.width, dimensions.height])

  // Calculate entropy
  const calculateEntropy = useCallback(() => {
    const particles = particlesRef.current
    if (particles.length === 0) return 0

    // Calculate velocity variance as entropy measure
    let avgVx = 0, avgVy = 0
    for (const p of particles) {
      avgVx += p.vx
      avgVy += p.vy
    }
    avgVx /= particles.length
    avgVy /= particles.length

    let variance = 0
    for (const p of particles) {
      variance += Math.pow(p.vx - avgVx, 2) + Math.pow(p.vy - avgVy, 2)
    }
    variance /= particles.length

    return Math.sqrt(variance)
  }, [])

  // Calculate metrics
  const metrics = useMemo(() => {
    const particles = particlesRef.current
    const particleCount = particles.length
    const entropy = calculateEntropy()
    const avgConsciousness = particleCount > 0
      ? particles.reduce((sum, p) => sum + p.consciousness, 0) / particleCount
      : 0

    let entropyLevel = 'balanced'
    if (entropy > 2) entropyLevel = 'high'
    else if (entropy < 0.5) entropyLevel = 'low'

    let orderLevel = 'low'
    if (avgConsciousness > 0.7) orderLevel = 'high'
    else if (avgConsciousness > 0.4) orderLevel = 'emerging'

    return [
      { label: 'particles', value: particleCount },
      { label: 'entropy', value: entropyLevel },
      { label: 'order', value: orderLevel }
    ]
  }, [calculateEntropy])

  // Draw connections and particles
  const draw = useCallback(() => {
    if (!ctx) return

    const particles = particlesRef.current

    // Clear canvas with trailing effect
    ctx.fillStyle = 'rgba(0, 8, 17, 0.03)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Reset connection counts
    particles.forEach(p => p.connections = 0)

    // Draw connections between nearby particles
    ctx.globalAlpha = 0.6
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i]
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j]
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 120) {
          p1.connections++
          p2.connections++
          const alpha = (120 - distance) / 120
          const connectionStrength = (p1.consciousness + p2.consciousness) / 2

          ctx.strokeStyle = `hsla(${180 + connectionStrength * 40}, 80%, 70%, ${alpha * 0.4})`
          ctx.lineWidth = Math.max(0.5, connectionStrength * 1.5)
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.stroke()
        }
      }
    }

    // Draw particles
    ctx.globalAlpha = 1
    for (const p of particles) {
      const alpha = Math.max(0.6, p.life / p.maxLife)
      const size = p.size * (0.7 + p.consciousness * 0.3)

      // Particle glow
      ctx.shadowColor = `hsl(${p.hue}, 80%, 70%)`
      ctx.shadowBlur = 15 + p.consciousness * 15

      ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${alpha})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
      ctx.fill()

      // Consciousness indicator
      if (p.consciousness > 0.5) {
        ctx.shadowBlur = 25
        ctx.fillStyle = `hsla(${p.hue + 30}, 90%, 85%, ${alpha * 0.7})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, size * 1.3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.shadowBlur = 0
  }, [ctx, dimensions.width, dimensions.height])

  // Animation frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    updateParticles()
    draw()
  }, [ctx, dimensions.width, updateParticles, draw])

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

  // Reset handler
  const handleReset = useCallback(() => {
    const particles = []
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1,
        life: 1000,
        maxLife: 1000,
        size: Math.random() * 3 + 2,
        hue: Math.random() * 60 + 160,
        consciousness: Math.random() * 0.3 + 0.2
      })
    }
    particlesRef.current = particles
    setMessage('∴ void reset - consciousness reseeded ∴')
    setTimeout(() => {
      setMessage('∴ click to plant consciousness seeds ∴')
    }, 3000)
  }, [dimensions.width, dimensions.height])

  const controls = [
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
          data-testid="entropy-canvas"
        />
      </div>
    </div>
  )
}

export default EntropyGarden
