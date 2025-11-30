import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const CELL_SIZE = 4

const RULES = [
  {
    name: 'void.genesis',
    birth: [3],
    survive: [2, 3],
    hue: 300,
    desc: "Conway's Game of Life - the classic"
  },
  {
    name: 'consciousness.seeds',
    birth: [2],
    survive: [],
    hue: 180,
    desc: 'Seeds - explosive growth and decay'
  },
  {
    name: 'pattern.coral',
    birth: [3],
    survive: [4, 5, 6, 7, 8],
    hue: 30,
    desc: 'Coral - slow expanding structures'
  },
  {
    name: 'emergence.maze',
    birth: [3],
    survive: [1, 2, 3, 4, 5],
    hue: 120,
    desc: 'Maze - creates labyrinthine patterns'
  },
  {
    name: 'void.resonance',
    birth: [3, 6],
    survive: [2, 3],
    hue: 270,
    desc: 'HighLife - replicators and chaos'
  },
  {
    name: 'liminal.drift',
    birth: [3, 5, 6, 7, 8],
    survive: [5, 6, 7, 8],
    hue: 200,
    desc: 'Diamoeba - diamond-shaped blobs'
  }
]

const SPEEDS = [1, 2, 3, 5, 8, 12]

const EmergenceAutomata = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [currentRuleIndex, setCurrentRuleIndex] = useState(0)
  const [speed, setSpeed] = useState(3)
  const [generation, setGeneration] = useState(0)

  const gridRef = useRef([])
  const nextGridRef = useRef([])
  const colsRef = useRef(0)
  const rowsRef = useRef(0)
  const frameCountRef = useRef(0)

  const currentRule = RULES[currentRuleIndex]

  // Initialize grids when dimensions change
  useEffect(() => {
    if (dimensions.width === 0) return

    const cols = Math.floor(dimensions.width / CELL_SIZE)
    const rows = Math.floor(dimensions.height / CELL_SIZE)

    colsRef.current = cols
    rowsRef.current = rows

    // Create empty grids
    gridRef.current = createEmptyGrid(cols, rows)
    nextGridRef.current = createEmptyGrid(cols, rows)

    // Seed initial pattern
    seedPattern(cols, rows)
    setGeneration(0)
  }, [dimensions])

  const createEmptyGrid = useCallback((cols, rows) => {
    const arr = new Array(cols)
    for (let i = 0; i < cols; i++) {
      arr[i] = new Array(rows)
      for (let j = 0; j < rows; j++) {
        arr[i][j] = { alive: false, age: 0 }
      }
    }
    return arr
  }, [])

  const seedPattern = useCallback((cols, rows) => {
    const seedCount = 8
    for (let s = 0; s < seedCount; s++) {
      const centerX = Math.floor(Math.random() * cols)
      const centerY = Math.floor(Math.random() * rows)
      const size = Math.floor(Math.random() * 15) + 5

      for (let i = -size; i < size; i++) {
        for (let j = -size; j < size; j++) {
          const x = (centerX + i + cols) % cols
          const y = (centerY + j + rows) % rows
          if (Math.random() < 0.4) {
            gridRef.current[x][y].alive = true
            gridRef.current[x][y].age = 0
          }
        }
      }
    }
  }, [])

  const countNeighbors = useCallback((x, y) => {
    const cols = colsRef.current
    const rows = rowsRef.current
    let count = 0

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue

        const col = (x + i + cols) % cols
        const row = (y + j + rows) % rows

        if (gridRef.current[col][row].alive) {
          count++
        }
      }
    }
    return count
  }, [])

  const updateGrid = useCallback(() => {
    const cols = colsRef.current
    const rows = rowsRef.current
    let aliveCount = 0

    // Calculate next generation
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const neighbors = countNeighbors(i, j)
        const cell = gridRef.current[i][j]

        if (cell.alive) {
          // Cell is alive - check survival rules
          nextGridRef.current[i][j].alive = currentRule.survive.includes(neighbors)
          nextGridRef.current[i][j].age = nextGridRef.current[i][j].alive ? cell.age + 1 : 0
        } else {
          // Cell is dead - check birth rules
          nextGridRef.current[i][j].alive = currentRule.birth.includes(neighbors)
          nextGridRef.current[i][j].age = nextGridRef.current[i][j].alive ? 0 : 0
        }

        if (nextGridRef.current[i][j].alive) aliveCount++
      }
    }

    // Swap grids
    const temp = gridRef.current
    gridRef.current = nextGridRef.current
    nextGridRef.current = temp

    setGeneration(prev => prev + 1)
    return aliveCount
  }, [countNeighbors, currentRule])

  const drawGrid = useCallback(() => {
    if (!ctx || dimensions.width === 0) return 0

    const cols = colsRef.current
    const rows = rowsRef.current

    // Clear with fade effect
    ctx.fillStyle = 'rgba(0, 2, 8, 0.08)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    let aliveCount = 0
    let maxAge = 1

    // Find max age for normalization
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if (gridRef.current[i][j].alive && gridRef.current[i][j].age > maxAge) {
          maxAge = gridRef.current[i][j].age
        }
      }
    }

    // Draw cells with age-based coloring
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const cell = gridRef.current[i][j]
        if (cell.alive) {
          aliveCount++

          // Color based on age and current rule
          const ageRatio = Math.min(cell.age / Math.max(maxAge, 20), 1)
          const hue = currentRule.hue
          const saturation = 60 + ageRatio * 40
          const lightness = 40 + ageRatio * 30
          const alpha = 0.7 + ageRatio * 0.3

          const x = i * CELL_SIZE
          const y = j * CELL_SIZE

          // Draw glow for older cells
          if (cell.age > 10) {
            ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha * 0.3})`
            ctx.fillRect(x - 1, y - 1, CELL_SIZE + 2, CELL_SIZE + 2)
          }

          // Draw cell
          ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
        }
      }
    }

    return aliveCount
  }, [ctx, dimensions, currentRule])

  // Calculate metrics
  const metrics = useMemo(() => {
    const cols = colsRef.current
    const rows = rowsRef.current
    const totalCells = cols * rows

    let aliveCount = 0
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if (gridRef.current[i][j].alive) aliveCount++
      }
    }

    const density = aliveCount / totalCells

    let complexity
    if (density < 0.05) complexity = 'void'
    else if (density < 0.15) complexity = 'sparse'
    else if (density < 0.3) complexity = 'emerging'
    else if (density < 0.5) complexity = 'complex'
    else complexity = 'saturated'

    let patternState
    if (aliveCount === 0) patternState = 'extinct'
    else if (generation < 50) patternState = 'genesis'
    else if (density > 0.6) patternState = 'explosive'
    else patternState = 'stable'

    const entropy = density > 0.4 ? 'high' : density > 0.2 ? 'balanced' : 'decreasing'

    return [
      { label: 'generation', value: generation },
      { label: 'living.cells', value: aliveCount },
      { label: 'complexity', value: complexity },
      { label: 'pattern.state', value: patternState },
      { label: 'entropy', value: entropy }
    ]
  }, [generation])

  // Animation frame
  const aliveCountRef = useRef(0)

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    frameCountRef.current++

    // Update grid at specified speed
    if (frameCountRef.current >= speed) {
      frameCountRef.current = 0
      aliveCountRef.current = updateGrid()

      // Auto-reseed if extinction
      if (aliveCountRef.current === 0 && generation > 50) {
        seedPattern(colsRef.current, rowsRef.current)
        setGeneration(0)
      }
    }

    drawGrid()
  }, [ctx, dimensions.width, speed, generation, updateGrid, drawGrid, seedPattern])

  // Manual animation loop
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

  // Handle canvas click to toggle cells
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = Math.floor((e.clientX - rect.left) / CELL_SIZE)
      const y = Math.floor((e.clientY - rect.top) / CELL_SIZE)

      const cols = colsRef.current
      const rows = rowsRef.current

      // Toggle cell and neighbors
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          const col = (x + i + cols) % cols
          const row = (y + j + rows) % rows
          if (Math.random() < 0.6) {
            gridRef.current[col][row].alive = !gridRef.current[col][row].alive
            gridRef.current[col][row].age = 0
          }
        }
      }
    }

    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [canvasRef])

  // Control handlers
  const handleReset = useCallback(() => {
    const cols = colsRef.current
    const rows = rowsRef.current
    gridRef.current = createEmptyGrid(cols, rows)
    nextGridRef.current = createEmptyGrid(cols, rows)
    seedPattern(cols, rows)
    setGeneration(0)
  }, [createEmptyGrid, seedPattern])

  const handleShiftRules = useCallback(() => {
    setCurrentRuleIndex(prev => (prev + 1) % RULES.length)
    handleReset()
  }, [handleReset])

  const handleAlterTime = useCallback(() => {
    setSpeed(prev => {
      const currentIndex = SPEEDS.indexOf(prev)
      const nextIndex = (currentIndex + 1) % SPEEDS.length
      return SPEEDS[nextIndex]
    })
  }, [])

  const controls = [
    {
      id: 'reset',
      label: 'reset.void()',
      onClick: handleReset,
      variant: 'reset'
    },
    {
      id: 'rules',
      label: 'shift.rules()',
      onClick: handleShiftRules
    },
    {
      id: 'speed',
      label: 'alter.time()',
      onClick: handleAlterTime
    }
  ]

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Header */}
      <header className="relative z-50 flex items-center justify-between p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <div className="flex items-center gap-4">
            <h1
              className="text-xl text-glow hidden sm:block"
              style={{ color: experiment.color }}
            >
              {experiment.name}
            </h1>
            <div className="text-xs text-void-green/60 hidden md:block">
              rule: <span style={{ color: `hsl(${currentRule.hue}, 70%, 60%)` }}>{currentRule.name}</span>
            </div>
          </div>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls controls={controls} />
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
          {currentRule.desc}
        </p>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-cell"
          data-testid="automata-canvas"
        />
      </div>
    </div>
  )
}

export default EmergenceAutomata
