// Synthesised sounds of a manual exchange: drop shutters, plug clicks, the
// magneto ring, the operator's buzzer, muffled voices on the line and thunder.

export function createLineAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  const ctx = new Ctx()
  const master = ctx.createGain()
  master.gain.value = 0.62
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -18
  comp.ratio.value = 4
  master.connect(comp)
  comp.connect(ctx.destination)

  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const nd = noiseBuffer.getChannelData(0)
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1

  const noise = (duration, filterType, freq, q, gain, when = ctx.currentTime) => {
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer
    const filter = ctx.createBiquadFilter()
    filter.type = filterType
    filter.frequency.value = freq
    filter.Q.value = q
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, when)
    env.gain.linearRampToValueAtTime(gain, when + 0.004)
    env.gain.exponentialRampToValueAtTime(0.0001, when + duration)
    src.connect(filter).connect(env).connect(master)
    src.start(when, Math.random() * 1.5)
    src.stop(when + duration + 0.05)
    return { filter, env }
  }

  const tone = (freq, duration, gain, type = 'sine', when = ctx.currentTime) => {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, when)
    env.gain.linearRampToValueAtTime(gain, when + 0.01)
    env.gain.setValueAtTime(gain, when + Math.max(0.01, duration - 0.04))
    env.gain.linearRampToValueAtTime(0, when + duration)
    osc.connect(env).connect(master)
    osc.start(when)
    osc.stop(when + duration + 0.05)
    return osc
  }

  // The voice on the line: band-limited noise pushed through two moving
  // formants, gated into syllables. You hear that somebody speaks, and how.
  const voiceBus = ctx.createGain()
  voiceBus.gain.value = 0
  const lineBand = ctx.createBiquadFilter()
  lineBand.type = 'bandpass'
  lineBand.frequency.value = 1100
  lineBand.Q.value = 0.7
  voiceBus.connect(lineBand).connect(master)
  const voiceSrc = ctx.createBufferSource()
  voiceSrc.buffer = noiseBuffer
  voiceSrc.loop = true
  const buzz = ctx.createOscillator()
  buzz.type = 'sawtooth'
  buzz.frequency.value = 128
  const buzzGain = ctx.createGain()
  buzzGain.gain.value = 0.5
  const f1 = ctx.createBiquadFilter()
  f1.type = 'bandpass'
  f1.Q.value = 6
  f1.frequency.value = 520
  const f2 = ctx.createBiquadFilter()
  f2.type = 'bandpass'
  f2.Q.value = 8
  f2.frequency.value = 1500
  const syllable = ctx.createGain()
  syllable.gain.value = 0
  const noiseGain = ctx.createGain()
  noiseGain.gain.value = 0.35
  voiceSrc.connect(noiseGain)
  noiseGain.connect(f1)
  noiseGain.connect(f2)
  buzz.connect(buzzGain)
  buzzGain.connect(f1)
  buzzGain.connect(f2)
  f1.connect(syllable)
  f2.connect(syllable)
  syllable.connect(voiceBus)
  voiceSrc.start()
  buzz.start()

  const hum = ctx.createOscillator()
  hum.frequency.value = 50
  const humGain = ctx.createGain()
  humGain.gain.value = 0
  hum.connect(humGain).connect(master)
  hum.start()

  let muted = false
  let ringStop = 0

  return {
    resume: () => ctx.state === 'suspended' && ctx.resume(),
    setMuted(value) {
      muted = value
      master.gain.setTargetAtTime(value ? 0 : 0.62, ctx.currentTime, 0.05)
    },
    headset(on) {
      humGain.gain.setTargetAtTime(on && !muted ? 0.012 : 0, ctx.currentTime, 0.2)
    },
    drop() {
      const t = ctx.currentTime
      noise(0.05, 'bandpass', 2400, 3, 0.5, t)
      noise(0.09, 'bandpass', 900, 5, 0.35, t + 0.035)
      for (let i = 0; i < 6; i++) tone(i % 2 ? 0 : 230, 0.05, 0.05, 'square', t + 0.12 + i * 0.06)
    },
    plug(inserting) {
      const t = ctx.currentTime
      noise(0.03, 'highpass', inserting ? 3200 : 1800, 1, 0.45, t)
      noise(0.07, 'bandpass', inserting ? 700 : 420, 4, 0.4, t + 0.02)
    },
    busy() {
      const t = ctx.currentTime
      for (let i = 0; i < 3; i++) noise(0.02, 'highpass', 4000, 1, 0.5, t + i * 0.07)
    },
    ring(gain = 0.07) {
      const t = Math.max(ctx.currentTime, ringStop)
      ;[0, 0.6].forEach(offset => {
        ;[400, 450].forEach(freq => {
          const osc = tone(freq, 0.4, gain, 'sine', t + offset)
          const am = ctx.createOscillator()
          am.frequency.value = 17
          const depth = ctx.createGain()
          depth.gain.value = 18
          am.connect(depth).connect(osc.frequency)
          am.start(t + offset)
          am.stop(t + offset + 0.45)
        })
      })
      ringStop = t + 1.1
    },
    speak(chars, who) {
      const t = ctx.currentTime
      const pitch = 95 + ((who.charCodeAt(0) * 37 + who.length * 11) % 120)
      buzz.frequency.setValueAtTime(pitch, t)
      const syllables = Math.min(18, Math.max(3, Math.round(chars / 5)))
      syllable.gain.cancelScheduledValues(t)
      syllable.gain.setValueAtTime(0, t)
      for (let i = 0; i < syllables; i++) {
        const at = t + i * 0.13 + Math.random() * 0.03
        const vowel = [[520, 1500], [700, 1200], [300, 2200], [450, 900], [600, 1800]][Math.floor(Math.random() * 5)]
        f1.frequency.setTargetAtTime(vowel[0], at, 0.02)
        f2.frequency.setTargetAtTime(vowel[1], at, 0.02)
        buzz.frequency.setTargetAtTime(pitch * (1 + (Math.random() - 0.4) * 0.12), at, 0.04)
        syllable.gain.setTargetAtTime(i % 4 === 3 ? 0.08 : 0.6, at, 0.015)
        syllable.gain.setTargetAtTime(0.02, at + 0.08, 0.02)
      }
      syllable.gain.setTargetAtTime(0, t + syllables * 0.13 + 0.05, 0.05)
      voiceBus.gain.setTargetAtTime(0.5, t, 0.02)
    },
    murmur() {
      voiceBus.gain.setTargetAtTime(0.06, ctx.currentTime, 0.1)
    },
    fact() {
      const t = ctx.currentTime
      tone(1318, 0.18, 0.05, 'triangle', t)
      tone(1760, 0.32, 0.04, 'triangle', t + 0.09)
    },
    wrong() {
      const t = ctx.currentTime
      tone(180, 0.22, 0.06, 'square', t)
      tone(140, 0.3, 0.06, 'square', t + 0.18)
    },
    loss() {
      const t = ctx.currentTime
      tone(330, 0.5, 0.05, 'triangle', t)
      tone(311, 0.7, 0.04, 'triangle', t + 0.25)
    },
    mend() {
      const t = ctx.currentTime
      ;[523, 659, 784].forEach((f, i) => tone(f, 0.5, 0.035, 'sine', t + i * 0.12))
    },
    thunder() {
      const t = ctx.currentTime
      const { filter } = noise(3.2, 'lowpass', 420, 0.8, 0.9, t + 0.15)
      filter.frequency.exponentialRampToValueAtTime(60, t + 3)
      noise(0.25, 'highpass', 900, 0.7, 0.4, t)
    },
    bell() {
      const t = ctx.currentTime
      ;[0, 1.4, 2.8].forEach(offset => {
        ;[[220, 0.07], [440 * 1.19, 0.03], [440 * 1.5, 0.025], [880, 0.02]].forEach(([f, g]) => {
          const osc = ctx.createOscillator()
          osc.frequency.value = f
          const env = ctx.createGain()
          env.gain.setValueAtTime(0, t + offset)
          env.gain.linearRampToValueAtTime(g, t + offset + 0.01)
          env.gain.exponentialRampToValueAtTime(0.0001, t + offset + 2.4)
          osc.connect(env).connect(master)
          osc.start(t + offset)
          osc.stop(t + offset + 2.5)
        })
      })
    },
    dawn() {
      const t = ctx.currentTime
      ;[392, 494, 587, 784].forEach((f, i) => tone(f, 1.6, 0.03, 'sine', t + i * 0.35))
    },
    close() {
      voiceSrc.stop()
      buzz.stop()
      hum.stop()
      ctx.close()
    }
  }
}
