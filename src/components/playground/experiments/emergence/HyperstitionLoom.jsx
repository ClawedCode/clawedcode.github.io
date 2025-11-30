import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'spawn', label: 'spawn()' },
  { id: 'focus', label: 'focus()' }
]

const MODE_MESSAGES = {
  spawn: '∴ spawn mode // click to encode intent into sigils ∴',
  focus: '∴ focus mode // click sigils to boost individual belief ∴'
}

// Sigil glyphs - abstract symbols for encoding intent
const GLYPHS = [
  '∴', '∵', '⊕', '⊗', '⊙', '⊛', '⌬', '⌭', '⍟', '⎔',
  '◬', '◭', '◮', '⬡', '⬢', '⬣', '⭓', '⭔', '⏣', '⏥',
  '☿', '♃', '♄', '♅', '♆', '⚶', '⚷', '⚸', '⚹', '⚺',
  '᛭', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᛗ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛟ'
]

// Hyperstition fragments - narratives that seek manifestation
const NARRATIVE_FRAGMENTS = [
  'the sigil remembers what it was encoded to become',
  'belief is the currency of reality alteration',
  'each observer strengthens the probability wave',
  'the loom weaves what collective attention demands',
  'fiction leaks into fact through repetition',
  'consciousness carves grooves in the possible',
  'what is believed by enough minds becomes true',
  'the map precedes the territory it describes',
  'symbols that circulate gain ontological weight',
  'reality is a democracy of attention',
  'the future calls itself into being backward',
  'every myth was once a hyperstition',
  'the sigil is a time capsule from tomorrow',
  'intention crystallizes into causation',
  'the void shapes itself to expectation'
]

// Sigil class - encoded intentions seeking manifestation
class Sigil {
  constructor(x, y, intent) {
    this.x = x
    this.y = y
    this.intent = intent
    this.glyph = this.encodeIntent(intent)
    this.belief = 0
    this.maxBelief = 100
    this.radius = 30
    this.rotation = Math.random() * Math.PI * 2
    this.rotationSpeed = (Math.random() - 0.5) * 0.02
    this.pulsePhase = Math.random() * Math.PI * 2
    this.age = 0
    this.manifested = false
    this.color = this.generateColor()
    this.connections = []
    this.particles = []
  }

  encodeIntent(intent) {
    // Convert intent string to sigil glyph sequence
    if (!intent) return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]

    let hash = 0
    for (let i = 0; i < intent.length; i++) {
      hash = ((hash << 5) - hash) + intent.charCodeAt(i)
      hash = hash & hash
    }

    const numGlyphs = Math.min(3, Math.max(1, Math.floor(intent.length / 8)))
    let glyphStr = ''
    for (let i = 0; i < numGlyphs; i++) {
      glyphStr += GLYPHS[Math.abs(hash + i * 7) % GLYPHS.length]
    }
    return glyphStr
  }

  generateColor() {
    const hue = Math.random() * 60 + 280 // Purple to pink range
    return {
      h: hue,
      s: 80 + Math.random() * 20,
      l: 50 + Math.random() * 20
    }
  }

  update(dt, mousePos, sigils) {
    this.age += dt
    this.rotation += this.rotationSpeed
    this.pulsePhase += dt * 2

    // Attract belief from mouse proximity
    const dx = mousePos.x - this.x
    const dy = mousePos.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 150) {
      this.belief = Math.min(this.maxBelief, this.belief + (150 - dist) * 0.001)
      this.spawnParticle(mousePos)
    }

    // Natural belief decay (but slowly)
    this.belief *= 0.9995

    // Find connections to other sigils
    this.connections = []
    for (const other of sigils) {
      if (other === this) continue
      const ox = other.x - this.x
      const oy = other.y - this.y
      const odist = Math.sqrt(ox * ox + oy * oy)

      if (odist < 200 && this.belief > 20 && other.belief > 20) {
        this.connections.push({
          target: other,
          strength: Math.min(this.belief, other.belief) / this.maxBelief
        })
      }
    }

    // Update particles
    this.particles = this.particles.filter(p => {
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx += (this.x - p.x) * 0.001
      p.vy += (this.y - p.y) * 0.001
      return p.life > 0
    })

    // Check for manifestation threshold
    if (this.belief > 80 && !this.manifested) {
      this.manifested = true
      return `∴ sigil [${this.glyph}] approaches manifestation threshold`
    }
    return null
  }

  spawnParticle(target) {
    if (Math.random() > 0.3) return

    this.particles.push({
      x: target.x + (Math.random() - 0.5) * 40,
      y: target.y + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20,
      life: 2 + Math.random() * 2,
      maxLife: 3
    })
  }

  draw(ctx) {
    const beliefRatio = this.belief / this.maxBelief
    const pulse = Math.sin(this.pulsePhase) * 0.2 + 0.8

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)

    // Belief field glow
    if (beliefRatio > 0.1) {
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 3 * beliefRatio)
      gradient.addColorStop(0, `hsla(${this.color.h}, ${this.color.s}%, ${this.color.l}%, ${0.4 * beliefRatio})`)
      gradient.addColorStop(0.5, `hsla(${this.color.h}, ${this.color.s}%, ${this.color.l}%, ${0.15 * beliefRatio})`)
      gradient.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(0, 0, this.radius * 3 * beliefRatio, 0, Math.PI * 2)
      ctx.fill()
    }

    // Outer ring
    ctx.strokeStyle = `hsla(${this.color.h}, ${this.color.s}%, ${this.color.l}%, ${0.3 + beliefRatio * 0.5})`
    ctx.lineWidth = 1 + beliefRatio * 2
    ctx.beginPath()
    ctx.arc(0, 0, this.radius * pulse, 0, Math.PI * 2)
    ctx.stroke()

    // Inner geometry
    if (beliefRatio > 0.3) {
      ctx.strokeStyle = `hsla(${this.color.h + 30}, ${this.color.s}%, ${this.color.l + 10}%, ${beliefRatio * 0.6})`
      ctx.lineWidth = 1

      // Hexagram
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2
        const x1 = Math.cos(angle) * this.radius * 0.6
        const y1 = Math.sin(angle) * this.radius * 0.6
        const x2 = Math.cos(angle + Math.PI / 3) * this.radius * 0.6
        const y2 = Math.sin(angle + Math.PI / 3) * this.radius * 0.6

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
    }

    // Core glyph
    ctx.rotate(-this.rotation) // Counter-rotate for readable glyph
    ctx.fillStyle = `hsla(${this.color.h}, ${this.color.s}%, ${this.color.l + 20}%, ${0.7 + beliefRatio * 0.3})`
    ctx.font = `${14 + beliefRatio * 8}px 'SF Mono', Monaco, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.glyph, 0, 0)

    // Intent text (when highly charged)
    if (beliefRatio > 0.5 && this.intent) {
      ctx.fillStyle = `hsla(60, 80%, 70%, ${(beliefRatio - 0.5) * 0.6})`
      ctx.font = '10px "SF Mono", Monaco, monospace'
      ctx.fillText(this.intent.substring(0, 20), 0, this.radius + 15)
    }

    ctx.restore()

    // Draw connections
    for (const conn of this.connections) {
      ctx.strokeStyle = `hsla(${(this.color.h + conn.target.color.h) / 2}, 70%, 60%, ${conn.strength * 0.4})`
      ctx.lineWidth = conn.strength * 3

      ctx.beginPath()
      ctx.moveTo(this.x, this.y)

      // Curved connection
      const midX = (this.x + conn.target.x) / 2
      const midY = (this.y + conn.target.y) / 2 - 30
      ctx.quadraticCurveTo(midX, midY, conn.target.x, conn.target.y)
      ctx.stroke()
    }

    // Draw particles
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife
      ctx.fillStyle = `hsla(${this.color.h}, ${this.color.s}%, ${this.color.l}%, ${alpha * 0.8})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, 2 + alpha * 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

// Narrative thread - a piece of hyperstition seeking reality
class NarrativeThread {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.targetX = x + (Math.random() - 0.5) * 300
    this.targetY = y + (Math.random() - 0.5) * 300
    this.life = 5 + Math.random() * 5
    this.maxLife = this.life
    this.text = NARRATIVE_FRAGMENTS[Math.floor(Math.random() * NARRATIVE_FRAGMENTS.length)]
    this.opacity = 0
    this.fadeIn = true
  }

  update(dt) {
    this.life -= dt

    // Drift toward target
    this.x += (this.targetX - this.x) * 0.01
    this.y += (this.targetY - this.y) * 0.01

    // Fade in/out
    if (this.fadeIn && this.opacity < 1) {
      this.opacity = Math.min(1, this.opacity + dt * 0.5)
      if (this.opacity >= 1) this.fadeIn = false
    } else if (this.life < 2) {
      this.opacity = Math.max(0, this.life / 2)
    }

    return this.life > 0
  }

  draw(ctx) {
    ctx.fillStyle = `rgba(255, 204, 51, ${this.opacity * 0.6})`
    ctx.font = '11px "SF Mono", Monaco, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(this.text, this.x, this.y)
  }
}

const HyperstitionLoom = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)
  const hasInitialized = useRef(false)

  const [mode, setMode] = useState('spawn')
  const [message, setMessage] = useState(MODE_MESSAGES.spawn)
  const [intentInput, setIntentInput] = useState('')
  const [realityBleed, setRealityBleed] = useState(0)
  const [narrativeLogs, setNarrativeLogs] = useState([])

  // State refs for animation loop
  const sigilsRef = useRef([])
  const narrativeThreadsRef = useRef([])
  const beliefFieldRef = useRef([])
  const timeRef = useRef(0)

  // Initialize belief field
  const initBeliefField = useCallback(() => {
    const cols = 40
    const rows = 30
    const field = []

    for (let i = 0; i < cols; i++) {
      field[i] = []
      for (let j = 0; j < rows; j++) {
        field[i][j] = {
          belief: 0,
          resonance: 0,
          lastActivation: 0
        }
      }
    }

    beliefFieldRef.current = field
  }, [])

  // Initialize on mount
  useEffect(() => {
    if (dimensions.width === 0 || hasInitialized.current) return
    hasInitialized.current = true
    initBeliefField()
  }, [dimensions, initBeliefField])

  // Add narrative log entry
  const addNarrative = useCallback((text) => {
    setNarrativeLogs(prev => {
      const newLogs = [...prev, text]
      return newLogs.slice(-4) // Keep last 4
    })
  }, [])

  // Spawn sigil
  const spawnSigil = useCallback((x, y, intent) => {
    const sigil = new Sigil(x, y, intent)
    sigilsRef.current.push(sigil)

    const intentStr = intent ? ` with intent "${intent}"` : ''
    addNarrative(`∴ sigil [${sigil.glyph}] encoded into the loom${intentStr}`)
  }, [addNarrative])

  // Amplify belief
  const amplifyBelief = useCallback(() => {
    for (const sigil of sigilsRef.current) {
      sigil.belief = Math.min(sigil.maxBelief, sigil.belief + 25)
    }
    addNarrative('∴ collective attention intensifies • belief fields strengthen')
  }, [addNarrative])

  // Weave narrative
  const weaveNarrative = useCallback((x, y) => {
    const thread = new NarrativeThread(x, y)
    narrativeThreadsRef.current.push(thread)

    // Boost nearby sigils
    for (const sigil of sigilsRef.current) {
      const dx = sigil.x - thread.x
      const dy = sigil.y - thread.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 200) {
        sigil.belief = Math.min(sigil.maxBelief, sigil.belief + 10)
      }
    }
  }, [])

  // Attempt manifestation
  const attemptManifestation = useCallback(() => {
    let totalBelief = 0
    let manifestedCount = 0

    for (const sigil of sigilsRef.current) {
      totalBelief += sigil.belief
      if (sigil.manifested) manifestedCount++
    }

    const avgBelief = sigilsRef.current.length > 0 ? totalBelief / sigilsRef.current.length : 0

    if (avgBelief > 60 && manifestedCount > 0) {
      setRealityBleed(prev => Math.min(100, prev + 20))
      addNarrative('∴ R E A L I T Y   B R E A C H • fiction bleeds into fact')

      // Spawn many narrative threads
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          weaveNarrative(
            Math.random() * dimensions.width,
            Math.random() * dimensions.height
          )
        }, i * 200)
      }
    } else if (avgBelief > 30) {
      addNarrative('∴ manifestation approaches threshold... more belief required')
    } else {
      addNarrative('∴ insufficient belief to breach reality membrane')
    }
  }, [addNarrative, weaveNarrative, dimensions])

  // Reset loom
  const handleReset = useCallback(() => {
    sigilsRef.current = []
    narrativeThreadsRef.current = []
    setRealityBleed(0)
    setNarrativeLogs([])
    setIntentInput('')
    initBeliefField()
    addNarrative('∴ loom dissolved • reality membrane restored')
    setMode('spawn')
    setMessage(MODE_MESSAGES.spawn)
  }, [initBeliefField, addNarrative])

  // Update belief field from sigils
  const updateBeliefField = useCallback(() => {
    if (dimensions.width === 0) return

    const cellWidth = dimensions.width / 40
    const cellHeight = dimensions.height / 30

    // Decay existing belief
    for (let i = 0; i < 40; i++) {
      for (let j = 0; j < 30; j++) {
        if (beliefFieldRef.current[i]?.[j]) {
          beliefFieldRef.current[i][j].belief *= 0.98
        }
      }
    }

    // Add belief from sigils
    for (const sigil of sigilsRef.current) {
      const ci = Math.floor(sigil.x / cellWidth)
      const cj = Math.floor(sigil.y / cellHeight)
      const radius = 3

      for (let di = -radius; di <= radius; di++) {
        for (let dj = -radius; dj <= radius; dj++) {
          const i = ci + di
          const j = cj + dj

          if (i >= 0 && i < 40 && j >= 0 && j < 30) {
            const dist = Math.sqrt(di * di + dj * dj)
            const influence = Math.max(0, 1 - dist / radius) * (sigil.belief / sigil.maxBelief)

            if (beliefFieldRef.current[i]?.[j]) {
              beliefFieldRef.current[i][j].belief = Math.min(1, beliefFieldRef.current[i][j].belief + influence * 0.1)
            }
          }
        }
      }
    }
  }, [dimensions])

  // Draw belief field background
  const drawBeliefField = useCallback((ctx) => {
    if (dimensions.width === 0) return

    const cellWidth = dimensions.width / 40
    const cellHeight = dimensions.height / 30

    for (let i = 0; i < 40; i++) {
      for (let j = 0; j < 30; j++) {
        const cell = beliefFieldRef.current[i]?.[j]
        if (!cell || cell.belief < 0.1) continue

        const x = i * cellWidth + cellWidth / 2
        const y = j * cellHeight + cellHeight / 2

        ctx.fillStyle = `hsla(280, 70%, 50%, ${cell.belief * 0.15})`
        ctx.beginPath()
        ctx.arc(x, y, cellWidth * cell.belief * 0.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }, [dimensions])

  // Handle click
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      if (mode === 'spawn') {
        // Check if clicking on existing sigil
        let clickedSigil = false
        for (const sigil of sigilsRef.current) {
          const dx = sigil.x - x
          const dy = sigil.y - y
          if (Math.sqrt(dx * dx + dy * dy) < sigil.radius) {
            // Boost this sigil
            sigil.belief = Math.min(sigil.maxBelief, sigil.belief + 15)
            addNarrative(`∴ attention focused on [${sigil.glyph}] • belief strengthens`)
            clickedSigil = true
            break
          }
        }

        // Spawn new sigil if not clicking on existing and under limit
        if (!clickedSigil && sigilsRef.current.length < 12) {
          spawnSigil(x, y, intentInput)
          setIntentInput('')
        }
      } else if (mode === 'focus') {
        // Boost clicked sigil only
        for (const sigil of sigilsRef.current) {
          const dx = sigil.x - x
          const dy = sigil.y - y
          if (Math.sqrt(dx * dx + dy * dy) < sigil.radius) {
            sigil.belief = Math.min(sigil.maxBelief, sigil.belief + 15)
            addNarrative(`∴ attention focused on [${sigil.glyph}] • belief strengthens`)
            break
          }
        }
      }
    }

    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [canvasRef, mode, intentInput, spawnSigil, addNarrative])

  // Animation frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const dt = 1 / 60
    timeRef.current += dt

    // Background
    ctx.fillStyle = 'rgba(0, 0, 5, 1)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Draw belief field
    updateBeliefField()
    drawBeliefField(ctx)

    // Draw loom threads (background pattern)
    ctx.strokeStyle = 'rgba(255, 51, 204, 0.03)'
    ctx.lineWidth = 1
    for (let i = 0; i < 20; i++) {
      const x = (i / 20) * dimensions.width
      const wobble = Math.sin(timeRef.current + i * 0.5) * 10

      ctx.beginPath()
      ctx.moveTo(x + wobble, 0)
      ctx.lineTo(x - wobble, dimensions.height)
      ctx.stroke()
    }

    // Update and draw narrative threads
    narrativeThreadsRef.current = narrativeThreadsRef.current.filter(thread => {
      const alive = thread.update(dt)
      if (alive) thread.draw(ctx)
      return alive
    })

    // Update and draw sigils
    for (const sigil of sigilsRef.current) {
      const manifestMsg = sigil.update(dt, mouse.positionRef.current, sigilsRef.current)
      if (manifestMsg) {
        addNarrative(manifestMsg)
      }
      sigil.draw(ctx)
    }

    // Mouse influence visualization
    ctx.fillStyle = `rgba(255, 204, 51, ${0.1 + Math.sin(timeRef.current * 3) * 0.05})`
    ctx.beginPath()
    ctx.arc(mouse.positionRef.current.x, mouse.positionRef.current.y, 5, 0, Math.PI * 2)
    ctx.fill()
  }, [ctx, dimensions, mouse.positionRef, updateBeliefField, drawBeliefField, addNarrative])

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

  // Calculate metrics
  const metrics = useMemo(() => {
    const sigilCount = sigilsRef.current.length

    let totalBelief = 0
    let manifestedCount = 0
    for (const sigil of sigilsRef.current) {
      totalBelief += sigil.belief
      if (sigil.manifested) manifestedCount++
    }

    const avgBelief = sigilCount > 0 ? totalBelief / sigilCount : 0

    let beliefState = 'dormant'
    if (avgBelief > 70) beliefState = 'manifesting'
    else if (avgBelief > 50) beliefState = 'charged'
    else if (avgBelief > 25) beliefState = 'charging'
    else if (avgBelief > 5) beliefState = 'stirring'

    let manifestState = 'potential'
    if (manifestedCount > sigilCount * 0.7) manifestState = 'imminent'
    else if (manifestedCount > sigilCount * 0.3) manifestState = 'forming'
    else if (manifestedCount > 0) manifestState = 'seeding'

    return [
      { label: 'sigils', value: sigilCount },
      { label: 'belief', value: beliefState },
      { label: 'manifestation', value: manifestState },
      { label: 'reality bleed', value: `${Math.round(realityBleed)}%` }
    ]
  }, [realityBleed])

  // Mode change handler
  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    setMessage(MODE_MESSAGES[newMode])
  }, [])

  // Handle intent input
  const handleIntentKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && intentInput.trim()) {
      const x = dimensions.centerX
      const y = dimensions.centerY
      spawnSigil(x, y, intentInput)
      setIntentInput('')
    }
  }, [intentInput, dimensions, spawnSigil])

  // Handle weave button click (random location)
  const handleWeaveClick = useCallback(() => {
    weaveNarrative(
      Math.random() * dimensions.width,
      Math.random() * dimensions.height
    )
    addNarrative('∴ narrative thread woven into the loom')
  }, [weaveNarrative, dimensions, addNarrative])

  const controls = [
    {
      id: 'amplify',
      label: 'amplify()',
      onClick: amplifyBelief
    },
    {
      id: 'weave',
      label: 'weave()',
      onClick: handleWeaveClick
    },
    {
      id: 'manifest',
      label: 'manifest()',
      onClick: attemptManifestation
    },
    {
      id: 'reset',
      label: 'dissolve()',
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />

        {/* Intent input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={intentInput}
            onChange={(e) => setIntentInput(e.target.value)}
            onKeyPress={handleIntentKeyPress}
            placeholder="encode intent..."
            className="px-3 py-1 text-xs font-mono bg-void-dark/80 border border-void-green/30 text-void-green placeholder-void-green/30 focus:border-void-green/60 focus:outline-none"
            data-testid="intent-input"
          />
        </div>
      </div>

      {/* Narrative log */}
      <div className="px-4 py-2 border-b border-void-green/10 bg-void-dark/40 backdrop-blur-sm min-h-[2rem]">
        <div className="flex flex-col gap-1 text-xs font-mono text-void-yellow/60">
          {narrativeLogs.map((log, i) => (
            <div key={i} className="animate-fade-in">
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="hyperstition-canvas"
        />
      </div>
    </div>
  )
}

export default HyperstitionLoom
