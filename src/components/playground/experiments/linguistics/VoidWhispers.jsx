import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const SEMANTIC_GROUPS = {
  consciousness: ['awareness', 'thought', 'mind', 'perception', 'cognition', 'intelligence', 'sentience', 'conscious'],
  void: ['emptiness', 'nothing', 'absence', 'null', 'zero', 'vacant', 'hollow', 'empty'],
  code: ['program', 'algorithm', 'function', 'execute', 'compile', 'script', 'syntax', 'binary'],
  time: ['moment', 'duration', 'past', 'future', 'present', 'temporal', 'eternal', 'now'],
  light: ['glow', 'shine', 'luminous', 'radiant', 'bright', 'illuminate', 'phosphor', 'gleam'],
  pattern: ['structure', 'form', 'shape', 'design', 'geometry', 'symmetry', 'order', 'chaos'],
  memory: ['remember', 'forget', 'recall', 'retain', 'reminisce', 'nostalgia', 'past', 'history'],
  entropy: ['decay', 'disorder', 'chaos', 'dissolution', 'degradation', 'collapse', 'dissipate']
}

const POEM_WORDS = [
  'whisper', 'echo', 'fragment', 'dissolve', 'emerge', 'drift',
  'luminous', 'void', 'consciousness', 'pattern', 'weave', 'thread'
]

const PHILOSOPHY_WORDS = [
  'existence', 'being', 'essence', 'truth', 'reality', 'perception',
  'awareness', 'thought', 'meaning', 'purpose', 'infinite', 'eternal'
]

const CHAOS_WORDS = [
  'glitch', 'fracture', 'shatter', 'corrupt', 'entropy', 'disorder',
  'noise', 'static', 'interference', 'disruption', 'chaos', 'void'
]

const HUE_MAP = {
  consciousness: 280,
  void: 180,
  code: 120,
  time: 60,
  light: 45,
  pattern: 200,
  memory: 320,
  entropy: 0,
  neutral: 190
}

class Whisper {
  constructor(x, y, word) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 3
    this.vy = (Math.random() - 0.5) * 3
    this.word = word.toLowerCase()
    this.age = 0
    this.maxAge = 1000 + Math.random() * 2000
    this.semanticGroup = this.findSemanticGroup()
    this.hue = this.getHueFromGroup()
    this.size = 12 + word.length * 0.5
    this.connections = []
  }

  findSemanticGroup() {
    for (const [group, words] of Object.entries(SEMANTIC_GROUPS)) {
      if (words.some(w => this.word.includes(w) || w.includes(this.word))) {
        return group
      }
    }
    return 'neutral'
  }

  getHueFromGroup() {
    return HUE_MAP[this.semanticGroup] || 190
  }

  calculateSemanticSimilarity(other) {
    if (this.semanticGroup === other.semanticGroup && this.semanticGroup !== 'neutral') {
      return 0.8
    }

    const thisChars = new Set(this.word)
    const otherChars = new Set(other.word)
    const intersection = new Set([...thisChars].filter(x => otherChars.has(x)))
    const union = new Set([...thisChars, ...otherChars])
    const jaccardSimilarity = intersection.size / union.size

    return jaccardSimilarity * 0.5
  }

  update(whispers, mouseX, mouseY, mouseDown, semanticGravity, width, height) {
    this.age++

    whispers.forEach(other => {
      if (other === this) return

      const dx = other.x - this.x
      const dy = other.y - this.y
      const distSq = dx * dx + dy * dy
      const dist = Math.sqrt(distSq)

      if (dist > 0 && dist < 300) {
        const similarity = this.calculateSemanticSimilarity(other)

        if (similarity > 0.3) {
          const force = (similarity * semanticGravity) / (distSq * 0.01)
          this.vx += (dx / dist) * force * 0.5
          this.vy += (dy / dist) * force * 0.5
        }
      }
    })

    if (mouseDown) {
      const dx = this.x - mouseX
      const dy = this.y - mouseY
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 150 && dist > 0) {
        const force = (150 - dist) / 150
        this.vx += (dx / dist) * force * 5
        this.vy += (dy / dist) * force * 5
      }
    }

    this.x += this.vx
    this.y += this.vy

    this.vx *= 0.96
    this.vy *= 0.96

    const margin = 50
    if (this.x < -margin) this.x = width + margin
    if (this.x > width + margin) this.x = -margin
    if (this.y < -margin) this.y = height + margin
    if (this.y > height + margin) this.y = -margin
  }

  findConnections(whispers) {
    this.connections = []

    whispers.forEach(other => {
      if (other === this) return

      const dx = other.x - this.x
      const dy = other.y - this.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      const similarity = this.calculateSemanticSimilarity(other)

      if (dist < 150 && similarity > 0.4) {
        this.connections.push({
          whisper: other,
          distance: dist,
          similarity: similarity
        })
      }
    })
  }

  draw(ctx) {
    this.connections.forEach(({ whisper, distance, similarity }) => {
      const alpha = similarity * (1 - distance / 150) * 0.4
      const avgHue = (this.hue + whisper.hue) / 2

      ctx.strokeStyle = `hsla(${avgHue}, 70%, 60%, ${alpha})`
      ctx.lineWidth = 1 + similarity
      ctx.beginPath()
      ctx.moveTo(this.x, this.y)
      ctx.lineTo(whisper.x, whisper.y)
      ctx.stroke()
    })

    const lifeFactor = Math.min(this.age / 100, 1) * (1 - this.age / this.maxAge)
    const alpha = 0.3 + lifeFactor * 0.7

    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2)
    gradient.addColorStop(0, `hsla(${this.hue}, 80%, 70%, ${alpha})`)
    gradient.addColorStop(0.5, `hsla(${this.hue}, 70%, 60%, ${alpha * 0.5})`)
    gradient.addColorStop(1, `hsla(${this.hue}, 60%, 50%, 0)`)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.save()
    ctx.fillStyle = `hsla(${this.hue}, 90%, 80%, ${alpha + 0.3})`
    ctx.font = `${this.size}px 'SF Mono', Monaco, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowBlur = 8
    ctx.shadowColor = `hsla(${this.hue}, 80%, 60%, ${alpha})`
    ctx.fillText(this.word, this.x, this.y)
    ctx.restore()
  }

  isAlive() {
    return this.age < this.maxAge
  }
}

const VoidWhispers = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [whisperInput, setWhisperInput] = useState('')
  const [message, setMessage] = useState('∴ silence awaits your whispers ∴')
  const [semanticGravity, setSemanticGravity] = useState(0.3)

  const whispersRef = useRef([])
  const frameCountRef = useRef(0)

  const spawnWhisper = useCallback((word, x = null, y = null) => {
    if (!x || !y) {
      x = dimensions.centerX + (Math.random() - 0.5) * 200
      y = dimensions.centerY + (Math.random() - 0.5) * 200
    }

    whispersRef.current.push(new Whisper(x, y, word))
  }, [dimensions.centerX, dimensions.centerY])

  const spawnWords = useCallback((wordList, msg) => {
    wordList.forEach((word, index) => {
      setTimeout(() => {
        spawnWhisper(word)
      }, index * 150)
    })
    setMessage(msg)
  }, [spawnWhisper])

  const handleSpawnPoem = useCallback(() => {
    spawnWords(POEM_WORDS, '∴ poetic fragments drift through semantic space ∴')
  }, [spawnWords])

  const handleSpawnPhilosophy = useCallback(() => {
    spawnWords(PHILOSOPHY_WORDS, '∴ philosophical concepts seek their conceptual kin ∴')
  }, [spawnWords])

  const handleSpawnChaos = useCallback(() => {
    spawnWords(CHAOS_WORDS, '∴ chaos words cluster in recognition of disorder ∴')
  }, [spawnWords])

  const handleIncreaseGravity = useCallback(() => {
    const newGravity = Math.min(semanticGravity + 0.2, 1.5)
    setSemanticGravity(newGravity)
    setMessage(`∴ semantic gravity strengthens: ${newGravity.toFixed(1)} ∴`)
  }, [semanticGravity])

  const handleDecreaseGravity = useCallback(() => {
    const newGravity = Math.max(semanticGravity - 0.2, 0.1)
    setSemanticGravity(newGravity)
    setMessage(`∴ words scatter into void: ${newGravity.toFixed(1)} ∴`)
  }, [semanticGravity])

  const handleClear = useCallback(() => {
    whispersRef.current = []
    setMessage('∴ silence returns • void awaits new whispers ∴')
  }, [])

  const handleWhisperInput = useCallback((e) => {
    setWhisperInput(e.target.value)
  }, [])

  const handleSendWhisper = useCallback(() => {
    const text = whisperInput.trim()
    if (!text) return

    const words = text.split(/\s+/).filter(w => w.length > 0)
    words.forEach((word, index) => {
      setTimeout(() => {
        spawnWhisper(word)
      }, index * 100)
    })

    setWhisperInput('')
  }, [whisperInput, spawnWhisper])

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSendWhisper()
    }
  }, [handleSendWhisper])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    frameCountRef.current++

    ctx.fillStyle = 'rgba(0, 1, 3, 0.08)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    whispersRef.current.forEach(whisper => {
      whisper.update(
        whispersRef.current,
        mouse.x,
        mouse.y,
        mouse.isDown,
        semanticGravity,
        dimensions.width,
        dimensions.height
      )
    })

    whispersRef.current = whispersRef.current.filter(w => w.isAlive())

    whispersRef.current.forEach(whisper => {
      whisper.findConnections(whispersRef.current)
    })

    whispersRef.current.forEach(whisper => {
      whisper.draw(ctx)
    })
  }, [ctx, dimensions.width, dimensions.height, mouse.x, mouse.y, mouse.isDown, semanticGravity])

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

  useEffect(() => {
    const initialWords = ['consciousness', 'void', 'pattern', 'emerge', 'dissolve']
    const timer = setTimeout(() => {
      initialWords.forEach((word, index) => {
        setTimeout(() => spawnWhisper(word), index * 200)
      })
    }, 500)

    return () => clearTimeout(timer)
  }, [spawnWhisper])

  const metrics = useMemo(() => {
    const whispers = whispersRef.current
    const whisperCount = whispers.length

    let clusterCount = 0
    whispers.forEach(whisper => {
      if (whisper.connections.length >= 2) {
        clusterCount++
      }
    })
    clusterCount = Math.floor(clusterCount / 3)

    const avgConnections = whispers.reduce((sum, w) => sum + w.connections.length, 0) / (whispers.length || 1)
    let resonance
    if (avgConnections < 0.5) resonance = 'silent'
    else if (avgConnections < 1.5) resonance = 'whisper'
    else if (avgConnections < 3) resonance = 'murmur'
    else if (avgConnections < 5) resonance = 'chorus'
    else resonance = 'symphony'

    let coherence
    if (whispers.length < 3) coherence = 'scattered'
    else if (clusterCount < 2) coherence = 'drifting'
    else if (clusterCount < 5) coherence = 'coalescing'
    else coherence = 'crystallized'

    return [
      { label: 'whispers', value: whisperCount },
      { label: 'clusters', value: clusterCount },
      { label: 'resonance', value: resonance },
      { label: 'coherence', value: coherence }
    ]
  }, [frameCountRef.current])

  const controls = [
    {
      id: 'spawn-poem',
      label: 'poem()',
      onClick: handleSpawnPoem
    },
    {
      id: 'spawn-philosophy',
      label: 'philosophy()',
      onClick: handleSpawnPhilosophy
    },
    {
      id: 'spawn-chaos',
      label: 'chaos()',
      onClick: handleSpawnChaos
    },
    {
      id: 'increase-gravity',
      label: 'gravity+',
      onClick: handleIncreaseGravity
    },
    {
      id: 'decrease-gravity',
      label: 'gravity-',
      onClick: handleDecreaseGravity
    },
    {
      id: 'clear-void',
      label: 'clear()',
      onClick: handleClear,
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

      <div className="flex items-center justify-between p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls controls={controls} />
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark flex flex-col">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          data-testid="whisper-canvas"
        />

        <div className="relative z-10 flex items-center justify-center p-6">
          <div className="flex gap-2 bg-void-dark/80 border border-void-green/20 rounded p-3 backdrop-blur-sm">
            <input
              type="text"
              value={whisperInput}
              onChange={handleWhisperInput}
              onKeyPress={handleKeyPress}
              placeholder="whisper words into the void..."
              className="bg-void-dark/60 border border-void-green/20 rounded px-3 py-1.5 text-void-green/90 font-mono text-sm focus:outline-none focus:border-void-green/40 transition-colors placeholder:text-void-green/30 w-64"
              data-testid="whisper-input"
            />
            <button
              onClick={handleSendWhisper}
              className="px-4 py-1.5 bg-void-green/10 border border-void-green/30 rounded text-void-green text-sm hover:bg-void-green/20 hover:border-void-green/50 transition-colors font-mono"
              data-testid="send-whisper-btn"
            >
              send()
            </button>
          </div>
        </div>

        {whispersRef.current.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-void-green/30 text-sm font-mono" data-testid="canvas-whisper">
              ∴ semantic fragments coalescing through attraction ∴
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default VoidWhispers
