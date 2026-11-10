/**
 * slab.season() — the pass, its six avalanche paths, and three dreamed winters.
 *
 * Each winter is an authored weather tape over 120 days (1 December to
 * 30 March). The tape is deterministic so the dream can be changed and
 * compared; only the forecaster's interventions differ between runs.
 */

export const DAYS = 120

const MONTHS = [
  { name: 'Dec', len: 31 },
  { name: 'Jan', len: 31 },
  { name: 'Feb', len: 28 },
  { name: 'Mar', len: 30 }
]

export const dayLabel = (day) => {
  let d = day
  for (const m of MONTHS) {
    if (d < m.len) return `${d + 1} ${m.name}`
    d -= m.len
  }
  return '30 Mar'
}

export const MONTH_TICKS = (() => {
  const out = []
  let at = 0
  for (const m of MONTHS) {
    out.push({ day: at, name: m.name })
    at += m.len
  }
  return out
})()

/**
 * aspect: the compass direction the slope faces (degrees).
 * slope: start-zone angle. sun: winter solar exposure 0..1.
 * reach: slide size (cm of slab, density-weighted) needed to cross the line.
 * spill: where a snow fence on this ridge sends the drift it holds back.
 * x: centre of the path on the panorama, 0..1.
 */
export const PATHS = [
  { id: 'kettle', name: 'Kettle', aspect: 45, slope: 37, sun: 0.22, reach: 46, spill: 1, x: 0.1, top: 0.2, width: 0.07 },
  { id: 'long', name: 'Long Gully', aspect: 5, slope: 39, sun: 0.04, reach: 58, spill: 0, x: 0.25, top: 0.08, width: 0.06 },
  { id: 'ladder', name: 'Ladder', aspect: 90, slope: 41, sun: 0.42, reach: 38, spill: 3, x: 0.41, top: 0.14, width: 0.055 },
  { id: 'twins', name: 'Twins', aspect: 130, slope: 38, sun: 0.66, reach: 45, spill: 4, x: 0.57, top: 0.18, width: 0.075 },
  { id: 'shoulder', name: 'Shoulder', aspect: 175, slope: 35, sun: 0.9, reach: 62, spill: 3, x: 0.73, top: 0.3, width: 0.07 },
  { id: 'saddle', name: 'Saddle', aspect: 60, slope: 38, sun: 0.28, reach: 41, spill: 4, x: 0.89, top: 0.4, width: 0.065 }
]

export const TRAINS = [
  { name: 'the night mail', hour: 4 + 50 / 60 },
  { name: 'the 08:10', hour: 8 + 10 / 60 },
  { name: 'the 12:40', hour: 12 + 40 / 60 },
  { name: 'the 17:30', hour: 17.5 },
  { name: 'the late goods', hour: 21 + 40 / 60 }
]

export const BUDGET = { charge: 8, fence: 2, stamp: 2, close: 3 }

const W = 270
const NW = 315
const N = 0
const SW = 225

// Small deterministic generator so the base weather has texture without
// randomness between visits.
const mulberry = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/**
 * Build a day-by-day tape from a base climate and authored episodes.
 * kind: storm (swe spread over len days), clear (cold, calm, cloudless),
 * warm (thaw days), rain (rain on snow).
 */
function tape({ seed, base, episodes }) {
  const rnd = mulberry(seed)
  const days = []
  for (let d = 0; d < DAYS; d++) {
    const season = Math.sin((d / DAYS) * Math.PI) // coldest mid-winter
    const spring = Math.max(0, (d - 95) / 25)
    const tmax = base.tmax - 3 * season + 6 * spring + (rnd() - 0.5) * 3
    const tmin = tmax - 6 - rnd() * 3
    days.push({
      swe: 0,
      tmax,
      tmin,
      wind: 2 + rnd() * 3,
      dir: rnd() < 0.7 ? W : SW,
      cloud: 0.45 + rnd() * 0.5,
      rain: 0,
      storm: null,
      note: null
    })
  }
  for (const ep of episodes) {
    for (let i = 0; i < ep.len; i++) {
      const d = ep.day + i
      if (d < 0 || d >= DAYS) continue
      const w = days[d]
      if (ep.kind === 'storm') {
        // most of the water in the middle of the storm
        const shape = ep.len === 1 ? 1 : 0.6 + 0.8 * Math.sin(((i + 0.5) / ep.len) * Math.PI)
        const norm = ep.len === 1 ? 1 : Array.from({ length: ep.len }, (_, k) => 0.6 + 0.8 * Math.sin(((k + 0.5) / ep.len) * Math.PI)).reduce((a, b) => a + b, 0)
        w.swe = (ep.swe * shape) / norm
        w.tmax = ep.t ?? w.tmax
        w.tmin = (ep.t ?? w.tmax) - 3
        w.wind = ep.wind ?? 6
        w.dir = ep.dir ?? W
        w.cloud = 1
        w.storm = ep.name
      } else if (ep.kind === 'clear') {
        w.tmax = ep.tmax ?? -7
        w.tmin = ep.tmin ?? -16
        w.wind = ep.wind ?? 1.5
        w.cloud = 0.05
        w.note = ep.name
      } else if (ep.kind === 'warm') {
        w.tmax = ep.tmax ?? 5
        w.tmin = ep.tmin ?? -1
        w.cloud = 0.15
        w.wind = 2
        w.note = ep.name
      } else if (ep.kind === 'rain') {
        w.rain = ep.mm / ep.len
        w.tmax = 3.5
        w.tmin = 1
        w.cloud = 1
        w.wind = ep.wind ?? 5
        w.storm = ep.name
      } else if (ep.kind === 'gale') {
        w.wind = ep.wind
        w.dir = ep.dir ?? W
        w.cloud = 0.5
        w.note = ep.name
      }
    }
  }
  return days
}

export const WINTERS = [
  {
    id: 'storms',
    name: 'the winter of long storms',
    short: 'long storms',
    lesson: 'Storm snow fails near its own base for a day or two after it falls, then bonds. Shoot it while it is still small, or keep the trains in the yard.',
    seed: 1611,
    par: 2,
    budget: { charge: 5, fence: 2, stamp: 1, close: 2 },
    supplies: 'five charges, two snow fences, one boot crew, and two days you may close the line',
    episodes: [
      { kind: 'storm', day: 4, len: 3, swe: 48, wind: 7, t: -4, name: 'the St Barbara storm' },
      { kind: 'storm', day: 14, len: 2, swe: 30, wind: 6, t: -5, name: 'the mid-December snow' },
      { kind: 'storm', day: 23, len: 4, swe: 96, wind: 10, t: -5, name: 'the Christmas storm' },
      { kind: 'storm', day: 37, len: 2, swe: 28, wind: 5, t: -6, name: 'the January flurries' },
      { kind: 'storm', day: 46, len: 3, swe: 70, wind: 9, t: -4, name: 'the Epiphany storm' },
      { kind: 'rain', day: 55, len: 1, mm: 22, name: 'the rain of 25 January' },
      { kind: 'clear', day: 56, len: 3, tmax: -6, tmin: -14, name: 'the freeze after rain' },
      { kind: 'storm', day: 60, len: 3, swe: 74, wind: 10, t: -6, name: 'the Candlemas storm' },
      { kind: 'storm', day: 73, len: 2, swe: 36, wind: 6, t: -5, name: 'the February snow' },
      { kind: 'storm', day: 84, len: 4, swe: 100, wind: 11, t: -4, name: 'the great February storm' },
      { kind: 'storm', day: 98, len: 2, swe: 40, wind: 6, t: -3, name: 'the March snow' },
      { kind: 'warm', day: 104, len: 4, tmax: 6, tmin: 0, name: 'the first thaw' },
      { kind: 'storm', day: 110, len: 2, swe: 34, wind: 6, t: -2, name: 'the last snow' },
      { kind: 'warm', day: 114, len: 6, tmax: 8, tmin: 1, name: 'spring' }
    ],
    base: { tmax: -1 }
  },
  {
    id: 'thin',
    name: 'the winter of thin snow',
    short: 'thin snow',
    lesson: 'A shallow pack under a long cold spell rots from the ground up into depth hoar. Stamp it while it is still shallow, because later no charge can reach that deep.',
    seed: 2203,
    par: 2,
    budget: { charge: 6, fence: 1, stamp: 6, close: 2 },
    supplies: 'six charges, one snow fence, six boot crews from the village, and two days you may close the line',
    episodes: [
      { kind: 'storm', day: 3, len: 2, swe: 20, wind: 4, t: -6, name: 'the first snow' },
      { kind: 'storm', day: 9, len: 1, swe: 12, wind: 3, t: -7, name: 'a dusting' },
      { kind: 'clear', day: 11, len: 10, tmax: -9, tmin: -21, name: 'the long cold' },
      { kind: 'storm', day: 21, len: 1, swe: 7, wind: 3, t: -10, name: 'a cold flurry' },
      { kind: 'clear', day: 22, len: 12, tmax: -8, tmin: -20, name: 'the long cold' },
      { kind: 'storm', day: 37, len: 5, swe: 120, wind: 9, t: -6, name: 'the January storm cycle' },
      { kind: 'storm', day: 50, len: 2, swe: 30, wind: 6, t: -7, name: 'the late-January snow' },
      { kind: 'storm', day: 63, len: 3, swe: 56, wind: 8, t: -5, name: 'the February storm' },
      { kind: 'warm', day: 75, len: 4, tmax: 5, tmin: -1, name: 'the foehn' },
      { kind: 'storm', day: 86, len: 3, swe: 62, wind: 9, t: -5, name: 'the late-February storm' },
      { kind: 'storm', day: 100, len: 2, swe: 34, wind: 5, t: -4, name: 'the March snow' },
      { kind: 'warm', day: 108, len: 12, tmax: 7, tmin: 0, name: 'spring' }
    ],
    base: { tmax: -3 }
  },
  {
    id: 'feathers',
    name: 'the winter of feathers',
    short: 'feathers',
    lesson: 'Clear calm nights grow feathers of surface hoar. Buried, they stay weak for weeks, and the wind decides which slope gets the load. This time the cat dreams two winters, and the line has to survive both.',
    seed: 3307,
    par: 2.5,
    budget: { charge: 5, fence: 2, stamp: 1, close: 1 },
    supplies: 'five charges, two snow fences, one boot crew, and a single day you may close the line',
    twoDreams: { day: 69, len: 5, dirB: N, sweB: 1.15 },
    episodes: [
      { kind: 'storm', day: 2, len: 3, swe: 75, wind: 5, t: -5, name: 'the opening snow' },
      { kind: 'clear', day: 7, len: 4, tmax: -6, tmin: -15, name: 'four clear nights' },
      { kind: 'storm', day: 11, len: 1, swe: 22, wind: 2, t: -8, name: 'a soft snow' },
      { kind: 'clear', day: 18, len: 4, tmax: -5, tmin: -14, name: 'clear calm nights' },
      { kind: 'storm', day: 22, len: 1, swe: 22, wind: 2, t: -8, name: 'a quiet snow' },
      { kind: 'gale', day: 29, len: 2, wind: 13, dir: W, name: 'the west gale' },
      { kind: 'storm', day: 31, len: 2, swe: 34, wind: 10, t: -6, dir: W, name: 'the gale snow' },
      { kind: 'clear', day: 39, len: 4, tmax: -6, tmin: -16, name: 'the hoar nights' },
      { kind: 'storm', day: 43, len: 2, swe: 40, wind: 8, t: -6, dir: NW, name: 'the north-west storm' },
      { kind: 'storm', day: 55, len: 3, swe: 58, wind: 10, t: -5, dir: W, name: 'the February storm' },
      { kind: 'clear', day: 64, len: 5, tmax: -7, tmin: -17, name: 'five clear nights' },
      { kind: 'storm', day: 69, len: 5, swe: 82, wind: 11, t: -6, dir: W, name: 'the two-way storm' },
      { kind: 'storm', day: 85, len: 2, swe: 46, wind: 7, t: -5, name: 'the March storm' },
      { kind: 'storm', day: 96, len: 2, swe: 44, wind: 8, t: -4, dir: SW, name: 'the south-west snow' },
      { kind: 'warm', day: 106, len: 14, tmax: 6, tmin: 0, name: 'spring' }
    ],
    base: { tmax: -2 }
  }
]

export function weatherFor(winter, variant = 'A') {
  const days = tape({ seed: winter.seed, base: winter.base, episodes: winter.episodes })
  if (variant === 'B' && winter.twoDreams) {
    const { day, len, dirB, sweB } = winter.twoDreams
    for (let d = day; d < day + len && d < DAYS; d++) {
      days[d].dir = dirB
      days[d].swe *= sweB
      days[d].storm = 'the two-way storm, from the north'
    }
  }
  return days
}

export const compass = (deg) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((((deg % 360) + 360) % 360) / 45) % 8]
