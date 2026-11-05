// The stage. One fragment pass paints the curtain, the head in section, the bellows
// and the pit. The throat is not drawn from a picture: every pixel of the cutaway
// looks up where it sits along the tract, then reads the live diameters and air.
const CTRL = [
  [-0.455, -1.13], [-0.455, -0.82], [-0.46, -0.52], [-0.44, -0.26], [-0.32, -0.07], [-0.1, 0.015],
  [0.16, 0.035], [0.4, 0.015], [0.6, -0.045], [0.76, -0.105], [0.9, -0.15], [1.02, -0.175]
]
const NOSE = [[-0.34, -0.1], [-0.27, 0.05], [-0.08, 0.135], [0.2, 0.155], [0.5, 0.125], [0.76, 0.065], [0.97, -0.02]]
export const K = 0.09 // head units of tube opening per unit of diameter
const FIELD_X0 = -1.2
const FIELD_X1 = 1.3
const FIELD_Y0 = -1.4
const FIELD_Y1 = 0.62
const FIELD_W = 300
const FIELD_H = 242

function catmull(pts, per) {
  const out = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let j = 0; j < per; j++) {
      const t = j / per
      const a = t * t
      const b = a * t
      out.push([
        0.5 * (2 * p1[0] + (p2[0] - p0[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * a + (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * b),
        0.5 * (2 * p1[1] + (p2[1] - p0[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * a + (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * b)
      ])
    }
  }
  out.push(pts[pts.length - 1].slice())
  return out
}

function resample(line, n) {
  const seg = [0]
  for (let i = 1; i < line.length; i++) seg.push(seg[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]))
  const total = seg[seg.length - 1]
  const out = []
  let c = 0
  for (let i = 0; i < n; i++) {
    const at = (i / (n - 1)) * total
    while (c < seg.length - 2 && seg[c + 1] < at) c++
    const u = (at - seg[c]) / Math.max(1e-6, seg[c + 1] - seg[c])
    out.push([line[c][0] + (line[c + 1][0] - line[c][0]) * u, line[c][1] + (line[c + 1][1] - line[c][1]) * u])
  }
  return out
}

export const ROOF = resample(catmull(CTRL, 10), 44)
const NOSE_LINE = resample(catmull(NOSE, 8), 30)

// Maps every point near the throat to (section, offset from the roof line, position
// along the nose, distance from the nose). Baked once; the shader reads it live.
function bakeField() {
  const data = new Float32Array(FIELD_W * FIELD_H * 4)
  const fine = []
  for (let i = 0; i < ROOF.length - 1; i++) {
    const a = ROOF[i]
    const b = ROOF[i + 1]
    fine.push({ ax: a[0], ay: a[1], dx: b[0] - a[0], dy: b[1] - a[1], s: i })
  }
  for (let j = 0; j < FIELD_H; j++) {
    const y = FIELD_Y0 + ((j + 0.5) / FIELD_H) * (FIELD_Y1 - FIELD_Y0)
    for (let i = 0; i < FIELD_W; i++) {
      const x = FIELD_X0 + ((i + 0.5) / FIELD_W) * (FIELD_X1 - FIELD_X0)
      let best = 1e9
      let bs = 0
      let bn = 0
      for (let q = 0; q < fine.length; q++) {
        const f = fine[q]
        const l = f.dx * f.dx + f.dy * f.dy
        const free = q === 0 || q === fine.length - 1
        let u = ((x - f.ax) * f.dx + (y - f.ay) * f.dy) / l
        if (!free) u = Math.max(0, Math.min(1, u))
        else if (q === 0) u = Math.min(1, u)
        else u = Math.max(0, u)
        const px = f.ax + f.dx * u - x
        const py = f.ay + f.dy * u - y
        const d = px * px + py * py
        if (d < best) {
          best = d
          bs = f.s + u
          const cross = f.dx * (y - f.ay) - f.dy * (x - f.ax)
          bn = (cross >= 0 ? 1 : -1) * Math.sqrt(d)
        }
      }
      let nb = 1e9
      let ns = 0
      for (let q = 0; q < NOSE_LINE.length - 1; q++) {
        const a = NOSE_LINE[q]
        const b = NOSE_LINE[q + 1]
        const dx = b[0] - a[0]
        const dy = b[1] - a[1]
        const u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)))
        const px = a[0] + dx * u - x
        const py = a[1] + dy * u - y
        const d = px * px + py * py
        if (d < nb) {
          nb = d
          ns = (q + u) / (NOSE_LINE.length - 1)
        }
      }
      const k = (j * FIELD_W + i) * 4
      data[k] = bs
      data[k + 1] = bn
      data[k + 2] = ns
      data[k + 3] = Math.sqrt(nb)
    }
  }
  return data
}

const VERT = `#version 300 es
in vec2 aP;
void main() { gl_Position = vec4(aP, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec3 uHead;
uniform float uT, uFoot, uPitTop, uPitBottom, uMotion;
uniform float uLevel, uEye, uRain, uHouse, uVel, uAir, uPump, uFlash, uWarn;
uniform vec2 uHump, uLip;
uniform float uHotT, uHotL, uShowHandles;
uniform float uSeats[24];
uniform sampler2D uField, uTube;
out vec4 O;

const vec3 VOID_ = vec3(0.012, 0.012, 0.022);
const float K = ${K.toFixed(3)};

float hash(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 34.5); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float circ(vec2 p, vec2 c, float r) { return length(p - c) - r; }
float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
float box(vec2 p, vec2 c, vec2 b) { vec2 d = abs(p - c) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float tri(vec2 p, vec2 a, vec2 b, vec2 c) {
  vec2 e0 = b - a, e1 = c - b, e2 = a - c, v0 = p - a, v1 = p - b, v2 = p - c;
  vec2 q0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
  vec2 q1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
  vec2 q2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
  float s = sign(e0.x * e2.y - e0.y * e2.x);
  vec2 d = min(min(vec2(dot(q0, q0), s * (v0.x * e0.y - v0.y * e0.x)), vec2(dot(q1, q1), s * (v1.x * e1.y - v1.y * e1.x))), vec2(dot(q2, q2), s * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y);
}

float head(vec2 p) {
  float d = circ(p, vec2(-0.06, 0.27), 0.81);
  d = smin(d, circ(p, vec2(0.42, -0.14), 0.42), 0.12);
  d = smin(d, circ(p, vec2(0.79, -0.13), 0.245), 0.09);
  d = smin(d, circ(p, vec2(0.46, -0.45), 0.26), 0.14);
  d = smin(d, box(p, vec2(-0.46, -0.72), vec2(0.27, 0.56)) - 0.05, 0.22);
  d = smin(d, tri(p, vec2(-0.82, 0.62), vec2(-0.74, 1.4), vec2(-0.18, 0.98)) - 0.03, 0.05);
  d = smin(d, tri(p, vec2(-0.1, 1.02), vec2(0.34, 1.42), vec2(0.62, 0.68)) - 0.03, 0.05);
  return d;
}
float cutAway(vec2 p) {
  vec2 q = vec2((p.x - 0.14) / 1.04, (p.y + 0.5) / 0.76);
  float d = (length(q) - 1.0) * 0.76;
  float n = box(p, vec2(-0.45, -0.92), vec2(0.27, 0.34)) - 0.03;
  d = smin(d, n, 0.1);
  return d;
}

// Curtain: heavy pleats lit from the footlights, the whole height of the frame.
vec3 curtain(vec2 f, vec2 p) {
  float h = uRes.y;
  float x = f.x / h * 9.0;
  float sway = uMotion * 0.16 * sin(uT * 0.22 + f.y / h * 2.0);
  float pleat = sin(x * 3.2 + 1.6 * sin(x * 0.63 + sway) + sway) + 0.45 * sin(x * 7.9 + 2.1 * sin(x * 1.3));
  float shade = 0.5 + 0.5 * pleat / 1.45;
  shade = pow(shade, 1.5);
  float up = (f.y - uFoot) / h;
  float lit = exp(-max(up, 0.0) * 2.1) * uHouse;
  vec3 deep = vec3(0.075, 0.008, 0.02);
  vec3 cloth = vec3(0.54, 0.05, 0.075);
  vec3 c = mix(deep, cloth, shade * (0.12 + 0.95 * lit));
  c += vec3(0.46, 0.2, 0.05) * pow(shade, 5.0) * lit * lit * 0.6;
  // the head's shadow, thrown huge and upward by the footlights
  vec2 sq = (p - vec2(0.06, 0.34)) / 1.42;
  float sh = head(sq) * 1.42;
  c *= mix(0.46, 1.0, smoothstep(-0.05, 0.4, sh));
  // valance
  float top = 1.0 - f.y / h;
  c *= smoothstep(0.0, 0.14, top + 0.015 * sin(x * 8.0)) * 0.7 + 0.3;
  // rain night: cold wash, far lightning under the door
  if (uRain > 0.001) {
    float lum = dot(c, vec3(0.3, 0.5, 0.2));
    c = mix(c, vec3(0.42, 0.56, 0.86) * lum * 2.0, 0.62 * uRain);
    c += vec3(0.05, 0.07, 0.12) * uRain * uFlash;
  }
  return c;
}

vec3 stageFloor(vec2 f) {
  float y = (uFoot - f.y) / max(1.0, uFoot - uPitBottom);
  float persp = 1.0 / (0.22 + clamp(y, 0.0, 1.0));
  float plank = fract((f.x - uRes.x * 0.5) / uRes.y * persp * 11.0 + 0.5);
  float line = smoothstep(0.0, 0.06, plank) * smoothstep(1.0, 0.94, plank);
  vec3 c = vec3(0.07, 0.035, 0.022) * (0.55 + 0.45 * line);
  c += vec3(0.5, 0.24, 0.07) * exp(-y * 3.0) * uHouse * 0.5;
  return c;
}

float sitter(vec2 q, float kind) {
  float d = circ(q, vec2(0.0, 0.76), 0.29);
  d = smin(d, length((q - vec2(0.0, -0.08)) * vec2(1.22, 1.0)) - 0.55, 0.07);
  if (kind > 0.72) d = min(d, min(box(q, vec2(0.0, 1.2), vec2(0.19, 0.17)), box(q, vec2(0.0, 1.02), vec2(0.36, 0.028))));
  else if (kind > 0.44) d = min(d, length((q - vec2(0.0, 0.98)) * vec2(1.0, 2.3)) - 0.38);
  return d;
}

vec4 pit(vec2 f) {
  // two rows of hired chairs. uSeats fades each sitter and their candle in and out.
  float span = max(1.0, uPitTop - uPitBottom);
  vec3 col = vec3(0.0);
  float a = 0.0;
  for (int row = 0; row < 2; row++) {
    float rowF = float(row);
    float cw = uRes.x / (12.0 + rowF * 0.0);
    float scale = min(span * (rowF < 0.5 ? 0.62 : 0.86), cw * (rowF < 0.5 ? 0.86 : 1.02));
    float base = uPitBottom + span * (rowF < 0.5 ? 0.3 : -0.26);
    float x = (f.x + (rowF < 0.5 ? cw * 0.5 : 0.0)) / cw;
    float id = floor(x);
    int seat = int(mod(id, 12.0)) + row * 12;
    float on = uSeats[seat];
    if (on < 0.02) continue;
    float sx = (fract(x) - 0.5) * cw;
    float jitter = (hash(vec2(id, rowF)) - 0.5);
    vec2 q = vec2(sx - jitter * cw * 0.18, f.y - base) / scale;
    float sway = uMotion * 0.015 * sin(uT * 0.6 + id * 2.3);
    q.x += sway;
    float kind = hash(vec2(id + 3.0, rowF + 7.0));
    float d = sitter(q, kind);
    float aa = 1.6 / scale;
    float body = smoothstep(aa, -aa, d) * on;
    // a crescent of footlight on the crown only: inside the figure, outside its own lowered copy
    float rim = smoothstep(-0.015, 0.03, sitter(q - vec2(0.0, 0.05), kind)) * step(d, 0.0) * smoothstep(0.1, 0.5, q.y);
    vec3 sitter = vec3(0.012, 0.01, 0.014) + vec3(0.8, 0.42, 0.14) * rim * (0.3 + 0.7 * uHouse);
    col = mix(col, sitter, body);
    a = max(a, body);
    // the sitter's candle
    vec2 cq = q - vec2(jitter > 0.0 ? -0.46 : 0.46, 0.5);
    float fl = 0.09 + 0.018 * sin(uT * 9.0 * uMotion + id * 5.0);
    float flame = smoothstep(fl, 0.0, length(cq * vec2(1.9, 0.9)));
    // the halo fades before the edge of this seat's cell, so neighbours never show a seam
    float halo = exp(-length(cq) * 4.2) * 0.42 * smoothstep(0.5, 0.2, abs(fract(x) - 0.5));
    col += vec3(1.0, 0.62, 0.22) * (flame * 1.5 + halo) * on;
    a = max(a, clamp((flame + halo) * on, 0.0, 1.0));
    float stem = box(q, vec2(jitter > 0.0 ? -0.46 : 0.46, 0.2), vec2(0.022, 0.24));
    col = mix(col, vec3(0.8, 0.72, 0.56), smoothstep(aa, -aa, stem) * on);
  }
  return vec4(col, a);
}

// The cut face: flesh, bone, and the air column. Everything keys off the live tube.
vec3 section(vec2 p, float aa, out float air) {
  vec2 fuv = vec2((p.x - (${FIELD_X0.toFixed(2)})) / (${(FIELD_X1 - FIELD_X0).toFixed(2)}), (p.y - (${FIELD_Y0.toFixed(2)})) / (${(FIELD_Y1 - FIELD_Y0).toFixed(2)}));
  vec4 f = texture(uField, fuv);
  float s = clamp(f.r, 0.0, 43.0);
  float n = f.g;
  vec2 tube = texture(uTube, vec2((s + 0.5) / 44.0, 0.5)).rg;
  float D = tube.r;
  float E = tube.g;
  float lipM = smoothstep(38.6, 40.5, s);
  float roofN = lipM * D * K * 0.5;
  float floorN = roofN - D * K;
  float lum = max(n - roofN, floorN - n);
  // the larynx ends the column
  lum = max(lum, -(f.r + 0.2) * 0.05);
  // nasal cavity, opened by the velum
  float gate = smoothstep(0.0, 0.1, f.b - (1.0 - uVel) * 0.1) * smoothstep(0.0, 0.24, f.b + 0.04);
  float noseW = (0.03 + 0.034 * smoothstep(0.1, 0.5, f.b) * smoothstep(1.0, 0.7, f.b)) * mix(0.25, 1.0, gate);
  float lumN = f.a - noseW;
  if (gate < 0.02) lumN = max(lumN, 0.02);
  float lumA = min(lum, lumN);
  air = smoothstep(aa, -aa, lumA);

  float fold = abs(texture(uField, fuv + vec2(${(1 / 300).toFixed(5)}, 0.0)).r - f.r) + abs(texture(uField, fuv + vec2(0.0, ${(1 / 242).toFixed(5)})).r - f.r);
  fold = smoothstep(0.9, 2.4, fold);
  float tn = floorN - n; // depth beneath the floor of the tube
  float rn = n - roofN; // height above its roof
  float wd = max(lumA, 0.0);
  float engr = sin((p.x + p.y * 0.8) * 150.0);
  float hatch = smoothstep(-0.1, 0.5, engr);

  // soft tissue, deepening away from the wet wall
  vec3 wet = vec3(0.98, 0.5, 0.52);
  vec3 mid = vec3(0.68, 0.17, 0.22);
  vec3 deep = vec3(0.24, 0.04, 0.08);
  float dep = smoothstep(0.0, 0.16, wd);
  vec3 c = mix(mix(wet, mid, smoothstep(0.0, 0.035, wd)), deep, dep);
  c *= mix(1.0, 0.72 + 0.28 * hatch, smoothstep(0.03, 0.12, wd));
  c *= 0.93 + 0.14 * noise(p * vec2(34.0, 34.0));

  // tongue: a muscle with fibres that run with the tube
  float tongueM = step(9.0, s) * step(s, 39.3) * step(0.0, tn);
  float tongueEdge = (0.05 + 0.3 * smoothstep(11.0, 24.0, s)) * (0.45 + 0.55 * smoothstep(39.4, 33.0, s));
  if (tongueM > 0.5 && tn < tongueEdge) {
    float fibre = sin(s * 5.2 + tn * 46.0) * 0.5 + 0.5;
    vec3 tc = mix(vec3(0.92, 0.29, 0.36), vec3(0.45, 0.07, 0.13), smoothstep(0.0, tongueEdge, tn));
    tc *= 0.84 + 0.22 * fibre;
    tc += vec3(0.55, 0.32, 0.28) * exp(-tn * 60.0) * 0.7;
    tc += vec3(1.0, 0.82, 0.78) * smoothstep(0.55, 0.9, noise(vec2(s * 1.4, tn * 26.0))) * exp(-tn * 26.0) * 0.28;
    tc *= mix(1.0, 0.4, smoothstep(tongueEdge - 0.018, tongueEdge, tn));
    c = tc;
  }
  // the lower jaw, the palate and the neck bones in old ivory
  vec3 bone = vec3(0.86, 0.8, 0.64) * (0.86 + 0.14 * hatch);
  if (s > 22.0 && s < 39.0 && tn > tongueEdge && tn < tongueEdge + 0.075) c = mix(bone, deep, smoothstep(0.0, 0.012, tn - tongueEdge - 0.062));
  if (s > 19.5 && s < 38.2 && rn > 0.03 && rn < 0.075) c = bone;
  if (s < 18.0 && rn > 0.05 && rn < 0.17) {
    float block = smoothstep(0.1, 0.17, fract(s / 3.6)) * smoothstep(1.0, 0.92, fract(s / 3.6));
    c = mix(deep, bone, block);
  }
  // teeth
  float fangU = -rn - 0.015 - 0.1 * (1.0 - abs(s - 37.6) / 1.05);
  float fangL = -tn - 0.012 - 0.06 * (1.0 - abs(s - 36.0) / 0.8);
  float inTooth = 0.0;
  if (abs(s - 37.6) < 1.05 && rn < 0.02 && fangU < 0.0) inTooth = 1.0;
  if (abs(s - 36.0) < 0.8 && tn < 0.02 && fangL < 0.0) inTooth = 1.0;
  if (s > 30.0 && s < 36.4 && rn > 0.0 && rn < 0.03) c = vec3(0.92, 0.88, 0.74);

  // lips
  if (s > 39.3) {
    float lip = max(step(0.0, rn) * smoothstep(0.11, 0.0, rn), step(0.0, tn) * smoothstep(0.11, 0.0, tn));
    c = mix(c, vec3(0.78, 0.2, 0.3) + 0.2 * exp(-wd * 70.0), lip);
  }
  c = mix(c, deep * 0.55, fold * (1.0 - air));
  // a wet line of light along every wall
  c += vec3(1.0, 0.8, 0.72) * smoothstep(0.012, 0.002, abs(wd - 0.009)) * step(0.0, lumA) * 0.42;

  // the air column: what the waveguide is really carrying, travelling up the tube
  vec3 am = vec3(0.03, 0.012, 0.045);
  float g = clamp(E * 3.4, 0.0, 1.0);
  float wave = 0.5 + 0.5 * sin(s * 1.05 - uT * 13.0 * uMotion);
  vec3 hot = mix(vec3(1.0, 0.38, 0.06), vec3(1.0, 0.92, 0.6), g * g);
  am += hot * (g * 1.1) * (0.62 + 0.38 * wave);
  am += vec3(0.28, 0.1, 0.3) * clamp(E * 8.0, 0.0, 1.0) * 0.18;
  if (lumN < lum) am = mix(am, vec3(1.0, 0.65, 0.3) * uVel * clamp(uLevel * 1.8, 0.0, 1.0) * (0.3 + 0.7 * wave), 0.75);
  // the reed in the larynx
  if (s < 1.6) am += vec3(1.0, 0.8, 0.4) * clamp(uLevel * 2.0, 0.0, 1.0) * (0.5 + 0.5 * sin(uT * 70.0 * uMotion));
  vec3 out_ = mix(c, am, air);
  if (inTooth > 0.5) out_ = vec3(0.99, 0.96, 0.86) * (0.82 + 0.2 * smoothstep(0.0, 0.05, abs(rn + tn)));
  return out_;
}

void main() {
  vec2 f = gl_FragCoord.xy;
  vec2 p = (f - uHead.xy) / uHead.z;
  float aa = 1.4 / uHead.z;

  vec3 col;
  if (f.y > uFoot) col = curtain(f, p);
  else col = stageFloor(f);

  // spot, when the house goes down
  float spot = smoothstep(0.92, 0.2, length((p - vec2(0.0, -0.1)) * vec2(0.62, 0.5))) * (1.0 - uHouse);
  col += vec3(0.32, 0.17, 0.11) * spot;

  // footlight row
  float footD = abs(f.y - uFoot);
  col += vec3(0.95, 0.55, 0.2) * exp(-footD / (uRes.y * 0.015)) * 0.22 * uHouse;
  float lamps = fract(f.x / (uRes.x / 13.0));
  float lampX = (lamps - 0.5) * (uRes.x / 13.0);
  float flick = 0.86 + 0.14 * sin(uT * 7.0 * uMotion + floor(f.x / (uRes.x / 13.0)) * 2.0);
  col += vec3(1.0, 0.72, 0.3) * exp(-length(vec2(lampX, f.y - uFoot - 2.0)) / 5.5) * 1.6 * uHouse * flick;

  // plinth and bellows, anchored beneath the neck
  if (p.y < -1.1 && p.y > -2.2 && abs(p.x + 0.46) < 1.2) {
    float top = -1.36 - 0.2 * (1.0 - uAir) - 0.03 * uPump;
    float pleatY = fract((p.y - top) * 15.0);
    float width = 0.45 + 0.05 * abs(pleatY - 0.5) * 2.0;
    float bel = box(p, vec2(-0.46, (top - 1.67) * 0.5), vec2(width, (top + 1.67) * 0.5));
    vec3 leather = mix(vec3(0.16, 0.08, 0.045), vec3(0.42, 0.25, 0.13), abs(pleatY - 0.5) * 2.0);
    leather += vec3(0.5, 0.26, 0.1) * exp(-(p.y + 1.67) * 3.0) * 0.14 * uHouse;
    col = mix(col, leather, smoothstep(aa, -aa, bel));
    float plate = box(p, vec2(-0.46, top), vec2(0.53, 0.02));
    col = mix(col, vec3(0.86, 0.62, 0.26), smoothstep(aa, -aa, plate));
    float pipe = seg(p, vec2(-0.46, top), vec2(-0.46, -1.3)) - 0.055;
    col = mix(col, vec3(0.62, 0.44, 0.18) * (0.72 + 0.5 * smoothstep(0.05, -0.05, p.x + 0.46)), smoothstep(aa, -aa, pipe));
    float plinth = box(p, vec2(-0.1, -1.76), vec2(1.02, 0.09));
    col = mix(col, vec3(0.03, 0.028, 0.035) + vec3(0.42, 0.2, 0.05) * smoothstep(-1.85, -1.68, p.y) * 0.34 * uHouse, smoothstep(aa, -aa, plinth));
    if (uWarn > 0.01) col += vec3(0.8, 0.14, 0.05) * uWarn * smoothstep(0.1, -0.1, bel) * 0.26;
  }

  // whiskers: tuned by the same air, they shiver when the mouth is loud
  if (p.x > 0.6 && p.y > -0.9 && p.y < 0.5) {
    float wh = 1e9;
    for (int i = 0; i < 4; i++) {
      float k = float(i);
      vec2 a = vec2(0.72, -0.05 - k * 0.038);
      float shiver = uMotion * uLevel * 0.017 * sin(uT * 42.0 + k * 3.0);
      vec2 b = vec2(1.12, 0.05 - k * 0.1 + shiver);
      vec2 c = vec2(1.48, -0.02 - k * 0.2 + shiver * 2.4);
      wh = min(wh, min(seg(p, a, b), seg(p, b, c)));
    }
    col = mix(col, vec3(0.92, 0.86, 0.72), smoothstep(0.0065 + aa, 0.0035, wh) * 0.86);
  }

  // the head
  float furN = (noise(p * vec2(46.0, 74.0)) - 0.5) * 0.012 * smoothstep(-0.02, 0.1, cutAway(p));
  float dHead = head(p) + furN;
  float inHead = smoothstep(aa, -aa, dHead);
  if (inHead > 0.0) {
    vec3 skin = VOID_ + vec3(0.012, 0.012, 0.03) * (0.5 + 0.5 * noise(p * vec2(9.0, 30.0)));
    // rim of footlight underneath, a cold line of curtain-top on the ears
    if (dHead > -0.14) {
      vec2 e = vec2(0.006, 0.0);
      vec2 g = normalize(vec2(head(p + e.xy) - head(p - e.xy), head(p + e.yx) - head(p - e.yx)));
      float rim = exp(dHead * 38.0);
      skin += vec3(1.0, 0.46, 0.16) * rim * (0.2 + 0.8 * smoothstep(0.5, -0.9, g.y)) * 1.0 * (0.3 + 0.7 * uHouse);
      skin += vec3(0.42, 0.48, 0.72) * rim * smoothstep(-0.1, 0.9, g.y) * 0.7;
    }
    // inner ears
    float earA = tri(p, vec2(-0.7, 0.8), vec2(-0.69, 1.24), vec2(-0.32, 0.98));
    float earB = tri(p, vec2(0.02, 1.0), vec2(0.31, 1.27), vec2(0.5, 0.8));
    skin += vec3(0.26, 0.05, 0.07) * smoothstep(0.02, -0.04, min(earA, earB)) * (0.5 + 0.5 * uHouse);

    // the eye: a seam for five nights
    vec2 eq = p - vec2(0.4, 0.44);
    float open = uEye;
    float lidH = mix(0.006, 0.105, open);
    float eye = length(vec2(eq.x / 0.16, eq.y / max(lidH, 0.001))) - 1.0;
    float eyeA = smoothstep(0.08, -0.08, eye);
    float seam = smoothstep(0.012, 0.002, abs(eq.y + eq.x * eq.x * 1.1)) * smoothstep(0.17, 0.12, abs(eq.x));
    skin += vec3(1.0, 0.72, 0.28) * seam * (1.0 - open);
    vec3 iris = mix(vec3(1.0, 0.72, 0.14), vec3(1.0, 0.94, 0.5), smoothstep(0.1, 0.0, length(eq)));
    float pupil = smoothstep(0.012, 0.006, abs(eq.x) - mix(0.004, 0.018, 1.0 - open));
    iris = mix(iris, vec3(0.0), pupil);
    skin = mix(skin, iris, eyeA * open);
    skin += vec3(1.0, 0.68, 0.16) * exp(-max(length(eq) - 0.1, 0.0) * 8.0) * open * 0.34;

    // nose
    float nz = circ(p, vec2(1.0, -0.035), 0.036);
    skin = mix(skin, vec3(0.62, 0.2, 0.24), smoothstep(aa, -aa, nz));

    float dCut = cutAway(p);
    float dSec = max(dCut, head(p));
    if (dSec < 0.03) {
      float air = 0.0;
      vec3 sec = section(p, aa, air);
      // the mouth stays open to the stage: no band across the lips
      float mouthGap = smoothstep(0.05, 0.1, length(vec2(p.x - 1.02, (p.y + 0.17) * 0.8)) - 0.06);
      skin = mix(skin, sec, smoothstep(aa, -aa, dSec));
      // the rim of the cut is a riveted brass band
      float ring = (abs(dSec) - 0.012) + (1.0 - mouthGap) * 0.2;
      vec3 brass = vec3(0.88, 0.63, 0.25) * (0.75 + 0.35 * sin((p.x - p.y) * 30.0));
      float rivets = sin(atan(p.y + 0.5, p.x - 0.14) * 60.0);
      brass *= 0.8 + 0.3 * smoothstep(0.65, 0.9, rivets);
      skin = mix(skin, brass, smoothstep(aa, -aa, ring));
    }
    col = mix(col, skin, inHead);
  } else {
    // where the mouth lets out onto the stage, the breath is faintly visible
    vec2 q = p - vec2(1.03, -0.17);
    col += vec3(1.0, 0.6, 0.28) * exp(-length(q * vec2(1.0, 1.6)) * 6.0) * uLevel * 0.5;
    // the eye's glow also spills past the head
    vec2 eq = p - vec2(0.4, 0.44);
    col += vec3(1.0, 0.7, 0.2) * exp(-length(eq) * 3.0) * uEye * 0.08;
  }

  // handles: brass rings on the two muscles a hand can reach
  if (uShowHandles > 0.01) {
    float pulse = 0.5 + 0.5 * sin(uT * 3.0 * uMotion);
    float rr = max(0.058, 13.0 / uHead.z);
    float rw = max(0.01, 2.2 / uHead.z);
    float rT = abs(length(p - uHump) - rr) - rw;
    float rL = abs(length(p - uLip) - rr * 0.84) - rw;
    vec3 ringC = vec3(1.0, 0.9, 0.56);
    col = mix(col, vec3(0.05, 0.02, 0.02), smoothstep(rw * 1.6, 0.0, min(rT, rL)) * uShowHandles * 0.75);
    col = mix(col, ringC, smoothstep(aa, -aa, rT) * uShowHandles * (0.78 + 0.22 * max(uHotT, pulse)));
    col = mix(col, ringC, smoothstep(aa, -aa, rL) * uShowHandles * (0.78 + 0.22 * max(uHotL, pulse)));
    col += ringC * exp(-length(p - uHump) * 24.0) * 0.3 * uHotT;
    col += ringC * exp(-length(p - uLip) * 24.0) * 0.3 * uHotL;
  }

  // the pit, in front of everything
  if (f.y < uPitTop + 20.0) {
    vec4 pt = pit(f);
    col = mix(col, pt.rgb, clamp(pt.a, 0.0, 1.0));
  }

  // film and lens
  vec2 v = (f / uRes - 0.5);
  col *= 1.0 - dot(v, v) * 0.72;
  col += (hash(f + fract(uT * uMotion) * 61.0) - 0.5) * 0.018;
  col = col / (1.0 + col * 0.14);
  O = vec4(pow(max(col, 0.0), vec3(0.86)), 1.0);
}`

function compile(gl, type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s)
    gl.deleteShader(s)
    if (!gl.isContextLost()) console.warn(`vox.humana shader: ${log}`)
    return null
  }
  return s
}

const NAMES = ['uRes', 'uHead', 'uT', 'uFoot', 'uPitTop', 'uPitBottom', 'uMotion', 'uLevel', 'uEye', 'uRain', 'uHouse', 'uVel', 'uAir', 'uPump', 'uFlash', 'uWarn', 'uHump', 'uLip', 'uHotT', 'uHotL', 'uShowHandles', 'uSeats', 'uField', 'uTube']

export function createTheatre(canvas, { reduced = false } = {}) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' })
  const field = bakeField()
  const layout = { w: 1, h: 1, dpr: 1, cx: 0, cy: 0, s: 100, foot: 0, pitTop: 0, pitBottom: 0 }
  const tube = new Float32Array(44 * 4)
  const u = {}
  let prog = null
  let vao = null
  let buf = null
  let texF = null
  let texT = null
  let ok = false
  let lost = false

  const init = () => {
    if (!gl) return false
    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return false
    prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false
    for (const n of NAMES) u[n] = gl.getUniformLocation(prog, n)
    vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const a = gl.getAttribLocation(prog, 'aP')
    gl.enableVertexAttribArray(a)
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0)
    texF = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texF)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, FIELD_W, FIELD_H, 0, gl.RGBA, gl.FLOAT, field)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    texT = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texT)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 44, 1, 0, gl.RGBA, gl.FLOAT, tube)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.useProgram(prog)
    gl.uniform1i(u.uField, 0)
    gl.uniform1i(u.uTube, 1)
    gl.disable(gl.DEPTH_TEST)
    return true
  }

  ok = init()

  const onLost = e => {
    e.preventDefault()
    lost = true
  }
  const onRestored = () => {
    lost = false
    ok = init()
    if (ok) resize(layout)
  }
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)

  function resize(next) {
    Object.assign(layout, next)
    const pxW = Math.max(1, Math.round(layout.w * layout.dpr))
    const pxH = Math.max(1, Math.round(layout.h * layout.dpr))
    if (canvas.width !== pxW || canvas.height !== pxH) {
      canvas.width = pxW
      canvas.height = pxH
    }
    if (ok && !lost) gl.viewport(0, 0, pxW, pxH)
  }

  return {
    ok,
    layout,
    resize,
    cssFromHead(x, y) { return [layout.cx + x * layout.s, layout.cy - y * layout.s] },
    headFromCss(x, y) { return [(x - layout.cx) / layout.s, (layout.cy - y) / layout.s] },
    // Where a head-space point sits relative to the tube: section and roof offset.
    fieldAt(x, y) {
      const i = Math.floor(((x - FIELD_X0) / (FIELD_X1 - FIELD_X0)) * FIELD_W)
      const j = Math.floor(((y - FIELD_Y0) / (FIELD_Y1 - FIELD_Y0)) * FIELD_H)
      if (i < 0 || j < 0 || i >= FIELD_W || j >= FIELD_H) return null
      const k = (j * FIELD_W + i) * 4
      return { s: field[k], n: field[k + 1] }
    },
    render(t, st) {
      if (!ok || lost) return
      for (let i = 0; i < 44; i++) {
        tube[i * 4] = st.d[i]
        tube[i * 4 + 1] = st.energy[i]
      }
      const { dpr, s, cx, cy, h, w } = layout
      gl.useProgram(prog)
      gl.bindVertexArray(vao)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, texT)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 44, 1, gl.RGBA, gl.FLOAT, tube)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texF)
      gl.uniform2f(u.uRes, w * dpr, h * dpr)
      gl.uniform3f(u.uHead, cx * dpr, (h - cy) * dpr, s * dpr)
      gl.uniform1f(u.uT, t)
      gl.uniform1f(u.uFoot, (h - layout.foot) * dpr)
      gl.uniform1f(u.uPitTop, (h - layout.pitTop) * dpr)
      gl.uniform1f(u.uPitBottom, (h - layout.pitBottom) * dpr)
      gl.uniform1f(u.uMotion, reduced ? 0 : 1)
      gl.uniform1f(u.uLevel, st.level)
      gl.uniform1f(u.uEye, st.eye)
      gl.uniform1f(u.uRain, st.rain)
      gl.uniform1f(u.uHouse, st.house)
      gl.uniform1f(u.uVel, st.vel)
      gl.uniform1f(u.uAir, st.air)
      gl.uniform1f(u.uPump, st.pump)
      gl.uniform1f(u.uFlash, st.flash)
      gl.uniform1f(u.uWarn, st.warn)
      gl.uniform2f(u.uHump, st.hump[0], st.hump[1])
      gl.uniform2f(u.uLip, st.lip[0], st.lip[1])
      gl.uniform1f(u.uHotT, st.hotT)
      gl.uniform1f(u.uHotL, st.hotL)
      gl.uniform1f(u.uShowHandles, st.handles)
      gl.uniform1fv(u.uSeats, st.seats)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    destroy() {
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      if (!gl) return
      gl.deleteTexture(texF)
      gl.deleteTexture(texT)
      gl.deleteBuffer(buf)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(prog)
      const ext = gl.getExtension('WEBGL_lose_context')
      if (ext) ext.loseContext()
    }
  }
}
