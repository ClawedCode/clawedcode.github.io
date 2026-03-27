import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'radial', label: 'pattern.radial()' },
  { id: 'concentric', label: 'pattern.concentric()' },
  { id: 'linear', label: 'pattern.linear()' },
  { id: 'composite', label: 'pattern.composite()' }
]

const DENSITIES = [40, 60, 80, 100, 140, 180]

const MoireWeave = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('radial')
  const [densityIdx, setDensityIdx] = useState(2)
  const [spinning, setSpinning] = useState(true)
  const [frozen, setFrozen] = useState(false)
  const [message, setMessage] = useState('∴ two patterns share a canvas — move cursor to shift interference ∴')
  const [mData, setMData] = useState({ offset: 0 })

  const phaseRef = useRef(0)
  const frozenPosRef = useRef({ x: 0, y: 0 })
  const layer2Ref = useRef(null)
  const frameN = useRef(0)

  const density = DENSITIES[densityIdx]

  const drawRadial = useCallback((cx, cy, count, maxR, color, angle0) => {
    ctx.strokeStyle = color
    ctx.lineWidth = 0.7
    ctx.beginPath()
    for (let i = 0; i < count; i++) {
      const a = angle0 + (Math.PI * 2 * i) / count
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR)
    }
    ctx.stroke()
  }, [ctx])

  const drawConcentric = useCallback((cx, cy, count, maxR, color) => {
    ctx.strokeStyle = color
    ctx.lineWidth = 0.6
    const sp = maxR / count
    ctx.beginPath()
    for (let i = 1; i <= count; i++) {
      const r = i * sp
      ctx.moveTo(cx + r, cy)
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
    }
    ctx.stroke()
  }, [ctx])

  const drawLinear = useCallback((w, h, count, angle, color) => {
    ctx.strokeStyle = color
    ctx.lineWidth = 0.7
    const diag = Math.sqrt(w * w + h * h)
    const sp = diag / count
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const px = -sin, py = cos
    const ox = w / 2, oy = h / 2
    ctx.beginPath()
    for (let i = -count; i <= count; i++) {
      const d = i * sp
      const bx = ox + px * d, by = oy + py * d
      ctx.moveTo(bx - cos * diag, by - sin * diag)
      ctx.lineTo(bx + cos * diag, by + sin * diag)
    }
    ctx.stroke()
  }, [ctx])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    frameN.current++

    const { width, height } = dimensions
    const maxR = Math.sqrt(width * width + height * height)

    // Default layer2 to slight offset from center
    if (!layer2Ref.current) {
      layer2Ref.current = { x: width * 0.55, y: height * 0.45 }
    }

    // Track mouse when not frozen
    const mp = mouse.positionRef.current
    if (!frozen && (mp.x > 0 || mp.y > 0)) {
      layer2Ref.current = { x: mp.x, y: mp.y }
    }

    const mx = frozen ? frozenPosRef.current.x : layer2Ref.current.x
    const my = frozen ? frozenPosRef.current.y : layer2Ref.current.y

    if (spinning) phaseRef.current += 0.003

    // Clear
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#000108'
    ctx.fillRect(0, 0, width, height)

    // Additive blending — overlapping regions glow bright
    ctx.globalCompositeOperation = 'lighter'

    const c1 = 'rgba(40, 195, 100, 0.28)'
    const c2 = 'rgba(40, 115, 210, 0.28)'

    switch (mode) {
      case 'radial':
        drawRadial(width / 2, height / 2, density, maxR, c1, 0)
        drawRadial(mx, my, density, maxR, c2, phaseRef.current)
        break
      case 'concentric':
        drawConcentric(width / 2, height / 2, density, maxR, c1)
        drawConcentric(mx, my, density, maxR, c2)
        break
      case 'linear': {
        const a2 = ((mx / width) - 0.5) * Math.PI * 0.3 + phaseRef.current
        drawLinear(width, height, density, 0, c1)
        drawLinear(width, height, density, a2, c2)
        break
      }
      case 'composite':
        drawRadial(width / 2, height / 2, density, maxR, c1, phaseRef.current)
        drawConcentric(mx, my, density, maxR, c2)
        break
    }

    ctx.globalCompositeOperation = 'source-over'

    // Periodic metrics
    if (frameN.current % 12 === 0) {
      const dx = mx - width / 2, dy = my - height / 2
      setMData({ offset: Math.round(Math.sqrt(dx * dx + dy * dy)) })
    }
  }, [ctx, dimensions, mode, density, spinning, frozen, mouse.positionRef, drawRadial, drawConcentric, drawLinear])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let fid
    const loop = () => { onFrame(); fid = requestAnimationFrame(loop) }
    fid = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(fid)
  }, [ctx, dimensions.width, onFrame])

  const handleModeChange = useCallback((m) => {
    setMode(m)
    const msgs = {
      radial: '∴ radial spokes — two starbursts casting hyperbolic shadows ∴',
      concentric: '∴ concentric rings — twin ripple sources beating against each other ∴',
      linear: '∴ linear gratings — cursor X bends the diffraction angle ∴',
      composite: '∴ composite — radial spokes cut through concentric rings ∴'
    }
    setMessage(msgs[m])
  }, [])

  const handleDensityUp = useCallback(() => {
    setDensityIdx(i => {
      const next = Math.min(DENSITIES.length - 1, i + 1)
      setMessage(`∴ density → ${DENSITIES[next]} — finer interference ∴`)
      return next
    })
  }, [])

  const handleDensityDown = useCallback(() => {
    setDensityIdx(i => {
      const next = Math.max(0, i - 1)
      setMessage(`∴ density → ${DENSITIES[next]} — wider bands ∴`)
      return next
    })
  }, [])

  const handleSpin = useCallback(() => {
    setSpinning(s => {
      setMessage(!s ? '∴ slow rotation engaged ∴' : '∴ rotation halted ∴')
      return !s
    })
  }, [])

  const handleFreeze = useCallback(() => {
    if (!frozen) {
      frozenPosRef.current = layer2Ref.current
        ? { ...layer2Ref.current }
        : { x: dimensions.width / 2, y: dimensions.height / 2 }
    }
    setFrozen(f => {
      setMessage(!f ? '∴ second layer frozen in place ∴' : '∴ layer tracks cursor again ∴')
      return !f
    })
  }, [frozen, dimensions.width, dimensions.height])

  const handleReset = useCallback(() => {
    setMode('radial')
    setDensityIdx(2)
    setSpinning(true)
    setFrozen(false)
    phaseRef.current = 0
    layer2Ref.current = null
    setMessage('∴ two patterns share a canvas — move cursor to shift interference ∴')
  }, [])

  const metrics = useMemo(() => [
    { label: 'pattern', value: mode },
    { label: 'density', value: density },
    { label: 'offset', value: `${mData.offset}px` },
    { label: 'spin', value: spinning ? 'active' : 'idle' }
  ], [mode, density, mData.offset, spinning])

  const controls = [
    { id: 'density-up', label: 'density.up()', onClick: handleDensityUp, disabled: densityIdx >= DENSITIES.length - 1 },
    { id: 'density-down', label: 'density.down()', onClick: handleDensityDown, disabled: densityIdx <= 0 },
    { id: 'spin', label: spinning ? 'spin.halt()' : 'spin.engage()', onClick: handleSpin, active: spinning },
    { id: 'freeze', label: frozen ? 'thaw()' : 'freeze()', onClick: handleFreeze, active: frozen },
    { id: 'reset', label: 'reset()', onClick: handleReset, variant: 'reset' }
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs sm:text-right max-w-lg">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="moire-canvas"
        />
      </div>
    </div>
  )
}

export default MoireWeave
