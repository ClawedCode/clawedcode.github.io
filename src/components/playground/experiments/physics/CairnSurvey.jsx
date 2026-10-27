import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CAIRNS, CAIRN, DAYS, READINGS_PER_DAY, WEATHER, SHEET, VILLAGE, BASELINE, EYE,
  adjustNetwork, bearingTo, canSee, contours, cutRoad, formatBearing, instrumentNoise,
  metres, misclosure, mulberry32, travelDays, trueError, weatherSchedule, wrap
} from './survey/survey-core'
import { createSurveyScene } from './survey/survey-scene'
import { createSurveyAudio } from './survey/survey-audio'
import './CairnSurvey.css'

const POWERS = [{ fov: 60, power: 1 }, { fov: 24, power: 2.5 }, { fov: 10, power: 6 }, { fov: 4, power: 15 }, { fov: 2, power: 30 }]
const RING = 0.09 // reticle radius as a fraction of the view's half-height
const READABLE_FOV = 25
const LABEL_SIDE = { saddle: 'below', westcrown: 'left', raven: 'left' }
// The parish's old sketch puts every hill somewhere near, never where.
const HEARSAY = [[0, 0], [0, 0], [16, -38], [28, -30], [-26, -36], [38, 24], [30, 34], [-40, 18], [44, -14], [36, -30], [-46, 26]]
const DEG = Math.PI / 180
const codeText = code => code.map(m => (m === 1 ? '·' : '–')).join(' ')
const ringDegrees = fov => Math.atan(RING * Math.tan((fov * DEG) / 2)) / DEG

const VERDICTS = {
  crown: { title: 'The Crown Road', tone: 'good' },
  shoulder: { title: 'The Shoulder Road', tone: 'mixed' },
  'wrong-cleugh': { title: 'The Wrong Cleugh', tone: 'mixed' },
  stalled: { title: 'The Road to the Scar', tone: 'bad' },
  none: { title: 'No Sheet', tone: 'bad' }
}

function verdictText(road) {
  if (!road) return 'The crews waited at the kirk with picks and no sheet. The Saddle and Far Shiel were never both on paper, so nobody could say where to cut.'
  const extra = metres(road.extra)
  const miss = metres(road.saddleMiss)
  if (road.outcome === 'crown') return `Your Saddle sat ${miss} from its lowest stone. Carts cross ${extra} above the true pass and come down to Far Shiel's door.`
  if (road.outcome === 'shoulder') return `Your Saddle sat ${miss} from the true pass, enough to lay the line across the Crown's flank. The crews cut ${extra} of hairpins above the pass.`
  if (road.outcome === 'wrong-cleugh') return `Clean over the Saddle, then the sheet's Far Shiel sent the road down the wrong cleugh, ${metres(road.farMiss)} from the shiel.`
  return `The sheet put the Saddle ${miss} from the true pass, and the line ran onto the Crown's flank. The crews met rock ${metres(road.path[road.stopAt].h - road.saddleH)} above the pass, still climbing.`
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(q.matches)
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])
  return reduced
}

function trueSight(fromId, toId) {
  const a = CAIRN[fromId]
  const b = CAIRN[toId]
  const dist = Math.hypot(b.x - a.x, b.z - a.z)
  return { az: bearingTo(a, b), el: Math.atan2(b.h + b.signal - (a.h + EYE), dist) / DEG, dist }
}

function drawTape(canvas, view, marks) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (!w || !h) return
  if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr) }
  const g = canvas.getContext('2d')
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  g.clearRect(0, 0, w, h)
  const span = Math.max(view.fov * 1.4, 2.4)
  const pxPerDeg = w / span
  const steps = [[30, 10, 5], [10, 5, 1], [5, 1, 1 / 6], [1, 1 / 6, 1 / 30], [1 / 2, 1 / 12, 1 / 60]]
  const [label, mid, minor] = steps.find(s => s[2] * pxPerDeg >= 5) || steps[steps.length - 1]
  const start = Math.floor((view.yaw - span / 2) / minor) * minor
  g.strokeStyle = 'rgba(244, 236, 214, 0.75)'
  g.fillStyle = 'rgba(244, 236, 214, 0.92)'
  g.font = '600 11px "IBM Plex Mono", ui-monospace, monospace'
  g.textAlign = 'center'
  g.lineWidth = 1
  for (let a = start; a <= view.yaw + span / 2; a += minor) {
    const x = w / 2 + wrap(a - view.yaw) * pxPerDeg
    const isLabel = Math.abs(a / label - Math.round(a / label)) < 1e-6
    const isMid = Math.abs(a / mid - Math.round(a / mid)) < 1e-6
    const len = isLabel ? 14 : isMid ? 9 : 5
    g.beginPath()
    g.moveTo(Math.round(x) + 0.5, h)
    g.lineTo(Math.round(x) + 0.5, h - len)
    g.stroke()
    if (isLabel) g.fillText(label >= 1 ? `${Math.round(((a % 360) + 360) % 360)}°` : formatBearing(a).slice(3), x, h - 18)
  }
  marks.forEach(m => {
    const x = w / 2 + wrap(m - view.yaw) * pxPerDeg
    if (x < -6 || x > w + 6) return
    g.fillStyle = '#ffe9b8'
    g.beginPath()
    g.moveTo(x, 2); g.lineTo(x + 4, 6); g.lineTo(x, 10); g.lineTo(x - 4, 6)
    g.fill()
  })
  g.strokeStyle = '#d2452e'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(w / 2, 0)
  g.lineTo(w / 2, h)
  g.stroke()
}

function Sheet({ plotted, book, station, pending, onPick, road, reveal, labelScale, freshRay, freshFix, crewsReady }) {
  const { x0, z0, size } = SHEET
  const contourData = useMemo(() => (reveal ? contours(10) : null), [reveal])
  const fs = 11 * labelScale
  const sw = labelScale
  const rays = book.filter(o => plotted[o.from]).map(o => {
    const from = plotted[o.from]
    const to = plotted[o.target]
    const len = to ? Math.hypot(to.x - from.x, to.z - from.z) + 16 : 340
    const dx = Math.sin(o.az * DEG)
    const dz = -Math.cos(o.az * DEG)
    return { o, x1: from.x, z1: from.z, x2: from.x + dx * len, z2: from.z + dz * len, fixed: Boolean(to), lx: from.x + dx * 64, lz: from.z + dz * 64 }
  })
  const plannedRoad = plotted.saddle && plotted.farshiel
  return (
    <svg className="cs-sheet-svg" viewBox={`${x0} ${z0} ${size} ${size}`} role="img" aria-label="Plotting sheet: everything you have measured" data-testid="cairn-survey-sheet-svg">
      <defs>
        <pattern id="cs-grid" width="50" height="50" patternUnits="userSpaceOnUse" x={x0} y={z0}>
          <path d="M50 0H0V50" fill="none" stroke="rgba(47,63,122,0.14)" strokeWidth={sw * 0.8} />
        </pattern>
        <clipPath id="cs-clip"><rect x={x0 + 6} y={z0 + 6} width={size - 12} height={size - 12} /></clipPath>
      </defs>
      <rect x={x0} y={z0} width={size} height={size} className="cs-linen" />
      <rect x={x0} y={z0} width={size} height={size} fill="url(#cs-grid)" />
      <g clipPath="url(#cs-clip)">
        {contourData && contourData.map(c => (
          <path key={c.level} d={c.path} className={c.index ? 'cs-contour cs-contour-index' : 'cs-contour'} strokeWidth={sw * (c.index ? 1.1 : 0.6)} />
        ))}
        {!reveal && CAIRNS.filter(c => !plotted[c.id]).map(c => {
          const [ox, oz] = HEARSAY[c.index % HEARSAY.length]
          return (
            <g key={`h${c.id}`} className="cs-hearsay" transform={`translate(${c.x + ox} ${c.z + oz})`} aria-hidden="true">
              <path d={`M${-9 * sw} ${4 * sw}Q0 ${-12 * sw} ${9 * sw} ${4 * sw}`} strokeWidth={sw * 0.9} />
              <text y={fs * 1.3} textAnchor="middle" fontSize={fs * 0.82}>{c.name.toLowerCase()}?</text>
            </g>
          )
        })}
        {!reveal && book.length === 0 && (
          <text x={x0 + 18} y={z0 + size * 0.7} className="cs-hearsay-note" fontSize={fs * 0.9}><tspan>faint pencil: the vicar’s sketch,</tspan><tspan x={x0 + 18} dy={fs * 1.15}>from hearsay. trust none of it.</tspan></text>
        )}
        {rays.map(r => (
          <line key={r.o.id} x1={r.x1} y1={r.z1} x2={r.x2} y2={r.z2}
            className={`${r.fixed ? 'cs-ray cs-ray-fixed' : 'cs-ray'}${freshRay === r.o.id ? ' cs-ray-fresh' : ''}`}
            strokeWidth={sw * (r.fixed ? 0.9 : 0.8)} />
        ))}
        {rays.filter(r => !r.fixed).map(r => (
          <text key={`l${r.o.id}`} x={r.lx} y={r.lz} className="cs-ray-label" fontSize={fs * 0.82}>{CAIRN[r.o.target].name.toLowerCase()}?</text>
        ))}
        <line x1={CAIRN.kirk.x} y1={CAIRN.kirk.z} x2={CAIRN.mill.x} y2={CAIRN.mill.z} className="cs-baseline" strokeWidth={sw * 2.6} />
        <text x={(CAIRN.kirk.x + CAIRN.mill.x) / 2} y={(CAIRN.kirk.z + CAIRN.mill.z) / 2 + fs * 1.25} className="cs-small" fontSize={fs * 0.8} textAnchor="middle">baseline {metres(BASELINE)} by chain</text>
        {plannedRoad && !reveal && (
          <polyline points={`${VILLAGE.x},${VILLAGE.z} ${plotted.saddle.x},${plotted.saddle.z} ${plotted.farshiel.x},${plotted.farshiel.z}`} className="cs-road-plan" strokeWidth={sw * 1.6} />
        )}
        {reveal && road && (
          <polyline points={road.path.slice(0, road.stopAt + 1).map(p => `${p.x.toFixed(1)},${p.z.toFixed(1)}`).join(' ')} className="cs-road-cut" strokeWidth={sw * 2.4} />
        )}
        {reveal && road && road.outcome === 'stalled' && (
          <circle cx={road.path[road.stopAt].x} cy={road.path[road.stopAt].z} r={sw * 7} className="cs-stall" strokeWidth={sw * 1.6} />
        )}
        {reveal && CAIRNS.filter(c => plotted[c.id] && !c.known).map(c => (
          <g key={`t${c.id}`} className="cs-truth">
            <line x1={plotted[c.id].x} y1={plotted[c.id].z} x2={c.x} y2={c.z} strokeWidth={sw * 1.2} />
            <path d={`M${c.x - 3 * sw} ${c.z - 3 * sw}L${c.x + 3 * sw} ${c.z + 3 * sw}M${c.x + 3 * sw} ${c.z - 3 * sw}L${c.x - 3 * sw} ${c.z + 3 * sw}`} strokeWidth={sw * 1.2} />
          </g>
        ))}
        {reveal && CAIRNS.filter(c => !plotted[c.id]).map(c => (
          <g key={`u${c.id}`} className="cs-unsurveyed">
            <path d={`M${c.x - 3 * sw} ${c.z - 3 * sw}L${c.x + 3 * sw} ${c.z + 3 * sw}M${c.x + 3 * sw} ${c.z - 3 * sw}L${c.x - 3 * sw} ${c.z + 3 * sw}`} strokeWidth={sw} />
            <text x={c.x} y={c.z - fs * 0.6} fontSize={fs * 0.8} textAnchor="middle">{c.name.toLowerCase()}</text>
          </g>
        ))}
        <g className="cs-village">
          <rect x={VILLAGE.x - 5} y={VILLAGE.z - 3} width={10} height={6} strokeWidth={sw} />
          <text x={VILLAGE.x - 8} y={VILLAGE.z + 3} fontSize={fs * 0.8} textAnchor="end">village</text>
        </g>
        {Object.entries(plotted).map(([id, p]) => {
          const c = CAIRN[id]
          const here = id === station
          const walkable = !here && !reveal
          const picked = pending === id
          const side = LABEL_SIDE[id] === 'below' ? { x: 0, y: fs * 1.55, anchor: 'middle' }
            : LABEL_SIDE[id] === 'left' ? { x: -8 * sw, y: -4 * sw, anchor: 'end' }
              : { x: 8 * sw, y: -4 * sw, anchor: 'start' }
          return (
            <g key={id} className={`cs-node${here ? ' cs-node-here' : ''}${picked ? ' cs-node-picked' : ''}${freshFix === id ? ' cs-node-fresh' : ''}`}
              transform={`translate(${p.x} ${p.z})`}
              role={walkable ? 'button' : undefined}
              tabIndex={walkable ? 0 : undefined}
              aria-label={walkable ? `Walk to ${c.name}, ${travelDays(station, id)} days` : undefined}
              onClick={walkable ? () => onPick(id) : undefined}
              onKeyDown={walkable ? e => { if (e.key === 'Enter') { e.stopPropagation(); onPick(id) } } : undefined}
              data-playground-action={walkable ? 'pick-station' : undefined}
              data-testid={`sheet-node-${id}`}>
              {p.ellipse && (
                <ellipse rx={Math.max(p.ellipse.rx, 1.2 * sw)} ry={Math.max(p.ellipse.rz, 1.2 * sw)} transform={`rotate(${p.ellipse.angle})`} className="cs-ellipse" strokeWidth={sw * 0.6} />
              )}
              {walkable && <circle r={22 * labelScale} className="cs-hit" />}
              <path d={`M0 ${-6 * sw}L${5.2 * sw} ${3 * sw}L${-5.2 * sw} ${3 * sw}Z`} className="cs-tri" strokeWidth={sw * 1.2} />
              <circle r={sw * 1.1} className="cs-dot" />
              <text x={side.x} y={side.y} textAnchor={side.anchor} fontSize={fs} className="cs-name">{c.name}</text>
              {!p.known && <text x={side.x} y={side.y + fs * 1.0} textAnchor={side.anchor} fontSize={fs * 0.78} className="cs-small">{Math.round(p.h * 10)} m</text>}
            </g>
          )
        })}
      </g>
      <g className="cs-cartouche" transform={`translate(${x0 + size - 12} ${z0 + size - 14})`}>
        <text textAnchor="end" fontSize={fs * 1.05} className="cs-cart-title">THE HOLLOW CROWN</text>
        <text textAnchor="end" y={fs * 1.1} fontSize={fs * 0.72} className="cs-small">{crewsReady ? 'ready for the road crews' : 'sheet i · plotted in the field'}</text>
      </g>
      <g transform={`translate(${x0 + 22} ${z0 + 28})`} className="cs-north">
        <path d={`M0 ${-14 * sw}L${5 * sw} ${4 * sw}L0 0L${-5 * sw} ${4 * sw}Z`} strokeWidth={sw} />
        <text y={14 * sw} textAnchor="middle" fontSize={fs * 0.9}>N</text>
      </g>
      <g transform={`translate(${x0 + 14} ${z0 + size - 16})`} className="cs-scale">
        <path d={`M0 0H100M0 -3V3M50 -3V3M100 -3V3`} strokeWidth={sw} />
        <text x={50} y={-6 * sw} textAnchor="middle" fontSize={fs * 0.72}>1 km</text>
      </g>
    </svg>
  )
}

const CairnSurvey = () => {
  const reduced = useReducedMotion()
  const canvasRef = useRef(null)
  const viewRef = useRef(null)
  const tapeRef = useRef(null)
  const readoutRef = useRef(null)
  const sheetRef = useRef(null)
  const sceneRef = useRef(null)
  const audioRef = useRef(null)
  const look = useRef({ yaw: 8, pitch: 9, fov: 60, zoom: 0 })
  const held = useRef(new Set())
  const drag = useRef({ pointers: new Map(), pinch: 0 })
  const targetKey = useRef('')
  const stateRef = useRef({})

  const [phase, setPhase] = useState('intro')
  const [season, setSeason] = useState(1)
  const [day, setDay] = useState(1)
  const [station, setStation] = useState('kirk')
  const [readings, setReadings] = useState(READINGS_PER_DAY)
  const [book, setBook] = useState([])
  const [log, setLog] = useState([])
  const [pending, setPending] = useState(null)
  const [road, setRoad] = useState(null)
  const [target, setTarget] = useState(null)
  const [muted, setMuted] = useState(false)
  const [tab, setTab] = useState('sheet')
  const [zoom, setZoom] = useState(0)
  const [labelScale, setLabelScale] = useState(1)
  const [freshRay, setFreshRay] = useState(null)
  const [freshFix, setFreshFix] = useState(null)
  const [pulse, setPulse] = useState(0)
  const [journey, setJourney] = useState(null)

  const schedule = useMemo(() => weatherSchedule(season * 7919 + 3), [season])
  const weatherId = schedule[Math.min(day, schedule.length) - 1]
  const weather = WEATHER[weatherId]
  const plotted = useMemo(() => adjustNetwork(book), [book])
  const visibleIds = useMemo(() => CAIRNS.filter(c => c.id !== station && canSee(station, c.id, weatherId)).map(c => c.id), [station, weatherId])
  const fixedCount = Object.values(plotted).filter(p => !p.known).length
  const crewsReady = Boolean(plotted.saddle && plotted.farshiel)
  const rand = useMemo(() => mulberry32(season * 104729 + 11), [season])

  stateRef.current = { phase, station, visibleIds, readings, weather, day }

  const note = useCallback((text, tone = 'note', dayStamp) => {
    setLog(prev => [{ id: `${Date.now()}-${Math.random()}`, text, tone, day: dayStamp }, ...prev].slice(0, 60))
  }, [])

  // Scene lifetime.
  useEffect(() => {
    const scene = createSurveyScene(canvasRef.current, { reduced })
    sceneRef.current = scene
    const el = viewRef.current
    const ro = new ResizeObserver(() => scene.resize(el.clientWidth, el.clientHeight))
    ro.observe(el)
    scene.resize(el.clientWidth, el.clientHeight)
    let raf = 0
    let last = performance.now()
    const loop = t => {
      const dt = Math.min((t - last) / 1000, 0.1)
      last = t
      const v = look.current
      const s = stateRef.current
      const goal = POWERS[v.zoom].fov
      v.fov = reduced ? goal : v.fov + (goal - v.fov) * Math.min(dt * 9, 1)
      if (Math.abs(v.fov - goal) < 0.01) v.fov = goal
      const keys = held.current
      if (keys.size) {
        const rate = v.fov * (keys.has('fine') ? 0.08 : 0.55) * dt
        const before = v.yaw
        if (keys.has('left')) v.yaw -= rate
        if (keys.has('right')) v.yaw += rate
        if (keys.has('up')) v.pitch += rate
        if (keys.has('down')) v.pitch -= rate
        if (Math.floor(before / (v.fov / 30)) !== Math.floor(v.yaw / (v.fov / 30))) audioRef.current?.tick()
      }
      if (s.phase === 'intro' && !reduced) v.yaw = 8 + Math.sin(t / 5200) * 5
      v.yaw = ((v.yaw % 360) + 360) % 360
      v.pitch = Math.max(-70, Math.min(60, v.pitch))
      scene.setView(v)
      scene.render(t)

      // What sits in the wire.
      let best = null
      const ring = ringDegrees(v.fov)
      for (const id of s.visibleIds) {
        const sight = trueSight(s.station, id)
        const off = Math.hypot(wrap(sight.az - v.yaw) * Math.cos(sight.el * DEG), sight.el - v.pitch)
        if (off <= ring && (!best || off < best.off)) best = { id, off }
      }
      const readable = Boolean(best) && v.fov <= READABLE_FOV
      const key = best ? `${best.id}:${readable}` : ''
      if (key !== targetKey.current) {
        targetKey.current = key
        setTarget(best ? { id: best.id, readable } : null)
      }
      if (readoutRef.current) readoutRef.current.textContent = `AZ ${formatBearing(v.yaw)}   ALT ${v.pitch >= 0 ? '+' : '−'}${formatBearing(Math.abs(v.pitch)).replace(/^0+(?=\d)/, '')}   ×${POWERS[v.zoom].power}`
      if (tapeRef.current) drawTape(tapeRef.current, v, s.phase === 'ending' ? [] : s.visibleIds.map(id => trueSight(s.station, id).az))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      scene.dispose()
      sceneRef.current = null
    }
  }, [reduced])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.setStation(station)
    scene.setWeather(weatherId)
    scene.setVisible(visibleIds)
    audioRef.current?.weather(weatherId)
  }, [station, weatherId, visibleIds, reduced])

  useEffect(() => () => audioRef.current?.dispose(), [])

  useEffect(() => {
    const el = sheetRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth || 400
      setLabelScale(Math.max(0.8, Math.min(1.6, SHEET.size / w)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const setZoomLevel = useCallback(next => {
    const z = Math.max(0, Math.min(POWERS.length - 1, next))
    if (z === look.current.zoom) return
    audioRef.current?.zoom(z > look.current.zoom)
    look.current.zoom = z
    setZoom(z)
  }, [])

  const start = useCallback(() => {
    if (!audioRef.current) audioRef.current = createSurveyAudio()
    audioRef.current?.resume()
    audioRef.current?.setMuted(muted)
    audioRef.current?.weather(weatherId)
    look.current.yaw = 8
    look.current.pitch = 9
    setPhase('survey')
    note('Day 1. Kirk Base. The baseline to Mill Base is chained and true. Everything else is rumour until two lines cross on it.', 'day', 1)
  }, [muted, note, weatherId])

  const read = useCallback(() => {
    if (phase !== 'survey') return
    const audio = audioRef.current
    if (!weather.readable) { audio?.refuse(); note('Rain on the tops. No mirror can catch the sun today; close the book.', 'warn', day); return }
    if (readings <= 0) { audio?.refuse(); note('The sun is off the mirrors. Close the book for today.', 'warn', day); return }
    if (!target) { audio?.refuse(); note('Nothing in the wire. Bring a glint inside the ring.', 'warn', day); return }
    if (!target.readable) { audio?.refuse(); note('A glint, but too far to read its flag. Raise the power to at least ×2.5.', 'warn', day); return }
    const v = look.current
    const sigmaDeg = (weather.sigma + 0.00012) / DEG
    const obs = {
      id: `${day}-${station}-${target.id}-${book.length}`,
      day, from: station, target: target.id,
      az: (v.yaw + instrumentNoise(rand, sigmaDeg) + 360) % 360,
      elev: v.pitch + instrumentNoise(rand, sigmaDeg),
      power: POWERS[v.zoom].power
    }
    const replaced = book.some(o => o.from === station && o.target === target.id)
    const nextBook = book.filter(o => !(o.from === station && o.target === target.id)).concat(obs)
    const before = plotted
    const after = adjustNetwork(nextBook)
    setBook(nextBook)
    setReadings(r => r - 1)
    setFreshRay(obs.id)
    setTimeout(() => setFreshRay(f => (f === obs.id ? null : f)), 2000)
    setPulse(p => p + 1)
    const c = CAIRN[target.id]
    audio?.read(c.index)
    note(`${CAIRN[station].name} → ${c.name}  ${formatBearing(obs.az)}  ×${obs.power}${replaced ? '  (re-read)' : ''}`, 'reading', day)
    if (before[target.id]) {
      const m = misclosure(before, obs)
      if (m !== null) note(`Check on ${c.name}: the sheet and the ground disagree by ${metres(m)}.`, m > 4 ? 'warn' : 'check', day)
    }
    if (!before[target.id] && after[target.id]) {
      setFreshFix(target.id)
      setTimeout(() => setFreshFix(f => (f === target.id ? null : f)), 2000)
      setTimeout(() => audio?.fix(c.index), 260)
      note(`${c.name} is on the sheet: ${after[target.id].rays.length} lines crossing at ${Math.round(after[target.id].cut)}°. You can walk there now.`, 'fix', day)
    } else if (!after[target.id]) {
      const stations = new Set(nextBook.filter(o => o.target === target.id).map(o => o.from))
      if (stations.size >= 2) note(`The lines on ${c.name} cross too shallow to trust. Sight it from somewhere wider apart.`, 'warn', day)
    }
  }, [phase, weather, readings, target, day, station, book, plotted, rand, note])

  const finish = useCallback(reason => {
    const result = cutRoad(plotted)
    setRoad(result)
    setPhase('ending')
    setFreshRay(null)
    setFreshFix(null)
    setPending(null)
    sceneRef.current?.setAerial(true)
    sceneRef.current?.showRoad(result)
    audioRef.current?.ending(result && result.outcome === 'crown')
    note(reason === 'crews' ? `Day ${DAYS}. The road crews arrive at the kirk and take whatever sheet you have.` : 'You send the sheet down to the kirk. The crews cut the road from it.', 'day', day)
  }, [plotted, note, day])

  const endDay = useCallback(() => {
    if (phase !== 'survey') return
    if (day >= DAYS) { finish('crews'); return }
    const next = day + 1
    setDay(next)
    setReadings(READINGS_PER_DAY)
    setPending(null)
    const w = WEATHER[schedule[next - 1]]
    note(`Day ${next}. ${w.name[0].toUpperCase() + w.name.slice(1)}: ${w.note}.`, 'day', next)
  }, [phase, day, schedule, note, finish])

  const walk = useCallback(id => {
    if (phase !== 'survey' || !plotted[id] || id === station) return
    const cost = travelDays(station, id)
    if (day + cost > DAYS) { audioRef.current?.refuse(); note(`${CAIRN[id].name} is ${cost} days away. The crews arrive first.`, 'warn', day); setPending(null); return }
    const next = day + cost
    const w = WEATHER[schedule[next - 1]]
    audioRef.current?.walk()
    setJourney({ key: `${id}-${next}`, from: CAIRN[station].name, to: CAIRN[id].name, cost, next })
    setStation(id)
    setDay(next)
    setReadings(READINGS_PER_DAY)
    setPending(null)
    const toward = trueSight(id, id === 'saddle' ? 'farshiel' : 'saddle')
    look.current.yaw = toward.az + (id === 'saddle' ? 0 : 6)
    look.current.pitch = Math.max(-30, Math.min(12, toward.el * 0.7 + 2))
    look.current.zoom = 0
    setZoom(0)
    note(`Day ${next}. Walked ${cost} day${cost > 1 ? 's' : ''} to ${CAIRN[id].name}. ${w.name[0].toUpperCase() + w.name.slice(1)}: ${w.note}.`, 'day', next)
  }, [phase, plotted, station, day, schedule, note])

  const restart = useCallback(() => {
    sceneRef.current?.setAerial(false)
    sceneRef.current?.showRoad(null)
    setSeason(s => s + 1)
    setDay(1)
    setStation('kirk')
    setReadings(READINGS_PER_DAY)
    setBook([])
    setLog([])
    setRoad(null)
    setPending(null)
    setFreshFix(null)
    setFreshRay(null)
    look.current = { yaw: 8, pitch: 9, fov: 60, zoom: 0 }
    setZoom(0)
    setPhase('survey')
    note('A new season. The old sheet is in the vestry drawer; this one starts from the baseline again.', 'day', 1)
  }, [note])

  const toggleMute = useCallback(() => {
    setMuted(m => {
      audioRef.current?.setMuted(!m)
      return !m
    })
  }, [])

  // Keyboard: arrows slew (shift for fine), +/- power, space reads.
  useEffect(() => {
    const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' }
    const down = e => {
      if (e.target.closest && e.target.closest('input, textarea')) return
      if (e.key === 'Shift') held.current.add('fine')
      const dir = map[e.key]
      if (dir && phase !== 'ending') { held.current.add(dir); e.preventDefault(); return }
      if (e.key === ' ' || e.key === 'r' || e.key === 'R') {
        if (phase === 'intro') start()
        else read()
        e.preventDefault()
      } else if (e.key === '+' || e.key === '=') setZoomLevel(look.current.zoom + 1)
      else if (e.key === '-' || e.key === '_') setZoomLevel(look.current.zoom - 1)
      else if (e.key === 'e' || e.key === 'E') endDay()
      else if (e.key === 'm' || e.key === 'M') toggleMute()
      else if (e.key === 'Escape') setPending(null)
      else if (e.key === 'Enter' && pending && !e.target.closest?.('button, [role="button"]')) walk(pending)
      else if (/^[1-9]$/.test(e.key) && phase === 'survey') {
        const options = Object.keys(plotted).filter(id => id !== station)
        const id = options[Number(e.key) - 1]
        if (id) setPending(id)
      }
    }
    const up = e => {
      if (e.key === 'Shift') held.current.delete('fine')
      const dir = map[e.key]
      if (dir) held.current.delete(dir)
    }
    const blur = () => held.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [phase, start, read, endDay, toggleMute, setZoomLevel, pending, walk, plotted, station])

  // Pointer: drag the land past the wire, pinch or wheel for power.
  const onPointerDown = e => {
    if (phase === 'ending' || e.target.closest('button, a')) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (drag.current.pointers.size === 2) {
      const [a, b] = [...drag.current.pointers.values()]
      drag.current.pinch = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }
  const onPointerMove = e => {
    const p = drag.current.pointers.get(e.pointerId)
    if (!p) return
    const v = look.current
    if (drag.current.pointers.size === 2) {
      p.x = e.clientX
      p.y = e.clientY
      const [a, b] = [...drag.current.pointers.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (d > drag.current.pinch * 1.35) { setZoomLevel(v.zoom + 1); drag.current.pinch = d }
      else if (d < drag.current.pinch * 0.74) { setZoomLevel(v.zoom - 1); drag.current.pinch = d }
      return
    }
    const degPerPx = v.fov / Math.max(viewRef.current.clientHeight, 1)
    const before = v.yaw
    v.yaw -= (e.clientX - p.x) * degPerPx
    v.pitch += (e.clientY - p.y) * degPerPx
    p.x = e.clientX
    p.y = e.clientY
    if (Math.floor(before / (v.fov / 30)) !== Math.floor(v.yaw / (v.fov / 30))) audioRef.current?.tick()
  }
  const onPointerUp = e => {
    drag.current.pointers.delete(e.pointerId)
  }
  useEffect(() => {
    const el = viewRef.current
    let acc = 0
    const wheel = e => {
      if (phase === 'ending') return
      e.preventDefault()
      acc += e.deltaY
      if (Math.abs(acc) > 60) { setZoomLevel(look.current.zoom + (acc < 0 ? 1 : -1)); acc = 0 }
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [phase, setZoomLevel])

  const hold = dir => ({
    onPointerDown: e => { e.preventDefault(); e.stopPropagation(); held.current.add(dir) },
    onPointerUp: () => held.current.delete(dir),
    onPointerLeave: () => held.current.delete(dir),
    onPointerCancel: () => held.current.delete(dir)
  })

  const targetCairn = target && CAIRN[target.id]
  const readHint = !weather.readable ? 'rain: no readings today'
    : readings <= 0 ? 'sun off the mirrors'
      : !target ? 'bring a glint inside the ring'
        : !target.readable ? 'raise the power to read its flag'
          : `read ${targetCairn.name}`
  const pickOptions = Object.keys(plotted).filter(id => id !== station)
  const stats = useMemo(() => {
    const errors = CAIRNS.filter(c => !c.known && plotted[c.id]).map(c => ({ c, e: trueError(plotted, c.id) }))
    const mean = errors.length ? errors.reduce((s, x) => s + x.e, 0) / errors.length : 0
    const worst = errors.reduce((w, x) => (!w || x.e > w.e ? x : w), null)
    return { mean, worst, count: errors.length }
  }, [plotted])
  const verdict = road ? VERDICTS[road.outcome] : VERDICTS.none

  return (
    <div className={`cs-root cs-weather-${weatherId} cs-phase-${phase}${reduced ? ' cs-reduced' : ''}`} data-testid="cairn-survey">
      <section
        className="cs-view"
        ref={viewRef}
        data-playground-surface
        data-testid="cairn-survey-surface"
        aria-label="Theodolite view. Drag or use arrow keys to slew, plus and minus for power, space to read."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <canvas ref={canvasRef} className="cs-canvas" />
        <div className="cs-vignette" aria-hidden="true" />
        <header className="cs-top">
          <Link to="/playground/physics" className="cs-back" aria-label="Back to void physics">←</Link>
          <div className="cs-title">
            <strong>cairn.survey()</strong>
            <span>{phase === 'ending' ? 'the road is cut' : `${CAIRN[station].name} · ${weather.name}`}</span>
          </div>
          <div className="cs-day" aria-label={`Day ${day} of ${DAYS}`}>
            <span className="cs-day-n">{String(day).padStart(2, '0')}</span>
            <span className="cs-day-of">/ {DAYS} days</span>
          </div>
          <div className="cs-pips" aria-label={`${readings} readings left today`}>
            {Array.from({ length: READINGS_PER_DAY }, (_, i) => <i key={i} className={i < readings ? 'on' : ''} />)}
          </div>
          <button type="button" className="cs-icon" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={muted} data-testid="cs-mute">{muted ? '♪̸' : '♪'}</button>
        </header>

        {phase !== 'ending' && (
          <div className="cs-reticle" aria-hidden="true">
            <svg viewBox="-100 -100 200 200" className={`cs-reticle-svg${target ? ' cs-locked' : ''}`} key={pulse}>
              <circle r="90" className="cs-ring" />
              <path d="M-100 0H-22M22 0H100M0 -100V-22M0 22V100" className="cs-wire" />
              <path d="M-8 -45H8M-8 45H8" className="cs-stadia" />
            </svg>
          </div>
        )}
        {journey && !reduced && phase === 'survey' && (
          <div className="cs-journey" key={journey.key} aria-hidden="true" onAnimationEnd={() => setJourney(null)}>
            <span>{journey.from}</span>
            <b>{'· '.repeat(journey.cost * 3).trim()}</b>
            <span>{journey.to}</span>
            <em>day {journey.next}</em>
          </div>
        )}
        {phase === 'survey' && (
          <div className={`cs-target${target ? ' on' : ''}`} aria-live="polite" data-testid="cs-target">
            {target ? (target.readable
              ? <><b>{targetCairn.name}</b><span>signal {codeText(targetCairn.code)}{plotted[target.id] ? ' · on the sheet' : ''}</span></>
              : <><b>a glint</b><span>{codeText(targetCairn.code)} · flag too small at ×{POWERS[zoom].power}</span></>) : null}
          </div>
        )}

        {phase !== 'ending' && (
          <div className="cs-instrument">
            <canvas ref={tapeRef} className="cs-tape" aria-hidden="true" />
            <div className="cs-readout" ref={readoutRef} aria-hidden="true" />
            <div className="cs-controls">
              <button type="button" className="cs-btn" aria-label="Slew left" {...hold('left')} data-playground-action="slew-left">◀</button>
              <button type="button" className="cs-btn" aria-label="Slew right" {...hold('right')} data-playground-action="slew-right">▶</button>
              <button type="button" className="cs-btn" onClick={() => setZoomLevel(zoom - 1)} disabled={zoom === 0} aria-label="Lower power" data-playground-action="zoom-out">−</button>
              <button type="button" className="cs-btn" onClick={() => setZoomLevel(zoom + 1)} disabled={zoom === POWERS.length - 1} aria-label="Raise power" data-playground-action="zoom-in" data-testid="cs-zoom-in">+</button>
              <button type="button" className={`cs-read${target?.readable && readings > 0 && weather.readable ? ' ready' : ''}`} onClick={read} disabled={phase !== 'survey'} data-playground-action="read" data-testid="cs-read">
                <span>Read</span><small>{readHint}</small>
              </button>
              <button type="button" className="cs-btn cs-end" onClick={endDay} disabled={phase !== 'survey'} aria-label="Close the book for today" data-playground-action="end-day" data-testid="cs-end-day">☾<small>E</small></button>
            </div>
          </div>
        )}

        {phase === 'ending' && (
          <div className={`cs-verdict cs-verdict-${verdict.tone}`} data-testid="cs-verdict">
            <p className="cs-kicker">the crews cut from your sheet</p>
            <h2>{verdict.title}</h2>
            <p>{verdictText(road)}</p>
            <dl>
              <div><dt>hills on paper</dt><dd>{stats.count} / {CAIRNS.length - 2}</dd></div>
              <div><dt>mean error</dt><dd>{metres(stats.mean)}</dd></div>
              <div><dt>worst</dt><dd>{stats.worst ? `${stats.worst.c.name} ${metres(stats.worst.e)}` : '—'}</dd></div>
              <div><dt>readings</dt><dd>{book.length}</dd></div>
            </dl>
            <button type="button" className="cs-primary" onClick={restart} data-playground-action="restart" data-testid="cs-restart">Survey another season</button>
          </div>
        )}
      </section>

      <section className="cs-desk" aria-label="Plotting desk">
        <div className="cs-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'sheet'} onClick={() => setTab('sheet')} data-testid="cs-tab-sheet">Sheet</button>
          <button type="button" role="tab" aria-selected={tab === 'book'} onClick={() => setTab('book')} data-testid="cs-tab-book">Field book</button>
        </div>
        <div className={`cs-sheet${tab === 'sheet' ? ' cs-show' : ''}`} ref={sheetRef} data-testid="cairn-survey-sheet">
          <Sheet plotted={plotted} book={book} station={station} pending={pending} onPick={setPending} road={road}
            reveal={phase === 'ending'} labelScale={labelScale} freshRay={reduced ? null : freshRay} freshFix={reduced ? null : freshFix} crewsReady={crewsReady} />
          {pending && phase === 'survey' && (
            <div className="cs-walk" data-testid="cs-walk">
              <span>Walk to <b>{CAIRN[pending].name}</b>? <em>{travelDays(station, pending)} day{travelDays(station, pending) > 1 ? 's' : ''}, arriving day {day + travelDays(station, pending)}</em></span>
              <button type="button" className="cs-go" onClick={() => walk(pending)} data-playground-action="walk" data-testid="cs-walk-go">Walk</button>
              <button type="button" className="cs-cancel" onClick={() => setPending(null)}>Stay</button>
            </div>
          )}
        </div>
        <aside className={`cs-book${tab === 'book' ? ' cs-show' : ''}`} data-testid="cs-book">
          {phase !== 'ending' && <div className="cs-stations">
            <h3>Stations on paper</h3>
            {pickOptions.length === 0 && <p className="cs-empty">Only the baseline. Read the same hill from both ends of it.</p>}
            <div className="cs-station-list">
              {pickOptions.map((id, i) => (
                <button type="button" key={id} className={pending === id ? 'picked' : ''} onClick={() => setPending(id)} disabled={phase !== 'survey'} data-playground-action="pick-station">
                  <kbd>{i + 1}</kbd>{CAIRN[id].name}<small>{travelDays(station, id)}d</small>
                </button>
              ))}
            </div>
            <button type="button" className="cs-send" onClick={() => finish('sent')} disabled={!crewsReady || phase !== 'survey'} data-playground-action="send-sheet" data-testid="cs-send">
              {crewsReady ? 'Send the sheet to the crews' : `Saddle ${plotted.saddle ? '✓' : '·'}  Far Shiel ${plotted.farshiel ? '✓' : '·'}`}
            </button>
            <p className="cs-progress">{fixedCount} of {CAIRNS.length - 2} hills fixed</p>
          </div>}
          <ol className="cs-log" aria-live="polite">
            {log.map(entry => (
              <li key={entry.id} className={`cs-log-${entry.tone}`}>
                {entry.day ? <span className="cs-log-day">d{entry.day}</span> : null}{entry.text}
              </li>
            ))}
          </ol>
        </aside>
      </section>
      {phase === 'intro' && (
        <div className="cs-intro" data-testid="cs-intro">
          <p className="cs-kicker">a survey in fog · twelve days</p>
          <h1>The Hollow Crown</h1>
          <p>The parish wants a road over the Crown to Far Shiel. Nobody in the valley has seen the pass. The crews will cut it from your sheet, and from nothing else.</p>
          <ul>
            <li>Assistants on the hills flash mirrors. Each flag has its own rhythm.</li>
            <li>Put a glint in the ring, raise the power, and read the circle. Two lines that cross make a hill.</li>
            <li>You can only walk to hills that are on paper, and the sheet only knows what you measured.</li>
          </ul>
          <button type="button" className="cs-primary" onClick={start} data-playground-primary data-testid="cs-start">Take up the theodolite</button>
          <p className="cs-keys">drag or arrows to slew · shift fine · + − power · space read · E close the book · 1–9 pick a station</p>
        </div>
      )}
    </div>
  )
}

export default CairnSurvey
