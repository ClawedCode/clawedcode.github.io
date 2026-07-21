import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'construct', label: 'construct()' },
  { id: 'excavate', label: 'excavate()' },
  { id: 'proof', label: 'proof()' }
]

const PALETTE = ['#66ffcc', '#ffcc66', '#88ddff', '#ff88cc', '#caff88', '#d4aaff']

const gcd = (a, b) => {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    ;[x, y] = [y, x % y]
  }
  return x || 1
}

const buildTiles = (width, height, maxSteps = 48) => {
  const tiles = []
  const steps = []
  let x = 0
  let y = 0
  let w = width
  let h = height
  let a = width
  let b = height
  let step = 0

  while (w > 0 && h > 0 && step < maxSteps) {
    if (w >= h) {
      const count = Math.floor(w / h)
      steps.push({ a, b, q: count, r: w % h })
      for (let i = 0; i < count; i++) {
        tiles.push({ x: x + i * h, y, size: h, step, quotient: i + 1 })
      }
      x += count * h
      w -= count * h
      a = h
      b = w
    } else {
      const count = Math.floor(h / w)
      steps.push({ a, b, q: count, r: h % w })
      for (let i = 0; i < count; i++) {
        tiles.push({ x, y: y + i * w, size: w, step, quotient: i + 1 })
      }
      y += count * w
      h -= count * w
      a = w
      b = h
    }
    step++
  }

  return { tiles, steps }
}

const EuclidOracle = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const [mode, setMode] = useState('construct')
  const [widthUnits, setWidthUnits] = useState(89)
  const [heightUnits, setHeightUnits] = useState(55)
  const [visibleSteps, setVisibleSteps] = useState(1)
  const [message, setMessage] = useState('∴ every rectangle confesses its hidden measure by subtraction ∴')
  const timeRef = useRef(0)
  const modeRef = useRef(mode)

  useEffect(() => { modeRef.current = mode }, [mode])

  const construction = useMemo(
    () => buildTiles(widthUnits, heightUnits),
    [widthUnits, heightUnits]
  )

  const commonMeasure = useMemo(
    () => gcd(widthUnits, heightUnits),
    [widthUnits, heightUnits]
  )

  useEffect(() => {
    setVisibleSteps(prev => Math.min(prev, Math.max(1, construction.steps.length)))
  }, [construction.steps.length])

  const changeMeasure = useCallback((side, delta) => {
    const setter = side === 'width' ? setWidthUnits : setHeightUnits
    setter(prev => Math.max(8, Math.min(144, prev + delta)))
    setVisibleSteps(1)
    setMode('construct')
    setMessage(`∴ ${side} altered • ratio wakes under a new skin ∴`)
  }, [])

  const handleStep = useCallback(() => {
    setVisibleSteps(prev => {
      const next = Math.min(construction.steps.length, prev + 1)
      setMessage(next === construction.steps.length
        ? `∴ proof sealed • common measure ${commonMeasure} ∴`
        : `∴ division ${next} exposed • remainder still breathing ∴`)
      return next
    })
  }, [construction.steps.length, commonMeasure])

  const handleSolve = useCallback(() => {
    setVisibleSteps(construction.steps.length)
    setMode('proof')
    setMessage(`∴ greatest common divisor revealed: ${commonMeasure} ∴`)
  }, [construction.steps.length, commonMeasure])

  const handleConjure = useCallback(() => {
    const seeds = [
      [144, 89],
      [121, 77],
      [96, 64],
      [105, 68],
      [128, 45],
      [72, 42]
    ]
    const [w, h] = seeds[Math.floor(Math.random() * seeds.length)]
    setWidthUnits(w)
    setHeightUnits(h)
    setVisibleSteps(1)
    setMode('excavate')
    setMessage('∴ fresh proportion dropped on the proof-table ∴')
  }, [])

  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width
    const ny = (e.clientY - rect.top) / rect.height
    setWidthUnits(Math.max(12, Math.round(32 + nx * 112)))
    setHeightUnits(Math.max(12, Math.round(20 + (1 - ny) * 104)))
    setVisibleSteps(1)
    setMode('construct')
    setMessage('∴ click became proportion • the oracle measures the bite ∴')
  }, [canvasRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('click', handleCanvasClick)
    return () => canvas.removeEventListener('click', handleCanvasClick)
  }, [canvasRef, handleCanvasClick])

  const draw = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    timeRef.current += 1
    const t = timeRef.current * 0.02
    const visible = modeRef.current === 'proof' ? construction.steps.length : visibleSteps
    const liveTiles = construction.tiles.filter(tile => tile.step < visible)

    ctx.fillStyle = 'rgba(0, 2, 8, 0.96)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const margin = Math.max(18, Math.min(dimensions.width, dimensions.height) * 0.06)
    const panelW = dimensions.width - margin * 2
    const panelH = dimensions.height - margin * 2
    const scale = Math.min(panelW / widthUnits, panelH / heightUnits)
    const ox = (dimensions.width - widthUnits * scale) / 2
    const oy = (dimensions.height - heightUnits * scale) / 2

    const aura = ctx.createLinearGradient(ox, oy, ox + widthUnits * scale, oy + heightUnits * scale)
    aura.addColorStop(0, 'rgba(102, 255, 204, 0.10)')
    aura.addColorStop(0.45, 'rgba(255, 204, 102, 0.07)')
    aura.addColorStop(1, 'rgba(136, 221, 255, 0.12)')
    ctx.fillStyle = aura
    ctx.fillRect(ox - 8, oy - 8, widthUnits * scale + 16, heightUnits * scale + 16)

    ctx.strokeStyle = 'rgba(102, 255, 204, 0.34)'
    ctx.lineWidth = 2
    ctx.strokeRect(ox, oy, widthUnits * scale, heightUnits * scale)

    liveTiles.forEach(tile => {
      const color = PALETTE[tile.step % PALETTE.length]
      const pulse = modeRef.current === 'excavate' ? Math.sin(t + tile.step * 0.7) * 0.08 + 0.92 : 1
      const x = ox + tile.x * scale
      const y = oy + tile.y * scale
      const s = tile.size * scale
      ctx.fillStyle = `${color}22`
      ctx.fillRect(x + 1, y + 1, Math.max(1, s - 2), Math.max(1, s - 2))
      ctx.strokeStyle = color
      ctx.globalAlpha = 0.45 + 0.3 * pulse
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, y + 0.5, Math.max(1, s - 1), Math.max(1, s - 1))
      if (s > 28) {
        ctx.globalAlpha = 0.62
        ctx.fillStyle = color
        ctx.font = '10px SF Mono, Monaco, monospace'
        ctx.fillText(`${tile.size}`, x + 6, y + 14)
      }
      ctx.globalAlpha = 1
    })

    const finalUnit = commonMeasure * scale
    if (modeRef.current === 'proof' && finalUnit >= 3) {
      ctx.strokeStyle = 'rgba(255, 255, 180, 0.18)'
      ctx.lineWidth = 0.75
      ctx.beginPath()
      for (let x = ox; x <= ox + widthUnits * scale + 0.1; x += finalUnit) {
        ctx.moveTo(x, oy)
        ctx.lineTo(x, oy + heightUnits * scale)
      }
      for (let y = oy; y <= oy + heightUnits * scale + 0.1; y += finalUnit) {
        ctx.moveTo(ox, y)
        ctx.lineTo(ox + widthUnits * scale, y)
      }
      ctx.stroke()
    }

    const ledgerX = Math.max(12, ox)
    const ledgerY = Math.max(22, oy - 18)
    ctx.font = '12px SF Mono, Monaco, monospace'
    ctx.fillStyle = 'rgba(102, 255, 204, 0.78)'
    ctx.fillText(`${widthUnits} : ${heightUnits}`, ledgerX, ledgerY)

    const proofY = Math.min(dimensions.height - 22, oy + heightUnits * scale + 26)
    ctx.font = '11px SF Mono, Monaco, monospace'
    construction.steps.slice(0, visible).forEach((step, i) => {
      const text = `${step.a} = ${step.q}×${step.b}${step.r ? ` + ${step.r}` : ''}`
      ctx.fillStyle = PALETTE[i % PALETTE.length]
      ctx.fillText(text, ledgerX + i * 132, proofY)
    })
  }, [ctx, dimensions, construction, visibleSteps, widthUnits, heightUnits, commonMeasure])

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

  const metrics = useMemo(() => {
    const ratio = (widthUnits / heightUnits).toFixed(3)
    const state = visibleSteps >= construction.steps.length ? 'sealed' : 'opening'
    return [
      { label: 'width', value: widthUnits },
      { label: 'height', value: heightUnits },
      { label: 'gcd', value: commonMeasure },
      { label: 'ratio', value: ratio },
      { label: 'proof', value: `${visibleSteps}/${construction.steps.length} ${state}` }
    ]
  }, [widthUnits, heightUnits, commonMeasure, visibleSteps, construction.steps.length])

  const controls = useMemo(() => ([
    { id: 'wdown', label: 'w-()', onClick: () => changeMeasure('width', -1) },
    { id: 'wup', label: 'w+()', onClick: () => changeMeasure('width', 1) },
    { id: 'hdown', label: 'h-()', onClick: () => changeMeasure('height', -1) },
    { id: 'hup', label: 'h+()', onClick: () => changeMeasure('height', 1) },
    { id: 'step', label: 'divide()', onClick: handleStep },
    { id: 'solve', label: 'prove()', onClick: handleSolve },
    { id: 'conjure', label: 'ratio()', onClick: handleConjure, variant: 'reset' }
  ]), [changeMeasure, handleStep, handleSolve, handleConjure])

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
          onModeChange={(next) => {
            setMode(next)
            if (next === 'construct') setMessage('∴ click the field to cast a new rectangle ∴')
            if (next === 'excavate') setMessage('∴ the quotient-squares breathe while the remainder narrows ∴')
            if (next === 'proof') setMessage(`∴ measure ${commonMeasure} tiles both dimensions without residue ∴`)
          }}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs sm:text-right max-w-lg">{message}</p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="euclid-oracle-canvas"
        />
        <div className="absolute bottom-2 left-3 right-3 flex justify-between gap-3 text-void-green/30 text-[10px] font-mono pointer-events-none">
          <span>click sets ratio from field position</span>
          <span className="hidden sm:inline">squares are quotients • residue is the next chamber</span>
        </div>
      </div>
    </div>
  )
}

export default EuclidOracle
