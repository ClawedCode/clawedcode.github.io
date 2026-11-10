/**
 * slab.season() — the pass, heard from the watch hut.
 * Wind is a filtered noise bed whose level follows the day under the cursor.
 * A slide is a low collapse (the whumpf) followed by a roar sized by the slab.
 * A charge is a crack with a valley echo. The train is a two-note horn.
 */

export function createPassAudio() {
  const Ctx = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null
  if (!Ctx) return null
  const ctx = new Ctx()
  const master = ctx.createGain()
  master.gain.value = 0.8
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.ratio.value = 4
  master.connect(comp).connect(ctx.destination)

  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  {
    const d = noiseBuf.getChannelData(0)
    let b = 0
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1
      b = 0.985 * b + 0.015 * w * 6
      d[i] = 0.55 * w + 0.45 * b
    }
  }
  const noise = () => {
    const s = ctx.createBufferSource()
    s.buffer = noiseBuf
    s.loop = true
    return s
  }

  // wind bed
  const wind = noise()
  const windBand = ctx.createBiquadFilter()
  windBand.type = 'bandpass'
  windBand.frequency.value = 420
  windBand.Q.value = 0.7
  const windGain = ctx.createGain()
  windGain.gain.value = 0
  const gust = ctx.createOscillator()
  gust.frequency.value = 0.13
  const gustDepth = ctx.createGain()
  gustDepth.gain.value = 180
  gust.connect(gustDepth).connect(windBand.frequency)
  wind.connect(windBand).connect(windGain).connect(master)
  wind.start()
  gust.start()

  const echo = ctx.createDelay(2)
  echo.delayTime.value = 0.62
  const echoFb = ctx.createGain()
  echoFb.gain.value = 0.36
  const echoLp = ctx.createBiquadFilter()
  echoLp.type = 'lowpass'
  echoLp.frequency.value = 1400
  echo.connect(echoLp).connect(echoFb).connect(echo)
  echoLp.connect(master)

  let muted = false
  const now = () => ctx.currentTime

  return {
    resume() {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    },
    setMuted(m) {
      muted = m
      master.gain.setTargetAtTime(m ? 0 : 0.8, now(), 0.08)
    },
    setWind(speed, snowing) {
      const level = Math.min(0.32, 0.015 + speed * speed * 0.0022)
      windGain.gain.setTargetAtTime(level, now(), 0.4)
      windBand.frequency.setTargetAtTime(snowing ? 300 + speed * 25 : 520 + speed * 40, now(), 0.6)
    },
    slide(size, wet) {
      if (muted) return
      const t = now() + 0.02
      // the whumpf: the weak layer collapsing
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(92, t)
      o.frequency.exponentialRampToValueAtTime(28, t + 0.5)
      const og = ctx.createGain()
      og.gain.setValueAtTime(0.0001, t)
      og.gain.exponentialRampToValueAtTime(0.7, t + 0.02)
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
      o.connect(og).connect(master)
      o.start(t)
      o.stop(t + 0.7)
      // the run
      const n = noise()
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(wet ? 260 : 700, t)
      lp.frequency.linearRampToValueAtTime(wet ? 140 : 260, t + 1 + size)
      const ng = ctx.createGain()
      const peak = 0.12 + size * 0.07
      ng.gain.setValueAtTime(0.0001, t + 0.15)
      ng.gain.exponentialRampToValueAtTime(peak, t + 0.5 + size * 0.25)
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.4 + size * 0.7)
      n.connect(lp).connect(ng).connect(master)
      ng.connect(echo)
      n.start(t + 0.15)
      n.stop(t + 1.6 + size * 0.7)
    },
    charge() {
      if (muted) return
      const t = now() + 0.02
      const n = noise()
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 900
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.9, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
      n.connect(hp).connect(g).connect(master)
      g.connect(echo)
      n.start(t)
      n.stop(t + 0.2)
      const o = ctx.createOscillator()
      o.frequency.setValueAtTime(140, t)
      o.frequency.exponentialRampToValueAtTime(40, t + 0.25)
      const og = ctx.createGain()
      og.gain.setValueAtTime(0.5, t)
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
      o.connect(og).connect(master)
      o.start(t)
      o.stop(t + 0.32)
    },
    horn(distant = true) {
      if (muted) return
      const t = now() + 0.02
      const g = ctx.createGain()
      const lv = distant ? 0.05 : 0.11
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(lv, t + 0.06)
      g.gain.setValueAtTime(lv, t + 0.9)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15)
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 1100
      for (const f of [311, 370]) {
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = f
        o.connect(lp)
        o.start(t)
        o.stop(t + 1.2)
      }
      lp.connect(g).connect(master)
      g.connect(echo)
    },
    tick(pitch = 0) {
      if (muted) return
      const t = now() + 0.005
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.value = 1300 + pitch * 500
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.025, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
      o.connect(g).connect(master)
      o.start(t)
      o.stop(t + 0.06)
    },
    chord(good) {
      if (muted) return
      const t = now() + 0.02
      const notes = good ? [392, 494, 587, 784] : [220, 262]
      notes.forEach((f, i) => {
        const o = ctx.createOscillator()
        o.type = 'sine'
        o.frequency.value = f
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, t + i * 0.09)
        g.gain.exponentialRampToValueAtTime(0.08, t + i * 0.09 + 0.03)
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 1.4)
        o.connect(g).connect(master)
        g.connect(echo)
        o.start(t + i * 0.09)
        o.stop(t + i * 0.09 + 1.5)
      })
    },
    close() {
      try { wind.stop() } catch { /* already stopped */ }
      try { gust.stop() } catch { /* already stopped */ }
      ctx.close().catch(() => {})
    }
  }
}
