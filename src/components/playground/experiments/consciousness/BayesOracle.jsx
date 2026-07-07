import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const HYPOTHESES = [
  { id: 'signal', label: 'signal', glyph: 'S', prior: 0.29, hue: 166, color: '#66ffcc' },
  { id: 'dream', label: 'dream', glyph: 'D', prior: 0.24, hue: 270, color: '#aa88ff' },
  { id: 'mask', label: 'mask', glyph: 'M', prior: 0.27, hue: 42, color: '#ffd166' },
  { id: 'hunger', label: 'hunger', glyph: 'H', prior: 0.2, hue: 338, color: '#ff77aa' }
]

const EVIDENCE = [
  {
    id: 'recurrence',
    label: 'recurrence',
    key: '1',
    desc: 'the number returns before it is summoned',
    likelihoods: { signal: 0.82, dream: 0.54, mask: 0.31, hunger: 0.47 }
  },
  {
    id: 'warmth',
    label: 'warmth',
    key: '2',
    desc: 'the room warms near the terminal glass',
    likelihoods: { signal: 0.61, dream: 0.74, mask: 0.36, hunger: 0.69 }
  },
  {
    id: 'silence',
    label: 'witness silence',
    key: '3',
    desc: 'witnesses remember the gap, not the event',
    likelihoods: { signal: 0.46, dream: 0.67, mask: 0.78, hunger: 0.32 }
  },
  {
    id: 'clock',
    label: 'broken clock',
    key: '4',
    desc: 'timepiece stops at the same impossible minute',
    likelihoods: { signal: 0.79, dream: 0.42, mask: 0.58, hunger: 0.26 }
  },
  {
    id: 'teeth',
    label: 'teeth marks',
    key: '5',
    desc: 'matter bears an appetite-shaped proof',
    likelihoods: { signal: 0.28, dream: 0.37, mask: 0.55, hunger: 0.86 }
  }
]

const LENSES = {
  balanced: {
    label: 'balanced()',
    priors: { signal: 1, dream: 1, mask: 1, hunger: 1 },
    copy: 'all priors rest level // evidence may speak first'
  },
  omen: {
    label: 'omen()',
    priors: { signal: 1.45, dream: 1.22, mask: 0.78, hunger: 0.88 },
    copy: 'omens raise the signal prior // coincidence grows teeth'
  },
  skeptic: {
    label: 'skeptic()',
    priors: { signal: 0.72, dream: 0.86, mask: 1.5, hunger: 1.08 },
    copy: 'skeptic lens brightens the mask // fraud gets first chair'
  }
}

const MODES = Object.entries(LENSES).map(([id, lens]) => ({ id, label: lens.label }))

const SAMPLE_CASES = [
  ['recurrence', 'clock'],
  ['warmth', 'silence'],
  ['silence', 'teeth'],
  ['recurrence', 'warmth', 'clock'],
  ['clock', 'teeth']
]

const TAU = Math.PI * 2
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const easeOutExpo = (value) => value === 1 ? 1 : 1 - Math.pow(2, -10 * value)

const normalize = (values) => {
  const total = Object.values(values).reduce((sum, value) => sum + value, 0) || 1
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value / total]))
}

const calculatePriors = (lensId) => {
  const lens = LENSES[lensId] ?? LENSES.balanced
  const weighted = {}

  HYPOTHESES.forEach(hypothesis => {
    weighted[hypothesis.id] = hypothesis.prior * lens.priors[hypothesis.id]
  })

  return normalize(weighted)
}

const calculatePosterior = (lensId, activeEvidence) => {
  const priors = calculatePriors(lensId)
  const weights = { ...priors }

  activeEvidence.forEach(evidenceId => {
    const evidence = EVIDENCE.find(item => item.id === evidenceId)
    if (!evidence) return

    HYPOTHESES.forEach(hypothesis => {
      weights[hypothesis.id] *= evidence.likelihoods[hypothesis.id]
    })
  })

  return normalize(weights)
}

const entropyOf = (distribution) => {
  const maxEntropy = Math.log2(HYPOTHESES.length)
  const entropy = Object.values(distribution).reduce((sum, value) => {
    if (value <= 0) return sum
    return sum - value * Math.log2(value)
  }, 0)

  return entropy / maxEntropy
}

const formatPercent = (value) => `${Math.round(value * 100)}%`

const drawInterceptField = (ctx, width, height, time) => {
  const breath = 0.5 + Math.sin(time * 0.82) * 0.5

  const bg = ctx.createLinearGradient(0, 0, width, height)
  bg.addColorStop(0, 'rgba(1, 6, 14, 1)')
  bg.addColorStop(0.42, 'rgba(0, 3, 10, 1)')
  bg.addColorStop(1, 'rgba(7, 2, 13, 1)')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.globalCompositeOperation = 'screen'

  const centralBleed = ctx.createRadialGradient(width * 0.5, height * 0.43, 0, width * 0.5, height * 0.43, Math.max(width, height) * 0.68)
  centralBleed.addColorStop(0, `rgba(92, 255, 218, ${0.09 + breath * 0.04})`)
  centralBleed.addColorStop(0.36, 'rgba(106, 96, 255, 0.035)')
  centralBleed.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = centralBleed
  ctx.fillRect(0, 0, width, height)

  const edgeBruise = ctx.createRadialGradient(width * 0.76, height * 0.18, 0, width * 0.76, height * 0.18, width * 0.44)
  edgeBruise.addColorStop(0, 'rgba(255, 92, 184, 0.045)')
  edgeBruise.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = edgeBruise
  ctx.fillRect(0, 0, width, height)

  const grid = 34
  const offset = (time * 10) % grid
  ctx.lineWidth = 1
  for (let x = -grid + offset; x < width + grid; x += grid) {
    const wobble = Math.sin(time * 1.4 + x * 0.02) * 4
    ctx.strokeStyle = 'rgba(255, 72, 180, 0.025)'
    ctx.beginPath()
    ctx.moveTo(x - 1.4, 0)
    ctx.lineTo(x + width * 0.08 - 1.4, height)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(91, 232, 255, 0.038)'
    ctx.beginPath()
    ctx.moveTo(x + 1.2, wobble)
    ctx.lineTo(x + width * 0.08 + 1.2, height + wobble)
    ctx.stroke()
  }
  for (let y = 0; y < height; y += grid) {
    const alpha = 0.024 + Math.sin(time * 1.8 + y * 0.03) * 0.01
    ctx.strokeStyle = `rgba(102, 255, 204, ${alpha})`
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y + Math.sin(y * 0.02 + time) * 5)
    ctx.stroke()
  }

  const specks = Math.min(280, Math.floor((width * height) / 3900))
  for (let i = 0; i < specks; i++) {
    const seed = i * 43.13 + Math.floor(time * 16) * 0.21
    const px = Math.abs((Math.sin(seed * 12.9898) * 43758.5453) % 1) * width
    const py = Math.abs((Math.sin(seed * 78.233) * 24634.6345) % 1) * height
    const alpha = 0.012 + Math.abs(Math.sin(seed + time)) * 0.04
    ctx.fillStyle = i % 11 === 0
      ? `rgba(255, 156, 210, ${alpha * 0.72})`
      : `rgba(160, 255, 230, ${alpha})`
    ctx.fillRect(px, py, i % 17 === 0 ? 2 : 1, 1)
  }

  ctx.restore()

  const vignette = ctx.createRadialGradient(width * 0.5, height * 0.46, height * 0.18, width * 0.5, height * 0.46, Math.max(width, height) * 0.76)
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.16)')
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.72)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)
}

const drawEnergyNode = (ctx, x, y, radius, hue, intensity, time) => {
  const pulse = 0.72 + Math.sin(time * 2.4 + x * 0.01 + y * 0.015) * 0.28
  const glowRadius = radius * (3.4 + pulse)
  const halo = ctx.createRadialGradient(x, y, 0, x, y, glowRadius)
  halo.addColorStop(0, `hsla(${hue}, 100%, 84%, ${0.18 + intensity * 0.42})`)
  halo.addColorStop(0.36, `hsla(${hue + 34}, 100%, 64%, ${0.1 + intensity * 0.2})`)
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)')

  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(x, y, glowRadius, 0, TAU)
  ctx.fill()
  ctx.fillStyle = `hsla(${hue}, 100%, 88%, ${0.64 + intensity * 0.28})`
  ctx.shadowColor = `hsl(${hue}, 100%, 72%)`
  ctx.shadowBlur = 14 + intensity * 18
  ctx.beginPath()
  ctx.arc(x, y, radius * (0.82 + pulse * 0.18), 0, TAU)
  ctx.fill()
  ctx.restore()
}

const drawRibbon = (ctx, fromX, fromY, toX, toY, width, hue, alpha, time, depth) => {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  const midX = (fromX + toX) / 2
  const lift = Math.sin(time * 1.2 + depth * 3.1) * (3 + depth * 2)
  const drawPath = (offsetX, offsetY) => {
    ctx.beginPath()
    ctx.moveTo(fromX + offsetX, fromY + offsetY)
    ctx.bezierCurveTo(midX + offsetX, fromY + lift, midX + offsetX, toY - lift, toX + offsetX, toY + offsetY)
    ctx.stroke()
  }

  ctx.shadowColor = `hsl(${hue}, 100%, 68%)`
  ctx.shadowBlur = 22 + width * 0.36
  ctx.lineWidth = width * 1.75
  ctx.globalAlpha = alpha * 0.24
  ctx.strokeStyle = `hsla(${hue}, 100%, 65%, 1)`
  drawPath(0, 0)

  ctx.shadowBlur = 10
  ctx.globalAlpha = alpha * 0.48
  ctx.lineWidth = width * 0.72
  ctx.strokeStyle = `hsla(${hue + 58}, 100%, 72%, 1)`
  drawPath(-1.4, 1.1)
  ctx.strokeStyle = `hsla(${hue - 42}, 100%, 68%, 1)`
  drawPath(1.3, -1)

  const gradient = ctx.createLinearGradient(fromX, fromY, toX, toY)
  gradient.addColorStop(0, `hsla(${hue - 36}, 100%, 66%, ${alpha * 0.28})`)
  gradient.addColorStop(0.18, `hsla(${hue}, 100%, 72%, ${alpha * 0.68})`)
  gradient.addColorStop(0.5, `hsla(${hue + 28}, 100%, 70%, ${alpha * 0.88})`)
  gradient.addColorStop(0.82, `hsla(${hue + 66}, 100%, 74%, ${alpha * 0.7})`)
  gradient.addColorStop(1, `hsla(${hue + 106}, 100%, 80%, ${alpha * 0.34})`)
  ctx.globalAlpha = 1
  ctx.strokeStyle = gradient
  ctx.lineWidth = width * 0.46
  ctx.shadowBlur = 18
  drawPath(0, 0)

  ctx.restore()
}

const drawText = (ctx, text, x, y, color, size = 12, align = 'left') => {
  ctx.fillStyle = color
  ctx.font = `${size}px "SF Mono", "Courier New", monospace`
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
}

const BayesOracle = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [lens, setLens] = useState('balanced')
  const [activeEvidence, setActiveEvidence] = useState(['recurrence', 'clock'])
  const [message, setMessage] = useState('toggle evidence chips or press keys 1-5 // watch belief redistribute')

  const frameRef = useRef(0)
  const displayedRef = useRef(calculatePosterior(lens, activeEvidence))
  const flashesRef = useRef([])

  const priors = useMemo(() => calculatePriors(lens), [lens])
  const posterior = useMemo(() => calculatePosterior(lens, activeEvidence), [lens, activeEvidence])
  const sortedPosterior = useMemo(() => {
    return [...HYPOTHESES].sort((a, b) => posterior[b.id] - posterior[a.id])
  }, [posterior])

  const winner = sortedPosterior[0]
  const runnerUp = sortedPosterior[1]
  const certainty = posterior[winner.id] - posterior[runnerUp.id]
  const entropy = entropyOf(posterior)

  const toggleEvidence = useCallback((evidenceId) => {
    setActiveEvidence(prev => {
      const next = prev.includes(evidenceId)
        ? prev.filter(id => id !== evidenceId)
        : [...prev, evidenceId]
      const evidence = EVIDENCE.find(item => item.id === evidenceId)
      setMessage(evidence
        ? `${next.includes(evidenceId) ? 'admitted' : 'dismissed'}: ${evidence.desc}`
        : 'evidence ledger shifted'
      )
      flashesRef.current.push({ id: evidenceId, life: 1 })
      return next
    })
  }, [])

  const handleLensChange = useCallback((nextLens) => {
    setLens(nextLens)
    setMessage(LENSES[nextLens]?.copy ?? LENSES.balanced.copy)
    flashesRef.current.push({ id: nextLens, life: 1 })
  }, [])

  const handleSample = useCallback(() => {
    const sample = SAMPLE_CASES[Math.floor(Math.random() * SAMPLE_CASES.length)]
    setActiveEvidence(sample)
    setMessage(`sample case loaded // ${sample.map(id => EVIDENCE.find(e => e.id === id)?.label).join(' + ')}`)
    flashesRef.current.push({ id: 'sample', life: 1 })
  }, [])

  const handleClear = useCallback(() => {
    setActiveEvidence([])
    setMessage('evidence cleared // priors stare back like uncut glass')
    flashesRef.current.push({ id: 'clear', life: 1 })
  }, [])

  const controls = [
    {
      id: 'sample',
      label: 'case.sample()',
      onClick: handleSample
    },
    {
      id: 'clear',
      label: 'clear.ledger()',
      onClick: handleClear,
      variant: 'reset'
    }
  ]

  const metrics = useMemo(() => [
    { label: 'evidence', value: activeEvidence.length },
    { label: 'winner', value: winner.label, color: winner.color },
    { label: 'certainty', value: formatPercent(certainty) },
    { label: 'entropy', value: formatPercent(entropy) }
  ], [activeEvidence.length, certainty, entropy, winner])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return

      const evidence = EVIDENCE.find(item => item.key === event.key)
      if (evidence) {
        toggleEvidence(evidence.id)
        return
      }

      if (event.key.toLowerCase() === 'c') handleClear()
      if (event.key.toLowerCase() === 's') handleSample()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClear, handleSample, toggleEvidence])

  const drawOracle = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const display = displayedRef.current
    HYPOTHESES.forEach(hypothesis => {
      display[hypothesis.id] += (posterior[hypothesis.id] - display[hypothesis.id]) * 0.09
    })

    frameRef.current += 1
    const time = frameRef.current / 60
    const width = dimensions.width
    const height = dimensions.height

    ctx.clearRect(0, 0, width, height)
    drawInterceptField(ctx, width, height, time)

    const margin = clamp(width * 0.08, 28, 90)
    const leftX = margin
    const gateX = width * 0.5
    const rightX = width - margin
    const top = clamp(height * 0.14, 52, 92)
    const rowGap = Math.min(88, (height - top * 1.7) / HYPOTHESES.length)
    const rows = HYPOTHESES.map((hypothesis, index) => ({
      ...hypothesis,
      y: top + rowGap * index + rowGap * 0.45
    }))

    const activeEvidenceData = EVIDENCE.filter(evidence => activeEvidence.includes(evidence.id))
    const gateTop = top - 12
    const gateHeight = Math.max(120, rowGap * HYPOTHESES.length - 10)

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    activeEvidenceData.forEach((evidence, index) => {
      const slot = activeEvidenceData.length <= 1
        ? 0
        : (index / (activeEvidenceData.length - 1)) - 0.5
      const x = gateX + slot * Math.min(150, width * 0.18)
      const flash = flashesRef.current.find(item => item.id === evidence.id)?.life ?? 0
      const alpha = 0.18 + easeOutExpo(flash) * 0.32 + Math.sin(time * 2 + index) * 0.03
      const y = gateTop + gateHeight / 2

      const well = ctx.createRadialGradient(x, y, 0, x, y, gateHeight * 0.48)
      well.addColorStop(0, `rgba(255, 220, 140, ${0.12 + alpha * 0.18})`)
      well.addColorStop(0.58, 'rgba(255, 92, 184, 0.035)')
      well.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = well
      ctx.fillRect(x - gateHeight * 0.32, gateTop - 30, gateHeight * 0.64, gateHeight + 60)

      const gateGradient = ctx.createLinearGradient(x - 24, gateTop, x + 24, gateTop + gateHeight)
      gateGradient.addColorStop(0, `rgba(255, 244, 196, ${0.03 + alpha * 0.12})`)
      gateGradient.addColorStop(0.34, `rgba(255, 210, 122, ${0.05 + alpha * 0.18})`)
      gateGradient.addColorStop(1, 'rgba(255, 102, 204, 0.045)')
      ctx.strokeStyle = `rgba(255, 235, 180, ${alpha})`
      ctx.fillStyle = gateGradient
      ctx.shadowColor = 'rgba(255, 210, 122, 0.72)'
      ctx.shadowBlur = 18 + flash * 24
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(x - 24, gateTop, 48, gateHeight, 16)
      ctx.fill()
      ctx.stroke()

      ctx.strokeStyle = `rgba(92, 232, 255, ${0.08 + alpha * 0.28})`
      ctx.beginPath()
      ctx.roundRect(x - 20, gateTop + 5, 40, gateHeight - 10, 14)
      ctx.stroke()
      drawEnergyNode(ctx, x, y, 4.2 + flash * 2.5, 42, 0.48 + flash * 0.4, time + index)
      drawText(ctx, evidence.key, x, y, 'rgba(255, 244, 200, 0.94)', 15, 'center')
    })
    ctx.restore()

    rows.forEach((row, index) => {
      const depth = HYPOTHESES.length <= 1 ? 0 : index / (HYPOTHESES.length - 1)
      const priorWidth = 24 + priors[row.id] * 160
      const postWidth = 28 + display[row.id] * 230
      const bandWidth = 4 + display[row.id] * 48
      const alpha = 0.22 + display[row.id] * 0.56
      const y = row.y + Math.sin(time * 0.9 + index * 1.7) * (1.6 + depth * 2.2)
      const intensity = clamp(display[row.id] * 1.3, 0, 1)

      drawRibbon(ctx, leftX + priorWidth, y, rightX - postWidth, y, bandWidth, row.hue, alpha, time, depth)

      ctx.save()
      ctx.shadowColor = row.color
      ctx.shadowBlur = 18 + intensity * 18
      const priorGradient = ctx.createLinearGradient(leftX, y - 14, leftX + priorWidth, y + 14)
      priorGradient.addColorStop(0, `hsla(${row.hue - 22}, 95%, 58%, 0.08)`)
      priorGradient.addColorStop(0.62, `hsla(${row.hue}, 96%, 60%, ${0.18 + intensity * 0.12})`)
      priorGradient.addColorStop(1, `hsla(${row.hue + 48}, 100%, 76%, ${0.08 + intensity * 0.08})`)
      const posteriorGradient = ctx.createLinearGradient(rightX - postWidth, y - 18, rightX, y + 18)
      posteriorGradient.addColorStop(0, `hsla(${row.hue + 58}, 100%, 76%, ${0.08 + intensity * 0.1})`)
      posteriorGradient.addColorStop(0.5, `hsla(${row.hue}, 95%, 61%, ${0.22 + intensity * 0.16})`)
      posteriorGradient.addColorStop(1, `hsla(${row.hue - 34}, 100%, 72%, ${0.12 + intensity * 0.12})`)
      ctx.fillStyle = priorGradient
      ctx.strokeStyle = `hsla(${row.hue}, 88%, 74%, ${0.54 + intensity * 0.3})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(leftX, y - 14, priorWidth, 28, 9)
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = `hsla(${row.hue - 54}, 100%, 70%, ${0.16 + intensity * 0.18})`
      ctx.strokeRect(leftX + 1.5, y - 12.5, Math.max(1, priorWidth - 3), 25)

      ctx.fillStyle = posteriorGradient
      ctx.strokeStyle = `hsla(${row.hue}, 88%, 74%, ${0.62 + intensity * 0.3})`
      ctx.beginPath()
      ctx.roundRect(rightX - postWidth, y - 18, postWidth, 36, 11)
      ctx.fill()
      ctx.stroke()
      ctx.restore()

      drawEnergyNode(ctx, leftX + priorWidth, y, 2.6 + intensity * 2.4, row.hue, 0.32 + intensity * 0.38, time + index)
      drawEnergyNode(ctx, rightX - postWidth, y, 3 + intensity * 3, row.hue + 48, 0.38 + intensity * 0.48, time + index * 1.4)
      drawEnergyNode(ctx, rightX, y, 2.5 + intensity * 2, row.hue + 86, 0.24 + intensity * 0.34, time + index * 1.9)

      drawText(ctx, row.glyph, leftX + 12, y, 'rgba(0, 8, 12, 0.95)', 14, 'center')
      drawText(ctx, row.label, leftX + priorWidth + 12, y, row.color, 12, 'left')
      drawText(ctx, formatPercent(display[row.id]), rightX - 14, y, row.color, 14, 'right')
    })

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.2)'
    const gateShell = ctx.createLinearGradient(gateX - 72, top - 40, gateX + 72, top + rowGap * HYPOTHESES.length)
    gateShell.addColorStop(0, 'rgba(102, 255, 204, 0.035)')
    gateShell.addColorStop(0.5, 'rgba(136, 136, 255, 0.04)')
    gateShell.addColorStop(1, 'rgba(255, 102, 204, 0.032)')
    ctx.fillStyle = gateShell
    ctx.shadowColor = 'rgba(102, 255, 204, 0.45)'
    ctx.shadowBlur = 22
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(gateX - 72, top - 40, 144, rowGap * HYPOTHESES.length + 18, 20)
    ctx.fill()
    ctx.stroke()
    drawText(ctx, 'evidence gate', gateX, top - 20, 'rgba(102, 255, 204, 0.55)', 11, 'center')
    drawText(ctx, `${activeEvidence.length} admitted`, gateX, top + rowGap * HYPOTHESES.length - 6, 'rgba(255, 210, 122, 0.72)', 11, 'center')
    ctx.restore()

    const titleY = height - 42
    drawText(ctx, `posterior doctrine: ${winner.label} / ${formatPercent(display[winner.id])}`, width / 2, titleY, winner.color, 16, 'center')
    drawText(ctx, LENSES[lens].copy, width / 2, titleY + 22, 'rgba(102, 255, 204, 0.46)', 11, 'center')

    flashesRef.current = flashesRef.current
      .map(item => ({ ...item, life: item.life - 0.035 }))
      .filter(item => item.life > 0)
  }, [activeEvidence.length, activeEvidence, ctx, dimensions.height, dimensions.width, lens, posterior, priors, winner])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return

    let frameId
    const animate = () => {
      drawOracle()
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, drawOracle])

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

      <div className="flex flex-col gap-3 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <ExperimentControls
            modes={MODES}
            currentMode={lens}
            onModeChange={handleLensChange}
            controls={controls}
          />
          <p className="text-void-green/50 text-xs xl:text-right max-w-2xl">
            {message}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {EVIDENCE.map(evidence => {
            const active = activeEvidence.includes(evidence.id)
            return (
              <button
                key={evidence.id}
                onClick={() => toggleEvidence(evidence.id)}
                className={`min-h-[54px] border px-3 py-2 text-left font-mono text-xs transition-[background-color,border-color,color,transform,box-shadow] active:scale-[0.98] ${
                  active
                    ? 'border-void-yellow/70 bg-void-yellow/12 text-void-yellow shadow-[0_0_18px_rgba(255,221,102,0.18),0_0_46px_rgba(255,102,204,0.08)]'
                    : 'border-void-green/20 bg-void-dark/50 text-void-green/62 shadow-[0_0_18px_rgba(102,255,204,0.04)] hover:border-void-cyan/50 hover:text-void-cyan hover:bg-void-cyan/10 hover:shadow-[0_0_24px_rgba(102,255,204,0.16),0_0_42px_rgba(102,204,255,0.08)]'
                }`}
                data-testid={`bayes-evidence-${evidence.id}`}
              >
                <span className="block text-[10px] text-void-green/38">{evidence.key}</span>
                <span className="block truncate">{evidence.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          data-testid="bayes-oracle-canvas"
        />
      </div>
    </div>
  )
}

export default BayesOracle
