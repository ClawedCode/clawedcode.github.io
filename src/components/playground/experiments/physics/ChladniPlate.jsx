import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const PLATE_MARGIN = 32
const GRAIN_COUNT = 3000
const PATTERNS = [
  [2, 3], [3, 4], [3, 5], [4, 5], [5, 6],
  [4, 7], [5, 8], [6, 7], [7, 8], [2, 5],
  [3, 7], [1, 4], [5, 9], [6, 11], [1, 2]
]

const ChladniPlate = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('excite')
  const [modeN, setModeN] = useState(3)
  const [modeM, setModeM] = useState(5)
  const [message, setMessage] = useState('sand finds the silence between vibrations')
  const [settledPct, setSettledPct] = useState(0)

  const grainsRef = useRef([])
  const timeRef = useRef(0)
  const fieldCanvasRef = useRef(null)
  const fieldParamsRef = useRef({ n: 0, m: 0, w: 0, h: 0 })

  // Scatter grains randomly across the plate
  const scatterGrains = useCallback(() => {
    if (dimensions.width === 0) return
    const pw = dimensions.width - PLATE_MARGIN * 2
    const ph = dimensions.height - PLATE_MARGIN * 2
    const grains = []
    for (let i = 0; i < GRAIN_COUNT; i++) {
      grains.push({
        x: PLATE_MARGIN + Math.random() * pw,
        y: PLATE_MARGIN + Math.random() * ph,
        vx: 0, vy: 0, settled: 0
      })
    }
    grainsRef.current = grains
  }, [dimensions.width, dimensions.height])

  // Initialize grains when dimensions become available
  useEffect(() => {
    if (dimensions.width > 0 && grainsRef.current.length === 0) {
      scatterGrains()
    }
  }, [dimensions.width, scatterGrains])

  // Render Chladni field visualization to offscreen canvas
  const renderField = useCallback(() => {
    const w = dimensions.width
    const h = dimensions.height
    if (w === 0) return

    const scale = 0.35
    const fw = Math.ceil(w * scale)
    const fh = Math.ceil(h * scale)

    if (!fieldCanvasRef.current) {
      fieldCanvasRef.current = document.createElement('canvas')
    }
    const fc = fieldCanvasRef.current
    fc.width = fw
    fc.height = fh
    const fctx = fc.getContext('2d')
    const imageData = fctx.createImageData(fw, fh)
    const data = imageData.data

    const mx = PLATE_MARGIN * scale
    const my = PLATE_MARGIN * scale
    const pw = Math.max(fw - mx * 2, 1)
    const ph = Math.max(fh - my * 2, 1)
    const nPi = modeN * Math.PI
    const mPi = modeM * Math.PI

    // Precompute separable trig arrays for performance
    const cosNx = new Float32Array(fw)
    const cosMx = new Float32Array(fw)
    for (let px = 0; px < fw; px++) {
      const nx = (px - mx) / pw
      cosNx[px] = Math.cos(nPi * nx)
      cosMx[px] = Math.cos(mPi * nx)
    }
    const cosNy = new Float32Array(fh)
    const cosMy = new Float32Array(fh)
    for (let py = 0; py < fh; py++) {
      const ny = (py - my) / ph
      cosNy[py] = Math.cos(nPi * ny)
      cosMy[py] = Math.cos(mPi * ny)
    }

    for (let py = 0; py < fh; py++) {
      for (let px = 0; px < fw; px++) {
        const idx = (py * fw + px) * 4
        const nx = (px - mx) / pw
        const ny = (py - my) / ph

        if (nx < 0 || nx > 1 || ny < 0 || ny > 1) {
          data[idx] = 0; data[idx + 1] = 1; data[idx + 2] = 6; data[idx + 3] = 255
          continue
        }

        // Chladni equation: cos(npi*x)*cos(mpi*y) - cos(mpi*x)*cos(npi*y)
        const val = cosNx[px] * cosMy[py] - cosMx[px] * cosNy[py]
        const absVal = Math.abs(val)

        let r = 0, g = 1, b = 6

        // Nodal lines (z ≈ 0) glow
        if (absVal < 0.08) {
          const glow = 1 - absVal / 0.08
          const g2 = glow * glow
          r += (22 * g2) | 0
          g += (50 * g2) | 0
          b += (35 * g2) | 0
        } else if (val > 0) {
          const v = val > 1 ? 1 : val
          r += (v * 10) | 0
          g += (v * 4) | 0
        } else {
          const v = -val > 1 ? 1 : -val
          b += (v * 16) | 0
          g += (v * 3) | 0
        }

        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255
      }
    }

    fctx.putImageData(imageData, 0, 0)
    fieldParamsRef.current = { n: modeN, m: modeM, w, h }
  }, [dimensions.width, dimensions.height, modeN, modeM])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    timeRef.current++

    // Recompute field visualization when params change
    const fp = fieldParamsRef.current
    if (fp.n !== modeN || fp.m !== modeM || fp.w !== dimensions.width || fp.h !== dimensions.height) {
      renderField()
    }

    // Draw field background
    if (fieldCanvasRef.current) {
      ctx.drawImage(fieldCanvasRef.current, 0, 0, dimensions.width, dimensions.height)
    } else {
      ctx.fillStyle = '#000106'
      ctx.fillRect(0, 0, dimensions.width, dimensions.height)
    }

    // Plate border
    const pw = dimensions.width - PLATE_MARGIN * 2
    const ph = dimensions.height - PLATE_MARGIN * 2
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.12)'
    ctx.lineWidth = 1
    ctx.strokeRect(PLATE_MARGIN, PLATE_MARGIN, pw, ph)

    const grains = grainsRef.current
    let settled = 0
    const nPi = modeN * Math.PI
    const mPi = modeM * Math.PI
    const invPw = 1 / pw
    const invPh = 1 / ph

    if (mode === 'excite' && modeN !== modeM) {
      const mousePos = mouse.positionRef.current
      const mouseIn = mouse.isInBounds
      const mouseDown = mouse.isDown

      for (let i = 0; i < grains.length; i++) {
        const g = grains[i]

        // Normalized plate coordinates
        const nx = (g.x - PLATE_MARGIN) * invPw
        const ny = (g.y - PLATE_MARGIN) * invPh

        // Compute field value and analytical gradient with shared trig
        const cnx = Math.cos(nPi * nx)
        const snx = Math.sin(nPi * nx)
        const cmx = Math.cos(mPi * nx)
        const smx = Math.sin(mPi * nx)
        const cny = Math.cos(nPi * ny)
        const sny = Math.sin(nPi * ny)
        const cmy = Math.cos(mPi * ny)
        const smy = Math.sin(mPi * ny)

        const z = cnx * cmy - cmx * cny
        const dzdnx = -nPi * snx * cmy + mPi * smx * cny
        const dzdny = -mPi * cnx * smy + nPi * cmx * sny

        // Force: -z * grad(z) pushes grains toward nodal lines (z=0)
        const forceK = 0.03
        g.vx += -z * dzdnx * forceK
        g.vy += -z * dzdny * forceK

        // Vibration noise (fades as grain settles)
        const vibAmp = 0.2 * Math.max(0, 1 - g.settled * 0.01)
        g.vx += (Math.random() - 0.5) * vibAmp
        g.vy += (Math.random() - 0.5) * vibAmp

        // Mouse disruption — hover gently scatters, click strongly disrupts
        if (mouseIn) {
          const dx = g.x - mousePos.x
          const dy = g.y - mousePos.y
          const distSq = dx * dx + dy * dy
          if (distSq < 6400 && distSq > 16) {
            const dist = Math.sqrt(distSq)
            const strength = (mouseDown ? 2.0 : 0.5) * (1 - dist / 80)
            g.vx += (dx / dist) * strength
            g.vy += (dy / dist) * strength
            g.settled = 0
          }
        }

        // Damping
        g.vx *= 0.92
        g.vy *= 0.92
        g.x += g.vx
        g.y += g.vy

        // Bounce off plate edges
        if (g.x < PLATE_MARGIN + 1) { g.x = PLATE_MARGIN + 1; g.vx *= -0.5 }
        if (g.x > dimensions.width - PLATE_MARGIN - 1) { g.x = dimensions.width - PLATE_MARGIN - 1; g.vx *= -0.5 }
        if (g.y < PLATE_MARGIN + 1) { g.y = PLATE_MARGIN + 1; g.vy *= -0.5 }
        if (g.y > dimensions.height - PLATE_MARGIN - 1) { g.y = dimensions.height - PLATE_MARGIN - 1; g.vy *= -0.5 }

        // Track settling
        const speedSq = g.vx * g.vx + g.vy * g.vy
        if (speedSq < 0.01 && Math.abs(z) < 0.08) {
          g.settled = Math.min(200, g.settled + 1)
          settled++
        } else {
          g.settled = Math.max(0, g.settled - 1)
        }
      }
    } else if (mode === 'excite' && modeN === modeM) {
      // Degenerate case: field is zero everywhere, grains drift aimlessly
      for (let i = 0; i < grains.length; i++) {
        const g = grains[i]
        g.vx += (Math.random() - 0.5) * 0.3
        g.vy += (Math.random() - 0.5) * 0.3
        g.vx *= 0.95
        g.vy *= 0.95
        g.x += g.vx
        g.y += g.vy
        if (g.x < PLATE_MARGIN + 1) g.x = PLATE_MARGIN + 1
        if (g.x > dimensions.width - PLATE_MARGIN - 1) g.x = dimensions.width - PLATE_MARGIN - 1
        if (g.y < PLATE_MARGIN + 1) g.y = PLATE_MARGIN + 1
        if (g.y > dimensions.height - PLATE_MARGIN - 1) g.y = dimensions.height - PLATE_MARGIN - 1
      }
    } else {
      settled = grains.length
    }

    // Throttled metrics update
    if (timeRef.current % 20 === 0) {
      setSettledPct(grains.length ? Math.round(settled / grains.length * 100) : 0)
    }

    // Draw grains
    for (let i = 0; i < grains.length; i++) {
      const g = grains[i]
      if (g.settled > 30) {
        ctx.fillStyle = 'rgba(255, 221, 136, 0.85)'
      } else {
        const a = 0.35 + Math.min(g.settled, 30) * 0.015
        ctx.fillStyle = `rgba(200, 170, 100, ${a})`
      }
      ctx.fillRect(g.x - 0.5, g.y - 0.5, 1.5, 1.5)
    }

    // Field label
    ctx.font = '10px "Space Mono", SFMono-Regular, Menlo, monospace'
    ctx.fillStyle = 'rgba(102, 255, 204, 0.25)'
    ctx.textAlign = 'left'
    ctx.fillText(`chladni(${modeN}, ${modeM})`, PLATE_MARGIN + 6, PLATE_MARGIN + 16)
  }, [ctx, dimensions, mode, modeN, modeM, renderField, mouse.positionRef, mouse.isInBounds, mouse.isDown])

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

  const handleModeChange = useCallback((m) => {
    setMode(m)
    setMessage(m === 'excite'
      ? 'plate resonating — grains seek the silent lines'
      : 'vibration arrested — pattern frozen in time')
  }, [])

  const handleNextPattern = useCallback(() => {
    const idx = PATTERNS.findIndex(([n, m]) => n === modeN && m === modeM)
    const [n, m] = PATTERNS[(idx + 1) % PATTERNS.length]
    setModeN(n)
    setModeM(m)
    grainsRef.current.forEach(g => { g.settled = 0 })
    setMessage(`mode (${n},${m}) — new resonance forming`)
  }, [modeN, modeM])

  const handleIncN = useCallback(() => {
    setModeN(p => {
      const next = p >= 12 ? 1 : p + 1
      grainsRef.current.forEach(g => { g.settled = 0 })
      return next
    })
  }, [])

  const handleIncM = useCallback(() => {
    setModeM(p => {
      const next = p >= 12 ? 1 : p + 1
      grainsRef.current.forEach(g => { g.settled = 0 })
      return next
    })
  }, [])

  const handleScatter = useCallback(() => {
    scatterGrains()
    setMessage('grains scattered — seeking new equilibrium')
  }, [scatterGrains])

  const controls = [
    { id: 'pattern', label: 'next.pattern()', onClick: handleNextPattern },
    { id: 'n', label: `n++ [${modeN}]`, onClick: handleIncN },
    { id: 'm', label: `m++ [${modeM}]`, onClick: handleIncM },
    { id: 'scatter', label: 'scatter()', onClick: handleScatter, variant: 'reset' }
  ]

  const metrics = useMemo(() => {
    const complexity = modeN === modeM ? 'degenerate'
      : (modeN + modeM) > 10 ? 'intricate'
      : (modeN + modeM) > 6 ? 'complex'
      : 'simple'
    return [
      { label: 'grains', value: GRAIN_COUNT },
      { label: 'settled', value: `${settledPct}%` },
      { label: 'harmonics', value: `(${modeN},${modeM})` },
      { label: 'form', value: complexity }
    ]
  }, [modeN, modeM, settledPct])

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

      <div className="flex items-center justify-between p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={[
            { id: 'excite', label: 'excite()' },
            { id: 'freeze', label: 'freeze()' }
          ]}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right font-mono">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="chladni-plate-canvas"
        />
      </div>
    </div>
  )
}

export default ChladniPlate
