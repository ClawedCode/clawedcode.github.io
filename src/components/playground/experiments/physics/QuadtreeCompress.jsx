import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const GRID = 128

const MODES = [
  { id: 'blocks', label: 'view.blocks()' },
  { id: 'ink', label: 'view.ink()' },
  { id: 'error', label: 'view.error()' }
]

const clamp01 = (n) => Math.max(0, Math.min(1, n))

const QuadtreeCompress = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('blocks')
  const [brush, setBrush] = useState('ink')
  const [autoCompress, setAutoCompress] = useState(true)
  const [threshold, setThreshold] = useState(0.006)
  const [maxDepth, setMaxDepth] = useState(6)
  const [message, setMessage] = useState('∴ quadtree compression loom awaits ink ∴')
  const [metricState, setMetricState] = useState({
    leaves: 0,
    depth: 0,
    error: 0,
    ratio: 0
  })

  const fieldRef = useRef(new Float32Array(GRID * GRID))
  const reconRef = useRef(new Float32Array(GRID * GRID))
  const integralRef = useRef(new Float32Array((GRID + 1) * (GRID + 1)))
  const integralSqRef = useRef(new Float32Array((GRID + 1) * (GRID + 1)))
  const quadsRef = useRef([])
  const dirtyRef = useRef(true)
  const offscreenRef = useRef(null)
  const imageRef = useRef(null)

  const ensureOffscreen = useCallback(() => {
    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement('canvas')
      offscreenRef.current.width = GRID
      offscreenRef.current.height = GRID
    }
    if (!imageRef.current) {
      imageRef.current = new ImageData(GRID, GRID)
    }
  }, [])

  const applyBrush = useCallback(() => {
    if (!mouse.isDown || !mouse.isInBounds || dimensions.width === 0) return

    const scaleX = GRID / Math.max(1, dimensions.width)
    const scaleY = GRID / Math.max(1, dimensions.height)
    const px = mouse.positionRef.current.x * scaleX
    const py = mouse.positionRef.current.y * scaleY
    const radius = brush === 'ink' ? 5.2 : 6.4
    const weight = brush === 'ink' ? 0.22 : -0.28
    const r2 = radius * radius

    const field = fieldRef.current
    const minX = Math.max(0, Math.floor(px - radius))
    const maxX = Math.min(GRID - 1, Math.ceil(px + radius))
    const minY = Math.max(0, Math.floor(py - radius))
    const maxY = Math.min(GRID - 1, Math.ceil(py + radius))

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - px
        const dy = y - py
        const dist2 = dx * dx + dy * dy
        if (dist2 <= r2) {
          const idx = y * GRID + x
          const influence = 1 - dist2 / r2
          field[idx] = clamp01(field[idx] + weight * influence)
        }
      }
    }

    dirtyRef.current = true
  }, [brush, dimensions.height, dimensions.width, mouse.isDown, mouse.isInBounds, mouse.positionRef])

  const seedPattern = useCallback(() => {
    const field = fieldRef.current
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const wave = Math.sin(x * 0.12) * Math.cos(y * 0.08)
        const ring = Math.abs(Math.sin((x + y) * 0.07))
        const bands = ((x + y) % 18) / 18
        const v = clamp01(0.35 + 0.25 * wave + 0.2 * ring - 0.1 * bands)
        field[y * GRID + x] = v
      }
    }
    dirtyRef.current = true
    setMessage('∴ interference grid etched // compress to reveal ∴')
  }, [])

  const clearField = useCallback(() => {
    fieldRef.current.fill(0)
    reconRef.current.fill(0)
    quadsRef.current = []
    dirtyRef.current = true
    setMessage('∴ canvas rinsed // awaiting new glyphs ∴')
  }, [])

  const buildIntegrals = useCallback(() => {
    integralRef.current.fill(0)
    integralSqRef.current.fill(0)

    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const v = fieldRef.current[y * GRID + x]
        const idx = (y + 1) * (GRID + 1) + (x + 1)
        const up = idx - (GRID + 1)
        const left = idx - 1
        const upLeft = up - 1
        integralRef.current[idx] = v + integralRef.current[left] + integralRef.current[up] - integralRef.current[upLeft]
        integralSqRef.current[idx] = v * v + integralSqRef.current[left] + integralSqRef.current[up] - integralSqRef.current[upLeft]
      }
    }
  }, [])

  const regionStats = useCallback((x, y, size) => {
    const stride = GRID + 1
    const x2 = x + size
    const y2 = y + size

    const idxA = y * stride + x
    const idxB = y * stride + x2
    const idxC = y2 * stride + x
    const idxD = y2 * stride + x2

    const sum = integralRef.current[idxD] - integralRef.current[idxB] - integralRef.current[idxC] + integralRef.current[idxA]
    const sumSq = integralSqRef.current[idxD] - integralSqRef.current[idxB] - integralSqRef.current[idxC] + integralSqRef.current[idxA]

    return { sum, sumSq }
  }, [])

  const rebuildQuadtree = useCallback(() => {
    buildIntegrals()

    const leaves = []
    const recon = reconRef.current
    recon.fill(0)

    let deepest = 0

    const writeRegion = (x, y, size, value) => {
      for (let yy = y; yy < y + size; yy++) {
        for (let xx = x; xx < x + size; xx++) {
          recon[yy * GRID + xx] = value
        }
      }
    }

    const walk = (x, y, size, depth) => {
      const { sum, sumSq } = regionStats(x, y, size)
      const count = size * size
      const avg = sum / count
      const variance = sumSq / count - avg * avg

      if (variance < threshold || size <= 2 || depth >= maxDepth) {
        leaves.push({ x, y, size, depth, avg })
        writeRegion(x, y, size, avg)
        deepest = Math.max(deepest, depth)
        return
      }

      const half = size / 2
      walk(x, y, half, depth + 1)
      walk(x + half, y, half, depth + 1)
      walk(x, y + half, half, depth + 1)
      walk(x + half, y + half, half, depth + 1)
    }

    walk(0, 0, GRID, 0)
    quadsRef.current = leaves

    let totalError = 0
    const field = fieldRef.current
    for (let i = 0; i < field.length; i++) {
      totalError += Math.abs(field[i] - recon[i])
    }

    const ratio = leaves.length > 0 ? (GRID * GRID) / leaves.length : GRID * GRID
    setMetricState({
      leaves: leaves.length,
      depth: deepest,
      error: totalError / field.length,
      ratio
    })

    dirtyRef.current = false
  }, [buildIntegrals, maxDepth, regionStats, threshold])

  useEffect(() => {
    dirtyRef.current = true
  }, [threshold, maxDepth])

  const drawInk = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    ensureOffscreen()

    const image = imageRef.current
    const data = image.data
    const field = fieldRef.current

    for (let i = 0; i < field.length; i++) {
      const v = field[i]
      const idx = i * 4
      data[idx] = 8
      data[idx + 1] = 120 + v * 120
      data[idx + 2] = 90 + v * 80
      data[idx + 3] = 255
    }

    const offCtx = offscreenRef.current.getContext('2d')
    offCtx.putImageData(image, 0, 0)
    ctx.drawImage(offscreenRef.current, 0, 0, dimensions.width, dimensions.height)
  }, [ctx, dimensions.height, dimensions.width, ensureOffscreen])

  const drawBlocks = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const scaleX = dimensions.width / GRID
    const scaleY = dimensions.height / GRID

    ctx.fillStyle = 'rgba(0, 6, 12, 0.2)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    for (const leaf of quadsRef.current) {
      const hue = 150 + leaf.avg * 90
      const light = 18 + leaf.avg * 55
      ctx.fillStyle = `hsla(${hue}, 70%, ${light}%, ${0.18 + leaf.avg * 0.4})`
      ctx.fillRect(leaf.x * scaleX, leaf.y * scaleY, leaf.size * scaleX, leaf.size * scaleY)

      ctx.strokeStyle = `hsla(${hue + 40}, 90%, 70%, 0.12)`
      ctx.lineWidth = 0.6
      ctx.strokeRect(leaf.x * scaleX, leaf.y * scaleY, leaf.size * scaleX, leaf.size * scaleY)
    }
  }, [ctx, dimensions.height, dimensions.width])

  const drawError = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    ensureOffscreen()

    const image = imageRef.current
    const data = image.data
    const field = fieldRef.current
    const recon = reconRef.current

    for (let i = 0; i < field.length; i++) {
      const diff = Math.abs(field[i] - recon[i])
      const idx = i * 4
      data[idx] = 180 + diff * 60
      data[idx + 1] = 30
      data[idx + 2] = 120 + diff * 80
      data[idx + 3] = clamp01(diff * 4) * 255
    }

    const offCtx = offscreenRef.current.getContext('2d')
    offCtx.putImageData(image, 0, 0)
    ctx.drawImage(offscreenRef.current, 0, 0, dimensions.width, dimensions.height)
  }, [ctx, dimensions.height, dimensions.width, ensureOffscreen])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    if (mouse.isDown) {
      applyBrush()
    }

    if (autoCompress && dirtyRef.current) {
      rebuildQuadtree()
    }

    ctx.fillStyle = 'rgba(0, 2, 6, 0.4)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    if (mode === 'ink') {
      drawInk()
    } else if (mode === 'error') {
      drawError()
    } else {
      drawBlocks()
    }
  }, [applyBrush, autoCompress, ctx, dimensions.height, dimensions.width, drawBlocks, drawError, drawInk, mode, rebuildQuadtree, mouse.isDown])

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
    if (!ctx || dimensions.width === 0) return
    rebuildQuadtree()
  }, [ctx, dimensions.width, rebuildQuadtree])

  const handleThreshold = useCallback((direction) => {
    setThreshold(prev => {
      const factor = direction === 'down' ? 0.72 : 1 / 0.72
      const next = clamp01(prev * factor)
      const clamped = Math.min(0.04, Math.max(0.001, next))
      setMessage(`∴ threshold tuned → ${clamped.toFixed(3)} ∴`)
      return clamped
    })
  }, [])

  const handleDepth = useCallback((delta) => {
    setMaxDepth(prev => {
      const next = Math.max(1, Math.min(8, prev + delta))
      setMessage(`∴ depth ceiling set to ${next} ∴`)
      return next
    })
  }, [])

  const handleCompress = useCallback(() => {
    rebuildQuadtree()
    setMessage('∴ compress() invoked // quad tiles lock in ∴')
  }, [rebuildQuadtree])

  const toggleBrush = useCallback((next) => {
    setBrush(next)
    setMessage(next === 'ink' ? '∴ brush inked // draw density ∴' : '∴ eraser armed // reveal negative space ∴')
  }, [])

  const metrics = useMemo(() => {
    return [
      { label: 'leaves', value: metricState.leaves },
      { label: 'ratio', value: metricState.ratio ? metricState.ratio.toFixed(1) : '∞' },
      { label: 'depth', value: metricState.depth },
      { label: 'error', value: metricState.error.toFixed(3) }
    ]
  }, [metricState.depth, metricState.error, metricState.leaves, metricState.ratio])

  const controls = [
    {
      id: 'compress',
      label: 'compress()',
      onClick: handleCompress
    },
    {
      id: 'auto',
      label: 'auto()',
      onClick: () => setAutoCompress(v => !v),
      active: autoCompress
    },
    {
      id: 'refine',
      label: 'refine()',
      onClick: () => handleThreshold('down')
    },
    {
      id: 'coarsen',
      label: 'coarsen()',
      onClick: () => handleThreshold('up')
    },
    {
      id: 'depth-up',
      label: 'depth++',
      onClick: () => handleDepth(1)
    },
    {
      id: 'depth-down',
      label: 'depth--',
      onClick: () => handleDepth(-1)
    },
    {
      id: 'ink',
      label: 'ink.brush()',
      onClick: () => toggleBrush('ink'),
      active: brush === 'ink'
    },
    {
      id: 'erase',
      label: 'erase.brush()',
      onClick: () => toggleBrush('erase'),
      active: brush === 'erase'
    },
    {
      id: 'seed',
      label: 'seed.grid()',
      onClick: seedPattern
    },
    {
      id: 'clear',
      label: 'wash()',
      onClick: clearField,
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={setMode}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs sm:text-right max-w-lg">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="quadtree-canvas"
        />
      </div>
    </div>
  )
}

export default QuadtreeCompress
