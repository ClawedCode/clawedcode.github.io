import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const STEP = 4
const BASE_THRESHOLD = 1.0

// Precomputed HSL palette (s=0.8, l=0.55) for fast hue→RGB
const PALETTE = Array.from({ length: 360 }, (_, h) => {
  const c = 0.64, m = 0.23
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const sector = Math.floor(h / 60)
  const [r, g, b] = [
    [c, x, 0], [x, c, 0], [0, c, x],
    [0, x, c], [x, 0, c], [c, 0, x]
  ][sector] || [c, 0, x]
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
})

class Blob {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 1.8
    this.vy = (Math.random() - 0.5) * 1.8
    this.radius = 30 + Math.random() * 50
    this.hue = Math.floor(Math.random() * 360)
    this.cosHue = Math.cos((this.hue * Math.PI) / 180)
    this.sinHue = Math.sin((this.hue * Math.PI) / 180)
  }

  update(width, height) {
    this.x += this.vx
    this.y += this.vy
    const m = 10
    if (this.x < m) { this.vx = Math.abs(this.vx); this.x = m }
    if (this.x > width - m) { this.vx = -Math.abs(this.vx); this.x = width - m }
    if (this.y < m) { this.vy = Math.abs(this.vy); this.y = m }
    if (this.y > height - m) { this.vy = -Math.abs(this.vy); this.y = height - m }
    this.vx *= 0.999
    this.vy *= 0.999
  }

  fieldAt(px, py) {
    const dx = px - this.x
    const dy = py - this.y
    return (this.radius * this.radius) / (dx * dx + dy * dy + 1)
  }
}

// Marching squares: 4-bit case → edge pairs [edge_a, edge_b]
// Edges: 0=top, 1=right, 2=bottom, 3=left
const MARCH_CASES = [
  null, [[3,2]], [[2,1]], [[3,1]], [[1,0]], [[3,0],[1,2]], [[2,0]], [[3,0]],
  [[0,3]], [[0,2]], [[0,1],[2,3]], [[0,1]], [[1,3]], [[1,2]], [[2,3]], null
]

const MODES = [
  { id: 'membrane', label: 'membrane()' },
  { id: 'field', label: 'field()' },
  { id: 'contour', label: 'contour()' },
  { id: 'tidal', label: 'tidal()' }
]

const MODE_MESSAGES = {
  membrane: 'organic membrane // consciousness merges at threshold boundaries',
  field: 'raw scalar field // every pixel sums all influence',
  contour: 'topographic isolines // consciousness elevation mapped',
  tidal: 'oscillating threshold // the membrane boundary breathes'
}

const MembraneCommunion = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('membrane')
  const [message, setMessage] = useState('click to birth consciousness // watch fields merge at threshold')
  const [metricState, setMetricState] = useState({ blobs: 0, peak: '0.0', threshold: BASE_THRESHOLD.toFixed(2) })

  const blobsRef = useRef([])
  const offscreenRef = useRef(null)
  const fieldRef = useRef(null)
  const hueXRef = useRef(null)
  const hueYRef = useRef(null)
  const frameRef = useRef(0)
  const dragRef = useRef(null)
  const seededRef = useRef(false)

  const seedBlobs = useCallback(() => {
    if (dimensions.width === 0) return
    blobsRef.current = []
    for (let i = 0; i < 7; i++) {
      blobsRef.current.push(new Blob(
        dimensions.width * 0.15 + Math.random() * dimensions.width * 0.7,
        dimensions.height * 0.15 + Math.random() * dimensions.height * 0.7
      ))
    }
    setMessage('seven consciousness blobs seeded // boundaries dissolving')
  }, [dimensions.width, dimensions.height])

  useEffect(() => {
    if (dimensions.width === 0 || seededRef.current) return
    seededRef.current = true
    seedBlobs()
  }, [dimensions.width, seedBlobs])

  // Allocate offscreen canvas and grids when dimensions change
  useEffect(() => {
    if (dimensions.width === 0) return
    const gw = Math.ceil(dimensions.width / STEP)
    const gh = Math.ceil(dimensions.height / STEP)
    const off = document.createElement('canvas')
    off.width = gw
    off.height = gh
    offscreenRef.current = off
    fieldRef.current = new Float32Array(gw * gh)
    hueXRef.current = new Float32Array(gw * gh)
    hueYRef.current = new Float32Array(gw * gh)
  }, [dimensions.width, dimensions.height])

  // Click/drag to spawn and move blobs
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: (e.touches?.[0]?.clientX ?? e.clientX) - rect.left,
        y: (e.touches?.[0]?.clientY ?? e.clientY) - rect.top
      }
    }

    const onDown = (e) => {
      const { x, y } = getPos(e)
      for (const blob of blobsRef.current) {
        const dx = blob.x - x, dy = blob.y - y
        if (dx * dx + dy * dy < blob.radius * blob.radius) {
          dragRef.current = blob
          blob.vx = 0
          blob.vy = 0
          setMessage('consciousness captured // drag to relocate')
          return
        }
      }
      if (blobsRef.current.length < 20) {
        const blob = new Blob(x, y)
        blob.vx = 0
        blob.vy = 0
        blobsRef.current.push(blob)
        dragRef.current = blob
        setMessage(`blob born // ${blobsRef.current.length} nodes active`)
      } else {
        setMessage('field saturated // 20 blob limit')
      }
    }

    const onMove = (e) => {
      if (!dragRef.current) return
      const { x, y } = getPos(e)
      dragRef.current.x = x
      dragRef.current.y = y
    }

    const onUp = () => {
      if (dragRef.current) {
        dragRef.current = null
        setMessage('released // field recalibrating')
      }
    }

    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseup', onUp)
    canvas.addEventListener('touchstart', onDown, { passive: true })
    canvas.addEventListener('touchmove', onMove, { passive: true })
    canvas.addEventListener('touchend', onUp)
    return () => {
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseup', onUp)
      canvas.removeEventListener('touchstart', onDown)
      canvas.removeEventListener('touchmove', onMove)
      canvas.removeEventListener('touchend', onUp)
    }
  }, [canvasRef])

  const extractContours = useCallback((grid, gw, gh, threshold) => {
    const segs = []
    for (let gy = 0; gy < gh - 1; gy++) {
      for (let gx = 0; gx < gw - 1; gx++) {
        const i = gy * gw + gx
        const tl = grid[i], tr = grid[i + 1]
        const bl = grid[i + gw], br = grid[i + gw + 1]
        const code = (tl > threshold ? 8 : 0) | (tr > threshold ? 4 : 0) |
                     (br > threshold ? 2 : 0) | (bl > threshold ? 1 : 0)
        const edges = MARCH_CASES[code]
        if (!edges) continue

        const lerp = (v1, v2) => {
          const d = v2 - v1
          return Math.abs(d) < 0.0001 ? 0.5 : (threshold - v1) / d
        }

        const x = gx * STEP, y = gy * STEP
        const pts = [
          [x + lerp(tl, tr) * STEP, y],
          [x + STEP, y + lerp(tr, br) * STEP],
          [x + lerp(bl, br) * STEP, y + STEP],
          [x, y + lerp(tl, bl) * STEP]
        ]

        for (const [a, b] of edges) {
          segs.push(pts[a][0], pts[a][1], pts[b][0], pts[b][1])
        }
      }
    }
    return segs
  }, [])

  const handleModeChange = useCallback((m) => {
    setMode(m)
    setMessage(MODE_MESSAGES[m] || '')
  }, [])

  const handleReseed = useCallback(() => {
    blobsRef.current = []
    dragRef.current = null
    seedBlobs()
  }, [seedBlobs])

  const handleScatter = useCallback(() => {
    blobsRef.current.forEach(b => {
      b.vx = (Math.random() - 0.5) * 5
      b.vy = (Math.random() - 0.5) * 5
    })
    setMessage('velocities scattered // fields destabilizing')
  }, [])

  const handleDissolve = useCallback(() => {
    blobsRef.current = []
    dragRef.current = null
    setMessage('all consciousness dissolved // void restored')
  }, [])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    const off = offscreenRef.current
    const field = fieldRef.current
    const hxArr = hueXRef.current
    const hyArr = hueYRef.current
    if (!off || !field || !hxArr || !hyArr) return

    const { width, height } = dimensions
    const blobs = blobsRef.current
    const offCtx = off.getContext('2d')
    const gw = off.width, gh = off.height

    frameRef.current++

    const threshold = mode === 'tidal'
      ? BASE_THRESHOLD + Math.sin(frameRef.current * 0.02) * 0.5
      : BASE_THRESHOLD

    // Physics update
    blobs.forEach(b => { if (b !== dragRef.current) b.update(width, height) })

    // Compute scalar field + weighted hue accumulation
    let peak = 0
    for (let gy = 0; gy < gh; gy++) {
      const py = gy * STEP + STEP * 0.5
      for (let gx = 0; gx < gw; gx++) {
        const px = gx * STEP + STEP * 0.5
        let f = 0, hx = 0, hy = 0
        for (const b of blobs) {
          const c = b.fieldAt(px, py)
          f += c
          hx += b.cosHue * c
          hy += b.sinHue * c
        }
        const idx = gy * gw + gx
        field[idx] = f
        hxArr[idx] = hx
        hyArr[idx] = hy
        if (f > peak) peak = f
      }
    }

    if (mode === 'contour') {
      // Trail fade
      ctx.fillStyle = 'rgba(0, 3, 10, 0.12)'
      ctx.fillRect(0, 0, width, height)

      const levels = [0.2, 0.4, 0.6, 0.8, 1.0, 1.5, 2.0, 3.0, 5.0]
      levels.forEach((level, i) => {
        const segs = extractContours(field, gw, gh, level)
        if (segs.length === 0) return
        const hue = 160 + i * 22
        const alpha = 0.2 + (i / levels.length) * 0.6
        const isThreshold = Math.abs(level - threshold) < 0.15
        ctx.strokeStyle = `hsla(${hue}, 80%, ${isThreshold ? 80 : 55}%, ${isThreshold ? 0.9 : alpha})`
        ctx.lineWidth = isThreshold ? 2.5 : 1
        if (isThreshold) {
          ctx.shadowColor = `hsla(${hue}, 90%, 70%, 0.5)`
          ctx.shadowBlur = 8
        }
        ctx.beginPath()
        for (let s = 0; s < segs.length; s += 4) {
          ctx.moveTo(segs[s], segs[s + 1])
          ctx.lineTo(segs[s + 2], segs[s + 3])
        }
        ctx.stroke()
        ctx.shadowBlur = 0
      })
    } else {
      // Pixel-based rendering: field, membrane, tidal
      const imageData = offCtx.createImageData(gw, gh)
      const data = imageData.data

      for (let i = 0; i < gw * gh; i++) {
        const v = field[i]
        const di = i * 4

        if (mode === 'field' || mode === 'tidal') {
          const t = Math.min(v / (threshold * 3), 1)
          data[di]     = Math.floor(t * t * 180)
          data[di + 1] = Math.floor(t * 230 + (1 - t) * 2)
          data[di + 2] = Math.floor(Math.sqrt(t) * 200 + 10)
          data[di + 3] = 255
        } else {
          // membrane mode: colored blobs on void
          if (v < threshold * 0.8) {
            const t = v / (threshold * 0.8)
            data[di]     = Math.floor(t * 8)
            data[di + 1] = Math.floor(t * 15 + 2)
            data[di + 2] = Math.floor(t * 30 + 8)
            data[di + 3] = 255
          } else if (v < threshold) {
            // Transition zone approaching membrane boundary
            const t = (v - threshold * 0.8) / (threshold * 0.2)
            const hue = ((Math.atan2(hyArr[i], hxArr[i]) * 180 / Math.PI) + 360) % 360
            const [pr, pg, pb] = PALETTE[Math.floor(hue) % 360]
            data[di]     = Math.floor(8 + t * (pr * 0.3 - 8))
            data[di + 1] = Math.floor(17 + t * (pg * 0.3 - 17))
            data[di + 2] = Math.floor(38 + t * (pb * 0.3 - 38))
            data[di + 3] = 255
          } else {
            // Inside the membrane
            const excess = Math.min((v - threshold) / threshold, 1)
            const brightness = 0.3 + excess * 0.7
            const hue = ((Math.atan2(hyArr[i], hxArr[i]) * 180 / Math.PI) + 360) % 360
            const [pr, pg, pb] = PALETTE[Math.floor(hue) % 360]
            data[di]     = Math.floor(pr * brightness)
            data[di + 1] = Math.floor(pg * brightness)
            data[di + 2] = Math.floor(pb * brightness)
            data[di + 3] = 255
          }
        }
      }

      offCtx.putImageData(imageData, 0, 0)
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(off, 0, 0, width, height)

      // Glowing contour at threshold boundary
      if (mode === 'membrane' || mode === 'tidal') {
        const segs = extractContours(field, gw, gh, threshold)
        if (segs.length > 0) {
          ctx.strokeStyle = mode === 'tidal'
            ? 'rgba(255, 255, 255, 0.6)'
            : 'rgba(150, 255, 230, 0.4)'
          ctx.lineWidth = mode === 'tidal' ? 2 : 1.5
          ctx.shadowColor = 'rgba(100, 255, 200, 0.5)'
          ctx.shadowBlur = mode === 'tidal' ? 15 : 10
          ctx.beginPath()
          for (let s = 0; s < segs.length; s += 4) {
            ctx.moveTo(segs[s], segs[s + 1])
            ctx.lineTo(segs[s + 2], segs[s + 3])
          }
          ctx.stroke()
          ctx.shadowBlur = 0
        }
      }
    }

    // Blob center markers
    blobs.forEach(b => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.beginPath()
      ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2)
      ctx.fill()
    })

    if (frameRef.current % 10 === 0) {
      setMetricState({
        blobs: blobs.length,
        peak: peak.toFixed(1),
        threshold: threshold.toFixed(2)
      })
    }
  }, [ctx, dimensions, mode, extractContours])

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
    { label: 'blobs', value: metricState.blobs },
    { label: 'peak', value: metricState.peak },
    { label: 'threshold', value: metricState.threshold }
  ], [metricState])

  const controls = [
    { id: 'reseed', label: 'reseed()', onClick: handleReseed },
    { id: 'scatter', label: 'scatter()', onClick: handleScatter },
    { id: 'dissolve', label: 'dissolve()', onClick: handleDissolve, variant: 'reset' }
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
        <p className="text-void-green/50 text-xs font-mono sm:text-right max-w-lg">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="membrane-communion-canvas"
        />
      </div>
    </div>
  )
}

export default MembraneCommunion
