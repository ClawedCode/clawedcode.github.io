// Web Audio for sunpatch.cascade(): a purr per cat that swells when its patch
// is right, a low drone that rises as the hush wakes, and small cues for lamps,
// paint and a room falling asleep. Created on the first user gesture.
export function createSunpatchAudio () {
  let ctx = null
  let master = null
  let noise = null
  let muted = false
  const voices = new Map()
  let drone = null

  const ensure = () => {
    if (ctx) return ctx
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.7
    master.connect(ctx.destination)
    const len = ctx.sampleRate * 2
    noise = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = noise.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
      data[i] = last * 3.5
    }
    return ctx
  }

  const purrVoice = (id, pan) => {
    if (voices.has(id)) return voices.get(id)
    const src = ctx.createBufferSource()
    src.buffer = noise
    src.loop = true
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 140 + Math.random() * 60
    band.Q.value = 1.2
    const am = ctx.createGain()
    am.gain.value = 0.5
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 22 + Math.random() * 6
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 0.5
    lfo.connect(lfoDepth).connect(am.gain)
    const level = ctx.createGain()
    level.gain.value = 0
    const panner = ctx.createStereoPanner()
    panner.pan.value = pan
    src.connect(band).connect(am).connect(level).connect(panner).connect(master)
    src.start()
    lfo.start()
    const voice = { level, nodes: [src, lfo] }
    voices.set(id, voice)
    return voice
  }

  const droneVoice = () => {
    if (drone) return drone
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = 49
    const osc2 = ctx.createOscillator()
    osc2.type = 'sawtooth'
    osc2.frequency.value = 49.6
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 160
    const level = ctx.createGain()
    level.gain.value = 0
    osc.connect(lp)
    osc2.connect(lp)
    lp.connect(level).connect(master)
    osc.start()
    osc2.start()
    drone = { level, lp, nodes: [osc, osc2] }
    return drone
  }

  const blip = (freq, dur, type = 'sine', gain = 0.12, when = 0) => {
    if (!ctx) return
    const t = ctx.currentTime + when
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g).connect(master)
    osc.start(t)
    osc.stop(t + dur + 0.05)
  }

  return {
    wake () {
      const c = ensure()
      if (c && c.state === 'suspended') c.resume().catch(() => {})
    },
    // creatures: [{ id, kind, pan, ok, ratio }]
    update (creatures) {
      if (!ctx) return
      const t = ctx.currentTime
      for (const c of creatures) {
        if (c.kind === 'hush') {
          const d = droneVoice()
          const awake = Math.max(0, Math.min(1.5, c.ratio)) / 1.5
          d.level.gain.setTargetAtTime(awake * 0.16, t, 0.25)
          d.lp.frequency.setTargetAtTime(120 + awake * 500, t, 0.25)
        } else {
          const v = purrVoice(c.id, c.pan)
          const target = c.ok ? 0.22 : Math.max(0, Math.min(1, c.ratio)) * 0.05
          v.level.gain.setTargetAtTime(target, t, 0.3)
        }
      }
    },
    lamp () { blip(660, 0.09, 'triangle', 0.08) },
    paint () { blip(220 + Math.random() * 60, 0.05, 'sine', 0.025) },
    asleep () {
      ;[392, 494, 587, 784].forEach((f, i) => blip(f, 1.6, 'sine', 0.07, i * 0.12))
    },
    setMuted (value) {
      muted = value
      if (master) master.gain.setTargetAtTime(value ? 0 : 0.7, ctx.currentTime, 0.05)
    },
    dispose () {
      for (const v of voices.values()) v.nodes.forEach(n => { try { n.stop() } catch { /* already stopped */ } })
      drone?.nodes.forEach(n => { try { n.stop() } catch { /* already stopped */ } })
      voices.clear()
      drone = null
      if (ctx) ctx.close().catch(() => {})
      ctx = null
    }
  }
}
