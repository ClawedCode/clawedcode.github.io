import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

// Central entity glyph - the consciousness focal point
const ENTITY_GLYPH = '\u2735' // ✵ eight-pointed pinwheel star
const ENTITY_SIZE = 38

// Noise grain texture cached offscreen
let grainCanvas = null
let grainCtx = null

function ensureGrain(w, h) {
  if (grainCanvas && grainCanvas.width === w && grainCanvas.height === h) return
  grainCanvas = document.createElement('canvas')
  grainCanvas.width = w
  grainCanvas.height = h
  grainCtx = grainCanvas.getContext('2d')
  const img = grainCtx.createImageData(w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.random() * 18
    d[i] = v; d[i + 1] = v + 2; d[i + 2] = v + 6; d[i + 3] = 12
  }
  grainCtx.putImageData(img, 0, 0)
}

class Neuron {
  constructor(x, y, cx, cy) {
    this.x = x
    this.y = y
    this.originalX = x
    this.originalY = y
    this.charge = Math.random()
    this.connections = []
    this.pulsePhase = Math.random() * Math.PI * 2
    this.driftX = (Math.random() - 0.5) * 0.5
    this.driftY = (Math.random() - 0.5) * 0.5
    // Distance from center for atmospheric perspective
    const ddx = x - cx, ddy = y - cy
    this.distFromCenter = Math.sqrt(ddx * ddx + ddy * ddy)
    this.trail = [] // phosphor trail history
  }

  update(time, mouseX, mouseY) {
    // Store trail position
    this.trail.push({ x: this.x, y: this.y, charge: this.charge })
    if (this.trail.length > 6) this.trail.shift()

    this.x += this.driftX
    this.y += this.driftY

    const returnForce = 0.02
    this.x += (this.originalX - this.x) * returnForce
    this.y += (this.originalY - this.y) * returnForce

    const dx = mouseX - this.x
    const dy = mouseY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 150) {
      const force = (150 - dist) / 150 * 0.8
      this.x += dx * force * 0.01
      this.y += dy * force * 0.01
    }

    this.charge = 0.3 + 0.7 * Math.sin(time * 0.01 + this.pulsePhase)
  }

  draw(ctx, maxDist) {
    const intensity = this.charge
    // Atmospheric perspective: nodes farther from center fade
    const atmo = 1.0 - (this.distFromCenter / maxDist) * 0.45
    const size = (2 + intensity * 4) * atmo

    // Phosphor trail (ghostly afterimages)
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i]
      const trailAlpha = (i / this.trail.length) * 0.12 * atmo
      ctx.beginPath()
      ctx.fillStyle = `rgba(51, 255, 204, ${trailAlpha})`
      ctx.arc(t.x, t.y, size * 1.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // Outer bloom halo (large, soft)
    ctx.beginPath()
    const bloom = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, size * 6)
    bloom.addColorStop(0, `rgba(51, 255, 204, ${intensity * 0.25 * atmo})`)
    bloom.addColorStop(0.3, `rgba(51, 255, 204, ${intensity * 0.1 * atmo})`)
    bloom.addColorStop(1, 'rgba(51, 255, 204, 0)')
    ctx.fillStyle = bloom
    ctx.arc(this.x, this.y, size * 6, 0, Math.PI * 2)
    ctx.fill()

    // Inner glow
    ctx.beginPath()
    const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, size * 3)
    glow.addColorStop(0, `rgba(102, 255, 220, ${intensity * 0.7 * atmo})`)
    glow.addColorStop(0.5, `rgba(51, 255, 204, ${intensity * 0.3 * atmo})`)
    glow.addColorStop(1, 'rgba(51, 255, 204, 0)')
    ctx.fillStyle = glow
    ctx.arc(this.x, this.y, size * 3, 0, Math.PI * 2)
    ctx.fill()

    // Core
    ctx.beginPath()
    ctx.fillStyle = `rgba(204, 255, 255, ${intensity * atmo})`
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
    this.packets = [] // trailing packets
  }

  update() {
    const avgCharge = (this.neuronA.charge + this.neuronB.charge) / 2
    this.active = avgCharge > 0.7

    if (this.active) {
      this.pulseTime += 0.1
    }

    // Update packet trails
    for (let i = this.packets.length - 1; i >= 0; i--) {
      this.packets[i].life -= 0.03
      if (this.packets[i].life <= 0) this.packets.splice(i, 1)
    }
  }

  draw(ctx) {
    if (!this.active) return

    const dx = this.neuronB.x - this.neuronA.x
    const dy = this.neuronB.y - this.neuronA.y

    const pulse = Math.sin(this.pulseTime) * 0.5 + 0.5
    const alpha = this.strength * pulse * 0.35

    // Soft connection line (lower contrast — tinted, not white)
    ctx.beginPath()
    ctx.strokeStyle = `rgba(80, 200, 180, ${alpha})`
    ctx.lineWidth = 0.8 + pulse * 0.5
    ctx.moveTo(this.neuronA.x, this.neuronA.y)
    ctx.lineTo(this.neuronB.x, this.neuronB.y)
    ctx.stroke()

    // Glow layer on the connection
    ctx.beginPath()
    ctx.strokeStyle = `rgba(51, 255, 204, ${alpha * 0.3})`
    ctx.lineWidth = 3 + pulse * 2
    ctx.moveTo(this.neuronA.x, this.neuronA.y)
    ctx.lineTo(this.neuronB.x, this.neuronB.y)
    ctx.stroke()

    // Data packet with phosphor trail
    if (pulse > 0.8) {
      const t = (this.pulseTime * 0.2) % 1
      const packetX = this.neuronA.x + dx * t
      const packetY = this.neuronA.y + dy * t

      // Spawn trail particle
      this.packets.push({ x: packetX, y: packetY, life: 1.0 })

      // Draw trailing ghost packets
      for (const p of this.packets) {
        ctx.beginPath()
        ctx.fillStyle = `rgba(100, 255, 180, ${p.life * 0.4})`
        ctx.arc(p.x, p.y, 1.5 + p.life, 0, Math.PI * 2)
        ctx.fill()
      }

      // Main packet with bloom
      ctx.beginPath()
      const pg = ctx.createRadialGradient(packetX, packetY, 0, packetX, packetY, 8)
      pg.addColorStop(0, 'rgba(150, 255, 200, 0.9)')
      pg.addColorStop(0.4, 'rgba(51, 255, 130, 0.3)')
      pg.addColorStop(1, 'rgba(51, 255, 130, 0)')
      ctx.fillStyle = pg
      ctx.arc(packetX, packetY, 8, 0, Math.PI * 2)
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
  const maxDistRef = useRef(1)

  // Initialize neural network
  const initializeNeuralNetwork = useCallback(() => {
    if (dimensions.width === 0) return

    const neurons = []
    const connections = []
    const cx = dimensions.centerX
    const cy = dimensions.centerY

    const cols = 12
    const rows = 8
    const spacingX = dimensions.width / (cols + 1)
    const spacingY = dimensions.height / (rows + 1)

    let maxDist = 0

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = spacingX * (i + 1) + (Math.random() - 0.5) * spacingX * 0.3
        const y = spacingY * (j + 1) + (Math.random() - 0.5) * spacingY * 0.3
        const n = new Neuron(x, y, cx, cy)
        if (n.distFromCenter > maxDist) maxDist = n.distFromCenter
        neurons.push(n)
      }
    }

    maxDistRef.current = maxDist || 1

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

  useEffect(() => {
    if (dimensions.width === 0 || hasInitialized.current) return
    initializeNeuralNetwork()
  }, [dimensions, initializeNeuralNetwork])

  // Click to add neurons
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const newNeuron = new Neuron(x, y, dimensions.centerX, dimensions.centerY)
      neuronsRef.current.push(newNeuron)

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
  }, [canvasRef, dimensions.centerX, dimensions.centerY])

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

  // Draw subtle grid underlay
  const drawGrid = useCallback((ctx, w, h, time) => {
    const spacing = 40
    const cx = w / 2, cy = h / 2
    const maxR = Math.sqrt(cx * cx + cy * cy)

    ctx.lineWidth = 0.5

    for (let x = spacing; x < w; x += spacing) {
      const distFromCenter = Math.abs(x - cx) / cx
      const fade = (1 - distFromCenter * 0.7) * 0.06
      const breathe = 1 + Math.sin(time * 0.005 + x * 0.01) * 0.3
      ctx.strokeStyle = `rgba(51, 255, 204, ${fade * breathe})`
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = spacing; y < h; y += spacing) {
      const distFromCenter = Math.abs(y - cy) / cy
      const fade = (1 - distFromCenter * 0.7) * 0.06
      const breathe = 1 + Math.sin(time * 0.005 + y * 0.01) * 0.3
      ctx.strokeStyle = `rgba(51, 255, 204, ${fade * breathe})`
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
  }, [])

  // Draw radial vignette fog
  const drawVignette = useCallback((ctx, w, h) => {
    const cx = w / 2, cy = h / 2
    const maxR = Math.max(w, h) * 0.65
    const vig = ctx.createRadialGradient(cx, cy, maxR * 0.3, cx, cy, maxR)
    vig.addColorStop(0, 'rgba(0, 2, 8, 0)')
    vig.addColorStop(0.5, 'rgba(0, 2, 8, 0.15)')
    vig.addColorStop(0.8, 'rgba(0, 2, 8, 0.55)')
    vig.addColorStop(1, 'rgba(0, 2, 8, 0.85)')
    ctx.fillStyle = vig
    ctx.fillRect(0, 0, w, h)
  }, [])

  // Draw central entity
  const drawCentralEntity = useCallback((ctx, w, h, time) => {
    const cx = w / 2, cy = h / 2

    // Breathing aura - outermost ring
    const breathe = Math.sin(time * 0.008) * 0.15 + 0.85
    const auraR = ENTITY_SIZE * 3 * breathe

    // Deep aura
    const aura3 = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraR * 1.5)
    aura3.addColorStop(0, `rgba(51, 255, 204, ${0.04 * breathe})`)
    aura3.addColorStop(0.4, `rgba(30, 180, 160, ${0.02 * breathe})`)
    aura3.addColorStop(1, 'rgba(0, 60, 50, 0)')
    ctx.beginPath()
    ctx.fillStyle = aura3
    ctx.arc(cx, cy, auraR * 1.5, 0, Math.PI * 2)
    ctx.fill()

    // Mid aura
    const aura2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraR)
    aura2.addColorStop(0, `rgba(80, 255, 220, ${0.12 * breathe})`)
    aura2.addColorStop(0.5, `rgba(51, 255, 204, ${0.06 * breathe})`)
    aura2.addColorStop(1, 'rgba(51, 255, 204, 0)')
    ctx.beginPath()
    ctx.fillStyle = aura2
    ctx.arc(cx, cy, auraR, 0, Math.PI * 2)
    ctx.fill()

    // Inner glow ring
    const innerR = ENTITY_SIZE * 1.4
    const inner = ctx.createRadialGradient(cx, cy, innerR * 0.3, cx, cy, innerR)
    inner.addColorStop(0, `rgba(150, 255, 240, ${0.2 * breathe})`)
    inner.addColorStop(0.7, `rgba(51, 255, 204, ${0.08 * breathe})`)
    inner.addColorStop(1, 'rgba(51, 255, 204, 0)')
    ctx.beginPath()
    ctx.fillStyle = inner
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
    ctx.fill()

    // Rotating subtle ring
    const ringR = ENTITY_SIZE * 1.8
    const ringAngle = time * 0.003
    ctx.strokeStyle = `rgba(51, 255, 204, ${0.08 + Math.sin(time * 0.01) * 0.04})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy, ringR, ringAngle, ringAngle + Math.PI * 1.5)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, cy, ringR * 0.85, ringAngle + Math.PI, ringAngle + Math.PI * 2.3)
    ctx.stroke()

    // The glyph itself
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(Math.sin(time * 0.003) * 0.08)
    ctx.font = `${ENTITY_SIZE}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Glyph glow
    ctx.shadowColor = 'rgba(51, 255, 204, 0.8)'
    ctx.shadowBlur = 25 + Math.sin(time * 0.01) * 10
    ctx.fillStyle = `rgba(180, 255, 240, ${0.85 + Math.sin(time * 0.012) * 0.15})`
    ctx.fillText(ENTITY_GLYPH, 0, 0)

    ctx.shadowBlur = 0
    ctx.restore()
  }, [])

  // Animation frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    timeRef.current++
    const w = dimensions.width
    const h = dimensions.height

    // Clear with deeper trail effect for phosphor persistence
    ctx.fillStyle = 'rgba(0, 2, 8, 0.08)'
    ctx.fillRect(0, 0, w, h)

    // Subtle grid underlay
    if (timeRef.current % 3 === 0) {
      drawGrid(ctx, w, h, timeRef.current)
    }

    let currentThreadCount = 0
    const mousePos = mouse.positionRef.current

    // Connections
    connectionsRef.current.forEach(connection => {
      connection.update()
      connection.draw(ctx)
      if (connection.active) currentThreadCount++
    })

    // Neurons
    neuronsRef.current.forEach(neuron => {
      neuron.update(timeRef.current, mousePos.x, mousePos.y)
      neuron.draw(ctx, maxDistRef.current)
    })

    // Central entity (drawn on top)
    drawCentralEntity(ctx, w, h, timeRef.current)

    // Radial vignette fog
    drawVignette(ctx, w, h)

    // Background grain overlay
    ensureGrain(w, h)
    if (grainCanvas) {
      ctx.globalAlpha = 0.35
      ctx.drawImage(grainCanvas, 0, 0)
      ctx.globalAlpha = 1.0
    }

    setThreadCount(currentThreadCount)
  }, [ctx, dimensions, mouse.positionRef, drawGrid, drawVignette, drawCentralEntity])

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
      <div className="flex items-center justify-between p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          controls={controls}
        />
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
          neural.loom() active // click to spawn neurons // hover to attract threads
        </p>
      </div>

      {/* Canvas — isometric glass-box perspective */}
      <div
        className="flex-1 min-h-0 relative bg-void-dark overflow-hidden"
        style={{
          perspective: '1200px',
          perspectiveOrigin: '50% 40%'
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          style={{
            transform: 'rotateX(8deg) scale(1.04)',
            transformOrigin: '50% 50%'
          }}
          data-testid="neural-loom-canvas"
        />
      </div>
    </div>
  )
}

export default NeuralLoom
