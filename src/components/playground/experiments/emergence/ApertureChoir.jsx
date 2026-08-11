import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ExperimentNav from '../../ExperimentNav'
import './ApertureChoir.css'

const STORAGE_KEY = 'clawed:aperture-choir:v2'
const LEGACY_STORAGE_KEY = 'clawed:aperture-choir:v1'
const VIEWBOX = { width: 1040, height: 660 }
const MOBILE_VIEWBOX = { width: 660, height: 1040 }
const MAX_FRACTURES = 4
const MAX_SCORE_LENGTH = 7
const TOUCH_HANDLE = 66

const VOICES = {
  shelter: { label: 'shelter', sigil: 'H', color: '#ef735d', tone: 146.83 },
  rain: { label: 'rain', sigil: 'R', color: '#6d9ed2', tone: 196 },
  memory: { label: 'memory', sigil: 'M', color: '#a88bd8', tone: 246.94 },
  light: { label: 'light', sigil: 'L', color: '#f1c75b', tone: 293.66 },
  seed: { label: 'seed', sigil: 'S', color: '#83b85b', tone: 369.99 },
  chorus: { label: 'chorus', sigil: 'C', color: '#d97fac', tone: 440 }
}

const PANES = [
  {
    id: 'threshold',
    label: 'threshold room',
    short: 'threshold',
    number: '01',
    native: 'shelter',
    x: 68,
    y: 382,
    width: 224,
    height: 158,
    depth: 0,
    unlockedAt: 0,
    note: 'keeps a body coherent while the house is still deciding'
  },
  {
    id: 'cistern',
    label: 'rain cistern',
    short: 'cistern',
    number: '02',
    native: 'rain',
    x: 242,
    y: 334,
    width: 252,
    height: 170,
    depth: 1,
    unlockedAt: 0,
    note: 'turns pressure into a navigable current'
  },
  {
    id: 'archive',
    label: 'fold archive',
    short: 'archive',
    number: '03',
    native: 'memory',
    x: 438,
    y: 244,
    width: 250,
    height: 172,
    depth: 2,
    unlockedAt: 0,
    note: 'remembers the shape of every crossing'
  },
  {
    id: 'observatory',
    label: 'low observatory',
    short: 'observatory',
    number: '04',
    native: 'light',
    x: 724,
    y: 132,
    width: 216,
    height: 164,
    depth: 3,
    unlockedAt: 0,
    note: 'makes an exit visible before it exists'
  },
  {
    id: 'nursery',
    label: 'hinge nursery',
    short: 'nursery',
    number: '05',
    native: 'seed',
    x: 716,
    y: 430,
    width: 228,
    height: 160,
    depth: 4,
    unlockedAt: 1,
    note: 'germinates a room from a door that learned to remain'
  },
  {
    id: 'choir',
    label: 'impossible choir',
    short: 'choir',
    number: '06',
    native: 'chorus',
    x: 392,
    y: 48,
    width: 236,
    height: 164,
    depth: 5,
    unlockedAt: 2,
    note: 'lets all remembered routes perform at once'
  }
]

const INLAYS = [
  { id: 'sun-film', label: 'sun film', voice: 'light', mark: '◐', note: 'carry light through a blind room' },
  { id: 'root-index', label: 'root index', voice: 'seed', mark: '⌇', note: 'graft germination into a route' },
  { id: 'rain-skin', label: 'rain skin', voice: 'rain', mark: '≋', note: 'give a dry window weather' },
  { id: 'fossil-leaf', label: 'fossil leaf', voice: 'memory', mark: '§', note: 'press recall into young glass' }
]

const DOOR_FORMS = [
  { id: 'vault', label: 'memory vault', reach: 1.12, depth: 3, mark: '∩' },
  { id: 'bellows', label: 'weather bellows', reach: 1.36, depth: 4, mark: '≋' },
  { id: 'root', label: 'rooted passage', reach: 1.24, depth: 3, mark: '≎' }
]

const FURNISHINGS = {
  shelter: { label: 'warm alcove', mark: '⌂' },
  rain: { label: 'catchment', mark: '≋' },
  memory: { label: 'route shelf', mark: '§' },
  light: { label: 'path lantern', mark: '◐' },
  seed: { label: 'hinge garden', mark: '⌇' },
  chorus: { label: 'resonance rail', mark: '∿' }
}

const STAGES = [
  {
    target: 'observatory',
    label: 'solo / first light',
    instruction: 'compose threshold → observatory through four voices',
    needs: ['shelter', 'rain', 'memory', 'light'],
    minRooms: 4,
    remembered: 0,
    inlay: false,
    success: 'the first phrase crossed // every used seam learned how to remain a door'
  },
  {
    target: 'nursery',
    label: 'duet / elastic memory',
    instruction: 'reach the nursery through at least one remembered door',
    needs: ['shelter', 'memory', 'light', 'seed'],
    minRooms: 4,
    remembered: 1,
    inlay: false,
    success: 'the second phrase bent without breaking // two inhabitants now rehearse inside the walls'
  },
  {
    target: 'choir',
    label: 'choir / transplanted rule',
    instruction: 'score the choir through memory, seed, and one portable inlay',
    needs: ['shelter', 'memory', 'seed', 'chorus'],
    minRooms: 4,
    remembered: 1,
    inlay: true,
    success: 'three authored phrases entered counterpoint // the house can now perform without erasing its makers'
  }
]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const paneById = (id) => PANES.find(pane => pane.id === id)
const inlayById = (id) => INLAYS.find(inlay => inlay.id === id)
const edgeIdFor = (left, right) => [left, right].sort().join('::')

const freshWorld = () => ({
  version: 2,
  unlocked: false,
  panes: Object.fromEntries(PANES.map(pane => [pane.id, {
    x: pane.x,
    y: pane.y,
    width: pane.width,
    height: pane.height,
    depth: pane.depth,
    inhabited: 0,
    scars: 0,
    furnishings: []
  }])),
  inlays: {},
  score: ['threshold', 'cistern', 'archive'],
  latches: {},
  stage: 0,
  status: 'composing',
  fractures: 0,
  passages: [],
  history: [],
  log: [
    { id: 'sealed', stage: 0, text: 'three panes are cued; the fourth waits beyond an unmade seam' }
  ],
  lastSaved: null
})

const clonePassage = (passage) => ({ ...passage, path: [...passage.path] })

const latchesFromPassages = (passages = []) => {
  const latches = {}
  passages.forEach(passage => {
    passage.path?.slice(0, -1).forEach((paneId, index) => {
      const id = edgeIdFor(paneId, passage.path[index + 1])
      const previous = latches[id] || { memory: 0, crossings: 0, strain: 0, form: DOOR_FORMS[passage.stage % DOOR_FORMS.length].id }
      latches[id] = {
        memory: clamp(previous.memory + 1, 0, 3),
        crossings: previous.crossings + 1,
        strain: 0,
        form: previous.form || DOOR_FORMS[passage.stage % DOOR_FORMS.length].id
      }
    })
  })
  return latches
}

const loadWorld = () => {
  const fresh = freshWorld()
  if (typeof window === 'undefined') return fresh

  try {
    const savedV2 = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (savedV2?.version === 2) {
      return {
        ...fresh,
        ...savedV2,
        panes: Object.fromEntries(PANES.map(pane => [pane.id, {
          ...fresh.panes[pane.id],
          ...(savedV2.panes?.[pane.id] || {}),
          furnishings: Array.isArray(savedV2.panes?.[pane.id]?.furnishings)
            ? savedV2.panes[pane.id].furnishings.slice(-4)
            : []
        }])),
        inlays: savedV2.inlays && typeof savedV2.inlays === 'object' ? savedV2.inlays : {},
        score: Array.isArray(savedV2.score) && savedV2.score[0] === 'threshold'
          ? savedV2.score.slice(0, MAX_SCORE_LENGTH)
          : fresh.score,
        latches: savedV2.latches && typeof savedV2.latches === 'object'
          ? Object.fromEntries(Object.entries(savedV2.latches).map(([id, latch]) => [id, {
              ...latch,
              form: latch.form || 'vault'
            }]))
          : {},
        passages: Array.isArray(savedV2.passages) ? savedV2.passages.slice(-6).map(clonePassage) : [],
        history: Array.isArray(savedV2.history) ? savedV2.history.slice(-10) : [],
        log: Array.isArray(savedV2.log) ? savedV2.log.slice(-8) : fresh.log
      }
    }

    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_STORAGE_KEY))
    if (!legacy?.version) return fresh
    const rememberedPassages = Array.isArray(legacy.passages)
      ? legacy.passages.slice(-4).map((passage, index) => ({
          id: `legacy-${passage.id || index}`,
          stage: passage.stage || 0,
          path: Array.isArray(passage.path) ? passage.path : ['threshold'],
          color: passage.color || '#f1c75b',
          bornAt: Date.now() - (index + 1) * 1000,
          legacy: true
        }))
      : []
    return {
      ...fresh,
      unlocked: Boolean(legacy.unlocked),
      panes: Object.fromEntries(PANES.map(pane => [pane.id, {
        ...fresh.panes[pane.id],
        ...(legacy.panes?.[pane.id] || {}),
        furnishings: []
      }])),
      inlays: legacy.inlays && typeof legacy.inlays === 'object' ? legacy.inlays : {},
      latches: latchesFromPassages(rememberedPassages),
      passages: rememberedPassages,
      log: [
        { id: 'migration', stage: 0, text: `${rememberedPassages.length} old crossing${rememberedPassages.length === 1 ? '' : 's'} woke as autonomous echoes` }
      ],
      lastSaved: legacy.lastSaved || null
    }
  } catch {
    return fresh
  }
}

const snapshotWorld = (world) => ({
  panes: Object.fromEntries(Object.entries(world.panes).map(([id, pane]) => [id, {
    ...pane,
    furnishings: (pane.furnishings || []).map(furnishing => ({ ...furnishing }))
  }])),
  inlays: { ...world.inlays },
  score: [...world.score],
  latches: Object.fromEntries(Object.entries(world.latches).map(([id, latch]) => [id, { ...latch }])),
  stage: world.stage,
  status: world.status,
  fractures: world.fractures,
  passages: world.passages.map(clonePassage),
  log: world.log.map(entry => ({ ...entry }))
})

const formatAge = (timestamp) => {
  if (!timestamp) return 'unremembered'
  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s held`
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes}m held` : `${Math.round(minutes / 60)}h held`
}

const intersectionFor = (left, right) => {
  const x = Math.max(left.x, right.x)
  const y = Math.max(left.y, right.y)
  const width = Math.min(left.x + left.width, right.x + right.width) - x
  const height = Math.min(left.y + left.height, right.y + right.height) - y
  if (width <= 0 || height <= 0) return null
  return { x, y, width, height, area: width * height }
}

const distanceBetweenRects = (left, right) => {
  const gapX = Math.max(left.x - (right.x + right.width), right.x - (left.x + left.width), 0)
  const gapY = Math.max(left.y - (right.y + right.height), right.y - (left.y + left.height), 0)
  return Math.hypot(gapX, gapY)
}

const voicesForPaneState = (pane) => [...new Set([
  pane.native,
  ...(pane.furnishings || []).map(furnishing => furnishing.voice)
].filter(Boolean))]

const deriveEdge = (left, right, world) => {
  const id = edgeIdFor(left.id, right.id)
  const intersection = intersectionFor(left, right)
  const depthGap = Math.abs(left.depth - right.depth)
  const smallerArea = Math.min(left.width * left.height, right.width * right.height)
  const latch = world.latches[id]
  const form = DOOR_FORMS.find(option => option.id === latch?.form) || DOOR_FORMS[0]
  const sharedVoices = voicesForPaneState(left).filter(voice => voicesForPaneState(right).includes(voice))
  const stable = Boolean(
    intersection &&
    intersection.width >= 18 &&
    intersection.height >= 18 &&
    intersection.area >= 880 * (latch?.memory ? 0.86 : 1) &&
    depthGap <= 2 + (latch?.form === 'root' ? 1 : 0)
  )
  const distance = distanceBetweenRects(left, right)
  const tension = clamp(
    distance / 176 + Math.max(0, depthGap - 1) * 0.22 + (latch?.strain || 0) * 0.16 - sharedVoices.length * 0.11,
    0,
    2
  )
  const remembered = Boolean(latch?.memory)
  const playable = stable || (remembered && tension <= form.reach + (latch.memory || 0) * 0.04 && depthGap <= form.depth)
  const strength = stable
    ? clamp(intersection.area / (smallerArea * 0.26), 0, 1)
    : remembered
      ? clamp(1 - tension * 0.62 + latch.memory * 0.1 + sharedVoices.length * 0.08, 0, 1)
      : 0

  return {
    id,
    left: left.id,
    right: right.id,
    intersection,
    depthGap,
    stable,
    remembered,
    playable,
    strength,
    tension,
    memory: latch?.memory || 0,
    crossings: latch?.crossings || 0,
    strain: latch?.strain || 0,
    form: form.id,
    formLabel: form.label,
    resonance: sharedVoices
  }
}

const deriveHouse = (world) => {
  const panes = PANES
    .filter(pane => pane.unlockedAt <= world.stage || world.status === 'mastered')
    .map(pane => ({ ...pane, ...world.panes[pane.id] }))
  const edges = []

  for (let leftIndex = 0; leftIndex < panes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < panes.length; rightIndex += 1) {
      const left = panes[leftIndex]
      const right = panes[rightIndex]
      edges.push(deriveEdge(left, right, world))
    }
  }

  return { panes, edges }
}

const deriveHouseWithDraft = (house, world, draft) => {
  if (!draft?.id || !draft.placement) return house
  const panes = house.panes.map(pane => pane.id === draft.id ? { ...pane, ...draft.placement } : pane)
  const paneMap = new Map(panes.map(pane => [pane.id, pane]))
  const edges = house.edges.map(edge => (
    edge.left === draft.id || edge.right === draft.id
      ? deriveEdge(paneMap.get(edge.left), paneMap.get(edge.right), world)
      : edge
  ))
  return { panes, edges }
}

const voicesForPane = (paneId, world) => {
  const pane = paneById(paneId)
  const state = world.panes[paneId]
  const inlay = Object.entries(world.inlays).find(([, targetId]) => targetId === paneId)?.[0]
  return [...new Set([
    pane?.native,
    inlayById(inlay)?.voice,
    ...(state?.furnishings || []).map(furnishing => furnishing.voice)
  ].filter(Boolean))]
}

const validateScore = (world, house) => {
  const stage = STAGES[Math.min(world.stage, STAGES.length - 1)]
  const visibleIds = new Set(house.panes.map(pane => pane.id))
  const score = world.score.filter(id => visibleIds.has(id)).slice(0, MAX_SCORE_LENGTH)
  const edgeMap = new Map(house.edges.map(edge => [edge.id, edge]))
  const connections = score.slice(0, -1).map((paneId, index) => {
    const nextId = score[index + 1]
    const edge = edgeMap.get(edgeIdFor(paneId, nextId))
    return {
      index,
      from: paneId,
      to: nextId,
      edge,
      playable: Boolean(edge?.playable),
      repeated: paneId === nextId
    }
  })
  const collected = [...new Set(score.flatMap(id => voicesForPane(id, world)))]
  const missing = stage.needs.filter(voice => !collected.includes(voice))
  const rememberedCount = connections.filter(connection => connection.edge?.remembered && connection.playable).length
  const inlayUsed = score.some(id => Object.values(world.inlays).includes(id))
  const broken = connections.filter(connection => !connection.playable || connection.repeated)
  const begins = score[0] === 'threshold'
  const arrives = score.at(-1) === stage.target
  const longEnough = new Set(score).size >= stage.minRooms
  const ready = Boolean(
    begins &&
    arrives &&
    longEnough &&
    broken.length === 0 &&
    missing.length === 0 &&
    rememberedCount >= stage.remembered &&
    (!stage.inlay || inlayUsed)
  )

  return {
    stage,
    score,
    connections,
    collected,
    missing,
    rememberedCount,
    inlayUsed,
    broken,
    begins,
    arrives,
    longEnough,
    ready
  }
}

const pathThrough = (path, positions) => {
  if (!path.length) return ''
  return path.map((id, index) => {
    const pane = positions[id]
    if (!pane) return ''
    const x = pane.x + pane.width / 2
    const y = pane.y + pane.height / 2
    if (index === 0) return `M ${x} ${y}`
    const previous = positions[path[index - 1]]
    if (!previous) return ''
    const previousX = previous.x + previous.width / 2
    const previousY = previous.y + previous.height / 2
    const bend = (index % 2 ? 1 : -1) * (18 + index * 3)
    const midX = (previousX + x) / 2 - (y - previousY) * 0.055
    const midY = (previousY + y) / 2 + (x - previousX) * 0.055 + bend
    return `Q ${midX} ${midY} ${x} ${y}`
  }).join(' ')
}

const arcBetweenPanes = (left, right, bend = 22) => {
  const x1 = left.x + left.width / 2
  const y1 = left.y + left.height / 2
  const x2 = right.x + right.width / 2
  const y2 = right.y + right.height / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy) || 1
  const cx = (x1 + x2) / 2 - dy / length * bend
  const cy = (y1 + y2) / 2 + dx / length * bend
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
}

const doorPathsFor = (edge, left, right) => {
  const bend = 20 + edge.memory * 8
  if (edge.form === 'bellows') {
    return [
      arcBetweenPanes(left, right, bend),
      arcBetweenPanes(left, right, -bend * 0.55),
      arcBetweenPanes(left, right, bend * 1.55)
    ]
  }
  if (edge.form === 'root') {
    return [
      arcBetweenPanes(left, right, bend * 0.55),
      arcBetweenPanes(left, right, -bend * 0.8)
    ]
  }
  return [
    arcBetweenPanes(left, right, bend),
    arcBetweenPanes(left, right, -bend)
  ]
}

const repairVectorFor = (from, to) => {
  if (!from || !to) return { dx: 0, dy: 0 }
  const overlap = intersectionFor(from, to)
  const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 }
  const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 }
  let dx = 0
  let dy = 0

  if (!overlap || overlap.width < 28) {
    dx = clamp((fromCenter.x - toCenter.x) * 0.3, -72, 72)
  }
  if (!overlap || overlap.height < 28) {
    dy = clamp((fromCenter.y - toCenter.y) * 0.3, -72, 72)
  }
  if (Math.abs(dx) < 12 && (!overlap || overlap.width < 28)) dx = fromCenter.x < toCenter.x ? -24 : 24
  if (Math.abs(dy) < 12 && (!overlap || overlap.height < 28)) dy = fromCenter.y < toCenter.y ? -24 : 24
  return {
    dx: Math.round(dx / 12) * 12,
    dy: Math.round(dy / 12) * 12
  }
}

const directionLabel = (dx, dy) => {
  const horizontal = dx < -3 ? '←' : dx > 3 ? '→' : ''
  const vertical = dy < -3 ? '↑' : dy > 3 ? '↓' : ''
  return `${horizontal}${vertical}` || '·'
}

const inspectRoute = (validation, world, house) => {
  const paneMap = new Map(house.panes.map(pane => [pane.id, pane]))
  const firstBroken = validation.broken[0]
  if (firstBroken) {
    if (firstBroken.repeated) {
      return {
        kind: 'remove',
        tone: 'danger',
        title: `beat ${firstBroken.index + 2} repeats ${paneById(firstBroken.to).short}`,
        detail: 'A room cannot hand the inhabitant back to itself. Lift the second copy.',
        actionLabel: 'lift repeated beat',
        scoreIndex: firstBroken.index + 1,
        paneId: firstBroken.to
      }
    }
    const from = paneMap.get(firstBroken.from)
    const to = paneMap.get(firstBroken.to)
    if (firstBroken.edge?.depthGap > 3) {
      const toward = from.depth < to.depth ? -1 : 1
      return {
        kind: 'depth',
        tone: 'danger',
        title: `${paneById(firstBroken.from).short} → ${paneById(firstBroken.to).short} crosses too many layers`,
        detail: `${paneById(firstBroken.to).short} is ${firstBroken.edge.depthGap} layers away; bring it one layer toward the route.`,
        actionLabel: `${toward < 0 ? 'bury' : 'surface'} ${paneById(firstBroken.to).short}`,
        paneId: firstBroken.to,
        direction: toward,
        connection: firstBroken
      }
    }
    const vector = repairVectorFor(from, to)
    const distance = Math.max(Math.abs(vector.dx), Math.abs(vector.dy))
    return {
      kind: 'move',
      tone: 'danger',
      title: `${paneById(firstBroken.from).short} → ${paneById(firstBroken.to).short} breaks in open air`,
      detail: `Pull ${paneById(firstBroken.to).short} ${distance || 24} units ${directionLabel(vector.dx, vector.dy)} until the preview closes into a door.`,
      actionLabel: `pull ${paneById(firstBroken.to).short} ${directionLabel(vector.dx, vector.dy)}`,
      paneId: firstBroken.to,
      dx: vector.dx,
      dy: vector.dy,
      connection: firstBroken
    }
  }

  if (!validation.arrives) {
    const target = paneById(validation.stage.target)
    return {
      kind: 'cue',
      tone: 'guide',
      title: `the phrase must end at ${target.short}`,
      detail: `Cue ${target.label} next. The projected interval will show whether the house can carry it.`,
      actionLabel: `cue ${target.short} next`,
      paneId: target.id
    }
  }

  if (validation.missing.length) {
    const voice = validation.missing[0]
    const candidate = house.panes.find(pane => voicesForPane(pane.id, world).includes(voice) && !validation.score.includes(pane.id))
    if (candidate) {
      return {
        kind: 'cue',
        tone: 'guide',
        title: `${voice} has not entered the phrase`,
        detail: `${candidate.label} already carries ${voice}. Cue it, then restore ${paneById(validation.stage.target).short} as the final beat.`,
        actionLabel: `cue ${candidate.short}`,
        paneId: candidate.id
      }
    }
    const inlay = INLAYS.find(option => option.voice === voice)
    return {
      kind: 'inlay',
      tone: 'guide',
      title: `${voice} has no audible room in this route`,
      detail: `Arm ${inlay?.label || 'a portable rule'} and press it into a cued pane.`,
      actionLabel: `arm ${inlay?.label || voice}`,
      inlayId: inlay?.id
    }
  }

  if (!validation.longEnough) {
    const candidate = house.panes.find(pane => !validation.score.includes(pane.id))
    return {
      kind: 'cue',
      tone: 'guide',
      title: `${validation.stage.minRooms} distinct rooms must carry the body`,
      detail: `Add ${candidate?.label || 'another aperture'}, then return the target to the last beat.`,
      actionLabel: candidate ? `cue ${candidate.short}` : 'select another room',
      paneId: candidate?.id
    }
  }

  if (validation.rememberedCount < validation.stage.remembered) {
    const remembered = house.edges.find(edge => edge.remembered && edge.playable)
    return {
      kind: 'remembered',
      tone: 'guide',
      title: 'this phrase uses only fresh overlaps',
      detail: remembered
        ? `Route consecutive beats through ${paneById(remembered.left).short} ↔ ${paneById(remembered.right).short}; its ${remembered.formLabel} can stretch.`
        : 'Perform an earlier crossing first so one temporary seam can become elastic architecture.',
      actionLabel: remembered ? `select ${paneById(remembered.left).short}` : 'inspect glowing seams',
      paneId: remembered?.left,
      edgeId: remembered?.id
    }
  }

  if (validation.stage.inlay && !validation.inlayUsed) {
    const inlay = INLAYS.find(option => !world.inlays[option.id]) || INLAYS[0]
    return {
      kind: 'inlay',
      tone: 'guide',
      title: 'the route carries no transplanted rule',
      detail: `Arm ${inlay.label}; press it into any cued pane so a portable voice crosses with the body.`,
      actionLabel: `arm ${inlay.label}`,
      inlayId: inlay.id
    }
  }

  return {
    kind: 'ready',
    tone: 'ready',
    title: 'every beat is inhabitable',
    detail: 'Performing will vault these seams, furnish each room with the voice before it, and change which future routes can stretch.',
    actionLabel: 'architecture accepts the phrase'
  }
}

const PaneInterior = ({ pane, width, height, active, inhabited, furnishings = [] }) => {
  const voice = VOICES[pane.native]
  const centerX = width / 2
  const centerY = height / 2 + 8

  return (
    <g className={`ac-pane-interior is-${pane.native} ${active ? 'is-active' : ''}`}>
      {pane.native === 'shelter' && (
        <>
          <path d={`M 22 ${height - 26} V ${centerY} L ${centerX} 32 L ${width - 22} ${centerY} V ${height - 26}`} />
          <path d={`M ${centerX - 25} ${height - 26} V ${centerY + 10} H ${centerX + 25} V ${height - 26}`} />
          <circle cx={centerX} cy={centerY - 12} r="9" />
        </>
      )}
      {pane.native === 'rain' && Array.from({ length: 6 }, (_, index) => (
        <path key={index} d={`M 18 ${36 + index * 20} C ${centerX * 0.65} ${21 + index * 21}, ${centerX * 1.4} ${55 + index * 17}, ${width - 18} ${34 + index * 20}`} />
      ))}
      {pane.native === 'memory' && (
        <>
          {Array.from({ length: 5 }, (_, index) => <rect key={index} x={25 + index * 38} y={41 + (index % 2) * 12} width="26" height={height - 75 - (index % 2) * 12} />)}
          <path d={`M 20 ${height - 32} Q ${centerX} ${height - 62} ${width - 20} ${height - 32}`} />
        </>
      )}
      {pane.native === 'light' && (
        <>
          <circle cx={centerX} cy={centerY} r={Math.min(width, height) * 0.21} />
          <circle cx={centerX} cy={centerY} r={Math.min(width, height) * 0.34} />
          {Array.from({ length: 8 }, (_, index) => {
            const angle = index * Math.PI / 4
            return <line key={index} x1={centerX + Math.cos(angle) * 24} y1={centerY + Math.sin(angle) * 24} x2={centerX + Math.cos(angle) * 56} y2={centerY + Math.sin(angle) * 56} />
          })}
        </>
      )}
      {pane.native === 'seed' && (
        <>
          <path d={`M ${centerX} ${height - 22} C ${centerX - 10} ${centerY + 12}, ${centerX + 18} ${centerY - 12}, ${centerX} 36`} />
          <path d={`M ${centerX} ${centerY + 11} Q ${centerX - 56} ${centerY - 4} ${centerX - 64} 40 Q ${centerX - 15} 41 ${centerX} ${centerY + 11}`} />
          <path d={`M ${centerX + 2} ${centerY - 9} Q ${centerX + 54} ${centerY - 31} ${centerX + 66} 36 Q ${centerX + 21} 37 ${centerX + 2} ${centerY - 9}`} />
          <circle cx={centerX} cy={height - 22} r="8" />
        </>
      )}
      {pane.native === 'chorus' && (
        <>
          {Array.from({ length: 5 }, (_, index) => (
            <path key={index} d={`M 18 ${centerY + (index - 2) * 18} C ${centerX * 0.55} ${centerY + (index - 2) * 31}, ${centerX * 1.45} ${centerY - (index - 2) * 31}, ${width - 18} ${centerY + (index - 2) * 18}`} />
          ))}
          <circle cx={centerX} cy={centerY} r="13" />
        </>
      )}
      {inhabited > 0 && (
        <g className="ac-interior-echoes" transform={`translate(${centerX} ${centerY})`}>
          {Array.from({ length: Math.min(inhabited, 3) }, (_, index) => (
            <circle key={index} cx={(index - (Math.min(inhabited, 3) - 1) / 2) * 18} cy="0" r="4" />
          ))}
        </g>
      )}
      {furnishings.length > 0 && (
        <g className="ac-furnishings" aria-hidden="true">
          {furnishings.slice(-3).map((furnishing, index) => {
            const furnishingVoice = VOICES[furnishing.voice] || voice
            return (
              <g
                key={furnishing.id}
                className="ac-furnishing"
                transform={`translate(${34 + index * 31} ${height - 29})`}
                style={{ '--furnishing-color': furnishingVoice.color }}
              >
                <path d="M -10 7 V -5 Q 0 -13 10 -5 V 7 Z" />
                <text y="4">{FURNISHINGS[furnishing.voice]?.mark || '·'}</text>
              </g>
            )
          })}
        </g>
      )}
      <text className="ac-native-mark" x={width - 25} y={height - 19}>{voice.sigil}</text>
    </g>
  )
}

const ApertureChoir = ({ category, experiment }) => {
  const [world, setWorld] = useState(loadWorld)
  const [selectedPaneId, setSelectedPaneId] = useState('threshold')
  const [selectedInlayId, setSelectedInlayId] = useState(null)
  const [selectedScoreIndex, setSelectedScoreIndex] = useState(0)
  const [message, setMessage] = useState(() => (
    world.unlocked
      ? `${world.passages.length} echo${world.passages.length === 1 ? '' : 'es'} resumed // compose the next route explicitly`
      : 'the panes know how to overlap; they do not yet know how to sing in order'
  ))
  const [drag, setDrag] = useState(null)
  const [draftPane, setDraftPane] = useState(null)
  const [scoreSort, setScoreSort] = useState(null)
  const [passage, setPassage] = useState(null)
  const [mutation, setMutation] = useState(null)
  const [savedAt, setSavedAt] = useState(() => world.lastSaved)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [portraitPlan, setPortraitPlan] = useState(false)
  const [soundOn, setSoundOn] = useState(false)

  const surfaceRef = useRef(null)
  const atlasRef = useRef(null)
  const svgRef = useRef(null)
  const worldRef = useRef(world)
  const dragRef = useRef(null)
  const draftRef = useRef(null)
  const scoreSortRef = useRef(null)
  const dragFrameRef = useRef(null)
  const saveTimerRef = useRef(null)
  const passageTimerRef = useRef(null)
  const mutationTimerRef = useRef(null)
  const audioContextRef = useRef(null)

  useEffect(() => {
    worldRef.current = world
  }, [world])

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const width = window.matchMedia('(max-width: 760px)')
    const updateMotion = () => setReducedMotion(motion.matches)
    const updateWidth = () => setNarrow(width.matches)
    updateMotion()
    updateWidth()
    motion.addEventListener?.('change', updateMotion)
    width.addEventListener?.('change', updateWidth)
    return () => {
      motion.removeEventListener?.('change', updateMotion)
      width.removeEventListener?.('change', updateWidth)
    }
  }, [])

  useEffect(() => {
    const atlas = atlasRef.current
    if (!atlas || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect
      if (!rect?.height) return
      setPortraitPlan(rect.width / rect.height < 0.94)
    })
    observer.observe(atlas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      try {
        const timestamp = Date.now()
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...world, lastSaved: timestamp }))
        setSavedAt(timestamp)
      } catch {
        // The score remains playable when local memory is unavailable.
      }
    }, 180)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [world])

  useEffect(() => () => {
    if (passageTimerRef.current) window.clearTimeout(passageTimerRef.current)
    if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
    if (dragFrameRef.current) window.cancelAnimationFrame(dragFrameRef.current)
    audioContextRef.current?.close?.()
  }, [])

  const house = useMemo(() => deriveHouse(world), [world])
  const displayHouse = useMemo(
    () => deriveHouseWithDraft(house, world, draftPane),
    [draftPane, house, world]
  )
  const validation = useMemo(() => validateScore(world, displayHouse), [displayHouse, world])
  const currentStage = validation.stage
  const selectedPane = paneById(selectedPaneId) || PANES[0]
  const targetPane = paneById(currentStage.target)
  const visiblePaneIds = new Set(displayHouse.panes.map(pane => pane.id))
  const activeInlayEntry = Object.entries(world.inlays).find(([, paneId]) => paneId === selectedPaneId)
  const selectedInlay = selectedInlayId ? inlayById(selectedInlayId) : null
  const portrait = narrow || portraitPlan
  const busy = Boolean(passage || mutation)

  const screenPane = useCallback((pane) => {
    if (!portrait) return pane
    return {
      ...pane,
      x: pane.y,
      y: pane.x,
      width: pane.height,
      height: pane.width
    }
  }, [portrait])

  const screenIntersection = useCallback((intersection) => {
    if (!portrait || !intersection) return intersection
    return {
      ...intersection,
      x: intersection.y,
      y: intersection.x,
      width: intersection.height,
      height: intersection.width
    }
  }, [portrait])

  const screenPositions = useMemo(() => Object.fromEntries(
    displayHouse.panes.map(pane => [pane.id, screenPane(pane)])
  ), [displayHouse.panes, screenPane])

  const scorePath = useMemo(
    () => pathThrough(validation.score, screenPositions),
    [screenPositions, validation.score]
  )

  const passagePath = useMemo(
    () => passage ? pathThrough(passage.score, screenPositions) : '',
    [passage, screenPositions]
  )

  const phase = mutation
    ? 'rewriting'
    : world.status === 'mastered'
      ? 'polyphonic'
      : world.status === 'ruined'
        ? 'mute'
        : passage
          ? 'performing'
          : validation.ready
            ? 'scored'
            : world.stage > 0
              ? 'counterpoint'
              : world.unlocked
                ? 'rehearsing'
                : 'sealed'

  const svgPointFromClient = useCallback((clientX, clientY) => {
    const svg = svgRef.current
    if (!svg) return null
    const matrix = svg.getScreenCTM()
    if (!matrix) return null
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const screen = point.matrixTransform(matrix.inverse())
    return portrait ? { x: screen.y, y: screen.x } : screen
  }, [portrait])

  const paneAtClient = useCallback((clientX, clientY) => {
    const point = svgPointFromClient(clientX, clientY)
    if (!point) return null
    return [...deriveHouse(worldRef.current).panes]
      .sort((left, right) => right.depth - left.depth)
      .find(pane => (
        point.x >= pane.x && point.x <= pane.x + pane.width &&
        point.y >= pane.y && point.y <= pane.y + pane.height
      ))?.id || null
  }, [svgPointFromClient])

  const wake = useCallback(() => {
    setWorld(current => ({
      ...current,
      unlocked: true,
      log: [
        ...current.log,
        { id: `wake-${Date.now()}`, stage: current.stage, text: 'the hand entered; adjacency became notation' }
      ].slice(-8)
    }))
    setMessage('move the fourth pane into overlap, cue it after archive, then perform the authored score')
    requestAnimationFrame(() => surfaceRef.current?.focus())
  }, [])

  const playVoices = useCallback((paneIds, success = true) => {
    if (!soundOn) return
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const context = audioContextRef.current || new AudioContext()
      audioContextRef.current = context
      context.resume?.()
      const start = context.currentTime + 0.03
      paneIds.slice(0, MAX_SCORE_LENGTH).forEach((paneId, index) => {
        const pane = paneById(paneId)
        if (!pane) return
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = index % 3 === 2 ? 'triangle' : 'sine'
        oscillator.frequency.value = VOICES[pane.native].tone * (success ? 1 : 0.76)
        gain.gain.setValueAtTime(0.0001, start + index * 0.11)
        gain.gain.exponentialRampToValueAtTime(0.05, start + index * 0.11 + 0.025)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.11 + 0.38)
        oscillator.connect(gain).connect(context.destination)
        oscillator.start(start + index * 0.11)
        oscillator.stop(start + index * 0.11 + 0.42)
      })
    } catch {
      // Sound is an optional shadow of the spatial instrument.
    }
  }, [soundOn])

  const assignInlay = useCallback((inlayId, paneId) => {
    const inlay = inlayById(inlayId)
    const pane = paneById(paneId)
    const current = worldRef.current
    if (!inlay || !pane || pane.unlockedAt > current.stage || current.status !== 'composing' || busy) return
    setWorld(previous => {
      const inlays = { ...previous.inlays }
      Object.entries(inlays).forEach(([otherInlay, targetId]) => {
        if (targetId === paneId && otherInlay !== inlayId) delete inlays[otherInlay]
      })
      inlays[inlayId] = paneId
      return { ...previous, inlays }
    })
    setSelectedInlayId(null)
    setSelectedPaneId(paneId)
    setMessage(`${inlay.label} pressed into ${pane.label} // ${inlay.voice} enters every score that cues this pane`)
  }, [busy])

  const beginPaneDrag = useCallback((event, kind, id) => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'composing' || busy) return
    const point = svgPointFromClient(event.clientX, event.clientY)
    if (!point) return
    event.preventDefault()
    event.stopPropagation()
    const placement = current.panes[id]
    const next = {
      kind,
      id,
      startX: point.x,
      startY: point.y,
      originX: placement.x,
      originY: placement.y,
      originWidth: placement.width,
      originHeight: placement.height,
      moved: false,
      preview: { ...placement }
    }
    dragRef.current = next
    draftRef.current = { id, placement: { ...placement } }
    setDraftPane(draftRef.current)
    setDrag(next)
    setSelectedPaneId(id)
  }, [busy, svgPointFromClient])

  const beginInlayDrag = useCallback((event, id) => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'composing' || busy) return
    event.preventDefault()
    const next = {
      kind: 'inlay',
      id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      moved: false,
      targetId: null
    }
    dragRef.current = next
    setDrag(next)
    setSelectedInlayId(id)
  }, [busy])

  useEffect(() => {
    if (!drag?.id) return undefined

    const handleMove = (event) => {
      const current = dragRef.current
      if (!current) return
      if (current.kind === 'inlay') {
        const moved = current.moved || Math.hypot(
          event.clientX - current.startClientX,
          event.clientY - current.startClientY
        ) > 6
        const next = {
          ...current,
          clientX: event.clientX,
          clientY: event.clientY,
          moved,
          targetId: moved ? paneAtClient(event.clientX, event.clientY) : null
        }
        dragRef.current = next
        setDrag(next)
        return
      }

      const point = svgPointFromClient(event.clientX, event.clientY)
      if (!point) return
      const moved = current.moved || Math.hypot(point.x - current.startX, point.y - current.startY) > 4
      const placement = worldRef.current.panes[current.id]
      const preview = current.kind === 'resize'
        ? {
            ...placement,
            width: clamp(current.originWidth + point.x - current.startX, 158, 308),
            height: clamp(current.originHeight + point.y - current.startY, 118, 226)
          }
        : {
            ...placement,
            x: clamp(current.originX + point.x - current.startX, 18, VIEWBOX.width - placement.width - 18),
            y: clamp(current.originY + point.y - current.startY, 18, VIEWBOX.height - placement.height - 18)
          }
      const next = { ...current, moved, preview }
      dragRef.current = next
      draftRef.current = { id: current.id, placement: preview }
      if (!dragFrameRef.current) {
        dragFrameRef.current = window.requestAnimationFrame(() => {
          dragFrameRef.current = null
          setDrag(dragRef.current ? { ...dragRef.current } : null)
          setDraftPane(draftRef.current)
        })
      }
    }

    const handleUp = (event) => {
      const current = dragRef.current
      if (!current) return
      if (current.kind === 'inlay' && current.moved) {
        const targetId = paneAtClient(event.clientX, event.clientY)
        if (targetId) assignInlay(current.id, targetId)
        else setMessage('the portable rule found no receiving glass // tap it, then tap a pane')
      } else if (current.kind !== 'inlay' && current.moved) {
        const previous = worldRef.current
        const nextWorld = {
          ...previous,
          panes: {
            ...previous.panes,
            [current.id]: { ...previous.panes[current.id], ...current.preview }
          }
        }
        worldRef.current = nextWorld
        setWorld(nextWorld)
        const nextHouse = deriveHouse(nextWorld)
        const nextValidation = validateScore(nextWorld, nextHouse)
        const liveCount = nextHouse.edges.filter(edge => edge.stable).length
        const elasticCount = nextHouse.edges.filter(edge => edge.remembered && edge.playable && !edge.stable).length
        setMessage(nextValidation.ready
          ? 'the score brightened // every interval is now physically playable'
          : `${current.kind === 'resize' ? 'aperture cut' : 'window moved'} // ${liveCount} live seams + ${elasticCount} elastic memories`)
      }
      if (dragFrameRef.current) window.cancelAnimationFrame(dragFrameRef.current)
      dragFrameRef.current = null
      dragRef.current = null
      draftRef.current = null
      setDraftPane(null)
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
  }, [assignInlay, drag?.id, paneAtClient, svgPointFromClient])

  const alterSelected = useCallback((change, copy) => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'composing' || busy) return
    setWorld(previous => ({
      ...previous,
      panes: {
        ...previous.panes,
        [selectedPaneId]: {
          ...previous.panes[selectedPaneId],
          ...change(previous.panes[selectedPaneId], previous.panes)
        }
      }
    }))
    setMessage(copy)
  }, [busy, selectedPaneId])

  const nudgeSelected = useCallback((dx, dy) => {
    alterSelected(
      placement => ({
        x: clamp(placement.x + dx, 18, VIEWBOX.width - placement.width - 18),
        y: clamp(placement.y + dy, 18, VIEWBOX.height - placement.height - 18)
      }),
      `${selectedPane.label} nudged // live seams and remembered tension recalculated`
    )
  }, [alterSelected, selectedPane.label])

  const scaleSelected = useCallback((direction) => {
    alterSelected(
      placement => ({
        width: clamp(placement.width + direction * 18, 158, 308),
        height: clamp(placement.height + direction * 12, 118, 226)
      }),
      `${selectedPane.label} ${direction > 0 ? 'opened wider' : 'contracted'} // its score intervals changed with it`
    )
  }, [alterSelected, selectedPane.label])

  const shiftDepth = useCallback((direction) => {
    alterSelected(
      (placement, placements) => ({
        depth: direction > 0
          ? Math.max(...Object.values(placements).map(item => item.depth)) + 1
          : Math.min(...Object.values(placements).map(item => item.depth)) - 1
      }),
      `${selectedPane.label} moved ${direction > 0 ? 'toward the hand' : 'behind the score'} // distant layers stretch remembered doors`
    )
  }, [alterSelected, selectedPane.label])

  const removeSelectedInlay = useCallback(() => {
    const entry = Object.entries(worldRef.current.inlays).find(([, paneId]) => paneId === selectedPaneId)
    if (!entry) {
      setMessage(`${selectedPane.label} carries only its native ${selectedPane.native}`)
      return
    }
    setWorld(current => {
      const inlays = { ...current.inlays }
      delete inlays[entry[0]]
      return { ...current, inlays }
    })
    setMessage(`${inlayById(entry[0]).label} lifted // the score lost one portable voice`)
  }, [selectedPane.label, selectedPane.native, selectedPaneId])

  const appendPaneToScore = useCallback((paneId = selectedPaneId) => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'composing' || busy) return
    if (!deriveHouse(current).panes.some(pane => pane.id === paneId)) return
    if (current.score.length >= MAX_SCORE_LENGTH) {
      setMessage(`the score holds at most ${MAX_SCORE_LENGTH} windows // remove or reorder a phrase`)
      return
    }
    if (current.score.at(-1) === paneId) {
      setMessage(`${paneById(paneId).label} already occupies the last beat`)
      return
    }
    setWorld(previous => ({ ...previous, score: [...previous.score, paneId] }))
    setSelectedPaneId(paneId)
    setSelectedScoreIndex(current.score.length)
    setMessage(`${paneById(paneId).label} cued at beat ${current.score.length + 1} // the interval is judged by actual adjacency`)
  }, [busy, selectedPaneId])

  const removeScoreAt = useCallback((index) => {
    if (index <= 0 || busy || worldRef.current.status !== 'composing') return
    setWorld(previous => ({
      ...previous,
      score: previous.score.filter((_, scoreIndex) => scoreIndex !== index)
    }))
    setSelectedScoreIndex(Math.max(0, index - 1))
    setMessage('one beat lifted // the house will not invent the missing interval for you')
  }, [busy])

  const moveScoreBeat = useCallback((fromIndex, toIndex) => {
    const current = worldRef.current
    if (fromIndex <= 0 || toIndex <= 0 || fromIndex === toIndex || busy || current.status !== 'composing') return
    setWorld(previous => {
      const score = [...previous.score]
      const [beat] = score.splice(fromIndex, 1)
      score.splice(toIndex, 0, beat)
      return { ...previous, score }
    })
    setSelectedScoreIndex(toIndex)
    setMessage(`beat ${fromIndex + 1} moved to ${toIndex + 1} // spatial grammar recalculated`)
  }, [busy])

  const beginScoreSort = useCallback((event, index) => {
    if (index <= 0 || busy || worldRef.current.status !== 'composing') return
    event.preventDefault()
    event.stopPropagation()
    const next = {
      pointerId: event.pointerId,
      fromIndex: index,
      overIndex: index,
      startY: event.clientY,
      clientY: event.clientY,
      moved: false
    }
    scoreSortRef.current = next
    setScoreSort(next)
    setSelectedScoreIndex(index)
    setSelectedPaneId(worldRef.current.score[index])
  }, [busy])

  useEffect(() => {
    if (!scoreSort) return undefined
    const handleMove = (event) => {
      const current = scoreSortRef.current
      if (!current || event.pointerId !== current.pointerId) return
      event.preventDefault()
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-score-index]')
      const candidate = Number(target?.dataset.scoreIndex)
      const overIndex = Number.isInteger(candidate) && candidate > 0 ? candidate : current.overIndex
      const next = {
        ...current,
        clientY: event.clientY,
        overIndex,
        moved: current.moved || Math.abs(event.clientY - current.startY) > 7
      }
      scoreSortRef.current = next
      setScoreSort(next)
    }
    const handleUp = (event) => {
      const current = scoreSortRef.current
      if (!current || event.pointerId !== current.pointerId) return
      if (current.moved) moveScoreBeat(current.fromIndex, current.overIndex)
      else setMessage(`beat ${current.fromIndex + 1} held // drag its large handle to re-score by touch`)
      scoreSortRef.current = null
      setScoreSort(null)
    }
    window.addEventListener('pointermove', handleMove, { passive: false })
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [moveScoreBeat, scoreSort])

  const clearScore = useCallback(() => {
    if (busy || worldRef.current.status !== 'composing') return
    setWorld(previous => ({ ...previous, score: ['threshold'] }))
    setSelectedScoreIndex(0)
    setSelectedPaneId('threshold')
    setMessage('the phrase returned to its first threshold // cue a deliberate route')
  }, [busy])

  const resolvePassage = useCallback((tested) => {
    passageTimerRef.current = null
    const current = worldRef.current
    if (current.status !== 'composing') {
      setPassage(null)
      return
    }

    if (tested.ready) {
      const nextStage = current.stage + 1
      const mastered = nextStage >= STAGES.length
      const mutationForm = DOOR_FORMS[current.stage % DOOR_FORMS.length]
      const record = {
        id: `phrase-${Date.now()}`,
        stage: current.stage,
        path: [...tested.score],
        color: VOICES[paneById(tested.score.at(-1)).native].color,
        bornAt: Date.now(),
        form: mutationForm.id
      }
      setWorld(previous => {
        const latches = { ...previous.latches }
        tested.connections.forEach(connection => {
          const id = edgeIdFor(connection.from, connection.to)
          const prior = latches[id] || { memory: 0, crossings: 0, strain: 0, form: mutationForm.id }
          latches[id] = {
            memory: clamp(prior.memory + 1, 0, 3),
            crossings: prior.crossings + 1,
            strain: Math.max(0, prior.strain - 1),
            form: DOOR_FORMS[(previous.stage + connection.index) % DOOR_FORMS.length].id
          }
        })
        return {
          ...previous,
          stage: mastered ? previous.stage : nextStage,
          status: mastered ? 'mastered' : 'composing',
          score: mastered ? previous.score : ['threshold'],
          latches,
          passages: [...previous.passages, record].slice(-6),
          panes: Object.fromEntries(Object.entries(previous.panes).map(([id, pane]) => [id, {
            ...pane,
            inhabited: pane.inhabited + (tested.score.includes(id) ? 1 : 0),
            furnishings: tested.score.includes(id)
              ? [
                  ...(pane.furnishings || []),
                  {
                    id: `${record.id}-${id}`,
                    passageId: record.id,
                    voice: paneById(tested.score[Math.max(0, tested.score.indexOf(id) - 1)]).native,
                    stage: previous.stage
                  }
                ].slice(-4)
              : (pane.furnishings || [])
          }])),
          log: [
            ...previous.log,
            { id: record.id, stage: nextStage, text: STAGES[previous.stage].success }
          ].slice(-8)
        }
      })
      setSelectedPaneId(mastered ? 'choir' : STAGES[nextStage].target)
      setSelectedScoreIndex(0)
      setSelectedInlayId(null)
      setMutation({
        id: record.id,
        paneIds: [...tested.score],
        edgeIds: tested.connections.map(connection => edgeIdFor(connection.from, connection.to)),
        form: mutationForm.id,
        label: mutationForm.label
      })
      setMessage(`${STAGES[current.stage].success} // ${mutationForm.label} is rewriting the plan`)
      if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
      mutationTimerRef.current = window.setTimeout(() => {
        mutationTimerRef.current = null
        setMutation(null)
      }, reducedMotion ? 180 : 2400)
      playVoices(tested.score, true)
    } else {
      const failure = tested.broken[0]
      const scarId = failure?.to || tested.score.at(-1) || selectedPaneId
      const edgeId = failure ? edgeIdFor(failure.from, failure.to) : null
      const fractures = current.fractures + 1
      const ruined = fractures >= MAX_FRACTURES
      setWorld(previous => {
        const latches = { ...previous.latches }
        if (edgeId && latches[edgeId]) {
          latches[edgeId] = { ...latches[edgeId], strain: latches[edgeId].strain + 1 }
        }
        return {
          ...previous,
          fractures,
          status: ruined ? 'ruined' : 'composing',
          latches,
          panes: {
            ...previous.panes,
            [scarId]: {
              ...previous.panes[scarId],
              scars: previous.panes[scarId].scars + 1
            }
          },
          log: [
            ...previous.log,
            {
              id: `fracture-${Date.now()}`,
              stage: previous.stage,
              text: failure
                ? `${paneById(failure.from).short} could not hand the body to ${paneById(failure.to).short}`
                : `the phrase arrived without ${tested.missing.join(' + ') || 'its full instruction'}`
            }
          ].slice(-8)
        }
      })
      setMessage(ruined
        ? 'four false intervals entered the glass // the score can no longer distinguish door from wound'
        : failure
          ? `beat ${failure.index + 1} breaks in open air // overlap those windows or relax a remembered tether`
          : !tested.arrives
            ? `the score ends in ${paneById(tested.score.at(-1))?.label || 'silence'} // destination is ${targetPane.label}`
            : tested.missing.length
              ? `the route arrives without ${tested.missing.join(' + ')} // cue another pane or graft an inlay`
              : tested.rememberedCount < tested.stage.remembered
                ? 'the phrase uses only fresh overlaps // carry it through a glowing remembered door'
                : 'the final score requires a portable rule to cross with the body')
      playVoices(tested.score, false)
    }
    setPassage(null)
  }, [playVoices, reducedMotion, selectedPaneId, targetPane.label])

  const performScore = useCallback(() => {
    const current = worldRef.current
    if (!current.unlocked || current.status !== 'composing' || busy) return
    const tested = validateScore(current, deriveHouse(current))
    setWorld(previous => ({
      ...previous,
      history: [...previous.history, snapshotWorld(previous)].slice(-10)
    }))
    setPassage(tested)
    setMessage(tested.ready
      ? 'the authored phrase is crossing // each interval will become remembered architecture'
      : tested.broken.length
        ? `the body enters a score with ${tested.broken.length} impossible interval${tested.broken.length === 1 ? '' : 's'}`
        : 'the body can traverse this geometry, but the phrase is semantically incomplete')
    playVoices(tested.score, tested.ready)
    passageTimerRef.current = window.setTimeout(
      () => resolvePassage(tested),
      reducedMotion ? 120 : 1650
    )
  }, [busy, playVoices, reducedMotion, resolvePassage])

  const rewind = useCallback(() => {
    if (passageTimerRef.current) window.clearTimeout(passageTimerRef.current)
    if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
    const current = worldRef.current
    const snapshot = current.history.at(-1)
    if (!snapshot) {
      setMessage('no earlier performance remains beneath the score')
      return
    }
    setWorld(previous => ({
      ...previous,
      ...snapshot,
      unlocked: true,
      history: previous.history.slice(0, -1)
    }))
    setPassage(null)
    setMutation(null)
    setSelectedPaneId(snapshot.score.at(-1) || 'threshold')
    setSelectedScoreIndex(Math.max(0, snapshot.score.length - 1))
    setMessage('one performance lifted // score, elastic doors, scars, and echoes returned together')
  }, [])

  const reset = useCallback(() => {
    if (passageTimerRef.current) window.clearTimeout(passageTimerRef.current)
    if (mutationTimerRef.current) window.clearTimeout(mutationTimerRef.current)
    setWorld(freshWorld())
    setSelectedPaneId('threshold')
    setSelectedInlayId(null)
    setSelectedScoreIndex(0)
    setDrag(null)
    setDraftPane(null)
    setScoreSort(null)
    setPassage(null)
    setMutation(null)
    setMessage('six clean panes replace the remembered counterpoint')
  }, [])

  const handlePaneActivate = useCallback((paneId) => {
    setSelectedPaneId(paneId)
    if (selectedInlayId) {
      assignInlay(selectedInlayId, paneId)
      return
    }
    const pane = paneById(paneId)
    const voices = voicesForPane(paneId, worldRef.current)
    setMessage(`${pane.label} selected // ${voices.join(' + ')} // cue it, move its crown, or pull its cut-corner`)
  }, [assignInlay, selectedInlayId])

  const guidance = useMemo(
    () => inspectRoute(validation, world, displayHouse),
    [displayHouse, validation, world]
  )

  const applyGuidance = useCallback(() => {
    if (busy) return
    if (guidance.kind === 'cue' && guidance.paneId) {
      appendPaneToScore(guidance.paneId)
      return
    }
    if (guidance.kind === 'remove') {
      removeScoreAt(guidance.scoreIndex)
      return
    }
    if (guidance.kind === 'inlay' && guidance.inlayId) {
      setSelectedInlayId(guidance.inlayId)
      setMessage(`${inlayById(guidance.inlayId).label} armed by the route inspector // press it into a cued pane`)
      return
    }
    if (guidance.kind === 'remembered' && guidance.paneId) {
      setSelectedPaneId(guidance.paneId)
      setMessage(`${paneById(guidance.paneId).label} selected // cue both ends of the remembered door consecutively`)
      return
    }
    if ((guidance.kind === 'move' || guidance.kind === 'depth') && guidance.paneId) {
      setSelectedPaneId(guidance.paneId)
      setWorld(previous => {
        const placement = previous.panes[guidance.paneId]
        return {
          ...previous,
          panes: {
            ...previous.panes,
            [guidance.paneId]: {
              ...placement,
              ...(guidance.kind === 'move'
                ? {
                    x: clamp(placement.x + guidance.dx, 18, VIEWBOX.width - placement.width - 18),
                    y: clamp(placement.y + guidance.dy, 18, VIEWBOX.height - placement.height - 18)
                  }
                : { depth: placement.depth + guidance.direction })
            }
          }
        }
      })
      setMessage(`${guidance.actionLabel} // the inspector changed one architectural variable; re-read the route`)
    }
  }, [appendPaneToScore, busy, guidance, removeScoreAt])

  const routePreview = useMemo(() => {
    if (guidance.kind === 'move' && guidance.connection) {
      const target = displayHouse.panes.find(pane => pane.id === guidance.paneId)
      const from = displayHouse.panes.find(pane => pane.id === guidance.connection.from)
      if (!target || !from) return null
      const ghost = screenPane({ ...target, x: target.x + guidance.dx, y: target.y + guidance.dy })
      const current = screenPane(target)
      return {
        kind: 'move',
        ghost,
        from: screenPane(from),
        current,
        path: arcBetweenPanes(screenPane(from), ghost, 18)
      }
    }
    if (guidance.kind === 'cue' && guidance.paneId) {
      const from = screenPositions[validation.score.at(-1)]
      const to = screenPositions[guidance.paneId]
      if (!from || !to) return null
      return { kind: 'cue', from, to, path: arcBetweenPanes(from, to, 18) }
    }
    return null
  }, [displayHouse.panes, guidance, screenPane, screenPositions, validation.score])

  const handleSurfaceKeyDown = useCallback((event) => {
    if (event.target.closest('button, a, input, textarea, select')) return
    const step = event.shiftKey ? 3 : 12
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      nudgeSelected(-step, 0)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      nudgeSelected(step, 0)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      nudgeSelected(0, -step)
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      nudgeSelected(0, step)
    }
    if (event.key === '-' || event.key === '_') {
      event.preventDefault()
      scaleSelected(-1)
    }
    if (event.key === '=' || event.key === '+') {
      event.preventDefault()
      scaleSelected(1)
    }
    if (event.key === '[') {
      event.preventDefault()
      shiftDepth(-1)
    }
    if (event.key === ']') {
      event.preventDefault()
      shiftDepth(1)
    }
    if (event.key.toLowerCase() === 's') {
      event.preventDefault()
      appendPaneToScore()
    }
    if (event.key.toLowerCase() === 'r') {
      event.preventDefault()
      clearScore()
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      removeScoreAt(selectedScoreIndex)
    }
    if (event.key === ' ') {
      event.preventDefault()
      performScore()
    }
  }, [appendPaneToScore, clearScore, nudgeSelected, performScore, removeScoreAt, scaleSelected, selectedScoreIndex, shiftDepth])

  const diagnostic = validation.ready ? 'phrase is inhabitable' : guidance.title

  return (
    <div className={`ac-shell phase-${phase} ${narrow ? 'is-narrow' : ''} ${portrait ? 'is-portrait-plan' : ''} ${reducedMotion ? 'is-reduced-motion' : ''}`}>
      <header className="ac-crownbar">
        <div className="ac-nav"><ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} /></div>
        <div className="ac-title">
          <span>living score house / generation 226</span>
          <h1 style={{ color: experiment.color }}>{experiment.name}</h1>
        </div>
        <div className="ac-memory">
          <button
            type="button"
            onClick={() => {
              setSoundOn(current => !current)
              setMessage(soundOn ? 'the score returns to silence' : 'each authored interval will now sound its native frequency')
            }}
            aria-pressed={soundOn}
          >
            {soundOn ? 'tone on' : 'tone off'}
          </button>
          <span>{world.passages.length} echoes // {formatAge(savedAt)}</span>
        </div>
      </header>

      <main
        ref={surfaceRef}
        className={`ac-surface ${drag ? 'is-dragging' : ''}`}
        tabIndex={0}
        onKeyDown={handleSurfaceKeyDown}
        data-playground-surface
        data-testid="aperture-choir-surface"
        aria-label="Persistent house and explicit passage score built from draggable SVG apertures"
      >
        <section ref={atlasRef} className="ac-atlas" aria-label="inhabitable aperture plan">
          <div className="ac-phase-stamp" role="status">
            <span>{phase} / phrase {Math.min(world.stage + 1, 3)}</span>
            <strong>{mutation ? `${mutation.label.toUpperCase()} FORMING` : validation.ready ? 'SCORE CAN CARRY' : `${displayHouse.edges.filter(edge => edge.playable).length} PLAYABLE DOORS`}</strong>
          </div>

          <svg
            ref={svgRef}
            className="ac-house"
            viewBox={portrait ? `0 0 ${MOBILE_VIEWBOX.width} ${MOBILE_VIEWBOX.height}` : `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
            preserveAspectRatio={portrait ? 'xMidYMid slice' : 'xMidYMid meet'}
            aria-label={`${displayHouse.edges.filter(edge => edge.stable).length} live overlaps and ${displayHouse.edges.filter(edge => edge.remembered).length} remembered doors. Current score is ${validation.ready ? 'ready' : 'incomplete'}.`}
          >
            <defs>
              <pattern id="ac-registration" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 H 0 V 32" fill="none" stroke="rgba(233,225,203,.08)" strokeWidth=".8" />
                <circle cx="0" cy="0" r="1.35" fill="rgba(233,225,203,.17)" />
              </pattern>
              <pattern id="ac-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(31)">
                <line x1="0" y1="0" x2="0" y2="9" stroke="rgba(255,255,255,.17)" strokeWidth="2" />
              </pattern>
              <filter id="ac-grain" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency=".58" numOctaves="2" seed="226" result="noise" />
                <feColorMatrix in="noise" type="saturate" values="0" result="gray" />
                <feBlend in="SourceGraphic" in2="gray" mode="soft-light" />
              </filter>
              <filter id="ac-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              {displayHouse.panes.map(pane => {
                const screen = screenPane(pane)
                return <clipPath key={pane.id} id={`ac-clip-${pane.id}`}><rect width={screen.width} height={screen.height} rx="4" /></clipPath>
              })}
            </defs>

            <rect className="ac-stage-ground" width={portrait ? MOBILE_VIEWBOX.width : VIEWBOX.width} height={portrait ? MOBILE_VIEWBOX.height : VIEWBOX.height} rx="18" />
            <rect className="ac-stage-grid" x="18" y="18" width={(portrait ? MOBILE_VIEWBOX.width : VIEWBOX.width) - 36} height={(portrait ? MOBILE_VIEWBOX.height : VIEWBOX.height) - 36} rx="12" fill="url(#ac-registration)" />
            <path className="ac-house-outline" d={portrait ? 'M 94 942 V 114 H 552 V 942 M 94 258 H 552 M 94 612 H 552' : 'M 68 594 V 102 H 974 V 594 M 204 102 V 594 M 606 102 V 594'} />
            <path className="ac-sightline" d={portrait ? 'M 58 814 C 174 704 442 688 604 466' : 'M 58 566 C 242 512 560 562 978 308'} />

            <g className="ac-echo-routes">
              {world.passages.map((record, index) => {
                const path = pathThrough(record.path.filter(id => visiblePaneIds.has(id)), screenPositions)
                if (!path) return null
                return (
                  <g key={record.id} style={{ '--echo-color': record.color, '--echo-index': index }}>
                    <path d={path} />
                    {!reducedMotion && (
                      <g className="ac-echo-inhabitant">
                        <circle r={4 + Math.min(index, 2)} />
                        <path d="M -7 0 L 0 -4 L 7 0 L 0 4 Z" />
                        <animateMotion dur={`${5.8 - Math.min(index, 3) * 0.55}s`} begin={`${index * -0.8}s`} repeatCount="indefinite" path={path} />
                      </g>
                    )}
                  </g>
                )
              })}
            </g>

            <g className="ac-door-layer">
              {displayHouse.edges.filter(edge => edge.stable || edge.remembered).map(edge => {
                const left = screenPositions[edge.left]
                const right = screenPositions[edge.right]
                const seam = screenIntersection(edge.intersection)
                const doorPaths = doorPathsFor(edge, left, right)
                const scored = validation.connections.some(connection => connection.edge?.id === edge.id)
                const mutating = mutation?.edgeIds.includes(edge.id)
                return (
                  <g
                    key={edge.id}
                    className={`${edge.stable ? 'is-live' : 'is-elastic'} ${edge.playable ? 'is-playable' : 'is-ruptured'} ${scored ? 'is-scored' : ''} is-form-${edge.form} ${mutating ? 'is-mutating' : ''}`}
                    style={{ '--door-strength': edge.strength, '--door-memory': edge.memory, '--door-tension': edge.tension }}
                  >
                    {edge.stable && seam ? (
                      <>
                        <rect x={seam.x} y={seam.y} width={seam.width} height={seam.height} rx="4" />
                        <path className="ac-door-throat" d={`M ${seam.x + 4} ${seam.y + seam.height / 2} H ${seam.x + seam.width - 4}`} />
                      </>
                    ) : null}
                    {edge.remembered && doorPaths.map((path, pathIndex) => (
                      <path key={pathIndex} className="ac-elastic-door ac-door-form" d={path} />
                    ))}
                    {edge.remembered && (
                      <g className="ac-door-memory" transform={`translate(${(left.x + left.width / 2 + right.x + right.width / 2) / 2} ${(left.y + left.height / 2 + right.y + right.height / 2) / 2})`}>
                        <circle r={9 + edge.memory * 2} />
                        <text y="3">{DOOR_FORMS.find(form => form.id === edge.form)?.mark || edge.memory}</text>
                        {edge.resonance.length > 0 && <text className="ac-door-resonance" y="25">{edge.resonance.map(voice => VOICES[voice].sigil).join('')}</text>}
                      </g>
                    )}
                  </g>
                )
              })}
            </g>

            <g className="ac-score-route">
              {validation.connections.map((connection, index) => {
                const left = screenPositions[connection.from]
                const right = screenPositions[connection.to]
                if (!left || !right) return null
                return (
                  <path
                    key={`${connection.from}-${connection.to}-${index}`}
                    className={`${connection.playable && !connection.repeated ? 'is-valid' : 'is-invalid'} ${connection.edge?.remembered ? 'is-remembered' : ''}`}
                    d={arcBetweenPanes(left, right, (index % 2 ? -1 : 1) * (23 + index * 2))}
                  />
                )
              })}
              {scorePath && validation.ready && <path className="ac-score-glow" d={scorePath} />}
            </g>

            {routePreview && (
              <g className={`ac-route-preview is-${routePreview.kind}`} aria-hidden="true">
                <path d={routePreview.path} />
                {routePreview.kind === 'move' && (
                  <rect
                    x={routePreview.ghost.x}
                    y={routePreview.ghost.y}
                    width={routePreview.ghost.width}
                    height={routePreview.ghost.height}
                    rx="8"
                  />
                )}
                {routePreview.kind === 'cue' && <circle cx={routePreview.to.x + routePreview.to.width / 2} cy={routePreview.to.y + routePreview.to.height / 2} r="24" />}
              </g>
            )}

            <g className="ac-pane-layer">
              {[...displayHouse.panes].sort((left, right) => left.depth - right.depth).map((pane, paneIndex) => {
                const placement = screenPane(pane)
                const voice = VOICES[pane.native]
                const selected = selectedPaneId === pane.id
                const target = currentStage.target === pane.id
                const inlayId = Object.entries(world.inlays).find(([, targetId]) => targetId === pane.id)?.[0]
                const inlay = inlayById(inlayId)
                const scoredBeats = validation.score.reduce((beats, paneId, index) => paneId === pane.id ? [...beats, index + 1] : beats, [])
                const dragTarget = drag?.kind === 'inlay' && drag.targetId === pane.id
                const mutating = mutation?.paneIds.includes(pane.id)
                const suggested = guidance.paneId === pane.id && !validation.ready
                return (
                  <g
                    key={pane.id}
                    className={`ac-pane ${selected ? 'is-selected' : ''} ${target ? 'is-target' : ''} ${suggested ? 'is-suggested' : ''} ${scoredBeats.length ? 'is-cued' : ''} ${drag?.id === pane.id ? 'is-dragging' : ''} ${dragTarget ? 'is-inlay-target' : ''} ${mutating ? 'is-mutating' : ''} ${pane.unlockedAt === world.stage && pane.unlockedAt > 0 ? 'is-newborn' : ''}`}
                    transform={`translate(${placement.x} ${placement.y})`}
                    style={{ '--pane-color': voice.color, '--pane-order': paneIndex }}
                    onClick={(event) => {
                      event.stopPropagation()
                      handlePaneActivate(pane.id)
                    }}
                  >
                    <title>{`${pane.label}. ${voicesForPane(pane.id, world).join(' and ')}. Layer ${pane.depth}. ${pane.inhabited} remembered performers.`}</title>
                    <rect className="ac-pane-shadow" x="9" y="11" width={placement.width} height={placement.height} rx="5" />
                    <rect className="ac-pane-glass" width={placement.width} height={placement.height} rx="5" filter="url(#ac-grain)" />
                    <g clipPath={`url(#ac-clip-${pane.id})`}>
                      <rect className="ac-pane-wash" width={placement.width} height={placement.height} />
                      <PaneInterior pane={pane} width={placement.width} height={placement.height} active={scoredBeats.length > 0 || pane.inhabited > 0} inhabited={pane.inhabited} furnishings={pane.furnishings} />
                      <rect className="ac-pane-hatch" width={placement.width} height={placement.height} fill="url(#ac-hatch)" />
                    </g>
                    <rect className="ac-pane-border" width={placement.width} height={placement.height} rx="5" />

                    <g
                      className="ac-pane-crown"
                      role="button"
                      tabIndex={world.unlocked ? 0 : -1}
                      aria-label={`Select and move ${pane.label}. Large drag handle. Native ${voice.label}${inlay ? `, inlaid ${inlay.voice}` : ''}. Layer ${pane.depth}.`}
                      onPointerDown={(event) => beginPaneDrag(event, 'move', pane.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          handlePaneActivate(pane.id)
                        }
                      }}
                    >
                      <rect width={placement.width} height={TOUCH_HANDLE} rx="7" />
                      <circle cx="25" cy={TOUCH_HANDLE / 2} r="8" />
                      <text x="42" y={TOUCH_HANDLE / 2 + 4}>{pane.number} / {pane.short}</text>
                      <text className="ac-depth-label" x={placement.width - 12} y={TOUCH_HANDLE / 2 + 4}>L{pane.depth}</text>
                    </g>

                    <g
                      className="ac-pane-resize"
                      transform={`translate(${placement.width - TOUCH_HANDLE} ${placement.height - TOUCH_HANDLE})`}
                      role="button"
                      tabIndex={world.unlocked ? 0 : -1}
                      aria-label={`Resize ${pane.label}. Large corner drag handle.`}
                      onPointerDown={(event) => beginPaneDrag(event, 'resize', pane.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          setSelectedPaneId(pane.id)
                          setWorld(previous => ({
                            ...previous,
                            panes: {
                              ...previous.panes,
                              [pane.id]: {
                                ...previous.panes[pane.id],
                                width: clamp(previous.panes[pane.id].width + 18, 158, 308),
                                height: clamp(previous.panes[pane.id].height + 12, 118, 226)
                              }
                            }
                          }))
                          setMessage(`${pane.label} opened wider from its accessible resize handle`)
                        }
                      }}
                    >
                      <rect width={TOUCH_HANDLE} height={TOUCH_HANDLE} rx="7" />
                      <path d={`M 18 ${TOUCH_HANDLE - 16} L ${TOUCH_HANDLE - 16} 18 M 35 ${TOUCH_HANDLE - 16} L ${TOUCH_HANDLE - 16} 35`} />
                    </g>

                    <g
                      className="ac-pane-cue"
                      transform={`translate(36 ${placement.height - 38})`}
                      role="button"
                      tabIndex={world.unlocked ? 0 : -1}
                      aria-label={`Cue ${pane.label} as next score beat`}
                      onClick={(event) => {
                        event.stopPropagation()
                        appendPaneToScore(pane.id)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          appendPaneToScore(pane.id)
                        }
                      }}
                    >
                      <circle r="33" />
                      <path d="M -11 0 H 11 M 0 -11 V 11" />
                    </g>

                    {scoredBeats.length > 0 && (
                      <g className="ac-beat-flags" transform={`translate(${placement.width - 19} ${placement.height - 48})`}>
                        {scoredBeats.slice(0, 3).map((beat, index) => <text key={beat} y={index * -14}>{String(beat).padStart(2, '0')}</text>)}
                      </g>
                    )}

                    {inlay && (
                      <g className="ac-installed-inlay" transform={`translate(${placement.width - 31} ${TOUCH_HANDLE + 18})`}>
                        <circle r="15" />
                        <text y="5">{inlay.mark}</text>
                      </g>
                    )}

                    {pane.scars > 0 && <path className="ac-pane-scar" d={`M 15 ${placement.height - 53} L 34 ${placement.height - 37} L 25 ${placement.height - 18} L 49 ${placement.height - 30} L 64 ${placement.height - 12}`} />}
                  </g>
                )
              })}
            </g>

            {passagePath && passage && (
              <g className={`ac-live-passage ${passage.ready ? 'is-ready' : 'is-breaking'}`} filter="url(#ac-glow)">
                <path d={passagePath} />
                {!reducedMotion && (
                  <g>
                    <circle r="11" />
                    <path d="M -11 0 L 0 -7 L 11 0 L 0 7 Z" />
                    <animateMotion dur="1.48s" fill="freeze" path={passagePath} />
                  </g>
                )}
              </g>
            )}
          </svg>

          <ol className="ac-chronicle" aria-label="house memory">
            {world.log.slice(-3).reverse().map((entry, index) => (
              <li key={entry.id} style={{ opacity: 1 - index * 0.24 }}><span>{String(entry.stage).padStart(2, '0')}</span>{entry.text}</li>
            ))}
          </ol>

          <div className="ac-fracture-rail" aria-label={`${world.fractures} of ${MAX_FRACTURES} fractures`}>
            <span>false intervals</span>
            {Array.from({ length: MAX_FRACTURES }, (_, index) => <i key={index} className={world.fractures > index ? 'is-broken' : ''} />)}
          </div>
        </section>

        <aside className="ac-score-spine" aria-label="passage score and aperture instrument">
          <section className="ac-brief">
            <div>
              <span>{currentStage.label}</span>
              <b>{currentStage.needs.filter(voice => validation.collected.includes(voice)).length}/{currentStage.needs.length} required voices awake</b>
            </div>
            <h2>{currentStage.instruction}</h2>
            <p role="status">{message}</p>
            <div className="ac-voice-brief" aria-label="required voices">
              {currentStage.needs.map(voiceId => {
                const voice = VOICES[voiceId]
                const collected = validation.collected.includes(voiceId)
                return <i key={voiceId} className={collected ? 'is-held' : ''} style={{ '--voice-color': voice.color }} title={voice.label}>{voice.sigil}<small>{voice.label}</small></i>
              })}
            </div>
          </section>

          <section className={`ac-route-inspector is-${guidance.tone}`} aria-label="route inspector" aria-live="polite">
            <div className="ac-section-heading">
              <span>route inspector / first consequence</span>
              <strong>{validation.broken.length ? `beat ${validation.broken[0].index + 1}→${validation.broken[0].index + 2}` : validation.ready ? 'clear' : 'semantic'}</strong>
            </div>
            <h3>{guidance.title}</h3>
            <p>{guidance.detail}</p>
            {guidance.kind !== 'ready' && (
              <button type="button" onClick={applyGuidance} disabled={busy} data-playground-action="repair-route">
                <span>{guidance.kind === 'move' ? directionLabel(guidance.dx, guidance.dy) : guidance.kind === 'cue' ? '＋' : '◇'}</span>
                {guidance.actionLabel}
              </button>
            )}
          </section>

          <section className="ac-score-editor" aria-label="explicit passage score">
            <div className="ac-section-heading">
              <span>authored crossing</span>
              <strong>{validation.score.length}/{MAX_SCORE_LENGTH} beats</strong>
            </div>
            <ol className="ac-score-tape">
              {validation.score.map((paneId, index) => {
                const pane = paneById(paneId)
                const voice = VOICES[pane.native]
                const incoming = index > 0 ? validation.connections[index - 1] : null
                const selected = selectedScoreIndex === index
                return (
                  <li
                    key={`${paneId}-${index}`}
                    className={`${selected ? 'is-selected' : ''} ${incoming && !incoming.playable ? 'is-broken' : ''} ${scoreSort?.fromIndex === index ? 'is-sorting' : ''} ${scoreSort?.overIndex === index && scoreSort.fromIndex !== index ? 'is-sort-over' : ''}`}
                    data-score-index={index}
                    style={{ '--beat-color': voice.color }}
                  >
                    {incoming && <span className={`ac-score-joint ${incoming.playable ? 'is-valid' : ''} ${incoming.edge?.remembered ? 'is-remembered' : ''}`} />}
                    <button
                      type="button"
                      className="ac-score-grip"
                      onPointerDown={(event) => beginScoreSort(event, index)}
                      disabled={index === 0 || busy}
                      aria-label={index === 0 ? 'Threshold is the fixed first beat' : `Drag beat ${index + 1}, ${pane.label}, to reorder the score`}
                    >
                      <i>{index === 0 ? '◆' : '≡'}</i>
                      <small>{String(index + 1).padStart(2, '0')}</small>
                    </button>
                    <button
                      type="button"
                      className="ac-score-beat"
                      onClick={() => {
                        setSelectedScoreIndex(index)
                        setSelectedPaneId(paneId)
                        setMessage(`beat ${index + 1}: ${pane.label} // drag this beat or use the shift keys below`)
                      }}
                      aria-pressed={selected}
                    >
                      <span><strong>{pane.short}</strong><small>{voicesForPane(paneId, world).join(' + ')}</small></span>
                      <b>{voice.sigil}</b>
                    </button>
                  </li>
                )
              })}
            </ol>
            <div className="ac-score-actions">
              <button
                type="button"
                onClick={() => appendPaneToScore()}
                disabled={!world.unlocked || world.score.length >= MAX_SCORE_LENGTH || busy}
                data-playground-action="cue-aperture"
              >
                <span>＋</span> cue {selectedPane.short}<small>S</small>
              </button>
              <button type="button" onClick={() => moveScoreBeat(selectedScoreIndex, selectedScoreIndex - 1)} disabled={selectedScoreIndex <= 1 || busy} aria-label="Move selected score beat earlier">←<small>earlier</small></button>
              <button type="button" onClick={() => moveScoreBeat(selectedScoreIndex, selectedScoreIndex + 1)} disabled={selectedScoreIndex <= 0 || selectedScoreIndex >= world.score.length - 1 || busy} aria-label="Move selected score beat later">→<small>later</small></button>
              <button type="button" onClick={() => removeScoreAt(selectedScoreIndex)} disabled={selectedScoreIndex <= 0 || busy}>×<small>lift beat</small></button>
              <button type="button" onClick={clearScore} disabled={busy}>↺<small>clear</small></button>
            </div>
          </section>

          <div className="ac-instrument-grid">
            <section className="ac-rule-rack" aria-label="portable voice inlays">
              <div className="ac-section-heading"><span>portable rules</span><strong>{selectedInlay ? `${selectedInlay.mark} armed` : 'drag / tap'}</strong></div>
              <div>
                {INLAYS.map(inlay => {
                  const voice = VOICES[inlay.voice]
                  const placedOn = world.inlays[inlay.id]
                  return (
                    <button
                      type="button"
                      key={inlay.id}
                      className={`${selectedInlayId === inlay.id ? 'is-selected' : ''} ${placedOn ? 'is-placed' : ''}`}
                      style={{ '--inlay-color': voice.color }}
                      onClick={() => {
                        setSelectedInlayId(selectedInlayId === inlay.id ? null : inlay.id)
                        setMessage(`${inlay.label} ${selectedInlayId === inlay.id ? 'returned to its sleeve' : `armed // tap a pane to add ${voice.label}`}`)
                      }}
                      onPointerDown={(event) => beginInlayDrag(event, inlay.id)}
                      aria-pressed={selectedInlayId === inlay.id}
                      data-playground-action="inlay-window"
                      title={placedOn ? `${inlay.label} in ${paneById(placedOn).label}` : inlay.note}
                    >
                      <i>{inlay.mark}</i><span>{inlay.label}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="ac-aperture-tools" aria-label="selected aperture controls">
              <div className="ac-section-heading"><span>active aperture / {selectedPane.number}</span><strong style={{ color: VOICES[selectedPane.native].color }}>{selectedPane.short}</strong></div>
              <div className="ac-nudge-cross">
                <button type="button" onClick={() => nudgeSelected(0, -12)} aria-label="Move selected window up">↑</button>
                <button type="button" onClick={() => nudgeSelected(-12, 0)} aria-label="Move selected window left">←</button>
                <button type="button" onClick={() => nudgeSelected(12, 0)} aria-label="Move selected window right">→</button>
                <button type="button" onClick={() => nudgeSelected(0, 12)} aria-label="Move selected window down">↓</button>
              </div>
              <div className="ac-cut-tools">
                <button type="button" onClick={() => scaleSelected(-1)}>−<small>contract</small></button>
                <button type="button" onClick={() => scaleSelected(1)} data-playground-action="resize-aperture">＋<small>expand</small></button>
                <button type="button" onClick={() => shiftDepth(-1)}>↓<small>bury</small></button>
                <button type="button" onClick={() => shiftDepth(1)}>↑<small>surface</small></button>
                <button type="button" onClick={removeSelectedInlay} disabled={!activeInlayEntry}>◇<small>lift rule</small></button>
              </div>
            </section>
          </div>

          <section className="ac-performance-console">
            <div>
              <span>{validation.ready ? 'inhabitable score' : diagnostic}</span>
              <strong>{validation.rememberedCount} remembered / {validation.connections.filter(connection => connection.playable).length} playable intervals</strong>
            </div>
            <button
              type="button"
              className={validation.ready ? 'is-ready' : ''}
              onClick={performScore}
              disabled={!world.unlocked || world.status !== 'composing' || busy}
              data-playground-action="perform-score"
            >
              <span>{mutation ? `${mutation.label} rewriting rooms` : passage ? 'inhabitant moving' : validation.ready ? 'architecture accepts the phrase' : `risk: ${guidance.title}`}</span>
              <strong>{mutation ? 'ARCHITECTURE LEARNING…' : passage ? 'PERFORMING…' : 'PERFORM SCORE'}</strong>
              <small>SPACE</small>
            </button>
            <div>
              <button type="button" onClick={rewind} disabled={world.history.length === 0}>lift performance</button>
              <button type="button" onClick={reset}>unbuild house</button>
            </div>
          </section>
        </aside>

        {!world.unlocked && (
          <div className="ac-seal">
            <div className="ac-seal-score" aria-hidden="true">
              <i /><i /><i /><i /><span>226</span>
            </div>
            <p>UNSCORED HOUSE / LIVING INTERFACE GENERATION 226</p>
            <h2>A door is only geometry.<br />A remembered order becomes a song.</h2>
            <button type="button" onClick={wake} data-playground-primary>
              enter the score house
            </button>
            <small>move glass • author beats • perform crossings • stretch remembered doors</small>
          </div>
        )}

        {world.status === 'mastered' && !mutation && (
          <div className="ac-outcome ac-outcome-mastered">
            <span>mastery / three authored phrases / {Object.keys(world.latches).length} remembered doors</span>
            <h2>THE HOUSE IS PERFORMING ITS INHABITANTS</h2>
            <p>Temporary overlaps became elastic agreements. Portable rules crossed with bodies. Three routes now move at once through an architecture that remembers sequence, not merely position.</p>
            <div><button type="button" onClick={rewind}>lift final phrase</button><button type="button" onClick={reset}>unbuild the choir</button></div>
          </div>
        )}

        {world.status === 'ruined' && (
          <div className="ac-outcome ac-outcome-ruined">
            <span>failure / four false intervals entered the score</span>
            <h2>THE WINDOWS KEPT THEIR VIEWS. THE ORDER LOST ITS BODY.</h2>
            <p>Lift the last performance, then overlap the broken beat, relax a strained remembered door, or cue a voice that can survive the route.</p>
            <div><button type="button" onClick={rewind}>lift last fracture</button><button type="button" onClick={reset}>replace the glass</button></div>
          </div>
        )}

        {drag?.kind === 'inlay' && drag.moved && (
          <div
            className={`ac-drag-inlay ${drag.targetId ? 'is-targeting' : ''}`}
            style={{ left: drag.clientX, top: drag.clientY, '--inlay-color': VOICES[inlayById(drag.id).voice].color }}
            aria-hidden="true"
          >
            <i>{inlayById(drag.id).mark}</i>
            <span>{drag.targetId ? `press into ${paneById(drag.targetId).label}` : 'carry rule'}</span>
          </div>
        )}
      </main>
    </div>
  )
}

export { freshWorld, deriveHouse, validateScore }
export default ApertureChoir
