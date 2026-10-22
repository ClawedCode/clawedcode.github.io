// One model of a cast bell drives the strickle board, the lathe, the tuner and the tower.
// Partials are tuned subtractively: every cut at a band lowers each partial by a fixed
// sensitivity, so metal removed can never be put back.

export const PARTIALS = [
  { id: 'hum', name: 'hum', ratio: 0.25, interval: 'two octaves under', amp: 0.42, decay: 7.5 },
  { id: 'prime', name: 'prime', ratio: 0.5, interval: 'one octave under', amp: 0.36, decay: 5.2 },
  { id: 'tierce', name: 'tierce', ratio: 0.6, interval: 'minor third over prime', amp: 0.5, decay: 4.2 },
  { id: 'quint', name: 'quint', ratio: 0.75, interval: 'fifth over prime', amp: 0.18, decay: 2.6 },
  { id: 'nominal', name: 'nominal', ratio: 1, interval: 'the strike note', amp: 0.62, decay: 3.2 }
]

// Heights are fractions of the bell's height measured from the lip.
export const BANDS = [
  { id: 'crown', name: 'crown', at: 0.93, base: 0.044 },
  { id: 'shoulder', name: 'shoulder', at: 0.72, base: 0.03 },
  { id: 'waist', name: 'waist', at: 0.42, base: 0.032 },
  { id: 'soundbow', name: 'sound bow', at: 0.13, base: 0.075 },
  { id: 'lip', name: 'lip', at: 0.035, base: 0.06 }
]

// Cents lowered per full cut: rows are partials, columns are bands. Every row sums to 30,
// so a cut at every band lowers the whole bell by 30 cents without changing its voice.
export const SENSITIVITY = [
  [14, 10, 4, 1, 1],
  [4, 12, 10, 3, 1],
  [2, 4, 12, 9, 3],
  [1, 3, 6, 12, 8],
  [1, 1, 3, 9, 16]
]

export const CUT = 1
export const SKIM = 0.25
export const TRUE_TOL = 8
export const FAIR_TOL = 20
export const CRUCIBLE = 100
export const DROSS = 0.35
export const HEIGHT = 0.78
const THIN_PER_CUT = 0.045

// A ring of four in D major, treble first. `fault` is the casting error the mould
// carries into each partial, in cuts per band; `drift` is the shrinkage of that pour.
export const BELLS = [
  { id: 'treble', numeral: '1', name: 'Treble', note: 'D5', freq: 587.33, weight: 16, drift: 6, fault: [0.5, 0, 0.25, 0, 1.25], seed: 3 },
  { id: 'second', numeral: '2', name: 'Second', note: 'C♯5', freq: 554.37, weight: 18, drift: -12, fault: [0, 1, 1.5, 0.25, 0.5], seed: 11 },
  { id: 'third', numeral: '3', name: 'Third', note: 'B4', freq: 493.88, weight: 22, drift: 10, fault: [1.25, 0.25, 0, 1.75, 0.5], seed: 23 },
  { id: 'tenor', numeral: '4', name: 'Tenor', note: 'A4', freq: 440, weight: 28, drift: -18, fault: [1, 1.5, 2, 0.75, 1.25], seed: 41 }
]

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const round = v => Math.round(v * 10) / 10

// Pattern handles run -1..1. A wider lip lowers the bell, a thicker sound bow raises it.
export const patternDiameter = dia => 1 + 0.08 * dia
export const patternThickness = thick => 1 + 0.1 * thick
export const predictCents = ({ dia, thick }) => 1200 * Math.log2(patternThickness(thick) / patternDiameter(dia))
export const patternWeight = (bell, { dia, thick }) => round(bell.weight * patternDiameter(dia) ** 3 * patternThickness(thick))
// Thin patterns leave less metal to tune away before the wall gives.
export const maxCuts = ({ thick }) => Math.round((5.5 + 2 * thick) * 4) / 4

const noiseFor = (seed, n) => {
  const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453
  return (x - Math.floor(x) - 0.5) * 4
}

export function castBell(index, pattern) {
  const bell = BELLS[index]
  const shift = predictCents(pattern) + bell.drift
  const offsets = PARTIALS.map((_, i) => shift + noiseFor(bell.seed + Math.round(shift), i) +
    SENSITIVITY[i].reduce((sum, s, j) => sum + s * bell.fault[j], 0))
  return { index, pattern, offsets, cuts: BANDS.map(() => 0), limit: maxCuts(pattern), weight: patternWeight(bell, pattern) }
}

export const deviations = cast => cast.offsets.map((offset, i) =>
  offset - SENSITIVITY[i].reduce((sum, s, j) => sum + s * cast.cuts[j], 0))

export const frequencies = (cast, devs = deviations(cast)) => {
  const bell = BELLS[cast.index]
  return PARTIALS.map((p, i) => bell.freq * p.ratio * 2 ** (devs[i] / 1200))
}

export function grade(devs) {
  const worst = Math.max(...devs.map(Math.abs))
  if (worst <= TRUE_TOL) return 'true'
  if (worst <= FAIR_TOL) return 'fair'
  return 'sour'
}

export const isFlat = devs => devs[4] < -FAIR_TOL

export const applyCut = (cast, band, amount) => {
  const cuts = cast.cuts.slice()
  cuts[band] = Math.round((cuts[band] + amount) * 4) / 4
  return { ...cast, cuts }
}

export const cracks = cast => cast.cuts.some(c => c > cast.limit)

// Wall profile in units of lip diameter. Cuts thin the inside of the wall in a smooth
// groove around each band, so a tuned bell shows where it was worked.
const OUTER = [[0, 0.5], [0.04, 0.506], [0.1, 0.488], [0.2, 0.432], [0.35, 0.372], [0.55, 0.336], [0.75, 0.316], [0.9, 0.292], [0.97, 0.262], [1, 0.25]]

const outerAt = s => {
  const k = OUTER.findIndex(([at]) => at >= s)
  if (k <= 0) return OUTER[0][1]
  const [s0, r0] = OUTER[k - 1]
  const [s1, r1] = OUTER[k]
  const t = (s - s0) / (s1 - s0)
  const ease = t * t * (3 - 2 * t)
  return r0 + (r1 - r0) * ease
}

const thicknessAt = (s, pattern, cuts) => {
  let weightSum = 0
  let value = 0
  BANDS.forEach((band, j) => {
    const w = Math.exp(-(((s - band.at) / 0.11) ** 2)) + 1e-4
    weightSum += w
    value += w * band.base
  })
  let t = (value / weightSum) * patternThickness(pattern.thick)
  BANDS.forEach((band, j) => {
    if (!cuts[j]) return
    t *= 1 - THIN_PER_CUT * cuts[j] * Math.exp(-(((s - band.at) / 0.06) ** 2))
  })
  return t
}

export function bellProfile(pattern, cuts = [0, 0, 0, 0, 0], steps = 36) {
  const outer = []
  const inner = []
  for (let n = 0; n <= steps; n++) {
    const s = (n / steps) * 0.97
    const r = outerAt(s)
    outer.push([r, s * HEIGHT])
    inner.push([Math.max(0.02, r - thicknessAt(s, pattern, cuts)), s * HEIGHT, s])
  }
  const crown = thicknessAt(0.97, pattern, cuts)
  return { outer, inner, crown }
}

export const bandWorkload = cast => cast.cuts.map(c => clamp(c / cast.limit, 0, 1.2))

// Change ringing: rounds, a plain course of plain hunt on four, then rounds to stand.
export function plainHuntRows() {
  const rounds = [1, 2, 3, 4]
  const rows = [rounds, rounds]
  let row = rounds.slice()
  for (let n = 0; n < 16; n++) {
    const next = row.slice()
    const start = n % 2 === 0 ? 0 : 1
    for (let p = start; p + 1 < 4; p += 2) [next[p], next[p + 1]] = [next[p + 1], next[p]]
    rows.push(next)
    row = next
  }
  rows.push(rounds, rounds)
  return rows
}
