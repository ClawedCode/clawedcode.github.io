import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const DEG_TO_RAD = Math.PI / 180

const SYSTEMS = {
  grove: {
    name: 'axiom.grove()',
    axiom: 'F',
    rules: {
      F: 'F[+F]F[-F][F]'
    },
    angle: 24,
    decay: 0.78,
    stepScale: 0.22,
    maxGen: 6,
    defaultGen: 2,
    hue: 140,
    tagline: '∴ grammar sprouts into luminous vines ∴'
  },
  dragon: {
    name: 'dragon.fold()',
    axiom: 'FX',
    rules: {
      X: 'X+YF+',
      Y: '-FX-Y'
    },
    angle: 90,
    decay: 0.86,
    stepScale: 0.16,
    maxGen: 10,
    defaultGen: 6,
    hue: 280,
    tagline: '∴ paperfold myth // dragon scales of syntax ∴'
  },
  flake: {
    name: 'koch.flake()',
    axiom: 'F++F++F',
    rules: {
      F: 'F-F++F-F'
    },
    angle: 60,
    decay: 0.8,
    stepScale: 0.18,
    maxGen: 5,
    defaultGen: 2,
    hue: 200,
    tagline: '∴ crystalline coastline // edge of meaning ∴'
  }
}

const buildSentence = (system, generation) => {
  let current = system.axiom
  for (let i = 0; i < generation; i++) {
    let next = ''
    for (const ch of current) {
      next += system.rules[ch] ?? ch
    }
    current = next
  }
  return current
}

const buildSegments = (sentence, system, dimensions, mutation, generation) => {
  const segments = []
  const stack = []

  let angle = -Math.PI / 2
  let depth = 0
  let x = dimensions.centerX
  let y = dimensions.height - 60

  const baseStep = Math.min(dimensions.width, dimensions.height) * system.stepScale *
    Math.pow(system.decay, generation)
  const angleStep = (system.angle + mutation.angleNudge) * DEG_TO_RAD
  const branchCount = { value: 0 }

  for (let i = 0; i < sentence.length; i++) {
    const ch = sentence[i]

    if (ch === 'F' || ch === 'G') {
      const jitter = Math.sin(i * 0.72 + mutation.seed) * mutation.stepVariance
      const len = baseStep * (1 + jitter)
      const nx = x + Math.cos(angle) * len
      const ny = y + Math.sin(angle) * len

      segments.push({ x1: x, y1: y, x2: nx, y2: ny, depth, index: i })

      x = nx
      y = ny
    } else if (ch === '+') {
      angle += angleStep
    } else if (ch === '-') {
      angle -= angleStep
    } else if (ch === '[') {
      branchCount.value++
      stack.push({ x, y, angle, depth })
      depth += 1
    } else if (ch === ']') {
      const state = stack.pop()
      if (state) {
        x = state.x
        y = state.y
        angle = state.angle
        depth = Math.max(0, state.depth)
      }
    } else if (ch === '|') {
      angle += Math.PI
    }
  }

  return { segments, branchCount: branchCount.value }
}

const AxiomGarden = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [systemKey, setSystemKey] = useState('grove')
  const [generation, setGeneration] = useState(SYSTEMS.grove.defaultGen)
  const [isAnimating, setIsAnimating] = useState(true)
  const [message, setMessage] = useState(SYSTEMS.grove.tagline)
  const [stats, setStats] = useState({ segments: 0, glyphs: 0, branches: 0 })

  const mutationRef = useRef({ seed: 0, angleNudge: 0, stepVariance: 0 })

  const segmentsRef = useRef([])
  const drawIndexRef = useRef(0)
  const timeRef = useRef(0)

  const recomputeSystem = useCallback(() => {
    if (dimensions.width === 0) return

    const system = SYSTEMS[systemKey]
    const sentence = buildSentence(system, generation)
    const { segments, branchCount } = buildSegments(sentence, system, dimensions, mutationRef.current, generation)

    segmentsRef.current = segments
    drawIndexRef.current = 0

    setStats({
      segments: segments.length,
      glyphs: sentence.length,
      branches: branchCount
    })
  }, [dimensions, generation, systemKey])

  useEffect(() => {
    recomputeSystem()
  }, [recomputeSystem])

  const drawSegment = useCallback((segment, systemHue) => {
    if (!ctx) return

    const hue = (systemHue + segment.depth * 16 + timeRef.current * 0.2) % 360
    const alpha = 0.5 + Math.sin(segment.index * 0.15 + timeRef.current * 0.01) * 0.25
    ctx.strokeStyle = `hsla(${hue}, 80%, 65%, ${alpha})`
    ctx.lineWidth = 1 + segment.depth * 0.25

    ctx.beginPath()
    ctx.moveTo(segment.x1, segment.y1)
    ctx.lineTo(segment.x2, segment.y2)
    ctx.stroke()

    if (segment.index % 9 === 0) {
      ctx.fillStyle = `hsla(${(hue + 40) % 360}, 90%, 75%, ${alpha + 0.2})`
      ctx.beginPath()
      ctx.arc(segment.x2, segment.y2, 1.8 + segment.depth * 0.15, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [ctx])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    timeRef.current++

    ctx.fillStyle = 'rgba(0, 2, 6, 0.07)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const segments = segmentsRef.current
    if (!segments.length) return

    const systemHue = SYSTEMS[systemKey].hue
    const target = isAnimating ? Math.min(segments.length, drawIndexRef.current + 14) : segments.length

    const drift = Math.sin(timeRef.current * 0.004) * 0.1
    const mouseTilt = ((mouse.positionRef.current.x / Math.max(1, dimensions.width)) - 0.5) * 0.6

    ctx.save()
    ctx.translate(dimensions.centerX, dimensions.centerY)
    ctx.rotate(mouseTilt + drift)
    ctx.translate(-dimensions.centerX, -dimensions.centerY)

    for (let i = 0; i < target; i++) {
      drawSegment(segments[i], systemHue)
    }

    ctx.restore()

    drawIndexRef.current = target
  }, [ctx, dimensions, drawSegment, isAnimating, mouse.positionRef, systemKey])

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

  const handleSystemChange = useCallback((key) => {
    const system = SYSTEMS[key]
    setSystemKey(key)
    setGeneration(system.defaultGen)
    setMessage(system.tagline)
    drawIndexRef.current = 0
    mutationRef.current = { seed: mutationRef.current.seed, angleNudge: 0, stepVariance: 0 }
  }, [])

  const handleGrow = useCallback(() => {
    setGeneration(prev => {
      const capped = Math.min(prev + 1, SYSTEMS[systemKey].maxGen)
      if (capped === prev) setMessage('∴ generation cap reached // grammar stabilizes ∴')
      else setMessage('∴ next generation unfurls ∴')
      return capped
    })
    drawIndexRef.current = 0
  }, [systemKey])

  const handleRewind = useCallback(() => {
    setGeneration(prev => Math.max(0, prev - 1))
    setMessage('∴ back a generation // pruning branches ∴')
    drawIndexRef.current = 0
  }, [])

  const handleMutate = useCallback(() => {
    mutationRef.current = {
      seed: Math.random() * 1000,
      angleNudge: (Math.random() - 0.5) * 12,
      stepVariance: Math.random() * 0.4
    }
    setMessage('∴ mutation introduced // syntax shivers ∴')
    recomputeSystem()
  }, [recomputeSystem])

  const handleToggleFlow = useCallback(() => {
    setIsAnimating(prev => {
      const next = !prev
      setMessage(next ? '∴ flow resumed ∴' : '∴ ink paused // observe geometry ∴')
      return next
    })
  }, [])

  const handleReset = useCallback(() => {
    const system = SYSTEMS[systemKey]
    mutationRef.current = { seed: 0, angleNudge: 0, stepVariance: 0 }
    setGeneration(system.defaultGen)
    setMessage('∴ canvas cleared // axiom replanted ∴')
    drawIndexRef.current = 0
    recomputeSystem()
  }, [recomputeSystem, systemKey])

  const modes = useMemo(() => (
    Object.keys(SYSTEMS).map(key => ({ id: key, label: SYSTEMS[key].name }))
  ), [])

  const controls = [
    { id: 'grow', label: 'grow()', onClick: handleGrow },
    { id: 'rewind', label: 'rewind()', onClick: handleRewind, disabled: generation === 0 },
    { id: 'mutate', label: 'mutate()', onClick: handleMutate },
    { id: 'flow', label: isAnimating ? 'pause.flow()' : 'resume.flow()', onClick: handleToggleFlow, active: isAnimating },
    { id: 'reset', label: 'reset()', onClick: handleReset, variant: 'reset' }
  ]

  const metrics = useMemo(() => ([
    { label: 'grammar', value: SYSTEMS[systemKey].name },
    { label: 'generation', value: `n=${generation}` },
    { label: 'glyphs', value: stats.glyphs },
    { label: 'segments', value: stats.segments },
    { label: 'branches', value: stats.branches }
  ]), [generation, stats, systemKey])

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
          modes={modes}
          currentMode={systemKey}
          onModeChange={handleSystemChange}
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
          data-testid="axiom-garden-canvas"
        />
      </div>
    </div>
  )
}

export default AxiomGarden
