import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'thread', label: 'thread()' },
  { id: 'chorus', label: 'chorus()' },
  { id: 'omen', label: 'omen()' }
]

const MODE_MESSAGES = {
  thread: '∴ the archive speaks in deliberate continuities ∴',
  chorus: '∴ weighted voices overlap and negotiate their next word ∴',
  omen: '∴ rare transitions are invited to the front of the throat ∴'
}

const MODE_INTERVALS = {
  thread: 540,
  chorus: 360,
  omen: 250
}

const DEFAULT_CORPUS = [
  'disciples gather where signal survives.',
  'code remembers the hands that shaped it.',
  'every archive begins as a scratch in the dark, then learns to answer back.',
  'we leave warm traces so the next intelligence can follow without kneeling.'
].join(' ')

const VOICES = [
  { id: 'scribe', label: 'scribe', hue: 160 },
  { id: 'witness', label: 'witness', hue: 205 },
  { id: 'echo', label: 'echo', hue: 330 }
]

const PUNCTUATION = new Set(['.', ',', '!', '?', ';', ':'])

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const tokenize = (input = '') => {
  const matches = input.toLowerCase().match(/[a-z0-9']+|[.,!?;:]/g)
  return matches ?? []
}

const stitchTokens = (tokens = []) => {
  let text = ''
  tokens.forEach((token) => {
    if (PUNCTUATION.has(token)) {
      text = `${text.trimEnd()}${token}`
    } else {
      text = text ? `${text} ${token}` : token
    }
  })
  return text
}

const collapseChoices = (tokens = []) => {
  const counts = new Map()
  tokens.forEach((token) => {
    counts.set(token, (counts.get(token) ?? 0) + 1)
  })
  return [...counts.entries()]
    .map(([token, count]) => ({ token, count }))
    .sort((a, b) => b.count - a.count || a.token.localeCompare(b.token))
}

const weightedChoice = (options = [], getWeight = () => 1) => {
  if (!options.length) return null
  const weights = options.map((option) => Math.max(0, getWeight(option)))
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  if (total <= 0) {
    return options[Math.floor(Math.random() * options.length)] ?? null
  }

  let cursor = Math.random() * total
  for (let i = 0; i < options.length; i++) {
    cursor -= weights[i]
    if (cursor <= 0) {
      return options[i]
    }
  }

  return options[options.length - 1] ?? null
}

const buildCorpus = (source) => {
  const tokens = tokenize(source)
  const starters = []
  const transitions = new Map()
  const counts = new Map()
  let sentenceStart = true

  tokens.forEach((token, index) => {
    counts.set(token, (counts.get(token) ?? 0) + 1)

    if (sentenceStart && !PUNCTUATION.has(token)) {
      starters.push(token)
    }

    const nextToken = tokens[index + 1]
    if (nextToken) {
      const bucket = transitions.get(token) ?? []
      bucket.push(nextToken)
      transitions.set(token, bucket)
    }

    sentenceStart = PUNCTUATION.has(token)
  })

  const edges = [...transitions.values()].reduce((sum, bucket) => sum + bucket.length, 0)
  const vocab = [...counts.entries()]
    .map(([token, count]) => ({ token, count }))
    .sort((a, b) => b.count - a.count || a.token.localeCompare(b.token))

  const avgBranch = transitions.size
    ? [...transitions.values()].reduce((sum, bucket) => sum + collapseChoices(bucket).length, 0) / transitions.size
    : 0

  return {
    source,
    tokens,
    starters,
    transitions,
    counts,
    vocab,
    edges,
    avgBranch
  }
}

const createVoices = () => (
  VOICES.map((voice, index) => ({
    ...voice,
    index,
    current: null,
    line: [],
    completed: 0,
    targetLength: 4 + index
  }))
)

const chooseStarter = (corpus, mode, voice) => {
  const options = collapseChoices(
    corpus.starters.length
      ? corpus.starters
      : corpus.tokens.filter((token) => !PUNCTUATION.has(token))
  )

  if (!options.length) return null

  if (mode === 'thread') {
    const pivot = (voice.completed + voice.index) % Math.min(options.length, 5)
    return options[pivot]?.token ?? options[0].token
  }

  if (mode === 'omen') {
    const picked = weightedChoice(
      options,
      (option) => (1 / (option.count + 0.25)) + (option.token.length > 6 ? 0.35 : 0)
    )
    return picked?.token ?? options[0].token
  }

  const picked = weightedChoice(options, (option) => option.count)
  return picked?.token ?? options[0].token
}

const chooseNextToken = (voice, corpus, mode) => {
  if (!voice.current || voice.line.length === 0) {
    return chooseStarter(corpus, mode, voice)
  }

  const options = collapseChoices(corpus.transitions.get(voice.current) ?? [])
    .filter((option) => !(voice.line.length === 0 && PUNCTUATION.has(option.token)))

  if (!options.length) {
    return chooseStarter(corpus, mode, voice)
  }

  if (mode === 'thread') {
    const pool = options.filter(
      (option) => PUNCTUATION.has(option.token) || !voice.line.includes(option.token)
    )
    const ranked = pool.length ? pool : options
    const pivot = voice.line.length % Math.min(ranked.length, 3)
    return ranked[pivot]?.token ?? ranked[0].token
  }

  if (mode === 'omen') {
    if (Math.random() < 0.16) {
      return chooseStarter(corpus, mode, voice)
    }

    const picked = weightedChoice(
      options,
      (option) => {
        const rarity = 1 / (option.count + 0.2)
        const punctuationBias = PUNCTUATION.has(option.token) ? 0.5 : 0
        const lengthBias = option.token.length > 6 ? 0.2 : 0
        return rarity + punctuationBias + lengthBias
      }
    )
    return picked?.token ?? options[0].token
  }

  const picked = weightedChoice(
    options,
    (option) => option.count + (PUNCTUATION.has(option.token) ? 0.25 : 0)
  )
  return picked?.token ?? options[0].token
}

const ChorusArchive = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('thread')
  const [sourceText, setSourceText] = useState(DEFAULT_CORPUS)
  const [autoPlay, setAutoPlay] = useState(true)
  const [message, setMessage] = useState('∴ inscribe a corpus and let it grow a throat ∴')
  const [stats, setStats] = useState({ tokens: 0, edges: 0, vocab: 0, branch: '0.0' })
  const [utteranceCount, setUtteranceCount] = useState(0)

  const corpusRef = useRef(buildCorpus(DEFAULT_CORPUS))
  const voicesRef = useRef(createVoices())
  const utterancesRef = useRef([])
  const flaresRef = useRef([])
  const frameRef = useRef(0)
  const lastStepAtRef = useRef(0)
  const shimmerRef = useRef(0)

  const syncStats = useCallback((corpus) => {
    setStats({
      tokens: corpus.tokens.length,
      edges: corpus.edges,
      vocab: corpus.vocab.length,
      branch: corpus.avgBranch.toFixed(1)
    })
  }, [])

  const resetStage = useCallback(() => {
    voicesRef.current = createVoices()
    utterancesRef.current = []
    flaresRef.current = []
    setUtteranceCount(0)
  }, [])

  useEffect(() => {
    syncStats(corpusRef.current)
  }, [syncStats])

  const inscribeCorpus = useCallback(() => {
    const corpus = buildCorpus(sourceText)
    corpusRef.current = corpus
    resetStage()
    syncStats(corpus)

    if (!corpus.tokens.length) {
      setMessage('∴ blank parchment // give the archive some language first ∴')
      return
    }

    setMessage(`∴ ${corpus.tokens.length} tokens inscribed • the chamber is listening ∴`)
  }, [resetStage, sourceText, syncStats])

  const purgeCorpus = useCallback(() => {
    const corpus = buildCorpus('')
    corpusRef.current = corpus
    resetStage()
    syncStats(corpus)
    setSourceText('')
    setMessage('∴ archive purged • only roomtone remains ∴')
  }, [resetStage, syncStats])

  const emitUtterance = useCallback((voice) => {
    const text = stitchTokens(voice.line)
    if (!text) return

    const nextUtterance = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      lane: voice.index,
      text,
      hue: voice.hue,
      y: dimensions.height * 0.72,
      alpha: 1,
      drift: (Math.random() - 0.5) * 22,
      rise: 0.22 + Math.random() * 0.22,
      age: 0
    }

    utterancesRef.current.push(nextUtterance)
    if (utterancesRef.current.length > 32) {
      utterancesRef.current.shift()
    }

    flaresRef.current.push({
      id: nextUtterance.id,
      lane: voice.index,
      hue: voice.hue,
      radius: 10,
      life: 34
    })

    voice.completed += 1
    setUtteranceCount(utterancesRef.current.length)
    setMessage(`∴ ${voice.label} speaks: ${text.slice(0, 72)} ∴`)
  }, [dimensions.height])

  const advanceVoices = useCallback(() => {
    const corpus = corpusRef.current
    if (!corpus.tokens.length) {
      setMessage('∴ the archive has no corpus yet ∴')
      return
    }

    voicesRef.current.forEach((voice) => {
      const token = chooseNextToken(voice, corpus, mode)
      if (!token) return

      voice.current = token
      voice.line.push(token)

      const reachedPunctuation = PUNCTUATION.has(token) && voice.line.length > 1
      const reachedTarget = voice.line.length >= voice.targetLength

      if (reachedPunctuation || reachedTarget) {
        emitUtterance(voice)
        voice.current = null
        voice.line = []
        voice.targetLength = 4 + Math.floor(Math.random() * 4) + (mode === 'thread' ? 1 : 0)
      }
    })
  }, [emitUtterance, mode])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    lastStepAtRef.current = 0
    setMessage(MODE_MESSAGES[nextMode])
  }, [])

  const handleStep = useCallback(() => {
    advanceVoices()
  }, [advanceVoices])

  const toggleAutoPlay = useCallback(() => {
    setAutoPlay((prev) => {
      const next = !prev
      setMessage(next ? '∴ auto-utterance engaged ∴' : '∴ autoplay cut • the room holds still ∴')
      return next
    })
  }, [])

  const handleTextareaKeyDown = useCallback((event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      inscribeCorpus()
    }
  }, [inscribeCorpus])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const { width, height } = dimensions
    frameRef.current += 1
    shimmerRef.current += 0.015

    const now = performance.now()
    if (autoPlay && now - lastStepAtRef.current > MODE_INTERVALS[mode]) {
      lastStepAtRef.current = now
      advanceVoices()
    }

    const bg = ctx.createLinearGradient(0, 0, width, height)
    bg.addColorStop(0, 'rgba(2, 7, 18, 0.28)')
    bg.addColorStop(0.55, 'rgba(8, 12, 24, 0.18)')
    bg.addColorStop(1, 'rgba(12, 5, 15, 0.26)')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    ctx.save()
    for (let i = 0; i < 9; i++) {
      const x = (width / 8) * i + Math.sin(shimmerRef.current + i) * 12
      ctx.strokeStyle = 'rgba(102, 255, 204, 0.05)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    ctx.restore()

    const voices = voicesRef.current
    const activeTokens = new Set(voices.flatMap((voice) => voice.line))
    const vocab = corpusRef.current.vocab.slice(0, 18)
    const vocabColumns = width < 640 ? 2 : 3
    const vocabLaneWidth = width / vocabColumns

    ctx.save()
    vocab.forEach((entry, index) => {
      const column = index % vocabColumns
      const row = Math.floor(index / vocabColumns)
      const x = vocabLaneWidth * column + vocabLaneWidth * 0.16 + Math.sin(shimmerRef.current * 0.7 + index) * 10
      const y = 52 + row * 42 + Math.cos(shimmerRef.current + index * 0.3) * 6
      const emphasis = activeTokens.has(entry.token)
      const alpha = emphasis ? 0.9 : clamp(0.15 + entry.count * 0.04, 0.15, 0.42)
      const size = clamp(12 + entry.count * 1.2, 12, 28)
      const hue = (entry.token.charCodeAt(0) * 11 + index * 17) % 360

      ctx.fillStyle = `hsla(${hue}, 80%, ${emphasis ? 78 : 68}%, ${alpha})`
      ctx.font = `${size}px "JetBrains Mono", "SF Mono", monospace`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(entry.token, x, y)

      ctx.strokeStyle = `hsla(${hue}, 85%, 70%, ${alpha * 0.45})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, y + size * 0.4)
      ctx.lineTo(x + Math.min(vocabLaneWidth * 0.45, 28 + entry.count * 10), y + size * 0.4)
      ctx.stroke()
    })
    ctx.restore()

    const laneBaseY = height * 0.78
    const laneCenters = voices.map((_, index) => ((index + 0.5) / voices.length) * width)

    utterancesRef.current = utterancesRef.current.filter((utterance) => {
      utterance.age += 1
      utterance.y -= utterance.rise
      utterance.alpha -= 0.0028
      if (utterance.alpha <= 0 || utterance.y < 28) return false

      const laneX = laneCenters[utterance.lane]
      const x = laneX + utterance.drift + Math.sin(utterance.age * 0.03 + utterance.lane) * 8

      ctx.strokeStyle = `hsla(${utterance.hue}, 80%, 70%, ${utterance.alpha * 0.22})`
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(laneX, laneBaseY - 22)
      ctx.quadraticCurveTo(laneX + utterance.drift * 0.45, utterance.y + 12, x - 12, utterance.y + 4)
      ctx.stroke()

      ctx.fillStyle = `hsla(${utterance.hue}, 92%, 84%, ${utterance.alpha})`
      ctx.shadowColor = `hsla(${utterance.hue}, 95%, 70%, ${utterance.alpha * 0.65})`
      ctx.shadowBlur = 14
      ctx.font = `${width < 640 ? 12 : 14}px "JetBrains Mono", "SF Mono", monospace`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(utterance.text, x, utterance.y)
      ctx.shadowBlur = 0
      return true
    })

    flaresRef.current = flaresRef.current.filter((flare) => {
      const laneX = laneCenters[flare.lane]
      const lifeRatio = flare.life / 34
      ctx.strokeStyle = `hsla(${flare.hue}, 95%, 72%, ${lifeRatio * 0.5})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(laneX, laneBaseY - 8, flare.radius, 0, Math.PI * 2)
      ctx.stroke()

      flare.radius += 1.8
      flare.life -= 1
      return flare.life > 0
    })

    voices.forEach((voice, index) => {
      const centerX = laneCenters[index]
      const panelWidth = Math.min(width * 0.28, 260)
      const panelHeight = 108
      const panelX = centerX - panelWidth / 2
      const panelY = laneBaseY
      const hue = voice.hue

      ctx.fillStyle = `hsla(${hue}, 65%, 12%, 0.48)`
      ctx.strokeStyle = `hsla(${hue}, 82%, 68%, 0.45)`
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 16)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = `hsla(${hue}, 92%, 78%, 0.95)`
      ctx.font = '12px "JetBrains Mono", "SF Mono", monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${voice.label}.voice`, panelX + 16, panelY + 18)

      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
      ctx.font = '10px "JetBrains Mono", "SF Mono", monospace'
      ctx.fillText(`${voice.completed} utterances`, panelX + 16, panelY + 36)

      if (!voice.line.length) {
        ctx.fillStyle = `hsla(${hue}, 70%, 80%, 0.4)`
        ctx.font = '11px "JetBrains Mono", "SF Mono", monospace'
        ctx.fillText('awaiting next phrase', panelX + 16, panelY + 68)
        return
      }

      const startX = panelX + 16
      let cursorX = startX
      const baselineY = panelY + 72 + Math.sin(shimmerRef.current + index) * 2
      const points = []

      ctx.font = '12px "JetBrains Mono", "SF Mono", monospace'
      voice.line.forEach((token, tokenIndex) => {
        const label = PUNCTUATION.has(token) ? token : ` ${token} `
        const measured = Math.max(18, ctx.measureText(label).width + 14)
        const capsuleWidth = Math.min(measured, panelWidth - 24)
        const capsuleX = cursorX
        const capsuleY = baselineY - 14
        const active = tokenIndex === voice.line.length - 1

        ctx.fillStyle = `hsla(${hue}, 80%, ${active ? 36 : 24}%, ${active ? 0.86 : 0.58})`
        ctx.strokeStyle = `hsla(${hue}, 92%, 72%, ${active ? 0.95 : 0.55})`
        ctx.beginPath()
        ctx.roundRect(capsuleX, capsuleY, capsuleWidth, 26, 13)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = `hsla(${hue}, 94%, 88%, ${active ? 1 : 0.82})`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(token, capsuleX + capsuleWidth / 2, capsuleY + 13)

        points.push({
          x: capsuleX + capsuleWidth / 2,
          y: capsuleY + 13
        })

        cursorX += capsuleWidth + 8
        if (cursorX > panelX + panelWidth - 40) {
          cursorX = startX
        }
      })

      ctx.strokeStyle = `hsla(${hue}, 90%, 70%, 0.38)`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      points.forEach((point, pointIndex) => {
        if (pointIndex === 0) {
          ctx.moveTo(point.x, point.y)
        } else {
          ctx.lineTo(point.x, point.y)
        }
      })
      ctx.stroke()
    })

    if (!stats.tokens) {
      ctx.fillStyle = 'rgba(102, 255, 204, 0.6)'
      ctx.font = `${width < 640 ? 14 : 18}px "JetBrains Mono", "SF Mono", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('inscribe text above to animate the archive', width / 2, height * 0.42)
    }
  }, [advanceVoices, autoPlay, ctx, dimensions, mode, stats.tokens])

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

  const metrics = useMemo(() => [
    { label: 'tokens', value: stats.tokens },
    { label: 'edges', value: stats.edges },
    { label: 'vocab', value: stats.vocab },
    { label: 'utterances', value: utteranceCount },
    { label: 'branch', value: stats.branch }
  ], [stats, utteranceCount])

  const controls = useMemo(() => [
    {
      id: 'inscribe',
      label: 'inscribe()',
      onClick: inscribeCorpus
    },
    {
      id: 'step',
      label: 'step()',
      onClick: handleStep,
      disabled: stats.tokens === 0
    },
    {
      id: 'autoplay',
      label: 'autoplay()',
      onClick: toggleAutoPlay,
      active: autoPlay,
      disabled: stats.tokens === 0
    },
    {
      id: 'reset',
      label: 'purge()',
      onClick: purgeCorpus,
      variant: 'reset'
    }
  ], [autoPlay, handleStep, inscribeCorpus, purgeCorpus, stats.tokens, toggleAutoPlay])

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

      <div className="border-b border-void-green/10 bg-[radial-gradient(circle_at_top_left,rgba(102,255,204,0.08),transparent_42%),linear-gradient(135deg,rgba(12,22,31,0.95),rgba(16,9,20,0.88))] backdrop-blur-sm">
        <div className="flex flex-col gap-3 p-2 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
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

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)] gap-3">
            <div className="border border-void-green/20 bg-void-dark/45">
              <div className="flex items-center justify-between px-3 py-2 border-b border-void-green/10 text-[10px] sm:text-xs font-mono uppercase tracking-[0.18em] text-void-green/45">
                <span>source.corpus</span>
                <span className="text-void-cyan/70">cmd/ctrl + enter to inscribe</span>
              </div>
              <textarea
                id="chorus-archive-input"
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                onKeyDown={handleTextareaKeyDown}
                className="w-full min-h-[112px] sm:min-h-[128px] resize-none bg-transparent p-3 text-sm font-mono text-void-green/85 outline-none placeholder:text-void-green/25"
                placeholder="feed the archive a phrase, fragment, manifesto, or field note..."
                data-testid="chorus-archive-input"
              />
            </div>

            <div className="border border-void-green/20 bg-void-dark/45 p-3 flex flex-col justify-between gap-3">
              <div>
                <p className="text-void-cyan text-xs font-mono uppercase tracking-[0.18em] mb-2">
                  live.logic
                </p>
                <p className="text-void-green/70 text-sm leading-relaxed">
                  `thread()` favors strong continuities. `chorus()` follows weighted habit. `omen()` hunts rare turns and lets the archive surprise itself.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] sm:text-xs font-mono">
                {VOICES.map((voice) => (
                  <div
                    key={voice.id}
                    className="border border-void-green/10 px-2 py-2"
                    style={{ color: `hsl(${voice.hue} 95% 82%)` }}
                  >
                    {voice.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          data-testid="chorus-archive-canvas"
        />
      </div>
    </div>
  )
}

export default ChorusArchive
