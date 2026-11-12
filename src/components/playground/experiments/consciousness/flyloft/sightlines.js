/**
 * fly.loft() — sightlines.
 *
 * The theatre is solved in section: x is depth upstage of the plaster line
 * (the back face of the proscenium wall), y is height above the stage floor.
 * Every hanging piece is a vertical span at its lineset's depth. From a seat's
 * eye the proscenium opening admits a fan of rays, measured here as slopes
 * (rise per metre of depth). Walking the linesets from front to back, each
 * opaque piece removes the slopes it catches from the open fan. What a piece
 * receives before it is subtracted is exactly what that seat sees of it.
 * Whatever survives past the last line lands on the bare back wall or, above
 * it, on the fly tower roof. Cutouts are narrow, so they never block a ray.
 */

export const PIPE = 0.07 // batten tube, metres
const EPS = 1e-9

const addInterval = (list, a, b) => (b - a > EPS ? [...list, [a, b]] : list)

function subtract(open, a, b) {
  let out = []
  for (const [p, q] of open) {
    if (b <= p || a >= q) { out.push([p, q]); continue }
    out = addInterval(out, p, Math.min(a, q))
    out = addInterval(out, Math.max(b, p), q)
  }
  return out
}

function intersect(open, a, b) {
  const out = []
  for (const [p, q] of open) {
    const lo = Math.max(p, a)
    const hi = Math.min(q, b)
    if (hi - lo > EPS) out.push([lo, hi])
  }
  return out
}

const measure = (list) => list.reduce((s, [p, q]) => s + (q - p), 0)

/** Slopes from the eye that lie below the floor at depth x have already landed on the stage. */
const slopeAt = (eye, x, y) => (y - eye.y) / (x - eye.x)

/**
 * pieces: [{ id, kind: 'border'|'drop'|'ground'|'cut', h, x, pipe, wire }]
 *   pipe = height of the batten; a cloth hangs straight from it, a cutout
 *   hangs `wire` metres below it on black wires; bottom = pipe - wire - h
 * house: { prosH, grid, backX }
 * Returns per piece: { seen: [[s0,s1]], frac, pipeSeen } plus wall/roof leaks
 * and the fan of wedges for drawing.
 */
export function solveSeat(eye, pieces, house) {
  const sLo = slopeAt(eye, 0, 0)
  const sHi = slopeAt(eye, 0, house.prosH)
  let open = sHi > sLo ? [[sLo, sHi]] : []
  const wedges = []
  const result = {}
  const order = [...pieces].sort((p, q) => p.x - q.x)
  let lastX = 0

  const landOnFloor = (x) => {
    // rays below the floor slope at x touched the deck between lastX and x
    const fs = slopeAt(eye, x, 0)
    const hit = intersect(open, -Infinity, fs)
    for (const [a, b] of hit) wedges.push({ a, b, end: 'floor' })
    open = subtract(open, -Infinity, fs)
  }

  for (const p of order) {
    landOnFloor(p.x)
    const top = p.pipe - (p.wire || 0)
    const bottom = top - p.h
    const s0 = slopeAt(eye, p.x, bottom)
    const s1 = slopeAt(eye, p.x, top)
    const seen = intersect(open, s0, s1)
    const span = s1 - s0
    const pipeBand = intersect(open, slopeAt(eye, p.x, p.pipe), slopeAt(eye, p.x, p.pipe + PIPE))
    const pipeSeen = measure(pipeBand) > (PIPE * 0.35) / (p.x - eye.x)
    result[p.id] = {
      seen,
      frac: span > EPS ? measure(seen) / span : 0,
      pipeSeen,
      // visible heights on the piece, for annotations
      spans: seen.map(([a, b]) => [eye.y + a * (p.x - eye.x), eye.y + b * (p.x - eye.x)])
    }
    if (p.kind !== 'cut') {
      for (const [a, b] of seen) wedges.push({ a, b, end: 'piece', x: p.x, id: p.id })
      open = subtract(open, s0, s1)
      // the tube itself is opaque too, though too thin to matter for the fan
    }
    lastX = p.x
  }

  landOnFloor(house.backX)
  const roofSlope = slopeAt(eye, house.backX, house.grid)
  const wall = intersect(open, -Infinity, roofSlope)
  const roof = intersect(open, roofSlope, Infinity)
  for (const [a, b] of wall) wedges.push({ a, b, end: 'wall', x: house.backX })
  for (const [a, b] of roof) wedges.push({ a, b, end: 'roof' })
  void lastX

  const toWall = (list) => list.map(([a, b]) => [eye.y + a * (house.backX - eye.x), eye.y + b * (house.backX - eye.x)])
  return {
    pieces: result,
    wall: { seen: wall, spans: toWall(wall), amount: measure(wall) * (house.backX - eye.x) },
    roof: { seen: roof, amount: measure(roof) },
    wedges,
    window: [sLo, sHi]
  }
}

/** Where a ray of slope s from the eye ends, for drawing the fan in section. */
export function wedgeEnd(eye, s, end, x, house) {
  if (end === 'floor') return { x: eye.x + (0 - eye.y) / s, y: 0 }
  if (end === 'roof') {
    const xr = eye.x + (house.grid - eye.y) / s
    return { x: Math.min(xr, house.backX), y: Math.min(house.grid, eye.y + s * (house.backX - eye.x)) }
  }
  return { x, y: eye.y + s * (x - eye.x) }
}

/**
 * Judge one cue for one seat. Returns a list of faults, each with the piece
 * and the heights that are showing, so the view can point at them.
 */
export function judgeSeat(seat, cueScene, placed, house) {
  const sol = solveSeat(seat.eye, placed, house)
  const faults = []
  const inSet = new Set(cueScene.in)
  for (const p of placed) {
    const r = sol.pieces[p.id]
    const mid = p.pipe - (p.wire || 0) - p.h / 2
    const isIn = inSet.has(p.id)
    // a ground row on the deck stands on its own braces: its lift lines go slack
    const standing = p.kind === 'ground' && p.pipe - p.h <= 0.02
    if (r.pipeSeen && !standing) faults.push({ type: 'pipe', id: p.id, y: p.pipe, x: p.x })
    if (p.kind === 'border') continue
    if (!isIn) {
      if (r.frac > 0.004) faults.push({ type: 'hanging', id: p.id, spans: r.spans, x: p.x, frac: r.frac })
      continue
    }
    if (p.kind === 'drop' || p.kind === 'ground') {
      if (p.pipe - p.h > 0.02) faults.push({ type: 'off-deck', id: p.id, x: p.x, y: mid })
      else if (r.frac < (p.kind === 'ground' ? 0.6 : 0.35)) faults.push({ type: 'buried', id: p.id, x: p.x, y: mid, frac: r.frac })
    }
    if (p.kind === 'cut') {
      const rule = cueScene.cut && cueScene.cut[p.id]
      if (rule && rule.peek) {
        // only the top of it, rising over something nearer the audience
        const top = p.pipe - (p.wire || 0)
        const topSeen = r.spans.some(([, b]) => b >= top - p.h * 0.08)
        if (r.frac < rule.peek[0] || !topSeen) faults.push({ type: 'sunk', id: p.id, x: p.x, y: mid, frac: r.frac })
        else if (r.frac > rule.peek[1]) faults.push({ type: 'exposed', id: p.id, x: p.x, y: mid, frac: r.frac })
      } else if (r.frac < 0.985) faults.push({ type: 'cropped', id: p.id, x: p.x, y: mid, frac: r.frac })
      if (rule) {
        const bottom = p.pipe - (p.wire || 0) - p.h
        if (rule.minBottom != null && bottom < rule.minBottom - 1e-6) faults.push({ type: 'too-low', id: p.id, x: p.x, y: mid })
        if (rule.maxBottom != null && bottom > rule.maxBottom + 1e-6) faults.push({ type: 'too-high', id: p.id, x: p.x, y: mid })
      }
    }
  }
  if (sol.wall.amount > 0.02) faults.push({ type: 'wall', spans: sol.wall.spans, x: house.backX })
  if (sol.roof.amount > 1e-4) faults.push({ type: 'roof', x: house.backX })
  return { faults, sol }
}
