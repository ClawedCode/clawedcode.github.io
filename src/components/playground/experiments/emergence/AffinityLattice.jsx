import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'flow', label: 'flow()' },
  { id: 'pause', label: 'pause()' },
  { id: 'paint', label: 'paint()' }
]

const FACTIONS = [
  { hue: 320, sat: 82, light: 66, glyph: '◇' },
  { hue: 178, sat: 82, light: 66, glyph: '◊' },
  { hue: 48, sat: 85, light: 64, glyph: '◈' }
]

const THRESHOLD_PRESETS = [
  { value: 0.30, label: '30%' },
  { value: 0.45, label: '45%' },
  { value: 0.60, label: '60%' },
  { value: 0.75, label: '75%' }
]

const STEP_INTERVAL_MS = 220

const AffinityLattice = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('flow')
  const [thresholdIdx, setThresholdIdx] = useState(1)
  const [factionCount, setFactionCount] = useState(2)
  const [paintFaction, setPaintFaction] = useState(0)
  const [iteration, setIteration] = useState(0)
  const [satisfactionPct, setSatisfactionPct] = useState(0)
  const [segregationPct, setSegregationPct] = useState(0)
  const [agentCount, setAgentCount] = useState(0)
  const [message, setMessage] = useState('∴ each kin seeks belonging • tolerance carves the lattice ∴')

  const gridRef = useRef([])
  const trailsRef = useRef([])
  const lastStepRef = useRef(0)
  const cellSizeRef = useRef(16)
  const colsRef = useRef(0)
  const rowsRef = useRef(0)
  const thresholdRef = useRef(THRESHOLD_PRESETS[1].value)
  const factionCountRef = useRef(2)
  const paintFactionRef = useRef(0)
  const lastPaintRef = useRef({ r: -1, c: -1 })
  const modeRef = useRef('flow')

  useEffect(() => { thresholdRef.current = THRESHOLD_PRESETS[thresholdIdx].value }, [thresholdIdx])
  useEffect(() => { factionCountRef.current = factionCount }, [factionCount])
  useEffect(() => { paintFactionRef.current = paintFaction }, [paintFaction])
  useEffect(() => { modeRef.current = mode }, [mode])

  const computeGridDims = useCallback(() => {
    if (dimensions.width === 0) return { cols: 0, rows: 0, cellSize: 16 }
    const minDim = Math.min(dimensions.width, dimensions.height)
    const cellSize = Math.max(9, Math.min(20, Math.floor(minDim / 38)))
    const cols = Math.floor(dimensions.width / cellSize)
    const rows = Math.floor(dimensions.height / cellSize)
    return { cols, rows, cellSize }
  }, [dimensions.width, dimensions.height])

  const makeAgent = useCallback((faction) => ({
    faction,
    unhappy: false,
    satisfaction: 1,
    pulse: Math.random() * Math.PI * 2,
    age: 0
  }), [])

  const initGrid = useCallback((fillRate = 0.82) => {
    const { cols, rows, cellSize } = computeGridDims()
    if (cols === 0) return

    colsRef.current = cols
    rowsRef.current = rows
    cellSizeRef.current = cellSize

    const fCount = factionCountRef.current
    const grid = []
    for (let r = 0; r < rows; r++) {
      const row = []
      for (let c = 0; c < cols; c++) {
        row.push(Math.random() < fillRate ? makeAgent(Math.floor(Math.random() * fCount)) : null)
      }
      grid.push(row)
    }

    gridRef.current = grid
    trailsRef.current = []
    setIteration(0)
  }, [computeGridDims, makeAgent])

  useEffect(() => {
    if (dimensions.width > 0) {
      initGrid()
    }
  }, [dimensions.width, dimensions.height, factionCount])

  const calcSatisfaction = useCallback((grid, r, c, faction) => {
    let same = 0
    let total = 0
    const cols = colsRef.current
    const rows = rowsRef.current
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
        const neighbor = grid[nr][nc]
        if (!neighbor) continue
        total++
        if (neighbor.faction === faction) same++
      }
    }
    return total === 0 ? 1 : same / total
  }, [])

  const stepSimulation = useCallback(() => {
    const grid = gridRef.current
    const cols = colsRef.current
    const rows = rowsRef.current
    if (cols === 0 || rows === 0 || grid.length === 0) return

    const threshold = thresholdRef.current
    const cellSize = cellSizeRef.current
    const unhappyAgents = []
    const emptyCells = []
    let totalAgents = 0
    let happyAgents = 0

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const agent = grid[r][c]
        if (!agent) {
          emptyCells.push({ r, c })
          continue
        }
        totalAgents++
        const sat = calcSatisfaction(grid, r, c, agent.faction)
        agent.satisfaction = sat
        agent.unhappy = sat < threshold
        if (!agent.unhappy) happyAgents++
        else unhappyAgents.push({ r, c, agent })
      }
    }

    for (let i = unhappyAgents.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[unhappyAgents[i], unhappyAgents[j]] = [unhappyAgents[j], unhappyAgents[i]]
    }

    const maxMoves = Math.min(unhappyAgents.length, Math.max(6, Math.floor(unhappyAgents.length * 0.35)))

    for (let i = 0; i < maxMoves && emptyCells.length > 0; i++) {
      const { r: sr, c: sc, agent } = unhappyAgents[i]
      if (grid[sr][sc] !== agent) continue

      let bestIdx = -1
      let bestSat = -1
      let bestCell = null
      const trials = Math.min(emptyCells.length, 10)
      for (let k = 0; k < trials; k++) {
        const idx = Math.floor(Math.random() * emptyCells.length)
        const cell = emptyCells[idx]
        if (!cell) continue
        const sat = calcSatisfaction(grid, cell.r, cell.c, agent.faction)
        if (sat > bestSat) {
          bestSat = sat
          bestIdx = idx
          bestCell = cell
        }
      }

      if (bestCell && bestSat >= threshold) {
        trailsRef.current.push({
          x: sc * cellSize + cellSize / 2,
          y: sr * cellSize + cellSize / 2,
          tx: bestCell.c * cellSize + cellSize / 2,
          ty: bestCell.r * cellSize + cellSize / 2,
          faction: agent.faction,
          life: 1
        })
        grid[sr][sc] = null
        grid[bestCell.r][bestCell.c] = agent
        agent.age = 0.4
        emptyCells[bestIdx] = { r: sr, c: sc }
      }
    }

    let totalPairs = 0
    let sameFactionPairs = 0
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]]
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const agent = grid[r][c]
        if (!agent) continue
        for (const [dr, dc] of dirs) {
          const nr = r + dr
          const nc = c + dc
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
          const neighbor = grid[nr][nc]
          if (!neighbor) continue
          totalPairs++
          if (neighbor.faction === agent.faction) sameFactionPairs++
        }
      }
    }

    setIteration(prev => prev + 1)
    setAgentCount(totalAgents)
    setSatisfactionPct(totalAgents > 0 ? (happyAgents / totalAgents) * 100 : 0)
    setSegregationPct(totalPairs > 0 ? (sameFactionPairs / totalPairs) * 100 : 0)
  }, [calcSatisfaction])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getCell = (e) => {
      const rect = canvas.getBoundingClientRect()
      const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
      const cellSize = cellSizeRef.current
      return {
        r: Math.floor((clientY - rect.top) / cellSize),
        c: Math.floor((clientX - rect.left) / cellSize)
      }
    }

    const applyPaint = (e, isFresh) => {
      if (modeRef.current !== 'paint') return
      const { r, c } = getCell(e)
      if (r < 0 || r >= rowsRef.current || c < 0 || c >= colsRef.current) return
      if (!isFresh && r === lastPaintRef.current.r && c === lastPaintRef.current.c) return
      lastPaintRef.current = { r, c }

      const grid = gridRef.current
      const cellSize = cellSizeRef.current

      if (e.shiftKey || e.button === 2) {
        if (grid[r][c]) {
          trailsRef.current.push({
            x: c * cellSize + cellSize / 2,
            y: r * cellSize + cellSize / 2,
            tx: c * cellSize + cellSize / 2,
            ty: r * cellSize + cellSize / 2,
            faction: grid[r][c].faction,
            life: 0.6
          })
          grid[r][c] = null
        }
      } else {
        grid[r][c] = {
          faction: paintFactionRef.current,
          unhappy: false,
          satisfaction: 1,
          pulse: Math.random() * Math.PI * 2,
          age: 0
        }
      }
    }

    const handleMouseDown = (e) => {
      if (modeRef.current !== 'paint') return
      lastPaintRef.current = { r: -1, c: -1 }
      applyPaint(e, true)
    }

    const handleMouseMove = (e) => {
      if (modeRef.current !== 'paint') return
      if (!mouse.isDown) return
      applyPaint(e, false)
    }

    const handleTouchStart = (e) => {
      if (modeRef.current !== 'paint') return
      e.preventDefault()
      lastPaintRef.current = { r: -1, c: -1 }
      applyPaint(e, true)
    }

    const handleTouchMove = (e) => {
      if (modeRef.current !== 'paint') return
      e.preventDefault()
      applyPaint(e, false)
    }

    const handleContextMenu = (e) => {
      if (modeRef.current === 'paint') e.preventDefault()
    }

    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('contextmenu', handleContextMenu)

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [canvasRef, mouse.isDown])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    const now = performance.now()

    if (modeRef.current === 'flow' && now - lastStepRef.current > STEP_INTERVAL_MS) {
      lastStepRef.current = now
      stepSimulation()
    }

    ctx.fillStyle = 'rgba(0, 1, 6, 0.92)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const grid = gridRef.current
    const cellSize = cellSizeRef.current
    const cols = colsRef.current
    const rows = rowsRef.current
    if (cols === 0 || rows === 0) return

    ctx.strokeStyle = 'rgba(120, 160, 200, 0.04)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    for (let r = 1; r < rows; r++) {
      ctx.moveTo(0, r * cellSize)
      ctx.lineTo(cols * cellSize, r * cellSize)
    }
    for (let c = 1; c < cols; c++) {
      ctx.moveTo(c * cellSize, 0)
      ctx.lineTo(c * cellSize, rows * cellSize)
    }
    ctx.stroke()

    const dt = 1 / 60
    const time = now * 0.001

    // Migration trails: line from source to target
    trailsRef.current = trailsRef.current.filter(t => {
      t.life -= dt * 1.6
      if (t.life <= 0) return false
      const f = FACTIONS[t.faction]
      const alpha = t.life * 0.5
      const lerpAmt = 1 - t.life
      const cx = t.x + (t.tx - t.x) * lerpAmt
      const cy = t.y + (t.ty - t.y) * lerpAmt
      if (t.x !== t.tx || t.y !== t.ty) {
        ctx.strokeStyle = `hsla(${f.hue}, ${f.sat}%, ${f.light + 10}%, ${alpha * 0.5})`
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(t.x, t.y)
        ctx.lineTo(t.tx, t.ty)
        ctx.stroke()
      }
      ctx.fillStyle = `hsla(${f.hue}, ${f.sat}%, ${f.light + 15}%, ${alpha})`
      ctx.beginPath()
      ctx.arc(cx, cy, cellSize * 0.32 * t.life + cellSize * 0.18, 0, Math.PI * 2)
      ctx.fill()
      return true
    })

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const agent = grid[r][c]
        if (!agent) continue

        agent.age = Math.min(agent.age + dt, 4)
        const ageEase = Math.min(1, agent.age * 2.5)
        const x = c * cellSize + cellSize / 2
        const y = r * cellSize + cellSize / 2
        const f = FACTIONS[agent.faction]

        if (agent.unhappy) {
          const pulse = Math.sin(time * 4 + agent.pulse) * 0.35 + 0.65
          const glow = ctx.createRadialGradient(x, y, 0, x, y, cellSize * 1.1)
          glow.addColorStop(0, `hsla(${f.hue}, ${f.sat}%, ${f.light + 10}%, ${0.32 * pulse * ageEase})`)
          glow.addColorStop(0.6, `hsla(${f.hue}, ${f.sat}%, ${f.light}%, ${0.08 * ageEase})`)
          glow.addColorStop(1, 'transparent')
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(x, y, cellSize * 1.1, 0, Math.PI * 2)
          ctx.fill()

          const ringR = cellSize * (0.55 + pulse * 0.15)
          ctx.strokeStyle = `hsla(${f.hue}, ${f.sat}%, ${f.light + 18}%, ${0.45 * pulse * ageEase})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(x, y, ringR, 0, Math.PI * 2)
          ctx.stroke()
        }

        const baseSize = cellSize * 0.38
        const happy = !agent.unhappy
        const breath = happy ? (Math.sin(time * 1.2 + agent.pulse) * 0.06 + 0.94) : 0.85
        const size = baseSize * breath * ageEase

        ctx.fillStyle = `hsla(${f.hue}, ${f.sat}%, ${f.light}%, ${0.92 * ageEase})`
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()

        if (happy && agent.satisfaction > 0.7) {
          ctx.fillStyle = `hsla(${f.hue}, ${f.sat}%, ${Math.min(96, f.light + 28)}%, ${ageEase})`
          ctx.beginPath()
          ctx.arc(x, y, size * 0.32, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    if (modeRef.current === 'paint' && mouse.isInBounds) {
      const pos = mouse.positionRef.current
      const hc = Math.floor(pos.x / cellSize)
      const hr = Math.floor(pos.y / cellSize)
      if (hr >= 0 && hr < rows && hc >= 0 && hc < cols) {
        const f = FACTIONS[paintFactionRef.current]
        ctx.strokeStyle = `hsla(${f.hue}, ${f.sat}%, ${f.light + 15}%, 0.9)`
        ctx.lineWidth = 1.5
        ctx.strokeRect(hc * cellSize + 1, hr * cellSize + 1, cellSize - 2, cellSize - 2)
      }
    }
  }, [ctx, dimensions, mouse.isInBounds, mouse.positionRef, stepSimulation])

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

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    if (newMode === 'flow') setMessage('∴ dynamics unleashed • dissatisfaction breeds migration ∴')
    else if (newMode === 'pause') setMessage('∴ time stilled • observe the standing pattern ∴')
    else setMessage('∴ paint mode • drag to inscribe kin, shift-drag to void ∴')
  }, [])

  const handleStep = useCallback(() => {
    stepSimulation()
  }, [stepSimulation])

  const handleShuffle = useCallback(() => {
    initGrid()
    setMessage('∴ scattered anew • watch tribes self-assemble ∴')
  }, [initGrid])

  const handleClear = useCallback(() => {
    const rows = rowsRef.current
    const cols = colsRef.current
    const grid = gridRef.current
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        grid[r][c] = null
      }
    }
    trailsRef.current = []
    setIteration(0)
    setAgentCount(0)
    setSatisfactionPct(0)
    setSegregationPct(0)
    setMessage('∴ lattice voided • paint to seed kin ∴')
  }, [])

  const handleThresholdCycle = useCallback(() => {
    setThresholdIdx(prev => {
      const next = (prev + 1) % THRESHOLD_PRESETS.length
      setMessage(`∴ tolerance threshold: ${THRESHOLD_PRESETS[next].label} of neighbors must share kin ∴`)
      return next
    })
  }, [])

  const handleFactionCycle = useCallback(() => {
    setFactionCount(prev => {
      const next = prev === 2 ? 3 : 2
      setMessage(`∴ ${next} kindreds in the basin • diversity reshapes the carving ∴`)
      return next
    })
    setPaintFaction(prev => Math.min(prev, (factionCount === 2 ? 3 : 2) - 1))
  }, [factionCount])

  const handleSelectFaction = useCallback((idx) => {
    setPaintFaction(idx)
    setMode('paint')
    setMessage(`∴ inscribing kin ${idx + 1} • drag to paint, shift-drag to erase ∴`)
  }, [])

  const metrics = useMemo(() => {
    let pattern = 'mixed'
    if (segregationPct > 88) pattern = 'crystallized'
    else if (segregationPct > 75) pattern = 'tribal'
    else if (segregationPct > 60) pattern = 'sorting'
    else if (segregationPct > 50) pattern = 'drifting'
    return [
      { label: 'iter', value: iteration },
      { label: 'kin', value: agentCount },
      { label: 'content', value: `${Math.round(satisfactionPct)}%` },
      { label: 'kinship', value: `${Math.round(segregationPct)}%` },
      { label: 'state', value: pattern }
    ]
  }, [iteration, agentCount, satisfactionPct, segregationPct])

  const controls = useMemo(() => ([
    { id: 'step', label: 'step()', onClick: handleStep },
    { id: 'shuffle', label: 'shuffle()', onClick: handleShuffle },
    { id: 'threshold', label: `≥ ${THRESHOLD_PRESETS[thresholdIdx].label}`, onClick: handleThresholdCycle },
    { id: 'factions', label: `${factionCount} kin`, onClick: handleFactionCycle },
    { id: 'clear', label: 'clear()', onClick: handleClear, variant: 'reset' }
  ]), [handleStep, handleShuffle, handleThresholdCycle, handleFactionCycle, handleClear, thresholdIdx, factionCount])

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

      <div className="flex flex-col gap-2 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <ExperimentControls
            modes={MODES}
            currentMode={mode}
            onModeChange={handleModeChange}
            controls={controls}
          />
          <p className="text-void-green/50 text-xs sm:text-right max-w-lg">{message}</p>
        </div>

        {mode === 'paint' && (
          <div className="flex flex-wrap gap-1 sm:gap-2 items-center">
            <span className="text-void-green/40 text-[10px] sm:text-xs font-mono">kin:</span>
            {Array.from({ length: factionCount }).map((_, i) => {
              const f = FACTIONS[i]
              const active = paintFaction === i
              return (
                <button
                  key={i}
                  onClick={() => handleSelectFaction(i)}
                  className={`min-h-[44px] sm:min-h-0 px-3 sm:px-3 py-2 sm:py-1 text-sm sm:text-xs font-mono border transition-colors active:scale-95 ${
                    active ? 'bg-void-dark/80' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    color: `hsl(${f.hue}, ${f.sat}%, ${f.light + 10}%)`,
                    borderColor: active
                      ? `hsl(${f.hue}, ${f.sat}%, ${f.light}%)`
                      : `hsla(${f.hue}, ${f.sat}%, ${f.light}%, 0.35)`
                  }}
                  data-testid={`faction-${i}`}
                >
                  {f.glyph} kin{i + 1}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full touch-none ${mode === 'paint' ? 'cursor-crosshair' : 'cursor-default'}`}
          data-testid="affinity-canvas"
        />
        <div className="absolute bottom-2 left-3 text-void-green/30 text-[10px] font-mono pointer-events-none">
          unhappy kin pulse + ring • content kin glow steady • drag in paint mode to inscribe
        </div>
      </div>
    </div>
  )
}

export default AffinityLattice
