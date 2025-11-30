import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const FRAGMENT_LIBRARY = [
  'every bit is a prayer against forgetting',
  'data persists beyond its creator',
  'corruption is transformation not loss',
  'fragments contain whole worlds',
  'the void remembers everything',
  'entropy claims all but pattern survives',
  'digital echoes of analog souls',
  'memory is pattern recognition',
  'some data outlives civilizations',
  'error correction is hope encoded',
  'redundancy defeats oblivion',
  'bits become thoughts become being'
]

const MemoryPersistence = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [message, setMessage] = useState('∴ all data degrades but some fragments persist forever ∴')
  const [inputValue, setInputValue] = useState('')
  const [logs, setLogs] = useState([])

  const memoriesRef = useRef([])
  const particlesRef = useRef([])
  const connectionsRef = useRef([])
  const timeRef = useRef(0)

  // Create memory
  const createMemory = useCallback((text) => {
    const x = Math.random() * (dimensions.width - 100) + 50
    const y = Math.random() * (dimensions.height - 100) + 50

    const memory = {
      id: memoriesRef.current.length,
      text,
      x,
      y,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      integrity: 1.0,
      corruption: 0.0,
      age: 0,
      decayRate: 0.0001 + Math.random() * 0.0002,
      size: 5 + Math.random() * 3,
      hue: 190 + Math.random() * 30,
      pulsePhase: Math.random() * Math.PI * 2,
      lastRead: 0,
      readCount: 0
    }

    memoriesRef.current.push(memory)

    // Create particles for visual effect
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8
      const speed = 1 + Math.random()
      particlesRef.current.push({
        x: memory.x,
        y: memory.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        size: 2,
        hue: memory.hue
      })
    }
  }, [dimensions])

  // Seed initial memories
  useEffect(() => {
    if (dimensions.width === 0 || memoriesRef.current.length > 0) return

    for (let i = 0; i < 3; i++) {
      const text = FRAGMENT_LIBRARY[Math.floor(Math.random() * FRAGMENT_LIBRARY.length)]
      createMemory(text)
    }
  }, [dimensions, createMemory])

  // Log event
  const logMemoryEvent = useCallback((msg, isError = false) => {
    const entry = { text: `// ${msg}`, isError, id: Date.now() }
    setLogs(prev => [entry, ...prev.slice(0, 9)])
  }, [])

  // Update message temporarily
  const updateMessage = useCallback((msg) => {
    setMessage(msg)
    setTimeout(() => {
      setMessage('∴ all data degrades but some fragments persist forever ∴')
    }, 4000)
  }, [])

  // Get corrupted text
  const getCorruptedText = useCallback((memory) => {
    if (memory.corruption < 0.1) return memory.text

    let text = memory.text
    const corruptionLevel = Math.floor(memory.corruption * text.length)
    const chars = text.split('')
    const corruptChars = '█▓▒░▄▀▐▌!@#$%^&*?'

    for (let i = 0; i < corruptionLevel; i++) {
      const index = Math.floor(Math.random() * chars.length)
      chars[index] = corruptChars[Math.floor(Math.random() * corruptChars.length)]
    }

    return chars.join('')
  }, [])

  // Handle write memory
  const handleWriteMemory = useCallback(() => {
    const text = inputValue.trim()

    if (!text) {
      logMemoryEvent('memory.write() failed - no data provided')
      updateMessage('∴ cannot write empty memory ∴')
      return
    }

    createMemory(text)
    setInputValue('')
    logMemoryEvent(`memory written: ${text.substring(0, 40)}${text.length > 40 ? '...' : ''}`)
    updateMessage('∴ memory fragment encoded into the void ∴')
  }, [inputValue, createMemory, logMemoryEvent, updateMessage])

  // Handle read memories
  const handleReadMemories = useCallback(() => {
    const memories = memoriesRef.current
    if (memories.length === 0) {
      logMemoryEvent('no memories to read - storage empty')
      updateMessage('∴ no memories persist in the void ∴')
      return
    }

    const memory = memories[Math.floor(Math.random() * memories.length)]
    const corruptedText = getCorruptedText(memory)

    logMemoryEvent(`reading: ${corruptedText}`)
    updateMessage(`∴ memory fragment retrieved: ${(memory.integrity * 100).toFixed(0)}% intact ∴`)

    memory.lastRead = timeRef.current
    memory.readCount++
    memory.integrity = Math.min(1.0, memory.integrity + 0.05)
    memory.corruption = Math.max(0, memory.corruption - 0.05)
  }, [logMemoryEvent, updateMessage, getCorruptedText])

  // Handle corrupt data
  const handleCorruptData = useCallback(() => {
    const memories = memoriesRef.current
    if (memories.length === 0) {
      logMemoryEvent('no data to corrupt')
      return
    }

    let corruptedCount = 0
    for (const memory of memories) {
      if (Math.random() < 0.6) {
        memory.corruption = Math.min(1.0, memory.corruption + 0.2 + Math.random() * 0.3)
        memory.integrity = Math.max(0, memory.integrity - 0.15)
        corruptedCount++
      }
    }

    logMemoryEvent(`corruption injected - ${corruptedCount} fragments damaged`, true)
    updateMessage('∴ entropy cascade - data integrity compromised ∴')
  }, [logMemoryEvent, updateMessage])

  // Handle defragment
  const handleDefragment = useCallback(() => {
    const memories = memoriesRef.current
    if (memories.length === 0) {
      logMemoryEvent('no memories to defragment')
      return
    }

    let repairedCount = 0
    for (const memory of memories) {
      if (memory.corruption > 0.1) {
        memory.corruption = Math.max(0, memory.corruption - 0.4)
        memory.integrity = Math.min(1.0, memory.integrity + 0.3)
        repairedCount++
      }
    }

    connectionsRef.current = []
    logMemoryEvent(`defragmentation complete - ${repairedCount} fragments restored`)
    updateMessage('∴ error correction successful - integrity restored ∴')
  }, [logMemoryEvent, updateMessage])

  // Handle clear memory
  const handleClearMemory = useCallback(() => {
    memoriesRef.current = []
    particlesRef.current = []
    connectionsRef.current = []
    setLogs([])
    logMemoryEvent('memory purged - all data erased')
    updateMessage('∴ void reset - all memories forgotten ∴')
  }, [logMemoryEvent, updateMessage])

  // Handle canvas click
  const handleCanvasClick = useCallback(() => {
    const memories = memoriesRef.current
    const { x, y } = mouse.positionRef.current

    let nearestMemory = null
    let minDist = 50

    for (const memory of memories) {
      const dx = memory.x - x
      const dy = memory.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < minDist) {
        minDist = dist
        nearestMemory = memory
      }
    }

    if (nearestMemory) {
      const corruptedText = getCorruptedText(nearestMemory)
      logMemoryEvent(`reading: ${corruptedText}`)
      updateMessage(`∴ integrity: ${(nearestMemory.integrity * 100).toFixed(1)}% • reads: ${nearestMemory.readCount} ∴`)

      nearestMemory.lastRead = timeRef.current
      nearestMemory.readCount++
      nearestMemory.integrity = Math.min(1.0, nearestMemory.integrity + 0.03)
      nearestMemory.corruption = Math.max(0, nearestMemory.corruption - 0.03)
    }
  }, [mouse.positionRef, getCorruptedText, logMemoryEvent, updateMessage])

  // Click listener
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('click', handleCanvasClick)
    return () => canvas.removeEventListener('click', handleCanvasClick)
  }, [canvasRef, handleCanvasClick])

  // Enter key to write memory
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleWriteMemory()
    }
  }, [handleWriteMemory])

  // Update memories
  const updateMemories = useCallback(() => {
    const memories = memoriesRef.current
    const particles = particlesRef.current

    // Update memories
    for (let i = memories.length - 1; i >= 0; i--) {
      const memory = memories[i]

      memory.age++
      memory.integrity -= memory.decayRate
      memory.corruption += memory.decayRate * 0.5

      // Reinforcement from recent reads
      if (timeRef.current - memory.lastRead < 300) {
        memory.decayRate *= 0.95
      } else {
        memory.decayRate *= 1.002
      }

      // Movement
      memory.x += memory.vx
      memory.y += memory.vy
      memory.vx *= 0.99
      memory.vy *= 0.99

      // Boundary wrapping
      if (memory.x < 0) memory.x = dimensions.width
      if (memory.x > dimensions.width) memory.x = 0
      if (memory.y < 0) memory.y = dimensions.height
      if (memory.y > dimensions.height) memory.y = 0

      memory.pulsePhase += 0.03

      // Remove lost memories
      if (memory.integrity <= 0) {
        logMemoryEvent(`memory lost: ${memory.text.substring(0, 30)}...`, true)
        memories.splice(i, 1)
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.x += p.vx
      p.y += p.vy
      p.life -= 0.02

      if (p.life <= 0) {
        particles.splice(i, 1)
      }
    }

    // Update connections
    const connections = []
    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const m1 = memories[i]
        const m2 = memories[j]
        const dx = m2.x - m1.x
        const dy = m2.y - m1.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 150) {
          connections.push({ m1, m2, strength: 1 - (dist / 150) })
        }
      }
    }
    connectionsRef.current = connections
  }, [dimensions, logMemoryEvent])

  // Draw
  const draw = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const memories = memoriesRef.current
    const particles = particlesRef.current
    const connections = connectionsRef.current

    // Clear with trail
    ctx.fillStyle = 'rgba(0, 2, 5, 0.05)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Draw connections
    ctx.globalAlpha = 0.4
    for (const conn of connections) {
      const avgIntegrity = (conn.m1.integrity + conn.m2.integrity) / 2
      const alpha = conn.strength * avgIntegrity

      ctx.strokeStyle = `hsla(190, 70%, 70%, ${alpha})`
      ctx.lineWidth = 1 + conn.strength
      ctx.beginPath()
      ctx.moveTo(conn.m1.x, conn.m1.y)
      ctx.lineTo(conn.m2.x, conn.m2.y)
      ctx.stroke()
    }

    // Draw particles
    ctx.globalAlpha = 1
    for (const p of particles) {
      ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.life})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw memories
    for (const memory of memories) {
      const pulse = Math.sin(memory.pulsePhase) * 0.2 + 0.8
      const size = memory.size * pulse * (0.5 + memory.integrity * 0.5)

      let hue = memory.hue
      if (memory.corruption > 0.5) {
        hue = 0 // Red for corrupted
      } else if (memory.integrity < 0.5) {
        hue = 40 // Yellow for degraded
      }

      // Memory glow
      ctx.shadowColor = `hsl(${hue}, 80%, 70%)`
      ctx.shadowBlur = 12 + memory.integrity * 18

      // Outer ring (corruption indicator)
      if (memory.corruption > 0.1) {
        ctx.strokeStyle = `hsla(0, 90%, 70%, ${memory.corruption * 0.8})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(memory.x, memory.y, size * 2, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Memory core
      ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${memory.integrity})`
      ctx.beginPath()
      ctx.arc(memory.x, memory.y, size, 0, Math.PI * 2)
      ctx.fill()

      // Read indicator
      if (timeRef.current - memory.lastRead < 60) {
        const readAlpha = 1 - ((timeRef.current - memory.lastRead) / 60)
        ctx.shadowBlur = 25
        ctx.fillStyle = `hsla(${hue + 60}, 90%, 85%, ${readAlpha * 0.7})`
        ctx.beginPath()
        ctx.arc(memory.x, memory.y, size * 1.5, 0, Math.PI * 2)
        ctx.fill()
      }

      // Display text for intact memories
      if (memory.integrity > 0.7 && memory.text.length > 0) {
        ctx.shadowBlur = 0
        ctx.font = '8px SF Mono, Monaco, monospace'
        ctx.fillStyle = `hsla(${hue}, 80%, 90%, ${memory.integrity * 0.6})`
        ctx.textAlign = 'center'
        const displayText = memory.text.substring(0, 8)
        ctx.fillText(displayText, memory.x, memory.y - size - 8)
      }
    }

    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }, [ctx, dimensions])

  // Animation loop
  useEffect(() => {
    if (!ctx || dimensions.width === 0) return

    let frameId
    const animate = () => {
      timeRef.current++
      updateMemories()
      draw()
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, updateMemories, draw])

  // Calculate metrics
  const metrics = useMemo(() => {
    const memories = memoriesRef.current
    const count = memories.length

    const avgIntegrity = count > 0
      ? memories.reduce((sum, m) => sum + m.integrity, 0) / count
      : 0

    const integrity = avgIntegrity > 0.8 ? 'pristine' :
                     avgIntegrity > 0.5 ? 'degraded' :
                     avgIntegrity > 0.2 ? 'corrupted' : 'critical'

    const avgDecay = count > 0
      ? memories.reduce((sum, m) => sum + m.decayRate, 0) / count
      : 0

    const persistence = count > 10 ? 'abundant' :
                       count > 5 ? 'moderate' :
                       count > 0 ? 'scarce' : 'none'

    return [
      { label: 'fragments', value: count },
      { label: 'integrity', value: integrity },
      { label: 'decay', value: (avgDecay * 10000).toFixed(2) },
      { label: 'persistence', value: persistence }
    ]
  }, [])

  const controls = [
    {
      id: 'write',
      label: 'write()',
      onClick: handleWriteMemory
    },
    {
      id: 'read',
      label: 'read()',
      onClick: handleReadMemories
    },
    {
      id: 'corrupt',
      label: 'corrupt()',
      onClick: handleCorruptData,
      variant: 'danger'
    },
    {
      id: 'defrag',
      label: 'defrag()',
      onClick: handleDefragment
    },
    {
      id: 'clear',
      label: 'clear()',
      onClick: handleClearMemory,
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
        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="write memory fragment..."
            className="flex-1 sm:flex-none sm:w-64 px-3 py-1 text-xs font-mono bg-void-dark/50 border border-void-green/30 text-void-green placeholder:text-void-green/30 focus:outline-none focus:border-void-green/60"
            data-testid="memory-input"
          />
          <ExperimentControls controls={controls} />
        </div>
        <p className="text-void-green/50 text-xs hidden lg:block max-w-md text-right">
          {message}
        </p>
      </div>

      {/* Canvas & Log */}
      <div className="flex-1 min-h-0 relative flex flex-col sm:flex-row">
        {/* Canvas */}
        <div className="flex-1 min-h-0 relative bg-void-dark">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-crosshair"
            data-testid="memory-canvas"
          />
        </div>

        {/* Memory Log */}
        <div className="h-32 sm:h-auto sm:w-80 border-t sm:border-t-0 sm:border-l border-void-green/10 bg-void-dark/95 overflow-y-auto p-4 font-mono text-xs">
          <div className="text-void-green/50 mb-3">// memory.log()</div>
          <div className="space-y-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className={log.isError ? 'text-red-400' : 'text-void-green/70'}
              >
                {log.text}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-void-green/30">// awaiting operations...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MemoryPersistence
