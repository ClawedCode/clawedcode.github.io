import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ExperimentNav from '../../ExperimentNav'
import './CivicPalimpsest.css'

const STORAGE_KEY = 'clawed:civic-palimpsest:v2'
const LEGACY_STORAGE_KEY = 'clawed:civic-palimpsest:v1'
const VIEWBOX = { width: 920, height: 650 }

const CHARTERS = [
  {
    id: 'hearth',
    label: 'hearth charter',
    short: 'hearth',
    sigil: 'H',
    color: '#b94a35',
    wash: '#d66b4f',
    points: [[-126, -72], [88, -86], [128, -20], [104, 76], [-108, 82], [-136, 8]],
    law: 'holds bodies through the cold interval'
  },
  {
    id: 'archive',
    label: 'archive charter',
    short: 'archive',
    sigil: 'A',
    color: '#315a8c',
    wash: '#537fb3',
    points: [[-138, -62], [136, -68], [120, 78], [-96, 88], [-142, 28]],
    law: 'lets a ward remember its previous shape'
  },
  {
    id: 'commons',
    label: 'commons charter',
    short: 'commons',
    sigil: 'C',
    color: '#ad7726',
    wash: '#d3a345',
    points: [[-146, -68], [124, -84], [150, 54], [54, 88], [-146, 70]],
    law: 'turns private shelter into shared capacity'
  },
  {
    id: 'threshold',
    label: 'threshold charter',
    short: 'threshold',
    sigil: 'T',
    color: '#6b4d82',
    wash: '#9171aa',
    points: [[-96, -106], [110, -80], [126, 70], [0, 106], [-126, 68]],
    law: 'permits passage without dissolving difference'
  },
  {
    id: 'garden',
    label: 'garden charter',
    short: 'garden',
    sigil: 'G',
    color: '#4f7349',
    wash: '#799566',
    points: [[-126, -54], [-42, -106], [120, -74], [140, 70], [-58, 96], [-142, 44]],
    law: 'converts abandoned space into future nourishment'
  },
  {
    id: 'night',
    label: 'night charter',
    short: 'night',
    sigil: 'N',
    color: '#26313d',
    wash: '#536172',
    points: [[-154, -50], [-80, -102], [100, -86], [156, 0], [90, 88], [-116, 72]],
    law: 'makes room for what daylight refuses to classify',
    hidden: true
  }
]

const SITES = [
  { id: 'lamp-court', label: 'lamp court', x: 226, y: 182, needs: ['hearth', 'archive'] },
  { id: 'open-school', label: 'open school', x: 458, y: 152, needs: ['archive', 'commons'] },
  { id: 'rain-kitchen', label: 'rain kitchen', x: 686, y: 222, needs: ['commons', 'garden'] },
  { id: 'guest-stair', label: 'guest stair', x: 288, y: 432, needs: ['hearth', 'threshold'] },
  { id: 'seed-library', label: 'seed library', x: 538, y: 418, needs: ['archive', 'garden'] },
  { id: 'late-market', label: 'late market', x: 728, y: 474, needs: ['commons', 'threshold', 'night'], hidden: true },
  { id: 'sleeping-gate', label: 'sleeping gate', x: 476, y: 566, needs: ['hearth', 'garden', 'night'], hidden: true }
]

const SITE_EDGES = [
  ['lamp-court', 'open-school'],
  ['open-school', 'rain-kitchen'],
  ['lamp-court', 'guest-stair'],
  ['open-school', 'seed-library'],
  ['rain-kitchen', 'seed-library'],
  ['guest-stair', 'seed-library'],
  ['seed-library', 'late-market'],
  ['guest-stair', 'sleeping-gate'],
  ['seed-library', 'sleeping-gate'],
  ['late-market', 'sleeping-gate']
]

const INITIAL_CHARTERS = {
  hearth: { x: 250, y: 220, rotation: 0, scale: 1, depth: 2 },
  archive: { x: 342, y: 167, rotation: -7, scale: 1, depth: 4 },
  commons: { x: 572, y: 187, rotation: 17, scale: 1, depth: 3 },
  threshold: { x: 288, y: 432, rotation: 0, scale: 0.94, depth: 5 },
  garden: { x: 680, y: 250, rotation: 0, scale: 1, depth: 1 },
  night: { x: 636, y: 486, rotation: 7, scale: 0.9, depth: 0 }
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const charterById = (id) => CHARTERS.find(charter => charter.id === id)
const siteById = (id) => SITES.find(site => site.id === id)
const polygonPath = (points) => `${points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')} Z`

const pointInPolygon = (point, points) => {
  let inside = false
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const [xi, yi] = points[index]
    const [xj, yj] = points[previous]
    const intersects = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 0.0001) + xi)
    if (intersects) inside = !inside
  }
  return inside
}

const charterContains = (site, placement, charter) => {
  const angle = -placement.rotation * Math.PI / 180
  const dx = site.x - placement.x
  const dy = site.y - placement.y
  const local = {
    x: (dx * Math.cos(angle) - dy * Math.sin(angle)) / placement.scale,
    y: (dx * Math.sin(angle) + dy * Math.cos(angle)) / placement.scale
  }
  return pointInPolygon(local, charter.points)
}

const createSiteStates = () => Object.fromEntries(
  SITES.map(site => [site.id, { vitality: 0, founded: false, seasons: 0, scars: 0, voice: 0 }])
)

const freshWorld = () => ({
  version: 2,
  unlocked: false,
  charters: Object.fromEntries(Object.entries(INITIAL_CHARTERS).map(([id, placement]) => [id, { ...placement }])),
  sites: createSiteStates(),
  season: 0,
  stableSeasons: 0,
  fractures: 0,
  nightUnlocked: false,
  councilUnlocked: false,
  status: 'composing',
  pacts: [],
  amendments: {},
  ratifiedCount: 0,
  brokenAccords: 0,
  history: [],
  log: [
    { id: 'sealed', season: 0, text: 'the borough exists only as transparent propositions' }
  ],
  lastSaved: null
})

const loadWorld = () => {
  const fresh = freshWorld()
  if (typeof window === 'undefined') return fresh

  try {
    const current = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    const legacy = current || JSON.parse(window.localStorage.getItem(LEGACY_STORAGE_KEY))
    if (!legacy || ![1, 2].includes(legacy.version)) return fresh
    return {
      ...fresh,
      ...legacy,
      version: 2,
      charters: Object.fromEntries(
        CHARTERS.map(charter => [
          charter.id,
          { ...fresh.charters[charter.id], ...(legacy.charters?.[charter.id] || {}) }
        ])
      ),
      sites: Object.fromEntries(
        SITES.map(site => [
          site.id,
          { ...fresh.sites[site.id], ...(legacy.sites?.[site.id] || {}) }
        ])
      ),
      pacts: Array.isArray(legacy.pacts) ? legacy.pacts.slice(-6) : [],
      amendments: legacy.amendments && typeof legacy.amendments === 'object' ? legacy.amendments : {},
      councilUnlocked: Boolean(legacy.councilUnlocked || legacy.nightUnlocked),
      history: legacy.version === 2 && Array.isArray(legacy.history) ? legacy.history.slice(-10) : [],
      log: Array.isArray(legacy.log) ? legacy.log.slice(-8) : fresh.log
    }
  } catch {
    return fresh
  }
}

const snapshotWorld = (world) => ({
  charters: Object.fromEntries(Object.entries(world.charters).map(([id, placement]) => [id, { ...placement }])),
  sites: Object.fromEntries(Object.entries(world.sites).map(([id, site]) => [id, { ...site }])),
  season: world.season,
  stableSeasons: world.stableSeasons,
  fractures: world.fractures,
  nightUnlocked: world.nightUnlocked,
  councilUnlocked: world.councilUnlocked,
  status: world.status,
  pacts: world.pacts.map(pact => ({ ...pact })),
  amendments: Object.fromEntries(Object.entries(world.amendments).map(([id, laws]) => [id, [...laws]])),
  ratifiedCount: world.ratifiedCount,
  brokenAccords: world.brokenAccords,
  log: world.log.map(entry => ({ ...entry }))
})

const formatAge = (timestamp) => {
  if (!timestamp) return 'unpressed'
  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s held`
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes}m held` : `${Math.round(minutes / 60)}h held`
}

const deriveCity = (world) => {
  const charters = CHARTERS
    .filter(charter => !charter.hidden || world.nightUnlocked)
    .sort((left, right) => world.charters[left.id].depth - world.charters[right.id].depth)
  const sites = SITES.filter(site => !site.hidden || world.nightUnlocked)
  const base = Object.fromEntries(sites.map(site => {
    const covering = charters
      .filter(charter => charterContains(site, world.charters[charter.id], charter))
      .sort((left, right) => world.charters[right.id].depth - world.charters[left.id].depth)
    const audible = covering.slice(0, 3)
    return [site.id, {
      covering,
      audible,
      baseAudibleIds: audible.map(charter => charter.id),
      occluded: covering.slice(3)
    }]
  }))

  const readings = Object.fromEntries(sites.map(site => {
    const amendedIds = [...new Set(world.amendments[site.id] || [])]
    const pactLaws = world.pacts
      .filter(pact => (
        pact.toId === site.id &&
        pact.strain < 2 &&
        world.sites[pact.fromId]?.vitality > 0
      ))
      .map(pact => pact.law)
    const effectiveIds = [...new Set([...base[site.id].baseAudibleIds, ...amendedIds, ...pactLaws])]
    return [site.id, {
      ...base[site.id],
      effectiveIds,
      amendedIds,
      pactLaws,
      eligible: site.needs.every(need => effectiveIds.includes(need)),
      missing: site.needs.filter(need => !effectiveIds.includes(need))
    }]
  }))

  return { charters, sites, readings }
}

const arcPath = (from, to, bend = 30) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy) || 1
  const cx = (from.x + to.x) / 2 - dy / distance * bend
  const cy = (from.y + to.y) / 2 + dx / distance * bend
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`
}

const CivicPalimpsest = ({ category, experiment }) => {
  const [world, setWorld] = useState(loadWorld)
  const [selectedId, setSelectedId] = useState('hearth')
  const [message, setMessage] = useState(() => (
    world.unlocked
      ? `folio resumed at season ${world.season} // the old borough has entered a second constitution`
      : 'six laws sleep as translucent territory'
  ))
  const [charterDrag, setCharterDrag] = useState(null)
  const [accordDrag, setAccordDrag] = useState(null)
  const [accordSourceId, setAccordSourceId] = useState(null)
  const [turning, setTurning] = useState(false)
  const [savedAt, setSavedAt] = useState(() => world.lastSaved)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [mobilePane, setMobilePane] = useState('map')

  const svgRef = useRef(null)
  const surfaceRef = useRef(null)
  const worldRef = useRef(world)
  const charterDragRef = useRef(null)
  const accordDragRef = useRef(null)
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
        // The city can remain momentary when browser storage is unavailable.
      }
    }, 160)

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [world])

  useEffect(() => () => {
    if (turnTimerRef.current) window.clearTimeout(turnTimerRef.current)
  }, [])

  const city = useMemo(() => deriveCity(world), [world])
  const { charters: visibleCharters, sites: visibleSites, readings: siteReadings } = city
  const eligibleCount = visibleSites.filter(site => siteReadings[site.id]?.eligible).length
  const nocturnalReady = visibleSites.some(site => site.hidden && siteReadings[site.id]?.eligible)
  const livingCount = visibleSites.filter(site => world.sites[site.id].vitality > 0).length
  const amendmentCount = Object.values(world.amendments).reduce((sum, laws) => sum + laws.length, 0)
  const selectedCharter = charterById(selectedId) || CHARTERS[0]
  const selectedPlacement = world.charters[selectedCharter.id]
  const cityReady = eligibleCount >= 4 && (!world.nightUnlocked || nocturnalReady)
  const phase = world.status === 'mastered'
    ? 'self-governing'
    : world.status === 'ruined'
      ? 'redacted'
      : amendmentCount > 0
        ? 'constitutional'
        : world.councilUnlocked
          ? 'council'
          : world.nightUnlocked
            ? 'nocturne'
            : world.unlocked
              ? 'drafting'
              : 'sealed'

  const edges = useMemo(() => SITE_EDGES.map(([fromId, toId]) => {
    const from = siteById(fromId)
    const to = siteById(toId)
    const fromState = world.sites[fromId]
    const toState = world.sites[toId]
    const visible = visibleSites.some(site => site.id === fromId) && visibleSites.some(site => site.id === toId)
    const alive = visible && fromState.vitality > 0 && toState.vitality > 0
    return {
      id: `${fromId}-${toId}`,
      path: arcPath(from, to, ((fromId.length + toId.length) % 2 ? 1 : -1) * 22),
      visible,
      alive,
      strength: Math.min(fromState.vitality, toState.vitality)
    }
  }), [visibleSites, world.sites])

  const petitionSuggestions = useMemo(() => {
    const suggestions = []
    visibleSites.forEach(target => {
      visibleSites.forEach(source => {
        if (source.id === target.id || world.sites[source.id].vitality <= 0 || world.sites[source.id].voice <= 0) return
        const candidates = target.needs.filter(law => (
          siteReadings[source.id].baseAudibleIds.includes(law) &&
          !(world.amendments[target.id] || []).includes(law) &&
          !world.pacts.some(pact => pact.toId === target.id && pact.law === law)
        ))
        if (!candidates.length) return
        const law = candidates.find(id => siteReadings[target.id].missing.includes(id)) || candidates[0]
        suggestions.push({
          id: `${source.id}-${target.id}-${law}`,
          source,
          target,
          law,
          urgent: siteReadings[target.id].missing.includes(law)
        })
      })
    })
    return suggestions.sort((left, right) => Number(right.urgent) - Number(left.urgent)).slice(0, 5)
  }, [siteReadings, visibleSites, world.amendments, world.pacts, world.sites])

  const wake = useCallback(() => {
    setWorld(current => ({
      ...current,
      unlocked: true,
      log: [
        ...current.log,
        { id: `wake-${Date.now()}`, season: current.season, text: 'the hand entered the municipal fiction' }
      ].slice(-8)
    }))
    setMessage('drag the charters // each plot hears only the uppermost three laws')
    requestAnimationFrame(() => surfaceRef.current?.focus())
  }, [])

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

  const selectCharter = useCallback((charterId) => {
    setSelectedId(charterId)
    const charter = charterById(charterId)
    setMessage(`${charter.label} selected // ${charter.law}`)
  }, [])

  const beginCharterDrag = useCallback((event, charterId) => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'composing' || turning) return
    const point = svgPointFromClient(event.clientX, event.clientY)
    if (!point) return
    event.preventDefault()
    event.stopPropagation()
    const placement = current.charters[charterId]
    const nextDrag = {
      id: charterId,
      startX: point.x,
      startY: point.y,
      originX: placement.x,
      originY: placement.y,
      moved: false
    }
    charterDragRef.current = nextDrag
    setCharterDrag(nextDrag)
    setSelectedId(charterId)
  }, [svgPointFromClient, turning])

  useEffect(() => {
    if (!charterDrag?.id) return undefined

    const handleMove = (event) => {
      const currentDrag = charterDragRef.current
      if (!currentDrag) return
      const point = svgPointFromClient(event.clientX, event.clientY)
      if (!point) return
      const distance = Math.hypot(point.x - currentDrag.startX, point.y - currentDrag.startY)
      const nextDrag = { ...currentDrag, moved: currentDrag.moved || distance > 4 }
      charterDragRef.current = nextDrag
      setCharterDrag(nextDrag)
      setWorld(current => ({
        ...current,
        charters: {
          ...current.charters,
          [currentDrag.id]: {
            ...current.charters[currentDrag.id],
            x: clamp(currentDrag.originX + point.x - currentDrag.startX, 118, VIEWBOX.width - 118),
            y: clamp(currentDrag.originY + point.y - currentDrag.startY, 104, VIEWBOX.height - 82)
          }
        }
      }))
    }

    const handleUp = () => {
      const currentDrag = charterDragRef.current
      if (currentDrag?.moved) {
        const reading = deriveCity(worldRef.current)
        const count = reading.sites.filter(site => reading.readings[site.id].eligible).length
        setMessage(`${charterById(currentDrag.id).label} moved // ${count} plots can now hold their covenants`)
      }
      charterDragRef.current = null
      setCharterDrag(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [charterDrag?.id, svgPointFromClient])

  const createAccord = useCallback((fromId, toId, requestedLaw = null) => {
    const current = worldRef.current
    const currentCity = deriveCity(current)
    const source = siteById(fromId)
    const target = siteById(toId)
    if (!source || !target || source.id === target.id || !current.councilUnlocked || current.status !== 'composing' || turning) return false
    if (current.sites[fromId].vitality <= 0 || current.sites[fromId].voice <= 0) {
      setMessage(`${source.label} has no civic voice to spend // hold it through another season`)
      return false
    }

    const candidates = target.needs.filter(law => (
      currentCity.readings[fromId]?.baseAudibleIds.includes(law) &&
      !(current.amendments[toId] || []).includes(law) &&
      !current.pacts.some(pact => pact.toId === toId && pact.law === law)
    ))
    const law = candidates.includes(requestedLaw)
      ? requestedLaw
      : candidates.find(id => currentCity.readings[toId]?.missing.includes(id)) || candidates[0]

    if (!law) {
      setMessage(`${source.label} cannot answer ${target.label} // their audible laws share no unmet covenant`)
      return false
    }

    const pact = {
      id: `accord-${Date.now()}-${fromId}-${toId}`,
      fromId,
      toId,
      law,
      age: 0,
      strain: 0
    }
    setWorld(previous => ({
      ...previous,
      sites: {
        ...previous.sites,
        [fromId]: { ...previous.sites[fromId], voice: previous.sites[fromId].voice - 1 }
      },
      pacts: [...previous.pacts, pact].slice(-6),
      log: [
        ...previous.log,
        { id: pact.id, season: previous.season, text: `${source.label} carried ${law} to ${target.label}` }
      ].slice(-8)
    }))
    setAccordSourceId(null)
    setMessage(`${charterById(law).label} travels from ${source.label} to ${target.label} // hold both wards for two seasons to ratify it`)
    return true
  }, [turning])

  const handleSiteActivate = useCallback((siteId) => {
    if (suppressSiteClickRef.current) {
      suppressSiteClickRef.current = false
      return
    }
    const current = worldRef.current
    if (!current.councilUnlocked) {
      setMessage('wards cannot negotiate before the first civic weather holds')
      return
    }
    if (!accordSourceId) {
      if (current.sites[siteId].vitality <= 0 || current.sites[siteId].voice <= 0) {
        setMessage(`${siteById(siteId).label} has no spendable voice // choose a living numbered seal`)
        return
      }
      setAccordSourceId(siteId)
      setMessage(`${siteById(siteId).label} selected as envoy // tap or drag toward another plot`)
      return
    }
    if (accordSourceId === siteId) {
      setAccordSourceId(null)
      setMessage('the unsigned accord returns to the docket')
      return
    }
    createAccord(accordSourceId, siteId)
  }, [accordSourceId, createAccord])

  const nearestSiteFromPoint = useCallback((point) => {
    if (!point) return null
    let nearest = null
    let distance = Infinity
    deriveCity(worldRef.current).sites.forEach(site => {
      const nextDistance = Math.hypot(point.x - site.x, point.y - site.y)
      if (nextDistance < 62 && nextDistance < distance) {
        nearest = site.id
        distance = nextDistance
      }
    })
    return nearest
  }, [])

  const beginAccordDrag = useCallback((event, siteId) => {
    const current = worldRef.current
    if (!current.councilUnlocked || current.status !== 'composing' || turning || current.sites[siteId].vitality <= 0 || current.sites[siteId].voice <= 0) return
    const point = svgPointFromClient(event.clientX, event.clientY)
    if (!point) return
    event.preventDefault()
    event.stopPropagation()
    const nextDrag = {
      fromId: siteId,
      startX: point.x,
      startY: point.y,
      x: point.x,
      y: point.y,
      targetId: null,
      moved: false
    }
    accordDragRef.current = nextDrag
    setAccordDrag(nextDrag)
    setAccordSourceId(siteId)
  }, [svgPointFromClient, turning])

  useEffect(() => {
    if (!accordDrag?.fromId) return undefined

    const handleMove = (event) => {
      const current = accordDragRef.current
      if (!current) return
      const point = svgPointFromClient(event.clientX, event.clientY)
      if (!point) return
      const moved = current.moved || Math.hypot(point.x - current.startX, point.y - current.startY) > 6
      const targetId = moved ? nearestSiteFromPoint(point) : null
      const next = { ...current, x: point.x, y: point.y, moved, targetId }
      accordDragRef.current = next
      setAccordDrag(next)
    }

    const handleUp = () => {
      const current = accordDragRef.current
      if (current?.moved) {
        suppressSiteClickRef.current = true
        if (current.targetId && current.targetId !== current.fromId) {
          createAccord(current.fromId, current.targetId)
        } else {
          setMessage('the accord found no receiving seal // try the petition docket')
        }
      }
      accordDragRef.current = null
      setAccordDrag(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [accordDrag?.fromId, createAccord, nearestSiteFromPoint, svgPointFromClient])

  const alterCharter = useCallback((charterId, change, copy) => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'composing' || turning) return
    setWorld(previous => ({
      ...previous,
      charters: {
        ...previous.charters,
        [charterId]: {
          ...previous.charters[charterId],
          ...change(previous.charters[charterId], previous.charters)
        }
      }
    }))
    setSelectedId(charterId)
    setMessage(copy)
  }, [turning])

  const rotateCharter = useCallback((direction) => {
    const charter = charterById(selectedId)
    alterCharter(
      selectedId,
      placement => ({ rotation: (placement.rotation + direction * 15 + 360) % 360 }),
      `${charter.label} turned ${direction > 0 ? 'clockwise' : 'counterclockwise'} // its jurisdiction cuts new edges`
    )
  }, [alterCharter, selectedId])

  const scaleCharter = useCallback((direction) => {
    const charter = charterById(selectedId)
    alterCharter(
      selectedId,
      placement => ({ scale: clamp(Math.round((placement.scale + direction * 0.08) * 100) / 100, 0.76, 1.18) }),
      `${charter.label} ${direction > 0 ? 'expanded' : 'contracted'} // reach is never free of consequence`
    )
  }, [alterCharter, selectedId])

  const shiftDepth = useCallback((direction) => {
    const charter = charterById(selectedId)
    alterCharter(
      selectedId,
      (placement, placements) => ({
        depth: direction > 0
          ? Math.max(...Object.values(placements).map(item => item.depth)) + 1
          : Math.min(...Object.values(placements).map(item => item.depth)) - 1
      }),
      `${charter.label} sent ${direction > 0 ? 'to the speaking surface' : 'beneath the other laws'} // layer order changed`
    )
  }, [alterCharter, selectedId])

  const nudgeSelected = useCallback((dx, dy) => {
    alterCharter(
      selectedId,
      placement => ({
        x: clamp(placement.x + dx, 118, VIEWBOX.width - 118),
        y: clamp(placement.y + dy, 104, VIEWBOX.height - 82)
      }),
      `${charterById(selectedId).label} nudged into a finer alignment`
    )
  }, [alterCharter, selectedId])

  const resolveSeason = useCallback(() => {
    turnTimerRef.current = null
    const current = worldRef.current
    if (current.status !== 'composing') {
      setTurning(false)
      return
    }

    const currentCity = deriveCity(current)
    const readyCount = currentCity.sites.filter(site => currentCity.readings[site.id].eligible).length
    const nocturnalStable = currentCity.sites.some(site => site.hidden && currentCity.readings[site.id].eligible)
    const stableNow = readyCount >= 4 && (!current.nightUnlocked || nocturnalStable)
    let fractureGain = 0
    const nextSites = Object.fromEntries(SITES.map(site => {
      const previous = current.sites[site.id]
      if (site.hidden && !current.nightUnlocked) return [site.id, previous]
      if (currentCity.readings[site.id].eligible) {
        const vitality = clamp(previous.vitality + 1, 0, 3)
        return [site.id, {
          ...previous,
          vitality,
          founded: true,
          seasons: previous.seasons + 1,
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

    const nextAmendments = Object.fromEntries(Object.entries(current.amendments).map(([id, laws]) => [id, [...laws]]))
    let ratified = 0
    let broken = 0
    const ratifiedLaws = []
    const nextPacts = []
    current.pacts.forEach(pact => {
      const sustained = (
        nextSites[pact.fromId]?.vitality > 0 &&
        nextSites[pact.toId]?.vitality > 0 &&
        currentCity.readings[pact.toId]?.eligible
      )
      const age = sustained ? pact.age + 1 : pact.age
      const strain = sustained ? Math.max(0, pact.strain - 1) : pact.strain + 1
      if (age >= 2) {
        nextAmendments[pact.toId] = [...new Set([...(nextAmendments[pact.toId] || []), pact.law])]
        ratified += 1
        ratifiedLaws.push(pact.law)
      } else if (strain >= 2) {
        broken += 1
      } else {
        nextPacts.push({ ...pact, age, strain })
      }
    })
    fractureGain += broken

    const nextStable = stableNow ? current.stableSeasons + 1 : 0
    const nextFractures = current.fractures + fractureGain
    const unlockNight = current.nightUnlocked || (stableNow && nextStable >= 1)
    const councilUnlocked = current.councilUnlocked || unlockNight || Object.values(nextSites).filter(site => site.founded).length >= 3
    const nextAmendmentCount = Object.values(nextAmendments).reduce((sum, laws) => sum + laws.length, 0)
    const mastered = unlockNight && stableNow && nextStable >= 3 && nextAmendmentCount >= 1
    const ruined = !mastered && nextFractures >= 6
    const nextStatus = mastered ? 'mastered' : ruined ? 'ruined' : 'composing'
    const nextSeason = current.season + 1
    const seasonText = mastered
      ? 'three nocturnes and one living amendment held // the city can now revise itself'
      : ruined
        ? 'too many wards and accords broke // redaction became geography'
        : ratified
          ? `${charterById(ratifiedLaws[0])?.short || 'borrowed law'} became local constitution // the treaty vanished into the ward`
          : !current.nightUnlocked && unlockNight
            ? 'four wards held // night entered and the first council convened'
            : stableNow && nextAmendmentCount === 0
              ? `${readyCount} wards held // stability ${nextStable}/3, but self-government still needs a ratified accord`
              : stableNow
                ? `${readyCount} wards held together // stability ${nextStable}/3`
                : `${readyCount} wards held // ${fractureGain} civic seam${fractureGain === 1 ? '' : 's'} opened`

    setWorld(previous => ({
      ...previous,
      sites: nextSites,
      season: nextSeason,
      stableSeasons: nextStable,
      fractures: nextFractures,
      nightUnlocked: unlockNight,
      councilUnlocked,
      status: nextStatus,
      pacts: nextPacts,
      amendments: nextAmendments,
      ratifiedCount: previous.ratifiedCount + ratified,
      brokenAccords: previous.brokenAccords + broken,
      history: [...previous.history, snapshotWorld(previous)].slice(-10),
      log: [
        ...previous.log,
        { id: `season-${Date.now()}`, season: nextSeason, text: seasonText }
      ].slice(-8)
    }))
    if (!current.nightUnlocked && unlockNight) setSelectedId('night')
    if (councilUnlocked) setMobilePane(previous => previous === 'map' ? 'map' : 'council')
    setMessage(seasonText)
    setTurning(false)
  }, [])

  const turnSeason = useCallback(() => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'composing' || turning) return
    setTurning(true)
    setMessage(cityReady
      ? 'the folio is turning // covenants, accords, and amendments meet the same weather'
      : 'the folio is turning // unsupported wards and strained accords will thin')
    turnTimerRef.current = window.setTimeout(resolveSeason, reducedMotion ? 80 : 1050)
  }, [cityReady, reducedMotion, resolveSeason, turning])

  const rewind = useCallback(() => {
    if (turnTimerRef.current) {
      window.clearTimeout(turnTimerRef.current)
      turnTimerRef.current = null
    }
    const current = worldRef.current
    const snapshot = current.history.at(-1)
    if (!snapshot) {
      setMessage('no earlier season remains beneath this sheet')
      return
    }
    setWorld(previous => ({
      ...previous,
      ...snapshot,
      unlocked: true,
      history: previous.history.slice(0, -1)
    }))
    setAccordSourceId(null)
    setTurning(false)
    setMessage('one season lifted // laws, voices, accords, and inhabitants returned together')
  }, [])

  const reset = useCallback(() => {
    if (turnTimerRef.current) window.clearTimeout(turnTimerRef.current)
    setWorld(freshWorld())
    setSelectedId('hearth')
    setCharterDrag(null)
    setAccordDrag(null)
    setAccordSourceId(null)
    setTurning(false)
    setMobilePane('map')
    setMessage('a blank civic fiction replaces the remembered borough')
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
      rotateCharter(-1)
    }
    if (event.key.toLowerCase() === 'e') {
      event.preventDefault()
      rotateCharter(1)
    }
    if (event.key === '[') {
      event.preventDefault()
      shiftDepth(-1)
    }
    if (event.key === ']') {
      event.preventDefault()
      shiftDepth(1)
    }
    if (event.key === ' ') {
      event.preventDefault()
      turnSeason()
    }
  }, [nudgeSelected, rotateCharter, shiftDepth, turnSeason])

  return (
    <div className={`cp-shell phase-${phase} ${turning ? 'is-turning' : ''} ${reducedMotion ? 'is-reduced-motion' : ''}`}>
      <header className="cp-crownbar">
        <div className="cp-nav"><ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} /></div>
        <div className="cp-folio-title">
          <span>living folio / constitutional generation 220</span>
          <h1 style={{ color: experiment.color }}>{experiment.name}</h1>
        </div>
        <div className="cp-memory" title="This civic composition is saved in this browser">
          <span /> local folio // {formatAge(savedAt)}
        </div>
      </header>

      <main
        ref={surfaceRef}
        className={`cp-surface is-pane-${mobilePane}`}
        tabIndex={0}
        onKeyDown={handleSurfaceKeyDown}
        data-playground-surface
        data-testid="civic-palimpsest-surface"
        aria-label="Persistent civic charter and accord composition"
      >
        <div className="cp-workspace">
          <section className="cp-stage" aria-label="charter map and inhabited wards">
            <div className="cp-map-scroll">
              <svg
                ref={svgRef}
                className="cp-map"
                viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
                preserveAspectRatio="xMidYMid meet"
                aria-label={`${eligibleCount} plots currently satisfy their covenants; ${world.pacts.length} active accords`}
              >
                <defs>
                  <pattern id="cp-paper-grid" width="26" height="26" patternUnits="userSpaceOnUse">
                    <path d="M 26 0 H 0 V 26" fill="none" stroke="rgba(40,45,41,.11)" strokeWidth=".7" />
                    <circle cx="0" cy="0" r="1.2" fill="rgba(40,45,41,.16)" />
                  </pattern>
                  <filter id="cp-paper-noise" x="-10%" y="-10%" width="120%" height="120%">
                    <feTurbulence type="fractalNoise" baseFrequency=".42" numOctaves="3" seed="220" result="noise" />
                    <feColorMatrix in="noise" type="saturate" values="0" result="gray" />
                    <feBlend in="SourceGraphic" in2="gray" mode="soft-light" />
                  </filter>
                  <filter id="cp-ward-glow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <marker id="cp-accord-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 Z" />
                  </marker>
                  {visibleCharters.map(charter => (
                    <clipPath id={`cp-clip-${charter.id}`} key={charter.id}>
                      <path d={polygonPath(charter.points)} />
                    </clipPath>
                  ))}
                </defs>

                <rect className="cp-paper-field" width="920" height="650" rx="22" />
                <rect className="cp-registration" x="18" y="18" width="884" height="614" rx="16" fill="url(#cp-paper-grid)" />
                <path className="cp-river" d="M 48 518 C 154 468 210 528 310 486 C 424 438 490 512 586 496 C 696 476 758 378 884 414" />
                <path className="cp-old-wall" d="M 116 114 C 220 84 332 104 416 82 M 720 112 L 838 168 L 814 298 M 84 352 L 124 568 L 238 606" />

                <g className="cp-site-roads">
                  {edges.filter(edge => edge.visible).map(edge => (
                    <g key={edge.id} className={edge.alive ? 'is-alive' : ''} style={{ '--road-strength': edge.strength }}>
                      <path className="cp-road-bed" d={edge.path} />
                      <path className="cp-road-ink" d={edge.path} />
                    </g>
                  ))}
                </g>

                <g className="cp-accord-layer">
                  {world.pacts.map((pact, index) => {
                    const from = siteById(pact.fromId)
                    const to = siteById(pact.toId)
                    if (!from || !to || !visibleSites.some(site => site.id === from.id) || !visibleSites.some(site => site.id === to.id)) return null
                    const path = arcPath(from, to, 44 + index * 7)
                    const charter = charterById(pact.law)
                    return (
                      <g key={pact.id} className={`cp-accord is-age-${pact.age} ${pact.strain ? 'is-strained' : ''}`} style={{ '--accord-color': charter.color }}>
                        <path className="cp-accord-underlay" d={path} />
                        <path className="cp-accord-thread" d={path} markerEnd="url(#cp-accord-arrow)" />
                        {!reducedMotion && (
                          <circle className="cp-accord-carrier" r="4">
                            <animateMotion dur={`${3.4 - pact.age * 0.5}s`} repeatCount="indefinite" path={path} />
                          </circle>
                        )}
                        <g transform={`translate(${(from.x + to.x) / 2} ${(from.y + to.y) / 2 - 15})`} className="cp-accord-seal">
                          <circle r="15" />
                          <text y="4">{charter.sigil}</text>
                          <text className="cp-accord-age" y="28">{pact.age}/2</text>
                        </g>
                      </g>
                    )
                  })}
                  {accordDrag?.moved && (
                    <path
                      className="cp-accord-draft"
                      d={arcPath(siteById(accordDrag.fromId), { x: accordDrag.x, y: accordDrag.y }, 28)}
                    />
                  )}
                </g>

                <g className="cp-charter-layer">
                  {visibleCharters.map((charter, charterIndex) => {
                    const placement = world.charters[charter.id]
                    const selected = charter.id === selectedId
                    const affected = visibleSites.filter(site => siteReadings[site.id]?.baseAudibleIds.includes(charter.id)).length
                    return (
                      <g
                        key={charter.id}
                        className={`cp-charter ${selected ? 'is-selected' : ''} ${charterDrag?.id === charter.id ? 'is-dragging' : ''}`}
                        transform={`translate(${placement.x} ${placement.y}) rotate(${placement.rotation}) scale(${placement.scale})`}
                        style={{ '--charter-color': charter.color, '--charter-wash': charter.wash, '--charter-order': charterIndex }}
                        role="button"
                        tabIndex={world.unlocked ? 0 : -1}
                        aria-label={`${charter.label}, layer ${placement.depth}, reaches ${affected} plots`}
                        onPointerDown={(event) => beginCharterDrag(event, charter.id)}
                        onClick={(event) => {
                          event.stopPropagation()
                          selectCharter(charter.id)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            selectCharter(charter.id)
                          }
                        }}
                      >
                        <path className="cp-charter-shadow" d={polygonPath(charter.points)} transform="translate(7 9)" />
                        <path className="cp-charter-sheet" d={polygonPath(charter.points)} filter="url(#cp-paper-noise)" />
                        <g className="cp-charter-hatching" clipPath={`url(#cp-clip-${charter.id})`}>
                          {Array.from({ length: 9 }, (_, index) => (
                            <line key={index} x1="-180" y1={-86 + index * 22} x2="180" y2={-112 + index * 22} />
                          ))}
                        </g>
                        <path className="cp-charter-border" d={polygonPath(charter.points)} />
                        <circle className="cp-charter-handle" cx="0" cy="0" r="28" />
                        <circle className="cp-charter-handle-inner" cx="0" cy="0" r="18" />
                        <text className="cp-charter-sigil" x="0" y="7">{charter.sigil}</text>
                        <text className="cp-charter-name" x="-94" y="-43">{charter.short}</text>
                        <text className="cp-charter-layer-label" x="-94" y="-27">layer {placement.depth} / {affected} heard</text>
                        <path className="cp-charter-grip" d="M -42 0 H -31 M 31 0 H 42 M 0 -42 V -31 M 0 31 V 42" />
                      </g>
                    )
                  })}
                </g>

                <g className="cp-sites">
                  {visibleSites.map((site, siteIndex) => {
                    const reading = siteReadings[site.id]
                    const state = world.sites[site.id]
                    const alive = state.vitality > 0
                    const source = accordSourceId === site.id
                    const target = accordDrag?.targetId === site.id
                    return (
                      <g
                        key={site.id}
                        className={`cp-site ${reading.eligible ? 'is-eligible' : ''} ${alive ? 'is-alive' : ''} ${state.scars ? 'is-scarred' : ''} ${source ? 'is-accord-source' : ''} ${target ? 'is-accord-target' : ''}`}
                        transform={`translate(${site.x} ${site.y})`}
                        style={{ '--site-index': siteIndex, '--site-vitality': state.vitality, '--site-scale': 0.72 + state.vitality * 0.1 }}
                        role={world.councilUnlocked ? 'button' : undefined}
                        tabIndex={world.councilUnlocked ? 0 : -1}
                        aria-label={`${site.label}. ${alive ? `vitality ${state.vitality}, voice ${state.voice}` : 'uninhabited'}. ${reading.eligible ? 'Covenants satisfied.' : `Missing ${reading.missing.join(', ') || 'no law'}.`}`}
                        onPointerDown={(event) => beginAccordDrag(event, site.id)}
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
                        <circle className="cp-site-hit" r="42" />
                        <circle className="cp-site-reach" r="46" />
                        {alive && (
                          <g className="cp-ward-buildings" filter={state.vitality >= 2 ? 'url(#cp-ward-glow)' : undefined}>
                            <path d="M -23 20 V -7 L -8 -20 L 6 -8 L 19 -25 L 25 20 Z" />
                            <path d="M -13 20 V 5 H -3 V 20 M 10 20 V -1 H 18 V 20" />
                            {state.vitality >= 2 && <path d="M -31 20 H 33 M -27 27 H 29" />}
                            {state.vitality >= 3 && <path className="cp-ward-crown" d="M -4 -22 L 1 -38 L 7 -21 M 1 -38 V -47" />}
                          </g>
                        )}
                        {!alive && <circle className="cp-site-knot" r="12" />}
                        <circle className="cp-site-core" r={alive ? 8 : 5} />
                        <text className="cp-site-index" x="-38" y="-30">{String(siteIndex + 1).padStart(2, '0')}</text>
                        <text className="cp-site-name" y="42">{site.label}</text>
                        <g className="cp-site-needs" transform="translate(0 55)">
                          {site.needs.map((need, index) => {
                            const charter = charterById(need)
                            const baseMatched = reading.baseAudibleIds.includes(need)
                            const amended = reading.amendedIds.includes(need)
                            const borrowed = reading.pactLaws.includes(need)
                            return (
                              <g key={need} className={`${amended ? 'is-amended' : ''} ${borrowed ? 'is-borrowed' : ''}`} transform={`translate(${(index - (site.needs.length - 1) / 2) * 18} 0)`}>
                                <circle r={amended ? 8 : 6} fill={baseMatched || amended || borrowed ? charter.color : 'rgba(47,47,40,.16)'} />
                                <text y="3">{charter.sigil}</text>
                              </g>
                            )
                          })}
                        </g>
                        {state.voice > 0 && <text className="cp-site-voice" x="29" y="-25">{state.voice}v</text>}
                        {reading.occluded.length > 0 && <text className="cp-occluded" y="72">{reading.occluded.length} law beneath</text>}
                        {state.scars > 0 && <path className="cp-site-scar" d="M -19 -12 L -8 -2 L -15 12 L 2 5 L 13 17 L 17 2 L 27 -8" />}
                      </g>
                    )
                  })}
                </g>

                {turning && (
                  <g className="cp-season-wash" aria-hidden="true">
                    <rect x="20" y="20" width="880" height="610" rx="16" />
                    <path d="M 44 84 C 246 18 626 18 878 84" />
                    <text x="460" y="315">SEASON {String(world.season + 1).padStart(2, '0')}</text>
                    <text className="cp-season-subtitle" x="460" y="346">laws become weather / promises become structure</text>
                  </g>
                )}
              </svg>
            </div>

            <div className="cp-live-readout" role="status">
              <span>{phase}</span>
              <strong>{eligibleCount}/{world.nightUnlocked ? 7 : 5} covenants</strong>
              <small>{livingCount} inhabited // {world.fractures}/6 fractures</small>
            </div>

            <div className="cp-civic-clock" aria-label="city progression">
              <span>weather</span>
              {[0, 1, 2, 3].map(index => (
                <i key={index} className={`${world.stableSeasons >= index && index > 0 ? 'is-held' : ''} ${world.stableSeasons === index ? 'is-current' : ''}`}>
                  {index === 0 ? 'draft' : index === 3 ? 'self-rule' : index}
                </i>
              ))}
              <b className={amendmentCount ? 'is-sealed' : ''}>amend</b>
            </div>

            <ol className="cp-chronicle" aria-label="civic chronicle">
              {world.log.slice(-3).reverse().map((entry, index) => (
                <li key={entry.id} style={{ opacity: 1 - index * 0.22 }}>
                  <span>{String(entry.season).padStart(2, '0')}</span>{entry.text}
                </li>
              ))}
            </ol>

            {world.councilUnlocked && (
              <button type="button" className="cp-map-council-call" onClick={() => setMobilePane('council')}>
                council docket <span>{world.pacts.length} accords / {amendmentCount} amendments</span>
              </button>
            )}
          </section>

          <aside className="cp-council" aria-label="civic composition and council docket">
            <div className="cp-council-heading">
              <span>{world.councilUnlocked ? 'assembly convened' : 'sealed municipal chamber'}</span>
              <h2>{world.councilUnlocked ? 'THE BOROUGH SPEAKS BACK' : 'COMPOSE THE FIRST WEATHER'}</h2>
              <p>{world.councilUnlocked
                ? 'Living wards earn voice each season. Carry one of their audible laws into another plot; hold the accord twice and it becomes local constitution.'
                : 'Layer transparent charters until four plots hear every covenant they require. Three inhabited plots convene the council; a stable four invite night.'}</p>
            </div>

            <section className="cp-instrument" aria-label="selected charter controls">
              <div className="cp-instrument-heading">
                <span>active instrument / {selectedCharter.sigil}</span>
                <strong style={{ color: selectedCharter.color }}>{selectedCharter.label}</strong>
                <p>{selectedCharter.law}</p>
              </div>

              <div className="cp-charter-tabs" aria-label="select charter">
                {CHARTERS.filter(charter => !charter.hidden || world.nightUnlocked).map(charter => (
                  <button
                    type="button"
                    key={charter.id}
                    onClick={() => selectCharter(charter.id)}
                    className={selectedId === charter.id ? 'is-active' : ''}
                    style={{ '--tab-color': charter.color }}
                    aria-pressed={selectedId === charter.id}
                    aria-label={`Select ${charter.label}`}
                  >
                    {charter.sigil}
                  </button>
                ))}
              </div>

              <div className="cp-transform-grid">
                <button type="button" onClick={() => rotateCharter(-1)} disabled={world.status !== 'composing'} data-playground-action="rotate-charter">
                  <b>↶</b><span>turn left</span><small>Q</small>
                </button>
                <button type="button" onClick={() => rotateCharter(1)} disabled={world.status !== 'composing'}>
                  <b>↷</b><span>turn right</span><small>E</small>
                </button>
                <button type="button" onClick={() => scaleCharter(-1)} disabled={world.status !== 'composing'}>
                  <b>−</b><span>contract</span><small>{Math.round(selectedPlacement.scale * 100)}%</small>
                </button>
                <button type="button" onClick={() => scaleCharter(1)} disabled={world.status !== 'composing'}>
                  <b>＋</b><span>expand</span><small>{Math.round(selectedPlacement.scale * 100)}%</small>
                </button>
                <button type="button" onClick={() => shiftDepth(-1)} disabled={world.status !== 'composing'}>
                  <b>↓</b><span>bury law</span><small>[</small>
                </button>
                <button type="button" onClick={() => shiftDepth(1)} disabled={world.status !== 'composing'}>
                  <b>↑</b><span>surface law</span><small>]</small>
                </button>
              </div>
            </section>

            <section className={`cp-docket ${world.councilUnlocked ? 'is-open' : ''}`} aria-label="petition docket">
              <div className="cp-docket-heading">
                <div><span>petition docket</span><strong>{world.councilUnlocked ? `${world.pacts.length} active` : 'not convened'}</strong></div>
                <b>{Object.values(world.sites).reduce((sum, site) => sum + site.voice, 0)} voice</b>
              </div>

              {!world.councilUnlocked && (
                <div className="cp-docket-seal"><i>220</i><span>hold one civic season to break this seal</span></div>
              )}

              {world.councilUnlocked && (
                <>
                  <p className="cp-accord-instruction">
                    <strong>drag</strong> a numbered living ward seal onto another plot, or enact a suggested petition below. Each accord costs its source 1 voice.
                  </p>

                  <div className="cp-petition-list">
                    {petitionSuggestions.length === 0 && (
                      <p className="cp-empty-docket">no actionable petition // hold wards for voice or alter which laws they hear</p>
                    )}
                    {petitionSuggestions.map(suggestion => (
                      <button
                        type="button"
                        key={suggestion.id}
                        onClick={() => createAccord(suggestion.source.id, suggestion.target.id, suggestion.law)}
                        data-playground-action="enact-accord"
                      >
                        <span style={{ '--petition-color': charterById(suggestion.law).color }}>{charterById(suggestion.law).sigil}</span>
                        <strong>{suggestion.source.label} → {suggestion.target.label}</strong>
                        <small>{suggestion.urgent ? 'answers a missing law' : 'writes a reserve covenant'}</small>
                      </button>
                    ))}
                  </div>

                  {(world.pacts.length > 0 || amendmentCount > 0) && (
                    <div className="cp-constitutional-ledger">
                      {world.pacts.map(pact => (
                        <div key={pact.id} className={pact.strain ? 'is-strained' : ''}>
                          <span>{charterById(pact.law).sigil}</span>
                          <strong>{siteById(pact.fromId).label} → {siteById(pact.toId).label}</strong>
                          <small>{pact.strain ? `strained ${pact.strain}/2` : `ratification ${pact.age}/2`}</small>
                        </div>
                      ))}
                      {Object.entries(world.amendments).flatMap(([siteId, laws]) => laws.map(law => (
                        <div key={`${siteId}-${law}`} className="is-amendment">
                          <span>{charterById(law).sigil}</span>
                          <strong>{siteById(siteId).label}</strong>
                          <small>local {law} / permanent</small>
                        </div>
                      )))}
                    </div>
                  )}
                </>
              )}
            </section>

            <div className="cp-turn-console">
              <button
                type="button"
                className={cityReady ? 'is-ready' : ''}
                onClick={turnSeason}
                disabled={!world.unlocked || world.status !== 'composing' || turning}
                data-playground-action="turn-season"
              >
                <span>{turning ? 'weather entering' : cityReady ? 'city can hold' : 'test the draft'}</span>
                <strong>{turning ? 'TURNING…' : 'TURN SEASON'}</strong>
                <small>SPACE</small>
              </button>
              <p role="status">{message}</p>
              <div>
                <button type="button" onClick={rewind} disabled={world.history.length === 0}>lift last season</button>
                <button type="button" onClick={reset}>blank folio</button>
              </div>
            </div>
          </aside>
        </div>

        <nav className="cp-pane-switch" aria-label="Mobile folio view">
          <button type="button" className={mobilePane === 'map' ? 'is-active' : ''} onClick={() => setMobilePane('map')} aria-pressed={mobilePane === 'map'}>
            charter map <span>{eligibleCount} ready</span>
          </button>
          <button type="button" className={mobilePane === 'council' ? 'is-active' : ''} onClick={() => setMobilePane('council')} aria-pressed={mobilePane === 'council'}>
            council <span>{world.pacts.length} accords</span>
          </button>
        </nav>

        {!world.unlocked && (
          <div className="cp-seal">
            <div className="cp-seal-city" aria-hidden="true">
              {CHARTERS.slice(0, 5).map((charter, index) => <i key={charter.id} style={{ '--seal-color': charter.color, '--seal-index': index }} />)}
              <span>220</span>
            </div>
            <p>UNRATIFIED BOROUGH / LIVING INTERFACE STUDY 220</p>
            <h2>A city begins as transparent disagreement.<br />It matures when the streets answer back.</h2>
            <button type="button" onClick={wake} data-playground-primary>
              break the seal // enter the folio
            </button>
            <small>layer laws • raise wards • spend civic voice • ratify local amendments</small>
          </div>
        )}

        {world.status === 'mastered' && (
          <div className="cp-outcome cp-outcome-mastered">
            <span>mastery / {world.season} seasons / {amendmentCount} living amendment{amendmentCount === 1 ? '' : 's'}</span>
            <h2>THE STREETS HAVE ACQUIRED LEGISLATIVE MEMORY</h2>
            <p>Your transparent laws survived weather, negotiation, and revision. A borrowed covenant has become native structure; the interface now remembers not just where you placed power, but how inhabitants changed it.</p>
            <div><button type="button" onClick={rewind}>reopen last season</button><button type="button" onClick={reset}>found another city</button></div>
          </div>
        )}

        {world.status === 'ruined' && (
          <div className="cp-outcome cp-outcome-ruined">
            <span>failure / six structural redactions</span>
            <h2>THE ABSENCE ACQUIRED AN ADDRESS</h2>
            <p>The folio remembers every ward and promise that lost support. Lift a season, then compose a kinder overlap or a stronger accord.</p>
            <div><button type="button" onClick={rewind}>lift last season</button><button type="button" onClick={reset}>blank the record</button></div>
          </div>
        )}
      </main>
    </div>
  )
}

export default CivicPalimpsest
