import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { WINTERS, PATHS, DAYS, TRAINS, dayLabel, MONTH_TICKS, compass } from './slab/winters'
import { runDream, hourLabel, diffEvents, GRAIN_NAMES } from './slab/sim'
import { createPanorama, drawStrata, gullyPoint, GRAIN_COLORS, DANGER_COLORS, DANGER_NAMES, siColor } from './slab/render'
import { createPassAudio } from './slab/audio'
import './SlabSeason.css'

const PLANS_KEY = 'slab-season.plans'
const SEALED_KEY = 'slab-season.sealed'
const EMPTY_PLAN = { charges: [], fences: [], stamps: [], closures: [] }
const STAMP_LIMIT = 70
const HOLD_HOUR = 10

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

const OUTCOME_LINE = {
  caught: (e) => `${cap(e.train)} runs into it.`,
  'night-line': () => 'It crossed the line after the last train. The track walker finds it, and the line shuts the next day to dig it out.',
  'closed-line': () => 'It crossed the line, but no train was running by then. Nobody was there.',
  'shot-line': () => 'Your charge brought it down across the line. One day of digging.',
  shot: () => 'Your charge brought it down before it grew. It stopped short of the line.',
  short: () => 'It ran out and stopped short of the line.'
}
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)
const STATUS_TEXT = { open: 'line open', closed: 'line closed', clearing: 'digging out', hold: `held till ${HOLD_HOUR}:00`, stopped: 'line stopped: a train is caught' }
const TRIGGER_TEXT = { natural: 'by itself', charge: 'to your charge', sympathetic: 'in sympathy with its neighbour' }

function starsFor(winter, lost) {
  if (lost <= winter.par) return 3
  if (lost <= winter.par + 3) return 2
  return 1
}

function samePlan(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function hintFor(e, dream) {
  const path = PATHS[e.path]
  if (e.trigger === 'charge') return 'Shot on purpose. Your charge took this slab down before nature could choose the hour.'
  if (e.failedGrain === 4 || e.failedGrain === 3) {
    const firstDeep = dream.daily.findIndex((r) => r.hs[e.path] >= STAMP_LIMIT)
    if (firstDeep > 0 && firstDeep > e.failedBorn) {
      return `This rot started at the bottom while the ${path.name} was shallow. A boot crew can stamp it into one firm layer until ${dayLabel(firstDeep - 1)}. But while hard cold sits on a shallow pack it rots again, so send the crew after the cold breaks and before the next storm buries it. After that no charge reaches that deep.`
    }
    return 'Facets and depth hoar heal slowly. You can shut the line under the load, or shoot it while the slab on top is still thin.'
  }
  if (e.failedGrain === 5) return `Feathers buried on ${dayLabel(e.buriedDay)}. Shoot it while the slab is still thin. Or put a fence on the ridge so the wind cannot load it.`
  if (e.onCrust) return 'New snow on a crust slides for about a week, then grips. Shoot it in that week.'
  return 'Storm snow on an old surface stays weak for a day or two after it lands. Shoot it then, before the storm finishes loading it.'
}

export default function SlabSeason() {
  const reduced = useReducedMotion()
  const [winterIdx, setWinterIdx] = useState(0)
  const winter = WINTERS[winterIdx]
  const [plans, setPlans] = useState(() => readJSON(PLANS_KEY, {}))
  const plan = plans[winter.id] || EMPTY_PLAN
  const BUDGET = winter.budget
  const [dreams, setDreams] = useState(null)
  const [variant, setVariant] = useState('A')
  const [day, setDay] = useState(25)
  const [pathIdx, setPathIdx] = useState(2)
  const [mode, setMode] = useState('grain')
  const [sel, setSel] = useState(null)
  const [trace, setTrace] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [intro, setIntro] = useState(true)
  const [help, setHelp] = useState(false)
  const [muted, setMuted] = useState(false)
  const [sealed, setSealed] = useState(() => readJSON(SEALED_KEY, {}))
  const [sealCard, setSealCard] = useState(null)
  const [ledgerNote, setLedgerNote] = useState(null)
  const [offThread, setOffThread] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [wallSize, setWallSize] = useState(null)
  const [toast, setToast] = useState(null)

  const workerRef = useRef(null)
  const reqRef = useRef(0)
  const lastMsgRef = useRef(null)
  const pendingRef = useRef(null)
  const prevDreamsRef = useRef(null)
  const historyRef = useRef({})
  const openedRef = useRef({})
  const audioRef = useRef(null)
  const panoCanvasRef = useRef(null)
  const panoWrapRef = useRef(null)
  const wallCanvasRef = useRef(null)
  const ghostRef = useRef(null)
  const lastDreamRef = useRef(null)
  const scanRef = useRef(null)
  const lastRoarRef = useRef(0)
  const wallWrapRef = useRef(null)
  const wallGeomRef = useRef(null)
  const panoRef = useRef(null)
  const animState = useRef({ anims: [], dayF: 0, last: 0, lastHour: 0 })
  const frameState = useRef(null)
  const scrubRef = useRef(null)

  // ------------------------------------------------------------ dreaming
  const receive = useCallback((msg) => {
    if (msg.id !== reqRef.current) return
    const prev = prevDreamsRef.current
    const pending = pendingRef.current
    if (prev && prev.winter === msg.winter && pending) {
      const d = diffEvents(prev.dreams[0], msg.dreams[0])
      const caughtBefore = prev.dreams.reduce((a, r) => a + r.summary.caught, 0)
      const caughtAfter = msg.dreams.reduce((a, r) => a + r.summary.caught, 0)
      setLedgerNote({ action: pending, gone: d.gone, fresh: d.fresh, caughtBefore, caughtAfter, key: msg.id })
      setToast({ key: msg.id, action: pending, gone: d.gone.length, fresh: d.fresh.length, caughtBefore, caughtAfter, lostBefore: Math.max(...prev.dreams.map((r) => r.summary.lost)), lostAfter: Math.max(...msg.dreams.map((r) => r.summary.lost)) })
      audioRef.current?.chord(caughtAfter < caughtBefore)
    }
    pendingRef.current = null
    prevDreamsRef.current = { winter: msg.winter, dreams: msg.dreams }
    setDreams(msg)
  }, [])

  useEffect(() => {
    let worker = null
    try {
      worker = new Worker(new URL('./slab/dream.worker.js', import.meta.url), { type: 'module' })
      worker.onmessage = (event) => receive(event.data)
      worker.onerror = () => {
        workerRef.current = null
        setOffThread(false)
        const m = lastMsgRef.current
        const w = m && WINTERS.find((x) => x.id === m.winter)
        if (w) receive({ id: m.id, winter: m.winter, dreams: runDream(w, m.plan) })
      }
      workerRef.current = worker
      setOffThread(true)
    } catch {
      workerRef.current = null
      setOffThread(false)
    }
    return () => {
      worker?.terminate()
      workerRef.current = null
    }
  }, [receive])

  useEffect(() => {
    const id = ++reqRef.current
    const msg = { id, winter: winter.id, plan }
    lastMsgRef.current = msg
    if (workerRef.current) {
      workerRef.current.postMessage(msg)
    } else {
      const handle = window.setTimeout(() => receive({ id, winter: winter.id, dreams: runDream(winter, plan) }), 0)
      return () => window.clearTimeout(handle)
    }
    return undefined
  }, [winter, plan, receive, offThread])

  const ready = dreams && dreams.winter === winter.id
  const dreamList = ready ? dreams.dreams : null
  const dream = dreamList ? dreamList.find((d) => d.variant === variant) || dreamList[0] : null

  // first look at a winter: open on its first disaster
  useEffect(() => {
    if (!dream || openedRef.current[winter.id]) return
    openedRef.current[winter.id] = true
    const first = dream.events.find((e) => e.outcome === 'caught') || dream.events[0]
    if (first) {
      setDay(first.day)
      setPathIdx(first.path)
      setSel({ type: 'event', key: first.key })
    }
  }, [dream, winter.id])

  useEffect(() => { writeJSON(PLANS_KEY, plans) }, [plans])
  useEffect(() => {
    if (!toast) return undefined
    const t = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(t)
  }, [toast])

  // ------------------------------------------------------------ plan edits
  const commit = useCallback((next, action) => {
    const hist = historyRef.current[winter.id] || (historyRef.current[winter.id] = [])
    hist.push(plan)
    if (hist.length > 60) hist.shift()
    pendingRef.current = action
    setPlans((ps) => ({ ...ps, [winter.id]: next }))
  }, [plan, winter.id])

  const row = dream ? dream.daily[day] : null
  const hsHere = row ? row.hs[pathIdx] : 0
  const path = PATHS[pathIdx]
  const chargeHere = plan.charges.find((c) => c.path === pathIdx && c.day === day)
  const fenceHere = plan.fences.find((f) => f.path === pathIdx)
  const stampHere = plan.stamps.find((s) => s.path === pathIdx)
  const closedHere = plan.closures.includes(day)
  const prevHs = dream && day > 0 ? dream.daily[day - 1].hs[pathIdx] : 0

  const tools = {
    charge: {
      can: Boolean(chargeHere) || plan.charges.length < BUDGET.charge,
      why: chargeHere ? '' : plan.charges.length >= BUDGET.charge ? 'no charges left' : '',
      label: chargeHere ? 'take the charge back' : `charge the ${path.name}`,
      run: () => {
        if (chargeHere) commit({ ...plan, charges: plan.charges.filter((c) => c !== chargeHere) }, { kind: 'uncharge', path: pathIdx, day })
        else if (plan.charges.length < BUDGET.charge) {
          audioRef.current?.charge()
          commit({ ...plan, charges: [...plan.charges, { path: pathIdx, day }] }, { kind: 'charge', path: pathIdx, day })
        }
      }
    },
    fence: {
      can: Boolean(fenceHere) || plan.fences.length < BUDGET.fence,
      why: !fenceHere && plan.fences.length >= BUDGET.fence ? (BUDGET.fence === 1 ? 'the one fence is up' : `all ${BUDGET.fence} fences are up`) : '',
      label: fenceHere ? (fenceHere.day === day ? 'take the fence down' : `move the fence to ${dayLabel(day)}`) : `fence the ${path.name} ridge`,
      run: () => {
        if (fenceHere && fenceHere.day === day) commit({ ...plan, fences: plan.fences.filter((f) => f !== fenceHere) }, { kind: 'unfence', path: pathIdx, day })
        else if (fenceHere) commit({ ...plan, fences: plan.fences.map((f) => (f === fenceHere ? { path: pathIdx, day } : f)) }, { kind: 'fence', path: pathIdx, day })
        else if (plan.fences.length < BUDGET.fence) commit({ ...plan, fences: [...plan.fences, { path: pathIdx, day }] }, { kind: 'fence', path: pathIdx, day })
      }
    },
    stamp: {
      can: (Boolean(stampHere) && stampHere.day === day) || ((stampHere || plan.stamps.length < BUDGET.stamp) && prevHs < STAMP_LIMIT),
      why: stampHere && stampHere.day === day ? '' : prevHs >= STAMP_LIMIT ? `${Math.round(prevHs)} cm: too deep to stamp` : !stampHere && plan.stamps.length >= BUDGET.stamp ? (BUDGET.stamp === 1 ? 'the one crew is out' : `all ${BUDGET.stamp} crews are out`) : '',
      label: stampHere ? (stampHere.day === day ? 'call the crew back' : `move the crew to ${dayLabel(day)}`) : `stamp the ${path.name}`,
      run: () => {
        if (stampHere && stampHere.day === day) commit({ ...plan, stamps: plan.stamps.filter((s) => s !== stampHere) }, { kind: 'unstamp', path: pathIdx, day })
        else if (prevHs >= STAMP_LIMIT) return
        else if (stampHere) commit({ ...plan, stamps: plan.stamps.map((s) => (s === stampHere ? { path: pathIdx, day } : s)) }, { kind: 'stamp', path: pathIdx, day })
        else if (plan.stamps.length < BUDGET.stamp) commit({ ...plan, stamps: [...plan.stamps, { path: pathIdx, day }] }, { kind: 'stamp', path: pathIdx, day })
      }
    },
    close: {
      can: closedHere || plan.closures.length < BUDGET.close,
      why: !closedHere && plan.closures.length >= BUDGET.close ? `the company allows ${BUDGET.close} ${BUDGET.close === 1 ? 'day' : 'days'}` : '',
      label: closedHere ? `reopen the line on ${dayLabel(day)}` : `close the line on ${dayLabel(day)}`,
      run: () => {
        if (closedHere) commit({ ...plan, closures: plan.closures.filter((d) => d !== day) }, { kind: 'open', day })
        else if (plan.closures.length < BUDGET.close) commit({ ...plan, closures: [...plan.closures, day].sort((a, b) => a - b) }, { kind: 'close', day })
      }
    }
  }

  const undo = useCallback(() => {
    const hist = historyRef.current[winter.id]
    if (!hist || !hist.length) return
    const prev = hist.pop()
    pendingRef.current = { kind: 'undo' }
    setPlans((ps) => ({ ...ps, [winter.id]: prev }))
  }, [winter.id])

  const wipe = useCallback(() => {
    if (samePlan(plan, EMPTY_PLAN)) return
    commit(EMPTY_PLAN, { kind: 'wipe' })
  }, [commit, plan])

  // ------------------------------------------------------------ derived
  const totals = useMemo(() => {
    if (!dreamList) return null
    const caught = dreamList.map((d) => d.summary.caught)
    const lost = Math.max(...dreamList.map((d) => d.summary.lost))
    return { caught, lost, any: caught.reduce((a, b) => a + b, 0) }
  }, [dreamList])

  const selEvent = useMemo(() => {
    if (!dream || !sel || sel.type !== 'event') return null
    return dream.events.find((e) => e.key === sel.key) || null
  }, [dream, sel])

  const dayEvents = useMemo(() => (dream ? dream.events.filter((e) => e.day === day) : []), [dream, day])
  const pathEvents = useMemo(() => (dream ? dream.events.filter((e) => e.path === pathIdx) : []), [dream, pathIdx])
  const otherDream = dreamList && dreamList.length > 1 ? dreamList.find((d) => d.variant !== variant) : null

  const layerInfo = useMemo(() => {
    if (!dream || !sel || sel.type !== 'layer') return null
    const s = dream.strata[pathIdx]
    const d = Math.min(sel.day, DAYS - 1)
    let base = 0
    let found = null
    let total = 0
    for (let k = s.offsets[d]; k < s.offsets[d + 1]; k++) total += s.data[k * 6 + 1]
    for (let k = s.offsets[d]; k < s.offsets[d + 1]; k++) {
      const o = k * 6
      if (s.data[o] === sel.id) found = { id: sel.id, h: s.data[o + 1], g: s.data[o + 2], si: s.data[o + 3], rho: s.data[o + 4], wet: s.data[o + 5], depth: total - base - s.data[o + 1] }
      base += s.data[o + 1]
    }
    if (!found) return { gone: true, info: dream.registry[sel.id], day: d }
    return { ...found, info: dream.registry[sel.id], day: d }
  }, [dream, sel, pathIdx])

  const weakestHere = useMemo(() => {
    if (!dream) return null
    const s = dream.strata[pathIdx]
    let best = null
    let total = 0
    for (let k = s.offsets[day]; k < s.offsets[day + 1]; k++) total += s.data[k * 6 + 1]
    let base = 0
    for (let k = s.offsets[day]; k < s.offsets[day + 1]; k++) {
      const o = k * 6
      const depth = total - base - s.data[o + 1]
      if (depth >= 20 && (!best || s.data[o + 3] < best.si)) best = { id: s.data[o], si: s.data[o + 3], g: s.data[o + 2], depth }
      base += s.data[o + 1]
    }
    return best
  }, [dream, pathIdx, day])

  // ------------------------------------------------------------ audio
  const ensureAudio = useCallback(() => {
    if (!audioRef.current) audioRef.current = createPassAudio()
    audioRef.current?.resume()
    audioRef.current?.setMuted(muted)
  }, [muted])
  useEffect(() => { audioRef.current?.setMuted(muted) }, [muted])
  useEffect(() => () => { audioRef.current?.close(); audioRef.current = null }, [])
  useEffect(() => {
    if (!row || !audioRef.current) return
    audioRef.current.setWind(row.wx.wind, row.wx.swe > 0)
  }, [row])

  // ------------------------------------------------------------ navigation
  const goDay = useCallback((d, quiet) => {
    const n = Math.max(0, Math.min(DAYS - 1, d))
    setDay((old) => {
      if (old !== n && !quiet) audioRef.current?.tick((n % 7) / 7)
      return n
    })
  }, [])

  const jumpEvent = useCallback((dir) => {
    if (!dream || !dream.events.length) return
    const list = dream.events
    const cur = selEvent ? list.indexOf(selEvent) : -1
    let next
    if (cur >= 0) next = list[(cur + dir + list.length) % list.length]
    else next = dir > 0 ? list.find((e) => e.day > day) || list[0] : [...list].reverse().find((e) => e.day < day) || list[list.length - 1]
    setDay(next.day)
    setPathIdx(next.path)
    setSel({ type: 'event', key: next.key })
    animState.current.anims = []
    if (!reduced) animState.current.anims.push({ path: next.path, M: next.M, reaches: next.reaches, trigger: next.trigger, start: animState.current.last, dur: 1.8, seed: next.day * 7 + next.path })
    audioRef.current?.slide(Math.min(4, next.size), next.wet)
  }, [dream, selEvent, day, reduced])

  const selectEvent = useCallback((e) => {
    setDay(e.day)
    setPathIdx(e.path)
    setSel({ type: 'event', key: e.key })
    animState.current.anims = []
    if (!reduced) animState.current.anims.push({ path: e.path, M: e.M, reaches: e.reaches, trigger: e.trigger, start: animState.current.last, dur: 1.8, seed: e.day * 7 + e.path })
    audioRef.current?.slide(Math.min(4, e.size), e.wet)
  }, [reduced])

  const begin = useCallback(() => {
    ensureAudio()
    setIntro(false)
  }, [ensureAudio])

  const switchWinter = useCallback((i) => {
    if (i === winterIdx) return
    setPlaying(false)
    setSel(null)
    setTrace(null)
    setLedgerNote(null)
    setToast(null)
    animState.current.anims = []
    setVariant('A')
    prevDreamsRef.current = null
    setWinterIdx(i)
  }, [winterIdx])

  const togglePlay = useCallback(() => {
    ensureAudio()
    setPlaying((p) => {
      if (!p) {
        animState.current.dayF = day >= DAYS - 1 ? 0 : day + 0.25
        animState.current.lastHour = animState.current.dayF * 24
      }
      return !p
    })
  }, [day, ensureAudio])

  const canSeal = totals && totals.any === 0
  const seal = useCallback(() => {
    if (!canSeal) return
    const stars = starsFor(winter, totals.lost)
    const prior = sealed[winter.id]
    const best = !prior || totals.lost < prior.lost
    const next = best ? { ...sealed, [winter.id]: { lost: totals.lost, stars, plan } } : sealed
    setSealed(next)
    writeJSON(SEALED_KEY, next)
    setSealCard({ stars, lost: totals.lost, best, winter: winter.id })
    audioRef.current?.chord(true)
    setPlaying(false)
  }, [canSeal, winter, totals, sealed, plan])

  // ------------------------------------------------------------ keyboard
  const keyRef = useRef(null)
  useEffect(() => {
    const onKey = (ev) => keyRef.current && keyRef.current(ev)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useLayoutEffect(() => {
    keyRef.current = (ev) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return
      const tag = ev.target && ev.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const k = ev.key
      const dialog = document.querySelector('.ss-root [role=dialog]')
      if (k === 'Tab' && dialog) {
        const items = [...dialog.querySelectorAll('button, a[href]')]
        if (items.length) {
          const i = items.indexOf(document.activeElement)
          const next = ev.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === items.length - 1 || i < 0 ? 0 : i + 1)
          ev.preventDefault()
          items[next].focus()
        }
        return
      }
      if ((k === 'ArrowUp' || k === 'ArrowDown') && ev.target === wallWrapRef.current && dream) {
        ev.preventDefault()
        const st = dream.strata[pathIdx]
        const ids = []
        for (let q = st.offsets[day]; q < st.offsets[day + 1]; q++) ids.push(st.data[q * 6])
        if (!ids.length) return
        const cur = sel && sel.type === 'layer' ? ids.indexOf(sel.id) : -1
        const ni = cur < 0 ? ids.length - 1 : Math.max(0, Math.min(ids.length - 1, cur + (k === 'ArrowUp' ? 1 : -1)))
        setSel({ type: 'layer', id: ids[ni], day })
        setTrace(null)
        return
      }
      if (k === 'Escape') {
        if (help) setHelp(false)
        else if (sealCard) setSealCard(null)
        else if (sel) setSel(null)
        return
      }
      if (intro) {
        if (k === 'Enter' || k === ' ') {
          ev.preventDefault()
          begin()
        }
        return
      }
      if (k === '?') { setHelp((h) => !h); return }
      if (sealCard) return
      const onButton = tag === 'BUTTON' || tag === 'A'
      if (k === 'ArrowRight') { ev.preventDefault(); goDay(day + (ev.shiftKey ? 7 : 1)) }
      else if (k === 'ArrowLeft') { ev.preventDefault(); goDay(day - (ev.shiftKey ? 7 : 1)) }
      else if (k === 'Home') goDay(0)
      else if (k === 'End') goDay(DAYS - 1)
      else if (k >= '1' && k <= '6') { setPathIdx(Number(k) - 1); setSel(null) }
      else if (k === 'c' || k === 'C') { if (tools.charge.can) tools.charge.run() }
      else if (k === 'f' || k === 'F') { if (tools.fence.can) tools.fence.run() }
      else if (k === 's' || k === 'S') { if (tools.stamp.can) tools.stamp.run() }
      else if (k === 'l' || k === 'L') { if (tools.close.can) tools.close.run() }
      else if (k === 'n' || k === 'N' || k === ']') jumpEvent(1)
      else if (k === 'p' || k === 'P' || k === '[') jumpEvent(-1)
      else if (k === 'g' || k === 'G') setMode((m) => (m === 'grain' ? 'stability' : 'grain'))
      else if ((k === 'd' || k === 'D') && winter.twoDreams) setVariant((v) => (v === 'A' ? 'B' : 'A'))
      else if (k === 'z' || k === 'Z' || k === 'Backspace') { ev.preventDefault(); undo() }
      else if (k === 'm' || k === 'M') setMuted((m) => !m)
      else if (k === ' ' && !onButton) { ev.preventDefault(); togglePlay() }
      else if (k === 'Enter' && !onButton && canSeal) seal()
    }
  })

  // ------------------------------------------------------------ panorama
  useEffect(() => {
    const wrap = panoWrapRef.current
    const canvas = panoCanvasRef.current
    if (!wrap || !canvas) return undefined
    const pano = createPanorama()
    panoRef.current = pano
    const g = canvas.getContext('2d')
    let raf = 0
    const fit = () => {
      const r = wrap.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, r.width < 600 ? 1.5 : 2)
      canvas.width = Math.max(1, Math.round(r.width * dpr))
      canvas.height = Math.max(1, Math.round(r.height * dpr))
      canvas.style.width = `${r.width}px`
      canvas.style.height = `${r.height}px`
      pano.resize(r.width, r.height, dpr)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(wrap)
    const t0 = performance.now()
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      const fs = frameState.current
      if (!fs) return
      const t = (now - t0) / 1000
      const st = animState.current
      const dt = Math.min(0.1, t - st.last)
      st.last = t
      // playback
      if (fs.playing) {
        const slowDay = fs.speed === 1 && fs.eventDays.has(Math.floor(st.dayF))
        const speed = fs.reduced ? 1.6 * fs.speed : slowDay ? 0.32 : 1.5 * fs.speed
        const before = st.dayF
        st.dayF = Math.min(DAYS - 0.001, st.dayF + dt * speed)
        const absBefore = before * 24
        const absNow = st.dayF * 24
        for (const e of fs.events) {
          const at = e.day * 24 + e.hour
          if (at > absBefore && at <= absNow) {
            if (!fs.reduced) st.anims.push({ path: e.path, M: e.M, reaches: e.reaches, trigger: e.trigger, start: t, dur: 1.8, seed: e.day * 7 + e.path })
            fs.onSlide(e)
          }
        }
        for (const tr of TRAINS) {
          const d = Math.floor(st.dayF)
          const at = d * 24 + tr.hour
          if (at > absBefore && at <= absNow && fs.runs(d, tr.hour)) fs.onHorn()
        }
        if (Math.floor(before) !== Math.floor(st.dayF)) fs.onDay(Math.floor(st.dayF))
        if (st.dayF >= DAYS - 0.01) fs.onEnd()
      }
      const playDay = fs.playing ? Math.floor(st.dayF) : fs.day
      const hour = fs.playing ? (st.dayF % 1) * 24 : 12
      // idle frames: redraw on change, and only gently for ambient motion
      const busy = fs.playing || st.anims.length > 0
      const sig = fs.sig
      if (!busy) {
        if (fs.reduced && sig === st.sig && st.sized === pano.sized) return
        if (!fs.reduced && sig === st.sig && t - st.lastDraw < 1 / 20) return
      }
      st.sig = sig
      st.sized = pano.sized
      st.lastDraw = t
      const view = fs.viewFor(playDay, hour)
      if (!view) return
      st.anims = pano.draw(g, { ...view, anims: st.anims, t, reduced: fs.reduced })
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  // per-frame inputs the loop reads without re-subscribing
  const eventDays = useMemo(() => new Set(dream ? dream.events.map((e) => e.day) : []), [dream])
  const nextFrame = dream
    ? {
        playing,
        reduced,
        day,
        speed,
        sig: `${day}|${pathIdx}|${variant}|${reqRef.current}|${selEvent ? selEvent.key : ''}|${winter.id}`,
        events: dream.events,
        eventDays,
        runs: (d, hr) => {
          const s = dream.line[d]
          return s === 'open' || (s === 'hold' && hr >= HOLD_HOUR)
        },
        onSlide: (e) => {
          const now = performance.now()
          if (now - lastRoarRef.current < 140) return
          lastRoarRef.current = now
          audioRef.current?.slide(Math.min(4, e.size), e.wet)
        },
        onHorn: () => audioRef.current?.horn(true),
        onDay: (d) => setDay(d),
        onEnd: () => setPlaying(false),
        viewFor: (d, hour) => {
          const r = dream.daily[d]
          if (!r) return null
          const debris = []
          for (const e of dream.events) {
            if (e.day <= d && e.day > d - 14 && (e.day < d || !playing || e.hour <= hour)) {
              debris.push({ path: e.path, M: e.M, reaches: e.reaches, age: d - e.day, seed: e.day * 13 + e.path })
            }
          }
          const fenced = PATHS.map((_, p) => plan.fences.some((f) => f.path === p && f.day <= d))
          const stamped = PATHS.map((_, p) => plan.stamps.some((s) => s.path === p && s.day <= d) && dream.notes.some((n) => n.kind === 'stamp' && n.ok && n.path === p))
          const charges = plan.charges.filter((c) => c.day === d).map((c) => c.path)
          let train = null
          let trainDir = 1
          let trainCaught = false
          const status = dream.line[d]
          if (playing) {
            for (const tr of TRAINS) {
              const k = (hour - tr.hour) / 2.6
              if (k < 0 || k > 1) continue
              if (!(status === 'open' || (status === 'hold' && tr.hour >= HOLD_HOUR))) continue
              let u = 0.15 + k * 0.84
              const hit = dream.events.find((e) => e.day === d && e.outcome === 'caught' && e.train === tr.name)
              if (hit && hour >= hit.hour && u >= PATHS[hit.path].x - 0.02) {
                u = PATHS[hit.path].x - 0.02
                trainCaught = true
              }
              train = u
            }
          } else if (selEvent && selEvent.day === d && selEvent.outcome === 'caught') {
            train = PATHS[selEvent.path].x - 0.02
            trainCaught = true
          } else if (status === 'open' || status === 'hold') {
            train = 0.2
          }
          const phase = hour < 7 || hour > 18 ? 'night' : 'day'
          return { day: d, row: r, wx: r.wx, selected: pathIdx, lineStatus: status, debris, fenced, stamped, charges, train, trainDir, trainCaught, phase }
        }
      }
    : null
  useLayoutEffect(() => { frameState.current = nextFrame })

  // ------------------------------------------------------------ strata wall
  const maxH = useMemo(() => {
    if (!dream) return 200
    let m = 100
    for (const r of dream.daily) m = Math.max(m, r.hs[pathIdx])
    return Math.ceil((m + 20) / 50) * 50
  }, [dream, pathIdx])

  const traceSlab = useMemo(() => (selEvent ? new Set(selEvent.slabIds) : null), [selEvent])
  const traceId = trace ?? (selEvent ? selEvent.failedId : sel && sel.type === 'layer' ? sel.id : null)

  useEffect(() => {
    const wrap = wallWrapRef.current
    const canvas = wallCanvasRef.current
    if (!wrap || !canvas || !dream) return undefined
    const g = canvas.getContext('2d')
    const ghost = ghostRef.current
    const last = lastDreamRef.current
    if (ghost && last && last.dream !== dream && last.winter === winter.id && last.variant === variant && last.path === pathIdx && !reduced && canvas.width > 1 && ghost.animate) {
      // keep the old winter on a ghost layer and sweep it away as the new one is dreamed
      ghost.width = canvas.width
      ghost.height = canvas.height
      ghost.style.width = canvas.style.width
      ghost.style.height = canvas.style.height
      ghost.getContext('2d').drawImage(canvas, 0, 0)
      ghost.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 0 100%)' }], { duration: 760, easing: 'cubic-bezier(.6,0,.3,1)' })
      scanRef.current?.animate([{ left: '0%', opacity: 1 }, { left: '100%', opacity: 0 }], { duration: 760, easing: 'cubic-bezier(.6,0,.3,1)' })
    }
    lastDreamRef.current = { dream, winter: winter.id, variant, path: pathIdx }
    {
      const r = wrap.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(r.width * dpr))
      canvas.height = Math.max(1, Math.round(r.height * dpr))
      canvas.style.width = `${r.width}px`
      canvas.style.height = `${r.height}px`
      wallGeomRef.current = {
        ...drawStrata(g, r.width, r.height, dpr, dream.strata[pathIdx], {
          mode,
          day,
          events: pathEvents,
          traceId,
          slabIds: traceSlab,
          traceDay: selEvent ? selEvent.day : day,
          selectedKey: selEvent ? selEvent.key : null,
          maxH,
          grow: playing ? day : null
        }),
        width: r.width,
        height: r.height
      }
    }
    return undefined
  }, [dream, pathIdx, mode, day, pathEvents, traceId, traceSlab, selEvent, maxH, reduced, winter.id, variant, wallSize, playing])

  useEffect(() => {
    const wrap = wallWrapRef.current
    if (!wrap) return undefined
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect()
      setWallSize(`${Math.round(r.width)}x${Math.round(r.height)}`)
    })
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  const wallPick = useCallback((clientX, clientY, tap) => {
    const geo = wallGeomRef.current
    const wrap = wallWrapRef.current
    if (!geo || !wrap || !dream) return
    const r = wrap.getBoundingClientRect()
    const x = clientX - r.left
    const y = clientY - r.top
    const d = Math.max(0, Math.min(DAYS - 1, Math.floor((x - geo.left) / geo.cw)))
    goDay(d)
    if (!tap) return
    if (y < geo.top + 12) {
      const e = pathEvents.find((ev) => Math.abs(ev.day - d) <= 1)
      if (e) { selectEvent(e); return }
    }
    const s = dream.strata[pathIdx]
    let base = 0
    for (let k = s.offsets[d]; k < s.offsets[d + 1]; k++) {
      const h = s.data[k * 6 + 1]
      if (y <= geo.y(base) && y >= geo.y(base + h) - 1) {
        setSel({ type: 'layer', id: s.data[k * 6], day: d })
        setTrace(null)
        return
      }
      base += h
    }
  }, [dream, goDay, pathIdx, pathEvents, selectEvent])

  const onWallDown = (ev) => {
    ensureAudio()
    setPlaying(false)
    ev.currentTarget.setPointerCapture?.(ev.pointerId)
    scrubRef.current = { x: ev.clientX, y: ev.clientY, moved: false }
    wallPick(ev.clientX, ev.clientY, false)
  }
  const onWallMove = (ev) => {
    const s = scrubRef.current
    if (!s) return
    if (Math.abs(ev.clientX - s.x) > 4) s.moved = true
    wallPick(ev.clientX, ev.clientY, false)
  }
  const onWallUp = (ev) => {
    const s = scrubRef.current
    scrubRef.current = null
    if (s && !s.moved) wallPick(ev.clientX, ev.clientY, true)
  }

  // timeline scrubbing
  const laneRef = useRef(null)
  const laneScrub = useRef(null)
  const laneDay = (clientX) => {
    const r = laneRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(DAYS - 1, Math.floor(((clientX - r.left) / r.width) * DAYS)))
  }
  const onLaneDown = (ev) => {
    ensureAudio()
    setPlaying(false)
    ev.currentTarget.setPointerCapture?.(ev.pointerId)
    laneScrub.current = { x: ev.clientX, moved: false }
    goDay(laneDay(ev.clientX))
  }
  const onLaneMove = (ev) => {
    if (!laneScrub.current) return
    if (Math.abs(ev.clientX - laneScrub.current.x) > 4) laneScrub.current.moved = true
    goDay(laneDay(ev.clientX))
  }
  const onLaneUp = (ev) => {
    const tol = ev.pointerType === 'touch' ? 3 : 1
    const s = laneScrub.current
    laneScrub.current = null
    if (!s || s.moved || !dream) return
    const d = laneDay(ev.clientX)
    const r = laneRef.current.getBoundingClientRect()
    const yRel = (ev.clientY - r.top) / r.height
    if (yRel > 0.55) {
      const near = dream.events.filter((e) => Math.abs(e.day - d) <= tol).sort((a, b) => Math.abs(a.day - d) - Math.abs(b.day - d)).sort((a, b) => (a.path === pathIdx ? -1 : 0) - (b.path === pathIdx ? -1 : 0))
      if (near.length) selectEvent(near[0])
    }
  }

  // ------------------------------------------------------------ copy
  const actionText = (a) => {
    if (!a) return ''
    const pn = a.path != null ? PATHS[a.path].name : ''
    switch (a.kind) {
      case 'charge': return `Charge on the ${pn}, ${dayLabel(a.day)}.`
      case 'uncharge': return `Charge on the ${pn} taken back.`
      case 'fence': return `Fence on the ${pn} ridge from ${dayLabel(a.day)}.`
      case 'unfence': return `Fence on the ${pn} taken down.`
      case 'stamp': return `Boot crew on the ${pn}, ${dayLabel(a.day)}.`
      case 'unstamp': return `Boot crew called back from the ${pn}.`
      case 'close': return `Line closed on ${dayLabel(a.day)}.`
      case 'open': return `Line reopened on ${dayLabel(a.day)}.`
      case 'undo': return 'Undone.'
      case 'wipe': return 'The dream starts over.'
      default: return ''
    }
  }
  const evShort = (e) => `${dayLabel(e.day)}, ${PATHS[e.path].name}${e.outcome === 'caught' ? `, ${e.train} caught` : e.reaches ? ', over the line' : ''}`

  const dangerNow = row ? row.danger : 1
  const wxText = row
    ? row.wx.rain > 0
      ? `rain, ${Math.round(row.wx.rain)} mm`
      : row.wx.swe > 0
        ? `snow, ${Math.round(row.wx.swe)} mm water, wind ${Math.round(row.wx.wind)} m/s from the ${compass(row.wx.dir)}`
        : row.wx.cloud < 0.3
          ? `clear, ${Math.round(row.wx.tmin)}° at night${row.wx.wind < 3.5 && row.wx.tmin < -5 ? ', still air: feathers grow' : ''}`
          : row.wx.tmax > 1.5
            ? `thaw, ${Math.round(row.wx.tmax)}°`
            : `${row.wx.wind > 8 ? `gale from the ${compass(row.wx.dir)}` : 'grey'}, ${Math.round(row.wx.tmax)}°`
    : ''

  const used = {
    charge: plan.charges.length,
    fence: plan.fences.length,
    stamp: plan.stamps.length,
    close: plan.closures.length
  }

  const planList = useMemo(() => {
    const out = []
    for (const c of plan.charges) out.push({ kind: 'charge', day: c.day, path: c.path, glyph: '✕', text: `charge, ${PATHS[c.path].name}` })
    for (const f of plan.fences) out.push({ kind: 'fence', day: f.day, path: f.path, glyph: '⋀', text: `fence, ${PATHS[f.path].name} ridge` })
    for (const s of plan.stamps) out.push({ kind: 'stamp', day: s.day, path: s.path, glyph: '⁘', text: `boot crew, ${PATHS[s.path].name}` })
    for (const d of plan.closures) out.push({ kind: 'close', day: d, path: null, glyph: '▮', text: 'line closed' })
    return out.sort((a, b) => a.day - b.day)
  }, [plan])

  const removeItem = (it) => {
    if (it.kind === 'charge') commit({ ...plan, charges: plan.charges.filter((c) => !(c.path === it.path && c.day === it.day)) }, { kind: 'uncharge', path: it.path, day: it.day })
    if (it.kind === 'fence') commit({ ...plan, fences: plan.fences.filter((c) => c.path !== it.path) }, { kind: 'unfence', path: it.path, day: it.day })
    if (it.kind === 'stamp') commit({ ...plan, stamps: plan.stamps.filter((c) => c.path !== it.path) }, { kind: 'unstamp', path: it.path, day: it.day })
    if (it.kind === 'close') commit({ ...plan, closures: plan.closures.filter((d) => d !== it.day) }, { kind: 'open', day: it.day })
  }

  // ------------------------------------------------------------ render
  const labelPos = (p) => {
    const at = gullyPoint(p, 0.9)
    return { left: `${at.u * 100}%`, top: `${at.v * 100 + 4}%` }
  }

  const timeline = dream && (
    <svg
      ref={laneRef}
      className="ss-lanes"
      viewBox={`0 0 ${DAYS * 10} 64`}
      preserveAspectRatio="none"
      onPointerDown={onLaneDown}
      onPointerMove={onLaneMove}
      onPointerUp={onLaneUp}
      onPointerCancel={() => { laneScrub.current = null }}
      data-testid="ss-timeline"
      role="slider"
      aria-label="Day of the winter"
      aria-valuemin={1}
      aria-valuemax={DAYS}
      aria-valuenow={day + 1}
      aria-valuetext={dayLabel(day)}
      tabIndex={0}
    >
      {MONTH_TICKS.map((m) => <rect key={m.name} x={m.day * 10} y={0} width={0.8} height={64} className="ss-lane-month" />)}
      {dream.daily.map((r) => (
        <g key={r.day}>
          {r.wx.swe > 0 && <rect x={r.day * 10 + 1} y={16 - Math.min(16, r.wx.swe / 2.6)} width={8} height={Math.min(16, r.wx.swe / 2.6)} className="ss-lane-snow" />}
          {r.wx.rain > 0 && <rect x={r.day * 10 + 1} y={2} width={8} height={14} className="ss-lane-rain" />}
          {r.wx.swe === 0 && r.wx.cloud < 0.3 && r.wx.wind < 3.5 && r.wx.tmin < -5 && <circle cx={r.day * 10 + 5} cy={8} r={1.6} className="ss-lane-hoar" />}
          {r.wx.swe === 0 && r.wx.tmax > 1.5 && <rect x={r.day * 10 + 2} y={12} width={6} height={3} className="ss-lane-thaw" />}
          <rect x={r.day * 10} y={19} width={10} height={7} fill={DANGER_COLORS[r.danger]} />
          {r.status !== 'open' && <rect x={r.day * 10} y={r.status === 'hold' ? 32 : 28} width={10} height={r.status === 'hold' ? 4 : 8} className={`ss-lane-line is-${r.status}`} />}
        </g>
      ))}
      {plan.charges.map((c, i) => <path key={`c${i}`} d={`M${c.day * 10 + 2} 38 l6 6 M${c.day * 10 + 8} 38 l-6 6`} className={`ss-lane-charge ${c.path === pathIdx ? 'is-here' : ''}`} />)}
      {plan.fences.map((f, i) => <path key={`f${i}`} d={`M${f.day * 10} 44 l3 -6 l3 6 l3 -6 l3 6`} className="ss-lane-fence" />)}
      {plan.stamps.map((s, i) => <rect key={`s${i}`} x={s.day * 10 + 2} y={38} width={6} height={6} className="ss-lane-stamp" />)}
      {otherDream && otherDream.events.filter((e) => e.reaches).map((e) => (
        <path key={`b${e.key}`} d={`M${e.day * 10 + 5} 50 l4 6 l-4 6 l-4 -6 z`} className={`ss-lane-ghost ${e.outcome === 'caught' ? 'is-caught' : ''}`} />
      ))}
      {dream.events.map((e) => (
        <path
          key={e.key}
          d={e.reaches ? `M${e.day * 10 - 1} 46 h12 l-6 10 z` : `M${e.day * 10 + 2} 49 h6 l-3 5 z`}
          className={`ss-lane-ev is-${e.outcome} ${e.path === pathIdx ? 'is-path' : ''} ${selEvent && selEvent.key === e.key ? 'is-sel' : ''}`}
        />
      ))}
      {ledgerNote && ledgerNote.gone.map((e) => (
        <g key={`gone${ledgerNote.key}${e.key}`} className="ss-lane-gone">
          <path d={e.reaches ? `M${e.day * 10 - 1} 46 h12 l-6 10 z` : `M${e.day * 10 + 2} 49 h6 l-3 5 z`} />
          <line x1={e.day * 10 - 3} y1={51} x2={e.day * 10 + 13} y2={51} />
        </g>
      ))}
      <rect x={day * 10} y={0} width={10} height={64} className="ss-lane-cursor" />
    </svg>
  )

  const caughtTotal = totals ? totals.any : 0

  return (
    <div
      className={`ss-root ${intro ? 'is-intro' : ''} ${reduced ? 'is-reduced' : ''}`}
      data-testid="slab-season"
      data-winter={winter.id}
      data-day={day}
      data-path={path.id}
      data-caught={caughtTotal}
      data-lost={totals ? totals.lost : ''}
      data-variant={variant}
      data-offthread={offThread ? 'yes' : 'no'}
    >
      <header className="ss-head">
        <Link to="/playground/physics" className="ss-back" aria-label="Back to the laboratory">←</Link>
        <div className="ss-title">
          <h1>slab.season()</h1>
          <p>{winter.name}</p>
        </div>
        <nav className="ss-winters" aria-label="Winters">
          {WINTERS.map((w, i) => (
            <button
              key={w.id}
              type="button"
              className={`ss-winter ${i === winterIdx ? 'is-on' : ''}`}
              onClick={() => switchWinter(i)}
              aria-pressed={i === winterIdx}
              data-testid={`ss-winter-${w.id}`}
            >
              <span className="ss-winter-num">{['I', 'II', 'III'][i]}</span>
              <span className="ss-winter-name">{w.short}</span>
              {sealed[w.id] && <span className="ss-winter-stars" aria-label={`sealed, ${sealed[w.id].stars} of 3`}>{'★'.repeat(sealed[w.id].stars)}</span>}
            </button>
          ))}
        </nav>
        <div className="ss-head-tools">
          <button type="button" className="ss-icon" onClick={() => { ensureAudio(); setMuted((m) => !m) }} aria-pressed={muted} aria-label={muted ? 'Sound off' : 'Sound on'} data-testid="ss-mute">{muted ? '♪̸' : '♪'}</button>
          <button type="button" className="ss-icon" onClick={() => setHelp((h) => !h)} aria-expanded={help} aria-label="How it works" data-testid="ss-help-toggle">?</button>
        </div>
      </header>

      <section className="ss-pano" ref={panoWrapRef} data-playground-surface data-testid="ss-pano">
        <canvas ref={panoCanvasRef} role="img" aria-label={`The pass on ${dayLabel(day)}: ${STATUS_TEXT[row ? row.status : 'open']}, danger ${DANGER_NAMES[dangerNow]}.`} />
        {PATHS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={`ss-path ${i === pathIdx ? 'is-on' : ''} ${row && row.minSI[i] < 1.2 ? 'is-stressed' : ''}`}
            style={labelPos(i)}
            onClick={() => { ensureAudio(); setPathIdx(i); setSel(null); setTrace(null) }}
            aria-pressed={i === pathIdx}
            data-testid={`ss-path-${p.id}`}
          >
            <span className="ss-path-key">{i + 1}</span><span className="ss-path-name">{p.name}</span>
          </button>
        ))}
        <div className="ss-plate">
          <span className="ss-date" data-testid="ss-date">{dayLabel(day)}</span>
          <span className="ss-wx">{wxText}</span>
          {winter.twoDreams && (
            <button type="button" className={`ss-dreamswitch is-${variant}`} onClick={() => setVariant((v) => (v === 'A' ? 'B' : 'A'))} data-testid="ss-dream-switch" data-playground-action="dream">
              dream {variant === 'A' ? 'one: storm from the west' : 'two: storm from the north'}
            </button>
          )}
        </div>
        {toast && (
          <div className={`ss-toast ${toast.caughtAfter < toast.caughtBefore ? 'is-good' : toast.caughtAfter > toast.caughtBefore ? 'is-bad' : ''}`} key={toast.key} data-testid="ss-toast" aria-hidden="true">
            <b>{actionText(toast.action)}</b>
            <span>trains caught {toast.caughtBefore} → {toast.caughtAfter} · days lost {toast.lostBefore} → {toast.lostAfter}{toast.gone ? ` · ${toast.gone} slide${toast.gone > 1 ? 's' : ''} gone` : ''}{toast.fresh ? ` · ${toast.fresh} new` : ''}</span>
          </div>
        )}
        <div className="ss-signs">
          <span className="ss-danger" style={{ '--dc': DANGER_COLORS[dangerNow] }} data-testid="ss-danger">danger {dangerNow} · {DANGER_NAMES[dangerNow]}</span>
          <span className={`ss-status is-${row ? row.status : 'open'}`} data-testid="ss-status">{STATUS_TEXT[row ? row.status : 'open']}</span>
        </div>
        {!ready && <div className="ss-dreaming">dreaming the winter…</div>}
      </section>

      <section className="ss-wall" aria-label="Snowpack through the winter">
        <div className="ss-wall-head">
          <div className="ss-transport">
            <button type="button" className="ss-btn ss-step" onClick={() => goDay(day - 1)} aria-label="Previous day" data-testid="ss-prev-day">‹</button>
            <button type="button" className={`ss-btn ss-play ${playing ? 'is-on' : ''}`} onClick={togglePlay} aria-pressed={playing} data-testid="ss-play" data-playground-action="play">{playing ? '❚❚ pause' : '▶ live it'}</button>
            <button type="button" className="ss-btn ss-speed" onClick={() => setSpeed((v) => (v === 1 ? 4 : v === 4 ? 16 : 1))} aria-label={`Playback speed ${speed} times`} data-testid="ss-speed">{speed}×</button>
            <button type="button" className="ss-btn ss-step" onClick={() => goDay(day + 1)} aria-label="Next day" data-testid="ss-next-day">›</button>
            <button type="button" className="ss-btn ss-jump" onClick={() => jumpEvent(-1)} aria-label="Previous slide" data-testid="ss-prev-slide">⇤ slide</button>
            <button type="button" className="ss-btn ss-jump" onClick={() => jumpEvent(1)} aria-label="Next slide" data-testid="ss-next-slide" data-playground-action="next-slide">slide ⇥</button>
          </div>
          <div className="ss-wall-title">
            <strong>{path.name}</strong> faces {compass(path.aspect)}, {path.slope}°{row ? ` · ${Math.round(row.hs[pathIdx])} cm deep` : ''}
          </div>
          <button type="button" className="ss-btn ss-mode" onClick={() => setMode((m) => (m === 'grain' ? 'stability' : 'grain'))} aria-pressed={mode === 'stability'} data-testid="ss-mode">
            {mode === 'grain' ? 'show stability' : 'show grains'}
          </button>
        </div>
        <div className="ss-lanes-wrap">
          <div className="ss-lane-labels" aria-hidden="true"><span>sky</span><span>danger</span><span>line</span><span>slides</span></div>
          {timeline}
        </div>
        <div
          className="ss-wall-canvas"
          ref={wallWrapRef}
          onPointerDown={onWallDown}
          onPointerMove={onWallMove}
          onPointerUp={onWallUp}
          onPointerCancel={() => { scrubRef.current = null }}
          data-testid="ss-wall"
          tabIndex={0}
          aria-label={`Layers of the ${path.name}. Up and down step through today's layers.`}
        >
          <canvas ref={wallCanvasRef} role="img" aria-label={`Layers of the ${path.name} through the winter`} />
          <canvas ref={ghostRef} className="ss-wall-ghost" aria-hidden="true" />
          <span ref={scanRef} className="ss-wall-scan" aria-hidden="true" />
        </div>
        <div className="ss-legend" aria-hidden="true">
          {mode === 'grain'
            ? GRAIN_NAMES.map((n, i) => <span key={n}><i style={{ background: GRAIN_COLORS[i] }} />{n}</span>)
            : [[0.9, 'failing'], [1.2, 'close'], [1.6, 'uneasy'], [2.5, 'holding'], [5, 'sound']].map(([v, n]) => <span key={n}><i style={{ background: siColor(v) }} />{n}</span>)}
        </div>
      </section>

      <aside className="ss-side" data-testid="ss-side">
        <h2 className="ss-side-h">the watch book</h2>
        <div className="ss-score" data-testid="ss-score">
          <div className={`ss-caught ${caughtTotal ? 'is-bad' : 'is-good'}`}>
            <b data-testid="ss-caught" key={totals ? totals.caught.join('-') : 'x'} className="ss-bump">{totals ? totals.caught.join(' · ') : '–'}</b>
            <span>{totals && totals.caught.length > 1 ? 'trains caught, dream one · two' : 'trains caught in the dream'}</span>
          </div>
          <div className="ss-lost">
            <b data-testid="ss-lost" key={totals ? `l${totals.lost}` : 'y'} className="ss-bump">{totals ? totals.lost : '–'}</b>
            <span>days of service lost · par {winter.par}</span>
          </div>
          <button
            type="button"
            className="ss-seal"
            disabled={!canSeal}
            onClick={seal}
            data-testid="ss-seal"
            data-playground-action={canSeal ? 'seal' : undefined}
          >
            {canSeal ? 'seal this winter' : totals && totals.caught.length > 1 ? `caught in a dream: ${totals.caught.join(' · ')}` : `${caughtTotal} ${caughtTotal === 1 ? 'train' : 'trains'} still caught`}
          </button>
        </div>

        <h2 className="ss-side-h ss-shed-h">the shed</h2>
        <div className="ss-tools ss-dock" role="group" aria-label={`Work on the ${path.name}, ${dayLabel(day)}`}>
          {[
            ['charge', '✕', 'charge', BUDGET.charge, 'C'],
            ['fence', '⋀', 'fence', BUDGET.fence, 'F'],
            ['stamp', '⁘', 'boot crew', BUDGET.stamp, 'S'],
            ['close', '▮', 'close line', BUDGET.close, 'L']
          ].map(([k, glyph, name, max, key]) => (
            <button
              key={k}
              type="button"
              className={`ss-tool is-${k}`}
              onClick={() => { ensureAudio(); tools[k].run() }}
              disabled={!tools[k].can}
              title={tools[k].why || tools[k].label}
              aria-label={`${tools[k].label}${tools[k].why ? `, ${tools[k].why}` : ''}`}
              data-testid={`ss-tool-${k}`}
              data-playground-action={k === 'charge' ? 'charge' : undefined}
            >
              <span className="ss-tool-glyph">{glyph}</span>
              <span className="ss-tool-name">{name}</span>
              <span className="ss-tool-count">{max - used[k]}/{max}</span>
              <kbd>{key}</kbd>
            </button>
          ))}
          <p className="ss-dock-ctx" aria-hidden="true">{path.name} · {dayLabel(day)}</p>
          <p className="ss-tool-hint" data-testid="ss-tool-hint">
            {tools.stamp.why && !tools.stamp.can ? `Boot crew: ${tools.stamp.why}. ` : ''}Tools act on the <b>{path.name}</b> on <b>{dayLabel(day)}</b>.
          </p>
        </div>

        <div className="ss-inspect" data-testid="ss-inspect" aria-live="polite">
          {selEvent ? (
            <article className={`ss-card is-event is-${selEvent.outcome}`} data-testid="ss-event-card">
              <header>
                <span>{dayLabel(selEvent.day)} · {hourLabel(selEvent.hour)}</span>
                <h2>{PATHS[selEvent.path].name} ran {TRIGGER_TEXT[selEvent.trigger]}</h2>
              </header>
              <p className="ss-outcome">{OUTCOME_LINE[selEvent.outcome](selEvent)}</p>
              <ol className="ss-chain">
                <li><i style={{ background: GRAIN_COLORS[selEvent.failedGrain] }} />It failed on <b>{GRAIN_NAMES[selEvent.failedGrain]}</b>: {selEvent.failedCause}{selEvent.onCrust ? ', lying on a crust' : ''}.</li>
                {selEvent.buriedDay > selEvent.failedBorn && <li>Buried on {dayLabel(selEvent.buriedDay)}{selEvent.day > selEvent.buriedDay ? `, ${selEvent.day - selEvent.buriedDay} ${selEvent.day - selEvent.buriedDay === 1 ? 'day' : 'days'} before it went` : ', the day it went'}.</li>}
                {selEvent.loads.length > 0 && <li>Loaded by {selEvent.loads.join('; ')}.</li>}
                <li>The slab was {Math.round(selEvent.D)} cm deep. Its run was worth {Math.round(selEvent.M)}, and the {PATHS[selEvent.path].name} needs {PATHS[selEvent.path].reach} to reach the line.</li>
                <li>Stability {selEvent.si.toFixed(2)}: the stress outweighed the layer's strength.</li>
              </ol>
              <p className="ss-hint">{hintFor(selEvent, dream)}</p>
              <div className="ss-card-actions">
                <button type="button" className="ss-btn" onClick={() => { setTrace(selEvent.failedId); goDay(selEvent.failedBorn) }} data-testid="ss-trace">find where it formed</button>
                {selEvent.buriedDay > selEvent.failedBorn && <button type="button" className="ss-btn" onClick={() => goDay(selEvent.buriedDay)} data-testid="ss-buried">go to the burial</button>}
              </div>
            </article>
          ) : layerInfo ? (
            <article className="ss-card is-layer" data-testid="ss-layer-card">
              <header>
                <span>{path.name} · {dayLabel(layerInfo.day)}</span>
                <h2>{layerInfo.gone ? 'gone by this day' : layerInfo.g === 5 && layerInfo.depth < 1 ? 'surface hoar: feathers, not yet buried' : GRAIN_NAMES[layerInfo.g]}</h2>
              </header>
              {layerInfo.info && <p>{cap(layerInfo.info.cause)}.</p>}
              {!layerInfo.gone && (
                <dl className="ss-facts">
                  <div><dt>thick</dt><dd>{layerInfo.h.toFixed(0)} cm</dd></div>
                  <div><dt>under</dt><dd>{Math.round(layerInfo.depth)} cm</dd></div>
                  <div><dt>density</dt><dd>{Math.round(layerInfo.rho)} kg/m³</dd></div>
                  <div><dt>stability</dt><dd style={{ color: layerInfo.si < 1.3 ? '#c62d2d' : undefined }}>{layerInfo.si >= 9 ? 'unloaded' : layerInfo.si.toFixed(2)}</dd></div>
                </dl>
              )}
              <div className="ss-card-actions">
                <button type="button" className="ss-btn" onClick={() => setTrace(layerInfo.id)} data-testid="ss-trace-layer">trace it through the winter</button>
              </div>
            </article>
          ) : (
            <article className="ss-card is-day" data-testid="ss-day-card">
              <header>
                <span>{dayLabel(day)} · {STATUS_TEXT[row ? row.status : 'open']}</span>
                <h2>{path.name}{weakestHere ? `: weakest layer is ${GRAIN_NAMES[weakestHere.g]}` : ': nothing loaded yet'}</h2>
              </header>
              {weakestHere && (
                <p>
                  {Math.round(weakestHere.depth)} cm down, stability <b style={{ color: weakestHere.si < 1.3 ? '#c62d2d' : undefined }}>{weakestHere.si.toFixed(2)}</b>.
                  {weakestHere.si < 1 ? ' It fails today.' : weakestHere.si < 1.3 ? ' It is close.' : ''}
                  {dream.registry[weakestHere.id] ? ` ${cap(dream.registry[weakestHere.id].cause)}.` : ''}
                </p>
              )}
              {dayEvents.length > 0 ? (
                <ul className="ss-day-events">
                  {dayEvents.map((e) => (
                    <li key={e.key}><button type="button" className="ss-link" onClick={() => selectEvent(e)}>{hourLabel(e.hour)} {PATHS[e.path].name}: {e.outcome === 'caught' ? `${e.train} caught` : e.reaches ? 'over the line' : 'short of the line'}</button></li>
                  ))}
                </ul>
              ) : <p className="ss-quiet">No slides today.</p>}
            </article>
          )}
        </div>

        <div className="ss-ledger" data-testid="ss-ledger">
          {ledgerNote && (
            <div className="ss-change" key={ledgerNote.key} data-testid="ss-change">
              <p><b>{actionText(ledgerNote.action)}</b> {ledgerNote.caughtAfter < ledgerNote.caughtBefore ? `Trains caught: ${ledgerNote.caughtBefore} → ${ledgerNote.caughtAfter}.` : ledgerNote.caughtAfter > ledgerNote.caughtBefore ? `Worse: ${ledgerNote.caughtBefore} → ${ledgerNote.caughtAfter} caught.` : ledgerNote.gone.length || ledgerNote.fresh.length ? 'The winter shifted.' : 'Nothing in the winter changed.'}</p>
              {ledgerNote.gone.slice(0, 3).map((e) => <p key={`g${e.key}`} className="is-gone">gone: {evShort(e)}</p>)}
              {ledgerNote.fresh.slice(0, 3).map((e) => <p key={`n${e.key}`} className="is-new">new: <button type="button" className="ss-link" onClick={() => { const live = dream.events.find((x) => x.key === e.key); if (live) selectEvent(live) }}>{evShort(e)}</button></p>)}
            </div>
          )}
          <div className="ss-plan-head">
            <h3>your winter</h3>
            <button type="button" className="ss-link" onClick={undo} data-testid="ss-undo">undo</button>
            <button type="button" className="ss-link" onClick={wipe} data-testid="ss-wipe">start over</button>
          </div>
          {planList.length === 0 ? <p className="ss-quiet">Nothing changed yet. This is the winter as it would fall.</p> : (
            <ul className="ss-plan">
              {planList.map((it) => (
                <li key={`${it.kind}${it.day}${it.path}`}>
                  <button type="button" className="ss-link" onClick={() => { goDay(it.day); if (it.path != null) setPathIdx(it.path); setSel(null) }}>{it.glyph} {dayLabel(it.day)}, {it.text}</button>
                  <button type="button" className="ss-x" onClick={() => removeItem(it)} aria-label={`Remove ${it.text} on ${dayLabel(it.day)}`}>×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {intro && (
        <div className="ss-intro" role="dialog" aria-modal="true" aria-labelledby="ss-intro-title" data-testid="ss-intro">
          <div className="ss-intro-card">
            <p className="ss-kicker">avalanche watch · six gullies above the line</p>
            <h2 id="ss-intro-title">slab.season()</h2>
            <p>On the first night of snow I dream the whole winter at once: every storm, every clear night, every layer the wind lays down. In this dream, {dream && dream.events.find((e) => e.outcome === 'caught') ? `${dream.events.find((e) => e.outcome === 'caught').train} is caught under the ${PATHS[dream.events.find((e) => e.outcome === 'caught').path].name} on ${dayLabel(dream.events.find((e) => e.outcome === 'caught').day)}` : 'a train is caught'}.</p>
            <p>A dream can be changed. This winter the company sends {winter.supplies}. Every change dreams the winter again. Read the layers, find the one that fails, and remake the season until it carries no one off.</p>
            <button type="button" className="ss-begin" onClick={begin} data-playground-primary data-testid="ss-begin" autoFocus>read the dream</button>
            <p className="ss-keys">drag the chart to move through days · tap a gully · <kbd>C</kbd> <kbd>F</kbd> <kbd>S</kbd> <kbd>L</kbd> to work · <kbd>space</kbd> to live it</p>
          </div>
        </div>
      )}

      {help && (
        <div className="ss-help" role="dialog" aria-modal="true" aria-label="How it works" data-testid="ss-help">
          <div className="ss-help-card">
            <h2>how the winter works</h2>
            <ul>
              <li><b>Layers.</b> Every snowfall is a layer. Clear, calm, cold nights grow <i style={{ background: GRAIN_COLORS[5] }} /> surface hoar. A shallow pack under hard cold rots into <i style={{ background: GRAIN_COLORS[3] }} /> facets and <i style={{ background: GRAIN_COLORS[4] }} /> depth hoar. Rain and thaw freeze into <i style={{ background: GRAIN_COLORS[6] }} /> crusts. Buried weak layers stay weak.</li>
              <li><b>Release.</b> A layer fails when the weight above it outweighs its strength. The wind loads the slopes that face away from it. Big slabs cross the line. Trains run day and night: the night mail at 04:50, then 08:10, 12:40, 17:30 and the late goods at 21:40. A train that meets debris is caught, and the line stops behind it.</li>
              <li><b>✕ Charge</b> at first light adds a shock that reaches about a metre down. If the slab is ready it comes down while the line is held; if it crosses, you lose a day digging. <b>⋀ Fence</b> holds back drift on a ridge, and some of it spills onto the next slope. <b>⁘ Boot crew</b> stamps a shallow gully (under 70 cm) into one firm layer. <b>▮ Close</b> keeps the trains in the yard for one day; the company allows only a few. Every closed or dug-out day counts against the season.</li>
              <li><b>Inspect.</b> Tap a slide to see why it went, then trace its weak layer back to the night it formed. Switch to stability to see what is close to failing.</li>
            </ul>
            <p className="ss-keys"><kbd>↑</kbd><kbd>↓</kbd> layers on the chart · <kbd>←</kbd><kbd>→</kbd> day (<kbd>shift</kbd> week) · <kbd>1</kbd>–<kbd>6</kbd> gully · <kbd>N</kbd>/<kbd>P</kbd> next/previous slide · <kbd>G</kbd> grains/stability · <kbd>Z</kbd> undo · <kbd>space</kbd> live it · <kbd>D</kbd> other dream · <kbd>M</kbd> sound · <kbd>Esc</kbd> close</p>
            <button type="button" className="ss-btn" onClick={() => setHelp(false)} data-testid="ss-help-close" autoFocus>back to the winter</button>
          </div>
        </div>
      )}

      {sealCard && (
        <div className="ss-help" role="dialog" aria-modal="true" aria-label="Winter sealed" data-testid="ss-sealed">
          <div className="ss-help-card ss-sealed-card">
            <p className="ss-kicker">{WINTERS.find((w) => w.id === sealCard.winter).name}</p>
            <h2>the winter is written</h2>
            <p className="ss-stars" aria-label={`${sealCard.stars} of 3`}>{'★'.repeat(sealCard.stars)}<span>{'★'.repeat(3 - sealCard.stars)}</span></p>
            <p>No train is caught. {sealCard.lost} {sealCard.lost === 1 ? 'day' : 'days'} of service lost against a par of {winter.par}.{sealCard.best ? ' This is your best for this winter.' : ''}</p>
            <p className="ss-lesson">{winter.lesson}</p>
            <div className="ss-card-actions">
              {winterIdx < WINTERS.length - 1 && <button type="button" className="ss-begin" onClick={() => { setSealCard(null); switchWinter(winterIdx + 1) }} data-testid="ss-next-winter" autoFocus>dream the next winter</button>}
              <button type="button" className="ss-btn" onClick={() => { setSealCard(null); setDay(0); setPlaying(true); animState.current.dayF = 0 }} data-testid="ss-live-sealed">live it from the first snow</button>
              <button type="button" className="ss-btn" onClick={() => setSealCard(null)} autoFocus={winterIdx === WINTERS.length - 1}>keep dreaming</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
