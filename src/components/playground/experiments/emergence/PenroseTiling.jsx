import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const PHI = (1 + Math.sqrt(5)) / 2
const MAX_LEVEL = 7
const INIT_LEVEL = 4

const MODES = [
  { id: 'type', label: 'color.type()' },
  { id: 'angle', label: 'color.angle()' },
  { id: 'radial', label: 'color.radial()' }
]

const MODE_MESSAGES = {
  type: '∴ thick and thin in their native hues ∴',
  angle: '∴ orientation rainbow // each rhombus colored by its bearing ∴',
  radial: '∴ distance painting // concentric shells from the golden center ∴'
}

// --- Penrose P3 geometry via Robinson triangle subdivision ---

function createSun(cx, cy, radius) {
  const tris = []
  for (let i = 0; i < 10; i++) {
    const a1 = (Math.PI * 2 * i) / 10 - Math.PI / 2
    const a2 = (Math.PI * 2 * (i + 1)) / 10 - Math.PI / 2
    const b = { x: cx + radius * Math.cos(a1), y: cy + radius * Math.sin(a1) }
    const c = { x: cx + radius * Math.cos(a2), y: cy + radius * Math.sin(a2) }
    // Alternate winding so adjacent triangles pair into thick rhombi
    if (i % 2 === 0) {
      tris.push({ type: 0, a: { x: cx, y: cy }, b, c })
    } else {
      tris.push({ type: 0, a: { x: cx, y: cy }, b: c, c: b })
    }
  }
  return tris
}

function subdivide(tris) {
  const out = []
  for (const { type, a, b, c } of tris) {
    if (type === 0) {
      // Golden triangle (36-72-72) → 1 golden triangle + 1 gnomon
      const p = { x: a.x + (b.x - a.x) / PHI, y: a.y + (b.y - a.y) / PHI }
      out.push({ type: 0, a: c, b: p, c: b })
      out.push({ type: 1, a: p, b: c, c: a })
    } else {
      // Golden gnomon (108-36-36) → 2 gnomons + 1 golden triangle
      const q = { x: b.x + (a.x - b.x) / PHI, y: b.y + (a.y - b.y) / PHI }
      const r = { x: b.x + (c.x - b.x) / PHI, y: b.y + (c.y - b.y) / PHI }
      out.push({ type: 1, a: r, b: c, c: a })
      out.push({ type: 1, a: q, b: r, c: b })
      out.push({ type: 0, a: r, b: q, c: a })
    }
  }
  return out
}

// Pair triangles that share a bc edge → they form a complete rhombus
function buildPairs(tris) {
  const pairs = new Int32Array(tris.length).fill(-1)
  const map = new Map()
  const k = (x, y) => `${x.toFixed(3)},${y.toFixed(3)}`

  for (let i = 0; i < tris.length; i++) {
    const { b, c } = tris[i]
    const fwd = `${k(b.x, b.y)}-${k(c.x, c.y)}`
    const rev = `${k(c.x, c.y)}-${k(b.x, b.y)}`

    if (map.has(rev)) {
      const j = map.get(rev)
      pairs[i] = j
      pairs[j] = i
      map.delete(rev)
    } else {
      map.set(fwd, i)
    }
  }
  return pairs
}

function pointInTri(px, py, t) {
  const { a, b, c } = t
  const d1 = (px - b.x) * (a.y - b.y) - (a.x - b.x) * (py - b.y)
  const d2 = (px - c.x) * (b.y - c.y) - (b.x - c.x) * (py - c.y)
  const d3 = (px - a.x) * (c.y - a.y) - (c.x - a.x) * (py - a.y)
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))
}

// --- Component ---

const PenroseTiling = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('type')
  const [level, setLevel] = useState(INIT_LEVEL)
  const [counts, setCounts] = useState({ total: 0, t0: 0, t1: 0 })
  const [message, setMessage] = useState('')
  const [rotating, setRotating] = useState(false)

  const historyRef = useRef([])
  const trisRef = useRef([])
  const pairsRef = useRef(new Int32Array(0))
  const angleRef = useRef(0)
  const timeRef = useRef(0)
  const hoverRef = useRef(-1)
  const centerRef = useRef({ x: 0, y: 0 })

  const updateCounts = useCallback((tris) => {
    const t0 = tris.reduce((n, t) => n + (t.type === 0 ? 1 : 0), 0)
    setCounts({ total: tris.length, t0, t1: tris.length - t0 })
  }, [])

  const initTiling = useCallback(() => {
    if (dimensions.width === 0) return
    const cx = dimensions.centerX
    const cy = dimensions.centerY
    const radius = Math.max(dimensions.width, dimensions.height) * 0.7
    centerRef.current = { x: cx, y: cy }

    let tris = createSun(cx, cy, radius)
    const history = [tris]
    for (let i = 0; i < INIT_LEVEL; i++) {
      tris = subdivide(tris)
      history.push(tris)
    }

    trisRef.current = tris
    historyRef.current = history
    pairsRef.current = buildPairs(tris)
    angleRef.current = 0
    setLevel(INIT_LEVEL)
    updateCounts(tris)
    setMessage(`∴ golden sun unfurled ${INIT_LEVEL}× // aperiodic order from a single ratio ∴`)
  }, [dimensions.width, dimensions.height, dimensions.centerX, dimensions.centerY, updateCounts])

  useEffect(() => { initTiling() }, [initTiling])

  const handleSplit = useCallback(() => {
    if (level >= MAX_LEVEL) {
      setMessage(`∴ depth ${MAX_LEVEL} // recursion limit of the golden spiral ∴`)
      return
    }
    const next = subdivide(trisRef.current)
    trisRef.current = next
    historyRef.current.push(next)
    pairsRef.current = buildPairs(next)
    const nl = level + 1
    setLevel(nl)
    updateCounts(next)
    setMessage(`∴ level ${nl} // ${next.length} Robinson half-tiles crystallized ∴`)
  }, [level, updateCounts])

  const handleJoin = useCallback(() => {
    if (historyRef.current.length <= 1) {
      setMessage('∴ the seed cannot be further simplified ∴')
      return
    }
    historyRef.current.pop()
    const prev = historyRef.current[historyRef.current.length - 1]
    trisRef.current = prev
    pairsRef.current = buildPairs(prev)
    const nl = level - 1
    setLevel(nl)
    updateCounts(prev)
    setMessage(`∴ coalesced to level ${nl} // ${prev.length} half-tiles remain ∴`)
  }, [level, updateCounts])

  const handleRotate = useCallback(() => {
    setRotating(r => {
      setMessage(!r ? '∴ five-fold symmetry in slow revolution ∴' : '∴ rotation stilled ∴')
      return !r
    })
  }, [])

  const handleReset = useCallback(() => { initTiling() }, [initTiling])

  const handleModeChange = useCallback((m) => {
    setMode(m)
    setMessage(MODE_MESSAGES[m])
  }, [])

  const findHovered = useCallback((mx, my) => {
    const tris = trisRef.current
    const cx = centerRef.current.x
    const cy = centerRef.current.y
    const a = -angleRef.current
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    const dx = mx - cx
    const dy = my - cy
    // Un-rotate mouse position to match un-rotated triangle coordinates
    const rx = dx * cos - dy * sin + cx
    const ry = dx * sin + dy * cos + cy
    for (let i = tris.length - 1; i >= 0; i--) {
      if (pointInTri(rx, ry, tris[i])) return i
    }
    return -1
  }, [])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    timeRef.current++
    const t = timeRef.current
    if (rotating) angleRef.current += 0.0012

    if (mouse.isInBounds) {
      const pos = mouse.positionRef.current
      hoverRef.current = findHovered(pos.x, pos.y)
    } else {
      hoverRef.current = -1
    }

    ctx.fillStyle = '#000208'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const cx = centerRef.current.x
    const cy = centerRef.current.y
    const maxR = Math.max(dimensions.width, dimensions.height) * 0.5
    const tris = trisRef.current
    const pairs = pairsRef.current
    const hi = hoverRef.current
    const hiPair = hi >= 0 ? pairs[hi] : -1

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angleRef.current)
    ctx.translate(-cx, -cy)

    // Fill triangles
    for (let i = 0; i < tris.length; i++) {
      const tri = tris[i]
      const lit = i === hi || i === hiPair

      ctx.beginPath()
      ctx.moveTo(tri.a.x, tri.a.y)
      ctx.lineTo(tri.b.x, tri.b.y)
      ctx.lineTo(tri.c.x, tri.c.y)
      ctx.closePath()

      if (lit) {
        ctx.fillStyle = tri.type === 0
          ? 'rgba(102, 255, 204, 0.45)'
          : 'rgba(255, 102, 204, 0.45)'
      } else {
        const p = 0.92 + 0.08 * Math.sin(t * 0.012 + i * 0.03)
        if (mode === 'type') {
          ctx.fillStyle = tri.type === 0
            ? `hsla(165, 70%, ${30 * p}%, 0.88)`
            : `hsla(320, 55%, ${26 * p}%, 0.82)`
        } else if (mode === 'angle') {
          const mx = (tri.a.x + tri.b.x + tri.c.x) / 3
          const my = (tri.a.y + tri.b.y + tri.c.y) / 3
          const ang = Math.atan2(my - cy, mx - cx)
          const hue = ((ang / Math.PI + 1) * 180 + t * 0.12) % 360
          ctx.fillStyle = `hsla(${hue}, 60%, ${28 * p}%, 0.88)`
        } else {
          const mx = (tri.a.x + tri.b.x + tri.c.x) / 3
          const my = (tri.a.y + tri.b.y + tri.c.y) / 3
          const d = Math.hypot(mx - cx, my - cy)
          const norm = Math.min(1, d / maxR)
          const hue = (160 + norm * 140 + t * 0.08) % 360
          ctx.fillStyle = `hsla(${hue}, 55%, ${20 + norm * 20 * p}%, 0.88)`
        }
      }
      ctx.fill()
    }

    // Edges — only a->b and a->c (skip b->c = internal rhombus diagonal)
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.18)'
    ctx.lineWidth = 0.6
    ctx.beginPath()
    for (let i = 0; i < tris.length; i++) {
      const tri = tris[i]
      ctx.moveTo(tri.a.x, tri.a.y)
      ctx.lineTo(tri.b.x, tri.b.y)
      ctx.moveTo(tri.a.x, tri.a.y)
      ctx.lineTo(tri.c.x, tri.c.y)
    }
    ctx.stroke()

    // Hover — outline the full rhombus
    if (hi >= 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.lineWidth = 1.5
      const indices = hiPair >= 0 ? [hi, hiPair] : [hi]
      for (const idx of indices) {
        const tri = tris[idx]
        ctx.beginPath()
        ctx.moveTo(tri.a.x, tri.a.y)
        ctx.lineTo(tri.b.x, tri.b.y)
        ctx.moveTo(tri.a.x, tri.a.y)
        ctx.lineTo(tri.c.x, tri.c.y)
        ctx.stroke()
      }
    }

    ctx.restore()
  }, [ctx, dimensions.width, dimensions.height, rotating, mouse.isInBounds, mouse.positionRef, findHovered, mode])

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
    const { total, t0, t1 } = counts
    const ratio = t0 > 0 ? (t1 / t0) : 0
    return [
      { label: 'depth', value: level },
      { label: 'rhombi', value: Math.floor(total / 2) },
      { label: '\u2192\u03c6', value: ratio > 0 ? ratio.toFixed(4) : '\u2014', color: '#f0d866' }
    ]
  }, [level, counts])

  const controls = useMemo(() => [
    { id: 'split', label: 'subdivide()', onClick: handleSplit, disabled: level >= MAX_LEVEL },
    { id: 'join', label: 'coalesce()', onClick: handleJoin, disabled: level === 0 },
    { id: 'rotate', label: 'rotate()', onClick: handleRotate, active: rotating },
    { id: 'reset', label: 'reseed()', onClick: handleReset, variant: 'reset' }
  ], [handleSplit, handleJoin, handleRotate, handleReset, level, rotating])

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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs sm:text-right font-mono max-w-lg">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="penrose-tiling-canvas"
        />
        <div className="absolute bottom-3 left-3 text-void-green/25 text-[10px] font-mono">
          {'\u03c6'} = {PHI.toFixed(10)}...
        </div>
      </div>
    </div>
  )
}

export default PenroseTiling
