import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  apply,
  createPacket,
  creaseFor,
  det,
  evaluatePacket,
  facetsAt,
  fitSlot,
  foldPacket,
  hullPoints,
  invert,
  markPoints,
  nearest,
  onPaper,
  rotatePacket,
  sealCheck,
  snapPoints,
  targetsFrom,
  thicknessAlong,
  turnPacket
} from './letterlock/fold-core'
import { LETTERS } from './letterlock/letters'
import { createPostAudio } from './letterlock/post-audio'
import './LetterlockPost.css'

const MAT = 340
const START_MIN = 23 * 60 + 30
const BOAT_MIN = 29 * 60
const COST = { fold: 7, undo: 2, turn: 1, seal: 4, sealFail: 4, restart: 5 }
const WAX_STICKS = 7
const SEAL_R = 12
const BOOK_KEY = 'letterlock.post.nights'
const HOLES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M']

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

const readBook = () => {
  try {
    const raw = window.localStorage.getItem(BOOK_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeBook = nights => {
  try {
    window.localStorage.setItem(BOOK_KEY, JSON.stringify(nights.slice(0, 6)))
  } catch {
    // Private windows refuse storage; the night still ends.
  }
}

const clockText = min => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

const originFor = letter => [(MAT - letter.sheet.w) / 2, (MAT - letter.sheet.h) / 2]

const nearEdge = (poly, q) => poly.some((a, i) => {
  const b = poly[(i + 1) % poly.length]
  const ex = b[0] - a[0]
  const ey = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * ex + (q[1] - a[1]) * ey) / (ex * ex + ey * ey)))
  return Math.hypot(q[0] - a[0] - ex * t, q[1] - a[1] - ey * t) < 0.8
})

// A fold laid along a raw edge leaves no crease in the paper.
const realCreases = (creases, poly) => creases.filter(c => {
  const mid = [(c.a[0] + c.b[0]) / 2, (c.a[1] + c.b[1]) / 2]
  return !(nearEdge(poly, c.a) && nearEdge(poly, c.b) && nearEdge(poly, mid))
})

const tickPath = ([x, y], W, H) => {
  if (y <= 0) return `M${x} 0 v8`
  if (y >= H) return `M${x} ${H} v-8`
  if (x <= 0) return `M0 ${y} h8`
  if (x >= W) return `M${W} ${y} h-8`
  return `M${x - 4} ${y} h8 M${x} ${y - 4} v8`
}

const ptsAttr = pts => pts.map(q => `${q[0].toFixed(2)},${q[1].toFixed(2)}`).join(' ')
const matAttr = m => `matrix(${m.map(v => v.toFixed(5)).join(' ')})`

const allSnaps = (packet, letter) => [...snapPoints(packet), ...markPoints(packet, letter.marks)]

const phraseOf = (words, ids) => {
  const sorted = [...ids].sort((a, b) => a - b)
  const parts = []
  let run = []
  for (const id of sorted) {
    if (run.length && id !== run.at(-1) + 1) { parts.push(run); run = [] }
    run.push(id)
  }
  if (run.length) parts.push(run)
  return parts.map(r => r.map(id => words[id].text).join(' ')).join(' … ')
}

const firstLine = letter => {
  const body = letter.words.filter(w => w.face === 'front' && w.role === 'body')
  const out = []
  for (const w of body) {
    out.push(w.id)
    if (/[.,]$/.test(w.text) && out.length > 6) break
    if (out.length > 16) break
  }
  return out
}

const outcomeOf = (letter, ev, sealedOk) => {
  if (!ev.addressReadable) return { code: 'dead', label: 'dead-letter office', ids: firstLine(letter), tone: 'bad' }
  const leakedIds = ev.leaked.map(w => w.id)
  if (!sealedOk) {
    const ids = [...new Set([...leakedIds, ...firstLine(letter)])]
    return { code: 'loose', label: 'arrived with a loose flap', ids, tone: 'bad' }
  }
  if (leakedIds.length) return { code: 'read', label: `delivered, ${leakedIds.length} word${leakedIds.length === 1 ? '' : 's'} showing`, ids: leakedIds, tone: 'mid' }
  return { code: 'kept', label: 'delivered sealed and silent', ids: [], tone: 'good' }
}

const EPITHETS = [
  [5, 'the clerk who kept the whole town’s mouth shut'],
  [4, 'a careful hand, nearly airtight'],
  [3, 'a fair clerk with a few loose corners'],
  [1, 'the gazette’s most reliable source'],
  [0, 'the clerk the postmaster thanks in print']
]

const LetterArt = ({ letter, idPrefix, leakedIds, creases }) => {
  const W = letter.sheet.w
  const H = letter.sheet.h
  const poly = ptsAttr(letter.sheet.poly)
  const leaked = new Set(leakedIds)
  const front = letter.words.filter(w => w.face === 'front')
  const back = letter.words.filter(w => w.face === 'back')
  const creaseLines = realCreases(creases, letter.sheet.poly).map((c, i) => (
    <line key={i} x1={c.a[0]} y1={c.a[1]} x2={c.b[0]} y2={c.b[1]} className="ll-crease-mem" />
  ))
  return (
    <defs>
      <g id={`${idPrefix}-front`}>
        <polygon points={poly} className="ll-face-front" />
        <polygon points={poly} fill={`url(#${idPrefix}-laid)`} />
        <line x1={W * 0.06} y1={0} x2={W * 0.06} y2={H} className="ll-margin" />
        {letter.marks.map((m, i) => <path key={i} d={tickPath(m, W, H)} className="ll-tick" />)}
        {front.map(w => (
          <g key={w.id}>
            {leaked.has(w.id) && <rect x={w.x - 1} y={w.y + w.h * 0.86} width={w.w + 2} height={1.6} className="ll-leak" />}
            <text x={w.vx} y={w.vy} fontSize={w.size} textLength={w.w} lengthAdjust="spacingAndGlyphs" className={`ll-word ll-ink-${w.ink}`}>{w.text}</text>
          </g>
        ))}
        {creaseLines}
      </g>
      <g id={`${idPrefix}-back`}>
        <polygon points={poly} className="ll-face-back" />
        <polygon points={poly} fill={`url(#${idPrefix}-laid)`} />
        <g transform={`matrix(-1 0 0 1 ${W} 0)`}>
          {back.map(w => (
            <g key={w.id}>
              {leaked.has(w.id) && <rect x={w.vx - 1} y={w.vy - w.size * 0.8 + w.h * 0.86} width={w.w + 2} height={1.6} className="ll-leak" />}
              <text x={w.vx} y={w.vy} fontSize={w.size} textLength={w.w} lengthAdjust="spacingAndGlyphs" className={`ll-word ${w.role === 'address' ? 'll-address' : `ll-ink-${w.ink}`}`}>{w.text}</text>
            </g>
          ))}
        </g>
        {creaseLines}
      </g>
      <pattern id={`${idPrefix}-laid`} width="6" height="3.2" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0.5" x2="6" y2="0.5" className="ll-laid" />
      </pattern>
    </defs>
  )
}

const Packet = ({ packet, idPrefix, lifted, settle, posting, reduced }) => {
  const sorted = [...packet.facets].sort((a, b) => a.z - b.z)
  const n = sorted.length
  return (
    <g className={`ll-packet ${posting ? 'is-posting' : ''} ${reduced ? 'is-still' : ''}`}>
      {sorted.map((f, i) => {
        const up = det(f.m) > 0
        const pts = ptsAttr(f.pts)
        const isLifted = lifted && f.moved
        const depth = n > 1 ? i / (n - 1) : 1
        return (
          <g key={f.id} className={`${isLifted ? 'is-lifted' : ''} ${settle && f.moved ? 'is-settling' : ''}`}>
            <polygon points={pts} className="ll-shadow" transform={isLifted ? 'translate(6 9)' : 'translate(1.2 2)'} />
            <clipPath id={`${idPrefix}-c${f.id}`}><polygon points={pts} /></clipPath>
            <g clipPath={`url(#${idPrefix}-c${f.id})`}>
              <use href={`#${idPrefix}-${up ? 'front' : 'back'}`} transform={matAttr(f.m)} />
              <polygon points={pts} className="ll-shade" style={{ opacity: (1 - depth) * 0.16 }} />
            </g>
            <polygon points={pts} className="ll-edge" />
          </g>
        )
      })}
    </g>
  )
}

const CreaseMap = ({ result, small }) => {
  const { letter } = result
  const creases = realCreases(result.creases, letter.sheet.poly)
  const W = letter.sheet.w
  const H = letter.sheet.h
  return (
    <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} className={`ll-map ${small ? 'is-small' : ''}`} role="img" aria-label={`Crease pattern of the letter from ${letter.from}: ${creases.length} creases`}>
      <polygon points={ptsAttr(letter.sheet.poly)} className="ll-map-sheet" />
      {letter.words.filter(w => w.face === 'front').map(w => (
        <rect key={w.id} x={w.x} y={w.y} width={w.w} height={w.h * 0.7} className={`ll-map-word ${result.outcome.ids.includes(w.id) ? 'is-read' : ''}`} />
      ))}
      {letter.words.filter(w => w.face === 'back' && result.outcome.ids.includes(w.id)).map(w => (
        <rect key={`b${w.id}`} x={w.x} y={w.y} width={w.w} height={w.h * 0.7} className="ll-map-word is-read is-back" />
      ))}
      {creases.map((c, i) => (
        <line key={i} x1={c.a[0]} y1={c.a[1]} x2={c.b[0]} y2={c.b[1]} className={`ll-map-${c.type}`} />
      ))}
      {result.seal && <circle cx={result.seal[0]} cy={result.seal[1]} r={SEAL_R * 0.8} className="ll-map-seal" />}
    </svg>
  )
}

const LetterlockPost = () => {
  const reduced = useReducedMotion()
  const audioRef = useRef(null)
  const svgRef = useRef(null)
  const [phase, setPhase] = useState('intro')
  const [index, setIndex] = useState(0)
  const letter = LETTERS[Math.min(index, LETTERS.length - 1)]
  const [packet, setPacket] = useState(() => createPacket(LETTERS[0].sheet, originFor(LETTERS[0])))
  const [history, setHistory] = useState([])
  const [mode, setMode] = useState('valley')
  const [drag, setDrag] = useState(null)
  const [seal, setSeal] = useState(null)
  const [sealArmed, setSealArmed] = useState(false)
  const [smears, setSmears] = useState([])
  const [wax, setWax] = useState(WAX_STICKS)
  const [clock, setClock] = useState(START_MIN)
  const [message, setMessage] = useState('Drag a corner of the letter to where it should land. The crease forms halfway between.')
  const [results, setResults] = useState([])
  const [posting, setPosting] = useState(false)
  const [settle, setSettle] = useState(0)
  const [refused, setRefused] = useState(0)
  const [muted, setMuted] = useState(false)
  const [kbd, setKbd] = useState(null)
  const kbdRef = useRef(null)
  const setCursor = useCallback(v => { kbdRef.current = v; setKbd(v) }, [])
  const [turned, setTurned] = useState(false)
  const [book, setBook] = useState([])
  const [flash, setFlash] = useState(null)
  const timers = useRef([])
  const [view, setView] = useState({ x: 0, y: 0, s: MAT })
  const viewRef = useRef(view)

  useEffect(() => {
    audioRef.current = createPostAudio()
    setBook(readBook())
    const pending = timers.current
    return () => {
      pending.forEach(clearTimeout)
      audioRef.current?.close()
    }
  }, [])

  useEffect(() => { audioRef.current?.setMuted(muted) }, [muted])

  const later = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms)
    timers.current.push(id)
  }, [])

  const sfx = useCallback((name, arg) => { audioRef.current?.[name]?.(arg) }, [])

  const spend = useCallback(min => setClock(c => c + min), [])

  const evalNow = useMemo(() => evaluatePacket(drag?.preview || packet, letter, seal), [drag, packet, letter, seal])
  const shownPacket = drag?.preview || packet
  const leakedIds = evalNow.leaked.map(w => w.id)
  const underCount = evalNow.leaked.filter(w => w.top < 0.34 && w.bottom >= 0.34).length
  const fit = evalNow.fit
  const timeLeft = BOAT_MIN - clock
  const sealedOk = Boolean(seal && evalNow.sealed.ok)
  const busy = phase !== 'desk' || posting

  const toSvg = useCallback(evt => {
    const svg = svgRef.current
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = evt.clientX
    pt.y = evt.clientY
    const p = pt.matrixTransform(ctm.inverse())
    return [p.x, p.y]
  }, [])

  const unitsPerPx = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect()
    return rect ? viewRef.current.s / rect.width : 1
  }, [])

  const buildPreview = useCallback((base, a, b, foldMode) => {
    const line = creaseFor(a, b)
    if (!line) return { a, b, line: null, preview: null }
    const thick = thicknessAlong(base, line)
    if (thick > letter.thick) return { a, b, line, preview: null, thick }
    const preview = foldPacket(base, line, foldMode)
    return { a, b, line, preview, thick }
  }, [letter])

  const commitFold = useCallback(d => {
    if (!d?.preview) {
      if (d?.thick > letter.thick) {
        sfx('thick')
        setMessage(`Too thick there: ${d.thick} layers. The bone folder slips. Fold somewhere thinner or undo.`)
      }
      return
    }
    setHistory(h => [...h, { packet, turned }])
    setPacket(d.preview)
    setSettle(s => s + 1)
    spend(COST.fold)
    sfx('fold', d.thick)
    const ev = evaluatePacket(d.preview, letter, null)
    const fitWord = ev.fit.fits ? `It fits hole ${letter.hole} now.` : `Footprint ${Math.round(ev.fit.w)} × ${Math.round(ev.fit.h)}, hole ${letter.hole} takes ${letter.slot.w} × ${letter.slot.h}.`
    const leakWord = ev.leaked.length ? `${ev.leaked.length} word${ev.leaked.length === 1 ? '' : 's'} still readable from outside.` : 'No words show outside.'
    setMessage(`${mode === 'valley' ? 'Folded over' : 'Folded under'}. ${fitWord} ${leakWord}${ev.addressReadable ? '' : ' The address is hidden.'}`)
  }, [packet, turned, letter, mode, sfx, spend])

  const locked = Boolean(seal)

  const placeSeal = useCallback(q => {
    setSealArmed(false)
    if (wax <= 0) {
      setMessage('No wax left tonight. Post it as it is, or let it wait.')
      return
    }
    if (!onPaper(packet, q)) {
      setMessage('The wax has to land on the letter.')
      return
    }
    const check = sealCheck(packet, letter.sheet, q, SEAL_R)
    setWax(w => w - 1)
    if (check.ok) {
      setSeal(q)
      spend(COST.seal)
      sfx('seal')
      setFlash({ kind: 'seal', at: q, key: Date.now() })
      setMessage(check.kind === 'flap' ? 'Sealed across a loose flap. Nobody lifts it without breaking the wax.' : 'Sealed across the open edges. The layers are bound together.')
    } else {
      setSmears(s => [...s, { at: q, key: Date.now() }])
      spend(COST.sealFail)
      sfx('sealFail')
      setMessage(`The wax holds nothing: ${check.reason}. One stick wasted.`)
    }
  }, [wax, packet, letter, spend, sfx])

  const onPointerDown = useCallback(evt => {
    if (busy) return
    audioRef.current?.unlock()
    const q = toSvg(evt)
    if (!q) return
    if (sealArmed) {
      placeSeal(q)
      return
    }
    if (locked) {
      setMessage('The wax is set. Undo to break the seal before folding again.')
      return
    }
    // Fingers land beside corners; a nearby corner or tick still counts as a grab.
    const r = (evt.pointerType === 'touch' ? 22 : 16) * unitsPerPx()
    const snapped = nearest(allSnaps(packet, letter), q, r)
    if (!snapped && !onPaper(packet, q)) return
    evt.currentTarget.setPointerCapture?.(evt.pointerId)
    const a = snapped || q
    sfx('lift')
    setCursor(null)
    setDrag({ a, b: a, line: null, preview: null, pointer: evt.pointerId })
  }, [busy, toSvg, sealArmed, placeSeal, locked, packet, letter, unitsPerPx, sfx, setCursor])

  const onPointerMove = useCallback(evt => {
    if (!drag || drag.pointer !== evt.pointerId) return
    const q = toSvg(evt)
    if (!q) return
    const r = 14 * unitsPerPx()
    const b = nearest(allSnaps(packet, letter).filter(p => Math.hypot(p[0] - drag.a[0], p[1] - drag.a[1]) > 2), q, r) || q
    setDrag({ ...buildPreview(packet, drag.a, b, mode), pointer: drag.pointer })
  }, [drag, toSvg, unitsPerPx, packet, letter, buildPreview, mode])

  const onPointerUp = useCallback(evt => {
    if (!drag || drag.pointer !== evt.pointerId) return
    const moved = Math.hypot(drag.b[0] - drag.a[0], drag.b[1] - drag.a[1])
    if (moved > 6) commitFold(drag)
    else setMessage('Press on the paper and drag: the point you grab is laid where you let go.')
    setDrag(null)
  }, [drag, commitFold])

  const undo = useCallback(() => {
    if (busy) return
    if (seal) {
      setSeal(null)
      spend(COST.undo)
      sfx('unfold')
      setMessage('You crack the seal. The stick is spent, but the letter opens.')
      return
    }
    if (!history.length) return
    const prev = history.at(-1)
    setHistory(h => h.slice(0, -1))
    setPacket(prev.packet)
    setTurned(prev.turned)
    spend(COST.undo)
    sfx('unfold')
    setMessage('Unfolded. The crease stays in the paper as a faint line.')
  }, [busy, seal, history, spend, sfx])

  // The lamp-camera leans in as the packet gets smaller.
  useEffect(() => {
    const hull = hullPoints(packet)
    const xs = hull.map(q => q[0])
    const ys = hull.map(q => q[1])
    const ext = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), letter.slot.w, letter.slot.h)
    const size = Math.min(MAT, Math.max(200, ext * 1.8))
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2
    const target = size >= MAT - 1 ? { x: 0, y: 0, s: MAT } : { x: cx - size / 2, y: cy - size / 2 + size * 0.03, s: size }
    const from = viewRef.current
    if (reduced) {
      viewRef.current = target
      setView(target)
      return undefined
    }
    let raf = 0
    const t0 = performance.now()
    const step = now => {
      const k = Math.min(1, (now - t0) / 520)
      const e = 1 - Math.pow(1 - k, 3)
      const v = { x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, s: from.s + (target.s - from.s) * e }
      viewRef.current = v
      setView(v)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [packet, letter, reduced])

  const rotate = useCallback(() => {
    if (busy) return
    const next = rotatePacket(packet)
    if (seal) setSeal(apply(next.spin, seal))
    setPacket(next)
    spend(COST.turn)
    sfx('turn')
    setMessage('A quarter turn on the desk. Nothing changes but which way it reads.')
  }, [busy, packet, seal, spend, sfx])

  const turnOver = useCallback(() => {
    if (busy) return
    if (seal) { setMessage('Sealed letters stay face up. Undo to break the seal first.'); return }
    setHistory(h => [...h, { packet, turned }])
    setPacket(p => turnPacket(p))
    setTurned(t => !t)
    spend(COST.turn)
    sfx('turn')
    setMessage('Turned over. What was underneath now faces you.')
  }, [busy, seal, packet, turned, spend, sfx])

  const restartLetter = useCallback(() => {
    if (busy) return
    setHistory([])
    setPacket(createPacket(letter.sheet, originFor(letter)))
    setSeal(null)
    setTurned(false)
    setSmears([])
    spend(COST.restart)
    sfx('unfold')
    setMessage('Smoothed flat under the lamp. The old creases still show.')
  }, [busy, letter, spend, sfx])

  const finishNight = useCallback((all, missed) => {
    const kept = all.filter(r => r.outcome.code === 'kept').length
    const epithet = EPITHETS.find(([n]) => kept >= n)[1]
    const entry = {
      at: new Date().toISOString().slice(0, 10),
      epithet,
      kept,
      marks: all.map(r => r.outcome.code)
    }
    const next = [entry, ...readBook()].slice(0, 6)
    writeBook(next)
    setBook(next)
    setResults(all)
    sfx('horn')
    setPhase('morning')
    setMessage(missed ? 'The boat left without the rest.' : 'The boat is gone. The gazette is on the step.')
  }, [sfx])

  const loadLetter = useCallback(i => {
    const next = LETTERS[i]
    setIndex(i)
    setPacket(createPacket(next.sheet, originFor(next)))
    setHistory([])
    setSeal(null)
    setTurned(false)
    setSmears([])
    setMessage(next.note)
  }, [])

  const post = useCallback(() => {
    if (busy) return
    const ev = evaluatePacket(packet, letter, seal)
    if (!ev.fit.fits) {
      setRefused(r => r + 1)
      sfx('refuse')
      setMessage(`It will not go into hole ${letter.hole}: ${Math.round(ev.fit.w)} × ${Math.round(ev.fit.h)} against ${letter.slot.w} × ${letter.slot.h}. Keep folding.`)
      return
    }
    const sealOk = Boolean(seal && ev.sealed.ok)
    const outcome = outcomeOf(letter, ev, sealOk)
    const hull = hullPoints(packet)
    const holder = seal ? [...facetsAt(packet, seal, -2)].sort((p, q) => q.z - p.z)[0] : null
    const result = { letter, outcome, creases: packet.creases, seal: holder ? apply(invert(holder.m), seal) : null, hull, folds: packet.folds }
    setPosting(true)
    sfx('post')
    setMessage(`Into hole ${letter.hole}: ${outcome.label}.`)
    const all = [...results, result]
    setResults(all)
    later(() => {
      setPosting(false)
      spend(3)
      if (all.length >= LETTERS.length) finishNight(all, false)
      else loadLetter(all.length)
    }, reduced ? 120 : 760)
  }, [busy, packet, letter, seal, results, sfx, later, reduced, spend, finishNight, loadLetter])

  // The boat does not wait.
  useEffect(() => {
    if (phase !== 'desk' || posting || clock < BOAT_MIN) return
    const missed = LETTERS.slice(results.length).map(l => ({ letter: l, outcome: { code: 'missed', label: 'missed the boat', ids: [], tone: 'bad' }, creases: [], seal: null, hull: [], folds: 0 }))
    finishNight([...results, ...missed], true)
  }, [clock, phase, posting, results, finishNight])

  const begin = useCallback(() => {
    audioRef.current?.unlock()
    setPhase('desk')
    setMessage(LETTERS[0].note)
  }, [])

  const newNight = useCallback(() => {
    setResults([])
    setClock(START_MIN)
    setWax(WAX_STICKS)
    loadLetter(0)
    setPhase('desk')
  }, [loadLetter])

  // Keyboard folding: pick a corner, walk the target through snap points, fold.
  const kbdState = useCallback(base => {
    const hull = hullPoints(base)
    return { corner: 0, target: null, hull }
  }, [])

  const kbdPreview = useCallback(next => {
    if (!next || !next.target) { setDrag(null); return }
    const a = next.hull[next.corner % next.hull.length]
    setDrag({ ...buildPreview(packet, a, next.target, mode), pointer: 'kbd' })
  }, [packet, buildPreview, mode])

  useEffect(() => {
    if (kbd) kbdPreview(kbd)
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = evt => {
      const kbd = kbdRef.current
      if (evt.target.closest?.('input, textarea')) return
      const k = evt.key
      if (phase === 'intro') {
        if (k === 'Enter' || k === ' ') { evt.preventDefault(); begin() }
        return
      }
      if (phase === 'morning') {
        if (k === 'Enter') { evt.preventDefault(); newNight() }
        return
      }
      if (posting) return
      const lower = k.toLowerCase()
      if (lower === 'o') { setMuted(m => !m); return }
      if (lower === 'm') { setMode(m => (m === 'valley' ? 'mountain' : 'valley')); return }
      if (lower === 'z' || k === 'Backspace') { evt.preventDefault(); setCursor(null); setDrag(null); undo(); return }
      if (lower === 't') { setCursor(null); setDrag(null); turnOver(); return }
      if (lower === 'q') { setCursor(null); setDrag(null); rotate(); return }
      if (lower === 'p') { setCursor(null); setDrag(null); post(); return }
      if (lower === 'r') { setCursor(null); setDrag(null); restartLetter(); return }
      if (lower === 's') {
        const at = kbd?.target || (kbd ? kbd.hull[kbd.corner % kbd.hull.length] : null)
        if (at) { setDrag(null); setCursor(null); placeSeal(at) } else { setSealArmed(a => !a); setMessage('Wax is warm. Tap where it should go, or press C to pick a point with the keys.') }
        return
      }
      if (k === 'Escape') { setCursor(null); setDrag(null); setSealArmed(false); return }
      if (locked && ['c', '[', ']', 'enter', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(lower)) {
        setMessage('The wax is set. Undo to break the seal before folding again.')
        return
      }
      if (lower === 'c') {
        audioRef.current?.unlock()
        const base = kbd || kbdState(packet)
        const next = { ...base, corner: kbd ? base.corner + 1 : 0 }
        const a = next.hull[next.corner % next.hull.length]
        next.target = a
        setCursor(next)
        kbdPreview(null)
        setMessage('Corner picked. [ and ] walk the target through corners, edges and pencil ticks; arrows nudge; Enter folds.')
        return
      }
      if (!kbd) return
      const a = kbd.hull[kbd.corner % kbd.hull.length]
      if (k === '[' || k === ']') {
        const snaps = targetsFrom(packet, letter.marks, a)
        if (!snaps.length) return
        const cur = kbd.target ? snaps.findIndex(p => Math.hypot(p[0] - kbd.target[0], p[1] - kbd.target[1]) < 0.5) : -1
        const ni = cur < 0 ? (k === ']' ? 0 : snaps.length - 1) : (cur + (k === ']' ? 1 : -1) + snaps.length) % snaps.length
        const next = { ...kbd, target: snaps[ni] }
        setCursor(next)
        kbdPreview(next)
        return
      }
      if (k.startsWith('Arrow')) {
        evt.preventDefault()
        const step = evt.shiftKey ? 12 : 3
        const t = kbd.target || a
        const d = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] }[k]
        const next = { ...kbd, target: [Math.max(0, Math.min(MAT, t[0] + d[0])), Math.max(0, Math.min(MAT, t[1] + d[1]))] }
        setCursor(next)
        kbdPreview(next)
        return
      }
      if (k === 'Enter') {
        evt.preventDefault()
        if (kbd.target) commitFold(buildPreview(packet, a, kbd.target, mode))
        setDrag(null)
        setCursor(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, posting, setCursor, packet, letter, mode, buildPreview, locked, begin, newNight, undo, turnOver, rotate, post, restartLetter, placeSeal, kbdState, kbdPreview, commitFold])

  // Slot gauge, drawn around the packet at its best-fitting angle.
  const gauge = useMemo(() => {
    const f = fitSlot(shownPacket, letter.slot)
    return { ...f, sw: f.turned ? letter.slot.h : letter.slot.w, sh: f.turned ? letter.slot.w : letter.slot.h }
  }, [shownPacket, letter])

  const idPrefix = `ll-${letter.id}`
  const crease = drag?.line
  const creaseEnds = crease ? (() => {
    const t = [-crease.n[1], crease.n[0]]
    return [[crease.p[0] - t[0] * 600, crease.p[1] - t[1] * 600], [crease.p[0] + t[0] * 600, crease.p[1] + t[1] * 600]]
  })() : null
  const kbdCorner = kbd ? kbd.hull[kbd.corner % kbd.hull.length] : null
  const snapsShown = drag && drag.pointer !== 'kbd' ? allSnaps(packet, letter) : kbd ? allSnaps(packet, letter) : []
  const posted = results
  const holeOf = id => LETTERS.find(l => l.id === id)?.hole

  const column = phase === 'morning' ? results.map(r => {
    const name = r.letter.called
    const code = r.outcome.code
    if (code === 'kept') return { r, text: `Of the letter from ${name} we know nothing at all. It arrived sealed and kept its counsel.` }
    if (code === 'missed') return { r, text: `The letter from ${name} was still on the desk when the boat left. It will go next week, if the clerk does not read it first.` }
    const quote = phraseOf(r.letter.words, r.outcome.ids)
    if (code === 'dead') return { r, text: `The letter from ${name} went to the dead-letter office, where they open everything to find out who it is for. It begins: “${quote}”` }
    if (code === 'loose') return { r, text: `The letter from ${name} arrived with its flap loose, so naturally we looked: “${quote}”` }
    return { r, text: `Through the folds of the letter from ${name}, our sorters could make out “${quote}” and have drawn our own conclusions.` }
  }) : []
  const last = results.find(r => r.letter.id === 'postmaster')
  const kept = results.filter(r => r.outcome.code === 'kept').length

  return (
    <div className={`ll-root is-${phase} ${reduced ? 'll-reduced' : ''}`} data-testid="letterlock-post">
      <header className="ll-head">
        <Link to="/playground/linguistics" className="ll-back">← laboratory</Link>
        <div className="ll-title">
          <span className="ll-kicker">letterlock.post() · gull lane sorting room, the night before the boat</span>
          <h1>Fold it shut</h1>
        </div>
        <div className="ll-clock" aria-label={`Clock ${clockText(clock)}, the boat leaves at 05:00`}>
          <span className="ll-clock-time">{clockText(clock)}</span>
          <span className="ll-clock-bar" style={{ '--ll-progress': Math.min(1, (clock - START_MIN) / (BOAT_MIN - START_MIN)) }} aria-hidden="true" />
          <span className="ll-clock-note">{timeLeft > 0 ? `boat at 05:00 · ${Math.floor(timeLeft / 60)}h ${String(Math.round(timeLeft % 60)).padStart(2, '0')}m` : 'the boat has gone'}</span>
        </div>
        <button type="button" className="ll-mute" onClick={() => setMuted(m => !m)} aria-pressed={muted} aria-label={muted ? 'Unmute the sorting room' : 'Mute the sorting room'}>
          {muted ? 'sound off' : 'sound on'} <kbd>O</kbd>
        </button>
      </header>

      <main className="ll-main">
        <section className="ll-wall" aria-label="Pigeonhole wall">
          <div className="ll-wall-grid">
            {HOLES.map(h => {
              const target = LETTERS.find(l => l.hole === h)
              const done = posted.find(r => r.letter.hole === h)
              const current = phase === 'desk' && target && target.id === letter.id
              return (
                <div key={`${h}-${current ? refused : 0}`} className={`ll-hole ${current ? 'is-current' : ''} ${done ? `is-filled is-${done.outcome.tone}` : ''} ${current && refused ? 'is-refusing' : ''}`} data-testid={`hole-${h}`}>
                  <span className="ll-hole-label">{h}</span>
                  {target && <span className="ll-hole-size">{target.slot.w}×{target.slot.h}</span>}
                  {done && done.hull.length > 0 && (
                    <svg viewBox="0 0 100 100" className="ll-hole-packet" aria-hidden="true">
                      {(() => {
                        const xs = done.hull.map(q => q[0])
                        const ys = done.hull.map(q => q[1])
                        const x0 = Math.min(...xs)
                        const y0 = Math.min(...ys)
                        const s = 76 / Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0)
                        const pts = done.hull.map(q => [12 + (q[0] - x0) * s, 12 + (q[1] - y0) * s])
                        return (
                          <>
                            <polygon points={ptsAttr(pts)} className="ll-hole-paper" />
                            {done.outcome.code !== 'loose' && done.outcome.code !== 'dead' && <circle cx={pts[0][0] * 0.5 + 25} cy={pts[0][1] * 0.5 + 25} r="7" className="ll-hole-wax" />}
                          </>
                        )
                      })()}
                    </svg>
                  )}
                  {!target && <span className="ll-hole-old" aria-hidden="true" style={{ '--ll-old': (h.charCodeAt(0) % 5) / 5 }} />}
                </div>
              )
            })}
          </div>
          <p className="ll-wall-caption">{results.length} of {LETTERS.length} posted · wax {wax}/{WAX_STICKS}</p>
        </section>

        <section className="ll-desk">
          <div
            className={`ll-mat ${sealArmed ? 'is-sealing' : ''} ${drag ? 'is-dragging' : ''}`}
            data-playground-surface
            data-testid="letterlock-mat"
          >
            <svg
              ref={svgRef}
              viewBox={`${view.x.toFixed(2)} ${view.y.toFixed(2)} ${view.s.toFixed(2)} ${view.s.toFixed(2)}`}
              className="ll-svg"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => setDrag(null)}
              role="application"
              aria-label={`Folding mat. Letter from ${letter.from} to ${letter.to}. ${shownPacket.facets.length} layers. ${fit.fits ? 'Fits' : 'Does not fit'} hole ${letter.hole}.`}
            >
              <LetterArt letter={letter} idPrefix={idPrefix} leakedIds={leakedIds} creases={packet.creases} />
              <g className="ll-grid" aria-hidden="true">
                {Array.from({ length: 35 }, (_, i) => <line key={`v${i}`} x1={i * 20 - 170} y1="-170" x2={i * 20 - 170} y2={MAT + 170} />)}
                {Array.from({ length: 35 }, (_, i) => <line key={`h${i}`} x1="-170" y1={i * 20 - 170} x2={MAT + 170} y2={i * 20 - 170} />)}
              </g>
              <Packet key={`${letter.id}-${settle}`} packet={shownPacket} idPrefix={idPrefix} lifted={Boolean(drag?.preview)} settle={!drag && settle > 0} posting={posting} reduced={reduced} />
              {phase !== 'morning' && (
                <g
                  className={`ll-gauge ${gauge.fits ? 'is-fit' : ''}`}
                  transform={`translate(${gauge.cx} ${gauge.cy}) rotate(${gauge.deg})`}
                  aria-hidden="true"
                >
                  <rect x={-gauge.sw / 2} y={-gauge.sh / 2} width={gauge.sw} height={gauge.sh} rx="2" />
                  <text x={-gauge.sw / 2 + 4} y={-gauge.sh / 2 - 4}>hole {letter.hole} · {letter.slot.w}×{letter.slot.h}</text>
                </g>
              )}
              {smears.map(s => <circle key={s.key} cx={s.at[0]} cy={s.at[1]} r={SEAL_R * 0.7} className="ll-smear" />)}
              {seal && (
                <g className={`ll-seal ${sealedOk ? '' : 'is-weak'}`} transform={`translate(${seal[0]} ${seal[1]})`}>
                  <circle r={SEAL_R} className="ll-seal-wax" />
                  <circle r={SEAL_R * 0.62} className="ll-seal-ring" />
                  <text y="3.5" className="ll-seal-mark">GL</text>
                </g>
              )}
              {flash && <circle key={flash.key} cx={flash.at[0]} cy={flash.at[1]} r={SEAL_R} className="ll-ripple" />}
              {creaseEnds && (
                <line x1={creaseEnds[0][0]} y1={creaseEnds[0][1]} x2={creaseEnds[1][0]} y2={creaseEnds[1][1]} className={`ll-crease-guide is-${mode} ${drag?.preview ? '' : 'is-blocked'}`} />
              )}
              {snapsShown.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.6" className="ll-snap" />)}
              {drag && (
                <g aria-hidden="true">
                  <circle cx={drag.a[0]} cy={drag.a[1]} r="5" className="ll-grab" />
                  <circle cx={drag.b[0]} cy={drag.b[1]} r="6.5" className="ll-drop" />
                  <line x1={drag.a[0]} y1={drag.a[1]} x2={drag.b[0]} y2={drag.b[1]} className="ll-travel" />
                </g>
              )}
              {kbdCorner && !drag && <circle cx={kbdCorner[0]} cy={kbdCorner[1]} r="7" className="ll-grab is-kbd" />}
            </svg>
            <div className="ll-status" aria-hidden="true">
              <span className={fit.fits ? 'is-ok' : ''}>{fit.fits ? '✓' : '✗'} fits {letter.hole}</span>
              <span className={evalNow.addressReadable ? 'is-ok' : ''}>{evalNow.addressReadable ? '✓' : '✗'} address</span>
              <span className={evalNow.leaked.length ? 'is-bad' : 'is-ok'}>{evalNow.leaked.length ? `${evalNow.leaked.length} words show` : '✓ words hidden'}</span>
              <span className={sealedOk ? 'is-ok' : ''}>{sealedOk ? '✓' : '·'} sealed</span>
            </div>
            <p className="ll-mat-msg" aria-hidden="true">{message}</p>
            <div className="ll-mat-tag" aria-hidden="true">{turned ? 'face down' : 'face up'} · {shownPacket.facets.length} layer{shownPacket.facets.length === 1 ? '' : 's'} · {packet.folds} fold{packet.folds === 1 ? '' : 's'}</div>
          </div>

          <div className="ll-tray" role="toolbar" aria-label="Clerk’s tools">
            <button type="button" className={`ll-tool is-${mode}`} onClick={() => setMode(m => (m === 'valley' ? 'mountain' : 'valley'))} aria-pressed={mode === 'mountain'} aria-label={mode === 'valley' ? 'Folding over (valley). Switch to folding under' : 'Folding under (mountain). Switch to folding over'} disabled={busy} data-playground-action="fold-mode" data-testid="tool-mode">
              <span className="ll-tool-glyph" aria-hidden="true">{mode === 'valley' ? '⌄' : '⌃'}</span>
              {mode === 'valley' ? 'over' : 'under'} <kbd>M</kbd>
            </button>
            <button type="button" className="ll-tool" onClick={turnOver} disabled={busy} data-playground-action="turn-over" data-testid="tool-turn">turn over <kbd>T</kbd></button>
            <button type="button" className="ll-tool" onClick={rotate} disabled={busy} data-playground-action="rotate" data-testid="tool-rotate" aria-label="Rotate a quarter turn">⟳ quarter <kbd>Q</kbd></button>
            <button type="button" className="ll-tool" onClick={undo} disabled={busy || (!history.length && !seal)} data-playground-action="undo" data-testid="tool-undo">{seal ? 'break seal' : 'undo'} <kbd>Z</kbd></button>
            <button type="button" className={`ll-tool ll-wax-tool ${sealArmed ? 'is-armed' : ''}`} onClick={() => { audioRef.current?.unlock(); setSealArmed(a => !a); setMessage(sealArmed ? 'Wax put down.' : 'Wax is warm. Tap the letter where a loose edge lies on paper, or across the open edges.') }} aria-pressed={sealArmed} disabled={busy || Boolean(seal) || wax <= 0} data-playground-action="seal" data-testid="tool-seal">
              wax seal <kbd>S</kbd>
            </button>
            <button type="button" className="ll-tool" onClick={restartLetter} disabled={busy || (!history.length && !seal)} data-playground-action="flatten" data-testid="tool-flatten">flatten <kbd>R</kbd></button>
            <button type="button" className={`ll-tool ll-post ${fit.fits ? 'is-ready' : ''}`} onClick={post} disabled={busy} data-playground-action="post" data-testid="tool-post">post to {letter.hole} <kbd>P</kbd></button>
          </div>
        </section>

        <aside className="ll-docket" aria-live="polite">
          <div className="ll-envelope">
            <span className="ll-docket-n">letter {Math.min(index + 1, LETTERS.length)} of {LETTERS.length}</span>
            <p className="ll-from"><span>from</span> {letter.from}</p>
            <p className="ll-to"><span>to</span> {letter.to}</p>
          </div>
          <ul className="ll-checks">
            <li className={fit.fits ? 'is-ok' : ''} data-testid="check-fit">
              <b>{fit.fits ? '✓' : '·'}</b> fits hole {letter.hole}
              <em>{Math.round(fit.w)}×{Math.round(fit.h)} / {letter.slot.w}×{letter.slot.h}</em>
            </li>
            <li className={evalNow.addressReadable ? 'is-ok' : ''} data-testid="check-address">
              <b>{evalNow.addressReadable ? '✓' : '·'}</b> address shows
              <em>{evalNow.addressReadable ? (evalNow.addressFace === 'top' ? 'on top' : 'underneath') : 'hidden or split'}</em>
            </li>
            <li className={evalNow.leaked.length ? 'is-bad' : 'is-ok'} data-testid="check-words">
              <b>{evalNow.leaked.length ? evalNow.leaked.length : '✓'}</b> {evalNow.leaked.length ? `word${evalNow.leaked.length === 1 ? '' : 's'} readable` : 'no words outside'}
              <em>{underCount ? `${underCount} underneath` : evalNow.leaked.length ? 'marked in red' : 'all inside'}</em>
            </li>
            <li className={sealedOk ? 'is-ok' : ''} data-testid="check-seal">
              <b>{sealedOk ? '✓' : '·'}</b> sealed
              <em>{sealedOk ? 'wax holds' : `${wax} stick${wax === 1 ? '' : 's'} left`}</em>
            </li>
          </ul>
          {evalNow.leaked.length > 0 && (
            <p className="ll-overheard">the sorters could read: <q>{phraseOf(letter.words, evalNow.leaked.map(w => w.id)).slice(0, 120)}</q></p>
          )}
          <p className="ll-message" data-testid="letterlock-message">{message}</p>
          <details className="ll-keys">
            <summary>keys</summary>
            <p><kbd>C</kbd> pick a corner · <kbd>[</kbd> <kbd>]</kbd> choose where it lands · arrows nudge · <kbd>Enter</kbd> fold · <kbd>M</kbd> over/under · <kbd>T</kbd> turn over · <kbd>Q</kbd> quarter turn · <kbd>S</kbd> seal at the target · <kbd>Z</kbd> undo · <kbd>P</kbd> post</p>
          </details>
        </aside>
      </main>

      {phase === 'intro' && (
        <div className="ll-intro" role="dialog" aria-labelledby="ll-intro-title">
          <div className="ll-intro-card">
            <p className="ll-kicker">gull lane sorting room · 23:30</p>
            <h2 id="ll-intro-title">The last boat leaves at five</h2>
            <p>Five letters are still on the desk and there is not an envelope left in the building. Fold each one into a packet that fits its pigeonhole, keeps every word inside and shows its address, then press wax across a loose edge.</p>
            <p>Whatever can still be read from the outside, the postmaster prints in the morning gazette.</p>
            <p className="ll-intro-how">Drag any point of the paper to where it should land: the crease forms halfway between, through every layer. Switch to <em>fold under</em> to send a flap behind.</p>
            <button type="button" className="ll-begin" onClick={begin} data-playground-primary data-testid="letterlock-begin">take the first letter</button>
          </div>
        </div>
      )}

      {phase === 'morning' && (
        <div className="ll-morning" data-testid="letterlock-morning">
          <article className="ll-gazette">
            <header className="ll-masthead">
              <span>vol. ix · the morning after the boat</span>
              <h2>The Gull Lane Gazette</h2>
              <p>“The Sorting Table”, our postmaster’s weekly column of things overheard</p>
            </header>
            <div className="ll-column">
              {column.map(({ r, text }) => (
                <p key={r.letter.id} className={`is-${r.outcome.tone}`}>{text}</p>
              ))}
              <p className="ll-editor">
                {last && last.outcome.code === 'kept'
                  ? 'Editor’s note: the postmaster has asked that this column not appear next week. He did not say why.'
                  : last && last.outcome.code !== 'missed'
                    ? 'Editor’s note: one letter this week was addressed to the postmaster himself. We print it because we print everything.'
                    : 'Editor’s note: the postmaster’s own post is late. He is said to be furious.'}
              </p>
            </div>
            <section className="ll-ledger" aria-label="Crease patterns of tonight’s letters">
              <h3>The clerk’s ledger · {kept} of {LETTERS.length} kept</h3>
              <div className="ll-ledger-row">
                {results.map(r => (
                  <figure key={r.letter.id} className={`is-${r.outcome.tone}`}>
                    {r.creases.length ? <CreaseMap result={r} /> : <div className="ll-map ll-map-empty">flat</div>}
                    <figcaption><b>{holeOf(r.letter.id)}</b> {r.letter.from}<span>{r.outcome.label} · {r.folds} fold{r.folds === 1 ? '' : 's'}</span></figcaption>
                  </figure>
                ))}
              </div>
              <p className="ll-legend"><span className="is-valley">valley</span> <span className="is-mountain">mountain</span> <span className="is-read">read by the sorters</span> <span className="is-back">read off the back</span></p>
            </section>
            <section className="ll-book" aria-label="Past nights">
              <h3>{EPITHETS.find(([n]) => kept >= n)[1]}</h3>
              <ol>
                {book.map((n, i) => (
                  <li key={i}><span>{n.at}</span> {n.marks.map((m, j) => <i key={j} className={`ll-mark is-${m}`} title={m} />)} <em>{n.epithet}</em></li>
                ))}
              </ol>
              <button type="button" className="ll-begin" onClick={newNight} data-testid="letterlock-again">work another night <kbd>Enter</kbd></button>
            </section>
          </article>
        </div>
      )}
    </div>
  )
}

export default LetterlockPost
