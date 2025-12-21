import { useState, useEffect, useRef, useCallback } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const CELL = 7
const MAX_WALKERS = 420

const MODES = [
  { id: 'crystal', label: 'view.crystal()' },
  { id: 'heat', label: 'view.heat()' },
  { id: 'echo', label: 'view.echoes()' }
]

const CrystalForge = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('crystal')
  const [running, setRunning] = useState(true)
  const [flux, setFlux] = useState(3)
  const [message, setMessage] = useState('∴ crystalline seeds await random walkers ∴')
  const [metrics, setMetrics] = useState([
    { label: 'phase', value: 'forging' },
    { label: 'crystals', value: 1 },
    { label: 'walkers', value: 0 },
    { label: 'flux', value: flux }
  ])

  const gridRef = useRef({
    cells: null,
    heat: null,
    cols: 0,
    rows: 0,
    filled: 0
  })
  const walkersRef = useRef([])
  const anchorsRef = useRef(new Set())
  const generationRef = useRef(1)
  const frameRef = useRef(0)

  const index = useCallback((x, y) => y * gridRef.current.cols + x, [])

  const initForge = useCallback(() => {
    const cols = Math.max(16, Math.floor(dimensions.width / CELL))
    const rows = Math.max(12, Math.floor(dimensions.height / CELL))
    const size = cols * rows

    const cells = new Uint16Array(size)
    const heat = new Float32Array(size)

    const cx = Math.floor(cols / 2)
    const cy = Math.floor(rows / 2)
    const coreIndex = cy * cols + cx
    cells[coreIndex] = generationRef.current
    heat[coreIndex] = 1
    anchorsRef.current = new Set([coreIndex])

    gridRef.current = {
      cells,
      heat,
      cols,
      rows,
      filled: 1
    }

    walkersRef.current = []
    generationRef.current = 2
    frameRef.current = 0

    setMetrics([
      { label: 'phase', value: running ? 'forging' : 'paused' },
      { label: 'crystals', value: 1 },
      { label: 'walkers', value: 0 },
      { label: 'flux', value: flux }
    ])
    setMessage('∴ forge reset • single core glowing at center ∴')
  }, [dimensions.height, dimensions.width, flux, running])

  const spawnWalker = useCallback(() => {
    const { cols, rows } = gridRef.current
    const edge = Math.floor(Math.random() * 4)
    let x = 0
    let y = 0

    if (edge === 0) {
      x = Math.floor(Math.random() * cols)
      y = 0
    } else if (edge === 1) {
      x = cols - 1
      y = Math.floor(Math.random() * rows)
    } else if (edge === 2) {
      x = Math.floor(Math.random() * cols)
      y = rows - 1
    } else {
      x = 0
      y = Math.floor(Math.random() * rows)
    }

    walkersRef.current.push({ x, y, age: 0 })
  }, [])

  const seedCrystal = useCallback((gx, gy, anchored = false) => {
    const { cols, rows, cells, heat } = gridRef.current
    if (!cells) return
    if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return
    const idx = index(gx, gy)
    if (cells[idx] > 0) return
    cells[idx] = generationRef.current++
    heat[idx] = 1
    gridRef.current.filled += 1
    if (anchored) anchorsRef.current.add(idx)
  }, [index])

  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
    const gx = Math.floor((clientX - rect.left) / CELL)
    const gy = Math.floor((clientY - rect.top) / CELL)

    seedCrystal(gx, gy, true)
    setMessage('∴ manual shard planted // anchor locked ∴')
  }, [canvasRef, seedCrystal])

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

  const adjacentOccupied = useCallback((x, y) => {
    const { cols, rows, cells } = gridRef.current
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (ox === 0 && oy === 0) continue
        const nx = x + ox
        const ny = y + oy
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
        if (cells[index(nx, ny)] > 0) return true
      }
    }
    return false
  }, [index])

  const stepWalkers = useCallback(() => {
    if (!gridRef.current.cells) return
    const { cols, rows, cells, heat } = gridRef.current
    const next = []

    const release = Math.min(flux, MAX_WALKERS - walkersRef.current.length)
    for (let i = 0; i < release; i++) spawnWalker()

    for (let i = 0; i < walkersRef.current.length; i++) {
      const walker = walkersRef.current[i]
      const dir = Math.floor(Math.random() * 4)
      if (dir === 0) walker.x += 1
      else if (dir === 1) walker.x -= 1
      else if (dir === 2) walker.y += 1
      else walker.y -= 1

      if (walker.x < 0) walker.x = 0
      if (walker.y < 0) walker.y = 0
      if (walker.x >= cols) walker.x = cols - 1
      if (walker.y >= rows) walker.y = rows - 1

      walker.age += 1
      const idx = index(walker.x, walker.y)
      heat[idx] = Math.min(1, heat[idx] + 0.18)

      if (cells[idx] > 0) {
        heat[idx] = 1
        continue
      }

      if (adjacentOccupied(walker.x, walker.y)) {
        cells[idx] = generationRef.current++
        heat[idx] = 1
        gridRef.current.filled += 1
        continue
      }

      if (walker.age < 400) {
        next.push(walker)
      }
    }

    walkersRef.current = next
  }, [adjacentOccupied, flux, index, spawnWalker])

  const annealForge = useCallback(() => {
    const { cells, heat, cols, rows } = gridRef.current
    let trimmed = 0

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = index(x, y)
        if (cells[idx] === 0) continue
        if (anchorsRef.current.has(idx)) continue

        let neighbors = 0
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            if (ox === 0 && oy === 0) continue
            const nx = x + ox
            const ny = y + oy
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
            if (cells[index(nx, ny)] > 0) neighbors++
          }
        }

        if (neighbors <= 1 && Math.random() < 0.65) {
          cells[idx] = 0
          heat[idx] = 0
          gridRef.current.filled -= 1
          trimmed++
        }
      }
    }

    setMessage(`∴ anneal pass • shaved ${trimmed} brittle shards ∴`)
  }, [index])

  const quench = useCallback(() => {
    setRunning(prev => {
      const next = !prev
      setMessage(next ? '∴ forge reignited • walkers released ∴' : '∴ flux halted • growth paused ∴')
      setMetrics(prevMetrics => [
        { label: 'phase', value: next ? 'forging' : 'paused' },
        prevMetrics[1],
        prevMetrics[2],
        { label: 'flux', value: flux }
      ])
      return next
    })
  }, [flux])

  const shiftFlux = useCallback(() => {
    setFlux(prev => {
      const next = prev >= 6 ? 1 : prev + 1
      setMetrics(prevMetrics => [
        prevMetrics[0],
        prevMetrics[1],
        prevMetrics[2],
        { label: 'flux', value: next }
      ])
      setMessage(`∴ flux tuned to ${next} walkers/frame ∴`)
      return next
    })
  }, [running])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    if (!gridRef.current.cells) return
    frameRef.current++

    if (running) stepWalkers()

    const { cells, heat, cols, rows } = gridRef.current

    ctx.fillStyle = 'rgba(0, 4, 12, 0.18)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x
        heat[idx] *= 0.985

        const val = cells[idx]
        if (val === 0 && mode !== 'heat') continue

        const px = x * CELL
        const py = y * CELL

        if (val > 0) {
          if (mode === 'crystal') {
            const hue = 160 + (val % 90)
            const light = 45 + (val % 20)
            ctx.fillStyle = `hsla(${hue}, 80%, ${light}%, 0.8)`
          } else if (mode === 'heat') {
            const temp = heat[idx]
            const hue = 40 + temp * 180
            const light = 35 + temp * 35
            ctx.fillStyle = `hsla(${hue}, 90%, ${light}%, ${0.2 + temp * 0.6})`
          } else {
            const hue = 280 + (val % 60)
            ctx.fillStyle = `hsla(${hue}, 70%, 70%, 0.7)`
          }
          ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2)
        } else if (mode === 'heat' && heat[idx] > 0.08) {
          const temp = heat[idx]
          ctx.fillStyle = `rgba(255, 160, 120, ${temp * 0.4})`
          ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4)
        }
      }
    }

    ctx.fillStyle = mode === 'heat' ? 'rgba(255, 240, 200, 0.6)' : 'rgba(255, 255, 255, 0.7)'
    walkersRef.current.forEach(w => {
      ctx.fillRect(w.x * CELL + 2, w.y * CELL + 2, CELL - 4, CELL - 4)
    })

    if (mouse.isInBounds) {
      const gx = Math.floor(mouse.position.x / CELL)
      const gy = Math.floor(mouse.position.y / CELL)
      ctx.strokeStyle = 'rgba(102, 255, 204, 0.5)'
      ctx.lineWidth = 1
      ctx.strokeRect(gx * CELL + 0.5, gy * CELL + 0.5, CELL - 1, CELL - 1)
    }

    if (frameRef.current % 12 === 0) {
      setMetrics([
        { label: 'phase', value: running ? 'forging' : 'paused' },
        { label: 'crystals', value: gridRef.current.filled },
        { label: 'walkers', value: walkersRef.current.length },
        { label: 'flux', value: flux }
      ])
    }
  }, [ctx, dimensions.height, dimensions.width, flux, mode, mouse.isInBounds, mouse.position, running, stepWalkers])

  useEffect(() => {
    if (dimensions.width === 0) return
    initForge()
  }, [dimensions.width, dimensions.height, initForge])

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
      id: 'ignite',
      label: running ? 'pause.forge()' : 'ignite.forge()',
      onClick: quench,
      active: running
    },
    {
      id: 'flux',
      label: `flux.${flux}x()`,
      onClick: shiftFlux
    },
    {
      id: 'anneal',
      label: 'anneal()',
      onClick: annealForge
    },
    {
      id: 'reset',
      label: 'reset.forge()',
      onClick: initForge,
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
          data-testid="crystal-forge-canvas"
        />
      </div>
    </div>
  )
}

export default CrystalForge
