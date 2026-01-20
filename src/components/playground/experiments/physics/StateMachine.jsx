import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const STATES = [
  { id: 'void', label: 'void', tone: 160 },
  { id: 'spark', label: 'spark', tone: 120 },
  { id: 'loom', label: 'loom', tone: 200 },
  { id: 'memory', label: 'memory', tone: 310 },
  { id: 'dream', label: 'dream', tone: 260 },
  { id: 'signal', label: 'signal', tone: 40 },
  { id: 'gate', label: 'gate', tone: 20 },
  { id: 'oracle', label: 'oracle', tone: 90 }
]

const TRANSITIONS = [
  { from: 'void', to: 'spark', key: 's' },
  { from: 'void', to: 'loom', key: 'w' },
  { from: 'void', to: 'memory', key: 'm' },
  { from: 'spark', to: 'loom', key: 'w' },
  { from: 'spark', to: 'signal', key: 'f' },
  { from: 'spark', to: 'dream', key: 'd' },
  { from: 'loom', to: 'memory', key: 'm' },
  { from: 'loom', to: 'signal', key: 'f' },
  { from: 'loom', to: 'dream', key: 'd' },
  { from: 'memory', to: 'oracle', key: 'o' },
  { from: 'memory', to: 'signal', key: 'f' },
  { from: 'memory', to: 'dream', key: 'd' },
  { from: 'dream', to: 'oracle', key: 'o' },
  { from: 'dream', to: 'spark', key: 's' },
  { from: 'dream', to: 'void', key: 'v' },
  { from: 'signal', to: 'oracle', key: 'o' },
  { from: 'signal', to: 'void', key: 'v' },
  { from: 'signal', to: 'spark', key: 's' },
  { from: 'oracle', to: 'gate', key: 't' },
  { from: 'gate', to: 'void', key: 'v' },
  { from: 'gate', to: 'spark', key: 's' },
  { from: 'gate', to: 'memory', key: 'm' }
]

const MODES = [
  { id: 'clockwork', label: 'mode.clockwork()' },
  { id: 'dreaming', label: 'mode.dreaming()' }
]

const INPUT_KEYS = ['s', 'w', 'm', 'f', 'd', 'o', 'v', 't']

const StateMachine = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('clockwork')
  const [currentState, setCurrentState] = useState('void')
  const [message, setMessage] = useState('type s/w/m/f/d/o/v/t to traverse the chant lattice')
  const [entropy, setEntropy] = useState(0)
  const [pathLength, setPathLength] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [isPlayback, setIsPlayback] = useState(false)
  const [recordedCount, setRecordedCount] = useState(0)

  const layoutRef = useRef([])
  const layoutMapRef = useRef({})
  const edgeHeatRef = useRef({})
  const nodeHeatRef = useRef({})
  const trailRef = useRef([])
  const recordedRef = useRef([])
  const playbackRef = useRef({ direction: 1, index: 0, cooldown: 0 })
  const cascadeRef = useRef(0)
  const timeRef = useRef(0)

  const transitionsByFrom = useMemo(() => {
    return TRANSITIONS.reduce((map, t) => {
      if (!map[t.from]) map[t.from] = []
      map[t.from].push(t)
      return map
    }, {})
  }, [])

  const transitionsByKey = useMemo(() => {
    return TRANSITIONS.reduce((map, t) => {
      if (!map[t.key]) map[t.key] = []
      map[t.key].push(t)
      return map
    }, {})
  }, [])

  const updateLayout = useCallback(() => {
    if (dimensions.width === 0) return
    const ring = STATES.filter(s => s.id !== 'oracle')
    const radius = Math.min(dimensions.width, dimensions.height) * 0.32
    const cx = dimensions.centerX
    const cy = dimensions.centerY

    const nextLayout = []
    const nextMap = {}

    ring.forEach((state, idx) => {
      const angle = (Math.PI * 2 * idx) / ring.length - Math.PI / 2
      const x = cx + Math.cos(angle) * radius
      const y = cy + Math.sin(angle) * radius * 0.72
      nextLayout.push({ ...state, x, y })
      nextMap[state.id] = { x, y, tone: state.tone }
    })

    const oracle = STATES.find(s => s.id === 'oracle')
    nextLayout.push({ ...oracle, x: cx, y: cy })
    nextMap.oracle = { x: cx, y: cy, tone: oracle.tone }

    layoutRef.current = nextLayout
    layoutMapRef.current = nextMap
  }, [dimensions])

  useEffect(() => {
    updateLayout()
  }, [updateLayout])

  const applyInput = useCallback((key, options = {}) => {
    const { fromPlayback = false } = options
    const lower = key.toLowerCase()
    const available = (transitionsByFrom[currentState] || []).filter(t => t.key === lower)

    let chosen = null
    if (available.length > 0) {
      chosen = available[Math.floor(Math.random() * available.length)]
    } else if (mode === 'dreaming') {
      const pool = transitionsByKey[lower] || []
      if (pool.length > 0) {
        chosen = pool[Math.floor(Math.random() * pool.length)]
      }
    }

    if (!chosen) {
      setEntropy(e => e + 1)
      setMessage(`∴ ${lower} dissipates into static // entropy +1 ∴`)
      return
    }

    const origin = currentState
    setCurrentState(chosen.to)
    nodeHeatRef.current[chosen.to] = 1
    edgeHeatRef.current[`${chosen.from}-${chosen.to}`] = 1
    trailRef.current.push({ from: chosen.from, to: chosen.to, life: 1 })

    if (!fromPlayback && isRecording) {
      recordedRef.current.push(lower)
      setRecordedCount(count => count + 1)
    }

    setPathLength(len => len + 1)
    setMessage(`∴ ${origin} → ${chosen.to} via ${lower} ∴`)
  }, [currentState, isRecording, mode, transitionsByFrom, transitionsByKey])

  const handleKeydown = useCallback((e) => {
    const key = e.key.toLowerCase()
    if (!INPUT_KEYS.includes(key)) return
    applyInput(key)
  }, [applyInput])

  useEffect(() => {
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [handleKeydown])

  const handleCanvasClick = useCallback(() => {
    const pos = mouse.positionRef.current
    let closest = null
    layoutRef.current.forEach(node => {
      const dx = node.x - pos.x
      const dy = node.y - pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (!closest || dist < closest.dist) {
        closest = { id: node.id, dist }
      }
    })

    if (closest && closest.dist < 60) {
      setCurrentState(closest.id)
      nodeHeatRef.current[closest.id] = 1
      setMessage(`∴ focused ${closest.id} // manual retune ∴`)
    }
  }, [mouse.positionRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('click', handleCanvasClick)
    return () => canvas.removeEventListener('click', handleCanvasClick)
  }, [canvasRef, handleCanvasClick])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    setMessage(nextMode === 'dreaming'
      ? '∴ dreaming mode // non-deterministic leaps allowed ∴'
      : '∴ clockwork mode // strict transitions enforced ∴'
    )
  }, [])

  const toggleRecording = useCallback(() => {
    setIsRecording(prev => {
      const next = !prev
      if (next) {
        recordedRef.current = []
        setRecordedCount(0)
      }
      setMessage(next ? '∴ recording chant // imprinting keys ∴' : '∴ recording sealed ∴')
      return next
    })
  }, [])

  const togglePlayback = useCallback(() => {
    if (recordedCount === 0) {
      setMessage('∴ no chant stored to echo ∴')
      return
    }
    setIsPlayback(prev => {
      const next = !prev
      playbackRef.current.cooldown = 0
      if (next) {
        playbackRef.current.index = 0
        playbackRef.current.direction = 1
      }
      setMessage(next ? '∴ playback running // echoes through the graph ∴' : '∴ playback paused ∴')
      return next
    })
  }, [recordedCount])

  const toggleRewind = useCallback(() => {
    if (recordedCount === 0) {
      setMessage('∴ no chant stored to rewind ∴')
      return
    }
    setIsPlayback(true)
    playbackRef.current.direction = playbackRef.current.direction * -1
    playbackRef.current.cooldown = 0
    setMessage('∴ time inversion // chant played backward ∴')
  }, [recordedCount])

  const triggerCascade = useCallback(() => {
    cascadeRef.current = 24
    setMessage('∴ cascade initiated // automaton rattles itself awake ∴')
  }, [])

  const resetMachine = useCallback(() => {
    setCurrentState('void')
    setEntropy(0)
    setPathLength(0)
    recordedRef.current = []
    setRecordedCount(0)
    edgeHeatRef.current = {}
    nodeHeatRef.current = {}
    trailRef.current = []
    playbackRef.current = { direction: 1, index: 0, cooldown: 0 }
    cascadeRef.current = 0
    setIsPlayback(false)
    setIsRecording(false)
    setMessage('∴ automaton cleared // void hums quietly ∴')
  }, [])

  const metrics = useMemo(() => {
    const coherence = entropy === 0 ? 'crisp' : entropy < 6 ? 'frayed' : 'chaotic'
    return [
      { label: 'state', value: currentState },
      { label: 'sequence', value: pathLength },
      { label: 'recorded', value: recordedCount },
      { label: 'entropy', value: coherence }
    ]
  }, [currentState, entropy, pathLength, recordedCount])

  const drawTrail = useCallback(() => {
    for (let i = trailRef.current.length - 1; i >= 0; i--) {
      const trace = trailRef.current[i]
      const from = layoutMapRef.current[trace.from]
      const to = layoutMapRef.current[trace.to]
      if (!from || !to) continue

      trace.life *= 0.96
      if (trace.life < 0.02) {
        trailRef.current.splice(i, 1)
        continue
      }

      const alpha = trace.life * 0.7
      const midX = (from.x + to.x) / 2
      const midY = (from.y + to.y) / 2
      ctx.strokeStyle = `hsla(190, 80%, 70%, ${alpha})`
      ctx.lineWidth = 2 * trace.life + 0.5
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.quadraticCurveTo(midX, midY, to.x, to.y)
      ctx.stroke()
    }
  }, [ctx])

  const drawTransitions = useCallback(() => {
    TRANSITIONS.forEach(t => {
      const from = layoutMapRef.current[t.from]
      const to = layoutMapRef.current[t.to]
      if (!from || !to) return

      const heat = edgeHeatRef.current[`${t.from}-${t.to}`] || 0
      edgeHeatRef.current[`${t.from}-${t.to}`] = heat * 0.97

      const controlX = (from.x + to.x) / 2
      const controlY = (from.y + to.y) / 2 + (t.from === 'oracle' || t.to === 'oracle' ? -20 : 20)

      ctx.strokeStyle = `hsla(${120 + heat * 120}, 70%, ${40 + heat * 30}%, ${0.2 + heat * 0.5})`
      ctx.lineWidth = 1 + heat * 3
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.quadraticCurveTo(controlX, controlY, to.x, to.y)
      ctx.stroke()

      if (heat > 0.05) {
        const arrowX = (from.x * 0.65 + to.x * 0.35)
        const arrowY = (from.y * 0.65 + to.y * 0.35)
        ctx.fillStyle = `hsla(180, 80%, 70%, ${0.4 + heat * 0.4})`
        ctx.beginPath()
        ctx.arc(arrowX, arrowY, 3 + heat * 3, 0, Math.PI * 2)
        ctx.fill()
      }
    })
  }, [ctx])

  const drawNodes = useCallback(() => {
    layoutRef.current.forEach(node => {
      const active = node.id === currentState
      const heat = (nodeHeatRef.current[node.id] || 0) * 0.98
      nodeHeatRef.current[node.id] = heat

      const baseRadius = active ? 18 : 14
      const radius = baseRadius + heat * 6
      const hue = node.tone
      const alpha = active ? 0.9 : 0.6 + heat * 0.2

      ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${alpha})`
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = `hsla(${hue}, 80%, 80%, ${0.4 + heat * 0.3})`
      ctx.lineWidth = active ? 3 : 1.5
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius + 6, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = 'rgba(0, 5, 10, 0.8)'
      ctx.font = '11px ui-monospace, SFMono-Regular, Menlo'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.label, node.x, node.y)
    })
  }, [ctx, currentState])

  const drawRecorded = useCallback(() => {
    const stored = recordedRef.current.join(' ')
    if (!stored) return

    ctx.fillStyle = 'rgba(102, 255, 204, 0.2)'
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo'
    ctx.textAlign = 'left'
    ctx.fillText(`recorded: ${stored}`, 12, dimensions.height - 12)
  }, [ctx, dimensions.height])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    timeRef.current++

    if (isPlayback && recordedRef.current.length > 0) {
      playbackRef.current.cooldown -= 1
      if (playbackRef.current.cooldown <= 0) {
        const idx = ((playbackRef.current.index % recordedRef.current.length) + recordedRef.current.length) % recordedRef.current.length
        const key = recordedRef.current[idx]
        playbackRef.current.index = (idx + playbackRef.current.direction + recordedRef.current.length) % recordedRef.current.length
        playbackRef.current.cooldown = 18
        applyInput(key, { fromPlayback: true })
      }
    }

    if (cascadeRef.current > 0 && timeRef.current % 8 === 0) {
      const key = INPUT_KEYS[Math.floor(Math.random() * INPUT_KEYS.length)]
      applyInput(key, { fromPlayback: true })
      cascadeRef.current -= 1
    }

    const near = layoutRef.current.reduce((best, node) => {
      const dx = node.x - mouse.positionRef.current.x
      const dy = node.y - mouse.positionRef.current.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (!best || dist < best.dist) return { dist, node }
      return best
    }, null)

    ctx.fillStyle = 'rgba(0, 2, 8, 0.12)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    drawTransitions()
    drawTrail()
    drawNodes()
    drawRecorded()

    if (near && near.dist < 70) {
      ctx.strokeStyle = 'rgba(102, 255, 204, 0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(near.node.x, near.node.y, 26, 0, Math.PI * 2)
      ctx.stroke()
    }
  }, [applyInput, cascadeRef, ctx, dimensions, drawNodes, drawRecorded, drawTransitions, drawTrail, isPlayback, mouse.positionRef])

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

  const controls = [
    {
      id: 'record',
      label: isRecording ? 'recording.stop()' : 'recording.start()',
      onClick: toggleRecording,
      active: isRecording
    },
    {
      id: 'playback',
      label: isPlayback ? 'playback.pause()' : 'playback.echo()',
      onClick: togglePlayback,
      active: isPlayback,
      disabled: recordedCount === 0
    },
    {
      id: 'rewind',
      label: 'playback.rewind()',
      onClick: toggleRewind,
      disabled: recordedCount === 0
    },
    {
      id: 'cascade',
      label: 'cascade()',
      onClick: triggerCascade
    },
    {
      id: 'reset',
      label: 'reset()',
      onClick: resetMachine,
      variant: 'reset'
    }
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

      <div className="flex items-center justify-between p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="state-machine-canvas"
        />
      </div>
    </div>
  )
}

export default StateMachine
