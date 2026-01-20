import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'euclid', label: 'euclid()' },
  { id: 'phase', label: 'phase()' },
  { id: 'palindrome', label: 'palindrome()' }
]

const euclideanPattern = (steps, pulses) => {
  const pattern = []
  let bucket = 0

  for (let i = 0; i < steps; i++) {
    bucket += pulses
    if (bucket >= steps) {
      bucket -= steps
      pattern.push(true)
    } else {
      pattern.push(false)
    }
  }

  return pattern
}

const rotatePattern = (pattern, shift) => {
  const len = pattern.length
  const rotated = new Array(len)
  for (let i = 0; i < len; i++) {
    rotated[i] = pattern[(i - shift + len * 10) % len]
  }
  return rotated
}

const mirrorPattern = (length, pulses) => {
  const half = Math.ceil(length / 2)
  const base = euclideanPattern(half, Math.min(half, pulses))
  const mirror = base.slice(0, length - half).reverse()
  return [...base, ...mirror]
}

const lcm = (a, b) => {
  const gcd = (x, y) => (y === 0 ? x : gcd(y, x % y))
  return (a * b) / gcd(a, b)
}

const createTrack = (id, length, pulses, color) => ({
  id,
  length,
  steps: euclideanPattern(length, pulses),
  color,
  lastStep: -1,
  lastHit: 0,
  playhead: 0,
  phaseOffset: Math.random() * 400
})

const RhythmLattice = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const tracksRef = useRef([
    createTrack('φ5', 5, 2, '#7ef2c8'),
    createTrack('prime7', 7, 3, '#ffd580'),
    createTrack('cycle9', 9, 4, '#8fb7ff'),
    createTrack('clave12', 12, 5, '#ff8fb8'),
    createTrack('grid16', 16, 6, '#9ff3e1')
  ])

  const timeRef = useRef(0)
  const lastFrameRef = useRef(0)
  const hitCountRef = useRef(0)
  const audioCtxRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(true)
  const [bpm, setBpm] = useState(96)
  const [mode, setMode] = useState('euclid')
  const [message, setMessage] = useState('∴ polyrhythms braid themselves into lattice ∴')
  const [revision, setRevision] = useState(0)
  const [hitCount, setHitCount] = useState(0)
  const [log, setLog] = useState([])

  const primeAudio = useCallback(() => {
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
      return
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      audioCtxRef.current = new AudioContextClass()
    } catch (e) {
      audioCtxRef.current = null
    }
  }, [])

  const playTone = useCallback((freq) => {
    const audio = audioCtxRef.current
    if (!audio || audio.state !== 'running') return

    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.frequency.value = freq
    gain.gain.value = 0.03
    osc.connect(gain)
    gain.connect(audio.destination)
    osc.start()
    osc.stop(audio.currentTime + 0.08)
  }, [])

  const registerHit = useCallback((track, stepIndex) => {
    track.lastHit = performance.now()
    hitCountRef.current += 1
    setHitCount(hitCountRef.current)

    const pitch = 180 + track.length * 6 + stepIndex * 2
    playTone(pitch)

    setLog((prev) => {
      const entry = { id: `${track.id}-${stepIndex}-${Date.now()}`, text: `${track.id}[${stepIndex + 1}]` }
      return [entry, ...prev].slice(0, 7)
    })
  }, [playTone])

  const rebuildPatterns = useCallback((modeToUse) => {
    const tracks = tracksRef.current

    tracks.forEach((track, index) => {
      const pulses = Math.max(2, Math.round(track.length * (0.32 + index * 0.04)))

      if (modeToUse === 'euclid') {
        track.steps = euclideanPattern(track.length, pulses)
        track.phaseOffset = index * 30
      } else if (modeToUse === 'phase') {
        const base = euclideanPattern(track.length, pulses)
        track.steps = rotatePattern(base, index)
        track.phaseOffset = index * 90
      } else if (modeToUse === 'palindrome') {
        track.steps = mirrorPattern(track.length, pulses)
        track.phaseOffset = index * 45
      }

      track.lastStep = -1
    })

    timeRef.current = 0
    setRevision((r) => r + 1)
  }, [])

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    rebuildPatterns(newMode)

    const modeMessages = {
      euclid: '∴ even pulses distribute across the grid ∴',
      phase: '∴ staggered phases slip past each other ∴',
      palindrome: '∴ mirrored cells chant forwards and back ∴'
    }
    setMessage(modeMessages[newMode] || '∴ lattice retuned ∴')
  }, [rebuildPatterns])

  const handleShift = useCallback(() => {
    tracksRef.current.forEach((track, index) => {
      track.steps = rotatePattern(track.steps, (index % track.length) + 1)
      track.lastStep = -1
    })
    setRevision((r) => r + 1)
    setMessage('∴ phase slip applied • grooves slide ∴')
  }, [])

  const handleClear = useCallback(() => {
    tracksRef.current.forEach((track) => {
      track.steps = new Array(track.length).fill(false)
      track.lastStep = -1
    })
    setRevision((r) => r + 1)
    setMessage('∴ lattice cleared • silence invites intent ∴')
  }, [])

  const togglePlay = useCallback(() => {
    primeAudio()
    setIsPlaying((playing) => {
      setMessage(playing ? '∴ paused the pulse ∴' : '∴ transport rolling again ∴')
      return !playing
    })
  }, [primeAudio])

  const nudgeTempo = useCallback((delta) => {
    setBpm((prev) => Math.min(180, Math.max(50, Math.round(prev + delta))))
  }, [])

  const handleCanvasToggle = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current
    if (!canvas || dimensions.width === 0) return

    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    const tracks = tracksRef.current
    const margin = 64
    const innerWidth = Math.max(200, dimensions.width - margin * 2)
    const rowHeight = dimensions.height / (tracks.length + 1)

    const row = Math.floor(y / rowHeight)
    const track = tracks[row]
    if (!track) return

    const cellWidth = innerWidth / track.length
    const col = Math.floor((x - margin) / cellWidth)
    if (col < 0 || col >= track.length) return

    track.steps[col] = !track.steps[col]
    track.lastStep = -1
    setRevision((r) => r + 1)
    setMessage(`∴ toggled ${track.id}[${col + 1}] ∴`)
  }, [canvasRef, dimensions.width, dimensions.height])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e) => {
      primeAudio()
      handleCanvasToggle(e.clientX, e.clientY)
    }

    const handleTouch = (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      if (!touch) return
      primeAudio()
      handleCanvasToggle(touch.clientX, touch.clientY)
    }

    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('touchstart', handleTouch)

    return () => {
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('touchstart', handleTouch)
    }
  }, [canvasRef, handleCanvasToggle, primeAudio])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const now = performance.now()
    if (!lastFrameRef.current) lastFrameRef.current = now
    const delta = now - lastFrameRef.current
    lastFrameRef.current = now

    if (isPlaying) {
      timeRef.current += delta
    }

    ctx.fillStyle = 'rgba(0, 8, 16, 0.22)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const tracks = tracksRef.current
    const margin = 64
    const innerWidth = Math.max(200, dimensions.width - margin * 2)
    const rowHeight = dimensions.height / (tracks.length + 1)
    const hover = mouse.positionRef.current

    tracks.forEach((track, index) => {
      const y = rowHeight * (index + 1)
      const cellWidth = innerWidth / track.length
      const cycle = (60000 / bpm) * track.length

      const playheadTime = (timeRef.current + track.phaseOffset) % cycle
      const progress = playheadTime / cycle
      const stepIndex = Math.floor(progress * track.length)

      if (isPlaying && stepIndex !== track.lastStep) {
        if (track.steps[stepIndex]) {
          registerHit(track, stepIndex)
        }
        track.lastStep = stepIndex
      }

      // guide line
      ctx.strokeStyle = 'rgba(102, 255, 204, 0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(margin, y)
      ctx.lineTo(margin + innerWidth, y)
      ctx.stroke()

      for (let s = 0; s < track.length; s++) {
        const x = margin + s * cellWidth
        const isActive = track.steps[s]
        const isCurrent = s === stepIndex
        const hovering = hover.x >= x && hover.x < x + cellWidth && hover.y > y - rowHeight / 2 && hover.y < y + rowHeight / 2
        const flash = track.lastHit && now - track.lastHit < 160

        ctx.fillStyle = isCurrent ? 'rgba(255, 255, 255, 0.06)' : 'rgba(102, 255, 204, 0.04)'
        ctx.fillRect(x + 1, y - rowHeight * 0.35, cellWidth - 2, rowHeight * 0.7)

        if (isActive) {
          ctx.fillStyle = `${track.color}22`
          ctx.fillRect(x + 3, y - rowHeight * 0.32, cellWidth - 6, rowHeight * 0.64)
          ctx.fillStyle = flash ? `${track.color}` : `${track.color}cc`
          ctx.globalAlpha = hovering ? 0.9 : 0.75
          ctx.fillRect(x + 5, y - rowHeight * 0.28, cellWidth - 10, rowHeight * 0.56)
          ctx.globalAlpha = 1
        } else if (hovering) {
          ctx.fillStyle = 'rgba(102, 255, 204, 0.12)'
          ctx.fillRect(x + 5, y - rowHeight * 0.28, cellWidth - 10, rowHeight * 0.56)
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
        ctx.fillRect(x + cellWidth - 2, y - rowHeight * 0.36, 1, rowHeight * 0.72)
      }

      const headX = margin + progress * innerWidth
      ctx.strokeStyle = track.color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(headX, y - rowHeight * 0.42)
      ctx.lineTo(headX, y + rowHeight * 0.42)
      ctx.stroke()

      ctx.font = '12px "IBM Plex Mono", monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = track.color
      ctx.fillText(`${track.id} • ${track.length}`, 14, y)
    })
  }, [ctx, dimensions.width, dimensions.height, bpm, isPlaying, mouse.positionRef, registerHit])

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
    rebuildPatterns(mode)
  }, [rebuildPatterns, mode])

  const metrics = useMemo(() => {
    const tracks = tracksRef.current
    const totalSteps = tracks.reduce((sum, t) => sum + t.length, 0)
    const activeSteps = tracks.reduce((sum, t) => sum + t.steps.filter(Boolean).length, 0)
    const density = totalSteps > 0 ? Math.round((activeSteps / totalSteps) * 100) : 0

    const superCycle = tracks.reduce((acc, t) => lcm(acc, t.length), 1)
    const cycleSeconds = ((60 / bpm) * superCycle).toFixed(1)

    return [
      { label: 'tempo', value: `${Math.round(bpm)} bpm ${isPlaying ? '↻' : 'paused'}` },
      { label: 'density', value: `${density}% active` },
      { label: 'supercycle', value: `${superCycle} steps / ${cycleSeconds}s` },
      { label: 'hits', value: hitCount }
    ]
  }, [bpm, isPlaying, revision, hitCount])

  const controls = [
    {
      id: 'transport',
      label: isPlaying ? 'pause()' : 'play()',
      onClick: togglePlay
    },
    {
      id: 'regen',
      label: 'regen()',
      onClick: () => rebuildPatterns(mode)
    },
    {
      id: 'shift',
      label: 'phaseShift()',
      onClick: handleShift
    },
    {
      id: 'faster',
      label: 'faster()',
      onClick: () => nudgeTempo(3)
    },
    {
      id: 'slower',
      label: 'slower()',
      onClick: () => nudgeTempo(-3)
    },
    {
      id: 'clear',
      label: 'clear()',
      onClick: handleClear,
      variant: 'reset'
    }
  ]

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Header */}
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

      {/* Controls */}
      <div className="flex items-center justify-between p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
          {message}
        </p>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="rhythm-canvas"
        />

        {log.length > 0 && (
          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 space-y-1 pointer-events-none">
            {log.map((entry) => (
              <div
                key={entry.id}
                className="text-void-cyan/70 text-xs font-mono bg-void-dark/70 border border-void-green/20 px-2 py-1 inline-block"
              >
                ♪ {entry.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default RhythmLattice
