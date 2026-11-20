/**
 * errata.slip() — Procedural Letterpress & Harbor Foley Audio Engine
 *
 * Pure Web Audio API synthesis: no external samples, graceful no-op if
 * AudioContext is unavailable or muted, full teardown on dispose().
 */

export function createPressAudio() {
  let ctx = null
  let muted = false
  let noiseBuf = null

  function ensure() {
    if (muted || typeof window === 'undefined') return null
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    if (!ctx) {
      ctx = new AC()
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
    if (!noiseBuf && ctx) {
      const len = Math.floor(ctx.sampleRate * 0.4)
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
      const data = noiseBuf.getChannelData(0)
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.14))
      }
    }
    return ctx
  }

  function playPaperRustle(pitch = 1.0) {
    const c = ensure()
    if (!c || !noiseBuf) return
    const t = c.currentTime
    const src = c.createBufferSource()
    src.buffer = noiseBuf
    src.playbackRate.value = 0.85 * pitch
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(1650 * pitch, t)
    bp.Q.value = 1.8
    const gain = c.createGain()
    gain.gain.setValueAtTime(0.001, t)
    gain.gain.linearRampToValueAtTime(0.085, t + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.14)
    src.connect(bp).connect(gain).connect(c.destination)
    src.start(t)
    src.stop(t + 0.16)
  }

  function playSlipPaste(isStet = false) {
    const c = ensure()
    if (!c) return
    const t = c.currentTime
    // Gummed paper tap + vermilion ink stamp thud
    playPaperRustle(isStet ? 0.8 : 1.15)
    const osc = c.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(isStet ? 150 : 210, t)
    osc.frequency.exponentialRampToValueAtTime(isStet ? 72 : 95, t + 0.09)
    const gain = c.createGain()
    gain.gain.setValueAtTime(0.14, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11)
    osc.connect(gain).connect(c.destination)
    osc.start(t)
    osc.stop(t + 0.12)
  }

  function playLoupeToggle(on) {
    const c = ensure()
    if (!c) return
    const t = c.currentTime
    // Brass lens ring click
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(on ? 880 : 620, t)
    osc.frequency.exponentialRampToValueAtTime(on ? 1240 : 440, t + 0.065)
    const gain = c.createGain()
    gain.gain.setValueAtTime(0.065, t)
    gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.08)
    osc.connect(gain).connect(c.destination)
    osc.start(t)
    osc.stop(t + 0.09)
  }

  function playClueChime() {
    const c = ensure()
    if (!c) return
    const t = c.currentTime
    const freqs = [523.25, 659.25]
    freqs.forEach((f, idx) => {
      const osc = c.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(f, t + idx * 0.07)
      const gain = c.createGain()
      gain.gain.setValueAtTime(0.001, t + idx * 0.07)
      gain.gain.linearRampToValueAtTime(0.055, t + idx * 0.07 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0008, t + idx * 0.07 + 0.32)
      osc.connect(gain).connect(c.destination)
      osc.start(t + idx * 0.07)
      osc.stop(t + idx * 0.07 + 0.34)
    })
  }

  function playPressPull(isFinal = false) {
    const c = ensure()
    if (!c) return
    const t = c.currentTime
    // Heavy iron press roller sweep + platen lock + distant harbor bell
    playPaperRustle(0.7)
    const thump = c.createOscillator()
    thump.type = 'triangle'
    thump.frequency.setValueAtTime(118, t)
    thump.frequency.exponentialRampToValueAtTime(42, t + 0.24)
    const tg = c.createGain()
    tg.gain.setValueAtTime(0.2, t)
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
    thump.connect(tg).connect(c.destination)
    thump.start(t)
    thump.stop(t + 0.3)

    // Distant brass harbor bell overtone
    const bellBase = isFinal ? 293.66 : 246.94
    ;[1, 2.01, 2.98].forEach((ratio, i) => {
      const osc = c.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(bellBase * ratio, t + 0.12)
      const g = c.createGain()
      g.gain.setValueAtTime(0.001, t + 0.12)
      g.gain.linearRampToValueAtTime(0.055 / (i + 1), t + 0.15)
      g.gain.exponentialRampToValueAtTime(0.0006, t + (isFinal ? 1.4 : 0.85))
      osc.connect(g).connect(c.destination)
      osc.start(t + 0.12)
      osc.stop(t + (isFinal ? 1.45 : 0.9))
    })
  }

  return {
    setMuted(next) { muted = Boolean(next) },
    isMuted() { return muted },
    playPaperRustle,
    playSlipPaste,
    playLoupeToggle,
    playClueChime,
    playPressPull,
    dispose() {
      if (ctx) {
        ctx.close().catch(() => {})
        ctx = null
        noiseBuf = null
      }
    }
  }
}
