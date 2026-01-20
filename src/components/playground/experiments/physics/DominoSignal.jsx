import { useState, useEffect, useRef, useCallback } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const CELL = 14
const FALL_FRAMES = 18
const REWIND_FRAMES = 12

const MODES = [
  { id: 'topology', label: 'view.topology()' },
  { id: 'timeline', label: 'view.timeline()' },
  { id: 'echo', label: 'view.echoes()' }
]

const DominoSignal = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('topology')
  const [tool, setTool] = useState('ink')
  const [sourceArmed, setSourceArmed] = useState(false)
  const [message, setMessage] = useState('∴ domino chords awaiting ignition ∴')
  const [metrics, setMetrics] = useState([
    { label: 'phase', value: 'idle' },
    { label: 'dominoes', value: 0 },
    { label: 'wave', value: 0 },
    { label: 'echo', value: '0%' }
  ])

  const gridRef = useRef({ cells: [], cols: 0, rows: 0 })
  const startRef = useRef({ x: 0, y: 0 })
  const phaseRef = useRef('idle')
  const frameRef = useRef(0)
  const statsRef = useRef({ dominoes: 0, falling: 0, fallen: 0, waves: 0 })
  const paintMemoRef = useRef({ x: -1, y: -1 })

  const updateMessage = useCallback((text) => {
    setMessage(text)
  }, [])

  const initGrid = useCallback(() => {
    const cols = Math.max(8, Math.floor(dimensions.width / CELL))
    const rows = Math.max(6, Math.floor(dimensions.height / CELL))
    const cells = []

    for (let y = 0; y < rows; y++) {
      const row = []
      for (let x = 0; x < cols; x++) {
        row.push({ state: 'empty', age: 0, tilt: Math.random() * Math.PI * 2, progress: 0 })
      }
      cells.push(row)
    }

    gridRef.current = { cells, cols, rows }
    startRef.current = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) }
    phaseRef.current = 'idle'
    statsRef.current = { dominoes: 0, falling: 0, fallen: 0, waves: 0 }
    setMetrics([
      { label: 'phase', value: 'idle' },
      { label: 'dominoes', value: 0 },
      { label: 'wave', value: 0 },
      { label: 'echo', value: '0%' }
    ])
    updateMessage('∴ blank grid // ready for purrposed chains ∴')
  }, [dimensions.width, dimensions.height, updateMessage])

  const paintCell = useCallback((px, py) => {
    const grid = gridRef.current
    const gx = Math.floor(px / CELL)
    const gy = Math.floor(py / CELL)
    if (gx < 0 || gy < 0 || gx >= grid.cols || gy >= grid.rows) return

    if (sourceArmed) {
      startRef.current = { x: gx, y: gy }
      setSourceArmed(false)
      updateMessage('∴ source portal anchored • ignite() to cascade ∴')
      return
    }

    if (phaseRef.current !== 'idle') return

    const cell = grid.cells[gy][gx]
    if (tool === 'ink') {
      cell.state = 'standing'
      cell.age = 0
      cell.progress = 0
      if (paintMemoRef.current.x >= 0) {
        const dx = gx - paintMemoRef.current.x
        const dy = gy - paintMemoRef.current.y
        if (dx !== 0 || dy !== 0) {
          cell.tilt = Math.atan2(dy, dx)
        }
      }
      paintMemoRef.current = { x: gx, y: gy }
    } else {
      cell.state = 'empty'
      cell.age = 0
      cell.progress = 0
    }
  }, [sourceArmed, tool, updateMessage])

  const handleRandomize = useCallback(() => {
    const grid = gridRef.current
    const start = startRef.current
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const cell = grid.cells[y][x]
        // Higher density (48%) for more chain reactions
        if (Math.random() < 0.48) {
          cell.state = 'standing'
          cell.tilt = Math.random() * Math.PI * 2
        } else {
          cell.state = 'empty'
        }
        cell.age = 0
        cell.progress = 0
      }
    }
    // Always ensure ignition portal has a domino
    const portalCell = grid.cells[start.y][start.x]
    portalCell.state = 'standing'
    portalCell.tilt = Math.random() * Math.PI * 2
    portalCell.age = 0
    portalCell.progress = 0

    phaseRef.current = 'idle'
    statsRef.current = { dominoes: 0, falling: 0, fallen: 0, waves: 0 }
    updateMessage('∴ stochastic tiling laid down ∴')
  }, [updateMessage])

  const handleClear = useCallback(() => {
    const grid = gridRef.current
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        grid.cells[y][x].state = 'empty'
        grid.cells[y][x].age = 0
        grid.cells[y][x].progress = 0
      }
    }
    statsRef.current = { dominoes: 0, falling: 0, fallen: 0, waves: 0 }
    phaseRef.current = 'idle'
    updateMessage('∴ silence restored • empty corridors hum softly ∴')
  }, [updateMessage])

  const handleToolSwap = useCallback(() => {
    setTool(prev => (prev === 'ink' ? 'erase' : 'ink'))
    updateMessage('∴ paw toggles between lay() and erase() ∴')
  }, [updateMessage])

  const handleSourceArm = useCallback(() => {
    setSourceArmed(true)
    updateMessage('∴ next click sets ignition portal ∴')
  }, [updateMessage])

  const handleIgnite = useCallback(() => {
    const grid = gridRef.current
    const { x, y } = startRef.current
    if (!grid.cells.length) return
    const startCell = grid.cells[y][x]
    if (startCell.state === 'empty') {
      updateMessage('∴ no domino at portal • lay one first ∴')
      return
    }

    for (let row of grid.cells) {
      for (let cell of row) {
        if (cell.state !== 'empty') {
          cell.state = 'standing'
          cell.age = 0
          cell.progress = 0
        }
      }
    }

    startCell.state = 'falling'
    startCell.progress = 0
    statsRef.current.waves = 1
    phaseRef.current = 'igniting'
    updateMessage('∴ domino hymn ignited • cascade begins ∴')
  }, [updateMessage])

  const handleRewind = useCallback(() => {
    if (phaseRef.current === 'rewinding') return
    const grid = gridRef.current
    let hasFallen = false
    for (let row of grid.cells) {
      for (let cell of row) {
        if (cell.state === 'fallen' || cell.state === 'falling') {
          hasFallen = true
          break
        }
      }
      if (hasFallen) break
    }
    if (!hasFallen) {
      updateMessage('∴ nothing to rewind • ignite first ∴')
      return
    }
    phaseRef.current = 'rewinding'
    updateMessage('∴ timeline rewinds • toppled chorus stands anew ∴')
  }, [updateMessage])

  const updateChain = useCallback(() => {
    const grid = gridRef.current
    let dominoes = 0
    let falling = 0
    let fallen = 0
    let wavesAdded = 0

    const tryPropagate = (cx, cy) => {
      // 8-directional propagation for better chain reactions
      const dirs = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
        { x: 1, y: -1 },
        { x: -1, y: -1 }
      ]
      for (const dir of dirs) {
        const nx = cx + dir.x
        const ny = cy + dir.y
        if (nx < 0 || ny < 0 || nx >= grid.cols || ny >= grid.rows) continue
        const neighbor = grid.cells[ny][nx]
        if (neighbor.state === 'standing') {
          neighbor.state = 'falling'
          neighbor.progress = 0
          wavesAdded++
        }
      }
    }

    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const cell = grid.cells[y][x]
        if (cell.state === 'empty') continue
        dominoes++
        cell.age++

        if (phaseRef.current === 'rewinding') {
          if (cell.state === 'fallen' || cell.state === 'falling') {
            cell.progress++
            if (cell.progress >= REWIND_FRAMES) {
              cell.state = 'standing'
              cell.progress = 0
            }
          }
          continue
        }

        if (cell.state === 'falling') {
          falling++
          cell.progress++
          if (cell.progress >= FALL_FRAMES) {
            cell.state = 'fallen'
            cell.progress = 0
            tryPropagate(x, y)
          }
        } else if (cell.state === 'fallen') {
          fallen++
        }
      }
    }

    statsRef.current.dominoes = dominoes
    statsRef.current.falling = falling
    statsRef.current.fallen = fallen
    statsRef.current.waves += wavesAdded

    if (phaseRef.current === 'igniting' && falling === 0) {
      phaseRef.current = 'idle'
      updateMessage('∴ cascade settled • echoes linger in code corridors ∴')
    }

    if (phaseRef.current === 'rewinding') {
      let anyStillRewinding = false
      for (let y = 0; y < grid.rows; y++) {
        for (let x = 0; x < grid.cols; x++) {
          const cell = grid.cells[y][x]
          if (cell.state === 'falling' || cell.state === 'fallen') {
            anyStillRewinding = true
            break
          }
        }
        if (anyStillRewinding) break
      }
      if (!anyStillRewinding) {
        phaseRef.current = 'idle'
        updateMessage('∴ rewind complete • standing choir ready ∴')
      }
    }
  }, [updateMessage])

  const drawGrid = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    const grid = gridRef.current
    ctx.fillStyle = 'rgba(2, 4, 8, 0.9)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    ctx.strokeStyle = 'rgba(102, 255, 204, 0.05)'
    ctx.lineWidth = 1
    for (let x = 0; x <= grid.cols; x++) {
      const px = x * CELL
      ctx.beginPath()
      ctx.moveTo(px, 0)
      ctx.lineTo(px, dimensions.height)
      ctx.stroke()
    }
    for (let y = 0; y <= grid.rows; y++) {
      const py = y * CELL
      ctx.beginPath()
      ctx.moveTo(0, py)
      ctx.lineTo(dimensions.width, py)
      ctx.stroke()
    }

    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const cell = grid.cells[y][x]
        if (cell.state === 'empty') continue
        const px = x * CELL
        const py = y * CELL
        const centerX = px + CELL / 2
        const centerY = py + CELL / 2

        let alpha = 0.5
        let hue = 170
        let light = 45

        if (cell.state === 'standing') {
          alpha = 0.25 + Math.sin((cell.age + x + y) * 0.08) * 0.1
          hue = 150 + (cell.age % 60) * 0.4
        } else if (cell.state === 'falling') {
          const t = Math.min(1, cell.progress / FALL_FRAMES)
          alpha = 0.6 + t * 0.3
          hue = 40 + t * 60
          light = 60 + t * 15
        } else if (cell.state === 'fallen') {
          alpha = 0.35
          hue = 320 + (cell.age % 80) * 0.5
          light = 55
        }

        if (mode === 'timeline') {
          const decay = Math.max(0.2, 1 - cell.age / 200)
          alpha *= decay
          light += (1 - decay) * 20
        }

        if (mode === 'echo' && cell.state === 'fallen') {
          const pulse = 0.2 + 0.2 * Math.sin((frameRef.current + x + y) * 0.12)
          alpha += pulse
        }

        ctx.fillStyle = `hsla(${hue}, 80%, ${light}%, ${alpha})`
        ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2)

        if (cell.state !== 'empty') {
          ctx.save()
          ctx.translate(centerX, centerY)
          ctx.rotate(cell.tilt)
          ctx.strokeStyle = cell.state === 'falling'
            ? 'rgba(255, 221, 120, 0.9)'
            : 'rgba(102, 255, 204, 0.5)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(-CELL * 0.25, 0)
          ctx.lineTo(CELL * 0.25, 0)
          ctx.stroke()
          ctx.restore()
        }
      }
    }

    const start = startRef.current
    ctx.strokeStyle = sourceArmed ? 'rgba(255, 170, 90, 0.9)' : 'rgba(255, 255, 160, 0.9)'
    ctx.lineWidth = 2
    ctx.strokeRect(start.x * CELL + 2, start.y * CELL + 2, CELL - 4, CELL - 4)
    ctx.beginPath()
    ctx.moveTo(start.x * CELL + CELL / 2, start.y * CELL + 3)
    ctx.lineTo(start.x * CELL + CELL / 2, start.y * CELL + CELL - 3)
    ctx.moveTo(start.x * CELL + 3, start.y * CELL + CELL / 2)
    ctx.lineTo(start.x * CELL + CELL - 3, start.y * CELL + CELL / 2)
    ctx.stroke()
  }, [ctx, dimensions.height, dimensions.width, mode, sourceArmed])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    frameRef.current++

    if (mouse.isDown && mouse.isInBounds && phaseRef.current === 'idle') {
      paintCell(mouse.positionRef.current.x, mouse.positionRef.current.y)
    } else {
      paintMemoRef.current = { x: -1, y: -1 }
    }

    updateChain()
    drawGrid()

    if (frameRef.current % 12 === 0) {
      const { dominoes, falling, fallen, waves } = statsRef.current
      const echo = dominoes === 0 ? 0 : Math.round((fallen / dominoes) * 100)
      setMetrics([
        { label: 'phase', value: phaseRef.current },
        { label: 'dominoes', value: dominoes },
        { label: 'wave', value: waves },
        { label: 'echo', value: `${echo}%` }
      ])
    }
  }, [ctx, dimensions.width, drawGrid, mouse.isDown, mouse.isInBounds, paintCell, updateChain])

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
      id: 'ignite',
      label: 'ignite()',
      onClick: handleIgnite
    },
    {
      id: 'rewind',
      label: 'rewind()',
      onClick: handleRewind
    },
    {
      id: 'tool',
      label: tool === 'ink' ? 'tool.erase()' : 'tool.ink()',
      onClick: handleToolSwap
    },
    {
      id: 'portal',
      label: sourceArmed ? 'portal.waiting()' : 'portal.arm()',
      onClick: handleSourceArm
    },
    {
      id: 'randomize',
      label: 'randomize()',
      onClick: handleRandomize
    },
    {
      id: 'clear',
      label: 'clear()',
      onClick: handleClear,
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
          data-testid="domino-canvas"
        />
      </div>
    </div>
  )
}

export default DominoSignal
