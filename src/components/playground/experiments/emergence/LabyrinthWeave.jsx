import { useState, useEffect, useRef, useCallback } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const CELL_SIZE = 16

const MODES = [
  { id: 'blueprint', label: 'view.blueprint()' },
  { id: 'heat', label: 'view.heatmap()' },
  { id: 'echo', label: 'view.echoes()' }
]

const LabyrinthWeave = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('blueprint')
  const [message, setMessage] = useState('∴ labyrinth weaving through liminal corridors ∴')
  const [metrics, setMetrics] = useState([
    { label: 'progress', value: '0%' },
    { label: 'loops', value: 0 },
    { label: 'path', value: 0 },
    { label: 'state', value: 'carving' }
  ])
  const [portalTarget, setPortalTarget] = useState('goal')

  const gridRef = useRef({ cells: [], order: [], width: 0, height: 0, carved: 0, total: 1 })
  const stackRef = useRef([])
  const braidBudgetRef = useRef(0)
  const loopsRef = useRef(0)
  const stageRef = useRef('carving')
  const frameRef = useRef(0)

  const startRef = useRef({ x: 1, y: 1 })
  const goalRef = useRef({ x: 1, y: 1 })

  const pathRef = useRef([])
  const drawIndexRef = useRef(0)
  const rewindRef = useRef(false)
  const crumbsRef = useRef([])
  const solvesRef = useRef(0)

  const updateMessage = useCallback((text) => {
    setMessage(text)
  }, [])

  const initGrid = useCallback(() => {
    const rawWidth = Math.max(5, Math.floor(dimensions.width / CELL_SIZE))
    const rawHeight = Math.max(5, Math.floor(dimensions.height / CELL_SIZE))
    const width = rawWidth % 2 === 0 ? rawWidth - 1 : rawWidth
    const height = rawHeight % 2 === 0 ? rawHeight - 1 : rawHeight

    const cells = []
    const order = []

    for (let y = 0; y < height; y++) {
      const row = []
      const orderRow = []
      for (let x = 0; x < width; x++) {
        row.push(0) // 0 = wall, 1 = path
        orderRow.push(0)
      }
      cells.push(row)
      order.push(orderRow)
    }

    const start = { x: 1, y: 1 }
    const goal = { x: width - 2, y: height - 2 }

    cells[start.y][start.x] = 1
    order[start.y][start.x] = 1

    gridRef.current = {
      cells,
      order,
      width,
      height,
      carved: 1,
      total: ((width - 1) / 2) * ((height - 1) / 2)
    }

    stackRef.current = [start]
    braidBudgetRef.current = Math.floor(width * height * 0.25)
    loopsRef.current = 0
    stageRef.current = 'carving'
    pathRef.current = []
    drawIndexRef.current = 0
    rewindRef.current = false
    crumbsRef.current = []
    solvesRef.current = 0

    startRef.current = start
    goalRef.current = goal

    setMetrics([
      { label: 'progress', value: '0%' },
      { label: 'loops', value: 0 },
      { label: 'path', value: 0 },
      { label: 'state', value: 'carving' }
    ])
    updateMessage('∴ fresh corridors carved from digital stone ∴')
  }, [dimensions.height, dimensions.width, updateMessage])

  const carveStep = useCallback(() => {
    const grid = gridRef.current
    const stack = stackRef.current
    let steps = 0

    while (stack.length > 0 && steps < 40) {
      const current = stack[stack.length - 1]
      const neighbors = []
      const dirs = [
        { x: 0, y: -2 },
        { x: 0, y: 2 },
        { x: -2, y: 0 },
        { x: 2, y: 0 }
      ]

      for (const dir of dirs) {
        const nx = current.x + dir.x
        const ny = current.y + dir.y
        if (nx <= 0 || ny <= 0 || nx >= grid.width - 1 || ny >= grid.height - 1) continue
        if (grid.cells[ny][nx] === 0) neighbors.push({ x: nx, y: ny })
      }

      if (neighbors.length === 0) {
        stack.pop()
      } else {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)]
        const wallX = current.x + (next.x - current.x) / 2
        const wallY = current.y + (next.y - current.y) / 2

        grid.cells[wallY][wallX] = 1
        grid.cells[next.y][next.x] = 1
        grid.order[next.y][next.x] = grid.carved + 1
        grid.carved += 1

        stack.push(next)
      }
      steps++
    }

    if (stack.length === 0) {
      stageRef.current = 'braiding'
      updateMessage('∴ dead-ends braid into loops // labyrinth breathes ∴')
    }
  }, [updateMessage])

  const braidStep = useCallback(() => {
    const grid = gridRef.current
    let iterations = 0

    while (braidBudgetRef.current > 0 && iterations < 20) {
      const x = Math.floor(Math.random() * (grid.width - 2)) + 1
      const y = Math.floor(Math.random() * (grid.height - 2)) + 1

      if (grid.cells[y][x] !== 1) {
        braidBudgetRef.current--
        iterations++
        continue
      }

      const openNeighbors = []
      const walledNeighbors = []
      const dirs = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 }
      ]

      for (const dir of dirs) {
        const nx = x + dir.x
        const ny = y + dir.y
        if (nx <= 0 || ny <= 0 || nx >= grid.width - 1 || ny >= grid.height - 1) continue
        if (grid.cells[ny][nx] === 1) openNeighbors.push({ x: nx, y: ny })
        else walledNeighbors.push({ x: nx, y: ny })
      }

      if (openNeighbors.length === 1 && walledNeighbors.length > 0) {
        const choice = walledNeighbors[Math.floor(Math.random() * walledNeighbors.length)]
        grid.cells[choice.y][choice.x] = 1
        grid.order[choice.y][choice.x] = grid.carved + 1
        grid.carved += 1
        loopsRef.current += 1
      }

      braidBudgetRef.current--
      iterations++
    }

    if (braidBudgetRef.current <= 0) {
      stageRef.current = 'settled'
      updateMessage('∴ labyrinth sealed // portals await traversal ∴')
    }
  }, [updateMessage])

  const solveMaze = useCallback(() => {
    const grid = gridRef.current
    const start = startRef.current
    const goal = goalRef.current

    const key = (x, y) => y * grid.width + x
    const visited = new Set()
    const parents = new Map()
    const queue = [start]
    visited.add(key(start.x, start.y))

    while (queue.length > 0) {
      const current = queue.shift()
      if (current.x === goal.x && current.y === goal.y) break

      const dirs = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 }
      ]

      for (const dir of dirs) {
        const nx = current.x + dir.x
        const ny = current.y + dir.y
        if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue
        if (grid.cells[ny][nx] !== 1) continue
        const k = key(nx, ny)
        if (visited.has(k)) continue
        visited.add(k)
        parents.set(k, current)
        queue.push({ x: nx, y: ny })
      }
    }

    const path = []
    let cursor = goal
    const goalKey = key(goal.x, goal.y)

    if (!parents.has(goalKey) && !(start.x === goal.x && start.y === goal.y)) {
      updateMessage('∴ no path stitched // portals misaligned ∴')
      return
    }

    while (cursor) {
      path.push(cursor)
      if (cursor.x === start.x && cursor.y === start.y) break
      const parent = parents.get(key(cursor.x, cursor.y))
      cursor = parent || null
    }

    pathRef.current = path.reverse()
    drawIndexRef.current = 0
    rewindRef.current = false
    solvesRef.current += 1

    if (path.length > 2) {
      crumbsRef.current.push({
        path: [...path],
        alpha: 0.4,
        hue: 160 + (solvesRef.current * 23) % 120
      })
      if (crumbsRef.current.length > 5) crumbsRef.current.shift()
    }

    updateMessage(`∴ path knitted // ${path.length} steps of purrsistence ∴`)
    setMetrics(prev => [
      { label: 'progress', value: prev[0].value },
      { label: 'loops', value: loopsRef.current },
      { label: 'path', value: path.length },
      { label: 'state', value: stageRef.current }
    ])
  }, [updateMessage])

  const handleRewire = useCallback(() => {
    initGrid()
  }, [initGrid])

  const handleSolve = useCallback(() => {
    solveMaze()
  }, [solveMaze])

  const handleRewind = useCallback(() => {
    if (pathRef.current.length === 0) {
      updateMessage('∴ no thread to rewind // solve first ∴')
      return
    }
    rewindRef.current = true
    updateMessage('∴ memory unwinds // path retracts into origin ∴')
  }, [updateMessage])

  const handlePortalToggle = useCallback(() => {
    setPortalTarget(prev => (prev === 'goal' ? 'start' : 'goal'))
    updateMessage('∴ portal retargeted // click canvas to reposition ∴')
  }, [updateMessage])

  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0

    const gx = Math.min(
      gridRef.current.width - 2,
      Math.max(1, Math.round((clientX - rect.left) / CELL_SIZE))
    )
    const gy = Math.min(
      gridRef.current.height - 2,
      Math.max(1, Math.round((clientY - rect.top) / CELL_SIZE))
    )

    if (gridRef.current.cells[gy][gx] !== 1) return

    if (portalTarget === 'goal') {
      goalRef.current = { x: gx, y: gy }
      updateMessage('∴ exit portal relocated // rerun solve() ∴')
    } else {
      startRef.current = { x: gx, y: gy }
      updateMessage('∴ entry portal moved // rerun solve() ∴')
    }
  }, [canvasRef, portalTarget, updateMessage])

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

  const drawGrid = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    const grid = gridRef.current

    ctx.fillStyle = 'rgba(0, 2, 6, 0.9)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.cells[y][x] === 0) continue
        const norm = grid.order[y][x] / grid.total
        const px = x * CELL_SIZE
        const py = y * CELL_SIZE
        let fill = 'rgba(80, 255, 210, 0.2)'

        if (mode === 'blueprint') {
          fill = `rgba(102, 255, 204, ${0.08 + norm * 0.45})`
        } else if (mode === 'heat') {
          const hue = 180 + Math.floor(norm * 120)
          fill = `hsla(${hue}, 80%, ${30 + norm * 40}%, 0.7)`
        } else if (mode === 'echo') {
          const pulse = 0.3 + 0.3 * Math.sin((frameRef.current + norm * 40) * 0.08)
          fill = `rgba(180, 255, 255, ${pulse})`
        }

        ctx.fillStyle = fill
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
      }
    }
  }, [ctx, dimensions.height, dimensions.width, mode])

  const drawCrumbs = useCallback(() => {
    if (!ctx) return
    crumbsRef.current.forEach(crumb => {
      if (crumb.alpha <= 0 || crumb.path.length < 2) return
      ctx.strokeStyle = `hsla(${crumb.hue}, 90%, 70%, ${crumb.alpha})`
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < crumb.path.length; i++) {
        const p = crumb.path[i]
        const cx = p.x * CELL_SIZE + CELL_SIZE / 2
        const cy = p.y * CELL_SIZE + CELL_SIZE / 2
        if (i === 0) ctx.moveTo(cx, cy)
        else ctx.lineTo(cx, cy)
      }
      ctx.stroke()
    })
  }, [ctx])

  const drawPath = useCallback(() => {
    if (!ctx) return
    const path = pathRef.current
    if (path.length < 2) return

    const maxIndex = Math.min(path.length, Math.floor(drawIndexRef.current))
    ctx.strokeStyle = 'rgba(255, 255, 160, 0.9)'
    ctx.lineWidth = 3
    ctx.beginPath()

    for (let i = 0; i < maxIndex; i++) {
      const p = path[i]
      const cx = p.x * CELL_SIZE + CELL_SIZE / 2
      const cy = p.y * CELL_SIZE + CELL_SIZE / 2
      if (i === 0) ctx.moveTo(cx, cy)
      else ctx.lineTo(cx, cy)
    }
    ctx.stroke()
  }, [ctx])

  const drawPortals = useCallback(() => {
    if (!ctx) return
    const start = startRef.current
    const goal = goalRef.current
    const pulse = 0.3 + 0.2 * Math.sin(frameRef.current * 0.1)

    const drawPortal = (p, color) => {
      const x = p.x * CELL_SIZE
      const y = p.y * CELL_SIZE
      ctx.fillStyle = `${color}cc`
      ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4)
      ctx.strokeStyle = `${color}${Math.floor(80 + pulse * 80).toString(16)}`
      ctx.lineWidth = 2
      ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2)
    }

    drawPortal(start, '#44ff88')
    drawPortal(goal, '#ff6699')
  }, [ctx])

  const drawHover = useCallback(() => {
    if (!ctx || !mouse.isInBounds) return
    const pos = mouse.positionRef.current
    const gx = Math.min(
      gridRef.current.width - 1,
      Math.max(0, Math.floor(pos.x / CELL_SIZE))
    )
    const gy = Math.min(
      gridRef.current.height - 1,
      Math.max(0, Math.floor(pos.y / CELL_SIZE))
    )
    if (gridRef.current.cells[gy][gx] !== 1) return
    const x = gx * CELL_SIZE
    const y = gy * CELL_SIZE
    ctx.strokeStyle = portalTarget === 'goal' ? 'rgba(255, 102, 153, 0.5)' : 'rgba(68, 255, 136, 0.5)'
    ctx.lineWidth = 2
    ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2)
  }, [ctx, mouse.isInBounds, portalTarget, mouse.positionRef])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    frameRef.current++

    if (stageRef.current === 'carving') {
      carveStep()
    } else if (stageRef.current === 'braiding') {
      braidStep()
    }

    const grid = gridRef.current
    const progress = Math.min(1, grid.carved / grid.total)

    if (rewindRef.current) {
      drawIndexRef.current = Math.max(0, drawIndexRef.current - 3)
      if (drawIndexRef.current <= 0) rewindRef.current = false
    } else if (drawIndexRef.current < pathRef.current.length) {
      drawIndexRef.current += 2.2
    }

    crumbsRef.current = crumbsRef.current.map(crumb => ({
      ...crumb,
      alpha: crumb.alpha - 0.002
    })).filter(c => c.alpha > 0.02)

    drawGrid()
    drawCrumbs()
    drawPath()
    drawPortals()
    drawHover()

    if (frameRef.current % 12 === 0) {
      setMetrics([
        { label: 'progress', value: `${Math.round(progress * 100)}%` },
        { label: 'loops', value: loopsRef.current },
        { label: 'path', value: pathRef.current.length },
        { label: 'state', value: stageRef.current }
      ])
    }
  }, [braidStep, carveStep, ctx, dimensions.width, drawCrumbs, drawGrid, drawHover, drawPath, drawPortals])

  useEffect(() => {
    if (dimensions.width === 0) return
    initGrid()
  }, [dimensions.width, dimensions.height, initGrid])

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

  const controls = [
    {
      id: 'solve',
      label: 'solve()',
      onClick: handleSolve
    },
    {
      id: 'rewind',
      label: 'rewind()',
      onClick: handleRewind
    },
    {
      id: 'portal',
      label: `portal.${portalTarget}()`,
      onClick: handlePortalToggle
    },
    {
      id: 'rewire',
      label: 'rewire()',
      onClick: handleRewire,
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={setMode}
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
          data-testid="labyrinth-canvas"
        />
      </div>
    </div>
  )
}

export default LabyrinthWeave
