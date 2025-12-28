import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'manual', label: 'observe.manual()' },
  { id: 'auto', label: 'collapse.auto()' }
]

const TILES = [
  { id: 'void', glyph: '∅', weight: 0.4, color: '#07101a', accent: '#0d1f2b', edges: { N: '0', E: '0', S: '0', W: '0' } },
  { id: 'line-h', glyph: '━', weight: 1.2, color: '#0a2119', accent: '#6cffc6', edges: { N: '0', E: 'a', S: '0', W: 'a' } },
  { id: 'line-v', glyph: '┃', weight: 1.2, color: '#0a1a24', accent: '#5bd0ff', edges: { N: 'a', E: '0', S: 'a', W: '0' } },
  { id: 'cross-a', glyph: '╋', weight: 0.9, color: '#0e1424', accent: '#8dff7a', edges: { N: 'a', E: 'a', S: 'a', W: 'a' } },
  { id: 'corner-ne', glyph: '┓', weight: 1.0, color: '#0b1b2a', accent: '#9af7ff', edges: { N: 'a', E: 'a', S: '0', W: '0' } },
  { id: 'corner-se', glyph: '┛', weight: 1.0, color: '#0b1b2a', accent: '#9af7ff', edges: { N: '0', E: 'a', S: 'a', W: '0' } },
  { id: 'corner-sw', glyph: '┗', weight: 1.0, color: '#0b1b2a', accent: '#9af7ff', edges: { N: '0', E: '0', S: 'a', W: 'a' } },
  { id: 'corner-nw', glyph: '┏', weight: 1.0, color: '#0b1b2a', accent: '#9af7ff', edges: { N: 'a', E: '0', S: '0', W: 'a' } },
  { id: 'tee-n', glyph: '┻', weight: 0.8, color: '#182332', accent: '#ffe36f', edges: { N: '0', E: 'a', S: 'a', W: 'a' } },
  { id: 'tee-s', glyph: '┳', weight: 0.8, color: '#182332', accent: '#ffe36f', edges: { N: 'a', E: 'a', S: '0', W: 'a' } },
  { id: 'braid', glyph: '╋', weight: 0.6, color: '#1c1030', accent: '#ff9cf2', edges: { N: 'b', E: 'a', S: 'b', W: 'a' } },
  { id: 'line-b', glyph: '║', weight: 0.9, color: '#130f24', accent: '#ff7add', edges: { N: 'b', E: '0', S: 'b', W: '0' } },
  { id: 'cross-b', glyph: '╋', weight: 0.7, color: '#0f0f26', accent: '#ffb7f5', edges: { N: 'b', E: 'b', S: 'b', W: 'b' } },
  { id: 'portal', glyph: '⊕', weight: 0.6, color: '#0f1c33', accent: '#b3ff88', edges: { N: '0', E: 'b', S: '0', W: 'a' } }
]

const OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E' }
const NEIGHBORS = [
  { dx: 0, dy: -1, dir: 'N' },
  { dx: 1, dy: 0, dir: 'E' },
  { dx: 0, dy: 1, dir: 'S' },
  { dx: -1, dy: 0, dir: 'W' }
]

const EDGE_COLORS = {
  a: 'rgba(102, 255, 204, 0.9)',
  b: 'rgba(255, 119, 218, 0.9)',
  0: 'rgba(20, 32, 40, 0.6)'
}

const MosaicCollapse = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('manual')
  const [isAuto, setIsAuto] = useState(false)
  const [message, setMessage] = useState('∴ choose a cell to observe the collapse ritual ∴')
  const [collapsedCount, setCollapsedCount] = useState(0)
  const [entropy, setEntropy] = useState(TILES.length)
  const [contradictions, setContradictions] = useState(0)

  const gridRef = useRef({ cols: 0, rows: 0, cells: [] })
  const cellSizeRef = useRef(28)
  const pulseRef = useRef([])
  const totalCellsRef = useRef(0)

  const tileMap = useMemo(() => {
    const m = {}
    TILES.forEach(t => {
      m[t.id] = t
    })
    return m
  }, [])

  const createCell = useCallback(() => ({
    collapsed: false,
    options: TILES.map(t => t.id)
  }), [])

  const coordToIndex = useCallback((x, y) => {
    const { cols, rows } = gridRef.current
    if (x < 0 || y < 0 || x >= cols || y >= rows) return -1
    return y * cols + x
  }, [])

  const indexToCoord = useCallback((index) => {
    const { cols } = gridRef.current
    const x = index % cols
    const y = Math.floor(index / cols)
    return { x, y }
  }, [])

  const isCompatible = useCallback((tileA, tileB, dir) => {
    const edgeA = tileA.edges[dir]
    const edgeB = tileB.edges[OPPOSITE[dir]]
    return edgeA === edgeB
  }, [])

  const refreshMetrics = useCallback(() => {
    const grid = gridRef.current
    let collapsed = 0
    let contradictionCount = 0
    let entropyTotal = 0
    let remaining = 0

    grid.cells.forEach(cell => {
      if (cell.collapsed) collapsed++
      else if (cell.options.length === 0) contradictionCount++
      else {
        entropyTotal += cell.options.length
        remaining++
      }
    })

    setCollapsedCount(collapsed)
    setContradictions(contradictionCount)
    setEntropy(remaining ? entropyTotal / remaining : 0)
  }, [])

  const initializeGrid = useCallback(() => {
    if (dimensions.width === 0) return

    const size = Math.max(22, Math.min(34, Math.floor(dimensions.width / 28)))
    const cols = Math.max(6, Math.floor(dimensions.width / size))
    const rows = Math.max(6, Math.floor(dimensions.height / size))

    cellSizeRef.current = size
    totalCellsRef.current = cols * rows

    const cells = new Array(cols * rows).fill(null).map(() => createCell())
    gridRef.current = { cols, rows, cells }
    pulseRef.current = []
    setCollapsedCount(0)
    setContradictions(0)
    setEntropy(TILES.length)
    setMessage('∴ lattice cleared // ready to collapse ∴')
  }, [createCell, dimensions.height, dimensions.width])

  useEffect(() => {
    initializeGrid()
  }, [initializeGrid])

  const chooseWeighted = useCallback((options) => {
    const total = options.reduce((sum, id) => sum + (tileMap[id]?.weight ?? 1), 0)
    let r = Math.random() * total
    for (const id of options) {
      r -= tileMap[id]?.weight ?? 1
      if (r <= 0) return id
    }
    return options[0]
  }, [tileMap])

  const addPulse = useCallback((index) => {
    const { x, y } = indexToCoord(index)
    const size = cellSizeRef.current
    pulseRef.current.push({
      x: x * size + size / 2,
      y: y * size + size / 2,
      life: 1
    })
  }, [indexToCoord])

  const propagateFrom = useCallback((startIndex) => {
    const grid = gridRef.current
    const queue = [startIndex]

    while (queue.length) {
      const index = queue.shift()
      const cell = grid.cells[index]
      const cellOptions = cell.options
      const { x, y } = indexToCoord(index)

      NEIGHBORS.forEach(({ dx, dy, dir }) => {
        const nx = x + dx
        const ny = y + dy
        const nIndex = coordToIndex(nx, ny)
        if (nIndex === -1) return

        const neighbor = grid.cells[nIndex]
        if (neighbor.collapsed) return

        const before = neighbor.options.length
        const filtered = neighbor.options.filter(optionId => {
          const tileB = tileMap[optionId]
          return cellOptions.some(cellOptionId =>
            isCompatible(tileMap[cellOptionId], tileB, dir)
          )
        })

        if (filtered.length !== before) {
          neighbor.options = filtered
          queue.push(nIndex)
        }
      })
    }
  }, [coordToIndex, indexToCoord, isCompatible, tileMap])

  const collapseCell = useCallback((index, forcedId) => {
    const grid = gridRef.current
    const cell = grid.cells[index]
    if (!cell || cell.collapsed) return null

    const available = forcedId && cell.options.includes(forcedId)
      ? [forcedId]
      : cell.options

    if (available.length === 0) {
      setContradictions(count => count + 1)
      return null
    }

    const choice = chooseWeighted(available)
    cell.collapsed = true
    cell.options = [choice]

    addPulse(index)
    propagateFrom(index)
    refreshMetrics()
    return choice
  }, [addPulse, chooseWeighted, propagateFrom, refreshMetrics])

  const collapseLowestEntropy = useCallback(() => {
    const grid = gridRef.current
    let bestEntropy = Infinity
    let candidates = []

    grid.cells.forEach((cell, idx) => {
      if (cell.collapsed) return
      if (cell.options.length === 0) return
      if (cell.options.length < bestEntropy) {
        bestEntropy = cell.options.length
        candidates = [idx]
      } else if (cell.options.length === bestEntropy) {
        candidates.push(idx)
      }
    })

    if (candidates.length === 0) return false
    const target = candidates[Math.floor(Math.random() * candidates.length)]
    const chosen = collapseCell(target)
    if (chosen) {
      setMessage(`∴ entropy minimized at cell ${target} → ${chosen} ∴`)
    }
    return true
  }, [collapseCell])

  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const size = cellSizeRef.current
    const x = Math.floor((e.clientX - rect.left) / size)
    const y = Math.floor((e.clientY - rect.top) / size)
    const index = coordToIndex(x, y)
    if (index === -1) return

    const cell = gridRef.current.cells[index]
    if (cell.collapsed) return

    const cursor = mouse.positionRef.current
    const cx = x * size + size / 2
    const cy = y * size + size / 2
    const dx = cursor.x - cx
    const dy = cursor.y - cy

    let orientedTile = null
    if (Math.abs(dx) > Math.abs(dy)) {
      orientedTile = dx > 0 ? 'line-h' : 'line-h'
    } else {
      orientedTile = dy > 0 ? 'line-v' : 'line-v'
    }

    collapseCell(index, orientedTile)
    setMessage('∴ manual observation etched a tile into reality ∴')
  }, [canvasRef, collapseCell, coordToIndex, mouse.positionRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('click', handleCanvasClick)
    return () => canvas.removeEventListener('click', handleCanvasClick)
  }, [canvasRef, handleCanvasClick])

  const drawGrid = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const grid = gridRef.current
    const size = cellSizeRef.current
    ctx.fillStyle = 'rgba(2, 6, 12, 0.9)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    pulseRef.current = pulseRef.current.filter(p => {
      p.life -= 0.02
      return p.life > 0
    })

    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const idx = coordToIndex(x, y)
        const cell = grid.cells[idx]
        const px = x * size
        const py = y * size

        const pulse = pulseRef.current.find(p => Math.hypot(p.x - (px + size / 2), p.y - (py + size / 2)) < size / 2)

        if (cell.collapsed) {
          const tile = tileMap[cell.options[0]]
          ctx.fillStyle = tile.color
          ctx.fillRect(px, py, size, size)

          const centerX = px + size / 2
          const centerY = py + size / 2
          const glow = pulse ? Math.max(0.3, pulse.life) : 0.2

          NEIGHBORS.forEach(({ dir }) => {
            const edge = tile.edges[dir]
            if (edge === '0') return
            ctx.strokeStyle = EDGE_COLORS[edge] || tile.accent
            ctx.lineWidth = 3
            ctx.beginPath()
            if (dir === 'N') {
              ctx.moveTo(centerX, centerY)
              ctx.lineTo(centerX, py + 4)
            } else if (dir === 'S') {
              ctx.moveTo(centerX, centerY)
              ctx.lineTo(centerX, py + size - 4)
            } else if (dir === 'E') {
              ctx.moveTo(centerX, centerY)
              ctx.lineTo(px + size - 4, centerY)
            } else if (dir === 'W') {
              ctx.moveTo(centerX, centerY)
              ctx.lineTo(px + 4, centerY)
            }
            ctx.stroke()
          })

          ctx.fillStyle = tile.accent
          ctx.globalAlpha = pulse ? 0.8 : 0.6
          ctx.font = `${Math.max(10, size / 2.6)}px 'JetBrains Mono', 'SF Mono', monospace`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(tile.glyph, centerX, centerY)
          ctx.globalAlpha = 1

          if (pulse) {
            ctx.strokeStyle = tile.accent
            ctx.lineWidth = 1
            ctx.globalAlpha = pulse.life * 0.5
            ctx.beginPath()
            ctx.arc(centerX, centerY, size * 0.45, 0, Math.PI * 2)
            ctx.stroke()
            ctx.globalAlpha = 1
          }
        } else {
          const density = cell.options.length / TILES.length
          ctx.fillStyle = `rgba(10, 22, 24, ${0.25 + density * 0.3})`
          ctx.fillRect(px, py, size, size)

          ctx.strokeStyle = 'rgba(102, 255, 204, 0.08)'
          ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1)

          if (cell.options.length) {
            ctx.fillStyle = 'rgba(255, 230, 128, 0.65)'
            ctx.font = `${Math.max(9, size / 3)}px 'JetBrains Mono', 'SF Mono', monospace`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(cell.options.length, px + size / 2, py + size / 2)
          }
        }
      }
    }

    pulseRef.current.forEach(p => {
      ctx.strokeStyle = `rgba(255, 255, 200, ${p.life * 0.4})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(p.x, p.y, cellSizeRef.current * (1.1 - p.life * 0.6), 0, Math.PI * 2)
      ctx.stroke()
    })

    // Highlight hovered cell
    const hoverSize = cellSizeRef.current
    const hx = Math.floor(mouse.positionRef.current.x / hoverSize)
    const hy = Math.floor(mouse.positionRef.current.y / hoverSize)
    if (hx >= 0 && hy >= 0 && hx < grid.cols && hy < grid.rows) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = 1
      ctx.strokeRect(hx * hoverSize + 1, hy * hoverSize + 1, hoverSize - 2, hoverSize - 2)
    }
  }, [ctx, dimensions.height, dimensions.width, coordToIndex, mouse.positionRef, tileMap])

  const onFrame = useCallback(() => {
    if (isAuto && contradictions === 0) {
      for (let i = 0; i < 3; i++) {
        const progressed = collapseLowestEntropy()
        if (!progressed) {
          setIsAuto(false)
          break
        }
      }
    }

    drawGrid()
  }, [collapseLowestEntropy, contradictions, drawGrid, isAuto])

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
    if (contradictions > 0 || collapsedCount >= totalCellsRef.current) {
      setIsAuto(false)
    }
  }, [collapsedCount, contradictions])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    if (nextMode === 'auto') {
      setIsAuto(true)
      setMessage('∴ auto-collapse chanting // lattice will resolve itself ∴')
    } else {
      setIsAuto(false)
      setMessage('∴ manual observation // click cells or step ∴')
    }
  }, [])

  const handleStep = useCallback(() => {
    const progressed = collapseLowestEntropy()
    if (!progressed) {
      setMessage('∴ no cells available // collapse complete or contradicted ∴')
    }
  }, [collapseLowestEntropy])

  const handleReset = useCallback(() => {
    setIsAuto(false)
    initializeGrid()
  }, [initializeGrid])

  const handleScramble = useCallback(() => {
    const grid = gridRef.current
    grid.cells.forEach(cell => {
      cell.collapsed = false
      cell.options = TILES.map(t => t.id)
    })
    pulseRef.current = []
    setMessage('∴ probabilities scrambled // constraints loosened ∴')
    setIsAuto(false)
    refreshMetrics()
  }, [refreshMetrics])

  const metrics = useMemo(() => ([
    { label: 'collapsed', value: collapsedCount },
    { label: 'entropy', value: entropy.toFixed(2) },
    { label: 'contradictions', value: contradictions },
    { label: 'mode', value: isAuto ? 'auto' : mode }
  ]), [collapsedCount, contradictions, entropy, isAuto, mode])

  const controls = [
    {
      id: 'step',
      label: 'collapse.step()',
      onClick: handleStep
    },
    {
      id: 'auto',
      label: isAuto ? 'pause.auto()' : 'chant.auto()',
      onClick: () => setIsAuto(prev => !prev),
      active: isAuto
    },
    {
      id: 'scramble',
      label: 'scramble()',
      onClick: handleScramble
    },
    {
      id: 'reset',
      label: 'reset.grid()',
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

        <div className="text-xs text-void-green/60 font-mono max-w-xl text-right">
          {message}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="mosaic-collapse-canvas"
        />
      </div>
    </div>
  )
}

export default MosaicCollapse
