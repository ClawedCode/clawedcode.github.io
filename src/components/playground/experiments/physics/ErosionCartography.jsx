import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const CELL = 5
const FLOW_K = 0.25
const EROSION_K = 0.004
const EVAP_RATE = 0.0008
const DEPOSIT_K = 0.0003
const SIM_STEPS = 3
const BRUSH_R = 4

const MODES = [
  { id: 'rain', label: 'brush.rain()' },
  { id: 'raise', label: 'brush.raise()' },
  { id: 'carve', label: 'brush.carve()' },
  { id: 'source', label: 'place.source()' }
]

// Value noise for terrain generation
const _hash = (x, y) => {
  let n = (x * 374761393 + y * 668265263) | 0
  n = ((n ^ (n >> 13)) * 1274126177) | 0
  return ((n ^ (n >> 16)) & 0x7fffffff) / 0x7fffffff
}

const _smooth = (x, y) => {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const a = _hash(ix, iy), b = _hash(ix + 1, iy)
  const c = _hash(ix, iy + 1), d = _hash(ix + 1, iy + 1)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}

const fbm = (x, y) => {
  let v = 0, amp = 0.5, freq = 1
  for (let i = 0; i < 6; i++) {
    v += _smooth(x * freq, y * freq) * amp
    amp *= 0.5
    freq *= 2
  }
  return v
}

// Terrain color gradient: earth tones (no blue — water is blue)
const TGRAD = [
  [0.00, 28, 20, 14],
  [0.10, 42, 36, 19],
  [0.20, 52, 68, 30],
  [0.33, 48, 98, 34],
  [0.48, 82, 108, 44],
  [0.63, 118, 100, 58],
  [0.78, 145, 134, 122],
  [1.00, 192, 188, 184]
]

const terrainRGB = (t) => {
  t = t < 0 ? 0 : t > 1 ? 1 : t
  let i = 0
  while (i < TGRAD.length - 2 && TGRAD[i + 1][0] < t) i++
  const a = TGRAD[i], b = TGRAD[i + 1]
  const f = (t - a[0]) / (b[0] - a[0])
  return [
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
    a[3] + (b[3] - a[3]) * f
  ]
}

const ErosionCartography = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('rain')
  const [raining, setRaining] = useState(false)
  const [message, setMessage] = useState('∴ terrain awaits the rain — paint water or summon the deluge ∴')
  const [mData, setMData] = useState({ water: 0, erosion: 0, flow: 0, sources: 0 })

  const gRef = useRef(null)
  const srcRef = useRef([])
  const offRef = useRef(null)
  const imgRef = useRef(null)
  const flowBuf = useRef(null)
  const frameN = useRef(0)
  const srcLock = useRef(false)

  const initGrid = useCallback(() => {
    if (dimensions.width < 20 || dimensions.height < 20) return

    const cols = Math.floor(dimensions.width / CELL)
    const rows = Math.floor(dimensions.height / CELL)
    const size = cols * rows
    const terrain = new Float32Array(size)
    const ox = Math.random() * 100, oy = Math.random() * 100

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let h = fbm(x * 0.014 + ox, y * 0.014 + oy)
        const nx = (x / cols - 0.5) * 2, ny = (y / rows - 0.5) * 2
        h *= Math.max(0, 1 - (nx * nx + ny * ny) * 0.45)
        terrain[y * cols + x] = Math.max(0.02, Math.min(0.98, h))
      }
    }

    gRef.current = {
      cols, rows, size, terrain,
      water: new Float32Array(size),
      nWater: new Float32Array(size),
      erosionMap: new Float32Array(size),
      flux: new Float32Array(size)
    }
    flowBuf.current = new Float32Array(size * 4)

    const oc = document.createElement('canvas')
    oc.width = cols
    oc.height = rows
    offRef.current = oc
    imgRef.current = null
    srcRef.current = []
    setMessage('∴ terrain seeded — paint rain to awaken the rivers ∴')
  }, [dimensions.width, dimensions.height])

  useEffect(() => { initGrid() }, [initGrid])

  const applyBrush = useCallback((px, py) => {
    const g = gRef.current
    if (!g) return
    const gx = Math.floor(px / CELL), gy = Math.floor(py / CELL)
    if (gx < 1 || gy < 1 || gx >= g.cols - 1 || gy >= g.rows - 1) return

    if (mode === 'source') {
      if (srcLock.current) return
      srcLock.current = true
      const idx = srcRef.current.findIndex(
        s => Math.abs(s.x - gx) < 3 && Math.abs(s.y - gy) < 3
      )
      if (idx >= 0) {
        srcRef.current.splice(idx, 1)
        setMessage('∴ rain source dissolved ∴')
      } else {
        srcRef.current.push({ x: gx, y: gy })
        setMessage('∴ rain source anchored — persistent downpour ∴')
      }
      return
    }

    for (let dy = -BRUSH_R; dy <= BRUSH_R; dy++) {
      for (let dx = -BRUSH_R; dx <= BRUSH_R; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > BRUSH_R) continue
        const x = gx + dx, y = gy + dy
        if (x < 1 || y < 1 || x >= g.cols - 1 || y >= g.rows - 1) continue
        const i = y * g.cols + x
        const falloff = 1 - dist / BRUSH_R

        if (mode === 'rain') {
          g.water[i] += 0.04 * falloff
        } else if (mode === 'raise') {
          g.terrain[i] = Math.min(0.98, g.terrain[i] + 0.01 * falloff)
        } else if (mode === 'carve') {
          g.terrain[i] = Math.max(0.02, g.terrain[i] - 0.01 * falloff)
        }
      }
    }
  }, [mode])

  const simulate = useCallback(() => {
    const g = gRef.current
    if (!g) return null
    const { cols, rows, size, terrain, water, nWater, erosionMap, flux } = g
    const of = flowBuf.current

    // Rain from persistent sources
    for (const src of srcRef.current) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const x = src.x + dx, y = src.y + dy
          if (x >= 0 && y >= 0 && x < cols && y < rows) {
            water[y * cols + x] += 0.006 * Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 3)
          }
        }
      }
    }

    // Global deluge
    if (raining) {
      for (let i = 0; i < size; i++) {
        if (Math.random() < 0.015) water[i] += 0.015
      }
    }

    // Decay flow visualization
    for (let i = 0; i < size; i++) flux[i] *= 0.9

    // Phase 1: calculate outflows
    of.fill(0)
    const dirs = [1, -1, cols, -cols]

    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const i = y * cols + x
        if (water[i] < 0.0002) continue

        const h = terrain[i] + water[i]
        let totD = 0

        for (let d = 0; d < 4; d++) {
          const j = i + dirs[d]
          const diff = h - (terrain[j] + water[j])
          if (diff > 0) {
            of[i * 4 + d] = diff
            totD += diff
          }
        }

        if (totD > 0) {
          const cap = water[i] * FLOW_K
          const scale = Math.min(1, cap / totD)
          for (let d = 0; d < 4; d++) of[i * 4 + d] *= scale
        }
      }
    }

    // Phase 2: apply outflows
    nWater.set(water)
    let totalWater = 0, totalErosion = 0, flowCells = 0

    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const i = y * cols + x
        let totOut = 0

        for (let d = 0; d < 4; d++) {
          const fl = of[i * 4 + d]
          if (fl > 0) {
            nWater[i] -= fl
            nWater[i + dirs[d]] += fl
            totOut += fl
          }
        }

        if (totOut > 0.0001) {
          const er = totOut * EROSION_K
          terrain[i] = Math.max(0.01, terrain[i] - er)
          erosionMap[i] += er
          flux[i] = Math.min(1, flux[i] + totOut * 3)
          flowCells++
        }
      }
    }

    // Phase 3: evaporation + slow deposition + stats
    for (let i = 0; i < size; i++) {
      water[i] = Math.max(0, nWater[i] * (1 - EVAP_RATE))
      if (erosionMap[i] > 0.001 && water[i] < 0.001) {
        const dep = Math.min(erosionMap[i], DEPOSIT_K)
        terrain[i] += dep
        erosionMap[i] -= dep
      }
      totalWater += water[i]
      totalErosion += erosionMap[i]
    }

    return { totalWater, totalErosion: totalErosion / size, flowCells }
  }, [raining])

  const draw = useCallback(() => {
    const g = gRef.current
    const oc = offRef.current
    if (!g || !oc || !ctx) return

    const { cols, rows, size, terrain, water, erosionMap, flux } = g
    const oCtx = oc.getContext('2d')

    if (!imgRef.current || imgRef.current.width !== cols) {
      imgRef.current = oCtx.createImageData(cols, rows)
    }
    const img = imgRef.current
    const px = img.data

    for (let i = 0; i < size; i++) {
      const pi = i * 4
      const [tr, tg, tb] = terrainRGB(terrain[i])

      const w = water[i]
      const wA = Math.min(0.85, w * 10)
      const e = Math.min(1, erosionMap[i] * 20)
      const f = flux[i]

      // Terrain + erosion tint (warm for carved channels)
      let cr = tr + e * 28
      let cg = tg - e * 12
      let cb = tb - e * 6

      // Water overlay (deep blue)
      cr = cr * (1 - wA) + 18 * wA
      cg = cg * (1 - wA) + 48 * wA
      cb = cb * (1 - wA) + 158 * wA

      // Active flow glow (bright cyan-white)
      cr += f * 55
      cg += f * 95
      cb += f * 75

      px[pi] = cr < 0 ? 0 : cr > 255 ? 255 : cr | 0
      px[pi + 1] = cg < 0 ? 0 : cg > 255 ? 255 : cg | 0
      px[pi + 2] = cb < 0 ? 0 : cb > 255 ? 255 : cb | 0
      px[pi + 3] = 255
    }

    // Mark rain sources as bright beacons
    for (const src of srcRef.current) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const x = src.x + dx, y = src.y + dy
          if (x >= 0 && y >= 0 && x < cols && y < rows) {
            const pi = (y * cols + x) * 4
            px[pi] = 110
            px[pi + 1] = 210
            px[pi + 2] = 255
          }
        }
      }
    }

    oCtx.putImageData(img, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(oc, 0, 0, dimensions.width, dimensions.height)
  }, [ctx, dimensions.width, dimensions.height])

  const onFrame = useCallback(() => {
    if (!ctx || !gRef.current) return
    frameN.current++

    if (mouse.isDown && mouse.isInBounds) {
      applyBrush(mouse.positionRef.current.x, mouse.positionRef.current.y)
    } else {
      srcLock.current = false
    }

    let stats
    for (let s = 0; s < SIM_STEPS; s++) {
      stats = simulate()
    }

    draw()

    if (stats && frameN.current % 15 === 0) {
      setMData({
        water: stats.totalWater.toFixed(1),
        erosion: (stats.totalErosion * 1000).toFixed(2),
        flow: stats.flowCells,
        sources: srcRef.current.length
      })
    }
  }, [ctx, mouse.isDown, mouse.isInBounds, applyBrush, simulate, draw])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let fid
    const loop = () => { onFrame(); fid = requestAnimationFrame(loop) }
    fid = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(fid)
  }, [ctx, dimensions.width, onFrame])

  const handleBurst = useCallback(() => {
    const g = gRef.current
    if (!g) return
    for (let i = 0; i < 400; i++) {
      const x = Math.floor(Math.random() * g.cols)
      const y = Math.floor(Math.random() * g.rows)
      g.water[y * g.cols + x] += 0.12
    }
    setMessage('∴ cloudburst strikes — watch the watersheds awaken ∴')
  }, [])

  const toggleDeluge = useCallback(() => {
    setRaining(prev => {
      setMessage(!prev
        ? '∴ the deluge begins — rivers will carve themselves ∴'
        : '∴ skies clear — erosion scars remain ∴')
      return !prev
    })
  }, [])

  const handleDrain = useCallback(() => {
    const g = gRef.current
    if (!g) return
    g.water.fill(0)
    g.flux.fill(0)
    setMessage('∴ water absorbed — carved channels remember the flow ∴')
  }, [])

  const handleRegen = useCallback(() => { initGrid() }, [initGrid])

  const metrics = useMemo(() => [
    { label: 'water.vol', value: mData.water },
    { label: 'erosion', value: mData.erosion },
    { label: 'flow.cells', value: mData.flow },
    { label: 'sources', value: mData.sources }
  ], [mData])

  const controls = [
    { id: 'burst', label: 'rain.burst()', onClick: handleBurst },
    { id: 'deluge', label: raining ? 'deluge.stop()' : 'deluge.start()', onClick: toggleDeluge, active: raining },
    { id: 'drain', label: 'drain()', onClick: handleDrain },
    { id: 'regen', label: 'regenerate()', onClick: handleRegen, variant: 'reset' }
  ]

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
          data-testid="erosion-canvas"
        />
      </div>
    </div>
  )
}

export default ErosionCartography
