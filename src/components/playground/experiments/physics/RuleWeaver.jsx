import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const CELL = 8

const PRESET_RULES = [30, 45, 54, 73, 90, 94, 102, 110, 129, 150, 182, 225]

const MODES = [
  { id: 'weave', label: 'view.weave()' },
  { id: 'heat', label: 'view.heatmap()' },
  { id: 'ancestry', label: 'view.ancestry()' }
]

const TEMPOS = [1, 2, 3, 5]

const RuleWeaver = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('weave')
  const [rule, setRule] = useState(() => PRESET_RULES[Math.floor(Math.random() * PRESET_RULES.length)])
  const [isRunning, setIsRunning] = useState(true)
  const [tempoIndex, setTempoIndex] = useState(1)
  const [tool, setTool] = useState('ink')
  const [message, setMessage] = useState('∴ binary loom calibrating ∴ click the top row to rewrite the seed ∴')
  const [stats, setStats] = useState({ generation: 0, density: 0, mutation: 0, symmetry: 100 })

  const rowsRef = useRef([])
  const heatRef = useRef([])
  const colsRef = useRef(0)
  const maxRowsRef = useRef(0)
  const frameRef = useRef(0)
  const generationRef = useRef(0)
  const lastPaintRef = useRef(-1)

  const computeSymmetry = useCallback((row) => {
    const mid = Math.floor(row.length / 2)
    let matches = 0
    for (let i = 0; i < mid; i++) {
      if (row[i] === row[row.length - 1 - i]) matches++
    }
    if (mid === 0) return 100
    return Math.round((matches / mid) * 100)
  }, [])

  const recalcLoom = useCallback(() => {
    if (dimensions.width === 0) return

    const cols = Math.max(18, Math.floor(dimensions.width / CELL))
    const rows = Math.max(12, Math.floor(dimensions.height / CELL))

    colsRef.current = cols
    maxRowsRef.current = rows

    const seed = new Array(cols).fill(0)
    const center = Math.floor(cols / 2)
    seed[center] = 1
    seed[Math.max(0, center - 1)] = 1
    seed[Math.min(cols - 1, center + 1)] = 1

    rowsRef.current = [seed]
    heatRef.current = seed.map(v => v)
    generationRef.current = 0
    setStats({ generation: 0, density: Math.round((3 / cols) * 100), mutation: 0, symmetry: computeSymmetry(seed) })
    setMessage('∴ loom reset • central spark encoded ∴')
  }, [computeSymmetry, dimensions.height, dimensions.width])

  useEffect(() => {
    recalcLoom()
  }, [recalcLoom])

  const setRuleNumber = useCallback((value) => {
    const normalized = ((value % 256) + 256) % 256
    setRule(normalized)
    setMessage(`∴ rule set to ${normalized} ∴`)
  }, [])

  const rewriteSeed = useCallback((col) => {
    if (col === lastPaintRef.current) return
    const cols = colsRef.current
    if (cols === 0) return
    const base = rowsRef.current[0] ? [...rowsRef.current[0]] : new Array(cols).fill(0)
    if (col < 0 || col >= cols) return

    base[col] = tool === 'ink' ? 1 : 0
    rowsRef.current = [base]
    heatRef.current = base.map(v => v)
    generationRef.current = 0
    setIsRunning(false)
    setStats({
      generation: 0,
      density: Math.round((base.reduce((s, v) => s + v, 0) / cols) * 100),
      mutation: 0,
      symmetry: computeSymmetry(base)
    })
    setMessage(tool === 'ink' ? '∴ seed rewritten • future recomputes ∴' : '∴ seed erased • future recomputes ∴')
    lastPaintRef.current = col
  }, [computeSymmetry, tool])

  const randomSeed = useCallback(() => {
    const cols = colsRef.current
    if (cols === 0) return
    const seed = new Array(cols).fill(0).map(() => (Math.random() < 0.16 ? 1 : 0))
    rowsRef.current = [seed]
    heatRef.current = seed.map(v => v)
    generationRef.current = 0
    setIsRunning(false)
    setStats({
      generation: 0,
      density: Math.round((seed.reduce((s, v) => s + v, 0) / cols) * 100),
      mutation: 0,
      symmetry: computeSymmetry(seed)
    })
    setMessage('∴ stochastic seed planted ∴')
  }, [computeSymmetry])

  const mirrorSeed = useCallback(() => {
    const cols = colsRef.current
    if (cols === 0) return
    const seed = rowsRef.current[0] ? [...rowsRef.current[0]] : new Array(cols).fill(0)
    for (let i = 0; i < Math.floor(cols / 2); i++) {
      seed[cols - 1 - i] = seed[i]
    }
    rowsRef.current = [seed]
    heatRef.current = seed.map(v => v)
    generationRef.current = 0
    setIsRunning(false)
    setStats({
      generation: 0,
      density: Math.round((seed.reduce((s, v) => s + v, 0) / cols) * 100),
      mutation: 0,
      symmetry: computeSymmetry(seed)
    })
    setMessage('∴ mirror symmetry enforced across the ribbon ∴')
  }, [computeSymmetry])

  const clearSeed = useCallback(() => {
    const cols = colsRef.current
    if (cols === 0) return
    const seed = new Array(cols).fill(0)
    rowsRef.current = [seed]
    heatRef.current = seed.map(v => v)
    generationRef.current = 0
    setIsRunning(false)
    setStats({ generation: 0, density: 0, mutation: 0, symmetry: 100 })
    setMessage('∴ blank tape • awaiting inscription ∴')
  }, [])

  const stepAutomata = useCallback(() => {
    const cols = colsRef.current
    const maxRows = maxRowsRef.current || 1
    const prev = rowsRef.current[rowsRef.current.length - 1]
    if (!prev || cols === 0) return

    const next = new Array(cols).fill(0)
    for (let i = 0; i < cols; i++) {
      const left = prev[(i - 1 + cols) % cols]
      const center = prev[i]
      const right = prev[(i + 1) % cols]
      const pattern = (left << 2) | (center << 1) | right
      const alive = (rule >> pattern) & 1
      next[i] = alive
      if (alive) heatRef.current[i] = Math.min(999, (heatRef.current[i] || 0) + 1)
    }

    rowsRef.current.push(next)
    if (rowsRef.current.length > maxRows) rowsRef.current.shift()

    const active = next.reduce((s, v) => s + v, 0)
    const density = Math.round((active / cols) * 100)
    let mutation = 0
    for (let i = 0; i < cols; i++) {
      if (next[i] !== prev[i]) mutation++
    }
    const mutationRate = Math.round((mutation / cols) * 100)
    const symmetry = computeSymmetry(next)

    generationRef.current += 1
    setStats({ generation: generationRef.current, density, mutation: mutationRate, symmetry })
  }, [computeSymmetry, rule])

  const drawLoom = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    const rows = rowsRef.current
    const cols = colsRef.current
    const maxRows = maxRowsRef.current || 1
    const visible = Math.min(rows.length, maxRows)
    const start = rows.length - visible
    const baseHue = (rule * 3) % 360

    ctx.fillStyle = 'rgba(0, 1, 5, 0.15)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    for (let r = 0; r < visible; r++) {
      const row = rows[start + r]
      const y = r * CELL
      const ageRatio = r / visible
      for (let c = 0; c < cols; c++) {
        const alive = row[c] === 1
        let hue = baseHue + ageRatio * 40
        let light = alive ? 62 : 8
        let alpha = alive ? 0.92 : 0.05

        if (mode === 'heat') {
          const heat = heatRef.current[c] || 0
          hue = 40 + Math.min(220, heat * 0.5)
          light = alive ? 55 + Math.min(30, heat * 0.3) : 10 + Math.min(20, heat * 0.2)
          alpha = alive ? 0.8 : Math.min(0.4, heat * 0.01)
        }

        ctx.fillStyle = `hsla(${hue}, 80%, ${light}%, ${alpha})`
        ctx.fillRect(c * CELL, y, CELL - 1, CELL - 1)
      }
    }

    if (mode === 'ancestry' && rows.length > 1 && visible > 1) {
      const child = rows[rows.length - 1]
      const parent = rows[rows.length - 2]
      const yChild = (visible - 1) * CELL + CELL / 2
      const yParent = (visible - 2) * CELL + CELL / 2
      ctx.strokeStyle = 'rgba(102, 255, 204, 0.35)'
      ctx.lineWidth = 1
      for (let c = 0; c < cols; c++) {
        if (child[c] === 0) continue
        const x = c * CELL + CELL / 2
        for (let offset = -1; offset <= 1; offset++) {
          const pIndex = (c + offset + cols) % cols
          if (parent[pIndex] === 0) continue
          const px = pIndex * CELL + CELL / 2
          ctx.beginPath()
          ctx.moveTo(px, yParent)
          ctx.lineTo(x, yChild)
          ctx.stroke()
        }
      }
    }

    ctx.fillStyle = 'rgba(102, 255, 204, 0.12)'
    ctx.fillRect(0, CELL - 1, dimensions.width, 1)
  }, [ctx, dimensions.height, dimensions.width, mode, rule])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    frameRef.current++

    if (mouse.isDown && mouse.isInBounds) {
      const targetRow = Math.floor(mouse.positionRef.current.y / CELL)
      if (targetRow === 0) {
        const col = Math.floor(mouse.positionRef.current.x / CELL)
        rewriteSeed(col)
      }
    } else {
      lastPaintRef.current = -1
    }

    if (isRunning && frameRef.current % TEMPOS[tempoIndex] === 0) {
      stepAutomata()
    }

    drawLoom()
  }, [ctx, dimensions.width, drawLoom, isRunning, mouse.isDown, mouse.isInBounds, rewriteSeed, stepAutomata, tempoIndex])

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

  const handleTempoShift = useCallback(() => {
    setTempoIndex((idx) => (idx + 1) % TEMPOS.length)
    setMessage('∴ tempo shifted • different cadence through time ∴')
  }, [])

  const handleMutateRule = useCallback(() => {
    const next = PRESET_RULES[Math.floor(Math.random() * PRESET_RULES.length)]
    setRuleNumber(next)
  }, [setRuleNumber])

  const handleNudgeRule = useCallback(() => {
    setRuleNumber(rule + 1)
  }, [rule, setRuleNumber])

  const handleStep = useCallback(() => {
    setIsRunning(false)
    stepAutomata()
  }, [stepAutomata])

  const handleToggleRun = useCallback(() => {
    setIsRunning((running) => {
      if (running) {
        setMessage('∴ loom paused • edit the seed ∴')
      } else {
        setMessage('∴ loom running • rule weaving ∴')
      }
      return !running
    })
  }, [])

  const handleToolSwap = useCallback(() => {
    setTool((t) => (t === 'ink' ? 'erase' : 'ink'))
    setMessage('∴ tool swapped • ink ↔ erase ∴')
  }, [])

  const metrics = useMemo(() => {
    return [
      { label: 'rule', value: rule },
      { label: 'gen', value: stats.generation },
      { label: 'density', value: `${stats.density}%` },
      { label: 'mutation', value: `${stats.mutation}%` },
      { label: 'symmetry', value: `${stats.symmetry}%` }
    ]
  }, [rule, stats])

  const controls = [
    {
      id: 'run',
      label: isRunning ? 'pause()' : 'run()',
      onClick: handleToggleRun
    },
    {
      id: 'step',
      label: 'step()',
      onClick: handleStep
    },
    {
      id: 'tempo',
      label: `tempo(${TEMPOS[tempoIndex]}x)`,
      onClick: handleTempoShift
    },
    {
      id: 'rule-mutate',
      label: 'rule.mutate()',
      onClick: handleMutateRule
    },
    {
      id: 'rule-nudge',
      label: 'rule.nudge() +1',
      onClick: handleNudgeRule
    },
    {
      id: 'tool',
      label: tool === 'ink' ? 'ink.erase()' : 'ink.draw()',
      onClick: handleToolSwap
    },
    {
      id: 'random-seed',
      label: 'seed.random()',
      onClick: randomSeed
    },
    {
      id: 'mirror-seed',
      label: 'seed.mirror()',
      onClick: mirrorSeed
    },
    {
      id: 'clear',
      label: 'clear()',
      onClick: clearSeed,
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
          data-testid="rule-weaver-canvas"
        />
        <div className="absolute top-2 left-2 text-void-green/40 text-[10px] font-mono">
          click + drag on row 0 to rewrite the seed
        </div>
      </div>
    </div>
  )
}

export default RuleWeaver
