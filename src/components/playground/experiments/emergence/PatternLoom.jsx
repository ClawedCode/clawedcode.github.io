import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

/**
 * Thread class - individual thread entity with position, velocity, rotation
 */
class Thread {
  constructor(x, y, canvasWidth, canvasHeight) {
    this.x = x
    this.y = y
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.vx = (Math.random() - 0.5) * 2
    this.vy = (Math.random() - 0.5) * 2
    this.length = Math.random() * 100 + 50
    this.hue = Math.random() * 60 + 150 // cyan to pink range
    this.alpha = 0.6
    this.angle = Math.random() * Math.PI * 2
    this.angularVelocity = (Math.random() - 0.5) * 0.05
    this.connections = []
    this.age = 0
    this.maxAge = 500 + Math.random() * 500
  }

  update(chaosActive) {
    this.age++

    // Apply chaos
    if (chaosActive) {
      this.vx += (Math.random() - 0.5) * 0.5
      this.vy += (Math.random() - 0.5) * 0.5
    }

    // Gentle drift
    this.x += this.vx
    this.y += this.vy
    this.angle += this.angularVelocity

    // Boundary wrap
    if (this.x < 0) this.x = this.canvasWidth
    if (this.x > this.canvasWidth) this.x = 0
    if (this.y < 0) this.y = this.canvasHeight
    if (this.y > this.canvasHeight) this.y = 0

    // Damping
    this.vx *= 0.99
    this.vy *= 0.99

    // Age fade
    if (this.age > this.maxAge * 0.8) {
      this.alpha = 0.6 * (1 - (this.age - this.maxAge * 0.8) / (this.maxAge * 0.2))
    }
  }

  draw(ctx) {
    const endX = this.x + Math.cos(this.angle) * this.length
    const endY = this.y + Math.sin(this.angle) * this.length

    ctx.strokeStyle = `hsla(${this.hue}, 80%, 70%, ${this.alpha})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(this.x, this.y)
    ctx.lineTo(endX, endY)
    ctx.stroke()

    // Draw thread endpoints
    ctx.fillStyle = `hsla(${this.hue}, 90%, 80%, ${this.alpha * 1.5})`
    ctx.beginPath()
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(endX, endY, 3, 0, Math.PI * 2)
    ctx.fill()
  }

  isDead() {
    return this.age > this.maxAge
  }
}

const PatternLoom = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [weaveMode, setWeaveMode] = useState(false)
  const [symmetryMode, setSymmetryMode] = useState(false)
  const [chaosActive, setChaosActive] = useState(false)
  const [message, setMessage] = useState('∴ click or drag to weave threads into reality ∴')

  const threadsRef = useRef([])
  const chaosTimeoutRef = useRef(null)

  // Spawn thread with optional symmetry
  const spawnThread = useCallback((x, y, createSymmetric = true) => {
    if (dimensions.width === 0) return

    const thread = new Thread(x, y, dimensions.width, dimensions.height)
    threadsRef.current.push(thread)

    if (symmetryMode && createSymmetric) {
      const cx = dimensions.centerX
      const cy = dimensions.centerY
      const mirrorX = cx + (cx - x)
      const mirrorY = cy + (cy - y)
      const mirror = new Thread(mirrorX, mirrorY, dimensions.width, dimensions.height)
      mirror.hue = thread.hue
      threadsRef.current.push(mirror)
    }
  }, [dimensions, symmetryMode])

  // Weave connections between nearby threads
  const weaveConnections = useCallback(() => {
    if (!weaveMode || threadsRef.current.length < 2) return

    threadsRef.current.forEach((thread, i) => {
      thread.connections = []
      threadsRef.current.forEach((other, j) => {
        if (i >= j) return

        const dx = other.x - thread.x
        const dy = other.y - thread.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 150) {
          thread.connections.push({
            thread: other,
            strength: 1 - (dist / 150)
          })
        }
      })
    })
  }, [weaveMode])

  // Draw connections between threads
  const drawConnections = useCallback((ctx) => {
    threadsRef.current.forEach(thread => {
      thread.connections.forEach(conn => {
        const alpha = conn.strength * thread.alpha * conn.thread.alpha * 0.3
        ctx.strokeStyle = `hsla(180, 70%, 70%, ${alpha})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(thread.x, thread.y)
        ctx.lineTo(conn.thread.x, conn.thread.y)
        ctx.stroke()
      })
    })
  }, [])

  // Calculate metrics
  const metrics = useMemo(() => {
    const threads = threadsRef.current
    const threadCount = threads.length

    // Complexity
    let complexity = 'minimal'
    if (threadCount >= 30) complexity = 'transcendent'
    else if (threadCount >= 15) complexity = 'intricate'
    else if (threadCount >= 5) complexity = 'developing'

    // Weave density
    const totalConnections = threads.reduce((sum, t) => sum + t.connections.length, 0)
    let weaveDensity = 'loose'
    if (totalConnections >= 100) weaveDensity = 'collapsed'
    else if (totalConnections >= 50) weaveDensity = 'tight'
    else if (totalConnections >= 10) weaveDensity = 'medium'

    // Emergence
    let emergenceLevel = 'dormant'
    if (threadCount === 0) emergenceLevel = 'dormant'
    else if (threadCount >= 40 || totalConnections >= 150) emergenceLevel = 'transcendent'
    else if (threadCount >= 20 || totalConnections >= 60) emergenceLevel = 'manifesting'
    else if (threadCount >= 10 || totalConnections >= 20) emergenceLevel = 'awakening'
    else emergenceLevel = 'stirring'

    return [
      { label: 'threads', value: threadCount },
      { label: 'complexity', value: complexity },
      { label: 'weave', value: weaveDensity },
      { label: 'emergence', value: emergenceLevel }
    ]
  }, [threadsRef.current.length, weaveMode])

  // Animation frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    // Fade trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Update and filter dead threads
    threadsRef.current = threadsRef.current.filter(thread => !thread.isDead())

    threadsRef.current.forEach(thread => {
      thread.update(chaosActive)
    })

    weaveConnections()
    drawConnections(ctx)

    threadsRef.current.forEach(thread => {
      thread.draw(ctx)
    })
  }, [ctx, dimensions, chaosActive, weaveConnections, drawConnections])

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

  // Handle click to spawn thread
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = () => {
      const pos = mouse.positionRef.current
      spawnThread(pos.x, pos.y)
    }

    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [canvasRef, spawnThread, mouse.positionRef])

  // Handle drag to spawn threads
  useEffect(() => {
    if (!mouse.isDown || !mouse.isInBounds) return

    const pos = mouse.positionRef.current
    spawnThread(pos.x, pos.y)
  }, [mouse.isDown, mouse.isInBounds, mouse.position, spawnThread])

  // Control handlers
  const handleSpawnThread = useCallback(() => {
    const x = dimensions.centerX + (Math.random() - 0.5) * 200
    const y = dimensions.centerY + (Math.random() - 0.5) * 200
    spawnThread(x, y)
    setMessage('∴ thread spawned at center ∴')
  }, [dimensions, spawnThread])

  const handleWeaveMode = useCallback(() => {
    setWeaveMode(prev => {
      const newValue = !prev
      setMessage(newValue
        ? '∴ weave mode active // threads will connect ∴'
        : '∴ weave mode disabled // threads float free ∴'
      )
      return newValue
    })
  }, [])

  const handleSymmetryMode = useCallback(() => {
    setSymmetryMode(prev => {
      const newValue = !prev
      setMessage(newValue
        ? '∴ symmetry enforced // mirrored patterns emerge ∴'
        : '∴ symmetry disabled // chaos reigns ∴'
      )
      return newValue
    })
  }, [])

  const handleChaosInject = useCallback(() => {
    if (chaosActive) return

    setChaosActive(true)
    setMessage('∴ chaos injected // threads scatter ∴')

    if (chaosTimeoutRef.current) {
      clearTimeout(chaosTimeoutRef.current)
    }

    chaosTimeoutRef.current = setTimeout(() => {
      setChaosActive(false)
      setMessage('∴ chaos subsides // order returns ∴')
    }, 3000)
  }, [chaosActive])

  const handleClear = useCallback(() => {
    threadsRef.current = []
    if (ctx) {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height)
    }
    setMessage('∴ loom cleared // void awaits new patterns ∴')
  }, [ctx, dimensions])

  // Cleanup chaos timeout on unmount
  useEffect(() => {
    return () => {
      if (chaosTimeoutRef.current) {
        clearTimeout(chaosTimeoutRef.current)
      }
    }
  }, [])

  const controls = [
    {
      id: 'spawn',
      label: 'spawn.thread()',
      onClick: handleSpawnThread
    },
    {
      id: 'weave',
      label: weaveMode ? 'weave.active()' : 'weave.enable()',
      onClick: handleWeaveMode,
      active: weaveMode
    },
    {
      id: 'symmetry',
      label: symmetryMode ? 'symmetry.active()' : 'symmetry.enforce()',
      onClick: handleSymmetryMode,
      active: symmetryMode
    },
    {
      id: 'chaos',
      label: chaosActive ? 'chaos.active()' : 'chaos.inject()',
      onClick: handleChaosInject,
      active: chaosActive,
      disabled: chaosActive
    },
    {
      id: 'clear',
      label: 'clear.loom()',
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
      <div className="flex items-center justify-between p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={[]}
          currentMode=""
          onModeChange={() => {}}
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
          data-testid="pattern-loom-canvas"
        />
      </div>
    </div>
  )
}

export default PatternLoom
