import * as THREE from 'three'
import { LANE, PAINTABLE } from './geometry'
import { SIGIL_RES } from './sigils'

// The lane in WebGL. Paint is projective: every painted layer is a projector
// (an eye run backwards) with its own depth tile, so the WebGL picture and the
// CPU sight tests agree about where every fragment lands.

export const MAX_LAYERS = 6
const TILE = SIGIL_RES
const ATLAS_W = 3
const ATLAS_H = 2
const DEPTH_RANGE = 90

const MAT_COLOR = {
  plaster: '#efe5d3', stone: '#cdbb9f', cobble: '#a3927b', board: '#f6f0e4', wood: '#7a5634',
  terracotta: '#b65a34', cloth: '#ece3cc', shutter: '#3f6c8c', glass: '#22384a', water: '#1f4d66',
  leaf: '#5e6c3b', brass: '#8a6c3c'
}
const GRAIN = { plaster: 1, stone: 1, cobble: 2, board: 3, wood: 3, terracotta: 1, cloth: 3 }

export const HOURS = {
  'late afternoon': { sky: ['#f7d9a8', '#9fc2d8'], sun: '#ffe2b0', sunI: 2.6, hemi: ['#fff1da', '#7d6b55'], hemiI: 1.0, sunDir: [6, 9, 7], fog: '#e8d3b0', windows: 0, sea: '#2b6683' },
  'golden hour': { sky: ['#f6b26b', '#7fa8c6'], sun: '#ffc27a', sunI: 2.5, hemi: ['#ffe0b8', '#6c5640'], hemiI: 0.9, sunDir: [9, 5, 6], fog: '#e7b98a', windows: 0.1, sea: '#2d5d78' },
  dusk: { sky: ['#e58a6a', '#4f5f8c'], sun: '#ff9a6a', sunI: 1.5, hemi: ['#f0b8a0', '#3e3a52'], hemiI: 0.95, sunDir: [10, 2.6, 4], fog: '#a77a7a', windows: 0.55, sea: '#2a3e60' },
  'blue hour': { sky: ['#5b6fa8', '#1b2547'], sun: '#9fb4ff', sunI: 0.55, hemi: ['#9db0e8', '#2a2638'], hemiI: 1.15, sunDir: [-6, 7, 5], fog: '#3a4670', windows: 1, sea: '#18284a' },
  night: { sky: ['#3a3f78', '#0d1230'], sun: '#ffd2a0', sunI: 0.6, hemi: ['#b0b8f0', '#3a2c2a'], hemiI: 1.45, sunDir: [-5, 8, 4], fog: '#2b3260', windows: 1, sea: '#121c3c' }
}

const PAINT_GLSL = /* glsl */`
uniform mat4 epVP[${MAX_LAYERS}];
uniform vec4 epPos[${MAX_LAYERS}];
uniform vec4 epLook[${MAX_LAYERS}];
uniform vec3 epColor[${MAX_LAYERS}];
uniform sampler2D epSigil;
uniform sampler2D epDepth;
uniform float epTime;
uniform float epPaintable;
uniform float epGrain;
uniform float epLit;
uniform vec2 epDepthTexel;
uniform float epDepthTile;
uniform float epWindows;
varying vec3 vEpWorld;
varying vec3 vEpNormal;
vec3 epGlowAcc;

float epHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float epNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(epHash(i), epHash(i + vec2(1, 0)), u.x), mix(epHash(i + vec2(0, 1)), epHash(i + vec2(1, 1)), u.x), u.y);
}

vec3 epSurface(vec3 base) {
  epGlowAcc = vec3(0.0);
  vec3 n = normalize(vEpNormal);
  vec2 wp = abs(n.y) > 0.5 ? vEpWorld.xz : (abs(n.x) > 0.5 ? vEpWorld.zy : vEpWorld.xy);
  if (epGrain > 0.5 && epGrain < 1.5) {
    float g = epNoise(wp * 3.1) * 0.6 + epNoise(wp * 13.0) * 0.4;
    base *= 0.93 + 0.1 * g;
  } else if (epGrain > 1.5 && epGrain < 2.5) {
    vec2 c = wp * vec2(2.6, 3.4);
    c.x += step(1.0, mod(floor(c.y), 2.0)) * 0.5;
    vec2 f = fract(c) - 0.5;
    float edge = smoothstep(0.5, 0.38, max(abs(f.x), abs(f.y)));
    float tone = 0.82 + 0.24 * epHash(floor(c));
    base *= mix(0.62, tone, edge);
  } else if (epGrain > 2.5) {
    float g = epNoise(vec2(wp.x * 1.2, wp.y * 18.0));
    base *= 0.9 + 0.16 * g;
  }
  if (epPaintable < 0.5) {
    if (epLit > 0.5 && epWindows > 0.0 && n.y < 0.5) epGlowAcc += vec3(1.0, 0.72, 0.38) * epWindows * 0.9 * (0.8 + 0.2 * epNoise(wp * 2.0));
    return base;
  }
  vec3 col = base;
  for (int i = 0; i < ${MAX_LAYERS}; i++) {
    vec4 pos = epPos[i];
    if (pos.w < 0.5) continue;
    vec4 look = epLook[i];
    vec4 c = epVP[i] * vec4(vEpWorld, 1.0);
    if (c.w <= 0.0) continue;
    vec2 ndc = c.xy / c.w;
    if (abs(ndc.x) > 1.0 || abs(ndc.y) > 1.0) continue;
    vec2 uv = ndc * 0.5 + 0.5;
    vec2 tile = vec2(mod(look.z, ${ATLAS_W}.0), floor(look.z / ${ATLAS_W}.0));
    vec2 tuv = (tile + uv * (${TILE - 2}.0 / ${TILE}.0) + 1.0 / ${TILE}.0) / vec2(${ATLAS_W}.0, ${ATLAS_H}.0);
    float dist = length(vEpWorld - pos.xyz);
    // grazing surfaces span many metres per depth texel: widen the bias with the slope
    float ndl = max(abs(dot(n, normalize(pos.xyz - vEpWorld))), 0.06);
    float bias = 0.05 + dist * 0.006 + min(1.2, dist * 0.003 / ndl);
    // depth tile lookup, dilated by one texel so silhouettes do not leave notches
    vec2 duv = (tile + clamp(uv, 0.5 / epDepthTile, 1.0 - 0.5 / epDepthTile)) * epDepthTile * epDepthTexel;
    float hitD = 0.0;
    for (int k = 0; k < 5; k++) {
      vec2 o = k == 0 ? vec2(0.0) : (k == 1 ? vec2(1.0, 0.0) : (k == 2 ? vec2(-1.0, 0.0) : (k == 3 ? vec2(0.0, 1.0) : vec2(0.0, -1.0))));
      float stored = unpackRGBAToDepth(texture2D(epDepth, duv + o * epDepthTexel)) * ${DEPTH_RANGE}.0;
      if (abs(dist - stored) <= bias) { hitD = 1.0; break; }
    }
    if (hitD < 0.5) continue;
    float m = texture2D(epSigil, tuv).r;
    float alpha = look.x;
    if (look.y > 0.5) {
      // projector light: the stencil shining onto whatever stands in the beam
      float flick = 0.92 + 0.08 * sin(epTime * 7.0 + float(i));
      epGlowAcc += epColor[i] * (m * 0.85 + 0.05) * alpha * flick;
      col = mix(col, col * 0.85 + epColor[i] * 0.25, m * alpha * 0.6);
    } else {
      // laid paint: matte, a little thin where the brush ran dry, revealed as it dries
      float grain = epNoise(wp * 9.0 + float(i) * 3.7);
      float sweep = epNoise(wp * 0.7 + float(i));
      float shown = smoothstep(sweep - 0.08, sweep + 0.08, look.w * 1.2 - 0.1);
      float mm = smoothstep(0.32, 0.68, m + (grain - 0.5) * 0.22) * shown;
      vec3 paint = epColor[i] * (0.9 + 0.12 * grain);
      col = mix(col, paint, mm * alpha);
    }
  }
  return col;
}
`

const DIST_VERT = /* glsl */`
varying vec3 vW;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
`
const DIST_FRAG = /* glsl */`
#include <packing>
uniform vec3 uEye;
varying vec3 vW;
void main() { gl_FragColor = packDepthToRGBA(clamp(length(vW - uEye) / ${DEPTH_RANGE}.0, 0.0, 0.9999)); }
`

const SKY_VERT = /* glsl */`
varying vec3 vDir;
void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const SKY_FRAG = /* glsl */`
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunDir;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y * 1.6 + 0.08, 0.0, 1.0);
  vec3 col = mix(uHorizon, uTop, pow(h, 0.7));
  float s = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSun * (pow(s, 220.0) * 1.4 + pow(s, 9.0) * 0.18);
  gl_FragColor = vec4(col, 1.0);
}
`

function catFigure(color = '#111014', eyes = '#ffd36b', pose = 'sit', lamp = false) {
  const g = new THREE.Group()
  const fur = new THREE.MeshLambertMaterial({ color })
  const eyeM = new THREE.MeshBasicMaterial({ color: eyes })
  const s = pose === 'sit' ? 1 : 1.12
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 14), fur)
  body.scale.set(1, pose === 'sit' ? 1.45 : 1.25, 0.95)
  body.position.y = 0.46 * s
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), fur)
  head.position.set(0, 0.98 * s, 0.05)
  const ear = new THREE.ConeGeometry(0.08, 0.18, 4)
  const earL = new THREE.Mesh(ear, fur); earL.position.set(-0.12, 1.17 * s, 0.03); earL.rotation.z = 0.25
  const earR = new THREE.Mesh(ear, fur); earR.position.set(0.12, 1.17 * s, 0.03); earR.rotation.z = -0.25
  const eyeG = new THREE.SphereGeometry(0.035, 8, 6)
  const eL = new THREE.Mesh(eyeG, eyeM); eL.position.set(-0.08, 1.0 * s, 0.24)
  const eR = new THREE.Mesh(eyeG, eyeM); eR.position.set(0.08, 1.0 * s, 0.24)
  const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.12, -0.28), new THREE.Vector3(0.18, 0.06, -0.42), new THREE.Vector3(0.36, 0.2, -0.3), new THREE.Vector3(0.4, 0.42, -0.12)
  ]), 16, 0.045, 6), fur)
  g.add(body, head, earL, earR, eL, eR, tail)
  if (lamp) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.1, 5), new THREE.MeshLambertMaterial({ color: '#3a2a1a' }))
    pole.position.set(0.34, 0.95, 0.18); pole.rotation.z = -0.35
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffcf7a' }))
    glow.position.set(0.52, 1.46, 0.18)
    const light = new THREE.PointLight('#ffbf66', 1.6, 6, 1.6)
    light.position.copy(glow.position)
    g.add(pole, glow, light)
    g.userData.lamp = light
  }
  g.traverse(o => { o.layers.set(1); if (o.isMesh) o.castShadow = true })
  g.userData.head = head
  return g
}

export function createScene(canvas, opts = {}) {
  const reduced = { value: !!opts.reduced }
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.mobile ? 1.6 : 1.75))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.02

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(48, 1, 0.08, 700)
  camera.layers.enable(1)

  // shared projector uniforms
  const U = {
    epVP: { value: Array.from({ length: MAX_LAYERS }, () => new THREE.Matrix4()) },
    epPos: { value: Array.from({ length: MAX_LAYERS }, () => new THREE.Vector4()) },
    epLook: { value: Array.from({ length: MAX_LAYERS }, () => new THREE.Vector4(0, 0, 0, 1)) },
    epColor: { value: Array.from({ length: MAX_LAYERS }, () => new THREE.Color('#d8361d')) },
    epSigil: { value: null },
    epDepth: { value: null },
    epTime: { value: 0 },
    epWindows: { value: 0 }
  }

  // sigil atlas: one red channel, tiles flipped so v grows upward
  const atlasData = new Uint8Array(TILE * ATLAS_W * TILE * ATLAS_H)
  const atlas = new THREE.DataTexture(atlasData, TILE * ATLAS_W, TILE * ATLAS_H, THREE.RedFormat, THREE.UnsignedByteType)
  atlas.magFilter = THREE.LinearFilter
  atlas.minFilter = THREE.LinearFilter
  atlas.generateMipmaps = false
  atlas.needsUpdate = true
  U.epSigil.value = atlas

  const DTILE = opts.mobile ? 768 : 1024
  U.epDepthTile = { value: DTILE }
  U.epDepthTexel = { value: new THREE.Vector2(1 / (DTILE * ATLAS_W), 1 / (DTILE * ATLAS_H)) }
  const depthRT = new THREE.WebGLRenderTarget(DTILE * ATLAS_W, DTILE * ATLAS_H, {
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, generateMipmaps: false
  })
  U.epDepth.value = depthRT.texture
  const distMat = new THREE.ShaderMaterial({ vertexShader: DIST_VERT, fragmentShader: DIST_FRAG, uniforms: { uEye: { value: new THREE.Vector3() } }, side: THREE.DoubleSide })
  const projCam = new THREE.PerspectiveCamera(50, 1, 0.05, DEPTH_RANGE)

  const patch = (mat, matKey) => {
    const own = { epPaintable: { value: PAINTABLE[matKey] ? 1 : 0 }, epGrain: { value: GRAIN[matKey] || 0 }, epLit: { value: matKey === 'glass' ? 1 : 0 } }
    mat.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, U, own)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vEpWorld;\nvarying vec3 vEpNormal;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvEpWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvEpNormal = normalize(mat3(modelMatrix) * objectNormal);')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <packing>', '#include <packing>\n' + PAINT_GLSL)
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = epSurface(diffuseColor.rgb);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += epGlowAcc;')
    }
    mat.customProgramCacheKey = () => 'eyepoint-paint'
    return mat
  }
  const materials = {}
  const materialFor = key => {
    if (!materials[key]) materials[key] = patch(new THREE.MeshLambertMaterial({ color: MAT_COLOR[key] || '#cccccc' }), key)
    return materials[key]
  }

  // sky, sun, haze
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({
    vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false,
    uniforms: { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() } }
  }))
  sky.layers.set(1)
  scene.add(sky)
  scene.fog = new THREE.Fog('#e8d3b0', 40, 260)
  const hemi = new THREE.HemisphereLight('#fff', '#666', 1)
  const sun = new THREE.DirectionalLight('#fff', 2)
  sun.castShadow = true
  sun.shadow.mapSize.set(opts.mobile ? 1024 : 2048, opts.mobile ? 1024 : 2048)
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 80 })
  sun.shadow.bias = -0.0006
  sun.shadow.normalBias = 0.03
  sun.shadow.camera.layers.enable(1)
  sun.target.position.set(0, 0, -1)
  scene.add(hemi, sun, sun.target)

  // the lane
  const solidMeshes = new Map()
  const buildSolid = s => {
    let geo
    if (s.kind === 'cyl') {
      geo = s.mat === 'leaf' ? new THREE.SphereGeometry(1, 18, 12) : new THREE.CylinderGeometry(s.r, s.r, s.h, 24)
    } else geo = new THREE.BoxGeometry(s.w, s.h, s.d)
    const mesh = new THREE.Mesh(geo, materialFor(s.mat))
    if (s.mat === 'leaf') mesh.scale.set(s.r, s.h / 2, s.r)
    mesh.position.set(s.x, s.y + s.h / 2, s.z)
    mesh.rotation.y = s.ry || 0
    mesh.castShadow = s.mat !== 'water'
    mesh.receiveShadow = true
    mesh.userData.solid = s
    return mesh
  }
  for (const s of LANE) {
    if (s.mat === 'leaf') continue // drawn as a crown below, tested as a cylinder
    const m = buildSolid(s)
    solidMeshes.set(s.id, m)
    scene.add(m)
  }
  // the olive crown is a cylinder to the sight tests; draw it as clustered leaves inside that cylinder
  const crownSolid = LANE.find(s => s.id === 'olive-crown')
  if (crownSolid) {
    const crown = new THREE.Group()
    const leafMat = materialFor('leaf')
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4
      const r = i === 0 ? 0 : crownSolid.r * 0.55
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(crownSolid.r * (i === 0 ? 0.62 : 0.48), 1), leafMat)
      b.position.set(crownSolid.x + Math.cos(a) * r, crownSolid.y + crownSolid.h * (0.45 + 0.12 * Math.sin(i * 1.7)), crownSolid.z + Math.sin(a) * r)
      b.castShadow = true
      crown.add(b)
    }
    scene.add(crown)
  }
  // the town around the lane: scenery only, never in the sight tests or the depth tiles
  const town = new THREE.Group()
  const hill = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: '#b39c7c' }))
  hill.rotation.x = -Math.PI / 2
  hill.position.set(0, -0.42, 191)
  hill.receiveShadow = true
  town.add(hill)
  const blockMat = [new THREE.MeshLambertMaterial({ color: '#e9dcc4' }), new THREE.MeshLambertMaterial({ color: '#dccbb0' }), new THREE.MeshLambertMaterial({ color: '#efe3cf' })]
  const roofMat = new THREE.MeshLambertMaterial({ color: '#a9502e' })
  let seed = 11
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const addBlock = (x, z, w, d, h) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), blockMat[Math.floor(rnd() * 3)])
    b.position.set(x, h / 2 - 0.4, z)
    b.castShadow = true; b.receiveShadow = true
    const r = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.3, d + 0.3), roofMat)
    r.position.set(x, h - 0.25, z)
    town.add(b, r)
  }
  for (let i = 0; i < 7; i++) addBlock(-15.5 - rnd() * 3, -7 + i * 2.6, 3 + rnd() * 2, 2.4, 4.5 + rnd() * 4)
  for (let i = 0; i < 7; i++) addBlock(15.5 + rnd() * 3, -7 + i * 2.6, 3 + rnd() * 2, 2.4, 4 + rnd() * 4)
  for (let i = 0; i < 9; i++) addBlock(-16 + i * 4, 15 + rnd() * 3, 3.2, 3 + rnd() * 2, 1.2 + rnd() * 1.2)
  // a low parapet along the open south side of the lane
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(26, 0.5, 0.35), new THREE.MeshLambertMaterial({ color: '#d9c7a8' }))
  parapet.position.set(0, -0.15, 7.15)
  parapet.receiveShadow = true
  town.add(parapet)
  // a headland across the bay
  const head = new THREE.Mesh(new THREE.ConeGeometry(60, 18, 7, 1), new THREE.MeshLambertMaterial({ color: '#7d7f6a' }))
  head.position.set(-120, -9, -230); head.scale.set(2.4, 1, 1)
  town.add(head)
  town.traverse(o => o.layers.set(1))
  scene.add(town)

  // lamp head and a string of bulbs across the lane (decoration, outside the sight tests)
  const deco = new THREE.Group()
  const bulbMat = new THREE.MeshBasicMaterial({ color: '#ffd9a0' })
  const lampHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), bulbMat)
  lampHead.position.set(6.6, 3.5, 1.6)
  const lampLight = new THREE.PointLight('#ffc477', 0, 11, 1.4)
  lampLight.position.copy(lampHead.position)
  deco.add(lampHead, lampLight)
  const bulbs = []
  const wire = []
  for (let i = 0; i <= 14; i++) {
    const t = i / 14
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), bulbMat)
    b.position.set(-10 + t * 20, 6.0 - Math.sin(t * Math.PI) * 1.1, 1.8 + t * 0.6)
    deco.add(b); bulbs.push(b)
    wire.push(b.position.clone().add(new THREE.Vector3(0, 0.07, 0)))
  }
  deco.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(wire), new THREE.LineBasicMaterial({ color: '#3a2c22' })))
  deco.traverse(o => o.layers.set(1))
  scene.add(deco)

  // props
  const propMeshes = new Map()
  const syncProp = p => {
    let m = propMeshes.get(p.id)
    if (!m) {
      const mat = patch(new THREE.MeshLambertMaterial({ color: MAT_COLOR[p.mat] }), p.mat)
      m = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), mat)
      m.castShadow = true; m.receiveShadow = true
      m.userData.prop = p.id
      // feet so a board reads as standing, not floating
      const footMat = new THREE.MeshLambertMaterial({ color: '#5b4128' })
      if (p.shape !== 'crate') {
        for (const sx of [-0.35, 0.35]) {
          const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.7), footMat)
          foot.position.set(sx * p.w, -p.h / 2 + 0.04, 0)
          foot.layers.set(1)
          m.add(foot)
        }
      }
      propMeshes.set(p.id, m)
      scene.add(m)
    }
    m.position.set(p.x, p.y + p.h / 2, p.z)
    m.rotation.y = p.ry
    m.userData.locked = !!p.locked
    return m
  }
  const removeProp = id => {
    const m = propMeshes.get(id)
    if (!m) return
    scene.remove(m)
    m.geometry.dispose(); m.material.dispose()
    m.children.forEach(c => c.geometry.dispose())
    propMeshes.delete(id)
  }
  let selected = null
  let invalidFlash = 0
  // in a watcher's eyes the boards are ghosts: he walks, they hide nothing
  const setGhost = on => {
    for (const m of propMeshes.values()) {
      m.material.transparent = on
      m.material.opacity = on ? 0.22 : 1
      m.material.depthWrite = !on
      m.material.needsUpdate = true
      m.castShadow = !on
    }
  }
  const setSelected = (id, bad = false) => {
    selected = id
    if (bad) invalidFlash = 1
    for (const [pid, m] of propMeshes) m.material.emissive.set(pid === id ? '#5a3a10' : '#000000')
  }

  // figures, view cones, clear rings
  const figures = new THREE.Group()
  scene.add(figures)
  const figureMap = new Map()
  const tagAnchors = []
  const setFigures = (list, rings) => {
    for (const c of figures.children.slice()) {
      figures.remove(c)
      c.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose?.() } })
    }
    figureMap.clear()
    tagAnchors.length = 0
    for (const f of list) {
      const g = catFigure(f.fur || '#121016', f.eyes || '#ffd36b', f.pose || 'sit', !!f.lamp)
      const eyeY = f.pose === 'stand' ? 1.12 : 1.0
      g.position.set(f.pos[0], f.pos[1] - eyeY, f.pos[2])
      g.rotation.y = Math.atan2(f.aim[0] - f.pos[0], f.aim[2] - f.pos[2])
      g.scale.setScalar(f.scale || 1)
      figures.add(g)
      figureMap.set(f.id, g)
      if (f.cone) {
        // a pale wedge on the cobbles: what this one can see
        const half = (f.cone * Math.PI) / 180
        const shape = new THREE.Shape()
        shape.moveTo(0, 0)
        const R = 12
        for (let i = 0; i <= 24; i++) {
          const a = -half + (2 * half * i) / 24
          shape.lineTo(Math.sin(a) * R, Math.cos(a) * R)
        }
        shape.lineTo(0, 0)
        const wedge = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: f.coneColor || '#2b3550', transparent: true, opacity: 0.13, depthWrite: false }))
        wedge.rotation.x = -Math.PI / 2
        const holder = new THREE.Group()
        holder.position.set(f.pos[0], 0.02, f.pos[2])
        holder.rotation.y = g.rotation.y + Math.PI
        wedge.rotation.z = Math.PI
        holder.add(wedge)
        holder.traverse(o => o.layers.set(1))
        figures.add(holder)
      }
      tagAnchors.push({ id: f.id, pos: new THREE.Vector3(f.pos[0], f.pos[1] + 0.55, f.pos[2]) })
    }
    for (const r of rings || []) {
      const pts = []
      for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2; pts.push(new THREE.Vector3(r.x + Math.cos(a) * r.r, 0.03, r.z + Math.sin(a) * r.r)) }
      const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: '#6b4a2a', dashSize: 0.3, gapSize: 0.22, transparent: true, opacity: 0.55 }))
      line.computeLineDistances()
      line.layers.set(1)
      figures.add(line)
    }
  }
  // hide whoever's eye we borrow, and anyone sitting close enough to fill the frame
  const hideFigure = (id, near = null) => {
    for (const [fid, g] of figureMap) {
      const close = near && Math.hypot(g.position.x - near[0], g.position.z - near[2]) < 2.6
      g.visible = fid !== id && !close
    }
  }

  // projector frustum wire for the live layer
  const frustumGeo = new THREE.BufferGeometry()
  frustumGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(16 * 3), 3))
  const frustum = new THREE.LineSegments(frustumGeo, new THREE.LineBasicMaterial({ color: '#ff7a4a', transparent: true, opacity: 0.35 }))
  frustum.layers.set(1)
  frustum.visible = false
  scene.add(frustum)
  const setFrustum = (eye, len = 3) => {
    if (!eye) { frustum.visible = false; return }
    const p = new THREE.Vector3(...eye.pos)
    const f = new THREE.Vector3(...eye.fwd); const r = new THREE.Vector3(...eye.right); const u = new THREE.Vector3(...eye.up)
    const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => p.clone().add(f.clone().add(r.clone().multiplyScalar(a * eye.tan)).add(u.clone().multiplyScalar(b * eye.tan)).multiplyScalar(len)))
    const arr = frustumGeo.attributes.position.array
    let k = 0
    const put = v => { arr[k++] = v.x; arr[k++] = v.y; arr[k++] = v.z }
    for (let i = 0; i < 4; i++) { put(p); put(cs[i]); put(cs[i]); put(cs[(i + 1) % 4]) }
    frustumGeo.attributes.position.needsUpdate = true
    frustumGeo.computeBoundingSphere()
    frustum.visible = true
  }

  // layers
  const layers = Array.from({ length: MAX_LAYERS }, () => ({ on: false, eye: null }))
  const writeTile = (tile, mask) => {
    const tx = tile % ATLAS_W; const ty = Math.floor(tile / ATLAS_W)
    const W = TILE * ATLAS_W
    for (let y = 0; y < TILE; y++) {
      const row = (ty * TILE + (TILE - 1 - y)) * W + tx * TILE
      for (let x = 0; x < TILE; x++) atlasData[row + x] = Math.round(mask[y * TILE + x] * 255)
    }
    atlas.needsUpdate = true
  }
  const depthDirty = new Set()
  const renderDepth = i => {
    const L = layers[i]
    if (!L.eye) return
    projCam.fov = L.eye.fov
    projCam.position.set(...L.eye.pos)
    projCam.up.set(0, 1, 0)
    projCam.lookAt(...L.eye.aim)
    projCam.updateProjectionMatrix()
    projCam.updateMatrixWorld()
    U.epVP.value[i].multiplyMatrices(projCam.projectionMatrix, projCam.matrixWorldInverse)
    distMat.uniforms.uEye.value.set(...L.eye.pos)
    const tx = i % ATLAS_W; const ty = Math.floor(i / ATLAS_W)
    const prevFog = scene.fog
    const prevBg = scene.background
    scene.fog = null
    scene.overrideMaterial = distMat
    depthRT.viewport.set(tx * DTILE, ty * DTILE, DTILE, DTILE)
    depthRT.scissor.set(tx * DTILE, ty * DTILE, DTILE, DTILE)
    depthRT.scissorTest = true
    renderer.setRenderTarget(depthRT)
    renderer.setClearColor(0xffffff, 1)
    renderer.clear(true, true, false)
    renderer.render(scene, projCam)
    renderer.setRenderTarget(null)
    scene.overrideMaterial = null
    scene.fog = prevFog
    scene.background = prevBg
  }
  const setLayer = (i, { eye, mask, color = '#d8361d', alpha = 1, mode = 'paint', reveal = 1 }) => {
    const L = layers[i]
    L.on = true; L.eye = eye
    if (mask) writeTile(i, mask)
    U.epPos.value[i].set(eye.pos[0], eye.pos[1], eye.pos[2], 1)
    U.epLook.value[i].set(alpha, mode === 'light' ? 1 : 0, i, reveal)
    U.epColor.value[i].set(color)
    depthDirty.add(i)
  }
  const setLayerLook = (i, { alpha, mode, reveal }) => {
    const v = U.epLook.value[i]
    if (alpha !== undefined) v.x = alpha
    if (mode !== undefined) v.y = mode === 'light' ? 1 : 0
    if (reveal !== undefined) v.w = reveal
  }
  const clearLayer = i => { layers[i].on = false; layers[i].eye = null; U.epPos.value[i].w = 0 }
  const markDepth = i => depthDirty.add(i)

  // time of day
  const hour = { from: HOURS['late afternoon'], to: HOURS['late afternoon'], t: 1 }
  const lerpC = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t)
  const applyHour = t => {
    const A = hour.from; const B = hour.to
    sky.material.uniforms.uHorizon.value.copy(lerpC(A.sky[0], B.sky[0], t))
    sky.material.uniforms.uTop.value.copy(lerpC(A.sky[1], B.sky[1], t))
    sky.material.uniforms.uSun.value.copy(lerpC(A.sun, B.sun, t))
    const sd = new THREE.Vector3(...A.sunDir).lerp(new THREE.Vector3(...B.sunDir), t)
    sky.material.uniforms.uSunDir.value.copy(sd).normalize()
    sun.position.copy(sd.clone().normalize().multiplyScalar(40))
    sun.color.copy(lerpC(A.sun, B.sun, t))
    sun.intensity = A.sunI + (B.sunI - A.sunI) * t
    hemi.color.copy(lerpC(A.hemi[0], B.hemi[0], t))
    hemi.groundColor.copy(lerpC(A.hemi[1], B.hemi[1], t))
    hemi.intensity = A.hemiI + (B.hemiI - A.hemiI) * t
    scene.fog.color.copy(lerpC(A.fog, B.fog, t))
    const w = A.windows + (B.windows - A.windows) * t
    U.epWindows.value = w
    lampLight.intensity = w * 5
    bulbMat.color.copy(lerpC('#8f8476', '#ffd9a0', w))
    materials.water?.color.copy(lerpC(A.sea, B.sea, t))
    figures.traverse(o => { if (o.isPointLight) o.intensity = 0.4 + w * 1.6 })
  }
  const setHour = (key, instant = false) => {
    hour.from = instant ? HOURS[key] : { ...hour.to }
    hour.to = HOURS[key]
    hour.t = instant || reduced.value ? 1 : 0
    applyHour(hour.t)
  }
  setHour('late afternoon', true)

  // cameras: an orbit over the lane, or an eye (a seat, a watcher, the walker)
  let aspect = 1
  const orbit = { yaw: 0.3, pitch: 0.56, radius: 19, target: new THREE.Vector3(-0.8, 1.1, -0.8) }
  const cam = {
    mode: 'orbit',
    pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 48,
    goal: { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 48 },
    tween: 1, tweenDur: 1.2, from: { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 48 }
  }
  const orbitPose = out => {
    // a tall screen sees less of the lane sideways: stand further back
    const r = orbit.radius * (aspect < 1 ? Math.min(1.45, aspect ** -0.5) : 1)
    out.pos.set(orbit.target.x + Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * r, orbit.target.y + Math.sin(orbit.pitch) * r, orbit.target.z + Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * r)
    out.look.copy(orbit.target)
    out.fov = 46
  }
  // the fov a viewer needs so their whole frame shows, whatever the screen shape
  const fitFov = (fov, margin = 1.12) => {
    const t = Math.tan((fov * Math.PI) / 360) * margin
    return (2 * Math.atan(t * Math.max(1, 1 / aspect)) * 180) / Math.PI
  }
  let arrivals = []
  const settle = () => { const a = arrivals; arrivals = []; a.forEach(r => r()) }
  // resolves when the camera has actually arrived, however slow the frames
  const goTo = (target, dur = 1.1) => new Promise(resolve => {
    settle()
    arrivals.push(resolve)
    cam.from.pos.copy(cam.pos); cam.from.look.copy(cam.look); cam.from.fov = cam.fov
    if (target === 'orbit') {
      cam.mode = 'orbit'
      orbitPose(cam.goal)
    } else {
      cam.mode = 'eye'
      cam.goal.pos.set(...target.pos)
      cam.goal.look.set(...target.aim)
      cam.goal.fov = fitFov(target.viewFov || target.fov, target.margin || 1.12)
      cam.eyeFov = target.viewFov || target.fov
      cam.eyeMargin = target.margin || 1.12
    }
    cam.tweenDur = dur
    cam.tween = reduced.value || dur === 0 ? 1 : 0
    if (cam.tween >= 1) { cam.pos.copy(cam.goal.pos); cam.look.copy(cam.goal.look); cam.fov = cam.goal.fov; settle() }
  })
  const setEyeLive = (pos, aim, fov) => {
    // the walker: follows input directly
    cam.mode = 'eye'
    cam.goal.pos.set(...pos); cam.goal.look.set(...aim); cam.goal.fov = fitFov(fov, 1.18)
    cam.eyeFov = fov; cam.eyeMargin = 1.18
    if (cam.tween >= 1) { cam.pos.copy(cam.goal.pos); cam.look.copy(cam.goal.look); cam.fov = cam.goal.fov }
  }
  orbitPose(cam); orbitPose(cam.goal)
  const orbitBy = (dyaw, dpitch) => {
    orbit.yaw += dyaw
    orbit.pitch = Math.max(0.12, Math.min(1.35, orbit.pitch + dpitch))
    if (cam.mode === 'orbit') { orbitPose(cam.goal); if (cam.tween >= 1) orbitPose(cam) }
  }
  const zoomBy = f => {
    orbit.radius = Math.max(7, Math.min(28, orbit.radius * f))
    if (cam.mode === 'orbit') { orbitPose(cam.goal); if (cam.tween >= 1) orbitPose(cam) }
  }

  // picking
  const ray = new THREE.Raycaster()
  ray.layers.set(0)
  const ndc = new THREE.Vector2()
  const toNdc = (x, y) => {
    const r = canvas.getBoundingClientRect()
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1)
  }
  const pickProp = (x, y) => {
    toNdc(x, y)
    ray.setFromCamera(ndc, camera)
    const list = [...propMeshes.values()].filter(m => !m.userData.locked)
    const hit = ray.intersectObjects(list, false)[0]
    return hit ? hit.object.userData.prop : null
  }
  const groundAt = (x, y, h = 0) => {
    toNdc(x, y)
    ray.setFromCamera(ndc, camera)
    const o = ray.ray.origin; const d = ray.ray.direction
    if (Math.abs(d.y) < 1e-4) return null
    const t = (h - o.y) / d.y
    if (t < 0) return null
    return [o.x + d.x * t, o.z + d.z * t]
  }
  const project = v => {
    const p = v.clone().project(camera)
    return { x: (p.x * 0.5 + 0.5) * width, y: (-p.y * 0.5 + 0.5) * height, front: p.z < 1 && p.z > -1 }
  }
  const camBasis = () => {
    const f = new THREE.Vector3(); camera.getWorldDirection(f)
    f.y = 0; f.normalize()
    return { fwd: [f.x, f.z], right: [-f.z, f.x] }
  }

  let width = 1; let height = 1
  const resize = (w, h) => {
    width = Math.max(1, w); height = Math.max(1, h)
    aspect = width / height
    renderer.setSize(width, height, false)
    camera.aspect = aspect
    if (cam.mode === 'orbit') { orbitPose(cam.goal); if (cam.tween >= 1) orbitPose(cam) }
    if (cam.mode === 'eye' && cam.eyeFov) { cam.goal.fov = fitFov(cam.eyeFov, cam.eyeMargin); if (cam.tween >= 1) cam.fov = cam.goal.fov }
    camera.updateProjectionMatrix()
  }

  let time = 0
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
  // dt drives the world; wall is real elapsed time, so tweens finish on time at any frame rate
  const frame = (dt, onTags, wall = dt) => {
    time += dt
    U.epTime.value = reduced.value ? 0 : time
    if (hour.t < 1) { hour.t = Math.min(1, hour.t + wall / 2.4); applyHour(ease(hour.t)) }
    if (cam.tween < 1) {
      cam.tween = Math.min(1, cam.tween + wall / cam.tweenDur)
      if (cam.tween >= 1) settle()
      const e = ease(cam.tween)
      cam.pos.lerpVectors(cam.from.pos, cam.goal.pos, e)
      cam.look.lerpVectors(cam.from.look, cam.goal.look, e)
      cam.fov = cam.from.fov + (cam.goal.fov - cam.from.fov) * e
      // a gentle arc so the camera does not pass through walls on long moves
      cam.pos.y += Math.sin(e * Math.PI) * Math.min(3, cam.from.pos.distanceTo(cam.goal.pos) * 0.18)
    } else if (cam.mode === 'eye') {
      cam.pos.lerp(cam.goal.pos, Math.min(1, dt * 14)); cam.look.lerp(cam.goal.look, Math.min(1, dt * 14)); cam.fov += (cam.goal.fov - cam.fov) * Math.min(1, dt * 10)
    }
    camera.position.copy(cam.pos)
    camera.lookAt(cam.look)
    if (Math.abs(camera.fov - cam.fov) > 1e-3) { camera.fov = cam.fov; camera.updateProjectionMatrix() }

    if (!reduced.value) {
      for (const g of figureMap.values()) {
        const h = g.userData.head
        if (h) h.rotation.z = Math.sin(time * 0.9 + g.position.x) * 0.06
      }
      bulbs.forEach((b, i) => { b.scale.setScalar(0.9 + 0.12 * Math.sin(time * 2 + i)) })
    }
    if (invalidFlash > 0) {
      invalidFlash = Math.max(0, invalidFlash - dt * 3)
      const m = selected && propMeshes.get(selected)
      if (m) m.material.emissive.setRGB(0.35 + invalidFlash * 0.5, 0.2 * (1 - invalidFlash), 0.05)
    }
    for (const i of depthDirty) renderDepth(i)
    depthDirty.clear()
    renderer.render(scene, camera)
    if (onTags) {
      const out = tagAnchors.map(a => {
        const p = project(a.pos)
        const on = p.front && p.x > -40 && p.x < width + 40 && p.y > 0 && p.y < height
        return { id: a.id, ...p, front: on, vis: figureMap.get(a.id)?.visible !== false }
      })
      onTags(out)
    }
  }

  const dispose = () => {
    scene.traverse(o => {
      if (o.isMesh || o.isLine || o.isLineSegments) {
        o.geometry?.dispose()
        const m = o.material
        if (Array.isArray(m)) m.forEach(x => x.dispose()); else m?.dispose()
      }
    })
    Object.values(materials).forEach(m => m.dispose())
    atlas.dispose(); depthRT.dispose(); distMat.dispose()
    renderer.dispose()
  }

  return {
    renderer, camera, frame, resize, dispose,
    setReduced: v => { reduced.value = v },
    setHour, setLayer, setLayerLook, clearLayer, markDepth,
    layerOn: i => layers[i].on,
    // render pending depth tiles now, before the lane changes under them
    flushDepth: () => { for (const i of depthDirty) renderDepth(i); depthDirty.clear() },
    syncProp, removeProp, setSelected, setGhost, setFigures, hideFigure, setFrustum,
    goTo, setEyeLive, orbitBy, zoomBy, camMode: () => cam.mode, camBusy: () => cam.tween < 1,
    pickProp, groundAt, camBasis,
    camPos: () => [camera.position.x, camera.position.y, camera.position.z]
  }
}
