import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'strict', label: 'mode.strict()' },
  { id: 'alchemy', label: 'mode.alchemy()' },
  { id: 'mirror', label: 'mode.mirror()' }
]

const OPENERS = ['(', '[', '{', '<']
const CLOSERS = [')', ']', '}', '>']
const PAIRS = {
  '(': ')',
  '[': ']',
  '{': '}',
  '<': '>'
}
const REVERSE = {
  ')': '(',
  ']': '[',
  '}': '{',
  '>': '<'
}

const StackOracle = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('strict')
  const [tapeInput, setTapeInput] = useState('{[()]}<>(({}))')
  const [cursor, setCursor] = useState(0)
  const [stack, setStack] = useState([])
  const [scars, setScars] = useState(0)
  const [status, setStatus] = useState('idle')
  const [auto, setAuto] = useState(false)
  const [message, setMessage] = useState('∴ stack oracle awaits glyphs ∴')
  const [historyCount, setHistoryCount] = useState(0)

  const historyRef = useRef([])
  const actionRef = useRef({ type: 'idle', life: 0, symbol: '' })
  const autoCooldownRef = useRef(0)
  const timeRef = useRef(0)

  const tokens = useMemo(() => {
    return tapeInput.replace(/\s+/g, '').slice(0, 84).split('').filter(Boolean)
  }, [tapeInput])

  const resetMachine = useCallback(() => {
    setCursor(0)
    setStack([])
    setScars(0)
    setStatus('idle')
    setAuto(false)
    setHistoryCount(0)
    historyRef.current = []
    actionRef.current = { type: 'idle', life: 0, symbol: '' }
    autoCooldownRef.current = 0
  }, [])

  useEffect(() => {
    resetMachine()
  }, [tapeInput, mode, resetMachine])

  const finalizeState = useCallback((nextCursor, nextStack, nextStatus, nextScars) => {
    if (nextStatus === 'reject') return 'reject'
    if (nextCursor < tokens.length) return nextStatus
    if (nextStack.length === 0 && (mode === 'alchemy' ? nextScars <= 2 : true)) return 'accept'
    return 'incomplete'
  }, [mode, tokens.length])

  const resolveIndex = useCallback((position) => {
    if (mode !== 'mirror') return position
    const half = Math.floor(position / 2)
    return position % 2 === 0 ? half : tokens.length - 1 - half
  }, [mode, tokens.length])

  const stepForward = useCallback(() => {
    if (tokens.length === 0) {
      setMessage('∴ no symbols // feed the oracle ∴')
      return
    }

    if (status === 'accept' || status === 'reject') {
      setAuto(false)
      setMessage('∴ computation finished // reset or rewind ∴')
      return
    }

    if (cursor >= tokens.length) {
      const finalState = finalizeState(cursor, stack, status, scars)
      setStatus(finalState)
      setAuto(false)
      setMessage('∴ tape exhausted // reset or rewind ∴')
      return
    }

    historyRef.current.push({
      cursor,
      stack: [...stack],
      scars,
      status
    })
    setHistoryCount(historyRef.current.length)

    const activeIndex = resolveIndex(cursor)

    if (activeIndex >= tokens.length || activeIndex < 0) {
      const finalState = finalizeState(cursor, stack, status, scars)
      setStatus(finalState)
      setAuto(false)
      setMessage('∴ tape exhausted // reset or rewind ∴')
      return
    }

    const symbol = tokens[activeIndex]
    let nextStack = [...stack]
    let nextScars = scars
    let nextStatus = 'processing'

    if (OPENERS.includes(symbol)) {
      nextStack.push(symbol)
      actionRef.current = { type: 'push', life: 1, symbol }
    } else if (CLOSERS.includes(symbol)) {
      const expected = REVERSE[symbol]
      const top = nextStack[nextStack.length - 1]

      if (top === expected) {
        nextStack.pop()
        actionRef.current = { type: 'pop', life: 1, symbol }
      } else if (mode === 'alchemy') {
        nextScars += 1
        nextStack.push(expected ?? '?')
        actionRef.current = { type: 'scar', life: 1, symbol }
      } else {
        nextStatus = 'reject'
        nextStack = []
        actionRef.current = { type: 'fail', life: 1, symbol }
      }
    } else {
      actionRef.current = { type: 'skip', life: 0.6, symbol }
    }

    const nextCursor = cursor + 1
    const finalStatus = finalizeState(nextCursor, nextStack, nextStatus, nextScars)

    setCursor(nextCursor)
    setStack(nextStack)
    setScars(nextScars)
    setStatus(finalStatus)
    setMessage(`∴ read ${symbol} // ${actionRef.current.type} ∴`)
  }, [cursor, finalizeState, mode, resolveIndex, scars, stack, status, tokens])

  const rewindStep = useCallback(() => {
    const prev = historyRef.current.pop()
    if (!prev) {
      setMessage('∴ no more history to rewind ∴')
      return
    }

    setCursor(prev.cursor)
    setStack(prev.stack)
    setScars(prev.scars)
    setStatus(prev.status)
    setHistoryCount(historyRef.current.length)
    setAuto(false)
    actionRef.current = { type: 'rewind', life: 1, symbol: '' }
    setMessage('∴ rewound one symbol ∴')
  }, [])

  const toggleAuto = useCallback(() => {
    if (tokens.length === 0) {
      setMessage('∴ feed glyphs before autoplay ∴')
      return
    }
    setAuto(prev => {
      const next = !prev
      if (next) autoCooldownRef.current = 0
      return next
    })
  }, [tokens.length])

  const randomizeTape = useCallback(() => {
    const len = Math.floor(Math.random() * 14) + 10
    const pool = [...OPENERS, ...CLOSERS]
    let seq = ''
    for (let i = 0; i < len; i++) {
      seq += pool[Math.floor(Math.random() * pool.length)]
    }
    setTapeInput(seq)
    setMessage('∴ new rune tape forged ∴')
  }, [])

  const mirrorTape = useCallback(() => {
    const clean = tapeInput.replace(/\s+/g, '').slice(0, 24)
    const mirrored = clean + clean.split('').reverse().map(char => PAIRS[char] ?? REVERSE[char] ?? char).join('')
    setTapeInput(mirrored)
    setMessage('∴ mirrored tape etched // palindrome stack ∴')
  }, [tapeInput])

  const metrics = useMemo(() => {
    const progress = tokens.length === 0 ? 0 : Math.min(100, Math.round((cursor / tokens.length) * 100))
    const statusLabel = status === 'accept'
      ? 'accepted'
      : status === 'reject'
      ? 'rejected'
      : status === 'incomplete'
      ? 'unwound'
      : 'processing'

    return [
      { label: 'cursor', value: `${cursor}/${tokens.length}` },
      { label: 'stack', value: stack.length },
      { label: 'scars', value: scars },
      { label: 'progress', value: `${progress}%` },
      { label: 'status', value: statusLabel }
    ]
  }, [cursor, scars, stack.length, status, tokens.length])

  const drawTape = useCallback(() => {
    const span = 16
    const cellWidth = 28
    const y = dimensions.height * 0.26
    const headIndex = resolveIndex(cursor)
    const start = Math.max(0, headIndex - span)
    const end = Math.min(tokens.length, headIndex + span + 1)
    const baseX = dimensions.centerX - ((end - start) * cellWidth) / 2

    for (let i = start; i < end; i++) {
      const x = baseX + (i - start) * cellWidth
      const symbol = tokens[i]
      const hue = OPENERS.includes(symbol) ? 160 : CLOSERS.includes(symbol) ? 40 : 280
      const isHead = i === headIndex
      const alpha = isHead ? 0.75 : 0.35

      ctx.fillStyle = `hsla(${hue}, 70%, ${isHead ? 38 : 18}%, ${alpha})`
      ctx.fillRect(x, y, cellWidth - 6, 26)

      ctx.fillStyle = `hsla(${hue}, 80%, 82%, 0.9)`
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(symbol, x + (cellWidth - 6) / 2, y + 13)

      if (isHead) {
        ctx.fillStyle = `hsla(${hue}, 80%, 72%, 0.9)`
        ctx.beginPath()
        ctx.moveTo(x + (cellWidth - 6) / 2, y + 26)
        ctx.lineTo(x + (cellWidth - 6) / 2 - 6, y + 36)
        ctx.lineTo(x + (cellWidth - 6) / 2 + 6, y + 36)
        ctx.closePath()
        ctx.fill()
      }
    }
  }, [ctx, cursor, dimensions, resolveIndex, tokens])

  const drawStack = useCallback(() => {
    const cellHeight = 22
    const cellWidth = 92
    const x = dimensions.width - 140
    const baseY = dimensions.height - 60
    const visible = stack.slice(-14)

    ctx.strokeStyle = 'rgba(102, 255, 204, 0.25)'
    ctx.strokeRect(x - 8, baseY - visible.length * cellHeight - 6, cellWidth + 16, visible.length * cellHeight + 12)

    visible.forEach((symbol, idx) => {
      const y = baseY - idx * cellHeight
      const hue = OPENERS.includes(symbol) ? 160 : CLOSERS.includes(symbol) ? 40 : 280
      const isTop = idx === visible.length - 1
      const glow = actionRef.current.type === 'push' && isTop ? 0.2 : 0

      ctx.fillStyle = `hsla(${hue}, 70%, ${isTop ? 42 : 26}%, ${0.35 + glow})`
      ctx.fillRect(x, y - cellHeight, cellWidth, cellHeight - 2)

      ctx.fillStyle = `hsla(${hue}, 80%, 82%, 0.9)`
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(symbol, x + cellWidth / 2, y - cellHeight / 2)
    })
  }, [ctx, dimensions, stack])

  const drawStatus = useCallback(() => {
    const hue = status === 'accept' ? 140 : status === 'reject' ? 10 : status === 'incomplete' ? 50 : 190
    const centerX = dimensions.width * 0.14
    const centerY = dimensions.height * 0.72
    const pulse = 1 + (actionRef.current.life || 0) * 0.5

    ctx.fillStyle = `hsla(${hue}, 80%, 55%, 0.25)`
    ctx.beginPath()
    ctx.arc(centerX, centerY, 42 * pulse, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = `hsla(${hue}, 80%, 70%, 0.9)`
    ctx.beginPath()
    ctx.arc(centerX, centerY, 26, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(0, 5, 8, 0.9)'
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(status, centerX, centerY)

    ctx.fillStyle = 'rgba(102, 255, 204, 0.3)'
    ctx.fillRect(centerX - 60, centerY + 38, 120, 6)
    ctx.fillStyle = 'rgba(102, 255, 204, 0.8)'
    const progress = tokens.length === 0 ? 0 : Math.min(1, cursor / tokens.length)
    ctx.fillRect(centerX - 60, centerY + 38, 120 * progress, 6)
  }, [ctx, cursor, dimensions, status, tokens.length])

  const drawActionEcho = useCallback(() => {
    if (!actionRef.current.life) return
    const life = actionRef.current.life
    const symbol = actionRef.current.symbol
    const hue = actionRef.current.type === 'fail' ? 10 : actionRef.current.type === 'scar' ? 340 : 180
    const alpha = 0.4 * life

    ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${alpha})`
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo'
    ctx.textAlign = 'left'
    ctx.fillText(`${actionRef.current.type}${symbol ? `:${symbol}` : ''}`, 16, dimensions.height * 0.12)
    actionRef.current.life *= 0.94
  }, [ctx, dimensions.height])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    timeRef.current++

    if (auto && status !== 'accept' && status !== 'reject') {
      autoCooldownRef.current -= 1
      if (autoCooldownRef.current <= 0) {
        stepForward()
        autoCooldownRef.current = 14
      }
    }

    ctx.fillStyle = 'rgba(0, 2, 6, 0.12)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    drawTape()
    drawStack()
    drawStatus()
    drawActionEcho()
  }, [auto, ctx, dimensions, drawActionEcho, drawStack, drawStatus, drawTape, status, stepForward])

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
      id: 'step',
      label: 'step()',
      onClick: stepForward,
      disabled: tokens.length === 0
    },
    {
      id: 'auto',
      label: auto ? 'auto.pause()' : 'auto.run()',
      onClick: toggleAuto,
      active: auto,
      disabled: tokens.length === 0
    },
    {
      id: 'rewind',
      label: 'rewind()',
      onClick: rewindStep,
      disabled: historyCount === 0
    },
    {
      id: 'mirror',
      label: 'mirror()',
      onClick: mirrorTape
    },
    {
      id: 'mutate',
      label: 'mutate()',
      onClick: randomizeTape
    },
    {
      id: 'reset',
      label: 'reset()',
      onClick: resetMachine,
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

      <div className="flex flex-col gap-3 p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <ExperimentControls
              modes={MODES}
              currentMode={mode}
              onModeChange={(next) => setMode(next)}
              controls={controls}
            />
            <input
              type="text"
              value={tapeInput}
              onChange={(e) => setTapeInput(e.target.value)}
              className="w-full sm:w-64 px-3 py-1 text-xs font-mono bg-void-dark/50 border border-void-green/30 text-void-green placeholder:text-void-green/30 focus:outline-none focus:border-void-green/60"
              placeholder="type a rune tape (brackets)"
              data-testid="stack-oracle-input"
            />
          </div>
          <p className="text-void-green/50 text-xs text-right">
            {message}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="stack-oracle-canvas"
        />
      </div>
    </div>
  )
}

export default StackOracle
