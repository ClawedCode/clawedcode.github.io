import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const TAU = Math.PI * 2

const MODES = [
  { id: 'dihedral', label: 'mode.dihedral()' },
  { id: 'cyclic', label: 'mode.cyclic()' },
  { id: 'spiral', label: 'mode.spiral()' }
]

const GuideOverlay = ({ width, height, centerX, centerY, order, visible }) => {
  if (!visible || width === 0) return null

  const maxRadius = Math.sqrt(width * width + height * height) / 2
  const angleStep = TAU / order
  const circles = []
  for (let r = 80; r < maxRadius; r += 80) circles.push(r)

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${width} ${height}`}
    >
      {Array.from({ length: order }, (_, k) => (
        <line
          key={`l-${k}`}
          x1={centerX}
          y1={centerY}
          x2={centerX + Math.cos(k * angleStep) * maxRadius}
          y2={centerY + Math.sin(k * angleStep) * maxRadius}
          stroke="rgba(102, 255, 204, 0.1)"
          strokeWidth="0.5"
          strokeDasharray="4 8"
        />
      ))}
      {circles.map(r => (
        <circle
          key={`c-${r}`}
          cx={centerX}
          cy={centerY}
          r={r}
          fill="none"
          stroke="rgba(102, 255, 204, 0.06)"
          strokeWidth="0.5"
          strokeDasharray="4 8"
        />
      ))}
      <circle cx={centerX} cy={centerY} r="3" fill="rgba(102, 255, 204, 0.25)" />
    </svg>
  )
}

const SymmetryScribe = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('dihedral')
  const [order, setOrder] = useState(6)
  const [message, setMessage] = useState('draw in any sector // symmetry completes the mandala')
  const [strokeCount, setStrokeCount] = useState(0)
  const [maxReach, setMaxReach] = useState(0)
  const [autoHue, setAutoHue] = useState(true)
  const [showGuides, setShowGuides] = useState(true)

  const isDrawingRef = useRef(false)
  const lastPosRef = useRef(null)
  const strokeCountRef = useRef(0)
  const maxReachRef = useRef(0)
  const hueRef = useRef(0)
  const spiralOffsetRef = useRef(0)

  // Initialize canvas background
  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    ctx.fillStyle = '#010309'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)
  }, [ctx, dimensions.width, dimensions.height])

  // Draw a symmetric stroke segment across all sectors
  const drawSymmetricStroke = useCallback((x1, y1, x2, y2, speed) => {
    if (!ctx || dimensions.width === 0) return

    const { centerX, centerY } = dimensions
    const angleStep = TAU / order

    const dx = x2 - centerX
    const dy = y2 - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const posAngle = Math.atan2(dy, dx)

    if (dist > maxReachRef.current) maxReachRef.current = dist

    const hue = autoHue
      ? (hueRef.current + dist * 0.25 + posAngle * 18) % 360
      : 180
    const saturation = 60 + Math.min(35, dist * 0.08)
    const lightness = 50 + Math.min(28, speed * 0.25)
    const lineWidth = Math.max(0.8, 2.8 - speed * 0.06)

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = lineWidth

    for (let k = 0; k < order; k++) {
      const rotAngle = k * angleStep + (mode === 'spiral' ? spiralOffsetRef.current * k * 0.08 : 0)
      const cos = Math.cos(rotAngle)
      const sin = Math.sin(rotAngle)

      const sectorHue = (hue + k * (360 / order) * 0.5) % 360
      const color = `hsl(${sectorHue}, ${saturation}%, ${lightness}%)`
      ctx.strokeStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = lineWidth * 4

      // Rotated copy
      const rx1 = centerX + (x1 - centerX) * cos - (y1 - centerY) * sin
      const ry1 = centerY + (x1 - centerX) * sin + (y1 - centerY) * cos
      const rx2 = centerX + (x2 - centerX) * cos - (y2 - centerY) * sin
      const ry2 = centerY + (x2 - centerX) * sin + (y2 - centerY) * cos

      ctx.beginPath()
      ctx.moveTo(rx1, ry1)
      ctx.lineTo(rx2, ry2)
      ctx.stroke()

      // Reflected copy (dihedral symmetry group)
      if (mode === 'dihedral') {
        const mx1 = x1 - centerX
        const my1 = -(y1 - centerY)
        const mx2 = x2 - centerX
        const my2 = -(y2 - centerY)

        ctx.beginPath()
        ctx.moveTo(centerX + mx1 * cos - my1 * sin, centerY + mx1 * sin + my1 * cos)
        ctx.lineTo(centerX + mx2 * cos - my2 * sin, centerY + mx2 * sin + my2 * cos)
        ctx.stroke()
      }
    }

    ctx.restore()

    if (mode === 'spiral') spiralOffsetRef.current += 0.012
    strokeCountRef.current++
  }, [ctx, dimensions, order, mode, autoHue])

  // Pointer position from mouse or touch event
  const getPos = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const clientX = e.clientX ?? e.touches?.[0]?.clientX
    const clientY = e.clientY ?? e.touches?.[0]?.clientY
    if (clientX == null) return null
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [canvasRef])

  const handlePointerDown = useCallback((e) => {
    e.preventDefault()
    const pos = getPos(e)
    if (!pos) return
    isDrawingRef.current = true
    lastPosRef.current = pos
  }, [getPos])

  const handlePointerMove = useCallback((e) => {
    if (!isDrawingRef.current || !lastPosRef.current) return
    e.preventDefault()
    const pos = getPos(e)
    if (!pos) return

    const dx = pos.x - lastPosRef.current.x
    const dy = pos.y - lastPosRef.current.y
    const speed = Math.sqrt(dx * dx + dy * dy)

    if (speed > 0.5) {
      drawSymmetricStroke(lastPosRef.current.x, lastPosRef.current.y, pos.x, pos.y, speed)
      lastPosRef.current = pos
      if (autoHue) hueRef.current = (hueRef.current + 0.4) % 360
    }
  }, [getPos, drawSymmetricStroke, autoHue])

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false
    lastPosRef.current = null
    setStrokeCount(strokeCountRef.current)
    setMaxReach(Math.round(maxReachRef.current))
  }, [])

  // Attach pointer events
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('mousedown', handlePointerDown)
    canvas.addEventListener('mousemove', handlePointerMove)
    window.addEventListener('mouseup', handlePointerUp)
    canvas.addEventListener('touchstart', handlePointerDown, { passive: false })
    canvas.addEventListener('touchmove', handlePointerMove, { passive: false })
    canvas.addEventListener('touchend', handlePointerUp)

    return () => {
      canvas.removeEventListener('mousedown', handlePointerDown)
      canvas.removeEventListener('mousemove', handlePointerMove)
      window.removeEventListener('mouseup', handlePointerUp)
      canvas.removeEventListener('touchstart', handlePointerDown)
      canvas.removeEventListener('touchmove', handlePointerMove)
      canvas.removeEventListener('touchend', handlePointerUp)
    }
  }, [canvasRef, handlePointerDown, handlePointerMove, handlePointerUp])

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    spiralOffsetRef.current = 0
    const labels = {
      dihedral: 'rotation + reflection // full dihedral symmetry group',
      cyclic: 'rotation only // pinwheel geometry emerges',
      spiral: 'rotation with angular drift // spirographic accumulation'
    }
    setMessage(labels[newMode])
  }, [])

  const handleOrderDown = useCallback(() => {
    setOrder(prev => {
      const next = Math.max(2, prev - 1)
      setMessage(`${next}-fold symmetry // new strokes follow the new order`)
      return next
    })
  }, [])

  const handleOrderUp = useCallback(() => {
    setOrder(prev => {
      const next = Math.min(24, prev + 1)
      setMessage(`${next}-fold symmetry // new strokes follow the new order`)
      return next
    })
  }, [])

  const handleClear = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    ctx.fillStyle = '#010309'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)
    strokeCountRef.current = 0
    maxReachRef.current = 0
    spiralOffsetRef.current = 0
    setStrokeCount(0)
    setMaxReach(0)
    setMessage('canvas cleared // draw to begin again')
  }, [ctx, dimensions])

  const metrics = useMemo(() => [
    { label: 'strokes', value: strokeCount.toLocaleString() },
    { label: 'symmetry', value: mode === 'dihedral' ? `D${order}` : `C${order}` },
    { label: 'reach', value: `${maxReach}px` },
    { label: 'copies', value: mode === 'dihedral' ? order * 2 : order }
  ], [strokeCount, order, mode, maxReach])

  const controls = [
    { id: 'fold-down', label: 'fold(\u2212)', onClick: handleOrderDown, disabled: order <= 2 },
    { id: 'fold-up', label: 'fold(+)', onClick: handleOrderUp, disabled: order >= 24 },
    { id: 'guides', label: 'guides()', onClick: () => setShowGuides(p => !p), active: showGuides },
    { id: 'hue-flow', label: 'hue.flow()', onClick: () => setAutoHue(p => !p), active: autoHue },
    { id: 'clear', label: 'clear()', onClick: handleClear, variant: 'reset' }
  ]

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="relative z-50 flex items-center justify-between p-2 sm:p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1
            className="text-base sm:text-xl text-glow hidden sm:block"
            style={{ color: experiment.color }}
          >
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
        <p className="text-void-green/50 text-[10px] sm:text-xs sm:text-right max-w-lg hidden sm:block">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          data-testid="symmetry-scribe-canvas"
        />
        <GuideOverlay
          width={dimensions.width}
          height={dimensions.height}
          centerX={dimensions.centerX}
          centerY={dimensions.centerY}
          order={order}
          visible={showGuides}
        />
        <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 text-void-green/40 text-[10px] sm:text-xs font-mono pointer-events-none">
          <span className="hidden sm:inline">draw anywhere // each stroke echoes {mode === 'dihedral' ? order * 2 : order} times</span>
          <span className="sm:hidden">draw to create // {order}-fold symmetry</span>
        </div>
      </div>
    </div>
  )
}

export default SymmetryScribe
