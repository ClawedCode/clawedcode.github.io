/**
 * fly.loft() — the sound of the house.
 * The rail is a rope hiss whose sheave ticks speed up with the haul. A batten
 * landing on its trim is a dull knock. Beginners are called with a bell. The
 * house murmurs, catches its breath at a bad sightline, and applauds at the
 * end in proportion to the notice.
 */

export function createLoftAudio() {
  const Ctx = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null
  if (!Ctx) return null
  const ctx = new Ctx()
  const master = ctx.createGain()
  master.gain.value = 0.85
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -18
  comp.ratio.value = 4
  master.connect(comp).connect(ctx.destination)

  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  {
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const noise = () => {
    const s = ctx.createBufferSource()
    s.buffer = noiseBuf
    s.loop = true
    return s
  }

  // --- the rope: band-passed hiss, amplitude-ticked by a square LFO (the sheaves)
  const rope = noise()
  const ropeBand = ctx.createBiquadFilter()
  ropeBand.type = 'bandpass'
  ropeBand.frequency.value = 1300
  ropeBand.Q.value = 1.4
  const ropeGain = ctx.createGain()
  ropeGain.gain.value = 0
  const tickGain = ctx.createGain()
  tickGain.gain.value = 0.6
  const tick = ctx.createOscillator()
  tick.type = 'square'
  tick.frequency.value = 6
  const tickDepth = ctx.createGain()
  tickDepth.gain.value = 0.4
  tick.connect(tickDepth).connect(tickGain.gain)
  rope.connect(ropeBand).connect(tickGain).connect(ropeGain).connect(master)
  rope.start()
  tick.start()

  // --- the house: a low murmur bed
  const crowd = noise()
  const crowdBand = ctx.createBiquadFilter()
  crowdBand.type = 'bandpass'
  crowdBand.frequency.value = 520
  crowdBand.Q.value = 0.6
  const crowdGain = ctx.createGain()
  crowdGain.gain.value = 0
  const sway = ctx.createOscillator()
  sway.frequency.value = 0.27
  const swayDepth = ctx.createGain()
  swayDepth.gain.value = 160
  sway.connect(swayDepth).connect(crowdBand.frequency)
  crowd.connect(crowdBand).connect(crowdGain).connect(master)
  crowd.start()
  sway.start()

  const env = (g, t, a, peak, d) => {
    g.gain.cancelScheduledValues(t)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + a)
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d)
  }

  const burst = (t, freq, q, peak, dur, type = 'bandpass') => {
    const s = noise()
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    env(g, t, 0.004, peak, dur)
    s.connect(f).connect(g).connect(master)
    s.start(t, Math.random() * 1.5)
    s.stop(t + dur + 0.05)
  }

  const tone = (t, freq, peak, dur, type = 'sine') => {
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = freq
    const g = ctx.createGain()
    env(g, t, 0.006, peak, dur)
    o.connect(g).connect(master)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  const MOTIFS = [
    [0, 4, 7, 12, 7],
    [0, 2, 7, 9, 14],
    [0, -5, 3, 7, 10],
    [12, 7, 3, 0, -5],
    [0, 5, 9, 12, 16]
  ]

  return {
    ctx,
    resume() { if (ctx.state === 'suspended') ctx.resume() },
    setMuted(m) { master.gain.setTargetAtTime(m ? 0 : 0.85, ctx.currentTime, 0.05) },
    /** v: metres per second currently moving on the rail, summed */
    setRope(v) {
      const k = Math.min(1, v / 3)
      ropeGain.gain.setTargetAtTime(k * 0.22, ctx.currentTime, 0.04)
      tick.frequency.setTargetAtTime(3 + k * 16, ctx.currentTime, 0.08)
      ropeBand.frequency.setTargetAtTime(900 + k * 900, ctx.currentTime, 0.08)
    },
    knock() {
      const t = ctx.currentTime + 0.01
      burst(t, 180, 0.8, 0.5, 0.18, 'lowpass')
      tone(t, 62, 0.35, 0.22)
    },
    bell() {
      const t = ctx.currentTime + 0.02
      for (let i = 0; i < 3; i++) {
        tone(t + i * 0.55, 988, 0.12, 1.4)
        tone(t + i * 0.55, 988 * 2.76, 0.03, 0.6)
      }
    },
    motif(i) {
      const t = ctx.currentTime + 0.05
      const m = MOTIFS[i % MOTIFS.length]
      m.forEach((st, k) => {
        const f = 392 * Math.pow(2, st / 12)
        tone(t + k * 0.24, f, 0.08, 0.9, 'triangle')
        tone(t + k * 0.24, f * 2, 0.02, 0.5)
      })
    },
    murmur(level) { crowdGain.gain.setTargetAtTime(level * 0.12, ctx.currentTime, 0.4) },
    gasp() {
      const t = ctx.currentTime + 0.02
      const s = noise()
      const f = ctx.createBiquadFilter()
      f.type = 'bandpass'
      f.Q.value = 2
      f.frequency.setValueAtTime(600, t)
      f.frequency.exponentialRampToValueAtTime(1500, t + 0.35)
      const g = ctx.createGain()
      env(g, t, 0.12, 0.16, 0.45)
      s.connect(f).connect(g).connect(master)
      s.start(t)
      s.stop(t + 0.7)
    },
    applause(stars) {
      const t = ctx.currentTime + 0.05
      const n = 30 + stars * 70
      const len = 1.4 + stars * 0.9
      for (let i = 0; i < n; i++) {
        const at = t + Math.random() * len * (0.6 + Math.random() * 0.4)
        burst(at, 1400 + Math.random() * 2200, 1.2, 0.05 + Math.random() * 0.05, 0.03)
      }
    },
    close() {
      try { ctx.close() } catch { /* already closed */ }
    }
  }
}
