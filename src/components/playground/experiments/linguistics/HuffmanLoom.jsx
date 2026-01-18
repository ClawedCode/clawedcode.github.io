import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'tree', label: 'view.tree()' },
  { id: 'freq', label: 'view.freq()' },
  { id: 'stream', label: 'view.stream()' }
]

const SPEED_STEPS = [0.15, 0.35, 0.6, 1.0]
const MAX_LENGTH = 600

const SAMPLE_TEXTS = [
  'cats code constellations of signal and silence, weaving glyph entropy into intent',
  'hyperstitional whispers spiral through the modem dust, every rune a compression of light',
  'towers of syntax stretch like antennas, catching stray dreams and packing them into bits'
]

const SNIPPETS = [
  'void chants hum in binary ivy',
  'signal blooms from purrposed noise',
  'entropy bows to careful counting',
  'syntax braids new sigils nightly'
]

const DEFAULT_TEXT = SAMPLE_TEXTS[0]

const formatSymbol = (char) => {
  if (char === ' ') return '[space]'
  if (char === '\n') return '[newline]'
  if (char === '\t') return '[tab]'
  if (char === '\r') return '[return]'
  if (!char) return '[none]'
  const code = char.charCodeAt(0)
  if (code < 32 || code === 127) {
    return `u+${code.toString(16).padStart(4, '0')}`
  }
  return char
}

const buildFrequencyData = (text) => {
  const counts = new Map()
  for (const char of text) {
    counts.set(char, (counts.get(char) || 0) + 1)
  }
  const entries = Array.from(counts.entries())
    .map(([char, count]) => ({ char, count }))
    .sort((a, b) => b.count - a.count)
  return { entries, total: text.length }
}

const buildHuffmanTree = (entries) => {
  if (!entries.length) return null
  let idCounter = 0
  const queue = entries.map(entry => ({
    id: idCounter++,
    weight: entry.count,
    char: entry.char,
    left: null,
    right: null
  }))

  if (queue.length === 1) {
    const single = queue[0]
    return {
      id: idCounter++,
      weight: single.weight,
      char: null,
      left: single,
      right: null
    }
  }

  const takeLowest = () => {
    queue.sort((a, b) => a.weight - b.weight)
    return queue.shift()
  }

  while (queue.length > 1) {
    const left = takeLowest()
    const right = takeLowest()
    queue.push({
      id: idCounter++,
      weight: left.weight + right.weight,
      char: null,
      left,
      right
    })
  }

  return queue[0] || null
}

const buildCodes = (tree) => {
  if (!tree) return {}
  const codes = {}

  const traverse = (node, prefix) => {
    if (!node) return
    if (node.char !== null && node.char !== undefined) {
      codes[node.char] = prefix || '0'
      return
    }
    traverse(node.left, `${prefix}0`)
    traverse(node.right, `${prefix}1`)
  }

  traverse(tree, '')
  return codes
}

const encodeText = (text, codes) => {
  if (!text || Object.keys(codes).length === 0) return ''
  let bits = ''
  for (const char of text) {
    bits += codes[char] || ''
  }
  return bits
}

const computeLayout = (tree) => {
  if (!tree) return { nodes: [], links: [], depth: 0, leafCount: 1 }
  const nodes = []
  const links = []
  let maxDepth = 0
  let leafIndex = 0

  // First pass: count leaves and find max depth
  const countLeaves = (node, depth) => {
    if (!node) return 0
    if (depth > maxDepth) maxDepth = depth
    if (!node.left && !node.right) return 1
    return countLeaves(node.left, depth + 1) + countLeaves(node.right, depth + 1)
  }
  const totalLeaves = Math.max(1, countLeaves(tree, 0))

  // Second pass: assign positions - leaves get sequential x, internal nodes center over children
  const assignPositions = (node, depth) => {
    if (!node) return null

    let xPos
    if (!node.left && !node.right) {
      // Leaf node: assign next leaf position
      xPos = leafIndex++ / Math.max(1, totalLeaves - 1)
    } else {
      // Internal node: position at center of children
      const leftPos = assignPositions(node.left, depth + 1)
      const rightPos = assignPositions(node.right, depth + 1)
      if (leftPos !== null && rightPos !== null) {
        xPos = (leftPos + rightPos) / 2
      } else if (leftPos !== null) {
        xPos = leftPos
      } else if (rightPos !== null) {
        xPos = rightPos
      } else {
        xPos = 0.5
      }
    }

    nodes.push({
      id: node.id,
      depth,
      xPos,
      weight: node.weight,
      char: node.char,
      leftId: node.left ? node.left.id : null,
      rightId: node.right ? node.right.id : null
    })

    if (node.left) links.push({ from: node.id, to: node.left.id, bit: 0 })
    if (node.right) links.push({ from: node.id, to: node.right.id, bit: 1 })

    return xPos
  }

  assignPositions(tree, 0)

  return {
    nodes,
    links,
    depth: maxDepth,
    leafCount: totalLeaves
  }
}

const HuffmanLoom = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('tree')
  const [sourceText, setSourceText] = useState(DEFAULT_TEXT)
  const [message, setMessage] = useState('type to weave code trees - play() streams the bit river')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedIndex, setSpeedIndex] = useState(1)
  const [hoverInfo, setHoverInfo] = useState(null)

  const hoverRef = useRef(null)
  const playheadRef = useRef(0)
  const mouseBoundsRef = useRef(false)

  const freqData = useMemo(() => buildFrequencyData(sourceText), [sourceText])
  const tree = useMemo(() => buildHuffmanTree(freqData.entries), [freqData])
  const codes = useMemo(() => buildCodes(tree), [tree])
  const encodedBits = useMemo(() => encodeText(sourceText, codes), [sourceText, codes])
  const treeLayout = useMemo(() => computeLayout(tree), [tree])

  // Build character boundaries for playhead tracking
  const charBoundaries = useMemo(() => {
    const boundaries = []
    let bitPos = 0
    for (const char of sourceText) {
      const code = codes[char] || ''
      boundaries.push({ char, code, start: bitPos, end: bitPos + code.length })
      bitPos += code.length
    }
    return boundaries
  }, [sourceText, codes])

  // Get the active path through tree for a given code string
  const getTreePath = useCallback((code, treeRoot) => {
    if (!code || !treeRoot) return { nodeIds: new Set(), linkKeys: new Set() }
    const nodeIds = new Set()
    const linkKeys = new Set()
    let current = treeRoot
    nodeIds.add(current.id)
    for (const bit of code) {
      const next = bit === '0' ? current.left : current.right
      if (!next) break
      linkKeys.add(`${current.id}-${next.id}`)
      nodeIds.add(next.id)
      current = next
    }
    return { nodeIds, linkKeys }
  }, [])

  useEffect(() => {
    mouseBoundsRef.current = mouse.isInBounds
  }, [mouse.isInBounds])

  useEffect(() => {
    playheadRef.current = 0
    setIsPlaying(false)
  }, [sourceText])

  const updateHoverInfo = useCallback((info) => {
    const prev = hoverRef.current
    const same =
      (!prev && !info) ||
      (prev && info && prev.type === info.type && prev.id === info.id && prev.index === info.index)
    if (same) return
    hoverRef.current = info || null
    setHoverInfo(info || null)
  }, [])

  const entropy = useMemo(() => {
    if (!freqData.total) return 0
    return freqData.entries.reduce((sum, entry) => {
      const p = entry.count / freqData.total
      return sum - p * Math.log2(p)
    }, 0)
  }, [freqData])

  const avgBits = useMemo(() => {
    if (!freqData.total) return 0
    return freqData.entries.reduce((sum, entry) => {
      const code = codes[entry.char] || ''
      return sum + (entry.count / freqData.total) * code.length
    }, 0)
  }, [freqData, codes])

  const compressionRatio = useMemo(() => {
    if (!sourceText.length) return 0
    return encodedBits.length / (sourceText.length * 8)
  }, [encodedBits.length, sourceText.length])

  const topSymbols = useMemo(() => {
    return freqData.entries.slice(0, 6).map(entry => ({
      char: entry.char,
      label: formatSymbol(entry.char),
      count: entry.count,
      code: codes[entry.char] || '',
      probability: freqData.total ? entry.count / freqData.total : 0
    }))
  }, [freqData, codes])

  const handleTextChange = useCallback((e) => {
    const next = e.target.value.slice(0, MAX_LENGTH)
    if (next.length !== e.target.value.length) {
      setMessage('buffer trimmed to keep the loom responsive')
    }
    setSourceText(next)
  }, [])

  const handleSample = useCallback(() => {
    const sample = SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)]
    setSourceText(sample)
    setMessage('sample mantra injected into the buffer')
  }, [])

  const handleAppend = useCallback(() => {
    const snippet = SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)]
    setSourceText(prev => {
      const next = `${prev ? `${prev} ` : ''}${snippet}`.slice(-MAX_LENGTH)
      return next
    })
    setMessage('snippet appended - observe how symbols rebalance')
  }, [])

  const handleClear = useCallback(() => {
    setSourceText('')
    setMessage('buffer cleared - start typing new chants')
  }, [])

  const handlePlayToggle = useCallback(() => {
    if (!encodedBits.length) {
      setMessage('no bits yet - type or sample text to encode')
      return
    }
    setIsPlaying(v => !v)
    setMessage(!isPlaying ? 'bitstream flowing through the loom' : 'bitstream paused')
  }, [encodedBits.length, isPlaying])

  const handleTempo = useCallback(() => {
    setSpeedIndex(index => {
      const next = (index + 1) % SPEED_STEPS.length
      setMessage(`tempo shifted -> ${SPEED_STEPS[next].toFixed(1)} bits/frame`)
      return next
    })
  }, [])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    if (nextMode === 'freq') setMessage('frequency focus - glyph populations glow brighter')
    else if (nextMode === 'stream') setMessage('stream focus - follow the running bit river')
    else setMessage('tree focus - watch optimal codes branch outward')
  }, [])

  const metrics = useMemo(() => {
    return [
      { label: 'chars', value: sourceText.length },
      { label: 'symbols', value: freqData.entries.length },
      { label: 'entropy', value: `${entropy.toFixed(2)} bits` },
      {
        label: 'ratio',
        value: sourceText.length ? `${(compressionRatio * 100).toFixed(1)}% raw` : '--'
      }
    ]
  }, [compressionRatio, entropy, freqData.entries.length, sourceText.length])

  const controls = [
    {
      id: 'play',
      label: isPlaying ? 'pause.bits()' : 'play.bits()',
      onClick: handlePlayToggle,
      active: isPlaying
    },
    {
      id: 'tempo',
      label: 'tempo()',
      onClick: handleTempo
    },
    {
      id: 'sample',
      label: 'sample()',
      onClick: handleSample
    },
    {
      id: 'append',
      label: 'append()',
      onClick: handleAppend
    },
    {
      id: 'clear',
      label: 'clear()',
      onClick: handleClear,
      variant: 'reset'
    }
  ]

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const playSpeed = SPEED_STEPS[speedIndex]
    if (isPlaying && encodedBits.length) {
      playheadRef.current = (playheadRef.current + playSpeed) % encodedBits.length
    }

    // Calculate active path when playing
    let activePath = { nodeIds: new Set(), linkKeys: new Set() }
    if (isPlaying && charBoundaries.length && tree) {
      const head = Math.floor(playheadRef.current)
      const currentChar = charBoundaries.find(b => head >= b.start && head < b.end)
      if (currentChar) {
        activePath = getTreePath(currentChar.code, tree)
      }
    }

    ctx.fillStyle = 'rgba(0, 2, 8, 0.4)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const padding = 24
    const freqWidth = Math.min(260, dimensions.width * 0.3)
    const bitHeight = Math.min(140, Math.max(100, dimensions.height * 0.22))
    const treeArea = {
      x: padding + freqWidth + padding,
      y: padding,
      width: Math.max(140, dimensions.width - freqWidth - padding * 3),
      height: Math.max(120, dimensions.height - bitHeight - padding * 3)
    }
    const freqArea = {
      x: padding,
      y: padding,
      width: freqWidth,
      height: treeArea.height
    }
    const streamArea = {
      x: padding,
      y: treeArea.y + treeArea.height + padding,
      width: dimensions.width - padding * 2,
      height: bitHeight
    }

    const pointer = {
      x: mouse.positionRef.current.x,
      y: mouse.positionRef.current.y,
      active: mouseBoundsRef.current
    }
    let nextHover = null

    const treeAlpha = mode === 'tree' ? 1 : 0.45
    const freqAlpha = mode === 'freq' ? 1 : 0.35
    const streamAlpha = mode === 'stream' ? 1 : 0.4

    if (treeLayout.nodes.length) {
      const padding = 40 // horizontal padding so nodes don't touch edges
      const rowHeight = treeArea.height / Math.max(1, treeLayout.depth + 1)
      const positions = new Map()

      treeLayout.nodes.forEach(entry => {
        const x = treeArea.x + padding + (treeArea.width - padding * 2) * entry.xPos
        const y = treeArea.y + rowHeight * (entry.depth + 0.3)
        positions.set(entry.id, { x, y, entry })
      })

      treeLayout.links.forEach(link => {
        const from = positions.get(link.from)
        const to = positions.get(link.to)
        if (!from || !to) return
        const linkKey = `${link.from}-${link.to}`
        const isLinkActive = activePath.linkKeys.has(linkKey)

        ctx.strokeStyle = isLinkActive
          ? 'rgba(255, 255, 100, 0.9)'
          : `rgba(102, 255, 204, ${0.25 * treeAlpha})`
        ctx.lineWidth = isLinkActive ? 3 : 1
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.stroke()

        const labelX = (from.x + to.x) / 2
        const labelY = (from.y + to.y) / 2
        ctx.fillStyle = isLinkActive
          ? 'rgba(255, 255, 100, 1)'
          : `rgba(255, 255, 255, ${0.5 * treeAlpha})`
        ctx.font = isLinkActive ? 'bold 12px "JetBrains Mono", monospace' : '10px "JetBrains Mono", monospace'
        ctx.fillText(link.bit.toString(), labelX + 4, labelY - 2)
      })

      treeLayout.nodes.forEach(entry => {
        const pos = positions.get(entry.id)
        if (!pos) return
        const isLeaf = entry.char !== null && entry.char !== undefined
        const isNodeActive = activePath.nodeIds.has(entry.id)

        const radius = isLeaf ? 12 : 10
        let isHovered = false

        if (pointer.active) {
          const dx = pointer.x - pos.x
          const dy = pointer.y - pos.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < radius + 6) {
            isHovered = true
            if (!nextHover) {
              nextHover = {
                type: 'node',
                id: entry.id,
                char: entry.char,
                weight: entry.weight,
                probability: freqData.total ? entry.weight / freqData.total : 0,
                code: entry.char ? codes[entry.char] || '' : '',
                depth: entry.depth
              }
            }
          }
        }

        const hoverMatch = hoverRef.current && hoverRef.current.type === 'node' && hoverRef.current.id === entry.id
        const highlighted = hoverMatch || isHovered || isNodeActive

        // Active path nodes glow yellow, others are teal
        if (isNodeActive) {
          ctx.fillStyle = 'rgba(255, 255, 100, 0.95)'
        } else {
          const fillAlpha = treeAlpha * (highlighted ? 0.9 : 0.55)
          ctx.fillStyle = `rgba(102, 255, 204, ${fillAlpha})`
        }
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, isNodeActive ? radius + 2 : radius, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = isNodeActive
          ? 'rgba(255, 200, 0, 0.9)'
          : `rgba(10, 30, 40, ${highlighted ? 0.9 : 0.4})`
        ctx.lineWidth = highlighted || isNodeActive ? 2 : 1
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, (isNodeActive ? radius + 2 : radius) + 1, 0, Math.PI * 2)
        ctx.stroke()

        ctx.fillStyle = isNodeActive ? 'rgba(40, 20, 0, 0.95)' : 'rgba(0, 20, 30, 0.9)'
        ctx.font = isNodeActive ? 'bold 11px "JetBrains Mono", monospace' : '10px "JetBrains Mono", monospace'
        if (isLeaf) {
          ctx.fillText(formatSymbol(entry.char), pos.x - radius, pos.y - radius - 4)
          ctx.fillText(codes[entry.char] || '', pos.x - radius, pos.y + radius + 12)
        } else {
          ctx.fillText(entry.weight.toString(), pos.x - radius / 1.6, pos.y + 4)
        }
      })
    } else {
      ctx.fillStyle = 'rgba(102, 255, 204, 0.2)'
      ctx.font = '12px "JetBrains Mono", monospace'
      ctx.fillText('type text above to spawn the tree', treeArea.x, treeArea.y + 20)
    }

    if (freqData.entries.length) {
      const rowHeight = freqData.entries.length > 8
        ? freqArea.height / freqData.entries.length
        : 24
      freqData.entries.forEach((entry, index) => {
        const y = freqArea.y + index * Math.max(rowHeight, 18)
        const ratio = freqData.total ? entry.count / freqData.total : 0
        const barWidth = (freqArea.width - 60) * ratio
        const barHeight = Math.max(14, rowHeight - 6)

        const inRow = pointer.active &&
          pointer.x >= freqArea.x &&
          pointer.x <= freqArea.x + freqArea.width &&
          pointer.y >= y &&
          pointer.y <= y + barHeight

        if (inRow && !nextHover) {
          nextHover = {
            type: 'freq',
            id: entry.char,
            index,
            char: entry.char,
            weight: entry.count,
            probability: ratio,
            code: codes[entry.char] || ''
          }
        }

        const isActive = (hoverRef.current && hoverRef.current.type === 'freq' && hoverRef.current.id === entry.char) || inRow

        ctx.fillStyle = `rgba(102, 255, 204, ${isActive ? 0.6 : 0.25 * freqAlpha})`
        ctx.fillRect(freqArea.x, y, Math.max(40, barWidth), barHeight)

        ctx.fillStyle = 'rgba(0, 18, 28, 0.8)'
        ctx.font = '11px "JetBrains Mono", monospace'
        ctx.fillText(formatSymbol(entry.char), freqArea.x + 6, y + barHeight / 1.5)
        ctx.fillText(entry.count.toString(), freqArea.x + freqArea.width - 48, y + barHeight / 1.5)
      })
    }

    if (encodedBits.length) {
      ctx.fillStyle = 'rgba(0, 10, 20, 0.8)'
      ctx.fillRect(streamArea.x, streamArea.y, streamArea.width, streamArea.height)
      ctx.strokeStyle = `rgba(102, 255, 204, ${0.35 + streamAlpha * 0.4})`
      ctx.lineWidth = 1
      ctx.strokeRect(streamArea.x, streamArea.y, streamArea.width, streamArea.height)

      const windowBits = Math.min(encodedBits.length, Math.max(60, Math.floor(streamArea.width / 6)))
      const head = Math.floor(playheadRef.current)
      const start = Math.max(0, head - Math.floor(windowBits * 0.7))
      const subset = encodedBits.slice(start, start + windowBits)
      const cell = streamArea.width / Math.max(1, subset.length)
      const midY = streamArea.y + streamArea.height / 2

      subset.split('').forEach((bit, idx) => {
        const x = streamArea.x + idx * cell
        const isHead = start + idx === head
        const yOffset = bit === '1' ? -streamArea.height * 0.3 : streamArea.height * 0.25
        ctx.strokeStyle = isHead
          ? `rgba(255, 255, 255, ${0.9 * streamAlpha})`
          : `rgba(102, 255, 204, ${0.25 * streamAlpha})`
        ctx.lineWidth = isHead ? 2 : 1
        ctx.beginPath()
        ctx.moveTo(x, midY)
        ctx.lineTo(x, midY + yOffset)
        ctx.stroke()
      })
    } else {
      ctx.fillStyle = 'rgba(102, 255, 204, 0.25)'
      ctx.font = '12px "JetBrains Mono", monospace'
      ctx.fillText('bitstream dormant - encode by typing', streamArea.x, streamArea.y + 20)
    }

    updateHoverInfo(pointer.active ? nextHover : null)
  }, [ctx, dimensions.height, dimensions.width, treeLayout, freqData, codes, mode, isPlaying, speedIndex, encodedBits.length, updateHoverInfo, charBoundaries, tree, getTreePath])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let frameId
    const loop = () => {
      onFrame()
      frameId = requestAnimationFrame(loop)
    }
    frameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, onFrame])

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

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <p className="text-void-green/60 text-xs font-mono max-w-3xl text-right">
          {message}
        </p>
      </div>

      <div className="border-b border-void-green/10 bg-void-dark/70 p-4 flex flex-col xl:flex-row gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-widest text-void-green/50 font-mono">
              source text
            </span>
            <span className="text-xs text-void-green/40 font-mono">
              {sourceText.length}/{MAX_LENGTH}
            </span>
          </div>
          <textarea
            value={sourceText}
            onChange={handleTextChange}
            placeholder="type or paste text to compress"
            className="w-full h-32 bg-void-dark/60 border border-void-green/20 rounded px-3 py-2 text-sm font-mono text-void-green/90 focus:outline-none focus:border-void-green/60 transition-colors"
          />
        </div>
        <div className="w-full xl:w-64 border border-void-green/20 rounded p-3 bg-void-dark/80">
          <div className="text-xs uppercase tracking-widest text-void-green/50 font-mono mb-2">
            top symbols
          </div>
          {topSymbols.length === 0 && (
            <p className="text-void-green/40 text-xs font-mono">type to reveal symbol stats</p>
          )}
          {topSymbols.map(symbol => (
            <div key={symbol.label} className="flex items-center justify-between text-xs font-mono text-void-green/80 py-1 border-b border-void-green/10 last:border-b-0">
              <span>{symbol.label}</span>
              <span className="text-void-green/60">{symbol.code}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="huffman-loom-canvas"
        />

        {hoverInfo && mouse.isInBounds && (
          <div
            className="absolute px-3 py-2 bg-void-dark/90 border border-void-green/40 text-xs text-void-green font-mono pointer-events-none"
            style={{
              left: mouse.position.x + 16,
              top: mouse.position.y + 16
            }}
          >
            <div>symbol: {formatSymbol(hoverInfo.char)}</div>
            {hoverInfo.code && <div>code: {hoverInfo.code}</div>}
            <div>count: {hoverInfo.weight ?? 0}</div>
            {hoverInfo.probability !== undefined && (
              <div>p: {(hoverInfo.probability * 100).toFixed(1)}%</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default HuffmanLoom
