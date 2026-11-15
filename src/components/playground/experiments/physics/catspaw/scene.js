// The evening sea in WebGL. The water shader is handed the wind field as a
// texture and paints it the way a sailor sees it: rougher water reflects the
// higher, darker sky, so every puff arrives as a dark fan of ripples and every
// lull or wind shadow lies glassy and bright. Nothing on the water is a
// diagram except the dashed laylines the tactician draws for you.

import * as THREE from 'three'
import { AREA, bakeWind, DEG, wrap, buildFactor } from './wind'
import { PIN, COMMITTEE } from './race'
import { CLOSE } from './boat'

const TEX = 96
const toWorld = (x, y) => new THREE.Vector3(x, 0, -y)

// one palette per race: afternoon gold, a brisk clear evening, then last light
const LOOKS = [
  { top: '#3d5f86', horizon: '#f2cf9a', sun: '#ffe0a8', deep: '#4f8794', paw: '#0a2430', haze: '#e7c497', hills: '#3d4a57', exposure: 1.05 },
  { top: '#2e5a8a', horizon: '#d9e2e0', sun: '#fff1cf', deep: '#4a86a0', paw: '#08203a', haze: '#c9d6d8', hills: '#334453', exposure: 1.1 },
  { top: '#2a2c55', horizon: '#ff9a5c', sun: '#ffb070', deep: '#8a93c2', paw: '#0b0f2a', haze: '#e58a62', hills: '#2a2640', exposure: 1.18 }
]

const SKY_GLSL = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uSun;
  uniform vec3 uSunDir;
  vec3 skyColor(vec3 d) {
    float h = clamp(d.y, -0.2, 1.0);
    vec3 col = mix(uHorizon, uTop, pow(smoothstep(-0.02, 0.55, h), 0.6));
    float s = max(dot(d, uSunDir), 0.0);
    col += uSun * (pow(s, 22.0) * 0.32 + pow(s, 180.0) * 0.7);
    col = mix(col, uHorizon * 0.9, smoothstep(0.02, -0.2, h));
    return col;
  }
`

function skyMaterial(look) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(look.top) },
      uHorizon: { value: new THREE.Color(look.horizon) },
      uSun: { value: new THREE.Color(look.sun) },
      uSunDir: { value: new THREE.Vector3(0, 0.1, -1) }
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
        vec4 p = projectionMatrix * viewMatrix * vec4((modelMatrix * vec4(position, 1.0)).xyz, 1.0);
        gl_Position = p.xyww;
      }
    `,
    fragmentShader: /* glsl */ `
      ${SKY_GLSL}
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = skyColor(d);
        float s = max(dot(d, uSunDir), 0.0);
        col += uSun * smoothstep(0.9993, 0.9997, s) * 1.6;
        gl_FragColor = vec4(col, 1.0);
      }
    `
  })
}

function waterMaterial(look, windTex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uWind: { value: windTex },
      uArea: { value: new THREE.Vector3(AREA.minX, AREA.minY, AREA.size) },
      uTime: { value: 0 },
      uTop: { value: new THREE.Color(look.top) },
      uHorizon: { value: new THREE.Color(look.horizon) },
      uSun: { value: new THREE.Color(look.sun) },
      uSunDir: { value: new THREE.Vector3(0, 0.1, -1) },
      uDeep: { value: new THREE.Color(look.deep) },
      uPaw: { value: new THREE.Color(look.paw) },
      uHaze: { value: new THREE.Color(look.haze) },
      uBaseDir: { value: 0 },
      uBaseSpd: { value: 5 },
      uNorm: { value: 5 },
      uSwell: { value: 0.3 },
      uMotion: { value: 1 }
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      ${SKY_GLSL}
      uniform sampler2D uWind;
      uniform vec3 uArea;
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uPaw;
      uniform vec3 uHaze;
      uniform float uBaseDir;
      uniform float uBaseSpd;
      uniform float uNorm;
      uniform float uSwell;
      uniform float uMotion;
      varying vec3 vWorld;

      float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      // the wind where this fragment is: speed (m/s), direction, shadow
      vec3 windHere(vec2 sim) {
        vec2 uv = (sim - uArea.xy) / uArea.z;
        vec4 t = texture2D(uWind, clamp(uv, 0.0, 1.0));
        float inside = smoothstep(0.0, 0.06, uv.x) * smoothstep(1.0, 0.94, uv.x) * smoothstep(0.0, 0.06, uv.y) * smoothstep(1.0, 0.94, uv.y);
        // the bake encodes speed against the race's nominal wind; ratios are taken against the breeze as it is now
        float spd = mix(uBaseSpd, t.r * 2.0 * uNorm, inside);
        float dir = uBaseDir + mix(0.0, (t.g - 0.5) * 1.2, inside);
        return vec3(spd, dir, t.b * inside);
      }
      float ripples(vec2 sim, vec2 down, float rough, float far) {
        vec2 q = vec2(dot(sim, down), dot(sim, vec2(down.y, -down.x)));
        float t = uTime * uMotion;
        float h = noise(q * vec2(0.55, 0.3) - vec2(t * 1.1, 0.0)) * 0.55;
        h += noise(q * vec2(1.4, 0.7) - vec2(t * 2.0, t * 0.2)) * 0.3 * far;
        h += noise(q * vec2(3.1, 1.6) - vec2(t * 3.3, 0.0)) * 0.18 * far * far;
        float swell = sin(dot(sim, vec2(0.11, 0.16)) - t * 0.9) * 0.5 + sin(dot(sim, vec2(-0.07, 0.21)) - t * 1.3) * 0.3;
        return h * rough + swell * uSwell * uMotion;
      }
      void main() {
        vec2 sim = vec2(vWorld.x, -vWorld.z);
        vec3 w = windHere(sim);
        float spd = w.x;
        vec2 down = -vec2(sin(w.y), cos(w.y));
        float dist = length(cameraPosition - vWorld);
        float far = 1.0 / (1.0 + dist / 70.0);
        // roughness rises with wind: glassy below 2 m/s, a full cat's paw by 7
        float rough = smoothstep(1.2, 7.5, spd);
        float amp = 0.08 + rough * 1.25;
        float e = 0.35 + dist * 0.004;
        float hx = ripples(sim + vec2(e, 0.0), down, amp, far) - ripples(sim - vec2(e, 0.0), down, amp, far);
        float hy = ripples(sim + vec2(0.0, e), down, amp, far) - ripples(sim - vec2(0.0, e), down, amp, far);
        vec3 n = normalize(vec3(-hx / (2.0 * e) * 0.55, 1.0, hy / (2.0 * e) * 0.55));
        // far away the ripples are too small to see, but the darkening is not
        n = normalize(mix(vec3(0.0, 1.0, 0.0), n, 0.35 + 0.65 * far));
        vec3 v = normalize(cameraPosition - vWorld);
        vec3 r = reflect(-v, n);
        r.y = abs(r.y);
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
        vec3 sky = skyColor(r);
        vec3 body = uDeep * (0.85 + 0.3 * n.x + 0.15 * n.z);
        vec3 col = mix(body, sky, clamp(fres, 0.0, 1.0));
        // a puff reads as a dark fan, a lull as bright glass
        float ratio = spd / uBaseSpd;
        float paw = smoothstep(1.0, 1.3, ratio);
        float glass = clamp(smoothstep(0.9, 0.6, ratio) + w.z * 1.2, 0.0, 1.0);
        // a cat's paw: ink-dark, finely rippled; a hole: smooth, pale, mirror-like
        float grain = 0.75 + 0.5 * noise(sim * 0.09 - down * uTime * 0.6);
        col = mix(col, uPaw, clamp(paw * grain, 0.0, 1.0) * 0.85);
        col = mix(col, mix(uHorizon, uTop, 0.45), glass * 0.3);
        // the sun's road, broken into sparkles where the water is rough
        float s = max(dot(r, uSunDir), 0.0);
        float spec = pow(s, mix(900.0, 160.0, rough)) * mix(1.6, 5.0, rough);
        col += uSun * spec * (0.4 + 0.6 * far);
        // whitecaps in a strong gust
        float caps = smoothstep(7.8, 10.5, spd) * smoothstep(0.82, 0.95, noise(sim * 0.35 - down * uTime * 2.5));
        col = mix(col, vec3(0.93, 0.95, 0.94), caps * far * 0.85);
        // haze to the horizon
        float fog = smoothstep(120.0, 1300.0, dist);
        col = mix(col, uHaze, fog);
        gl_FragColor = vec4(col, 1.0);
      }
    `
  })
}

// ---------------------------------------------------------------------------
// hulls, sails and crews

function hullGeometry(len = 4.2, beam = 1.42, depth = 0.42) {
  const N = 16
  const ring = 7
  const pos = []
  const deck = []
  for (let s = 0; s <= N; s++) {
    const u = s / N
    const w = (beam / 2) * (u < 0.55 ? 0.8 + 0.2 * Math.sin((u / 0.55) * Math.PI / 2) : Math.sqrt(Math.max(0, 1 - ((u - 0.55) / 0.45) ** 2)))
    const z = len / 2 - u * len
    const sheer = 0.28 + 0.08 * u * u
    const keel = -depth * (1 - 0.6 * Math.max(0, u - 0.7) / 0.3) * (0.75 + 0.25 * Math.min(1, u / 0.2))
    const pts = [[-w, sheer], [-w * 0.95, 0.02], [-w * 0.62, keel * 0.82], [0, keel], [w * 0.62, keel * 0.82], [w * 0.95, 0.02], [w, sheer]]
    for (const [x, y] of pts) pos.push(x, y, z)
    deck.push([-w, sheer, z], [w, sheer, z])
  }
  const idx = []
  for (let s = 0; s < N; s++) {
    for (let k = 0; k < ring - 1; k++) {
      const a = s * ring + k
      const b = a + 1
      const c = a + ring
      const d = c + 1
      idx.push(a, b, c, b, d, c)
    }
  }
  // transom
  const base = 0
  for (let k = 1; k < ring - 1; k++) idx.push(base, base + k + 1, base + k)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  const dp = []
  const di = []
  deck.forEach(p => dp.push(p[0], p[1], p[2]))
  for (let s = 0; s < N; s++) {
    const a = s * 2
    di.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
  }
  const dg = new THREE.BufferGeometry()
  dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3))
  dg.setIndex(di)
  dg.computeVertexNormals()
  return { hull: g, deck: dg }
}

function sailTexture(color, num, you) {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 256
  const x = c.getContext('2d')
  x.fillStyle = color
  x.fillRect(0, 0, 128, 256)
  // panel seams
  x.strokeStyle = 'rgba(40,30,20,0.18)'
  x.lineWidth = 2
  for (let i = 1; i < 8; i++) {
    x.beginPath()
    x.moveTo(0, 256 - i * 30)
    x.lineTo(128, 256 - i * 30 - 10)
    x.stroke()
  }
  // the class insignia: a cat's paw, and the sail number
  x.fillStyle = you ? 'rgba(15,15,20,0.92)' : 'rgba(30,30,40,0.75)'
  const pad = (cx, cy, r) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill() }
  pad(40, 70, 10)
  pad(25, 52, 5)
  pad(37, 46, 5)
  pad(50, 47, 5)
  pad(58, 56, 5)
  x.font = 'bold 54px Georgia, serif'
  x.textAlign = 'center'
  x.fillText(num, 52, 150)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

const NU = 7
const NV = 9
function sailGeometry() {
  const g = new THREE.BufferGeometry()
  const pos = new Float32Array(NU * NV * 3)
  const uv = new Float32Array(NU * NV * 2)
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
    uv[(j * NU + i) * 2] = i / (NU - 1)
    uv[(j * NU + i) * 2 + 1] = j / (NV - 1)
  }
  const idx = []
  for (let j = 0; j < NV - 1; j++) for (let i = 0; i < NU - 1; i++) {
    const a = j * NU + i
    idx.push(a, a + 1, a + NU, a + 1, a + NU + 1, a + NU)
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

function makeCat(fur, eyes) {
  const g = new THREE.Group()
  const furMat = new THREE.MeshStandardMaterial({ color: fur, roughness: 0.85 })
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.3, 4, 8), furMat)
  body.position.y = 0.32
  g.add(body)
  const head = new THREE.Group()
  head.position.y = 0.66
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), furMat)
  head.add(skull)
  const earGeo = new THREE.ConeGeometry(0.06, 0.13, 4)
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, furMat)
    ear.position.set(s * 0.08, 0.13, 0.01)
    ear.rotation.z = -s * 0.25
    head.add(ear)
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), new THREE.MeshBasicMaterial({ color: eyes }))
    eye.position.set(s * 0.055, 0.02, -0.13)
    head.add(eye)
  }
  g.add(head)
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 6, 12, Math.PI * 1.1), furMat)
  tail.position.set(0, 0.2, 0.2)
  tail.rotation.y = Math.PI / 2
  g.add(tail)
  g.userData = { body, head, tail }
  return g
}

function makeBoat(b) {
  const root = new THREE.Group()
  const roll = new THREE.Group()
  root.add(roll)
  const { hull, deck } = hullGeometry()
  const hullMesh = new THREE.Mesh(hull, new THREE.MeshStandardMaterial({ color: b.hullColor, roughness: 0.45, metalness: 0.05, side: THREE.DoubleSide }))
  const deckMesh = new THREE.Mesh(deck, new THREE.MeshStandardMaterial({ color: '#d9cdb4', roughness: 0.8, side: THREE.DoubleSide }))
  roll.add(hullMesh, deckMesh)
  const spar = new THREE.MeshStandardMaterial({ color: '#b9b4a8', roughness: 0.4, metalness: 0.4 })
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 6.2, 6), spar)
  mast.position.set(0, 3.35, -0.95)
  roll.add(mast)
  const boomG = new THREE.Group()
  boomG.position.set(0, 1.05, -0.95)
  roll.add(boomG)
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.7, 6), spar)
  boom.rotation.x = Math.PI / 2
  boom.position.z = 1.35
  boomG.add(boom)
  const tex = sailTexture(b.sailColor, b.num, b.you)
  const sailMat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9, emissive: new THREE.Color(b.sailColor), emissiveIntensity: 0.12 })
  const sailGeo = sailGeometry()
  sailMat.side = THREE.FrontSide
  const sail = new THREE.Mesh(sailGeo, sailMat)
  sail.frustumCulled = false
  boomG.add(sail)
  // the number is sewn on both sides, so it never reads backwards
  const backTex = tex.clone()
  backTex.wrapS = THREE.RepeatWrapping
  backTex.repeat.x = -1
  backTex.offset.x = 1
  backTex.needsUpdate = true
  const backMat = sailMat.clone()
  backMat.map = backTex
  backMat.side = THREE.BackSide
  const sailBack = new THREE.Mesh(sailGeo, backMat)
  sailBack.frustumCulled = false
  boomG.add(sailBack)
  const cat = makeCat(b.fur, b.you ? '#ffd34d' : '#c9f0a0')
  roll.add(cat)
  if (b.you) {
    // a small lamp at the masthead so you can always find yourself
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd34d' }))
    lamp.position.set(0, 6.5, -0.95)
    roll.add(lamp)
  }
  return { root, roll, boomG, sail, sailGeo, cat, heel: 0, mats: [hullMesh.material, deckMesh.material, spar, sailMat, tex, backMat, backTex], geos: [hull, deck, sailGeo], wake: null }
}

function updateSail(m, b, t, reduced) {
  const pos = m.sailGeo.attributes.position.array
  const side = b.twa >= 0 ? 1 : -1
  const foot = 2.65
  const height = 5.15
  const camber = b.capsized ? 0.03 : 0.11 * (1 - b.luff * 0.8) + 0.03 * b.stall
  const flap = reduced ? 0.4 : 1
  for (let j = 0; j < NV; j++) {
    const v = j / (NV - 1)
    const chord = foot * (1 - v * 0.9)
    for (let i = 0; i < NU; i++) {
      const u = i / (NU - 1)
      const k = (j * NU + i) * 3
      let x = side * camber * Math.sin(Math.PI * Math.pow(u, 0.8)) * chord
      x += b.luff * flap * 0.22 * Math.sin(t * 19 + u * 7 - v * 4 + b.id) * Math.sin(Math.PI * u) * chord * 0.5
      pos[k] = x
      pos[k + 1] = v * height
      pos[k + 2] = u * chord
    }
  }
  m.sailGeo.attributes.position.needsUpdate = true
  m.sailGeo.computeVertexNormals()
}

// ---------------------------------------------------------------------------
// wakes

const WAKE_N = 44
function makeWake() {
  const g = new THREE.BufferGeometry()
  const pos = new Float32Array(WAKE_N * 2 * 3)
  const age = new Float32Array(WAKE_N * 2)
  const side = new Float32Array(WAKE_N * 2)
  for (let i = 0; i < WAKE_N; i++) { side[i * 2] = 0; side[i * 2 + 1] = 1 }
  const idx = []
  for (let i = 0; i < WAKE_N - 1; i++) {
    const a = i * 2
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aAge', new THREE.BufferAttribute(age, 1))
  g.setAttribute('aSide', new THREE.BufferAttribute(side, 1))
  g.setIndex(idx)
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uColor: { value: new THREE.Color('#f4f1e6') } },
    blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float aAge; attribute float aSide; varying float vAge; varying float vSide; void main(){ vAge = aAge; vSide = aSide; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 uColor; varying float vAge; varying float vSide; void main(){ float e = abs(vSide * 2.0 - 1.0); float foam = pow(e, 6.0) * 0.75 + 0.08; gl_FragColor = vec4(uColor * foam * (1.0 - vAge) * (1.0 - vAge) * 0.55, 1.0); }'
  })
  const mesh = new THREE.Mesh(g, mat)
  mesh.frustumCulled = false
  return { mesh, pts: [], acc: 0 }
}

function updateWake(w, b, dt) {
  w.acc += dt
  if (w.acc > 0.12) {
    w.acc = 0
    w.pts.unshift({ x: b.x - Math.sin(b.h) * 2, y: b.y - Math.cos(b.h) * 2, h: b.h, v: b.v, age: 0 })
    if (w.pts.length > WAKE_N) w.pts.pop()
  }
  const pos = w.mesh.geometry.attributes.position.array
  const age = w.mesh.geometry.attributes.aAge.array
  for (let i = 0; i < WAKE_N; i++) {
    const p = w.pts[Math.min(i, w.pts.length - 1)] || { x: b.x, y: b.y, h: b.h, v: 0 }
    const a = i / (WAKE_N - 1)
    const half = 0.22 + a * 1.1 * Math.min(1, p.v / 2.5)
    const cx = Math.cos(p.h)
    const sx = -Math.sin(p.h)
    pos[i * 6] = p.x + cx * half
    pos[i * 6 + 1] = 0.04
    pos[i * 6 + 2] = -(p.y + sx * half)
    pos[i * 6 + 3] = p.x - cx * half
    pos[i * 6 + 4] = 0.04
    pos[i * 6 + 5] = -(p.y - sx * half)
    const fade = p.v < 0.6 ? 1 : a
    age[i * 2] = age[i * 2 + 1] = Math.min(1, Math.max(a, 1 - p.v / 1.2 + a * 0.3, fade))
  }
  w.mesh.geometry.attributes.position.needsUpdate = true
  w.mesh.geometry.attributes.aAge.needsUpdate = true
}

// ---------------------------------------------------------------------------
// marks, committee boat, shore

function flagTexture(kind) {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 44
  const x = c.getContext('2d')
  if (kind === 'p') {
    x.fillStyle = '#1f4e9c'
    x.fillRect(0, 0, 64, 44)
    x.fillStyle = '#f4f1e6'
    x.fillRect(20, 14, 24, 16)
  } else if (kind === 'class') {
    x.fillStyle = '#f2c230'
    x.fillRect(0, 0, 64, 44)
    x.fillStyle = '#141414'
    x.beginPath(); x.arc(32, 26, 7, 0, Math.PI * 2); x.fill()
    for (const [dx, dy] of [[-9, -6], [-3, -11], [4, -11], [10, -6]]) { x.beginPath(); x.arc(32 + dx, 26 + dy, 3.4, 0, Math.PI * 2); x.fill() }
  } else if (kind === 'x') {
    x.fillStyle = '#f4f1e6'
    x.fillRect(0, 0, 64, 44)
    x.fillStyle = '#1f4e9c'
    x.fillRect(26, 0, 12, 44)
    x.fillRect(0, 16, 64, 12)
  } else {
    x.fillStyle = '#e8792b'
    x.fillRect(0, 0, 64, 44)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function makeFlag(kind, w = 0.9, h = 0.62) {
  const geo = new THREE.PlaneGeometry(w, h, 6, 1)
  geo.translate(w / 2, 0, 0)
  const tex = flagTexture(kind)
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }))
  mesh.userData.base = Float32Array.from(geo.attributes.position.array)
  return mesh
}

function waveFlag(mesh, t, k) {
  const pos = mesh.geometry.attributes.position.array
  const base = mesh.userData.base
  for (let i = 0; i < pos.length; i += 3) {
    const x = base[i]
    pos[i + 2] = Math.sin(t * 6 + x * 5 + k) * 0.07 * x
  }
  mesh.geometry.attributes.position.needsUpdate = true
}

function buoy(color, r = 0.8, h = 1.5) {
  const g = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55 })
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r, h, 14), mat)
  body.position.y = h / 2 - 0.25
  g.add(body)
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.83, r * 0.88, 0.16, 14), new THREE.MeshStandardMaterial({ color: '#f4f1e6' }))
  band.position.y = h * 0.42
  g.add(band)
  return g
}

function makeCommittee(look) {
  const g = new THREE.Group()
  const { hull, deck } = hullGeometry(9, 3.2, 0.9)
  const hm = new THREE.MeshStandardMaterial({ color: '#e9e3d4', roughness: 0.5, side: THREE.DoubleSide })
  g.add(new THREE.Mesh(hull, hm), new THREE.Mesh(deck, new THREE.MeshStandardMaterial({ color: '#8b6a45', side: THREE.DoubleSide })))
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 3), new THREE.MeshStandardMaterial({ color: '#c8352e', roughness: 0.6 }))
  cabin.position.set(0, 1.1, 0.6)
  g.add(cabin)
  const win = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.4, 2.6), new THREE.MeshBasicMaterial({ color: '#ffd9a0' }))
  win.position.set(0, 1.4, 0.6)
  g.add(win)
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 6, 6), new THREE.MeshStandardMaterial({ color: '#9a9488' }))
  mast.position.set(0, 4.2, -0.6)
  g.add(mast)
  const flags = {
    class: makeFlag('class'),
    p: makeFlag('p'),
    x: makeFlag('x'),
    end: makeFlag('end', 0.7, 0.45)
  }
  flags.class.position.set(0.05, 6.6, -0.6)
  flags.p.position.set(0.05, 5.8, -0.6)
  flags.x.position.set(0.05, 5.0, -0.6)
  flags.end.position.set(0.05, 7.1, -0.6)
  Object.values(flags).forEach(f => g.add(f))
  g.userData.flags = flags
  return g
}

function makeShore(look) {
  const g = new THREE.Group()
  // a low ring of hills in the haze
  const segs = 180
  const pos = []
  const idx = []
  const R = 1500
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2
    const n = Math.sin(a * 3.1) * 0.5 + Math.sin(a * 7.3 + 1) * 0.3 + Math.sin(a * 17.9 + 2) * 0.12
    // open sea to the north, land wrapping the south
    const southness = Math.max(0, -Math.cos(a))
    const h = Math.max(0, (18 + n * 22) * (0.15 + southness)) + (Math.abs(wrap(a - 1.2)) < 0.25 ? 26 : 0)
    pos.push(Math.sin(a) * R, -2, -Math.cos(a) * R, Math.sin(a) * R, h, -Math.cos(a) * R)
    if (i < segs) {
      const k = i * 2
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  const hills = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: look.hills, side: THREE.DoubleSide, fog: true }))
  g.add(hills)
  // the harbour wall behind the start, with its lamps
  const wall = new THREE.Mesh(new THREE.BoxGeometry(520, 6, 12), new THREE.MeshStandardMaterial({ color: '#5a554d', roughness: 1 }))
  wall.position.set(-40, 1, 330)
  g.add(wall)
  const lampPos = []
  for (let i = 0; i < 26; i++) lampPos.push(-290 + i * 20, 6.5, 325)
  const lg = new THREE.BufferGeometry()
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lampPos, 3))
  const lamps = new THREE.Points(lg, new THREE.PointsMaterial({ color: '#ffcf7a', size: 2.6, sizeAttenuation: true, fog: false }))
  g.add(lamps)
  // a lighthouse on the breakwater head
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3, 20, 10), new THREE.MeshStandardMaterial({ color: '#efe7d6' }))
  tower.position.set(225, 10, 325)
  g.add(tower)
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(2.4, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff0c4', fog: false }))
  lantern.position.set(225, 21.5, 325)
  g.add(lantern)
  g.userData.lantern = lantern
  return g
}

function dashedLine(color, opacity = 0.6) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
  const m = new THREE.LineDashedMaterial({ color, dashSize: 3, gapSize: 2.4, transparent: true, opacity, depthWrite: false })
  const l = new THREE.Line(g, m)
  l.frustumCulled = false
  return l
}
function setLine(l, a, b) {
  const p = l.geometry.attributes.position.array
  p[0] = a.x; p[1] = 0.12; p[2] = -a.y
  p[3] = b.x; p[4] = 0.12; p[5] = -b.y
  l.geometry.attributes.position.needsUpdate = true
  l.computeLineDistances()
}

// ---------------------------------------------------------------------------

export function createScene(canvas, labelLayer, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.capture })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(52, 1, 0.3, 4000)
  const hemi = new THREE.HemisphereLight('#cfe0ff', '#30404a', 0.9)
  const sunLight = new THREE.DirectionalLight('#ffe2b0', 2.1)
  scene.add(hemi, sunLight, sunLight.target)

  const windData = new Uint8Array(TEX * TEX * 4)
  const windTex = new THREE.DataTexture(windData, TEX, TEX, THREE.RGBAFormat)
  windTex.magFilter = THREE.LinearFilter
  windTex.minFilter = THREE.LinearFilter
  windTex.needsUpdate = true

  let look = LOOKS[0]
  const skyMat = skyMaterial(look)
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), skyMat)
  sky.frustumCulled = false
  scene.add(sky)
  const waterMat = waterMaterial(look, windTex)
  const water = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), waterMat)
  water.rotation.x = -Math.PI / 2
  scene.add(water)
  scene.fog = new THREE.Fog(look.haze, 300, 1700)

  let shore = makeShore(look)
  scene.add(shore)
  const markObj = buoy('#e8792b', 0.9, 1.9)
  const pinObj = buoy('#e8792b', 0.6, 1.1)
  const pinFlag = makeFlag('end', 0.6, 0.4)
  const pinPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 5), new THREE.MeshStandardMaterial({ color: '#333' }))
  pinPole.position.y = 1.6
  pinFlag.position.set(0.02, 2.6, 0)
  pinObj.add(pinPole, pinFlag)
  let committee = makeCommittee(look)
  scene.add(markObj, pinObj, committee)

  const lines = {
    start: dashedLine('#f4f1e6', 0.7),
    layS: dashedLine('#ffd34d', 0.55),
    layP: dashedLine('#ffd34d', 0.55)
  }
  Object.values(lines).forEach(l => scene.add(l))

  let boats = []
  let boatRace = null
  const cam = { pos: new THREE.Vector3(30, 12, 60), look: new THREE.Vector3(), h: 0, init: false }
  const labels = []
  let bakeTick = 0
  let size = { w: 1, h: 1 }

  function applyLook(idx, def) {
    look = LOOKS[idx] || LOOKS[0]
    const az = def.sun.az * DEG
    const el = def.sun.el * DEG
    const sunDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize()
    for (const m of [skyMat, waterMat]) {
      m.uniforms.uTop.value.set(look.top)
      m.uniforms.uHorizon.value.set(look.horizon)
      m.uniforms.uSun.value.set(look.sun)
      m.uniforms.uSunDir.value.copy(sunDir)
    }
    waterMat.uniforms.uDeep.value.set(look.deep)
    waterMat.uniforms.uPaw.value.set(look.paw)
    waterMat.uniforms.uHaze.value.set(look.haze)
    waterMat.uniforms.uSwell.value = idx === 1 ? 0.55 : 0.28
    scene.fog.color.set(look.haze)
    sunLight.color.set(look.sun)
    sunLight.position.copy(sunDir).multiplyScalar(300)
    hemi.color.set(look.top).lerp(new THREE.Color('#ffffff'), 0.5)
    renderer.toneMappingExposure = look.exposure
    scene.remove(shore)
    disposeTree(shore)
    shore = makeShore(look)
    scene.add(shore)
  }

  function setRace(race) {
    for (const m of boats) {
      scene.remove(m.root)
      scene.remove(m.wake.mesh)
      m.geos.forEach(g => g.dispose())
      m.mats.forEach(x => x.dispose())
      m.wake.mesh.geometry.dispose()
      m.wake.mesh.material.dispose()
      disposeTree(m.cat)
    }
    labels.forEach(l => l.el.remove())
    labels.length = 0
    boats = race.boats.map(b => {
      const m = makeBoat(b)
      m.wake = makeWake()
      scene.add(m.root, m.wake.mesh)
      const el = document.createElement('div')
      el.className = 'cp-tag' + (b.you ? ' is-you' : '')
      el.innerHTML = `<span class="cp-tag-name"></span><span class="cp-tag-hail"></span>`
      labelLayer.appendChild(el)
      labels.push({ el, name: el.firstChild, hail: el.lastChild, b, hailText: '', hailUntil: 0 })
      return m
    })
    const markEl = document.createElement('div')
    markEl.className = 'cp-tag is-mark'
    markEl.innerHTML = '<span class="cp-tag-name">windward mark</span><span class="cp-tag-hail"></span>'
    labelLayer.appendChild(markEl)
    labels.push({ el: markEl, name: markEl.firstChild, hail: markEl.lastChild, mark: true })
    boatRace = race
    applyLook(race.idx, race.def)
    markObj.position.copy(toWorld(race.mark.x, race.mark.y))
    pinObj.position.copy(toWorld(PIN.x, PIN.y))
    committee.position.copy(toWorld(COMMITTEE.x + 3.2, COMMITTEE.y))
    committee.rotation.y = Math.PI / 2
    setLine(lines.start, PIN, COMMITTEE)
    cam.init = false
  }

  function resize(w, h, dpr) {
    size = { w, h }
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.fov = w / h < 0.8 ? 66 : 50
    camera.updateProjectionMatrix()
  }

  const v3 = new THREE.Vector3()
  function render(race, dt, view, flags = {}) {
    const t = race.t
    const reduced = !!flags.reduced
    if (race !== boatRace) setRace(race)
    // wind on the water
    bakeTick += 1
    if (bakeTick % 3 === 0 || !cam.init) {
      bakeWind(race.wind, race.boats, windData, TEX)
      windTex.needsUpdate = true
    }
    waterMat.uniforms.uTime.value = t
    waterMat.uniforms.uMotion.value = reduced ? 0.25 : 1
    waterMat.uniforms.uBaseDir.value = race.cfg.dir
    waterMat.uniforms.uBaseSpd.value = race.cfg.speed * buildFactor(race.cfg, race.wind.t)
    waterMat.uniforms.uNorm.value = race.cfg.speed

    // boats
    race.boats.forEach((b, i) => {
      const m = boats[i]
      m.root.position.set(b.x, reduced ? 0 : Math.sin(t * 1.7 + i) * 0.05, -b.y)
      m.root.rotation.y = -b.h
      const side = b.twa >= 0 ? 1 : -1
      const want = (b.capsized ? 88 : b.heel) * DEG
      m.heel += (want - m.heel) * Math.min(1, dt * (b.capsized ? 2.2 : 5))
      m.roll.rotation.z = -side * m.heel
      m.roll.rotation.x = reduced ? 0 : Math.sin(t * 2.1 + i * 1.3) * 0.02 * Math.min(1, b.tws / 6)
      m.boomG.rotation.y = side * (b.capsized ? 0.3 : b.boom)
      updateSail(m, b, t, reduced)
      // the cat sits to windward and hikes out over the side
      const wind = -side
      const out = b.hike
      m.cat.position.set(wind * (0.48 + out * 0.2), 0.26, 1.0)
      m.cat.rotation.z = -wind * out * 1.15
      m.cat.rotation.y = wind * 0.6
      m.cat.userData.head.rotation.y = -wind * 0.5
      m.cat.userData.tail.rotation.x = Math.sin(t * 2 + i) * 0.3
      updateWake(m.wake, b, dt)
    })

    // marks and flags
    markObj.position.y = Math.sin(t * 1.3) * 0.12
    pinObj.position.y = Math.sin(t * 1.5 + 1) * 0.1
    const clock = race.t - race.gunAt
    const f = committee.userData.flags
    f.class.visible = clock >= -45 && clock < 0
    f.p.visible = clock >= -30 && clock < -10
    f.x.visible = race.boats.some(b => b.ocs) && clock < 30
    for (const [k, fl] of Object.entries(f)) if (fl.visible) waveFlag(fl, t, k.length)
    waveFlag(pinFlag, t, 3)
    if (shore.userData.lantern) shore.userData.lantern.visible = Math.sin(t * 1.3) > -0.2

    // the tactician's laylines from the windward mark, on the mean wind
    const you = race.boats[0]
    const mean = you.mean ?? race.cfg.dir
    const L = 150
    const show = !race.attract && (you.leg === 'beat' || you.leg === 'prestart') && flags.laylines !== false
    lines.layS.visible = lines.layP.visible = show
    if (show) {
      const ms = mean + Math.PI - CLOSE
      const mp = mean + Math.PI + CLOSE
      setLine(lines.layS, race.mark, { x: race.mark.x + Math.sin(ms) * L, y: race.mark.y + Math.cos(ms) * L })
      setLine(lines.layP, race.mark, { x: race.mark.x + Math.sin(mp) * L, y: race.mark.y + Math.cos(mp) * L })
    }
    lines.start.visible = race.attract || you.leg === 'prestart' || you.leg === 'run' || you.finished

    // camera
    const target = race.attract ? race.standings?.[0] || you : you
    const k = 1 - Math.exp(-dt * (reduced ? 1.6 : 2.4))
    if (!cam.init) {
      cam.h = target.h
    }
    cam.h += wrap(target.h - cam.h) * (1 - Math.exp(-dt * (reduced ? 0.9 : 1.4)))
    const portrait = size.w / size.h < 0.8
    let px, py, pz, lx, ly, lz
    if (view === 'high') {
      const up = mean
      px = target.x - Math.sin(up) * 70
      pz = -(target.y - Math.cos(up) * 70)
      py = portrait ? 105 : 85
      lx = target.x + Math.sin(up) * 30
      lz = -(target.y + Math.cos(up) * 30)
      ly = 0
    } else if (race.attract) {
      // stand down-sun of the leader so the sails are backlit and the sun's road runs past them
      const a = race.def.sun.az * DEG + Math.PI + 0.45 * Math.sin(t * 0.03)
      px = target.x + Math.sin(a) * 30
      pz = -(target.y + Math.cos(a) * 30)
      py = 8
      lx = target.x - Math.sin(a) * 30
      lz = -(target.y - Math.cos(a) * 30)
      ly = 2
    } else {
      const back = portrait ? 21 : 17
      const height = portrait ? 11.5 : 9.5
      px = target.x - Math.sin(cam.h) * back
      pz = -(target.y - Math.cos(cam.h) * back)
      py = height
      lx = target.x + Math.sin(cam.h) * 34
      lz = -(target.y + Math.cos(cam.h) * 34)
      ly = 0
    }
    if (!cam.init) {
      cam.pos.set(px, py, pz)
      cam.look.set(lx, ly, lz)
      cam.init = true
    } else {
      cam.pos.lerp(v3.set(px, py, pz), k)
      cam.look.lerp(v3.set(lx, ly, lz), k)
    }
    camera.position.copy(cam.pos)
    camera.lookAt(cam.look)
    sky.position.copy(camera.position)
    renderer.render(scene, camera)

    // labels that ride with the boats; nudged upward when they would collide
    const placed = []
    for (const l of labels) {
      let wp
      if (l.mark) {
        wp = v3.set(race.mark.x, 3.2, -race.mark.y)
        l.el.style.display = race.attract || you.leg !== 'beat' ? 'none' : ''
      } else {
        const b = l.b
        wp = v3.set(b.x, 7.6, -b.y)
        const hail = race.hails.findLast?.(h => h.from === b.id && race.t - h.t < 2.6)
        const owe = b.penalty > 0 ? ' · owes a turn' : ''
        const txt = b.you ? (race.attract || view !== 'high' ? '' : 'you') : b.name + (b.finished ? ' ✓' : '') + owe
        if (l.name.textContent !== txt) l.name.textContent = txt
        const ht = hail ? hail.text : ''
        if (l.hail.textContent !== ht) l.hail.textContent = ht
        l.el.classList.toggle('has-hail', !!hail)
        l.el.style.display = txt || ht ? '' : 'none'
      }
      wp.project(camera)
      const vis = wp.z < 1 && Math.abs(wp.x) < 1.1 && Math.abs(wp.y) < 1.1
      // names fade with distance from your own boat, not the camera; you and the mark are always named
      const ox = l.mark ? race.mark.x : l.b.x
      const oy = l.mark ? race.mark.y : l.b.y
      const always = l.mark || l.b.you
      const d = always ? 0 : Math.hypot(ox - you.x, oy - you.y)
      const maxD = size.w < 700 ? 120 : 260
      if (!vis || d > maxD) {
        l.el.style.opacity = '0'
        continue
      }
      const p = v3.set(l.mark ? race.mark.x : l.b.x, l.mark ? 3.2 : 7.6, -(l.mark ? race.mark.y : l.b.y)).project(camera)
      const tw = (l.name.textContent.length || 3) * 7 + 14
      const sx = Math.min(size.w - tw / 2 - 4, Math.max(tw / 2 + 4, (p.x * 0.5 + 0.5) * size.w))
      let sy = (-p.y * 0.5 + 0.5) * size.h
      for (let guard = 0; guard < 6; guard++) {
        const hit = placed.find(r => Math.abs(r.x - sx) < (r.w + tw) / 2 && Math.abs(r.y - sy) < 19)
        if (!hit) break
        sy = hit.y - 20
      }
      if (sy < 70) {
        l.el.style.opacity = '0'
        continue
      }
      placed.push({ x: sx, y: sy, w: tw })
      l.el.style.opacity = d > maxD - 30 ? String(Math.max(0, (maxD - d) / 30)) : '1'
      l.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -100%)`
    }
  }

  function disposeTree(o) {
    o.traverse(n => {
      if (n.geometry) n.geometry.dispose()
      if (n.material) {
        const ms = Array.isArray(n.material) ? n.material : [n.material]
        ms.forEach(m => { if (m.map) m.map.dispose(); m.dispose() })
      }
    })
  }

  function dispose() {
    labels.forEach(l => l.el.remove())
    disposeTree(scene)
    windTex.dispose()
    renderer.dispose()
  }

  return { setRace, render, resize, dispose, renderer, camera }
}
