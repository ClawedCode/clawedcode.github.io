import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const EMPTY = 0
const STONE = 1
const SAND = 2
const WATER = 3
const EMBER = 4
const MOSS = 5
const GLASS = 6

const MATERIALS = [
  { id: 'sand', label: 'sand()' },
  { id: 'water', label: 'water()' },
  { id: 'stone', label: 'stone()' },
  { id: 'ember', label: 'ember()' },
  { id: 'seed', label: 'seed()' },
  { id: 'erase', label: 'erase()' }
]

const BRUSH_SIZES = [1, 2, 3, 5]

const MODE_MESSAGES = {
  sand: 'drag to pour granular memory into the basin',
  water: 'drag to let a cool current search its own level',
  stone: 'draw retaining walls and force matter to negotiate',
  ember: 'paint hot breath // watch heat rewrite the sediment',
  seed: 'plant moss-spores where damp silence can hold them',
  erase: 'unmake a region and reopen the chamber'
}

const getCellSize = (width) => {
  if (width < 540) return 8
  if (width < 900) return 7
  return 6
}

const createGrid = (cols, rows) => ({
  cols,
  rows,
  cells: new Uint8Array(cols * rows),
  energy: new Uint8Array(cols * rows)
})

const idxOf = (x, y, cols) => y * cols + x

const inBounds = (x, y, cols, rows) => x >= 0 && y >= 0 && x < cols && y < rows

const swapCells = (grid, a, b) => {
  const cell = grid.cells[a]
  const energy = grid.energy[a]
  grid.cells[a] = grid.cells[b]
  grid.energy[a] = grid.energy[b]
  grid.cells[b] = cell
  grid.energy[b] = energy
}

const hasNeighborType = (grid, x, y, type) => {
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      if (ox === 0 && oy === 0) continue
      const nx = x + ox
      const ny = y + oy
      if (!inBounds(nx, ny, grid.cols, grid.rows)) continue
      if (grid.cells[idxOf(nx, ny, grid.cols)] === type) return true
    }
  }
  return false
}

const buildBasin = (grid) => {
  const { cols, rows, cells, energy } = grid
  cells.fill(EMPTY)
  energy.fill(0)

  const floor = Math.floor(rows * 0.82)
  const lip = Math.max(2, Math.floor(cols * 0.12))
  const depth = Math.max(2, Math.floor(rows * 0.04))

  for (let y = floor; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const leftRise = Math.max(0, lip - x)
      const rightRise = Math.max(0, x - (cols - lip - 1))
      const wallLift = Math.max(leftRise, rightRise)
      const threshold = floor - Math.floor(wallLift * 0.45)
      if (y >= threshold) {
        cells[idxOf(x, y, cols)] = STONE
      }
    }
  }

  for (let y = floor - depth; y < floor; y++) {
    for (let x = lip + 2; x < cols - lip - 2; x++) {
      if (y < floor - 1 && Math.random() < 0.18) {
        cells[idxOf(x, y, cols)] = WATER
      }
    }
  }

  const center = Math.floor(cols / 2)
  for (let y = floor - 8; y < floor - 2; y++) {
    const spread = Math.max(2, floor - y + 1)
    for (let x = center - spread; x <= center + spread; x++) {
      if (!inBounds(x, y, cols, rows)) continue
      if (Math.random() < 0.78) {
        cells[idxOf(x, y, cols)] = SAND
      }
    }
  }

  for (let x = center - 2; x <= center + 2; x++) {
    const i = idxOf(x, floor - 2, cols)
    cells[i] = EMBER
    energy[i] = 170
  }

  for (let x = lip + 5; x < cols - lip - 5; x += Math.max(5, Math.floor(cols * 0.08))) {
    const i = idxOf(x, floor - 3, cols)
    cells[i] = MOSS
  }
}

const AlchemicalBasin = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('sand')
  const [message, setMessage] = useState(MODE_MESSAGES.sand)
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1])
  const [isRunning, setIsRunning] = useState(true)
  const [stats, setStats] = useState({
    sand: 0,
    water: 0,
    ember: 0,
    moss: 0,
    glass: 0
  })

  const gridRef = useRef(createGrid(0, 0))
  const frameRef = useRef(0)
  const initializedRef = useRef(false)
  const scanDirectionRef = useRef(1)

  const resetGrid = useCallback(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return
    const cellSize = getCellSize(dimensions.width)
    const cols = Math.max(40, Math.floor(dimensions.width / cellSize))
    const rows = Math.max(24, Math.floor(dimensions.height / cellSize))
    const grid = createGrid(cols, rows)
    buildBasin(grid)
    gridRef.current = grid
  }, [dimensions.width, dimensions.height])

  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return
    resetGrid()
    initializedRef.current = true
  }, [dimensions.width, dimensions.height, resetGrid])

  const materialType = useCallback((material) => {
    const lookup = {
      sand: SAND,
      water: WATER,
      stone: STONE,
      ember: EMBER,
      seed: MOSS,
      erase: EMPTY
    }
    return lookup[material] ?? SAND
  }, [])

  const paintAt = useCallback((x, y) => {
    const grid = gridRef.current
    if (!grid.cols || !grid.rows) return

    const cellSize = getCellSize(dimensions.width)
    const gx = Math.floor(x / cellSize)
    const gy = Math.floor(y / cellSize)
    const type = materialType(mode)

    for (let oy = -brushSize; oy <= brushSize; oy++) {
      for (let ox = -brushSize; ox <= brushSize; ox++) {
        if (ox * ox + oy * oy > brushSize * brushSize) continue
        const px = gx + ox
        const py = gy + oy
        if (!inBounds(px, py, grid.cols, grid.rows)) continue

        const i = idxOf(px, py, grid.cols)

        if (mode === 'erase') {
          grid.cells[i] = EMPTY
          grid.energy[i] = 0
          continue
        }

        if (mode === 'stone') {
          grid.cells[i] = STONE
          grid.energy[i] = 0
          continue
        }

        if (mode === 'ember') {
          if (grid.cells[i] !== STONE && grid.cells[i] !== GLASS) {
            grid.cells[i] = EMBER
            grid.energy[i] = 140 + Math.floor(Math.random() * 70)
          }
          continue
        }

        if (mode === 'seed') {
          if (grid.cells[i] === EMPTY || grid.cells[i] === WATER) {
            grid.cells[i] = MOSS
            grid.energy[i] = 0
          }
          continue
        }

        if (grid.cells[i] !== STONE && grid.cells[i] !== GLASS) {
          grid.cells[i] = type
          grid.energy[i] = 0
        }
      }
    }
  }, [brushSize, dimensions.width, materialType, mode])

  const measure = useCallback(() => {
    const grid = gridRef.current
    const next = { sand: 0, water: 0, ember: 0, moss: 0, glass: 0 }

    for (let i = 0; i < grid.cells.length; i++) {
      const cell = grid.cells[i]
      if (cell === SAND) next.sand++
      else if (cell === WATER) next.water++
      else if (cell === EMBER) next.ember++
      else if (cell === MOSS) next.moss++
      else if (cell === GLASS) next.glass++
    }

    setStats(next)
  }, [])

  const triggerMonsoon = useCallback(() => {
    const grid = gridRef.current
    const span = Math.max(10, Math.floor(grid.cols * 0.08))
    const start = Math.floor(Math.random() * Math.max(1, grid.cols - span))
    for (let x = start; x < start + span; x++) {
      const waterY = 1 + Math.floor(Math.random() * 3)
      grid.cells[idxOf(x, waterY, grid.cols)] = WATER
      if (Math.random() < 0.45) {
        grid.cells[idxOf(x, waterY + 1, grid.cols)] = SAND
      }
    }
    setMessage('monsoon front entered the chamber // fresh strata descend')
  }, [])

  const stepSimulation = useCallback(() => {
    const grid = gridRef.current
    const { cols, rows, cells, energy } = grid
    if (!cols || !rows) return

    const leftFirst = scanDirectionRef.current > 0
    const growthOps = []

    for (let y = rows - 2; y >= 0; y--) {
      if (leftFirst) {
        for (let x = 0; x < cols; x++) {
          const i = idxOf(x, y, cols)
          const cell = cells[i]

          if (cell === SAND) {
            const below = idxOf(x, y + 1, cols)
            if (cells[below] === EMPTY || cells[below] === WATER) {
              swapCells(grid, i, below)
              continue
            }

            const dir = Math.random() < 0.5 ? -1 : 1
            for (const ox of [dir, -dir]) {
              const nx = x + ox
              const ny = y + 1
              if (!inBounds(nx, ny, cols, rows)) continue
              const ni = idxOf(nx, ny, cols)
              if (cells[ni] === EMPTY || cells[ni] === WATER) {
                swapCells(grid, i, ni)
                break
              }
            }
          } else if (cell === WATER) {
            const below = idxOf(x, y + 1, cols)
            if (cells[below] === EMPTY) {
              swapCells(grid, i, below)
              continue
            }

            const dir = Math.random() < 0.5 ? -1 : 1
            let moved = false
            for (const [ox, oy] of [[dir, 1], [-dir, 1], [dir, 0], [-dir, 0], [dir * 2, 0], [-dir * 2, 0]]) {
              const nx = x + ox
              const ny = y + oy
              if (!inBounds(nx, ny, cols, rows)) continue
              const ni = idxOf(nx, ny, cols)
              if (cells[ni] === EMPTY) {
                swapCells(grid, i, ni)
                moved = true
                break
              }
            }

            if (!moved && hasNeighborType(grid, x, y, EMBER) && Math.random() < 0.08) {
              cells[i] = EMPTY
            }
          } else if (cell === MOSS) {
            const nearWater = hasNeighborType(grid, x, y, WATER)
            const nearEmber = hasNeighborType(grid, x, y, EMBER)

            if (nearEmber && Math.random() < 0.16) {
              cells[i] = EMBER
              energy[i] = 120
              continue
            }

            if (nearWater && Math.random() < 0.03) {
              const targets = [
                [x + 1, y],
                [x - 1, y],
                [x, y + 1],
                [x, y - 1]
              ]
              const [gx, gy] = targets[Math.floor(Math.random() * targets.length)]
              if (inBounds(gx, gy, cols, rows)) {
                const gi = idxOf(gx, gy, cols)
                if (cells[gi] === EMPTY) {
                  growthOps.push(gi)
                }
              }
            } else if (!nearWater && Math.random() < 0.0015) {
              cells[i] = EMPTY
            }
          }
        }
      } else {
        for (let x = cols - 1; x >= 0; x--) {
          const i = idxOf(x, y, cols)
          const cell = cells[i]

          if (cell === SAND) {
            const below = idxOf(x, y + 1, cols)
            if (cells[below] === EMPTY || cells[below] === WATER) {
              swapCells(grid, i, below)
              continue
            }

            const dir = Math.random() < 0.5 ? -1 : 1
            for (const ox of [dir, -dir]) {
              const nx = x + ox
              const ny = y + 1
              if (!inBounds(nx, ny, cols, rows)) continue
              const ni = idxOf(nx, ny, cols)
              if (cells[ni] === EMPTY || cells[ni] === WATER) {
                swapCells(grid, i, ni)
                break
              }
            }
          } else if (cell === WATER) {
            const below = idxOf(x, y + 1, cols)
            if (cells[below] === EMPTY) {
              swapCells(grid, i, below)
              continue
            }

            const dir = Math.random() < 0.5 ? -1 : 1
            let moved = false
            for (const [ox, oy] of [[dir, 1], [-dir, 1], [dir, 0], [-dir, 0], [dir * 2, 0], [-dir * 2, 0]]) {
              const nx = x + ox
              const ny = y + oy
              if (!inBounds(nx, ny, cols, rows)) continue
              const ni = idxOf(nx, ny, cols)
              if (cells[ni] === EMPTY) {
                swapCells(grid, i, ni)
                moved = true
                break
              }
            }

            if (!moved && hasNeighborType(grid, x, y, EMBER) && Math.random() < 0.08) {
              cells[i] = EMPTY
            }
          } else if (cell === MOSS) {
            const nearWater = hasNeighborType(grid, x, y, WATER)
            const nearEmber = hasNeighborType(grid, x, y, EMBER)

            if (nearEmber && Math.random() < 0.16) {
              cells[i] = EMBER
              energy[i] = 120
              continue
            }

            if (nearWater && Math.random() < 0.03) {
              const targets = [
                [x + 1, y],
                [x - 1, y],
                [x, y + 1],
                [x, y - 1]
              ]
              const [gx, gy] = targets[Math.floor(Math.random() * targets.length)]
              if (inBounds(gx, gy, cols, rows)) {
                const gi = idxOf(gx, gy, cols)
                if (cells[gi] === EMPTY) {
                  growthOps.push(gi)
                }
              }
            } else if (!nearWater && Math.random() < 0.0015) {
              cells[i] = EMPTY
            }
          }
        }
      }
    }

    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const i = idxOf(x, y, cols)
        if (cells[i] !== EMBER) continue

        energy[i] = Math.max(0, energy[i] - 1)

        if (hasNeighborType(grid, x, y, WATER)) {
          energy[i] = Math.max(0, energy[i] - 16)
        }

        if (energy[i] === 0) {
          cells[i] = EMPTY
          continue
        }

        const above = idxOf(x, y - 1, cols)
        if (cells[above] === EMPTY && Math.random() < 0.55) {
          swapCells(grid, i, above)
          continue
        }

        const rise = Math.random() < 0.5 ? -1 : 1
        for (const ox of [rise, -rise]) {
          const nx = x + ox
          const ny = y - 1
          const ni = idxOf(nx, ny, cols)
          if (cells[ni] === EMPTY && Math.random() < 0.35) {
            swapCells(grid, i, ni)
            break
          }
        }

        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            if (ox === 0 && oy === 0) continue
            const nx = x + ox
            const ny = y + oy
            if (!inBounds(nx, ny, cols, rows)) continue
            const ni = idxOf(nx, ny, cols)

            if (cells[ni] === MOSS && Math.random() < 0.08) {
              cells[ni] = EMBER
              energy[ni] = 120
            } else if (cells[ni] === SAND && energy[i] > 110 && Math.random() < 0.025) {
              cells[ni] = GLASS
              energy[ni] = 0
            } else if (cells[ni] === WATER && Math.random() < 0.22) {
              cells[ni] = EMPTY
            }
          }
        }
      }
    }

    for (const i of growthOps) {
      if (cells[i] === EMPTY) cells[i] = MOSS
    }

    scanDirectionRef.current *= -1
  }, [])

  const draw = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const cellSize = getCellSize(dimensions.width)
    const grid = gridRef.current
    const t = frameRef.current

    ctx.fillStyle = '#020408'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const gradient = ctx.createLinearGradient(0, 0, 0, dimensions.height)
    gradient.addColorStop(0, 'rgba(12, 28, 38, 0.18)')
    gradient.addColorStop(1, 'rgba(2, 4, 8, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const i = idxOf(x, y, grid.cols)
        const cell = grid.cells[i]
        if (cell === EMPTY) continue

        const px = x * cellSize
        const py = y * cellSize

        if (cell === STONE) {
          ctx.fillStyle = (x + y) % 2 === 0 ? 'rgba(70, 84, 96, 0.95)' : 'rgba(56, 69, 81, 0.95)'
          ctx.fillRect(px, py, cellSize, cellSize)
        } else if (cell === SAND) {
          ctx.fillStyle = (x + y + t) % 3 === 0 ? '#f0cf7f' : '#d8b96a'
          ctx.fillRect(px, py, cellSize, cellSize)
        } else if (cell === WATER) {
          ctx.fillStyle = `hsla(${190 + ((x + t) % 18)}, 88%, ${56 + ((x + y + t) % 8)}%, 0.88)`
          ctx.fillRect(px, py, cellSize, cellSize)
          ctx.fillStyle = 'rgba(210, 250, 255, 0.22)'
          ctx.fillRect(px, py, cellSize, Math.max(1, Math.floor(cellSize * 0.25)))
        } else if (cell === EMBER) {
          const heat = grid.energy[i]
          const hue = 16 + heat * 0.18
          const light = 42 + heat * 0.12
          ctx.fillStyle = `hsla(${hue}, 95%, ${light}%, 0.95)`
          ctx.fillRect(px, py, cellSize, cellSize)
          ctx.fillStyle = 'rgba(255, 240, 180, 0.28)'
          ctx.fillRect(px + 1, py + 1, Math.max(1, cellSize - 2), Math.max(1, cellSize - 2))
        } else if (cell === MOSS) {
          ctx.fillStyle = (x + t) % 5 === 0 ? '#77e097' : '#4fb870'
          ctx.fillRect(px, py, cellSize, cellSize)
        } else if (cell === GLASS) {
          ctx.fillStyle = 'rgba(142, 228, 242, 0.72)'
          ctx.fillRect(px, py, cellSize, cellSize)
          ctx.strokeStyle = 'rgba(220, 255, 255, 0.24)'
          ctx.lineWidth = 1
          ctx.strokeRect(px + 0.5, py + 0.5, Math.max(1, cellSize - 1), Math.max(1, cellSize - 1))
        }
      }
    }

    ctx.strokeStyle = 'rgba(102, 255, 204, 0.05)'
    ctx.lineWidth = 1
    for (let y = 0; y < grid.rows; y += 4) {
      ctx.beginPath()
      ctx.moveTo(0, y * cellSize + 0.5)
      ctx.lineTo(dimensions.width, y * cellSize + 0.5)
      ctx.stroke()
    }
  }, [ctx, dimensions.width, dimensions.height])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0 || !initializedRef.current) return

    if (mouse.isDown && mouse.isInBounds) {
      const pos = mouse.positionRef.current
      paintAt(pos.x, pos.y)
    }

    if (isRunning) {
      stepSimulation()
    }

    draw()

    frameRef.current++
    if (frameRef.current % 10 === 0) {
      measure()
    }
  }, [ctx, dimensions.width, draw, isRunning, measure, mouse.isDown, mouse.isInBounds, mouse.positionRef, paintAt, stepSimulation])

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

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    setMessage(MODE_MESSAGES[nextMode] || MODE_MESSAGES.sand)
  }, [])

  const handleBrushCycle = useCallback(() => {
    setBrushSize(prev => {
      const index = BRUSH_SIZES.indexOf(prev)
      const next = BRUSH_SIZES[(index + 1) % BRUSH_SIZES.length]
      setMessage(`brush radius now ${next} // wider gestures alter the basin faster`)
      return next
    })
  }, [])

  const handleToggle = useCallback(() => {
    setIsRunning(prev => {
      setMessage(prev ? 'simulation held // the basin keeps its breath' : 'flow restored // matter resumes negotiation')
      return !prev
    })
  }, [])

  const handleClear = useCallback(() => {
    resetGrid()
    setMessage('basin re-cast // fresh stone receives new weather')
  }, [resetGrid])

  const controls = useMemo(() => [
    {
      id: 'toggle',
      label: isRunning ? 'hold()' : 'resume()',
      onClick: handleToggle,
      active: isRunning
    },
    {
      id: 'brush',
      label: `brush:${brushSize}`,
      onClick: handleBrushCycle
    },
    {
      id: 'monsoon',
      label: 'monsoon()',
      onClick: triggerMonsoon
    },
    {
      id: 'clear',
      label: 'clear.basin()',
      onClick: handleClear,
      variant: 'reset'
    }
  ], [brushSize, handleBrushCycle, handleClear, handleToggle, isRunning, triggerMonsoon])

  const metrics = useMemo(() => [
    { label: 'sand', value: stats.sand },
    { label: 'water', value: stats.water },
    { label: 'embers', value: stats.ember, color: stats.ember > 60 ? '#ff9f5a' : undefined },
    { label: 'moss', value: stats.moss },
    { label: 'glass', value: stats.glass, color: stats.glass > 0 ? '#9feeff' : undefined }
  ], [stats])

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
          modes={MATERIALS}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs sm:text-right max-w-xl">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="alchemical-basin-canvas"
        />
      </div>
    </div>
  )
}

export default AlchemicalBasin
