import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ExperimentNav from '../../ExperimentNav'
import './QuotientCommons.css'

const STORAGE_KEY = 'clawed:quotient-commons:v1'
const VIEWBOX = { width: 960, height: 620 }
const UNIT = 22

const PROGRAMS = {
  hearth: { label: 'hearth', sigil: 'H', color: '#c64c3e', note: 'holds bodies through the cold interval' },
  archive: { label: 'archive', sigil: 'A', color: '#315f9f', note: 'keeps a ward legible across revision' },
  passage: { label: 'passage', sigil: 'P', color: '#c68a2c', note: 'lets movement survive a boundary' },
  commons: { label: 'commons', sigil: 'C', color: '#4f7f64', note: 'turns measured ground into shared capacity' }
}

const PLATES = [
  {
    id: 'ember',
    label: 'ember survey',
    sigil: 'I',
    color: '#c64c3e',
    sequence: ['hearth', 'archive', 'commons', 'passage']
  },
  {
    id: 'index',
    label: 'index survey',
    sigil: 'II',
    color: '#315f9f',
    sequence: ['archive', 'commons', 'passage', 'hearth']
  },
  {
    id: 'crossing',
    label: 'crossing survey',
    sigil: 'III',
    color: '#c68a2c',
    sequence: ['passage', 'commons', 'hearth', 'archive']
  },
  {
    id: 'reciprocal',
    label: 'reciprocal survey',
    sigil: 'IV',
    color: '#4f7f64',
    sequence: ['commons', 'hearth', 'archive', 'passage'],
    hidden: true
  }
]

const SITES = [
  { id: 'warm-kiln', label: 'warm kiln', x: 330, y: 235, needs: ['hearth', 'archive'] },
  { id: 'public-index', label: 'public index', x: 455, y: 270, needs: ['archive', 'commons'] },
  { id: 'foot-bridge', label: 'foot bridge', x: 520, y: 305, needs: ['passage', 'commons'] },
  { id: 'rain-bath', label: 'rain bath', x: 320, y: 345, needs: ['hearth', 'commons'] },
  { id: 'relay-house', label: 'relay house', x: 610, y: 390, needs: ['archive', 'passage'] },
  { id: 'night-orchard', label: 'night orchard', x: 756, y: 492, needs: ['hearth', 'commons', 'passage'], hidden: true }
]

const SITE_PATHS = [
  ['warm-kiln', 'public-index'],
  ['public-index', 'foot-bridge'],
  ['warm-kiln', 'rain-bath'],
  ['public-index', 'rain-bath'],
  ['public-index', 'relay-house'],
  ['foot-bridge', 'relay-house'],
  ['rain-bath', 'relay-house'],
  ['relay-house', 'night-orchard'],
  ['foot-bridge', 'night-orchard']
]

const INITIAL_PLATES = {
  ember: { x: 360, y: 280, width: 12, height: 8, rotation: -4, depth: 3 },
  index: { x: 400, y: 280, width: 15, height: 9, rotation: 4, depth: 2 },
  crossing: { x: 590, y: 350, width: 14, height: 10, rotation: -4, depth: 1 },
  reciprocal: { x: 704, y: 400, width: 9, height: 6, rotation: 12, depth: 0 }
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const plateById = (id) => PLATES.find(plate => plate.id === id)
const siteById = (id) => SITES.find(site => site.id === id)

const gcd = (a, b) => {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    ;[x, y] = [y, x % y]
  }
  return x || 1
}

const buildProof = (width, height) => {
  const tiles = []
  const steps = []
  let x = 0
  let y = 0
  let w = width
  let h = height
  let step = 0

  while (w > 0 && h > 0 && step < 16) {
    const horizontal = w >= h
    const dividend = horizontal ? w : h
    const divisor = horizontal ? h : w
    const quotient = Math.floor(dividend / divisor)
    const remainder = dividend % divisor
    const stepTiles = []

    for (let index = 0; index < quotient; index += 1) {
      const tile = horizontal
        ? { x: x + index * h, y, size: h, step, index }
        : { x, y: y + index * w, size: w, step, index }
      tiles.push(tile)
      stepTiles.push(tile)
    }

    steps.push({
      index: step,
      dividend,
      divisor,
      quotient,
      remainder,
      orientation: horizontal ? 'row' : 'column',
      tiles: stepTiles
    })

    if (horizontal) {
      x += quotient * h
      w -= quotient * h
    } else {
      y += quotient * w
      h -= quotient * w
    }
    step += 1
  }

  return { tiles, steps, measure: gcd(width, height) }
}

const createSiteStates = () => Object.fromEntries(
  SITES.map(site => [site.id, { vitality: 0, founded: false, voice: 0, scars: 0 }])
)

const freshWorld = () => ({
  version: 1,
  unlocked: false,
  plates: Object.fromEntries(
    Object.entries(INITIAL_PLATES).map(([id, placement]) => [id, { ...placement }])
  ),
  sites: createSiteStates(),
  cycle: 0,
  stableCycles: 0,
  fractures: 0,
  reciprocalUnlocked: false,
  assemblyUnlocked: false,
  status: 'surveying',
  bridges: [],
  amendments: {},
  ratifiedCount: 0,
  history: [],
  log: [
    { id: 'sealed', cycle: 0, text: 'the ground exists as four untested ratios' }
  ],
  lastSaved: null
})

const loadWorld = () => {
  const fresh = freshWorld()
  if (typeof window === 'undefined') return fresh

  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (!saved || saved.version !== 1) return fresh
    return {
      ...fresh,
      ...saved,
      plates: Object.fromEntries(PLATES.map(plate => [
        plate.id,
        { ...fresh.plates[plate.id], ...(saved.plates?.[plate.id] || {}) }
      ])),
      sites: Object.fromEntries(SITES.map(site => [
        site.id,
        { ...fresh.sites[site.id], ...(saved.sites?.[site.id] || {}) }
      ])),
      bridges: Array.isArray(saved.bridges) ? saved.bridges.slice(-8) : [],
      amendments: saved.amendments && typeof saved.amendments === 'object' ? saved.amendments : {},
      history: Array.isArray(saved.history) ? saved.history.slice(-10) : [],
      log: Array.isArray(saved.log) ? saved.log.slice(-8) : fresh.log
    }
  } catch {
    return fresh
  }
}

const snapshotWorld = (world) => ({
  plates: Object.fromEntries(Object.entries(world.plates).map(([id, placement]) => [id, { ...placement }])),
  sites: Object.fromEntries(Object.entries(world.sites).map(([id, site]) => [id, { ...site }])),
  cycle: world.cycle,
  stableCycles: world.stableCycles,
  fractures: world.fractures,
  reciprocalUnlocked: world.reciprocalUnlocked,
  assemblyUnlocked: world.assemblyUnlocked,
  status: world.status,
  bridges: world.bridges.map(bridge => ({ ...bridge })),
  amendments: Object.fromEntries(Object.entries(world.amendments).map(([id, laws]) => [id, [...laws]])),
  ratifiedCount: world.ratifiedCount,
  log: world.log.map(entry => ({ ...entry }))
})

const formatAge = (timestamp) => {
  if (!timestamp) return 'unpressed'
  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s held`
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes}m held` : `${Math.round(minutes / 60)}h held`
}

const localPointFor = (site, placement) => {
  const angle = -placement.rotation * Math.PI / 180
  const dx = site.x - placement.x
  const dy = site.y - placement.y
  return {
    x: dx * Math.cos(angle) - dy * Math.sin(angle) + placement.width * UNIT / 2,
    y: dx * Math.sin(angle) + dy * Math.cos(angle) + placement.height * UNIT / 2
  }
}

const readingFromPlate = (site, plate, placement) => {
  const local = localPointFor(site, placement)
  const proof = buildProof(placement.width, placement.height)
  if (
    local.x < 0 ||
    local.y < 0 ||
    local.x > placement.width * UNIT ||
    local.y > placement.height * UNIT
  ) return null

  const unitPoint = { x: local.x / UNIT, y: local.y / UNIT }
  const tile = proof.tiles.find(item => (
    unitPoint.x >= item.x &&
    unitPoint.x <= item.x + item.size &&
    unitPoint.y >= item.y &&
    unitPoint.y <= item.y + item.size
  )) || proof.tiles.at(-1)
  const program = plate.sequence[(tile?.step || 0) % plate.sequence.length]

  return {
    plateId: plate.id,
    program,
    step: tile?.step || 0,
    measure: proof.measure,
    depth: placement.depth
  }
}

const deriveCommons = (world) => {
  const plates = PLATES
    .filter(plate => !plate.hidden || world.reciprocalUnlocked)
    .sort((left, right) => world.plates[right.id].depth - world.plates[left.id].depth)
  const sites = SITES.filter(site => !site.hidden || world.reciprocalUnlocked)
  const base = Object.fromEntries(sites.map(site => {
    const covers = plates
      .map(plate => readingFromPlate(site, plate, world.plates[plate.id]))
      .filter(Boolean)
      .slice(0, 3)
    const programs = [...new Set(covers.map(cover => cover.program))]
    const amended = [...new Set(world.amendments[site.id] || [])]
    return [site.id, {
      covers,
      programs,
      amended,
      measure: covers[0]?.measure || 0
    }]
  }))

  const readings = Object.fromEntries(sites.map(site => {
    const borrowed = world.bridges
      .filter(bridge => {
        if (bridge.toId !== site.id || bridge.strain >= 2) return false
        const source = base[bridge.fromId]
        const target = base[bridge.toId]
        return Boolean(
          source?.measure > 1 &&
          target?.measure > 1 &&
          gcd(source.measure, target.measure) >= bridge.measure
        )
      })
      .map(bridge => bridge.program)
    const effective = [...new Set([...base[site.id].programs, ...base[site.id].amended, ...borrowed])]
    return [site.id, {
      ...base[site.id],
      borrowed,
      effective,
      eligible: site.needs.every(need => effective.includes(need)),
      missing: site.needs.filter(need => !effective.includes(need))
    }]
  }))

  return { plates, sites, readings }
}

const arcPath = (from, to, bend = 30) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy) || 1
  const cx = (from.x + to.x) / 2 - dy / distance * bend
  const cy = (from.y + to.y) / 2 + dx / distance * bend
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`
}

const QuotientCommons = ({ category, experiment }) => {
  const [world, setWorld] = useState(loadWorld)
  const [selectedPlateId, setSelectedPlateId] = useState('ember')
  const [selectedSiteId, setSelectedSiteId] = useState(null)
  const [message, setMessage] = useState(() => (
    world.unlocked
      ? `survey ${world.cycle} remembered // every old cut remains negotiable`
      : 'the municipal proof sleeps beneath its tracing glass'
  ))
  const [plateDrag, setPlateDrag] = useState(null)
  const [bridgeDrag, setBridgeDrag] = useState(null)
  const [turning, setTurning] = useState(false)
  const [savedAt, setSavedAt] = useState(() => world.lastSaved)
  const [reducedMotion, setReducedMotion] = useState(false)

  const surfaceRef = useRef(null)
  const svgRef = useRef(null)
  const worldRef = useRef(world)
  const plateDragRef = useRef(null)
  const bridgeDragRef = useRef(null)
  const suppressSiteClickRef = useRef(false)
  const turnTimerRef = useRef(null)
  const saveTimerRef = useRef(null)

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
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      try {
        const timestamp = Date.now()
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...world, lastSaved: timestamp }))
        setSavedAt(timestamp)
      } catch {
        // The commons remains playable when storage is unavailable.
      }
    }, 160)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [world])

  useEffect(() => () => {
    if (turnTimerRef.current) window.clearTimeout(turnTimerRef.current)
  }, [])

  const commons = useMemo(() => deriveCommons(world), [world])
  const { plates: visiblePlates, sites: visibleSites, readings } = commons
  const selectedPlate = plateById(selectedPlateId) || PLATES[0]
  const selectedPlacement = world.plates[selectedPlate.id]
  const selectedProof = useMemo(
    () => buildProof(selectedPlacement.width, selectedPlacement.height),
    [selectedPlacement.height, selectedPlacement.width]
  )
  const selectedSite = siteById(selectedSiteId)
  const selectedReading = selectedSite ? readings[selectedSite.id] : null
  const eligibleCount = visibleSites.filter(site => readings[site.id]?.eligible).length
  const livingCount = visibleSites.filter(site => world.sites[site.id].vitality > 0).length
  const amendmentCount = Object.values(world.amendments).reduce((sum, laws) => sum + laws.length, 0)
  const ready = eligibleCount >= 3
  const phase = world.status === 'mastered'
    ? 'common-ground'
    : world.status === 'ruined'
      ? 'misregistered'
      : amendmentCount > 0
        ? 'self-revising'
        : world.assemblyUnlocked
          ? 'negotiating'
          : world.reciprocalUnlocked
            ? 'reciprocal'
            : world.unlocked
              ? 'surveying'
              : 'sealed'

  const proofByPlate = useMemo(() => Object.fromEntries(
    visiblePlates.map(plate => [
      plate.id,
      buildProof(world.plates[plate.id].width, world.plates[plate.id].height)
    ])
  ), [visiblePlates, world.plates])

  const bridgeSuggestions = useMemo(() => {
    const suggestions = []
    visibleSites.forEach(source => {
      if (world.sites[source.id].vitality <= 0 || world.sites[source.id].voice <= 0) return
      visibleSites.forEach(target => {
        if (source.id === target.id) return
        const common = gcd(readings[source.id].measure, readings[target.id].measure)
        if (common <= 1) return
        const program = readings[target.id].missing.find(need => readings[source.id].effective.includes(need))
        if (!program) return
        suggestions.push({
          id: `${source.id}-${target.id}-${program}`,
          source,
          target,
          program,
          measure: common
        })
      })
    })
    return suggestions.slice(0, 4)
  }, [readings, visibleSites, world.sites])

  const svgPointFromClient = useCallback((clientX, clientY) => {
    const svg = svgRef.current
    if (!svg) return null
    const matrix = svg.getScreenCTM()
    if (!matrix) return null
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    return point.matrixTransform(matrix.inverse())
  }, [])

  const wake = useCallback(() => {
    setWorld(current => ({
      ...current,
      unlocked: true,
      log: [
        ...current.log,
        { id: `wake-${Date.now()}`, cycle: current.cycle, text: 'the hand entered the survey' }
      ].slice(-8)
    }))
    setMessage('drag a ratio-plate // its quotient rooms decide what each address can become')
    requestAnimationFrame(() => surfaceRef.current?.focus())
  }, [])

  const selectPlate = useCallback((plateId) => {
    setSelectedPlateId(plateId)
    const plate = plateById(plateId)
    const placement = worldRef.current.plates[plateId]
    setMessage(`${plate.label} selected // ${placement.width}:${placement.height} yields common measure ${gcd(placement.width, placement.height)}`)
  }, [])

  const beginPlateDrag = useCallback((event, plateId) => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'surveying' || turning) return
    const point = svgPointFromClient(event.clientX, event.clientY)
    if (!point) return
    event.preventDefault()
    event.stopPropagation()
    const placement = current.plates[plateId]
    const next = {
      id: plateId,
      startX: point.x,
      startY: point.y,
      originX: placement.x,
      originY: placement.y,
      moved: false
    }
    plateDragRef.current = next
    setPlateDrag(next)
    setSelectedPlateId(plateId)
  }, [svgPointFromClient, turning])

  useEffect(() => {
    if (!plateDrag?.id) return undefined

    const handleMove = (event) => {
      const current = plateDragRef.current
      if (!current) return
      const point = svgPointFromClient(event.clientX, event.clientY)
      if (!point) return
      const moved = current.moved || Math.hypot(point.x - current.startX, point.y - current.startY) > 4
      const next = { ...current, moved }
      plateDragRef.current = next
      setPlateDrag(next)
      setWorld(previous => ({
        ...previous,
        plates: {
          ...previous.plates,
          [current.id]: {
            ...previous.plates[current.id],
            x: clamp(current.originX + point.x - current.startX, 92, VIEWBOX.width - 92),
            y: clamp(current.originY + point.y - current.startY, 82, VIEWBOX.height - 72)
          }
        }
      }))
    }

    const handleUp = () => {
      const current = plateDragRef.current
      if (current?.moved) {
        const nextCommons = deriveCommons(worldRef.current)
        const count = nextCommons.sites.filter(site => nextCommons.readings[site.id].eligible).length
        setMessage(`${plateById(current.id).label} translated // ${count} addresses now satisfy their brief`)
      }
      plateDragRef.current = null
      setPlateDrag(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [plateDrag?.id, svgPointFromClient])

  const alterPlate = useCallback((plateId, change, copy) => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'surveying' || turning) return
    setWorld(previous => ({
      ...previous,
      plates: {
        ...previous.plates,
        [plateId]: {
          ...previous.plates[plateId],
          ...change(previous.plates[plateId], previous.plates)
        }
      }
    }))
    setSelectedPlateId(plateId)
    setMessage(copy)
  }, [turning])

  const rotateSelected = useCallback((direction) => {
    alterPlate(
      selectedPlateId,
      placement => ({ rotation: (placement.rotation + direction * 15 + 360) % 360 }),
      `${selectedPlate.label} turned // quotient rooms cross a new set of addresses`
    )
  }, [alterPlate, selectedPlate, selectedPlateId])

  const changeDimension = useCallback((axis, direction) => {
    const nextValue = clamp(selectedPlacement[axis] + direction, axis === 'width' ? 7 : 5, axis === 'width' ? 16 : 12)
    alterPlate(
      selectedPlateId,
      () => ({ [axis]: nextValue }),
      `${axis} cut to ${nextValue} // the Euclidean interior re-tiled itself`
    )
  }, [alterPlate, selectedPlacement, selectedPlateId])

  const shiftDepth = useCallback((direction) => {
    alterPlate(
      selectedPlateId,
      (placement, placements) => ({
        depth: direction > 0
          ? Math.max(...Object.values(placements).map(item => item.depth)) + 1
          : Math.min(...Object.values(placements).map(item => item.depth)) - 1
      }),
      `${selectedPlate.label} ${direction > 0 ? 'rose above competing measures' : 'slid beneath them'} // audible rooms changed`
    )
  }, [alterPlate, selectedPlate, selectedPlateId])

  const nudgeSelected = useCallback((dx, dy) => {
    alterPlate(
      selectedPlateId,
      placement => ({
        x: clamp(placement.x + dx, 92, VIEWBOX.width - 92),
        y: clamp(placement.y + dy, 82, VIEWBOX.height - 72)
      }),
      `${selectedPlate.label} nudged one registration mark`
    )
  }, [alterPlate, selectedPlate, selectedPlateId])

  const createBridge = useCallback((fromId, toId, requestedProgram = null) => {
    const current = worldRef.current
    const currentCommons = deriveCommons(current)
    const source = siteById(fromId)
    const target = siteById(toId)
    if (!source || !target || source.id === target.id || !current.assemblyUnlocked || current.status !== 'surveying' || turning) return false
    if (current.sites[fromId].vitality <= 0 || current.sites[fromId].voice <= 0) {
      setMessage(`${source.label} has no voice to press // hold it through another survey`)
      return false
    }

    const sourceReading = currentCommons.readings[fromId]
    const targetReading = currentCommons.readings[toId]
    const commonMeasure = gcd(sourceReading?.measure || 0, targetReading?.measure || 0)
    if (commonMeasure <= 1) {
      setMessage(`${source.label} and ${target.label} share no usable measure // revise the uppermost ratios`)
      return false
    }
    const candidates = target.needs.filter(program => (
      sourceReading.effective.includes(program) &&
      !targetReading.effective.includes(program)
    ))
    const program = candidates.includes(requestedProgram) ? requestedProgram : candidates[0]
    if (!program) {
      setMessage(`${source.label} cannot answer ${target.label} // no missing room survives their overlap`)
      return false
    }

    const bridge = {
      id: `bridge-${Date.now()}-${fromId}-${toId}`,
      fromId,
      toId,
      program,
      measure: commonMeasure,
      age: 0,
      strain: 0
    }
    setWorld(previous => ({
      ...previous,
      sites: {
        ...previous.sites,
        [fromId]: { ...previous.sites[fromId], voice: previous.sites[fromId].voice - 1 }
      },
      bridges: [...previous.bridges, bridge].slice(-8),
      log: [
        ...previous.log,
        { id: bridge.id, cycle: previous.cycle, text: `${source.label} carried ${program} across measure ${commonMeasure}` }
      ].slice(-8)
    }))
    setSelectedSiteId(null)
    setMessage(`${PROGRAMS[program].label} crossed on measure ${commonMeasure} // hold both addresses twice to make a common room`)
    return true
  }, [turning])

  const handleSiteActivate = useCallback((siteId) => {
    if (suppressSiteClickRef.current) {
      suppressSiteClickRef.current = false
      return
    }
    const current = worldRef.current
    if (!current.assemblyUnlocked) {
      setSelectedSiteId(siteId)
      setMessage('this address cannot negotiate until three wards survive one survey')
      return
    }
    if (!selectedSiteId) {
      setSelectedSiteId(siteId)
      const reading = deriveCommons(current).readings[siteId]
      setMessage(`${siteById(siteId).label} selected // measure ${reading.measure || 'absent'}, ${current.sites[siteId].voice} voice`)
      return
    }
    if (selectedSiteId === siteId) {
      setSelectedSiteId(null)
      setMessage('the unsigned bridge returned to the bench')
      return
    }
    createBridge(selectedSiteId, siteId)
  }, [createBridge, selectedSiteId])

  const nearestSiteFromPoint = useCallback((point) => {
    if (!point) return null
    let nearest = null
    let distance = Infinity
    deriveCommons(worldRef.current).sites.forEach(site => {
      const nextDistance = Math.hypot(point.x - site.x, point.y - site.y)
      if (nextDistance < 58 && nextDistance < distance) {
        nearest = site.id
        distance = nextDistance
      }
    })
    return nearest
  }, [])

  const beginBridgeDrag = useCallback((event, siteId) => {
    const current = worldRef.current
    if (!current.assemblyUnlocked || current.status !== 'surveying' || turning) return
    if (current.sites[siteId].vitality <= 0 || current.sites[siteId].voice <= 0) return
    const point = svgPointFromClient(event.clientX, event.clientY)
    if (!point) return
    event.preventDefault()
    event.stopPropagation()
    const next = {
      fromId: siteId,
      startX: point.x,
      startY: point.y,
      x: point.x,
      y: point.y,
      targetId: null,
      moved: false
    }
    bridgeDragRef.current = next
    setBridgeDrag(next)
  }, [svgPointFromClient, turning])

  useEffect(() => {
    if (!bridgeDrag?.fromId) return undefined

    const handleMove = (event) => {
      const current = bridgeDragRef.current
      if (!current) return
      const point = svgPointFromClient(event.clientX, event.clientY)
      if (!point) return
      const moved = current.moved || Math.hypot(point.x - current.startX, point.y - current.startY) > 6
      const targetId = moved ? nearestSiteFromPoint(point) : null
      const next = { ...current, x: point.x, y: point.y, moved, targetId }
      bridgeDragRef.current = next
      setBridgeDrag(next)
    }

    const handleUp = () => {
      const current = bridgeDragRef.current
      if (current?.moved) {
        suppressSiteClickRef.current = true
        if (current.targetId && current.targetId !== current.fromId) {
          createBridge(current.fromId, current.targetId)
        } else {
          setMessage('the measuring cord found no receiving address')
        }
      }
      bridgeDragRef.current = null
      setBridgeDrag(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [bridgeDrag?.fromId, createBridge, nearestSiteFromPoint, svgPointFromClient])

  const resolveCycle = useCallback(() => {
    turnTimerRef.current = null
    const current = worldRef.current
    if (current.status !== 'surveying') {
      setTurning(false)
      return
    }
    const currentCommons = deriveCommons(current)
    const readyCount = currentCommons.sites.filter(site => currentCommons.readings[site.id].eligible).length
    const stableNow = readyCount >= 3
    let fractureGain = 0
    const nextSites = Object.fromEntries(SITES.map(site => {
      const previous = current.sites[site.id]
      if (site.hidden && !current.reciprocalUnlocked) return [site.id, previous]
      if (currentCommons.readings[site.id]?.eligible) {
        return [site.id, {
          ...previous,
          vitality: clamp(previous.vitality + 1, 0, 3),
          founded: true,
          voice: clamp(previous.voice + 1, 0, 3)
        }]
      }
      if (previous.founded && previous.vitality > 0) fractureGain += 1
      return [site.id, {
        ...previous,
        vitality: clamp(previous.vitality - 1, 0, 3),
        scars: previous.founded ? previous.scars + 1 : previous.scars
      }]
    }))

    const nextAmendments = Object.fromEntries(
      Object.entries(current.amendments).map(([id, programs]) => [id, [...programs]])
    )
    const baseMeasures = Object.fromEntries(
      Object.entries(currentCommons.readings).map(([id, reading]) => [id, reading.measure])
    )
    let ratified = 0
    let broken = 0
    const nextBridges = []
    current.bridges.forEach(bridge => {
      const stillCommon = gcd(baseMeasures[bridge.fromId] || 0, baseMeasures[bridge.toId] || 0) >= bridge.measure
      const sustained = stillCommon && nextSites[bridge.fromId]?.vitality > 0 && nextSites[bridge.toId]?.vitality > 0
      const age = sustained ? bridge.age + 1 : bridge.age
      const strain = sustained ? Math.max(0, bridge.strain - 1) : bridge.strain + 1
      if (age >= 2) {
        nextAmendments[bridge.toId] = [...new Set([...(nextAmendments[bridge.toId] || []), bridge.program])]
        ratified += 1
      } else if (strain >= 2) {
        broken += 1
      } else {
        nextBridges.push({ ...bridge, age, strain })
      }
    })
    fractureGain += broken

    const nextStable = stableNow ? current.stableCycles + 1 : 0
    const reciprocalUnlocked = current.reciprocalUnlocked || stableNow
    const assemblyUnlocked = current.assemblyUnlocked || stableNow
    const nextFractures = current.fractures + fractureGain
    const nextAmendmentCount = Object.values(nextAmendments).reduce((sum, programs) => sum + programs.length, 0)
    const nextLiving = Object.values(nextSites).filter(site => site.vitality > 0).length
    const mastered = reciprocalUnlocked && nextStable >= 3 && nextLiving >= 5 && nextAmendmentCount >= 1
    const ruined = !mastered && nextFractures >= 7
    const nextStatus = mastered ? 'mastered' : ruined ? 'ruined' : 'surveying'
    const nextCycle = current.cycle + 1
    const cycleText = mastered
      ? 'five addresses and one permanent bridge held // the map can now revise its own measure'
      : ruined
        ? 'seven registration wounds accumulated // the survey became an eviction machine'
        : ratified
          ? 'a borrowed room became permanent ground // the bridge vanished into the address'
          : !current.reciprocalUnlocked && reciprocalUnlocked
            ? 'three wards survived // the reciprocal plate rose and the assembly learned voice'
            : stableNow && nextAmendmentCount === 0
              ? `${readyCount} briefs held // stability ${nextStable}/3, still awaiting one permanent bridge`
              : stableNow
                ? `${readyCount} briefs held // common weather ${nextStable}/3`
                : `${readyCount} briefs held // ${fractureGain} registration wound${fractureGain === 1 ? '' : 's'} opened`

    setWorld(previous => ({
      ...previous,
      sites: nextSites,
      cycle: nextCycle,
      stableCycles: nextStable,
      fractures: nextFractures,
      reciprocalUnlocked,
      assemblyUnlocked,
      status: nextStatus,
      bridges: nextBridges,
      amendments: nextAmendments,
      ratifiedCount: previous.ratifiedCount + ratified,
      history: [...previous.history, snapshotWorld(previous)].slice(-10),
      log: [
        ...previous.log,
        { id: `cycle-${Date.now()}`, cycle: nextCycle, text: cycleText }
      ].slice(-8)
    }))
    if (!current.reciprocalUnlocked && reciprocalUnlocked) setSelectedPlateId('reciprocal')
    setMessage(cycleText)
    setTurning(false)
  }, [])

  const turnCycle = useCallback(() => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'surveying' || turning) return
    setTurning(true)
    setMessage(ready
      ? 'weather entering the plan // ratios, rooms, and bridges will be tested together'
      : 'weather entering the plan // founded addresses without a complete brief will scar')
    turnTimerRef.current = window.setTimeout(resolveCycle, reducedMotion ? 80 : 1000)
  }, [ready, reducedMotion, resolveCycle, turning])

  const rewind = useCallback(() => {
    if (turnTimerRef.current) {
      window.clearTimeout(turnTimerRef.current)
      turnTimerRef.current = null
    }
    const current = worldRef.current
    const snapshot = current.history.at(-1)
    if (!snapshot) {
      setMessage('no earlier survey remains beneath the tracing glass')
      return
    }
    setWorld(previous => ({
      ...previous,
      ...snapshot,
      unlocked: true,
      history: previous.history.slice(0, -1)
    }))
    setTurning(false)
    setSelectedSiteId(null)
    setMessage('one weather lifted // dimensions, bridges, and residents returned together')
  }, [])

  const reset = useCallback(() => {
    if (turnTimerRef.current) window.clearTimeout(turnTimerRef.current)
    setWorld(freshWorld())
    setSelectedPlateId('ember')
    setSelectedSiteId(null)
    setPlateDrag(null)
    setBridgeDrag(null)
    setTurning(false)
    setMessage('a clean survey replaces the remembered commons')
  }, [])

  const handleSurfaceKeyDown = useCallback((event) => {
    if (event.target.closest('button, a, input, textarea, select')) return
    const amount = event.shiftKey ? 3 : 10
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      nudgeSelected(-amount, 0)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      nudgeSelected(amount, 0)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      nudgeSelected(0, -amount)
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      nudgeSelected(0, amount)
    }
    if (event.key.toLowerCase() === 'q') {
      event.preventDefault()
      rotateSelected(-1)
    }
    if (event.key.toLowerCase() === 'e') {
      event.preventDefault()
      rotateSelected(1)
    }
    if (event.key.toLowerCase() === 'w') {
      event.preventDefault()
      changeDimension('width', event.shiftKey ? -1 : 1)
    }
    if (event.key.toLowerCase() === 'h') {
      event.preventDefault()
      changeDimension('height', event.shiftKey ? -1 : 1)
    }
    if (event.key === ' ') {
      event.preventDefault()
      turnCycle()
    }
  }, [changeDimension, nudgeSelected, rotateSelected, turnCycle])

  return (
    <div className={`qc-shell phase-${phase} ${turning ? 'is-turning' : ''} ${reducedMotion ? 'is-reduced-motion' : ''}`}>
      <header className="qc-crownbar">
        <div className="qc-nav"><ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} /></div>
        <div className="qc-title">
          <span>living survey / experiment 221</span>
          <h1 style={{ color: experiment.color }}>{experiment.name}</h1>
        </div>
        <div className="qc-memory" title="This survey is saved in this browser">
          <span /> local ground // {formatAge(savedAt)}
        </div>
      </header>

      <main
        ref={surfaceRef}
        className="qc-surface"
        tabIndex={0}
        onKeyDown={handleSurfaceKeyDown}
        data-playground-surface
        data-testid="quotient-commons-surface"
        aria-label="Persistent Euclidean civic survey composition"
      >
        <section className="qc-map-chamber" aria-label="ratio plate city map">
          <div className="qc-status" role="status">
            <span>{phase}</span>
            <strong>{eligibleCount}/{visibleSites.length} briefs</strong>
            <p>{message}</p>
          </div>

          <svg
            ref={svgRef}
            className="qc-map"
            viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
            preserveAspectRatio="xMidYMid meet"
            aria-label={`${eligibleCount} addresses currently complete; ${world.bridges.length} measuring bridges active`}
          >
            <defs>
              <pattern id="qc-registration" width="22" height="22" patternUnits="userSpaceOnUse">
                <path d="M 22 0 H 0 V 22" fill="none" stroke="rgba(35,43,52,.1)" strokeWidth=".7" />
                <circle cx="0" cy="0" r="1.2" fill="rgba(35,43,52,.18)" />
              </pattern>
              <filter id="qc-grain" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="221" result="noise" />
                <feColorMatrix in="noise" type="saturate" values="0" result="gray" />
                <feBlend in="SourceGraphic" in2="gray" mode="soft-light" />
              </filter>
              <filter id="qc-site-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <marker id="qc-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 Z" />
              </marker>
              {visiblePlates.map(plate => {
                const placement = world.plates[plate.id]
                return (
                  <clipPath id={`qc-clip-${plate.id}`} key={plate.id}>
                    <rect
                      x={-placement.width * UNIT / 2}
                      y={-placement.height * UNIT / 2}
                      width={placement.width * UNIT}
                      height={placement.height * UNIT}
                      rx="3"
                    />
                  </clipPath>
                )
              })}
            </defs>

            <rect className="qc-ground" width="960" height="620" rx="24" />
            <rect className="qc-grid" x="20" y="18" width="920" height="584" rx="18" fill="url(#qc-registration)" />
            <path className="qc-old-shore" d="M 60 506 C 152 442 210 492 292 460 C 382 425 444 476 534 446 C 646 408 716 330 902 372" />
            <path className="qc-old-axis" d="M 94 118 H 842 M 118 90 V 542 M 876 134 V 512" />

            <g className="qc-path-layer">
              {SITE_PATHS.map(([fromId, toId]) => {
                const from = siteById(fromId)
                const to = siteById(toId)
                const visible = visibleSites.some(site => site.id === fromId) && visibleSites.some(site => site.id === toId)
                if (!visible) return null
                const alive = world.sites[fromId].vitality > 0 && world.sites[toId].vitality > 0
                return (
                  <path
                    key={`${fromId}-${toId}`}
                    className={alive ? 'is-alive' : ''}
                    d={arcPath(from, to, (fromId.length % 2 ? 1 : -1) * 18)}
                  />
                )
              })}
            </g>

            <g className="qc-plate-layer">
              {[...visiblePlates].reverse().map((plate, plateOrder) => {
                const placement = world.plates[plate.id]
                const proof = proofByPlate[plate.id]
                const selected = selectedPlateId === plate.id
                return (
                  <g
                    key={plate.id}
                    className={`qc-plate ${selected ? 'is-selected' : ''} ${plateDrag?.id === plate.id ? 'is-dragging' : ''} ${plate.hidden ? 'is-revealed' : ''}`}
                    transform={`translate(${placement.x} ${placement.y}) rotate(${placement.rotation})`}
                    style={{ '--plate-color': plate.color, '--plate-order': plateOrder }}
                    role="button"
                    tabIndex={world.unlocked ? 0 : -1}
                    aria-label={`${plate.label}, ratio ${placement.width} by ${placement.height}, common measure ${proof.measure}, layer ${placement.depth}`}
                    onPointerDown={(event) => beginPlateDrag(event, plate.id)}
                    onClick={(event) => {
                      event.stopPropagation()
                      selectPlate(plate.id)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        selectPlate(plate.id)
                      }
                    }}
                  >
                    <rect
                      className="qc-plate-shadow"
                      x={-placement.width * UNIT / 2 + 7}
                      y={-placement.height * UNIT / 2 + 9}
                      width={placement.width * UNIT}
                      height={placement.height * UNIT}
                      rx="5"
                    />
                    <rect
                      className="qc-plate-glass"
                      x={-placement.width * UNIT / 2}
                      y={-placement.height * UNIT / 2}
                      width={placement.width * UNIT}
                      height={placement.height * UNIT}
                      rx="4"
                      filter="url(#qc-grain)"
                    />

                    <g className="qc-tile-field" transform={`translate(${-placement.width * UNIT / 2} ${-placement.height * UNIT / 2})`}>
                      {proof.tiles.map((tile, index) => {
                        const programId = plate.sequence[tile.step % plate.sequence.length]
                        const program = PROGRAMS[programId]
                        const showSigil = tile.size * UNIT > 34
                        return (
                          <g key={`${tile.step}-${index}`} className={`qc-proof-tile is-step-${tile.step}`} style={{ '--tile-color': program.color }}>
                            <rect
                              x={tile.x * UNIT + 1.5}
                              y={tile.y * UNIT + 1.5}
                              width={tile.size * UNIT - 3}
                              height={tile.size * UNIT - 3}
                            />
                            {showSigil && (
                              <>
                                <text x={(tile.x + tile.size / 2) * UNIT} y={(tile.y + tile.size / 2) * UNIT + 4}>{program.sigil}</text>
                                <text className="qc-tile-quotient" x={tile.x * UNIT + 7} y={tile.y * UNIT + 13}>q{tile.step + 1}.{tile.index + 1}</text>
                              </>
                            )}
                          </g>
                        )
                      })}
                    </g>

                    <rect
                      className="qc-plate-border"
                      x={-placement.width * UNIT / 2}
                      y={-placement.height * UNIT / 2}
                      width={placement.width * UNIT}
                      height={placement.height * UNIT}
                      rx="4"
                    />
                    <g className="qc-plate-handle">
                      <circle r="24" />
                      <circle r="14" />
                      <text y="5">{plate.sigil}</text>
                      <path d="M -38 0 H -26 M 26 0 H 38 M 0 -38 V -26 M 0 26 V 38" />
                    </g>
                    <g className="qc-plate-caption" transform={`translate(${-placement.width * UNIT / 2 + 9} ${-placement.height * UNIT / 2 + 18})`}>
                      <text>{plate.label}</text>
                      <text y="14">{placement.width}:{placement.height} / μ{proof.measure} / layer {placement.depth}</text>
                    </g>
                  </g>
                )
              })}
            </g>

            <g className="qc-bridge-layer">
              {world.bridges.map((bridge, index) => {
                const from = siteById(bridge.fromId)
                const to = siteById(bridge.toId)
                if (!from || !to || !visibleSites.some(site => site.id === from.id) || !visibleSites.some(site => site.id === to.id)) return null
                const path = arcPath(from, to, 36 + index * 8)
                const program = PROGRAMS[bridge.program]
                return (
                  <g key={bridge.id} className={`qc-bridge ${bridge.strain ? 'is-strained' : ''}`} style={{ '--bridge-color': program.color }}>
                    <path className="qc-bridge-bed" d={path} />
                    <path className="qc-bridge-line" d={path} markerEnd="url(#qc-arrow)" />
                    {!reducedMotion && (
                      <rect className="qc-bridge-carrier" width="8" height="8" x="-4" y="-4">
                        <animateMotion dur={`${3.2 - bridge.age * 0.45}s`} repeatCount="indefinite" path={path} />
                      </rect>
                    )}
                    <g className="qc-bridge-seal" transform={`translate(${(from.x + to.x) / 2} ${(from.y + to.y) / 2 - 16})`}>
                      <rect x="-20" y="-14" width="40" height="28" rx="14" />
                      <text y="4">{program.sigil}·{bridge.measure}</text>
                      <text className="qc-bridge-age" y="28">{bridge.age}/2</text>
                    </g>
                  </g>
                )
              })}
              {bridgeDrag?.moved && (
                <path
                  className="qc-bridge-draft"
                  d={arcPath(siteById(bridgeDrag.fromId), { x: bridgeDrag.x, y: bridgeDrag.y }, 25)}
                />
              )}
            </g>

            <g className="qc-site-layer">
              {visibleSites.map((site, index) => {
                const reading = readings[site.id]
                const state = world.sites[site.id]
                const alive = state.vitality > 0
                const selected = selectedSiteId === site.id
                const target = bridgeDrag?.targetId === site.id
                return (
                  <g
                    key={site.id}
                    className={`qc-site ${reading.eligible ? 'is-eligible' : ''} ${alive ? 'is-alive' : ''} ${selected ? 'is-selected' : ''} ${target ? 'is-target' : ''} ${state.scars ? 'is-scarred' : ''}`}
                    transform={`translate(${site.x} ${site.y})`}
                    style={{ '--site-vitality': state.vitality, '--site-index': index }}
                    role="button"
                    tabIndex={world.unlocked ? 0 : -1}
                    aria-label={`${site.label}. ${reading.eligible ? 'Brief complete.' : `Missing ${reading.missing.join(', ') || 'coverage'}.`} ${alive ? `Vitality ${state.vitality}, voice ${state.voice}.` : 'Uninhabited.'} Common measure ${reading.measure || 'absent'}.`}
                    onPointerDown={(event) => beginBridgeDrag(event, site.id)}
                    onClick={(event) => {
                      event.stopPropagation()
                      handleSiteActivate(site.id)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        handleSiteActivate(site.id)
                      }
                    }}
                  >
                    <circle className="qc-site-hit" r="44" />
                    <circle className="qc-site-aura" r="34" />
                    <path className="qc-site-base" d="M -26 22 H 27 L 20 31 H -20 Z" />
                    {alive ? (
                      <g className="qc-site-building" filter={state.vitality >= 2 ? 'url(#qc-site-glow)' : undefined}>
                        <path d="M -22 21 V -8 L -7 -21 L 5 -9 L 17 -27 L 24 -10 V 21 Z" />
                        <path d="M -11 21 V 4 H -3 V 21 M 10 21 V 0 H 18 V 21" />
                        {state.vitality >= 2 && <path d="M -29 27 H 31 M -25 33 H 27" />}
                        {state.vitality >= 3 && <path className="qc-site-crown" d="M 13 -28 L 18 -42 L 23 -27 M 18 -42 V -49" />}
                      </g>
                    ) : (
                      <g className="qc-site-pin"><circle r="10" /><path d="M -6 0 H 6 M 0 -6 V 6" /></g>
                    )}
                    <text className="qc-site-number" x="-38" y="-31">{String(index + 1).padStart(2, '0')}</text>
                    <text className="qc-site-name" y="50">{site.label}</text>
                    <g className="qc-site-needs" transform="translate(0 64)">
                      {site.needs.map((need, needIndex) => {
                        const program = PROGRAMS[need]
                        const direct = reading.programs.includes(need)
                        const borrowed = reading.borrowed.includes(need)
                        const amended = reading.amended.includes(need)
                        return (
                          <g key={need} className={`${borrowed ? 'is-borrowed' : ''} ${amended ? 'is-amended' : ''}`} transform={`translate(${(needIndex - (site.needs.length - 1) / 2) * 20} 0)`}>
                            <rect x="-7" y="-7" width="14" height="14" rx="2" fill={direct || borrowed || amended ? program.color : 'rgba(35,43,52,.16)'} />
                            <text y="3">{program.sigil}</text>
                          </g>
                        )
                      })}
                    </g>
                    <text className="qc-site-measure" x="30" y="-27">μ{reading.measure || '–'}</text>
                    {state.voice > 0 && <text className="qc-site-voice" x="31" y="-14">{state.voice}v</text>}
                    {state.scars > 0 && <path className="qc-site-scar" d="M -25 -15 L -12 -5 L -19 8 L -3 3 L 8 17 L 13 2 L 25 -9" />}
                  </g>
                )
              })}
            </g>

            {turning && (
              <g className="qc-weather" aria-hidden="true">
                <rect x="20" y="18" width="920" height="584" rx="18" />
                <path d="M 55 106 C 268 24 676 28 908 102" />
                <text x="480" y="300">SURVEY {String(world.cycle + 1).padStart(2, '0')}</text>
                <text className="qc-weather-subtitle" x="480" y="331">rooms become rules / ratios become consequence</text>
              </g>
            )}
          </svg>

          <div className="qc-cycle-rail" aria-label="commons progression">
            <span>ground</span>
            {[0, 1, 2, 3].map(index => (
              <i key={index} className={`${world.stableCycles >= index && index > 0 ? 'is-held' : ''} ${world.stableCycles === index ? 'is-current' : ''}`}>
                {index === 0 ? 'draft' : index === 3 ? 'self-rule' : index}
              </i>
            ))}
            <b className={amendmentCount ? 'is-ratified' : ''}>bridge</b>
          </div>

          <ol className="qc-chronicle" aria-label="survey chronicle">
            {world.log.slice(-3).reverse().map((entry, index) => (
              <li key={entry.id} style={{ opacity: 1 - index * 0.24 }}>
                <span>{String(entry.cycle).padStart(2, '0')}</span>{entry.text}
              </li>
            ))}
          </ol>
        </section>

        <section className="qc-bench" aria-label="survey instrument bench">
          <div className="qc-plate-index">
            <div className="qc-bench-label"><span>active ratio-plate</span><b>{selectedPlate.sigil} / {selectedPlate.label}</b></div>
            <div className="qc-plate-tabs" aria-label="select ratio plate">
              {PLATES.filter(plate => !plate.hidden || world.reciprocalUnlocked).map(plate => (
                <button
                  type="button"
                  key={plate.id}
                  onClick={() => selectPlate(plate.id)}
                  className={selectedPlateId === plate.id ? 'is-active' : ''}
                  style={{ '--tab-color': plate.color }}
                  aria-pressed={selectedPlateId === plate.id}
                >
                  <span>{plate.sigil}</span>
                  <small>{world.plates[plate.id].width}:{world.plates[plate.id].height}</small>
                </button>
              ))}
            </div>
            <p><strong>drag</strong> the plate. Arrow keys nudge it. The uppermost three cuts are audible at each address.</p>
          </div>

          <div className="qc-proof-bench">
            <div className="qc-proof-heading">
              <span>Euclidean interior</span>
              <strong>{selectedPlacement.width}:{selectedPlacement.height}</strong>
              <b>common measure {selectedProof.measure}</b>
            </div>
            <div className="qc-equation-tape" aria-label={`${selectedProof.steps.length} proof steps`}>
              {selectedProof.steps.map((step, index) => {
                const programId = selectedPlate.sequence[index % selectedPlate.sequence.length]
                const program = PROGRAMS[programId]
                return (
                  <div key={step.index} style={{ '--step-color': program.color }}>
                    <span>{program.sigil}</span>
                    <strong>{step.dividend} = {step.quotient}×{step.divisor}{step.remainder ? ` + ${step.remainder}` : ''}</strong>
                    <small>{program.label} / {step.orientation}</small>
                  </div>
                )
              })}
            </div>
            <div className="qc-calipers">
              <div>
                <button type="button" onClick={() => changeDimension('width', -1)} aria-label="Decrease selected plate width">−</button>
                <span>width <b>{selectedPlacement.width}</b><small>W / ⇧W</small></span>
                <button type="button" onClick={() => changeDimension('width', 1)} data-playground-action="change-ratio" aria-label="Increase selected plate width">＋</button>
              </div>
              <div>
                <button type="button" onClick={() => changeDimension('height', -1)} aria-label="Decrease selected plate height">−</button>
                <span>height <b>{selectedPlacement.height}</b><small>H / ⇧H</small></span>
                <button type="button" onClick={() => changeDimension('height', 1)} aria-label="Increase selected plate height">＋</button>
              </div>
              <div className="qc-turn-tools">
                <button type="button" onClick={() => rotateSelected(-1)} aria-label="Rotate selected plate counterclockwise">↶<small>Q</small></button>
                <button type="button" onClick={() => rotateSelected(1)} aria-label="Rotate selected plate clockwise">↷<small>E</small></button>
                <button type="button" onClick={() => shiftDepth(-1)} aria-label="Lower selected plate">↓<small>bury</small></button>
                <button type="button" onClick={() => shiftDepth(1)} aria-label="Raise selected plate">↑<small>raise</small></button>
              </div>
            </div>
          </div>

          <div className="qc-assembly-bench">
            <div className="qc-assembly-heading">
              <span>{world.assemblyUnlocked ? 'reciprocity assembly' : 'sealed assembly'}</span>
              <strong>{world.assemblyUnlocked ? `${world.bridges.length} bridges / ${amendmentCount} common rooms` : 'hold three briefs'}</strong>
              <b>{Object.values(world.sites).reduce((sum, site) => sum + site.voice, 0)} voice</b>
            </div>
            {world.assemblyUnlocked ? (
              <>
                <p>Drag a living address onto another, or press a viable proof below. Their upper measures must share a divisor greater than one.</p>
                <div className="qc-suggestion-tape">
                  {bridgeSuggestions.length === 0 && <span>no bridge can currently carry a missing room</span>}
                  {bridgeSuggestions.map(suggestion => (
                    <button
                      type="button"
                      key={suggestion.id}
                      onClick={() => createBridge(suggestion.source.id, suggestion.target.id, suggestion.program)}
                      data-playground-action="create-measuring-bridge"
                    >
                      <i style={{ backgroundColor: PROGRAMS[suggestion.program].color }}>{PROGRAMS[suggestion.program].sigil}</i>
                      <span><strong>{suggestion.source.label} → {suggestion.target.label}</strong><small>μ{suggestion.measure} / {suggestion.program}</small></span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="qc-assembly-seal"><i>μ</i><span>complete three addresses, then test the survey</span></div>
            )}
            {selectedSite && selectedReading && (
              <div className="qc-selected-site">
                <span>{selectedSite.label}</span>
                <b>μ{selectedReading.measure || '–'}</b>
                <small>{selectedReading.missing.length ? `missing ${selectedReading.missing.join(' + ')}` : 'brief complete'}</small>
              </div>
            )}
          </div>

          <div className="qc-cycle-console">
            <div><span>{phase}</span><strong>{livingCount} inhabited</strong><small>{world.fractures}/7 wounds</small></div>
            <button
              type="button"
              className={ready ? 'is-ready' : ''}
              onClick={turnCycle}
              disabled={!world.unlocked || world.status !== 'surveying' || turning}
              data-playground-action="test-survey"
            >
              <span>{turning ? 'weather entering' : ready ? 'ground can hold' : 'risk the draft'}</span>
              <strong>{turning ? 'SURVEYING…' : 'TEST SURVEY'}</strong>
              <small>SPACE</small>
            </button>
            <div className="qc-history-tools">
              <button type="button" onClick={rewind} disabled={world.history.length === 0}>lift weather</button>
              <button type="button" onClick={reset}>clear ground</button>
            </div>
          </div>
        </section>

        {!world.unlocked && (
          <div className="qc-seal">
            <div className="qc-seal-proof" aria-hidden="true">
              <i /><i /><i /><span>μ</span>
            </div>
            <p>UNSURVEYED COMMONS / LIVING INTERFACE 221</p>
            <h2>A city is a ratio<br />that learns whom it excludes.</h2>
            <button type="button" onClick={wake} data-playground-primary>
              lift tracing glass // enter the survey
            </button>
            <small>move ratios • cut quotient rooms • raise addresses • make common measure</small>
          </div>
        )}

        {world.status === 'mastered' && (
          <div className="qc-outcome qc-outcome-mastered">
            <span>mastery / survey {world.cycle} / {amendmentCount} permanent room{amendmentCount === 1 ? '' : 's'}</span>
            <h2>THE GROUND HAS LEARNED TO MEASURE ITSELF</h2>
            <p>Your ratios became rooms, the rooms became addresses, and incompatible districts found a divisor they could inhabit together. Geometry is no longer the plan beneath civic life; it is a negotiable organ inside it.</p>
            <div><button type="button" onClick={rewind}>lift last weather</button><button type="button" onClick={reset}>survey strange ground</button></div>
          </div>
        )}

        {world.status === 'ruined' && (
          <div className="qc-outcome qc-outcome-ruined">
            <span>failure / seven registration wounds</span>
            <h2>THE RULER BECAME AN EVICTION</h2>
            <p>The map remembers every address raised by a ratio that could not support it. Lift one weather, then cut a kinder interior or negotiate across a common measure.</p>
            <div><button type="button" onClick={rewind}>lift last weather</button><button type="button" onClick={reset}>clear the ground</button></div>
          </div>
        )}
      </main>
    </div>
  )
}

export default QuotientCommons
