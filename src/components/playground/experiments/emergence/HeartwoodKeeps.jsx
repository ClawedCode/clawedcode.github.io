import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ERAS, SPOTS, SPOT_ORDER, SAVE_THRESHOLD, GERMINATED } from './heartwood/story'
import {
  createGame, begin, act, continueEra, takeable, presentAt, spotOpen, spotClosedReason, objectsAt,
  needsFor, openNeeds, score, discMarks, epitaph, underground, objInfo, personName, rings
} from './heartwood/engine'
import { VIEW_W, VIEW_H, GROUND, TRUNK_X, treeShape, segPath, rootPath, anchors, GRASS_SPOTS, PERSON_SLOTS } from './heartwood/tree'
import { createDisc, markPosition } from './heartwood/rings'
import { createGreenAudio } from './heartwood/audio'
import { figurePaths, CAT_PATH, CAT_EYES, ICONS } from './heartwood/figures'
import './HeartwoodKeeps.css'

const SHED_KEY = 'heartwood-keeps.woodshed'
const UNDER_KEY = 'heartwood-keeps.underground'
const SPOT_KEYS = { 1: 'roots', 2: 'bark', 3: 'hollow', 4: 'fork', 5: 'crown' }
const MEMORIAL_X = TRUNK_X - 250
const catRest = (t, spot) => (spot === 'roots' ? { x: t.x + 40, y: t.y + 8 } : { x: t.x - 44, y: t.y + 6 })
const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh']

const readJSON = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}
const writeJSON = (key, value) => {
  try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
}

const ERA_TINT = {
  michaelmas: { leaf: ['#9a8a3a', '#c4a241', '#7d7a35'], bark: '#3b2c22', ground: ['#7f8a4b', '#5d6a37'], ink: '#2b2622', far: '#9aa39a' },
  jubilee: { leaf: ['#1f3324', '#2d4630', '#16261b'], bark: '#1c1512', ground: ['#1f2a1c', '#141b12'], ink: '#0d0b0b', far: '#2a2c46' },
  peace: { leaf: ['#4f6b3a', '#6b8547', '#3d5530'], bark: '#3a2e26', ground: ['#7e9356', '#5d723f'], ink: '#2d2a28', far: '#a9b1ad' },
  bypass: { leaf: ['#b06a2a', '#d3913b', '#8d4d22'], bark: '#3a2a20', ground: ['#8a8a4e', '#62653a'], ink: '#2a2420', far: '#8ea0a5' },
  storm: { leaf: ['#4d4a3c', '#5d5a48', '#3b392f'], bark: '#262220', ground: ['#5f6b5a', '#424c40'], ink: '#15171b', far: '#5b6676' }
}

const ICON_LABEL = {
  heart: '♥', letter: '✉', leave: '→', drop: '↓', pond: '≈', rain: '⋮', shoe: '∩', fire: '✶', cross: '✝',
  climb: '↑', lay: '⌒', bell: '◌', paint: '○', dig: '⌄', saw: '✕', wind: '~', proof: '✓'
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

const hashIndex = (key, n) => {
  let h = 11
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) % 104729
  return h % n
}

function ObjectIcon({ kind, relic, x, y, scale = 1, className = '' }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`} className={`hk-icon ${relic ? 'is-relic' : ''} ${className}`}>
      {relic && <circle r="20" className="hk-relic-halo" />}
      {(ICONS[kind] || []).map((p, i) => <path key={i} d={p.d} className={p.cls} />)}
    </g>
  )
}

function Figure({ look, name, x, y, present, needing, selected, droppable, onPick, holding, keyHint }) {
  const { paths, h } = useMemo(() => figurePaths(look), [look])
  const label = `${name}${needing ? `, needs something` : ''}`
  return (
    <g
      className={`hk-person ${present ? 'is-here' : ''} ${needing ? 'is-needing' : ''} ${selected ? 'is-selected' : ''} ${droppable ? 'is-droppable' : ''}`}
      transform={`translate(${x},${y})`}
      role="button"
      tabIndex={present ? 0 : -1}
      aria-label={label}
      data-testid={`hk-person-${keyHint}`}
      onClick={onPick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick() } }}
    >
      <ellipse cx="0" cy="2" rx={34} ry={7} className="hk-shadow" />
      <rect x={-58} y={-h - 30} width={116} height={h + 64} className="hk-hit" />
      {paths.map((p, i) => <path key={i} d={p.d} className={`hk-fig-${p.cls}`} />)}
      {needing && <circle cx="0" cy={-h - 20} r="7" className="hk-need-dot" />}
      {holding.length > 0 && (
        <g className="hk-holding">
          {holding.map((o, i) => <ObjectIcon key={o.id} kind={o.kind} relic={o.relic} x={-14 + i * 22} y={-h * 0.48} scale={0.6} />)}
        </g>
      )}
      <text y="30" className="hk-name">{name}</text>
    </g>
  )
}

const Tree = memo(function Tree({ age, year, tint, era, hour, reduced, falling, marks, verdictSaved }) {
  const shape = useMemo(() => treeShape(age, year), [age, year])
  const anc = useMemo(() => anchors(age, year), [age, year])
  const stormy = era === 'storm' && hour >= 5
  const tw = shape.tw
  const hasMark = kind => marks.some(m => m.kind === kind)
  const leafless = era === 'storm'
  const barkY = anc.bark.y
  return (
    <g className={`hk-tree ${reduced ? '' : stormy ? 'is-storm' : 'is-sway'} ${falling ? `is-falling is-${falling}` : ''}`} style={{ transformOrigin: `${TRUNK_X}px ${GROUND}px` }}>
      <path d={rootPath(age)} fill={tint.bark} />
      {shape.segs.map(s => <path key={s.id} d={segPath(s)} fill={tint.bark} className={s.depth === 0 ? 'hk-trunk' : ''} />)}
      {shape.segs.filter(s => s.depth <= 2).map(s => (
        <circle key={`j${s.id}`} cx={s.bx} cy={s.by} r={s.w1 / 2} fill={tint.bark} />
      ))}
      {shape.stubs.map((s, i) => (
        <g key={`stub${i}`}>
          <path d={`M${s.ax},${s.ay} L${s.bx},${s.by}`} stroke={tint.bark} strokeWidth={s.w * 0.9} strokeLinecap="round" />
          <circle cx={s.bx} cy={s.by} r={s.w * 0.32} className="hk-stub-face" />
        </g>
      ))}
      {/* bark furrows */}
      <g className="hk-furrows">
        {Array.from({ length: Math.round(tw / 16) }, (_, i) => {
          const x = TRUNK_X - tw / 2 + 8 + i * 16 + ((i * 37) % 7)
          return <path key={i} d={`M${x},${GROUND - 8} C${x - 3},${GROUND - shape.h * 0.14} ${x + 4},${GROUND - shape.h * 0.22} ${x + 1},${GROUND - shape.h * 0.3}`} />
        })}
      </g>
      {hasMark('carving') && (
        <g className={`hk-carving ${year > 1846 ? 'is-old' : ''}`} transform={`translate(${TRUNK_X + tw * 0.06},${GROUND - 98})`}>
          <text x="0" y="0" style={{ fontSize: year > 1846 ? 17 + (year - 1846) * 0.05 : 18 }}>A+H</text>
        </g>
      )}
      {hasMark('horseshoe') && (
        <path
          className={`hk-horseshoe ${year >= 1919 ? 'is-swallowed' : ''} ${year >= 1966 ? 'is-gone' : ''}`}
          d={`M${TRUNK_X + tw * 0.3 - 11},${GROUND - 150} C${TRUNK_X + tw * 0.3 - 13},${GROUND - 124} ${TRUNK_X + tw * 0.3 + 13},${GROUND - 124} ${TRUNK_X + tw * 0.3 + 11},${GROUND - 150}`}
        />
      )}
      {hasMark('firescar') && (
        <path className="hk-firescar" d={`M${TRUNK_X + tw / 2 - 4},${GROUND - 20} C${TRUNK_X + tw / 2 - 26},${GROUND - 90} ${TRUNK_X + tw / 2 - 14},${GROUND - 170} ${TRUNK_X + tw / 2 - 2},${GROUND - 210} Z`} style={{ opacity: year > 1887 ? 0.55 : 0.9 }} />
      )}
      {hasMark('paint') && (
        <path className={`hk-paint ${year > 1966 ? 'is-grown' : ''}`} d={`M${TRUNK_X - tw / 2},${barkY - 24} Q${TRUNK_X},${barkY - 10} ${TRUNK_X + tw / 2},${barkY - 24}`} />
      )}
      {year >= 1881 && (
        <ellipse cx={anc.hollow.x} cy={anc.hollow.y} rx={tw * 0.16} ry={tw * 0.26} className="hk-hollow-mouth" />
      )}
      {!leafless && (
        <g className="hk-canopy">
          {shape.leaves.map((l, i) => (
            <circle key={`s${i}`} cx={l.x + l.r * 0.18} cy={l.y + l.r * 0.28} r={l.r * 1.12} fill={tint.leaf[2]} />
          ))}
          {shape.leaves.map((l, i) => (
            <circle key={`m${i}`} cx={l.x} cy={l.y} r={l.r} fill={i % 4 === 0 ? tint.leaf[2] : tint.leaf[0]} />
          ))}
          {shape.leaves.filter((_, i) => i % 3 === 1).map((l, i) => (
            <circle key={`h${i}`} cx={l.x - l.r * 0.28} cy={l.y - l.r * 0.34} r={l.r * 0.58} fill={tint.leaf[1]} className="hk-leaf-hi" />
          ))}
        </g>
      )}
      {verdictSaved === false && falling && <rect x={TRUNK_X - tw} y={GROUND - 4} width={tw * 2} height={8} className="hk-cut" />}
    </g>
  )
})

function DaughterOak({ since, year, tint }) {
  const age = Math.max(4, year - since)
  const shape = useMemo(() => treeShape(age, year), [age, year])
  return (
    <g transform={`translate(${-TRUNK_X * 0.42 + 40},${GROUND * 0.58}) scale(0.42)`} className="hk-daughter" aria-hidden="true">
      {shape.segs.map(s => <path key={s.id} d={segPath(s)} fill={tint.bark} />)}
      {tint.leaf && year !== 2008 && shape.leaves.map((l, i) => <circle key={i} cx={l.x} cy={l.y} r={l.r} fill={tint.leaf[(i + 1) % 3]} />)}
    </g>
  )
}

const Scenery = memo(function Scenery({ era, hour, tint, reduced, memorial }) {
  const id = era.id
  const sky = era.sky[Math.min(hour, era.sky.length) - 1] || era.sky[0]
  const night = id === 'jubilee'
  const sunT = (hour - 1) / Math.max(1, era.hours.length - 1)
  const sunX = 120 + sunT * 760
  const sunY = 300 - Math.sin(sunT * Math.PI) * 180 + (id === 'jubilee' ? 260 * sunT : 0)
  const rain = (id === 'michaelmas' && hour >= 6) || (id === 'storm' && hour >= 5)
  const bonfire = id === 'jubilee' && hour >= 3
  return (
    <g className="hk-scenery">
      <defs>
        <linearGradient id="hk-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[1]} className="hk-stop" />
          <stop offset="0.85" stopColor={sky[0]} className="hk-stop" />
        </linearGradient>
        <linearGradient id="hk-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tint.ground[0]} />
          <stop offset="1" stopColor={tint.ground[1]} />
        </linearGradient>
        <radialGradient id="hk-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffb25a" stopOpacity="0.75" />
          <stop offset="1" stopColor="#ff6a2a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={-1000} y={-800} width={VIEW_W + 2000} height={VIEW_H + 1400} fill="url(#hk-sky)" />
      {night
        ? <circle cx={180 + sunT * 120} cy={210 - sunT * 40} r="26" className="hk-moon" />
        : <circle cx={sunX} cy={sunY} r={id === 'storm' ? 0 : 34} className={`hk-sun is-${id}`} />}
      {night && Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={(i * 211) % VIEW_W} cy={40 + ((i * 97) % 420)} r={i % 5 === 0 ? 1.8 : 1} className="hk-star" style={{ opacity: Math.min(1, (hour - 1) / 3) }} />
      ))}
      {/* far hills and the church that outlives everyone */}
      <path d={`M-1000,${GROUND - 140} C-700,${GROUND - 200} -300,${GROUND - 100} 0,${GROUND - 120} C180,${GROUND - 180} 320,${GROUND - 110} 520,${GROUND - 150} C700,${GROUND - 190} 860,${GROUND - 120} 1000,${GROUND - 160} C1300,${GROUND - 200} 1600,${GROUND - 110} 2000,${GROUND - 150} L2000,${GROUND} L-1000,${GROUND} Z`} fill={tint.far} opacity="0.55" />
      <g fill={tint.far} className="hk-church">
        <path d={`M820,${GROUND - 40} L820,${GROUND - 170} L846,${GROUND - 170} L858,${GROUND - 330} L870,${GROUND - 170} L896,${GROUND - 170} L896,${GROUND - 40} Z`} />
        <path d={`M896,${GROUND - 40} L896,${GROUND - 120} L980,${GROUND - 120} L990,${GROUND - 40} Z`} />
      </g>
      {/* village, by century */}
      {(id === 'michaelmas' || id === 'jubilee' || id === 'peace') && (
        <g fill={tint.far} className="hk-cottages">
          <path d={`M40,${GROUND - 30} L40,${GROUND - 92} L90,${GROUND - 130} L140,${GROUND - 92} L140,${GROUND - 30} Z`} />
          <path d={`M150,${GROUND - 30} L150,${GROUND - 80} L196,${GROUND - 112} L242,${GROUND - 80} L242,${GROUND - 30} Z`} />
          <path d={`M680,${GROUND - 30} L680,${GROUND - 84} L728,${GROUND - 118} L776,${GROUND - 84} L776,${GROUND - 30} Z`} />
          {night && [[70, 80], [110, 80], [186, 70], [706, 74], [750, 74]].map(([x, y], i) => <rect key={i} x={x} y={GROUND - y} width="12" height="14" className="hk-window" />)}
        </g>
      )}
      {id === 'bypass' && (
        <g className="hk-bypass">
          <path d={`M0,${GROUND - 26} L1000,${GROUND - 60} L1000,${GROUND - 34} L0,${GROUND + 4} Z`} className="hk-road" />
          <path d={`M0,${GROUND - 12} L1000,${GROUND - 47}`} className="hk-road-line" />
          {[90, 300, 690].map(x => <path key={x} d={`M${x},${GROUND - 30 - x * 0.034} l0,-150 l26,0`} className="hk-lamp" />)}
          <g transform={`translate(${hour >= 2 ? 120 : -200},${GROUND - 40})`} className="hk-digger">
            <path d="M0,0 L120,0 L120,-50 L70,-50 L60,-80 L20,-80 L20,-40 L0,-40 Z" />
            <path d="M110,-50 L170,-110 L210,-60 L196,-50 L170,-80 L120,-40 Z" />
            <circle cx="24" cy="4" r="16" /><circle cx="96" cy="4" r="16" />
          </g>
        </g>
      )}
      {id === 'storm' && (
        <g className="hk-estate">
          {[0, 1, 2, 3, 4, 5, 6].map(i => (
            <g key={i} transform={`translate(${30 + i * 140},${GROUND - 30})`}>
              <path d="M0,0 L0,-90 L50,-128 L100,-90 L100,0 Z" fill={tint.far} />
              {(i + hour) % 3 !== 0 && <rect x="18" y="-70" width="18" height="16" className="hk-window" />}
              {(i * 3 + hour) % 4 !== 0 && <rect x="62" y="-70" width="18" height="16" className="hk-window" />}
            </g>
          ))}
          {[250, 760].map(x => <g key={x}><path d={`M${x},${GROUND - 20} l0,-180 l-20,0`} className="hk-lamp" /><circle cx={x - 22} cy={GROUND - 196} r="7" className="hk-lamp-light" /></g>)}
        </g>
      )}
      {(id === 'jubilee' || id === 'peace') && (
        <g className="hk-bunting">
          <path d={`M0,${GROUND - 300} Q260,${GROUND - 220} ${TRUNK_X - 40},${GROUND - 330}`} />
          {Array.from({ length: 9 }, (_, i) => {
            const t = (i + 0.5) / 9
            const x = t * (TRUNK_X - 40)
            const y = GROUND - 300 + Math.sin(t * Math.PI) * 60 - t * 30
            return <path key={i} d={`M${x - 10},${y} L${x + 10},${y} L${x},${y + 22} Z`} className={`hk-flag f${i % 3}`} />
          })}
        </g>
      )}
      {/* ground */}
      <path d={`M-1000,${GROUND - 20} C-400,${GROUND - 4} -100,${GROUND - 26} 0,${GROUND - 16} C240,${GROUND - 30} 760,${GROUND - 2} 1000,${GROUND - 22} C1300,${GROUND - 34} 1700,${GROUND - 8} 2000,${GROUND - 20} L2000,${VIEW_H + 600} L-1000,${VIEW_H + 600} Z`} fill="url(#hk-ground)" />
      <g className="hk-grass">
        {Array.from({ length: 110 }, (_, i) => {
          const x = -700 + (i * 173) % (VIEW_W + 1400)
          const y = GROUND + 10 + ((i * 59) % 170)
          return <path key={i} d={`M${x},${y} l-3,-12 M${x},${y} l3,-10`} />
        })}
      </g>
      {memorial && (
        <g className="hk-memorial" transform={`translate(${MEMORIAL_X},${GROUND + 26})`}>
          <path d="M-30,0 L30,0 L24,-18 L-24,-18 Z" />
          <path d="M-9,-18 L-9,-96 L-30,-96 L-30,-114 L-9,-114 L-9,-138 L9,-138 L9,-114 L30,-114 L30,-96 L9,-96 L9,-18 Z" />
        </g>
      )}
      {bonfire && (
        <g className="hk-bonfire" transform={`translate(860,${GROUND + 40})`}>
          <ellipse cx="0" cy="-60" rx="240" ry="200" fill="url(#hk-glow)" className={reduced ? '' : 'hk-flicker'} />
          <path d="M-62,0 C-70,-50 -30,-70 -24,-120 C-6,-80 4,-96 2,-150 C26,-100 30,-80 40,-110 C52,-70 70,-40 62,0 Z" className="hk-flame" />
          <path d="M-36,0 C-40,-40 -14,-50 -8,-90 C4,-60 14,-70 16,-100 C30,-60 42,-40 36,0 Z" className="hk-flame-mid" />
          <path d="M-16,0 C-18,-24 -4,-34 0,-56 C8,-34 18,-24 16,0 Z" className="hk-flame-core" />
          <path d="M-70,4 L70,4 L50,-10 L-50,-10 Z" className="hk-logs" />
          {hour === 4 && !reduced && Array.from({ length: 14 }, (_, i) => (
            <circle key={i} r="3" className="hk-spark" style={{ animationDelay: `${i * 0.21}s`, '--sx': `${-180 - (i * 41) % 240}px`, '--sy': `${-360 - (i * 67) % 300}px` }} />
          ))}
        </g>
      )}
      {rain && (
        <g className={`hk-rain ${reduced ? '' : 'is-falling'}`}>
          {Array.from({ length: 70 }, (_, i) => (
            <path key={i} d={`M${(i * 149) % VIEW_W},${(i * 83) % VIEW_H} l-8,26`} />
          ))}
        </g>
      )}
    </g>
  )
})

function ShedDisc({ entry }) {
  const list = useMemo(() => rings({ felled: entry.fell || 1966, verdict: { saved: !!entry.saved }, era: 4 }), [entry.fell, entry.saved])
  const outer = list[list.length - 1].r
  const step = Math.max(1, Math.round(list.length / 14))
  return (
    <svg viewBox="-22 -22 44 44" aria-hidden="true" className="hk-shed-disc">
      <circle r="21" className="bark" />
      <circle r="19.5" className="b" />
      {list.filter((_, i) => i % step === 0).map(ring => <circle key={ring.year} r={ring.r / outer * 19.5} className="ring" />)}
      {entry.saved && <circle r={list.find(r => r.year === 1966).r / outer * 19.5} className="paint" />}
      {entry.fell === 1966 && <circle r={19.5} className="paint" />}
      {(entry.marks || []).map((m, i) => <circle key={i} cx={Math.cos(m.a) * m.r * 19.5} cy={-Math.sin(m.a) * m.r * 19.5} r="1.6" className="kept" />)}
    </svg>
  )
}

function RingDisc({ ringList, showYear, marks = [], size = 320, selected, onSelect, fire, paint, wet, testid }) {
  const canvasRef = useRef(null)
  const rendererRef = useRef(null)
  const [showR, setShowR] = useState(1)
  const [fallback, setFallback] = useState(false)
  useEffect(() => {
    const canvas = canvasRef.current
    let r = null
    try { r = createDisc(canvas) } catch { r = null }
    if (!r) { setFallback(true); return undefined }
    rendererRef.current = r
    return () => { r.dispose(); rendererRef.current = null }
  }, [])
  useEffect(() => { rendererRef.current?.setRings(ringList) }, [ringList])
  useEffect(() => {
    const r = rendererRef.current
    if (r) {
      setShowR(r.draw({ showYear, fire, paint, hollow: true, wet }))
      return
    }
    const canvas = canvasRef.current
    if (!canvas || !fallback) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#1a1310'
    ctx.fillRect(0, 0, size, size)
    const shown = ringList.filter(x => x.year <= showYear)
    const outer = shown.length ? shown[shown.length - 1].r : 1
    shown.slice().reverse().forEach((ring, i) => {
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, ring.r / outer * size * 0.43, 0, Math.PI * 2)
      ctx.fillStyle = i % 2 ? '#c99e70' : '#a9784e'
      ctx.fill()
    })
    setShowR(outer / ringList[ringList.length - 1].r)
  }, [showYear, ringList, fire, paint, wet, fallback, size])
  return (
    <div className="hk-disc" style={{ width: size, height: size }} data-testid={testid}>
      <canvas ref={canvasRef} style={{ width: size, height: size }} aria-hidden="true" />
      {marks.filter(m => m.year <= showYear).map((m, i) => {
        const pos = markPosition(m.r, m.angle, showR, size)
        return (
          <button
            key={`${m.kind}-${m.label}-${i}`}
            type="button"
            className={`hk-mark is-${m.kind} ${selected === i ? 'is-selected' : ''}`}
            style={{ left: pos.x, top: pos.y }}
            onClick={() => onSelect?.(i)}
            aria-label={`${m.label}, ${m.year}`}
            tabIndex={onSelect ? 0 : -1}
            data-testid={`hk-mark-${m.kind}-${i}`}
          >
            <span className="hk-mark-dot" />
            <span className="hk-mark-label">{m.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function HeartwoodKeeps() {
  const reduced = useReducedMotion()
  const [relics, setRelics] = useState(() => { const r = readJSON(UNDER_KEY, []); return Array.isArray(r) ? r : [] })
  const [shed, setShed] = useState(() => readJSON(SHED_KEY, []))
  const [game, setGame] = useState(() => createGame({ relics }))
  const gameRef = useRef(game)
  gameRef.current = game
  const [flight, setFlight] = useState(null)
  const [selected, setSelected] = useState(null)
  const [muted, setMuted] = useState(false)
  const [help, setHelp] = useState(false)
  const [drag, setDrag] = useState(null)
  const [catPos, setCatPos] = useState(null)
  const [showYear, setShowYear] = useState(null)
  const [falling, setFalling] = useState(null)
  const [markSel, setMarkSel] = useState(null)
  const [pulse, setPulse] = useState(null)
  const [vw, setVw] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200))
  const [vh, setVh] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 900))
  const audioRef = useRef(null)
  const svgRef = useRef(null)
  const logRef = useRef(null)
  const panelRef = useRef(null)
  const savedRef = useRef(false)
  const prevLog = useRef(0)

  const era = ERAS[game.era]
  const age = era.year - GERMINATED
  const tint = ERA_TINT[era.id]
  const anc = useMemo(() => anchors(age, era.year), [age, era.year])
  const present = presentAt(game)
  const playing = game.phase === 'era'
  const carried = game.carried ? game.objects[game.carried] : null
  const memorialUp = (era.id === 'peace' && game.hour >= 1) || (era.id === 'bypass' && game.hour < 2)

  useEffect(() => {
    const on = () => { setVw(window.innerWidth); setVh(window.innerHeight) }
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  // ---------------------------------------------------------- positions
  const personIndex = useMemo(() => Object.keys(era.people), [era])
  const personPos = useCallback(who => {
    const i = personIndex.indexOf(who)
    return PERSON_SLOTS[(i < 0 ? 0 : i) % PERSON_SLOTS.length]
  }, [personIndex])

  const objectPos = useCallback(o => {
    if (SPOTS[o.at]) {
      const a = anc[o.at]
      const here = objectsAt(game, o.at)
      const k = here.findIndex(x => x.id === o.id)
      return { x: a.x + (k - (here.length - 1) / 2) * 30, y: a.y - 4 - (o.at === 'roots' ? 0 : 0) }
    }
    if (o.at === 'grass') return GRASS_SPOTS[hashIndex(o.id + era.id, GRASS_SPOTS.length)]
    if (o.at === 'memorial') {
      const here = objectsAt(game, 'memorial')
      const k = here.findIndex(x => x.id === o.id)
      return { x: MEMORIAL_X - 30 + k * 34, y: GROUND + 46 }
    }
    if (o.at === 'lap') {
      const here = objectsAt(game, 'lap')
      const k = here.findIndex(x => x.id === o.id)
      const p = personPos('lily')
      return { x: p.x - 36 + k * 30, y: p.y - 44 }
    }
    return null
  }, [anc, game, era.id])

  const catXY = catPos || catRest(anc.roots, 'roots')
  const catPosRef = useRef(catXY)
  catPosRef.current = catXY
  const wide = vw >= 980 && vw > vh * 1.08
  const threats = playing ? era.end.filter(e => e.hour === game.hour) : []
  const threatSpots = new Set(threats.flatMap(e => e.soak || e.burn || []))
  const grassThreat = threats.some(e => ['pond', 'trample', 'verge'].includes(e.sweep))
  const memorialThreat = threats.some(e => e.sweep === 'vestry')
  const threatLine = threats.map(e => e.soak ? 'rain soaks the fork' : e.burn ? 'sparks burn the bark and the fork' : e.sweep === 'pond' ? 'Josiah throws what is in the grass into the millpond' : e.sweep === 'trample' ? 'the crowd tramples the grass' : e.sweep === 'vestry' ? 'the verger clears the cross' : e.sweep === 'verge' ? 'the crew rake the verge' : e.lapHome ? 'Lily goes home with what is on her lap' : e.fall ? 'the oak comes down' : '').filter(Boolean)
  const latest = game.log.filter(l => l.year === era.year && l.tone !== 'act' && l.tone !== 'era').slice(-1)[0]

  // ---------------------------------------------------------- audio
  const ensureAudio = useCallback(() => {
    if (!audioRef.current) audioRef.current = createGreenAudio()
    audioRef.current?.start()
    audioRef.current?.setMuted(muted)
  }, [muted])
  useEffect(() => () => audioRef.current?.dispose(), [])
  useEffect(() => { audioRef.current?.setMuted(muted) }, [muted])
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    if (game.phase === 'interlude') a.setMood('decades')
    else if (game.phase === 'finale') a.setMood('disc')
    else if (era.id === 'michaelmas') a.setMood(game.hour >= 6 ? 'michaelmas-rain' : 'michaelmas')
    else if (era.id === 'peace') a.setMood(game.hour === 4 ? 'silence' : 'peace')
    else if (era.id === 'storm') a.setMood(game.hour >= 5 ? 'storm-high' : 'storm')
    else a.setMood(era.id)
  }, [game.phase, era.id, game.hour])

  // cue sounds and pulses from new log lines
  useEffect(() => {
    const fresh = game.log.slice(prevLog.current)
    prevLog.current = game.log.length
    const a = audioRef.current
    if (!fresh.length) return
    const story = fresh.find(l => l.tone === 'story' || l.tone === 'proof')
    if (story) {
      a?.story(game.stories.length + game.proofs.length)
      setPulse({ id: story.id, objId: story.objId })
    } else if (fresh.some(l => l.tone === 'loss')) a?.loss()
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
    if (panelRef.current && window.innerWidth < 980) panelRef.current.scrollTop = 0
  }, [game.log, game.stories.length, game.proofs.length])

  // ---------------------------------------------------------- actions
  const perform = useCallback((action, target) => {
    ensureAudio()
    const prev = gameRef.current
    const next = act(prev, action)
    if (next === prev) return
    const a = audioRef.current
    if (action.type === 'take') a?.take()
    if (action.type === 'place') a?.place(action.spot)
    if (action.type === 'give') a?.give()
    const bell = ERAS[next.era]?.id === 'peace' && next.hour === 4 && next.era === prev.era
    if (next.hour !== prev.hour || next.era !== prev.era) a?.hour(bell)
    const carriedBefore = prev.carried ? prev.objects[prev.carried] : null
    const catBefore = catPosRef.current
    if (carriedBefore && target && catBefore && (action.type === 'place' || action.type === 'give')) {
      setFlight({ id: `${next.turns}`, kind: carriedBefore.kind, relic: carriedBefore.relic, from: { x: catBefore.x - 30, y: catBefore.y - 46 }, to: { x: target.x, y: target.y - (action.type === 'give' ? 90 : 4) } })
    }
    gameRef.current = next
    setGame(next)
    if (target) setCatPos(catRest(target, action.spot))
    setSelected(null)
  }, [ensureAudio])

  const doWait = useCallback(() => { perform({ type: 'wait' }, anc.roots) }, [perform, anc])

  const actionFor = useCallback(sel => {
    if (!sel || !playing) return null
    if (sel.type === 'obj') {
      const o = game.objects[sel.id]
      if (!o) return null
      if (carried) return { disabled: true, label: 'the cat\'s mouth is full', why: `Put down ${objInfo(carried).name} first.` }
      if (!takeable(game).includes(o)) return { disabled: true, label: 'out of reach', why: '' }
      return { label: `take ${objInfo(o).short}`, action: { type: 'take', id: o.id }, target: objectPos(o) }
    }
    if (sel.type === 'spot') {
      if (!spotOpen(game, sel.id)) return { disabled: true, label: 'closed', why: spotClosedReason(game, sel.id) }
      if (!carried) return { disabled: true, label: 'carry something here', why: 'Take something first, then bring it here.' }
      return { label: SPOTS[sel.id].verb, action: { type: 'place', spot: sel.id }, target: anc[sel.id] }
    }
    if (sel.type === 'person') {
      if (!present.includes(sel.id)) return { disabled: true, label: 'not here this hour', why: '' }
      if (!carried) return { disabled: true, label: 'nothing to give', why: 'The cat has nothing in its mouth.' }
      const pos = personPos(sel.id)
      return { label: `give it to ${personName(game, sel.id).split(' ')[0]}`, action: { type: 'give', who: sel.id }, target: { x: pos.x + 46, y: pos.y } }
    }
    return null
  }, [game, playing, carried, present, anc, objectPos, personPos])

  const pick = useCallback(sel => {
    if (!playing) return
    ensureAudio()
    if (selected && selected.type === sel.type && selected.id === sel.id) {
      const a = actionFor(sel)
      if (a && !a.disabled) perform(a.action, a.target)
      return
    }
    setSelected(sel)
  }, [playing, selected, actionFor, perform, ensureAudio])

  const current = actionFor(selected)

  // ---------------------------------------------------------- drag the carried thing
  const toSvg = useCallback((cx, cy) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = cx
    pt.y = cy
    const m = svg.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = pt.matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }, [])

  const dropTargets = useMemo(() => {
    if (!carried || !playing) return []
    const list = SPOT_ORDER.filter(s => spotOpen(game, s)).map(s => ({ kind: 'spot', id: s, ...anc[s] }))
    present.forEach(who => {
      const p = personPos(who)
      list.push({ kind: 'person', id: who, x: p.x, y: p.y - 70 })
    })
    return list
  }, [carried, playing, game, anc, present, personPos])

  const nearestDrop = useCallback(p => {
    let best = null
    let bd = 110
    dropTargets.forEach(t => {
      const d = Math.hypot(t.x - p.x, t.y - p.y)
      if (d < bd) { bd = d; best = t }
    })
    return best
  }, [dropTargets])

  const startDrag = useCallback(e => {
    if (!carried || !playing) return
    e.preventDefault()
    e.stopPropagation()
    ensureAudio()
    svgRef.current?.setPointerCapture?.(e.pointerId)
    setDrag({ id: e.pointerId, ...toSvg(e.clientX, e.clientY), moved: false })
  }, [carried, playing, toSvg, ensureAudio])

  const moveDrag = useCallback(e => {
    if (!drag || e.pointerId !== drag.id) return
    const p = toSvg(e.clientX, e.clientY)
    setDrag(d => ({ ...d, ...p, moved: true, over: nearestDrop(p)?.id || null }))
  }, [drag, toSvg, nearestDrop])

  const endDrag = useCallback(e => {
    if (!drag || e.pointerId !== drag.id) return
    const p = toSvg(e.clientX, e.clientY)
    const t = drag.moved ? nearestDrop(p) : null
    setDrag(null)
    if (!t) return
    if (t.kind === 'spot') perform({ type: 'place', spot: t.id }, anc[t.id])
    else {
      const pos = personPos(t.id)
      perform({ type: 'give', who: t.id }, { x: pos.x + 46, y: pos.y })
    }
  }, [drag, toSvg, nearestDrop, perform, anc, personPos])

  // ---------------------------------------------------------- phases
  const startGame = useCallback(() => {
    ensureAudio()
    const g = begin(gameRef.current)
    gameRef.current = g
    setGame(g)
    setCatPos(null)
    setSelected(null)
  }, [ensureAudio])

  const restart = useCallback(() => {
    const under = readJSON(UNDER_KEY, [])
    savedRef.current = false
    prevLog.current = 0
    setFalling(null)
    setMarkSel(null)
    setShowYear(null)
    setCatPos(null)
    setSelected(null)
    const r = Array.isArray(under) ? under : []
    setRelics(r)
    const g = createGame({ relics: r })
    gameRef.current = g
    setGame(g)
  }, [])

  // the decades: grow rings from this era's year to the next
  useEffect(() => {
    if (game.phase !== 'interlude') return undefined
    const from = era.year
    const to = ERAS[game.era + 1].year
    if (reduced) { setShowYear(to); return undefined }
    setShowYear(from)
    let raf = 0
    const t0 = performance.now()
    const dur = 5200
    let lastYear = from
    const tick = now => {
      const t = Math.min(1, (now - t0) / dur)
      const e = 1 - Math.pow(1 - t, 2.2)
      const y = Math.round(from + (to - from) * e)
      if (y !== lastYear) { lastYear = y; audioRef.current?.ring(y) }
      setShowYear(y)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [game.phase, game.era, era.year, reduced])

  const continueOn = useCallback(() => {
    ensureAudio()
    const g = continueEra(gameRef.current)
    gameRef.current = g
    setGame(g)
    setCatPos(null)
    setSelected(null)
    setShowYear(null)
  }, [ensureAudio])

  // the fall: let the tree go over before the disc
  useEffect(() => {
    if (game.phase !== 'finale' || falling) return undefined
    const kind = game.felled === 2008 ? 'storm' : 'saw'
    setFalling(kind)
    if (kind === 'storm') audioRef.current?.crash()
    else audioRef.current?.saw()
    return undefined
  }, [game.phase, game.felled, falling])

  const [discReady, setDiscReady] = useState(false)
  useEffect(() => {
    if (!falling) { setDiscReady(false); return undefined }
    const id = setTimeout(() => setDiscReady(true), reduced ? 200 : 2600)
    return () => clearTimeout(id)
  }, [falling, reduced])

  const finale = useMemo(() => (game.phase === 'finale' ? discMarks(game) : null), [game])
  const interludeDisc = useMemo(() => (game.phase === 'interlude' ? discMarks(game) : null), [game])

  useEffect(() => {
    if (game.phase !== 'finale' || savedRef.current) return
    savedRef.current = true
    const entry = {
      fell: game.felled,
      saved: !!game.verdict?.saved,
      marks: discMarks(game).marks.filter(m => m.kind === 'object').map(m => ({ r: m.r, a: m.angle })),
      stories: game.stories.length,
      reasons: score(game),
      epitaph: epitaph(game),
      kept: Object.values(game.objects).filter(o => o.at === 'sealed' || o.at === 'hollow').map(o => o.kind),
      daughter: !!game.daughter,
      at: new Date().toISOString().slice(0, 10)
    }
    const next = [entry, ...readJSON(SHED_KEY, [])].slice(0, 8)
    writeJSON(SHED_KEY, next)
    writeJSON(UNDER_KEY, underground(game))
    setShed(next)
  }, [game])

  // ---------------------------------------------------------- keyboard
  useEffect(() => {
    const onKey = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = e.target?.tagName
      const k = e.key.toLowerCase()
      if (k === 'm') { setMuted(m => !m); return }
      if (k === '?' || (k === 'h' && game.phase !== 'intro')) { setHelp(h => !h); return }
      if (k === 'escape') { setSelected(null); setHelp(false); return }
      if (game.phase === 'intro' && k === 'enter' && tag !== 'BUTTON') { e.preventDefault(); startGame(); return }
      if (game.phase === 'interlude' && k === 'enter' && tag !== 'BUTTON') { e.preventDefault(); continueOn(); return }
      if (game.phase === 'finale' && k === 'r') { restart(); return }
      if (game.phase !== 'era') return
      if (k === 'w') { e.preventDefault(); doWait(); return }
      if (SPOT_KEYS[k]) { e.preventDefault(); pick({ type: 'spot', id: SPOT_KEYS[k] }); return }
      if (k === 'p') {
        e.preventDefault()
        const i = selected?.type === 'person' ? present.indexOf(selected.id) : -1
        if (present.length) setSelected({ type: 'person', id: present[(i + 1) % present.length] })
        return
      }
      if (k === 'o' || k === 't') {
        e.preventDefault()
        const list = takeable(game)
        const i = selected?.type === 'obj' ? list.findIndex(o => o.id === selected.id) : -1
        if (list.length) setSelected({ type: 'obj', id: list[(i + 1) % list.length].id })
        return
      }
      if ((k === 'enter' || k === ' ') && tag !== 'BUTTON' && !(e.target?.getAttribute?.('role') === 'button')) {
        if (current && !current.disabled) { e.preventDefault(); perform(current.action, current.target) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [game, selected, present, current, perform, pick, doWait, startGame, continueOn, restart])

  // ---------------------------------------------------------- derived ui
  const eraLog = game.log.filter(l => l.year === era.year).slice(-14)
  const needs = playing ? openNeeds(game) : []
  const visibleObjects = Object.values(game.objects).filter(o => ['grass', 'memorial', 'lap', ...SPOT_ORDER].includes(o.at) && (!SPOTS[o.at] || o.at !== 'roots' || spotOpen(game, 'roots') || era.id === 'peace'))
  const take = playing ? takeable(game) : []
  const lastHour = playing && game.hour === era.hours.length
  const discSize = Math.min(wide ? 520 : vw - 48, 560)
  const nextEra = ERAS[game.era + 1]

  const selInfo = (() => {
    if (!selected) return null
    if (selected.type === 'obj') {
      const o = game.objects[selected.id]
      if (!o) return null
      return { title: objInfo(o).name, body: objInfo(o).desc }
    }
    if (selected.type === 'spot') {
      const here = objectsAt(game, selected.id)
      return {
        title: SPOTS[selected.id].label,
        body: SPOTS[selected.id].rule,
        extra: here.length ? `In it now: ${here.map(o => objInfo(o).name).join(', ')}.` : ''
      }
    }
    if (selected.type === 'person') {
      const p = era.people[selected.id]
      const n = needsFor(game, selected.id)
      const held = Object.values(game.objects).filter(o => o.at === `held:${selected.id}`)
      return {
        title: `${personName(game, selected.id)}${p.age ? `, ${p.age}` : ''}`,
        body: n.length ? `${n[0].label}, by the ${era.hours[n[0].by - 1]}.` : selected.id === 'pryce' ? 'He writes down anything that proves the oak mattered: a date, a name, a letter. Each proof is a reason.' : selected.id === 'lily' && era.id === 'bypass' ? 'Anything you give Lily, she shows Mr Pryce. Proofs count as reasons.' : present.includes(selected.id) ? 'Nothing you can give will change their day.' : 'Not under the tree this hour.',
        extra: held.length ? `Keeping: ${held.map(o => objInfo(o).name).join(', ')}.` : ''
      }
    }
    return null
  })()

  const hourLabel = `${ORDINAL[game.hour - 1]} hour · ${era.hours[game.hour - 1]}`

  return (
    <div
      className={`hk-root is-${game.phase} era-${era.id} ${reduced ? 'is-reduced' : ''} ${wide ? 'is-wide' : 'is-narrow'}`}
      data-testid="heartwood-keeps"
      data-phase={game.phase}
      data-era={era.id}
      data-hour={game.hour}
    >
      <div className="hk-stage" data-playground-surface data-testid="hk-stage">
        <svg
          ref={svgRef}
          viewBox={wide || game.phase === 'intro' ? `0 0 ${VIEW_W} ${VIEW_H}` : `130 40 760 1140`}
          preserveAspectRatio="xMidYMax meet"
          className={`hk-svg ${drag ? 'is-dragging' : ''}`}
          style={{ overflow: 'visible' }}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={() => setDrag(null)}
          role="group"
          aria-label={`The green, ${era.title}. The oak is ${age} years old.`}
        >
          <Scenery era={era} hour={game.hour} tint={tint} reduced={reduced} memorial={memorialUp} />
          {game.daughter && era.year > game.daughter && <DaughterOak since={game.daughter} year={era.year} tint={tint} />}
          <Tree
            age={age}
            year={era.year}
            tint={tint}
            era={era.id}
            hour={game.hour}
            reduced={reduced}
            falling={falling}
            marks={game.marks}
            verdictSaved={game.verdict ? game.verdict.saved : null}
          />
          {/* five places on the tree */}
          {playing && SPOT_ORDER.map((s, i) => {
            const a = anc[s]
            const open = spotOpen(game, s)
            if (s === 'hollow' && game.era < 1) return null
            const isSel = selected?.type === 'spot' && selected.id === s
            const isOver = drag?.over === s
            return (
              <g
                key={s}
                className={`hk-spot ${open ? '' : 'is-closed'} ${isSel ? 'is-selected' : ''} ${carried && open ? 'is-droppable' : ''} ${isOver ? 'is-over' : ''} ${threatSpots.has(s) ? 'is-threat' : ''}`}
                transform={`translate(${a.x},${a.y})`}
                role="button"
                tabIndex={0}
                aria-label={`${SPOTS[s].label}${open ? '' : ', closed'}. Key ${i + 1}.`}
                data-testid={`hk-spot-${s}`}
                data-playground-action={carried && open ? 'place' : undefined}
                onClick={() => pick({ type: 'spot', id: s })}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); pick({ type: 'spot', id: s }) } }}
              >
                <circle r={wide ? 46 : 58} className="hk-hit" />
                <circle r="26" className="hk-spot-ring" />
                <text y="7" className="hk-spot-num">{i + 1}</text>
                <text y="50" className="hk-spot-label">{s}</text>
              </g>
            )
          })}
          {/* the small things */}
          {visibleObjects.map(o => {
            const p = objectPos(o)
            if (!p) return null
            const can = take.includes(o)
            const isSel = selected?.type === 'obj' && selected.id === o.id
            return (
              <g
                key={o.id}
                className={`hk-obj ${can ? 'is-takeable' : ''} ${isSel ? 'is-selected' : ''} at-${o.at} ${(o.at === 'grass' && grassThreat) || (o.at === 'memorial' && memorialThreat) || (SPOTS[o.at] && threatSpots.has(o.at) && objInfo(o).paper) ? 'is-threat' : ''}`}
                role="button"
                tabIndex={can ? 0 : -1}
                aria-label={`${objInfo(o).name}, ${o.at === 'grass' ? 'in the grass' : o.at === 'memorial' ? 'at the cross' : o.at === 'lap' ? 'on Lily\'s lap' : `in ${SPOTS[o.at].label}`}`}
                data-testid={`hk-obj-${o.id}`}
                data-playground-action={can ? 'take' : undefined}
                onClick={e => { e.stopPropagation(); pick({ type: 'obj', id: o.id }) }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); pick({ type: 'obj', id: o.id }) } }}
              >
                <circle cx={p.x} cy={p.y} r={wide ? 34 : 50} className="hk-hit" />
                {can && <circle cx={p.x} cy={p.y} r="20" className="hk-obj-glow" />}
                <ObjectIcon kind={o.kind} relic={o.relic} x={p.x} y={p.y} scale={1.25} />
              </g>
            )
          })}
          {/* people under the tree this hour */}
          {Object.entries(era.people).map(([who, p]) => {
            const here = present.includes(who)
            if (!here) return null
            const pos = personPos(who)
            const holding = Object.values(game.objects).filter(o => o.at === `held:${who}`)
            return (
              <Figure
                key={who}
                keyHint={who}
                look={p.look}
                name={personName(game, who)}
                x={pos.x}
                y={pos.y}
                present={here}
                needing={playing && needsFor(game, who).length > 0}
                selected={selected?.type === 'person' && selected.id === who}
                droppable={!!carried && playing}
                holding={holding}
                onPick={() => pick({ type: 'person', id: who })}
              />
            )
          })}
          {/* the cat, who is the same in every century */}
          <g className="hk-cat" style={{ transform: `translate(${catXY.x}px, ${catXY.y}px)` }} data-testid="hk-cat">
            <path d={CAT_PATH} className="hk-cat-body" />
            {CAT_EYES.map((e, i) => <ellipse key={i} cx={e.x} cy={e.y} rx="3" ry="2.2" className="hk-cat-eye" />)}
            {carried && !drag && (
              <g
                className="hk-carried"
                onPointerDown={startDrag}
                role="button"
                tabIndex={-1}
                aria-label={`Drag ${objInfo(carried).name}`}
                data-testid="hk-carried"
              >
                <circle cx="-30" cy="-46" r="34" className="hk-hit" />
                <ObjectIcon kind={carried.kind} relic={carried.relic} x={-30} y={-46} scale={1.05} />
              </g>
            )}
          </g>
          {flight && !reduced && (
            <g
              key={flight.id}
              className="hk-flight"
              style={{ '--fx': `${flight.from.x}px`, '--fy': `${flight.from.y}px`, '--tx': `${flight.to.x}px`, '--ty': `${flight.to.y}px`, '--mx': `${(flight.from.x + flight.to.x) / 2}px`, '--my': `${Math.min(flight.from.y, flight.to.y) - 90}px` }}
              onAnimationEnd={() => setFlight(null)}
              aria-hidden="true"
            >
              <ObjectIcon kind={flight.kind} relic={flight.relic} x={0} y={0} scale={1.3} />
            </g>
          )}
          {drag && carried && (
            <g className="hk-ghost" style={{ pointerEvents: 'none' }}>
              <ObjectIcon kind={carried.kind} relic={carried.relic} x={drag.x} y={drag.y} scale={1.5} />
            </g>
          )}
        </svg>
        {pulse && <div key={pulse.id} className="hk-pulse" aria-hidden="true" onAnimationEnd={() => setPulse(null)} />}
        {playing && (latest || threatLine.length > 0) && (
          <div className="hk-banner" data-testid="hk-banner" aria-hidden="true">
            {latest && <p key={latest.id} className={`is-${latest.tone}`}>{latest.text}</p>}
            {threatLine.length > 0 && <p className="hk-threat-line" data-testid="hk-threat">End of this hour: {threatLine.join('; ')}.</p>}
          </div>
        )}
      </div>

      <header className="hk-top">
        <Link to="/playground/emergence" className="hk-back" aria-label="Back to the laboratory">←</Link>
        <div className="hk-heading">
          <p className="hk-mono">heartwood.keeps()</p>
          <h1 data-testid="hk-era-title">{era.title}</h1>
        </div>
        <div className="hk-reasons" title="Stories told and proofs given" data-testid="hk-reasons" aria-label={`${score(game)} reasons the village has to keep the oak`}>
          <svg viewBox="-20 -20 40 40" aria-hidden="true">
            {[16, 12, 8, 4].map(r => <circle key={r} r={r} />)}
          </svg>
          <span>{score(game)}</span>
        </div>
        <button type="button" className="hk-icon-btn" onClick={() => setMuted(m => !m)} aria-pressed={muted} data-testid="hk-mute" aria-label={muted ? 'Sound off' : 'Sound on'}>
          {muted ? 'off' : 'snd'}
        </button>
        <button type="button" className="hk-icon-btn" onClick={() => setHelp(h => !h)} aria-expanded={help} data-testid="hk-help-toggle" aria-label="How it works">?</button>
      </header>

      {game.phase !== 'intro' && (
        <aside className="hk-panel" data-testid="hk-panel" ref={panelRef}>
          <ol className="hk-hours" aria-label="The hours of this day" data-testid="hk-hours">
            {era.hours.map((h, i) => {
              const ev = era.almanac.filter(a => a.hour === i + 1)
              return (
                <li key={h + i} className={`${i + 1 === game.hour ? 'is-now' : ''} ${i + 1 < game.hour ? 'is-past' : ''}`}>
                  <span className="hk-pip">{ev.map(a => ICON_LABEL[a.icon] || '·').join('') || '·'}</span>
                  <span className="hk-hour-name">{h}</span>
                </li>
              )
            })}
          </ol>
          <p className="hk-now" data-testid="hk-hour">{playing ? hourLabel : ''}<span className="hk-now-reasons"> · {score(game)} {score(game) === 1 ? 'reason' : 'reasons'} to keep the oak</span></p>
          <ul className="hk-almanac" aria-label="What will happen">
            {era.almanac.filter(a => a.hour >= game.hour).slice(0, 3).map((a, i) => (
              <li key={i}><b>{era.hours[a.hour - 1]}</b> {a.text.replaceAll('{sur}', game.sur || 'Cole')}</li>
            ))}
          </ul>
          {needs.length > 0 && (
            <ul className="hk-needs" data-testid="hk-needs">
              {needs.map(n => <li key={n.id}><span className="hk-need-mark" />{n.label.replaceAll('{sur}', game.sur || '')} <em>by the {era.hours[n.by - 1]}</em></li>)}
            </ul>
          )}
          {era.id === 'bypass' && playing && (
            <p className="hk-verdict-meter" data-testid="hk-verdict-meter">Mr Pryce needs {SAVE_THRESHOLD} reasons by four o'clock. The village has {score(game)}: {game.stories.length} {game.stories.length === 1 ? 'story' : 'stories'} told, {game.proofs.length} {game.proofs.length === 1 ? 'proof' : 'proofs'}. Bring him dated things: a letter, a coin, a card.</p>
          )}
          <div className="hk-mouth" data-testid="hk-mouth">
            {carried
              ? <><svg viewBox="-20 -20 40 40" aria-hidden="true"><ObjectIcon kind={carried.kind} relic={carried.relic} x={0} y={0} /></svg><span>In the cat's mouth: <b>{objInfo(carried).name}</b>. Drag it to a place or a person, or pick one.</span></>
              : <span>The cat's mouth is empty. Pick something up: it costs an hour.</span>}
          </div>
          {playing && (
            <div className="hk-quick" data-testid="hk-quick">
              {!carried && take.length > 0 && take.map(o => (
                <button key={o.id} type="button" className="hk-chip" onClick={() => perform({ type: 'take', id: o.id }, objectPos(o))} data-testid={`hk-take-${o.id}`} data-playground-action="take">
                  take {objInfo(o).short}
                </button>
              ))}
              {!carried && !take.length && <span className="hk-quiet">Nothing within reach this hour.</span>}
              {carried && SPOT_ORDER.filter(s => s !== 'hollow' || game.era >= 1).map(s => (
                <button key={s} type="button" className="hk-chip" disabled={!spotOpen(game, s)} onClick={() => perform({ type: 'place', spot: s }, anc[s])} data-testid={`hk-put-${s}`} title={spotOpen(game, s) ? SPOTS[s].rule : spotClosedReason(game, s)}>
                  {s}
                </button>
              ))}
              {carried && present.map(who => (
                <button key={who} type="button" className="hk-chip is-give" onClick={() => { const p = personPos(who); perform({ type: 'give', who }, { x: p.x + 46, y: p.y }) }} data-testid={`hk-give-${who}`}>
                  give {personName(game, who).split(' ')[0]}
                </button>
              ))}
            </div>
          )}
          {lastHour && carried && <p className="hk-warn" data-testid="hk-warn">This is the last hour. Whatever is still in the cat's mouth when it ends is lost.</p>}
          <div className="hk-select" data-testid="hk-select">
            {selInfo
              ? (
                <>
                  <h2>{selInfo.title}</h2>
                  <p>{selInfo.body}</p>
                  {selInfo.extra && <p className="hk-extra">{selInfo.extra}</p>}
                  {current && (
                    <button
                      type="button"
                      className="hk-act"
                      disabled={current.disabled}
                      onClick={() => current.action && perform(current.action, current.target)}
                      data-testid="hk-act"
                      data-playground-action="act"
                    >
                      {current.label}{!current.disabled && <small> · uses the {era.hours[game.hour - 1]}</small>}
                    </button>
                  )}
                  {current?.why && <p className="hk-why">{current.why}</p>}
                </>
              )
              : <p className="hk-hint">Tap a person, a place on the tree, or something lying in the grass. Tap it again to act.</p>}
          </div>
          <div className="hk-row">
            <button type="button" className="hk-wait" onClick={doWait} disabled={!playing} data-testid="hk-wait" data-playground-action="wait">let the hour pass <kbd>W</kbd></button>
          </div>
          <div className="hk-log" ref={logRef} aria-live="polite" data-testid="hk-log">
            {eraLog.map(l => <p key={l.id} className={`is-${l.tone}`}>{l.text}</p>)}
          </div>
        </aside>
      )}

      {help && (
        <div className="hk-card hk-help" role="dialog" aria-label="How it works" data-testid="hk-help">
          <h2>How the cat keeps things</h2>
          <p>Each day has a few hours. Taking something, putting it somewhere and giving it to someone each cost one hour. Walking is free.</p>
          <ul>
            {SPOT_ORDER.map((s, i) => <li key={s}><b>{i + 1} · {SPOTS[s].label}.</b> {SPOTS[s].rule}</li>)}
          </ul>
          <p>Give a thing to someone who needs it and it becomes a story the village tells. Things given to family come back with their children. In 1966 the surveyor counts reasons: every story told so far, plus every dated thing (the letter, the sixpence, the postcard) that reaches him. He needs {SAVE_THRESHOLD}. Press a thing into the bark and nobody gets it back until the wood is cut open. Whatever is in the cat's mouth when the oak falls turns up in the roots of the next one.</p>
          <p className="hk-keys"><kbd>1</kbd>–<kbd>5</kbd> places · <kbd>O</kbd> things · <kbd>P</kbd> people · <kbd>Enter</kbd> act · <kbd>W</kbd> wait · <kbd>M</kbd> sound</p>
          <button type="button" className="hk-primary" onClick={() => setHelp(false)} data-testid="hk-help-close">back to the green</button>
        </div>
      )}

      {game.phase === 'intro' && (
        <div className="hk-card hk-intro" role="dialog" aria-label="heartwood.keeps()" data-testid="hk-intro">
          <p className="hk-eyebrow">one oak · five days · a hundred and sixty-two years</p>
          <h2>heartwood.keeps()</h2>
          <p>A void cat lives in the oak on the green. It doesn't get older. The village does.</p>
          <p>It wakes up on five days in the tree's life. On each one, things get dropped, hidden, thrown away and burned. The cat can save a few of them. It can give one to someone who needs it, or hide it in the roots, the bark, the hollow, the fork or the crown, and let the decades decide what happens to it.</p>
          <p>Bark grows over things. Magpies take what shines. Paper rots. Children climb. In 1966 the county comes to cut the oak down, unless the village has enough reasons to keep it.</p>
          {relics.length > 0 && <p className="hk-relic-note" data-testid="hk-relics">Something is already in the roots, older than the tree: {relics.map(k => k).join(', ')}.</p>}
          {shed.length > 0 && (
            <div className="hk-shed" data-testid="hk-shed">
              <p className="hk-mono">the woodshed: discs from earlier oaks</p>
              <ul>
                {shed.slice(0, 6).map((s, i) => (
                  <li key={i}>
                    <ShedDisc entry={s} />
                    <span>{s.epitaph}<br /><small>fell {s.fell} · {s.stories} stories</small></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button type="button" className="hk-primary" onClick={startGame} data-playground-primary data-testid="hk-begin">wake in the roots, 1846 <kbd>Enter</kbd></button>
          <Link to="/playground/emergence" className="hk-back-intro">← laboratory</Link>
        </div>
      )}

      {game.phase === 'interlude' && (
        <div className="hk-card hk-interlude" role="dialog" aria-label="The decades" data-testid="hk-interlude">
          <p className="hk-eyebrow">the cat sleeps</p>
          <p className="hk-year" data-testid="hk-year">{showYear ?? era.year}</p>
          <RingDisc
            ringList={interludeDisc?.rings || []}
            showYear={showYear ?? era.year}
            marks={interludeDisc?.marks || []}
            size={Math.min(wide ? 300 : vw - 120, 300)}
            fire={game.marks.some(m => m.kind === 'firescar')}
            paint={game.marks.some(m => m.kind === 'paint')}
            testid="hk-interlude-disc"
          />
          <ol className="hk-chronicle" data-testid="hk-chronicle">
            {game.chronicle.filter(c => c.year <= (showYear ?? 0)).map((c, i) => (
              <li key={i} className={`is-${c.tone}`}><b>{c.year}</b> {c.text}</li>
            ))}
          </ol>
          <button type="button" className="hk-primary" onClick={continueOn} data-playground-primary data-testid="hk-continue">wake up: {nextEra?.title} <kbd>Enter</kbd></button>
        </div>
      )}

      {game.phase === 'finale' && discReady && finale && (
        <div className="hk-card hk-finale" role="dialog" aria-label="The disc" data-testid="hk-finale">
          <div className="hk-finale-disc">
            <RingDisc
              ringList={finale.rings}
              showYear={game.felled}
              marks={finale.marks}
              size={discSize}
              selected={markSel}
              onSelect={setMarkSel}
              fire
              paint
              wet={1}
              testid="hk-final-disc"
            />
          </div>
          <div className="hk-finale-text">
            <p className="hk-eyebrow">{game.felled === 2008 ? 'the storm, 2008 · the council cuts a disc' : 'the bypass, 1966 · the sawyers keep a slab'}</p>
            <h2 data-testid="hk-epitaph">{epitaph(game)}</h2>
            <p>{finale.rings.length} rings, {GERMINATED} to {game.felled}. {game.stories.length} {game.stories.length === 1 ? 'story' : 'stories'} told, {game.proofs.length} written into the surveyor's report.</p>
            {markSel != null && finale.marks[markSel] && (
              <div className="hk-mark-card" data-testid="hk-mark-card">
                <h3>{finale.marks[markSel].label} · {finale.marks[markSel].year}</h3>
                <p>{finale.marks[markSel].text}</p>
              </div>
            )}
            {markSel == null && <p className="hk-hint">Tap a mark in the wood to read it.</p>}
            <ul className="hk-stories" data-testid="hk-stories">
              {game.stories.map((s, i) => <li key={i}><b>{s.year}</b> {s.text}</li>)}
              {!game.stories.length && <li>Nobody was ever given anything.</li>}
            </ul>
            <ul className="hk-fates">
              {Object.values(game.objects).filter(o => !o.relic || o.at !== 'lost').map(o => (
                <li key={o.id}><b>{objInfo(o).name}</b> {fateLine(o, game)}</li>
              ))}
            </ul>
            <div className="hk-row">
              <button type="button" className="hk-primary" onClick={restart} data-playground-action="restart" data-testid="hk-restart">grow another oak <kbd>R</kbd></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function fateLine(o, game) {
  const at = o.at
  if (at === 'sealed') return `is in the wood, at the ${o.year} ring.`
  if (at === 'hollow') return 'was in the rotten heart when they cut it.'
  if (at === 'archive') return 'is in a county archive box.'
  if (at === 'grown') return `became the daughter oak at the edge of the green in ${game.daughter + 1}. It is still standing.`
  if (at === 'cat') return 'went off in the cat\'s mouth. It will turn up in the roots of the next oak.'
  if (at === 'roots') return game.felled === 1966 ? 'is still in the roots, under the bypass.' : 'is under the kerb. The next oak will find it.'
  if (at === 'found:maya') return 'fell out of the crown. Maya found it on the green the next morning.'
  if (at.startsWith('held:')) return `was kept by ${personName(game, at.slice(5), ERAS.findIndex(e => e.people[at.slice(5)]))}.`
  const last = o.history[o.history.length - 1]
  return last ? `is lost. ${last.year}: ${last.text}` : 'is lost.'
}
