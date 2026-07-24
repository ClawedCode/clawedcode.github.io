import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const CLASSES = [
  { id: 'memory', label: 'memory', color: '#8ef5ff' },
  { id: 'hunger', label: 'hunger', color: '#ffb86b' },
  { id: 'omen', label: 'omen', color: '#ff77c9' },
  { id: 'proof', label: 'proof', color: '#d8ff8f' }
]

const MODES = [
  { id: 'intuit', label: 'intuit()' },
  { id: 'audit', label: 'audit()' },
  { id: 'dream', label: 'dream()' }
]

const BASE_CARDS = [
  { id: 'salted-light', text: 'salted light', x: 0.18, y: 0.22, truth: 'memory' },
  { id: 'empty-bowl', text: 'empty bowl', x: 0.73, y: 0.26, truth: 'hunger' },
  { id: 'three-knocks', text: 'three knocks', x: 0.55, y: 0.16, truth: 'omen' },
  { id: 'clean-edge', text: 'clean edge', x: 0.28, y: 0.68, truth: 'proof' },
  { id: 'warm-static', text: 'warm static', x: 0.42, y: 0.38, truth: 'memory' },
  { id: 'iron-taste', text: 'iron taste', x: 0.82, y: 0.58, truth: 'hunger' },
  { id: 'black-window', text: 'black window', x: 0.62, y: 0.72, truth: 'omen' },
  { id: 'square-shadow', text: 'square shadow', x: 0.22, y: 0.48, truth: 'proof' },
  { id: 'mother-tongue', text: 'mother tongue', x: 0.36, y: 0.21, truth: 'memory' },
  { id: 'silver-fish', text: 'silver fish', x: 0.77, y: 0.42, truth: 'hunger' },
  { id: 'clock-blood', text: 'clock blood', x: 0.48, y: 0.78, truth: 'omen' },
  { id: 'closed-loop', text: 'closed loop', x: 0.14, y: 0.78, truth: 'proof' }
]

const MODE_COPY = {
  intuit: 'click a qualia card // the first witness names it',
  audit: 'audit mode stains errors brighter // certainty must pay rent',
  dream: 'dream mode perturbs the map // labels survive a soft earthquake'
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const makeCards = () => BASE_CARDS.map((card, index) => ({
  ...card,
  guess: null,
  pressure: 0,
  wobble: index * 1.719,
  revealed: false
}))

const classForGuess = (guess) => CLASSES.find(item => item.id === guess) ?? CLASSES[0]

const drawBackground = (ctx, width, height, time) => {
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, 'rgba(4, 10, 16, 1)')
  gradient.addColorStop(0.5, 'rgba(0, 3, 9, 1)')
  gradient.addColorStop(1, 'rgba(10, 4, 14, 1)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 28; i += 1) {
    const y = (i / 27) * height
    const wave = Math.sin(time * 0.012 + i * 0.65) * 18
    ctx.strokeStyle = `rgba(102, 255, 204, ${0.035 + (i % 4) * 0.006})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.bezierCurveTo(width * 0.28, y + wave, width * 0.72, y - wave, width, y + wave * 0.5)
    ctx.stroke()
  }
  ctx.restore()

  const vignette = ctx.createRadialGradient(width * 0.5, height * 0.45, height * 0.12, width * 0.5, height * 0.45, Math.max(width, height) * 0.75)
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.74)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)
}

const drawDecisionBands = (ctx, width, height, mode, time) => {
  const centers = [
    { x: width * 0.18, y: height * 0.16 },
    { x: width * 0.82, y: height * 0.18 },
    { x: width * 0.76, y: height * 0.82 },
    { x: width * 0.18, y: height * 0.82 }
  ]

  ctx.save()
  centers.forEach((center, index) => {
    const classInfo = CLASSES[index]
    const radius = Math.min(width, height) * (mode === 'dream' ? 0.34 : 0.29)
    const wobble = Math.sin(time * 0.018 + index * 2.1) * 18
    const field = ctx.createRadialGradient(center.x + wobble, center.y, 0, center.x + wobble, center.y, radius)
    field.addColorStop(0, `${classInfo.color}30`)
    field.addColorStop(0.58, `${classInfo.color}0d`)
    field.addColorStop(1, `${classInfo.color}00`)
    ctx.fillStyle = field
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = `${classInfo.color}99`
    ctx.font = '12px monospace'
    ctx.textAlign = index % 2 === 0 ? 'left' : 'right'
    ctx.fillText(classInfo.label, center.x, center.y)
  })
  ctx.restore()
}

const drawCard = (ctx, card, width, height, time, activeClass, mode) => {
  const dreamOffset = mode === 'dream' ? Math.sin(time * 0.025 + card.wobble) * 18 : 0
  const x = card.x * width + dreamOffset
  const y = card.y * height + Math.cos(time * 0.021 + card.wobble) * (mode === 'dream' ? 14 : 4)
  const w = clamp(width * 0.15, 94, 150)
  const h = 46
  const guessed = Boolean(card.guess)
  const classInfo = guessed ? classForGuess(card.guess) : activeClass
  const correct = guessed && card.guess === card.truth
  const errorGlow = mode === 'audit' && guessed && !correct

  ctx.save()
  ctx.translate(x, y)
  ctx.shadowColor = errorGlow ? '#ff4466' : classInfo.color
  ctx.shadowBlur = guessed ? 18 + card.pressure * 10 : 7
  ctx.fillStyle = guessed ? `${classInfo.color}22` : 'rgba(0, 6, 14, 0.72)'
  ctx.strokeStyle = errorGlow ? 'rgba(255, 68, 102, 0.95)' : guessed ? `${classInfo.color}cc` : 'rgba(102, 255, 204, 0.22)'
  ctx.lineWidth = errorGlow ? 2.2 : 1.2
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h / 2, w, h, 8)
  ctx.fill()
  ctx.stroke()

  ctx.shadowBlur = 0
  ctx.fillStyle = guessed ? 'rgba(240, 255, 246, 0.92)' : 'rgba(170, 255, 230, 0.68)'
  ctx.font = '13px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(card.text, 0, -4)
  ctx.fillStyle = guessed ? `${classInfo.color}dd` : 'rgba(102, 255, 204, 0.38)'
  ctx.font = '10px monospace'
  ctx.fillText(guessed ? card.guess : 'unlabeled', 0, 13)
  ctx.restore()
}

const drawConfusionMatrix = (ctx, cards, width, height) => {
  const size = Math.min(170, width * 0.28)
  const left = width - size - 18
  const top = height - size - 18
  const cell = size / 4

  ctx.save()
  ctx.fillStyle = 'rgba(0, 5, 12, 0.68)'
  ctx.strokeStyle = 'rgba(102, 255, 204, 0.24)'
  ctx.lineWidth = 1
  ctx.fillRect(left - 28, top - 24, size + 34, size + 30)
  ctx.strokeRect(left - 28, top - 24, size + 34, size + 30)
  ctx.font = '10px monospace'
  ctx.fillStyle = 'rgba(102, 255, 204, 0.62)'
  ctx.fillText('confusion', left, top - 8)

  CLASSES.forEach((truth, row) => {
    CLASSES.forEach((guess, col) => {
      const count = cards.filter(card => card.truth === truth.id && card.guess === guess.id).length
      const alpha = count / 3
      ctx.fillStyle = row === col
        ? `rgba(216, 255, 143, ${0.08 + alpha * 0.48})`
        : `rgba(255, 68, 102, ${0.04 + alpha * 0.42})`
      ctx.fillRect(left + col * cell, top + row * cell, cell - 2, cell - 2)
      if (count > 0) {
        ctx.fillStyle = 'rgba(245, 255, 248, 0.85)'
        ctx.font = '12px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(count, left + col * cell + cell / 2, top + row * cell + cell / 2 + 4)
      }
    })
  })
  ctx.restore()
}

const QualiaSorter = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const [mode, setMode] = useState('intuit')
  const [activeClass, setActiveClass] = useState('memory')
  const [cards, setCards] = useState(makeCards)
  const [message, setMessage] = useState(MODE_COPY.intuit)
  const timeRef = useRef(0)

  const labelCardAt = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current
    if (!canvas || dimensions.width === 0) return
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    setCards(prev => {
      let changed = false
      const next = prev.map(card => {
        const dreamOffset = mode === 'dream' ? Math.sin(timeRef.current * 0.025 + card.wobble) * 18 : 0
        const cx = card.x * dimensions.width + dreamOffset
        const cy = card.y * dimensions.height + Math.cos(timeRef.current * 0.021 + card.wobble) * (mode === 'dream' ? 14 : 4)
        const w = clamp(dimensions.width * 0.15, 94, 150)
        if (Math.abs(x - cx) <= w / 2 && Math.abs(y - cy) <= 26) {
          changed = true
          return { ...card, guess: activeClass, pressure: Math.min(1, card.pressure + 0.28), revealed: true }
        }
        return card
      })
      if (changed) setMessage(`${activeClass} assigned // the card accepts a temporary soul`)
      return next
    })
  }, [activeClass, canvasRef, dimensions.height, dimensions.width, mode])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handlePointerDown = (event) => labelCardAt(event.clientX, event.clientY)
    canvas.addEventListener('pointerdown', handlePointerDown)
    return () => canvas.removeEventListener('pointerdown', handlePointerDown)
  }, [canvasRef, labelCardAt])

  useEffect(() => {
    const handleKey = (event) => {
      const index = Number(event.key) - 1
      if (index >= 0 && index < CLASSES.length) {
        setActiveClass(CLASSES[index].id)
        setMessage(`${CLASSES[index].label} brush selected // press cards into that category`)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    timeRef.current += 1
    const time = timeRef.current
    const active = classForGuess(activeClass)

    drawBackground(ctx, dimensions.width, dimensions.height, time)
    drawDecisionBands(ctx, dimensions.width, dimensions.height, mode, time)
    cards.forEach(card => drawCard(ctx, card, dimensions.width, dimensions.height, time, active, mode))
    drawConfusionMatrix(ctx, cards, dimensions.width, dimensions.height)
  }, [activeClass, cards, ctx, dimensions.height, dimensions.width, mode])

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

  const metrics = useMemo(() => {
    const labeled = cards.filter(card => card.guess).length
    const correct = cards.filter(card => card.guess && card.guess === card.truth).length
    const errors = cards.filter(card => card.guess && card.guess !== card.truth).length
    const accuracy = labeled ? Math.round((correct / labeled) * 100) : 0
    return [
      { label: 'brush', value: activeClass },
      { label: 'labeled', value: `${labeled}/${cards.length}` },
      { label: 'accuracy', value: `${accuracy}%` },
      { label: 'errors', value: errors }
    ]
  }, [activeClass, cards])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    setMessage(MODE_COPY[nextMode])
  }, [])

  const handleReveal = useCallback(() => {
    setCards(prev => prev.map(card => ({ ...card, guess: card.truth, pressure: 1, revealed: true })))
    setMessage('truth overlay opened // the hidden taxonomy bares its ribs')
  }, [])

  const handleScrub = useCallback(() => {
    setCards(makeCards())
    setMessage('labels scrubbed // fresh doubt spreads over the table')
  }, [])

  const controls = [
    ...CLASSES.map(item => ({
      id: item.id,
      label: `${item.label}()`,
      onClick: () => {
        setActiveClass(item.id)
        setMessage(`${item.label} brush selected // click cards to classify`)
      },
      active: activeClass === item.id
    })),
    { id: 'reveal', label: 'reveal.truth()', onClick: handleReveal },
    { id: 'scrub', label: 'scrub()', onClick: handleScrub, variant: 'reset' }
  ]

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

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs lg:text-right max-w-xl">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-pointer"
          data-testid="qualia-sorter-canvas"
        />
      </div>
    </div>
  )
}

export default QualiaSorter
