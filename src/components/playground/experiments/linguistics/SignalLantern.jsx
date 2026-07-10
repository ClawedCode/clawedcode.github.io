import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'listen', label: 'listen()' },
  { id: 'beacon', label: 'beacon()' },
  { id: 'cipher', label: 'cipher()' }
]

const DOT_MS = 180
const DASH_MS = 420
const LETTER_GAP_MS = 760
const WORD_GAP_MS = 1700
const MAX_TAPE = 96

const MORSE = {
  '.-': 'A',
  '-...': 'B',
  '-.-.': 'C',
  '-..': 'D',
  '.': 'E',
  '..-.': 'F',
  '--.': 'G',
  '....': 'H',
  '..': 'I',
  '.---': 'J',
  '-.-': 'K',
  '.-..': 'L',
  '--': 'M',
  '-.': 'N',
  '---': 'O',
  '.--.': 'P',
  '--.-': 'Q',
  '.-.': 'R',
  '...': 'S',
  '-': 'T',
  '..-': 'U',
  '...-': 'V',
  '.--': 'W',
  '-..-': 'X',
  '-.--': 'Y',
  '--..': 'Z',
  '-----': '0',
  '.----': '1',
  '..---': '2',
  '...--': '3',
  '....-': '4',
  '.....': '5',
  '-....': '6',
  '--...': '7',
  '---..': '8',
  '----.': '9'
}

const TEXT_TO_MORSE = Object.entries(MORSE).reduce((acc, [code, char]) => {
  acc[char] = code
  return acc
}, {})

const SAMPLES = ['VOID AWAKE', 'NOON SIGNAL', 'TAPE REMEMBERS', 'LIMINAL CODE']

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const atbash = (text) => text.replace(/[A-Z]/g, char => {
  const index = char.charCodeAt(0) - 65
  return String.fromCharCode(90 - index)
})

const encodeText = (text) => {
  const events = []
  const words = text.toUpperCase().split(/\s+/).filter(Boolean)

  words.forEach((word, wordIndex) => {
    word.split('').forEach((char, charIndex) => {
      const code = TEXT_TO_MORSE[char]
      if (!code) return
      code.split('').forEach((symbol, symbolIndex) => {
        events.push({ type: 'mark', symbol, duration: symbol === '.' ? DOT_MS : DASH_MS })
        if (symbolIndex < code.length - 1) events.push({ type: 'gap', scope: 'intra' })
      })
      if (charIndex < word.length - 1) events.push({ type: 'gap', scope: 'letter' })
    })
    if (wordIndex < words.length - 1) events.push({ type: 'gap', scope: 'word' })
  })

  return events
}

const decodePattern = (pattern) => MORSE[pattern] || '?'

const SignalLantern = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('listen')
  const [message, setMessage] = useState('hold space or press the glass; duration becomes language')
  const [decoded, setDecoded] = useState('')
  const [currentPattern, setCurrentPattern] = useState('')
  const [symbols, setSymbols] = useState(0)
  const [words, setWords] = useState(0)
  const [isPressing, setIsPressing] = useState(false)
  const [beaconText, setBeaconText] = useState(SAMPLES[0])

  const tapeRef = useRef([])
  const pulseRef = useRef([])
  const decodedRef = useRef('')
  const patternRef = useRef('')
  const pressingRef = useRef(false)
  const pressStartRef = useRef(0)
  const lastReleaseRef = useRef(0)
  const lastFinalizedRef = useRef(0)
  const playbackRef = useRef(null)
  const frameRef = useRef(0)
  const lastDrawRef = useRef(0)

  const displayText = useMemo(() => {
    if (mode === 'cipher') return atbash(decoded)
    return decoded
  }, [decoded, mode])

  const commitDecoded = useCallback((next) => {
    decodedRef.current = next
    setDecoded(next)
    const wordCount = next.trim() ? next.trim().split(/\s+/).length : 0
    setWords(wordCount)
  }, [])

  const commitPattern = useCallback((next) => {
    patternRef.current = next
    setCurrentPattern(next)
  }, [])

  const pushTape = useCallback((entry) => {
    tapeRef.current = [
      ...tapeRef.current,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        created: performance.now(),
        ...entry
      }
    ].slice(-MAX_TAPE)
  }, [])

  const finalizeLetter = useCallback((forceUnknown = false) => {
    const pattern = patternRef.current
    if (!pattern) return

    const char = forceUnknown ? '?' : decodePattern(pattern)
    commitDecoded(`${decodedRef.current}${char}`)
    pushTape({ type: 'letter', value: char, pattern })
    commitPattern('')
    lastFinalizedRef.current = performance.now()
    setMessage(`pattern ${pattern} resolved as ${char}`)
  }, [commitDecoded, commitPattern, pushTape])

  const addWordGap = useCallback(() => {
    if (!decodedRef.current || decodedRef.current.endsWith(' ')) return
    commitDecoded(`${decodedRef.current} `)
    pushTape({ type: 'space', value: '/' })
    setMessage('word gap opened; the tape makes room for silence')
  }, [commitDecoded, pushTape])

  const addSymbol = useCallback((symbol, duration) => {
    const nextPattern = `${patternRef.current}${symbol}`.slice(-6)
    commitPattern(nextPattern)
    pushTape({ type: 'symbol', value: symbol, duration })
    setSymbols(prev => prev + 1)
    pulseRef.current.push({
      age: 0,
      life: 52,
      symbol,
      duration,
      hue: symbol === '.' ? 158 : 44
    })
    setMessage(symbol === '.' ? 'short flash archived as dot' : 'long burn archived as dash')
  }, [commitPattern, pushTape])

  const beginPress = useCallback((event) => {
    if (event) event.preventDefault()
    if (pressingRef.current || playbackRef.current) return
    pressingRef.current = true
    pressStartRef.current = performance.now()
    setIsPressing(true)
  }, [])

  const endPress = useCallback((event) => {
    if (event) event.preventDefault()
    if (!pressingRef.current) return
    const now = performance.now()
    const duration = now - pressStartRef.current
    const symbol = duration < 300 ? '.' : '-'
    pressingRef.current = false
    lastReleaseRef.current = now
    setIsPressing(false)
    addSymbol(symbol, duration)
  }, [addSymbol])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('pointerdown', beginPress)
    canvas.addEventListener('pointerup', endPress)
    canvas.addEventListener('pointerleave', endPress)
    canvas.addEventListener('pointercancel', endPress)

    return () => {
      canvas.removeEventListener('pointerdown', beginPress)
      canvas.removeEventListener('pointerup', endPress)
      canvas.removeEventListener('pointerleave', endPress)
      canvas.removeEventListener('pointercancel', endPress)
    }
  }, [beginPress, canvasRef, endPress])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code !== 'Space') return
      beginPress(event)
    }

    const handleKeyUp = (event) => {
      if (event.code !== 'Space') return
      endPress(event)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [beginPress, endPress])

  const clearTape = useCallback(() => {
    tapeRef.current = []
    pulseRef.current = []
    playbackRef.current = null
    pressingRef.current = false
    setIsPressing(false)
    setSymbols(0)
    setWords(0)
    commitDecoded('')
    commitPattern('')
    setMessage('paper tape burned clean; the lantern waits')
  }, [commitDecoded, commitPattern])

  const loadBeacon = useCallback((text) => {
    playbackRef.current = {
      events: encodeText(text),
      index: 0,
      nextAt: performance.now() + 120,
      emitting: false,
      releaseAt: 0,
      source: text
    }
    setBeaconText(text)
    setMode('beacon')
    setMessage(`beacon phrase queued: ${text}`)
  }, [])

  const sampleBeacon = useCallback(() => {
    const currentIndex = SAMPLES.indexOf(beaconText)
    const next = SAMPLES[(currentIndex + 1 + SAMPLES.length) % SAMPLES.length]
    clearTape()
    loadBeacon(next)
  }, [beaconText, clearTape, loadBeacon])

  const replayTape = useCallback(() => {
    if (!decodedRef.current.trim()) {
      setMessage('nothing recorded yet; press a pulse into the glass')
      return
    }
    const text = decodedRef.current.trim().replace(/\?/g, '')
    clearTape()
    loadBeacon(text || SAMPLES[0])
  }, [clearTape, loadBeacon])

  const forceResolve = useCallback(() => {
    if (!patternRef.current) {
      setMessage('no open pattern on the tape')
      return
    }
    finalizeLetter(true)
  }, [finalizeLetter])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    if (nextMode === 'listen') setMessage('live receiver open; press timing writes the alphabet')
    if (nextMode === 'beacon') setMessage('beacon mode arms a remembered phrase for replay')
    if (nextMode === 'cipher') setMessage('cipher lens flips decoded letters through the shadow alphabet')
  }, [])

  const processSilence = useCallback((now) => {
    if (pressingRef.current || playbackRef.current || !lastReleaseRef.current) return
    const silence = now - lastReleaseRef.current

    if (patternRef.current && silence > LETTER_GAP_MS && lastFinalizedRef.current < lastReleaseRef.current) {
      finalizeLetter()
      return
    }

    if (!patternRef.current && silence > WORD_GAP_MS && lastFinalizedRef.current > 0) {
      addWordGap()
      lastReleaseRef.current = 0
    }
  }, [addWordGap, finalizeLetter])

  const processPlayback = useCallback((now) => {
    const playback = playbackRef.current
    if (!playback) return

    if (playback.emitting) {
      if (now < playback.releaseAt) return
      pressingRef.current = false
      setIsPressing(false)
      addSymbol(playback.currentSymbol, playback.currentDuration)
      playback.emitting = false
      playback.nextAt = now + (playback.nextGap || 150)
      return
    }

    if (now < playback.nextAt) return
    const event = playback.events[playback.index]
    if (!event) {
      finalizeLetter()
      playbackRef.current = null
      setMessage(`beacon complete: ${playback.source}`)
      return
    }

    playback.index += 1

    if (event.type === 'mark') {
      pressingRef.current = true
      pressStartRef.current = now
      setIsPressing(true)
      playback.currentSymbol = event.symbol
      playback.currentDuration = event.duration
      playback.nextGap = 140
      playback.releaseAt = now + event.duration
      playback.emitting = true
      return
    }

    if (event.scope === 'letter') {
      finalizeLetter()
      playback.nextAt = now + 360
      return
    }

    if (event.scope === 'word') {
      finalizeLetter()
      addWordGap()
      playback.nextAt = now + 560
      return
    }

    playback.nextAt = now + 120
  }, [addSymbol, addWordGap, finalizeLetter])

  const drawPaperTape = useCallback((now) => {
    const tape = tapeRef.current
    const baseY = dimensions.height * 0.62
    const startX = dimensions.width - 28
    const step = Math.max(18, Math.min(32, dimensions.width / 30))

    ctx.strokeStyle = 'rgba(102, 255, 204, 0.18)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, baseY)
    ctx.lineTo(dimensions.width, baseY)
    ctx.stroke()

    tape.slice().reverse().forEach((entry, index) => {
      const x = startX - index * step
      if (x < -40) return
      const age = clamp((now - entry.created) / 1400, 0, 1)
      const alpha = 0.92 - index * 0.012

      if (entry.type === 'symbol') {
        const isDash = entry.value === '-'
        const width = isDash ? step * 1.15 : step * 0.36
        ctx.fillStyle = isDash
          ? `rgba(255, 210, 112, ${alpha})`
          : `rgba(102, 255, 204, ${alpha})`
        ctx.shadowColor = isDash ? 'rgba(255, 210, 112, 0.55)' : 'rgba(102, 255, 204, 0.55)'
        ctx.shadowBlur = 12 * (1 - age * 0.4)
        ctx.fillRect(x - width / 2, baseY - 8, width, 16)
        ctx.shadowBlur = 0
      } else if (entry.type === 'letter') {
        ctx.fillStyle = `rgba(235, 246, 255, ${alpha})`
        ctx.font = '16px ui-monospace, SFMono-Regular, Menlo'
        ctx.textAlign = 'center'
        ctx.fillText(entry.value, x, baseY - 28)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
        ctx.beginPath()
        ctx.moveTo(x, baseY - 18)
        ctx.lineTo(x, baseY + 18)
        ctx.stroke()
      } else if (entry.type === 'space') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x - 6, baseY - 24)
        ctx.lineTo(x + 6, baseY + 24)
        ctx.stroke()
      }
    })
  }, [ctx, dimensions.height, dimensions.width])

  const drawLantern = useCallback((now) => {
    const cx = dimensions.centerX
    const cy = dimensions.height * 0.34
    const held = pressingRef.current
    const heldMs = held ? now - pressStartRef.current : 0
    const power = held ? clamp(heldMs / DASH_MS, 0.2, 1) : 0.18
    const radius = 38 + power * 58

    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2.8)
    halo.addColorStop(0, `rgba(255, 236, 168, ${0.3 + power * 0.36})`)
    halo.addColorStop(0.35, `rgba(102, 255, 204, ${0.08 + power * 0.18})`)
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(cx, cy, radius * 2.8, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = `rgba(255, 230, 140, ${0.35 + power * 0.45})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()

    ctx.fillStyle = `rgba(255, 235, 158, ${0.26 + power * 0.62})`
    ctx.beginPath()
    ctx.arc(cx, cy, 18 + power * 12, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(102, 255, 204, 0.72)'
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo'
    ctx.textAlign = 'center'
    ctx.fillText(currentPattern || '...', cx, cy + radius + 34)

    const thresholdX = cx - 120 + clamp(heldMs / 620, 0, 1) * 240
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.28)'
    ctx.beginPath()
    ctx.moveTo(cx - 120, cy + radius + 52)
    ctx.lineTo(cx + 120, cy + radius + 52)
    ctx.stroke()
    ctx.fillStyle = heldMs < 300 ? 'rgba(102, 255, 204, 0.88)' : 'rgba(255, 210, 112, 0.88)'
    ctx.fillRect(thresholdX - 3, cy + radius + 46, 6, 12)
  }, [ctx, currentPattern, dimensions.centerX, dimensions.height])

  const drawPulses = useCallback(() => {
    pulseRef.current = pulseRef.current
      .map(pulse => ({ ...pulse, age: pulse.age + 1 }))
      .filter(pulse => pulse.age < pulse.life)

    pulseRef.current.forEach((pulse, index) => {
      const t = pulse.age / pulse.life
      const y = dimensions.height * (0.24 + index * 0.05)
      const width = pulse.symbol === '-' ? 120 : 38
      const x = dimensions.centerX + Math.sin((frameRef.current + index * 13) * 0.04) * 90
      ctx.strokeStyle = `hsla(${pulse.hue}, 90%, 72%, ${1 - t})`
      ctx.lineWidth = 5 * (1 - t) + 1
      ctx.beginPath()
      ctx.moveTo(x - width / 2, y + t * 120)
      ctx.lineTo(x + width / 2, y + t * 120)
      ctx.stroke()
    })
  }, [ctx, dimensions.centerX, dimensions.height])

  const drawDecodedPanel = useCallback(() => {
    const panelHeight = 88
    const y = dimensions.height - panelHeight - 18
    const x = 18
    const width = dimensions.width - 36

    ctx.fillStyle = 'rgba(2, 10, 16, 0.72)'
    ctx.fillRect(x, y, width, panelHeight)
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.18)'
    ctx.strokeRect(x, y, width, panelHeight)

    ctx.fillStyle = mode === 'cipher' ? 'rgba(255, 210, 112, 0.86)' : 'rgba(102, 255, 204, 0.86)'
    ctx.font = '18px ui-monospace, SFMono-Regular, Menlo'
    ctx.textAlign = 'left'
    const text = displayText || '...'
    ctx.fillText(text.slice(-48), x + 18, y + 38)

    ctx.fillStyle = 'rgba(102, 255, 204, 0.38)'
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo'
    ctx.fillText(message.slice(0, 74), x + 18, y + 64)
  }, [ctx, dimensions.height, dimensions.width, displayText, message, mode])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    const now = performance.now()
    const delta = now - lastDrawRef.current
    lastDrawRef.current = now
    frameRef.current += 1

    processPlayback(now)
    processSilence(now)

    ctx.fillStyle = 'rgba(0, 2, 8, 0.22)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const scanStep = 36
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.055)'
    ctx.lineWidth = 1
    for (let y = (frameRef.current % scanStep) - scanStep; y < dimensions.height; y += scanStep) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(dimensions.width, y)
      ctx.stroke()
    }

    drawLantern(now)
    drawPulses(delta)
    drawPaperTape(now)
    drawDecodedPanel()
  }, [ctx, dimensions.height, dimensions.width, drawDecodedPanel, drawLantern, drawPaperTape, drawPulses, processPlayback, processSilence])

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

  const controls = useMemo(() => ([
    {
      id: 'beacon',
      label: 'sample.beacon()',
      onClick: sampleBeacon,
      active: mode === 'beacon'
    },
    {
      id: 'resolve',
      label: 'resolve()',
      onClick: forceResolve,
      disabled: !currentPattern
    },
    {
      id: 'replay',
      label: 'replay.tape()',
      onClick: replayTape,
      disabled: !decoded.trim()
    },
    {
      id: 'clear',
      label: 'clear.tape()',
      onClick: clearTape,
      variant: 'reset'
    }
  ]), [clearTape, currentPattern, decoded, forceResolve, mode, replayTape, sampleBeacon])

  const metrics = useMemo(() => ([
    { label: 'symbols', value: symbols },
    { label: 'open', value: currentPattern || 'none' },
    { label: 'words', value: words },
    { label: 'mode', value: mode }
  ]), [currentPattern, mode, symbols, words])

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

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-void-green/45 hidden sm:inline">decoded</span>
          <span className="max-w-[44vw] truncate text-void-cyan">{displayText || '...'}</span>
          <span className={`h-3 w-3 rounded-full ${isPressing ? 'bg-void-yellow shadow-[0_0_18px_rgba(255,204,102,0.8)]' : 'bg-void-green/25'}`} />
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
          data-testid="signal-lantern-canvas"
        />
      </div>
    </div>
  )
}

export default SignalLantern
