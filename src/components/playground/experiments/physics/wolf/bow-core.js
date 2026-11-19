// A bowed string, solved sample by sample.
// Four one-way travelling-wave lines meet at the bow; the bow is a stick-slip
// friction law with hysteresis; the bridge end is a body mode the string can
// drive, with an optional tuned mass (the wolf eliminator) hung beside it.
// Self-contained on purpose: the same class runs inside an AudioWorklet (by
// toString) and in plain JS for the offline checks.
export class BowCore {
  constructor(sr) {
    this.sr = sr
    this.dt = 1 / sr
    const S = 4096
    this.S = S
    this.mask = S - 1
    this.lines = [new Float32Array(S), new Float32Array(S), new Float32Array(S), new Float32Array(S)]
    // 0 bow->bridge, 1 bridge->bow, 2 bow->nut, 3 nut->bow
    this.w = 0
    // friction (hyperbolic, rosin-like)
    this.mus = 0.8
    this.mud = 0.32
    this.v0 = 0.12
    // string
    this.Z = 0.5
    this.f0 = 146.83
    this.beta = 0.1
    this.dB = 10
    this.dN = 90
    this.tdB = 10
    this.tdN = 90
    // bow
    this.vbow = 0
    this.force = 0
    this.tvbow = 0
    this.tforce = 0
    this.sticking = true
    this.slipSign = 1
    // bridge and nut losses
    this.gB = 0.982
    this.gN = 0.994
    this.lpB = 0
    this.lpN = 0
    this.aB = 0.6
    this.aN = 0.7
    this.corner = 0
    this.cs = 0.15
    // body mode at the bridge (the wolf)
    this.fw = 174
    this.qw = 40
    this.mw = 0.04
    this.xw = 0
    this.vw = 0
    // eliminator
    this.elim = false
    this.fe = 174
    this.qe = 60
    this.me = 0.005
    this.xe = 0
    this.ve = 0
    // knock
    this.knock = 0
    this.wolfAt = 0.095
    // measurement
    this.win = 0
    this.winLen = 4096
    this.slips = 0
    this.lastSlip = -1
    this.iSum = 0
    this.iSq = 0
    this.iN = 0
    this.sumSq = 0
    this.wolfSq = 0
    this.fSq = 0
    this.t = 0
    this.report = null
    this.hist = new Float32Array(8192)
    this.out = 0
    this.level = 0
    this.wolfLevel = 0
    this.setNote(146.83, 0.1)
  }

  // pitch and relative bow position (distance from bridge / vibrating length)
  setNote(f0, beta, snap) {
    this.f0 = f0
    this.beta = Math.min(0.45, Math.max(0.012, beta))
    // one-pole loss filters each add a little phase delay; take it back out
    const fix = this.aB / (1 - this.aB) + this.aN / (1 - this.aN) + 0.5
    const N = Math.max(8, this.sr / f0 - fix)
    this.tdB = Math.max(1.5, (N * this.beta) / 2)
    this.tdN = Math.max(1.5, (N * (1 - this.beta)) / 2)
    if (snap) {
      this.dB = this.tdB
      this.dN = this.tdN
    }
  }

  setBow(vbow, force, snap) {
    this.tvbow = vbow
    this.tforce = Math.max(0, force)
    if (snap) {
      this.vbow = vbow
      this.force = this.tforce
    }
  }

  setString(Z, gB, gN) {
    this.Z = Z
    if (gB) this.gB = gB
    if (gN) this.gN = gN
  }

  setBody(fw, qw, mw) {
    this.fw = fw
    this.qw = qw
    this.mw = mw
  }

  setElim(on, fe) {
    if (on && !this.elim) {
      this.xe = this.xw
      this.ve = this.vw
    }
    this.elim = !!on
    if (fe) this.fe = fe
  }

  // a different string starts at rest
  clear() {
    for (const l of this.lines) l.fill(0)
    this.lpB = 0
    this.lpN = 0
    this.corner = 0
    this.sticking = true
  }

  hit(amount) {
    this.knock = amount
  }

  read(line, d) {
    const buf = this.lines[line]
    const p = this.w - d
    const i = Math.floor(p)
    const f = p - i
    const a = buf[i & this.mask]
    const b = buf[(i + 1) & this.mask]
    return a + (b - a) * f
  }

  // the friction junction: u is the string's free velocity relative to the bow.
  // sticking holds while friction can supply the force; a slip stays on its own
  // branch (hysteresis) until that branch vanishes
  solve(u, k) {
    if (!(u === u)) return 0
    const cap = k * this.mus
    if (this.sticking) {
      if (Math.abs(u) <= cap) return 0
      this.sticking = false
      this.slipSign = u > 0 ? 1 : -1
    }
    for (let pass = 0; pass < 2; pass++) {
      const s = this.slipSign
      const U = s * u
      const b = this.v0 + k * this.mud - U
      const c = this.v0 * (k * this.mus - U)
      const disc = b * b - 4 * c
      if (disc >= 0) {
        const D = (-b + Math.sqrt(disc)) / 2
        if (D >= 0) return s * D
      }
      if (Math.abs(u) <= cap) {
        this.sticking = true
        return 0
      }
      this.slipSign = -s
    }
    return 0
  }

  step() {
    const dt = this.dt
    // glide the controls so nothing clicks
    // the bow lands before it travels: weight settles fast, speed builds
    this.vbow += (this.tvbow - this.vbow) * 0.0025
    this.force += (this.tforce - this.force) * 0.02
    this.dB += (this.tdB - this.dB) * 0.003
    this.dN += (this.tdN - this.dN) * 0.003
    const Z = this.Z
    const vbIn = this.read(1, this.dB)
    const vnIn = this.read(3, this.dN)
    const vh = vbIn + vnIn
    const k = this.force / (2 * Z)
    const wasSticking = this.sticking
    const delta = this.solve(vh - this.vbow, k)
    const dv = this.force > 1e-4 ? delta - (vh - this.vbow) : 0
    if (this.force <= 1e-4) this.sticking = false
    if (wasSticking && !this.sticking && this.force > 1e-4) this.onSlip()
    const m = this.mask
    const w = this.w & m
    // corner rounding (torsion and finite bow width) on the injection only
    this.corner += (dv - this.corner) * this.cs
    this.lines[0][w] = vnIn + this.corner
    this.lines[2][w] = vbIn + this.corner
    // bridge: reflect with loss, plus whatever the body is doing
    const vi = this.read(0, this.dB)
    this.lpB = (1 - this.aB) * vi + this.aB * this.lpB
    const vbr = this.vw
    const F = Z * (2 * vi - vbr) + this.knock
    this.knock = 0
    // body mode, driven by the string
    const kw = this.mw * (2 * Math.PI * this.fw) ** 2
    const cw = (this.mw * 2 * Math.PI * this.fw) / this.qw
    let Fe = 0
    if (this.elim) {
      const ke = this.me * (2 * Math.PI * this.fe) ** 2
      const ce = (this.me * 2 * Math.PI * this.fe) / this.qe
      Fe = ke * (this.xe - this.xw) + ce * (this.ve - this.vw)
      this.ve += (-Fe / this.me) * dt
      this.xe += this.ve * dt
    }
    this.vw += ((F - cw * this.vw - kw * this.xw + Fe) / this.mw) * dt
    this.xw += this.vw * dt
    this.lines[1][w] = -this.gB * this.lpB + vbr
    // nut / finger: a lossier reflection
    const vn = this.read(2, this.dN)
    this.lpN = (1 - this.aN) * vn + this.aN * this.lpN
    this.lines[3][w] = -this.gN * this.lpN
    this.w++
    // what the body radiates: bridge force plus its own ringing
    let o = F * 0.16 + this.vw * 9
    if (!(o === o) || Math.abs(o) > 1e3) {
      // never let a blow-up silence the instrument for good
      this.clear()
      this.xw = this.vw = this.xe = this.ve = 0
      o = 0
    }
    this.out = o
    this.fSq += F * F
    this.measure(o)
    return o
  }

  onSlip() {
    const t = this.t
    if (this.lastSlip >= 0) {
      const iv = t - this.lastSlip
      this.iSum += iv
      this.iSq += iv * iv
      this.iN++
    }
    this.lastSlip = t
    this.slips++
  }

  measure(o) {
    this.hist[this.t & 8191] = o
    this.t++
    this.win++
    this.sumSq += o * o
    this.wolfSq += this.vw * this.vw
    const N = this.sr / this.f0
    const len = Math.max(this.winLen, Math.ceil(4 * N))
    if (this.win < len) return
    const ratio = (this.slips * N) / this.win
    const mean = this.iN ? this.iSum / this.iN : 0
    const sd = this.iN > 1 ? Math.sqrt(Math.max(0, this.iSq / this.iN - mean * mean)) : 0
    const jitter = mean > 0 ? sd / N : 1
    const rms = Math.sqrt(this.sumSq / this.win)
    const wolf = Math.sqrt(this.wolfSq / this.win)
    // how hard the body answers the string: bridge velocity per unit bridge force
    const couple = wolf / Math.max(1e-6, Math.sqrt(this.fSq / this.win))
    // does each cycle repeat the last one? a whistle repeats, a crunch does not
    const lag = Math.round(N)
    const M = Math.min(2048, 2 * lag)
    let xy = 0
    let xx = 0
    let yy = 0
    for (let i = 1; i <= M; i++) {
      const a = this.hist[(this.t - i) & 8191]
      const b = this.hist[(this.t - i - lag) & 8191]
      xy += a * b
      xx += a * a
      yy += b * b
    }
    const periodic = xx > 0 && yy > 0 ? xy / Math.sqrt(xx * yy) : 0
    let regime = 'rest'
    if (Math.abs(this.vbow) > 0.008 && this.force > 0.03) {
      if (periodic < 0.86 || ratio < 0.88) regime = 'crunch'
      else if (ratio <= 1.14 && jitter < 0.07) regime = 'speak'
      else if (ratio >= 1.45) regime = 'whistle' // several slips a cycle: too light
      else regime = 'crunch'
      // the wolf: a broken voice while the body is answering the string far too hard
      if (regime !== 'speak' && couple > this.wolfAt) regime = 'wolf'
    }
    this.report = { regime, ratio, jitter, rms, wolf, couple, periodic, n: this.t, sr: this.sr }
    this.level = rms
    this.wolfLevel = wolf
    this.win = 0
    this.slips = 0
    this.iSum = 0
    this.iSq = 0
    this.iN = 0
    this.sumSq = 0
    this.wolfSq = 0
    this.fSq = 0
  }

  render(out, n) {
    for (let i = 0; i < n; i++) out[i] = this.step()
  }

  // the string's shape right now, bridge (index 0) to nut, from its travelling waves
  shape(points) {
    const M = points.length
    const L = 1
    const xb = this.beta * L
    const c = 2 * L * this.f0
    let y = 0
    const dx = L / (M - 1)
    points[0] = 0
    for (let j = 1; j < M; j++) {
      const x = (j - 0.5) * dx
      let toNut, toBridge
      if (x < xb) {
        const a = x / xb
        toBridge = this.read(0, this.dB * (1 - a))
        toNut = this.read(1, this.dB * a)
      } else {
        const a = (x - xb) / (L - xb)
        toNut = this.read(2, this.dN * a)
        toBridge = this.read(3, this.dN * (1 - a))
      }
      y += ((toBridge - toNut) / c) * dx
      points[j] = y
    }
    // pin the far end: the small residue is interpolation error
    const end = points[M - 1]
    for (let j = 0; j < M; j++) points[j] -= (end * j) / (M - 1)
    return points
  }
}
