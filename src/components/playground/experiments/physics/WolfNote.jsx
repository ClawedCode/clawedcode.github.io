import { useCallback, useEffect, useRef, useState } from 'react'
import ExperimentNav from '../../ExperimentNav'
import {
  STRINGS, STRING_LEN, BOW_LEN, D_MIN, D_MAX, W_MIN, W_MAX, BODY, COLLAR,
  noteOf, stopAt, collarFreq, REGIME_WORD
} from './wolf/strings'
import {
  layoutFor, px, py, stringX, fingerY, bowY, paintRoom, paintShadow, paintCello,
  NUT_Y, BRIDGE_Y, FB_END, TAIL_TOP, UNIT_M
} from './wolf/cello'
import { drawMap, drawBody, mapCell, freshMap, REGIME_INK } from './wolf/notebook'
import { ETUDES, PIECE, freshJudge, judge } from './wolf/etudes'
import { createWolfAudio } from './wolf/audio'
import './WolfNote.css'

const SAVE_KEY = 'wolf-note-v1'
const SEMI_KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"]
const POINTS = 97

const DONE_LINES = {
  speak: 'It speaks. One slip for every trip of the kink, bridge to finger and back.',
  chart: 'There is a wedge in your notebook now. Every bowed string has one; you drew this one’s.',
  ponticello: 'Glass at the bridge. The window there is a crack, and you got through it.',
  swell: 'Louder and never broken: speed and weight travelled together.',
  wolfForce: 'You held it down by main force. It is still in there.',
  wolfCollar: 'The collar took it. Something has moved next door, though.',
  piece: 'Dawn.'
}

const loadSave = () => {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}
const writeSave = data => {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch {
    /* private mode: progress just will not survive the tab */
  }
}

function Staff({ staff, at, done }) {
  if (!staff) return null
  // treble-clef positions for D3..A3 are below the bass clef; write it in bass clef
  // bass clef: middle line is D3. steps above D3 per note name
  const STEP = { C: -1, 'C♯': -1, D: 0, 'E♭': 1, E: 1, F: 2, 'F♯': 2, G: 3, 'A♭': 4, A: 4, 'B♭': 5, B: 5 }
  const notes = staff.notes.map(semi => noteOf(staff.string, semi))
  const w = 34 + notes.length * 30
  const line = k => 14 + k * 7
  return (
    <svg className="wn-staff" viewBox={`0 0 ${Math.max(w, 120)} 52`} aria-hidden="true">
      {[0, 1, 2, 3, 4].map(k => <line key={k} x1="2" x2={Math.max(w, 120) - 2} y1={line(k)} y2={line(k)} />)}
      <text x="4" y="31" className="wn-clef">𝄢</text>
      {notes.map((n, i) => {
        const octShift = (n.octave - 3) * 7
        const step = STEP[n.name] + octShift
        const y = line(2) - step * 3.5
        const x = 40 + i * 30
        const acc = n.name.length > 1 ? n.name.slice(1) : ''
        const state = done || i < at ? 'is-done' : i === at ? 'is-now' : ''
        return (
          <g key={i} className={state}>
            {acc && <text x={x - 13} y={y + 4} className="wn-acc">{acc}</text>}
            <ellipse cx={x} cy={y} rx="5.2" ry="3.8" transform={`rotate(-18 ${x} ${y})`} />
            <line x1={x + 4.8} x2={x + 4.8} y1={y} y2={y - 22} className="wn-stem" />
            {staff.notes[i] === 3 && staff.string === 2 && <circle cx={x} cy={y} r="9" className="wn-red" />}
          </g>
        )
      })}
      {staff.hairpin && <path d="M 64 46 L 112 41 M 64 46 L 112 51" className="wn-hairpin" />}
    </svg>
  )
}

export default function WolfNote({ category, experiment }) {
  const rootRef = useRef(null)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const mapRef = useRef(null)
  const audioRef = useRef(null)
  const helpCloseRef = useRef(null)
  const sim = useRef(null)
  if (!sim.current) {
    sim.current = {
      string: 2,
      semi: 0,
      d: 0.07,
      weight: 1.2,
      vbow: 0,
      rawV: 0,
      bowPos: 0.35,
      bowing: false,
      bowId: null,
      fingerId: null,
      keyBow: false,
      keyDir: 1,
      keySpeed: 0.16,
      lastX: 0,
      lastT: 0,
      lastMoveT: 0,
      collarOn: false,
      collarP: 0.45,
      knockedCollar: undefined,
      knockAt: -10,
      shape: new Float32Array(POINTS),
      norm: 1e-5,
      corner: [],
      regime: 'rest',
      ratio: 0,
      level: 0,
      wolfLevel: 0,
      wolfVis: 0.35,
      catVis: 0,
      dawn: 0,
      dawnTarget: 0,
      map: freshMap(),
      trail: [],
      recent: [],
      lastReportN: 0,
      dust: [],
      layout: null,
      cello: null,
      room: null,
      roomDawn: -1,
      sentNote: '',
      sentBow: '',
      sentElim: '',
      sentString: -1,
      judge: freshJudge(),
      etude: 0,
      phase: 'title',
      reduced: false,
      bowEndFlash: 0,
      idleT: 0,
      stroke: 0,
      lastDir: 0,
      couple: 0,
      cam: { z: 1, fx: 0, fy: 0 },
      replay: null,
      keyNoise: 1,
      keyNoiseT: 0
    }
  }

  const [phase, setPhase] = useState('title')
  const [etude, setEtude] = useState(0)
  const [progress, setProgress] = useState(0)
  const [parts, setParts] = useState(null)
  const [pieceAt, setPieceAt] = useState(0)
  const [regime, setRegime] = useState('rest')
  const [hint, setHint] = useState('')
  const [toast, setToast] = useState(null)
  const [help, setHelp] = useState(false)
  const [muted, setMuted] = useState(false)
  const [page, setPage] = useState('map')
  const [noteState, setNoteState] = useState({ string: 2, semi: 0 })
  const [weight, setWeight] = useState(1.2)
  const [collar, setCollar] = useState({ on: false, p: 0.45 })
  const [layout, setLayout] = useState(null)
  const [reduced, setReduced] = useState(false)
  const [notebookOpen, setNotebookOpen] = useState(true)
  const [audioOk, setAudioOk] = useState(true)
  const [cleared, setCleared] = useState([])

  // --- reduced motion -------------------------------------------------------
  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => {
      setReduced(q.matches)
      sim.current.reduced = q.matches
      if (audioRef.current) audioRef.current.setStrobe(q.matches ? 160 : 40)
    }
    on()
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])

  // --- resume what the notebook already holds -------------------------------
  useEffect(() => {
    const saved = loadSave()
    if (!saved) return
    const S = sim.current
    if (Array.isArray(saved.map) && saved.map.length === S.map.length) S.map = saved.map
    if (typeof saved.collarP === 'number') {
      S.collarP = saved.collarP
      S.collarOn = !!saved.collarOn
      setCollar({ on: S.collarOn, p: S.collarP })
    }
    if (Array.isArray(saved.cleared)) setCleared(saved.cleared)
    if (typeof saved.etude === 'number' && saved.etude > 0) {
      S.etude = Math.min(saved.etude, ETUDES.length)
      setEtude(S.etude)
    }
  }, [])

  const persist = useCallback((extra = {}) => {
    const S = sim.current
    writeSave({ map: S.map, collarOn: S.collarOn, collarP: S.collarP, etude: S.etude, cleared: extra.cleared, ...extra })
  }, [])

  // --- audio frames from the string -----------------------------------------
  const onFrame = useCallback(msg => {
    const S = sim.current
    if (msg.shape) S.shape = msg.shape
    S.level = msg.level || 0
    S.wolfLevel = msg.wolf || 0
    const r = msg.report
    if (!r) return
    const dt = S.lastReportN && r.n > S.lastReportN ? Math.min(0.3, Math.max(0.02, (r.n - S.lastReportN) / (r.sr || 48000))) : 0.085
    S.lastReportN = r.n
    // the regime is the string's own: the core flags the wolf from how hard the body answers
    const reg = r.regime
    S.couple = r.couple || 0
    S.regime = reg
    const len = STRING_LEN * (1 - stopAt(S.semi))
    const beta = S.d / len
    const speed = Math.abs(S.vbow)
    const ratio = speed > 0.01 ? S.weight / speed : 0
    S.ratio = ratio
    S.recent.push(reg)
    if (S.recent.length > 18) S.recent.shift()
    if (reg !== 'rest' && ratio > 0) {
      if (reg !== 'wolf') {
        const cell = mapCell(beta, ratio)
        if (cell >= 0) S.map[cell][reg] += dt
      }
      S.trail.push({ beta, ratio, regime: reg })
      if (S.trail.length > 40) S.trail.shift()
    }
    S.lastJudged = { regime: reg, rms: r.rms, string: S.string, semi: S.semi, d: S.d, dt, weight: S.weight, speed, collar: S.collarOn, stroke: S.stroke }
  }, [])

  // --- the evening's flow ---------------------------------------------------
  const toastTimer = useRef(0)
  const flash = useCallback((text, tone = 'ok', ms = 4200) => {
    setToast({ text, tone, id: Date.now() })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), ms)
  }, [])
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const advance = useCallback(how => {
    const S = sim.current
    const e = ETUDES[S.etude]
    if (!e) return
    if (e.kind === 'piece') S.lastWeights = S.judge.weights.slice()
    const key = e.id === 'wolf' ? (how === 'collar' ? 'wolfCollar' : 'wolfForce') : e.id
    const nextCleared = [...new Set([...(cleared || []), e.id])]
    setCleared(nextCleared)
    if (audioRef.current) audioRef.current.chime([392, 587.3], 0.05)
    S.etude += 1
    S.judge = freshJudge()
    setEtude(S.etude)
    setProgress(0)
    setParts(null)
    setPieceAt(0)
    setHint('')
    if (S.etude >= ETUDES.length) {
      const weights = S.lastWeights || []
      S.phase = 'dawn'
      S.dawnTarget = 1
      S.replay = { start: performance.now() + 900, restoreW: S.weight, notes: PIECE.map((semi, i) => ({ semi, w: weights[i] || S.weight })) }
      setPhase('dawn')
      if (audioRef.current) audioRef.current.chime([293.7, 440, 587.3, 740], 0.045)
    } else {
      flash(DONE_LINES[key])
      const n = ETUDES[S.etude]
      if (n.string !== undefined) {
        // put the hand where the next note is, so the card and the instrument agree
        S.string = n.string
        S.semi = n.kind === 'piece' ? PIECE[0] : n.semi
        setNoteState({ string: S.string, semi: S.semi })
      }
      if (n.id === 'piece') setPage('body')
    }
    persist({ cleared: nextCleared })
  }, [cleared, flash, persist])

  const begin = useCallback(async () => {
    const S = sim.current
    if (!audioRef.current) audioRef.current = createWolfAudio({ onFrame })
    // the hall answers at once; the string joins when the audio is up
    const starting = audioRef.current.start()
    S.sentNote = ''
    S.sentElim = ''
    S.sentString = -1
    S.phase = S.etude >= ETUDES.length ? 'free' : 'play'
    setPhase(S.phase)
    const e = ETUDES[S.etude]
    if (e && e.string !== undefined) {
      S.string = e.string
      S.semi = e.kind === 'piece' ? PIECE[0] : e.semi
      setNoteState({ string: S.string, semi: S.semi })
    }
    stageRef.current?.focus({ preventScroll: true })
    const ok = await starting
    setAudioOk(ok)
    if (!audioRef.current) return
    audioRef.current.setMuted(muted)
    audioRef.current.setStrobe(S.reduced ? 160 : 40)
    audioRef.current.send({ body: [BODY.fw, BODY.qw, BODY.mw, COLLAR.me, COLLAR.qe] })
  }, [muted, onFrame])

  const restart = useCallback(() => {
    const S = sim.current
    S.etude = 0
    S.judge = freshJudge()
    S.map = freshMap()
    S.trail = []
    S.collarOn = false
    S.collarP = 0.45
    S.dawnTarget = 0
    S.knockedCollar = undefined
    S.recent = []
    S.trail = []
    S.replay = null
    S.phase = 'play'
    setCollar({ on: false, p: 0.45 })
    setCleared([])
    setEtude(0)
    setProgress(0)
    setPieceAt(0)
    setPhase('play')
    setPage('map')
    S.string = 2
    S.semi = 0
    setNoteState({ string: 2, semi: 0 })
    writeSave({ map: S.map, collarOn: false, collarP: 0.45, etude: 0, cleared: [] })
    flash('The night again. The notebook is blank.', 'info')
  }, [flash])

  const keepPlaying = useCallback(() => {
    sim.current.phase = 'free'
    setPhase('free')
  }, [])

  // --- controls -------------------------------------------------------------
  const chooseNote = useCallback((string, semi) => {
    const S = sim.current
    S.string = Math.max(0, Math.min(3, string))
    S.semi = Math.max(0, Math.min(12, semi))
    setNoteState({ string: S.string, semi: S.semi })
  }, [])

  const setW = useCallback(w => {
    const S = sim.current
    S.weight = Math.min(W_MAX, Math.max(W_MIN, w))
    setWeight(S.weight)
  }, [])

  const moveCollar = useCallback((p, fit) => {
    const S = sim.current
    S.collarP = Math.min(1, Math.max(0, p))
    if (fit !== undefined) S.collarOn = fit
    setCollar({ on: S.collarOn, p: S.collarP })
  }, [])

  const knock = useCallback(() => {
    const S = sim.current
    if (audioRef.current) audioRef.current.knock(0.9)
    S.knockAt = performance.now() / 1000
    S.knockedCollar = S.collarOn ? collarFreq(S.collarP) : null
    setPage('body')
    setNotebookOpen(true)
  }, [])

  useEffect(() => {
    if (audioRef.current) audioRef.current.setMuted(muted)
  }, [muted])

  // --- layout ---------------------------------------------------------------
  useEffect(() => {
    const stage = stageRef.current
    const canvas = canvasRef.current
    if (!stage || !canvas) return
    const fit = () => {
      const r = stage.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(r.width * dpr)
      canvas.height = Math.round(r.height * dpr)
      const L = layoutFor(r.width, r.height)
      L.dpr = dpr
      const S = sim.current
      S.layout = L
      const cello = document.createElement('canvas')
      cello.width = canvas.width
      cello.height = canvas.height
      const cc = cello.getContext('2d')
      cc.scale(dpr, dpr)
      paintCello(cc, L)
      S.cello = cello
      S.roomDawn = -1
      setLayout({ ...L })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(stage)
    return () => ro.disconnect()
  }, [])

  // --- the frame loop -------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf = 0
    let last = performance.now()
    let uiT = 0
    let prevRegime = ''
    let hintText = ''
    // night and day are painted once per size and crossfaded, so dawn costs one extra blit
    const night = document.createElement('canvas')
    const day = document.createElement('canvas')
    const draw = now => {
      raf = requestAnimationFrame(draw)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const S = sim.current
      const L = S.layout
      if (!L || !S.cello) return
      // bow physics from the inputs
      if (S.replay) {
        // dawn: the cello plays the phrase back, note by note, at the weights you found
        const R = S.replay
        const k = Math.floor((now - R.start) / 1150)
        if (k >= 0 && k < R.notes.length) {
          if (S.semi !== R.notes[k].semi || S.string !== 2) {
            S.string = 2
            S.semi = R.notes[k].semi
            S.keyDir = k % 2 ? -1 : 1
          }
          S.weight = R.notes[k].w
          S.keyBow = true
          S.keySpeed = 0.13
        } else if (k >= R.notes.length) {
          S.keyBow = false
          S.replay = null
          S.weight = R.restoreW
        }
      }
      if (S.keyBow) {
        // a hand on a key is still a hand: the speed wanders a little, and each change scrapes
        S.keyNoiseT -= dt
        if (S.keyNoiseT <= 0) {
          S.keyNoiseT = 0.08 + Math.random() * 0.1
          S.keyNoise = S.replay ? 1 : 1 + (Math.random() * 2 - 1) * 0.16
        }
        S.vbow += (S.keyDir * S.keySpeed * S.keyNoise - S.vbow) * Math.min(1, dt * 9)
        S.bowPos += (S.vbow * dt) / BOW_LEN
      } else if (S.bowing) {
        // a held, unmoving pointer stops the bow; slow frames must not look like that
        if (now - S.lastMoveT > Math.max(45, dt * 2600)) S.rawV *= Math.exp(-dt * 30)
        // an arm has inertia: pointer jitter must not reach the string
        S.vbow += (S.rawV - S.vbow) * Math.min(1, dt * 12)
      } else {
        S.vbow *= Math.exp(-dt * 20)
      }
      if (S.bowPos <= 0 || S.bowPos >= 1) {
        S.bowPos = Math.min(1, Math.max(0, S.bowPos))
        if (S.keyBow) S.keyDir = S.bowPos >= 1 ? -1 : 1
        else if ((S.bowPos >= 1 && S.vbow > 0) || (S.bowPos <= 0 && S.vbow < 0)) {
          S.vbow = 0
          S.rawV = 0
          S.bowEndFlash = 1
        }
      }
      S.bowEndFlash = Math.max(0, S.bowEndFlash - dt * 1.5)
      // a stroke is one bow direction; a change of direction starts the next
      const dir = S.vbow > 0.03 ? 1 : S.vbow < -0.03 ? -1 : 0
      if (dir && dir !== S.lastDir) {
        S.stroke++
        S.lastDir = dir
      }
      const engaged = S.bowing || S.keyBow
      const A = audioRef.current
      if (A && A.ready) {
        const note = noteOf(S.string, S.semi)
        const len = STRING_LEN * (1 - stopAt(S.semi))
        const beta = S.d / len
        if (S.sentString !== S.string) {
          A.send({ Z: STRINGS[S.string].Z, clear: true })
          S.sentString = S.string
        }
        const nk = `${note.f0.toFixed(2)}|${beta.toFixed(4)}`
        if (nk !== S.sentNote) {
          A.send({ note: [note.f0, beta, false] })
          S.sentNote = nk
        }
        const bk = `${S.vbow.toFixed(4)}|${engaged ? S.weight.toFixed(3) : 0}`
        if (bk !== S.sentBow) {
          A.send({ bow: [S.vbow, engaged ? S.weight : 0] })
          S.sentBow = bk
        }
        const ek = `${S.collarOn}|${S.collarP.toFixed(3)}`
        if (ek !== S.sentElim) {
          A.send({ elim: [S.collarOn, collarFreq(S.collarP)] })
          S.sentElim = ek
        }
      }
      // judgement, one report at a time
      if (S.lastJudged) {
        const r = S.lastJudged
        S.lastJudged = null
        const e = ETUDES[S.etude]
        if (S.phase === 'play' && e) {
          const res = judge(e, S.judge, r)
          S.lastRes = res
          if (res.done) advanceRef.current(res.how)
        }
      }
      // visual state
      // the wolf beats: the body and the string trade energy a few times a second
      const beatHz = 4 + Math.abs(noteOf(S.string, S.semi).f0 - 174) * 0.25
      const beat = 0.5 + 0.5 * Math.sin((now / 1000) * Math.PI * 2 * Math.min(14, beatHz))
      const howling = S.regime === 'wolf' && engaged
      const wolfTarget = S.phase === 'title' ? 0.35 : howling ? 0.65 + 0.35 * beat : 0
      const catTarget = S.dawnTarget
      const k = S.reduced ? 1 : Math.min(1, dt * 3)
      S.wolfVis += (wolfTarget * (1 - S.dawn) - S.wolfVis) * k
      S.catVis += (catTarget - S.catVis) * (S.reduced ? 1 : Math.min(1, dt * 0.6))
      S.dawn += (S.dawnTarget - S.dawn) * (S.reduced ? 1 : Math.min(1, dt * 0.35))
      if (S.roomDawn < 0 || night.width !== canvas.width || night.height !== canvas.height) {
        for (const [cv, light] of [[night, 0], [day, 1]]) {
          cv.width = canvas.width
          cv.height = canvas.height
          const rc = cv.getContext('2d')
          rc.setTransform(L.dpr, 0, 0, L.dpr, 0, 0)
          paintRoom(rc, L, light)
        }
        S.roomDawn = 0
      }
      // the camera leans in toward the bow while it plays and settles when it lifts
      const C = S.cam
      const zt = S.reduced ? 1 : engaged ? (S.replay ? 1.07 : 1.035) : 1
      C.z += (zt - C.z) * Math.min(1, dt * (engaged ? 1.6 : 2.4))
      C.fx = L.cx
      C.fy = py(L, bowY(S.d))
      const shake = !S.reduced && howling ? Math.min(3, S.wolfLevel * 60) * (beat - 0.5) : 0
      const cam = (k = 1) => {
        ctx.setTransform(L.dpr * C.z, 0, 0, L.dpr * C.z, L.dpr * (C.fx - C.fx * C.z), L.dpr * (C.fy - C.fy * C.z))
        if (k !== 1) ctx.scale(1 / L.dpr, 1 / L.dpr)
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = '#17131c'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      cam(0)
      ctx.drawImage(night, 0, 0)
      if (S.dawn > 0.004) {
        ctx.globalAlpha = Math.min(1, S.dawn)
        ctx.drawImage(day, 0, 0)
        ctx.globalAlpha = 1
      }
      cam()
      paintShadow(ctx, L, S.wolfVis, S.catVis, S.dawn)
      if (S.dawn > 0.02 && S.dawn < 0.98) {
        // first light crossing the hall
        const x = -L.w * 0.4 + S.dawn * L.w * 1.6
        const g = ctx.createLinearGradient(x - L.w * 0.25, 0, x + L.w * 0.25, L.h * 0.3)
        g.addColorStop(0, 'rgba(255, 210, 160, 0)')
        g.addColorStop(0.5, `rgba(255, 210, 160, ${0.16 * Math.sin(S.dawn * Math.PI)})`)
        g.addColorStop(1, 'rgba(255, 210, 160, 0)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, L.w, L.h)
      }
      cam(0)
      ctx.drawImage(S.cello, shake * L.dpr, 0)
      cam()
      drawLive(ctx, L, S, dt, now)
      // throttled UI
      uiT += dt
      if (uiT > 0.1) {
        uiT = 0
        if (S.regime !== prevRegime) {
          prevRegime = S.regime
          setRegime(S.regime)
        }
        const res = S.lastRes
        if (res && S.phase === 'play') {
          setProgress(res.progress)
          if (res.parts) setParts(res.parts)
          if (res.at !== undefined) setPieceAt(res.at)
        }
        const h = hintFor(S, engaged)
        if (h !== hintText) {
          hintText = h
          setHint(h)
        }
        if (mapRef.current && notebookVisible.current) {
          const mc = mapRef.current
          const r = mc.getBoundingClientRect()
          const dpr = Math.min(2, window.devicePixelRatio || 1)
          if (mc.width !== Math.round(r.width * dpr)) {
            mc.width = Math.round(r.width * dpr)
            mc.height = Math.round(r.height * dpr)
          }
          const c2 = mc.getContext('2d')
          c2.setTransform(dpr, 0, 0, dpr, 0, 0)
          if (pageRef.current === 'body') {
            const reveal = S.knockedCollar === undefined ? 0 : Math.min(1, (now / 1000 - S.knockAt) / (S.reduced ? 0.01 : 0.9))
            const e = ETUDES[S.etude]
            drawBody(c2, r.width, r.height, S.knockedCollar ?? null, reveal, e && e.kind === 'piece' ? PIECE : e && e.semi !== undefined ? [e.semi] : null, 2)
          } else {
            const len = STRING_LEN * (1 - stopAt(S.semi))
            drawMap(c2, r.width, r.height, S.map, engaged ? { beta: S.d / len, ratio: S.ratio, regime: S.regime, len } : { len, ratio: 0 }, S.trail)
          }
        }
      }
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  const advanceRef = useRef(advance)
  advanceRef.current = advance
  const pageRef = useRef(page)
  pageRef.current = page
  const notebookVisible = useRef(true)
  notebookVisible.current = notebookOpen

  // --- pointer: bow and finger -------------------------------------------------
  const toUnit = (e) => {
    const S = sim.current
    const r = stageRef.current.getBoundingClientRect()
    const L = S.layout
    const C = S.cam
    const x = C.fx + (e.clientX - r.left - C.fx) / C.z
    const y = C.fy + (e.clientY - r.top - C.fy) / C.z
    return { x, y, ux: (x - L.cx) / L.s, uy: (y - L.top) / L.s }
  }
  const fingerFrom = (ux, uy) => {
    let best = 0
    let bd = Infinity
    for (let i = 0; i < 4; i++) {
      const dd = Math.abs(stringX(i, uy) - ux)
      if (dd < bd) {
        bd = dd
        best = i
      }
    }
    let semi = 0
    let sd = Infinity
    for (let k = 0; k <= 12; k++) {
      const dd = Math.abs(fingerY(k) - uy)
      if (dd < sd) {
        sd = dd
        semi = k
      }
    }
    return { string: best, semi: uy < NUT_Y + 0.01 ? 0 : semi }
  }

  const onPointerDown = e => {
    const S = sim.current
    if (!S.layout || S.phase === 'title' || S.replay) return
    const p = toUnit(e)
    const onBoard = p.uy > NUT_Y - 0.03 && p.uy < FB_END - 0.004 && Math.abs(p.ux) < 0.075
    if (onBoard && S.fingerId === null) {
      S.fingerId = e.pointerId
      const f = fingerFrom(p.ux, p.uy)
      chooseNote(f.string, f.semi)
      capture(stageRef.current, e.pointerId)
      return
    }
    if (p.uy > 0.42 && S.bowId === null) {
      S.stroke++
      S.lastDir = 0
      S.bowId = e.pointerId
      S.bowing = true
      S.lastX = p.x
      S.lastT = e.timeStamp
      S.lastMoveT = performance.now()
      S.rawV = 0
      S.d = Math.min(D_MAX, Math.max(D_MIN, (BRIDGE_Y - p.uy) * UNIT_M))
      // setting the bow down again lands it mid-hair, with room both ways
      S.bowPos = 0.5
      capture(stageRef.current, e.pointerId)
    }
  }
  const onPointerMove = e => {
    const S = sim.current
    if (!S.layout) return
    if (e.pointerId === S.fingerId) {
      const p = toUnit(e)
      const f = fingerFrom(p.ux, Math.min(FB_END - 0.004, p.uy))
      if (f.string !== S.string || f.semi !== S.semi) chooseNote(f.string, f.semi)
      return
    }
    if (e.pointerId !== S.bowId) return
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]
    for (const ev of events.length ? events : [e]) {
      const p = toUnit(ev)
      const dtm = Math.max(1, ev.timeStamp - S.lastT) / 1000
      const pxPerM = S.layout.s / UNIT_M
      const dx = p.x - S.lastX
      // the bow follows the hand: the hair slides under the string
      const v = dx / pxPerM / dtm
      S.rawV = S.rawV * 0.5 + Math.max(-1.2, Math.min(1.2, v)) * 0.5
      S.bowPos += dx / pxPerM / BOW_LEN
      S.lastX = p.x
      S.lastT = ev.timeStamp
      S.d = Math.min(D_MAX, Math.max(D_MIN, (BRIDGE_Y - p.uy) * UNIT_M))
    }
    S.lastMoveT = performance.now()
  }
  const onPointerUp = e => {
    const S = sim.current
    if (e.pointerId === S.fingerId) S.fingerId = null
    if (e.pointerId === S.bowId) {
      S.bowId = null
      S.bowing = false
      S.rawV = 0
    }
  }
  const onWheel = e => {
    if (sim.current.phase === 'title') return
    setW(sim.current.weight * Math.exp(-e.deltaY * 0.0015))
  }

  // --- keyboard -------------------------------------------------------------
  useEffect(() => {
    const down = e => {
      const S = sim.current
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return
      const key = e.key.toLowerCase()
      if (help) {
        if (key === 'escape') setHelp(false)
        return
      }
      if (key === '?' || (key === '/' && e.shiftKey)) {
        setHelp(true)
        e.preventDefault()
        return
      }
      if (key === 'm') {
        setMuted(m => !m)
        return
      }
      if (S.phase === 'title') return
      const onButton = e.target && e.target.tagName === 'BUTTON'
      const inPlay = onButton && e.target.closest('.wn-fingers, .wn-tools, .wn-tabs, .wn-corner')
      if (key === ' ' && (!onButton || inPlay) && !S.replay) {
        e.preventDefault()
        if (inPlay) e.target.blur()
        if (!S.keyBow) {
          S.stroke++
          S.lastDir = 0
          S.keyBow = true
          if (S.bowPos >= 0.98) S.keyDir = -1
          else if (S.bowPos <= 0.02) S.keyDir = 1
        }
        return
      }
      if (key === 'arrowup') { setW(S.weight * 1.1); e.preventDefault(); return }
      if (key === 'arrowdown') { setW(S.weight / 1.1); e.preventDefault(); return }
      if (key === 'arrowleft') { S.d = Math.max(D_MIN, S.d - 0.004); e.preventDefault(); return }
      if (key === 'arrowright') { S.d = Math.min(D_MAX, S.d + 0.004); e.preventDefault(); return }
      if (key === ',') { S.keySpeed = Math.max(0.04, S.keySpeed / 1.15); return }
      if (key === '.') { S.keySpeed = Math.min(0.6, S.keySpeed * 1.15); return }
      if (['1', '2', '3', '4'].includes(key)) { chooseNote(+key - 1, S.semi); return }
      const si = SEMI_KEYS.indexOf(key)
      if (si >= 0) { chooseNote(S.string, si); return }
      if (key === 'b') { knock(); return }
      if (key === 'n') { setPage(p => (p === 'map' ? 'body' : 'map')); return }
      if (key === 'e') { moveCollar(S.collarP, !S.collarOn); return }
      if (key === '[') { moveCollar(S.collarP - 0.02, true); return }
      if (key === ']') { moveCollar(S.collarP + 0.02, true); return }
      if (key === 'escape') S.keyBow = false
    }
    const up = e => {
      if (e.key === ' ' && !sim.current.replay) {
        sim.current.keyBow = false
        e.preventDefault()
      }
    }
    const blur = () => {
      const S = sim.current
      S.keyBow = false
      S.bowing = false
      S.bowId = null
      S.fingerId = null
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [help, chooseNote, setW, knock, moveCollar])

  useEffect(() => {
    if (help) helpCloseRef.current?.focus()
  }, [help])

  useEffect(() => () => {
    if (audioRef.current) audioRef.current.close()
    audioRef.current = null
  }, [])

  useEffect(() => {
    if (import.meta.env.DEV) {
      window.__wolfQA = {
        sim: () => sim.current,
        setBow: (v, d) => {
          const S = sim.current
          S.keyBow = true
          S.keySpeed = Math.abs(v)
          S.keyDir = v < 0 ? -1 : 1
          if (d) S.d = d
        },
        lift: () => { sim.current.keyBow = false },
        weight: w => setW(w),
        note: (s, k) => chooseNote(s, k),
        collar: (p, on) => moveCollar(p, on)
      }
      return () => { delete window.__wolfQA }
    }
  }, [setW, chooseNote, moveCollar])

  // --- the lever --------------------------------------------------------------
  const leverRef = useRef(null)
  const leverDrag = e => {
    const el = leverRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const t = 1 - Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    setW(W_MIN * (W_MAX / W_MIN) ** t)
  }
  const leverT = Math.log(weight / W_MIN) / Math.log(W_MAX / W_MIN)

  const loupeRef = useRef(null)
  const loupeDrag = e => {
    const el = loupeRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const t = (e.clientY - r.top - r.height * 0.22) / (r.height * 0.56)
    moveCollar(t, true)
  }

  const semisRef = useRef(null)
  useEffect(() => {
    const strip = semisRef.current
    const el = strip && (strip.querySelector('.is-want') || strip.querySelector('.is-on'))
    if (el && el.scrollIntoView) el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
  }, [noteState, pieceAt, etude, reduced])

  const E = ETUDES[etude]
  const note = noteOf(noteState.string, noteState.semi)
  const collarNote = (() => {
    const f = collarFreq(collar.p)
    const midi = Math.round(69 + 12 * Math.log2(f / 440))
    const n = noteOf(0, midi - 36)
    return n.label
  })()
  const narrow = layout ? layout.narrow : false
  const leverStyle = layout ? (narrow
    ? { left: 6, top: py(layout, 0.47), height: layout.s * 0.3 }
    : { left: px(layout, -0.215) - 46, top: py(layout, 0.44), height: layout.s * 0.17 }) : { display: 'none' }

  return (
    <div className={`wn-root ${narrow ? 'is-narrow' : ''} ${reduced ? 'is-reduced' : ''} phase-${phase}`} ref={rootRef} data-testid="wolf-note">
      <div
        className="wn-stage"
        ref={stageRef}
        tabIndex={0}
        role="application"
        aria-label="A cello in an empty hall. Drag across the strings below the fingerboard to bow; tap the fingerboard to stop a note."
        data-playground-surface
        data-testid="wn-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <canvas ref={canvasRef} className="wn-canvas" />
      </div>

      <div className="wn-nav"><ExperimentNav currentCategory={category?.slug} currentExperiment={experiment?.slug} /></div>
      <div className="wn-corner">
        <button type="button" className="wn-icon" onClick={() => setMuted(m => !m)} aria-pressed={muted} aria-label={muted ? 'Sound on' : 'Mute'} data-testid="wn-mute">{muted ? '♪̸' : '♪'}</button>
        <button type="button" className="wn-icon" onClick={() => setHelp(true)} aria-label="How to play" data-testid="wn-help">?</button>
      </div>

      {phase === 'title' && (
        <div className="wn-title" data-testid="wn-title">
          <div className="wn-title-card">
            <p className="wn-kicker">a note left on the stand</p>
            <h1>wolf.note()</h1>
            <p>The cellist went home at midnight and left the cello standing on its pin. One F on it howls instead of singing. The concert is at dawn.</p>
            <p>Bow it. Chart it. Find where the wolf lives and move it somewhere the music doesn’t go.</p>
            <button type="button" className="wn-primary" onClick={begin} data-playground-primary data-testid="wn-begin">
              {etude > 0 ? 'Pick up where she left off' : 'Take up the bow'}
            </button>
            <p className="wn-small">sound on · drag across the strings to bow · works from the keyboard too (?)</p>
          </div>
        </div>
      )}

      {phase !== 'title' && (
        <>
          <section className={`wn-card ${hint ? 'has-hint' : ''} ${E && E.kind === 'piece' ? 'is-piece' : ''}`} aria-live="polite" data-testid="wn-etude">
            {E && phase === 'play' ? (
              <>
                <header>
                  <span className="wn-numeral">{E.numeral}</span>
                  <h2>{E.title}</h2>
                  <span className="wn-count">{etude + 1} / {ETUDES.length}</span>
                </header>
                <Staff staff={E.staff} at={pieceAt} />
                <p className="wn-text">{E.text}</p>
                {E.kind === 'chart' && parts ? (
                  <div className="wn-parts">
                    {['whistle', 'speak', 'crunch'].map((k, i) => (
                      <span key={k} className={`wn-part is-${k} ${parts[i] >= 1 ? 'is-full' : ''}`}>
                        <i style={{ width: `${Math.round(parts[i] * 100)}%` }} />{REGIME_WORD[k].replace('it ', '')}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="wn-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Etude progress">
                    <i style={{ width: `${Math.round(progress * 100)}%` }} />
                  </div>
                )}
                {hint && <p className="wn-hint" data-testid="wn-hint">{hint}</p>}
              </>
            ) : phase === 'dawn' ? (
              <div className="wn-dawn">
                <h2>Dawn</h2>
                <p>It was never a wolf. It was the box answering one note too eagerly, and now it answers where nobody plays.</p>
                <div className="wn-row">
                  <button type="button" className="wn-primary" onClick={keepPlaying} data-playground-action="keep-playing">Keep playing</button>
                  <button type="button" className="wn-secondary" onClick={restart} data-playground-action="restart">Begin the night again</button>
                </div>
              </div>
            ) : (
              <div className="wn-dawn">
                <h2>Free hand</h2>
                <p>Every etude is cleared. The notebook keeps charting whatever you bow; the collar stays where you hung it.</p>
                <button type="button" className="wn-secondary" onClick={restart} data-playground-action="restart">Begin the night again</button>
              </div>
            )}
          </section>

          <div className={`wn-voice is-${regime}`} data-testid="wn-voice" style={layout ? (narrow ? { top: py(layout, BRIDGE_Y + 0.02) } : { right: layout.w - px(layout, -0.2), top: py(layout, BRIDGE_Y + 0.02) }) : undefined}>
            <span>{note.label} · {STRINGS[noteState.string].id} string</span>
            <b>{REGIME_WORD[regime]}</b>
          </div>

          <div
            className="wn-lever"
            ref={leverRef}
            style={leverStyle}
            role="slider"
            tabIndex={0}
            aria-label="Arm weight on the bow"
            aria-valuemin={W_MIN}
            aria-valuemax={W_MAX}
            aria-valuenow={Number(weight.toFixed(2))}
            aria-valuetext={`${weight.toFixed(2)} newtons`}
            data-playground-action="weight"
            data-testid="wn-lever"
            onPointerDown={e => { capture(e.currentTarget, e.pointerId); leverDrag(e) }}
            onPointerMove={e => { if (e.buttons || e.pointerType === 'touch') leverDrag(e) }}
            onKeyDown={e => {
              if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { setW(weight * 1.1); e.preventDefault(); e.stopPropagation() }
              if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { setW(weight / 1.1); e.preventDefault(); e.stopPropagation() }
            }}
          >
            <span className="wn-lever-track" />
            <span className="wn-lever-weight" style={{ bottom: `calc(${leverT.toFixed(3)} * (100% - 28px))` }}>{weight.toFixed(1)}</span>
            <span className="wn-lever-label">weight</span>
          </div>

          <aside className={`wn-notebook ${notebookOpen ? 'is-open' : ''}`} data-testid="wn-notebook">
            <div className="wn-tabs" role="tablist" aria-label="Notebook pages">
              <button type="button" role="tab" aria-selected={page === 'map'} onClick={() => setPage('map')} data-playground-action="page-map">{narrow ? 'map' : 'bowing map'}</button>
              <button type="button" role="tab" aria-selected={page === 'body'} onClick={() => setPage('body')} data-playground-action="page-body">{narrow ? 'body' : 'the body'}</button>
              {narrow && <button type="button" className="wn-fold" onClick={() => setNotebookOpen(o => !o)} aria-label={notebookOpen ? 'Fold the notebook' : 'Open the notebook'}>{notebookOpen ? '–' : '+'}</button>}
            </div>
            <canvas ref={mapRef} className="wn-map" aria-label={page === 'map' ? 'Map of where you bowed and what the string did there' : 'The body’s resonance, drawn when you knock'} role="img" />
            <p className="wn-legend">
              {page === 'map' ? (
                <><i className="is-speak" />speaks <i className="is-whistle" />whistles <i className="is-crunch" />crunches</>
              ) : (
                <>peaks near a note make it howl</>
              )}
            </p>
          </aside>

          <div className="wn-tools">
            <div
              className={`wn-loupe ${collar.on ? 'is-on' : ''}`}
              ref={loupeRef}
              role="slider"
              tabIndex={0}
              aria-label="Brass collar on the G string's afterlength"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(collar.p * 100)}
              aria-valuetext={collar.on ? `fitted, rings near ${collarNote}` : 'not fitted'}
              data-playground-action="collar"
              data-testid="wn-loupe"
              onPointerDown={e => { capture(e.currentTarget, e.pointerId); loupeDrag(e) }}
              onPointerMove={e => { if (e.buttons || e.pointerType === 'touch') loupeDrag(e) }}
              onKeyDown={e => {
                if (e.key === 'ArrowUp') { moveCollar(collar.p - 0.02, true); e.preventDefault(); e.stopPropagation() }
                if (e.key === 'ArrowDown') { moveCollar(collar.p + 0.02, true); e.preventDefault(); e.stopPropagation() }
              }}
            >
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <defs>
                  <clipPath id="wn-loupe-clip"><circle cx="60" cy="60" r="56" /></clipPath>
                </defs>
                <g clipPath="url(#wn-loupe-clip)">
                  <rect x="0" y="0" width="120" height="120" fill="#8a3d1a" />
                  <rect x="0" y="0" width="120" height="20" fill="#e6cf9e" />
                  <path d="M 18 106 L 102 106 L 110 120 L 10 120 Z" fill="#17110f" />
                  {[30, 50, 70, 90].map((x, i) => <line key={x} x1={x} x2={x - (x - 60) * 0.25} y1="20" y2="106" stroke={i === 1 ? '#efe7d2' : 'rgba(230,222,200,0.6)'} strokeWidth={i === 1 ? 2.4 : 1.6} />)}
                  {collar.on && (
                    <g transform={`translate(${50 - (50 - 60) * 0.25 * (0.22 + collar.p * 0.56)} ${20 + (0.22 + collar.p * 0.56) * 86})`}>
                      <rect x="-7" y="-6" width="14" height="12" rx="3" fill="#c9a24a" stroke="#6b5220" />
                      <rect x="-6" y="-3" width="12" height="2" fill="#f2d98a" />
                    </g>
                  )}
                </g>
                <circle cx="60" cy="60" r="56" fill="none" stroke="#c9a24a" strokeWidth="5" />
              </svg>
              <span className="wn-loupe-label">{collar.on ? `collar · rings ${collarNote}` : 'collar: not fitted'}</span>
            </div>
            <div className="wn-toolrow">
              <button type="button" className="wn-tool" onClick={() => moveCollar(collar.p, !collar.on)} data-playground-action="fit-collar" data-testid="wn-fit">{collar.on ? 'Take off collar' : 'Fit the collar'} <kbd>E</kbd></button>
              <button type="button" className="wn-tool" onClick={knock} data-playground-action="knock" data-testid="wn-knock">Knock the bridge <kbd>B</kbd></button>
            </div>
          </div>

          <nav className="wn-fingers" aria-label="Strings and stopped notes">
            <div className="wn-strings">
              {STRINGS.map((s, i) => (
                <button key={s.id} type="button" className={noteState.string === i ? 'is-on' : ''} onClick={() => chooseNote(i, noteState.semi)} aria-pressed={noteState.string === i} data-playground-action="choose-string">{s.id}</button>
              ))}
            </div>
            <div className="wn-semis" ref={semisRef}>
              {Array.from({ length: 11 }, (_, k) => {
                const n = noteOf(noteState.string, k)
                const want = E && phase === 'play' && E.string === noteState.string && (E.kind === 'piece' ? PIECE[pieceAt] === k : E.semi === k)
                return (
                  <button key={k} type="button" className={`${noteState.semi === k ? 'is-on' : ''} ${want ? 'is-want' : ''}`} onClick={() => chooseNote(noteState.string, k)} aria-pressed={noteState.semi === k} aria-label={`${n.label}${k === 0 ? ' open' : ''}`}>
                    {n.name}<small>{SEMI_KEYS[k].toUpperCase()}</small>
                  </button>
                )
              })}
            </div>
          </nav>
        </>
      )}

      {!audioOk && phase !== 'title' && <p className="wn-noaudio">This browser would not open an audio context, so the string is silent. Everything else still runs.</p>}

      {toast && <div key={toast.id} className={`wn-toast is-${toast.tone}`} role="status" data-testid="wn-toast">{toast.text}</div>}

      {help && (
        <div className="wn-help" role="dialog" aria-modal="true" aria-labelledby="wn-help-title" onKeyDown={e => {
          if (e.key === 'Tab') {
            const f = e.currentTarget.querySelectorAll('button')
            if (f.length) {
              e.preventDefault()
              f[0].focus()
            }
          }
        }}>
          <div className="wn-help-card">
            <h2 id="wn-help-title">How to bow a cello you can’t hold</h2>
            <ul>
              <li><b>Bow</b>: drag sideways across the strings below the fingerboard. How fast you drag is bow speed; how low you drag is how close to the bridge. Keyboard: hold <kbd>Space</kbd>, <kbd>,</kbd> <kbd>.</kbd> slower/faster, <kbd>←</kbd> <kbd>→</kbd> toward the bridge / fingerboard.</li>
              <li><b>Weight</b>: the brass lever, the mouse wheel, or <kbd>↑</kbd> <kbd>↓</kbd>.</li>
              <li><b>Notes</b>: tap or slide on the fingerboard, use the chips, or <kbd>1</kbd>–<kbd>4</kbd> for the string and <kbd>A</kbd>…<kbd>'</kbd> for the semitone.</li>
              <li><b>The collar</b>: <kbd>E</kbd> fits it, <kbd>[</kbd> <kbd>]</kbd> or drag the loupe to slide it. <kbd>B</kbd> knocks the bridge; <kbd>N</kbd> turns the notebook page.</li>
              <li>The string is simulated sample by sample: one slip per cycle is a note, two is a whistle, ragged is a crunch. The cards are judged by what it actually did.</li>
            </ul>
            <button type="button" ref={helpCloseRef} className="wn-primary" onClick={() => setHelp(false)}>Back to the hall <kbd>Esc</kbd></button>
          </div>
        </div>
      )}
    </div>
  )
}

// capture can refuse a pointer that has already gone (a lifted finger mid-event)
function capture(el, id) {
  try {
    el.setPointerCapture(id)
  } catch {
    /* the pointer is gone; nothing to hold */
  }
}

function hintFor(S, engaged) {
  if (S.phase !== 'play') return ''
  const e = ETUDES[S.etude]
  if (!e) return ''
  const n = S.recent.length
  const count = k => S.recent.reduce((a, r) => a + (r === k ? 1 : 0), 0)
  if (S.bowing && S.bowEndFlash > 0.2) return 'Out of bow: change direction, or lift and set it down again.'
  if (!engaged) {
    S.idleT += 0.1
    if (S.idleT > 5) return 'Drag sideways across the strings, just below the end of the fingerboard.'
    return ''
  }
  S.idleT = 0
  if (e.string !== undefined && S.string !== e.string) return `This one is on the ${STRINGS[e.string].id} string.`
  const want = e.kind === 'piece' ? PIECE[S.judge.pieceAt] : e.semi
  if (want !== undefined && S.semi !== want) {
    const nn = noteOf(e.string, want)
    return want === 0 ? 'Open string: lift the finger (tap near the nut, or A).' : `Stop the ${nn.label}: ${SEMI_KEYS[want].toUpperCase()} or the chip.`
  }
  if (e.maxD && S.d > e.maxD) return `Closer to the bridge: ${Math.round(S.d * 100)} cm now, ${Math.round(e.maxD * 100)} cm wanted. Drag lower.`
  if (n < 6) return ''
  const wolf = count('wolf')
  const wh = count('whistle')
  const cr = count('crunch')
  if (e.id === 'wolf' && (wolf > n * 0.4 || S.judge.failing > 5)) {
    return S.collarOn
      ? 'Still howling. Slide the collar and knock to see where the peaks went.'
      : 'It howls at an honest weight. Give it much more weight for your speed (bow slower, lean in), or fit the brass collar (E) and slide it.'
  }
  if (wolf > n * 0.4) return S.collarOn ? 'A pup of the wolf sits on this note. Knock the bridge (B) and slide the collar until the peaks fall between your notes.' : 'The wolf is on this note. Fit the collar (E), knock the bridge (B) and read the body.'
  if (e.kind === 'piece' && S.lastRes && S.lastRes.needStroke && S.recent[n - 1] === 'speak') return 'New note, new stroke: change bow direction (or lift and land) as you change finger.'
  if (e.kind === 'swell' && S.lastRes && S.lastRes.ratio > 1.8 && !S.lastRes.leaned) return 'Louder, but only by speed. Lean in as it grows: add weight with the bow.'
  if (e.kind === 'chart') return ''
  if (wh > n * 0.5) return 'It whistles: too light for that speed. Add weight, or bow slower.'
  if (cr > n * 0.5) return 'It crunches: too heavy for that speed. Lighten, or bow faster.'
  if (e.kind === 'swell' && S.judge.swellRun > 1.2 && S.judge.swellPeak < 1.4) return 'Now grow: more speed and more weight together.'
  return ''
}

function drawLive(ctx, L, S, dt, now) {
  const s = L.s
  const active = S.string
  const fy = S.semi > 0 ? fingerY(S.semi) : NUT_Y
  // strings
  for (let i = 0; i < 4; i++) {
    const st = STRINGS[i]
    const lw = Math.max(1, (st.gauge * s) / 900)
    ctx.strokeStyle = i === active ? '#f6eedb' : st.wound
    ctx.globalAlpha = i === active ? 1 : 0.75
    ctx.lineWidth = lw
    ctx.beginPath()
    ctx.moveTo(px(L, stringX(i, NUT_Y)), py(L, NUT_Y))
    ctx.lineTo(px(L, stringX(i, BRIDGE_Y)), py(L, BRIDGE_Y))
    ctx.lineTo(px(L, stringX(i, TAIL_TOP)), py(L, TAIL_TOP))
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  // the vibrating string, in stroboscopic slow motion, exaggerated sideways
  const sh = S.shape
  let mx = 0
  let at = 0
  for (let j = 0; j < sh.length; j++) {
    const a = Math.abs(sh[j])
    if (a > mx) {
      mx = a
      at = j
    }
  }
  S.norm += (Math.max(1e-6, mx) - S.norm) * Math.min(1, dt * 4)
  const amp = Math.min(s * 0.042, s * 0.006 + S.level * s * 0.2)
  const gain = S.norm > 0 ? amp / S.norm : 0
  const xAt = j => {
    const y = BRIDGE_Y + (fy - BRIDGE_Y) * (j / (sh.length - 1))
    return { x: px(L, stringX(active, y)) + sh[j] * gain, y: py(L, y) }
  }
  if (S.level > 0.004) {
    const col = REGIME_INK[S.regime] ? glowFor(S.regime) : '#fff2d6'
    ctx.save()
    ctx.strokeStyle = col
    ctx.shadowColor = col
    ctx.shadowBlur = S.reduced ? 0 : 10
    ctx.lineWidth = Math.max(1.5, s * 0.0028)
    ctx.beginPath()
    for (let j = 0; j < sh.length; j++) {
      const p = xAt(j)
      if (j === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
    ctx.restore()
    // the Helmholtz corner and where it has just been
    const c = xAt(at)
    S.corner.push(c)
    if (S.corner.length > 14) S.corner.shift()
    for (let i = 0; i < S.corner.length; i++) {
      const q = S.corner[i]
      ctx.fillStyle = `rgba(255, 236, 190, ${(i / S.corner.length) * 0.5})`
      ctx.beginPath()
      ctx.arc(q.x, q.y, 2 + (i / S.corner.length) * 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    S.corner.length = 0
  }
  // the paw stopping the string
  if (S.semi > 0) {
    const x = px(L, stringX(active, fy))
    const y = py(L, fy)
    const r = Math.max(6, s * 0.012)
    ctx.fillStyle = '#0b0910'
    ctx.strokeStyle = 'rgba(255, 220, 180, 0.4)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.35, r, r * 0.8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    for (let t = 0; t < 4; t++) {
      const a = -Math.PI * 0.85 + t * (Math.PI * 0.7 / 3)
      ctx.beginPath()
      ctx.ellipse(x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.15, r * 0.36, r * 0.42, a + Math.PI / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }
  // the collar on the G afterlength
  if (S.collarOn) {
    const yy = BRIDGE_Y + (TAIL_TOP - BRIDGE_Y) * (0.22 + S.collarP * 0.56)
    const x = px(L, stringX(1, yy))
    const w = Math.max(5, s * 0.008)
    ctx.fillStyle = '#c9a24a'
    ctx.fillRect(x - w / 2, py(L, yy) - w * 0.6, w, w * 1.2)
  }
  // the bow
  const engaged = S.bowing || S.keyBow
  const yb = py(L, bowY(S.d))
  const xs = px(L, stringX(active, bowY(S.d)))
  const len = (BOW_LEN / UNIT_M) * s
  const frog = xs + S.bowPos * len
  const tip = frog - len
  const tilt = (active - 1.5) * 0.05
  ctx.save()
  ctx.translate(xs, yb)
  ctx.rotate(tilt)
  ctx.translate(-xs, -yb)
  const lift = engaged ? 0 : s * 0.01
  const hairW = Math.max(2, s * (0.003 + (engaged ? S.weight * 0.0009 : 0)))
  ctx.fillStyle = engaged ? 'rgba(245, 238, 220, 0.95)' : 'rgba(245, 238, 220, 0.6)'
  ctx.fillRect(tip, yb - hairW / 2 - lift, len, hairW)
  // stick, cambered toward the hair
  ctx.strokeStyle = '#5b2a14'
  ctx.lineWidth = Math.max(2.5, s * 0.0048)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(frog, yb - s * 0.014 - lift)
  ctx.quadraticCurveTo((frog + tip) / 2, yb - s * 0.006 - lift, tip, yb - s * 0.016 - lift)
  ctx.stroke()
  // head and frog
  ctx.fillStyle = '#efe5cf'
  ctx.fillRect(tip - s * 0.004, yb - s * 0.019 - lift, s * 0.006, s * 0.02)
  ctx.fillStyle = '#121010'
  ctx.fillRect(frog - s * 0.004, yb - s * 0.02 - lift, s * 0.03, s * 0.022)
  ctx.fillStyle = '#d8d0e0'
  ctx.beginPath()
  ctx.arc(frog + s * 0.011, yb - s * 0.009 - lift, Math.max(1.5, s * 0.003), 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#c9a24a'
  ctx.lineWidth = Math.max(1, s * 0.002)
  ctx.beginPath()
  ctx.moveTo(frog + s * 0.026, yb - s * 0.02 - lift)
  ctx.lineTo(frog + s * 0.026, yb + s * 0.002 - lift)
  ctx.stroke()
  if (S.bowEndFlash > 0) {
    ctx.fillStyle = `rgba(255, 210, 150, ${S.bowEndFlash * 0.6})`
    const endX = S.bowPos >= 0.5 ? frog : tip
    ctx.beginPath()
    ctx.arc(endX, yb, s * 0.02, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  // rosin dust when it crunches
  if (!S.reduced && engaged && S.regime === 'crunch' && Math.random() < 0.6) {
    S.dust.push({ x: xs, y: yb, vx: (Math.random() - 0.5) * 30, vy: 10 + Math.random() * 30, t: 0 })
  }
  for (let i = S.dust.length - 1; i >= 0; i--) {
    const d = S.dust[i]
    d.t += dt
    d.x += d.vx * dt
    d.y += d.vy * dt
    if (d.t > 1.2) {
      S.dust.splice(i, 1)
      continue
    }
    ctx.fillStyle = `rgba(250, 240, 220, ${0.6 * (1 - d.t / 1.2)})`
    ctx.fillRect(d.x, d.y, 1.6, 1.6)
  }
  // f-holes glow when the body is ringing hard
  const glow = Math.min(1, S.wolfLevel * 45) * (1 - S.dawn * 0.6)
  if (glow > 0.05) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const side of [-1, 1]) {
      const g = ctx.createRadialGradient(px(L, side * 0.07), py(L, 0.72), 1, px(L, side * 0.07), py(L, 0.72), s * 0.07)
      g.addColorStop(0, `rgba(190, 140, 255, ${0.22 * glow})`)
      g.addColorStop(1, 'rgba(190, 140, 255, 0)')
      ctx.fillStyle = g
      ctx.fillRect(px(L, side * 0.07) - s * 0.07, py(L, 0.72) - s * 0.09, s * 0.14, s * 0.18)
    }
    ctx.restore()
  }
  void now
}

function glowFor(regime) {
  if (regime === 'speak') return '#fff0cf'
  if (regime === 'whistle') return '#bfe0ff'
  if (regime === 'crunch') return '#ffb08a'
  if (regime === 'wolf') return '#d6b8ff'
  return '#fff2d6'
}
