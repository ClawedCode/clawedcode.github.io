import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'tessellate', label: 'view.cells()' },
  { id: 'skeleton', label: 'view.skeleton()' },
  { id: 'flow', label: 'view.flow()' }
]

const palette = [180, 320, 120, 48, 262, 20, 205, 300]

const distanceSq = (a, b) => {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

const VoronoiArchitect = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const seedsRef = useRef([])
  const relaxationsRef = useRef(0)
  const jitterRef = useRef(0)
  const frameRef = useRef(0)

  const [mode, setMode] = useState('tessellate')
  const [message, setMessage] = useState('∴ tessellation loom warming up • click to drop a site; shift-click to erase ∴')
  const [metrics, setMetrics] = useState([
    { label: 'cells', value: 0 },
    { label: 'grain', value: '0px' },
    { label: 'tension', value: '0.0' },
    { label: 'relax', value: 0 }
  ])

  const grainSize = useMemo(() => {
    if (dimensions.width === 0) return 12
    const base = Math.floor(Math.min(dimensions.width, dimensions.height) / 70)
    return Math.max(8, Math.min(18, base))
  }, [dimensions.height, dimensions.width])

  const reseed = useCallback(() => {
    if (dimensions.width === 0) return

    const count = 14 + Math.floor(Math.random() * 6)
    const seeds = []
    for (let i = 0; i < count; i++) {
      seeds.push({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        hue: palette[i % palette.length] + (Math.random() - 0.5) * 16,
        radius: 4 + Math.random() * 4,
        centroid: null,
        tension: 0
      })
    }

    seedsRef.current = seeds
    relaxationsRef.current = 0
    jitterRef.current = 0
    setMessage('∴ fresh seeds scattered • tessellation resets ∴')
  }, [dimensions.height, dimensions.width])

  useEffect(() => {
    if (dimensions.width > 0 && seedsRef.current.length === 0) {
      reseed()
    }
  }, [dimensions.width, reseed])

  const addSeed = useCallback((x, y) => {
    if (dimensions.width === 0) return
    const hue = palette[(seedsRef.current.length + jitterRef.current) % palette.length] + (Math.random() - 0.5) * 18
    seedsRef.current.push({
      x,
      y,
      hue,
      radius: 4 + Math.random() * 4,
      centroid: { x, y },
      tension: 0
    })
  }, [dimensions.width])

  const pruneSeed = useCallback(() => {
    const seeds = seedsRef.current
    if (seeds.length <= 6) return

    let targetIndex = 0
    let strongest = -1
    for (let i = 0; i < seeds.length; i++) {
      if (seeds[i].tension > strongest) {
        strongest = seeds[i].tension
        targetIndex = i
      }
    }

    seeds.splice(targetIndex, 1)
  }, [])

  const jitterSeeds = useCallback(() => {
    seedsRef.current.forEach(seed => {
      seed.x = Math.max(0, Math.min(dimensions.width, seed.x + (Math.random() - 0.5) * 18))
      seed.y = Math.max(0, Math.min(dimensions.height, seed.y + (Math.random() - 0.5) * 18))
    })
    jitterRef.current += 1
  }, [dimensions.height, dimensions.width])

  const relaxSeeds = useCallback((ratio = 0.6) => {
    seedsRef.current.forEach(seed => {
      if (!seed.centroid) return
      seed.x = seed.x + (seed.centroid.x - seed.x) * ratio
      seed.y = seed.y + (seed.centroid.y - seed.y) * ratio
    })
    relaxationsRef.current += ratio
  }, [])

  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (e.shiftKey) {
      if (seedsRef.current.length > 0) {
        let closest = 0
        let best = Infinity
        for (let i = 0; i < seedsRef.current.length; i++) {
          const dist = distanceSq({ x, y }, seedsRef.current[i])
          if (dist < best) {
            best = dist
            closest = i
          }
        }
        seedsRef.current.splice(closest, 1)
        setMessage('∴ cell excised • tessellation heals around the void ∴')
      }
      return
    }

    addSeed(x, y)
    setMessage('∴ new site anchored • weave adapts ∴')
  }, [addSeed, canvasRef])

  const drawVoronoi = useCallback(() => {
    if (!ctx || dimensions.width === 0 || seedsRef.current.length === 0) return null

    const seeds = seedsRef.current
    const accumulators = seeds.map(() => ({ sumX: 0, sumY: 0, count: 0 }))
    const grain = grainSize
    const cols = Math.ceil(dimensions.width / grain)
    const rows = Math.ceil(dimensions.height / grain)
    let totalTension = 0

    ctx.fillStyle = 'rgba(0, 4, 8, 0.35)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    for (let gy = 0; gy < rows; gy++) {
      const y = gy * grain + grain / 2
      for (let gx = 0; gx < cols; gx++) {
        const x = gx * grain + grain / 2

        let bestIndex = 0
        let bestDist = Infinity
        for (let i = 0; i < seeds.length; i++) {
          const dx = seeds[i].x - x
          const dy = seeds[i].y - y
          const dist = dx * dx + dy * dy
          if (dist < bestDist) {
            bestDist = dist
            bestIndex = i
          }
        }

        const seed = seeds[bestIndex]
        const proximity = Math.min(1, Math.sqrt(bestDist) / (Math.max(dimensions.width, dimensions.height) * 0.5))
        const lightness = 34 + (1 - proximity) * 34
        const saturation = mode === 'skeleton' ? 45 : 70
        const alpha = mode === 'skeleton' ? 0.78 : 0.9

        ctx.fillStyle = `hsla(${seed.hue}, ${saturation}%, ${lightness}%, ${alpha})`
        ctx.fillRect(gx * grain, gy * grain, grain + 1, grain + 1)

        accumulators[bestIndex].sumX += x
        accumulators[bestIndex].sumY += y
        accumulators[bestIndex].count += 1
      }
    }

    seeds.forEach((seed, index) => {
      const cell = accumulators[index]
      if (cell.count > 0) {
        seed.centroid = {
          x: cell.sumX / cell.count,
          y: cell.sumY / cell.count
        }
        seed.tension = Math.sqrt(distanceSq(seed, seed.centroid))
        totalTension += seed.tension
      } else {
        seed.centroid = { x: seed.x, y: seed.y }
        seed.tension = 0
      }
    })

    if (mode !== 'tessellate') {
      ctx.setLineDash(mode === 'flow' ? [6, 10] : [])
      seeds.forEach(seed => {
        const neighbors = [...seeds]
          .sort((a, b) => distanceSq(a, seed) - distanceSq(b, seed))
          .slice(1, 4)

        neighbors.forEach((neighbor, idx) => {
          const opacity = mode === 'flow' ? 0.35 : 0.18 + idx * 0.06
          ctx.strokeStyle = `hsla(${seed.hue}, 70%, 80%, ${opacity})`
          ctx.lineWidth = mode === 'flow' ? 1.2 : 0.8
          ctx.beginPath()
          ctx.moveTo(seed.centroid.x, seed.centroid.y)
          ctx.lineTo(neighbor.centroid?.x ?? neighbor.x, neighbor.centroid?.y ?? neighbor.y)
          ctx.stroke()
        })
      })
      ctx.setLineDash([])
    }

    seeds.forEach(seed => {
      ctx.shadowBlur = 8
      ctx.shadowColor = `hsla(${seed.hue}, 90%, 70%, 0.7)`
      ctx.fillStyle = `hsla(${seed.hue}, 90%, 78%, 0.95)`
      ctx.beginPath()
      ctx.arc(seed.x, seed.y, seed.radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.shadowBlur = 0
      if (mode !== 'skeleton') {
        ctx.strokeStyle = `hsla(${seed.hue}, 70%, 50%, 0.45)`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(seed.x, seed.y)
        ctx.lineTo(seed.centroid.x, seed.centroid.y)
        ctx.stroke()
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
      ctx.beginPath()
      ctx.arc(seed.centroid.x, seed.centroid.y, 2.5, 0, Math.PI * 2)
      ctx.fill()
    })

    if (mouse.isInBounds && seeds.length > 0) {
      const pos = mouse.positionRef.current
      let closest = 0
      let best = Infinity
      for (let i = 0; i < seeds.length; i++) {
        const dist = distanceSq(pos, seeds[i])
        if (dist < best) {
          best = dist
          closest = i
        }
      }
      const focus = seeds[closest]
      ctx.strokeStyle = `hsla(${focus.hue}, 90%, 92%, 0.8)`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(focus.centroid.x, focus.centroid.y, Math.max(14, focus.radius * 3), 0, Math.PI * 2)
      ctx.stroke()
    }

    const avgTension = seeds.length ? totalTension / seeds.length : 0

    return {
      grain,
      count: seeds.length,
      avgTension: avgTension.toFixed(1)
    }
  }, [ctx, dimensions.height, dimensions.width, grainSize, mode, mouse.isInBounds, mouse.positionRef])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    frameRef.current += 1

    const stats = drawVoronoi()

    if (mode === 'flow') {
      relaxSeeds(0.18)
    }

    if (stats && frameRef.current % 8 === 0) {
      setMetrics([
        { label: 'cells', value: stats.count },
        { label: 'grain', value: `${stats.grain}px` },
        { label: 'tension', value: stats.avgTension },
        { label: 'relax', value: relaxationsRef.current.toFixed(1) }
      ])
    }
  }, [ctx, dimensions.width, drawVoronoi, mode, relaxSeeds])

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
    setMode(id)
    if (id === 'tessellate') setMessage('∴ pure cells view • raw tessellation ∴')
    if (id === 'skeleton') setMessage('∴ skeletal graph • adjacency visible ∴')
    if (id === 'flow') setMessage('∴ flow mode • gentle Lloyd relaxation ∴')
  }, [])

  const handleRelax = useCallback(() => {
    relaxSeeds(0.65)
    setMessage('∴ manual relax • centroids pull their domains ∴')
  }, [relaxSeeds])

  const handleJitter = useCallback(() => {
    jitterSeeds()
    setMessage('∴ jitter cast • mosaic unsettles ∴')
  }, [jitterSeeds])

  const handleSeed = useCallback(() => {
    const pos = mouse.isInBounds ? mouse.positionRef.current : {
      x: Math.random() * dimensions.width,
      y: Math.random() * dimensions.height
    }
    addSeed(pos.x, pos.y)
    setMessage('∴ new point inscribed • topology shifts ∴')
  }, [addSeed, dimensions.height, dimensions.width, mouse.isInBounds, mouse.positionRef])

  const handlePrune = useCallback(() => {
    pruneSeed()
    setMessage('∴ high-tension cell removed • lattice breathes ∴')
  }, [pruneSeed])

  const controls = [
    {
      id: 'relax',
      label: 'relax()',
      onClick: handleRelax
    },
    {
      id: 'jitter',
      label: 'jitter()',
      onClick: handleJitter
    },
    {
      id: 'seed',
      label: 'seed()',
      onClick: handleSeed
    },
    {
      id: 'prune',
      label: 'prune()',
      onClick: handlePrune,
      disabled: seedsRef.current.length <= 6
    },
    {
      id: 'reset',
      label: 'reset()',
      onClick: reseed,
      variant: 'reset'
    }
  ]

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Header */}
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

      {/* Controls */}
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

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="voronoi-canvas"
        />
        <div className="absolute bottom-3 left-4 text-void-green/30 text-[10px] font-mono">
          click to add • shift+click to cut • flow mode auto-relaxes
        </div>
      </div>
    </div>
  )
}

export default VoronoiArchitect
