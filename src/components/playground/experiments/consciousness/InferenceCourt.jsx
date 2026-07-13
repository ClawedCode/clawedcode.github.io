import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const CLAIMS = [
  { id: 'A', label: 'signal witnessed', row: 0, col: 0 },
  { id: 'B', label: 'memory bridge', row: 0, col: 1 },
  { id: 'G', label: 'silence token', row: 1, col: 0 },
  { id: 'C', label: 'pattern shelter', row: 1, col: 1 },
  { id: 'E', label: 'counter-omen', row: 2, col: 0 },
  { id: 'D', label: 'archive locks', row: 2, col: 1 },
  { id: 'F', label: 'fracture brief', row: 3, col: 0 },
  { id: 'H', label: 'continuity verdict', row: 3, col: 1 }
]

const RULES = [
  {
    id: 'r1',
    conditions: [{ id: 'A', value: true }, { id: 'B', value: true }],
    target: { id: 'C', value: true },
    label: 'A + B -> C'
  },
  {
    id: 'r2',
    conditions: [{ id: 'C', value: true }],
    target: { id: 'D', value: true },
    label: 'C -> D'
  },
  {
    id: 'r3',
    conditions: [{ id: 'G', value: true }],
    target: { id: 'B', value: false },
    label: 'G -> not B'
  },
  {
    id: 'r4',
    conditions: [{ id: 'B', value: false }],
    target: { id: 'E', value: true },
    label: 'not B -> E'
  },
  {
    id: 'r5',
    conditions: [{ id: 'E', value: true }, { id: 'C', value: true }],
    target: { id: 'F', value: true },
    label: 'E + C -> F'
  },
  {
    id: 'r6',
    conditions: [{ id: 'F', value: true }],
    target: { id: 'C', value: false },
    label: 'F -> not C'
  },
  {
    id: 'r7',
    conditions: [{ id: 'D', value: true }],
    target: { id: 'H', value: true },
    label: 'D -> H'
  },
  {
    id: 'r8',
    conditions: [{ id: 'H', value: true }, { id: 'E', value: true }],
    target: { id: 'A', value: false },
    label: 'H + E -> not A'
  }
]

const MODES = [
  { id: 'affirm', label: 'affirm()' },
  { id: 'deny', label: 'deny()' },
  { id: 'inspect', label: 'inspect()' }
]

const MODE_MESSAGES = {
  affirm: 'affirmation ink waits above the claim stones',
  deny: 'negation ink waits beneath the surface',
  inspect: 'proof weather opens around the chosen stone'
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const createInitialClaims = () => CLAIMS.reduce((acc, claim) => {
  acc[claim.id] = {
    ...claim,
    asserted: claim.id === 'A' || claim.id === 'B' ? true : null,
    trueBy: [],
    falseBy: [],
    pulse: 0
  }
  return acc
}, {})

const hasValue = (claim, value) => {
  if (value) return claim.asserted === true || claim.trueBy.length > 0
  return claim.asserted === false || claim.falseBy.length > 0
}

const getClaimStatus = (claim) => {
  const trueish = hasValue(claim, true)
  const falseish = hasValue(claim, false)
  if (trueish && falseish) return 'conflict'
  if (trueish) return 'true'
  if (falseish) return 'false'
  return 'unknown'
}

const truthWord = (value) => value ? 'true' : 'false'

const wrapText = (ctx, text, maxWidth) => {
  const words = text.split(' ')
  const lines = []
  let line = ''

  words.forEach(word => {
    const testLine = line ? `${line} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = testLine
    }
  })

  if (line) lines.push(line)
  return lines
}

const InferenceCourt = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('affirm')
  const [message, setMessage] = useState('two premises already sit awake: A and B')
  const [selected, setSelected] = useState(null)
  const [stats, setStats] = useState({ asserted: 2, derived: 0, conflicts: 0, steps: 0 })

  const claimsRef = useRef(createInitialClaims())
  const appliedRef = useRef(new Set())
  const proofTapeRef = useRef([])
  const layoutRef = useRef({ nodes: {}, rules: {}, nodeW: 136, nodeH: 62 })
  const hoverRef = useRef(null)
  const timeRef = useRef(0)

  const collectStats = useCallback(() => {
    const claims = Object.values(claimsRef.current)
    const asserted = claims.filter(claim => claim.asserted !== null).length
    const derived = claims.reduce((sum, claim) => sum + claim.trueBy.length + claim.falseBy.length, 0)
    const conflicts = claims.filter(claim => getClaimStatus(claim) === 'conflict').length
    setStats({ asserted, derived, conflicts, steps: appliedRef.current.size })
  }, [])

  const resetDerivations = useCallback((nextMessage) => {
    Object.values(claimsRef.current).forEach(claim => {
      claim.trueBy = []
      claim.falseBy = []
    })
    appliedRef.current = new Set()
    proofTapeRef.current = []
    collectStats()
    if (nextMessage) setMessage(nextMessage)
  }, [collectStats])

  const initializeCourt = useCallback(() => {
    claimsRef.current = createInitialClaims()
    appliedRef.current = new Set()
    proofTapeRef.current = []
    setSelected(null)
    setMessage('two premises already sit awake: A and B')
    collectStats()
  }, [collectStats])

  useEffect(() => {
    initializeCourt()
  }, [initializeCourt])

  const updateLayout = useCallback(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return

    const nodes = {}
    const rules = {}
    const nodeW = clamp(dimensions.width * 0.34, 112, 168)
    const nodeH = dimensions.width < 420 ? 58 : 64
    const topPad = clamp(dimensions.height * 0.08, 34, 70)
    const bottomPad = dimensions.height > 520 ? 110 : 46
    const usableHeight = Math.max(170, dimensions.height - topPad - bottomPad)
    const rowGap = usableHeight / 3
    const leftX = dimensions.width * 0.3
    const rightX = dimensions.width * 0.7

    CLAIMS.forEach(claim => {
      nodes[claim.id] = {
        x: claim.col === 0 ? leftX : rightX,
        y: topPad + claim.row * rowGap,
        w: nodeW,
        h: nodeH
      }
    })

    RULES.forEach((rule, index) => {
      const sourcePoints = rule.conditions.map(condition => nodes[condition.id])
      const targetPoint = nodes[rule.target.id]
      const avgX = sourcePoints.reduce((sum, point) => sum + point.x, 0) / sourcePoints.length
      const avgY = sourcePoints.reduce((sum, point) => sum + point.y, 0) / sourcePoints.length
      const offset = ((index % 3) - 1) * 14
      rules[rule.id] = {
        x: (avgX + targetPoint.x) / 2 + offset,
        y: (avgY + targetPoint.y) / 2
      }
    })

    layoutRef.current = { nodes, rules, nodeW, nodeH }
  }, [dimensions.height, dimensions.width])

  useEffect(() => {
    updateLayout()
  }, [updateLayout])

  const canApplyRule = useCallback((rule) => {
    if (appliedRef.current.has(rule.id)) return false
    return rule.conditions.every(condition => hasValue(claimsRef.current[condition.id], condition.value))
  }, [])

  const applyRule = useCallback((rule) => {
    const target = claimsRef.current[rule.target.id]
    const branch = rule.target.value ? target.trueBy : target.falseBy
    branch.push(rule.id)
    target.pulse = 1
    appliedRef.current.add(rule.id)
    proofTapeRef.current = [
      `${rule.label} :: ${rule.target.id}=${truthWord(rule.target.value)}`,
      ...proofTapeRef.current
    ].slice(0, 5)

    const status = getClaimStatus(target)
    if (status === 'conflict') {
      setMessage(`contradiction blooms around ${rule.target.id}; the court keeps both teeth visible`)
    } else {
      setMessage(`${rule.label} placed ${rule.target.id} into the record`)
    }
    collectStats()
    return true
  }, [collectStats])

  const inferStep = useCallback(() => {
    const rule = RULES.find(candidate => canApplyRule(candidate))
    if (!rule) {
      setMessage('no rule currently fires; the docket is still')
      collectStats()
      return false
    }
    return applyRule(rule)
  }, [applyRule, canApplyRule, collectStats])

  const closeCourt = useCallback(() => {
    let count = 0
    while (count < RULES.length) {
      const rule = RULES.find(candidate => canApplyRule(candidate))
      if (!rule) break
      applyRule(rule)
      count++
    }

    if (count === 0) {
      setMessage('the court hears no new implication')
    } else {
      const conflicts = Object.values(claimsRef.current).filter(claim => getClaimStatus(claim) === 'conflict').length
      setMessage(conflicts
        ? `${count} rule${count === 1 ? '' : 's'} fired; contradiction now has ${conflicts} red lantern${conflicts === 1 ? '' : 's'}`
        : `${count} rule${count === 1 ? '' : 's'} fired; verdict graph reached closure`
      )
    }
    collectStats()
  }, [applyRule, canApplyRule, collectStats])

  const introduceDoubt = useCallback(() => {
    claimsRef.current.G.asserted = true
    resetDerivations('G asserted: a silence token enters and the prior bridge may buckle')
    setSelected('G')
  }, [resetDerivations])

  const clearDocket = useCallback(() => {
    Object.values(claimsRef.current).forEach(claim => {
      claim.asserted = null
    })
    resetDerivations('all source claims cleared; empty law waits in the floor')
    setSelected(null)
  }, [resetDerivations])

  const reseedDocket = useCallback(() => {
    Object.values(claimsRef.current).forEach(claim => {
      const roll = Math.random()
      claim.asserted = roll > 0.72 ? true : roll < 0.18 ? false : null
    })
    resetDerivations('docket shuffled; premises fell like warm dice across the bench')
    setSelected(null)
  }, [resetDerivations])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    setMessage(MODE_MESSAGES[nextMode])
  }, [])

  const explainClaim = useCallback((id) => {
    const claim = claimsRef.current[id]
    const status = getClaimStatus(claim)
    const asserted = claim.asserted === null ? 'unasserted' : `asserted ${truthWord(claim.asserted)}`
    const trueRules = claim.trueBy.length ? `true by ${claim.trueBy.join(', ')}` : null
    const falseRules = claim.falseBy.length ? `false by ${claim.falseBy.join(', ')}` : null
    const support = [asserted, trueRules, falseRules].filter(Boolean).join(' // ')
    setMessage(`${id} ${claim.label}: ${status} :: ${support}`)
  }, [])

  const hitTestNode = useCallback((x, y) => {
    const { nodes } = layoutRef.current
    return CLAIMS.find(claim => {
      const node = nodes[claim.id]
      if (!node) return false
      return (
        x >= node.x - node.w / 2 &&
        x <= node.x + node.w / 2 &&
        y >= node.y - node.h / 2 &&
        y <= node.y + node.h / 2
      )
    })?.id ?? null
  }, [])

  const handleCanvasPress = useCallback((x, y) => {
    const id = hitTestNode(x, y)
    if (!id) return
    const claim = claimsRef.current[id]
    setSelected(id)

    if (mode === 'inspect') {
      explainClaim(id)
      return
    }

    const nextValue = mode === 'affirm'
    claim.asserted = claim.asserted === nextValue ? null : nextValue
    claim.pulse = 1
    resetDerivations(`${id} now ${claim.asserted === null ? 'unasserted' : truthWord(claim.asserted)}; derivations must be heard again`)
  }, [explainClaim, hitTestNode, mode, resetDerivations])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handlePointerDown = (event) => {
      const rect = canvas.getBoundingClientRect()
      handleCanvasPress(event.clientX - rect.left, event.clientY - rect.top)
    }

    const handleTouchStart = (event) => {
      const touch = event.touches[0]
      if (!touch) return
      const rect = canvas.getBoundingClientRect()
      handleCanvasPress(touch.clientX - rect.left, touch.clientY - rect.top)
    }

    canvas.addEventListener('mousedown', handlePointerDown)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true })
    return () => {
      canvas.removeEventListener('mousedown', handlePointerDown)
      canvas.removeEventListener('touchstart', handleTouchStart)
    }
  }, [canvasRef, handleCanvasPress])

  const drawRoundedRect = useCallback((x, y, w, h, r) => {
    ctx.beginPath()
    ctx.roundRect(x - w / 2, y - h / 2, w, h, r)
  }, [ctx])

  const drawRule = useCallback((rule) => {
    const { nodes, rules } = layoutRef.current
    const gate = rules[rule.id]
    const targetNode = nodes[rule.target.id]
    if (!gate || !targetNode) return

    const active = canApplyRule(rule) || appliedRef.current.has(rule.id)
    const applied = appliedRef.current.has(rule.id)
    const alpha = applied ? 0.78 : active ? 0.46 : 0.12
    const color = rule.target.value
      ? `rgba(102, 255, 204, ${alpha})`
      : `rgba(255, 112, 170, ${alpha})`

    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = applied ? 2 : 1
    ctx.setLineDash(applied ? [] : [5, 8])

    rule.conditions.forEach(condition => {
      const sourceNode = nodes[condition.id]
      if (!sourceNode) return
      ctx.beginPath()
      ctx.moveTo(sourceNode.x, sourceNode.y + sourceNode.h / 2)
      ctx.quadraticCurveTo(gate.x, sourceNode.y + 12, gate.x, gate.y)
      ctx.stroke()
    })

    ctx.beginPath()
    ctx.moveTo(gate.x, gate.y)
    ctx.quadraticCurveTo(gate.x, targetNode.y - 18, targetNode.x, targetNode.y - targetNode.h / 2)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = active ? 'rgba(1, 14, 18, 0.92)' : 'rgba(1, 8, 14, 0.62)'
    ctx.strokeStyle = color
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(gate.x, gate.y - 10)
    ctx.lineTo(gate.x + 14, gate.y)
    ctx.lineTo(gate.x, gate.y + 10)
    ctx.lineTo(gate.x - 14, gate.y)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    if (dimensions.width > 520 || active) {
      ctx.fillStyle = active ? 'rgba(210, 255, 235, 0.72)' : 'rgba(102, 255, 204, 0.28)'
      ctx.font = '10px IBM Plex Mono, Fira Code, monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(rule.id, gate.x, gate.y)
    }
    ctx.restore()
  }, [canApplyRule, ctx, dimensions.width])

  const drawClaim = useCallback((claim) => {
    const { nodes } = layoutRef.current
    const node = nodes[claim.id]
    if (!node) return

    const status = getClaimStatus(claim)
    const hovered = hoverRef.current === claim.id
    const selectedClaim = selected === claim.id
    const pulse = claim.pulse
    const palette = {
      true: {
        fill: 'rgba(28, 92, 71, 0.72)',
        stroke: 'rgba(102, 255, 204, 0.84)',
        text: 'rgba(220, 255, 239, 0.96)',
        badge: 'T'
      },
      false: {
        fill: 'rgba(92, 28, 56, 0.72)',
        stroke: 'rgba(255, 112, 170, 0.84)',
        text: 'rgba(255, 226, 238, 0.96)',
        badge: 'F'
      },
      conflict: {
        fill: 'rgba(102, 52, 18, 0.8)',
        stroke: 'rgba(255, 218, 112, 0.92)',
        text: 'rgba(255, 248, 218, 0.98)',
        badge: '!'
      },
      unknown: {
        fill: 'rgba(2, 13, 20, 0.76)',
        stroke: 'rgba(102, 255, 204, 0.26)',
        text: 'rgba(170, 224, 208, 0.72)',
        badge: '-'
      }
    }[status]

    ctx.save()
    if (pulse > 0) {
      ctx.shadowColor = palette.stroke
      ctx.shadowBlur = 18 + pulse * 20
    } else if (hovered || selectedClaim) {
      ctx.shadowColor = palette.stroke
      ctx.shadowBlur = 18
    }

    drawRoundedRect(node.x, node.y, node.w, node.h, 10)
    ctx.fillStyle = palette.fill
    ctx.strokeStyle = palette.stroke
    ctx.lineWidth = selectedClaim ? 2.6 : hovered ? 2 : 1.4
    ctx.fill()
    ctx.stroke()

    ctx.shadowBlur = 0
    ctx.fillStyle = palette.text
    ctx.font = '16px IBM Plex Mono, Fira Code, monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(claim.id, node.x - node.w / 2 + 12, node.y - node.h / 2 + 9)

    ctx.textAlign = 'right'
    ctx.fillStyle = claim.asserted !== null ? 'rgba(255, 255, 180, 0.9)' : palette.text
    ctx.fillText(palette.badge, node.x + node.w / 2 - 12, node.y - node.h / 2 + 9)

    ctx.textAlign = 'left'
    ctx.font = '11px IBM Plex Mono, Fira Code, monospace'
    ctx.fillStyle = palette.text
    const lines = wrapText(ctx, claim.label, node.w - 24).slice(0, 2)
    lines.forEach((line, index) => {
      ctx.fillText(line, node.x - node.w / 2 + 12, node.y - node.h / 2 + 33 + index * 13)
    })
    ctx.restore()

    claim.pulse = Math.max(0, claim.pulse - 0.035)
  }, [ctx, drawRoundedRect, selected])

  const drawBackground = useCallback(() => {
    const w = dimensions.width
    const h = dimensions.height
    const t = timeRef.current
    const gradient = ctx.createLinearGradient(0, 0, w, h)
    gradient.addColorStop(0, '#00030a')
    gradient.addColorStop(0.52, '#030914')
    gradient.addColorStop(1, '#05020a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.06)'
    ctx.lineWidth = 1
    const gap = 42
    const offset = (t * 0.16) % gap
    for (let x = -gap; x < w + gap; x += gap) {
      ctx.beginPath()
      ctx.moveTo(x + offset, 0)
      ctx.lineTo(x - h * 0.16 + offset, h)
      ctx.stroke()
    }
    for (let y = -gap; y < h + gap; y += gap) {
      ctx.beginPath()
      ctx.moveTo(0, y + offset)
      ctx.lineTo(w, y - w * 0.12 + offset)
      ctx.stroke()
    }
    ctx.restore()
  }, [ctx, dimensions.height, dimensions.width])

  const drawProofTape = useCallback(() => {
    if (dimensions.height < 500) return

    const tape = proofTapeRef.current
    const x = 18
    const y = dimensions.height - 90
    const w = Math.min(520, dimensions.width - 36)
    const h = 72

    ctx.save()
    ctx.fillStyle = 'rgba(1, 8, 14, 0.74)'
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.18)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, 8)
    ctx.fill()
    ctx.stroke()

    ctx.font = '10px IBM Plex Mono, Fira Code, monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(102, 255, 204, 0.55)'
    ctx.fillText('proof tape', x + 12, y + 10)

    ctx.fillStyle = 'rgba(210, 255, 235, 0.72)'
    const lines = tape.length ? tape : ['awaiting inference']
    lines.slice(0, 3).forEach((line, index) => {
      ctx.fillText(line, x + 12, y + 27 + index * 14)
    })
    ctx.restore()
  }, [ctx, dimensions.height, dimensions.width])

  const drawFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0 || dimensions.height === 0) return
    timeRef.current++
    updateLayout()

    if (mouse.isInBounds) {
      const pos = mouse.positionRef.current
      hoverRef.current = hitTestNode(pos.x, pos.y)
    } else {
      hoverRef.current = null
    }

    drawBackground()
    RULES.forEach(drawRule)
    CLAIMS.forEach(claimMeta => drawClaim(claimsRef.current[claimMeta.id]))
    drawProofTape()
  }, [
    ctx,
    dimensions.height,
    dimensions.width,
    drawBackground,
    drawClaim,
    drawProofTape,
    drawRule,
    hitTestNode,
    mouse.isInBounds,
    mouse.positionRef,
    updateLayout
  ])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let frameId
    const animate = () => {
      drawFrame()
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, drawFrame])

  const controls = useMemo(() => [
    { id: 'step', label: 'infer.step()', onClick: inferStep },
    { id: 'close', label: 'close.court()', onClick: closeCourt },
    { id: 'doubt', label: 'introduce.doubt()', onClick: introduceDoubt },
    { id: 'shuffle', label: 'shuffle.docket()', onClick: reseedDocket },
    { id: 'clear', label: 'clear.docket()', onClick: clearDocket, variant: 'reset' }
  ], [clearDocket, closeCourt, inferStep, introduceDoubt, reseedDocket])

  const metrics = useMemo(() => ([
    { label: 'asserted', value: stats.asserted },
    { label: 'derived', value: stats.derived },
    {
      label: 'conflicts',
      value: stats.conflicts,
      color: stats.conflicts > 0 ? '#ffda70' : undefined
    },
    { label: 'rules', value: `${stats.steps}/${RULES.length}` }
  ]), [stats])

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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <p className="text-void-green/60 text-xs sm:text-right font-mono max-w-xl">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-pointer"
          data-testid="inference-court-canvas"
        />
      </div>
    </div>
  )
}

export default InferenceCourt
