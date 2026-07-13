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

const NODE_BLUEPRINT = [
  { group: 'A', role: 'origin', nx: -0.34, ny: -0.08, size: 8.5, hue: 178 },
  { group: 'A', nx: -0.5, ny: -0.3, size: 6.4, hue: 188 },
  { group: 'A', nx: -0.18, ny: -0.24, size: 6.8, hue: 196 },
  { group: 'A', nx: -0.43, ny: 0.19, size: 5.9, hue: 176 },
  { group: 'B', nx: 0.1, ny: -0.39, size: 7.2, hue: 206 },
  { group: 'B', nx: 0.38, ny: -0.25, size: 6.2, hue: 214 },
  { group: 'B', nx: 0.27, ny: -0.02, size: 7.6, hue: 198 },
  { group: 'C', nx: -0.03, ny: 0.27, size: 7, hue: 266 },
  { group: 'C', nx: 0.28, ny: 0.25, size: 6.1, hue: 242 },
  { group: 'C', nx: 0.09, ny: 0.47, size: 6.5, hue: 286 },
  { group: 'C', nx: 0.52, ny: 0.08, size: 5.8, hue: 224 }
]

const CORE_LINKS = [
  [0, 1, 0.68],
  [0, 2, 0.96],
  [0, 3, 0.58],
  [2, 4, 0.82],
  [4, 5, 0.7],
  [4, 6, 0.92],
  [6, 7, 0.88],
  [7, 8, 0.72],
  [7, 9, 0.64],
  [6, 10, 0.8],
  [8, 10, 0.56],
  [3, 7, 0.52],
  [1, 4, 0.48]
]

const CLUSTER_META = {
  A: { label: 'A', hue: 178 },
  B: { label: 'B', hue: 208 },
  C: { label: 'C', hue: 266 }
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const getCurve = (from, to, bend = 0) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy))
  const normalX = -dy / distance
  const normalY = dx / distance
  const curveDepth = clamp(distance * bend, -96, 96)

  return {
    start: from,
    control: {
      x: from.x + dx * 0.5 + normalX * curveDepth,
      y: from.y + dy * 0.5 + normalY * curveDepth
    },
    end: to
  }
}

const pointOnCurve = (curve, t) => {
  const inv = 1 - t
  return {
    x: inv * inv * curve.start.x + 2 * inv * t * curve.control.x + t * t * curve.end.x,
    y: inv * inv * curve.start.y + 2 * inv * t * curve.control.y + t * t * curve.end.y
  }
}

const drawCurve = (ctx, curve) => {
  ctx.beginPath()
  ctx.moveTo(curve.start.x, curve.start.y)
  ctx.quadraticCurveTo(curve.control.x, curve.control.y, curve.end.x, curve.end.y)
  ctx.stroke()
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
  const originRef = useRef({ x: 0, y: 0 })
  const timeRef = useRef(0)

  // Network parameters
  const connectionRadius = Math.min(230, Math.max(145, Math.min(dimensions.width, dimensions.height) * 0.34))
  const signalSpeed = 1.8
  const activationThreshold = 0.5
  const resonanceDecay = 0.95

  // Initialize network when canvas is ready
  useEffect(() => {
    if (dimensions.width === 0 || hasInitialized.current) return
    hasInitialized.current = true

    seedNetwork()
  }, [dimensions.width, dimensions.height])

  const seedNetwork = useCallback(() => {
    const nodes = []
    const field = Math.min(dimensions.width, dimensions.height)
    const spreadX = field * 1.06
    const spreadY = field * 0.9
    const margin = Math.max(34, field * 0.055)

    originRef.current = {
      x: clamp(dimensions.centerX - field * 0.18, margin, dimensions.width - margin),
      y: clamp(dimensions.centerY + field * 0.02, margin, dimensions.height - margin)
    }

    NODE_BLUEPRINT.forEach((blueprint, index) => {
      const x = clamp(dimensions.centerX + blueprint.nx * spreadX, margin, dimensions.width - margin)
      const y = clamp(dimensions.centerY + blueprint.ny * spreadY, margin, dimensions.height - margin)

      nodes.push({
        id: index,
        x,
        y,
        anchorX: x,
        anchorY: y,
        vx: 0,
        vy: 0,
        activation: blueprint.role === 'origin' ? 0.35 : 0,
        baseActivation: 0,
        resonance: 0,
        lastFired: -1000,
        connections: [],
        size: blueprint.size,
        hue: blueprint.hue,
        group: blueprint.group,
        role: blueprint.role || 'node',
        pulsePhase: Math.random() * Math.PI * 2
      })
    })

    nodesRef.current = nodes
    formConnections()
  }, [dimensions.width, dimensions.height, dimensions.centerX, dimensions.centerY])

  const createNode = useCallback((x, y) => {
    const groups = Object.keys(CLUSTER_META)
    const group = groups[nodesRef.current.length % groups.length]
    const node = {
      id: nodesRef.current.length,
      x,
      y,
      anchorX: x,
      anchorY: y,
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.1,
      activation: 0,
      baseActivation: 0,
      resonance: 0,
      lastFired: -1000,
      connections: [],
      size: 6,
      hue: CLUSTER_META[group].hue + (Math.random() - 0.5) * 18,
      group,
      role: 'wanderer',
      pulsePhase: Math.random() * Math.PI * 2
    }

    nodesRef.current.push(node)
    return node
  }, [])

  const getEdgeForNodes = useCallback((from, to) => (
    edgesRef.current.find(edge =>
      (edge.from === from && edge.to === to) ||
      (edge.from === to && edge.to === from)
    )
  ), [])

  const formConnections = useCallback(() => {
    const nodes = nodesRef.current
    const edgeKeys = new Set()
    edgesRef.current = []
    nodes.forEach(n => n.connections = [])

    const addEdge = (n1, n2, baseIntensity = 0.3, directed = false) => {
      if (!n1 || !n2 || n1 === n2) return

      const key = [n1.id, n2.id].sort((a, b) => a - b).join(':')
      if (edgeKeys.has(key)) return
      edgeKeys.add(key)

      const dx = n2.x - n1.x
      const dy = n2.y - n1.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const proximity = clamp(1 - (distance / (connectionRadius * 1.2)), 0.14, 1)
      const sameGroupBoost = n1.group === n2.group ? 0.14 : 0
      const signalIntensity = clamp(baseIntensity + sameGroupBoost, 0.16, 1)

      const edge = {
        from: n1,
        to: n2,
        weight: clamp((proximity + signalIntensity) * 0.5, 0.12, 1),
        baseIntensity: signalIntensity,
        signalIntensity,
        activity: signalIntensity * 0.18,
        phase: Math.random(),
        bend: (Math.random() - 0.5) * (directed ? 0.46 : 0.78),
        direction: directed ? 1 : (Math.random() > 0.5 ? 1 : -1)
      }

      edgesRef.current.push(edge)
      n1.connections.push(n2)
      n2.connections.push(n1)
    }

    CORE_LINKS.forEach(([fromId, toId, intensity]) => {
      addEdge(nodes[fromId], nodes[toId], intensity, true)
    })

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i]
        const n2 = nodes[j]
        const dx = n2.x - n1.x
        const dy = n2.y - n1.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const sameGroup = n1.group === n2.group
        const threshold = sameGroup ? connectionRadius * 0.9 : connectionRadius * 0.58

        if (distance < threshold) {
          const proximityIntensity = sameGroup ? 0.42 : 0.22
          addEdge(n1, n2, proximityIntensity, false)
        }
      }
    }
  }, [connectionRadius])

  const createSignal = useCallback((from, to, strength) => {
    const edge = getEdgeForNodes(from, to)
    if (edge) {
      edge.activity = clamp(edge.activity + strength * 0.55, 0, 1)
      edge.signalIntensity = clamp(edge.signalIntensity + strength * 0.18, 0, 1)
    }

    signalsRef.current.push({
      from,
      to,
      edge,
      progress: 0,
      strength,
      speed: signalSpeed
    })
  }, [getEdgeForNodes, signalSpeed])

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

    if (cascadeEnabled && node.activation > activationThreshold) {
      const strongestPaths = node.connections
        .map(neighbor => ({
          neighbor,
          edge: getEdgeForNodes(node, neighbor)
        }))
        .filter(path => path.edge)
        .sort((a, b) => b.edge.signalIntensity - a.edge.signalIntensity)
        .slice(0, 4)

      strongestPaths.forEach(({ neighbor, edge }) => {
        if (timeRef.current - neighbor.lastFired > 30) {
          createSignal(node, neighbor, strength * (0.58 + edge.signalIntensity * 0.28))
        }
      })
    }
  }, [cascadeEnabled, activationThreshold, createSignal, getEdgeForNodes])

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
      const anchorPull = node.role === 'wanderer' ? 0.004 : 0.009
      node.vx += (node.anchorX - node.x) * anchorPull
      node.vy += (node.anchorY - node.y) * anchorPull

      node.x += node.vx
      node.y += node.vy

      node.vx *= 0.9
      node.vy *= 0.9

      const margin = Math.max(28, Math.min(dimensions.width, dimensions.height) * 0.045)
      node.x = clamp(node.x, margin, dimensions.width - margin)
      node.y = clamp(node.y, margin, dimensions.height - margin)

      node.activation *= resonanceDecay

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

    const minSpacing = Math.max(46, Math.min(72, Math.min(dimensions.width, dimensions.height) * 0.08))
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i]
        const n2 = nodes[j]
        const dx = n2.x - n1.x
        const dy = n2.y - n1.y
        const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy))

        if (distance < minSpacing) {
          const overlap = (minSpacing - distance) * 0.035
          const nx = dx / distance
          const ny = dy / distance
          n1.vx -= nx * overlap
          n1.vy -= ny * overlap
          n2.vx += nx * overlap
          n2.vy += ny * overlap
        }
      }
    }

    for (const edge of edgesRef.current) {
      const sourceEnergy = edge.from.activation + edge.from.baseActivation
      const targetEnergy = edge.to.activation + edge.to.baseActivation
      const carrierLoad = (sourceEnergy + targetEnergy) * 0.32
      edge.activity = clamp(Math.max(edge.activity * 0.94, carrierLoad, edge.baseIntensity * 0.1), 0, 1)
      edge.signalIntensity = clamp(edge.baseIntensity * 0.45 + edge.activity * 0.75, 0.08, 1)
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

    const time = timeRef.current
    const pointer = mouse.positionRef.current
    const origin = originRef.current.x ? originRef.current : {
      x: dimensions.centerX - dimensions.width * 0.08,
      y: dimensions.centerY
    }
    const focusX = mouse.isInBounds ? origin.x * 0.88 + pointer.x * 0.12 : origin.x
    const focusY = mouse.isInBounds ? origin.y * 0.88 + pointer.y * 0.12 : origin.y
    const fieldRadius = Math.max(dimensions.width, dimensions.height) * 0.86

    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = 'rgba(0, 2, 8, 0.12)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const pressure = ctx.createRadialGradient(focusX, focusY, 0, focusX, focusY, fieldRadius)
    pressure.addColorStop(0, 'rgba(88, 255, 223, 0.115)')
    pressure.addColorStop(0.18, 'rgba(20, 110, 138, 0.07)')
    pressure.addColorStop(0.56, 'rgba(0, 7, 20, 0.1)')
    pressure.addColorStop(1, 'rgba(0, 0, 0, 0.42)')
    ctx.fillStyle = pressure
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    ctx.save()
    ctx.translate(focusX, focusY)
    ctx.rotate(time * 0.0006)
    ctx.strokeStyle = 'rgba(102, 204, 255, 0.032)'
    ctx.lineWidth = 1
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.ellipse(
        0,
        0,
        fieldRadius * (0.18 + i * 0.13),
        fieldRadius * (0.08 + i * 0.055),
        i * 0.52,
        0,
        Math.PI * 2
      )
      ctx.stroke()
    }
    ctx.restore()

    // Draw subtle cluster containment before the signal structure ignites.
    Object.keys(CLUSTER_META).forEach((group, index) => {
      const members = nodes.filter(node => node.group === group)
      if (members.length === 0) return

      const center = members.reduce((acc, node) => ({
        x: acc.x + node.x,
        y: acc.y + node.y
      }), { x: 0, y: 0 })
      center.x /= members.length
      center.y /= members.length

      const radius = members.reduce((max, node) => {
        const dx = node.x - center.x
        const dy = node.y - center.y
        return Math.max(max, Math.sqrt(dx * dx + dy * dy))
      }, 0) + 46
      const meta = CLUSTER_META[group]

      ctx.save()
      ctx.translate(center.x, center.y)
      ctx.rotate(index * 0.32 + time * 0.0004)
      ctx.setLineDash([9, 15])
      ctx.fillStyle = `hsla(${meta.hue}, 90%, 48%, 0.022)`
      ctx.strokeStyle = `hsla(${meta.hue}, 90%, 66%, 0.16)`
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let side = 0; side < 6; side++) {
        const angle = (Math.PI * 2 * side) / 6 + Math.PI / 6
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius
        if (side === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.setLineDash([])
      ctx.rotate(-index * 0.32 - time * 0.0004)
      ctx.fillStyle = `hsla(${meta.hue}, 95%, 74%, 0.34)`
      ctx.font = '11px monospace'
      ctx.fillText(meta.label, -radius + 12, -radius * 0.42)
      ctx.restore()
    })

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

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'screen'

    // Draw connection fields, then the weighted signal bones.
    for (const edge of edges) {
      const from = edge.direction === 1 ? edge.from : edge.to
      const to = edge.direction === 1 ? edge.to : edge.from
      const curve = getCurve(from, to, edge.bend)
      const intensity = clamp(edge.signalIntensity, 0, 1)
      const edgeHue = 178 + intensity * 72

      ctx.strokeStyle = `hsla(${edgeHue}, 100%, 62%, ${0.025 + intensity * 0.07})`
      ctx.lineWidth = 9 + edge.weight * 12 + intensity * 9
      drawCurve(ctx, curve)

      ctx.strokeStyle = `hsla(${edgeHue}, 92%, ${56 + intensity * 18}%, ${0.13 + intensity * 0.48})`
      ctx.lineWidth = 0.7 + edge.weight * 1.8 + intensity * 2.6
      drawCurve(ctx, curve)

      if (intensity > 0.28) {
        const lanes = intensity > 0.72 ? 3 : 2
        for (let lane = 0; lane < lanes; lane++) {
          const travel = (time * (0.0028 + intensity * 0.0022) + edge.phase + lane / lanes) % 1
          const head = pointOnCurve(curve, travel)
          const tail = pointOnCurve(curve, Math.max(0, travel - 0.08 - intensity * 0.04))
          const glow = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y)
          glow.addColorStop(0, `hsla(${edgeHue - 28}, 100%, 56%, 0)`)
          glow.addColorStop(0.68, `hsla(${edgeHue}, 100%, 70%, ${0.16 + intensity * 0.22})`)
          glow.addColorStop(1, `hsla(42, 100%, 78%, ${0.38 + intensity * 0.32})`)

          ctx.strokeStyle = glow
          ctx.lineWidth = 1.6 + intensity * 3
          ctx.beginPath()
          ctx.moveTo(tail.x, tail.y)
          ctx.lineTo(head.x, head.y)
          ctx.stroke()

          ctx.fillStyle = `hsla(48, 100%, 78%, ${0.28 + intensity * 0.4})`
          ctx.beginPath()
          ctx.arc(head.x, head.y, 1.8 + intensity * 2.1, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // Draw signals
    ctx.globalAlpha = 1
    for (const signal of signals) {
      const curve = getCurve(signal.from, signal.to, signal.edge?.bend || 0)
      const head = pointOnCurve(curve, signal.progress)
      const tail = pointOnCurve(curve, Math.max(0, signal.progress - 0.18))

      ctx.shadowColor = 'hsla(40, 90%, 70%, 0.8)'
      ctx.shadowBlur = 20

      ctx.strokeStyle = `hsla(40, 95%, 68%, ${signal.strength * 0.46})`
      ctx.lineWidth = 3 + signal.strength * 5
      ctx.beginPath()
      ctx.moveTo(tail.x, tail.y)
      ctx.lineTo(head.x, head.y)
      ctx.stroke()

      ctx.fillStyle = `hsla(40, 90%, 70%, ${signal.strength})`
      ctx.beginPath()
      ctx.arc(head.x, head.y, 3.2 + signal.strength * 2.2, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.shadowBlur = 0
    ctx.globalCompositeOperation = 'source-over'

    // Draw nodes
    for (const node of nodes) {
      const activationLevel = clamp(node.activation + node.baseActivation + node.resonance, 0, 1.4)
      const size = node.size * (0.7 + activationLevel * 0.5)
      const nodeHue = node.hue

      ctx.shadowColor = `hsl(${nodeHue}, 80%, 72%)`
      ctx.shadowBlur = 12 + activationLevel * 26

      if (node.resonance > 0.1) {
        ctx.strokeStyle = `hsla(180, 70%, 70%, ${node.resonance})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(node.x, node.y, size * 2, 0, Math.PI * 2)
        ctx.stroke()
      }

      ctx.fillStyle = `hsla(${nodeHue}, 94%, 62%, ${0.16 + activationLevel * 0.16})`
      ctx.beginPath()
      ctx.arc(node.x, node.y, size * 2.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = `hsla(${nodeHue}, 82%, 70%, ${0.66 + activationLevel * 0.24})`
      ctx.beginPath()
      ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
      ctx.fill()

      ctx.shadowBlur = 0
      ctx.strokeStyle = `hsla(${nodeHue}, 100%, 86%, ${0.48 + activationLevel * 0.32})`
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(node.x, node.y, size + 3, 0, Math.PI * 2)
      ctx.stroke()

      if (activationLevel > 0.5) {
        ctx.shadowBlur = 25
        ctx.fillStyle = `hsla(${nodeHue + 52}, 96%, 86%, ${Math.min(0.8, activationLevel * 0.62)})`
        ctx.beginPath()
        ctx.arc(node.x, node.y, size * 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }, [ctx, dimensions.width, dimensions.height, dimensions.centerX, dimensions.centerY, mouse.isInBounds, mouse.positionRef])

  // Animation frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    timeRef.current++
    updateNodes()
    updateSignals()
    updateResonanceWaves()
    draw()
  }, [ctx, dimensions.width, dimensions.height, updateNodes, updateSignals, updateResonanceWaves, draw])

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

    const sourceNode = nodes.find(node => node.role === 'origin') || nodes[Math.floor(Math.random() * nodes.length)]
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
    const nodes = nodesRef.current
    const field = Math.min(dimensions.width, dimensions.height)
    const margin = Math.max(34, field * 0.055)

    nodes.forEach(node => {
      if (node.role !== 'origin') {
        node.anchorX = clamp(node.anchorX + (Math.random() - 0.5) * field * 0.12, margin, dimensions.width - margin)
        node.anchorY = clamp(node.anchorY + (Math.random() - 0.5) * field * 0.1, margin, dimensions.height - margin)
        node.vx += (Math.random() - 0.5) * 1.2
        node.vy += (Math.random() - 0.5) * 1.2
      }
    })

    formConnections()
    edgesRef.current.forEach(edge => {
      edge.activity = clamp(edge.activity + 0.28, 0, 1)
      edge.signalIntensity = clamp(edge.signalIntensity + 0.16, 0, 1)
    })

    logEvent('network topology rewired - new pathways formed')
    updateMessage('∴ network structure evolved - information flows shift ∴')
  }, [dimensions.width, dimensions.height, formConnections, logEvent, updateMessage])

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
