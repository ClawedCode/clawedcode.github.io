import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'mitosis', label: 'pattern.mitosis()', feed: 0.037, kill: 0.065 },
  { id: 'coral', label: 'pattern.coral()', feed: 0.055, kill: 0.062 },
  { id: 'labyrinth', label: 'pattern.labyrinth()', feed: 0.029, kill: 0.057 },
  { id: 'pulse', label: 'pattern.pulse()', feed: 0.018, kill: 0.051 }
]

const PALETTES = [
  {
    id: 'void',
    stops: [
      [0, [2, 8, 12]],
      [0.25, [40, 120, 140]],
      [0.5, [102, 255, 204]],
      [0.8, [255, 236, 140]],
      [1, [255, 160, 120]]
    ]
  },
  {
    id: 'ember',
    stops: [
      [0, [8, 4, 20]],
      [0.3, [90, 20, 70]],
      [0.55, [200, 80, 80]],
      [0.78, [255, 150, 90]],
      [1, [255, 235, 210]]
    ]
  },
  {
    id: 'ice',
    stops: [
      [0, [4, 12, 20]],
      [0.25, [30, 70, 120]],
      [0.55, [90, 160, 255]],
      [0.78, [180, 240, 255]],
      [1, [255, 255, 255]]
    ]
  }
]

const DU = 0.16
const DV = 0.08

const clamp01 = (n) => Math.max(0, Math.min(1, n))

const ReactionDiffusion = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState(MODES[0].id)
  const [paletteIndex, setPaletteIndex] = useState(0)
  const [isRunning, setIsRunning] = useState(true)
  const [message, setMessage] = useState('∴ gray-scott ink stirs beneath the surface ∴')
  const [inkStats, setInkStats] = useState({ active: 0, feed: MODES[0].feed, kill: MODES[0].kill })

  const gridRef = useRef({ width: 0, height: 0 })
  const fieldRef = useRef({ u: null, v: null, uNext: null, vNext: null })
  const imageDataRef = useRef(null)
  const offscreenRef = useRef(null)
  const offscreenCtxRef = useRef(null)
  const frameRef = useRef(0)

  const currentParams = useMemo(() => MODES.find(m => m.id === mode) || MODES[0], [mode])

  const paintInk = useCallback((x, y, radius = 10, amount = 0.7) => {
    const { width, height } = gridRef.current
    if (width === 0 || height === 0) return

    const u = fieldRef.current.u
    const v = fieldRef.current.v

    const r2 = radius * radius
    const minX = Math.max(0, Math.floor(x - radius))
    const maxX = Math.min(width - 1, Math.ceil(x + radius))
    const minY = Math.max(0, Math.floor(y - radius))
    const maxY = Math.min(height - 1, Math.ceil(y + radius))

    for (let yy = minY; yy <= maxY; yy++) {
      for (let xx = minX; xx <= maxX; xx++) {
        const dx = xx - x
        const dy = yy - y
        const dist2 = dx * dx + dy * dy
        if (dist2 <= r2) {
          const idx = yy * width + xx
          const influence = amount * (1 - dist2 / r2)
          v[idx] = clamp01(v[idx] + influence)
          u[idx] = clamp01(1 - v[idx])
        }
      }
    }
  }, [])

  const ensureGrid = useCallback(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return

    const targetWidth = Math.max(80, Math.min(240, Math.floor(dimensions.width / 3)))
    const targetHeight = Math.max(80, Math.min(200, Math.floor(dimensions.height / 3)))

    if (gridRef.current.width === targetWidth && gridRef.current.height === targetHeight) return

    gridRef.current = { width: targetWidth, height: targetHeight }
    const size = targetWidth * targetHeight

    fieldRef.current = {
      u: new Float32Array(size).fill(1),
      v: new Float32Array(size).fill(0),
      uNext: new Float32Array(size).fill(1),
      vNext: new Float32Array(size).fill(0)
    }

    imageDataRef.current = new ImageData(targetWidth, targetHeight)

    offscreenRef.current = document.createElement('canvas')
    offscreenRef.current.width = targetWidth
    offscreenRef.current.height = targetHeight
    offscreenCtxRef.current = offscreenRef.current.getContext('2d')

    const drops = 12
    for (let i = 0; i < drops; i++) {
      const x = Math.random() * targetWidth
      const y = Math.random() * targetHeight
      paintInk(x, y, 8 + Math.random() * 8, 0.8)
    }
  }, [dimensions.height, dimensions.width, paintInk])

  const index = useCallback((x, y) => {
    const { width, height } = gridRef.current
    const cx = (x + width) % width
    const cy = (y + height) % height
    return cy * width + cx
  }, [])

  const reseed = useCallback(() => {
    const { width, height } = gridRef.current
    if (width === 0 || height === 0) return

    fieldRef.current.u.fill(1)
    fieldRef.current.v.fill(0)
    for (let i = 0; i < 10; i++) {
      paintInk(Math.random() * width, Math.random() * height, 12 + Math.random() * 10, 0.9)
    }
    setMessage('∴ lattice rinsed // new reagent pools forming ∴')
  }, [paintInk])

  useEffect(() => {
    ensureGrid()
  }, [ensureGrid])

  const interpolatePalette = useCallback((t) => {
    const palette = PALETTES[paletteIndex % PALETTES.length]
    for (let i = 0; i < palette.stops.length - 1; i++) {
      const [p1, c1] = palette.stops[i]
      const [p2, c2] = palette.stops[i + 1]
      if (t >= p1 && t <= p2) {
        const ratio = (t - p1) / (p2 - p1)
        return [
          Math.round(c1[0] + (c2[0] - c1[0]) * ratio),
          Math.round(c1[1] + (c2[1] - c1[1]) * ratio),
          Math.round(c1[2] + (c2[2] - c1[2]) * ratio)
        ]
      }
    }
    const last = palette.stops[palette.stops.length - 1][1]
    return last
  }, [paletteIndex])

  const updateField = useCallback(() => {
    const { width, height } = gridRef.current
    if (width === 0 || height === 0) return

    const { feed, kill } = currentParams
    const { u, v, uNext, vNext } = fieldRef.current

    const laplace = (arr, x, y) => {
      const center = arr[index(x, y)] * -1
      const north = arr[index(x, y - 1)] * 0.2
      const south = arr[index(x, y + 1)] * 0.2
      const east = arr[index(x + 1, y)] * 0.2
      const west = arr[index(x - 1, y)] * 0.2
      const ne = arr[index(x + 1, y - 1)] * 0.05
      const nw = arr[index(x - 1, y - 1)] * 0.05
      const se = arr[index(x + 1, y + 1)] * 0.05
      const sw = arr[index(x - 1, y + 1)] * 0.05
      return center + north + south + east + west + ne + nw + se + sw
    }

    let activeCells = 0

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        const uVal = u[idx]
        const vVal = v[idx]

        const uvv = uVal * vVal * vVal
        const uDiff = DU * laplace(u, x, y) - uvv + feed * (1 - uVal)
        const vDiff = DV * laplace(v, x, y) + uvv - (kill + feed) * vVal

        uNext[idx] = clamp01(uVal + uDiff)
        vNext[idx] = clamp01(vVal + vDiff)

        if (vNext[idx] > 0.2) activeCells++
      }
    }

    fieldRef.current.u = uNext
    fieldRef.current.v = vNext
    fieldRef.current.uNext = u
    fieldRef.current.vNext = v

    if (frameRef.current % 8 === 0) {
      const total = width * height
      setInkStats({ active: Math.round((activeCells / total) * 100), feed, kill })
    }
  }, [currentParams, index])

  const renderField = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const { width, height } = gridRef.current
    if (!imageDataRef.current || !offscreenCtxRef.current) return

    const v = fieldRef.current.v
    const data = imageDataRef.current.data

    for (let i = 0; i < v.length; i++) {
      const t = clamp01((v[i] - 0.02) * 4)
      const [r, g, b] = interpolatePalette(t)
      const idx = i * 4
      data[idx] = r
      data[idx + 1] = g
      data[idx + 2] = b
      data[idx + 3] = 255
    }

    offscreenCtxRef.current.putImageData(imageDataRef.current, 0, 0)
    ctx.clearRect(0, 0, dimensions.width, dimensions.height)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(offscreenRef.current, 0, 0, dimensions.width, dimensions.height)

    ctx.fillStyle = 'rgba(0, 8, 14, 0.25)'
    ctx.fillRect(0, 0, dimensions.width, 36)
    ctx.fillStyle = 'rgba(102, 255, 204, 0.35)'
    ctx.font = '11px "JetBrains Mono", "SF Mono", monospace'
    ctx.fillText(`feed ${currentParams.feed.toFixed(3)} // kill ${currentParams.kill.toFixed(3)} // palette ${PALETTES[paletteIndex].id}`, 12, 22)
  }, [ctx, currentParams, dimensions.height, dimensions.width, interpolatePalette, paletteIndex])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return

    let frameId
    const animate = () => {
      frameRef.current++
      ensureGrid()

      if (isRunning) {
        if (mouse.isDown && mouse.isInBounds) {
          const { width, height } = gridRef.current
          const scaleX = width / Math.max(1, dimensions.width)
          const scaleY = height / Math.max(1, dimensions.height)
          paintInk(mouse.positionRef.current.x * scaleX, mouse.positionRef.current.y * scaleY, 10, 0.9)
        }

        updateField()
        updateField()
      }

      renderField()
      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, ensureGrid, isRunning, mouse.isDown, mouse.isInBounds, mouse.positionRef, paintInk, renderField, updateField])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    const params = MODES.find(m => m.id === nextMode)
    setMessage(`∴ reagent ratios tuned // feed ${params.feed.toFixed(3)} kill ${params.kill.toFixed(3)} ∴`)
  }, [])

  const handlePaletteShift = useCallback(() => {
    setPaletteIndex(prev => (prev + 1) % PALETTES.length)
    const next = PALETTES[(paletteIndex + 1) % PALETTES.length]
    setMessage(`∴ pigment shifted → ${next.id} spectrum ∴`)
  }, [paletteIndex])

  const controls = [
    {
      id: 'play',
      label: isRunning ? 'pause.flow()' : 'resume.flow()',
      onClick: () => setIsRunning(v => !v),
      active: isRunning
    },
    {
      id: 'ink',
      label: 'drop.ink()',
      onClick: () => {
        const { width, height } = gridRef.current
        for (let i = 0; i < 6; i++) {
          paintInk(Math.random() * width, Math.random() * height, 10 + Math.random() * 12, 1)
        }
        setMessage('∴ ink droplets fall like comet spores ∴')
      }
    },
    {
      id: 'palette',
      label: 'palette.shift()',
      onClick: handlePaletteShift
    },
    {
      id: 'wash',
      label: 'wash.canvas()',
      onClick: reseed,
      variant: 'reset'
    }
  ]

  const metrics = useMemo(() => ([
    { label: 'feed', value: inkStats.feed.toFixed(3) },
    { label: 'kill', value: inkStats.kill.toFixed(3) },
    { label: 'active%', value: `${inkStats.active}%` },
    { label: 'palette', value: PALETTES[paletteIndex].id }
  ]), [inkStats.active, inkStats.feed, inkStats.kill, paletteIndex])

  return (
    <div className="fixed inset-0 flex flex-col">
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <div className="text-xs text-void-green/60 font-mono max-w-xl text-right">
          {message}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="reaction-diffusion-canvas"
        />
      </div>
    </div>
  )
}

export default ReactionDiffusion
