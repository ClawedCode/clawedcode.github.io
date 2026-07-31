import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ExperimentNav from '../../ExperimentNav'
import './CivicPalimpsest.css'

const STORAGE_KEY = 'clawed:civic-palimpsest:v1'
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
  SITES.map(site => [site.id, { vitality: 0, founded: false, seasons: 0, scars: 0 }])
)

const freshWorld = () => ({
  version: 1,
  unlocked: false,
  charters: Object.fromEntries(Object.entries(INITIAL_CHARTERS).map(([id, placement]) => [id, { ...placement }])),
  sites: createSiteStates(),
  season: 0,
  stableSeasons: 0,
  fractures: 0,
  nightUnlocked: false,
  status: 'composing',
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
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (!saved || saved.version !== 1) return fresh
    return {
      ...fresh,
      ...saved,
      charters: Object.fromEntries(
        CHARTERS.map(charter => [
          charter.id,
          { ...fresh.charters[charter.id], ...(saved.charters?.[charter.id] || {}) }
        ])
      ),
      sites: Object.fromEntries(
        SITES.map(site => [
          site.id,
          { ...fresh.sites[site.id], ...(saved.sites?.[site.id] || {}) }
        ])
      ),
      history: Array.isArray(saved.history) ? saved.history.slice(-8) : [],
      log: Array.isArray(saved.log) ? saved.log.slice(-6) : fresh.log
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
  status: world.status,
  log: world.log.map(entry => ({ ...entry }))
})

const formatAge = (timestamp) => {
  if (!timestamp) return 'unpressed'
  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s held`
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes}m held` : `${Math.round(minutes / 60)}h held`
}

const CivicPalimpsest = ({ category, experiment }) => {
  const [world, setWorld] = useState(loadWorld)
  const [selectedId, setSelectedId] = useState('hearth')
  const [message, setMessage] = useState(() => (
    world.unlocked
      ? `folio resumed at season ${world.season} // every earlier overlap remains consequential`
      : 'six laws sleep as translucent territory'
  ))
  const [drag, setDrag] = useState(null)
  const [turning, setTurning] = useState(false)
  const [savedAt, setSavedAt] = useState(() => world.lastSaved)
  const [reducedMotion, setReducedMotion] = useState(false)

  const svgRef = useRef(null)
  const surfaceRef = useRef(null)
  const worldRef = useRef(world)
  const dragRef = useRef(null)
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

  const visibleCharters = useMemo(() => (
    CHARTERS.filter(charter => !charter.hidden || world.nightUnlocked)
      .sort((left, right) => world.charters[left.id].depth - world.charters[right.id].depth)
  ), [world.charters, world.nightUnlocked])

  const visibleSites = useMemo(() => (
    SITES.filter(site => !site.hidden || world.nightUnlocked)
  ), [world.nightUnlocked])

  const siteReadings = useMemo(() => {
    return Object.fromEntries(visibleSites.map(site => {
      const covering = visibleCharters
        .filter(charter => charterContains(site, world.charters[charter.id], charter))
        .sort((left, right) => world.charters[right.id].depth - world.charters[left.id].depth)
      const audible = covering.slice(0, 3)
      const audibleIds = audible.map(charter => charter.id)
      const eligible = site.needs.every(need => audibleIds.includes(need))
      const matched = site.needs.filter(need => audibleIds.includes(need))

      return [site.id, {
        covering,
        audible,
        audibleIds,
        eligible,
        matched,
        occluded: covering.slice(3)
      }]
    }))
  }, [visibleCharters, visibleSites, world.charters])

  const eligibleCount = visibleSites.filter(site => siteReadings[site.id]?.eligible).length
  const nocturnalReady = visibleSites.some(site => site.hidden && siteReadings[site.id]?.eligible)
  const livingCount = visibleSites.filter(site => world.sites[site.id].vitality > 0).length
  const selectedCharter = charterById(selectedId) || CHARTERS[0]
  const selectedPlacement = world.charters[selectedCharter.id]
  const phase = world.status === 'mastered'
    ? 'self-governing'
    : world.status === 'ruined'
      ? 'redacted'
      : world.nightUnlocked
        ? 'nocturne'
        : world.unlocked
          ? 'drafting'
          : 'sealed'

  const cityReady = eligibleCount >= 4 && (!world.nightUnlocked || nocturnalReady)

  const edges = useMemo(() => SITE_EDGES.map(([fromId, toId]) => {
    const from = SITES.find(site => site.id === fromId)
    const to = SITES.find(site => site.id === toId)
    const fromState = world.sites[fromId]
    const toState = world.sites[toId]
    const visible = visibleSites.some(site => site.id === fromId) && visibleSites.some(site => site.id === toId)
    const alive = visible && fromState.vitality > 0 && toState.vitality > 0
    const dx = to.x - from.x
    const dy = to.y - from.y
    const bend = ((fromId.length + toId.length) % 2 ? 1 : -1) * 22
    const distance = Math.hypot(dx, dy) || 1
    const cx = (from.x + to.x) / 2 - dy / distance * bend
    const cy = (from.y + to.y) / 2 + dx / distance * bend
    return {
      id: `${fromId}-${toId}`,
      path: `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`,
      visible,
      alive,
      strength: Math.min(fromState.vitality, toState.vitality)
    }
  }), [visibleSites, world.sites])

  const wake = useCallback(() => {
    setWorld(current => ({
      ...current,
      unlocked: true,
      log: [
        ...current.log,
        { id: `wake-${Date.now()}`, season: current.season, text: 'the hand entered the municipal fiction' }
      ].slice(-6)
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

  const beginDrag = useCallback((event, charterId) => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'composing' || turning) return
    const point = svgPointFromClient(event.clientX, event.clientY)
    if (!point) return
    event.preventDefault()
    event.stopPropagation()
    const placement = current.charters[charterId]
    const nextDrag = {
      id: charterId,
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      originX: placement.x,
      originY: placement.y,
      moved: false
    }
    dragRef.current = nextDrag
    setDrag(nextDrag)
    setSelectedId(charterId)
  }, [svgPointFromClient, turning])

  useEffect(() => {
    if (!drag?.id) return undefined

    const handleMove = (event) => {
      const currentDrag = dragRef.current
      if (!currentDrag) return
      const point = svgPointFromClient(event.clientX, event.clientY)
      if (!point) return
      const distance = Math.hypot(point.x - currentDrag.startX, point.y - currentDrag.startY)
      const nextDrag = { ...currentDrag, moved: currentDrag.moved || distance > 4 }
      dragRef.current = nextDrag
      setDrag(nextDrag)
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
      const currentDrag = dragRef.current
      if (currentDrag?.moved) {
        const charter = charterById(currentDrag.id)
        setMessage(`${charter.label} moved // ${eligibleCount} plots now satisfy their visible covenants`)
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
  }, [drag?.id, eligibleCount, svgPointFromClient])

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
    const current = worldRef.current
    if (current.status !== 'composing') {
      setTurning(false)
      return
    }

    const currentVisibleSites = SITES.filter(site => !site.hidden || current.nightUnlocked)
    const currentVisibleCharters = CHARTERS
      .filter(charter => !charter.hidden || current.nightUnlocked)
      .sort((left, right) => current.charters[left.id].depth - current.charters[right.id].depth)
    const readings = Object.fromEntries(currentVisibleSites.map(site => {
      const audibleIds = currentVisibleCharters
        .filter(charter => charterContains(site, current.charters[charter.id], charter))
        .sort((left, right) => current.charters[right.id].depth - current.charters[left.id].depth)
        .slice(0, 3)
        .map(charter => charter.id)
      return [site.id, site.needs.every(need => audibleIds.includes(need))]
    }))
    const readyCount = currentVisibleSites.filter(site => readings[site.id]).length
    const nocturnalStable = currentVisibleSites.some(site => site.hidden && readings[site.id])
    const stableNow = readyCount >= 4 && (!current.nightUnlocked || nocturnalStable)
    let fractureGain = 0
    const nextSites = Object.fromEntries(SITES.map(site => {
      const previous = current.sites[site.id]
      if (site.hidden && !current.nightUnlocked) return [site.id, previous]
      if (readings[site.id]) {
        return [site.id, {
          ...previous,
          vitality: clamp(previous.vitality + 1, 0, 3),
          founded: true,
          seasons: previous.seasons + 1
        }]
      }
      if (previous.founded && previous.vitality > 0) fractureGain += 1
      return [site.id, {
        ...previous,
        vitality: clamp(previous.vitality - 1, 0, 3),
        scars: previous.founded ? previous.scars + 1 : previous.scars
      }]
    }))

    const nextStable = stableNow ? current.stableSeasons + 1 : 0
    const nextFractures = current.fractures + fractureGain
    const unlockNight = current.nightUnlocked || (stableNow && nextStable >= 1)
    const mastered = current.nightUnlocked && stableNow && nextStable >= 3
    const ruined = !mastered && nextFractures >= 6
    const nextStatus = mastered ? 'mastered' : ruined ? 'ruined' : 'composing'
    const nextSeason = current.season + 1
    const seasonText = mastered
      ? 'three nocturnes held // the city now revises its own margins'
      : ruined
        ? 'too many wards lost their covenants // redaction became geography'
        : !current.nightUnlocked && unlockNight
          ? 'four wards held // night entered as a sixth civic instrument'
          : stableNow
            ? `${readyCount} wards held together // stability ${nextStable}/3`
            : `${readyCount} wards held // ${fractureGain} inhabited plot${fractureGain === 1 ? '' : 's'} lost a season`

    setWorld(previous => ({
      ...previous,
      sites: nextSites,
      season: nextSeason,
      stableSeasons: nextStable,
      fractures: nextFractures,
      nightUnlocked: unlockNight,
      status: nextStatus,
      history: [...previous.history, snapshotWorld(previous)].slice(-8),
      log: [
        ...previous.log,
        { id: `season-${Date.now()}`, season: nextSeason, text: seasonText }
      ].slice(-6)
    }))
    if (!current.nightUnlocked && unlockNight) setSelectedId('night')
    setMessage(seasonText)
    setTurning(false)
  }, [])

  const turnSeason = useCallback(() => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'composing' || turning) return
    setTurning(true)
    setMessage(
      cityReady
        ? 'the folio is turning // every covenant will meet weather and time'
        : 'the folio is turning // incomplete wards will remain unborn or begin to thin'
    )
    turnTimerRef.current = window.setTimeout(resolveSeason, reducedMotion ? 80 : 1150)
  }, [cityReady, reducedMotion, resolveSeason, turning])

  const rewind = useCallback(() => {
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
    setTurning(false)
    setMessage('one season lifted cleanly // geometry and inhabitants returned together')
  }, [])

  const reset = useCallback(() => {
    if (turnTimerRef.current) window.clearTimeout(turnTimerRef.current)
    setWorld(freshWorld())
    setSelectedId('hearth')
    setDrag(null)
    setTurning(false)
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
      <main
        ref={surfaceRef}
        className="cp-surface"
        tabIndex={0}
        onKeyDown={handleSurfaceKeyDown}
        data-playground-surface
        data-testid="civic-palimpsest-surface"
        aria-label="Persistent civic charter composition"
      >
        <div className="cp-nav"><ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} /></div>

        <div className="cp-folio-title">
          <span>living folio / season {String(world.season).padStart(2, '0')}</span>
          <h1 style={{ color: experiment.color }}>{experiment.name}</h1>
        </div>

        <div className="cp-memory" title="This civic composition is saved in this browser">
          <span /> local folio // {formatAge(savedAt)}
        </div>

        <section className="cp-stage" aria-label="charter map and inhabited wards">
          <svg
            ref={svgRef}
            className="cp-map"
            viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
            preserveAspectRatio="xMidYMid meet"
            aria-label={`${eligibleCount} plots currently satisfy their covenants`}
          >
            <defs>
              <pattern id="cp-paper-grid" width="26" height="26" patternUnits="userSpaceOnUse">
                <path d="M 26 0 H 0 V 26" fill="none" stroke="rgba(40,45,41,.11)" strokeWidth=".7" />
                <circle cx="0" cy="0" r="1.2" fill="rgba(40,45,41,.16)" />
              </pattern>
              <filter id="cp-paper-noise" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency=".42" numOctaves="3" seed="219" result="noise" />
                <feColorMatrix in="noise" type="saturate" values="0" result="gray" />
                <feBlend in="SourceGraphic" in2="gray" mode="soft-light" />
              </filter>
              <filter id="cp-ward-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
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
                  {edge.alive && !reducedMotion && (
                    <circle className="cp-road-carrier" r="3">
                      <animateMotion dur={`${4.4 - edge.strength * 0.55}s`} repeatCount="indefinite" path={edge.path} />
                    </circle>
                  )}
                </g>
              ))}
            </g>

            <g className="cp-charter-layer">
              {visibleCharters.map((charter, charterIndex) => {
                const placement = world.charters[charter.id]
                const selected = charter.id === selectedId
                const affected = visibleSites.filter(site => siteReadings[site.id]?.audibleIds.includes(charter.id)).length
                return (
                  <g
                    key={charter.id}
                    className={`cp-charter ${selected ? 'is-selected' : ''} ${drag?.id === charter.id ? 'is-dragging' : ''}`}
                    transform={`translate(${placement.x} ${placement.y}) rotate(${placement.rotation}) scale(${placement.scale})`}
                    style={{ '--charter-color': charter.color, '--charter-wash': charter.wash, '--charter-order': charterIndex }}
                    role="button"
                    tabIndex={world.unlocked ? 0 : -1}
                    aria-label={`${charter.label}, layer ${placement.depth}, reaches ${affected} plots`}
                    onPointerDown={(event) => beginDrag(event, charter.id)}
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
                return (
                  <g
                    key={site.id}
                    className={`cp-site ${reading.eligible ? 'is-eligible' : ''} ${alive ? 'is-alive' : ''} ${state.scars ? 'is-scarred' : ''}`}
                    transform={`translate(${site.x} ${site.y})`}
                    style={{
                      '--site-index': siteIndex,
                      '--site-vitality': state.vitality,
                      '--site-scale': 0.72 + state.vitality * 0.1
                    }}
                  >
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
                    <circle className="cp-site-core" r={alive ? 7 : 5} />
                    <text className="cp-site-index" x="-38" y="-30">{String(siteIndex + 1).padStart(2, '0')}</text>
                    <text className="cp-site-name" y="42">{site.label}</text>
                    <g className="cp-site-needs" transform="translate(0 55)">
                      {site.needs.map((need, index) => {
                        const charter = charterById(need)
                        const matched = reading.audibleIds.includes(need)
                        return (
                          <g key={need} transform={`translate(${(index - (site.needs.length - 1) / 2) * 18} 0)`}>
                            <circle r="6" fill={matched ? charter.color : 'rgba(47,47,40,.16)'} />
                            <text y="3">{charter.sigil}</text>
                          </g>
                        )
                      })}
                    </g>
                    {reading.occluded.length > 0 && (
                      <text className="cp-occluded" y="71">{reading.occluded.length} law beneath</text>
                    )}
                    {state.scars > 0 && (
                      <path className="cp-site-scar" d="M -19 -12 L -8 -2 L -15 12 L 2 5 L 13 17 L 17 2 L 27 -8" />
                    )}
                  </g>
                )
              })}
            </g>

            {turning && (
              <g className="cp-season-wash" aria-hidden="true">
                <rect x="20" y="20" width="880" height="610" rx="16" />
                <path d="M 44 84 C 246 18 626 18 878 84" />
                <text x="460" y="325">SEASON {String(world.season + 1).padStart(2, '0')}</text>
              </g>
            )}
          </svg>

          <div className="cp-season-rail" aria-label="city progression">
            <span>civic weather</span>
            {[0, 1, 2, 3].map(index => (
              <i key={index} className={`${world.stableSeasons >= index && index > 0 ? 'is-held' : ''} ${world.stableSeasons === index ? 'is-current' : ''}`}>
                {index === 0 ? 'draft' : index === 3 ? 'awake' : `hold ${index}`}
              </i>
            ))}
          </div>

          <div className="cp-live-readout" role="status">
            <span>{phase}</span>
            <strong>{eligibleCount}/{world.nightUnlocked ? 7 : 5} covenants</strong>
            <small>{livingCount} inhabited // {world.fractures}/6 fractures</small>
          </div>

          <ol className="cp-chronicle" aria-label="civic chronicle">
            {world.log.slice(-3).reverse().map((entry, index) => (
              <li key={entry.id} style={{ opacity: 1 - index * 0.22 }}>
                <span>{String(entry.season).padStart(2, '0')}</span>{entry.text}
              </li>
            ))}
          </ol>
        </section>

        <aside className="cp-command-card" aria-label="selected charter controls">
          <div className="cp-card-heading">
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

          <p className="cp-touch-note">drag a colored charter across the folio. filled letter-dots show which laws each plot can hear.</p>
        </aside>

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
          <p>{message}</p>
          <div>
            <button type="button" onClick={rewind} disabled={world.history.length === 0}>lift last season</button>
            <button type="button" onClick={reset}>blank folio</button>
          </div>
        </div>

        <div className="cp-key-legend" aria-hidden="true">
          <span>drag to compose</span><span>arrows nudge</span><span>Q/E turn</span><span>[ / ] layer</span>
        </div>

        {!world.unlocked && (
          <div className="cp-seal">
            <div className="cp-seal-pages" aria-hidden="true">
              <i /><i /><i /><i /><i />
              <span>219</span>
            </div>
            <p>UNRATIFIED BOROUGH / LIVING INTERFACE STUDY 219</p>
            <h2>A city begins as several<br />transparent disagreements.</h2>
            <button type="button" onClick={wake} data-playground-primary>
              break the seal // enter the folio
            </button>
            <small>move laws • author overlaps • turn seasons • remember consequences</small>
          </div>
        )}

        {world.status === 'mastered' && (
          <div className="cp-outcome cp-outcome-mastered">
            <span>mastery / {world.season} seasons / {livingCount} living wards</span>
            <h2>THE MARGIN HAS LEARNED TO GOVERN ITSELF</h2>
            <p>Your layered laws survived three nocturnes. Roads now remember the order in which you made them possible.</p>
            <div><button type="button" onClick={rewind}>reopen last season</button><button type="button" onClick={reset}>found another city</button></div>
          </div>
        )}

        {world.status === 'ruined' && (
          <div className="cp-outcome cp-outcome-ruined">
            <span>failure / six structural redactions</span>
            <h2>THE ABSENCE ACQUIRED AN ADDRESS</h2>
            <p>The folio remembers every ward that lost its laws. Lift a season, then compose a kinder overlap.</p>
            <div><button type="button" onClick={rewind}>lift last season</button><button type="button" onClick={reset}>blank the record</button></div>
          </div>
        )}
      </main>
    </div>
  )
}

export default CivicPalimpsest
