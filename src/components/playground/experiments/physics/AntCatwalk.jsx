import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const CELL_SIZE = 6
const DIRS = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 }
]

const RULE_PRESETS = [
  {
    id: 'classic',
    label: 'rule.lr()',
    rule: 'LR',
    desc: '∴ classic Langton weave birthing highways after long stillness ∴'
  },
  {
    id: 'cathedral',
    label: 'rule.llrrr()',
    rule: 'LLRRR',
    desc: '∴ alternating bends raise stepped cathedrals of traffic ∴'
  },
  {
    id: 'spiralbound',
    label: 'rule.lrrrll()',
    rule: 'LRRRLL',
    desc: '∴ tight left-right clusters braid vortex lattices ∴'
  },
  {
    id: 'calligraphy',
    label: 'rule.llrlrr()',
    rule: 'LLRLRR',
    desc: '∴ runes oscillate between mirrored flourishes ∴'
  }
]

const MODES = [...RULE_PRESETS, { id: 'custom', label: 'rule.custom()' }]

const AntCatwalk = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState(RULE_PRESETS[0].id)
  const [ruleString, setRuleString] = useState(RULE_PRESETS[0].rule)
  const [trailMode, setTrailMode] = useState('ghost')
  const [message, setMessage] = useState('∴ multi-ant catwalk scribes living circuitry ∴')
  const [readout, setReadout] = useState({
    steps: 0,
    coverage: 0,
    bias: '0.00',
    rule: RULE_PRESETS[0].rule,
    ants: 0
  })

  const gridRef = useRef({
    cells: new Uint8Array(0),
    visitedMask: new Uint8Array(0),
    cols: 0,
    rows: 0,
    visitedCount: 0,
    total: 1
  })
  const paletteRef = useRef([])
  const antsRef = useRef([])
  const ruleRef = useRef(ruleString)
  const stepsRef = useRef(0)
  const frameRef = useRef(0)
  const drawingRef = useRef(false)
  const turnStatsRef = useRef({ left: 1, right: 1, straight: 1, back: 1 })

  const buildPalette = useCallback((rule) => {
    const len = Math.max(1, rule.length)
    const palette = new Array(len)
    for (let i = 0; i < len; i++) {
      const hue = (i / len) * 280 + 60
      const sat = 70 + Math.sin(i * 1.2) * 15
      const light = 28 + (i / len) * 35
      palette[i] = `hsla(${hue % 360}, ${sat}%, ${light}%, 0.9)`
    }
    paletteRef.current = palette
  }, [])

  const spawnAnt = useCallback((x, y) => {
    const grid = gridRef.current
    if (!grid.cols || !grid.rows) return
    const px = typeof x === 'number' ? ((x % grid.cols) + grid.cols) % grid.cols : Math.floor(Math.random() * grid.cols)
    const py = typeof y === 'number' ? ((y % grid.rows) + grid.rows) % grid.rows : Math.floor(Math.random() * grid.rows)
    antsRef.current.push({
      x: px,
      y: py,
      dir: Math.floor(Math.random() * 4),
      colorShift: Math.random() * 360,
      age: 0
    })
  }, [])

  const initializeGrid = useCallback(() => {
    if (!ctx || dimensions.width === 0 || dimensions.height === 0) return
    const cols = Math.floor(dimensions.width / CELL_SIZE)
    const rows = Math.floor(dimensions.height / CELL_SIZE)
    if (!cols || !rows) return

    gridRef.current = {
      cells: new Uint8Array(cols * rows),
      visitedMask: new Uint8Array(cols * rows),
      cols,
      rows,
      visitedCount: 0,
      total: cols * rows
    }
    antsRef.current = []
    stepsRef.current = 0
    turnStatsRef.current = { left: 1, right: 1, straight: 1, back: 1 }

    ctx.fillStyle = 'rgba(1, 4, 10, 1)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const baseAnts = Math.max(2, Math.round((cols * rows) / 9000))
    for (let i = 0; i < baseAnts; i++) {
      spawnAnt(Math.floor(cols / 2) + i, Math.floor(rows / 2) - i)
    }

    setReadout((prev) => ({
      ...prev,
      steps: 0,
      coverage: 0,
      ants: antsRef.current.length,
      rule: ruleRef.current
    }))
  }, [ctx, dimensions.height, dimensions.width, spawnAnt])

  const carvePortal = useCallback((gridX, gridY) => {
    const grid = gridRef.current
    if (!ctx || !grid.cols) return
    const radius = 2
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = Math.hypot(dx, dy)
        if (dist > radius + 0.1) continue
        const nx = (gridX + dx + grid.cols) % grid.cols
        const ny = (gridY + dy + grid.rows) % grid.rows
        const idx = ny * grid.cols + nx
        if (grid.visitedMask[idx]) {
          grid.visitedMask[idx] = 0
          grid.visitedCount = Math.max(0, grid.visitedCount - 1)
        }
        grid.cells[idx] = 0
        ctx.fillStyle = 'rgba(8, 16, 24, 0.9)'
        ctx.fillRect(nx * CELL_SIZE, ny * CELL_SIZE, CELL_SIZE, CELL_SIZE)
      }
    }
  }, [ctx])

  const simulateSteps = useCallback(() => {
    const grid = gridRef.current
    if (!ctx || !grid.cols || antsRef.current.length === 0) return

    const rule = ruleRef.current
    const palette = paletteRef.current
    const ruleLen = Math.max(1, rule.length)
    const ants = antsRef.current
    const baseSteps = Math.max(40, Math.floor((grid.cols * grid.rows) / 7000))
    const stepsPerFrame = Math.min(260, baseSteps + ants.length * 8)

    for (let step = 0; step < stepsPerFrame; step++) {
      for (const ant of ants) {
        const idx = ant.y * grid.cols + ant.x
        const state = grid.cells[idx]
        const instruction = rule[state] || rule[0] || 'L'

        if (instruction === 'L') {
          ant.dir = (ant.dir + 3) % 4
          turnStatsRef.current.left++
        } else if (instruction === 'R') {
          ant.dir = (ant.dir + 1) % 4
          turnStatsRef.current.right++
        } else if (instruction === 'B') {
          ant.dir = (ant.dir + 2) % 4
          turnStatsRef.current.back++
        } else {
          turnStatsRef.current.straight++
        }

        const nextState = (state + 1) % ruleLen
        grid.cells[idx] = nextState
        if (!grid.visitedMask[idx]) {
          grid.visitedMask[idx] = 1
          grid.visitedCount += 1
        }

        ctx.fillStyle = palette[nextState] || palette[0] || '#66ffcc'
        ctx.fillRect(ant.x * CELL_SIZE, ant.y * CELL_SIZE, CELL_SIZE, CELL_SIZE)

        const dir = DIRS[ant.dir]
        ant.x = (ant.x + dir.x + grid.cols) % grid.cols
        ant.y = (ant.y + dir.y + grid.rows) % grid.rows
        ant.age += 1
      }
      stepsRef.current += 1
    }
  }, [ctx])

  useEffect(() => {
    ruleRef.current = ruleString
    buildPalette(ruleString)
    initializeGrid()
  }, [ruleString, buildPalette, initializeGrid])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    frameRef.current++

    const fade = trailMode === 'ghost' ? 0.05 : 0.15
    ctx.fillStyle = `rgba(0, 5, 10, ${fade})`
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    simulateSteps()

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const ant of antsRef.current) {
      const hue = (ant.colorShift + ant.age * 0.6) % 360
      ctx.fillStyle = `hsla(${hue}, 90%, 70%, 0.8)`
      ctx.fillRect(ant.x * CELL_SIZE, ant.y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
      ctx.strokeStyle = `hsla(${hue}, 90%, 80%, 0.9)`
      ctx.lineWidth = 0.6
      ctx.strokeRect(ant.x * CELL_SIZE + 0.5, ant.y * CELL_SIZE + 0.5, CELL_SIZE - 1, CELL_SIZE - 1)
    }
    ctx.restore()

    if (mouse.isDown && mouse.isInBounds) {
      const pos = mouse.positionRef.current
      const gx = Math.floor(pos.x / CELL_SIZE)
      const gy = Math.floor(pos.y / CELL_SIZE)
      carvePortal(gx, gy)
      drawingRef.current = true
    } else if (drawingRef.current) {
      drawingRef.current = false
      setMessage('∴ pawprint corridor etched • ants reroute ∴')
    }

    if (frameRef.current % 12 === 0) {
      const grid = gridRef.current
      const coverage = grid.visitedCount / grid.total
      const stats = turnStatsRef.current
      const spin = (stats.right - stats.left) / (stats.right + stats.left)
      setReadout({
        steps: stepsRef.current,
        coverage,
        bias: spin.toFixed(2),
        rule: ruleRef.current,
        ants: antsRef.current.length
      })
    }
  }, [ctx, dimensions.height, dimensions.width, trailMode, simulateSteps, mouse.isDown, mouse.isInBounds, carvePortal])

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
    if (nextMode === 'custom') {
      setMode('custom')
      setMessage('∴ custom slot armed • tune rule to sculpt paths ∴')
      return
    }
    const preset = RULE_PRESETS.find(rule => rule.id === nextMode)
    if (!preset) return
    setMode(nextMode)
    setRuleString(preset.rule)
    setMessage(preset.desc)
  }, [])

  const handleSpawnAnt = useCallback(() => {
    const grid = gridRef.current
    if (!grid.cols) return
    if (mouse.isInBounds) {
      const pos = mouse.positionRef.current
      const gx = Math.floor(pos.x / CELL_SIZE)
      const gy = Math.floor(pos.y / CELL_SIZE)
      spawnAnt(gx, gy)
    } else {
      spawnAnt()
    }
    setMessage('∴ new scout joins the catwalk procession ∴')
    setReadout(prev => ({ ...prev, ants: antsRef.current.length }))
  }, [mouse.isInBounds, mouse.positionRef, spawnAnt])

  const handleToggleTrail = useCallback(() => {
    setTrailMode(prev => {
      const next = prev === 'ghost' ? 'etch' : 'ghost'
      setMessage(next === 'ghost'
        ? '∴ ghosts enabled • trails decay softly ∴'
        : '∴ etch enabled • every move gets archived ∴')
      return next
    })
  }, [])

  const handleTuneRule = useCallback(() => {
    if (typeof window === 'undefined') return
    const input = window.prompt('Enter rule code using L R S B', ruleRef.current)
    if (input == null) return
    const sanitized = input.toUpperCase().replace(/[^LRSB]/g, '')
    if (!sanitized.length) {
      setMessage('∴ rule edit ignored • need at least one L/R/S/B glyph ∴')
      return
    }
    setMode('custom')
    setRuleString(sanitized)
    setMessage(`∴ custom rule ${sanitized.toLowerCase()} inscribed ∴`)
  }, [])

  const handleReset = useCallback(() => {
    initializeGrid()
    setMessage('∴ slate cleared • ants regain their bearings ∴')
  }, [initializeGrid])

  const metrics = useMemo(() => {
    return [
      { label: 'ants', value: readout.ants },
      { label: 'steps', value: readout.steps },
      { label: 'coverage', value: `${(readout.coverage * 100).toFixed(1)}%` },
      { label: 'turn.bias', value: readout.bias }
    ]
  }, [readout])

  const controls = [
    {
      id: 'spawn',
      label: 'spawn.ant()',
      onClick: handleSpawnAnt
    },
    {
      id: 'trail',
      label: trailMode === 'ghost' ? 'trail.ghost()' : 'trail.etch()',
      onClick: handleToggleTrail,
      active: trailMode === 'ghost'
    },
    {
      id: 'tune',
      label: 'rule.tune()',
      onClick: handleTuneRule
    },
    {
      id: 'reset',
      label: 'clear.grid()',
      onClick: handleReset,
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
          {message}{' '}
          <span className="text-void-cyan/60 font-mono">[{ruleString}]</span>
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="ant-catwalk-canvas"
        />
      </div>
    </div>
  )
}

export default AntCatwalk
