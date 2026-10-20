import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as THREE from 'three'
import {
  CHAPTERS, SEASONS, SIZE, HOURS, LEVEL, HALF, HOUR_NAMES,
  evaluate, summarize, blockedTiles, key, toWorld, sunDirection, shadowTip
} from './gnomon/parish-core'
import './GnomonParish.css'

const HOUR_MS = 1150
const PLAZA = SIZE + 0.4
const FLOOR_PX = 1024
const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
const DAY_NUMERALS = ['I', 'II', 'III']
const ETCH_INKS = ['#7a3b1d', '#3e5a6e', '#5a2f5c']
const PITCHES = [196, 220, 246.94, 261.63, 293.66, 329.63, 392]
const NEED_GLYPH = { S: '☀', D: '☾', '.': '·' }
const NEED_WORD = { S: 'needs sun', D: 'needs shade', '.': 'indifferent' }
const SKY = [
  ['#5d6a9e', '#f2b38f'], ['#7b9ccc', '#f6d2a6'], ['#8fb4dd', '#f3e3c4'], ['#9cc3e6', '#f4ecd8'],
  ['#8eb0d8', '#f3dfbd'], ['#7a86bf', '#f0b48a'], ['#4b4f86', '#e8906e']
]
const SEASON_TINT = { summer: ['#ffffff', 0], autumn: ['#c98a4a', 0.16], winter: ['#9fb2c8', 0.32] }

const mixHex = (a, b, t) => {
  const ca = new THREE.Color(a)
  return '#' + ca.lerp(new THREE.Color(b), t).getHexString()
}
const inkOver = hex => {
  const n = parseInt(hex.slice(1), 16)
  const luma = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return luma < 0.5 ? '#fbf3e2' : '#2b2118'
}
const skyAt = (hour, season) => {
  const h = Math.min(Math.max(hour, 0), HOURS - 1)
  const lo = Math.floor(h)
  const hi = Math.min(lo + 1, HOURS - 1)
  const [tint, amount] = SEASON_TINT[season]
  return [0, 1].map(n => mixHex(mixHex(SKY[lo][n], SKY[hi][n], h - lo), tint, amount))
}

// Arrow keys move the cursor relative to the camera, so "up" always walks away from the viewer.
const STEP_BY_TURN = [
  { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] },
  { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, 1], ArrowRight: [0, -1] },
  { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [1, 0], ArrowRight: [-1, 0] },
  { ArrowUp: [1, 0], ArrowDown: [-1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
]

function createAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  const ctx = new Ctx()
  const master = ctx.createGain()
  master.gain.value = 0.55
  const comp = ctx.createDynamicsCompressor()
  master.connect(comp)
  comp.connect(ctx.destination)
  const env = (node, peak, attack, decay, at) => {
    node.gain.setValueAtTime(0.0001, at)
    node.gain.exponentialRampToValueAtTime(peak, at + attack)
    node.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
  }
  return {
    ctx,
    master,
    bell(freq, level = 0.22) {
      const at = ctx.currentTime + 0.01
      ;[[1, 1], [2, 0.5], [2.76, 0.42], [4.07, 0.22], [5.4, 0.12]].forEach(([ratio, weight]) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.frequency.value = freq * ratio
        env(gain, level * weight, 0.004, 2.6 / Math.sqrt(ratio), at)
        osc.connect(gain).connect(master)
        osc.start(at)
        osc.stop(at + 3)
      })
    },
    tock(height) {
      const at = ctx.currentTime + 0.005
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3
      const src = ctx.createBufferSource()
      src.buffer = buffer
      const band = ctx.createBiquadFilter()
      band.type = 'bandpass'
      band.frequency.value = 520 - height * 110
      band.Q.value = 3
      const gain = ctx.createGain()
      gain.gain.value = 0.9
      src.connect(band).connect(gain).connect(master)
      src.start(at)
    },
    scorch() {
      const at = ctx.currentTime + 0.01
      const osc = ctx.createOscillator()
      const low = ctx.createBiquadFilter()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(140, at)
      osc.frequency.exponentialRampToValueAtTime(46, at + 1.4)
      low.type = 'lowpass'
      low.frequency.value = 600
      env(gain, 0.2, 0.02, 1.5, at)
      osc.connect(low).connect(gain).connect(master)
      osc.start(at)
      osc.stop(at + 1.7)
    }
  }
}

function paintFloorBase(canvas) {
  const ctx = canvas.getContext('2d')
  const px = FLOOR_PX / PLAZA
  ctx.fillStyle = '#e6d8bd'
  ctx.fillRect(0, 0, FLOOR_PX, FLOOR_PX)
  let seed = 9
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let n = 0; n < 9000; n++) {
    ctx.fillStyle = `rgba(${rnd() > 0.5 ? '120,96,64' : '255,250,236'},${0.05 + rnd() * 0.08})`
    ctx.fillRect(rnd() * FLOOR_PX, rnd() * FLOOR_PX, 1 + rnd() * 3, 1 + rnd() * 2)
  }
  const edge = 0.2 * px
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const x = edge + i * px
      const y = edge + j * px
      ctx.fillStyle = `rgba(${(i + j) % 2 ? '170,140,100' : '255,248,228'},0.12)`
      ctx.fillRect(x + 3, y + 3, px - 6, px - 6)
      ctx.strokeStyle = 'rgba(96,72,46,0.32)'
      ctx.lineWidth = 2
      ctx.strokeRect(x + 1.5, y + 1.5, px - 3, px - 3)
    }
  }
  ctx.strokeStyle = 'rgba(96,72,46,0.5)'
  ctx.lineWidth = 3
  ctx.strokeRect(edge - 4, edge - 4, SIZE * px + 8, SIZE * px + 8)
  return ctx.getImageData(0, 0, FLOOR_PX, FLOOR_PX)
}

function paintFloor(canvas, base, etchings) {
  const ctx = canvas.getContext('2d')
  const px = FLOOR_PX / PLAZA
  const toPx = ([x, z]) => [(x + PLAZA / 2) * px, (z + PLAZA / 2) * px]
  ctx.putImageData(base, 0, 0)
  ctx.save()
  ctx.beginPath()
  ctx.rect(0.2 * px, 0.2 * px, SIZE * px, SIZE * px)
  ctx.clip()
  etchings.forEach(({ chapter, lines }) => {
    ctx.strokeStyle = ETCH_INKS[chapter]
    ctx.fillStyle = ETCH_INKS[chapter]
    ctx.globalAlpha = 0.62
    ctx.lineCap = 'round'
    lines.forEach(({ origin, tips }) => {
      const [ox, oy] = toPx(origin)
      tips.forEach((tip, hour) => {
        const [tx, ty] = toPx(tip)
        ctx.lineWidth = hour === 3 ? 3.2 : 1.8
        ctx.beginPath()
        ctx.moveTo(ox, oy)
        ctx.lineTo(tx, ty)
        ctx.stroke()
        ctx.font = 'italic 22px Georgia, serif'
        ctx.fillText(NUMERALS[hour], tx + 4, ty - 4)
      })
      ctx.setLineDash([4, 7])
      ctx.lineWidth = 1.4
      ctx.beginPath()
      tips.forEach((tip, hour) => {
        const [tx, ty] = toPx(tip)
        if (hour) ctx.lineTo(tx, ty)
        else ctx.moveTo(tx, ty)
      })
      ctx.stroke()
      ctx.setLineDash([])
    })
  })
  ctx.restore()
}

function buildMoth(materials) {
  const group = new THREE.Group()
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), materials.mothBody)
  body.scale.set(1, 1, 2.6)
  const wingShape = new THREE.Shape()
  wingShape.moveTo(0, 0)
  wingShape.bezierCurveTo(0.12, 0.04, 0.3, 0.16, 0.28, -0.04)
  wingShape.bezierCurveTo(0.26, -0.18, 0.1, -0.16, 0, -0.05)
  const wingGeo = new THREE.ShapeGeometry(wingShape, 10)
  wingGeo.rotateX(-Math.PI / 2)
  const left = new THREE.Mesh(wingGeo, materials.mothWing)
  const right = new THREE.Mesh(wingGeo, materials.mothWing)
  right.scale.x = -1
  const eye = new THREE.Mesh(new THREE.CircleGeometry(0.024, 12), materials.mothEye)
  eye.rotation.x = -Math.PI / 2
  eye.position.set(0.17, 0.003, 0.02)
  const eye2 = eye.clone()
  eye2.position.x = -0.17
  const leftPivot = new THREE.Group()
  leftPivot.add(left, eye)
  const rightPivot = new THREE.Group()
  rightPivot.add(right, eye2)
  group.add(body, leftPivot, rightPivot)
  group.userData = { leftPivot, rightPivot, body, geos: [body.geometry, wingGeo, eye.geometry] }
  return group
}

function buildMarigold(materials) {
  const group = new THREE.Group()
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.34, 6), materials.stem)
  stem.position.y = 0.17
  const head = new THREE.Group()
  head.position.y = 0.35
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 14), materials.goldHeart)
  const petalGeo = new THREE.PlaneGeometry(0.07, 0.15)
  petalGeo.translate(0, 0.09, 0)
  const petals = []
  for (let n = 0; n < 14; n++) {
    const pivot = new THREE.Group()
    pivot.rotation.y = (n / 14) * Math.PI * 2
    const petal = new THREE.Mesh(petalGeo, materials.petal)
    pivot.add(petal)
    petals.push(petal)
    head.add(pivot)
  }
  head.add(disc)
  const leafGeo = new THREE.SphereGeometry(0.05, 8, 6)
  const leaf = new THREE.Mesh(leafGeo, materials.stem)
  leaf.scale.set(1.8, 0.3, 0.7)
  leaf.position.set(0.06, 0.1, 0)
  group.add(stem, head, leaf)
  group.userData = { head, petals, geos: [stem.geometry, disc.geometry, petalGeo, leafGeo] }
  return group
}

function buildBell(materials) {
  const group = new THREE.Group()
  const postGeo = new THREE.BoxGeometry(0.05, 0.62, 0.05)
  const beamGeo = new THREE.BoxGeometry(0.5, 0.05, 0.06)
  const postA = new THREE.Mesh(postGeo, materials.wood)
  postA.position.set(-0.22, 0.31, 0)
  const postB = postA.clone()
  postB.position.x = 0.22
  const beam = new THREE.Mesh(beamGeo, materials.wood)
  beam.position.y = 0.62
  const profile = [[0, 0], [0.15, 0], [0.14, 0.03], [0.1, 0.1], [0.085, 0.2], [0.05, 0.24], [0, 0.25]].map(([x, y]) => new THREE.Vector2(x, y))
  const bellGeo = new THREE.LatheGeometry(profile, 20)
  const swing = new THREE.Group()
  swing.position.y = 0.6
  const bell = new THREE.Mesh(bellGeo, materials.bronze)
  bell.position.y = -0.27
  swing.add(bell)
  group.add(postA, postB, beam, swing)
  group.userData = { swing, bell, geos: [postGeo, beamGeo, bellGeo] }
  return group
}

const BUILDERS = { moth: buildMoth, marigold: buildMarigold, bell: buildBell }

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

function failureLine(creature, hour) {
  const name = HOUR_NAMES[hour]
  if (creature.kind === 'moth') return `At ${name} the sun found the ${creature.name.toLowerCase()}. It scorched where it slept.`
  if (creature.kind === 'marigold') return `At ${name} the ${creature.name.toLowerCase()} fell into shade and closed for good.`
  if (creature.needs[hour] === 'D') return 'Compline came and the bell stayed lit. Nobody in the parish knew the day had ended.'
  return `The bell went dark at ${name}. The parish lost the hour.`
}

export default function GnomonParish() {
  const rootRef = useRef(null)
  const stageRef = useRef(null)
  const arcRef = useRef(null)
  const engineRef = useRef(null)
  const audioRef = useRef(null)
  const live = useRef({})
  const mutedRef = useRef(false)
  const reduced = useReducedMotion()

  const [chapterIndex, setChapterIndex] = useState(0)
  const [stones, setStones] = useState([])
  const [selected, setSelected] = useState(2)
  const [hour, setHour] = useState(3)
  const [phase, setPhase] = useState('intro')
  const [failure, setFailure] = useState(null)
  const [etchings, setEtchings] = useState([])
  const [cursor, setCursor] = useState({ i: 3, j: 3 })
  const [turn, setTurn] = useState(0)
  const [muted, setMuted] = useState(false)
  const [message, setMessage] = useState('Tap a tile to set the selected stone. Drag the sun across the sky to read every hour.')

  const chapter = CHAPTERS[chapterIndex]
  const grid = useMemo(() => evaluate(chapter, stones), [chapter, stones])
  const summary = summarize(grid)
  const blocked = useMemo(() => blockedTiles(chapter), [chapter])
  const remaining = h => chapter.stones[h] - stones.filter(s => s.h === h).length
  const hourIndex = Math.round(hour)
  const planning = phase === 'plan'

  mutedRef.current = muted

  const sound = useCallback(fn => {
    const audio = audioRef.current
    if (audio && !mutedRef.current) fn(audio)
  }, [])
  const onFinaleHour = useCallback(h => sound(a => a.bell(PITCHES[h], 0.12)), [sound])
  live.current = { chapter, blocked, stones, grid, hour, phase, failure, cursor, turn, reduced, selected, chapterIndex, onFinaleHour }

  // Scene: built once, mutated by the effects below and by the frame loop.
  useEffect(() => {
    const stage = stageRef.current
    const small = Math.min(window.innerWidth, window.innerHeight) < 600
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.domElement.className = 'gp-canvas'
    stage.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80)
    const hemi = new THREE.HemisphereLight(0xcfdcf0, 0xa88660, 2.1)
    const fill = new THREE.DirectionalLight(0xfff1dc, 0.55)
    fill.position.set(2, 6, 12)
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.6)
    sun.castShadow = true
    sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048)
    Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 44 })
    sun.shadow.bias = -0.0004
    sun.shadow.normalBias = 0.02
    sun.shadow.radius = 2.5
    scene.add(hemi, fill, sun, sun.target)

    const materials = {
      plazaSide: new THREE.MeshStandardMaterial({ color: 0xb59d7a, roughness: 0.95 }),
      ground: new THREE.MeshStandardMaterial({ color: 0xb8a874, roughness: 1 }),
      earth: new THREE.MeshStandardMaterial({ color: 0x8a6446, roughness: 1, flatShading: true }),
      cloud: new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 1, transparent: true, opacity: 0.92 }),
      stone: new THREE.MeshStandardMaterial({ color: 0xd8c6a2, roughness: 0.82 }),
      stoneCap: new THREE.MeshStandardMaterial({ color: 0xefe2c4, roughness: 0.7 }),
      ruin: new THREE.MeshStandardMaterial({ color: 0x9c8f78, roughness: 1 }),
      moss: new THREE.MeshStandardMaterial({ color: 0x6f7d4a, roughness: 1 }),
      ghost: new THREE.MeshStandardMaterial({ color: 0xfff4dc, transparent: true, opacity: 0.38, depthWrite: false }),
      mothBody: new THREE.MeshStandardMaterial({ color: 0x6b5a4a, roughness: 0.8 }),
      mothWing: new THREE.MeshStandardMaterial({ color: 0xf1e9d6, roughness: 0.9, side: THREE.DoubleSide }),
      mothEye: new THREE.MeshStandardMaterial({ color: 0x9a6a3a, side: THREE.DoubleSide }),
      stem: new THREE.MeshStandardMaterial({ color: 0x5d7a3a, roughness: 0.9 }),
      petal: new THREE.MeshStandardMaterial({ color: 0xec8a24, roughness: 0.6, side: THREE.DoubleSide }),
      goldHeart: new THREE.MeshStandardMaterial({ color: 0x8a3f12, roughness: 0.7 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x6a4a2e, roughness: 0.9 }),
      bronze: new THREE.MeshStandardMaterial({ color: 0xb58340, metalness: 0.75, roughness: 0.32 }),
      ringOk: new THREE.MeshBasicMaterial({ color: 0xd99a2b, transparent: true, opacity: 0.85 }),
      ringBad: new THREE.MeshBasicMaterial({ color: 0xb3261e, transparent: true, opacity: 0.9 }),
      ringIdle: new THREE.MeshBasicMaterial({ color: 0x6b5a4a, transparent: true, opacity: 0.35 }),
      cursor: new THREE.MeshBasicMaterial({ color: 0x2b2118, transparent: true, opacity: 0.75 }),
      decor: new THREE.MeshStandardMaterial({ color: 0xd9c3a0, roughness: 1 }),
      roof: new THREE.MeshStandardMaterial({ color: 0xa4553a, roughness: 0.9 }),
      cypress: new THREE.MeshStandardMaterial({ color: 0x46552f, roughness: 1 })
    }

    const floorCanvas = document.createElement('canvas')
    floorCanvas.width = FLOOR_PX
    floorCanvas.height = FLOOR_PX
    const floorBase = paintFloorBase(floorCanvas)
    const floorTexture = new THREE.CanvasTexture(floorCanvas)
    floorTexture.colorSpace = THREE.SRGBColorSpace
    floorTexture.anisotropy = 4
    const floorTop = new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.9 })
    const plazaGeo = new THREE.BoxGeometry(PLAZA, 0.5, PLAZA)
    const plaza = new THREE.Mesh(plazaGeo, [materials.plazaSide, materials.plazaSide, floorTop, materials.plazaSide, materials.plazaSide, materials.plazaSide])
    plaza.position.y = -0.25
    plaza.receiveShadow = true
    // The parish is an island hung in the sky: a turf disc over a rough cone of earth.
    const groundGeo = new THREE.CylinderGeometry(5.8, 5.3, 0.7, 48)
    const ground = new THREE.Mesh(groundGeo, [materials.earth, materials.ground, materials.earth])
    ground.scale.z = 1.24
    ground.position.set(0, -0.85, -1.2)
    ground.receiveShadow = true
    const rootGeo = new THREE.ConeGeometry(5.3, 5.2, 11, 3)
    const root = new THREE.Mesh(rootGeo, materials.earth)
    root.rotation.x = Math.PI
    root.scale.z = 1.24
    root.position.set(0, -3.8, -1.2)
    scene.add(plaza, ground, root)
    const cloudGeo = new THREE.SphereGeometry(1, 14, 10)
    const clouds = [[-9.5, -2.8, -5, 1.3], [9.2, -2.2, -7, 1.1], [-8.5, -5.6, 4, 1.6], [8.8, -5, 3, 1.3], [1.5, -7.5, -10, 2]].map(([x, y, z, size], n) => {
      const cloud = new THREE.Group()
      ;[[0, 0, 0, 1], [1.1, -0.15, 0.2, 0.72], [-1, -0.2, -0.1, 0.8], [0.3, 0.35, -0.3, 0.6]].forEach(([dx, dy, dz, r]) => {
        const puff = new THREE.Mesh(cloudGeo, materials.cloud)
        puff.position.set(dx, dy, dz)
        puff.scale.set(r * 1.3, r * 0.7, r)
        cloud.add(puff)
      })
      cloud.scale.setScalar(size)
      cloud.position.set(x, y, z)
      cloud.userData.drift = n
      scene.add(cloud)
      return cloud
    })

    // A parish skyline outside the plaza. It never casts shadow, so only stones and ruins shape the dial.
    const decorGeos = []
    const decor = new THREE.Group()
    const addBox = (w, h, d, x, z, material, roof) => {
      const geo = new THREE.BoxGeometry(w, h, d)
      decorGeos.push(geo)
      const mesh = new THREE.Mesh(geo, material)
      mesh.position.set(x, -0.5 + h / 2, z)
      mesh.receiveShadow = true
      decor.add(mesh)
      if (roof) {
        const roofGeo = new THREE.ConeGeometry(Math.max(w, d) * 0.78, roof, 4)
        decorGeos.push(roofGeo)
        const cap = new THREE.Mesh(roofGeo, materials.roof)
        cap.rotation.y = Math.PI / 4
        cap.position.set(x, -0.5 + h + roof / 2, z)
        decor.add(cap)
      }
    }
    addBox(0.9, 3.1, 0.9, -3.3, -6.3, materials.decor, 1.3)
    addBox(2.2, 1.1, 1.2, -1, -6.6, materials.decor, 0.7)
    addBox(1.6, 0.9, 1.2, 1.5, -6.7, materials.decor, 0.6)
    addBox(1.3, 1.3, 1.1, 3.4, -5.9, materials.decor, 0.8)
    ;[[-4.6, -3.6], [-4.7, 0.2], [4.6, -3.2], [4.7, 0.8], [-4.4, 2.6], [-2.1, -7.4], [0.4, -7.6], [4.6, -4.8]].forEach(([x, z], n) => {
      const h = 1.2 + (n % 3) * 0.4
      const geo = new THREE.ConeGeometry(0.36, h, 8)
      decorGeos.push(geo)
      const tree = new THREE.Mesh(geo, materials.cypress)
      tree.position.set(x, -0.5 + h / 2, z)
      decor.add(tree)
    })
    const bushGeo = new THREE.IcosahedronGeometry(0.32, 0)
    decorGeos.push(bushGeo)
    ;[[-3.6, 4.4, 1], [-2.9, 4.7, 0.8], [-1.2, 5.1, 0.9], [1.4, 5, 1.1], [2.2, 4.6, 0.7], [3.5, 4.3, 1], [-4.4, -4.4, 0.9], [4.2, 2.2, 0.8], [-4.3, 1.4, 0.7]].forEach(([x, z, size]) => {
      const bush = new THREE.Mesh(bushGeo, materials.cypress)
      bush.scale.set(size * 1.2, size * 0.8, size)
      bush.position.set(x, -0.5 + size * 0.2, z)
      bush.rotation.y = x * z
      decor.add(bush)
    })
    scene.add(decor)

    const stoneGeos = [1, 2, 3].map(h => new THREE.BoxGeometry(HALF * 2, h * LEVEL, HALF * 2))
    const capGeo = new THREE.BoxGeometry(HALF * 2 + 0.06, 0.06, HALF * 2 + 0.06)
    const ruinTopGeo = new THREE.BoxGeometry(HALF * 1.2, 0.18, HALF * 1.4)
    const ringGeo = new THREE.RingGeometry(0.3, 0.38, 32)
    ringGeo.rotateX(-Math.PI / 2)
    const cursorGeo = new THREE.RingGeometry(0.43, 0.49, 4, 1, Math.PI / 4)
    cursorGeo.rotateX(-Math.PI / 2)
    const dustGeo = new THREE.RingGeometry(0.2, 0.26, 28)
    dustGeo.rotateX(-Math.PI / 2)
    const dustMat = new THREE.MeshBasicMaterial({ color: 0xf8eedb, transparent: true, opacity: 0 })
    const dust = new THREE.Mesh(dustGeo, dustMat)
    dust.position.y = 0.02
    scene.add(dust)

    const cursorMesh = new THREE.Mesh(cursorGeo, materials.cursor)
    cursorMesh.position.y = 0.015
    const ghost = new THREE.Mesh(stoneGeos[1], materials.ghost)
    ghost.visible = false
    scene.add(cursorMesh, ghost)

    const stoneGroup = new THREE.Group()
    const ruinGroup = new THREE.Group()
    const creatureGroup = new THREE.Group()
    scene.add(stoneGroup, ruinGroup, creatureGroup)

    const engine = {
      renderer, scene, camera, sun, hemi, materials, stoneGeos, capGeo, ruinTopGeo, ringGeo,
      stoneGroup, ruinGroup, creatureGroup, cursorMesh, ghost, dust,
      floorCanvas, floorBase, floorTexture,
      stoneMeshes: new Map(), creatures: [], hover: null,
      view: 0, displayHour: 3, ringAt: 0, dustAt: -10, frame: 0
    }
    engineRef.current = engine

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = stage
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      engine.radius = 18.6 * Math.max(1, 0.84 / camera.aspect)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(stage)
    resize()

    const tick = now => {
      engine.frame = requestAnimationFrame(tick)
      const state = live.current
      const still = state.reduced
      const season = state.chapter.season
      if (state.phase === 'intro' && !still) {
        engine.displayHour = 1 + Math.sin(now / 5200) * 2.2 + 2
        engine.view = Math.sin(now / 7000) * 0.35
      } else if (state.phase === 'finale' && !still) {
        engine.displayHour = ((now / 2600) % HOURS)
        engine.view += 0.0016
        const swept = Math.floor(engine.displayHour)
        if (swept !== engine.lastSwept) {
          engine.lastSwept = swept
          engine.ringAt = now
          state.onFinaleHour?.(swept)
        }
      } else {
        const target = state.hour
        engine.displayHour = still ? target : engine.displayHour + (target - engine.displayHour) * 0.16
        const base = state.turn * Math.PI / 2
        const viewTarget = base + Math.round((engine.view - base) / (Math.PI * 2)) * Math.PI * 2
        engine.view = still ? viewTarget : engine.view + (viewTarget - engine.view) * 0.12
      }
      const shownHour = Math.min(engine.displayHour, HOURS - 1)
      const dir = sunDirection(shownHour, season)
      sun.position.set(dir[0] * 20, dir[1] * 20, dir[2] * 20)
      const elevation = Math.asin(dir[1])
      const warmth = Math.min(1, Math.max(0, (elevation - 0.12) / 0.6))
      sun.color.set(mixHex('#ff9a55', '#fff2dc', warmth))
      sun.intensity = 1.5 + warmth * 1.6
      const [skyTop, skyLow] = skyAt(shownHour, season)
      hemi.color.set(skyTop)
      rootRef.current?.style.setProperty('--gp-sky-top', skyTop)
      rootRef.current?.style.setProperty('--gp-sky-low', skyLow)
      const ink = inkOver(skyTop)
      if (ink !== engine.ink) {
        engine.ink = ink
        rootRef.current?.style.setProperty('--gp-sky-ink', ink)
      }

      const radius = engine.radius
      camera.position.set(Math.sin(engine.view) * radius * 0.8, radius * 0.6, Math.cos(engine.view) * radius * 0.8)
      camera.lookAt(0, -0.6, 0)

      const [cx, cz] = toWorld(state.cursor.i, state.cursor.j)
      cursorMesh.visible = state.phase === 'plan'
      cursorMesh.position.x = cx
      cursorMesh.position.z = cz
      cursorMesh.rotation.y = still ? 0 : Math.sin(now / 500) * 0.06
      const hover = engine.hover
      const occupied = hover && state.stones.some(s => s.i === hover.i && s.j === hover.j)
      ghost.visible = Boolean(hover && state.phase === 'plan' && !occupied && !state.blocked.has(key(hover.i, hover.j)))
      if (ghost.visible) {
        ghost.geometry = stoneGeos[state.selected - 1]
        const [gx, gz] = toWorld(hover.i, hover.j)
        ghost.position.set(gx, (state.selected * LEVEL) / 2, gz)
      }

      engine.stoneMeshes.forEach(entry => {
        const age = (now - entry.born) / 420
        const drop = still ? 0 : Math.max(0, 1 - age)
        entry.group.position.y = drop * drop * 1.1
      })
      const dustAge = (now - engine.dustAt) / 600
      dust.visible = dustAge < 1 && !still
      if (dust.visible) {
        dust.scale.setScalar(1 + dustAge * 2.2)
        dustMat.opacity = 0.7 * (1 - dustAge)
      }

      const hourNow = Math.round(shownHour)
      const ring = engine.ringAt ? Math.max(0, 1 - (now - engine.ringAt) / 1600) : 0
      clouds.forEach(cloud => { if (!still) cloud.position.x += Math.sin(now / 9000 + cloud.userData.drift) * 0.002 })
      engine.creatures.forEach(({ creature, group, marker }, index) => {
        const cell = state.grid[index]?.[hourNow]
        const dead = state.failure && state.failure.creatureId === creature.id
        marker.material = dead || (cell && !cell.ok) ? materials.ringBad : cell && cell.need !== '.' ? materials.ringOk : materials.ringIdle
        const t = now / 1000 + index * 1.7
        const parts = group.userData
        if (creature.kind === 'moth') {
          const resting = cell && cell.shaded
          const flap = dead ? -0.5 : resting || still ? 0.12 : 0.35 + Math.sin(t * 15) * 0.55
          parts.leftPivot.rotation.z = flap
          parts.rightPivot.rotation.z = -flap
          group.position.y = dead ? 0.03 : resting || still ? 0.06 : 0.22 + Math.sin(t * 2.4) * 0.05
          parts.body.material = dead ? materials.goldHeart : materials.mothBody
          group.rotation.y = resting || still || dead ? 0.4 : t * 0.6
        } else if (creature.kind === 'marigold') {
          const open = cell && !cell.shaded ? 1 : 0.15
          parts.petals.forEach((petal, n) => {
            const wobble = still ? 0 : Math.sin(t * 1.3 + n) * 0.05
            petal.rotation.x = dead ? -2.5 : -0.3 - open * 1.2 + wobble
            petal.material = dead ? materials.goldHeart : materials.petal
          })
          parts.head.rotation.z = dead ? 1.1 : still ? 0 : Math.sin(t * 0.8) * 0.06
        } else {
          parts.swing.rotation.z = still ? 0 : Math.sin(now / 160) * 0.45 * ring
        }
      })

      renderer.render(scene, camera)
    }
    engine.frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(engine.frame)
      observer.disconnect()
      engine.stoneMeshes.clear()
      engine.creatures.forEach(({ group }) => group.userData.geos.forEach(g => g.dispose()))
      ;[...stoneGeos, capGeo, ruinTopGeo, ringGeo, cursorGeo, dustGeo, plazaGeo, groundGeo, rootGeo, cloudGeo, ...decorGeos].forEach(g => g.dispose())
      Object.values(materials).forEach(m => m.dispose())
      floorTop.dispose()
      dustMat.dispose()
      floorTexture.dispose()
      sun.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      engineRef.current = null
    }
  }, [])

  // Creatures and ruins belong to the chapter.
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.creatures.forEach(({ group, marker }) => {
      group.userData.geos.forEach(g => g.dispose())
      engine.creatureGroup.remove(group, marker)
    })
    engine.ruinGroup.clear()
    engine.creatures = chapter.creatures.map(creature => {
      const group = BUILDERS[creature.kind](engine.materials)
      const [x, z] = toWorld(creature.i, creature.j)
      group.position.set(x, 0, z)
      group.scale.setScalar(creature.kind === 'bell' ? 1.15 : 1.5)
      group.traverse(node => { node.receiveShadow = true })
      const marker = new THREE.Mesh(engine.ringGeo, engine.materials.ringIdle)
      marker.position.set(x, 0.012, z)
      engine.creatureGroup.add(group, marker)
      return { creature, group, marker }
    })
    chapter.ruins.forEach(ruin => {
      const [x, z] = toWorld(ruin.i, ruin.j)
      const block = new THREE.Mesh(engine.stoneGeos[ruin.h - 1], engine.materials.ruin)
      block.position.set(x, (ruin.h * LEVEL) / 2, z)
      const top = new THREE.Mesh(engine.ruinTopGeo, engine.materials.moss)
      top.position.set(x + 0.08, ruin.h * LEVEL + 0.06, z - 0.05)
      top.rotation.y = 0.4
      ;[block, top].forEach(mesh => { mesh.castShadow = true; mesh.receiveShadow = true })
      engine.ruinGroup.add(block, top)
    })
  }, [chapter])

  // Player stones: add new ones with a drop, remove lifted ones.
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    const wanted = new Set(stones.map(s => key(s.i, s.j)))
    engine.stoneMeshes.forEach((entry, k) => {
      if (!wanted.has(k)) {
        engine.stoneGroup.remove(entry.group)
        engine.stoneMeshes.delete(k)
      }
    })
    stones.forEach(stone => {
      const k = key(stone.i, stone.j)
      if (engine.stoneMeshes.has(k)) return
      const [x, z] = toWorld(stone.i, stone.j)
      const group = new THREE.Group()
      const block = new THREE.Mesh(engine.stoneGeos[stone.h - 1], engine.materials.stone)
      block.position.set(x, (stone.h * LEVEL) / 2, z)
      const cap = new THREE.Mesh(engine.capGeo, engine.materials.stoneCap)
      cap.position.set(x, stone.h * LEVEL - 0.03, z)
      ;[block, cap].forEach(mesh => { mesh.castShadow = true; mesh.receiveShadow = true })
      group.add(block, cap)
      engine.stoneGroup.add(group)
      engine.stoneMeshes.set(k, { group, born: performance.now() })
      engine.dustAt = performance.now()
      engine.dust.position.x = x
      engine.dust.position.z = z
    })
  }, [stones])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    paintFloor(engine.floorCanvas, engine.floorBase, etchings)
    engine.floorTexture.needsUpdate = true
  }, [etchings])

  useEffect(() => () => { audioRef.current?.ctx.close() }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.master.gain.value = muted ? 0 : 0.55
  }, [muted])

  // The day runs one canonical hour at a time; the first broken need ends it.
  useEffect(() => {
    if (phase !== 'running') return
    let h = 0
    let timer
    const step = () => {
      setHour(h)
      const engine = engineRef.current
      if (engine) engine.ringAt = performance.now()
      const broken = grid.findIndex(row => !row[h].ok)
      if (broken >= 0) {
        const creature = chapter.creatures[broken]
        sound(a => a.scorch())
        setFailure({ hour: h, creatureId: creature.id })
        setMessage(failureLine(creature, h))
        setPhase('failed')
        return
      }
      sound(a => a.bell(PITCHES[h], h === HOURS - 1 ? 0.3 : 0.2))
      if (h === HOURS - 1) {
        sound(a => a.bell(PITCHES[0] * 2, 0.16))
        const lines = stones.map(stone => ({
          origin: toWorld(stone.i, stone.j),
          tips: Array.from({ length: HOURS }, (_, n) => shadowTip(stone, n, chapter.season))
        }))
        setEtchings(previous => [...previous.filter(e => e.chapter !== chapterIndex), { chapter: chapterIndex, lines }])
        setPhase(chapterIndex === CHAPTERS.length - 1 ? 'finale' : 'kept')
        setMessage(chapterIndex === CHAPTERS.length - 1
          ? 'Compline rang under its own shadow. The plaza keeps time now.'
          : `Day ${DAY_NUMERALS[chapterIndex]} kept. The stones' shadows are cut into the plaza.`)
        return
      }
      h += 1
      timer = setTimeout(step, reduced ? HOUR_MS * 0.5 : HOUR_MS)
    }
    timer = setTimeout(step, 250)
    return () => clearTimeout(timer)
  }, [phase, grid, chapter, chapterIndex, stones, reduced, sound])

  const wake = () => {
    if (!audioRef.current) audioRef.current = createAudio()
    audioRef.current?.ctx.resume()
    setPhase('plan')
    sound(a => a.bell(PITCHES[3], 0.16))
    stageRef.current?.focus({ preventScroll: true })
  }

  const actOnTile = (i, j) => {
    if (phase === 'failed') return setMessage('The day already broke. Rewind it first; your stones stay where they stand.')
    if (!planning) return
    setCursor({ i, j })
    const existing = stones.find(s => s.i === i && s.j === j)
    if (existing) {
      setStones(stones.filter(s => s !== existing))
      setSelected(existing.h)
      sound(a => a.tock(existing.h))
      return setMessage(`Lifted a ${existing.h}-course stone back into the tray.`)
    }
    if (blocked.has(key(i, j))) {
      const creature = chapter.creatures.find(c => c.i === i && c.j === j)
      return setMessage(creature ? `${creature.name}: ${creature.needs.split('').map((n, h) => n === '.' ? null : `${HOUR_NAMES[h]} ${NEED_WORD[n]}`).filter(Boolean).join(', ')}.` : 'An old ruin holds this tile. It casts its own shadow.')
    }
    const height = remaining(selected) > 0 ? selected : [1, 2, 3].find(h => remaining(h) > 0)
    if (!height) return setMessage('Every stone is set. Lift one to move it, or ring the day.')
    setStones([...stones, { i, j, h: height }])
    setSelected(height)
    sound(a => a.tock(height))
    setMessage(`Set a ${height}-course stone. Drag the sun to see where its shadow falls at each hour.`)
  }

  const ring = () => {
    if (!planning) return
    setFailure(null)
    setPhase('running')
    setMessage(`The day begins at lauds. ${summary.met} of ${summary.total} needs are kept on paper.`)
  }

  const rewind = () => {
    setFailure(null)
    setHour(failure ? failure.hour : 3)
    setPhase('plan')
    setMessage('Rewound to before lauds. Every stone is where you left it.')
  }

  const nextDay = () => {
    const next = chapterIndex + 1
    setChapterIndex(next)
    setStones([])
    setFailure(null)
    setHour(3)
    setSelected(Object.keys(CHAPTERS[next].stones).map(Number).reverse().find(h => CHAPTERS[next].stones[h] > 0))
    setPhase('plan')
    setMessage(CHAPTERS[next].subtitle)
    stageRef.current?.focus({ preventScroll: true })
  }

  const restart = () => {
    setChapterIndex(0)
    setStones([])
    setEtchings([])
    setFailure(null)
    setHour(3)
    setSelected(2)
    setTurn(0)
    setPhase('plan')
    setMessage(CHAPTERS[0].subtitle)
    stageRef.current?.focus({ preventScroll: true })
  }

  const scrub = value => {
    if (phase === 'running' || phase === 'finale') return
    setHour(Math.min(Math.max(value, 0), HOURS - 1))
  }
  const stepHour = delta => scrub(Math.round(hour) + delta)
  const rotate = delta => setTurn(t => t + delta)

  const pickTile = event => {
    const engine = engineRef.current
    if (!engine) return null
    const rect = engine.renderer.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
    const ray = new THREE.Raycaster()
    ray.setFromCamera(ndc, engine.camera)
    const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3())
    if (!hit) return null
    const i = Math.round(hit.x + (SIZE - 1) / 2)
    const j = Math.round(hit.z + (SIZE - 1) / 2)
    return i >= 0 && j >= 0 && i < SIZE && j < SIZE ? { i, j } : null
  }

  const drag = useRef(null)
  const onPointerDown = event => {
    if (event.target !== engineRef.current?.renderer.domElement) return
    drag.current = { x: event.clientX, y: event.clientY, moved: false, startTurn: turn }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const onPointerMove = event => {
    const engine = engineRef.current
    if (drag.current) {
      const dx = event.clientX - drag.current.x
      if (Math.abs(dx) > 14) drag.current.moved = true
      if (drag.current.moved) setTurn(drag.current.startTurn + Math.round(-dx / 120))
      return
    }
    if (engine && event.pointerType === 'mouse') engine.hover = pickTile(event)
  }
  const onPointerUp = event => {
    const state = drag.current
    drag.current = null
    if (!state || state.moved) return
    const tile = pickTile(event)
    if (tile) actOnTile(tile.i, tile.j)
  }
  const onPointerLeave = () => { if (engineRef.current) engineRef.current.hover = null }

  const arcPointer = event => {
    if (event.type === 'pointerdown') event.currentTarget.setPointerCapture?.(event.pointerId)
    else if (!(event.buttons & 1) && event.pointerType === 'mouse') return
    const rect = arcRef.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    scrub(x * HOURS - 0.5)
  }

  const onKeyDown = event => {
    if (event.target.closest('[data-gp-slider]') && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault()
      return stepHour(event.key === 'ArrowLeft' ? -1 : 1)
    }
    if (event.target.tagName === 'BUTTON' && (event.key === 'Enter' || event.key === ' ')) return
    const k = event.key
    const step = STEP_BY_TURN[((turn % 4) + 4) % 4][k]
    if (step && phase === 'plan') {
      event.preventDefault()
      setCursor(c => ({ i: Math.min(SIZE - 1, Math.max(0, c.i + step[0])), j: Math.min(SIZE - 1, Math.max(0, c.j + step[1])) }))
    } else if ((k === ' ' || k === 'Enter') && phase === 'plan') {
      event.preventDefault()
      actOnTile(cursor.i, cursor.j)
    } else if (['1', '2', '3'].includes(k)) {
      if (chapter.stones[k] > 0) setSelected(Number(k))
    } else if (k === '[' || k === ',') stepHour(-1)
    else if (k === ']' || k === '.') stepHour(1)
    else if (k === 'q' || k === 'Q') rotate(1)
    else if (k === 'e' || k === 'E') rotate(-1)
    else if (k === 'r' || k === 'R') ring()
    else if ((k === 'z' || k === 'Z') && phase === 'failed') rewind()
    else if ((k === 'n' || k === 'N') && phase === 'kept') nextDay()
    else if (k === 'm' || k === 'M') setMuted(m => !m)
    else if (k === 'Escape' && phase === 'intro') wake()
  }

  const hourPos = h => `${((h + 0.5) / HOURS) * 100}%`
  const sunArcY = h => 46 - Math.sin(Math.PI * ((h + 0.5) / HOURS)) * 34
  const cursorCreature = chapter.creatures.find(c => c.i === cursor.i && c.j === cursor.j)
  const failedCreature = failure && chapter.creatures.find(c => c.id === failure.creatureId)
  const cursorStone = stones.find(s => s.i === cursor.i && s.j === cursor.j)
  const cursorRuin = chapter.ruins.find(r => r.i === cursor.i && r.j === cursor.j)
  const cursorText = `Chisel at column ${cursor.i + 1}, row ${cursor.j + 1}: ${cursorCreature ? cursorCreature.name : cursorStone ? `your ${cursorStone.h}-course stone` : cursorRuin ? 'an old ruin' : 'empty paving'}.`

  return (
    <div
      ref={rootRef}
      className={`gp-root gp-${chapter.season} gp-phase-${phase}`}
      onKeyDown={onKeyDown}
      data-testid="gnomon-parish"
    >
      <header className="gp-head">
        <Link to="/playground/physics" className="gp-back">← laboratory</Link>
        <div className="gp-cartouche">
          <span className="gp-kicker">gnomon.parish() · day {DAY_NUMERALS[chapterIndex]} of III · {SEASONS[chapter.season].name}</span>
          <h1>{chapter.title}</h1>
        </div>
        <button type="button" className="gp-mute" onClick={() => setMuted(m => !m)} aria-pressed={muted} aria-label={muted ? 'Unmute bells' : 'Mute bells'}>
          {muted ? 'bells off' : 'bells on'} <kbd>M</kbd>
        </button>
      </header>

      <div className="gp-sky">
        <button type="button" className="gp-step" onClick={() => stepHour(-1)} disabled={phase === 'running' || phase === 'finale'} aria-label="Earlier hour" data-playground-action="hour-earlier">‹</button>
        <div
          ref={arcRef}
          className="gp-arc"
          role="slider"
          tabIndex={0}
          data-gp-slider
          aria-label="Sun position by canonical hour"
          aria-valuemin={0}
          aria-valuemax={HOURS - 1}
          aria-valuenow={hourIndex}
          aria-valuetext={HOUR_NAMES[hourIndex]}
          onPointerDown={arcPointer}
          onPointerMove={arcPointer}
          data-playground-action="scrub-sun"
        >
          <svg viewBox="0 0 700 60" preserveAspectRatio="none" aria-hidden="true">
            <path d={`M 0 ${sunArcY(-0.5)} ${Array.from({ length: 29 }, (_, n) => { const h = n / 4 - 0.5; return `L ${((h + 0.5) / HOURS) * 700} ${sunArcY(h)}` }).join(' ')}`} />
          </svg>
          {HOUR_NAMES.map((name, h) => (
            <span key={name} className={`gp-tick ${h === hourIndex ? 'is-now' : ''}`} style={{ left: hourPos(h) }}>
              <i>{NUMERALS[h]}</i>{name}
            </span>
          ))}
          <span className="gp-sun" style={{ left: hourPos(hour), top: `${(sunArcY(hour) / 60) * 100}%` }} />
        </div>
        <button type="button" className="gp-step" onClick={() => stepHour(1)} disabled={phase === 'running' || phase === 'finale'} aria-label="Later hour" data-playground-action="hour-later">›</button>
      </div>

      <section
        ref={stageRef}
        className="gp-stage"
        tabIndex={0}
        aria-label="Sun-clock plaza. Arrow keys move the chisel, Space sets or lifts a stone, brackets move the sun, R rings the day."
        data-playground-surface
        data-testid="gnomon-parish-surface"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { drag.current = null }}
        onPointerLeave={onPointerLeave}
      >
        <div className="gp-turns">
          <button type="button" onClick={() => rotate(1)} aria-label="Walk around the plaza to the left" data-playground-action="rotate">⟲<kbd>Q</kbd></button>
          <button type="button" onClick={() => rotate(-1)} aria-label="Walk around the plaza to the right" data-playground-action="rotate">⟳<kbd>E</kbd></button>
        </div>
        <p className="gp-hour-label" aria-hidden="true"><i>{NUMERALS[hourIndex]}</i> {HOUR_NAMES[hourIndex]}</p>

        {phase === 'intro' && (
          <div className="gp-card gp-intro">
            <span className="gp-kicker">a sun-clock for a parish with no clock</span>
            <h2>The sun is the only hour-keeper here.</h2>
            <p>Set stones on the plaza so each sleeper gets its shade, each flower its light, and in winter the bell its final hour. Then ring the day and watch the shadows keep their promises.</p>
            <button type="button" className="gp-primary" onClick={wake} data-playground-primary>Open the plaza ↗</button>
          </div>
        )}
        {phase === 'failed' && failedCreature && (
          <div className="gp-card gp-fail" role="alert">
            <span className="gp-kicker">the day broke at {HOUR_NAMES[failure.hour]}</span>
            <h2>{failedCreature.kind === 'moth' ? 'Scorched.' : failedCreature.kind === 'marigold' ? 'Wilted.' : 'The hour is lost.'}</h2>
            <p>{failureLine(failedCreature, failure.hour)}</p>
            <button type="button" className="gp-primary" onClick={rewind} data-playground-action="rewind">Rewind the day <kbd>Z</kbd></button>
          </div>
        )}
        {phase === 'kept' && (
          <div className="gp-card gp-kept" role="status">
            <span className="gp-kicker">day {DAY_NUMERALS[chapterIndex]} kept · {summary.total} needs held</span>
            <h2>Every promise held for seven hours.</h2>
            <p>The tips of your shadows are cut into the plaza. They stay there through the seasons that follow.</p>
            <button type="button" className="gp-primary" onClick={nextDay} data-playground-action="next-day">Walk into {SEASONS[CHAPTERS[chapterIndex + 1].season].name} <kbd>N</kbd></button>
          </div>
        )}
        {phase === 'finale' && (
          <div className="gp-card gp-finale" role="status">
            <span className="gp-kicker">three seasons, {etchings.reduce((n, e) => n + e.lines.length, 0)} gnomons, one dial</span>
            <h2>The parish keeps time.</h2>
            <p>Compline rang under its own shadow. The hour lines you cut are how this plaza will read the sun after you leave.</p>
            <button type="button" className="gp-primary" onClick={restart} data-playground-action="restart">Begin another year</button>
          </div>
        )}
      </section>

      <footer className="gp-ledger">
        <div className="gp-almanac" role="table" aria-label="Almanac of needs by hour">
          <div className="gp-row gp-row-head" role="row">
            <span role="columnheader">{summary.met}/{summary.total} kept</span>
            {HOUR_NAMES.map((name, h) => <span key={name} role="columnheader" className={h === hourIndex ? 'is-now' : ''}>{NUMERALS[h]}</span>)}
          </div>
          {chapter.creatures.map((creature, index) => (
            <div key={creature.id} role="row" className={`gp-row ${failure?.creatureId === creature.id ? 'is-dead' : ''} ${cursorCreature === creature ? 'is-cursor' : ''}`}>
              <span role="rowheader" className={`gp-who gp-${creature.kind}`}>{creature.name}</span>
              {grid[index].map((cell, h) => (
                <span
                  key={h}
                  role="cell"
                  className={`gp-cell ${cell.need === '.' ? 'is-any' : cell.ok ? 'is-ok' : 'is-bad'} ${h === hourIndex ? 'is-now' : ''}`}
                  aria-label={`${HOUR_NAMES[h]}: ${NEED_WORD[cell.need]}, ${cell.shaded ? 'in shade' : 'in sun'}`}
                >
                  {NEED_GLYPH[cell.need]}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="gp-tray">
          {[1, 2, 3].filter(h => chapter.stones[h] > 0).map(h => (
            <button
              key={h}
              type="button"
              className={`gp-stone ${selected === h ? 'is-selected' : ''}`}
              onClick={() => setSelected(h)}
              aria-pressed={selected === h}
              aria-label={`${h}-course stone, ${remaining(h)} left`}
              data-playground-action="select-stone"
            >
              <span className="gp-stone-figure" style={{ '--h': h }} />
              <span>{remaining(h)}×<kbd>{h}</kbd></span>
            </button>
          ))}
          <button type="button" className="gp-ring" onClick={ring} disabled={!planning} data-playground-action="ring-day">
            Ring the day <kbd>R</kbd>
          </button>
        </div>
        <p className="gp-message" aria-live="polite">{message}</p>
        <p className="gp-sr" aria-live="polite">{phase === 'plan' ? cursorText : ''}</p>
        <p className="gp-help">Tap or <kbd>Space</kbd> sets / lifts · <kbd>←↑↓→</kbd> chisel · drag sky or <kbd>[</kbd><kbd>]</kbd> moves sun · drag plaza or <kbd>Q</kbd><kbd>E</kbd> walks around</p>
      </footer>
    </div>
  )
}
