import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const EMPTY = 0
const CONDUCTOR = 1
const HEAD = 2
const TAIL = 3
const FRAME_SKIP = 5

const MODES = [
  { id: 'trace', label: 'ink.trace()' },
  { id: 'spark', label: 'ignite()' },
  { id: 'erase', label: 'erase()' }
]

const CLAMP_MIN = 12
const CLAMP_MAX = 20

const PATTERNS = {
  clock: {
    width: 8,
    height: 5,
    cells: [
      [0, 0, CONDUCTOR], [1, 0, TAIL], [2, 0, HEAD], [3, 0, CONDUCTOR], [4, 0, CONDUCTOR], [5, 0, CONDUCTOR], [6, 0, CONDUCTOR], [7, 0, CONDUCTOR],
      [0, 1, CONDUCTOR], [7, 1, CONDUCTOR],
      [0, 2, CONDUCTOR], [7, 2, CONDUCTOR],
      [0, 3, CONDUCTOR], [7, 3, CONDUCTOR],
      [0, 4, CONDUCTOR], [1, 4, CONDUCTOR], [2, 4, CONDUCTOR], [3, 4, CONDUCTOR], [4, 4, CONDUCTOR], [5, 4, CONDUCTOR], [6, 4, CONDUCTOR], [7, 4, CONDUCTOR]
    ]
  },
  bus: {
    width: 12,
    height: 5,
    cells: [
      [0, 2, TAIL], [1, 2, HEAD], [2, 2, CONDUCTOR], [3, 2, CONDUCTOR], [4, 2, CONDUCTOR], [5, 2, CONDUCTOR], [6, 2, CONDUCTOR], [7, 2, CONDUCTOR], [8, 2, CONDUCTOR], [9, 2, CONDUCTOR], [10, 2, CONDUCTOR], [11, 2, CONDUCTOR],
      [4, 1, CONDUCTOR], [4, 0, CONDUCTOR],
      [8, 3, CONDUCTOR], [8, 4, CONDUCTOR]
    ]
  }
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const deriveState = (heads, tails, conductors, running) => {
  if (running && (heads > 0 || tails > 0)) return 'propagating'
  if (!running && (heads > 0 || tails > 0)) return 'held'
  if (conductors > 0) return 'charged'
  return 'blank'
}

const createGrid = (width, height) => {
  const cellSize = clamp(Math.floor(Math.min(width, height) / 28), CLAMP_MIN, CLAMP_MAX)
  const cols = Math.max(18, Math.floor(width / cellSize) - 2)
  const rows = Math.max(12, Math.floor(height / cellSize) - 2)
  const gridWidth = cols * cellSize
  const gridHeight = rows * cellSize

  return {
    cols,
    rows,
    cellSize,
    offsetX: Math.floor((width - gridWidth) / 2),
    offsetY: Math.floor((height - gridHeight) / 2),
    cells: new Uint8Array(cols * rows)
  }
}

const toIndex = (x, y, cols) => y * cols + x

const WireworldVigil = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('trace')
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('∴ conductive silence waits for your hand ∴')
  const [stats, setStats] = useState({
    generation: 0,
    conductors: 0,
    heads: 0,
    tails: 0,
    state: 'blank'
  })

  const gridRef = useRef({
    cols: 0,
    rows: 0,
    cellSize: 16,
    offsetX: 0,
    offsetY: 0,
    cells: new Uint8Array(0)
  })
  const generationRef = useRef(0)
  const frameRef = useRef(0)
  const lastPaintRef = useRef(null)
  const dirtyRef = useRef(true)
  const initializedRef = useRef(false)

  const syncStats = useCallback((cells = gridRef.current.cells, runningOverride = running) => {
    let conductors = 0
    let heads = 0
    let tails = 0

    for (let i = 0; i < cells.length; i++) {
      if (cells[i] === CONDUCTOR) conductors++
      else if (cells[i] === HEAD) heads++
      else if (cells[i] === TAIL) tails++
    }

    setStats({
      generation: generationRef.current,
      conductors,
      heads,
      tails,
      state: deriveState(heads, tails, conductors, runningOverride)
    })
    dirtyRef.current = false
  }, [running])

  const resetGrid = useCallback(() => {
    if (dimensions.width === 0) return
    gridRef.current = createGrid(dimensions.width, dimensions.height)
    generationRef.current = 0
    frameRef.current = 0
    lastPaintRef.current = null
    dirtyRef.current = true
    setRunning(false)
    syncStats(gridRef.current.cells, false)
    setMessage('∴ vigil grid unfolded • trace copper hymns into it ∴')
  }, [dimensions.height, dimensions.width, syncStats])

  useEffect(() => {
    if (dimensions.width === 0) return
    if (!initializedRef.current) {
      initializedRef.current = true
      resetGrid()
    } else {
      resetGrid()
    }
  }, [dimensions.width, dimensions.height, resetGrid])

  useEffect(() => {
    if (!mouse.isDown) {
      lastPaintRef.current = null
    }
  }, [mouse.isDown])

  const coordFromPoint = useCallback((px, py) => {
    const grid = gridRef.current
    const localX = px - grid.offsetX
    const localY = py - grid.offsetY
    if (localX < 0 || localY < 0) return null

    const x = Math.floor(localX / grid.cellSize)
    const y = Math.floor(localY / grid.cellSize)

    if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) return null
    return { x, y }
  }, [])

  const setCell = useCallback((x, y, state) => {
    const grid = gridRef.current
    if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) return
    grid.cells[toIndex(x, y, grid.cols)] = state
    dirtyRef.current = true
  }, [])

  const brushCell = useCallback((x, y, brushMode = mode) => {
    const grid = gridRef.current
    if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) return
    const index = toIndex(x, y, grid.cols)

    if (brushMode === 'trace') {
      grid.cells[index] = CONDUCTOR
    } else if (brushMode === 'spark') {
      grid.cells[index] = HEAD
    } else {
      grid.cells[index] = EMPTY
    }

    dirtyRef.current = true
  }, [mode])

  const paintStroke = useCallback((from, to) => {
    const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y), 1)
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(from.x + ((to.x - from.x) * i) / steps)
      const y = Math.round(from.y + ((to.y - from.y) * i) / steps)
      brushCell(x, y)
    }
  }, [brushCell])

  const countHeadNeighbors = useCallback((cells, cols, rows, x, y) => {
    let total = 0
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
        if (cells[toIndex(nx, ny, cols)] === HEAD) total++
      }
    }
    return total
  }, [])

  const stepWorld = useCallback(() => {
    const grid = gridRef.current
    if (grid.cells.length === 0) return

    const next = new Uint8Array(grid.cells.length)

    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const index = toIndex(x, y, grid.cols)
        const state = grid.cells[index]

        if (state === HEAD) {
          next[index] = TAIL
        } else if (state === TAIL) {
          next[index] = CONDUCTOR
        } else if (state === CONDUCTOR) {
          const heads = countHeadNeighbors(grid.cells, grid.cols, grid.rows, x, y)
          next[index] = heads === 1 || heads === 2 ? HEAD : CONDUCTOR
        }
      }
    }

    grid.cells = next
    generationRef.current++
    syncStats(next, running)
  }, [countHeadNeighbors, running, syncStats])

  const anchorFromMouse = useCallback(() => {
    const pointed = coordFromPoint(mouse.positionRef.current.x, mouse.positionRef.current.y)
    if (pointed) return pointed

    const grid = gridRef.current
    return {
      x: Math.floor(grid.cols / 2),
      y: Math.floor(grid.rows / 2)
    }
  }, [coordFromPoint, mouse.positionRef])

  const stampPattern = useCallback((patternKey) => {
    const pattern = PATTERNS[patternKey]
    if (!pattern) return

    const anchor = anchorFromMouse()
    const startX = anchor.x - Math.floor(pattern.width / 2)
    const startY = anchor.y - Math.floor(pattern.height / 2)

    pattern.cells.forEach(([dx, dy, state]) => {
      setCell(startX + dx, startY + dy, state)
    })

    syncStats()
    setMessage(
      patternKey === 'clock'
        ? '∴ clock loop seated • a current can now circle forever ∴'
        : '∴ bus line etched • pulse routes branch into the dark ∴'
    )
  }, [anchorFromMouse, setCell, syncStats])

  const annealField = useCallback(() => {
    const grid = gridRef.current
    for (let i = 0; i < grid.cells.length; i++) {
      if (grid.cells[i] === HEAD || grid.cells[i] === TAIL) {
        grid.cells[i] = CONDUCTOR
      }
    }
    syncStats()
    setMessage('∴ afterglow cooled into permanent trace ∴')
  }, [syncStats])

  const clearField = useCallback(() => {
    const grid = gridRef.current
    grid.cells = new Uint8Array(grid.cells.length)
    generationRef.current = 0
    lastPaintRef.current = null
    setRunning(false)
    syncStats(grid.cells, false)
    setMessage('∴ the board was scrubbed back to sleeping substrate ∴')
  }, [syncStats])

  const toggleRun = useCallback(() => {
    setRunning(prev => {
      const next = !prev
      setMessage(next
        ? '∴ current released • electron heads hunt their next conductor ∴'
        : '∴ propagation arrested • the pattern holds its breath ∴')
      return next
    })
  }, [])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    setMessage(
      nextMode === 'trace'
        ? '∴ trace conductors by dragging across the grid ∴'
        : nextMode === 'spark'
        ? '∴ ignite cells to launch electron heads into the wiring ∴'
        : '∴ erase away dead branches and overbuilt scars ∴'
    )
  }, [])

  const drawScene = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const grid = gridRef.current
    const { cellSize, cols, rows, offsetX, offsetY, cells } = grid

    const background = ctx.createLinearGradient(0, 0, dimensions.width, dimensions.height)
    background.addColorStop(0, '#02040a')
    background.addColorStop(0.55, '#031017')
    background.addColorStop(1, '#010205')
    ctx.fillStyle = background
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const sweep = ((generationRef.current * 3) % Math.max(1, rows * cellSize)) + offsetY
    ctx.fillStyle = 'rgba(102, 255, 204, 0.025)'
    ctx.fillRect(offsetX, sweep - cellSize * 1.5, cols * cellSize, cellSize * 3)

    ctx.strokeStyle = 'rgba(102, 255, 204, 0.08)'
    ctx.lineWidth = 1
    ctx.strokeRect(offsetX - 1, offsetY - 1, cols * cellSize + 2, rows * cellSize + 2)

    ctx.strokeStyle = 'rgba(102, 255, 204, 0.04)'
    for (let x = 0; x <= cols; x++) {
      const px = offsetX + x * cellSize + 0.5
      ctx.beginPath()
      ctx.moveTo(px, offsetY)
      ctx.lineTo(px, offsetY + rows * cellSize)
      ctx.stroke()
    }
    for (let y = 0; y <= rows; y++) {
      const py = offsetY + y * cellSize + 0.5
      ctx.beginPath()
      ctx.moveTo(offsetX, py)
      ctx.lineTo(offsetX + cols * cellSize, py)
      ctx.stroke()
    }

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const state = cells[toIndex(x, y, cols)]
        if (state === EMPTY) continue

        const px = offsetX + x * cellSize
        const py = offsetY + y * cellSize
        const inset = Math.max(1, cellSize * 0.12)
        const size = cellSize - inset * 2

        if (state === CONDUCTOR) {
          const hue = 34 + ((x * 7 + y * 13) % 10)
          ctx.fillStyle = `hsla(${hue}, 85%, 56%, 0.55)`
          ctx.fillRect(px + inset, py + inset, size, size)
          ctx.fillStyle = 'rgba(255, 245, 220, 0.08)'
          ctx.fillRect(px + inset, py + inset, size, Math.max(1, size * 0.18))
        } else if (state === HEAD) {
          ctx.shadowColor = 'rgba(120, 255, 248, 0.75)'
          ctx.shadowBlur = cellSize * 0.9
          ctx.fillStyle = 'rgba(122, 255, 240, 0.95)'
          ctx.fillRect(px + inset, py + inset, size, size)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
          ctx.fillRect(px + inset, py + inset, Math.max(1, size * 0.28), size)
        } else if (state === TAIL) {
          ctx.shadowColor = 'rgba(255, 140, 110, 0.45)'
          ctx.shadowBlur = cellSize * 0.55
          ctx.fillStyle = 'rgba(255, 118, 90, 0.82)'
          ctx.fillRect(px + inset, py + inset, size, size)
        }
      }
    }

    ctx.shadowBlur = 0

    const hover = coordFromPoint(mouse.position.x, mouse.position.y)
    if (hover) {
      const px = offsetX + hover.x * cellSize
      const py = offsetY + hover.y * cellSize
      ctx.strokeStyle = mode === 'erase'
        ? 'rgba(255, 130, 120, 0.8)'
        : mode === 'spark'
        ? 'rgba(122, 255, 240, 0.9)'
        : 'rgba(255, 214, 102, 0.75)'
      ctx.lineWidth = 2
      ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2)
    }
  }, [coordFromPoint, ctx, dimensions.height, dimensions.width, mode, mouse.position.x, mouse.position.y])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    frameRef.current++

    if (mouse.isDown) {
      const current = coordFromPoint(mouse.positionRef.current.x, mouse.positionRef.current.y)
      if (current) {
        paintStroke(lastPaintRef.current || current, current)
        lastPaintRef.current = current
      }
    }

    if (running && frameRef.current % FRAME_SKIP === 0) {
      stepWorld()
    } else if (dirtyRef.current && frameRef.current % 4 === 0) {
      syncStats()
    }

    drawScene()
  }, [coordFromPoint, ctx, dimensions.width, drawScene, mouse.isDown, mouse.positionRef, paintStroke, running, stepWorld, syncStats])

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

  const metrics = useMemo(() => ([
    { label: 'gen', value: stats.generation },
    { label: 'trace', value: stats.conductors },
    { label: 'heads', value: stats.heads },
    { label: 'tails', value: stats.tails },
    { label: 'state', value: stats.state }
  ]), [stats])

  const controls = [
    {
      id: 'run',
      label: running ? 'pause.world()' : 'run.world()',
      onClick: toggleRun,
      active: running
    },
    {
      id: 'step',
      label: 'step()',
      onClick: () => {
        stepWorld()
        setMessage('∴ one generation advanced • current edges rewritten ∴')
      }
    },
    {
      id: 'clock',
      label: 'stamp.clock()',
      onClick: () => stampPattern('clock')
    },
    {
      id: 'bus',
      label: 'stamp.bus()',
      onClick: () => stampPattern('bus')
    },
    {
      id: 'anneal',
      label: 'anneal()',
      onClick: annealField
    },
    {
      id: 'clear',
      label: 'clear.field()',
      onClick: clearField,
      variant: 'reset'
    }
  ]

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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
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
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          data-testid="wireworld-vigil-canvas"
        />
      </div>
    </div>
  )
}

export default WireworldVigil
