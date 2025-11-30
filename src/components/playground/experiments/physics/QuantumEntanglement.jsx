import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const QuantumEntanglement = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const particlesRef = useRef([])
  const entanglementsRef = useRef([])
  const timeRef = useRef(0)
  const [message, setMessage] = useState('∴ particles exist in superposition until observed ∴')

  const quantumMessages = useMemo(() => [
    'particle exists in superposition of all states',
    'probability wave function expanding',
    'entangled pair created - shared wavefunction',
    'spooky action at a distance confirmed',
    'observation event - wave function collapse',
    'particle state now definite',
    'quantum coherence maintained',
    'decoherence spreading through system',
    'entanglement broken by measurement',
    'superposition restored',
    'quantum tunneling detected',
    'heisenberg uncertainty principle active',
    'wave-particle duality manifesting',
    'quantum state teleported',
    'schrodinger equation evolving'
  ], [])

  const spawnQuantumParticle = useCallback(() => {
    if (dimensions.width === 0) return

    const x = Math.random() * dimensions.width
    const y = Math.random() * dimensions.height

    const particle = {
      id: particlesRef.current.length,
      x,
      y,
      baseX: x,
      baseY: y,
      vx: 0,
      vy: 0,
      state: 'superposed',
      spinState: null,
      probability: 1.0,
      wavePhase: Math.random() * Math.PI * 2,
      waveAmplitude: 30,
      size: 4,
      hue: 240,
      entangledWith: null,
      lastObserved: 0
    }

    particlesRef.current.push(particle)
    setMessage('∴ quantum particle spawned in superposition ∴')
  }, [dimensions])

  const createEntangledPair = useCallback(() => {
    if (dimensions.width === 0) return

    const x1 = dimensions.width * 0.3 + (Math.random() - 0.5) * 100
    const y1 = dimensions.height * 0.5 + (Math.random() - 0.5) * 100
    const x2 = dimensions.width * 0.7 + (Math.random() - 0.5) * 100
    const y2 = dimensions.height * 0.5 + (Math.random() - 0.5) * 100

    const sharedPhase = Math.random() * Math.PI * 2

    const particle1 = {
      id: particlesRef.current.length,
      x: x1,
      y: y1,
      baseX: x1,
      baseY: y1,
      vx: 0,
      vy: 0,
      state: 'entangled',
      spinState: null,
      probability: 1.0,
      wavePhase: sharedPhase,
      waveAmplitude: 40,
      size: 5,
      hue: 300,
      entangledWith: null,
      lastObserved: 0
    }

    const particle2 = {
      id: particlesRef.current.length + 1,
      x: x2,
      y: y2,
      baseX: x2,
      baseY: y2,
      vx: 0,
      vy: 0,
      state: 'entangled',
      spinState: null,
      probability: 1.0,
      wavePhase: sharedPhase,
      waveAmplitude: 40,
      size: 5,
      hue: 300,
      entangledWith: null,
      lastObserved: 0
    }

    particle1.entangledWith = particle2
    particle2.entangledWith = particle1

    particlesRef.current.push(particle1, particle2)

    entanglementsRef.current.push({
      particle1,
      particle2,
      strength: 1.0,
      broken: false
    })

    setMessage('∴ entangled particles share single quantum state ∴')
  }, [dimensions])

  const collapseParticle = useCallback((particle) => {
    if (particle.state === 'collapsed') return

    particle.state = 'collapsed'
    particle.spinState = Math.random() < 0.5 ? 'up' : 'down'
    particle.x = particle.baseX
    particle.y = particle.baseY
    particle.waveAmplitude = 0
    particle.lastObserved = timeRef.current

    if (particle.entangledWith && particle.entangledWith.state !== 'collapsed') {
      const partner = particle.entangledWith

      partner.state = 'collapsed'
      partner.spinState = particle.spinState === 'up' ? 'down' : 'up'
      partner.x = partner.baseX
      partner.y = partner.baseY
      partner.waveAmplitude = 0
      partner.lastObserved = timeRef.current

      particle.entangledWith = null
      partner.entangledWith = null

      for (const ent of entanglementsRef.current) {
        if ((ent.particle1 === particle && ent.particle2 === partner) ||
            (ent.particle1 === partner && ent.particle2 === particle)) {
          ent.broken = true
        }
      }

      setMessage('∴ entangled pair collapsed simultaneously ∴')
    } else {
      setMessage('∴ wave function collapsed to definite state ∴')
    }
  }, [])

  const observeAtPoint = useCallback((x, y) => {
    let nearestParticle = null
    let minDist = 80

    for (const particle of particlesRef.current) {
      const dx = particle.x - x
      const dy = particle.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < minDist) {
        minDist = dist
        nearestParticle = particle
      }
    }

    if (nearestParticle) {
      collapseParticle(nearestParticle)
    }
  }, [collapseParticle])

  const observeAllParticles = useCallback(() => {
    let collapsedCount = 0

    for (const particle of particlesRef.current) {
      if (particle.state !== 'collapsed') {
        collapseParticle(particle)
        collapsedCount++
      }
    }

    if (collapsedCount > 0) {
      setMessage('∴ complete system observation - all states collapsed ∴')
    }
  }, [collapseParticle])

  const triggerDecoherence = useCallback(() => {
    for (const particle of particlesRef.current) {
      if (particle.state === 'entangled') {
        particle.state = 'superposed'
        if (particle.entangledWith) {
          particle.entangledWith.state = 'superposed'
          particle.entangledWith.entangledWith = null
          particle.entangledWith = null
        }
      }
    }

    for (const ent of entanglementsRef.current) {
      ent.broken = true
    }

    setMessage('∴ environmental decoherence disrupts quantum states ∴')
  }, [])

  const resetQuantumField = useCallback(() => {
    particlesRef.current = []
    entanglementsRef.current = []
    setMessage('∴ quantum field reset to vacuum state ∴')
  }, [])

  const updateParticles = useCallback(() => {
    for (const particle of particlesRef.current) {
      if (particle.state === 'superposed' || particle.state === 'entangled') {
        particle.wavePhase += 0.05

        const uncertainty = Math.sin(particle.wavePhase) * particle.waveAmplitude
        const angle = particle.wavePhase

        particle.x = particle.baseX + Math.cos(angle) * uncertainty
        particle.y = particle.baseY + Math.sin(angle) * uncertainty

        particle.waveAmplitude = Math.min(50, particle.waveAmplitude + 0.1)

        if (particle.state === 'collapsed' && timeRef.current - particle.lastObserved > 200) {
          particle.state = 'superposed'
          particle.spinState = null
          particle.waveAmplitude = 10
        }
      }

      if (particle.state === 'collapsed') {
        particle.vx += (Math.random() - 0.5) * 0.05
        particle.vy += (Math.random() - 0.5) * 0.05
        particle.vx *= 0.99
        particle.vy *= 0.99

        particle.baseX += particle.vx
        particle.baseY += particle.vy
        particle.x = particle.baseX
        particle.y = particle.baseY

        if (particle.x < 0) particle.baseX = particle.x = dimensions.width
        if (particle.x > dimensions.width) particle.baseX = particle.x = 0
        if (particle.y < 0) particle.baseY = particle.y = dimensions.height
        if (particle.y > dimensions.height) particle.baseY = particle.y = 0
      }
    }

    entanglementsRef.current = entanglementsRef.current.filter(ent => !ent.broken)
  }, [dimensions])

  const draw = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    ctx.fillStyle = 'rgba(0, 1, 4, 0.04)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    ctx.globalAlpha = 0.6
    for (const ent of entanglementsRef.current) {
      if (ent.broken) continue

      const p1 = ent.particle1
      const p2 = ent.particle2

      const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y)
      gradient.addColorStop(0, `hsla(300, 80%, 70%, ${ent.strength * 0.7})`)
      gradient.addColorStop(0.5, `hsla(270, 90%, 80%, ${ent.strength * 0.5})`)
      gradient.addColorStop(1, `hsla(300, 80%, 70%, ${ent.strength * 0.7})`)

      ctx.strokeStyle = gradient
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    ctx.globalAlpha = 1
    for (const particle of particlesRef.current) {
      if (particle.state === 'superposed' || particle.state === 'entangled') {
        ctx.shadowColor = `hsl(${particle.hue}, 80%, 70%)`
        ctx.shadowBlur = 20

        for (let r = particle.waveAmplitude; r > 0; r -= 8) {
          const alpha = (1 - r / particle.waveAmplitude) * 0.3
          ctx.strokeStyle = `hsla(${particle.hue}, 70%, 70%, ${alpha})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(particle.baseX, particle.baseY, r, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      const size = particle.size * (particle.state === 'collapsed' ? 1.2 : 1)
      const coreHue = particle.state === 'collapsed' ? 0 :
                     particle.state === 'entangled' ? 300 : particle.hue

      ctx.shadowColor = `hsl(${coreHue}, 80%, 70%)`
      ctx.shadowBlur = particle.state === 'collapsed' ? 30 : 15

      const glowGradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, size * 4
      )
      glowGradient.addColorStop(0, `hsla(${coreHue}, 90%, 80%, 0.8)`)
      glowGradient.addColorStop(0.5, `hsla(${coreHue}, 80%, 70%, 0.4)`)
      glowGradient.addColorStop(1, `hsla(${coreHue}, 70%, 60%, 0)`)

      ctx.fillStyle = glowGradient
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, size * 4, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = `hsl(${coreHue}, 90%, 90%)`
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2)
      ctx.fill()

      if (particle.state === 'collapsed' && particle.spinState) {
        ctx.shadowBlur = 5
        ctx.fillStyle = particle.spinState === 'up' ?
          'rgba(51, 255, 51, 0.9)' : 'rgba(255, 51, 51, 0.9)'
        const spinY = particle.spinState === 'up' ? -10 : 10
        ctx.beginPath()
        ctx.arc(particle.x, particle.y + spinY, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }, [ctx, dimensions])

  const metrics = useMemo(() => {
    const particles = particlesRef.current
    const superposedCount = particles.filter(p => p.state === 'superposed').length
    const entangledCount = entanglementsRef.current.filter(e => !e.broken).length
    const collapsedCount = particles.filter(p => p.state === 'collapsed').length

    const coherence = entangledCount > 0 ? 'entangled' :
                     superposedCount > collapsedCount ? 'coherent' :
                     superposedCount > 0 ? 'mixed' : 'classical'

    return [
      { label: 'superposed', value: superposedCount },
      { label: 'entangled', value: entangledCount },
      { label: 'collapsed', value: collapsedCount },
      { label: 'coherence', value: coherence }
    ]
  }, [timeRef.current])

  const onFrame = useCallback(() => {
    timeRef.current++
    updateParticles()
    draw()
  }, [updateParticles, draw])

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

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      observeAtPoint(x, y)
    }

    const handleTouch = (e) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const touch = e.touches[0]
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      observeAtPoint(x, y)
    }

    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('touchstart', handleTouch)

    return () => {
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('touchstart', handleTouch)
    }
  }, [canvasRef, observeAtPoint])

  const controls = [
    {
      id: 'spawn',
      label: 'spawn()',
      onClick: spawnQuantumParticle
    },
    {
      id: 'entangle',
      label: 'entangle()',
      onClick: createEntangledPair
    },
    {
      id: 'observe',
      label: 'observe.all()',
      onClick: observeAllParticles
    },
    {
      id: 'decohere',
      label: 'decohere()',
      onClick: triggerDecoherence
    },
    {
      id: 'reset',
      label: 'reset()',
      onClick: resetQuantumField,
      variant: 'reset'
    }
  ]

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="relative z-50 flex items-center justify-between p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
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

      <div className="flex items-center justify-between p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          controls={controls}
        />
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="quantum-canvas"
        />
      </div>
    </div>
  )
}

export default QuantumEntanglement
