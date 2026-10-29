// Small synthesized foley for the sorting room: paper, wax, pigeonholes, boat.
export const createPostAudio = () => {
  let ctx = null
  let master = null
  let noise = null
  let muted = false

  const ensure = () => {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume()
      return ctx
    }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.55
    master.connect(ctx.destination)
    const len = ctx.sampleRate * 1.5
    noise = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    return ctx
  }

  const burst = ({ at = 0, dur = 0.2, type = 'bandpass', f0 = 1200, f1 = 2400, q = 0.9, gain = 0.4 }) => {
    if (!ensure()) return
    const t = ctx.currentTime + at
    const src = ctx.createBufferSource()
    src.buffer = noise
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.Q.value = q
    filter.frequency.setValueAtTime(f0, t)
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.03, dur * 0.3))
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(filter).connect(g).connect(master)
    src.start(t, Math.random() * 1.2)
    src.stop(t + dur + 0.05)
  }

  const tone = ({ at = 0, freq = 440, dur = 0.4, type = 'sine', gain = 0.2, glide = null, attack = 0.005 }) => {
    if (!ensure()) return
    const t = ctx.currentTime + at
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g).connect(master)
    osc.start(t)
    osc.stop(t + dur + 0.05)
  }

  return {
    unlock: () => { ensure() },
    setMuted: value => {
      muted = value
      if (master) master.gain.setTargetAtTime(value ? 0 : 0.55, ctx.currentTime, 0.04)
    },
    lift: () => burst({ dur: 0.12, f0: 2600, f1: 1800, gain: 0.12, q: 0.6 }),
    fold: layers => {
      burst({ dur: 0.22, f0: 900, f1: 3200, gain: 0.32, q: 0.7 })
      burst({ at: 0.16, dur: 0.07, type: 'lowpass', f0: 700, f1: 200, gain: 0.35 + Math.min(0.3, layers * 0.03), q: 0.4 })
      tone({ at: 0.17, freq: 120 - Math.min(50, layers * 5), dur: 0.12, gain: 0.12 })
    },
    unfold: () => burst({ dur: 0.26, f0: 3000, f1: 900, gain: 0.22, q: 0.7 }),
    turn: () => {
      burst({ dur: 0.3, type: 'lowpass', f0: 1800, f1: 400, gain: 0.2, q: 0.3 })
      burst({ at: 0.24, dur: 0.06, type: 'lowpass', f0: 500, f1: 150, gain: 0.25 })
    },
    thick: () => {
      tone({ freq: 96, dur: 0.12, type: 'triangle', gain: 0.22 })
      tone({ at: 0.13, freq: 84, dur: 0.14, type: 'triangle', gain: 0.18 })
    },
    seal: () => {
      burst({ dur: 0.45, type: 'highpass', f0: 3000, f1: 5000, gain: 0.09, q: 0.2 })
      tone({ at: 0.38, freq: 92, dur: 0.22, type: 'sine', gain: 0.38, glide: 60 })
      burst({ at: 0.38, dur: 0.08, type: 'lowpass', f0: 900, f1: 200, gain: 0.3 })
    },
    sealFail: () => {
      burst({ dur: 0.3, type: 'highpass', f0: 2600, f1: 4000, gain: 0.07, q: 0.2 })
      tone({ at: 0.2, freq: 70, dur: 0.18, type: 'triangle', gain: 0.16, glide: 50 })
    },
    refuse: () => {
      burst({ dur: 0.07, type: 'lowpass', f0: 600, f1: 200, gain: 0.4 })
      burst({ at: 0.14, dur: 0.07, type: 'lowpass', f0: 600, f1: 200, gain: 0.36 })
    },
    post: () => {
      burst({ dur: 0.5, f0: 1500, f1: 500, gain: 0.18, q: 0.5 })
      tone({ at: 0.46, freq: 1318, dur: 0.9, gain: 0.08 })
      tone({ at: 0.46, freq: 1975, dur: 0.6, gain: 0.04 })
    },
    horn: () => {
      for (const [f, at] of [[110, 0], [138.6, 0], [110, 1.9], [138.6, 1.9]]) tone({ at, freq: f, dur: 1.5, type: 'sawtooth', gain: 0.05, attack: 0.25 })
    },
    close: () => {
      if (ctx) ctx.close()
      ctx = null
    }
  }
}
