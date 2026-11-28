// WGSL for sunpatch.cascade(): 2D global illumination by radiance cascades
// (Sannikov, 2023) on WebGPU compute. Scene space is a fixed grid of
// SCENE_W x SCENE_H pixels so light levels stay identical on every screen.

const LAMP = /* wgsl */`
struct Lamp { pos: vec2<f32>, radius: f32, on: f32, color: vec4<f32> }
`

// 1. Build the emissive/occluding scene. Lamps are opaque emitters. Painted
//    walls are opaque, and re-emit the light that reached their faces on the
//    previous frame (albedo x incident x bounce), which is how one-bounce
//    indirect light accumulates into many bounces over a few frames.
export const SCENE_WGSL = LAMP + /* wgsl */`
struct Params { size: vec2<u32>, lampCount: u32, bounce: f32 }
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read> lamps: array<Lamp>;
@group(0) @binding(2) var paintTex: texture_2d<f32>;
@group(0) @binding(3) var irrTex: texture_2d<f32>;
@group(0) @binding(4) var sceneOut: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= P.size.x || id.y >= P.size.y) { return; }
  let p = vec2<i32>(id.xy);
  let fp = vec2<f32>(id.xy) + 0.5;
  for (var i = 0u; i < P.lampCount; i++) {
    let L = lamps[i];
    if (L.on > 0.5 && distance(fp, L.pos) <= L.radius) {
      textureStore(sceneOut, p, vec4<f32>(L.color.rgb, 1.0));
      return;
    }
  }
  let paint = textureLoad(paintTex, p, 0);
  if (paint.a < 0.5) {
    textureStore(sceneOut, p, vec4<f32>(0.0));
    return;
  }
  // Face pixels gather from air 3 px away. Pixels deeper in a thick wall reach
  // 8 px for the nearest face's light: rays never see them (they stop at the
  // face), so this only lets the display show a lit wall instead of a black one.
  let hi = vec2<i32>(P.size) - 1;
  var sum = vec3<f32>(0.0);
  var n = 0.0;
  for (var ring = 0; ring < 2 && n == 0.0; ring++) {
    let reach = select(8.0, 3.0, ring == 0);
    for (var k = 0; k < 8; k++) {
      let a = f32(k) * 0.7853982;
      let q = clamp(p + vec2<i32>(round(vec2<f32>(cos(a), sin(a)) * reach)), vec2<i32>(0), hi);
      let s = textureLoad(irrTex, q, 0);
      if (s.a > 0.5) { sum += s.rgb; n += 1.0; }
    }
  }
  var e = vec3<f32>(0.0);
  if (n > 0.0) { e = min(paint.rgb * (sum / n) * P.bounce, vec3<f32>(6.0)); }
  textureStore(sceneOut, p, vec4<f32>(e, 1.0));
}
`

// 2. Jump flood: every pixel learns the nearest occluder, so rays can leap
//    across empty space instead of stepping one pixel at a time.
export const JFA_SEED_WGSL = /* wgsl */`
struct Params { size: vec2<u32>, step: i32, pad: i32 }
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var sceneTex: texture_2d<f32>;
@group(0) @binding(2) var outTex: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= P.size.x || id.y >= P.size.y) { return; }
  let p = vec2<i32>(id.xy);
  var seed = vec2<f32>(-1000.0);
  if (textureLoad(sceneTex, p, 0).a > 0.5) { seed = vec2<f32>(id.xy) + 0.5; }
  textureStore(outTex, p, vec4<f32>(seed, 0.0, 1.0));
}
`

export const JFA_STEP_WGSL = /* wgsl */`
struct Params { size: vec2<u32>, step: i32, pad: i32 }
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var inTex: texture_2d<f32>;
@group(0) @binding(2) var outTex: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= P.size.x || id.y >= P.size.y) { return; }
  let p = vec2<i32>(id.xy);
  let fp = vec2<f32>(id.xy) + 0.5;
  let hi = vec2<i32>(P.size) - 1;
  var best = textureLoad(inTex, p, 0).xy;
  var bestD = distance(fp, best);
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let q = p + vec2<i32>(dx, dy) * P.step;
      if (any(q < vec2<i32>(0)) || any(q > hi)) { continue; }
      let s = textureLoad(inTex, q, 0).xy;
      if (s.x < -500.0) { continue; }
      let d = distance(fp, s);
      if (d < bestD) { best = s; bestD = d; }
    }
  }
  textureStore(outTex, p, vec4<f32>(best, 0.0, 1.0));
}
`

// 3. Radiance cascades. Cascade i keeps probes every 2^i px, each casting
//    4^(i+1) rays over the interval [base(4^i-1)/3, base(4^(i+1)-1)/3).
//    Near light needs fine position and coarse angle; far light needs fine
//    angle and coarse position. Cascades are solved top down, and each ray
//    that escapes its interval continues as the bilinear blend of the four
//    nearest upper probes' matching rays (four upper rays per lower ray).
export const CASCADE_WGSL = /* wgsl */`
struct Params { size: vec2<u32>, level: u32, levels: u32, base: f32, writeDebug: u32, pad0: u32, pad1: u32 }
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var sceneTex: texture_2d<f32>;
@group(0) @binding(2) var seedTex: texture_2d<f32>;
@group(0) @binding(3) var upperTex: texture_2d<f32>;
@group(0) @binding(4) var outTex: texture_storage_2d<rgba16float, write>;
@group(0) @binding(5) var debugTex: texture_storage_2d<rgba16float, write>;

fn march(origin: vec2<f32>, dir: vec2<f32>, t0: f32, t1: f32) -> vec4<f32> {
  let sz = vec2<f32>(P.size);
  var t = t0;
  for (var i = 0; i < 48; i++) {
    let pos = origin + dir * t;
    if (pos.x < 0.0 || pos.y < 0.0 || pos.x >= sz.x || pos.y >= sz.y) { return vec4<f32>(0.0); }
    let ip = vec2<i32>(pos);
    let s = textureLoad(sceneTex, ip, 0);
    if (s.a > 0.5) { return vec4<f32>(s.rgb, 0.0); }
    let seed = textureLoad(seedTex, ip, 0).xy;
    t += max(distance(pos, seed) - 0.5, 0.5);
    if (t >= t1) { break; }
  }
  return vec4<f32>(0.0, 0.0, 0.0, 1.0);
}

fn probeCount(level: u32) -> vec2<u32> {
  let span = (1u << level) - 1u;
  return (P.size + vec2<u32>(span)) >> vec2<u32>(level);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let level = P.level;
  let raysDim = 2u << level;
  let probes = probeCount(level);
  if (id.x >= probes.x * raysDim || id.y >= probes.y * raysDim) { return; }
  let probe = id.xy / raysDim;
  let rc = id.xy % raysDim;
  let rayIndex = rc.y * raysDim + rc.x;
  let rayCount = raysDim * raysDim;
  let angle = (f32(rayIndex) + 0.5) / f32(rayCount) * 6.2831853;
  let dir = vec2<f32>(cos(angle), sin(angle));
  let spacing = f32(1u << level);
  let origin = (vec2<f32>(probe) + 0.5) * spacing;
  let pw = pow(4.0, f32(level));
  let t0 = P.base * (pw - 1.0) / 3.0;
  let t1 = P.base * (pw * 4.0 - 1.0) / 3.0;
  var rad = march(origin, dir, t0, t1);
  if (rad.a > 0.0 && level + 1u < P.levels) {
    let uraysDim = raysDim * 2u;
    let uprobes = probeCount(level + 1u);
    let u = origin / (spacing * 2.0) - 0.5;
    let b = floor(u);
    let f = u - b;
    var acc = vec4<f32>(0.0);
    for (var c = 0u; c < 4u; c++) {
      let off = vec2<f32>(f32(c & 1u), f32(c >> 1u));
      let q = vec2<u32>(clamp(b + off, vec2<f32>(0.0), vec2<f32>(uprobes) - 1.0));
      let w = mix(1.0 - f.x, f.x, off.x) * mix(1.0 - f.y, f.y, off.y);
      var s = vec4<f32>(0.0);
      for (var k = 0u; k < 4u; k++) {
        let ur = rayIndex * 4u + k;
        s += textureLoad(upperTex, vec2<i32>(q * uraysDim + vec2<u32>(ur % uraysDim, ur / uraysDim)), 0);
      }
      acc += s * (0.25 * w);
    }
    rad = vec4<f32>(rad.rgb + rad.a * acc.rgb, rad.a * acc.a);
  }
  textureStore(outTex, vec2<i32>(id.xy), rad);
  if (P.writeDebug == 1u) { textureStore(debugTex, vec2<i32>(id.xy), rad); }
}
`

// 4. Cascade 0 has one probe per pixel and four rays: their mean is the
//    light arriving at that pixel. Occupied pixels report none (a = 0) so
//    walls never gather their own glow.
export const INTEGRATE_WGSL = /* wgsl */`
struct Params { size: vec2<u32>, pad0: u32, pad1: u32 }
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var c0: texture_2d<f32>;
@group(0) @binding(2) var sceneTex: texture_2d<f32>;
@group(0) @binding(3) var outTex: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= P.size.x || id.y >= P.size.y) { return; }
  let p = vec2<i32>(id.xy);
  if (textureLoad(sceneTex, p, 0).a > 0.5) {
    textureStore(outTex, p, vec4<f32>(0.0));
    return;
  }
  let o = p * 2;
  let sum = textureLoad(c0, o, 0).rgb + textureLoad(c0, o + vec2<i32>(1, 0), 0).rgb
    + textureLoad(c0, o + vec2<i32>(0, 1), 0).rgb + textureLoad(c0, o + vec2<i32>(1, 1), 0).rgb;
  textureStore(outTex, p, vec4<f32>(sum * 0.25, 1.0));
}
`

// 5. Light meters: mean irradiance over a small disc at each creature.
export const SAMPLE_WGSL = /* wgsl */`
struct Probe { pos: vec2<f32>, radius: f32, pad: f32 }
struct Params { count: u32, pad0: u32, pad1: u32, pad2: u32 }
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read> probes: array<Probe>;
@group(0) @binding(2) var irrTex: texture_2d<f32>;
@group(0) @binding(3) var<storage, read_write> outBuf: array<vec4<f32>>;

@compute @workgroup_size(16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= P.count) { return; }
  let pr = probes[id.x];
  let dims = vec2<i32>(textureDimensions(irrTex));
  var sum = vec3<f32>(0.0);
  var n = 0.0;
  for (var y = -2; y <= 2; y++) {
    for (var x = -2; x <= 2; x++) {
      let q = vec2<i32>(pr.pos + vec2<f32>(f32(x), f32(y)) * (pr.radius * 0.5));
      if (any(q < vec2<i32>(0)) || any(q >= dims)) { continue; }
      let s = textureLoad(irrTex, q, 0);
      if (s.a > 0.5) { sum += s.rgb; n += 1.0; }
    }
  }
  outBuf[id.x] = vec4<f32>(select(vec3<f32>(0.0), sum / n, n > 0.0), n);
}
`

// 6. Display: floor lit by the irradiance field, painted walls shown with the
//    light they re-emit, lamps drawn analytically at screen resolution, and an
//    x-ray mode that shows one cascade's raw probe mosaic.
export const DISPLAY_WGSL = LAMP + /* wgsl */`
struct Params {
  scene: vec2<f32>, mode: u32, lampCount: u32,
  exposure: f32, bounce: f32, xray: f32, time: f32,
  focus: vec2<f32>, debugScale: vec2<f32>
}
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var irrTex: texture_2d<f32>;
@group(0) @binding(2) var sceneTex: texture_2d<f32>;
@group(0) @binding(3) var paintTex: texture_2d<f32>;
@group(0) @binding(4) var debugTex: texture_2d<f32>;
@group(0) @binding(5) var samp: sampler;
@group(0) @binding(6) var<storage, read> lamps: array<Lamp>;

struct VOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32> }

@vertex
fn vs(@builtin(vertex_index) i: u32) -> VOut {
  var xy = array<vec2<f32>, 3>(vec2<f32>(-1.0, -3.0), vec2<f32>(-1.0, 1.0), vec2<f32>(3.0, 1.0));
  var o: VOut;
  o.pos = vec4<f32>(xy[i], 0.0, 1.0);
  o.uv = vec2<f32>(xy[i].x * 0.5 + 0.5, 0.5 - xy[i].y * 0.5);
  return o;
}

fn hash(p: vec2<f32>) -> f32 {
  return fract(sin(dot(p, vec2<f32>(127.1, 311.7))) * 43758.5453);
}

fn floorAlbedo(sp: vec2<f32>) -> vec3<f32> {
  let tile = floor(sp / 25.0);
  let local = fract(sp / 25.0);
  let grout = smoothstep(0.0, 0.06, local.x) * smoothstep(0.0, 0.06, local.y);
  let v = 0.78 + 0.16 * hash(tile) + 0.05 * (hash(floor(sp * 0.5)) - 0.5);
  return vec3<f32>(0.62, 0.55, 0.48) * v * mix(0.55, 1.0, grout);
}

@fragment
fn fs(in: VOut) -> @location(0) vec4<f32> {
  let sp = in.uv * P.scene;
  let irr = textureSampleLevel(irrTex, samp, in.uv, 0.0).rgb;
  let paint = textureSampleLevel(paintTex, samp, in.uv, 0.0);
  let wallLight = textureSampleLevel(sceneTex, samp, in.uv, 0.0).rgb;
  var col = floorAlbedo(sp) * irr;
  let wall = smoothstep(0.35, 0.65, paint.a);
  let paintRgb = paint.rgb / max(paint.a, 0.001);
  let wallCol = wallLight / max(P.bounce, 0.001) * mix(vec3<f32>(1.0), paintRgb, 0.15) + paintRgb * 0.012;
  col = mix(col, wallCol, wall);
  for (var i = 0u; i < P.lampCount; i++) {
    let L = lamps[i];
    let d = distance(sp, L.pos);
    let ring = 1.0 - smoothstep(L.radius - 0.6, L.radius + 0.6, d);
    let lit = select(L.color.rgb * 0.02, L.color.rgb, L.on > 0.5);
    col = mix(col, lit, ring);
  }
  if (P.mode == 1u) {
    let dbg = textureSampleLevel(debugTex, samp, in.uv * P.debugScale, 0.0).rgb;
    col = mix(col, dbg, P.xray);
  }
  var mapped = vec3<f32>(1.0) - exp(-col * P.exposure);
  let vig = 1.0 - 0.35 * pow(length(in.uv - 0.5) * 1.3, 2.2);
  mapped = mapped * vig;
  mapped = pow(max(mapped, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.2));
  mapped += (hash(in.pos.xy + P.time) - 0.5) / 255.0;
  return vec4<f32>(mapped, 1.0);
}
`
