// Darkroom foley, all synthesised: the timer tick, the enlarger lamp hum,
// developer sloshing in a tray, the clink of tongs and a fan in the wall.

export function createDarkroomAudio () {
  let ctx = null
  let master = null
  let hum = null
  let fan = null
  let noiseBuf = null
  let muted = false

  const ensure = () => {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      return ctx
    }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.8
    master.connect(ctx.destination)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    // extractor fan: a low filtered rumble that is always there
    const src = ctx.createBufferSource()
    src.buffer = noiseBuf
    src.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 220
    const g = ctx.createGain()
    g.gain.value = 0.035
    src.connect(lp).connect(g).connect(master)
    src.start()
    fan = { src, g }
    return ctx
  }

  const noiseBurst = (t, dur, freq, q, gain, type = 'bandpass') => {
    if (!ctx) return
    const s = ctx.createBufferSource()
    s.buffer = noiseBuf
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.04, dur * 0.3))
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(f).connect(g).connect(master)
    s.start(t, Math.random() * 1.5)
    s.stop(t + dur + 0.05)
  }

  const tone = (t, freq, dur, gain, type = 'sine') => {
    if (!ctx) return
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(master)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  return {
    wake () { ensure() },
    tick (strong = false) {
      if (!ensure()) return
      const t = ctx.currentTime
      noiseBurst(t, 0.03, strong ? 2600 : 3400, 6, strong ? 0.35 : 0.22)
      tone(t, strong ? 1320 : 1760, 0.04, 0.05, 'square')
    },
    lamp (on) {
      if (!ensure()) return
      const t = ctx.currentTime
      if (on && !hum) {
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = 100
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 340
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(0.06, t + 0.05)
        o.connect(lp).connect(g).connect(master)
        o.start(t)
        hum = { o, g }
        noiseBurst(t, 0.05, 900, 2, 0.3)
      } else if (!on && hum) {
        hum.g.gain.cancelScheduledValues(t)
        hum.g.gain.setValueAtTime(hum.g.gain.value, t)
        hum.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
        hum.o.stop(t + 0.15)
        hum = null
        noiseBurst(t, 0.05, 700, 2, 0.25)
      }
    },
    slosh (amount = 1) {
      if (!ensure()) return
      const t = ctx.currentTime
      noiseBurst(t, 0.45, 520 + Math.random() * 300, 1.2, 0.12 * amount, 'lowpass')
      noiseBurst(t + 0.08, 0.3, 1400, 3, 0.05 * amount)
    },
    drop () {
      if (!ensure()) return
      const t = ctx.currentTime
      noiseBurst(t, 0.6, 380, 0.9, 0.22, 'lowpass')
      tone(t + 0.02, 180, 0.18, 0.05)
    },
    clink () {
      if (!ensure()) return
      const t = ctx.currentTime
      tone(t, 2890, 0.25, 0.06, 'triangle')
      tone(t, 4110, 0.18, 0.03, 'sine')
    },
    switchClick () {
      if (!ensure()) return
      const t = ctx.currentTime
      noiseBurst(t, 0.04, 1800, 3, 0.4)
      tone(t, 90, 0.05, 0.06, 'square')
    },
    chime (bright = false) {
      if (!ensure()) return
      const t = ctx.currentTime
      const base = bright ? 660 : 440
      ;[1, 1.5, 2.01].forEach((m, i) => tone(t + i * 0.09, base * m, 1.4, 0.05 / (i + 1)))
    },
    drip () {
      if (!ensure()) return
      const t = ctx.currentTime
      const o = ctx.createOscillator()
      o.frequency.setValueAtTime(1400, t)
      o.frequency.exponentialRampToValueAtTime(500, t + 0.07)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.005)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
      o.connect(g).connect(master)
      o.start(t)
      o.stop(t + 0.15)
    },
    setMuted (m) {
      muted = m
      if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.05)
    },
    dispose () {
      if (!ctx) return
      try { fan?.src.stop() } catch { /* already stopped */ }
      try { hum?.o.stop() } catch { /* already stopped */ }
      ctx.close().catch(() => {})
      ctx = null
      hum = null
    }
  }
}
