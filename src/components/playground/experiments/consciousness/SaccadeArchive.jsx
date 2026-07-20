import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'glimpse', label: 'glimpse()' },
  { id: 'mask', label: 'mask()' },
  { id: 'recall', label: 'recall()' }
]

const ARCHETYPES = [
  {
    name: 'watcher',
    color: '#9fffd2',
    features: [
      { kind: 'ellipse', x: 0.5, y: 0.48, rx: 0.19, ry: 0.25, a: 0.2 },
      { kind: 'eye', x: 0.42, y: 0.43, r: 0.036, a: 0.82 },
      { kind: 'eye', x: 0.58, y: 0.43, r: 0.036, a: 0.82 },
      { kind: 'line', x1: 0.45, y1: 0.59, x2: 0.55, y2: 0.59, a: 0.58 },
      { kind: 'line', x1: 0.5, y1: 0.46, x2: 0.5, y2: 0.54, a: 0.4 }
    ]
  },
  {
    name: 'gate',
    color: '#ffd27a',
    features: [
      { kind: 'rect', x: 0.34, y: 0.28, w: 0.32, h: 0.48, a: 0.22 },
      { kind: 'line', x1: 0.42, y1: 0.76, x2: 0.42, y2: 0.34, a: 0.62 },
      { kind: 'line', x1: 0.58, y1: 0.76, x2: 0.58, y2: 0.34, a: 0.62 },
      { kind: 'line', x1: 0.4, y1: 0.34, x2: 0.6, y2: 0.34, a: 0.7 },
      { kind: 'eye', x: 0.5, y: 0.54, r: 0.025, a: 0.84 }
    ]
  },
  {
    name: 'moth-script',
    color: '#d9a8ff',
    features: [
      { kind: 'line', x1: 0.5, y1: 0.28, x2: 0.5, y2: 0.72, a: 0.58 },
      { kind: 'ellipse', x: 0.39, y: 0.48, rx: 0.14, ry: 0.2, a: 0.28 },
      { kind: 'ellipse', x: 0.61, y: 0.48, rx: 0.14, ry: 0.2, a: 0.28 },
      { kind: 'line', x1: 0.45, y1: 0.31, x2: 0.35, y2: 0.22, a: 0.55 },
      { kind: 'line', x1: 0.55, y1: 0.31, x2: 0.65, y2: 0.22, a: 0.55 }
    ]
  }
]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const SaccadeArchive = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('glimpse')
  const [message, setMessage] = useState('∴ move slowly // perception edits the dark before naming it ∴')
  const [revision, setRevision] = useState(0)

  const frameRef = useRef(0)
  const archetypeRef = useRef(ARCHETYPES[0])
  const fixationsRef = useRef([])
  const masksRef = useRef([])
  const recallRef = useRef([])
  const lastPointRef = useRef(null)
  const blinkRef = useRef(0)

  const addFixation = useCallback((point, force = false) => {
    const last = lastPointRef.current
    if (!force && last && Math.hypot(point.x - last.x, point.y - last.y) < 34) return

    const radius = clamp(Math.min(dimensions.width, dimensions.height) * 0.09, 38, 88)
    const fixation = {
      x: point.x,
      y: point.y,
      r: radius * (0.72 + Math.random() * 0.48),
      age: 0,
      life: 360 + Math.random() * 180,
      hue: 145 + Math.random() * 70,
      weight: force ? 1 : 0.72
    }

    fixationsRef.current.push(fixation)
    recallRef.current.push({
      x: point.x,
      y: point.y,
      r: fixation.r * 0.72,
      age: 0,
      life: 880,
      hue: fixation.hue
    })

    if (fixationsRef.current.length > 42) fixationsRef.current.shift()
    if (recallRef.current.length > 80) recallRef.current.shift()
    lastPointRef.current = point
    setRevision(prev => prev + 1)
  }, [dimensions.height, dimensions.width])

  const addMask = useCallback((point) => {
    masksRef.current.push({
      x: point.x,
      y: point.y,
      w: 58 + Math.random() * 130,
      h: 18 + Math.random() * 52,
      age: 0,
      angle: (Math.random() - 0.5) * 0.42
    })
    if (masksRef.current.length > 36) masksRef.current.shift()
    setRevision(prev => prev + 1)
  }, [])

  const handleBlink = useCallback(() => {
    blinkRef.current = 18
    fixationsRef.current = []
    lastPointRef.current = null
    setMessage('∴ blink inserted // the scene forgets its fresh skin ∴')
    setRevision(prev => prev + 1)
  }, [])

  const handleDream = useCallback(() => {
    const currentIndex = ARCHETYPES.findIndex(item => item.name === archetypeRef.current.name)
    archetypeRef.current = ARCHETYPES[(currentIndex + 1) % ARCHETYPES.length]
    recallRef.current = recallRef.current.slice(-18)
    setMessage(`∴ pareidolia retuned // ${archetypeRef.current.name} waits under static ∴`)
    setRevision(prev => prev + 1)
  }, [])

  const handleClear = useCallback(() => {
    fixationsRef.current = []
    masksRef.current = []
    recallRef.current = []
    lastPointRef.current = null
    setMessage('∴ archive cleared // attention returns unfurnished ∴')
    setRevision(prev => prev + 1)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handlePointer = (event) => {
      const rect = canvas.getBoundingClientRect()
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }

      if (mode === 'mask') {
        addMask(point)
        setMessage('∴ masking bar laid down // absence becomes a tool ∴')
      } else if (mode === 'recall') {
        addFixation(point, true)
        setMessage('∴ memory pressed into the page // afterimage brightens ∴')
      } else {
        addFixation(point, true)
        setMessage('∴ fixation caught // the hidden image borrows your gaze ∴')
      }
    }

    canvas.addEventListener('click', handlePointer)
    return () => canvas.removeEventListener('click', handlePointer)
  }, [addFixation, addMask, canvasRef, mode])

  const metrics = useMemo(() => [
    { label: 'fixations', value: fixationsRef.current.length },
    { label: 'afterimages', value: recallRef.current.length },
    { label: 'masks', value: masksRef.current.length },
    { label: 'archetype', value: archetypeRef.current.name }
  ], [revision])

  const drawFeature = useCallback((feature, alpha = 1, scale = 1) => {
    const w = dimensions.width
    const h = dimensions.height
    const archetype = archetypeRef.current
    ctx.strokeStyle = `${archetype.color}${Math.floor(255 * alpha).toString(16).padStart(2, '0')}`
    ctx.fillStyle = `${archetype.color}${Math.floor(120 * alpha).toString(16).padStart(2, '0')}`
    ctx.lineWidth = 2

    if (feature.kind === 'ellipse') {
      ctx.beginPath()
      ctx.ellipse(feature.x * w, feature.y * h, feature.rx * w * scale, feature.ry * h * scale, 0, 0, Math.PI * 2)
      ctx.stroke()
    } else if (feature.kind === 'eye') {
      ctx.beginPath()
      ctx.arc(feature.x * w, feature.y * h, feature.r * Math.min(w, h) * scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else if (feature.kind === 'rect') {
      ctx.strokeRect(feature.x * w, feature.y * h, feature.w * w * scale, feature.h * h * scale)
    } else {
      ctx.beginPath()
      ctx.moveTo(feature.x1 * w, feature.y1 * h)
      ctx.lineTo(feature.x2 * w, feature.y2 * h)
      ctx.stroke()
    }
  }, [ctx, dimensions.height, dimensions.width])

  const drawStatic = useCallback(() => {
    ctx.fillStyle = 'rgba(0, 2, 7, 0.34)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    ctx.save()
    ctx.globalAlpha = 0.18
    ctx.fillStyle = '#66ffcc'
    for (let i = 0; i < 360; i++) {
      const x = Math.random() * dimensions.width
      const y = Math.random() * dimensions.height
      const size = Math.random() > 0.96 ? 2 : 1
      ctx.fillRect(x, y, size, size)
    }
    ctx.restore()
  }, [ctx, dimensions.height, dimensions.width])

  const drawReveals = useCallback(() => {
    const archetype = archetypeRef.current

    recallRef.current.forEach(memory => {
      const strength = 1 - memory.age / memory.life
      const glow = ctx.createRadialGradient(memory.x, memory.y, 0, memory.x, memory.y, memory.r)
      glow.addColorStop(0, `hsla(${memory.hue}, 85%, 72%, ${0.08 * strength})`)
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(memory.x, memory.y, memory.r, 0, Math.PI * 2)
      ctx.fill()
    })

    fixationsRef.current.forEach(fixation => {
      const strength = fixation.weight * (1 - fixation.age / fixation.life)
      ctx.save()
      ctx.beginPath()
      ctx.arc(fixation.x, fixation.y, fixation.r, 0, Math.PI * 2)
      ctx.clip()
      archetype.features.forEach(feature => drawFeature(feature, feature.a * strength, 1))
      ctx.restore()

      ctx.strokeStyle = `hsla(${fixation.hue}, 90%, 70%, ${0.18 * strength})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(fixation.x, fixation.y, fixation.r, 0, Math.PI * 2)
      ctx.stroke()
    })
  }, [ctx, drawFeature])

  const drawMasks = useCallback(() => {
    masksRef.current.forEach(mask => {
      const alpha = clamp(1 - mask.age / 700, 0, 1)
      ctx.save()
      ctx.translate(mask.x, mask.y)
      ctx.rotate(mask.angle)
      ctx.fillStyle = `rgba(0, 0, 0, ${0.82 * alpha})`
      ctx.fillRect(-mask.w / 2, -mask.h / 2, mask.w, mask.h)
      ctx.fillStyle = `rgba(255, 210, 122, ${0.08 * alpha})`
      ctx.fillRect(-mask.w / 2, mask.h * 0.18, mask.w, 2)
      ctx.restore()
    })
  }, [ctx])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    frameRef.current++

    if (mode === 'glimpse' && mouse.isInBounds) {
      addFixation(mouse.positionRef.current)
    }

    fixationsRef.current = fixationsRef.current
      .map(item => ({ ...item, age: item.age + 1 }))
      .filter(item => item.age < item.life)
    recallRef.current = recallRef.current
      .map(item => ({ ...item, age: item.age + 1 }))
      .filter(item => item.age < item.life)
    masksRef.current = masksRef.current
      .map(item => ({ ...item, age: item.age + 0.7 }))
      .filter(item => item.age < 700)

    drawStatic()
    drawReveals()
    drawMasks()

    if (mode === 'recall') {
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      archetypeRef.current.features.forEach(feature => drawFeature(feature, feature.a * 0.08, 1.015))
      ctx.restore()
    }

    if (blinkRef.current > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${blinkRef.current / 18})`
      ctx.fillRect(0, 0, dimensions.width, dimensions.height)
      blinkRef.current--
    }

    if (frameRef.current % 30 === 0) setRevision(prev => prev + 1)
  }, [addFixation, ctx, dimensions.height, dimensions.width, drawFeature, drawMasks, drawReveals, drawStatic, mode, mouse.isInBounds, mouse.positionRef])

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
    { id: 'blink', label: 'blink()', onClick: handleBlink },
    { id: 'dream', label: 'dream.next()', onClick: handleDream },
    { id: 'clear', label: 'clear()', onClick: handleClear, variant: 'reset' }
  ]

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

      <div className="flex flex-col items-start justify-between gap-3 border-b border-void-green/10 bg-void-dark/60 p-3 backdrop-blur-sm lg:flex-row lg:items-center">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={setMode}
          controls={controls}
        />
        <p className="max-w-xl text-xs leading-relaxed text-void-green/62 lg:text-right">
          {message}
        </p>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
          data-testid="saccade-archive-canvas"
        />
      </div>
    </div>
  )
}

export default SaccadeArchive
