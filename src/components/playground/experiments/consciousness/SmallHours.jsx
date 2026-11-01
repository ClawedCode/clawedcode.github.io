import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as THREE from 'three'
import {
  PLAN, W, H, CREAKS, CREAK_LOUDNESS, ITEMS, NEST, START, CLOCK, FRIDGE, WINDOWS, DOORS,
  cellAt, isDoor, keyOf, freshDoors, doorCells, passable, surfaceAt, isLeap, roomAt, findPath, adjacentDoor
} from './small-hours/house'
import { createAcoustics, SW, SH } from './small-hours/acoustics'
import {
  START_MINUTE, END_MINUTE, SECONDS_PER_MINUTE, STEPS_PER_SECOND, CHIMES, CAR,
  fridgeOn, rainLevel, carLevel, formatClock, freshSleepers, updateSleeper, MODE_WORD, epithet
} from './small-hours/night-core'
import { createNightAudio } from './small-hours/night-audio'
import './SmallHours.css'

const WALK = 0.27
const CREEP = 0.6
const LEAP = 0.52
const CREEP_STEP = 0.5
const CREEP_LAND = 0.6
const BARK = 30
const WALL_H = 1.05
const TILT_Y = 15.5
const CELL_PX = 32
const CHALK_KEY = 'small-hours.chalk'
const NIGHTS_KEY = 'small-hours.nights'
const ITEM_COLOR = { cap: '#d9a441', tie: '#c2413a', sock: '#d6b25e' }
const CARRY = {
  cap: s => (s.hard ? 1.5 : 1),
  tie: () => 1,
  sock: () => 0.6
}
const WINDOW_CELLS = new Set([
  ...[4, 5, 6, 7].map(y => keyOf(0, y)),
  ...[1, 2, 3, 4].map(x => keyOf(x, 19)),
  ...[15, 16].map(y => keyOf(31, y)),
  ...[19, 20, 21, 22, 23].map(x => keyOf(x, 0))
])
const ROOM_BASE = { bedroom: 'c', bathroom: 't', hall: '.', 'living room': '.', kitchen: 't' }

const readJSON = (key, fallback) => {
  if (typeof localStorage === 'undefined') return fallback
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try { return JSON.parse(raw) } catch { return fallback }
}
const writeJSON = (key, value) => { if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(value)) }

function freshGame() {
  const firstChime = CHIMES.findIndex(e => e.at > START_MINUTE)
  return {
    phase: 'intro',
    minute: START_MINUTE,
    simTime: 0,
    cat: { x: START[0], y: START[1], from: [...START], to: [...START], t: 1, dur: 1, leap: false, heading: -Math.PI / 2, h: surfaceAt(...START).height || 0 },
    path: [],
    held: null,
    creep: false,
    creepHeld: false,
    carrying: null,
    items: Object.fromEntries(ITEMS.map(i => [i.id, { state: 'placed', x: i.x, y: i.y }])),
    doors: freshDoors(),
    sleepers: freshSleepers(),
    chimeIndex: firstChime,
    chiming: false,
    fridge: fridgeOn(START_MINUTE),
    rain: 0,
    tickAcc: 0,
    found: new Set(readJSON(CHALK_KEY, [])),
    newFound: 0,
    barks: 0,
    barkQueue: [],
    steps: [],
    loudest: null,
    nudge: [0, 0],
    carOn: false,
    rainAnnounced: false,
    deposited: [],
    endAt: null,
    result: null
  }
}

function paintFloor(found) {
  const canvas = document.createElement('canvas')
  canvas.width = W * CELL_PX
  canvas.height = H * CELL_PX
  const ctx = canvas.getContext('2d')
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const P = CELL_PX
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let ch = cellAt(x, y)
      if (ch === '#') { ctx.fillStyle = '#1a1622'; ctx.fillRect(x * P, y * P, P, P); continue }
      if (!'.ctrumOa123'.includes(ch)) ch = ROOM_BASE[roomAt(x, y)]
      const X = x * P
      const Y = y * P
      if (ch === '.' || ch === 'a' || isDoor(ch)) {
        ctx.fillStyle = '#7a6350'
        ctx.fillRect(X, Y, P, P)
        for (let b = 0; b < 4; b++) {
          ctx.fillStyle = `rgba(${b % 2 ? '40,28,20' : '150,120,92'},${0.08 + rnd() * 0.1})`
          ctx.fillRect(X, Y + b * 8, P, 8)
          ctx.fillStyle = 'rgba(30,20,14,0.5)'
          ctx.fillRect(X, Y + b * 8 + 7, P, 1)
          ctx.fillRect(X + ((x * 7 + b * 13) % 4) * 8, Y + b * 8, 1, 8)
        }
      } else if (ch === 't') {
        ctx.fillStyle = '#8f979c'
        ctx.fillRect(X, Y, P, P)
        ctx.fillStyle = `rgba(255,255,255,${0.04 + rnd() * 0.06})`
        ctx.fillRect(X + 2, Y + 2, 13, 13)
        ctx.fillRect(X + 17, Y + 17, 13, 13)
        ctx.strokeStyle = 'rgba(40,46,52,0.55)'
        ctx.lineWidth = 1
        ctx.strokeRect(X + 0.5, Y + 0.5, 16, 16)
        ctx.strokeRect(X + 16.5, Y + 16.5, 15, 15)
        ctx.strokeRect(X + 16.5, Y + 0.5, 15, 16)
        ctx.strokeRect(X + 0.5, Y + 16.5, 16, 15)
      } else if (ch === 'c') {
        ctx.fillStyle = '#584a6e'
        ctx.fillRect(X, Y, P, P)
        for (let n = 0; n < 26; n++) {
          ctx.fillStyle = `rgba(${rnd() > 0.5 ? '120,100,150' : '30,22,40'},0.25)`
          ctx.fillRect(X + rnd() * P, Y + rnd() * P, 2, 2)
        }
      } else if (ch === 'r' || ch === 'u') {
        ctx.fillStyle = ch === 'r' ? '#6e2f33' : '#58343f'
        ctx.fillRect(X, Y, P, P)
        ctx.fillStyle = 'rgba(214,170,110,0.28)'
        if ((x + y) % 2 === 0) {
          ctx.beginPath()
          ctx.moveTo(X + P / 2, Y + 5)
          ctx.lineTo(X + P - 5, Y + P / 2)
          ctx.lineTo(X + P / 2, Y + P - 5)
          ctx.lineTo(X + 5, Y + P / 2)
          ctx.fill()
        }
      } else if (ch === 'm') {
        ctx.fillStyle = '#5f7c76'
        ctx.fillRect(X, Y, P, P)
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        for (let s = 0; s < P; s += 4) ctx.fillRect(X, Y + s, P, 2)
      } else if (ch === 'O') {
        ctx.fillStyle = '#7a6350'
        ctx.fillRect(X, Y, P, P)
      }
    }
  }
  // rug borders
  ctx.strokeStyle = 'rgba(220,180,120,0.45)'
  ctx.lineWidth = 2
  ctx.strokeRect(5 * P + 3, 14 * P + 3, 7 * P - 6, 4 * P - 6)
  ctx.strokeRect(3 * P + 3, 10 * P + 3, 12 * P - 6, 2 * P - 6)
  found.forEach(k => chalk(ctx, k))
  return { canvas, ctx }
}

function chalk(ctx, k) {
  const [x, y] = k.split(',').map(Number)
  const P = CELL_PX
  ctx.save()
  ctx.strokeStyle = 'rgba(244,238,220,0.85)'
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x * P + 8, y * P + 8)
  ctx.lineTo(x * P + P - 8, y * P + P - 8)
  ctx.moveTo(x * P + P - 8, y * P + 8)
  ctx.lineTo(x * P + 8, y * P + P - 8)
  ctx.stroke()
  ctx.restore()
}

function glowTexture(inner, outer) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64)
  grad.addColorStop(0, inner)
  grad.addColorStop(1, outer)
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

const FIELD_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const FIELD_FRAG = `
uniform sampler2D uField;
uniform float uMode;
uniform float uFade;
varying vec2 vUv;
void main() {
  vec4 f = texture2D(uField, vec2(vUv.x, 1.0 - vUv.y));
  float a = f.r * 2.0 - 1.0;
  float c = f.g * 2.0 - 1.0;
  vec3 col = vec3(0.0);
  float aa = abs(a);
  vec3 crest = vec3(1.0, 0.7, 0.3);
  vec3 trough = vec3(0.55, 0.16, 0.05);
  col += mix(trough, crest, step(0.0, a)) * smoothstep(0.1, 0.65, aa) * 2.1;
  col += vec3(1.0, 0.92, 0.75) * smoothstep(0.55, 0.95, a) * 0.8;
  float cc = abs(c);
  col += mix(vec3(0.05, 0.14, 0.3), vec3(0.42, 0.72, 1.0), step(0.0, c)) * smoothstep(0.14, 0.9, cc) * 0.95;
  float heat = f.b;
  vec3 ember = mix(vec3(0.3, 0.04, 0.02), vec3(1.0, 0.55, 0.18), smoothstep(0.3, 0.8, heat)) * smoothstep(0.04, 0.45, heat);
  ember += vec3(1.0, 0.9, 0.65) * smoothstep(0.78, 1.0, heat) * 0.6;
  col = mix(col * uFade, ember * 1.3, uMode);
  gl_FragColor = vec4(col, 1.0);
}
`

export default function SmallHours() {
  const mountRef = useRef(null)
  const gameRef = useRef(freshGame())
  const audioRef = useRef(null)
  const apiRef = useRef({})
  const tagRefs = useRef({})
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const reducedRef = useRef(reduced)
  const [phase, setPhase] = useState('intro')
  const [hud, setHud] = useState(() => snapshot(gameRef.current))
  const [message, setMessage] = useState('The house is asleep. Everything you do from here on is a sound.')
  const [view, setView] = useState('auto')
  const viewRef = useRef(view)
  const [muted, setMuted] = useState(false)
  const [nights, setNights] = useState(() => readJSON(NIGHTS_KEY, []))
  const [exposure, setExposure] = useState(true)
  const exposureRef = useRef(true)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => { setReduced(query.matches); reducedRef.current = query.matches }
    query.addEventListener('change', on)
    return () => query.removeEventListener('change', on)
  }, [])
  useEffect(() => { viewRef.current = view }, [view])
  useEffect(() => { exposureRef.current = exposure }, [exposure])

  useEffect(() => {
    const mount = mountRef.current
    const G = gameRef.current
    const acoustics = createAcoustics()
    acoustics.setDoors(G.doors)
    acoustics.setEars(G.sleepers.map(s => s.ear))
    acoustics.expose(true)

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-hidden', 'true')

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0d0b16')
    const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200)
    const disposables = []
    const track = x => { disposables.push(x); return x }

    // Light: moonlight through the cut walls, a hall night-light, and lamps that wait.
    const hemi = new THREE.HemisphereLight('#7f8cc4', '#241a30', 1.15)
    scene.add(hemi)
    const moon = new THREE.DirectionalLight('#c3d2ff', 1.15)
    moon.position.set(-14, 26, 22)
    moon.target.position.set(W / 2, 0, H / 2)
    moon.castShadow = true
    moon.shadow.mapSize.set(2048, 2048)
    Object.assign(moon.shadow.camera, { left: -26, right: 26, top: 22, bottom: -22, near: 1, far: 90 })
    moon.shadow.bias = -0.0008
    scene.add(moon, moon.target)
    const nightLight = new THREE.PointLight('#ffb36b', 2.2, 7, 1.6)
    nightLight.position.set(15.5, 0.45, 11.6)
    scene.add(nightLight)
    const lamp = new THREE.PointLight('#ffc98a', 0, 16, 1.2)
    lamp.position.set(7.5, 1.25, 1.6)
    scene.add(lamp)
    const fridgeGlow = new THREE.PointLight('#a8d8ff', 0.6, 4, 2)
    fridgeGlow.position.set(29.7, 1.2, 14)
    scene.add(fridgeGlow)
    const headlights = new THREE.SpotLight('#fff1cf', 0, 30, 0.42, 0.6, 1)
    headlights.position.set(-4, 1.4, 22)
    scene.add(headlights, headlights.target)

    // Floor and its sound overlay.
    const floor = paintFloor(G.found)
    const floorTex = track(new THREE.CanvasTexture(floor.canvas))
    floorTex.colorSpace = THREE.SRGBColorSpace
    floorTex.anisotropy = 4
    const floorGeo = track(new THREE.PlaneGeometry(W, H))
    const floorMat = track(new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.92 }))
    const floorMesh = new THREE.Mesh(floorGeo, floorMat)
    floorMesh.rotation.x = -Math.PI / 2
    floorMesh.position.set(W / 2, 0, H / 2)
    floorMesh.receiveShadow = true
    floorMesh.userData.pick = true
    scene.add(floorMesh)

    const fieldData = new Uint8Array(SW * SH * 4)
    const fieldTex = track(new THREE.DataTexture(fieldData, SW, SH, THREE.RGBAFormat))
    fieldTex.magFilter = THREE.LinearFilter
    fieldTex.minFilter = THREE.LinearFilter
    fieldTex.needsUpdate = true
    const fieldMat = track(new THREE.ShaderMaterial({
      uniforms: { uField: { value: fieldTex }, uMode: { value: 0 }, uFade: { value: 1 } },
      vertexShader: FIELD_VERT,
      fragmentShader: FIELD_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }))
    const fieldMesh = new THREE.Mesh(floorGeo, fieldMat)
    fieldMesh.rotation.x = -Math.PI / 2
    fieldMesh.position.set(W / 2, 0.015, H / 2)
    fieldMesh.renderOrder = 2
    scene.add(fieldMesh)
    const envA = new Float32Array(SW * SH)
    const envC = new Float32Array(SW * SH)

    // Geometry helpers.
    const matCache = new Map()
    const mat = (color, opts = {}) => {
      const k = color + JSON.stringify(opts)
      if (!matCache.has(k)) matCache.set(k, track(new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts })))
      return matCache.get(k)
    }
    const boxGeo = track(new THREE.BoxGeometry(1, 1, 1))
    const box = (w, h, d, color, x, z, y0 = 0, opts, parent = scene) => {
      const m = new THREE.Mesh(boxGeo, mat(color, opts))
      m.scale.set(w, h, d)
      m.position.set(x, y0 + h / 2, z)
      m.castShadow = true
      m.receiveShadow = true
      m.userData.pick = true
      parent.add(m)
      return m
    }
    const sphereGeo = track(new THREE.SphereGeometry(1, 20, 14))
    const blob = (sx, sy, sz, color, x, y, z, parent = scene, opts) => {
      const m = new THREE.Mesh(sphereGeo, mat(color, opts))
      m.scale.set(sx, sy, sz)
      m.position.set(x, y, z)
      m.castShadow = true
      m.receiveShadow = true
      parent.add(m)
      return m
    }

    // Walls as a cutaway: dark body, pale section caps.
    const wallCells = []
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (PLAN[y][x] === '#') wallCells.push([x, y])
    const solid = wallCells.filter(([x, y]) => !WINDOW_CELLS.has(keyOf(x, y)))
    const wallMesh = new THREE.InstancedMesh(boxGeo, mat('#2a2536'), solid.length)
    const capMesh = new THREE.InstancedMesh(boxGeo, mat('#5d5474', { roughness: 0.7 }), wallCells.length)
    const dummy = new THREE.Object3D()
    solid.forEach(([x, y], i) => {
      dummy.position.set(x + 0.5, WALL_H / 2, y + 0.5)
      dummy.scale.set(1, WALL_H, 1)
      dummy.updateMatrix()
      wallMesh.setMatrixAt(i, dummy.matrix)
    })
    wallCells.forEach(([x, y], i) => {
      const win = WINDOW_CELLS.has(keyOf(x, y))
      dummy.position.set(x + 0.5, (win ? 0.38 : WALL_H) + 0.02, y + 0.5)
      dummy.scale.set(1.002, 0.04, 1.002)
      dummy.updateMatrix()
      capMesh.setMatrixAt(i, dummy.matrix)
    })
    wallMesh.castShadow = true
    wallMesh.receiveShadow = true
    scene.add(wallMesh, capMesh)
    const glassMat = track(new THREE.MeshStandardMaterial({ color: '#9fb6ff', emissive: '#6f86d6', emissiveIntensity: 0.9, transparent: true, opacity: 0.55, roughness: 0.2 }))
    wallCells.filter(([x, y]) => WINDOW_CELLS.has(keyOf(x, y))).forEach(([x, y]) => {
      box(1, 0.38, 1, '#2a2536', x + 0.5, y + 0.5)
      const g = new THREE.Mesh(boxGeo, glassMat)
      g.scale.set(y === 0 || y === 19 ? 1 : 0.12, 0.62, y === 0 || y === 19 ? 0.12 : 1)
      g.position.set(x + 0.5, 0.38 + 0.31, y + 0.5)
      scene.add(g)
    })
    const moonTex = track(glowTexture('rgba(190,210,255,0.55)', 'rgba(190,210,255,0)'))
    const poolMat = track(new THREE.MeshBasicMaterial({ map: moonTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
    const pools = WINDOWS.map(({ line: [x0, y0, x1, y1] }) => {
      const along = Math.abs(x1 - x0) > Math.abs(y1 - y0)
      const m = new THREE.Mesh(floorGeo, poolMat)
      m.rotation.x = -Math.PI / 2
      m.scale.set((along ? x1 - x0 + 2 : 4.2) / W, (along ? 4.2 : y1 - y0 + 2) / H, 1)
      const inward = [x0 < 2 ? 1.6 : x0 > 30 ? -1.6 : 0, y0 < 2 ? 1.6 : y0 > 18 ? -1.6 : 0]
      m.position.set((x0 + x1) / 2 + inward[0], 0.02, (y0 + y1) / 2 + inward[1])
      m.renderOrder = 1
      scene.add(m)
      return m
    })

    // Furniture.
    box(4, 0.3, 4, '#3b2a22', 5, 3)
    box(3.9, 0.2, 3.9, '#b8bfd6', 5, 3, 0.3)
    box(1.7, 0.14, 0.62, '#e3e2ee', 5, 1.5, 0.5)
    box(3.94, 0.1, 2.9, '#5b6fa8', 5, 3.55, 0.5)
    const sleeperBody = blob(0.95, 0.24, 1.35, '#5b6fa8', 4.8, 0.62, 3.2)
    const head = new THREE.Group()
    head.position.set(5, 0.7, 1.55)
    blob(0.27, 0.22, 0.26, '#d9b39a', 0, 0, 0, head)
    blob(0.3, 0.2, 0.22, '#2b1d1a', 0, 0.06, -0.08, head)
    scene.add(head)
    box(0.9, 0.62, 0.9, '#5c4030', 7.5, 1.5)
    box(0.18, 0.3, 0.18, '#c9b48d', 7.6, 1.32, 0.62)
    const shade = new THREE.Mesh(track(new THREE.ConeGeometry(0.24, 0.22, 16, 1, true)), mat('#e7d7b0', { side: THREE.DoubleSide, emissive: '#000000' }))
    shade.position.set(7.6, 1.05, 1.32)
    scene.add(shade)
    box(3, 1.9, 0.95, '#3a2b25', 12.5, 1.5)
    box(5, 0.6, 2, '#d8dde6', 28.5, 2, 0, { roughness: 0.35 })
    box(4.5, 0.05, 1.5, '#2b3a4a', 28.5, 2, 0.6)
    const basket = new THREE.Mesh(track(new THREE.CylinderGeometry(0.42, 0.36, 0.48, 18)), mat('#9c7b4e'))
    basket.position.set(17.5, 0.24, 1.5)
    basket.castShadow = true
    scene.add(basket)
    // hall
    box(0.85, 2.3, 0.6, '#3a241b', 19.5, 10.32)
    const clockFace = new THREE.Mesh(track(new THREE.CircleGeometry(0.28, 32)), mat('#efe3c4', { emissive: '#4a4030', emissiveIntensity: 0.6 }))
    clockFace.position.set(19.5, 1.8, 10.63)
    scene.add(clockFace)
    const handGeo = track(new THREE.BoxGeometry(0.03, 0.22, 0.01))
    const minuteHand = new THREE.Mesh(handGeo, mat('#1a120e'))
    const hourHand = new THREE.Mesh(handGeo, mat('#1a120e'))
    ;[minuteHand, hourHand].forEach(h => { h.geometry = handGeo; scene.add(h) })
    hourHand.scale.set(1.3, 0.65, 1)
    const pendulum = new THREE.Group()
    pendulum.position.set(19.5, 1.35, 10.64)
    const bob = new THREE.Mesh(track(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 20)), mat('#c99b45', { metalness: 0.7, roughness: 0.3 }))
    bob.rotation.x = Math.PI / 2
    bob.position.y = -0.75
    const rod = new THREE.Mesh(boxGeo, mat('#c99b45', { metalness: 0.6 }))
    rod.scale.set(0.02, 0.75, 0.01)
    rod.position.y = -0.37
    pendulum.add(rod, bob)
    scene.add(pendulum)
    const nightLightBulb = blob(0.08, 0.08, 0.05, '#ffcf8a', 15.5, 0.35, 11.92, scene, { emissive: '#ffb060', emissiveIntensity: 2 })
    nightLightBulb.castShadow = false
    const dogBed = new THREE.Mesh(track(new THREE.CylinderGeometry(1, 1, 0.18, 24)), mat('#6b4a5e'))
    dogBed.scale.set(0.95, 1, 0.5)
    dogBed.position.set(26, 0.09, 10.5)
    dogBed.receiveShadow = true
    scene.add(dogBed)
    const dog = new THREE.Group()
    dog.position.set(26, 0.18, 10.5)
    const dogBody = blob(0.62, 0.27, 0.36, '#a8763e', 0.1, 0.16, 0, dog)
    const dogHead = new THREE.Group()
    dogHead.position.set(-0.55, 0.2, 0.1)
    blob(0.2, 0.17, 0.18, '#a8763e', 0, 0, 0, dogHead)
    blob(0.12, 0.08, 0.1, '#8a5c2c', -0.16, -0.04, 0, dogHead)
    blob(0.06, 0.13, 0.04, '#6e4520', 0.04, 0.08, 0.16, dogHead)
    blob(0.06, 0.13, 0.04, '#6e4520', 0.04, 0.08, -0.16, dogHead)
    dog.add(dogHead)
    scene.add(dog)
    // living room
    box(4, 0.42, 0.95, '#2f4b4f', 11, 13.55)
    box(4, 0.5, 0.28, '#284044', 11, 13.15, 0.42)
    for (let i = 0; i < 5; i++) box(1, Math.min(WALL_H, 0.22 * (i + 1)), 2, '#4d3a2c', 13.5 + i, 14)
    box(2, 1.5, 0.6, '#3a2a22', 15, 17.65)
    ;[[14.3, '#7d4a3a'], [14.6, '#3f5a64'], [15.05, '#8a7a4a'], [15.5, '#5a3f60']].forEach(([x, c]) => box(0.24, 0.42, 0.4, c, x, 17.55, 1.02))
    box(2, 0.62, 0.9, '#d7d0dd', 3, 18.55)
    const nest = new THREE.Mesh(track(new THREE.TorusGeometry(0.33, 0.13, 10, 24)), mat('#6c4f86'))
    nest.rotation.x = -Math.PI / 2
    nest.position.set(NEST[0] + 0.5, 0.1, NEST[1] + 0.5)
    nest.receiveShadow = true
    scene.add(nest)
    blob(0.32, 0.05, 0.32, '#5a4170', NEST[0] + 0.5, 0.05, NEST[1] + 0.5)
    // kitchen
    box(10, 0.78, 1, '#3a3f48', 26, 18.5)
    box(10, 0.14, 1.02, '#7d8086', 26, 18.5, 0.78, { roughness: 0.5 })
    box(0.85, 0.04, 0.9, '#e6dccb', 24.5, 18.5, 0.92)
    box(0.8, 0.02, 0.7, '#1c2026', 22.5, 18.45, 0.92)
    box(0.95, 1.95, 1.9, '#c9ccd2', 30.5, 14, 0, { roughness: 0.4 })
    const fridgeLed = blob(0.03, 0.03, 0.03, '#7ae0ff', 30.02, 1.5, 13.4, scene, { emissive: '#4ad0ff', emissiveIntensity: 3 })
    box(1.6, 0.75, 1, '#4d3a2c', 23, 14.6)

    // Doors on hinges.
    const doorMeshes = doorCells().map(d => {
      const pivot = new THREE.Group()
      pivot.position.set(d.x + 0.06, 0, d.y + 0.5)
      const panel = new THREE.Mesh(boxGeo, mat('#6e5a4a'))
      panel.scale.set(0.9, 0.98, 0.07)
      panel.position.set(0.47, 0.49, 0)
      panel.castShadow = true
      const knob = blob(0.04, 0.04, 0.06, '#d4b06a', 0.82, 0.48, 0, pivot, { metalness: 0.8, roughness: 0.3 })
      knob.castShadow = false
      pivot.add(panel)
      scene.add(pivot)
      const swing = d.y === 9 ? 1.45 : -1.45
      pivot.rotation.y = G.doors[d.key] ? swing : 0
      return { ...d, pivot, swing }
    })

    // Items.
    const itemMeshes = {}
    const capMesh2 = new THREE.Mesh(track(new THREE.CylinderGeometry(0.08, 0.08, 0.035, 18)), mat(ITEM_COLOR.cap, { metalness: 0.8, roughness: 0.3, emissive: '#3a2a08' }))
    const tieMesh = new THREE.Mesh(track(new THREE.TorusGeometry(0.085, 0.026, 8, 20)), mat(ITEM_COLOR.tie, { emissive: '#2a0806' }))
    tieMesh.rotation.x = Math.PI / 2
    const sockMesh = new THREE.Group()
    const sockA = blob(0.16, 0.07, 0.07, ITEM_COLOR.sock, 0, 0, 0, sockMesh, { emissive: '#2a2008' })
    const sockB = blob(0.07, 0.07, 0.1, '#c96b4a', 0.13, 0, 0.05, sockMesh)
    sockA.castShadow = sockB.castShadow = false
    itemMeshes.cap = capMesh2
    itemMeshes.tie = tieMesh
    itemMeshes.sock = sockMesh
    Object.values(itemMeshes).forEach(m => { m.castShadow = true; scene.add(m) })
    const halo = new THREE.Mesh(floorGeo, track(new THREE.MeshBasicMaterial({ map: track(glowTexture('rgba(255,214,140,0.7)', 'rgba(255,214,140,0)')), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })))
    halo.rotation.x = -Math.PI / 2
    halo.scale.set(1.3 / W, 1.3 / H, 1)
    const halos = ITEMS.map(() => { const h = halo.clone(); scene.add(h); return h })

    // The cat.
    const cat = new THREE.Group()
    const catBody = new THREE.Group()
    cat.add(catBody)
    const fur = { emissive: '#0c0a16', emissiveIntensity: 1, roughness: 0.55 }
    const torso = blob(0.26, 0.15, 0.13, '#121019', 0, 0.2, 0, catBody, fur)
    const catHead = new THREE.Group()
    catHead.position.set(0.27, 0.3, 0)
    blob(0.12, 0.11, 0.115, '#121019', 0, 0, 0, catHead, fur)
    const earGeo = track(new THREE.ConeGeometry(0.045, 0.1, 4))
    ;[-1, 1].forEach(s => {
      const ear = new THREE.Mesh(earGeo, mat('#121019', fur))
      ear.position.set(-0.01, 0.11, s * 0.06)
      ear.rotation.x = s * 0.25
      catHead.add(ear)
      const eye = blob(0.022, 0.03, 0.02, '#ffd27a', 0.1, 0.02, s * 0.045, catHead, { emissive: '#ffb84a', emissiveIntensity: 2.2 })
      eye.castShadow = false
    })
    catBody.add(catHead)
    const tail = []
    let tailParent = catBody
    for (let i = 0; i < 6; i++) {
      const seg = new THREE.Group()
      seg.position.set(i === 0 ? -0.25 : -0.075, i === 0 ? 0.24 : 0, 0)
      const s = blob(0.05 - i * 0.004, 0.04 - i * 0.003, 0.04 - i * 0.003, '#121019', -0.03, 0, 0, seg, fur)
      s.castShadow = true
      tailParent.add(seg)
      tail.push(seg)
      tailParent = seg
    }
    const legs = [[0.15, 0.06], [0.15, -0.06], [-0.15, 0.06], [-0.15, -0.06]].map(([x, z]) => blob(0.035, 0.08, 0.035, '#121019', x, 0.07, z, catBody, fur))
    const catRing = new THREE.Mesh(floorGeo, track(new THREE.MeshBasicMaterial({ map: track(glowTexture('rgba(255,236,190,0.35)', 'rgba(255,236,190,0)')), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })))
    catRing.rotation.x = -Math.PI / 2
    catRing.scale.set(1.5 / W, 1.5 / H, 1)
    cat.scale.setScalar(1.35)
    scene.add(cat, catRing)
    void torso

    // Pawprints for the aftermath.
    const pawGeo = track(new THREE.CircleGeometry(0.09, 10))
    const pawMat = track(new THREE.MeshBasicMaterial({ color: '#ffe2b0', transparent: true, opacity: 0.85, depthWrite: false }))
    const paws = new THREE.InstancedMesh(pawGeo, pawMat, 900)
    paws.count = 0
    paws.visible = false
    paws.renderOrder = 3
    scene.add(paws)

    // Pings: a crisp mark where each sound starts; the field shows where it goes.
    const pingGeo = track(new THREE.RingGeometry(0.86, 1, 40))
    const pings = Array.from({ length: 16 }, () => {
      const m = new THREE.Mesh(pingGeo, new THREE.MeshBasicMaterial({ color: '#ffc077', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }))
      track(m.material)
      m.rotation.x = -Math.PI / 2
      m.visible = false
      m.renderOrder = 4
      m.userData = { age: 1, life: 0.5, reach: 1 }
      scene.add(m)
      return m
    })
    let pingNext = 0
    const ping = (x, y, h, amp, cover) => {
      const m = pings[pingNext++ % pings.length]
      m.position.set(x, h + 0.03, y)
      m.material.color.set(cover ? '#b9c9ee' : '#ffc077')
      m.userData = { age: 0, life: cover ? 0.9 : 0.45 + Math.min(0.5, amp * 0.25), reach: cover ? 2.6 : 0.5 + Math.min(4, amp * 2.4), peak: cover ? 0.5 : Math.min(1, 0.35 + amp) }
      m.visible = true
    }

    // Audio and sound injection share one entry point so the ear hears what the eye sees.
    const panOf = x => (x - G.cat.x) / 12
    const audio = () => audioRef.current
    const say = text => setMessage(text)

    const sound = (field, x, y, amp) => acoustics.impulse(field, x, y, amp)

    function persistChalk() { writeJSON(CHALK_KEY, [...G.found]) }

    function arrive() {
      const c = G.cat
      const [x, y] = c.to
      c.x = x
      c.y = y
      const s = surfaceAt(x, y)
      const k = keyOf(x, y)
      const creak = !c.leap && CREAKS.some(([a, b]) => a === x && b === y)
      let amp = creak ? CREAK_LOUDNESS : c.leap ? s.land : s.step
      if (G.creep) amp *= c.leap ? CREEP_LAND : CREEP_STEP
      if (G.carrying) amp *= CARRY[G.carrying](s)
      sound('alarm', x + 0.5, y + 0.5, amp)
      ping(x + 0.5, y + 0.5, s.height || 0, amp)
      const a = audio()
      if (a) {
        if (creak) a.creak(panOf(x))
        else if (c.leap) a.land(s, amp, 0)
        else a.paw(s, amp, 0)
        if (G.carrying === 'cap' && s.hard) a.tink(0)
      }
      if (s.mattress) G.nudge[0] += c.leap ? 0.16 : 0.035
      G.steps.push({ x: x + 0.5, y: y + 0.5, amp })
      if (!G.loudest || amp > G.loudest.amp) G.loudest = { amp, where: creak ? 'a creaking board' : s.name, room: roomAt(x, y), minute: G.minute }
      if (creak && !G.found.has(k)) {
        G.found.add(k)
        G.newFound++
        chalk(floor.ctx, k)
        floorTex.needsUpdate = true
        persistChalk()
        say(`That board complains. Chalked it, so you'll know it next time.`)
      } else if (creak) say('The chalked board. You knew, and stepped on it anyway.')
      // nest and pickups
      if (G.carrying && x === NEST[0] && y === NEST[1]) deposit()
      else if (!G.carrying) {
        const here = ITEMS.find(i => G.items[i.id].state !== 'nest' && G.items[i.id].state !== 'carried' && G.items[i.id].x === x && G.items[i.id].y === y)
        if (here) pick(here)
      }
    }

    function pick(item) {
      G.items[item.id].state = 'carried'
      G.carrying = item.id
      audio()?.pick(0)
      if (item.id === 'cap') { sound('alarm', G.cat.x + 0.5, G.cat.y + 0.5, 0.25); audio()?.tink(0) }
      say(`${item.name[0].toUpperCase()}${item.name.slice(1)}, in your mouth. It ${item.carry}.`)
    }

    function deposit() {
      const id = G.carrying
      G.items[id].state = 'nest'
      G.carrying = null
      G.deposited.push(id)
      audio()?.nest()
      const left = ITEMS.filter(i => G.items[i.id].state !== 'nest').length
      say(left ? `${ITEMS.find(i => i.id === id).name[0].toUpperCase()}${ITEMS.find(i => i.id === id).name.slice(1)} is in the nest. ${left === 1 ? 'One more.' : 'Two more.'}` : 'All three, under the stairs. You turn around twice and fold yourself around them.')
      if (!left) endNight('hoard')
    }

    function startMove(nx, ny) {
      const c = G.cat
      if (!passable(nx, ny, G.doors)) return false
      c.from = [c.x, c.y]
      c.to = [nx, ny]
      c.leap = isLeap(c.x, c.y, nx, ny)
      c.dur = c.leap ? LEAP : G.creep ? CREEP : WALK
      c.t = 0
      c.heading = Math.atan2(-(ny - c.y), nx - c.x)
      return true
    }

    const yawRef = { value: 0 }
    const screenDir = (dir) => {
      const yaw = yawRef.value
      const up = [-Math.sin(yaw), -Math.cos(yaw)]
      const right = [Math.cos(yaw), -Math.sin(yaw)]
      const v = dir === 'up' ? up : dir === 'down' ? [-up[0], -up[1]] : dir === 'right' ? right : [-right[0], -right[1]]
      return [Math.round(v[0]), Math.round(v[1])]
    }

    function actOption() {
      const c = G.cat
      const d = adjacentDoor(c.x, c.y, doorMeshes)
      const standingInDoor = isDoor(cellAt(c.x, c.y))
      const here = ITEMS.find(i => !G.carrying && G.items[i.id].state !== 'nest' && G.items[i.id].state !== 'carried' && G.items[i.id].x === c.x && G.items[i.id].y === c.y)
      if (here) return { kind: 'pick', label: `pick up ${here.short}`, item: here }
      if (d && !standingInDoor) return { kind: 'door', label: `${G.doors[d.key] ? 'nudge shut' : 'nudge open'} the ${DOORS[d.key].id} door`, door: d }
      if (G.carrying) return { kind: 'drop', label: `put down the ${ITEMS.find(i => i.id === G.carrying).short}` }
      return { kind: 'none', label: 'nothing to do here' }
    }

    function act() {
      if (G.phase !== 'night') return
      const opt = actOption()
      const c = G.cat
      if (opt.kind === 'pick') pick(opt.item)
      else if (opt.kind === 'door') {
        const k = opt.door.key
        G.doors[k] = !G.doors[k]
        acoustics.setDoors(G.doors)
        const amp = G.creep ? 0.42 : 0.9
        sound('alarm', c.x + 0.5, c.y + 0.5, amp)
        ping(c.x + 0.5, c.y + 0.5, surfaceAt(c.x, c.y).height || 0, amp)
        audio()?.door(0, G.creep)
        say(G.doors[k] ? `The ${DOORS[k].id} door swings open. Sound can get through again.` : `The ${DOORS[k].id} door clicks shut. Whatever happens on the other side now stays mostly there.`)
      } else if (opt.kind === 'drop') {
        const id = G.carrying
        const s = surfaceAt(c.x, c.y)
        G.items[id] = { state: 'dropped', x: c.x, y: c.y }
        G.carrying = null
        const amp = id === 'cap' ? (s.hard ? 0.7 : 0.15) : 0.03
        sound('alarm', c.x + 0.5, c.y + 0.5, amp)
        if (id === 'cap') audio()?.tink(0)
        say(`You set the ${ITEMS.find(i => i.id === id).short} down on ${s.name}. Walk back over it to pick it up.`)
      } else say('Nothing to nudge here. Doors open and shut from beside them.')
    }

    function endNight(reason) {
      if (G.phase !== 'night') return
      G.phase = reason === 'caught' ? 'caught' : 'dawn'
      G.endAt = G.simTime
      G.path = []
      G.held = null
      const items = ITEMS.filter(i => G.items[i.id].state === 'nest').length
      const heard = G.sleepers.reduce((s, sl) => s + sl.heardTotal, 0)
      const stirs = G.sleepers.reduce((s, sl) => s + sl.stirs, 0)
      const result = {
        reason,
        items,
        minute: G.minute,
        heard,
        stirs,
        barks: G.barks,
        steps: G.steps.length,
        loudest: G.loudest,
        creaks: G.newFound,
        chalked: G.found.size,
        epithet: epithet({ items, heard, stirs, barks: G.barks, caught: reason === 'caught' })
      }
      G.result = result
      const record = { at: new Date().toISOString().slice(0, 10), items, outcome: reason, clock: formatClock(G.minute), epithet: result.epithet }
      const list = [record, ...readJSON(NIGHTS_KEY, [])].slice(0, 6)
      writeJSON(NIGHTS_KEY, list)
      setNights(list)
      // the aftermath: every heard pressure, summed over the night
      // normalised to the loudest half-percent of the floor, so the places you were loud stand out
      const heat = acoustics.fields.alarm.heat
      const sorted = Float32Array.from(heat).sort()
      const top = sorted[Math.floor(sorted.length * 0.995)] || 1
      for (let k = 0; k < heat.length; k++) fieldData[k * 4 + 2] = Math.round(255 * Math.min(1, heat[k] / top))
      fieldTex.needsUpdate = true
      paws.count = Math.min(G.steps.length, 900)
      const startStep = Math.max(0, G.steps.length - 900)
      for (let i = 0; i < paws.count; i++) {
        const st = G.steps[startStep + i]
        dummy.position.set(st.x + (i % 2 ? 0.1 : -0.1), (surfaceAt(Math.floor(st.x), Math.floor(st.y)).height || 0) + 0.03, st.y)
        dummy.rotation.set(-Math.PI / 2, 0, 0)
        const r = 0.6 + Math.min(2.4, st.amp * 2.2)
        dummy.scale.set(r, r, 1)
        dummy.updateMatrix()
        paws.setMatrixAt(i, dummy.matrix)
        paws.setColorAt(i, new THREE.Color().setHSL(0.1 - Math.min(0.1, st.amp * 0.06), 0.9, 0.55 + Math.min(0.3, 0.15 / (st.amp + 0.2))))
      }
      paws.instanceMatrix.needsUpdate = true
      if (paws.instanceColor) paws.instanceColor.needsUpdate = true
      const a = audio()
      if (reason === 'caught') {
        a?.lamp()
        say(`The lamp clicks on at ${formatClock(G.minute)}. A hand finds the switch, then finds you.`)
      } else if (reason === 'time') {
        a?.alarm()
        say('The alarm. Grey light behind the curtains. The night is over whether you were finished or not.')
      }
      setPhase(G.phase)
    }

    function wakeSleeperEffects(s, change, index) {
      const a = audio()
      const pos = index === 0 ? [5, 2.5] : [26, 10.5]
      if (s.id === 'human') {
        if (change.to === 'stirring') { a?.rustle(panOf(pos[0])); sound('cover', pos[0], pos[1], 0.5); say('The human turns over. The duvet says something.') }
        if (change.to === 'listening') { a?.murmur(panOf(pos[0])); say('The human is lying very still. That is the listening kind of still.') }
        if (change.to === 'dreaming' && change.from === 'stirring') say('The human sinks back under.')
        if (change.to === 'awake') endNight('caught')
      } else {
        if (change.to === 'stirring') { a?.jingle(panOf(pos[0])); say('The dog\'s tags jingle. One ear is up.') }
        if (change.to === 'listening') say('The dog has lifted its head. It is looking at the dark where you are.')
        if (change.to === 'awake') {
          G.barkQueue.push(G.simTime + 0.05, G.simTime + 0.7, G.simTime + 1.4)
          s.deaf = 3.2
          G.barks += 3
          say('The dog is up. Three barks, aimed straight down the hall.')
        }
      }
    }

    function update(dt) {
      const night = G.phase === 'night'
      G.simTime += dt
      if (night) G.minute += dt / SECONDS_PER_MINUTE
      const a = audio()

      // the clock
      G.tickAcc += dt
      if (G.tickAcc >= 1) { G.tickAcc -= 1; sound('cover', CLOCK[0], CLOCK[1] + 0.3, 0.12); a?.tick(G.phase === 'intro') }
      while (night && G.chimeIndex < CHIMES.length && CHIMES[G.chimeIndex].at <= G.minute) {
        const e = CHIMES[G.chimeIndex++]
        if (e.kind === 'note') {
          if (!G.chiming) say(G.minute % 60 < 1 ? 'The hour. The clock talks for a long time now. Anything loud belongs to it.' : 'The clock is chiming. While it speaks, the house is louder than you.')
          G.chiming = true
          sound('cover', CLOCK[0], CLOCK[1] + 0.35, 2.4)
          ping(CLOCK[0], CLOCK[1] + 0.4, 0, 1, true)
          a?.note(e.freq)
        } else if (e.kind === 'strike') {
          sound('cover', CLOCK[0], CLOCK[1] + 0.35, 3.4)
          a?.strike(e.freq)
        } else {
          G.chiming = false
        }
      }
      // fridge
      const fOn = fridgeOn(G.minute)
      if (fOn !== G.fridge) {
        G.fridge = fOn
        sound('cover', FRIDGE[0] - 0.7, FRIDGE[1], 1.4)
        a?.clunk(panOf(FRIDGE[0]))
        a?.fridge(fOn)
        if (night) say(fOn ? 'The fridge shudders back on. The kitchen hums again.' : 'The fridge stops. The kitchen is suddenly very quiet.')
      }
      // rain
      const rain = rainLevel(G.minute)
      if (rain > 0 && !G.rainAnnounced && night) { G.rainAnnounced = true; say('Rain starts on the glass. Every window is talking now.') }
      if (Math.abs(rain - G.rain) > 0.02) { G.rain = rain; a?.rain(rain) }
      let drops = rain * 18 * dt
      while (drops > 0) {
        if (Math.random() < drops) {
          const wdw = WINDOWS[Math.floor(Math.random() * WINDOWS.length)]
          const [x0, y0, x1, y1] = wdw.line
          const t = Math.random()
          sound('cover', x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 0.35 + Math.random() * 0.45)
        }
        drops -= 1
      }
      // a car outside the front room
      const car = carLevel(G.minute)
      if (car > 0) {
        if (!G.carOn && night) { G.carOn = true; say('A car goes by out front. For a moment the whole front room is engine.') }
        if (Math.random() < 0.6) sound('cover', 1.5 + Math.random() * 3, 18.8, car * 1.4)
        const k = (G.minute - CAR.from) / (CAR.to - CAR.from)
        headlights.intensity = car * 40
        headlights.position.set(-6 + k * 30, 1.3, 23)
        headlights.target.position.set(-2 + k * 22, 0, 14)
      } else headlights.intensity = 0
      a?.car(car)

      // barks
      while (G.barkQueue.length && G.barkQueue[0] <= G.simTime) {
        G.barkQueue.shift()
        sound('alarm', 25.1, 11.4, BARK)
        ping(25.6, 10.8, 0.4, 3)
        a?.bark(panOf(26))
        if (!G.barkQueue.length) {
          const dogS = G.sleepers[1]
          dogS.depth = 0.5
          dogS.mode = 'stirring'
          say('The dog grumbles, circles, and lies back down. Did that reach the bedroom?')
        }
      }

      // movement
      const c = G.cat
      if (night || G.phase === 'intro') {
        if (c.t < 1) {
          c.t = Math.min(1, c.t + dt / c.dur)
          if (c.t >= 1) arrive()
        }
        if (c.t >= 1 && G.phase === 'night') {
          if (G.path.length) {
            const [nx, ny] = G.path[0]
            if (startMove(nx, ny)) G.path.shift()
            else { G.path = []; say('Something is in the way. A door, maybe.') }
          } else if (G.held) {
            const [dx, dy] = screenDir(G.held)
            const nx = c.x + dx
            const ny = c.y + dy
            if (!startMove(nx, ny) && G.lastBump !== keyOf(nx, ny)) {
              G.lastBump = keyOf(nx, ny)
              const ch = cellAt(nx, ny)
              if (isDoor(ch)) say('A shut door. Press E beside it to nudge it.')
            }
          }
        }
      }

      // sleepers
      acoustics.step(Math.max(1, Math.round(STEPS_PER_SECOND * dt)), dt, (f, sub, drive) => {
        if (G.fridge) {
          G.humPhase = (G.humPhase || 0) + sub * 2 * Math.PI * 11
          drive('cover', FRIDGE[0] - 0.8, FRIDGE[1], 0.022 * Math.sin(G.humPhase))
        }
      })
      if (night) {
        G.sleepers.forEach((s, i) => {
          const change = updateSleeper(s, acoustics.ears[i], dt, G.nudge[i])
          G.nudge[i] = 0
          if (change) wakeSleeperEffects(s, change, i)
        })
        if (G.minute >= END_MINUTE) endNight('time')
      }
    }

    // Field texture: signed, square-root compressed so a far whisper is still a ring.
    function encodeField() {
      const ap = acoustics.fields.alarm.p
      const cp = acoustics.fields.cover.p
      const red = reducedRef.current
      for (let k = 0, o = 0; k < ap.length; k++, o += 4) {
        let av = ap[k]
        let cv = cp[k]
        if (red) {
          envA[k] = Math.max(Math.abs(av), envA[k] * 0.94)
          envC[k] = Math.max(Math.abs(cv), envC[k] * 0.94)
          av = envA[k] * 0.8
          cv = envC[k] * 0.8
        }
        const ae = Math.sign(av) * Math.min(1, Math.sqrt(Math.abs(av) * 4))
        const ce = Math.sign(cv) * Math.min(1, Math.sqrt(Math.abs(cv) * 2))
        fieldData[o] = 128 + Math.round(ae * 127)
        fieldData[o + 1] = 128 + Math.round(ce * 127)
        fieldData[o + 3] = 255
      }
      fieldTex.needsUpdate = true
    }

    // Camera fit.
    const camState = { target: new THREE.Vector3(W / 2, 0, H / 2), size: 12, ready: false }
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    function layout() {
      const w = mount.clientWidth
      const h = mount.clientHeight
      renderer.setSize(w, h)
      const portrait = w / h < 1.05
      yawRef.value = portrait ? Math.PI / 2 : 0
      camState.portrait = portrait
      camState.w = w
      camState.h = h
    }
    function placeCamera(dt) {
      const { w, h } = camState
      const yaw = yawRef.value
      const off = new THREE.Vector3(Math.sin(yaw) * 15, TILT_Y, Math.cos(yaw) * 15)
      const aspect = w / h
      const close = viewRef.current === 'close' || (viewRef.current === 'auto' && w < 700 && G.phase === 'night')
      const top = w < 700 ? 118 : 132
      const bottom = w < 700 ? 214 : 196
      // world height of the whole house in this view
      const sinTilt = Math.sin(Math.atan2(TILT_Y, 15))
      const across = camState.portrait ? H : W
      const deep = (camState.portrait ? W : H) * sinTilt + 1.4
      const usable = Math.max(120, h - top - bottom)
      let halfH = Math.max(deep * h / usable, across / aspect * 1.06) / 2
      if (close) halfH = (w < 700 ? 7.4 : 8.5) * (h / Math.max(w, 1)) * (w < 700 ? 0.92 : 0.7)
      const worldPerPx = (2 * halfH) / h
      const screenUp = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
      const screenRight = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
      // the band between the HUD rows, in ground units along screen-up
      const shift = (bottom - top) / 2 * worldPerPx / sinTilt
      let target
      if (close) {
        // follow the cat, but never show much beyond the house walls
        const cat = new THREE.Vector3(G.cat.x + 0.5, 0, G.cat.y + 0.5)
        const centre = new THREE.Vector3(W / 2, 0, H / 2)
        const halfR = halfH * aspect
        const halfU = (usable / 2) * worldPerPx / sinTilt
        const spanR = Math.abs(screenRight.x) * W + Math.abs(screenRight.z) * H
        const spanU = Math.abs(screenUp.x) * W + Math.abs(screenUp.z) * H
        const clampAxis = (v, half, span) => (span / 2 + 1 <= half ? 0 : Math.max(-(span / 2 + 1 - half), Math.min(span / 2 + 1 - half, v)))
        const d = cat.clone().sub(centre)
        const r = clampAxis(d.dot(screenRight), halfR, spanR)
        const u = clampAxis(d.dot(screenUp), halfU, spanU)
        target = centre.addScaledVector(screenRight, r).addScaledVector(screenUp, u)
      } else target = new THREE.Vector3(W / 2, 0, H / 2)
      target.addScaledVector(screenUp, -shift)
      const k = !camState.ready || reducedRef.current ? 1 : 1 - Math.exp(-dt * 4)
      camState.target.lerp(target, k)
      camState.size += (halfH - camState.size) * k
      camState.ready = true
      camera.left = -camState.size * aspect
      camera.right = camState.size * aspect
      camera.top = camState.size
      camera.bottom = -camState.size
      camera.position.copy(camState.target).add(off.multiplyScalar(2))
      camera.lookAt(camState.target)
      camera.updateProjectionMatrix()
    }
    layout()
    const ro = new ResizeObserver(() => layout())
    ro.observe(mount)

    // Pointer: tap a spot to walk there.
    let down = null
    const onDown = e => { down = { x: e.clientX, y: e.clientY } }
    const onUp = e => {
      if (!down) return
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y)
      down = null
      if (moved > 12 || G.phase !== 'night') return
      audioRef.current?.unlock()
      const rect = renderer.domElement.getBoundingClientRect()
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const hits = ray.intersectObjects(scene.children, true).filter(hh => hh.object.userData.pick || hh.object === floorMesh)
      if (!hits.length) return
      const p = hits[0].point
      const x = Math.floor(p.x)
      const y = Math.floor(p.z)
      apiRef.current.goTo(x, y)
    }
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)

    function goTo(x, y) {
      const c = G.cat
      if (x === c.x && y === c.y) { G.path = []; say('You stop and sit. Listening is free.'); return }
      const ch = cellAt(x, y)
      if (isDoor(ch) && !G.doors[ch]) {
        const d = doorMeshes.find(dd => dd.x === x && dd.y === y)
        if (Math.abs(d.x - c.x) + Math.abs(d.y - c.y) === 1) { act(); return }
      }
      const path = findPath([c.x, c.y], [x, y], G.doors)
      if (!path) {
        if (ch === 'H') say('That is the dog\'s bed. The dog is in it.')
        else if (ch === 'G') say('The clock. You do not climb the clock.')
        else say('No way there from here. Something is shut or solid.')
        return
      }
      G.path = path
      G.held = null
    }

    // Head for a thing (or the nest, if it is in your mouth). A shut door stops you beside it.
    function goToItem(id) {
      if (G.phase !== 'night') return
      const st = G.items[id]
      if (st.state === 'nest') { say('That one is already home.'); return }
      const target = st.state === 'carried' ? NEST : [st.x, st.y]
      const c = G.cat
      if (c.x === target[0] && c.y === target[1]) return
      const path = findPath([c.x, c.y], target, G.doors)
      if (path) { G.path = path; G.held = null; return }
      const allOpen = Object.fromEntries(Object.keys(G.doors).map(k => [k, true]))
      const route = findPath([c.x, c.y], target, allOpen)
      if (!route) return
      const blocked = route.findIndex(([x, y]) => isDoor(cellAt(x, y)) && !G.doors[cellAt(x, y)])
      const before = blocked > 0 ? route[blocked - 1] : [c.x, c.y]
      G.path = before[0] === c.x && before[1] === c.y ? [] : findPath([c.x, c.y], before, G.doors) || []
      G.held = null
      say(`The ${DOORS[cellAt(...route[blocked])].id} door is shut. Nudge it with E when you're beside it.`)
    }

    apiRef.current = {
      goTo,
      goToItem,
      act,
      actOption,
      begin() {
        if (G.phase !== 'intro') return
        if (!audioRef.current) audioRef.current = createNightAudio()
        audioRef.current?.unlock()
        audioRef.current?.fridge(G.fridge)
        audioRef.current?.setMuted(mutedRef.current)
        G.phase = 'night'
        setPhase('night')
        startMove(2, 17)
        say('Down off the sill. Floorboards here; the rug ahead is quieter.')
      },
      setHeld(dir) {
        if (G.phase !== 'night') return
        G.held = dir
        G.path = []
        G.lastBump = null
      },
      release(dir) { if (G.held === dir) G.held = null },
      setCreep(v) { G.creep = v },
      restart() {
        const fresh = freshGame()
        Object.keys(G).forEach(k => delete G[k])
        Object.assign(G, fresh)
        acoustics.clear()
        acoustics.setDoors(G.doors)
        envA.fill(0)
        envC.fill(0)
        for (let k = 0; k < fieldData.length; k += 4) fieldData[k + 2] = 0
        paws.count = 0
        lamp.intensity = 0
        setExposure(true)
        setPhase('intro')
        setMessage('Another night. The chalk marks stayed where you left them.')
        apiRef.current.begin()
      }
    }
    const mutedRef = { current: false }
    apiRef.current.setMutedRef = m => { mutedRef.current = m }

    // Render loop.
    let raf = 0
    let last = performance.now()
    let hudAcc = 0
    const tmp = new THREE.Vector3()
    function frame(now) {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      update(dt)
      encodeField()
      const red = reducedRef.current
      const t = G.simTime

      // cat pose
      const c = G.cat
      const e = c.t
      const ease = e < 0.5 ? 2 * e * e : 1 - (-2 * e + 2) ** 2 / 2
      const hFrom = surfaceAt(...c.from).height || 0
      const hTo = surfaceAt(...c.to).height || 0
      const fx = c.from[0] + (c.to[0] - c.from[0]) * ease + 0.5
      const fz = c.from[1] + (c.to[1] - c.from[1]) * ease + 0.5
      const arc = c.leap && !red ? Math.sin(Math.PI * e) * 0.5 : 0
      const hy = hFrom + (hTo - hFrom) * ease + arc
      cat.position.set(fx, hy, fz)
      let dh = c.heading - cat.rotation.y
      dh = Math.atan2(Math.sin(dh), Math.cos(dh))
      cat.rotation.y += dh * (red ? 1 : Math.min(1, dt * 14))
      const moving = c.t < 1
      const crouch = G.creep ? 0.78 : 1
      catBody.scale.set(1, crouch + (moving && !red ? Math.sin(e * Math.PI) * 0.04 : 0), 1)
      catBody.position.y = moving && !c.leap && !red ? Math.abs(Math.sin(e * Math.PI)) * 0.03 : 0
      legs.forEach((l, i) => { l.position.y = 0.07 + (moving && !red ? Math.max(0, Math.sin(e * Math.PI * 2 + (i % 3 ? Math.PI : 0))) * 0.04 : 0) })
      tail.forEach((seg, i) => {
        seg.rotation.z = (i === 0 ? 0.9 : 0.18) + (red ? 0 : Math.sin(t * 2.2 - i * 0.5) * 0.08)
        seg.rotation.y = red ? 0 : Math.sin(t * 1.4 - i * 0.6) * (G.creep ? 0.05 : 0.14)
      })
      catHead.rotation.z = G.creep ? -0.15 : 0
      catRing.position.set(fx, hy + 0.02, fz)

      // carried and placed items
      ITEMS.forEach((it, i) => {
        const st = G.items[it.id]
        const m = itemMeshes[it.id]
        if (st.state === 'carried') {
          tmp.set(0.37, 0.28, 0).applyEuler(cat.rotation)
          m.position.set(fx + tmp.x, hy + 0.26 * crouch, fz + tmp.z)
          halos[i].visible = false
        } else if (st.state === 'nest') {
          const slot = G.deposited.indexOf(it.id)
          m.position.set(NEST[0] + 0.5 + Math.cos(slot * 2.1) * 0.16, 0.14, NEST[1] + 0.5 + Math.sin(slot * 2.1) * 0.16)
          halos[i].visible = false
        } else {
          const hh = surfaceAt(st.x, st.y).height || 0
          m.position.set(st.x + 0.5, hh + 0.05, st.y + 0.5)
          halos[i].visible = G.phase !== 'caught'
          halos[i].position.set(st.x + 0.5, hh + 0.02, st.y + 0.5)
        }
      })

      // sleepers breathe; disturbance shows in posture
      const human = G.sleepers[0]
      const dogS = G.sleepers[1]
      const breath = red ? 0 : Math.sin(t * (human.mode === 'deep' ? 1.3 : 2)) * 0.03
      sleeperBody.scale.y = 0.24 + breath
      const turn = human.mode === 'stirring' || human.mode === 'listening' ? 0.35 : 0
      sleeperBody.rotation.y += (turn - sleeperBody.rotation.y) * Math.min(1, dt * 3)
      const sitUp = G.phase === 'caught' ? Math.min(1, (t - G.endAt) * 1.2) : 0
      head.position.y = 0.7 + (human.mode === 'listening' ? 0.06 : 0) + sitUp * 0.55
      head.position.z = 1.55 + sitUp * 0.5
      lamp.intensity = G.phase === 'caught' ? Math.min(7, (t - G.endAt) * 14) : 0
      shade.material.emissive.set(G.phase === 'caught' ? '#ffb060' : '#000000')
      const dogUp = dogS.mode === 'listening' || dogS.mode === 'awake' || G.barkQueue.length ? 1 : dogS.mode === 'stirring' ? 0.4 : 0
      dogHead.position.y = 0.2 + dogUp * 0.22 + (G.barkQueue.length && !red ? Math.abs(Math.sin(t * 9)) * 0.06 : 0)
      dogHead.rotation.z = dogUp * 0.3
      dogBody.scale.y = 0.27 + (red ? 0 : Math.sin(t * 2.6) * 0.02)

      // doors swing
      doorMeshes.forEach(d => {
        const target = G.doors[d.key] ? d.swing : 0
        d.pivot.rotation.y += (target - d.pivot.rotation.y) * (red ? 1 : Math.min(1, dt * 5))
      })
      // clock hands and pendulum
      const mm = G.minute % 60
      minuteHand.position.set(19.5 + Math.sin(mm / 60 * Math.PI * 2) * 0.09, 1.8 + Math.cos(mm / 60 * Math.PI * 2) * 0.09, 10.64)
      minuteHand.rotation.z = -mm / 60 * Math.PI * 2
      const hr = (G.minute / 60) % 12
      hourHand.position.set(19.5 + Math.sin(hr / 12 * Math.PI * 2) * 0.06, 1.8 + Math.cos(hr / 12 * Math.PI * 2) * 0.06, 10.645)
      hourHand.rotation.z = -hr / 12 * Math.PI * 2
      pendulum.rotation.z = red ? 0 : Math.sin(t * Math.PI) * 0.16
      fridgeLed.material.emissiveIntensity = G.fridge ? 3 : 0.4
      fridgeGlow.intensity = G.fridge ? 0.6 : 0.15

      // light at the end
      const ending = G.phase === 'dawn' ? Math.min(1, (t - G.endAt) / 3) : 0
      hemi.intensity = 1.15 + ending * 0.9
      hemi.color.set('#7381b8').lerp(new THREE.Color('#ffd9b0'), ending)
      moon.color.set('#c3d2ff').lerp(new THREE.Color('#ffc890'), ending)
      poolMat.color.set('#ffffff').lerp(new THREE.Color('#ffb070'), ending)
      const ended = G.phase === 'caught' || G.phase === 'dawn'
      fieldMat.uniforms.uMode.value += ((ended && exposureRef.current ? 1 : 0) - fieldMat.uniforms.uMode.value) * (red ? 1 : Math.min(1, dt * 2))
      paws.visible = ended && exposureRef.current
      pools.forEach(p => { p.visible = true })

      pings.forEach(m => {
        const u = m.userData
        if (!m.visible) return
        u.age += dt
        const k = u.age / u.life
        if (k >= 1) { m.visible = false; return }
        const r = red ? u.reach * 0.6 : 0.15 + u.reach * (1 - (1 - k) ** 2)
        m.scale.set(r, r, 1)
        m.material.opacity = u.peak * (1 - k) ** 1.5
      })

      placeCamera(dt)
      renderer.render(scene, camera)

      // DOM tags follow the sleepers
      const tags = tagRefs.current
      ;[[tags.human, 5, 1.25, 1.6], [tags.dog, 26, 0.95, 10.5]].forEach(([el, x, y, z]) => {
        if (!el) return
        tmp.set(x, y, z).project(camera)
        const sx = (tmp.x * 0.5 + 0.5) * camState.w
        const sy = (-tmp.y * 0.5 + 0.5) * camState.h
        const off = tmp.z > 1 || sx < -40 || sx > camState.w + 40 || sy < -40 || sy > camState.h + 40
        el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`
        el.style.opacity = off ? '0' : '1'
        el.classList.toggle('is-flip', sx > camState.w - 150)
      })
      G.sleepers.forEach(s => {
        const el = tags[s.id]
        if (el) el.style.setProperty('--hit', Math.min(1, s.recent * 6).toFixed(3))
      })

      hudAcc += dt
      if (hudAcc > 0.12) {
        hudAcc = 0
        const snap = snapshot(G)
        snap.act = G.phase === 'night' ? actOption() : { kind: 'none', label: '' }
        setHud(snap)
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      wallMesh.dispose()
      capMesh.dispose()
      paws.dispose()
      disposables.forEach(d => d.dispose())
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      audioRef.current?.dispose()
      audioRef.current = null
    }
  }, [])

  const begin = useCallback(() => apiRef.current.begin?.(), [])
  const restart = useCallback(() => apiRef.current.restart?.(), [])
  const toggleCreep = useCallback(() => {
    const g = gameRef.current
    g.creep = !g.creep
    setHud(h => ({ ...h, creep: g.creep }))
  }, [])
  const toggleMute = useCallback(() => {
    setMuted(m => {
      const next = !m
      audioRef.current?.setMuted(next)
      apiRef.current.setMutedRef?.(next)
      return next
    })
  }, [])
  const cycleView = useCallback(() => setView(v => (v === 'house' ? 'close' : v === 'close' ? 'auto' : 'house')), [])

  // Keyboard.
  useEffect(() => {
    const DIRS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }
    const onKey = e => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea')) return
      const g = gameRef.current
      const api = apiRef.current
      if (DIRS[e.code]) {
        e.preventDefault()
        if (g.phase === 'intro') return
        if (!e.repeat) api.setHeld(DIRS[e.code])
        return
      }
      if (e.key === 'Shift') { g.creepHeld = true; if (!g.creep) { g.creep = true; g.creepFromShift = true; setHud(h => ({ ...h, creep: true })) } return }
      if (e.repeat) return
      if (e.code === 'Enter' && g.phase === 'intro') { e.preventDefault(); begin(); return }
      if ((e.code === 'Enter' || e.code === 'KeyR') && (g.phase === 'caught' || g.phase === 'dawn')) { e.preventDefault(); restart(); return }
      if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { if (e.target instanceof HTMLButtonElement && e.code !== 'KeyE') return; e.preventDefault(); api.act(); return }
      if (e.code === 'KeyC') { toggleCreep(); return }
      if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) { api.goToItem(ITEMS[Number(e.code.slice(-1)) - 1].id); return }
      if (e.code === 'KeyV') { cycleView(); return }
      if (e.code === 'KeyM') { toggleMute(); return }
      if (e.code === 'KeyX' && (g.phase === 'caught' || g.phase === 'dawn')) setExposure(x => !x)
    }
    const onUp = e => {
      const DIR = DIRS[e.code]
      if (DIR) apiRef.current.release(DIR)
      if (e.key === 'Shift') {
        const g = gameRef.current
        g.creepHeld = false
        if (g.creepFromShift) { g.creep = false; g.creepFromShift = false; setHud(h => ({ ...h, creep: false })) }
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onUp)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onUp) }
  }, [begin, restart, toggleCreep, cycleView, toggleMute])

  const result = gameRef.current.result
  const minute = hud.minute
  const nextChime = Math.ceil((minute + 0.01) / 15) * 15
  const toChime = Math.max(0, nextChime - minute)

  return (
    <div className={`sh-root is-${phase} ${reduced ? 'sh-reduced' : ''}`} data-testid="small-hours">
      <div className="sh-stage" ref={mountRef} data-playground-surface data-testid="small-hours-house" />

      <header className="sh-top">
        <Link to="/playground/consciousness" className="sh-back">← laboratory</Link>
        <div className="sh-title">
          <h1>small.hours()</h1>
          <p>a sleeping house, heard from the floor</p>
        </div>
        <div className="sh-clock" aria-label={`The time is ${formatClock(minute)}`} data-testid="small-hours-clock">
          <svg viewBox="-30 -30 60 60" aria-hidden="true">
            <circle r="27" className="sh-clock-face" />
            {[0, 1, 2, 3].map(q => <circle key={q} r="2.2" cx={Math.sin(q * Math.PI / 2) * 22} cy={-Math.cos(q * Math.PI / 2) * 22} className={hud.chiming && (minute % 60) >= q * 15 && (minute % 60) < q * 15 + 6 ? 'is-ringing' : ''} />)}
            <circle r="24" className="sh-clock-arc" transform="rotate(-90)" style={{ strokeDasharray: `${((15 - toChime) / 15 * 150.8).toFixed(1)} 150.8` }} />
            <line x1="0" y1="0" x2={Math.sin((minute % 60) / 60 * Math.PI * 2) * 19} y2={-Math.cos((minute % 60) / 60 * Math.PI * 2) * 19} className="sh-hand-m" />
            <line x1="0" y1="0" x2={Math.sin(((minute / 60) % 12) / 12 * Math.PI * 2) * 12} y2={-Math.cos(((minute / 60) % 12) / 12 * Math.PI * 2) * 12} className="sh-hand-h" />
          </svg>
          <div>
            <strong>{formatClock(minute)}</strong>
            <span>{hud.chiming ? 'the clock is chiming' : `chime in ${Math.ceil(toChime * SECONDS_PER_MINUTE)}s`}</span>
            <em>{hud.house}</em>
          </div>
        </div>
      </header>

      {hud.sleepers.map(s => (
        <div
          key={s.id}
          className={`sh-sleeper is-${s.mode}`}
          ref={el => { tagRefs.current[s.id] = el }}
          data-testid={`sleeper-${s.id}`}
          aria-label={`${s.name}: ${MODE_WORD[s.mode]}`}
        >
          <svg viewBox="-20 -20 40 40" aria-hidden="true">
            <circle r="15" className="sh-sleep-track" />
            <circle r="15" className="sh-sleep-depth" style={{ strokeDasharray: `${(s.depth * 94.2).toFixed(1)} 94.2` }} />
            <text y="5">{s.mode === 'awake' ? '!' : s.mode === 'listening' ? '?' : 'z'}</text>
          </svg>
          <span><b>{s.id === 'human' ? 'human' : 'dog'}</b>{MODE_WORD[s.mode]}</span>
        </div>
      ))}

      <footer className="sh-bottom">
        <p className="sh-message" aria-live="polite" data-testid="small-hours-message">{message}</p>
        <div className="sh-dock">
          <ol className="sh-hoard" aria-label="The nest under the stairs">
            {ITEMS.map(it => {
              const st = hud.items[it.id]
              return (
                <li key={it.id} className={`is-${st}`}>
                  <button
                    type="button"
                    onClick={() => apiRef.current.goToItem?.(it.id)}
                    disabled={phase !== 'night' || st === 'nest'}
                    data-testid={`hoard-${it.id}`}
                    data-state={st}
                    aria-label={st === 'carried' ? `Carry the ${it.short} to the nest` : st === 'nest' ? `The ${it.short} is in the nest` : `Walk to the ${it.short}`}
                    data-playground-action="go-to-item"
                  >
                    <i style={{ '--ink': ITEM_COLOR[it.id] }} aria-hidden="true" />
                    <span>
                      <b>{it.short} <kbd>{ITEMS.indexOf(it) + 1}</kbd></b>
                      {st === 'nest' ? 'in the nest' : st === 'carried' ? 'in your mouth: tap to take it home' : st === 'dropped' ? 'put down somewhere' : it.hint}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="sh-controls">
            <button type="button" className={`sh-btn ${hud.creep ? 'is-on' : ''}`} onClick={toggleCreep} aria-pressed={hud.creep} data-playground-action="creep" data-testid="small-hours-creep" disabled={phase !== 'night'}>
              {hud.creep ? 'creeping' : 'walking'} <kbd>C</kbd>
            </button>
            <button type="button" className="sh-btn sh-act" onClick={() => apiRef.current.act()} data-playground-action="act" data-testid="small-hours-act" disabled={phase !== 'night' || hud.act?.kind === 'none'}>
              {hud.act?.kind && hud.act.kind !== 'none' ? hud.act.label : 'nothing to nudge'} <kbd>E</kbd>
            </button>
            <button type="button" className="sh-btn sh-small" onClick={cycleView} data-playground-action="view" data-testid="small-hours-view" aria-label={`Camera: ${view}`}>
              {view === 'auto' ? 'view: auto' : view === 'house' ? 'view: house' : 'view: close'} <kbd>V</kbd>
            </button>
            <button type="button" className="sh-btn sh-small" onClick={toggleMute} aria-pressed={muted} data-testid="small-hours-mute">{muted ? 'sound off' : 'sound on'} <kbd>M</kbd></button>
          </div>
        </div>
      </footer>

      {phase === 'intro' && (
        <div className="sh-card sh-intro" role="dialog" aria-label="small hours" data-testid="small-hours-intro">
          <p className="sh-time">3:00 a.m.</p>
          <h2>Three small things belong under the stairs before the alarm at half past five.</h2>
          <p>The human is asleep at the far end of the bedroom. The dog is asleep across the hall. Every paw you put down is a sound, and sound goes wherever the doors let it: the amber rings are yours, the pale ones are the house.</p>
          <p>Rugs are quiet and tile is not. Some boards complain. When the clock chimes, or the rain gets going, the house is louder than you are.</p>
          <ul className="sh-keys">
            <li><b>tap</b> a spot to walk there, or arrows / WASD</li>
            <li><b>creep</b> (C, or hold Shift): slower and softer</li>
            <li><b>E</b> beside a door to nudge it; walk over things to pick them up</li>
            <li><b>1 2 3</b> or tap a card below to head for that thing, or home with it</li>
          </ul>
          <button type="button" className="sh-primary" onClick={begin} data-playground-primary data-testid="small-hours-begin">slip off the windowsill <kbd>Enter</kbd></button>
          {nights.length > 0 && (
            <ol className="sh-nights" aria-label="Earlier nights">
              {nights.map((n, i) => <li key={i}><b>{n.items}/3</b> {n.outcome === 'caught' ? `caught at ${n.clock}` : n.outcome === 'hoard' ? `nest full by ${n.clock}` : 'dawn'} — {n.epithet}</li>)}
            </ol>
          )}
        </div>
      )}

      {(phase === 'caught' || phase === 'dawn') && result && (
        <div className={`sh-card sh-end is-${result.reason}`} role="dialog" aria-label="The night is over" data-testid="small-hours-end">
          <p className="sh-time">{formatClock(result.minute)} · {result.reason === 'caught' ? 'lamp on' : result.reason === 'hoard' ? 'nest full' : 'alarm'}</p>
          <h2>{result.epithet}</h2>
          <p>
            {result.reason === 'caught'
              ? `The human heard you ${result.loudest ? `on ${result.loudest.where} in the ${result.loudest.room}` : ''}. ${result.items} of three made it to the nest.`
              : result.reason === 'hoard'
                ? `Cap, hair tie and sock, under the stairs at ${formatClock(result.minute)}. In the morning the human will find them and not be able to prove a thing.`
                : `${result.items} of three in the nest when the alarm went.`}
          </p>
          <dl className="sh-stats">
            <div><dt>paws put down</dt><dd>{result.steps}</dd></div>
            <div><dt>times someone stirred</dt><dd>{result.stirs}</dd></div>
            <div><dt>barks</dt><dd>{result.barks}</dd></div>
            <div><dt>boards chalked</dt><dd>{result.chalked}{result.creaks ? ` (+${result.creaks})` : ''}</dd></div>
          </dl>
          <p className="sh-aside">{exposure ? 'The floor now shows everything the house heard from you tonight, summed. Each pawprint is sized by how loud it was.' : 'Showing the house as it is.'}</p>
          <div className="sh-end-actions">
            <button type="button" className="sh-btn" onClick={() => setExposure(x => !x)} aria-pressed={exposure} data-playground-action="exposure" data-testid="small-hours-exposure">{exposure ? 'hide what it heard' : 'show what it heard'} <kbd>X</kbd></button>
            <button type="button" className="sh-primary" onClick={restart} data-playground-action="restart" data-testid="small-hours-restart">another night <kbd>R</kbd></button>
          </div>
        </div>
      )}
    </div>
  )
}

function snapshot(G) {
  const parts = ['the clock ticking']
  if (G.chiming) parts[0] = 'the clock chiming'
  if (G.fridge) parts.push('the fridge humming')
  if (G.rain > 0.05) parts.push(G.rain > 0.6 ? 'heavy rain' : 'rain on the glass')
  if (G.carOn && carLevel(G.minute) > 0) parts.push('a car outside')
  return {
    minute: G.minute,
    chiming: G.chiming,
    house: parts.join(' · '),
    creep: G.creep,
    carrying: G.carrying,
    items: Object.fromEntries(ITEMS.map(i => [i.id, G.items[i.id].state])),
    sleepers: G.sleepers.map(s => ({ id: s.id, name: s.name, depth: s.depth, mode: s.mode })),
    act: { kind: 'none', label: '' }
  }
}
