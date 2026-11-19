// The cellist's notes on the stand. Each one is judged only by what the string
// actually did, report by report: the slips it counted, the level it rang at.

export const D_STRING = 2
export const A_STRING = 3
export const PIECE = [0, 3, 1, 5, 3, 7] // D F E♭ G F A, all on the D string
export const PIECE_HOLD = 0.75

export const ETUDES = [
  {
    id: 'speak',
    numeral: 'I',
    title: 'Make it speak',
    staff: { string: D_STRING, notes: [0] },
    text: 'Open D. Draw the bow across and keep it moving until the string settles into one clean slip a cycle.',
    need: 2.5,
    kind: 'hold',
    string: D_STRING,
    semi: 0
  },
  {
    id: 'chart',
    numeral: 'II',
    title: 'Chart the edges',
    staff: null,
    text: 'Find all three voices on purpose: too light for your speed (it whistles), right (it speaks), too heavy (it crunches). The notebook keeps every stroke.',
    need: 0.8,
    kind: 'chart'
  },
  {
    id: 'ponticello',
    numeral: 'III',
    title: 'Whisper at the bridge',
    staff: { string: A_STRING, notes: [0] },
    text: 'Open A, bowed within 3 cm of the bridge, still speaking. The window is narrow there: slow the bow and lean in.',
    need: 2,
    kind: 'hold',
    string: A_STRING,
    semi: 0,
    maxD: 0.03
  },
  {
    id: 'swell',
    numeral: 'IV',
    title: 'Messa di voce',
    staff: { string: D_STRING, notes: [0], hairpin: true },
    text: 'Open D, from quiet to full without breaking. Speed alone will not carry it: add weight as the bow quickens, until it rings more than twice as loud.',
    need: 2.2,
    kind: 'swell',
    string: D_STRING,
    semi: 0
  },
  {
    id: 'wolf',
    numeral: 'V',
    title: 'The wolf',
    staff: { string: D_STRING, notes: [3] },
    text: 'F on the D string, the note she ringed in red. Make it speak for two seconds: overpower it, or hang the brass collar and tune it away.',
    need: 2,
    kind: 'hold',
    string: D_STRING,
    semi: 3
  },
  {
    id: 'piece',
    numeral: 'VI',
    title: 'For the dawn',
    staff: { string: D_STRING, notes: PIECE },
    text: 'Her phrase for the morning, each note on its own stroke. Wherever the collar hangs, the wolf splits into two pups: knock the bridge, and hang them between the notes.',
    need: PIECE.length,
    kind: 'piece',
    string: D_STRING
  }
]

export const freshJudge = () => ({
  held: 0,
  grace: 0,
  chart: { whistle: 0, speak: 0, crunch: 0 },
  swellMin: Infinity,
  swellRun: 0,
  swellPeak: 0,
  pieceAt: 0,
  pieceHeld: 0,
  pieceStroke: -1,
  weights: [],
  swellW: 0,
  swellGain: 1,
  heldCollar: 0,
  heldForce: 0,
  failing: 0,
  run: 0,
  last: null
})

// one report's worth of judgement; returns { progress 0..1, done, note }
export function judge(etude, j, r) {
  const dt = r.dt
  const on = r.string === etude.string && r.semi === etude.semi
  const speaking = r.regime === 'speak'
  if (etude.kind === 'hold') {
    const okPlace = !etude.maxD || r.d <= etude.maxD + 1e-4
    if (on && okPlace && speaking) {
      j.held += dt
      j.grace = 0
      if (r.collar) j.heldCollar += dt
      else j.heldForce += dt
    } else if (j.held > 0) {
      j.grace += dt
      if (j.grace > 0.3) {
        j.held = Math.max(0, j.held - dt * 3)
        if (j.held === 0) j.heldCollar = j.heldForce = 0
      }
    }
    if (on && r.regime !== 'rest' && !speaking) j.failing += dt
    return { progress: Math.min(1, j.held / etude.need), done: j.held >= etude.need, how: j.heldCollar > j.heldForce ? 'collar' : 'force' }
  }
  if (etude.kind === 'chart') {
    // only a voice you hold counts: the scrape of a bow change is not a discovery
    if (r.regime === j.last) j.run += dt
    else j.run = 0
    j.last = r.regime
    if (j.chart[r.regime] !== undefined && j.run >= 0.25) j.chart[r.regime] += dt
    const c = j.chart
    const parts = ['whistle', 'speak', 'crunch'].map(k => Math.min(1, c[k] / etude.need))
    return { progress: parts.reduce((a, b) => a + b, 0) / 3, done: parts.every(p => p >= 1), parts }
  }
  if (etude.kind === 'swell') {
    if (on && speaking) {
      j.swellRun += dt
      j.grace = 0
      // the start is the quietest you held before growing, and the weight you held it with
      if (j.swellRun < 1.2 || r.rms < j.swellMin) {
        if (r.rms < j.swellMin) j.swellW = r.weight
        j.swellMin = Math.min(j.swellMin, r.rms)
      }
      j.swellPeak = r.rms / Math.max(1e-4, j.swellMin)
      j.swellGain = r.weight / Math.max(1e-3, j.swellW || r.weight)
    } else if (j.swellRun > 0) {
      j.grace += dt
      if (j.grace > 0.25) {
        j.swellRun = 0
        j.swellMin = Infinity
        j.swellPeak = 0
        j.swellGain = 1
      }
    }
    const grown = j.swellRun > 1.5 ? j.swellPeak : 0
    // louder by speed alone does not count: the arm has to go in with it
    const leaned = j.swellGain >= 1.6
    const progress = Math.min(1, Math.max(0, (grown - 1) / (etude.need - 1))) * (leaned ? 1 : 0.6)
    return { progress, done: grown >= etude.need && leaned, ratio: j.swellPeak, leaned }
  }
  if (etude.kind === 'piece') {
    const want = PIECE[j.pieceAt]
    // each note on its own stroke: a new bow direction or a new landing
    const fresh = r.stroke > j.pieceStroke
    if (r.string === etude.string && r.semi === want && speaking && fresh) {
      j.pieceHeld += dt
      j.grace = 0
      if (j.pieceHeld >= PIECE_HOLD) {
        j.weights[j.pieceAt] = r.weight
        j.pieceAt++
        j.pieceHeld = 0
        j.failing = 0
        j.pieceStroke = r.stroke
      }
    } else {
      if (r.string === etude.string && r.semi === want && r.regime !== 'rest') j.failing += dt
      j.grace += dt
      if (j.grace > 0.4) j.pieceHeld = 0
    }
    return {
      progress: (j.pieceAt + Math.min(1, j.pieceHeld / PIECE_HOLD)) / PIECE.length,
      done: j.pieceAt >= PIECE.length,
      at: j.pieceAt,
      needStroke: !fresh
    }
  }
  return { progress: 0, done: false }
}
