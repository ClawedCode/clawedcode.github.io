// The stepwell's own acoustics: a long stone echo, drips pitched by tempo,
// glass chimes for each hatching, pigeons in the upper tiers, and wind.

const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]

export function createDayAudio() {
  const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!Ctx) return null
  const ctx = new Ctx()
  const master = ctx.createGain()
  master.gain.value = 0.8
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -18
  comp.ratio.value = 3
  master.connect(comp).connect(ctx.destination)

  // a 4.5 s echo: twelve tiers of sandstone around still water
  const len = Math.floor(ctx.sampleRate * 4.5)
  const ir = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      const t = i / ctx.sampleRate
      const early = t < 0.09 && (i % 977 < 3) ? 0.6 : 0
      d[i] = ((Math.random() * 2 - 1) * Math.exp(-t * 1.25) * 0.5 + early) * (t < 0.012 ? t / 0.012 : 1)
    }
  }
  const verb = ctx.createConvolver()
  verb.buffer = ir
  const wet = ctx.createGain()
  wet.gain.value = 0.42
  verb.connect(wet).connect(master)
  const dry = ctx.createGain()
  dry.gain.value = 0.7
  dry.connect(master)
  const send = node => { node.connect(dry); node.connect(verb) }

  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const nd = noiseBuf.getChannelData(0)
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
  const noise = () => {
    const s = ctx.createBufferSource()
    s.buffer = noiseBuf
    s.loop = true
    return s
  }

  // wind across the rim, swelling with cloud and dusk
  const wind = noise()
  const windF = ctx.createBiquadFilter()
  windF.type = 'bandpass'
  windF.frequency.value = 420
  windF.Q.value = 0.6
  const windG = ctx.createGain()
  windG.gain.value = 0.02
  wind.connect(windF).connect(windG).connect(master)
  wind.start()

  let muted = false
  const now = () => ctx.currentTime

  function drop(tempo, pan = 0, level = 1) {
    if (muted) return
    const t = now()
    const step = Math.round((tempo - 1.6) * 9)
    const base = 520 * 2 ** (PENTA[Math.max(0, Math.min(PENTA.length - 1, step))] / 12)
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(base, t)
    o.frequency.exponentialRampToValueAtTime(base * 1.9, t + 0.05)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.09 * level, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
    const p = ctx.createStereoPanner()
    p.pan.value = Math.max(-1, Math.min(1, pan))
    o.connect(g).connect(p)
    send(p)
    o.start(t)
    o.stop(t + 0.2)
  }

  function plop(pan = 0) {
    if (muted) return
    const t = now()
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(180, t)
    o.frequency.exponentialRampToValueAtTime(520, t + 0.09)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
    const n = noise()
    const nf = ctx.createBiquadFilter()
    nf.type = 'highpass'
    nf.frequency.value = 2400
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(0.12, t + 0.02)
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
    const p = ctx.createStereoPanner()
    p.pan.value = Math.max(-1, Math.min(1, pan))
    o.connect(g).connect(p)
    n.connect(nf).connect(ng).connect(p)
    send(p)
    o.start(t)
    o.stop(t + 0.35)
    n.start(t + 0.02)
    n.stop(t + 0.4)
  }

  function bell(freq, at, level = 0.12, decay = 2.6) {
    const partials = [[1, 1], [2.76, 0.45], [5.4, 0.25], [8.93, 0.12]]
    for (const [ratio, amp] of partials) {
      const o = ctx.createOscillator()
      o.frequency.value = freq * ratio
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, at)
      g.gain.exponentialRampToValueAtTime(level * amp, at + 0.004)
      g.gain.exponentialRampToValueAtTime(0.0001, at + decay / ratio ** 0.4)
      o.connect(g)
      send(g)
      o.start(at)
      o.stop(at + decay + 0.1)
    }
  }

  function hatch(terrace, count) {
    if (muted) return
    const t = now()
    const root = [880, 660, 494][terrace] || 660
    ;[0, 4, 7, 12].forEach((s, i) => bell(root * 2 ** ((s + count) / 12), t + i * 0.11, 0.07))
  }

  // a paw's ring passing a lens in focus: a single high glint
  function flare(terrace) {
    if (muted) return
    bell([1320, 990, 740][terrace] || 990, now(), 0.04, 1.2)
  }

  function potArrives() {
    if (muted) return
    const t = now()
    ;[0, 0.14].forEach((d, i) => {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.setValueAtTime(i ? 150 : 210, t + d)
      o.frequency.exponentialRampToValueAtTime(70, t + d + 0.12)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t + d)
      g.gain.exponentialRampToValueAtTime(0.2, t + d + 0.005)
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.18)
      o.connect(g)
      send(g)
      o.start(t + d)
      o.stop(t + d + 0.2)
    })
  }

  function coo() {
    if (muted) return
    const t = now()
    const f = 300 + Math.random() * 60
    ;[0, 0.32, 0.5].forEach((d, i) => {
      const o = ctx.createOscillator()
      o.frequency.setValueAtTime(f * (i === 1 ? 1.12 : 1), t + d)
      o.frequency.linearRampToValueAtTime(f * 0.86, t + d + 0.24)
      const trem = ctx.createOscillator()
      trem.frequency.value = 23
      const tg = ctx.createGain()
      tg.gain.value = 0.35
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t + d)
      g.gain.exponentialRampToValueAtTime(0.03, t + d + 0.05)
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.26)
      trem.connect(tg).connect(g.gain)
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 900
      const p = ctx.createStereoPanner()
      p.pan.value = Math.random() * 1.6 - 0.8
      o.connect(lp).connect(g).connect(p)
      send(p)
      o.start(t + d)
      trem.start(t + d)
      o.stop(t + d + 0.3)
      trem.stop(t + d + 0.3)
    })
  }

  // dusk: the lamps hum a chord that grows with their number
  let drone = []
  function dusk(lamps) {
    stopDrone()
    if (muted) return
    const t = now()
    const notes = [0, 7, 12, 16, 19, 24, 28].slice(0, Math.max(1, lamps))
    drone = notes.map((s, i) => {
      const o = ctx.createOscillator()
      o.type = i % 2 ? 'sine' : 'triangle'
      o.frequency.value = 110 * 2 ** (s / 12)
      o.detune.value = (i - 3) * 3
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(lamps ? 0.035 : 0.02, t + 2.5 + i * 0.6)
      o.connect(g)
      send(g)
      o.start(t + i * 0.6)
      return { o, g }
    })
    if (lamps) notes.forEach((s, i) => bell(440 * 2 ** (s / 12), t + 0.6 + i * 0.45, 0.05, 3.5))
  }
  function stopDrone() {
    const t = now()
    drone.forEach(({ o, g }) => {
      g.gain.cancelScheduledValues(t)
      g.gain.setTargetAtTime(0.0001, t, 0.3)
      o.stop(t + 1.5)
    })
    drone = []
  }

  function setWind(level) {
    windG.gain.setTargetAtTime(muted ? 0 : 0.015 + level * 0.06, now(), 0.8)
    windF.frequency.setTargetAtTime(380 + level * 300, now(), 0.8)
  }

  return {
    resume: () => ctx.state === 'suspended' && ctx.resume(),
    drop,
    plop,
    hatch,
    flare,
    potArrives,
    coo,
    dusk,
    stopDrone,
    setWind,
    setMuted(m) {
      muted = m
      master.gain.setTargetAtTime(m ? 0 : 0.8, now(), 0.05)
      if (m) stopDrone()
    },
    dispose() {
      stopDrone()
      wind.stop()
      ctx.close()
    }
  }
}
