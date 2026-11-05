// Six nights in a hired hall. Pure rules, no rendering and no audio, so a whole
// run can be played headless.
import { phraseOf } from './ear.js'

export const SEATS = 24
const START_SEATS = 4
const GIVE_UP = 5
const CLEAR = 0.55

export const NIGHTS = [
  {
    id: 'crate',
    numeral: 'I',
    title: 'out of the crate',
    opening: 'a speaking machine, sold for the freight. the leather has forgotten everything it could say. they came to laugh at it.',
    unlocks: [],
    bellows: false,
    tasks: [{ kind: 'vowels', ask: 'the old academy prize: five vowels, from the stops. each stop must say its own.', hint: 'drag the ring to the roof of the mouth, then along it: throat for A, forward for E, teeth for I, middle for O and U. lips drawn in for O and U, open for I. pin on a letter.' }]
  },
  {
    id: 'lips',
    numeral: 'II',
    title: 'the lips',
    opening: 'the lip cams are cut. from tonight the bellows run dry, so keep them pumped.',
    unlocks: ['lips'],
    bellows: true,
    tasks: [
      { say: 'MA MA', want: 'mama', ask: 'a woman in the third row: "what does anything say first?"' },
      { say: 'PA PA', want: 'papa', ask: 'her husband, offended: "and the other one?"' },
      { say: 'MIAU', want: 'meow', ask: 'somebody has noticed the ears. "go on. say what you are."' }
    ]
  },
  {
    id: 'blade',
    numeral: 'III',
    title: 'the blade',
    opening: 'the tongue tip now reaches the ridge behind the teeth. a man in the front row has brought a dog whistle.',
    unlocks: ['blade'],
    bellows: true,
    tasks: [
      { say: 'SIT', want: 'sit', ask: 'the man with the whistle: "tell it to sit. make it say sit."' },
      { say: 'NO', want: 'no', ask: 'he leans on the footlights and says it to the machine, slowly: "sit."' },
      { say: 'NOT MI', want: 'not me', ask: '"who said that?" he asks the hall. answer him.' }
    ]
  },
  {
    id: 'rain',
    numeral: 'IV',
    title: 'the rain',
    opening: 'it rained all day. leather drinks. the throat is narrower tonight and every stop you pinned has moved. the new back cams came in wet too.',
    unlocks: ['back'],
    bellows: true,
    swell: 1,
    tasks: [
      { say: 'HELO', want: 'hello', ask: 'they have started greeting it on the way in. greet them back.', hint: 'a stop that reads → g, → y or → x is pinching on the swollen walls. drag the ring to the roof again and pin it: contact stops short of the wet now.' },
      { say: 'FIX', want: 'fish', ask: 'a boy holds up a paper of something. "what do you want?"' },
      { say: 'GO HOUM', want: 'go home', ask: 'closing time. someone shouts it at the machine. say it back to them.' }
    ]
  },
  {
    id: 'song',
    numeral: 'V',
    title: 'the waltz',
    opening: 'the leather has dried and the bellows are full. somebody has punched a waltz into a card. the words play themselves on your stops. the pitch is yours.',
    unlocks: [],
    bellows: true,
    tasks: [{ kind: 'song', ask: 'tap the reed note each syllable is on as it reaches the line, and pump: nobody has ever finished this song on one breath.' }]
  },
  {
    id: 'last',
    numeral: 'VI',
    title: 'the last night',
    opening: 'the lease is up. the house lights are already low.',
    unlocks: [],
    bellows: true,
    tasks: [{ kind: 'answer', ask: 'a child in the front row, who has been here all six nights: "who is in there?"' }]
  }
]

// The card fed to the cams on night V: Daisy Bell (1892), the first phrase.
const G2 = 98
const A2 = 110
const B2 = 123.5
const C3 = 130.8
const E3 = 164.8
const G3 = 196
export const REED = [G3, E3, C3, B2, A2, G2]
export const REED_NAMES = ['G', 'E', 'C', 'B', 'A', 'g']
export const WALTZ_BEAT = 0.44
export const WALTZ = [
  { syl: 'DEI', beats: 3, hz: G3 }, { syl: 'ZI', beats: 3, hz: E3 },
  { syl: 'DEI', beats: 3, hz: C3 }, { syl: 'ZI', beats: 3, hz: G2 },
  { syl: 'GI', beats: 1, hz: A2 }, { syl: 'MI', beats: 1, hz: B2 }, { syl: 'YO', beats: 1, hz: C3 },
  { syl: 'AN', beats: 2, hz: A2 }, { syl: 'SA', beats: 1, hz: C3 }, { syl: 'DU', beats: 3, hz: G2 }
]

export const freshRun = () => ({
  night: 0,
  task: 0,
  seats: START_SEATS,
  misses: 0,
  proven: {},
  log: [],
  understood: 0,
  misheard: 0,
  pins: 0,
  pumps: 0,
  ended: false,
  answer: null,
  lastLine: null,
  songBest: 0
})

export const currentNight = run => NIGHTS[run.night]
export const currentTask = run => NIGHTS[run.night].tasks[run.task]
export const unlockedGroups = run => {
  const out = []
  for (let i = 0; i <= run.night && i < NIGHTS.length; i++) out.push(...NIGHTS[i].unlocks)
  return out
}
export const isOpen = (run, group) => unlockedGroups(run).includes(group)
export const swellOf = run => NIGHTS[run.night].swell || 0
export const bellowsOn = run => !!NIGHTS[run.night].bellows

const clampSeats = n => Math.max(0, Math.min(SEATS, n))

// Nobody left: the engagement ends tonight, whatever night it was.
function emptyCheck(run, result) {
  if (run.seats > 0 || run.night === NIGHTS.length - 1) return
  run.night = NIGHTS.length - 1
  run.task = 0
  run.misses = 0
  result.nightUp = true
  result.emptied = true
  result.tone = 'night'
}

function advance(run) {
  run.misses = 0
  run.task++
  if (run.task >= NIGHTS[run.night].tasks.length) {
    run.task = 0
    run.night = Math.min(run.night + 1, NIGHTS.length - 1)
    return { nightUp: true }
  }
  return { nightUp: false }
}

// Called with everything the hall wrote down for one breath of speech.
// `words` is the nearestWord() output. Words are judged only on what was heard; which key
// was pressed matters just once, for the prize that asks each stop to say its own vowel.
export function consider(run, words, { usedHand = false, soundString = '', played = [], clarity = 1 } = {}) {
  const task = currentTask(run)
  const text = phraseOf(words)
  const entry = { night: NIGHTS[run.night].numeral, text, wanted: task.want || null, hit: false }
  const result = { text, hit: false, nightUp: false, seatsDelta: 0, tone: 'miss', gaveUp: false, needStops: false, ended: false, clear: false }

  if (task.kind === 'vowels') {
    const single = words.length === 1 && words[0].sounds.length === 1 ? words[0].sounds[0] : null
    const fromItsStop = played.length === 1 && played[0] === single
    if (single && !usedHand && fromItsStop && !run.proven[single]) {
      run.proven[single] = true
      run.seats = clampSeats(run.seats + 1)
      result.hit = true
      result.tone = 'hit'
      result.seatsDelta = 1
      result.proven = single
      entry.hit = true
      run.understood++
      if (Object.keys(run.proven).length === 5) {
        Object.assign(result, advance(run))
        result.tone = 'night'
      }
    } else if (single && usedHand) {
      result.needStops = true
      result.tone = 'info'
    } else {
      result.tone = single && played.length === 1 ? 'miss' : 'info'
      if (single && played.length === 1 && !fromItsStop) result.wrongStop = { played: played[0], heard: single }
    }
    run.log.push(entry)
    return result
  }

  if (task.kind === 'answer') {
    run.answer = text || 'nothing'
    entry.hit = true
    run.log.push(entry)
    result.tone = 'answer'
    result.answered = true
    return result
  }

  if (task.kind === 'song') return result

  const clean = task.say.replace(/\s+/g, '')
  const hit = text === task.want || soundString === clean
  if (hit) {
    entry.hit = true
    run.understood++
    // a word in true vowels reaches the back row and fills a seat. a muddy one only keeps them.
    result.clear = clarity >= CLEAR
    result.seatsDelta = result.clear ? 1 : 0
    // a slow correct word was still the word: write it as one, not as its separated sounds
    result.text = task.want
    entry.text = task.want
    run.seats = clampSeats(run.seats + result.seatsDelta)
    result.hit = true
    result.tone = 'hit'
    Object.assign(result, advance(run))
    if (result.nightUp) result.tone = 'night'
  } else {
    run.misheard++
    run.misses++
    run.seats = clampSeats(run.seats - 1)
    result.seatsDelta = -1
    if (run.misses >= GIVE_UP && run.seats > 0) {
      // nobody can hold a hall on one word all night: they lose interest and move on
      run.seats = clampSeats(run.seats - 2)
      result.seatsDelta = -3
      result.gaveUp = true
      Object.assign(result, advance(run))
    }
    emptyCheck(run, result)
  }
  run.log.push(entry)
  return result
}

export function scoreSong(run, onPitch, heard) {
  const pass = onPitch >= 0.55
  run.songBest = Math.max(run.songBest, onPitch)
  run.log.push({ night: 'V', text: `a waltz, ${Math.round(onPitch * 100)}% in tune`, wanted: 'daisy', hit: pass })
  const out = { onPitch, pass, heard, nightUp: false, gaveUp: false, seatsDelta: 0 }
  run.misses++
  if (pass) {
    out.seatsDelta = onPitch > 0.8 ? 6 : 4
    run.seats = clampSeats(run.seats + out.seatsDelta)
    run.understood++
    Object.assign(out, advance(run))
  } else if (run.misses >= 2) {
    out.gaveUp = true
    out.seatsDelta = -2
    run.seats = clampSeats(run.seats - 2)
    Object.assign(out, advance(run))
  } else {
    out.seatsDelta = -1
    run.seats = clampSeats(run.seats - 1)
  }
  emptyCheck(run, out)
  return out
}

// A seat creaks when nothing has been said for too long.
export function losePatience(run) {
  if (run.seats <= 1) return false
  run.seats--
  return true
}

// What the machine says with nobody at the keys. Your stops, your tuning.
export function lastLine(run) {
  return run.seats >= 6 ? { keys: 'AI AM A KAT', full: true } : { keys: 'NO WAN', full: false }
}

export function closeRun(run, heardLast) {
  run.lastLine = heardLast
  run.ended = true
  run.log.push({ night: 'VI', text: heardLast, wanted: null, hit: true, machine: true })
}

export function epithet(run) {
  const { seats, understood, misheard } = run
  if (seats === 0) return 'spoke to the seats'
  if (seats >= 22 && misheard <= 3) return 'the throat that needed no interpreter'
  if (seats >= 18) return 'held the house six nights'
  if (misheard >= 14) return 'much misquoted, widely attended'
  if (seats >= 10) return 'a modest engagement, well enunciated'
  if (understood >= 8) return 'clear enough for the ones who stayed'
  return 'heard mostly by the front row'
}
