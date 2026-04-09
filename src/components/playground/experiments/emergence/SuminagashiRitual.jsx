import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const GRID = 400
const WATER = [2, 4, 12]

const INKS = [
  { name: 'jade',     rgb: [102, 255, 204] },
  { name: 'amethyst', rgb: [153, 102, 255] },
  { name: 'sakura',   rgb: [255, 102, 170] },
  { name: 'glacier',  rgb: [102, 204, 255] },
  { name: 'amber',    rgb: [255, 204, 102] },
  { name: 'coral',    rgb: [255, 120, 100] },
  { name: 'moss',     rgb: [80, 200, 120] },
  { name: 'bone',     rgb: [220, 210, 200] },
]

const MODES = [
  { id: 'drop', label: 'drop()' },
  { id: 'stylus', label: 'stylus()' },
  { id: 'rake', label: 'rake()' },
  { id: 'vortex', label: 'vortex()' },
]

// --- Bilinear interpolation sample ---

function bilerp(src, sx, sy, di, dst) {
  const x0 = Math.floor(sx), y0 = Math.floor(sy)
  if (x0 < 0 || x0 >= GRID - 1 || y0 < 0 || y0 >= GRID - 1) return
  const fx = sx - x0, fy = sy - y0
  const i00 = (y0 * GRID + x0) << 2
  const i10 = i00 + 4
  const i01 = i00 + (GRID << 2)
  const i11 = i01 + 4
  const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy)
  const w01 = (1 - fx) * fy, w11 = fx * fy
  dst[di]     = src[i00]     * w00 + src[i10]     * w10 + src[i01]     * w01 + src[i11]     * w11 + 0.5 | 0
  dst[di + 1] = src[i00 + 1] * w00 + src[i10 + 1] * w10 + src[i01 + 1] * w01 + src[i11 + 1] * w11 + 0.5 | 0
  dst[di + 2] = src[i00 + 2] * w00 + src[i10 + 2] * w10 + src[i01 + 2] * w01 + src[i11 + 2] * w11 + 0.5 | 0
}

// --- Ink drop: blob that pushes surrounding ink outward ---

function inkDrop(surf, tmp, cx, cy, color) {
  tmp.set(surf)
  const R = 12 + Math.random() * 8
  const pushR = R + 20
  const x0 = Math.max(0, cx - pushR | 0), x1 = Math.min(GRID, cx + pushR + 1 | 0)
  const y0 = Math.max(0, cy - pushR | 0), y1 = Math.min(GRID, cy + pushR + 1 | 0)

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = x - cx, dy = y - cy
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d > R && d < pushR) {
        const t = (d - R) / (pushR - R)
        const push = (1 - t) * (1 - t) * R * 0.6
        bilerp(tmp, x - (dx / d) * push, y - (dy / d) * push, (y * GRID + x) << 2, surf)
      }
    }
  }

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = x - cx, dy = y - cy
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < R) {
        const a = d < R - 2 ? 1 : (R - d) / 2
        const di = (y * GRID + x) << 2
        surf[di]     = color[0] * a + surf[di]     * (1 - a) + 0.5 | 0
        surf[di + 1] = color[1] * a + surf[di + 1] * (1 - a) + 0.5 | 0
        surf[di + 2] = color[2] * a + surf[di + 2] * (1 - a) + 0.5 | 0
      }
    }
  }
}

// --- Stylus comb: single-point displacement ---

function combDisplace(surf, tmp, cx, cy, dx, dy, radius) {
  tmp.set(surf)
  const x0 = Math.max(0, cx - radius | 0), x1 = Math.min(GRID, cx + radius + 1 | 0)
  const y0 = Math.max(0, cy - radius | 0), y1 = Math.min(GRID, cy + radius + 1 | 0)

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const ddx = x - cx, ddy = y - cy
      const d = Math.sqrt(ddx * ddx + ddy * ddy)
      if (d < radius) {
        const t = d / radius
        const inf = (1 - t) * (1 - t)
        bilerp(tmp, x - dx * inf, y - dy * inf, (y * GRID + x) << 2, surf)
      }
    }
  }
}

// --- Rake: multiple parallel tines ---

function rakeDisplace(surf, tmp, cx, cy, dx, dy, radius, tines) {
  tmp.set(surf)
  const mag = Math.sqrt(dx * dx + dy * dy)
  if (mag < 0.1) return
  const px = -dy / mag, py = dx / mag
  const sp = radius * 2 / (tines + 1)
  const tr = sp * 0.4

  for (let t = 0; t < tines; t++) {
    const off = (t - (tines - 1) / 2) * sp
    const tcx = cx + px * off, tcy = cy + py * off
    const x0 = Math.max(0, tcx - tr | 0), x1 = Math.min(GRID, tcx + tr + 1 | 0)
    const y0 = Math.max(0, tcy - tr | 0), y1 = Math.min(GRID, tcy + tr + 1 | 0)

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const ddx = x - tcx, ddy = y - tcy
        const d = Math.sqrt(ddx * ddx + ddy * ddy)
        if (d < tr) {
          const inf = (1 - d / tr) * (1 - d / tr)
          bilerp(tmp, x - dx * inf * 1.5, y - dy * inf * 1.5, (y * GRID + x) << 2, surf)
        }
      }
    }
  }
}

// --- Vortex: rotational displacement ---

function vortexDisplace(surf, tmp, cx, cy, radius) {
  tmp.set(surf)
  const x0 = Math.max(0, cx - radius | 0), x1 = Math.min(GRID, cx + radius + 1 | 0)
  const y0 = Math.max(0, cy - radius | 0), y1 = Math.min(GRID, cy + radius + 1 | 0)

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const ddx = x - cx, ddy = y - cy
      const d = Math.sqrt(ddx * ddx + ddy * ddy)
      if (d < radius && d > 0) {
        const t = d / radius
        const ang = (1 - t) * (1 - t) * 0.5
        const ca = Math.cos(ang), sa = Math.sin(ang)
        bilerp(tmp, cx + ddx * ca - ddy * sa, cy + ddx * sa + ddy * ca, (y * GRID + x) << 2, surf)
      }
    }
  }
}

// --- Nonpareil: alternating horizontal then vertical combing ---

function doNonpareil(surf, tmp) {
  const sp = 20, str = 25, half = sp / 2

  tmp.set(surf)
  for (let y = 0; y < GRID; y++) {
    const row = Math.floor(y / sp)
    const center = row * sp + half
    const dist = Math.abs(y - center)
    if (dist >= half) continue
    const dir = (row & 1) ? -1 : 1
    const inf = (1 - dist / half) * (1 - dist / half)
    const disp = dir * str * inf

    for (let x = 0; x < GRID; x++) {
      const sx = x - disp
      const x0 = Math.floor(sx)
      if (x0 >= 0 && x0 < GRID - 1) {
        const fx = sx - x0
        const di = (y * GRID + x) << 2
        const i0 = (y * GRID + x0) << 2
        surf[di]     = tmp[i0]     * (1 - fx) + tmp[i0 + 4]     * fx + 0.5 | 0
        surf[di + 1] = tmp[i0 + 1] * (1 - fx) + tmp[i0 + 5]     * fx + 0.5 | 0
        surf[di + 2] = tmp[i0 + 2] * (1 - fx) + tmp[i0 + 6]     * fx + 0.5 | 0
      }
    }
  }

  tmp.set(surf)
  for (let x = 0; x < GRID; x++) {
    const col = Math.floor(x / sp)
    const center = col * sp + half
    const dist = Math.abs(x - center)
    if (dist >= half) continue
    const dir = (col & 1) ? -1 : 1
    const inf = (1 - dist / half) * (1 - dist / half)
    const disp = dir * str * inf

    for (let y = 0; y < GRID; y++) {
      const sy = y - disp
      const y0 = Math.floor(sy)
      if (y0 >= 0 && y0 < GRID - 1) {
        const fy = sy - y0
        const di = (y * GRID + x) << 2
        const i0 = (y0 * GRID + x) << 2
        const i1 = ((y0 + 1) * GRID + x) << 2
        surf[di]     = tmp[i0]     * (1 - fy) + tmp[i1]     * fy + 0.5 | 0
        surf[di + 1] = tmp[i0 + 1] * (1 - fy) + tmp[i1 + 1] * fy + 0.5 | 0
        surf[di + 2] = tmp[i0 + 2] * (1 - fy) + tmp[i1 + 2] * fy + 0.5 | 0
      }
    }
  }
}

function clearGrid(surf) {
  for (let i = 0; i < GRID * GRID; i++) {
    const di = i << 2
    surf[di] = WATER[0]
    surf[di + 1] = WATER[1]
    surf[di + 2] = WATER[2]
    surf[di + 3] = 255
  }
}

// --- Component ---

const SuminagashiRitual = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('drop')
  const [colorIdx, setColorIdx] = useState(0)
  const [dropCount, setDropCount] = useState(0)
  const [strokeCount, setStrokeCount] = useState(0)
  const [message, setMessage] = useState('\u2234 drop ink upon still water \u2234')

  const modeRef = useRef('drop')
  const colorIdxRef = useRef(0)
  const surfRef = useRef(null)
  const tmpRef = useRef(null)
  const offCvs = useRef(null)
  const offCtxRef = useRef(null)
  const imgDataRef = useRef(null)
  const lastPos = useRef({ x: -1, y: -1 })
  const cursorPos = useRef({ x: 0, y: 0, active: false })
  const drawingRef = useRef(false)
  const dropsRef = useRef(0)
  const strokesRef = useRef(0)
  const dirtyRef = useRef(true)
  const frameRef = useRef(0)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { colorIdxRef.current = colorIdx }, [colorIdx])

  // Init pixel buffers and offscreen canvas
  useEffect(() => {
    const surf = new Uint8ClampedArray(GRID * GRID * 4)
    clearGrid(surf)
    surfRef.current = surf
    tmpRef.current = new Uint8ClampedArray(GRID * GRID * 4)

    const c = document.createElement('canvas')
    c.width = GRID
    c.height = GRID
    offCvs.current = c
    offCtxRef.current = c.getContext('2d')
    imgDataRef.current = offCtxRef.current.createImageData(GRID, GRID)
    dirtyRef.current = true
  }, [])

  // Mouse / touch event wiring
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const toGrid = (cx, cy) => {
      const r = canvas.getBoundingClientRect()
      return { x: (cx - r.left) / r.width * GRID, y: (cy - r.top) / r.height * GRID }
    }
    const xy = (e) => {
      const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0
      const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0
      return toGrid(cx, cy)
    }

    const onDown = (e) => {
      const pos = xy(e)
      drawingRef.current = true
      lastPos.current = pos
      cursorPos.current = { ...pos, active: true }

      if (modeRef.current === 'drop') {
        inkDrop(surfRef.current, tmpRef.current, pos.x, pos.y, INKS[colorIdxRef.current].rgb)
        dropsRef.current++
        dirtyRef.current = true
      }
    }

    const onMove = (e) => {
      const pos = xy(e)
      cursorPos.current = { ...pos, active: true }
      if (!drawingRef.current) return

      const prev = lastPos.current
      if (prev.x < 0) { lastPos.current = pos; return }

      const dx = pos.x - prev.x, dy = pos.y - prev.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 1) return

      const m = modeRef.current
      const s = surfRef.current, t = tmpRef.current

      if (m === 'stylus') {
        combDisplace(s, t, pos.x, pos.y, dx * 2, dy * 2, 35)
        strokesRef.current++
        dirtyRef.current = true
      } else if (m === 'rake') {
        rakeDisplace(s, t, pos.x, pos.y, dx * 2, dy * 2, 60, 5)
        strokesRef.current++
        dirtyRef.current = true
      } else if (m === 'vortex') {
        vortexDisplace(s, t, pos.x, pos.y, 40)
        strokesRef.current++
        dirtyRef.current = true
      } else if (m === 'drop' && dist > 15) {
        inkDrop(s, t, pos.x, pos.y, INKS[colorIdxRef.current].rgb)
        dropsRef.current++
        dirtyRef.current = true
      }

      lastPos.current = pos
    }

    const onUp = () => {
      drawingRef.current = false
      lastPos.current = { x: -1, y: -1 }
    }
    const onEnter = () => { cursorPos.current.active = true }
    const onLeave = () => {
      cursorPos.current.active = false
      drawingRef.current = false
      lastPos.current = { x: -1, y: -1 }
    }

    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseenter', onEnter)
    canvas.addEventListener('mouseleave', onLeave)
    canvas.addEventListener('touchstart', onDown, { passive: true })
    canvas.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchend', onUp)

    return () => {
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseenter', onEnter)
      canvas.removeEventListener('mouseleave', onLeave)
      canvas.removeEventListener('touchstart', onDown)
      canvas.removeEventListener('touchmove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchend', onUp)
    }
  }, [canvasRef])

  // Render frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0 || !surfRef.current || !imgDataRef.current) return
    frameRef.current++

    if (dirtyRef.current) {
      imgDataRef.current.data.set(surfRef.current)
      offCtxRef.current.putImageData(imgDataRef.current, 0, 0)
      dirtyRef.current = false
    }

    const w = dimensions.width, h = dimensions.height
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(offCvs.current, 0, 0, w, h)

    // Vignette
    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.7)
    vig.addColorStop(0, 'rgba(0, 2, 8, 0)')
    vig.addColorStop(1, 'rgba(0, 2, 8, 0.3)')
    ctx.fillStyle = vig
    ctx.fillRect(0, 0, w, h)

    // Tool cursor
    const cur = cursorPos.current
    if (cur.active) {
      const cx = (cur.x / GRID) * w, cy = (cur.y / GRID) * h
      const m = modeRef.current
      const scale = Math.min(w, h) / GRID
      let r, color

      if (m === 'drop') {
        r = 16 * scale
        const rgb = INKS[colorIdxRef.current].rgb
        color = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.5)`
      } else if (m === 'stylus') {
        r = 35 * scale
        color = 'rgba(102, 255, 204, 0.3)'
      } else if (m === 'rake') {
        r = 60 * scale
        color = 'rgba(102, 255, 204, 0.2)'
      } else {
        r = 40 * scale
        color = 'rgba(153, 102, 255, 0.3)'
      }

      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
    }

    if (frameRef.current % 30 === 0) {
      setDropCount(dropsRef.current)
      setStrokeCount(strokesRef.current)
    }
  }, [ctx, dimensions])

  // Animation loop
  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let id
    const animate = () => { onFrame(); id = requestAnimationFrame(animate) }
    id = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(id)
  }, [ctx, dimensions.width, onFrame])

  const handleClear = useCallback(() => {
    if (!surfRef.current) return
    clearGrid(surfRef.current)
    dropsRef.current = 0
    strokesRef.current = 0
    dirtyRef.current = true
    setMessage('\u2234 water stilled \u2014 begin again \u2234')
  }, [])

  const handleNonpareil = useCallback(() => {
    if (!surfRef.current || !tmpRef.current) return
    doNonpareil(surfRef.current, tmpRef.current)
    strokesRef.current += 20
    dirtyRef.current = true
    setMessage('\u2234 nonpareil \u2014 the ancient combed pattern \u2234')
  }, [])

  const handleModeChange = useCallback((m) => {
    setMode(m)
    const msgs = {
      drop: '\u2234 drop ink upon still water \u2234',
      stylus: '\u2234 drag to comb the surface \u2234',
      rake: '\u2234 rake with five tines \u2234',
      vortex: '\u2234 swirl the waters \u2234',
    }
    setMessage(msgs[m])
  }, [])

  const metrics = useMemo(() => [
    { label: 'drops', value: dropCount },
    { label: 'strokes', value: strokeCount },
    { label: 'ink', value: '\u25cf ' + INKS[colorIdx].name, color: `rgb(${INKS[colorIdx].rgb.join(',')})` },
  ], [dropCount, strokeCount, colorIdx])

  const controls = useMemo(() => [
    { id: 'nonpareil', label: 'nonpareil()', onClick: handleNonpareil },
    { id: 'clear', label: 'clear()', onClick: handleClear, variant: 'reset' },
  ], [handleNonpareil, handleClear])

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
            currentMode={mode}
            onModeChange={handleModeChange}
            controls={controls}
          />
          <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">{message}</p>
        </div>
        <div className="flex flex-wrap gap-1 sm:gap-2 items-center">
          <span className="text-void-green/40 text-xs mr-1">ink:</span>
          {INKS.map((ink, i) => (
            <button
              key={ink.name}
              onClick={() => { setColorIdx(i); setMessage(`\u2234 ${ink.name} ink selected \u2234`) }}
              className={`min-h-[44px] sm:min-h-0 w-[44px] sm:w-8 h-[44px] sm:h-6 border transition-colors active:scale-95 ${
                colorIdx === i
                  ? 'border-white/80 scale-110'
                  : 'border-void-green/30 hover:border-void-green/60'
              }`}
              style={{ backgroundColor: `rgb(${ink.rgb.join(',')})` }}
              data-testid={`ink-${ink.name}`}
              title={ink.name}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full ${mode === 'drop' ? 'cursor-pointer' : 'cursor-crosshair'}`}
          data-testid="suminagashi-canvas"
        />
      </div>
    </div>
  )
}

export default SuminagashiRitual
