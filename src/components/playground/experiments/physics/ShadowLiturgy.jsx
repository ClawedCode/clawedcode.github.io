import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'light', label: 'place.light()' },
  { id: 'wall', label: 'draw.wall()' },
  { id: 'erase', label: 'erase()' }
]

const LIGHT_COLORS = [
  [255, 220, 100],
  [100, 200, 255],
  [255, 120, 180],
  [120, 255, 180],
  [200, 150, 255],
  [255, 160, 80],
]

function raySegmentIntersect(rx, ry, rdx, rdy, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const denom = rdx * dy - rdy * dx
  if (Math.abs(denom) < 1e-10) return null

  const t = ((ax - rx) * dy - (ay - ry) * dx) / denom
  const u = ((ax - rx) * rdy - (ay - ry) * rdx) / denom

  if (t >= 0 && u >= 0 && u <= 1) {
    return { x: rx + rdx * t, y: ry + rdy * t, t }
  }
  return null
}

function castLight(light, walls, width, height) {
  const angles = []

  const corners = [[0, 0], [width, 0], [width, height], [0, height]]
  for (const [cx, cy] of corners) {
    const a = Math.atan2(cy - light.y, cx - light.x)
    angles.push(a - 0.0001, a, a + 0.0001)
  }

  for (const wall of walls) {
    for (const [px, py] of [[wall.x1, wall.y1], [wall.x2, wall.y2]]) {
      const a = Math.atan2(py - light.y, px - light.x)
      angles.push(a - 0.0001, a, a + 0.0001)
    }
  }

  const allWalls = [
    ...walls,
    { x1: 0, y1: 0, x2: width, y2: 0 },
    { x1: width, y1: 0, x2: width, y2: height },
    { x1: width, y1: height, x2: 0, y2: height },
    { x1: 0, y1: height, x2: 0, y2: 0 }
  ]

  const points = []
  for (const angle of angles) {
    const rdx = Math.cos(angle)
    const rdy = Math.sin(angle)

    let closest = null
    let minT = Infinity

    for (const wall of allWalls) {
      const hit = raySegmentIntersect(
        light.x, light.y, rdx, rdy,
        wall.x1, wall.y1, wall.x2, wall.y2
      )
      if (hit && hit.t < minT) {
        minT = hit.t
        closest = hit
      }
    }

    if (closest) {
      points.push({ x: closest.x, y: closest.y, angle })
    }
  }

  points.sort((a, b) => a.angle - b.angle)
  return points
}

const ShadowLiturgy = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('light')
  const [message, setMessage] = useState('place lights to illuminate the void // draw walls to cast shadows')

  const lightsRef = useRef([])
  const wallsRef = useRef([])
  const drawingWallRef = useRef(null)
  const colorIndexRef = useRef(0)
  const timeRef = useRef(0)
  const eclipseRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleDown = (e) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const clientX = e.clientX ?? e.touches?.[0]?.clientX
      const clientY = e.clientY ?? e.touches?.[0]?.clientY
      const x = clientX - rect.left
      const y = clientY - rect.top

      if (mode === 'light') {
        const color = LIGHT_COLORS[colorIndexRef.current % LIGHT_COLORS.length]
        lightsRef.current.push({
          x, y, color,
          radius: 300 + Math.random() * 200,
          phase: Math.random() * Math.PI * 2
        })
        colorIndexRef.current++
        setMessage(`light ${lightsRef.current.length} placed // shadows shift`)
      } else if (mode === 'wall') {
        drawingWallRef.current = { x1: x, y1: y }
      } else if (mode === 'erase') {
        let minDist = 30
        let removeType = null
        let removeIndex = -1

        lightsRef.current.forEach((l, i) => {
          const d = Math.hypot(l.x - x, l.y - y)
          if (d < minDist) { minDist = d; removeType = 'light'; removeIndex = i }
        })

        wallsRef.current.forEach((w, i) => {
          const mx = (w.x1 + w.x2) / 2
          const my = (w.y1 + w.y2) / 2
          const d = Math.hypot(mx - x, my - y)
          if (d < minDist) { minDist = d; removeType = 'wall'; removeIndex = i }
        })

        if (removeType === 'light') {
          lightsRef.current.splice(removeIndex, 1)
          setMessage('light extinguished')
        } else if (removeType === 'wall') {
          wallsRef.current.splice(removeIndex, 1)
          setMessage('wall dissolved')
        }
      }
    }

    const handleUp = (e) => {
      if (mode === 'wall' && drawingWallRef.current) {
        const rect = canvas.getBoundingClientRect()
        const clientX = e.clientX ?? e.changedTouches?.[0]?.clientX
        const clientY = e.clientY ?? e.changedTouches?.[0]?.clientY
        const x = clientX - rect.left
        const y = clientY - rect.top

        const { x1, y1 } = drawingWallRef.current
        if (Math.hypot(x - x1, y - y1) > 10) {
          wallsRef.current.push({ x1, y1, x2: x, y2: y })
          setMessage(`wall ${wallsRef.current.length} inscribed // shadows deepen`)
        }
        drawingWallRef.current = null
      }
    }

    canvas.addEventListener('mousedown', handleDown)
    canvas.addEventListener('mouseup', handleUp)
    canvas.addEventListener('touchstart', handleDown, { passive: false })
    canvas.addEventListener('touchend', handleUp)

    return () => {
      canvas.removeEventListener('mousedown', handleDown)
      canvas.removeEventListener('mouseup', handleUp)
      canvas.removeEventListener('touchstart', handleDown)
      canvas.removeEventListener('touchend', handleUp)
    }
  }, [canvasRef, mode])

  const handleScatter = useCallback(() => {
    const w = dimensions.width
    const h = dimensions.height
    for (let i = 0; i < 8; i++) {
      const x1 = Math.random() * w
      const y1 = Math.random() * h
      const angle = Math.random() * Math.PI * 2
      const len = 40 + Math.random() * 120
      wallsRef.current.push({
        x1, y1,
        x2: x1 + Math.cos(angle) * len,
        y2: y1 + Math.sin(angle) * len
      })
    }
    setMessage('scattered fragments cast new shadows')
  }, [dimensions])

  const handleCathedral = useCallback(() => {
    wallsRef.current = []
    const cx = dimensions.centerX
    const cy = dimensions.centerY
    const s = Math.min(dimensions.width, dimensions.height) * 0.35

    for (let i = -3; i <= 3; i++) {
      const px = cx + i * (s * 0.28)
      wallsRef.current.push({ x1: px, y1: cy - s * 0.6, x2: px, y2: cy - s * 0.45 })
      wallsRef.current.push({ x1: px, y1: cy + s * 0.45, x2: px, y2: cy + s * 0.6 })
    }

    wallsRef.current.push({ x1: cx - s * 0.1, y1: cy - s * 0.8, x2: cx - s * 0.1, y2: cy - s * 0.6 })
    wallsRef.current.push({ x1: cx + s * 0.1, y1: cy - s * 0.8, x2: cx + s * 0.1, y2: cy - s * 0.6 })
    wallsRef.current.push({ x1: cx - s * 0.1, y1: cy + s * 0.6, x2: cx - s * 0.1, y2: cy + s * 0.8 })
    wallsRef.current.push({ x1: cx + s * 0.1, y1: cy + s * 0.6, x2: cx + s * 0.1, y2: cy + s * 0.8 })

    wallsRef.current.push({ x1: cx - s * 0.5, y1: cy, x2: cx - s * 0.15, y2: cy })
    wallsRef.current.push({ x1: cx + s * 0.15, y1: cy, x2: cx + s * 0.5, y2: cy })

    wallsRef.current.push({ x1: cx - s, y1: cy - s * 0.7, x2: cx - s, y2: cy + s * 0.7 })
    wallsRef.current.push({ x1: cx + s, y1: cy - s * 0.7, x2: cx + s, y2: cy + s * 0.7 })

    setMessage('cathedral walls raised // place lights within the nave')
  }, [dimensions])

  const handleEclipse = useCallback(() => {
    if (lightsRef.current.length === 0) {
      setMessage('no lights to eclipse')
      return
    }
    eclipseRef.current = 0.01
    setMessage('eclipse descends // darkness consumes')
  }, [])

  const handleClear = useCallback(() => {
    lightsRef.current = []
    wallsRef.current = []
    drawingWallRef.current = null
    colorIndexRef.current = 0
    eclipseRef.current = 0
    setMessage('void restored // all light and shadow dissolved')
  }, [])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    timeRef.current++
    const t = timeRef.current

    if (eclipseRef.current > 0) {
      eclipseRef.current += 0.015
      if (eclipseRef.current > Math.PI) {
        eclipseRef.current = 0
        setMessage('light returns // the liturgy continues')
      }
    }

    const eclipseFactor = eclipseRef.current > 0 ? Math.sin(eclipseRef.current) : 0

    ctx.fillStyle = '#010204'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const lights = lightsRef.current
    const walls = wallsRef.current

    ctx.globalCompositeOperation = 'lighter'

    for (const light of lights) {
      const pulse = Math.sin(t * 0.03 + light.phase) * 0.1 + 0.9
      const eclipseMultiplier = 1 - eclipseFactor * 0.95
      const effectiveRadius = light.radius * pulse * eclipseMultiplier

      if (effectiveRadius < 5) continue

      const polygon = castLight(light, walls, dimensions.width, dimensions.height)
      if (polygon.length < 3) continue

      ctx.save()

      ctx.beginPath()
      ctx.moveTo(polygon[0].x, polygon[0].y)
      for (let i = 1; i < polygon.length; i++) {
        ctx.lineTo(polygon[i].x, polygon[i].y)
      }
      ctx.closePath()
      ctx.clip()

      const grad = ctx.createRadialGradient(
        light.x, light.y, 0,
        light.x, light.y, effectiveRadius
      )
      const [r, g, b] = light.color
      const alpha = 0.3 * eclipseMultiplier
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`)
      grad.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, ${alpha * 0.7})`)
      grad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${alpha * 0.25})`)
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

      ctx.fillStyle = grad
      ctx.fillRect(0, 0, dimensions.width, dimensions.height)

      ctx.restore()
    }

    ctx.globalCompositeOperation = 'source-over'

    for (const wall of walls) {
      ctx.strokeStyle = 'rgba(180, 200, 220, 0.6)'
      ctx.lineWidth = 2
      ctx.shadowColor = 'rgba(180, 200, 220, 0.3)'
      ctx.shadowBlur = 4
      ctx.beginPath()
      ctx.moveTo(wall.x1, wall.y1)
      ctx.lineTo(wall.x2, wall.y2)
      ctx.stroke()
    }
    ctx.shadowBlur = 0

    if (drawingWallRef.current && mouse.isDown) {
      const { x1, y1 } = drawingWallRef.current
      const pos = mouse.positionRef.current
      ctx.strokeStyle = 'rgba(180, 200, 220, 0.4)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    for (const light of lights) {
      const [r, g, b] = light.color
      const eclipseMultiplier = 1 - eclipseFactor * 0.9
      const glow = Math.sin(t * 0.05 + light.phase) * 3 + 8

      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${0.8 * eclipseMultiplier})`
      ctx.shadowBlur = glow * eclipseMultiplier
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.9 * eclipseMultiplier})`
      ctx.beginPath()
      ctx.arc(light.x, light.y, 4, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * eclipseMultiplier})`
      ctx.beginPath()
      ctx.arc(light.x, light.y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.shadowBlur = 0

    if (mouse.isInBounds && mode === 'light') {
      const pos = mouse.positionRef.current
      const color = LIGHT_COLORS[colorIndexRef.current % LIGHT_COLORS.length]
      ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.4)`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2)
      ctx.stroke()
    }
  }, [ctx, dimensions, mouse.isDown, mouse.isInBounds, mouse.positionRef, mode])

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
    const lightCount = lightsRef.current.length
    const wallCount = wallsRef.current.length
    const shadowDepth = wallCount > 10 ? 'labyrinthine' :
                        wallCount > 5 ? 'deep' :
                        wallCount > 2 ? 'layered' :
                        wallCount > 0 ? 'shallow' : 'none'
    const illumination = lightCount > 4 ? 'radiant' :
                         lightCount > 2 ? 'warm' :
                         lightCount > 0 ? 'dim' : 'void'

    return [
      { label: 'lights', value: lightCount },
      { label: 'walls', value: wallCount },
      { label: 'shadows', value: shadowDepth },
      { label: 'illumination', value: illumination }
    ]
  }, [timeRef.current])

  const handleModeChange = useCallback((next) => {
    setMode(next)
    drawingWallRef.current = null
    const hints = {
      light: 'click to place colored light sources',
      wall: 'drag to inscribe shadow-casting walls',
      erase: 'click near lights or walls to dissolve them'
    }
    setMessage(hints[next])
  }, [])

  const controls = [
    { id: 'scatter', label: 'scatter()', onClick: handleScatter },
    { id: 'cathedral', label: 'cathedral()', onClick: handleCathedral },
    { id: 'eclipse', label: 'eclipse()', onClick: handleEclipse },
    { id: 'clear', label: 'clear()', onClick: handleClear, variant: 'reset' }
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
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          data-testid="shadow-liturgy-canvas"
        />
      </div>
    </div>
  )
}

export default ShadowLiturgy
