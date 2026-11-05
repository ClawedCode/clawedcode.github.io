import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  N, VOWELS, GROUPS, CONSONANTS, ROTTED_VOWELS, T_MIN, T_SPAN, freshArt, shapeTube, slewArt, createSpeaker, tongueLimit
} from './vox/articulate'
import { NO_VOWEL, VOWEL_MAP, classifyFrame, createListener, formants, hearVowel, nearestWord, phraseOf, rejoin, trueness, tubeResponse } from './vox/ear'
import {
  NIGHTS, REED, REED_NAMES, SEATS, WALTZ, WALTZ_BEAT, bellowsOn, closeRun, consider, currentNight, currentTask, epithet, freshRun,
  isOpen, lastLine, losePatience, scoreSong, swellOf
} from './vox/nights'
import { K, ROOF, createTheatre } from './vox/theatre'
import { createHallAudio } from './vox/hall-audio'
import './VoxHumana.css'

const SEASONS_KEY = 'vox-humana.seasons'
const PATIENCE = 42
const TALK_GAP = 0.55 // how long the hall waits after a finished thought
const PATIENT_GAP = 2.4 // and how long while the keys so far are the start of what it asked for
const ANSWER_GAP = 1.6
const FINE_SPAN = 72 // no muscle's whole range is ever squeezed into fewer pixels than this
const SECTION = 0.0515 // head units per tube section
const TONGUE_SPAN = 1.7 * K // head units from a flat tongue to the palate
const LIP_SPAN = 0.24
const HOME_REED = 2 // C3, a comfortable speaking pitch
// seats fill from the front and the middle outward
const SEAT_ORDER = [6, 5, 7, 4, 8, 3, 9, 18, 17, 19, 16, 20, 2, 10, 15, 21, 1, 11, 14, 22, 0, 12, 13, 23]

const readSeasons = () => {
  try {
    const raw = localStorage.getItem(SEASONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return [] // storage blocked or corrupt: the hall simply has no memory
  }
}
const writeSeasons = list => {
  try { localStorage.setItem(SEASONS_KEY, JSON.stringify(list)) } catch { /* private mode: the season still ends */ }
}

const log01 = (v, a, b) => (Math.log(v) - Math.log(a)) / (Math.log(b) - Math.log(a))
const chartX = f2 => 8 + 84 * log01(Math.max(560, Math.min(3200, f2)), 560, 3200)
const chartY = f1 => 8 + 84 * log01(Math.max(190, Math.min(1000, f1)), 190, 1000)

const freshStops = () => {
  const out = {}
  for (const v of VOWELS) out[v] = { ...ROTTED_VOWELS[v] }
  return out
}

// What a given stop really sounds like tonight, damp and all.
function judgeStop(stop, swell, tmp) {
  const art = { ...freshArt(), ...stop, voice: 1 }
  shapeTube(art, tmp, swell)
  const frame = classifyFrame(tmp, art, 1)
  if (frame.kind !== 'v') return { heard: frame.label || '?', vowelish: false, f1: 0, f2: 0, trueness: 0 }
  const { f1, f2 } = frame.fm
  if (frame.label === 'UH') return { heard: 'UH', vowelish: false, f1: 0, f2: 0, trueness: 0 }
  return { heard: hearVowel(f1, f2).vowel, vowelish: true, f1, f2 }
}

export default function VoxHumana() {
  const rootRef = useRef(null)
  const canvasRef = useRef(null)
  const drumRef = useRef(null)
  const cardRef = useRef(null)
  const slateRef = useRef(null)
  const manualRef = useRef(null)
  const earRef = useRef(null)
  const earDotRef = useRef(null)
  const earNumRef = useRef(null)
  const fuseRef = useRef(null)
  const fuseWordRef = useRef(null)
  const airRef = useRef(null)
  const tagTongueRef = useRef(null)
  const tagLipsRef = useRef(null)
  const plateRef = useRef(null)
  const rodRef = useRef(null)
  const sim = useRef(null)
  const toastN = useRef(0)

  const [phase, setPhase] = useState('intro') // intro | play | finale | end | open
  const [reduced, setReduced] = useState(false)
  const [muted, setMuted] = useState(false)
  const [noSound, setNoSound] = useState(false)
  const [noGl, setNoGl] = useState(false)
  const [cardHidden, setCardHidden] = useState(false)
  const [seasons, setSeasons] = useState(readSeasons)
  const [toast, setToast] = useState(null)
  const [live, setLive] = useState('')
  const [hud, setHud] = useState(() => ({
    night: 0, task: 0, seats: 4, proven: {}, heard: '', heardTone: 'idle', opening: NIGHTS[0].opening,
    stops: VOWELS.map(v => ({ v, heard: '?', trueness: 0, ok: false })),
    pin: null, reed: HOME_REED, songOn: false, heardLabel: 'the hall heard', touchedLips: false, log: [], understood: 0, misheard: 0, answer: null, lastLine: null, epithet: '',
    advice: '', interlude: null, pulled: null, touched: false, confirmRestart: false, air: 1
  }))

  const say = useCallback((text, tone = 'info', ms = 3600) => {
    toastN.current++
    const id = toastN.current
    setToast({ id, text, tone })
    setLive(text)
    setTimeout(() => setToast(t => (t && t.id === id ? null : t)), ms)
  }, [])

  // ---------------------------------------------------------------- engine
  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    const isReduced = q.matches
    setReduced(isReduced)
    // a fresh canvas per mount: cleanup force-loses the context, which is permanent
    const canvas = document.createElement('canvas')
    canvas.className = 'vh-gl'
    canvasRef.current.appendChild(canvas)
    const theatre = createTheatre(canvas, { reduced: isReduced })
    if (!theatre.ok) setNoGl(true)
    const audio = createHallAudio()
    const stops = freshStops()
    const speaker = createSpeaker(stops)
    const listener = createListener()
    const s = {
      theatre, audio, stops, speaker, listener,
      run: freshRun(),
      phase: 'intro',
      art: { ...freshArt(), tx: 0.46, ty: 0.3, lips: 0.6 },
      hand: { tx: 0.46, ty: 0.3, lips: 0.6, vel: 0 },
      T: { ...freshArt() },
      d: new Float32Array(N),
      tmp: new Float32Array(N),
      energy: new Float32Array(N),
      seatsV: new Float32Array(SEATS),
      f0: REED[HOME_REED],
      reed: HOME_REED,
      reedHeld: 0,
      handVoice: false,
      grab: null,
      arrows: { left: false, right: false, up: false, down: false },
      air: 1,
      pump: 0,
      usedHand: false,
      played: [],
      idle: 0,
      swell: 0,
      eye: 0,
      eyeT: 0,
      house: 0.82,
      houseT: 1,
      rain: 0,
      flash: 0,
      warn: 0,
      level: 0,
      t: 0,
      cue: null,
      song: null,
      finale: null,
      ranOut: false,
      handles: 1,
      fuse: 0,
      interlude: null,
      interludeTimer: 0,
      dprScale: 1,
      slow: 0,
      slowN: 0,
      stopList: [],
      fx: { hotT: 0, hotL: 0 },
      frame: 0,
      last: performance.now(),
      alive: true,
      timers: new Set()
    }
    sim.current = s
    speaker.target.lips = 0.6

    const later = (fn, ms) => {
      const id = setTimeout(() => { s.timers.delete(id); fn() }, ms)
      s.timers.add(id)
      return id
    }
    s.later = later

    const layoutNow = () => {
      const root = rootRef.current
      if (!root) return
      const w = root.clientWidth
      const h = root.clientHeight
      const land = w > h * 1.05
      const slateBox = slateRef.current ? slateRef.current.getBoundingClientRect() : { bottom: 0 }
      const manualBox = manualRef.current ? manualRef.current.getBoundingClientRect() : { top: h }
      const top = land ? 16 : slateBox.bottom + 4
      const pitBand = Math.max(44, Math.min(82, h * 0.078))
      const bottom = manualBox.top - pitBand
      const span = 1.46 + 1.86
      const maxW = land ? w * 0.56 : w - 62
      const headS = Math.max(70, Math.min((bottom - top) / span, maxW / 2.18))
      const cx = land ? w * 0.54 : w * 0.5 - 16
      const cy = top + 1.46 * headS + Math.max(0, (bottom - top - span * headS) * 0.5)
      const dpr = Math.min(window.devicePixelRatio || 1, w * h > 1400000 ? 1 : 1.5) * s.dprScale
      s.goal = { w, h, dpr, cx, cy, s: headS, pitTop: manualBox.top - pitBand + 4, pitBottom: manualBox.top + 6 }
      if (!s.shown || isReduced || s.shown.w !== w || s.shown.h !== h) placeHead(s.goal)
      else placeHead({ ...s.goal, cx: s.shown.cx, cy: s.shown.cy, s: s.shown.s })
      if (rodRef.current) {
        const rh = rodRef.current.offsetHeight
        const stageTop = land ? 12 : slateBox.bottom + 4
        const stageBottom = manualBox.top - 4
        rodRef.current.style.top = `${Math.max(stageTop, (stageTop + stageBottom - rh) * 0.5 - (land ? 0 : 8))}px`
      }
      const drum = drumRef.current
      if (drum) {
        const r = drum.getBoundingClientRect()
        const pw = Math.max(2, Math.floor(r.width))
        const ph = Math.max(2, Math.floor(r.height))
        if (drum.width !== pw || drum.height !== ph) {
          drum.width = pw
          drum.height = ph
          const g = drum.getContext('2d')
          g.fillStyle = '#0a0806'
          g.fillRect(0, 0, pw, ph)
        }
      }
    }
    s.layoutNow = layoutNow
    layoutNow()
    const ro = new ResizeObserver(layoutNow)
    s.ro = ro
    ro.observe(rootRef.current)

    // Everything that hangs off the head follows it through one call.
    function placeHead(l) {
      s.shown = l
      theatre.resize({ ...l, foot: l.cy + 1.85 * l.s })
      if (earRef.current) {
        const size = Math.max(l.h < 500 ? 62 : 96, Math.min(0.86 * l.s, 210))
        const [ex, ey] = theatre.cssFromHead(-0.32, 0.5)
        earRef.current.style.width = `${size}px`
        earRef.current.style.height = `${size}px`
        earRef.current.style.transform = `translate(${ex - size / 2}px, ${ey - size / 2}px)`
      }
      if (plateRef.current) {
        const [px, py] = theatre.cssFromHead(-0.1, -1.76)
        plateRef.current.style.transform = `translate(calc(${px}px - 50%), calc(${py}px - 50%))`
        plateRef.current.style.fontSize = `${Math.max(8, l.s * 0.052)}px`
      }
    }

    const drawDrum = () => {
      const drum = drumRef.current
      if (!drum) return
      const g = drum.getContext('2d')
      const w = drum.width
      const h = drum.height
      if (w < 4 || h < 4) return
      const song = s.song
      const edge = song ? Math.floor(w * 0.72) : w
      g.drawImage(drum, 2, 0, edge - 2, h, 0, 0, edge - 2, h)
      // measured when sound is running; otherwise the tube's own computed response
      const measuring = s.t - (s.lastAir ?? -9) < 0.4
      const spec = measuring ? audio.readSpectrum() : null
      const binHz = audio.binHz
      let live = null
      let liveTop = 1
      if (!spec && s.art.voice > 0.05 && s.press > 0.05) {
        live = tubeResponse(s.d)
        liveTop = Math.max(...live) || 1
      }
      for (let y = 0; y < h; y++) {
        const hz = 90 * Math.pow(5000 / 90, 1 - y / h)
        let v = 0
        if (spec) v = spec[Math.min(spec.length - 1, Math.round(hz / binHz))] / 255
        else if (live) {
          const b = Math.max(0, Math.min(163, Math.round((hz - 100) / 25)))
          v = (0.34 + 0.66 * Math.sqrt(live[b] / liveTop)) * s.art.voice * s.press
        }
        v = Math.max(0, (v - 0.34) * 1.65)
        const c = Math.floor(10 + v * 225)
        g.fillStyle = `rgb(${c},${Math.floor(8 + v * v * 200)},${Math.floor(6 + v * v * v * 150)})`
        g.fillRect(edge - 2, y, 2, 1)
      }
      const card = cardRef.current
      if (!card) return
      if (card.width !== w || card.height !== h) {
        card.width = w
        card.height = h
      }
      const c = card.getContext('2d')
      c.clearRect(0, 0, w, h)
      if (!song) return
      // the punched card: holes arrive from the right on the reed's own lines
      const strike = edge
      c.fillStyle = '#17110a'
      c.fillRect(strike, 0, w - strike, h)
      const px = (w - strike) / 2.4
      c.textBaseline = 'middle'
      c.font = '10px ui-monospace, Menlo, monospace'
      const row = h / REED.length
      for (let i = 1; i < REED.length; i++) {
        c.fillStyle = 'rgba(230,190,110,0.14)'
        c.fillRect(strike, row * i, w - strike, 1)
      }
      for (const n of song.notes) {
        const x = strike + (n.at - song.t) * px
        const nw = n.dur * px - 2
        if (x > w || x + nw < strike) continue
        const y = row * n.rung
        const isNow = song.t >= n.at && song.t < n.at + n.dur
        const left = Math.max(strike, x)
        c.fillStyle = isNow ? '#ffdf94' : '#c9a15a'
        c.fillRect(left, y + 1.5, Math.max(1, x + nw - left), Math.max(3, row - 3))
        if (x >= strike) {
          c.fillStyle = '#20150a'
          c.fillText(n.syl, x + 3, y + row / 2)
        }
      }
      // the line, and where the reed is right now
      c.fillStyle = 'rgba(255,225,160,0.95)'
      c.fillRect(strike - 1, 0, 2, h)
      c.fillRect(strike - 7, row * s.reed + 1.5, 7, Math.max(3, row - 3))
    }

    const pushHud = patch => setHud(h => ({ ...h, ...patch }))
    s.pushHud = pushHud

    const refreshStops = () => {
      const list = VOWELS.map(v => {
        const j = judgeStop(stops[v], s.swellT ?? 0, s.tmp)
        const tr = j.vowelish ? trueness(j.f1, j.f2, v) : 0
        return { v, heard: j.heard, trueness: tr, ok: j.heard === v, f1: j.f1, f2: j.f2 }
      })
      s.stopList = list
      pushHud({ stops: list })
      return list
    }
    s.refreshStops = refreshStops

    const refreshPin = () => {
      const art = { ...freshArt(), ...s.hand, voice: 1, vel: 0 }
      shapeTube(art, s.tmp, s.swellT ?? 0)
      const frame = classifyFrame(s.tmp, art, 1)
      const pin = frame.kind === 'v'
        ? (() => {
            const h = hearVowel(frame.fm.f1, frame.fm.f2)
            return { vowel: h.dist < NO_VOWEL ? h.vowel : null, f1: frame.fm.f1, f2: frame.fm.f2, trueness: trueness(frame.fm.f1, frame.fm.f2, h.vowel) }
          })()
        : { vowel: null, f1: 0, f2: 0, trueness: 0 }
      s.pinNow = pin
      pushHud({ pin })
    }
    s.refreshPin = refreshPin

    const applyNight = (run, announce = true, closing = '') => {
      const night = currentNight(run)
      s.swellT = swellOf(run)
      const wasRain = s.rainOn
      s.rainOn = night.id === 'rain'
      if (s.rainOn !== wasRain) audio.setRain(s.rainOn)
      if (bellowsOn(run) && s.air > 0.9) s.air = 0.9
      if (night.id === 'song') s.air = 1
      refreshStops()
      refreshPin()
      if (announce && run.night > 0) {
        s.houseT = 0.28
        s.interlude = night
        s.listener.drain()
        s.played = []
        s.speaker.releaseAll()
        pushHud({ interlude: { numeral: night.numeral, title: night.title, opening: night.opening, closing } })
        s.interludeTimer = later(s.endInterlude, 4400)
      }
      pushHud({ opening: night.opening, night: run.night, task: run.task, heard: '', heardTone: 'idle', heardLabel: 'the hall heard', advice: '' })
    }
    s.applyNight = applyNight
    s.endInterlude = () => {
      if (!s.interlude) return
      const night = s.interlude
      s.interlude = null
      clearTimeout(s.interludeTimer)
      s.timers.delete(s.interludeTimer)
      s.houseT = night.id === 'last' ? 0.55 : 1
      pushHud({ interlude: null })
      layoutNow()
    }

    const snapshot = extra => ({
      night: s.run.night,
      task: s.run.task,
      seats: s.run.seats,
      proven: { ...s.run.proven },
      log: s.run.log.slice(),
      understood: s.run.understood,
      misheard: s.run.misheard,
      answer: s.run.answer,
      ...extra
    })
    s.snapshot = snapshot

    const adviceFor = keys => {
      const list = refreshStops()
      for (const l of list) {
        if (keys.includes(l.v) && !l.ok) {
          if (l.heard === 'UH') return `your ${l.v} stop has drifted where no vowel lives. shape it again and pin it.`
          return l.heard.length === 1 && 'AEIOU'.includes(l.heard)
            ? `your ${l.v} stop is sitting in ${l.heard}'s country. shape it again and pin it.`
            : `your ${l.v} stop pinches shut. open the throat a little and pin it again.`
        }
      }
      return ''
    }

    const evaluate = () => {
      const groups = rejoin(listener.drain())
      const usedHand = s.usedHand
      s.usedHand = false
      s.idle = 0
      const words = groups.map(g => nearestWord(g))
      if (!words.length) {
        s.played = []
        return
      }
      const task = currentTask(s.run)
      const soundString = groups.flat().join('')
      const ranOut = s.ranOut
      s.ranOut = false
      const played = s.played
      if (s.phase !== 'open' && usedHand && played.length === 0) {
        // shaping and humming are how you find a sound. nobody writes down a rehearsal.
        const whole = phraseOf(words)
        const text = whole.length > 16 ? `…${whole.replace(/"/g, '').slice(-14)}` : whole
        // the how-to stays up while shaping, which is exactly when it is needed
        pushHud({ heard: text, heardTone: 'info', heardLabel: 'in rehearsal, it sounds like', advice: task.hint ? '' : 'nobody scores a rehearsal. only the keys are on the record.' })
        setLive(`In rehearsal it sounds like ${text}.`)
        return
      }
      const target = task.say ? task.say.replace(/\s+/g, '') : ''
      const soFar = played.join('')
      if (target && soFar.length > 0 && soFar.length < target.length && target.startsWith(soFar)) {
        s.played = []
        pushHud({ heard: phraseOf(words), heardTone: 'info', heardLabel: 'all they caught was', advice: ranOut || s.air < 0.1 ? 'the bellows gave out in the middle of the word. pump, then play it again.' : 'the hall waited for the rest of the word, then lost the start of it. nothing lost: play it again, a little quicker.' })
        setLive('The hall lost the start of the word. Play it again a little quicker.')
        return
      }
      if (s.phase === 'open') {
        const text = phraseOf(words)
        s.played = []
        pushHud({ heard: text, heardTone: 'info', advice: '' })
        setLive(`The hall heard: ${text}`)
        return
      }
      const before = s.run.night
      s.played = []
      const playedVowels = played.filter(k => VOWELS.includes(k))
      const clarity = playedVowels.length ? Math.min(...playedVowels.map(v => (s.stopList.find(l => l.v === v) || { trueness: 1 }).trueness)) : 1
      const res = consider(s.run, words, { usedHand, soundString, played, clarity })
      let advice = ''
      if (res.needStops) advice = 'that is the sound. now pin it to its stop and play the stop: the prize is for stops.'
      else if (res.wrongStop) advice = `you pulled the ${res.wrongStop.played} stop and they heard ${res.wrongStop.heard}. it has rotted: drag a true ${res.wrongStop.played} out of the tongue and lips, then pin it.`
      else if (!res.hit && task.say) {
        advice = adviceFor(task.say)
        if (ranOut) advice = 'the bellows ran out in the middle of it. pump before you speak.'
      } else if (task.kind === 'vowels' && !res.hit) {
        const single = words.length === 1 ? words[0].sounds[0] : null
        if (single && s.run.proven[single]) advice = `they have already written down ${single}.`
        else advice = 'one vowel at a time, from a stop. the dial in the skull shows what they will hear.'
      }
      if (res.hit && !res.proven && !res.nightUp) advice = res.clear ? 'true vowels: it reached the back row, and a seat fills.' : 'they got it, near enough, but not the back row. truer stops would fill seats.'
      pushHud(snapshot({ heard: res.text, heardTone: res.hit ? 'hit' : res.tone === 'info' || res.tone === 'answer' ? 'info' : 'miss', heardLabel: res.tone === 'answer' ? 'you told them' : 'the hall heard', advice }))
      setLive(`The hall heard: ${res.text}. ${advice}`)
      audio.setSeats(s.run.seats)
      if (res.hit) audio.applause(s.run.seats, res.nightUp ? 1.25 : 0.55)
      else if (res.seatsDelta < 0) {
        if (Math.random() < 0.55) audio.laugh()
        else audio.creak()
      }
      if (res.gaveUp) say('the hall has lost interest in that word. it moves on, thinner.', 'miss')
      if (res.emptied) say('the last of them has gone. the lease is paid through tonight anyway.', 'miss', 5200)
      if (res.answered) {
        beginFinale()
        return
      }
      if (s.run.night !== before) {
        applyNight(s.run, true, res.emptied ? '' : `they wrote down: ${res.text}`)
        pushHud(snapshot({ opening: currentNight(s.run).opening, heard: '', heardTone: 'idle', heardLabel: 'the hall heard', advice: '' }))
      }
    }
    s.evaluate = evaluate

    const beginFinale = () => {
      s.phase = 'finale'
      setPhase('finale')
      s.endInterlude()
      s.houseT = 0.14
      const line = lastLine(s.run)
      s.finale = { stage: 'wait', line }
      s.speaker.clear()
      s.air = 1
      s.f0 = REED[HOME_REED]
      s.reed = HOME_REED
      s.reedHeld = 0
      s.hand = { ...s.hand, vel: 0 }
      pushHud({ reed: HOME_REED, advice: '' })
      later(() => {
        pushHud({ opening: line.full ? 'nobody is at the keys.' : 'nobody is at the keys, or in the seats.' })
        s.finale.stage = 'speak'
        s.eyeT = 0.16
        speaker.say(line.keys)
        s.finale.started = s.t
      }, 3400)
    }

    const endFinale = () => {
      const groups = rejoin(listener.drain())
      const heard = phraseOf(groups.map(g => nearestWord(g))) || 'nothing anyone could write down'
      closeRun(s.run, heard)
      s.finale.stage = 'done'
      s.eyeT = 1
      audio.applause(s.run.seats, 0.25)
      const ep = epithet(s.run)
      pushHud(snapshot({ heard, heardTone: 'machine', heardLabel: 'nobody played this:', lastLine: heard, epithet: ep }))
      setLive(`The machine said, with nobody at the keys: ${heard}.`)
      later(() => {
        if (!s.alive) return
        const season = { seats: s.run.seats, last: heard, ep, understood: s.run.understood, misheard: s.run.misheard }
        const next = [season, ...readSeasons()].slice(0, 6)
        writeSeasons(next)
        setSeasons(next)
        s.phase = 'end'
        setPhase('end')
      }, 3400)
    }

    const showAir = () => {
      const air = s.air
      if (airRef.current) airRef.current.style.transform = `scaleY(${Math.max(0, Math.min(1, air))})`
    }

    const updateEar = () => {
      const a = s.art
      const open = classifyFrame(s.d, { ...a, voice: Math.max(a.voice, 1), asp: 0 }, 1)
      let fm = open.fm
      if (!fm) fm = formants(s.d)
      if (earDotRef.current) {
        const live = fm.f1 && open.kind === 'v'
        earDotRef.current.setAttribute('cx', live ? chartX(fm.f2).toFixed(1) : '50')
        earDotRef.current.setAttribute('cy', live ? chartY(fm.f1).toFixed(1) : '50')
        earDotRef.current.setAttribute('opacity', live ? '1' : '0.25')
      }
      if (earNumRef.current) earNumRef.current.textContent = open.kind === 'v' ? `${Math.round(fm.f1)} · ${Math.round(fm.f2)} Hz` : (open.label || 'shut')
    }

    const stepSong = dt => {
      const song = s.song
      song.t += dt
      while (song.next < song.notes.length && song.t >= song.notes[song.next].at - 0.02) {
        const n = song.notes[song.next]
        speaker.sing(n.syl, n.dur * 1000 - 18)
        song.next++
      }
      const now = song.notes.find(n => song.t >= n.at && song.t < n.at + n.dur)
      if (now && s.art.voice > 0.3 && s.press > 0.2) {
        song.total += dt
        const off = Math.abs(Math.log2(s.f0 / now.hz))
        if (off < 0.05) song.good += dt
      } else if (now) {
        song.total += dt * 0.6
        if (s.press <= 0.2) song.dry += dt
      }
      if (song.t > song.end + 0.5) {
        s.song = null
        // a waltz has no gaps to hear words by: count how many times the name came through
        const sung = listener.drain().flat().join('')
        const names = (sung.match(/DE?I?ZI/g) || []).length
        const heard = names >= 2 ? 'daisy, daisy…' : names === 1 ? 'daisy…' : 'a waltz, no words anyone could swear to'
        s.played = []
        const frac = song.total > 0 ? song.good / song.total : 0
        const res = scoreSong(s.run, frac, heard)
        s.usedHand = false
        audio.setSeats(s.run.seats)
        if (res.pass) audio.applause(s.run.seats, frac > 0.8 ? 1.5 : 1)
        else if (res.gaveUp) audio.creak()
        else audio.cough()
        const dryFor = song.dry > 1.2 ? ` the bellows gave out for ${song.dry.toFixed(1)} s of it: pump more.` : ''
        const verdict = res.pass
          ? `${Math.round(frac * 100)}% in tune. they sang the last line with it.`
          : res.gaveUp
            ? `${Math.round(frac * 100)}% in tune. they clap anyway: it was a waltz in the sense that it went on.${dryFor}`
            : `${Math.round(frac * 100)}% in tune. someone hums it again, patiently. feed the card once more.${dryFor}`
        pushHud(snapshot({ heard, heardTone: res.pass ? 'hit' : 'miss', heardLabel: 'the hall heard', advice: verdict, songOn: false }))
        setLive(verdict)
        if (res.nightUp) later(() => { if (s.alive && s.phase === 'play') applyNight(s.run, true, verdict) }, 1600)
      }
    }
    s.stepSong = stepSong

    let raf = 0
    const frame = now => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - s.last) / 1000)
      s.last = now
      s.t += dt
      s.frame++
      const playing = s.phase === 'play' || s.phase === 'open' || s.phase === 'finale'
      // ease the head to its new place when the manual or slate changes size
      if (s.goal && s.shown) {
        const k = 1 - Math.exp(-dt / 0.16)
        const dS = s.goal.s - s.shown.s
        const dX = s.goal.cx - s.shown.cx
        const dY = s.goal.cy - s.shown.cy
        if (Math.abs(dS) > 0.05 || Math.abs(dX) > 0.1 || Math.abs(dY) > 0.1) {
          placeHead({ ...s.goal, s: s.shown.s + dS * k, cx: s.shown.cx + dX * k, cy: s.shown.cy + dY * k })
        }
      }
      // a phone that cannot hold the frame rate trades pixels for time, once it has had time to settle
      s.slow += dt
      s.slowN++
      if (s.slowN >= 90) {
        const mean = s.slow / s.slowN
        if (mean > 0.037 && s.dprScale > 0.55) {
          s.dprScale *= 0.8
          s.drops = (s.drops || 0) + 1
          layoutNow()
        } else if (mean < 0.02 && s.dprScale < 1 && (s.drops || 0) < 2) {
          s.dprScale = Math.min(1, s.dprScale * 1.25)
          layoutNow()
        }
        s.slow = 0
        s.slowN = 0
      }

      // arrow keys are a slow hand
      const ar = s.arrows
      if (ar.left || ar.right || ar.up || ar.down) {
        s.hand.tx = Math.max(0, Math.min(1, s.hand.tx + ((ar.right ? 1 : 0) - (ar.left ? 1 : 0)) * dt * 0.42))
        s.hand.ty = Math.max(0, Math.min(tongueLimit(s.hand.tx, s.swellT ?? 0), s.hand.ty + ((ar.up ? 1 : 0) - (ar.down ? 1 : 0)) * dt * 0.42))
        if (s.frame % 6 === 0) refreshPin()
      }
      if (s.song) stepSong(dt)

      const driving = speaker.update(dt)
      const voicing = (s.handVoice || s.reedHeld > 0) && !driving && !s.played.length && playing && s.phase !== 'finale'
      const T = s.T
      // mid-word, between two slow keys, the throat waits where the last sound left it; it only
      // relaxes back to the hand's shape once the hall has finished with the word
      const midWord = !driving && !voicing && s.played.length > 0
      if (driving) {
        Object.assign(T, speaker.target)
      } else if (midWord) {
        T.tx = speaker.target.tx
        T.ty = speaker.target.ty
        T.lips = Math.max(speaker.target.lips, 0.1)
        T.vel = 0
        T.tipD = 3
        T.tipI = 35
        T.back = 0
        T.voice = 0
        T.asp = 0
        T.rush = 1
      } else {
        T.tx = s.hand.tx
        T.ty = s.hand.ty
        T.lips = s.hand.lips
        T.vel = s.hand.vel
        T.tipD = 3
        T.tipI = 35
        T.back = 0
        T.voice = voicing ? 1 : 0
        T.asp = 0
        T.rush = 1
        speaker.target.tx = s.hand.tx
        speaker.target.ty = s.hand.ty
        speaker.target.lips = s.hand.lips
      }
      slewArt(s.art, T, dt)
      if (!s.traced && s.art.voice > 0.2) {
        s.traced = true
        s.pushHud({ traced: true })
      }
      s.swell += ((s.swellT ?? 0) - s.swell) * (1 - Math.exp(-dt / 0.8))
      shapeTube(s.art, s.d, s.swell)

      // bellows
      const speaking = (driving && !speaker.inGap) || voicing
      if (speaking && voicing) s.usedHand = true
      const bellows = bellowsOn(s.run) && s.phase !== 'finale'
      if (bellows) {
        if (speaking) {
          const rate = voicing ? 0.035 : 0.2 + 0.08 * s.art.asp
          s.air = Math.max(0, s.air - dt * rate)
          if (s.air <= 0) s.ranOut = true
        } else s.air = Math.min(1, s.air + dt * 0.004)
      } else s.air = Math.min(1, s.air + dt * 0.5)
      s.pump = Math.max(0, s.pump - dt * 4)
      const lung = Math.min(1, s.air / 0.18)
      const press = speaking ? lung : 0
      s.press = press
      s.warn += ((bellows && s.air < 0.28 ? 1 : 0) - s.warn) * (1 - Math.exp(-dt / 0.2))
      s.f0T = REED[s.reed] * (0.82 + 0.18 * lung) * (s.phase === 'finale' ? 0.84 : 1)
      s.f0 = s.f0 + (s.f0T - s.f0) * (1 - Math.exp(-dt / 0.03))

      audio.send({ d: s.d, vel: s.art.vel, f0: s.f0T, voice: s.art.voice, asp: s.art.asp, press })

      // the hall listens to everything that comes out
      const heardFrame = classifyFrame(s.d, s.art, press)
      listener.feed(heardFrame, dt)
      if (listener.spoken && !s.song && !speaking) {
        const task = currentTask(s.run)
        const soFar = s.played.join('')
        const target = task.say ? task.say.replace(/\s+/g, '') : ''
        let wait = TALK_GAP
        if (s.phase === 'play' && soFar) {
          if (target && soFar.length < target.length && target.startsWith(soFar)) wait = PATIENT_GAP
          else if (task.kind === 'answer') wait = ANSWER_GAP
        }
        s.fuse = Math.max(0, 1 - listener.quiet / wait)
        if (listener.quiet > wait) {
          s.fuse = 0
          if (s.phase === 'finale' && s.finale && s.finale.stage === 'speak') endFinale()
          else evaluate()
        }
      } else s.fuse = 0
      if (fuseRef.current) fuseRef.current.style.transform = `scaleX(${s.fuse.toFixed(3)})`
      if (fuseWordRef.current) fuseWordRef.current.style.opacity = s.fuse > 0 ? '1' : '0'
      // keys that produced no sound at all must not count toward the next attempt
      if (s.played.length && !speaking && !listener.spoken && !speaker.busy) {
        s.deadKeys = (s.deadKeys || 0) + dt
        if (s.deadKeys > 0.7) {
          s.played = []
          s.deadKeys = 0
        }
      } else s.deadKeys = 0
      if (s.finale && s.finale.stage === 'speak' && !driving && s.t - s.finale.started > 8) endFinale()

      // patience: a silent machine loses seats
      if (s.phase === 'play' && s.run.night > 0 && !speaking && !s.song && !s.grab) {
        s.idle += dt
        if (s.idle > PATIENCE) {
          s.idle = 0
          if (losePatience(s.run)) {
            audio.creak()
            audio.setSeats(s.run.seats)
            say('a seat creaks. someone has found their coat.', 'miss')
            pushHud(snapshot({}))
          }
        }
      } else s.idle = 0

      // air the shader can see
      if (audio.state.fresh) {
        s.energy.set(audio.state.energy)
        s.level += (Math.min(1, audio.state.level * 1.3) - s.level) * 0.35
        audio.state.fresh = false
        s.lastAir = s.t
      } else if (s.t - (s.lastAir ?? -9) > 0.4) {
        // no sound running (blocked, or no device): show the same breath without measuring it
        for (let i = 0; i < N; i++) s.energy[i] += (s.art.voice * press * 0.26 * (0.65 + 0.35 * Math.sin(i * 0.28)) - s.energy[i]) * 0.2
        s.level += (s.art.voice * press * 0.6 - s.level) * 0.2
      }

      // seats, lights, eye
      for (let i = 0; i < SEATS; i++) {
        const seat = SEAT_ORDER[i]
        const on = i < s.run.seats ? 1 : 0
        s.seatsV[seat] += (on - s.seatsV[seat]) * (1 - Math.exp(-dt / 0.45))
      }
      s.house += (s.houseT - s.house) * (1 - Math.exp(-dt / 0.9))
      s.rain += ((s.rainOn ? 1 : 0) - s.rain) * (1 - Math.exp(-dt / 1.1))
      if (s.rainOn && !isReduced && Math.random() < dt * 0.09) s.flash = 1
      s.flash *= Math.exp(-dt * 5)
      s.eye += (s.eyeT - s.eye) * (1 - Math.exp(-dt / (isReduced ? 0.06 : 0.55)))
      s.handles += ((s.phase !== 'finale' && s.phase !== 'end' ? 1 : 0) - s.handles) * (1 - Math.exp(-dt / 0.25))

      // where the handles sit on the live tract
      const idx = Math.max(1, Math.min(N - 2, T_MIN + T_SPAN * s.art.tx))
      const i0 = Math.floor(idx)
      const uf = idx - i0
      const rx = ROOF[i0][0] + (ROOF[i0 + 1][0] - ROOF[i0][0]) * uf
      const ry = ROOF[i0][1] + (ROOF[i0 + 1][1] - ROOF[i0][1]) * uf
      const tx = ROOF[i0 + 1][0] - ROOF[i0][0]
      const ty = ROOF[i0 + 1][1] - ROOF[i0][1]
      const tl = Math.hypot(tx, ty) || 1
      const dd = s.d[i0] + (s.d[i0 + 1] - s.d[i0]) * uf
      const hump = [rx + (ty / tl) * dd * K, ry - (tx / tl) * dd * K]
      const lt = ROOF[43][0] - ROOF[41][0]
      const lv = ROOF[43][1] - ROOF[41][1]
      const ll = Math.hypot(lt, lv) || 1
      const lipD = s.d[42]
      const lip = [ROOF[42][0] + (lv / ll) * lipD * K * 0.5, ROOF[42][1] - (lt / ll) * lipD * K * 0.5]
      s.humpP = hump
      s.lipP = lip
      s.fx.hotT += ((s.grab && s.grab.kind === 'tongue' ? 1 : 0) - s.fx.hotT) * 0.25
      s.fx.hotL += ((s.grab && s.grab.kind === 'lips' ? 1 : 0) - s.fx.hotL) * 0.25
      if (tagTongueRef.current) {
        const [x, y] = theatre.cssFromHead(hump[0], hump[1])
        tagTongueRef.current.style.transform = `translate(calc(${x}px - 50%), ${y + 12}px)`
      }
      if (tagLipsRef.current) {
        const [x, y] = theatre.cssFromHead(lip[0], lip[1])
        tagLipsRef.current.style.transform = `translate(calc(${x}px - 50%), ${y + 12}px)`
      }

      theatre.render(s.t, {
        d: s.d,
        energy: s.energy,
        level: s.level,
        eye: s.eye,
        rain: s.rain,
        house: s.house,
        vel: s.art.vel,
        air: s.air,
        pump: s.pump,
        flash: s.flash,
        warn: s.warn * (0.5 + 0.5 * Math.sin(s.t * 7)),
        hump,
        lip,
        hotT: s.fx.hotT,
        hotL: s.fx.hotL,
        handles: s.handles,
        seats: s.seatsV
      })
      if (s.frame % 2 === 0) drawDrum()
      if (s.frame % 3 === 0) updateEar()
      showAir()
    }
    raf = requestAnimationFrame(frame)

    return () => {
      s.alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      for (const id of s.timers) clearTimeout(id)
      theatre.destroy()
      canvas.remove()
      audio.destroy()
    }
  }, [say])

  // ---------------------------------------------------------------- actions
  const begin = useCallback(async () => {
    const s = sim.current
    s.phase = 'play'
    setPhase('play')
    s.houseT = 1
    s.applyNight(s.run, false)
    s.pushHud(s.snapshot({ opening: NIGHTS[0].opening }))
    requestAnimationFrame(() => s.layoutNow())
    const ok = await s.audio.start().catch(() => false)
    if (!ok) setNoSound(true)
    else s.audio.setSeats(s.run.seats)
  }, [])

  const press = useCallback(key => {
    const s = sim.current
    if (!s || (s.phase !== 'play' && s.phase !== 'open') || s.song) return false
    if (s.interlude) {
      s.endInterlude() // a key during the title card dismisses it and is not played
      return false
    }
    const c = CONSONANTS[key]
    if (c && s.phase === 'play' && !isOpen(s.run, c.group)) {
      say(`the ${c.group} cams have not been cut yet.`, 'info', 2200)
      return false
    }
    if (bellowsOn(s.run) && s.air < 0.03) {
      s.pushHud({ flat: Date.now() })
      say('the bellows are flat. pump them: space, or the pump key.', 'miss', 2400)
      return false
    }
    // a hand breath still in the hall's ear is rehearsal; it must not join the word
    if (s.usedHand && !s.played.length) {
      s.listener.drain()
      s.usedHand = false
    }
    s.audio.wake()
    if (!s.played.length) s.ranOut = false // only a word's own breath can blame the bellows
    s.speaker.press(key)
    s.played.push(key)
    s.audio.key()
    s.pushHud({ pulled: key })
    return true
  }, [say])

  const release = useCallback(key => {
    const s = sim.current
    if (!s) return
    s.speaker.release(key)
    s.pushHud({ pulled: null })
  }, [])

  const pump = useCallback(() => {
    const s = sim.current
    if (!s || !bellowsOn(s.run)) return
    s.air = Math.min(1, s.air + 0.32)
    s.pump = 1
    if (s.speaker.busy && !s.song) s.speaker.gap(200) // a breath is also the space between two words
    s.run.pumps++
    s.audio.pump()
  }, [])

  const pin = useCallback(() => {
    const s = sim.current
    if (!s || (s.phase !== 'play' && s.phase !== 'open') || s.song) return
    s.refreshPin()
    const now = s.pinNow
    if (!now || !now.vowel) {
      say('no vowel lives there. move until the dial sits on a letter.', 'info', 2600)
      return
    }
    s.stops[now.vowel] = { tx: s.hand.tx, ty: s.hand.ty, lips: s.hand.lips }
    s.run.pins++
    s.audio.pin()
    s.refreshStops()
    setLive(`Pinned this shape to the ${now.vowel} stop.`)
  }, [say])

  const setReed = useCallback(i => {
    const s = sim.current
    if (!s) return
    s.reed = i
    s.pushHud({ reed: i })
  }, [])

  const reedDown = useCallback(i => {
    const s = sim.current
    if (!s) return
    setReed(i)
    s.audio.wake()
    if (s.interlude) {
      s.endInterlude()
      return
    }
    if (!s.song && (s.phase === 'play' || s.phase === 'open')) s.reedHeld++
  }, [setReed])
  const reedUp = useCallback(() => {
    const s = sim.current
    if (s) s.reedHeld = Math.max(0, s.reedHeld - 1)
  }, [])

  const feedCard = useCallback(() => {
    const s = sim.current
    if (!s || s.song || s.phase !== 'play' || s.interlude) return
    const t = currentTask(s.run)
    if (t.kind !== 'song') return
    let at = 2.0
    const notes = WALTZ.map(n => {
      const dur = n.beats * WALTZ_BEAT
      const note = { ...n, at, dur, rung: REED.indexOf(n.hz) }
      at += dur
      return note
    })
    s.song = { notes, t: 0, next: 0, end: at, good: 0, total: 0, dry: 0 }
    s.listener.drain()
    s.pushHud({ songOn: true, advice: '', heard: '' })
    requestAnimationFrame(() => s.layoutNow())
    setLive('The card begins. Hold the reed on each note.')
  }, [])

  const toggleMute = useCallback(() => {
    const s = sim.current
    setMuted(m => {
      s.audio.setMuted(!m)
      return !m
    })
  }, [])

  const restart = useCallback(() => {
    const s = sim.current
    for (const id of s.timers) clearTimeout(id)
    s.timers.clear()
    s.speaker.clear()
    s.listener.drain()
    s.played = []
    const fresh = freshStops()
    for (const v of VOWELS) s.stops[v] = fresh[v]
    s.run = freshRun()
    s.song = null
    s.finale = null
    s.air = 1
    s.swell = 0
    s.swellT = 0
    s.eye = 0
    s.eyeT = 0
    s.houseT = 1
    s.reed = HOME_REED
    s.hand = { tx: 0.46, ty: 0.3, lips: 0.6, vel: 0 }
    s.phase = 'play'
    s.handVoice = false
    s.grab = null
    s.reedHeld = 0
    s.ranOut = false
    if (s.rainOn) s.audio.setRain(false)
    s.rainOn = false
    setPhase('play')
    setCardHidden(false)
    s.applyNight(s.run, false)
    s.interlude = null
    s.fuse = 0
    s.pushHud(s.snapshot({ heard: '', heardTone: 'idle', heardLabel: 'the hall heard', advice: '', songOn: false, interlude: null, lastLine: null, epithet: '', reed: HOME_REED, touched: false, touchedLips: false, confirmRestart: false, opening: NIGHTS[0].opening }))
    s.audio.setSeats(s.run.seats)
  }, [])

  const openStage = useCallback(() => {
    const s = sim.current
    s.phase = 'open'
    setPhase('open')
    s.houseT = 0.7
    s.pushHud({ heard: '', heardTone: 'idle', heardLabel: 'the hall heard', advice: 'open stage. every cam is cut. say whatever you like; the hall still writes it down.', opening: 'the lease is up and nobody has come for the machine.' })
    requestAnimationFrame(() => s.layoutNow())
  }, [])

  const askRestart = useCallback(() => {
    const s = sim.current
    s.pushHud({ confirmRestart: true })
    s.later(() => s.pushHud({ confirmRestart: false }), 3000)
  }, [])

  // pointer on the throat -----------------------------------------------------
  const onPointerDown = useCallback(e => {
    const s = sim.current
    if (!s || (s.phase !== 'play' && s.phase !== 'open') || s.song) return
    if (e.button !== undefined && e.button > 0) return
    if (s.interlude) {
      s.endInterlude()
      return
    }
    const box = rootRef.current.getBoundingClientRect()
    const [hx, hy] = s.theatre.headFromCss(e.clientX - box.left, e.clientY - box.top)
    const f = s.theatre.fieldAt(hx, hy)
    const hump = s.humpP
    const lip = s.lipP
    const dT = Math.hypot(hx - hump[0], hy - hump[1])
    const dL = Math.hypot(hx - lip[0], hy - lip[1])
    let kind = null
    if (dL < 0.17 && dL < dT) kind = 'lips'
    else if (dT < 0.3) kind = 'tongue'
    else if (f && f.s > 9 && f.s < 39 && f.n < 0.08 && f.n > -0.42) kind = 'tongue'
    else if (f && f.s > 16 && f.s < 21 && f.n > 0.03 && f.n < 0.26) {
      s.hand.vel = s.hand.vel > 0.5 ? 0 : 1
      s.pushHud({ velumOpen: s.hand.vel > 0.5 })
      say(s.hand.vel > 0.5 ? 'the soft palate drops. the voice goes up through the nose.' : 'the soft palate seals the nose again.', 'info', 2200)
      return
    }
    if (!kind) return
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* the pointer already ended */ }
    s.audio.wake()
    if (s.played.length && !s.speaker.busy) {
      s.listener.drain()
      s.played = []
    }
    s.handVoice = true
    s.pushHud(kind === 'tongue' ? { touched: true } : { touchedLips: true })
    s.grab = { kind, id: e.pointerId, x: e.clientX, y: e.clientY }
  }, [say])

  const onPointerMove = useCallback(e => {
    const s = sim.current
    if (!s || !s.grab || s.grab.id !== e.pointerId) return
    const scale = s.theatre.layout.s
    const dx = (e.clientX - s.grab.x) / scale
    const dy = (s.grab.y - e.clientY) / scale
    s.grab.x = e.clientX
    s.grab.y = e.clientY
    // Moves are read in the tube's own frame at the tongue, so a drag can never leap across
    // the bend, and a small stage gains fine control rather than losing it.
    if (s.grab.kind === 'tongue') {
      const at = Math.max(0, Math.min(N - 2, Math.round(T_MIN + T_SPAN * s.hand.tx)))
      const tx = ROOF[at + 1][0] - ROOF[at][0]
      const ty = ROOF[at + 1][1] - ROOF[at][1]
      const tl = Math.hypot(tx, ty) || 1
      const along = (dx * tx + dy * ty) / tl
      const toRoof = (-dx * ty + dy * tx) / tl
      const gain = Math.min(1, (TONGUE_SPAN * scale) / FINE_SPAN)
      s.hand.tx = Math.max(0, Math.min(1, s.hand.tx + along / (SECTION * T_SPAN)))
      s.hand.ty = Math.max(0, Math.min(tongueLimit(s.hand.tx, s.swellT ?? 0), s.hand.ty + (toRoof * gain) / TONGUE_SPAN))
    } else {
      const gain = Math.min(1, (LIP_SPAN * scale) / FINE_SPAN)
      s.hand.lips = Math.max(0.1, Math.min(1, s.hand.lips - (dy * gain) / LIP_SPAN))
    }
    s.refreshPin()
  }, [])

  const onPointerUp = useCallback(e => {
    const s = sim.current
    if (!s || !s.grab || s.grab.id !== e.pointerId) return
    s.grab = null
    s.handVoice = false
    s.refreshPin()
  }, [])

  // keyboard ------------------------------------------------------------------
  useEffect(() => {
    const down = e => {
      const s = sim.current
      if (!s || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key
      if (s.interlude) {
        e.preventDefault()
        if (!e.repeat) s.endInterlude()
        return
      }
      const onControl = e.target && (e.target.tagName === 'BUTTON' || e.target.tagName === 'A')
      if ((k === ' ' || k === 'Enter') && onControl) return
      if (s.phase !== 'play' && s.phase !== 'open') return
      if (k === ' ') {
        e.preventDefault()
        if (!e.repeat) pump()
        return
      }
      if (k === 'Enter') {
        e.preventDefault()
        if (!e.repeat) {
          const t = currentTask(s.run)
          if (t.kind === 'song' && s.phase === 'play') {
            if (!s.song) feedCard()
          } else pin()
        }
        return
      }
      const arrows = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }
      if (arrows[k]) {
        e.preventDefault()
        s.arrows[arrows[k]] = true
        s.handVoice = true
        s.pushHud({ touched: true })
        s.arrowPinTick = 0
        return
      }
      if (k === '[' || k === ']') {
        e.preventDefault()
        s.hand.lips = Math.max(0.1, Math.min(1, s.hand.lips + (k === ']' ? 0.05 : -0.05)))
        s.refreshPin()
        return
      }
      if (k === '/') {
        e.preventDefault()
        s.hand.vel = s.hand.vel > 0.5 ? 0 : 1
        return
      }
      if (k === '0') {
        toggleMute()
        return
      }
      if (k >= '1' && k <= '6' && !e.repeat) {
        e.preventDefault()
        reedDown(+k - 1)
        return
      }
      const u = k.toUpperCase()
      if (u.length === 1 && (VOWELS.includes(u) || CONSONANTS[u])) {
        e.preventDefault()
        if (!e.repeat) press(u)
      }
    }
    const up = e => {
      const s = sim.current
      if (!s) return
      const arrows = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }
      if (arrows[e.key]) {
        s.arrows[arrows[e.key]] = false
        const a = s.arrows
        if (!a.left && !a.right && !a.up && !a.down) s.handVoice = !!s.grab
        s.refreshPin()
        return
      }
      if (e.key >= '1' && e.key <= '6') {
        reedUp()
        return
      }
      const u = e.key.toUpperCase()
      if (u.length === 1) release(u)
    }
    // A held key or finger that never reports its release must not leave the throat droning.
    const letGo = () => {
      const s = sim.current
      if (!s) return
      s.arrows = { left: false, right: false, up: false, down: false }
      s.reedHeld = 0
      s.grab = null
      s.handVoice = false
      s.speaker.releaseAll()
      s.audio.send({ voice: 0, asp: 0, press: 0 })
    }
    const onVisibility = () => { if (document.hidden) letGo() }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', letGo)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', letGo)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [feedCard, pin, press, pump, reedDown, reedUp, release, toggleMute])

  // The slate and manual only exist once the crate is open; watch them from when they mount.
  useEffect(() => {
    const s = sim.current
    if (!s) return
    if (slateRef.current) s.ro.observe(slateRef.current)
    if (manualRef.current) s.ro.observe(manualRef.current)
    if (rodRef.current) s.ro.observe(rodRef.current)
    s.layoutNow()
  }, [phase])

  // ---------------------------------------------------------------- render
  const run = sim.current ? sim.current.run : null
  const night = NIGHTS[hud.night]
  const task = night.tasks[Math.min(hud.task, night.tasks.length - 1)]
  const showManual = phase !== 'intro'
  const inPlay = phase === 'play' || phase === 'open'
  const groupsOpen = phase === 'open' ? ['lips', 'blade', 'back'] : Object.keys(GROUPS).filter(g => run && isOpen(run, g))
  const pinV = hud.pin && hud.pin.vowel
  const bellowsLive = run && bellowsOn(run)

  const tap = (key, down) => e => {
    e.preventDefault()
    if (down) press(key)
    else release(key)
  }
  const kbd = key => e => {
    if (e.detail !== 0) return
    if (press(key)) setTimeout(() => release(key), 200)
  }

  return (
    <div
      ref={rootRef}
      className={`vh-root is-${phase} night-${night.id}${reduced ? ' vh-reduced' : ''}${hud.songOn ? ' is-song' : ''}`}
      onPointerDownCapture={e => {
        // a touch during the title card only dismisses it: nothing beneath is played by accident
        if (sim.current && sim.current.interlude) {
          sim.current.endInterlude()
          sim.current.swallowClick = true
          sim.current.later(() => { sim.current.swallowClick = false }, 500)
          e.stopPropagation()
        }
      }}
      onClickCapture={e => {
        if (sim.current && sim.current.swallowClick) {
          sim.current.swallowClick = false
          e.stopPropagation()
          e.preventDefault()
        }
      }}
      data-testid="vox-humana"
    >
      <div
        className="vh-stage"
        data-playground-surface
        data-testid="vox-humana-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={canvasRef}
          className="vh-canvas"
          role="img"
          aria-label="A void-black cat's head on a theatre stage, cut open to show a throat. Drag the brass ring on the tongue and the ring on the lips to shape it."
        />
      </div>

      {noGl && <p className="vh-nogl" data-testid="vh-nogl">This stage needs WebGL 2 to draw the throat. The keys and the hall still work.</p>}

      <div ref={plateRef} className="vh-plate" aria-hidden="true">VOX · HUMANA</div>

      {phase !== 'intro' && (
        <>
          <span ref={tagTongueRef} className={`vh-tag${hud.touched || !inPlay || hud.night > 0 ? ' is-gone' : ''}`} aria-hidden="true">drag the tongue</span>
          <span ref={tagLipsRef} className={`vh-tag${hud.touchedLips || !inPlay || hud.night > 0 ? ' is-gone' : ''}`} aria-hidden="true">lips</span>
        </>
      )}

      <div ref={earRef} className="vh-ear" data-testid="vh-ear" role="group" aria-label="The ear: where the throat's two lowest resonances sit among the five vowels">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <radialGradient id="vh-brass" cx="35%" cy="28%" r="85%">
              <stop offset="0%" stopColor="#3a2a12" />
              <stop offset="70%" stopColor="#1a1208" />
              <stop offset="100%" stopColor="#0d0904" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="49" fill="url(#vh-brass)" stroke="#c8983f" strokeWidth="1.4" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="#c8983f" strokeOpacity="0.35" strokeWidth="0.5" strokeDasharray="1 2.2" />
          {Object.keys(VOWEL_MAP).map(v => (
            <g key={v}>
              <circle cx={chartX(VOWEL_MAP[v].f2)} cy={chartY(VOWEL_MAP[v].f1)} r="10" fill="#e8c67a" fillOpacity="0.09" stroke="#e8c67a" strokeOpacity="0.3" strokeWidth="0.5" />
              <text x={chartX(VOWEL_MAP[v].f2)} y={chartY(VOWEL_MAP[v].f1) - 3.2} textAnchor="middle" className="vh-ear-letter">{v}</text>
            </g>
          ))}
          {hud.stops.map(st => st.f1 > 0 && (
            <circle key={st.v} cx={chartX(st.f2)} cy={chartY(st.f1)} r="2.3" fill={st.ok ? '#8fe0a6' : '#ff7a5c'} stroke="#100a05" strokeWidth="0.5" data-testid={`vh-ear-stop-${st.v}`} />
          ))}
          <circle ref={earDotRef} cx="50" cy="50" r="3.4" fill="#fff4d6" stroke="#ff9a3c" strokeWidth="1" />
          <text ref={earNumRef} x="50" y="94" textAnchor="middle" className="vh-ear-num" />
        </svg>
      </div>

      {phase !== 'intro' && (
        <header ref={slateRef} className="vh-slate" data-testid="vh-slate">
          <div className="vh-slate-top">
            <Link to="/playground/linguistics" className="vh-back" aria-label="Back to the laboratory">←</Link>
            <h1 className="vh-night" data-testid="vh-night">
              <span className="vh-num">{phase === 'open' ? '—' : night.numeral}</span> {phase === 'open' ? 'open stage' : night.title}
            </h1>
            <div className="vh-seats" role="img" aria-label={`${hud.seats} of ${SEATS} seats filled`} data-testid="vh-seats">
              <span>{hud.seats}</span>/{SEATS}
            </div>
            <button type="button" className="vh-mini" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? 'Sound off' : 'Sound on'} data-testid="vh-mute">{muted ? '♪̸' : '♪'}</button>
            <button
              type="button"
              className={`vh-mini${hud.confirmRestart ? ' is-warn' : ''}`}
              onClick={() => (hud.confirmRestart ? restart() : askRestart())}
              aria-label={hud.confirmRestart ? 'Press again to start a new season' : 'New season'}
              data-testid="vh-restart"
              data-playground-action="restart"
            >{hud.confirmRestart ? 'sure?' : '↺'}</button>
          </div>
          {phase !== 'open' && <p className="vh-ask" data-testid="vh-ask">{phase === 'finale' ? hud.opening : task.ask}</p>}
          {phase === 'open' && <p className="vh-ask">{hud.opening}</p>}
          <div className="vh-chalkrow">
            {task.say && phase === 'play' && (
              <div className="vh-tiles" data-testid="vh-tiles" aria-label={`Play the keys ${task.say}`}>
                {task.say.split('').map((c, i) => c === ' ' ? <span key={i} className="vh-gap" /> : <kbd key={i}>{c}</kbd>)}
                <span className="vh-tiles-for">“{task.want}”</span>
              </div>
            )}
            {task.kind === 'vowels' && phase === 'play' && (
              <div className="vh-tiles" data-testid="vh-proven">
                {VOWELS.map(v => <kbd key={v} className={hud.proven[v] ? 'is-won' : ''}>{v}</kbd>)}
              </div>
            )}
            {task.kind === 'song' && phase === 'play' && !hud.songOn && (
              <button type="button" className="vh-primary vh-card-btn" onClick={feedCard} data-testid="vh-feed" data-playground-action="feed-card">feed the card</button>
            )}
            {task.kind === 'answer' && phase === 'play' && <div className="vh-tiles"><span className="vh-tiles-for">any keys. it will be the last thing they write down.</span></div>}
          </div>
          <p className={`vh-heard tone-${hud.heardTone}`} data-testid="vh-heard">
            <span className="vh-heard-label">{hud.heardLabel}</span>
            <span className="vh-heard-text">{hud.heard || '…'}</span>
          </p>
          <div className="vh-fuse" aria-hidden="true"><span ref={fuseRef} /><em ref={fuseWordRef}>listening</em></div>
          <p className="vh-advice" data-testid="vh-advice">{hud.advice || (phase === 'play' ? task.hint : '') || ''}</p>
          <div className={`vh-drum${hud.traced ? '' : ' is-blank'}`}>
            <canvas ref={drumRef} role="img" aria-label="Smoked drum: a live trace of the machine's spectrum" data-testid="vh-drum" />
            <canvas ref={cardRef} aria-hidden="true" data-testid="vh-card" />
          </div>
        </header>
      )}

      {phase !== 'intro' && (
        <div ref={rodRef} className="vh-rod" role="group" aria-label="Reed pitch" data-testid="vh-rod">
          {REED.map((hz, i) => (
            <button
              key={hz}
              type="button"
              className={`vh-rung${hud.reed === i ? ' is-on' : ''}`}
              onPointerDown={e => { e.preventDefault(); reedDown(i) }}
              onPointerUp={reedUp}
              onPointerCancel={reedUp}
              onPointerLeave={e => { if (e.buttons) reedUp() }}
              onClick={e => { if (e.detail === 0) setReed(i) }}
              aria-pressed={hud.reed === i}
              aria-label={`Reed pitch ${i + 1}: ${Math.round(hz)} hertz. Hold to sing.`}
              data-testid={`vh-rung-${i}`}
              data-playground-action="reed"
            >{REED_NAMES[i]}</button>
          ))}
        </div>
      )}

      {showManual && (
        <footer ref={manualRef} className="vh-manual" data-testid="vh-manual">
          <div className="vh-row vh-row-stops">
            {hud.stops.map(st => (
              <button
                key={st.v}
                type="button"
                className={`vh-stop${st.ok ? ' is-true' : ' is-off'}${hud.pulled === st.v ? ' is-pulled' : ''}`}
                style={{ '--tr': st.trueness }}
                onPointerDown={tap(st.v, true)}
                onPointerUp={tap(st.v, false)}
                onPointerCancel={tap(st.v, false)}
                onPointerLeave={e => { if (e.buttons) release(st.v) }}
                onClick={kbd(st.v)}
                disabled={!inPlay}
                aria-label={`${st.v} stop. ${st.ok ? `True, ${Math.round(st.trueness * 100)} percent` : `Currently heard as ${st.heard}`}.`}
                data-testid={`vh-stop-${st.v}`}
                data-playground-action="stop"
              >
                <b>{st.v}</b>
                <small>{st.ok ? `${Math.round(st.trueness * 100)}%` : `→ ${st.heard.toLowerCase()}`}</small>
              </button>
            ))}
            <button
              type="button"
              className={`vh-pin${pinV ? '' : ' is-idle'}`}
              onClick={pin}
              onPointerDown={e => e.preventDefault()}
              disabled={!inPlay || !pinV || hud.songOn}
              aria-label={pinV ? `Pin the current throat shape to the ${pinV} stop` : 'No vowel lives at this shape yet'}
              data-testid="vh-pin"
              data-playground-action="pin"
            >
              <small>pin to</small><b>{pinV || '—'}</b>
            </button>
            <button
              type="button"
              key={hud.flat || 'pump'}
              className={`vh-pump${bellowsLive ? '' : ' is-idle'}${hud.flat ? ' is-flat' : ''}`}
              onClick={pump}
              onPointerDown={e => e.preventDefault()}
              disabled={!bellowsLive || !inPlay}
              aria-label="Pump the bellows"
              data-testid="vh-pump"
              data-playground-action="pump"
            >
              <span className="vh-air"><span ref={airRef} /></span>
              <small>pump</small>
            </button>
          </div>
          {groupsOpen.map(g => (
            <div key={g} className={`vh-row vh-row-cams g-${g}`} data-testid={`vh-cams-${g}`}>
              {GROUPS[g].map(k => (
                <button
                  key={k}
                  type="button"
                  className={`vh-cam${hud.pulled === k ? ' is-pulled' : ''}`}
                  onPointerDown={tap(k, true)}
                  onPointerUp={tap(k, false)}
                  onPointerCancel={tap(k, false)}
                  onPointerLeave={e => { if (e.buttons) release(k) }}
                  onClick={kbd(k)}
                  disabled={!inPlay}
                  title={CONSONANTS[k].word}
                  aria-label={`${k === 'X' ? 'SH' : k}: ${CONSONANTS[k].word}`}
                  data-testid={`vh-cam-${k}`}
                  data-playground-action="cam"
                >{k}</button>
              ))}
            </div>
          ))}
        </footer>
      )}

      <div className="vh-sr" role="status" aria-live="polite" data-testid="vh-live">{live}</div>
      {toast && <div key={toast.id} className={`vh-toast tone-${toast.tone}`} aria-hidden="true" data-testid="vh-toast">{toast.text}</div>}

      {noSound && phase === 'play' && <p className="vh-nosound" data-testid="vh-nosound">Sound would not start in this browser. The dial and the slate still tell you what the hall hears.</p>}

      {hud.interlude && (
        <div className="vh-interlude" data-testid="vh-interlude" aria-hidden="true">
          <span>night {hud.interlude.numeral}</span>
          <strong>{hud.interlude.title}</strong>
          <p>{hud.interlude.opening}</p>
          {hud.interlude.closing && <p className="vh-closing" data-testid="vh-closing">{hud.interlude.closing}</p>}
          <small>tap or press a key</small>
        </div>
      )}

      {phase === 'intro' && (
        <section className="vh-card vh-intro" data-testid="vh-intro">
          <Link to="/playground/linguistics" className="vh-back-intro">← laboratory</Link>
          <p className="vh-eyebrow">six nights · one hired hall</p>
          <h1>vox.humana()</h1>
          <p className="vh-lede">You have bought a speaking machine for the freight. Shape its throat by hand, pin what you find to the organ stops, and play words through them. The hall has not been told what you meant. It writes down what it hears.</p>
          <ul className="vh-how">
            <li><b>Drag</b> the brass ring on the tongue and the ring on the lips. The dial in the skull shows which vowel that shape really makes.</li>
            <li><b>Pin</b> a good shape to its stop. Then the stops and cams are your keyboard: tap them, or type <kbd>M</kbd> <kbd>A</kbd> <kbd>M</kbd> <kbd>A</kbd>.</li>
            <li><b>Pump</b> the bellows (<kbd>space</kbd>). Hold a reed rung to sing. Every voice here is computed live: sound on.</li>
          </ul>
          {seasons.length > 0 && (
            <div className="vh-seasons" data-testid="vh-seasons">
              <h2>past engagements</h2>
              <ol>{seasons.map((c, i) => <li key={i}><b>{c.seats}/{SEATS}</b> {c.ep}<em>“{c.last}”</em></li>)}</ol>
            </div>
          )}
          <button type="button" className="vh-primary" onClick={begin} autoFocus data-playground-primary data-testid="vh-begin">Open the crate</button>
          <p className="vh-fine">Keyboard: letters play sounds · arrows move the tongue · [ ] lips · enter pins · space pumps · 1 to 6 sing.</p>
        </section>
      )}

      {phase === 'end' && !cardHidden && (
        <section className="vh-card vh-end" data-testid="vh-end">
          <p className="vh-eyebrow">the lease is up</p>
          <h1 data-testid="vh-epithet">{hud.epithet}</h1>
          <p className="vh-lastline">Nobody played this: <strong data-testid="vh-lastline">“{hud.lastLine}”</strong></p>
          <dl className="vh-stats">
            <div><dt>seats at the end</dt><dd>{hud.seats}/{SEATS}</dd></div>
            <div><dt>understood</dt><dd>{hud.understood}</dd></div>
            <div><dt>misheard</dt><dd>{hud.misheard}</dd></div>
            <div className="vh-stat-wide"><dt>they asked who was in there, you said</dt><dd>{hud.answer || 'nothing'}</dd></div>
          </dl>
          <div className="vh-transcript" data-testid="vh-transcript" tabIndex={0} aria-label="What the hall wrote down, all six nights">
            <h2>what the hall wrote down</h2>
            <ol>
              {hud.log.slice(-18).map((l, i) => (
                <li key={i} className={l.machine ? 'is-machine' : l.hit ? 'is-hit' : 'is-miss'}>
                  <span>{l.night}</span>{l.text}{l.wanted && !l.hit ? <em> (you meant {l.wanted})</em> : null}
                </li>
              ))}
            </ol>
          </div>
          <div className="vh-actions">
            <button type="button" className="vh-primary" onClick={restart} autoFocus data-testid="vh-again" data-playground-action="restart">Another season</button>
            <button type="button" className="vh-ghost" onClick={openStage} data-testid="vh-open-stage" data-playground-action="open-stage">Open stage: keep playing</button>
            <button type="button" className="vh-ghost" onClick={() => setCardHidden(true)} data-testid="vh-look">Look at it</button>
          </div>
        </section>
      )}
      {phase === 'end' && cardHidden && (
        <button type="button" className="vh-primary vh-return" onClick={() => setCardHidden(false)} data-testid="vh-return">The programme</button>
      )}
    </div>
  )
}
