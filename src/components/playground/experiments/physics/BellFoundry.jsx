import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import {
  PARTIALS, BANDS, SENSITIVITY, BELLS, CUT, SKIM, TRUE_TOL, FAIR_TOL, CRUCIBLE, DROSS, HEIGHT,
  predictCents, patternWeight, patternDiameter, maxCuts, castBell, deviations, frequencies,
  grade, isFlat, applyCut, cracks, bellProfile, plainHuntRows
} from './foundry/bell-core'
import './BellFoundry.css'

const BLOW = 0.27
const WINDOW = 0.2
const TABLE_TOP = 0.2
const LANE_RANGE = 100
const SWEET = [15, 70]
const ROWS = plainHuntRows()
const SCREEN_BANDS = [4, 3, 2, 1, 0]
const GRADE_WORD = { true: 'true', fair: 'fair', sour: 'sour', missing: 'not cast' }
const LEDGER_KEY = 'bell-foundry-rings'
const INTRO_PATTERN = { dia: 0, thick: 0.2 }
const INTRO_CUTS = [1.5, 1, 1.25, 2, 2.5]

const worldScale = (index, pattern) => 2.05 * (440 / BELLS[index].freq) ** 0.7 * patternDiameter(pattern.dia)
const centsText = c => `${c > 0 ? '+' : c < 0 ? '−' : '±'}${Math.abs(c).toFixed(Math.abs(c) < 10 ? 1 : 0)}¢`

function readLedger() {
  try {
    return JSON.parse(window.localStorage.getItem(LEDGER_KEY) || '[]').slice(0, 5)
  } catch {
    return []
  }
}

function writeLedger(entries) {
  try {
    window.localStorage.setItem(LEDGER_KEY, JSON.stringify(entries.slice(0, 5)))
  } catch {
    // Private windows refuse storage; the book simply stays unwritten.
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

function createAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  const ctx = new Ctx()
  const master = ctx.createGain()
  master.gain.value = 0.7
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.ratio.value = 3
  master.connect(comp)
  comp.connect(ctx.destination)

  const hall = ctx.createConvolver()
  const length = Math.floor(ctx.sampleRate * 2.6)
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.8
  }
  hall.buffer = impulse
  const wet = ctx.createGain()
  wet.gain.value = 0.32
  hall.connect(wet).connect(master)

  const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.6), ctx.sampleRate)
  const nd = noise.getChannelData(0)
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1

  const bus = (level, pan) => {
    const gain = ctx.createGain()
    gain.gain.value = level
    let tail = gain
    if (ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner()
      panner.pan.value = pan
      gain.connect(panner)
      tail = panner
    }
    tail.connect(master)
    tail.connect(hall)
    return gain
  }
  const voice = (out, freq, amp, decay, at, type = 'sine') => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(amp, at + 0.004)
    gain.gain.setTargetAtTime(0, at + 0.004, decay / 6.9)
    osc.connect(gain).connect(out)
    osc.start(at)
    osc.stop(at + decay + 0.1)
  }
  const burst = (out, freq, q, amp, length, at, type = 'bandpass') => {
    const src = ctx.createBufferSource()
    src.buffer = noise
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = freq
    filter.Q.value = q
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(amp, at)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
    src.connect(filter).connect(gain).connect(out)
    src.start(at, Math.random() * 0.3, length + 0.05)
  }

  return {
    ctx,
    now: () => ctx.currentTime,
    setMuted(muted) { master.gain.setTargetAtTime(muted ? 0 : 0.7, ctx.currentTime, 0.05) },
    // Every partial sounds at the frequency the bell actually has, so tuning is heard.
    strike(freqs, { level = 0.5, pan = 0, at = ctx.currentTime + 0.01, tail = 1 } = {}) {
      const out = bus(level, pan)
      PARTIALS.forEach((p, i) => voice(out, freqs[i], p.amp, p.decay * tail, at))
      voice(out, freqs[4] * 1.0013, 0.16, 2.6 * tail, at)
      voice(out, freqs[4] * 1.5, 0.14, 1.1 * tail, at)
      voice(out, freqs[4] * 2.01, 0.09, 0.7 * tail, at)
      voice(out, freqs[4] * 2.66, 0.05, 0.45 * tail, at)
      burst(out, freqs[4] * 2.2, 1.4, 0.35, 0.05, at)
    },
    cut(depth) {
      const at = ctx.currentTime + 0.01
      const out = bus(0.5, 0.2)
      burst(out, 3400 - depth * 900, 2.5, 0.6, 0.22, at)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(2100, at)
      osc.frequency.exponentialRampToValueAtTime(1500, at + 0.2)
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.05, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.24)
      osc.connect(gain).connect(out)
      osc.start(at)
      osc.stop(at + 0.3)
    },
    clank() {
      const at = ctx.currentTime + 0.01
      const out = bus(0.7, 0)
      ;[[183, 0.5], [263, 0.4], [411, 0.32], [697, 0.2], [1130, 0.12]].forEach(([f, a]) => voice(out, f, a, 0.5, at, 'triangle'))
      burst(out, 300, 0.8, 0.9, 0.35, at, 'lowpass')
    },
    pour() {
      const at = ctx.currentTime + 0.01
      const out = bus(0.6, -0.2)
      const src = ctx.createBufferSource()
      src.buffer = noise
      src.loop = true
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(300, at)
      filter.frequency.exponentialRampToValueAtTime(1600, at + 1.1)
      filter.frequency.exponentialRampToValueAtTime(240, at + 2.6)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.5, at + 0.4)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 2.8)
      src.connect(filter).connect(gain).connect(out)
      src.start(at)
      src.stop(at + 2.9)
    },
    close() { ctx.close() }
  }
}

// The lathe profile closes the wall: up the outside, across the crown, down the inside.
function bellGeometry(pattern, cuts, scale, cutGlow) {
  const { outer, inner, crown } = bellProfile(pattern, cuts)
  const top = outer[outer.length - 1][1]
  const points = [
    ...outer.map(([r, y]) => new THREE.Vector2(r * scale, y * scale)),
    new THREE.Vector2(outer[outer.length - 1][0] * 0.55 * scale, (top + 0.012) * scale),
    new THREE.Vector2(0.001, (top + 0.016) * scale),
    new THREE.Vector2(0.001, (top - crown) * scale),
    ...inner.slice().reverse().map(([r, y]) => new THREE.Vector2(r * scale, y * scale)),
    new THREE.Vector2(outer[0][0] * scale, 0)
  ]
  const segments = 72
  const geo = new THREE.LatheGeometry(points, segments)
  const colors = []
  const base = new THREE.Color(0xb88442)
  const bright = new THREE.Color(0xf4d29a)
  const dark = new THREE.Color(0x6b4524)
  const innerStart = outer.length + 3
  const c = new THREE.Color()
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    const streak = 0.5 + 0.5 * Math.sin(angle * 3 + Math.sin(angle * 7) * 0.8)
    points.forEach((_, j) => {
      c.copy(base).lerp(dark, 0.22 * streak)
      if (j >= innerStart && j < innerStart + inner.length) {
        const s = inner[inner.length - 1 - (j - innerStart)][2]
        let glow = 0
        BANDS.forEach((band, k) => { if (cuts[k]) glow = Math.max(glow, Math.min(1, cuts[k] / 3) * Math.exp(-(((s - band.at) / 0.06) ** 2))) })
        c.lerp(bright, glow * cutGlow)
      }
      if (j < 3) c.lerp(bright, 0.25)
      colors.push(c.r, c.g, c.b)
    })
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return geo
}

function mouldGeometry(pattern, scale) {
  const { outer } = bellProfile(pattern, [0, 0, 0, 0, 0], 24)
  const top = outer[outer.length - 1][1]
  const points = [
    new THREE.Vector2(0.001, -0.06 * scale),
    new THREE.Vector2((outer[0][0] + 0.09) * scale, -0.06 * scale),
    ...outer.map(([r, y]) => new THREE.Vector2((r + 0.07) * scale, y * scale)),
    new THREE.Vector2(0.08 * scale, (top + 0.08) * scale),
    new THREE.Vector2(0.001, (top + 0.1) * scale)
  ]
  return new THREE.LatheGeometry(points, 48)
}

function strickleGeometry(pattern, scale) {
  const { outer } = bellProfile(pattern, [0, 0, 0, 0, 0], 24)
  const top = outer[outer.length - 1][1]
  const shape = new THREE.Shape()
  shape.moveTo(0, (top + 0.24) * scale)
  shape.lineTo(0.16 * scale, (top + 0.24) * scale)
  shape.lineTo(0.16 * scale, (top + 0.08) * scale)
  ;[...outer].reverse().forEach(([r, y]) => shape.lineTo((r + 0.07) * scale, y * scale))
  shape.lineTo((outer[0][0] + 0.2) * scale, 0)
  shape.lineTo((outer[0][0] + 0.2) * scale, (top + 0.24) * scale)
  shape.lineTo((outer[0][0] + 0.2) * scale, (top + 0.32) * scale)
  shape.lineTo(0, (top + 0.32) * scale)
  return new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: false })
}

function profilePath(pattern, w, h, pad) {
  const { outer, inner, crown } = bellProfile(pattern, [0, 0, 0, 0, 0], 30)
  const k = ((h - pad * 2) / 0.85) * patternDiameter(pattern.dia)
  const Y = y => h - pad - y * k
  const side = dir => {
    const X = r => w / 2 + dir * r * k * 1.3
    const top = outer[outer.length - 1][1]
    const outerPts = outer.map(([r, y]) => `${X(r).toFixed(1)} ${Y(y).toFixed(1)}`)
    const innerPts = inner.slice().reverse().map(([r, y]) => `${X(r).toFixed(1)} ${Y(y).toFixed(1)}`)
    return { X, d: `M ${outerPts.join(' L ')} L ${X(0).toFixed(1)} ${Y(top + 0.012).toFixed(1)} L ${X(0).toFixed(1)} ${Y(top - crown).toFixed(1)} L ${innerPts.join(' L ')} Z` }
  }
  const right = side(1)
  const bow = inner[4]
  return {
    wall: right.d,
    ghost: side(-1).d,
    lip: [right.X(outer[0][0]), Y(0)],
    bowWall: [right.X(bow[0]), Y(bow[1])],
    bow: [right.X(bow[0]) - 44, Y(bow[1]) - 6],
    axis: w / 2,
    Y
  }
}

export default function BellFoundry() {
  const rootRef = useRef(null)
  const stageRef = useRef(null)
  const engineRef = useRef(null)
  const audioRef = useRef(null)
  const live = useRef({})
  const laneRefs = useRef([])
  const railRefs = useRef([])
  const leaderRef = useRef(null)
  const boardRef = useRef(null)
  const timers = useRef([])
  const reduced = useReducedMotion()

  const [phase, setPhase] = useState('intro')
  const [bellIndex, setBellIndex] = useState(0)
  const [pattern, setPattern] = useState({ dia: 0, thick: 0 })
  const [cast, setCast] = useState(null)
  const [band, setBand] = useState(3)
  const [ring, setRing] = useState([])
  const [bronze, setBronze] = useState(CRUCIBLE)
  const [muted, setMuted] = useState(false)
  const [tower, setTower] = useState({ row: -1, struck: [], clashes: 0, done: false })
  const [ledger, setLedger] = useState(readLedger)
  const [message, setMessage] = useState('The parish has ordered a ring of four: D, C♯, B and A. Every cut lowers the bell. Nothing you cut away comes back.')

  const bell = BELLS[bellIndex]
  const devs = cast ? deviations(cast) : null
  const prediction = predictCents(pattern)
  const weight = patternWeight(bell, pattern)
  const lightest = patternWeight(bell, { dia: -1, thick: -1 })
  const bellGrade = devs ? grade(devs) : null

  live.current = { phase, bellIndex, pattern, cast, band, ring, reduced, devs, tower }

  useEffect(() => { audioRef.current?.setMuted(muted) }, [muted])

  const later = useCallback((fn, ms) => { timers.current.push(setTimeout(fn, ms)) }, [])

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = createAudio()
      audioRef.current?.setMuted(muted)
    }
    if (audioRef.current?.ctx.state === 'suspended') audioRef.current.ctx.resume()
    return audioRef.current
  }, [muted])

  const clock = () => audioRef.current ? audioRef.current.now() : performance.now() / 1000

  // Scene: built once, then steered by refs from the frame loop.
  useEffect(() => {
    const stage = stageRef.current
    const small = Math.min(window.innerWidth, window.innerHeight) < 600
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.6 : 1.75))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    renderer.domElement.className = 'bf-canvas'
    stage.prepend(renderer.domElement)

    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTexture
    scene.environmentIntensity = 0.6
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80)

    const hemi = new THREE.HemisphereLight(0xffd8ae, 0x140d0a, 0.7)
    const key = new THREE.DirectionalLight(0xfff0dc, 2.1)
    key.position.set(-3, 7, 5)
    const rim = new THREE.DirectionalLight(0x9fb4ff, 0.9)
    rim.position.set(5, 3, -6)
    const furnace = new THREE.PointLight(0xff6a1f, 16, 16, 1.6)
    furnace.position.set(-4.2, 1.1, 1.4)
    const pourLight = new THREE.PointLight(0xff8a3a, 0, 7, 1.5)
    pourLight.position.set(0, 2.4, 1.2)
    scene.add(hemi, key, rim, furnace, pourLight)

    const materials = {
      floor: new THREE.MeshStandardMaterial({ color: 0x241b16, roughness: 0.96 }),
      iron: new THREE.MeshStandardMaterial({ color: 0x34302c, metalness: 0.7, roughness: 0.45 }),
      ironDark: new THREE.MeshStandardMaterial({ color: 0x1d1a18, metalness: 0.6, roughness: 0.6 }),
      bronze: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.88, roughness: 0.3, side: THREE.DoubleSide, emissive: 0xff5a14, emissiveIntensity: 0 }),
      loam: new THREE.MeshStandardMaterial({ color: 0x8c5a3c, roughness: 1, transparent: true, opacity: 1, emissive: 0xff4a10, emissiveIntensity: 0 }),
      board: new THREE.MeshStandardMaterial({ color: 0xc9a46c, roughness: 0.85 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x5a3b24, roughness: 0.9 }),
      ring: new THREE.MeshBasicMaterial({ color: 0xffb35c, transparent: true, opacity: 0.85, depthTest: false }),
      crack: new THREE.LineBasicMaterial({ color: 0x120604 }),
      spark: new THREE.PointsMaterial({ color: 0xffb060, size: 0.06, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    }

    const geos = []
    const keep = geo => { geos.push(geo); return geo }
    // Casting-pit sand: a painted floor so the lathe stands somewhere.
    const sandCanvas = document.createElement('canvas')
    sandCanvas.width = 512
    sandCanvas.height = 512
    const sand = sandCanvas.getContext('2d')
    const sandGrad = sand.createRadialGradient(256, 256, 30, 256, 256, 256)
    sandGrad.addColorStop(0, '#5a4636')
    sandGrad.addColorStop(0.55, '#3a2c22')
    sandGrad.addColorStop(1, '#150f0c')
    sand.fillStyle = sandGrad
    sand.fillRect(0, 0, 512, 512)
    let seed = 17
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    for (let n = 0; n < 7000; n++) {
      sand.fillStyle = `rgba(${rnd() > 0.5 ? '20,12,8' : '190,150,110'},${0.05 + rnd() * 0.1})`
      sand.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 2, 1 + rnd() * 2)
    }
    sand.strokeStyle = 'rgba(200,160,120,0.12)'
    for (let n = 0; n < 6; n++) {
      sand.beginPath()
      sand.arc(256, 256, 90 + n * 26, 0, Math.PI * 2)
      sand.stroke()
    }
    const sandTexture = new THREE.CanvasTexture(sandCanvas)
    sandTexture.colorSpace = THREE.SRGBColorSpace
    materials.floor.map = sandTexture
    materials.floor.color.set(0xffffff)
    const floor = new THREE.Mesh(keep(new THREE.CircleGeometry(11, 48)), materials.floor)
    floor.rotation.x = -Math.PI / 2
    scene.add(floor)
    const melt = new THREE.MeshStandardMaterial({ color: 0x2a0a02, emissive: 0xff6a1a, emissiveIntensity: 1.1, roughness: 0.4 })
    materials.melt = melt
    const crucible = new THREE.Group()
    const pot = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.62, 0.46, 0.9, 24, 1, true)), materials.ironDark)
    pot.position.y = 0.45
    const pool = new THREE.Mesh(keep(new THREE.CircleGeometry(0.6, 24)), melt)
    pool.rotation.x = -Math.PI / 2
    pool.position.y = 0.82
    crucible.add(pot, pool)
    crucible.position.set(-3.6, 0, -1.6)
    scene.add(crucible)

    // The lathe: a turntable, a crossrail overhead and a boring bar that reaches into the mouth.
    const lathe = new THREE.Group()
    const table = new THREE.Mesh(keep(new THREE.CylinderGeometry(1.55, 1.7, TABLE_TOP, 48)), materials.iron)
    table.position.y = TABLE_TOP / 2
    const spinner = new THREE.Group()
    spinner.position.y = TABLE_TOP
    const dogGeo = keep(new THREE.BoxGeometry(0.16, 0.12, 0.3))
    for (let n = 0; n < 4; n++) {
      const dog = new THREE.Mesh(dogGeo, materials.ironDark)
      const a = (n / 4) * Math.PI * 2
      dog.position.set(Math.cos(a) * 1.3, 0.06, Math.sin(a) * 1.3)
      dog.rotation.y = -a
      spinner.add(dog)
    }
    const railBeam = new THREE.Mesh(keep(new THREE.BoxGeometry(7, 0.3, 0.36)), materials.iron)
    railBeam.position.set(0, 4.3, -0.9)
    const columnGeo = keep(new THREE.BoxGeometry(0.42, 4.5, 0.42))
    const columnA = new THREE.Mesh(columnGeo, materials.ironDark)
    columnA.position.set(-3.2, 2.25, -0.9)
    const columnB = columnA.clone()
    columnB.position.x = 3.2
    const tool = new THREE.Group()
    const bar = new THREE.Mesh(keep(new THREE.BoxGeometry(0.12, 4, 0.12)), materials.iron)
    bar.position.y = 2
    const bit = new THREE.Mesh(keep(new THREE.ConeGeometry(0.05, 0.22, 8)), materials.ironDark)
    bit.rotation.x = -Math.PI / 2
    bit.position.set(0, 0, -0.1)
    const holder = new THREE.Mesh(keep(new THREE.BoxGeometry(0.14, 0.14, 0.2)), materials.iron)
    tool.add(bar, bit, holder)
    lathe.add(table, spinner, railBeam, columnA, columnB, tool)
    scene.add(lathe)

    const bellMesh = new THREE.Mesh(keep(new THREE.BufferGeometry()), materials.bronze)
    const bellPivot = new THREE.Group()
    bellPivot.add(bellMesh)
    spinner.add(bellPivot)
    const mould = new THREE.Mesh(keep(new THREE.BufferGeometry()), materials.loam)
    const strickle = new THREE.Mesh(keep(new THREE.BufferGeometry()), materials.board)
    const strickleArm = new THREE.Group()
    strickleArm.add(strickle)
    strickleArm.position.y = TABLE_TOP
    const spindle = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.035, 0.035, 3.2, 8)), materials.iron)
    spindle.position.y = 1.6
    strickleArm.add(spindle)
    spinner.add(mould)
    lathe.add(strickleArm)
    const bandRing = new THREE.Mesh(keep(new THREE.TorusGeometry(1, 0.012, 6, 64)), materials.ring)
    bandRing.rotation.x = Math.PI / 2
    bandRing.renderOrder = 3
    scene.add(bandRing)
    const crackGeo = keep(new THREE.BufferGeometry())
    const crack = new THREE.Line(crackGeo, materials.crack)
    bellPivot.add(crack)

    const SPARKS = 180
    const sparkPos = new Float32Array(SPARKS * 3)
    const sparkVel = new Float32Array(SPARKS * 3)
    const sparkLife = new Float32Array(SPARKS)
    const sparkGeo = keep(new THREE.BufferGeometry())
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3))
    const sparks = new THREE.Points(sparkGeo, materials.spark)
    sparks.frustumCulled = false
    scene.add(sparks)
    let sparkCursor = 0
    const emit = (origin, count, spread, lift) => {
      if (live.current.reduced) return
      for (let n = 0; n < count; n++) {
        const k = sparkCursor++ % SPARKS
        sparkPos.set([origin.x, origin.y, origin.z], k * 3)
        sparkVel.set([(Math.random() - 0.5) * spread, Math.random() * lift, (Math.random() - 0.3) * spread], k * 3)
        sparkLife[k] = 0.5 + Math.random() * 0.7
      }
    }

    // The tower: a timber frame with four headstocks, built from the bells you hang.
    const towerGroup = new THREE.Group()
    towerGroup.visible = false
    const beamGeo = keep(new THREE.BoxGeometry(10.5, 0.32, 0.4))
    const frontBeam = new THREE.Mesh(beamGeo, materials.wood)
    frontBeam.position.set(0, 3.1, 1.7)
    const backBeam = frontBeam.clone()
    backBeam.position.z = -1.7
    const postGeo = keep(new THREE.BoxGeometry(0.34, 2.1, 0.34))
    const bearingGeo = keep(new THREE.BoxGeometry(0.3, 1.8, 0.3))
    towerGroup.add(frontBeam, backBeam)
    ;[-5, 5].forEach(x => [-1.7, 1.7].forEach(z => {
      const post = new THREE.Mesh(postGeo, materials.wood)
      post.position.set(x, 4.1, z)
      towerGroup.add(post)
    }))
    ;[-5, -2.5, 0, 2.5, 5].forEach(x => {
      const bearing = new THREE.Mesh(bearingGeo, materials.wood)
      bearing.position.set(x, 4.0, 0)
      towerGroup.add(bearing)
    })
    const sillGeo = keep(new THREE.BoxGeometry(0.34, 0.3, 3.7))
    ;[-5, -2.5, 0, 2.5, 5].forEach(x => {
      const sill = new THREE.Mesh(sillGeo, materials.wood)
      sill.position.set(x, 3.1, 0)
      towerGroup.add(sill)
    })
    const wheelGeo = keep(new THREE.TorusGeometry(0.95, 0.05, 6, 40))
    const spokeGeo = keep(new THREE.BoxGeometry(0.05, 1.9, 0.06))
    const towerSlots = [-3.75, -1.25, 1.25, 3.75].map(x => {
      const pivot = new THREE.Group()
      pivot.position.set(x, 4.9, 0)
      const stock = new THREE.Mesh(keep(new THREE.BoxGeometry(0.9, 0.34, 0.5)), materials.wood)
      stock.position.y = 0.1
      const axle = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8)), materials.iron)
      axle.rotation.z = Math.PI / 2
      axle.scale.y = 0.95
      const wheel = new THREE.Group()
      wheel.position.x = 0.92
      const rim = new THREE.Mesh(wheelGeo, materials.wood)
      rim.rotation.y = Math.PI / 2
      wheel.add(rim)
      for (let n = 0; n < 3; n++) {
        const spoke = new THREE.Mesh(spokeGeo, materials.wood)
        spoke.rotation.x = (n / 3) * Math.PI
        wheel.add(spoke)
      }
      pivot.add(stock, axle, wheel)
      towerGroup.add(pivot)
      return { pivot, mesh: null, angle: Math.PI - 0.12 }
    })
    scene.add(towerGroup)

    const engine = {
      renderer, scene, camera, bellMesh, bellPivot, mould, strickle, strickleArm, bandRing, crack, tool, lathe, spinner, towerGroup, towerSlots,
      flip: 1, flipTarget: 1, scale: 2, castStart: 0, strikeAt: -10, yaw: 0, yawTarget: 0, camPos: new THREE.Vector3(0, 5, 8), camLook: new THREE.Vector3(0, 1.5, 0),
      envelope: PARTIALS.map(() => 0), lanePhase: PARTIALS.map(() => 0), toolY: 1.5, toolR: 0.5, cutFlash: 0, crackAt: -10,
      emit, materials, towerBlows: [], towerStart: 0, keep
    }
    engineRef.current = engine

    let width = 1
    let height = 1
    const resize = () => {
      const rect = stage.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(stage)
    resize()

    const v = new THREE.Vector3()
    const project = (x, y, z) => {
      v.set(x, y, z).project(camera)
      return [(v.x + 1) / 2 * width, (1 - v.y) / 2 * height]
    }

    let raf = 0
    let last = performance.now()
    const frame = now => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000
      const L = live.current
      const motion = L.reduced ? 0 : 1
      const inTower = L.phase === 'tower' || L.phase === 'ending'
      const s = engine.scale

      // Camera: one rig per place in the foundry, eased.
      const aspect = width / height
      const reach = Math.max(1, 0.82 / aspect)
      const shift = inTower ? 0 : aspect < 0.95 ? s * 0.34 : s * 0.12
      engine.yaw += (engine.yawTarget - engine.yaw) * Math.min(1, dt * 6)
      let target
      let look
      if (inTower) {
        const d = 15 * Math.max(1, 1.15 / aspect)
        target = new THREE.Vector3(Math.sin(engine.yaw) * d * 0.5, 4.9 + d * 0.5, Math.cos(engine.yaw) * d * 0.86)
        look = new THREE.Vector3(0, 3.9, 0)
      } else if (L.phase === 'tuning' || L.phase === 'cracked' || L.phase === 'intro') {
        const d = 4.7 * reach
        target = new THREE.Vector3(Math.sin(engine.yaw) * d * 0.85 + shift, TABLE_TOP + HEIGHT * s + d * 0.95, Math.cos(engine.yaw) * d * 0.85)
        look = new THREE.Vector3(shift, TABLE_TOP + HEIGHT * s * 0.42, 0)
        if (L.phase === 'intro' && motion) target.x += Math.sin(t * 0.21) * 0.8
      } else {
        const d = 5.8 * reach
        target = new THREE.Vector3(Math.sin(engine.yaw) * d, TABLE_TOP + HEIGHT * s * 0.95 + d * 0.28, Math.cos(engine.yaw) * d)
        look = new THREE.Vector3(0, TABLE_TOP + HEIGHT * s * 0.5, 0)
      }
      const ease = L.reduced ? 1 : Math.min(1, dt * 3.2)
      engine.camPos.lerp(target, ease)
      engine.camLook.lerp(look, ease)
      camera.position.copy(engine.camPos)
      camera.lookAt(engine.camLook)

      furnace.intensity = 14 + (motion ? Math.sin(t * 7.3) * 2 + Math.sin(t * 2.1) * 3 : 0)
      melt.emissiveIntensity = 1.1 + (motion ? Math.sin(t * 5.1) * 0.25 : 0)
      lathe.visible = !inTower
      crucible.visible = !inTower
      floor.visible = !inTower
      towerGroup.visible = inTower

      // Casting: the mould glows as it fills, breaks away, and the bell turns mouth-up.
      const sinceCast = t - engine.castStart
      const casting = L.phase === 'casting'
      const patterning = L.phase === 'pattern'
      mould.visible = patterning || (casting && sinceCast < 2.2)
      strickleArm.visible = patterning
      bellMesh.visible = !patterning
      if (casting) {
        const fill = Math.min(1, sinceCast / 1.1)
        materials.loam.emissiveIntensity = fill * 0.9
        materials.loam.opacity = sinceCast < 1.3 ? 1 : Math.max(0, 1 - (sinceCast - 1.3) / 0.8)
        materials.bronze.emissiveIntensity = Math.max(0, 1.4 - Math.max(0, sinceCast - 1.2) * 0.6)
        pourLight.intensity = 14 * Math.max(0, 1 - Math.abs(sinceCast - 0.9) / 1.6)
        engine.flipTarget = sinceCast > 2.2 ? 1 : 0
        if (motion && sinceCast < 1.2 && Math.random() < 0.6) emit(new THREE.Vector3(0, TABLE_TOP + (HEIGHT + 0.12) * s, 0), 3, 1.6, 2.4)
      } else {
        materials.loam.emissiveIntensity = 0
        materials.loam.opacity = 1
        materials.bronze.emissiveIntensity = Math.max(0, materials.bronze.emissiveIntensity - dt * 0.8)
        pourLight.intensity = Math.max(0, pourLight.intensity - dt * 20)
        engine.flipTarget = patterning ? 0 : 1
      }
      engine.flip += (engine.flipTarget - engine.flip) * (L.reduced ? 1 : Math.min(1, dt * 3))
      bellPivot.rotation.x = Math.PI * engine.flip
      bellPivot.position.y = HEIGHT * s * engine.flip

      // A struck bell breathes in its (2,0) mode: the rim goes oval and back.
      const sinceStrike = t - engine.strikeAt
      const wobble = motion ? Math.exp(-sinceStrike * 2.2) * Math.sin(sinceStrike * 46) * 0.012 : 0
      bellMesh.scale.set(1 + wobble, 1, 1 - wobble)
      const spin = L.phase === 'tuning' || L.phase === 'intro' ? 0.9 : patterning ? 0.05 : 0.15
      if (L.phase !== 'cracked') spinner.rotation.y += dt * spin * (L.reduced ? 0.25 : 1)
      if (patterning) strickleArm.rotation.y += dt * (L.reduced ? 0.2 : 0.8)

      // Boring bar rides to the selected band on the far inner wall.
      const bandInfo = BANDS[L.band]
      const shape = L.cast ? L.cast : L.phase === 'intro' ? { pattern: INTRO_PATTERN, cuts: INTRO_CUTS } : null
      const prof = shape ? bellProfile(shape.pattern, shape.cuts, 30) : null
      if (prof) {
        const k = Math.round(bandInfo.at / 0.97 * 30)
        const [ri] = prof.inner[Math.min(30, Math.max(0, k))]
        engine.toolR = ri * s
      }
      const bandY = TABLE_TOP + (HEIGHT - bandInfo.at * HEIGHT) * s
      const tuning = L.phase === 'tuning'
      const toolTargetY = tuning ? bandY : TABLE_TOP + HEIGHT * s + 2.2
      engine.toolY += (toolTargetY - engine.toolY) * Math.min(1, dt * (L.reduced ? 60 : 5))
      engine.cutFlash = Math.max(0, engine.cutFlash - dt * 3)
      const plunge = engine.cutFlash * 0.06
      tool.position.set(0, engine.toolY, -(engine.toolR - 0.13 - (0.06 - plunge)))
      if (L.phase === 'intro') {
        tool.position.y = TABLE_TOP + HEIGHT * s * (0.35 + 0.25 * Math.sin(t * 0.4))
        tool.position.z = -(engine.toolR - 0.12)
        if (motion && Math.random() < 0.15) emit(new THREE.Vector3(0, tool.position.y, tool.position.z), 2, 1.2, 1)
      }
      bandRing.visible = tuning
      bandRing.position.y = bandY
      bandRing.scale.setScalar(engine.toolR + 0.01)
      materials.ring.opacity = 0.45 + 0.35 * Math.sin(t * 4) * motion + 0.2

      // Sparks fall under gravity and fade.
      for (let n = 0; n < SPARKS; n++) {
        if (sparkLife[n] <= 0) {
          sparkPos[n * 3 + 1] = -50
          continue
        }
        sparkLife[n] -= dt
        sparkVel[n * 3 + 1] -= 6.5 * dt
        sparkPos[n * 3] += sparkVel[n * 3] * dt
        sparkPos[n * 3 + 1] += sparkVel[n * 3 + 1] * dt
        sparkPos[n * 3 + 2] += sparkVel[n * 3 + 2] * dt
        if (sparkPos[n * 3 + 1] < 0.02) {
          sparkPos[n * 3 + 1] = 0.02
          sparkVel[n * 3 + 1] *= -0.3
        }
      }
      sparkGeo.attributes.position.needsUpdate = true

      // Strobe drum: each lane drifts at a speed set by its partial's error in cents.
      const lanes = laneRefs.current
      PARTIALS.forEach((p, i) => {
        engine.envelope[i] = Math.max(0, engine.envelope[i] - dt / (p.decay * 0.6))
        const lane = lanes[i]
        if (!lane || !L.devs) return
        engine.lanePhase[i] = (engine.lanePhase[i] + L.devs[i] * 0.9 * dt * motion) % 24
        lane.style.setProperty('--bf-phase', `${engine.lanePhase[i].toFixed(2)}px`)
        lane.style.setProperty('--bf-energy', (0.2 + 0.75 * Math.min(1, engine.envelope[i])).toFixed(3))
      })

      // Band rail leaders: from each rail button to its true height on the bell.
      const leader = leaderRef.current
      if (leader && tuning && L.cast) {
        const rect = stage.getBoundingClientRect()
        SCREEN_BANDS.forEach((j, row) => {
          const line = leader.children[row]
          const button = railRefs.current[j]
          if (!line || !button) return
          const by = TABLE_TOP + (HEIGHT - BANDS[j].at * HEIGHT) * s
          const outerR = (bellProfile(L.cast.pattern, L.cast.cuts, 30).outer[Math.round(BANDS[j].at / 0.97 * 30)][0]) * s
          const angle = engine.yaw + Math.PI / 2
          const [px, py] = project(Math.sin(angle) * outerR, by, Math.cos(angle) * outerR)
          const b = button.getBoundingClientRect()
          line.setAttribute('x1', (b.left - rect.left).toFixed(1))
          line.setAttribute('y1', (b.top - rect.top + b.height / 2).toFixed(1))
          line.setAttribute('x2', px.toFixed(1))
          line.setAttribute('y2', py.toFixed(1))
        })
      }

      // Tower: each bell swings full circle between its blows, set mouth-up at rest.
      if (inTower) {
        const tnow = audioRef.current ? audioRef.current.now() : performance.now() / 1000
        const A = Math.PI - 0.12
        towerSlots.forEach((slot, b) => {
          if (!slot.mesh) return
          const blows = engine.towerBlows.filter(bl => bl.bell === b)
          let side = 1
          const k = blows.findIndex(bl => bl.t > tnow)
          if (blows.length && k === -1) side = (blows.length - 1) % 2 === 0 ? -1 : 1
          else if (k >= 0) {
            const before = k === 0 ? 1 : ((k - 1) % 2 === 0 ? -1 : 1)
            const from = k > 0 ? blows[k - 1].t : blows[k].t - BLOW * 4
            const u = Math.min(1, Math.max(0, (tnow - from) / (blows[k].t - from)))
            const e = L.reduced ? (u > 0.5 ? 1 : 0) : u * u * (3 - 2 * u)
            side = before - 2 * before * e
          }
          const angle = side * A
          slot.pivot.rotation.x = angle
        })
      }

      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      towerSlots.forEach(slot => slot.mesh?.geometry.dispose())
      bellMesh.geometry.dispose()
      crack.geometry.dispose()
      mould.geometry.dispose()
      strickle.geometry.dispose()
      geos.forEach(g => g.dispose())
      Object.values(materials).forEach(m => m.dispose())
      envTexture.dispose()
      sandTexture.dispose()
      pmrem.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      engineRef.current = null
    }
  }, [])

  useEffect(() => () => {
    timers.current.forEach(clearTimeout)
    audioRef.current?.close()
    audioRef.current = null
  }, [])

  // Geometry follows the model: the clay mould and strickle while patterning, the cast bell after.
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    const index = phase === 'intro' ? 0 : bellIndex
    const shape = cast ? cast.pattern : phase === 'intro' ? INTRO_PATTERN : pattern
    const s = worldScale(index, shape)
    engine.scale = s
    engine.bellMesh.geometry.dispose()
    engine.bellMesh.geometry = bellGeometry(shape, cast ? cast.cuts : phase === 'intro' ? INTRO_CUTS : [0, 0, 0, 0, 0], s, 1)
    if (phase === 'pattern' || phase === 'casting') {
      engine.mould.geometry.dispose()
      engine.mould.geometry = mouldGeometry(shape, s)
      engine.strickle.geometry.dispose()
      engine.strickle.geometry = strickleGeometry(shape, s)
    }
    if (phase !== 'cracked') {
      engine.crack.geometry.dispose()
      engine.crack.geometry = new THREE.BufferGeometry()
    }
  }, [phase, bellIndex, pattern, cast])

  const strike = useCallback((level = 0.55) => {
    const L = live.current
    if (!L.cast || L.phase !== 'tuning') return
    const audio = ensureAudio()
    audio?.strike(frequencies(L.cast), { level })
    const engine = engineRef.current
    if (engine) {
      engine.strikeAt = performance.now() / 1000
      engine.envelope = PARTIALS.map(() => 1)
    }
  }, [ensureAudio])

  const begin = () => {
    ensureAudio()
    setPhase('pattern')
    setMessage(`Sweep the ${bell.name.toLowerCase()}'s mould. Aim the strike note a little sharp of ${bell.note}: the lathe can only take pitch away.`)
  }

  const nudgePattern = (key, delta) => setPattern(p => ({ ...p, [key]: Math.round(Math.min(1, Math.max(-1, p[key] + delta)) * 100) / 100 }))

  const pour = () => {
    if (phase !== 'pattern') return
    if (weight > bronze) {
      setMessage(`The crucible holds ${bronze.toFixed(1)} of bronze and this pattern wants ${weight}. Narrow the lip or thin the sound bow.`)
      return
    }
    const audio = ensureAudio()
    audio?.pour()
    const next = castBell(bellIndex, pattern)
    setBronze(b => Math.round((b - next.weight) * 10) / 10)
    setCast(next)
    setBand(3)
    setPhase('casting')
    setMessage('Bronze at 1100 degrees runs into the loam. Wait for it to set.')
    const engine = engineRef.current
    if (engine) engine.castStart = performance.now() / 1000
    later(() => {
      setPhase('tuning')
      const d = deviations(next)
      setMessage(isFlat(d)
        ? `The pour shrank more than the pattern allowed. The nominal is ${centsText(d[4])} flat, and a lathe cannot raise it. Break it up, or hang it sour.`
        : 'Cast. Strike it and read the drum. Each band you cut lowers all five partials, some far more than others.')
      later(() => strike(0.5), 250)
    }, 3000)
  }

  const cut = amount => {
    if (phase !== 'tuning' || !cast) return
    const next = applyCut(cast, band, amount)
    const engine = engineRef.current
    const audio = ensureAudio()
    if (cracks(next)) {
      audio?.clank()
      setCast(next)
      setPhase('cracked')
      setMessage(`The wall at the ${BANDS[band].name} went too thin and the bell cracked from lip to shoulder.`)
      if (engine) {
        engine.crackAt = performance.now() / 1000
        const s = engine.scale
        const { outer } = bellProfile(next.pattern, next.cuts, 20)
        const points = outer.map(([r, y], n) => new THREE.Vector3(Math.sin(n * 1.7) * 0.04 * s, y * s, (r + 0.004) * s))
        engine.crack.geometry.dispose()
        engine.crack.geometry = new THREE.BufferGeometry().setFromPoints(points.slice(0, 15))
      }
      return
    }
    audio?.cut(amount)
    setCast(next)
    if (engine) {
      engine.cutFlash = 1
      engine.emit(new THREE.Vector3(0, engine.toolY, -(engine.toolR - 0.06)), amount === CUT ? 26 : 9, 1.3, 1.6)
    }
    const left = next.limit - next.cuts[band]
    if (left <= 1) setMessage(`The ${BANDS[band].name} is nearly through: ${left.toFixed(2)} cuts of wall left before it cracks.`)
  }

  const finishTower = useCallback((hung) => {
    setPhase('tower')
    setTower({ row: -1, struck: [], clashes: 0, done: false })
    const engine = engineRef.current
    if (engine) {
      engine.towerSlots.forEach((slot, b) => {
        if (slot.mesh) {
          slot.pivot.remove(slot.mesh)
          slot.mesh.geometry.dispose()
          slot.mesh = null
        }
        const entry = hung[b]
        if (!entry) return
        const s = worldScale(b, entry.cast.pattern) * 0.82
        const mesh = new THREE.Mesh(bellGeometry(entry.cast.pattern, entry.cast.cuts, s, 0.4), engine.materials.bronze)
        mesh.position.y = -HEIGHT * s - 0.02
        slot.mesh = mesh
        slot.pivot.add(mesh)
        slot.pivot.rotation.x = Math.PI - 0.12
      })
      engine.towerBlows = []
      engine.yawTarget = 0
    }
    const count = hung.filter(Boolean).length
    setMessage(count === 4
      ? 'The ring is hung and set mouth-up. You hold the treble rope; the band rings the rest.'
      : `Only ${count} of four bells hang in the frame. The band will ring around the empty places.`)
  }, [])

  const hang = () => {
    if (phase !== 'tuning' || !cast) return
    const d = deviations(cast)
    const entry = { cast, devs: d, grade: grade(d), freqs: frequencies(cast, d) }
    const nextRing = ring.slice()
    nextRing[bellIndex] = entry
    setRing(nextRing)
    setCast(null)
    if (bellIndex === BELLS.length - 1) return finishTower(nextRing)
    const nextIndex = bellIndex + 1
    const need = patternWeight(BELLS[nextIndex], { dia: -1, thick: -1 })
    if (need > bronze) {
      setMessage(`The ${BELLS[nextIndex].name.toLowerCase()} needs at least ${need} of bronze and the crucible holds ${bronze.toFixed(1)}. The ring will hang short.`)
      return finishTower(nextRing)
    }
    setBellIndex(nextIndex)
    setPattern({ dia: 0, thick: 0 })
    setPhase('pattern')
    setMessage(`${bell.name} hung ${GRADE_WORD[entry.grade]}. Now the ${BELLS[nextIndex].name.toLowerCase()} in ${BELLS[nextIndex].note}.`)
  }

  const recast = () => {
    if (!cast || (phase !== 'tuning' && phase !== 'cracked')) return
    const back = Math.round(cast.weight * (1 - DROSS) * 10) / 10
    const total = Math.round((bronze + back) * 10) / 10
    setBronze(total)
    setPattern(cast.pattern)
    setCast(null)
    if (patternWeight(bell, { dia: -1, thick: -1 }) > total) {
      setMessage(`The ${bell.name.toLowerCase()} melted down to dross and there is too little bronze for another pour.`)
      return finishTower(ring)
    }
    setPhase('pattern')
    setMessage(`Broken up. ${back} came back to the crucible and ${(cast.weight - back).toFixed(1)} went to dross. Sweep the mould again.`)
  }

  const shortRing = () => {
    if (phase !== 'cracked') return
    setCast(null)
    finishTower(ring)
  }

  // Ringing: the band rings bells 2-4 on the beat, you pull the treble.
  const startRinging = () => {
    const engine = engineRef.current
    if (!engine || tower.row >= 0) return
    const audio = ensureAudio()
    const t0 = (audio ? audio.now() : performance.now() / 1000) + 1.2
    const blows = []
    let t = t0
    ROWS.forEach((row, r) => {
      row.forEach((b, place) => {
        blows.push({ t, bell: b - 1, row: r, place, judged: false })
        t += BLOW
      })
      if (r % 2 === 1) t += BLOW
    })
    engine.towerBlows = blows
    engine.towerStart = t0
    engine.towerScheduled = 0
    setTower({ row: 0, struck: [], clashes: 0, done: false })
    setMessage('Rounds first. Pull when the treble comes round: first place, then hunting out to the back and down again.')
  }

  const pull = useCallback(() => {
    const engine = engineRef.current
    const L = live.current
    if (!engine || L.phase !== 'tower' || L.tower.row < 0 || L.tower.done) return
    const audio = ensureAudio()
    const now = clock()
    const treble = L.ring[0]
    const candidates = engine.towerBlows.filter(bl => bl.bell === 0 && !bl.judged)
    const nearest = candidates.reduce((best, bl) => (!best || Math.abs(bl.t - now) < Math.abs(best.t - now) ? bl : best), null)
    if (treble) audio?.strike(treble.freqs, { level: 0.42, pan: -0.45, tail: 0.6 })
    if (nearest && Math.abs(nearest.t - now) <= WINDOW) {
      nearest.judged = true
      nearest.error = now - nearest.t
      setTower(tw => ({ ...tw, struck: [...tw.struck, { row: nearest.row, error: nearest.error }] }))
    } else {
      setTower(tw => ({ ...tw, clashes: tw.clashes + 1 }))
    }
  }, [ensureAudio])

  // Scheduler for the band's bells and the judge for missed treble blows.
  useEffect(() => {
    if (phase !== 'tower' || tower.row < 0 || tower.done) return
    const id = setInterval(() => {
      const engine = engineRef.current
      const L = live.current
      if (!engine) return
      const audio = audioRef.current
      const now = clock()
      const blows = engine.towerBlows
      while (engine.towerScheduled < blows.length && blows[engine.towerScheduled].t < now + 0.15) {
        const bl = blows[engine.towerScheduled++]
        const entry = L.ring[bl.bell]
        if (bl.bell !== 0 && entry && audio) audio.strike(entry.freqs, { level: 0.36, pan: -0.45 + bl.bell * 0.3, at: Math.max(bl.t, audio.now() + 0.005), tail: 0.6 })
      }
      let missed = false
      blows.forEach(bl => {
        if (bl.bell === 0 && !bl.judged && now > bl.t + WINDOW) {
          bl.judged = true
          bl.error = null
          missed = true
        }
      })
      const row = blows.reduce((r, bl) => (bl.t <= now ? bl.row : r), 0)
      const end = blows[blows.length - 1].t + 1.6
      setTower(tw => {
        let next = tw
        if (missed) next = { ...next, struck: [...next.struck, ...blows.filter(bl => bl.bell === 0 && bl.error === null && !next.struck.some(st => st.row === bl.row)).map(bl => ({ row: bl.row, error: null }))] }
        if (row !== next.row) next = { ...next, row }
        if (now > end) next = { ...next, done: true }
        return next
      })
    }, 30)
    return () => clearInterval(id)
  }, [phase, tower.row, tower.done])

  const trebleBlows = ROWS.length
  const scored = tower.struck.map(st => (st.error === null ? 0 : Math.max(0, 1 - Math.abs(st.error) / WINDOW)))
  const striking = Math.round((scored.reduce((a, b) => a + b, 0) / trebleBlows) * 100)
  const grades = BELLS.map((_, b) => ring[b]?.grade || 'missing')

  useEffect(() => {
    if (!tower.done || phase !== 'tower') return
    const entry = { at: new Date().toISOString().slice(0, 10), grades, striking }
    const next = [entry, ...readLedger()]
    writeLedger(next)
    setLedger(next.slice(0, 5))
    setPhase('ending')
    setMessage('The ring stands. Read what the tower says about the foundry.')
  }, [tower.done])

  const restart = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setRing([])
    setCast(null)
    setBronze(CRUCIBLE)
    setBellIndex(0)
    setPattern({ dia: 0, thick: 0 })
    setTower({ row: -1, struck: [], clashes: 0, done: false })
    const engine = engineRef.current
    if (engine) {
      engine.towerBlows = []
      engine.towerSlots.forEach(slot => {
        if (slot.mesh) {
          slot.pivot.remove(slot.mesh)
          slot.mesh.geometry.dispose()
          slot.mesh = null
        }
      })
    }
    setPhase('pattern')
    setMessage(`A fresh crucible. Sweep the treble's mould for ${BELLS[0].note}.`)
  }

  // Stage gestures: drag to walk round the lathe, tap the bell to strike it.
  const drag = useRef(null)
  const onPointerDown = event => {
    if (event.target !== event.currentTarget && event.target.tagName !== 'CANVAS') return
    drag.current = { x: event.clientX, yaw: engineRef.current?.yawTarget || 0, moved: false }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const onPointerMove = event => {
    if (!drag.current) return
    const dx = event.clientX - drag.current.x
    if (Math.abs(dx) > 10) drag.current.moved = true
    if (drag.current.moved && engineRef.current) engineRef.current.yawTarget = Math.max(-0.9, Math.min(0.9, drag.current.yaw - dx / 260))
  }
  const onPointerUp = () => {
    const state = drag.current
    drag.current = null
    if (!state || state.moved) return
    if (phase === 'tuning') strike()
    else if (phase === 'tower' && tower.row >= 0) pull()
  }

  const onKeyDown = event => {
    const k = event.key
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (event.target.closest?.('[data-bf-slider]') && k.startsWith('Arrow')) return
    if (event.target.tagName === 'BUTTON' && (k === 'Enter' || k === ' ')) return
    if (k === 'm' || k === 'M') return setMuted(m => !m)
    if (phase === 'intro' && (k === 'Enter' || k === ' ')) { event.preventDefault(); return begin() }
    if (phase === 'pattern') {
      if (k === 'ArrowLeft' || k === 'ArrowRight') { event.preventDefault(); return nudgePattern('dia', k === 'ArrowRight' ? 0.05 : -0.05) }
      if (k === 'ArrowUp' || k === 'ArrowDown') { event.preventDefault(); return nudgePattern('thick', k === 'ArrowUp' ? 0.05 : -0.05) }
      if (k === 'p' || k === 'P' || k === 'Enter') { event.preventDefault(); return pour() }
    }
    if (phase === 'tuning') {
      if (k === 'ArrowUp' || k === 'ArrowDown') {
        event.preventDefault()
        const row = SCREEN_BANDS.indexOf(band)
        const nextRow = Math.max(0, Math.min(4, row + (k === 'ArrowUp' ? -1 : 1)))
        return setBand(SCREEN_BANDS[nextRow])
      }
      if (['1', '2', '3', '4', '5'].includes(k)) return setBand(SCREEN_BANDS[Number(k) - 1])
      if (k === ' ') { event.preventDefault(); return strike() }
      if (k === 'c' || k === 'C') return cut(CUT)
      if (k === 'x' || k === 'X') return cut(SKIM)
      if (k === 'h' || k === 'H') return hang()
      if (k === 'b' || k === 'B') return recast()
    }
    if (phase === 'cracked' && (k === 'b' || k === 'B')) return recast()
    if (phase === 'tower') {
      if ((k === ' ' || k === 'Enter') && tower.row < 0) { event.preventDefault(); return startRinging() }
      if (k === ' ' || k === 'j' || k === 'J') { event.preventDefault(); return pull() }
    }
    if (phase === 'ending' && (k === 'r' || k === 'R')) return restart()
  }

  const keyHandler = useRef(onKeyDown)
  keyHandler.current = onKeyDown
  useEffect(() => {
    const handle = event => keyHandler.current(event)
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [])

  // Strickle board drag: the lip handle sets diameter, the sound-bow handle sets wall.
  const boardDrag = useRef(null)
  const board = profilePath(pattern, 320, 200, 14)
  const boardPointer = (handle, event) => {
    if (event.type === 'pointerdown') {
      event.currentTarget.setPointerCapture?.(event.pointerId)
      boardDrag.current = { handle, x: event.clientX, start: pattern[handle === 'lip' ? 'dia' : 'thick'] }
      return
    }
    const state = boardDrag.current
    if (!state || state.handle !== handle) return
    if (event.type === 'pointerup' || event.type === 'pointercancel') { boardDrag.current = null; return }
    const rect = boardRef.current.getBoundingClientRect()
    const dx = ((event.clientX - state.x) / rect.width) * 320
    const keyName = handle === 'lip' ? 'dia' : 'thick'
    const perPx = handle === 'lip' ? 1 / 36 : -1 / 30
    setPattern(p => ({ ...p, [keyName]: Math.round(Math.min(1, Math.max(-1, state.start + dx * perPx)) * 100) / 100 }))
  }
  const sliderKeys = (keyName, event) => {
    const step = { ArrowRight: 0.05, ArrowUp: 0.05, ArrowLeft: -0.05, ArrowDown: -0.05 }[event.key]
    if (step === undefined) return
    event.preventDefault()
    event.stopPropagation()
    nudgePattern(keyName, step)
  }

  const gaugeX = c => Math.min(100, Math.max(0, ((c + 60) / 220) * 100))
  const lanePos = d => `${(Math.min(LANE_RANGE, Math.max(-LANE_RANGE, d)) / LANE_RANGE) * 50 + 50}%`
  const firstRow = Math.min(ROWS.length - 11, Math.max(0, tower.row - 5))
  const visibleRows = ROWS.slice(firstRow, firstRow + 11)
  const placeY = place => 14 + place * 17
  const rowX = n => 22 + n * 27
  const trebleLine = visibleRows.map((row, n) => `${rowX(n)} ${placeY(row.indexOf(1))}`).join(' L ')

  return (
    <div
      ref={rootRef}
      className={`bf-root bf-phase-${phase} ${reduced ? 'bf-reduced' : ''}`}
      data-testid="bell-foundry"
    >
      <header className="bf-head">
        <Link to="/playground/physics" className="bf-back">← laboratory</Link>
        <div className="bf-title">
          <span className="bf-kicker">bell.foundry() · a ring of four in D</span>
          <h1>{phase === 'tower' || phase === 'ending' ? 'Ringing chamber' : phase === 'intro' ? 'The bell foundry' : `${bell.name} in ${bell.note}`}</h1>
        </div>
        <button type="button" className="bf-mute" onClick={() => setMuted(m => !m)} aria-pressed={muted} aria-label={muted ? 'Unmute the foundry' : 'Mute the foundry'}>
          {muted ? 'silent' : 'sound'} <kbd>M</kbd>
        </button>
      </header>

      <ol className="bf-commission" aria-label="Commission: four bells">
        {BELLS.map((b, i) => {
          const entry = ring[i]
          const state = entry ? entry.grade : i === bellIndex && phase !== 'intro' && phase !== 'tower' && phase !== 'ending' ? 'now' : (phase === 'tower' || phase === 'ending') ? 'missing' : 'todo'
          return (
            <li key={b.id} className={`bf-chip is-${state}`}>
              <span className="bf-chip-bell" aria-hidden="true" />
              <span><b>{b.numeral}</b> {b.note}</span>
              <small>{entry ? GRADE_WORD[entry.grade] : state === 'now' ? 'at the lathe' : state === 'missing' ? 'not cast' : 'to cast'}</small>
            </li>
          )
        })}
        <li className="bf-crucible" aria-label={`Bronze in the crucible: ${bronze.toFixed(1)} of ${CRUCIBLE}`}>
          <span className="bf-crucible-fill" style={{ '--bf-fill': `${(bronze / CRUCIBLE) * 100}%` }} />
          <span>bronze {bronze.toFixed(1)}</span>
        </li>
      </ol>

      <section
        ref={stageRef}
        className="bf-stage"
        tabIndex={0}
        aria-label="Foundry floor. Tap the bell to strike it, drag to walk around the lathe. Space strikes, C cuts, X skims, arrow keys choose a band."
        data-playground-surface
        data-testid="bell-foundry-surface"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { drag.current = null }}
      >
        {phase === 'tuning' && cast && (
          <>
            <svg ref={leaderRef} className="bf-leaders" aria-hidden="true">
              {SCREEN_BANDS.map(j => <line key={j} className={j === band ? 'is-on' : ''} />)}
            </svg>
            <div className="bf-rail" role="radiogroup" aria-label="Band to cut">
              {SCREEN_BANDS.map((j, row) => {
                const left = cast.limit - cast.cuts[j]
                return (
                  <button
                    key={BANDS[j].id}
                    ref={el => { railRefs.current[j] = el }}
                    type="button"
                    role="radio"
                    aria-checked={band === j}
                    className={`bf-band ${band === j ? 'is-on' : ''} ${left <= 1 ? 'is-thin' : ''}`}
                    onClick={() => setBand(j)}
                    data-playground-action="select-band"
                    aria-label={`${BANDS[j].name}: ${left.toFixed(2)} cuts of wall left`}
                  >
                    <span>{BANDS[j].name}<kbd>{row + 1}</kbd></span>
                    <i style={{ '--bf-wall': `${Math.max(0, left / cast.limit) * 100}%` }} />
                  </button>
                )
              })}
            </div>
          </>
        )}

        {phase === 'intro' && (
          <div className="bf-card bf-intro">
            <span className="bf-kicker">loam, bronze, a lathe and a tuning drum</span>
            <h2>A bell is tuned by taking metal away.</h2>
            <p>Sweep each mould, pour it, then cut inside the wall until all five partials of every bell sit true. Each cut lowers every partial by a different amount, and none of it can be undone. Then hang the four and ring the treble yourself.</p>
            {ledger.length > 0 && (
              <div className="bf-book" aria-label="Foundry book">
                <span className="bf-kicker">foundry book</span>
                {ledger.map((entry, n) => (
                  <p key={n}><span>{entry.at}</span>{entry.grades.map((g, b) => <i key={b} className={`is-${g}`} title={GRADE_WORD[g]} />)}<span>{entry.striking}% struck</span></p>
                ))}
              </div>
            )}
            <button type="button" className="bf-primary" onClick={begin} data-playground-primary>Light the furnace ↗</button>
          </div>
        )}

        {phase === 'casting' && <p className="bf-banner" role="status">pouring {bell.name.toLowerCase()} · {cast?.weight} bronze</p>}

        {phase === 'cracked' && (
          <div className="bf-card bf-fail" role="alert">
            <span className="bf-kicker">a dead note</span>
            <h2>Cracked.</h2>
            <p>The {bell.name.toLowerCase()} rings like a dropped pan now. Break it up: {Math.round((1 - DROSS) * 100)}% of its bronze returns to the crucible, the rest is dross.</p>
            <div className="bf-card-actions">
              <button type="button" className="bf-primary" onClick={recast} data-playground-action="recast">Break up and recast <kbd>B</kbd></button>
              <button type="button" className="bf-secondary" onClick={shortRing} data-playground-action="hang-short">Hang the ring short</button>
            </div>
          </div>
        )}

        {phase === 'tower' && tower.row < 0 && (
          <div className="bf-card bf-ready">
            <span className="bf-kicker">plain hunt on four · {ROWS.length} rows</span>
            <h2>Catch hold of the treble.</h2>
            <p>The band rings the other bells in time. Pull the treble each time its turn comes, marked on the board in blue. What you hear is exactly what you tuned.</p>
            <button type="button" className="bf-primary" onClick={startRinging} data-playground-action="start-ringing">Look to. Treble’s going <kbd>Space</kbd></button>
          </div>
        )}

        {phase === 'ending' && (
          <div className="bf-card bf-end" role="status">
            <span className="bf-kicker">{grades.filter(g => g === 'true').length} true · {grades.filter(g => g === 'fair').length} fair · {grades.filter(g => g === 'sour').length} sour · {striking}% struck</span>
            <h2>{grades.every(g => g === 'true') && striking >= 75 ? 'A true ring, well struck.' : grades.includes('missing') ? 'The ring hangs short.' : grades.includes('sour') ? 'The parish will hear every sour partial.' : striking < 50 ? 'The bells are good. The ringing was not.' : 'A fair ring.'}</h2>
            <p>{grades.map((g, b) => `${BELLS[b].name} ${GRADE_WORD[g]}`).join(' · ')}. The foundry book keeps this ring with the ones before it.</p>
            <button type="button" className="bf-primary" onClick={restart} data-playground-action="restart">Cast a new ring <kbd>R</kbd></button>
          </div>
        )}

      </section>

      <footer className="bf-bench">
        {phase === 'pattern' && (
          <div className="bf-pattern">
            <svg ref={boardRef} className="bf-strickle" viewBox="0 0 320 200" role="group" aria-label="Strickle board: the section of the mould">
              {[0.2, 0.4, 0.6].map(y => <line key={y} x1="10" x2="310" y1={board.Y(y * HEIGHT)} y2={board.Y(y * HEIGHT)} className="bf-chalk-grid" />)}
              <path d={board.ghost} className="bf-wall is-ghost" />
              <path d={board.wall} className="bf-wall" />
              <line x1={board.axis} x2={board.axis} y1="6" y2="194" className="bf-axis" />
              <line x1={board.bow[0]} y1={board.bow[1]} x2={board.bowWall[0]} y2={board.bowWall[1]} className="bf-axis" />
              <g
                role="slider"
                tabIndex={0}
                data-bf-slider
                aria-label="Lip diameter"
                aria-valuemin={-8}
                aria-valuemax={8}
                aria-valuenow={Math.round(pattern.dia * 8)}
                aria-valuetext={`${pattern.dia >= 0 ? '+' : ''}${(pattern.dia * 8).toFixed(1)}% diameter`}
                className="bf-handle"
                onKeyDown={e => sliderKeys('dia', e)}
                onPointerDown={e => boardPointer('lip', e)}
                onPointerMove={e => boardPointer('lip', e)}
                onPointerUp={e => boardPointer('lip', e)}
                onPointerCancel={e => boardPointer('lip', e)}
                data-playground-action="drag-lip"
              >
                <circle cx={board.lip[0]} cy={board.lip[1]} r="31" className="bf-hit" />
                <circle cx={board.lip[0]} cy={board.lip[1]} r="8" />
                <text x={board.lip[0] - 4} y={board.lip[1] - 14}>lip ⟷</text>
              </g>
              <g
                role="slider"
                tabIndex={0}
                data-bf-slider
                aria-label="Sound-bow thickness"
                aria-valuemin={-10}
                aria-valuemax={10}
                aria-valuenow={Math.round(pattern.thick * 10)}
                aria-valuetext={`${pattern.thick >= 0 ? '+' : ''}${(pattern.thick * 10).toFixed(1)}% wall`}
                className="bf-handle is-bow"
                onKeyDown={e => sliderKeys('thick', e)}
                onPointerDown={e => boardPointer('bow', e)}
                onPointerMove={e => boardPointer('bow', e)}
                onPointerUp={e => boardPointer('bow', e)}
                onPointerCancel={e => boardPointer('bow', e)}
                data-playground-action="drag-bow"
              >
                <circle cx={board.bow[0]} cy={board.bow[1]} r="31" className="bf-hit" />
                <circle cx={board.bow[0]} cy={board.bow[1]} r="8" />
                <text x={board.bow[0]} y={board.bow[1] - 14}>⟷ sound bow</text>
              </g>
            </svg>
            <div className="bf-forecast">
              <div className="bf-gauge" aria-label={`Predicted strike note ${centsText(prediction)} against ${bell.note}`}>
                <span className="bf-gauge-zone" style={{ left: `${gaugeX(SWEET[0])}%`, width: `${gaugeX(SWEET[1]) - gaugeX(SWEET[0])}%` }} />
                <span className="bf-gauge-zero" style={{ left: `${gaugeX(0)}%` }} />
                <span className="bf-gauge-needle" style={{ left: `${gaugeX(prediction)}%` }} />
                <small style={{ left: `${gaugeX(0)}%` }}>{bell.note}</small>
                <small style={{ left: `${gaugeX(SWEET[0] + 25)}%` }}>cast sharp</small>
              </div>
              <dl>
                <div><dt>strike note</dt><dd className={prediction < 0 ? 'is-bad' : prediction > 95 ? 'is-warn' : ''}>{centsText(prediction)}</dd></div>
                <div><dt>pattern weight</dt><dd className={weight > bronze ? 'is-bad' : ''}>{weight} / {bronze.toFixed(1)}</dd></div>
                <div><dt>wall to tune</dt><dd className={maxCuts(pattern) < 4.5 ? 'is-warn' : ''}>{maxCuts(pattern)} cuts</dd></div>
              </dl>
              <button type="button" className="bf-primary bf-pour" onClick={pour} disabled={weight > bronze} data-playground-action="pour">Pour the bronze <kbd>P</kbd></button>
              {lightest > bronze && <p className="bf-note">Too little bronze even for the lightest pattern.</p>}
            </div>
          </div>
        )}

        {(phase === 'tuning' || phase === 'casting' || phase === 'cracked') && devs && (
          <div className="bf-tuner">
            <div className="bf-drum" role="table" aria-label="Strobe tuning drum, cents from true for each partial">
              {PARTIALS.map((p, i) => {
                const d = devs[i]
                const ghost = phase === 'tuning' ? d - SENSITIVITY[i][band] * CUT : null
                const state = Math.abs(d) <= TRUE_TOL ? 'is-true' : Math.abs(d) <= FAIR_TOL ? 'is-fair' : d < 0 ? 'is-flat' : 'is-sharp'
                return (
                  <div key={p.id} role="row" className={`bf-lane ${state}`}>
                    <span role="rowheader" className="bf-lane-name">{p.name}<small>{p.interval}</small></span>
                    <span role="cell" className="bf-lane-strobe" ref={el => { laneRefs.current[i] = el }} aria-hidden="true">
                      <span className="bf-lane-window" />
                      {ghost !== null && <span className="bf-lane-ghost" style={{ left: lanePos(ghost) }} title={`after one cut at the ${BANDS[band].name}`} />}
                      <span className="bf-lane-needle" style={{ left: lanePos(d) }} />
                    </span>
                    <span role="cell" className="bf-lane-cents">{centsText(d)}</span>
                  </div>
                )
              })}
            </div>
            <div className="bf-actions">
              <button type="button" onClick={() => strike()} disabled={phase !== 'tuning'} data-playground-action="strike">Strike <kbd>Space</kbd></button>
              <button type="button" className="bf-cut" onClick={() => cut(CUT)} disabled={phase !== 'tuning'} data-playground-action="cut">Cut {BANDS[band].name} <kbd>C</kbd></button>
              <button type="button" onClick={() => cut(SKIM)} disabled={phase !== 'tuning'} data-playground-action="skim">Skim <kbd>X</kbd></button>
              <button type="button" className={`bf-hang is-${bellGrade}`} onClick={hang} disabled={phase !== 'tuning'} data-playground-action="hang">Hang · {bellGrade && GRADE_WORD[bellGrade]} <kbd>H</kbd></button>
              <button type="button" className="bf-secondary" onClick={recast} disabled={phase !== 'tuning'} data-playground-action="recast">Recast <kbd>B</kbd></button>
            </div>
          </div>
        )}

        {(phase === 'tower' || phase === 'ending') && (
          <svg className="bf-board" viewBox="0 0 316 92" role="img" aria-label={`Ringing board, plain hunt on four. Row ${Math.max(1, tower.row + 1)} of ${ROWS.length}. The treble's path is drawn in blue.`}>
            {[0, 1, 2, 3].map(place => <line key={place} x1="10" x2="306" y1={placeY(place)} y2={placeY(place)} className="bf-board-rule" />)}
            {tower.row >= firstRow && tower.row < firstRow + 11 && <rect x={rowX(tower.row - firstRow) - 11} y="2" width="22" height="66" rx="3" className="bf-board-now" />}
            <path d={`M ${trebleLine}`} className="bf-board-line" />
            {visibleRows.map((row, n) => {
              const r = firstRow + n
              const mark = tower.struck.find(st => st.row === r)
              return (
                <g key={r} className={r < tower.row ? 'is-past' : ''}>
                  {row.map((b, place) => (
                    <text key={place} x={rowX(n)} y={placeY(place) + 4} className={`${b === 1 ? 'is-treble' : ''} ${ring[b - 1] ? '' : 'is-empty'}`}>{ring[b - 1] ? b : '·'}</text>
                  ))}
                  {mark && <circle cx={rowX(n)} cy="82" r="4" className={mark.error === null ? 'is-miss' : Math.abs(mark.error) < 0.07 ? 'is-good' : 'is-loose'} />}
                </g>
              )
            })}
          </svg>
        )}

        {phase === 'tower' && tower.row >= 0 && (
          <div className="bf-ringing">
            <button type="button" className="bf-sally" onClick={pull} disabled={tower.done} data-playground-action="pull-treble">
              Pull the treble <kbd>Space</kbd>
            </button>
            <p>row {Math.min(tower.row + 1, ROWS.length)} of {ROWS.length} · {tower.struck.filter(st => st.error !== null).length} struck · {tower.struck.filter(st => st.error === null).length} missed · {tower.clashes} clashes</p>
          </div>
        )}

        <p className="bf-message" aria-live="polite">{message}</p>
        <p className="bf-help">
          {phase === 'pattern' && <>Drag the lip and sound-bow handles · <kbd>←</kbd><kbd>→</kbd> lip · <kbd>↑</kbd><kbd>↓</kbd> wall · <kbd>P</kbd> pours</>}
          {phase === 'tuning' && <>Tap the bell or <kbd>Space</kbd> to strike · <kbd>↑</kbd><kbd>↓</kbd> or <kbd>1</kbd>–<kbd>5</kbd> band · <kbd>C</kbd> cut · <kbd>X</kbd> quarter skim · drag to walk round</>}
          {(phase === 'tower' || phase === 'ending') && <>Tap the tower or <kbd>Space</kbd> to pull · treble line drawn in blue</>}
          {(phase === 'intro' || phase === 'casting' || phase === 'cracked') && <>Hold to the bell with sound on · <kbd>M</kbd> mutes</>}
        </p>
      </footer>
    </div>
  )
}
