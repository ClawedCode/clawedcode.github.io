import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const TAU = Math.PI * 2

const normalizePhase = (value) => {
  const mod = value % TAU
  return mod < 0 ? mod + TAU : mod
}

const hsla = (h, s, l, a) => `hsla(${h}, ${s}%, ${l}%, ${a})`

const computePhasePalette = (phaseValue, coherence = 0.5) => {
  const normalized = normalizePhase(phaseValue)
  const hue = (normalized / TAU) * 360
  const saturation = 55 + coherence * 30
  const lightness = 45 + coherence * 20
  const glowLightness = Math.min(95, lightness + 22)
  return {
    hue,
    saturation,
    lightness,
    solid: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    glow: hsla(hue, Math.min(95, saturation + 10), glowLightness, 0.35 + coherence * 0.4)
  }
}

const MODES = [
  { id: 'pendulum', label: 'view.pendulums()' },
  { id: 'phase', label: 'view.phaseWheel()' },
  { id: 'scores', label: 'view.orderGraph()' }
]

const MODE_MESSAGES = {
  pendulum: '∴ coupled metronomes sway // shared platform hums under paw pressure ∴',
  phase: '∴ observe the circle of time • dots chase synchrony across the rim ∴',
  scores: '∴ order parameter plotted • see coherence rise + fall in ink ∴'
}

const createMetronomes = (count) => {
  const metronomes = []
  for (let i = 0; i < count; i++) {
    metronomes.push({
      id: i,
      phase: Math.random() * TAU,
      detune: (Math.random() - 0.5) * 0.08,
      length: 70 + (Math.sin(i * 1.3) + 1) * 28,
      velocity: 0
    })
  }
  return metronomes
}

const MetronomeChorus = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('pendulum')
  const [message, setMessage] = useState(MODE_MESSAGES.pendulum)
  const [metronomeCount, setMetronomeCount] = useState(24)
  const [coupling, setCoupling] = useState(0.55)
  const [tempo, setTempo] = useState(120)
  const [flexibility, setFlexibility] = useState(0.4)
  const [entrain, setEntrain] = useState(true)
  const [statSnapshot, setStatSnapshot] = useState({ order: 0, bpm: 0, drift: 0 })

  const metronomesRef = useRef(createMetronomes(metronomeCount))
  const platformRef = useRef({ angle: 0, velocity: 0 })
  const trailsRef = useRef([])
  const kickRef = useRef(0)
  const orderHistoryRef = useRef([])
  const metricsCounterRef = useRef(0)

  const initMetronomes = useCallback(() => {
    metronomesRef.current = createMetronomes(metronomeCount)
    platformRef.current = { angle: 0, velocity: 0 }
    orderHistoryRef.current = []
    trailsRef.current = Array.from({ length: metronomeCount }, () => [])
  }, [metronomeCount])

  useEffect(() => {
    if (dimensions.width === 0) return
    initMetronomes()
  }, [dimensions.width, initMetronomes])

  useEffect(() => {
    setMessage(MODE_MESSAGES[mode])
  }, [mode])

  useEffect(() => {
    if (!mouse.isDown) return
    setMessage('∴ drag to push the base // redistribute tempo energy ∴')
  }, [mouse.isDown])

  const randomizePhases = useCallback(() => {
    metronomesRef.current.forEach(m => {
      m.phase = Math.random() * TAU
      m.detune += (Math.random() - 0.5) * 0.02
    })
    setMessage('∴ fresh desynchrony seeded // let coupling weave order ∴')
  }, [])

  const kickPlatform = useCallback(() => {
    const direction = Math.random() > 0.5 ? 1 : -1
    kickRef.current = direction * (0.005 + Math.random() * 0.01)
    setMessage('∴ impulsed platform • tremor ripples through the line ∴')
  }, [])

  const flattenPhase = useCallback(() => {
    const metronomes = metronomesRef.current
    if (metronomes.length === 0) return
    const avg = metronomes.reduce((sum, m) => sum + m.phase, 0) / metronomes.length
    metronomes.forEach(m => {
      m.phase = avg + (Math.random() - 0.5) * 0.01
      m.detune *= 0.5
    })
    setMessage('∴ forced alignment invoked • fragile synchrony achieved ∴')
  }, [])

  const toggleEntrain = useCallback(() => {
    setEntrain(prev => {
      const next = !prev
      setMessage(next ? '∴ entrainment resumed • they listen again ∴' : '∴ entrainment paused • each pendulum freewheels ∴')
      return next
    })
  }, [])

  const metrics = useMemo(() => ([
    { label: 'synchrony', value: `${(statSnapshot.order * 100).toFixed(1)}%` },
    { label: 'tempo', value: `${statSnapshot.bpm.toFixed(1)} bpm` },
    { label: 'platform drift', value: `${(statSnapshot.drift * 1000).toFixed(2)} μrad` },
    { label: 'metronomes', value: metronomeCount }
  ]), [statSnapshot, metronomeCount])

  const drawPendulums = useCallback((orderValue) => {
    if (!ctx) return
    const width = dimensions.width
    const height = dimensions.height
    const baseY = height * 0.26
    const spacing = width / (metronomesRef.current.length + 1)
    const platform = platformRef.current

    if (trailsRef.current.length !== metronomesRef.current.length) {
      trailsRef.current = Array.from({ length: metronomesRef.current.length }, () => [])
    }

    const bobPositions = []
    const pulse = 0.55 + 0.45 * Math.sin(performance.now() * 0.0012)

    const baseGradient = ctx.createLinearGradient(spacing * 0.5, baseY, width - spacing * 0.5, baseY)
    baseGradient.addColorStop(0, 'rgba(80, 255, 200, 0.15)')
    baseGradient.addColorStop(1, 'rgba(255, 200, 150, 0.2)')
    ctx.save()
    ctx.strokeStyle = baseGradient
    ctx.lineWidth = 3
    ctx.shadowBlur = 25
    ctx.shadowColor = 'rgba(80, 255, 210, 0.25)'
    ctx.beginPath()
    ctx.moveTo(spacing * 0.5, baseY + Math.sin(platform.angle) * 6)
    ctx.lineTo(width - spacing * 0.5, baseY - Math.sin(platform.angle) * 4)
    ctx.stroke()
    ctx.restore()

    metronomesRef.current.forEach((m, index) => {
      const anchorX = spacing * (index + 1)
      const anchorY = baseY + Math.sin(platform.angle + index * 0.05) * 6
      const offsetPhase = m.phase + platform.angle * 0.2
      const bobX = anchorX + Math.sin(offsetPhase) * m.length
      const bobY = anchorY + Math.cos(offsetPhase) * m.length

      const palette = computePhasePalette(offsetPhase, orderValue)
      const radius = 5 + orderValue * 6
      const trail = trailsRef.current[index] ?? []
      trail.push({
        x: bobX,
        y: bobY,
        hue: palette.hue,
        saturation: palette.saturation,
        lightness: palette.lightness
      })
      if (trail.length > 18) trail.shift()
      trailsRef.current[index] = trail

      ctx.strokeStyle = hsla(palette.hue, palette.saturation, Math.min(85, palette.lightness + 10), 0.45)
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(anchorX, anchorY)
      ctx.lineTo(bobX, bobY)
      ctx.stroke()

      ctx.save()
      trail.forEach((point, trailIndex) => {
        const alpha = (trailIndex + 1) / trail.length
        ctx.fillStyle = hsla(point.hue, point.saturation, Math.min(92, point.lightness + 6), alpha * 0.18)
        ctx.beginPath()
        ctx.arc(point.x, point.y, radius * 0.45 * alpha + 0.3, 0, TAU)
        ctx.fill()
      })
      ctx.restore()

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.shadowBlur = 20 + orderValue * 30
      ctx.shadowColor = palette.glow
      ctx.fillStyle = palette.glow
      ctx.beginPath()
      ctx.arc(bobX, bobY, radius * 1.15, 0, TAU)
      ctx.fill()
      ctx.restore()

      ctx.fillStyle = palette.solid
      ctx.beginPath()
      ctx.arc(bobX, bobY, radius * 0.75, 0, TAU)
      ctx.fill()

      bobPositions.push({
        x: bobX,
        y: bobY,
        hue: palette.hue,
        saturation: palette.saturation,
        lightness: palette.lightness
      })
    })

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineWidth = 1.2 + orderValue * 1.8
    const connectorAlpha = (0.08 + coupling * 0.35 * orderValue) * pulse
    bobPositions.forEach((pos, index) => {
      const next = bobPositions[index + 1]
      if (!next) return
      const gradient = ctx.createLinearGradient(pos.x, pos.y, next.x, next.y)
      gradient.addColorStop(0, hsla(pos.hue, pos.saturation, pos.lightness + 8, connectorAlpha))
      gradient.addColorStop(1, hsla(next.hue, next.saturation, next.lightness + 8, connectorAlpha))
      ctx.strokeStyle = gradient
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
      ctx.lineTo(next.x, next.y)
      ctx.stroke()
    })
    ctx.restore()
  }, [ctx, coupling, dimensions.height, dimensions.width])

  const drawPhaseWheel = useCallback((orderValue, avgAngle) => {
    if (!ctx) return
    const width = dimensions.width
    const height = dimensions.height
    const radius = Math.min(width, height) * 0.28
    const cx = dimensions.centerX
    const cy = height * 0.62

    ctx.save()
    ctx.shadowBlur = 35
    ctx.shadowColor = 'rgba(60, 200, 255, 0.25)'
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.22)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, TAU)
    ctx.stroke()
    ctx.restore()

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = 'rgba(255, 235, 150, 0.7)'
    ctx.lineWidth = 3 + orderValue * 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(
      cx + Math.cos(avgAngle) * radius * orderValue,
      cy + Math.sin(avgAngle) * radius * orderValue
    )
    ctx.stroke()
    ctx.restore()

    metronomesRef.current.forEach(m => {
      const x = cx + Math.cos(m.phase) * radius
      const y = cy + Math.sin(m.phase) * radius
      const palette = computePhasePalette(m.phase, orderValue)

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.shadowBlur = 18
      ctx.shadowColor = palette.glow
      ctx.fillStyle = palette.glow
      ctx.beginPath()
      ctx.arc(x, y, 7.5, 0, TAU)
      ctx.fill()
      ctx.restore()

      ctx.fillStyle = palette.solid
      ctx.beginPath()
      ctx.arc(x, y, 5.2, 0, TAU)
      ctx.fill()
    })
  }, [ctx, dimensions.centerX, dimensions.height, dimensions.width])

  const drawOrderGraph = useCallback(() => {
    if (!ctx) return
    const width = dimensions.width
    const height = dimensions.height
    const margin = 32
    const graphHeight = height * 0.45
    const baseY = height - margin
    const history = orderHistoryRef.current

    ctx.strokeStyle = 'rgba(102, 255, 204, 0.15)'
    ctx.lineWidth = 1
    ctx.strokeRect(margin, baseY - graphHeight, width - margin * 2, graphHeight)

    if (history.length < 2) return

    ctx.lineWidth = 2
    ctx.beginPath()
    history.forEach((value, index) => {
      const x = margin + (index / (history.length - 1)) * (width - margin * 2)
      const y = baseY - value * graphHeight
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.8)'
    ctx.stroke()
  }, [ctx, dimensions.height, dimensions.width])

  const drawScene = useCallback((orderValue, avgAngle) => {
    if (!ctx || dimensions.width === 0) return
    ctx.fillStyle = 'rgba(0, 5, 12, 0.12)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    if (mode === 'pendulum') {
      drawPendulums(orderValue)
    } else if (mode === 'phase') {
      drawPhaseWheel(orderValue, avgAngle)
    } else {
      drawOrderGraph()
    }

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = 'rgba(40, 90, 90, 0.03)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)
    ctx.restore()
  }, [ctx, dimensions.height, dimensions.width, drawOrderGraph, drawPendulums, drawPhaseWheel, mode])

  const stepSystem = useCallback((delta) => {
    if (!ctx || dimensions.width === 0) return
    const metronomes = metronomesRef.current
    if (metronomes.length === 0) return

    const targetOmega = (tempo / 60) * TAU

    let sumCos = 0
    let sumSin = 0
    metronomes.forEach(m => {
      sumCos += Math.cos(m.phase)
      sumSin += Math.sin(m.phase)
    })

    const orderValue = Math.sqrt(sumCos * sumCos + sumSin * sumSin) / metronomes.length
    const avgAngle = Math.atan2(sumSin, sumCos)

    const platform = platformRef.current
    let torque = 0
    metronomes.forEach(m => {
      torque += Math.sin(m.phase) * m.length
    })

    platform.velocity += torque * flexibility * 0.0008
    if (mouse.isDown && mouse.isInBounds) {
      const offset = (mouse.positionRef.current.x - dimensions.centerX) / Math.max(160, dimensions.width)
      platform.velocity += offset * 0.8 * delta
    }
    platform.velocity += kickRef.current
    kickRef.current *= 0.9
    platform.velocity *= 0.985
    platform.angle += platform.velocity

    let avgOmega = 0
    metronomes.forEach(m => {
      const baseOmega = targetOmega * (1 + m.detune)
      const entrainTerm = entrain ? coupling * orderValue * Math.sin(avgAngle - m.phase) : 0
      const platformTerm = platform.velocity * 20 * flexibility
      const noise = (Math.random() - 0.5) * 0.2
      const omega = baseOmega + entrainTerm + platformTerm + noise
      m.velocity = omega
      m.phase = (m.phase + omega * delta) % TAU
      if (m.phase < 0) m.phase += TAU
      avgOmega += omega
    })

    avgOmega /= metronomes.length
    const bpm = (avgOmega / TAU) * 60

    orderHistoryRef.current.push(orderValue)
    if (orderHistoryRef.current.length > 240) {
      orderHistoryRef.current.shift()
    }

    metricsCounterRef.current += 1
    if (metricsCounterRef.current % 10 === 0) {
      setStatSnapshot({
        order: orderValue,
        bpm,
        drift: platform.velocity
      })
    }

    drawScene(orderValue, avgAngle)
  }, [ctx, coupling, dimensions.centerX, dimensions.width, drawScene, entrain, flexibility, mouse.isDown, mouse.isInBounds, tempo])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let frameId
    let lastTime = performance.now()

    const animate = (time) => {
      const delta = Math.min(0.05, (time - lastTime) / 1000) || 0.016
      lastTime = time
      stepSystem(delta)
      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, stepSystem])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
  }, [])

  const controls = [
    { id: 'seed', label: 'seed.phase()', onClick: randomizePhases },
    { id: 'kick', label: 'kick.platform()', onClick: kickPlatform },
    { id: 'entrain', label: entrain ? 'entrain.on()' : 'entrain.off()', onClick: toggleEntrain, active: entrain },
    { id: 'flatten', label: 'flatten.phase()', onClick: flattenPhase, variant: 'reset' }
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

      <div className="flex flex-col gap-3 p-3 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <ExperimentControls
            modes={MODES}
            currentMode={mode}
            onModeChange={handleModeChange}
            controls={controls}
          />
          <p className="text-void-green/60 text-xs sm:text-sm font-mono max-w-xl text-left lg:text-right">
            {message}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-void-cyan/70 text-xs font-mono">
              metronomes: <span className="text-void-green">{metronomeCount}</span>
            </label>
            <input
              type="range"
              min="8"
              max="48"
              step="2"
              value={metronomeCount}
              onChange={(e) => setMetronomeCount(parseInt(e.target.value))}
              className="w-full h-1 bg-void-green/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-void-cyan/70 text-xs font-mono">
              coupling: <span className="text-void-green">{coupling.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={coupling}
              onChange={(e) => setCoupling(parseFloat(e.target.value))}
              className="w-full h-1 bg-void-green/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-void-cyan/70 text-xs font-mono">
              tempo: <span className="text-void-green">{tempo} bpm</span>
            </label>
            <input
              type="range"
              min="70"
              max="200"
              step="5"
              value={tempo}
              onChange={(e) => setTempo(parseInt(e.target.value))}
              className="w-full h-1 bg-void-green/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-void-cyan/70 text-xs font-mono">
              platform flex: <span className="text-void-green">{flexibility.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={flexibility}
              onChange={(e) => setFlexibility(parseFloat(e.target.value))}
              className="w-full h-1 bg-void-green/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-ew-resize"
          data-testid="metronome-chorus-canvas"
        />
      </div>
    </div>
  )
}

export default MetronomeChorus
