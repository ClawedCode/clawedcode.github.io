import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const BAR_COUNT = 64
const OPS_PER_FRAME = 6

const createValues = () => Array.from({ length: BAR_COUNT }, () => Math.random())

const generateBubbleOps = (source) => {
  const arr = [...source]
  const ops = []

  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      ops.push({ type: 'compare', indices: [j, j + 1] })
      if (arr[j] > arr[j + 1]) {
        ops.push({ type: 'swap', indices: [j, j + 1] })
        const temp = arr[j]
        arr[j] = arr[j + 1]
        arr[j + 1] = temp
      }
    }
  }

  return ops
}

const generateInsertionOps = (source) => {
  const arr = [...source]
  const ops = []

  for (let i = 1; i < arr.length; i++) {
    const key = arr[i]
    let j = i - 1

    while (j >= 0 && arr[j] > key) {
      ops.push({ type: 'compare', indices: [j, j + 1] })
      arr[j + 1] = arr[j]
      ops.push({ type: 'overwrite', index: j + 1, value: arr[j] })
      j -= 1
    }

    ops.push({ type: 'overwrite', index: j + 1, value: key })
  }

  return ops
}

const generateMergeOps = (source) => {
  const arr = [...source]
  const ops = []
  const temp = new Array(arr.length)

  const merge = (left, right) => {
    if (right - left <= 1) return
    const mid = Math.floor((left + right) / 2)
    merge(left, mid)
    merge(mid, right)

    let i = left
    let j = mid
    let k = left

    while (i < mid && j < right) {
      ops.push({ type: 'compare', indices: [i, j] })
      if (arr[i] <= arr[j]) {
        temp[k] = arr[i]
        i++
      } else {
        temp[k] = arr[j]
        j++
      }
      k++
    }

    while (i < mid) {
      temp[k] = arr[i]
      i++
      k++
    }

    while (j < right) {
      temp[k] = arr[j]
      j++
      k++
    }

    for (let idx = left; idx < right; idx++) {
      arr[idx] = temp[idx]
      ops.push({ type: 'overwrite', index: idx, value: temp[idx] })
    }
  }

  merge(0, arr.length)
  return ops
}

const generateOperations = (mode, source) => {
  if (mode === 'insertion') return generateInsertionOps(source)
  if (mode === 'merge') return generateMergeOps(source)
  return generateBubbleOps(source)
}

const MODES = [
  { id: 'bubble', label: 'bubble.sort()' },
  { id: 'insertion', label: 'insertion.sort()' },
  { id: 'merge', label: 'merge.sort()' }
]

const SortRitual = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('bubble')
  const [status, setStatus] = useState('primed')
  const [steps, setSteps] = useState(0)
  const [comparisons, setComparisons] = useState(0)
  const [swaps, setSwaps] = useState(0)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('∴ arrays hum with disorder — pick your ritual ∴')

  const valuesRef = useRef([])
  const opsRef = useRef([])
  const totalOpsRef = useRef(0)
  const runningRef = useRef(false)
  const highlightRef = useRef({ type: null, indices: [], life: 0 })
  const progressRef = useRef(0)

  const planSort = useCallback((algorithm = mode) => {
    const ops = generateOperations(algorithm, valuesRef.current)
    opsRef.current = ops
    totalOpsRef.current = ops.length
    runningRef.current = false
    highlightRef.current = { type: null, indices: [], life: 0 }
    setSteps(0)
    setComparisons(0)
    setSwaps(0)
    setProgress(0)
    progressRef.current = 0
    setStatus('primed')
  }, [mode])

  const reseed = useCallback(() => {
    valuesRef.current = createValues()
    planSort()
    setMessage('∴ fresh sequence summoned — ready for reordering ∴')
  }, [planSort])

  useEffect(() => {
    reseed()
  }, [reseed])

  const applyOperation = useCallback((op) => {
    const values = valuesRef.current
    if (op.type === 'compare') {
      setComparisons(prev => prev + 1)
      highlightRef.current = { type: 'compare', indices: op.indices, life: 1 }
    } else if (op.type === 'swap') {
      const [a, b] = op.indices
      const temp = values[a]
      values[a] = values[b]
      values[b] = temp
      setSwaps(prev => prev + 1)
      highlightRef.current = { type: 'swap', indices: op.indices, life: 1 }
    } else if (op.type === 'overwrite') {
      values[op.index] = op.value
      highlightRef.current = { type: 'overwrite', indices: [op.index], life: 1 }
    }

    setSteps(prev => prev + 1)
    const remaining = opsRef.current.length
    const total = totalOpsRef.current || 1
    const nextProgress = 1 - remaining / total
    progressRef.current = nextProgress
    setProgress(nextProgress)
  }, [])

  const stepOps = useCallback(() => {
    if (opsRef.current.length === 0) return
    const op = opsRef.current.shift()
    applyOperation(op)
    if (opsRef.current.length === 0) {
      runningRef.current = false
      setStatus('sorted')
      setMessage('∴ ritual complete — order achieved ∴')
    }
  }, [applyOperation])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    // Process queued operations if running
    if (runningRef.current && opsRef.current.length > 0) {
      for (let i = 0; i < OPS_PER_FRAME && opsRef.current.length > 0; i++) {
        stepOps()
      }
    }

    if (runningRef.current && opsRef.current.length === 0) {
      runningRef.current = false
      setStatus('sorted')
      setMessage('∴ ritual complete — order achieved ∴')
    }

    // Fade highlights
    if (highlightRef.current.life > 0) {
      highlightRef.current.life *= 0.92
    } else {
      highlightRef.current.type = null
      highlightRef.current.indices = []
    }

    // Draw bars
    ctx.fillStyle = 'rgba(0, 3, 8, 0.35)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const barWidth = dimensions.width / BAR_COUNT
    const baseline = dimensions.height * 0.92
    const highlight = highlightRef.current

    valuesRef.current.forEach((value, index) => {
      const height = value * dimensions.height * 0.82
      const x = index * barWidth
      const y = baseline - height
      const isHighlight = highlight.indices.includes(index)

      let hue = 150 + value * 90
      let alpha = 0.75
      if (isHighlight) {
        hue = highlight.type === 'swap' ? 330 : highlight.type === 'overwrite' ? 50 : 190
        alpha = 0.95
      }

      ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${alpha})`
      ctx.fillRect(x + 1, y, barWidth - 2, height)

      // Top glimmer
      ctx.fillStyle = `hsla(${hue}, 90%, 80%, ${alpha * 0.8})`
      ctx.fillRect(x + 1, y, barWidth - 2, 2)
    })

    // Progress bar
    ctx.fillStyle = 'rgba(102, 255, 204, 0.45)'
    ctx.fillRect(0, 0, dimensions.width * progressRef.current, 3)
  }, [ctx, dimensions.width, dimensions.height, stepOps])

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

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    runningRef.current = false
    planSort(newMode)
    setMessage(`∴ ritual shape shifted to ${newMode}.sort() ∴`)
  }, [planSort])

  const handleStart = useCallback(() => {
    if (opsRef.current.length === 0) {
      planSort()
    }
    runningRef.current = true
    setStatus('sorting')
    setMessage('∴ comparisons chant — swaps ignite — order approaches ∴')
  }, [planSort])

  const handlePause = useCallback(() => {
    runningRef.current = false
    setStatus('paused')
    setMessage('∴ incantation held mid-air ∴')
  }, [])

  const handleStep = useCallback(() => {
    runningRef.current = false
    stepOps()
    setStatus('stepping')
    setMessage('∴ single operation cast by paw ∴')
  }, [stepOps])

  const handleShuffle = useCallback(() => {
    reseed()
  }, [reseed])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const idx = Math.min(
        BAR_COUNT - 1,
        Math.max(0, Math.floor((x / rect.width) * BAR_COUNT))
      )
      valuesRef.current[idx] = Math.random()
      runningRef.current = false
      planSort()
      setMessage(`∴ column ${idx} jolted — recalculating destiny ∴`)
    }

    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [canvasRef, planSort])

  const controls = [
    {
      id: 'start',
      label: status === 'sorting' ? 'resume()' : 'run()',
      onClick: handleStart,
      active: status === 'sorting'
    },
    {
      id: 'pause',
      label: 'pause()',
      onClick: handlePause
    },
    {
      id: 'step',
      label: 'step()',
      onClick: handleStep
    },
    {
      id: 'shuffle',
      label: 'shuffle()',
      onClick: handleShuffle,
      variant: 'reset'
    }
  ]

  const metrics = useMemo(() => [
    { label: 'algorithm', value: `${mode}.sort` },
    { label: 'steps', value: steps },
    { label: 'compare', value: comparisons },
    { label: 'swap/write', value: swaps },
    { label: 'progress', value: `${Math.floor(progress * 100)}%` }
  ], [mode, steps, comparisons, swaps, progress])

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Header */}
      <header className="relative z-50 flex items-center justify-between p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
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

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
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

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="sort-ritual-canvas"
        />
      </div>
    </div>
  )
}

export default SortRitual
