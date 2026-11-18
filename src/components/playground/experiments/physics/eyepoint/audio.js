// Web Audio for the lane: a sea wash, a drone that tunes itself as an eye
// closes on the painter's, the spray of laid paint, the whitewash brush, the
// watchman's whistle and the bell of a sealed commission.

export function createAudio() {
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!AC) return null
  const ctx = new AC()
  const master = ctx.createGain()
  master.gain.value = 0.8
  const comp = ctx.createDynamicsCompressor()
  master.connect(comp); comp.connect(ctx.destination)

  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const nd = noiseBuf.getChannelData(0)
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
  const noise = () => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s }

  // sea wash: lowpassed noise breathing slowly
  const sea = noise()
  const seaF = ctx.createBiquadFilter(); seaF.type = 'lowpass'; seaF.frequency.value = 420
  const seaG = ctx.createGain(); seaG.gain.value = 0.05
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.035
  lfo.connect(lfoG); lfoG.connect(seaG.gain)
  sea.connect(seaF); seaF.connect(seaG); seaG.connect(master)
  sea.start(); lfo.start()

  // the tuning drone: three voices that pull into a fifth and an octave
  const droneG = ctx.createGain(); droneG.gain.value = 0
  const droneF = ctx.createBiquadFilter(); droneF.type = 'lowpass'; droneF.frequency.value = 900
  droneG.connect(droneF); droneF.connect(master)
  const base = [146.83, 220.0, 293.66]
  const spread = [-1, 1, -0.6]
  const voices = base.map((f, i) => {
    const o = ctx.createOscillator(); o.type = i === 0 ? 'triangle' : 'sine'; o.frequency.value = f
    const g = ctx.createGain(); g.gain.value = i === 0 ? 0.5 : 0.32
    o.connect(g); g.connect(droneG); o.start()
    return { o, g, f, s: spread[i] }
  })
  let droneOn = false

  const env = (g, t, a, peak, d) => {
    g.gain.cancelScheduledValues(t)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + a)
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d)
  }
  const tone = (f, t, dur, peak = 0.12, type = 'sine') => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t)
    const g = ctx.createGain()
    o.connect(g); g.connect(master)
    env(g, t, 0.01, peak, dur)
    o.start(t); o.stop(t + dur + 0.05)
    return o
  }
  const bell = (f, t, peak = 0.12) => {
    ;[1, 2.76, 5.4].forEach((m, i) => tone(f * m, t, 2.6 / (i + 1), peak / (i + 1.4)))
  }
  const burst = (t, dur, freq, q, peak, type = 'bandpass') => {
    const s = noise(); const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q
    const g = ctx.createGain()
    s.connect(f); f.connect(g); g.connect(master)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + 0.05)
    g.gain.setValueAtTime(peak, t + dur * 0.7)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.start(t); s.stop(t + dur + 0.05)
    return f
  }

  return {
    resume: () => ctx.state === 'suspended' && ctx.resume(),
    setMuted: m => { master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.05) },
    // closeness 0..1: far voices beat against each other, near ones lock into a chord
    drone: (on, closeness = 0) => {
      const t = ctx.currentTime
      if (on !== droneOn) { droneOn = on; droneG.gain.setTargetAtTime(on ? 0.11 : 0, t, 0.25) }
      if (!on) return
      const cents = (1 - closeness) ** 1.5 * 70
      voices.forEach(v => { v.o.frequency.setTargetAtTime(v.f * 2 ** ((cents * v.s) / 1200), t, 0.08) })
      droneF.frequency.setTargetAtTime(500 + closeness * 1400, t, 0.1)
    },
    lock: () => { const t = ctx.currentTime; bell(587.33, t, 0.14); bell(880, t + 0.18, 0.1); bell(1174.7, t + 0.36, 0.08) },
    spray: (dur = 1.4) => {
      const t = ctx.currentTime
      const f = burst(t, dur, 3200, 0.7, 0.09)
      f.frequency.setValueAtTime(2400, t); f.frequency.linearRampToValueAtTime(4200, t + dur)
      tone(1400, t, 0.04, 0.05, 'square'); tone(1400, t + dur - 0.05, 0.04, 0.04, 'square')
    },
    scrape: () => { burst(ctx.currentTime, 0.12, 380, 1.4, 0.05, 'lowpass') },
    clack: () => { const t = ctx.currentTime; tone(210, t, 0.09, 0.09, 'triangle'); burst(t, 0.05, 1800, 2, 0.04) },
    nope: () => { const t = ctx.currentTime; tone(160, t, 0.12, 0.08, 'square'); tone(150, t + 0.09, 0.14, 0.06, 'square') },
    view: () => { const t = ctx.currentTime; tone(660, t, 0.18, 0.04); tone(990, t + 0.05, 0.22, 0.03) },
    reads: ok => {
      const t = ctx.currentTime
      if (ok) { tone(523.25, t, 0.5, 0.06); tone(659.25, t + 0.08, 0.6, 0.05) } else { tone(311, t, 0.4, 0.05, 'triangle') }
    },
    whistle: () => {
      const t = ctx.currentTime
      const o = ctx.createOscillator(); o.type = 'sine'
      const g = ctx.createGain(); o.connect(g); g.connect(master)
      o.frequency.setValueAtTime(1500, t); o.frequency.linearRampToValueAtTime(2300, t + 0.25)
      o.frequency.setValueAtTime(1500, t + 0.4); o.frequency.linearRampToValueAtTime(2300, t + 0.65)
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.04)
      g.gain.setValueAtTime(0.08, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8)
      o.start(t); o.stop(t + 0.85)
    },
    whitewash: () => { const t = ctx.currentTime; for (let i = 0; i < 4; i++) burst(t + i * 0.32, 0.28, 900, 0.9, 0.05) },
    sealed: () => { const t = ctx.currentTime; [392, 493.88, 587.33, 783.99].forEach((f, i) => bell(f, t + i * 0.16, 0.09)) },
    close: () => { try { ctx.close() } catch { /* already closed */ } }
  }
}
