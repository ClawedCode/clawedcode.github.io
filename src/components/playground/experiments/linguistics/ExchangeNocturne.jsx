import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { EVENTS, FACTS, JACK, JACKS, NIGHT_LENGTH, PAIRS } from './exchange/night-script'
import {
  FLOOD_LEVEL, clearPair, choose, clockText, createNight, hintPins, insertPlug, isBusy,
  jackPlug, lampCall, pairCall, pullPlug, ring, setHeadset, tick
} from './exchange/exchange-core'
import { createLineAudio } from './exchange/line-audio'
import './ExchangeNocturne.css'

const MINUTE_MS = 760
const IDLE_SPEED = 2.6
const HURRY_SPEED = 4
const ROPE_POINTS = 13
const BOOK_KEY = 'exchange-nocturne-nights'
const END_WORD = { answer: 'answer', call: 'call' }
const COLUMNS = 4
const JACK_KEYS = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 0: 9, '-': 10, '=': 11 }

function readBook() {
  try {
    return JSON.parse(window.localStorage.getItem(BOOK_KEY) || '[]').slice(0, 6)
  } catch {
    return []
  }
}

function writeBook(entries) {
  try {
    window.localStorage.setItem(BOOK_KEY, JSON.stringify(entries.slice(0, 6)))
  } catch {
    // Storage can be refused; the exchange book just stays in memory.
  }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

const speakerName = id => (id === 'operator' ? 'you' : JACK[id] ? JACK[id].who : id)

function pairStatus(night, pairId) {
  const pair = night.pairs[pairId]
  const call = pairCall(night, pairId)
  if (!pair.answer && !pair.call) return { tone: 'free', text: 'free' }
  if (!call) return { tone: 'idle', text: 'cord up, nobody on it' }
  const from = JACK[call.from].name
  switch (call.state) {
    case 'request': return pair.call ? { tone: 'wait', text: `${from} → ${JACK[pair.call].name}? ring it` } : { tone: 'wait', text: `${from} waiting for a line` }
    case 'choice': return { tone: 'wait', text: `${from} wants an answer` }
    case 'ringing': return { tone: 'ring', text: `ringing ${JACK[pair.call].name}` }
    case 'talking': return { tone: 'talk', text: night.headset === pairId ? `listening: ${from} ↔ ${JACK[pair.call].name}` : `${from} ↔ ${JACK[pair.call].name} · murmur` }
    case 'cleared': return { tone: 'clear', text: 'rung off · pull the cords' }
    case 'missed': return { tone: 'dead', text: 'dead line · pull the cords' }
    default: return { tone: 'idle', text: '' }
  }
}

export default function ExchangeNocturne() {
  const reduced = useReducedMotion()
  const nightRef = useRef(null)
  if (!nightRef.current) nightRef.current = createNight()
  const [, setVersion] = useState(0)
  const [started, setStarted] = useState(false)
  const [selected, setSelected] = useState(null)
  const [hurry, setHurry] = useState(false)
  const [muted, setMuted] = useState(false)
  const [flash, setFlash] = useState(0)
  const [freshFact, setFreshFact] = useState(null)
  const [book, setBook] = useState(readBook)
  const [announce, setAnnounce] = useState('')

  const rootRef = useRef(null)
  const consoleRef = useRef(null)
  const townRef = useRef(null)
  const logRef = useRef(null)
  const holeRefs = useRef({})
  const cellRefs = useRef({})
  const socketRefs = useRef({})
  const plugRefs = useRef({})
  const cordRefs = useRef({})
  const geomRef = useRef({ holes: {}, cells: {}, sockets: {}, width: 0, height: 0 })
  const ropesRef = useRef({})
  const dragRef = useRef(null)
  const audioRef = useRef(null)
  const startedRef = useRef(false)
  const hurryRef = useRef(false)
  const reducedRef = useRef(reduced)
  const lightningRef = useRef(-1e9)
  const bellRef = useRef(-1e9)
  const selectedRef = useRef(null)
  const factTimer = useRef(0)

  const bump = useCallback(() => setVersion(v => v + 1), [])
  useEffect(() => { reducedRef.current = reduced }, [reduced])
  useEffect(() => { hurryRef.current = hurry }, [hurry])
  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => { audioRef.current?.setMuted(muted) }, [muted])

  const night = nightRef.current

  // Measure the board so cords and plugs can be drawn over it.
  const measure = useCallback(() => {
    const host = consoleRef.current
    if (!host) return
    const box = host.getBoundingClientRect()
    const centre = el => {
      const r = el.getBoundingClientRect()
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 }
    }
    const g = { holes: {}, cells: {}, sockets: {}, width: box.width, height: box.height }
    Object.entries(holeRefs.current).forEach(([id, el]) => { if (el) g.holes[id] = centre(el) })
    Object.entries(cellRefs.current).forEach(([id, el]) => {
      if (!el) return
      const r = el.getBoundingClientRect()
      g.cells[id] = { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height }
    })
    Object.entries(socketRefs.current).forEach(([key, el]) => { if (el) g.sockets[key] = centre(el) })
    geomRef.current = g
    bump()
  }, [bump])

  useLayoutEffect(() => {
    measure()
    const observer = new ResizeObserver(() => measure())
    if (consoleRef.current) observer.observe(consoleRef.current)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  const plugPosition = useCallback((pairId, end) => {
    const key = `${pairId}-${end}`
    const drag = dragRef.current
    if (drag && drag.key === key && drag.moved) return { x: drag.x, y: drag.y, state: 'drag' }
    const jackId = nightRef.current.pairs[pairId][end]
    const g = geomRef.current
    if (jackId && g.holes[jackId]) return { ...g.holes[jackId], state: 'jack' }
    return { ...(g.sockets[key] || { x: 0, y: 0 }), state: 'socket' }
  }, [])

  // Turn engine events into sound, light and spoken announcements.
  const drain = useCallback(() => {
    const n = nightRef.current
    if (!n.outbox.length) return false
    const audio = audioRef.current
    const events = n.outbox.splice(0)
    events.forEach(ev => {
      switch (ev.type) {
        case 'lamp': audio?.drop(); setAnnounce(`${JACK[ev.jack].name} is calling.`); break
        case 'request': audio?.speak(14, ev.jack); break
        case 'plug': audio?.plug(true); break
        case 'unplug': audio?.plug(false); break
        case 'busy': audio?.busy(); setAnnounce(`${JACK[ev.jack].name} is already plugged.`); break
        case 'ring': audio?.ring(); break
        case 'line': audio?.speak(ev.chars, ev.who); break
        case 'murmur': if (n.headset !== ev.pair) audio?.murmur(); break
        case 'fact':
          audio?.fact()
          setFreshFact(ev.fact)
          window.clearTimeout(factTimer.current)
          factTimer.current = window.setTimeout(() => setFreshFact(null), 2600)
          setAnnounce(`Noted: ${FACTS[ev.fact].text}`)
          break
        case 'wrong': audio?.wrong(); setAnnounce(`Wrong line: ${JACK[ev.jack].name}.`); break
        case 'dead': audio?.loss(); break
        case 'missed': audio?.loss(); setAnnounce(`${JACK[ev.jack].name} rang off.`); break
        case 'lightning':
          audio?.thunder()
          lightningRef.current = performance.now()
          setFlash(f => f + 1)
          break
        case 'line-up': audio?.mend(); break
        case 'news':
          if (ev.flags.includes('bellRung')) {
            audio?.bell()
            bellRef.current = performance.now()
          } else audio?.mend()
          setAnnounce(ev.text)
          break
        case 'flood': audio?.loss(); break
        case 'dawn': audio?.dawn(); break
        case 'headset': audio?.headset(true); break
        default: break
      }
    })
    return true
  }, [])

  // The main loop: advance the night, swing the cords, paint the town.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let sinceBump = 0
    const drops = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 0.8 }))
    let lastTown = 0

    const drawTown = now => {
      const canvas = townRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(rect.width * dpr))
      const h = Math.max(1, Math.round(rect.height * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      const ctx = canvas.getContext('2d')
      const n = nightRef.current
      const W = rect.width
      const H = rect.height
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const dawnMix = Math.max(0, Math.min(1, (n.now - 330) / 90))
      const sky = ctx.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0, mixColor('#0d1424', '#3a2f4a', dawnMix))
      sky.addColorStop(0.7, mixColor('#18233a', '#c98b6b', dawnMix))
      sky.addColorStop(1, mixColor('#1e2a3c', '#e7b07e', dawnMix))
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H)

      const sinceBolt = now - lightningRef.current
      if (sinceBolt < 700 && !reducedRef.current) {
        ctx.fillStyle = `rgba(220, 230, 255, ${0.55 * (1 - sinceBolt / 700) * (sinceBolt % 140 < 70 ? 1 : 0.4)})`
        ctx.fillRect(0, 0, W, H)
      }

      // far hill
      ctx.fillStyle = mixColor('#121a29', '#5b4a5c', dawnMix)
      ctx.beginPath()
      ctx.moveTo(0, H * 0.62)
      for (let x = 0; x <= W; x += 12) ctx.lineTo(x, H * (0.5 + 0.08 * Math.sin(x / W * 5.1 + 1.3) + 0.04 * Math.sin(x / W * 13)))
      ctx.lineTo(W, H)
      ctx.lineTo(0, H)
      ctx.fill()

      const riverTop = H * (0.98 - n.river * 0.36)
      const groundY = H * 0.74
      const houses = JACKS.map(j => ({ j, x: j.x * W }))

      // telephone wires from each house to the exchange, at the centre
      const ex = { x: W * 0.5, y: groundY - H * 0.2 }
      ctx.lineWidth = 1
      houses.forEach(({ j, x }) => {
        const up = n.jacks[j.id].up
        ctx.strokeStyle = up ? 'rgba(160, 170, 190, 0.35)' : 'rgba(220, 90, 70, 0.6)'
        ctx.beginPath()
        const top = groundY - houseHeight(j.id, H) - 4
        if (up) {
          ctx.moveTo(x, top)
          ctx.quadraticCurveTo((x + ex.x) / 2, Math.min(top, ex.y) + H * 0.08, ex.x, ex.y)
        } else {
          ctx.moveTo(x, top)
          ctx.quadraticCurveTo(x + (ex.x - x) * 0.25, top + H * 0.12, x + (ex.x - x) * 0.3, top + H * 0.2 + Math.sin(now / 160) * 3)
        }
        ctx.stroke()
      })

      // conversations travel along the wires as warm sparks
      Object.values(n.calls).forEach(call => {
        if (call.state !== 'talking') return
        const pair = n.pairs[call.pair]
        const a = houses.find(hh => hh.j.id === call.from)
        const b = houses.find(hh => hh.j.id === pair.call)
        if (!a || !b) return
        const color = PAIRS[call.pair].color
        ;[a, b].forEach((p, k) => {
          const top = groundY - houseHeight(p.j.id, H) - 4
          const t = reducedRef.current ? 0.5 : ((now / 1400 + k * 0.5) % 1)
          const s = k === 0 ? t : 1 - t
          const cx = (p.x + ex.x) / 2
          const cy = Math.min(top, ex.y) + H * 0.08
          const x = (1 - s) * (1 - s) * p.x + 2 * (1 - s) * s * cx + s * s * ex.x
          const y = (1 - s) * (1 - s) * top + 2 * (1 - s) * s * cy + s * s * ex.y
          ctx.fillStyle = color
          ctx.shadowColor = '#ffd38a'
          ctx.shadowBlur = 8
          ctx.beginPath()
          ctx.arc(x, y, 2.4, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        })
      })

      // the exchange itself
      ctx.fillStyle = '#0b0f17'
      ctx.fillRect(ex.x - 16, ex.y, 32, groundY - ex.y)
      ctx.fillStyle = startedRef.current && n.phase === 'night' ? '#ffcf7a' : '#5b5240'
      ctx.fillRect(ex.x - 9, ex.y + 8, 7, 7)
      ctx.fillRect(ex.x + 2, ex.y + 8, 7, 7)

      // houses
      houses.forEach(({ j, x }) => {
        const hh = houseHeight(j.id, H)
        const top = groundY - hh
        ctx.fillStyle = mixColor('#070a10', '#2b2230', dawnMix)
        if (j.id === 'lighthouse') {
          ctx.beginPath()
          ctx.moveTo(x - 8, groundY)
          ctx.lineTo(x - 4, top)
          ctx.lineTo(x + 4, top)
          ctx.lineTo(x + 8, groundY)
          ctx.fill()
          const a = reducedRef.current ? -2.6 : (now / 1800) % (Math.PI * 2)
          const beam = ctx.createRadialGradient(x, top + 3, 0, x, top + 3, W * 0.4)
          beam.addColorStop(0, 'rgba(255, 230, 160, 0.55)')
          beam.addColorStop(1, 'rgba(255, 230, 160, 0)')
          ctx.fillStyle = beam
          ctx.beginPath()
          ctx.moveTo(x, top + 3)
          ctx.arc(x, top + 3, W * 0.4, a - 0.12, a + 0.12)
          ctx.closePath()
          ctx.fill()
          ctx.fillStyle = '#ffe2a0'
          ctx.fillRect(x - 3, top + 1, 6, 5)
          return
        }
        const wide = (j.id === 'mill' || j.id === 'station' || j.id === 'farm' ? 30 : 20) * Math.min(1.6, Math.max(0.8, W / 760))
        ctx.beginPath()
        ctx.moveTo(x - wide / 2, groundY)
        ctx.lineTo(x - wide / 2, top + 7)
        ctx.lineTo(x, top)
        ctx.lineTo(x + wide / 2, top + 7)
        ctx.lineTo(x + wide / 2, groundY)
        ctx.fill()
        if (j.id === 'church') {
          ctx.fillRect(x - 3, top - 16, 6, 18)
          ctx.beginPath()
          ctx.moveTo(x - 5, top - 16)
          ctx.lineTo(x, top - 26)
          ctx.lineTo(x + 5, top - 16)
          ctx.fill()
          const swing = now - bellRef.current < 12000 && !reducedRef.current ? Math.sin(now / 180) * 3 : 0
          ctx.fillStyle = n.flags.bellRung ? '#e2b25a' : '#3a3428'
          ctx.beginPath()
          ctx.arc(x + swing, top - 9, 2.6, 0, Math.PI * 2)
          ctx.fill()
        }
        const call = lampCall(n, j.id)
        const plug = jackPlug(n, j.id)
        let lit = 0.12
        if (!n.jacks[j.id].up) lit = 0
        else if (call) lit = reducedRef.current ? 1 : (Math.sin(now / (90 + 200 * (call.patience / call.patienceMax))) > 0 ? 1 : 0.25)
        else if (plug) lit = 0.85
        else if (j.id === 'farm' && n.flags.doctorCalled && !n.flags.wren) lit = 0.7
        ctx.fillStyle = `rgba(255, 196, 102, ${lit})`
        ctx.fillRect(x - 4, top + 10, 8, 6)
      })

      // the river, rising
      ctx.fillStyle = mixColor('#1d3346', '#7d8ea0', dawnMix)
      ctx.beginPath()
      ctx.moveTo(0, riverTop)
      for (let x = 0; x <= W; x += 10) ctx.lineTo(x, riverTop + Math.sin(x / 23 + now / (reducedRef.current ? 1e9 : 700)) * 1.4)
      ctx.lineTo(W, H)
      ctx.lineTo(0, H)
      ctx.fill()
      if (n.flags.doctorCrossed && n.now - n.flags.doctorCrossed < 40) {
        const t = (n.now - n.flags.doctorCrossed) / 40
        const fx = W * (0.72 - 0.3 * t)
        ctx.fillStyle = '#ffd88a'
        ctx.beginPath()
        ctx.arc(fx, riverTop + 4, 2.2, 0, Math.PI * 2)
        ctx.fill()
      }

      // gauge post with the five marks
      const postX = W - 18
      ctx.fillStyle = 'rgba(232, 220, 196, 0.85)'
      ctx.fillRect(postX, H * 0.6, 3, H * 0.4)
      ctx.font = `600 ${Math.max(8, H * 0.07)}px Georgia, serif`
      ctx.textAlign = 'right'
      ;['I', 'II', 'III', 'IV', 'V'].forEach((mark, i) => {
        const level = 0.2 * (i + 1)
        const y = H * (0.98 - level * 0.36)
        const hit = n.river >= level - 0.001
        ctx.fillStyle = hit ? (level >= FLOOD_LEVEL - 0.1 ? '#ff8a6a' : '#f4e3c0') : 'rgba(232, 220, 196, 0.45)'
        ctx.fillRect(postX - 5, y, 8, 1.5)
        ctx.fillText(mark, postX - 7, y + 3)
      })

      // rain
      const rain = Math.max(0.2, 1 - dawnMix * 0.8)
      ctx.strokeStyle = `rgba(190, 205, 230, ${0.32 * rain})`
      ctx.lineWidth = 1
      ctx.beginPath()
      drops.forEach(d => {
        const t = reducedRef.current ? 0 : now / 1000
        const y = ((d.y + t * d.s * 1.6) % 1) * H
        const x = ((d.x + t * 0.12) % 1) * W
        ctx.moveTo(x, y)
        ctx.lineTo(x - 3, y + 9 * d.s)
      })
      ctx.stroke()
    }

    const step = now => {
      const realDt = Math.min(100, now - last)
      last = now
      const n = nightRef.current
      let changed = false
      if (startedRef.current && n.phase === 'night' && !document.hidden) {
        const speed = hurryRef.current ? HURRY_SPEED : isBusy(n) ? 1 : IDLE_SPEED
        tick(n, (realDt / MINUTE_MS) * speed)
      }
      if (drain()) changed = true
      sinceBump += realDt
      if (changed || sinceBump > 90) {
        sinceBump = 0
        setVersion(v => v + 1)
      }

      // cords
      const g = geomRef.current
      PAIRS.forEach(p => {
        ;['answer', 'call'].forEach(end => {
          const key = `${p.id}-${end}`
          const node = cordRefs.current[key]
          if (!node) return
          const anchor = g.sockets[key]
          const tip = plugPosition(p.id, end)
          const d = !anchor || tip.state === 'socket' ? '' : ropePath(ropesRef.current, key, anchor, tip, reducedRef.current, g.height - 7)
          if (!d) ropesRef.current[key] = null
          node.parentNode.querySelectorAll('path').forEach(path => path.setAttribute('d', d))
        })
        ;['answer', 'call'].forEach(end => {
          const key = `${p.id}-${end}`
          const drag = dragRef.current
          const el = plugRefs.current[key]
          if (el && drag && drag.key === key && drag.moved) el.style.transform = `translate(${drag.x}px, ${drag.y}px) translate(-50%, -50%) rotate(${end === 'answer' ? -8 : 8}deg)`
        })
      })

      if (!reducedRef.current || now - lastTown > 400) {
        drawTown(now)
        lastTown = now
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [drain, plugPosition])

  useEffect(() => () => {
    window.clearTimeout(factTimer.current)
    audioRef.current?.close()
    audioRef.current = null
  }, [])

  // Keep the newest words in view.
  const logLength = night.log.length
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logLength, started])

  // Write the night into the exchange book once dawn comes.
  const endingWritten = useRef(false)
  useEffect(() => {
    if (night.phase !== 'dawn' || endingWritten.current) return
    endingWritten.current = true
    const entry = {
      at: new Date().toISOString().slice(0, 10),
      epithet: night.ending.epithet,
      marks: night.ending.threads.filter(t => t.good !== null).map(t => (t.good ? '●' : '○')).join(''),
      kept: night.flags.keptSecret ? 'kept' : night.flags.toldConstable ? 'told' : 'none'
    }
    const next = [entry, ...readBook()].slice(0, 6)
    writeBook(next)
    setBook(next)
  })

  const ensureAudio = () => {
    if (!audioRef.current) {
      audioRef.current = createLineAudio()
      audioRef.current?.setMuted(muted)
    }
    audioRef.current?.resume()
  }

  const begin = () => {
    ensureAudio()
    startedRef.current = true
    setStarted(true)
    setAnnounce('The night exchange is open. The schoolhouse lamp is lit.')
    window.requestAnimationFrame(() => cellRefs.current.school?.focus())
  }

  const restart = () => {
    nightRef.current = createNight()
    ropesRef.current = {}
    endingWritten.current = false
    dragRef.current = null
    setSelected(null)
    setHurry(false)
    ensureAudio()
    startedRef.current = true
    setStarted(true)
    setAnnounce('Another night. The schoolhouse lamp is lit.')
    bump()
  }

  const act = fn => {
    if (!startedRef.current) begin()
    fn(nightRef.current)
    drain()
    bump()
  }

  const placeSelected = jackId => {
    const sel = selectedRef.current
    if (!sel) return false
    act(n => {
      const result = insertPlug(n, sel.pair, sel.end, jackId)
      if (result.ok) {
        setSelected(null)
        if (sel.end === 'answer' && n.pairs[sel.pair].callId) setSelected({ pair: sel.pair, end: 'call' })
      }
    })
    return true
  }

  const onJack = jackId => {
    if (nightRef.current.phase !== 'night') return
    if (placeSelected(jackId)) return
    const holder = jackPlug(nightRef.current, jackId)
    if (holder) {
      act(n => setHeadset(n, holder.pair))
      return
    }
    if (lampCall(nightRef.current, jackId)) {
      const free = nightRef.current.pairs.find(p => !p.answer && !p.call)
      if (free) {
        act(n => insertPlug(n, free.id, 'answer', jackId))
        setSelected({ pair: free.id, end: 'call' })
      } else setAnnounce('Every cord is up. Clear a pair first.')
    }
  }

  const onJackKey = (event, index) => {
    const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLUMNS, ArrowUp: -COLUMNS }
    if (moves[event.key] === undefined) return
    event.preventDefault()
    const next = (index + moves[event.key] + JACKS.length) % JACKS.length
    cellRefs.current[JACKS[next].id]?.focus()
  }

  // Plugs: drag them to a jack, or tap to pick up and tap a jack to place.
  const onPlugDown = (event, pairId, end) => {
    if (nightRef.current.phase !== 'night') return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const box = consoleRef.current.getBoundingClientRect()
    dragRef.current = {
      key: `${pairId}-${end}`, pair: pairId, end, pointerId: event.pointerId,
      sx: event.clientX, sy: event.clientY, x: event.clientX - box.left, y: event.clientY - box.top, moved: false
    }
  }

  const onPlugMove = event => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const box = consoleRef.current.getBoundingClientRect()
    drag.x = event.clientX - box.left
    drag.y = event.clientY - box.top
    if (!drag.moved && Math.hypot(event.clientX - drag.sx, event.clientY - drag.sy) > 7) {
      drag.moved = true
      bump()
    }
  }

  const onPlugUp = event => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    const n = nightRef.current
    const current = n.pairs[drag.pair][drag.end]
    if (!drag.moved) {
      if (current) {
        act(m => pullPlug(m, drag.pair, drag.end))
        setSelected(null)
      } else {
        if (!startedRef.current) begin()
        setSelected(sel => (sel && sel.pair === drag.pair && sel.end === drag.end ? null : { pair: drag.pair, end: drag.end }))
      }
      bump()
      return
    }
    const g = geomRef.current
    const target = JACKS.find(j => {
      const c = g.cells[j.id]
      return c && drag.x >= c.x && drag.x <= c.x + c.w && drag.y >= c.y && drag.y <= c.y + c.h
    })
    if (target) {
      act(m => {
        const result = insertPlug(m, drag.pair, drag.end, target.id)
        if (result.ok && drag.end === 'answer' && m.pairs[drag.pair].callId) setSelected({ pair: drag.pair, end: 'call' })
        else setSelected(null)
      })
    } else if (current) {
      act(m => pullPlug(m, drag.pair, drag.end))
    }
    bump()
  }

  const onPlugKey = (event, pairId, end) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    if (nightRef.current.phase !== 'night') return
    if (nightRef.current.pairs[pairId][end]) {
      act(n => pullPlug(n, pairId, end))
      return
    }
    if (!startedRef.current) begin()
    setSelected(sel => (sel && sel.pair === pairId && sel.end === end ? null : { pair: pairId, end }))
  }

  const ringPair = pairId => act(n => ring(n, pairId))
  const listenPair = pairId => act(n => setHeadset(n, pairId))
  const clearOne = pairId => act(n => clearPair(n, pairId))
  const cycleHeadset = () => {
    const n = nightRef.current
    const used = n.pairs.filter(p => p.answer || p.call).map(p => p.id)
    if (!used.length) return
    listenPair(used[(used.indexOf(n.headset) + 1) % used.length])
  }
  const pick = (pairId, choiceId) => act(n => choose(n, pairId, choiceId))

  // Keyboard: the whole board is playable without a pointer.
  useEffect(() => {
    const onKey = event => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const n = nightRef.current
      const key = event.key.toLowerCase()
      if (key === 'm') {
        setMuted(m => !m)
        return
      }
      if (!startedRef.current) {
        if (key === 'enter' && event.target === document.body) begin()
        return
      }
      if (n.phase === 'dawn') {
        if (key === 'r') restart()
        return
      }
      const headCall = n.headset === null ? null : pairCall(n, n.headset)
      if (headCall && headCall.state === 'choice' && ['1', '2', '3'].includes(key)) {
        const choice = EVENTS[headCall.id].choices[Number(key) - 1]
        if (choice) pick(n.headset, choice.id)
        event.preventDefault()
        return
      }
      if (JACK_KEYS[key] !== undefined) {
        const jack = JACKS[JACK_KEYS[key]]
        if (selectedRef.current) onJack(jack.id)
        else cellRefs.current[jack.id]?.focus()
        event.preventDefault()
        return
      }
      if (key === 'a') {
        const free = n.pairs.find(p => !p.answer && !p.call)
        if (free) setSelected({ pair: free.id, end: 'answer' })
        else setAnnounce('Every cord is up. Clear a pair first.')
      } else if (key === 'c') {
        if (n.headset !== null) setSelected({ pair: n.headset, end: 'call' })
      } else if (key === 'r') {
        if (n.headset !== null) ringPair(n.headset)
      } else if (key === 'l') {
        cycleHeadset()
      } else if (key === 'x') {
        n.pairs.forEach(p => {
          const call = pairCall(n, p.id)
          if ((p.answer || p.call) && (!call || ['cleared', 'missed'].includes(call.state))) clearOne(p.id)
        })
      } else if (key === 'f') {
        setHurry(h => !h)
      } else if (key === 'escape') {
        setSelected(null)
      } else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ---- render ----
  const pins = hintPins(night)
  const headCall = night.headset === null ? null : pairCall(night, night.headset)
  const headEvent = headCall ? EVENTS[headCall.id] : null
  const busy = isBusy(night)
  const speedWord = !started || night.phase !== 'night' ? '' : hurry ? 'hurrying ×4' : busy ? 'real time' : 'quiet hour'
  const progress = Math.min(1, night.now / NIGHT_LENGTH)
  const g = geomRef.current
  const ending = night.ending
  const lampsLit = JACKS.filter(j => lampCall(night, j.id)).length

  return (
    <div
      ref={rootRef}
      className={`ex-root ${reduced ? 'ex-reduced' : ''} ${night.phase === 'dawn' ? 'is-dawn' : ''} ${started ? 'is-open' : 'is-intro'}`}
      data-testid="exchange-nocturne"
      style={{ '--ex-dawn': Math.max(0, (night.now - 330) / 90) }}
    >
      <div className="ex-flash" key={flash} aria-hidden="true" />
      <header className="ex-head">
        <Link to="/playground/linguistics" className="ex-back">← laboratory</Link>
        <div className="ex-title">
          <span className="ex-kicker">exchange.nocturne() · lantern hollow, the night the river rose</span>
          <h1>The night exchange</h1>
        </div>
        <div className="ex-clock" aria-label={`Exchange clock ${clockText(night.now)}`}>
          <span className="ex-clock-time">{clockText(night.now)}</span>
          <span className="ex-clock-bar" style={{ '--ex-progress': progress }} aria-hidden="true" />
          <span className="ex-clock-mode">{speedWord}</span>
        </div>
        <div className="ex-head-keys">
          <button type="button" className="ex-small" onClick={() => setHurry(h => !h)} aria-pressed={hurry} disabled={!started || night.phase !== 'night'} data-playground-action="hurry">
            {hurry ? 'easy' : 'hurry'} <kbd>F</kbd>
          </button>
          <button type="button" className="ex-small" onClick={() => setMuted(m => !m)} aria-pressed={muted} aria-label={muted ? 'Unmute the exchange' : 'Mute the exchange'}>
            {muted ? 'silent' : 'sound'} <kbd>M</kbd>
          </button>
        </div>
      </header>

      <div className="ex-town">
        <canvas ref={townRef} className="ex-town-canvas" aria-hidden="true" />
        <p className="ex-town-caption">
          river at mark {['I', 'II', 'III', 'IV', 'V'][Math.min(4, Math.max(0, Math.floor(night.river / 0.2 + 0.001) - 1))]}
          {night.flags.sluiceOpen ? ' · sluice open' : ''}{night.flags.bellRung ? ' · bell rung' : ''}{!night.jacks.ferry.up ? ' · ferry wire down' : ''}{!night.jacks.mill.up ? ' · mill line under' : ''}
        </p>
      </div>

      <main className="ex-main">
        <section
          ref={consoleRef}
          className="ex-console"
          data-playground-surface
          data-testid="exchange-nocturne-board"
          aria-label="Switchboard. Twelve subscriber jacks above, four cord pairs below. Drag a plug to a jack, or tap a plug and then a jack."
          onPointerMove={onPlugMove}
          onPointerUp={onPlugUp}
          onPointerCancel={() => { dragRef.current = null; bump() }}
        >
          <ol className="ex-board" aria-label="Subscriber jacks">
            {JACKS.map((j, index) => {
              const call = lampCall(night, j.id)
              const plug = jackPlug(night, j.id)
              const up = night.jacks[j.id].up
              const urgency = call ? 1 - call.patience / call.patienceMax : 0
              const plugCall = plug ? pairCall(night, plug.pair) : null
              const talking = plugCall && plugCall.state === 'talking'
              const pinned = pins.includes(j.id)
              const state = !up ? 'down' : call ? 'calling' : talking ? 'talking' : plug ? 'plugged' : 'quiet'
              return (
                <li key={j.id} className="ex-cell-wrap">
                  <button
                    type="button"
                    ref={el => { cellRefs.current[j.id] = el }}
                    className={`ex-jack is-${state} ${pinned ? 'is-pinned' : ''} ${selected ? 'is-target' : ''}`}
                    style={{ '--ex-urgency': urgency.toFixed(2) }}
                    onClick={() => onJack(j.id)}
                    onKeyDown={event => onJackKey(event, index)}
                    data-playground-action={call ? 'answer-lamp' : 'jack'}
                    data-testid={`jack-${j.id}`}
                    aria-label={`Jack ${j.no}, ${j.name}, ${j.who}. ${state === 'calling' ? 'Calling.' : state === 'down' ? 'Line dead.' : state === 'talking' ? 'On a call.' : state === 'plugged' ? 'Plugged.' : 'Quiet.'}${pinned ? ' Your notes point here.' : ''}`}
                  >
                    <span className="ex-shutter" aria-hidden="true"><span className="ex-lamp" /></span>
                    <span className="ex-plate">
                      <span className="ex-no">{j.no}</span>
                      <span className="ex-name" data-short={j.short}>{j.name}</span>
                      <span className="ex-who">{j.who}</span>
                    </span>
                    <span ref={el => { holeRefs.current[j.id] = el }} className="ex-hole" aria-hidden="true" />
                    {pinned && <span className="ex-pin" aria-hidden="true">your notes</span>}
                    {call && <span className="ex-patience" aria-hidden="true" />}
                  </button>
                </li>
              )
            })}
          </ol>

          <div className="ex-shelf" aria-label="Cord pairs">
            {PAIRS.map(p => {
              const pair = night.pairs[p.id]
              const call = pairCall(night, p.id)
              const status = pairStatus(night, p.id)
              const canRing = call && call.state === 'request' && pair.call && pair.call !== call.from
              const finished = (pair.answer || pair.call) && (!call || ['cleared', 'missed'].includes(call.state))
              const onHead = night.headset === p.id
              return (
                <div key={p.id} className={`ex-pair is-${status.tone} ${onHead ? 'is-head' : ''}`} style={{ '--ex-cord': p.color }} data-testid={`pair-${p.id}`}>
                  <div className="ex-pair-top">
                    <span className="ex-socket" ref={el => { socketRefs.current[`${p.id}-answer`] = el }} aria-hidden="true">A</span>
                    <span className="ex-socket" ref={el => { socketRefs.current[`${p.id}-call`] = el }} aria-hidden="true">C</span>
                    <span className={`ex-super ${call && call.state === 'cleared' ? 'is-on' : ''} ${call && call.state === 'missed' ? 'is-dead' : ''}`} aria-hidden="true" />
                    <button type="button" className={`ex-key ex-listen ${onHead ? 'is-on' : ''}`} onClick={() => listenPair(p.id)} aria-pressed={onHead} disabled={!pair.answer && !pair.call} aria-label={`Listen on the ${p.name} pair`} data-playground-action="listen">
                      <span aria-hidden="true">◖</span>
                    </button>
                    {finished ? (
                      <button type="button" className="ex-key ex-clear" onClick={() => clearOne(p.id)} aria-label={`Pull both ${p.name} cords`} data-playground-action="clear">pull</button>
                    ) : (
                      <button type="button" className={`ex-key ex-ring ${call && call.state === 'ringing' ? 'is-on' : ''}`} onClick={() => ringPair(p.id)} disabled={!canRing} aria-label={`Ring on the ${p.name} pair`} data-playground-action="ring">ring</button>
                    )}
                  </div>
                  <p className="ex-pair-status"><b>{p.name}</b> {status.text}</p>
                </div>
              )
            })}
          </div>

          <svg className="ex-cords" width={g.width} height={g.height} aria-hidden="true">
            {PAIRS.map(p => ['answer', 'call'].map(end => (
              <g key={`${p.id}-${end}`} className="ex-cord">
                <path className="ex-cord-shade" d="" />
                <path ref={el => { cordRefs.current[`${p.id}-${end}`] = el }} className="ex-cord-core" stroke={p.color} d="" />
                <path className="ex-cord-braid" d="" />
              </g>
            )))}
          </svg>

          <div className="ex-plugs">
            {PAIRS.map(p => ['answer', 'call'].map(end => {
              const key = `${p.id}-${end}`
              const pos = plugPosition(p.id, end)
              const isSel = selected && selected.pair === p.id && selected.end === end
              const jackId = night.pairs[p.id][end]
              return (
                <button
                  key={key}
                  type="button"
                  ref={el => { plugRefs.current[key] = el }}
                  className={`ex-plug is-${end} is-${pos.state} ${isSel ? 'is-selected' : ''}`}
                  style={{ '--ex-cord': p.color, transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%) rotate(${pos.state === 'socket' ? 0 : end === 'answer' ? -8 : 8}deg)` }}
                  onPointerDown={event => onPlugDown(event, p.id, end)}
                  onKeyDown={event => onPlugKey(event, p.id, end)}
                  aria-pressed={isSel}
                  aria-label={`${p.name} ${END_WORD[end]} plug${jackId ? `, in ${JACK[jackId].name}. Press to pull it.` : '. Press to pick it up.'}`}
                  data-playground-action={end === 'answer' ? 'answer-plug' : 'call-plug'}
                  data-testid={`plug-${key}`}
                >
                  <span className="ex-plug-tip" aria-hidden="true" />
                  <span className="ex-plug-sleeve" aria-hidden="true">{end === 'answer' ? 'A' : 'C'}</span>
                </button>
              )
            }))}
          </div>
        </section>

        <aside className="ex-side">
          <section className="ex-earpiece" aria-label="Operator's earpiece">
            <header className="ex-ear-head">
              <span>earpiece</span>
              <button type="button" className="ex-switch" onClick={cycleHeadset} disabled={!started || night.phase !== 'night' || !night.pairs.some(p => p.answer || p.call)} data-playground-action="switch-line">
                switch line ⇄ <kbd>L</kbd>
              </button>
              <span className="ex-ear-pair" style={{ '--ex-cord': night.headset === null ? 'transparent' : PAIRS[night.headset].color }}>
                {night.headset === null ? 'no line' : `${PAIRS[night.headset].name} pair`}
              </span>
            </header>

            {started && night.phase === 'night' && headCall && (headCall.state === 'request' || headCall.state === 'choice') && (
              <div className="ex-request" style={{ '--ex-cord': PAIRS[night.headset].color, '--ex-hold': headCall.patience / headCall.patienceMax }}>
                <p className="ex-request-who">{JACK[headCall.from].who} · {JACK[headCall.from].name}</p>
                <p className="ex-request-text">“{headEvent.request}”</p>
                {headCall.state === 'request' && (
                  <p className="ex-request-help">
                    {night.pairs[night.headset].call
                      ? night.pairs[night.headset].call === headCall.lastWrong
                        ? `${JACK[headCall.lastWrong].name} was no good. Pull the call cord and try another line.`
                        : 'Ring the call cord, or move it.'
                      : 'Put the call cord C into the line they want.'}
                    {pins.length > 0 && <> Your notes point at <b>{pins.map(id => JACK[id].name).join(' or ')}</b>.</>}
                    {headEvent.hints && pins.length === 0 && <> You have nothing noted for this. Guess, or wish you had listened.</>}
                  </p>
                )}
                {headCall.state === 'choice' && (
                  <div className="ex-choices" role="group" aria-label="Your answer">
                    {headEvent.choices.map((c, i) => {
                      const allowed = !c.needs || night.flags[c.needs]
                      return (
                        <button key={c.id} type="button" onClick={() => pick(night.headset, c.id)} disabled={!allowed} data-playground-action={`choose-${c.id}`}>
                          <kbd>{i + 1}</kbd> {c.label}
                        </button>
                      )
                    })}
                  </div>
                )}
                <span className="ex-hold" aria-hidden="true" />
              </div>
            )}

            {night.phase === 'dawn' && ending ? (
              <div className="ex-ledger" data-testid="exchange-ledger">
                <p className="ex-ledger-kicker">the exchange book · 05:00</p>
                <h2>{ending.epithet}</h2>
                <ol>
                  {ending.threads.map(t => (
                    <li key={t.id} className={t.good === true ? 'is-good' : t.good === false ? 'is-bad' : 'is-open'}>
                      <b>{t.title}</b> {t.text}
                    </li>
                  ))}
                </ol>
                <p className="ex-ledger-stats">
                  {ending.kept} {ending.stats.connected} calls put through, {ending.stats.missed + ending.stats.cut} lost, {ending.stats.misroutes} wrong {ending.stats.misroutes === 1 ? 'line' : 'lines'}. you overheard {ending.stats.heard} lines and {ending.stats.facts} of {ending.stats.factTotal} things worth knowing.
                </p>
                <button type="button" className="ex-primary" onClick={restart} data-playground-action="restart">Work another night <kbd>R</kbd></button>
                {book.length > 1 && (
                  <ul className="ex-book" aria-label="Earlier nights">
                    {book.slice(1).map((b, i) => <li key={i}><span>{b.marks}</span> {b.epithet} <small>{b.at}</small></li>)}
                  </ul>
                )}
              </div>
            ) : (
              <ol ref={logRef} className="ex-log" aria-live="off">
                {!started && (
                  <li className="ex-intro">
                    <p className="ex-intro-kicker">22:00 · the operator's chair</p>
                    <h2>Twelve lines, four cords, one headset. The river is rising.</h2>
                    <p>When a lamp drops, put an <b>answer</b> plug in that jack and hear what they want. Then put the same pair's <b>call</b> plug where they want to go and <b>ring</b>.</p>
                    <p>Nobody gives you a directory for tonight. Keep the headset on a call and you hear things. What you hear is the only map you get.</p>
                    <button type="button" className="ex-primary" onClick={begin} data-playground-primary data-testid="exchange-begin">Take the headset ↗</button>
                    <p className="ex-keys">drag or tap plug → tap jack · <kbd>A</kbd> answer cord · <kbd>C</kbd> call cord · <kbd>1</kbd>–<kbd>0</kbd> jacks · <kbd>R</kbd> ring · <kbd>L</kbd> listen · <kbd>X</kbd> pull finished · arrows move on the board</p>
                  </li>
                )}
                {night.log.map(entry => (
                  <li key={entry.id} className={`ex-entry is-${entry.kind} ${entry.tone ? `is-${entry.tone}` : ''}`} style={{ '--ex-cord': entry.pair === undefined || entry.pair === null ? 'transparent' : PAIRS[entry.pair].color }}>
                    <span className="ex-entry-time">{clockText(entry.at)}</span>
                    {entry.kind === 'line' || entry.kind === 'request' || entry.kind === 'grumble' ? (
                      <span className="ex-entry-text">
                        <b>{speakerName(entry.who)}</b>{' '}
                        {entry.fact ? <mark className={entry.fresh ? 'is-fresh' : ''}>{entry.text}</mark> : entry.text}
                      </span>
                    ) : entry.kind === 'operator' ? (
                      <span className="ex-entry-text"><b>you</b> {entry.text}</span>
                    ) : (
                      <span className="ex-entry-text">{entry.text}</span>
                    )}
                  </li>
                ))}
                {started && lampsLit > 0 && night.phase === 'night' && (
                  <li className="ex-entry is-hint"><span className="ex-entry-text">{lampsLit === 1 ? 'a lamp is down on the board.' : `${lampsLit} lamps are down on the board.`}</span></li>
                )}
              </ol>
            )}
          </section>

          <section className="ex-docket" aria-label="Your notes">
            <header><span>notes</span><span>{night.facts.length} / {Object.keys(FACTS).length}</span></header>
            <ul>
              {[...night.facts].reverse().concat(Object.keys(FACTS).filter(id => !night.facts.includes(id))).map(id => {
                const known = night.facts.includes(id)
                return (
                  <li key={id} className={`${known ? 'is-known' : ''} ${freshFact === id ? 'is-fresh' : ''}`}>
                    {known ? FACTS[id].text : '· · · not overheard · · ·'}
                  </li>
                )
              })}
            </ul>
          </section>
        </aside>
      </main>
      <p className="ex-sr" aria-live="polite">{announce}</p>
    </div>
  )
}

function houseHeight(id, H) {
  const table = { lighthouse: 0.44, church: 0.24, mill: 0.22, station: 0.18, farm: 0.17, inn: 0.21, school: 0.19 }
  return H * (table[id] || 0.15) * 1.3
}

function mixColor(a, b, t) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16))
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`
}

// A cord is a short verlet rope pinned at its shelf hole and its plug.
function ropePath(ropes, key, anchor, tip, reduced, floor) {
  const dist = Math.hypot(tip.x - anchor.x, tip.y - anchor.y)
  const slack = Math.min(96, 20 + dist * 0.09)
  if (reduced) {
    const mx = (anchor.x + tip.x) / 2
    const my = Math.min(Math.max(anchor.y, tip.y) + slack * 0.6, (4 * floor - anchor.y - tip.y) / 2)
    return `M ${anchor.x} ${anchor.y} Q ${mx} ${my} ${tip.x} ${tip.y}`
  }
  let rope = ropes[key]
  if (!rope) {
    rope = Array.from({ length: ROPE_POINTS }, (_, i) => {
      const t = i / (ROPE_POINTS - 1)
      const x = anchor.x + (tip.x - anchor.x) * t
      const y = anchor.y + (tip.y - anchor.y) * t
      return { x, y, ox: x, oy: y }
    })
    ropes[key] = rope
  }
  const seg = (dist + slack) / (ROPE_POINTS - 1)
  for (let i = 1; i < ROPE_POINTS - 1; i++) {
    const p = rope[i]
    const vx = (p.x - p.ox) * 0.95
    const vy = (p.y - p.oy) * 0.95
    p.ox = p.x
    p.oy = p.y
    p.x += vx
    p.y += vy + 0.55
  }
  for (let k = 0; k < 16; k++) {
    rope[0].x = anchor.x
    rope[0].y = anchor.y
    rope[ROPE_POINTS - 1].x = tip.x
    rope[ROPE_POINTS - 1].y = tip.y
    for (let i = 0; i < ROPE_POINTS - 1; i++) {
      const a = rope[i]
      const b = rope[i + 1]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = Math.hypot(dx, dy) || 0.001
      if (d <= seg) continue
      const diff = (d - seg) / d / 2
      const pinA = i === 0
      const pinB = i + 1 === ROPE_POINTS - 1
      if (!pinA) {
        a.x += dx * diff * (pinB ? 2 : 1)
        a.y += dy * diff * (pinB ? 2 : 1)
      }
      if (!pinB) {
        b.x -= dx * diff * (pinA ? 2 : 1)
        b.y -= dy * diff * (pinA ? 2 : 1)
      }
    }
    // The cord lies along the lip of the key shelf instead of falling out of the board.
    for (let i = 1; i < ROPE_POINTS - 1; i++) {
      if (rope[i].y > floor) rope[i].y = floor
    }
  }
  let d = `M ${rope[0].x.toFixed(1)} ${rope[0].y.toFixed(1)}`
  for (let i = 1; i < ROPE_POINTS - 1; i++) {
    const mx = (rope[i].x + rope[i + 1].x) / 2
    const my = (rope[i].y + rope[i + 1].y) / 2
    d += ` Q ${rope[i].x.toFixed(1)} ${rope[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`
  }
  d += ` L ${tip.x.toFixed(1)} ${tip.y.toFixed(1)}`
  return d
}
