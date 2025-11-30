import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

class TextParticle {
  constructor(char, index, total, width, height, mode) {
    this.char = char
    this.baseSize = 20 + Math.random() * 40
    this.size = this.baseSize
    this.rotation = Math.random() * Math.PI * 2
    this.rotationSpeed = (Math.random() - 0.5) * 0.02

    this.hue = (index / total) * 360
    this.saturation = 70 + Math.random() * 30
    this.lightness = 50 + Math.random() * 20
    this.alpha = 0.8 + Math.random() * 0.2

    this.x = width / 2
    this.y = height / 2
    this.vx = 0
    this.vy = 0

    this.targetX = this.x
    this.targetY = this.y

    this.initPosition(index, total, width, height, mode)
  }

  initPosition(index, total, width, height, mode) {
    const modes = {
      scatter: () => {
        this.targetX = Math.random() * width
        this.targetY = Math.random() * height
      },
      grid: () => {
        const cols = Math.ceil(Math.sqrt(total))
        const cellWidth = width / cols
        const cellHeight = height / Math.ceil(total / cols)
        const col = index % cols
        const row = Math.floor(index / cols)
        this.targetX = col * cellWidth + cellWidth / 2
        this.targetY = row * cellHeight + cellHeight / 2
      },
      flow: () => {
        const t = index / total
        const angle = t * Math.PI * 4
        const radius = t * Math.min(width, height) * 0.4
        this.targetX = width / 2 + Math.cos(angle) * radius
        this.targetY = height / 2 + Math.sin(angle) * radius
      },
      orbit: () => {
        const angle = (index / total) * Math.PI * 2
        const radius = Math.min(width, height) * 0.3
        this.targetX = width / 2 + Math.cos(angle) * radius
        this.targetY = height / 2 + Math.sin(angle) * radius
      }
    }

    modes[mode]()
  }

  update(isAnimating) {
    const dx = this.targetX - this.x
    const dy = this.targetY - this.y

    this.vx += dx * 0.01
    this.vy += dy * 0.01

    this.vx *= 0.92
    this.vy *= 0.92

    this.x += this.vx
    this.y += this.vy

    this.rotation += this.rotationSpeed

    if (isAnimating) {
      this.size = this.baseSize + Math.sin(Date.now() * 0.003 + this.hue) * 10
      this.rotationSpeed = Math.sin(Date.now() * 0.002) * 0.05
    }
  }

  draw(ctx, isAnimating) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)

    ctx.font = `${this.size}px "SF Mono", Monaco, monospace`
    ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${this.alpha})`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const glowSize = isAnimating ? 20 : 10
    ctx.shadowBlur = glowSize
    ctx.shadowColor = `hsl(${this.hue}, ${this.saturation}%, ${this.lightness}%)`

    ctx.fillText(this.char, 0, 0)

    ctx.restore()
  }
}

const VisualLanguage = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [textInput, setTextInput] = useState('form / pattern / void')
  const [currentMode, setCurrentMode] = useState('scatter')
  const [isAnimating, setIsAnimating] = useState(false)
  const [message, setMessage] = useState('∴ enter text to dissolve meaning ∴')

  const particlesRef = useRef([])

  // Calculate metrics
  const metrics = useMemo(() => {
    const particles = particlesRef.current

    if (particles.length === 0) {
      return [
        { label: 'patterns', value: 0 },
        { label: 'density', value: '0.00' },
        { label: 'entropy', value: '0.00' }
      ]
    }

    const avgDist = particles.reduce((sum, p) => {
      const dx = p.x - dimensions.centerX
      const dy = p.y - dimensions.centerY
      return sum + Math.sqrt(dx * dx + dy * dy)
    }, 0) / particles.length

    const density = (avgDist / Math.max(dimensions.width, dimensions.height)).toFixed(2)

    const entropy = (particles.reduce((sum, p) => {
      return sum + Math.abs(p.vx) + Math.abs(p.vy)
    }, 0) / particles.length / 10).toFixed(2)

    return [
      { label: 'patterns', value: particles.length },
      { label: 'density', value: density },
      { label: 'entropy', value: entropy }
    ]
  }, [particlesRef.current.length, dimensions.width, dimensions.height, dimensions.centerX, dimensions.centerY])

  // Create particles from text
  const createParticles = useCallback((text) => {
    if (!text || dimensions.width === 0) return

    const chars = text.split('')
    const newParticles = []

    chars.forEach((char, i) => {
      if (char.trim()) {
        newParticles.push(new TextParticle(char, i, chars.length, dimensions.width, dimensions.height, currentMode))
      }
    })

    particlesRef.current = newParticles
    setMessage(`dissolving: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`)
  }, [dimensions.width, dimensions.height, currentMode])

  // Initialize particles on mount
  useEffect(() => {
    if (dimensions.width > 0 && particlesRef.current.length === 0) {
      createParticles('form / pattern / void')
    }
  }, [dimensions.width, createParticles])

  // Handle mode change
  const handleModeChange = useCallback((mode) => {
    setCurrentMode(mode)
    const particles = particlesRef.current
    particles.forEach((p, i) => {
      p.initPosition(i, particles.length, dimensions.width, dimensions.height, mode)
    })
    setMessage(`layout mode: ${mode}`)
  }, [dimensions.width, dimensions.height])

  // Handle text input
  const handleTextInput = useCallback((e) => {
    const value = e.target.value
    setTextInput(value)
  }, [])

  // Handle text submit
  const handleTextSubmit = useCallback(() => {
    if (textInput.trim()) {
      createParticles(textInput)
    }
  }, [textInput, createParticles])

  // Handle morph toggle
  const handleMorphToggle = useCallback(() => {
    setIsAnimating(prev => {
      const newState = !prev
      setMessage(newState ? 'morphing active' : 'morphing suspended')
      return newState
    })
  }, [])

  // Handle reset
  const handleReset = useCallback(() => {
    particlesRef.current = []
    setTextInput('')
    setIsAnimating(false)
    setCurrentMode('scatter')
    setMessage('∴ enter text to dissolve meaning ∴')
  }, [])

  // Animation frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    // Trail effect
    ctx.fillStyle = 'rgba(0, 2, 5, 0.15)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const particles = particlesRef.current
    particles.forEach(p => {
      p.update(isAnimating)
      p.draw(ctx, isAnimating)
    })
  }, [ctx, dimensions.width, dimensions.height, isAnimating])

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
      id: 'mode-scatter',
      label: 'scatter',
      onClick: () => handleModeChange('scatter'),
      active: currentMode === 'scatter'
    },
    {
      id: 'mode-grid',
      label: 'grid',
      onClick: () => handleModeChange('grid'),
      active: currentMode === 'grid'
    },
    {
      id: 'mode-flow',
      label: 'flow',
      onClick: () => handleModeChange('flow'),
      active: currentMode === 'flow'
    },
    {
      id: 'mode-orbit',
      label: 'orbit',
      onClick: () => handleModeChange('orbit'),
      active: currentMode === 'orbit'
    },
    {
      id: 'morph',
      label: 'morph()',
      onClick: handleMorphToggle,
      active: isAnimating
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls controls={controls} />

        {/* Text Input */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={textInput}
            onChange={handleTextInput}
            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
            placeholder="enter text to dissolve..."
            className="flex-1 sm:w-64 bg-void-dark/80 border border-void-green/20 rounded px-3 py-1.5 text-void-green/90 text-sm font-mono focus:outline-none focus:border-void-green/40 transition-colors placeholder:text-void-green/30"
            data-testid="text-input"
          />
          <button
            onClick={handleTextSubmit}
            className="px-3 py-1.5 bg-void-green/10 border border-void-green/20 rounded text-void-green text-sm font-mono hover:bg-void-green/20 transition-colors"
            data-testid="text-submit"
          >
            dissolve
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="visual-language-canvas"
        />

        {/* Message Overlay */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-void-green/50 text-xs font-mono text-center pointer-events-none">
          {message}
        </div>
      </div>
    </div>
  )
}

export default VisualLanguage
