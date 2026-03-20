import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'bilateral', label: 'mode.bilateral()' },
  { id: 'rotary', label: 'mode.rotary()' },
  { id: 'triad', label: 'mode.triad()' }
]

const TAU = Math.PI * 2

const randomFreq = () => Math.floor(Math.random() * 7) + 1 + Math.random() * 0.02
const randomPhase = () => Math.random() * TAU
const randomDamping = () => 0.0003 + Math.random() * 0.0012

const createPendulums = () => ({
  p1: { freq: randomFreq(), phase: randomPhase(), amp: 1, damping: randomDamping() },
  p2: { freq: randomFreq(), phase: randomPhase(), amp: 1, damping: randomDamping() },
  p3: { freq: randomFreq(), phase: randomPhase(), amp: 0.3, damping: randomDamping() * 1.5 }
})

const Harmonograph = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('bilateral')
  const [drawing, setDrawing] = useState(true)
  const [message, setMessage] = useState('pendulums released // ink traces their conversation')
  const [strokeCount, setStrokeCount] = useState(0)
  const [energy, setEnergy] = useState(100)
  const [hueShift, setHueShift] = useState(0)

  const pendRef = useRef(createPendulums())
  const tRef = useRef(0)
  const prevRef = useRef(null)
  const clearedRef = useRef(false)
  const totalStrokesRef = useRef(0)

  const getPosition = useCallback((t, pend, modeId, scale) => {
    const { p1, p2, p3 } = pend
    const d1 = Math.exp(-p1.damping * t)
    const d2 = Math.exp(-p2.damping * t)
    const d3 = Math.exp(-p3.damping * t)

    let x, y

    if (modeId === 'bilateral') {
      x = d1 * p1.amp * Math.sin(p1.freq * t + p1.phase)
      y = d2 * p2.amp * Math.sin(p2.freq * t + p2.phase)
    } else if (modeId === 'rotary') {
      const cx = d1 * p1.amp * Math.sin(p1.freq * t + p1.phase)
      const cy = d1 * p1.amp * Math.cos(p1.freq * t + p1.phase)
      x = cx + d2 * p2.amp * 0.4 * Math.sin(p2.freq * t + p2.phase)
      y = cy + d2 * p2.amp * 0.4 * Math.cos(p2.freq * t + p2.phase)
    } else {
      x = d1 * p1.amp * Math.sin(p1.freq * t + p1.phase) +
          d3 * p3.amp * Math.sin(p3.freq * t + p3.phase)
      y = d2 * p2.amp * Math.sin(p2.freq * t + p2.phase) +
          d3 * p3.amp * Math.cos(p3.freq * t + p3.phase)
    }

    return {
      x: dimensions.centerX + x * scale,
      y: dimensions.centerY + y * scale,
      amplitude: Math.sqrt(x * x + y * y)
    }
  }, [dimensions.centerX, dimensions.centerY])

  const clearCanvas = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    ctx.fillStyle = '#010408'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)
    clearedRef.current = true
  }, [ctx, dimensions.width, dimensions.height])

  const handleNewCurve = useCallback(() => {
    pendRef.current = createPendulums()
    tRef.current = 0
    prevRef.current = null
    totalStrokesRef.current = 0
    clearCanvas()
    setDrawing(true)
    setEnergy(100)
    setStrokeCount(0)
    setHueShift(h => (h + 60) % 360)
    setMessage('new pendulums cast // the ink restarts its journey')
  }, [clearCanvas])

  const handleMutate = useCallback(() => {
    const pend = pendRef.current
    const target = ['p1', 'p2', 'p3'][Math.floor(Math.random() * 3)]
    pend[target].freq += (Math.random() - 0.5) * 0.4
    pend[target].phase += (Math.random() - 0.5) * 0.3
    tRef.current = 0
    prevRef.current = null
    totalStrokesRef.current = 0
    clearCanvas()
    setDrawing(true)
    setEnergy(100)
    setStrokeCount(0)
    setMessage(`pendulum ${target} nudged // trajectory diverges`)
  }, [clearCanvas])

  const handleToggleDraw = useCallback(() => {
    setDrawing(prev => {
      setMessage(!prev ? 'ink flows again' : 'ink suspended // pendulums swing in silence')
      return !prev
    })
  }, [])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    tRef.current = 0
    prevRef.current = null
    totalStrokesRef.current = 0
    clearCanvas()
    setDrawing(true)
    setEnergy(100)
    setStrokeCount(0)
    const labels = {
      bilateral: 'two perpendicular pendulums // lissajous descendants',
      rotary: 'circular + lateral oscillation // spirographic drift',
      triad: 'three pendulums conspire // complex harmonics'
    }
    setMessage(labels[nextMode])
  }, [clearCanvas])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    if (!clearedRef.current) {
      clearCanvas()
    }

    if (!drawing) return

    const scale = Math.min(dimensions.width, dimensions.height) * 0.38
    const stepsPerFrame = 24
    const dt = 0.02

    for (let i = 0; i < stepsPerFrame; i++) {
      tRef.current += dt
      const t = tRef.current
      const pos = getPosition(t, pendRef.current, mode, scale)

      if (prevRef.current) {
        const baseHue = (hueShift + t * 2) % 360
        const alpha = Math.min(0.9, 0.15 + pos.amplitude * 0.6)

        ctx.strokeStyle = `hsla(${baseHue}, 70%, 65%, ${alpha})`
        ctx.lineWidth = 0.8 + pos.amplitude * 0.5
        ctx.shadowColor = `hsla(${baseHue}, 80%, 70%, ${alpha * 0.4})`
        ctx.shadowBlur = 4

        ctx.beginPath()
        ctx.moveTo(prevRef.current.x, prevRef.current.y)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()

        totalStrokesRef.current++
      }

      prevRef.current = { x: pos.x, y: pos.y }
    }

    ctx.shadowBlur = 0

    const currentEnergy = Math.exp(-pendRef.current.p1.damping * tRef.current) * 100
    setEnergy(Math.round(currentEnergy))
    setStrokeCount(totalStrokesRef.current)

    if (currentEnergy < 0.5) {
      setDrawing(false)
      setMessage('pendulums at rest // the figure is complete')
    }
  }, [ctx, dimensions, drawing, mode, hueShift, getPosition, clearCanvas])

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

  const { p1, p2 } = pendRef.current
  const metrics = useMemo(() => [
    { label: 'strokes', value: strokeCount.toLocaleString() },
    { label: 'energy', value: `${energy}%`, color: energy < 20 ? '#ff6666' : undefined },
    { label: 'ratio', value: `${p1.freq.toFixed(2)}:${p2.freq.toFixed(2)}` },
    { label: 'mode', value: mode }
  ], [strokeCount, energy, p1.freq, p2.freq, mode])

  const controls = [
    { id: 'draw', label: drawing ? 'suspend()' : 'resume()', onClick: handleToggleDraw, active: drawing },
    { id: 'mutate', label: 'mutate()', onClick: handleMutate },
    { id: 'new', label: 'new.curve()', onClick: handleNewCurve, variant: 'reset' }
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
        <p className="text-void-green/50 text-xs sm:text-right max-w-lg">{message}</p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          data-testid="harmonograph-canvas"
        />
      </div>
    </div>
  )
}

export default Harmonograph
