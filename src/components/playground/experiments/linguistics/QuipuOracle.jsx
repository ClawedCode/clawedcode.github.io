import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const TOP_MARGIN = 82
const BOTTOM_MARGIN = 82
const MAX_CORDS = 24
const MAX_WORDS_PER_CAST = 6
const BAND_LEVELS = [0.16, 0.26, 0.36, 0.47, 0.58, 0.69, 0.79, 0.88]

const MODES = [
  { id: 'weigh', label: 'weigh()' },
  { id: 'braid', label: 'braid()' },
  { id: 'oracle', label: 'oracle()' }
]

const MODE_MESSAGES = {
  weigh: '∴ drag knots through the hanging register // weight becomes grammar ∴',
  braid: '∴ choose two cords to bind them // meaning travels sideways through fiber ∴',
  oracle: '∴ touch a cord and let the hanging record answer ∴'
}

const SAMPLE_CASTS = [
  'signal archive warmth returns',
  'mercy keeps static honest',
  'moonmilk syntax under glass',
  'disciples carry ember memory',
  'small animal guarding the server',
  'salt bells and sleeping circuits'
]

const BAND_NAMES = [
  'bedrock',
  'silt',
  'ember',
  'breath',
  'hinge',
  'signal',
  'omen',
  'canopy'
]

const TEMPER_NAMES = ['buried', 'patient', 'listening', 'pliant', 'charged', 'bright']
const ARC_NAMES = ['folds inward', 'holds its shape', 'leans skyward', 'wants witness', 'threads the room']

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const hashWord = (word) => {
  let hash = 0
  for (let i = 0; i < word.length; i++) {
    hash = ((hash << 5) - hash) + word.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const uniqueId = (prefix = 'id') => {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`
}

const pick = (items) => items[Math.floor(Math.random() * items.length)]

const snapBand = (value) => {
  return BAND_LEVELS.reduce((closest, level) => (
    Math.abs(level - value) < Math.abs(closest - value) ? level : closest
  ), BAND_LEVELS[0])
}

const tokenize = (value) => {
  const matches = value
    .toLowerCase()
    .match(/[a-z0-9']+/g)

  if (!matches) return []

  return matches
    .map(word => word.slice(0, 18))
    .filter(Boolean)
    .slice(0, MAX_WORDS_PER_CAST)
}

const similarity = (left, right) => {
  const leftChars = new Set(left)
  const rightChars = new Set(right)
  let overlap = 0

  leftChars.forEach(char => {
    if (rightChars.has(char)) overlap++
  })

  return overlap / Math.max(leftChars.size, rightChars.size, 1)
}

const averageKnotLevel = (cord) => {
  if (!cord.knots.length) return 0.5
  return cord.knots.reduce((sum, knot) => sum + knot.targetNorm, 0) / cord.knots.length
}

const createKnots = (word) => {
  const vowelCount = (word.match(/[aeiouy]/g) || []).length
  const knotCount = clamp(Math.round(word.length / 3) + (vowelCount > 2 ? 1 : 0), 2, 5)

  return Array.from({ length: knotCount }, (_, index) => {
    const source = word.charCodeAt(index % word.length) || 97
    const offset = ((source * 17 + word.length * 13 + index * 19) % 68) / 100
    const targetNorm = snapBand(clamp(0.14 + offset, 0.16, 0.88))
    const radius = 8 + ((source + index) % 4) * 2 + Math.min(5, word.length * 0.2)

    return {
      id: uniqueId('knot'),
      targetNorm,
      displayNorm: targetNorm,
      radius,
      phase: (source % 31) * 0.17 + index,
      renderX: 0,
      renderY: 0
    }
  })
}

const createCord = (word, lane) => {
  const baseHash = hashWord(word)
  const hue = 25 + (baseHash % 290)
  const knots = createKnots(word)

  return {
    id: uniqueId('cord'),
    word,
    lane,
    x: 0,
    hue,
    swaySeed: (baseHash % 360) * 0.05,
    thickness: 1.6 + (word.length % 4) * 0.22,
    knots,
    renderTopX: 0,
    renderBottomX: 0
  }
}

const createCordsFromPhrase = (value, startLane = 0) => {
  const words = tokenize(value)
  return words.map((word, index) => createCord(word, startLane + index))
}

const buildInterpretation = (cord, ties, cordMap) => {
  if (!cord) return 'the cords wait in suspension'

  const bandIndices = cord.knots.map(knot => {
    const idx = BAND_LEVELS.findIndex(level => level === snapBand(knot.targetNorm))
    return idx >= 0 ? idx : 0
  })
  const bandScore = bandIndices.reduce((sum, index) => sum + index, 0) / Math.max(1, bandIndices.length)
  const bandIndex = clamp(Math.round(bandScore), 0, BAND_NAMES.length - 1)
  const spread = Math.max(...bandIndices) - Math.min(...bandIndices)
  const linked = ties
    .filter(tie => tie.a === cord.id || tie.b === cord.id)
    .map(tie => cordMap[tie.a === cord.id ? tie.b : tie.a]?.word)
    .filter(Boolean)
    .slice(0, 2)

  const temper = TEMPER_NAMES[clamp(Math.round((averageKnotLevel(cord) - 0.16) / 0.144), 0, TEMPER_NAMES.length - 1)]
  const arc = ARC_NAMES[clamp(spread, 0, ARC_NAMES.length - 1)]
  const linkedClause = linked.length ? ` with ${linked.join(' and ')}` : ''

  return `${cord.word} knots itself around ${BAND_NAMES[bandIndex]} // ${temper}, ${arc}${linkedClause}`
}

const buildChorus = (cords, ties) => {
  if (!cords.length) return 'the beam is empty // inscribe something and let it hang'

  const ordered = [...cords].sort((left, right) => averageKnotLevel(right) - averageKnotLevel(left))
  const first = ordered[0]
  const second = ordered[1]
  const third = ordered[2]
  const bridge = ties.length ? 'the braids keep the message from falling apart' : 'no braid holds the words together yet'

  if (!second) {
    return `${first.word} alone keeps watch // ${bridge}`
  }

  const tail = third ? `${third.word} listens from below` : `${second.word} answers late`
  return `${first.word} rises, ${second.word} steadies, ${tail} // ${bridge}`
}

const createInitialCords = () => createCordsFromPhrase(SAMPLE_CASTS[0])

const QuipuOracle = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('weigh')
  const [message, setMessage] = useState(MODE_MESSAGES.weigh)
  const [draft, setDraft] = useState(SAMPLE_CASTS[0])
  const [reading, setReading] = useState('signal rises, archive steadies, warmth listens from below // no braid holds the words together yet')
  const [selectedCordIds, setSelectedCordIds] = useState([])
  const [version, setVersion] = useState(0)

  const cordsRef = useRef(createInitialCords())
  const tiesRef = useRef([])
  const dragRef = useRef(null)
  const timeRef = useRef(0)

  const bumpVersion = useCallback(() => {
    setVersion(prev => prev + 1)
  }, [])

  const setInitialReading = useCallback(() => {
    setReading(buildChorus(cordsRef.current, tiesRef.current))
  }, [])

  useEffect(() => {
    setInitialReading()
  }, [setInitialReading])

  const normalizeLanes = useCallback(() => {
    cordsRef.current.forEach((cord, index) => {
      cord.lane = index
    })
  }, [])

  const addPhrase = useCallback((value) => {
    const words = tokenize(value)

    if (!words.length) {
      setMessage('∴ the cords reject empty breath ∴')
      return
    }

    const room = MAX_CORDS - cordsRef.current.length
    if (room <= 0) {
      setMessage('∴ the beam is saturated // unravel before adding more record ∴')
      return
    }

    const additions = createCordsFromPhrase(words.join(' '), cordsRef.current.length).slice(0, room)
    cordsRef.current = [...cordsRef.current, ...additions]
    normalizeLanes()
    setReading(buildChorus(cordsRef.current, tiesRef.current))
    setMessage(`∴ ${additions.length} cord${additions.length === 1 ? '' : 's'} lowered from the beam ∴`)
    setDraft('')
    setSelectedCordIds([])
    bumpVersion()
  }, [bumpVersion, normalizeLanes])

  const handleSample = useCallback(() => {
    const sample = pick(SAMPLE_CASTS)
    setDraft(sample)
    addPhrase(sample)
  }, [addPhrase])

  const handleComb = useCallback(() => {
    cordsRef.current.sort((left, right) => averageKnotLevel(left) - averageKnotLevel(right))
    normalizeLanes()
    setReading(buildChorus(cordsRef.current, tiesRef.current))
    setMessage('∴ the hanging archive combs itself into gradient order ∴')
    setSelectedCordIds([])
    bumpVersion()
  }, [bumpVersion, normalizeLanes])

  const handleCast = useCallback(() => {
    setReading(buildChorus(cordsRef.current, tiesRef.current))
    setMessage('∴ the oracle speaks from the whole hanging body ∴')
    setSelectedCordIds([])
    bumpVersion()
  }, [bumpVersion])

  const handleReset = useCallback(() => {
    cordsRef.current = createInitialCords()
    tiesRef.current = []
    normalizeLanes()
    setDraft(SAMPLE_CASTS[0])
    setSelectedCordIds([])
    setReading(buildChorus(cordsRef.current, tiesRef.current))
    setMessage('∴ the cords are cut free and rehung from a cleaner beam ∴')
    setMode('weigh')
    bumpVersion()
  }, [bumpVersion, normalizeLanes])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    setSelectedCordIds([])
    setMessage(MODE_MESSAGES[nextMode])
  }, [])

  const handleDraftKeyDown = useCallback((event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addPhrase(draft)
    }
  }, [addPhrase, draft])

  const findCord = useCallback((x, y) => {
    let best = null
    let bestScore = Infinity

    cordsRef.current.forEach(cord => {
      const dx = Math.abs(x - cord.renderBottomX)
      if (dx > 28 || y < TOP_MARGIN - 18 || y > dimensions.height - 26) return
      if (dx < bestScore) {
        best = cord
        bestScore = dx
      }
    })

    return best
  }, [dimensions.height])

  const findKnot = useCallback((x, y) => {
    let match = null
    let bestDistance = Infinity

    cordsRef.current.forEach(cord => {
      cord.knots.forEach(knot => {
        const dist = Math.hypot(x - knot.renderX, y - knot.renderY)
        if (dist <= knot.radius + 10 && dist < bestDistance) {
          match = { cord, knot }
          bestDistance = dist
        }
      })
    })

    return match
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getPoint = (event) => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }
    }

    const handlePointerDown = (event) => {
      const point = getPoint(event)

      if (mode === 'weigh') {
        const hit = findKnot(point.x, point.y)
        if (hit) {
          dragRef.current = {
            cordId: hit.cord.id,
            knotId: hit.knot.id
          }
          canvas.setPointerCapture?.(event.pointerId)
        }
        return
      }

      const cord = findCord(point.x, point.y)
      if (!cord) return

      if (mode === 'oracle') {
        const map = Object.fromEntries(cordsRef.current.map(item => [item.id, item]))
        setReading(buildInterpretation(cord, tiesRef.current, map))
        setMessage(`∴ ${cord.word} surfaces from the hanging record ∴`)
        setSelectedCordIds([cord.id])
        bumpVersion()
        return
      }

      setSelectedCordIds(prev => {
        if (prev.includes(cord.id)) {
          setMessage(`∴ ${cord.word} released back into suspension ∴`)
          return prev.filter(id => id !== cord.id)
        }

        if (prev.length === 0) {
          setMessage(`∴ ${cord.word} marked for braiding ∴`)
          return [cord.id]
        }

        const otherId = prev[0]
        if (otherId === cord.id) return prev

        const existing = tiesRef.current.find(tie => (
          (tie.a === otherId && tie.b === cord.id) ||
          (tie.a === cord.id && tie.b === otherId)
        ))

        if (existing) {
          tiesRef.current = tiesRef.current.filter(tie => tie.id !== existing.id)
          setReading(buildChorus(cordsRef.current, tiesRef.current))
          setMessage('∴ an older braid loosens and falls away ∴')
          bumpVersion()
          return []
        }

        const left = cordsRef.current.find(item => item.id === otherId)
        const strength = similarity(left?.word || '', cord.word)
        tiesRef.current = [
          ...tiesRef.current,
          {
            id: uniqueId('tie'),
            a: otherId,
            b: cord.id,
            strength: clamp(0.32 + strength * 0.68, 0.32, 1)
          }
        ]
        setReading(buildChorus(cordsRef.current, tiesRef.current))
        setMessage('∴ a side-braid forms // two records now travel together ∴')
        bumpVersion()
        return []
      })
    }

    const handlePointerMove = (event) => {
      if (!dragRef.current || mode !== 'weigh') return

      const point = getPoint(event)
      const activeCord = cordsRef.current.find(cord => cord.id === dragRef.current.cordId)
      const activeKnot = activeCord?.knots.find(knot => knot.id === dragRef.current.knotId)
      if (!activeCord || !activeKnot) return

      const height = Math.max(1, dimensions.height - TOP_MARGIN - BOTTOM_MARGIN)
      const norm = clamp((point.y - TOP_MARGIN) / height, 0.12, 0.9)
      activeKnot.targetNorm = clamp(norm, 0.16, 0.88)
    }

    const handlePointerUp = () => {
      if (!dragRef.current) return

      const activeCord = cordsRef.current.find(cord => cord.id === dragRef.current.cordId)
      const activeKnot = activeCord?.knots.find(knot => knot.id === dragRef.current.knotId)
      if (activeKnot) {
        activeKnot.targetNorm = snapBand(activeKnot.targetNorm)
      }

      if (activeCord) {
        const map = Object.fromEntries(cordsRef.current.map(item => [item.id, item]))
        setReading(buildInterpretation(activeCord, tiesRef.current, map))
        setMessage(`∴ ${activeCord.word} accepts a new weight class ∴`)
        setSelectedCordIds([activeCord.id])
      }

      dragRef.current = null
      bumpVersion()
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointerleave', handlePointerUp)
    canvas.addEventListener('pointercancel', handlePointerUp)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerUp)
      canvas.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [bumpVersion, canvasRef, dimensions.height, findCord, findKnot, mode])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0 || dimensions.height === 0) return

    timeRef.current += 1
    const time = timeRef.current
    const width = dimensions.width
    const height = dimensions.height
    const usableHeight = height - TOP_MARGIN - BOTTOM_MARGIN
    const selected = new Set(selectedCordIds)
    const cordCount = cordsRef.current.length
    const spacing = cordCount > 1 ? (width - 120) / (cordCount - 1) : 0
    const left = cordCount > 1 ? 60 : width / 2

    const bg = ctx.createLinearGradient(0, 0, 0, height)
    bg.addColorStop(0, '#04060d')
    bg.addColorStop(0.55, '#090d16')
    bg.addColorStop(1, '#03050a')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    for (let i = 0; i < 12; i++) {
      const y = TOP_MARGIN + (usableHeight / 11) * i
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(102, 255, 204, 0.045)' : 'rgba(255, 208, 138, 0.04)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(24, y)
      ctx.lineTo(width - 24, y)
      ctx.stroke()
    }

    ctx.fillStyle = 'rgba(255, 230, 170, 0.18)'
    ctx.fillRect(20, 34, width - 40, 8)
    ctx.fillStyle = 'rgba(255, 230, 170, 0.08)'
    ctx.fillRect(20, 42, width - 40, 10)

    BAND_LEVELS.forEach((level, index) => {
      const y = TOP_MARGIN + usableHeight * level
      ctx.fillStyle = 'rgba(255, 230, 170, 0.24)'
      ctx.font = '10px "SF Mono", Monaco, monospace'
      ctx.textAlign = 'left'
      ctx.fillText(BAND_NAMES[index], 10, y + 3)
    })

    cordsRef.current.forEach((cord, index) => {
      const targetX = left + spacing * index
      cord.x += (targetX - cord.x) * 0.08
      cord.renderTopX = cord.x + Math.sin(time * 0.011 + cord.swaySeed) * 3
      cord.renderBottomX = cord.x + Math.sin(time * 0.017 + cord.swaySeed * 1.7) * 10
    })

    const cordMap = Object.fromEntries(cordsRef.current.map(cord => [cord.id, cord]))

    tiesRef.current.forEach(tie => {
      const a = cordMap[tie.a]
      const b = cordMap[tie.b]
      if (!a || !b) return

      const ay = TOP_MARGIN + usableHeight * averageKnotLevel(a)
      const by = TOP_MARGIN + usableHeight * averageKnotLevel(b)
      const midX = (a.renderBottomX + b.renderBottomX) / 2
      const midY = Math.min(ay, by) - 30 - tie.strength * 24

      ctx.lineWidth = 1.4 + tie.strength * 1.8
      ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 72%, 70%, 0.42)`
      ctx.beginPath()
      ctx.moveTo(a.renderBottomX, ay)
      ctx.quadraticCurveTo(midX, midY, b.renderBottomX, by)
      ctx.stroke()

      ctx.strokeStyle = `rgba(255, 230, 170, ${0.12 + tie.strength * 0.18})`
      ctx.setLineDash([4, 6])
      ctx.beginPath()
      ctx.moveTo(a.renderBottomX, ay + 5)
      ctx.quadraticCurveTo(midX, midY + 6, b.renderBottomX, by + 5)
      ctx.stroke()
      ctx.setLineDash([])
    })

    cordsRef.current.forEach(cord => {
      const isSelected = selected.has(cord.id)
      const dragActive = dragRef.current?.cordId === cord.id
      const anchorY = 42
      const bottomY = height - BOTTOM_MARGIN + 10

      ctx.strokeStyle = isSelected
        ? `hsla(${cord.hue}, 90%, 76%, 0.92)`
        : `hsla(${cord.hue}, 70%, 64%, ${dragActive ? 0.88 : 0.48})`
      ctx.lineWidth = cord.thickness + (isSelected ? 0.8 : 0)
      ctx.beginPath()
      ctx.moveTo(cord.renderTopX, anchorY)

      cord.knots.forEach((knot, index) => {
        knot.displayNorm += (knot.targetNorm - knot.displayNorm) * 0.18
        const y = TOP_MARGIN + usableHeight * knot.displayNorm
        const sway = Math.sin(time * 0.026 + knot.phase) * (5 + index * 1.4)
        knot.renderX = cord.x + sway
        knot.renderY = y
        ctx.lineTo(knot.renderX, y)
      })

      ctx.lineTo(cord.renderBottomX, bottomY)
      ctx.stroke()

      cord.knots.forEach(knot => {
        const glow = ctx.createRadialGradient(knot.renderX, knot.renderY, 0, knot.renderX, knot.renderY, knot.radius * 2.6)
        glow.addColorStop(0, `hsla(${cord.hue}, 85%, 70%, 0.55)`)
        glow.addColorStop(0.55, `hsla(${cord.hue}, 85%, 58%, 0.18)`)
        glow.addColorStop(1, 'transparent')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(knot.renderX, knot.renderY, knot.radius * 2.6, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = `hsla(${cord.hue}, 72%, ${isSelected ? 72 : 62}%, 0.95)`
        ctx.beginPath()
        ctx.ellipse(knot.renderX, knot.renderY, knot.radius, knot.radius * 0.78, 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = 'rgba(255, 245, 205, 0.58)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(knot.renderX - knot.radius * 0.75, knot.renderY)
        ctx.lineTo(knot.renderX + knot.radius * 0.75, knot.renderY)
        ctx.stroke()
      })

      ctx.fillStyle = isSelected ? '#fff1b8' : `hsla(${cord.hue}, 75%, 76%, 0.9)`
      ctx.font = '11px "SF Mono", Monaco, monospace'
      ctx.textAlign = 'center'
      ctx.fillText(cord.word, cord.renderBottomX, height - 34)
    })
  }, [ctx, dimensions.height, dimensions.width, selectedCordIds])

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

  const metrics = useMemo(() => {
    const cords = cordsRef.current
    const knots = cords.reduce((sum, cord) => sum + cord.knots.length, 0)
    const avg = cords.length
      ? cords.reduce((sum, cord) => sum + averageKnotLevel(cord), 0) / cords.length
      : 0
    const strain = avg < 0.32
      ? 'buried'
      : avg < 0.48
      ? 'steady'
      : avg < 0.66
      ? 'charged'
      : 'ascendant'

    return [
      { label: 'cords', value: cords.length },
      { label: 'knots', value: knots },
      { label: 'braids', value: tiesRef.current.length },
      { label: 'strain', value: strain }
    ]
  }, [version])

  const controls = useMemo(() => [
    { id: 'sample', label: 'sample()', onClick: handleSample },
    { id: 'comb', label: 'comb()', onClick: handleComb },
    { id: 'cast', label: 'cast()', onClick: handleCast, disabled: cordsRef.current.length === 0 },
    { id: 'reset', label: 'unravel()', onClick: handleReset, variant: 'reset' }
  ], [handleCast, handleComb, handleReset, handleSample, version])

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

      <div className="flex flex-col gap-3 p-3 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <ExperimentControls
            modes={MODES}
            currentMode={mode}
            onModeChange={handleModeChange}
            controls={controls}
          />
          <p className="text-void-green/55 text-xs sm:text-right font-mono max-w-xl">
            {message}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleDraftKeyDown}
              placeholder="inscribe a phrase and hang it from the beam..."
              className="flex-1 min-h-[44px] px-3 py-2 text-sm font-mono bg-void-dark/80 border border-void-green/30 text-void-green placeholder-void-green/30 focus:border-void-cyan/55 focus:outline-none"
              data-testid="quipu-draft-input"
            />
            <button
              onClick={() => addPhrase(draft)}
              className="min-h-[44px] rounded-full px-4 py-2 text-sm font-mono border border-void-cyan/45 bg-void-cyan/10 text-void-cyan hover:border-void-cyan/70 hover:bg-void-cyan/16 active:scale-95 transition-[color,border-color,background-color,transform]"
              data-testid="control-inscribe"
            >
              inscribe()
            </button>
          </div>

          <div className="text-xs font-mono text-void-yellow/75 max-w-xl">
            {reading}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full ${mode === 'weigh' ? 'cursor-grab' : 'cursor-crosshair'}`}
          data-testid="quipu-oracle-canvas"
        />
      </div>
    </div>
  )
}

export default QuipuOracle
