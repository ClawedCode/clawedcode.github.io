// Small Web Audio kit: a weather-shaped wind bed, vernier ticks, reading chimes.
const WIND = { clear: 0.05, haze: 0.07, valley: 0.04, rain: 0.16 }
const SCALE = [293.66, 329.63, 392, 440, 493.88, 587.33, 659.25, 783.99, 880, 987.77, 1174.66]

export function createSurveyAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  const ctx = new Ctx()
  const master = ctx.createGain()
  master.gain.value = 0.6
  const comp = ctx.createDynamicsCompressor()
  master.connect(comp)
  comp.connect(ctx.destination)

  const noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate)
  const data = noise.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    data[i] = last * 3.2
  }
  const wind = ctx.createBufferSource()
  wind.buffer = noise
  wind.loop = true
  const windFilter = ctx.createBiquadFilter()
  windFilter.type = 'bandpass'
  windFilter.frequency.value = 420
  windFilter.Q.value = 0.6
  const windGain = ctx.createGain()
  windGain.gain.value = 0
  wind.connect(windFilter)
  windFilter.connect(windGain)
  windGain.connect(master)
  wind.start()
  const lfo = ctx.createOscillator()
  const lfoGain = ctx.createGain()
  lfo.frequency.value = 0.09
  lfoGain.gain.value = 180
  lfo.connect(lfoGain)
  lfoGain.connect(windFilter.frequency)
  lfo.start()

  const env = (gainNode, peak, attack, decay, at) => {
    gainNode.gain.setValueAtTime(0.0001, at)
    gainNode.gain.exponentialRampToValueAtTime(peak, at + attack)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
  }
  const tone = (freq, peak, decay, type = 'sine', delay = 0) => {
    if (ctx.state === 'closed') return
    const at = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    osc.connect(g)
    g.connect(master)
    env(g, peak, 0.008, decay, at)
    osc.start(at)
    osc.stop(at + decay + 0.05)
  }
  let lastTick = 0

  return {
    resume: () => ctx.state === 'suspended' && ctx.resume(),
    setMuted: muted => ctx.state !== 'closed' && master.gain.setTargetAtTime(muted ? 0 : 0.6, ctx.currentTime, 0.05),
    weather: id => ctx.state !== 'closed' && windGain.gain.setTargetAtTime(WIND[id] ?? 0.05, ctx.currentTime, 1.2),
    tick: () => {
      const now = ctx.currentTime
      if (now - lastTick < 0.045) return
      lastTick = now
      tone(2400 + Math.random() * 300, 0.035, 0.02, 'square')
    },
    zoom: up => tone(up ? 520 : 390, 0.06, 0.08, 'triangle'),
    read: index => {
      tone(SCALE[index % SCALE.length], 0.16, 1.1)
      tone(SCALE[index % SCALE.length] * 2.01, 0.04, 0.6, 'sine', 0.01)
    },
    fix: index => {
      const f = SCALE[index % SCALE.length]
      tone(f / 2, 0.18, 1.8, 'triangle')
      tone(f * 0.75, 0.12, 1.6, 'sine', 0.14)
      tone(f, 0.1, 1.4, 'sine', 0.28)
    },
    refuse: () => tone(140, 0.12, 0.25, 'sawtooth'),
    walk: () => [0, 0.32, 0.64, 0.96].forEach(d => tone(90 + Math.random() * 20, 0.14, 0.12, 'triangle', d)),
    ending: good => (good ? [293.66, 369.99, 440, 587.33] : [293.66, 349.23, 415.3, 523.25]).forEach((f, i) => tone(f, 0.12, 3.2, 'sine', i * 0.22)),
    dispose: () => { wind.stop(); lfo.stop(); ctx.close() }
  }
}
