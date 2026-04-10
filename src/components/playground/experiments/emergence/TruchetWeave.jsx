import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const CELL = 32

const MODES = [
  { id: 'arc', label: 'tile.arc()' },
  { id: 'line', label: 'tile.line()' },
  { id: 'nest', label: 'tile.nest()' }
]

const PATH_HUES = [170, 280, 45, 330, 90, 200, 15, 260, 120, 350, 60, 310, 150, 230]

const TruchetWeave = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('arc')
  const [message, setMessage] = useState('∴ click tiles to rotate // paths emerge from two-fold symmetry ∴')
  const [traced, setTraced] = useState(false)

  const gridRef = useRef({ cells: [], cols: 0, rows: 0 })
  const traceRef = useRef(null)
  const frameRef = useRef(0)
  const hoverPathRef = useRef(-1)

  const initGrid = useCallback(() => {
    const cols = Math.max(4, Math.floor(dimensions.width / CELL))
    const rows = Math.max(3, Math.floor(dimensions.height / CELL))
    const cells = []
    for (let y = 0; y < rows; y++) {
      const row = []
      for (let x = 0; x < cols; x++) {
        row.push({ orientation: Math.floor(Math.random() * 2) })
      }
      cells.push(row)
    }
    gridRef.current = { cells, cols, rows }
    traceRef.current = null
    hoverPathRef.current = -1
    setTraced(false)
  }, [dimensions.width, dimensions.height])

  const computeTrace = useCallback(() => {
    const grid = gridRef.current
    const { cols, rows } = grid

    // Build edge-midpoint adjacency graph
    // Each tile creates two arcs connecting pairs of edge midpoints
    // Orientation 0: (top<->left), (right<->bottom)
    // Orientation 1: (top<->right), (left<->bottom)
    const adj = new Map()
    const link = (a, b) => {
      if (!adj.has(a)) adj.set(a, new Set())
      if (!adj.has(b)) adj.set(b, new Set())
      adj.get(a).add(b)
      adj.get(b).add(a)
    }

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const o = grid.cells[y][x].orientation
        const T = `h${x},${y}`, B = `h${x},${y + 1}`
        const L = `v${x},${y}`, R = `v${x + 1},${y}`
        if (o === 0) { link(T, L); link(R, B) }
        else { link(T, R); link(L, B) }
      }
    }

    // BFS to find connected path components
    const visited = new Set()
    const edgePath = new Map()
    let pathCount = 0

    for (const start of adj.keys()) {
      if (visited.has(start)) continue
      const pid = pathCount++
      const q = [start]
      visited.add(start)
      while (q.length > 0) {
        const e = q.shift()
        edgePath.set(e, pid)
        for (const n of adj.get(e)) {
          if (!visited.has(n)) { visited.add(n); q.push(n) }
        }
      }
    }

    // Map each tile arc to its path ID and color
    const colorMap = new Map()
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const o = grid.cells[y][x].orientation
        const T = `h${x},${y}`
        const arc1key = o === 0 ? `v${x + 1},${y}` : `v${x},${y}`
        const p0 = edgePath.get(T) ?? 0
        const p1 = edgePath.get(arc1key) ?? 0
        colorMap.set(`${x},${y},0`, { pid: p0, hue: PATH_HUES[p0 % PATH_HUES.length] })
        colorMap.set(`${x},${y},1`, { pid: p1, hue: PATH_HUES[p1 % PATH_HUES.length] })
      }
    }

    traceRef.current = { colorMap, pathCount }
    return pathCount
  }, [])

  // Click to rotate tiles
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const grid = gridRef.current
      const gx = Math.floor((e.clientX - rect.left) / CELL)
      const gy = Math.floor((e.clientY - rect.top) / CELL)
      if (gx < 0 || gy < 0 || gx >= grid.cols || gy >= grid.rows) return

      grid.cells[gy][gx].orientation ^= 1
      if (traceRef.current) computeTrace()
    }

    canvas.addEventListener('click', onClick)
    return () => canvas.removeEventListener('click', onClick)
  }, [canvasRef, computeTrace])

  const handleRandomize = useCallback(() => {
    for (const row of gridRef.current.cells) {
      for (const cell of row) { cell.orientation = Math.floor(Math.random() * 2) }
    }
    if (traceRef.current) computeTrace()
    setMessage('∴ stochastic scatter // new topologies crystallize ∴')
  }, [computeTrace])

  const handleTrace = useCallback(() => {
    if (traceRef.current) {
      traceRef.current = null
      hoverPathRef.current = -1
      setTraced(false)
      setMessage('∴ traces dissolved // monochrome silence ∴')
    } else {
      const n = computeTrace()
      setTraced(true)
      setMessage(`∴ ${n} distinct paths woven through the lattice ∴`)
    }
  }, [computeTrace])

  const handleInvert = useCallback(() => {
    for (const row of gridRef.current.cells) {
      for (const cell of row) { cell.orientation ^= 1 }
    }
    if (traceRef.current) computeTrace()
    setMessage('∴ every tile mirrors // complementary topology ∴')
  }, [computeTrace])

  const handleClear = useCallback(() => {
    for (const row of gridRef.current.cells) {
      for (const cell of row) { cell.orientation = 0 }
    }
    traceRef.current = null
    hoverPathRef.current = -1
    setTraced(false)
    setMessage('∴ all tiles aligned // uniform silence ∴')
  }, [])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    const grid = gridRef.current
    const { cols, rows } = grid
    const t = frameRef.current++
    const r = CELL / 2

    // Detect hovered path
    if (mouse.isInBounds && traceRef.current) {
      const pos = mouse.positionRef.current
      const gx = Math.floor(pos.x / CELL)
      const gy = Math.floor(pos.y / CELL)
      if (gx >= 0 && gy >= 0 && gx < cols && gy < rows) {
        const o = grid.cells[gy][gx].orientation
        const mx = pos.x - (gx * CELL + r)
        const my = pos.y - (gy * CELL + r)
        const arcIdx = o === 0 ? (mx + my < 0 ? 0 : 1) : (-mx + my < 0 ? 0 : 1)
        const info = traceRef.current.colorMap.get(`${gx},${gy},${arcIdx}`)
        hoverPathRef.current = info ? info.pid : -1
      } else {
        hoverPathRef.current = -1
      }
    } else {
      hoverPathRef.current = -1
    }

    // Clear
    ctx.fillStyle = '#020408'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Subtle grid
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.04)'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath()
      ctx.moveTo(x * CELL, 0)
      ctx.lineTo(x * CELL, rows * CELL)
      ctx.stroke()
    }
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * CELL)
      ctx.lineTo(cols * CELL, y * CELL)
      ctx.stroke()
    }

    // Draw tiles
    const trace = traceRef.current
    const hpid = hoverPathRef.current
    ctx.lineCap = 'round'

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const o = grid.cells[y][x].orientation
        const px = x * CELL
        const py = y * CELL

        for (let ai = 0; ai < 2; ai++) {
          let hue = 170
          let alpha = 0.75
          let lw = 2

          if (trace) {
            const info = trace.colorMap.get(`${x},${y},${ai}`)
            if (info) {
              hue = info.hue
              if (hpid >= 0) {
                if (info.pid === hpid) { alpha = 1; lw = 3.5 }
                else { alpha = 0.15 }
              }
            }
          }

          // Subtle breathing
          alpha = Math.min(1, alpha + Math.sin(t * 0.02 + x * 0.3 + y * 0.3) * 0.06)

          ctx.strokeStyle = `hsla(${hue}, 75%, 65%, ${alpha})`
          ctx.lineWidth = lw

          if (mode === 'line') {
            const half = CELL / 2
            ctx.beginPath()
            if (o === 0) {
              if (ai === 0) { ctx.moveTo(px + half, py); ctx.lineTo(px, py + half) }
              else { ctx.moveTo(px + CELL, py + half); ctx.lineTo(px + half, py + CELL) }
            } else {
              if (ai === 0) { ctx.moveTo(px + half, py); ctx.lineTo(px + CELL, py + half) }
              else { ctx.moveTo(px, py + half); ctx.lineTo(px + half, py + CELL) }
            }
            ctx.stroke()
          } else {
            // Arc mode (arc and nest)
            ctx.beginPath()
            if (o === 0) {
              if (ai === 0) ctx.arc(px, py, r, 0, Math.PI / 2)
              else ctx.arc(px + CELL, py + CELL, r, Math.PI, Math.PI * 1.5)
            } else {
              if (ai === 0) ctx.arc(px + CELL, py, r, Math.PI / 2, Math.PI)
              else ctx.arc(px, py + CELL, r, Math.PI * 1.5, Math.PI * 2)
            }
            ctx.stroke()

            // Nested smaller arcs for nest mode
            if (mode === 'nest') {
              const sr = CELL / 4
              ctx.strokeStyle = `hsla(${hue}, 75%, 65%, ${alpha * 0.4})`
              ctx.lineWidth = lw * 0.5
              ctx.beginPath()
              if (o === 0) {
                if (ai === 0) ctx.arc(px, py, sr, 0, Math.PI / 2)
                else ctx.arc(px + CELL, py + CELL, sr, Math.PI, Math.PI * 1.5)
              } else {
                if (ai === 0) ctx.arc(px + CELL, py, sr, Math.PI / 2, Math.PI)
                else ctx.arc(px, py + CELL, sr, Math.PI * 1.5, Math.PI * 2)
              }
              ctx.stroke()
            }
          }
        }
      }
    }

    // Hover outline
    if (mouse.isInBounds) {
      const pos = mouse.positionRef.current
      const gx = Math.floor(pos.x / CELL)
      const gy = Math.floor(pos.y / CELL)
      if (gx >= 0 && gy >= 0 && gx < cols && gy < rows) {
        ctx.strokeStyle = 'rgba(102, 255, 204, 0.25)'
        ctx.lineWidth = 1
        ctx.strokeRect(gx * CELL, gy * CELL, CELL, CELL)
      }
    }
  }, [ctx, dimensions.width, dimensions.height, mode, mouse.isInBounds, mouse.positionRef])

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

  const metrics = useMemo(() => {
    const { cols, rows } = gridRef.current
    const trace = traceRef.current
    return [
      { label: 'grid', value: `${cols}x${rows}` },
      { label: 'tiles', value: cols * rows },
      { label: 'paths', value: trace ? trace.pathCount : '--' },
      { label: 'mode', value: mode }
    ]
  }, [frameRef.current, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const controls = useMemo(() => [
    { id: 'scatter', label: 'scatter()', onClick: handleRandomize },
    { id: 'trace', label: 'trace()', onClick: handleTrace, active: traced },
    { id: 'invert', label: 'invert()', onClick: handleInvert },
    { id: 'clear', label: 'clear()', onClick: handleClear, variant: 'reset' }
  ], [handleRandomize, handleTrace, handleInvert, handleClear, traced])

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
          className="absolute inset-0 w-full h-full cursor-pointer"
          data-testid="truchet-canvas"
        />
      </div>
    </div>
  )
}

export default TruchetWeave
