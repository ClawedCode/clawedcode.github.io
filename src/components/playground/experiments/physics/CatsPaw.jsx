import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ExperimentNav from '../../ExperimentNav'
import { DEG, wrap, currentAt, windAt, buildFactor } from './catspaw/wind'
import { tackOf, CLOSE } from './catspaw/boat'
import {
  RACES, PIN, COMMITTEE, COUNTDOWN, createRace, stepRace, raceClock, prerollAttract, completeRace, seriesTable, ordinal
} from './catspaw/race'
import { createScene } from './catspaw/scene'
import { createAudio } from './catspaw/audio'
import './CatsPaw.css'

const SERIES_KEY = 'cats-paw.series'
const KN = 1.944
const STEP = 1 / 60

const readSeries = () => {
  if (typeof localStorage === 'undefined') return [null, null, null]
  try {
    const raw = JSON.parse(localStorage.getItem(SERIES_KEY) || 'null')
    return Array.isArray(raw) && raw.length === 3 ? raw : [null, null, null]
  } catch {
    return [null, null, null]
  }
}
const writeSeries = s => {
  try { localStorage.setItem(SERIES_KEY, JSON.stringify(s)) } catch { /* private mode: the series still runs */ }
}

const fmtClock = c => {
  if (c < 0 && c > -1) c = 0
  const s = c < 0 ? Math.ceil(-c) : c
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${c < 0 ? '−' : ''}${m}:${String(r).padStart(2, '0')}`
}
const fmtTime = t => (t === null || t === undefined ? '—' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

const LEG_LABEL = {
  prestart: 'to the start line',
  beat: 'beat to the windward mark',
  run: 'run home to the finish',
  finished: 'finished'
}

function snapshot(race, view) {
  const b = race.boats[0]
  const clock = raceClock(race)
  const off = wrap(b.twd - b.mean) / DEG
  const tack = tackOf(b)
  const upwind = Math.abs(b.twa) < Math.PI / 2
  const headed = upwind ? (tack === 'starboard' ? -off : off) : 0
  const place = race.standings ? race.standings.indexOf(b) + 1 : 0
  const toMark = Math.hypot(b.x - race.mark.x, b.y - race.mark.y)
  const cur = currentAt(race.cfg, b.x)
  // what is coming down the course at you, sampled from the same field the water shows
  const base = race.cfg.speed * buildFactor(race.cfg, race.wind.t)
  let ahead = null
  if (!b.finished && b.leg !== 'run') {
    const tmp = { dir: 0, spd: 0, puff: 0 }
    for (let d = 12; d <= 82; d += 10) {
      windAt(race.wind, b.x + Math.sin(b.twd) * d, b.y + Math.cos(b.twd) * d, tmp)
      const r = tmp.spd / base
      if (r > 1.16) { ahead = { kind: 'puff', s: Math.max(1, Math.round(d / (base * 0.85))) }; break }
      if (r < 0.84 && d <= 46) { ahead = { kind: 'lull', s: Math.max(1, Math.round(d / (base * 0.85))) }; break }
    }
    const was = race.cueWas
    if (!ahead && b.puff > (was === 'in' ? 0.08 : 0.12)) ahead = { kind: 'in', s: 0 }
    if (!ahead && (b.puff < (was === 'hole' ? -0.07 : -0.1) || b.shadow > (was === 'hole' ? 0.07 : 0.1))) ahead = { kind: 'hole', s: 0 }
    race.cueWas = ahead?.kind
  }
  return {
    ahead,
    clock, view,
    leg: b.leg, ocs: b.ocs, finished: b.finished, capsized: b.capsized > 0,
    heading: ((b.h / DEG) % 360 + 360) % 360,
    tws: b.tws * KN, aws: b.aws * KN, speed: b.v * KN,
    twa: b.twa / DEG, tack, upwind, headed, puff: b.puff, shadow: b.shadow,
    heel: b.heel, hike: b.hike, sheet: b.sheet, crew: b.crew,
    luff: b.luff, stall: b.stall, eff: b.eff, boom: b.boom / DEG,
    penalty: b.penalty, place, fleet: race.boats.length,
    toMark, current: Math.hypot(cur.x, cur.y) * KN,
    flags: {
      cls: clock >= -COUNTDOWN && clock < 0,
      p: clock >= -30 && clock < -10,
      x: race.boats.some(o => o.ocs) && clock < 30
    },
    boats: race.boats.map(o => ({ x: o.x, y: o.y, h: o.h, you: o.you, fin: o.finished })),
    mean: b.mean,
    mark: race.mark,
    L: race.def.L,
    done: race.done
  }
}

// ---------------------------------------------------------------------------
// the debrief chart: your track over the race, coloured by how well it made way

function DebriefChart({ race }) {
  const you = race.boats[0]
  const pts = you.track.filter(s => s.leg !== 'prestart')
  const all = race.boats.flatMap(b => b.track.filter(s => s.leg !== 'prestart'))
  const xs = all.map(s => s.x).concat([PIN.x - 10, COMMITTEE.x + 10])
  const ys = all.map(s => s.y).concat([-20, race.def.L + 20])
  const minX = Math.max(-200, Math.min(...xs) - 8)
  const maxX = Math.min(200, Math.max(...xs) + 8)
  const minY = Math.max(-60, Math.min(...ys) - 8)
  const maxY = Math.min(race.def.L + 80, Math.max(...ys) + 8)
  const w = maxX - minX
  const h = maxY - minY
  const P = (x, y) => `${(x - minX).toFixed(1)},${(maxY - y).toFixed(1)}`
  const col = r => (r === null ? '#8a8270' : r < 0.6 ? '#c8352e' : r < 0.85 ? '#d99a2b' : '#2f7d68')
  const segs = []
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    if (Math.hypot(b.x - a.x, b.y - a.y) > 8) continue
    segs.push(<line key={i} x1={a.x - minX} y1={maxY - a.y} x2={b.x - minX} y2={maxY - b.y} stroke={col(b.r)} strokeWidth={Math.max(1.4, w / 120)} strokeLinecap="round" />)
  }
  const ev = you.events.filter(e => ['tack', 'gybe', 'capsize', 'foul', 'mark', 'ocs'].includes(e.type) && e.t !== undefined && e.leg !== 'prestart')
  const r = Math.max(2.2, w / 70)
  return (
    <svg className="cp-chart" viewBox={`0 0 ${w.toFixed(1)} ${h.toFixed(1)}`} role="img" aria-label="Chart of your track through the race" data-testid="cp-debrief-chart">
      <rect x="0" y="0" width={w} height={h} fill="var(--cp-chart)" />
      {[...Array(Math.ceil(w / 20) + 1)].map((_, i) => <line key={`gx${i}`} x1={i * 20} y1="0" x2={i * 20} y2={h} stroke="var(--cp-grid)" strokeWidth={w / 600} />)}
      {[...Array(Math.ceil(h / 20) + 1)].map((_, i) => <line key={`gy${i}`} x1="0" y1={i * 20} x2={w} y2={i * 20} stroke="var(--cp-grid)" strokeWidth={w / 600} />)}
      {race.boats.slice(1).map(b => (
        <polyline key={b.id} points={b.track.filter(s => s.leg !== 'prestart').map(s => P(s.x, s.y)).join(' ')} fill="none" stroke="var(--cp-ink)" strokeOpacity="0.16" strokeWidth={w / 260} />
      ))}
      <line x1={PIN.x - minX} y1={maxY} x2={COMMITTEE.x - minX} y2={maxY} stroke="var(--cp-ink)" strokeDasharray={`${w / 80} ${w / 120}`} strokeWidth={w / 300} />
      <circle cx={race.mark.x - minX} cy={maxY - race.mark.y} r={r * 1.1} fill="#e8792b" stroke="var(--cp-ink)" strokeWidth={w / 500} />
      <circle cx={PIN.x - minX} cy={maxY} r={r * 0.8} fill="#e8792b" />
      <rect x={COMMITTEE.x - minX} y={maxY - r} width={r * 3} height={r * 2} fill="#c8352e" />
      {segs}
      {ev.map((e, i) => {
        const cx = e.x - minX
        const cy = maxY - e.y
        if (e.type === 'tack' && e.leg === 'beat') {
          const good = e.headed > 4
          const bad = e.headed < -4
          return <circle key={i} cx={cx} cy={cy} r={r} fill={good ? '#2f7d68' : bad ? '#c8352e' : 'var(--cp-paper)'} stroke="var(--cp-ink)" strokeWidth={w / 500}><title>{good ? `tacked on a ${e.headed.toFixed(0)}° header` : bad ? `tacked on a ${(-e.headed).toFixed(0)}° lift` : 'tacked in steady wind'}</title></circle>
        }
        if (e.type === 'tack') return <circle key={i} cx={cx} cy={cy} r={r * 0.7} fill="var(--cp-paper)" stroke="var(--cp-ink)" strokeWidth={w / 500}><title>tack</title></circle>
        if (e.type === 'gybe') return <rect key={i} x={cx - r * 0.7} y={cy - r * 0.7} width={r * 1.4} height={r * 1.4} fill="var(--cp-paper)" stroke="var(--cp-ink)" strokeWidth={w / 500}><title>gybe</title></rect>
        const what = { capsize: 'capsized', foul: `fouled ${e.other || 'a boat'}`, mark: 'touched the mark', ocs: 'over the line at the gun' }[e.type]
        return <text key={i} x={cx} y={cy + r} fontSize={r * 3} textAnchor="middle" fill="#c8352e" fontWeight="700">{e.type === 'capsize' ? '×' : '!'}<title>{what}</title></text>
      })}
    </svg>
  )
}

function WindStrip({ race }) {
  const log = race.windLog.filter(s => s.t >= 0)
  if (log.length < 4) return null
  const T = log[log.length - 1].t
  const W = 300
  const H = 56
  const y = d => H / 2 - clamp(d, -18, 18) * (H / 40)
  const pts = log.map(s => `${((s.t / T) * W).toFixed(1)},${y(wrap(s.dir - s.mean) / DEG).toFixed(1)}`).join(' ')
  const tacks = race.boats[0].events.filter(e => e.type === 'tack' && e.leg === 'beat' && e.t > 0)
  return (
    <svg className="cp-strip" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Wind direction over the race, with your tacks" data-testid="cp-wind-strip">
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--cp-grid)" />
      <text x="3" y="10" className="cp-strip-l">veer →</text>
      <text x="3" y={H - 3} className="cp-strip-l">← back</text>
      <polyline points={pts} fill="none" stroke="var(--cp-ink)" strokeWidth="1.6" />
      {tacks.map((e, i) => (
        <line key={i} x1={(e.t / T) * W} x2={(e.t / T) * W} y1="4" y2={H - 4} stroke={e.headed > 4 ? '#2f7d68' : e.headed < -4 ? '#c8352e' : '#8a8270'} strokeWidth="2" />
      ))}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// instruments

function Compass({ hud }) {
  const h = Math.round(hud.headed)
  const k = clamp(hud.headed, -15, 15)
  const label = !hud.upwind ? (hud.leg === 'run' ? 'running' : 'reaching') : Math.abs(h) < 3 ? 'on the mean' : h > 0 ? `headed ${h}°` : `lifted ${-h}°`
  return (
    <div className="cp-compass" data-testid="cp-compass" aria-label={`Heading ${Math.round(hud.heading)} degrees, ${label}`}>
      <div className="cp-compass-head"><span className="cp-big">{String(Math.round(hud.heading) % 360).padStart(3, '0')}°</span><span className={`cp-tack is-${hud.tack}`}>{hud.tack}</span></div>
      <div className={`cp-shift ${hud.upwind ? '' : 'is-off'}`}>
        <span className="cp-shift-l">lift</span>
        <span className="cp-shift-bar"><span className="cp-shift-mid" /><span className={`cp-shift-dot ${h > 3 ? 'is-head' : h < -3 ? 'is-lift' : ''}`} style={{ left: `${50 + (k / 15) * 46}%` }} /></span>
        <span className="cp-shift-l">header</span>
      </div>
      <div className="cp-shift-word" data-testid="cp-shift-word">{label}</div>
      <div className={`cp-ahead ${hud.ahead ? `is-${hud.ahead.kind}` : ''}`} data-testid="cp-ahead">
        {!hud.ahead ? 'steady upwind'
          : hud.ahead.kind === 'puff' ? `puff in ~${hud.ahead.s} s`
            : hud.ahead.kind === 'lull' ? `lull in ~${hud.ahead.s} s`
              : hud.ahead.kind === 'in' ? 'in a puff: use it'
                : hud.shadow > 0.1 ? 'in wind shadow' : 'in a hole'}
      </div>
      <div className="cp-nums">
        <span><b>{hud.speed.toFixed(1)}</b> kn</span>
        <span>wind <b>{hud.tws.toFixed(1)}</b></span>
        {hud.current > 0.2 && <span>tide <b>{hud.current.toFixed(1)}</b></span>}
      </div>
    </div>
  )
}

function Telltales({ hud }) {
  const state = hud.capsized ? 'in the water' : hud.luff > 0.25 ? 'luffing: sheet in' : hud.stall > 0.3 ? 'stalled: ease out' : 'drawing'
  return (
    <div className={`cp-tt ${hud.luff > 0.25 ? 'is-luff' : ''} ${hud.stall > 0.3 ? 'is-stall' : ''}`} aria-label={`Sail trim: ${state}`} data-testid="cp-telltales">
      <svg viewBox="0 0 80 40" aria-hidden="true">
        <path className="cp-tt-sail" d="M6 36 Q40 6 76 34" />
        <path className="cp-tt-w" d="M30 20 q8 -2 16 0" />
        <path className="cp-tt-l" d="M30 27 q8 2 16 0" />
      </svg>
      <span>{state}</span>
    </div>
  )
}

function Heel({ hud }) {
  const a = clamp(hud.heel, -30, 60)
  return (
    <div className={`cp-heel ${hud.heel > 36 ? 'is-hot' : ''}`} aria-label={`Heel ${Math.round(hud.heel)} degrees`} data-testid="cp-heel">
      <svg viewBox="0 0 80 46" aria-hidden="true">
        <path d="M8 40 A32 32 0 0 1 72 40" className="cp-heel-arc" />
        <path d="M58 16 A32 32 0 0 1 72 40" className="cp-heel-red" />
        <line x1="40" y1="40" x2={40 + Math.sin(a * DEG) * 28} y2={40 - Math.cos(a * DEG) * 28} className="cp-heel-needle" />
        <circle cx="40" cy="40" r="3" />
      </svg>
      <span>heel {Math.round(hud.heel)}°</span>
    </div>
  )
}

function MiniChart({ hud }) {
  const W = 150
  const L = hud.L
  const spanY = L + 90
  const s = 150 / spanY
  const X = x => W / 2 + x * s
  const Y = y => (L + 30 - y) * s
  const ms = hud.mean + Math.PI - CLOSE
  const mp = hud.mean + Math.PI + CLOSE
  return (
    <svg className="cp-mini" viewBox={`0 0 ${W} ${spanY * s}`} role="img" aria-label="Race chart" data-testid="cp-minichart">
      <rect width={W} height={spanY * s} className="cp-mini-bg" />
      <line x1={X(PIN.x)} y1={Y(0)} x2={X(COMMITTEE.x)} y2={Y(0)} className="cp-mini-line" />
      <line x1={X(hud.mark.x)} y1={Y(hud.mark.y)} x2={X(hud.mark.x + Math.sin(ms) * 200)} y2={Y(hud.mark.y + Math.cos(ms) * 200)} className="cp-mini-lay" />
      <line x1={X(hud.mark.x)} y1={Y(hud.mark.y)} x2={X(hud.mark.x + Math.sin(mp) * 200)} y2={Y(hud.mark.y + Math.cos(mp) * 200)} className="cp-mini-lay" />
      <circle cx={X(hud.mark.x)} cy={Y(hud.mark.y)} r="3.2" fill="#e8792b" />
      {hud.boats.map((b, i) => (
        <path key={i} transform={`translate(${X(b.x).toFixed(1)} ${Y(b.y).toFixed(1)}) rotate(${(b.h / DEG).toFixed(0)})`} d="M0 -4 L2.6 3 L-2.6 3 Z" className={b.you ? 'cp-mini-you' : b.fin ? 'cp-mini-fin' : 'cp-mini-boat'} />
      ))}
      <g transform={`translate(${W - 16} 16) rotate(${(hud.mean / DEG + 180).toFixed(0)})`}>
        <path d="M0 -9 L0 8 M-3 4 L0 8 L3 4" className="cp-mini-wind" />
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------

const CatsPaw = ({ category, experiment }) => {
  const rootRef = useRef(null)
  const canvasRef = useRef(null)
  const labelRef = useRef(null)
  const dialogRef = useRef(null)
  const g = useRef({
    race: null, scene: null, audio: null, raf: 0, acc: 0, last: 0, hudAt: 0, attractIdx: 0,
    input: { steer: 0, sheet: 0, sheetAbs: null, hike: false, crew: true, tack: false },
    keys: { left: false, right: false, in: false, out: false },
    screen: 'title', paused: false, help: false, view: 'chase', timeScale: 1, doneAt: 0
  })
  const [screen, setScreenState] = useState('title')
  const [raceIdx, setRaceIdx] = useState(0)
  const [hud, setHud] = useState(null)
  const [toasts, setToasts] = useState([])
  const [series, setSeries] = useState(readSeries)
  const [paused, setPausedState] = useState(false)
  const [help, setHelpState] = useState(false)
  const setHelp = useCallback(h => {
    const s = g.current
    if (h && !s.help) s.helpOpener = document.activeElement
    s.help = h
    setHelpState(h)
    if (!h && s.screen !== 'racing') {
      const back = s.helpOpener
      setTimeout(() => {
        if (back && back.isConnected) back.focus()
        else rootRef.current?.querySelector('.cp-card [data-autofocus]')?.focus()
      }, 0)
    }
  }, [])
  const [muted, setMuted] = useState(false)
  const [crew, setCrewState] = useState(true)
  const [view, setViewState] = useState('chase')
  const [hike, setHikeState] = useState(false)
  const [fleetHome, setFleetHome] = useState(false)
  const [glFailed, setGlFailed] = useState(false)
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [tillerPos, setTillerPos] = useState(0)
  const [, force] = useState(0)

  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(q.matches)
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])

  const setScreen = useCallback(s => {
    g.current.screen = s
    setScreenState(s)
  }, [])
  const setPaused = useCallback(p => {
    g.current.paused = p
    setPausedState(p)
  }, [])
  const setView = useCallback(v => {
    g.current.view = v
    setViewState(v)
  }, [])
  const setCrew = useCallback(c => {
    g.current.input.crew = c
    setCrewState(c)
  }, [])
  const setHike = useCallback(h => {
    g.current.input.hike = h
    setHikeState(h)
  }, [])

  const ensureAudio = useCallback(() => {
    const s = g.current
    if (!s.audio) {
      s.audio = createAudio()
      s.audio?.setMuted(muted)
    }
    s.audio?.resume()
  }, [muted])

  useEffect(() => {
    g.current.audio?.setMuted(muted)
  }, [muted])

  const newAttract = useCallback(() => {
    const s = g.current
    const idx = s.attractIdx % RACES.length
    s.attractIdx += 1
    const race = createRace(idx, { attract: true })
    prerollAttract(race, COUNTDOWN + 38)
    s.race = race
  }, [])

  // the main loop
  useEffect(() => {
    const s = g.current
    let scene
    try {
      scene = createScene(canvasRef.current, labelRef.current, {})
    } catch {
      setGlFailed(true)
      return undefined
    }
    s.scene = scene
    newAttract()
    const resize = () => {
      const el = rootRef.current
      if (!el) return
      const w = el.clientWidth
      const h = el.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.5 : 1.75)
      scene.resize(w, h, dpr)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(rootRef.current)

    const frame = now => {
      const dt = Math.min(0.05, s.last ? (now - s.last) / 1000 : 0.016)
      s.last = now
      const race = s.race
      const live = s.screen === 'racing'
      if (!s.paused && !(s.help && live) && (live || s.screen === 'title' || s.screen === 'brief' || s.screen === 'debrief' || s.screen === 'series')) {
        const k = s.keys
        if (live) {
          s.input.steer = (k.right ? 1 : 0) - (k.left ? 1 : 0) || s.touchSteer || 0
          s.input.sheet = (k.out ? 1 : 0) - (k.in ? 1 : 0)
        }
        const scale = live ? s.timeScale : 1
        s.acc += dt * scale
        let n = 0
        while (s.acc >= STEP && n < 8 * scale) {
          if (!(race.done && live)) stepRace(race, STEP, s.input)
          s.acc -= STEP
          n += 1
        }
        if (s.acc > STEP * 4) s.acc = 0
      }
      if (race.attract && race.done) newAttract()
      // events from the water
      if (race.toasts.length) {
        const items = race.toasts.splice(0)
        setToasts(t => [...t, ...items.map((x, i) => ({ ...x, id: `${now}-${i}`, at: now }))].slice(-3))
      }
      if (race.sfx.length) {
        const items = race.sfx.splice(0)
        if (s.audio) items.forEach(x => s.audio.cue(x.name, x.arg))
      }
      const you = race.boats[0]
      s.audio?.update(you, live && !s.paused && !race.done)
      if (live && you.finished && s.timeScale === 1 && !race.done) {
        s.timeScale = 5
        setFleetHome(true)
      }
      if (live && race.done && !s.doneAt) s.doneAt = now
      if (live && s.doneAt && now - s.doneAt > 1800) {
        s.doneAt = 0
        s.timeScale = 1
        setFleetHome(false)
        finishToDebrief()
      }
      scene.render(race, s.paused ? 0 : dt, s.view, { reduced: s.reduced })
      if (now - s.hudAt > 110) {
        s.hudAt = now
        if (!race.attract) setHud(snapshot(race, s.view))
        if (!s.paused && !s.help) setToasts(t => (t.length && now - t[0].at > 4800 ? t.slice(1) : t))
        else setToasts(t => (t.length ? t.map(x => ({ ...x, at: x.at + 110 })) : t))
      }
      s.raf = requestAnimationFrame(frame)
    }
    s.raf = requestAnimationFrame(frame)
    const vis = () => { if (document.hidden && s.screen === 'racing') setPaused(true) }
    document.addEventListener('visibilitychange', vis)
    return () => {
      cancelAnimationFrame(s.raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', vis)
      scene.dispose()
      s.audio?.close()
      s.audio = null
      s.scene = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { g.current.reduced = reduced }, [reduced])


  const finishToDebrief = () => {
    const s = g.current
    const race = s.race
    const entry = { results: race.results.map(r => ({ id: r.id, name: r.name, place: r.place, points: r.points, time: r.time, dnf: !!r.dnf, penalty: r.penalty })) }
    race.practice = !!readSeries()[race.idx]
    if (!race.practice) {
      setSeries(prev => {
        const next = [...prev]
        next[race.idx] = entry
        writeSeries(next)
        return next
      })
    }
    setScreen('debrief')
  }

  const toBrief = useCallback(idx => {
    const s = g.current
    setRaceIdx(idx)
    const race = createRace(idx, { attract: true })
    prerollAttract(race, COUNTDOWN + 20)
    s.race = race
    setScreen('brief')
    setToasts([])
  }, [setScreen])

  const startRace = useCallback(idx => {
    ensureAudio()
    const s = g.current
    const race = createRace(idx, { crew: s.input.crew })
    s.race = race
    s.acc = 0
    s.timeScale = 1
    s.doneAt = 0
    s.input.tack = false
    s.input.sheetAbs = null
    setHike(false)
    setFleetHome(false)
    setToasts([])
    setRaceIdx(idx)
    setPaused(false)
    setScreen('racing')
    setTimeout(() => rootRef.current?.querySelector('[data-testid="cp-water"]')?.focus(), 30)
  }, [ensureAudio, setHike, setPaused, setScreen])

  const skipToResults = useCallback(() => {
    const s = g.current
    completeRace(s.race)
    s.doneAt = performance.now() - 2000
  }, [])

  const tack = useCallback(() => {
    if (g.current.screen !== 'racing') return
    g.current.input.tack = true
  }, [])

  const resetSeries = useCallback(() => {
    const empty = [null, null, null]
    writeSeries(empty)
    setSeries(empty)
    toBrief(0)
  }, [toBrief])

  // keyboard
  useEffect(() => {
    const s = g.current
    const set = (e, down) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return
      const k = e.key
      const racing = s.screen === 'racing' && !s.paused
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { s.keys.left = down; if (racing) e.preventDefault() }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { s.keys.right = down; if (racing) e.preventDefault() }
      else if (k === 'ArrowUp' || k === 'w' || k === 'W') {
        s.keys.in = down
        if (racing) { e.preventDefault(); if (down && s.input.crew) setCrew(false); s.input.sheetAbs = null }
      } else if (k === 'ArrowDown' || k === 's' || k === 'S') {
        s.keys.out = down
        if (racing) { e.preventDefault(); if (down && s.input.crew) setCrew(false); s.input.sheetAbs = null }
      }
      if (!down || e.repeat) return
      // with the help card open, only Escape (to close it) does anything
      if (s.help) {
        if (k === 'Escape') { e.preventDefault(); setHelp(false) }
        return
      }
      if (k === ' ' && racing) { e.preventDefault(); setHike(!s.input.hike) }
      else if ((k === 't' || k === 'T') && racing) tack()
      else if (k === 'c' || k === 'C') setCrew(!s.input.crew)
      else if (k === 'v' || k === 'V') setView(s.view === 'chase' ? 'high' : 'chase')
      else if (k === 'm' || k === 'M') { ensureAudio(); setMuted(m => !m) }
      else if (k === '?' || k === 'h' || k === 'H') setHelp(true)
      else if ((k === 'p' || k === 'P' || k === 'Escape') && s.screen === 'racing') setPaused(!s.paused)
    }
    const kd = e => set(e, true)
    const ku = e => set(e, false)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [ensureAudio, setCrew, setHike, setPaused, setView, tack])

  // dialogs keep focus
  useEffect(() => {
    if ((help || paused || screen !== 'racing') && dialogRef.current) {
      const f = dialogRef.current.querySelector('[data-autofocus]') || dialogRef.current.querySelector('button')
      f?.focus()
    } else if (screen === 'racing' && !help && !paused) {
      rootRef.current?.querySelector('[data-testid="cp-water"]')?.focus()
    }
  }, [help, paused, screen])
  const trap = e => {
    if (e.key !== 'Tab') return
    const els = [...e.currentTarget.querySelectorAll('button, a[href]')].filter(x => !x.disabled)
    if (!els.length) return
    const first = els[0]
    const last = els[els.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  // the tiller: drag sideways to steer, let go to centre it
  const tillerRef = useRef(null)
  const tillerDown = e => {
    ensureAudio()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    tillerMove(e)
  }
  const tillerMove = e => {
    if (e.buttons === 0 && e.pointerType === 'mouse') return
    const r = tillerRef.current.getBoundingClientRect()
    const v = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1)
    const out = Math.abs(v) < 0.08 ? 0 : v
    g.current.touchSteer = out
    setTillerPos(out)
  }
  const tillerUp = () => {
    g.current.touchSteer = 0
    setTillerPos(0)
  }
  // the sheet: a rope you pull in (up) or let run (down)
  const sheetRef = useRef(null)
  const sheetDown = e => {
    ensureAudio()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    if (g.current.input.crew) setCrew(false)
    sheetMove(e)
  }
  const sheetMove = e => {
    if (e.buttons === 0 && e.pointerType === 'mouse') return
    const r = sheetRef.current.getBoundingClientRect()
    g.current.input.sheetAbs = clamp((e.clientY - r.top) / r.height, 0, 1)
    force(n => n + 1)
  }

  const stepSheet = d => {
    if (g.current.input.crew) setCrew(false)
    const cur = g.current.race?.boats[0].sheet ?? 0.5
    g.current.input.sheetAbs = clamp(cur + d, 0, 1)
    force(n => n + 1)
  }

  const race = g.current.race
  const rows = useMemo(() => seriesTable(series), [series])
  const done = series.filter(Boolean).length
  const nextIdx = series.findIndex(x => !x)
  const debriefRace = screen === 'debrief' ? race : null
  const analysis = debriefRace?.analysis
  const youRes = debriefRace?.results?.find(r => r.id === 0)
  const sheetShown = hud ? hud.sheet : 0.4
  const def = RACES[raceIdx]

  return (
    <div
      ref={rootRef}
      className={`cp-root ${reduced ? 'is-reduced' : ''} is-${screen}`}
      data-testid="cats-paw"
      style={{ '--cp-accent': experiment?.color || '#e8792b' }}
    >
      <div
        className="cp-water"
        data-playground-surface
        data-testid="cp-water"
        tabIndex={0}
        aria-label="The race course. Arrow keys steer and trim, space hikes, T tacks."
        onPointerDown={ensureAudio}
      >
        <canvas ref={canvasRef} className="cp-canvas" />
        <div ref={labelRef} className="cp-labels" aria-hidden="true" />
        {glFailed && <p className="cp-nogl">this sea needs WebGL, and this browser has none to give.</p>}
      </div>

      <header className="cp-top">
        <Link to={`/playground/${category?.slug || 'physics'}`} className="cp-back" aria-label="Back to the laboratory">←</Link>
        <div className="cp-title">
          <span className="cp-name">{experiment?.name || 'cats.paw()'}</span>
          <span className="cp-sub">{screen === 'racing' ? def.title : 'the evening series'}</span>
        </div>
        {screen === 'racing' && hud && (
          <div className="cp-board" data-testid="cp-board" aria-live="off">
            <div className="cp-flags" aria-label="Committee boat flags">
              <span className={`cp-flag is-class ${hud.flags.cls ? 'is-up' : ''}`} title="class flag: warning signal" />
              <span className={`cp-flag is-p ${hud.flags.p ? 'is-up' : ''}`} title="P flag: preparatory" />
              <span className={`cp-flag is-x ${hud.flags.x ? 'is-up' : ''}`} title="X flag: someone is over the line" />
            </div>
            <div className="cp-clock" data-testid="cp-clock">{fmtClock(hud.clock)}</div>
            <div className="cp-leg">{hud.ocs ? 'over the line: dip back below it' : hud.penalty ? `owe ${hud.penalty} penalty turn` : LEG_LABEL[hud.leg]}</div>
          </div>
        )}
        <div className="cp-tools">
          {screen === 'racing' && hud && <span className="cp-place" data-testid="cp-place">{ordinal(hud.place)}<small>/{hud.fleet}</small></span>}
          <button type="button" className="cp-icon" onClick={() => setView(view === 'chase' ? 'high' : 'chase')} aria-pressed={view === 'high'} aria-label={view === 'high' ? 'Helm view' : 'Look up the course from above'} data-testid="cp-view" data-playground-action="view">{view === 'high' ? '⛵' : '◎'}</button>
          <button type="button" className="cp-icon" onClick={() => { ensureAudio(); setMuted(m => !m) }} aria-pressed={muted} aria-label={muted ? 'Sound on' : 'Sound off'} data-testid="cp-mute">{muted ? '♪̸' : '♪'}</button>
          <button type="button" className="cp-icon" onClick={() => setHelp(true)} aria-label="How to sail" data-testid="cp-help-toggle">?</button>
          {screen === 'racing' && <button type="button" className="cp-icon" onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume' : 'Pause'} data-testid="cp-pause">{paused ? '▶' : 'Ⅱ'}</button>}
        </div>
      </header>

      {screen === 'racing' && hud && (
        <>
          <div className="cp-left">
            <Compass hud={hud} />
            <MiniChart hud={hud} />
          </div>
          <div className="cp-toasts" aria-live="polite" data-testid="cp-toasts">
            {toasts.map(t => <p key={t.id} className={`cp-toast is-${t.kind}`}>{t.text}</p>)}
          </div>
          {fleetHome && (
            <div className="cp-home" data-testid="cp-fleet-home">
              <span>you are home. the fleet is still out there</span>
              <button type="button" className="cp-btn" onClick={skipToResults} data-testid="cp-skip">results now</button>
            </div>
          )}
          <div className="cp-controls" data-testid="cp-controls">
            <div
              ref={tillerRef}
              className="cp-tiller"
              onPointerDown={tillerDown}
              onPointerMove={tillerMove}
              onPointerUp={tillerUp}
              onPointerCancel={tillerUp}
              role="slider"
              aria-label="Tiller: drag left or right to steer"
              aria-valuemin={-1}
              aria-valuemax={1}
              aria-valuenow={tillerPos}
              data-testid="cp-tiller"
            >
              <span className="cp-tiller-l">◀ port</span>
              <span className="cp-tiller-knob" style={{ left: `${50 + tillerPos * 42}%` }} />
              <span className="cp-tiller-r">stbd ▶</span>
            </div>
            <div className="cp-mid">
              <button type="button" className="cp-btn is-tack" onClick={tack} disabled={hud.capsized || hud.finished} data-testid="cp-tack" data-playground-action="tack">
                {hud.upwind ? 'tack' : 'gybe'} <kbd>T</kbd>
              </button>
              <button type="button" className={`cp-btn is-hike ${hike ? 'is-on' : ''}`} onClick={() => setHike(!hike)} aria-pressed={hike} data-testid="cp-hike" data-playground-action="hike">
                {hike ? 'hiking' : 'hike'} <kbd>space</kbd>
              </button>
              <button type="button" className={`cp-btn is-crew ${crew ? 'is-on' : ''}`} onClick={() => setCrew(!crew)} aria-pressed={crew} data-testid="cp-crew">
                {crew ? 'crew trims' : 'you trim'} <kbd>C</kbd>
              </button>
            </div>
            <div className="cp-trim">
              <Telltales hud={hud} />
              <Heel hud={hud} />
            </div>
            <div className="cp-sheetbox">
              <button type="button" className="cp-sheet-step" onClick={() => stepSheet(-0.08)} aria-label="Sheet in" data-testid="cp-sheet-in">in</button>
              <div
                ref={sheetRef}
                className={`cp-sheet ${crew ? 'is-crew' : ''}`}
                onPointerDown={sheetDown}
                onPointerMove={sheetMove}
                role="slider"
                aria-label="Mainsheet: up pulls the sail in, down lets it out"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(sheetShown * 100)}
                data-testid="cp-sheet"
              >
                <span className="cp-sheet-rope" />
                <span className="cp-sheet-thumb" style={{ top: `${sheetShown * 100}%` }} />
              </div>
              <button type="button" className="cp-sheet-step" onClick={() => stepSheet(0.08)} aria-label="Ease the sheet" data-testid="cp-sheet-out">out</button>
            </div>
          </div>
        </>
      )}

      {screen === 'title' && (
        <section className="cp-card cp-titlecard" ref={dialogRef} onKeyDown={trap} aria-labelledby="cp-t-h" data-testid="cp-title">
          <p className="cp-kicker">void.laboratory() // a playable sea</p>
          <h1 id="cp-t-h">the evening series</h1>
          <p className="cp-lede">three races off the harbour wall, sailed by cats. the wind is invisible. the water draws it for you: <b>dark water is a puff</b>, glassy water is a hole, and the pale streak behind every sail is someone else's shadow.</p>
          <ol className="cp-serieschips" aria-label="Series so far">
            {RACES.map((r, i) => {
              const res = series[i]?.results.find(x => x.id === 0)
              return <li key={r.key} className={res ? 'is-done' : ''}><span>{r.short}</span><b>{res ? (res.place ? ordinal(res.place) : 'dnf') : '—'}</b></li>
            })}
          </ol>
          <div className="cp-row">
            <button type="button" className="cp-btn is-go" data-autofocus data-playground-primary data-testid="cp-begin" onClick={() => { ensureAudio(); toBrief(nextIdx === -1 ? 0 : nextIdx) }}>
              {done === 0 ? 'go down to the boats' : nextIdx === -1 ? 'look at the season again' : `on to ${RACES[nextIdx].short}`}
            </button>
            {done > 0 && nextIdx === -1 && <button type="button" className="cp-btn" onClick={() => setScreen('series')} data-testid="cp-see-series">series result</button>}
            <button type="button" className="cp-btn" onClick={() => setHelp(true)}>how to sail</button>
          </div>
        </section>
      )}

      {screen === 'brief' && (
        <section className="cp-card cp-brief" ref={dialogRef} onKeyDown={trap} aria-labelledby="cp-b-h" data-testid="cp-brief">
          <p className="cp-kicker">race {raceIdx + 1} of 3</p>
          <h2 id="cp-b-h">{def.title.replace(/^race \w+: /, '')}</h2>
          <p className="cp-lede">{def.brief}</p>
          <dl className="cp-cond">
            <div><dt>wind</dt><dd>{(def.wind.speed * KN).toFixed(0)} kn{def.wind.build ? ', building' : ''}</dd></div>
            <div><dt>shifts</dt><dd>{def.wind.osc[0].amp / DEG >= 10 ? `±${Math.round(def.wind.osc[0].amp / DEG)}°, every ${Math.round(def.wind.osc[0].period)} s` : def.wind.drift ? 'swinging right' : 'gentle'}</dd></div>
            <div><dt>beat</dt><dd>{def.L} m</dd></div>
            <div><dt>tide</dt><dd>{def.wind.current ? 'ebb, strongest on the right' : 'slack'}</dd></div>
          </dl>
          <p className="cp-howto">start between the <b>orange pin buoy</b> and the <b>red committee boat</b> after the gun, sail up to the windward mark and leave it to <b>port</b> (go round it anticlockwise), then run home through the same line. you have {COUNTDOWN} seconds before the gun.</p>
          <div className="cp-row">
            <button type="button" className="cp-btn is-go" data-autofocus data-testid="cp-start" data-playground-primary onClick={() => startRace(raceIdx)}>to the start line</button>
            <button type="button" className={`cp-btn ${crew ? 'is-on' : ''}`} onClick={() => setCrew(!crew)} aria-pressed={crew} data-testid="cp-brief-crew">{crew ? 'crew trims the sail' : 'you trim the sail'}</button>
            <button type="button" className="cp-btn" onClick={() => setScreen('title')}>back</button>
          </div>
        </section>
      )}

      {screen === 'debrief' && debriefRace && analysis && (
        <section className="cp-card cp-debrief" ref={dialogRef} onKeyDown={trap} aria-labelledby="cp-d-h" data-testid="cp-debrief" role="dialog" aria-modal="true">
          <div className="cp-debrief-head">
            <p className="cp-kicker">{def.title}</p>
            <h2 id="cp-d-h">{youRes?.place ? `${ordinal(youRes.place)} of ${debriefRace.boats.length}` : 'did not finish'}</h2>
            <p className="cp-verdict">{analysis.line}</p>
            {debriefRace.practice && <p className="cp-practice" data-testid="cp-practice">a practice sail: the book keeps your first result for this race. sail a new series to rewrite it.</p>}
          </div>
          <div className="cp-debrief-body">
            <figure>
              <DebriefChart race={debriefRace} />
              <figcaption><span className="cp-key is-g" />made good &gt;85% <span className="cp-key is-a" />60–85% <span className="cp-key is-r" />under 60% · ● tack (green on a header, red on a lift) · ■ gybe</figcaption>
            </figure>
            <div className="cp-debrief-side">
              <WindStrip race={debriefRace} />
              <ul className="cp-notes" data-testid="cp-notes">
                {analysis.notes.map((n, i) => <li key={i} className={`is-${n.kind}`}>{n.text}</li>)}
              </ul>
              <table className="cp-results" data-testid="cp-results">
                <tbody>
                  {debriefRace.results.map(r => (
                    <tr key={r.id} className={r.id === 0 ? 'is-you' : ''}>
                      <td>{r.place ?? '—'}</td>
                      <td>{r.id === 0 ? 'you' : r.name}</td>
                      <td>{r.dnf ? 'dnf' : `${fmtTime(r.time)}${r.penalty ? ` (+${r.penalty * 20}s)` : ''}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="cp-row">
            {raceIdx < 2
              ? <button type="button" className="cp-btn is-go" data-autofocus onClick={() => toBrief(raceIdx + 1)} data-testid="cp-next">next: {RACES[raceIdx + 1].short} →</button>
              : <button type="button" className="cp-btn is-go" data-autofocus onClick={() => setScreen('series')} data-testid="cp-series">the series result →</button>}
            <button type="button" className="cp-btn" onClick={() => startRace(raceIdx)} data-testid="cp-again">practise it again</button>
          </div>
        </section>
      )}

      {screen === 'series' && (
        <section className="cp-card cp-seriescard" ref={dialogRef} onKeyDown={trap} aria-labelledby="cp-s-h" data-testid="cp-series-card" role="dialog" aria-modal="true">
          <p className="cp-kicker">the evening series // final standings</p>
          <h2 id="cp-s-h">{rows[0]?.you ? 'the last light cup is yours' : `${rows[0]?.name} takes the cup`}</h2>
          <div className="cp-series-body">
            <svg className={`cp-cup ${rows[0]?.you ? 'is-won' : ''}`} viewBox="0 0 120 140" role="img" aria-label="The last light cup">
              <path d="M30 18 h60 q0 46 -30 56 q-30 -10 -30 -56 Z" className="cp-cup-b" />
              <path d="M30 26 q-18 2 -14 18 q4 14 20 12 M90 26 q18 2 14 18 q-4 14 -20 12" className="cp-cup-h" />
              <rect x="52" y="74" width="16" height="22" className="cp-cup-b" />
              <rect x="36" y="96" width="48" height="12" rx="2" className="cp-cup-b" />
              <rect x="30" y="108" width="60" height="16" rx="2" className="cp-cup-base" />
              <text x="60" y="120" textAnchor="middle" className="cp-cup-t">{rows[0]?.you ? 'the void cat' : rows[0]?.name}</text>
              <g className="cp-cup-paw" transform="translate(60 44)"><circle r="7" /><circle cx="-9" cy="-9" r="3.4" /><circle cx="-3" cy="-13" r="3.4" /><circle cx="3.5" cy="-13" r="3.4" /><circle cx="9" cy="-9" r="3.4" /></g>
            </svg>
            <table className="cp-results is-series" data-testid="cp-series-table">
              <thead><tr><th /><th>boat</th>{RACES.map((r, i) => <th key={r.key}>r{i + 1}</th>)}<th>pts</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className={r.you ? 'is-you' : ''}>
                    <td>{i + 1}</td>
                    <td>{r.you ? 'you' : r.name}</td>
                    {r.pts.map((p, k) => <td key={k}>{p ?? '—'}</td>)}
                    <td><b>{r.total}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="cp-verdict">{rows[0]?.you ? 'three races, one wind, read the whole way down. the committee boat sounds one long horn for you as the harbour lamps come on.' : 'low points wins, and the book keeps every first sail. resails are practice; a new series is a new book.'}</p>
          <div className="cp-row">
            <button type="button" className="cp-btn is-go" data-autofocus onClick={resetSeries} data-testid="cp-reset-series">sail a new series</button>
            {RACES.map((r, i) => <button key={r.key} type="button" className="cp-btn" onClick={() => toBrief(i)}>practise {r.short}</button>)}
          </div>
        </section>
      )}

      {paused && screen === 'racing' && !help && (
        <section className="cp-card cp-pause" ref={dialogRef} onKeyDown={trap} role="dialog" aria-modal="true" aria-labelledby="cp-p-h" data-testid="cp-paused">
          <h2 id="cp-p-h">hove to</h2>
          <p className="cp-lede">the race waits for you.</p>
          <div className="cp-row">
            <button type="button" className="cp-btn is-go" data-autofocus onClick={() => setPaused(false)} data-testid="cp-resume">back to the helm</button>
            <button type="button" className="cp-btn" onClick={() => startRace(raceIdx)} data-testid="cp-restart">restart this race</button>
            <button type="button" className="cp-btn" onClick={() => { setPaused(false); setScreen('title') }}>retire to the clubhouse</button>
          </div>
          <div className="cp-nav"><ExperimentNav currentCategory={category?.slug} currentExperiment={experiment?.slug} /></div>
        </section>
      )}

      {help && (
        <section className="cp-card cp-help" ref={dialogRef} onKeyDown={trap} role="dialog" aria-modal="true" aria-labelledby="cp-h-h" data-testid="cp-help">
          <h2 id="cp-h-h">how to sail</h2>
          <ul>
            <li><b>read the water.</b> a dark, rippled patch is more wind on its way down the course. sail into it and the boat leaps. bright glassy water is a hole, and the pale streak behind a sail is its wind shadow.</li>
            <li><b>steer</b> with ← → (or drag the tiller). you cannot sail closer than about 45° to the wind: point too high and the sail flaps and the boat stops.</li>
            <li><b>tack on a header.</b> the compass shows whether the wind has swung against you (headed) or for you (lifted) on this tack. when you are headed, the other tack is lifted: press <kbd>T</kbd> to tack.</li>
            <li><b>trim.</b> your crew trims the sail for you. take the sheet (↑ in, ↓ out, or drag the rope) to trim it yourself: the tell-tales flutter when it luffs and droop when it stalls.</li>
            <li><b>hike</b> (<kbd>space</kbd>) before a gust lands. heel past 50° and you capsize, which costs you about seven seconds in the water.</li>
            <li><b>rules.</b> port tack gives way to starboard. on the same tack, the windward boat keeps clear. foul someone or touch the mark and you owe a full circle.</li>
            <li><kbd>V</kbd> looks up the course from above, <kbd>P</kbd> pauses, <kbd>M</kbd> mutes.</li>
          </ul>
          <div className="cp-row"><button type="button" className="cp-btn is-go" data-autofocus onClick={() => setHelp(false)} data-testid="cp-help-close">back to the water</button></div>
        </section>
      )}
    </div>
  )
}

export default CatsPaw
