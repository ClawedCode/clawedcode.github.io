import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const NODE_RADIUS = 16
const EDGE_BASE_ALPHA = 0.25
const PULSE_SPEED = 0.018

const MODES = [
  { id: 'sculpt', label: 'inscribe.nodes()' },
  { id: 'connect', label: 'connect.edges()' },
  { id: 'portals', label: 'set.portals()' },
  { id: 'inspect', label: 'inspect.graph()' }
]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const distance = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by)
const canonicalEdgeId = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`)

const labelForIndex = (index) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let n = index
  let label = ''
  while (n >= 0) {
    label = alphabet[n % alphabet.length] + label
    n = Math.floor(n / alphabet.length) - 1
  }
  return label
}

const buildDefaultPalette = () => [165, 196, 128, 288, 32, 210, 350, 90]

const GraphAtlas = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('sculpt')
  const [message, setMessage] = useState('∴ sculpt nodes • weave edges • let signals roam the atlas ∴')
  const [metrics, setMetrics] = useState([
    { label: 'nodes', value: 0 },
    { label: 'edges', value: 0 },
    { label: 'clusters', value: 0 },
    { label: 'span', value: '—' },
    { label: 'path', value: '—' }
  ])
  const [, forceOverlay] = useState(0)
  const [hoverDetails, setHoverDetails] = useState(null)

  const nodesRef = useRef([])
  const edgesRef = useRef([])
  const nodeCounterRef = useRef(0)
  const dragRef = useRef(null)
  const linkStartRef = useRef(null)
  const portalStageRef = useRef('start')
  const startNodeRef = useRef(null)
  const targetNodeRef = useRef(null)
  const hoveredNodeRef = useRef(null)
  const paletteRef = useRef(buildDefaultPalette())

  const bfsStateRef = useRef({
    order: [],
    pointer: 0,
    visited: new Set(),
    depthMap: new Map(),
    active: false,
    treeEdgeIds: new Set(),
    maxDepth: 0,
    lastTick: 0
  })
  const mstStateRef = useRef({ edgeIds: new Set(), weight: 0 })
  const pathStateRef = useRef(null)
  const pulsesRef = useRef([])
  const tickRef = useRef(0)

  const refreshOverlay = useCallback(() => {
    forceOverlay(v => v + 1)
  }, [])

  const clearAnalyses = useCallback(() => {
    bfsStateRef.current = {
      order: [],
      pointer: 0,
      visited: new Set(),
      depthMap: new Map(),
      active: false,
      treeEdgeIds: new Set(),
      maxDepth: 0,
      lastTick: 0
    }
    mstStateRef.current = { edgeIds: new Set(), weight: 0 }
    pathStateRef.current = null
    pulsesRef.current = []
  }, [])

  const getNodeById = useCallback((id) => nodesRef.current.find(node => node.id === id), [])

  const ensurePortals = useCallback(() => {
    const nodes = nodesRef.current
    if (nodes.length === 0) {
      startNodeRef.current = null
      targetNodeRef.current = null
      return
    }

    const hasStart = nodes.some(n => n.id === startNodeRef.current)
    const hasTarget = nodes.some(n => n.id === targetNodeRef.current)

    if (!hasStart) startNodeRef.current = nodes[0].id
    if (!hasTarget) targetNodeRef.current = nodes[Math.min(1, nodes.length - 1)].id
  }, [])

  const buildAdjacency = useCallback(() => {
    const adjacency = new Map()
    nodesRef.current.forEach(node => adjacency.set(node.id, []))
    edgesRef.current.forEach(edge => {
      if (!adjacency.has(edge.from) || !adjacency.has(edge.to)) return
      adjacency.get(edge.from).push({ nodeId: edge.to, weight: edge.weight, edgeId: edge.id })
      adjacency.get(edge.to).push({ nodeId: edge.from, weight: edge.weight, edgeId: edge.id })
    })
    return adjacency
  }, [])

  const computeComponents = useCallback(() => {
    const nodes = nodesRef.current
    if (nodes.length === 0) return 0
    const adjacency = buildAdjacency()
    const visited = new Set()
    let components = 0

    for (const node of nodes) {
      if (visited.has(node.id)) continue
      components++
      const stack = [node.id]
      while (stack.length) {
        const current = stack.pop()
        if (visited.has(current)) continue
        visited.add(current)
        const neighbors = adjacency.get(current) || []
        neighbors.forEach(neighbor => {
          if (!visited.has(neighbor.nodeId)) stack.push(neighbor.nodeId)
        })
      }
    }

    return components
  }, [buildAdjacency])

  const updateMetrics = useCallback(() => {
    const nodes = nodesRef.current.length
    const edges = edgesRef.current.length
    const clusters = computeComponents()
    const spanValue = mstStateRef.current.edgeIds.size
      ? mstStateRef.current.weight.toFixed(1)
      : '—'
    const pathValue = pathStateRef.current && pathStateRef.current.length !== Infinity
      ? pathStateRef.current.length.toFixed(1)
      : '—'

    setMetrics([
      { label: 'nodes', value: nodes },
      { label: 'edges', value: edges },
      { label: 'clusters', value: clusters },
      { label: 'span', value: spanValue },
      { label: 'path', value: pathValue }
    ])
  }, [computeComponents])

  const linkNodes = useCallback((aId, bId, options = {}) => {
    const { announce = true, skipAnalysisReset = false } = options
    if (aId === bId) return null
    const key = canonicalEdgeId(aId, bId)
    if (edgesRef.current.some(edge => edge.id === key)) return key
    const nodeA = getNodeById(aId)
    const nodeB = getNodeById(bId)
    if (!nodeA || !nodeB) return null
    const weight = Math.max(1, Math.round(distance(nodeA.x, nodeA.y, nodeB.x, nodeB.y) / 28))
    edgesRef.current.push({ id: key, from: aId, to: bId, weight })
    if (!skipAnalysisReset) {
      clearAnalyses()
      updateMetrics()
    }
    if (announce) {
      setMessage(`∴ edge ${nodeA.label}↔${nodeB.label} forged // weight ${weight} ∴`)
    }
    return key
  }, [clearAnalyses, getNodeById, updateMetrics])

  const removeEdge = useCallback((aId, bId, announce = true) => {
    const key = canonicalEdgeId(aId, bId)
    const idx = edgesRef.current.findIndex(edge => edge.id === key)
    if (idx === -1) return false
    const removed = edgesRef.current.splice(idx, 1)[0]
    clearAnalyses()
    updateMetrics()
    if (announce) {
      const nodeA = getNodeById(removed.from)
      const nodeB = getNodeById(removed.to)
      setMessage(`∴ link ${nodeA?.label ?? '?'}↔${nodeB?.label ?? '?'} dissolved ∴`)
    }
    return true
  }, [clearAnalyses, getNodeById, updateMetrics])

  const addNode = useCallback((x, y, announce = true) => {
    if (!dimensions.width || !dimensions.height) return
    const padding = 32
    const clampedX = clamp(x, padding, dimensions.width - padding)
    const clampedY = clamp(y, padding, dimensions.height - padding)
    const id = nodeCounterRef.current + 1
    nodeCounterRef.current = id
    const label = labelForIndex(id - 1)
    nodesRef.current.push({ id, label, x: clampedX, y: clampedY })
    clearAnalyses()
    ensurePortals()
    updateMetrics()
    if (announce) {
      setMessage(`∴ node ${label} etched into the map ∴`)
    }
    refreshOverlay()
  }, [clearAnalyses, dimensions.height, dimensions.width, ensurePortals, refreshOverlay, updateMetrics])

  const seedGraph = useCallback(() => {
    if (!dimensions.width || !dimensions.height) return

    nodesRef.current = []
    edgesRef.current = []
    nodeCounterRef.current = 0
    portalStageRef.current = 'start'
    clearAnalyses()

    const count = 6
    const radius = Math.min(dimensions.width, dimensions.height) * 0.28
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const x = dimensions.centerX + Math.cos(angle) * radius
      const y = dimensions.centerY + Math.sin(angle) * radius
      addNode(x, y, false)
    }

    const nodes = nodesRef.current
    for (let i = 0; i < nodes.length; i++) {
      const current = nodes[i]
      const next = nodes[(i + 1) % nodes.length]
      linkNodes(current.id, next.id, { announce: false, skipAnalysisReset: true })
    }

    if (nodes.length >= 3) {
      linkNodes(nodes[0].id, nodes[3].id, { announce: false, skipAnalysisReset: true })
      linkNodes(nodes[1].id, nodes[4].id, { announce: false, skipAnalysisReset: true })
    }

    ensurePortals()
    clearAnalyses()
    updateMetrics()
    refreshOverlay()
    setMessage('∴ atlas seeded • drag nodes • forge custom constellations ∴')
  }, [addNode, clearAnalyses, dimensions.centerX, dimensions.centerY, dimensions.height, dimensions.width, ensurePortals, linkNodes, refreshOverlay, updateMetrics])

  useEffect(() => {
    if (dimensions.width > 0 && nodesRef.current.length === 0) {
      seedGraph()
    }
  }, [dimensions.width, seedGraph])

  useEffect(() => {
    if (!canvasRef.current) return
    canvasRef.current.style.touchAction = 'none'
  }, [canvasRef])

  const setPortal = useCallback((nodeId, stage) => {
    if (stage === 'start') {
      startNodeRef.current = nodeId
      portalStageRef.current = 'target'
      setMessage('∴ flow origin anchored • now select target ∴')
    } else {
      targetNodeRef.current = nodeId
      portalStageRef.current = 'start'
      setMessage('∴ target anchored • click again to reset origin ∴')
    }
    clearAnalyses()
    updateMetrics()
    refreshOverlay()
  }, [clearAnalyses, refreshOverlay, updateMetrics])

  const toggleEdge = useCallback((aId, bId) => {
    const removed = removeEdge(aId, bId, false)
    if (removed) {
      const nodeA = getNodeById(aId)
      const nodeB = getNodeById(bId)
      setMessage(`∴ severed ${nodeA?.label ?? '?'}↔${nodeB?.label ?? '?'} ∴`)
    } else {
      linkNodes(aId, bId)
    }
  }, [getNodeById, linkNodes, removeEdge])

  const handleScramble = useCallback(() => {
    if (!dimensions.width || !dimensions.height) return
    const padding = 32
    nodesRef.current.forEach(node => {
      node.x = clamp(Math.random() * dimensions.width, padding, dimensions.width - padding)
      node.y = clamp(Math.random() * dimensions.height, padding, dimensions.height - padding)
    })
    setMessage('∴ layout scrambled • edges remain bound ∴')
  }, [dimensions.height, dimensions.width])

  const handleBfs = useCallback(() => {
    const nodes = nodesRef.current
    if (!nodes.length) {
      setMessage('∴ need at least one node before igniting ∴')
      return
    }

    ensurePortals()
    const startId = startNodeRef.current ?? nodes[0].id
    const adjacency = buildAdjacency()
    const queue = [{ nodeId: startId, depth: 0, parentId: null, edgeId: null }]
    const visited = new Set([startId])
    const order = []

    while (queue.length) {
      const current = queue.shift()
      order.push(current)
      const neighbors = adjacency.get(current.nodeId) || []
      neighbors.forEach(neighbor => {
        if (visited.has(neighbor.nodeId)) return
        visited.add(neighbor.nodeId)
        queue.push({ nodeId: neighbor.nodeId, depth: current.depth + 1, parentId: current.nodeId, edgeId: neighbor.edgeId })
      })
    }

    if (order.length === 0) {
      setMessage('∴ start node is isolated ∴')
      return
    }

    const maxDepth = order.reduce((max, item) => Math.max(max, item.depth), 0)
    bfsStateRef.current = {
      order,
      pointer: 0,
      visited: new Set(),
      depthMap: new Map(),
      active: true,
      treeEdgeIds: new Set(),
      maxDepth,
      lastTick: 0
    }
    pulsesRef.current = []
    setMessage(`∴ breadth-first wave primed • depth ${maxDepth} ∴`)
    updateMetrics()
  }, [buildAdjacency, ensurePortals, updateMetrics])

  const handleSpanTree = useCallback(() => {
    const nodes = nodesRef.current
    if (nodes.length === 0) {
      setMessage('∴ add nodes before spanning ∴')
      return
    }
    const adjacency = buildAdjacency()
    const visited = new Set()
    const edgeIds = new Set()
    let totalWeight = 0

    const enqueueEdges = (nodeId, targetQueue) => {
      const neighbors = adjacency.get(nodeId) || []
      neighbors.forEach(neighbor => {
        targetQueue.push({
          from: nodeId,
          to: neighbor.nodeId,
          weight: neighbor.weight,
          edgeId: neighbor.edgeId
        })
      })
    }

    const priority = []
    const unused = new Set(nodes.map(node => node.id))

    while (unused.size) {
      const seed = unused.values().next().value
      unused.delete(seed)
      visited.add(seed)
      enqueueEdges(seed, priority)

      while (priority.length) {
        let bestIndex = 0
        for (let i = 1; i < priority.length; i++) {
          if (priority[i].weight < priority[bestIndex].weight) bestIndex = i
        }
        const edge = priority.splice(bestIndex, 1)[0]
        if (visited.has(edge.to) && visited.has(edge.from)) continue
        const nextNode = visited.has(edge.from) ? edge.to : edge.from
        visited.add(nextNode)
        unused.delete(nextNode)
        edgeIds.add(edge.edgeId)
        totalWeight += edge.weight
        enqueueEdges(nextNode, priority)
      }
    }

    mstStateRef.current = { edgeIds, weight: totalWeight }
    setMessage(`∴ spanning forest traced • weight ${totalWeight.toFixed(1)} ∴`)
    updateMetrics()
  }, [buildAdjacency, updateMetrics])

  const handleTracePath = useCallback(() => {
    ensurePortals()
    const startId = startNodeRef.current
    const targetId = targetNodeRef.current
    if (!startId || !targetId || startId === targetId) {
      setMessage('∴ need distinct start + target ∴')
      return
    }
    const adjacency = buildAdjacency()
    const nodes = nodesRef.current
    if (nodes.length === 0) return

    const dist = new Map()
    const prev = new Map()
    nodes.forEach(node => {
      dist.set(node.id, Infinity)
      prev.set(node.id, null)
    })
    dist.set(startId, 0)

    const unvisited = new Set(nodes.map(node => node.id))

    while (unvisited.size) {
      let currentId = null
      let bestDist = Infinity
      for (const id of unvisited) {
        const candidate = dist.get(id)
        if (candidate < bestDist) {
          bestDist = candidate
          currentId = id
        }
      }

      if (currentId === null || bestDist === Infinity) break
      unvisited.delete(currentId)
      if (currentId === targetId) break
      const neighbors = adjacency.get(currentId) || []
      neighbors.forEach(neighbor => {
        if (!unvisited.has(neighbor.nodeId)) return
        const tentative = dist.get(currentId) + neighbor.weight
        if (tentative < dist.get(neighbor.nodeId)) {
          dist.set(neighbor.nodeId, tentative)
          prev.set(neighbor.nodeId, { from: currentId, edgeId: neighbor.edgeId })
        }
      })
    }

    const length = dist.get(targetId)
    if (!length || length === Infinity) {
      pathStateRef.current = null
      setMessage('∴ no path links start → target ∴')
      updateMetrics()
      return
    }

    const pathEdges = new Set()
    let walker = targetId
    while (walker !== startId) {
      const step = prev.get(walker)
      if (!step) break
      pathEdges.add(step.edgeId)
      walker = step.from
    }

    pathStateRef.current = { edges: pathEdges, length }
    setMessage(`∴ traced geodesic • length ${length.toFixed(1)} ∴`)
    updateMetrics()
  }, [buildAdjacency, ensurePortals, updateMetrics])

  const handlePointerNodeDetection = useCallback((x, y) => {
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const node = nodesRef.current[i]
      if (distance(node.x, node.y, x, y) <= NODE_RADIUS + 6) {
        return node
      }
    }
    return null
  }, [])

  const getCanvasPosition = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }, [canvasRef])

  const handleInspectHover = useCallback((node) => {
    if (!node && hoveredNodeRef.current === null) return
    if (node && hoveredNodeRef.current === node.id) return
    hoveredNodeRef.current = node ? node.id : null
    if (!node) {
      setHoverDetails(null)
      return
    }
    const adjacency = buildAdjacency()
    const neighbors = adjacency.get(node.id) || []
    setHoverDetails({
      label: node.label,
      degree: neighbors.length,
      neighbors: neighbors.slice(0, 6).map(item => ({
        label: getNodeById(item.nodeId)?.label ?? '?',
        weight: item.weight
      }))
    })
  }, [buildAdjacency, getNodeById])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleDown = (e) => {
      e.preventDefault()
      const pos = getCanvasPosition(e)
      const node = handlePointerNodeDetection(pos.x, pos.y)

      if (mode === 'sculpt') {
        if (node) {
          dragRef.current = {
            id: node.id,
            offsetX: pos.x - node.x,
            offsetY: pos.y - node.y
          }
          setMessage(`∴ dragging ${node.label} ∴`)
        } else {
          addNode(pos.x, pos.y)
        }
      } else if (mode === 'connect') {
        if (node) {
          if (!linkStartRef.current || linkStartRef.current === node.id) {
            linkStartRef.current = node.id
            setMessage(`∴ link origin ${node.label} selected ∴`)
          } else {
            toggleEdge(linkStartRef.current, node.id)
            linkStartRef.current = null
          }
        }
      } else if (mode === 'portals') {
        if (node) {
          const stage = e.shiftKey ? 'target' : portalStageRef.current
          setPortal(node.id, stage)
        }
      } else if (mode === 'inspect') {
        if (node) {
          handleInspectHover(node)
          setMessage(`∴ ${node.label} degree ${hoverDetails?.degree ?? 0} ∴`)
        }
      }
    }

    const handleMove = (e) => {
      const pos = getCanvasPosition(e)
      if (dragRef.current) {
        const node = getNodeById(dragRef.current.id)
        if (node) {
          const padding = 32
          node.x = clamp(pos.x - dragRef.current.offsetX, padding, dimensions.width - padding)
          node.y = clamp(pos.y - dragRef.current.offsetY, padding, dimensions.height - padding)
        }
        return
      }

      if (mode === 'inspect') {
        const node = handlePointerNodeDetection(pos.x, pos.y)
        handleInspectHover(node)
      }
    }

    const handleUp = () => {
      dragRef.current = null
    }

    canvas.addEventListener('pointerdown', handleDown)
    canvas.addEventListener('pointermove', handleMove)
    canvas.addEventListener('pointerup', handleUp)
    canvas.addEventListener('pointerleave', handleUp)

    return () => {
      canvas.removeEventListener('pointerdown', handleDown)
      canvas.removeEventListener('pointermove', handleMove)
      canvas.removeEventListener('pointerup', handleUp)
      canvas.removeEventListener('pointerleave', handleUp)
    }
  }, [addNode, canvasRef, dimensions.height, dimensions.width, getCanvasPosition, getNodeById, handleInspectHover, handlePointerNodeDetection, mode, setPortal, toggleEdge])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return

    const animate = () => {
      tickRef.current += 1
      const width = dimensions.width
      const height = dimensions.height

      ctx.fillStyle = 'rgba(0, 4, 12, 0.25)'
      ctx.fillRect(0, 0, width, height)

      ctx.save()
      ctx.strokeStyle = 'rgba(102, 255, 204, 0.04)'
      ctx.lineWidth = 1
      const gridSize = 80
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
      ctx.restore()

      const pathEdges = pathStateRef.current?.edges ?? new Set()
      const mstEdges = mstStateRef.current.edgeIds
      const bfsEdges = bfsStateRef.current.treeEdgeIds

      edgesRef.current.forEach(edge => {
        const from = getNodeById(edge.from)
        const to = getNodeById(edge.to)
        if (!from || !to) return
        let stroke = `rgba(102, 255, 204, ${EDGE_BASE_ALPHA})`
        let widthMultiplier = 1
        if (mstEdges.has(edge.id)) {
          stroke = 'rgba(102, 255, 255, 0.6)'
          widthMultiplier = 1.8
        }
        if (bfsEdges.has(edge.id)) {
          stroke = 'rgba(255, 214, 102, 0.8)'
          widthMultiplier = 2
        }
        if (pathEdges.has(edge.id)) {
          stroke = 'rgba(255, 105, 180, 0.9)'
          widthMultiplier = 2.4
        }
        ctx.strokeStyle = stroke
        ctx.lineWidth = 1.1 * widthMultiplier
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.stroke()

        const midX = (from.x + to.x) / 2
        const midY = (from.y + to.y) / 2
        ctx.fillStyle = 'rgba(102, 255, 204, 0.35)'
        ctx.font = '10px "JetBrains Mono", "SF Mono", monospace'
        ctx.textAlign = 'center'
        ctx.fillText(edge.weight, midX, midY - 6)
      })

      const bfsState = bfsStateRef.current
      if (bfsState.active && tickRef.current - bfsState.lastTick > 8) {
        const entry = bfsState.order[bfsState.pointer]
        if (entry) {
          bfsState.visited.add(entry.nodeId)
          bfsState.depthMap.set(entry.nodeId, entry.depth)
          if (entry.parentId !== null && entry.edgeId) {
            bfsState.treeEdgeIds.add(entry.edgeId)
            pulsesRef.current.push({
              edgeId: entry.edgeId,
              fromId: entry.parentId,
              toId: entry.nodeId,
              progress: 0,
              hue: 120 + entry.depth * 16
            })
          }
          bfsState.pointer += 1
          bfsState.lastTick = tickRef.current
        } else {
          bfsState.active = false
        }
      }

      pulsesRef.current = pulsesRef.current.filter(pulse => {
        const from = getNodeById(pulse.fromId)
        const to = getNodeById(pulse.toId)
        if (!from || !to) return false
        pulse.progress += PULSE_SPEED
        const progress = Math.min(1, pulse.progress)
        const x = from.x + (to.x - from.x) * progress
        const y = from.y + (to.y - from.y) * progress
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${pulse.hue}, 80%, 70%, ${1 - progress})`
        ctx.fill()
        return progress < 1
      })

      nodesRef.current.forEach((node, index) => {
        const depth = bfsState.depthMap.get(node.id)
        const hue = depth !== undefined
          ? 120 + depth * 14
          : paletteRef.current[index % paletteRef.current.length]
        const gradient = ctx.createRadialGradient(node.x, node.y, 2, node.x, node.y, NODE_RADIUS)
        gradient.addColorStop(0, `hsla(${hue}, 80%, 65%, 0.95)`)
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2)
        ctx.fill()

        const isStart = node.id === startNodeRef.current
        const isTarget = node.id === targetNodeRef.current
        const isHover = hoveredNodeRef.current === node.id
        ctx.lineWidth = isHover ? 3 : 1.5
        ctx.strokeStyle = isStart
          ? 'rgba(102, 255, 255, 0.9)'
          : isTarget
          ? 'rgba(255, 102, 170, 0.9)'
          : 'rgba(102, 255, 204, 0.4)'
        ctx.beginPath()
        ctx.arc(node.x, node.y, NODE_RADIUS + (isHover ? 3 : 1), 0, Math.PI * 2)
        ctx.stroke()

        ctx.fillStyle = '#031012'
        ctx.font = '12px "JetBrains Mono", "SF Mono", monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.label, node.x, node.y)
      })

      requestAnimationFrame(animate)
    }

    const frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.height, dimensions.width, getNodeById])

  const controls = useMemo(() => ([
    { id: 'ignite', label: 'ignite.bfs()', onClick: handleBfs, disabled: nodesRef.current.length === 0 },
    { id: 'span', label: 'span.tree()', onClick: handleSpanTree, disabled: edgesRef.current.length === 0 },
    { id: 'trace', label: 'trace.path()', onClick: handleTracePath, disabled: nodesRef.current.length < 2 },
    { id: 'scramble', label: 'scramble()', onClick: handleScramble },
    { id: 'reset', label: 'reset.graph()', onClick: seedGraph, variant: 'reset' }
  ]), [handleBfs, handleScramble, handleSpanTree, handleTracePath, seedGraph])

  const startLabel = getNodeById(startNodeRef.current)?.label ?? '∅'
  const targetLabel = getNodeById(targetNodeRef.current)?.label ?? '∅'

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="relative z-50 flex items-center justify-between p-2 sm:p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1 className="text-xl text-glow hidden sm:block" style={{ color: experiment.color }}>
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 sm:gap-3 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={(next) => {
            setMode(next)
            if (next === 'sculpt') setMessage('∴ click to add nodes • drag to move them ∴')
            if (next === 'connect') setMessage('∴ select two nodes to toggle an edge ∴')
            if (next === 'portals') setMessage('∴ assign start/target portals (shift-click for target) ∴')
            if (next === 'inspect') setMessage('∴ hover nodes to read neighborhood stats ∴')
          }}
          controls={controls}
        />
        <div className="text-void-green/60 text-xs font-mono">
          start: <span className="text-void-cyan">{startLabel}</span> • target: <span className="text-void-pink">{targetLabel}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="graph-atlas-canvas"
        />

        <div className="absolute top-4 left-4 text-xs sm:text-sm font-mono text-void-green/70 bg-void-dark/70 border border-void-green/20 rounded px-3 py-2 max-w-xs">
          <div className="uppercase text-void-green/40 tracking-widest text-[10px] mb-1">hover lens</div>
          {hoverDetails ? (
            <div>
              <div className="text-void-green">{hoverDetails.label}</div>
              <div className="text-void-green/60">degree {hoverDetails.degree}</div>
              <ul className="mt-1 space-y-0.5 max-h-24 overflow-y-auto pr-1">
                {hoverDetails.neighbors.map(neighbor => (
                  <li key={`${hoverDetails.label}-${neighbor.label}`} className="flex justify-between gap-2">
                    <span className="text-void-cyan/80">{neighbor.label}</span>
                    <span className="text-void-yellow/70">w{neighbor.weight}</span>
                  </li>
                ))}
                {hoverDetails.neighbors.length === 0 && (
                  <li className="text-void-green/40">no neighbors</li>
                )}
              </ul>
            </div>
          ) : (
            <div className="text-void-green/40">hover in inspect() mode</div>
          )}
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-void-green/70 text-xs font-mono text-center px-4 py-2 border border-void-green/20 bg-void-dark/80 rounded max-w-2xl">
          {message}
        </div>
      </div>
    </div>
  )
}

export default GraphAtlas
