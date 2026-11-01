// The house: one character per cell, 32 x 20. x runs east, y runs south.
// Every cell is something a cat can stand on, leap onto, or bump into.
export const PLAN = [
  '################################',
  '#..BBBBN...PPP..#LttttttttVVVVV#',
  '#.cBBBBcccccccc.#tttttttttVVVVV#',
  '#.cBBBBcccccccc.#tttttttttttttt#',
  '#.cBBBBcccccccc.#tttttttttttttt#',
  '#.ccccccccccccc.#ttttmmmttttttt#',
  '#.ccccccccccccc.#ttttmmmttttttt#',
  '#.ccccccccccccc.#tttttttttttttt#',
  '#...............#tttttttttttttt#',
  '###########1##########2#########',
  '#..uuuuuuuuuuuu....G.....HH....#',
  '#..uuuuuuuuuuuu................#',
  '######aa#################3######',
  '#........SSSSXXXXX#tttttttttttF#',
  '#....rrrrrrr.XXXXX#tttttttttttF#',
  '#....rrrrrrr....O.atttttttttttt#',
  '#....rrrrrrr......atttttttttttt#',
  '#....rrrrrrr..PP..#ttmmmmmmtttt#',
  '#.WW..............#ttKKKTKKKKKK#',
  '################################'
]

export const W = PLAN[0].length
export const H = PLAN.length

export const DOORS = {
  1: { id: 'bedroom', label: 'bedroom door', open: true, axis: 'x' },
  2: { id: 'bathroom', label: 'bathroom door', open: false, axis: 'x' },
  3: { id: 'kitchen', label: 'kitchen door', open: true, axis: 'x' }
}

// Footfall loudness per surface. Leaps land at `land`.
export const SURFACE = {
  '.': { name: 'floorboards', step: 0.55, land: 1.0, hard: true },
  a: { name: 'threshold', step: 0.55, land: 1.0, hard: true },
  1: { name: 'threshold', step: 0.5, land: 1.0, hard: true },
  2: { name: 'threshold', step: 0.5, land: 1.0, hard: true },
  3: { name: 'threshold', step: 0.5, land: 1.0, hard: true },
  c: { name: 'carpet', step: 0.24, land: 0.36 },
  r: { name: 'the rug', step: 0.13, land: 0.25 },
  u: { name: 'the runner', step: 0.13, land: 0.25 },
  t: { name: 'tile', step: 0.85, land: 1.5, hard: true },
  m: { name: 'a bath mat', step: 0.1, land: 0.22 },
  O: { name: 'the nest', step: 0.06, land: 0.12 },
  W: { name: 'the windowsill', step: 0.3, land: 0.5, height: 0.62, climb: true, hard: true },
  B: { name: 'the bed', step: 0.08, land: 0.14, height: 0.55, climb: true, mattress: true },
  N: { name: 'the nightstand', step: 0.4, land: 0.9, height: 0.66, climb: true, hard: true },
  S: { name: 'the sofa', step: 0.09, land: 0.18, height: 0.46, climb: true },
  K: { name: 'the worktop', step: 0.42, land: 1.4, height: 0.92, climb: true, hard: true },
  T: { name: 'a folded tea towel', step: 0.08, land: 0.2, height: 0.94, climb: true },
  L: { name: 'the laundry basket', step: 0.5, land: 0.8, height: 0.5, climb: true }
}

export const BLOCK = new Set(['#', 'P', 'V', 'X', 'F', 'G', 'H'])

// Boards that complain. Invisible until a paw finds one; then chalked for good.
export const CREAKS = [[12, 8], [3, 13], [17, 11], [21, 10], [28, 11], [16, 17], [9, 8], [29, 10]]
export const CREAK_LOUDNESS = 1.4

export const ITEMS = [
  { id: 'cap', name: 'the bottle cap', short: 'cap', x: 29, y: 18, hint: 'on the worktop, far end', carry: 'tinks on anything hard' },
  { id: 'tie', name: 'the hair tie', short: 'hair tie', x: 7, y: 1, hint: 'on the nightstand, by the sleeper', carry: 'makes no sound at all' },
  { id: 'sock', name: 'the warm sock', short: 'sock', x: 17, y: 1, hint: 'on the laundry basket, past the dog', carry: 'muffles every step' }
]

export const NEST = [16, 15]
export const START = [2, 18]

export const SLEEPERS = [
  { id: 'human', name: 'the human', ear: [5, 1.55], depth: 1, sensitivity: 1.6, recovery: 0.02, listening: 1.7 },
  { id: 'dog', name: 'the dog', ear: [26, 10.45], depth: 0.92, sensitivity: 3.4, recovery: 0.05, listening: 1.5 }
]

// World coordinates: cell (x, y) spans [x, x + 1] x [y, y + 1].
export const CLOCK = [19.5, 10.5]
export const FRIDGE = [30.5, 14]
// Rain lands just inside each pane: [x0, y0, x1, y1] in world units.
export const WINDOWS = [
  { room: 'bedroom', line: [1.15, 4.2, 1.15, 7.4] },
  { room: 'living room', line: [1.4, 18.85, 4.6, 18.85] },
  { room: 'kitchen', line: [30.85, 14.8, 30.85, 17.2] },
  { room: 'bathroom', line: [19.5, 1.15, 23.5, 1.15] }
]

export const cellAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '#' : PLAN[y][x])
export const isDoor = ch => ch === '1' || ch === '2' || ch === '3'
export const keyOf = (x, y) => `${x},${y}`

export const freshDoors = () => Object.fromEntries(Object.entries(DOORS).map(([k, d]) => [k, d.open]))

export const doorCells = () => {
  const out = []
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isDoor(PLAN[y][x])) out.push({ x, y, key: PLAN[y][x] })
  return out
}

export function passable(x, y, doors) {
  const ch = cellAt(x, y)
  if (BLOCK.has(ch)) return false
  if (isDoor(ch)) return doors[ch]
  return true
}

export const surfaceAt = (x, y) => SURFACE[cellAt(x, y)] || SURFACE['.']
export const isRaised = (x, y) => Boolean(surfaceAt(x, y).climb)

// Moving between a raised surface and anything of a different height is a leap.
export function isLeap(ax, ay, bx, by) {
  const a = surfaceAt(ax, ay)
  const b = surfaceAt(bx, by)
  return (a.height || 0) !== (b.height || 0)
}

export function roomAt(x, y) {
  if (y <= 8) return x <= 15 ? 'bedroom' : 'bathroom'
  if (y <= 11) return 'hall'
  return x <= 17 ? 'living room' : 'kitchen'
}

const NEIGH = [[1, 0], [-1, 0], [0, 1], [0, -1]]

// A* over cells. Leaps cost more so a route prefers the floor unless the target is up.
export function findPath(from, to, doors) {
  const [sx, sy] = from
  const [tx, ty] = to
  if (!passable(tx, ty, doors)) return null
  const start = keyOf(sx, sy)
  const goal = keyOf(tx, ty)
  const open = new Map([[start, { x: sx, y: sy, g: 0, f: Math.abs(tx - sx) + Math.abs(ty - sy) }]])
  const came = new Map()
  const done = new Set()
  const softness = (x, y) => surfaceAt(x, y).step
  while (open.size) {
    let bestKey = null
    let best = null
    for (const [k, n] of open) if (!best || n.f < best.f) { best = n; bestKey = k }
    open.delete(bestKey)
    if (bestKey === goal) {
      const path = []
      let k = goal
      while (k !== start) {
        const [x, y] = k.split(',').map(Number)
        path.unshift([x, y])
        k = came.get(k)
      }
      return path
    }
    done.add(bestKey)
    for (const [dx, dy] of NEIGH) {
      const nx = best.x + dx
      const ny = best.y + dy
      const nk = keyOf(nx, ny)
      if (done.has(nk) || !passable(nx, ny, doors)) continue
      const leap = isLeap(best.x, best.y, nx, ny)
      if (isRaised(nx, ny) && nk !== goal && !leap && !isRaised(best.x, best.y)) continue
      if (isRaised(nx, ny) && leap && nk !== goal) {
        // only leap onto furniture on the way if the goal is on furniture too
        if (!isRaised(tx, ty)) continue
      }
      const g = best.g + 1 + (leap ? 2.5 : 0) + softness(nx, ny) * 0.15
      const prev = open.get(nk)
      if (!prev || g < prev.g) {
        open.set(nk, { x: nx, y: ny, g, f: g + Math.abs(tx - nx) + Math.abs(ty - ny) })
        came.set(nk, bestKey)
      }
    }
  }
  return null
}

export const adjacentDoor = (x, y, doorList) =>
  doorList.find(d => Math.abs(d.x - x) + Math.abs(d.y - y) === 1) || null
