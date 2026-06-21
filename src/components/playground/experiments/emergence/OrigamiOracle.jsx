import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const TAU = Math.PI * 2
const MAX_CREASES = 18

const MODES = [
  { id: 'valley', label: 'valley()' },
  { id: 'mountain', label: 'mountain()' },
  { id: 'erase', label: 'erase()' }
]

const MODE_MESSAGES = {
  valley: '∴ draw a cool incision across the sheet // the page sinks and answers ∴',
  mountain: '∴ draw a ridge into the paper // the page rises like held breath ∴',
  erase: '∴ touch an old crease to release its tension back into silence ∴'
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const distanceToSegment = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy

  if (lenSq === 0) return Math.hypot(px - ax, py - ay)

  const t = clamp(((px - ax) * dx + (py - ay) * dy) / lenSq, 0, 1)
  const nx = ax + dx * t
  const ny = ay + dy * t
  return Math.hypot(px - nx, py - ny)
}

const projectPoint = (baseX, baseY, u, v, creases, time, breathing) => {
  let lift = 0
  let driftX = 0
  let driftY = 0

  for (const crease of creases) {
    const dx = crease.bx - crease.ax
    const dy = crease.by - crease.ay
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const signed = ((baseX - crease.ax) * dy - (baseY - crease.ay) * dx) / len
    const nearest = distanceToSegment(baseX, baseY, crease.ax, crease.ay, crease.bx, crease.by)
    const ridge = Math.exp(-Math.pow(Math.abs(signed) / crease.falloff, 2))
    const axial = Math.exp(-Math.pow(nearest / (crease.falloff * 1.4), 2))
    const pulse = breathing ? 0.92 + 0.18 * Math.sin(time * 0.95 + crease.phase) : 1
    const contribution = Math.sign(signed || 1) * ridge * axial * crease.strength * pulse * crease.type * 22

    lift += contribution
    driftX += nx * contribution * 0.16
    driftY += ny * contribution * 0.08
  }

  const crown = Math.cos((u - 0.5) * Math.PI) * Math.cos((v - 0.5) * Math.PI)
  const edgeSag = (1 - crown) * 10
  const pageRipple = breathing ? Math.sin(time * 0.45 + u * TAU * 0.6 + v * TAU * 0.4) * 1.2 : 0

  return {
    x: baseX + driftX,
    y: baseY + driftY - lift * 0.66 + edgeSag + pageRipple,
    lift
  }
}

const createRandomCrease = (bounds, type = 1) => {
  const radius = Math.min(bounds.width, bounds.height) * (0.18 + Math.random() * 0.16)
  const angle = Math.random() * Math.PI
  const cx = bounds.x + bounds.width * (0.2 + Math.random() * 0.6)
  const cy = bounds.y + bounds.height * (0.2 + Math.random() * 0.6)
  const dx = Math.cos(angle) * radius
  const dy = Math.sin(angle) * radius
  const inset = 22

  return {
    id: `crease-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    ax: clamp(cx - dx, bounds.x + inset, bounds.x + bounds.width - inset),
    ay: clamp(cy - dy, bounds.y + inset, bounds.y + bounds.height - inset),
    bx: clamp(cx + dx, bounds.x + inset, bounds.x + bounds.width - inset),
    by: clamp(cy + dy, bounds.y + inset, bounds.y + bounds.height - inset),
    type,
    strength: 0.45 + Math.random() * 0.35,
    falloff: radius * 0.55 + 18,
    phase: Math.random() * TAU
  }
}

const OrigamiOracle = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('valley')
  const [message, setMessage] = useState(MODE_MESSAGES.valley)
  const [breathing, setBreathing] = useState(true)
  const [stats, setStats] = useState({ creases: 0, strain: 0, vault: 0 })

  const creasesRef = useRef([])
  const dragRef = useRef({
    active: false,
    start: null,
    current: null
  })
  const sheetRef = useRef({
    x: 0,
    y: 0,
    width: 0,
    height: 0
  })
  const timeRef = useRef(0)
  const frameRef = useRef(0)

  const sheetBounds = useMemo(() => {
    const insetX = clamp(dimensions.width * 0.1, 28, 110)
    const insetY = clamp(dimensions.height * 0.12, 34, 120)
    const width = Math.max(180, dimensions.width - insetX * 2)
    const height = Math.max(220, dimensions.height - insetY * 2)

    return {
      x: insetX,
      y: insetY,
      width,
      height
    }
  }, [dimensions.height, dimensions.width])

  useEffect(() => {
    sheetRef.current = sheetBounds
  }, [sheetBounds])

  const getPointer = useCallback((event) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  }, [canvasRef])

  const clampToSheet = useCallback((point) => {
    const bounds = sheetRef.current
    return {
      x: clamp(point.x, bounds.x, bounds.x + bounds.width),
      y: clamp(point.y, bounds.y, bounds.y + bounds.height)
    }
  }, [])

  const withinSheet = useCallback((point) => {
    const bounds = sheetRef.current
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    )
  }, [])

  const commitCreases = useCallback((nextCreases) => {
    creasesRef.current = nextCreases.slice(-MAX_CREASES)
  }, [])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    setMessage(MODE_MESSAGES[nextMode])
  }, [])

  const handleUnfurl = useCallback(() => {
    if (!creasesRef.current.length) {
      setMessage('∴ the sheet is already smooth enough to reflect nothing ∴')
      return
    }

    commitCreases(creasesRef.current.slice(0, -1))
    setMessage('∴ the newest fold exhales and leaves the page ∴')
  }, [commitCreases])

  const handleScatter = useCallback(() => {
    if (sheetRef.current.width === 0) return

    const next = [...creasesRef.current]
    for (let i = 0; i < 3; i++) {
      next.push(createRandomCrease(sheetRef.current, i % 2 === 0 ? -1 : 1))
    }
    commitCreases(next)
    setMessage('∴ the oracle scores the page with unreadable architecture ∴')
  }, [commitCreases])

  const handleReset = useCallback(() => {
    dragRef.current = { active: false, start: null, current: null }
    commitCreases([])
    setMessage('∴ blank sheet restored // memory waits under the fibers ∴')
  }, [commitCreases])

  const handleBreathing = useCallback(() => {
    setBreathing(prev => {
      setMessage(prev
        ? '∴ the page stills // folds hold their posture without tremor ∴'
        : '∴ the page breathes again // tension moves through the grain ∴'
      )
      return !prev
    })
  }, [])

  const removeNearestCrease = useCallback((point) => {
    if (!creasesRef.current.length) {
      setMessage('∴ there is no crease here to forgive ∴')
      return
    }

    let nearestIndex = -1
    let nearestDistance = Infinity

    creasesRef.current.forEach((crease, index) => {
      const dist = distanceToSegment(point.x, point.y, crease.ax, crease.ay, crease.bx, crease.by)
      if (dist < nearestDistance) {
        nearestDistance = dist
        nearestIndex = index
      }
    })

    if (nearestIndex === -1 || nearestDistance > 28) {
      setMessage('∴ your hand brushed only untouched paper ∴')
      return
    }

    const next = creasesRef.current.filter((_, index) => index !== nearestIndex)
    commitCreases(next)
    setMessage('∴ one seam is lifted from the page // tension diffuses outward ∴')
  }, [commitCreases])

  const addCrease = useCallback((start, end, type) => {
    const length = Math.hypot(end.x - start.x, end.y - start.y)
    if (length < 30) {
      setMessage('∴ too slight a gesture // the page only flinched ∴')
      return
    }

    const nextCrease = {
      id: `crease-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      ax: start.x,
      ay: start.y,
      bx: end.x,
      by: end.y,
      type,
      strength: clamp(length / Math.min(sheetRef.current.width, sheetRef.current.height), 0.2, 0.95),
      falloff: clamp(length * 0.45, 18, 120),
      phase: Math.random() * TAU
    }

    commitCreases([...creasesRef.current, nextCrease])
    setMessage(type > 0
      ? '∴ ridge scored into the sheet // a vaulted memory appears ∴'
      : '∴ valley cut through the sheet // the page learns to bow inward ∴'
    )
  }, [commitCreases])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handlePointerDown = (event) => {
      const point = getPointer(event)
      if (!withinSheet(point)) return

      const clamped = clampToSheet(point)
      dragRef.current = {
        active: true,
        start: clamped,
        current: clamped
      }
      canvas.setPointerCapture?.(event.pointerId)
    }

    const handlePointerMove = (event) => {
      if (!dragRef.current.active) return
      dragRef.current.current = clampToSheet(getPointer(event))
    }

    const releasePointer = (event) => {
      if (!dragRef.current.active) return

      const end = clampToSheet(getPointer(event))
      const { start } = dragRef.current
      dragRef.current = {
        active: false,
        start: null,
        current: null
      }

      if (mode === 'erase') {
        removeNearestCrease(end)
      } else if (start) {
        addCrease(start, end, mode === 'mountain' ? 1 : -1)
      }

      canvas.releasePointerCapture?.(event.pointerId)
    }

    const cancelPointer = () => {
      dragRef.current = {
        active: false,
        start: null,
        current: null
      }
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', releasePointer)
    canvas.addEventListener('pointercancel', cancelPointer)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', releasePointer)
      canvas.removeEventListener('pointercancel', cancelPointer)
    }
  }, [addCrease, canvasRef, clampToSheet, getPointer, mode, removeNearestCrease, withinSheet])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0 || dimensions.height === 0) return

    timeRef.current += 0.016
    frameRef.current += 1

    const { width, height } = dimensions
    const { x, y, width: sheetWidth, height: sheetHeight } = sheetRef.current
    const creases = creasesRef.current
    const time = timeRef.current
    const cols = clamp(Math.round(sheetWidth / 58), 14, 28)
    const rows = clamp(Math.round(sheetHeight / 58), 10, 20)
    const mesh = []

    const bg = ctx.createLinearGradient(0, 0, 0, height)
    bg.addColorStop(0, '#02040a')
    bg.addColorStop(1, '#020814')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    const aura = ctx.createRadialGradient(
      x + sheetWidth * 0.5,
      y + sheetHeight * 0.36,
      20,
      x + sheetWidth * 0.5,
      y + sheetHeight * 0.36,
      Math.max(sheetWidth, sheetHeight) * 0.8
    )
    aura.addColorStop(0, 'rgba(102, 255, 204, 0.12)')
    aura.addColorStop(0.55, 'rgba(102, 255, 204, 0.04)')
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = aura
    ctx.fillRect(0, 0, width, height)

    let totalStrain = 0
    let maxLift = 0

    for (let row = 0; row <= rows; row++) {
      const rowPoints = []
      const v = row / rows
      const baseY = y + v * sheetHeight

      for (let col = 0; col <= cols; col++) {
        const u = col / cols
        const baseX = x + u * sheetWidth
        const projected = projectPoint(baseX, baseY, u, v, creases, time, breathing)
        totalStrain += Math.abs(projected.lift)
        maxLift = Math.max(maxLift, Math.abs(projected.lift))
        rowPoints.push(projected)
      }

      mesh.push(rowPoints)
    }

    ctx.save()
    ctx.shadowColor = 'rgba(102, 255, 204, 0.12)'
    ctx.shadowBlur = 24
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const a = mesh[row][col]
        const b = mesh[row][col + 1]
        const c = mesh[row + 1][col + 1]
        const d = mesh[row + 1][col]
        const lift = (a.lift + b.lift + c.lift + d.lift) / 4
        const hue = (190 + lift * 2.4 + row * 2.1 + col * 1.3) % 360
        const lightness = clamp(14 + Math.abs(lift) * 0.45, 12, 46)

        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.lineTo(c.x, c.y)
        ctx.lineTo(d.x, d.y)
        ctx.closePath()
        ctx.fillStyle = `hsla(${hue}, 44%, ${lightness}%, 0.34)`
        ctx.fill()
      }
    }
    ctx.restore()

    ctx.strokeStyle = 'rgba(214, 247, 228, 0.26)'
    ctx.lineWidth = 1
    for (let row = 0; row <= rows; row++) {
      ctx.beginPath()
      for (let col = 0; col <= cols; col++) {
        const point = mesh[row][col]
        if (col === 0) ctx.moveTo(point.x, point.y)
        else ctx.lineTo(point.x, point.y)
      }
      ctx.stroke()
    }

    for (let col = 0; col <= cols; col++) {
      ctx.beginPath()
      for (let row = 0; row <= rows; row++) {
        const point = mesh[row][col]
        if (row === 0) ctx.moveTo(point.x, point.y)
        else ctx.lineTo(point.x, point.y)
      }
      ctx.stroke()
    }

    ctx.save()
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    creases.forEach((crease, index) => {
      ctx.beginPath()
      for (let step = 0; step <= 18; step++) {
        const t = step / 18
        const baseX = crease.ax + (crease.bx - crease.ax) * t
        const baseY = crease.ay + (crease.by - crease.ay) * t
        const u = (baseX - x) / Math.max(1, sheetWidth)
        const v = (baseY - y) / Math.max(1, sheetHeight)
        const point = projectPoint(baseX, baseY, u, v, creases, time, breathing)

        if (step === 0) ctx.moveTo(point.x, point.y)
        else ctx.lineTo(point.x, point.y)
      }

      const alpha = 0.58 + (index / Math.max(1, creases.length)) * 0.18
      ctx.strokeStyle = crease.type > 0
        ? `rgba(255, 216, 120, ${alpha})`
        : `rgba(116, 231, 255, ${alpha})`
      ctx.stroke()
    })
    ctx.restore()

    const drag = dragRef.current
    if (drag.active && drag.start && drag.current) {
      ctx.save()
      ctx.setLineDash([10, 8])
      ctx.lineWidth = 2
      ctx.strokeStyle = mode === 'mountain'
        ? 'rgba(255, 216, 120, 0.9)'
        : mode === 'erase'
        ? 'rgba(255, 128, 162, 0.9)'
        : 'rgba(116, 231, 255, 0.9)'
      ctx.beginPath()
      ctx.moveTo(drag.start.x, drag.start.y)
      ctx.lineTo(drag.current.x, drag.current.y)
      ctx.stroke()
      ctx.restore()
    }

    const paperOutline = ctx.createLinearGradient(x, y, x + sheetWidth, y + sheetHeight)
    paperOutline.addColorStop(0, 'rgba(255, 255, 255, 0.12)')
    paperOutline.addColorStop(1, 'rgba(102, 255, 204, 0.18)')
    ctx.strokeStyle = paperOutline
    ctx.lineWidth = 1.2
    ctx.strokeRect(x, y, sheetWidth, sheetHeight)

    if (frameRef.current % 12 === 0) {
      const pointCount = (cols + 1) * (rows + 1)
      setStats({
        creases: creases.length,
        strain: pointCount ? totalStrain / pointCount : 0,
        vault: maxLift
      })
    }
  }, [breathing, ctx, dimensions.height, dimensions.width, mode])

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
    return [
      { label: 'creases', value: stats.creases },
      { label: 'strain', value: stats.strain.toFixed(1) },
      { label: 'vault', value: `${Math.round(stats.vault)}px`, color: '#ffd878' }
    ]
  }, [stats])

  const controls = useMemo(() => {
    return [
      { id: 'breathing', label: 'breathe()', onClick: handleBreathing, active: breathing },
      { id: 'scatter', label: 'oracle.fold()', onClick: handleScatter },
      { id: 'unfurl', label: 'unfurl()', onClick: handleUnfurl, disabled: stats.creases === 0 },
      { id: 'reset', label: 'reset()', onClick: handleReset, variant: 'reset' }
    ]
  }, [breathing, handleBreathing, handleReset, handleScatter, handleUnfurl, stats.creases])

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
        <p className="text-void-green/50 text-xs sm:text-right max-w-xl">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
          data-testid="origami-oracle-canvas"
        />
        <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-auto text-void-green/60 text-[10px] sm:text-xs font-mono bg-void-dark/80 border border-void-green/20 rounded px-2 sm:px-3 py-1 text-center sm:text-left">
          drag across the page to score a fold • mountain lifts • valley bows • erase releases
        </div>
      </div>
    </div>
  )
}

export default OrigamiOracle
