import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './BorrowedTomorrow.css'

const START = '0,3'
const CHARTS = [
  { title: 'One body, two shores', subtitle: 'Teach yesterday to stay behind.', plates: ['1,1'], gates: ['3,3'], goal: '6,3', echoes: 1, tide: 16 },
  { title: 'A promise inside a promise', subtitle: 'Your second memory needs the first.', plates: ['1,1', '4,1'], gates: ['3,3', '5,3'], goal: '6,3', echoes: 2, tide: 18 },
  { title: 'Bring back the small sun', subtitle: 'Two memories hold the sea. You carry the light.', plates: ['1,1', '4,0'], gates: ['3,3', '5,3'], goal: '6,1', echoes: 2, tide: 14 }
]
const coords = key => key.split(',').map(Number)
const project = key => {
  const [x, y] = coords(key)
  return [350 + (x - y) * 43, 125 + (x + y) * 25]
}
const point = (key, height = 0) => {
  const [x, y] = project(key)
  return `${x},${y - height}`
}
const at = (tape, turn) => tape[Math.min(turn, tape.length - 1)]
const tilesFor = chapter => [...new Set([
  ...Array.from({ length: 7 }, (_, i) => `${i},3`), '1,2', '1,1',
  ...(chapter > 0 ? ['4,2', '4,1'] : []),
  ...(chapter === 2 ? ['4,0', '6,2', '6,1', '2,4'] : [])
])].sort((a, b) => coords(a).reduce((x, y) => x + y) - coords(b).reduce((x, y) => x + y))

function Walker({ tile, echo = false, number }) {
  const [x, y] = project(tile)
  return <g className={`bt-walker ${echo ? 'bt-echo' : ''}`} style={{ transform: `translate(${x}px, ${y - 19}px)` }} aria-hidden="true">
    <ellipse cy="18" rx="14" ry="6" className="bt-shadow" />
    <path d="M-10 12 L-7 -7 Q0 -15 7 -7 L10 12 Z" />
    <circle cy="-17" r="7" />
    <path d="M-5 -21 L-7 -27 L0 -23 L6 -27 L5 -20" />
    {echo ? <text y="5">{number}</text> : <circle cx="10" cy="2" r="4" className="bt-lantern" />}
  </g>
}

export default function BorrowedTomorrow() {
  const worldRef = useRef(null)
  const [chapter, setChapter] = useState(0)
  const [awake, setAwake] = useState(false)
  const [tape, setTape] = useState([START])
  const [echoes, setEchoes] = useState([])
  const [status, setStatus] = useState('walking')
  const [message, setMessage] = useState('Walk to the brass plate A. Bottle the journey. Begin again beside your memory.')
  const chart = CHARTS[chapter]
  const tiles = tilesFor(chapter)
  const turn = tape.length - 1
  const current = tape[turn]
  const carrying = chapter !== 2 || tape.includes('2,4')
  const gateOpen = (index, nextTurn = turn, nextTile = current) =>
    nextTile === chart.plates[index] || echoes.some(echo => at(echo, nextTurn) === chart.plates[index])

  const move = target => {
    if (!awake || status !== 'walking') return
    const [x, y] = coords(current)
    const [tx, ty] = coords(target)
    if (!tiles.includes(target) || Math.abs(x - tx) + Math.abs(y - ty) > 1) {
      setMessage('Only neighboring stones can carry you. The sea between them cannot.')
      return
    }
    const gate = chart.gates.indexOf(target)
    if (gate >= 0 && !gateOpen(gate, turn + 1, target)) {
      setMessage(`Gate ${'AB'[gate]} is shut. A memory must reach plate ${'AB'[gate]} on this turn. Wait if it is still walking.`)
      return
    }
    const next = [...tape, target]
    setTape(next)
    if (target === chart.goal && (chapter !== 2 || next.includes('2,4'))) {
      setStatus('won')
      setMessage(chapter === 2 ? 'The lighthouse remembers sunlight. Every self you left behind helped bring it home.' : 'The far shore is real. Yesterday stayed so tomorrow could cross.')
    } else if (next.length - 1 >= chart.tide) {
      setStatus('drowned')
      setMessage('High water. The path is lost, but your bottled journeys survive. Begin this walk again.')
    } else if (target === chart.goal) {
      setMessage('The lighthouse is empty. Fetch the small sun on the southern spur before coming home.')
    } else if (chart.plates.includes(target)) {
      setMessage(`Plate ${'AB'[chart.plates.indexOf(target)]} held. Bottle this journey: its memory will remain here after the last step.`)
    } else if (target === '2,4' && chapter === 2) {
      setMessage('The small sun is yours. Carry it to the lighthouse; your memories will hold the gates.')
    } else {
      setMessage(target === current ? 'You wait. Your memories take one more step.' : 'One step for you. One step for every remembered self.')
    }
  }
  const restartWalk = () => {
    worldRef.current?.focus({ preventScroll: true })
    worldRef.current?.scrollTo({ top: 0, behavior: 'instant' })
    setTape([START])
    setStatus('walking')
    setMessage('Back at low water. Your bottled selves will walk again, one step each time you move or wait.')
  }
  const bottle = () => {
    if (turn === 0 || echoes.length >= chart.echoes || status === 'won') return
    setEchoes([...echoes, [...tape]])
    restartWalk()
    setMessage(`Memory ${echoes.length + 1} bottled. It replays with you, then holds its final stone. Your route can now become someone else’s bridge.`)
  }
  const reset = (nextChapter = 0) => {
    worldRef.current?.focus({ preventScroll: true })
    worldRef.current?.scrollTo({ top: 0, behavior: 'instant' })
    setChapter(nextChapter)
    setEchoes([])
    setTape([START])
    setStatus('walking')
    setMessage(nextChapter === 0 ? 'Walk to plate A, then bottle the journey. Your past self will hold the gate.' : nextChapter === 1 ? 'First bottle a route to A. Then, with A held, bottle a second route through its gate to B.' : 'Bottle two gatekeepers. On your final walk, fetch the small sun from the southern spur and reach the lighthouse.')
  }
  const keyDown = event => {
    if (!awake || event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA/.test(event.target.tagName)) return
    const [x, y] = coords(current)
    const directions = { ArrowUp: `${x},${y - 1}`, ArrowDown: `${x},${y + 1}`, ArrowLeft: `${x - 1},${y}`, ArrowRight: `${x + 1},${y}` }
    if (directions[event.key]) { event.preventDefault(); move(directions[event.key]) }
    else if (event.key.toLowerCase() === 'w') { event.preventDefault(); move(current) }
    else if (event.key.toLowerCase() === 'b') { event.preventDefault(); bottle() }
  }

  return <main ref={worldRef} className={`bt-world bt-${status}`} tabIndex={0} aria-label="Borrowed tomorrow. Arrow keys walk, W waits, B bottles a journey." onKeyDown={keyDown}>
    <header className="bt-masthead">
      <Link to="/playground/emergence" className="bt-back">← laboratory</Link>
      <span>A CHART FOR SEVERAL SELVES</span>
      <button onClick={() => { reset(); setAwake(false) }}>restart atlas</button>
    </header>
    <div className="bt-title"><p>THE TIDAL ARCHIVE / {String(chapter + 1).padStart(2, '0')}</p><h1>Borrowed<br /><em>tomorrow.</em></h1><p>You cannot cross alone.<br /> Fortunately, you have been here before.</p></div>
    <section className="bt-stage" aria-label="Tidal causeway" data-playground-surface data-testid="borrowed-tomorrow-surface">
      <svg viewBox="110 80 570 410" role="img" aria-label={`Isometric causeway. You are on ${current}. ${echoes.length} memories. Turn ${turn}.`}>
        <defs>
          <pattern id="bt-sea-lines" width="100" height="32" patternUnits="userSpaceOnUse"><path d="M0 16 Q25 4 50 16 T100 16" fill="none" stroke="#f0e6d0" strokeWidth="1" opacity=".16" /></pattern>
          <radialGradient id="bt-halo"><stop stopColor="#f3bd60" stopOpacity=".55" /><stop offset="1" stopColor="#f3bd60" stopOpacity="0" /></radialGradient>
        </defs>
        <ellipse cx="392" cy="306" rx="345" ry="175" fill="url(#bt-sea-lines)" className="bt-water" />
        <g fill="none" stroke="#e9dfc9" opacity=".25"><ellipse cx="395" cy="305" rx="330" ry="150" /><ellipse cx="395" cy="305" rx="292" ry="128" /><path d="M123 420 H208 M165 378 V462" /><circle cx="165" cy="420" r="28" /></g>
        <text x="159" y="375" className="bt-map-label">N</text><text x="480" y="442" className="bt-map-label">LOW WATER / {chart.tide - turn}</text>
        {status === 'won' && <ellipse cx={project(chart.goal)[0]} cy={project(chart.goal)[1] - 70} rx="140" ry="145" fill="url(#bt-halo)" />}
        {echoes.map((echo, i) => <polyline key={i} points={echo.map(key => point(key, 9)).join(' ')} className={`bt-trail bt-trail-${i}`} />)}
        {tiles.map(tile => {
          const [x, y] = project(tile)
          const plate = chart.plates.indexOf(tile)
          const gate = chart.gates.indexOf(tile)
          const open = gate >= 0 && gateOpen(gate)
          const visited = tape.includes(tile)
          return <g key={tile} transform={`translate(${x} ${y})`} className={`bt-stone ${visited ? 'bt-visited' : ''} ${plate >= 0 ? 'bt-plate' : ''}`}>
            <path d="M-40 0 L0 23 L40 0 V17 L0 40 L-40 17 Z" className="bt-stone-side" />
            <path d="M-40 0 L0 -23 L40 0 L0 23 Z" className="bt-stone-top" />
            {plate >= 0 && <><path d="M-24 0 L0 -14 L24 0 L0 14 Z" className={gateOpen(plate) ? 'bt-plate-lit' : 'bt-plate-metal'} /><text y="5" className="bt-letter">{'AB'[plate]}</text><path d="M0 -24 V-62 H20" className="bt-flagpole" /><text x="11" y="-49" className="bt-flag">{'AB'[plate]}</text></>}
            {gate >= 0 && <g className={`bt-gate ${open ? 'bt-gate-open' : ''}`}><path d="M-28 8 V-46 L28 -14 V40" /><path d="M-19 -36 V13 M-5 -28 V21 M9 -20 V29 M23 -12 V37" /><text x="-25" y="-54" className="bt-gate-label">{open ? 'OPEN' : `GATE ${'AB'[gate]}`}</text></g>}
            {tile === chart.goal && <g className={`bt-lighthouse ${status === 'won' ? 'bt-lit' : ''}`}><path d="M-16 0 L-10 -70 H10 L16 0 Z" /><path d="M-17 -70 H17 L10 -85 H-10 Z" /><rect x="-7" y="-65" width="14" height="16" /><path d="M-19 -47 H19 M-19 -44 H19" /><path d="M-3 0 V-17 H5 V0" /></g>}
            {tile === '2,4' && chapter === 2 && !carrying && <g className="bt-sun"><circle cy="-15" r="10" /><path d="M0 -34 V-29 M0 -1 V4 M-19 -15 H-14 M14 -15 H19" /></g>}
            {tile === START && <text y="9" className="bt-letter">↗</text>}
          </g>
        })}
        {echoes.map((echo, i) => <Walker key={i} tile={at(echo, turn)} echo number={i + 1} />)}
        <Walker tile={current} />
      </svg>
      {awake && status === 'walking' && <div className="bt-map-actions" aria-label="Move to neighboring stone">{tiles.filter(tile => {
        const [x, y] = coords(tile), [cx, cy] = coords(current)
        return Math.abs(x - cx) + Math.abs(y - cy) === 1
      }).map(tile => {
        const [x, y] = project(tile)
        return <button key={tile} style={{ left: `${(x - 110) / 5.7}%`, top: `${(y - 80) / 4.1}%` }} aria-label={`Walk to ${tile}`} onClick={() => move(tile)} data-playground-action="walk">+</button>
      })}</div>}
      {!awake && <div className="bt-invitation"><span>01 / LEAVE A SELF BEHIND</span><h2>The sea permits<br />one impossible favor.</h2><p>Walk to a lettered plate. Bottle your route.<br />Your memory will hold the gate while you cross.</p><button data-playground-primary onClick={() => { setAwake(true); worldRef.current?.focus({ preventScroll: true }) }}>Step into low water ↗</button></div>}
      {awake && status !== 'walking' && <div className="bt-ending" role="status"><span>{status === 'won' ? 'SHORE REACHED' : 'THE TIDE CAME IN'}</span><h2>{status === 'won' ? chapter === 2 ? 'You brought the sun home.' : 'No self was left in vain.' : 'Water keeps no footprints.'}</h2><p>{message}</p><button onClick={() => status === 'drowned' ? restartWalk() : chapter < 2 ? reset(chapter + 1) : reset()}>{status === 'drowned' ? 'Try this walk again' : chapter < 2 ? 'Unfold the next chart →' : 'Begin another tomorrow'}</button></div>}
    </section>
    <aside className="bt-logbook">
      <div className="bt-chapter"><span>CHART {chapter + 1} OF 3</span><h2>{chart.title}</h2><p>{chart.subtitle}</p></div>
      <div className="bt-tide"><span>UNTIL HIGH WATER</span><strong>{String(Math.max(0, chart.tide - turn)).padStart(2, '0')}<small> steps</small></strong><div>{Array.from({ length: chart.tide }, (_, i) => <i key={i} className={i < turn ? 'bt-spent' : ''} />)}</div></div>
      <div className="bt-message" role="status" aria-live="polite">{message}</div>
      <div className="bt-directions" aria-label="Walking directions">{[['North', 0, -1, '↑'], ['West', -1, 0, '←'], ['East', 1, 0, '→'], ['South', 0, 1, '↓']].map(([name, dx, dy, arrow]) => {
        const [x, y] = coords(current)
        const target = `${x + dx},${y + dy}`
        return <button key={name} aria-label={`Walk ${name.toLowerCase()}`} disabled={!awake || status !== 'walking' || !tiles.includes(target)} onClick={() => move(target)} data-playground-action="direction">{arrow}<small>{name}</small></button>
      })}</div>
      <div className="bt-controls"><button disabled={!awake || status !== 'walking'} onClick={() => move(current)} data-playground-action="wait">Wait <kbd>W</kbd></button><button className="bt-bottle" disabled={!awake || !turn || echoes.length >= chart.echoes || status === 'won'} onClick={bottle} data-playground-action="bottle">Bottle journey <kbd>B</kbd></button></div>
      <div className="bt-memories"><span>BOTTLED JOURNEYS / {echoes.length} OF {chart.echoes}</span>{Array.from({ length: chart.echoes }, (_, i) => <div key={i} className={`bt-memory bt-memory-${i}`}><b>{i + 1}</b>{echoes[i] ? <><span>{Math.min(turn, echoes[i].length - 1)} / {echoes[i].length - 1} steps<br /><small>{turn >= echoes[i].length - 1 ? `holding ${at(echoes[i], turn)}` : 'walking beside you'}</small></span><svg viewBox="0 0 190 38" aria-hidden="true"><polyline points={echoes[i].map((key, n) => `${8 + n * 170 / Math.max(1, echoes[i].length - 1)},${32 - coords(key)[1] * 6}`).join(' ')} /></svg></> : <span>An empty bottle.<br /><small>A route waiting to be remembered.</small></span>}</div>)}</div>
      <div className="bt-foot-actions"><button disabled={!awake} onClick={restartWalk}>restart walk</button><button disabled={!echoes.length} onClick={() => { setEchoes(echoes.slice(0, -1)); restartWalk() }}>unbottle last</button></div>
      <p className="bt-instructions">Tap a neighboring + stone or use arrow keys. W waits; B bottles. Every step advances all memories. They stay on their final stone. Restart walk keeps bottles; restart atlas clears all three charts.</p>
      <div className="bt-legend"><span>● you / amber</span><span>● memory / blue</span><span>A B / plates & gates</span></div>
    </aside>
    <footer className="bt-colophon">A LITTLE COOPERATION WITH THE PERSON YOU WERE.<span>CLAWEDCODE / TIDAL STUDIES</span></footer>
  </main>
}
