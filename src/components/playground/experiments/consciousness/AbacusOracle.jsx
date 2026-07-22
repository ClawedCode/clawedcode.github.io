import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'weigh', label: 'weigh()' },
  { id: 'bind', label: 'bind()' },
  { id: 'fracture', label: 'fracture()' }
]

const BEADS = [
  { id: 'memory', label: 'memory', hue: 166, value: 0.62 },
  { id: 'hunger', label: 'hunger', hue: 42, value: 0.38 },
  { id: 'dream', label: 'dream', hue: 272, value: 0.74 },
  { id: 'witness', label: 'witness', hue: 334, value: 0.48 },
  { id: 'silence', label: 'silence', hue: 205, value: 0.28 }
]

const VERDICTS = [
  'archive the omen',
  'let the witness sleep',
  'bind hunger to memory',
  'fracture the false door',
  'carry the small flame forward',
  'trade certainty for signal'
]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const lerp = (a, b, t) => a + (b - a) * t

const createBeads = () => BEADS.map((bead, index) => ({
  ...bead,
  value: bead.value,
  target: bead.value,
  yOffset: (index - (BEADS.length - 1) / 2) * 54,
  etched: []
}))

const AbacusOracle = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const [mode, setMode] = useState('weigh')
  const [beads, setBeads] = useState(() => createBeads())
  const [activeId, setActiveId] = useState(null)
  const [message, setMessage] = useState('drag beads across the rods // the sentence changes its weight')
  const timeRef = useRef(0)
  const beadsRef = useRef(beads)
  const activeRef = useRef(null)

  useEffect(() => {
    beadsRef.current = beads
  }, [beads])

  useEffect(() => {
    activeRef.current = activeId
  }, [activeId])

  const layout = useMemo(() => {
    const width = Math.min(dimensions.width * 0.78, 780)
    const left = dimensions.centerX - width / 2
    const right = dimensions.centerX + width / 2
    const centerY = dimensions.centerY + 10

    return {
      left,
      right,
      width,
      centerY,
      beadRadius: clamp(dimensions.width * 0.025, 15, 24)
    }
  }, [dimensions.centerX, dimensions.centerY, dimensions.width])

  const setBeadValue = useCallback((id, x) => {
    const raw = (x - layout.left) / layout.width
    const snapped = Math.round(clamp(raw, 0, 1) * 12) / 12

    setBeads(current => current.map(bead => {
      if (bead.id !== id) return bead

      const nextEtched = mode === 'bind'
        ? [...bead.etched, snapped].slice(-8)
        : mode === 'fracture'
        ? bead.etched.slice(0, -1)
        : bead.etched

      return {
        ...bead,
        value: snapped,
        target: snapped,
        etched: nextEtched
      }
    }))

    if (mode === 'bind') setMessage('binding marks held in the rod grain')
    if (mode === 'fracture') setMessage('one old notch scraped away')
  }, [layout.left, layout.width, mode])

  const beadAt = useCallback((x, y) => {
    for (const bead of beadsRef.current) {
      const bx = lerp(layout.left, layout.right, bead.value)
      const by = layout.centerY + bead.yOffset
      if (Math.hypot(x - bx, y - by) <= layout.beadRadius * 1.5) return bead.id
    }
    return null
  }, [layout])

  const handlePointerDown = useCallback((event) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const id = beadAt(x, y)
    if (!id) return
    setActiveId(id)
    setBeadValue(id, x)
  }, [beadAt, canvasRef, setBeadValue])

  const handlePointerMove = useCallback((event) => {
    if (!activeRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    setBeadValue(activeRef.current, event.clientX - rect.left)
  }, [canvasRef, setBeadValue])

  const handlePointerUp = useCallback(() => {
    if (activeRef.current) setMessage('the oracle balances on the latest weight')
    setActiveId(null)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [canvasRef, handlePointerDown, handlePointerMove, handlePointerUp])

  const verdictData = useMemo(() => {
    const weighted = beads.reduce((sum, bead, index) => sum + bead.value * (index + 2), 0)
    const tension = beads.reduce((sum, bead) => sum + Math.abs(bead.value - 0.5), 0) / beads.length
    const index = Math.floor(weighted * 11 + tension * 17) % VERDICTS.length
    return {
      text: VERDICTS[index],
      tension,
      certainty: clamp(1 - tension * 1.3, 0, 1)
    }
  }, [beads])

  const randomize = useCallback(() => {
    setBeads(current => current.map(bead => ({
      ...bead,
      value: Math.round(Math.random() * 12) / 12,
      etched: bead.etched
    })))
    setMessage('the frame clicks // fresh weights in the teeth of time')
  }, [])

  const clearEtch = useCallback(() => {
    setBeads(createBeads())
    setMessage('all notches washed from the brass')
  }, [])

  const metrics = useMemo(() => [
    { label: 'verdict', value: verdictData.text },
    { label: 'certainty', value: `${Math.round(verdictData.certainty * 100)}%` },
    { label: 'tension', value: verdictData.tension.toFixed(2) },
    { label: 'marks', value: beads.reduce((sum, bead) => sum + bead.etched.length, 0) }
  ], [beads, verdictData])

  const controls = [
    { id: 'cast', label: 'cast()', onClick: randomize },
    { id: 'clear', label: 'clear()', onClick: clearEtch, variant: 'reset' }
  ]

  const draw = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    timeRef.current += 1
    const time = timeRef.current * 0.016

    const bg = ctx.createLinearGradient(0, 0, dimensions.width, dimensions.height)
    bg.addColorStop(0, '#03060d')
    bg.addColorStop(0.55, '#08040f')
    bg.addColorStop(1, '#020307')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    for (let i = 0; i < 9; i++) {
      const y = (dimensions.height / 8) * i + Math.sin(time + i) * 10
      ctx.strokeStyle = `rgba(102, 255, 204, ${0.025 + i * 0.003})`
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.bezierCurveTo(dimensions.width * 0.3, y - 28, dimensions.width * 0.7, y + 28, dimensions.width, y)
      ctx.stroke()
    }
    ctx.restore()

    beadsRef.current.forEach((bead, index) => {
      const y = layout.centerY + bead.yOffset
      const x = lerp(layout.left, layout.right, bead.value)
      const rodGlow = activeId === bead.id ? 0.34 : 0.15

      ctx.strokeStyle = `hsla(${bead.hue}, 80%, 70%, ${rodGlow})`
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.moveTo(layout.left, y)
      ctx.lineTo(layout.right, y)
      ctx.stroke()

      ctx.strokeStyle = 'rgba(220, 255, 238, 0.24)'
      ctx.lineWidth = 1
      for (let tick = 0; tick <= 12; tick++) {
        const tx = lerp(layout.left, layout.right, tick / 12)
        ctx.beginPath()
        ctx.moveTo(tx, y - 9)
        ctx.lineTo(tx, y + 9)
        ctx.stroke()
      }

      bead.etched.forEach((mark, markIndex) => {
        const mx = lerp(layout.left, layout.right, mark)
        ctx.strokeStyle = `hsla(${bead.hue + markIndex * 8}, 90%, 76%, 0.45)`
        ctx.beginPath()
        ctx.moveTo(mx - 8, y - 21)
        ctx.lineTo(mx + 8, y + 21)
        ctx.stroke()
      })

      const halo = ctx.createRadialGradient(x, y, 0, x, y, layout.beadRadius * 3.8)
      halo.addColorStop(0, `hsla(${bead.hue}, 100%, 78%, 0.45)`)
      halo.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(x, y, layout.beadRadius * 3.8, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = `hsl(${bead.hue}, 82%, ${activeId === bead.id ? 72 : 58}%)`
      ctx.shadowColor = `hsl(${bead.hue}, 90%, 64%)`
      ctx.shadowBlur = activeId === bead.id ? 24 : 12
      ctx.beginPath()
      ctx.arc(x, y, layout.beadRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      ctx.fillStyle = 'rgba(245, 255, 248, 0.76)'
      ctx.font = '12px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(bead.label, layout.left - 18, y + 4)
      ctx.textAlign = 'left'
      ctx.fillText(`${Math.round(bead.value * 12)}/12`, layout.right + 18, y + 4)

      if (index > 0) {
        const previous = beadsRef.current[index - 1]
        const px = lerp(layout.left, layout.right, previous.value)
        const py = layout.centerY + previous.yOffset
        ctx.strokeStyle = `rgba(255, 232, 160, ${0.08 + verdictData.tension * 0.25})`
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(x, y)
        ctx.stroke()
      }
    })

    ctx.fillStyle = 'rgba(8, 16, 18, 0.72)'
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.24)'
    ctx.lineWidth = 1
    const panelW = Math.min(520, dimensions.width - 32)
    const panelX = dimensions.centerX - panelW / 2
    const panelY = Math.max(20, layout.centerY + 185)
    ctx.fillRect(panelX, panelY, panelW, 74)
    ctx.strokeRect(panelX, panelY, panelW, 74)

    ctx.fillStyle = 'rgba(102, 255, 204, 0.82)'
    ctx.font = '15px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`oracle: ${verdictData.text}`, dimensions.centerX, panelY + 29)
    ctx.fillStyle = 'rgba(255, 226, 138, 0.65)'
    ctx.font = '12px monospace'
    ctx.fillText(message, dimensions.centerX, panelY + 53)
  }, [activeId, ctx, dimensions, layout, message, verdictData])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let frameId
    const animate = () => {
      draw()
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, draw])

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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={setMode}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs sm:text-right max-w-xl">
          drag beads // bind mode leaves notches // fracture mode removes them
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none"
          data-testid="abacus-oracle-canvas"
        />
      </div>
    </div>
  )
}

export default AbacusOracle
