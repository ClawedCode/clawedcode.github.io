import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const CELL = 22
const STEPS_PER_FRAME = 8

const MODES = [
  { id: 'terrain', label: 'brush.terrain()' },
  { id: 'walls', label: 'brush.walls()' },
  { id: 'portals', label: 'set.portals()' }
]

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

const PathCartographer = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('terrain')
  const [brush, setBrush] = useState('smooth')
  const [message, setMessage] = useState('∴ mapping weighted corridors • waiting for your glyphs ∴')
  const [stats, setStats] = useState({
    algorithm: 'idle',
    visited: 0,
    frontier: 0,
    path: 0,
    distance: '—',
    status: 'dormant'
  })

  const gridRef = useRef({ cells: [], cols: 0, rows: 0 })
  const startRef = useRef({ x: 2, y: 2 })
  const goalRef = useRef({ x: 8, y: 8 })
  const pathRef = useRef([])
  const pulseRef = useRef(0)
  const modePortalRef = useRef('start')

  const searchRef = useRef({
    algorithm: 'idle',
    frontier: [],
    running: false,
    steps: 0,
    visited: 0,
    finished: false
  })

  const resetCellState = useCallback(() => {
    const grid = gridRef.current
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const cell = grid.cells[y][x]
        cell.visited = false
        cell.dist = Infinity
        cell.score = Infinity
        cell.prev = null
        cell.heat = 0
      }
    }
    pathRef.current = []
  }, [])

  const clearSearch = useCallback(() => {
    searchRef.current = {
      algorithm: 'idle',
      frontier: [],
      running: false,
      steps: 0,
      visited: 0,
      finished: false
    }
    resetCellState()
    setStats(prev => ({ ...prev, algorithm: 'idle', visited: 0, frontier: 0, path: 0, distance: '—', status: 'dormant' }))
  }, [resetCellState])

  const initGrid = useCallback(() => {
    if (dimensions.width === 0) return

    const cols = Math.max(6, Math.floor(dimensions.width / CELL))
    const rows = Math.max(6, Math.floor(dimensions.height / CELL))
    const cells = []

    for (let y = 0; y < rows; y++) {
      const row = []
      for (let x = 0; x < cols; x++) {
        const ridge = Math.sin(x * 0.33) + Math.cos(y * 0.27)
        const roll = Math.random() * 2.5
        const cost = clamp(2.5 + ridge + roll, 1, 9)
        row.push({
          cost,
          wall: Math.random() < 0.03,
          visited: false,
          dist: Infinity,
          score: Infinity,
          prev: null,
          heat: 0
        })
      }
      cells.push(row)
    }

    const start = { x: Math.max(1, Math.floor(cols * 0.2)), y: Math.max(1, Math.floor(rows * 0.2)) }
    const goal = { x: Math.max(1, cols - 3), y: Math.max(1, rows - 3) }

    startRef.current = start
    goalRef.current = goal
    gridRef.current = { cells, cols, rows }
    gridRef.current.cells[start.y][start.x].wall = false
    gridRef.current.cells[goal.y][goal.x].wall = false
    modePortalRef.current = 'start'
    clearSearch()
    setMessage('∴ terrain seeded • carve routes • map intelligence ∴')
  }, [clearSearch, dimensions.height, dimensions.width])

  useEffect(() => {
    initGrid()
  }, [initGrid])

  const coordFromMouse = useCallback((px, py) => {
    const x = Math.floor(px / CELL)
    const y = Math.floor(py / CELL)
    return { x, y }
  }, [])

  const applyBrush = useCallback((x, y) => {
    const grid = gridRef.current
    if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) return
    const isPortal = (startRef.current.x === x && startRef.current.y === y) || (goalRef.current.x === x && goalRef.current.y === y)

    const cell = grid.cells[y][x]

    if (mode === 'terrain') {
      const delta = brush === 'smooth' ? -0.45 : 0.55
      cell.wall = false
      cell.cost = clamp(cell.cost + delta, 1, 10)
      cell.heat = 0.8
      setMessage(brush === 'smooth'
        ? '∴ smoothing corridors • easing traversal ∴'
        : '∴ roughening the landscape • resistance rises ∴')
    } else if (mode === 'walls') {
      if (isPortal) {
        setMessage('∴ portals resist walls • keep the gates open ∴')
        return
      }
      const nowWall = !cell.wall
      cell.wall = nowWall
      cell.cost = clamp(cell.cost + (nowWall ? 0.6 : -0.3), 1, 10)
      cell.heat = 1
      setMessage(nowWall
        ? '∴ barriers raised • force path rethink ∴'
        : '∴ passage reopened • signals slip through ∴')
    } else if (mode === 'portals') {
      cell.wall = false
      if (modePortalRef.current === 'start') {
        startRef.current = { x, y }
        modePortalRef.current = 'goal'
        setMessage('∴ start repositioned • now set the goal ∴')
      } else {
        goalRef.current = { x, y }
        modePortalRef.current = 'start'
        setMessage('∴ goal anchored • routes recalculating ∴')
      }
    }

    clearSearch()
  }, [brush, clearSearch, mode])

  const randomizeTerrain = useCallback(() => {
    const grid = gridRef.current
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const ripple = Math.sin((x + y) * 0.21)
        const noise = Math.random() * 2
        grid.cells[y][x].cost = clamp(2 + ripple + noise, 1, 9)
        grid.cells[y][x].wall = Math.random() < 0.02
      }
    }
    const s = startRef.current
    const g = goalRef.current
    grid.cells[s.y][s.x].wall = false
    grid.cells[g.y][g.x].wall = false
    clearSearch()
    setMessage('∴ terrain regenerated • new gradients await ∴')
  }, [clearSearch])

  const reconstructPath = useCallback(() => {
    const grid = gridRef.current
    const goal = goalRef.current
    const path = []
    let cursor = { ...goal }
    let safety = grid.cols * grid.rows

    while (cursor && safety > 0) {
      path.push(cursor)
      const cell = grid.cells[cursor.y][cursor.x]
      cursor = cell.prev
      safety--
    }

    pathRef.current = path
    pulseRef.current = 1
    setStats(prev => ({ ...prev, path: path.length, distance: grid.cells[goal.y][goal.x].dist.toFixed(1) }))
    setMessage('∴ shortest path inked • follow the luminous thread ∴')
  }, [])

  const beginSearch = useCallback((algorithm) => {
    const grid = gridRef.current
    const start = {
      x: clamp(startRef.current.x, 0, grid.cols - 1),
      y: clamp(startRef.current.y, 0, grid.rows - 1)
    }
    const goal = {
      x: clamp(goalRef.current.x, 0, grid.cols - 1),
      y: clamp(goalRef.current.y, 0, grid.rows - 1)
    }
    startRef.current = start
    goalRef.current = goal

    resetCellState()
    const startCell = grid.cells[start.y][start.x]
    startCell.dist = 0
    startCell.score = 0
    startCell.wall = false
    grid.cells[goal.y][goal.x].wall = false

    searchRef.current = {
      algorithm,
      frontier: [{ x: start.x, y: start.y, score: 0 }],
      running: true,
      steps: 0,
      visited: 0,
      finished: false
    }

    setStats({ algorithm, visited: 0, frontier: 1, path: 0, distance: '—', status: 'seeking' })
    setMessage(`∴ ${algorithm}.seek() ignited • map weaving underway ∴`)
  }, [resetCellState])

  const neighbors = useCallback((x, y) => {
    return [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 }
    ]
  }, [])

  const stepSearch = useCallback((force = false) => {
    const grid = gridRef.current
    const state = searchRef.current
    if ((state.algorithm === 'idle' && !force) || state.finished) return
    if (!state.running && !force) return

    if (state.frontier.length === 0) {
      state.running = false
      state.finished = true
      setStats(prev => ({ ...prev, status: 'stalled', frontier: 0 }))
      setMessage('∴ frontier exhausted • no route through this maze ∴')
      return
    }

    state.frontier.sort((a, b) => a.score - b.score)
    const current = state.frontier.shift()
    const cell = grid.cells[current.y][current.x]
    if (cell.visited) return

    cell.visited = true
    cell.heat = 1
    state.visited++
    state.steps++

    if (current.x === goalRef.current.x && current.y === goalRef.current.y) {
      state.running = false
      state.finished = true
      reconstructPath()
      setStats(prev => ({ ...prev, status: 'solved', visited: state.visited, frontier: state.frontier.length }))
      return
    }

    const alg = state.algorithm
    const goal = goalRef.current

    for (const n of neighbors(current.x, current.y)) {
      if (n.x < 0 || n.y < 0 || n.x >= grid.cols || n.y >= grid.rows) continue
      const nextCell = grid.cells[n.y][n.x]
      if (nextCell.wall) continue

      const baseCost = alg === 'breadth' ? 1 : nextCell.cost
      const tentative = cell.dist + baseCost

      if (tentative < nextCell.dist) {
        nextCell.dist = tentative
        nextCell.prev = { x: current.x, y: current.y }
        const heuristic = alg === 'astar'
          ? (Math.abs(goal.x - n.x) + Math.abs(goal.y - n.y)) * 0.8
          : 0
        nextCell.score = tentative + heuristic
        state.frontier.push({ x: n.x, y: n.y, score: nextCell.score })
      }
    }

    setStats(prev => ({
      ...prev,
      visited: state.visited,
      frontier: state.frontier.length,
      status: 'seeking'
    }))
  }, [neighbors, reconstructPath])

  const toggleRun = useCallback(() => {
    const state = searchRef.current
    if (state.finished || state.algorithm === 'idle') return
    state.running = !state.running
    setStats(prev => ({ ...prev, status: state.running ? 'seeking' : 'paused' }))
    setMessage(state.running ? '∴ traversal resumed • signals marching ∴' : '∴ traversal paused • awaiting command ∴')
  }, [])

  const swapPortals = useCallback(() => {
    const s = startRef.current
    const g = goalRef.current
    startRef.current = { ...g }
    goalRef.current = { ...s }
    clearSearch()
    setMessage('∴ portals swapped • routes invert themselves ∴')
  }, [clearSearch])

  const drawScene = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    const grid = gridRef.current
    const pathSet = new Set(pathRef.current.map(p => `${p.x},${p.y}`))
    ctx.fillStyle = 'rgba(2, 8, 14, 0.35)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const cell = grid.cells[y][x]
        const px = x * CELL
        const py = y * CELL

        let baseLight = 12 + cell.cost * 6
        let hue = 140 - cell.cost * 5

        if (cell.wall) {
          ctx.fillStyle = 'rgba(12, 6, 8, 0.9)'
        } else {
          const visitGlow = cell.visited ? 0.4 + cell.heat * 0.4 : 0
          const pathMask = pathSet.has(`${x},${y}`)
          const light = clamp(baseLight + visitGlow * 30, 10, 80)
          ctx.fillStyle = pathMask
            ? `hsla(52, 85%, ${60 + Math.sin(pulseRef.current * 4) * 10}%, 0.9)`
            : `hsla(${hue}, 45%, ${light}%, ${0.18 + visitGlow})`
        }

        ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2)

        if (!cell.wall) {
          ctx.fillStyle = 'rgba(255,255,255,0.05)'
          ctx.fillRect(px, py, CELL, 1)
          ctx.fillRect(px, py, 1, CELL)
        }
      }
    }

    // Start and goal markers
    const drawMarker = (pos, color, symbol) => {
      const px = pos.x * CELL + CELL / 2
      const py = pos.y * CELL + CELL / 2
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(px, py, CELL * 0.35, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(0, 10, 6, 0.8)'
      ctx.font = '12px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(symbol, px, py)
    }

    drawMarker(startRef.current, 'rgba(102,255,204,0.8)', 'S')
    drawMarker(goalRef.current, 'rgba(255,255,170,0.85)', 'G')

    if (pulseRef.current > 0) {
      pulseRef.current = Math.max(0, pulseRef.current - 0.01)
    }
  }, [ctx, dimensions.height, dimensions.width])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const state = searchRef.current
    if (mouse.isDown && mouse.isInBounds) {
      const pos = mouse.positionRef.current
      const { x, y } = coordFromMouse(pos.x, pos.y)
      applyBrush(x, y)
    }

    if (state.running) {
      for (let i = 0; i < STEPS_PER_FRAME; i++) {
        stepSearch()
        if (!state.running) break
      }
    }

    const grid = gridRef.current
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const cell = grid.cells[y][x]
        cell.heat = Math.max(0, cell.heat - 0.03)
      }
    }

    drawScene()
  }, [applyBrush, coordFromMouse, ctx, dimensions.width, drawScene, mouse.isDown, mouse.isInBounds, mouse.positionRef, stepSearch])

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

  const metrics = useMemo(() => [
    { label: 'algorithm', value: stats.algorithm },
    { label: 'visited', value: stats.visited },
    { label: 'frontier', value: stats.frontier },
    { label: 'path', value: stats.path },
    { label: 'distance', value: stats.distance },
    { label: 'state', value: stats.status }
  ], [stats])

  const controls = [
    {
      id: 'dijkstra',
      label: 'run.dijkstra()',
      onClick: () => beginSearch('dijkstra'),
      active: stats.algorithm === 'dijkstra'
    },
    {
      id: 'astar',
      label: 'run.aStar()',
      onClick: () => beginSearch('astar'),
      active: stats.algorithm === 'astar'
    },
    {
      id: 'breadth',
      label: 'run.breadth()',
      onClick: () => beginSearch('breadth'),
      active: stats.algorithm === 'breadth'
    },
    {
      id: 'step',
      label: 'step()',
      onClick: () => stepSearch(true)
    },
    {
      id: 'toggle',
      label: searchRef.current.running ? 'pause.traverse()' : 'resume.traverse()',
      onClick: toggleRun
    },
    {
      id: 'swap',
      label: 'swap.portals()',
      onClick: swapPortals
    },
    {
      id: 'random',
      label: 'regen.terrain()',
      onClick: randomizeTerrain,
      variant: 'reset'
    },
    {
      id: 'clear',
      label: 'clear.search()',
      onClick: clearSearch,
      variant: 'reset'
    },
    {
      id: 'brush',
      label: brush === 'smooth' ? 'brush.roughen()' : 'brush.smooth()',
      onClick: () => setBrush(prev => prev === 'smooth' ? 'rough' : 'smooth')
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={(next) => {
            setMode(next)
            setMessage(next === 'terrain'
              ? '∴ sculpting terrain costs • carve conduits ∴'
              : next === 'walls'
              ? '∴ barrier brush active • reroute flows ∴'
              : '∴ set start/goal portals • alternate placements ∴')
          }}
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
          data-testid="path-cartographer-canvas"
        />
      </div>
    </div>
  )
}

export default PathCartographer
