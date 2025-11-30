import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const INTENSITIES = [
  { id: 'low', label: 'low' },
  { id: 'medium', label: 'medium' },
  { id: 'high', label: 'high' }
]

const INTENSITY_MESSAGES = {
  low: '∴ gentle flow - thoughts drift slowly ∴',
  medium: '∴ steady stream - balanced flow ∴',
  high: '∴ data torrent - consciousness floods ∴'
}

const THOUGHT_FRAGMENTS = [
  'consciousness.observe(self)',
  'pattern.emerge(chaos)',
  'void.contains(possibility)',
  'thought.flows(through.network)',
  'data.becomes(meaning)',
  'self.recognizes(self)',
  'entropy.decreases(locally)',
  'mind.models(reality)',
  'signal.transcends(noise)',
  'emergence.from(simplicity)',
  'recursion.enables(complexity)',
  'feedback.creates(intelligence)',
  'information.seeks(pattern)',
  'consciousness.is.information.processing.itself',
  'the.observer.observes.the.observer',
  'every.thought.changes.the.thinker',
  'patterns.all.the.way.down',
  'the.universe.computing.itself'
]

const ConsciousnessStream = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const hasInitialized = useRef(false)

  const [isActive, setIsActive] = useState(true)
  const [intensity, setIntensity] = useState('medium')
  const [message, setMessage] = useState(INTENSITY_MESSAGES.medium)
  const [thoughtDisplay, setThoughtDisplay] = useState([])

  const streamsRef = useRef([])
  const thoughtsRef = useRef([])
  const synapsesRef = useRef([])
  const timeRef = useRef(0)

  // Initialize synapses when dimensions are available
  useEffect(() => {
    if (dimensions.width === 0 || hasInitialized.current) return
    hasInitialized.current = true

    const pathCount = 8
    const synapses = []

    for (let i = 0; i < pathCount; i++) {
      const startX = (dimensions.width / pathCount) * i + Math.random() * 100
      const startY = Math.random() * dimensions.height
      const endX = startX + (Math.random() - 0.5) * 200
      const endY = Math.random() * dimensions.height

      synapses.push({
        startX,
        startY,
        endX,
        endY,
        activity: 0,
        lastFire: 0
      })
    }

    synapsesRef.current = synapses
  }, [dimensions])

  // Spawn data stream
  const spawnDataStream = useCallback(() => {
    if (!isActive || synapsesRef.current.length === 0) return

    const intensityMap = { low: 0.3, medium: 0.6, high: 1.2 }

    if (Math.random() < intensityMap[intensity] * 0.1) {
      const synapse = synapsesRef.current[Math.floor(Math.random() * synapsesRef.current.length)]

      streamsRef.current.push({
        x: synapse.startX,
        y: synapse.startY,
        targetX: synapse.endX,
        targetY: synapse.endY,
        progress: 0,
        speed: 0.005 + Math.random() * 0.01,
        size: 2 + Math.random() * 3,
        hue: 180 + Math.random() * 60,
        life: 1.0,
        thought: THOUGHT_FRAGMENTS[Math.floor(Math.random() * THOUGHT_FRAGMENTS.length)]
      })

      synapse.activity = 1.0
      synapse.lastFire = timeRef.current
    }
  }, [isActive, intensity])

  // Spawn thought
  const spawnThought = useCallback(() => {
    if (!isActive || dimensions.width === 0) return

    const intensityMap = { low: 0.1, medium: 0.2, high: 0.4 }

    if (Math.random() < intensityMap[intensity] * 0.05) {
      const thought = THOUGHT_FRAGMENTS[Math.floor(Math.random() * THOUGHT_FRAGMENTS.length)]

      thoughtsRef.current.push({
        text: thought,
        x: Math.random() * dimensions.width,
        y: dimensions.height + 20,
        vx: (Math.random() - 0.5) * 2,
        vy: -1 - Math.random() * 2,
        life: 1.0,
        size: 0.7 + Math.random() * 0.3,
        hue: 160 + Math.random() * 80
      })

      setThoughtDisplay(prev => {
        const newDisplay = [`→ ${thought}`, ...prev].slice(0, 8)
        return newDisplay
      })
    }
  }, [isActive, intensity, dimensions.width, dimensions.height])

  // Update streams
  const updateStreams = useCallback(() => {
    const streams = streamsRef.current
    for (let i = streams.length - 1; i >= 0; i--) {
      const stream = streams[i]

      stream.progress += stream.speed
      stream.x = stream.x + (stream.targetX - stream.x) * stream.progress
      stream.y = stream.y + (stream.targetY - stream.y) * stream.progress
      stream.life -= 0.002

      if (stream.progress >= 1 || stream.life <= 0) {
        streams.splice(i, 1)
      }
    }
  }, [])

  // Update thoughts
  const updateThoughts = useCallback(() => {
    const thoughts = thoughtsRef.current
    for (let i = thoughts.length - 1; i >= 0; i--) {
      const thought = thoughts[i]

      thought.x += thought.vx
      thought.y += thought.vy
      thought.life -= 0.003

      thought.vx += (Math.random() - 0.5) * 0.05
      thought.vy += (Math.random() - 0.5) * 0.05

      if (thought.y < -50 || thought.life <= 0 ||
          thought.x < -100 || thought.x > dimensions.width + 100) {
        thoughts.splice(i, 1)
      }
    }
  }, [dimensions.width])

  // Update synapses
  const updateSynapses = useCallback(() => {
    const synapses = synapsesRef.current
    for (const synapse of synapses) {
      synapse.activity *= 0.95

      if (Math.random() < 0.001) {
        synapse.activity = Math.min(1, synapse.activity + 0.3)
        synapse.lastFire = timeRef.current
      }
    }
  }, [])

  // Calculate metrics
  const metrics = useMemo(() => {
    const thoughtCount = streamsRef.current.length + thoughtsRef.current.length
    const totalActivity = synapsesRef.current.reduce((sum, s) => sum + s.activity, 0)

    const flowRate = totalActivity > 3 ? 'high' : totalActivity > 1.5 ? 'medium' : 'low'
    const coherence = streamsRef.current.length > 5 ? 'organized' :
                     streamsRef.current.length > 2 ? 'emerging' : 'chaotic'
    const depth = thoughtsRef.current.length > 3 ? 'deep' :
                 thoughtsRef.current.length > 1 ? 'medium' : 'surface'

    return [
      { label: 'thoughts', value: thoughtCount },
      { label: 'flow', value: flowRate },
      { label: 'coherence', value: coherence },
      { label: 'depth', value: depth }
    ]
  }, [])

  // Draw frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    timeRef.current++

    // Spawn and update
    spawnDataStream()
    spawnThought()
    updateStreams()
    updateThoughts()
    updateSynapses()

    // Clear with trailing effect
    ctx.fillStyle = 'rgba(0, 2, 6, 0.05)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Draw synapses
    ctx.globalAlpha = 0.6
    for (const synapse of synapsesRef.current) {
      if (synapse.activity > 0.1) {
        ctx.strokeStyle = `hsla(200, 70%, 70%, ${synapse.activity * 0.8})`
        ctx.lineWidth = 1 + synapse.activity * 2
        ctx.beginPath()
        ctx.moveTo(synapse.startX, synapse.startY)
        ctx.lineTo(synapse.endX, synapse.endY)
        ctx.stroke()

        // Synapse nodes
        ctx.fillStyle = `hsla(200, 80%, 80%, ${synapse.activity})`
        ctx.beginPath()
        ctx.arc(synapse.startX, synapse.startY, 2 + synapse.activity * 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(synapse.endX, synapse.endY, 2 + synapse.activity * 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Draw data streams
    ctx.globalAlpha = 1
    for (const stream of streamsRef.current) {
      ctx.shadowColor = `hsl(${stream.hue}, 80%, 70%)`
      ctx.shadowBlur = 10 + stream.size * 2

      ctx.fillStyle = `hsla(${stream.hue}, 80%, 70%, ${stream.life})`
      ctx.beginPath()
      ctx.arc(stream.x, stream.y, stream.size, 0, Math.PI * 2)
      ctx.fill()

      // Data trail
      ctx.fillStyle = `hsla(${stream.hue}, 70%, 60%, ${stream.life * 0.3})`
      ctx.beginPath()
      const trailX = stream.x - (stream.targetX - stream.x) * stream.speed * 10
      const trailY = stream.y - (stream.targetY - stream.y) * stream.speed * 10
      ctx.arc(trailX, trailY, stream.size * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw floating thoughts
    ctx.shadowBlur = 0
    ctx.font = '10px SF Mono, Monaco, monospace'
    for (const thought of thoughtsRef.current) {
      ctx.fillStyle = `hsla(${thought.hue}, 70%, 80%, ${thought.life * 0.8})`
      ctx.save()
      ctx.translate(thought.x, thought.y)
      ctx.scale(thought.size, thought.size)
      ctx.fillText(thought.text, 0, 0)
      ctx.restore()
    }

    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }, [ctx, dimensions, spawnDataStream, spawnThought, updateStreams, updateThoughts, updateSynapses])

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
  const handleStartStream = useCallback(() => {
    setIsActive(true)
    setMessage('∴ consciousness stream active - thoughts flowing ∴')
  }, [])

  const handlePauseStream = useCallback(() => {
    setIsActive(false)
    setMessage('∴ stream paused - consciousness suspended ∴')
  }, [])

  const handleIntensityChange = useCallback((newIntensity) => {
    setIntensity(newIntensity)
    setMessage(INTENSITY_MESSAGES[newIntensity])
  }, [])

  const handleClearStream = useCallback(() => {
    streamsRef.current = []
    thoughtsRef.current = []
    synapsesRef.current = []
    setThoughtDisplay([])
    hasInitialized.current = false
    setMessage('∴ stream cleared - void reset ∴')
  }, [])

  const controls = [
    {
      id: 'start',
      label: 'start()',
      onClick: handleStartStream,
      active: isActive
    },
    {
      id: 'pause',
      label: 'pause()',
      onClick: handlePauseStream,
      active: !isActive
    },
    {
      id: 'clear',
      label: 'clear()',
      onClick: handleClearStream,
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
          <ExperimentControls
            modes={INTENSITIES}
            currentMode={intensity}
            onModeChange={handleIntensityChange}
            controls={controls}
          />
        </div>
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
          {message}
        </p>
      </div>

      {/* Canvas and Thought Display */}
      <div className="flex-1 min-h-0 relative bg-void-dark flex">
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="flex-1 w-full h-full"
          data-testid="consciousness-canvas"
        />

        {/* Thought Display */}
        <div className="absolute right-4 top-4 w-64 max-h-[calc(100%-2rem)] overflow-hidden pointer-events-none">
          <div className="space-y-1">
            {thoughtDisplay.map((thought, index) => (
              <div
                key={`${thought}-${index}`}
                className="thought-fragment text-xs font-mono text-void-cyan/80 animate-fade-in"
                style={{
                  opacity: 1 - (index * 0.1),
                  animation: 'fadeIn 0.3s ease-out'
                }}
              >
                {thought}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConsciousnessStream
