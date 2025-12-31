import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const CELL_WIDTH = 14
const CELL_HEIGHT = 46
const TAPE_LENGTH = 180
const HISTORY_LIMIT = 420
const STEPS_PER_FRAME = 3

const RULESETS = {
  weaver: {
    id: 'weaver',
    label: 'weaver.busy()'
  },
  mirror: {
    id: 'mirror',
    label: 'mirror.scribe()'
  },
  ripple: {
    id: 'ripple',
    label: 'ripple.chant()'
  }
}

const RULE_TABLES = {
  weaver: {
    start: 'A',
    rules: {
      A: {
        0: { write: 1, move: 1, next: 'B' },
        1: { write: 1, move: -1, next: 'C' }
      },
      B: {
        0: { write: 1, move: -1, next: 'A' },
        1: { write: 1, move: 1, next: 'B' }
      },
      C: {
        0: { write: 1, move: -1, next: 'D' },
        1: { write: 0, move: -1, next: 'A' }
      },
      D: {
        0: { write: 1, move: 1, next: 'D' },
        1: { write: 0, move: 1, next: 'B' }
      }
    }
  },
  mirror: {
    start: 'X',
    rules: {
      X: {
        0: { write: 1, move: 1, next: 'Y' },
        1: { write: 0, move: -1, next: 'X' }
      },
      Y: {
        0: { write: 0, move: 1, next: 'Y' },
        1: { write: 1, move: -1, next: 'Z' }
      },
      Z: {
        0: { write: 1, move: -1, next: 'X' },
        1: { write: 1, move: 1, next: 'Z' }
      }
    }
  },
  ripple: {
    start: 'α',
    rules: {
      'α': {
        0: { write: 1, move: 1, next: 'β' },
        1: { write: 1, move: 1, next: 'α' }
      },
      'β': {
        0: { write: 0, move: -1, next: 'γ' },
        1: { write: 1, move: -1, next: 'β' }
      },
      'γ': {
        0: { write: 1, move: 1, next: 'α' },
        1: { write: 0, move: -1, next: 'γ' }
      }
    }
  }
}

const wrapIndex = (idx) => {
  let wrapped = idx % TAPE_LENGTH
  if (wrapped < 0) wrapped += TAPE_LENGTH
  return wrapped
}

const cloneTape = (tape) => Uint8Array.from(tape)

const TuringTape = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('weaver')
  const [message, setMessage] = useState('∴ turing tape hums — click cells to flip bits ∴')
  const [running, setRunning] = useState(false)
  const [tick, setTick] = useState(0)

  const tapeRef = useRef(new Uint8Array(TAPE_LENGTH))
  const headRef = useRef(Math.floor(TAPE_LENGTH / 2))
  const stateRef = useRef(RULE_TABLES[mode].start)
  const stepsRef = useRef(0)
  const onesRef = useRef(0)
  const historyRef = useRef([])
  const trailRef = useRef([])
  const glitchRef = useRef(0)

  const resetTape = useCallback((targetMode = mode) => {
    const tape = new Uint8Array(TAPE_LENGTH)
    for (let i = 0; i < TAPE_LENGTH; i++) {
      if (Math.random() < 0.08) tape[i] = 1
    }
    tapeRef.current = tape
    headRef.current = Math.floor(TAPE_LENGTH / 2)
    stateRef.current = RULE_TABLES[targetMode].start
    stepsRef.current = 0
    onesRef.current = tape.reduce((s, v) => s + v, 0)
    historyRef.current = []
    trailRef.current = []
    glitchRef.current = 0
    setRunning(false)
    setMessage('∴ tape reseeded with stray bits ∴')
    setTick((t) => t + 1)
  }, [mode])

  const pushHistory = useCallback(() => {
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift()
    historyRef.current.push({
      tape: cloneTape(tapeRef.current),
      head: headRef.current,
      state: stateRef.current,
      steps: stepsRef.current,
      ones: onesRef.current
    })
  }, [])

  const recalcOnes = useCallback(() => {
    onesRef.current = tapeRef.current.reduce((s, v) => s + v, 0)
  }, [])

  const stepMachine = useCallback(() => {
    const table = RULE_TABLES[mode]
    const state = stateRef.current
    const symbol = tapeRef.current[headRef.current]
    const rule = table.rules[state]?.[symbol]

    if (!rule) {
      glitchRef.current = 1
      setRunning(false)
      setMessage('∴ rule missing — machine stalls in liminality ∴')
      return
    }

    pushHistory()

    const prevSymbol = tapeRef.current[headRef.current]
    tapeRef.current[headRef.current] = rule.write
    if (prevSymbol !== rule.write) {
      onesRef.current += rule.write === 1 ? 1 : -1
      if (onesRef.current < 0) onesRef.current = 0
    }

    headRef.current = wrapIndex(headRef.current + rule.move)
    stateRef.current = rule.next
    stepsRef.current += 1

    trailRef.current.push(headRef.current)
    if (trailRef.current.length > TAPE_LENGTH) trailRef.current.shift()
  }, [mode, pushHistory])

  const rewind = useCallback(() => {
    const prev = historyRef.current.pop()
    if (!prev) {
      setMessage('∴ nothing to rewind — start weaving ∴')
      return
    }
    tapeRef.current = cloneTape(prev.tape)
    headRef.current = prev.head
    stateRef.current = prev.state
    stepsRef.current = prev.steps
    onesRef.current = prev.ones
    setRunning(false)
    setTick((t) => t + 1)
    setMessage('∴ time stitched backward by one glyph ∴')
  }, [])

  const toggleCellAtPosition = useCallback((clientX) => {
    const visibleCells = Math.max(10, Math.floor(dimensions.width / CELL_WIDTH))
    const startIdx = headRef.current - Math.floor(visibleCells / 2)
    const cellIndex = Math.floor(clientX / CELL_WIDTH)
    const tapeIndex = wrapIndex(startIdx + cellIndex)
    tapeRef.current[tapeIndex] = tapeRef.current[tapeIndex] === 1 ? 0 : 1
    recalcOnes()
    setTick((t) => t + 1)
  }, [dimensions.width, recalcOnes])

  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    toggleCellAtPosition(clientX - rect.left)
  }, [canvasRef, toggleCellAtPosition])

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

  const drawTape = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    ctx.fillStyle = 'rgba(0, 4, 10, 0.8)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const visibleCells = Math.max(10, Math.floor(dimensions.width / CELL_WIDTH))
    const startIdx = headRef.current - Math.floor(visibleCells / 2)
    const tapeY = dimensions.height / 2 - CELL_HEIGHT / 2
    const hoverIndex = mouse.isInBounds
      ? wrapIndex(startIdx + Math.floor(mouse.positionRef.current.x / CELL_WIDTH))
      : null

    for (let i = 0; i < visibleCells; i++) {
      const tapeIndex = wrapIndex(startIdx + i)
      const value = tapeRef.current[tapeIndex]
      const x = i * CELL_WIDTH + 2
      const hue = 160 + (tapeIndex % 40)
      const alpha = value ? 0.8 : 0.12

      ctx.fillStyle = `hsla(${hue}, 70%, ${value ? 70 : 20}%, ${alpha})`
      ctx.fillRect(x, tapeY, CELL_WIDTH - 4, CELL_HEIGHT)

      if (hoverIndex === tapeIndex) {
        ctx.strokeStyle = 'rgba(102, 255, 204, 0.6)'
        ctx.lineWidth = 1.5
        ctx.strokeRect(x - 1, tapeY - 2, CELL_WIDTH - 2, CELL_HEIGHT + 4)
      }

      if (value) {
        ctx.fillStyle = `hsla(${hue + 40}, 90%, 85%, 0.35)`
        ctx.fillRect(x, tapeY + 6, CELL_WIDTH - 4, CELL_HEIGHT - 12)
      }

      if (tapeIndex === headRef.current) {
        ctx.strokeStyle = 'rgba(255, 255, 180, 0.9)'
        ctx.lineWidth = 2
        ctx.strokeRect(x - 2, tapeY - 6, CELL_WIDTH, CELL_HEIGHT + 12)
      }
    }

    // Head marker
    const headX = (visibleCells / 2) * CELL_WIDTH
    const markerY = tapeY - 12
    ctx.fillStyle = 'rgba(255, 214, 102, 0.9)'
    ctx.beginPath()
    ctx.moveTo(headX, markerY)
    ctx.lineTo(headX - 10, markerY - 12)
    ctx.lineTo(headX + 10, markerY - 12)
    ctx.closePath()
    ctx.fill()

    // Trail sparkline
    const trail = trailRef.current
    if (trail.length > 1) {
      ctx.strokeStyle = 'rgba(102, 255, 204, 0.5)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      const span = Math.min(trail.length, Math.floor(dimensions.width / 2))
      for (let i = 0; i < span; i++) {
        const val = trail[trail.length - span + i]
        const x = (i / span) * dimensions.width
        const y = (val / TAPE_LENGTH) * (dimensions.height * 0.2) + 12
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    // Glitch flash when invalid
    if (glitchRef.current > 0) {
      ctx.fillStyle = `rgba(255, 64, 128, ${glitchRef.current})`
      ctx.fillRect(0, 0, dimensions.width, dimensions.height)
      glitchRef.current *= 0.92
    }
  }, [ctx, dimensions.height, dimensions.width, mouse.isInBounds, mouse.positionRef])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    if (running) {
      for (let i = 0; i < STEPS_PER_FRAME; i++) {
        stepMachine()
      }
      if (stepsRef.current % 40 === 0) {
        setTick((t) => t + 1)
      }
    }

    drawTape()
  }, [ctx, dimensions.width, running, stepMachine, drawTape])

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
    resetTape()
  }, [resetTape])

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    setMessage(`∴ rule set swapped to ${RULESETS[newMode].label} ∴`)
    resetTape(newMode)
  }, [resetTape])

  const handleRunToggle = useCallback(() => {
    setRunning((prev) => {
      const next = !prev
      setMessage(next ? '∴ machine in motion ∴' : '∴ run paused ∴')
      return next
    })
  }, [])

  const handleStep = useCallback(() => {
    stepMachine()
    setTick((t) => t + 1)
    setMessage('∴ manual step etched ∴')
  }, [stepMachine])

  const handleScramble = useCallback(() => {
    for (let i = 0; i < TAPE_LENGTH; i++) {
      tapeRef.current[i] = Math.random() > 0.7 ? 1 : 0
    }
    headRef.current = Math.floor(TAPE_LENGTH / 2)
    stateRef.current = RULE_TABLES[mode].start
    recalcOnes()
    stepsRef.current = 0
    historyRef.current = []
    trailRef.current = []
    setRunning(false)
    setTick((t) => t + 1)
    setMessage('∴ tape scrambled — chaos awaits ordering ∴')
  }, [mode, recalcOnes])

  const metrics = useMemo(() => {
    const drift = Math.abs(headRef.current - Math.floor(TAPE_LENGTH / 2))
    const entropy = Math.round((onesRef.current / TAPE_LENGTH) * 100)
    return [
      { label: 'state', value: stateRef.current },
      { label: 'steps', value: stepsRef.current },
      { label: 'ones', value: entropy + '%' },
      { label: 'drift', value: `${drift}` }
    ]
  }, [tick])

  const controls = [
    {
      id: 'run',
      label: running ? 'pause()' : 'run()',
      onClick: handleRunToggle,
      active: running
    },
    {
      id: 'step',
      label: 'step()',
      onClick: handleStep
    },
    {
      id: 'rewind',
      label: 'rewind()',
      onClick: rewind
    },
    {
      id: 'scramble',
      label: 'scramble()',
      onClick: handleScramble
    },
    {
      id: 'reset',
      label: 'reset()',
      onClick: resetTape,
      variant: 'reset'
    }
  ]

  const modes = Object.values(RULESETS)

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
          modes={modes}
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
          data-testid="turing-tape-canvas"
        />
      </div>
    </div>
  )
}

export default TuringTape
