import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ExperimentNav from '../../ExperimentNav'
import { createGI, GIUnavailableError, cascadeInfo, cascadeLevels } from './sunpatch/gi'
import {
  W, H, ROOMS, PUZZLE_COUNT, PIGMENTS, PIGMENT_ORDER, LAMP_KINDS, LAMP_RADIUS, BRUSH,
  buildFixedLayer, buildKeepOut, stamp, composite, judge, clampToZone
} from './sunpatch/rooms'
import { createSunpatchAudio } from './sunpatch/audio'
import './SunpatchCascade.css'

const SAVE_KEY = 'sunpatch-cascade-v1'
const LEVELS = cascadeLevels()
const HOLD_MS = 900
const UNDO_DEPTH = 16

const loadSave = () => {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY)
    const data = raw ? JSON.parse(raw) : null
    return data && typeof data === 'object' ? { solved: data.solved || {}, room: Number(data.room) || 0 } : { solved: {}, room: 0 }
  } catch {
    return { solved: {}, room: 0 }
  }
}
const writeSave = data => {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch {
    /* storage refused: progress just will not survive the tab */
  }
}

const unlockedCount = solved => {
  let n = 1
  for (let i = 0; i < ROOMS.length - 1; i++) {
    if (solved[ROOMS[i].id]) n = i + 2
    else break
  }
  return Math.min(n, ROOMS.length)
}

const initialLamps = room => room.lamps.map((l, i) => ({ id: `${room.id}-${i}`, kind: l.kind, x: l.x, y: l.y }))

const toGpuLamps = (lamps, room) => lamps.map(l => {
  const kind = LAMP_KINDS[l.kind]
  return { x: l.x, y: l.y, radius: LAMP_RADIUS, color: kind.color, power: kind.power * (room.lampPower || 1) }
})

// Truncate rather than round, so a reading shown as equal to its threshold
// never disagrees with the pass/fail beside it.
const fmt = n => (n >= 10 ? Math.floor(n) : (Math.floor(n * 10) / 10).toFixed(1))

function CatGlyph ({ c, reading }) {
  const ratio = reading ? Math.min(reading.ratio, 1.4) : 0
  const light = 0.22 + Math.min(ratio, 1.2) * 0.75
  const asleep = reading?.ok
  return (
    <g className={`sp-cat ${asleep ? 'is-asleep' : ''}`} style={{ filter: `brightness(${light.toFixed(2)})` }}>
      <path d="M -15 4 C -16 -8 -4 -12 6 -9 C 13 -7 15 -1 13 5 C 11 10 -12 11 -15 4 Z" fill={c.fur} />
      <path d="M -14 6 C -20 9 -18 15 -8 13" fill="none" stroke={c.fur} strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="9" cy="-6" r="6.6" fill={c.fur} />
      <path d="M 4 -10 L 5 -16 L 9 -12 Z M 10 -12 L 14 -16 L 14 -9 Z" fill={c.fur} />
      {asleep && <text x="15" y="-15" className="sp-z">z</text>}
      {asleep
        ? <path d="M 6.5 -6 q 1.4 1.2 2.8 0 M 10.5 -6 q 1.4 1.2 2.8 0" stroke="#2a1d14" strokeWidth="0.9" fill="none" strokeLinecap="round" />
        : <g fill="#2a1d14"><ellipse cx="7.6" cy="-6" rx="1" ry={reading && reading.ratio > 0.35 ? 0.9 : 1.5} /><ellipse cx="11.8" cy="-6" rx="1" ry={reading && reading.ratio > 0.35 ? 0.9 : 1.5} /></g>}
    </g>
  )
}

function HushGlyph ({ reading }) {
  const ratio = reading ? reading.ratio : 0
  const eye = Math.min(3.2, 0.25 + ratio * 2.4)
  const awake = reading && !reading.ok
  return (
    <g className={`sp-hush ${awake ? 'is-awake' : ''}`}>
      <path d="M -16 6 C -18 -6 -8 -15 0 -14 C 9 -14 18 -6 16 6 C 14 13 -14 13 -16 6 Z" fill="#07050b" stroke={awake ? '#b39cff' : '#2b2140'} strokeWidth="1.2" />
      <ellipse cx="-5" cy="-2" rx="2.6" ry={eye} fill={awake ? '#efe7ff' : '#6d5d93'} />
      <ellipse cx="5" cy="-2" rx="2.6" ry={eye} fill={awake ? '#efe7ff' : '#6d5d93'} />
    </g>
  )
}

function Gauge ({ c, reading }) {
  const R = 22
  const circ = 2 * Math.PI * R
  const ratio = reading ? reading.ratio : 0
  const isHush = c.kind === 'hush'
  const fill = Math.min(ratio, isHush ? 1.5 : 1) / (isHush ? 1.5 : 1)
  let stroke = '#7d746a'
  if (isHush) stroke = reading && !reading.ok ? '#c4a8ff' : '#5c4d80'
  else if (reading?.tint === 'warm') stroke = '#ffb15a'
  else if (reading?.tint === 'cool') stroke = '#86b4ff'
  const label = isHush
    ? `hush ${reading ? fmt(reading.lux) : '·'}/${c.limit}`
    : `${c.name} ${reading ? fmt(reading.lux) : '·'}/${c.need}`
  return (
    <g>
      <circle r={R} fill="none" stroke="rgba(239,230,216,0.14)" strokeWidth="2.2" />
      {isHush && <circle r={R} fill="none" stroke="#c4a8ff" strokeOpacity="0.5" strokeWidth="2.2" strokeDasharray={`1.4 ${circ / 1.5 - 1.4}`} transform="rotate(-90)" />}
      <circle
        r={R} fill="none" stroke={stroke} strokeWidth="2.6" strokeLinecap="round"
        strokeDasharray={`${(fill * circ).toFixed(1)} ${circ.toFixed(1)}`} transform="rotate(-90)"
        className="sp-gauge-arc"
      />
      {reading?.ok && !isHush && <circle r={R + 4} fill="none" stroke={stroke} strokeOpacity="0.35" strokeWidth="1" className="sp-halo" />}
      <text y={R + 12} textAnchor="middle" className="sp-gauge-label">{label}</text>
    </g>
  )
}

function Lens ({ at, level }) {
  if (!at) return null
  const info = cascadeInfo(level)
  const s = info.spacing
  const px = (Math.floor(at[0] / s) + 0.5) * s
  const py = (Math.floor(at[1] / s) + 0.5) * s
  const shown = Math.min(info.rays, 64)
  const rays = []
  for (let k = 0; k < shown; k++) {
    const idx = Math.floor((k + 0.5) * info.rays / shown)
    const a = (idx + 0.5) / info.rays * Math.PI * 2
    const dx = Math.cos(a)
    const dy = Math.sin(a)
    rays.push(<line key={k} x1={px + dx * info.start} y1={py + dy * info.start} x2={px + dx * info.end} y2={py + dy * info.end} />)
  }
  return (
    <g className="sp-lens" pointerEvents="none">
      {s >= 4 && (
        <>
          <defs>
            <pattern id="sp-probes" width={s} height={s} patternUnits="userSpaceOnUse">
              <circle cx={s / 2} cy={s / 2} r={Math.min(1.2, s / 5)} fill="#ffe2b8" fillOpacity="0.75" />
            </pattern>
            <radialGradient id="sp-lens-fade">
              <stop offset="0.6" stopColor="#fff" />
              <stop offset="1" stopColor="#000" />
            </radialGradient>
            <mask id="sp-lens-mask"><circle cx={at[0]} cy={at[1]} r={Math.max(48, s * 3)} fill="url(#sp-lens-fade)" /></mask>
          </defs>
          <rect width={W} height={H} fill="url(#sp-probes)" mask="url(#sp-lens-mask)" />
        </>
      )}
      <circle cx={px} cy={py} r={Math.max(info.start, 0.5)} className="sp-lens-ring" />
      <circle cx={px} cy={py} r={info.end} className="sp-lens-ring" />
      <g className="sp-lens-rays">{rays}</g>
      <circle cx={px} cy={py} r="2.2" fill="#fff4e2" />
    </g>
  )
}

export default function SunpatchCascade ({ category, experiment }) {
  const canvasRef = useRef(null)
  const stageRef = useRef(null)
  const giRef = useRef(null)
  const audioRef = useRef(null)
  const dragRef = useRef(null)
  const paintDirtyRef = useRef(false)
  const userRef = useRef(new Uint8Array(W * H))
  const fixedRef = useRef(null)
  const keepOutRef = useRef(null)
  const compositeRef = useRef(new Uint8Array(W * H * 4))
  const undoRef = useRef([])
  const holdRef = useRef(null)
  const liveRef = useRef({})

  const saved = useMemo(loadSave, [])
  const [progress, setProgress] = useState(saved)
  const [roomIndex, setRoomIndex] = useState(() => Math.min(saved.room, unlockedCount(saved.solved) - 1))
  const room = ROOMS[roomIndex]
  const [phase, setPhase] = useState('title')
  const [status, setStatus] = useState('starting')
  const [statusNote, setStatusNote] = useState('')
  const [lamps, setLamps] = useState(() => initialLamps(ROOMS[roomIndex]))
  const [selected, setSelected] = useState(0)
  const [tool, setTool] = useState('paint')
  const [pigment, setPigment] = useState(room.pigments[0] || null)
  const [inkUsed, setInkUsed] = useState(0)
  const [readings, setReadings] = useState([])
  const [settled, setSettled] = useState(false)
  const [solvedNow, setSolvedNow] = useState(false)
  const [xray, setXray] = useState(false)
  const [level, setLevel] = useState(3)
  const [lens, setLens] = useState(null)
  const [muted, setMuted] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [giInfo, setGiInfo] = useState(null)

  const inkLeft = room.ink === Infinity ? Infinity : Math.max(0, room.ink - inkUsed)
  liveRef.current = { room, lamps, tool, pigment, inkLeft, xray, phase, solvedNow, selected }

  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(q.matches)
    apply()
    q.addEventListener('change', apply)
    return () => q.removeEventListener('change', apply)
  }, [])

  // GPU lifetime: one device per mount, a demand-driven frame loop.
  useEffect(() => {
    let raf = 0
    let cancelled = false
    const canvas = canvasRef.current
    const resize = () => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(r.width * dpr))
      const h = Math.max(1, Math.round(r.height * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        giRef.current?.setView({})
      }
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    createGI(canvas, {
      onLost: message => {
        setStatus('lost')
        setStatusNote(message)
      }
    }).then(gi => {
      if (cancelled) { gi.destroy(); return }
      giRef.current = gi
      setGiInfo({ levels: gi.levels, rays: gi.raysPerFrame })
      setStatus('ready')
      const loop = t => {
        if (paintDirtyRef.current && fixedRef.current) {
          paintDirtyRef.current = false
          gi.setPaint(composite(fixedRef.current, userRef.current, compositeRef.current))
        }
        gi.frame(t / 1000)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }).catch(error => {
      if (cancelled) return
      setStatus('unsupported')
      setStatusNote(error instanceof GIUnavailableError ? error.message : `WebGPU could not start: ${error.message}`)
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      giRef.current?.destroy()
      giRef.current = null
    }
  }, [])

  useEffect(() => {
    const audio = createSunpatchAudio()
    audioRef.current = audio
    return () => audio.dispose()
  }, [])

  // Load a room: stone into the fixed layer, an empty paint layer, fresh lamps.
  const loadRoom = useCallback((index) => {
    const next = ROOMS[index]
    fixedRef.current = buildFixedLayer(next)
    keepOutRef.current = buildKeepOut(next)
    userRef.current = new Uint8Array(W * H)
    undoRef.current = []
    paintDirtyRef.current = true
    clearTimeout(holdRef.current)
    setLamps(initialLamps(next))
    setSelected(0)
    setInkUsed(0)
    setReadings([])
    setSettled(false)
    setSolvedNow(false)
    setPigment(next.pigments[0] || null)
    setTool('paint')
  }, [])

  useEffect(() => {
    if (status !== 'ready') return
    loadRoom(roomIndex)
    giRef.current.setProbes(ROOMS[roomIndex].creatures.map(c => ({ x: c.x, y: c.y, radius: 8 })))
  }, [status, roomIndex, loadRoom])

  useEffect(() => {
    giRef.current?.setLamps(toGpuLamps(lamps, liveRef.current.room))
  }, [lamps, status])

  useEffect(() => {
    giRef.current?.setView({ xray: xray ? 0.82 : 0, debugLevel: xray ? level : -1 })
  }, [xray, level, status])

  useEffect(() => {
    const gi = giRef.current
    if (!gi) return
    gi.onMeasure((values, isSettled) => {
      const r = liveRef.current.room
      setReadings(r.creatures.map((c, i) => ({ id: c.id, ...judge(c, values[i]) })))
      setSettled(isSettled)
    })
  }, [status])

  useEffect(() => {
    if (!readings.length) return
    audioRef.current?.update(room.creatures.map((c, i) => ({
      id: c.id, kind: c.kind, pan: (c.x / W) * 1.4 - 0.7, ok: readings[i]?.ok, ratio: readings[i]?.ratio || 0
    })))
  }, [readings, room])

  const allOk = readings.length === room.creatures.length && readings.every(r => r.ok)

  // A room falls asleep only when the settled light satisfies everyone, and
  // stays that way for a moment (dragging through a good spot does not count).
  useEffect(() => {
    clearTimeout(holdRef.current)
    if (room.studio || solvedNow || !allOk || !settled || dragRef.current) return
    holdRef.current = setTimeout(() => {
      setSolvedNow(true)
      audioRef.current?.asleep()
      setProgress(prev => {
        const best = prev.solved[room.id]
        const solved = { ...prev.solved, [room.id]: { ink: best ? Math.min(best.ink, inkUsed) : inkUsed } }
        const next = { solved, room: Math.min(roomIndex + 1, ROOMS.length - 1) }
        writeSave(next)
        return next
      })
    }, HOLD_MS)
    return () => clearTimeout(holdRef.current)
  }, [allOk, settled, room, solvedNow, inkUsed, roomIndex])

  const goRoom = useCallback(index => {
    setRoomIndex(index)
    setPhase('play')
    setProgress(prev => {
      const next = { ...prev, room: index }
      writeSave(next)
      return next
    })
    if (roomIndex === index && status === 'ready') loadRoom(index)
  }, [roomIndex, status, loadRoom])

  const nextRoom = () => {
    if (roomIndex + 1 >= PUZZLE_COUNT && !room.studio) setPhase('ending')
    else goRoom(Math.min(roomIndex + 1, ROOMS.length - 1))
  }

  const pushUndo = () => {
    undoRef.current.push(userRef.current.slice())
    if (undoRef.current.length > UNDO_DEPTH) undoRef.current.shift()
  }
  const countInk = user => {
    let n = 0
    for (let i = 0; i < user.length; i++) if (user[i]) n++
    return n
  }
  const undo = () => {
    const prev = undoRef.current.pop()
    if (!prev) return
    userRef.current = prev
    paintDirtyRef.current = true
    setInkUsed(countInk(prev))
    setSolvedNow(false)
  }
  const resetRoom = () => loadRoom(roomIndex)

  const toScene = e => {
    const r = stageRef.current.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]
  }

  const paintSegment = (x0, y0, x1, y1) => {
    const live = liveRef.current
    const id = live.tool === 'erase' ? null : live.pigment
    if (live.tool === 'paint' && !id) return
    const dist = Math.hypot(x1 - x0, y1 - y0)
    const steps = Math.max(1, Math.ceil(dist / (BRUSH * 0.45)))
    let left = live.inkLeft
    let delta = 0
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const d = stamp(userRef.current, fixedRef.current.solid, keepOutRef.current, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, id, left)
      delta += d
      left -= d
    }
    if (delta !== 0) {
      paintDirtyRef.current = true
      setInkUsed(u => Math.max(0, u + delta))
      setSolvedNow(false)
    }
  }

  const hitLamp = (x, y) => {
    let best = -1
    let bestD = 22
    liveRef.current.lamps.forEach((l, i) => {
      const d = Math.hypot(l.x - x, l.y - y)
      if (d < bestD) { best = i; bestD = d }
    })
    return best
  }

  const moveLamp = (i, x, y) => {
    const [cx, cy] = clampToZone(liveRef.current.room, x, y)
    setLamps(ls => ls.map((l, k) => (k === i ? { ...l, x: cx, y: cy } : l)))
    setSolvedNow(false)
  }

  const onPointerDown = e => {
    if (status !== 'ready' || phase !== 'play') return
    // Cards and their buttons sit inside the stage; a press on them must not
    // paint, and capturing the pointer here would swallow their click.
    if (e.target instanceof Element && e.target.closest('.sp-card, .sp-fallback, button, a')) return
    audioRef.current?.wake()
    const [x, y] = toScene(e)
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const live = liveRef.current
    const hit = hitLamp(x, y)
    if (hit >= 0) {
      setSelected(hit)
      dragRef.current = { type: 'lamp', i: hit, dx: live.lamps[hit].x - x, dy: live.lamps[hit].y - y }
      return
    }
    if (live.xray) {
      dragRef.current = { type: 'lens' }
      setLens([x, y])
      return
    }
    if (live.tool === 'paint' && (!live.pigment || live.inkLeft <= 0)) return
    pushUndo()
    dragRef.current = { type: 'paint', x, y }
    paintSegment(x, y, x, y)
    audioRef.current?.paint()
  }

  const onPointerMove = e => {
    if (status !== 'ready') return
    const [x, y] = toScene(e)
    const drag = dragRef.current
    if (liveRef.current.xray && (!drag || drag.type === 'lens')) setLens([x, y])
    if (!drag) return
    if (drag.type === 'lamp') moveLamp(drag.i, x + drag.dx, y + drag.dy)
    else if (drag.type === 'paint') {
      paintSegment(drag.x, drag.y, x, y)
      drag.x = x
      drag.y = y
    }
  }

  const onPointerUp = () => {
    const drag = dragRef.current
    dragRef.current = null
    if (drag?.type === 'lamp') audioRef.current?.lamp()
    // A fresh settled reading re-arms the asleep check now the hand is off the room.
    giRef.current?.invalidate(2)
  }

  useEffect(() => {
    const onKey = e => {
      if (e.target instanceof HTMLElement && /input|textarea|select/i.test(e.target.tagName)) return
      const live = liveRef.current
      if (live.phase !== 'play') {
        if (live.phase === 'title' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setPhase('play') }
        return
      }
      const key = e.key
      const pig = PIGMENT_ORDER.find(id => PIGMENTS[id].key === key)
      if (pig && live.room.pigments.includes(pig)) { setPigment(pig); setTool('paint'); return }
      if (key === 'e' || key === 'E') { setTool(t => (t === 'erase' ? 'paint' : 'erase')); return }
      if (key === 'x' || key === 'X') { setXray(v => !v); return }
      if (key === '[') { setLevel(l => Math.max(0, l - 1)); return }
      if (key === ']') { setLevel(l => Math.min(LEVELS - 1, l + 1)); return }
      if ((key === 'z' || key === 'Z') && !e.shiftKey) { e.preventDefault(); undo(); return }
      if (key === 'r' || key === 'R') { resetRoom(); return }
      if (key === 'm' || key === 'M') { setMuted(m => { audioRef.current?.setMuted(!m); return !m }); return }
      if ((key === 'n' || key === 'N') && live.solvedNow) { nextRoom(); return }
      if ((key === 'l' || key === 'L') && live.lamps.length > 1) {
        setSelected(s => (s + (e.shiftKey ? live.lamps.length - 1 : 1)) % live.lamps.length)
        return
      }
      const step = e.shiftKey ? 12 : 3
      const dirs = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
      if (dirs[key] && live.lamps[live.selected]) {
        e.preventDefault()
        audioRef.current?.wake()
        const l = live.lamps[live.selected]
        moveLamp(live.selected, l.x + dirs[key][0], l.y + dirs[key][1])
        giRef.current?.invalidate()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const begin = () => {
    audioRef.current?.wake()
    setPhase('play')
  }

  const unlocked = unlockedCount(progress.solved)
  const info = cascadeInfo(level)
  const catsOk = readings.filter((r, i) => room.creatures[i]?.kind === 'cat' && r.ok).length
  const catCount = room.creatures.filter(c => c.kind === 'cat').length
  const hushReading = readings.find((r, i) => room.creatures[i]?.kind === 'hush')
  const totalInk = Object.values(progress.solved).reduce((a, s) => a + (s.ink || 0), 0)
  // Keep the "asleep" card off the cats it is celebrating.
  const cardAtTop = room.creatures.reduce((a, c) => a + c.y, 0) / room.creatures.length > H / 2

  return (
    <div className={`sp-root ${reduced ? 'is-reduced' : ''}`} data-testid="sunpatch-root">
      <header className="sp-top">
        <div className="sp-nav"><ExperimentNav currentCategory={category?.slug} currentExperiment={experiment?.slug} /></div>
        <div className="sp-title">
          <span className="sp-name">sunpatch.cascade()</span>
          <span className="sp-sub">{room.studio ? 'studio' : `room ${roomIndex + 1} of ${PUZZLE_COUNT}`} · {room.title}</span>
        </div>
        <div className="sp-top-actions">
          <button type="button" className={`sp-chip ${xray ? 'is-on' : ''}`} onClick={() => setXray(v => !v)} aria-pressed={xray} data-playground-action="xray" data-testid="sp-xray">
            x-ray <kbd>X</kbd>
          </button>
          <button
            type="button" className={`sp-chip ${muted ? '' : 'is-on'}`} aria-pressed={!muted} aria-label="Sound"
            onClick={() => { audioRef.current?.wake(); audioRef.current?.setMuted(!muted); setMuted(!muted) }}
          >
            <span className="sp-long">{muted ? 'sound off' : 'sound on'}</span>
            <span className="sp-short" aria-hidden="true">{muted ? '♪ off' : '♪'}</span>
          </button>
        </div>
      </header>

      <main className="sp-main">
        <section className="sp-stagewrap">
          <div
            className={`sp-stage ${xray ? 'is-xray' : ''} tool-${tool}`}
            ref={stageRef}
            data-playground-surface
            data-testid="sp-stage"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={() => { if (!dragRef.current) setLens(null) }}
          >
            <canvas ref={canvasRef} className="sp-canvas" aria-label={`A room lit in real time. ${catsOk} of ${catCount} cats warm${hushReading ? `, hush ${hushReading.mood}` : ''}.`} />
            <svg className="sp-overlay" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
              {room.lampZone && (
                <rect x={room.lampZone.x} y={room.lampZone.y} width={room.lampZone.w} height={room.lampZone.h} className="sp-zone" />
              )}
              {room.creatures.map((c, i) => (
                <g key={c.id} transform={`translate(${c.x} ${c.y})`} data-testid={`sp-creature-${c.id}`} data-lux={readings[i] ? readings[i].lux.toFixed(2) : ''} data-ok={readings[i]?.ok ? '1' : '0'}>
                  <Gauge c={c} reading={readings[i]} />
                  {c.kind === 'cat' ? <CatGlyph c={c} reading={readings[i]} /> : <HushGlyph reading={readings[i]} />}
                </g>
              ))}
              {lamps.map((l, i) => (
                <g key={l.id} transform={`translate(${l.x} ${l.y})`} className={`sp-lamp ${i === selected ? 'is-selected' : ''}`}>
                  <circle r="15" fill="transparent" stroke={LAMP_KINDS[l.kind].swatch} />
                </g>
              ))}
              {xray && <Lens at={lens || (lamps[selected] ? [lamps[selected].x + 40, lamps[selected].y] : null)} level={level} />}
            </svg>

            {status === 'unsupported' && (
              <div className="sp-fallback" data-testid="sp-fallback">
                <img src={`${import.meta.env.BASE_URL}playground/sunpatch-cascade/still.jpg`} alt="A dark room where lamplight pools around a sleeping cat" />
                <div>
                  <h2>This room is lit by your GPU</h2>
                  <p>{statusNote} sunpatch.cascade() traces every ray in the room live with WebGPU compute shaders. Open it in a current Chrome, Edge or Safari, or in Firefox with WebGPU enabled, to play.</p>
                </div>
              </div>
            )}
            {status === 'lost' && (
              <div className="sp-card sp-card-center" role="alert">
                <h2>The GPU let go of the room</h2>
                <p>{statusNote}</p>
                <button type="button" className="sp-primary" onClick={() => window.location.reload()}>Light it again</button>
              </div>
            )}
            {status === 'starting' && <div className="sp-card sp-card-center" role="status"><p>warming the lamps…</p></div>}

            {phase === 'title' && status === 'ready' && (
              <div className="sp-card sp-card-title">
                <p className="sp-kicker">radiance cascades · webgpu compute</p>
                <h1>cats sleep where light pools</h1>
                <p className="sp-short">Live global illumination on your GPU. Move the lamp, warm the cat, keep the hush in the dark.</p>
                <p className="sp-long">Every ray in this room is traced on your GPU, live: {giInfo ? `${(giInfo.rays / 1e6).toFixed(1)} million rays across ${giInfo.levels} cascades` : 'millions of rays'} each time anything moves. Move the lamps, paint walls that cast shadows or throw light back, and put each cat in a warm patch without waking the hush.</p>
                <button type="button" className="sp-primary" onClick={begin} data-playground-primary data-testid="sp-begin">
                  {progress.solved[ROOMS[0].id] ? 'Back to the rooms' : 'Enter the first room'}
                </button>
              </div>
            )}

            {xray && phase === 'play' && (
              <div className="sp-xray-tag" aria-live="polite">
                x-ray · cascade {level} · probe every {info.spacing} px · {info.rays} rays · {fmt(info.start)}–{fmt(info.end)} px
              </div>
            )}

            {phase === 'play' && solvedNow && !room.studio && (
              <div className={`sp-card sp-card-solved ${cardAtTop ? 'is-top' : ''}`} role="status" data-testid="sp-solved">
                <p className="sp-kicker">room {roomIndex + 1} · asleep</p>
                <h2>{catCount === 1 ? 'the cat is asleep in the patch' : 'both cats asleep'}{hushReading ? ', and the hush never woke' : ''}</h2>
                <p>{room.lesson}</p>
                <p className="sp-meta">ink used: {inkUsed} px{progress.solved[room.id] && progress.solved[room.id].ink < inkUsed ? ` (best ${progress.solved[room.id].ink})` : ''}</p>
                <button type="button" className="sp-primary" onClick={nextRoom} data-playground-action="next-room" data-testid="sp-next">
                  {roomIndex + 1 >= PUZZLE_COUNT ? 'Close the last door' : 'Next room'} <kbd>N</kbd>
                </button>
              </div>
            )}

            {phase === 'ending' && (
              <div className="sp-card sp-card-center sp-card-ending" data-testid="sp-ending">
                <p className="sp-kicker">every room asleep</p>
                <h2>four rooms, every cat in a sunpatch</h2>
                <p>You shaped light with lamps, soot and chalk while a radiance-cascade solver re-traced the room each time you moved anything. Total ink: {totalInk} px.</p>
                <div className="sp-row">
                  <button type="button" className="sp-primary" onClick={() => goRoom(ROOMS.length - 1)} data-playground-action="studio" data-testid="sp-studio">Open the studio</button>
                  <button type="button" className="sp-secondary" onClick={() => goRoom(0)}>Start again</button>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="sp-panel" aria-label="Room controls">
          <section className="sp-block sp-brief">
            <p>{room.brief}</p>
            <ul className="sp-goals">
              {room.creatures.map((c, i) => {
                const r = readings[i]
                return (
                  <li key={c.id} className={r?.ok ? 'is-ok' : r ? 'is-not' : ''}>
                    <span className="sp-dot" style={{ background: c.kind === 'hush' ? '#5c4d80' : c.fur }} />
                    <span className="sp-goal-name">{c.kind === 'hush' ? 'the hush' : c.name}</span>
                    <span className="sp-goal-mood">{r ? r.mood : '…'}</span>
                    <span className="sp-goal-num">
                      {r ? fmt(r.lux) : '·'} {c.kind === 'hush' ? `≤ ${c.limit}` : `≥ ${c.need} ${c.want}`}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="sp-block">
            <h3>lamps <span className="sp-hint">drag them, or <kbd>L</kbd> and the arrow keys</span></h3>
            <div className="sp-row sp-lamps">
              {lamps.map((l, i) => (
                <button
                  key={l.id} type="button" className={`sp-lampbtn ${i === selected ? 'is-on' : ''}`}
                  onClick={() => setSelected(i)} aria-pressed={i === selected} data-playground-action={`lamp-${i}`}
                >
                  <i style={{ background: LAMP_KINDS[l.kind].swatch }} />{LAMP_KINDS[l.kind].label}
                </button>
              ))}
            </div>
            {room.lampZone && <p className="sp-hint">Lamps stay inside the dashed cellar.</p>}
          </section>

          {room.pigments.length > 0 && (
            <section className="sp-block">
              <h3>paint <span className="sp-hint">{room.ink === Infinity ? 'unlimited ink' : `${inkLeft} px of ink left`}</span></h3>
              {room.ink !== Infinity && <div className="sp-ink"><i style={{ width: `${(inkLeft / room.ink) * 100}%` }} /></div>}
              <div className="sp-row" role="radiogroup" aria-label="Pigment">
                {room.pigments.map(id => (
                  <button
                    key={id} type="button" role="radio" aria-checked={tool === 'paint' && pigment === id}
                    className={`sp-pigment ${tool === 'paint' && pigment === id ? 'is-on' : ''}`}
                    onClick={() => { setPigment(id); setTool('paint') }} data-playground-action={`pigment-${id}`} data-testid={`sp-pigment-${id}`}
                    title={PIGMENTS[id].note}
                  >
                    <i style={{ background: PIGMENTS[id].swatch }} />{PIGMENTS[id].label} <kbd>{PIGMENTS[id].key}</kbd>
                  </button>
                ))}
                <button type="button" className={`sp-pigment ${tool === 'erase' ? 'is-on' : ''}`} onClick={() => setTool(t => (t === 'erase' ? 'paint' : 'erase'))} aria-pressed={tool === 'erase'} data-playground-action="erase">
                  Erase <kbd>E</kbd>
                </button>
              </div>
              {pigment && <p className="sp-hint">{PIGMENTS[pigment].label}: {PIGMENTS[pigment].note}.</p>}
            </section>
          )}

          <section className="sp-block sp-row">
            <button type="button" className="sp-secondary" onClick={undo} data-playground-action="undo">Undo <kbd>Z</kbd></button>
            <button type="button" className="sp-secondary" onClick={resetRoom} data-playground-action="reset" data-testid="sp-reset">Reset room <kbd>R</kbd></button>
          </section>

          <section className={`sp-block sp-xray ${xray ? 'is-open' : ''}`}>
            <h3>how the light is solved</h3>
            {xray ? (
              <>
                <div className="sp-row" role="radiogroup" aria-label="Cascade level">
                  {Array.from({ length: LEVELS }, (_, l) => (
                    <button key={l} type="button" role="radio" aria-checked={level === l} className={`sp-level ${level === l ? 'is-on' : ''}`} onClick={() => setLevel(l)} data-playground-action={`cascade-${l}`}>
                      c{l}
                    </button>
                  ))}
                </div>
                <p>
                  <b>Cascade {level}</b>: a probe every {info.spacing} px, each casting {info.rays} rays that only look from {fmt(info.start)} to {fmt(info.end)} px away. The room shows this cascade's raw probe mosaic: every tile is one probe, and every pixel in a tile is one direction. Hover or drag on the room to move the lens. Use <kbd>[</kbd> <kbd>]</kbd> to change level.
                </p>
                <p className="sp-hint">{room.lesson}</p>
              </>
            ) : (
              <p>
                Light comes from radiance cascades, a 2023 real-time global-illumination technique. Coarse cascades see far with many directions; fine ones see near with few. They are merged from the top down every time the room changes. Turn on x-ray to see them.
              </p>
            )}
            {giInfo && <p className="sp-meta">{giInfo.levels} cascades · {(giInfo.rays / 1e6).toFixed(2)}M rays per solve · bounce light settles over 24 frames</p>}
          </section>

          <nav className="sp-block" aria-label="Rooms">
            <h3>rooms</h3>
            <div className="sp-row">
              {ROOMS.map((r, i) => (
                <button
                  key={r.id} type="button" disabled={i >= unlocked}
                  className={`sp-room ${i === roomIndex ? 'is-on' : ''} ${progress.solved[r.id] ? 'is-done' : ''}`}
                  onClick={() => goRoom(i)} data-playground-action={`room-${i}`}
                >
                  {r.studio ? 'studio' : i + 1}
                </button>
              ))}
            </div>
          </nav>
        </aside>
      </main>
    </div>
  )
}
