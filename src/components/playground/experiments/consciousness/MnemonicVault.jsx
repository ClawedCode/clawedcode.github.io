import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'named', label: 'named()' },
  { id: 'veiled', label: 'veiled()' },
  { id: 'blind', label: 'blind()' }
]

const MODE_MESSAGES = {
  named: '∴ glyphs remain named // remember the path between doors ∴',
  veiled: '∴ names vanish after study // trust the afterimage ∴',
  blind: '∴ the vault goes dark // recall becomes muscle and moonlight ∴'
}

const GLYPHS = [
  '∴', '◇', '⌁', '⌬',
  '✦', '△', '◌', '⟡',
  '⊙', '☉', '⧖', '✶',
  '⟐', '⌯', '◈', '✧'
]

const HUES = [
  '#66ffcc', '#ffd27a', '#9be5ff', '#ff99e5',
  '#caff88', '#d4aaff', '#ff8866', '#88d7ff',
  '#e6ff9a', '#ffc98a', '#8ff2c7', '#ffdd88',
  '#77ddb5', '#ccaaff', '#f0d866', '#aff0ff'
]

const PHASE_LABELS = {
  idle: 'sealed',
  study: 'study',
  recall: 'recall',
  opened: 'opened',
  locked: 'locked'
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const createSequence = (length) => {
  const sequence = []

  for (let i = 0; i < length; i++) {
    let next = Math.floor(Math.random() * 16)
    if (sequence.length > 0 && next === sequence[sequence.length - 1]) {
      next = (next + 1 + Math.floor(Math.random() * 14)) % 16
    }
    sequence.push(next)
  }

  return sequence
}

const getDifficultyBonus = (mode) => {
  if (mode === 'blind') return 2
  if (mode === 'veiled') return 1
  return 0
}

const MnemonicVault = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('named')
  const [phase, setPhase] = useState('idle')
  const [level, setLevel] = useState(1)
  const [sequence, setSequence] = useState(() => createSequence(3))
  const [playbackIndex, setPlaybackIndex] = useState(-1)
  const [entryIndex, setEntryIndex] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [opened, setOpened] = useState(0)
  const [message, setMessage] = useState(MODE_MESSAGES.named)
  const [memoryLine, setMemoryLine] = useState([])

  const phaseRef = useRef(phase)
  const tracesRef = useRef([])
  const frameRef = useRef(0)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const layout = useMemo(() => {
    const size = clamp(Math.min(dimensions.width * 0.82, dimensions.height * 0.72), 248, 540)
    const gap = clamp(size * 0.025, 8, 14)
    const cell = (size - gap * 3) / 4
    const left = dimensions.centerX - size / 2
    const top = dimensions.centerY - size / 2

    return { size, gap, cell, left, top }
  }, [dimensions.centerX, dimensions.centerY, dimensions.height, dimensions.width])

  const getCellCenter = useCallback((index) => {
    const col = index % 4
    const row = Math.floor(index / 4)
    return {
      x: layout.left + col * (layout.cell + layout.gap) + layout.cell / 2,
      y: layout.top + row * (layout.cell + layout.gap) + layout.cell / 2
    }
  }, [layout.cell, layout.gap, layout.left, layout.top])

  const burnTrace = useCallback((index, kind) => {
    const center = getCellCenter(index)
    tracesRef.current.push({
      x: center.x,
      y: center.y,
      index,
      kind,
      life: 1,
      radius: layout.cell * 0.24
    })
  }, [getCellCenter, layout.cell])

  const prepareSequence = useCallback((targetLevel = level, targetMode = mode) => {
    const length = clamp(targetLevel + 2 + getDifficultyBonus(targetMode), 3, 12)
    setSequence(createSequence(length))
    setEntryIndex(0)
    setMemoryLine([])
    setPlaybackIndex(-1)
    setPhase('idle')
    setMessage('∴ a fresh vault seals itself around a new order ∴')
  }, [level, mode])

  const beginStudy = useCallback(() => {
    setEntryIndex(0)
    setMemoryLine([])
    setPhase('study')
    setPlaybackIndex(-1)
    setMessage('∴ watch the doors wake in order ∴')
  }, [])

  const showAgain = useCallback(() => {
    if (phaseRef.current === 'study') return
    setEntryIndex(0)
    setMemoryLine([])
    setPhase('study')
    setPlaybackIndex(-1)
    setMessage('∴ the vault grants one more glimpse ∴')
  }, [])

  const nextVault = useCallback(() => {
    if (phaseRef.current !== 'opened') return
    const nextLevel = level + 1
    setLevel(nextLevel)
    setOpened(prev => prev + 1)
    const length = clamp(nextLevel + 2 + getDifficultyBonus(mode), 3, 12)
    setSequence(createSequence(length))
    setEntryIndex(0)
    setMemoryLine([])
    setPlaybackIndex(-1)
    setPhase('idle')
    setMessage('∴ deeper chamber unlocked // the sequence lengthens ∴')
  }, [level, mode])

  const resetVault = useCallback(() => {
    tracesRef.current = []
    setLevel(1)
    setMistakes(0)
    setOpened(0)
    setSequence(createSequence(3 + getDifficultyBonus(mode)))
    setEntryIndex(0)
    setMemoryLine([])
    setPlaybackIndex(-1)
    setPhase('idle')
    setMessage('∴ vault memory washed clean ∴')
  }, [mode])

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    setLevel(1)
    setMistakes(0)
    setOpened(0)
    setSequence(createSequence(3 + getDifficultyBonus(newMode)))
    setEntryIndex(0)
    setMemoryLine([])
    setPlaybackIndex(-1)
    setPhase('idle')
    setMessage(MODE_MESSAGES[newMode])
  }, [])

  useEffect(() => {
    if (phase !== 'study') return

    const timers = []
    let cursor = 0

    const playStep = () => {
      if (cursor >= sequence.length) {
        setPlaybackIndex(-1)
        setPhase('recall')
        setMessage('∴ repeat the vanishing order ∴')
        return
      }

      const index = sequence[cursor]
      setPlaybackIndex(index)
      burnTrace(index, 'study')
      cursor += 1

      timers.push(window.setTimeout(() => {
        setPlaybackIndex(-1)
        timers.push(window.setTimeout(playStep, 160))
      }, mode === 'blind' ? 360 : 520))
    }

    timers.push(window.setTimeout(playStep, 240))

    return () => timers.forEach(timer => window.clearTimeout(timer))
  }, [burnTrace, mode, phase, sequence])

  const handleCellClick = useCallback((index) => {
    if (phaseRef.current !== 'recall') return

    const expected = sequence[entryIndex]
    const glyph = GLYPHS[index]

    if (index === expected) {
      burnTrace(index, 'correct')
      const nextEntry = entryIndex + 1
      setEntryIndex(nextEntry)
      setMemoryLine(prev => [...prev.slice(-5), glyph])

      if (nextEntry >= sequence.length) {
        setPhase('opened')
        setMessage('∴ vault opened // recall holds its shape ∴')
      } else {
        setMessage(`∴ ${nextEntry}/${sequence.length} doors remembered ∴`)
      }
      return
    }

    burnTrace(index, 'wrong')
    setMistakes(prev => prev + 1)
    setEntryIndex(0)
    setMemoryLine([])
    setPhase('locked')
    setMessage(`∴ false door: expected ${GLYPHS[expected]} // sequence resets ∴`)

    window.setTimeout(() => {
      if (phaseRef.current === 'locked') {
        setPhase('recall')
        setMessage('∴ begin again from the first door ∴')
      }
    }, 950)
  }, [burnTrace, entryIndex, sequence])

  const drawVault = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    frameRef.current += 1
    const t = frameRef.current
    ctx.fillStyle = 'rgba(0, 3, 10, 0.18)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const pagePad = layout.cell * 0.34
    const slabX = layout.left - pagePad
    const slabY = layout.top - pagePad
    const slabW = layout.size + pagePad * 2
    const slabH = layout.size + pagePad * 2

    const glow = phase === 'opened' ? 0.26 : phase === 'locked' ? 0.22 : 0.12
    ctx.fillStyle = `rgba(4, 13, 19, ${0.82 + glow})`
    ctx.strokeStyle = phase === 'locked'
      ? 'rgba(255, 102, 102, 0.42)'
      : phase === 'opened'
      ? 'rgba(102, 255, 204, 0.46)'
      : 'rgba(102, 255, 204, 0.22)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(slabX, slabY, slabW, slabH, 8)
    ctx.fill()
    ctx.stroke()

    ctx.save()
    ctx.globalAlpha = 0.35
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.1)'
    ctx.lineWidth = 1
    for (let row = 0; row <= 4; row++) {
      const y = layout.top + row * (layout.cell + layout.gap) - layout.gap / 2
      ctx.beginPath()
      ctx.moveTo(layout.left - layout.gap, y)
      ctx.lineTo(layout.left + layout.size + layout.gap, y)
      ctx.stroke()
    }
    for (let col = 0; col <= 4; col++) {
      const x = layout.left + col * (layout.cell + layout.gap) - layout.gap / 2
      ctx.beginPath()
      ctx.moveTo(x, layout.top - layout.gap)
      ctx.lineTo(x, layout.top + layout.size + layout.gap)
      ctx.stroke()
    }
    ctx.restore()

    if (phase === 'study' || phase === 'opened') {
      ctx.save()
      ctx.globalAlpha = phase === 'opened' ? 0.38 : 0.18
      ctx.strokeStyle = phase === 'opened' ? 'rgba(255, 210, 122, 0.62)' : 'rgba(155, 229, 255, 0.44)'
      ctx.lineWidth = 2
      ctx.beginPath()
      sequence.forEach((index, step) => {
        const center = getCellCenter(index)
        if (step === 0) ctx.moveTo(center.x, center.y)
        else ctx.lineTo(center.x, center.y)
      })
      ctx.stroke()
      ctx.restore()
    }

    for (let i = tracesRef.current.length - 1; i >= 0; i--) {
      const trace = tracesRef.current[i]
      const color = trace.kind === 'wrong'
        ? '255, 102, 102'
        : trace.kind === 'study'
        ? '155, 229, 255'
        : '102, 255, 204'

      trace.life -= trace.kind === 'study' ? 0.012 : 0.008
      trace.radius += trace.kind === 'wrong' ? 1.2 : 0.62

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = `rgba(${color}, ${trace.life * 0.68})`
      ctx.fillStyle = `rgba(${color}, ${trace.life * 0.12})`
      ctx.lineWidth = 1 + trace.life * 2
      ctx.beginPath()
      ctx.arc(trace.x, trace.y, trace.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.font = `${Math.max(16, layout.cell * 0.24)}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = `rgba(${color}, ${trace.life * 0.58})`
      ctx.fillText(GLYPHS[trace.index], trace.x, trace.y)
      ctx.restore()

      if (trace.life <= 0) tracesRef.current.splice(i, 1)
    }

    ctx.save()
    ctx.globalAlpha = 0.18
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
    ctx.lineWidth = 1
    const scanY = slabY + ((t * 0.6) % slabH)
    ctx.beginPath()
    ctx.moveTo(slabX, scanY)
    ctx.lineTo(slabX + slabW, scanY)
    ctx.stroke()
    ctx.restore()
  }, [ctx, dimensions.height, dimensions.width, getCellCenter, layout.cell, layout.gap, layout.left, layout.size, layout.top, phase, sequence])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return

    let frameId
    const animate = () => {
      drawVault()
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, drawVault])

  const metrics = useMemo(() => {
    const recall = sequence.length ? `${entryIndex}/${sequence.length}` : '0/0'

    return [
      { label: 'depth', value: level },
      { label: 'phase', value: PHASE_LABELS[phase] },
      { label: 'recall', value: recall },
      { label: 'errors', value: mistakes }
    ]
  }, [entryIndex, level, mistakes, phase, sequence.length])

  const controls = [
    {
      id: 'begin',
      label: phase === 'idle' ? 'beginTrial()' : 'replayTrial()',
      onClick: phase === 'idle' ? beginStudy : showAgain,
      disabled: phase === 'study'
    },
    {
      id: 'next',
      label: 'nextVault()',
      onClick: nextVault,
      disabled: phase !== 'opened'
    },
    {
      id: 'new',
      label: 'newOrder()',
      onClick: () => prepareSequence(level, mode),
      disabled: phase === 'study'
    },
    {
      id: 'reset',
      label: 'reset()',
      onClick: resetVault,
      variant: 'reset'
    }
  ]

  const shouldShowGlyph = useCallback((index) => {
    if (mode === 'named') return true
    if (phase === 'study' && playbackIndex === index) return true
    if (mode === 'veiled' && memoryLine.includes(GLYPHS[index])) return true
    if (phase === 'opened') return true
    return false
  }, [memoryLine, mode, phase, playbackIndex])

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
        <p className="text-void-green/50 text-xs sm:text-right max-w-xl">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          data-testid="mnemonic-vault-canvas"
        />

        <div
          className="absolute grid grid-cols-4"
          style={{
            width: layout.size,
            height: layout.size,
            left: layout.left,
            top: layout.top,
            gap: layout.gap
          }}
        >
          {GLYPHS.map((glyph, index) => {
            const isActive = playbackIndex === index
            const isExpected = phase === 'recall' && sequence[entryIndex] === index
            const showGlyph = shouldShowGlyph(index)
            const color = HUES[index]

            return (
              <button
                key={glyph}
                type="button"
                onClick={() => handleCellClick(index)}
                disabled={phase !== 'recall'}
                className={`relative flex items-center justify-center rounded border font-mono transition-[background-color,border-color,box-shadow,transform,color,opacity] active:scale-95 ${
                  phase === 'recall'
                    ? 'cursor-pointer hover:border-void-cyan/70 hover:bg-void-cyan/10'
                    : 'cursor-default'
                } ${
                  isActive
                    ? 'border-void-yellow bg-void-yellow/18 shadow-[0_0_32px_rgba(255,210,122,0.34)]'
                    : phase === 'locked'
                    ? 'border-red-400/30 bg-red-500/6'
                    : 'border-void-green/22 bg-black/26'
                }`}
                style={{
                  color: showGlyph ? color : 'rgba(102, 255, 204, 0.24)',
                  fontSize: clamp(layout.cell * 0.34, 24, 46),
                  minWidth: 44,
                  minHeight: 44,
                  boxShadow: isActive
                    ? `0 0 28px ${color}66, inset 0 0 24px ${color}22`
                    : isExpected && mode === 'named'
                    ? 'inset 0 0 18px rgba(102, 255, 204, 0.08)'
                    : undefined
                }}
                data-testid={`vault-cell-${index}`}
              >
                <span className="select-none">
                  {showGlyph ? glyph : mode === 'blind' ? '' : '·'}
                </span>
                <span className="absolute left-2 top-1.5 text-[10px] text-void-green/25">
                  {index + 1}
                </span>
              </button>
            )
          })}
        </div>

        <div className="absolute left-3 right-3 bottom-3 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-2 pointer-events-none">
          <div className="max-w-lg border border-void-green/20 bg-void-dark/72 backdrop-blur-sm p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-void-green/40 mb-1">
              recall thread
            </div>
            <div className="min-h-[1.5rem] font-mono text-lg text-void-cyan">
              {memoryLine.length ? memoryLine.join(' ') : 'awaiting touch'}
            </div>
          </div>
          <div className="text-[10px] sm:text-xs text-void-green/36 font-mono max-w-md sm:text-right">
            Study the flare order. In recall, press the same doors from first to last. Veiled and blind chambers remove names from the stone.
          </div>
        </div>
      </div>
    </div>
  )
}

export default MnemonicVault
