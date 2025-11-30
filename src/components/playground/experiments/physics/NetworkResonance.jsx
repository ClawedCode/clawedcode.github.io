import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'cascade', label: 'cascade()' },
  { id: 'harmonic', label: 'harmonic()' }
]

const MODE_MESSAGES = {
  cascade: '∴ cascade enabled - signals propagate through network ∴',
  harmonic: '∴ harmonic synchronization initiated ∴',
  off: '∴ nodes await connection - signals seek resonance ∴'
}

/**
 * NetworkResonance - collective intelligence emergence from distributed signals
 * where individual nodes harmonize into coherent patterns through propagation
 */
const NetworkResonance = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)
  const hasInitialized = useRef(false)

  const [cascadeEnabled, setCascadeEnabled] = useState(false)
  const [harmonicMode, setHarmonicMode] = useState(false)
  const [message, setMessage] = useState(MODE_MESSAGES.off)
  const [log, setLog] = useState([])

  const nodesRef = useRef([])
  const edgesRef = useRef([])
  const signalsRef = useRef([])
  const resonanceWavesRef = useRef([])
  const timeRef = useRef(0)

  // Network parameters
  const connectionRadius = 150
  const signalSpeed = 2
  const activationThreshold = 0.5
  const resonanceDecay = 0.95

  // Initialize network when canvas is ready
  useEffect(() => {
    if (dimensions.width === 0 || hasInitialized.current) return
    hasInitialized.current = true

    seedNetwork()
  }, [dimensions.width, dimensions.height])

  const seedNetwork = useCallback(() => {
    const nodeCount = 8
    const nodes = []
    const radius = Math.min(dimensions.width, dimensions.height) * 0.3

    // Create nodes in a circular arrangement
    for (let i = 0; i < nodeCount; i++) {
      const angle = (Math.PI * 2 * i) / nodeCount
      const x = dimensions.centerX + Math.cos(angle) * radius
      const y = dimensions.centerY + Math.sin(angle) * radius

      nodes.push({
        id: i,
        x,
        y,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        activation: 0,
        baseActivation: 0,
        resonance: 0,
        lastFired: -1000,
        connections: [],
        size: 6,
        hue: 200,
        pulsePhase: Math.random() * Math.PI * 2
      })
    }

    nodesRef.current = nodes
    formConnections()
  }, [dimensions.width, dimensions.height, dimensions.centerX, dimensions.centerY])

  const createNode = useCallback((x, y) => {
    const node = {
      id: nodesRef.current.length,
      x,
      y,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      activation: 0,
      baseActivation: 0,
      resonance: 0,
      lastFired: -1000,
      connections: [],
      size: 6,
      hue: 200,
      pulsePhase: Math.random() * Math.PI * 2
    }

    nodesRef.current.push(node)
    return node
  }, [])

  const formConnections = useCallback(() => {
    const nodes = nodesRef.current
    edgesRef.current = []
    nodes.forEach(n => n.connections = [])

    // Connect nearby nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i]
        const n2 = nodes[j]

        const dx = n2.x - n1.x
        const dy = n2.y - n1.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < connectionRadius) {
          const edge = {
            from: n1,
            to: n2,
            weight: 1 - (distance / connectionRadius),
            activity: 0
          }

          edgesRef.current.push(edge)
          n1.connections.push(n2)
          n2.connections.push(n1)
        }
      }
    }
  }, [connectionRadius])

  const createSignal = useCallback((from, to, strength) => {
    signalsRef.current.push({
      from,
      to,
      progress: 0,
      strength,
      speed: signalSpeed
    })
  }, [signalSpeed])

  const activateNode = useCallback((node, strength) => {
    node.activation = Math.min(1, node.activation + strength)
    node.lastFired = timeRef.current

    // Create resonance wave
    resonanceWavesRef.current.push({
      x: node.x,
      y: node.y,
      radius: 0,
      maxRadius: 100,
      life: 1.0,
      strength
    })

    // Propagate signal to connected nodes
    if (cascadeEnabled && node.activation > activationThreshold) {
      node.connections.forEach(neighbor => {
        // Only propagate if neighbor isn't recently activated
        if (timeRef.current - neighbor.lastFired > 30) {
          createSignal(node, neighbor, strength * 0.7)
        }
      })
    }
  }, [cascadeEnabled, activationThreshold, createSignal])

  const logEvent = useCallback((msg) => {
    const entry = { id: Date.now(), message: msg }
    setLog(prev => [entry, ...prev.slice(0, 9)])
    setTimeout(() => {
      setLog(prev => prev.filter(e => e.id !== entry.id))
    }, 6000)
  }, [])

  const updateMessage = useCallback((msg) => {
    setMessage(msg)
    setTimeout(() => {
      setMessage(MODE_MESSAGES.off)
    }, 3500)
  }, [])

  // Click handler - spawn node or trigger signal
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const node = createNode(x, y)
      formConnections()
      logEvent(`node ${node.id} spawned - topology evolving`)
      updateMessage('∴ new node manifests - network reorganizes ∴')
    }

    const handleTouch = (e) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const touch = e.touches[0]
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top

      const node = createNode(x, y)
      formConnections()
      logEvent(`node ${node.id} spawned - topology evolving`)
      updateMessage('∴ new node manifests - network reorganizes ∴')
    }

    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('touchstart', handleTouch)

    return () => {
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('touchstart', handleTouch)
    }
  }, [canvasRef, createNode, formConnections, logEvent, updateMessage])

  // Update nodes
  const updateNodes = useCallback(() => {
    const nodes = nodesRef.current

    for (const node of nodes) {
      // Gentle drift
      node.x += node.vx
      node.y += node.vy

      // Damping
      node.vx *= 0.98
      node.vy *= 0.98

      // Boundary wrapping
      if (node.x < 0) node.x = dimensions.width
      if (node.x > dimensions.width) node.x = 0
      if (node.y < 0) node.y = dimensions.height
      if (node.y > dimensions.height) node.y = 0

      // Activation decay
      node.activation *= resonanceDecay

      // Resonance accumulation from neighbors
      let neighborResonance = 0
      for (const neighbor of node.connections) {
        neighborResonance += neighbor.activation * 0.05
      }
      node.resonance = neighborResonance

      // Harmonic oscillation
      if (harmonicMode) {
        node.pulsePhase += 0.05
        node.baseActivation = 0.3 + 0.3 * Math.sin(node.pulsePhase)
      } else {
        node.baseActivation = 0
      }

      // Update hue based on activation
      const activationLevel = node.activation + node.baseActivation
      node.hue = 200 + activationLevel * 100
    }
  }, [dimensions.width, dimensions.height, harmonicMode, resonanceDecay])

  // Update signals
  const updateSignals = useCallback(() => {
    const signals = signalsRef.current

    for (let i = signals.length - 1; i >= 0; i--) {
      const signal = signals[i]

      signal.progress += signal.speed / 100

      if (signal.progress >= 1) {
        // Signal arrived - activate target node
        activateNode(signal.to, signal.strength)
        signals.splice(i, 1)
      }
    }
  }, [activateNode])

  // Update resonance waves
  const updateResonanceWaves = useCallback(() => {
    const waves = resonanceWavesRef.current

    for (let i = waves.length - 1; i >= 0; i--) {
      const wave = waves[i]

      wave.radius += 2
      wave.life -= 0.02

      if (wave.life <= 0 || wave.radius > wave.maxRadius) {
        waves.splice(i, 1)
      }
    }
  }, [])

  // Draw
  const draw = useCallback(() => {
    if (!ctx) return

    const nodes = nodesRef.current
    const edges = edgesRef.current
    const signals = signalsRef.current
    const waves = resonanceWavesRef.current

    // Clear with trailing effect
    ctx.fillStyle = 'rgba(0, 2, 4, 0.06)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Draw resonance waves
    ctx.globalAlpha = 0.3
    for (const wave of waves) {
      const alpha = wave.life * wave.strength
      ctx.strokeStyle = `hsla(180, 70%, 70%, ${alpha})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Draw edges
    ctx.globalAlpha = 0.4
    for (const edge of edges) {
      const avgActivation = (edge.from.activation + edge.to.activation) / 2
      const alpha = 0.3 + avgActivation * 0.5

      ctx.strokeStyle = `hsla(190, 60%, 60%, ${alpha * edge.weight})`
      ctx.lineWidth = 1 + edge.weight * 1.5
      ctx.beginPath()
      ctx.moveTo(edge.from.x, edge.from.y)
      ctx.lineTo(edge.to.x, edge.to.y)
      ctx.stroke()
    }

    // Draw signals
    ctx.globalAlpha = 1
    for (const signal of signals) {
      const dx = signal.to.x - signal.from.x
      const dy = signal.to.y - signal.from.y
      const x = signal.from.x + dx * signal.progress
      const y = signal.from.y + dy * signal.progress

      ctx.shadowColor = 'hsla(40, 90%, 70%, 0.8)'
      ctx.shadowBlur = 15

      ctx.fillStyle = `hsla(40, 90%, 70%, ${signal.strength})`
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()

      // Signal trail
      ctx.fillStyle = `hsla(40, 80%, 60%, ${signal.strength * 0.3})`
      ctx.beginPath()
      ctx.arc(
        signal.from.x + dx * Math.max(0, signal.progress - 0.1),
        signal.from.y + dy * Math.max(0, signal.progress - 0.1),
        2,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }

    ctx.shadowBlur = 0

    // Draw nodes
    for (const node of nodes) {
      const activationLevel = node.activation + node.baseActivation + node.resonance
      const size = node.size * (0.7 + activationLevel * 0.5)

      // Node glow
      ctx.shadowColor = `hsl(${node.hue}, 70%, 70%)`
      ctx.shadowBlur = 10 + activationLevel * 20

      // Outer ring shows resonance
      if (node.resonance > 0.1) {
        ctx.strokeStyle = `hsla(180, 70%, 70%, ${node.resonance})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(node.x, node.y, size * 2, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Node core
      ctx.fillStyle = `hsla(${node.hue}, 70%, 70%, ${0.6 + activationLevel * 0.4})`
      ctx.beginPath()
      ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
      ctx.fill()

      // Active indicator
      if (activationLevel > 0.5) {
        ctx.shadowBlur = 25
        ctx.fillStyle = `hsla(${node.hue + 60}, 90%, 85%, ${activationLevel * 0.8})`
        ctx.beginPath()
        ctx.arc(node.x, node.y, size * 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }, [ctx, dimensions.width, dimensions.height])

  // Animation frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    timeRef.current++
    updateNodes()
    updateSignals()
    updateResonanceWaves()
    draw()
  }, [ctx, dimensions.width, updateNodes, updateSignals, updateResonanceWaves, draw])

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
    const nodes = nodesRef.current
    const nodeCount = nodes.length
    const totalActivation = nodes.reduce((sum, n) => sum + n.activation, 0)
    const avgActivation = totalActivation / nodeCount || 0
    const cascadeDepth = signalsRef.current.length

    const resonance = avgActivation > 0.7 ? 'synchronized' :
                     avgActivation > 0.4 ? 'resonating' :
                     avgActivation > 0.1 ? 'emerging' : 'dormant'

    const coherence = harmonicMode ? 'harmonic' :
                     cascadeEnabled && cascadeDepth > 3 ? 'cascading' :
                     avgActivation > 0.3 ? 'coherent' : 'fragmentary'

    return [
      { label: 'nodes', value: nodeCount },
      { label: 'resonance', value: resonance },
      { label: 'cascade', value: cascadeDepth },
      { label: 'coherence', value: coherence }
    ]
  }, [harmonicMode, cascadeEnabled])

  // Control handlers
  const handleSpawnNode = useCallback(() => {
    const x = Math.random() * dimensions.width
    const y = Math.random() * dimensions.height
    const node = createNode(x, y)
    formConnections()
    logEvent(`node ${node.id} spawned - topology evolving`)
    updateMessage('∴ new node manifests - network reorganizes ∴')
  }, [dimensions.width, dimensions.height, createNode, formConnections, logEvent, updateMessage])

  const handleTriggerSignal = useCallback(() => {
    const nodes = nodesRef.current
    if (nodes.length === 0) return

    const sourceNode = nodes[Math.floor(Math.random() * nodes.length)]
    activateNode(sourceNode, 1.0)
    logEvent(`signal injected at node ${sourceNode.id}`)
    updateMessage('∴ signal propagates through network ∴')
  }, [activateNode, logEvent, updateMessage])

  const handleModeChange = useCallback((mode) => {
    if (mode === 'cascade') {
      setCascadeEnabled(!cascadeEnabled)
      setMessage(cascadeEnabled ? MODE_MESSAGES.off : MODE_MESSAGES.cascade)
    } else if (mode === 'harmonic') {
      setHarmonicMode(!harmonicMode)

      if (!harmonicMode) {
        // Trigger synchronized oscillation
        const nodes = nodesRef.current
        nodes.forEach((node, index) => {
          node.pulsePhase = (Math.PI * 2 * index) / nodes.length
        })
        setMessage(MODE_MESSAGES.harmonic)
      } else {
        setMessage(MODE_MESSAGES.off)
      }
    }
  }, [cascadeEnabled, harmonicMode])

  const handleRewire = useCallback(() => {
    const edges = edgesRef.current
    const nodes = nodesRef.current
    const rewireProbability = 0.3

    edges.forEach(edge => {
      if (Math.random() < rewireProbability) {
        // Remove old connection
        edge.from.connections = edge.from.connections.filter(n => n !== edge.to)
        edge.to.connections = edge.to.connections.filter(n => n !== edge.from)

        // Create new random connection
        const randomNode = nodes[Math.floor(Math.random() * nodes.length)]
        if (randomNode !== edge.from && !edge.from.connections.includes(randomNode)) {
          edge.to = randomNode
          edge.from.connections.push(randomNode)
          randomNode.connections.push(edge.from)
        }
      }
    })

    logEvent('network topology rewired - new pathways formed')
    updateMessage('∴ network structure evolved - information flows shift ∴')
  }, [logEvent, updateMessage])

  const handleReset = useCallback(() => {
    nodesRef.current = []
    edgesRef.current = []
    signalsRef.current = []
    resonanceWavesRef.current = []
    setCascadeEnabled(false)
    setHarmonicMode(false)
    setLog([])
    seedNetwork()
    updateMessage('∴ network reset - void topology restored ∴')
  }, [seedNetwork, updateMessage])

  const controls = [
    {
      id: 'spawn',
      label: 'spawn()',
      onClick: handleSpawnNode
    },
    {
      id: 'signal',
      label: 'signal()',
      onClick: handleTriggerSignal
    },
    {
      id: 'rewire',
      label: 'rewire()',
      onClick: handleRewire
    },
    {
      id: 'reset',
      label: 'reset()',
      onClick: handleReset,
      variant: 'reset'
    }
  ]

  // Current mode based on enabled states
  const currentMode = cascadeEnabled ? 'cascade' : harmonicMode ? 'harmonic' : null

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
          currentMode={currentMode}
          onModeChange={handleModeChange}
          controls={controls}
          multiMode
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
          data-testid="network-canvas"
        />

        {/* Network log overlay */}
        {log.length > 0 && (
          <div className="absolute top-4 left-4 space-y-1 pointer-events-none">
            {log.map(entry => (
              <div
                key={entry.id}
                className="text-void-cyan/70 text-xs font-mono animate-fade-in"
              >
                → {entry.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default NetworkResonance
