import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'loop', label: 'net.loop()' },
  { id: 'fork', label: 'net.fork()' },
  { id: 'latch', label: 'net.latch()' }
]

const PRESETS = {
  loop: {
    message: '∴ loop net humming // click wells to seed tokens, click gates to fire them ∴',
    places: [
      { id: 'wake', label: 'wake', x: 0.16, y: 0.5, capacity: 5, tokens: 2, hue: 160 },
      { id: 'cache', label: 'cache', x: 0.34, y: 0.24, capacity: 4, tokens: 0, hue: 200 },
      { id: 'signal', label: 'signal', x: 0.6, y: 0.2, capacity: 4, tokens: 0, hue: 190 },
      { id: 'dream', label: 'dream', x: 0.8, y: 0.46, capacity: 5, tokens: 1, hue: 300 },
      { id: 'archive', label: 'archive', x: 0.56, y: 0.76, capacity: 5, tokens: 0, hue: 48 }
    ],
    transitions: [
      { id: 'distill', label: 'distill', x: 0.26, y: 0.36, inputs: ['wake'], outputs: ['cache'] },
      { id: 'broadcast', label: 'broadcast', x: 0.46, y: 0.22, inputs: ['cache'], outputs: ['signal'] },
      { id: 'refract', label: 'refract', x: 0.7, y: 0.32, inputs: ['signal'], outputs: ['dream'] },
      { id: 'shelve', label: 'shelve', x: 0.69, y: 0.63, inputs: ['dream'], outputs: ['archive'] },
      { id: 'return', label: 'return', x: 0.37, y: 0.67, inputs: ['archive'], outputs: ['wake'] },
      { id: 'braid', label: 'braid', x: 0.6, y: 0.47, inputs: ['signal'], outputs: ['dream', 'archive'] }
    ]
  },
  fork: {
    message: '∴ branch net dividing intent into parallel channels ∴',
    places: [
      { id: 'source', label: 'source', x: 0.16, y: 0.5, capacity: 6, tokens: 4, hue: 160 },
      { id: 'left', label: 'left', x: 0.42, y: 0.26, capacity: 4, tokens: 0, hue: 208 },
      { id: 'right', label: 'right', x: 0.42, y: 0.74, capacity: 4, tokens: 0, hue: 336 },
      { id: 'harmony', label: 'harmony', x: 0.73, y: 0.5, capacity: 5, tokens: 0, hue: 88 },
      { id: 'ash', label: 'ash', x: 0.88, y: 0.24, capacity: 3, tokens: 0, hue: 34 }
    ],
    transitions: [
      { id: 'split.left', label: 'split', x: 0.28, y: 0.34, inputs: ['source'], outputs: ['left'] },
      { id: 'split.right', label: 'split', x: 0.28, y: 0.66, inputs: ['source'], outputs: ['right'] },
      { id: 'braid', label: 'braid', x: 0.57, y: 0.5, inputs: ['left', 'right'], outputs: ['harmony'] },
      { id: 'shed', label: 'shed', x: 0.81, y: 0.36, inputs: ['harmony'], outputs: ['ash', 'source'] },
      { id: 'reseed', label: 'reseed', x: 0.62, y: 0.76, inputs: ['ash'], outputs: ['source'] }
    ]
  },
  latch: {
    message: '∴ feedback latch // memory and release circling the same chamber ∴',
    places: [
      { id: 'charge', label: 'charge', x: 0.14, y: 0.52, capacity: 5, tokens: 3, hue: 160 },
      { id: 'gate', label: 'gate', x: 0.41, y: 0.24, capacity: 3, tokens: 0, hue: 44 },
      { id: 'echo', label: 'echo', x: 0.42, y: 0.76, capacity: 4, tokens: 0, hue: 210 },
      { id: 'memory', label: 'memory', x: 0.71, y: 0.5, capacity: 6, tokens: 1, hue: 308 }
    ],
    transitions: [
      { id: 'open', label: 'open', x: 0.27, y: 0.38, inputs: ['charge'], outputs: ['gate'] },
      { id: 'spill', label: 'spill', x: 0.27, y: 0.64, inputs: ['charge'], outputs: ['echo'] },
      { id: 'record', label: 'record', x: 0.55, y: 0.5, inputs: ['gate', 'echo'], outputs: ['memory'] },
      { id: 'release', label: 'release', x: 0.69, y: 0.27, inputs: ['memory'], outputs: ['charge'] },
      { id: 'murmur', label: 'murmur', x: 0.69, y: 0.73, inputs: ['memory'], outputs: ['echo'] },
      { id: 'hush', label: 'hush', x: 0.5, y: 0.18, inputs: ['gate'], outputs: ['charge'] }
    ]
  }
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const distance = (ax, ay, bx, by) => {
  const dx = ax - bx
  const dy = ay - by
  return Math.sqrt(dx * dx + dy * dy)
}

const curvePoint = (from, to, bend = 0.14) => {
  const midX = (from.px + to.px) / 2
  const midY = (from.py + to.py) / 2
  const dx = to.px - from.px
  const dy = to.py - from.py
  const len = Math.max(1, Math.sqrt(dx * dx + dy * dy))
  return {
    x: midX - (dy / len) * bend * len,
    y: midY + (dx / len) * bend * len
  }
}

const createPulse = (from, to, hue) => ({
  fromX: from.px,
  fromY: from.py,
  toX: to.px,
  toY: to.py,
  progress: 0,
  speed: 0.035 + Math.random() * 0.02,
  hue
})

const clonePreset = (preset) => {
  const places = preset.places.map(place => ({
    ...place,
    tokens: place.tokens,
    heat: 0,
    px: 0,
    py: 0
  }))
  const transitions = preset.transitions.map((transition, index) => ({
    ...transition,
    heat: 0,
    px: 0,
    py: 0,
    cadence: index * 7
  }))
  return { places, transitions }
}

const PetriChorus = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('loop')
  const [autoRun, setAutoRun] = useState(false)
  const [message, setMessage] = useState(PRESETS.loop.message)
  const [stats, setStats] = useState({
    tokens: 0,
    enabled: 0,
    fired: 0,
    chorus: 'still'
  })

  const netRef = useRef(null)
  const pulsesRef = useRef([])
  const frameRef = useRef(0)
  const firedRef = useRef(0)
  const recentRef = useRef(0)
  const autoCooldownRef = useRef(0)
  const hoverRef = useRef(null)
  const cycleRef = useRef(0)

  const layoutNet = useCallback(() => {
    const net = netRef.current
    if (!net || dimensions.width === 0) return

    const padX = dimensions.width * 0.09
    const padY = dimensions.height * 0.12
    const usableWidth = dimensions.width - padX * 2
    const usableHeight = dimensions.height - padY * 2

    net.places.forEach(place => {
      place.px = padX + usableWidth * place.x
      place.py = padY + usableHeight * place.y
    })

    net.transitions.forEach(transition => {
      transition.px = padX + usableWidth * transition.x
      transition.py = padY + usableHeight * transition.y
    })
  }, [dimensions.height, dimensions.width])

  const rebuildNet = useCallback((nextMode) => {
    const preset = PRESETS[nextMode]
    netRef.current = clonePreset(preset)
    pulsesRef.current = []
    firedRef.current = 0
    recentRef.current = 0
    autoCooldownRef.current = 0
    cycleRef.current = 0
    layoutNet()
    setMessage(preset.message)
  }, [layoutNet])

  useEffect(() => {
    rebuildNet(mode)
  }, [mode, rebuildNet])

  useEffect(() => {
    layoutNet()
  }, [layoutNet])

  const getPlaceMap = useCallback(() => {
    const net = netRef.current
    return new Map(net?.places.map(place => [place.id, place]) || [])
  }, [])

  const enabledTransitions = useCallback(() => {
    const net = netRef.current
    if (!net) return []
    const placeMap = getPlaceMap()

    return net.transitions.filter(transition => {
      const hasInputs = transition.inputs.every(id => (placeMap.get(id)?.tokens || 0) > 0)
      const hasCapacity = transition.outputs.every(id => {
        const place = placeMap.get(id)
        return place ? place.tokens < place.capacity : false
      })
      return hasInputs && hasCapacity
    })
  }, [getPlaceMap])

  const fireTransition = useCallback((transition, quiet = false) => {
    const net = netRef.current
    if (!net) return false
    const placeMap = getPlaceMap()
    const inputsReady = transition.inputs.every(id => (placeMap.get(id)?.tokens || 0) > 0)
    const outputsReady = transition.outputs.every(id => {
      const place = placeMap.get(id)
      return place ? place.tokens < place.capacity : false
    })

    if (!inputsReady || !outputsReady) {
      if (!quiet) {
        setMessage(`∴ ${transition.label} waits for a fuller chorus ∴`)
      }
      return false
    }

    transition.inputs.forEach(id => {
      const place = placeMap.get(id)
      place.tokens = Math.max(0, place.tokens - 1)
      place.heat = 1
      pulsesRef.current.push(createPulse(place, transition, place.hue))
    })

    transition.outputs.forEach(id => {
      const place = placeMap.get(id)
      place.tokens = clamp(place.tokens + 1, 0, place.capacity)
      place.heat = 1
      pulsesRef.current.push(createPulse(transition, place, place.hue))
    })

    transition.heat = 1
    firedRef.current += 1
    recentRef.current += 1

    if (!quiet) {
      setMessage(`∴ ${transition.label} opens // tokens migrate through the rite ∴`)
    }
    return true
  }, [getPlaceMap])

  const stepAuto = useCallback(() => {
    const enabled = enabledTransitions()
    if (enabled.length === 0) return false

    let chosen = enabled[cycleRef.current % enabled.length]
    if (mode === 'fork') {
      chosen = enabled[Math.floor(Math.random() * enabled.length)]
    } else if (mode === 'latch') {
      chosen = enabled.slice().sort((a, b) => a.outputs.length - b.outputs.length)[0]
    }

    cycleRef.current += 1
    return fireTransition(chosen, true)
  }, [enabledTransitions, fireTransition, mode])

  const seedRandom = useCallback(() => {
    const net = netRef.current
    if (!net) return
    net.places.forEach(place => {
      place.tokens = Math.floor(Math.random() * (place.capacity + 1))
      place.heat = 0.6
    })
    pulsesRef.current = []
    setMessage('∴ reservoirs reseeded // new concurrent weather rolls in ∴')
  }, [])

  const clearNet = useCallback(() => {
    const net = netRef.current
    if (!net) return
    net.places.forEach(place => {
      place.tokens = 0
      place.heat = 0
    })
    net.transitions.forEach(transition => {
      transition.heat = 0
    })
    pulsesRef.current = []
    setMessage('∴ the chant falls silent // every vessel drained ∴')
  }, [])

  const hitTest = useCallback((x, y) => {
    const net = netRef.current
    if (!net) return null

    for (const place of net.places) {
      if (distance(x, y, place.px, place.py) < 28) {
        return { type: 'place', item: place }
      }
    }

    for (const transition of net.transitions) {
      if (Math.abs(x - transition.px) < 22 && Math.abs(y - transition.py) < 18) {
        return { type: 'transition', item: transition }
      }
    }

    return null
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (event) => {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const target = hitTest(x, y)

      if (!target) {
        setMessage('∴ empty substrate // wells and gates await contact ∴')
        return
      }

      if (target.type === 'place') {
        const place = target.item
        place.tokens = place.tokens + 1 > place.capacity ? 0 : place.tokens + 1
        place.heat = 1
        setMessage(`∴ ${place.label} cycled to ${place.tokens}/${place.capacity} tokens ∴`)
      } else {
        fireTransition(target.item)
      }
    }

    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [canvasRef, fireTransition, hitTest])

  const drawLinks = useCallback((net) => {
    const placeMap = getPlaceMap()

    net.transitions.forEach((transition, index) => {
      const heat = transition.heat
      transition.inputs.forEach((id, inputIndex) => {
        const place = placeMap.get(id)
        const control = curvePoint(place, transition, (inputIndex % 2 === 0 ? 0.1 : -0.1) + index * 0.004)
        ctx.strokeStyle = `hsla(${place.hue}, 70%, 62%, ${0.15 + heat * 0.3})`
        ctx.lineWidth = 1 + heat * 1.8
        ctx.beginPath()
        ctx.moveTo(place.px, place.py)
        ctx.quadraticCurveTo(control.x, control.y, transition.px, transition.py)
        ctx.stroke()
      })

      transition.outputs.forEach((id, outputIndex) => {
        const place = placeMap.get(id)
        const control = curvePoint(transition, place, (outputIndex % 2 === 0 ? -0.12 : 0.12) - index * 0.003)
        ctx.strokeStyle = `hsla(${place.hue}, 80%, 70%, ${0.18 + heat * 0.34})`
        ctx.lineWidth = 1.2 + heat * 1.8
        ctx.beginPath()
        ctx.moveTo(transition.px, transition.py)
        ctx.quadraticCurveTo(control.x, control.y, place.px, place.py)
        ctx.stroke()
      })
    })
  }, [ctx, getPlaceMap])

  const drawTransitions = useCallback((net) => {
    net.transitions.forEach(transition => {
      const hovered = hoverRef.current?.type === 'transition' && hoverRef.current.item.id === transition.id
      const width = 14
      const height = 36
      const light = 26 + transition.heat * 20 + (hovered ? 10 : 0)

      ctx.save()
      ctx.translate(transition.px, transition.py)
      ctx.fillStyle = `hsla(165, 70%, ${light}%, ${0.55 + transition.heat * 0.28})`
      ctx.fillRect(-width / 2, -height / 2, width, height)
      ctx.strokeStyle = `hsla(165, 90%, 74%, ${hovered ? 0.9 : 0.45})`
      ctx.lineWidth = hovered ? 1.4 : 1
      ctx.strokeRect(-width / 2, -height / 2, width, height)
      ctx.restore()

      ctx.fillStyle = 'rgba(200, 255, 236, 0.72)'
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(transition.label, transition.px, transition.py - 24)

      transition.heat *= 0.93
    })
  }, [ctx])

  const drawPlaces = useCallback((net) => {
    net.places.forEach(place => {
      const hovered = hoverRef.current?.type === 'place' && hoverRef.current.item.id === place.id
      const radius = 24
      const glow = 0.16 + place.tokens / Math.max(place.capacity, 1) * 0.28 + place.heat * 0.22

      const gradient = ctx.createRadialGradient(place.px, place.py, 0, place.px, place.py, radius * 2.4)
      gradient.addColorStop(0, `hsla(${place.hue}, 85%, 64%, ${glow})`)
      gradient.addColorStop(0.45, `hsla(${place.hue}, 85%, 34%, ${glow * 0.85})`)
      gradient.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(place.px, place.py, radius * 2.4, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = `hsla(${place.hue}, 76%, ${hovered ? 28 : 18}%, 0.92)`
      ctx.beginPath()
      ctx.arc(place.px, place.py, radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = `hsla(${place.hue}, 88%, 74%, ${hovered ? 0.95 : 0.52})`
      ctx.lineWidth = hovered ? 1.8 : 1.2
      ctx.beginPath()
      ctx.arc(place.px, place.py, radius, 0, Math.PI * 2)
      ctx.stroke()

      const tokenDots = Math.min(place.tokens, 6)
      for (let i = 0; i < tokenDots; i++) {
        const angle = i === 0 ? 0 : (Math.PI * 2 * i) / tokenDots
        const orbit = tokenDots === 1 ? 0 : 10
        const tx = place.px + Math.cos(angle) * orbit
        const ty = place.py + Math.sin(angle) * orbit
        ctx.fillStyle = `hsla(${place.hue}, 92%, 82%, 0.92)`
        ctx.beginPath()
        ctx.arc(tx, ty, 3.2, 0, Math.PI * 2)
        ctx.fill()
      }

      if (place.tokens > 6) {
        ctx.fillStyle = `hsla(${place.hue}, 92%, 84%, 0.96)`
        ctx.font = '11px ui-monospace, SFMono-Regular, Menlo'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(place.tokens), place.px, place.py)
      }

      ctx.fillStyle = 'rgba(208, 255, 242, 0.82)'
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(`${place.label} ${place.tokens}/${place.capacity}`, place.px, place.py + 32)

      place.heat *= 0.92
    })
  }, [ctx])

  const drawPulses = useCallback(() => {
    pulsesRef.current = pulsesRef.current.filter(pulse => {
      pulse.progress += pulse.speed
      if (pulse.progress >= 1) return false

      const x = pulse.fromX + (pulse.toX - pulse.fromX) * pulse.progress
      const y = pulse.fromY + (pulse.toY - pulse.fromY) * pulse.progress
      const alpha = 0.95 - pulse.progress * 0.45
      ctx.fillStyle = `hsla(${pulse.hue}, 92%, 78%, ${alpha})`
      ctx.beginPath()
      ctx.arc(x, y, 4.2, 0, Math.PI * 2)
      ctx.fill()
      return true
    })
  }, [ctx])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0 || !netRef.current) return
    frameRef.current++

    ctx.fillStyle = 'rgba(0, 3, 8, 0.18)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const pointer = mouse.positionRef.current
    hoverRef.current = hitTest(pointer.x, pointer.y)

    if (autoRun) {
      autoCooldownRef.current -= 1
      if (autoCooldownRef.current <= 0) {
        const fired = stepAuto()
        autoCooldownRef.current = fired ? 16 : 24
      }
    }

    drawLinks(netRef.current)
    drawTransitions(netRef.current)
    drawPlaces(netRef.current)
    drawPulses()

    if (frameRef.current % 12 === 0) {
      const net = netRef.current
      const tokens = net.places.reduce((sum, place) => sum + place.tokens, 0)
      const enabled = enabledTransitions().length
      const chorus = recentRef.current === 0
        ? 'still'
        : recentRef.current < 3
        ? 'murmur'
        : recentRef.current < 6
        ? 'woven'
        : 'surge'
      setStats({
        tokens,
        enabled,
        fired: firedRef.current,
        chorus
      })
      recentRef.current = 0
    }
  }, [autoRun, ctx, dimensions.height, dimensions.width, drawLinks, drawPlaces, drawPulses, drawTransitions, enabledTransitions, hitTest, mouse.positionRef, stepAuto])

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

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
  }, [])

  const handleManualStep = useCallback(() => {
    const enabled = enabledTransitions()
    if (enabled.length === 0) {
      setMessage('∴ no transition is presently enabled ∴')
      return
    }
    fireTransition(enabled[0])
  }, [enabledTransitions, fireTransition])

  const toggleAuto = useCallback(() => {
    setAutoRun(prev => {
      const next = !prev
      setMessage(next
        ? '∴ auto chant engaged // the net now tends itself ∴'
        : '∴ auto chant stilled // manual hands regain the circuit ∴')
      return next
    })
  }, [])

  const metrics = useMemo(() => [
    { label: 'tokens', value: stats.tokens },
    { label: 'enabled', value: stats.enabled },
    { label: 'fired', value: stats.fired },
    { label: 'chorus', value: stats.chorus },
    { label: 'auto', value: autoRun ? 'chanting' : 'manual' }
  ], [autoRun, stats])

  const controls = [
    {
      id: 'step',
      label: 'step.fire()',
      onClick: handleManualStep
    },
    {
      id: 'auto',
      label: autoRun ? 'auto.hush()' : 'auto.chant()',
      onClick: toggleAuto,
      active: autoRun
    },
    {
      id: 'seed',
      label: 'seed.random()',
      onClick: seedRandom
    },
    {
      id: 'clear',
      label: 'quiet.clear()',
      onClick: clearNet,
      variant: 'reset'
    }
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
        <p className="text-void-green/50 text-xs sm:text-right max-w-xl">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="petri-chorus-canvas"
        />
      </div>
    </div>
  )
}

export default PetriChorus
