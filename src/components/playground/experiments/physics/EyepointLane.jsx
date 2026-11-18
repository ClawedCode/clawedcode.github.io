import { useCallback, useEffect, useRef, useState } from 'react'
import ExperimentNav from '../../ExperimentNav'
import { LANE, placeable } from './eyepoint/geometry'
import { makeEye, layPaint, legibility, tuning } from './eyepoint/sight'
import { rasterSigil, sampleMask } from './eyepoint/sigils'
import { PROLOGUE, COMMISSIONS, KEEP, propsFor, zonesFor, walkOf } from './eyepoint/levels'
import { createScene } from './eyepoint/scene'
import { createAudio } from './eyepoint/audio'
import './EyepointLane.css'

const SAVE_KEY = 'eyepoint-lane.v1'
const FREE_SLOT = 4
const FREE_PIGMENT = { name: 'rose madder', color: '#e8459a', light: '#ff9ccf' }
const PCT = v => `${Math.round(v * 100)}%`
// one decimal when a score sits within a point of its limit, so a pass never reads as a tie
const NEAR = (v, limit) => (Math.abs(v - limit) < 0.01 ? `${(v * 100).toFixed(1)}%` : PCT(v))
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const STEP = 0.25
const TURN = Math.PI / 8
const SHAPE_NAME = { board: 'plaster board', slat: 'narrow board', screen: 'sail screen', crate: 'crate' }

const readSave = () => {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null') } catch { return null }
}
const writeSave = s => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)) } catch { /* the evening still runs without it */ } }
const clearSave = () => { try { localStorage.removeItem(SAVE_KEY) } catch { /* nothing stored */ } }

const cleanWord = w => (w || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 7)
const eyeFor = e => makeEye(e.pos, e.aim, e.fov, e.role === 'watch' ? { cone: e.fov * 0.62 } : {})
const viewOf = e => ({ pos: e.pos, aim: e.aim, fov: e.role === 'watch' ? 70 : e.fov, margin: e.role === 'watch' ? 1 : 1.15 })

// every eye that matters to a commission: its clients, its watchers, and the
// clients sealed earlier, who are still sitting there looking at theirs
const eyesOf = (c, done) => [
  ...c.seats.map(s => ({ ...s, role: 'seat' })),
  ...c.watchers.map(w => ({ ...w, role: 'watch' })),
  ...done.filter(d => d.id !== c.id).flatMap(d => d.seats.map(s => ({ ...s, id: `${s.id}-past`, role: 'past', need: s.need - KEEP, from: d.id })))
]

const figuresOf = (c, done) => {
  const out = []
  for (const s of c.seats) out.push({ id: s.id, pos: s.pos, aim: s.aim, pose: 'sit', eyes: '#ffd36b' })
  for (const w of c.watchers) out.push({ id: w.id, pos: w.pos, aim: w.aim, pose: 'stand', lamp: true, eyes: '#ffe9a8', cone: w.fov * 0.62, fur: '#1c1a22' })
  for (const d of done) {
    if (d.id === c.id) continue
    for (const s of d.seats) out.push({ id: `${s.id}-past`, pos: s.pos, aim: s.aim, pose: 'sit', eyes: '#f3b44e', scale: 0.94 })
  }
  return out
}

function StencilCard({ samples, paint, focus, color, size = 132 }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    if (!c || !samples) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = size * dpr; c.height = size * dpr
    const g = c.getContext('2d')
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, size, size)
    const r = Math.max(1.3, size / 85)
    for (let i = 0; i < samples.length; i++) {
      const [u, v] = samples[i]
      const x = (u * 0.5 + 0.5) * size; const y = (0.5 - v * 0.5) * size
      const caught = !!paint?.hits[i]?.p
      g.globalAlpha = 1
      if (!caught) {
        g.strokeStyle = 'rgba(40, 34, 28, 0.45)'; g.lineWidth = 0.7
        g.beginPath(); g.arc(x, y, r * 0.8, 0, Math.PI * 2); g.stroke()
        continue
      }
      g.fillStyle = color
      if (focus) g.globalAlpha = focus[i] === 2 ? 1 : focus[i] === 1 ? 0.28 : 0.1
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
    }
    g.globalAlpha = 1
  }, [samples, paint, focus, color, size])
  return <canvas ref={ref} className="ep-stencil-canvas" style={{ width: size, height: size }} aria-hidden="true" />
}

// an eye as a dial: the iris fills with how much of the message it can join up
function IrisDial({ score, mark, role }) {
  const deg = Math.round(clamp(score, 0, 1) * 360)
  const tick = Math.round(clamp(mark, 0, 1) * 360)
  return (
    <span className={`ep-iris is-${role}`} style={{ '--fill': `${deg}deg`, '--tick': `${tick}deg` }} aria-hidden="true">
      <span className="ep-iris-tick" />
      <span className="ep-iris-pupil" />
    </span>
  )
}

export default function EyepointLane({ category, experiment }) {
  const rootRef = useRef(null)
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const benchRef = useRef(null)
  const sceneRef = useRef(null)
  const audioRef = useRef(null)
  const tagRefs = useRef(new Map())
  const timers = useRef([])
  const keys = useRef(new Set())
  const drag = useRef(null)
  const pointers = useRef(new Map())
  const seq = useRef(0)
  const alive = useRef(true)

  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 760)
  const [coarse] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches)
  const [phase, setPhase] = useState('title')
  const [stage, setStage] = useState(0)
  const [muted, setMuted] = useState(false)
  const [help, setHelp] = useState(false)
  const [saved] = useState(readSave)
  const [hud, setHud] = useState(null)
  const [focusEye, setFocusEye] = useState(null)
  const [selected, setSelected] = useState(null)
  const [word, setWord] = useState('TONIGHT')
  const [toast, setToast] = useState(null)
  const [verdict, setVerdict] = useState(null)
  const [walk, setWalk] = useState({ together: 0, dir: null, hint: 0 })
  const [tour, setTour] = useState(null)
  const [free, setFree] = useState({ eye: null, coverage: 0 })
  const [tags, setTags] = useState([])

  // the mutable world, outside React's render cycle
  const world = useRef({
    props: new Map(),
    done: [],
    sealed: {},
    prologuePaint: null,
    walker: { pos: [...PROLOGUE.start.pos] },
    live: null,
    dirty: false,
    words: {},
    together: 0
  })

  const solids = () => [...LANE, ...world.current.props.values()]
  const commission = COMMISSIONS[Math.min(stage, COMMISSIONS.length - 1)]
  const pigment = phase === 'free' ? FREE_PIGMENT : (phase === 'prologue' || phase === 'title' || phase === 'found') ? PROLOGUE.pigment : commission.pigment

  const say = useCallback((text, ms = 2600) => {
    setToast({ text, k: Date.now() })
    setTimeout(() => { if (alive.current) setToast(t => (t && t.text === text ? null : t)) }, ms)
  }, [])
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); return id }
  const wait = ms => new Promise(r => later(r, ms))
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; seq.current++ }

  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(q.matches)
    q.addEventListener?.('change', on)
    const rs = () => setMobile(window.innerWidth < 760)
    window.addEventListener('resize', rs)
    return () => { q.removeEventListener?.('change', on); window.removeEventListener('resize', rs) }
  }, [])
  useEffect(() => { sceneRef.current?.setReduced(reduced) }, [reduced])

  const ensureAudio = () => {
    if (!audioRef.current) audioRef.current = createAudio()
    audioRef.current?.resume()
    audioRef.current?.setMuted(muted)
  }
  const sfx = (name, ...a) => { const au = audioRef.current; if (au && au[name]) au[name](...a) }

  // build the scene once
  useEffect(() => {
    alive.current = true
    const canvas = canvasRef.current
    const S = createScene(canvas, { reduced, mobile: window.innerWidth < 760 })
    sceneRef.current = S
    const ro = new ResizeObserver(() => {
      const r = wrapRef.current.getBoundingClientRect()
      S.resize(r.width, r.height)
    })
    ro.observe(wrapRef.current)
    const r = wrapRef.current.getBoundingClientRect()
    S.resize(r.width, r.height)

    // the message that was already here
    const P = PROLOGUE.painter
    const eye = makeEye(P.pos, P.aim, P.fov)
    const rs = rasterSigil(PROLOGUE.sigil)
    const samples = sampleMask(rs)
    world.current.prologuePaint = { eye, samples, paint: layPaint(LANE, eye, samples) }
    S.setLayer(0, { eye, mask: rs.mask, color: PROLOGUE.pigment.color, alpha: 1, mode: 'paint', reveal: 1 })
    S.setFigures([], [])
    // open on the stranger's paint, seen from the wrong place: weather on the walls
    S.goTo({ pos: [-1.2, 3.4, 6.6], aim: [-0.6, 1.9, -5.4], fov: 52 }, 0)

    let raf = 0; let last = performance.now()
    let tagTick = 0
    const loop = now => {
      const wall = Math.min(0.25, (now - last) / 1000); last = now
      const dt = Math.min(0.05, wall)
      world.current.tick?.(dt)
      tagTick += wall
      S.frame(dt, tagTick > 0.05 ? list => {
        tagTick = 0
        const w = wrapRef.current?.clientWidth || 0
        for (const t of list) {
          const el = tagRefs.current.get(t.id)
          if (!el) continue
          const half = (el.offsetWidth || 80) / 2 + 6
          const x = Math.max(half, Math.min(w - half, t.x))
          el.style.transform = `translate(${x}px, ${t.y}px) translate(-50%, -100%)`
          el.style.opacity = t.front && t.vis ? '1' : '0'
        }
      } : null, wall)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      alive.current = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      clearTimers()
      S.dispose()
      audioRef.current?.close()
      audioRef.current = null
      sceneRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { audioRef.current?.setMuted(muted) }, [muted])

  // the phone's eye strip sits on top of the bench, whatever height the bench is
  useEffect(() => {
    const el = benchRef.current
    if (!el) return
    const ro = new ResizeObserver(() => rootRef.current?.style.setProperty('--ep-bench-h', `${el.offsetHeight}px`))
    ro.observe(el)
    return () => ro.disconnect()
  })

  // dialogs take focus when they open; closing hands it back
  const lastFocus = useRef(null)
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const target = help ? root.querySelector('.ep-help [data-autofocus]') : root.querySelector('[data-autofocus]')
    if (target) target.focus({ preventScroll: true })
    else if (phase === 'build' || phase === 'prologue' || phase === 'free') wrapRef.current.focus({ preventScroll: true })
  }, [phase, help, verdict])
  useEffect(() => {
    if (!help) { lastFocus.current?.focus?.({ preventScroll: true }); return }
    lastFocus.current = document.activeElement
    const trap = e => {
      if (e.key !== 'Tab') return
      const card = rootRef.current?.querySelector('.ep-help')
      const f = card ? [...card.querySelectorAll('button, input')] : []
      if (!f.length) return
      const i = f.indexOf(document.activeElement)
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus() } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus() }
    }
    window.addEventListener('keydown', trap)
    return () => window.removeEventListener('keydown', trap)
  }, [help])

  // a small animation on its own frames, which stops if the page goes away
  const animate = (ms, step, done) => {
    const t0 = performance.now()
    const tick = () => {
      if (!alive.current) return
      const k = clamp((performance.now() - t0) / ms, 0, 1)
      step(k)
      if (k < 1) requestAnimationFrame(tick); else done?.()
    }
    requestAnimationFrame(tick)
  }

  // ---- the live sight tests for the commission in hand ----
  const judge = useCallback((withInliers = true) => {
    const W = world.current
    const L = W.live
    if (!L) return null
    const sol = solids()
    const paint = layPaint(sol, L.eye, L.samples)
    const eyes = eyesOf(L.c, W.done).map(e => {
      const p = e.role === 'past' ? W.sealed[e.from] : paint
      // the watch walks his round: a board in his way hides nothing, and he reads
      // whatever he can from the best spot on it
      const r = e.role === 'watch'
        ? walkOf(e).map(w => legibility(sol, p, eyeFor({ ...w, role: 'watch' }), { keepInliers: withInliers, occluders: LANE })).reduce((a, b) => (b.score > a.score ? b : a))
        : legibility(sol, p, eyeFor(e), { keepInliers: withInliers })
      const ok = e.role === 'watch' ? r.score <= e.max : r.score >= e.need
      return { ...e, score: r.score, ok, inliers: r.inliers, samples: e.role === 'past' ? W.sealedSamples[e.from] : null }
    })
    const lost = {}
    for (const h of paint.hits) if (!h.p) lost[h.lost] = (lost[h.lost] || 0) + 1
    const covered = paint.coverage >= L.c.coverage
    return { coverage: paint.coverage, need: L.c.coverage, covered, eyes, lost, pass: covered && eyes.every(e => e.ok), paint, samples: L.samples }
  }, [])
  const evaluate = useCallback(() => {
    const r = judge(true)
    if (r) setHud(r)
  }, [judge])

  useEffect(() => {
    world.current.tick = () => {
      const W = world.current
      if (W.dirty) { W.dirty = false; evaluate() }
      if (W.walking) W.walking()
    }
  }, [evaluate])

  // ---- the prologue: find where the stranger stood ----
  const walkerUpdate = useCallback(() => {
    const W = world.current
    const S = sceneRef.current
    if (!S || !W.prologuePaint) return
    const pos = W.walker.pos
    S.setEyeLive(pos, PROLOGUE.painter.aim, 60)
    const v = makeEye(pos, PROLOGUE.painter.aim, 60)
    const L = legibility(LANE, W.prologuePaint.paint, v)
    const together = tuning(W.prologuePaint.paint, PROLOGUE.painter.pos, pos)
    W.together = together
    sfx('drone', true, together)
    // which way the paint pulls, in the walker's own frame
    const { fwd, right } = S.camBasis()
    const P = PROLOGUE.painter.pos
    const dx = P[0] - pos[0]; const dz = P[2] - pos[2]; const dy = P[1] - pos[1]
    const r = dx * right[0] + dz * right[1]; const f = dx * fwd[0] + dz * fwd[1]
    const words = []
    if (Math.abs(f) > 0.3) words.push(f > 0 ? 'further in' : 'step back')
    if (Math.abs(r) > 0.3) words.push(r > 0 ? 'to your right' : 'to your left')
    if (Math.abs(dy) > 0.25) words.push(dy > 0 ? 'higher' : 'lower')
    setWalk(w => ({ ...w, together, dir: words.join(' · ') || 'right here' }))
    if (L.global < 0.045 && L.seen > 0.6 && !W.found) {
      W.found = true
      W.walking = null
      sfx('drone', true, 1)
      sfx('lock')
      const token = seq.current
      S.goTo({ pos: PROLOGUE.painter.pos, aim: PROLOGUE.painter.aim, fov: 60, margin: 1.18 }, 1.2).then(async () => {
        await wait(900)
        if (seq.current !== token || !alive.current) return
        sfx('drone', false)
        setPhase('found')
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const moveWalker = (dr, df, du) => {
    const W = world.current
    const S = sceneRef.current
    if (!S || W.found) return
    const { fwd, right } = S.camBasis()
    const p = W.walker.pos
    p[0] = clamp(p[0] + right[0] * dr + fwd[0] * df, -8.4, 8.4)
    p[2] = clamp(p[2] + right[1] * dr + fwd[1] * df, -4.6, 6.4)
    p[1] = clamp(p[1] + du, 0.5, 4.6)
    walkerUpdate()
  }

  const startPrologue = async () => {
    ensureAudio()
    clearTimers()
    const token = seq.current
    const W = world.current
    W.found = false
    W.walker.pos = [...PROLOGUE.start.pos]
    setPhase('prologue')
    setWalk({ together: 0, dir: null, hint: 0 })
    const S = sceneRef.current
    S.setHour('late afternoon')
    S.setFigures([], [])
    later(() => setWalk(w => ({ ...w, hint: 1 })), 20000)
    later(() => setWalk(w => ({ ...w, hint: 2 })), 40000)
    await S.goTo({ pos: W.walker.pos, aim: PROLOGUE.painter.aim, fov: 60, margin: 1.18 }, 1.6)
    if (seq.current !== token) return
    let last = performance.now()
    W.walking = () => {
      const now = performance.now(); const dt = Math.min(0.1, (now - last) / 1000); last = now
      const k = keys.current
      let f = 0; let r = 0; let u = 0
      if (k.has('w') || k.has('arrowup')) f += 1
      if (k.has('s') || k.has('arrowdown')) f -= 1
      if (k.has('d') || k.has('arrowright')) r += 1
      if (k.has('a') || k.has('arrowleft')) r -= 1
      if (k.has('r') || k.has('pageup')) u += 1
      if (k.has('f') || k.has('pagedown')) u -= 1
      // fine focus: the closer the picture, the smaller the step
      const sp = 1 - 0.75 * (W.together || 0)
      if (f || r || u) moveWalker(r * dt * 1.8 * sp, f * dt * 1.8 * sp, u * dt * 1.2 * sp)
    }
    walkerUpdate()
  }

  // for anyone who cannot find it by eye or ear: glide onto the spot
  const leadMe = () => {
    const W = world.current
    if (W.found) return
    const from = [...W.walker.pos]
    const to = PROLOGUE.painter.pos
    const t0 = performance.now()
    W.walking = () => {
      const k = clamp((performance.now() - t0) / (reduced ? 1 : 2600), 0, 1)
      const e = k * k * (3 - 2 * k)
      W.walker.pos = from.map((v, i) => v + (to[i] - v) * e)
      walkerUpdate()
    }
  }

  // ---- commissions ----
  const openLetter = idx => {
    clearTimers()
    const c = COMMISSIONS[idx]
    const S = sceneRef.current
    setStage(idx)
    setVerdict(null)
    setFocusEye(null)
    setSelected(null)
    S.setSelected(null)
    S.hideFigure(null)
    S.setGhost(false)
    S.setHour(c.hour)
    const W = world.current
    S.flushDepth()
    for (const p of propsFor(c)) {
      if (W.props.has(p.id)) continue
      W.props.set(p.id, p)
      S.syncProp(p)
    }
    S.setFigures(figuresOf(c, W.done), zonesFor(c))
    S.goTo('orbit', 1.6)
    setPhase('letter')
  }

  const startBuild = () => {
    const c = commission
    const W = world.current
    const S = sceneRef.current
    const w = c.sigil === 'word' ? (cleanWord(word).length >= 5 ? cleanWord(word) : 'TONIGHT') : null
    if (w) { setWord(w); W.words[c.id] = w }
    const rs = rasterSigil(c.sigil, w)
    const samples = sampleMask(rs)
    const s0 = c.seats[0]
    const eye = makeEye(s0.pos, s0.aim, s0.fov)
    const slot = stage + 1
    W.live = { c, eye, samples, mask: rs.mask, slot }
    S.setLayer(slot, { eye, mask: rs.mask, color: c.pigment.light, alpha: 0.9, mode: 'light' })
    S.setFrustum(eye, 2.2)
    evaluate()
    setPhase('build')
    say(c.lesson, mobile ? 4500 : 7000)
  }

  const lookFrom = id => {
    const S = sceneRef.current
    ensureAudio()
    sfx('view')
    if (!id || id === 'lane') {
      setFocusEye(null)
      S.setGhost(false)
      S.hideFigure(null)
      S.goTo('orbit', 1.1)
      return
    }
    const e = eyesOf(world.current.live?.c || commission, world.current.done).find(x => x.id === id)
    if (!e) return
    setFocusEye(id)
    S.hideFigure(id, e.pos)
    S.setGhost(e.role === 'watch')
    if (e.role === 'watch') say('he walks his round: boards hide nothing from him', 2400)
    S.goTo(viewOf(e), 1.1)
  }

  const selectProp = id => {
    setSelected(id)
    sceneRef.current?.setSelected(id)
  }
  const lastSel = useRef(null)
  const cycleProp = dir => {
    const ids = [...world.current.props.values()].filter(p => !p.locked).map(p => p.id)
    if (!ids.length) return
    const i = ids.indexOf(selected || lastSel.current)
    const id = ids[(i + dir + ids.length) % ids.length]
    lastSel.current = id
    selectProp(id)
  }

  // a move is refused if the board would stand through something or in anyone's clear ring
  const whyNot = next => {
    const W = world.current
    const sol = [...LANE, ...[...W.props.values()].map(p => (p.id === next.id ? next : p))]
    if (!placeable(next, sol, zonesFor(W.live.c))) return 'it will not stand there'
    return null
  }
  const tryMove = (p, x, z, ry) => {
    const W = world.current
    const next = { ...p, x, z, ry }
    const why = whyNot(next)
    if (why) return why
    p.x = x; p.z = z; p.ry = ry
    sceneRef.current.syncProp(p)
    sceneRef.current.markDepth(W.live.slot)
    W.dirty = true
    return null
  }
  const refuse = why => {
    sfx('nope')
    sceneRef.current.setSelected(selected, true)
    say(why, 1800)
  }
  const nudge = (dr, df) => {
    const p = world.current.props.get(selected)
    if (!p || p.locked) return
    const { fwd, right } = sceneRef.current.camBasis()
    const why = tryMove(p, p.x + right[0] * dr + fwd[0] * df, p.z + right[1] * dr + fwd[1] * df, p.ry)
    if (!why) sfx('scrape'); else refuse(why)
  }
  const turn = dir => {
    const p = world.current.props.get(selected)
    if (!p || p.locked) return
    const why = tryMove(p, p.x, p.z, p.ry + dir * TURN)
    if (!why) sfx('clack'); else refuse(why)
  }

  // ---- laying the paint, and the walk through every eye ----
  const layIt = async () => {
    const W = world.current
    if (!W.live || phase !== 'build') return
    ensureAudio()
    clearTimers()
    const token = seq.current
    const live = () => seq.current === token && alive.current
    const S = sceneRef.current
    const L = W.live
    const res = judge(false)
    setHud(judge(true))
    setSelected(null); S.setSelected(null)
    setFocusEye(null)
    setPhase('verdict')
    S.setFrustum(null)
    S.setLayer(L.slot, { eye: L.eye, color: L.c.pigment.color, alpha: 1, mode: 'paint', reveal: 0 })
    sfx('spray', 1.5)
    animate(reduced ? 1 : 1500, k => S.setLayerLook(L.slot, { reveal: k }))
    await wait(1600)
    for (const e of res.eyes) {
      if (!live()) return
      S.hideFigure(e.id, e.pos)
      S.setGhost(e.role === 'watch')
      setFocusEye(e.id)
      await S.goTo(viewOf(e), 1.2)
      if (!live()) return
      await wait(450)
      if (!live()) return
      if (e.role === 'watch') {
        if (!e.ok) sfx('whistle'); else sfx('reads', true)
        say(e.ok ? `${e.name}: weather, nothing more (${PCT(e.score)})` : `${e.name} can read ${PCT(e.score)} of it`, 2000)
      } else {
        sfx('reads', e.ok)
        const who = e.role === 'past' ? `${e.name} (still)` : e.name
        say(e.ok ? `${who}: ${PCT(e.score)} of it joins up` : `${who} can only make out ${PCT(e.score)}`, 2000)
      }
      await wait(1900)
    }
    if (!live()) return
    S.hideFigure(null)
    S.setGhost(false)
    setFocusEye(null)
    await S.goTo('orbit', 1.4)
    if (!live()) return
    setVerdict(res)
    if (res.pass) sfx('sealed')
  }

  const retry = () => {
    const W = world.current
    const S = sceneRef.current
    const L = W.live
    sfx('whitewash')
    setVerdict(null)
    animate(reduced ? 1 : 1200, k => S.setLayerLook(L.slot, { alpha: 1 - k }), () => {
      S.setLayer(L.slot, { eye: L.eye, color: L.c.pigment.light, alpha: 0.9, mode: 'light' })
      S.setFrustum(L.eye, 2.2)
      setPhase('build')
      evaluate()
    })
  }

  const persist = (doneIds, nextStage) => {
    const W = world.current
    const props = {}
    for (const p of W.props.values()) props[p.id] = { x: p.x, z: p.z, ry: p.ry, locked: !!p.locked }
    writeSave({ done: doneIds, stage: nextStage, props, words: W.words })
  }

  const seal = c => {
    const W = world.current
    const w = c.sigil === 'word' ? (W.words[c.id] || 'TONIGHT') : null
    const samples = sampleMask(rasterSigil(c.sigil, w))
    const s0 = c.seats[0]
    W.sealed[c.id] = layPaint(solids(), makeEye(s0.pos, s0.aim, s0.fov), samples)
    W.sealedSamples = { ...(W.sealedSamples || {}), [c.id]: samples }
    if (!W.done.find(d => d.id === c.id)) W.done.push(c)
  }

  const sealAndContinue = () => {
    const W = world.current
    const L = W.live
    for (const p of W.props.values()) { p.locked = true; sceneRef.current.syncProp(p) }
    seal(L.c)
    W.live = null
    persist(W.done.map(d => d.id), stage + 1)
    setVerdict(null)
    if (stage + 1 < COMMISSIONS.length) openLetter(stage + 1)
    else startFinale()
  }

  // ---- the night: every seat, every message whole, the others dimmed ----
  const startFinale = async () => {
    const S = sceneRef.current
    clearTimers()
    const token = seq.current
    const live = () => seq.current === token && alive.current
    setPhase('finale')
    S.setHour('night')
    S.setFrustum(null)
    const W = world.current
    S.setFigures(COMMISSIONS.flatMap(c => c.seats.map(s => ({ id: `${s.id}-past`, pos: s.pos, aim: s.aim, pose: 'sit', eyes: '#f3b44e' }))), [])
    const stops = [
      { label: 'from the stranger’s spot: a cat was here first', eye: PROLOGUE.painter, id: null, layer: 0 },
      ...COMMISSIONS.map((c, i) => ({ label: `from ${c.seats[0].name}: ${c.sigil === 'word' ? `“${W.words[c.id] || 'TONIGHT'}”` : c.title}`, eye: c.seats[0], id: `${c.seats[0].id}-past`, layer: i + 1 }))
    ]
    const dimAllBut = keep => { for (let i = 0; i < FREE_SLOT; i++) if (S.layerOn(i)) S.setLayerLook(i, { alpha: keep === null || i === keep ? 1 : 0.3 }) }
    await wait(500)
    for (let i = 0; i < stops.length; i++) {
      if (!live()) return
      const s = stops[i]
      S.hideFigure(s.id, s.eye.pos)
      setTour({ i, n: stops.length + 1, label: s.label })
      await S.goTo({ pos: s.eye.pos, aim: s.eye.aim, fov: s.eye.fov, margin: 1.16 }, 1.8)
      if (!live()) return
      dimAllBut(s.layer)
      sfx('reads', true)
      await wait(2800)
    }
    if (!live()) return
    dimAllBut(null)
    S.hideFigure(null)
    setTour({ i: stops.length, n: stops.length + 1, label: 'and from the street: weather' })
    await S.goTo({ pos: [12, 11, 14], aim: [0, 1.2, -2], fov: 46 }, 2.2)
    if (!live()) return
    sfx('sealed')
    await wait(3200)
    if (!live()) return
    setTour(null)
    setPhase('end')
  }

  // ---- free hand: your own eye, your own word ----
  const startFree = () => {
    clearTimers()
    const S = sceneRef.current
    setPhase('free')
    S.setHour('blue hour')
    S.goTo('orbit', 1.2)
    S.setFigures([], [])
    setFree({ eye: null, coverage: 0 })
    say('tap the cobbles where your eye will be', 4000)
  }
  const placeFreeEye = (x, z) => {
    const pos = [clamp(x, -8.4, 8.4), 1.3, clamp(z, -5, 6.2)]
    const aim = [pos[0] * 0.25, 2.0, -6.2]
    const eye = makeEye(pos, aim, 46)
    const S = sceneRef.current
    const w = cleanWord(word) || 'STAY'
    const rs = rasterSigil('word', w)
    const samples = sampleMask(rs)
    const paint = layPaint(solids(), eye, samples)
    const read = Math.max(...walkOf(COMMISSIONS[2].watchers[0]).map(w => legibility(solids(), paint, makeEye(w.pos, w.aim, w.fov, { cone: w.fov * 0.62 }), { occluders: LANE }).score))
    S.setLayer(FREE_SLOT, { eye, mask: rs.mask, color: FREE_PIGMENT.light, alpha: 0.9, mode: 'light' })
    S.setFrustum(eye, 2.2)
    S.setFigures([{ id: 'you', pos, aim, pose: 'sit', eyes: '#9fe0ff' }], [])
    setFree({ eye, coverage: paint.coverage, word: w, pos, read })
    sfx('clack')
  }
  const layFree = async () => {
    const S = sceneRef.current
    if (!free.eye) return
    sfx('spray', 1.3)
    S.setFrustum(null)
    S.setLayer(FREE_SLOT, { eye: free.eye, color: FREE_PIGMENT.color, alpha: 1, mode: 'paint', reveal: 1 })
    S.hideFigure('you', free.eye.pos)
    await S.goTo({ pos: free.eye.pos, aim: free.eye.aim, fov: 46, margin: 1.14 }, 1.4)
    say(`laid: “${free.word}”, ${PCT(free.coverage)} caught. Walk away from it and watch it come apart.`, 3600)
  }

  const restart = () => {
    clearTimers()
    clearSave()
    const W = world.current
    const S = sceneRef.current
    for (const id of [...W.props.keys()]) S.removeProp(id)
    W.props.clear(); W.done = []; W.live = null; W.words = {}; W.found = false; W.sealed = {}; W.sealedSamples = {}
    for (let i = 1; i < 6; i++) S.clearLayer(i)
    S.setLayerLook(0, { alpha: 1 })
    S.setFrustum(null)
    setVerdict(null); setTour(null); setStage(0); setHud(null)
    startPrologue()
  }

  // continue a saved evening: rebuild the lane in order, each layer against the boards of its own time
  const resume = () => {
    ensureAudio()
    const s = saved
    if (!s) return
    const W = world.current
    const S = sceneRef.current
    W.words = s.words || {}
    W.found = true
    const upto = Math.min(s.stage, COMMISSIONS.length)
    for (let i = 0; i < upto; i++) {
      const c = COMMISSIONS[i]
      for (const p of propsFor(c)) {
        const q = s.props?.[p.id]
        if (q) Object.assign(p, q)
        p.locked = true
        W.props.set(p.id, p)
        S.syncProp(p)
      }
      const w = c.sigil === 'word' ? (W.words[c.id] || 'TONIGHT') : null
      const rs = rasterSigil(c.sigil, w)
      const s0 = c.seats[0]
      S.setLayer(i + 1, { eye: makeEye(s0.pos, s0.aim, s0.fov), mask: rs.mask, color: c.pigment.color, alpha: 1, mode: 'paint', reveal: 1 })
      S.flushDepth()
      seal(c)
    }
    if (s.stage >= COMMISSIONS.length) { setStage(COMMISSIONS.length - 1); startFinale() } else openLetter(s.stage)
  }

  // ---- input ----
  const onPointerDown = e => {
    ensureAudio()
    const S = sceneRef.current
    if (!S) return
    canvasRef.current.setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      drag.current = { kind: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y) }
      return
    }
    if (phase === 'prologue') { drag.current = { kind: 'walk', x: e.clientX, y: e.clientY }; return }
    if (phase === 'build') {
      const id = S.pickProp(e.clientX, e.clientY)
      if (id) {
        const p = world.current.props.get(id)
        const g = S.groundAt(e.clientX, e.clientY, 0)
        selectProp(id)
        drag.current = { kind: 'prop', id, off: g ? [p.x - g[0], p.z - g[1]] : [0, 0], moved: false }
        return
      }
    }
    drag.current = { kind: 'orbit', x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }
  }
  const onPointerMove = e => {
    const S = sceneRef.current
    const d = drag.current
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (!S || !d) return
    if (d.kind === 'pinch' && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const nd = Math.hypot(a.x - b.x, a.y - b.y)
      if (S.camMode() === 'orbit') S.zoomBy(d.d / Math.max(1, nd))
      d.d = nd
      return
    }
    if (d.kind === 'walk') {
      const dx = e.clientX - d.x; const dy = e.clientY - d.y
      d.x = e.clientX; d.y = e.clientY
      const sp = 0.011 * (1 - 0.7 * (world.current.together || 0))
      moveWalker(-dx * sp, dy * sp, 0)
      return
    }
    if (d.kind === 'prop') {
      const p = world.current.props.get(d.id)
      const g = S.groundAt(e.clientX, e.clientY, 0)
      if (!p || !g) return
      const nx = g[0] + d.off[0]; const nz = g[1] + d.off[1]
      if (Math.hypot(nx - p.x, nz - p.z) < 0.02) return
      const why = tryMove(p, nx, nz, p.ry)
      if (!why) { if (!d.moved) sfx('scrape'); d.moved = true; d.why = null } else if (d.why !== why) { d.why = why; S.setSelected(d.id, true); say(why, 1600) }
      return
    }
    if (d.kind === 'orbit' && S.camMode() === 'orbit') {
      const dx = e.clientX - d.x; const dy = e.clientY - d.y
      d.x = e.clientX; d.y = e.clientY
      S.orbitBy(-dx * 0.006, dy * 0.004)
    }
  }
  const onPointerUp = e => {
    const S = sceneRef.current
    const d = drag.current
    pointers.current.delete(e.pointerId)
    if (d?.kind === 'prop' && d.moved) sfx('clack')
    if (d?.kind === 'orbit' && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) {
      if (phase === 'build') { setSelected(null); S?.setSelected(null) }
      if (phase === 'free' && S) {
        const g = S.groundAt(e.clientX, e.clientY, 0)
        if (g) placeFreeEye(g[0], g[1])
      }
    }
    if (pointers.current.size === 0) drag.current = null
  }
  const onWheel = e => {
    const S = sceneRef.current
    if (S?.camMode() === 'orbit') S.zoomBy(e.deltaY > 0 ? 1.08 : 0.93)
  }

  useEffect(() => {
    const down = e => {
      const tgt = e.target
      const tag = tgt?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const onControl = tgt?.closest?.('button, a, [role=dialog]')
      const k = e.key.toLowerCase()
      if (k === '?' || (k === 'h' && !e.metaKey && !e.ctrlKey)) { setHelp(h => !h); return }
      if (k === 'escape') {
        if (help) { setHelp(false); return }
        if (selected) { setSelected(null); sceneRef.current?.setSelected(null); return }
        if (phase === 'build' && focusEye) { lookFrom('lane'); return }
        return
      }
      if (k === 'm') { setMuted(m => !m); return }
      if (help) return
      if (phase === 'prologue') {
        if (['w', 'a', 's', 'd', 'r', 'f', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'pageup', 'pagedown'].includes(k)) { keys.current.add(k); e.preventDefault() }
        return
      }
      if (phase !== 'build') return
      // Enter and Space belong to whatever button has focus
      if ((k === 'enter' || k === ' ') && onControl) return
      const eyes = eyesOf(commission, world.current.done)
      if (k === '0') { lookFrom('lane'); return }
      if (/^[1-9]$/.test(k)) { const ev = eyes[Number(k) - 1]; if (ev) lookFrom(ev.id); return }
      if (k === '[') { cycleProp(-1); return }
      if (k === ']') { cycleProp(1); return }
      if (k === 'q') { turn(1); return }
      if (k === 'e') { turn(-1); return }
      if (k === 'enter' || k === 'p') { e.preventDefault(); layIt(); return }
      if (selected && k.startsWith('arrow')) {
        e.preventDefault()
        if (k === 'arrowup') nudge(0, STEP)
        if (k === 'arrowdown') nudge(0, -STEP)
        if (k === 'arrowleft') nudge(-STEP, 0)
        if (k === 'arrowright') nudge(STEP, 0)
      } else if (k.startsWith('arrow') && sceneRef.current?.camMode() === 'orbit' && !onControl) {
        e.preventDefault()
        if (k === 'arrowleft') sceneRef.current.orbitBy(0.12, 0)
        if (k === 'arrowright') sceneRef.current.orbitBy(-0.12, 0)
        if (k === 'arrowup') sceneRef.current.orbitBy(0, 0.08)
        if (k === 'arrowdown') sceneRef.current.orbitBy(0, -0.08)
      }
    }
    const up = e => keys.current.delete(e.key.toLowerCase())
    const blur = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur) }
  })

  // development-only handle for automated play-throughs; absent from production builds
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__eyepointQA = {
      place: (id, x, z, deg) => {
        const p = world.current.props.get(id)
        if (!p || !world.current.live) return 'no such board'
        return tryMove(p, x, z, (deg * Math.PI) / 180) || true
      },
      // the same judgement the verdict uses, without the walk
      judge: () => {
        const r = judge(false)
        if (!r) return null
        return { coverage: r.coverage, need: r.need, pass: r.pass, eyes: r.eyes.map(e => ({ id: e.id, role: e.role, score: e.score, ok: e.ok, need: e.need, max: e.max })) }
      },
      props: () => [...world.current.props.values()].filter(p => !p.locked).map(p => ({ id: p.id, x: p.x, z: p.z, deg: Math.round((p.ry * 180) / Math.PI) })),
      phase
    }
  })

  // ---- render ----
  const eyesHud = hud?.eyes || []
  const focus = eyesHud.find(e => e.id === focusEye)
  const selProp = selected ? world.current.props.get(selected) : null
  useEffect(() => {
    const list = phase === 'build' || phase === 'letter' || phase === 'verdict' ? eyesOf(commission, world.current.done) : []
    setTags(list.map(t => ({ id: t.role === 'past' ? null : t.id, name: t.short || t.name, role: t.role })).filter(t => t.id))
  }, [phase, stage]) // eslint-disable-line react-hooks/exhaustive-deps
  const stencilFocus = focus && focus.role !== 'past' ? focus.inliers : null

  return (
    <div ref={rootRef} className={`ep-root ${mobile ? 'is-mobile' : ''} ${reduced ? 'is-reduced' : ''}`} style={{ '--ep-pig': pigment.color, '--ep-pig-light': pigment.light }} data-testid="eyepoint-lane">
      <div
        ref={wrapRef}
        className="ep-stage"
        data-playground-surface
        data-testid="ep-surface"
        tabIndex={0}
        aria-label="The lane. Drag to look around or move boards; in the prologue, drag to walk."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <canvas ref={canvasRef} className="ep-canvas" />
        <div className="ep-tags" aria-hidden="true">
          {tags.map(t => (
            <div key={t.id} ref={el => { if (el) tagRefs.current.set(t.id, el); else tagRefs.current.delete(t.id) }} className={`ep-tag is-${t.role}`}>
              {t.name}
            </div>
          ))}
        </div>
      </div>

      <div className="ep-nav"><ExperimentNav currentCategory={category?.slug} currentExperiment={experiment?.slug} /></div>
      <div className="ep-corner">
        <button type="button" className="ep-icon" onClick={() => setMuted(m => !m)} aria-pressed={muted} aria-label={muted ? 'Sound on' : 'Mute'} data-testid="ep-mute">{muted ? '♪̸' : '♪'}</button>
        <button type="button" className="ep-icon" onClick={() => setHelp(true)} aria-label="How to play" data-testid="ep-help">?</button>
      </div>

      {phase === 'title' && (
        <section className="ep-card ep-title" data-testid="ep-title" aria-labelledby="ep-title-h">
          <p className="ep-kicker">a lane above the sea · one evening</p>
          <h1 id="ep-title-h">Eyepoint Lane</h1>
          <p className="ep-lede">I paint messages that only come together from one spot. From anywhere else they are weather on the walls: shards on the plaster, a crescent on a column, half a word on the cobbles. Like that, behind this card.</p>
          <div className="ep-row">
            <button type="button" className="ep-btn is-go" data-playground-primary data-testid="ep-begin" onClick={startPrologue}>find where they stood</button>
            {saved?.stage > 0 && <button type="button" className="ep-btn" data-testid="ep-resume" onClick={resume}>continue the evening</button>}
          </div>
        </section>
      )}

      {phase === 'prologue' && (
        <section className="ep-walk" data-testid="ep-walk">
          <div className="ep-card ep-walk-card">
            <p className="ep-kicker">the stranger’s message</p>
            <p>Somebody painted this for one pair of eyes. Walk until the pieces join up. <span className="ep-keys">{coarse ? 'drag to walk · ▲▼ for height' : 'drag or WASD/arrows to walk · R/F or ▲▼ for height'}</span></p>
            <div className="ep-tune" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(walk.together * 100)} aria-label={`the picture is ${PCT(walk.together)} together`} data-together={walk.together.toFixed(3)} data-testid="ep-tune">
              <div className="ep-tune-fill" style={{ width: PCT(walk.together) }} />
              <span>{walk.together > 0.5 ? 'almost…' : walk.together > 0.35 ? 'warmer' : walk.together > 0.18 ? 'something' : 'shards'}</span>
            </div>
            {walk.hint >= 1 && walk.dir && <p className="ep-hint" data-testid="ep-dir">the paint pulls you: {walk.dir}</p>}
            {walk.hint >= 2 && <button type="button" className="ep-btn" onClick={leadMe} data-testid="ep-lead">lead me there</button>}
          </div>
          <div className="ep-height" role="group" aria-label="eye height">
            <button type="button" className="ep-btn is-sq" onClick={() => moveWalker(0, 0, 0.2)} aria-label="raise your eye" data-testid="ep-up" data-playground-action="up">▲</button>
            <button type="button" className="ep-btn is-sq" onClick={() => moveWalker(0, 0, -0.2)} aria-label="lower your eye" data-testid="ep-down">▼</button>
          </div>
        </section>
      )}

      {phase === 'found' && (
        <section className="ep-card ep-found" data-testid="ep-found">
          <p className="ep-kicker">found</p>
          <h2>A cat was here first.</h2>
          <p>Somebody stood exactly here, at exactly this height, and painted a face for whoever would stand here next. The lane takes commissions. Three letters are pinned to the board, each with its own pigment.</p>
          <button type="button" className="ep-btn is-go" data-autofocus data-testid="ep-letters" onClick={() => openLetter(0)}>read the first letter</button>
        </section>
      )}

      {phase === 'letter' && (
        <section className="ep-card ep-letter" data-testid="ep-letter" aria-labelledby="ep-letter-h">
          <div className="ep-chip" aria-hidden="true"><span>{commission.numeral}</span><small>{commission.pigment.name}</small></div>
          <p className="ep-kicker">{commission.hour} · letter {commission.numeral} of {COMMISSIONS.length}</p>
          <h2 id="ep-letter-h">{commission.title}</h2>
          <blockquote>{commission.letter}<cite>{commission.client}</cite></blockquote>
          <ul className="ep-terms">
            <li><b>must read it</b> {commission.seats.map(s => `${s.name} (${PCT(s.need)})`).join(', ')}</li>
            {commission.watchers.length > 0 && <li><b>must not</b> {commission.watchers.map(w => w.short).join(', ')} (under {PCT(commission.watchers[0].max)}); a board in his way hides nothing, he walks</li>}
            {world.current.done.length > 0 && <li><b>keep</b> {world.current.done.map(d => d.seats.map(s => s.short).join(' and ')).join(', ')} still reading theirs</li>}
            <li><b>catch</b> at least {PCT(commission.coverage)} of the paint</li>
            <li><b>delivered</b> {commission.props.map(p => `a ${SHAPE_NAME[p[0]]}`).join(', ')}</li>
          </ul>
          {commission.sigil === 'word' && (
            <label className="ep-word">
              <span>{commission.wordPrompt}</span>
              <input value={word} onChange={e => setWord(cleanWord(e.target.value))} maxLength={7} aria-label="the word to paint" data-testid="ep-word" spellCheck={false} />
            </label>
          )}
          <button type="button" className="ep-btn is-go" data-autofocus data-playground-primary data-testid="ep-start" onClick={startBuild} disabled={commission.sigil === 'word' && cleanWord(word).length < 5}>set up the lane</button>
        </section>
      )}

      {(phase === 'build' || phase === 'verdict') && hud && (
        <>
          <section className="ep-brief" data-testid="ep-brief">
            <div className="ep-chip is-small" aria-hidden="true"><span>{commission.numeral}</span></div>
            <div>
              <p className="ep-kicker">{commission.hour} · {commission.pigment.name}</p>
              <h2>{commission.title}</h2>
            </div>
          </section>

          <section className="ep-eyes" data-testid="ep-eyes" aria-label="who sees what">
            <button type="button" className={`ep-eye is-lane ${!focusEye ? 'is-on' : ''}`} onClick={() => lookFrom('lane')} data-testid="ep-eye-lane" data-playground-action="lane" disabled={phase !== 'build'}>
              <span className="ep-iris is-lane" aria-hidden="true"><span className="ep-iris-pupil" /></span>
              <span className="ep-eye-name">lane</span>
            </button>
            {eyesHud.map((e, i) => {
              const target = e.role === 'watch' ? e.max : e.need
              return (
                <button
                  type="button"
                  key={e.id}
                  className={`ep-eye is-${e.role} ${e.ok ? 'is-ok' : 'is-bad'} ${focusEye === e.id ? 'is-on' : ''}`}
                  onClick={() => lookFrom(e.id)}
                  disabled={phase !== 'build'}
                  data-testid={`ep-eye-${e.id}`}
                  data-playground-action={`look-${e.role}`}
                  aria-label={`${i + 1}: look from ${e.name}: ${e.role === 'watch' ? 'can read' : 'reads'} ${PCT(e.score)}, ${e.role === 'watch' ? 'must stay under' : 'needs'} ${PCT(target)}`}
                >
                  <IrisDial score={e.score} mark={target} role={e.role} />
                  <span className="ep-eye-name">{e.short}{e.role === 'past' ? ' · theirs' : ''}</span>
                  <span className="ep-eye-val">{NEAR(e.score, target)}</span>
                </button>
              )
            })}
          </section>

          <section ref={benchRef} className="ep-bench" data-testid="ep-bench">
            <div className="ep-stencil" aria-label={focus ? `what ${focus.name} can join up` : 'the stencil: which parts of the message are caught'}>
              <StencilCard samples={hud.samples} paint={hud.paint} focus={stencilFocus} color={commission.pigment.color} size={mobile ? 76 : 120} />
              <p className="ep-stencil-cap">{focus && focus.role !== 'past' ? `as ${focus.short} sees it` : 'the stencil'}</p>
            </div>
            <div className="ep-tin">
              <p className="ep-kicker">caught</p>
              <p className={`ep-big ${hud.covered ? 'is-ok' : 'is-bad'}`}>{PCT(hud.coverage)}<small> / {PCT(hud.need)}</small></p>
              <p className="ep-lost">{Object.entries(hud.lost).map(([k, v]) => `${k === 'water' ? 'sea' : k === 'leaf' ? 'leaves' : k === 'brass' ? 'rail' : k} ${Math.round((v / hud.samples.length) * 100)}%`).join(' · ') || 'nothing falls through'}</p>
            </div>
            <div className="ep-hands">
              {selProp ? (
                <div className="ep-propctl" role="group" aria-label={`moving the ${SHAPE_NAME[selProp.shape]}`}>
                  <button type="button" className="ep-btn is-sq is-cycle" onClick={() => cycleProp(-1)} aria-label="previous board" data-testid="ep-prev">‹</button>
                  <button type="button" className="ep-btn is-sq" onClick={() => turn(1)} aria-label="turn left" data-testid="ep-turn-l" data-playground-action="turn">⟲</button>
                  <span className="ep-propname">{SHAPE_NAME[selProp.shape]}</span>
                  <button type="button" className="ep-btn is-sq" onClick={() => turn(-1)} aria-label="turn right" data-testid="ep-turn-r">⟳</button>
                  <button type="button" className="ep-btn is-sq is-cycle" onClick={() => cycleProp(1)} aria-label="next board" data-testid="ep-next">›</button>
                </div>
              ) : (
                <button
                  type="button"
                  className="ep-btn"
                  onClick={e => {
                    cycleProp(1)
                    // from the keyboard, keep focus on the board controls that replace this button
                    if (e.detail === 0) setTimeout(() => rootRef.current?.querySelector('[data-testid="ep-turn-l"]')?.focus(), 0)
                  }}
                  data-testid="ep-pick"
                  data-playground-action="pick"
                >pick up a board</button>
              )}
              <button type="button" className="ep-btn is-paint" onClick={layIt} disabled={phase !== 'build'} data-testid="ep-lay" data-playground-action="lay">lay the {commission.pigment.name}</button>
            </div>
          </section>
        </>
      )}

      {verdict && (
        <section className={`ep-card ep-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`} data-testid="ep-verdict" role="dialog" aria-labelledby="ep-verdict-h">
          <p className="ep-kicker">letter {commission.numeral}</p>
          <h2 id="ep-verdict-h" className="ep-stamp">{verdict.pass ? 'Sealed' : 'Whitewash'}</h2>
          <ul className="ep-terms">
            <li className={verdict.covered ? 'is-ok' : 'is-bad'}><b>caught</b> {NEAR(verdict.coverage, verdict.need)} of the paint (needed {PCT(verdict.need)})</li>
            {verdict.eyes.map(e => (
              <li key={e.id} className={e.ok ? 'is-ok' : 'is-bad'}><b>{e.short}</b> {e.role === 'watch' ? `could read ${NEAR(e.score, e.max)} (limit ${PCT(e.max)})` : e.role === 'past' ? `still reads theirs: ${NEAR(e.score, e.need)}` : `reads ${NEAR(e.score, e.need)}`}</li>
            ))}
          </ul>
          <p>{verdict.pass
            ? (stage + 1 < COMMISSIONS.length ? 'The boards stay where they stand, paint and all. Tomorrow they are part of the lane.' : 'That is the last letter on the board.')
            : (!verdict.covered ? 'Too much went where nothing could hold it.'
              : verdict.eyes.some(e => e.role === 'watch' && !e.ok) ? 'Somebody who should not has read it. The watch fetches a bucket.'
                : verdict.eyes.some(e => e.role === 'past' && !e.ok) ? 'You painted over somebody else’s view of their own message.'
                  : 'The one it was for could not put it together.')}</p>
          {verdict.pass
            ? <button type="button" className="ep-btn is-go" data-autofocus data-testid="ep-next-letter" onClick={sealAndContinue}>{stage + 1 < COMMISSIONS.length ? 'the next letter' : 'walk the lane at night'}</button>
            : <button type="button" className="ep-btn is-go" data-autofocus data-testid="ep-retry" onClick={retry}>whitewash and try again</button>}
        </section>
      )}

      {tour && (
        <section className="ep-tour" data-testid="ep-tour" aria-live="polite">
          <p className="ep-kicker">night · {tour.i + 1} of {tour.n}</p>
          <p>{tour.label}</p>
        </section>
      )}

      {phase === 'end' && (
        <section className="ep-card ep-end" data-testid="ep-end">
          <p className="ep-kicker">night</p>
          <h2>Four messages, four pigments, one lane.</h2>
          <p>Each one is whole from one seat and weather from every other. The watch walks past all of them.</p>
          <div className="ep-row">
            <button type="button" className="ep-btn is-go" data-autofocus data-testid="ep-free" onClick={startFree}>paint one of my own</button>
            <button type="button" className="ep-btn" data-testid="ep-restart" onClick={restart}>start the evening over</button>
          </div>
        </section>
      )}

      {phase === 'free' && (
        <section className="ep-card ep-freebar" data-testid="ep-freebar">
          <label className="ep-word is-inline">
            <span>my word</span>
            <input value={word} onChange={e => setWord(cleanWord(e.target.value))} maxLength={7} aria-label="your word" data-testid="ep-free-word" spellCheck={false} />
          </label>
          <p className="ep-free-note">{free.eye ? `${PCT(free.coverage)} caught from there; the watch on the stair would read ${PCT(free.read)}` : 'tap the cobbles to choose where your eye will be'}</p>
          <div className="ep-row">
            <button type="button" className="ep-btn is-paint" disabled={!free.eye} onClick={layFree} data-testid="ep-free-lay" data-playground-action="lay-free">lay it</button>
            <button type="button" className="ep-btn" onClick={() => { sceneRef.current.hideFigure(null); sceneRef.current.goTo('orbit', 1.2) }} data-testid="ep-free-lane">the lane</button>
            <button type="button" className="ep-btn" onClick={restart} data-testid="ep-free-restart">start over</button>
          </div>
        </section>
      )}

      {toast && <div className="ep-toast" key={toast.k} role="status" data-testid="ep-toast">{toast.text}</div>}

      {help && (
        <section className="ep-card ep-help" role="dialog" aria-modal="true" aria-labelledby="ep-help-h" data-testid="ep-helpcard">
          <h2 id="ep-help-h">How the lane works</h2>
          <p>Paint is laid from one eye, like a projector. It lands on whatever its light meets first. From that eye the picture is whole; from anywhere else it breaks apart, unless it all landed on one flat surface.</p>
          <ul className="ep-terms">
            <li><b>look</b> drag the sky or the cobbles; scroll or pinch to zoom; arrows orbit</li>
            <li><b>boards</b> drag a board to move it; Q/E or ⟲⟳ to turn it; [ ] for the next one; arrows nudge</li>
            <li><b>eyes</b> 1–9 look from a seat, a watcher or an earlier client; 0 for the lane</li>
            <li><b>paint</b> P (or Enter on the lane) lays it, then the verdict walks you through every eye</li>
            <li><b>prologue</b> drag or WASD/arrows to walk; R/F or ▲▼ for height</li>
            <li><b>also</b> M mutes; Esc closes or lets go</li>
          </ul>
          <p className="ep-note">The stencil shows the message as dots: solid where caught, hollow where lost. Choose an eye and it shows only what that eye can put together.</p>
          <button type="button" className="ep-btn is-go" data-autofocus onClick={() => setHelp(false)} data-testid="ep-help-close">back to the lane</button>
        </section>
      )}
    </div>
  )
}
