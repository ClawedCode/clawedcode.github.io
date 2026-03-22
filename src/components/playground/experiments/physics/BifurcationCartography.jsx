import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

// --- Iterated map functions ---
const MAPS = {
  logistic: (r, x) => r * x * (1 - x),
  sine: (r, x) => r * Math.sin(Math.PI * x),
  tent: (r, x) => r * (x < 0.5 ? x : 1 - x),
}

const DERIVS = {
  logistic: (r, x) => r * (1 - 2 * x),
  sine: (r, x) => r * Math.PI * Math.cos(Math.PI * x),
  tent: (r) => r,
}

const FORMULAS = {
  logistic: 'rx(1-x)',
  sine: 'r sin(px)',
  tent: 'r min(x,1-x)',
}

const MODES = [
  { id: 'logistic', label: 'logistic()' },
  { id: 'sine', label: 'sine()' },
  { id: 'tent', label: 'tent()' },
]

const DEFAULT_BOUNDS = {
  logistic: { rMin: 2.5, rMax: 4.0, xMin: 0, xMax: 1 },
  sine: { rMin: 0.6, rMax: 1.0, xMin: 0, xMax: 1 },
  tent: { rMin: 1.0, rMax: 2.0, xMin: 0, xMax: 1 },
}

const WARMUP = 300
const PLOT_ITERS = 200
const INITIALS = [0.1, 0.25, 0.5, 0.75, 0.9]

const BifurcationCartography = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('logistic')
  const [showCobweb, setShowCobweb] = useState(true)
  const [showLyapunov, setShowLyapunov] = useState(false)
  const [message, setMessage] = useState('drag to zoom into the fractal edge of chaos')
  const [tick, setTick] = useState(0)

  const boundsRef = useRef({ ...DEFAULT_BOUNDS.logistic })
  const offscreenRef = useRef(null)
  const needsRenderRef = useRef(true)
  const dragStartRef = useRef(null)
  const isDraggingRef = useRef(false)
  const frameCountRef = useRef(0)
  const statsRef = useRef({ r: 0, period: 0, lyapunov: 0, zoom: 1 })

  // --- Render bifurcation diagram to offscreen canvas ---
  const renderDiagram = useCallback(() => {
    const { width: fw, height: fh } = dimensions
    if (fw === 0) return

    const cw = Math.ceil(fw)
    const ch = Math.ceil(fh)
    const bounds = boundsRef.current
    const mapFn = MAPS[mode]

    let off = offscreenRef.current
    if (!off || off.width !== cw || off.height !== ch) {
      off = document.createElement('canvas')
      off.width = cw
      off.height = ch
      offscreenRef.current = off
    }

    const hits = new Uint16Array(cw * ch)
    const rRange = bounds.rMax - bounds.rMin
    const xRange = bounds.xMax - bounds.xMin

    for (let col = 0; col < cw; col++) {
      const r = bounds.rMin + (col / cw) * rRange
      for (const x0 of INITIALS) {
        let x = x0
        let escaped = false
        for (let i = 0; i < WARMUP; i++) {
          x = mapFn(r, x)
          if (!isFinite(x) || Math.abs(x) > 10) { escaped = true; break }
        }
        if (escaped) continue

        for (let i = 0; i < PLOT_ITERS; i++) {
          x = mapFn(r, x)
          if (!isFinite(x) || Math.abs(x) > 10) break
          const row = Math.floor((1 - (x - bounds.xMin) / xRange) * ch)
          if (row >= 0 && row < ch) {
            const idx = row * cw + col
            if (hits[idx] < 65535) hits[idx]++
          }
        }
      }
    }

    // Lyapunov exponent per column (optional overlay)
    let lyapMap = null
    if (showLyapunov) {
      lyapMap = new Float32Array(cw)
      const derivFn = DERIVS[mode]
      for (let col = 0; col < cw; col++) {
        const r = bounds.rMin + (col / cw) * rRange
        let x = 0.5, lyap = 0, ok = true
        for (let i = 0; i < 500; i++) {
          lyap += Math.log(Math.abs(derivFn(r, x)) + 1e-15)
          x = mapFn(r, x)
          if (!isFinite(x)) { ok = false; break }
        }
        lyapMap[col] = ok ? lyap / 500 : 0
      }
    }

    // Map hit density to pixel colors
    const offCtx = off.getContext('2d')
    const imageData = offCtx.createImageData(cw, ch)
    const data = imageData.data

    for (let row = 0; row < ch; row++) {
      for (let col = 0; col < cw; col++) {
        const pi = (row * cw + col) * 4
        const h = hits[row * cw + col]

        if (h === 0) {
          data[pi] = 0; data[pi + 1] = 2; data[pi + 2] = 6; data[pi + 3] = 255
          continue
        }

        const t = Math.min(1, h / 8)
        const sq = Math.sqrt(t)

        if (lyapMap) {
          const lv = lyapMap[col]
          if (lv > 0) {
            // Chaotic regions: warm coral/amber
            const c = Math.min(1, lv * 2)
            data[pi]     = Math.floor(sq * (100 + c * 155))
            data[pi + 1] = Math.floor(sq * (70 - c * 40))
            data[pi + 2] = Math.floor(sq * (40 + c * 80))
          } else {
            // Periodic regions: cool cyan/blue
            const c = Math.min(1, -lv * 0.5)
            data[pi]     = Math.floor(sq * (30 + c * 50))
            data[pi + 1] = Math.floor(sq * (120 + c * 100))
            data[pi + 2] = Math.floor(sq * (160 + c * 95))
          }
        } else {
          // Default: void cyan/green density ramp
          data[pi]     = Math.floor(t * t * 150 + sq * 20)
          data[pi + 1] = Math.floor(sq * 255)
          data[pi + 2] = Math.floor(sq * 200)
        }
        data[pi + 3] = 255
      }
    }

    offCtx.putImageData(imageData, 0, 0)
    needsRenderRef.current = false
  }, [dimensions.width, dimensions.height, mode, showLyapunov])

  // --- Detect orbit period at a given r ---
  const detectPeriod = useCallback((r) => {
    const mapFn = MAPS[mode]
    let x = 0.5
    for (let i = 0; i < 1000; i++) {
      x = mapFn(r, x)
      if (!isFinite(x)) return 0
    }

    const orbit = []
    for (let i = 0; i < 200; i++) {
      x = mapFn(r, x)
      if (!isFinite(x)) return 0
      orbit.push(x)
    }

    for (let p = 1; p <= 64; p++) {
      let match = true
      const checks = Math.min(p * 3, 20)
      for (let i = 0; i < checks; i++) {
        const idx = orbit.length - 1 - i
        if (idx - p < 0 || Math.abs(orbit[idx] - orbit[idx - p]) > 1e-6) {
          match = false
          break
        }
      }
      if (match) return p
    }
    return -1
  }, [mode])

  // --- Compute Lyapunov exponent at a given r ---
  const computeLyapunov = useCallback((r) => {
    const mapFn = MAPS[mode]
    const derivFn = DERIVS[mode]
    let x = 0.5, lyap = 0
    for (let i = 0; i < 1000; i++) {
      lyap += Math.log(Math.abs(derivFn(r, x)) + 1e-15)
      x = mapFn(r, x)
      if (!isFinite(x)) return NaN
    }
    return lyap / 1000
  }, [mode])

  // --- Draw cobweb diagram overlay ---
  const drawCobweb = useCallback((r) => {
    if (!ctx) return
    const mapFn = MAPS[mode]
    const { width, height } = dimensions
    const size = Math.min(width, height) * 0.28
    const pad = 16
    const ox = width - size - pad
    const oy = height - size - pad - 36

    // Panel
    ctx.fillStyle = 'rgba(0, 3, 9, 0.92)'
    ctx.fillRect(ox - 10, oy - 20, size + 20, size + 32)
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.2)'
    ctx.lineWidth = 1
    ctx.strokeRect(ox - 10, oy - 20, size + 20, size + 32)

    // Label
    ctx.fillStyle = 'rgba(102, 255, 204, 0.6)'
    ctx.font = '10px "SF Mono", monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`cobweb :: ${FORMULAS[mode]}  r=${r.toFixed(4)}`, ox - 4, oy - 6)

    // y = x diagonal
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.2)'
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(ox, oy + size)
    ctx.lineTo(ox + size, oy)
    ctx.stroke()
    ctx.setLineDash([])

    // Map curve f(x)
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255, 102, 204, 0.65)'
    ctx.lineWidth = 1.5
    const steps = Math.floor(size)
    for (let i = 0; i <= steps; i++) {
      const xv = i / steps
      const yv = mapFn(r, xv)
      const py = Math.max(oy, Math.min(oy + size, oy + (1 - yv) * size))
      if (i === 0) ctx.moveTo(ox + i, py)
      else ctx.lineTo(ox + i, py)
    }
    ctx.stroke()

    // Cobweb iteration path
    let x = 0.2
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.5)'
    ctx.lineWidth = 0.7
    const cx = (v) => Math.max(ox, Math.min(ox + size, ox + v * size))
    const cy = (v) => Math.max(oy, Math.min(oy + size, oy + (1 - v) * size))
    ctx.moveTo(cx(x), oy + size)

    for (let i = 0; i < 60; i++) {
      const fx = mapFn(r, x)
      if (!isFinite(fx) || Math.abs(fx) > 5) break
      ctx.lineTo(cx(x), cy(fx))
      ctx.lineTo(cx(fx), cy(fx))
      x = fx
    }
    ctx.stroke()
    ctx.lineWidth = 1
  }, [ctx, dimensions.width, dimensions.height, mode])

  // --- Main render frame ---
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    const { width, height } = dimensions

    if (needsRenderRef.current) renderDiagram()

    // Draw cached diagram
    if (offscreenRef.current) {
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(offscreenRef.current, 0, 0, width, height)
    }

    const bounds = boundsRef.current
    const rRange = bounds.rMax - bounds.rMin

    // Hover: cursor line + info + cobweb
    if (mouse.isInBounds) {
      const pos = mouse.positionRef.current
      const r = bounds.rMin + (pos.x / width) * rRange

      // Vertical cursor
      ctx.strokeStyle = 'rgba(255, 102, 204, 0.35)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(pos.x, 0)
      ctx.lineTo(pos.x, height)
      ctx.stroke()
      ctx.setLineDash([])

      // Orbit analysis
      const period = detectPeriod(r)
      const lyap = computeLyapunov(r)
      statsRef.current = {
        r,
        period,
        lyapunov: lyap,
        zoom: (DEFAULT_BOUNDS[mode].rMax - DEFAULT_BOUNDS[mode].rMin) / rRange,
      }

      // Info panel
      const alignRight = pos.x > width * 0.6
      ctx.textAlign = alignRight ? 'right' : 'left'
      const lx = alignRight ? pos.x - 10 : pos.x + 10
      ctx.fillStyle = 'rgba(0, 3, 9, 0.8)'
      ctx.fillRect(alignRight ? lx - 155 : lx, 4, 155, 55)
      ctx.font = '11px "SF Mono", monospace'
      ctx.fillStyle = 'rgba(255, 102, 204, 0.9)'
      ctx.fillText(`r = ${r.toFixed(6)}`, lx, 18)
      ctx.fillStyle = 'rgba(102, 255, 204, 0.8)'
      ctx.fillText(
        period === -1 ? 'period: chaotic' : period === 0 ? 'period: divergent' : `period: ${period}`,
        lx, 34
      )
      ctx.fillText(`\u03BB = ${isNaN(lyap) ? '\u221E' : lyap.toFixed(4)}`, lx, 50)

      if (showCobweb) drawCobweb(r)
    }

    // Zoom selection rectangle
    if (isDraggingRef.current && dragStartRef.current && mouse.isDown) {
      const pos = mouse.positionRef.current
      const s = dragStartRef.current
      ctx.strokeStyle = 'rgba(102, 255, 204, 0.6)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.strokeRect(s.x, s.y, pos.x - s.x, pos.y - s.y)
      ctx.setLineDash([])

      // Show target r range
      const rStart = bounds.rMin + (Math.min(s.x, pos.x) / width) * rRange
      const rEnd = bounds.rMin + (Math.max(s.x, pos.x) / width) * rRange
      ctx.fillStyle = 'rgba(102, 255, 204, 0.6)'
      ctx.font = '10px "SF Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`r: [${rStart.toFixed(4)}, ${rEnd.toFixed(4)}]`, (s.x + pos.x) / 2, Math.min(s.y, pos.y) - 6)
    }

    // Axis labels
    ctx.fillStyle = 'rgba(102, 255, 204, 0.35)'
    ctx.font = '10px "SF Mono", monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`r=${bounds.rMin.toFixed(4)}`, 4, height - 8)
    ctx.textAlign = 'right'
    ctx.fillText(`r=${bounds.rMax.toFixed(4)}`, width - 4, height - 8)
    ctx.textAlign = 'left'
    ctx.fillText(`x=${bounds.xMax.toFixed(3)}`, 4, 14)
    ctx.fillText(`x=${bounds.xMin.toFixed(3)}`, 4, height - 22)

    frameCountRef.current++
    if (frameCountRef.current % 10 === 0) setTick(t => t + 1)
  }, [ctx, dimensions.width, dimensions.height, mouse.isInBounds, mouse.isDown, mouse.positionRef, mode, showCobweb, renderDiagram, drawCobweb, detectPeriod, computeLyapunov])

  // Animation loop
  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let id
    const loop = () => { onFrame(); id = requestAnimationFrame(loop) }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [ctx, dimensions.width, onFrame])

  // Re-render triggers
  useEffect(() => {
    needsRenderRef.current = true
    boundsRef.current = { ...DEFAULT_BOUNDS[mode] }
  }, [mode])

  useEffect(() => {
    needsRenderRef.current = true
  }, [showLyapunov, dimensions.width, dimensions.height])

  // Zoom drag handlers
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onDown = (e) => {
      const rect = canvas.getBoundingClientRect()
      dragStartRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      isDraggingRef.current = true
    }

    const onUp = (e) => {
      if (!isDraggingRef.current || !dragStartRef.current) return
      isDraggingRef.current = false
      const rect = canvas.getBoundingClientRect()
      const end = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const start = dragStartRef.current
      dragStartRef.current = null

      if (Math.abs(end.x - start.x) < 8 || Math.abs(end.y - start.y) < 8) return

      const { width, height } = dimensions
      const bounds = boundsRef.current
      const rR = bounds.rMax - bounds.rMin
      const xR = bounds.xMax - bounds.xMin

      const left = Math.min(start.x, end.x) / width
      const right = Math.max(start.x, end.x) / width
      const top = Math.min(start.y, end.y) / height
      const bottom = Math.max(start.y, end.y) / height

      boundsRef.current = {
        rMin: bounds.rMin + left * rR,
        rMax: bounds.rMin + right * rR,
        xMin: bounds.xMax - bottom * xR,
        xMax: bounds.xMax - top * xR,
      }

      needsRenderRef.current = true
      setMessage(`zoomed to r=[${boundsRef.current.rMin.toFixed(4)}, ${boundsRef.current.rMax.toFixed(4)}]`)
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointerup', onUp)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
    }
  }, [canvasRef, dimensions])

  // --- Controls ---
  const handleModeChange = useCallback((next) => {
    setMode(next)
    setMessage(`${next} map active — ${FORMULAS[next]}`)
  }, [])

  const handleReset = useCallback(() => {
    boundsRef.current = { ...DEFAULT_BOUNDS[mode] }
    needsRenderRef.current = true
    setMessage('view restored to full territory')
  }, [mode])

  const toggleCobweb = useCallback(() => {
    setShowCobweb(p => {
      setMessage(!p ? 'cobweb overlay — watch iterations converge or scatter' : 'cobweb hidden')
      return !p
    })
  }, [])

  const toggleLyapunov = useCallback(() => {
    setShowLyapunov(p => {
      setMessage(!p ? 'lyapunov coloring — warm marks chaos, cool marks order' : 'lyapunov coloring off')
      return !p
    })
  }, [])

  const metrics = useMemo(() => {
    const s = statsRef.current
    return [
      { label: 'r', value: s.r ? s.r.toFixed(4) : '-' },
      { label: 'period', value: s.period === -1 ? '\u221E' : !s.period ? '-' : String(s.period) },
      { label: '\u03BB', value: !s.lyapunov && s.lyapunov !== 0 ? '-' : (isNaN(s.lyapunov) ? '\u221E' : s.lyapunov.toFixed(3)) },
      { label: 'zoom', value: `${(s.zoom || 1).toFixed(1)}x` },
    ]
  }, [tick])

  const controls = [
    { id: 'cobweb', label: 'cobweb()', onClick: toggleCobweb, active: showCobweb },
    { id: 'lyapunov', label: 'lyapunov()', onClick: toggleLyapunov, active: showLyapunov },
    { id: 'reset', label: 'reset.view()', onClick: handleReset, variant: 'reset' },
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
        <p className="text-void-green/50 text-xs sm:text-right max-w-lg">{message}</p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="bifurcation-canvas"
        />
        <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 text-xs text-void-green/50 font-mono bg-void-dark/70 border border-void-green/20 rounded px-3 py-2 backdrop-blur-sm">
          drag to zoom into fractal territory — hover to probe orbit structure
        </div>
      </div>
    </div>
  )
}

export default BifurcationCartography
