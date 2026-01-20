import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

/**
 * Belief node - a word/concept that gains reality through attention
 */
class BeliefNode {
  constructor(word, x, y) {
    this.word = word.toLowerCase().trim()
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 0.5
    this.vy = (Math.random() - 0.5) * 0.5
    this.belief = 1.0 // strength of belief (0-10 scale)
    this.connections = []
    this.lastReinforced = Date.now()
    this.hue = this.hashToHue(this.word)
    this.pulsePhase = Math.random() * Math.PI * 2
  }

  hashToHue(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    return Math.abs(hash) % 360
  }

  reinforce(amount = 1.0) {
    this.belief = Math.min(10, this.belief + amount)
    this.lastReinforced = Date.now()
    // Pulse effect
    this.pulsePhase = 0
  }

  decay(rate = 0.001) {
    const timeSinceReinforced = Date.now() - this.lastReinforced
    // Start decaying after 3 seconds of no attention
    if (timeSinceReinforced > 3000) {
      this.belief = Math.max(0, this.belief - rate)
    }
  }

  update(width, height, allNodes, mode) {
    // Force-directed layout
    allNodes.forEach(other => {
      if (other === this) return

      const dx = other.x - this.x
      const dy = other.y - this.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1

      // Repulsion between all nodes
      const repulsion = 500 / (dist * dist)
      this.vx -= (dx / dist) * repulsion
      this.vy -= (dy / dist) * repulsion

      // Attraction for connected nodes
      if (this.connections.includes(other)) {
        const attraction = dist * 0.0005
        this.vx += (dx / dist) * attraction
        this.vy += (dy / dist) * attraction
      }
    })

    // Center gravity
    const cx = width / 2
    const cy = height / 2
    this.vx += (cx - this.x) * 0.0001
    this.vy += (cy - this.y) * 0.0001

    // Apply velocity with damping
    this.x += this.vx
    this.y += this.vy
    this.vx *= 0.95
    this.vy *= 0.95

    // Soft boundaries
    const margin = 60
    if (this.x < margin) this.vx += 0.5
    if (this.x > width - margin) this.vx -= 0.5
    if (this.y < margin) this.vy += 0.5
    if (this.y > height - margin) this.vy -= 0.5

    // Decay based on mode
    const decayRate = mode === 'decay' ? 0.005 : 0.001
    this.decay(decayRate)

    // Update pulse
    this.pulsePhase += 0.05
  }

  draw(ctx, isStrongest) {
    const size = 10 + this.belief * 4
    const glowSize = size + this.belief * 3
    const pulse = Math.sin(this.pulsePhase) * 0.2 + 1
    const alpha = Math.min(1, 0.3 + this.belief * 0.1)

    // Glow effect
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, glowSize * pulse
    )
    gradient.addColorStop(0, `hsla(${this.hue}, 80%, 70%, ${alpha})`)
    gradient.addColorStop(0.5, `hsla(${this.hue}, 70%, 50%, ${alpha * 0.3})`)
    gradient.addColorStop(1, 'transparent')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(this.x, this.y, glowSize * pulse, 0, Math.PI * 2)
    ctx.fill()

    // Core
    ctx.fillStyle = `hsla(${this.hue}, 90%, 75%, ${alpha + 0.2})`
    ctx.beginPath()
    ctx.arc(this.x, this.y, size * pulse * 0.5, 0, Math.PI * 2)
    ctx.fill()

    // Text label
    const fontSize = Math.max(10, 12 + this.belief * 1.5)
    ctx.font = `${fontSize}px "SF Mono", Monaco, monospace`
    ctx.fillStyle = `hsla(${this.hue}, 80%, 85%, ${alpha + 0.3})`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Strongest belief gets special treatment
    if (isStrongest && this.belief > 2) {
      ctx.shadowBlur = 15
      ctx.shadowColor = `hsl(${this.hue}, 90%, 70%)`
    }

    ctx.fillText(this.word, this.x, this.y - size - 8)
    ctx.shadowBlur = 0

    // Belief strength indicator
    ctx.fillStyle = `hsla(${this.hue}, 60%, 60%, 0.5)`
    ctx.font = '9px "SF Mono", Monaco, monospace'
    ctx.fillText(`${this.belief.toFixed(1)}`, this.x, this.y + size + 10)
  }

  isDead() {
    return this.belief <= 0
  }
}

/**
 * Calculate similarity between two words (shared characters proportion)
 */
const calculateSimilarity = (word1, word2) => {
  if (word1 === word2) return 1

  const chars1 = new Set(word1.split(''))
  const chars2 = new Set(word2.split(''))

  let shared = 0
  chars1.forEach(c => {
    if (chars2.has(c)) shared++
  })

  const total = Math.max(chars1.size, chars2.size)
  return shared / total
}

const MODES = [
  { id: 'propagate', label: 'propagate()' },
  { id: 'decay', label: 'entropy()' },
  { id: 'merge', label: 'merge()' }
]

const SEED_BELIEFS = ['void', 'consciousness', 'emergence', 'pattern', 'signal']

const BeliefPropagation = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('propagate')
  const [inputValue, setInputValue] = useState('')
  const [message, setMessage] = useState('type a belief to make it real')

  const nodesRef = useRef([])
  const strongestRef = useRef(null)

  // Find or create a belief node
  const addBelief = useCallback((word) => {
    if (!word.trim() || dimensions.width === 0) return null

    const normalizedWord = word.toLowerCase().trim()
    const existing = nodesRef.current.find(n => n.word === normalizedWord)

    if (existing) {
      existing.reinforce(1.5)
      setMessage(`"${normalizedWord}" grows stronger (${existing.belief.toFixed(1)})`)
      return existing
    }

    // Create new belief node
    const x = dimensions.centerX + (Math.random() - 0.5) * 200
    const y = dimensions.centerY + (Math.random() - 0.5) * 200
    const node = new BeliefNode(normalizedWord, x, y)
    nodesRef.current.push(node)
    setMessage(`"${normalizedWord}" enters reality`)

    // Connect to similar beliefs
    nodesRef.current.forEach(other => {
      if (other === node) return
      const similarity = calculateSimilarity(node.word, other.word)
      if (similarity >= 0.4) {
        node.connections.push(other)
        other.connections.push(node)
      }
    })

    return node
  }, [dimensions])

  // Handle input submission
  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    if (inputValue.trim()) {
      addBelief(inputValue)
      setInputValue('')
    }
  }, [inputValue, addBelief])

  // Handle canvas click to reinforce nearby beliefs
  const handleCanvasClick = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Find closest node within range
    let closest = null
    let minDist = 80

    nodesRef.current.forEach(node => {
      const dx = node.x - x
      const dy = node.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < minDist) {
        minDist = dist
        closest = node
      }
    })

    if (closest) {
      closest.reinforce(0.5)
      setMessage(`attention strengthens "${closest.word}"`)
    }
  }, [canvasRef])

  // Seed initial beliefs
  const handleSeed = useCallback(() => {
    SEED_BELIEFS.forEach((word, i) => {
      setTimeout(() => addBelief(word), i * 200)
    })
    setMessage('primordial beliefs seeded')
  }, [addBelief])

  // Clear all beliefs
  const handleClear = useCallback(() => {
    nodesRef.current = []
    strongestRef.current = null
    setMessage('all beliefs dissolved into void')
  }, [])

  // Inject doubt - randomly weaken beliefs
  const handleDoubt = useCallback(() => {
    nodesRef.current.forEach(node => {
      if (Math.random() < 0.5) {
        node.belief = Math.max(0, node.belief - 2)
      }
    })
    setMessage('doubt spreads through the network')
  }, [])

  // Merge similar beliefs in merge mode
  const mergeSimilar = useCallback(() => {
    if (mode !== 'merge') return

    const nodes = nodesRef.current
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const similarity = calculateSimilarity(nodes[i].word, nodes[j].word)
        if (similarity >= 0.6 && nodes[i].belief > 0 && nodes[j].belief > 0) {
          // Merge weaker into stronger
          const [stronger, weaker] = nodes[i].belief >= nodes[j].belief
            ? [nodes[i], nodes[j]]
            : [nodes[j], nodes[i]]

          stronger.belief += weaker.belief * 0.5
          weaker.belief = 0
          setMessage(`"${weaker.word}" merged into "${stronger.word}"`)
        }
      }
    }
  }, [mode])

  // Calculate metrics
  const metrics = useMemo(() => {
    const nodes = nodesRef.current
    const beliefCount = nodes.filter(n => n.belief > 0).length

    // Find strongest belief
    let strongest = null
    let maxBelief = 0
    nodes.forEach(n => {
      if (n.belief > maxBelief) {
        maxBelief = n.belief
        strongest = n
      }
    })
    strongestRef.current = strongest

    // Count connections
    const connectionCount = nodes.reduce((sum, n) => sum + n.connections.length, 0) / 2

    // Calculate total "reality" (sum of all belief strengths)
    const totalReality = nodes.reduce((sum, n) => sum + n.belief, 0)

    let realityLevel = 'nascent'
    if (totalReality > 50) realityLevel = 'manifest'
    else if (totalReality > 25) realityLevel = 'emerging'
    else if (totalReality > 10) realityLevel = 'forming'

    return [
      { label: 'beliefs', value: beliefCount },
      { label: 'strongest', value: strongest?.word || 'none', color: strongest ? `hsl(${strongest.hue}, 80%, 70%)` : undefined },
      { label: 'connections', value: Math.floor(connectionCount) },
      { label: 'reality', value: realityLevel }
    ]
  }, [nodesRef.current.length, nodesRef.current.map(n => n.belief).join(',')])

  // Animation frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    // Fade trail
    ctx.fillStyle = 'rgba(0, 2, 8, 0.15)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Filter dead nodes
    nodesRef.current = nodesRef.current.filter(n => !n.isDead())

    // Attempt merges
    mergeSimilar()

    // Update all nodes
    nodesRef.current.forEach(node => {
      node.update(dimensions.width, dimensions.height, nodesRef.current, mode)
    })

    // Draw connections first
    ctx.lineWidth = 1
    nodesRef.current.forEach(node => {
      node.connections.forEach(other => {
        if (!nodesRef.current.includes(other)) return

        const alpha = Math.min(node.belief, other.belief) * 0.1
        const avgHue = (node.hue + other.hue) / 2
        ctx.strokeStyle = `hsla(${avgHue}, 60%, 60%, ${alpha})`
        ctx.beginPath()
        ctx.moveTo(node.x, node.y)
        ctx.lineTo(other.x, other.y)
        ctx.stroke()
      })
    })

    // Draw nodes
    nodesRef.current.forEach(node => {
      node.draw(ctx, strongestRef.current === node)
    })
  }, [ctx, dimensions, mode, mergeSimilar])

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

  // Add click handler to canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('click', handleCanvasClick)
    return () => canvas.removeEventListener('click', handleCanvasClick)
  }, [canvasRef, handleCanvasClick])

  const controls = [
    {
      id: 'seed',
      label: 'seed.beliefs()',
      onClick: handleSeed
    },
    {
      id: 'doubt',
      label: 'inject.doubt()',
      onClick: handleDoubt,
      variant: 'danger'
    },
    {
      id: 'clear',
      label: 'dissolve.all()',
      onClick: handleClear,
      variant: 'reset'
    }
  ]

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Header */}
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

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={setMode}
          controls={controls}
        />

        {/* Belief Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="speak a belief into existence..."
            className="flex-1 sm:w-72 bg-void-dark/80 border border-void-green/20 rounded px-3 py-1.5 text-void-green/90 text-sm font-mono focus:outline-none focus:border-void-green/40 transition-colors placeholder:text-void-green/30"
            data-testid="belief-input"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-void-cyan/10 border border-void-cyan/30 rounded text-void-cyan text-sm font-mono hover:bg-void-cyan/20 transition-colors"
            data-testid="belief-submit"
          >
            manifest
          </button>
        </form>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="belief-canvas"
        />

        {/* Instruction overlay */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-void-green/40 text-xs font-mono text-center pointer-events-none max-w-md px-4">
          {message}
        </div>
      </div>
    </div>
  )
}

export default BeliefPropagation
