import { useCallback, useEffect, useRef, useState } from 'react'
import ExperimentNav from '../../ExperimentNav'
import {
  W, H, N, ROLL, GRADES, buildNegative, buildUnevenness, freshSheet, expose, develop,
  finalDensity, judgePrint, judgeStrip, toolMask, stripMask, STRIP_H
} from './safelight/darkroom'
import { createDarkroomAudio } from './safelight/audio'
import './SafeLight.css'

const SAVE_KEY = 'safe-light-v1'
const BOX = 40 // the box holds ten sheets; a test strip is a quarter of one
const DEV_REAL = 7.5 // real seconds for one standard development
const CLOCK = 8 // darkroom seconds shown per real second in the trays
const STOP_REAL = 1.2
const FIX_REAL = 3.75
const STEPS = 5
const MAX_TIMER = 40

const loadSave = () => {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
const writeSave = data => {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch {
    /* storage refused: the line just will not survive the tab */
  }
}

const sheetsLabel = q => {
  const whole = Math.floor(q / 4)
  const frac = ['', '¼', '½', '¾'][q % 4]
  return `${whole || (frac ? '' : '0')}${frac}`
}

const ADVICE = {
  'burnt out': 'too little light here. Burn it in through the card',
  blocked: 'too much light here. Dodge it, or less time',
  flat: 'both tones print alike. Try a harder grade'
}

const toneOf = d => {
  const v = Math.round(10 + 238 * Math.pow(Math.pow(10, -d), 1 / 2.2))
  return `rgb(${v}, ${v - 2}, ${v - 6})`
}

function StripReading ({ read, step }) {
  const ids = []
  for (const b of read) for (const r of b.results) if (!ids.some(x => x.id === r.id)) ids.push({ id: r.id, short: r.short })
  const good = read.filter(b => b.results.length && b.results.every(r => r.held))
  return (
    <div className="sl-stripread" data-testid="sl-strip-reading">
      <table>
        <thead>
          <tr><th>step</th><th>tone</th>{ids.map(t => <th key={t.id}>{t.short}</th>)}</tr>
        </thead>
        <tbody>
          {read.map(b => (
            <tr key={b.band} className={good.includes(b) ? 'is-good' : ''}>
              <td>{step * (b.band + 1)}s</td>
              <td><i style={{ background: toneOf(b.mean) }} /></td>
              {ids.map(t => {
                const r = b.results.find(x => x.id === t.id)
                return <td key={t.id} className={r ? (r.held ? 'is-held' : 'is-lost') : ''}>{r ? (r.held ? '●' : '○') : '·'}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="sl-note">
        {ids.length === 0
          ? 'None of the brief falls inside this strip. Move it over the cat or the lamp next time.'
          : good.length
            ? `Everything in the strip holds at ${good.map(b => `${step * (b.band + 1)}s`).join(', ')}. The timer is set to the middle of that for the next sheet.`
            : 'No single step holds everything inside the strip. Try another grade, or plan to dodge and burn.'}
      </p>
    </div>
  )
}

const ENDINGS = [
  { secret: true, min: 6, title: 'Two cats on the roll', line: 'Someone else was standing in the beam. Nothing showed it but the print, and only because you made the print show it.' },
  { min: 8, title: 'The roll, printed true', line: 'Lace, lamp-glass and the small cat in the boat, all held on paper that can only hold so much.' },
  { min: 5, title: 'Good enough for the hallway', line: 'Some of what the negatives held is on the wall. The rest is still in the film, waiting for a steadier hand.' },
  { min: 0, title: 'Soot and fog', line: 'Black where there were cats, white where there were windows. The negatives are fine. Try the box again.' }
]

function centroid (idx) {
  if (!idx || !idx.length) return null
  let sx = 0
  let sy = 0
  for (let n = 0; n < idx.length; n++) {
    sx += idx[n] % W
    sy += Math.floor(idx[n] / W)
  }
  return [sx / idx.length, sy / idx.length]
}

// the mask pixel nearest the region's centroid, so a mark sits on the thing itself
function anchorOf (idx) {
  const c = centroid(idx)
  if (!c) return null
  let best = idx[0]
  let bd = Infinity
  for (let n = 0; n < idx.length; n += 2) {
    const x = idx[n] % W
    const y = Math.floor(idx[n] / W)
    const d = (x - c[0]) ** 2 + (y - c[1]) ** 2
    if (d < bd) {
      bd = d
      best = idx[n]
    }
  }
  return [best % W + 0.5, Math.floor(best / W) + 0.5]
}

function drawNegativeThumb (canvas, neg) {
  if (!canvas || !neg) return
  const w = 75
  const h = 94
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(w, h)
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = Math.floor(j * H / h) * W + Math.floor(i * W / w)
      const t = Math.pow(neg.trans[k] * 1.8, 0.55)
      const o = (j * w + i) * 4
      img.data[o] = 60 + 190 * t
      img.data[o + 1] = 34 + 150 * t
      img.data[o + 2] = 22 + 110 * t
      img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
}

export default function SafeLight ({ category, experiment }) {
  const rootRef = useRef(null)
  const paperRef = useRef(null)
  const trayRef = useRef(null)
  const audioRef = useRef(null)
  const thumbRefs = useRef([])
  const helpCloseRef = useRef(null)
  const sim = useRef(null)
  if (!sim.current) {
    sim.current = {
      phase: 'title',
      frame: 0,
      negs: [null, null, null],
      uneven: null,
      sheet: null,
      kind: 'sheet',
      sheetTaken: false,
      stripTop: Math.round(H * 0.5 - STRIP_H / 2),
      stripCenter: H * 0.5,
      grade: 2,
      timer: 8,
      tool: 'none',
      toolR: 34,
      tx: W * 0.5,
      ty: H * 0.55,
      toolLive: false,
      red: true,
      lights: false,
      lamp: { on: false, t: 0, total: 0, lastSec: 0, grade: 2, kind: 'sheet' },
      devT: 0,
      stopT: 0,
      fixT: 0,
      agitation: 1,
      rocking: 0,
      lastSlosh: 0,
      paper: BOX,
      hung: [],
      strips: {},
      judged: null,
      density: new Float32Array(N),
      mask: new Float32Array(N),
      img: null,
      dirty: true,
      reduced: false,
      fogWarned: false,
      chimed: false,
      lastUi: 0,
      log: []
    }
  }

  const [, setTick] = useState(0)
  const rerender = useCallback(() => setTick(t => (t + 1) % 1e9), [])
  const [toast, setToast] = useState(null)
  const [help, setHelp] = useState(false)
  const [muted, setMuted] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [ready, setReady] = useState(false)

  const say = useCallback((text, tone = 'info') => {
    setToast({ text, tone, id: Date.now() })
  }, [])
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 4200)
    return () => clearTimeout(id)
  }, [toast])

  // ---- audio --------------------------------------------------------------
  useEffect(() => {
    audioRef.current = createDarkroomAudio()
    return () => {
      audioRef.current?.dispose()
      audioRef.current = null
    }
  }, [])
  useEffect(() => { audioRef.current?.setMuted(muted) }, [muted])

  // ---- reduced motion -----------------------------------------------------
  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => {
      setReduced(q.matches)
      sim.current.reduced = q.matches
    }
    on()
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])

  // ---- negatives: build the roll a frame at a time ------------------------
  useEffect(() => {
    const S = sim.current
    const saved = loadSave()
    if (saved) {
      if (Array.isArray(saved.hung)) S.hung = saved.hung.filter(h => typeof h.frame === 'number' && typeof h.thumb === 'string')
      if (typeof saved.paper === 'number') S.paper = Math.max(0, Math.min(BOX, saved.paper))
      const next = ROLL.findIndex((_, i) => !S.hung.some(h => h.frame === i))
      S.frame = next < 0 ? 0 : next
      if (S.hung.length >= ROLL.length) S.phase = 'ending'
    }
    let cancelled = false
    const timers = []
    const buildOne = i => {
      if (cancelled) return
      S.negs[i] = buildNegative(ROLL[i])
      S.negs[i].centres = {}
      for (const [tag, idx] of Object.entries(S.negs[i].masks)) S.negs[i].centres[tag] = anchorOf(idx)
      drawNegativeThumb(thumbRefs.current[i], S.negs[i])
      if (i === S.frame) {
        S.dirty = true
        setReady(true)
      }
      rerender()
    }
    S.uneven = buildUnevenness(3)
    buildOne(S.frame)
    ROLL.forEach((_, i) => {
      if (i !== S.frame) timers.push(setTimeout(() => buildOne(i), 120 + i * 140))
    })
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [rerender])

  const persist = useCallback(() => {
    const S = sim.current
    writeSave({ hung: S.hung, paper: S.paper })
  }, [])

  // ---- painting the paper -------------------------------------------------
  const paint = useCallback(() => {
    const S = sim.current
    const canvas = paperRef.current
    const neg = S.negs[S.frame]
    if (!canvas || !neg) return
    if (canvas.width !== W) {
      canvas.width = W
      canvas.height = H
    }
    const ctx = canvas.getContext('2d')
    if (!S.img) S.img = ctx.createImageData(W, H)
    const data = S.img.data
    const onEasel = S.phase === 'easel' || S.phase === 'title' || S.phase === 'ending' || !S.sheet
    const strip = S.kind === 'strip'
    const top = strip ? S.stripTop : 0
    const bottom = strip ? S.stripTop + STRIP_H : H
    const lights = S.lights
    const projecting = onEasel && (S.lamp.on || (S.red && !lights))
    const tr = neg.trans
    if (onEasel) {
      // the easel board, the sheet and whatever the enlarger lays on it
      const mask = S.mask
      if (projecting) {
        if (S.lamp.on && S.lamp.kind === 'strip') stripMask(mask, S.stripCenter, Math.min(STEPS, Math.floor(S.lamp.t / Math.max(0.001, S.timer)) + 1))
        else if (S.toolLive || S.tool !== 'none') toolMask(mask, S.toolLive ? S.tool : 'none', S.tx, S.ty, S.toolR, 3 + S.toolR * 0.32)
        else mask.fill(1)
      }
      const g = GRADES[S.lamp.on ? S.lamp.grade : S.grade]
      // filter tint: yellow for soft grades, magenta for hard
      const fr = 255
      const fg = S.lamp.on ? 236 - g.id * 16 : 40
      const fb = S.lamp.on ? 150 + g.id * 14 : 22
      for (let j = 0; j < H; j++) {
        const onPaper = j >= top && j < bottom
        for (let i = 0; i < W; i++) {
          const k = j * W + i
          const o = k * 4
          let r
          let gg
          let b
          if (lights) {
            r = onPaper ? 246 : 228
            gg = onPaper ? 243 : 224
            b = onPaper ? 236 : 214
            if (S.sheetTaken && onPaper && S.sheet.fog > 0) {
              const f = Math.pow(10, -Math.min(1.6, S.sheet.fog * 0.5))
              r *= f
              gg *= f
              b *= f
            }
          } else {
            const base = onPaper ? 1 : 0.62
            r = 84 * base
            gg = 20 * base
            b = 14 * base
          }
          if (projecting) {
            const l = Math.pow(tr[k] * 1.6, 0.62) * mask[k]
            const amp = S.lamp.on ? 1 : 0.85
            r += fr * l * amp
            gg += fg * l * amp
            b += fb * l * amp
          }
          data[o] = r > 255 ? 255 : r
          data[o + 1] = gg > 255 ? 255 : gg
          data[o + 2] = b > 255 ? 255 : b
          data[o + 3] = 255
        }
      }
    } else {
      // wet or finished print: density into reflectance, seen by red or white light
      const dens = finalDensity(S.sheet, S.density)
      const inSafelight = !lights
      const wet = S.phase !== 'inspect'
      for (let j = 0; j < H; j++) {
        const onPaper = j >= top && j < bottom
        for (let i = 0; i < W; i++) {
          const k = j * W + i
          const o = k * 4
          if (!onPaper) {
            data[o + 3] = 0
            continue
          }
          const R = Math.pow(10, -dens[k])
          if (inSafelight) {
            const v = Math.pow(R, 0.5)
            data[o] = 28 + 200 * v
            data[o + 1] = 6 + 50 * v
            data[o + 2] = 5 + 34 * v
          } else {
            const v = Math.pow(R, 1 / 2.2)
            data[o] = 10 + 238 * v
            data[o + 1] = 10 + 234 * v * (wet ? 0.99 : 1)
            data[o + 2] = 9 + 226 * v
          }
          data[o + 3] = 255
        }
      }
    }
    ctx.putImageData(S.img, 0, 0)
    S.dirty = false
  }, [])

  // ---- main loop ------------------------------------------------------------
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = now => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.25, (now - last) / 1000)
      last = now
      const S = sim.current
      const A = audioRef.current
      const neg = S.negs[S.frame]
      if (!neg) return
      let ui = false
      let force = false
      // the lamp
      if (S.lamp.on) {
        const L = S.lamp
        const prev = L.t
        L.t = Math.min(L.total, L.t + dt)
        const step = L.t - prev
        if (step > 0) {
          if (L.kind === 'strip') {
            const k = Math.min(STEPS, Math.floor(prev / Math.max(0.001, S.timer)) + 1)
            stripMask(S.mask, S.stripCenter, k)
            expose(S.sheet, neg, L.grade, step, S.mask)
          } else if (S.toolLive && S.tool !== 'none') {
            toolMask(S.mask, S.tool, S.tx, S.ty, S.toolR, 3 + S.toolR * 0.32)
            expose(S.sheet, neg, L.grade, step, S.mask)
          } else {
            expose(S.sheet, neg, L.grade, step, null)
          }
        }
        const sec = Math.floor(L.t)
        if (sec > L.lastSec) {
          L.lastSec = sec
          if (L.t < L.total) A?.tick(L.kind === 'strip' && sec % Math.max(1, S.timer) === 0)
        }
        if (L.t >= L.total) {
          L.on = false
          S.sheet.exposures.push({ grade: L.grade, seconds: L.total, kind: L.kind, tool: L.kind === 'strip' ? 'strip' : (S.toolLive ? S.tool : 'none') })
          A?.lamp(false)
          A?.tick(true)
          force = true
        }
        S.dirty = true
        ui = true
      }
      // the trays
      if (S.phase === 'dev') {
        S.devT += dt
        if (S.rocking > 0) {
          S.rocking -= dt
          S.agitation = Math.min(1, S.agitation + dt * 4)
        } else {
          S.agitation = Math.max(0, S.agitation - dt / 2.4)
        }
        develop(S.sheet, S.uneven, dt / DEV_REAL, S.agitation)
        if (!S.chimed && S.devT > DEV_REAL * 0.25) {
          S.chimed = true
          A?.chime()
        }
        if (S.rocking <= 0 && S.wasRocking) force = true
        S.wasRocking = S.rocking > 0
        S.dirty = true
        ui = true
      } else if (S.phase === 'stop') {
        S.stopT += dt
        if (S.stopT < 0.35) develop(S.sheet, S.uneven, dt / DEV_REAL * 0.4, S.agitation)
        if (S.stopT >= STOP_REAL && !S.stopReady) {
          S.stopReady = true
          force = true
        }
        ui = true
      } else if (S.phase === 'fix') {
        S.fixT += dt
        ui = true
      }
      // room light on paper that can still see it
      if (S.lights && S.sheetTaken && S.sheet && S.phase !== 'ending' && S.phase !== 'title') {
        const fixed = S.phase === 'fix' || S.phase === 'inspect' ? Math.min(1, S.fixT / FIX_REAL) : 0
        if (fixed < 1) {
          const before = S.sheet.fog
          S.sheet.fog = Math.min(1.5, S.sheet.fog + dt * 0.4 * (1 - fixed))
          if (S.sheet.fog !== before) {
            S.dirty = true
            if (S.phase === 'inspect' && now - (S.lastJudge || 0) > 400) {
              S.lastJudge = now
              S.judged = judgePrint(neg, S.density)
              ui = true
            }
            if (!S.fogWarned) {
              S.fogWarned = true
              say(S.phase === 'inspect' ? 'Not fixed long enough. The print is still sensitive, and the room light is darkening it.' : 'The room light is on a sheet that has not been fixed. It is fogging.', 'warn')
            }
          }
        }
      }
      if (S.dirty) paint()
      if (force || (ui && now - S.lastUi > 90)) {
        S.lastUi = now
        rerender()
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [paint, rerender, say])

  // ---- actions --------------------------------------------------------------
  const S = sim.current
  const neg = S.negs[S.frame]
  const frame = ROLL[S.frame]

  const newSheet = useCallback(() => {
    const T = sim.current
    T.sheet = freshSheet()
    T.sheetTaken = false
    T.devT = 0
    T.stopT = 0
    T.fixT = 0
    T.judged = null
    T.stripRead = null
    T.fogWarned = false
    T.chimed = false
    T.agitation = 1
    T.dirty = true
  }, [])

  const begin = useCallback(() => {
    const T = sim.current
    audioRef.current?.wake()
    audioRef.current?.switchClick()
    T.phase = 'easel'
    T.lights = false
    T.red = true
    newSheet()
    say('Red filter is under the lens: you can see the frame without exposing it. Swing it away to print.')
    rerender()
  }, [newSheet, rerender, say])

  const canExpose = S.phase === 'easel' && !S.lamp.on && !S.lights && !!neg
  const startLamp = useCallback(() => {
    const T = sim.current
    if (T.phase !== 'easel' || T.lamp.on) return
    if (T.lights) {
      say('Turn the room light off before you open the paper box.', 'warn')
      return
    }
    if (!T.sheet) newSheet()
    if (!T.sheetTaken) {
      const cost = T.kind === 'strip' ? 1 : 4
      if (T.paper < cost) {
        say(T.paper > 0 ? 'Not enough paper left for a full sheet. Cut test strips, or hang what you have.' : 'The box is empty.', 'warn')
        return
      }
      T.paper -= cost
      T.sheetTaken = true
      T.sheetKind = T.kind
      persist()
    }
    audioRef.current?.wake()
    audioRef.current?.lamp(true)
    T.red = false
    T.lamp = {
      on: true,
      t: 0,
      total: T.kind === 'strip' ? T.timer * STEPS : T.timer,
      lastSec: 0,
      grade: T.grade,
      kind: T.kind
    }
    if (T.kind === 'strip') T.strips[T.frame] = { grade: T.grade, step: T.timer, top: T.stripTop }
    rerender()
  }, [newSheet, persist, rerender, say])

  const stopLamp = useCallback(() => {
    const T = sim.current
    if (!T.lamp.on) return
    T.sheet.exposures.push({ grade: T.lamp.grade, seconds: Math.round(T.lamp.t * 10) / 10, kind: T.lamp.kind, tool: T.toolLive ? T.tool : 'none', cut: true })
    T.lamp.on = false
    audioRef.current?.lamp(false)
    T.dirty = true
    rerender()
  }, [rerender])

  const toggleLamp = useCallback(() => {
    if (sim.current.lamp.on) stopLamp()
    else startLamp()
  }, [startLamp, stopLamp])

  const setGrade = useCallback(g => {
    const T = sim.current
    if (T.lamp.on) return
    T.grade = Math.max(0, Math.min(5, g))
    audioRef.current?.clink()
    T.dirty = true
    rerender()
  }, [rerender])
  const setTimer = useCallback(v => {
    const T = sim.current
    if (T.lamp.on) return
    T.timer = Math.max(1, Math.min(MAX_TIMER, v))
    rerender()
  }, [rerender])
  const setTool = useCallback(tool => {
    const T = sim.current
    if (T.kind === 'strip' && tool !== 'none') return
    T.tool = tool
    T.toolLive = tool !== 'none'
    T.dirty = true
    rerender()
  }, [rerender])
  const cycleTool = useCallback(() => {
    const order = ['none', 'dodge', 'burn']
    setTool(order[(order.indexOf(sim.current.tool) + 1) % order.length])
  }, [setTool])
  const sizeTool = useCallback(d => {
    const T = sim.current
    T.toolR = Math.max(12, Math.min(110, T.toolR + d))
    T.dirty = true
    rerender()
  }, [rerender])
  const setKind = useCallback(kind => {
    const T = sim.current
    if (T.sheetTaken || T.lamp.on || T.phase !== 'easel') return
    T.kind = kind
    if (kind === 'strip') {
      T.tool = 'none'
      T.toolLive = false
      if (T.timer > 8) T.timer = 3
    }
    T.dirty = true
    rerender()
  }, [rerender])
  const toggleRed = useCallback(() => {
    const T = sim.current
    if (T.lamp.on || T.phase !== 'easel') return
    T.red = !T.red
    audioRef.current?.clink()
    T.dirty = true
    rerender()
  }, [rerender])
  const toggleLights = useCallback(() => {
    const T = sim.current
    if (T.phase === 'title' || T.phase === 'ending') return
    if (T.lamp.on) stopLamp()
    T.lights = !T.lights
    audioRef.current?.switchClick()
    if (T.lights && T.phase === 'fix') {
      T.phase = 'inspect'
      T.judged = judgePrint(T.negs[T.frame], finalDensity(T.sheet, T.density))
      T.stripRead = T.sheetKind === 'strip' ? judgeStrip(T.negs[T.frame], T.density, T.stripTop, STEPS) : null
      if (T.stripRead && T.strips[T.frame]) T.strips[T.frame].read = T.stripRead
      audioRef.current?.chime(true)
    }
    T.dirty = true
    rerender()
  }, [rerender, stopLamp])

  const chooseFrame = useCallback(i => {
    const T = sim.current
    if (T.phase !== 'easel' || T.sheetTaken || T.lamp.on) return
    if (!T.negs[i]) return
    if (T.hung.some(h => h.frame === i)) {
      say(`Frame ${ROLL[i].frame} is already on the line. You can reprint it once the others are done.`)
    }
    T.frame = i
    T.red = true
    audioRef.current?.clink()
    newSheet()
    rerender()
  }, [newSheet, rerender, say])

  const binSheet = useCallback(() => {
    const T = sim.current
    if (T.lamp.on) return
    newSheet()
    say('Into the bin. The box is lighter for it.')
    rerender()
  }, [newSheet, rerender, say])

  const toDev = useCallback(() => {
    const T = sim.current
    if (T.phase !== 'easel' || !T.sheetTaken || T.lamp.on || !T.sheet.exposures.length) return
    T.phase = 'dev'
    T.devT = 0
    T.agitation = 1
    T.rocking = 0.6
    T.sheet.dev.fill(0)
    audioRef.current?.drop()
    T.dirty = true
    rerender()
  }, [rerender])
  const rock = useCallback((amount = 0.5) => {
    const T = sim.current
    if (T.phase !== 'dev' && T.phase !== 'stop' && T.phase !== 'fix') return
    T.rocking = Math.max(T.rocking, amount)
    const now = performance.now()
    if (now - T.lastSlosh > 380) {
      T.lastSlosh = now
      audioRef.current?.slosh(1)
    }
    T.rockKick = now
    rerender()
  }, [rerender])
  const toStop = useCallback(() => {
    const T = sim.current
    if (T.phase !== 'dev') return
    T.phase = 'stop'
    T.stopT = 0
    T.stopReady = false
    audioRef.current?.drip()
    audioRef.current?.drop()
    rerender()
  }, [rerender])
  const toFix = useCallback(() => {
    const T = sim.current
    if (T.phase !== 'stop' || T.stopT < STOP_REAL) return
    T.phase = 'fix'
    T.fixT = 0
    audioRef.current?.drip()
    audioRef.current?.drop()
    rerender()
  }, [rerender])

  const advance = useCallback(() => {
    const T = sim.current
    if (T.phase === 'title') begin()
    else if (T.phase === 'easel') toDev()
    else if (T.phase === 'dev') toStop()
    else if (T.phase === 'stop') toFix()
    else if (T.phase === 'fix' && !T.lights) toggleLights()
  }, [begin, toDev, toStop, toFix, toggleLights])

  const backToEasel = useCallback(() => {
    const T = sim.current
    if (T.sheetKind === 'strip') {
      T.kind = 'sheet'
      if (T.strips[T.frame]?.read) {
        const best = T.strips[T.frame].read.filter(b => b.results.length && b.results.every(r => r.held))
        if (best.length) T.timer = Math.min(MAX_TIMER, T.strips[T.frame].step * (best[Math.floor(best.length / 2)].band + 1))
      }
    }
    T.phase = 'easel'
    T.lights = false
    T.red = true
    newSheet()
    audioRef.current?.switchClick()
    rerender()
  }, [newSheet, rerender])

  const hang = useCallback(() => {
    const T = sim.current
    if (T.phase !== 'inspect' || T.sheetKind !== 'sheet' || !T.judged) return
    const c = document.createElement('canvas')
    c.width = 150
    c.height = 188
    c.getContext('2d').drawImage(paperRef.current, 0, 0, 150, 188)
    const thumb = c.toDataURL('image/jpeg', 0.82)
    const held = T.judged.results.filter(r => r.held && !r.secret).map(r => r.id)
    const secret = T.judged.results.some(r => r.secret && r.held)
    T.hung = [...T.hung.filter(h => h.frame !== T.frame), { frame: T.frame, thumb, held, secret, fog: T.sheet.fog > 0.05 }]
    T.hung.sort((a, b) => a.frame - b.frame)
    persist()
    audioRef.current?.clink()
    if (T.hung.length >= ROLL.length) {
      newSheet()
      T.phase = 'ending'
      T.lights = true
      audioRef.current?.chime(true)
      rerender()
      return
    }
    const next = ROLL.findIndex((_, i) => !T.hung.some(h => h.frame === i))
    T.frame = next
    say(`Pegged on the line. Frame ${ROLL[next].frame} is next on the contact sheet.`)
    backToEasel()
  }, [backToEasel, newSheet, persist, rerender, say])

  const endEarly = useCallback(() => {
    const T = sim.current
    if (T.lamp.on) return
    newSheet()
    T.phase = 'ending'
    T.lights = true
    rerender()
  }, [newSheet, rerender])

  const newRoll = useCallback(() => {
    const T = sim.current
    T.hung = []
    T.paper = BOX
    T.strips = {}
    T.frame = 0
    T.grade = 2
    T.timer = 8
    T.tool = 'none'
    T.toolLive = false
    T.kind = 'sheet'
    T.lamp.on = false
    audioRef.current?.lamp(false)
    persist()
    T.phase = 'easel'
    T.lights = false
    T.red = true
    newSheet()
    rerender()
  }, [newSheet, persist, rerender])

  // ---- pointer on the easel --------------------------------------------------
  const toSheet = (e) => {
    const r = paperRef.current.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]
  }
  const onEaselPointer = useCallback(e => {
    const T = sim.current
    if (T.phase !== 'easel') return
    const [x, y] = toSheet(e)
    if (T.kind === 'strip') {
      if (T.lamp.on || T.sheetTaken) return
      if (e.type === 'pointermove' && e.pointerType === 'mouse' && e.buttons === 0) return
      T.stripCenter = Math.max(STRIP_H / 2, Math.min(H - STRIP_H / 2, y))
      T.stripTop = Math.round(T.stripCenter - STRIP_H / 2)
      T.dirty = true
      rerender()
      return
    }
    T.tx = x
    T.ty = y
    T.toolLive = T.tool !== 'none' && x > -40 && x < W + 40 && y > -40 && y < H + 40
    T.dirty = true
  }, [rerender])
  const onEaselDown = useCallback(e => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    audioRef.current?.wake()
    onEaselPointer(e)
  }, [onEaselPointer])
  const onEaselLeave = useCallback(e => {
    const T = sim.current
    if (e.pointerType === 'mouse' && T.tool !== 'none') {
      // the tool goes back under the lens when the hand leaves the easel
      T.toolLive = false
      T.dirty = true
    }
  }, [])

  // ---- tray pointer: drag to rock ---------------------------------------------
  const trayDrag = useRef(null)
  const onTrayDown = useCallback(e => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    trayDrag.current = { y: e.clientY, x: e.clientX }
    rock(0.5)
  }, [rock])
  const onTrayMove = useCallback(e => {
    if (!trayDrag.current) return
    const d = Math.hypot(e.clientY - trayDrag.current.y, e.clientX - trayDrag.current.x)
    if (d > 14) {
      trayDrag.current = { y: e.clientY, x: e.clientX }
      rock(0.6)
    }
  }, [rock])
  const onTrayUp = useCallback(() => { trayDrag.current = null }, [])

  // ---- keyboard -------------------------------------------------------------
  useEffect(() => {
    const onKey = e => {
      const T = sim.current
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key
      if (help && k === 'Escape') {
        setHelp(false)
        return
      }
      if (k === '?' || k === 'h' || k === 'H') {
        setHelp(v => !v)
        return
      }
      if (k === 'm' || k === 'M') {
        setMuted(v => !v)
        return
      }
      if (T.phase === 'title' && (k === 'Enter' || k === ' ')) {
        e.preventDefault()
        begin()
        return
      }
      if (k === 'l' || k === 'L') { toggleLights(); return }
      if (T.phase === 'easel') {
        if (k === ' ') { e.preventDefault(); toggleLamp(); return }
        if (/^[0-5]$/.test(k)) { setGrade(Number(k)); return }
        if (k === 'g' || k === 'G') { setGrade((T.grade + 1) % 6); return }
        if (k === ',' || k === '-' || k === '_') { setTimer(T.timer - 1); return }
        if (k === '.' || k === '=' || k === '+') { setTimer(T.timer + 1); return }
        if (k === 'x' || k === 'X') { cycleTool(); return }
        if (k === '[') { sizeTool(-6); return }
        if (k === ']') { sizeTool(6); return }
        if (k === 't' || k === 'T') { setKind(T.kind === 'strip' ? 'sheet' : 'strip'); return }
        if (k === 'f' || k === 'F') { toggleRed(); return }
        if (k === 'Enter' || k === 'd' || k === 'D') { toDev(); return }
        if (k.startsWith('Arrow')) {
          e.preventDefault()
          const step = e.shiftKey ? 18 : 6
          if (T.kind === 'strip' && !T.sheetTaken) {
            const dy = k === 'ArrowUp' ? -step : k === 'ArrowDown' ? step : 0
            T.stripCenter = Math.max(STRIP_H / 2, Math.min(H - STRIP_H / 2, T.stripCenter + dy))
            T.stripTop = Math.round(T.stripCenter - STRIP_H / 2)
          } else {
            if (k === 'ArrowLeft') T.tx -= step
            if (k === 'ArrowRight') T.tx += step
            if (k === 'ArrowUp') T.ty -= step
            if (k === 'ArrowDown') T.ty += step
            T.tx = Math.max(0, Math.min(W, T.tx))
            T.ty = Math.max(0, Math.min(H, T.ty))
            T.toolLive = T.tool !== 'none'
          }
          T.dirty = true
          rerender()
        }
        return
      }
      if (T.phase === 'dev' || T.phase === 'stop' || T.phase === 'fix') {
        if (k === 'r' || k === 'R' || k === 'a' || k === 'A') { rock(0.6); return }
        if (k === 'Enter' || k === ' ') { e.preventDefault(); advance() }
        return
      }
      if (T.phase === 'inspect') {
        if (k === 'Enter' && T.sheetKind === 'sheet') { hang(); return }
        if (k === 'n' || k === 'N' || k === 'Backspace') backToEasel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [help, begin, toggleLights, toggleLamp, setGrade, setTimer, cycleTool, sizeTool, setKind, toggleRed, toDev, rock, advance, hang, backToEasel, rerender])

  useEffect(() => {
    if (help) helpCloseRef.current?.focus()
  }, [help])

  // ---- derived view state -------------------------------------------------------
  const phase = S.phase
  const lampOn = S.lamp.on
  const lampLeft = lampOn ? Math.max(0, S.lamp.total - S.lamp.t) : 0
  const stripStep = lampOn && S.lamp.kind === 'strip' ? Math.min(STEPS, Math.floor(S.lamp.t / Math.max(0.001, S.timer)) + 1) : 0
  const devClock = Math.round(S.devT * CLOCK)
  const fixFrac = Math.min(1, S.fixT / FIX_REAL)
  const station = phase === 'dev' ? 'dev' : phase === 'stop' ? 'stop' : phase === 'fix' || phase === 'inspect' ? 'fix' : 'easel'
  const inTray = station !== 'easel'
  const hungFrame = S.hung.find(h => h.frame === S.frame)
  const judged = S.judged
  const lastStrip = S.strips[S.frame]
  const kindNow = S.sheetTaken ? S.sheetKind : S.kind
  const exposures = S.sheet?.exposures || []
  const totalHeld = S.hung.reduce((a, h) => a + h.held.length, 0)
  const foundSecret = S.hung.some(h => h.secret)
  const ending = ENDINGS.find(e => (e.secret ? foundSecret : true) && totalHeld >= e.min) || ENDINGS[ENDINGS.length - 1]
  const devHint = devClock < 40 ? 'too soon: the highlights have not come up' : devClock < 60 ? 'nearly there' : devClock <= 95 ? 'pull it now, or soon' : devClock <= 150 ? 'well past: it will not get blacker' : 'fogging: the whites are greying'
  const targetById = id => [...frame.targets, frame.secret].filter(Boolean).find(x => x.id === id)
  const inStrip = r => {
    if (kindNow !== 'strip') return true
    const c = neg?.centres?.[targetById(r.id).a]
    return !!c && c[1] >= S.stripTop && c[1] < S.stripTop + STRIP_H
  }
  const shownResults = judged ? judged.results.filter(r => (!r.secret || r.held) && inStrip(r)) : []
  const markers = phase === 'inspect' && judged && neg && kindNow === 'sheet'
    ? shownResults.map(r => {
      const c = neg.centres?.[targetById(r.id).a]
      return c ? { ...r, n: shownResults.indexOf(r) + 1, x: c[0] / W * 100, y: c[1] / H * 100 } : null
    }).filter(Boolean)
    : []
  const lookLabel = S.red ? 'Swing the red filter away' : 'Swing the red filter in'

  const conePath = lampOn || (S.red && !S.lights && station === 'easel')

  return (
    <div
      ref={rootRef}
      className={`sl-root phase-${phase} station-${station} ${S.lights ? 'is-lit' : 'is-dark'} ${reduced ? 'is-reduced' : ''} ${lampOn ? 'lamp-on' : ''}`}
      data-testid="safe-light"
    >
      <div className="sl-safelamp" aria-hidden="true"><span /></div>

      <header className="sl-head">
        <div className="sl-nav"><ExperimentNav currentCategory={category?.slug} currentExperiment={experiment?.slug} /></div>
        <div className="sl-title">
          <span className="sl-name">safe.light()</span>
          <span className="sl-sub"><span className="sl-long">frame </span>{frame.frame} · {frame.title}</span>
        </div>
        <div className="sl-head-tools">
          <span className="sl-box" data-testid="sl-paper" title="Sheets left in the paper box">
            <svg viewBox="0 0 24 18" aria-hidden="true"><rect x="1" y="4" width="22" height="13" rx="1" /><path d="M1 7h22M6 4V1h12v3" /></svg>
            {sheetsLabel(S.paper)} <small>sheets</small>
          </span>
          <button type="button" className={`sl-icon ${S.lights ? 'is-on' : ''}`} onClick={toggleLights} aria-pressed={S.lights} aria-label="Room light" data-playground-action="lights" data-testid="sl-lights" disabled={phase === 'title' || phase === 'ending'}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.6 1 2.5h6c0-.9.2-1.7 1-2.5A6 6 0 0 0 12 3z" /></svg>
          </button>
          <button type="button" className="sl-icon" onClick={() => setMuted(v => !v)} aria-pressed={muted} aria-label={muted ? 'Unmute' : 'Mute'} data-testid="sl-mute">
            {muted ? '♪̸' : '♪'}
          </button>
          <button type="button" className="sl-icon" onClick={() => setHelp(true)} aria-label="How to print" data-testid="sl-help">?</button>
        </div>
      </header>

      <main className="sl-main">
        <div className="sl-left">
        <section className="sl-line" aria-label="Drying line">
          <div className="sl-wire" aria-hidden="true" />
          {ROLL.map((f, i) => {
            const h = S.hung.find(x => x.frame === i)
            return (
              <figure key={f.id} className={`sl-hung ${h ? 'is-hung' : ''}`}>
                <span className="sl-peg" aria-hidden="true" />
                {h ? <img src={h.thumb} alt={`Print of frame ${f.frame}, ${f.title}`} /> : <span className="sl-empty">{f.frame}</span>}
                <figcaption>{h ? `${f.frame} · ${h.held.length}/3${h.secret ? ' ★' : ''}` : <>{f.frame}<span className="sl-long"> · {f.title}</span></>}</figcaption>
              </figure>
            )
          })}
        </section>
        <section
          className="sl-stage"
          data-playground-surface
          data-testid="sl-stage"
          aria-label={inTray ? 'Developing trays' : 'Enlarger and easel'}
        >
          <div className="sl-room" aria-hidden="true" />
          {/* enlarger */}
          <div className="sl-enlarger" aria-hidden="true">
            <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMax meet">
              <defs>
                <linearGradient id="sl-cone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={lampOn ? '#fff1c2' : '#ff3a1e'} stopOpacity={lampOn ? 0.55 : 0.32} />
                  <stop offset="1" stopColor={lampOn ? '#fff1c2' : '#ff3a1e'} stopOpacity="0.03" />
                </linearGradient>
              </defs>
              <rect x="356" y="0" width="12" height="200" className="sl-column" />
              <rect x="300" y="38" width="76" height="16" rx="3" className="sl-carriage" />
              <path d="M140 18 h120 l-8 46 h-104 z" className="sl-head-body" />
              <rect x="150" y="8" width="100" height="12" rx="4" className="sl-head-cap" />
              <path d="M160 64 h80 l-6 8 h-68 z M166 72 h68 l-5 8 h-58 z M171 80 h58 l-4 8 h-50 z M175 88 h50 l-4 8 h-42 z" className="sl-bellows" />
              <rect x="184" y="96" width="32" height="20" rx="3" className="sl-lens" />
              <rect x={S.red ? 178 : 220} y="116" width="44" height="8" rx="2" className={`sl-redfilter ${S.red ? 'is-in' : ''}`} />
              <rect x="232" y="24" width="20" height="8" rx="1" className={`sl-drawer g${S.grade}`} />
              <path d="M254 28h22" className="sl-cable" />
              {conePath && <path d="M186 118 L0 200 L400 200 L214 118 Z" fill="url(#sl-cone)" className="sl-cone" />}
            </svg>
          </div>
          <div className="sl-easel" aria-hidden="true" />
          {/* tray */}
          <div
            className={`sl-tray tray-${station}`}
            ref={trayRef}
            onPointerDown={inTray ? onTrayDown : undefined}
            onPointerMove={inTray ? onTrayMove : undefined}
            onPointerUp={inTray ? onTrayUp : undefined}
            onPointerCancel={inTray ? onTrayUp : undefined}
            data-testid="sl-tray"
            aria-hidden={!inTray}
          >
            <div className="sl-liquid" style={{ '--slosh': S.rocking > 0 ? 1 : 0 }} />
            <span className="sl-tray-label">{station === 'dev' ? 'DEVELOPER' : station === 'stop' ? 'STOP' : 'FIXER'}</span>
          </div>

          <div
            className={`sl-paper kind-${kindNow} ${S.rocking > 0 && inTray ? 'is-rocking' : ''}`}
            onPointerDown={station === 'easel' ? onEaselDown : onTrayDown}
            onPointerMove={station === 'easel' ? onEaselPointer : onTrayMove}
            onPointerUp={station === 'easel' ? undefined : onTrayUp}
            onPointerLeave={station === 'easel' ? onEaselLeave : undefined}
            data-testid="sl-easel"
          >
            <canvas ref={paperRef} className="sl-canvas" width={W} height={H} aria-label={`Print of frame ${frame.frame}, ${frame.title}`} role="img" />
            {station === 'easel' && kindNow === 'sheet' && S.tool !== 'none' && S.toolLive && (
              <svg className={`sl-tool tool-${S.tool}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
                {S.tool === 'dodge'
                  ? (
                    <g>
                      <line x1={S.tx} y1={S.ty} x2={S.tx > W / 2 ? W + 20 : -20} y2={S.ty + 6} className="sl-wirewand" />
                      <circle cx={S.tx} cy={S.ty} r={S.toolR} className="sl-dodger" />
                    </g>
                    )
                  : (
                    <path
                      className="sl-card"
                      fillRule="evenodd"
                      d={`M-6 -6 H${W + 6} V${H + 6} H-6 Z M${S.tx - S.toolR} ${S.ty} a${S.toolR} ${S.toolR} 0 1 0 ${S.toolR * 2} 0 a${S.toolR} ${S.toolR} 0 1 0 ${-S.toolR * 2} 0 Z`}
                    />
                    )}
              </svg>
            )}
            {station === 'easel' && kindNow === 'strip' && (
              <div className="sl-strip-guide" style={{ top: `${S.stripTop / H * 100}%`, height: `${STRIP_H / H * 100}%` }}>
                {Array.from({ length: STEPS }, (_, i) => <span key={i} className={stripStep && i >= STEPS - stripStep ? 'is-lit' : ''} />)}
              </div>
            )}
            {phase === 'inspect' && kindNow === 'strip' && lastStrip && (
              <div className="sl-strip-labels" style={{ top: `${S.stripTop / H * 100}%`, height: `${STRIP_H / H * 100}%` }}>
                {Array.from({ length: STEPS }, (_, i) => <span key={i}>{lastStrip.step * (i + 1)}s</span>)}
              </div>
            )}
            {markers.map(m => (
              <span key={m.id} className={`sl-mark ${m.held ? 'is-held' : 'is-lost'} ${m.secret ? 'is-secret' : ''}`} style={{ left: `${m.x}%`, top: `${m.y}%` }} title={m.label}>
                <i />
                <b>{m.n}</b>
              </span>
            ))}
            {S.tool !== 'none' && station === 'easel' && !S.toolLive && kindNow === 'sheet' && (
              <span className="sl-tool-tip">hover or touch the easel to hold the {S.tool === 'dodge' ? 'dodger' : 'card'}</span>
            )}
          </div>

          {lampOn && (
            <div className="sl-lampclock" role="timer" aria-live="off">
              <b>{lampLeft.toFixed(1)}</b><small>s · grade {GRADES[S.lamp.grade].label}{S.lamp.kind === 'strip' ? ` · step ${stripStep}/${STEPS}` : ''}</small>
            </div>
          )}
          {inTray && phase !== 'inspect' && (
            <div className="sl-trayclock" role="timer">
              {station === 'dev' && <><b>{devClock}</b><small>s in developer · {devHint}</small></>}
              {station === 'stop' && <><b>{Math.round(S.stopT * CLOCK)}</b><small>s in stop bath</small></>}
              {station === 'fix' && <><b>{Math.round(S.fixT * CLOCK)}</b><small>s in fixer · {fixFrac < 1 ? 'still light-sensitive' : 'fixed: safe to look'}</small></>}
            </div>
          )}

          {phase === 'title' && (
            <div className="sl-cover">
              <p className="sl-kicker">void.laboratory · darkroom</p>
              <h1>safe.light()</h1>
              <p>A roll came back from somewhere with three frames on it, and a cat in every one. The negatives hold more than paper can. Print them anyway.</p>
              <p className="sl-cover-small">Swing filters, count seconds, shade the paper with your hand, then rock the tray while the picture comes up out of nothing.</p>
              <button type="button" className="sl-primary" onClick={begin} data-playground-primary data-testid="sl-begin" disabled={!ready}>
                {ready ? 'Switch off the room light' : 'Loading the negative'}
              </button>
            </div>
          )}

          {phase === 'ending' && (
            <div className="sl-ending" data-testid="sl-ending">
              <p className="sl-kicker">the line, in room light</p>
              <h2>{ending.title}</h2>
              <p>{ending.line}</p>
              <div className="sl-ending-prints">
                {ROLL.map((f, i) => {
                  const h = S.hung.find(x => x.frame === i)
                  return (
                    <figure key={f.id}>
                      {h ? <img src={h.thumb} alt={`Final print of frame ${f.frame}`} /> : <span className="sl-empty">not printed</span>}
                      <figcaption>
                        <b>{f.frame} · {f.title}</b>
                        {f.targets.map(t => <span key={t.id} className={h?.held.includes(t.id) ? 'is-held' : 'is-lost'}>{t.label}</span>)}
                        {h?.secret && <span className="is-held is-secret">{f.secret.label}</span>}
                      </figcaption>
                    </figure>
                  )
                })}
              </div>
              <button type="button" className="sl-primary" onClick={newRoll} data-playground-action="new-roll" data-testid="sl-new-roll">Load a fresh box and print the roll again</button>
            </div>
          )}
        </section>
        </div>

        <div className="sl-right">
        <aside className="sl-panel" aria-label="Darkroom controls">
          {station === 'easel' && phase !== 'ending' && (
            <div className="sl-controls" data-testid="sl-enlarger-controls">
              <div className="sl-group">
                <span className="sl-label">filter grade <kbd>0–5</kbd></span>
                <div className="sl-turret" role="radiogroup" aria-label="Contrast filter grade">
                  {GRADES.map(g => (
                    <button
                      key={g.id}
                      type="button"
                      role="radio"
                      aria-checked={S.grade === g.id}
                      className={`sl-grade g${g.id} ${S.grade === g.id ? 'is-on' : ''}`}
                      onClick={() => setGrade(g.id)}
                      disabled={lampOn}
                      data-playground-action="grade"
                    >{g.label}</button>
                  ))}
                </div>
                <span className="sl-note">{S.grade <= 1 ? 'soft: long scale, grey and gentle' : S.grade >= 4 ? 'hard: short scale, black and white' : 'normal contrast'}</span>
              </div>

              <div className="sl-group sl-timer-row">
                <span className="sl-label">timer <kbd>,</kbd><kbd>.</kbd></span>
                <div className="sl-timer">
                  <button type="button" className="sl-step" onClick={() => setTimer(S.timer - 1)} disabled={lampOn} aria-label="One second less" data-playground-action="timer-down">−</button>
                  <output className="sl-seconds" aria-live="polite">{S.timer}<small>s{kindNow === 'strip' ? ' a step' : ''}</small></output>
                  <button type="button" className="sl-step" onClick={() => setTimer(S.timer + 1)} disabled={lampOn} aria-label="One second more" data-playground-action="timer-up">+</button>
                  <button
                    type="button"
                    className={`sl-expose ${lampOn ? 'is-on' : ''}`}
                    onClick={toggleLamp}
                    disabled={!lampOn && !canExpose}
                    data-playground-action="expose"
                    data-testid="sl-expose"
                  >
                    {lampOn ? 'Cut the lamp' : kindNow === 'strip' ? `Expose strip ${S.timer}–${S.timer * STEPS}s` : `Expose ${S.timer}s`} <kbd>space</kbd>
                  </button>
                </div>
              </div>

              <div className="sl-group">
                <div className="sl-labelrow">
                  <span className="sl-label">in your hand <kbd>X</kbd></span>
                  <span className="sl-size">
                    <span className="sl-label">size <kbd>[</kbd><kbd>]</kbd></span>
                    <button type="button" className="sl-mini" onClick={() => sizeTool(-8)} aria-label="Smaller tool" disabled={S.tool === 'none'}>−</button>
                    <button type="button" className="sl-mini" onClick={() => sizeTool(8)} aria-label="Bigger tool" disabled={S.tool === 'none'}>+</button>
                  </span>
                </div>
                <div className="sl-seg" role="radiogroup" aria-label="Hand tool">
                  {[['none', 'Hands off', 'Off'], ['dodge', 'Dodger', 'Dodger'], ['burn', 'Burning card', 'Card']].map(([id, label, short]) => (
                    <button key={id} type="button" role="radio" aria-checked={S.tool === id} className={S.tool === id ? 'is-on' : ''} onClick={() => setTool(id)} disabled={kindNow === 'strip' && id !== 'none'} data-playground-action={`tool-${id}`} data-testid={`sl-tool-${id}`}><span className="sl-long">{label}</span><span className="sl-short">{short}</span></button>
                  ))}
                  <button type="button" className="sl-mini sl-inline" onClick={() => sizeTool(-8)} aria-label="Smaller tool" disabled={S.tool === 'none'}>−</button>
                  <button type="button" className="sl-mini sl-inline" onClick={() => sizeTool(8)} aria-label="Bigger tool" disabled={S.tool === 'none'}>+</button>
                </div>
                <span className="sl-note">{S.tool === 'dodge' ? 'holds light back: lighter where it hovers. Keep it moving or it leaves a halo.' : S.tool === 'burn' ? 'light only through the hole: darker there, the rest held back.' : 'the whole sheet sees the lamp'}</span>
              </div>

              <div className="sl-group sl-row">
                <div className="sl-seg" role="radiogroup" aria-label="Paper">
                  <button type="button" role="radio" aria-checked={kindNow === 'sheet'} className={kindNow === 'sheet' ? 'is-on' : ''} onClick={() => setKind('sheet')} disabled={S.sheetTaken} data-playground-action="kind-sheet"><span className="sl-long">Full sheet</span><span className="sl-short">Sheet</span></button>
                  <button type="button" role="radio" aria-checked={kindNow === 'strip'} className={kindNow === 'strip' ? 'is-on' : ''} onClick={() => setKind('strip')} disabled={S.sheetTaken} data-playground-action="kind-strip" data-testid="sl-strip"><span className="sl-long">Test strip</span><span className="sl-short">Strip</span> <kbd>T</kbd></button>
                </div>
                <button type="button" className={`sl-chip ${S.red ? 'is-on' : ''}`} onClick={toggleRed} disabled={lampOn} data-playground-action="red-filter" data-testid="sl-red"><span className="sl-long">{lookLabel}</span><span className="sl-short">{S.red ? 'Red filter out' : 'Red filter in'}</span> <kbd>F</kbd></button>
              </div>

              <div className="sl-group sl-row sl-go">
                <span className="sl-ledger" data-testid="sl-ledger">
                  {S.sheetTaken
                    ? (exposures.length ? exposures.map((x, i) => <span key={i}>{x.kind === 'strip' ? `strip ${x.seconds / STEPS}s×5` : `${x.seconds}s`} g{x.grade}{x.tool !== 'none' && x.kind !== 'strip' ? ` ${x.tool === 'dodge' ? 'dodged' : 'burnt'}` : ''}</span>) : 'sheet out of the box: nothing on it yet')
                    : 'paper still in the box'}
                </span>
                {S.sheetTaken && !lampOn && <button type="button" className="sl-chip" onClick={binSheet} data-playground-action="bin">Bin it</button>}
                <button type="button" className="sl-primary sl-dev-btn" onClick={toDev} disabled={!S.sheetTaken || lampOn || !exposures.length} data-playground-action="develop" data-testid="sl-develop">Into the developer <kbd>⏎</kbd></button>
              </div>
            </div>
          )}

          {inTray && phase !== 'inspect' && (
            <div className="sl-controls" data-testid="sl-tray-controls">
              <ol className="sl-trays" aria-label="Trays">
                {['dev', 'stop', 'fix'].map(t => <li key={t} className={station === t ? 'is-on' : ''}>{t === 'dev' ? 'developer' : t === 'stop' ? 'stop' : 'fixer'}</li>)}
              </ol>
              {station === 'dev' && (
                <>
                  <div className="sl-agitate">
                    <span className="sl-label">fresh developer at the paper</span>
                    <span className="sl-meter"><i style={{ width: `${Math.round(S.agitation * 100)}%` }} /></span>
                    <span className="sl-note">{S.agitation < 0.4 ? 'still tray: it develops in blotches' : 'rocking: even development'}</span>
                  </div>
                  <button type="button" className="sl-chip sl-big" onClick={() => rock(0.7)} data-playground-action="rock" data-testid="sl-rock">Rock the tray <kbd>R</kbd></button>
                  <button type="button" className="sl-primary" onClick={toStop} data-playground-action="to-stop" data-testid="sl-to-stop">Tongs: into the stop <kbd>⏎</kbd></button>
                  <span className="sl-note">The picture comes up shadows first. The whites arrive last; pull too soon and the print is grey mud.</span>
                </>
              )}
              {station === 'stop' && (
                <button type="button" className="sl-primary" onClick={toFix} disabled={S.stopT < STOP_REAL} data-playground-action="to-fix" data-testid="sl-to-fix">{S.stopT < STOP_REAL ? 'Stopping…' : <>Into the fixer <kbd>⏎</kbd></>}</button>
              )}
              {station === 'fix' && (
                <>
                  <span className="sl-meter"><i style={{ width: `${Math.round(fixFrac * 100)}%` }} /></span>
                  <button type="button" className={`sl-primary ${fixFrac < 1 ? 'is-risky' : ''}`} onClick={toggleLights} data-playground-action="lights-on" data-testid="sl-lights-on">{fixFrac < 1 ? 'Lights on now (not fixed yet)' : 'Lights on: look at it'} <kbd>L</kbd></button>
                </>
              )}
            </div>
          )}

          {phase === 'inspect' && judged && (
            <div className="sl-controls sl-verdict" data-testid="sl-verdict">
              <span className="sl-label">{kindNow === 'strip' ? 'test strip, in room light' : 'the print, in room light'}</span>
              {kindNow === 'strip' && S.stripRead && (
                <StripReading read={S.stripRead} step={lastStrip?.step || S.timer} />
              )}
              <ul className="sl-results" hidden={kindNow === 'strip'}>
                {shownResults.map((r, i) => (
                  <li key={r.id} className={`${r.held ? 'is-held' : 'is-lost'} ${r.secret ? 'is-secret' : ''}`}>
                    <b className="sl-num">{i + 1}</b> {r.label} <small>{r.held ? `held · ${r.sep.toFixed(2)} apart` : `${r.why}: ${ADVICE[r.why]}`}</small>
                  </li>
                ))}
              </ul>
              <span className="sl-note" hidden={kindNow === 'strip'}>
                {judged.fullScale ? 'Paper white and a real black, both on the sheet.' : judged.black < 1.5 ? 'No true black anywhere: the print looks grey. More time, or a harder grade.' : judged.white > 0.3 ? 'No paper white: highlights are veiled. Less time, or burn only where needed.' : 'Nearly a full scale.'}
                {S.sheet.fog > 0.05 ? ' Room light reached it before the fixer finished.' : ''}
              </span>
              <div className="sl-row">
                {kindNow === 'sheet' && <button type="button" className="sl-primary" onClick={hang} data-playground-action="hang" data-testid="sl-hang">Peg it on the line <kbd>⏎</kbd></button>}
                <button type="button" className="sl-chip" onClick={backToEasel} data-playground-action="next-sheet" data-testid="sl-next-sheet">{kindNow === 'strip' ? 'Back to the enlarger' : 'Bin it, print again'} <kbd>N</kbd></button>
              </div>
              {S.paper === 0 && <button type="button" className="sl-chip" onClick={endEarly} data-playground-action="end">Box is empty: show the line</button>}
            </div>
          )}

        </aside>
        {phase !== 'ending' && (
          <aside className="sl-brief" aria-label="Contact sheet and brief">
              <div className="sl-contact" role="radiogroup" aria-label="Contact sheet">
                {ROLL.map((f, i) => (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={S.frame === i}
                    className={`sl-frame ${S.frame === i ? 'is-on' : ''} ${S.hung.some(h => h.frame === i) ? 'is-done' : ''}`}
                    onClick={() => chooseFrame(i)}
                    disabled={phase !== 'easel' || S.sheetTaken || lampOn}
                    data-playground-action="frame"
                    aria-label={`Frame ${f.frame}: ${f.title}`}
                  >
                    <canvas ref={el => { thumbRefs.current[i] = el; if (el && S.negs[i] && !el.dataset.drawn) { drawNegativeThumb(el, S.negs[i]); el.dataset.drawn = '1' } }} />
                    <span>{f.frame}</span>
                  </button>
                ))}
              </div>
              <h3>{frame.frame} · {frame.title}</h3>
              <p>{frame.note}</p>
              <ul className="sl-wants">
                {frame.targets.map(t => {
                  const r = (judged && phase === 'inspect' && kindNow === 'sheet' ? judged.results.find(x => x.id === t.id) : null)
                  const h = hungFrame?.held.includes(t.id)
                  return <li key={t.id} className={r ? (r.held ? 'is-held' : 'is-lost') : h ? 'is-held' : ''}>{t.label}<small>{t.kind === 'high' ? 'highlight' : t.kind === 'low' ? 'shadow' : 'midtone'}</small></li>
                })}
              </ul>
              {lastStrip && <p className="sl-note">Last strip here: grade {lastStrip.grade}, {lastStrip.step}s steps ({lastStrip.step}–{lastStrip.step * STEPS}s).</p>}
              {S.paper <= 4 && S.hung.length < ROLL.length && phase === 'easel' && !S.sheetTaken && (
                <button type="button" className="sl-chip" onClick={endEarly} data-playground-action="end">Stop here and hang what you have</button>
              )}
          </aside>
        )}
        </div>
      </main>

      {toast && <div className={`sl-toast tone-${toast.tone}`} role="status" key={toast.id}>{toast.text}</div>}

      {help && (
        <div className="sl-help" role="dialog" aria-modal="true" aria-label="How to print">
          <div className="sl-help-card">
            <h2>How to make a print</h2>
            <ol>
              <li><b>Look.</b> With the red filter under the lens the frame is projected on the easel without exposing anything. Plan where the light should go.</li>
              <li><b>Test.</b> Cut a <em>test strip</em>: it gets five steps of the timer, from one step to five. Develop it like a print and read which step looks right.</li>
              <li><b>Expose.</b> Pick a filter grade (soft 0 to hard 5) and press expose. Exposures add up, so you can give a second exposure at another grade.</li>
              <li><b>Shade.</b> While the lamp is on, hold the <em>dodger</em> over shadows to keep them open, or the <em>burning card</em> to give highlights more. Drag on touch, arrows on a keyboard.</li>
              <li><b>Develop.</b> Rock the tray. The picture comes up shadows first. Pull at 60 to 90 seconds, stop it, fix it for 30, then turn the light on.</li>
            </ol>
            <p className="sl-note">Keys: <kbd>space</kbd> lamp, <kbd>0–5</kbd> grade, <kbd>,</kbd><kbd>.</kbd> timer, <kbd>X</kbd> tool, <kbd>[</kbd><kbd>]</kbd> size, <kbd>T</kbd> strip, <kbd>F</kbd> red filter, <kbd>⏎</kbd> next tray, <kbd>R</kbd> rock, <kbd>L</kbd> light, <kbd>M</kbd> mute.</p>
            <button type="button" className="sl-primary" ref={helpCloseRef} onClick={() => setHelp(false)}>Back to the dark</button>
          </div>
        </div>
      )}
    </div>
  )
}
