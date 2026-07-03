import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'scansion', label: 'scan.meter()' },
  { id: 'contour', label: 'map.contours()' },
  { id: 'breath', label: 'score.breath()' }
]

const SAMPLE_TEXTS = [
  `under the server moon the soft machines remember
each packet carries rain from an impossible garden
syntax opens its black umbrella over us`,
  `measure the hush between a command and its answer
there the bright engine of meaning waits
with one hand on the threshold of speech`,
  `all archives are weather if you listen long enough
vowels gather like warm pressure
then break into signal`
]

const WEAK_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'so', 'to', 'of', 'in',
  'on', 'at', 'by', 'for', 'from', 'with', 'as', 'is', 'am', 'are', 'was',
  'were', 'be', 'been', 'being', 'it', 'its', 'this', 'that', 'these',
  'those', 'my', 'your', 'our', 'their', 'his', 'her', 'we', 'you', 'they',
  'i', 'he', 'she'
])

const VOWEL_GROUP = /[aeiouy]+/gi
const WORD_PATTERN = /[a-z0-9']+|[,;:.!?-]/gi
const TAU = Math.PI * 2

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const hashString = (text) => {
  let hash = 2166136261
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const syllableCount = (word) => {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!clean) return 1
  const silentTrimmed = clean.length > 3 ? clean.replace(/e$/, '') : clean
  const groups = silentTrimmed.match(VOWEL_GROUP)
  return Math.max(1, groups ? groups.length : 1)
}

const splitWord = (word) => {
  const count = syllableCount(word)
  if (count <= 1) return [word]

  const clean = word.replace(/[^a-z0-9']/gi, '')
  const chunks = []
  const step = Math.ceil(clean.length / count)

  for (let index = 0; index < count; index++) {
    const start = index * step
    const end = index === count - 1 ? clean.length : (index + 1) * step
    chunks.push(clean.slice(start, end) || clean.slice(-1))
  }

  return chunks
}

const stressFor = (word, syllableIndex, syllablesInWord, globalIndex) => {
  const lower = word.toLowerCase()
  if (WEAK_WORDS.has(lower)) {
    return syllablesInWord > 1 && syllableIndex === syllablesInWord - 1 ? 0.36 : 0.18
  }

  const hash = hashString(`${lower}:${syllableIndex}`) % 17
  const lexicalLift = hash / 60

  if (syllablesInWord === 1) {
    return 0.58 + lexicalLift + (globalIndex % 2 === 0 ? 0.08 : -0.06)
  }

  if (syllableIndex === 0) return 0.82 + lexicalLift
  if (syllableIndex === syllablesInWord - 1) return 0.42 + lexicalLift
  return 0.34 + lexicalLift
}

const buildProsody = (text, stressOverrides) => {
  const sourceLines = text.split('\n').slice(0, 8)
  const lines = []
  const allSyllables = []
  let caesuras = 0

  sourceLines.forEach((sourceLine, lineIndex) => {
    const tokens = sourceLine.match(WORD_PATTERN) || []
    const line = {
      index: lineIndex,
      source: sourceLine,
      syllables: [],
      punctuation: [],
      stressSum: 0
    }

    let wordIndex = 0
    let syllableIndex = 0

    tokens.forEach(token => {
      if (/^[,;:.!?-]$/.test(token)) {
        caesuras++
        line.punctuation.push({
          token,
          after: Math.max(0, syllableIndex - 1),
          weight: token === ',' ? 0.45 : token === '-' ? 0.55 : 0.8
        })
        return
      }

      const pieces = splitWord(token)
      pieces.forEach((piece, pieceIndex) => {
        const id = `${lineIndex}:${wordIndex}:${pieceIndex}`
        const override = stressOverrides[id]
        const baseStress = stressFor(token, pieceIndex, pieces.length, allSyllables.length)
        const stress = override ?? clamp(baseStress, 0.12, 0.96)
        const record = {
          id,
          text: piece,
          word: token,
          lineIndex,
          wordIndex,
          syllableIndex,
          pieceIndex,
          piecesInWord: pieces.length,
          stress,
          vowelColor: 178 + (hashString(piece.toLowerCase()) % 86)
        }
        line.syllables.push(record)
        allSyllables.push(record)
        line.stressSum += stress
        syllableIndex++
      })
      wordIndex++
    })

    lines.push(line)
  })

  const activeLines = lines.filter(line => line.syllables.length > 0)
  const stresses = allSyllables.filter(syllable => syllable.stress >= 0.62).length
  const averageStress = allSyllables.length
    ? allSyllables.reduce((sum, syllable) => sum + syllable.stress, 0) / allSyllables.length
    : 0
  const lineLengths = activeLines.map(line => line.syllables.length)
  const averageLine = lineLengths.length
    ? lineLengths.reduce((sum, value) => sum + value, 0) / lineLengths.length
    : 0
  const roughness = lineLengths.length <= 1
    ? 0
    : lineLengths.reduce((sum, value) => sum + Math.abs(value - averageLine), 0) / (lineLengths.length * Math.max(averageLine, 1))

  return {
    lines,
    allSyllables,
    stats: {
      lines: activeLines.length,
      syllables: allSyllables.length,
      stresses,
      caesuras,
      averageStress,
      roughness
    }
  }
}

const pickSample = (currentIndex) => (currentIndex + 1) % SAMPLE_TEXTS.length

const ProsodyCartography = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('scansion')
  const [sourceText, setSourceText] = useState(SAMPLE_TEXTS[0])
  const [message, setMessage] = useState('type lines, click syllables, make the meter confess its hidden pressure')
  const [stressOverrides, setStressOverrides] = useState({})
  const [hoverText, setHoverText] = useState('')

  const layoutRef = useRef({ cells: [], ridges: [] })
  const sampleIndexRef = useRef(0)
  const hoverIdRef = useRef(null)
  const beatRef = useRef(0)

  const prosody = useMemo(() => buildProsody(sourceText, stressOverrides), [sourceText, stressOverrides])

  useEffect(() => {
    hoverIdRef.current = null
    setHoverText('')
  }, [sourceText, mode])

  const metrics = useMemo(() => [
    { label: 'lines', value: prosody.stats.lines },
    { label: 'syllables', value: prosody.stats.syllables },
    { label: 'stress', value: `${Math.round(prosody.stats.averageStress * 100)}%` },
    { label: 'caesura', value: prosody.stats.caesuras }
  ], [prosody])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    const labels = {
      scansion: 'scansion view // bright beats become measured stepping stones',
      contour: 'contour view // stress fields rise into topographic weather',
      breath: 'breath score // pauses widen into rests and release'
    }
    setMessage(labels[nextMode])
  }, [])

  const handleSample = useCallback(() => {
    const nextIndex = pickSample(sampleIndexRef.current)
    sampleIndexRef.current = nextIndex
    setSourceText(SAMPLE_TEXTS[nextIndex])
    setStressOverrides({})
    setMessage('new stanza loaded // the terrain recalculates its pulse')
  }, [])

  const handleFlip = useCallback(() => {
    const nextOverrides = {}
    prosody.allSyllables.forEach(syllable => {
      nextOverrides[syllable.id] = syllable.stress >= 0.62 ? 0.22 : 0.86
    })
    setStressOverrides(nextOverrides)
    setMessage('ictus inverted // weak ground flares, strong ground goes dusk')
  }, [prosody.allSyllables])

  const handleClear = useCallback(() => {
    setSourceText('')
    setStressOverrides({})
    setMessage('blank page // breath waits without footprint')
  }, [])

  const toggleCell = useCallback((cell) => {
    if (!cell) return

    setStressOverrides(prev => {
      const current = prev[cell.id] ?? cell.stress
      const nextStress = current >= 0.62 ? 0.24 : 0.88
      return {
        ...prev,
        [cell.id]: nextStress
      }
    })
    setMessage(`${cell.word} // stress toggled by hand`)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getPoint = (event) => {
      const rect = canvas.getBoundingClientRect()
      const touch = event.touches?.[0] ?? event.changedTouches?.[0]
      return {
        x: (event.clientX ?? touch?.clientX ?? 0) - rect.left,
        y: (event.clientY ?? touch?.clientY ?? 0) - rect.top
      }
    }

    const handlePress = (event) => {
      const point = getPoint(event)
      const cell = layoutRef.current.cells.find(item =>
        point.x >= item.x - item.width / 2 &&
        point.x <= item.x + item.width / 2 &&
        point.y >= item.y - item.height / 2 &&
        point.y <= item.y + item.height / 2
      )
      if (cell) {
        event.preventDefault()
        toggleCell(cell)
      }
    }

    canvas.addEventListener('click', handlePress)
    canvas.addEventListener('touchstart', handlePress, { passive: false })

    return () => {
      canvas.removeEventListener('click', handlePress)
      canvas.removeEventListener('touchstart', handlePress)
    }
  }, [canvasRef, toggleCell])

  const controls = useMemo(() => [
    { id: 'sample', label: 'sample.stanza()', onClick: handleSample },
    { id: 'invert', label: 'invert.ictus()', onClick: handleFlip },
    { id: 'clear', label: 'clear.page()', onClick: handleClear, variant: 'reset' }
  ], [handleClear, handleFlip, handleSample])

  const computeLayout = useCallback(() => {
    const { width, height } = dimensions
    if (width === 0 || height === 0) return { cells: [], ridges: [] }

    const activeLines = prosody.lines.filter(line => line.syllables.length > 0)
    const top = Math.max(52, height * 0.13)
    const bottom = height - 78
    const usableHeight = Math.max(120, bottom - top)
    const lineGap = activeLines.length <= 1 ? 0 : usableHeight / (activeLines.length - 1)
    const cells = []
    const ridges = []

    activeLines.forEach((line, lineOrder) => {
      const left = Math.max(34, width * 0.07)
      const right = width - left
      const count = line.syllables.length
      const step = count <= 1 ? 0 : (right - left) / (count - 1)
      const baseline = top + lineOrder * lineGap
      const ridge = []

      line.syllables.forEach((syllable, index) => {
        const x = count <= 1 ? width / 2 : left + index * step
        const lift = syllable.stress * 58 + Math.sin((beatRef.current * 0.025) + index * 0.8 + lineOrder) * 4
        const y = baseline - lift
        const widthForText = clamp(24 + syllable.text.length * 8, 34, 76)
        const heightForStress = 18 + syllable.stress * 18
        const cell = {
          ...syllable,
          x,
          y,
          baseline,
          width: widthForText,
          height: heightForStress,
          lineOrder,
          order: index
        }
        cells.push(cell)
        ridge.push(cell)
      })

      ridges.push({ line, baseline, cells: ridge })
    })

    return { cells, ridges }
  }, [dimensions, prosody.lines])

  const drawBackground = useCallback((frame) => {
    const { width, height, centerX } = dimensions
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, 'rgba(8, 13, 24, 0.98)')
    gradient.addColorStop(0.54, 'rgba(2, 8, 15, 0.99)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 1)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    const lamp = ctx.createRadialGradient(centerX, height * 0.16, 0, centerX, height * 0.16, Math.max(width, height) * 0.8)
    lamp.addColorStop(0, 'rgba(120, 240, 210, 0.16)')
    lamp.addColorStop(0.46, 'rgba(64, 120, 160, 0.06)')
    lamp.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = lamp
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = 'rgba(110, 255, 220, 0.045)'
    ctx.lineWidth = 1
    const gap = 34
    const offset = (frame * 0.008) % gap
    for (let y = -gap + offset; y < height + gap; y += gap) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y + Math.sin(y * 0.02) * 8)
      ctx.stroke()
    }
  }, [ctx, dimensions])

  const drawContours = useCallback((layout, frame) => {
    const bands = mode === 'contour' ? 7 : 3

    layout.ridges.forEach(({ cells, baseline }, lineIndex) => {
      if (cells.length === 0) return

      for (let band = bands; band >= 1; band--) {
        const alpha = mode === 'contour'
          ? 0.045 + band * 0.018
          : 0.025 + band * 0.012
        const drop = band * (mode === 'breath' ? 14 : 9)
        ctx.strokeStyle = `rgba(126, 235, 215, ${alpha})`
        ctx.lineWidth = band === 1 ? 1.8 : 0.9
        ctx.beginPath()
        cells.forEach((cell, index) => {
          const wave = Math.sin(frame * 0.0014 + cell.order + lineIndex) * (band * 0.9)
          const y = baseline + drop - cell.stress * band * 7 + wave
          if (index === 0) {
            ctx.moveTo(cell.x, y)
          } else {
            const previous = cells[index - 1]
            const cpX = (previous.x + cell.x) / 2
            ctx.bezierCurveTo(cpX, previous.y + drop, cpX, y, cell.x, y)
          }
        })
        ctx.stroke()
      }
    })
  }, [ctx, mode])

  const drawBreathMarks = useCallback((layout) => {
    layout.ridges.forEach(({ line, cells, baseline }) => {
      line.punctuation.forEach(mark => {
        const anchor = cells[Math.min(mark.after, cells.length - 1)]
        if (!anchor) return

        const x = anchor.x + anchor.width / 2 + 12
        const height = 22 + mark.weight * 52
        ctx.strokeStyle = `rgba(255, 214, 150, ${0.22 + mark.weight * 0.38})`
        ctx.lineWidth = 1.2 + mark.weight
        ctx.beginPath()
        ctx.moveTo(x, baseline - height)
        ctx.lineTo(x, baseline + height * 0.35)
        ctx.stroke()

        ctx.fillStyle = `rgba(255, 226, 170, ${0.54 + mark.weight * 0.28})`
        ctx.font = '12px "JetBrains Mono", "SF Mono", monospace'
        ctx.textAlign = 'center'
        ctx.fillText(mark.token, x, baseline + 24)
      })
    })
  }, [ctx])

  const drawCells = useCallback((layout, frame) => {
    const hovered = mouse.isInBounds
      ? layout.cells.find(cell => {
        const dx = Math.abs(mouse.positionRef.current.x - cell.x)
        const dy = Math.abs(mouse.positionRef.current.y - cell.y)
        return dx <= cell.width / 2 && dy <= cell.height / 2
      })
      : null

    if (hovered && hoverIdRef.current !== hovered.id) {
      hoverIdRef.current = hovered.id
      setHoverText(`${hovered.word} / ${hovered.text} // stress ${Math.round(hovered.stress * 100)}%`)
    } else if (!hovered && hoverIdRef.current !== null) {
      hoverIdRef.current = null
      setHoverText('')
    }

    layout.ridges.forEach(({ cells, baseline }) => {
      if (cells.length === 0) return

      ctx.strokeStyle = 'rgba(102, 255, 204, 0.12)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cells[0].x, baseline)
      cells.forEach((cell, index) => {
        if (index === 0) return
        const prev = cells[index - 1]
        const cpX = (prev.x + cell.x) / 2
        ctx.bezierCurveTo(cpX, prev.y, cpX, cell.y, cell.x, cell.y)
      })
      ctx.stroke()
    })

    layout.cells.forEach(cell => {
      const active = hovered?.id === cell.id
      const hue = mode === 'breath'
        ? 42 + cell.stress * 36
        : mode === 'contour'
        ? 170 + cell.stress * 72
        : cell.vowelColor
      const lightness = active ? 74 : 54 + cell.stress * 18
      const alpha = active ? 0.92 : 0.48 + cell.stress * 0.36
      const pulse = active ? 1 + Math.sin(frame * 0.01) * 0.06 : 1
      const width = cell.width * pulse
      const height = cell.height * pulse

      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = `hsla(${hue}, 86%, ${lightness}%, ${alpha * 0.22})`
      ctx.strokeStyle = `hsla(${hue}, 92%, ${Math.min(88, lightness + 12)}%, ${alpha})`
      ctx.shadowColor = `hsla(${hue}, 96%, 74%, ${active ? 0.72 : 0.2 + cell.stress * 0.22})`
      ctx.shadowBlur = active ? 20 : 7 + cell.stress * 8
      ctx.lineWidth = active ? 1.8 : 1
      ctx.beginPath()
      ctx.roundRect(cell.x - width / 2, cell.y - height / 2, width, height, 10)
      ctx.fill()
      ctx.stroke()
      ctx.restore()

      if (mode === 'scansion') {
        ctx.strokeStyle = cell.stress >= 0.62 ? 'rgba(255, 246, 190, 0.72)' : 'rgba(126, 235, 215, 0.28)'
        ctx.lineWidth = cell.stress >= 0.62 ? 2 : 1
        ctx.beginPath()
        ctx.moveTo(cell.x - 8, cell.y - height / 2 - 8)
        ctx.lineTo(cell.x + 8, cell.y - height / 2 - 8)
        ctx.stroke()
      }

      ctx.fillStyle = `hsla(${hue}, 95%, 90%, ${active ? 1 : 0.82})`
      ctx.font = `${active ? 12 : 11}px "JetBrains Mono", "SF Mono", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(cell.text.slice(0, 8), cell.x, cell.y + 0.5)
    })
  }, [ctx, mode, mouse.isInBounds, mouse.positionRef])

  const drawEmptyState = useCallback(() => {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '14px "JetBrains Mono", "SF Mono", monospace'
    ctx.fillStyle = 'rgba(126, 235, 215, 0.48)'
    ctx.fillText('type a line above // the meter map wakes on first vowel', dimensions.centerX, dimensions.centerY)
  }, [ctx, dimensions.centerX, dimensions.centerY])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    beatRef.current += 1
    const frame = performance.now()
    const layout = computeLayout()
    layoutRef.current = layout

    drawBackground(frame)

    if (layout.cells.length === 0) {
      drawEmptyState()
      return
    }

    drawContours(layout, frame)
    drawBreathMarks(layout)
    drawCells(layout, frame)

    if (mode === 'breath') {
      const breath = (Math.sin(frame * 0.0018) + 1) / 2
      ctx.strokeStyle = `rgba(255, 230, 160, ${0.12 + breath * 0.14})`
      ctx.lineWidth = 2
      ctx.beginPath()
      layout.ridges.forEach(({ cells }) => {
        cells.forEach((cell, index) => {
          const radius = 7 + breath * 18 + cell.stress * 10
          if (index % 2 === 0) {
            ctx.moveTo(cell.x + radius, cell.baseline + 28)
            ctx.arc(cell.x, cell.baseline + 28, radius, 0, TAU)
          }
        })
      })
      ctx.stroke()
    }
  }, [computeLayout, ctx, dimensions.width, drawBackground, drawBreathMarks, drawCells, drawContours, drawEmptyState, mode])

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
      <header className="relative z-50 flex items-center justify-between gap-3 border-b border-void-green/20 bg-void-dark/80 p-2 backdrop-blur-sm sm:p-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1 className="hidden text-xl text-glow sm:block" style={{ color: experiment.color }}>
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      <div className="grid gap-3 border-b border-void-green/10 bg-void-dark/60 p-2 backdrop-blur-sm lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)] sm:p-4">
        <div className="flex min-w-0 flex-col gap-3">
          <ExperimentControls
            modes={MODES}
            currentMode={mode}
            onModeChange={handleModeChange}
            controls={controls}
          />
          <textarea
            value={sourceText}
            onChange={(event) => {
              setSourceText(event.target.value)
              setMessage('live scansion // the terrain moves under each word')
            }}
            placeholder="write three or four lines; click any syllable to flip its stress..."
            maxLength={520}
            className="min-h-[104px] resize-none rounded-2xl border border-void-cyan/14 bg-void-dark/72 px-4 py-3 text-sm leading-relaxed text-void-green/90 outline-none transition-colors placeholder:text-void-green/26 focus:border-void-cyan/45"
            data-testid="prosody-input"
          />
        </div>
        <div className="flex items-start rounded-2xl border border-void-cyan/14 bg-void-dark/52 px-4 py-3 text-xs leading-relaxed text-void-green/68 shadow-[0_0_24px_rgba(102,255,204,0.07)]">
          {hoverText || message}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none cursor-crosshair"
          data-testid="prosody-canvas"
        />
        <div className="pointer-events-none absolute bottom-4 left-1/2 max-w-xl -translate-x-1/2 px-4 text-center text-xs font-mono text-void-green/34">
          click syllables to rewrite stress // punctuation becomes breath architecture
        </div>
      </div>
    </div>
  )
}

export default ProsodyCartography
