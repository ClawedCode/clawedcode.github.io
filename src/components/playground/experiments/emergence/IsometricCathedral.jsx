import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'build', label: 'mode.build()' },
  { id: 'etch', label: 'mode.etch()' },
  { id: 'resonate', label: 'mode.resonate()' }
]

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

const IsometricCathedral = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('build')
  const [isEvolving, setIsEvolving] = useState(true)
  const [message, setMessage] = useState('∴ drafting impossible cathedrals in the void ∴')
  const [stats, setStats] = useState({ avg: 0, spires: 0, roughness: 0 })

  const gridRef = useRef({ cells: [], cols: 0, rows: 0 })
  const configRef = useRef({ tileW: 36, tileH: 20, heightScale: 7, originX: 0, originY: 0 })
  const timeRef = useRef(0)
  const rippleRef = useRef({ strength: 0, anchor: null })
  const sketchRef = useRef(0)

  const initializeGrid = useCallback(() => {
    if (dimensions.width === 0) return

    const tileW = configRef.current.tileW
    const tileH = configRef.current.tileH
    const cols = Math.max(12, Math.floor(dimensions.width / tileW) - 2)
    const rows = Math.max(10, Math.floor(dimensions.height / (tileH * 1.4)))

    const originX = dimensions.centerX
    const originY = dimensions.centerY - rows * tileH * 0.35

    configRef.current.originX = originX
    configRef.current.originY = originY

    const cells = []
    for (let y = 0; y < rows; y++) {
      const row = []
      for (let x = 0; x < cols; x++) {
        const wave = Math.sin(x * 0.5) + Math.cos(y * 0.4)
        const slope = Math.max(0, (rows - y) / rows)
        const base = 1.5 + wave * 0.35 + slope * 0.8
        row.push({ h: clamp(base + Math.random() * 0.6, 0, 10) })
      }
      cells.push(row)
    }

    gridRef.current = { cells, cols, rows }
    setMessage('∴ blueprint seeded • tiers waiting for your paws ∴')
  }, [dimensions.centerX, dimensions.centerY, dimensions.height, dimensions.width])

  const screenToGrid = useCallback((px, py) => {
    const { tileW, tileH, originX, originY } = configRef.current
    const dx = px - originX
    const dy = py - originY
    const gx = Math.floor((dx / (tileW / 2) + dy / (tileH / 2)) / 2)
    const gy = Math.floor((dy / (tileH / 2) - dx / (tileW / 2)) / 2)
    return { gx, gy }
  }, [])

  const applyBrush = useCallback((px, py) => {
    const { gx, gy } = screenToGrid(px, py)
    const grid = gridRef.current
    if (gx < 0 || gy < 0 || gx >= grid.cols || gy >= grid.rows) return

    const cell = grid.cells[gy][gx]
    const delta = mode === 'build' ? 0.45 : mode === 'etch' ? -0.5 : 0.28
    cell.h = clamp(cell.h + delta, 0, 18)
    rippleRef.current.anchor = { x: gx, y: gy }
    rippleRef.current.strength = Math.min(1.2, rippleRef.current.strength + 0.3)
    sketchRef.current++
  }, [mode, screenToGrid])

  const shuffleBlueprint = useCallback(() => {
    const grid = gridRef.current
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const bias = Math.random() * 0.4 + (y / grid.rows) * 0.9
        grid.cells[y][x].h = clamp(Math.sin((x + y) * 0.4) + bias * 2, 0, 12)
      }
    }
    rippleRef.current.strength = 0.6
    rippleRef.current.anchor = { x: Math.floor(grid.cols / 2), y: Math.floor(grid.rows / 3) }
    setMessage('∴ blueprints shuffled • strange transepts emerge ∴')
  }, [])

  const flatten = useCallback(() => {
    const grid = gridRef.current
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        grid.cells[y][x].h = 0
      }
    }
    rippleRef.current.strength = 0
    sketchRef.current = 0
    setMessage('∴ foundation cleared • empty nave hums ∴')
  }, [])

  const toggleFlow = useCallback(() => {
    setIsEvolving(prev => !prev)
    setMessage(prev => prev.includes('paused')
      ? '∴ flow resumed • masonry breathes again ∴'
      : '∴ evolution paused • frozen scaffolding ∴'
    )
  }, [])

  const handleModeChange = useCallback((next) => {
    setMode(next)
    const whispers = {
      build: '∴ raise spires with each drag ∴',
      etch: '∴ etch trenches • carve nave shadows ∴',
      resonate: '∴ let harmonics bend the stone ∴'
    }
    setMessage(whispers[next] || '∴ drafting ∴')
  }, [])

  const anchorResonance = useCallback(() => {
    const grid = gridRef.current
    rippleRef.current.anchor = {
      x: Math.floor(Math.random() * grid.cols),
      y: Math.floor(Math.random() * grid.rows)
    }
    rippleRef.current.strength = 1.1
    setMessage('∴ cathedral hum // resonance spiral awakened ∴')
  }, [])

  useEffect(() => {
    initializeGrid()
  }, [initializeGrid])

  const evolveGrid = useCallback(() => {
    const grid = gridRef.current
    if (!grid.cells.length) return

    const temp = []
    for (let y = 0; y < grid.rows; y++) {
      temp[y] = []
      for (let x = 0; x < grid.cols; x++) {
        const cell = grid.cells[y][x]
        let neighbors = 0
        let sum = 0
        const offsets = [
          [1, 0], [-1, 0], [0, 1], [0, -1],
          [1, 1], [-1, -1]
        ]
        for (const [dx, dy] of offsets) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= grid.cols || ny >= grid.rows) continue
          neighbors++
          sum += grid.cells[ny][nx].h
        }

        const average = neighbors ? sum / neighbors : cell.h
        let nextHeight = cell.h + (average - cell.h) * 0.08

        if (mode === 'resonate') {
          const anchor = rippleRef.current.anchor || { x: grid.cols / 2, y: grid.rows / 2 }
          const dist = Math.hypot(x - anchor.x, y - anchor.y)
          const wave = Math.sin(dist * 0.7 - timeRef.current * 0.08)
          nextHeight += wave * (0.12 + rippleRef.current.strength * 0.18)
        }

        if (sketchRef.current > 6) {
          const brush = Math.sin(timeRef.current * 0.03 + (x + y) * 0.4) * 0.02
          nextHeight += brush
        }

        temp[y][x] = clamp(nextHeight, 0, 18)
      }
    }

    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        grid.cells[y][x].h = temp[y][x]
      }
    }
    rippleRef.current.strength = Math.max(0, rippleRef.current.strength - 0.012)
  }, [mode])

  const drawTile = useCallback((x, y, h) => {
    if (!ctx) return
    const { tileW, tileH, heightScale } = configRef.current
    const w2 = tileW / 2
    const h2 = tileH / 2
    const z = h * heightScale

    const top = { x, y: y - z }
    const right = { x: x + w2, y: y + h2 - z }
    const bottom = { x, y: y + tileH - z }
    const left = { x: x - w2, y: y + h2 - z }

    const groundRight = { x: x + w2, y: y + h2 }
    const groundLeft = { x: x - w2, y: y + h2 }
    const groundBottom = { x, y: y + tileH }

    const hue = 150 + h * 2
    const topColor = `hsl(${hue}, 55%, ${52 + h * 1.8}%)`
    const leftColor = `hsl(${hue - 10}, 45%, ${32 + h * 1.2}%)`
    const rightColor = `hsl(${hue + 18}, 50%, ${38 + h * 1.4}%)`

    ctx.beginPath()
    ctx.moveTo(top.x, top.y)
    ctx.lineTo(right.x, right.y)
    ctx.lineTo(bottom.x, bottom.y)
    ctx.lineTo(left.x, left.y)
    ctx.closePath()
    ctx.fillStyle = topColor
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(top.x, top.y)
    ctx.lineTo(left.x, left.y)
    ctx.lineTo(groundLeft.x, groundLeft.y)
    ctx.lineTo(top.x, y)
    ctx.closePath()
    ctx.fillStyle = leftColor
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(top.x, top.y)
    ctx.lineTo(right.x, right.y)
    ctx.lineTo(groundRight.x, groundRight.y)
    ctx.lineTo(top.x, y)
    ctx.closePath()
    ctx.fillStyle = rightColor
    ctx.fill()

    ctx.strokeStyle = 'rgba(0, 20, 12, 0.25)'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(left.x, left.y)
    ctx.lineTo(top.x, top.y)
    ctx.lineTo(right.x, right.y)
    ctx.stroke()

    if (h > 9) {
      ctx.strokeStyle = 'rgba(255, 255, 200, 0.7)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(top.x, top.y - 6)
      ctx.lineTo(top.x, top.y - 12)
      ctx.stroke()
    }
  }, [ctx])

  const drawScene = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    const grid = gridRef.current
    const { tileW, tileH, originX, originY } = configRef.current

    ctx.fillStyle = 'rgba(1, 6, 10, 0.1)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const layers = grid.cols + grid.rows
    for (let layer = 0; layer < layers; layer++) {
      for (let x = 0; x < grid.cols; x++) {
        const y = layer - x
        if (y < 0 || y >= grid.rows) continue
        const cell = grid.cells[y][x]
        const px = originX + (x - y) * (tileW / 2)
        const py = originY + (x + y) * (tileH / 2)
        drawTile(px, py, cell.h)
      }
    }

    if (rippleRef.current.anchor) {
      const { x, y } = rippleRef.current.anchor
      const px = originX + (x - y) * (tileW / 2)
      const py = originY + (x + y) * (tileH / 2) - 6
      ctx.strokeStyle = 'rgba(120, 255, 210, 0.5)'
      ctx.setLineDash([6, 6])
      ctx.beginPath()
      ctx.arc(px, py, 12 + rippleRef.current.strength * 18, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }, [ctx, dimensions.height, dimensions.width, drawTile])

  const updateMetrics = useCallback(() => {
    const grid = gridRef.current
    let total = 0
    let spires = 0
    let rough = 0
    let count = grid.cols * grid.rows || 1

    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const h = grid.cells[y][x].h
        total += h
        if (h > 8) spires++

        const right = x + 1 < grid.cols ? grid.cells[y][x + 1].h : h
        const down = y + 1 < grid.rows ? grid.cells[y + 1][x].h : h
        rough += Math.abs(h - right) + Math.abs(h - down)
      }
    }

    const avg = total / count
    const roughness = rough / (count * 2)
    setStats({ avg: avg.toFixed(1), spires, roughness: roughness.toFixed(2) })
  }, [])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    timeRef.current++

    if (mouse.isDown && mouse.isInBounds) {
      const pos = mouse.positionRef.current
      applyBrush(pos.x, pos.y)
    }

    if (isEvolving) {
      evolveGrid()
    }

    if (timeRef.current % 8 === 0) {
      updateMetrics()
    }

    drawScene()
  }, [applyBrush, drawScene, dimensions.width, evolveGrid, isEvolving, mouse.isDown, mouse.isInBounds, mouse.positionRef, ctx, updateMetrics])

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
    if (!canvas) return

    const handleDblClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const { gx, gy } = screenToGrid(x, y)
      if (gx < 0 || gy < 0 || gx >= gridRef.current.cols || gy >= gridRef.current.rows) return
      rippleRef.current.anchor = { x: gx, y: gy }
      rippleRef.current.strength = 1
      setMessage('∴ new choir loft marked • resonance anchored ∴')
    }

    canvas.addEventListener('dblclick', handleDblClick)
    return () => canvas.removeEventListener('dblclick', handleDblClick)
  }, [canvasRef, screenToGrid])

  const metrics = useMemo(() => ([
    { label: 'mode', value: mode },
    { label: 'avg.height', value: stats.avg },
    { label: 'spires', value: stats.spires },
    { label: 'roughness', value: stats.roughness }
  ]), [mode, stats])

  const controls = [
    {
      id: 'flow',
      label: isEvolving ? 'pause.flow()' : 'resume.flow()',
      onClick: toggleFlow,
      active: isEvolving
    },
    {
      id: 'resonate',
      label: 'anchor.resonance()',
      onClick: anchorResonance
    },
    {
      id: 'blueprint',
      label: 'shuffle.blueprint()',
      onClick: shuffleBlueprint
    },
    {
      id: 'flatten',
      label: 'flatten()',
      onClick: flatten,
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
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="isometric-cathedral-canvas"
        />
      </div>
    </div>
  )
}

export default IsometricCathedral
