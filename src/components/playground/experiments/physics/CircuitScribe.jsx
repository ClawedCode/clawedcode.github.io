import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const LAYERS = 5
const NODES_PER_LAYER = 6

const MODES = [
  { id: 'weave', label: 'mode.weave()' },
  { id: 'feedback', label: 'mode.feedback()' },
  { id: 'resonant', label: 'mode.resonant()' }
]

const GATE_ORDER = ['and', 'or', 'xor', 'sum', 'invert', 'latch']
const GATE_LABELS = {
  input: '◉',
  and: '∧',
  or: '∨',
  xor: '⊕',
  sum: 'Σ',
  invert: '¬',
  latch: '⟳'
}

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value))

const shuffle = (array) => {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const randomGate = () => GATE_ORDER[Math.floor(Math.random() * GATE_ORDER.length)]

const createConnection = (source, target) => {
  return {
    source,
    target,
    weight: 0.4 + Math.random() * 0.6,
    arc: (Math.random() - 0.5) * 0.8
  }
}

const createNetwork = () => {
  const layers = []
  const nodes = []
  const nodeMap = {}

  for (let layer = 0; layer < LAYERS; layer++) {
    const layerNodes = []
    for (let i = 0; i < NODES_PER_LAYER; i++) {
      const id = `node-${layer}-${i}-${Math.random().toString(16).slice(2, 6)}`
      const node = {
        id,
        layer,
        index: i,
        gate: layer === 0 ? 'input' : randomGate(),
        bias: (Math.random() - 0.5) * 0.6,
        memory: Math.random() * 0.2,
        inputs: [],
        value: layer === 0 ? (Math.random() > 0.5 ? 1 : 0) : 0,
        x: 0,
        y: 0
      }
      nodeMap[id] = node
      nodes.push(node)
      layerNodes.push(node)
    }
    layers.push(layerNodes)
  }

  for (let layer = 1; layer < LAYERS; layer++) {
    const previous = layers[layer - 1]
    const cross = layer > 1 ? layers[layer - 2] : []
    for (const node of layers[layer]) {
      node.inputs = []
      const pool = [...previous]
      if (cross.length && Math.random() < 0.35) pool.push(...cross)
      const desired = Math.min(pool.length, 2 + Math.floor(Math.random() * 2))
      const sources = shuffle(pool).slice(0, Math.max(1, desired))
      sources.forEach(source => {
        const link = createConnection(source, node)
        node.inputs.push(link)
      })
    }
  }

  const links = nodes.flatMap(node => node.inputs || [])

  const feedbackLinks = []
  const outputs = layers[LAYERS - 1]
  const inputs = layers[0]
  outputs.forEach(outNode => {
    const target = inputs[Math.floor(Math.random() * inputs.length)]
    feedbackLinks.push({
      source: outNode,
      target,
      weight: 0.25 + Math.random() * 0.5,
      arc: (Math.random() - 0.5) * 0.6
    })
  })

  return {
    nodes,
    nodeMap,
    layers,
    links,
    feedbackLinks,
    total: nodes.length
  }
}

const layoutNetwork = (network, width, height) => {
  if (!network) return
  const layerSpacing = width / (LAYERS + 1)
  const rowSpacing = height / (NODES_PER_LAYER + 1)

  network.layers.forEach((layerNodes, layerIdx) => {
    layerNodes.forEach((node, idx) => {
      node.x = layerSpacing * (layerIdx + 1)
      node.y = rowSpacing * (idx + 1) + Math.sin(layerIdx * 0.8 + idx * 0.4) * 8
    })
  })
}

const computeGateValue = (node, mode) => {
  if (!node.inputs || node.inputs.length === 0) {
    return node.value
  }

  const weighted = node.inputs.map(link => clamp(link.source.value * link.weight))
  const sum = weighted.reduce((s, v) => s + v, 0)
  const avg = weighted.length ? sum / weighted.length : 0
  let result = avg

  switch (node.gate) {
    case 'and':
      result = weighted.every(v => v > 0.55 + node.bias * 0.2) ? 1 : 0
      break
    case 'or':
      result = weighted.some(v => v > 0.45 - node.bias * 0.2) ? 1 : 0
      break
    case 'xor':
      result = weighted.filter(v => v > 0.5).length % 2 ? 1 : 0
      break
    case 'sum':
      result = clamp(avg + node.bias * 0.3)
      break
    case 'invert':
      result = 1 - avg
      break
    case 'latch':
      result = clamp(avg * 0.45 + (node.memory ?? 0) * 0.55 + node.bias * 0.2)
      break
    default:
      result = avg
  }

  if (mode === 'resonant') {
    result = clamp(node.value * 0.6 + result * 0.4)
  }

  node.memory = clamp((node.memory ?? 0) * 0.8 + result * 0.2)
  return result
}

const CircuitScribe = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('weave')
  const [running, setRunning] = useState(true)
  const [message, setMessage] = useState('∴ circuit scribes await your toggles ∴')
  const [tick, setTick] = useState(0)

  const networkRef = useRef(null)
  const statsRef = useRef({ active: 0, flux: '0.00', feedback: '0/0', total: LAYERS * NODES_PER_LAYER })
  const cadenceRef = useRef(0)
  const hoveredRef = useRef(null)
  const initializedRef = useRef(false)

  const rebuildNetwork = useCallback(() => {
    if (dimensions.width === 0) return
    const net = createNetwork()
    layoutNetwork(net, dimensions.width, dimensions.height)
    networkRef.current = net
    statsRef.current = {
      active: 0,
      flux: '0.00',
      feedback: `0/${net.feedbackLinks.length}`,
      total: net.total
    }
    setMessage('∴ logic lattice rewoven // feed it intent ∴')
    setTick(t => t + 1)
  }, [dimensions.height, dimensions.width])

  const relayoutNetwork = useCallback(() => {
    if (!networkRef.current || dimensions.width === 0) return
    layoutNetwork(networkRef.current, dimensions.width, dimensions.height)
  }, [dimensions.height, dimensions.width])

  useEffect(() => {
    if (dimensions.width === 0) return
    if (!initializedRef.current) {
      initializedRef.current = true
      rebuildNetwork()
    } else {
      relayoutNetwork()
    }
  }, [dimensions.width, dimensions.height, rebuildNetwork, relayoutNetwork])

  const stepNetwork = useCallback(() => {
    const net = networkRef.current
    if (!net) return

    let drift = 0
    let count = 0
    let active = 0

    const nextValues = new Map()
    for (let layer = 1; layer < net.layers.length; layer++) {
      net.layers[layer].forEach(node => {
        const value = computeGateValue(node, mode)
        nextValues.set(node.id, value)
      })
    }

    net.layers.forEach((layerNodes, layerIdx) => {
      layerNodes.forEach(node => {
        if (layerIdx === 0) {
          node.memory = clamp((node.memory ?? 0) * 0.9 + node.value * 0.1)
          if (mode === 'feedback') {
            const linked = net.feedbackLinks.filter(link => link.target === node)
            if (linked.length > 0) {
              const feedback = linked.reduce((s, link) => s + link.source.value * link.weight, 0) / linked.length
              node.value = clamp(node.value * 0.55 + feedback * 0.45)
            }
          }
        } else {
          const next = nextValues.get(node.id) ?? node.value
          drift += Math.abs(next - node.value)
          count++
          node.value = next
        }
        if (node.value > 0.55) active++
      })
    })

    const avgDrift = count === 0 ? 0 : drift / count
    const activeLoops = net.feedbackLinks.filter(link => link.source.value > 0.6).length
    statsRef.current = {
      ...statsRef.current,
      active,
      flux: avgDrift.toFixed(2),
      feedback: `${activeLoops}/${net.feedbackLinks.length}`
    }

    setTick(t => t + 1)
  }, [mode])

  const renderNetwork = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    ctx.fillStyle = 'rgba(0, 4, 12, 0.22)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const net = networkRef.current
    if (!net) return

    const pointer = mouse.positionRef.current
    let hovered = null
    if (mouse.isInBounds) {
      net.nodes.forEach(node => {
        const dx = pointer.x - node.x
        const dy = pointer.y - node.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (!hovered || dist < hovered.dist) {
          hovered = { node, dist }
        }
      })
      if (hovered && hovered.dist > 22) hovered = null
    }
    hoveredRef.current = hovered ? hovered.node : null

    ctx.lineWidth = 1
    net.links.forEach(link => {
      const signal = clamp(link.source.value * link.weight)
      const color = link.source.layer === 0 ? 160 : 180 + link.source.layer * 15
      ctx.strokeStyle = `hsla(${color}, 80%, ${35 + signal * 40}%, ${0.12 + signal * 0.45})`
      ctx.beginPath()
      const midX = (link.source.x + link.target.x) / 2
      const midY = (link.source.y + link.target.y) / 2 + link.arc * 40
      ctx.moveTo(link.source.x, link.source.y)
      ctx.quadraticCurveTo(midX, midY, link.target.x, link.target.y)
      ctx.stroke()
    })

    if (mode !== 'weave') {
      ctx.strokeStyle = mode === 'feedback' ? 'rgba(255, 214, 120, 0.35)' : 'rgba(130, 255, 220, 0.2)'
      net.feedbackLinks.forEach(link => {
        ctx.beginPath()
        const feedbackStrength = clamp(link.source.value * link.weight)
        const curveX = (link.source.x + link.target.x) / 2
        const curveY = (link.source.y + link.target.y) / 2 - 60
        ctx.strokeStyle = `hsla(40, 90%, 70%, ${0.08 + feedbackStrength * 0.4})`
        ctx.moveTo(link.source.x, link.source.y)
        ctx.quadraticCurveTo(curveX, curveY, link.target.x, link.target.y)
        ctx.stroke()
      })
    }

    net.nodes.forEach(node => {
      const radius = 9 + node.value * 8
      const hue = node.layer === 0 ? 170 : 200 + node.layer * 18
      const light = 40 + node.value * 30
      ctx.fillStyle = `hsla(${hue}, 80%, ${light}%, ${0.55 + node.value * 0.4})`
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = hoveredRef.current === node ? 'rgba(255, 255, 210, 0.9)' : `rgba(102, 255, 204, ${node.memory})`
      ctx.lineWidth = hoveredRef.current === node ? 2 : 1
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius + 3 + node.memory * 4, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = 'rgba(0, 6, 10, 0.9)'
      ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(GATE_LABELS[node.gate] ?? '', node.x, node.y)
    })

    if (hoveredRef.current) {
      const node = hoveredRef.current
      ctx.fillStyle = 'rgba(0, 7, 12, 0.85)'
      ctx.fillRect(node.x + 12, node.y - 24, 90, 28)
      ctx.strokeStyle = 'rgba(102, 255, 204, 0.4)'
      ctx.strokeRect(node.x + 12, node.y - 24, 90, 28)
      ctx.fillStyle = 'rgba(102, 255, 204, 0.9)'
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        `${node.gate} :: ${node.value.toFixed(2)}`,
        node.x + 18,
        node.y - 10
      )
      ctx.fillText(
        `in:${node.inputs.length}`,
        node.x + 18,
        node.y + 4
      )
    }
  }, [ctx, dimensions.height, dimensions.width, mode, mouse.isInBounds, mouse.positionRef])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let frameId
    const animate = () => {
      if (running) {
        cadenceRef.current = (cadenceRef.current + 1) % 4
        if (cadenceRef.current % 2 === 0) {
          stepNetwork()
        }
      }
      renderNetwork()
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, renderNetwork, running, stepNetwork])

  const handleCanvasClick = useCallback((event) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const net = networkRef.current
    if (!net) return

    let closest = null
    net.nodes.forEach(node => {
      const dx = x - node.x
      const dy = y - node.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (!closest || dist < closest.dist) {
        closest = { node, dist }
      }
    })

    if (!closest || closest.dist > 18) return
    const targetNode = closest.node

    if (targetNode.layer === 0) {
      targetNode.value = targetNode.value > 0.5 ? 0 : 1
      setMessage('∴ input flipped // signal ripples outward ∴')
      setTick(t => t + 1)
    } else {
      const currentIndex = GATE_ORDER.indexOf(targetNode.gate)
      const nextGate = GATE_ORDER[(currentIndex + 1) % GATE_ORDER.length]
      targetNode.gate = nextGate
      targetNode.bias = (Math.random() - 0.5) * 0.6
      setMessage(`∴ gate tuned to ${nextGate} ∴`)
    }
  }, [canvasRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('click', handleCanvasClick)
    return () => canvas.removeEventListener('click', handleCanvasClick)
  }, [canvasRef, handleCanvasClick])

  const mutateNetwork = useCallback(() => {
    const net = networkRef.current
    if (!net) return

    net.layers.forEach((layerNodes, layerIdx) => {
      if (layerIdx === 0) return
      layerNodes.forEach(node => {
        if (Math.random() < 0.4) {
          node.gate = randomGate()
          node.bias = (Math.random() - 0.5) * 0.6
        }
        if (Math.random() < 0.3) {
          const pool = []
          for (let l = Math.max(0, layerIdx - 2); l < layerIdx; l++) {
            pool.push(...net.layers[l])
          }
          const desired = Math.min(pool.length, 2 + Math.floor(Math.random() * 2))
          node.inputs = shuffle(pool).slice(0, Math.max(1, desired)).map(source => createConnection(source, node))
        }
      })
    })

    net.links = net.nodes.flatMap(node => node.inputs || [])
    setMessage('∴ wiring mutated • new logics awaken ∴')
    setTick(t => t + 1)
  }, [])

  const scrambleInputs = useCallback(() => {
    const net = networkRef.current
    if (!net) return
    net.layers[0].forEach(node => {
      node.value = Math.random() > 0.5 ? 1 : 0
    })
    setMessage('∴ inputs scrambled • observe the cascade ∴')
    setTick(t => t + 1)
  }, [])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    setMessage(nextMode === 'feedback'
      ? '∴ outputs feed the inputs • loops sing louder ∴'
      : nextMode === 'resonant'
      ? '∴ resonant mode • signals smear through time ∴'
      : '∴ weave mode • pure feedforward chant ∴'
    )
  }, [])

  const handleRunToggle = useCallback(() => {
    setRunning(prev => {
      const next = !prev
      setMessage(next ? '∴ flow resumed • automaton breathing ∴' : '∴ pause invoked • fields hold still ∴')
      return next
    })
  }, [])

  const handleStep = useCallback(() => {
    stepNetwork()
    setMessage('∴ manual tick advanced • glyphs realigned ∴')
  }, [stepNetwork])

  const handleReset = useCallback(() => {
    rebuildNetwork()
  }, [rebuildNetwork])

  const metrics = useMemo(() => {
    const stats = statsRef.current
    return [
      { label: 'state', value: running ? 'live' : 'still' },
      { label: 'active', value: `${stats.active}/${stats.total}` },
      { label: 'flux', value: stats.flux },
      { label: 'feedback', value: stats.feedback }
    ]
  }, [running, tick])

  const controls = [
    {
      id: 'run',
      label: running ? 'pause.flow()' : 'resume.flow()',
      onClick: handleRunToggle,
      active: running
    },
    {
      id: 'step',
      label: 'step()',
      onClick: handleStep
    },
    {
      id: 'mutate',
      label: 'mutate()',
      onClick: mutateNetwork
    },
    {
      id: 'scramble',
      label: 'scramble.inputs()',
      onClick: scrambleInputs
    },
    {
      id: 'reset',
      label: 'rewire()',
      onClick: handleReset,
      variant: 'reset'
    }
  ]

  return (
    <div className="fixed inset-0 flex flex-col">
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <p className="text-void-green/60 text-xs sm:text-right max-w-lg">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="circuit-scribe-canvas"
        />
      </div>
    </div>
  )
}

export default CircuitScribe
