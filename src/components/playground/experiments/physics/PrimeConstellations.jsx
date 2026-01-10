import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'ulam', label: 'map.ulam()' },
  { id: 'twin', label: 'map.twinweb()' },
  { id: 'totient', label: 'map.totient()' }
]

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

const buildPrimeMask = (limit) => {
  const mask = new Uint8Array(limit + 1)
  if (limit < 2) return mask

  mask.fill(1, 2)
  for (let i = 2; i * i <= limit; i++) {
    if (mask[i]) {
      for (let j = i * i; j <= limit; j += i) {
        mask[j] = 0
      }
    }
  }
  return mask
}

const digitSum = (n) => {
  let sum = 0
  let value = n
  while (value > 0) {
    sum += value % 10
    value = Math.floor(value / 10)
  }
  return sum
}

const totient = (n) => {
  if (n < 2) return 0
  let result = n
  let num = n
  for (let p = 2; p * p <= num; p++) {
    if (num % p === 0) {
      while (num % p === 0) num = Math.floor(num / p)
      result -= Math.floor(result / p)
    }
  }
  if (num > 1) result -= Math.floor(result / num)
  return result
}

const buildSpiral = (limit, mask) => {
  const nodes = []
  const indexByNumber = new Map()

  let x = 0
  let y = 0
  let legLength = 1
  let legProgress = 0
  let legRepeats = 0
  let dir = 0
  const dirs = [
    [1, 0],
    [0, -1],
    [-1, 0],
    [0, 1]
  ]

  let primeCount = 0
  let twinCount = 0

  for (let n = 1; n <= limit; n++) {
    const prime = mask[n] === 1
    const twin = prime && (mask[n - 2] === 1 || mask[n + 2] === 1)
    if (prime) primeCount++
    if (twin) twinCount++

    nodes.push({
      n,
      gx: x,
      gy: y,
      prime,
      twin,
      digitSum: digitSum(n),
      phi: n < 2 ? 0 : totient(n)
    })
    indexByNumber.set(n, nodes.length - 1)

    x += dirs[dir][0]
    y += dirs[dir][1]
    legProgress++
    if (legProgress >= legLength) {
      legProgress = 0
      dir = (dir + 1) % 4
      legRepeats++
      if (legRepeats === 2) {
        legLength++
        legRepeats = 0
      }
    }
  }

  return { nodes, indexByNumber, primeCount, twinCount }
}

const buildEdges = (mode, nodes, indexByNumber) => {
  const edges = []

  if (mode === 'ulam') {
    const map = new Map()
    for (const node of nodes) {
      if (node.prime) map.set(`${node.gx},${node.gy}`, node)
    }
    const offsets = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1]
    ]
    for (const node of nodes) {
      if (!node.prime) continue
      for (const [dx, dy] of offsets) {
        const key = `${node.gx + dx},${node.gy + dy}`
        const neighbor = map.get(key)
        if (neighbor) {
          edges.push({ from: node, to: neighbor, weight: dx === 0 || dy === 0 ? 1 : 0.6 })
        }
      }
    }
  } else if (mode === 'twin') {
    for (const node of nodes) {
      if (!node.twin) continue
      const targetIndex = indexByNumber.get(node.n + 2)
      if (targetIndex !== undefined) {
        edges.push({ from: node, to: nodes[targetIndex], weight: 1.2 })
      }
      const leftIndex = indexByNumber.get(node.n - 2)
      if (leftIndex !== undefined) {
        edges.push({ from: node, to: nodes[leftIndex], weight: 1.2 })
      }
    }
  } else if (mode === 'totient') {
    for (const node of nodes) {
      if (node.n < 3) continue
      const phiIndex = indexByNumber.get(node.phi)
      if (phiIndex !== undefined) {
        edges.push({ from: node, to: nodes[phiIndex], weight: 0.9 })
      }
    }
  }

  return edges
}

const PrimeConstellations = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('ulam')
  const [extent, setExtent] = useState(625)
  const [message, setMessage] = useState('∴ plotting primes into constellation lattice ∴')
  const [primeCount, setPrimeCount] = useState(0)
  const [twinCount, setTwinCount] = useState(0)
  const [highlighted, setHighlighted] = useState(null)
  const [scanSpeed, setScanSpeed] = useState(6)

  const nodesRef = useRef([])
  const indexMapRef = useRef(new Map())
  const edgesRef = useRef([])
  const scanRef = useRef(1)
  const frameRef = useRef(0)

  const rebuild = useCallback(() => {
    if (dimensions.width === 0) return
    const maxValue = clamp(extent, 64, 4096)
    const mask = buildPrimeMask(maxValue + 10)
    const { nodes, indexByNumber, primeCount: pCount, twinCount: tCount } = buildSpiral(maxValue, mask)

    nodesRef.current = nodes
    indexMapRef.current = indexByNumber
    setPrimeCount(pCount)
    setTwinCount(tCount)
    edgesRef.current = buildEdges(mode, nodes, indexByNumber)
    scanRef.current = Math.min(scanRef.current, nodes.length)
    setHighlighted(null)
  }, [dimensions.width, extent, mode])

  useEffect(() => {
    rebuild()
  }, [rebuild])

  const setNearestNode = useCallback((x, y) => {
    const nodes = nodesRef.current
    if (!ctx || dimensions.width === 0 || nodes.length === 0) return

    const cell = Math.max(8, Math.min(18, Math.floor(Math.min(dimensions.width, dimensions.height) / 80)))
    const cx = dimensions.centerX
    const cy = dimensions.centerY

    let best = null
    let bestDist = Infinity

    for (const node of nodes) {
      const px = cx + node.gx * cell
      const py = cy - node.gy * cell
      const dx = px - x
      const dy = py - y
      const dist = dx * dx + dy * dy
      if (dist < bestDist) {
        bestDist = dist
        best = node
      }
    }

    if (best) {
      setHighlighted(best)
      setMessage(best.prime
        ? `∴ prime ${best.n} • twin:${best.twin ? 'yes' : 'no'} • φ=${best.phi}`
        : `∴ composite ${best.n} • digit-sum=${best.digitSum}`)
    }
  }, [ctx, dimensions.centerX, dimensions.centerY, dimensions.height, dimensions.width])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setNearestNode(x, y)
    }

    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [canvasRef, setNearestNode])

  const draw = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    frameRef.current++
    scanRef.current += scanSpeed * 0.6
    const maxVisible = nodesRef.current.length
    if (scanRef.current > maxVisible) scanRef.current = 1

    ctx.fillStyle = 'rgba(0, 4, 10, 0.1)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const cell = Math.max(8, Math.min(18, Math.floor(Math.min(dimensions.width, dimensions.height) / 80)))
    const cx = dimensions.centerX
    const cy = dimensions.centerY

    ctx.save()
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.5
    for (const edge of edgesRef.current) {
      const x1 = cx + edge.from.gx * cell
      const y1 = cy - edge.from.gy * cell
      const x2 = cx + edge.to.gx * cell
      const y2 = cy - edge.to.gy * cell
      const hue = mode === 'twin' ? 40 : mode === 'totient' ? 180 : 120
      ctx.strokeStyle = `hsla(${hue}, 80%, 70%, ${0.12 + edge.weight * 0.08})`
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
    ctx.restore()

    for (const node of nodesRef.current) {
      const px = cx + node.gx * cell
      const py = cy - node.gy * cell
      const progress = node.n / scanRef.current
      const ahead = progress < 1 ? 1 - progress : 0
      const pulse = Math.max(0, 1 - ahead * 1.4)

      if (node.prime) {
        const hue = mode === 'twin' ? 35 : mode === 'totient' ? 200 : 140
        const alpha = 0.45 + pulse * 0.4
        ctx.fillStyle = `hsla(${hue + node.digitSum}, 90%, ${70 + pulse * 10}%, ${alpha})`
        ctx.beginPath()
        ctx.arc(px, py, cell * 0.35 + pulse * 1.2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillStyle = 'rgba(20, 40, 50, 0.25)'
        ctx.beginPath()
        ctx.rect(px - cell * 0.25, py - cell * 0.25, cell * 0.5, cell * 0.5)
        ctx.fill()
      }

      if (highlighted && highlighted.n === node.n) {
        ctx.strokeStyle = 'rgba(255, 255, 160, 0.9)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(px, py, cell * 0.55, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    if (highlighted) {
      ctx.fillStyle = 'rgba(255, 255, 210, 0.08)'
      ctx.beginPath()
      ctx.arc(cx + highlighted.gx * cell, cy - highlighted.gy * cell, cell * 1.3, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [ctx, dimensions.centerX, dimensions.centerY, dimensions.height, dimensions.width, highlighted, mode, scanSpeed])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let frameId
    const loop = () => {
      draw()
      frameId = requestAnimationFrame(loop)
    }
    frameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, draw])

  const adjustExtent = useCallback((delta) => {
    setExtent(prev => clamp(prev + delta, 64, 4096))
  }, [])

  const handleReset = useCallback(() => {
    setExtent(625)
    setMode('ulam')
    setHighlighted(null)
    setMessage('∴ reset lattice • primes breathe again ∴')
  }, [])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    setMessage(`∴ switched to ${nextMode} mapping ∴`)
  }, [])

  const metrics = useMemo(() => {
    const density = extent > 0 ? (primeCount / extent).toFixed(3) : '0'
    return [
      { label: 'extent', value: extent },
      { label: 'primes', value: primeCount },
      { label: 'twin.primes', value: twinCount },
      { label: 'density', value: density }
    ]
  }, [extent, primeCount, twinCount])

  const controls = [
    { id: 'expand', label: 'expand()', onClick: () => adjustExtent(196) },
    { id: 'contract', label: 'contract()', onClick: () => adjustExtent(-196), disabled: extent <= 100 },
    { id: 'tempo', label: scanSpeed >= 8 ? 'tempo.slow()' : 'tempo.quick()', onClick: () => setScanSpeed(prev => prev >= 8 ? 4 : 10), active: scanSpeed >= 8 },
    { id: 'reset', label: 'reset.view()', onClick: handleReset, variant: 'reset' }
  ]

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="relative z-50 flex items-center justify-between p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1 className="text-xl text-glow hidden sm:block" style={{ color: experiment.color }}>
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <ExperimentControls
            modes={MODES}
            currentMode={mode}
            onModeChange={handleModeChange}
            controls={controls}
          />

          <div className="flex items-center gap-2 ml-1">
            <span className="text-xs text-void-green/50 font-mono">extent</span>
            <input
              type="range"
              min="100"
              max="3200"
              step="25"
              value={extent}
              onChange={(e) => setExtent(parseInt(e.target.value, 10))}
              className="w-28 h-1 bg-void-green/20 rounded-lg appearance-none cursor-pointer accent-void-cyan"
              data-testid="extent-slider"
            />
            <span className="text-xs text-void-green font-mono w-14 text-right">{extent}</span>
          </div>
        </div>

        <p className="text-void-green/60 text-xs font-mono max-w-xl text-right">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="prime-constellations-canvas"
        />
        {mouse.isInBounds && highlighted && (
          <div
            className="absolute px-3 py-2 bg-void-dark/90 border border-void-green/30 text-xs text-void-green font-mono pointer-events-none"
            style={{ left: mouse.position.x + 12, top: mouse.position.y + 12 }}
          >
            <div>n = {highlighted.n}</div>
            <div>prime: {highlighted.prime ? 'yes' : 'no'}</div>
            <div>φ(n) = {highlighted.phi}</div>
            <div>digit sum = {highlighted.digitSum}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PrimeConstellations
