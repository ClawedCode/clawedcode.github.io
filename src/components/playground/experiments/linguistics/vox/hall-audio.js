// The sound of the room: one waveguide worklet, then an acoustic hall around it.
import { TractCore } from './tract-core.js'

export const workletSource = () => `
const TractCore = ${TractCore.toString()};
class VoxThroat extends AudioWorkletProcessor {
  constructor() {
    super();
    this.core = new TractCore(sampleRate);
    this.buf = new Float32Array(128);
    this.tick = 0;
    this.energy = new Float32Array(44);
    this.alive = true;
    this.port.onmessage = e => {
      if (e.data === 'stop') { this.alive = false; return; }
      this.core.set(e.data);
    };
  }
  process(inputs, outputs) {
    const out = outputs[0][0];
    if (!out) return this.alive;
    this.core.render(out, out.length);
    if (++this.tick >= 12) {
      this.tick = 0;
      this.core.readEnergy(this.energy);
      this.port.postMessage({ e: this.energy, level: this.core.level });
    }
    return this.alive;
  }
}
registerProcessor('vox-throat', VoxThroat);
`

function hallImpulse(ctx, seconds, decay) {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    let lp = 0
    for (let i = 0; i < len; i++) {
      const t = i / ctx.sampleRate
      const env = Math.exp(-t * decay) * Math.min(1, t * 90)
      lp += ((Math.random() * 2 - 1) - lp) * (0.62 - 0.4 * Math.min(1, t / seconds))
      d[i] = lp * env
    }
    // the first slaps off the balcony
    for (const [at, g] of [[0.031, 0.5], [0.053, 0.34], [0.087, 0.26]]) {
      d[Math.floor(at * ctx.sampleRate) + c * 37] += g
    }
  }
  return buf
}

export function createHallAudio() {
  const AC = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null
  let ctx = null
  let node = null
  let master = null
  let analyser = null
  let room = null
  let rain = null
  let noiseBuf = null
  let muted = false
  let closed = false
  let url = null
  let fallback = null
  const spectrum = { data: null }
  const state = { ready: false, energy: new Float32Array(44), level: 0, fresh: false }

  const burst = (when, { gain = 0.2, f = 1800, q = 1, dur = 0.05, type = 'bandpass', wet = 0.5 }) => {
    if (!ctx || closed) return
    const src = ctx.createBufferSource()
    src.buffer = noiseBuf
    src.loop = true
    src.loopStart = Math.random() * 1.5
    const flt = ctx.createBiquadFilter()
    flt.type = type
    flt.frequency.value = f
    flt.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, when)
    g.gain.linearRampToValueAtTime(gain, when + 0.003)
    g.gain.exponentialRampToValueAtTime(0.0008, when + dur)
    src.connect(flt)
    flt.connect(g)
    g.connect(master)
    if (wet > 0) {
      const s = ctx.createGain()
      s.gain.value = wet
      g.connect(s)
      s.connect(room)
    }
    src.start(when, src.loopStart)
    src.stop(when + dur + 0.05)
  }

  return {
    state,
    spectrum,
    get ok() { return state.ready },
    get ctxState() { return ctx ? ctx.state : 'none' },
    wake() { if (ctx && ctx.state === 'suspended') ctx.resume() },
    async start() {
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume()
        return state.ready
      }
      if (!AC) return false
      ctx = new AC({ sampleRate: 48000, latencyHint: 'interactive' })
      if (ctx.state === 'suspended') ctx.resume()
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const nd = noiseBuf.getChannelData(0)
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
      master = ctx.createGain()
      master.gain.value = muted ? 0 : 0.85
      const limiter = ctx.createDynamicsCompressor()
      limiter.threshold.value = -6
      limiter.ratio.value = 8
      limiter.attack.value = 0.003
      limiter.release.value = 0.16
      master.connect(limiter)
      limiter.connect(ctx.destination)
      room = ctx.createConvolver()
      room.buffer = hallImpulse(ctx, 2.6, 2.3)
      const roomGain = ctx.createGain()
      roomGain.gain.value = 0.3
      room.connect(roomGain)
      roomGain.connect(master)
      analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.15
      spectrum.data = new Uint8Array(analyser.frequencyBinCount)
      let worklet = false
      if (ctx.audioWorklet) {
        url = URL.createObjectURL(new Blob([workletSource()], { type: 'application/javascript' }))
        // some hosts never settle this promise; the throat must not stay mute over it
        worklet = await Promise.race([
          ctx.audioWorklet.addModule(url).then(() => true, () => false),
          new Promise(resolve => setTimeout(() => resolve(false), 2500))
        ])
      }
      if (closed) return false
      if (worklet) {
        node = new AudioWorkletNode(ctx, 'vox-throat', { numberOfInputs: 0, outputChannelCount: [1] })
        node.onprocessorerror = e => console.warn('vox.humana worklet stopped', e.message || e.type || '')
        node.port.onmessage = e => {
          state.energy.set(e.data.e)
          state.level = e.data.level
          state.fresh = true
        }
      } else {
        // same waveguide on the main thread: costlier, but the same voice
        const core = new TractCore(ctx.sampleRate)
        const chunk = new Float32Array(128)
        node = ctx.createScriptProcessor(1024, 0, 1)
        node.onaudioprocess = e => {
          const out = e.outputBuffer.getChannelData(0)
          for (let i = 0; i < out.length; i += 128) {
            core.render(chunk, 128)
            out.set(chunk, i)
          }
          core.readEnergy(state.energy)
          state.level = core.level
          state.fresh = true
        }
        fallback = core
      }
      state.engine = worklet ? 'worklet' : 'main-thread'
      const dry = ctx.createGain()
      dry.gain.value = 0.72
      const send = ctx.createGain()
      send.gain.value = 0.42
      node.connect(analyser)
      node.connect(dry)
      node.connect(send)
      dry.connect(master)
      send.connect(room)
      // the room tone of an occupied hall
      const hush = ctx.createBufferSource()
      hush.buffer = noiseBuf
      hush.loop = true
      const hf = ctx.createBiquadFilter()
      hf.type = 'lowpass'
      hf.frequency.value = 340
      const hg = ctx.createGain()
      hg.gain.value = 0.012
      hush.connect(hf)
      hf.connect(hg)
      hg.connect(master)
      hush.start()
      this._hush = hg
      state.ready = true
      return true
    },
    send(p) {
      if (fallback) fallback.set(p)
      else if (node) node.port.postMessage(p)
    },
    readSpectrum() {
      if (!analyser) return null
      analyser.getByteFrequencyData(spectrum.data)
      return spectrum.data
    },
    get binHz() { return ctx ? ctx.sampleRate / 1024 : 46.875 },
    setSeats(n) { if (this._hush && ctx) this._hush.gain.setTargetAtTime(0.004 + 0.0018 * n, ctx.currentTime, 0.6) },
    setRain(on) {
      if (!ctx || closed) return
      if (on && !rain) {
        const s = ctx.createBufferSource()
        s.buffer = noiseBuf
        s.loop = true
        const f = ctx.createBiquadFilter()
        f.type = 'highpass'
        f.frequency.value = 1800
        const g = ctx.createGain()
        g.gain.value = 0
        g.gain.setTargetAtTime(0.008, ctx.currentTime, 1.2)
        s.connect(f)
        f.connect(g)
        g.connect(master)
        s.start()
        rain = { s, g }
      } else if (!on && rain) {
        const r = rain
        rain = null
        r.g.gain.setTargetAtTime(0, ctx.currentTime, 0.5)
        r.s.stop(ctx.currentTime + 2.5)
      }
    },
    pin() {
      if (!ctx || closed) return
      const t = ctx.currentTime
      burst(t, { gain: 0.62, f: 2600, q: 6, dur: 0.05, wet: 0.5 })
      burst(t + 0.05, { gain: 0.5, f: 900, q: 8, dur: 0.07, wet: 0.5 })
    },
    key() { if (ctx && !closed) burst(ctx.currentTime, { gain: 0.05, f: 1500, q: 4, dur: 0.03, wet: 0.2 }) },
    pump() {
      if (!ctx || closed) return
      burst(ctx.currentTime, { gain: 0.1, f: 420, q: 0.7, dur: 0.34, wet: 0.3 })
      burst(ctx.currentTime + 0.3, { gain: 0.05, f: 2200, q: 3, dur: 0.05, wet: 0.2 })
    },
    applause(seats, strength = 1) {
      if (!ctx || closed || seats <= 0) return
      const t = ctx.currentTime
      // the whole room swells and dies away together; single claps only give it its grain
      const span = 1.0 + strength * 1.1
      const claps = Math.min(110, Math.floor(seats * 3.4 * strength))
      for (let i = 0; i < claps; i++) {
        const u = Math.random()
        const at = t + 0.06 + u * span
        const crowd = Math.min(1, (u * span) / 0.3) * Math.exp(-Math.max(0, u * span - 0.3) / (0.55 * span))
        const low = Math.random() < 0.35
        burst(at, { gain: (0.1 + Math.random() * 0.12) * crowd, f: low ? 260 + Math.random() * 320 : 700 + Math.random() * 1500, q: 0.8, dur: 0.035 + Math.random() * 0.04, wet: 0.7 })
      }
    },
    cough() {
      if (!ctx || closed) return
      const t = ctx.currentTime + Math.random() * 0.2
      burst(t, { gain: 0.42, f: 520, q: 1.3, dur: 0.1, wet: 1.4 })
      burst(t + 0.13, { gain: 0.27, f: 680, q: 1.5, dur: 0.09, wet: 1.4 })
    },
    creak() {
      if (!ctx || closed) return
      const t = ctx.currentTime
      for (let i = 0; i < 6; i++) burst(t + i * 0.035 + Math.random() * 0.012, { gain: 0.32, f: 1100 + i * 90, q: 9, dur: 0.03, wet: 1 })
    },
    laugh() {
      if (!ctx || closed) return
      const t = ctx.currentTime
      // a few people, not one radio: scattered pitches and overlapping bursts, well back in the room
      for (let i = 0; i < 16; i++) burst(t + i * 0.085 + Math.random() * 0.09, { gain: 0.15, f: 420 + Math.random() * 520, q: 1.6, dur: 0.07 + Math.random() * 0.05, wet: 1.4 })
    },
    setMuted(m) {
      muted = m
      if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.85, ctx.currentTime, 0.02)
    },
    destroy() {
      closed = true
      if (node) {
        if (fallback) node.onaudioprocess = null
        else {
          node.port.onmessage = null
          node.port.postMessage('stop')
        }
        node.disconnect()
      }
      if (url) URL.revokeObjectURL(url)
      if (ctx && ctx.state !== 'closed') ctx.close()
      ctx = null
      node = null
    }
  }
}
