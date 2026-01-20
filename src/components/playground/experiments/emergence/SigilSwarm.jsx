import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'spiral', label: 'spiral()' },
  { id: 'shield', label: 'shield()' },
  { id: 'drift', label: 'drift()' }
]

const MODE_MESSAGES = {
  spiral: '∴ sigils orbit the void-core, weaving clockwise wards ∴',
  shield: '∴ sigils guard the cursor-heart, forming feline wards ∴',
  drift: '∴ sigils wander feral, sampling the liminal currents ∴'
}

const SigilSwarm = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('spiral')
  const [message, setMessage] = useState(MODE_MESSAGES.spiral)
  const [metricState, setMetricState] = useState({ flux: 0, coherence: 0, runes: 0 })

  const sigilsRef = useRef([])
  const pulseRef = useRef(0)
  const frameRef = useRef(0)
  const hasSeededRef = useRef(false)

  const createSigil = useCallback((x, y) => {
    sigilsRef.current.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.03,
      arms: Math.floor(Math.random() * 3) + 4,
      aura: Math.random() * 0.6 + 0.4,
      charge: Math.random(),
      energy: 0.5
    })
  }, [])

  const seedSwarm = useCallback(() => {
    sigilsRef.current = []
    const count = 28
    for (let i = 0; i < count; i++) {
      createSigil(
        Math.random() * dimensions.width,
        Math.random() * dimensions.height
      )
    }
    setMessage('∴ swarm seeded - runes awaken against entropy ∴')
  }, [createSigil, dimensions.width, dimensions.height])

  useEffect(() => {
    if (dimensions.width === 0 || hasSeededRef.current) return
    hasSeededRef.current = true
    seedSwarm()
  }, [dimensions.width, seedSwarm])

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    setMessage(MODE_MESSAGES[newMode] || MODE_MESSAGES.spiral)
  }, [])

  const handlePulse = useCallback(() => {
    pulseRef.current = 1.4
    setMessage('∴ ritual pulse ripples the sigil net ∴')
  }, [])

  const handleReset = useCallback(() => {
    seedSwarm()
    pulseRef.current = 0
  }, [seedSwarm])

  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left
    const y = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top

    for (let i = 0; i < 6; i++) {
      const jitter = (Math.random() - 0.5) * 18
      createSigil(x + jitter, y + jitter)
    }
    pulseRef.current = 1
    setMessage('∴ new rune shards inscribed - swarm grows ∴')
  }, [canvasRef, createSigil])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('click', handleCanvasClick)
    canvas.addEventListener('touchstart', handleCanvasClick)

    return () => {
      canvas.removeEventListener('click', handleCanvasClick)
      canvas.removeEventListener('touchstart', handleCanvasClick)
    }
  }, [canvasRef, handleCanvasClick])

  const updateSigils = useCallback(() => {
    const sigils = sigilsRef.current
    if (sigils.length === 0) return

    const target = mode === 'shield'
      ? mouse.positionRef.current
      : { x: dimensions.centerX, y: dimensions.centerY }

    let flux = 0
    let alignment = 0

    for (const sigil of sigils) {
      const dx = target.x - sigil.x
      const dy = target.y - sigil.y
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.001

      let fx = 0
      let fy = 0

      if (mode === 'shield') {
        const pull = Math.min(0.9, 120 / dist)
        fx += (dx / dist) * pull * 0.5
        fy += (dy / dist) * pull * 0.5
        fx += (-dy / dist) * 0.24
        fy += (dx / dist) * 0.24
      } else if (mode === 'spiral') {
        const swirl = 0.16
        fx += (-dy / dist) * swirl
        fy += (dx / dist) * swirl
        fx += (dx / dist) * 0.05
        fy += (dy / dist) * 0.05
      } else {
        fx += (Math.random() - 0.5) * 0.3
        fy += (Math.random() - 0.5) * 0.3
      }

      const mdx = mouse.positionRef.current.x - sigil.x
      const mdy = mouse.positionRef.current.y - sigil.y
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy) + 0.001
      const proximity = Math.max(0, 1 - mdist / 160)

      fx += (mdx / mdist) * proximity * 0.3
      fy += (mdy / mdist) * proximity * 0.3

      if (pulseRef.current > 0) {
        const pdx = sigil.x - target.x
        const pdy = sigil.y - target.y
        const pdist = Math.sqrt(pdx * pdx + pdy * pdy) + 0.001
        fx += (pdx / pdist) * pulseRef.current * 0.6
        fy += (pdy / pdist) * pulseRef.current * 0.6
      }

      sigil.vx += fx * 0.6
      sigil.vy += fy * 0.6
      sigil.vx *= 0.985
      sigil.vy *= 0.985
      sigil.x += sigil.vx
      sigil.y += sigil.vy

      if (sigil.x < 0) sigil.x = dimensions.width
      if (sigil.x > dimensions.width) sigil.x = 0
      if (sigil.y < 0) sigil.y = dimensions.height
      if (sigil.y > dimensions.height) sigil.y = 0

      const speed = Math.hypot(sigil.vx, sigil.vy)
      sigil.rotation += sigil.spin + speed * 0.01
      sigil.energy = Math.min(1.4, 0.4 + speed * 0.35 + proximity * 0.4)
      sigil.aura = Math.min(1.2, sigil.aura * 0.995 + proximity * 0.01 + pulseRef.current * 0.02)

      flux += speed
      const flowAngle = Math.atan2(sigil.vy, sigil.vx)
      const desiredAngle = Math.atan2(dy, dx)
      let diff = Math.abs(desiredAngle - flowAngle)
      diff = Math.min(diff, Math.PI * 2 - diff)
      alignment += 1 - diff / Math.PI
    }

    pulseRef.current = Math.max(0, pulseRef.current - 0.012)
    frameRef.current++
    if (frameRef.current % 10 === 0) {
      setMetricState({
        flux: sigils.length ? flux / sigils.length : 0,
        coherence: sigils.length ? alignment / sigils.length : 0,
        runes: sigils.length
      })
    }
  }, [mode, mouse.positionRef, dimensions.centerX, dimensions.centerY, dimensions.width, dimensions.height])

  const drawSigils = useCallback(() => {
    if (!ctx) return

    const sigils = sigilsRef.current
    ctx.fillStyle = 'rgba(0, 6, 12, 0.08)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    ctx.globalAlpha = 0.35
    for (let i = 0; i < sigils.length; i++) {
      for (let j = i + 1; j < sigils.length; j++) {
        const s1 = sigils[i]
        const s2 = sigils[j]
        const dx = s2.x - s1.x
        const dy = s2.y - s1.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 120) {
          const alpha = (120 - dist) / 120
          ctx.strokeStyle = `hsla(190, 70%, 70%, ${alpha * 0.4})`
          ctx.lineWidth = 0.6
          ctx.beginPath()
          ctx.moveTo(s1.x, s1.y)
          ctx.lineTo(s2.x, s2.y)
          ctx.stroke()
        }
      }
    }

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'lighter'
    for (const sigil of sigils) {
      ctx.save()
      ctx.translate(sigil.x, sigil.y)
      ctx.rotate(sigil.rotation)

      const hue = 40 + sigil.energy * 120
      ctx.shadowColor = `hsla(${hue + 30}, 90%, 70%, ${0.6 + sigil.aura * 0.3})`
      ctx.shadowBlur = 12 + sigil.energy * 14

      ctx.strokeStyle = `hsla(${hue}, 90%, 70%, 0.7)`
      ctx.lineWidth = 1 + sigil.energy * 0.6
      ctx.beginPath()
      for (let i = 0; i < sigil.arms; i++) {
        const angle = (Math.PI * 2 * i) / sigil.arms
        const len = 12 + sigil.aura * 14
        ctx.moveTo(Math.cos(angle) * 3, Math.sin(angle) * 3)
        ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len)
        ctx.moveTo(Math.cos(angle + 0.25) * len * 0.6, Math.sin(angle + 0.25) * len * 0.6)
        ctx.lineTo(Math.cos(angle - 0.25) * len * 0.6, Math.sin(angle - 0.25) * len * 0.6)
      }
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(0, 0, 4 + sigil.aura * 4, 0, Math.PI * 2)
      ctx.strokeStyle = `hsla(${hue + 60}, 95%, 80%, 0.5)`
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.fillStyle = `hsla(${hue + 20}, 95%, 85%, ${0.7 + sigil.aura * 0.2})`
      ctx.beginPath()
      ctx.arc(0, 0, 2.6 + sigil.energy * 1.4, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = `hsla(${hue - 20}, 80%, 60%, 0.4)`
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(-6 - sigil.aura * 3, 0)
      ctx.lineTo(6 + sigil.aura * 3, 0)
      ctx.moveTo(0, -6 - sigil.aura * 3)
      ctx.lineTo(0, 6 + sigil.aura * 3)
      ctx.stroke()

      ctx.restore()
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.shadowBlur = 0
  }, [ctx, dimensions.width, dimensions.height])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    updateSigils()
    drawSigils()
  }, [ctx, dimensions.width, updateSigils, drawSigils])

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
    const fluxState = metricState.flux.toFixed(2)
    const coherence = Math.min(1, Math.max(0, metricState.coherence))
    const coherenceValue = `${Math.round(coherence * 100)}%`
    return [
      { label: 'sigils', value: metricState.runes },
      { label: 'flux', value: fluxState },
      { label: 'coherence', value: coherenceValue }
    ]
  }, [metricState])

  const controls = [
    {
      id: 'pulse',
      label: 'pulse()',
      onClick: handlePulse,
      active: pulseRef.current > 0.05
    },
    {
      id: 'reset',
      label: 'reset()',
      onClick: handleReset,
      variant: 'reset'
    }
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
          data-testid="sigil-swarm-canvas"
        />
      </div>
    </div>
  )
}

export default SigilSwarm
