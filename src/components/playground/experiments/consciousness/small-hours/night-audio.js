// Foley for a sleeping house. Everything is synthesised; nothing is loaded.
export function createNightAudio() {
  const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!Ctx) return null
  const ctx = new Ctx()
  const master = ctx.createGain()
  master.gain.value = 0.7
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -16
  master.connect(comp).connect(ctx.destination)

  const room = ctx.createConvolver()
  const irLen = ctx.sampleRate * 1.6
  const ir = ctx.createBuffer(2, irLen, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c)
    for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / irLen) ** 3.2
  }
  room.buffer = ir
  const wet = ctx.createGain()
  wet.gain.value = 0.22
  room.connect(wet).connect(master)

  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const nd = noise.getChannelData(0)
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1

  const out = pan => {
    const p = ctx.createStereoPanner()
    p.pan.value = Math.max(-0.9, Math.min(0.9, pan || 0))
    p.connect(master)
    p.connect(room)
    return p
  }
  const env = (g, peak, attack, decay, at) => {
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
  }
  const burst = ({ type = 'bandpass', freq, q = 1, peak, attack = 0.003, decay, pan, at = ctx.currentTime + 0.005, sweep }) => {
    const src = ctx.createBufferSource()
    src.buffer = noise
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.setValueAtTime(freq, at)
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, at + attack + decay)
    f.Q.value = q
    const g = ctx.createGain()
    env(g, peak, attack, decay, at)
    src.connect(f).connect(g).connect(out(pan))
    src.start(at, Math.random() * 1.5)
    src.stop(at + attack + decay + 0.05)
  }
  const tone = ({ freq, type = 'sine', peak, attack = 0.004, decay, pan, at = ctx.currentTime + 0.005, glide }) => {
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, at)
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, at + attack + decay)
    const g = ctx.createGain()
    env(g, peak, attack, decay, at)
    o.connect(g).connect(out(pan))
    o.start(at)
    o.stop(at + attack + decay + 0.05)
  }

  // Continuous beds: fridge hum and rain.
  const hum = ctx.createOscillator()
  hum.type = 'sawtooth'
  hum.frequency.value = 58
  const humLow = ctx.createBiquadFilter()
  humLow.type = 'lowpass'
  humLow.frequency.value = 190
  const humGain = ctx.createGain()
  humGain.gain.value = 0
  hum.connect(humLow).connect(humGain).connect(out(0.6))
  hum.start()
  const rainSrc = ctx.createBufferSource()
  rainSrc.buffer = noise
  rainSrc.loop = true
  const rainBand = ctx.createBiquadFilter()
  rainBand.type = 'highpass'
  rainBand.frequency.value = 1400
  const rainGain = ctx.createGain()
  rainGain.gain.value = 0
  rainSrc.connect(rainBand).connect(rainGain).connect(out(0))
  rainSrc.start()
  const carSrc = ctx.createBufferSource()
  carSrc.buffer = noise
  carSrc.loop = true
  const carLow = ctx.createBiquadFilter()
  carLow.type = 'lowpass'
  carLow.frequency.value = 320
  const carGain = ctx.createGain()
  carGain.gain.value = 0
  carSrc.connect(carLow).connect(carGain).connect(out(-0.5))
  carSrc.start()

  let muted = false
  return {
    ctx,
    unlock() { if (ctx.state === 'suspended') ctx.resume() },
    setMuted(m) {
      muted = m
      master.gain.setTargetAtTime(m ? 0 : 0.7, ctx.currentTime, 0.05)
    },
    get muted() { return muted },
    paw(surface, amp, pan) {
      const hard = surface.hard
      burst({ freq: hard ? 2100 : 700, q: hard ? 2.5 : 0.8, peak: 0.05 + amp * 0.16, decay: hard ? 0.05 : 0.09, pan })
      if (hard) tone({ freq: 140 + Math.random() * 40, peak: amp * 0.05, decay: 0.05, pan })
    },
    tink(pan) {
      tone({ freq: 2900 + Math.random() * 400, type: 'triangle', peak: 0.07, decay: 0.12, pan })
      tone({ freq: 4700, type: 'sine', peak: 0.03, decay: 0.08, pan })
    },
    creak(pan) {
      const at = ctx.currentTime + 0.01
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(190, at)
      o.frequency.linearRampToValueAtTime(260 + Math.random() * 80, at + 0.18)
      o.frequency.linearRampToValueAtTime(170, at + 0.42)
      const f = ctx.createBiquadFilter()
      f.type = 'bandpass'
      f.frequency.value = 900
      f.Q.value = 6
      const g = ctx.createGain()
      env(g, 0.22, 0.04, 0.42, at)
      const trem = ctx.createOscillator()
      trem.frequency.value = 34
      const tg = ctx.createGain()
      tg.gain.value = 0.5
      trem.connect(tg).connect(g.gain)
      o.connect(f).connect(g).connect(out(pan))
      o.start(at)
      trem.start(at)
      o.stop(at + 0.5)
      trem.stop(at + 0.5)
    },
    land(surface, amp, pan) {
      burst({ type: 'lowpass', freq: surface.hard ? 900 : 300, q: 0.7, peak: 0.1 + amp * 0.2, decay: surface.hard ? 0.12 : 0.2, pan })
      tone({ freq: surface.hard ? 95 : 70, peak: 0.08 + amp * 0.12, decay: 0.16, pan, glide: 50 })
    },
    door(pan, soft) {
      const at = ctx.currentTime + 0.01
      const o = ctx.createOscillator()
      o.type = 'square'
      o.frequency.setValueAtTime(soft ? 300 : 420, at)
      o.frequency.exponentialRampToValueAtTime(soft ? 210 : 260, at + 0.7)
      const f = ctx.createBiquadFilter()
      f.type = 'bandpass'
      f.frequency.value = 1300
      f.Q.value = 9
      const g = ctx.createGain()
      env(g, soft ? 0.05 : 0.12, 0.08, 0.7, at)
      o.connect(f).connect(g).connect(out(pan))
      o.start(at)
      o.stop(at + 0.85)
      burst({ type: 'lowpass', freq: 240, peak: soft ? 0.05 : 0.14, decay: 0.15, pan, at: at + 0.72 })
    },
    note(freq) {
      const at = ctx.currentTime + 0.01
      ;[[1, 1], [2.01, 0.42], [3, 0.2], [4.2, 0.1]].forEach(([r, w]) => tone({ freq: freq * r, peak: 0.13 * w, attack: 0.004, decay: 2.4 / Math.sqrt(r), pan: 0.05, at }))
    },
    strike(freq) {
      const at = ctx.currentTime + 0.01
      ;[[1, 1], [2.4, 0.5], [3.9, 0.25]].forEach(([r, w]) => tone({ freq: freq * r, peak: 0.22 * w, attack: 0.003, decay: 3.6 / Math.sqrt(r), pan: 0.05, at }))
    },
    tick(soft) { burst({ freq: 3200, q: 5, peak: soft ? 0.012 : 0.025, decay: 0.02, pan: 0.05 }) },
    clunk(pan) {
      burst({ type: 'lowpass', freq: 160, peak: 0.12, decay: 0.25, pan })
      tone({ freq: 48, peak: 0.1, decay: 0.3, pan })
    },
    fridge(on) { humGain.gain.setTargetAtTime(on ? 0.035 : 0, ctx.currentTime, on ? 0.4 : 0.15) },
    rain(level) { rainGain.gain.setTargetAtTime(level * 0.09, ctx.currentTime, 0.6) },
    drop(pan) { burst({ freq: 3000 + Math.random() * 2500, q: 8, peak: 0.02, decay: 0.03, pan }) },
    car(level) { carGain.gain.setTargetAtTime(level * 0.16, ctx.currentTime, 0.4) },
    bark(pan) {
      const at = ctx.currentTime + 0.01
      tone({ freq: 520, type: 'sawtooth', peak: 0.2, attack: 0.01, decay: 0.16, glide: 300, pan, at })
      burst({ freq: 900, q: 1.2, peak: 0.18, attack: 0.005, decay: 0.14, pan, at })
    },
    rustle(pan) { burst({ freq: 1100, q: 0.5, peak: 0.06, attack: 0.15, decay: 0.6, pan, sweep: 700 }) },
    jingle(pan) { [0, 0.07, 0.15].forEach(d => tone({ freq: 3600 + d * 4000, type: 'triangle', peak: 0.03, decay: 0.12, pan, at: ctx.currentTime + 0.01 + d })) },
    murmur(pan) { tone({ freq: 140, type: 'triangle', peak: 0.06, attack: 0.12, decay: 0.5, glide: 110, pan }) },
    pick(pan) { tone({ freq: 660, type: 'triangle', peak: 0.04, decay: 0.1, pan }) },
    nest() {
      const at = ctx.currentTime + 0.02
      ;[392, 523.25, 659.25].forEach((f, i) => tone({ freq: f, type: 'sine', peak: 0.05, decay: 0.9, at: at + i * 0.09 }))
    },
    lamp() {
      burst({ freq: 4200, q: 6, peak: 0.12, decay: 0.03 })
      tone({ freq: 110, type: 'triangle', peak: 0.1, attack: 0.2, decay: 1.4, glide: 92 })
    },
    alarm() {
      const at = ctx.currentTime + 0.05
      for (let i = 0; i < 6; i++) tone({ freq: 880, type: 'square', peak: 0.03, decay: 0.09, at: at + i * 0.22 })
    },
    dispose() {
      ;[hum, rainSrc, carSrc].forEach(n => { try { n.stop() } catch { /* already stopped */ } })
      ctx.close()
    }
  }
}
