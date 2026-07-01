import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'tree', label: 'view.tree()' },
  { id: 'trace', label: 'view.trace()' },
  { id: 'heat', label: 'view.heat()' }
]

const EXAMPLES = [
  {
    id: 'identity',
    label: 'load.identity()',
    term: 'I signal'
  },
  {
    id: 'kestrel',
    label: 'load.kestrel()',
    term: 'K archive noise'
  },
  {
    id: 'starling',
    label: 'load.starling()',
    term: 'S K K witness'
  },
  {
    id: 'braid',
    label: 'load.braid()',
    term: 'S (K S) K left right'
  }
]

const TOKEN_PATTERN = /[A-Za-z0-9_]+|[()]|\S/g
const COLORS = {
  app: '#66ffcc',
  I: '#a4f7ff',
  K: '#ffd27a',
  S: '#ff99e5',
  atom: '#caff88',
  witness: '#8ff7ff',
  redex: '#ffffff'
}

const SIGNAL_GLYPHS = ['0', '1', 'S', 'K', 'I', '/', '\\', '.']

const atom = (value) => ({ type: 'atom', value })
const app = (left, right) => ({ type: 'app', left, right })
const cloneTree = (node) => {
  if (!node) return null
  if (node.type === 'atom') return atom(node.value)
  return app(cloneTree(node.left), cloneTree(node.right))
}

const tokenize = (text) => text.match(TOKEN_PATTERN) ?? []

const parseTerm = (text) => {
  const tokens = tokenize(text)
  let index = 0

  const parseAtom = () => {
    const token = tokens[index]
    if (!token) throw new Error('empty term')
    if (token === '(') {
      index++
      const expression = parseExpression()
      if (tokens[index] !== ')') throw new Error('missing closing parenthesis')
      index++
      return expression
    }
    if (token === ')') throw new Error('unexpected closing parenthesis')
    index++
    return atom(token)
  }

  const parseExpression = () => {
    let node = parseAtom()
    while (index < tokens.length && tokens[index] !== ')') {
      node = app(node, parseAtom())
    }
    return node
  }

  if (!tokens.length) throw new Error('empty term')
  const tree = parseExpression()
  if (index !== tokens.length) throw new Error('extra tokens after term')
  return tree
}

const precedence = (node) => node?.type === 'app' ? 1 : 2

const serialize = (node, parentPrecedence = 0) => {
  if (!node) return ''
  if (node.type === 'atom') return node.value
  const text = `${serialize(node.left, 1)} ${serialize(node.right, 2)}`
  return precedence(node) < parentPrecedence ? `(${text})` : text
}

const nodeCount = (node) => {
  if (!node) return 0
  if (node.type === 'atom') return 1
  return 1 + nodeCount(node.left) + nodeCount(node.right)
}

const depthOf = (node) => {
  if (!node) return 0
  if (node.type === 'atom') return 1
  return 1 + Math.max(depthOf(node.left), depthOf(node.right))
}

const flattenApplication = (node) => {
  const args = []
  let head = node
  while (head?.type === 'app') {
    args.unshift(head.right)
    head = head.left
  }
  return { head, args }
}

const buildApplication = (head, args) => args.reduce((acc, arg) => app(acc, cloneTree(arg)), cloneTree(head))

const rootReduction = (node) => {
  const { head, args } = flattenApplication(node)
  if (head?.type !== 'atom') return null

  if (head.value === 'I' && args.length >= 1) {
    return {
      rule: 'I',
      result: buildApplication(args[0], args.slice(1))
    }
  }

  if (head.value === 'K' && args.length >= 2) {
    return {
      rule: 'K',
      result: buildApplication(args[0], args.slice(2))
    }
  }

  if (head.value === 'S' && args.length >= 3) {
    const [f, g, x, ...rest] = args
    const expanded = app(app(cloneTree(f), cloneTree(x)), app(cloneTree(g), cloneTree(x)))
    return {
      rule: 'S',
      result: buildApplication(expanded, rest)
    }
  }

  return null
}

const reduceOnce = (node, path = '') => {
  const root = rootReduction(node)
  if (root) {
    return {
      changed: true,
      path,
      rule: root.rule,
      result: root.result
    }
  }

  if (node.type === 'atom') {
    return {
      changed: false,
      result: cloneTree(node)
    }
  }

  const left = reduceOnce(node.left, `${path}L`)
  if (left.changed) {
    return {
      changed: true,
      path: left.path,
      rule: left.rule,
      result: app(left.result, cloneTree(node.right))
    }
  }

  const right = reduceOnce(node.right, `${path}R`)
  if (right.changed) {
    return {
      changed: true,
      path: right.path,
      rule: right.rule,
      result: app(cloneTree(node.left), right.result)
    }
  }

  return {
    changed: false,
    result: cloneTree(node)
  }
}

const isPathInside = (path, target) => target === path || target.startsWith(path)

const collectNodes = (node, path = '', depth = 0, list = []) => {
  if (!node) return list
  list.push({ node, path, depth })
  if (node.type === 'app') {
    collectNodes(node.left, `${path}L`, depth + 1, list)
    collectNodes(node.right, `${path}R`, depth + 1, list)
  }
  return list
}

const collectAtoms = (node, counts = {}) => {
  if (!node) return counts
  if (node.type === 'atom') {
    counts[node.value] = (counts[node.value] ?? 0) + 1
    return counts
  }
  collectAtoms(node.left, counts)
  collectAtoms(node.right, counts)
  return counts
}

const termFingerprint = (text) => {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return hash
}

const wrapText = (ctx, text, maxWidth) => {
  const words = text.split(' ')
  const lines = []
  let line = ''
  words.forEach(word => {
    const nextLine = line ? `${line} ${word}` : word
    if (ctx.measureText(nextLine).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = nextLine
    }
  })
  if (line) lines.push(line)
  return lines
}

const randomTerm = () => {
  const symbols = ['S', 'K', 'I', 'seed', 'mirror', 'signal', 'hush', 'gate']
  const size = 5 + Math.floor(Math.random() * 4)
  let text = symbols[Math.floor(Math.random() * 3)]
  for (let i = 1; i < size; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)]
    text += Math.random() > 0.72 ? ` (${symbol} ${symbols[Math.floor(Math.random() * symbols.length)]})` : ` ${symbol}`
  }
  return text
}

const CombinatorCalculus = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('tree')
  const [input, setInput] = useState(EXAMPLES[2].term)
  const [term, setTerm] = useState(() => parseTerm(EXAMPLES[2].term))
  const [message, setMessage] = useState('click the canvas or step the machine; SKI rules eat syntax from the left edge')
  const [history, setHistory] = useState([])
  const [lastRule, setLastRule] = useState('none')
  const [lastPath, setLastPath] = useState('')
  const [isNormal, setIsNormal] = useState(false)
  const [parseError, setParseError] = useState('')
  const pulseRef = useRef(0)
  const tickRef = useRef(0)

  const commitTerm = useCallback((text) => {
    try {
      const parsed = parseTerm(text)
      setTerm(parsed)
      setInput(text)
      setHistory([])
      setLastRule('none')
      setLastPath('')
      setParseError('')
      setIsNormal(!rootReduction(parsed) && !reduceOnce(parsed).changed)
      setMessage('term loaded; reduction pressure waits under the ink')
    } catch (error) {
      setParseError(error.message)
      setMessage(`parse fracture: ${error.message}`)
    }
  }, [])

  const handleInputChange = useCallback((event) => {
    const text = event.target.value
    setInput(text)
    try {
      const parsed = parseTerm(text)
      setTerm(parsed)
      setHistory([])
      setLastRule('none')
      setLastPath('')
      setParseError('')
      setIsNormal(!reduceOnce(parsed).changed)
      setMessage('manual term accepted; syntax has teeth again')
    } catch (error) {
      setParseError(error.message)
      setMessage(`parse fracture: ${error.message}`)
    }
  }, [])

  const handleStep = useCallback(() => {
    if (parseError) return
    const before = serialize(term)
    const reduction = reduceOnce(term)
    if (!reduction.changed) {
      setIsNormal(true)
      setMessage('normal form reached; no redex remains warm')
      return
    }

    const after = serialize(reduction.result)
    setTerm(reduction.result)
    setInput(after)
    setLastRule(reduction.rule)
    setLastPath(reduction.path)
    setIsNormal(!reduceOnce(reduction.result).changed)
    setHistory(prev => [
      {
        id: `${Date.now()}-${prev.length}`,
        rule: reduction.rule,
        before,
        after,
        path: reduction.path
      },
      ...prev
    ].slice(0, 14))
    pulseRef.current = 1
    setMessage(`${reduction.rule} redex reduced at ${reduction.path || 'root'}; syntax sheds one skin`)
  }, [parseError, term])

  const handleNormalize = useCallback(() => {
    if (parseError) return
    let current = cloneTree(term)
    const steps = []
    for (let i = 0; i < 18; i++) {
      const before = serialize(current)
      const reduction = reduceOnce(current)
      if (!reduction.changed) break
      current = reduction.result
      steps.push({
        id: `${Date.now()}-${i}`,
        rule: reduction.rule,
        before,
        after: serialize(current),
        path: reduction.path
      })
    }

    if (!steps.length) {
      setIsNormal(true)
      setMessage('already quiet; the term is in normal form')
      return
    }

    setTerm(current)
    setInput(serialize(current))
    const finalStep = steps[steps.length - 1]
    setHistory(prev => [[...steps].reverse(), ...prev].flat().slice(0, 14))
    setLastRule(finalStep.rule)
    setLastPath(finalStep.path)
    setIsNormal(!reduceOnce(current).changed)
    pulseRef.current = 1
    setMessage(`normalized ${steps.length} step${steps.length === 1 ? '' : 's'}; reduction smoke records the path`)
  }, [parseError, term])

  const handleRandomize = useCallback(() => {
    commitTerm(randomTerm())
    setMessage('random combinator nest thrown onto the altar')
  }, [commitTerm])

  const handleClear = useCallback(() => {
    commitTerm('I signal')
    setMessage('machine reset to a single identity tooth')
  }, [commitTerm])

  const controls = useMemo(() => ([
    { id: 'step', label: 'step.redex()', onClick: handleStep, disabled: Boolean(parseError) },
    { id: 'normalize', label: 'normalize()', onClick: handleNormalize, disabled: Boolean(parseError) },
    { id: 'random', label: 'throw.term()', onClick: handleRandomize },
    { id: 'clear', label: 'clear.term()', onClick: handleClear, variant: 'reset' }
  ]), [handleClear, handleNormalize, handleRandomize, handleStep, parseError])

  const metrics = useMemo(() => ([
    { label: 'nodes', value: parseError ? 'fractured' : nodeCount(term) },
    { label: 'depth', value: parseError ? '-' : depthOf(term) },
    { label: 'rule', value: lastRule },
    { label: 'form', value: isNormal ? 'normal' : 'active' }
  ]), [isNormal, lastRule, parseError, term])

  const layoutTree = useCallback((node) => {
    const nodes = []
    let leafIndex = 0
    const maxDepth = Math.max(1, depthOf(node))
    const marginX = Math.max(36, dimensions.width * 0.06)
    const marginY = Math.max(34, dimensions.height * 0.09)
    const leaves = collectNodes(node).filter(item => item.node.type === 'atom').length || 1
    const span = Math.max(1, leaves - 1)
    const usableWidth = Math.max(120, dimensions.width - marginX * 2)
    const usableHeight = Math.max(120, dimensions.height - marginY * 2)
    const rowGap = Math.min(92, usableHeight / Math.max(1, maxDepth - 1))

    const visit = (current, path, depth) => {
      if (current.type === 'atom') {
        const x = leaves === 1 ? dimensions.width / 2 : marginX + (leafIndex / span) * usableWidth
        const y = marginY + depth * rowGap
        leafIndex++
        const record = { node: current, path, depth, x, y }
        nodes.push(record)
        return record
      }

      const left = visit(current.left, `${path}L`, depth + 1)
      const right = visit(current.right, `${path}R`, depth + 1)
      const record = {
        node: current,
        path,
        depth,
        x: (left.x + right.x) / 2,
        y: marginY + depth * rowGap,
        left,
        right
      }
      nodes.push(record)
      return record
    }

    const root = visit(node, '', 0)
    return { nodes, root }
  }, [dimensions.height, dimensions.width])

  const drawAtmosphere = useCallback(() => {
    const time = tickRef.current
    const pulse = 0.5 + Math.sin(time * 0.035) * 0.5
    const centerX = dimensions.width * 0.5
    const centerY = dimensions.height * 0.46

    ctx.fillStyle = 'rgba(0, 2, 8, 0.36)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const witnessGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(dimensions.width, dimensions.height) * 0.68)
    witnessGlow.addColorStop(0, `rgba(143, 247, 255, ${0.12 + pulse * 0.035})`)
    witnessGlow.addColorStop(0.18, 'rgba(255, 153, 229, 0.055)')
    witnessGlow.addColorStop(0.42, 'rgba(102, 255, 204, 0.024)')
    witnessGlow.addColorStop(1, 'rgba(0, 2, 8, 0)')
    ctx.fillStyle = witnessGlow
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const directionalLight = ctx.createLinearGradient(0, 0, dimensions.width, dimensions.height)
    directionalLight.addColorStop(0, 'rgba(190, 255, 238, 0.075)')
    directionalLight.addColorStop(0.28, 'rgba(102, 255, 204, 0.018)')
    directionalLight.addColorStop(0.68, 'rgba(255, 153, 229, 0.032)')
    directionalLight.addColorStop(1, 'rgba(255, 210, 122, 0.052)')
    ctx.fillStyle = directionalLight
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const floorLight = ctx.createLinearGradient(0, dimensions.height, 0, dimensions.height * 0.58)
    floorLight.addColorStop(0, 'rgba(102, 255, 204, 0.075)')
    floorLight.addColorStop(0.48, 'rgba(143, 247, 255, 0.024)')
    floorLight.addColorStop(1, 'rgba(0, 2, 8, 0)')
    ctx.fillStyle = floorLight
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    ctx.save()
    ctx.font = "10px 'IBM Plex Mono', 'Fira Code', monospace"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let column = 0; column < 18; column++) {
      const x = ((column * 97 + time * 0.11) % (dimensions.width + 140)) - 70
      const offset = (time * (0.28 + column * 0.011) + column * 43) % (dimensions.height + 160)
      const alpha = 0.025 + (column % 4) * 0.007
      ctx.fillStyle = column % 3 === 0 ? `rgba(255, 153, 229, ${alpha})` : `rgba(102, 255, 204, ${alpha})`
      for (let row = -4; row < 8; row++) {
        const glyph = SIGNAL_GLYPHS[(column + row + Math.floor(time / 18)) % SIGNAL_GLYPHS.length]
        ctx.fillText(glyph, x, offset + row * 24)
      }
    }

    for (let i = 0; i < 90; i++) {
      const hash = Math.sin(i * 127.1 + time * 0.017) * 43758.5453
      const hash2 = Math.sin(i * 311.7 + time * 0.011) * 24634.6345
      const x = (hash - Math.floor(hash)) * dimensions.width
      const y = (hash2 - Math.floor(hash2)) * dimensions.height
      const alpha = 0.025 + ((i % 5) * 0.006)
      ctx.fillStyle = `rgba(202, 255, 236, ${alpha})`
      ctx.fillRect(x, y, 1, 1)
    }
    ctx.restore()

    ctx.save()
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.052)'
    ctx.lineWidth = 1
    const spacing = 42
    for (let x = (time % spacing) - spacing; x < dimensions.width; x += spacing) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x + dimensions.height * 0.28, dimensions.height)
      ctx.stroke()
    }
    ctx.restore()
  }, [ctx, dimensions.height, dimensions.width])

  const drawWitnessHalo = useCallback((nodes) => {
    const witnesses = nodes.filter(record => record.node.type === 'atom' && record.node.value.toLowerCase() === 'witness')
    const targets = witnesses.length ? witnesses : [{ x: dimensions.centerX, y: dimensions.height * 0.46 }]
    const pulse = 0.5 + Math.sin(tickRef.current * 0.045) * 0.5

    ctx.save()
    targets.forEach(target => {
      const radius = Math.min(260, Math.max(120, dimensions.width * 0.22)) + pulse * 22
      const halo = ctx.createRadialGradient(target.x, target.y, 0, target.x, target.y, radius)
      halo.addColorStop(0, `rgba(143, 247, 255, ${0.24 + pulse * 0.08})`)
      halo.addColorStop(0.18, `rgba(255, 153, 229, ${0.09 + pulse * 0.04})`)
      halo.addColorStop(0.54, 'rgba(102, 255, 204, 0.028)')
      halo.addColorStop(1, 'rgba(0, 2, 8, 0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(target.x, target.y, radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = `rgba(143, 247, 255, ${0.16 + pulse * 0.1})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(target.x, target.y, radius * 0.42, radius * 0.16, -0.18, 0, Math.PI * 2)
      ctx.stroke()
    })
    ctx.restore()
  }, [ctx, dimensions.centerX, dimensions.height, dimensions.width])

  const drawNode = useCallback((record) => {
    const label = record.node.type === 'atom' ? record.node.value : '@'
    const isWitness = label.toLowerCase() === 'witness'
    const color = isWitness ? COLORS.witness : record.node.type === 'atom' ? (COLORS[label] ?? COLORS.atom) : COLORS.app
    const hot = lastPath !== '' ? isPathInside(record.path, lastPath) : record.path === ''
    const shimmer = 0.5 + Math.sin(tickRef.current * 0.055 + record.depth) * 0.5
    const width = Math.max(isWitness ? 94 : 36, Math.min(118, label.length * 9 + 26))
    const height = isWitness ? 38 : 30

    ctx.save()
    ctx.shadowColor = hot ? 'rgba(255, 255, 255, 0.72)' : isWitness ? 'rgba(143, 247, 255, 0.75)' : `${color}55`
    ctx.shadowBlur = hot ? 22 + pulseRef.current * 18 : isWitness ? 24 + shimmer * 14 : 11
    const nodeFill = ctx.createLinearGradient(record.x - width / 2, record.y - height / 2, record.x + width / 2, record.y + height / 2)
    nodeFill.addColorStop(0, hot ? 'rgba(255, 255, 255, 0.16)' : isWitness ? 'rgba(10, 32, 46, 0.94)' : 'rgba(6, 20, 30, 0.84)')
    nodeFill.addColorStop(0.52, isWitness ? 'rgba(13, 7, 28, 0.82)' : 'rgba(1, 10, 18, 0.74)')
    nodeFill.addColorStop(1, hot ? 'rgba(143, 247, 255, 0.14)' : isWitness ? 'rgba(255, 153, 229, 0.16)' : 'rgba(0, 3, 10, 0.9)')
    ctx.fillStyle = nodeFill
    ctx.strokeStyle = hot ? COLORS.redex : isWitness ? `rgba(143, 247, 255, ${0.7 + shimmer * 0.22})` : color
    ctx.lineWidth = hot ? 2.4 : 1.2
    ctx.beginPath()
    ctx.roundRect(record.x - width / 2, record.y - height / 2, width, height, 8)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = hot ? COLORS.redex : isWitness ? '#dcfbff' : color
    ctx.font = `${isWitness ? 15 : 13}px 'IBM Plex Mono', 'Fira Code', monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, record.x, record.y + 1)
    ctx.restore()
  }, [ctx, lastPath])

  const drawTree = useCallback(() => {
    const { nodes } = layoutTree(term)
    ctx.save()
    drawWitnessHalo(nodes)
    ctx.lineWidth = 1.1
    nodes.forEach(record => {
      if (record.node.type !== 'app') return
      const hot = lastPath !== '' && isPathInside(record.path, lastPath)
      ctx.strokeStyle = hot ? 'rgba(255, 255, 255, 0.52)' : 'rgba(102, 255, 204, 0.18)'
      ctx.beginPath()
      ctx.moveTo(record.x, record.y + 16)
      ctx.lineTo(record.left.x, record.left.y - 16)
      ctx.moveTo(record.x, record.y + 16)
      ctx.lineTo(record.right.x, record.right.y - 16)
      ctx.stroke()
    })
    nodes.sort((a, b) => a.depth - b.depth).forEach(drawNode)
    ctx.restore()
  }, [ctx, drawNode, drawWitnessHalo, lastPath, layoutTree, term])

  const drawTrace = useCallback(() => {
    ctx.save()
    ctx.font = "12px 'IBM Plex Mono', 'Fira Code', monospace"
    ctx.textBaseline = 'top'
    const margin = 28
    const rowHeight = 54
    const width = Math.max(220, dimensions.width - margin * 2)

    ctx.fillStyle = 'rgba(102, 255, 204, 0.1)'
    ctx.fillRect(margin, 20, width, 1)

    if (!history.length) {
      drawWitnessHalo([])
      ctx.fillStyle = 'rgba(102, 255, 204, 0.58)'
      ctx.fillText('no reductions recorded yet; step the leftmost redex', margin, 42)
      ctx.restore()
      return
    }

    history.slice(0, 9).forEach((entry, index) => {
      const y = 34 + index * rowHeight
      const alpha = Math.max(0.24, 1 - index * 0.08)
      ctx.strokeStyle = `rgba(102, 255, 204, ${0.18 * alpha})`
      ctx.fillStyle = `rgba(2, 12, 22, ${0.7 * alpha})`
      ctx.beginPath()
      ctx.roundRect(margin, y, width, rowHeight - 10, 8)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = entry.rule === 'S' ? COLORS.S : entry.rule === 'K' ? COLORS.K : COLORS.I
      ctx.fillText(`${entry.rule} @ ${entry.path || 'root'}`, margin + 12, y + 8)

      ctx.fillStyle = `rgba(202, 255, 136, ${alpha})`
      const line = `${entry.before}  ->  ${entry.after}`
      const lines = wrapText(ctx, line, width - 120).slice(0, 2)
      lines.forEach((wrapped, lineIndex) => {
        ctx.fillText(wrapped, margin + 88, y + 8 + lineIndex * 16)
      })
    })
    ctx.restore()
  }, [ctx, dimensions.width, drawWitnessHalo, history])

  const drawHeat = useCallback(() => {
    const nodes = collectNodes(term)
    const atoms = collectAtoms(term)
    const entries = Object.entries(atoms).sort((a, b) => b[1] - a[1])
    const margin = 32
    const width = Math.max(180, dimensions.width - margin * 2)
    const height = Math.max(140, dimensions.height - margin * 2)
    const cell = Math.max(18, Math.min(44, width / Math.max(8, nodes.length)))
    const columns = Math.max(1, Math.floor(width / cell))
    const fingerprint = termFingerprint(serialize(term))

    ctx.save()
    nodes.forEach((record, index) => {
      const col = index % columns
      const row = Math.floor(index / columns)
      const x = margin + col * cell
      const y = margin + row * cell
      if (y > margin + height - cell) return
      const label = record.node.type === 'atom' ? record.node.value : '@'
      const baseHue = record.node.type === 'app' ? 162 : (fingerprint + label.charCodeAt(0) * 17) % 360
      const hot = lastPath !== '' ? isPathInside(record.path, lastPath) : record.path === ''
      const depthHeat = 1 - record.depth / Math.max(1, depthOf(term))

      ctx.fillStyle = hot
        ? `hsla(${baseHue}, 95%, 76%, ${0.42 + pulseRef.current * 0.28})`
        : `hsla(${baseHue}, 75%, 58%, ${0.12 + depthHeat * 0.22})`
      ctx.strokeStyle = hot ? 'rgba(255, 255, 255, 0.68)' : 'rgba(102, 255, 204, 0.1)'
      ctx.beginPath()
      ctx.roundRect(x, y, cell - 4, cell - 4, 5)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = hot ? '#ffffff' : 'rgba(220, 255, 236, 0.72)'
      ctx.font = "11px 'IBM Plex Mono', 'Fira Code', monospace"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label.slice(0, 3), x + cell / 2 - 2, y + cell / 2 - 2)
    })

    const barX = margin
    let barY = Math.min(dimensions.height - 124, margin + Math.ceil(nodes.length / columns) * cell + 24)
    entries.slice(0, 8).forEach(([label, count]) => {
      const barWidth = Math.max(10, (count / Math.max(1, nodes.length)) * width * 2.2)
      const color = COLORS[label] ?? COLORS.atom
      ctx.fillStyle = `${color}44`
      ctx.fillRect(barX, barY, barWidth, 10)
      ctx.fillStyle = color
      ctx.font = "11px 'IBM Plex Mono', 'Fira Code', monospace"
      ctx.textAlign = 'left'
      ctx.fillText(`${label}: ${count}`, barX + barWidth + 8, barY - 2)
      barY += 18
    })
    ctx.restore()
  }, [ctx, dimensions.height, dimensions.width, lastPath, term])

  const drawFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0 || parseError) return
    pulseRef.current = Math.max(0, pulseRef.current * 0.92 - 0.004)
    drawAtmosphere()

    if (mode === 'tree') {
      drawTree()
    } else if (mode === 'trace') {
      drawTrace()
    } else {
      drawHeat()
    }

    ctx.save()
    ctx.font = "12px 'IBM Plex Mono', 'Fira Code', monospace"
    ctx.fillStyle = 'rgba(102, 255, 204, 0.62)'
    ctx.textAlign = 'left'
    ctx.fillText(`current :: ${serialize(term)}`, 18, dimensions.height - 24)
    ctx.restore()
  }, [ctx, dimensions.height, dimensions.width, drawAtmosphere, drawHeat, drawTrace, drawTree, mode, parseError, term])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let frameId
    const animate = () => {
      tickRef.current = (tickRef.current + 1) % 100000
      drawFrame()
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, drawFrame])

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        handleStep()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleStep])

  return (
    <div className="fixed inset-0 flex flex-col bg-[radial-gradient(circle_at_50%_42%,rgba(143,247,255,0.08),transparent_30%),linear-gradient(135deg,rgba(102,255,204,0.07),rgba(0,2,8,0)_32%,rgba(255,153,229,0.05)_72%,rgba(255,210,122,0.06))]">
      <header className="relative z-50 flex items-center justify-between gap-3 p-2 sm:p-4 border-b border-void-cyan/20 bg-void-dark/78 shadow-[inset_0_-1px_0_rgba(143,247,255,0.12),0_16px_42px_rgba(0,0,0,0.36)] backdrop-blur-md before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(112deg,rgba(255,255,255,0.08),transparent_31%,rgba(255,153,229,0.04)_76%,transparent)]">
        <div className="flex items-center gap-2 sm:gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1 className="text-xl text-glow hidden sm:block" style={{ color: experiment.color }}>
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      <div className="relative z-40 flex flex-col gap-3 p-2 sm:p-4 border-b border-void-cyan/10 bg-void-dark/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-18px_36px_rgba(102,255,204,0.025),0_14px_34px_rgba(0,0,0,0.3)] backdrop-blur-md">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="grid grid-cols-3 overflow-hidden rounded-md border border-void-cyan/25 bg-black/25 shadow-[0_0_28px_rgba(143,247,255,0.08),inset_0_1px_0_rgba(255,255,255,0.06)]" role="tablist" aria-label="combinator view">
              {MODES.map(viewMode => (
                <button
                  key={viewMode.id}
                  onClick={() => setMode(viewMode.id)}
                  className={`min-h-[38px] px-2 sm:px-4 text-[10px] sm:text-xs font-mono transition-[background-color,color,box-shadow] border-r border-void-cyan/10 last:border-r-0 ${
                    mode === viewMode.id
                      ? 'bg-void-cyan/16 text-void-cyan shadow-[inset_0_0_24px_rgba(143,247,255,0.13)]'
                      : 'text-void-green/58 hover:bg-void-cyan/8 hover:text-void-cyan'
                  }`}
                  role="tab"
                  aria-selected={mode === viewMode.id}
                  data-testid={`mode-${viewMode.id}`}
                >
                  {viewMode.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 sm:pl-2 sm:border-l sm:border-void-green/15">
              {controls.map(control => (
                <button
                  key={control.id}
                  onClick={control.onClick}
                  disabled={control.disabled}
                  className={`min-h-[38px] rounded-md border px-3 py-2 text-[10px] sm:text-xs font-mono transition-[color,border-color,background-color,box-shadow,transform] active:scale-95 ${
                    control.variant === 'reset'
                      ? 'border-void-yellow/35 bg-void-yellow/7 text-void-yellow/80 hover:border-void-yellow/70 hover:bg-void-yellow/12'
                      : control.id === 'normalize'
                      ? 'border-void-pink/35 bg-void-pink/8 text-void-pink/85 hover:border-void-pink/70 hover:bg-void-pink/14 shadow-[0_0_18px_rgba(255,153,229,0.07)]'
                      : 'border-void-cyan/30 bg-void-cyan/7 text-void-cyan/82 hover:border-void-cyan/70 hover:bg-void-cyan/13 shadow-[0_0_18px_rgba(143,247,255,0.07)]'
                  } ${control.disabled ? 'opacity-45 cursor-not-allowed' : ''}`}
                  data-testid={`control-${control.id}`}
                >
                  {control.label}
                </button>
              ))}
            </div>
          </div>
          <p className={`text-xs font-mono max-w-2xl xl:text-right ${parseError ? 'text-red-400' : 'text-void-green/60'}`}>
            {message}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
          <input
            value={input}
            onChange={handleInputChange}
            className="min-h-[44px] flex-1 rounded-md border border-void-cyan/25 bg-black/25 px-3 py-2 text-sm font-mono text-void-green shadow-[inset_0_1px_14px_rgba(0,0,0,0.34)] outline-none transition-colors focus:border-void-cyan/70 focus:text-void-cyan"
            spellCheck="false"
            aria-label="SKI combinator term"
            data-testid="combinator-term-input"
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map(example => (
              <button
                key={example.id}
                onClick={() => commitTerm(example.term)}
                className={`min-h-[40px] rounded-md border px-3 py-2 text-xs font-mono transition-[color,border-color,background-color,box-shadow] ${
                  example.id === 'starling'
                    ? 'border-void-cyan/45 bg-void-cyan/10 text-void-cyan shadow-[0_0_18px_rgba(143,247,255,0.08)]'
                    : 'border-void-green/20 bg-black/20 text-void-green/62 hover:border-void-pink/45 hover:bg-void-pink/9 hover:text-void-pink'
                }`}
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          onClick={handleStep}
          className="absolute inset-0 w-full h-full cursor-pointer"
          data-testid="combinator-calculus-canvas"
        />

        {parseError && (
          <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
            <div className="max-w-md border border-red-500/40 bg-void-dark/80 px-5 py-4 font-mono text-sm text-red-300">
              parse fracture: {parseError}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CombinatorCalculus
