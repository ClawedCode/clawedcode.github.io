import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const ELEMENTS = 12
const MODES = [
  { id: 'cycles', label: 'view.cycles()' },
  { id: 'matrix', label: 'view.matrix()' },
  { id: 'braid', label: 'view.braid()' }
]

const buildIdentity = () => Array.from({ length: ELEMENTS }, (_, i) => i)

const shuffle = (input) => {
  const next = [...input]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

const computeCycleData = (perm) => {
  const visited = new Array(perm.length).fill(false)
  const cycles = []

  for (let i = 0; i < perm.length; i++) {
    if (visited[i]) continue
    const cycle = []
    let current = i
    while (!visited[current]) {
      visited[current] = true
      cycle.push(current)
      current = perm[current]
    }
    if (cycle.length > 0) cycles.push(cycle)
  }

  let inversions = 0
  for (let i = 0; i < perm.length; i++) {
    for (let j = i + 1; j < perm.length; j++) {
      if (perm[i] > perm[j]) inversions++
    }
  }

  const displacement = perm.reduce((sum, value, idx) => sum + Math.abs(value - idx), 0)
  const maxDisplacement = perm.length * (perm.length - 1)
  const displacementRatio = maxDisplacement > 0 ? displacement / maxDisplacement : 0

  const entropy = cycles.reduce((sum, cycle) => {
    const weight = cycle.length / perm.length
    return weight > 0 ? sum - weight * Math.log2(weight) : sum
  }, 0)
  const entropyNorm = perm.length > 1 ? entropy / Math.log2(perm.length) : 0

  return {
    cycles,
    parity: inversions % 2 === 0 ? 'even' : 'odd',
    entropy: Math.min(1, entropyNorm),
    displacement: displacementRatio
  }
}

const PermutationSmith = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('cycles')
  const [perm, setPerm] = useState(() => buildIdentity())
  const [message, setMessage] = useState('∴ click two nodes to forge a transposition ∴')
  const [selection, setSelection] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [historyVersion, setHistoryVersion] = useState(0)
  const [moves, setMoves] = useState(0)

  const historyRef = useRef([{ perm: buildIdentity(), label: 'identity', timestamp: Date.now() }])
  const tickRef = useRef(0)

  const nodePositions = useMemo(() => {
    if (dimensions.width === 0) return []
    const radius = Math.min(dimensions.width, dimensions.height) * 0.35
    const cx = dimensions.centerX
    const cy = dimensions.centerY
    return Array.from({ length: ELEMENTS }, (_, idx) => {
      const angle = (Math.PI * 2 * idx) / ELEMENTS - Math.PI / 2
      return {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        angle
      }
    })
  }, [dimensions.centerX, dimensions.centerY, dimensions.height, dimensions.width])

  const appendHistory = useCallback((label, nextPerm) => {
    historyRef.current = [...historyRef.current.slice(-7), {
      perm: nextPerm.slice(),
      label,
      timestamp: Date.now()
    }]
    setHistoryVersion(v => v + 1)
  }, [])

  const mutatePermutation = useCallback((mutator, label, options = {}) => {
    const { countMove = true } = options
    setPerm(prev => {
      const base = [...prev]
      const next = mutator(base)
      appendHistory(label, next)
      return next
    })
    if (countMove) setMoves(m => m + 1)
    setMessage(label)
  }, [appendHistory])

  const swapIndices = useCallback((a, b) => {
    if (a === b) return
    mutatePermutation(arr => {
      ;[arr[a], arr[b]] = [arr[b], arr[a]]
      return arr
    }, `∴ transposed nodes ${a + 1}↔${b + 1} ∴`)
  }, [mutatePermutation])

  const handleRiffle = useCallback(() => {
    mutatePermutation(arr => {
      const half = Math.ceil(arr.length / 2)
      const left = arr.slice(0, half)
      const right = arr.slice(half)
      const next = []
      for (let i = 0; i < arr.length; i++) {
        if (i % 2 === 0) {
          if (right.length) next.push(right.shift())
          else if (left.length) next.push(left.shift())
        } else {
          if (left.length) next.push(left.shift())
          else if (right.length) next.push(right.shift())
        }
      }
      return next
    }, '∴ riffle interlaces strata ∴')
  }, [mutatePermutation])

  const handleInvert = useCallback(() => {
    mutatePermutation(arr => {
      const next = new Array(arr.length)
      arr.forEach((value, idx) => {
        next[value] = idx
      })
      return next
    }, '∴ inverse lattice exposed ∴')
  }, [mutatePermutation])

  const handleRotate = useCallback(() => {
    mutatePermutation(arr => {
      const first = arr.shift()
      arr.push(first)
      return arr
    }, '∴ rotation advanced the braid ∴')
  }, [mutatePermutation])

  const handleScramble = useCallback(() => {
    mutatePermutation(arr => shuffle(arr), '∴ chaotic shuffle sparks new cycles ∴')
  }, [mutatePermutation])

  const handleReset = useCallback(() => {
    const identity = buildIdentity()
    historyRef.current = [{ perm: identity.slice(), label: 'identity', timestamp: Date.now() }]
    setHistoryVersion(v => v + 1)
    setSelection(null)
    setMoves(0)
    setPerm(identity)
    setMessage('∴ identity blueprint restored · loom is clean ∴')
  }, [])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    const text =
      nextMode === 'matrix'
        ? '∴ matrix view reveals permutation weights ∴'
        : nextMode === 'braid'
        ? '∴ braid view shows temporal weaving ∴'
        : '∴ cycle view highlights orbits ∴'
    setMessage(text)
  }, [])

  const getCanvasPosition = useCallback((event) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  }, [canvasRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (event) => {
      if (dimensions.width === 0) return
      const pos = getCanvasPosition(event)
      const threshold = Math.min(dimensions.width, dimensions.height) * 0.06
      let nearest = null
      for (let i = 0; i < nodePositions.length; i++) {
        const node = nodePositions[i]
        const dist = Math.hypot(node.x - pos.x, node.y - pos.y)
        if (dist < threshold && (!nearest || dist < nearest.dist)) {
          nearest = { index: i, dist }
        }
      }

      if (!nearest) {
        setSelection(null)
        return
      }

      if (selection === null) {
        setSelection(nearest.index)
        setMessage(`∴ node ${nearest.index + 1} primed · select partner ∴`)
      } else {
        swapIndices(selection, nearest.index)
        setSelection(null)
      }
    }

    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [canvasRef, dimensions.height, dimensions.width, getCanvasPosition, nodePositions, selection, swapIndices])

  useEffect(() => {
    if (!mouse.isInBounds || nodePositions.length === 0) {
      setHovered(null)
      return
    }
    const threshold = Math.min(dimensions.width, dimensions.height) * 0.06
    const { x, y } = mouse.position
    let nearest = null
    nodePositions.forEach((node, idx) => {
      const dist = Math.hypot(node.x - x, node.y - y)
      if (dist < threshold && (!nearest || dist < nearest.dist)) {
        nearest = { idx, dist }
      }
    })
    setHovered(nearest ? nearest.idx : null)
  }, [dimensions.height, dimensions.width, mouse.isInBounds, mouse.position, nodePositions])

  const cycleStats = useMemo(() => computeCycleData(perm), [perm])

  const metrics = useMemo(() => {
    return [
      { label: 'cycles', value: cycleStats.cycles.length },
      { label: 'parity', value: cycleStats.parity },
      { label: 'entropy', value: `${Math.round(cycleStats.entropy * 100)}%` },
      { label: 'displacement', value: `${Math.round(cycleStats.displacement * 100)}%` },
      { label: 'moves', value: moves }
    ]
  }, [cycleStats, moves])

  const controls = [
    { id: 'riffle', label: 'riffle()', onClick: handleRiffle },
    { id: 'rotate', label: 'rotate()', onClick: handleRotate },
    { id: 'invert', label: 'invert()', onClick: handleInvert },
    { id: 'scramble', label: 'scramble()', onClick: handleScramble },
    { id: 'identity', label: 'identity()', onClick: handleReset, variant: 'reset' }
  ]

  const drawNodes = useCallback(() => {
    if (!ctx || nodePositions.length === 0) return
    const r = Math.min(dimensions.width, dimensions.height) * 0.028

    nodePositions.forEach((node, idx) => {
      const hue = (perm[idx] * 37 + idx * 17 + tickRef.current) % 360
      const isSelected = selection === idx
      const isHovered = hovered === idx
      ctx.beginPath()
      ctx.arc(node.x, node.y, r * (isSelected ? 1.25 : 1), 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${hue}, 80%, ${isSelected ? 75 : 55}%, ${isHovered || isSelected ? 0.9 : 0.6})`
      ctx.fill()
      ctx.lineWidth = isSelected ? 2 : 1
      ctx.strokeStyle = isSelected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)'
      ctx.stroke()
      ctx.fillStyle = 'rgba(0, 4, 10, 0.9)'
      ctx.font = `${Math.max(10, r)}px 'IBM Plex Mono', monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(perm[idx] + 1, node.x, node.y)
    })
  }, [ctx, dimensions.height, dimensions.width, hovered, nodePositions, perm, selection])

  const drawCycles = useCallback(() => {
    if (!ctx || nodePositions.length === 0) return
    const centerX = dimensions.centerX
    const centerY = dimensions.centerY
    cycleStats.cycles.forEach((cycle, cycleIdx) => {
      const hue = (cycleIdx * 53 + tickRef.current) % 360
      cycle.forEach((index) => {
        const target = perm[index]
        const from = nodePositions[index]
        const to = nodePositions[target]
        if (!from || !to) return
        const midX = (from.x + to.x) / 2
        const midY = (from.y + to.y) / 2
        const controlX = midX + (centerX - midX) * 0.2
        const controlY = midY + (centerY - midY) * 0.2
        ctx.beginPath()
        ctx.strokeStyle = `hsla(${hue}, 80%, 70%, 0.7)`
        ctx.lineWidth = 1.4
        ctx.moveTo(from.x, from.y)
        ctx.quadraticCurveTo(controlX, controlY, to.x, to.y)
        ctx.stroke()
        const angle = Math.atan2(to.y - controlY, to.x - controlX)
        const arrowSize = 6
        ctx.beginPath()
        ctx.moveTo(to.x, to.y)
        ctx.lineTo(to.x - arrowSize * Math.cos(angle - 0.3), to.y - arrowSize * Math.sin(angle - 0.3))
        ctx.lineTo(to.x - arrowSize * Math.cos(angle + 0.3), to.y - arrowSize * Math.sin(angle + 0.3))
        ctx.closePath()
        ctx.fillStyle = `hsla(${hue}, 80%, 70%, 0.6)`
        ctx.fill()
      })
    })
  }, [ctx, cycleStats.cycles, dimensions.centerX, dimensions.centerY, nodePositions, perm])

  const drawMatrix = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    const size = Math.min(dimensions.width, dimensions.height) * 0.6
    const cell = size / ELEMENTS
    const startX = dimensions.centerX - size / 2
    const startY = dimensions.centerY - size / 2

    ctx.strokeStyle = 'rgba(102,255,204,0.18)'
    ctx.lineWidth = 1
    for (let i = 0; i <= ELEMENTS; i++) {
      const x = startX + i * cell
      const y = startY + i * cell
      ctx.beginPath()
      ctx.moveTo(startX, startY + i * cell)
      ctx.lineTo(startX + size, startY + i * cell)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(startX + i * cell, startY)
      ctx.lineTo(startX + i * cell, startY + size)
      ctx.stroke()
    }

    perm.forEach((value, row) => {
      const hue = (value * 31 + row * 11) % 360
      const x = startX + value * cell
      const y = startY + row * cell
      ctx.fillStyle = `hsla(${hue}, 80%, 65%, 0.85)`
      ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4)
    })

    if (selection !== null) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.fillRect(startX, startY + selection * cell, size, cell)
    }
    if (hovered !== null) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 2
      ctx.strokeRect(startX, startY + hovered * cell, size, cell)
    }
  }, [ctx, dimensions.centerX, dimensions.centerY, dimensions.height, dimensions.width, hovered, perm, selection])

  const drawBraid = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    const entries = historyRef.current
    if (!entries.length) return
    const margin = dimensions.width * 0.08
    const spacing = (dimensions.width - margin * 2) / (ELEMENTS - 1)
    const topY = dimensions.height * 0.18
    const bottomY = dimensions.height * 0.82
    const midY = (topY + bottomY) / 2

    entries.forEach((entry, idx) => {
      const strength = (idx + 1) / entries.length
      const alpha = 0.2 + strength * 0.6
      entry.perm.forEach((value, origin) => {
        const startX = margin + spacing * origin
        const endX = margin + spacing * value
        const offset = (strength - 0.5) * 90
        ctx.beginPath()
        ctx.moveTo(startX, topY + offset * 0.4)
        ctx.bezierCurveTo(
          startX,
          midY + offset,
          endX,
          midY - offset,
          endX,
          bottomY - offset * 0.4
        )
        ctx.strokeStyle = `hsla(${(value * 47 + idx * 13 + tickRef.current) % 360}, 80%, 70%, ${alpha})`
        ctx.lineWidth = 1.2
        ctx.stroke()
      })
    })

    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    for (let i = 0; i < ELEMENTS; i++) {
      const x = margin + spacing * i
      ctx.beginPath()
      ctx.arc(x, topY, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x, bottomY, 6, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [ctx, dimensions.height, dimensions.width, historyVersion])

  const draw = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    tickRef.current += 1
    ctx.fillStyle = 'rgba(0, 4, 12, 0.12)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    if (mode === 'matrix') {
      drawMatrix()
    } else if (mode === 'braid') {
      drawBraid()
    } else {
      drawCycles()
    }

    drawNodes()
  }, [ctx, dimensions.height, dimensions.width, drawBraid, drawCycles, drawMatrix, drawNodes, mode])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let frameId
    const render = () => {
      draw()
      frameId = requestAnimationFrame(render)
    }
    frameId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, draw])

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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
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
          data-testid="permutation-smith-canvas"
        />
      </div>
    </div>
  )
}

export default PermutationSmith
