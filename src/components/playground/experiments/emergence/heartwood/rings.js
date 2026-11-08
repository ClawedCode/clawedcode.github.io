// A cut oak disc, rendered in one fragment pass from the real ring list.
// Rings come from engine.rings(): [{ year, w, r }] with r cumulative (mm).

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
uniform sampler2D uLut;
uniform vec2 uRes;
uniform float uShowR;
uniform float uShown;
uniform float uFireR;
uniform float uFireA;
uniform float uPaintR;
uniform float uHollowR;
uniform float uHollowA;
uniform float uWet;
uniform vec3 uBg;
uniform float uPx;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float wob(float th) { return 1.0 + 0.035 * sin(3.0 * th + 1.3) + 0.018 * sin(7.0 * th + 0.4) + 0.008 * sin(13.0 * th + 2.0); }
float angDist(float a, float b) { float d = mod(abs(a - b), 6.2831853); return min(d, 6.2831853 - d); }

void main() {
  float m = min(uRes.x, uRes.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * m);
  float th = atan(p.y, p.x);
  float rho = length(p) / 0.86;
  float rr = rho / wob(th);
  vec3 col = uBg;
  float alpha = 0.0;
  if (rr < 1.075) {
    alpha = 1.0;
    if (rr > 1.0) {
      float ridge = noise(vec2(th * 60.0, rr * 40.0));
      col = mix(vec3(0.16, 0.11, 0.08), vec3(0.32, 0.24, 0.17), ridge * ridge);
      col *= 0.8 + 0.4 * noise(vec2(th * 9.0, 3.0));
    } else {
      float r = rr * uShowR;
      vec4 L = texture2D(uLut, vec2(clamp(r, 0.0, 0.9995), 0.5));
      float idx = L.r * 255.0 + L.g * 255.0 * 256.0;
      float frac = L.b;
      float grain = noise(vec2(th * 220.0, r * 900.0));
      vec3 early = vec3(0.86, 0.70, 0.50);
      vec3 late = vec3(0.55, 0.36, 0.22);
      // average the latewood band over one pixel so thin rings don't alias
      float band = 0.0;
      for (int k = 0; k < 4; k++) {
        float rs = clamp(r + (float(k) - 1.5) * 0.33 * uPx * uShowR, 0.0, 0.9995);
        float fk = texture2D(uLut, vec2(rs, 0.5)).b;
        band += smoothstep(0.5, 0.97, fk);
      }
      band = band * 0.25 + 0.14 * grain;
      vec3 c = mix(early, late, clamp(band, 0.0, 1.0));
      // pores of the earlywood
      float pore = step(0.86, noise(vec2(th * 520.0, r * 2600.0))) * (1.0 - smoothstep(0.0, 0.25, frac));
      c *= 1.0 - 0.28 * pore;
      // heartwood darkens all but the youngest 22 rings
      float heart = 1.0 - smoothstep(uShown - 26.0, uShown - 18.0, idx);
      c = mix(c, c * vec3(0.78, 0.64, 0.52), heart);
      // medullary rays, oak's silver figure
      float ray = smoothstep(0.82, 1.0, noise(vec2(th * 140.0, r * 6.0)));
      c = mix(c, vec3(0.93, 0.83, 0.66), ray * 0.45 * smoothstep(0.03, 0.12, r));
      // drying checks
      float chk = 0.0;
      for (int k = 0; k < 4; k++) {
        float a = float(k) * 1.71 + 0.6;
        float w = 0.004 + 0.006 * (1.0 - rr);
        chk += (1.0 - smoothstep(0.0, w, angDist(th + 0.03 * sin(rr * 30.0 + float(k)), a))) * (1.0 - smoothstep(0.35, 0.6, rr));
      }
      c *= 1.0 - 0.75 * clamp(chk, 0.0, 1.0);
      // fire scar: a charred notch the later rings curl round
      if (uFireR > 0.0) {
        float d = angDist(th, uFireA);
        float edge = uFireR / uShowR;
        float notch = (1.0 - smoothstep(0.18, 0.3, d)) * smoothstep(edge - 0.035, edge, rr) * (1.0 - smoothstep(edge, edge + 0.05 + 0.04 * (1.0 - d * 4.0), rr));
        c = mix(c, vec3(0.08, 0.05, 0.04), notch * 0.92);
      }
      // the white ring painted for felling
      if (uPaintR > 0.0) {
        float pr = uPaintR / uShowR;
        float pw = 0.0045 + 0.002 * noise(vec2(th * 30.0, 1.0));
        c = mix(c, vec3(0.95, 0.94, 0.9), (1.0 - smoothstep(pw * 0.5, pw, abs(rr - pr))) * 0.9);
      }
      // the hollow: rot rising from the 1881 wound
      if (uHollowR > 0.0) {
        float hr = uHollowR / uShowR;
        vec2 hc = vec2(cos(uHollowA), sin(uHollowA)) * hr * 0.55;
        vec2 q = vec2(cos(th), sin(th)) * rr - hc;
        float n = noise(q * 9.0 / max(hr, 0.2)) * 0.05 * hr;
        float hd = length(q * vec2(1.0, 1.3)) - hr * 0.3 - n;
        float rot = 1.0 - smoothstep(-0.01, 0.12, hd);
        c = mix(c, c * vec3(0.7, 0.58, 0.48), rot * 0.45);
        c = mix(c, vec3(0.05, 0.035, 0.03), 1.0 - smoothstep(-0.01, 0.005, hd));
      }
      // light from the upper left, and a wet sheen when freshly cut
      float light = 0.9 + 0.12 * dot(normalize(p + 0.001), vec2(-0.6, 0.8)) * rr;
      col = c * light;
      col += uWet * 0.06 * smoothstep(0.4, 1.0, noise(p * 3.0));
    }
    // soft edge
    alpha = 1.0 - smoothstep(1.06, 1.075, rr);
  }
  gl_FragColor = vec4(mix(uBg, col, alpha), 1.0);
}
`

export const wobble = th => 1 + 0.035 * Math.sin(3 * th + 1.3) + 0.018 * Math.sin(7 * th + 0.4) + 0.008 * Math.sin(13 * th + 2)

function compile(gl, type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(s)
    gl.deleteShader(s)
    throw new Error(info)
  }
  return s
}

const LUT_W = 2048

export function createDisc(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false })
  if (!gl || gl.isContextLost()) return null
  const prog = gl.createProgram()
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'aPos')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const u = name => gl.getUniformLocation(prog, name)
  const U = {
    res: u('uRes'), showR: u('uShowR'), shown: u('uShown'), fireR: u('uFireR'), fireA: u('uFireA'),
    paintR: u('uPaintR'), px: u('uPx'), hollowR: u('uHollowR'), hollowA: u('uHollowA'), wet: u('uWet'), bg: u('uBg'), lut: u('uLut')
  }
  let ringList = []
  let total = 1

  function setRings(list) {
    ringList = list
    total = list.length ? list[list.length - 1].r : 1
    const data = new Uint8Array(LUT_W * 4)
    let k = 0
    for (let i = 0; i < LUT_W; i++) {
      const r = (i + 0.5) / LUT_W * total
      while (k < list.length - 1 && list[k].r < r) k++
      const start = k === 0 ? 0 : list[k - 1].r
      const frac = Math.min(1, Math.max(0, (r - start) / list[k].w))
      data[i * 4] = k & 255
      data[i * 4 + 1] = k >> 8
      data[i * 4 + 2] = Math.round(frac * 255)
      data[i * 4 + 3] = 255
    }
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, LUT_W, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
  }

  const rAt = year => {
    const ring = ringList.find(r => r.year === year)
    return ring ? ring.r / total : 0
  }

  function draw({ showYear, fire, paint, hollow, wet = 0, bg = [0.07, 0.06, 0.05] }) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.max(2, Math.round(canvas.clientWidth * dpr))
    const h = Math.max(2, Math.round(canvas.clientHeight * dpr))
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
    gl.viewport(0, 0, w, h)
    const shownIdx = Math.max(0, ringList.findIndex(r => r.year >= showYear))
    const showR = Math.max(0.01, rAt(Math.min(showYear, ringList[ringList.length - 1].year)) || ringList[shownIdx]?.r / total || 1)
    gl.uniform2f(U.res, w, h)
    gl.uniform1f(U.showR, showR)
    gl.uniform1f(U.shown, shownIdx + 1)
    gl.uniform1f(U.fireR, fire && showYear >= 1887 ? rAt(1887) : 0)
    gl.uniform1f(U.fireA, 0.55)
    gl.uniform1f(U.paintR, paint && showYear >= 1966 ? rAt(1966) : 0)
    gl.uniform1f(U.hollowR, hollow && showYear >= 1881 ? rAt(1881) : 0)
    gl.uniform1f(U.hollowA, 2.7)
    gl.uniform1f(U.wet, wet)
    gl.uniform1f(U.px, 1 / (0.5 * Math.min(w, h) * 0.86))
    gl.uniform3f(U.bg, bg[0], bg[1], bg[2])
    gl.uniform1i(U.lut, 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    return showR
  }

  function dispose() {
    gl.deleteTexture(tex)
    gl.deleteBuffer(buf)
    gl.deleteProgram(prog)
  }

  return { setRings, draw, dispose, rAt }
}

// Where a mark at (fraction of final radius, angle) lands in CSS pixels.
export function markPosition(rFrac, angle, showR, size) {
  const rr = Math.min(1, rFrac / showR)
  const rho = rr * wobble(angle) * 0.86
  const half = size / 2
  return { x: half + Math.cos(angle) * rho * half, y: half - Math.sin(angle) * rho * half }
}
