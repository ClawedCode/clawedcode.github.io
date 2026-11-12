/**
 * fly.loft() — three houses, three plays.
 *
 * Distances are metres. Lineset depths are measured upstage of the plaster
 * line; seat eyes sit in front of it (negative x). A piece's trim is the
 * height of its batten, which is the top of the piece.
 */

export const LINES = [0.9, 2.15, 3.4, 4.65, 5.9, 7.15, 8.4, 9.65]
export const SPEED = 1.9 // metres per second on the rail
export const LOCK_TIME = 1.2 // seconds to unlock, haul and lock again, per pass

export const PIECES = {
  border1: { id: 'border1', name: 'the first border', kind: 'border', h: 3, w: 15, paint: 'teaser' },
  border2: { id: 'border2', name: 'the second border', kind: 'border', h: 3, w: 15, paint: 'velvet' },
  border3: { id: 'border3', name: 'the third border', kind: 'border', h: 3, w: 15, paint: 'velvet' },
  palace: { id: 'palace', name: 'the palace roofs', kind: 'drop', h: 8, w: 15, paint: 'palace' },
  sea: { id: 'sea', name: 'the open sea', kind: 'drop', h: 8, w: 15, paint: 'sea' },
  night: { id: 'night', name: 'the empty night', kind: 'drop', h: 8, w: 15, paint: 'night' },
  lamps: { id: 'lamps', name: 'the lamp street', kind: 'drop', h: 8, w: 15, paint: 'lamps' },
  moon: { id: 'moon', name: 'the moon', kind: 'cut', h: 2.2, w: 2.2, wire: 4, paint: 'moon' },
  cat: { id: 'cat', name: 'the cat', kind: 'cut', h: 3.4, w: 3.6, wire: 4, paint: 'cat' },
  // on tour the cut-outs hang on short wires: the van has no room for long ones
  moonT: { id: 'moonT', name: 'the moon', kind: 'cut', h: 2.2, w: 2.2, wire: 2.4, paint: 'moon' },
  catT: { id: 'catT', name: 'the cat', kind: 'cut', h: 3.4, w: 3.6, wire: 3.4, paint: 'cat' },
  ship: { id: 'ship', name: 'the paper ship', kind: 'cut', h: 2.6, w: 4.2, wire: 4, paint: 'ship' },
  waves: { id: 'waves', name: 'the wave row', kind: 'ground', h: 1.7, w: 15, paint: 'waves' },
  // the tall house: shorter drops, a low grid
  palaceS: { id: 'palaceS', name: 'the palace roofs', kind: 'drop', h: 7.5, w: 15, paint: 'palace' },
  seaS: { id: 'seaS', name: 'the open sea', kind: 'drop', h: 7.5, w: 15, paint: 'sea' },
  nightS: { id: 'nightS', name: 'the empty night', kind: 'drop', h: 7.5, w: 15, paint: 'night' }
}

export const SEATS = {
  A: { id: 'A', label: 'row A', note: 'front stalls, looking up', eye: { x: -3.2, y: 1.4 }, color: '#e0482c' },
  P: { id: 'P', label: 'row P', note: 'back stalls, the critic', eye: { x: -15.5, y: 3.7 }, color: '#2e9a72' },
  G: { id: 'G', label: 'the gods', note: 'top balcony, looking down', eye: { x: -14.5, y: 9.3 }, color: '#5a63d8' }
}

export const SHOWS = [
  {
    id: 'moon',
    numeral: 'I',
    house: 'the Lamp Street Hall',
    title: 'The Cat Who Swallowed the Moon',
    short: 'the moon',
    houseSpec: { prosH: 7, grid: 22, backX: 10.8 },
    seats: ['A', 'P'],
    crew: 2,
    par: 20,
    picture: 0.8,
    pieces: ['border1', 'border2', 'border3', 'palace', 'sea', 'night', 'moon', 'cat'],
    // the hang you inherit from the last company
    hang: { border1: 0, palace: 1, border2: 2, sea: 3, moon: 4, border3: 5, night: 6, cat: 7 },
    preset: { border1: 9.5, border2: 11, border3: 12, palace: 8, sea: 21.4, night: 21.4, moon: 13.5, cat: 21.4 },
    scenes: [
      { id: 's1', title: 'A palace roof. Night', line: 'Up on the leads the cat counts chimneys and finds one moon too many.', in: ['palace', 'moon'], cut: { moon: { minBottom: 3.4 } } },
      { id: 's2', title: 'The open sea', line: 'The moon walks out over the water. The cat follows on the reflections.', in: ['sea', 'moon'], cut: { moon: { minBottom: 3.4 } } },
      { id: 's3', title: 'The cat, enormous', line: 'Out of the sea rises the whole cat, and the moon is very close to its mouth.', in: ['sea', 'cat', 'moon'], cut: { moon: { minBottom: 2.6 }, cat: { maxBottom: 0.6 } } },
      { id: 's4', title: 'No moon at all', line: 'An empty night. Something has eaten the moon, and it is purring.', in: ['night', 'cat'], cut: { cat: { maxBottom: 1.2 } } }
    ]
  },
  {
    id: 'ship',
    numeral: 'II',
    house: 'the Harbour Coliseum',
    title: 'The Paper Ship Comes In',
    short: 'the ship',
    houseSpec: { prosH: 7, grid: 22, backX: 10.8 },
    seats: ['A', 'P', 'G'],
    crew: 2,
    par: 25,
    picture: 0.43,
    pieces: ['border1', 'border2', 'border3', 'lamps', 'sea', 'waves', 'ship', 'moon'],
    hang: { border1: 0, lamps: 1, border2: 2, waves: 3, border3: 4, ship: 5, moon: 6, sea: 7 },
    preset: { border1: 9.5, border2: 10.5, border3: 12, lamps: 9, sea: 20.4, waves: 20.4, ship: 20.4, moon: 20.4 },
    scenes: [
      { id: 's1', title: 'The lamp street, closing time', line: 'Every lamp is a cat with its eyes shut. One of them is awake.', in: ['lamps'] },
      { id: 's2', title: 'The harbour wall', line: 'Tide out. A paper ship rides behind the waves, waiting for someone light enough.', in: ['sea', 'waves', 'ship'], cut: { ship: { maxBottom: 1.2, peek: [0.3, 0.93] } } },
      { id: 's3', title: 'The ship at sea, the moon up', line: 'The cat steers by the moon. The moon steers by nothing.', in: ['sea', 'waves', 'ship', 'moon'], cut: { ship: { maxBottom: 1.2, peek: [0.3, 0.93] }, moon: { minBottom: 2.6 } } },
      { id: 's5', title: 'Home, by the lamps', line: 'The ship is folded back into a letter. The street lamps open one eye each.', in: ['lamps', 'moon'], cut: { moon: { minBottom: 2.6 } } }
    ]
  },
  {
    id: 'tour',
    numeral: 'III',
    house: 'the Corn Exchange, on tour',
    title: 'The Moon, Given Back',
    short: 'on tour',
    // a shallow stage with seven lines, a low grid, two borders in the van and one stagehand.
    // On tour the company plays the story backwards, and the cat has to rise out of a wave row,
    // so it must hang behind the waves yet in front of the cloths it stands against later.
    houseSpec: { prosH: 6.2, grid: 15.5, backX: 8.4, lines: [0.8, 1.9, 3.0, 4.1, 5.2, 6.3, 7.4] },
    seats: ['A', 'P', 'G'],
    crew: 1,
    par: 23,
    picture: 0.46,
    pieces: ['border1', 'border2', 'palaceS', 'seaS', 'waves', 'moonT', 'catT'],
    hang: { border1: 0, moonT: 1, catT: 2, waves: 3, border2: 4, seaS: 5, palaceS: 6 },
    preset: { border1: 8.5, border2: 8.5, palaceS: 14.9, seaS: 7.5, waves: 1.7, moonT: 9.6, catT: 7.4 },
    scenes: [
      { id: 's1', title: 'The cat, enormous', line: 'Played backwards on tour: the cat rises out of the waves and, very carefully, gives the moon back.', in: ['seaS', 'waves', 'catT', 'moonT'], cut: { catT: { maxBottom: 0.4, peek: [0.35, 0.8] }, moonT: { minBottom: 2.2 } } },
      { id: 's2', title: 'The open sea', line: 'The moon walks home over the water, a little smaller in this town.', in: ['seaS', 'waves', 'moonT'], cut: { moonT: { minBottom: 2.2 } } },
      { id: 's3', title: 'A palace roof', line: 'On the leads the cat counts chimneys and finds exactly one moon.', in: ['palaceS', 'catT', 'moonT'], cut: { catT: { maxBottom: 1.2 }, moonT: { minBottom: 2.2 } } },
      { id: 's4', title: 'The roof, after', line: 'The moon has gone home. The cat stays up on the roof, purring at nothing.', in: ['palaceS', 'catT'], cut: { catT: { maxBottom: 1.2 } } }
    ]
  }
]

export const linesOf = (show) => show.houseSpec.lines || LINES

export const pipeRange = (piece, house) => [piece.h + (piece.wire || 0), Math.round((house.grid - 0.6) * 10) / 10]

/** Place a show's pieces on their lines at the given trims. */
export function placePieces(show, hang, trims) {
  const lines = linesOf(show)
  return show.pieces.map((id) => ({ ...PIECES[id], x: lines[hang[id]], line: hang[id], pipe: trims[id] }))
}
