// The throat itself: a 44-section scattering waveguide with a nasal side branch,
// driven by a glottal pulse. This class is serialised into an AudioWorklet with
// toString(), so it must stay self-contained: no imports, no module references.
export class TractCore {
  constructor(sampleRate) {
    this.sr = sampleRate
    const n = 44
    const m = 28
    this.n = n
    this.m = m
    this.at = 17
    this.R = new Float64Array(n)
    this.L = new Float64Array(n)
    this.Ro = new Float64Array(n + 1)
    this.Lo = new Float64Array(n + 1)
    this.k = new Float64Array(n + 1)
    this.k0 = new Float64Array(n + 1)
    this.A = new Float64Array(n)
    this.D = new Float64Array(n)
    this.Dt = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const d = i < 7 ? 0.6 : i < 12 ? 1.1 : 1.5
      this.D[i] = d
      this.Dt[i] = d
    }
    this.nR = new Float64Array(m)
    this.nL = new Float64Array(m)
    this.nRo = new Float64Array(m + 1)
    this.nLo = new Float64Array(m + 1)
    this.nk = new Float64Array(m + 1)
    this.nA = new Float64Array(m)
    this.nkT = -0.999
    for (let i = 0; i < m; i++) {
      const u = (2 * i) / m
      const d = u < 1 ? 0.4 + 1.6 * u : 0.5 + 1.5 * (2 - u)
      this.nA[i] = Math.min(d, 1.9) ** 2
    }
    for (let i = 1; i < m; i++) this.nk[i] = (this.nA[i - 1] - this.nA[i]) / (this.nA[i - 1] + this.nA[i])
    this.vel = 0
    this.velT = 0
    this.j0 = [0, 0, 0]
    this.j1 = [0, 0, 0]
    this.phase = 0
    this.f0 = 110
    this.f0T = 110
    this.voice = 0
    this.voiceT = 0
    this.asp = 0
    this.aspT = 0
    this.press = 0
    this.pressT = 0
    this.tilt = 0
    this.tiltZ = 0
    this.vibT = 0
    this.wob = 0
    this.wobT = 0
    this.wobN = 0
    this.fricI = 0
    this.fricA = 0
    this.closedFor = 0
    this.closedAt = 0
    this.burst = 0
    this.burstI = 0
    this.dcX = 0
    this.dcY = 0
    this.nz = 0
    this.seed = 22222
    this.E = new Float64Array(n)
    this.eN = 0
    this.level = 0
    this.reflect()
    this.k0.set(this.k)
    this.j0 = this.j1.slice()
  }

  set(p) {
    if (p.d) for (let i = 0; i < this.n; i++) this.Dt[i] = p.d[i]
    if (p.vel !== undefined) this.velT = p.vel
    if (p.f0 !== undefined) this.f0T = p.f0
    if (p.voice !== undefined) this.voiceT = p.voice
    if (p.asp !== undefined) this.aspT = p.asp
    if (p.press !== undefined) this.pressT = p.press
  }

  rand() {
    // xorshift keeps the noise identical wherever the class is evaluated
    let s = this.seed
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    this.seed = s | 0
    return ((s >>> 0) / 2147483648) - 1
  }

  reflect() {
    const { n, A, D, k, at, m, nA } = this
    for (let i = 0; i < n; i++) A[i] = D[i] * D[i]
    for (let i = 1; i < n; i++) {
      k[i] = A[i] <= 1e-6 ? 0.999 : (A[i - 1] - A[i]) / (A[i - 1] + A[i])
    }
    k[n] = 0
    const v = this.vel
    const port = v < 0.02 ? 0 : v * v * 1.6
    nA[0] = port
    const sum = A[at] + A[at + 1] + port
    const s = sum <= 1e-6 ? 1e-6 : sum
    this.j1[0] = (2 * A[at] - s) / s
    this.j1[1] = (2 * A[at + 1] - s) / s
    this.j1[2] = (2 * port - s) / s
    this.nkT = port <= 1e-6 ? -0.999 : (nA[0] - nA[1]) / (nA[0] + nA[1])
  }

  // Move the walls, find the narrowest place, decide how hard the air hisses there.
  block(frames) {
    const { n, D, Dt } = this
    const dt = frames / this.sr
    const a = 1 - Math.exp(-dt / 0.005)
    this.k0.set(this.k)
    this.j0[0] = this.j1[0]
    this.j0[1] = this.j1[1]
    this.j0[2] = this.j1[2]
    let lo = 9
    let at = 0
    for (let i = 0; i < n; i++) {
      D[i] += (Dt[i] - D[i]) * a
      if (i >= 14 && D[i] < lo) {
        lo = D[i]
        at = i
      }
    }
    this.vel += (this.velT - this.vel) * (1 - Math.exp(-dt / 0.012))
    this.reflect()
    const thin = Math.min(1, Math.max(0, (0.34 - lo) / 0.16))
    const open = Math.min(1, Math.max(0, (lo - 0.025) / 0.05))
    this.fricA = thin * open
    this.fricI = Math.min(n - 1, at + 1)
    if (lo < 0.03) {
      this.closedFor += dt
      this.closedAt = at
    } else {
      // a sealed mouth pops when it breaks; a nose that was already open has nothing to pop
      if (this.closedFor > 0.012 && this.press > 0.05 && this.vel < 0.3) {
        this.burst = 0.1 * this.press
        this.burstI = Math.min(n - 1, this.closedAt + 1)
      }
      this.closedFor = 0
    }
  }

  step(g, nz, t) {
    const { n, m, R, L, Ro, Lo, k, k0, at, nR, nL, nRo, nLo, nk } = this
    Ro[0] = L[0] * 0.75 + g
    Lo[n] = R[n - 1] * -0.85
    for (let i = 1; i < n; i++) {
      if (i === at + 1) continue
      const kk = k0[i] + (k[i] - k0[i]) * t
      const w = kk * (R[i - 1] + L[i])
      Ro[i] = R[i - 1] - w
      Lo[i] = L[i] + w
    }
    // three-way junction where the nose joins, between sections `at` and `at + 1`
    const i = at + 1
    const j0 = this.j0
    const j1 = this.j1
    const rl = j0[0] + (j1[0] - j0[0]) * t
    const rr = j0[1] + (j1[1] - j0[1]) * t
    const rn = j0[2] + (j1[2] - j0[2]) * t
    const pl = R[i - 1]
    const pr = L[i]
    const pn = nL[0]
    Lo[i] = rl * pl + (1 + rl) * (pn + pr)
    Ro[i] = rr * pr + (1 + rr) * (pl + pn)
    nRo[0] = rn * pn + (1 + rn) * (pr + pl)
    for (let q = 0; q < n; q++) {
      const r = Ro[q] * 0.9992
      const l = Lo[q + 1] * 0.9992
      R[q] = r
      L[q] = l
    }
    const fi = this.fricI
    // the short cavity in front of the teeth radiates hiss far better than the long one behind
    const place = fi >= 36 && fi < 40 ? 0.2 : fi < 36 ? 0.5 : 1
    const hiss = nz * this.fricA * this.press * place * (this.voice > 0.5 ? 0.33 : 0.72)
    R[fi] += hiss * 0.5
    L[fi] += hiss * 0.5
    if (this.burst > 1e-4) {
      const b = this.burst * (0.5 + nz * 0.5)
      R[this.burstI] += b * 0.5
      L[this.burstI] += b * 0.5
    }
    const lip = R[n - 1]
    // nose
    nLo[m] = nR[m - 1] * -0.85
    nk[1] += (this.nkT - nk[1]) * 0.002
    for (let q = 1; q < m; q++) {
      const w = nk[q] * (nR[q - 1] + nL[q])
      nRo[q] = nR[q - 1] - w
      nLo[q] = nL[q] + w
    }
    for (let q = 0; q < m; q++) {
      nR[q] = nRo[q] * 0.995
      nL[q] = nLo[q + 1] * 0.995
    }
    return lip + nR[m - 1]
  }

  sample() {
    const dtS = 1 / this.sr
    this.vibT += dtS
    this.wobT += dtS
    if (this.wobT > 0.09) {
      this.wobT = 0
      this.wobN = this.rand() * 0.012
    }
    this.wob += (this.wobN - this.wob) * 0.0006
    const f = this.f0 * (1 + 0.006 * Math.sin(2 * Math.PI * 5.2 * this.vibT) + this.wob)
    this.phase += f * dtS
    if (this.phase >= 1) this.phase -= 1
    const oq = 0.66
    const p = this.phase
    let u = 0
    if (p < oq) {
      const tau = p / oq
      u = 4.5 * tau * (2 - 3 * tau) * 0.25
    }
    this.tiltZ += (u - this.tiltZ) * 0.42
    const n0 = this.rand()
    this.nz += (n0 - this.nz) * 0.7
    const breathy = p < oq ? 1 : 0.35
    const g = (this.tiltZ * this.voice + this.nz * (this.asp * 0.55 + this.voice * 0.018) * breathy) * this.press
    this.burst *= 0.982
    return { g, n0 }
  }

  render(out, frames) {
    this.block(frames)
    const { n, R, L, E } = this
    let peak = 0
    const aF = 1 - Math.exp(-(1 / this.sr) / 0.012)
    const aS = 1 - Math.exp(-(1 / this.sr) / 0.02)
    for (let s = 0; s < frames; s++) {
      this.f0 += (this.f0T - this.f0) * aS
      this.voice += (this.voiceT - this.voice) * aF
      this.asp += (this.aspT - this.asp) * aF
      this.press += (this.pressT - this.press) * aF
      const { g, n0 } = this.sample()
      const t = s / frames
      const a = this.step(g, n0, t)
      const b = this.step(g, n0, t + 0.5 / frames)
      const x = (a + b) * 0.5
      this.dcY = x - this.dcX + 0.997 * this.dcY
      this.dcX = x
      const y = this.dcY * 0.78
      const c = y / (1 + Math.abs(y) * 0.22)
      out[s] = c
      const ac = Math.abs(c)
      if (ac > peak) peak = ac
      if (s % 8 === 0) {
        for (let i = 0; i < n; i++) {
          const v = R[i] + L[i]
          E[i] += v * v
        }
        this.eN++
      }
    }
    this.level += (peak - this.level) * 0.25
  }

  readEnergy(into) {
    const d = this.eN || 1
    for (let i = 0; i < this.n; i++) {
      into[i] = Math.sqrt(this.E[i] / d)
      this.E[i] = 0
    }
    this.eN = 0
  }
}
