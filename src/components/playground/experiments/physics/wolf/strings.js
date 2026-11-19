// The instrument's numbers: strings, the body mode, the collar, and the evening's etudes.

export const STRING_LEN = 0.69 // metres, nut to bridge
export const BOW_LEN = 0.66 // usable hair
export const D_MIN = 0.01 // closest the bow gets to the bridge (m)
export const D_MAX = 0.15
export const W_MIN = 0.08 // arm weight, newtons
export const W_MAX = 5

export const STRINGS = [
  { id: 'C', f0: 65.41, Z: 0.75, gauge: 2.4, wound: '#b9b4a6' },
  { id: 'G', f0: 98.0, Z: 0.62, gauge: 2.0, wound: '#c9c2ae' },
  { id: 'D', f0: 146.83, Z: 0.5, gauge: 1.6, wound: '#d8cfb4' },
  { id: 'A', f0: 220.0, Z: 0.4, gauge: 1.25, wound: '#e8e2cf' }
]

const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']
const BASE_MIDI = { C: 36, G: 43, D: 50, A: 57 }

export const SEMIS = 12

export function noteOf(stringIdx, semi) {
  const s = STRINGS[stringIdx]
  const midi = BASE_MIDI[s.id] + semi
  return {
    midi,
    f0: s.f0 * 2 ** (semi / 12),
    name: NAMES[midi % 12],
    octave: Math.floor(midi / 12) - 1,
    label: `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`
  }
}

// where a stopped note sits, as a fraction of the string from the nut
export const stopAt = semi => 1 - 2 ** (-semi / 12)

// the body mode that the cello is built with; the wolf lives here
export const BODY = { fw: 174, qw: 40, mw: 0.04 }
export const COLLAR = { me: 0.005, qe: 60 }

// the brass collar on the G afterlength: nearer the tailpiece is a longer, lower stub
export const collarFreq = p => 146 + 62 * p // p in 0..1, bridge end = 0
export const collarPos = fe => Math.min(1, Math.max(0, (fe - 146) / 62))

// bridge admittance |Y(f)| of the body mode, with the collar hung on it when fitted
export function admittance(f, collar) {
  const w = 2 * Math.PI * f
  const { fw, qw, mw } = BODY
  const kw = mw * (2 * Math.PI * fw) ** 2
  const cw = (mw * 2 * Math.PI * fw) / qw
  // impedance of the bridge mass-spring-damper: m jw + c + k/(jw)
  let re = cw
  let im = mw * w - kw / w
  if (collar) {
    const fe = collar
    const { me, qe } = COLLAR
    const ke = me * (2 * Math.PI * fe) ** 2
    const ce = (me * 2 * Math.PI * fe) / qe
    // the collar: spring+damper in series with its mass, seen from the bridge
    // Zs = (c + k/jw), Zm = m jw ; Z = Zs Zm / (Zs + Zm)
    const sRe = ce
    const sIm = -ke / w
    const mIm = me * w
    const nRe = -sIm * mIm
    const nIm = sRe * mIm
    const dRe = sRe
    const dIm = sIm + mIm
    const dd = dRe * dRe + dIm * dIm
    re += (nRe * dRe + nIm * dIm) / dd
    im += (nIm * dRe - nRe * dIm) / dd
  }
  return 1 / Math.sqrt(re * re + im * im)
}

// resonance peaks of the body as it stands (local maxima of |Y|)
export function bodyPeaks(collar) {
  const peaks = []
  let a = admittance(120, collar)
  let b = admittance(120.5, collar)
  for (let f = 121; f < 260; f += 0.5) {
    const c = admittance(f, collar)
    if (b > a && b > c) peaks.push({ f: f - 0.5, y: b })
    a = b
    b = c
  }
  const top = admittance(BODY.fw, null)
  return peaks.map(p => ({ ...p, rel: p.y / top }))
}

// a note is in the wolf's reach when a strong peak sits within ~0.45 semitone of it
export function wolfReach(f0, collar) {
  let worst = 0
  for (const p of bodyPeaks(collar)) {
    const semis = Math.abs(12 * Math.log2(f0 / p.f))
    if (semis < 0.6 && p.rel > 0.25) worst = Math.max(worst, p.rel * (1 - semis / 0.6))
  }
  return worst
}

export const REGIME_WORD = {
  rest: 'resting',
  speak: 'it speaks',
  whistle: 'it whistles',
  crunch: 'it crunches',
  wolf: 'the wolf'
}
