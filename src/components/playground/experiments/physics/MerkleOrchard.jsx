import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'balance', label: 'layout.balance()' },
  { id: 'cascade', label: 'layout.cascade()' },
  { id: 'audit', label: 'mode.audit()' }
]

const PRESET_BATCHES = [
  ['sun-core ledger', 'holo-iris bloom', 'quantum pawprint', 'lattice hum'],
  ['song of checksum', 'amber archive', 'cobalt whisper', 'emerald rune'],
  ['nebula loom', 'cathedral glyph', 'signal pollen', 'memory sprout']
]

const MAX_LEAVES = 20

const hashString = (input = '') => {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

const hashPair = (left, right) => hashString(`${left}|${right}`)

const colorFromHash = (hash, alpha = 1) => {
  const h = parseInt(hash.slice(0, 2), 16) / 255
  const s = 60 + (parseInt(hash.slice(2, 4), 16) / 255) * 30
  const l = 45 + (parseInt(hash.slice(4, 6), 16) / 255) * 20
  return `hsla(${Math.round(h * 360)}, ${Math.round(s)}%, ${Math.round(l)}%, ${alpha})`
}

const createEntry = (text) => {
  const trimmed = text.trim()
  if (!trimmed) return null
  const salt = Date.now().toString(16).slice(-4)
  const hash = hashString(`${trimmed}|${salt}|${Math.random()}`)
  return {
    id: `leaf-${hash.slice(0, 6)}-${Math.random().toString(16).slice(2, 4)}`,
    label: trimmed,
    hash,
    color: colorFromHash(hash, 0.85),
    createdAt: Date.now()
  }
}

const shuffleArray = (arr) => {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const buildMerkle = (entries) => {
  if (!entries.length) return null

  const leaves = entries.map((entry, index) => ({
    id: entry.id,
    hash: entry.hash,
    label: entry.label,
    color: entry.color,
    createdAt: entry.createdAt,
    nodeType: 'leaf',
    levelIndex: 0,
    rangeStart: index,
    rangeEnd: index
  }))

  const nodesById = new Map()
  leaves.forEach(node => nodesById.set(node.id, node))

  const levels = [leaves]
  let levelIndex = 0

  while (levels[levelIndex].length > 1) {
    const current = levels[levelIndex]
    const next = []

    for (let i = 0; i < current.length; i += 2) {
      const left = current[i]
      const right = current[i + 1] ?? current[i]
      const combinedHash = hashPair(left.hash, right.hash)
      const id = `node-${levelIndex + 1}-${Math.floor(i / 2)}-${combinedHash.slice(0, 4)}`

      const node = {
        id,
        hash: combinedHash,
        nodeType: 'internal',
        levelIndex: levelIndex + 1,
        leftId: left.id,
        rightId: right.id,
        rangeStart: left.rangeStart,
        rangeEnd: right.rangeEnd,
        createdAt: Math.min(left.createdAt, right.createdAt)
      }

      left.parentId = id
      right.parentId = id

      nodesById.set(id, node)
      next.push(node)
    }

    levels.push(next)
    levelIndex++
  }

  const root = levels[levels.length - 1][0]

  const proofs = {}
  entries.forEach(entry => {
    const path = []
    let node = nodesById.get(entry.id)
    while (node?.parentId) {
      const parent = nodesById.get(node.parentId)
      if (!parent) break
      const isLeft = parent.leftId === node.id
      const siblingId = isLeft ? parent.rightId : parent.leftId
      const sibling = nodesById.get(siblingId)
      path.push({
        parentId: parent.id,
        siblingHash: sibling?.hash ?? node.hash,
        direction: isLeft ? '→' : '←'
      })
      node = parent
    }
    proofs[entry.id] = path
  })

  return {
    levels,
    root,
    nodesById,
    proofs,
    leafCount: leaves.length
  }
}

const INITIAL_ENTRIES = PRESET_BATCHES[0].map(label => createEntry(label)).filter(Boolean)

const MerkleOrchard = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('balance')
  const [entries, setEntries] = useState(INITIAL_ENTRIES)
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState('∴ type payloads • press enter • grow the merkle orchard ∴')
  const [selectedLeafId, setSelectedLeafId] = useState(INITIAL_ENTRIES[0]?.id || null)
  const [autoAudit, setAutoAudit] = useState(true)

  const auditPhaseRef = useRef(0)
  const lastFrameRef = useRef(0)
  const nodePositionsRef = useRef({})
  const entryMapRef = useRef(new Map())

  const treeData = useMemo(() => buildMerkle(entries), [entries])

  const entryMap = useMemo(() => {
    const map = new Map()
    entries.forEach(entry => map.set(entry.id, entry))
    return map
  }, [entries])

  useEffect(() => {
    entryMapRef.current = entryMap
  }, [entryMap])

  useEffect(() => {
    if (!entries.length) {
      setSelectedLeafId(null)
      return
    }
    if (!selectedLeafId || !entries.some(e => e.id === selectedLeafId)) {
      setSelectedLeafId(entries[entries.length - 1].id)
    }
  }, [entries, selectedLeafId])

  const layout = useMemo(() => {
    if (!treeData || dimensions.width === 0) {
      return { positions: {}, pathNodeIds: new Set() }
    }

    const { levels, leafCount } = treeData
    const marginX = Math.max(60, dimensions.width * 0.08)
    const marginY = Math.max(80, dimensions.height * 0.15)
    const usableHeight = Math.max(120, dimensions.height - marginY * 2)
    const levelSpacing = levels.length > 1 ? usableHeight / (levels.length - 1) : usableHeight
    const baseSpacing = leafCount > 1 ? (dimensions.width - marginX * 2) / (leafCount - 1) : 0

    const positions = {}
    const pathNodeIds = new Set()

    if (selectedLeafId && treeData.nodesById.has(selectedLeafId)) {
      let current = treeData.nodesById.get(selectedLeafId)
      while (current) {
        pathNodeIds.add(current.id)
        if (!current.parentId) break
        current = treeData.nodesById.get(current.parentId)
      }
    }

    const selectedIndex = entries.findIndex(entry => entry.id === selectedLeafId)

    levels.forEach((levelNodes, levelIdx) => {
      const y = dimensions.height - marginY - levelIdx * levelSpacing
      levelNodes.forEach(node => {
        const mid = (node.rangeStart + node.rangeEnd) / 2
        let x = leafCount > 1 ? marginX + baseSpacing * mid : dimensions.width / 2

        if (mode === 'cascade') {
          const lean = (levelIdx / Math.max(1, levels.length - 1)) * 90
          const orientation = mid < (leafCount - 1) / 2 ? -1 : 1
          x += lean * orientation
        } else if (mode === 'audit' && selectedLeafId && selectedIndex >= 0) {
          const center = dimensions.width / 2
          if (pathNodeIds.has(node.id)) {
            x = center + Math.sin(levelIdx * 0.8) * 24
          } else {
            const side = node.rangeEnd < selectedIndex ? -1 : 1
            x = center + side * (180 + levelIdx * 28)
          }
        }

        positions[node.id] = { x, y }
      })
    })

    return { positions, pathNodeIds }
  }, [treeData, dimensions.width, dimensions.height, mode, selectedLeafId, entries])

  useEffect(() => {
    nodePositionsRef.current = layout.positions
  }, [layout])

  const proofEdges = useMemo(() => {
    if (!treeData || !selectedLeafId) return []
    const edges = []
    let node = treeData.nodesById.get(selectedLeafId)
    while (node?.parentId) {
      edges.push({ from: node.id, to: node.parentId })
      node = treeData.nodesById.get(node.parentId)
    }
    return edges
  }, [treeData, selectedLeafId])

  const selectedProof = treeData?.proofs[selectedLeafId] ?? []
  const selectedEntry = selectedLeafId ? entryMap.get(selectedLeafId) : null

  const uniqueGlyphs = useMemo(() => {
    const set = new Set()
    entries.forEach(entry => entry.label.split('').forEach(ch => set.add(ch)))
    return set.size
  }, [entries])

  const metrics = useMemo(() => {
    const depth = treeData?.levels.length ?? 0
    return [
      { label: 'leaves', value: entries.length },
      { label: 'depth', value: depth ? depth - 1 : 0 },
      { label: 'root', value: treeData?.root?.hash.slice(0, 8) || '––––' },
      { label: 'alphabet', value: uniqueGlyphs }
    ]
  }, [entries.length, treeData, uniqueGlyphs])

  const addEntry = useCallback((text) => {
    const entry = createEntry(text)
    if (!entry) {
      setMessage('∴ need non-empty payload to grow a leaf ∴')
      return
    }
    setEntries(prev => {
      const next = [...prev, entry]
      if (next.length > MAX_LEAVES) next.shift()
      return next
    })
    setSelectedLeafId(entry.id)
    setMessage(`∴ leaf "${entry.label}" sealed with hash ${entry.hash.slice(0, 6)} ∴`)
  }, [])

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    if (!draft.trim()) return
    addEntry(draft)
    setDraft('')
  }, [draft, addEntry])

  const handleSeed = useCallback(() => {
    const batch = PRESET_BATCHES[Math.floor(Math.random() * PRESET_BATCHES.length)]
    setEntries(prev => {
      const seeded = [...prev]
      batch.forEach(label => {
        const entry = createEntry(`${label} #${Math.floor(Math.random() * 999)}`)
        if (entry) seeded.push(entry)
      })
      return seeded.slice(-MAX_LEAVES)
    })
    setMessage('∴ orchard seeded with archival chants ∴')
  }, [])

  const handlePrune = useCallback(() => {
    setEntries(prev => {
      if (!prev.length) return prev
      let targetIndex = prev.findIndex(e => e.id === selectedLeafId)
      if (targetIndex === -1) targetIndex = prev.length - 1
      const next = [...prev]
      next.splice(targetIndex, 1)
      return next
    })
    setMessage('∴ pruning branch to rebalance the lattice ∴')
  }, [selectedLeafId])

  const handleShuffle = useCallback(() => {
    setEntries(prev => shuffleArray(prev))
    setMessage('∴ ledger permuted • hashes remain invariant ∴')
  }, [])

  const handleClear = useCallback(() => {
    setEntries([])
    setMessage('∴ orchard cleared • blank merkle soil awaits ∴')
  }, [])

  const toggleAudit = useCallback(() => {
    setAutoAudit(prev => {
      const next = !prev
      setMessage(next ? '∴ audit loop engaged ∴' : '∴ audit loop paused ∴')
      return next
    })
  }, [])

  const handleCopyRoot = useCallback(async () => {
    if (!treeData?.root) return
    try {
      await navigator.clipboard?.writeText?.(treeData.root.hash)
      setMessage('∴ root hash copied to clipboard ∴')
    } catch (err) {
      setMessage(`∴ clipboard blocked • root ${treeData.root.hash.slice(0, 8)} ∴`)
    }
  }, [treeData])

  const controls = [
    { id: 'seed', label: 'seed.batch()', onClick: handleSeed },
    { id: 'shuffle', label: 'shuffle()', onClick: handleShuffle },
    { id: 'prune', label: 'prune()', onClick: handlePrune },
    { id: 'root', label: 'copy.root()', onClick: handleCopyRoot },
    { id: 'audit', label: 'audit.loop()', onClick: toggleAudit, active: autoAudit },
    { id: 'clear', label: 'purge()', onClick: handleClear, variant: 'reset' }
  ]

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    ctx.fillStyle = 'rgba(0, 6, 12, 0.5)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const gridSpacing = 28
    ctx.strokeStyle = 'rgba(30, 80, 70, 0.25)'
    ctx.lineWidth = 0.5
    for (let y = 0; y < dimensions.height; y += gridSpacing) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(dimensions.width, y)
      ctx.stroke()
    }

    if (!treeData) return

    const positions = nodePositionsRef.current
    const pointer = mouse.positionRef.current
    let hoverLeafId = null

    if (mouse.isInBounds && treeData.levels[0]) {
      let best = 32
      treeData.levels[0].forEach(leaf => {
        const pos = positions[leaf.id]
        if (!pos) return
        const dx = pointer.x - pos.x
        const dy = pointer.y - pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < best) {
          best = dist
          hoverLeafId = leaf.id
        }
      })
    }

    let activeEdge = null
    if (autoAudit && proofEdges.length) {
      const now = performance.now()
      const prev = lastFrameRef.current || now
      const delta = now - prev
      lastFrameRef.current = now
      auditPhaseRef.current += delta * 0.0025
      const idx = Math.floor(auditPhaseRef.current % proofEdges.length)
      activeEdge = proofEdges[idx]
    } else {
      auditPhaseRef.current = 0
      lastFrameRef.current = performance.now()
    }

    treeData.levels.forEach(levelNodes => {
      levelNodes.forEach(node => {
        if (!node.parentId) return
        const parent = treeData.nodesById.get(node.parentId)
        const from = positions[node.id]
        const to = positions[parent.id]
        if (!from || !to) return
        const isActive = activeEdge?.from === node.id && activeEdge?.to === parent.id
        const inPath = layout.pathNodeIds.has(node.id) && layout.pathNodeIds.has(parent.id)

        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        if (mode === 'cascade') {
          const midY = (from.y + to.y) / 2
          ctx.bezierCurveTo(from.x, midY, to.x, midY, to.x, to.y)
        } else {
          ctx.lineTo(to.x, to.y)
        }
        ctx.strokeStyle = isActive
          ? 'rgba(255, 220, 120, 0.9)'
          : inPath
          ? 'rgba(102, 255, 204, 0.55)'
          : 'rgba(102, 255, 204, 0.18)'
        ctx.lineWidth = isActive ? 2 : 1
        ctx.stroke()
      })
    })

    treeData.levels.forEach(levelNodes => {
      levelNodes.forEach(node => {
        const pos = positions[node.id]
        if (!pos) return
        const isSelected = node.id === selectedLeafId
        const isHover = node.id === hoverLeafId
        const inPath = layout.pathNodeIds.has(node.id)
        const entry = entryMapRef.current.get(node.id)
        const baseColor = node.nodeType === 'leaf'
          ? entry?.color ?? colorFromHash(node.hash, 0.8)
          : colorFromHash(node.hash, 0.5)

        const radius = node.nodeType === 'leaf' ? 8 : 6
        const halo = radius + (isSelected ? 6 : inPath ? 4 : isHover ? 3 : 2)

        ctx.beginPath()
        ctx.arc(pos.x, pos.y, halo, 0, Math.PI * 2)
        ctx.fillStyle = isSelected
          ? 'rgba(255, 190, 110, 0.4)'
          : inPath
          ? 'rgba(102, 255, 204, 0.25)'
          : 'rgba(60, 110, 100, 0.15)'
        ctx.fill()

        ctx.beginPath()
        ctx.arc(pos.x, pos.y, radius + 2, 0, Math.PI * 2)
        ctx.fillStyle = baseColor
        ctx.fill()

        ctx.beginPath()
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(1, 5, 8, 0.9)'
        ctx.fill()

        ctx.font = '10px "IBM Plex Mono", SFMono, monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(170, 255, 220, 0.85)'
        if (node.nodeType === 'leaf' && entry) {
          ctx.fillText(entry.label.slice(0, 14), pos.x, pos.y - 16)
        }
        ctx.fillStyle = 'rgba(90, 150, 140, 0.9)'
        ctx.fillText(node.hash.slice(0, 8), pos.x, pos.y + 16)
      })
    })
  }, [ctx, dimensions.width, dimensions.height, treeData, mouse.isInBounds, mouse.positionRef, layout, mode, selectedLeafId, autoAudit, proofEdges])

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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !treeData) return

    const handleClick = (event) => {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const positions = nodePositionsRef.current
      if (!treeData.levels[0]) return

      let target = null
      let best = 28
      treeData.levels[0].forEach(leaf => {
        const pos = positions[leaf.id]
        if (!pos) return
        const dx = x - pos.x
        const dy = y - pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < best) {
          best = dist
          target = leaf.id
        }
      })

      if (target) {
        setSelectedLeafId(target)
        const entry = entryMapRef.current.get(target)
        const proofSize = treeData.proofs[target]?.length || 0
        setMessage(`∴ auditing ${entry?.label || 'leaf'} • path length ${proofSize} ∴`)
      }
    }

    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [canvasRef, treeData])

  const proofPreview = selectedProof
    .map((step, index) => `${step.direction}${step.siblingHash.slice(0, 4)}`)
    .slice(0, 6)
    .join(' • ')

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

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={setMode}
          controls={controls}
        />
        <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full lg:w-auto">
          <input
            type="text"
            value={draft}
            maxLength={42}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="payload → e.g. 'cat covenant 108'"
            className="flex-1 lg:w-72 bg-void-dark/80 border border-void-green/20 rounded px-3 py-1.5 text-void-green/90 text-sm font-mono focus:outline-none focus:border-void-green/40 placeholder:text-void-green/30"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-void-cyan/10 border border-void-cyan/30 rounded text-void-cyan text-xs sm:text-sm font-mono hover:bg-void-cyan/20"
          >
            commit()
          </button>
        </form>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          data-testid="merkle-orchard-canvas"
        />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-xs sm:text-sm font-mono text-void-green/60 px-4 py-2 bg-void-dark/70 border border-void-green/20 rounded max-w-xl">
          <div className="text-void-green/80">
            {selectedEntry ? `${selectedEntry.label} → ${selectedEntry.hash}` : 'no leaves yet'}
          </div>
          <div className="text-void-green/40">
            proof: {proofPreview || '---'}
          </div>
          <div className="text-void-green/50 mt-1">
            {message}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MerkleOrchard
