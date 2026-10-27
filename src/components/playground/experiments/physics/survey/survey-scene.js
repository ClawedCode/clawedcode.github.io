import * as THREE from 'three'
import { CAIRNS, CAIRN, EYE, SIGNAL, VILLAGE, WORLD, WEATHER, height } from './survey-core'

const SKIES = {
  clear: { zenith: '#5f80a8', horizon: '#d6dcdc', sun: 0.55 },
  haze: { zenith: '#8494a6', horizon: '#cdcfc8', sun: 0.3 },
  valley: { zenith: '#6d87a6', horizon: '#e0e2df', sun: 0.45 },
  rain: { zenith: '#4f5862', horizon: '#848b92', sun: 0 }
}
const FLAGS = ['#d2452e', '#e1b04a', '#2f3f7a']
const SUN = new THREE.Vector3(-0.55, 0.62, 0.56).normalize()
const WHITE = new THREE.Color('#ffffff')

const terrainVertex = /* glsl */`
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`

const terrainFragment = /* glsl */`
uniform vec3 uSun;
uniform vec3 uFogColor;
uniform vec3 uCam;
uniform float uFog;
uniform float uValley;
uniform float uFogTop;
uniform float uInk;
uniform float uLight;
varying vec3 vWorld;
varying vec3 vNormal;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
void main() {
  float h = vWorld.y;
  vec3 n = normalize(vNormal);
  float slope = 1.0 - n.y;
  vec2 q = vWorld.xz;
  float broad = vnoise(q * 0.045);
  float tuft = vnoise(q * 0.16 + 3.1);
  float fine = vnoise(q * 0.9) * 0.6 + vnoise(q * 2.3) * 0.4;
  vec3 meadow = vec3(0.39, 0.46, 0.31);
  vec3 rush = vec3(0.47, 0.49, 0.34);
  vec3 heather = vec3(0.43, 0.33, 0.38);
  vec3 bracken = vec3(0.58, 0.42, 0.27);
  vec3 tops = vec3(0.55, 0.55, 0.45);
  vec3 scree = vec3(0.47, 0.46, 0.45);
  vec3 snow = vec3(0.93, 0.94, 0.96);
  vec3 water = vec3(0.34, 0.42, 0.5);
  vec3 col = mix(meadow, rush, smoothstep(0.35, 0.75, tuft));
  col = mix(col, heather, smoothstep(14.0, 38.0, h + (broad - 0.5) * 30.0));
  col = mix(col, bracken, smoothstep(0.55, 0.8, broad) * smoothstep(18.0, 34.0, h) * (1.0 - smoothstep(70.0, 95.0, h)) * 0.75);
  col = mix(col, tops, smoothstep(80.0, 105.0, h + (tuft - 0.5) * 16.0) * 0.8);
  col = mix(col, scree, smoothstep(0.42, 0.68, slope + (fine - 0.5) * 0.2));
  float snowLine = 112.0 + (broad - 0.5) * 18.0;
  col = mix(col, snow, smoothstep(snowLine, snowLine + 6.0, h) * (1.0 - smoothstep(0.55, 0.8, slope)));
  col = mix(water, col, smoothstep(1.4, 2.4, h));
  col *= 0.9 + fine * 0.18;
  float diff = max(dot(n, uSun), 0.0);
  float wrapDiff = clamp((dot(n, uSun) + 0.25) / 1.25, 0.0, 1.0);
  vec3 lit = col * (0.36 + 0.86 * mix(wrapDiff, diff, 0.6) * uLight + 0.3 * (1.0 - uLight)) + vec3(0.02, 0.03, 0.05) * (1.0 - diff);
  float c = h / 5.0;
  float line = 1.0 - min(abs(fract(c - 0.5) - 0.5) / fwidth(c), 1.0);
  float ci = h / 50.0;
  float index = 1.0 - min(abs(fract(ci - 0.5) - 0.5) / fwidth(ci), 1.0);
  lit = mix(lit, vec3(0.16, 0.2, 0.36), clamp(line * 0.45 + index * 0.7, 0.0, 1.0) * uInk);
  float d = length(vWorld - uCam);
  float fogAmt = 1.0 - exp(-pow(d * uFog, 2.0));
  float valley = uValley * smoothstep(uFogTop + 3.0, uFogTop - 5.0, h) * smoothstep(6.0, 70.0, d);
  gl_FragColor = vec4(mix(lit, uFogColor, clamp(max(fogAmt, valley), 0.0, 1.0)), 1.0);
}`

const skyVertex = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`
const skyFragment = /* glsl */`
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSun;
uniform float uGlow;
varying vec3 vDir;
void main() {
  float y = max(vDir.y, 0.0);
  vec3 col = mix(uHorizon, uZenith, pow(y, 0.55));
  float s = max(dot(vDir, uSun), 0.0);
  col += vec3(1.0, 0.86, 0.66) * (pow(s, 24.0) * 0.5 + pow(s, 3.0) * 0.12) * uGlow;
  gl_FragColor = vec4(col, 1.0);
}`

const fogFragment = /* glsl */`
uniform float uTime;
uniform float uAmount;
uniform vec3 uColor;
uniform vec3 uCam;
uniform float uSeed;
varying vec3 vWorld;
float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
void main() {
  vec2 p = vWorld.xz * 0.012 + vec2(uTime * 0.004, uTime * 0.0017) + uSeed;
  float n = noise(p) * 0.6 + noise(p * 2.3 - uTime * 0.003) * 0.4;
  float d = length(vWorld.xz - uCam.xz);
  float a = smoothstep(0.32, 0.8, n) * uAmount * smoothstep(8.0, 60.0, d) * (1.0 - smoothstep(280.0, 320.0, length(vWorld.xz)));
  gl_FragColor = vec4(uColor, a * 0.62);
}`

function glintTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,250,1)')
  grad.addColorStop(0.18, 'rgba(255,246,214,0.95)')
  grad.addColorStop(0.45, 'rgba(255,214,150,0.28)')
  grad.addColorStop(1, 'rgba(255,200,140,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  g.fillStyle = 'rgba(255,250,235,0.55)'
  g.fillRect(31, 2, 2, 60)
  g.fillRect(2, 31, 60, 2)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// Morse-like identity: 1 is a short flash, 2 a long one. Each cycle is ~3.4s,
// never more than two flashes per second.
function flashLevel(code, t, phase) {
  const cycle = 3.4
  let local = (t + phase) % cycle
  for (const mark of code) {
    const len = mark === 1 ? 0.22 : 0.62
    if (local < len) return 1
    local -= len + 0.32
    if (local < 0) return 0.18
  }
  return 0.18
}

export function createSurveyScene(canvas, { reduced }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1600)
  camera.rotation.order = 'YXZ'
  const disposables = []
  const keep = x => { disposables.push(x); return x }

  const skyUniforms = {
    uZenith: { value: new THREE.Color(SKIES.clear.zenith) },
    uHorizon: { value: new THREE.Color(SKIES.clear.horizon) },
    uSun: { value: SUN.clone() },
    uGlow: { value: SKIES.clear.sun }
  }
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(1200, 32, 16)), keep(new THREE.ShaderMaterial({
    uniforms: skyUniforms, vertexShader: skyVertex, fragmentShader: skyFragment, side: THREE.BackSide, depthWrite: false
  })))
  sky.renderOrder = -1
  scene.add(sky)

  const SEG = 230
  const terrainGeo = keep(new THREE.PlaneGeometry(WORLD, WORLD, SEG, SEG))
  terrainGeo.rotateX(-Math.PI / 2)
  const pos = terrainGeo.attributes.position
  for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i)))
  terrainGeo.computeVertexNormals()
  const terrainUniforms = {
    uSun: { value: SUN.clone() },
    uFogColor: { value: new THREE.Color(SKIES.clear.horizon) },
    uCam: { value: new THREE.Vector3() },
    uFog: { value: WEATHER.clear.fog },
    uValley: { value: 0 },
    uFogTop: { value: 24 },
    uInk: { value: 0.12 },
    uLight: { value: 1 }
  }
  const terrain = new THREE.Mesh(terrainGeo, keep(new THREE.ShaderMaterial({
    uniforms: terrainUniforms, vertexShader: terrainVertex, fragmentShader: terrainFragment
  })))
  scene.add(terrain)

  const fogLayers = [0, 1, 2].map(k => {
    const geo = keep(new THREE.PlaneGeometry(680, 680, 1, 1))
    geo.rotateX(-Math.PI / 2)
    const uniforms = {
      uTime: { value: 0 }, uAmount: { value: 0 }, uColor: { value: new THREE.Color('#eef0ee') },
      uCam: { value: new THREE.Vector3() }, uSeed: { value: k * 7.3 }
    }
    const mesh = new THREE.Mesh(geo, keep(new THREE.ShaderMaterial({
      uniforms, vertexShader: terrainVertex, fragmentShader: fogFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide
    })))
    mesh.userData.offset = [-1, -5, -10][k]
    mesh.renderOrder = 2
    scene.add(mesh)
    return mesh
  })

  const stoneGeo = keep(new THREE.ConeGeometry(0.75, 1.4, 7))
  const poleGeo = keep(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 5))
  const flagGeo = keep(new THREE.PlaneGeometry(0.75, 0.42))
  const stoneMat = keep(new THREE.MeshLambertMaterial({ color: '#6c675f', flatShading: true }))
  const poleMat = keep(new THREE.MeshLambertMaterial({ color: '#2b2a2c' }))
  const flagMats = FLAGS.map(color => keep(new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide })))
  scene.add(new THREE.HemisphereLight('#dfe6ee', '#5a5446', 1.4))
  const sunLight = new THREE.DirectionalLight('#fff3df', 1.6)
  sunLight.position.copy(SUN)
  scene.add(sunLight)

  const glint = keep(glintTexture())
  const cairns = CAIRNS.map((c, i) => {
    const group = new THREE.Group()
    group.position.set(c.x, c.h, c.z)
    const stone = new THREE.Mesh(stoneGeo, stoneMat)
    stone.position.y = 0.6
    const mast = c.signal / SIGNAL
    const pole = new THREE.Mesh(poleGeo, poleMat)
    pole.scale.y = mast
    pole.position.y = 0.7 + 1.3 * mast
    const flag = new THREE.Mesh(flagGeo, flagMats[i % 3])
    flag.position.set(0.4, 0.7 + 2.2 * mast, 0)
    group.add(stone, pole, flag)
    scene.add(group)
    const mat = keep(new THREE.SpriteMaterial({ map: glint, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: false, transparent: true }))
    const sprite = new THREE.Sprite(mat)
    sprite.position.set(c.x, c.h + c.signal, c.z)
    sprite.renderOrder = 3
    scene.add(sprite)
    return { id: c.id, code: c.code, group, sprite, phase: i * 0.37, flag }
  })

  const houseGeo = keep(new THREE.BoxGeometry(1, 0.8, 1.6))
  const roofGeo = keep(new THREE.ConeGeometry(0.95, 0.6, 4))
  const towerGeo = keep(new THREE.BoxGeometry(0.9, 3.2, 0.9))
  const wallMat = keep(new THREE.MeshLambertMaterial({ color: '#d8d2c4' }))
  const roofMat = keep(new THREE.MeshLambertMaterial({ color: '#5a4a4c', flatShading: true }))
  const village = new THREE.Group()
  ;[[0, 0], [3, 2], [-2.5, 3], [5, -1.5], [1.5, 5], [-4, -1], [6, 4], [-1, -4]].forEach(([dx, dz], i) => {
    const x = VILLAGE.x + dx * 1.8
    const z = VILLAGE.z + dz * 1.8
    const y = height(x, z)
    const house = new THREE.Mesh(houseGeo, wallMat)
    house.position.set(x, y + 0.4, z)
    house.rotation.y = i * 0.7
    const roof = new THREE.Mesh(roofGeo, roofMat)
    roof.position.set(x, y + 1.1, z)
    roof.rotation.y = i * 0.7 + Math.PI / 4
    village.add(house, roof)
  })
  const tower = new THREE.Mesh(towerGeo, wallMat)
  tower.position.set(VILLAGE.x - 3, height(VILLAGE.x - 3, VILLAGE.z - 6) + 1.6, VILLAGE.z - 6)
  village.add(tower)
  scene.add(village)

  let road = null
  let station = CAIRN.kirk
  let weather = 'clear'
  let visible = new Set()
  let aerial = null
  const view = { yaw: 0, pitch: 0, fov: 60 }
  const fogTarget = { fog: WEATHER.clear.fog, valley: 0, ink: 0.12, light: 1 }
  const zenith = new THREE.Color(SKIES.clear.zenith)
  const horizon = new THREE.Color(SKIES.clear.horizon)

  function setStation(id) {
    station = CAIRN[id]
    cairns.forEach(c => { c.group.visible = c.id !== id })
  }
  function setWeather(id) {
    weather = id
    const w = WEATHER[id]
    zenith.set(SKIES[id].zenith)
    horizon.set(SKIES[id].horizon)
    skyUniforms.uGlow.value = SKIES[id].sun
    fogTarget.fog = w.fog
    fogTarget.valley = w.valleyFog
    fogTarget.light = id === 'rain' ? 0.25 : id === 'haze' ? 0.7 : 1
    terrainUniforms.uFogTop.value = w.fogTop || 22
    if (reduced) snapAtmosphere()
  }
  function snapAtmosphere() {
    terrainUniforms.uFog.value = fogTarget.fog
    terrainUniforms.uValley.value = fogTarget.valley
    terrainUniforms.uInk.value = fogTarget.ink
    terrainUniforms.uLight.value = fogTarget.light
    skyUniforms.uZenith.value.copy(zenith)
    skyUniforms.uHorizon.value.copy(horizon)
  }
  function setVisible(ids) { visible = new Set(ids) }
  function setView(v) { Object.assign(view, v) }

  function showRoad(result) {
    clearRoad()
    if (!result) return
    const path = result.path
    const verts = []
    const idx = []
    for (let i = 0; i < path.length; i++) {
      const a = path[Math.max(i - 1, 0)]
      const b = path[Math.min(i + 1, path.length - 1)]
      const dx = b.x - a.x
      const dz = b.z - a.z
      const len = Math.hypot(dx, dz) || 1
      const nx = -dz / len * 0.9
      const nz = dx / len * 0.9
      const p = path[i]
      verts.push(p.x + nx, height(p.x + nx, p.z + nz) + 0.35, p.z + nz, p.x - nx, height(p.x - nx, p.z - nz) + 0.35, p.z - nz)
      if (i < path.length - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2) }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    geo.setIndex(idx)
    const mat = new THREE.MeshBasicMaterial({ color: '#d2452e', side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.renderOrder = 1
    geo.setDrawRange(0, 0)
    const cartGeo = new THREE.BoxGeometry(1.8, 1.2, 2.6)
    const cart = new THREE.Mesh(cartGeo, new THREE.MeshLambertMaterial({ color: '#2f3f7a' }))
    const markGeo = new THREE.TorusGeometry(4, 0.5, 6, 24)
    const mark = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ color: result.outcome === 'stalled' ? '#d2452e' : '#e1b04a' }))
    mark.rotation.x = -Math.PI / 2
    const end = path[result.stopAt]
    mark.position.set(end.x, end.h + 1, end.z)
    mark.visible = false
    scene.add(mesh, cart, mark)
    road = { mesh, cart, mark, result, start: performance.now(), total: result.stopAt }
  }
  function clearRoad() {
    if (!road) return
    ;[road.mesh, road.cart, road.mark].forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose() })
    road = null
  }
  function setAerial(on) {
    aerial = on ? { start: performance.now() } : null
    fogTarget.ink = on ? 0.95 : 0.12
    if (on) { fogTarget.fog = 0.0008; fogTarget.valley = 0 }
    cairns.forEach(c => { c.group.visible = on || c.id !== station.id })
    if (reduced) snapAtmosphere()
  }

  function resize(w, h) {
    renderer.setSize(w, h, false)
    camera.aspect = w / Math.max(h, 1)
    camera.updateProjectionMatrix()
  }

  const tanHalf = () => Math.tan((camera.fov * Math.PI) / 360)
  function render(t) {
    const k = reduced ? 1 : 0.06
    terrainUniforms.uFog.value += (fogTarget.fog - terrainUniforms.uFog.value) * k
    terrainUniforms.uValley.value += (fogTarget.valley - terrainUniforms.uValley.value) * k
    terrainUniforms.uInk.value += (fogTarget.ink - terrainUniforms.uInk.value) * (reduced ? 1 : 0.03)
    terrainUniforms.uLight.value += (fogTarget.light - terrainUniforms.uLight.value) * k
    skyUniforms.uZenith.value.lerp(zenith, k)
    skyUniforms.uHorizon.value.lerp(horizon, k)
    terrainUniforms.uFogColor.value.copy(skyUniforms.uHorizon.value)

    if (aerial) {
      const age = (t - aerial.start) / 1000
      const spin = reduced ? 0.5 : 0.5 + age * 0.035
      camera.fov = 46
      camera.position.set(-10 + Math.sin(spin) * 300, 250, -10 + Math.cos(spin) * 300)
      camera.lookAt(-4, 30, -50)
    } else {
      camera.position.set(station.x, station.h + EYE, station.z)
      camera.rotation.set(view.pitch * Math.PI / 180, -view.yaw * Math.PI / 180, 0)
      camera.fov = view.fov
    }
    camera.updateProjectionMatrix()
    terrainUniforms.uCam.value.copy(camera.position)
    sky.position.copy(camera.position)

    fogLayers.forEach(f => {
      f.material.uniforms.uTime.value = reduced ? 0 : t / 1000
      f.material.uniforms.uAmount.value = terrainUniforms.uValley.value
      f.material.uniforms.uColor.value.copy(skyUniforms.uHorizon.value).lerp(WHITE, 0.35)
      f.material.uniforms.uCam.value.copy(camera.position)
      f.position.y = terrainUniforms.uFogTop.value + f.userData.offset
      f.visible = terrainUniforms.uValley.value > 0.02
    })

    const size = 0.04 * 2 * tanHalf()
    const seconds = t / 1000
    cairns.forEach(c => {
      const on = !aerial && visible.has(c.id)
      c.sprite.visible = on
      if (!on) return
      const level = reduced ? 0.8 : flashLevel(c.code, seconds, c.phase)
      c.sprite.material.opacity = weather === 'haze' ? level * 0.8 : level
      const s = size * (0.55 + level * 0.65)
      c.sprite.scale.set(s, s, 1)
      c.flag.rotation.y = reduced ? 0.3 : Math.sin(seconds * 2.2 + c.phase * 5) * 0.35
    })

    if (road) {
      const age = (t - road.start) / 1000
      const shown = reduced ? road.total : Math.min(road.total, Math.floor(age * 34))
      road.mesh.geometry.setDrawRange(0, shown * 6)
      const p = road.result.path[Math.max(shown, 0)]
      road.cart.position.set(p.x, p.h + 1, p.z)
      road.mark.visible = shown >= road.total
      if (road.mark.visible) road.mark.scale.setScalar(reduced ? 1 : 1 + Math.sin(seconds * 3) * 0.12)
    }
    renderer.render(scene, camera)
  }

  function dispose() {
    clearRoad()
    disposables.forEach(d => d.dispose())
    renderer.dispose()
  }

  setStation('kirk')
  setWeather('clear')
  snapAtmosphere()
  return { setStation, setWeather, setVisible, setView, showRoad, setAerial, resize, render, dispose, roadDone: () => !road || ((performance.now() - road.start) / 1000) * 34 >= road.total }
}
