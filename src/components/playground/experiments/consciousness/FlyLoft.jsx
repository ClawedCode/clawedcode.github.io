import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SHOWS, PIECES, SEATS, pipeRange, placePieces, linesOf } from './flyloft/house.js'
import { wedgeEnd, solveSeat } from './flyloft/sightlines.js'
import { createScenery, drawView, SCENE_TINT } from './flyloft/paint.js'
import { createLoftAudio } from './flyloft/audio.js'
import { freshBook, setTrim, swapLines, pieceOnLine, roughIn, analyse, judgeCue, writeNotice, shortName, plural } from './flyloft/book.js'
import './FlyLoft.css'

const BOOK_KEY = 'fly-loft.book'
const NOTICE_KEY = 'fly-loft.notices'
const SEEN_KEY = 'fly-loft.seen'

const readJSON = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
const writeJSON = (key, value) => {
  try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
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

const round1 = (v) => Math.round(v * 10) / 10
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const SY = (y) => 23 - y // section: metres up → svg down

const QUIP = {
  hanging: (n) => `is that ${n} up there?`,
  pipe: () => 'I can see a pipe.',
  wall: () => 'that is a brick wall.',
  roof: () => 'you can see right up to the roof.',
  cropped: (n) => `where is the rest of ${n}?`,
  buried: (n) => `where is ${n}?`,
  'too-low': (n) => `${n} is very low.`,
  'too-high': (n) => `${n} is very high.`,
  'off-deck': (n) => `${n} is floating.`,
  sunk: (n) => `${n} never came up.`,
  exposed: (n) => `you can see the whole of ${n}.`
}

// what the rest of the house says when a scene lands clean
const PRAISE = [
  'not a rope in sight.',
  'how does it just hang there?',
  'where did the last scene go?',
  'it looks a mile deep.',
  'I could swear that is real water.'
]

const isUnlocked = (notices, i) => i === 0 || (notices[SHOWS[i - 1].id] && notices[SHOWS[i - 1].id].stars >= 2)

function isValidBook(show, b) {
  if (!b || !b.hang || !Array.isArray(b.cues) || b.cues.length !== show.scenes.length) return false
  const lines = show.pieces.map((id) => b.hang[id])
  if (lines.some((l) => typeof l !== 'number' || l < 0 || l >= linesOf(show).length)) return false
  if (new Set(lines).size !== lines.length) return false
  return show.pieces.every((id) => typeof b.cues[0][id] === 'number')
}

function buildTimeline(show, result, reduced) {
  const steps = []
  steps.push({ kind: 'curtain', dir: 'up', cue: 0, dur: reduced ? 0.6 : 2.4 })
  show.scenes.forEach((_, k) => {
    if (k > 0) {
      const ch = result.cues[k].change
      if (!ch.passes.length) steps.push({ kind: 'change', cue: k, passIdx: 0, pass: null, dur: reduced ? 0.4 : 1 })
      ch.passes.forEach((p, i) => steps.push({ kind: 'change', cue: k, passIdx: i, pass: p, dur: reduced ? 0.8 : p.time }))
    }
    steps.push({ kind: 'hold', cue: k, dur: reduced ? 4 : 5.2 })
  })
  steps.push({ kind: 'curtain', dir: 'down', cue: show.scenes.length - 1, dur: reduced ? 0.6 : 2.4 })
  if (result.stars >= 2) steps.push({ kind: 'call', cue: show.scenes.length - 1, dur: reduced ? 1.5 : 4 })
  let t = 0
  for (const s of steps) { s.t0 = t; t += s.dur }
  return { steps, total: t }
}

const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u))

function trimsAt(show, tracks, step, u, reduced) {
  const k = step.cue
  if (step.kind !== 'change') return tracks[k]
  const cur = { ...tracks[k - 1] }
  const passes = trackPasses(show, tracks, k)
  for (let i = 0; i < step.passIdx; i++) for (const m of passes[i].moves) cur[m.id] = m.to
  if (step.pass) {
    const haul = reduced ? (u > 0.5 ? 1 : 0) : ease((u * step.dur - 0.5) / Math.max(0.2, step.dur - 1.2))
    for (const m of step.pass.moves) cur[m.id] = m.from + (m.to - m.from) * haul
  }
  return cur
}
const trackPasses = (show, tracks, k) => {
  // mirror of planChange in book.js, kept local to avoid recomputing the analysis inside the frame loop
  const moves = []
  for (const id of show.pieces) {
    const a = tracks[k - 1][id]
    const b = tracks[k][id]
    if (Math.abs(a - b) > 0.001) moves.push({ id, from: a, to: b, travel: Math.abs(a - b) })
  }
  moves.sort((m, n) => n.travel - m.travel)
  const out = []
  for (let i = 0; i < moves.length; i += show.crew) out.push({ moves: moves.slice(i, i + show.crew) })
  return out
}

export default function FlyLoft() {
  const reduced = useReducedMotion()
  const [showIdx, setShowIdx] = useState(0)
  const show = SHOWS[showIdx]
  const lines = linesOf(show)
  const [books, setBooks] = useState(() => readJSON(BOOK_KEY, {}))
  const book = isValidBook(show, books[show.id]) ? books[show.id] : freshBook(show)
  const [notices, setNotices] = useState(() => readJSON(NOTICE_KEY, {}))
  const [cue, setCue] = useState(0)
  const [seat, setSeat] = useState('A')
  const [freeEye, setFreeEye] = useState({ x: -9, y: 2.6 })
  const [selLine, setSelLine] = useState(1)
  const [swapFrom, setSwapFrom] = useState(null)
  const [mode, setMode] = useState('build') // build | show | notice
  const [perf, setPerf] = useState(null) // { stepIdx, caption, whispers }
  const [notice, setNotice] = useState(null)
  const [help, setHelp] = useState(() => !readJSON(SEEN_KEY, false))
  const [muted, setMuted] = useState(false)
  const [drag, setDrag] = useState(null)
  const [viewSize, setViewSize] = useState({ w: 800, h: 520 })
  const [wideSection, setWideSection] = useState(false)
  const [secSize, setSecSize] = useState({ w: 400, h: 300 })
  const secRef = useRef(null)
  const timersRef = useRef([])
  const later = useCallback((fn, ms) => { timersRef.current.push(setTimeout(fn, ms)) }, [])
  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = [] }
  const dispRef = useRef(null)
  const tweenRef = useRef(0)
  const historyRef = useRef([])
  const lastPushRef = useRef(0)
  const audioRef = useRef(null)
  const sceneryRef = useRef(null)
  const canvasRef = useRef(null)
  const viewRef = useRef(null)
  const svgRef = useRef(null)
  const rafRef = useRef(0)
  const perfRef = useRef(null)
  const helpCloseRef = useRef(null)
  const noticeRef = useRef(null)
  const railRefs = useRef([])

  const result = useMemo(() => analyse(show, book), [show, book])
  const tracks = result.tracks
  const trims = tracks[cue]
  const scene = show.scenes[cue]
  const seatIds = show.seats
  const activeSeat = seat === 'eye' ? null : seatIds.includes(seat) ? seat : 'A'
  const viewEye = activeSeat ? SEATS[activeSeat].eye : freeEye
  const freeJudge = useMemo(() => (activeSeat ? null : judgeCue(show, book, trims, cue, freeEye).bySeat.eye), [activeSeat, show, book, trims, cue, freeEye])
  const viewFaults = activeSeat ? result.cues[cue].bySeat[activeSeat].faults : freeJudge.faults

  // ---- persistence
  useEffect(() => { writeJSON(BOOK_KEY, books) }, [books])
  useEffect(() => { writeJSON(NOTICE_KEY, notices) }, [notices])

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = createLoftAudio()
      if (audioRef.current) audioRef.current.setMuted(muted)
    }
    if (audioRef.current) audioRef.current.resume()
    return audioRef.current
  }, [muted])
  useEffect(() => { if (audioRef.current) audioRef.current.setMuted(muted) }, [muted])
  useEffect(() => () => {
    clearTimers()
    cancelAnimationFrame(tweenRef.current)
    if (audioRef.current) audioRef.current.close()
  }, [])

  // ---- editing
  const commit = useCallback((next, { coalesce = false } = {}) => {
    const now = performance.now()
    if (!coalesce || now - lastPushRef.current > 700) {
      historyRef.current = [...historyRef.current.slice(-59), { showId: show.id, book }]
    }
    lastPushRef.current = now
    setBooks((b) => ({ ...b, [show.id]: next }))
  }, [show.id, book])

  const undo = useCallback(() => {
    const h = historyRef.current
    for (let i = h.length - 1; i >= 0; i--) {
      if (h[i].showId === show.id) {
        const prev = h[i].book
        historyRef.current = h.slice(0, i)
        setBooks((b) => ({ ...b, [show.id]: prev }))
        return
      }
    }
  }, [show.id])

  const pieceAt = (line) => pieceOnLine(book, line)
  const selPiece = pieceAt(selLine)

  const setLineTrim = useCallback((line, value, opts) => {
    const id = pieceOnLine(book, line)
    if (!id) return
    const [lo, hi] = pipeRange(PIECES[id], show.houseSpec)
    commit(setTrim(show, book, cue, id, round1(clamp(value, lo, hi))), opts)
  }, [book, show, cue, commit])

  const flyIn = useCallback((line) => {
    const id = pieceOnLine(book, line)
    if (!id) return
    const p = PIECES[id]
    const [lo, hi] = pipeRange(p, show.houseSpec)
    if (p.kind === 'border') return setLineTrim(line, Math.min(hi, show.houseSpec.prosH + p.h - 0.5))
    if (p.kind === 'cut') {
      const rule = (scene.cut && scene.cut[id]) || {}
      const bottom = rule.maxBottom != null ? rule.maxBottom : (rule.minBottom ?? 0) + 0.6
      return setLineTrim(line, Math.min(hi, bottom + p.h + p.wire))
    }
    setLineTrim(line, lo)
  }, [book, show, scene, setLineTrim])
  const flyOut = useCallback((line) => {
    const id = pieceOnLine(book, line)
    if (!id) return
    setLineTrim(line, pipeRange(PIECES[id], show.houseSpec)[1])
  }, [book, show, setLineTrim])

  const swap = useCallback((a, b) => {
    if (a === b || b < 0 || b >= lines.length) return
    commit(swapLines(book, a, b))
    setSelLine(b)
    ensureAudio()?.knock()
  }, [book, commit, ensureAudio, lines])

  const rough = useCallback(() => {
    commit(roughIn(show, book, cue))
    ensureAudio()?.knock()
  }, [show, book, cue, commit, ensureAudio])

  const resetShow = useCallback(() => {
    commit(freshBook(show))
    setCue(0)
  }, [show, commit])

  const switchShow = useCallback((i) => {
    if (mode === 'show' || !isUnlocked(notices, i)) return
    setShowIdx(i)
    setCue(0)
    setMode('build')
    setNotice(null)
    setSwapFrom(null)
    setSeat((s) => (s === 'G' && !SHOWS[i].seats.includes('G') ? 'A' : s))
    setSelLine(1)
    dispRef.current = null
  }, [mode, notices])

  useEffect(() => {
    const el = secRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(([e]) => setSecSize({ w: Math.max(100, e.contentRect.width), h: Math.max(100, e.contentRect.height) }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ---- view canvas sizing
  useEffect(() => {
    const el = viewRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect
      setViewSize({ w: Math.max(200, Math.round(r.width)), h: Math.max(160, Math.round(r.height)) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const paint = useCallback((opts) => {
    const c = canvasRef.current
    if (!c) return
    if (!sceneryRef.current) sceneryRef.current = createScenery()
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const W = viewSize.w
    const H = viewSize.h
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
      c.width = Math.round(W * dpr)
      c.height = Math.round(H * dpr)
    }
    const ctx = c.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawView(ctx, W, H, sceneryRef.current, opts)
  }, [viewSize])
  const paintRef = useRef(paint)
  useEffect(() => { paintRef.current = paint }, [paint])

  const sceneTint = (k) => {
    const drop = show.scenes[k].in.find((id) => PIECES[id].kind === 'drop')
    return drop ? SCENE_TINT[PIECES[drop].paint] : null
  }

  // build frames: every edit flies the battens to their new trims (snapped under reduced motion)
  const hangKey = JSON.stringify(book.hang)
  useEffect(() => {
    if (mode === 'show') return undefined
    cancelAnimationFrame(tweenRef.current)
    const frame = (tr, ovation = 0, t = 0) => paint({
      pieces: placePieces(show, book.hang, tr),
      house: show.houseSpec,
      eye: viewEye,
      faults: mode === 'notice' ? [] : viewFaults,
      tint: sceneTint(cue),
      curtain: mode === 'notice' ? 1 : 0,
      labels: mode !== 'notice',
      foreground: activeSeat || 'eye',
      houseName: show.house.replace(/^the /, '').replace(/, on tour$/, ''),
      ovation,
      t
    })
    const prev = dispRef.current
    const same = prev && prev.key === `${show.id}|${hangKey}`
    if (mode === 'notice' && notice && notice.stars >= 2 && !reduced) {
      // the house stays on its feet behind the notice
      const t0 = performance.now()
      const loop = (now) => {
        frame(trims, 1, (now - t0) / 1000)
        if ((now - t0) / 1000 < 6) tweenRef.current = requestAnimationFrame(loop)
      }
      tweenRef.current = requestAnimationFrame(loop)
      dispRef.current = { key: `${show.id}|${hangKey}`, trims }
      return () => cancelAnimationFrame(tweenRef.current)
    }
    if (reduced || !same) {
      frame(trims, mode === 'notice' && notice && notice.stars >= 2 ? 1 : 0)
      dispRef.current = { key: `${show.id}|${hangKey}`, trims }
      return undefined
    }
    const from = prev.trims
    const t0 = performance.now()
    const D = 280
    const loop = (now) => {
      const u = ease(Math.min(1, (now - t0) / D))
      const tr = {}
      for (const id of show.pieces) tr[id] = from[id] + (trims[id] - from[id]) * u
      frame(tr)
      dispRef.current = { key: `${show.id}|${hangKey}`, trims: tr }
      if (u < 1) tweenRef.current = requestAnimationFrame(loop)
    }
    tweenRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(tweenRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paint, mode, show, hangKey, trims, viewEye, viewFaults, cue, reduced, notice])

  // ---- performance
  const stopShow = useCallback(() => {
    clearTimers()
    cancelAnimationFrame(rafRef.current)
    perfRef.current = null
    setPerf(null)
    setMode('build')
    if (audioRef.current) { audioRef.current.setRope(0); audioRef.current.murmur(0) }
  }, [])

  const finishShow = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const run = perfRef.current
    perfRef.current = null
    const n = writeNotice(show, result)
    const prev = notices[show.id]
    const best = !prev || result.stars > prev.stars ? { stars: result.stars, headline: n.headline, at: Date.now() } : prev
    setNotices((all) => ({ ...all, [show.id]: best }))
    setNotice({ ...n, stars: result.stars, faults: result.faultCount, time: result.changeTime, picture: result.picture, best: best.stars, seatLabel: run ? run.seatLabel : '' })
    setPerf(null)
    setMode('notice')
    const a = audioRef.current
    if (a) { a.setRope(0); a.murmur(0.25); a.applause(result.stars); later(() => a.murmur(0), 2600) }
  }, [show, result, notices, later])

  const curtainUp = useCallback(() => {
    const a = ensureAudio()
    const perfSeat = activeSeat || 'P'
    const tl = buildTimeline(show, result, reduced)
    perfRef.current = { tl, start: performance.now(), stepIdx: -1, seat: perfSeat, seatLabel: SEATS[perfSeat].label }
    setMode('show')
    setNotice(null)
    setSwapFrom(null)
    clearTimers()
    if (a) { a.bell(); a.murmur(0.5) }
  }, [ensureAudio, activeSeat, show, result, reduced])

  useEffect(() => {
    if (mode !== 'show' || !perfRef.current) return undefined
    const scenery = sceneryRef.current
    void scenery
    const loop = (now) => {
      const run = perfRef.current
      if (!run) return
      const t = (now - run.start) / 1000
      const { steps, total } = run.tl
      if (t >= total) { finishShow(); return }
      let i = steps.findIndex((s) => t >= s.t0 && t < s.t0 + s.dur)
      if (i < 0) i = steps.length - 1
      const step = steps[i]
      const u = (t - step.t0) / step.dur
      const a = audioRef.current
      if (i !== run.stepIdx) {
        const prevStep = steps[run.stepIdx]
        run.stepIdx = i
        if (prevStep && prevStep.kind === 'change' && prevStep.pass && a) a.knock()
        const k = step.cue
        const sc = show.scenes[k]
        const faults = result.cues[k].faults
        const others = show.seats.filter((sid) => sid !== run.seat)
        let whispers = []
        if (step.kind === 'hold') {
          whispers = faults.filter((f) => f.seat !== run.seat).slice(0, 2).map((f) => ({ seat: f.seat, text: QUIP[f.type](f.id ? PIECES[f.id].name : '') }))
          if (!faults.length && others.length) whispers = [{ seat: others[(k + showIdx) % others.length], text: PRAISE[(k + showIdx * 2) % PRAISE.length], good: true }]
        }
        setPerf({
          stepIdx: i,
          kind: step.kind,
          cue: k,
          caption: step.kind === 'hold' ? { n: k + 1, title: sc.title, line: sc.line } : step.kind === 'change' ? { change: true, n: k + 1, pass: step.passIdx + 1, passes: Math.max(1, result.cues[k].change.passes.length) } : step.kind === 'call' ? { change: true, call: true } : null,
          whispers
        })
        if (a) {
          if (step.kind === 'hold') {
            a.motif(k + showIdx)
            a.setRope(0)
            if (result.cues[k].bySeat[run.seat].faults.length) later(() => a.gasp(), 900)
          }
          if (step.kind === 'change' && step.pass) a.setRope(step.pass.moves.reduce((s, m) => s + m.travel / step.pass.time, 0) * 1.4)
          if (step.kind === 'curtain') a.setRope(1.2)
          if (step.kind === 'call') { a.setRope(0.6); a.applause(result.stars) }
        }
      }
      const tr = trimsAt(show, tracks, step, u, reduced)
      let curtain = 0
      if (step.kind === 'curtain') curtain = step.dir === 'up' ? 1 - ease(u) : ease(u)
      const holdFaults = step.kind === 'hold' ? result.cues[step.cue].bySeat[run.seat].faults : []
      let ovation = step.kind === 'curtain' && step.dir === 'down' && result.stars >= 2 && !reduced ? ease(u) : 0
      let bow = 0
      if (step.kind === 'call') {
        // the tabs fly out again for a call: the cast cat comes down to the lip and bows
        ovation = 1
        bow = reduced ? 1 : Math.sin(Math.PI * Math.min(1, u * 1.15))
        curtain = reduced ? 0.2 : 1 - 0.85 * Math.sin(Math.PI * u)
      }
      paintRef.current({
        ovation,
        bow,
        t,
        foreground: run.seat,
        houseName: show.house.replace(/^the /, '').replace(/, on tour$/, ''),
        pieces: placePieces(show, book.hang, tr),
        house: show.houseSpec,
        eye: SEATS[run.seat].eye,
        faults: holdFaults,
        tint: sceneTint(step.cue),
        dim: step.kind === 'change' ? 0.5 : 0,
        curtain: reduced && step.kind === 'curtain' ? (step.dir === 'up' ? 0 : 1) : curtain,
        dimHouse: step.kind === 'call' ? 0 : 1,
        labels: step.kind === 'hold' && u > 0.15
      })
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // ---- keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = e.target && e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (help) {
        if (e.key === 'Escape') { e.preventDefault(); setHelp(false) }
        return
      }
      if (mode === 'show') {
        if (e.key === 'Escape') { e.preventDefault(); stopShow() }
        return
      }
      if (mode === 'notice' && e.key === 'Escape') { e.preventDefault(); setMode('build'); return }
      const k = e.key
      if (k === '?') { e.preventDefault(); setHelp(true) }
      else if (k === 'm' || k === 'M') { ensureAudio(); setMuted((m) => !m) }
      else if (k === 'z' || k === 'Z') { e.preventDefault(); undo() }
      else if (k === ',' || k === '<') { e.preventDefault(); setCue((c) => Math.max(0, c - 1)) }
      else if (k === '.' || k === '>') { e.preventDefault(); setCue((c) => Math.min(show.scenes.length - 1, c + 1)) }
      else if (k === 'g' || k === 'G') { e.preventDefault(); curtainUp() }
      else if (k === 'r' || k === 'R') { e.preventDefault(); rough() }
      else if (k === 'e' || k === 'E') { setSeat('eye') }
      else if (/^[1-3]$/.test(k)) {
        const id = seatIds[Number(k) - 1]
        if (id) setSeat(id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [help, mode, stopShow, ensureAudio, undo, show, curtainUp, rough, seatIds])

  const onRailKey = (line) => (e) => {
    const id = pieceOnLine(book, line)
    if (!id) return
    const cur = trims[id]
    const big = e.shiftKey ? 1 : 0.1
    let handled = true
    if (e.key === 'ArrowUp') setLineTrim(line, cur + big, { coalesce: true })
    else if (e.key === 'ArrowDown') setLineTrim(line, cur - big, { coalesce: true })
    else if (e.key === 'PageUp') setLineTrim(line, cur + 1, { coalesce: true })
    else if (e.key === 'PageDown') setLineTrim(line, cur - 1, { coalesce: true })
    else if (e.key === 'Home' || e.key === 'o' || e.key === 'O') flyOut(line)
    else if (e.key === 'End' || e.key === 'i' || e.key === 'I') flyIn(line)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const n = clamp(line + (e.key === 'ArrowLeft' ? -1 : 1), 0, lines.length - 1)
      setSelLine(n)
      if (railRefs.current[n]) railRefs.current[n].focus()
    } else if (e.key === '[' || e.key === ']') {
      const n = line + (e.key === '[' ? -1 : 1)
      if (n >= 0 && n < lines.length) {
        swap(line, n)
        requestAnimationFrame(() => railRefs.current[n] && railRefs.current[n].focus())
      }
    } else handled = false
    if (handled) { e.preventDefault(); e.stopPropagation() }
  }

  // ---- rail drag
  const railDrag = useRef(null)
  const onRailDown = (line) => (e) => {
    if (mode !== 'build') return
    if (swapFrom != null) {
      if (line !== swapFrom) swap(swapFrom, line)
      else setSelLine(line)
      setSwapFrom(null)
      return
    }
    const id = pieceOnLine(book, line)
    setSelLine(line)
    if (!id) return
    ensureAudio()
    const rect = e.currentTarget.getBoundingClientRect()
    railDrag.current = { line, rect, id, y0: e.clientY, pipe0: trims[id], moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const applyRail = (e) => {
    const d = railDrag.current
    if (!d) return
    const dy = e.clientY - d.y0
    if (!d.moved) {
      if (Math.abs(dy) < 5) return
      d.moved = true
      historyRef.current = [...historyRef.current.slice(-59), { showId: show.id, book }]
      lastPushRef.current = performance.now()
    }
    const [lo, hi] = pipeRange(PIECES[d.id], show.houseSpec)
    // the arbor runs opposite to the batten: haul the arbor down and the piece flies out
    const v = d.pipe0 + (dy / d.rect.height) * (hi - lo)
    const before = trims[d.id]
    setLineTrim(d.line, v, { coalesce: true })
    if (audioRef.current) audioRef.current.setRope(Math.abs(v - before) * 6)
  }
  const onRailUp = () => {
    if (railDrag.current && railDrag.current.moved && audioRef.current) { audioRef.current.setRope(0); audioRef.current.knock() }
    railDrag.current = null
  }

  // ---- section interaction
  const toWorld = (e) => {
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(svg.getScreenCTM().inverse())
    return { x: p.x / secK, y: 23 - p.y }
  }
  const nearestLine = (x) => {
    let best = 0
    lines.forEach((lx, i) => { if (Math.abs(lx - x) < Math.abs(lines[best] - x)) best = i })
    return best
  }
  const onSectionDown = (e) => {
    if (mode !== 'build') return
    const w = toWorld(e)
    ensureAudio()
    if (w.x < -0.8) {
      if (!wideSection) return
      setSeat('eye')
      setFreeEye({ x: clamp(w.x, -16, -1.6), y: clamp(w.y, 0.9, 12) })
      setDrag({ kind: 'eye' })
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }
    const line = nearestLine(w.x)
    if (Math.abs(lines[line] - w.x) > lineGap * 0.55) return
    setSelLine(line)
    const id = pieceOnLine(book, line)
    if (!id) return
    historyRef.current = [...historyRef.current.slice(-59), { showId: show.id, book }]
    lastPushRef.current = performance.now()
    setDrag({ kind: 'line', line, id, y0: w.y, x0: w.x, pipe0: trims[id], target: line })
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onSectionMove = (e) => {
    if (!drag) return
    const w = toWorld(e)
    if (drag.kind === 'eye') {
      setFreeEye({ x: clamp(w.x, -16, -1.6), y: clamp(w.y, 0.9, 12) })
      return
    }
    const target = Math.abs(w.x - drag.x0) > 0.7 ? nearestLine(w.x) : drag.line
    if (target !== drag.target) setDrag((d) => ({ ...d, target }))
    if (target === drag.line) {
      const v = drag.pipe0 + (w.y - drag.y0)
      setLineTrim(drag.line, v, { coalesce: true })
      if (audioRef.current) audioRef.current.setRope(1)
    }
  }
  const onSectionUp = () => {
    if (drag && drag.kind === 'line') {
      if (drag.target !== drag.line) swap(drag.line, drag.target)
      else if (audioRef.current) { audioRef.current.setRope(0); audioRef.current.knock() }
    }
    setDrag(null)
  }

  // ---- focus management for dialogs
  useEffect(() => { if (help && helpCloseRef.current) helpCloseRef.current.focus() }, [help])
  useEffect(() => { if (mode === 'notice' && noticeRef.current) noticeRef.current.focus() }, [mode])
  const closeHelp = () => { setHelp(false); writeJSON(SEEN_KEY, true) }
  const trapTab = (e) => {
    if (e.key !== 'Tab') return
    const items = [...e.currentTarget.querySelectorAll('button, [href]')]
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  // ---- section drawing data
  const fans = useMemo(() => {
    const placed = placePieces(show, book.hang, trims)
    const list = activeSeat ? show.seats.map((s) => ({ id: s, eye: SEATS[s].eye, color: SEATS[s].color, strong: s === activeSeat })) : [{ id: 'eye', eye: freeEye, color: '#c9a24a', strong: true }]
    return list.map((s) => {
      const sol = solveSeat(s.eye, placed, show.houseSpec)
      const polys = sol.wedges.map((wd) => {
        const a = wedgeEnd(s.eye, wd.a, wd.end, wd.x, show.houseSpec)
        const b = wedgeEnd(s.eye, wd.b, wd.end, wd.x, show.houseSpec)
        return { pts: `${s.eye.x},${SY(s.eye.y)} ${a.x},${SY(a.y)} ${b.x},${SY(b.y)}`, bad: wd.end === 'wall' || wd.end === 'roof' }
      })
      return { ...s, polys }
    })
  }, [show, book, trims, activeSeat, freeEye])

  const H = show.houseSpec
  const lineGap = lines[1] - lines[0]
  const box = wideSection ? [-16.4, -0.6, 28.6, 24.4] : [-4.6, SY(H.grid + 1.7), H.backX + 5.4, H.grid + 2.4]
  // sideways exaggeration: an affine stretch keeps every sightline straight and every crossing true
  const secK = wideSection ? 1 : clamp((secSize.w / secSize.h) / (box[2] / box[3]), 1, 2.4)
  const sectionBox = `${box[0] * secK} ${box[1]} ${box[2] * secK} ${box[3]}`
  const cueResult = result.cues[cue]
  const change = cueResult.change
  const sealed = notices[show.id]

  const seatFaultCount = (k, sid) => result.cues[k].bySeat[sid].faults.length

  return (
    <div
      className={`fl-root is-${mode} ${reduced ? 'is-reduced' : ''}`}
      data-testid="fly-loft"
      data-show={show.id}
      data-cue={cue}
      data-seat={seat}
      data-faults={result.faultCount}
      data-change-time={result.changeTime.toFixed(1)}
      data-stars={result.stars}
      data-mode={mode}
    >
      <header className="fl-head">
        <Link to="/playground/consciousness" className="fl-back" aria-label="Back to the laboratory">←</Link>
        <div className="fl-title">
          <h1>fly.loft()</h1>
          <p><em>{show.title}</em> · {show.house}</p>
        </div>
        <nav className="fl-shows" aria-label="Houses">
          {SHOWS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`fl-showtab ${i === showIdx ? 'is-on' : ''} ${isUnlocked(notices, i) ? '' : 'is-locked'}`}
              onClick={() => switchShow(i)}
              aria-pressed={i === showIdx}
              disabled={mode === 'show' || !isUnlocked(notices, i)}
              title={isUnlocked(notices, i) ? s.house : `Booked once ${SHOWS[i - 1].house} gives you two stars`}
              data-testid={`fl-show-${s.id}`}
            >
              <span className="fl-num">{s.numeral}</span>
              <span className="fl-showname">{isUnlocked(notices, i) ? s.short : `after ${SHOWS[i - 1].numeral} ★★`}</span>
              {notices[s.id] && notices[s.id].stars > 0 && <span className="fl-stars" aria-label={`best notice ${notices[s.id].stars} of 3`}>{'★'.repeat(notices[s.id].stars)}</span>}
            </button>
          ))}
        </nav>
        <div className="fl-tools">
          <button type="button" className="fl-icon" onClick={() => { ensureAudio(); setMuted((m) => !m) }} aria-pressed={muted} aria-label={muted ? 'Sound off' : 'Sound on'} data-testid="fl-mute">{muted ? '♪̸' : '♪'}</button>
          <button type="button" className="fl-icon" onClick={() => setHelp(true)} aria-label="How the loft works" data-testid="fl-help-toggle">?</button>
        </div>
      </header>

      <section className="fl-view" data-playground-surface data-testid="fl-view" aria-label="The stage, seen from a seat">
        <div className="fl-canvas-wrap" ref={viewRef}>
          <canvas
            ref={canvasRef}
            style={{ width: viewSize.w, height: viewSize.h }}
            role="img"
            aria-label={`The stage in scene ${cue + 1}, ${scene.title}, seen from ${activeSeat ? SEATS[activeSeat].label : 'your own place in the house'}. ${viewFaults.length ? `${viewFaults.length} things showing that should not: ${viewFaults.map((f) => f.label).join(', ')}.` : 'Nothing showing that should not.'}`}
          />
        </div>
        {mode === 'build' && (
          <div className="fl-seatbar" role="group" aria-label="Sit in">
            {seatIds.map((sid, i) => (
              <button
                key={sid}
                type="button"
                className={`fl-seat ${seat === sid ? 'is-on' : ''} ${seatFaultCount(cue, sid) ? 'has-faults' : 'is-clean'}`}
                style={{ '--seat': SEATS[sid].color }}
                onClick={() => setSeat(sid)}
                aria-pressed={seat === sid}
                data-testid={`fl-seat-${sid}`}
                data-playground-action={i === 1 ? 'seat' : undefined}
                title={`${SEATS[sid].label}: ${SEATS[sid].note} (key ${i + 1})`}
              >
                <span className="fl-seat-dot" aria-hidden="true" />
                <span className="fl-seat-name">{SEATS[sid].label}</span>
                <span className="fl-seat-count">{seatFaultCount(cue, sid) || '✓'}</span>
              </button>
            ))}
            <button
              type="button"
              className={`fl-seat is-eye ${seat === 'eye' ? 'is-on' : ''}`}
              onClick={() => setSeat('eye')}
              aria-pressed={seat === 'eye'}
              data-testid="fl-seat-eye"
              aria-label="Wander the house"
              title="Stand anywhere in the house: drag in the auditorium of the section (key E)"
            >
              <span className="fl-seat-dot" aria-hidden="true" />
              <span className="fl-seat-name">wander</span>
            </button>
          </div>
        )}
        {mode === 'build' && (
          <p className="fl-viewcap" data-testid="fl-viewcap" aria-live="polite">
            <span className="fl-viewcap-scene">scene {cue + 1}</span>
            {viewFaults.length
              ? <span className="fl-viewcap-bad">{viewFaults.length} showing: {viewFaults.slice(0, 3).map((f) => f.label).join(' · ')}{viewFaults.length > 3 ? ' …' : ''}</span>
              : <span className="fl-viewcap-good">clean from here</span>}
          </p>
        )}
        {mode === 'show' && perf && (
          <div className="fl-perf" data-testid="fl-perf">
            {perf.caption && !perf.caption.change && (
              <div className="fl-surtitle" key={perf.stepIdx}>
                <span className="fl-sur-n">Scene {perf.caption.n}</span>
                <strong>{perf.caption.title}</strong>
                <span>{perf.caption.line}</span>
              </div>
            )}
            {perf.caption && perf.caption.change && (
              <div className="fl-changecap" key={perf.stepIdx}>{perf.caption.call ? 'a call · the house is on its feet' : `change to scene ${perf.caption.n}${perf.caption.passes > 1 ? ` · pass ${perf.caption.pass} of ${perf.caption.passes}` : ''}`}</div>
            )}
            <ul className="fl-whispers" aria-live="polite">
              {perf.whispers.map((w, i) => (
                <li key={`${perf.stepIdx}-${i}`} className={w.good ? 'is-good' : ''} style={{ '--seat': SEATS[w.seat].color, animationDelay: `${0.8 + i * 1.1}s` }}><b>{SEATS[w.seat].label}:</b> “{w.text}”</li>
              ))}
            </ul>
            <button type="button" className="fl-stop" onClick={stopShow} data-testid="fl-stop">stop the show</button>
          </div>
        )}
        {mode === 'notice' && notice && (
          <div className="fl-notice" role="dialog" aria-modal="true" aria-labelledby="fl-notice-head" data-testid="fl-notice" onKeyDown={trapTab}>
            <div className={`fl-clipping ${notice.stars === 3 ? 'is-rave' : ''}`}>
              {notice.stars === 3 && <span className="fl-stamp" aria-hidden="true">held over</span>}
              <p className="fl-paper">The Evening Lamp · Theatre</p>
              <h2 id="fl-notice-head">{notice.headline}</h2>
              <p className="fl-byline"><em>{show.title}</em>, at {show.house}</p>
              <p className="fl-notice-stars" aria-label={`${notice.stars} of 3 stars`}>{'★'.repeat(notice.stars)}{'☆'.repeat(3 - notice.stars)}</p>
              {notice.lines.map((l, i) => <p key={i} className="fl-notice-line">{l}</p>)}
              {notice.more > 0 && <p className="fl-notice-line is-more">…and {notice.more} more letters from the house.</p>}
              <p className="fl-notice-meta">{plural(notice.faults, 'fault')} · picture {Math.round(notice.picture * 100)}% · changes {Math.round(notice.time)} s against {show.par} s of music · watched from {notice.seatLabel}</p>
              <div className="fl-notice-actions">
                <button type="button" ref={noticeRef} className="fl-btn" onClick={() => setMode('build')} data-testid="fl-notice-close">back to the rail</button>
                {showIdx < SHOWS.length - 1 && notice.stars >= 2 && (
                  <button type="button" className="fl-btn is-go" onClick={() => switchShow(showIdx + 1)} data-testid="fl-next-house">next house: {SHOWS[showIdx + 1].house} →</button>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="fl-section" ref={secRef} aria-label="Section through the house and fly tower" data-testid="fl-section">
        <svg
          ref={svgRef}
          viewBox={sectionBox}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={onSectionDown}
          onPointerMove={onSectionMove}
          onPointerUp={onSectionUp}
          onPointerCancel={onSectionUp}
          className={drag ? 'is-dragging' : ''}
          role="img"
          aria-label="Section: drag a hanging piece up or down to set its trim, sideways to rehang it on another line; drag in the auditorium to stand anywhere."
          data-testid="fl-section-svg"
          style={{ '--ik': 1 / secK }}
        >
          <defs>
            <pattern id="fl-hatch" width="0.4" height="0.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="0.4" stroke="#2a2320" strokeWidth="0.06" opacity="0.5" />
            </pattern>
          </defs>
          <g transform={`scale(${secK} 1)`}>
          {/* house shell */}
          <path className="fl-s-house" d={`M -16.4 ${SY(0.2)} L -16.4 ${SY(13.5)} Q -8 ${SY(16)} 0 ${SY(H.grid + 1)} L 0 ${SY(H.prosH)} L -0.4 ${SY(H.prosH)} L -0.4 ${SY(-0.3)} Z`} />
          <path className="fl-s-rake" d={`M -16.4 ${SY(2.3)} L -1.6 ${SY(0.2)} L -0.4 ${SY(0.2)} L -0.4 ${SY(-0.4)} L -16.4 ${SY(-0.4)} Z`} />
          <path className="fl-s-balcony" d={`M -16.4 ${SY(8.0)} L -12.6 ${SY(8.0)} L -12.6 ${SY(8.4)} L -16.4 ${SY(9.2)} Z`} />
          {/* fly tower */}
          <rect className="fl-s-tower" x={0} y={SY(H.grid + 0.6)} width={H.backX + 0.3} height={H.grid + 0.6} />
          <line className="fl-s-grid" x1={0} x2={H.backX} y1={SY(H.grid)} y2={SY(H.grid)} />
          <rect className="fl-s-wall" x={-0.4} y={SY(H.grid + 0.6)} width={0.4} height={H.grid + 0.6 - H.prosH} />
          <rect className="fl-s-floor" x={-1.4} y={SY(0)} width={H.backX + 1.7} height={0.35} />
          <rect className="fl-s-back" x={H.backX} y={SY(H.grid + 0.6)} width={0.3} height={H.grid + 0.6} />
          <text className="fl-s-note" x={H.backX - 0.2} y={SY(H.grid + 0.95)} textAnchor="end">grid {H.grid} m</text>
          <text className="fl-s-note" x={-0.6} y={SY(H.prosH + 0.3)} textAnchor="end">pros {H.prosH} m</text>

          {/* sight fans */}
          {fans.map((f) => (
            <g key={f.id} className={`fl-fan ${f.strong ? 'is-strong' : ''}`} style={{ '--seat': f.color }}>
              {f.polys.map((p, i) => <polygon key={i} points={p.pts} className={p.bad ? 'is-bad' : ''} />)}
            </g>
          ))}

          {/* the lines */}
          {lines.map((lx, i) => {
            const id = pieceAt(i)
            const p = id ? PIECES[id] : null
            const pipe = id ? trims[id] : null
            const top = p ? pipe - (p.wire || 0) : 0
            const isOut = p && !scene.in.includes(id) && p.kind !== 'border'
            const target = drag && drag.kind === 'line' && drag.target === i && drag.line !== i
            return (
              <g key={i} className={`fl-s-line ${selLine === i ? 'is-sel' : ''} ${target ? 'is-target' : ''}`} data-testid={`fl-sline-${i}`}>
                <rect className="fl-s-hit" x={lx - lineGap * 0.48} y={SY(H.grid)} width={lineGap * 0.96} height={H.grid + 0.4} />
                <line className="fl-s-rope" x1={lx} x2={lx} y1={SY(H.grid)} y2={SY(pipe ?? H.grid)} />
                <text className="fl-s-num" x={lx} y={SY(H.grid + 0.3)} textAnchor="middle">{i + 1}</text>
                {p && (
                  <>
                    {p.wire ? <line className="fl-s-wire" x1={lx} x2={lx} y1={SY(pipe)} y2={SY(top)} /> : null}
                    <rect
                      className={`fl-s-piece is-${p.kind} ${isOut ? 'is-out' : 'is-in'}`}
                      x={lx - (p.kind === 'cut' ? 0.22 : 0.12)}
                      y={SY(top)}
                      width={p.kind === 'cut' ? 0.44 : 0.24}
                      height={p.h}
                      style={{ '--pc': PIECE_INK[p.paint] }}
                    />
                    <circle className="fl-s-pipe" cx={lx} cy={SY(pipe)} r={0.16} />
                    <text className="fl-s-label" x={lx + 0.34} y={SY(top - p.h / 2)} textAnchor="middle" dominantBaseline="middle">{shortName(id)}</text>
                  </>
                )}
              </g>
            )
          })}

          {/* faults on the drawing */}
          {cueResult.faults.filter((f) => !activeSeat || f.seat === activeSeat).map((f, i) => {
            let x = f.x
            let y = f.type === 'pipe' ? f.y : f.spans && f.spans.length ? (f.spans[0][0] + f.spans[0][1]) / 2 : f.y ?? null
            if (f.type === 'roof') { x = H.backX - 0.6; y = H.grid - 0.4 }
            if (y == null || x == null) return null
            return <circle key={i} className="fl-s-fault" cx={x} cy={SY(y)} r={0.45} />
          })}

          {/* seats */}
          {show.seats.map((sid) => (
            <g key={sid} className={`fl-s-seat ${activeSeat === sid ? 'is-on' : ''}`} style={{ '--seat': SEATS[sid].color }}>
              <circle cx={SEATS[sid].eye.x} cy={SY(SEATS[sid].eye.y)} r={0.42} />
              <text x={SEATS[sid].eye.x} y={SY(SEATS[sid].eye.y + 0.75)} textAnchor="middle">{SEATS[sid].label}</text>
            </g>
          ))}
          {!activeSeat && (
            <g className="fl-s-seat is-on is-eye" style={{ '--seat': '#c9a24a' }}>
              <circle cx={freeEye.x} cy={SY(freeEye.y)} r={0.48} />
              <text x={freeEye.x} y={SY(freeEye.y + 0.8)} textAnchor="middle">you</text>
            </g>
          )}
          {/* in the tower view the seats are off to the left: say where each fan comes from */}
          {!wideSection && show.seats.filter((sid) => SEATS[sid].eye.x < -4.4).map((sid) => {
            const e = SEATS[sid].eye
            const s0 = (H.prosH * 0.5 - e.y) / (0 - e.x)
            const yy = clamp(e.y + s0 * (-4.4 - e.x), 0.4, H.grid - 0.5)
            return (
              <g key={`edge-${sid}`} className={`fl-s-edge ${activeSeat === sid ? 'is-on' : ''}`} style={{ '--seat': SEATS[sid].color }}>
                <path d={`M -4.5 ${SY(yy)} l 0.5 -0.35 l 0 0.7 z`} />
                <text x={-3.85} y={SY(yy) + 0.2}>{SEATS[sid].label}</text>
              </g>
            )
          })}
          {/* the flyman on the rail */}
          <g className="fl-s-cat" transform={`translate(${H.backX - 1.1} ${SY(8.2)})`}>
            <path d="M0 0 q-.5 -1.2 0 -1.6 l.1 -.5 .3 .35 .3 0 .3 -.35 .1 .5 q.5 .4 0 1.6 z" />
          </g>
          <text className="fl-s-note" x={H.backX - 0.4} y={SY(7.2)} textAnchor="end">fly floor</text>
          </g>
        </svg>
        <button
          type="button"
          className="fl-sectoggle"
          onClick={() => setWideSection((w) => !w)}
          aria-pressed={wideSection}
          data-testid="fl-section-toggle"
          title={wideSection ? 'Back to the fly tower' : 'See the whole house, and wander it'}
        >{wideSection ? 'fly tower' : 'whole house'}</button>
      </section>

      <section className="fl-rail" aria-label="The fly rail" data-testid="fl-rail">
        <div className="fl-railbar">
          <span className="fl-railcue">cue {cue + 1}</span>
          <span className="fl-legend" aria-hidden="true">arbor up: piece in · arbor down: piece out</span>
          <span className="fl-railsel">
            {selPiece ? <>line {selLine + 1}: <b>{shortName(selPiece)}</b> at {trims[selPiece].toFixed(1)} m{PIECES[selPiece].wire ? ` (hangs ${PIECES[selPiece].wire} m below)` : ''}</> : `line ${selLine + 1} is empty`}
          </span>
          <div className="fl-railtools">
            <button type="button" className="fl-btn" onClick={() => flyIn(selLine)} disabled={!selPiece || mode !== 'build'} data-testid="fl-fly-in" title="Fly in (I)">fly in</button>
            <button type="button" className="fl-btn" onClick={() => flyOut(selLine)} disabled={!selPiece || mode !== 'build'} data-testid="fl-fly-out" title="Fly out (O)">fly out</button>
            <button
              type="button"
              className={`fl-btn ${swapFrom != null ? 'is-armed' : ''}`}
              onClick={() => {
                if (swapFrom == null) setSwapFrom(selLine)
                else { if (selLine !== swapFrom) swap(swapFrom, selLine); setSwapFrom(null) }
              }}
              disabled={mode !== 'build'}
              data-testid="fl-rehang"
              title="Rehang: pick a line, then another, to swap what hangs on them ([ and ] on a rope)"
            >{swapFrom == null ? 'rehang' : selLine === swapFrom ? `line ${swapFrom + 1}: tap another rope` : `swap line ${swapFrom + 1} with ${selLine + 1}`}</button>
            <button type="button" className="fl-btn" onClick={undo} disabled={mode !== 'build'} data-testid="fl-undo" title="Undo (Z)">undo</button>
          </div>
        </div>
        <div className="fl-ropes" role="group" aria-label="Ropes, one per lineset">
          {lines.map((_, i) => {
            const id = pieceAt(i)
            const p = id ? PIECES[id] : null
            const [lo, hi] = p ? pipeRange(p, H) : [0, 1]
            const v = id ? trims[id] : 0
            const frac = p ? (v - lo) / (hi - lo) : 0
            const marks = p ? book.cues.map((c, k) => (c[id] != null ? { k, f: (c[id] - lo) / (hi - lo) } : null)).filter(Boolean) : []
            const moved = p && cue > 0 && Math.abs(tracks[cue - 1][id] - tracks[cue][id]) > 0.001
            return (
              <div key={i} className={`fl-rope ${selLine === i ? 'is-sel' : ''} ${swapFrom === i ? 'is-swap' : ''} ${p ? `is-${p.kind}` : 'is-empty'} ${moved ? 'is-moved' : ''}`} style={{ '--pc': p ? PIECE_INK[p.paint] : '#555' }}>
                <span className="fl-rope-num" aria-hidden="true">{i + 1}</span>
                <div
                  ref={(el) => { railRefs.current[i] = el }}
                  className="fl-rope-track"
                  role="slider"
                  tabIndex={selLine === i ? 0 : -1}
                  aria-label={p ? `Line ${i + 1}, ${p.name}` : `Line ${i + 1}, empty`}
                  aria-valuemin={lo}
                  aria-valuemax={hi}
                  aria-valuenow={round1(v)}
                  aria-valuetext={p ? `${v.toFixed(1)} metres${v <= lo + 0.01 ? ', in' : v >= hi - 0.01 ? ', out' : ''}` : 'empty'}
                  aria-disabled={!p}
                  onKeyDown={onRailKey(i)}
                  onFocus={() => setSelLine(i)}
                  onPointerDown={onRailDown(i)}
                  onPointerMove={(e) => railDrag.current && applyRail(e)}
                  onPointerUp={onRailUp}
                  onPointerCancel={onRailUp}
                  data-testid={`fl-rope-${i}`}
                  data-playground-action={i === 3 ? 'haul' : undefined}
                >
                  <span className="fl-rope-line" aria-hidden="true" />
                  {marks.map((m) => (
                    <span key={m.k} className={`fl-spike ${m.k === cue ? 'is-now' : ''}`} style={{ top: `${m.f * 100}%` }} aria-hidden="true">{m.k + 1}</span>
                  ))}
                  {p && <span className="fl-arbor" style={{ top: `${frac * 100}%` }} aria-hidden="true" />}
                </div>
                <span className="fl-rope-name" aria-hidden="true">{p ? shortName(id) : '—'}</span>
              </div>
            )
          })}
        </div>
      </section>

      <aside className="fl-book" aria-label="The prompt book" data-testid="fl-book">
        <ol className="fl-cues">
          {show.scenes.map((s, k) => {
            const c = result.cues[k]
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={`fl-cue ${k === cue ? 'is-on' : ''} ${c.faults.length ? 'has-faults' : 'is-clean'}`}
                  onClick={() => setCue(k)}
                  aria-pressed={k === cue}
                  data-testid={`fl-cue-${k}`}
                  data-playground-action={k === 1 ? 'cue' : undefined}
                >
                  <span className="fl-cue-n">{k + 1}</span>
                  <span className="fl-cue-body">
                    <span className="fl-cue-title">{s.title}</span>
                    <span className="fl-cue-in">{s.in.map((id) => shortName(id)).join(' · ')}</span>
                    <span className="fl-cue-seats">
                      {show.seats.map((sid) => (
                        <span key={sid} className={`fl-cue-seat ${c.bySeat[sid].faults.length ? 'is-bad' : ''}`} style={{ '--seat': SEATS[sid].color }}>{sid}{c.bySeat[sid].faults.length ? ` ${c.bySeat[sid].faults.length}` : ' ✓'}</span>
                      ))}
                      {k > 0 && <span className={`fl-cue-change ${c.change.passes.length > 1 ? 'is-slow' : ''}`}>{c.change.moves.length ? `${c.change.moves.length} line${c.change.moves.length === 1 ? '' : 's'}${c.change.passes.length > 1 ? ` in ${c.change.passes.length} passes` : ''} · ${c.change.time.toFixed(1)} s` : 'no change'}</span>}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
        <div className="fl-bookfoot">
          <p className="fl-tally" data-testid="fl-tally">
            <span className={result.faultCount ? 'is-bad' : 'is-good'}>{result.faultCount ? plural(result.faultCount, 'fault') : 'no faults'}</span>
            <span className={result.generous ? 'is-good' : 'is-bad'} title="How much of each scene's cloth the worst-placed seat gets, averaged over the play">picture {Math.round(result.picture * 100)}% / {Math.round(show.picture * 100)}%</span>
            <span className={result.changeTime > show.par ? 'is-bad' : 'is-good'}>changes {result.changeTime.toFixed(1)} s / music {show.par} s</span>
            <span>crew of {show.crew}</span>
          </p>
          <div className="fl-bookbtns">
            <button type="button" className="fl-btn" onClick={rough} disabled={mode !== 'build'} data-testid="fl-rough" title="Fly this scene's cloths in and the rest out (R)">rough in scene {cue + 1}</button>
            <button type="button" className="fl-btn" onClick={resetShow} disabled={mode !== 'build'} data-testid="fl-reset" title="Back to the hang the last company left">reset hang</button>
            <button type="button" className="fl-btn is-go" onClick={curtainUp} disabled={mode === 'show'} data-testid="fl-curtain" data-playground-primary title="Play the show from a seat (G)">curtain up</button>
          </div>
          {sealed && sealed.stars > 0 && <p className="fl-sealed">best notice: “{sealed.headline}” {'★'.repeat(sealed.stars)}</p>}
        </div>
      </aside>

      {help && (
        <div className="fl-help" role="dialog" aria-modal="true" aria-labelledby="fl-help-head" data-testid="fl-help" onKeyDown={trapTab}>
          <div className="fl-help-card">
            <h2 id="fl-help-head">You are the flyman.</h2>
            <p>Every piece of scenery hangs on a line above the stage. A cloth hung <b>in</b> sits on the deck; hung <b>out</b> it waits up in the flies. The audience must see the scene and nothing else: no cloth waiting in the flies, no pipe, no wire, no bare brick wall, no roof.</p>
            <p>Each seat sees a different show. <b>Row A</b> looks up into the flies. <b>The gods</b> look down past the arch. The black <b>borders</b> are the only thing that hides the flies, and a border low enough for row A can cut the moon in half for the back of the house.</p>
            <ul>
              <li><b>Haul a rope</b> on the rail, or drag a piece up and down in the section. The rail works like a real counterweight: the iron arbor runs opposite to the scenery, so arbor up means the piece is in, on the deck, and arbor down means it is out in the flies. A tap only picks a rope. Drag a piece sideways in the section, or use <b>rehang</b>, to swap two lines.</li>
              <li><b>Cues track</b>: a trim holds through later scenes until another cue moves it. A cloth left in behind another cloth costs nothing.</li>
              <li>A change between scenes is timed. Two hands on the rail move two lines a pass. Beat the music and the notice says so.</li>
              <li><b>Curtain up</b> plays the whole show from your seat and sends you the morning notice.</li>
            </ul>
            <p className="fl-keys">Keys: <kbd>1</kbd>–<kbd>3</kbd> seats · <kbd>E</kbd> wander · <kbd>,</kbd> <kbd>.</kbd> cues · on a rope <kbd>↑</kbd> <kbd>↓</kbd> trim (<kbd>shift</kbd> 1 m) <kbd>I</kbd>/<kbd>O</kbd> in/out <kbd>←</kbd> <kbd>→</kbd> lines <kbd>[</kbd> <kbd>]</kbd> rehang · <kbd>R</kbd> rough in · <kbd>Z</kbd> undo · <kbd>G</kbd> curtain up · <kbd>M</kbd> sound</p>
            <button type="button" ref={helpCloseRef} className="fl-btn is-go" onClick={closeHelp} data-testid="fl-help-close">to the rail</button>
          </div>
        </div>
      )}
    </div>
  )
}

const PIECE_INK = {
  velvet: '#1a1414',
  teaser: '#6e1520',
  palace: '#a2444c',
  sea: '#2f7c8a',
  night: '#3c3f8a',
  lamps: '#c27a2c',
  waves: '#2f7c8a',
  moon: '#c9b07a',
  cat: '#0b0a0c',
  ship: '#b8ab8c'
}
