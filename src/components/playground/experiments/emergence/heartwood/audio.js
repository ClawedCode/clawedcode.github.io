// The green's sound: wind in the leaves, each day's weather, and the cat's small noises.
// Starts only after a gesture; every node hangs off one master gain.

const PENTA = [0, 2, 4, 7, 9, 12, 14, 16]

export function createGreenAudio() {
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!AC) return null
  const ctx = new AC()
  const master = ctx.createGain()
  master.gain.value = 0.0001
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -20
  comp.ratio.value = 4
  master.connect(comp).connect(ctx.destination)

  const noiseBuf = (() => {
    const len = ctx.sampleRate * 3
    const b = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = b.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      d[i] = last * 3.2
    }
    return b
  })()
  const whiteBuf = (() => {
    const len = ctx.sampleRate
    const b = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = b.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    return b
  })()

  const loop = (buf, gainValue, freq, q = 0.7, type = 'lowpass') => {
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.value = gainValue
    src.connect(f).connect(g).connect(master)
    src.start()
    return { src, f, g }
  }

  const wind = loop(noiseBuf, 0.0, 700)
  const leaves = loop(whiteBuf, 0.0, 5200, 0.6, 'bandpass')
  const rain = loop(whiteBuf, 0.0, 2600, 0.4, 'highpass')
  const hum = (() => {
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = 55
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 180
    const g = ctx.createGain()
    g.gain.value = 0
    o.connect(f).connect(g).connect(master)
    o.start()
    return { o, f, g }
  })()

  let timers = []
  let mood = null

  const ramp = (param, v, t = 1.5) => {
    const now = ctx.currentTime
    param.cancelScheduledValues(now)
    param.setValueAtTime(param.value, now)
    param.linearRampToValueAtTime(v, now + t)
  }

  const tone = (freq, { at = 0, dur = 0.6, gain = 0.12, type = 'sine', attack = 0.005, dest = master } = {}) => {
    const t = ctx.currentTime + at
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(dest)
    o.start(t)
    o.stop(t + dur + 0.05)
    return o
  }

  const burst = ({ at = 0, dur = 0.05, gain = 0.2, freq = 1800, q = 1, type = 'bandpass' } = {}) => {
    const t = ctx.currentTime + at
    const src = ctx.createBufferSource()
    src.buffer = whiteBuf
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f).connect(g).connect(master)
    src.start(t, Math.random() * 0.8)
    src.stop(t + dur + 0.02)
  }

  const every = (fn, min, max) => {
    let alive = true
    const tick = () => {
      if (!alive) return
      fn()
      const id = setTimeout(tick, min + Math.random() * (max - min))
      timers.push(id)
    }
    const id = setTimeout(tick, min * Math.random())
    timers.push(id)
    return () => { alive = false }
  }

  const bird = () => {
    const base = 2400 + Math.random() * 1600
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      const o = tone(base, { at: i * 0.11, dur: 0.09, gain: 0.03, type: 'sine' })
      o.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.3), ctx.currentTime + i * 0.11 + 0.08)
    }
  }
  const crackle = () => {
    for (let i = 0; i < 3 + Math.random() * 4; i++) burst({ at: Math.random() * 0.4, dur: 0.02 + Math.random() * 0.03, gain: 0.08 + Math.random() * 0.1, freq: 900 + Math.random() * 2600, q: 2 })
  }
  const rook = () => {
    const o = tone(420 + Math.random() * 80, { dur: 0.22, gain: 0.03, type: 'sawtooth' })
    o.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2)
  }
  const car = () => {
    const now = ctx.currentTime
    ramp(hum.g.gain, 0.05, 2)
    hum.o.frequency.setValueAtTime(48 + Math.random() * 20, now)
    timers.push(setTimeout(() => ramp(hum.g.gain, 0.012, 3), 2600))
  }
  const gust = () => {
    ramp(wind.g.gain, 0.32 + Math.random() * 0.2, 1.2)
    ramp(leaves.g.gain, 0.05 + Math.random() * 0.03, 1.2)
    timers.push(setTimeout(() => { ramp(wind.g.gain, 0.16, 2.4); ramp(leaves.g.gain, 0.02, 2.4) }, 1800))
  }

  let stops = []
  function setMood(next) {
    if (mood === next) return
    mood = next
    stops.forEach(s => s())
    stops = []
    timers.forEach(clearTimeout)
    timers = []
    const m = {
      michaelmas: { wind: 0.09, leaves: 0.025, rain: 0, hum: 0 },
      'michaelmas-rain': { wind: 0.14, leaves: 0.02, rain: 0.05, hum: 0 },
      jubilee: { wind: 0.05, leaves: 0.012, rain: 0, hum: 0 },
      peace: { wind: 0.07, leaves: 0.02, rain: 0, hum: 0 },
      silence: { wind: 0.025, leaves: 0.004, rain: 0, hum: 0 },
      bypass: { wind: 0.08, leaves: 0.018, rain: 0, hum: 0.012 },
      storm: { wind: 0.18, leaves: 0.03, rain: 0.02, hum: 0.008 },
      'storm-high': { wind: 0.36, leaves: 0.06, rain: 0.07, hum: 0 },
      decades: { wind: 0.05, leaves: 0.006, rain: 0, hum: 0 },
      disc: { wind: 0.03, leaves: 0, rain: 0, hum: 0 }
    }[next] || { wind: 0.06, leaves: 0.01, rain: 0, hum: 0 }
    ramp(wind.g.gain, m.wind)
    ramp(leaves.g.gain, m.leaves)
    ramp(rain.g.gain, m.rain)
    ramp(hum.g.gain, m.hum)
    if (next === 'michaelmas') stops.push(every(bird, 1800, 5200))
    if (next === 'jubilee') stops.push(every(crackle, 200, 700))
    if (next === 'peace') stops.push(every(rook, 2500, 7000))
    if (next === 'bypass') stops.push(every(car, 5000, 11000))
    if (next === 'storm' || next === 'storm-high') stops.push(every(gust, next === 'storm-high' ? 1500 : 4500, next === 'storm-high' ? 3500 : 9000))
  }

  const api = {
    ctx,
    async start() {
      if (ctx.state !== 'running') await ctx.resume().catch(() => {})
      ramp(master.gain, 0.8, 1.2)
    },
    setMood,
    setMuted(muted) { ramp(master.gain, muted ? 0.0001 : 0.8, 0.4) },
    take() { tone(660, { dur: 0.12, gain: 0.07, type: 'triangle' }); burst({ dur: 0.04, gain: 0.05, freq: 3000 }) },
    place(spot) {
      const f = { roots: 180, bark: 240, hollow: 150, fork: 320, crown: 520 }[spot] || 220
      tone(f, { dur: 0.25, gain: 0.16, type: 'sine', attack: 0.002 })
      tone(f * 2.76, { dur: 0.09, gain: 0.04, type: 'sine', attack: 0.002 })
      burst({ dur: 0.06, gain: 0.08, freq: 900, q: 0.8 })
    },
    give() { tone(523, { dur: 0.5, gain: 0.06 }); tone(784, { at: 0.12, dur: 0.6, gain: 0.05 }) },
    story(n) {
      const root = 392
      for (let i = 0; i < 4; i++) {
        const step = PENTA[(n + i * 2) % PENTA.length]
        tone(root * Math.pow(2, step / 12), { at: i * 0.16, dur: 1.4, gain: 0.05, type: 'sine' })
        tone(root * 2 * Math.pow(2, step / 12), { at: i * 0.16 + 0.003, dur: 0.6, gain: 0.015, type: 'triangle' })
      }
    },
    loss() { tone(196, { dur: 1.2, gain: 0.05, type: 'triangle' }); tone(185, { at: 0.2, dur: 1.4, gain: 0.04, type: 'triangle' }) },
    hour(bell) {
      if (bell) {
        ;[1, 2.76, 5.4, 8.9].forEach((p, i) => tone(220 * p, { dur: 3 - i * 0.6, gain: 0.05 / (i + 1), attack: 0.003 }))
      } else {
        burst({ dur: 0.03, gain: 0.05, freq: 2400, q: 6 })
      }
    },
    ring(year) {
      const step = PENTA[year % PENTA.length]
      tone(262 * Math.pow(2, step / 12), { dur: 0.18, gain: 0.018, type: 'sine', attack: 0.002 })
    },
    saw() {
      ramp(hum.g.gain, 0.08, 0.6)
      hum.o.frequency.setValueAtTime(110, ctx.currentTime)
      hum.f.frequency.setValueAtTime(900, ctx.currentTime)
      timers.push(setTimeout(() => { ramp(hum.g.gain, 0, 2); hum.f.frequency.setValueAtTime(180, ctx.currentTime) }, 3500))
    },
    crash() {
      for (let i = 0; i < 18; i++) burst({ at: i * 0.07, dur: 0.25, gain: 0.25 - i * 0.012, freq: 200 + Math.random() * 500, q: 0.5, type: 'lowpass' })
      tone(48, { dur: 2.4, gain: 0.25, type: 'sine', attack: 0.01 })
    },
    dispose() {
      stops.forEach(s => s())
      timers.forEach(clearTimeout)
      ;[wind, leaves, rain].forEach(l => { try { l.src.stop() } catch { /* already stopped */ } })
      try { hum.o.stop() } catch { /* already stopped */ }
      ctx.close().catch(() => {})
    }
  }
  return api
}
