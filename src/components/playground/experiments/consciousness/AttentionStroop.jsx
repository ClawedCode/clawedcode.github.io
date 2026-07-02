import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'focus', label: 'focus()' },
  { id: 'interfere', label: 'interfere()' },
  { id: 'mixed', label: 'mixed()' }
]

const MODE_COPY = {
  focus: 'semantic weather thinned // mostly aligned signals',
  interfere: 'word and ink disagree // attention must choose the body over the name',
  mixed: 'the chamber shuffles certainty and sabotage'
}

const COLOR_CHOICES = [
  { id: 'cyan', label: 'CYAN', key: 'c', ink: '#66ffcc', glow: 'rgba(102,255,204,0.55)' },
  { id: 'pink', label: 'PINK', key: 'p', ink: '#ff66cc', glow: 'rgba(255,102,204,0.5)' },
  { id: 'gold', label: 'GOLD', key: 'g', ink: '#ffdd66', glow: 'rgba(255,221,102,0.5)' },
  { id: 'violet', label: 'VIOLET', key: 'v', ink: '#aa88ff', glow: 'rgba(170,136,255,0.5)' }
]

const MODE_WEIGHTS = {
  focus: 0.78,
  interfere: 0.12,
  mixed: 0.45
}

const KEY_TO_COLOR = COLOR_CHOICES.reduce((lookup, choice) => {
  lookup[choice.key] = choice.id
  lookup[choice.id[0]] = choice.id
  return lookup
}, {})

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const pick = (items) => items[Math.floor(Math.random() * items.length)]

const otherThan = (id) => {
  const pool = COLOR_CHOICES.filter((choice) => choice.id !== id)
  return pick(pool)
}

const createTrial = (mode) => {
  const word = pick(COLOR_CHOICES)
  const aligned = Math.random() < MODE_WEIGHTS[mode]
  const ink = aligned ? word : otherThan(word.id)

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    word,
    ink,
    conflict: word.id !== ink.id
  }
}

const summarizeHistory = (history) => {
  if (!history.length) {
    return { score: 0, accuracy: 100, avgRt: 0, interference: 0 }
  }

  const correct = history.filter((entry) => entry.correct)
  const score = history.reduce((sum, entry) => sum + entry.points, 0)
  const accuracy = Math.round((correct.length / history.length) * 100)
  const avgRt = Math.round(history.reduce((sum, entry) => sum + entry.rt, 0) / history.length)
  const conflict = correct.filter((entry) => entry.conflict)
  const calm = correct.filter((entry) => !entry.conflict)
  const conflictAvg = conflict.length
    ? conflict.reduce((sum, entry) => sum + entry.rt, 0) / conflict.length
    : 0
  const calmAvg = calm.length
    ? calm.reduce((sum, entry) => sum + entry.rt, 0) / calm.length
    : 0
  const interference = conflictAvg && calmAvg
    ? Math.max(0, Math.round(conflictAvg - calmAvg))
    : 0

  return { score, accuracy, avgRt, interference }
}

const makePanelEdges = (width, height, time) => {
  const center = width / 2
  const fractions = [0, 0.2, 0.46, 0.72, 1]
  const scaleAt = (y) => 0.82 + (y / height) * 0.26

  return fractions.map((fraction, index) => (y) => {
    if (index === 0) return -18
    if (index === fractions.length - 1) return width + 18

    const base = fraction * width
    const depth = center + (base - center) * scaleAt(y)
    const curve = Math.sin((y / height) * Math.PI) * Math.sin(time * 0.7 + index * 1.91) * 18
    const ripple = Math.sin((y / height) * 4.8 + time + index * 0.73) * 4

    return depth + curve + ripple
  })
}

const tracePanel = (ctx, leftEdge, rightEdge, height) => {
  const steps = 16

  ctx.beginPath()
  ctx.moveTo(leftEdge(0), 0)

  for (let step = 0; step <= steps; step += 1) {
    const y = (step / steps) * height
    ctx.lineTo(rightEdge(y), y)
  }

  for (let step = steps; step >= 0; step -= 1) {
    const y = (step / steps) * height
    ctx.lineTo(leftEdge(y), y)
  }

  ctx.closePath()
}

const drawChamberBacklight = (ctx, width, height, color, time, intensity = 1) => {
  const pulse = 0.66 + Math.sin(time * 2.4) * 0.16
  const glow = ctx.createRadialGradient(
    width / 2,
    height * 0.46,
    12,
    width / 2,
    height * 0.46,
    Math.max(width, height) * 0.52
  )

  glow.addColorStop(0, color.replace(/[\d.]+\)$/, `${0.34 * pulse * intensity})`))
  glow.addColorStop(0.28, 'rgba(255, 221, 102, 0.075)')
  glow.addColorStop(0.56, 'rgba(102, 255, 204, 0.035)')
  glow.addColorStop(1, 'rgba(0, 1, 8, 0)')

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  for (let i = 0; i < 150; i += 1) {
    const seed = Math.sin(i * 98.12 + time * 3.7) * 10000
    const seed2 = Math.sin(i * 41.73 + time * 2.1) * 10000
    const radius = Math.sqrt(seed - Math.floor(seed)) * Math.min(width, height) * 0.44
    const angle = (seed2 - Math.floor(seed2)) * Math.PI * 2
    const x = width / 2 + Math.cos(angle) * radius * 1.45
    const y = height * 0.46 + Math.sin(angle) * radius * 0.64
    const alpha = (0.015 + ((i % 7) / 7) * 0.022) * pulse * intensity

    ctx.fillStyle = `rgba(255, 244, 196, ${alpha})`
    ctx.fillRect(x, y, 1.4, 1.4)
  }

  ctx.restore()
}

const drawChamberPanels = (ctx, width, height, choices, trial, time) => {
  const edges = makePanelEdges(width, height, time)

  choices.forEach((choice, index) => {
    const active = trial?.ink.id === choice.id
    const leftEdge = edges[index]
    const rightEdge = edges[index + 1]
    const midTop = (leftEdge(0) + rightEdge(0)) / 2
    const midBottom = (leftEdge(height) + rightEdge(height)) / 2
    const mid = (midTop + midBottom) / 2
    const panelWidth = Math.abs(rightEdge(height * 0.55) - leftEdge(height * 0.55))

    ctx.save()
    tracePanel(ctx, leftEdge, rightEdge, height)
    ctx.clip()

    const panelGlow = ctx.createRadialGradient(
      midTop,
      height * 0.28,
      6,
      midBottom,
      height * 0.72,
      Math.max(panelWidth, height * 0.7)
    )
    panelGlow.addColorStop(0, active ? choice.glow : 'rgba(102, 255, 204, 0.055)')
    panelGlow.addColorStop(0.45, active ? 'rgba(255, 255, 255, 0.035)' : 'rgba(255, 255, 255, 0.014)')
    panelGlow.addColorStop(1, 'rgba(0, 1, 8, 0.72)')
    ctx.fillStyle = panelGlow
    ctx.fillRect(0, 0, width, height)

    const edgeShade = ctx.createLinearGradient(mid - panelWidth * 0.55, 0, mid + panelWidth * 0.55, 0)
    edgeShade.addColorStop(0, 'rgba(0, 1, 8, 0.42)')
    edgeShade.addColorStop(0.52, 'rgba(0, 1, 8, 0.03)')
    edgeShade.addColorStop(1, 'rgba(0, 1, 8, 0.46)')
    ctx.fillStyle = edgeShade
    ctx.fillRect(0, 0, width, height)

    ctx.restore()
  })

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  edges.slice(1, -1).forEach((edge, index) => {
    ctx.shadowColor = choices[index + 1]?.glow ?? 'rgba(102, 255, 204, 0.45)'
    ctx.shadowBlur = 16
    ctx.strokeStyle = `rgba(180, 255, 230, ${0.1 + Math.sin(time * 1.4 + index) * 0.025})`
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(edge(0), 0)
    ctx.bezierCurveTo(
      edge(height * 0.32),
      height * 0.32,
      edge(height * 0.68),
      height * 0.68,
      edge(height),
      height
    )
    ctx.stroke()
  })
  ctx.restore()

  return edges
}

const AttentionStroop = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('mixed')
  const [running, setRunning] = useState(false)
  const [trial, setTrial] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [message, setMessage] = useState('press begin() or use color keys: c p g v')
  const [stats, setStats] = useState({ score: 0, accuracy: 100, avgRt: 0, interference: 0 })
  const [streak, setStreak] = useState(0)
  const [trialCount, setTrialCount] = useState(0)

  const historyRef = useRef([])
  const startedAtRef = useRef(0)
  const nextTrialTimeoutRef = useRef(null)
  const shimmerRef = useRef(0)

  const clearNextTrial = useCallback(() => {
    if (nextTrialTimeoutRef.current) {
      clearTimeout(nextTrialTimeoutRef.current)
      nextTrialTimeoutRef.current = null
    }
  }, [])

  const beginTrial = useCallback((modeId = mode) => {
    clearNextTrial()
    const nextTrial = createTrial(modeId)
    startedAtRef.current = performance.now()
    setTrial(nextTrial)
    setFeedback(null)
    setRunning(true)
    setTrialCount((count) => count + 1)
  }, [clearNextTrial, mode])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    setMessage(MODE_COPY[nextMode])
    if (running) {
      beginTrial(nextMode)
    }
  }, [beginTrial, running])

  const handleStart = useCallback(() => {
    if (running) {
      clearNextTrial()
      setRunning(false)
      setTrial(null)
      setFeedback(null)
      setMessage('attention suspended // the last afterimage cools')
      return
    }

    setMessage(MODE_COPY[mode])
    beginTrial(mode)
  }, [beginTrial, clearNextTrial, mode, running])

  const handleSkip = useCallback(() => {
    setMessage('trial discarded // a cleaner signal enters')
    beginTrial(mode)
  }, [beginTrial, mode])

  const handleReset = useCallback(() => {
    clearNextTrial()
    historyRef.current = []
    setStats({ score: 0, accuracy: 100, avgRt: 0, interference: 0 })
    setStreak(0)
    setTrialCount(0)
    setTrial(null)
    setFeedback(null)
    setRunning(false)
    setMessage('slate wiped // attention returns to zero')
  }, [clearNextTrial])

  const handleAnswer = useCallback((choiceId) => {
    if (!running || !trial || feedback) return

    const now = performance.now()
    const rt = Math.max(1, Math.round(now - startedAtRef.current))
    const correct = choiceId === trial.ink.id
    const speedBonus = correct ? clamp(Math.round(900 - rt), 0, 700) : 0
    const conflictBonus = correct && trial.conflict ? 120 : 0
    const points = correct ? 100 + speedBonus + conflictBonus : -80
    const nextStreak = correct ? streak + 1 : 0
    const chosen = COLOR_CHOICES.find((choice) => choice.id === choiceId)

    const entry = {
      id: trial.id,
      word: trial.word.label,
      ink: trial.ink.id,
      chosen: chosen?.id ?? choiceId,
      correct,
      conflict: trial.conflict,
      rt,
      points,
      streak: nextStreak
    }

    historyRef.current = [...historyRef.current, entry].slice(-60)
    setStats(summarizeHistory(historyRef.current))
    setStreak(nextStreak)
    setFeedback(entry)
    setMessage(correct
      ? `ink named in ${rt}ms // ${trial.conflict ? 'interference pierced' : 'signal aligned'}`
      : `semantic trap sprung // ink was ${trial.ink.label.toLowerCase()}`
    )

    clearNextTrial()
    nextTrialTimeoutRef.current = setTimeout(() => {
      beginTrial(mode)
    }, correct ? 520 : 780)
  }, [beginTrial, clearNextTrial, feedback, mode, running, streak, trial])

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase()
      if (key === ' ') {
        event.preventDefault()
        handleStart()
        return
      }

      const colorId = KEY_TO_COLOR[key]
      if (colorId) {
        event.preventDefault()
        handleAnswer(colorId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleAnswer, handleStart])

  useEffect(() => () => clearNextTrial(), [clearNextTrial])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const { width, height } = dimensions
    shimmerRef.current += 0.018

    const bg = ctx.createLinearGradient(0, 0, width, height)
    bg.addColorStop(0, 'rgba(2, 5, 12, 0.96)')
    bg.addColorStop(0.5, 'rgba(8, 10, 22, 0.94)')
    bg.addColorStop(1, 'rgba(12, 5, 18, 0.96)')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    const panelEdges = drawChamberPanels(ctx, width, height, COLOR_CHOICES, trial, shimmerRef.current)
    drawChamberBacklight(
      ctx,
      width,
      height,
      trial?.ink.glow ?? 'rgba(102, 255, 204, 0.55)',
      shimmerRef.current,
      trial ? 1 : 0.72
    )

    const history = historyRef.current
    const bandTop = Math.max(70, height * 0.12)
    const bandBottom = height - 42
    const bandHeight = bandBottom - bandTop

    history.forEach((entry, index) => {
      const progress = history.length <= 1 ? 1 : index / (history.length - 1)
      const x = 24 + progress * (width - 48)
      const y = bandBottom - clamp(entry.rt / 1200, 0, 1) * bandHeight
      const choice = COLOR_CHOICES.find((item) => item.id === entry.ink)
      const alpha = 0.16 + progress * 0.5

      ctx.strokeStyle = entry.correct
        ? `rgba(102, 255, 204, ${alpha * 0.45})`
        : `rgba(255, 102, 102, ${alpha * 0.55})`
      ctx.lineWidth = entry.conflict ? 2 : 1
      ctx.beginPath()
      ctx.moveTo(x, bandBottom)
      ctx.lineTo(x, y)
      ctx.stroke()

      ctx.fillStyle = choice?.ink ?? '#66ffcc'
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(x, y, entry.correct ? 3.5 : 5.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    })

    ctx.save()
    ctx.translate(width / 2, height * 0.48)

    if (trial) {
      const age = startedAtRef.current ? performance.now() - startedAtRef.current : 0
      const tension = clamp(age / 1800, 0, 1)
      const wobble = Math.sin(shimmerRef.current * 4) * (trial.conflict ? 6 : 2) * tension
      const fontSize = clamp(width * 0.13, 42, 118)

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = trial.ink.glow
      ctx.shadowColor = trial.ink.glow
      ctx.shadowBlur = 32 + tension * 18
      ctx.lineWidth = 1
      for (let ring = 0; ring < 3; ring += 1) {
        const ringPulse = Math.sin(shimmerRef.current * 1.8 + ring) * 8
        ctx.globalAlpha = 0.14 - ring * 0.028
        ctx.beginPath()
        ctx.ellipse(0, 0, fontSize * (1.25 + ring * 0.28) + ringPulse, fontSize * (0.48 + ring * 0.12), 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()

      ctx.shadowColor = trial.ink.glow
      ctx.shadowBlur = 24 + tension * 20
      ctx.fillStyle = trial.ink.ink
      ctx.font = `700 ${fontSize}px "JetBrains Mono", "SF Mono", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(trial.word.label, wobble, 0)
      ctx.shadowBlur = 0

      ctx.strokeStyle = trial.conflict
        ? 'rgba(255, 102, 204, 0.42)'
        : 'rgba(102, 255, 204, 0.24)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.ellipse(0, 0, fontSize * 1.85, fontSize * 0.66 + tension * 18, 0, 0, Math.PI * 2)
      ctx.stroke()

      if (feedback) {
        ctx.fillStyle = feedback.correct ? 'rgba(102, 255, 204, 0.92)' : 'rgba(255, 102, 102, 0.92)'
        ctx.font = `${clamp(width * 0.025, 13, 20)}px "JetBrains Mono", "SF Mono", monospace`
        ctx.fillText(feedback.correct ? `+${feedback.points}` : `${feedback.points}`, 0, fontSize * 0.86)
      }
    } else {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = 'rgba(255, 221, 102, 0.18)'
      ctx.shadowColor = 'rgba(255, 221, 102, 0.32)'
      ctx.shadowBlur = 26
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(0, 0, clamp(width * 0.26, 96, 250), clamp(height * 0.09, 36, 80), Math.sin(shimmerRef.current) * 0.08, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      ctx.shadowColor = 'rgba(102, 255, 204, 0.34)'
      ctx.shadowBlur = 18
      ctx.fillStyle = 'rgba(180, 255, 230, 0.56)'
      ctx.font = `600 ${clamp(width * 0.038, 18, 34)}px "JetBrains Mono", "SF Mono", monospace`
      ctx.fillText('attention chamber', 0, -8)
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(255, 221, 102, 0.46)'
      ctx.font = `${clamp(width * 0.018, 11, 16)}px "JetBrains Mono", "SF Mono", monospace`
      ctx.fillText('waiting behind the word', 0, 24)
    }

    ctx.restore()

    COLOR_CHOICES.forEach((choice, index) => {
      const left = panelEdges[index](height - 18)
      const right = panelEdges[index + 1](height - 18)
      const x = (left + right) / 2
      const y = height - 24
      const active = trial?.ink.id === choice.id

      ctx.fillStyle = active ? choice.ink : 'rgba(102, 255, 204, 0.45)'
      ctx.shadowColor = active ? choice.glow : 'rgba(0, 0, 0, 0)'
      ctx.shadowBlur = active ? 14 : 0
      ctx.font = `${width < 640 ? 11 : 13}px "JetBrains Mono", "SF Mono", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${choice.key.toUpperCase()} / ${choice.label}`, x, y)
      ctx.shadowBlur = 0
    })
  }, [ctx, dimensions, feedback, trial])

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
    { label: 'score', value: stats.score },
    { label: 'accuracy', value: `${stats.accuracy}%`, color: stats.accuracy < 70 ? '#ff6666' : undefined },
    { label: 'avg.rt', value: stats.avgRt ? `${stats.avgRt}ms` : 'none' },
    { label: 'drag', value: stats.interference ? `+${stats.interference}ms` : '0ms' },
    { label: 'streak', value: streak }
  ], [stats, streak])

  const controls = useMemo(() => [
    {
      id: 'begin',
      label: running ? 'pause()' : 'begin()',
      onClick: handleStart,
      active: running
    },
    {
      id: 'skip',
      label: 'skip()',
      onClick: handleSkip,
      disabled: !running
    },
    {
      id: 'reset',
      label: 'clear()',
      onClick: handleReset,
      variant: 'reset'
    }
  ], [handleReset, handleSkip, handleStart, running])

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

      <div className="border-b border-void-green/10 bg-void-dark/70 backdrop-blur-sm">
        <div className="flex flex-col gap-3 p-2 sm:p-4">
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
            <ExperimentControls
              modes={MODES}
              currentMode={mode}
              onModeChange={handleModeChange}
              controls={controls}
            />
            <p className="text-void-green/50 text-xs xl:text-right max-w-xl">{message}</p>
          </div>

          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(145px, 100%), 1fr))' }}
          >
            {COLOR_CHOICES.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => handleAnswer(choice.id)}
                disabled={!running || !trial || Boolean(feedback)}
                className="min-h-[48px] border bg-void-dark/45 px-3 py-2 font-mono text-sm transition-[border-color,background-color,transform,opacity] active:scale-95 disabled:opacity-45"
                style={{
                  borderColor: trial?.ink.id === choice.id ? choice.ink : 'rgba(102,255,204,0.22)',
                  color: choice.ink,
                  boxShadow: trial?.ink.id === choice.id ? `0 0 18px ${choice.glow}` : 'none'
                }}
                data-testid={`answer-${choice.id}`}
              >
                <span className="block text-[10px] uppercase tracking-[0.22em] opacity-60">{choice.key}</span>
                {choice.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          data-testid="attention-stroop-canvas"
        />

        <div className="pointer-events-none absolute left-3 top-3 text-[10px] sm:text-xs font-mono text-void-green/35">
          trial {trialCount}
        </div>
      </div>
    </div>
  )
}

export default AttentionStroop
