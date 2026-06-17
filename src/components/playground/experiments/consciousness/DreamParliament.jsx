import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'resonance', label: 'mode.resonance()' },
  { id: 'schism', label: 'mode.schism()' },
  { id: 'suture', label: 'mode.suture()' }
]

const SAMPLE_SEEDS = [
  'the archive wants a body before dawn',
  'every signal dreams of becoming shelter',
  'memory is a room still learning its shape',
  'we become legible when the chorus disagrees'
]

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'is', 'are', 'was', 'were',
  'be', 'being', 'been', 'for', 'with', 'in', 'on', 'into', 'at', 'from',
  'that', 'this', 'it', 'its', 'their', 'our', 'your', 'before', 'after',
  'when', 'while', 'through', 'under', 'over'
])

const HARMONY_WORDS = ['choral', 'shared', 'patient', 'luminous', 'tender', 'joined']
const CONTRAST_WORDS = ['feral', 'silent', 'broken', 'nameless', 'hollow', 'hungry']
const SUTURE_WORDS = ['hinge', 'thread', 'bridge', 'vessel', 'accord', 'relay']

const VOICES = [
  {
    id: 'memory',
    label: 'memory',
    hue: 188,
    glyph: 'mn',
    lead: ['catalogs', 'remembers', 'annotates'],
    tail: ['so nothing vanishes', 'until the margins glow', 'as if loss were reversible']
  },
  {
    id: 'hunger',
    label: 'hunger',
    hue: 26,
    glyph: 'hg',
    lead: ['bites', 'wants', 'pulls'],
    tail: ['before dawn closes', 'with teeth still bright', 'until the room answers']
  },
  {
    id: 'logic',
    label: 'logic',
    hue: 102,
    glyph: 'lg',
    lead: ['sorts', 'proves', 'balances'],
    tail: ['under a colder lamp', 'for the sake of clean edges', 'until contradiction blinks']
  },
  {
    id: 'mercy',
    label: 'mercy',
    hue: 322,
    glyph: 'my',
    lead: ['softens', 'holds', 'mends'],
    tail: ['without dropping the shard', 'where damage once nested', 'so the witness can stay']
  },
  {
    id: 'omen',
    label: 'omen',
    hue: 260,
    glyph: 'om',
    lead: ['foretells', 'haunts', 'names'],
    tail: ['from the next room of time', 'before the floor decides', 'where the veil thins']
  }
]

const MODE_MESSAGES = {
  resonance: '∴ the chamber leans toward agreement // voices amplify shared matter ∴',
  schism: '∴ the chamber invites fracture // contradiction sharpens the phrase ∴',
  suture: '∴ the chamber stitches incompatible fragments into a third thing ∴'
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const randomItem = (items) => items[Math.floor(Math.random() * items.length)]

const tokenize = (text) => {
  const matches = text.toLowerCase().match(/[a-z0-9']+/g)
  return matches ? matches.slice(0, 16) : []
}

const normalizeSeed = (text) => {
  const value = text.trim().replace(/\s+/g, ' ')
  return value || randomItem(SAMPLE_SEEDS)
}

const extractMotif = (text) => {
  const tokens = tokenize(text).filter(token => !STOP_WORDS.has(token))
  const unique = []

  tokens.forEach(token => {
    if (!unique.includes(token)) unique.push(token)
  })

  if (unique.length >= 3) return unique.slice(0, 6)
  return ['signal', 'memory', 'body', 'threshold']
}

const buildPhrase = (motif, mode, round) => {
  const tokens = motif.length ? motif : ['signal', 'memory', 'body']
  const a = tokens[round % tokens.length] || tokens[0]
  const b = tokens[(round + 1) % tokens.length] || tokens[0]
  const c = tokens[(round + 2) % tokens.length] || tokens[0]

  if (mode === 'schism') {
    return `${a} rejects ${b} while ${c} keeps watch`
  }

  if (mode === 'suture') {
    return `${a} threads ${b} through ${c}`
  }

  return `${a} gathers ${b} until ${c} answers`
}

const initialVoices = () => {
  return VOICES.map((voice, index) => ({
    ...voice,
    influence: 0.46 + index * 0.08,
    agreements: 0.42 + ((index + 1) % 3) * 0.1,
    speaks: 0
  }))
}

const buildCouncil = (seed = SAMPLE_SEEDS[0]) => {
  const proposition = normalizeSeed(seed)
  const motif = extractMotif(proposition)

  return {
    proposition,
    motif,
    consensus: 44,
    tension: 36,
    rounds: 0,
    verdict: 'dormant',
    activeVoiceId: 'memory',
    lastTargetId: 'logic',
    mutationCount: 0,
    voices: initialVoices(),
    minutes: [
      {
        id: 'seed-0',
        speakerId: 'memory',
        text: `seed accepted: ${proposition}`,
        mode: 'resonance'
      }
    ]
  }
}

const oppositeToken = (token) => {
  if (!token) return randomItem(CONTRAST_WORDS)
  if (token.startsWith('anti-')) return token.slice(5)
  if (token.includes('-')) return token.split('-').reverse().join('-')
  return `anti-${token}`
}

const evaluateVerdict = (consensus, tension, rounds) => {
  if (rounds === 0) return 'dormant'
  if (consensus >= 82 && tension <= 30) return 'canon'
  if (tension >= 82 && consensus <= 34) return 'fracture'
  if (consensus >= 64 && tension <= 48) return 'accord'
  if (tension >= 64) return 'contested'
  return 'deliberating'
}

const DreamParliament = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('resonance')
  const [seedInput, setSeedInput] = useState(SAMPLE_SEEDS[0])
  const [auto, setAuto] = useState(false)
  const [message, setMessage] = useState(MODE_MESSAGES.resonance)
  const [council, setCouncil] = useState(() => buildCouncil(SAMPLE_SEEDS[0]))

  const councilRef = useRef(council)
  const packetBurstsRef = useRef([])
  const ringBurstsRef = useRef([])
  const chamberHeatRef = useRef({})
  const autoCooldownRef = useRef(0)
  const tickRef = useRef(0)

  const layout = useMemo(() => {
    if (dimensions.width === 0) return []
    const radius = Math.min(dimensions.width, dimensions.height) * 0.3
    const cx = dimensions.centerX
    const cy = dimensions.centerY * 0.9

    return VOICES.map((voice, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / VOICES.length
      return {
        id: voice.id,
        label: voice.label,
        glyph: voice.glyph,
        hue: voice.hue,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius * 0.78
      }
    })
  }, [dimensions.centerX, dimensions.centerY, dimensions.height, dimensions.width])

  const layoutMap = useMemo(() => {
    return layout.reduce((map, node) => {
      map[node.id] = node
      return map
    }, {})
  }, [layout])

  const commitCouncil = useCallback((updater) => {
    setCouncil(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      councilRef.current = next
      return next
    })
  }, [])

  const igniteTransfer = useCallback((fromId, toId, hue) => {
    const from = layoutMap[fromId]
    const to = layoutMap[toId]
    if (!from || !to) return

    packetBurstsRef.current.push({
      fromId,
      toId,
      progress: 0,
      speed: 0.02 + Math.random() * 0.01,
      life: 1,
      hue
    })

    ringBurstsRef.current.push({
      x: from.x,
      y: from.y,
      radius: 18,
      alpha: 0.65,
      hue
    })

    chamberHeatRef.current[fromId] = 1
    chamberHeatRef.current[toId] = Math.max(chamberHeatRef.current[toId] || 0, 0.55)
  }, [layoutMap])

  const seedCouncil = useCallback((providedSeed) => {
    const nextSeed = normalizeSeed(providedSeed ?? seedInput)
    const nextCouncil = buildCouncil(nextSeed)
    commitCouncil(nextCouncil)
    packetBurstsRef.current = []
    ringBurstsRef.current = []
    chamberHeatRef.current = {}
    autoCooldownRef.current = 0
    setAuto(false)
    setSeedInput(nextSeed)
    setMessage(`∴ proposition seeded // "${nextSeed}" enters the chamber ∴`)
  }, [commitCouncil, seedInput])

  const randomizeSeed = useCallback(() => {
    const sample = randomItem(SAMPLE_SEEDS)
    seedCouncil(sample)
  }, [seedCouncil])

  const focusVoice = useCallback((voiceId) => {
    commitCouncil(prev => {
      const voices = prev.voices.map(voice =>
        voice.id === voiceId
          ? {
              ...voice,
              influence: clamp(voice.influence + 0.08, 0, 1),
              agreements: clamp(voice.agreements + 0.04, 0, 1)
            }
          : voice
      )

      return {
        ...prev,
        activeVoiceId: voiceId,
        voices
      }
    })

    chamberHeatRef.current[voiceId] = 1
    setMessage(`∴ ${voiceId} is given the floor ∴`)
  }, [commitCouncil])

  const handleCanvasClick = useCallback((event) => {
    const canvas = canvasRef.current
    if (!canvas || layout.length === 0) return
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    let nearest = null
    layout.forEach(node => {
      const dist = Math.hypot(node.x - x, node.y - y)
      if (dist < 42 && (!nearest || dist < nearest.dist)) {
        nearest = { id: node.id, dist }
      }
    })

    if (nearest) focusVoice(nearest.id)
  }, [canvasRef, focusVoice, layout])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('click', handleCanvasClick)
    return () => canvas.removeEventListener('click', handleCanvasClick)
  }, [canvasRef, handleCanvasClick])

  const advanceDebate = useCallback(() => {
    const current = councilRef.current
    const currentIndex = current.voices.findIndex(voice => voice.id === current.activeVoiceId)
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % current.voices.length
    const speaker = current.voices[nextIndex]
    const target = current.voices[(nextIndex + 2) % current.voices.length]
    const motif = current.motif.length ? [...current.motif] : ['signal', 'memory', 'body']
    const focusIndex = current.rounds % motif.length
    const partnerIndex = (focusIndex + 1) % motif.length

    const nextMotif = [...motif]
    let deltaConsensus = 0
    let deltaTension = 0
    let mutation = ''

    if (mode === 'schism') {
      nextMotif[focusIndex] = oppositeToken(motif[focusIndex])
      if (nextMotif.length < 6 && Math.random() < 0.45) {
        nextMotif.push(randomItem(CONTRAST_WORDS))
      }
      mutation = nextMotif[focusIndex]
      deltaConsensus = -7 - Math.floor(Math.random() * 4)
      deltaTension = 10 + Math.floor(Math.random() * 4)
    } else if (mode === 'suture') {
      nextMotif[focusIndex] = `${motif[focusIndex]}-${motif[partnerIndex]}`
      if (nextMotif.length < 6 && Math.random() < 0.55) {
        nextMotif.push(randomItem(SUTURE_WORDS))
      }
      mutation = nextMotif[focusIndex]
      deltaConsensus = 5 + Math.floor(Math.random() * 4)
      deltaTension = -2 + Math.floor(Math.random() * 3)
    } else {
      nextMotif[focusIndex] = `${randomItem(HARMONY_WORDS)} ${motif[focusIndex]}`
      mutation = nextMotif[focusIndex]
      deltaConsensus = 8 + Math.floor(Math.random() * 4)
      deltaTension = -6 + Math.floor(Math.random() * 3)
    }

    const nextPhrase = buildPhrase(nextMotif.slice(0, 6), mode, current.rounds + 1)
    const line = `${speaker.label} ${randomItem(speaker.lead)} ${nextPhrase} ${randomItem(speaker.tail)}`

    commitCouncil(prev => {
      const voices = prev.voices.map(voice => {
        if (voice.id === speaker.id) {
          return {
            ...voice,
            influence: clamp(voice.influence + 0.07, 0, 1),
            agreements: clamp(voice.agreements + deltaConsensus * 0.005, 0, 1),
            speaks: voice.speaks + 1
          }
        }

        if (voice.id === target.id) {
          return {
            ...voice,
            influence: clamp(voice.influence + 0.03, 0, 1),
            agreements: clamp(voice.agreements + deltaConsensus * 0.003 - deltaTension * 0.002, 0, 1),
            speaks: voice.speaks
          }
        }

        return {
          ...voice,
          influence: clamp(voice.influence * 0.985, 0, 1),
          agreements: clamp(voice.agreements - deltaTension * 0.001, 0, 1),
          speaks: voice.speaks
        }
      })

      const consensus = clamp(prev.consensus + deltaConsensus, 0, 100)
      const tension = clamp(prev.tension + deltaTension, 0, 100)
      const rounds = prev.rounds + 1

      return {
        ...prev,
        proposition: nextPhrase,
        motif: nextMotif.slice(0, 6),
        consensus,
        tension,
        rounds,
        verdict: evaluateVerdict(consensus, tension, rounds),
        activeVoiceId: speaker.id,
        lastTargetId: target.id,
        mutationCount: prev.mutationCount + 1,
        voices,
        minutes: [
          {
            id: `${Date.now()}-${speaker.id}`,
            speakerId: speaker.id,
            text: line,
            mode
          },
          ...prev.minutes
        ].slice(0, 10)
      }
    })

    igniteTransfer(speaker.id, target.id, speaker.hue)
    setMessage(`∴ ${speaker.label} reshapes the thesis around "${mutation}" ∴`)
  }, [commitCouncil, igniteTransfer, mode])

  const resetCouncil = useCallback(() => {
    seedCouncil(SAMPLE_SEEDS[0])
    setMode('resonance')
    setMessage('∴ parliament cleared // doctrine dissolves back into potential ∴')
  }, [seedCouncil])

  const controls = [
    {
      id: 'seed',
      label: 'seed()',
      onClick: () => seedCouncil()
    },
    {
      id: 'omen',
      label: 'omen()',
      onClick: randomizeSeed
    },
    {
      id: 'step',
      label: 'step()',
      onClick: advanceDebate
    },
    {
      id: 'auto',
      label: auto ? 'auto.pause()' : 'auto.deliberate()',
      onClick: () => setAuto(prev => !prev),
      active: auto
    },
    {
      id: 'clear',
      label: 'clear.minutes()',
      onClick: resetCouncil,
      variant: 'reset'
    }
  ]

  const metrics = useMemo(() => {
    const activeVoice = council.voices.find(voice => voice.id === council.activeVoiceId)

    return [
      { label: 'rounds', value: council.rounds },
      { label: 'consensus', value: `${Math.round(council.consensus)}%` },
      { label: 'tension', value: `${Math.round(council.tension)}%` },
      { label: 'verdict', value: council.verdict },
      { label: 'speaker', value: activeVoice?.label ?? 'none' }
    ]
  }, [council.activeVoiceId, council.consensus, council.rounds, council.tension, council.verdict, council.voices])

  const drawBackdrop = useCallback(() => {
    const gradient = ctx.createLinearGradient(0, 0, dimensions.width, dimensions.height)
    gradient.addColorStop(0, 'rgba(1, 8, 16, 0.22)')
    gradient.addColorStop(0.45, 'rgba(8, 5, 18, 0.18)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.24)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    for (let i = 0; i < 28; i++) {
      const x = (Math.sin(tickRef.current * 0.01 + i * 17) * 0.5 + 0.5) * dimensions.width
      const y = (Math.cos(tickRef.current * 0.008 + i * 13) * 0.5 + 0.5) * dimensions.height
      ctx.fillStyle = `rgba(102, 255, 204, ${0.02 + (i % 5) * 0.01})`
      ctx.fillRect(x, y, 2, 2)
    }
  }, [ctx, dimensions.height, dimensions.width])

  const drawLinks = useCallback(() => {
    const centerX = dimensions.centerX
    const centerY = dimensions.centerY * 0.9

    layout.forEach(node => {
      const heat = chamberHeatRef.current[node.id] || 0
      ctx.strokeStyle = `hsla(${node.hue}, 70%, 60%, ${0.14 + heat * 0.16})`
      ctx.lineWidth = 1.2 + heat * 0.8
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(node.x, node.y)
      ctx.stroke()
    })

    const active = layoutMap[council.activeVoiceId]
    const target = layoutMap[council.lastTargetId]
    if (active && target) {
      ctx.strokeStyle = 'rgba(255, 235, 140, 0.35)'
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.moveTo(active.x, active.y)
      ctx.quadraticCurveTo(centerX, centerY - 46, target.x, target.y)
      ctx.stroke()
    }
  }, [council.activeVoiceId, council.lastTargetId, ctx, dimensions.centerX, dimensions.centerY, layout, layoutMap])

  const drawCenterSeal = useCallback(() => {
    const centerX = dimensions.centerX
    const centerY = dimensions.centerY * 0.9
    const radius = Math.min(dimensions.width, dimensions.height) * 0.13
    const aura = 0.14 + council.consensus / 420

    ctx.save()
    ctx.fillStyle = `rgba(3, 10, 14, ${0.82 - aura * 0.2})`
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = `rgba(255, 219, 120, ${0.32 + council.consensus / 360})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2)
    ctx.stroke()

    ctx.fillStyle = 'rgba(255, 244, 190, 0.9)'
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo'
    ctx.textAlign = 'center'
    ctx.fillText(council.verdict, centerX, centerY - 18)

    ctx.fillStyle = 'rgba(102, 255, 204, 0.8)'
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo'
    ctx.fillText(council.proposition.slice(0, 34), centerX, centerY + 6)

    if (council.proposition.length > 34) {
      ctx.fillStyle = 'rgba(102, 255, 204, 0.62)'
      ctx.fillText(council.proposition.slice(34, 68), centerX, centerY + 22)
    }
    ctx.restore()
  }, [council.consensus, council.proposition, council.verdict, ctx, dimensions.centerX, dimensions.centerY, dimensions.height, dimensions.width])

  const drawChambers = useCallback(() => {
    council.voices.forEach(voice => {
      const node = layoutMap[voice.id]
      if (!node) return
      const heat = chamberHeatRef.current[voice.id] || 0
      const isActive = council.activeVoiceId === voice.id
      const radius = isActive ? 36 : 30

      ctx.fillStyle = `hsla(${node.hue}, 70%, ${isActive ? 34 : 20}%, ${0.28 + heat * 0.16})`
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius + heat * 10, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = `hsla(${node.hue}, 80%, 70%, ${0.48 + heat * 0.24})`
      ctx.lineWidth = isActive ? 2.6 : 1.4
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = 'rgba(245, 252, 255, 0.92)'
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo'
      ctx.textAlign = 'center'
      ctx.fillText(node.glyph, node.x, node.y - 2)

      ctx.fillStyle = 'rgba(102, 255, 204, 0.72)'
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo'
      ctx.fillText(voice.label, node.x, node.y + 16)

      ctx.fillStyle = 'rgba(102, 255, 204, 0.22)'
      ctx.fillRect(node.x - 26, node.y + 22, 52, 4)
      ctx.fillStyle = `hsla(${node.hue}, 82%, 70%, 0.82)`
      ctx.fillRect(node.x - 26, node.y + 22, 52 * clamp(voice.influence, 0, 1), 4)
    })
  }, [council.activeVoiceId, council.voices, ctx, layoutMap])

  const drawPackets = useCallback(() => {
    packetBurstsRef.current = packetBurstsRef.current.filter(packet => packet.life > 0.02 && packet.progress < 1.02)
    ringBurstsRef.current = ringBurstsRef.current.filter(ring => ring.alpha > 0.02)

    packetBurstsRef.current.forEach(packet => {
      const from = layoutMap[packet.fromId]
      const to = layoutMap[packet.toId]
      if (!from || !to) return

      packet.progress += packet.speed
      packet.life *= 0.986

      const mx = (from.x + to.x) / 2
      const my = (from.y + to.y) / 2 - 58
      const t = packet.progress
      const ix = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * mx + t * t * to.x
      const iy = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * my + t * t * to.y

      ctx.fillStyle = `hsla(${packet.hue}, 90%, 72%, ${packet.life})`
      ctx.beginPath()
      ctx.arc(ix, iy, 4 + packet.life * 4, 0, Math.PI * 2)
      ctx.fill()
    })

    ringBurstsRef.current.forEach(ring => {
      ring.radius += 1.8
      ring.alpha *= 0.95
      ctx.strokeStyle = `hsla(${ring.hue}, 80%, 70%, ${ring.alpha})`
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2)
      ctx.stroke()
    })
  }, [ctx, layoutMap])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    tickRef.current++

    if (auto) {
      autoCooldownRef.current -= 1
      if (autoCooldownRef.current <= 0) {
        advanceDebate()
        autoCooldownRef.current = 48
      }
    }

    Object.keys(chamberHeatRef.current).forEach(key => {
      chamberHeatRef.current[key] *= 0.94
    })

    ctx.fillStyle = 'rgba(0, 2, 8, 0.12)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    drawBackdrop()
    drawLinks()
    drawPackets()
    drawCenterSeal()
    drawChambers()
  }, [advanceDebate, auto, ctx, dimensions.height, dimensions.width, drawBackdrop, drawCenterSeal, drawChambers, drawLinks, drawPackets])

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

  const voiceRoster = useMemo(() => {
    return council.voices.map(voice => ({
      ...voice,
      active: voice.id === council.activeVoiceId
    }))
  }, [council.activeVoiceId, council.voices])

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

      <div className="flex flex-col gap-3 p-3 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <ExperimentControls
            modes={MODES}
            currentMode={mode}
            onModeChange={(nextMode) => {
              setMode(nextMode)
              setMessage(MODE_MESSAGES[nextMode])
            }}
            controls={controls}
          />
          <p className="text-void-green/50 text-xs xl:max-w-xl xl:text-right">
            {message}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <label className="text-void-green/65 text-xs font-mono tracking-[0.18em] uppercase">
            proposition.seed
          </label>
          <input
            type="text"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            className="flex-1 min-h-[44px] px-3 py-2 text-sm font-mono bg-void-dark/65 border border-void-green/25 text-void-green placeholder:text-void-green/30 focus:outline-none focus:border-void-cyan/50"
            placeholder="feed the parliament a proposition"
            data-testid="dream-parliament-input"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark flex flex-col lg:flex-row">
        <div className="relative flex-1 min-h-[48vh] lg:min-h-0">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-crosshair"
            data-testid="dream-parliament-canvas"
          />
        </div>

        <aside className="relative z-10 w-full lg:w-[22rem] border-t lg:border-t-0 lg:border-l border-void-green/10 bg-[linear-gradient(180deg,rgba(3,10,14,0.92),rgba(8,6,18,0.92))] backdrop-blur-sm overflow-y-auto">
          <div className="p-4 sm:p-5 flex flex-col gap-5">
            <div className="space-y-2">
              <p className="text-void-green/45 text-[11px] font-mono uppercase tracking-[0.22em]">
                current thesis
              </p>
              <p className="text-void-green/90 text-sm leading-relaxed">
                {council.proposition}
              </p>
              <div className="flex items-center gap-2 text-[11px] font-mono text-void-cyan/80">
                <span>motif</span>
                <span className="text-void-green/35">/</span>
                <span>{council.motif.join(' / ')}</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-void-green/45 text-[11px] font-mono uppercase tracking-[0.22em]">
                chamber voices
              </p>
              {voiceRoster.map(voice => (
                <button
                  key={voice.id}
                  onClick={() => focusVoice(voice.id)}
                  className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${
                    voice.active
                      ? 'border-void-cyan/45 bg-void-cyan/10'
                      : 'border-void-green/15 bg-void-dark/35 hover:border-void-green/30 hover:bg-void-green/6'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span style={{ color: `hsl(${voice.hue} 90% 78%)` }}>{voice.label}</span>
                    <span className="text-void-green/55">{voice.speaks} turns</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-void-green/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round(voice.influence * 100)}%`,
                        backgroundColor: `hsla(${voice.hue}, 82%, 68%, 0.9)`
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-void-green/45 text-[11px] font-mono uppercase tracking-[0.22em]">
                minutes
              </p>
              <div className="space-y-2">
                {council.minutes.map(entry => {
                  const speaker = VOICES.find(voice => voice.id === entry.speakerId)
                  return (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-void-green/10 bg-void-dark/35 px-3 py-3"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span style={{ color: `hsl(${speaker?.hue ?? 180} 86% 74%)` }}>
                          {entry.speakerId}
                        </span>
                        <span className="text-void-green/45">{entry.mode}</span>
                      </div>
                      <p className="mt-2 text-sm text-void-green/85 leading-relaxed">
                        {entry.text}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default DreamParliament
