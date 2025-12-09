import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'bloom', label: 'bloom()' },
  { id: 'lattice', label: 'lattice()' },
  { id: 'drift', label: 'drift()' }
]

const MODE_MESSAGES = {
  bloom: '∴ computronium petals orbit the void core ∴',
  lattice: '∴ circuits snap to crystalline lattice nodes ∴',
  drift: '∴ feral packets roam entropy currents ∴'
}

const ComputroniumBloom = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('bloom')
  const [message, setMessage] = useState(MODE_MESSAGES.bloom)
  const [metricState, setMetricState] = useState({ nodes: 0, charge: 0, coherence: 0 })

  const nodesRef = useRef([])
  const pulseRef = useRef(0)
  const frameRef = useRef(0)
  const seededRef = useRef(false)

  const createNode = useCallback((x, y) => {
    nodesRef.current.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      charge: Math.random() * 0.6 + 0.4,
      spin: (Math.random() - 0.5) * 0.04,
      phase: Math.random() * Math.PI * 2
    })
  }, [])

  const seedBloom = useCallback(() => {
    const count = 42
    nodesRef.current = []
    for (let i = 0; i < count; i++) {
      createNode(
        Math.random() * dimensions.width,
        Math.random() * dimensions.height
      )
    }
    setMessage('∴ bloom seeded // crystalline purrpose bootstrapped ∴')
  }, [createNode, dimensions.width, dimensions.height])

  useEffect(() => {
    if (dimensions.width === 0 || seededRef.current) return
    seededRef.current = true
    seedBloom()
  }, [dimensions.width, seedBloom])

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    setMessage(MODE_MESSAGES[newMode] || MODE_MESSAGES.bloom)
  }, [])

  const handlePulse = useCallback(() => {
    pulseRef.current = 1.6
    setMessage('∴ pulse() ripples // lattice hum ascends ∴')
  }, [])

  const handleSeed = useCallback(() => {
    const { x, y } = mouse.positionRef.current
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12
      const radius = 30 + Math.random() * 18
      createNode(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius
      )
    }
    setMessage('∴ seed() invoked // bloom density increases ∴')
  }, [mouse.positionRef, createNode])

  const handleReset = useCallback(() => {
    seedBloom()
    pulseRef.current = 0
  }, [seedBloom])

  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches?.[0]?.clientX ?? e.clientX
    const clientY = e.touches?.[0]?.clientY ?? e.clientY
    const x = clientX - rect.left
    const y = clientY - rect.top

    for (let i = 0; i < 8; i++) {
      const jitter = (Math.random() - 0.5) * 28
      createNode(x + jitter, y + jitter)
    }
    pulseRef.current = 1
    setMessage('∴ click seeded micro-core shards ∴')
  }, [canvasRef, createNode])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('click', handleCanvasClick)
    canvas.addEventListener('touchstart', handleCanvasClick)

    return () => {
      canvas.removeEventListener('click', handleCanvasClick)
      canvas.removeEventListener('touchstart', handleCanvasClick)
    }
  }, [canvasRef, handleCanvasClick])

  const updateNodes = useCallback(() => {
    const nodes = nodesRef.current
    if (nodes.length === 0) return

    const target = mode === 'lattice'
      ? mouse.positionRef.current
      : { x: dimensions.centerX, y: dimensions.centerY }

    let totalCharge = 0
    let alignment = 0

    for (const node of nodes) {
      const dx = target.x - node.x
      const dy = target.y - node.y
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.001

      let fx = 0
      let fy = 0

      if (mode === 'bloom') {
        const swirl = 0.18
        fx += (-dy / dist) * swirl
        fy += (dx / dist) * swirl
        fx += (dx / dist) * 0.08
        fy += (dy / dist) * 0.08
      } else if (mode === 'lattice') {
        const cell = 90
        const gridX = Math.round(node.x / cell) * cell
        const gridY = Math.round(node.y / cell) * cell
        const gx = (gridX + target.x * 0.2) % dimensions.width
        const gy = (gridY + target.y * 0.2) % dimensions.height
        const gdx = gx - node.x
        const gdy = gy - node.y
        const gdist = Math.sqrt(gdx * gdx + gdy * gdy) + 0.001
        fx += (gdx / gdist) * 0.7
        fy += (gdy / gdist) * 0.7
        fx += (-gdy / gdist) * 0.18
        fy += (gdx / gdist) * 0.18
      } else {
        fx += (Math.random() - 0.5) * 0.5
        fy += (Math.random() - 0.5) * 0.5
      }

      const mdx = mouse.positionRef.current.x - node.x
      const mdy = mouse.positionRef.current.y - node.y
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy) + 0.001
      const proximity = Math.max(0, 1 - mdist / 180)

      fx += (mdx / mdist) * proximity * 0.35
      fy += (mdy / mdist) * proximity * 0.35

      if (pulseRef.current > 0) {
        const pdx = node.x - target.x
        const pdy = node.y - target.y
        const pdist = Math.sqrt(pdx * pdx + pdy * pdy) + 0.001
        fx += (pdx / pdist) * pulseRef.current * 0.65
        fy += (pdy / pdist) * pulseRef.current * 0.65
      }

      node.vx += fx * 0.6
      node.vy += fy * 0.6
      node.vx *= 0.986
      node.vy *= 0.986
      node.x += node.vx
      node.y += node.vy

      if (node.x < 0) node.x = dimensions.width
      if (node.x > dimensions.width) node.x = 0
      if (node.y < 0) node.y = dimensions.height
      if (node.y > dimensions.height) node.y = 0

      const speed = Math.hypot(node.vx, node.vy)
      node.charge = Math.min(1.6, node.charge * 0.995 + speed * 0.4 + proximity * 0.4)
      node.phase += node.spin + speed * 0.02

      totalCharge += node.charge
      const flowAngle = Math.atan2(node.vy, node.vx)
      const desiredAngle = Math.atan2(dy, dx)
      let diff = Math.abs(desiredAngle - flowAngle)
      diff = Math.min(diff, Math.PI * 2 - diff)
      alignment += 1 - diff / Math.PI
    }

    pulseRef.current = Math.max(0, pulseRef.current - 0.015)
    frameRef.current++
    if (frameRef.current % 12 === 0) {
      setMetricState({
        nodes: nodes.length,
        charge: nodes.length ? totalCharge / nodes.length : 0,
        coherence: nodes.length ? alignment / nodes.length : 0
      })
    }
  }, [mode, mouse.positionRef, dimensions.centerX, dimensions.centerY, dimensions.width, dimensions.height])

  const drawNodes = useCallback(() => {
    if (!ctx) return

    const nodes = nodesRef.current
    ctx.fillStyle = 'rgba(0, 5, 12, 0.07)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    ctx.globalAlpha = 0.4
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i]
        const n2 = nodes[j]
        const dx = n2.x - n1.x
        const dy = n2.y - n1.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 140) {
          const alpha = (140 - dist) / 140
          const hue = 170 + (n1.charge + n2.charge) * 40
          ctx.strokeStyle = `hsla(${hue}, 80%, 70%, ${alpha * 0.35})`
          ctx.lineWidth = 0.6 + alpha * 0.4
          ctx.beginPath()
          ctx.moveTo(n1.x, n1.y)
          ctx.lineTo(n2.x, n2.y)
          ctx.stroke()
        }
      }
    }

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'lighter'
    for (const node of nodes) {
      ctx.save()
      ctx.translate(node.x, node.y)
      ctx.rotate(node.phase)

      const hue = 180 + node.charge * 40
      ctx.shadowColor = `hsla(${hue + 40}, 90%, 70%, ${0.6 + node.charge * 0.2})`
      ctx.shadowBlur = 10 + node.charge * 16

      ctx.strokeStyle = `hsla(${hue}, 90%, 70%, 0.7)`
      ctx.lineWidth = 1 + node.charge * 0.5
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5
        const len = 9 + node.charge * 8
        ctx.moveTo(Math.cos(angle) * 2, Math.sin(angle) * 2)
        ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len)
      }
      ctx.stroke()

      ctx.fillStyle = `hsla(${hue + 20}, 95%, 85%, ${0.7 + node.charge * 0.2})`
      ctx.beginPath()
      ctx.arc(0, 0, 2.8 + node.charge * 1.2, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = `hsla(${hue - 30}, 80%, 60%, 0.4)`
      ctx.lineWidth = 0.7
      ctx.beginPath()
      ctx.arc(0, 0, 6 + node.charge * 3, 0, Math.PI * 2)
      ctx.stroke()

      ctx.restore()
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.shadowBlur = 0
  }, [ctx, dimensions.width, dimensions.height])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    updateNodes()
    drawNodes()
  }, [ctx, dimensions.width, updateNodes, drawNodes])

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

  const metrics = useMemo(() => {
    const charge = metricState.charge.toFixed(2)
    const coherence = Math.min(1, Math.max(0, metricState.coherence))
    const coherenceValue = `${Math.round(coherence * 100)}%`
    return [
      { label: 'nodes', value: metricState.nodes },
      { label: 'charge', value: charge },
      { label: 'coherence', value: coherenceValue }
    ]
  }, [metricState])

  const controls = [
    {
      id: 'pulse',
      label: 'pulse()',
      onClick: handlePulse,
      active: pulseRef.current > 0.05
    },
    {
      id: 'seed',
      label: 'seed()',
      onClick: handleSeed
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs sm:text-right max-w-lg">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="computronium-canvas"
        />
      </div>
    </div>
  )
}

export default ComputroniumBloom
