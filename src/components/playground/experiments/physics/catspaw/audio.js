// What a dinghy sounds like from the helm: wind in the ears that rises with
// the apparent wind, the hull's hiss with boat speed, the slap of a flogging
// sail, and the committee boat's horns. Everything is synthesised.

export function createAudio() {
  const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!Ctx) return null
  const ctx = new Ctx()
  const master = ctx.createGain()
  master.gain.value = 0.75
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.ratio.value = 3
  master.connect(comp).connect(ctx.destination)

  const len = ctx.sampleRate * 2
  const noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = noiseBuf.getChannelData(0)
  // pink-ish noise
  let b0 = 0, b1 = 0, b2 = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    b0 = 0.99765 * b0 + w * 0.099046
    b1 = 0.963 * b1 + w * 0.2965164
    b2 = 0.57 * b2 + w * 1.0526913
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18
  }
  const loop = () => {
    const s = ctx.createBufferSource()
    s.buffer = noiseBuf
    s.loop = true
    return s
  }

  // wind in the ears
  const windSrc = loop()
  const windBp = ctx.createBiquadFilter()
  windBp.type = 'bandpass'
  windBp.Q.value = 0.7
  windBp.frequency.value = 500
  const windGain = ctx.createGain()
  windGain.gain.value = 0
  windSrc.connect(windBp).connect(windGain).connect(master)
  // a slow gusting wobble
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.23
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 120
  lfo.connect(lfoGain).connect(windBp.frequency)

  // water past the hull
  const waterSrc = loop()
  const waterHp = ctx.createBiquadFilter()
  waterHp.type = 'highpass'
  waterHp.frequency.value = 1400
  const waterLp = ctx.createBiquadFilter()
  waterLp.type = 'lowpass'
  waterLp.frequency.value = 5200
  const waterGain = ctx.createGain()
  waterGain.gain.value = 0
  waterSrc.connect(waterHp).connect(waterLp).connect(waterGain).connect(master)

  // the sail flogging: noise chopped at the flutter rate
  const flogSrc = loop()
  const flogBp = ctx.createBiquadFilter()
  flogBp.type = 'bandpass'
  flogBp.frequency.value = 260
  flogBp.Q.value = 1.4
  const flogAm = ctx.createGain()
  flogAm.gain.value = 0
  const flogOsc = ctx.createOscillator()
  flogOsc.type = 'square'
  flogOsc.frequency.value = 7
  const flogDepth = ctx.createGain()
  flogDepth.gain.value = 0
  flogOsc.connect(flogDepth).connect(flogAm.gain)
  const flogGain = ctx.createGain()
  flogGain.gain.value = 0
  flogSrc.connect(flogBp).connect(flogAm).connect(flogGain).connect(master)

  for (const s of [windSrc, waterSrc, flogSrc, lfo, flogOsc]) s.start()

  const env = (node, peak, a, r, at = ctx.currentTime) => {
    node.gain.cancelScheduledValues(at)
    node.gain.setValueAtTime(0.0001, at)
    node.gain.exponentialRampToValueAtTime(peak, at + a)
    node.gain.exponentialRampToValueAtTime(0.0001, at + a + r)
  }

  function horn(n = 1) {
    for (let k = 0; k < n; k++) {
      const at = ctx.currentTime + k * 0.55
      const g = ctx.createGain()
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 1500
      g.connect(lp).connect(master)
      for (const f of [233, 311, 350]) {
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = f
        o.connect(g)
        o.start(at)
        o.stop(at + 0.5)
      }
      g.gain.setValueAtTime(0.0001, at)
      g.gain.exponentialRampToValueAtTime(0.16, at + 0.04)
      g.gain.setValueAtTime(0.16, at + 0.38)
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5)
    }
  }
  function tone(freq, peak = 0.12, dur = 0.25, type = 'sine', at = ctx.currentTime) {
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = freq
    const g = ctx.createGain()
    o.connect(g).connect(master)
    env(g, peak, 0.01, dur, at)
    o.start(at)
    o.stop(at + dur + 0.05)
  }
  function thud(peak = 0.4) {
    const s = ctx.createBufferSource()
    s.buffer = noiseBuf
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 220
    const g = ctx.createGain()
    s.connect(lp).connect(g).connect(master)
    env(g, peak, 0.005, 0.35)
    s.start()
    s.stop(ctx.currentTime + 0.5)
  }
  function splash() {
    const s = ctx.createBufferSource()
    s.buffer = noiseBuf
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 900
    bp.Q.value = 0.5
    const g = ctx.createGain()
    s.connect(bp).connect(g).connect(master)
    env(g, 0.5, 0.02, 1.4)
    s.start()
    s.stop(ctx.currentTime + 1.6)
    thud(0.5)
  }

  const cues = {
    horn: n => horn(n || 1),
    beep: () => tone(1046, 0.08, 0.12, 'square'),
    bell: () => { tone(1318, 0.12, 1.6); tone(1975, 0.05, 1.2) },
    tack: () => { tone(160, 0.06, 0.12, 'triangle'); thud(0.12) },
    hail: () => { tone(392, 0.05, 0.18, 'triangle'); tone(523, 0.05, 0.22, 'triangle', ctx.currentTime + 0.12) },
    bump: () => thud(0.35),
    protest: () => { thud(0.35); tone(880, 0.07, 0.2, 'square'); tone(880, 0.07, 0.2, 'square', ctx.currentTime + 0.3) },
    recall: () => { horn(1); tone(660, 0.06, 0.3, 'square', ctx.currentTime + 0.6) },
    capsize: () => splash(),
    finish: n => {
      horn(1)
      const notes = n === 1 ? [523, 659, 784, 1046] : n <= 3 ? [523, 659, 784] : [523, 587]
      notes.forEach((f, i) => tone(f, 0.08, 0.5, 'triangle', ctx.currentTime + 0.6 + i * 0.16))
    },
    finishOther: () => tone(330, 0.04, 0.4, 'sine'),
    served: () => tone(784, 0.06, 0.3, 'triangle')
  }

  return {
    ctx,
    resume: () => ctx.state === 'suspended' && ctx.resume(),
    setMuted(m) {
      master.gain.setTargetAtTime(m ? 0 : 0.75, ctx.currentTime, 0.05)
    },
    // continuous sounds follow the boat
    update(b, running) {
      const now = ctx.currentTime
      const aws = running ? b.aws : 0
      windGain.gain.setTargetAtTime(Math.min(0.5, (aws / 10) ** 1.6 * 0.4), now, 0.2)
      windBp.frequency.setTargetAtTime(300 + aws * 70, now, 0.3)
      waterGain.gain.setTargetAtTime(running ? Math.min(0.35, (b.v / 4) ** 1.5 * 0.3) : 0, now, 0.15)
      waterLp.frequency.setTargetAtTime(2500 + b.v * 900, now, 0.2)
      const luff = running && !b.capsized ? b.luff : 0
      flogGain.gain.setTargetAtTime(luff * 0.35 * Math.min(1, aws / 4), now, 0.08)
      flogDepth.gain.setTargetAtTime(luff * 0.9, now, 0.08)
      flogAm.gain.setTargetAtTime(luff * 0.5, now, 0.08)
      flogOsc.frequency.setTargetAtTime(5 + aws * 0.9, now, 0.2)
    },
    cue(name, arg) {
      cues[name]?.(arg)
    },
    close() {
      try { ctx.close() } catch { /* already closed */ }
    }
  }
}
