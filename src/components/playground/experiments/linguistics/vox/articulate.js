// Articulators to tube. Every sound in the machine, hand-shaped or played from a
// stop, is a pose of these few muscles turned into 44 diameters here.
export const N = 44
export const T_MIN = 12
export const T_SPAN = 17
export const LIP_FROM = 39
export const TIP = { dental: 37.5, alveolar: 35, post: 32.5, retro: 30.5 }

export const freshArt = () => ({
  tx: 0.5, // tongue body, 0 throat to 1 teeth
  ty: 0.42, // tongue body, 0 floor to 1 palate
  lips: 0.72, // 0 sealed to 1 wide
  tipI: TIP.alveolar,
  tipD: 3, // tip gap: small means raised to the ridge
  back: 0, // 1 means the tongue back seals the velum
  vel: 0, // nasal port
  voice: 0,
  asp: 0
})

const base = i => (i < 7 ? 0.62 : i < 12 ? 1.12 : 1.55)

// Writes the area function. `swell` is how much the leather has taken on damp:
// a fixed thickness on every wall, so narrow places lose far more than wide ones.
export function shapeTube(a, out, swell = 0) {
  const idx = T_MIN + T_SPAN * a.tx
  const dc = 2.0 - 1.7 * a.ty
  const dn = 1.6
  const dout = Math.max(0.9, dn + (dn - dc) * 0.62)
  const span = 11.5
  const wet = 0.15 * swell
  for (let i = 0; i < N; i++) {
    let d = base(i)
    if (i >= 9 && i < LIP_FROM) {
      const t = (i - idx) / span
      const w = Math.abs(t) < 1 ? Math.cos(t * Math.PI * 0.5) ** 2 : 0
      const body = dc * w + dout * (1 - w)
      const fade = Math.min(1, (i - 8) / 5) * Math.min(1, (LIP_FROM - i) / 3 + 0.35)
      d = d * (1 - fade) + body * fade
    }
    if (i >= LIP_FROM) {
      const q = (i - LIP_FROM) / (N - 1 - LIP_FROM)
      const open = a.lips * 2.5
      d = open * (0.75 + 0.25 * q) + (1 - q) * Math.min(open, 0.5) * 0.25
    }
    out[i] = i >= 7 && i < LIP_FROM ? d - wet : d
  }
  if (a.back > 0.001) {
    const at = Math.min(28, Math.max(20, idx))
    for (let i = 14; i < 33; i++) {
      const t = (i - at) / 4.5
      if (Math.abs(t) < 1) {
        const w = Math.cos(t * Math.PI * 0.5) ** 2
        out[i] *= 1 - a.back * w
      }
    }
  }
  if (a.tipD < 2.9) {
    for (let i = 27; i < 41; i++) {
      const t = i - a.tipI
      const gap = a.tipD + t * t * 0.1
      if (gap < out[i]) out[i] = gap
    }
  }
  for (let i = 0; i < N; i++) if (out[i] < 0) out[i] = 0
  return out
}

// How high a hand can push the tongue before it pinches into a hiss. Contact stops short,
// so shoving the ring against the palate is always a safe way to find a vowel, wet or dry.
export const tongueLimit = (tx, swell = 0) => {
  const clear = (tx > 0.82 ? 0.315 : 0.24) + 0.15 * swell
  return Math.min(1, (2 - clear) / 1.7)
}

export const SPEEDS = { tx: 0.05, ty: 0.05, lips: 0.012, tipD: 0.01, tipI: 0.03, back: 0.01, vel: 0.022, voice: 0.012, asp: 0.012 }

export function slewArt(a, target, dt) {
  const rush = target.rush || 1
  for (const key in SPEEDS) {
    const tc = SPEEDS[key] * rush
    a[key] += (target[key] - a[key]) * (1 - Math.exp(-dt / tc))
  }
}

// Five stops can be tuned. These are where the throat actually says them.
export const TRUE_VOWELS = {
  A: { tx: 0.1, ty: 0.9, lips: 0.85 },
  E: { tx: 0.9, ty: 0.68, lips: 0.62 },
  I: { tx: 1, ty: 0.96, lips: 0.8 },
  O: { tx: 0.26, ty: 1, lips: 0.3 },
  U: { tx: 0.68, ty: 1, lips: 0.3 }
}
export const VOWELS = ['A', 'E', 'I', 'O', 'U']

// As the machine comes out of its crate: a stop is near a different vowel entirely.
export const ROTTED_VOWELS = {
  A: { tx: 0.3, ty: 0.9, lips: 0.34 },
  E: { tx: 0.2, ty: 0.72, lips: 0.8 },
  I: { tx: 0.82, ty: 0.5, lips: 0.7 },
  O: { tx: 0.62, ty: 0.98, lips: 0.26 },
  U: { tx: 0.42, ty: 0.86, lips: 0.34 }
}

// Muscles press past the point of contact, which is why a seal closes in finite time.
const SEAL_LIPS = -0.2
const SEAL_TIP = -0.4
const SEAL_BACK = 1.3

// A consonant only moves what it needs. The rest stays where the last sound left
// it, which is why every consonant comes out coloured by the vowel beside it.
export const CONSONANTS = {
  M: { close: { lips: SEAL_LIPS, vel: 1 }, voice: 1, ms: 95, group: 'lips', word: 'lips shut, nose open' },
  B: { close: { lips: SEAL_LIPS }, voice: 1, ms: 62, release: 22, group: 'lips', word: 'lips shut, voiced' },
  P: { close: { lips: SEAL_LIPS }, voice: 0, ms: 72, release: 46, aspirate: 0.34, group: 'lips', word: 'lips shut, breath' },
  F: { close: { lips: 0.052 }, voice: 0, ms: 115, group: 'lips', word: 'lip against teeth' },
  V: { close: { lips: 0.062 }, voice: 1, ms: 80, group: 'lips', word: 'lip against teeth, voiced' },
  W: { close: { lips: 0.15, tx: 0.6, ty: 0.85 }, voice: 1, ms: 84, group: 'lips', word: 'lips round, quick' },
  N: { close: { tipD: SEAL_TIP, tipI: TIP.alveolar, vel: 1 }, voice: 1, ms: 90, group: 'blade', word: 'tip up, nose open' },
  D: { close: { tipD: SEAL_TIP, tipI: TIP.alveolar }, voice: 1, ms: 58, release: 22, group: 'blade', word: 'tip up, voiced' },
  T: { close: { tipD: SEAL_TIP, tipI: TIP.alveolar }, voice: 0, ms: 70, release: 44, aspirate: 0.34, group: 'blade', word: 'tip up, breath' },
  S: { close: { tipD: 0.125, tipI: TIP.dental }, voice: 0, ms: 130, group: 'blade', word: 'tip at the teeth, hiss' },
  Z: { close: { tipD: 0.13, tipI: TIP.dental }, voice: 1, ms: 95, group: 'blade', word: 'tip at the teeth, voiced' },
  L: { close: { tipD: 0.33, tipI: TIP.alveolar }, voice: 1, ms: 72, group: 'blade', word: 'tip up, air around it' },
  G: { close: { back: SEAL_BACK }, voice: 1, ms: 62, release: 26, group: 'back', word: 'back up, voiced' },
  K: { close: { back: SEAL_BACK }, voice: 0, ms: 72, release: 52, aspirate: 0.34, group: 'back', word: 'back up, breath' },
  H: { close: {}, voice: 0, asp: 0.8, ms: 90, group: 'back', word: 'open throat, breath only' },
  X: { close: { tipD: 0.19, tipI: TIP.post, lips: 0.34 }, voice: 0, ms: 135, group: 'back', word: 'tip back, hush (SH)' },
  R: { close: { tipD: 0.48, tipI: TIP.retro, lips: 0.4 }, voice: 1, ms: 76, group: 'back', word: 'tip curled back' },
  Y: { close: { tx: 1, ty: 1.03, lips: 0.7 }, voice: 1, ms: 84, rush: 0.4, group: 'back', word: 'tongue up, quick' }
}

export const GROUPS = { lips: ['M', 'B', 'P', 'F', 'V', 'W'], blade: ['N', 'D', 'T', 'S', 'Z', 'L'], back: ['G', 'K', 'H', 'X', 'R', 'Y'] }

// A sequence of keys becomes a timeline of articulator targets. This is the same
// code path for a tapped key, a typed word and the machine's own last line.
export function createSpeaker(stops) {
  const held = freshArt()
  const target = { ...held }
  let queue = []
  let cur = null
  let t = 0
  let holdKey = null

  const openTract = () => {
    target.lips = Math.max(target.lips, 0.08)
    target.tipD = 3
    target.back = 0
    target.vel = 0
  }

  const beginSeg = seg => {
    cur = seg
    t = 0
    if (seg.gap !== undefined) {
      target.voice = 0
      target.asp = 0
      openTract()
      return
    }
    target.rush = 1
    if (seg.vowel) {
      const s = stops[seg.vowel]
      target.tx = s.tx
      target.ty = s.ty
      target.lips = s.lips
      target.tipD = 3
      target.back = 0
      target.vel = 0
      target.voice = 1
      target.asp = 0
      return
    }
    const c = CONSONANTS[seg.cons]
    target.rush = c.rush || 1
    target.tipD = 3
    target.back = 0
    target.vel = 0
    if (c.close.tx === undefined) {
      // rounded consonants keep what they had; the rest relax the lips a touch
      target.lips = Math.max(target.lips, 0.42)
    }
    for (const key in c.close) target[key] = c.close[key]
    target.voice = c.voice
    target.asp = c.asp || 0
  }

  const after = seg => {
    if (seg.cons && CONSONANTS[seg.cons].release) {
      const c = CONSONANTS[seg.cons]
      queue.unshift({ releaseOf: seg.cons, ms: c.release, aspirate: c.aspirate || 0 })
    }
  }

  return {
    target,
    get busy() { return !!cur || queue.length > 0 },
    // a pause between words: the throat is still in use but no air is moving
    get inGap() { return !!cur && cur.gap !== undefined },
    get active() { return cur },
    press(key) {
      if (VOWELS.includes(key)) queue.push({ vowel: key, ms: 220, key })
      // a consonant tapped on its own, with nothing queued behind it, gets time to be heard
      else queue.push({ cons: key, ms: !cur && queue.length === 0 ? Math.max(CONSONANTS[key].ms, 135) : CONSONANTS[key].ms, key })
      holdKey = key
    },
    release(key) { if (holdKey === key) holdKey = null },
    releaseAll() { holdKey = null },
    gap(ms = 200) { queue.push({ gap: true, ms }) },
    say(keys) {
      for (const k of keys) {
        if (k === ' ') queue.push({ gap: true, ms: 210 })
        else if (VOWELS.includes(k)) queue.push({ vowel: k, ms: 220, key: k })
        else queue.push({ cons: k, ms: CONSONANTS[k].ms, key: k })
      }
    },
    // A sung syllable: its consonants at speaking pace, its vowel filling the note.
    sing(keys, ms) {
      let left = ms
      for (const k of keys) if (!VOWELS.includes(k)) left -= CONSONANTS[k].ms + (CONSONANTS[k].release || 0)
      const vowels = [...keys].filter(k => VOWELS.includes(k)).length || 1
      for (const k of keys) {
        if (VOWELS.includes(k)) queue.push({ vowel: k, ms: Math.max(90, left / vowels), key: k })
        else queue.push({ cons: k, ms: CONSONANTS[k].ms, key: k })
      }
    },
    clear() { queue = []; cur = null; t = 0; holdKey = null },
    // Advance the timeline. Returns whether the speaker is driving the throat.
    update(dt) {
      if (cur) {
        t += dt * 1000
        const holding = holdKey && cur.key === holdKey && queue.length === 0 && t >= cur.ms
        if (t >= cur.ms && !holding) {
          after(cur)
          cur = null
        }
      }
      if (!cur && queue.length) {
        const seg = queue.shift()
        if (seg.releaseOf) {
          // the seal breaks: air first, then whatever follows takes the tract
          target.tipD = 3
          target.back = 0
          target.lips = Math.max(target.lips, 0.42)
          target.voice = seg.aspirate ? 0 : 1
          target.asp = seg.aspirate
          cur = seg
          t = 0
        } else beginSeg(seg)
      }
      if (!cur && !queue.length) {
        if (target.voice > 0 || target.asp > 0 || target.tipD < 3 || target.back > 0 || target.vel > 0) {
          target.voice = 0
          target.asp = 0
          target.tipD = 3
          target.back = 0
          target.vel = 0
        }
        return false
      }
      return true
    }
  }
}
