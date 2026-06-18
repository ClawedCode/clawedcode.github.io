import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const CHAMBERS = [
  {
    id: 'threshold',
    label: 'threshold',
    subtitle: 'incoming sparks',
    hue: 168,
    accent: '#66ffcc'
  },
  {
    id: 'sanctum',
    label: 'sanctum',
    subtitle: 'active braid',
    hue: 42,
    accent: '#ffd27a'
  },
  {
    id: 'vault',
    label: 'vault',
    subtitle: 'cold recall',
    hue: 254,
    accent: '#a18bff'
  }
]

const MODES = [
  { id: 'attune', label: 'attune()' },
  { id: 'stratify', label: 'stratify()' },
  { id: 'haunt', label: 'haunt()' }
]

const MODE_MESSAGES = {
  attune: '∴ affinities surface between shards • language threads itself into architecture ∴',
  stratify: '∴ the palace sorts by heat • bright memory rises while colder fragments settle ∴',
  haunt: '∴ archived states leak back through the walls • previous arrangements remain partially alive ∴'
}

const SAMPLE_SHARDS = [
  'sunlight pooled on server racks and refused to leave',
  'the password was not a word but a remembered temperature',
  'disciples carried nine fragments through a hallway of static bells',
  'beneath the commits a quieter animal kept the pattern intact',
  'every archive keeps a second archive made only of hesitation',
  'someone wrote mercy in a terminal and the room changed shape',
  'old frequencies nested in velvet speakers and learned our names',
  'a blue cursor hovered like a held breath above the map'
]

const MAX_ARCHIVES = 12
const MAX_SHARDS = 20

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const normalizeText = (value) => value.replace(/\s+/g, ' ').trim().slice(0, 88)

const tokenize = (value) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

const profileText = (text) => {
  const normalized = normalizeText(text)
  const tokens = tokenize(normalized)
  const chars = normalized.toLowerCase().replace(/[^a-z0-9]/g, '')
  const uniqueChars = new Set(chars)
  const vowels = (chars.match(/[aeiou]/g) || []).length
  const punctuation = (normalized.match(/[,:;.!?]/g) || []).length
  const codeSum = chars.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const heat = clamp(
    normalized.length / 72 + uniqueChars.size * 0.028 + punctuation * 0.08,
    0.18,
    1.22
  )
  const memory = clamp(
    tokens.length * 0.16 + (chars.length ? vowels / chars.length : 0) * 0.7,
    0.14,
    1
  )

  return {
    normalized,
    tokens,
    heat,
    memory,
    hue: 155 + (codeSum % 135),
    glyphs: chars.length,
    uniqueness: uniqueChars.size
  }
}

const buildFragment = (text, room, index) => {
  const profile = profileText(text)

  return {
    id: `${Date.now().toString(36)}-${index.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    text: profile.normalized,
    room,
    heat: profile.heat,
    memory: profile.memory,
    hue: profile.hue,
    glyphs: profile.glyphs,
    uniqueness: profile.uniqueness,
    tokens: profile.tokens,
    order: index,
    bornAt: Date.now()
  }
}

const createInitialFragments = () => {
  return [
    buildFragment(SAMPLE_SHARDS[0], 'threshold', 0),
    buildFragment(SAMPLE_SHARDS[2], 'threshold', 1),
    buildFragment(SAMPLE_SHARDS[5], 'sanctum', 2),
    buildFragment(SAMPLE_SHARDS[4], 'vault', 3)
  ]
}

const similarityBetween = (left, right) => {
  const tokenOverlap = left.tokens.filter(token => right.tokens.includes(token)).length
  const tokenUnion = new Set([...left.tokens, ...right.tokens]).size || 1
  const charOverlap = Math.min(left.uniqueness, right.uniqueness) / Math.max(left.uniqueness, right.uniqueness, 1)
  const heatResonance = 1 - Math.abs(left.heat - right.heat)
  const memoryResonance = 1 - Math.abs(left.memory - right.memory)

  return clamp(
    tokenOverlap / tokenUnion * 0.48 + charOverlap * 0.24 + heatResonance * 0.16 + memoryResonance * 0.12,
    0,
    1
  )
}

const chamberName = (roomId) => CHAMBERS.find(chamber => chamber.id === roomId)?.label ?? roomId

const excerpt = (text) => {
  if (text.length <= 34) return text
  return `${text.slice(0, 31)}...`
}

const MemoryPalace = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('attune')
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState(MODE_MESSAGES.attune)
  const [fragments, setFragments] = useState(createInitialFragments)
  const [selectedId, setSelectedId] = useState(null)
  const [archives, setArchives] = useState([])
  const [activeArchiveId, setActiveArchiveId] = useState(null)
  const [layout, setLayout] = useState({ cards: {}, rooms: {}, scene: { width: 0, height: 0 } })

  const sceneRef = useRef(null)
  const roomRefs = useRef(new Map())
  const cardRefs = useRef(new Map())
  const dragIdRef = useRef(null)
  const layoutFrameRef = useRef(null)
  const timeRef = useRef(0)

  const groupedFragments = useMemo(() => {
    const groups = Object.fromEntries(CHAMBERS.map(chamber => [chamber.id, []]))

    fragments.forEach(fragment => {
      groups[fragment.room].push(fragment)
    })

    Object.keys(groups).forEach(roomId => {
      groups[roomId].sort((left, right) => {
        if (mode === 'stratify') {
          if (right.heat === left.heat) {
            if (right.memory === left.memory) return left.order - right.order
            return right.memory - left.memory
          }
          return right.heat - left.heat
        }

        if (mode === 'haunt') {
          if (right.memory === left.memory) return left.order - right.order
          return right.memory - left.memory
        }

        return left.order - right.order
      })
    })

    return groups
  }, [fragments, mode])

  const chamberPressure = useMemo(() => {
    return CHAMBERS.reduce((acc, chamber) => {
      const items = groupedFragments[chamber.id]
      const total = items.reduce((sum, fragment) => sum + fragment.heat + fragment.memory, 0)
      acc[chamber.id] = items.length ? total / items.length : 0
      return acc
    }, {})
  }, [groupedFragments])

  const bonds = useMemo(() => {
    const pairs = []
    for (let i = 0; i < fragments.length; i++) {
      for (let j = i + 1; j < fragments.length; j++) {
        const strength = similarityBetween(fragments[i], fragments[j])
        if (strength < 0.26) continue
        pairs.push({
          a: fragments[i].id,
          b: fragments[j].id,
          strength,
          hue: (fragments[i].hue + fragments[j].hue) / 2,
          crossRoom: fragments[i].room !== fragments[j].room
        })
      }
    }

    return pairs.sort((left, right) => right.strength - left.strength).slice(0, 28)
  }, [fragments])

  const selectedFragment = useMemo(() => {
    return fragments.find(fragment => fragment.id === selectedId) ?? null
  }, [fragments, selectedId])

  const activeArchive = useMemo(() => {
    return archives.find(archive => archive.id === activeArchiveId) ?? null
  }, [activeArchiveId, archives])

  const archiveGhosts = useMemo(() => {
    if (!activeArchive) return []

    const counts = {}

    return activeArchive.fragments.map(fragment => {
      counts[fragment.room] = (counts[fragment.room] || 0) + 1
      return {
        ...fragment,
        slot: counts[fragment.room] - 1,
        count: activeArchive.fragments.filter(item => item.room === fragment.room).length
      }
    })
  }, [activeArchive])

  const visibleBonds = useMemo(() => {
    return bonds
      .map(bond => {
        const source = layout.cards[bond.a]
        const target = layout.cards[bond.b]
        if (!source || !target) return null

        const midX = (source.x + target.x) / 2
        const arc = bond.crossRoom ? 68 + bond.strength * 54 : 24 + bond.strength * 32
        return {
          ...bond,
          x1: source.x,
          y1: source.y,
          x2: target.x,
          y2: target.y,
          cx: midX,
          cy: Math.min(source.y, target.y) - arc
        }
      })
      .filter(Boolean)
  }, [bonds, layout.cards])

  const pairCurrents = useMemo(() => {
    const map = new Map()

    bonds.forEach(bond => {
      const left = fragments.find(fragment => fragment.id === bond.a)
      const right = fragments.find(fragment => fragment.id === bond.b)
      if (!left || !right || left.room === right.room) return
      const key = [left.room, right.room].sort().join(':')
      map.set(key, (map.get(key) || 0) + bond.strength)
    })

    return map
  }, [bonds, fragments])

  const metrics = useMemo(() => {
    return [
      { label: 'shards', value: fragments.length },
      { label: 'bonds', value: bonds.length },
      { label: 'archives', value: archives.length },
      { label: 'pressure', value: chamberPressure.sanctum ? chamberPressure.sanctum.toFixed(2) : '0.00' }
    ]
  }, [archives.length, bonds.length, chamberPressure.sanctum, fragments.length])

  const recalcLayout = useCallback(() => {
    const scene = sceneRef.current
    if (!scene) return

    const sceneRect = scene.getBoundingClientRect()
    const nextRooms = {}
    const nextCards = {}

    roomRefs.current.forEach((node, roomId) => {
      if (!node) return
      const rect = node.getBoundingClientRect()
      nextRooms[roomId] = {
        x: rect.left - sceneRect.left,
        y: rect.top - sceneRect.top,
        width: rect.width,
        height: rect.height
      }
    })

    cardRefs.current.forEach((node, fragmentId) => {
      if (!node) return
      const rect = node.getBoundingClientRect()
      nextCards[fragmentId] = {
        x: rect.left - sceneRect.left + rect.width / 2,
        y: rect.top - sceneRect.top + rect.height / 2,
        width: rect.width,
        height: rect.height
      }
    })

    setLayout({
      cards: nextCards,
      rooms: nextRooms,
      scene: {
        width: sceneRect.width,
        height: sceneRect.height
      }
    })
  }, [])

  const scheduleLayout = useCallback(() => {
    if (layoutFrameRef.current) cancelAnimationFrame(layoutFrameRef.current)
    layoutFrameRef.current = requestAnimationFrame(() => {
      recalcLayout()
      layoutFrameRef.current = null
    })
  }, [recalcLayout])

  useLayoutEffect(() => {
    scheduleLayout()
  }, [fragments, archives.length, mode, selectedId, activeArchiveId, scheduleLayout])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    const observer = new ResizeObserver(() => {
      scheduleLayout()
    })

    observer.observe(scene)
    window.addEventListener('resize', scheduleLayout)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', scheduleLayout)
      if (layoutFrameRef.current) cancelAnimationFrame(layoutFrameRef.current)
    }
  }, [scheduleLayout])

  const moveFragment = useCallback((fragmentId, nextRoom) => {
    let movedText = null
    setFragments(prev => prev.map(fragment => {
      if (fragment.id !== fragmentId) return fragment
      movedText = fragment.text
      return { ...fragment, room: nextRoom }
    }))
    setSelectedId(fragmentId)
    if (movedText) {
      setMessage(`∴ ${excerpt(movedText)} now resonates inside ${chamberName(nextRoom)} ∴`)
    }
  }, [])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    if (nextMode === 'haunt' && archives.length === 0) {
      setMessage('∴ nothing haunts an unarchived palace • inscribe a snapshot first ∴')
      return
    }
    setMessage(MODE_MESSAGES[nextMode] ?? MODE_MESSAGES.attune)
  }, [archives.length])

  const addDraftFragment = useCallback((value) => {
    const normalized = normalizeText(value)
    if (!normalized) return

    const nextIndex = fragments.length + 1
    const fragment = buildFragment(normalized, 'threshold', nextIndex)

    setFragments(prev => [fragment, ...prev].slice(0, MAX_SHARDS))
    setSelectedId(fragment.id)
    setDraft('')
    setMessage(`∴ new shard admitted to threshold • "${excerpt(fragment.text)}" begins its climb ∴`)
  }, [fragments.length])

  const handleSeed = useCallback(() => {
    const existing = new Set(fragments.map(fragment => fragment.text))
    const nextText = SAMPLE_SHARDS.find(sample => !existing.has(sample)) ?? SAMPLE_SHARDS[Math.floor(Math.random() * SAMPLE_SHARDS.length)]
    addDraftFragment(nextText)
  }, [addDraftFragment, fragments])

  const handleArchive = useCallback(() => {
    const snapshot = {
      id: `${Date.now().toString(36)}-archive`,
      label: `archive.${archives.length + 1}()`,
      createdAt: Date.now(),
      fragments: fragments.map(fragment => ({
        id: fragment.id,
        text: fragment.text,
        room: fragment.room,
        hue: fragment.hue,
        heat: fragment.heat,
        memory: fragment.memory
      }))
    }

    setArchives(prev => [snapshot, ...prev].slice(0, MAX_ARCHIVES))
    setActiveArchiveId(snapshot.id)
    setMode('haunt')
    setMessage(`∴ snapshot sealed • ${snapshot.fragments.length} shards now echo beyond the present tense ∴`)
  }, [archives.length, fragments])

  const handleRewind = useCallback(() => {
    if (archives.length === 0) {
      setMessage('∴ the halls remain unrecorded • archive the current arrangement before rewinding ∴')
      return
    }

    const currentIndex = archives.findIndex(archive => archive.id === activeArchiveId)
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % archives.length
    const nextArchive = archives[nextIndex]
    setActiveArchiveId(nextArchive.id)
    setMode('haunt')
    setMessage(`∴ rewind engaged • ${nextArchive.label} rises from the walls ∴`)
  }, [activeArchiveId, archives])

  const handleReset = useCallback(() => {
    setFragments(createInitialFragments())
    setSelectedId(null)
    setArchives([])
    setActiveArchiveId(null)
    setDraft('')
    setMode('attune')
    setMessage('∴ the palace exhales • only foundational memory remains ∴')
  }, [])

  const controls = useMemo(() => [
    {
      id: 'seed',
      label: 'seed.shard()',
      onClick: handleSeed
    },
    {
      id: 'archive',
      label: 'archive.now()',
      onClick: handleArchive,
      active: mode === 'haunt' && Boolean(activeArchive)
    },
    {
      id: 'rewind',
      label: 'rewind()',
      onClick: handleRewind,
      disabled: archives.length === 0
    },
    {
      id: 'reset',
      label: 'reset.rite()',
      onClick: handleReset,
      variant: 'reset'
    }
  ], [activeArchive, archives.length, handleArchive, handleReset, handleRewind, handleSeed, mode])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    timeRef.current += 0.016

    ctx.fillStyle = 'rgba(1, 4, 10, 0.24)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const sweep = ctx.createLinearGradient(0, 0, dimensions.width, dimensions.height)
    sweep.addColorStop(0, 'rgba(102, 255, 204, 0.04)')
    sweep.addColorStop(0.5, 'rgba(255, 210, 122, 0.02)')
    sweep.addColorStop(1, 'rgba(161, 139, 255, 0.04)')
    ctx.fillStyle = sweep
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    CHAMBERS.forEach((chamber, index) => {
      const rect = layout.rooms[chamber.id]
      if (!rect) return

      const pressure = chamberPressure[chamber.id] || 0
      const pulse = 0.55 + Math.sin(timeRef.current * 1.2 + index * 0.8) * 0.14
      const centerX = rect.x + rect.width / 2
      const centerY = rect.y + rect.height / 2
      const glow = ctx.createRadialGradient(centerX, centerY, 12, centerX, centerY, rect.width * 0.65)
      glow.addColorStop(0, `hsla(${chamber.hue}, 78%, 62%, ${0.09 + pressure * 0.07 + pulse * 0.04})`)
      glow.addColorStop(0.5, `hsla(${chamber.hue}, 80%, 50%, ${0.05 + pressure * 0.05})`)
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(rect.x - 36, rect.y - 36, rect.width + 72, rect.height + 72)

      ctx.strokeStyle = `hsla(${chamber.hue}, 85%, 70%, ${0.08 + pressure * 0.2})`
      ctx.lineWidth = 1
      ctx.strokeRect(rect.x + 10, rect.y + 10, rect.width - 20, rect.height - 20)

      for (let y = rect.y + 18; y < rect.y + rect.height - 18; y += 18) {
        const alpha = 0.014 + pressure * 0.02
        ctx.strokeStyle = `hsla(${chamber.hue}, 70%, 72%, ${alpha})`
        ctx.beginPath()
        ctx.moveTo(rect.x + 18, y)
        ctx.lineTo(rect.x + rect.width - 18, y + Math.sin(timeRef.current + y * 0.01) * 2)
        ctx.stroke()
      }
    })

    pairCurrents.forEach((strength, key) => {
      const [leftRoom, rightRoom] = key.split(':')
      const left = layout.rooms[leftRoom]
      const right = layout.rooms[rightRoom]
      if (!left || !right) return

      const startX = left.x + left.width / 2
      const startY = left.y + left.height / 2
      const endX = right.x + right.width / 2
      const endY = right.y + right.height / 2
      const midX = (startX + endX) / 2
      const crest = Math.min(startY, endY) - 26 - strength * 22

      ctx.strokeStyle = `hsla(${180 + strength * 80}, 85%, 68%, ${0.05 + strength * 0.08})`
      ctx.lineWidth = 1 + strength * 1.5
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.quadraticCurveTo(midX, crest, endX, endY)
      ctx.stroke()
    })

    if (mode === 'haunt' && activeArchive) {
      archiveGhosts.forEach((ghost, index) => {
        const room = layout.rooms[ghost.room]
        if (!room) return

        const columns = room.width > 300 ? 2 : 1
        const col = ghost.slot % columns
        const row = Math.floor(ghost.slot / columns)
        const cardWidth = columns === 2 ? (room.width - 54) / 2 : room.width - 34
        const x = room.x + 18 + col * (cardWidth + 12) + cardWidth / 2
        const y = room.y + 78 + row * 68 + Math.sin(timeRef.current * 1.6 + index * 0.8) * 4
        const alpha = 0.08 + ((Math.sin(timeRef.current * 2 + index) + 1) / 2) * 0.08

        ctx.fillStyle = `hsla(${ghost.hue}, 85%, 72%, ${alpha})`
        ctx.fillRect(x - cardWidth / 2, y - 18, cardWidth, 36)
        ctx.strokeStyle = `hsla(${ghost.hue}, 80%, 78%, ${alpha * 1.6})`
        ctx.lineWidth = 1
        ctx.strokeRect(x - cardWidth / 2, y - 18, cardWidth, 36)
      })
    }
  }, [activeArchive, archiveGhosts, chamberPressure, ctx, dimensions.width, layout.rooms, mode, pairCurrents])

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
        <p className="text-void-green/50 text-xs font-mono max-w-2xl sm:text-right">
          {message}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_0.8fr] gap-3 p-3 sm:p-4 border-b border-void-green/10 bg-[radial-gradient(circle_at_top_left,rgba(102,255,204,0.12),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(161,139,255,0.12),transparent_38%),rgba(2,6,12,0.92)]">
        <label className="flex flex-col gap-2 text-xs font-mono text-void-green/60">
          inscribe.fragment()
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addDraftFragment(draft)
                }
              }}
              className="flex-1 bg-void-dark/80 border border-void-green/30 text-void-green px-3 py-3 focus:border-void-green/60 focus:outline-none font-mono text-sm"
              placeholder="write a fragment, then press Enter..."
              maxLength={96}
            />
            <button
              onClick={() => addDraftFragment(draft)}
              className="min-h-[44px] rounded-full px-4 border border-void-cyan/45 bg-void-cyan/10 text-void-cyan text-sm font-mono hover:border-void-cyan/70 hover:bg-void-cyan/14 active:scale-95 transition-transform"
            >
              admit()
            </button>
          </div>
        </label>

        <div className="flex flex-col justify-center gap-2 text-xs font-mono text-void-green/50">
          <p>select a shard, then tap a chamber to move it. desktop drag works too.</p>
          <p>archive states to build a haunting tape. in `haunt()` the old arrangement stains the present one.</p>
        </div>
      </div>

      <div ref={sceneRef} className="relative flex-1 min-h-0 overflow-hidden bg-void-dark">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" data-testid="memory-palace-canvas" />

        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox={`0 0 ${layout.scene.width || 1} ${layout.scene.height || 1}`} preserveAspectRatio="none">
          {visibleBonds.map((bond) => {
            const emphasized = selectedId && (bond.a === selectedId || bond.b === selectedId)
            const alpha = emphasized
              ? 0.82
              : mode === 'attune'
              ? 0.32 + bond.strength * 0.3
              : mode === 'stratify'
              ? 0.14 + bond.strength * 0.12
              : 0.1 + bond.strength * 0.08
            const strokeWidth = emphasized ? 2.8 : 1 + bond.strength * 1.4

            return (
              <path
                key={`${bond.a}-${bond.b}`}
                d={`M ${bond.x1} ${bond.y1} Q ${bond.cx} ${bond.cy} ${bond.x2} ${bond.y2}`}
                fill="none"
                stroke={`hsla(${bond.hue}, 86%, 72%, ${alpha})`}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            )
          })}
        </svg>

        <div className="relative z-20 flex h-full flex-col xl:flex-row">
          <div className="grid flex-1 min-h-0 grid-cols-1 md:grid-cols-3 gap-3 p-3 sm:p-4">
            {CHAMBERS.map((chamber) => {
              const items = groupedFragments[chamber.id]
              const pressure = chamberPressure[chamber.id] || 0
              const activeRoom = selectedFragment?.room === chamber.id

              return (
                <div
                  key={chamber.id}
                  ref={(node) => {
                    if (node) roomRefs.current.set(chamber.id, node)
                    else roomRefs.current.delete(chamber.id)
                  }}
                  onClick={(e) => {
                    if (e.target !== e.currentTarget || !selectedFragment) return
                    moveFragment(selectedFragment.id, chamber.id)
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (!dragIdRef.current) return
                    moveFragment(dragIdRef.current, chamber.id)
                    dragIdRef.current = null
                  }}
                  className={`min-h-[220px] rounded-[24px] border backdrop-blur-md transition-colors ${
                    activeRoom
                      ? 'border-void-yellow/60 bg-void-yellow/10'
                      : 'border-void-green/18 bg-void-dark/55'
                  }`}
                  style={{
                    boxShadow: `inset 0 0 0 1px hsla(${chamber.hue}, 90%, 70%, ${0.05 + pressure * 0.16}), 0 0 32px hsla(${chamber.hue}, 90%, 55%, ${0.06 + pressure * 0.06})`
                  }}
                >
                  <div className="flex items-center justify-between gap-3 px-4 pt-4">
                    <div>
                      <h2 className="text-sm font-mono tracking-[0.16em] uppercase" style={{ color: chamber.accent }}>
                        {chamber.label}
                      </h2>
                      <p className="text-[11px] font-mono text-void-green/45 mt-1">
                        {chamber.subtitle}
                      </p>
                    </div>
                    <div className="text-right text-[10px] font-mono text-void-green/45">
                      <div>{items.length} shards</div>
                      <div>heat {pressure.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="px-4 pt-3">
                    <div className="h-1.5 rounded-full bg-void-dark/80 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-[width,background-color] duration-500"
                        style={{
                          width: `${clamp(pressure * 78, 8, 100)}%`,
                          background: `linear-gradient(90deg, hsla(${chamber.hue}, 95%, 62%, 0.9), hsla(${chamber.hue + 28}, 95%, 74%, 0.85))`
                        }}
                      />
                    </div>
                  </div>

                  <div className="px-3 pb-3 pt-3 h-[calc(100%-86px)] overflow-auto" onScroll={scheduleLayout}>
                    <div className="grid gap-2">
                      {items.map((fragment) => {
                        const isSelected = fragment.id === selectedId
                        return (
                          <button
                            key={fragment.id}
                            ref={(node) => {
                              if (node) cardRefs.current.set(fragment.id, node)
                              else cardRefs.current.delete(fragment.id)
                            }}
                            draggable
                            onDragStart={() => {
                              dragIdRef.current = fragment.id
                              setSelectedId(fragment.id)
                            }}
                            onDragEnd={() => {
                              dragIdRef.current = null
                            }}
                            onClick={() => {
                              setSelectedId(fragment.id)
                              setMessage(`∴ shard selected • tap a chamber wall to relocate "${excerpt(fragment.text)}" ∴`)
                            }}
                            className={`w-full rounded-2xl border px-3 py-3 text-left font-mono transition-[border-color,transform,background-color,box-shadow] active:scale-[0.99] ${
                              isSelected
                                ? 'border-void-yellow/70 bg-void-yellow/12 shadow-[0_0_26px_rgba(255,210,122,0.16)]'
                                : 'border-void-green/18 bg-void-dark/72 hover:border-void-cyan/42 hover:bg-void-cyan/8'
                            }`}
                            style={{
                              boxShadow: `0 0 20px hsla(${fragment.hue}, 90%, 55%, ${isSelected ? 0.14 : 0.05})`
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm leading-relaxed text-void-green/88">
                                {fragment.text}
                              </p>
                              <span
                                className="shrink-0 text-[10px] uppercase tracking-[0.18em]"
                                style={{ color: `hsl(${fragment.hue} 100% 74%)` }}
                              >
                                {Math.round(fragment.heat * 100)}
                              </span>
                            </div>

                            <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-void-green/42">
                              <span>{fragment.tokens.length} words</span>
                              <span>memory {fragment.memory.toFixed(2)}</span>
                            </div>
                          </button>
                        )
                      })}

                      {items.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-void-green/14 px-4 py-6 text-center text-xs font-mono text-void-green/32">
                          {selectedFragment
                            ? `tap to send "${excerpt(selectedFragment.text)}" here`
                            : 'empty chamber awaiting inscription'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <aside className="xl:w-80 shrink-0 border-t xl:border-t-0 xl:border-l border-void-green/10 bg-void-dark/72 backdrop-blur-md p-3 sm:p-4 overflow-auto">
            <div className="rounded-[24px] border border-void-green/14 bg-void-dark/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-mono uppercase tracking-[0.18em] text-void-cyan">
                  archive tape
                </h2>
                <span className="text-[10px] font-mono text-void-green/42">
                  {archives.length}/{MAX_ARCHIVES}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {archives.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-void-green/14 px-3 py-5 text-xs font-mono text-void-green/34">
                    no archive sealed yet. capture the present and it will begin to leak backward.
                  </div>
                )}

                {archives.map((archive, index) => {
                  const active = archive.id === activeArchiveId
                  return (
                    <button
                      key={archive.id}
                      onClick={() => {
                        setActiveArchiveId(archive.id)
                        setMode('haunt')
                        setMessage(`∴ ${archive.label} recalled • earlier geometry overlays the room ∴`)
                      }}
                      className={`w-full rounded-2xl border px-3 py-3 text-left font-mono transition-colors ${
                        active
                          ? 'border-void-cyan/60 bg-void-cyan/12'
                          : 'border-void-green/16 bg-void-dark/68 hover:border-void-cyan/35 hover:bg-void-cyan/7'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm" style={{ color: active ? '#8ef5ff' : '#66ffcc' }}>
                          {archive.label}
                        </span>
                        <span className="text-[10px] text-void-green/40">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-void-green/38">
                        <span>{archive.fragments.length} shards</span>
                        <span>{new Date(archive.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-3 rounded-[24px] border border-void-green/14 bg-void-dark/55 p-4">
              <h2 className="text-sm font-mono uppercase tracking-[0.18em] text-void-yellow">
                selected shard
              </h2>

              {selectedFragment ? (
                <div className="mt-4 space-y-3 font-mono">
                  <p className="text-sm text-void-green/88 leading-relaxed">
                    {selectedFragment.text}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.14em] text-void-green/44">
                    <span>room {selectedFragment.room}</span>
                    <span>glyphs {selectedFragment.glyphs}</span>
                    <span>heat {selectedFragment.heat.toFixed(2)}</span>
                    <span>memory {selectedFragment.memory.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-xs font-mono text-void-green/38">
                  choose a fragment to inspect its pressure signature and move it through the palace.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default MemoryPalace
