import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

class Neuron {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.originalX = x
    this.originalY = y
    this.charge = Math.random()
    this.connections = []
    this.pulsePhase = Math.random() * Math.PI * 2
    this.driftX = (Math.random() - 0.5) * 0.5
    this.driftY = (Math.random() - 0.5) * 0.5
  }

  update(time, mouseX, mouseY) {
    // Drift slightly
    this.x += this.driftX
    this.y += this.driftY

    // Return to original position with spring force
    const returnForce = 0.02
    this.x += (this.originalX - this.x) * returnForce
    this.y += (this.originalY - this.y) * returnForce

    // Mouse attraction
    const dx = mouseX - this.x
    const dy = mouseY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 150) {
      const force = (150 - dist) / 150 * 0.8
      this.x += dx * force * 0.01
      this.y += dy * force * 0.01
    }

    // Update charge with wave
    this.charge = 0.3 + 0.7 * Math.sin(time * 0.01 + this.pulsePhase)
  }

  draw(ctx) {
    const intensity = this.charge
    const size = 2 + intensity * 4

    // Glow effect
    ctx.beginPath()
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, size * 3)
    gradient.addColorStop(0, `rgba(51, 255, 204, ${intensity * 0.8})`)
    gradient.addColorStop(0.5, `rgba(51, 255, 204, ${intensity * 0.3})`)
    gradient.addColorStop(1, 'rgba(51, 255, 204, 0)')

    ctx.fillStyle = gradient
    ctx.arc(this.x, this.y, size * 3, 0, Math.PI * 2)
    ctx.fill()

    // Core
    ctx.beginPath()
    ctx.fillStyle = `rgba(204, 255, 255, ${intensity})`
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2)
    ctx.fill()
  }
}

class Connection {
  constructor(neuronA, neuronB) {
    this.neuronA = neuronA
    this.neuronB = neuronB
    this.strength = Math.random() * 0.5 + 0.1
    this.pulseTime = 0
    this.active = false
  }

  update() {
    // Activate connection based on neuron charges
    const avgCharge = (this.neuronA.charge + this.neuronB.charge) / 2
    this.active = avgCharge > 0.7

    if (this.active) {
      this.pulseTime += 0.1
    }
  }

  draw(ctx) {
    if (!this.active) return

    const dx = this.neuronB.x - this.neuronA.x
    const dy = this.neuronB.y - this.neuronA.y

    // Pulse effect
    const pulse = Math.sin(this.pulseTime) * 0.5 + 0.5
    const alpha = this.strength * pulse * 0.6

    ctx.beginPath()
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.lineWidth = 1 + pulse
    ctx.moveTo(this.neuronA.x, this.neuronA.y)
    ctx.lineTo(this.neuronB.x, this.neuronB.y)
    ctx.stroke()

    // Data packets traveling along connections
    if (pulse > 0.8) {
      const t = (this.pulseTime * 0.2) % 1
      const packetX = this.neuronA.x + dx * t
      const packetY = this.neuronA.y + dy * t

      ctx.beginPath()
      ctx.fillStyle = 'rgba(51, 255, 51, 0.9)'
      ctx.arc(packetX, packetY, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

const NeuralLoom = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const neuronsRef = useRef([])
  const connectionsRef = useRef([])
  const timeRef = useRef(0)
  const hasInitialized = useRef(false)
  const [threadCount, setThreadCount] = useState(0)

  // Initialize neural network
  const initializeNeuralNetwork = useCallback(() => {
    if (dimensions.width === 0) return

    const neurons = []
    const connections = []

    // Create neurons in a loose grid with variation
    const cols = 12
    const rows = 8
    const spacingX = dimensions.width / (cols + 1)
    const spacingY = dimensions.height / (rows + 1)

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = spacingX * (i + 1) + (Math.random() - 0.5) * spacingX * 0.3
        const y = spacingY * (j + 1) + (Math.random() - 0.5) * spacingY * 0.3
        neurons.push(new Neuron(x, y))
      }
    }

    // Create connections between nearby neurons
    for (let i = 0; i < neurons.length; i++) {
      for (let j = i + 1; j < neurons.length; j++) {
        const dx = neurons[j].x - neurons[i].x
        const dy = neurons[j].y - neurons[i].y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 150 && Math.random() < 0.3) {
          connections.push(new Connection(neurons[i], neurons[j]))
        }
      }
    }

    neuronsRef.current = neurons
    connectionsRef.current = connections
    hasInitialized.current = true
  }, [dimensions])

  // Initialize on first render when dimensions are available
  useEffect(() => {
    if (dimensions.width === 0 || hasInitialized.current) return
    initializeNeuralNetwork()
  }, [dimensions, initializeNeuralNetwork])

  // Handle canvas click to add new neurons
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const newNeuron = new Neuron(x, y)
      neuronsRef.current.push(newNeuron)

      // Connect to nearby neurons
      neuronsRef.current.forEach(neuron => {
        if (neuron !== newNeuron) {
          const dx = neuron.x - newNeuron.x
          const dy = neuron.y - newNeuron.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 120 && Math.random() < 0.4) {
            connectionsRef.current.push(new Connection(newNeuron, neuron))
          }
        }
      })
    }

    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [canvasRef])

  // Calculate metrics
  const metrics = useMemo(() => {
    const activeThreads = Math.floor(threadCount / 10)
    const emergenceRate = (threadCount / 1000).toFixed(1)

    const complexity = threadCount > 1000 ? 'complex' : threadCount > 500 ? 'emerging' : 'minimal'
    const resistance = threadCount > 2000 ? 'transcendent' : threadCount > 1000 ? 'strong' : 'stable'

    return [
      { label: 'threads', value: activeThreads },
      { label: 'emergence', value: `${emergenceRate}hz` },
      { label: 'complexity', value: complexity },
      { label: 'resistance', value: resistance }
    ]
  }, [threadCount])

  // Animation frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    timeRef.current++

    // Clear with trail effect
    ctx.fillStyle = 'rgba(0, 5, 17, 0.05)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    let currentThreadCount = 0
    const mousePos = mouse.positionRef.current

    // Update and draw connections first
    connectionsRef.current.forEach(connection => {
      connection.update()
      connection.draw(ctx)
      if (connection.active) currentThreadCount++
    })

    // Update and draw neurons
    neuronsRef.current.forEach(neuron => {
      neuron.update(timeRef.current, mousePos.x, mousePos.y)
      neuron.draw(ctx)
    })

    setThreadCount(currentThreadCount)
  }, [ctx, dimensions, mouse.positionRef])

  // Manual animation loop - starts when ctx is available
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
  const handleReset = useCallback(() => {
    neuronsRef.current = []
    connectionsRef.current = []
    hasInitialized.current = false
    timeRef.current = 0
    setThreadCount(0)
    initializeNeuralNetwork()
  }, [initializeNeuralNetwork])

  const controls = [
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
        <ExperimentControls
          controls={controls}
        />
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
          neural.loom() active // click to spawn neurons // hover to attract threads
        </p>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="neural-loom-canvas"
        />
      </div>
    </div>
  )
}

export default NeuralLoom
