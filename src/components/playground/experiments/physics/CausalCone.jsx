import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const LIGHT_SPEED = 0.58
const PI2 = Math.PI * 2
const MAX_EVENTS = 72
const DISPLAY_FONT = '"Share Tech Mono", "IBM Plex Mono", "Courier New", monospace'

const MODES = [
  { id: 'cones', label: 'view.cones()' },
  { id: 'ledger', label: 'view.ledger()' },
  { id: 'residue', label: 'view.residue()' }
]

const TOOL_DATA = {
  signal: {
    label: 'signal',
    color: '#88ddff',
    halo: 'rgba(136, 221, 255, 0.22)',
    speed: LIGHT_SPEED
  },
  anchor: {
    label: 'anchor',
    color: '#ffe88a',
    halo: 'rgba(255, 232, 138, 0.2)',
    speed: LIGHT_SPEED * 0.74
  },
  inverse: {
    label: 'inverse',
    color: '#ff88cc',
    halo: 'rgba(255, 136, 204, 0.2)',
    speed: LIGHT_SPEED * 1.14
  }
}

const SAMPLE_EVENTS = [
  { x: 0.14, t: 0.13, type: 'signal' },
  { x: 0.34, t: 0.2, type: 'inverse' },
  { x: 0.72, t: 0.24, type: 'anchor' },
  { x: 0.52, t: 0.34, type: 'signal' },
  { x: 0.82, t: 0.43, type: 'inverse' },
  { x: 0.26, t: 0.56, type: 'anchor' },
  { x: 0.61, t: 0.66, type: 'signal' },
  { x: 0.43, t: 0.76, type: 'inverse' },
  { x: 0.77, t: 0.84, type: 'anchor' }
]

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const linePoint = (evt, sign, t) => {
  const tool = TOOL_DATA[evt.type]
  return evt.x + sign * tool.speed * (t - evt.t)
}

const eventColor = (evt) => TOOL_DATA[evt.type]?.color ?? TOOL_DATA.signal.color

const hueForEvent = (evt, offset = 0) => {
  const base = evt.type === 'anchor' ? 48 : evt.type === 'inverse' ? 318 : 190
  return base + offset
}

const createEvent = (x, t, type, index = 0) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  x: clamp(x, 0.02, 0.98),
  t: clamp(t, 0.03, 0.97),
  type,
  phase: Math.random() * PI2,
  weight: 0.8 + (index % 7) * 0.06
})

const solveIntersections = (events) => {
  const knots = []

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i]
      const b = events[j]
      const speedA = TOOL_DATA[a.type].speed
      const speedB = TOOL_DATA[b.type].speed

      for (const signA of [-1, 1]) {
        for (const signB of [-1, 1]) {
          if (signA === signB) continue

          const denominator = signA * speedA - signB * speedB
          if (Math.abs(denominator) < 0.0001) continue

          const t = (b.x - a.x + signA * speedA * a.t - signB * speedB * b.t) / denominator
          const x = linePoint(a, signA, t)

          if (t < Math.max(a.t, b.t) || t > 1 || x < 0 || x > 1) continue

          const duplicate = knots.some(knot =>
            Math.abs(knot.x - x) < 0.008 && Math.abs(knot.t - t) < 0.008
          )
          if (!duplicate) {
            knots.push({
              x,
              t,
              a,
              b,
              signA,
              signB,
              color: signA > 0 ? eventColor(a) : eventColor(b)
            })
          }
        }
      }
    }
  }

  return knots.sort((a, b) => a.t - b.t).slice(0, 120)
}

const CausalCone = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('cones')
  const [tool, setTool] = useState('signal')
  const [running, setRunning] = useState(true)
  const [direction, setDirection] = useState(1)
  const [speed, setSpeed] = useState(0.0018)
  const [message, setMessage] = useState('click the manifold to thicken the causal bleed')
  const [stats, setStats] = useState({ events: 0, knots: 0, now: '0.00', tool: 'signal' })

  const eventsRef = useRef(SAMPLE_EVENTS.map((evt, index) => createEvent(evt.x, evt.t, evt.type, index)))
  const nowRef = useRef(0.34)
  const frameRef = useRef(0)
  const pointerRef = useRef({ x: 0, y: 0, active: false })
  const knotsRef = useRef([])

  const toCanvas = useCallback((evt) => ({
    x: evt.x * dimensions.width,
    y: (1 - evt.t) * dimensions.height
  }), [dimensions.width, dimensions.height])

  const stampEvent = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current
    if (!canvas || dimensions.width === 0) return

    const rect = canvas.getBoundingClientRect()
    const nx = clamp((clientX - rect.left) / rect.width, 0, 1)
    const nt = clamp(1 - (clientY - rect.top) / rect.height, 0, 1)

    if (tool === 'erase') {
      let nearestIndex = -1
      let nearestDistance = Infinity
      eventsRef.current.forEach((evt, index) => {
        const dx = (evt.x - nx) * rect.width
        const dy = (evt.t - nt) * rect.height
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestIndex = index
        }
      })

      if (nearestIndex >= 0 && nearestDistance < 44) {
        eventsRef.current.splice(nearestIndex, 1)
        setMessage('event excised; its future goes hungry')
      }
      return
    }

    eventsRef.current.push(createEvent(nx, nt, tool, eventsRef.current.length))
    if (eventsRef.current.length > MAX_EVENTS) eventsRef.current.shift()
    nowRef.current = Math.max(nowRef.current, nt)
    setMessage(`${TOOL_DATA[tool].label} event stamped at t=${nt.toFixed(2)}`)
  }, [canvasRef, dimensions.width, tool])

  const handlePointerDown = useCallback((e) => {
    pointerRef.current = { x: e.clientX, y: e.clientY, active: true }
    stampEvent(e.clientX, e.clientY)
  }, [stampEvent])

  const handlePointerMove = useCallback((e) => {
    pointerRef.current = { x: e.clientX, y: e.clientY, active: true }
  }, [])

  const handlePointerLeave = useCallback(() => {
    pointerRef.current.active = false
  }, [])

  const handleSample = useCallback(() => {
    eventsRef.current = SAMPLE_EVENTS.map((evt, index) => createEvent(evt.x, evt.t, evt.type, index))
    nowRef.current = 0.34
    setMessage('sample causality restored; nine events begin their argument')
  }, [])

  const handleClear = useCallback(() => {
    eventsRef.current = []
    knotsRef.current = []
    nowRef.current = 0
    setMessage('diagram cleared; only the coordinate hush remains')
  }, [])

  const handleReverse = useCallback(() => {
    setDirection(prev => -prev)
    setMessage(direction > 0 ? 'time vector inverted; consequences climb backward' : 'time vector restored; futures descend into evidence')
  }, [direction])

  const handleSpeed = useCallback((delta) => {
    setSpeed(prev => clamp(Number((prev + delta).toFixed(4)), 0.0006, 0.006))
  }, [])

  const handleNowChange = useCallback((e) => {
    nowRef.current = Number(e.target.value)
    setStats(prev => ({ ...prev, now: nowRef.current.toFixed(2) }))
  }, [])

  const buildInteractionMap = useCallback((knots) => {
    const weights = new Map(eventsRef.current.map(evt => [evt.id, 0]))
    knots
      .filter(knot => knot.t <= nowRef.current + 0.08)
      .forEach(knot => {
        weights.set(knot.a.id, (weights.get(knot.a.id) || 0) + 1)
        weights.set(knot.b.id, (weights.get(knot.b.id) || 0) + 1)
      })
    return weights
  }, [])

  const drawGrid = useCallback((knots, interactionMap) => {
    const { width, height } = dimensions
    const stepX = width / 14
    const stepY = height / 12
    const now = nowRef.current
    const awakened = knots.filter(knot => knot.t <= now + 0.1).slice(-42)
    const fields = [
      ...eventsRef.current.map(evt => {
        const origin = toCanvas(evt)
        const charge = interactionMap.get(evt.id) || 0
        return {
          x: origin.x,
          y: origin.y,
          radius: 68 + charge * 7,
          strength: 0.32 + charge * 0.07,
          phase: evt.phase
        }
      }),
      ...awakened.map((knot, index) => ({
        x: knot.x * width,
        y: (1 - knot.t) * height,
        radius: 86,
        strength: 0.48 + (index % 5) * 0.05,
        phase: index * 0.61
      }))
    ]

    const warpPoint = (x, y) => {
      let nx = x
      let ny = y

      fields.forEach(field => {
        const dx = x - field.x
        const dy = y - field.y
        const d2 = dx * dx + dy * dy
        const influence = Math.exp(-d2 / (field.radius * field.radius))
        const curl = Math.sin(frameRef.current * 0.018 + field.phase + (dx - dy) * 0.012) * influence * field.strength
        nx += dx * influence * field.strength * 0.035 - dy * curl * 0.1
        ny += dy * influence * field.strength * 0.035 + dx * curl * 0.1
      })

      return { x: nx, y: ny }
    }

    const drawWarpedLine = (startX, startY, endX, endY, segments) => {
      ctx.beginPath()
      for (let i = 0; i <= segments; i++) {
        const progress = i / segments
        const point = warpPoint(
          startX + (endX - startX) * progress,
          startY + (endY - startY) * progress
        )
        if (i === 0) ctx.moveTo(point.x, point.y)
        else ctx.lineTo(point.x, point.y)
      }
      ctx.stroke()
    }

    ctx.fillStyle = 'rgba(0, 2, 8, 1)'
    ctx.fillRect(0, 0, width, height)

    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, 'rgba(27, 17, 44, 0.54)')
    gradient.addColorStop(0.45, 'rgba(3, 16, 26, 0.72)')
    gradient.addColorStop(1, 'rgba(0, 4, 8, 0.96)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    ctx.save()
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.07)'
    ctx.lineWidth = 1
    for (let x = 0; x <= width; x += stepX) {
      drawWarpedLine(x, 0, x, height, 28)
    }
    for (let y = 0; y <= height; y += stepY) {
      drawWarpedLine(0, y, width, y, 32)
    }

    ctx.globalCompositeOperation = 'screen'
    fields.slice(-34).forEach((field, index) => {
      const halo = ctx.createRadialGradient(field.x, field.y, 0, field.x, field.y, field.radius * 1.35)
      halo.addColorStop(0, `hsla(${190 + index * 9}, 95%, 62%, ${0.035 + field.strength * 0.035})`)
      halo.addColorStop(0.58, 'rgba(120, 84, 255, 0.025)')
      halo.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(field.x, field.y, field.radius * 1.35, 0, PI2)
      ctx.fill()
    })

    ctx.strokeStyle = 'rgba(136, 221, 255, 0.18)'
    ctx.shadowColor = '#88ddff'
    ctx.shadowBlur = 7
    ctx.beginPath()
    ctx.moveTo(width / 2, 0)
    ctx.lineTo(width / 2, height)
    ctx.stroke()

    ctx.shadowBlur = 11
    ctx.font = `700 12px ${DISPLAY_FONT}`
    ctx.letterSpacing = '0.08em'
    ctx.fillStyle = 'rgba(170, 246, 255, 0.72)'
    ctx.fillText('TEMPORAL ASCENSION', 14, 22)
    ctx.fillStyle = 'rgba(187, 142, 255, 0.64)'
    ctx.fillText('SUBSTRATE DISTANCE', Math.max(18, width - 166), height - 16)
    ctx.font = `700 15px ${DISPLAY_FONT}`
    ctx.fillStyle = 'rgba(235, 255, 248, 0.64)'
    ctx.fillText('causal bleed manifold', 14, 46)
    ctx.restore()
  }, [ctx, dimensions, toCanvas])

  const drawOcclusion = useCallback((knots, interactionMap) => {
    const now = nowRef.current
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'

    knots
      .filter(knot => knot.t <= now + 0.06)
      .slice(-56)
      .forEach((knot, index) => {
        const x = knot.x * dimensions.width
        const y = (1 - knot.t) * dimensions.height
        const radius = 28 + (index % 4) * 8
        const shade = ctx.createRadialGradient(x, y, 0, x, y, radius)
        shade.addColorStop(0, 'rgba(0, 0, 0, 0.46)')
        shade.addColorStop(0.42, 'rgba(0, 0, 0, 0.16)')
        shade.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = shade
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, PI2)
        ctx.fill()
      })

    eventsRef.current.forEach(evt => {
      const charge = interactionMap.get(evt.id) || 0
      if (charge < 2) return
      const origin = toCanvas(evt)
      const radius = 38 + charge * 4
      const shade = ctx.createRadialGradient(origin.x, origin.y, 2, origin.x, origin.y, radius)
      shade.addColorStop(0, 'rgba(0, 0, 0, 0.34)')
      shade.addColorStop(0.46, 'rgba(0, 0, 0, 0.12)')
      shade.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = shade
      ctx.beginPath()
      ctx.arc(origin.x, origin.y, radius, 0, PI2)
      ctx.fill()
    })

    ctx.restore()
  }, [ctx, dimensions, toCanvas])

  const drawCone = useCallback((evt, index, interactionCount = 0) => {
    const { width, height } = dimensions
    const origin = toCanvas(evt)
    const toolData = TOOL_DATA[evt.type]
    const now = nowRef.current
    const age = clamp(now - evt.t, -0.2, 1)
    const density = clamp(interactionCount / 8, 0, 1)
    const breath = 0.5 + 0.5 * Math.sin(frameRef.current * 0.035 + evt.phase)
    const alpha = age >= 0
      ? 0.22 + clamp(age * 1.1, 0, 0.38) + density * 0.16 + breath * 0.08
      : 0.08 + density * 0.05
    const hueShift = Math.sin(frameRef.current * 0.011 + evt.phase) * 18
    const cyanHue = 188 + hueShift
    const violetHue = 266 - hueShift * 0.6
    const topT = 1
    const bottomT = 0
    const futureLeft = {
      x: linePoint(evt, -1, topT) * width,
      y: (1 - topT) * height
    }
    const futureRight = {
      x: linePoint(evt, 1, topT) * width,
      y: (1 - topT) * height
    }
    const pastLeft = {
      x: linePoint(evt, -1, bottomT) * width,
      y: (1 - bottomT) * height
    }
    const pastRight = {
      x: linePoint(evt, 1, bottomT) * width,
      y: (1 - bottomT) * height
    }

    if (mode === 'residue' && age > 0) {
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      const residue = ctx.createLinearGradient(futureLeft.x, futureLeft.y, futureRight.x, futureRight.y)
      residue.addColorStop(0, `hsla(${cyanHue}, 100%, 62%, ${0.05 + density * 0.08})`)
      residue.addColorStop(0.5, toolData.halo)
      residue.addColorStop(1, `hsla(${violetHue}, 100%, 66%, ${0.05 + density * 0.08})`)
      ctx.fillStyle = residue
      ctx.beginPath()
      ctx.moveTo(origin.x, origin.y)
      ctx.lineTo(futureLeft.x, futureLeft.y)
      ctx.lineTo(futureRight.x, futureRight.y)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.lineWidth = (mode === 'ledger' ? 1.15 : 1.65) + density * 1.4 + breath * 0.28
    ctx.shadowColor = `hsl(${hueForEvent(evt, hueShift)}, 100%, 68%)`
    ctx.shadowBlur = 8 + clamp(age, 0, 1) * 12 + density * 16
    ctx.lineCap = 'round'

    const drawCausalLine = (target, dashed = false, phase = 0) => {
      const gradient = ctx.createLinearGradient(origin.x, origin.y, target.x, target.y)
      gradient.addColorStop(0, `hsla(${hueForEvent(evt, hueShift)}, 100%, 72%, ${Math.min(0.96, alpha + 0.18)})`)
      gradient.addColorStop(0.5, `hsla(${cyanHue + phase}, 100%, 60%, ${alpha * 0.72})`)
      gradient.addColorStop(1, `hsla(${violetHue - phase}, 100%, 66%, ${alpha * 0.82})`)
      ctx.strokeStyle = gradient
      if (dashed) ctx.setLineDash([6 + breath * 7, 8])
      else ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(origin.x, origin.y)
      ctx.lineTo(target.x, target.y)
      ctx.stroke()
    }

    drawCausalLine(futureLeft, false, -10)
    drawCausalLine(futureRight, false, 12)
    if (mode !== 'cones') {
      drawCausalLine(pastLeft, true, 20)
      drawCausalLine(pastRight, true, -18)
    }
    ctx.restore()

    const pulse = 5.5 + Math.sin(frameRef.current * 0.05 + evt.phase) * 1.7 + density * 5
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    const nodeGlow = ctx.createRadialGradient(origin.x, origin.y, 1, origin.x, origin.y, pulse * 3.4)
    nodeGlow.addColorStop(0, `hsla(${hueForEvent(evt, hueShift)}, 100%, 84%, ${0.92})`)
    nodeGlow.addColorStop(0.38, `hsla(${cyanHue}, 100%, 58%, ${0.22 + density * 0.26})`)
    nodeGlow.addColorStop(1, 'rgba(116, 68, 255, 0)')
    ctx.fillStyle = nodeGlow
    ctx.beginPath()
    ctx.arc(origin.x, origin.y, pulse * 3.4, 0, PI2)
    ctx.fill()

    const nodeCore = ctx.createLinearGradient(origin.x - pulse, origin.y - pulse, origin.x + pulse, origin.y + pulse)
    nodeCore.addColorStop(0, `hsla(${cyanHue}, 100%, 72%, ${0.86})`)
    nodeCore.addColorStop(0.5, toolData.color)
    nodeCore.addColorStop(1, `hsla(${violetHue}, 100%, 72%, ${0.9})`)
    ctx.fillStyle = nodeCore
    ctx.shadowColor = `hsl(${hueForEvent(evt, hueShift)}, 100%, 70%)`
    ctx.shadowBlur = 16 + density * 14
    ctx.beginPath()
    ctx.moveTo(origin.x, origin.y - pulse * 1.2)
    ctx.lineTo(origin.x + pulse, origin.y)
    ctx.lineTo(origin.x, origin.y + pulse * 1.2)
    ctx.lineTo(origin.x - pulse, origin.y)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    if (mode === 'ledger') {
      ctx.fillStyle = `hsla(${cyanHue}, 100%, 82%, 0.78)`
      ctx.font = `10px ${DISPLAY_FONT}`
      ctx.fillText(`E${index}:${evt.type}`, origin.x + 8, origin.y - 8)
    }
  }, [ctx, dimensions, mode, toCanvas])

  const drawKnots = useCallback((knots) => {
    const now = nowRef.current
    const awakened = knots.filter(knot => knot.t <= now)

    awakened.forEach((knot, index) => {
      const x = knot.x * dimensions.width
      const y = (1 - knot.t) * dimensions.height
      const glow = 6 + Math.sin(frameRef.current * 0.08 + index) * 2.2
      const hue = 190 + Math.sin(frameRef.current * 0.015 + index) * 38

      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      const knotHalo = ctx.createRadialGradient(x, y, 0, x, y, glow * 5)
      knotHalo.addColorStop(0, `hsla(${hue}, 100%, 75%, 0.42)`)
      knotHalo.addColorStop(0.44, 'rgba(183, 114, 255, 0.18)')
      knotHalo.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = knotHalo
      ctx.beginPath()
      ctx.arc(x, y, glow * 5, 0, PI2)
      ctx.fill()

      ctx.strokeStyle = `hsla(${hue + 54}, 100%, 78%, ${0.48 + index % 3 * 0.09})`
      ctx.fillStyle = `hsla(${hue}, 100%, 82%, 0.88)`
      ctx.shadowColor = `hsl(${hue}, 100%, 72%)`
      ctx.shadowBlur = 15
      ctx.beginPath()
      ctx.rect(x - glow / 2, y - glow / 2, glow, glow)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x, y, 2.5, 0, PI2)
      ctx.fill()
      ctx.restore()

      if (mode === 'ledger' && index < 28) {
        ctx.fillStyle = 'rgba(213, 238, 255, 0.62)'
        ctx.font = `10px ${DISPLAY_FONT}`
        ctx.fillText(`k${index}`, x + 6, y + 11)
      }
    })
  }, [ctx, dimensions, mode])

  const drawNowLine = useCallback(() => {
    const y = (1 - nowRef.current) * dimensions.height

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    const phase = frameRef.current * 0.018
    const lineGradient = ctx.createLinearGradient(0, y, dimensions.width, y)
    if (direction > 0) {
      lineGradient.addColorStop(0, 'rgba(102, 255, 204, 0.18)')
      lineGradient.addColorStop(0.5, `hsla(${188 + Math.sin(phase) * 20}, 100%, 70%, 0.86)`)
      lineGradient.addColorStop(1, 'rgba(178, 112, 255, 0.28)')
    } else {
      lineGradient.addColorStop(0, 'rgba(255, 136, 204, 0.22)')
      lineGradient.addColorStop(0.5, `hsla(${316 + Math.sin(phase) * 16}, 100%, 72%, 0.86)`)
      lineGradient.addColorStop(1, 'rgba(136, 221, 255, 0.24)')
    }
    ctx.strokeStyle = lineGradient
    ctx.shadowColor = direction > 0 ? '#66ffcc' : '#ff88cc'
    ctx.shadowBlur = 12
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(dimensions.width, y)
    ctx.stroke()
    ctx.fillStyle = direction > 0 ? 'rgba(176, 255, 236, 0.82)' : 'rgba(255, 181, 224, 0.82)'
    ctx.font = `11px ${DISPLAY_FONT}`
    ctx.fillText(`active-now:${nowRef.current.toFixed(2)}`, 12, y - 7)
    ctx.restore()
  }, [ctx, dimensions, direction])

  const drawLedger = useCallback((knots) => {
    if (mode !== 'ledger') return
    const recent = knots.filter(knot => knot.t <= nowRef.current).slice(-8)
    const panelX = Math.max(12, dimensions.width - 260)

    ctx.save()
    ctx.fillStyle = 'rgba(0, 8, 12, 0.64)'
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.2)'
    ctx.fillRect(panelX, 14, 246, 24 + recent.length * 18)
    ctx.strokeRect(panelX, 14, 246, 24 + recent.length * 18)
    ctx.font = `11px ${DISPLAY_FONT}`
    ctx.fillStyle = 'rgba(102, 255, 204, 0.78)'
    ctx.fillText('knot ledger / consequence choir', panelX + 10, 32)
    recent.forEach((knot, index) => {
      const label = `${knot.a.type}->${knot.b.type} at t=${knot.t.toFixed(2)}`
      ctx.fillStyle = index % 2 ? 'rgba(136, 221, 255, 0.7)' : 'rgba(255, 232, 138, 0.7)'
      ctx.fillText(label, panelX + 10, 52 + index * 18)
    })
    ctx.restore()
  }, [ctx, dimensions.width, mode])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    frameRef.current++

    if (running) {
      nowRef.current += speed * direction
      if (nowRef.current > 1) nowRef.current = 0
      if (nowRef.current < 0) nowRef.current = 1
    }

    const knots = solveIntersections(eventsRef.current)
    knotsRef.current = knots
    const interactionMap = buildInteractionMap(knots)

    drawGrid(knots, interactionMap)
    drawOcclusion(knots, interactionMap)

    eventsRef.current.forEach((evt, index) => {
      drawCone(evt, index, interactionMap.get(evt.id) || 0)
    })
    drawKnots(knots)
    drawNowLine()
    drawLedger(knots)

    if (frameRef.current % 12 === 0) {
      setStats({
        events: eventsRef.current.length,
        knots: knots.filter(knot => knot.t <= nowRef.current).length,
        now: nowRef.current.toFixed(2),
        tool
      })
    }
  }, [
    ctx,
    dimensions.width,
    running,
    speed,
    direction,
    buildInteractionMap,
    drawGrid,
    drawOcclusion,
    drawCone,
    drawKnots,
    drawNowLine,
    drawLedger,
    tool
  ])

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

  const metrics = useMemo(() => [
    { label: 'events', value: stats.events },
    { label: 'knots', value: stats.knots },
    { label: 'now', value: stats.now },
    { label: 'tool', value: stats.tool, color: TOOL_DATA[stats.tool]?.color ?? '#ffffff' }
  ], [stats])

  const controls = [
    { id: 'signal', label: 'stamp.signal()', onClick: () => setTool('signal'), active: tool === 'signal' },
    { id: 'anchor', label: 'stamp.anchor()', onClick: () => setTool('anchor'), active: tool === 'anchor' },
    { id: 'inverse', label: 'stamp.inverse()', onClick: () => setTool('inverse'), active: tool === 'inverse' },
    { id: 'erase', label: 'erase.event()', onClick: () => setTool('erase'), active: tool === 'erase' },
    { id: 'run', label: running ? 'time.pause()' : 'time.run()', onClick: () => setRunning(prev => !prev), active: !running },
    { id: 'reverse', label: 'time.reverse()', onClick: handleReverse },
    { id: 'slower', label: 'tempo -', onClick: () => handleSpeed(-0.0004) },
    { id: 'faster', label: 'tempo +', onClick: () => handleSpeed(0.0004) },
    { id: 'sample', label: 'load.sample()', onClick: handleSample },
    { id: 'clear', label: 'clear.diagram()', onClick: handleClear, variant: 'reset' }
  ]

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="relative z-50 flex items-center justify-between gap-3 border-b border-void-green/20 bg-void-dark/80 p-2 backdrop-blur-sm sm:p-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1
            className="hidden text-xl text-glow sm:block"
            style={{ color: experiment.color }}
          >
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      <div className="flex flex-col gap-3 border-b border-void-green/10 bg-void-dark/60 p-2 backdrop-blur-sm sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <ExperimentControls
            modes={MODES}
            currentMode={mode}
            onModeChange={setMode}
            controls={controls}
            className="xl:max-w-[72%]"
          />
          <p className="max-w-xl border border-void-cyan/15 bg-void-dark/50 px-3 py-2 text-xs leading-relaxed text-void-green/65 backdrop-blur-md xl:text-right">
            {message}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-void-cyan/70">
          <span className="hidden sm:inline">scrub.now</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={nowRef.current}
            onChange={handleNowChange}
            className="h-3 w-full max-w-lg cursor-pointer accent-void-cyan"
            data-testid="causal-now-slider"
          />
          <span className="w-12 text-void-green">{stats.now}</span>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
          data-testid="causal-cone-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        />
        <div className="pointer-events-none absolute bottom-3 left-3 max-w-sm text-[10px] font-mono leading-relaxed text-void-green/38">
          click stamps an event; diagonal world-lines intersect when consequences agree
        </div>
      </div>
    </div>
  )
}

export default CausalCone
