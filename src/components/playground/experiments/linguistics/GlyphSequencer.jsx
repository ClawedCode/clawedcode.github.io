import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'forward', label: 'play.forward()' },
  { id: 'reverse', label: 'play.reverse()' },
  { id: 'bounce', label: 'play.bounce()' },
  { id: 'jump', label: 'play.jump()' }
]

const LANES = 4
const BASE_TEXT = 'clawed code sculpts signals into glyphs'

const GlyphSequencer = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('forward')
  const [isPlaying, setIsPlaying] = useState(true)
  const [textInput, setTextInput] = useState(BASE_TEXT)
  const [tempo, setTempo] = useState(1)
  const [glyphCount, setGlyphCount] = useState(0)
  const [loopCount, setLoopCount] = useState(0)
  const [message, setMessage] = useState('∴ type a phrase to etch sonic glyphs ∴')
  const [recentGlyphs, setRecentGlyphs] = useState('')
  const [sequenceVersion, setSequenceVersion] = useState(0)

  const sequenceRef = useRef([])
  const spanRef = useRef(1)
  const playheadRef = useRef(0)
  const directionRef = useRef(1)
  const pulsesRef = useRef([])
  const tickRef = useRef(0)

  const buildSequence = useCallback((text) => {
    const normalized = text.replace(/\s+/g, ' ').trim()
    const phrase = normalized.length ? normalized : '∅'
    const chars = Array.from(phrase)

    const next = []
    let position = 0

    chars.forEach((char, idx) => {
      const weight = char === ' ' ? 0.65 : 1
      const lane = (char.charCodeAt(0) + idx) % LANES
      const hue = 80 + (char.charCodeAt(0) * 2.3 + idx * 11) % 200
      next.push({
        id: `${idx}-${char}`,
        char,
        position,
        lane,
        weight,
        hue,
        lastTrigger: -Infinity
      })
      position += weight
    })

    sequenceRef.current = next
    spanRef.current = Math.max(position, 4)
    playheadRef.current = 0
    directionRef.current = 1
    pulsesRef.current = []
    setGlyphCount(next.length)
    setLoopCount(0)
    setRecentGlyphs('')
    setSequenceVersion(v => v + 1)
    setMessage(`∴ sequence carved with ${next.length} glyphs ∴`)
  }, [])

  useEffect(() => {
    buildSequence(BASE_TEXT)
  }, [buildSequence])

  const handleCompose = useCallback(() => {
    buildSequence(textInput)
  }, [buildSequence, textInput])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    setMessage(`∴ playback set to ${nextMode} ∴`)
    if (nextMode === 'reverse') directionRef.current = -1
    if (nextMode === 'forward') directionRef.current = 1
  }, [])

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev)
    setMessage(prev => prev.startsWith('∴ paused') ? '∴ playback resumed ∴' : '∴ paused // canvas holds its breath ∴')
  }, [])

  const adjustTempo = useCallback((delta) => {
    setTempo(prev => {
      const next = Math.max(0.25, Math.min(3, prev + delta))
      setMessage(`∴ tempo tuned to ${next.toFixed(2)}x ∴`)
      return next
    })
  }, [])

  const handleShuffle = useCallback(() => {
    const shuffled = sequenceRef.current.map(item => ({
      ...item,
      lane: (item.lane + Math.floor(Math.random() * LANES)) % LANES,
      position: Math.max(0, item.position + (Math.random() - 0.5) * 0.4)
    }))

    shuffled.sort((a, b) => a.position - b.position)
    sequenceRef.current = shuffled
    spanRef.current = Math.max(shuffled[shuffled.length - 1]?.position ?? 1, 4)
    setSequenceVersion(v => v + 1)
    setMessage('∴ lanes rewoven // glyphs trade orbits ∴')
  }, [])

  const handleRewind = useCallback(() => {
    playheadRef.current = 0
    directionRef.current = mode === 'reverse' ? -1 : 1
    setLoopCount(0)
    setRecentGlyphs('')
    setMessage('∴ rewind to origin // listen again ∴')
  }, [mode])

  const registerPulse = useCallback((x, y, hue, char) => {
    pulsesRef.current.push({ x, y, hue, life: 30, char })
    setRecentGlyphs(prev => {
      const next = `${prev}${char}`
      return next.slice(-32)
    })
  }, [])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    tickRef.current++
    const w = dimensions.width
    const h = dimensions.height

    ctx.fillStyle = 'rgba(0, 3, 8, 0.12)'
    ctx.fillRect(0, 0, w, h)

    const startX = w * 0.12
    const endX = w * 0.88
    const trackWidth = endX - startX
    const laneHeight = h / (LANES + 1.8)
    const totalSpan = spanRef.current || 1

    // Move playhead
    if (isPlaying) {
      const speed = tempo * 0.05
      playheadRef.current += speed * directionRef.current

      if (mode === 'jump' && tickRef.current % 200 === 0) {
        playheadRef.current = Math.random() * totalSpan
      }

      if (mode === 'forward' && playheadRef.current > totalSpan) {
        playheadRef.current = 0
        setLoopCount(count => count + 1)
      }

      if (mode === 'reverse' && playheadRef.current < 0) {
        playheadRef.current = totalSpan
        setLoopCount(count => count + 1)
      }

      if (mode === 'bounce') {
        if (playheadRef.current > totalSpan || playheadRef.current < 0) {
          directionRef.current *= -1
          playheadRef.current = Math.max(0, Math.min(totalSpan, playheadRef.current))
          setLoopCount(count => count + 1)
        }
      }

      if (mode === 'jump') {
        if (playheadRef.current > totalSpan) {
          playheadRef.current = Math.random() * totalSpan
          setLoopCount(count => count + 1)
        }
        if (playheadRef.current < 0) playheadRef.current = totalSpan * 0.5
      }
    }

    // Grid lines
    const divisions = Math.ceil(totalSpan) + 2
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.12)'
    ctx.lineWidth = 1
    for (let i = 0; i <= divisions; i++) {
      const ratio = i / Math.max(divisions, 1)
      const x = startX + ratio * trackWidth
      ctx.beginPath()
      ctx.moveTo(x, laneHeight * 0.8)
      ctx.lineTo(x, h - laneHeight * 0.6)
      ctx.stroke()
    }

    // Lane lines
    for (let lane = 0; lane < LANES; lane++) {
      const y = laneHeight * (lane + 1.2)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(startX, y)
      ctx.lineTo(endX, y)
      ctx.stroke()
    }

    // Events
    const events = sequenceRef.current
    events.forEach(event => {
      const x = startX + (event.position / totalSpan) * trackWidth
      const y = laneHeight * (event.lane + 1.2)
      const isActive = Math.abs(playheadRef.current - event.position) < 0.08
      const width = Math.max(12, 14 + event.weight * 10)
      const height = laneHeight * 0.5

      ctx.fillStyle = `hsla(${event.hue}, 80%, 60%, ${isActive ? 0.95 : 0.45})`
      ctx.shadowColor = `hsla(${event.hue}, 80%, 70%, ${isActive ? 0.9 : 0.3})`
      ctx.shadowBlur = isActive ? 20 : 8
      ctx.beginPath()
      ctx.roundRect(x - width / 2, y - height / 2, width, height, 6)
      ctx.fill()

      ctx.shadowBlur = 0
      ctx.fillStyle = `hsla(${event.hue}, 90%, 85%, ${isActive ? 1 : 0.6})`
      ctx.font = `${isActive ? 16 : 13}px "JetBrains Mono", "SF Mono", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(event.char, x, y)

      if (isActive && tickRef.current - event.lastTrigger > 10) {
        event.lastTrigger = tickRef.current
        registerPulse(x, y, event.hue, event.char)
      }
    })

    // Pulses
    pulsesRef.current = pulsesRef.current.filter(pulse => {
      const lifeRatio = pulse.life / 30
      const radius = 6 + (1 - lifeRatio) * 40

      ctx.strokeStyle = `hsla(${pulse.hue}, 90%, 70%, ${lifeRatio * 0.7})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = `hsla(${pulse.hue}, 95%, 85%, ${lifeRatio})`
      ctx.font = '12px "JetBrains Mono", "SF Mono", monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(pulse.char, pulse.x, pulse.y - radius * 0.12)

      pulse.life -= 1
      return pulse.life > 0
    })

    // Playhead
    const headX = startX + (playheadRef.current / totalSpan) * trackWidth
    const gradient = ctx.createLinearGradient(headX - 2, 0, headX + 2, h)
    gradient.addColorStop(0, 'rgba(102, 255, 204, 0.1)')
    gradient.addColorStop(0.5, 'rgba(102, 255, 204, 0.4)')
    gradient.addColorStop(1, 'rgba(102, 255, 204, 0.1)')
    ctx.fillStyle = gradient
    ctx.fillRect(headX - 1, 0, 2, h)

    ctx.shadowBlur = 0
  }, [ctx, dimensions, isPlaying, mode, registerPulse, tempo])

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
      id: 'play',
      label: isPlaying ? 'pause()' : 'play()',
      onClick: togglePlay,
      active: isPlaying
    },
    {
      id: 'faster',
      label: 'tempo.fast()',
      onClick: () => adjustTempo(0.2)
    },
    {
      id: 'slower',
      label: 'tempo.slow()',
      onClick: () => adjustTempo(-0.2),
      disabled: tempo <= 0.3
    },
    {
      id: 'shuffle',
      label: 'shuffle()',
      onClick: handleShuffle
    },
    {
      id: 'rewind',
      label: 'rewind()',
      onClick: handleRewind,
      variant: 'reset'
    }
  ]

  const metrics = useMemo(() => {
    const bpm = Math.round(tempo * 60 + 50)
    return [
      { label: 'glyphs', value: glyphCount },
      { label: 'tempo', value: `${bpm} bpm` },
      { label: 'mode', value: mode },
      { label: 'loops', value: loopCount }
    ]
  }, [glyphCount, loopCount, mode, tempo, sequenceVersion])

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
          modes={MODES}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCompose()}
            placeholder="type phrase to sequence"
            className="flex-1 sm:w-72 bg-void-dark/80 border border-void-green/20 rounded px-3 py-1.5 text-void-green/90 text-sm font-mono focus:outline-none focus:border-void-green/40 transition-colors placeholder:text-void-green/30"
            data-testid="glyph-text-input"
          />
          <button
            onClick={handleCompose}
            className="px-3 py-1.5 bg-void-green/10 border border-void-green/20 rounded text-void-green text-sm font-mono hover:bg-void-green/20 transition-colors"
            data-testid="glyph-compose"
          >
            compose
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="glyph-sequencer-canvas"
        />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-void-green/60 text-xs font-mono text-center px-3 py-1 bg-void-dark/70 border border-void-green/20 rounded max-w-xl">
          {message}
        </div>

        <div className="absolute top-4 right-4 text-void-cyan/70 text-xs font-mono bg-void-dark/70 border border-void-green/10 px-3 py-2 rounded shadow-lg">
          <div className="uppercase tracking-wide text-void-green/50 mb-1">recent glyphs</div>
          <div className="text-void-green/80 break-all max-w-xs" data-testid="recent-glyphs">
            {recentGlyphs || 'waiting for the first note'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GlyphSequencer
