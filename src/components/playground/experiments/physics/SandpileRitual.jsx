import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'drip', label: 'mode.drip()' },
  { id: 'rain', label: 'mode.rain()' },
  { id: 'fault', label: 'mode.faultline()' }
]

const HEIGHT_COLORS = [
  '#030313',
  '#051238',
  '#072758',
  '#0a3d7a',
  '#0d5da3',
  '#16a1d4',
  '#6bf5ff'
]

const SandpileRitual = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('drip')
  const [message, setMessage] = useState('∴ empty basin awaiting the first grain ∴')
  const [grainCount, setGrainCount] = useState(0)
  const [avalancheCount, setAvalancheCount] = useState(0)
  const [lastAvalanche, setLastAvalanche] = useState(0)
  const [criticality, setCriticality] = useState('empty')

  const gridRef = useRef(null)
  const energyRef = useRef(null)
  const unstableRef = useRef([])
  const avalancheRef = useRef({ active: false, size: 0 })
  const cellSizeRef = useRef(8)
  const grainCountRef = useRef(0)
  const tickRef = useRef(0)
  const faultPhaseRef = useRef(0)
  const criticalityRef = useRef('empty')

  const initializeGrid = useCallback(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return

    const baseSize = Math.max(6, Math.min(16, Math.floor(dimensions.width / 90)))
    const cols = Math.max(20, Math.floor(dimensions.width / baseSize))
    const rows = Math.max(12, Math.floor(dimensions.height / baseSize))
    const length = cols * rows

    gridRef.current = {
      cols,
      rows,
      cells: new Uint8Array(length)
    }
    energyRef.current = new Float32Array(length)
    unstableRef.current = []
    avalancheRef.current = { active: false, size: 0 }
    cellSizeRef.current = baseSize
    grainCountRef.current = 0
    tickRef.current = 0
    faultPhaseRef.current = 0
    criticalityRef.current = 'empty'
    setGrainCount(0)
    setAvalancheCount(0)
    setLastAvalanche(0)
    setCriticality('empty')
    setMessage('∴ grid reset // new ritual begins ∴')
  }, [dimensions.height, dimensions.width])

  useEffect(() => {
    initializeGrid()
  }, [initializeGrid])

  const depositAtIndex = useCallback((index, amount = 1) => {
    const grid = gridRef.current
    if (!grid || index < 0 || index >= grid.cells.length) return 0
    grid.cells[index] += amount
    if (grid.cells[index] >= 4) {
      unstableRef.current.push(index)
    }
    grainCountRef.current += amount
    return amount
  }, [])

  const brushDrop = useCallback((x, y, radius = 1.2, density = 1) => {
    const grid = gridRef.current
    if (!grid) return 0
    const size = cellSizeRef.current
    const centerCol = Math.floor(x / size)
    const centerRow = Math.floor(y / size)
    const cellRadius = Math.max(1, Math.round(radius))
    let total = 0

    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        if (dx * dx + dy * dy > cellRadius * cellRadius) continue
        const col = centerCol + dx
        const row = centerRow + dy
        if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) continue
        const idx = row * grid.cols + col
        total += depositAtIndex(idx, density)
      }
    }

    return total
  }, [depositAtIndex])

  const dropRandom = useCallback((count = 100, density = 1) => {
    const grid = gridRef.current
    if (!grid) return
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * grid.cells.length)
      depositAtIndex(idx, density)
    }
  }, [depositAtIndex])

  const processToppling = useCallback((maxSteps = 4000) => {
    const grid = gridRef.current
    const energy = energyRef.current
    if (!grid || !energy) return 0

    const { cols, rows, cells } = grid
    const stack = unstableRef.current
    let steps = 0

    while (stack.length && steps < maxSteps) {
      const idx = stack.pop()
      if (cells[idx] < 4) continue

      cells[idx] -= 4
      energy[idx] = 1
      steps++

      const x = idx % cols
      const y = Math.floor(idx / cols)

      if (y > 0) {
        const up = idx - cols
        cells[up] += 1
        if (cells[up] >= 4) stack.push(up)
      } else {
        grainCountRef.current--
      }

      if (y < rows - 1) {
        const down = idx + cols
        cells[down] += 1
        if (cells[down] >= 4) stack.push(down)
      } else {
        grainCountRef.current--
      }

      if (x > 0) {
        const left = idx - 1
        cells[left] += 1
        if (cells[left] >= 4) stack.push(left)
      } else {
        grainCountRef.current--
      }

      if (x < cols - 1) {
        const right = idx + 1
        cells[right] += 1
        if (cells[right] >= 4) stack.push(right)
      } else {
        grainCountRef.current--
      }
    }

    if (steps > 0) {
      avalancheRef.current.active = true
      avalancheRef.current.size += steps
    } else if (avalancheRef.current.active) {
      setAvalancheCount(count => count + 1)
      setLastAvalanche(avalancheRef.current.size)
      setMessage(`∴ avalanche dissipated after ${avalancheRef.current.size} cascades ∴`)
      avalancheRef.current = { active: false, size: 0 }
    }

    const load = stack.length
    let level = 'settled'
    if (grainCountRef.current === 0) level = 'empty'
    else if (load === 0) level = 'waiting'
    else if (load < 40) level = 'tremor'
    else if (load < 200) level = 'surge'
    else level = 'critical'

    if (criticalityRef.current !== level) {
      criticalityRef.current = level
      setCriticality(level)
    }

    setGrainCount(Math.max(0, grainCountRef.current))
    return steps
  }, [])

  const relaxUntilStable = useCallback(() => {
    let safety = 0
    let processed = 0
    do {
      processed = processToppling(20000)
      safety++
    } while (processed > 0 && safety < 12)
    setMessage('∴ relaxation chant completed ∴')
  }, [processToppling])

  const handleInfuse = useCallback(() => {
    const cx = dimensions.centerX || dimensions.width / 2
    const cy = dimensions.centerY || dimensions.height / 2
    brushDrop(cx, cy, 3, 3)
    setGrainCount(Math.max(0, grainCountRef.current))
    setMessage('∴ core infused with layered grains ∴')
  }, [brushDrop, dimensions.centerX, dimensions.centerY, dimensions.height, dimensions.width])

  const handleScatter = useCallback(() => {
    dropRandom(400)
    setGrainCount(Math.max(0, grainCountRef.current))
    setMessage('∴ random rain seeded the basin ∴')
  }, [dropRandom])

  const handleFaultQuake = useCallback(() => {
    const grid = gridRef.current
    if (!grid) return
    const { cols, rows } = grid
    const row = Math.floor(rows / 2 + (Math.random() - 0.5) * (rows * 0.4))
    let added = 0
    for (let x = 0; x < cols; x++) {
      const idx = row * cols + x
      added += depositAtIndex(idx, 2)
    }
    setGrainCount(Math.max(0, grainCountRef.current))
    setMessage(`∴ faultline charged with ${added} grains ∴`)
  }, [depositAtIndex])

  const handleReset = useCallback(() => {
    initializeGrid()
  }, [initializeGrid])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    if (nextMode === 'rain') {
      setMessage('∴ gentle rain keeps the pile near criticality ∴')
    } else if (nextMode === 'fault') {
      setMessage('∴ shifting plates feed the center row ∴')
    } else {
      setMessage('∴ manual drip // paint with gravity ∴')
    }
  }, [])

  const drawGrid = useCallback(() => {
    if (!ctx || !gridRef.current) return
    const grid = gridRef.current
    const energy = energyRef.current
    const size = cellSizeRef.current
    const { cols, rows, cells } = grid

    const centerX = dimensions.centerX || dimensions.width / 2
    const centerY = dimensions.centerY || dimensions.height / 2
    const innerRadius = Math.max(20, Math.min(dimensions.width, dimensions.height) * 0.15)
    const outerRadius = Math.max(dimensions.width, dimensions.height) * 0.8
    const background = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, outerRadius)
    background.addColorStop(0, '#020726')
    background.addColorStop(0.5, '#010316')
    background.addColorStop(1, '#00010b')
    ctx.fillStyle = background
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    ctx.save()
    ctx.globalAlpha = 0.25
    ctx.fillStyle = '#00040f'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)
    ctx.restore()

    const maxHeightIndex = HEIGHT_COLORS.length - 1

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x
        const height = Math.min(cells[idx], maxHeightIndex)
        const color = HEIGHT_COLORS[height]
        const normalized = maxHeightIndex === 0 ? 0 : height / maxHeightIndex
        const depthScale = 0.85 + normalized * 0.25
        const renderSize = size * depthScale
        const offsetX = x * size + (size - renderSize) / 2
        const offsetY = y * size + (size - renderSize) / 2

        ctx.fillStyle = color
        ctx.fillRect(offsetX, offsetY, renderSize, renderSize)

        const sheenAlpha = 0.05 + normalized * 0.12
        const sheenHeight = renderSize * 0.3
        ctx.fillStyle = `rgba(188, 255, 255, ${sheenAlpha})`
        ctx.fillRect(offsetX, offsetY, renderSize, sheenHeight)

        const energyLevel = energy[idx]
        if (energyLevel > 0.02) {
          const glow = Math.min(1, energyLevel * 1.2)
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          ctx.shadowColor = 'rgba(70, 233, 255, 0.9)'
          ctx.shadowBlur = 12 + glow * 30
          ctx.fillStyle = `rgba(48, 212, 255, ${0.15 + glow * 0.35})`
          ctx.fillRect(offsetX, offsetY, renderSize, renderSize)
          ctx.restore()
          energy[idx] *= 0.86
        } else {
          energy[idx] *= 0.92
        }

        if (cells[idx] >= 4) {
          const pulse = 0.4 + 0.6 * Math.sin((tickRef.current * 0.15) + idx * 0.07)
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'
          ctx.shadowBlur = 18
          ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + pulse * 0.3})`
          ctx.fillRect(offsetX, offsetY, renderSize, renderSize)
          ctx.restore()
        }
      }
    }

    if (avalancheRef.current?.active) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.shadowColor = 'rgba(64, 196, 255, 0.4)'
      ctx.shadowBlur = 45
      ctx.fillStyle = 'rgba(30, 106, 203, 0.06)'
      ctx.fillRect(0, 0, dimensions.width, dimensions.height)
      ctx.restore()
    }

    if (mouse.isInBounds) {
      const cursor = mouse.positionRef.current
      ctx.strokeStyle = 'rgba(111, 255, 255, 0.35)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(cursor.x, cursor.y, size * 1.3, 0, Math.PI * 2)
      ctx.stroke()
    }
  }, [ctx, dimensions.centerX, dimensions.centerY, dimensions.height, dimensions.width, mouse.isInBounds, mouse.positionRef])

  const controls = [
    { id: 'infuse', label: 'infuse.core()', onClick: handleInfuse },
    { id: 'scatter', label: 'scatter(400)', onClick: handleScatter },
    { id: 'fault', label: 'fault.quake()', onClick: handleFaultQuake },
    { id: 'relax', label: 'relax()', onClick: relaxUntilStable },
    { id: 'reset', label: 'clear.basin()', onClick: handleReset, variant: 'reset' }
  ]

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return

    let frameId
    const animate = () => {
      tickRef.current++

      if (mouse.isDown) {
        const radius = mode === 'fault' ? 2 : 1.5
        const density = mode === 'fault' ? 2 : 1
        brushDrop(mouse.positionRef.current.x, mouse.positionRef.current.y, radius, density)
      }

      if (mode === 'rain' && tickRef.current % 2 === 0) {
        dropRandom(3)
      }

      if (mode === 'fault' && tickRef.current % 8 === 0) {
        const grid = gridRef.current
        if (grid) {
          const { cols, rows } = grid
          faultPhaseRef.current += 0.08
          const row = Math.floor((Math.sin(faultPhaseRef.current) * 0.5 + 0.5) * (rows - 1))
          for (let x = 1; x < cols - 1; x += 2) {
            const idx = row * cols + x
            depositAtIndex(idx, x % 4 === 0 ? 2 : 1)
          }
        }
      }

      processToppling(5000)
      drawGrid()
      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [brushDrop, ctx, dimensions.width, drawGrid, dropRandom, mode, mouse.isDown, processToppling])

  const metrics = useMemo(() => ([
    { label: 'grains', value: grainCount },
    { label: 'avalanches', value: avalancheCount },
    { label: 'last', value: lastAvalanche ? `${lastAvalanche}` : 'none' },
    { label: 'critical', value: criticality }
  ]), [avalancheCount, criticality, grainCount, lastAvalanche])

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
        <p className="text-void-green/60 text-xs font-mono max-w-xl text-right">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="sandpile-canvas"
        />
      </div>
    </div>
  )
}

export default SandpileRitual
