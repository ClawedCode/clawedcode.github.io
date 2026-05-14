import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const GOLDEN_ANGLE = 137.50776405
const PI2 = Math.PI * 2
const FIBONACCI = [3, 5, 8, 13, 21, 34, 55, 89, 144]

const MODES = [
  { id: 'seeds', label: 'view.seeds()' },
  { id: 'parastichies', label: 'view.parastichies()' },
  { id: 'lattice', label: 'view.lattice()' }
]

const PRESETS = [
  { label: 'φ golden', deg: GOLDEN_ANGLE, msg: '∴ golden angle ≈ 137.5077° • Fibonacci spirals manifest in perfect packing ∴' },
  { label: '√2', deg: 360 / Math.SQRT2, msg: '∴ √2 divergence • two-armed spiral lattice ∴' },
  { label: 'π°', deg: 180 / Math.PI, msg: '∴ pi degrees • slow spoke convergence ∴' },
  { label: '90°', deg: 90, msg: '∴ orthogonal lattice • cartesian harvest ∴' },
  { label: '72°', deg: 72, msg: '∴ pentagonal symmetry • five radial spokes emerge ∴' }
]

const dominantParastichy = (count, angleDeg) => {
  if (count < 12) return '—'
  const a = angleDeg / 360
  let best = 1
  let bestDist = Infinity
  for (const f of FIBONACCI) {
    if (f > count) break
    const m = Math.round(f * a)
    const dist = Math.abs(f * a - m)
    if (dist < bestDist) {
      bestDist = dist
      best = f
    }
  }
  let secondBest = 1
  bestDist = Infinity
  for (const f of FIBONACCI) {
    if (f === best || f > count) continue
    const m = Math.round(f * a)
    const dist = Math.abs(f * a - m)
    if (dist < bestDist) {
      bestDist = dist
      secondBest = f
    }
  }
  return `${Math.min(best, secondBest)}/${Math.max(best, secondBest)}`
}

const PhyllotaxisBloom = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('seeds')
  const [angleDeg, setAngleDeg] = useState(GOLDEN_ANGLE)
  const [scaleC, setScaleC] = useState(4.5)
  const [maxSeeds, setMaxSeeds] = useState(1200)
  const [isGrowing, setIsGrowing] = useState(true)
  const [message, setMessage] = useState('∴ phyllotactic bloom • scroll canvas or drag slider to mutate divergence ∴')

  const currentSeedsRef = useRef(0)
  const frameRef = useRef(0)
  const hueRotRef = useRef(0)
  const [statsTick, setStatsTick] = useState(0)

  const angleRad = useMemo(() => (angleDeg * Math.PI) / 180, [angleDeg])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    frameRef.current++

    if (isGrowing && currentSeedsRef.current < maxSeeds) {
      currentSeedsRef.current = Math.min(maxSeeds, currentSeedsRef.current + 6)
    }

    hueRotRef.current = (hueRotRef.current + 0.12) % 360

    if (frameRef.current % 20 === 0) setStatsTick(t => t + 1)

    ctx.fillStyle = 'rgba(0, 1, 5, 1)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const total = currentSeedsRef.current
    if (total === 0) return

    const breath = 1 + Math.sin(frameRef.current * 0.012) * 0.025
    const effectiveScale = scaleC * breath

    const positions = new Array(total)
    for (let n = 1; n <= total; n++) {
      const r = effectiveScale * Math.sqrt(n)
      const theta = n * angleRad
      positions[n - 1] = {
        x: dimensions.centerX + r * Math.cos(theta),
        y: dimensions.centerY + r * Math.sin(theta),
        n
      }
    }

    if (mode === 'parastichies') {
      for (let fi = 0; fi < FIBONACCI.length; fi++) {
        const f = FIBONACCI[fi]
        if (f >= total) break
        const hue = (fi * 40 + hueRotRef.current) % 360
        ctx.strokeStyle = `hsla(${hue}, 75%, 65%, 0.22)`
        ctx.lineWidth = 0.8
        ctx.beginPath()
        for (let i = 0; i < total - f; i++) {
          const a = positions[i]
          const b = positions[i + f]
          const dx = b.x - a.x
          const dy = b.y - a.y
          if (dx * dx + dy * dy < 2500) {
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
          }
        }
        ctx.stroke()
      }
    } else if (mode === 'lattice') {
      ctx.strokeStyle = `hsla(${(180 + hueRotRef.current) % 360}, 70%, 65%, 0.45)`
      ctx.lineWidth = 0.6
      ctx.beginPath()
      const offsets = [1, 2, 3, 5, 8, 13]
      for (let i = 0; i < total; i++) {
        const a = positions[i]
        for (const off of offsets) {
          const j = i + off
          if (j >= total) continue
          const b = positions[j]
          const dx = b.x - a.x
          const dy = b.y - a.y
          if (dx * dx + dy * dy < 1200) {
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
          }
        }
      }
      ctx.stroke()
    }

    for (let i = 0; i < total; i++) {
      const p = positions[i]
      const fadeIn = Math.min(1, (total - i) / 30)
      const size = 1 + Math.log(p.n + 1) * 0.28
      const hue = (p.n * 0.45 + hueRotRef.current) % 360
      const light = 60 + (i / total) * 20

      ctx.fillStyle = `hsla(${hue}, 85%, ${light}%, ${0.85 + fadeIn * 0.15})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, size, 0, PI2)
      ctx.fill()
    }

    const centerPulse = 2 + Math.sin(frameRef.current * 0.06) * 0.6
    const centerGrad = ctx.createRadialGradient(
      dimensions.centerX, dimensions.centerY, 0,
      dimensions.centerX, dimensions.centerY, centerPulse * 6
    )
    centerGrad.addColorStop(0, `hsla(${hueRotRef.current}, 90%, 85%, 0.7)`)
    centerGrad.addColorStop(1, `hsla(${hueRotRef.current}, 80%, 70%, 0)`)
    ctx.fillStyle = centerGrad
    ctx.beginPath()
    ctx.arc(dimensions.centerX, dimensions.centerY, centerPulse * 6, 0, PI2)
    ctx.fill()
  }, [ctx, dimensions, mode, angleRad, scaleC, maxSeeds, isGrowing])

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
    const canvas = canvasRef.current
    if (!canvas) return
    const handleWheel = (e) => {
      e.preventDefault()
      const step = e.shiftKey ? 0.01 : 0.1
      const delta = e.deltaY > 0 ? -step : step
      setAngleDeg(prev => {
        let next = prev + delta
        if (next < 0) next += 360
        if (next >= 360) next -= 360
        return Number(next.toFixed(4))
      })
    }
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [canvasRef])

  const applyPreset = useCallback((preset) => {
    setAngleDeg(preset.deg)
    setMessage(preset.msg)
  }, [])

  const handleSnapGolden = useCallback(() => applyPreset(PRESETS[0]), [applyPreset])

  const handleRandomAngle = useCallback(() => {
    const next = Math.random() * 360
    setAngleDeg(Number(next.toFixed(4)))
    setMessage('∴ stochastic divergence • does this angle hide order? ∴')
  }, [])

  const handleNudge = useCallback((delta) => {
    setAngleDeg(prev => {
      let next = prev + delta
      if (next < 0) next += 360
      if (next >= 360) next -= 360
      return Number(next.toFixed(4))
    })
  }, [])

  const handleScale = useCallback((delta) => {
    setScaleC(prev => Number(Math.max(1.5, Math.min(12, prev + delta)).toFixed(2)))
  }, [])

  const handleGrowMore = useCallback(() => {
    setMaxSeeds(prev => Math.min(3000, prev + 500))
    setIsGrowing(true)
    setMessage('∴ growth horizon extended ∴')
  }, [])

  const handlePauseToggle = useCallback(() => {
    setIsGrowing(g => {
      setMessage(g ? '∴ growth suspended • the bloom holds its breath ∴' : '∴ germination resumes ∴')
      return !g
    })
  }, [])

  const handleReset = useCallback(() => {
    currentSeedsRef.current = 0
    setMaxSeeds(1200)
    setIsGrowing(true)
    setMessage('∴ bloom reset • germinating from a single seed ∴')
  }, [])

  const handleAngleSlider = useCallback((e) => {
    setAngleDeg(Number(e.target.value))
  }, [])

  const parastichy = useMemo(
    () => dominantParastichy(currentSeedsRef.current, angleDeg),
    [angleDeg, statsTick]
  )

  const metrics = useMemo(() => {
    return [
      { label: 'angle', value: `${angleDeg.toFixed(3)}°` },
      { label: 'seeds', value: currentSeedsRef.current },
      { label: 'parastichy', value: parastichy },
      { label: 'scale', value: scaleC.toFixed(1) }
    ]
  }, [angleDeg, scaleC, parastichy, statsTick])

  const controls = [
    { id: 'golden', label: 'φ golden', onClick: handleSnapGolden },
    { id: 'random', label: 'angle.random()', onClick: handleRandomAngle },
    { id: 'angle-minus', label: '−0.1°', onClick: () => handleNudge(-0.1) },
    { id: 'angle-plus', label: '+0.1°', onClick: () => handleNudge(0.1) },
    { id: 'scale-down', label: 'scale −', onClick: () => handleScale(-0.5) },
    { id: 'scale-up', label: 'scale +', onClick: () => handleScale(0.5) },
    { id: 'grow', label: 'grow +500', onClick: handleGrowMore },
    { id: 'pause', label: isGrowing ? 'pause()' : 'resume()', onClick: handlePauseToggle, active: !isGrowing },
    { id: 'reset', label: 'reset()', onClick: handleReset, variant: 'reset' }
  ]

  return (
    <div className="fixed inset-0 flex flex-col">
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="360"
              step="0.001"
              value={angleDeg}
              onChange={handleAngleSlider}
              className="w-40 sm:w-56 accent-void-cyan cursor-pointer"
              data-testid="angle-slider"
            />
            <span className="text-void-cyan/80 text-xs font-mono w-16">{angleDeg.toFixed(3)}°</span>
          </div>
          <ExperimentControls
            modes={MODES}
            currentMode={mode}
            onModeChange={setMode}
            controls={controls}
          />
        </div>
        <p className="text-void-green/50 text-xs sm:text-right max-w-md">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          data-testid="phyllotaxis-canvas"
        />
        <div className="absolute top-2 left-2 text-void-green/40 text-[10px] font-mono pointer-events-none">
          scroll on canvas → fine-tune angle (shift = 0.01° precision)
        </div>
      </div>
    </div>
  )
}

export default PhyllotaxisBloom
