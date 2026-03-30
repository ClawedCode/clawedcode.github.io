import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const GRID = 128
const MASK = GRID - 1

const bell = (x, m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s))

const PRESETS = {
  orbium: { label: 'orbium', R: 13, kMu: 0.5, kSig: 0.15, gMu: 0.15, gSig: 0.015, dt: 0.1 },
  geminium: { label: 'geminium', R: 13, kMu: 0.5, kSig: 0.15, gMu: 0.14, gSig: 0.014, dt: 0.1 },
  scutium: { label: 'scutium', R: 13, kMu: 0.5, kSig: 0.15, gMu: 0.22, gSig: 0.010, dt: 0.05 },
  primordia: { label: 'primordia', R: 13, kMu: 0.5, kSig: 0.15, gMu: 0.12, gSig: 0.024, dt: 0.1 }
}

const PRESET_KEYS = Object.keys(PRESETS)

function buildKernel(R, kMu, kSig) {
  const temp = []
  let total = 0
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const r = Math.sqrt(dx * dx + dy * dy)
      if (r > R || r < 0.5) continue
      const w = bell(r / R, kMu, kSig)
      if (w > 0.001) {
        temp.push({ dx, dy, w })
        total += w
      }
    }
  }
  const n = temp.length
  const kdx = new Int8Array(n)
  const kdy = new Int8Array(n)
  const kw = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    kdx[i] = temp[i].dx
    kdy[i] = temp[i].dy
    kw[i] = temp[i].w / total
  }
  return { kdx, kdy, kw, n }
}

function buildColorLUT() {
  const lut = new Uint8Array(256 * 4)
  const stops = [
    [0.00, 0, 2, 8],
    [0.05, 3, 14, 30],
    [0.15, 8, 40, 60],
    [0.30, 15, 90, 100],
    [0.50, 40, 170, 150],
    [0.70, 66, 255, 204],
    [0.85, 160, 255, 235],
    [1.00, 240, 255, 250]
  ]
  for (let i = 0; i < 256; i++) {
    const t = i / 255
    let lo = 0, hi = stops.length - 1
    for (let s = 1; s < stops.length; s++) {
      if (t <= stops[s][0]) { lo = s - 1; hi = s; break }
    }
    const range = stops[hi][0] - stops[lo][0]
    const f = range > 0 ? (t - stops[lo][0]) / range : 0
    lut[i * 4]     = Math.round(stops[lo][1] + (stops[hi][1] - stops[lo][1]) * f)
    lut[i * 4 + 1] = Math.round(stops[lo][2] + (stops[hi][2] - stops[lo][2]) * f)
    lut[i * 4 + 2] = Math.round(stops[lo][3] + (stops[hi][3] - stops[lo][3]) * f)
    lut[i * 4 + 3] = 255
  }
  return lut
}

const MODES = [
  { id: 'observe', label: 'observe' },
  { id: 'paint', label: 'paint' },
  { id: 'erase', label: 'erase' }
]

const LeniaGenesis = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [preset, setPreset] = useState('orbium')
  const [brushMode, setBrushMode] = useState('observe')
  const [running, setRunning] = useState(true)
  const [displayGen, setDisplayGen] = useState(0)
  const [displayDensity, setDisplayDensity] = useState('0.0')
  const [displayFlux, setDisplayFlux] = useState('dormant')
  const [displayPeak, setDisplayPeak] = useState('0.00')
  const [message, setMessage] = useState('\u2234 orbium awakens \u2014 click anywhere to seed life \u2234')

  const brushModeRef = useRef('observe')
  const runningRef = useRef(true)
  const isDrawingRef = useRef(false)
  const isInBoundsRef = useRef(false)
  const gridRef = useRef({ a: new Float32Array(GRID * GRID), b: new Float32Array(GRID * GRID) })
  const kernelRef = useRef(buildKernel(13, 0.5, 0.15))
  const paramsRef = useRef({ ...PRESETS.orbium })
  const genRef = useRef(0)
  const statsRef = useRef({ mass: 0, peak: 0, flux: 0 })
  const frameRef = useRef(0)
  const offRef = useRef(null)
  const offCtxRef = useRef(null)
  const imgRef = useRef(null)
  const lutRef = useRef(buildColorLUT())

  useEffect(() => { brushModeRef.current = brushMode }, [brushMode])
  useEffect(() => { runningRef.current = running }, [running])

  useEffect(() => {
    const c = document.createElement('canvas')
    c.width = GRID
    c.height = GRID
    offRef.current = c
    offCtxRef.current = c.getContext('2d')
    imgRef.current = offCtxRef.current.createImageData(GRID, GRID)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const down = () => { isDrawingRef.current = true }
    const up = () => { isDrawingRef.current = false }
    const enter = () => { isInBoundsRef.current = true }
    const leave = () => { isInBoundsRef.current = false; isDrawingRef.current = false }
    canvas.addEventListener('mousedown', down)
    canvas.addEventListener('touchstart', down, { passive: true })
    canvas.addEventListener('mouseenter', enter)
    canvas.addEventListener('mouseleave', leave)
    window.addEventListener('mouseup', up)
    window.addEventListener('touchend', up)
    return () => {
      canvas.removeEventListener('mousedown', down)
      canvas.removeEventListener('touchstart', down)
      canvas.removeEventListener('mouseenter', enter)
      canvas.removeEventListener('mouseleave', leave)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('touchend', up)
    }
  }, [canvasRef])

  const stampOrganism = useCallback((cx, cy, radius = 12) => {
    const grid = gridRef.current.a
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const r = Math.sqrt(dx * dx + dy * dy)
        if (r > radius) continue
        const x = (cx + dx + GRID) & MASK
        const y = (cy + dy + GRID) & MASK
        const t = r / radius
        const val = Math.exp(-t * t * 3) * 0.7 + Math.random() * 0.05
        const idx = y * GRID + x
        grid[idx] = Math.max(grid[idx], Math.min(1, val))
      }
    }
  }, [])

  const seedField = useCallback(() => {
    gridRef.current.a.fill(0)
    stampOrganism(GRID >> 1, GRID >> 1, 12)
    stampOrganism(GRID >> 2, (GRID / 3) | 0, 9)
    stampOrganism((GRID * 3) >> 2, ((GRID * 2) / 3) | 0, 9)
    genRef.current = 0
    setDisplayGen(0)
    setMessage('\u2234 organisms seeded \u2014 watch what emerges \u2234')
  }, [stampOrganism])

  useEffect(() => { seedField() }, [seedField])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handleClick = (e) => {
      if (brushModeRef.current !== 'observe') return
      const rect = canvas.getBoundingClientRect()
      const gx = Math.floor(((e.clientX - rect.left) / rect.width) * GRID)
      const gy = Math.floor(((e.clientY - rect.top) / rect.height) * GRID)
      stampOrganism(gx, gy, 7 + Math.floor(Math.random() * 6))
    }
    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [canvasRef, stampOrganism])

  const applyPreset = useCallback((name) => {
    const p = PRESETS[name]
    if (!p) return
    paramsRef.current = { ...p }
    kernelRef.current = buildKernel(p.R, p.kMu, p.kSig)
    setPreset(name)
    gridRef.current.a.fill(0)
    stampOrganism(GRID >> 1, GRID >> 1, 12)
    stampOrganism(GRID >> 2, (GRID / 3) | 0, 9)
    stampOrganism((GRID * 3) >> 2, ((GRID * 2) / 3) | 0, 9)
    genRef.current = 0
    setDisplayGen(0)
    setMessage(`\u2234 ${p.label} \u2014 parameters loaded \u2234`)
  }, [stampOrganism])

  const stepSimulation = useCallback(() => {
    const grids = gridRef.current
    const src = grids.a, dst = grids.b
    const { kdx, kdy, kw, n: kn } = kernelRef.current
    const p = paramsRef.current

    let totalMass = 0, peak = 0, totalFlux = 0

    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        let u = 0
        for (let ki = 0; ki < kn; ki++) {
          u += src[((y + kdy[ki] + GRID) & MASK) * GRID + ((x + kdx[ki] + GRID) & MASK)] * kw[ki]
        }
        const g = 2 * bell(u, p.gMu, p.gSig) - 1
        const idx = y * GRID + x
        const nv = Math.max(0, Math.min(1, src[idx] + p.dt * g))
        dst[idx] = nv
        totalMass += nv
        if (nv > peak) peak = nv
        totalFlux += Math.abs(nv - src[idx])
      }
    }

    grids.a = dst
    grids.b = src
    statsRef.current = { mass: totalMass, peak, flux: totalFlux }
    genRef.current++
  }, [])

  const updateDisplay = useCallback(() => {
    const s = statsRef.current
    setDisplayGen(genRef.current)
    setDisplayDensity((s.mass / (GRID * GRID) * 100).toFixed(1))
    setDisplayFlux(s.flux > 80 ? 'volatile' : s.flux > 10 ? 'alive' : s.flux > 1 ? 'stable' : 'dormant')
    setDisplayPeak(s.peak.toFixed(2))
  }, [])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0 || !imgRef.current) return

    const w = dimensions.width, h = dimensions.height

    if (isDrawingRef.current && brushModeRef.current !== 'observe') {
      const pos = mouse.positionRef.current
      const gx = Math.floor((pos.x / w) * GRID)
      const gy = Math.floor((pos.y / h) * GRID)
      const brushR = 5
      const grid = gridRef.current.a
      const erase = brushModeRef.current === 'erase'
      for (let dy = -brushR; dy <= brushR; dy++) {
        for (let dx = -brushR; dx <= brushR; dx++) {
          const r = Math.sqrt(dx * dx + dy * dy)
          if (r > brushR) continue
          const idx = ((gy + dy + GRID) & MASK) * GRID + ((gx + dx + GRID) & MASK)
          const f = 1 - r / brushR
          grid[idx] = erase
            ? Math.max(0, grid[idx] - f * 0.2)
            : Math.min(1, grid[idx] + f * 0.15)
        }
      }
    }

    frameRef.current++
    if (runningRef.current && frameRef.current % 2 === 0) {
      stepSimulation()
    }

    const grid = gridRef.current.a
    const data = imgRef.current.data
    const lut = lutRef.current
    for (let i = 0; i < GRID * GRID; i++) {
      const ci = Math.max(0, Math.min(255, (grid[i] * 255) | 0)) * 4
      const pi = i * 4
      data[pi]     = lut[ci]
      data[pi + 1] = lut[ci + 1]
      data[pi + 2] = lut[ci + 2]
      data[pi + 3] = 255
    }
    offCtxRef.current.putImageData(imgRef.current, 0, 0)

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(offRef.current, 0, 0, w, h)

    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.65)
    vig.addColorStop(0, 'rgba(0, 2, 8, 0)')
    vig.addColorStop(1, 'rgba(0, 2, 8, 0.4)')
    ctx.fillStyle = vig
    ctx.fillRect(0, 0, w, h)

    if (brushModeRef.current !== 'observe' && isInBoundsRef.current) {
      const pos = mouse.positionRef.current
      const sr = (5 / GRID) * Math.min(w, h)
      ctx.strokeStyle = brushModeRef.current === 'erase' ? 'rgba(255, 100, 100, 0.5)' : 'rgba(102, 255, 204, 0.5)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, sr, 0, Math.PI * 2)
      ctx.stroke()
    }

    if (frameRef.current % 16 === 0) updateDisplay()
  }, [ctx, dimensions, mouse.positionRef, stepSimulation, updateDisplay])

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
    { label: 'gen', value: displayGen },
    { label: 'density', value: `${displayDensity}%` },
    { label: 'flux', value: displayFlux },
    { label: 'peak', value: displayPeak }
  ], [displayGen, displayDensity, displayFlux, displayPeak])

  const controls = useMemo(() => [
    {
      id: 'run',
      label: running ? 'pause()' : 'resume()',
      onClick: () => setRunning(r => { setMessage(!r ? '\u2234 time flows \u2234' : '\u2234 time suspended \u2234'); return !r }),
      active: running
    },
    {
      id: 'step',
      label: 'step()',
      onClick: () => { stepSimulation(); updateDisplay() },
      disabled: running
    },
    {
      id: 'seed',
      label: 'seed()',
      onClick: seedField
    },
    {
      id: 'clear',
      label: 'clear()',
      onClick: () => {
        gridRef.current.a.fill(0)
        genRef.current = 0
        statsRef.current = { mass: 0, peak: 0, flux: 0 }
        updateDisplay()
        setMessage('\u2234 tabula rasa \u2014 the field awaits \u2234')
      },
      variant: 'reset'
    }
  ], [running, stepSimulation, updateDisplay, seedField])

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

      <div className="flex flex-col gap-2 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ExperimentControls
            modes={MODES}
            currentMode={brushMode}
            onModeChange={m => {
              setBrushMode(m)
              setMessage(m === 'observe' ? '\u2234 click to seed organisms \u2234' : m === 'paint' ? '\u2234 painting living matter \u2234' : '\u2234 erasing matter \u2234')
            }}
            controls={controls}
          />
          <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">{message}</p>
        </div>
        <div className="flex flex-wrap gap-1 sm:gap-2 items-center">
          <span className="text-void-green/40 text-xs mr-1">species:</span>
          {PRESET_KEYS.map(name => (
            <button
              key={name}
              onClick={() => applyPreset(name)}
              className={`min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1 text-sm sm:text-xs font-mono border transition-colors active:scale-95 ${
                preset === name
                  ? 'border-void-cyan bg-void-cyan/20 text-void-cyan'
                  : 'border-void-green/30 text-void-green/60 hover:border-void-green/60 hover:text-void-green active:bg-void-green/10'
              }`}
              data-testid={`preset-${name}`}
            >
              {PRESETS[name].label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full ${brushMode === 'observe' ? 'cursor-pointer' : 'cursor-crosshair'}`}
          data-testid="lenia-canvas"
        />
      </div>
    </div>
  )
}

export default LeniaGenesis
