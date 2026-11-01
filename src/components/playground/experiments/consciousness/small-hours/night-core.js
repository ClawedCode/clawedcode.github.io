// The night's rules, free of rendering: the clock, the house's own sounds, and how a
// sleeper's depth answers what reaches their ear.
import { SLEEPERS } from './house.js'

export const START_MINUTE = 180
export const END_MINUTE = 330
export const SECONDS_PER_MINUTE = 1.25
export const STEPS_PER_SECOND = 160

// Westminster changes in E: G#4 F#4 E4 B3.
const PITCH = { E: 329.63, F: 369.99, G: 415.3, B: 246.94 }
const CHANGES = [
  ['G', 'F', 'E', 'B'],
  ['E', 'G', 'F', 'B'],
  ['E', 'F', 'G', 'E'],
  ['G', 'E', 'F', 'B'],
  ['B', 'F', 'G', 'E']
]
const QUARTERS = { 15: [0], 30: [1, 2], 45: [3, 4, 0], 0: [1, 2, 3, 4] }
const NOTE_GAP = 0.45
const PHRASE_GAP = 0.42
const STRIKE_GAP = 0.95

export function buildChimes() {
  const events = []
  for (let m = START_MINUTE + 15; m <= END_MINUTE; m += 15) {
    const phrases = QUARTERS[m % 60]
    let t = m
    phrases.forEach(index => {
      CHANGES[index].forEach(n => { events.push({ at: t, kind: 'note', freq: PITCH[n] }); t += NOTE_GAP })
      t += PHRASE_GAP
    })
    if (m % 60 === 0) {
      for (let s = 0; s < m / 60; s++) { events.push({ at: t, kind: 'strike', freq: 164.81 }); t += STRIKE_GAP }
    }
    events.push({ at: t, kind: 'chime-end', from: m })
  }
  return events
}

export const CHIMES = buildChimes()

export const fridgeOn = minute => (minute < 214 || (minute >= 244 && minute < 279) || minute >= 306)
export const rainLevel = minute => {
  if (minute < 226 || minute > 297) return 0
  const rise = Math.min(1, (minute - 226) / 18)
  const fall = Math.min(1, (297 - minute) / 10)
  const gusts = 0.75 + 0.25 * Math.sin(minute * 0.9) * Math.sin(minute * 0.37)
  return Math.min(rise, fall) * gusts
}
export const CAR = { from: 262, to: 266 }
export const carLevel = minute => (minute < CAR.from || minute > CAR.to ? 0 : Math.sin(Math.PI * (minute - CAR.from) / (CAR.to - CAR.from)))

export const formatClock = minute => {
  const m = Math.min(Math.floor(minute), END_MINUTE)
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

// What each surface sound would do to a sleeper. Calibrated against the wave field:
// a floorboard step inside the bedroom costs the human about a tenth of their sleep.
const DEPTH_PER_ENERGY = 1400
const FLOOR = 2.5e-6
const MASKING = 16

export const STIR = 0.62
export const LISTEN = 0.32

export const modeOf = depth => (depth <= 0 ? 'awake' : depth < LISTEN ? 'listening' : depth < STIR ? 'stirring' : depth < 0.85 ? 'dreaming' : 'deep')
export const MODE_WORD = { deep: 'deep asleep', dreaming: 'dreaming', stirring: 'stirring', listening: 'listening', awake: 'awake' }

export const freshSleepers = () => SLEEPERS.map(s => ({ ...s, mode: modeOf(s.depth), deaf: 0, heardTotal: 0, stirs: 0, recent: 0 }))

// Returns the sleeper's change of mode, if any.
export function updateSleeper(s, ear, dt, nudge = 0) {
  const before = s.mode
  if (s.mode === 'awake') return null
  const sens = s.sensitivity * (s.mode === 'listening' ? s.listening : 1)
  const masked = FLOOR + MASKING * ear.cover
  const stimulus = s.deaf > 0 ? 0 : Math.max(0, ear.alarm - masked)
  s.deaf = Math.max(0, s.deaf - dt)
  const loss = sens * DEPTH_PER_ENERGY * stimulus * dt + nudge
  s.recent = s.recent * Math.exp(-dt / 0.6) + loss
  s.heardTotal += loss
  const rest = s.mode === 'listening' ? s.recovery * 0.35 : s.recovery * (s.depth > STIR ? 1 : 0.6)
  s.depth = Math.min(1, s.depth - loss + rest * dt)
  if (s.depth <= 0) s.depth = 0
  s.mode = modeOf(s.depth)
  if (s.mode !== before) {
    if ((s.mode === 'stirring' || s.mode === 'listening') && (before === 'dreaming' || before === 'deep' || before === 'stirring')) s.stirs += s.mode === 'stirring' ? 1 : 0
    return { from: before, to: s.mode }
  }
  return null
}

// How the night is remembered.
export function epithet({ items, heard, stirs, barks, caught }) {
  if (caught) return heard > 2.2 ? 'a thunderstorm in socks' : 'almost a rumour'
  if (items === 3 && heard < 0.35 && !barks) return 'nothing the house will ever prove'
  if (items === 3 && !barks) return 'a draught with intentions'
  if (items === 3) return 'a ghost the dog can vouch for'
  if (items === 0) return 'a cat who watched the night go by'
  return stirs > 2 ? 'a known suspect' : 'an unfinished collection'
}
