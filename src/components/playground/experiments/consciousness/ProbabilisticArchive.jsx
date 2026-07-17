import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const BIT_COUNT = 160
const GRID_COLS = 20
const GRID_ROWS = BIT_COUNT / GRID_COLS
const MAX_COUNT = 7

const MODES = [
  { id: 'inscribe', label: 'inscribe()' },
  { id: 'query', label: 'query()' },
  { id: 'forget', label: 'forget()' }
]

const SEEDS = [0x811c9dc5, 0x45d9f3b, 0x27d4eb2d, 0x9e3779b9]
const SAMPLE_WORDS = [
  'computronium',
  'sunbeam',
  'hypergraph',
  'archive',
  'salt',
  'dream',
  'threshold',
  'signal',
  'lantern',
  'absence'
]

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim()

const hashWord = (word, seed) => {
  let hash = seed >>> 0
  for (let i = 0; i < word.length; i++) {
    hash ^= word.charCodeAt(i)
    hash = Math.imul(hash, 16777619) >>> 0
    hash ^= hash >>> 13
  }
  return hash >>> 0
}

const hashIndices = (word) => {
  const clean = normalize(word) || 'empty'
  const seen = new Set()

  SEEDS.forEach((seed, index) => {
    const h = hashWord(`${clean}:${index}`, seed)
    seen.add(h % BIT_COUNT)
  })

  return [...seen]
}

const countSetBits = (counts) => counts.reduce((total, value) => total + (value > 0 ? 1 : 0), 0)

const getLayout = (width, height) => {
  const marginX = Math.max(18, Math.min(54, width * 0.06))
  const marginY = Math.max(26, Math.min(58, height * 0.08))
  const availableW = Math.max(120, width - marginX * 2)
  const availableH = Math.max(120, height - marginY * 2 - 76)
  const cell = Math.max(13, Math.min(30, Math.min(availableW / GRID_COLS, availableH / GRID_ROWS)))
  const gridW = cell * GRID_COLS
  const gridH = cell * GRID_ROWS

  return {
    cell,
    gridW,
    gridH,
    x: (width - gridW) / 2,
    y: Math.max(28, (height - gridH) * 0.38),
    intakeY: Math.min(height - 34, Math.max(height - 86, (height + gridH) * 0.5 + 42))
  }
}

const bitCenter = (layout, index) => {
  const col = index % GRID_COLS
  const row = Math.floor(index / GRID_COLS)
  return {
    x: layout.x + col * layout.cell + layout.cell / 2,
    y: layout.y + row * layout.cell + layout.cell / 2
  }
}

const ProbabilisticArchive = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('inscribe')
  const [input, setInput] = useState('computronium wants a body')
  const [bitCounts, setBitCounts] = useState(() => Array(BIT_COUNT).fill(0))
  const [knownWords, setKnownWords] = useState([])
  const [message, setMessage] = useState('type a phrase; the archive will remember by losing detail')
  const [ghosts, setGhosts] = useState(0)
  const [lastQuery, setLastQuery] = useState({ word: 'none', result: 'waiting' })
  const [revision, setRevision] = useState(0)

  const flashesRef = useRef([])
  const frameRef = useRef(0)
  const ledgerRef = useRef([])

  const pushLedger = useCallback((entry) => {
    ledgerRef.current = [entry, ...ledgerRef.current].slice(0, 6)
  }, [])

  const emitHashes = useCallback((word, indices, hue, kind) => {
    indices.forEach((index, order) => {
      flashesRef.current.push({
        index,
        hue: hue + order * 19,
        life: 1,
        word,
        kind,
        delay: order * 5
      })
    })
  }, [])

  const inscribeWord = useCallback((rawValue = input) => {
    const word = normalize(rawValue)
    if (!word) {
      setMessage('the archive rejects blank breath')
      return
    }

    const indices = hashIndices(word)
    setBitCounts(prev => {
      const next = [...prev]
      indices.forEach(index => {
        next[index] = Math.min(MAX_COUNT, next[index] + 1)
      })
      return next
    })

    setKnownWords(prev => prev.includes(word) ? prev : [word, ...prev].slice(0, 24))
    setLastQuery({ word, result: 'stored' })
    setMessage(`"${word}" compressed into ${indices.length} bright teeth`)
    pushLedger(`+ ${word}`)
    emitHashes(word, indices, 154, 'inscribe')
    setRevision(value => value + 1)
  }, [emitHashes, input, pushLedger])

  const queryWord = useCallback((rawValue = input) => {
    const word = normalize(rawValue)
    if (!word) {
      setMessage('ask with a shape, not a hollow')
      return
    }

    const indices = hashIndices(word)
    const present = indices.every(index => bitCounts[index] > 0)
    const known = knownWords.includes(word)
    const result = present ? (known ? 'remembered' : 'ghost') : 'absent'
    if (result === 'ghost') setGhosts(value => value + 1)

    setLastQuery({ word, result })
    setMessage(
      result === 'remembered'
        ? `"${word}" returns with all hash marks intact`
        : result === 'ghost'
        ? `"${word}" was never stored, yet the bits answer yes`
        : `"${word}" falls through the unset teeth`
    )
    pushLedger(`? ${word} -> ${result}`)
    emitHashes(word, indices, result === 'absent' ? 12 : result === 'ghost' ? 306 : 190, result)
    setRevision(value => value + 1)
  }, [bitCounts, emitHashes, input, knownWords, pushLedger])

  const decayArchive = useCallback(() => {
    setBitCounts(prev => prev.map(value => {
      if (value <= 0) return 0
      return Math.random() > 0.66 ? value - 1 : value
    }))
    setMessage('counting bits cooled; memory sheds one possible skin')
    pushLedger('- stochastic decay')
    setRevision(value => value + 1)
  }, [pushLedger])

  const clearArchive = useCallback(() => {
    setBitCounts(Array(BIT_COUNT).fill(0))
    setKnownWords([])
    setGhosts(0)
    setLastQuery({ word: 'none', result: 'waiting' })
    ledgerRef.current = []
    flashesRef.current = []
    setMessage('archive washed clean; absence has its own shine')
    setRevision(value => value + 1)
  }, [])

  const sampleQuery = useCallback(() => {
    const word = SAMPLE_WORDS[Math.floor(Math.random() * SAMPLE_WORDS.length)]
    setInput(word)
    queryWord(word)
  }, [queryWord])

  const handleSubmit = useCallback(() => {
    if (mode === 'inscribe') inscribeWord()
    if (mode === 'query') queryWord()
    if (mode === 'forget') decayArchive()
  }, [decayArchive, inscribeWord, mode, queryWord])

  const handleCanvasClick = useCallback((e) => {
    if (mode !== 'forget') return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const layout = getLayout(dimensions.width, dimensions.height)
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const col = Math.floor((x - layout.x) / layout.cell)
    const row = Math.floor((y - layout.y) / layout.cell)

    if (col < 0 || row < 0 || col >= GRID_COLS || row >= GRID_ROWS) return

    const index = row * GRID_COLS + col
    setBitCounts(prev => {
      const next = [...prev]
      next[index] = Math.max(0, next[index] - 1)
      return next
    })
    flashesRef.current.push({ index, hue: 28, life: 1, word: `bit ${index}`, kind: 'forget', delay: 0 })
    setMessage(`bit ${index} hand-forgotten by one count`)
    pushLedger(`- bit ${index}`)
    setRevision(value => value + 1)
  }, [canvasRef, dimensions.height, dimensions.width, mode, pushLedger])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('click', handleCanvasClick)
    return () => canvas.removeEventListener('click', handleCanvasClick)
  }, [canvasRef, handleCanvasClick])

  const drawBackground = useCallback((ctxInstance, w, h) => {
    const gradient = ctxInstance.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, '#02040b')
    gradient.addColorStop(0.48, '#07120f')
    gradient.addColorStop(1, '#030307')
    ctxInstance.fillStyle = gradient
    ctxInstance.fillRect(0, 0, w, h)

    const t = frameRef.current * 0.01
    for (let i = 0; i < 9; i++) {
      const y = ((i + 1) / 10) * h + Math.sin(t + i) * 8
      ctxInstance.strokeStyle = `rgba(102, 255, 204, ${0.025 + (i % 3) * 0.012})`
      ctxInstance.lineWidth = 1
      ctxInstance.beginPath()
      ctxInstance.moveTo(0, y)
      ctxInstance.bezierCurveTo(w * 0.28, y - 22, w * 0.66, y + 24, w, y - 5)
      ctxInstance.stroke()
    }
  }, [])

  const drawArchive = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const w = dimensions.width
    const h = dimensions.height
    const layout = getLayout(w, h)
    const t = frameRef.current++

    drawBackground(ctx, w, h)

    const activeFlashes = flashesRef.current
      .map(flash => ({ ...flash, delay: flash.delay - 1 }))
      .filter(flash => flash.life > 0.015 || flash.delay > 0)

    flashesRef.current = activeFlashes

    const activeIndex = new Map()
    activeFlashes.forEach(flash => {
      if (flash.delay <= 0) {
        activeIndex.set(flash.index, Math.max(activeIndex.get(flash.index) ?? 0, flash.life))
      }
    })

    ctx.save()
    ctx.translate(layout.x, layout.y)
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const index = row * GRID_COLS + col
        const count = bitCounts[index]
        const flash = activeIndex.get(index) ?? 0
        const x = col * layout.cell
        const y = row * layout.cell
        const pad = Math.max(2, layout.cell * 0.12)
        const heat = count / MAX_COUNT
        const light = 9 + heat * 42 + flash * 24
        const hue = count > 0 ? 146 + heat * 52 : 208

        ctx.fillStyle = `hsla(${hue}, ${count > 0 ? 76 : 38}%, ${light}%, ${0.72 + flash * 0.2})`
        ctx.fillRect(x + pad, y + pad, layout.cell - pad * 2, layout.cell - pad * 2)

        if (count > 0) {
          ctx.strokeStyle = `hsla(${hue + 28}, 90%, 72%, ${0.15 + heat * 0.38 + flash * 0.32})`
          ctx.lineWidth = 1 + flash * 2
          ctx.strokeRect(x + pad, y + pad, layout.cell - pad * 2, layout.cell - pad * 2)
        }

        if (layout.cell > 18 && count > 0) {
          ctx.fillStyle = `rgba(240, 255, 230, ${0.36 + heat * 0.42})`
          ctx.font = `${Math.max(9, layout.cell * 0.42)}px "JetBrains Mono", monospace`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(count), x + layout.cell / 2, y + layout.cell / 2 + 0.5)
        }
      }
    }
    ctx.restore()

    activeFlashes.forEach(flash => {
      if (flash.delay > 0) return

      const center = bitCenter(layout, flash.index)
      const sourceX = w / 2 + Math.sin((flash.index + t) * 0.09) * Math.min(110, w * 0.18)
      const sourceY = layout.intakeY
      const alpha = flash.life

      ctx.strokeStyle = `hsla(${flash.hue}, 92%, 68%, ${alpha * 0.42})`
      ctx.lineWidth = 1.4 + alpha * 2.6
      ctx.beginPath()
      ctx.moveTo(sourceX, sourceY)
      ctx.quadraticCurveTo(
        (sourceX + center.x) / 2,
        Math.min(sourceY, center.y) - 44 - Math.sin(t * 0.04 + flash.index) * 14,
        center.x,
        center.y
      )
      ctx.stroke()

      ctx.beginPath()
      ctx.strokeStyle = `hsla(${flash.hue}, 95%, 74%, ${alpha * 0.72})`
      ctx.arc(center.x, center.y, 6 + (1 - alpha) * 18, 0, Math.PI * 2)
      ctx.stroke()

      flash.life *= 0.925
    })

    const plateW = Math.min(520, w - 28)
    const plateX = (w - plateW) / 2
    const plateY = layout.intakeY - 20
    ctx.fillStyle = 'rgba(3, 10, 12, 0.72)'
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.18)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(plateX, plateY, plateW, 42, 8)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = lastQuery.result === 'ghost'
      ? 'rgba(255, 120, 230, 0.86)'
      : lastQuery.result === 'absent'
      ? 'rgba(255, 170, 110, 0.82)'
      : 'rgba(180, 255, 225, 0.82)'
    ctx.font = '12px "JetBrains Mono", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${lastQuery.result}: ${lastQuery.word}`, w / 2, plateY + 21)

    if (ledgerRef.current.length > 0) {
      ctx.textAlign = 'left'
      ctx.font = '11px "JetBrains Mono", monospace'
      ledgerRef.current.forEach((entry, index) => {
        ctx.fillStyle = `rgba(102, 255, 204, ${0.58 - index * 0.07})`
        ctx.fillText(entry, 18, 25 + index * 16)
      })
    }
  }, [bitCounts, ctx, dimensions.height, dimensions.width, drawBackground, lastQuery])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return

    let frameId
    const animate = () => {
      drawArchive()
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, drawArchive])

  const controls = [
    {
      id: 'submit',
      label: mode === 'query' ? 'ask()' : mode === 'forget' ? 'decay()' : 'store()',
      onClick: handleSubmit,
      active: mode !== 'forget'
    },
    {
      id: 'sample',
      label: 'ghost.test()',
      onClick: sampleQuery
    },
    {
      id: 'decay',
      label: 'cool.bits()',
      onClick: decayArchive
    },
    {
      id: 'clear',
      label: 'clear()',
      onClick: clearArchive,
      variant: 'reset'
    }
  ]

  const metrics = useMemo(() => {
    const setBits = countSetBits(bitCounts)
    const load = Math.round((setBits / BIT_COUNT) * 100)

    return [
      { label: 'words', value: knownWords.length },
      { label: 'load', value: `${load}%` },
      { label: 'bits', value: `${setBits}/${BIT_COUNT}` },
      { label: 'ghosts', value: ghosts },
      { label: 'mode', value: mode }
    ]
  }, [bitCounts, ghosts, knownWords.length, mode, revision])

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

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={setMode}
          controls={controls}
        />

        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto lg:max-w-xl">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="min-h-[44px] flex-1 lg:w-80 bg-void-dark/80 border border-void-green/20 rounded px-3 py-2 text-void-green/90 text-sm font-mono focus:outline-none focus:border-void-cyan/50 placeholder:text-void-green/30"
            placeholder="word or phrase"
            data-testid="probabilistic-archive-input"
          />
          <p className="min-h-[44px] flex items-center text-void-green/55 text-xs font-mono break-words lg:w-72">
            {message}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full ${mode === 'forget' ? 'cursor-cell' : 'cursor-crosshair'}`}
          data-testid="probabilistic-archive-canvas"
        />

        <div className="absolute right-3 bottom-3 sm:right-5 sm:bottom-5 max-w-xs bg-void-dark/68 border border-void-green/20 px-3 py-2 text-[11px] text-void-green/60 font-mono backdrop-blur-sm">
          bloom filter memory: store sets hash bits // query tests all marks // forget mode lets single cells cool
        </div>
      </div>
    </div>
  )
}

export default ProbabilisticArchive
