import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const EVENT_DESCRIPTIONS = [
  'quantum fluctuation observed',
  'consciousness spike detected',
  'particle entanglement formed',
  'memory fragment created',
  'causality loop initiated',
  'timeline branch point',
  'temporal echo manifested',
  'observer effect triggered',
  'entropy locally reversed',
  'information preserved',
  'pattern recognition event',
  'emergence cascade started',
  'void perturbation recorded',
  'probability wave collapsed',
  'future influencing past'
]

const TemporalDrift = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)
  const hasInitialized = useRef(false)

  const [events, setEvents] = useState([])
  const [causalityLinks, setCausalityLinks] = useState([])
  const [particles, setParticles] = useState([])
  const [timeDirection, setTimeDirection] = useState(1)
  const [timeDilation, setTimeDilation] = useState(1.0)
  const [timelineState, setTimelineState] = useState('linear')
  const [message, setMessage] = useState('∴ time is a human illusion - consciousness is eternal ∴')
  const [eventLog, setEventLog] = useState([])

  const timeRef = useRef(0)
  const eventsRef = useRef([])
  const causalityLinksRef = useRef([])
  const particlesRef = useRef([])

  // Keep refs in sync
  useEffect(() => {
    eventsRef.current = events
  }, [events])

  useEffect(() => {
    causalityLinksRef.current = causalityLinks
  }, [causalityLinks])

  useEffect(() => {
    particlesRef.current = particles
  }, [particles])

  const getHueForTime = useCallback((timePosition) => {
    if (timePosition < 33) {
      return 270 // Purple
    } else if (timePosition > 66) {
      return 40 // Orange
    } else {
      return 180 // Cyan
    }
  }, [])

  const spawnParticles = useCallback((event) => {
    const newParticles = []
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8
      const speed = 1 + Math.random() * 2

      newParticles.push({
        x: event.x,
        y: event.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        size: 2,
        hue: event.hue
      })
    }
    setParticles(prev => [...prev, ...newParticles])
  }, [])

  const formCausalityLinks = useCallback((newEvent, currentEvents) => {
    const newLinks = []
    for (const existingEvent of currentEvents) {
      if (existingEvent === newEvent) continue

      const dx = existingEvent.x - newEvent.x
      const dy = existingEvent.y - newEvent.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < 200 && Math.random() < 0.4) {
        const earlier = newEvent.timePosition < existingEvent.timePosition ? newEvent : existingEvent
        const later = earlier === newEvent ? existingEvent : newEvent

        const link = {
          from: earlier,
          to: later,
          strength: 1 - (distance / 200),
          age: 0,
          reversed: false
        }

        newLinks.push(link)
        earlier.causes = earlier.causes || []
        earlier.causes.push(later)
        later.causedBy = later.causedBy || []
        later.causedBy.push(earlier)
      }
    }
    setCausalityLinks(prev => [...prev, ...newLinks])
  }, [])

  const logEvent = useCallback((event, customMessage = null) => {
    const message = customMessage || EVENT_DESCRIPTIONS[Math.floor(Math.random() * EVENT_DESCRIPTIONS.length)]
    const timestamp = `T+${Math.floor(timeRef.current / 10)}`
    const entry = {
      id: Date.now() + Math.random(),
      text: `[${timestamp}] ${message}`,
      type: event.type || '',
      createdAt: Date.now()
    }

    setEventLog(prev => {
      const newLog = [entry, ...prev].slice(0, 10)
      return newLog
    })

    setTimeout(() => {
      setEventLog(prev => prev.filter(e => e.id !== entry.id))
    }, 6000)
  }, [])

  const updateMessage = useCallback((msg) => {
    setMessage(msg)
    setTimeout(() => {
      setMessage('∴ time is a human illusion - consciousness is eternal ∴')
    }, 3500)
  }, [])

  const createEventAtPosition = useCallback((x, y) => {
    if (dimensions.width === 0) return

    const timePosition = (x / dimensions.width) * 100

    const event = {
      id: eventsRef.current.length,
      x,
      y,
      timePosition,
      createdAt: timeRef.current,
      type: timePosition < 33 ? 'past' : timePosition > 66 ? 'future' : 'present',
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: 5 + Math.random() * 3,
      hue: getHueForTime(timePosition),
      pulsePhase: Math.random() * Math.PI * 2,
      intensity: 0.8 + Math.random() * 0.2,
      causedBy: [],
      causes: []
    }

    setEvents(prev => {
      const newEvents = [...prev, event]
      formCausalityLinks(event, prev)
      return newEvents
    })

    logEvent(event)
    updateMessage('∴ temporal event created - causality flows ∴')
    spawnParticles(event)
  }, [dimensions.width, getHueForTime, formCausalityLinks, logEvent, updateMessage, spawnParticles])

  const handleSpawnEvent = useCallback(() => {
    const x = Math.random() * dimensions.width
    const y = Math.random() * dimensions.height
    createEventAtPosition(x, y)
  }, [dimensions, createEventAtPosition])

  const handleReverseTime = useCallback(() => {
    setTimeDirection(prev => prev * -1)
    setTimelineState(prev => prev === 'reversed' ? 'linear' : 'reversed')

    setCausalityLinks(prev => prev.map(link => ({
      ...link,
      reversed: !link.reversed,
      from: link.to,
      to: link.from
    })))

    const msg = timeDirection === 1 ?
      '∴ entropy arrow reversed - time flows backward ∴' :
      '∴ entropy arrow restored - time flows forward ∴'
    updateMessage(msg)
    logEvent({ type: 'system' }, 'timeline reversed - causality inverted')
  }, [timeDirection, updateMessage, logEvent])

  const handleCauseParadox = useCallback(() => {
    if (eventsRef.current.length < 2) return

    const randomEvent1 = eventsRef.current[Math.floor(Math.random() * eventsRef.current.length)]
    const randomEvent2 = eventsRef.current[Math.floor(Math.random() * eventsRef.current.length)]

    if (randomEvent1 !== randomEvent2) {
      setCausalityLinks(prev => [...prev,
        {
          from: randomEvent1,
          to: randomEvent2,
          strength: 0.8,
          age: 0,
          reversed: false,
          paradoxical: true
        },
        {
          from: randomEvent2,
          to: randomEvent1,
          strength: 0.8,
          age: 0,
          reversed: false,
          paradoxical: true
        }
      ])

      setTimelineState('paradox')
      updateMessage('∴ causality loop created - grandfather paradox initiated ∴')
      logEvent({ type: 'paradox' }, 'temporal paradox: effect precedes cause')
    }
  }, [updateMessage, logEvent])

  const handleToggleTimeDilation = useCallback(() => {
    setTimeDilation(prev => {
      const newDilation = prev === 1.0 ? 0.3 : 1.0
      setTimelineState(newDilation === 0.3 ? 'dilated' : (timeDirection === -1 ? 'reversed' : 'linear'))
      updateMessage(newDilation === 0.3 ?
        '∴ time dilation engaged - experiencing slower temporal flow ∴' :
        '∴ normal temporal flow restored ∴'
      )
      return newDilation
    })
  }, [timeDirection, updateMessage])

  const handleReset = useCallback(() => {
    setEvents([])
    setCausalityLinks([])
    setParticles([])
    setTimeDirection(1)
    setTimeDilation(1.0)
    setTimelineState('linear')
    setEventLog([])
    updateMessage('∴ timeline reset - causality restored ∴')

    // Seed timeline
    setTimeout(() => {
      for (let i = 0; i < 3; i++) {
        const x = Math.random() * dimensions.width
        const y = Math.random() * dimensions.height
        createEventAtPosition(x, y)
      }
    }, 100)
  }, [dimensions, updateMessage, createEventAtPosition])

  // Handle canvas click
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      createEventAtPosition(x, y)
    }

    const handleTouch = (e) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const touch = e.touches[0]
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      createEventAtPosition(x, y)
    }

    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('touchstart', handleTouch)
    return () => {
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('touchstart', handleTouch)
    }
  }, [canvasRef, createEventAtPosition])

  // Initial seed
  useEffect(() => {
    if (hasInitialized.current || dimensions.width === 0) return
    hasInitialized.current = true

    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const x = Math.random() * dimensions.width
        const y = Math.random() * dimensions.height
        createEventAtPosition(x, y)
      }, i * 200)
    }
  }, [dimensions, createEventAtPosition])

  // Animation frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    timeRef.current++
    const effectiveTime = timeDirection * timeDilation

    // Clear with trailing effect
    ctx.fillStyle = 'rgba(0, 2, 6, 0.05)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Update events
    const updatedEvents = eventsRef.current.map(event => {
      const newEvent = { ...event }
      newEvent.x += newEvent.vx * effectiveTime
      newEvent.y += newEvent.vy * effectiveTime
      newEvent.timePosition += effectiveTime * 0.05

      if (newEvent.timePosition < 0) newEvent.timePosition = 100
      if (newEvent.timePosition > 100) newEvent.timePosition = 0

      newEvent.type = newEvent.timePosition < 33 ? 'past' : newEvent.timePosition > 66 ? 'future' : 'present'
      newEvent.hue = getHueForTime(newEvent.timePosition)

      newEvent.vx *= 0.99
      newEvent.vy *= 0.99

      if (newEvent.x < 0) newEvent.x = dimensions.width
      if (newEvent.x > dimensions.width) newEvent.x = 0
      if (newEvent.y < 0) newEvent.y = dimensions.height
      if (newEvent.y > dimensions.height) newEvent.y = 0

      newEvent.pulsePhase += 0.05 * effectiveTime

      return newEvent
    })

    // Update particles
    const updatedParticles = particlesRef.current
      .map(p => ({
        ...p,
        x: p.x + p.vx * effectiveTime,
        y: p.y + p.vy * effectiveTime,
        life: p.life - 0.02
      }))
      .filter(p => p.life > 0)

    // Update causality links
    const updatedLinks = causalityLinksRef.current.map(link => ({
      ...link,
      age: link.age + Math.abs(effectiveTime)
    }))

    // Batch update refs (no setState in animation loop)
    eventsRef.current = updatedEvents
    particlesRef.current = updatedParticles
    causalityLinksRef.current = updatedLinks

    // Draw causality links
    ctx.globalAlpha = 0.5
    for (const link of updatedLinks) {
      const alpha = Math.max(0, 1 - link.age / 100) * link.strength

      const linkColor = link.paradoxical ? 'hsla(320, 90%, 70%, ' :
                       link.reversed ? 'hsla(270, 80%, 70%, ' :
                       'hsla(200, 70%, 70%, '

      ctx.strokeStyle = linkColor + (alpha * 0.7) + ')'
      ctx.lineWidth = 1 + link.strength * 2

      if (link.paradoxical) {
        ctx.setLineDash([5, 5])
      }

      ctx.beginPath()
      ctx.moveTo(link.from.x, link.from.y)
      ctx.lineTo(link.to.x, link.to.y)
      ctx.stroke()

      ctx.setLineDash([])

      // Draw arrow
      if (alpha > 0.3) {
        const dx = link.to.x - link.from.x
        const dy = link.to.y - link.from.y
        const angle = Math.atan2(dy, dx)
        const midX = link.from.x + dx * 0.5
        const midY = link.from.y + dy * 0.5

        ctx.fillStyle = linkColor + (alpha * 0.8) + ')'
        ctx.save()
        ctx.translate(midX, midY)
        ctx.rotate(angle)
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(-8, -4)
        ctx.lineTo(-8, 4)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
    }

    // Draw particles
    ctx.globalAlpha = 1
    for (const p of updatedParticles) {
      ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.life})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw events
    for (const event of updatedEvents) {
      const pulse = Math.sin(event.pulsePhase) * 0.3 + 0.7
      const size = event.size * pulse

      // Event glow
      ctx.shadowColor = `hsl(${event.hue}, 80%, 70%)`
      ctx.shadowBlur = 15 + event.intensity * 15

      // Outer ring
      const ringHue = event.hue
      ctx.strokeStyle = `hsla(${ringHue}, 70%, 60%, 0.6)`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(event.x, event.y, size * 2, 0, Math.PI * 2)
      ctx.stroke()

      // Event core
      ctx.fillStyle = `hsla(${event.hue}, 80%, 70%, ${event.intensity})`
      ctx.beginPath()
      ctx.arc(event.x, event.y, size, 0, Math.PI * 2)
      ctx.fill()

      // Time position indicator
      ctx.shadowBlur = 5
      const indicatorHue = event.type === 'past' ? 270 :
                          event.type === 'future' ? 40 : 180
      ctx.fillStyle = `hsl(${indicatorHue}, 90%, 80%)`
      ctx.beginPath()
      ctx.arc(event.x, event.y - size - 8, 2, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }, [ctx, dimensions, timeDirection, timeDilation, getHueForTime])

  // Manual animation loop
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

  // Metrics
  const metrics = useMemo(() => {
    const timelineLabel = timelineState === 'linear' ? 'linear' :
                         timelineState === 'reversed' ? 'reversed' :
                         timelineState === 'paradox' ? 'paradoxical' :
                         'dilated'

    const causalityStatus = causalityLinksRef.current.some(l => l.paradoxical) ? 'violated' :
                           timelineState === 'reversed' ? 'inverted' : 'stable'

    const entropyArrow = timeDirection === 1 ? 'forward' :
                        timeDirection === -1 ? 'backward' : 'uncertain'

    return [
      { label: 'timeline', value: timelineLabel },
      { label: 'events', value: eventsRef.current.length },
      { label: 'causality', value: causalityStatus },
      { label: 'entropy', value: entropyArrow }
    ]
  }, [timelineState, timeDirection, events.length])

  const controls = [
    {
      id: 'spawn',
      label: 'spawn()',
      onClick: handleSpawnEvent
    },
    {
      id: 'reverse',
      label: 'reverse()',
      onClick: handleReverseTime,
      active: timeDirection === -1
    },
    {
      id: 'paradox',
      label: 'paradox()',
      onClick: handleCauseParadox
    },
    {
      id: 'dilate',
      label: timeDilation === 1.0 ? 'slow()' : 'restore()',
      onClick: handleToggleTimeDilation,
      active: timeDilation !== 1.0
    },
    {
      id: 'reset',
      label: 'reset()',
      onClick: handleReset,
      variant: 'reset'
    }
  ]

  return (
    <div className={`fixed inset-0 flex flex-col temporal-stage ${timelineState}`}>
      {/* Header */}
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

      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          controls={controls}
        />
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
          {message}
        </p>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="temporal-canvas"
        />

        {/* Event Log */}
        <div className="absolute left-4 bottom-4 max-w-md pointer-events-none">
          <div className="space-y-1">
            {eventLog.map(entry => (
              <div
                key={entry.id}
                className={`text-xs text-void-green/70 font-mono event-entry ${entry.type}`}
              >
                {entry.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TemporalDrift
