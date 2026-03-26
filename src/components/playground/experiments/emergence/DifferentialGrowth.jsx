import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'seed', label: 'mode.seed()' },
  { id: 'inject', label: 'mode.inject()' },
  { id: 'sculpt', label: 'mode.sculpt()' }
]

const TARGET_DIST = 6
const MAX_EDGE_LEN = 10
const REPULSION_RADIUS = 25
const REPULSION_STRENGTH = 0.6
const SPRING_STRENGTH = 0.25
const ALIGNMENT_STRENGTH = 0.15
const MAX_NODES = 5000
const DAMPING = 0.45

const createRing = (cx, cy, radius, count = 20) => {
  const nodes = []
  const TAU = Math.PI * 2
  for (let i = 0; i < count; i++) {
    const a = (TAU * i) / count
    nodes.push({
      x: cx + Math.cos(a) * radius,
      y: cy + Math.sin(a) * radius,
      vx: 0, vy: 0, fx: 0, fy: 0
    })
  }
  return nodes
}

const DifferentialGrowth = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('seed')
  const [isGrowing, setIsGrowing] = useState(true)
  const [message, setMessage] = useState('click to seed growth rings // watch them branch and interweave')
  const [growthSpeed, setGrowthSpeed] = useState('normal')
  const [stats, setStats] = useState({ nodes: 0, organisms: 0, saturation: 0 })

  const curvesRef = useRef([])
  const frameRef = useRef(0)
  const hasInitRef = useRef(false)

  useEffect(() => {
    if (dimensions.width === 0 || hasInitRef.current) return
    curvesRef.current = [createRing(dimensions.centerX, dimensions.centerY, 25, 20)]
    hasInitRef.current = true
  }, [dimensions])

  const countNodes = useCallback(() => {
    let n = 0
    for (const c of curvesRef.current) n += c.length
    return n
  }, [])

  const simulate = useCallback(() => {
    const curves = curvesRef.current
    const allNodes = curves.flat()
    const nodeCount = allNodes.length

    // Spatial hash for repulsion lookups
    const cellSize = REPULSION_RADIUS
    const grid = new Map()
    for (let i = 0; i < nodeCount; i++) {
      const n = allNodes[i]
      n.fx = 0
      n.fy = 0
      const key = `${Math.floor(n.x / cellSize)},${Math.floor(n.y / cellSize)}`
      if (!grid.has(key)) grid.set(key, [])
      grid.get(key).push(i)
    }

    // Repulsion: each node pushes away from non-neighbors
    for (const curve of curves) {
      const len = curve.length
      for (let i = 0; i < len; i++) {
        const node = curve[i]
        const prev = curve[(i - 1 + len) % len]
        const next = curve[(i + 1) % len]
        const cx = Math.floor(node.x / cellSize)
        const cy = Math.floor(node.y / cellSize)

        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const cell = grid.get(`${cx + dx},${cy + dy}`)
            if (!cell) continue
            for (const j of cell) {
              const other = allNodes[j]
              if (other === node || other === prev || other === next) continue
              const ddx = node.x - other.x
              const ddy = node.y - other.y
              const dist = Math.sqrt(ddx * ddx + ddy * ddy)
              if (dist < REPULSION_RADIUS && dist > 0.1) {
                const f = REPULSION_STRENGTH * (1 - dist / REPULSION_RADIUS)
                node.fx += (ddx / dist) * f
                node.fy += (ddy / dist) * f
              }
            }
          }
        }
      }
    }

    // Spring forces + alignment (per curve, cyclic)
    for (const curve of curves) {
      const len = curve.length
      for (let i = 0; i < len; i++) {
        const node = curve[i]
        const prev = curve[(i - 1 + len) % len]
        const next = curve[(i + 1) % len]

        for (const neighbor of [prev, next]) {
          const dx = neighbor.x - node.x
          const dy = neighbor.y - node.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > 0.1) {
            const f = (dist - TARGET_DIST) * SPRING_STRENGTH
            node.fx += (dx / dist) * f
            node.fy += (dy / dist) * f
          }
        }

        // Alignment: nudge toward midpoint of neighbors (smoothing)
        node.fx += ((prev.x + next.x) / 2 - node.x) * ALIGNMENT_STRENGTH
        node.fy += ((prev.y + next.y) / 2 - node.y) * ALIGNMENT_STRENGTH
      }
    }

    // Integrate velocities
    const w = dimensions.width
    const h = dimensions.height
    for (const node of allNodes) {
      node.vx = (node.vx + node.fx) * DAMPING
      node.vy = (node.vy + node.fy) * DAMPING
      node.x += node.vx
      node.y += node.vy

      // Soft boundary repulsion
      if (node.x < 15) node.vx += 0.3
      if (node.x > w - 15) node.vx -= 0.3
      if (node.y < 15) node.vy += 0.3
      if (node.y > h - 15) node.vy -= 0.3
    }

    // Growth: split edges that exceed max length
    if (nodeCount < MAX_NODES) {
      const steps = growthSpeed === 'fast' ? 3 : 1
      for (let s = 0; s < steps; s++) {
        for (const curve of curves) {
          const inserts = []
          for (let i = 0; i < curve.length; i++) {
            const a = curve[i]
            const b = curve[(i + 1) % curve.length]
            if (Math.hypot(b.x - a.x, b.y - a.y) > MAX_EDGE_LEN) {
              inserts.push(i + 1)
            }
          }
          for (let k = inserts.length - 1; k >= 0; k--) {
            const idx = inserts[k]
            const a = curve[(idx - 1 + curve.length) % curve.length]
            const b = curve[idx % curve.length]
            curve.splice(idx, 0, {
              x: (a.x + b.x) / 2 + (Math.random() - 0.5) * 0.3,
              y: (a.y + b.y) / 2 + (Math.random() - 0.5) * 0.3,
              vx: 0, vy: 0, fx: 0, fy: 0
            })
          }
        }
      }
    }
  }, [dimensions, growthSpeed])

  const draw = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    ctx.fillStyle = 'rgba(2, 4, 12, 0.06)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    for (let c = 0; c < curvesRef.current.length; c++) {
      const curve = curvesRef.current[c]
      if (curve.length < 3) continue
      const hueBase = (c * 73 + 140) % 360

      // Subtle interior fill
      ctx.beginPath()
      ctx.moveTo(curve[0].x, curve[0].y)
      for (let i = 1; i < curve.length; i++) ctx.lineTo(curve[i].x, curve[i].y)
      ctx.closePath()
      ctx.fillStyle = `hsla(${hueBase}, 50%, 15%, 0.02)`
      ctx.fill()

      // Edges colored by tension
      for (let i = 0; i < curve.length; i++) {
        const a = curve[i]
        const b = curve[(i + 1) % curve.length]
        const d = Math.hypot(b.x - a.x, b.y - a.y)
        const tension = Math.min(1, d / MAX_EDGE_LEN)
        const hue = hueBase + tension * 50
        const light = 40 + tension * 30
        const alpha = 0.4 + tension * 0.4

        ctx.strokeStyle = `hsla(${hue}, 65%, ${light}%, ${alpha})`
        ctx.lineWidth = 1.0
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
    }
  }, [ctx, dimensions])

  const updateStats = useCallback(() => {
    const nodes = countNodes()
    setStats({
      nodes,
      organisms: curvesRef.current.length,
      saturation: Math.min(100, Math.floor((nodes / MAX_NODES) * 100))
    })
  }, [countNodes])

  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (mode === 'seed') {
      if (countNodes() < MAX_NODES - 30) {
        curvesRef.current.push(createRing(x, y, 12 + Math.random() * 18, 14 + Math.floor(Math.random() * 10)))
        setMessage('new growth seeded // tendrils reaching outward')
      } else {
        setMessage('substrate saturated // no room for new organisms')
      }
    } else if (mode === 'inject') {
      let closest = null
      let closestDist = 50
      for (const curve of curvesRef.current) {
        for (const node of curve) {
          const d = Math.hypot(node.x - x, node.y - y)
          if (d < closestDist) {
            closestDist = d
            closest = node
          }
        }
      }
      if (closest) {
        const dx = closest.x - x
        const dy = closest.y - y
        const d = Math.hypot(dx, dy) || 1
        closest.vx += (dx / d) * 6
        closest.vy += (dy / d) * 6
        setMessage('growth impulse injected // perturbation ripples outward')
      }
    }
  }, [mode, canvasRef, countNodes])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [canvasRef, handleClick])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    frameRef.current++

    // Sculpt: push nearby nodes away from cursor
    if (mode === 'sculpt' && mouse.isDown && mouse.isInBounds) {
      const pos = mouse.positionRef.current
      for (const curve of curvesRef.current) {
        for (const node of curve) {
          const dx = node.x - pos.x
          const dy = node.y - pos.y
          const dist = Math.hypot(dx, dy)
          if (dist < 40 && dist > 0.1) {
            const f = (1 - dist / 40) * 2
            node.vx += (dx / dist) * f
            node.vy += (dy / dist) * f
          }
        }
      }
    }

    if (isGrowing) simulate()
    draw()
    if (frameRef.current % 20 === 0) updateStats()
  }, [ctx, dimensions, isGrowing, simulate, draw, mode, mouse.isDown, mouse.isInBounds, mouse.positionRef, updateStats])

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

  const toggleGrowth = useCallback(() => {
    setIsGrowing(prev => {
      setMessage(!prev ? 'growth resumes // tendrils unfurl' : 'growth suspended // form crystallized')
      return !prev
    })
  }, [])

  const toggleSpeed = useCallback(() => {
    setGrowthSpeed(prev => {
      const next = prev === 'normal' ? 'fast' : 'normal'
      setMessage(next === 'fast' ? 'proliferation surge // accelerated branching' : 'steady expansion // normalized growth')
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    curvesRef.current = [createRing(dimensions.centerX, dimensions.centerY, 25, 20)]
    frameRef.current = 0
    setMessage('substrate cleared // single seed remains')
  }, [dimensions])

  const handleModeChange = useCallback((next) => {
    setMode(next)
    const hints = {
      seed: 'click to plant new growth rings',
      inject: 'click near forms to inject growth impulse',
      sculpt: 'drag to push growing forms outward'
    }
    setMessage(hints[next])
  }, [])

  const metrics = useMemo(() => [
    { label: 'nodes', value: stats.nodes },
    { label: 'organisms', value: stats.organisms },
    { label: 'density', value: `${stats.saturation}%`, color: stats.saturation > 80 ? '#ff6666' : undefined },
    { label: 'state', value: isGrowing ? (growthSpeed === 'fast' ? 'surging' : 'growing') : 'crystallized' }
  ], [stats, isGrowing, growthSpeed])

  const controls = [
    {
      id: 'growth',
      label: isGrowing ? 'crystallize()' : 'thaw()',
      onClick: toggleGrowth,
      active: isGrowing
    },
    {
      id: 'speed',
      label: growthSpeed === 'normal' ? 'surge()' : 'steady()',
      onClick: toggleSpeed,
      active: growthSpeed === 'fast'
    },
    {
      id: 'clear',
      label: 'clear.substrate()',
      onClick: clearAll,
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
        <p className="text-void-green/50 text-xs sm:text-right max-w-lg">{message}</p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="differential-growth-canvas"
        />
      </div>
    </div>
  )
}

export default DifferentialGrowth
