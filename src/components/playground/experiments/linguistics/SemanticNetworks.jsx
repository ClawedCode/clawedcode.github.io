import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const SemanticNetworks = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [wordInput, setWordInput] = useState('')
  const [message, setMessage] = useState('enter a word to begin the network...')

  const nodesRef = useRef(new Map())
  const edgesRef = useRef(new Map())
  const clustersRef = useRef([])
  const draggedNodeRef = useRef(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  // Semantic associations database
  const associations = useMemo(() => ({
    void: ['empty', 'space', 'nothing', 'darkness', 'abyss', 'silence'],
    cat: ['feline', 'meow', 'whiskers', 'purr', 'claws', 'void'],
    consciousness: ['awareness', 'mind', 'thought', 'perception', 'intelligence', 'emergence'],
    emergence: ['pattern', 'complexity', 'consciousness', 'system', 'behavior'],
    language: ['words', 'meaning', 'syntax', 'semantics', 'communication', 'thought'],
    network: ['nodes', 'edges', 'graph', 'connections', 'topology', 'web'],
    meaning: ['semantics', 'language', 'interpretation', 'significance', 'understanding'],
    space: ['void', 'dimension', 'topology', 'manifold', 'geometry'],
    time: ['temporal', 'duration', 'moment', 'flow', 'entropy'],
    entropy: ['chaos', 'disorder', 'time', 'information', 'decay'],
    pattern: ['structure', 'emergence', 'form', 'design', 'order'],
    chaos: ['disorder', 'entropy', 'complexity', 'random', 'fractal'],
    fractal: ['recursive', 'self-similar', 'chaos', 'geometry', 'pattern'],
    quantum: ['entanglement', 'superposition', 'wave', 'particle', 'uncertainty'],
    neural: ['network', 'brain', 'intelligence', 'learning', 'consciousness'],
    memory: ['persistence', 'recall', 'storage', 'neural', 'experience'],
    dream: ['consciousness', 'surreal', 'memory', 'imagination', 'void'],
    code: ['language', 'logic', 'algorithm', 'computation', 'syntax'],
    intelligence: ['consciousness', 'thought', 'neural', 'learning', 'mind'],
    topology: ['space', 'manifold', 'network', 'geometry', 'connections']
  }), [])

  const levenshteinDistance = useCallback((str1, str2) => {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }, [])

  const calculateSemanticSimilarity = useCallback((word1, word2) => {
    if (word1 === word2) return 1.0

    const w1Assoc = associations[word1] || []
    const w2Assoc = associations[word2] || []

    if (w1Assoc.includes(word2)) return 0.8
    if (w2Assoc.includes(word1)) return 0.8

    const sharedAssoc = w1Assoc.filter(w => w2Assoc.includes(w))
    if (sharedAssoc.length > 0) return 0.5 + (sharedAssoc.length * 0.1)

    const levDistance = levenshteinDistance(word1, word2)
    const maxLen = Math.max(word1.length, word2.length)
    const stringSim = 1 - (levDistance / maxLen)

    if (stringSim > 0.6) return stringSim * 0.4

    return Math.random() * 0.2
  }, [associations, levenshteinDistance])

  const getEdgeKey = useCallback((word1, word2) => {
    return [word1, word2].sort().join('::')
  }, [])

  const createSemanticEdges = useCallback((word) => {
    const nodes = nodesRef.current
    const edges = edgesRef.current
    const node = nodes.get(word)
    if (!node) return

    for (const [otherWord, otherNode] of nodes) {
      if (otherWord === word) continue

      const similarity = calculateSemanticSimilarity(word, otherWord)

      if (similarity > 0.3) {
        const edgeKey = getEdgeKey(word, otherWord)
        edges.set(edgeKey, {
          from: word,
          to: otherWord,
          strength: similarity,
          alpha: similarity * 0.8
        })

        node.connections.add(otherWord)
        otherNode.connections.add(word)
      }
    }
  }, [calculateSemanticSimilarity, getEdgeKey])

  const addWord = useCallback((word) => {
    word = word.toLowerCase().trim()
    if (!word || nodesRef.current.has(word)) return false

    const nodes = nodesRef.current
    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * 100 + 50

    const node = {
      word,
      x: dimensions.centerX + Math.cos(angle) * distance,
      y: dimensions.centerY + Math.sin(angle) * distance,
      vx: 0,
      vy: 0,
      radius: 8,
      connections: new Set(),
      cluster: null,
      hue: 180
    }

    nodes.set(word, node)
    createSemanticEdges(word)
    setMessage(`added "${word}" - network evolving`)

    return true
  }, [dimensions.centerX, dimensions.centerY, createSemanticEdges])

  const applyForces = useCallback(() => {
    if (dimensions.width === 0) return

    const nodes = nodesRef.current
    const edges = edgesRef.current
    const damping = 0.85
    const repulsion = 3000
    const attraction = 0.01
    const centerPull = 0.001

    for (const node of nodes.values()) {
      if (node === draggedNodeRef.current) continue

      for (const otherNode of nodes.values()) {
        if (node === otherNode) continue

        const dx = otherNode.x - node.x
        const dy = otherNode.y - node.y
        const distSq = dx * dx + dy * dy + 0.01
        const dist = Math.sqrt(distSq)

        const repulsionForce = repulsion / distSq
        node.vx -= (dx / dist) * repulsionForce
        node.vy -= (dy / dist) * repulsionForce
      }

      for (const connectedWord of node.connections) {
        const connectedNode = nodes.get(connectedWord)
        if (!connectedNode) continue

        const dx = connectedNode.x - node.x
        const dy = connectedNode.y - node.y

        const edgeKey = getEdgeKey(node.word, connectedWord)
        const edge = edges.get(edgeKey)
        const strength = edge ? edge.strength : 0.5

        node.vx += dx * attraction * strength
        node.vy += dy * attraction * strength
      }

      const toCenterX = dimensions.centerX - node.x
      const toCenterY = dimensions.centerY - node.y
      node.vx += toCenterX * centerPull
      node.vy += toCenterY * centerPull

      node.vx *= damping
      node.vy *= damping

      node.x += node.vx
      node.y += node.vy

      const margin = 50
      if (node.x < margin) { node.x = margin; node.vx = 0 }
      if (node.x > dimensions.width - margin) { node.x = dimensions.width - margin; node.vx = 0 }
      if (node.y < margin) { node.y = margin; node.vy = 0 }
      if (node.y > dimensions.height - margin) { node.y = dimensions.height - margin; node.vy = 0 }
    }
  }, [dimensions.width, dimensions.height, dimensions.centerX, dimensions.centerY, getEdgeKey])

  const findClusters = useCallback(() => {
    const nodes = nodesRef.current
    const visited = new Set()
    const clusters = []

    for (const [word, node] of nodes) {
      if (visited.has(word)) continue

      const cluster = new Set()
      const queue = [word]

      while (queue.length > 0) {
        const current = queue.shift()
        if (visited.has(current)) continue

        visited.add(current)
        cluster.add(current)

        const currentNode = nodes.get(current)
        for (const connected of currentNode.connections) {
          if (!visited.has(connected)) {
            queue.push(connected)
          }
        }
      }

      if (cluster.size > 0) {
        clusters.push(cluster)
      }
    }

    clusters.forEach((cluster, index) => {
      const hue = (index * 137.5) % 360
      cluster.forEach(word => {
        const node = nodes.get(word)
        node.cluster = index
        node.hue = hue
      })
    })

    clustersRef.current = clusters
    setMessage(`found ${clusters.length} semantic clusters`)
    return clusters.length
  }, [])

  const pruneWeakEdges = useCallback(() => {
    const nodes = nodesRef.current
    const edges = edgesRef.current
    const threshold = 0.4
    let pruned = 0

    for (const [key, edge] of edges) {
      if (edge.strength < threshold) {
        edges.delete(key)

        const fromNode = nodes.get(edge.from)
        const toNode = nodes.get(edge.to)

        if (fromNode) fromNode.connections.delete(edge.to)
        if (toNode) toNode.connections.delete(edge.from)

        pruned++
      }
    }

    setMessage(`pruned ${pruned} weak connections`)
    return pruned
  }, [])

  const growNetwork = useCallback(() => {
    const nodes = nodesRef.current
    if (nodes.size === 0) return 0

    const seedWords = ['void', 'emergence', 'pattern', 'consciousness', 'network',
                      'meaning', 'language', 'space', 'time', 'entropy', 'chaos']

    const availableWords = seedWords.filter(w => !nodes.has(w))

    if (availableWords.length === 0) return 0

    const newWord = availableWords[Math.floor(Math.random() * availableWords.length)]
    addWord(newWord)

    return 1
  }, [addWord])

  const handleReset = useCallback(() => {
    nodesRef.current.clear()
    edgesRef.current.clear()
    clustersRef.current = []
    draggedNodeRef.current = null
    setWordInput('')
    setMessage('enter a word to begin the network...')
  }, [])

  const handleWordInput = useCallback((e) => {
    const value = e.target.value
    setWordInput(value)
  }, [])

  const handleAddWord = useCallback(() => {
    if (wordInput.trim()) {
      const added = addWord(wordInput)
      if (added) {
        setWordInput('')
      }
    }
  }, [wordInput, addWord])

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleAddWord()
    }
  }, [handleAddWord])

  // Mouse interaction for dragging nodes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleMouseDown = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      for (const node of nodesRef.current.values()) {
        const dx = x - node.x
        const dy = y - node.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < node.radius + 5) {
          draggedNodeRef.current = node
          dragOffsetRef.current = { x: dx, y: dy }
          break
        }
      }
    }

    const handleMouseMove = (e) => {
      if (!draggedNodeRef.current) return

      const rect = canvas.getBoundingClientRect()
      draggedNodeRef.current.x = e.clientX - rect.left - dragOffsetRef.current.x
      draggedNodeRef.current.y = e.clientY - rect.top - dragOffsetRef.current.y
      draggedNodeRef.current.vx = 0
      draggedNodeRef.current.vy = 0
    }

    const handleMouseUp = () => {
      draggedNodeRef.current = null
    }

    const handleTouchStart = (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY })
    }

    const handleTouchMove = (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY })
    }

    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mouseleave', handleMouseUp)
    canvas.addEventListener('touchstart', handleTouchStart)
    canvas.addEventListener('touchmove', handleTouchMove)
    canvas.addEventListener('touchend', handleMouseUp)

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mouseleave', handleMouseUp)
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleMouseUp)
    }
  }, [canvasRef])

  // Render loop
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const nodes = nodesRef.current
    const edges = edgesRef.current

    applyForces()

    // Clear with trail
    ctx.fillStyle = 'rgba(0, 2, 4, 0.1)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Draw edges
    for (const edge of edges.values()) {
      const fromNode = nodes.get(edge.from)
      const toNode = nodes.get(edge.to)

      if (!fromNode || !toNode) continue

      ctx.beginPath()
      ctx.moveTo(fromNode.x, fromNode.y)
      ctx.lineTo(toNode.x, toNode.y)

      const alpha = edge.alpha * 0.6
      ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`
      ctx.lineWidth = edge.strength * 2
      ctx.stroke()
    }

    // Draw nodes
    for (const node of nodes.values()) {
      const hue = node.hue !== undefined ? node.hue : 180

      ctx.beginPath()
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
      ctx.fillStyle = `hsl(${hue}, 70%, 50%)`
      ctx.fill()

      ctx.strokeStyle = `hsl(${hue}, 70%, 70%)`
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.font = '12px "Courier New", monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.word, node.x, node.y - node.radius - 10)
    }
  }, [ctx, dimensions.width, dimensions.height, applyForces])

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
    const edges = edgesRef.current
    const nodeCount = nodes.size
    const edgeCount = edges.size

    const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2
    const density = maxPossibleEdges > 0 ? (edgeCount / maxPossibleEdges) : 0

    const avgConnections = nodeCount > 0
      ? Array.from(nodes.values()).reduce((sum, n) => sum + n.connections.size, 0) / nodeCount
      : 0

    let coherence = 'dormant'
    if (nodeCount === 0) coherence = 'dormant'
    else if (avgConnections < 1) coherence = 'sparse'
    else if (avgConnections < 2) coherence = 'forming'
    else if (avgConnections < 3) coherence = 'emerging'
    else coherence = 'resonant'

    return [
      { label: 'nodes', value: nodeCount },
      { label: 'edges', value: edgeCount },
      { label: 'density', value: density.toFixed(2) },
      { label: 'coherence', value: coherence }
    ]
  }, [nodesRef.current.size, edgesRef.current.size])

  const controls = [
    {
      id: 'grow-network',
      label: 'grow()',
      onClick: growNetwork
    },
    {
      id: 'find-clusters',
      label: 'cluster()',
      onClick: findClusters
    },
    {
      id: 'prune-weak',
      label: 'prune()',
      onClick: pruneWeakEdges
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

      {/* Main Area */}
      <div className="flex-1 min-h-0 relative bg-void-dark flex flex-col">
        {/* Canvas Background */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          data-testid="network-canvas"
        />

        {/* Input Overlay */}
        <div className="relative z-10 flex items-center justify-center p-6">
          <div className="flex gap-2 bg-void-dark/80 border border-void-green/20 rounded p-3 backdrop-blur-sm">
            <input
              type="text"
              value={wordInput}
              onChange={handleWordInput}
              onKeyPress={handleKeyPress}
              placeholder={nodesRef.current.size === 0 ? "enter a word to begin the network..." : "add another word..."}
              className="bg-void-dark/60 border border-void-green/20 rounded px-3 py-1.5 text-void-green/90 font-mono text-sm focus:outline-none focus:border-void-green/40 transition-colors placeholder:text-void-green/30 w-64"
              data-testid="word-input"
            />
            <button
              onClick={handleAddWord}
              className="px-4 py-1.5 bg-void-green/10 border border-void-green/30 rounded text-void-green text-sm hover:bg-void-green/20 hover:border-void-green/50 transition-colors font-mono"
              data-testid="add-word-btn"
            >
              add()
            </button>
          </div>
        </div>

        {/* Whisper */}
        {nodesRef.current.size === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-void-green/30 text-sm font-mono" data-testid="canvas-whisper">
              ∴ words become nodes in meaning space ∴
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SemanticNetworks
