import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

// --- Stable Fluids Solver (Jos Stam, 1999) ---
const N = 128
const S = (N + 2) * (N + 2)
const IX = (i, j) => i + (N + 2) * j
const ITERS = 10

function addSource(x, s, dt) {
  for (let i = 0; i < S; i++) x[i] += dt * s[i]
}

function setBnd(b, x) {
  for (let i = 1; i <= N; i++) {
    x[IX(0, i)]   = b === 1 ? -x[IX(1, i)] : x[IX(1, i)]
    x[IX(N+1, i)] = b === 1 ? -x[IX(N, i)] : x[IX(N, i)]
    x[IX(i, 0)]   = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)]
    x[IX(i, N+1)] = b === 2 ? -x[IX(i, N)] : x[IX(i, N)]
  }
  x[IX(0, 0)]     = 0.5 * (x[IX(1, 0)] + x[IX(0, 1)])
  x[IX(0, N+1)]   = 0.5 * (x[IX(1, N+1)] + x[IX(0, N)])
  x[IX(N+1, 0)]   = 0.5 * (x[IX(N, 0)] + x[IX(N+1, 1)])
  x[IX(N+1, N+1)] = 0.5 * (x[IX(N, N+1)] + x[IX(N+1, N)])
}

function solveDiffuse(b, x, x0, diff, dt) {
  const a = dt * diff * N * N
  if (a === 0) { for (let i = 0; i < S; i++) x[i] = x0[i]; return }
  const denom = 1 + 4 * a
  for (let k = 0; k < ITERS; k++) {
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        x[IX(i, j)] = (x0[IX(i, j)] + a * (
          x[IX(i-1, j)] + x[IX(i+1, j)] +
          x[IX(i, j-1)] + x[IX(i, j+1)]
        )) / denom
      }
    }
    setBnd(b, x)
  }
}

function advect(b, d, d0, u, v, dt) {
  const dt0 = dt * N
  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      let x = i - dt0 * u[IX(i, j)]
      let y = j - dt0 * v[IX(i, j)]
      x = Math.max(0.5, Math.min(N + 0.5, x))
      y = Math.max(0.5, Math.min(N + 0.5, y))
      const i0 = Math.floor(x), i1 = i0 + 1
      const j0 = Math.floor(y), j1 = j0 + 1
      const s1 = x - i0, s0 = 1 - s1
      const t1 = y - j0, t0 = 1 - t1
      d[IX(i, j)] = s0 * (t0 * d0[IX(i0, j0)] + t1 * d0[IX(i0, j1)]) +
                    s1 * (t0 * d0[IX(i1, j0)] + t1 * d0[IX(i1, j1)])
    }
  }
  setBnd(b, d)
}

function project(u, v, p, div) {
  const h = 1.0 / N
  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      div[IX(i, j)] = -0.5 * h * (
        u[IX(i+1, j)] - u[IX(i-1, j)] +
        v[IX(i, j+1)] - v[IX(i, j-1)]
      )
      p[IX(i, j)] = 0
    }
  }
  setBnd(0, div); setBnd(0, p)
  for (let k = 0; k < ITERS; k++) {
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        p[IX(i, j)] = (div[IX(i, j)] +
          p[IX(i-1, j)] + p[IX(i+1, j)] +
          p[IX(i, j-1)] + p[IX(i, j+1)]) / 4
      }
    }
    setBnd(0, p)
  }
  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      u[IX(i, j)] -= 0.5 * (p[IX(i+1, j)] - p[IX(i-1, j)]) * N
      v[IX(i, j)] -= 0.5 * (p[IX(i, j+1)] - p[IX(i, j-1)]) * N
    }
  }
  setBnd(1, u); setBnd(2, v)
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }
  return [f(p, q, h + 1/3), f(p, q, h), f(p, q, h - 1/3)]
}

// --- Mode configurations ---
const MODES = [
  { id: 'laminar', label: 'laminar()' },
  { id: 'chaotic', label: 'chaotic()' },
  { id: 'paint', label: 'paint()' }
]

const VISCOSITY = { laminar: 0.00008, chaotic: 0.000002, paint: 0 }
const DIFFUSION = { laminar: 0.00002, chaotic: 0.000001, paint: 0 }
const DT = 0.1

const FluidRites = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('chaotic')
  const [message, setMessage] = useState('drag to inscribe fluid intention into the field')
  const [tick, setTick] = useState(0)

  const fieldsRef = useRef(null)
  const offscreenRef = useRef(null)
  const imageRef = useRef(null)
  const prevMouseRef = useRef({ x: -1, y: -1 })
  const hueRef = useRef(0)
  const statsRef = useRef({ energy: '0', ink: 0, curl: '0' })
  const frameRef = useRef(0)

  // Allocate simulation fields
  useEffect(() => {
    const alloc = () => new Float32Array(S)
    fieldsRef.current = {
      u: alloc(), v: alloc(), u0: alloc(), v0: alloc(),
      dr: alloc(), dg: alloc(), db: alloc(),
      dr0: alloc(), dg0: alloc(), db0: alloc()
    }
    offscreenRef.current = document.createElement('canvas')
    offscreenRef.current.width = N + 2
    offscreenRef.current.height = N + 2
    imageRef.current = new ImageData(N + 2, N + 2)
  }, [])

  // Inject velocity and dye at a grid point with a brush radius
  const injectAt = useCallback((gi, gj, fu, fv, r, g, b, radius = 4) => {
    const f = fieldsRef.current
    if (!f) return
    const r2 = radius * radius
    const minI = Math.max(1, gi - radius), maxI = Math.min(N, gi + radius)
    const minJ = Math.max(1, gj - radius), maxJ = Math.min(N, gj + radius)
    for (let j = minJ; j <= maxJ; j++) {
      for (let i = minI; i <= maxI; i++) {
        const d2 = (i - gi) * (i - gi) + (j - gj) * (j - gj)
        if (d2 > r2) continue
        const w = 1 - Math.sqrt(d2) / radius
        const idx = IX(i, j)
        f.u0[idx] += fu * w
        f.v0[idx] += fv * w
        f.dr0[idx] += r * w
        f.dg0[idx] += g * w
        f.db0[idx] += b * w
      }
    }
  }, [])

  // Process mouse input each frame
  const processMouseInput = useCallback(() => {
    if (!mouse.isDown || !mouse.isInBounds || dimensions.width === 0) {
      if (!mouse.isDown) prevMouseRef.current = { x: -1, y: -1 }
      return
    }

    const pos = mouse.positionRef.current
    const prev = prevMouseRef.current
    const gi = Math.max(1, Math.min(N, Math.floor(pos.x / dimensions.width * N) + 1))
    const gj = Math.max(1, Math.min(N, Math.floor(pos.y / dimensions.height * N) + 1))

    const [cr, cg, cb] = hslToRgb(hueRef.current, 0.9, 0.6)

    if (prev.x >= 0) {
      const pgi = Math.max(1, Math.min(N, Math.floor(prev.x / dimensions.width * N) + 1))
      const pgj = Math.max(1, Math.min(N, Math.floor(prev.y / dimensions.height * N) + 1))
      const dx = gi - pgi, dy = gj - pgj
      const force = 5.0
      injectAt(gi, gj, dx * force, dy * force, cr * 200, cg * 200, cb * 200)
    } else {
      injectAt(gi, gj, 0, 0, cr * 120, cg * 120, cb * 120)
    }

    prevMouseRef.current = { x: pos.x, y: pos.y }
  }, [mouse.isDown, mouse.isInBounds, mouse.positionRef, dimensions, injectAt])

  // Run one simulation step
  const stepFluid = useCallback(() => {
    const f = fieldsRef.current
    if (!f) return

    const visc = VISCOSITY[mode]
    const diff = DIFFUSION[mode]

    if (mode === 'paint') {
      addSource(f.dr, f.dr0, DT)
      addSource(f.dg, f.dg0, DT)
      addSource(f.db, f.db0, DT)
      f.u0.fill(0); f.v0.fill(0)
      f.dr0.fill(0); f.dg0.fill(0); f.db0.fill(0)
      return
    }

    // --- Velocity step ---
    addSource(f.u, f.u0, DT)
    addSource(f.v, f.v0, DT)

    let tmp
    tmp = f.u0; f.u0 = f.u; f.u = tmp
    solveDiffuse(1, f.u, f.u0, visc, DT)
    tmp = f.v0; f.v0 = f.v; f.v = tmp
    solveDiffuse(2, f.v, f.v0, visc, DT)
    project(f.u, f.v, f.u0, f.v0)

    tmp = f.u0; f.u0 = f.u; f.u = tmp
    tmp = f.v0; f.v0 = f.v; f.v = tmp
    advect(1, f.u, f.u0, f.u0, f.v0, DT)
    advect(2, f.v, f.v0, f.u0, f.v0, DT)
    project(f.u, f.v, f.u0, f.v0)

    // --- Density step (RGB channels) ---
    addSource(f.dr, f.dr0, DT)
    addSource(f.dg, f.dg0, DT)
    addSource(f.db, f.db0, DT)

    tmp = f.dr0; f.dr0 = f.dr; f.dr = tmp
    solveDiffuse(0, f.dr, f.dr0, diff, DT)
    tmp = f.dr0; f.dr0 = f.dr; f.dr = tmp
    advect(0, f.dr, f.dr0, f.u, f.v, DT)

    tmp = f.dg0; f.dg0 = f.dg; f.dg = tmp
    solveDiffuse(0, f.dg, f.dg0, diff, DT)
    tmp = f.dg0; f.dg0 = f.dg; f.dg = tmp
    advect(0, f.dg, f.dg0, f.u, f.v, DT)

    tmp = f.db0; f.db0 = f.db; f.db = tmp
    solveDiffuse(0, f.db, f.db0, diff, DT)
    tmp = f.db0; f.db0 = f.db; f.db = tmp
    advect(0, f.db, f.db0, f.u, f.v, DT)

    // Slow density decay
    for (let i = 0; i < S; i++) {
      f.dr[i] *= 0.998
      f.dg[i] *= 0.998
      f.db[i] *= 0.998
    }

    // Clear source buffers
    f.u0.fill(0); f.v0.fill(0)
    f.dr0.fill(0); f.dg0.fill(0); f.db0.fill(0)
  }, [mode])

  // Render density field to canvas
  const render = useCallback(() => {
    if (!ctx || !fieldsRef.current || dimensions.width === 0) return

    const f = fieldsRef.current
    const image = imageRef.current
    const data = image.data

    for (let j = 0; j < N + 2; j++) {
      for (let i = 0; i < N + 2; i++) {
        const idx = IX(i, j)
        const pIdx = (j * (N + 2) + i) * 4
        const speed = Math.sqrt(f.u[idx] * f.u[idx] + f.v[idx] * f.v[idx])
        const velGlow = Math.min(25, speed * 8)

        data[pIdx]     = Math.min(255, f.dr[idx] * 2.5 + 1 + velGlow * 0.2)
        data[pIdx + 1] = Math.min(255, f.dg[idx] * 2.5 + 3 + velGlow * 0.5)
        data[pIdx + 2] = Math.min(255, f.db[idx] * 2.5 + 6 + velGlow * 0.8)
        data[pIdx + 3] = 255
      }
    }

    const offCtx = offscreenRef.current.getContext('2d')
    offCtx.putImageData(image, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(offscreenRef.current, 0, 0, dimensions.width, dimensions.height)
  }, [ctx, dimensions])

  // Compute stats periodically
  const computeStats = useCallback(() => {
    const f = fieldsRef.current
    if (!f) return
    let energy = 0, ink = 0, curlSum = 0
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        const idx = IX(i, j)
        energy += f.u[idx] * f.u[idx] + f.v[idx] * f.v[idx]
        ink += f.dr[idx] + f.dg[idx] + f.db[idx]
        const dudy = f.u[IX(i, j+1)] - f.u[IX(i, j-1)]
        const dvdx = f.v[IX(i+1, j)] - f.v[IX(i-1, j)]
        curlSum += Math.abs(dvdx - dudy)
      }
    }
    const cells = N * N
    statsRef.current = {
      energy: (energy / cells).toFixed(3),
      ink: Math.floor(ink / 3),
      curl: (curlSum / cells).toFixed(3)
    }
    setTick(t => t + 1)
  }, [])

  // Main animation loop
  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let frameId
    const animate = () => {
      hueRef.current = (hueRef.current + 0.3) % 360
      processMouseInput()
      stepFluid()
      render()
      frameRef.current++
      if (frameRef.current % 10 === 0) computeStats()
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, processMouseInput, stepFluid, render, computeStats])

  // --- Control handlers ---
  const handleVortex = useCallback(() => {
    const f = fieldsRef.current
    if (!f) return
    const cx = N / 2, cy = N / 2, radius = N / 4
    const [cr, cg, cb] = hslToRgb(hueRef.current, 0.9, 0.6)
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        const dx = i - cx, dy = j - cy
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < radius && d > 2) {
          const w = 5.0 * (1 - d / radius)
          f.u0[IX(i, j)] += (-dy / d) * w
          f.v0[IX(i, j)] += (dx / d) * w
        }
        if (d < radius * 0.8 && d > radius * 0.2) {
          const w = 250 * Math.sin(d / radius * Math.PI)
          f.dr0[IX(i, j)] += cr * w
          f.dg0[IX(i, j)] += cg * w
          f.db0[IX(i, j)] += cb * w
        }
      }
    }
    hueRef.current = (hueRef.current + 60) % 360
    setMessage('vortex inscribed // watch the spiral unfold')
  }, [])

  const handleBurst = useCallback(() => {
    const f = fieldsRef.current
    if (!f) return
    const cx = N / 2, cy = N / 2, radius = N / 3
    const [cr, cg, cb] = hslToRgb(hueRef.current, 0.9, 0.6)
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        const dx = i - cx, dy = j - cy
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < radius && d > 1) {
          const w = 4.0 * (1 - d / radius)
          f.u0[IX(i, j)] += (dx / d) * w
          f.v0[IX(i, j)] += (dy / d) * w
          f.dr0[IX(i, j)] += cr * w * 80
          f.dg0[IX(i, j)] += cg * w * 80
          f.db0[IX(i, j)] += cb * w * 80
        }
      }
    }
    hueRef.current = (hueRef.current + 45) % 360
    setMessage('radial burst released from center')
  }, [])

  const handleRain = useCallback(() => {
    const f = fieldsRef.current
    if (!f) return
    for (let drop = 0; drop < 12; drop++) {
      const gi = 5 + Math.floor(Math.random() * (N - 10))
      const gj = 5 + Math.floor(Math.random() * (N - 10))
      const dropHue = (hueRef.current + drop * 30) % 360
      const [cr, cg, cb] = hslToRgb(dropHue, 0.9, 0.6)
      const radius = 3 + Math.floor(Math.random() * 3)
      for (let dj = -radius; dj <= radius; dj++) {
        for (let di = -radius; di <= radius; di++) {
          const d2 = di * di + dj * dj
          if (d2 > radius * radius) continue
          const w = (1 - Math.sqrt(d2) / radius) * 150
          const idx = IX(gi + di, gj + dj)
          f.dr0[idx] += cr * w
          f.dg0[idx] += cg * w
          f.db0[idx] += cb * w
        }
      }
    }
    hueRef.current = (hueRef.current + 90) % 360
    setMessage('ink rain scattered across the field')
  }, [])

  const handleClear = useCallback(() => {
    const f = fieldsRef.current
    if (!f) return
    for (const key of Object.keys(f)) f[key].fill(0)
    setMessage('all fields dissolved')
  }, [])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    const messages = {
      laminar: 'laminar flow // viscous, meditative ink',
      chaotic: 'chaotic regime // turbulence finds its own forms',
      paint: 'paint mode // dye without physics, switch modes to release'
    }
    setMessage(messages[nextMode])
  }, [])

  const metrics = useMemo(() => [
    { label: 'energy', value: statsRef.current.energy },
    { label: 'ink', value: statsRef.current.ink },
    { label: 'curl', value: statsRef.current.curl },
    { label: 'hue', value: `${Math.floor(hueRef.current)}` }
  ], [tick])

  const controls = [
    { id: 'vortex', label: 'vortex()', onClick: handleVortex },
    { id: 'burst', label: 'burst()', onClick: handleBurst },
    { id: 'rain', label: 'rain()', onClick: handleRain },
    { id: 'clear', label: 'clear()', onClick: handleClear, variant: 'reset' }
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
          onModeChange={handleModeChange}
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
          data-testid="fluid-rites-canvas"
        />
      </div>
    </div>
  )
}

export default FluidRites
