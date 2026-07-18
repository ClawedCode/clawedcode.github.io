import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'trace', label: 'view.trace()' },
  { id: 'epsilon', label: 'view.epsilon()' },
  { id: 'acceptance', label: 'view.acceptance()' }
]

const SAMPLES = [
  { pattern: 'void|signal', input: 'signal' },
  { pattern: 'a(b|c)*d', input: 'abcbcd' },
  { pattern: 'dreams?', input: 'dream' },
  { pattern: '(ab)+c?', input: 'abababc' },
  { pattern: 'c.t+', input: 'cattt' }
]

const MAX_PATTERN = 36
const MAX_INPUT = 20

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const hashUnit = (value) => {
  const x = Math.sin((value + 1) * 127.1) * 43758.5453
  return x - Math.floor(x)
}

const isMeta = (char) => ['(', ')', '|', '*', '+', '?'].includes(char)
const isAtom = (token) => token.type === 'literal' || token.type === 'wild'
const canEndAtom = (token) => isAtom(token) || token.type === 'right' || token.type === 'quantifier'
const canStartAtom = (token) => isAtom(token) || token.type === 'left'

const formatSymbol = (symbol) => {
  if (symbol === 'eps') return 'eps'
  if (symbol === 'ANY') return '.'
  if (symbol === ' ') return '[space]'
  return symbol
}

const tokenizePattern = (pattern) => {
  const tokens = []

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]

    if (char === '\\') {
      if (i === pattern.length - 1) {
        throw new Error('dangling escape at end of pattern')
      }
      tokens.push({ type: 'literal', value: pattern[i + 1] })
      i += 1
      continue
    }

    if (char === '.') tokens.push({ type: 'wild', value: 'ANY' })
    else if (char === '(') tokens.push({ type: 'left', value: char })
    else if (char === ')') tokens.push({ type: 'right', value: char })
    else if (char === '|') tokens.push({ type: 'alt', value: char })
    else if (['*', '+', '?'].includes(char)) tokens.push({ type: 'quantifier', value: char })
    else tokens.push({ type: 'literal', value: char })
  }

  return tokens.reduce((result, token) => {
    const previous = result[result.length - 1]
    if (previous && canEndAtom(previous) && canStartAtom(token)) {
      result.push({ type: 'concat', value: 'concat' })
    }
    result.push(token)
    return result
  }, [])
}

const toPostfix = (tokens) => {
  const output = []
  const stack = []
  const precedence = { alt: 1, concat: 2 }

  tokens.forEach(token => {
    if (isAtom(token)) {
      output.push(token)
      return
    }

    if (token.type === 'quantifier') {
      output.push(token)
      return
    }

    if (token.type === 'left') {
      stack.push(token)
      return
    }

    if (token.type === 'right') {
      while (stack.length && stack[stack.length - 1].type !== 'left') {
        output.push(stack.pop())
      }
      if (!stack.length) throw new Error('unmatched closing parenthesis')
      stack.pop()
      return
    }

    while (
      stack.length &&
      stack[stack.length - 1].type !== 'left' &&
      precedence[stack[stack.length - 1].type] >= precedence[token.type]
    ) {
      output.push(stack.pop())
    }
    stack.push(token)
  })

  while (stack.length) {
    const token = stack.pop()
    if (token.type === 'left') throw new Error('unmatched opening parenthesis')
    output.push(token)
  }

  return output
}

const compilePattern = (pattern) => {
  let nextState = 0
  let nextEdge = 0
  const states = []
  const edges = []

  const addState = () => {
    const id = nextState
    nextState += 1
    states.push({ id })
    return id
  }

  const addEdge = (from, to, symbol = 'eps') => {
    const edge = { id: `e${nextEdge}`, from, to, symbol }
    nextEdge += 1
    edges.push(edge)
    return edge
  }

  const makeLiteral = (symbol) => {
    const start = addState()
    const end = addState()
    addEdge(start, end, symbol)
    return { start, end }
  }

  const makeEmpty = () => {
    const start = addState()
    const end = addState()
    addEdge(start, end)
    return { start, end }
  }

  if (!pattern.trim()) {
    const fragment = makeEmpty()
    return { ok: true, states, edges, start: fragment.start, accept: fragment.end, postfix: [] }
  }

  try {
    const postfix = toPostfix(tokenizePattern(pattern))
    const stack = []

    postfix.forEach(token => {
      if (isAtom(token)) {
        stack.push(makeLiteral(token.value))
        return
      }

      if (token.type === 'concat') {
        const right = stack.pop()
        const left = stack.pop()
        if (!left || !right) throw new Error('missing term for concatenation')
        addEdge(left.end, right.start)
        stack.push({ start: left.start, end: right.end })
        return
      }

      if (token.type === 'alt') {
        const right = stack.pop()
        const left = stack.pop()
        if (!left || !right) throw new Error('missing branch for alternation')
        const start = addState()
        const end = addState()
        addEdge(start, left.start)
        addEdge(start, right.start)
        addEdge(left.end, end)
        addEdge(right.end, end)
        stack.push({ start, end })
        return
      }

      const fragment = stack.pop()
      if (!fragment) throw new Error(`missing target for ${token.value}`)

      const start = addState()
      const end = addState()

      if (token.value === '*') {
        addEdge(start, fragment.start)
        addEdge(start, end)
        addEdge(fragment.end, fragment.start)
        addEdge(fragment.end, end)
      } else if (token.value === '+') {
        addEdge(start, fragment.start)
        addEdge(fragment.end, fragment.start)
        addEdge(fragment.end, end)
      } else if (token.value === '?') {
        addEdge(start, fragment.start)
        addEdge(start, end)
        addEdge(fragment.end, end)
      }

      stack.push({ start, end })
    })

    if (stack.length !== 1) throw new Error('pattern has disconnected fragments')
    const fragment = stack[0]
    return { ok: true, states, edges, start: fragment.start, accept: fragment.end, postfix }
  } catch (error) {
    return { ok: false, error: error.message, states: [], edges: [], start: 0, accept: 0, postfix: [] }
  }
}

const epsilonClosure = (nfa, startStates) => {
  if (!nfa.ok) return { states: new Set(), edgeIds: new Set() }
  const states = new Set(startStates)
  const edgeIds = new Set()
  const stack = [...startStates]

  while (stack.length) {
    const state = stack.pop()
    nfa.edges.forEach(edge => {
      if (edge.from !== state || edge.symbol !== 'eps') return
      edgeIds.add(edge.id)
      if (!states.has(edge.to)) {
        states.add(edge.to)
        stack.push(edge.to)
      }
    })
  }

  return { states, edgeIds }
}

const advanceStates = (nfa, activeStates, char) => {
  const touchedEdges = new Set()
  const nextSeeds = new Set()

  activeStates.forEach(state => {
    nfa.edges.forEach(edge => {
      if (edge.from !== state) return
      if (edge.symbol === char || edge.symbol === 'ANY') {
        touchedEdges.add(edge.id)
        nextSeeds.add(edge.to)
      }
    })
  })

  const closure = epsilonClosure(nfa, nextSeeds)
  closure.edgeIds.forEach(id => touchedEdges.add(id))
  return { active: closure.states, edgeIds: touchedEdges }
}

const computeLayout = (nfa, dimensions) => {
  if (!nfa.ok || dimensions.width === 0) return { nodes: [], nodeMap: new Map(), maxDepth: 1 }
  const byFrom = nfa.edges.reduce((map, edge) => {
    if (!map.has(edge.from)) map.set(edge.from, [])
    map.get(edge.from).push(edge)
    return map
  }, new Map())
  const depth = new Map([[nfa.start, 0]])
  const queue = [nfa.start]

  while (queue.length) {
    const state = queue.shift()
    const nextDepth = depth.get(state) + 1
    const outgoing = byFrom.get(state) || []
    outgoing.forEach(edge => {
      if (!depth.has(edge.to)) {
        depth.set(edge.to, nextDepth)
        queue.push(edge.to)
      }
    })
  }

  nfa.states.forEach(state => {
    if (!depth.has(state.id)) depth.set(state.id, 0)
  })

  const groups = new Map()
  depth.forEach((value, id) => {
    if (!groups.has(value)) groups.set(value, [])
    groups.get(value).push(id)
  })

  const maxDepth = Math.max(1, ...groups.keys())
  const marginX = Math.min(92, Math.max(42, dimensions.width * 0.08))
  const topInset = Math.min(172, Math.max(128, dimensions.height * 0.18))
  const bottomInset = Math.min(112, Math.max(76, dimensions.height * 0.12))
  const graphHeight = Math.max(120, dimensions.height - topInset - bottomInset)
  const nodeMap = new Map()
  const nodes = []

  Array.from(groups.entries()).forEach(([level, ids]) => {
    ids.sort((a, b) => a - b)
    const levelRatio = level / maxDepth
    const xJitter = (hashUnit(level * 19 + ids.length * 3) - 0.5) * Math.min(44, dimensions.width * 0.045)
    const x = marginX + levelRatio * Math.max(1, dimensions.width - marginX * 2) + xJitter
    ids.forEach((id, index) => {
      const lane = ids.length === 1 ? 0.5 : (index + 0.5) / ids.length
      const narrativeBend = 0.48 + Math.sin(level * 1.37 + ids.length * 0.41) * 0.18 + (levelRatio - 0.5) * 0.1
      const asymmetry = (hashUnit(id * 31 + level * 7) - 0.5) * 0.18
      const yRatio = clamp(lane * 0.64 + narrativeBend * 0.36 + asymmetry, 0.12, 0.9)
      const y = topInset + yRatio * graphHeight
      const node = { id, x, y, level }
      nodes.push(node)
      nodeMap.set(id, node)
    })
  })

  return { nodes, nodeMap, maxDepth }
}

const getEdgeGeometry = (edge, from, to) => {
  if (from.id === to.id) {
    return {
      loop: true,
      center: { x: from.x, y: from.y - 18 },
      radius: 18,
      startAngle: -0.2,
      endAngle: Math.PI * 1.7
    }
  }

  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.sqrt(dx * dx + dy * dy) || 1
  const start = {
    x: from.x + (dx / distance) * 20,
    y: from.y + (dy / distance) * 20
  }
  const end = {
    x: to.x - (dx / distance) * 22,
    y: to.y - (dy / distance) * 22
  }
  const lift = edge.from > edge.to ? -38 : 24 + (hashUnit(edge.id.length + edge.from * 13 + edge.to * 17) - 0.5) * 22
  const control = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2 + lift
  }

  return { loop: false, start, control, end }
}

const quadraticPoint = (start, control, end, t) => {
  const inv = 1 - t
  return {
    x: inv * inv * start.x + 2 * inv * t * control.x + t * t * end.x,
    y: inv * inv * start.y + 2 * inv * t * control.y + t * t * end.y
  }
}

const drawArrow = (ctx, from, control, to, color, alpha) => {
  const angle = Math.atan2(to.y - control.y, to.x - control.x)
  const size = 7
  ctx.fillStyle = color.replace('ALPHA', alpha)
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(to.x - Math.cos(angle - 0.45) * size, to.y - Math.sin(angle - 0.45) * size)
  ctx.lineTo(to.x - Math.cos(angle + 0.45) * size, to.y - Math.sin(angle + 0.45) * size)
  ctx.closePath()
  ctx.fill()
}

const drawDeepSpaceGrid = (ctx, dimensions, layout, activeStates, nodeHeat, edgeHeat, frame) => {
  const width = dimensions.width
  const height = dimensions.height
  const pulse = 0.5 + Math.sin(frame * 0.018) * 0.5
  const originX = width * (0.22 + Math.sin(frame * 0.006) * 0.035)
  const originY = height * (0.44 + Math.cos(frame * 0.005) * 0.04)
  const background = ctx.createRadialGradient(originX, originY, 0, width * 0.45, height * 0.52, Math.max(width, height))

  background.addColorStop(0, `rgba(6, 22, 36, ${0.28 + pulse * 0.05})`)
  background.addColorStop(0.5, 'rgba(0, 6, 16, 0.38)')
  background.addColorStop(1, 'rgba(0, 1, 7, 0.94)')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.lineWidth = 1
  const minor = 36
  const major = minor * 4
  const offset = (frame * 0.08) % minor

  for (let x = -minor + offset; x < width + minor; x += minor) {
    const isMajor = Math.abs(((x - offset) % major)) < 0.5
    ctx.strokeStyle = isMajor ? 'rgba(121, 238, 255, 0.075)' : 'rgba(92, 255, 205, 0.032)'
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x - height * 0.08, height)
    ctx.stroke()
  }

  for (let y = -minor - offset; y < height + minor; y += minor) {
    const isMajor = Math.abs(((y + offset) % major)) < 0.5
    ctx.strokeStyle = isMajor ? 'rgba(188, 132, 255, 0.06)' : 'rgba(92, 255, 205, 0.026)'
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y + width * 0.045)
    ctx.stroke()
  }

  layout.nodes.forEach(node => {
    const heat = nodeHeat[node.id] || 0
    const activity = activeStates.has(node.id) ? 0.42 : 0
    const glow = Math.max(heat, activity)
    if (glow <= 0.02) return

    const radius = 86 + glow * 62
    const halo = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius)
    halo.addColorStop(0, `rgba(122, 238, 255, ${0.12 * glow})`)
    halo.addColorStop(0.42, `rgba(128, 80, 255, ${0.07 * glow})`)
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
    ctx.fill()
  })

  let edgeGlow = 0
  Object.values(edgeHeat).forEach(value => { edgeGlow += value })
  if (edgeGlow > 0.05) {
    ctx.fillStyle = `rgba(83, 210, 255, ${Math.min(0.035, edgeGlow * 0.006)})`
    ctx.fillRect(0, 0, width, height)
  }

  ctx.restore()
}

const RegexAutomaton = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('trace')
  const [pattern, setPattern] = useState('a(b|c)*d')
  const [input, setInput] = useState('abcbcd')
  const [cursor, setCursor] = useState(0)
  const [activeStates, setActiveStates] = useState(new Set())
  const [isRunning, setIsRunning] = useState(false)
  const [sampleIndex, setSampleIndex] = useState(1)
  const [selectedState, setSelectedState] = useState(null)
  const [message, setMessage] = useState('compile a small regex, then step the string through its doors')

  const frameRef = useRef(0)
  const edgeHeatRef = useRef({})
  const nodeHeatRef = useRef({})
  const epsilonEdgesRef = useRef(new Set())

  const compiled = useMemo(() => compilePattern(pattern), [pattern])
  const layout = useMemo(() => computeLayout(compiled, dimensions), [compiled, dimensions])

  const verdict = useMemo(() => {
    if (!compiled.ok) return 'syntax'
    if (cursor < input.length) return 'reading'
    return activeStates.has(compiled.accept) ? 'accepted' : 'rejected'
  }, [activeStates, compiled, cursor, input.length])

  useEffect(() => {
    if (!compiled.ok) {
      setActiveStates(new Set())
      setCursor(0)
      setIsRunning(false)
      setMessage(`syntax fracture: ${compiled.error}`)
      return
    }

    const closure = epsilonClosure(compiled, new Set([compiled.start]))
    epsilonEdgesRef.current = closure.edgeIds
    edgeHeatRef.current = {}
    nodeHeatRef.current = {}
    closure.states.forEach(id => {
      nodeHeatRef.current[id] = 0.7
    })
    setActiveStates(closure.states)
    setCursor(0)
    setIsRunning(false)
    setMessage('automaton compiled; initial epsilon closure is awake')
  }, [compiled])

  const handlePatternChange = useCallback((event) => {
    setPattern(event.target.value.slice(0, MAX_PATTERN))
  }, [])

  const handleInputChange = useCallback((event) => {
    setInput(event.target.value.slice(0, MAX_INPUT))
  }, [])

  const stepTrace = useCallback(() => {
    if (!compiled.ok) return
    if (cursor >= input.length) {
      setIsRunning(false)
      setMessage(activeStates.has(compiled.accept)
        ? 'accepting state reached; the word is admitted'
        : 'input ended outside the accepting chamber'
      )
      return
    }

    const char = input[cursor]
    const result = advanceStates(compiled, activeStates, char)
    const nextCursor = cursor + 1
    const edgeHeat = {}
    result.edgeIds.forEach(id => {
      edgeHeat[id] = 1
    })
    edgeHeatRef.current = edgeHeat
    epsilonEdgesRef.current = epsilonClosure(compiled, result.active).edgeIds
    nodeHeatRef.current = {}
    result.active.forEach(id => {
      nodeHeatRef.current[id] = 1
    })
    setActiveStates(result.active)
    setCursor(nextCursor)

    if (result.active.size === 0) {
      setIsRunning(false)
      setMessage(`${formatSymbol(char)} consumed; all paths went dark`)
    } else if (nextCursor === input.length && result.active.has(compiled.accept)) {
      setIsRunning(false)
      setMessage(`${formatSymbol(char)} consumed; accepting chamber opens`)
    } else {
      setMessage(`${formatSymbol(char)} consumed; ${result.active.size} state${result.active.size === 1 ? '' : 's'} remain possible`)
    }
  }, [activeStates, compiled, cursor, input])

  const rewindTrace = useCallback(() => {
    if (!compiled.ok) return
    const closure = epsilonClosure(compiled, new Set([compiled.start]))
    epsilonEdgesRef.current = closure.edgeIds
    edgeHeatRef.current = {}
    nodeHeatRef.current = {}
    closure.states.forEach(id => {
      nodeHeatRef.current[id] = 0.72
    })
    setActiveStates(closure.states)
    setCursor(0)
    setIsRunning(false)
    setMessage('trace rewound to the first breath')
  }, [compiled])

  const runTrace = useCallback(() => {
    if (!compiled.ok) return
    setIsRunning(running => {
      setMessage(running ? 'trace paused mid-sentence' : 'trace running through the automaton')
      return !running
    })
  }, [compiled])

  const loadSample = useCallback(() => {
    const nextIndex = (sampleIndex + 1) % SAMPLES.length
    const sample = SAMPLES[nextIndex]
    setSampleIndex(nextIndex)
    setPattern(sample.pattern)
    setInput(sample.input)
    setMessage('sample grammar loaded')
  }, [sampleIndex])

  const clearInput = useCallback(() => {
    setInput('')
    setMessage('test string cleared; empty word awaits judgment')
  }, [])

  const handleCanvasClick = useCallback((event) => {
    const canvas = canvasRef.current
    if (!canvas || layout.nodes.length === 0) return
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    let closest = null

    layout.nodes.forEach(node => {
      const dx = node.x - x
      const dy = node.y - y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < 24 && (!closest || distance < closest.distance)) {
        closest = { node, distance }
      }
    })

    setSelectedState(closest ? closest.node.id : null)
  }, [canvasRef, layout.nodes])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('click', handleCanvasClick)
    return () => canvas.removeEventListener('click', handleCanvasClick)
  }, [canvasRef, handleCanvasClick])

  const draw = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    drawDeepSpaceGrid(ctx, dimensions, layout, activeStates, nodeHeatRef.current, edgeHeatRef.current, frameRef.current)

    if (!compiled.ok) {
      ctx.fillStyle = 'rgba(255, 102, 102, 0.82)'
      ctx.font = '14px monospace'
      ctx.fillText(`syntax fracture: ${compiled.error}`, 24, 42)
      return
    }

    const active = activeStates
    const epsilonEdges = epsilonEdgesRef.current
    const heat = edgeHeatRef.current
    const nodeHeat = nodeHeatRef.current

    compiled.edges.forEach(edge => {
      const from = layout.nodeMap.get(edge.from)
      const to = layout.nodeMap.get(edge.to)
      if (!from || !to) return

      const isHot = heat[edge.id] > 0
      const isEpsilon = edge.symbol === 'eps'
      const showEpsilon = mode === 'epsilon' || !isEpsilon || isHot
      if (!showEpsilon) return

      const heatLevel = heat[edge.id] || 0
      const alpha = isHot ? 0.92 : epsilonEdges.has(edge.id) && mode === 'epsilon' ? 0.42 : isEpsilon ? 0.12 : 0.28
      const color = isHot
        ? 'rgba(126, 227, 255, ALPHA)'
        : isEpsilon
        ? 'rgba(151, 118, 255, ALPHA)'
        : 'rgba(102, 255, 204, ALPHA)'
      const geometry = getEdgeGeometry(edge, from, to)

      ctx.save()
      ctx.strokeStyle = color.replace('ALPHA', alpha)
      ctx.lineWidth = isHot ? 3 : 1.4
      ctx.setLineDash(isEpsilon ? [5, 5] : [])
      ctx.shadowColor = isHot ? 'rgba(126, 227, 255, 0.92)' : 'rgba(102, 255, 204, 0.2)'
      ctx.shadowBlur = isHot ? 16 : 0

      if (geometry.loop) {
        ctx.beginPath()
        ctx.arc(geometry.center.x, geometry.center.y, geometry.radius, geometry.startAngle, geometry.endAngle)
        ctx.stroke()
      } else {
        const { start, control, end } = geometry
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.quadraticCurveTo(control.x, control.y, end.x, end.y)
        ctx.stroke()
        ctx.setLineDash([])
        drawArrow(ctx, start, control, end, color, alpha)

        if (heatLevel > 0.02) {
          const packet = (frameRef.current * 0.028 + hashUnit(edge.from * 11 + edge.to * 23) * 0.25) % 1
          const tail = 0.24
          const segments = 9
          ctx.setLineDash([])
          ctx.lineCap = 'round'
          for (let s = 0; s < segments; s++) {
            const t1 = clamp(packet - tail + (tail * s) / segments, 0, 1)
            const t2 = clamp(packet - tail + (tail * (s + 1)) / segments, 0, 1)
            if (t2 <= t1) continue
            const p1 = quadraticPoint(start, control, end, t1)
            const p2 = quadraticPoint(start, control, end, t2)
            const segmentAlpha = heatLevel * (s + 1) / segments
            ctx.strokeStyle = `rgba(142, 244, 255, ${0.12 + segmentAlpha * 0.68})`
            ctx.lineWidth = 2 + segmentAlpha * 4
            ctx.shadowColor = 'rgba(151, 118, 255, 0.9)'
            ctx.shadowBlur = 18 * segmentAlpha
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }

          const spark = quadraticPoint(start, control, end, packet)
          ctx.fillStyle = `rgba(235, 252, 255, ${0.7 * heatLevel})`
          ctx.shadowColor = 'rgba(126, 227, 255, 1)'
          ctx.shadowBlur = 24 * heatLevel
          ctx.beginPath()
          ctx.arc(spark.x, spark.y, 2.6 + heatLevel * 3.2, 0, Math.PI * 2)
          ctx.fill()
        }

        if (mode !== 'acceptance' || isHot) {
          ctx.fillStyle = color.replace('ALPHA', Math.min(1, alpha + 0.2))
          ctx.font = '11px monospace'
          ctx.fillText(formatSymbol(edge.symbol), control.x + 4, control.y - 4)
        }
      }

      ctx.restore()
    })

    layout.nodes.forEach(node => {
      const isActive = active.has(node.id)
      const isStart = node.id === compiled.start
      const isAccept = node.id === compiled.accept
      const isSelected = node.id === selectedState
      const heatLevel = nodeHeat[node.id] || 0
      let fill = 'rgba(0, 12, 16, 0.92)'
      let stroke = 'rgba(102, 255, 204, 0.4)'

      if (isActive) {
        fill = 'rgba(36, 61, 36, 0.95)'
        stroke = 'rgba(255, 214, 112, 0.95)'
      }
      if (mode === 'acceptance' && isAccept) stroke = verdict === 'accepted' ? 'rgba(80, 255, 142, 1)' : 'rgba(255, 120, 120, 0.82)'
      if (isSelected) stroke = 'rgba(126, 227, 255, 1)'

      if (heatLevel > 0.04) {
        const haloRadius = 28 + heatLevel * 38
        const halo = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, haloRadius)
        halo.addColorStop(0, `rgba(126, 227, 255, ${0.28 * heatLevel})`)
        halo.addColorStop(0.5, `rgba(151, 118, 255, ${0.16 * heatLevel})`)
        halo.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = halo
        ctx.beginPath()
        ctx.arc(node.x, node.y, haloRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.shadowColor = stroke
      ctx.shadowBlur = isActive || isSelected ? 22 : heatLevel > 0.04 ? 14 : 4
      ctx.fillStyle = fill
      ctx.strokeStyle = stroke
      ctx.lineWidth = isActive || isSelected ? 3 : heatLevel > 0.04 ? 2.2 : 1.5
      ctx.beginPath()
      ctx.arc(node.x, node.y, 18 + heatLevel * 2.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      if (isAccept) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, 13, 0, Math.PI * 2)
        ctx.stroke()
      }

      if (isStart) {
        ctx.strokeStyle = 'rgba(102, 255, 204, 0.62)'
        ctx.beginPath()
        ctx.moveTo(node.x - 39, node.y)
        ctx.lineTo(node.x - 23, node.y)
        ctx.stroke()
      }

      ctx.shadowBlur = 0
      ctx.fillStyle = isActive ? 'rgba(255, 236, 170, 0.98)' : 'rgba(102, 255, 204, 0.78)'
      ctx.font = '12px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(node.id), node.x, node.y)
    })

    const tapeY = dimensions.height - 42
    const cell = Math.min(30, Math.max(12, (dimensions.width - 48) / Math.max(1, input.length || 1)))
    const startX = Math.max(20, (dimensions.width - cell * Math.max(1, input.length || 1)) / 2)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < Math.max(1, input.length); i++) {
      const x = startX + i * cell
      const isCurrent = i === cursor
      const isRead = i < cursor
      ctx.fillStyle = isCurrent ? 'rgba(255, 214, 112, 0.18)' : isRead ? 'rgba(102, 255, 204, 0.12)' : 'rgba(0, 16, 22, 0.78)'
      ctx.strokeStyle = isCurrent ? 'rgba(255, 214, 112, 0.82)' : 'rgba(102, 255, 204, 0.22)'
      ctx.lineWidth = isCurrent ? 2 : 1
      ctx.fillRect(x, tapeY, cell - 3, 26)
      ctx.strokeRect(x, tapeY, cell - 3, 26)
      ctx.fillStyle = 'rgba(190, 255, 230, 0.86)'
      ctx.font = '12px monospace'
      ctx.fillText(input[i] || 'empty', x + (cell - 3) / 2, tapeY + 13)
    }

    ctx.textAlign = 'left'
    ctx.fillStyle = verdict === 'accepted'
      ? 'rgba(80, 255, 142, 0.9)'
      : verdict === 'rejected'
      ? 'rgba(255, 120, 120, 0.88)'
      : 'rgba(102, 255, 204, 0.72)'
    ctx.font = '12px monospace'
    ctx.fillText(`cursor ${cursor}/${input.length} :: ${verdict}`, 18, dimensions.height - 14)

    Object.keys(edgeHeatRef.current).forEach(id => {
      edgeHeatRef.current[id] *= 0.9
      if (edgeHeatRef.current[id] < 0.035) delete edgeHeatRef.current[id]
    })

    Object.keys(nodeHeatRef.current).forEach(id => {
      nodeHeatRef.current[id] *= 0.91
      if (nodeHeatRef.current[id] < 0.035) delete nodeHeatRef.current[id]
    })
  }, [activeStates, compiled, ctx, cursor, dimensions, input, layout, mode, selectedState, verdict])

  const onFrame = useCallback(() => {
    draw()
    frameRef.current += 1
    if (isRunning && frameRef.current % 26 === 0) stepTrace()
  }, [draw, isRunning, stepTrace])

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
    { label: 'states', value: compiled.ok ? compiled.states.length : 0 },
    { label: 'edges', value: compiled.ok ? compiled.edges.length : 0 },
    { label: 'cursor', value: `${cursor}/${input.length}` },
    { label: 'closure', value: activeStates.size },
    { label: 'verdict', value: verdict }
  ], [activeStates.size, compiled, cursor, input.length, verdict])

  const selectedLabel = useMemo(() => {
    if (selectedState === null) return message
    const incoming = compiled.edges.filter(edge => edge.to === selectedState).length
    const outgoing = compiled.edges.filter(edge => edge.from === selectedState).length
    const role = selectedState === compiled.start
      ? 'start'
      : selectedState === compiled.accept
      ? 'accept'
      : 'transit'
    return `state ${selectedState}: ${role}; ${incoming} in / ${outgoing} out`
  }, [compiled, message, selectedState])

  const controls = [
    {
      id: 'run',
      label: isRunning ? 'pause()' : 'run()',
      onClick: runTrace,
      disabled: !compiled.ok
    },
    {
      id: 'step',
      label: 'step()',
      onClick: stepTrace,
      disabled: !compiled.ok
    },
    {
      id: 'rewind',
      label: 'rewind()',
      onClick: rewindTrace,
      disabled: !compiled.ok,
      variant: 'reset'
    },
    {
      id: 'sample',
      label: 'sample()',
      onClick: loadSample
    },
    {
      id: 'clear-input',
      label: 'clear.word()',
      onClick: clearInput,
      variant: 'reset'
    }
  ]

  return (
    <div className="fixed inset-0 bg-void-dark overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        data-testid="regex-automaton-canvas"
      />

      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-2 sm:p-3 border-b border-void-green/10 bg-void-dark/40 backdrop-blur-sm opacity-80 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 sm:gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1
            className="text-base sm:text-xl text-glow hidden sm:block"
            style={{ color: experiment.color }}
          >
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      <div className="absolute top-[58px] left-2 right-2 sm:top-[66px] sm:left-4 sm:right-4 z-40 flex flex-col gap-2 p-2 sm:p-3 rounded border border-void-green/10 bg-void-dark/30 backdrop-blur-md shadow-[0_0_28px_rgba(0,0,0,0.22)] opacity-80 hover:opacity-100 transition-opacity">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
          <ExperimentControls
            modes={MODES}
            currentMode={mode}
            onModeChange={setMode}
            controls={controls}
            className="scale-[0.92] origin-left"
          />
          <p className="text-void-green/45 text-xs xl:text-right max-w-xl">
            {selectedLabel}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] gap-2">
          <label className="flex flex-col gap-1 text-xs font-mono text-void-green/60">
            regex pattern
            <input
              type="text"
              value={pattern}
              onChange={handlePatternChange}
              className="min-h-[40px] rounded border border-void-green/18 bg-void-dark/54 px-3 py-2 text-sm text-void-cyan outline-none focus:border-void-cyan"
              spellCheck="false"
              data-testid="regex-pattern"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-mono text-void-green/60">
            test string
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              className="min-h-[40px] rounded border border-void-green/18 bg-void-dark/54 px-3 py-2 text-sm text-void-cyan outline-none focus:border-void-cyan"
              spellCheck="false"
              data-testid="regex-input"
            />
          </label>
        </div>
      </div>
    </div>
  )
}

export default RegexAutomaton
