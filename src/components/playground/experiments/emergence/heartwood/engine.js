// Pure rules for heartwood.keeps(). No DOM, no time: state in, state out.
import {
  ERAS, OBJECTS, SPOTS, SPOT_ORDER, STRANGER, PRYCE_PROOF, SAVE_THRESHOLD, GERMINATED,
  DROUGHTS, WET_YEARS, KIND_ANGLE, relicOf
} from './story'

const clone = v => JSON.parse(JSON.stringify(v))

let serial = 0
const nextId = () => `e${Date.now().toString(36)}${(serial++).toString(36)}`

export const objInfo = obj => (obj.relic ? relicOf(obj.kind) : OBJECTS[obj.kind])

export const fill = (text, state) => (text || '').replaceAll('{sur}', state.sur || 'Cole')

export const personName = (state, who, eraIndex = state.era) => {
  const p = ERAS[eraIndex]?.people[who]
  return p ? fill(p.name, state) : who
}

const itName = (state, obj) => objInfo(obj).name

function log(state, text, tone = 'event', extra = {}) {
  state.log.push({ id: nextId(), year: ERAS[state.era]?.year, hour: state.hour, text: fill(text, state), tone, ...extra })
}

function addObject(state, kind, at, opts = {}) {
  const id = opts.id || kind
  state.objects[id] = { id, kind, relic: !!opts.relic, at, year: ERAS[state.era].year, origin: ERAS[state.era].year, history: [] }
  return state.objects[id]
}

function history(state, obj, text, year = ERAS[state.era]?.year) {
  obj.history.push({ year, text: fill(text, state) })
}

export function createGame({ relics = [] } = {}) {
  const state = {
    phase: 'intro',
    era: 0,
    hour: 1,
    sur: null,
    cat: 'roots',
    carried: null,
    objects: {},
    sealed: { roots: false, kerb: false },
    marks: [],
    needs: {},
    stories: [],
    proofs: [],
    log: [],
    chronicle: [],
    daughter: false,
    felled: null,
    verdict: null,
    last: null,
    turns: 0
  }
  relics.slice(0, 3).forEach((kind, i) => {
    if (!OBJECTS[kind]) return
    const o = addObject(state, kind, 'roots', { id: `relic-${kind}-${i}`, relic: true })
    o.origin = null
    history(state, o, 'Already under the oak when it was young.', 1786)
  })
  return state
}

export function begin(prev) {
  const state = clone(prev)
  state.phase = 'era'
  state.era = 0
  startEra(state)
  return state
}

function startEra(state) {
  const era = ERAS[state.era]
  state.hour = 1
  state.cat = 'roots'
  era.needs.forEach(n => { state.needs[`${era.id}:${n.id}`] = 'open' })
  log(state, era.intro, 'era')
  runStart(state)
}

export const presentAt = (state, hour = state.hour) => (ERAS[state.era]?.presence[hour - 1] || [])

export function spotOpen(state, spot) {
  const era = ERAS[state.era]
  if (spot === 'hollow' && state.era < 1) return false
  if (spot === 'roots' && (state.sealed.roots || state.sealed.kerb)) return false
  if (spot === 'roots' && era.id === 'storm') return false
  return true
}

export function spotClosedReason(state, spot) {
  if (spot === 'hollow' && state.era < 1) return 'There is no hollow yet. The limb that will leave one is still on the tree.'
  if (spot === 'roots' && state.sealed.roots) return 'The stone cross sits on the roots now.'
  if (spot === 'roots' && (state.sealed.kerb || ERAS[state.era]?.id === 'storm')) return 'The bypass kerb runs over the roots.'
  return ''
}

export const objectsAt = (state, at) => Object.values(state.objects).filter(o => o.at === at)

export function takeable(state) {
  return Object.values(state.objects).filter(o => {
    if (o.at === 'grass' || o.at === 'memorial' || o.at === 'lap') return true
    if (SPOTS[o.at]) return spotOpen(state, o.at)
    return false
  })
}

export function needsFor(state, who) {
  const era = ERAS[state.era]
  return era.needs.filter(n => (n.who === who || (n.alsoWho || []).includes(who)) && state.needs[`${era.id}:${n.id}`] === 'open' && state.hour <= n.by)
}

export function openNeeds(state) {
  const era = ERAS[state.era]
  return era.needs.filter(n => state.needs[`${era.id}:${n.id}`] === 'open')
}

export function canAct(state) {
  return state.phase === 'era'
}

// ---------------------------------------------------------------- actions

export function act(prev, action) {
  if (!canAct(prev)) return prev
  const state = clone(prev)
  const result = perform(state, action)
  if (!result) return prev
  state.last = { ...action, ok: true, hour: state.hour, era: state.era }
  state.turns += 1
  endHour(state)
  return state
}

function perform(state, action) {
  const era = ERAS[state.era]
  if (action.type === 'wait') {
    state.cat = state.cat || 'roots'
    log(state, 'The cat sits under the oak and lets an hour go by.', 'act')
    return true
  }
  if (action.type === 'take') {
    if (state.carried) return false
    const obj = state.objects[action.id]
    if (!obj || !takeable(state).includes(obj)) return false
    const from = obj.at
    obj.at = 'mouth'
    state.carried = obj.id
    state.cat = SPOTS[from] ? from : 'grass'
    const where = from === 'grass' ? 'out of the grass' : from === 'memorial' ? 'from the foot of the cross' : from === 'lap' ? 'from Lily\'s lap' : `from ${SPOTS[from].label}`
    log(state, `The cat takes ${itName(state, obj)} ${where}.`, 'act')
    history(state, obj, `Taken by the cat ${where}.`)
    return true
  }
  if (action.type === 'place') {
    const obj = state.objects[state.carried]
    if (!obj || !SPOTS[action.spot] || !spotOpen(state, action.spot)) return false
    obj.at = action.spot
    obj.year = era.year
    state.carried = null
    state.cat = action.spot
    const verb = { roots: 'buries', bark: 'presses', hollow: 'tucks', fork: 'leaves', crown: 'carries' }[action.spot]
    const tail = { roots: 'between the roots', bark: 'into a crack in the bark', hollow: 'into the hollow', fork: 'in the fork', crown: 'up to the crown' }[action.spot]
    log(state, `The cat ${verb} ${itName(state, obj)} ${tail}.`, 'act')
    const past = { roots: 'buried', bark: 'pressed', hollow: 'tucked', fork: 'left', crown: 'carried' }[action.spot]
    history(state, obj, `The cat ${past} it ${tail}.`)
    return true
  }
  if (action.type === 'give') {
    const obj = state.objects[state.carried]
    if (!obj || !presentAt(state).includes(action.who)) return false
    state.carried = null
    state.cat = `person:${action.who}`
    give(state, obj, action.who)
    return true
  }
  return false
}

function give(state, obj, who) {
  const era = ERAS[state.era]
  const person = era.people[who]
  const name = personName(state, who)
  const it = itName(state, obj)
  // a guard sees what is handed over in front of him
  const guarded = era.needs.find(n => n.guard && (n.who === who) && presentAt(state).includes(n.guard))
  if (guarded) {
    const g = STRANGER[guarded.guard]
    log(state, `The cat drops ${it} at Hannah's feet, but her father sees it first. ${fill(g.text, state).replace('{it}', it)}`, 'loss')
    obj.at = 'lost'
    history(state, obj, `Seen by ${personName(state, guarded.guard)} and thrown into the millpond.`)
    return
  }
  const need = needsFor(state, who).find(n => n.accepts.includes(obj.kind))
  if (need) {
    meet(state, need, obj, who)
    return
  }
  if (era.id === 'bypass' && (who === 'pryce' || who === 'lily')) {
    proof(state, obj, who)
    return
  }
  if (person?.family) {
    obj.at = `held:${who}`
    log(state, `The cat leaves ${it} at ${name}'s feet. ${name.split(' ')[0]} keeps it.`, 'act')
    history(state, obj, `Given to ${name}, who kept it.`)
    return
  }
  const s = STRANGER[who]
  if (s) {
    log(state, fill(s.text, state).replace('{it}', it), s.fate === 'lost' ? 'loss' : 'act')
    history(state, obj, fill(s.text, state).replace('{it}', 'it'))
    if (s.fate === 'lost') obj.at = 'lost'
    else if (s.fate.startsWith('keep:')) obj.at = `held:${s.fate.slice(5)}`
    else obj.at = s.fate
    return
  }
  obj.at = 'lost'
}

function meet(state, need, obj, who) {
  const era = ERAS[state.era]
  const key = `${era.id}:${need.id}`
  state.needs[key] = 'met'
  const prefix = obj.relic ? 'It looks older than it should. ' : ''
  const text = prefix + fill(need.met[obj.kind] || need.met[Object.keys(need.met)[0]], state)
  const holder = need.passTo || need.who
  obj.at = `held:${holder}`
  if (need.id === 'promise') state.sur = 'Wren'
  state.stories.push({ year: era.year, need: need.id, label: need.label, kind: obj.kind, objId: obj.id, text, who: personName(state, who) })
  log(state, text, 'story', { objId: obj.id })
  history(state, obj, `${personName(state, holder)} kept it. ${need.label.replace(/^.*? (wants|needs) /, '')}: done.`)
}

function proof(state, obj, who) {
  const it = itName(state, obj)
  const via = who === 'lily' ? `Lily shows Mr Pryce ${it}. ` : ''
  const line = PRYCE_PROOF[obj.kind] || 'Pryce shrugs.'
  if (objInfo(obj).proof && !state.proofs.includes(obj.id)) {
    state.proofs.push(obj.id)
    log(state, via + line, 'proof', { objId: obj.id })
    history(state, obj, 'Written into the county surveyor\'s report, 1966.')
  } else {
    log(state, via + line, 'act')
  }
  if (who === 'lily') {
    obj.at = 'held:lily'
  } else {
    obj.at = objInfo(obj).proof ? 'archive' : 'lost'
    if (obj.at === 'archive') history(state, obj, 'Kept in the county archive.')
  }
}

export const score = state => state.stories.length + state.proofs.length

// ---------------------------------------------------------------- hours

function runStart(state) {
  const era = ERAS[state.era]
  era.start.filter(e => e.hour === state.hour).forEach(e => applyEvent(state, e))
}

function endHour(state) {
  const era = ERAS[state.era]
  era.end.filter(e => e.hour === state.hour).forEach(e => applyEvent(state, e))
  if (state.phase !== 'era') return
  era.needs.forEach(n => {
    const key = `${era.id}:${n.id}`
    if (state.needs[key] === 'open' && state.hour >= n.by) {
      state.needs[key] = 'missed'
      log(state, n.miss, 'loss')
      if (n.id === 'promise') state.sur = 'Cole'
    }
  })
  if (state.hour >= era.hours.length) {
    finishEra(state)
    return
  }
  state.hour += 1
  runStart(state)
}

function applyEvent(state, e) {
  const era = ERAS[state.era]
  if (e.verdict) {
    verdict(state)
    return
  }
  if (e.lap) {
    log(state, e.text, 'event')
    const held = Object.values(state.objects).filter(o => o.at === `held:${e.lap}`)
    held.forEach(o => {
      o.at = 'lap'
      history(state, o, 'Brought back to the oak on Lily\'s lap, 2008.')
    })
    log(state, held.length ? `On her lap: ${held.map(o => itName(state, o)).join(', ')}. She can't reach to give them to anyone.` : 'Her family kept nothing from the tree. She has only the names.', 'event')
    return
  }
  if (e.lapHome) {
    log(state, e.text, 'event')
    objectsAt(state, 'lap').forEach(o => {
      o.at = `held:${e.lapHome}`
      history(state, o, 'Went home with Lily.')
    })
    return
  }
  if (e.text && !e.tell && !e.climb && !e.show && !e.lay && !e.sweep && !e.soak && !e.burn && !e.fall) log(state, e.text, 'event')
  if (e.mark) state.marks.push({ kind: e.mark, year: era.year })
  if (e.give) Object.entries(e.give).forEach(([kind, who]) => {
    const o = addObject(state, kind, `held:${who}`)
    history(state, o, `Given to ${personName(state, who)}.`)
  })
  if (e.loose) e.loose.forEach(kind => {
    const o = addObject(state, kind, 'grass')
    history(state, o, 'Fell from the oak onto the green.')
  })
  if (e.place) Object.entries(e.place).forEach(([kind, spot]) => {
    const o = addObject(state, kind, spot)
    history(state, o, `Hidden in ${SPOTS[spot].label} by ${personName(state, 'abel')}.`)
  })
  if (e.drop) Object.entries(e.drop).forEach(([who, kinds]) => {
    Object.values(state.objects).filter(o => o.at === `held:${who}` && kinds.includes(o.kind)).forEach(o => {
      o.at = 'grass'
      history(state, o, `Dropped in the grass by ${personName(state, who)}.`)
    })
  })
  if (e.seal) {
    state.sealed[e.seal] = true
    const under = objectsAt(state, 'roots')
    if (under.length) log(state, `Under the stone now: ${under.map(o => itName(state, o)).join(', ')}.`, 'warn')
  }
  if (e.unseal) {
    state.sealed[e.unseal] = false
    const under = objectsAt(state, 'roots')
    under.forEach(o => {
      o.at = 'grass'
      history(state, o, 'Turned up by the bypass digger.')
    })
    if (under.length) log(state, `The bucket turns up ${under.map(o => itName(state, o)).join(' and ')}, into the grass.`, 'warn')
  }
  if (e.tell) {
    log(state, e.text, 'event')
    const need = needsFor(state, e.tell)[0]
    const held = Object.values(state.objects).filter(o => o.at === `held:${e.tell}` && need?.accepts.includes(o.kind))
    if (need && held.length) meet(state, need, held[0], e.tell)
  }
  if (e.climb) {
    log(state, e.text, 'event')
    const found = objectsAt(state, 'hollow')
    if (!found.length) {
      log(state, 'The hollow is empty except for leaves.', 'event')
    } else {
      found.forEach(o => {
        const need = needsFor(state, e.climb).find(n => n.accepts.includes(o.kind))
        if (need) {
          log(state, `${personName(state, e.climb).split(' ')[0]} finds ${itName(state, o)} in the hollow.`, 'event')
          meet(state, need, o, e.climb)
        } else {
          o.at = `held:${e.climb}`
          log(state, `${personName(state, e.climb).split(' ')[0]} finds ${itName(state, o)} in the hollow and keeps it.`, 'event')
          history(state, o, `Found in the hollow by ${personName(state, e.climb)}.`)
        }
      })
    }
  }
  if (e.lay) {
    log(state, e.text, 'event')
    const card = addObject(state, 'fieldcard', 'memorial')
    history(state, card, `Written by Tom ${state.sur} at Passchendaele. Laid at the cross by Ada.`, 1917)
    const kit = Object.values(state.objects).filter(o => o.at === 'held:tom')
    kit.forEach(o => {
      o.at = 'memorial'
      history(state, o, 'Came home with Tom\'s kit. Laid at the cross.')
    })
    if (kit.length) log(state, `Beside it, what came home in his kit: ${kit.map(o => itName(state, o)).join(' and ')}.`, 'event')
  }
  if (e.show) {
    log(state, e.text, 'event')
    const held = Object.values(state.objects).filter(o => o.at === `held:${e.show}`)
    if (era.id === 'bypass') {
      held.forEach(o => proof(state, o, 'lily'))
      if (!held.length) log(state, 'Her family kept nothing from the tree. She has only the names.', 'event')
    } else {
      const need = needsFor(state, e.show)[0]
      const order = ['letter', 'sixpence', 'marble', 'fieldcard', 'acorn']
      const best = held.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))[0]
      if (need && best) {
        log(state, `Lily takes ${itName(state, best)} out of her handbag and puts it in Maya's hands.`, 'event')
        meet(state, need, best, e.show)
      } else if (!held.length) {
        log(state, 'Lily has nothing from the tree to give. She looks at it for a long time.', 'event')
      }
    }
  }
  if (e.sweep) {
    log(state, e.text, 'event')
    const where = e.sweep === 'vestry' ? 'memorial' : 'grass'
    const swept = objectsAt(state, where)
    const fate = { pond: 'goes into the millpond', trample: 'is trodden into the green and lost', vestry: 'goes into a church cupboard and is never seen again', verge: 'goes onto the brash pile' }[e.sweep]
    swept.forEach(o => {
      o.at = 'lost'
      history(state, o, `It ${fate.replace(/^is /, 'was ').replace(/^goes/, 'went')}.`)
      log(state, `${cap(itName(state, o))} ${fate}.`, 'loss')
    })
  }
  if (e.soak || e.burn) {
    log(state, e.text, 'event')
    ;(e.soak || e.burn).forEach(spot => {
      objectsAt(state, spot).filter(o => objInfo(o).paper).forEach(o => {
        o.at = 'lost'
        const how = e.soak ? 'The rain turns it to pulp.' : 'It burns.'
        history(state, o, how)
        log(state, `${cap(itName(state, o))}, in ${SPOTS[spot].label}: ${how.toLowerCase()}`, 'loss')
      })
    })
  }
  if (e.fall) {
    log(state, e.text, 'event')
    state.felled = era.year
  }
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

function verdict(state) {
  const total = score(state)
  state.verdict = { total, need: SAVE_THRESHOLD, saved: total >= SAVE_THRESHOLD }
  if (state.verdict.saved) {
    log(state, `Mr Pryce counts on his fingers: ${total} reasons. He rolls up the plan. "The road will have to bend." The white ring stays, and the bark will grow over it.`, 'story')
  } else {
    log(state, `Mr Pryce counts on his fingers: ${total} reasons, and the county wanted ${SAVE_THRESHOLD}. "I'm sorry, Miss ${state.sur}." The saws start.`, 'loss')
    state.felled = 1966
  }
}

function finishEra(state) {
  const era = ERAS[state.era]
  if (state.carried) {
    const o = state.objects[state.carried]
    o.at = state.felled ? 'cat' : 'lost'
    state.carried = null
    if (!state.felled) {
      log(state, `The cat sleeps through the decades, and ${itName(state, o)} rolls out of its mouth into the grass. It's gone by spring.`, 'loss')
      history(state, o, 'Dropped by a sleeping cat. Gone by spring.')
    } else {
      history(state, o, 'Carried off by the cat as the tree came down.')
    }
  }
  objectsAt(state, 'grass').forEach(o => {
    o.at = 'lost'
    history(state, o, 'Left in the grass. Gone by spring.')
    log(state, `Nobody picks up ${itName(state, o)}. It's gone by spring.`, 'loss')
  })
  if (state.felled) {
    toFinale(state)
    return
  }
  state.chronicle = decades(state, era.year)
  state.phase = 'interlude'
}

export function continueEra(prev) {
  if (prev.phase !== 'interlude') return prev
  const state = clone(prev)
  state.era += 1
  state.phase = 'era'
  state.chronicle = []
  startEra(state)
  return state
}

// ---------------------------------------------------------------- decades

const jitter = (key, span) => {
  let h = 7
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) % 9973
  return h % (span + 1)
}

function decades(state, from) {
  const out = []
  const push = (year, text, tone = 'tree') => out.push({ year, text: fill(text, state), tone })
  const it = o => itName(state, o)
  const wren = state.sur === 'Wren'
  if (from === 1846) {
    push(1848, wren ? 'Abel Wren comes back from the sea. He and Hannah marry under the oak.' : 'Abel\'s ship comes back. Hannah is married to Daniel Cole. Abel goes to sea again and does not come back.', 'village')
    push(1868, 'A dry summer. The ring is thin as thread.')
    push(1878, `Hannah's grandson Tom ${state.sur} is born.`, 'village')
    push(1881, 'A gale tears off the east limb. Where it was, a dry hollow opens.')
  }
  if (from === 1887) {
    push(1893, 'Drought. Another thin ring.')
    push(1894, `Hannah ${state.sur} dies. Tom gets what she kept.`, 'village')
    push(1913, `Tom's daughter Lily is born.`, 'village')
    push(1917, `Tom ${state.sur} is killed at Passchendaele, aged thirty-nine.`, 'village')
  }
  if (from === 1919) {
    push(1921, 'Drought.')
    push(1947, 'The great frost. The oak loses its north limb.')
    push(1955, 'Ada dies. Lily keeps what her mother kept.', 'village')
  }
  if (from === 1966) {
    push(1976, 'The long drought. The thinnest ring in the tree.')
    push(1987, 'The great October storm takes half the oaks in the county. Not this one.')
    push(1999, 'The fields behind the green become an estate.', 'village')
    push(2003, 'Heatwave. The heart rot spreads up from the hollow.')
  }
  Object.values(state.objects).forEach(o => {
    const info = objInfo(o)
    if (o.at === 'bark') {
      const y = o.year + 4 + jitter(o.id, 3)
      o.at = 'sealed'
      push(y, `The bark rolls over ${it(o)}. Nobody will see it again until the wood is cut.`)
      history(state, o, 'The bark grew over it.', y)
    } else if (o.at === 'fork') {
      const y = from + 2 + jitter(o.id + from, 4)
      if (info.shiny) {
        o.at = 'crown'
        push(y, `A magpie carries ${it(o)} up to its nest in the crown.`)
        history(state, o, 'Carried to the crown by a magpie.', y)
      } else if (info.paper) {
        o.at = 'lost'
        push(y, `Rain takes ${it(o)} out of the fork, a word at a time.`)
        history(state, o, 'Rained to nothing in the fork.', y)
      } else {
        o.at = 'lost'
        push(y, `A jay takes ${it(o)} from the fork.`)
        history(state, o, 'Taken by a jay.', y)
      }
    } else if (o.at === 'roots') {
      if (info.seed && !state.daughter && !state.sealed.roots) {
        o.at = 'grown'
        state.daughter = from
        push(from + 1, `${cap(it(o))} splits and sends a root down. By ${from + 9} a young oak stands at the edge of the green.`)
        history(state, o, 'Grew into the daughter oak at the edge of the green.', from + 1)
      } else if (info.paper || info.seed) {
        o.at = 'lost'
        push(from + 3, `Between the roots, ${it(o)} turns to soil.`)
        history(state, o, 'Turned to soil between the roots.', from + 3)
      }
    } else if ((o.at === 'hollow' || o.at === 'crown') && info.seed) {
      push(from + 1, `A squirrel finds ${it(o)} in ${o.at === 'hollow' ? 'the hollow' : 'the crown'}.`)
      o.at = 'lost'
      history(state, o, 'Eaten by a squirrel.', from + 1)
    } else if (o.at === 'held:hannah' && from === 1887) {
      o.at = 'held:tom'
      history(state, o, 'Passed to Tom when Hannah died.', 1894)
    } else if (o.at === 'held:ada') {
      o.at = 'held:lily'
      history(state, o, 'Passed to Lily when Ada died.', 1955)
    } else if (o.at === 'held:abel') {
      o.at = 'held:hannah'
    }
  })
  if (from === 1966) state.sealed.kerb = true
  return out.sort((a, b) => a.year - b.year)
}

// ---------------------------------------------------------------- the disc

function toFinale(state) {
  state.phase = 'finale'
  const fell = state.felled
  Object.values(state.objects).forEach(o => {
    if (o.at === 'bark') {
      o.at = 'sealed'
      history(state, o, 'Still in the bark when the tree came down.', fell)
    }
    if (o.at === 'crown') {
      o.at = fell === 2008 ? 'found:maya' : 'lost'
      history(state, o, fell === 2008 ? 'Fell out of the magpies\' nest with the crown. Maya found it on the green next morning.' : 'Burned with the brash from the crown.', fell)
    }
    if (o.at === 'fork') {
      o.at = 'lost'
      history(state, o, 'Lost in the fall.', fell)
    }
  })
}

export function rings(state, upTo = state.felled || ERAS[Math.min(state.era + 1, ERAS.length - 1)].year) {
  // ring widths in mm from age, climate and injuries; deterministic
  const years = []
  let seed = 1786
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  for (let y = GERMINATED; y <= upTo; y++) {
    const age = y - GERMINATED
    let w = 1.4 + 4.2 * Math.exp(-age / 55) + (rnd() - 0.5) * 0.9
    if (age < 6) w *= 0.5 + age * 0.09
    if (DROUGHTS.includes(y)) w *= 0.32
    if (WET_YEARS.includes(y)) w *= 1.35
    if (y >= 1881 && y <= 1884) w *= 0.6
    if (y >= 1887 && y <= 1890) w *= 0.7
    if (y === 1976) w *= 0.6
    if (y > 1966 && state.verdict?.saved) w *= 0.9
    years.push({ year: y, w: Math.max(0.35, w) })
  }
  let r = 0
  years.forEach(ring => { r += ring.w; ring.r = r })
  return years
}

export const ringRadiusAt = (ringList, year) => {
  const ring = ringList.find(r => r.year === year) || ringList[ringList.length - 1]
  return ring.r / ringList[ringList.length - 1].r
}

export function discMarks(state) {
  const list = rings(state)
  const marks = []
  const at = (kind, year, angle, label, text, extra = {}) => marks.push({ kind, year, angle, r: ringRadiusAt(list, year), label, text, ...extra })
  state.marks.forEach(m => {
    if (m.kind === 'carving') at('carving', m.year, -0.2, 'A+H', 'Cut by Abel Wren and Hannah Pell at dawn, Michaelmas 1846. The scar is still in the wood.')
    if (m.kind === 'horseshoe') at('horseshoe', m.year, -1.15, 'horseshoe', 'Nailed up by Ezra Mott for the Queen\'s jubilee. Rusted through, still open end up.')
    if (m.kind === 'firescar') at('firescar', m.year, 0.55, 'fire scar', 'The jubilee bonfire, 1887. The wood healed over the burn in four years.')
    if (m.kind === 'paint') at('paint', m.year, 2.2, 'white ring', state.verdict?.saved ? 'Painted to mark the oak for felling, 1966. It\'s inside the tree now, under forty-two years of wood.' : 'Painted to mark the oak for felling. It is the last ring.')
  })
  const h81 = ringRadiusAt(list, 1881)
  if (state.era >= 1 || state.felled) at('hollow', 1881, 2.7, 'the hollow', 'Opened by the gale of 1881. The heart rot started here.', { r: h81 * 0.55 })
  const sealed = Object.values(state.objects).filter(o => o.at === 'sealed')
  sealed.forEach((o, i) => {
    const base = KIND_ANGLE[o.kind] ?? 0
    at('object', o.year, base + i * 0.12 - 1.6, objInfo(o).short, `${cap(objInfo(o).name)}. ${o.history.map(h => `${h.year}: ${h.text}`).join(' ')}`, { objId: o.id })
  })
  const hollow = Object.values(state.objects).filter(o => o.at === 'hollow')
  hollow.forEach((o, i) => {
    at('object', Math.max(1881, o.year), 2.7 + (i - (hollow.length - 1) / 2) * 0.32 + 0.35, objInfo(o).short, `${cap(objInfo(o).name)}, found in the rotten heart. ${o.history.map(h => `${h.year}: ${h.text}`).join(' ')}`, { objId: o.id, inHollow: true, r: h81 * (0.9 + i * 0.08) })
  })
  return { rings: list, marks }
}

export function epitaph(state) {
  const stories = state.stories.length
  const kept = Object.values(state.objects).filter(o => o.at === 'sealed' || o.at === 'hollow').length
  if (state.felled === 2008 && stories >= 6) return 'the oak that was told'
  if (state.felled === 2008) return 'the oak that held'
  if (kept >= 2) return 'the slab that remembered alone'
  if (stories >= 3) return 'cut for the bypass, talked about for years'
  return 'cut for the bypass'
}

// What stays under the kerb, for the next century.
export function underground(state) {
  return Object.values(state.objects)
    .filter(o => (o.at === 'roots' && (state.sealed.kerb || state.felled)) || o.at === 'cat')
    .map(o => o.kind)
}

export function provenance(state) {
  return Object.values(state.objects).map(o => ({
    id: o.id,
    name: objInfo(o).name,
    kind: o.kind,
    at: o.at,
    history: o.history
  }))
}

export const SPOT_LIST = SPOT_ORDER
