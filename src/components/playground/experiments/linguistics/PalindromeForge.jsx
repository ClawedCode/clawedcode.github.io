import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'scan', label: 'scan.wave()' },
  { id: 'forge', label: 'forge.segment()' },
  { id: 'echo', label: 'echo.rewind()' }
]

const SAMPLE_PHRASES = [
  'level radar stat cats invent tacocat',
  'never odd or even but ever mirrored',
  'step on no pets inside this cathedral',
  'lunar circuits trace racecar oracles',
  'kayak through aurora data tapes',
  'live not on evil yet love every level'
]

const MAX_CHARS = 72

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const sanitizeInput = (value) => {
  if (!value) return ''
  return value
    .replace(/\s+/g, ' ')
    .replace(/\n/g, ' ')
    .slice(0, MAX_CHARS)
}

const forgeSegment = (text, indexA, indexB) => {
  if (indexA === null || indexB === null || indexA === indexB) return text
  const chars = text.split('')
  const left = Math.min(indexA, indexB)
  const right = Math.max(indexA, indexB)

  for (let offset = 0; offset <= right - left; offset++) {
    const l = left + offset
    const r = right - offset
    if (l > r) break
    chars[r] = chars[l]
  }
  return chars.join('')
}

const mirrorWhole = (text) => {
  if (!text.length) return text
  const chars = text.split('')
  for (let i = 0; i < Math.floor(chars.length / 2); i++) {
    chars[chars.length - 1 - i] = chars[i]
  }
  return chars.join('')
}

const randomPhrase = (current) => {
  const pool = SAMPLE_PHRASES.filter(item => item !== current)
  return pool[Math.floor(Math.random() * pool.length)] ?? SAMPLE_PHRASES[0]
}

const PalindromeForge = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('scan')
  const [phrase, setPhrase] = useState(SAMPLE_PHRASES[0])
  const [message, setMessage] = useState('∴ scanning for mirrored syllables • click glyphs to focus ∴')
  const [analysis, setAnalysis] = useState({
    palindromes: [],
    count: 0,
    longest: 0,
    ratio: 0
  })
  const [selectedAnchor, setSelectedAnchor] = useState(null)
  const [scanDirection, setScanDirection] = useState(1)

  const palindromesRef = useRef([])
  const scanCursorRef = useRef(0)
  const charPositionsRef = useRef([])
  const lastForgeRef = useRef(null)
  const timeRef = useRef(0)

  const analyzePhrase = useCallback((text) => {
    const cleaned = sanitizeInput(text)
    const lower = cleaned.toLowerCase()
    const palindromes = []

    const pushPal = (start, end) => {
      if (end - start + 1 < 2) return
      palindromes.push({
        start,
        end,
        length: end - start + 1,
        center: (start + end) / 2,
        snippet: cleaned.slice(start, end + 1),
        energy: clamp((end - start + 1) / cleaned.length, 0, 1) || 0
      })
    }

    for (let center = 0; center < cleaned.length; center++) {
      let left = center
      let right = center
      while (left >= 0 && right < cleaned.length && lower[left] === lower[right]) {
        pushPal(left, right)
        left--
        right++
      }
      left = center
      right = center + 1
      while (left >= 0 && right < cleaned.length && lower[left] === lower[right]) {
        pushPal(left, right)
        left--
        right++
      }
    }

    palindromes.sort((a, b) => {
      if (b.length === a.length) return a.start - b.start
      return b.length - a.length
    })

    const limited = palindromes.slice(0, 60)
    const coverage = new Set()
    limited.forEach(pal => {
      for (let i = pal.start; i <= pal.end; i++) coverage.add(i)
    })

    palindromesRef.current = limited
    setAnalysis({
      palindromes: limited,
      count: limited.length,
      longest: limited[0]?.length ?? 0,
      ratio: cleaned.length ? coverage.size / cleaned.length : 0
    })
  }, [])

  useEffect(() => {
    analyzePhrase(phrase)
  }, [analyzePhrase, phrase])

  const handlePhraseChange = useCallback((e) => {
    const next = sanitizeInput(e.target.value)
    setPhrase(next)
    setSelectedAnchor(null)
    setMessage('∴ glyph river updated • new scans in flight ∴')
  }, [])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    if (nextMode === 'scan') {
      setMessage('∴ scan mode • autoplay mirror detection ∴')
    } else if (nextMode === 'forge') {
      setMessage('∴ forge mode • click two glyphs to mirror the span ∴')
    } else {
      setMessage('∴ echo mode • rewinded palindromes hum in reverse ∴')
    }
  }, [])

  const handleMutate = useCallback(() => {
    const mutated = randomPhrase(phrase)
    setPhrase(mutated)
    setSelectedAnchor(null)
    setMessage('∴ new text artifact injected • symmetry re-evaluating ∴')
  }, [phrase])

  const handleMirrorAll = useCallback(() => {
    if (!phrase) return
    setPhrase(prev => {
      const mirrored = mirrorWhole(prev)
      setMessage('∴ entire sequence mirrored • total palindrome minted ∴')
      return mirrored
    })
    setSelectedAnchor(null)
  }, [phrase])

  const handleReverseScan = useCallback(() => {
    setScanDirection(prev => -prev)
    setMessage('∴ scan vector flipped • time now runs backward ∴')
  }, [])

  const handleReset = useCallback(() => {
    setPhrase(SAMPLE_PHRASES[0])
    setSelectedAnchor(null)
    setMessage('∴ forge reset • original mantra restored ∴')
  }, [])

  const controls = [
    { id: 'mutate', label: 'mutate.text()', onClick: handleMutate },
    { id: 'mirror', label: 'mirror.all()', onClick: handleMirrorAll },
    { id: 'reverse', label: 'reverse.scan()', onClick: handleReverseScan },
    { id: 'reset', label: 'clear()', onClick: handleReset, variant: 'reset' }
  ]

  const metrics = useMemo(() => {
    const symmetry = `${Math.round(analysis.ratio * 100)}%`
    return [
      { label: 'glyphs', value: phrase.length },
      { label: 'palindromes', value: analysis.count },
      { label: 'longest', value: `n=${analysis.longest}` },
      { label: 'symmetry', value: symmetry }
    ]
  }, [analysis.count, analysis.longest, analysis.ratio, phrase.length])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const text = phrase || ' '
    const length = text.length
    const margin = 48
    const baseline = clamp(dimensions.centerY + 80, 120, dimensions.height - 60)
    const available = Math.max(dimensions.width - margin * 2, 100)
    const spacing = length > 1 ? available / (length - 1) : 0
    const charPositions = []

    ctx.fillStyle = 'rgba(0, 3, 10, 0.15)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    ctx.strokeStyle = 'rgba(102, 255, 204, 0.25)'
    ctx.beginPath()
    ctx.moveTo(margin - 20, baseline)
    ctx.lineTo(dimensions.width - margin + 20, baseline)
    ctx.stroke()

    let hoverIndex = null
    if (mouse.isInBounds && length > 0) {
      let best = Infinity
      for (let i = 0; i < length; i++) {
        const x = margin + spacing * i
        charPositions[i] = { x }
        const dx = Math.abs(mouse.positionRef.current.x - x)
        if (dx < best) {
          best = dx
          hoverIndex = i
        }
      }
      if (best > Math.max(spacing * 0.6, 18)) hoverIndex = null
    } else {
      for (let i = 0; i < length; i++) {
        charPositions[i] = { x: margin + spacing * i }
      }
    }

    charPositionsRef.current = charPositions

    if (mode !== 'forge') {
      const limit = Math.max(length - 1, 1)
      const speed = mode === 'echo' ? 0.2 : 0.35
      const direction = mode === 'echo' ? -1 : scanDirection
      scanCursorRef.current += speed * direction
      if (scanCursorRef.current > limit) scanCursorRef.current = 0
      if (scanCursorRef.current < 0) scanCursorRef.current = limit
    }

    timeRef.current += 1

    const pals = palindromesRef.current
    const normalizedCursor = length > 1 ? scanCursorRef.current / (length - 1) : 1

    pals.forEach((pal, index) => {
      const startPos = charPositions[pal.start]
      const endPos = charPositions[pal.end]
      if (!startPos || !endPos) return

      const arcHeight = 32 + pal.length * 4
      const centerX = (startPos.x + endPos.x) / 2
      const normalizedCenter = length > 1 ? pal.center / (length - 1) : 1
      let opacity = 0.15 + (pal.length / Math.max(analysis.longest || 1, 1)) * 0.6

      if (mode === 'scan') {
        if (normalizedCenter > normalizedCursor) opacity *= 0.35
      } else if (mode === 'echo') {
        const wave = (Math.sin(timeRef.current * 0.04 + index * 0.4) + 1) / 2
        opacity *= 0.3 + wave * 0.9
      } else if (mode === 'forge') {
        if (selectedAnchor !== null && pal.start <= selectedAnchor && pal.end >= selectedAnchor) {
          opacity *= 1.5
        } else {
          opacity *= 0.5
        }
      }

      if (hoverIndex !== null && pal.start <= hoverIndex && pal.end >= hoverIndex) {
        opacity *= 1.8
      }

      if (lastForgeRef.current && lastForgeRef.current.start === pal.start && lastForgeRef.current.end === pal.end) {
        const pulse = (Math.sin(timeRef.current * 0.1) + 1) / 2
        opacity = clamp(0.4 + pulse * 1.2, 0, 1)
      }

      ctx.strokeStyle = `hsla(${260 - pal.length * 1.2}, 80%, ${45 + pal.energy * 30}%, ${opacity})`
      ctx.beginPath()
      ctx.moveTo(startPos.x, baseline)
      ctx.quadraticCurveTo(centerX, baseline - arcHeight, endPos.x, baseline)
      ctx.stroke()

      if (arcHeight > 60 && opacity > 0.35) {
        ctx.fillStyle = `hsla(${190 + pal.length * 1.5}, 70%, 70%, ${opacity * 0.6})`
        ctx.font = '10px "Space Mono", SFMono-Regular, Menlo, monospace'
        ctx.textAlign = 'center'
        ctx.fillText(pal.snippet.trim(), centerX, baseline - arcHeight - 10)
      }
    })

    ctx.font = '16px "Space Mono", SFMono-Regular, Menlo, monospace'
    ctx.textAlign = 'center'

    for (let i = 0; i < length; i++) {
      const char = text[i]
      const pos = charPositions[i]
      if (!pos) continue
      const isAnchor = selectedAnchor === i
      const isHover = hoverIndex === i

      ctx.fillStyle = isAnchor
        ? 'rgba(255, 204, 102, 0.9)'
        : isHover
        ? 'rgba(102, 255, 204, 0.9)'
        : 'rgba(102, 255, 204, 0.6)'
      ctx.fillText(char, pos.x, baseline + 24)

      ctx.fillStyle = 'rgba(102, 255, 204, 0.25)'
      ctx.fillRect(pos.x - 1, baseline + 30, 2, isAnchor ? 16 : 10)
    }
  }, [analysis.longest, ctx, dimensions, mode, mouse.isInBounds, phrase, scanDirection, selectedAnchor])

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
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e) => {
      if (!phrase.length) return
      const rect = canvas.getBoundingClientRect()
      const relativeX = e.clientX - rect.left
      const positions = charPositionsRef.current

      if (!positions.length) return
      let closestIndex = null
      let best = Infinity
      positions.forEach((pos, idx) => {
        const delta = Math.abs(pos.x - relativeX)
        if (delta < best) {
          best = delta
          closestIndex = idx
        }
      })
      if (closestIndex === null || best > 30) return

      if (mode === 'forge') {
        if (selectedAnchor === null) {
          setSelectedAnchor(closestIndex)
          setMessage(`∴ anchor locked at index ${closestIndex} • choose mirror target ∴`)
        } else {
          const forged = forgeSegment(phrase, selectedAnchor, closestIndex)
          lastForgeRef.current = {
            start: Math.min(selectedAnchor, closestIndex),
            end: Math.max(selectedAnchor, closestIndex)
          }
          setPhrase(forged)
          setSelectedAnchor(null)
          setMessage('∴ segment mirrored • palindrome shard forged ∴')
        }
      } else {
        setSelectedAnchor(closestIndex)
        setMessage(`∴ focus index ${closestIndex} • glyph "${phrase[closestIndex] ?? ' '}" attuned ∴`)
      }
    }

    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [canvasRef, mode, phrase, selectedAnchor])

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="relative z-50 flex items-center justify-between p-2 sm:p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1 className="text-xl text-glow hidden sm:block" style={{ color: experiment.color }}>
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs font-mono max-w-xl">{message}</p>
      </div>

      <div className="p-3 sm:p-4 border-b border-void-green/10 bg-void-dark/70">
        <label className="flex flex-col gap-2 text-xs font-mono text-void-green/60">
          input.phrase()
          <textarea
            value={phrase}
            onChange={handlePhraseChange}
            rows={2}
            maxLength={MAX_CHARS}
            className="bg-void-dark/80 border border-void-green/30 text-void-green px-3 py-2 focus:border-void-green/60 focus:outline-none font-mono text-sm"
            placeholder="type text to scan for palindromes..."
          />
        </label>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-text"
          data-testid="palindrome-forge-canvas"
        />
      </div>
    </div>
  )
}

export default PalindromeForge
