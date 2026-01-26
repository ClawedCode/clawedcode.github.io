import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'trace', label: 'mode.trace()' },
  { id: 'cadence', label: 'mode.cadence()' },
  { id: 'syntax', label: 'mode.syntax()' }
]

const MODE_MESSAGES = {
  trace: '∴ type anywhere • repeated glyphs braid themselves ∴',
  cadence: '∴ pulses of keystrokes form luminous measures ∴',
  syntax: '∴ words bloom brackets • observe phrase anatomy ∴'
}

const CLUSTER_GAP = 520

const isWordGlyph = (char) => /[A-Za-z0-9]/.test(char)
const symbolForChar = (char) => {
  if (char === ' ') return '·'
  if (char === '\n') return '⏎'
  if (char === '\t') return '⇥'
  return char
}

const colorForChar = (char, alpha = 1, weight = 0) => {
  const code = char.codePointAt?.(0) ?? 42
  const hue = (code * 23 + weight * 11) % 360
  return `hsla(${hue}, 78%, 70%, ${alpha})`
}

const LEXICON_MESSAGES = [
  '∴ glyph etched into the palimpsest ∴',
  '∴ syntax pulse recorded on the tape ∴',
  '∴ another sigil hums in the archive ∴',
  '∴ cadence adjusts // new rhythm arrives ∴',
  '∴ lexical cascade deepens the groove ∴'
]

const LexiconCascade = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('trace')
  const [message, setMessage] = useState(MODE_MESSAGES.trace)
  const [stats, setStats] = useState({ glyphs: 0, unique: 0, words: 0, cadence: '0.0/cluster' })
  const [layoutSeed, setLayoutSeed] = useState(0)
  const [, forceHoverVersion] = useState(0)

  const eventsRef = useRef([])
  const layoutConfigRef = useRef({
    columns: 24,
    cellWidth: 32,
    cellHeight: 34,
    marginX: 36,
    marginY: 46,
    maxRows: 20,
    maxEvents: 480
  })
  const positionsRef = useRef([])
  const hoverRef = useRef(null)
  const hoverKeyRef = useRef(null)

  const repositionLayout = useCallback(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return
    const marginX = Math.max(28, dimensions.width * 0.04)
    const marginY = Math.max(36, dimensions.height * 0.08)
    const availableWidth = Math.max(140, dimensions.width - marginX * 2)
    const columns = Math.max(14, Math.floor(availableWidth / 36))
    const cellWidth = availableWidth / columns
    const cellHeight = Math.max(26, Math.min(68, cellWidth * 1.1))
    const usableHeight = Math.max(160, dimensions.height - marginY * 1.4)
    const maxRows = Math.max(6, Math.floor(usableHeight / cellHeight))
    const maxEvents = columns * maxRows
    layoutConfigRef.current = {
      columns,
      cellWidth,
      cellHeight,
      marginX,
      marginY,
      maxRows,
      maxEvents
    }
  }, [dimensions.height, dimensions.width])

  const enforceCapacity = useCallback(() => {
    const limit = layoutConfigRef.current.maxEvents ?? 400
    const events = eventsRef.current
    while (events.length > limit) {
      events.shift()
    }
  }, [])

  const recomputeMeta = useCallback(() => {
    const events = eventsRef.current
    if (!events.length) {
      setStats({ glyphs: 0, unique: 0, words: 0, cadence: '0.0/cluster' })
      return
    }

    const unique = new Set()
    let words = 0
    let insideWord = false
    let clusterId = 0
    let prevTime = events[0]?.time ?? 0

    events.forEach((event, index) => {
      event.index = index
      unique.add(event.char)

      if (isWordGlyph(event.char)) {
        if (!insideWord) {
          words++
          insideWord = true
        }
        event.wordId = words
      } else {
        insideWord = false
        event.wordId = null
      }

      if (index === 0) {
        event.clusterId = 0
      } else if (event.time - prevTime > CLUSTER_GAP) {
        clusterId++
        event.clusterId = clusterId
      } else {
        event.clusterId = clusterId
      }

      prevTime = event.time
    })

    const clusterCount = clusterId + 1
    const cadence = clusterCount ? (events.length / clusterCount).toFixed(1) : '0.0'

    setStats({
      glyphs: events.length,
      unique: unique.size,
      words,
      cadence: `${cadence}/cluster`
    })
  }, [])

  useEffect(() => {
    repositionLayout()
    enforceCapacity()
    recomputeMeta()
  }, [dimensions.width, dimensions.height, repositionLayout, enforceCapacity, recomputeMeta])

  const registerGlyph = useCallback((char) => {
    const now = Date.now()
    eventsRef.current.push({
      id: `${now}-${Math.random().toString(16).slice(2, 6)}`,
      char,
      symbol: symbolForChar(char),
      time: now
    })
    enforceCapacity()
    recomputeMeta()
    const lexMsg = LEXICON_MESSAGES[Math.floor(Math.random() * LEXICON_MESSAGES.length)]
    setMessage(lexMsg)
  }, [enforceCapacity, recomputeMeta])

  const handleBackspace = useCallback(() => {
    if (!eventsRef.current.length) return
    eventsRef.current.pop()
    recomputeMeta()
    setMessage('∴ glyph rewound • tape softens ∴')
  }, [recomputeMeta])

  const handleWordRewind = useCallback(() => {
    const events = eventsRef.current
    if (!events.length) return

    let removed = 0
    while (events.length) {
      const last = events[events.length - 1]
      removed++
      events.pop()
      if (!isWordGlyph(last.char)) break
      if (!events.length) break
      if (!isWordGlyph(events[events.length - 1].char)) break
    }

    recomputeMeta()
    setMessage(`∴ rewound ${removed} glyph${removed === 1 ? '' : 's'} ∴`)
  }, [recomputeMeta])

  const handleClear = useCallback(() => {
    eventsRef.current = []
    recomputeMeta()
    setMessage('∴ tape cleared • await new lexicon rain ∴')
  }, [recomputeMeta])

  const handleScramble = useCallback(() => {
    setLayoutSeed(seed => seed + 1)
    setMessage('∴ columns phase-shifted • cadence reprojected ∴')
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Backspace') {
        e.preventDefault()
        handleBackspace()
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        registerGlyph('\n')
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        registerGlyph('\t')
        return
      }
      if (e.key.length === 1) {
        e.preventDefault()
        registerGlyph(e.key)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleBackspace, registerGlyph])

  const layoutEvents = useCallback(() => {
    const events = eventsRef.current
    const { columns, cellWidth, cellHeight, marginX, marginY } = layoutConfigRef.current
    const baseXOffset = layoutSeed * 0.37
    const baseYOffset = layoutSeed * 0.21

    positionsRef.current = events.map((event, idx) => {
      const column = idx % columns
      const row = Math.floor(idx / columns)
      const x = marginX + column * cellWidth + cellWidth / 2
      const y = dimensions.height - marginY - row * cellHeight
      const jitterX = Math.sin((event.id.charCodeAt(0) + idx) * 0.13 + baseXOffset) * Math.min(9, cellWidth * 0.18)
      const jitterY = Math.cos((event.id.charCodeAt(0) + idx) * 0.11 + baseYOffset) * Math.min(6, cellHeight * 0.2)
      return {
        event,
        x: x + jitterX,
        y: y + jitterY,
        column,
        row,
        idx
      }
    })
  }, [dimensions.height, layoutSeed])

  const drawTraceLines = useCallback((ctxInstance, positions) => {
    ctxInstance.save()
    ctxInstance.lineWidth = 1.4
    ctxInstance.strokeStyle = 'rgba(102, 255, 204, 0.35)'
    const lastByChar = {}

    positions.forEach(pos => {
      const key = pos.event.char.toLowerCase()
      if (!isWordGlyph(key)) {
        lastByChar[key] = pos
        return
      }
      const previous = lastByChar[key]
      if (previous) {
        const gradient = ctxInstance.createLinearGradient(previous.x, previous.y, pos.x, pos.y)
        gradient.addColorStop(0, colorForChar(previous.event.char, 0.25))
        gradient.addColorStop(1, colorForChar(pos.event.char, 0.5))
        ctxInstance.strokeStyle = gradient
        ctxInstance.beginPath()
        ctxInstance.moveTo(previous.x, previous.y)
        ctxInstance.lineTo(pos.x, pos.y)
        ctxInstance.stroke()
      }
      lastByChar[key] = pos
    })

    ctxInstance.restore()
  }, [])

  const drawCadence = useCallback((ctxInstance, positions) => {
    if (!positions.length) return
    ctxInstance.save()
    ctxInstance.lineWidth = 2
    const clusters = new Map()

    positions.forEach(pos => {
      const id = pos.event.clusterId
      if (!clusters.has(id)) {
        clusters.set(id, {
          positions: [pos],
          minX: pos.x,
          maxX: pos.x,
          avgY: pos.y,
          time: pos.event.time
        })
      } else {
        const cluster = clusters.get(id)
        cluster.positions.push(pos)
        cluster.minX = Math.min(cluster.minX, pos.x)
        cluster.maxX = Math.max(cluster.maxX, pos.x)
        cluster.avgY = (cluster.avgY + pos.y) / 2
      }
    })

    clusters.forEach((cluster, id) => {
      const intensity = Math.min(0.6, cluster.positions.length / 24)
      ctxInstance.strokeStyle = `rgba(255, 196, 128, ${0.2 + intensity})`
      ctxInstance.beginPath()
      cluster.positions.forEach((pos, idx) => {
        if (idx === 0) ctxInstance.moveTo(pos.x, pos.y)
        else ctxInstance.lineTo(pos.x, pos.y)
      })
      ctxInstance.stroke()

      ctxInstance.fillStyle = `rgba(255, 210, 140, ${0.06 + intensity})`
      ctxInstance.fillRect(cluster.minX - 14, 0, (cluster.maxX - cluster.minX) + 28, dimensions.height)
    })

    ctxInstance.restore()
  }, [dimensions.height])

  const drawWords = useCallback((ctxInstance, positions) => {
    const words = new Map()
    positions.forEach(pos => {
      if (!pos.event.wordId) return
      const id = pos.event.wordId
      if (!words.has(id)) {
        words.set(id, {
          minX: pos.x,
          maxX: pos.x,
          minY: pos.y,
          maxY: pos.y,
          positions: [pos]
        })
      } else {
        const word = words.get(id)
        word.minX = Math.min(word.minX, pos.x)
        word.maxX = Math.max(word.maxX, pos.x)
        word.minY = Math.min(word.minY, pos.y)
        word.maxY = Math.max(word.maxY, pos.y)
        word.positions.push(pos)
      }
    })

    ctxInstance.save()
    ctxInstance.lineWidth = 1.2
    words.forEach(word => {
      if (word.positions.length < 2) return
      ctxInstance.strokeStyle = 'rgba(153, 255, 204, 0.45)'
      ctxInstance.beginPath()
      ctxInstance.roundRect(
        word.minX - 18,
        word.minY - 24,
        (word.maxX - word.minX) + 36,
        (word.maxY - word.minY) + 48,
        9
      )
      ctxInstance.stroke()
    })
    ctxInstance.restore()
  }, [])

  const drawFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0 || dimensions.height === 0) return

    layoutEvents()
    const { columns, cellWidth, cellHeight, marginX, marginY, maxRows } = layoutConfigRef.current
    const positions = positionsRef.current

    ctx.fillStyle = 'rgba(0, 2, 8, 0.18)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    ctx.strokeStyle = 'rgba(102, 255, 204, 0.08)'
    ctx.lineWidth = 1
    for (let c = 0; c <= columns; c++) {
      const x = marginX + c * cellWidth
      ctx.beginPath()
      ctx.moveTo(x, marginY * 0.4)
      ctx.lineTo(x, dimensions.height - marginY * 0.4)
      ctx.stroke()
    }
    for (let r = 0; r <= maxRows; r++) {
      const y = dimensions.height - marginY - r * cellHeight
      ctx.beginPath()
      ctx.moveTo(marginX * 0.6, y)
      ctx.lineTo(dimensions.width - marginX * 0.6, y)
      ctx.stroke()
    }

    if (mode === 'trace') {
      drawTraceLines(ctx, positions)
    } else if (mode === 'cadence') {
      drawCadence(ctx, positions)
    } else if (mode === 'syntax') {
      drawWords(ctx, positions)
    }

    positions.forEach((pos, idx) => {
      const recency = idx / Math.max(1, positions.length - 1)
      const alpha = 0.35 + (1 - recency) * 0.55
      const bgAlpha = 0.18 + (1 - recency) * 0.15
      ctx.fillStyle = `rgba(1, 12, 22, ${bgAlpha})`
      ctx.beginPath()
      ctx.roundRect(
        pos.x - cellWidth / 2 + 4,
        pos.y - cellHeight / 2 + 6,
        cellWidth - 8,
        cellHeight - 12,
        6
      )
      ctx.fill()

      ctx.fillStyle = colorForChar(pos.event.char, alpha, idx)
      ctx.font = `${Math.min(30, cellHeight * 0.62)}px 'IBM Plex Mono', 'Fira Code', monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(pos.event.symbol, pos.x, pos.y)
    })

    hoverRef.current = null
    if (mouse.isInBounds && positions.length) {
      const pointer = mouse.positionRef.current
      let closest = null
      let minDist = Infinity
      positions.forEach(pos => {
        const dx = pos.x - pointer.x
        const dy = pos.y - pointer.y
        const dist = dx * dx + dy * dy
        if (dist < minDist) {
          minDist = dist
          closest = pos
        }
      })
      if (closest && Math.sqrt(minDist) < cellWidth) {
        hoverRef.current = closest
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(closest.x, closest.y, Math.max(18, cellWidth * 0.45), 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    const hoverKey = hoverRef.current?.event?.id ?? null
    if (hoverKeyRef.current !== hoverKey) {
      hoverKeyRef.current = hoverKey
      forceHoverVersion(v => v + 1)
    }
  }, [ctx, dimensions.height, dimensions.width, drawCadence, drawTraceLines, drawWords, layoutEvents, mode, mouse.isInBounds, mouse.positionRef, forceHoverVersion])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let frameId
    const animate = () => {
      drawFrame()
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, drawFrame])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    setMessage(MODE_MESSAGES[nextMode])
  }, [])

  const tailGlyphs = useMemo(() => {
    const slice = eventsRef.current.slice(-28).map(e => e.symbol).join('')
    return slice || 'type to seed the cascade'
  }, [stats])

  const controls = [
    { id: 'rewind', label: 'rewind.step()', onClick: handleBackspace },
    { id: 'rewindWord', label: 'rewind.word()', onClick: handleWordRewind },
    { id: 'scramble', label: 'scramble.columns()', onClick: handleScramble },
    { id: 'clear', label: 'clear.tape()', onClick: handleClear, variant: 'reset' }
  ]

  const metrics = useMemo(() => ([
    { label: 'glyphs', value: stats.glyphs },
    { label: 'unique', value: stats.unique },
    { label: 'words', value: stats.words },
    { label: 'cadence', value: stats.cadence }
  ]), [stats])

  const hoveredInfo = hoverRef.current

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
        <p className="text-void-green/60 text-xs font-mono max-w-xl text-right">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-text"
          data-testid="lexicon-cascade-canvas"
        />

        <div className="absolute left-3 right-3 bottom-3 sm:left-6 sm:right-6 sm:bottom-6 pointer-events-none">
          <div className="text-void-cyan/60 text-xs sm:text-sm font-mono overflow-hidden text-ellipsis whitespace-nowrap">
            {tailGlyphs}
          </div>
        </div>

        {hoveredInfo && (
          <div
            className="absolute pointer-events-none text-[11px] sm:text-xs font-mono px-2 py-1 bg-void-dark/80 border border-void-green/30 text-void-green/80"
            style={{
              left: Math.min(Math.max(hoveredInfo.x + 12, 8), dimensions.width - 160),
              top: Math.min(Math.max(hoveredInfo.y - 24, 8), dimensions.height - 50)
            }}
          >
            <div>glyph: {hoveredInfo.event.symbol}</div>
            <div>cluster: {hoveredInfo.event.clusterId ?? 0}</div>
            <div>word: {hoveredInfo.event.wordId ?? '—'}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LexiconCascade
