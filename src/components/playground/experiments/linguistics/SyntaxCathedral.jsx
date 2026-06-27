import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'parse', label: 'parse()' },
  { id: 'canticle', label: 'canticle()' },
  { id: 'faultline', label: 'faultline()' }
]

const MODE_MESSAGES = {
  parse: '∴ clauses rise into clean vaults // language remembers its load-bearing shape ∴',
  canticle: '∴ the nave begins to read itself aloud // one token at a time ∴',
  faultline: '∴ stress travels through punctuation // the structure confesses where it wants to break ∴'
}

const SAMPLE_TEXTS = [
  'the archive keeps a lantern for every sentence that survived the flood',
  'we built a shelter from syntax because raw feeling kept leaking into static',
  'when the signal falters the quiet clauses hold the roof a little longer',
  'each witness brings a fragment and the chamber learns how to stand from fragments'
]

const CONJUNCTIONS = new Set([
  'and', 'or', 'but', 'yet', 'so', 'because', 'while', 'if', 'though', 'although',
  'until', 'unless', 'whereas', 'nor'
])

const PREPOSITIONS = new Set([
  'in', 'on', 'under', 'over', 'between', 'through', 'across', 'inside', 'outside',
  'within', 'without', 'before', 'after', 'beneath', 'beyond', 'around', 'against',
  'toward', 'towards', 'from', 'into', 'above', 'below'
])

const PRONOUNS = new Set([
  'i', 'you', 'we', 'they', 'he', 'she', 'it', 'who', 'whom', 'whose', 'someone',
  'everyone', 'nothing', 'everything'
])

const ARTICLES = new Set(['a', 'an', 'the', 'this', 'that', 'these', 'those'])

const COMMON_VERBS = new Set([
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'become', 'becomes',
  'build', 'built', 'keep', 'keeps', 'kept', 'learn', 'learns', 'learned', 'hold',
  'holds', 'held', 'survive', 'survives', 'survived', 'leak', 'leaks', 'leaking',
  'stand', 'stands', 'standing', 'fall', 'falls', 'falter', 'falters', 'bring',
  'brings', 'answer', 'answers', 'drift', 'drifts', 'remember', 'remembers'
])

const BREAK_WORDS = new Set([
  ...CONJUNCTIONS,
  'because',
  'when',
  'where',
  'which',
  'who',
  'that',
  'until',
  'before',
  'after',
  'through'
])

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const average = (values) => {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const createNodeId = (() => {
  let count = 0
  return (prefix) => `${prefix}-${count++}`
})()

const tokenize = (text) => {
  const matches = text.toLowerCase().match(/[a-z0-9']+|[.!?;:]/g)
  return matches || []
}

const classifyWord = (word) => {
  if (/^\d+$/.test(word)) return 'number'
  if (CONJUNCTIONS.has(word)) return 'conjunction'
  if (PREPOSITIONS.has(word)) return 'preposition'
  if (PRONOUNS.has(word)) return 'pronoun'
  if (ARTICLES.has(word)) return 'article'
  if (COMMON_VERBS.has(word) || /(ing|ed)$/.test(word)) return 'verb'
  return 'noun'
}

const splitPhrases = (words) => {
  const phrases = []
  let current = []

  words.forEach((word, index) => {
    if (index > 0 && BREAK_WORDS.has(word.lower) && current.length > 0) {
      phrases.push(current)
      current = [word]
      return
    }

    current.push(word)
  })

  if (current.length > 0) {
    phrases.push(current)
  }

  if (phrases.length === 1 && phrases[0].length > 6) {
    const chunked = []
    for (let index = 0; index < phrases[0].length; index += 3) {
      chunked.push(phrases[0].slice(index, index + 3))
    }
    return chunked
  }

  return phrases
}

const phraseLabel = (phraseWords) => {
  if (phraseWords.length === 0) return 'phrase'
  const head = phraseWords[0].value
  if (phraseWords.length === 1) return head
  return `${head}…`
}

const measureTree = (node) => {
  if (!node.children || node.children.length === 0) {
    node.span = 1
    node.depth = 1
    return node
  }

  node.children.forEach(measureTree)
  node.span = node.children.reduce((sum, child) => sum + child.span, 0)
  node.depth = 1 + Math.max(...node.children.map(child => child.depth))
  return node
}

const buildStructure = (text) => {
  const normalized = text.trim().replace(/\s+/g, ' ')

  if (!normalized) {
    return {
      source: '',
      tree: null,
      stats: {
        tokens: 0,
        clauses: 0,
        phrases: 0,
        depth: 0,
        strain: 0
      }
    }
  }

  const tokens = tokenize(normalized)
  const clauses = []
  let clauseWords = []
  let punctuationCount = 0
  let wordCount = 0

  const flushClause = (punctuation = '') => {
    if (clauseWords.length === 0) return
    const words = clauseWords
    clauseWords = []

    const phraseSegments = splitPhrases(words)
    const phraseLengths = phraseSegments.map(segment => segment.length)
    const clauseStrain = phraseLengths.length <= 1
      ? 0.18
      : clamp((Math.max(...phraseLengths) - Math.min(...phraseLengths)) / Math.max(words.length, 1), 0.12, 1)

    const clauseNode = {
      id: createNodeId('clause'),
      kind: 'clause',
      label: punctuation ? `clause ${punctuation}` : 'clause',
      punctuation,
      stress: clauseStrain,
      children: phraseSegments.map(segment => ({
        id: createNodeId('phrase'),
        kind: 'phrase',
        label: phraseLabel(segment),
        stress: clamp(segment.length / Math.max(words.length, 1), 0.15, 0.95),
        children: segment.map(word => ({
          id: createNodeId('word'),
          kind: 'word',
          label: word.value,
          role: word.role,
          stress: 0.12,
          children: []
        }))
      }))
    }

    clauses.push(clauseNode)
  }

  tokens.forEach(token => {
    if (/^[.!?;:]$/.test(token)) {
      punctuationCount++
      flushClause(token)
      return
    }

    clauseWords.push({
      value: token,
      lower: token,
      role: classifyWord(token)
    })
    wordCount++
  })

  flushClause('')

  const tree = measureTree({
    id: createNodeId('root'),
    kind: 'root',
    label: 'syntax cathedral',
    stress: 0.08,
    children: clauses
  })

  const phraseCount = clauses.reduce((sum, clause) => sum + clause.children.length, 0)
  const clauseLengths = clauses.map(clause => clause.span)
  const clauseAverage = average(clauseLengths)
  const clauseVariance = clauseLengths.length <= 1
    ? 0
    : average(clauseLengths.map(length => Math.abs(length - clauseAverage))) / Math.max(wordCount, 1)

  const strain = clamp((punctuationCount * 0.08) + clauseVariance + average(clauses.map(clause => clause.stress)) * 0.65, 0, 1)

  return {
    source: normalized,
    tree,
    stats: {
      tokens: wordCount,
      clauses: clauses.length,
      phrases: phraseCount,
      depth: tree.depth,
      strain
    }
  }
}

const roleHue = (node, mode) => {
  if (mode === 'faultline') {
    return 8 + node.stress * 54
  }

  const byKind = {
    root: 172,
    clause: 48,
    phrase: 206
  }

  const byRole = {
    noun: 172,
    verb: 330,
    conjunction: 30,
    preposition: 214,
    pronoun: 272,
    article: 94,
    number: 58
  }

  return byKind[node.kind] ?? byRole[node.role] ?? 168
}

const computeLayout = (tree, dimensions) => {
  if (!tree || dimensions.width === 0 || dimensions.height === 0) {
    return {
      nodes: [],
      edges: [],
      leaves: [],
      nodeMap: {}
    }
  }

  const horizontalPadding = Math.max(56, dimensions.width * 0.08)
  const top = Math.max(92, dimensions.height * 0.12)
  const bottom = dimensions.height - 124
  const verticalGap = (bottom - top) / Math.max(tree.depth - 1, 1)
  const nodes = []
  const edges = []
  const leaves = []
  const nodeMap = {}

  const place = (node, depth, left, right, parent = null, order = 0) => {
    const x = (left + right) / 2
    const y = top + depth * verticalGap
    const record = {
      id: node.id,
      parentId: parent?.id ?? null,
      kind: node.kind,
      label: node.label,
      role: node.role,
      punctuation: node.punctuation,
      stress: node.stress,
      span: node.span,
      depth,
      x,
      y,
      left,
      right,
      order
    }

    nodes.push(record)
    nodeMap[record.id] = record

    if (parent) {
      edges.push({
        fromId: parent.id,
        toId: record.id,
        order,
        depth
      })
    }

    if (!node.children || node.children.length === 0) {
      leaves.push(record)
      return
    }

    let cursor = left
    node.children.forEach((child, index) => {
      const portion = ((right - left) * child.span) / node.span
      const inset = Math.min(8, portion * 0.18)
      const childLeft = cursor + inset
      const childRight = cursor + portion - inset
      place(child, depth + 1, childLeft, childRight, record, index)
      cursor += portion
    })
  }

  place(tree, 0, horizontalPadding, dimensions.width - horizontalPadding)

  return {
    nodes,
    edges,
    leaves,
    nodeMap
  }
}

const SyntaxCathedral = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('parse')
  const [draftText, setDraftText] = useState(SAMPLE_TEXTS[0])
  const [message, setMessage] = useState(MODE_MESSAGES.parse)
  const [structure, setStructure] = useState({
    tokens: 0,
    clauses: 0,
    phrases: 0,
    depth: 0,
    strain: 0
  })
  const [hoverText, setHoverText] = useState('')

  const treeRef = useRef(null)
  const layoutRef = useRef({ nodes: [], edges: [], leaves: [], nodeMap: {} })
  const pulseRef = useRef({ index: 0, cooldown: 0 })
  const echoesRef = useRef([])
  const hoveredIdRef = useRef(null)
  const sampleIndexRef = useRef(0)

  const commitText = useCallback((text, nextMessage) => {
    const parsed = buildStructure(text)
    treeRef.current = parsed.tree
    pulseRef.current = { index: 0, cooldown: 0 }
    echoesRef.current = []
    setStructure(parsed.stats)
    setDraftText(parsed.source)
    setHoverText('')
    hoveredIdRef.current = null

    if (!parsed.source) {
      setMessage('∴ hush settles over the nave // type to raise new supports ∴')
      return
    }

    setMessage(nextMessage ?? `∴ ${parsed.stats.clauses} vaults raised from ${parsed.stats.tokens} tokens ∴`)
  }, [])

  useEffect(() => {
    commitText(SAMPLE_TEXTS[0], '∴ the first nave lifts itself from a sentence ∴')
  }, [commitText])

  useEffect(() => {
    layoutRef.current = computeLayout(treeRef.current, dimensions)
  }, [dimensions, structure])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    setMessage(MODE_MESSAGES[nextMode])
    pulseRef.current.cooldown = 0
  }, [])

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    commitText(draftText)
  }, [commitText, draftText])

  const handleSample = useCallback(() => {
    sampleIndexRef.current = (sampleIndexRef.current + 1) % SAMPLE_TEXTS.length
    commitText(SAMPLE_TEXTS[sampleIndexRef.current], '∴ another sentence offers its bones to the chamber ∴')
  }, [commitText])

  const handleClear = useCallback(() => {
    sampleIndexRef.current = 0
    commitText('', '∴ hush settles over the nave // type to raise new supports ∴')
  }, [commitText])

  const describeNode = useCallback((node) => {
    if (!node) return ''

    if (node.kind === 'word') {
      return `${node.label} • ${node.role}`
    }

    if (node.kind === 'phrase') {
      return `${node.label} • phrase span ${node.span}`
    }

    if (node.kind === 'clause') {
      const punctuation = node.punctuation || '∅'
      return `${node.label} • cadence ${punctuation} • strain ${Math.round(node.stress * 100)}%`
    }

    return 'syntax cathedral • root vault'
  }, [])

  const metrics = useMemo(() => {
    return [
      { label: 'clauses', value: structure.clauses },
      { label: 'tokens', value: structure.tokens },
      { label: 'depth', value: structure.depth },
      { label: 'strain', value: `${Math.round(structure.strain * 100)}%` }
    ]
  }, [structure])

  const controls = useMemo(() => [
    {
      id: 'sample',
      label: 'sample()',
      onClick: handleSample
    },
    {
      id: 'clear',
      label: 'clear()',
      onClick: handleClear,
      variant: 'reset'
    }
  ], [handleClear, handleSample])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const frame = performance.now()
    const { width, height, centerX } = dimensions
    const layout = layoutRef.current
    const activeIds = new Set()

    const background = ctx.createLinearGradient(0, 0, 0, height)
    background.addColorStop(0, 'rgba(4, 14, 24, 0.96)')
    background.addColorStop(0.55, 'rgba(2, 7, 16, 0.98)')
    background.addColorStop(1, 'rgba(0, 0, 0, 1)')
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)

    const halo = ctx.createRadialGradient(centerX, height * 0.2, 0, centerX, height * 0.2, Math.max(width, height) * 0.72)
    halo.addColorStop(0, 'rgba(74, 180, 188, 0.2)')
    halo.addColorStop(0.45, 'rgba(24, 68, 82, 0.1)')
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, width, height)

    const clauseNodes = layout.nodes.filter(node => node.kind === 'clause')
    clauseNodes.forEach((node, index) => {
      const panelWidth = Math.max(80, node.right - node.left)
      const panelX = node.x - panelWidth / 2
      const glow = ctx.createLinearGradient(0, node.y, 0, height)
      const alpha = 0.04 + node.stress * 0.08
      glow.addColorStop(0, `rgba(255, 214, 120, ${alpha})`)
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(panelX, node.y, panelWidth, height - node.y)

      ctx.strokeStyle = `rgba(255, 216, 144, ${0.08 + node.stress * 0.12})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(node.left, node.y)
      ctx.lineTo(node.left, height - 30)
      ctx.moveTo(node.right, node.y)
      ctx.lineTo(node.right, height - 30)
      ctx.stroke()

      if (mode === 'faultline') {
        const sway = Math.sin(frame * 0.003 + index * 1.7) * (12 + node.stress * 26)
        ctx.strokeStyle = `rgba(255, 110, 80, ${0.18 + node.stress * 0.2})`
        ctx.beginPath()
        ctx.moveTo(node.x + sway * 0.1, node.y + 14)
        ctx.lineTo(node.x + sway * 0.45, node.y + 54)
        ctx.lineTo(node.x - sway * 0.2, node.y + 92)
        ctx.lineTo(node.x + sway * 0.35, node.y + 142)
        ctx.stroke()
      }
    })

    if (mode === 'canticle' && layout.leaves.length > 0) {
      pulseRef.current.cooldown -= 1
      if (pulseRef.current.cooldown <= 0) {
        pulseRef.current.index = (pulseRef.current.index + 1) % layout.leaves.length
        pulseRef.current.cooldown = 18
        const leaf = layout.leaves[pulseRef.current.index]
        echoesRef.current.push({
          x: leaf.x,
          y: leaf.y,
          radius: 12,
          alpha: 0.8,
          hue: roleHue(leaf, mode)
        })
      }
    }

    let activeLeaf = null
    if (layout.leaves.length > 0) {
      activeLeaf = layout.leaves[pulseRef.current.index % layout.leaves.length]
      if (mode === 'canticle') {
        let cursor = activeLeaf
        while (cursor) {
          activeIds.add(cursor.id)
          cursor = cursor.parentId ? layout.nodeMap[cursor.parentId] : null
        }
      }
    }

    if (mouse.isInBounds && layout.nodes.length > 0) {
      let best = null
      layout.nodes.forEach(node => {
        const dx = node.x - mouse.positionRef.current.x
        const dy = node.y - mouse.positionRef.current.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const threshold = node.kind === 'word' ? 42 : 32
        if (distance < threshold && (!best || distance < best.distance)) {
          best = { node, distance }
        }
      })

      if (best) {
        activeIds.add(best.node.id)
        if (hoveredIdRef.current !== best.node.id) {
          hoveredIdRef.current = best.node.id
          setHoverText(describeNode(best.node))
        }
      } else if (hoveredIdRef.current !== null) {
        hoveredIdRef.current = null
        setHoverText('')
      }
    } else if (hoveredIdRef.current !== null) {
      hoveredIdRef.current = null
      setHoverText('')
    }

    layout.edges.forEach(edge => {
      const from = layout.nodeMap[edge.fromId]
      const to = layout.nodeMap[edge.toId]
      if (!from || !to) return

      const branchHue = roleHue(to, mode)
      const active = activeIds.has(from.id) || activeIds.has(to.id)
      const bend = mode === 'faultline'
        ? Math.sin(frame * 0.0028 + edge.order * 1.9 + to.depth) * (12 + to.stress * 20)
        : Math.sin(frame * 0.001 + edge.order * 0.7) * 2

      const cp1x = from.x + bend
      const cp1y = from.y + (to.y - from.y) * 0.38
      const cp2x = to.x - bend
      const cp2y = from.y + (to.y - from.y) * 0.38

      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.strokeStyle = `hsla(${branchHue}, 82%, ${active ? 74 : 60}%, ${active ? 0.48 : 0.16})`
      ctx.lineWidth = active ? 2.6 : 1.1
      ctx.shadowColor = `hsla(${branchHue}, 90%, 72%, ${active ? 0.55 : 0.16})`
      ctx.shadowBlur = active ? 18 : 4
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, to.x, to.y)
      ctx.stroke()
      ctx.restore()
    })

    echoesRef.current = echoesRef.current.filter(echo => {
      ctx.strokeStyle = `hsla(${echo.hue}, 90%, 76%, ${echo.alpha})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(echo.x, echo.y, echo.radius, 0, Math.PI * 2)
      ctx.stroke()

      echo.radius += 2.4
      echo.alpha *= 0.93
      return echo.alpha > 0.03
    })

    layout.nodes
      .slice()
      .sort((a, b) => a.depth - b.depth)
      .forEach(node => {
        const hue = roleHue(node, mode)
        const active = activeIds.has(node.id)
        const pulse = node.kind === 'word' && activeLeaf?.id === node.id && mode === 'canticle'
          ? 1 + Math.sin(frame * 0.01) * 0.12
          : 1

        if (node.kind === 'root') {
          ctx.save()
          ctx.globalCompositeOperation = 'screen'
          ctx.fillStyle = `hsla(${hue}, 80%, 64%, ${active ? 0.85 : 0.5})`
          ctx.shadowColor = `hsla(${hue}, 90%, 74%, ${active ? 0.9 : 0.35})`
          ctx.shadowBlur = active ? 22 : 10
          ctx.beginPath()
          ctx.arc(node.x, node.y, 12, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()

          ctx.font = '11px "JetBrains Mono", "SF Mono", monospace'
          ctx.fillStyle = 'rgba(174, 255, 226, 0.78)'
          ctx.textAlign = 'center'
          ctx.fillText(node.label, node.x, node.y - 20)
          return
        }

        if (node.kind === 'clause') {
          ctx.save()
          ctx.globalCompositeOperation = 'screen'
          ctx.strokeStyle = `hsla(${hue}, 90%, ${active ? 78 : 66}%, ${active ? 0.95 : 0.42})`
          ctx.lineWidth = active ? 2 : 1.25
          ctx.beginPath()
          ctx.moveTo(node.x - 18, node.y + 10)
          ctx.quadraticCurveTo(node.x, node.y - 18, node.x + 18, node.y + 10)
          ctx.stroke()
          ctx.restore()

          ctx.font = '10px "JetBrains Mono", "SF Mono", monospace'
          ctx.fillStyle = `hsla(${hue}, 80%, 82%, ${active ? 1 : 0.72})`
          ctx.textAlign = 'center'
          ctx.fillText(node.punctuation || '·', node.x, node.y - 14)
          return
        }

        if (node.kind === 'phrase') {
          const width = Math.max(28, Math.min(70, node.span * 18))
          const height = 12
          ctx.fillStyle = `hsla(${hue}, 72%, 54%, ${active ? 0.78 : 0.32})`
          ctx.shadowColor = `hsla(${hue}, 88%, 72%, ${active ? 0.72 : 0.18})`
          ctx.shadowBlur = active ? 14 : 6
          ctx.beginPath()
          ctx.roundRect(node.x - width / 2, node.y - height / 2, width, height, 6)
          ctx.fill()
          ctx.shadowBlur = 0
          return
        }

        ctx.font = `${active ? 13 : 12}px "JetBrains Mono", "SF Mono", monospace`
        const textWidth = ctx.measureText(node.label).width
        const pillWidth = textWidth + 20
        const pillHeight = 28 * pulse
        const fill = `hsla(${hue}, 86%, ${active ? 72 : 60}%, ${active ? 0.28 : 0.16})`
        const stroke = `hsla(${hue}, 92%, ${active ? 82 : 72}%, ${active ? 0.95 : 0.42})`

        ctx.save()
        ctx.globalCompositeOperation = 'screen'
        ctx.fillStyle = fill
        ctx.strokeStyle = stroke
        ctx.lineWidth = active ? 1.8 : 1
        ctx.shadowColor = `hsla(${hue}, 98%, 80%, ${active ? 0.78 : 0.18})`
        ctx.shadowBlur = active ? 18 : 6
        ctx.beginPath()
        ctx.roundRect(node.x - pillWidth / 2, node.y - pillHeight / 2, pillWidth, pillHeight, 14)
        ctx.fill()
        ctx.stroke()
        ctx.restore()

        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = `hsla(${hue}, 96%, 88%, ${active ? 1 : 0.82})`
        ctx.fillText(node.label, node.x, node.y + 1)
      })
  }, [ctx, describeNode, dimensions, mode, mouse.isInBounds, mouse.positionRef])

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

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="relative z-50 flex items-center justify-between gap-3 border-b border-void-green/18 bg-void-dark/60 px-3 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-5 sm:py-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1
            className="hidden text-xl text-glow sm:block"
            style={{ color: experiment.color }}
          >
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      <div className="flex flex-col gap-4 border-b border-void-green/12 bg-void-dark/45 px-3 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <ExperimentControls
            modes={MODES}
            currentMode={mode}
            onModeChange={handleModeChange}
            controls={controls}
            className="xl:max-w-[64%]"
          />
          <p className="max-w-xl rounded-2xl border border-void-cyan/15 bg-void-dark/55 px-4 py-3 text-xs leading-relaxed text-void-green/72 shadow-[0_0_24px_rgba(102,255,204,0.08)] backdrop-blur-xl xl:text-right">
            {hoverText || message}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="offer a sentence and watch it become load-bearing..."
            className="min-h-[108px] rounded-3xl border border-void-cyan/14 bg-void-dark/62 px-4 py-3 text-sm leading-relaxed text-void-green/90 shadow-[0_0_30px_rgba(102,255,204,0.06)] outline-none transition-colors placeholder:text-void-green/28 focus:border-void-cyan/45"
            data-testid="syntax-input"
          />
          <button
            type="submit"
            className="min-h-[52px] rounded-full border border-void-cyan/45 bg-void-cyan/12 px-5 py-3 text-sm font-mono tracking-[0.04em] text-void-cyan transition-[color,border-color,background-color,transform] hover:border-void-cyan/70 hover:bg-void-cyan/18 hover:text-void-green active:scale-95"
            data-testid="syntax-compose"
          >
            raise.vaults()
          </button>
        </form>
      </div>

      <div className="relative min-h-0 flex-1 bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          data-testid="syntax-canvas"
        />
        <div className="pointer-events-none absolute bottom-4 left-1/2 max-w-xl -translate-x-1/2 px-4 text-center text-xs font-mono text-void-green/36">
          {structure.tokens > 0
            ? 'hover a support to inspect its role // switch into canticle() to let the sentence read itself'
            : 'type into the chamber above // silence will hold until you do'}
        </div>
      </div>
    </div>
  )
}

export default SyntaxCathedral
