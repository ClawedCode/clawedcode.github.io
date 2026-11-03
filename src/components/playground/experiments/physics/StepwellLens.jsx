import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as THREE from 'three'
import {
  HALF, POOL, N, DX, TIERS, TIER_RISE, TIER_RUN, RIM, RIM_OUT, TERRACES, MASK_N, depthAt, formatClock
} from './stepwell/well'
import { createOptics, SLOPE_GAIN } from './stepwell/optics'
import {
  freshDay, tick, begin, movePot, setTempo, paw, focusRings, pawRings, epithet, clutchWord,
  POT_UNLOCKS, TEMPO_MIN, TEMPO_MAX, TEMPO_STEP, FAST, FIRST_LIGHT, CLOUDS, DROP_FALL, PAWS_MAX
} from './stepwell/day-core'
import { DAY_END } from './stepwell/well'
import { createDayAudio } from './stepwell/day-audio'
import './StepwellLens.css'

const DAYS_KEY = 'stepwell-lens.days'
const POT_Y = 2.1
const WATER_VIS = 0.12
const SHADE_SLOPE = 0.32 // the drawn surface tilts less than the optical one, so it reads as water
const LIGHT_SCALE = 6
const TERRACE_HEX = TERRACES.map(t => t.color)
const VIEWS = {
  steps: { el: 56, label: 'from the steps' },
  plumb: { el: 82, label: 'plumb' },
  close: { el: 64, label: 'close' }
}
const VIEW_ORDER = ['steps', 'plumb', 'close']

const readDays = () => {
  if (typeof localStorage === 'undefined') return []
  const raw = localStorage.getItem(DAYS_KEY)
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}
const writeDays = days => {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(DAYS_KEY, JSON.stringify(days)) } catch { /* storage full or private: the day still ends */ }
}

function gridGeometry(n, size, heightAt) {
  const g = new THREE.BufferGeometry()
  const pos = new Float32Array(n * n * 3)
  const nor = new Float32Array(n * n * 3)
  const uv = new Float32Array(n * n * 2)
  const step = size / (n - 1)
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i
      const x = -size / 2 + i * step
      const z = -size / 2 + j * step
      pos[k * 3] = x
      pos[k * 3 + 1] = heightAt ? heightAt(x, z) : 0
      pos[k * 3 + 2] = z
      nor[k * 3 + 1] = 1
      uv[k * 2] = (x + HALF) / POOL
      uv[k * 2 + 1] = (z + HALF) / POOL
    }
  }
  const idx = new Uint32Array((n - 1) * (n - 1) * 6)
  let o = 0
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i
      const b = a + 1
      const c = a + n
      const d = c + 1
      idx[o++] = a; idx[o++] = c; idx[o++] = b
      idx[o++] = b; idx[o++] = c; idx[o++] = d
    }
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(new THREE.BufferAttribute(idx, 1))
  return g
}

function haloTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

const FLOOR_VERT = `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

const FLOOR_FRAG = `
uniform sampler2D uLight;
uniform vec3 uSunCol;
uniform float uStrength;
uniform vec3 uAmb;
uniform vec3 uWater;
uniform float uDusk;
uniform vec4 uLamps[7];
uniform vec3 uLampCol[7];
varying vec2 vUv;
varying vec3 vWorld;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  float depth = -vWorld.y;
  vec3 alb = depth < 1.25 ? vec3(0.86, 0.69, 0.46) : depth < 2.0 ? vec3(0.6, 0.62, 0.45) : vec3(0.47, 0.5, 0.5);
  vec2 g = vWorld.xz * 1.3;
  vec2 f = fract(g);
  vec2 id = floor(g);
  float joint = smoothstep(0.0, 0.05, f.x) * smoothstep(0.0, 0.05, f.y) * smoothstep(1.0, 0.95, f.x) * smoothstep(1.0, 0.95, f.y);
  alb *= mix(0.6, 1.0, joint) * (0.84 + 0.16 * hash(id));
  float L = texture2D(uLight, vUv).r * ${LIGHT_SCALE.toFixed(1)};
  float Lc = L * L * 0.62; // caustics read as lines, not haze
  vec3 col = alb * (uAmb + uSunCol * uStrength * Lc * 0.62);
  col += uSunCol * uStrength * pow(max(L - 1.8, 0.0) / 4.0, 1.3) * 0.45;
  for (int i = 0; i < 7; i++) {
    float d = distance(vWorld.xz, uLamps[i].xy);
    col += uLampCol[i] * uLamps[i].z * exp(-d * d * 0.9) * (0.35 + 0.75 * uDusk);
  }
  col = mix(col, uWater * (uAmb * 1.6 + 0.12), smoothstep(0.5, 3.4, depth) * 0.5);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

const WATER_VERT = `
attribute float aDepth;
varying vec3 vNormalW;
varying vec3 vWorld;
varying float vDepth;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vDepth = aDepth;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

const WATER_FRAG = `
uniform sampler2D uMask;
uniform vec3 uSun;
uniform vec3 uSunCol;
uniform float uStrength;
uniform vec3 uSky;
uniform vec3 uHorizon;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform float uDusk;
varying vec3 vNormalW;
varying vec3 vWorld;
varying float vDepth;
void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 R = reflect(-V, N);
  vec3 sky = mix(uHorizon, uSky, clamp(R.y, 0.0, 1.0));
  float lit = texture2D(uMask, (vWorld.xz + ${HALF.toFixed(1)}) / ${POOL.toFixed(1)}).r;
  vec3 H = normalize(uSun + V);
  float spec = pow(max(dot(N, H), 0.0), 3000.0) * lit * uStrength * 1.6;
  float deep = smoothstep(0.8, 2.6, vDepth);
  vec3 body = mix(uShallow, uDeep, deep) * mix(0.55, 1.0, lit * (1.0 - uDusk * 0.8));
  vec3 col = mix(body, sky, fres * 0.45) + spec * uSunCol;
  float alpha = clamp(mix(0.22, 0.58, deep) + fres * 0.35 + spec, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

const RING_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const RING_FRAG = `
uniform float uProgress;
uniform vec3 uColor;
uniform float uAlpha;
varying vec2 vUv;
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float a = atan(p.x, -p.y) / 6.28318 + 0.5;
  float band = smoothstep(0.78, 0.82, r) * smoothstep(1.0, 0.95, r);
  float filled = step(a, uProgress);
  float tick = smoothstep(0.03, 0.0, abs(fract(a * 12.0) - 0.5) - 0.47);
  float alpha = band * mix(0.22 + tick * 0.2, 0.95, filled) * uAlpha;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(uColor * (0.6 + filled * 0.8), alpha);
}`

export default function StepwellLens() {
  const mountRef = useRef(null)
  const gameRef = useRef(freshDay())
  const apiRef = useRef({})
  const audioRef = useRef(null)
  const tagRefs = useRef([])
  const potTagRefs = useRef([])
  const selRef = useRef({ pot: 1, clutch: null, follow: true, hang: null })
  const viewRef = useRef('steps')
  const mutedRef = useRef(false)
  const reducedRef = useRef(false)

  const [phase, setPhase] = useState('intro')
  const [hud, setHud] = useState(() => snapshot(gameRef.current))
  const [selPot, setSelPot] = useState(1)
  const [selClutch, setSelClutch] = useState(null)
  const [hang, setHang] = useState(null)
  const [view, setView] = useState('steps')
  const [muted, setMuted] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [toast, setToast] = useState(null)
  const [days, setDays] = useState(readDays)
  const [cardHidden, setCardHidden] = useState(false)

  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => { setReduced(q.matches); reducedRef.current = q.matches }
    on()
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])
  useEffect(() => { viewRef.current = view }, [view])

  const say = useCallback((text, tone = 'plain') => {
    setToast({ text, tone, id: Math.random() })
  }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5200)
    return () => clearTimeout(t)
  }, [toast])

  // ── the scene ──────────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current
    const G = gameRef.current
    const small = Math.min(window.innerWidth, window.innerHeight) < 600
    const optics = createOptics({ rays: small ? 2 : 3 })
    const disposables = []
    const track = x => { disposables.push(x); return x }

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.setAttribute('aria-hidden', 'true')
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const skyDay = new THREE.Color('#9fc4dc')
    const skyDusk = new THREE.Color('#2a2440')
    scene.background = skyDay.clone()
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 400)
    const target = new THREE.Vector3(0, -0.6, -0.5)
    const portraitStart = window.innerWidth / Math.max(1, window.innerHeight) < 0.62
    const orbit = { az: 0, el: portraitStart ? 72 : VIEWS.steps.el, elGoal: portraitStart ? 72 : VIEWS.steps.el, dist: 20, sway: 0 }

    const hemi = new THREE.HemisphereLight('#cfe3f2', '#8a6239', 0.75)
    scene.add(hemi)
    const sunLight = new THREE.DirectionalLight('#fff0d2', 2.6)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048)
    Object.assign(sunLight.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 90 })
    sunLight.shadow.bias = -0.0006
    sunLight.shadow.normalBias = 0.03
    scene.add(sunLight, sunLight.target)

    // ── architecture: twelve tiers of sandstone, stair flights, pavilions
    const boxGeo = track(new THREE.BoxGeometry(1, 1, 1))
    const stoneMat = track(new THREE.MeshStandardMaterial({ roughness: 0.93, metalness: 0 }))
    stoneMat.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vSW;')
        .replace('#include <project_vertex>', '#include <project_vertex>\n  vSW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vSW;')
        .replace('#include <color_fragment>', `#include <color_fragment>
  float course = fract(vSW.y * 2.0 + 0.02);
  float row = floor(vSW.y * 2.0);
  float along = fract((vSW.x + vSW.z) * 0.9 + row * 0.5);
  float joint = min(smoothstep(0.0, 0.045, course), smoothstep(0.0, 0.03, along));
  float strata = 0.9 + 0.1 * sin(vSW.y * 23.0 + sin(vSW.x * 1.7 + vSW.z * 1.3) * 2.0);
  diffuseColor.rgb *= strata * mix(0.68, 1.0, joint);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.27, 0.16), smoothstep(0.7, 0.0, vSW.y) * 0.75);`)
    }
    const boxes = []
    const addBox = (x, y, z, sx, sy, sz, color) => boxes.push({ x, y, z, sx, sy, sz, color })
    const sandTop = new THREE.Color('#e1b27a')
    const sandLow = new THREE.Color('#a8784a')
    for (let k = 0; k < TIERS; k++) {
      const s = HALF + k * TIER_RUN
      const outer = s + TIER_RUN
      const top = (k + 1) * TIER_RISE
      const bottom = -3.2
      const h = top - bottom
      const cy = (top + bottom) / 2
      const col = sandLow.clone().lerp(sandTop, k / (TIERS - 1))
      addBox(0, cy, -(s + TIER_RUN / 2), outer * 2, h, TIER_RUN, col)
      addBox(0, cy, s + TIER_RUN / 2, outer * 2, h, TIER_RUN, col)
      addBox(-(s + TIER_RUN / 2), cy, 0, TIER_RUN, h, s * 2, col)
      addBox(s + TIER_RUN / 2, cy, 0, TIER_RUN, h, s * 2, col)
      // zig-zag stair flights on the north, east and west faces, mirrored
      if (k < TIERS - 1) {
        const stepCol = col.clone().multiplyScalar(1.08)
        for (const wall of ['n', 'e', 'w']) {
          for (const mirror of [-1, 1]) {
            const dir = (k % 2 ? 1 : -1) * mirror
            const a0 = mirror * (s * 0.42)
            const off = s + TIER_RUN * 0.55
            for (let n = 0; n < 4; n++) {
              const sh = (n + 1) * TIER_RISE / 4
              const along = a0 + dir * n * 0.36
              if (wall === 'n') addBox(along, top + sh / 2, -off, 0.36, sh, TIER_RUN * 0.8, stepCol)
              else addBox(wall === 'e' ? off : -off, top + sh / 2, along, TIER_RUN * 0.8, sh, 0.36, stepCol)
            }
          }
        }
      }
    }
    const groundCol = new THREE.Color('#d4a874')
    const G0 = RIM_OUT
    addBox(0, RIM - 1.5, -(G0 + 20), (G0 + 40) * 2, 3, 40, groundCol)
    addBox(0, RIM - 1.5, G0 + 20, (G0 + 40) * 2, 3, 40, groundCol)
    addBox(-(G0 + 20), RIM - 1.5, 0, 40, 3, G0 * 2, groundCol)
    addBox(G0 + 20, RIM - 1.5, 0, 40, 3, G0 * 2, groundCol)
    // corner pavilions
    const pav = new THREE.Color('#c99a66')
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const cx = sx * (G0 + 1.7)
        const cz = sz * (G0 + 1.7)
        for (const ox of [-0.9, 0.9]) for (const oz of [-0.9, 0.9]) addBox(cx + ox, RIM + 1.2, cz + oz, 0.26, 2.4, 0.26, pav)
        addBox(cx, RIM + 2.5, cz, 2.5, 0.22, 2.5, pav)
      }
    }
    const stone = new THREE.InstancedMesh(boxGeo, stoneMat, boxes.length)
    const m4 = new THREE.Matrix4()
    boxes.forEach((b, i) => {
      m4.compose(new THREE.Vector3(b.x, b.y, b.z), new THREE.Quaternion(), new THREE.Vector3(b.sx, b.sy, b.sz))
      stone.setMatrixAt(i, m4)
      stone.setColorAt(i, b.color)
    })
    stone.castShadow = true
    stone.receiveShadow = true
    scene.add(stone)
    const domeGeo = track(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2))
    const domeMat = track(new THREE.MeshStandardMaterial({ color: '#d7a874', roughness: 0.85 }))
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const d = new THREE.Mesh(domeGeo, domeMat)
        d.position.set(sx * (G0 + 1.7), RIM + 2.6, sz * (G0 + 1.7))
        d.scale.set(1.05, 0.9, 1.05)
        d.castShadow = true
        scene.add(d)
      }
    }

    // ── the floor and its caustics
    const lightData = new Uint8Array(N * N)
    const lightTex = track(new THREE.DataTexture(lightData, N, N, THREE.RedFormat, THREE.UnsignedByteType))
    lightTex.magFilter = THREE.LinearFilter
    lightTex.minFilter = THREE.LinearFilter
    lightTex.needsUpdate = true
    const display = new Float32Array(N * N)
    const maskData = new Uint8Array(MASK_N * MASK_N)
    const maskTex = track(new THREE.DataTexture(maskData, MASK_N, MASK_N, THREE.RedFormat, THREE.UnsignedByteType))
    maskTex.magFilter = THREE.LinearFilter
    maskTex.minFilter = THREE.LinearFilter
    maskTex.needsUpdate = true

    const lampUniform = Array.from({ length: 7 }, () => new THREE.Vector4(0, 0, 0, 0))
    const lampColUniform = G.clutches.map(c => new THREE.Color(TERRACE_HEX[c.terrace]))
    const floorGeo = track(gridGeometry(161, POOL, (x, z) => -depthAt(x, z)))
    const floorMat = track(new THREE.ShaderMaterial({
      vertexShader: FLOOR_VERT,
      fragmentShader: FLOOR_FRAG,
      uniforms: {
        uLight: { value: lightTex },
        uSunCol: { value: new THREE.Color('#fff1d6') },
        uStrength: { value: 1 },
        uAmb: { value: new THREE.Color('#5e6f78') },
        uWater: { value: new THREE.Color('#0f5560') },
        uDusk: { value: 0 },
        uLamps: { value: lampUniform },
        uLampCol: { value: lampColUniform }
      }
    }))
    const floor = new THREE.Mesh(floorGeo, floorMat)
    scene.add(floor)

    // ── the water surface, driven by the simulation every frame
    const waterGeo = track(gridGeometry(N, POOL - DX))
    const depthAttr = new Float32Array(N * N)
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) depthAttr[j * N + i] = depthAt(-HALF + (i + 0.5) * DX, -HALF + (j + 0.5) * DX)
    waterGeo.setAttribute('aDepth', new THREE.BufferAttribute(depthAttr, 1))
    const waterMat = track(new THREE.ShaderMaterial({
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
      transparent: true,
      uniforms: {
        uMask: { value: maskTex },
        uSun: { value: new THREE.Vector3(0, 1, 0) },
        uSunCol: { value: new THREE.Color('#fff1d6') },
        uStrength: { value: 1 },
        uSky: { value: new THREE.Color('#7fb2d6') },
        uHorizon: { value: new THREE.Color('#e8dcc4') },
        uShallow: { value: new THREE.Color('#3aa59a') },
        uDeep: { value: new THREE.Color('#0d4f63') },
        uDusk: { value: 0 }
      }
    }))
    const water = new THREE.Mesh(waterGeo, waterMat)
    water.renderOrder = 2
    scene.add(water)
    const wPos = waterGeo.attributes.position.array
    const wNor = waterGeo.attributes.normal.array

    // ── clutches: glass eggs, a progress ring, a halo, the lens above them
    const halo = track(haloTexture())
    const eggGeo = track(new THREE.SphereGeometry(1, 14, 10))
    const eggMat = track(new THREE.MeshStandardMaterial({ roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.92 }))
    const EGGS = 9
    const eggs = new THREE.InstancedMesh(eggGeo, eggMat, G.clutches.length * EGGS)
    eggs.castShadow = false
    eggs.receiveShadow = true
    scene.add(eggs)
    const eggLayout = []
    G.clutches.forEach((c, ci) => {
      const d = TERRACES[c.terrace].depth
      for (let e = 0; e < EGGS; e++) {
        const a = e / EGGS * Math.PI * 2 + ci
        const r = e === 0 ? 0 : 0.13 + (e % 2) * 0.1
        const s = 0.085 + ((e * 7 + ci * 3) % 5) * 0.008
        eggLayout.push({ x: c.x + Math.cos(a) * r, y: -d + s * 0.8, z: c.z + Math.sin(a) * r, s })
      }
    })
    const eggColor = new THREE.Color()
    const clutchViews = G.clutches.map(c => {
      const d = TERRACES[c.terrace].depth
      const col = new THREE.Color(TERRACE_HEX[c.terrace])
      const ringMat = track(new THREE.ShaderMaterial({
        vertexShader: RING_VERT,
        fragmentShader: RING_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: { uProgress: { value: 0 }, uColor: { value: col.clone() }, uAlpha: { value: 1 } }
      }))
      const ring = new THREE.Mesh(track(new THREE.PlaneGeometry(1.25, 1.25)), ringMat)
      ring.rotation.x = -Math.PI / 2
      ring.position.set(c.x, -d + 0.03, c.z)
      ring.renderOrder = 1
      scene.add(ring)
      const glow = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: halo, color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })))
      glow.position.set(c.x, -d + 0.2, c.z)
      glow.scale.setScalar(1.4)
      glow.renderOrder = 1
      scene.add(glow)
      const lensMat = track(new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }))
      const lens = new THREE.Mesh(track(new THREE.RingGeometry(0.17, 0.25, 28)), lensMat)
      lens.rotation.x = -Math.PI / 2
      lens.renderOrder = 4
      scene.add(lens)
      const pathGeo = track(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]))
      const pathMat = track(new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false }))
      const path = new THREE.Line(pathGeo, pathMat)
      path.renderOrder = 1
      scene.add(path)
      return { ring, ringMat, glow, lens, lensMat, path, pathGeo, col, depth: d, flash: 0 }
    })

    // the selected clutch's light cone: where the lens above it converges
    const coneMat = track(new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))
    const cone = new THREE.Mesh(track(new THREE.ConeGeometry(0.5, 1, 32, 1, true)), coneMat)
    cone.renderOrder = 1
    scene.add(cone)
    const apex = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: halo, color: '#fff6d8', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })))
    apex.renderOrder = 1
    scene.add(apex)

    // ── lamp-eels
    const EELS_PER = 5
    const eelGeo = track(new THREE.CapsuleGeometry(0.05, 0.38, 4, 8))
    const eelMat = track(new THREE.MeshBasicMaterial({ toneMapped: false }))
    const eels = new THREE.InstancedMesh(eelGeo, eelMat, G.clutches.length * EELS_PER)
    eels.frustumCulled = false
    scene.add(eels)
    const eelSeeds = Array.from({ length: G.clutches.length * EELS_PER }, (_, i) => ({ a: i * 2.39, r: 0.5 + (i % 4) * 0.35, sp: 0.35 + (i % 3) * 0.12, lift: 0.3 + (i % 5) * 0.12 }))
    const eelColor = new THREE.Color()
    // a soft glow riding on each lamp-eel
    const glowPos = new Float32Array(eelSeeds.length * 3)
    const glowCol = new Float32Array(eelSeeds.length * 3)
    const glowGeo = track(new THREE.BufferGeometry())
    glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3))
    glowGeo.setAttribute('color', new THREE.BufferAttribute(glowCol, 3))
    const glowMat = track(new THREE.PointsMaterial({ map: halo, size: 0.9, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.7 }))
    const eelGlow = new THREE.Points(glowGeo, glowMat)
    eelGlow.frustumCulled = false
    eelGlow.renderOrder = 1
    scene.add(eelGlow)
    const qEel = new THREE.Quaternion()
    const yAxis = new THREE.Vector3(0, 1, 0)

    // ── drip pots on ropes
    const potProfile = [[0.02, 0], [0.16, 0.02], [0.3, 0.12], [0.38, 0.3], [0.35, 0.47], [0.22, 0.58], [0.19, 0.66], [0.25, 0.71], [0.22, 0.73]].map(([r, y]) => new THREE.Vector2(r, y))
    const potGeo = track(new THREE.LatheGeometry(potProfile, 24))
    const potMats = [0, 1, 2].map(() => track(new THREE.MeshStandardMaterial({ color: '#b65d36', roughness: 0.78, emissive: '#000000' })))
    const ropeMat = track(new THREE.LineBasicMaterial({ color: '#4a3a2a', transparent: true, opacity: 0.75 }))
    const markMats = [0, 1, 2].map(() => track(new THREE.MeshBasicMaterial({ color: '#ffe2b0', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide })))
    const pots = G.pots.map((p, n) => {
      const mesh = new THREE.Mesh(potGeo, potMats[n])
      mesh.castShadow = true
      scene.add(mesh)
      const ropeGeo = track(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]))
      const rope = new THREE.Line(ropeGeo, ropeMat)
      scene.add(rope)
      const mark = new THREE.Mesh(track(new THREE.RingGeometry(0.3, 0.38, 32)), markMats[n])
      mark.rotation.x = -Math.PI / 2
      mark.renderOrder = 4
      scene.add(mark)
      return { mesh, rope, ropeGeo, mark, shown: new THREE.Vector3(p.x, POT_Y, p.z), arrive: 0 }
    })
    const restSpot = n => new THREE.Vector3((n - 1) * 1.4, RIM + 0.02, -(RIM_OUT + 0.9))
    const dropGeo = track(new THREE.SphereGeometry(0.045, 8, 6))
    const dropMat = track(new THREE.MeshStandardMaterial({ color: '#cfeaf0', roughness: 0.05, transparent: true, opacity: 0.85 }))
    const drops = Array.from({ length: 16 }, () => {
      const m = new THREE.Mesh(dropGeo, dropMat)
      m.visible = false
      scene.add(m)
      return { m, t: -1, x: 0, z: 0 }
    })
    let dropNext = 0

    // guide rings: where the selected pot's ripples focus on each floor
    const guideMats = TERRACES.map(t => track(new THREE.LineDashedMaterial({ color: t.color, dashSize: 0.22, gapSize: 0.14, transparent: true, opacity: 0.85, depthWrite: false })))
    const guides = TERRACES.map((t, i) => {
      const geo = new THREE.BufferGeometry()
      const line = new THREE.LineSegments(geo, guideMats[i])
      line.renderOrder = 5
      scene.add(line)
      return { line, geo }
    })
    let guideKey = ''
    const rebuildGuides = () => {
      const p = G.pots.find(q => q.id === selRef.current.pot)
      const show = p && p.unlocked && p.hung && G.phase !== 'dusk'
      const key = show ? `${p.id}:${p.x.toFixed(2)}:${p.z.toFixed(2)}:${p.tempo}:${G.slant.toFixed(2)}` : 'none'
      if (key === guideKey) return
      guideKey = key
      const rings = show ? focusRings(p.tempo, G.slant) : [0, 0, 0]
      guides.forEach((g, i) => {
        const pts = []
        if (show) {
          const segs = 96
          for (let s = 0; s < segs; s++) {
            const a0 = s / segs * Math.PI * 2
            const a1 = (s + 1) / segs * Math.PI * 2
            const x0 = p.x + Math.cos(a0) * rings[i]
            const z0 = p.z + Math.sin(a0) * rings[i]
            const x1 = p.x + Math.cos(a1) * rings[i]
            const z1 = p.z + Math.sin(a1) * rings[i]
            if (Math.max(Math.abs(x0), Math.abs(z0), Math.abs(x1), Math.abs(z1)) > HALF) continue
            pts.push(new THREE.Vector3(x0, 0.05, z0), new THREE.Vector3(x1, 0.05, z1))
          }
        }
        g.geo.dispose()
        g.geo = new THREE.BufferGeometry().setFromPoints(pts)
        g.line.geometry = g.geo
        if (pts.length) g.line.computeLineDistances()
      })
    }

    // the paw's own rings: where a dip here would focus on each floor
    const pawPreview = TERRACES.map((t, i) => {
      const geo = track(new THREE.RingGeometry(0.97, 1, 64))
      const mat = track(new THREE.MeshBasicMaterial({ color: t.color, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }))
      const m = new THREE.Mesh(geo, mat)
      m.rotation.x = -Math.PI / 2
      m.renderOrder = 5
      m.visible = false
      scene.add(m)
      return m
    })

    // ── the void cat, on the north rim, and its paw
    const catMat = track(new THREE.MeshStandardMaterial({ color: '#111014', roughness: 0.55 }))
    const eyeMat = track(new THREE.MeshBasicMaterial({ color: '#ffc44d', toneMapped: false }))
    const sphere = track(new THREE.SphereGeometry(1, 18, 12))
    const coneGeo = track(new THREE.ConeGeometry(1, 1, 4))
    const cat = new THREE.Group()
    const body = new THREE.Mesh(sphere, catMat)
    body.scale.set(0.55, 0.62, 0.8)
    body.position.set(0, 0.6, 0)
    const head = new THREE.Group()
    head.position.set(0, 1.22, 0.42)
    const skull = new THREE.Mesh(sphere, catMat)
    skull.scale.setScalar(0.36)
    head.add(skull)
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(coneGeo, catMat)
      ear.scale.set(0.14, 0.3, 0.12)
      ear.position.set(s * 0.19, 0.33, -0.02)
      ear.rotation.z = -s * 0.25
      head.add(ear)
      const eye = new THREE.Mesh(sphere, eyeMat)
      eye.scale.set(0.06, 0.045, 0.03)
      eye.position.set(s * 0.13, 0.04, 0.32)
      head.add(eye)
    }
    cat.add(body, head)
    const tail = Array.from({ length: 7 }, (_, i) => {
      const seg = new THREE.Mesh(sphere, catMat)
      seg.scale.setScalar(0.1 - i * 0.006)
      cat.add(seg)
      return seg
    })
    cat.traverse(o => { if (o.isMesh) o.castShadow = true })
    cat.scale.setScalar(0.95)
    cat.position.set(0.5, 3 * TIER_RISE, -(HALF + 2 * TIER_RUN + TIER_RUN * 0.5))
    cat.rotation.y = -1.1 // side-on to the steps, so its ears and tail read from above
    scene.add(cat)
    const pawGroup = new THREE.Group()
    const leg = new THREE.Mesh(track(new THREE.CylinderGeometry(0.3, 0.42, 6, 16)), catMat)
    leg.position.y = 3.15
    pawGroup.add(leg)
    const pad = new THREE.Mesh(sphere, catMat)
    pad.scale.set(0.42, 0.3, 0.46)
    pad.position.y = 0.12
    pawGroup.add(pad)
    for (let t = 0; t < 4; t++) {
      const toe = new THREE.Mesh(sphere, catMat)
      toe.scale.set(0.14, 0.13, 0.15)
      toe.position.set(-0.27 + t * 0.18, 0.02, -0.36 + Math.abs(t - 1.5) * 0.07)
      pawGroup.add(toe)
    }
    pawGroup.visible = false
    scene.add(pawGroup)
    const pawAnim = { t: -1, x: 0, z: 0 }

    // ── sizing and camera
    let width = 1
    let height = 1
    const resize = () => {
      width = mount.clientWidth || 1
      height = mount.clientHeight || 1
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.fov = camera.aspect < 0.62 ? 62 : camera.aspect < 1.05 ? 56 : 46
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(mount)
    resize()

    const placeCamera = () => {
      const el = THREE.MathUtils.degToRad(orbit.el)
      const az = THREE.MathUtils.degToRad(orbit.az + orbit.sway)
      const vFov = THREE.MathUtils.degToRad(camera.fov)
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)
      const portrait = camera.aspect < 0.75
      const needW = portrait ? 6.7 : 7.4
      const needH = 7.4 * (0.55 + 0.45 * Math.sin(el))
      const dist = Math.max(needW / Math.tan(hFov / 2), needH / Math.tan(vFov / 2)) * (viewRef.current === 'close' ? 0.68 : 1)
      orbit.dist = dist
      const inside = RIM_OUT - 2.2
      if (dist * Math.cos(el) > inside) {
        const elMin = Math.acos(inside / dist)
        if (elMin > el) return placeAt(elMin, az, dist)
      }
      placeAt(el, az, dist)
    }
    const placeAt = (el, az, dist) => {
      camera.position.set(
        target.x + Math.sin(az) * Math.cos(el) * dist,
        target.y + Math.sin(el) * dist,
        target.z + Math.cos(az) * Math.cos(el) * dist
      )
      camera.lookAt(target)
    }

    // ── interaction
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const hit = new THREE.Vector3()
    const tmp = new THREE.Vector3()
    const waterPoint = (cx, cy) => {
      const r = renderer.domElement.getBoundingClientRect()
      ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      if (!raycaster.ray.intersectPlane(waterPlane, hit)) return null
      return { x: hit.x, z: hit.z, inside: Math.abs(hit.x) < HALF && Math.abs(hit.z) < HALF }
    }
    const screenOf = (x, y, z) => {
      tmp.set(x, y, z).project(camera)
      return { x: (tmp.x + 1) / 2 * width, y: (1 - tmp.y) / 2 * height, behind: tmp.z > 1 }
    }
    const potUnder = (cx, cy) => {
      const r = renderer.domElement.getBoundingClientRect()
      const px = cx - r.left
      const py = cy - r.top
      let best = null
      let bestD = 44
      for (const p of G.pots) {
        if (!p.unlocked || !p.hung) continue
        for (const y of [0, POT_Y + 0.35]) {
          const s = screenOf(p.x, y, p.z)
          const d = Math.hypot(s.x - px, s.y - py)
          if (d < bestD) { bestD = d; best = p }
        }
      }
      return best
    }
    let drag = null
    const hover = { x: null, z: null }
    const onDown = e => {
      if (e.button !== undefined && e.button !== 0) return
      audioRef.current?.resume()
      const sel = selRef.current
      const wp = waterPoint(e.clientX, e.clientY)
      if (sel.hang && wp?.inside && G.phase !== 'dusk') {
        movePot(G, sel.hang, wp.x, wp.z)
        apiRef.current.placed?.(sel.hang)
        drag = { kind: 'pot', id: sel.hang, x0: e.clientX, y0: e.clientY, ox: 0, oz: 0 }
        renderer.domElement.setPointerCapture(e.pointerId)
        return
      }
      const p = G.phase !== 'dusk' ? potUnder(e.clientX, e.clientY) : null
      if (p) {
        // keep the grab point under the pointer instead of snapping the pot to it
        drag = { kind: 'pot', id: p.id, x0: e.clientX, y0: e.clientY, ox: wp ? p.x - wp.x : 0, oz: wp ? p.z - wp.z : 0 }
        apiRef.current.selectPot?.(p.id)
      } else if (wp?.inside) {
        drag = { kind: 'tap', x0: e.clientX, y0: e.clientY, wp, az0: orbit.az, el0: orbit.el, touch: e.pointerType !== 'mouse' }
      } else {
        drag = { kind: 'orbit', x0: e.clientX, y0: e.clientY, az0: orbit.az, el0: orbit.el }
      }
      renderer.domElement.setPointerCapture(e.pointerId)
    }
    const onMove = e => {
      const wp = waterPoint(e.clientX, e.clientY)
      if (wp?.inside) { hover.x = wp.x; hover.z = wp.z } else { hover.x = null; hover.z = null }
      if (!drag) return
      const moved = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0)
      if (drag.kind === 'pot') {
        if (wp) movePot(G, drag.id, wp.x + drag.ox, wp.z + drag.oz)
      } else if (drag.kind === 'tap' && drag.touch) {
        // aim: slide the finger; lifting it outside the pool cancels the dip
        if (wp?.inside) drag.wp = wp
        else drag.kind = 'cancelled'
      } else if (drag.kind === 'tap' && moved > 12) {
        drag.kind = 'orbit'
      }
      if (drag.kind === 'orbit') {
        orbit.az = Math.max(-75, Math.min(75, drag.az0 - (e.clientX - drag.x0) * 0.25))
        orbit.el = orbit.elGoal = Math.max(30, Math.min(86, drag.el0 + (e.clientY - drag.y0) * 0.2))
      }
    }
    const onUp = e => {
      if (drag?.kind === 'tap' && G.phase !== 'dusk') {
        if (G.phase === 'intro') apiRef.current.start?.()
        else if (paw(G, optics, drag.wp.x, drag.wp.z)) apiRef.current.pawed?.()
      }
      drag = null
      if (renderer.domElement.hasPointerCapture?.(e.pointerId)) renderer.domElement.releasePointerCapture(e.pointerId)
    }
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointermove', onMove)
    renderer.domElement.addEventListener('pointerup', onUp)
    const onCancel = e => {
      drag = null
      if (renderer.domElement.hasPointerCapture?.(e.pointerId)) renderer.domElement.releasePointerCapture(e.pointerId)
    }
    const onLeave = () => { hover.x = null; hover.z = null }
    renderer.domElement.addEventListener('pointercancel', onCancel)
    renderer.domElement.addEventListener('pointerleave', onLeave)

    apiRef.current.pawAt = (x, z) => paw(G, optics, x, z)
    apiRef.current.hover = hover
    apiRef.current.nudgeView = (dx, dy) => {
      orbit.az = Math.max(-75, Math.min(75, orbit.az + dx))
      orbit.el = orbit.elGoal = Math.max(30, Math.min(86, orbit.el + dy))
    }
    apiRef.current.setView = v => { orbit.elGoal = v === 'steps' && camera.aspect < 0.62 ? 72 : VIEWS[v].el; orbit.az = 0 }
    apiRef.current.camAz = () => orbit.az

    // ── the loop
    let raf = 0
    let last = performance.now()
    let lastCaustic = 0
    let lastHud = 0
    let maskSeen = -1
    let wasCloud = 0
    const litBefore = G.clutches.map(() => 0)
    const sunVec = new THREE.Vector3()
    const coneDir = new THREE.Vector3()
    const coneQ = new THREE.Quaternion()
    const cDay = new THREE.Color('#fff0d2')
    const cLow = new THREE.Color('#ffb36b')
    const cDusk = new THREE.Color('#ff8a5c')
    let duskMix = 0
    let cooT = 6
    const C = {
      hemiDay: new THREE.Color('#cfe3f2'), hemiDusk: new THREE.Color('#5a5a9a'), cloudSky: new THREE.Color('#b8c2c8'),
      ambDay: new THREE.Color('#5e6f78'), ambDusk: new THREE.Color('#1c2034'),
      skyDay: new THREE.Color('#7fb2d6'), skyDusk: new THREE.Color('#2b2a52'), horDay: new THREE.Color('#e8dcc4'), horDusk: new THREE.Color('#6a4a6a'),
      hatched: new THREE.Color('#5d5a50'), glass: new THREE.Color('#e9f2ee'), potDusk: new THREE.Color('#5a2a14')
    }
    apiRef.current.reset = () => {
      optics.reset()
      guideKey = ''
      eelSeeds.forEach(s => { s.born = undefined })
      pots.forEach((v, n) => { v.arrive = 0; v.shown.set(G.pots[n].x, POT_Y, G.pots[n].z) })
      clutchViews.forEach(v => { v.flash = 0 })
      drops.forEach(d => { d.t = -1 })
      pawAnim.t = -1
      hover.x = null
      hover.z = null
      display.fill(0)
      litBefore.fill(0)
      duskMix = 0
      wasCloud = 0
      maskSeen = -1
    }
    const eggPos = new THREE.Vector3()
    const eggScale = new THREE.Vector3()
    const eelPos = new THREE.Vector3()
    const eelScale = new THREE.Vector3()

    const frame = now => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const reducedMotion = reducedRef.current
      tick(G, optics, dt)

      // events
      for (const ev of G.events) {
        if (ev.type === 'drop') {
          const p = G.pots.find(q => q.id === ev.pot)
          const d = drops[dropNext++ % drops.length]
          d.t = 0
          d.x = p.x
          d.z = p.z
          d.tempo = p.tempo
        } else if (ev.type === 'paw') {
          Object.assign(pawAnim, { t: 0, x: ev.x, z: ev.z })
          audioRef.current?.plop(ev.x / HALF * 0.6)
        } else if (ev.type === 'flare') {
          const ci = G.clutches.findIndex(c => c.id === ev.clutch)
          if (ci >= 0) clutchViews[ci].flash = Math.max(clutchViews[ci].flash, 0.45)
          if (ci >= 0) audioRef.current?.flare?.(G.clutches[ci].terrace)
        } else if (ev.type === 'no-paws') {
          apiRef.current.onNoPaws?.()
        } else if (ev.type === 'hatch') {
          const ci = G.clutches.findIndex(c => c.id === ev.clutch)
          if (ci >= 0) clutchViews[ci].flash = 1
          audioRef.current?.hatch(ev.terrace, G.hatched)
          apiRef.current.onHatch?.(ev)
        } else if (ev.type === 'pot') {
          const v = pots[ev.pot - 1]
          v.arrive = 0.001
          audioRef.current?.potArrives()
          apiRef.current.onPot?.(ev.pot)
        } else if (ev.type === 'dusk') {
          apiRef.current.onDusk?.()
        }
      }
      G.events.length = 0

      // sun, shade and sky
      const minute = G.minute
      const sun = G.sun
      sunVec.set(sun.x, sun.y, sun.z)
      sunLight.position.copy(sunVec).multiplyScalar(40)
      sunLight.target.position.set(0, 0, 0)
      const late = THREE.MathUtils.smoothstep(minute, 15 * 60, DAY_END)
      const duskGoal = G.phase === 'dusk' ? 1 : late * 0.6
      duskMix += (duskGoal - duskMix) * Math.min(1, dt * (G.phase === 'dusk' ? 0.5 : 2))
      sunLight.intensity = 2.6 * G.strength * (1 - duskMix)
      sunLight.color.copy(cDay).lerp(cLow, THREE.MathUtils.clamp(1 - (sun.elevation - 0.45) / 0.5, 0, 1)).lerp(cDusk, duskMix)
      hemi.intensity = 0.75 * (1 - duskMix * 0.55) + 0.12 * G.cloud
      hemi.color.copy(C.hemiDay).lerp(C.hemiDusk, duskMix)
      scene.background.copy(skyDay).lerp(C.cloudSky, G.cloud * 0.6).lerp(skyDusk, duskMix)
      floorMat.uniforms.uStrength.value = G.strength * (1 - duskMix)
      floorMat.uniforms.uSunCol.value.copy(sunLight.color)
      floorMat.uniforms.uAmb.value.copy(C.ambDay).lerp(C.ambDusk, duskMix)
      floorMat.uniforms.uDusk.value = duskMix
      waterMat.uniforms.uSun.value.copy(sunVec)
      waterMat.uniforms.uSunCol.value.copy(sunLight.color)
      waterMat.uniforms.uStrength.value = G.strength * (1 - duskMix)
      waterMat.uniforms.uDusk.value = duskMix
      waterMat.uniforms.uSky.value.copy(C.skyDay).lerp(C.skyDusk, duskMix)
      waterMat.uniforms.uHorizon.value.copy(C.horDay).lerp(C.horDusk, duskMix)
      if (G.maskMinute !== maskSeen && G.mask) {
        maskSeen = G.maskMinute
        for (let i = 0; i < maskData.length; i++) maskData[i] = G.mask[i] * 255
        maskTex.needsUpdate = true
      }
      if (G.phase === 'day') {
        if (G.cloud > 0.3 && wasCloud <= 0.3) apiRef.current.onCloud?.(true)
        if (G.cloud <= 0.3 && wasCloud > 0.3) apiRef.current.onCloud?.(false)
        G.clutches.forEach((c, i) => {
          if (c.state === 'dormant' && litBefore[i] && !c.lit) apiRef.current.onShade?.(c, false)
          if (c.state === 'dormant' && !litBefore[i] && c.lit) apiRef.current.onShade?.(c, true)
          litBefore[i] = c.lit
        })
      }
      wasCloud = G.cloud
      if (G.phase === 'day' && G.minute > 13 * 60 + 30 && G.slant > 1.12 && !G.slantTold) { G.slantTold = true; apiRef.current.onSlant?.() }
      audioRef.current?.setWind?.(Math.max(G.cloud, duskMix))
      cooT -= dt
      if (cooT < 0) { cooT = 9 + Math.random() * 14; if (G.phase === 'day') audioRef.current?.coo() }

      // caustics, 30 times a second
      if (now - lastCaustic > (small ? 48 : 33) && G.mask) {
        lastCaustic = now
        optics.breeze(now / 1000 * (reducedMotion ? 0.35 : 1), 0.9 + G.cloud * 0.5 + duskMix * 0.4)
        const L = optics.caustics(G.sun, G.mask)
        const keep = reducedMotion ? 0.7 : 0.25
        for (let i = 0; i < L.length; i++) {
          display[i] = display[i] * keep + L[i] * (1 - keep)
          lightData[i] = Math.min(255, display[i] * 255 / LIGHT_SCALE)
        }
        lightTex.needsUpdate = true
      }

      // water mesh from the height field (same slope gain the optics use)
      const h = optics.height
      const bx = optics.breezeX
      const bz = optics.breezeZ
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const k = j * N + i
          const l = i > 0 ? h[k - 1] : h[k]
          const r = i < N - 1 ? h[k + 1] : h[k]
          const u = j > 0 ? h[k - N] : h[k]
          const d = j < N - 1 ? h[k + N] : h[k]
          const nx = -((r - l) / (2 * DX) + bx[k]) * SLOPE_GAIN * SHADE_SLOPE
          const nz = -((d - u) / (2 * DX) + bz[k]) * SLOPE_GAIN * SHADE_SLOPE
          const inv = 1 / Math.sqrt(nx * nx + 1 + nz * nz)
          wPos[k * 3 + 1] = h[k] * WATER_VIS
          wNor[k * 3] = nx * inv
          wNor[k * 3 + 1] = inv
          wNor[k * 3 + 2] = nz * inv
        }
      }
      waterGeo.attributes.position.needsUpdate = true
      waterGeo.attributes.normal.needsUpdate = true

      // clutches
      const sel = selRef.current
      const selClutch = G.clutches.find(c => c.id === sel.clutch)
      G.clutches.forEach((c, ci) => {
        const v = clutchViews[ci]
        v.ringMat.uniforms.uProgress.value = c.state === 'hatched' ? 1 : c.progress
        v.ringMat.uniforms.uAlpha.value = c.state === 'hatched' ? 0.5 + 0.5 * (1 - duskMix) : 0.55 + 0.45 * c.lit
        const pulse = reducedMotion ? 0 : Math.sin(now / 160) * 0.08
        const g = c.state === 'hatched' ? 0.55 + duskMix * 0.45 : Math.min(0.9, c.dose * 0.9 + c.progress * 0.25 + (c.dose > 0.12 ? pulse : 0))
        if (v.flash > 0) v.flash = Math.max(0, v.flash - dt * (reducedMotion ? 2.5 : 0.8))
        const bloom = reducedMotion ? 0 : Math.sin((1 - v.flash) * Math.PI) * v.flash
        v.glow.material.opacity = Math.min(1, g + v.flash * 0.8)
        v.glow.scale.setScalar(1.1 + g * 1.4 + (c.state === 'hatched' ? duskMix * 1.6 : 0) + bloom * 6)
        v.ring.scale.setScalar(1 + bloom * 1.6)
        const showLens = G.phase !== 'dusk' && c.state === 'dormant'
        v.lens.visible = showLens
        v.path.visible = showLens
        v.lens.position.set(c.lensX, 0.06, c.lensZ)
        v.lensMat.opacity = (0.35 + 0.6 * c.match) * (0.35 + 0.65 * c.lit)
        v.lens.scale.setScalar(1 + c.match * 0.5)
        const pp = v.pathGeo.attributes.position.array
        pp[0] = c.lensX; pp[1] = 0.04; pp[2] = c.lensZ
        pp[3] = c.x; pp[4] = -v.depth + 0.1; pp[5] = c.z
        v.pathGeo.attributes.position.needsUpdate = true
        v.path.material.opacity = 0.15 + 0.5 * c.match * c.lit
        lampUniform[ci].set(c.x, c.z, c.state === 'hatched' ? 0.5 + duskMix * 1.1 : c.dose * 0.25, 0)
        for (let e = 0; e < EGGS; e++) {
          const L = eggLayout[ci * EGGS + e]
          const s = c.state === 'hatched' ? L.s * 0.7 : L.s * (1 + c.progress * 0.25)
          m4.compose(eggPos.set(L.x, L.y, L.z), qEel.identity(), eggScale.set(s, s * (c.state === 'hatched' ? 0.55 : 1.15), s))
          eggs.setMatrixAt(ci * EGGS + e, m4)
          eggColor.copy(c.state === 'hatched' ? C.hatched : C.glass).lerp(v.col, c.state === 'hatched' ? 0.2 : 0.25 + c.progress * 0.6)
          eggs.setColorAt(ci * EGGS + e, eggColor)
        }
      })
      eggs.instanceMatrix.needsUpdate = true
      if (eggs.instanceColor) eggs.instanceColor.needsUpdate = true

      if (selClutch && selClutch.state === 'dormant' && G.phase !== 'dusk') {
        const depth = TERRACES[selClutch.terrace].depth
        // the refracted path from lens to eggs; the cone's point is its focus
        coneDir.set(selClutch.x - selClutch.lensX, -depth, selClutch.z - selClutch.lensZ).normalize()
        const len = Math.min(selClutch.focal, 4.6)
        coneQ.setFromUnitVectors(yAxis, coneDir)
        cone.quaternion.copy(coneQ)
        cone.scale.set(1, len, 1)
        cone.position.set(selClutch.lensX + coneDir.x * len / 2, coneDir.y * len / 2, selClutch.lensZ + coneDir.z * len / 2)
        cone.visible = true
        coneMat.opacity = (0.08 + 0.2 * selClutch.match) * (0.3 + 0.7 * selClutch.lit) * (0.4 + 0.6 * G.strength)
        apex.visible = selClutch.focal < 4.6
        apex.position.set(selClutch.lensX + coneDir.x * len, coneDir.y * len, selClutch.lensZ + coneDir.z * len)
        apex.scale.setScalar(0.35 + selClutch.match * 0.6)
        apex.material.opacity = 0.35 + 0.6 * selClutch.match
      } else {
        cone.visible = false
        apex.visible = false
      }

      // eels
      const tt = now / 1000
      G.clutches.forEach((c, ci) => {
        for (let e = 0; e < EELS_PER; e++) {
          const idx = ci * EELS_PER + e
          const s = eelSeeds[idx]
          if (c.state !== 'hatched') { m4.makeScale(0, 0, 0); eels.setMatrixAt(idx, m4); glowCol.fill(0, idx * 3, idx * 3 + 3); continue }
          if (s.born === undefined) s.born = tt
          const age = Math.min(1, (tt - s.born) / 3)
          const sp = reducedMotion ? s.sp * 0.4 : s.sp
          const a = s.a + tt * sp
          const r = s.r * (0.3 + 0.7 * age) * (1 + duskMix * 0.8)
          const depth = TERRACES[c.terrace].depth
          let x = c.x + Math.cos(a) * r
          let z = c.z + Math.sin(a * 1.3) * r * 0.8
          x = Math.max(-HALF + 0.2, Math.min(HALF - 0.2, x))
          z = Math.max(-HALF + 0.2, Math.min(HALF - 0.2, z))
          const y = -depth + s.lift + (age < 1 ? 0 : Math.sin(tt * 0.9 + s.a) * 0.15) - 0.1
          const vx = -Math.sin(a) * r * sp
          const vz = Math.cos(a * 1.3) * r * 0.8 * 1.3 * sp
          tmp.set(vx, 0.02, vz).normalize()
          qEel.setFromUnitVectors(yAxis, tmp)
          m4.compose(eelPos.set(x, y, z), qEel, eelScale.setScalar(age))
          eels.setMatrixAt(idx, m4)
          eelColor.set(TERRACE_HEX[c.terrace]).multiplyScalar(1.2 + duskMix * 1.8)
          eels.setColorAt(idx, eelColor)
          glowPos[idx * 3] = x
          glowPos[idx * 3 + 1] = y
          glowPos[idx * 3 + 2] = z
          eelColor.set(TERRACE_HEX[c.terrace]).multiplyScalar(age * (0.35 + duskMix * 0.65))
          glowCol[idx * 3] = eelColor.r
          glowCol[idx * 3 + 1] = eelColor.g
          glowCol[idx * 3 + 2] = eelColor.b
        }
      })
      eels.instanceMatrix.needsUpdate = true
      if (eels.instanceColor) eels.instanceColor.needsUpdate = true
      glowGeo.attributes.position.needsUpdate = true
      glowGeo.attributes.color.needsUpdate = true

      // pots, ropes, drops
      G.pots.forEach((p, n) => {
        const v = pots[n]
        const on = p.unlocked
        v.mesh.visible = on
        v.rope.visible = on && p.hung
        v.mark.visible = on && p.hung && G.phase !== 'dusk'
        if (!on) return
        const goal = p.hung ? tmp.set(p.x, POT_Y, p.z) : restSpot(n)
        const k = reducedMotion ? 1 : Math.min(1, dt * 10)
        v.shown.lerp(goal, k)
        const sway = p.hung && !reducedMotion ? Math.sin(tt * 1.3 + n) * 0.03 : 0
        v.mesh.position.set(v.shown.x + sway, v.shown.y, v.shown.z)
        v.mesh.rotation.z = sway
        const rp = v.ropeGeo.attributes.position.array
        rp[0] = v.mesh.position.x; rp[1] = v.mesh.position.y + 0.72; rp[2] = v.mesh.position.z
        rp[3] = v.shown.x * 0.15; rp[4] = 26; rp[5] = v.shown.z * 0.15 - 4
        v.ropeGeo.attributes.position.needsUpdate = true
        v.mark.position.set(p.x, 0.05, p.z)
        const isSel = sel.pot === p.id
        markMats[n].opacity = isSel ? 0.85 : 0.35
        v.mark.scale.setScalar(isSel ? 1.15 + (reducedMotion ? 0 : Math.sin(tt * 3) * 0.05) : 1)
        potMats[n].emissive.set(isSel && G.phase !== 'dusk' ? '#3a1a08' : '#000000').lerp(C.potDusk, duskMix * 0.6)
        if (v.arrive > 0 && !reducedMotion) {
          v.arrive += dt
          v.mesh.position.y += Math.max(0, 1.2 - v.arrive) * 2
          if (v.arrive > 1.2) v.arrive = 0
        }
      })
      for (const d of drops) {
        if (d.t < 0) { d.m.visible = false; continue }
        d.t += dt
        const fall = d.t / DROP_FALL
        if (fall >= 1) {
          d.t = -1
          d.m.visible = false
          audioRef.current?.drop(d.tempo, d.x / HALF * 0.6, G.phase === 'day' ? 1 : 0.5)
          continue
        }
        d.m.visible = true
        d.m.position.set(d.x, POT_Y - 0.02 - fall * fall * (POT_Y - 0.02), d.z)
      }
      rebuildGuides()
      const aiming = drag?.kind === 'tap' && G.phase === 'day'
      const aim = aiming ? drag.wp : hover
      const showPaw = G.phase === 'day' && aim.x !== null && (aiming || !drag) && !sel.hang && G.pawsLeft > 0
      const pr = showPaw ? pawRings(G.slant) : null
      pawPreview.forEach((m, i) => {
        m.visible = showPaw
        if (!showPaw) return
        m.position.set(aim.x, 0.07, aim.z)
        m.scale.setScalar(pr[i])
      })

      // the cat watches the selected pot; its tail keeps time
      const sp = G.pots.find(q => q.id === sel.pot)
      if (sp) head.rotation.y = THREE.MathUtils.clamp(Math.atan2(sp.x - cat.position.x, sp.z - cat.position.z) - cat.rotation.y, -1.2, 1.2) * 0.7
      head.rotation.x = 0.55
      tail.forEach((seg, i) => {
        const a = (reducedMotion ? 0 : Math.sin(tt * 1.6 - i * 0.5) * 0.12 * i)
        seg.position.set(0.5 + i * 0.05 + a, 0.2 + i * 0.03, -0.55 - i * 0.12)
      })
      if (pawAnim.t >= 0) {
        pawAnim.t += dt
        const T = reducedMotion ? 0.25 : 0.55
        const u = pawAnim.t / T
        if (u >= 1) { pawAnim.t = -1; pawGroup.visible = false } else {
          pawGroup.visible = true
          const dip = u < 0.4 ? u / 0.4 : 1 - (u - 0.4) / 0.6
          // the arm comes in from the viewer, tilted along the line of sight
          coneDir.copy(camera.position).sub(tmp.set(pawAnim.x, 0, pawAnim.z)).normalize()
          coneDir.y += 0.9
          coneDir.normalize()
          pawGroup.quaternion.setFromUnitVectors(yAxis, coneDir)
          const back = (1 - dip) * 3.4
          pawGroup.position.set(pawAnim.x + coneDir.x * back, -0.08 + coneDir.y * back, pawAnim.z + coneDir.z * back)
        }
      }

      // camera
      orbit.el += (orbit.elGoal - orbit.el) * Math.min(1, dt * 3)
      orbit.sway = G.phase === 'intro' && !reducedMotion ? Math.sin(tt * 0.18) * 9 : orbit.sway * 0.95
      placeCamera()

      // tags
      G.clutches.forEach((c, ci) => {
        const el = tagRefs.current[ci]
        if (!el) return
        const s = screenOf(c.x, -TERRACES[c.terrace].depth + 0.2, c.z)
        el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`
      })
      G.pots.forEach((p, n) => {
        const el = potTagRefs.current[n]
        if (!el) return
        const v = pots[n]
        const s = screenOf(v.mesh.position.x, v.mesh.position.y + 1.25, v.mesh.position.z)
        el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`
        el.style.opacity = p.unlocked && G.phase !== 'dusk' ? 1 : 0
      })

      renderer.render(scene, camera)

      if (now - lastHud > 110) {
        lastHud = now
        apiRef.current.pushHud?.()
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointermove', onMove)
      renderer.domElement.removeEventListener('pointerup', onUp)
      renderer.domElement.removeEventListener('pointercancel', onCancel)
      renderer.domElement.removeEventListener('pointerleave', onLeave)
      stone.dispose()
      eggs.dispose()
      eels.dispose()
      guides.forEach(g => g.geo.dispose())
      disposables.forEach(d => d.dispose())
      sunLight.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      mount.removeChild(renderer.domElement)
      audioRef.current?.dispose()
      audioRef.current = null
    }
  }, [])

  // ── game API wired to React
  const pushHud = useCallback(() => setHud(snapshot(gameRef.current)), [])

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = createDayAudio()
      audioRef.current?.setMuted(mutedRef.current)
    }
    audioRef.current?.resume()
  }, [])

  const start = useCallback(() => {
    const G = gameRef.current
    if (G.phase !== 'intro') return
    ensureAudio()
    begin(G)
    setPhase('day')
    say('8:40 a.m. The sun has reached the west steps. Pot 1 is already dripping.', 'sun')
    pushHud()
  }, [ensureAudio, say, pushHud])

  const restart = useCallback(() => {
    const fresh = freshDay()
    Object.keys(gameRef.current).forEach(k => delete gameRef.current[k])
    Object.assign(gameRef.current, fresh)
    apiRef.current.reset?.()
    audioRef.current?.stopDrone()
    selRef.current = { pot: 1, clutch: null, follow: true, hang: null }
    setSelPot(1)
    setSelClutch(null)
    setHang(null)
    setCardHidden(false)
    setPhase('intro')
    pushHud()
  }, [pushHud])

  const selectPot = useCallback(id => {
    const p = gameRef.current.pots.find(q => q.id === id)
    if (!p || !p.unlocked) return
    selRef.current.pot = id
    setSelPot(id)
    if (!p.hung) { selRef.current.hang = id; setHang(id) }
  }, [])

  const toggleHang = useCallback(id => {
    const p = gameRef.current.pots.find(q => q.id === id)
    if (!p || !p.unlocked) return
    selRef.current.pot = id
    setSelPot(id)
    const next = selRef.current.hang === id ? null : id
    selRef.current.hang = next
    setHang(next)
  }, [])

  const selectClutch = useCallback(id => {
    selRef.current.clutch = id
    selRef.current.follow = false
    setSelClutch(id)
  }, [])

  const cycleClutch = useCallback(dir => {
    const ids = gameRef.current.clutches.map(c => c.id)
    const cur = Math.max(0, ids.indexOf(selRef.current.clutch))
    selectClutch(ids[(cur + dir + ids.length) % ids.length])
  }, [selectClutch])

  const nudgeTempo = useCallback((id, dir) => {
    const G = gameRef.current
    const p = G.pots.find(q => q.id === id)
    if (!p || !p.unlocked) return
    setTempo(G, id, p.tempo + dir * TEMPO_STEP)
    selRef.current.pot = id
    setSelPot(id)
    pushHud()
  }, [pushHud])

  const toggleFast = useCallback(() => {
    const G = gameRef.current
    if (G.phase !== 'day') return
    G.speed = G.speed === 1 ? FAST : 1
    pushHud()
  }, [pushHud])

  const cycleView = useCallback(() => {
    setView(v => {
      const next = VIEW_ORDER[(VIEW_ORDER.indexOf(v) + 1) % VIEW_ORDER.length]
      apiRef.current.setView?.(next)
      return next
    })
  }, [])

  const toggleMute = useCallback(() => {
    setMuted(m => {
      const next = !m
      mutedRef.current = next
      audioRef.current?.setMuted(next)
      return next
    })
  }, [])

  // callbacks the render loop raises
  useEffect(() => {
    const api = apiRef.current
    api.pushHud = () => {
      const G = gameRef.current
      const sel = selRef.current
      if (sel.follow && G.phase === 'day') {
        const cur = G.clutches.find(c => c.id === sel.clutch)
        if (!cur || cur.state !== 'dormant' || !cur.lit) {
          const open = G.clutches.filter(c => c.state === 'dormant')
          const pick = [...open].sort((a, b) => (b.lit - a.lit) || (b.progress - a.progress))[0]
          if (pick && pick.id !== sel.clutch) { sel.clutch = pick.id; setSelClutch(pick.id) }
        }
      } else if (sel.clutch && G.clutches.find(c => c.id === sel.clutch)?.state !== 'dormant' && G.phase === 'day') {
        sel.follow = true
      }
      pushHud()
    }
    api.start = start
    api.selectPot = id => { selRef.current.pot = id; setSelPot(id) }
    api.placed = id => { selRef.current.hang = null; setHang(null); say(`Pot ${id} hung. Its dashed rings show where its ripples focus on each floor.`) }
    api.pawed = () => {}
    api.onHatch = ev => {
      const G = gameRef.current
      const c = G.clutches.find(q => q.id === ev.clutch)
      say(`${formatClock(G.minute)}: the ${TERRACES[c.terrace].word} clutch ${c.id.toUpperCase()} hatches. Lamp-eels rise from the glass.`, 'hatch')
    }
    api.onPot = id => {
      const G = gameRef.current
      say(`Pot ${id} arrives at the rim (${G.hatched} lamp${G.hatched === 1 ? '' : 's'} lit). Pick its card, then tap the water to hang it.`, 'pot')
    }
    api.onCloud = on => { if (on) say('A cloud crosses the sun. The lenses go soft until it passes.', 'cloud') }
    api.onNoPaws = () => say('No paws left. Every lamp you light gives two back.', 'shade')
    api.onSlant = () => say('The sun is slanting. Its light now runs a longer road through the water, so every lens must focus deeper: the rings move out.', 'sun')
    api.onShade = (c, lit) => {
      if (!lit) say(`The sun has left ${clutchWord(c)}.`, 'shade')
    }
    api.onDusk = () => {
      const G = gameRef.current
      const r = G.result
      audioRef.current?.dusk(r.hatched)
      const entry = { hatched: r.hatched, focus: r.focusSeconds, at: Date.now() }
      const next = [entry, ...readDays()].slice(0, 6)
      writeDays(next)
      setDays(next)
      selRef.current.hang = null
      setHang(null)
      setPhase('dusk')
    }
  }, [start, say, pushHud])

  // keyboard
  useEffect(() => {
    const held = new Set()
    let rafK = 0
    let lastK = performance.now()
    let rArmed = 0
    // a paw dip aimed for the selected clutch: one paw ring out from its lens
    const pawForClutch = G => {
      const c = G.clutches.find(q => q.id === selRef.current.clutch)
      if (!c) return
      const r = pawRings(G.slant)[c.terrace]
      const d = Math.hypot(c.lensX, c.lensZ) || 1
      let ux = -c.lensX / d
      let uz = -c.lensZ / d
      if (Math.abs(c.lensX + ux * r) > HALF - 0.1 || Math.abs(c.lensZ + uz * r) > HALF - 0.1) { ux = -ux; uz = -uz }
      apiRef.current.pawAt?.(c.lensX + ux * r, c.lensZ + uz * r)
    }
    const MOVE = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] }
    const loop = now => {
      rafK = requestAnimationFrame(loop)
      const dt = Math.min(0.05, (now - lastK) / 1000)
      lastK = now
      if (!held.size) return
      const G = gameRef.current
      if (G.phase === 'dusk') return
      const p = G.pots.find(q => q.id === selRef.current.pot)
      if (!p || !p.unlocked) return
      let mx = 0
      let mz = 0
      held.forEach(code => { mx += MOVE[code][0]; mz += MOVE[code][1] })
      const az = THREE.MathUtils.degToRad(apiRef.current.camAz?.() || 0)
      const wx = mx * Math.cos(az) + mz * Math.sin(az)
      const wz = -mx * Math.sin(az) + mz * Math.cos(az)
      movePot(G, p.id, p.x + wx * dt * 2.2, p.z + wz * dt * 2.2)
      if (selRef.current.hang === p.id) { selRef.current.hang = null; setHang(null) }
    }
    rafK = requestAnimationFrame(loop)
    const onKey = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea')) return
      const G = gameRef.current
      if (MOVE[e.code]) { e.preventDefault(); held.add(e.code); return }
      if (e.repeat && !['BracketLeft', 'BracketRight', 'Minus', 'Equal'].includes(e.code)) return
      if (e.code === 'Enter' && G.phase === 'intro') { e.preventDefault(); start(); return }
      if (e.code === 'Enter' && G.phase === 'dusk') { e.preventDefault(); restart(); return }
      if (e.code === 'KeyR') {
        e.preventDefault()
        if (G.phase !== 'day' || performance.now() - rArmed < 2500) { rArmed = 0; restart(); return }
        rArmed = performance.now()
        say('Press R again to give up this day and start another.', 'shade')
        return
      }
      if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) { selectPot(Number(e.code.slice(-1))); return }
      if (e.code === 'BracketLeft' || e.code === 'Minus') { nudgeTempo(selRef.current.pot, -1); return }
      if (e.code === 'BracketRight' || e.code === 'Equal') { nudgeTempo(selRef.current.pot, 1); return }
      if (e.code === 'KeyQ' || e.code === 'KeyE') { cycleClutch(e.code === 'KeyE' ? 1 : -1); return }
      if (e.code === 'Space') {
        if (e.target instanceof HTMLButtonElement) return
        e.preventDefault()
        if (G.phase === 'intro') { start(); return }
        if (G.phase !== 'day') return
        const hv = apiRef.current.hover
        if (hv?.x !== null && hv?.x !== undefined) apiRef.current.pawAt?.(hv.x, hv.z)
        else pawForClutch(G)
        return
      }
      if (e.code === 'KeyP') { e.preventDefault(); if (G.phase === 'day') pawForClutch(G); return }
      if (e.code === 'KeyF') { toggleFast(); return }
      if (e.code === 'KeyV') { cycleView(); return }
      if (e.code === 'KeyM') { toggleMute(); return }
      if (e.code === 'KeyH') { toggleHang(selRef.current.pot); return }
      if (e.code === 'Comma') apiRef.current.nudgeView?.(-8, 0)
      if (e.code === 'Period') apiRef.current.nudgeView?.(8, 0)
    }
    const onUp = e => { held.delete(e.code) }
    const onBlur = () => held.clear()
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      cancelAnimationFrame(rafK)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [start, restart, selectPot, nudgeTempo, cycleClutch, toggleFast, cycleView, toggleMute, toggleHang, say])

  // ── HUD
  const G = gameRef.current
  const pot = hud.pots.find(p => p.id === selPot) || hud.pots[0]
  const rings = focusRings(pot.tempo, hud.slant || 1)
  const clutch = hud.clutches.find(c => c.id === selClutch)
  const result = G.result

  return (
    <div className={`swl-root is-${phase}${reduced ? ' swl-reduced' : ''}${hang ? ' is-hanging' : ''}`} data-testid="stepwell-lens">
      <div className="swl-stage" ref={mountRef} data-playground-surface data-testid="stepwell-lens-stage" />

      <div className="swl-tags" aria-hidden="true">
        {hud.clutches.map((c, i) => (
          <span
            key={c.id}
            ref={el => { tagRefs.current[i] = el }}
            className={`swl-tag t-${c.terrace} is-${c.state}${c.lit ? '' : ' is-shade'}${selClutch === c.id ? ' is-sel' : ''}${c.dose > 0.12 ? ' is-focus' : ''}`}
            data-testid={`swl-clutch-${c.id}`}
          >
            <svg viewBox="0 0 36 36" aria-hidden="true">
              <circle cx="18" cy="18" r="14" className="swl-tag-track" />
              <circle cx="18" cy="18" r="14" className="swl-tag-fill" style={{ strokeDasharray: `${(c.state === 'hatched' ? 1 : c.progress) * 88} 88` }} />
            </svg>
            <span>{c.id.toUpperCase()}</span>
          </span>
        ))}
        {hud.pots.map((p, i) => (
          <span key={p.id} ref={el => { potTagRefs.current[i] = el }} className={`swl-pottag${selPot === p.id ? ' is-sel' : ''}`}>{p.id}</span>
        ))}
      </div>

      <header className="swl-top">
        <Link to="/playground/physics" className="swl-back">← laboratory</Link>
        <div className="swl-title">
          <h1>stepwell.lens()</h1>
          <p>bend the sun through water</p>
        </div>
        <SunDial minute={hud.minute} cloud={hud.cloud} hatched={hud.clutches} speed={hud.speed} />
      </header>

      {phase === 'day' && clutch && (
        <aside className="swl-gauge" data-testid="swl-gauge" aria-label="Lens over the selected clutch">
          <DepthGauge clutch={clutch} onStep={dir => cycleClutch(dir)} />
        </aside>
      )}

      {phase === 'day' && (
        <footer className="swl-rack" data-testid="swl-rack">
          <div className="swl-pots" role="group" aria-label="Drip pots">
            {hud.pots.map((p, n) => (
              <button
                key={p.id}
                type="button"
                className={`swl-potchip${selPot === p.id ? ' is-sel' : ''}${p.unlocked ? '' : ' is-locked'}${p.unlocked && !p.hung ? ' is-waiting' : ''}`}
                onClick={() => selectPot(p.id)}
                disabled={!p.unlocked}
                aria-pressed={selPot === p.id}
                data-testid={`swl-pot-${p.id}`}
                data-playground-action="select-pot"
              >
                <b>{p.id}</b>
                <small>{p.unlocked ? (p.hung ? `${p.tempo.toFixed(1)} Hz` : 'on the rim') : `at ${POT_UNLOCKS[n]} lamp${POT_UNLOCKS[n] === 1 ? '' : 's'}`}</small>
              </button>
            ))}
          </div>
          {phase === 'day' && pot.unlocked && (
            <div className="swl-tempo" role="group" aria-label={`Pot ${pot.id} tempo`}>
              <button type="button" className="swl-btn" onClick={() => nudgeTempo(pot.id, -1)} disabled={pot.tempo <= TEMPO_MIN + 1e-6} aria-label="Slower drips" data-testid="swl-slower" data-playground-action="tempo-down">−</button>
              <div className="swl-tempo-read">
                <strong>{pot.tempo.toFixed(1)}<em> drips/s</em></strong>
                <span className="swl-rings">
                  {TERRACES.map((t, i) => <i key={t.id} className={`t-${i}`}>{t.word} {rings[i].toFixed(1)}</i>)}
                </span>
              </div>
              <button type="button" className="swl-btn" onClick={() => nudgeTempo(pot.id, 1)} disabled={pot.tempo >= TEMPO_MAX - 1e-6} aria-label="Quicker drips" data-testid="swl-quicker" data-playground-action="tempo-up">+</button>
              <button type="button" className={`swl-btn swl-hang${hang === pot.id ? ' is-on' : ''}`} onClick={() => toggleHang(pot.id)} aria-pressed={hang === pot.id} data-testid="swl-hang" data-playground-action="hang">
                {hang === pot.id ? 'tap water' : pot.hung ? 'move' : 'hang'}
              </button>
            </div>
          )}
          <div className="swl-tools">
            <span className="swl-paws" role="img" aria-label={`${hud.pawsLeft} paw dips left`} data-testid="swl-paws" title="paw dips left: tap the water">
              {Array.from({ length: PAWS_MAX }, (_, i) => <i key={i} className={i < hud.pawsLeft ? 'is-full' : ''} />)}
            </span>
            <button type="button" className={`swl-btn${hud.speed > 1 ? ' is-on' : ''}`} onClick={toggleFast} aria-pressed={hud.speed > 1} aria-label="Let the sun move four times faster" data-testid="swl-fast" data-playground-action="fast">{hud.speed > 1 ? '×4' : '▸▸'}</button>
            <button type="button" className="swl-btn" onClick={cycleView} aria-label={`View: ${VIEWS[view].label}`} data-testid="swl-view">◩</button>
            <button type="button" className="swl-btn" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? 'Sound off' : 'Sound on'} data-testid="swl-mute">{muted ? '♪̸' : '♪'}</button>
          </div>
        </footer>
      )}

      {hang && phase === 'day' && <div className="swl-hint" aria-hidden="true">tap the water to hang pot {hang}</div>}

      <div className="swl-live" role="status" aria-live="polite">{hang && phase === 'day' ? `Tap the water to hang pot ${hang}.` : toast && phase === 'day' ? toast.text : ''}</div>
      {toast && phase === 'day' && !hang && (
        <div key={toast.id} className={`swl-toast tone-${toast.tone}`} aria-hidden="true" data-testid="swl-toast">{toast.text}</div>
      )}

      {phase === 'intro' && (
        <section className="swl-card swl-intro" data-testid="swl-intro">
          <p className="swl-kicker">a well twelve steps deep · one day of sun</p>
          <h2>Seven clutches of glass eggs lie on the floor of the stepwell.</h2>
          <p>They hatch only in <b>gathered</b> light. Open sunlight is not enough. Hang clay pots over the water. Their drips ring the surface, and every crest is a lens. Hatch them before the sun leaves the well.</p>
          <ul className="swl-rules">
            <li><span className="swl-dot t-0" /> The <b>shelf</b> is shallow. The <b>middle</b> is deeper. The <b>deep</b> floor is deepest.</li>
            <li>A lens focuses deeper the farther it is from its pot. <b>Quicker drips</b> push the focus rings outward.</li>
            <li>Each clutch's light comes through the ring on the water <b>upsun</b> of it. Put that ring on the dashed circle of its colour.</li>
            <li>The cone under the selected clutch shows where its lens focuses. Low sun takes a longer road through the water, so morning and evening lenses must focus deeper.</li>
            <li>A <b>paw</b> dip sends one ring out. Dip at the small circle's distance from a lens for a burst of light. You have four, and each lamp gives two back.</li>
            <li>Drag on the stone around the pool, or press ◩, to turn the view.</li>
          </ul>
          <p className="swl-keys"><kbd>1 2 3</kbd> pot · <kbd>arrows</kbd> move it · <kbd>[ ]</kbd> tempo · <kbd>Q E</kbd> clutch · <kbd>space</kbd> paw at pointer · <kbd>P</kbd> paw for clutch · <kbd>F</kbd> hurry the sun · <kbd>V</kbd> view</p>
          <button type="button" className="swl-primary" onClick={start} autoFocus data-playground-primary data-testid="swl-begin">Let the sun in</button>
          {days.length > 0 && (
            <p className="swl-days">
              recent days {days.map((d, i) => <span key={i} title={`${d.hatched} of 7`}>{'●'.repeat(d.hatched)}{'○'.repeat(7 - d.hatched)}</span>)}
            </p>
          )}
        </section>
      )}

      {phase === 'dusk' && result && !cardHidden && (
        <section className="swl-card swl-dusk" data-testid="swl-dusk">
          <p className="swl-kicker">{result.reason === 'early' ? `every lamp lit by ${formatClock(result.lastHatch)}` : 'the sun has left the well'}</p>
          <h2>{epithet(result)}</h2>
          <div className="swl-lamps" role="img" aria-label={`${result.hatched} of 7 clutches hatched`}>
            {G.clutches.map(c => <span key={c.id} className={`t-${c.terrace}${c.state === 'hatched' ? ' is-lit' : ''}`}>{c.id.toUpperCase()}</span>)}
          </div>
          <dl className="swl-stats">
            <div><dt>lamps lit</dt><dd>{result.hatched} / 7</dd></div>
            <div><dt>drops let fall</dt><dd>{result.drops}</dd></div>
            <div><dt>paws dipped</dt><dd>{result.paws}</dd></div>
            <div><dt>clutch-seconds in focus</dt><dd>{result.focusSeconds}</dd></div>
          </dl>
          <div className="swl-card-actions">
            <button type="button" className="swl-primary" onClick={restart} autoFocus data-playground-action="restart" data-testid="swl-restart">Another day</button>
            <button type="button" className="swl-ghost" onClick={() => setCardHidden(true)} data-testid="swl-look">Look at the well</button>
          </div>
        </section>
      )}
      {phase === 'dusk' && cardHidden && (
        <footer className="swl-rack swl-rack-dusk">
          <button type="button" className="swl-ghost" onClick={() => setCardHidden(false)} data-testid="swl-reopen">the day's tally</button>
          <button type="button" className="swl-btn" onClick={cycleView} aria-label={`View: ${VIEWS[view].label}`} data-testid="swl-view-dusk">◩</button>
          <button type="button" className="swl-btn" onClick={restart} aria-label="Another day" data-testid="swl-restart-dusk">↺</button>
        </footer>
      )}
    </div>
  )
}

function snapshot(G) {
  return {
    minute: G.minute,
    speed: G.speed,
    cloud: G.cloud,
    strength: G.strength,
    hatched: G.hatched,
    pawsLeft: G.pawsLeft,
    slant: G.slant,
    pots: G.pots.map(p => ({ id: p.id, tempo: p.tempo, unlocked: p.unlocked, hung: p.hung })),
    clutches: G.clutches.map(c => ({ id: c.id, terrace: c.terrace, progress: c.progress, match: c.match, focal: c.focal, lit: c.lit, state: c.state, dose: c.dose, path: c.path || TERRACES[c.terrace].depth }))
  }
}

function SunDial({ minute, cloud, hatched, speed }) {
  const span = DAY_END - FIRST_LIGHT
  const u = Math.max(0, Math.min(1, (minute - FIRST_LIGHT) / span))
  const a = Math.PI * (1 - u)
  const x = 50 + Math.cos(a) * 40
  const y = 48 - Math.sin(a) * 36
  return (
    <div className="swl-dial" data-testid="swl-clock" role="img" aria-label={`${formatClock(minute)}${cloud > 0.3 ? ', clouded' : ''}`}>
      <svg viewBox="0 0 100 56" aria-hidden="true">
        <path d="M10 48 A40 36 0 0 1 90 48" className="swl-dial-arc" />
        {CLOUDS.map((c, i) => {
          const a0 = Math.PI * (1 - (c.from - FIRST_LIGHT) / span)
          const a1 = Math.PI * (1 - (c.to - FIRST_LIGHT) / span)
          return <path key={i} d={`M${50 + Math.cos(a0) * 40} ${48 - Math.sin(a0) * 36} A40 36 0 0 1 ${50 + Math.cos(a1) * 40} ${48 - Math.sin(a1) * 36}`} className="swl-dial-cloud" />
        })}
        <line x1="4" y1="48" x2="96" y2="48" className="swl-dial-rim" />
        <circle cx={x} cy={y} r={cloud > 0.3 ? 4 : 5.5} className={`swl-dial-sun${cloud > 0.3 ? ' is-cloud' : ''}`} />
      </svg>
      <div className="swl-dial-read">
        <strong>{formatClock(minute)}{speed > 1 ? ' ×4' : ''}</strong>
        <span className="swl-dial-lamps">
          {hatched.map(c => <i key={c.id} className={`t-${c.terrace}${c.state === 'hatched' ? ' is-lit' : ''}`} />)}
        </span>
      </div>
    </div>
  )
}

function DepthGauge({ clutch, onStep }) {
  const path = clutch.path
  const scale = 26
  const top = 16
  const floorY = top + path * scale
  const f = Math.min(clutch.focal, 4.6)
  const apexY = top + f * scale
  const miss = clutch.focal - path
  const slant = path / TERRACES[clutch.terrace].depth
  let verdict
  if (!Number.isFinite(clutch.focal) || clutch.focal > 12) verdict = 'water too calm here: no lens'
  else if (Math.abs(Math.log(clutch.focal / path)) < 0.18) verdict = 'focused on the eggs'
  else if (miss < 0) verdict = `focus ${(-miss).toFixed(1)} short of the eggs: slow the drips or pull the pot away`
  else verdict = `focus ${miss.toFixed(1)} past the eggs: quicken the drips or bring the pot closer`
  if (slant > 1.08) verdict += ` · low sun: the path is ${slant.toFixed(2)}× the depth`
  const w = 150
  return (
    <div className={`swl-gauge-in t-${clutch.terrace}`}>
      <div className="swl-gauge-head">
        <button type="button" className="swl-step" onClick={() => onStep(-1)} aria-label="Previous clutch" data-testid="swl-clutch-prev" data-playground-action="prev-clutch">‹</button>
        <div>
          <b>{TERRACES[clutch.terrace].word} clutch {clutch.id.toUpperCase()}</b>
          <span>{clutch.lit ? (clutch.dose > 0.12 ? 'gathering' : 'in sun') : 'in shade'} · {Math.round(clutch.progress * 100)}%</span>
        </div>
        <button type="button" className="swl-step" onClick={() => onStep(1)} aria-label="Next clutch" data-testid="swl-clutch-next" data-playground-action="next-clutch">›</button>
      </div>
      <svg viewBox={`0 0 ${w} 140`} aria-hidden="true">
        <rect x="0" y={top} width={w} height={140 - top} className="swl-g-water" />
        <path d={`M0 ${top} Q ${w * 0.25} ${top - 5} ${w * 0.5} ${top} T ${w} ${top}`} className="swl-g-surface" />
        <polygon points={`${w * 0.3},${top} ${w * 0.7},${top} ${w * 0.5},${Math.min(138, apexY)}`} className="swl-g-cone" style={{ opacity: 0.25 + clutch.match * 0.6 }} />
        {TERRACES.map((t, i) => (
          <line key={t.id} x1="2" x2="10" y1={top + t.depth * scale} y2={top + t.depth * scale} className={`swl-g-tick t-${i}`} />
        ))}
        <rect x="18" y={floorY} width={w - 36} height={140 - floorY} className="swl-g-floor" />
        {[-2, -1, 0, 1, 2].map(n => <circle key={n} cx={w * 0.5 + n * 9} cy={floorY - 4} r="4" className="swl-g-egg" />)}
        {apexY < 138 && <circle cx={w * 0.5} cy={apexY} r={3 + clutch.match * 3} className="swl-g-apex" />}
      </svg>
      <p className="swl-gauge-verdict">{verdict}</p>
    </div>
  )
}
