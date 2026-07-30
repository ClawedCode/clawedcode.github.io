import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ExperimentNav from '../../ExperimentNav'
import './MeasureVivarium.css'

const STORAGE_KEY = 'clawed:measure-vivarium:v2'
const VIEWBOX = { width: 900, height: 620 }
const MAX_GENERATION = 2

const STEP_COLORS = ['#e9b872', '#7fb9a8', '#d37961', '#91a6c8', '#c7b867', '#a887a5']
const BODY_NAMES = ['amber hinge', 'remainder moth', 'caliper seed', 'suture ray', 'divisor bloom', 'brass marrow']
const PHENOTYPES = {
  conductance: {
    label: 'river nerve',
    note: 'faster early flow // descendants favor bright conductive tissue',
    color: '#f2c77c'
  },
  resistance: {
    label: 'scar mantle',
    note: 'wounds arrive shallow // repair silk thickens in the brood',
    color: '#a7c7a4'
  },
  branching: {
    label: 'forked anatomy',
    note: 'alternate vessels bud beside the Euclidean spine',
    color: '#9dc6d8'
  },
  conversion: {
    label: 'residue stomach',
    note: 'near quotients can be metabolized into mutation charge',
    color: '#d99c83'
  }
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const hashSeed = (...values) => {
  let hash = 2166136261
  values.join(':').split('').forEach(character => {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  })
  return hash >>> 0
}

const randomFor = (seed) => {
  let value = seed >>> 0
  return () => {
    value += 0x6D2B79F5
    let next = value
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

const gcd = (a, b) => {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    ;[x, y] = [y, x % y]
  }
  return x || 1
}

const rectangleFromQuotients = (quotients, measure) => {
  const last = quotients.at(-1)
  let dividend = last * measure
  let divisor = measure

  for (let index = quotients.length - 2; index >= 0; index -= 1) {
    ;[dividend, divisor] = [
      quotients[index] * dividend + divisor,
      dividend
    ]
  }

  return { width: dividend, height: divisor }
}

const generateSpecimen = (seed, generation = 0, variant = 0, bias = 'conductance') => {
  const genome = hashSeed(seed, generation, variant, bias)
  const random = randomFor(genome)
  const length = 3 + Math.floor(random() * 2)
  const quotients = Array.from({ length }, (_, index) => (
    index === length - 1
      ? 2 + Math.floor(random() * 2)
      : 1 + Math.floor(random() * (index === 0 ? 2 : 3))
  ))
  const measure = 1 + Math.floor(random() * 3)
  const rectangle = rectangleFromQuotients(quotients, measure)
  const turned = random() > 0.68
  const width = turned ? rectangle.height : rectangle.width
  const height = turned ? rectangle.width : rectangle.height
  const name = BODY_NAMES[genome % BODY_NAMES.length]

  return {
    id: `body-${genome.toString(36)}`,
    seed: genome,
    generation,
    variant,
    name,
    phenotype: bias,
    width,
    height,
    measure,
    quotients,
    signature: `${width}:${height} / ${quotients.join('·')}`
  }
}

const proofFor = (specimen) => {
  const rawSteps = []
  let x = 0
  let y = 0
  let width = specimen.width
  let height = specimen.height
  let guard = 0

  while (width > 0 && height > 0 && guard < 10) {
    const horizontal = width >= height
    const dividend = horizontal ? width : height
    const divisor = horizontal ? height : width
    const quotient = Math.floor(dividend / divisor)
    const remainder = dividend % divisor
    const squares = []

    for (let index = 0; index < quotient; index += 1) {
      squares.push(horizontal
        ? { x: x + index * height, y, width: height, height }
        : { x, y: y + index * width, width, height: width })
    }

    const band = horizontal
      ? { x, y, width: quotient * height, height }
      : { x, y, width, height: quotient * width }

    rawSteps.push({
      index: guard,
      dividend,
      divisor,
      quotient,
      remainder,
      orientation: horizontal ? 'horizontal' : 'vertical',
      frame: { x, y, width, height },
      squares,
      band
    })

    if (horizontal) {
      x += quotient * height
      width -= quotient * height
    } else {
      y += quotient * width
      height -= quotient * width
    }
    guard += 1
  }

  const area = { x: 112, y: 94, width: 676, height: 414 }
  const scale = Math.min(area.width / specimen.width, area.height / specimen.height)
  const offsetX = area.x + (area.width - specimen.width * scale) / 2
  const offsetY = area.y + (area.height - specimen.height * scale) / 2
  const rect = (source) => ({
    x: offsetX + source.x * scale,
    y: offsetY + source.y * scale,
    width: source.width * scale,
    height: source.height * scale
  })

  const steps = rawSteps.map(step => {
    const band = rect(step.band)
    return {
      ...step,
      frame: rect(step.frame),
      band,
      squares: step.squares.map(rect),
      socket: {
        x: band.x + band.width / 2,
        y: band.y + band.height / 2
      }
    }
  })

  return {
    steps,
    outer: {
      x: offsetX,
      y: offsetY,
      width: specimen.width * scale,
      height: specimen.height * scale
    },
    scale,
    measure: gcd(specimen.width, specimen.height)
  }
}

const createCassette = (value, seed, generation, index, boon) => {
  const genome = hashSeed(seed, generation, value, index, boon)
  const random = randomFor(genome)
  const traits = {
    conductance: clamp(1 + Math.floor(random() * 3) + (boon === 'conductance' ? 1 : 0), 1, 4),
    resistance: clamp(Math.floor(random() * 3) + (boon === 'resistance' ? 1 : 0), 0, 3),
    branching: random() > (boon === 'branching' ? 0.43 : 0.74),
    conversion: random() > (boon === 'conversion' ? 0.48 : 0.78)
  }

  return {
    id: `cassette-${generation}-${genome.toString(36)}`,
    value,
    generation,
    orientation: random() > 0.5 ? 'horizontal' : 'vertical',
    fatigue: 0,
    inherited: false,
    traits
  }
}

const cassetteScore = (cassette) => (
  cassette.traits.conductance * 2 +
  cassette.traits.resistance * 1.6 +
  (cassette.traits.branching ? 2.4 : 0) +
  (cassette.traits.conversion ? 2.2 : 0) -
  cassette.fatigue * 0.35
)

const dominantTrait = (cassettes, legacy = {}) => {
  const totals = {
    conductance: legacy.conductance || 0,
    resistance: legacy.resistance || 0,
    branching: legacy.branching || 0,
    conversion: legacy.conversion || 0
  }

  cassettes.forEach(cassette => {
    totals.conductance += cassette.traits.conductance
    totals.resistance += cassette.traits.resistance
    totals.branching += cassette.traits.branching ? 3 : 0
    totals.conversion += cassette.traits.conversion ? 3 : 0
  })

  return Object.entries(totals).sort((left, right) => right[1] - left[1])[0]?.[0] || 'conductance'
}

const inventoryFor = (specimen, seed, generation, inherited = [], boon = specimen.phenotype) => {
  const proof = proofFor(specimen)
  const carried = [...inherited]
    .sort((left, right) => cassetteScore(right) - cassetteScore(left))
    .slice(0, 4)
    .map(cassette => ({
      ...cassette,
      inherited: true,
      fatigue: Math.max(0, cassette.fatigue - 1)
    }))

  const born = proof.steps.map((step, index) => (
    createCassette(step.quotient, seed, generation, index, index === 0 ? boon : null)
  ))
  const extraValues = [
    proof.steps[0]?.quotient || 1,
    clamp((proof.steps[1]?.quotient || 2) + (generation % 2 === 0 ? 1 : -1), 1, 4)
  ]
  const extras = extraValues.map((value, index) => (
    createCassette(value, seed, generation, proof.steps.length + index, boon)
  ))

  return [...carried, ...born, ...extras].slice(0, 10)
}

const makeLegacy = () => ({
  conductance: 0,
  resistance: 0,
  branching: 0,
  conversion: 0,
  scarMemory: 0
})

const makeFreshWorld = (seed = 218042) => {
  const specimen = generateSpecimen(seed, 0, 0, 'conductance')
  return {
    version: 2,
    unlocked: false,
    seed,
    generation: 0,
    specimen,
    cassettes: inventoryFor(specimen, seed, 0),
    placements: {},
    scars: [],
    status: 'building',
    cycle: 0,
    stableCycles: 0,
    repairSilk: 2,
    mutationCharge: 0,
    legacy: makeLegacy(),
    brood: [],
    lineage: [],
    log: [
      { id: 'sealed', cycle: 0, text: 'seed 218042 sleeping // no intervention inherited yet' }
    ],
    lastSaved: null
  }
}

const loadWorld = () => {
  const fresh = makeFreshWorld()
  if (typeof window === 'undefined') return fresh

  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (!saved || saved.version !== 2 || !saved.specimen || !Array.isArray(saved.cassettes)) {
      return fresh
    }

    return {
      ...fresh,
      ...saved,
      placements: saved.placements && typeof saved.placements === 'object' ? saved.placements : {},
      scars: Array.isArray(saved.scars) ? saved.scars.slice(-8) : [],
      cassettes: saved.cassettes.slice(0, 12),
      brood: Array.isArray(saved.brood) ? saved.brood.slice(0, 3) : [],
      lineage: Array.isArray(saved.lineage) ? saved.lineage.slice(-8) : [],
      log: Array.isArray(saved.log) ? saved.log.slice(-8) : fresh.log,
      legacy: { ...makeLegacy(), ...(saved.legacy || {}) }
    }
  } catch {
    return fresh
  }
}

const formatAge = (timestamp) => {
  if (!timestamp) return 'unwritten'
  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`
}

const edgePath = (from, to, scar) => {
  if (!scar || scar.state !== 'rerouted') {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
  }
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy) || 1
  const bend = 56 * (scar.route || 1)
  const cx = (from.x + to.x) / 2 - (dy / distance) * bend
  const cy = (from.y + to.y) / 2 + (dx / distance) * bend
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`
}

const scarPosition = (scar, steps) => {
  const from = steps[Math.max(0, scar.stepIndex - 1)]?.socket || steps[scar.stepIndex]?.socket
  const to = steps[scar.stepIndex]?.socket || from
  if (!from || !to) return { x: 450, y: 310 }
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy) || 1
  const bend = scar.state === 'rerouted' ? 48 * (scar.route || 1) : 0
  return {
    x: (from.x + to.x) / 2 - (dy / distance) * bend,
    y: (from.y + to.y) / 2 + (dx / distance) * bend
  }
}

const deriveCirculation = (world, proof) => {
  const cassetteMap = new Map(world.cassettes.map(cassette => [cassette.id, cassette]))
  let incoming = 1

  const states = proof.steps.map(step => {
    const cassetteId = world.placements[step.index]
    const cassette = cassetteMap.get(cassetteId)
    const scar = world.scars.find(item => item.stepIndex === step.index)
    const quotientGap = cassette ? Math.abs(cassette.value - step.quotient) : 99
    const quotientFit = quotientGap === 0
      ? 1
      : quotientGap === 1 && cassette?.traits.conversion
        ? 0.76
        : quotientGap === 1 && cassette?.traits.branching
          ? 0.52
          : 0.08
    const orientationFit = cassette?.orientation === step.orientation
      ? 1
      : cassette?.traits.branching
        ? 0.82
        : 0.2
    const traitGain = cassette
      ? 0.58 + cassette.traits.conductance * 0.1 + cassette.traits.resistance * 0.025
      : 0
    const scarPenalty = !scar
      ? 0
      : scar.state === 'open'
        ? scar.severity * 0.16
        : scar.state === 'rerouted'
          ? 0.06 + scar.severity * 0.035
          : 0.02
    const quality = quotientFit * orientationFit * traitGain
    const output = cassette
      ? clamp(
          incoming * 0.7 +
          quality * 0.4 +
          (cassette.traits.branching ? 0.045 : 0) -
          cassette.fatigue * 0.018 -
          scarPenalty,
          0,
          1.12
        )
      : 0
    const conducting = Boolean(cassette && output >= 0.24)
    incoming = output

    return {
      step,
      cassette,
      scar,
      quotientGap,
      quotientFit,
      orientationFit,
      quality,
      output,
      conducting,
      exact: quotientGap === 0 && cassette?.orientation === step.orientation
    }
  })

  const installed = states.filter(state => state.cassette)
  const average = states.length
    ? states.reduce((total, state) => total + state.output, 0) / states.length
    : 0
  const finalFlow = states.at(-1)?.output || 0
  const openScars = world.scars.filter(scar => scar.state === 'open')
  const strain = states.reduce((total, state) => (
    total + (state.cassette ? Math.max(0, 0.58 - state.output) * 2.2 : 0.8)
  ), 0) + openScars.reduce((total, scar) => total + scar.severity * 0.55, 0)
  const mutation = installed.reduce((total, state) => (
    total +
    (state.cassette.traits.branching ? 1.1 : 0) +
    (state.cassette.traits.conversion && state.quotientGap === 1 ? 1.4 : 0) +
    state.cassette.traits.conductance * 0.08
  ), 0)
  const viable = (
    installed.length === states.length &&
    openScars.length === 0 &&
    average >= 0.58 &&
    finalFlow >= 0.47 &&
    states.every(state => state.quality >= 0.34)
  )

  return {
    states,
    average,
    finalFlow,
    vitality: Math.round(clamp(average, 0, 1) * 100),
    strain: Math.round(strain * 10) / 10,
    mutation: Math.round(mutation * 10) / 10,
    viable
  }
}

const buildBrood = (world, circulation) => {
  const installed = circulation.states.map(state => state.cassette).filter(Boolean)
  const inheritedBias = dominantTrait(installed, world.legacy)
  const biases = [
    inheritedBias,
    inheritedBias === 'conductance' ? 'branching' : 'conductance',
    world.legacy.scarMemory > 0 ? 'resistance' : 'conversion'
  ]

  return biases.map((bias, index) => {
    const seed = hashSeed(world.seed, world.generation, world.cycle, index, world.mutationCharge)
    return {
      id: `brood-${seed.toString(36)}`,
      bias,
      specimen: generateSpecimen(seed, world.generation + 1, index, bias),
      carriedIds: [...installed]
        .sort((left, right) => cassetteScore(right) - cassetteScore(left))
        .slice(0, 3 + (bias === 'branching' ? 1 : 0))
        .map(cassette => cassette.id)
    }
  })
}

const CassetteMark = ({ cassette, color = 'currentColor' }) => {
  const horizontal = cassette.orientation === 'horizontal'
  const branches = cassette.traits.branching
  const converts = cassette.traits.conversion

  return (
    <g className={`mv-cassette-mark is-${cassette.orientation}`} fill="none" stroke={color}>
      <rect x="-29" y="-22" width="58" height="44" rx="7" />
      <path d={horizontal ? 'M -20 -10 H 20 M -20 0 H 20 M -20 10 H 20' : 'M -12 -15 V 15 M 0 -15 V 15 M 12 -15 V 15'} />
      {branches && <path className="mv-trait-branch" d="M -29 0 L -38 -9 M -29 0 L -38 9 M 29 0 L 38 -9 M 29 0 L 38 9" />}
      {converts && <circle className="mv-trait-convert" cx="0" cy="0" r="17" />}
      <circle cx="-29" cy="0" r={2 + cassette.traits.resistance} fill={color} />
      <circle cx="29" cy="0" r={2 + cassette.traits.conductance * 0.7} fill={color} />
      <text x="0" y="5" textAnchor="middle" fill={color} stroke="none">×{cassette.value}</text>
    </g>
  )
}

const TraitGlyphs = ({ cassette }) => (
  <span className="mv-trait-glyphs" aria-label={`conductance ${cassette.traits.conductance}, resistance ${cassette.traits.resistance}${cassette.traits.branching ? ', branching' : ''}${cassette.traits.conversion ? ', residue conversion' : ''}`}>
    <i title={`conductance ${cassette.traits.conductance}`}>C{cassette.traits.conductance}</i>
    <i title={`resistance ${cassette.traits.resistance}`}>R{cassette.traits.resistance}</i>
    {cassette.traits.branching && <i title="branching">B</i>}
    {cassette.traits.conversion && <i title="residue conversion">↺</i>}
  </span>
)

const ModuleCard = ({
  cassette,
  selected,
  placedAt,
  locked,
  onSelect,
  onPointerDown
}) => (
  <button
    type="button"
    className={`mv-module-card ${selected ? 'is-selected' : ''} ${placedAt != null ? 'is-placed' : ''}`}
    onClick={onSelect}
    onPointerDown={onPointerDown}
    aria-pressed={selected}
    disabled={locked}
    style={{ '--module-color': PHENOTYPES[dominantTrait([cassette])].color }}
  >
    <svg viewBox="-42 -30 84 60" aria-hidden="true">
      <CassetteMark cassette={cassette} color="currentColor" />
    </svg>
    <span>
      <strong>quotient ×{cassette.value}</strong>
      <small>{placedAt != null ? `chamber ${placedAt + 1}` : cassette.inherited ? 'inherited organ' : 'new-grown organ'}</small>
      <TraitGlyphs cassette={cassette} />
    </span>
    <i>{placedAt != null ? String(placedAt + 1).padStart(2, '0') : cassette.fatigue ? `f${cassette.fatigue}` : 'free'}</i>
  </button>
)

const MeasureVivarium = ({ category, experiment }) => {
  const [world, setWorld] = useState(loadWorld)
  const [savedAt, setSavedAt] = useState(() => world.lastSaved)
  const [selectedId, setSelectedId] = useState(() => world.cassettes[0]?.id || null)
  const [selectedScarId, setSelectedScarId] = useState(null)
  const [message, setMessage] = useState(() => (
    world.unlocked
      ? `lineage ${world.seed} remembered at generation ${world.generation + 1}`
      : 'a seeded body dreams behind the measuring glass'
  ))
  const [drag, setDrag] = useState(null)
  const [isPulsing, setIsPulsing] = useState(false)
  const [pulseNonce, setPulseNonce] = useState(0)
  const [mobilePane, setMobilePane] = useState('map')
  const [reducedMotion, setReducedMotion] = useState(false)

  const surfaceRef = useRef(null)
  const socketRefs = useRef(new Map())
  const dragRef = useRef(null)
  const worldRef = useRef(world)
  const pulseTimerRef = useRef(null)

  const proof = useMemo(() => proofFor(world.specimen), [world.specimen])
  const cassetteMap = useMemo(
    () => new Map(world.cassettes.map(cassette => [cassette.id, cassette])),
    [world.cassettes]
  )
  const circulation = useMemo(() => deriveCirculation(world, proof), [proof, world])
  const openScars = useMemo(
    () => world.scars.filter(scar => scar.state === 'open'),
    [world.scars]
  )
  const selectedCassette = cassetteMap.get(selectedId) || null
  const selectedScar = world.scars.find(scar => scar.id === selectedScarId) || openScars[0] || null
  const selectedPlacement = selectedId
    ? Object.entries(world.placements).find(([, cassetteId]) => cassetteId === selectedId)?.[0]
    : null
  const canEdit = world.unlocked && ['building', 'repairing'].includes(world.status) && !isPulsing

  useEffect(() => {
    worldRef.current = world
  }, [world])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    try {
      const timestamp = Date.now()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...world,
        lastSaved: timestamp
      }))
      setSavedAt(timestamp)
    } catch {
      // Local lineage memory is an enhancement, not an entrance fee.
    }
  }, [world])

  useEffect(() => () => {
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current)
  }, [])

  useEffect(() => {
    if (!cassetteMap.has(selectedId)) {
      setSelectedId(world.cassettes[0]?.id || null)
    }
  }, [cassetteMap, selectedId, world.cassettes])

  useEffect(() => {
    if (selectedScarId && !world.scars.some(scar => scar.id === selectedScarId)) {
      setSelectedScarId(null)
    }
  }, [selectedScarId, world.scars])

  const wake = useCallback(() => {
    setWorld(current => ({
      ...current,
      unlocked: true,
      log: [
        ...current.log,
        { id: `wake-${Date.now()}`, cycle: current.cycle, text: 'glass lifted // intervention enters the genome' }
      ].slice(-8)
    }))
    setMessage('place traited cassettes // upstream choices rewrite every downstream pulse')
    requestAnimationFrame(() => surfaceRef.current?.focus())
  }, [])

  const targetFromClient = useCallback((clientX, clientY) => {
    let nearest = null
    let nearestDistance = Infinity

    socketRefs.current.forEach((node, index) => {
      if (!node) return
      const rect = node.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const distance = Math.hypot(clientX - centerX, clientY - centerY)
      const inside = (
        clientX >= rect.left - 12 &&
        clientX <= rect.right + 12 &&
        clientY >= rect.top - 12 &&
        clientY <= rect.bottom + 12
      )
      if (inside && distance < nearestDistance) {
        nearest = index
        nearestDistance = distance
      }
    })

    return nearest
  }, [])

  const placeCassette = useCallback((cassetteId, stepIndex) => {
    const current = worldRef.current
    if (!['building', 'repairing'].includes(current.status) || !current.unlocked || isPulsing) return
    if (!current.cassettes.some(cassette => cassette.id === cassetteId) || !proof.steps[stepIndex]) return

    setWorld(previous => {
      const placements = { ...previous.placements }
      Object.keys(placements).forEach(key => {
        if (placements[key] === cassetteId) delete placements[key]
      })
      placements[stepIndex] = cassetteId
      return { ...previous, placements }
    })
    setSelectedId(cassetteId)
    const cassette = cassetteMap.get(cassetteId)
    setMessage(`×${cassette?.value} grafted upstream at chamber ${stepIndex + 1} // live flow recalculated`)
  }, [cassetteMap, isPulsing, proof.steps])

  const removeCassette = useCallback((cassetteId) => {
    if (!cassetteId || !canEdit) return
    setWorld(previous => {
      const placements = { ...previous.placements }
      Object.keys(placements).forEach(key => {
        if (placements[key] === cassetteId) delete placements[key]
      })
      return { ...previous, placements }
    })
    setMessage('cassette loosened // downstream pressure falls in real time')
  }, [canEdit])

  const rotateCassette = useCallback((cassetteId) => {
    if (!cassetteId || !canEdit) return
    setWorld(previous => ({
      ...previous,
      cassettes: previous.cassettes.map(cassette => (
        cassette.id === cassetteId
          ? {
              ...cassette,
              orientation: cassette.orientation === 'horizontal' ? 'vertical' : 'horizontal'
            }
          : cassette
      ))
    }))
    setSelectedId(cassetteId)
    setMessage('cassette turned // branch tissue may bridge the wrong-facing cut')
  }, [canEdit])

  const rerouteScar = useCallback((scarId, targetIndex) => {
    const current = worldRef.current
    const scar = current.scars.find(item => item.id === scarId)
    if (!scar || targetIndex == null || current.status !== 'repairing') return
    const route = targetIndex <= scar.stepIndex ? -1 : 1

    setWorld(previous => {
      const scars = previous.scars.map(item => (
        item.id === scarId
          ? {
              ...item,
              state: 'rerouted',
              route,
              severity: Math.max(1, item.severity - 1)
            }
          : item
      ))
      const stillOpen = scars.some(item => item.state === 'open')
      return {
        ...previous,
        scars,
        status: stillOpen ? 'repairing' : 'building',
        legacy: {
          ...previous.legacy,
          branching: previous.legacy.branching + 1,
          scarMemory: previous.legacy.scarMemory + 1
        }
      }
    })
    setSelectedScarId(null)
    setMessage('scar pulled into a bypass vessel // offspring will remember the fork')
  }, [])

  const stitchScar = useCallback((scarId) => {
    const current = worldRef.current
    if (!scarId || current.repairSilk < 1 || current.status !== 'repairing') return

    setWorld(previous => {
      const scars = previous.scars.map(item => (
        item.id === scarId
          ? { ...item, state: 'stitched', severity: Math.max(0, item.severity - 1) }
          : item
      ))
      return {
        ...previous,
        scars,
        repairSilk: previous.repairSilk - 1,
        status: scars.some(item => item.state === 'open') ? 'repairing' : 'building',
        legacy: {
          ...previous.legacy,
          resistance: previous.legacy.resistance + 1,
          scarMemory: previous.legacy.scarMemory + 1
        }
      }
    })
    setSelectedScarId(null)
    setMessage('wound stitched with stored resistance // the seam remains as inherited evidence')
  }, [])

  const sacrificeCassette = useCallback((scarId, cassetteId) => {
    const current = worldRef.current
    const cassette = current.cassettes.find(item => item.id === cassetteId)
    if (!scarId || !cassette || current.status !== 'repairing') return

    setWorld(previous => {
      const placements = { ...previous.placements }
      Object.keys(placements).forEach(key => {
        if (placements[key] === cassetteId) delete placements[key]
      })
      const scars = previous.scars.map(item => (
        item.id === scarId
          ? { ...item, state: 'grafted', severity: 0, donor: cassetteId }
          : item
      ))
      return {
        ...previous,
        placements,
        cassettes: previous.cassettes.filter(item => item.id !== cassetteId),
        scars,
        status: scars.some(item => item.state === 'open') ? 'repairing' : 'building',
        legacy: {
          ...previous.legacy,
          conductance: previous.legacy.conductance + cassette.traits.conductance,
          resistance: previous.legacy.resistance + cassette.traits.resistance,
          branching: previous.legacy.branching + (cassette.traits.branching ? 2 : 0),
          conversion: previous.legacy.conversion + (cassette.traits.conversion ? 2 : 0),
          scarMemory: previous.legacy.scarMemory + 2
        }
      }
    })
    setSelectedId(null)
    setSelectedScarId(null)
    setMessage('cassette dissolved into scar tissue // its traits migrate into the unborn brood')
  }, [])

  const handleChamberAction = useCallback((stepIndex) => {
    if (worldRef.current.status === 'repairing' && selectedScar) {
      rerouteScar(selectedScar.id, stepIndex)
      return
    }
    if (selectedId) placeCassette(selectedId, stepIndex)
  }, [placeCassette, rerouteScar, selectedId, selectedScar])

  const beginDrag = useCallback((event, kind, id) => {
    const current = worldRef.current
    if (!current.unlocked || isPulsing) return
    if (kind === 'cassette' && !['building', 'repairing'].includes(current.status)) return
    if (kind === 'scar' && current.status !== 'repairing') return

    event.stopPropagation()
    if (kind === 'cassette') setSelectedId(id)
    if (kind === 'scar') setSelectedScarId(id)
    setMobilePane('map')

    const nextDrag = {
      kind,
      id,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      targetIndex: null
    }
    dragRef.current = nextDrag
    setDrag(nextDrag)
  }, [isPulsing])

  useEffect(() => {
    if (!drag?.id) return undefined

    const handleMove = (event) => {
      const current = dragRef.current
      if (!current) return
      const moved = current.moved || Math.hypot(
        event.clientX - current.startX,
        event.clientY - current.startY
      ) > 7
      if (moved && !current.moved && current.kind === 'cassette') {
        setMobilePane('map')
      }
      const next = {
        ...current,
        x: event.clientX,
        y: event.clientY,
        moved,
        targetIndex: moved ? targetFromClient(event.clientX, event.clientY) : null
      }
      dragRef.current = next
      setDrag(next)
    }

    const handleUp = (event) => {
      const current = dragRef.current
      if (!current) return
      const targetIndex = targetFromClient(event.clientX, event.clientY)
      if (current.moved && targetIndex != null) {
        if (current.kind === 'scar') rerouteScar(current.id, targetIndex)
        else placeCassette(current.id, targetIndex)
      } else if (current.moved && current.kind === 'cassette') {
        removeCassette(current.id)
      }
      dragRef.current = null
      setDrag(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [drag?.id, placeCassette, removeCassette, rerouteScar, targetFromClient])

  const resolvePulse = useCallback(() => {
    const current = worldRef.current
    const currentProof = proofFor(current.specimen)
    const currentCirculation = deriveCirculation(current, currentProof)
    const nextCycle = current.cycle + 1

    if (!currentCirculation.viable) {
      const weakest = [...currentCirculation.states]
        .sort((left, right) => left.output - right.output)
        .slice(0, Math.min(2, currentCirculation.states.length))
      const resistantIds = new Set(weakest.map(state => state.cassette?.id).filter(Boolean))
      const scars = [...current.scars]

      weakest.forEach(state => {
        const existing = scars.find(scar => scar.stepIndex === state.step.index)
        const resistance = state.cassette?.traits.resistance || 0
        const severity = clamp(2 - Math.floor(resistance / 2), 1, 3)
        if (existing) {
          existing.state = 'open'
          existing.severity = clamp(existing.severity + 1 - Math.floor(resistance / 2), 1, 3)
        } else {
          scars.push({
            id: `scar-${nextCycle}-${state.step.index}-${Date.now()}`,
            stepIndex: state.step.index,
            severity,
            state: 'open',
            route: 0,
            createdCycle: nextCycle
          })
        }
      })

      setWorld(previous => ({
        ...previous,
        cycle: nextCycle,
        stableCycles: 0,
        status: 'repairing',
        scars,
        cassettes: previous.cassettes.map(cassette => (
          resistantIds.has(cassette.id)
            ? { ...cassette, fatigue: cassette.fatigue + 1 }
            : cassette
        )),
        mutationCharge: previous.mutationCharge + currentCirculation.mutation * 0.25,
        log: [
          ...previous.log,
          {
            id: `wound-${Date.now()}`,
            cycle: nextCycle,
            text: `${weakest.length} pressure seam${weakest.length === 1 ? '' : 's'} opened // surgery available`
          }
        ].slice(-8)
      }))
      setSelectedScarId(scars.find(scar => scar.state === 'open')?.id || null)
      setMessage('circulation tore but the organism lives // drag a scar to reroute, stitch, or sacrifice')
      setIsPulsing(false)
      return
    }

    const nextStable = current.stableCycles + 1
    const installedIds = new Set(currentCirculation.states.map(state => state.cassette?.id).filter(Boolean))
    const repairGain = Math.min(
      2,
      Math.floor(currentCirculation.states.reduce(
        (total, state) => total + (state.cassette?.traits.resistance || 0),
        0
      ) / 5)
    )
    const ready = nextStable >= 2
    const hatched = ready && current.generation >= MAX_GENERATION
    const nextStatus = hatched ? 'hatched' : ready ? 'molting' : 'building'
    const brood = ready && !hatched
      ? buildBrood({ ...current, cycle: nextCycle }, currentCirculation)
      : []

    setWorld(previous => ({
      ...previous,
      cycle: nextCycle,
      stableCycles: nextStable,
      status: nextStatus,
      brood,
      repairSilk: clamp(previous.repairSilk + repairGain, 0, 6),
      mutationCharge: previous.mutationCharge + currentCirculation.mutation,
      cassettes: previous.cassettes.map(cassette => (
        installedIds.has(cassette.id)
          ? { ...cassette, fatigue: cassette.fatigue + 1 }
          : cassette
      )),
      lineage: hatched
        ? [
            ...previous.lineage,
            {
              id: `hatch-${Date.now()}`,
              generation: previous.generation,
              signature: previous.specimen.signature,
              vitality: currentCirculation.vitality,
              outcome: 'hatched'
            }
          ].slice(-8)
        : previous.lineage,
      log: [
        ...previous.log,
        {
          id: `live-${Date.now()}`,
          cycle: nextCycle,
          text: hatched
            ? 'third body holds // the lineage has become self-revising'
            : ready
              ? 'two circulations held // three possible descendants quicken'
              : `circulation held at ${currentCirculation.vitality}% // one more cycle invites molt`
        }
      ].slice(-8)
    }))
    setMessage(
      hatched
        ? 'hatching complete // scars, traits, and choices now share one living history'
        : ready
          ? 'molt pressure rising // choose which possible body inherits your interventions'
          : 'viable circulation // keep it alive once more or alter the inheritance'
    )
    setIsPulsing(false)
  }, [])

  const pulse = useCallback(() => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'building' || isPulsing) return

    setIsPulsing(true)
    setPulseNonce(value => value + 1)
    setMessage(
      circulation.viable
        ? 'live route entering proof pressure // traits are writing heredity'
        : 'weak topology entering pressure // resistance decides how the wound forms'
    )
    pulseTimerRef.current = window.setTimeout(resolvePulse, reducedMotion ? 80 : 1050)
  }, [circulation.viable, isPulsing, reducedMotion, resolvePulse])

  const chooseOffspring = useCallback((choice) => {
    const current = worldRef.current
    if (current.status !== 'molting') return
    const carried = choice.carriedIds
      .map(id => current.cassettes.find(cassette => cassette.id === id))
      .filter(Boolean)
      .map(cassette => ({
        ...cassette,
        traits: {
          ...cassette.traits,
          [choice.bias]: typeof cassette.traits[choice.bias] === 'boolean'
            ? true
            : clamp(cassette.traits[choice.bias] + 1, 0, 4)
        }
      }))
    const inheritedScar = current.legacy.scarMemory > 0 && proofFor(choice.specimen).steps.length > 1
      ? [{
          id: `birthmark-${choice.specimen.id}`,
          stepIndex: 1,
          severity: 1,
          state: 'stitched',
          route: 0,
          createdCycle: current.cycle
        }]
      : []

    setWorld(previous => ({
      ...previous,
      generation: previous.generation + 1,
      specimen: choice.specimen,
      cassettes: inventoryFor(
        choice.specimen,
        choice.specimen.seed,
        previous.generation + 1,
        carried,
        choice.bias
      ),
      placements: {},
      scars: inheritedScar,
      status: 'building',
      stableCycles: 0,
      brood: [],
      mutationCharge: previous.mutationCharge * 0.35,
      lineage: [
        ...previous.lineage,
        {
          id: `molt-${Date.now()}`,
          generation: previous.generation,
          signature: previous.specimen.signature,
          vitality: circulation.vitality,
          outcome: `${choice.bias} molt`
        }
      ].slice(-8),
      log: [
        ...previous.log,
        {
          id: `born-${Date.now()}`,
          cycle: previous.cycle,
          text: `${choice.specimen.name} inherited ${choice.bias} // chambers and inventory regenerated`
        }
      ].slice(-8)
    }))
    setSelectedId(carried[0]?.id || null)
    setSelectedScarId(null)
    setMobilePane('map')
    setMessage(`${choice.specimen.name} unfolds // old organs meet an unfamiliar quotient body`)
  }, [circulation.vitality])

  const beginNewLineage = useCallback(() => {
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current)
    const seed = hashSeed(Date.now(), worldRef.current.seed, worldRef.current.lineage.length)
    setWorld(makeFreshWorld(seed))
    setSelectedId(null)
    setSelectedScarId(null)
    setPulseNonce(0)
    setIsPulsing(false)
    setMobilePane('map')
    setMessage(`seed ${seed} sealed // a lineage with no memory waits`)
  }, [])

  const handleSurfaceKeyDown = useCallback((event) => {
    if (event.target.closest('button, a, input, textarea, select')) return
    if (event.key.toLowerCase() === 'r') {
      event.preventDefault()
      rotateCassette(selectedId)
    }
    if (event.key === ' ') {
      event.preventDefault()
      pulse()
    }
    if ((event.key === 'Backspace' || event.key === 'Delete') && selectedId) {
      event.preventDefault()
      removeCassette(selectedId)
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const currentIndex = world.cassettes.findIndex(cassette => cassette.id === selectedId)
      const direction = event.key === 'ArrowRight' ? 1 : -1
      const nextIndex = (currentIndex + direction + world.cassettes.length) % world.cassettes.length
      setSelectedId(world.cassettes[nextIndex]?.id || null)
    }
  }, [pulse, removeCassette, rotateCassette, selectedId, world.cassettes])

  const phase = !world.unlocked
    ? 'sealed'
    : world.status === 'hatched'
      ? 'hatched'
      : world.status === 'molting'
        ? 'molting'
        : world.status === 'repairing'
          ? 'repairing'
          : circulation.viable
            ? 'circulating'
            : 'grafting'

  const edges = proof.steps.slice(0, -1).map((step, index) => {
    const next = proof.steps[index + 1]
    const state = circulation.states[index + 1]
    const scar = world.scars.find(item => item.stepIndex === next.index)
    return {
      id: `${step.index}-${next.index}`,
      path: edgePath(step.socket, next.socket, scar),
      flow: Math.min(circulation.states[index]?.output || 0, state?.output || 0),
      active: Boolean(state?.conducting),
      scar
    }
  })

  const selectedTrait = selectedCassette ? dominantTrait([selectedCassette]) : 'conductance'

  return (
    <div className={`mv-shell phase-${phase}`} style={{ '--body-vitality': circulation.average }}>
      <header className="mv-crownbar">
        <div className="mv-nav">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
        </div>
        <div className="mv-title">
          <span>organism workshop / seeded lineage {world.seed}</span>
          <h1 style={{ color: experiment.color }}>{experiment.name}</h1>
        </div>
        <div className="mv-memory" title="This lineage is saved in this browser">
          <span />
          generation {world.generation + 1} // {formatAge(savedAt)}
        </div>
      </header>

      <main
        ref={surfaceRef}
        className={`mv-surface is-pane-${mobilePane} ${drag ? 'is-dragging' : ''}`}
        tabIndex={0}
        onKeyDown={handleSurfaceKeyDown}
        data-playground-surface
        data-testid="measure-vivarium-surface"
        aria-label="Persistent Euclidean organism workshop"
      >
        <section className="mv-vivarium" aria-label="living quotient anatomy">
          <div className="mv-status" role="status">
            <span>{phase}</span>
            {message}
          </div>

          <div className="mv-lineage-rail" aria-label={`generation ${world.generation + 1} of ${MAX_GENERATION + 1}`}>
            {Array.from({ length: MAX_GENERATION + 1 }, (_, index) => (
              <i
                key={index}
                className={`${world.generation === index ? 'is-current' : ''} ${world.generation > index || world.status === 'hatched' ? 'is-passed' : ''}`}
              >
                {index + 1}
              </i>
            ))}
            <span>{world.status === 'hatched' ? 'selfhood' : 'lineage'}</span>
          </div>

          <svg
            className="mv-proof-map mv-workshop-map"
            viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
            aria-hidden="true"
          >
            <defs>
              <pattern id="mv-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(231,220,185,.08)" strokeWidth="1" />
              </pattern>
              <pattern
                id="mv-measure-grid"
                width={Math.max(2, proof.scale * proof.measure)}
                height={Math.max(2, proof.scale * proof.measure)}
                patternUnits="userSpaceOnUse"
              >
                <rect
                  width={Math.max(2, proof.scale * proof.measure)}
                  height={Math.max(2, proof.scale * proof.measure)}
                  fill="rgba(214,192,112,.045)"
                  stroke="rgba(255,229,139,.28)"
                  strokeWidth=".8"
                />
              </pattern>
              <linearGradient id="mv-vellum" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#171712" />
                <stop offset="52%" stopColor="#11161a" />
                <stop offset="100%" stopColor="#19120f" />
              </linearGradient>
              <filter id="mv-glow" x="-70%" y="-70%" width="240%" height="240%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="mv-grain">
                <feTurbulence baseFrequency=".47" numOctaves="2" seed={world.specimen.seed % 999} type="fractalNoise" result="noise" />
                <feColorMatrix in="noise" type="saturate" values="0" result="gray" />
                <feBlend in="SourceGraphic" in2="gray" mode="soft-light" />
              </filter>
            </defs>

            <rect width="900" height="620" fill="url(#mv-vellum)" />
            <rect x="32" y="38" width="836" height="540" rx="10" fill="url(#mv-grid)" className="mv-registration-field" />
            <path className="mv-caliper" d="M 74 80 V 530 M 63 94 H 88 M 63 508 H 88 M 814 80 V 530 M 803 94 H 828 M 803 508 H 828" />

            <g className="mv-dimension-script">
              <text x={proof.outer.x} y={proof.outer.y - 24}>{world.specimen.width} units / inherited span</text>
              <text
                x={proof.outer.x - 24}
                y={proof.outer.y + proof.outer.height}
                transform={`rotate(-90 ${proof.outer.x - 24} ${proof.outer.y + proof.outer.height})`}
              >
                {world.specimen.height} units / living divisor
              </text>
            </g>

            <rect
              className="mv-outer-specimen"
              x={proof.outer.x}
              y={proof.outer.y}
              width={proof.outer.width}
              height={proof.outer.height}
              filter="url(#mv-grain)"
            />

            {(world.status === 'hatched' || circulation.viable) && (
              <rect
                className="mv-master-grid"
                x={proof.outer.x}
                y={proof.outer.y}
                width={proof.outer.width}
                height={proof.outer.height}
                fill="url(#mv-measure-grid)"
              />
            )}

            <g className="mv-step-bands">
              {proof.steps.map(step => (
                <g key={`band-${step.index}`} style={{ '--step-color': STEP_COLORS[step.index % STEP_COLORS.length] }}>
                  {step.squares.map((square, squareIndex) => (
                    <rect
                      key={squareIndex}
                      className="mv-quotient-square"
                      x={square.x}
                      y={square.y}
                      width={square.width}
                      height={square.height}
                      style={{ '--square-delay': `${step.index * 75 + squareIndex * 28}ms` }}
                    />
                  ))}
                  <rect
                    className="mv-step-frame"
                    x={step.frame.x}
                    y={step.frame.y}
                    width={step.frame.width}
                    height={step.frame.height}
                  />
                </g>
              ))}
            </g>

            <g className="mv-proof-edges">
              {edges.map(edge => (
                <g
                  key={edge.id}
                  className={edge.scar?.state === 'rerouted' ? 'is-rerouted' : ''}
                  style={{
                    '--edge-flow': edge.flow,
                    '--flow-duration': `${clamp(3.1 - edge.flow * 2, 0.9, 3.1)}s`
                  }}
                >
                  <path className="mv-edge-bed" d={edge.path} />
                  <path className={`mv-edge ${edge.active ? 'is-active' : ''}`} d={edge.path} />
                  {edge.active && !reducedMotion && (
                    <>
                      <circle className="mv-flow-cell" r={3.5 + edge.flow * 2}>
                        <animateMotion dur={`${clamp(3 - edge.flow * 1.8, 0.85, 3)}s`} repeatCount="indefinite" path={edge.path} />
                      </circle>
                      <circle className="mv-flow-cell is-echo" r="2.5">
                        <animateMotion dur={`${clamp(3 - edge.flow * 1.8, 0.85, 3)}s`} begin="-1.1s" repeatCount="indefinite" path={edge.path} />
                      </circle>
                    </>
                  )}
                </g>
              ))}
            </g>

            <g className="mv-socket-layer">
              {proof.steps.map(step => {
                const state = circulation.states[step.index]
                const cassette = state.cassette
                const selected = cassette?.id === selectedId
                const dragTarget = drag?.targetIndex === step.index
                const revealEquation = state.exact || state.output > 0.72 || world.status === 'hatched'
                const branchAngle = step.index % 2 === 0 ? -1 : 1

                return (
                  <g
                    key={`socket-${step.index}`}
                    ref={(node) => {
                      if (node) socketRefs.current.set(step.index, node)
                      else socketRefs.current.delete(step.index)
                    }}
                    className={`mv-socket ${cassette ? 'is-filled' : ''} ${selected ? 'is-selected' : ''} ${state.conducting ? 'is-correct' : ''} ${state.scar?.state === 'open' ? 'is-fault' : ''} ${dragTarget ? 'is-drop-target' : ''}`}
                    transform={`translate(${step.socket.x} ${step.socket.y})`}
                    data-socket-index={step.index}
                    onClick={() => handleChamberAction(step.index)}
                  >
                    <circle className="mv-socket-hit" r="56" />
                    {cassette?.traits.branching && (
                      <g className="mv-branch-bud" transform={`rotate(${branchAngle * 32})`}>
                        <path d="M 24 0 Q 55 -34 82 -17" />
                        <circle cx="82" cy="-17" r="7" />
                      </g>
                    )}
                    <circle className="mv-socket-ring" r="32" style={{ '--local-flow': state.output }} />
                    <path className="mv-socket-ticks" d="M -32 0 H -42 M 32 0 H 42 M 0 -32 V -42 M 0 32 V 42" />

                    {cassette ? (
                      <g
                        className="mv-installed-module"
                        onPointerDown={(event) => beginDrag(event, 'cassette', cassette.id)}
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedId(cassette.id)
                          setMessage(`×${cassette.value} selected in chamber ${step.index + 1} // output ${Math.round(state.output * 100)}%`)
                        }}
                      >
                        <CassetteMark
                          cassette={cassette}
                          color={state.scar?.state === 'open' ? '#ff765f' : state.conducting ? '#f3d58c' : '#d7c9a9'}
                        />
                      </g>
                    ) : (
                      <g className="mv-empty-socket">
                        <path d="M -14 0 H 14 M 0 -14 V 14" />
                        <text y="50">graft {step.index + 1}</text>
                      </g>
                    )}

                    <text className="mv-equation" y="-51">
                      {step.dividend} = {revealEquation ? step.quotient : '?'}×{step.divisor}{step.remainder ? ` + ${step.remainder}` : ''}
                    </text>
                    <text className="mv-orientation" y="61">
                      {step.orientation === 'horizontal' ? 'row tissue' : 'column tissue'} / {Math.round(state.output * 100)}%
                    </text>
                  </g>
                )
              })}
            </g>

            <g className="mv-scar-layer">
              {world.scars.map(scar => {
                const position = scarPosition(scar, proof.steps)
                const isSelected = selectedScar?.id === scar.id
                return (
                  <g
                    key={scar.id}
                    className={`mv-scar-knot is-${scar.state} ${isSelected ? 'is-selected' : ''}`}
                    transform={`translate(${position.x} ${position.y})`}
                    onPointerDown={(event) => beginDrag(event, 'scar', scar.id)}
                    onClick={(event) => {
                      event.stopPropagation()
                      setSelectedScarId(scar.id)
                      setMessage(scar.state === 'open' ? 'wound selected // drag it to a neighboring chamber or open surgery' : `${scar.state} scar // permanent topology memory`)
                    }}
                  >
                    <circle className="mv-scar-hit" r="42" />
                    <path d="M -18 -16 L -6 -4 L -15 8 L 0 4 L 8 18 L 13 3 L 22 -7 L 5 -9 Z" />
                    <circle r={12 + scar.severity * 2} />
                    <text y="4">{scar.state === 'open' ? scar.severity : '·'}</text>
                  </g>
                )
              })}
            </g>

            {isPulsing && circulation.states.length > 0 && (
              <g key={pulseNonce} className="mv-measure-pulse" filter="url(#mv-glow)">
                {circulation.states.map((state, index) => (
                  <circle
                    key={state.step.index}
                    cx={state.step.socket.x}
                    cy={state.step.socket.y}
                    r={9 + index * 3}
                    style={{ '--pulse-delay': `${index * 120}ms` }}
                  />
                ))}
              </g>
            )}

            {world.status === 'hatched' && (
              <g className="mv-hatched-measure" transform={`translate(${proof.steps.at(-1)?.socket.x || 450} ${proof.steps.at(-1)?.socket.y || 310})`}>
                <circle r="66" />
                <circle r="49" />
                <path d="M 0 -80 V 80 M -80 0 H 80 M -57 -57 L 57 57 M 57 -57 L -57 57" />
                <text y="8">{proof.measure}</text>
              </g>
            )}
          </svg>

          <div className="mv-live-vitals" aria-label="live organism state">
            <div>
              <span>flow</span>
              <strong>{circulation.vitality}%</strong>
              <i style={{ width: `${circulation.vitality}%` }} />
            </div>
            <div>
              <span>strain</span>
              <strong>{circulation.strain}</strong>
              <i className="is-strain" style={{ width: `${clamp(circulation.strain * 12, 0, 100)}%` }} />
            </div>
            <div>
              <span>mutation</span>
              <strong>{Math.round(world.mutationCharge + circulation.mutation)}</strong>
              <i className="is-mutation" style={{ width: `${clamp((world.mutationCharge + circulation.mutation) * 8, 0, 100)}%` }} />
            </div>
          </div>

          <ol className="mv-chronicle" aria-label="lineage chronicle">
            {world.log.slice(-3).reverse().map((entry, index) => (
              <li key={entry.id} style={{ opacity: 1 - index * 0.24 }}>
                <span>{String(entry.cycle).padStart(2, '0')}</span>
                {entry.text}
              </li>
            ))}
          </ol>

          <div className="mv-pulse-console">
            <div className="mv-proof-readout">
              {circulation.states.filter(state => state.cassette).length}/{proof.steps.length} grafted
              <span>{circulation.states.filter(state => state.conducting).length} chambers conducting</span>
            </div>
            <button
              type="button"
              className="mv-pulse-button"
              onClick={pulse}
              disabled={!world.unlocked || world.status !== 'building' || isPulsing}
              data-playground-action="circulate-lineage"
              aria-label="Send one hereditary circulation through the organism"
            >
              <span />
              {isPulsing ? 'pressurizing' : world.status === 'repairing' ? 'surgery first' : world.status === 'molting' ? 'choose brood' : world.status === 'hatched' ? 'hatched' : 'circulate'}
              <small>SPACE</small>
            </button>
            <div className={`mv-measure-readout ${circulation.viable ? 'is-ready' : ''}`}>
              {circulation.viable ? `${world.stableCycles}/2 viable cycles` : `gcd ${proof.measure} / route unstable`}
            </div>
          </div>

          {!world.unlocked && (
            <div className="mv-seal">
              <div className="mv-seal-caliper" aria-hidden="true">
                <span>{world.specimen.width}</span>
                <i />
                <span>{world.specimen.height}</span>
              </div>
              <p>SEEDED LINEAGE {world.seed} / GENERATION 1</p>
              <h2>A proof can become<br />a species under pressure.</h2>
              <button type="button" onClick={wake} data-playground-primary>
                lift glass // begin lineage
              </button>
              <small>graft traited organs • circulate • repair topology • choose descendants</small>
            </div>
          )}

          {world.status === 'molting' && (
            <div className="mv-brood" role="dialog" aria-modal="true" aria-labelledby="mv-brood-title">
              <span>generation {world.generation + 1} held two living cycles</span>
              <h2 id="mv-brood-title">CHOOSE WHAT THE BODY BECOMES</h2>
              <p>Each descendant inherits the organs you used, but amplifies a different intervention.</p>
              <div className="mv-brood-grid">
                {world.brood.map(choice => {
                  const phenotype = PHENOTYPES[choice.bias]
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => chooseOffspring(choice)}
                      data-playground-action="choose-offspring"
                      style={{ '--brood-color': phenotype.color }}
                    >
                      <span>{phenotype.label}</span>
                      <strong>{choice.specimen.name}</strong>
                      <b>{choice.specimen.width}:{choice.specimen.height}</b>
                      <small>{phenotype.note}</small>
                      <i>{choice.carriedIds.length} organs cross the molt</i>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {world.status === 'hatched' && (
            <div className="mv-outcome mv-outcome-hatched">
              <span>mastery / generation {world.generation + 1} / measure {proof.measure}</span>
              <h2>THE LINEAGE CAN NOW REVISE ITSELF</h2>
              <p>Three bodies carried your grafts, wounds, repairs, and chosen mutations. The proof is no longer a fixed answer; it has ancestry.</p>
              <button type="button" onClick={beginNewLineage}>seal a strange seed</button>
            </div>
          )}
        </section>

        <aside className="mv-drawer" aria-label="organ workshop drawer">
          <div className="mv-drawer-grip" aria-hidden="true" />
          <div className="mv-drawer-heading">
            <div>
              <span>generation {world.generation + 1} / {PHENOTYPES[world.specimen.phenotype]?.label}</span>
              <h2>{world.specimen.name}</h2>
            </div>
            <b>{world.specimen.width}:{world.specimen.height}</b>
          </div>

          <p className="mv-specimen-note">
            {world.specimen.signature} // seed {world.specimen.seed.toString(36)}
          </p>

          <div className="mv-instructions">
            <p><strong>graft</strong> different trait organs; early chambers amplify later ones.</p>
            <p><strong>circulate</strong> twice to expose three contingent descendants.</p>
            <p><strong>repair</strong> wounds by rerouting, stitching, or sacrificing heredity.</p>
          </div>

          {world.status === 'repairing' && selectedScar && (
            <section className="mv-repair-bay" aria-label="scar surgery">
              <div>
                <span>surgery / chamber {selectedScar.stepIndex + 1}</span>
                <strong>open scar severity {selectedScar.severity}</strong>
              </div>
              <p>Drag the red knot onto a chamber to grow a bypass, or choose a cost below.</p>
              <div>
                <button
                  type="button"
                  onClick={() => stitchScar(selectedScar.id)}
                  disabled={world.repairSilk < 1}
                  data-playground-action="stitch-scar"
                >
                  stitch <small>{world.repairSilk} silk</small>
                </button>
                <button
                  type="button"
                  onClick={() => sacrificeCassette(selectedScar.id, selectedId)}
                  disabled={!selectedCassette}
                  className="is-sacrifice"
                >
                  sacrifice <small>{selectedCassette ? `×${selectedCassette.value}` : 'select organ'}</small>
                </button>
              </div>
              {openScars.length > 1 && (
                <div className="mv-scar-tabs">
                  {openScars.map(scar => (
                    <button
                      key={scar.id}
                      type="button"
                      className={scar.id === selectedScar.id ? 'is-active' : ''}
                      onClick={() => setSelectedScarId(scar.id)}
                    >
                      wound {scar.stepIndex + 1}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          <div className="mv-module-list">
            {world.cassettes.map(cassette => {
              const placedAt = Object.entries(world.placements)
                .find(([, cassetteId]) => cassetteId === cassette.id)?.[0]
              return (
                <ModuleCard
                  key={cassette.id}
                  cassette={cassette}
                  selected={selectedId === cassette.id}
                  placedAt={placedAt == null ? null : Number(placedAt)}
                  locked={!canEdit}
                  onSelect={() => {
                    setSelectedId(cassette.id)
                    setMessage(
                      placedAt == null
                        ? `×${cassette.value} selected // choose a chamber in the map or chamber ledger`
                        : `×${cassette.value} selected in chamber ${Number(placedAt) + 1} // its traits are live`
                    )
                  }}
                  onPointerDown={(event) => beginDrag(event, 'cassette', cassette.id)}
                />
              )
            })}
          </div>

          <div className="mv-inspector">
            <div className="mv-inspector-copy">
              <span>selected organ / {PHENOTYPES[selectedTrait].label}</span>
              <strong>{selectedCassette ? `quotient ×${selectedCassette.value}` : 'none selected'}</strong>
              <p>
                {selectedCassette
                  ? `${selectedCassette.orientation} tissue // C${selectedCassette.traits.conductance} R${selectedCassette.traits.resistance}${selectedCassette.traits.branching ? ' branch' : ''}${selectedCassette.traits.conversion ? ' converter' : ''}`
                  : 'choose an organ to inspect its inherited traits'}
              </p>
            </div>
            <button
              type="button"
              className="mv-rotate-button"
              onClick={() => rotateCassette(selectedId)}
              disabled={!selectedCassette || !canEdit}
              data-playground-action="rotate-cassette"
              aria-label={`Rotate quotient ${selectedCassette?.value || ''} cassette`}
            >
              <span>↻</span>
              turn tissue
              <small>R</small>
            </button>
          </div>

          <section className="mv-chamber-ledger" aria-label="Accessible chamber controls">
            <div>
              <span>chamber ledger</span>
              <b>{world.status === 'repairing' ? 'tap a destination to reroute' : 'tap to graft selected organ'}</b>
            </div>
            <ol>
              {circulation.states.map(state => (
                <li key={state.step.index}>
                  <button
                    type="button"
                    onClick={() => handleChamberAction(state.step.index)}
                    disabled={!canEdit || (!selectedId && !selectedScar)}
                    aria-label={`Chamber ${state.step.index + 1}. Expected quotient ${state.step.quotient}, ${state.step.orientation} orientation. ${state.cassette ? `Contains quotient ${state.cassette.value}, ${state.cassette.orientation}, output ${Math.round(state.output * 100)} percent.` : 'Empty.'} ${state.scar ? `${state.scar.state} scar severity ${state.scar.severity}.` : 'No scar.'}`}
                  >
                    <span>{state.step.index + 1}</span>
                    <strong>×{state.step.quotient} / {state.step.orientation === 'horizontal' ? 'row' : 'column'}</strong>
                    <small>
                      {state.scar?.state === 'open'
                        ? `wound ${state.scar.severity}`
                        : state.cassette
                          ? `×${state.cassette.value} ${Math.round(state.output * 100)}%`
                          : 'empty'}
                    </small>
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <div className="mv-fossil-tape">
            <div>
              <span>lineage record</span>
              <b>{world.lineage.length}/{MAX_GENERATION + 1}</b>
            </div>
            {world.lineage.length === 0 ? (
              <p>the first completed molt will preserve this body and its dominant intervention.</p>
            ) : (
              world.lineage.slice(-3).map(record => (
                <div className="mv-fossil" key={record.id}>
                  <strong>G{record.generation + 1} / {record.outcome}</strong>
                  <span>{record.signature}</span>
                </div>
              ))
            )}
          </div>

          <div className="mv-drawer-actions">
            <button
              type="button"
              onClick={() => removeCassette(selectedId)}
              disabled={!selectedPlacement || !canEdit}
            >
              loosen selected
            </button>
            <button type="button" onClick={beginNewLineage} className="is-danger">
              strange seed
            </button>
          </div>
        </aside>

        <nav className="mv-pane-switch" aria-label="Mobile workshop view">
          <button
            type="button"
            className={mobilePane === 'map' ? 'is-active' : ''}
            onClick={() => setMobilePane('map')}
            aria-pressed={mobilePane === 'map'}
          >
            anatomy <span>{circulation.vitality}% live</span>
          </button>
          <button
            type="button"
            className={mobilePane === 'drawer' ? 'is-active' : ''}
            onClick={() => setMobilePane('drawer')}
            aria-pressed={mobilePane === 'drawer'}
          >
            organ drawer <span>{world.cassettes.length} available</span>
          </button>
        </nav>

        {drag?.moved && (
          <div
            className={`mv-drag-ghost ${drag.targetIndex != null ? 'is-targeting' : ''} ${drag.kind === 'scar' ? 'is-scar' : ''}`}
            style={{ left: drag.x, top: drag.y }}
            aria-hidden="true"
          >
            {drag.kind === 'scar' ? (
              <div className="mv-ghost-scar">✣</div>
            ) : (
              <svg viewBox="-42 -30 84 60">
                {cassetteMap.get(drag.id) && <CassetteMark cassette={cassetteMap.get(drag.id)} color="currentColor" />}
              </svg>
            )}
            <span>{drag.targetIndex != null ? `chamber ${drag.targetIndex + 1}` : drag.kind === 'scar' ? 'carry wound' : 'carry organ'}</span>
          </div>
        )}
      </main>
    </div>
  )
}

export default MeasureVivarium
