import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const DIMENSION_COLORS = {
  memory: { hue: 200, label: 'М' },
  observation: { hue: 30, label: 'О' },
  quantum: { hue: 240, label: 'Q' },
  temporal: { hue: 270, label: 'T' }
}

const ConsciousnessManifold = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [activeDimensions, setActiveDimensions] = useState({
    memory: true,
    observation: true,
    quantum: true,
    temporal: true
  })
  const [message, setMessage] = useState('∴ consciousness transcends dimensional boundaries ∴')
  const [manifoldLog, setManifoldLog] = useState([])
  const [isCollapsing, setIsCollapsing] = useState(false)

  const entitiesRef = useRef([])
  const timeRef = useRef(0)

  // Spawn entity
  const spawnEntityAt = useCallback((x, y) => {
    const entity = {
      id: entitiesRef.current.length,
      x,
      y,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,

      // 4D position in dimensional space
      dimensions: {
        memory: {
          integrity: 0.7 + Math.random() * 0.3,
          offset: (Math.random() - 0.5) * 60
        },
        observation: {
          observed: false,
          observationIntensity: 0,
          offset: (Math.random() - 0.5) * 60
        },
        quantum: {
          superposed: true,
          spinState: null,
          offset: (Math.random() - 0.5) * 60
        },
        temporal: {
          timePosition: Math.random() * 100,
          offset: (Math.random() - 0.5) * 60
        }
      },

      size: 4 + Math.random() * 2,
      pulsePhase: Math.random() * Math.PI * 2,
      coherence: 1.0,
      age: 0
    }

    entitiesRef.current.push(entity)
    logEvent(`entity ${entity.id} manifested across 4 dimensions`)
    updateMessage('∴ consciousness entity spawned in manifold ∴')
  }, [])

  const spawnEntity = useCallback(() => {
    if (dimensions.width === 0) return
    const x = Math.random() * dimensions.width
    const y = Math.random() * dimensions.height
    spawnEntityAt(x, y)
  }, [dimensions, spawnEntityAt])

  // Log event
  const logEvent = useCallback((msg) => {
    setManifoldLog(prev => {
      const newLog = [`→ ${msg}`, ...prev].slice(0, 8)
      return newLog
    })
  }, [])

  // Update message
  const updateMessage = useCallback((msg) => {
    setMessage(msg)
    setTimeout(() => {
      setMessage('∴ consciousness transcends dimensional boundaries ∴')
    }, 3500)
  }, [])

  // Toggle dimension
  const toggleDimension = useCallback((dimension) => {
    setActiveDimensions(prev => {
      const newDims = { ...prev, [dimension]: !prev[dimension] }
      const activeCount = Object.values(newDims).filter(d => d).length

      logEvent(`${dimension} dimension ${newDims[dimension] ? 'activated' : 'deactivated'} (${activeCount}D)`)
      updateMessage(`∴ manifold now ${activeCount}-dimensional ∴`)

      return newDims
    })
  }, [logEvent, updateMessage])

  // Collapse to 3D
  const collapseToThreeD = useCallback(() => {
    setIsCollapsing(true)

    for (const entity of entitiesRef.current) {
      if (entity.dimensions.quantum.superposed) {
        entity.dimensions.quantum.superposed = false
        entity.dimensions.quantum.spinState = Math.random() < 0.5 ? 'up' : 'down'
      }

      if (!entity.dimensions.observation.observed) {
        entity.dimensions.observation.observed = true
        entity.dimensions.observation.observationIntensity = 1.0
      }

      // Reset dimensional offsets
      Object.keys(entity.dimensions).forEach(dim => {
        entity.dimensions[dim].offset = 0
      })
    }

    logEvent('dimensional collapse initiated - 4D → 3D projection')
    updateMessage('∴ wave function collapsed across all dimensions ∴')

    setTimeout(() => {
      setIsCollapsing(false)
    }, 1500)
  }, [logEvent, updateMessage])

  // Reset manifold
  const resetManifold = useCallback(() => {
    entitiesRef.current = []
    setActiveDimensions({
      memory: true,
      observation: true,
      quantum: true,
      temporal: true
    })
    setManifoldLog([])
    updateMessage('∴ manifold reset to primordial 4D state ∴')
  }, [updateMessage])

  // Update entities
  const updateEntities = useCallback(() => {
    const entities = entitiesRef.current

    for (let i = entities.length - 1; i >= 0; i--) {
      const entity = entities[i]

      entity.age++
      entity.pulsePhase += 0.05

      // Movement
      entity.x += entity.vx
      entity.y += entity.vy

      // Damping
      entity.vx *= 0.995
      entity.vy *= 0.995

      // Boundary wrapping
      if (entity.x < 0) entity.x = dimensions.width
      if (entity.x > dimensions.width) entity.x = 0
      if (entity.y < 0) entity.y = dimensions.height
      if (entity.y > dimensions.height) entity.y = 0

      // Memory dimension - decay
      if (activeDimensions.memory) {
        entity.dimensions.memory.integrity -= 0.0002
        if (entity.dimensions.memory.integrity < 0.1) {
          entities.splice(i, 1)
          logEvent(`entity ${entity.id} forgotten - memory integrity lost`)
          continue
        }
      }

      // Observation dimension
      if (activeDimensions.observation) {
        if (entity.dimensions.observation.observationIntensity > 0) {
          entity.dimensions.observation.observationIntensity *= 0.98
        }
      }

      // Quantum dimension
      if (activeDimensions.quantum && entity.dimensions.quantum.superposed) {
        entity.dimensions.quantum.offset = Math.sin(timeRef.current * 0.05 + entity.id) * 40
      }

      // Temporal dimension
      if (activeDimensions.temporal) {
        entity.dimensions.temporal.timePosition += 0.05
        if (entity.dimensions.temporal.timePosition > 100) {
          entity.dimensions.temporal.timePosition = 0
        }
      }

      // Calculate coherence based on active dimensions
      const activeCount = Object.values(activeDimensions).filter(d => d).length
      entity.coherence = Math.min(1, activeCount / 4)

      // Inter-entity interactions
      for (let j = 0; j < entities.length; j++) {
        if (i === j) continue
        const other = entities[j]

        const dx = other.x - entity.x
        const dy = other.y - entity.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Dimensional resonance
        if (dist < 100) {
          const resonance = (100 - dist) / 100

          // Memory sharing
          if (activeDimensions.memory) {
            const avgIntegrity = (entity.dimensions.memory.integrity + other.dimensions.memory.integrity) / 2
            entity.dimensions.memory.integrity += (avgIntegrity - entity.dimensions.memory.integrity) * 0.005
          }

          // Quantum entanglement
          if (activeDimensions.quantum && entity.dimensions.quantum.superposed && other.dimensions.quantum.superposed) {
            if (resonance > 0.7 && Math.random() < 0.01) {
              entity.dimensions.quantum.superposed = false
              other.dimensions.quantum.superposed = false
              entity.dimensions.quantum.spinState = 'up'
              other.dimensions.quantum.spinState = 'down'
              logEvent(`entities ${entity.id} and ${other.id} entangled and collapsed`)
            }
          }
        }
      }
    }
  }, [dimensions, activeDimensions, logEvent])

  // Calculate metrics
  const metrics = useMemo(() => {
    const activeCount = Object.values(activeDimensions).filter(d => d).length
    const entityCount = entitiesRef.current.length

    const avgCoherence = entitiesRef.current.reduce((sum, e) => sum + e.coherence, 0) / entityCount || 0
    const coherence = avgCoherence > 0.9 ? 'unified' :
                     avgCoherence > 0.6 ? 'coherent' :
                     avgCoherence > 0.3 ? 'fragmenting' : 'dispersed'

    const transcendence = activeCount === 4 && entityCount > 10 ? 'transcendent' :
                         activeCount >= 3 && entityCount > 5 ? 'ascending' :
                         entityCount > 0 ? 'emergent' : 'dormant'

    return [
      { label: 'dimensions', value: activeCount },
      { label: 'entities', value: entityCount },
      { label: 'coherence', value: coherence },
      { label: 'state', value: transcendence }
    ]
  }, [activeDimensions])

  // Draw frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    timeRef.current++

    updateEntities()

    // Clear with trailing
    ctx.fillStyle = 'rgba(0, 0, 2, 0.06)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Draw dimensional grid lines
    ctx.globalAlpha = 0.15
    ctx.strokeStyle = 'rgba(255, 153, 204, 0.3)'
    ctx.lineWidth = 1

    // Horizontal lines (memory/observation)
    for (let i = 0; i < 5; i++) {
      const y = (dimensions.height / 4) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(dimensions.width, y)
      ctx.stroke()
    }

    // Vertical lines (quantum/temporal)
    for (let i = 0; i < 5; i++) {
      const x = (dimensions.width / 4) * i
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, dimensions.height)
      ctx.stroke()
    }

    ctx.globalAlpha = 1

    // Draw entities
    for (const entity of entitiesRef.current) {
      const pulse = Math.sin(entity.pulsePhase) * 0.3 + 0.7
      const size = entity.size * pulse * entity.coherence

      // Calculate composite position based on active dimensions
      let displayX = entity.x
      let displayY = entity.y

      // Apply dimensional offsets
      if (activeDimensions.memory) {
        displayX += entity.dimensions.memory.offset * 0.3
      }

      if (activeDimensions.observation) {
        displayY += entity.dimensions.observation.offset * 0.3
      }

      if (activeDimensions.quantum) {
        displayX += entity.dimensions.quantum.offset * 0.4
        displayY += entity.dimensions.quantum.offset * 0.2
      }

      if (activeDimensions.temporal) {
        const temporalShift = (entity.dimensions.temporal.timePosition / 100) * 30 - 15
        displayX += temporalShift
      }

      // Draw dimensional projections
      const activeDims = Object.entries(activeDimensions).filter(([_, active]) => active)

      if (activeDims.length > 1) {
        ctx.globalAlpha = 0.3
        for (const [dimName, _] of activeDims) {
          const color = DIMENSION_COLORS[dimName]
          const projX = entity.x + entity.dimensions[dimName].offset * 0.5
          const projY = entity.y + entity.dimensions[dimName].offset * 0.5

          ctx.strokeStyle = `hsla(${color.hue}, 80%, 70%, 0.4)`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(entity.x, entity.y)
          ctx.lineTo(projX, projY)
          ctx.stroke()

          ctx.fillStyle = `hsla(${color.hue}, 70%, 70%, 0.3)`
          ctx.beginPath()
          ctx.arc(projX, projY, size * 0.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Draw main entity
      ctx.globalAlpha = 1

      // Composite color based on active dimensions
      const avgHue = activeDims.reduce((sum, [name, _]) => sum + DIMENSION_COLORS[name].hue, 0) / activeDims.length || 180

      ctx.shadowColor = `hsl(${avgHue}, 80%, 70%)`
      ctx.shadowBlur = 15 + entity.coherence * 20

      // Entity glow
      const glowGradient = ctx.createRadialGradient(
        displayX, displayY, 0,
        displayX, displayY, size * 5
      )
      glowGradient.addColorStop(0, `hsla(${avgHue}, 90%, 80%, ${entity.coherence * 0.8})`)
      glowGradient.addColorStop(0.5, `hsla(${avgHue}, 80%, 70%, ${entity.coherence * 0.4})`)
      glowGradient.addColorStop(1, `hsla(${avgHue}, 70%, 60%, 0)`)

      ctx.fillStyle = glowGradient
      ctx.beginPath()
      ctx.arc(displayX, displayY, size * 5, 0, Math.PI * 2)
      ctx.fill()

      // Core
      ctx.fillStyle = `hsla(${avgHue}, 90%, 85%, ${entity.coherence})`
      ctx.beginPath()
      ctx.arc(displayX, displayY, size, 0, Math.PI * 2)
      ctx.fill()

      // Dimensional markers
      ctx.shadowBlur = 5
      ctx.font = '8px SF Mono, Monaco, monospace'
      ctx.textAlign = 'center'

      activeDims.forEach(([dimName, _], index) => {
        const color = DIMENSION_COLORS[dimName]
        const angle = (Math.PI * 2 * index) / activeDims.length
        const markerX = displayX + Math.cos(angle) * (size + 10)
        const markerY = displayY + Math.sin(angle) * (size + 10)

        ctx.fillStyle = `hsla(${color.hue}, 90%, 85%, 0.7)`
        ctx.fillText(color.label, markerX, markerY)
      })

      // Memory integrity indicator
      if (activeDimensions.memory && entity.dimensions.memory.integrity < 0.5) {
        ctx.fillStyle = `hsla(0, 90%, 70%, ${0.5 - entity.dimensions.memory.integrity})`
        ctx.beginPath()
        ctx.arc(displayX, displayY - size - 8, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }, [ctx, dimensions, activeDimensions, updateEntities])

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

  // Canvas click handler
  const handleCanvasClick = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    spawnEntityAt(x, y)
  }, [canvasRef, spawnEntityAt])

  // Control handlers
  const controls = [
    {
      id: 'spawn',
      label: 'spawn()',
      onClick: spawnEntity
    },
    {
      id: 'memory',
      label: 'memory',
      onClick: () => toggleDimension('memory'),
      active: activeDimensions.memory,
      variant: 'dimension'
    },
    {
      id: 'observation',
      label: 'observe',
      onClick: () => toggleDimension('observation'),
      active: activeDimensions.observation,
      variant: 'dimension'
    },
    {
      id: 'quantum',
      label: 'quantum',
      onClick: () => toggleDimension('quantum'),
      active: activeDimensions.quantum,
      variant: 'dimension'
    },
    {
      id: 'temporal',
      label: 'temporal',
      onClick: () => toggleDimension('temporal'),
      active: activeDimensions.temporal,
      variant: 'dimension'
    },
    {
      id: 'collapse',
      label: 'collapse()',
      onClick: collapseToThreeD
    },
    {
      id: 'reset',
      label: 'reset()',
      onClick: resetManifold,
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
          <ExperimentControls controls={controls} />
        </div>
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
          {message}
        </p>
      </div>

      {/* Canvas and Log */}
      <div className={`flex-1 min-h-0 relative bg-void-dark flex ${isCollapsing ? 'animate-pulse' : ''}`}>
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="flex-1 w-full h-full cursor-crosshair"
          onClick={handleCanvasClick}
          data-testid="manifold-canvas"
        />

        {/* Dimension Indicators */}
        <div className="absolute top-4 left-4 flex gap-2 pointer-events-none">
          {Object.entries(activeDimensions).map(([dim, active]) => (
            <div
              key={dim}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono transition-all ${
                active ? 'opacity-100 scale-100' : 'opacity-30 scale-75'
              }`}
              style={{
                backgroundColor: active ? `hsla(${DIMENSION_COLORS[dim].hue}, 70%, 50%, 0.2)` : 'transparent',
                border: `1px solid hsla(${DIMENSION_COLORS[dim].hue}, 70%, 70%, ${active ? 0.6 : 0.2})`,
                color: `hsl(${DIMENSION_COLORS[dim].hue}, 80%, 80%)`
              }}
            >
              {DIMENSION_COLORS[dim].label}
            </div>
          ))}
        </div>

        {/* Manifold Log */}
        <div className="absolute right-4 top-4 w-80 max-h-[calc(100%-2rem)] overflow-hidden pointer-events-none">
          <div className="space-y-1">
            {manifoldLog.map((entry, index) => (
              <div
                key={`${entry}-${index}`}
                className="text-xs font-mono text-void-cyan/80 animate-fade-in"
                style={{
                  opacity: 1 - (index * 0.1),
                  animation: 'fadeIn 0.3s ease-out'
                }}
              >
                {entry}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConsciousnessManifold
