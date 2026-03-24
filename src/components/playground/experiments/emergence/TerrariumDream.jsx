import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const CELL = 4
const SIM_STEPS = 2
const BRUSH_R = 5
const HIST_LEN = 300

// Cell types
const EMPTY = 0, GRASS = 1, RABBIT = 2, FOX = 3, WALL = 4

// Tuning — balanced for oscillating populations
const GRASS_GROW = 0.5
const GRASS_SPREAD = 0.02
const GRASS_MAX = 100
const R_COST = 0.5
const R_EAT = 25
const R_BIRTH = 70
const R_START = 45
const R_MAX_E = 120
const F_COST = 0.7
const F_EAT = 40
const F_BIRTH = 80
const F_START = 55
const F_MAX_E = 140

const MODES = [
  { id: 'grass', label: 'paint.grass()' },
  { id: 'rabbit', label: 'paint.rabbit()' },
  { id: 'fox', label: 'paint.fox()' },
  { id: 'wall', label: 'paint.wall()' },
  { id: 'erase', label: 'erase()' }
]

// Reusable neighbor buffer (safe — JS is single-threaded)
const _nb = new Int32Array(8)

const TerrariumDream = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('grass')
  const [paused, setPaused] = useState(false)
  const [showCensus, setShowCensus] = useState(true)
  const [message, setMessage] = useState('paint grass into the void substrate — then introduce creatures')
  const [mData, setMData] = useState({ grass: 0, rabbits: 0, foxes: 0, gen: 0 })

  const gRef = useRef(null)
  const offRef = useRef(null)
  const imgRef = useRef(null)
  const frameN = useRef(0)
  const histRef = useRef([])
  const aBuf = useRef(new Uint32Array(0))

  const initGrid = useCallback(() => {
    if (dimensions.width < 20 || dimensions.height < 20) return
    const cols = Math.floor(dimensions.width / CELL)
    const rows = Math.floor(dimensions.height / CELL)
    const size = cols * rows

    gRef.current = {
      cols, rows, size, gen: 0,
      type: new Uint8Array(size),
      energy: new Float32Array(size)
    }

    const oc = document.createElement('canvas')
    oc.width = cols; oc.height = rows
    offRef.current = oc
    imgRef.current = null
    histRef.current = []
    if (aBuf.current.length < size) aBuf.current = new Uint32Array(size)
    setMessage('empty terrarium — paint grass, then introduce creatures')
  }, [dimensions.width, dimensions.height])

  useEffect(() => { initGrid() }, [initGrid])

  const applyBrush = useCallback((px, py) => {
    const g = gRef.current
    if (!g) return
    const gx = (px / CELL) | 0, gy = (py / CELL) | 0

    for (let dy = -BRUSH_R; dy <= BRUSH_R; dy++) {
      for (let dx = -BRUSH_R; dx <= BRUSH_R; dx++) {
        if (dx * dx + dy * dy > BRUSH_R * BRUSH_R) continue
        const x = gx + dx, y = gy + dy
        if (x < 0 || y < 0 || x >= g.cols || y >= g.rows) continue
        const i = y * g.cols + x

        if (mode === 'erase') {
          g.type[i] = EMPTY; g.energy[i] = 0
        } else if (mode === 'wall') {
          g.type[i] = WALL; g.energy[i] = 0
        } else if (mode === 'grass' && g.type[i] === EMPTY) {
          g.type[i] = GRASS; g.energy[i] = 40 + Math.random() * 60
        } else if (mode === 'rabbit' && g.type[i] === EMPTY && Math.random() < 0.1) {
          g.type[i] = RABBIT; g.energy[i] = R_START
        } else if (mode === 'fox' && g.type[i] === EMPTY && Math.random() < 0.05) {
          g.type[i] = FOX; g.energy[i] = F_START
        }
      }
    }
  }, [mode])

  const simulate = useCallback(() => {
    const g = gRef.current
    if (!g) return null
    const { cols, rows, size, type, energy } = g
    g.gen++

    let grassC = 0, rabbitC = 0, foxC = 0

    // Phase 1: Grass growth + spread
    for (let i = 0; i < size; i++) {
      if (type[i] !== GRASS) continue
      grassC++
      if (energy[i] < GRASS_MAX) energy[i] += GRASS_GROW
      if (energy[i] > 35 && Math.random() < GRASS_SPREAD) {
        const x = i % cols, y = (i / cols) | 0
        const nx = x + ((Math.random() * 3) | 0) - 1
        const ny = y + ((Math.random() * 3) | 0) - 1
        if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) {
          const ni = ny * cols + nx
          if (type[ni] === EMPTY) { type[ni] = GRASS; energy[ni] = 15 }
        }
      }
    }

    // Phase 2: Collect + shuffle animals
    let ac = 0
    const buf = aBuf.current
    for (let i = 0; i < size; i++) {
      if (type[i] === RABBIT || type[i] === FOX) buf[ac++] = i
    }
    for (let i = ac - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0
      const t = buf[i]; buf[i] = buf[j]; buf[j] = t
    }

    // Phase 3: Process each animal
    for (let a = 0; a < ac; a++) {
      const idx = buf[a]
      const t = type[idx]
      if (t !== RABBIT && t !== FOX) continue // already eaten

      const x = idx % cols, y = (idx / cols) | 0
      const isR = t === RABBIT

      energy[idx] -= isR ? R_COST : F_COST

      // Starvation
      if (energy[idx] <= 0) {
        type[idx] = Math.random() < 0.25 ? GRASS : EMPTY
        energy[idx] = type[idx] === GRASS ? 10 : 0
        continue
      }

      // Gather + shuffle neighbors
      let nbc = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) {
            _nb[nbc++] = ny * cols + nx
          }
        }
      }
      for (let i = nbc - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0
        const tmp = _nb[i]; _nb[i] = _nb[j]; _nb[j] = tmp
      }

      const prey = isR ? GRASS : RABBIT
      const eatE = isR ? R_EAT : F_EAT
      const birthE = isR ? R_BIRTH : F_BIRTH
      const maxE = isR ? R_MAX_E : F_MAX_E

      // Hunt for food
      let food = -1
      if (isR) {
        let bestE = 0
        for (let n = 0; n < nbc; n++) {
          const ni = _nb[n]
          if (type[ni] === prey && energy[ni] > bestE) { food = ni; bestE = energy[ni] }
        }
      } else {
        for (let n = 0; n < nbc; n++) {
          if (type[_nb[n]] === prey) { food = _nb[n]; break }
        }
      }

      if (food >= 0) {
        const newE = Math.min(maxE, energy[idx] + eatE)
        const oldIdx = idx
        type[idx] = EMPTY; energy[idx] = 0
        type[food] = t; energy[food] = newE
        // Reproduce
        if (newE >= birthE) {
          energy[food] = newE * 0.55
          type[oldIdx] = t
          energy[oldIdx] = newE * 0.35
        }
      } else {
        // Wander
        for (let n = 0; n < nbc; n++) {
          const ni = _nb[n]
          if (type[ni] === EMPTY) {
            type[ni] = t; energy[ni] = energy[idx]
            type[idx] = EMPTY; energy[idx] = 0
            break
          }
        }
      }

      if (isR) rabbitC++; else foxC++
    }

    return { grass: grassC, rabbits: rabbitC, foxes: foxC }
  }, [])

  const draw = useCallback(() => {
    const g = gRef.current
    if (!g || !ctx || !offRef.current) return
    const { cols, rows, size, type, energy } = g
    const oCtx = offRef.current.getContext('2d')

    if (!imgRef.current || imgRef.current.width !== cols) {
      imgRef.current = oCtx.createImageData(cols, rows)
    }
    const px = imgRef.current.data

    for (let i = 0; i < size; i++) {
      const pi = i * 4
      const t = type[i]
      const e = energy[i]

      if (t === GRASS) {
        const v = 0.3 + (e / GRASS_MAX) * 0.7
        px[pi] = (15 * v) | 0
        px[pi + 1] = (55 + 145 * v) | 0
        px[pi + 2] = (20 * v) | 0
      } else if (t === RABBIT) {
        const v = 0.5 + (e / R_MAX_E) * 0.5
        px[pi] = (195 * v) | 0
        px[pi + 1] = (210 * v) | 0
        px[pi + 2] = (235 * v) | 0
      } else if (t === FOX) {
        const v = 0.4 + (e / F_MAX_E) * 0.6
        px[pi] = (245 * v) | 0
        px[pi + 1] = (140 * v) | 0
        px[pi + 2] = (35 * v) | 0
      } else if (t === WALL) {
        px[pi] = 28; px[pi + 1] = 28; px[pi + 2] = 32
      } else {
        px[pi] = 3; px[pi + 1] = 5; px[pi + 2] = 10
      }
      px[pi + 3] = 255
    }

    oCtx.putImageData(imgRef.current, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(offRef.current, 0, 0, dimensions.width, dimensions.height)

    // Census graph overlay
    if (showCensus && histRef.current.length > 2) {
      const hist = histRef.current
      const gw = Math.min(260, dimensions.width * 0.3)
      const gh = 70
      const gx = dimensions.width - gw - 12
      const gy = dimensions.height - gh - 12

      ctx.fillStyle = 'rgba(0, 2, 8, 0.8)'
      ctx.fillRect(gx - 2, gy - 2, gw + 4, gh + 4)
      ctx.strokeStyle = 'rgba(102, 255, 204, 0.15)'
      ctx.lineWidth = 1
      ctx.strokeRect(gx - 2, gy - 2, gw + 4, gh + 4)

      const drawLine = (key, color) => {
        const maxV = Math.max(1, ...hist.map(h => h[key]))
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        for (let i = 0; i < hist.length; i++) {
          const hx = gx + (i / HIST_LEN) * gw
          const hy = gy + gh - 2 - (hist[i][key] / maxV) * (gh - 14)
          if (i === 0) ctx.moveTo(hx, hy)
          else ctx.lineTo(hx, hy)
        }
        ctx.stroke()
      }

      drawLine('grass', 'rgba(80, 200, 80, 0.6)')
      drawLine('rabbits', 'rgba(195, 210, 235, 0.8)')
      drawLine('foxes', 'rgba(245, 140, 35, 0.8)')

      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo'
      ctx.textBaseline = 'top'
      ctx.fillStyle = 'rgba(80, 200, 80, 0.5)'; ctx.fillText('grass', gx + 3, gy + 2)
      ctx.fillStyle = 'rgba(195, 210, 235, 0.6)'; ctx.fillText('rabbit', gx + 38, gy + 2)
      ctx.fillStyle = 'rgba(245, 140, 35, 0.6)'; ctx.fillText('fox', gx + 80, gy + 2)
    }
  }, [ctx, dimensions.width, dimensions.height, showCensus])

  const onFrame = useCallback(() => {
    if (!ctx || !gRef.current) return
    frameN.current++

    if (mouse.isDown && mouse.isInBounds) {
      applyBrush(mouse.positionRef.current.x, mouse.positionRef.current.y)
    }

    if (!paused) {
      let stats
      for (let s = 0; s < SIM_STEPS; s++) {
        stats = simulate()
      }
      if (stats && frameN.current % 8 === 0) {
        setMData({ ...stats, gen: gRef.current.gen })
        histRef.current.push({ ...stats })
        if (histRef.current.length > HIST_LEN) histRef.current.shift()
      }
    }

    draw()
  }, [ctx, mouse.isDown, mouse.isInBounds, applyBrush, simulate, draw, paused])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let fid
    const loop = () => { onFrame(); fid = requestAnimationFrame(loop) }
    fid = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(fid)
  }, [ctx, dimensions.width, onFrame])

  const handleSeed = useCallback(() => {
    const g = gRef.current
    if (!g) return
    const { cols, rows, size, type, energy } = g
    type.fill(EMPTY); energy.fill(0)

    // Scatter grass patches
    for (let p = 0; p < 14; p++) {
      const cx = (Math.random() * cols) | 0
      const cy = (Math.random() * rows) | 0
      const r = 8 + ((Math.random() * 16) | 0)
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r) continue
          const x = cx + dx, y = cy + dy
          if (x < 0 || y < 0 || x >= cols || y >= rows) continue
          if (Math.random() < 0.85) {
            const i = y * cols + x
            type[i] = GRASS; energy[i] = 30 + Math.random() * 70
          }
        }
      }
    }

    let rc = 0, fc = 0
    for (let i = 0; i < size; i++) {
      if (type[i] === GRASS && Math.random() < 0.007) { type[i] = RABBIT; energy[i] = R_START; rc++ }
    }
    for (let i = 0; i < size; i++) {
      if (type[i] === EMPTY && Math.random() < 0.0006) { type[i] = FOX; energy[i] = F_START; fc++ }
    }

    histRef.current = []
    setMessage(`ecosystem seeded — ${rc} rabbits and ${fc} foxes loosed into the green`)
  }, [])

  const handlePlague = useCallback(() => {
    const g = gRef.current
    if (!g) return
    for (let i = 0; i < g.size; i++) {
      if ((g.type[i] === RABBIT || g.type[i] === FOX) && Math.random() < 0.5) {
        g.type[i] = EMPTY; g.energy[i] = 0
      }
    }
    setMessage('plague sweeps the terrarium — half the fauna falls silent')
  }, [])

  const handleFeast = useCallback(() => {
    const g = gRef.current
    if (!g) return
    for (let i = 0; i < g.size; i++) {
      if (g.type[i] === EMPTY && Math.random() < 0.12) {
        g.type[i] = GRASS; g.energy[i] = 50 + Math.random() * 50
      }
    }
    setMessage('rain falls on the substrate — grass erupts from dormant seeds')
  }, [])

  const handleClear = useCallback(() => {
    const g = gRef.current
    if (!g) return
    g.type.fill(EMPTY); g.energy.fill(0); g.gen = 0
    histRef.current = []
    setMData({ grass: 0, rabbits: 0, foxes: 0, gen: 0 })
    setMessage('the terrarium empties — only substrate hum remains')
  }, [])

  const togglePause = useCallback(() => {
    setPaused(p => {
      setMessage(!p
        ? 'time suspends — the ecosystem holds its breath'
        : 'time resumes — the old dance of predation continues')
      return !p
    })
  }, [])

  const toggleCensus = useCallback(() => { setShowCensus(p => !p) }, [])

  const metrics = useMemo(() => [
    { label: 'grass', value: mData.grass, color: 'rgb(80, 200, 80)' },
    { label: 'rabbit', value: mData.rabbits, color: 'rgb(195, 210, 235)' },
    { label: 'fox', value: mData.foxes, color: 'rgb(245, 140, 35)' },
    { label: 'gen', value: mData.gen }
  ], [mData])

  const controls = [
    { id: 'seed', label: 'seed()', onClick: handleSeed },
    { id: 'rain', label: 'rain()', onClick: handleFeast },
    { id: 'plague', label: 'plague()', onClick: handlePlague },
    { id: 'pause', label: paused ? 'resume()' : 'pause()', onClick: togglePause, active: paused },
    { id: 'census', label: 'census()', onClick: toggleCensus, active: showCensus },
    { id: 'clear', label: 'clear()', onClick: handleClear, variant: 'reset' }
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
        <ExperimentControls modes={MODES} currentMode={mode} onModeChange={setMode} controls={controls} />
        <p className="text-void-green/50 text-xs sm:text-right max-w-lg">{message}</p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-crosshair" data-testid="terrarium-canvas" />
      </div>
    </div>
  )
}

export default TerrariumDream
