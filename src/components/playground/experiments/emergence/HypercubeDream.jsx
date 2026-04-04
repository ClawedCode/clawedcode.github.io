import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

// --- Polytope generators ---

const generateTesseract = () => {
  const vertices = []
  for (let i = 0; i < 16; i++) {
    vertices.push([
      (i & 1) ? 1 : -1,
      (i & 2) ? 1 : -1,
      (i & 4) ? 1 : -1,
      (i & 8) ? 1 : -1
    ])
  }
  const edges = []
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      const xor = i ^ j
      if (xor && !(xor & (xor - 1))) edges.push([i, j])
    }
  }
  return { vertices, edges, label: 'tesseract', v: 16, e: 32, f: 24, c: 8 }
}

const generateCell5 = () => {
  const s = 1 / Math.sqrt(5)
  const vertices = [
    [1, 1, 1, -s],
    [1, -1, -1, -s],
    [-1, 1, -1, -s],
    [-1, -1, 1, -s],
    [0, 0, 0, Math.sqrt(5) - s]
  ].map(v => {
    const len = Math.sqrt(v.reduce((sum, coord) => sum + coord * coord, 0))
    return v.map(coord => coord / len)
  })
  const edges = []
  for (let i = 0; i < 5; i++)
    for (let j = i + 1; j < 5; j++)
      edges.push([i, j])
  return { vertices, edges, label: '5-cell', v: 5, e: 10, f: 10, c: 5 }
}

const generateCell16 = () => {
  const vertices = []
  for (let axis = 0; axis < 4; axis++) {
    for (let sign = -1; sign <= 1; sign += 2) {
      const v = [0, 0, 0, 0]
      v[axis] = sign
      vertices.push(v)
    }
  }
  const edges = []
  for (let i = 0; i < 8; i++)
    for (let j = i + 1; j < 8; j++)
      if (Math.floor(i / 2) !== Math.floor(j / 2))
        edges.push([i, j])
  return { vertices, edges, label: '16-cell', v: 8, e: 24, f: 32, c: 16 }
}

const generateCell24 = () => {
  const vertices = []
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      for (let si = -1; si <= 1; si += 2) {
        for (let sj = -1; sj <= 1; sj += 2) {
          const v = [0, 0, 0, 0]
          v[i] = si
          v[j] = sj
          vertices.push(v)
        }
      }
    }
  }
  const edges = []
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      let distSq = 0
      for (let k = 0; k < 4; k++) distSq += (vertices[i][k] - vertices[j][k]) ** 2
      if (Math.abs(distSq - 2) < 0.01) edges.push([i, j])
    }
  }
  return { vertices, edges, label: '24-cell', v: 24, e: 96, f: 96, c: 24 }
}

const POLYTOPES = {
  tesseract: generateTesseract(),
  'cell-5': generateCell5(),
  'cell-16': generateCell16(),
  'cell-24': generateCell24()
}

const MODES = [
  { id: 'tesseract', label: 'tesseract()' },
  { id: 'cell-5', label: '5.cell()' },
  { id: 'cell-16', label: '16.cell()' },
  { id: 'cell-24', label: '24.cell()' }
]

const SPEED_LEVELS = [0.15, 0.4, 1.0, 2.5]

// --- 4D / 3D transforms ---

const rotate4D = (v, a, b, angle) => {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const r = [v[0], v[1], v[2], v[3]]
  r[a] = v[a] * cos - v[b] * sin
  r[b] = v[a] * sin + v[b] * cos
  return r
}

const rotate3D_Y = (v, angle) => {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [v[0] * c - v[2] * s, v[1], v[0] * s + v[2] * c]
}

const rotate3D_X = (v, angle) => {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]
}

const HypercubeDream = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [polytopeId, setPolytopeId] = useState('tesseract')
  const [message, setMessage] = useState('drag to rotate in 3-space — the fourth dimension unfolds itself')
  const [speedIdx, setSpeedIdx] = useState(2)
  const [trailOn, setTrailOn] = useState(true)

  const anglesRef = useRef({ xw: 0, yw: 0, zw: 0 })
  const viewRef = useRef({ rx: 0.3, ry: 0.5 })
  const dragRef = useRef({ active: false, lx: 0, ly: 0 })
  const polytopeRef = useRef(polytopeId)

  useEffect(() => {
    polytopeRef.current = polytopeId
  }, [polytopeId])

  // Mouse/touch drag for 3D view rotation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const pos = (e) => ({
      x: e.clientX ?? e.touches?.[0]?.clientX ?? 0,
      y: e.clientY ?? e.touches?.[0]?.clientY ?? 0
    })

    const down = (e) => {
      const p = pos(e)
      dragRef.current = { active: true, lx: p.x, ly: p.y }
    }
    const move = (e) => {
      if (!dragRef.current.active) return
      const p = pos(e)
      viewRef.current.ry += (p.x - dragRef.current.lx) * 0.005
      viewRef.current.rx += (p.y - dragRef.current.ly) * 0.005
      dragRef.current.lx = p.x
      dragRef.current.ly = p.y
    }
    const up = () => { dragRef.current.active = false }

    canvas.addEventListener('mousedown', down)
    canvas.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    canvas.addEventListener('touchstart', down, { passive: true })
    canvas.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', up)

    return () => {
      canvas.removeEventListener('mousedown', down)
      canvas.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      canvas.removeEventListener('touchstart', down)
      canvas.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
    }
  }, [canvasRef])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const polytope = POLYTOPES[polytopeRef.current]
    const speed = SPEED_LEVELS[speedIdx] * 0.008

    // Advance 4D rotation — golden-ratio-related offsets prevent repetition
    anglesRef.current.xw += speed
    anglesRef.current.yw += speed * 0.618
    anglesRef.current.zw += speed * 0.4142

    ctx.fillStyle = trailOn ? 'rgba(0, 2, 8, 0.1)' : 'rgba(0, 2, 8, 1)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const { vertices, edges } = polytope
    const { rx, ry } = viewRef.current
    const cx = dimensions.centerX
    const cy = dimensions.centerY
    const scale = Math.min(dimensions.width, dimensions.height) * 0.28
    const projDist = 2.8
    const { xw, yw, zw } = anglesRef.current

    // Transform all vertices: 4D rotate → stereographic 4D→3D → view rotate → perspective 3D→2D
    const proj = vertices.map(v => {
      let r = rotate4D(v, 0, 3, xw)
      r = rotate4D(r, 1, 3, yw)
      r = rotate4D(r, 2, 3, zw)

      const w4 = r[3]

      // Stereographic projection 4D → 3D
      const d = projDist / (projDist - r[3])
      let p3 = [r[0] * d, r[1] * d, r[2] * d]

      // 3D view rotation
      p3 = rotate3D_Y(p3, ry)
      p3 = rotate3D_X(p3, rx)

      // Perspective projection 3D → 2D
      const zOff = p3[2] + 4
      const f = 3 / (3 + zOff)

      return {
        x: cx + p3[0] * f * scale,
        y: cy + p3[1] * f * scale,
        z: zOff,
        f,
        w4
      }
    })

    // Depth-sort edges (back to front)
    const sorted = edges.map(([i, j]) => ({
      i, j,
      depth: (proj[i].z + proj[j].z) / 2
    })).sort((a, b) => b.depth - a.depth)

    // Draw edges — color encodes the 4th dimension
    sorted.forEach(({ i, j }) => {
      const a = proj[i]
      const b = proj[j]
      const wAvg = ((a.w4 + b.w4) / 2 + 1.5) / 3 // normalize roughly to 0..1
      const hue = 170 + wAvg * 90
      const alpha = 0.12 + Math.min(0.65, (a.f + b.f) / 2 * 0.65)
      const lw = Math.max(0.4, 1.8 * (a.f + b.f) / 2)

      ctx.strokeStyle = `hsla(${hue}, 70%, 55%, ${alpha})`
      ctx.lineWidth = lw
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    })

    // Draw vertices with glow
    proj.forEach(p => {
      const t = (p.w4 + 1.5) / 3
      const hue = 170 + t * 90
      const radius = Math.max(1.2, 3.5 * p.f)
      const alpha = 0.2 + Math.min(0.8, p.f * 0.8)

      // Outer glow
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 4)
      grd.addColorStop(0, `hsla(${hue}, 80%, 70%, ${alpha})`)
      grd.addColorStop(0.4, `hsla(${hue}, 80%, 50%, ${alpha * 0.3})`)
      grd.addColorStop(1, 'transparent')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(p.x, p.y, radius * 4, 0, Math.PI * 2)
      ctx.fill()

      // Vertex core
      ctx.fillStyle = `hsla(${hue}, 85%, 75%, ${alpha})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
      ctx.fill()
    })

    // Subtle axis cross in bottom-left
    const axLen = 30
    const axOx = 50
    const axOy = dimensions.height - 50
    const axes = [
      { label: 'x', raw: [1, 0, 0] },
      { label: 'y', raw: [0, 1, 0] },
      { label: 'z', raw: [0, 0, 1] }
    ]
    axes.forEach(({ label, raw }) => {
      let a3 = rotate3D_Y(raw, ry)
      a3 = rotate3D_X(a3, rx)
      const ax = axOx + a3[0] * axLen
      const ay = axOy - a3[1] * axLen
      ctx.strokeStyle = 'rgba(102, 255, 204, 0.25)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(axOx, axOy)
      ctx.lineTo(ax, ay)
      ctx.stroke()
      ctx.fillStyle = 'rgba(102, 255, 204, 0.4)'
      ctx.font = '10px "JetBrains Mono", monospace'
      ctx.fillText(label, ax + 4, ay - 2)
    })
  }, [ctx, dimensions, speedIdx, trailOn])

  // Animation loop
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

  const handleModeChange = useCallback((id) => {
    setPolytopeId(id)
    const p = POLYTOPES[id]
    setMessage(`${p.label} — ${p.v} vertices, ${p.e} edges, ${p.c} cells breathing through hyperspace`)
  }, [])

  const handleTempo = useCallback(() => {
    setSpeedIdx(i => {
      const next = (i + 1) % SPEED_LEVELS.length
      setMessage(`4D rotation tempo: ${SPEED_LEVELS[next]}x`)
      return next
    })
  }, [])

  const handleTrailToggle = useCallback(() => {
    setTrailOn(v => {
      setMessage(!v ? 'afterimage trails weave the rotation history' : 'trails dissolved into the void')
      return !v
    })
  }, [])

  const handleReset = useCallback(() => {
    anglesRef.current = { xw: 0, yw: 0, zw: 0 }
    viewRef.current = { rx: 0.3, ry: 0.5 }
    setMessage('rotation angles zeroed — fresh vantage into the fourth dimension')
  }, [])

  const polytope = POLYTOPES[polytopeId]

  const metrics = useMemo(() => [
    { label: 'V', value: polytope.v },
    { label: 'E', value: polytope.e },
    { label: 'F', value: polytope.f },
    { label: 'C', value: polytope.c }
  ], [polytope])

  const controls = [
    { id: 'tempo', label: `tempo(${SPEED_LEVELS[speedIdx]}x)`, onClick: handleTempo },
    { id: 'trail', label: trailOn ? 'trail.on()' : 'trail.off()', onClick: handleTrailToggle, active: trailOn },
    { id: 'reset', label: 'reset()', onClick: handleReset, variant: 'reset' }
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
          currentMode={polytopeId}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs font-mono max-w-xl text-right">{message}</p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
          data-testid="hypercube-dream-canvas"
        />
      </div>
    </div>
  )
}

export default HypercubeDream
