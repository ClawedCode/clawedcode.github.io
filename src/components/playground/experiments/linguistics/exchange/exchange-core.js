import { EVENTS, FACTS, GRUMBLES, JACK, JACKS, NIGHT_LENGTH, NIGHT_START_HOUR, PAIRS, WORLD } from './night-script.js'

export const RING_MINUTES = 2.6
export const HOLD_PATIENCE = 42
export const MISROUTE_COST = 7
export const DEAD_LINE_COST = 5
export const FLOOD_LEVEL = 0.9
const RIVER_START = 0.46
const RIVER_RISE = 0.00125
const RIVER_FALL = -0.0011
const LOG_LIMIT = 80

export const lineMinutes = text => Math.max(2.6, text.length / 15)

export const clockText = minutes => {
  const total = NIGHT_START_HOUR * 60 + Math.floor(minutes)
  const h = ((Math.floor(total / 60) % 24) + 24) % 24
  const m = ((total % 60) + 60) % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function createNight() {
  const night = {
    now: 0,
    phase: 'night',
    river: RIVER_START,
    jacks: Object.fromEntries(JACKS.map(j => [j.id, { up: true }])),
    pairs: PAIRS.map(p => ({ id: p.id, answer: null, call: null, callId: null })),
    headset: null,
    calls: {},
    pending: {},
    seen: {},
    world: WORLD.map(() => false),
    timers: [],
    flags: {},
    facts: [],
    log: [],
    outbox: [],
    seq: 0,
    stats: { heard: 0, unheard: 0, missed: 0, misroutes: 0, cut: 0, connected: 0 },
    ending: null
  }
  Object.entries(EVENTS).forEach(([id, ev]) => {
    if (typeof ev.at === 'number') schedule(night, id, ev.at)
  })
  arrivals(night)
  return night
}

function schedule(night, id, at) {
  if (night.seen[id]) return
  if (night.pending[id] === undefined || at < night.pending[id]) night.pending[id] = at
}

function emit(night, event) {
  night.outbox.push(event)
}

function log(night, entry) {
  night.seq += 1
  night.log.push({ id: night.seq, at: night.now, ...entry })
  if (night.log.length > LOG_LIMIT) night.log.splice(0, night.log.length - LOG_LIMIT)
}

export const jackPlug = (night, jackId) => {
  for (const pair of night.pairs) {
    if (pair.answer === jackId) return { pair: pair.id, end: 'answer' }
    if (pair.call === jackId) return { pair: pair.id, end: 'call' }
  }
  return null
}

const activeCallFrom = (night, jackId) => Object.values(night.calls)
  .find(call => call.from === jackId && ['lamp', 'request', 'choice', 'ringing', 'talking'].includes(call.state))

export const lampCall = (night, jackId) => Object.values(night.calls)
  .find(call => call.from === jackId && call.state === 'lamp')

export const pairCall = (night, pairId) => {
  const pair = night.pairs[pairId]
  return pair && pair.callId ? night.calls[pair.callId] : null
}

function learn(night, factId) {
  if (!factId || night.facts.includes(factId)) return false
  night.facts.push(factId)
  emit(night, { type: 'fact', fact: factId })
  return true
}

function applyEffects(night, effects) {
  if (!effects) return
  ;(effects.flags || []).forEach(flag => { night.flags[flag] = night.flags[flag] || night.now || 0.01 })
  ;(effects.spawn || []).forEach(({ id, delay }) => schedule(night, id, night.now + delay))
  ;(effects.timers || []).forEach(({ delay, flag, text }) => night.timers.push({ at: night.now + delay, flag, text }))
  if (effects.text) {
    log(night, { kind: 'system', text: effects.text })
    emit(night, { type: 'news', text: effects.text, flags: effects.flags || [] })
  }
}

function miss(night, call, reason) {
  const ev = EVENTS[call.id]
  const wasCut = reason === 'cut'
  call.state = 'missed'
  call.endedAt = night.now
  night.stats[wasCut ? 'cut' : 'missed'] += 1
  const name = JACK[call.from].name
  const text = {
    unanswered: `the ${name} lamp went dark. they stopped waiting.`,
    waiting: `${name} gave up holding and rang off.`,
    cut: `you pulled the cord on ${name}. the line went dead.`,
    down: `the ${name} call died with the wire.`
  }[reason]
  log(night, { kind: 'system', tone: 'loss', text, pair: call.pair })
  emit(night, { type: 'missed', jack: call.from, pair: call.pair })
  applyEffects(night, ev.onMiss)
}

function startLine(night, call) {
  const pairId = call.pair
  const entry = call.route.convo[call.line]
  call.lineLeft = lineMinutes(entry.text)
  call.heardLine = false
  if (night.headset === pairId) hearLine(night, call)
  else emit(night, { type: 'murmur', pair: pairId })
}

function hearLine(night, call) {
  if (call.heardLine) return
  const entry = call.route.convo[call.line]
  call.heardLine = true
  call.heard += 1
  night.stats.heard += 1
  const fresh = learn(night, entry.fact)
  log(night, { kind: 'line', pair: call.pair, who: entry.who, text: entry.text, fact: entry.fact, fresh })
  emit(night, { type: 'line', pair: call.pair, who: entry.who, chars: entry.text.length })
}

function finishTalk(night, call) {
  call.state = 'cleared'
  call.endedAt = night.now
  night.stats.connected += 1
  log(night, { kind: 'system', pair: call.pair, text: `${JACK[call.from].name} and ${JACK[call.route.to].name} rang off. clear the cords.` })
  emit(night, { type: 'cleared', pair: call.pair })
  applyEffects(night, call.route.effects)
}

function resolveRing(night, call) {
  const pair = night.pairs[call.pair]
  const target = pair.call
  const ev = EVENTS[call.id]
  if (!target) {
    call.state = 'request'
    return
  }
  if (!night.jacks[target].up) {
    call.state = 'request'
    call.patience -= DEAD_LINE_COST
    call.lastWrong = target
    log(night, { kind: 'system', tone: 'loss', pair: call.pair, text: `nothing rings at ${JACK[target].name}. the wire is dead.` })
    emit(night, { type: 'dead', pair: call.pair, jack: target })
    return
  }
  const route = ev.routes.find(r => r.to === target && (!r.when || r.when(night.flags)))
  if (!route) {
    call.state = 'request'
    call.patience -= MISROUTE_COST
    call.misroutes += 1
    call.lastWrong = target
    night.stats.misroutes += 1
    log(night, { kind: 'grumble', pair: call.pair, who: target, text: GRUMBLES[target] })
    emit(night, { type: 'wrong', pair: call.pair, jack: target })
    return
  }
  call.state = 'talking'
  call.route = route
  call.line = 0
  night.flags[`connected:${call.id}`] = night.now || 0.01
  emit(night, { type: 'answered', pair: call.pair, jack: target })
  startLine(night, call)
}

function arrivals(night) {
  Object.entries(night.pending).forEach(([id, at]) => {
    if (at > night.now) return
    const ev = EVENTS[id]
    if (ev.when && !ev.when(night.flags)) {
      delete night.pending[id]
      night.seen[id] = true
      return
    }
    if (!night.jacks[ev.from].up || jackPlug(night, ev.from) || activeCallFrom(night, ev.from)) return
    delete night.pending[id]
    night.seen[id] = true
    night.calls[id] = {
      id,
      from: ev.from,
      state: 'lamp',
      arrivedAt: night.now,
      patience: ev.patience || 28,
      patienceMax: ev.patience || 28,
      pair: null,
      route: null,
      line: 0,
      lineLeft: 0,
      heard: 0,
      misroutes: 0
    }
    emit(night, { type: 'lamp', jack: ev.from })
  })
}

function setLine(night, jackId, up, text) {
  if (night.jacks[jackId].up === up) return
  night.jacks[jackId].up = up
  log(night, { kind: 'system', tone: up ? 'mend' : 'loss', text })
  emit(night, { type: up ? 'line-up' : 'line-down', jack: jackId })
  if (up) return
  Object.values(night.calls).forEach(call => {
    if (call.state === 'lamp' && call.from === jackId) miss(night, call, 'down')
    else if (['request', 'choice', 'ringing', 'talking'].includes(call.state)) {
      const pair = night.pairs[call.pair]
      if (call.from === jackId || (call.state === 'talking' && pair.call === jackId)) miss(night, call, 'down')
    }
  })
}

export function tick(night, dt) {
  if (night.phase !== 'night') return
  night.now = Math.min(NIGHT_LENGTH, night.now + dt)
  night.river = Math.min(1, Math.max(0.3, night.river + dt * (night.flags.sluiceOpen ? RIVER_FALL : RIVER_RISE)))
  if (night.river >= FLOOD_LEVEL && !night.flags.flooded) {
    night.flags.flooded = night.now
    const text = night.flags.bellRung
      ? 'the river is in the low streets. the houses there are empty. everyone climbed.'
      : 'the river is in the low streets. nobody rang them awake.'
    log(night, { kind: 'system', tone: 'loss', text })
    emit(night, { type: 'flood' })
  }

  WORLD.forEach((change, index) => {
    if (night.world[index] || change.at > night.now) return
    night.world[index] = true
    if (change.when && !change.when(night.flags)) return
    if (change.down) setLine(night, change.down, false, change.text)
    if (change.up) setLine(night, change.up, true, change.text)
    if (change.down) emit(night, { type: 'lightning' })
  })

  night.timers = night.timers.filter(timer => {
    if (timer.at > night.now) return true
    night.flags[timer.flag] = night.flags[timer.flag] || night.now
    log(night, { kind: 'system', tone: 'mend', text: timer.text })
    emit(night, { type: 'news', text: timer.text, flags: [timer.flag] })
    return false
  })

  arrivals(night)

  Object.values(night.calls).forEach(call => {
    if (call.state === 'lamp') {
      call.patience -= dt
      if (call.patience <= 0) miss(night, call, 'unanswered')
    } else if (call.state === 'request' || call.state === 'choice') {
      call.patience -= dt * 0.55
      if (call.patience <= 0) miss(night, call, 'waiting')
    } else if (call.state === 'ringing') {
      call.ringLeft -= dt
      if (call.ringLeft <= 0) resolveRing(night, call)
    } else if (call.state === 'talking') {
      call.lineLeft -= dt
      while (call.state === 'talking' && call.lineLeft <= 0) {
        if (!call.heardLine) {
          call.unheard = (call.unheard || 0) + 1
          night.stats.unheard += 1
        }
        call.line += 1
        if (call.line >= call.route.convo.length) finishTalk(night, call)
        else startLine(night, call)
      }
    }
  })

  if (night.now >= NIGHT_LENGTH) {
    night.phase = 'dawn'
    night.ending = computeEnding(night)
    emit(night, { type: 'dawn' })
  }
}

export function insertPlug(night, pairId, end, jackId) {
  const pair = night.pairs[pairId]
  const holder = jackPlug(night, jackId)
  if (holder && !(holder.pair === pairId && holder.end === end)) {
    emit(night, { type: 'busy', jack: jackId })
    return { ok: false, reason: 'busy' }
  }
  if (holder) return { ok: true }
  if (pair[end]) pullPlug(night, pairId, end)
  const current = pairCall(night, pairId)
  if (end === 'answer' && current && ['cleared', 'missed'].includes(current.state)) {
    // A finished call keeps its pair until both cords are down.
    pair.callId = null
  }
  pair[end] = jackId
  emit(night, { type: 'plug', pair: pairId, jack: jackId })

  if (end === 'answer') {
    night.headset = pairId
    const call = lampCall(night, jackId)
    if (call && !pair.callId) {
      const ev = EVENTS[call.id]
      call.state = ev.choices ? 'choice' : 'request'
      call.pair = pairId
      call.patience = HOLD_PATIENCE
      call.patienceMax = HOLD_PATIENCE
      pair.callId = call.id
      log(night, { kind: 'request', pair: pairId, who: call.from, text: ev.request, hints: ev.hints })
      emit(night, { type: 'request', pair: pairId, jack: jackId })
    } else if (!pair.callId) {
      log(night, { kind: 'system', pair: pairId, text: `only rain on the ${JACK[jackId].name} line. nobody is calling.` })
    }
  }
  return { ok: true }
}

export function pullPlug(night, pairId, end) {
  const pair = night.pairs[pairId]
  if (!pair[end]) return
  const jackId = pair[end]
  pair[end] = null
  emit(night, { type: 'unplug', pair: pairId, jack: jackId })
  const call = pairCall(night, pairId)
  if (call) {
    if (call.state === 'ringing' && end === 'call') call.state = 'request'
    else if (['request', 'choice', 'ringing', 'talking'].includes(call.state) && (end === 'answer' || call.state === 'talking')) miss(night, call, 'cut')
  }
  if (!pair.answer && !pair.call) pair.callId = null
}

export function clearPair(night, pairId) {
  pullPlug(night, pairId, 'call')
  pullPlug(night, pairId, 'answer')
}

export function ring(night, pairId) {
  const pair = night.pairs[pairId]
  const call = pairCall(night, pairId)
  if (!pair.call) return { ok: false, reason: 'no call cord' }
  if (!call || call.state !== 'request') {
    emit(night, { type: 'ring-idle', pair: pairId })
    return { ok: false, reason: 'nobody to connect' }
  }
  if (pair.call === call.from) return { ok: false, reason: 'same line' }
  call.state = 'ringing'
  call.ringLeft = RING_MINUTES
  emit(night, { type: 'ring', pair: pairId, jack: pair.call })
  return { ok: true }
}

export function setHeadset(night, pairId) {
  night.headset = pairId
  const call = pairCall(night, pairId)
  if (call && call.state === 'talking') hearLine(night, call)
  emit(night, { type: 'headset', pair: pairId })
}

export function choose(night, pairId, choiceId) {
  const call = pairCall(night, pairId)
  if (!call || call.state !== 'choice') return { ok: false }
  const ev = EVENTS[call.id]
  const choice = ev.choices.find(c => c.id === choiceId)
  if (!choice || (choice.needs && !night.flags[choice.needs])) return { ok: false }
  log(night, { kind: 'operator', pair: pairId, text: choice.label })
  log(night, { kind: 'line', pair: pairId, who: call.from, text: choice.reply })
  night.flags[`chose:${choice.id}`] = night.now || 0.01
  call.state = 'cleared'
  call.endedAt = night.now
  night.stats.connected += 1
  emit(night, { type: 'chosen', pair: pairId, choice: choiceId })
  applyEffects(night, choice.effects)
  return { ok: true }
}

// The pins on the board: which jacks the facts you have overheard point at,
// for the caller currently on your headset.
export function hintPins(night) {
  const call = night.headset === null ? null : pairCall(night, night.headset)
  if (!call || call.state !== 'request') return []
  const ev = EVENTS[call.id]
  const pins = new Set()
  ;(ev.hints || []).forEach(factId => {
    if (!night.facts.includes(factId)) return
    FACTS[factId].pins.forEach(jackId => {
      if (factId === 'lamp' && night.jacks.ferry.up) return
      pins.add(jackId)
    })
  })
  return [...pins]
}

export function isBusy(night) {
  return Object.values(night.calls).some(call => (
    ['lamp', 'request', 'choice', 'ringing'].includes(call.state) ||
    (call.state === 'talking' && night.headset === call.pair)
  ))
}

export function computeEnding(night) {
  const f = night.flags
  const at = key => clockText(f[key])
  const threads = []

  if (f.sluiceOpen) {
    threads.push({ id: 'river', good: true, title: 'the river', text: `the mill sluice opened at ${at('sluiceOpen')}. the river never reached the low streets.` })
  } else if (f.bellRung) {
    threads.push({ id: 'river', good: true, title: 'the river', text: `st. ide's rang at ${at('bellRung')}. the low streets slept on the hill and woke dry, with wet houses below them.` })
  } else {
    threads.push({ id: 'river', good: false, title: 'the river', text: 'nobody opened the sluice and nobody rang the bell. the low streets woke with the river on the stairs.' })
  }

  if (f.wren && f.doctorCrossed) {
    threads.push({ id: 'birth', good: true, title: 'the farm', text: 'wren brennan arrived in the small hours. the doctor crossed in time, and the farm rang the town to say so.' })
  } else if (f.marrowCame) {
    threads.push({ id: 'birth', good: true, title: 'the farm', text: 'the doctor never came. agnes marrow walked the flooded field with a lamp, and wren brennan was born to the kettle singing.' })
  } else if (f.doctorCrossed) {
    threads.push({ id: 'birth', good: true, title: 'the farm', text: 'the doctor crossed to the farm. nobody rang to say how it went, but the farm lamp burned all night.' })
  } else {
    threads.push({ id: 'birth', good: false, title: 'the farm', text: 'the farm rang and rang. nell brennan laboured without a doctor, and the exchange heard none of it.' })
  }

  if (f.trainRerouted) {
    threads.push({ id: 'train', good: true, title: 'the 4:10', text: 'the wire reached the station. the 4:10 left by the hill line, clear of corley.' })
  } else {
    threads.push({ id: 'train', good: false, title: 'the 4:10', text: 'the wire never reached the station. the 4:10 stood in the water short of corley until noon.' })
  }

  let couple
  if (f.coupleStopped && f.motherCame) couple = 'the sergeant held them on the platform. then edda quill came down in her coat and put them on the train herself.'
  else if (f.coupleStopped) couple = 'the sergeant held the schoolteacher and the quill boy on the platform. the 4:10 left without them.'
  else if (f.blessing) couple = 'miss ines and tobias quill left with his mother\'s good umbrella and a promise to write.'
  else if (f.inesBooked) couple = 'two passengers boarded the 4:10 who were never mentioned again.'
  else couple = 'miss ines never reached the station. the schoolhouse lamp burned until dawn.'
  threads.push({ id: 'couple', good: null, title: 'the platform', text: couple })

  const kept = f.keptSecret ? 'you kept the station\'s secret.' : f.toldConstable ? 'you told the sergeant who rang the station.' : 'nobody asked you for a secret.'
  const goods = threads.filter(t => t.good).length
  const epithet = goods === 3 ? 'the wires held' : goods === 2 ? 'a long night, mostly mended' : goods === 1 ? 'the town woke tangled' : 'a dark board'
  return {
    threads,
    epithet,
    kept,
    stats: { ...night.stats, facts: night.facts.length, factTotal: Object.keys(FACTS).length },
    score: goods
  }
}
