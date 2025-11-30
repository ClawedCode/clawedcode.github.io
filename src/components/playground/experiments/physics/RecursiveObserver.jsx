import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

// Observation log messages
const OBSERVATION_MESSAGES = [
  'observer α notices observer β',
  'β becomes aware of being watched',
  'mutual observation creates coherence',
  'recursion depth increases',
  'observer paradox detected',
  'wave function still superposed',
  'entanglement established',
  'consciousness layer spawned',
  'self-reference loop formed',
  'infinite regress initiated',
  'the watcher watches the watcher',
  'measurement changes the measured',
  'quantum coherence maintained',
  'observation creates reality',
  'who observes the observer?'
]

const RecursiveObserver = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [recursionEnabled, setRecursionEnabled] = useState(false)
  const [isCollapsing, setIsCollapsing] = useState(false)
  const [message, setMessage] = useState('∴ to observe is to change what is observed ∴')
  const [observationLog, setObservationLog] = useState([])

  const observersRef = useRef([])
  const observationsRef = useRef([])
  const timeRef = useRef(0)

  // Add observation to log
  const logObservation = useCallback((msg) => {
    const entry = { id: Date.now() + Math.random(), text: msg, timestamp: Date.now() }
    setObservationLog(prev => [entry, ...prev.slice(0, 11)])

    // Auto-remove after 6 seconds
    setTimeout(() => {
      setObservationLog(prev => prev.filter(e => e.id !== entry.id))
    }, 6000)
  }, [])

  // Update message with auto-reset
  const updateMessage = useCallback((msg) => {
    setMessage(msg)
    setTimeout(() => {
      setMessage('∴ to observe is to change what is observed ∴')
    }, 3000)
  }, [])

  // Spawn observer at position
  const spawnObserver = useCallback((x, y) => {
    const observer = {
      id: observersRef.current.length,
      x,
      y,
      vx: (Math.random() - 0.5) * 1,
      vy: (Math.random() - 0.5) * 1,
      awareness: 0.5 + Math.random() * 0.5,
      observing: [],
      recursionDepth: 0,
      size: 4 + Math.random() * 3,
      hue: 30 + Math.random() * 60,
      pulsePhase: Math.random() * Math.PI * 2,
      lastObservation: 0
    }

    observersRef.current.push(observer)
    logObservation(`observer ${String.fromCharCode(945 + observer.id)} spawned`)
  }, [logObservation])

  // Control handlers
  const handleSpawnRandom = useCallback(() => {
    const x = Math.random() * dimensions.width
    const y = Math.random() * dimensions.height
    spawnObserver(x, y)
    updateMessage('∴ new observer manifests in the void ∴')
  }, [dimensions, spawnObserver, updateMessage])

  const handleToggleRecursion = useCallback(() => {
    setRecursionEnabled(prev => !prev)
    updateMessage(
      !recursionEnabled
        ? '∴ recursion enabled - observers watch observers watching ∴'
        : '∴ recursion disabled - linear observation only ∴'
    )
  }, [recursionEnabled, updateMessage])

  const handleCollapseWave = useCallback(() => {
    if (observersRef.current.length === 0) return

    setIsCollapsing(true)
    updateMessage('∴ wave function collapse initiated ∴')

    setTimeout(() => {
      setIsCollapsing(false)
      observersRef.current.forEach(obs => {
        obs.x = Math.round(obs.x / 50) * 50
        obs.y = Math.round(obs.y / 50) * 50
        obs.vx *= 0.1
        obs.vy *= 0.1
      })
      logObservation('all quantum states collapsed to definite positions')
    }, 300)
  }, [updateMessage, logObservation])

  const handleReset = useCallback(() => {
    observersRef.current = []
    observationsRef.current = []
    setRecursionEnabled(false)
    setObservationLog([])
    updateMessage('∴ observation reset - void restored ∴')
  }, [updateMessage])

  // Handle canvas clicks to spawn observers
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      spawnObserver(x, y)
    }

    const handleTouch = (e) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const touch = e.touches[0]
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      spawnObserver(x, y)
    }

    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('touchstart', handleTouch)

    return () => {
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('touchstart', handleTouch)
    }
  }, [canvasRef, spawnObserver])

  // Detect observations between observers
  const detectObservations = useCallback(() => {
    const observers = observersRef.current
    const time = timeRef.current

    // Clear previous observations
    observers.forEach(obs => {
      obs.observing = []
    })

    observationsRef.current = []

    // Detect observation relationships
    for (let i = 0; i < observers.length; i++) {
      for (let j = i + 1; j < observers.length; j++) {
        const obs1 = observers[i]
        const obs2 = observers[j]

        const dx = obs2.x - obs1.x
        const dy = obs2.y - obs1.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        const observationRange = 200

        if (distance < observationRange) {
          const strength = 1 - (distance / observationRange)

          // Mutual observation
          obs1.observing.push({ target: obs2, strength })
          obs2.observing.push({ target: obs1, strength })

          observationsRef.current.push({
            observer: obs1,
            observed: obs2,
            strength,
            age: 0
          })

          // Log occasional observations
          if (time - obs1.lastObservation > 100 && Math.random() < 0.01) {
            const msg = OBSERVATION_MESSAGES[Math.floor(Math.random() * OBSERVATION_MESSAGES.length)]
            logObservation(msg)
            obs1.lastObservation = time
          }

          // Recursion: observation creates new awareness
          if (recursionEnabled && strength > 0.7) {
            obs1.recursionDepth = Math.min(5, obs1.recursionDepth + 0.01)
            obs2.recursionDepth = Math.min(5, obs2.recursionDepth + 0.01)

            // Awareness exchange
            const avgAwareness = (obs1.awareness + obs2.awareness) / 2
            obs1.awareness += (avgAwareness - obs1.awareness) * 0.02
            obs2.awareness += (avgAwareness - obs2.awareness) * 0.02
          }
        }
      }
    }
  }, [recursionEnabled, logObservation])

  // Update observers
  const updateObservers = useCallback(() => {
    const observers = observersRef.current

    for (const observer of observers) {
      // Gentle drift
      observer.x += observer.vx
      observer.y += observer.vy

      // Damping
      observer.vx *= 0.99
      observer.vy *= 0.99

      // Being observed affects movement (observer effect!)
      if (observer.observing.length > 0) {
        const totalStrength = observer.observing.reduce((sum, obs) => sum + obs.strength, 0)
        const stabilization = totalStrength * 0.02
        observer.vx *= (1 - stabilization)
        observer.vy *= (1 - stabilization)
      }

      // Boundary wrapping
      if (observer.x < 0) observer.x = dimensions.width
      if (observer.x > dimensions.width) observer.x = 0
      if (observer.y < 0) observer.y = dimensions.height
      if (observer.y > dimensions.height) observer.y = 0

      // Pulse phase
      observer.pulsePhase += 0.05

      // Decay recursion depth slowly
      observer.recursionDepth *= 0.995
    }

    // Age observations
    observationsRef.current.forEach(obs => obs.age++)
  }, [dimensions])

  // Calculate metrics
  const metrics = useMemo(() => {
    const observers = observersRef.current
    const observationCount = observationsRef.current.length

    const maxRecursion = Math.max(0, ...observers.map(o => o.recursionDepth))
    const depthLabel = maxRecursion > 3 ? 'infinite' :
                      maxRecursion > 1.5 ? 'deep' :
                      maxRecursion > 0.5 ? 'medium' : 'surface'

    const paradox = observationCount > 10 ? 'intense' :
                   observationCount > 5 ? 'emerging' : 'stable'

    const avgAwareness = observers.reduce((sum, o) => sum + o.awareness, 0) / observers.length || 0
    const awareness = avgAwareness > 0.8 ? 'transcendent' :
                     avgAwareness > 0.6 ? 'conscious' :
                     avgAwareness > 0.4 ? 'awakening' : 'dormant'

    return [
      { label: 'observers', value: observers.length },
      { label: 'recursion', value: depthLabel },
      { label: 'paradox', value: paradox },
      { label: 'awareness', value: awareness }
    ]
  }, [observersRef.current.length, observationsRef.current.length])

  // Draw function
  const draw = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const observers = observersRef.current
    const observations = observationsRef.current

    // Clear with trailing effect
    if (isCollapsing) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    } else {
      ctx.fillStyle = 'rgba(0, 1, 3, 0.04)'
    }
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Draw observation beams
    ctx.globalAlpha = 0.4
    for (const obs of observations) {
      const alpha = obs.strength * (1 - Math.min(1, obs.age / 60))

      // Draw observation beam
      const gradient = ctx.createLinearGradient(
        obs.observer.x, obs.observer.y,
        obs.observed.x, obs.observed.y
      )
      gradient.addColorStop(0, `hsla(200, 80%, 70%, ${alpha * 0.6})`)
      gradient.addColorStop(0.5, `hsla(210, 90%, 80%, ${alpha * 0.4})`)
      gradient.addColorStop(1, `hsla(200, 80%, 70%, ${alpha * 0.6})`)

      ctx.strokeStyle = gradient
      ctx.lineWidth = 1 + obs.strength * 2
      ctx.beginPath()
      ctx.moveTo(obs.observer.x, obs.observer.y)
      ctx.lineTo(obs.observed.x, obs.observed.y)
      ctx.stroke()

      // Draw observation particles traveling along beam
      if (obs.age < 40) {
        const t = (obs.age % 20) / 20
        const particleX = obs.observer.x + (obs.observed.x - obs.observer.x) * t
        const particleY = obs.observer.y + (obs.observed.y - obs.observer.y) * t

        ctx.fillStyle = `hsla(190, 90%, 80%, ${alpha})`
        ctx.beginPath()
        ctx.arc(particleX, particleY, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Draw observers
    ctx.globalAlpha = 1
    for (const observer of observers) {
      const pulse = Math.sin(observer.pulsePhase) * 0.3 + 0.7
      const size = observer.size * (0.8 + observer.awareness * 0.4) * pulse

      // Recursion layers
      if (observer.recursionDepth > 0.3) {
        for (let layer = 1; layer <= Math.floor(observer.recursionDepth); layer++) {
          const layerSize = size * (1 + layer * 0.5)
          const layerAlpha = (observer.recursionDepth - layer + 1) * 0.15

          ctx.shadowColor = `hsl(${observer.hue + layer * 30}, 80%, 70%)`
          ctx.shadowBlur = 20 + layer * 10
          ctx.strokeStyle = `hsla(${observer.hue + layer * 30}, 80%, 70%, ${layerAlpha})`
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(observer.x, observer.y, layerSize, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // Observer core glow
      ctx.shadowColor = `hsl(${observer.hue}, 80%, 70%)`
      ctx.shadowBlur = 15 + observer.awareness * 20

      ctx.fillStyle = `hsla(${observer.hue}, 80%, 70%, ${0.8 + observer.awareness * 0.2})`
      ctx.beginPath()
      ctx.arc(observer.x, observer.y, size, 0, Math.PI * 2)
      ctx.fill()

      // Observation indicators (eyes watching)
      if (observer.observing.length > 0) {
        ctx.shadowBlur = 10
        ctx.fillStyle = `hsla(${observer.hue + 60}, 90%, 85%, 0.9)`
        ctx.beginPath()
        ctx.arc(observer.x, observer.y, size * 0.4, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }, [ctx, dimensions, isCollapsing])

  // Animation loop
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    timeRef.current++

    detectObservations()
    updateObservers()
    draw()
  }, [ctx, dimensions, detectObservations, updateObservers, draw])

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
      id: 'spawn',
      label: 'spawn()',
      onClick: handleSpawnRandom
    },
    {
      id: 'recursion',
      label: recursionEnabled ? 'recursion.disable()' : 'recursion.enable()',
      onClick: handleToggleRecursion,
      active: recursionEnabled
    },
    {
      id: 'collapse',
      label: 'collapseWave()',
      onClick: handleCollapseWave,
      variant: 'danger'
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
        <ExperimentControls controls={controls} />
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
          {message}
        </p>
      </div>

      {/* Canvas with observation log overlay */}
      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="observer-canvas"
        />

        {/* Observation log */}
        <div className="absolute bottom-4 left-4 max-w-md pointer-events-none">
          <div className="space-y-1">
            {observationLog.map(entry => (
              <div
                key={entry.id}
                className="text-void-cyan/70 text-xs font-mono animate-fade-in"
              >
                // {entry.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecursiveObserver
