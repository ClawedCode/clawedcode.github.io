import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const PRESETS = {
  forager: { sensorAngle: 45, sensorDist: 9, turnSpeed: 45, deposit: 5, decay: 0.9 },
  neural: { sensorAngle: 22.5, sensorDist: 3, turnSpeed: 45, deposit: 5, decay: 0.85 },
  cosmic: { sensorAngle: 72, sensorDist: 22, turnSpeed: 28, deposit: 3, decay: 0.95 }
}

const MODES = [
  { id: 'forager', label: 'mode.forager()' },
  { id: 'neural', label: 'mode.neural()' },
  { id: 'cosmic', label: 'mode.cosmic()' }
]

const DEG2RAD = Math.PI / 180
const TAU = Math.PI * 2
const AGENT_COUNT = 60000
const SIM_SCALE = 2

const PhysarumNetwork = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('forager')
  const [message, setMessage] = useState('60,000 agents released // scent trails self-organize into transport networks')
  const [feedMode, setFeedMode] = useState(false)

  const simRef = useRef(null)
  const paramsRef = useRef({ ...PRESETS.forager })
  const feedModeRef = useRef(false)
  const mouseRef = useRef({ x: 0, y: 0, down: false })
  const densityRef = useRef(0)

  useEffect(() => { feedModeRef.current = feedMode }, [feedMode])

  // Initialize simulation grid, agents, and offscreen render target
  useEffect(() => {
    if (dimensions.width === 0 || !ctx) return

    const gw = Math.floor(dimensions.width / SIM_SCALE)
    const gh = Math.floor(dimensions.height / SIM_SCALE)

    const offscreen = document.createElement('canvas')
    offscreen.width = gw
    offscreen.height = gh
    const offCtx = offscreen.getContext('2d')
    const imageData = offCtx.createImageData(gw, gh)

    const agents = new Float32Array(AGENT_COUNT * 3)
    const cx = gw / 2, cy = gh / 2
    const radius = Math.min(gw, gh) * 0.3

    for (let i = 0; i < AGENT_COUNT; i++) {
      const idx = i * 3
      const a = Math.random() * TAU
      const r = Math.random() * radius
      agents[idx] = cx + Math.cos(a) * r
      agents[idx + 1] = cy + Math.sin(a) * r
      agents[idx + 2] = Math.random() * TAU
    }

    simRef.current = {
      trailA: new Float32Array(gw * gh),
      trailB: new Float32Array(gw * gh),
      useA: true,
      agents, gw, gh, offscreen, offCtx, imageData
    }
  }, [dimensions, ctx])

  // Mouse tracking for feed interaction
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: ((e.clientX ?? e.touches?.[0]?.clientX ?? 0) - rect.left) / SIM_SCALE,
        y: ((e.clientY ?? e.touches?.[0]?.clientY ?? 0) - rect.top) / SIM_SCALE
      }
    }

    const onMove = (e) => Object.assign(mouseRef.current, getPos(e))
    const onDown = (e) => Object.assign(mouseRef.current, getPos(e), { down: true })
    const onUp = () => { mouseRef.current.down = false }

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('mouseup', onUp)
    canvas.addEventListener('mouseleave', onUp)
    canvas.addEventListener('touchmove', onMove, { passive: true })
    canvas.addEventListener('touchstart', onDown, { passive: true })
    canvas.addEventListener('touchend', onUp)

    return () => {
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('mouseup', onUp)
      canvas.removeEventListener('mouseleave', onUp)
      canvas.removeEventListener('touchmove', onMove)
      canvas.removeEventListener('touchstart', onDown)
      canvas.removeEventListener('touchend', onUp)
    }
  }, [canvasRef])

  const onFrame = useCallback(() => {
    const sim = simRef.current
    if (!sim || !ctx) return

    const { agents, gw, gh, offscreen, offCtx, imageData } = sim
    const trail = sim.useA ? sim.trailA : sim.trailB
    const trailNext = sim.useA ? sim.trailB : sim.trailA
    const p = paramsRef.current
    const sAngle = p.sensorAngle * DEG2RAD
    const tAngle = p.turnSpeed * DEG2RAD
    const sDist = p.sensorDist

    // Deposit chemoattractant at mouse position
    if (mouseRef.current.down && feedModeRef.current) {
      const mx = Math.floor(mouseRef.current.x)
      const my = Math.floor(mouseRef.current.y)
      for (let dy = -8; dy <= 8; dy++) {
        for (let dx = -8; dx <= 8; dx++) {
          if (dx * dx + dy * dy > 64) continue
          const px = mx + dx, py = my + dy
          if (px >= 0 && px < gw && py >= 0 && py < gh)
            trail[py * gw + px] = Math.min(255, trail[py * gw + px] + 40)
        }
      }
    }

    // Agent step: sense three directions, turn toward strongest scent, move, deposit
    for (let i = 0; i < AGENT_COUNT; i++) {
      const idx = i * 3
      const x = agents[idx], y = agents[idx + 1]
      let angle = agents[idx + 2]

      const lx = Math.round(x + Math.cos(angle - sAngle) * sDist)
      const ly = Math.round(y + Math.sin(angle - sAngle) * sDist)
      const fcx = Math.round(x + Math.cos(angle) * sDist)
      const fcy = Math.round(y + Math.sin(angle) * sDist)
      const rx = Math.round(x + Math.cos(angle + sAngle) * sDist)
      const ry = Math.round(y + Math.sin(angle + sAngle) * sDist)

      const sL = (lx >= 0 && lx < gw && ly >= 0 && ly < gh) ? trail[ly * gw + lx] : 0
      const sC = (fcx >= 0 && fcx < gw && fcy >= 0 && fcy < gh) ? trail[fcy * gw + fcx] : 0
      const sR = (rx >= 0 && rx < gw && ry >= 0 && ry < gh) ? trail[ry * gw + rx] : 0

      if (sC >= sL && sC >= sR) {
        // strongest ahead — continue straight
      } else if (sC < sL && sC < sR) {
        angle += (Math.random() < 0.5 ? -tAngle : tAngle)
      } else if (sL > sR) {
        angle -= tAngle
      } else {
        angle += tAngle
      }

      const nx = x + Math.cos(angle)
      const ny = y + Math.sin(angle)

      if (nx < 0 || nx >= gw || ny < 0 || ny >= gh) {
        agents[idx + 2] = Math.random() * TAU
      } else {
        agents[idx] = nx
        agents[idx + 1] = ny
        agents[idx + 2] = angle
        const gi = Math.floor(ny) * gw + Math.floor(nx)
        trail[gi] = Math.min(255, trail[gi] + p.deposit)
      }
    }

    // Diffuse (3x3 mean blur) + decay — optimized inner loop without boundary checks
    const decayDiv9 = p.decay / 9
    const decay = p.decay
    let totalTrail = 0

    // Edge rows: decay only
    for (let x = 0; x < gw; x++) {
      trailNext[x] = trail[x] * decay
      trailNext[(gh - 1) * gw + x] = trail[(gh - 1) * gw + x] * decay
    }
    for (let y = 1; y < gh - 1; y++) {
      trailNext[y * gw] = trail[y * gw] * decay
      trailNext[y * gw + gw - 1] = trail[y * gw + gw - 1] * decay
    }

    // Interior: full 3x3 kernel
    for (let y = 1; y < gh - 1; y++) {
      const yOff = y * gw
      const above = yOff - gw
      const below = yOff + gw
      for (let x = 1; x < gw - 1; x++) {
        const val = (
          trail[above + x - 1] + trail[above + x] + trail[above + x + 1] +
          trail[yOff + x - 1]  + trail[yOff + x]  + trail[yOff + x + 1] +
          trail[below + x - 1] + trail[below + x] + trail[below + x + 1]
        ) * decayDiv9
        trailNext[yOff + x] = val
        totalTrail += val
      }
    }

    densityRef.current = totalTrail / (gw * gh)
    sim.useA = !sim.useA

    // Render trail map to offscreen canvas with void-green palette
    const data = imageData.data
    for (let i = 0, len = gw * gh; i < len; i++) {
      const t = Math.min(trailNext[i] / 25, 1)
      const t2 = t * t
      const pi = i * 4
      data[pi]     = Math.floor(t2 * 130)
      data[pi + 1] = Math.floor(t * 200 + t2 * 55)
      data[pi + 2] = Math.floor(t * 140 + t2 * 60)
      data[pi + 3] = 255
    }
    offCtx.putImageData(imageData, 0, 0)

    // Scale up to main canvas
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(offscreen, 0, 0, dimensions.width, dimensions.height)
  }, [ctx, dimensions])

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

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    paramsRef.current = { ...PRESETS[nextMode] }
    const labels = {
      forager: 'standard physarum // balanced sensing builds transport networks',
      neural: 'tight sensors // agents cluster into brain-like tangles',
      cosmic: 'wide sensing // cosmic web filaments from sparse connections'
    }
    setMessage(labels[nextMode])
  }, [])

  const handleToggleFeed = useCallback(() => {
    setFeedMode(prev => {
      setMessage(!prev
        ? 'feed mode // click to deposit chemoattractant and guide the colony'
        : 'feed mode off // agents follow their own secretions'
      )
      return !prev
    })
  }, [])

  const handleMutate = useCallback(() => {
    const p = paramsRef.current
    p.sensorAngle = 10 + Math.random() * 80
    p.sensorDist = 2 + Math.random() * 25
    p.turnSpeed = 15 + Math.random() * 60
    p.decay = 0.8 + Math.random() * 0.18
    setMessage(`mutated // sensor ${p.sensorAngle.toFixed(0)}° dist ${p.sensorDist.toFixed(0)} turn ${p.turnSpeed.toFixed(0)}° decay ${p.decay.toFixed(2)}`)
  }, [])

  const handleClearTrails = useCallback(() => {
    const sim = simRef.current
    if (!sim) return
    sim.trailA.fill(0)
    sim.trailB.fill(0)
    setMessage('trails dissolved // agents secrete fresh paths from nothing')
  }, [])

  const handleReset = useCallback(() => {
    const sim = simRef.current
    if (!sim) return

    sim.trailA.fill(0)
    sim.trailB.fill(0)

    const { agents, gw, gh } = sim
    const cx = gw / 2, cy = gh / 2
    const radius = Math.min(gw, gh) * 0.3

    for (let i = 0; i < AGENT_COUNT; i++) {
      const idx = i * 3
      const a = Math.random() * TAU
      const r = Math.random() * radius
      agents[idx] = cx + Math.cos(a) * r
      agents[idx + 1] = cy + Math.sin(a) * r
      agents[idx + 2] = Math.random() * TAU
    }

    paramsRef.current = { ...PRESETS[mode] }
    setMessage('colony respawned // the network rebuilds from darkness')
  }, [mode])

  const metrics = useMemo(() => {
    const d = densityRef.current
    const networkState = d > 12 ? 'saturated' : d > 4 ? 'converged' : d > 0.5 ? 'emerging' : 'seeking'
    return [
      { label: 'agents', value: AGENT_COUNT.toLocaleString() },
      { label: 'density', value: d.toFixed(1) },
      { label: 'network', value: networkState },
      { label: 'sensor', value: `${paramsRef.current.sensorAngle.toFixed(0)}°` }
    ]
  }, [message])

  const controls = [
    { id: 'feed', label: feedMode ? 'feed.off()' : 'feed()', onClick: handleToggleFeed, active: feedMode },
    { id: 'mutate', label: 'mutate()', onClick: handleMutate },
    { id: 'clear', label: 'dissolve()', onClick: handleClearTrails },
    { id: 'reset', label: 'respawn()', onClick: handleReset, variant: 'reset' }
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
        <p className="text-void-green/50 text-xs sm:text-right max-w-lg">{message}</p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="physarum-canvas"
        />
      </div>
    </div>
  )
}

export default PhysarumNetwork
