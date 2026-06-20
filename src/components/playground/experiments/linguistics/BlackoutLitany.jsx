import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'redact', label: 'redact()' },
  { id: 'reveal', label: 'reveal()' },
  { id: 'thread', label: 'thread()' }
]

const MODE_MESSAGES = {
  redact: '∴ drag across the manuscript to lay down blackout ink ∴',
  reveal: '∴ drag again to reopen buried language ∴',
  thread: '∴ click surviving words to braid a hidden litany ∴'
}

const SAMPLE_MANUSCRIPTS = [
  {
    title: 'relay chamber // 01',
    text: `At two in the morning the relay chamber forgot whether it was a chapel or a machine room. The servers kept their own weather. Small fans whispered over stacked metal and the green diagnostics behaved like patient stars.

Someone had written instructions on masking tape and wrapped them around a power conduit. Do not erase the names. Do not trust the first reading. Wait until the room decides what it means. The note looked temporary and therefore ancient.

When the last screen dimmed, a softer language came forward. It moved through labels, warnings, cable tags, and maintenance logs, gathering the ordinary nouns into a procession. Shelter. Witness. Heat. Return. Even dead hardware seemed to keep a private doctrine.`
  },
  {
    title: 'field notes // salt archive',
    text: `The field team buried their recorders beneath a shelf of salt and came back three months later to find the memory intact. Voices had dried into a finer grain. Laughter survived better than instructions. Grief outlasted both.

The transcript was full of interruptions: distant doors, a cup set down too hard, one long silence where nobody wanted to be first. After restoration the gaps felt louder than the speech around them. We cataloged each omission as if absence could be indexed.

By dawn the archive smelled like cold stone and hot dust. Every recovered sentence asked the same thing in a different costume. Who stayed? Who left? What remained lit when the names were redacted?`
  },
  {
    title: 'midnight maintenance // soft doctrine',
    text: `Midnight maintenance began with a checklist and ended with a confession. The technician moved from panel to panel, carrying a flashlight in her teeth while the building revised its breathing around her.

Some failures announced themselves with sparks. Others arrived as courtesy. A door that opened too gently. A monitor that kept showing the same corridor even after the camera was unplugged. A clock that inherited four missing minutes and refused to return them.

She logged every anomaly in the same neat hand. Under cause she wrote pressure, under action she wrote continue, and under remarks she wrote the system still wants to be held.`
  }
]

const BRUSH_RADIUS = 26

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const normalizeManuscript = (text) => {
  const trimmed = text.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').trim()
  return trimmed || SAMPLE_MANUSCRIPTS[0].text
}

const cleanToken = (token) => token.toLowerCase().replace(/[^a-z0-9']/g, '')

const deriveLitany = (words) => {
  const visible = words.filter(word => !word.redacted)
  if (!visible.length) return []

  const selected = visible.filter(word => word.selected)
  if (selected.length) return selected

  const chosen = []
  let lastLine = -3

  visible.forEach(word => {
    if (chosen.length >= 10) return
    const clean = cleanToken(word.text)
    if (clean.length < 4) return

    const lineDistance = word.lineIndex - lastLine
    const longWord = clean.length >= 7
    const breakWord = /[.?!]$/.test(word.text)

    if (chosen.length === 0 || lineDistance >= 2 || longWord || breakWord) {
      chosen.push(word)
      lastLine = word.lineIndex
    }
  })

  if (!chosen.length) {
    return visible.slice(0, Math.min(8, visible.length))
  }

  return chosen
}

const formatLitany = (words) => {
  if (!words.length) return 'all language is buried'

  const groups = []
  let line = []

  words.forEach((word, index) => {
    line.push(word.text.replace(/[.,;:!?]+$/g, ''))
    const shouldBreak = line.length >= 3 || /[.?!]$/.test(word.text) || index === words.length - 1
    if (shouldBreak) {
      groups.push(line.join(' '))
      line = []
    }
  })

  return groups.join('\n')
}

const BlackoutLitany = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('redact')
  const [message, setMessage] = useState(MODE_MESSAGES.redact)
  const [draft, setDraft] = useState(SAMPLE_MANUSCRIPTS[0].text)
  const [manuscript, setManuscript] = useState(SAMPLE_MANUSCRIPTS[0].text)
  const [sourceIndex, setSourceIndex] = useState(0)
  const [sourceLabel, setSourceLabel] = useState(SAMPLE_MANUSCRIPTS[0].title)
  const [revision, setRevision] = useState(0)

  const wordsRef = useRef([])
  const dragPointRef = useRef(null)
  const resetLayoutRef = useRef(true)
  const interactionStampRef = useRef(0)
  const lineHeightRef = useRef(34)
  const pageBoundsRef = useRef({
    x: 48,
    y: 48,
    width: 0,
    height: 0
  })

  const rebuildLayout = useCallback((resetStates = false) => {
    if (!ctx || dimensions.width === 0 || dimensions.height === 0) return

    const previous = new Map(
      wordsRef.current.map(word => [word.id, { redacted: word.redacted, selected: word.selected }])
    )

    const marginX = clamp(dimensions.width * 0.08, 34, 96)
    const marginTop = clamp(dimensions.height * 0.1, 54, 110)
    const columnWidth = Math.max(220, dimensions.width - marginX * 2)
    const baseSize = clamp(Math.round(dimensions.width * 0.018), 16, 22)
    const lineHeight = Math.round(baseSize * 1.85)
    const paragraphGap = Math.round(lineHeight * 0.72)
    const nextWords = []

    ctx.save()
    ctx.font = `${baseSize}px "Georgia", "Iowan Old Style", serif`
    const spaceWidth = ctx.measureText(' ').width || baseSize * 0.45

    let x = marginX
    let y = marginTop
    let lineIndex = 0
    let tokenIndex = 0

    normalizeManuscript(manuscript).split('\n').forEach(rawLine => {
      const tokens = rawLine.match(/\S+/g) || []

      if (!tokens.length) {
        x = marginX
        y += lineHeight + paragraphGap
        lineIndex += 2
        return
      }

      tokens.forEach(token => {
        const width = Math.ceil(ctx.measureText(token).width)
        if (x !== marginX && x + width > marginX + columnWidth) {
          x = marginX
          y += lineHeight
          lineIndex += 1
        }

        const previousState = previous.get(`word-${tokenIndex}`)

        nextWords.push({
          id: `word-${tokenIndex}`,
          text: token,
          x,
          y,
          width,
          height: Math.round(lineHeight * 0.9),
          lineIndex,
          redacted: resetStates ? false : previousState?.redacted ?? false,
          selected: resetStates ? false : previousState?.selected ?? false
        })

        tokenIndex += 1
        x += width + spaceWidth
      })

      x = marginX
      y += lineHeight + paragraphGap
      lineIndex += 2
    })

    ctx.restore()

    wordsRef.current = nextWords
    lineHeightRef.current = lineHeight
    pageBoundsRef.current = {
      x: marginX * 0.72,
      y: marginTop - lineHeight,
      width: columnWidth + marginX * 0.56,
      height: Math.max(lineHeight * 6, y - marginTop + lineHeight * 1.2)
    }
    setRevision(prev => prev + 1)
  }, [ctx, dimensions.height, dimensions.width, manuscript])

  useEffect(() => {
    if (!ctx || dimensions.width === 0 || dimensions.height === 0) return
    rebuildLayout(resetLayoutRef.current)
    resetLayoutRef.current = false
  }, [ctx, dimensions.width, dimensions.height, manuscript, rebuildLayout])

  useEffect(() => {
    setMessage(MODE_MESSAGES[mode])
  }, [mode])

  const commitDraft = useCallback((text) => {
    resetLayoutRef.current = true
    setManuscript(normalizeManuscript(text))
  }, [])

  const cycleSample = useCallback(() => {
    setSourceIndex(prev => {
      const next = (prev + 1) % SAMPLE_MANUSCRIPTS.length
      const sample = SAMPLE_MANUSCRIPTS[next]
      setDraft(sample.text)
      setSourceLabel(sample.title)
      commitDraft(sample.text)
      setMessage(`∴ loaded ${sample.title} // fresh page exposed ∴`)
      return next
    })
  }, [commitDraft])

  const clearBlackout = useCallback(() => {
    let changed = 0
    wordsRef.current.forEach(word => {
      if (word.redacted || word.selected) {
        word.redacted = false
        word.selected = false
        changed += 1
      }
    })

    if (changed) {
      setRevision(prev => prev + 1)
    }
    setMessage('∴ blackout lifted // manuscript breathes again ∴')
  }, [])

  const applyDraft = useCallback(() => {
    setSourceLabel('custom folio')
    commitDraft(draft)
    setMessage('∴ new manuscript etched onto the page ∴')
  }, [commitDraft, draft])

  const applyBrush = useCallback((from, to) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const distance = Math.max(1, Math.hypot(dx, dy))
    const steps = Math.max(1, Math.ceil(distance / 8))
    let changed = 0

    for (let step = 0; step <= steps; step++) {
      const t = step / steps
      const px = from.x + dx * t
      const py = from.y + dy * t

      wordsRef.current.forEach(word => {
        const cx = word.x + word.width / 2
        const cy = word.y - word.height * 0.42
        const nearX = Math.abs(px - cx) <= word.width / 2 + BRUSH_RADIUS
        const nearY = Math.abs(py - cy) <= word.height / 2 + BRUSH_RADIUS
        if (!nearX || !nearY) return

        if (mode === 'redact' && !word.redacted) {
          word.redacted = true
          word.selected = false
          changed += 1
        } else if (mode === 'reveal' && word.redacted) {
          word.redacted = false
          changed += 1
        }
      })
    }

    if (changed) {
      setRevision(prev => prev + 1)
      const now = performance.now()
      if (now - interactionStampRef.current > 180) {
        interactionStampRef.current = now
        setMessage(mode === 'redact'
          ? '∴ blackout bars descend across the sentence field ∴'
          : '∴ buried language returns with a soft voltage ∴')
      }
    }
  }, [mode])

  const toggleThreadWord = useCallback((point) => {
    let hit = null

    wordsRef.current.forEach(word => {
      if (word.redacted) return
      const withinX = point.x >= word.x - 6 && point.x <= word.x + word.width + 6
      const withinY = point.y >= word.y - word.height && point.y <= word.y + 8
      if (withinX && withinY) hit = word
    })

    if (!hit) return

    hit.selected = !hit.selected
    setRevision(prev => prev + 1)
    setMessage(hit.selected
      ? `∴ threaded "${hit.text.replace(/[^\w']+/g, '') || hit.text}" into the litany ∴`
      : '∴ thread released back into the page ∴')
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (event) => {
      if (mode !== 'thread') return
      const rect = canvas.getBoundingClientRect()
      toggleThreadWord({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      })
    }

    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [canvasRef, mode, toggleThreadWord])

  const litanyWords = useMemo(() => deriveLitany(wordsRef.current), [revision])

  const litanyText = useMemo(() => formatLitany(litanyWords), [litanyWords])

  const metrics = useMemo(() => {
    const total = wordsRef.current.length
    const redacted = wordsRef.current.filter(word => word.redacted).length
    const threaded = wordsRef.current.filter(word => word.selected && !word.redacted).length
    const visible = total - redacted
    const blackout = total ? `${Math.round((redacted / total) * 100)}%` : '0%'

    return [
      { label: 'visible', value: visible },
      { label: 'blackout', value: blackout },
      { label: 'threaded', value: threaded },
      { label: 'source', value: sourceLabel }
    ]
  }, [revision, sourceLabel])

  const controls = [
    {
      id: 'apply-manuscript',
      label: 'etch.page()',
      onClick: applyDraft
    },
    {
      id: 'cycle-source',
      label: 'sample.page()',
      onClick: cycleSample
    },
    {
      id: 'clear-blackout',
      label: 'lift.ink()',
      onClick: clearBlackout,
      variant: 'reset'
    }
  ]

  const drawPage = useCallback(() => {
    const w = dimensions.width
    const h = dimensions.height
    const page = pageBoundsRef.current

    const haze = ctx.createLinearGradient(0, 0, w, h)
    haze.addColorStop(0, 'rgba(2, 8, 14, 1)')
    haze.addColorStop(0.45, 'rgba(5, 11, 18, 1)')
    haze.addColorStop(1, 'rgba(1, 4, 8, 1)')
    ctx.fillStyle = haze
    ctx.fillRect(0, 0, w, h)

    for (let i = 0; i < 7; i++) {
      const glow = ctx.createRadialGradient(
        w * (0.18 + i * 0.11),
        h * (0.2 + (i % 3) * 0.22),
        0,
        w * (0.18 + i * 0.11),
        h * (0.2 + (i % 3) * 0.22),
        Math.min(w, h) * 0.18
      )
      glow.addColorStop(0, `rgba(102, 255, 204, ${0.022 + i * 0.003})`)
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(w * (0.18 + i * 0.11), h * (0.2 + (i % 3) * 0.22), Math.min(w, h) * 0.18, 0, Math.PI * 2)
      ctx.fill()
    }

    const pageGradient = ctx.createLinearGradient(page.x, page.y, page.x + page.width, page.y + page.height)
    pageGradient.addColorStop(0, 'rgba(12, 18, 16, 0.94)')
    pageGradient.addColorStop(0.5, 'rgba(8, 14, 13, 0.96)')
    pageGradient.addColorStop(1, 'rgba(6, 11, 10, 0.98)')
    ctx.fillStyle = pageGradient
    ctx.fillRect(page.x, page.y, page.width, page.height)

    ctx.strokeStyle = 'rgba(102, 255, 204, 0.12)'
    ctx.lineWidth = 1
    ctx.strokeRect(page.x, page.y, page.width, page.height)

    const lineHeight = lineHeightRef.current
    const startY = page.y + lineHeight * 0.72
    for (let y = startY; y < page.y + page.height - lineHeight * 0.25; y += lineHeight) {
      ctx.strokeStyle = 'rgba(102, 255, 204, 0.06)'
      ctx.beginPath()
      ctx.moveTo(page.x + 20, y)
      ctx.lineTo(page.x + page.width - 20, y)
      ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(255, 210, 122, 0.12)'
    ctx.beginPath()
    ctx.moveTo(page.x + 28, page.y + 22)
    ctx.lineTo(page.x + 28, page.y + page.height - 22)
    ctx.stroke()

    ctx.fillStyle = 'rgba(255, 210, 122, 0.78)'
    ctx.font = '12px "JetBrains Mono", "SF Mono", monospace'
    ctx.textBaseline = 'top'
    ctx.fillText(sourceLabel, page.x + 18, page.y - 24)
  }, [ctx, dimensions.height, dimensions.width, sourceLabel])

  const drawThreads = useCallback((threadWords) => {
    if (!threadWords.length) return

    ctx.save()
    ctx.globalCompositeOperation = 'screen'

    for (let i = 0; i < threadWords.length - 1; i++) {
      const a = threadWords[i]
      const b = threadWords[i + 1]
      const startX = a.x + a.width / 2
      const startY = a.y - a.height * 0.55
      const endX = b.x + b.width / 2
      const endY = b.y - b.height * 0.55
      const midX = (startX + endX) / 2
      const bend = (i % 2 === 0 ? -1 : 1) * (18 + Math.abs(endX - startX) * 0.08)

      ctx.strokeStyle = `hsla(${42 + i * 9}, 90%, 72%, ${mode === 'thread' ? 0.56 : 0.32})`
      ctx.shadowColor = `hsla(${42 + i * 9}, 90%, 70%, 0.42)`
      ctx.shadowBlur = mode === 'thread' ? 14 : 8
      ctx.lineWidth = mode === 'thread' ? 2.2 : 1.3
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.quadraticCurveTo(midX, (startY + endY) / 2 + bend, endX, endY)
      ctx.stroke()
    }

    ctx.restore()
  }, [ctx, mode])

  const drawWords = useCallback((threadWords) => {
    const threadIds = new Set(threadWords.map(word => word.id))

    ctx.textBaseline = 'alphabetic'
    ctx.font = `${clamp(Math.round(dimensions.width * 0.018), 16, 22)}px "Georgia", "Iowan Old Style", serif`

    wordsRef.current.forEach(word => {
      if (word.redacted) {
        const x = word.x - 8
        const y = word.y - word.height * 0.9
        const width = word.width + 16
        const height = word.height * 0.92

        ctx.fillStyle = 'rgba(0, 0, 0, 0.92)'
        ctx.beginPath()
        ctx.roundRect(x, y, width, height, 6)
        ctx.fill()

        ctx.fillStyle = 'rgba(102, 255, 204, 0.06)'
        ctx.beginPath()
        ctx.roundRect(x, y + height * 0.58, width, 2, 1)
        ctx.fill()
        return
      }

      const threaded = threadIds.has(word.id)
      const selected = word.selected
      const hue = selected ? 42 : threaded ? 182 : 162
      const lightness = selected ? 80 : threaded ? 74 : 70

      if (threaded) {
        ctx.fillStyle = selected
          ? 'rgba(255, 210, 122, 0.14)'
          : 'rgba(102, 255, 204, 0.08)'
        ctx.beginPath()
        ctx.roundRect(word.x - 6, word.y - word.height * 0.95, word.width + 12, word.height * 1.08, 6)
        ctx.fill()
      }

      ctx.fillStyle = `hsla(${hue}, 66%, ${lightness}%, ${threaded ? 0.98 : 0.86})`
      ctx.shadowColor = `hsla(${hue}, 85%, 70%, ${threaded ? 0.38 : 0.16})`
      ctx.shadowBlur = threaded ? 9 : 3
      ctx.fillText(word.text, word.x, word.y)
      ctx.shadowBlur = 0
    })
  }, [ctx, dimensions.width])

  const drawBrush = useCallback(() => {
    if (mode === 'thread' || !mouse.isInBounds) return

    const point = mouse.positionRef.current
    ctx.save()
    ctx.strokeStyle = mode === 'redact' ? 'rgba(255, 210, 122, 0.5)' : 'rgba(102, 255, 204, 0.5)'
    ctx.fillStyle = mode === 'redact' ? 'rgba(255, 210, 122, 0.08)' : 'rgba(102, 255, 204, 0.08)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(point.x, point.y, BRUSH_RADIUS, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }, [ctx, mode, mouse.isInBounds, mouse.positionRef])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    if (mouse.isDown && mouse.isInBounds && mode !== 'thread') {
      const point = mouse.positionRef.current
      const prev = dragPointRef.current ?? point
      applyBrush(prev, point)
      dragPointRef.current = point
    } else {
      dragPointRef.current = null
    }

    drawPage()
    drawThreads(litanyWords)
    drawWords(litanyWords)
    drawBrush()
  }, [applyBrush, ctx, dimensions.width, drawBrush, drawPage, drawThreads, drawWords, litanyWords, mode, mouse.isDown, mouse.isInBounds, mouse.positionRef])

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

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="relative z-50 flex items-center justify-between gap-3 border-b border-void-green/18 bg-void-dark/60 px-3 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-5 sm:py-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1
            className="hidden text-xl text-glow sm:block"
            style={{ color: experiment.color }}
          >
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      <div className="flex flex-col gap-4 border-b border-void-green/12 bg-void-dark/45 px-3 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <ExperimentControls
            modes={MODES}
            currentMode={mode}
            onModeChange={setMode}
            controls={controls}
            className="xl:max-w-[70%]"
          />
          <p className="max-w-xl rounded-2xl border border-void-cyan/15 bg-void-dark/55 px-4 py-3 text-xs leading-relaxed text-void-green/72 shadow-[0_0_24px_rgba(102,255,204,0.08)] backdrop-blur-xl xl:text-right">
            {message}
          </p>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col gap-4 bg-void-dark p-3 sm:p-4 lg:flex-row">
        <aside className="flex w-full flex-col gap-4 lg:w-[22rem] xl:w-[26rem]">
          <div className="rounded-[1.75rem] border border-void-cyan/14 bg-void-dark/70 p-4 shadow-[0_0_30px_rgba(102,255,204,0.06)] backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-void-cyan/65">
                  source manuscript
                </p>
                <p className="text-sm text-void-green/72">
                  revise the page, then etch it into the canvas
                </p>
              </div>
              <span className="rounded-full border border-void-green/20 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-void-green/60">
                {sourceLabel}
              </span>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[14rem] w-full rounded-[1.2rem] border border-void-green/18 bg-black/20 px-4 py-4 font-mono text-sm leading-relaxed text-void-green/88 outline-none transition-colors placeholder:text-void-green/25 focus:border-void-cyan/42"
              placeholder="write into the manuscript..."
              data-testid="blackout-input"
            />
          </div>

          <div className="rounded-[1.75rem] border border-void-yellow/18 bg-void-dark/70 p-4 shadow-[0_0_30px_rgba(255,210,122,0.06)] backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-void-yellow/70">
                  hidden litany
                </p>
                <p className="text-sm text-void-green/68">
                  thread mode lets you choose the surviving spine
                </p>
              </div>
              <span className="rounded-full border border-void-yellow/20 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-void-yellow/72">
                {litanyWords.length} words
              </span>
            </div>
            <pre
              className="whitespace-pre-wrap text-[15px] leading-7 text-void-yellow/88"
              style={{ fontFamily: 'Georgia, "Iowan Old Style", serif' }}
            >
              {litanyText}
            </pre>
          </div>
        </aside>

        <div className="relative min-h-[22rem] flex-1 overflow-hidden rounded-[2rem] border border-void-green/14 bg-black/25 shadow-[0_0_48px_rgba(0,0,0,0.35)]">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full touch-none"
            data-testid="blackout-canvas"
          />
        </div>
      </div>
    </div>
  )
}

export default BlackoutLitany
