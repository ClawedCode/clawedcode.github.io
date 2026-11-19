// The bowed string runs in an AudioWorklet (or, failing that, a script node on the
// main thread). It reports what the string is doing and sends its shape back at a
// stroboscopic phase, so the picture is the same physics the ear hears.
import { BowCore } from './bow-core.js'

const POINTS = 97

// exported so the worklet body can be exercised outside a browser
export const workletSource = () => `
const BowCore = ${BowCore.toString()};
class WolfBow extends AudioWorkletProcessor {
  constructor() {
    super();
    this.core = new BowCore(sampleRate);
    this.shot = new Float32Array(${POINTS});
    this.nextShot = 0;
    this.lastPost = 0;
    this.step = 40;
    this.alive = true;
    this.report = null;
    this.port.onmessage = e => {
      const m = e.data;
      if (m === 'stop') { this.alive = false; return; }
      apply(this.core, m, this);
    };
  }
  process(inputs, outputs) {
    const out = outputs[0][0];
    if (!out) return this.alive;
    const c = this.core;
    for (let i = 0; i < out.length; i++) {
      out[i] = c.step();
      if (c.report) { this.report = c.report; c.report = null; }
      if (c.t >= this.nextShot) {
        c.shape(this.shot);
        const N = sampleRate / c.f0;
        this.nextShot = c.t + Math.ceil(780 / N) * N + N / this.step;
      }
    }
    if (c.t - this.lastPost >= 760) {
      this.lastPost = c.t;
      this.port.postMessage({ shape: this.shot.slice(), report: this.report, level: c.level, wolf: c.wolfLevel, sticking: c.sticking });
      this.report = null;
    }
    return this.alive;
  }
}
function apply(core, m, host) {
  if (m.note) core.setNote(m.note[0], m.note[1], m.note[2]);
  if (m.bow) core.setBow(m.bow[0], m.bow[1]);
  if (m.Z) core.setString(m.Z);
  if (m.elim) core.setElim(m.elim[0], m.elim[1]);
  if (m.body) { core.setBody(m.body[0], m.body[1], m.body[2]); core.me = m.body[3]; core.qe = m.body[4]; }
  if (m.knock) core.hit(m.knock);
  if (m.clear) core.clear();
  if (m.strobe) host.step = m.strobe;
}
registerProcessor('wolf-bow', WolfBow);
`

function applyToCore(core, m) {
  if (m.note) core.setNote(m.note[0], m.note[1], m.note[2])
  if (m.bow) core.setBow(m.bow[0], m.bow[1])
  if (m.Z) core.setString(m.Z)
  if (m.elim) core.setElim(m.elim[0], m.elim[1])
  if (m.body) {
    core.setBody(m.body[0], m.body[1], m.body[2])
    core.me = m.body[3]
    core.qe = m.body[4]
  }
  if (m.knock) core.hit(m.knock)
  if (m.clear) core.clear()
}

function hallImpulse(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    let lp = 0
    for (let i = 0; i < len; i++) {
      const t = i / ctx.sampleRate
      const env = Math.exp(-t * 2.1) * Math.min(1, t * 60)
      // the hall darkens as it decays: wood panels eat the top first
      lp += (Math.random() * 2 - 1 - lp) * (0.5 - 0.36 * Math.min(1, t / 1.6))
      d[i] = lp * env * 0.9
    }
    for (const [at, g] of [[0.019, 0.42], [0.034, 0.3], [0.061, 0.22], [0.093, 0.16]]) {
      d[Math.floor((at + ch * 0.0013) * ctx.sampleRate)] += g
    }
  }
  return buf
}

export function createWolfAudio({ onFrame }) {
  const AC = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null
  let ctx = null
  let port = null
  let node = null
  let master = null
  let wet = null
  let url = null
  let closed = false
  let muted = false
  let fallbackCore = null
  let pending = []
  const shot = new Float32Array(POINTS)

  const send = m => {
    if (closed) return
    if (port) port.postMessage(m)
    else if (fallbackCore) applyToCore(fallbackCore, m)
    else pending.push(m)
  }

  const chime = (freqs, gain = 0.06) => {
    if (!ctx || closed) return
    const t0 = ctx.currentTime + 0.02
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = f
      const at = t0 + i * 0.16
      g.gain.setValueAtTime(0, at)
      g.gain.linearRampToValueAtTime(gain, at + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0005, at + 2.4)
      o.connect(g)
      g.connect(master)
      g.connect(wet)
      o.start(at)
      o.stop(at + 2.5)
    })
  }

  const knuckle = () => {
    if (!ctx || closed) return
    const t0 = ctx.currentTime + 0.005
    const len = Math.floor(ctx.sampleRate * 0.06)
    const b = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = b.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.12))
    const s = ctx.createBufferSource()
    s.buffer = b
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 900
    f.Q.value = 1.4
    const g = ctx.createGain()
    g.gain.value = 0.35
    s.connect(f)
    f.connect(g)
    g.connect(master)
    s.start(t0)
  }

  return {
    get running() { return !!ctx && ctx.state === 'running' },
    get ready() { return !!(port || fallbackCore) },
    send,
    chime,
    knock(amount) {
      knuckle()
      send({ knock: amount })
    },
    setMuted(m) {
      muted = m
      if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.04)
    },
    setStrobe(step) { send({ strobe: step }) },
    async start() {
      if (ctx) {
        if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
        return true
      }
      if (!AC) return false
      ctx = new AC({ latencyHint: 'interactive' })
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      master = ctx.createGain()
      master.gain.value = muted ? 0 : 0.9
      const limiter = ctx.createDynamicsCompressor()
      limiter.threshold.value = -9
      limiter.knee.value = 6
      limiter.ratio.value = 10
      limiter.attack.value = 0.002
      limiter.release.value = 0.2
      master.connect(limiter)
      limiter.connect(ctx.destination)
      const room = ctx.createConvolver()
      room.buffer = hallImpulse(ctx, 2.8)
      wet = ctx.createGain()
      wet.gain.value = 0.32
      wet.connect(room)
      room.connect(master)
      // the box: a few fixed plate and air resonances on top of the coupled mode
      const body = [
        ['lowshelf', 110, 0.7, 3],
        ['peaking', 230, 1.4, 4],
        ['peaking', 470, 1.6, 3],
        ['peaking', 1150, 1.1, 2],
        ['peaking', 2600, 0.9, -5],
        ['lowpass', 6200, 0.6, 0]
      ].map(([type, f, q, g]) => {
        const b = ctx.createBiquadFilter()
        b.type = type
        b.frequency.value = f
        b.Q.value = q
        b.gain.value = g
        return b
      })
      for (let i = 0; i < body.length - 1; i++) body[i].connect(body[i + 1])
      const out = body[body.length - 1]
      const dry = ctx.createGain()
      dry.gain.value = 1.6
      out.connect(dry)
      dry.connect(master)
      dry.connect(wet)

      let ok = false
      if (ctx.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
        url = URL.createObjectURL(new Blob([workletSource()], { type: 'application/javascript' }))
        ok = await Promise.race([
          ctx.audioWorklet.addModule(url).then(() => true, () => false),
          new Promise(resolve => setTimeout(() => resolve(false), 2500))
        ])
      }
      if (closed) return false
      if (ok) {
        node = new AudioWorkletNode(ctx, 'wolf-bow', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] })
        port = node.port
        port.onmessage = e => {
          if (!closed) onFrame(e.data)
        }
      } else {
        // no worklet: the same string on the main thread
        const sr = ctx.sampleRate
        fallbackCore = new BowCore(sr)
        const sp = ctx.createScriptProcessor(1024, 0, 1)
        let nextShot = 0
        let report = null
        sp.onaudioprocess = e => {
          if (closed) return
          const o = e.outputBuffer.getChannelData(0)
          const c = fallbackCore
          for (let i = 0; i < o.length; i++) {
            o[i] = c.step()
            if (c.report) {
              report = c.report
              c.report = null
            }
            if (c.t >= nextShot) {
              c.shape(shot)
              const N = sr / c.f0
              nextShot = c.t + Math.ceil(780 / N) * N + N / 40
            }
          }
          if (!closed) onFrame({ shape: shot.slice(), report, level: c.level, wolf: c.wolfLevel, sticking: c.sticking })
          report = null
        }
        node = sp
      }
      node.connect(body[0])
      const queued = pending
      pending = []
      queued.forEach(send)
      return true
    },
    close() {
      closed = true
      if (port) port.postMessage('stop')
      if (node) {
        node.onaudioprocess = null
        node.disconnect()
      }
      if (ctx) ctx.close().catch(() => {})
      if (url) URL.revokeObjectURL(url)
      ctx = null
    }
  }
}
