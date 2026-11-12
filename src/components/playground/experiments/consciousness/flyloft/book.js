/**
 * fly.loft() — the prompt book.
 *
 * Cues track, as on a lighting desk: a cue stores only the lines it moves,
 * and every line holds its last trim until a later cue moves it again. So a
 * border set in the first cue carries through the whole play, and leaving a
 * cloth in behind another one costs nothing on the rail.
 */

import { PIECES, SEATS, SPEED, LOCK_TIME, placePieces, pipeRange } from './house.js'
import { judgeSeat } from './sightlines.js'
import { CUT_Z } from './paint.js'

export const freshBook = (show) => ({
  hang: { ...show.hang },
  cues: show.scenes.map((_, i) => (i === 0 ? { ...show.preset } : {}))
})

export function trackTrims(show, book) {
  const out = []
  let cur = {}
  book.cues.forEach((c) => {
    cur = { ...cur, ...c }
    out.push(cur)
  })
  return out
}

/** Set a line's trim in one cue, dropping the entry if it only repeats what tracks in. */
export function setTrim(show, book, cueIdx, id, value) {
  const tracks = trackTrims(show, book)
  const prev = cueIdx > 0 ? tracks[cueIdx - 1][id] : undefined
  const cues = book.cues.map((c) => ({ ...c }))
  if (cueIdx > 0 && prev != null && Math.abs(prev - value) < 0.001) delete cues[cueIdx][id]
  else cues[cueIdx][id] = value
  return { ...book, cues }
}

export function swapLines(book, lineA, lineB) {
  const hang = { ...book.hang }
  const a = Object.keys(hang).find((id) => hang[id] === lineA)
  const b = Object.keys(hang).find((id) => hang[id] === lineB)
  if (a) hang[a] = lineB
  if (b) hang[b] = lineA
  return { ...book, hang }
}

export const pieceOnLine = (book, line) => Object.keys(book.hang).find((id) => book.hang[id] === line) || null

/**
 * Fly the scene's cloths in and everything else out, then walk each border
 * up and down and leave it where this scene shows the fewest faults. It never
 * rehangs and never hunts for short travel, so the craft is still yours.
 */
export function roughIn(show, book, cueIdx) {
  const scene = show.scenes[cueIdx]
  const inSet = new Set(scene.in)
  let next = book
  const trims = trackTrims(show, book)[cueIdx]
  for (const id of show.pieces) {
    const p = PIECES[id]
    if (p.kind === 'border') continue
    const [lo, hi] = pipeRange(p, show.houseSpec)
    let v
    if (p.kind === 'cut') {
      if (!inSet.has(id)) v = hi
      else {
        const rule = (scene.cut && scene.cut[id]) || {}
        const cur = trims[id]
        const curBottom = cur - p.wire - p.h
        const ok = curBottom >= (rule.minBottom ?? 0) && curBottom <= (rule.maxBottom ?? 99) && cur < hi - 0.01
        v = ok ? cur : Math.min(hi, Math.round(((rule.maxBottom ?? rule.minBottom ?? 0) + p.h + p.wire + (rule.maxBottom != null ? 0 : 0.6)) * 10) / 10)
      }
    } else v = inSet.has(id) ? lo : hi
    next = setTrim(show, next, cueIdx, id, v)
  }
  const faultsHere = (b) => {
    const tr = trackTrims(show, b)[cueIdx]
    return Object.values(judgeCue(show, b, tr, cueIdx).bySeat).reduce((n, x) => n + x.faults.length, 0)
  }
  // borders, and the scene's cut-outs within their marks, each walked to its least-bad trim
  const tunable = show.pieces.filter((id) => PIECES[id].kind === 'border' || (PIECES[id].kind === 'cut' && inSet.has(id)))
  let best = faultsHere(next)
  for (let round = 0; round < 2 && best > 0; round++) {
    for (const id of tunable) {
      const p = PIECES[id]
      const [lo, hi] = pipeRange(p, show.houseSpec)
      let from = lo
      let to = Math.min(hi, show.houseSpec.prosH + p.h + 4)
      if (p.kind === 'cut') {
        const rule = (scene.cut && scene.cut[id]) || {}
        from = Math.max(lo, (rule.minBottom ?? 0) + p.h + p.wire)
        to = Math.min(hi - 0.1, (rule.maxBottom ?? show.houseSpec.prosH) + p.h + p.wire)
      }
      for (let v = Math.round(from * 10) / 10; v <= to + 1e-6; v = Math.round((v + 0.2) * 10) / 10) {
        const trial = setTrim(show, next, cueIdx, id, v)
        const n = faultsHere(trial)
        if (n < best) { best = n; next = trial }
      }
    }
  }
  return next
}

const LABEL = {
  pipe: (n) => `${n}: pipe showing`,
  hanging: (n) => `${n}, hanging`,
  wall: () => 'bare back wall',
  roof: () => 'the fly tower roof',
  cropped: (n, f) => (f.behind ? `${n} behind ${f.behind}` : `${n} cut off`),
  sunk: (n) => `${n} sunk out of sight`,
  exposed: (n) => `${n}: too much showing`,
  buried: (n, f) => `${n}: only ${Math.round((f.frac || 0) * 100)}% showing`,
  'off-deck': (n) => `${n} off the deck`,
  'too-low': (n) => `${n} too low`,
  'too-high': (n) => `${n} too high`
}

export const shortName = (id) => (PIECES[id] ? PIECES[id].name.replace(/^the /, '') : '')

export function judgeCue(show, book, trims, cueIdx, eye = null) {
  const placed = placePieces(show, book.hang, trims)
  const scene = show.scenes[cueIdx]
  const seats = eye ? [{ id: 'eye', eye }] : show.seats.map((s) => SEATS[s])
  const bySeat = {}
  for (const seat of seats) {
    const { faults, sol } = judgeSeat(seat, scene, placed, show.houseSpec)
    bySeat[seat.id] = {
      sol,
      faults: faults.map((f) => {
        const out = { ...f, seat: seat.id, z: f.id && PIECES[f.id].kind === 'cut' ? CUT_Z[PIECES[f.id].paint] || 0 : 0 }
        if (f.type === 'cropped') {
          // a cut-out hung upstage of a cloth that is in: say which cloth it is behind
          const front = placed.filter((q) => scene.in.includes(q.id) && (q.kind === 'drop' || q.kind === 'ground') && q.x < f.x).sort((a, b) => a.x - b.x)[0]
          if (front) out.behind = shortName(front.id)
          else {
            // or a border downstage whose hem comes down past the cut-out's top
            const cut = placed.find((q) => q.id === f.id)
            const cutTop = cut.pipe - (cut.wire || 0)
            const border = placed.filter((q) => q.kind === 'border' && q.x < f.x && q.pipe - q.h < cutTop).sort((a, b) => b.x - a.x)[0]
            if (border) out.behind = shortName(border.id)
          }
        }
        out.label = LABEL[f.type](shortName(f.id), out)
        return out
      })
    }
  }
  return { placed, bySeat }
}

/** The change into cue k: which lines move, grouped into passes for the crew. */
export function planChange(show, tracks, k) {
  if (k === 0) return { moves: [], passes: [], time: 0 }
  const moves = []
  for (const id of show.pieces) {
    const a = tracks[k - 1][id]
    const b = tracks[k][id]
    if (Math.abs(a - b) > 0.001) moves.push({ id, from: a, to: b, travel: Math.abs(a - b) })
  }
  moves.sort((m, n) => n.travel - m.travel)
  const passes = []
  for (let i = 0; i < moves.length; i += show.crew) {
    const group = moves.slice(i, i + show.crew)
    passes.push({ moves: group, time: group[0].travel / SPEED + LOCK_TIME })
  }
  const time = passes.reduce((s, p) => s + p.time, 0)
  return { moves, passes, time }
}

export function analyse(show, book) {
  const tracks = trackTrims(show, book)
  const cues = show.scenes.map((_, k) => {
    const j = judgeCue(show, book, tracks[k], k)
    const faults = Object.values(j.bySeat).flatMap((s) => s.faults)
    return { ...j, faults, change: planChange(show, tracks, k) }
  })
  const faultCount = cues.reduce((s, c) => s + c.faults.length, 0)
  const changeTime = cues.reduce((s, c) => s + c.change.time, 0)
  // the picture: how much of each scene's cloth the worst-placed seat gets, averaged over the play
  cues.forEach((c, k) => {
    const cloth = show.scenes[k].in.find((id) => PIECES[id].kind === 'drop')
    c.picture = cloth ? Math.min(...Object.values(c.bySeat).map((b) => b.sol.pieces[cloth].frac)) : 1
  })
  const picture = cues.reduce((s, c) => s + c.picture, 0) / cues.length
  const generous = picture >= show.picture - 1e-6
  let stars = 0
  if (faultCount === 0 && changeTime <= show.par + 1e-6 && generous) stars = 3
  else if (faultCount === 0) stars = 2
  else if (faultCount <= 3) stars = 1
  return { tracks, cues, faultCount, changeTime, picture, generous, stars }
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

const HEADLINES = [
  'THE FLIES WERE THE PLAY',
  'WE SAW THE ROPES',
  'LOVELY, AND SLOW IN THE DARK',
  'A HOUSE THAT KEEPS ITS SECRETS'
]

/** The critic sits in row P; the rest of the house writes in. */
export function writeNotice(show, result) {
  const lines = []
  const seen = new Set()
  result.cues.forEach((c, k) => {
    const scene = show.scenes[k]
    for (const f of c.faults) {
      const key = `${f.type}:${f.id || ''}:${f.seat}`
      if (seen.has(key)) continue
      seen.add(key)
      const who = f.seat === 'P' ? 'From my seat' : `From ${SEATS[f.seat].label}`
      const n = f.id ? PIECES[f.id].name : ''
      if (f.type === 'hanging') lines.push(`${who}, ${n} hung over “${scene.title}” like a rumour nobody would deny.`)
      else if (f.type === 'pipe') lines.push(`${who} you could count the pipes, and ${n} hung from one of them.`)
      else if (f.type === 'wall') lines.push(`${who} the back wall showed in “${scene.title}”, with its ladder and its notice about smoking.`)
      else if (f.type === 'roof') lines.push(`${who} one could see clean up into the fly tower roof.`)
      else if (f.type === 'cropped') lines.push(f.behind ? `${who}, ${n} spent “${scene.title}” behind ${PIECES[f.id] ? 'the ' + f.behind : f.behind}.` : `${who}, ${n} arrived with a piece missing.`)
      else if (f.type === 'sunk') lines.push(`${who}, ${n} never came up over the waves in “${scene.title}”.`)
      else if (f.type === 'exposed') lines.push(`${who} we saw all of ${n}, keel and all, and the waves were only paint.`)
      else if (f.type === 'buried') lines.push(`${cap(n)} was billed, but ${f.seat === 'P' ? 'I' : SEATS[f.seat].label} never saw it.`)
      else if (f.type === 'too-low' || f.type === 'too-high') lines.push(`${cap(n)} was not where the play said it would be.`)
      else if (f.type === 'off-deck') {
        const gap = trimsFloat(result, k, f.id)
        lines.push(gap < 0.6 ? `${cap(n)} floated a hand's width off the floor.` : `${cap(n)} hung ${gap.toFixed(1)} metres off the floor, and the actors walked under it.`)
      }
    }
  })
  const t = Math.round(result.changeTime)
  if (result.faultCount === 0) {
    const reach = show.seats.includes('G') ? 'from the front row craning up to the gods craning down' : 'from the front row to the last of the stalls'
    const tails = [`${reach}.`, 'and when it went, it went like weather.', 'as if the theatre had no ceiling at all.', 'and nobody saw how.']
    const praise = show.scenes.map((sc, k) => `“${sc.title}” arrived whole in every seat, ${tails[k % tails.length]}`)
    lines.unshift('Nothing hung where it should not. Not a pipe, not a wire, not a brick.', ...praise)
    const pct = Math.round(result.picture * 100)
    lines.push(result.generous
      ? `The borders flew as high as they dared: even the worst seat had ${pct}% of every cloth.`
      : `The masking was safe and mean: the worst seat had ${pct}% of the cloths, where ${Math.round(show.picture * 100)}% was there to be had.`)
  }
  if (result.changeTime > show.par + 1e-6) lines.push(`The changes took ${t} seconds. The music between scenes ran out after ${show.par}, and we sat in the dark listening to ropes.`)
  else lines.push(`The changes came and went in ${t} seconds, inside the music.`)
  return { headline: HEADLINES[result.stars], lines: lines.slice(0, 7), more: Math.max(0, lines.length - 7) }
}

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)

const trimsFloat = (result, k, id) => {
  const p = result.cues[k].placed.find((x) => x.id === id)
  return p ? p.pipe - (p.wire || 0) - p.h : 0
}
