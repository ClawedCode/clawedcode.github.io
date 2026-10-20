export const SIZE = 7
export const HOURS = 7
export const LEVEL = 0.7
export const HALF = 0.42
export const SAMPLE_HEIGHT = 0.22
export const HOUR_NAMES = ['lauds', 'prime', 'terce', 'sext', 'none', 'vespers', 'compline']

export const SEASONS = {
  summer: { name: 'high summer', low: 15, peak: 52 },
  autumn: { name: 'late autumn', low: 11, peak: 36 },
  winter: { name: 'deep winter', low: 8, peak: 24 }
}

export const CHAPTERS = [
  {
    title: 'A shade for one sleeper',
    subtitle: 'The moth sleeps through the bright middle of the day. The marigold refuses to.',
    season: 'summer',
    stones: { 1: 0, 2: 1, 3: 0 },
    ruins: [],
    creatures: [
      { id: 'moth-a', kind: 'moth', name: 'Ash moth', i: 3, j: 4, needs: '..DDD..' },
      { id: 'gold-a', kind: 'marigold', name: 'Marigold', i: 3, j: 2, needs: '..SSS..' }
    ]
  },
  {
    title: 'Two sleepers, one flower',
    subtitle: 'One moth dozes at prime and terce, the other at vespers and compline. The marigold wants nearly every hour.',
    season: 'autumn',
    stones: { 1: 1, 2: 1, 3: 0 },
    ruins: [],
    creatures: [
      { id: 'moth-a', kind: 'moth', name: 'Morning moth', i: 5, j: 4, needs: '.DD....' },
      { id: 'moth-b', kind: 'moth', name: 'Evening moth', i: 2, j: 3, needs: '.....DD' },
      { id: 'gold-a', kind: 'marigold', name: 'Marigold', i: 3, j: 2, needs: '.SSSSS.' }
    ]
  },
  {
    title: 'The bell at compline',
    subtitle: 'Winter shadows run long. Keep the bell lit until vespers, then cover it for the last hour.',
    season: 'winter',
    stones: { 1: 1, 2: 1, 3: 1 },
    ruins: [{ i: 4, j: 5, h: 2 }, { i: 5, j: 2, h: 1 }],
    creatures: [
      { id: 'bell', kind: 'bell', name: 'Parish bell', i: 3, j: 3, needs: '.SSSSSD' },
      { id: 'moth-a', kind: 'moth', name: 'Ash moth', i: 1, j: 3, needs: '...DDD.' },
      { id: 'gold-a', kind: 'marigold', name: 'Marigold', i: 3, j: 1, needs: '..SSS..' }
    ]
  }
]

export const key = (i, j) => `${i},${j}`
export const toWorld = (i, j) => [i - (SIZE - 1) / 2, j - (SIZE - 1) / 2]

const deg = Math.PI / 180

/** Direction pointing toward the sun at a fractional hour, in world space. */
export function sunDirection(hour, season) {
  const { low, peak } = SEASONS[season]
  const t = (Math.min(Math.max(hour, 0), HOURS - 1) + 0.5) / HOURS
  const azimuth = Math.PI * t
  const elevation = (low + (peak - low) * Math.sin(Math.PI * t)) * deg
  const hx = -Math.cos(azimuth)
  const hz = -Math.sin(azimuth) * 0.85
  const length = Math.hypot(hx, hz)
  return [Math.cos(elevation) * hx / length, Math.sin(elevation), Math.cos(elevation) * hz / length]
}

function rayHitsBox(origin, dir, [x, z], height) {
  let near = 0
  let far = Infinity
  const min = [x - HALF, 0, z - HALF]
  const max = [x + HALF, height, z + HALF]
  for (let axis = 0; axis < 3; axis++) {
    if (Math.abs(dir[axis]) < 1e-9) {
      if (origin[axis] < min[axis] || origin[axis] > max[axis]) return false
      continue
    }
    let a = (min[axis] - origin[axis]) / dir[axis]
    let b = (max[axis] - origin[axis]) / dir[axis]
    if (a > b) [a, b] = [b, a]
    near = Math.max(near, a)
    far = Math.min(far, b)
    if (near > far) return false
  }
  return far > 0
}

/** All occluders for a chapter: fixed ruins plus the player's stones. */
const occluders = (chapter, stones) => [...chapter.ruins, ...stones]

function isShaded(i, j, blocks, dir) {
  const [x, z] = toWorld(i, j)
  const origin = [x, SAMPLE_HEIGHT, z]
  return blocks.some(block => !(block.i === i && block.j === j) && rayHitsBox(origin, dir, toWorld(block.i, block.j), block.h * LEVEL))
}

/** For each creature and hour: { need, shaded, ok }. */
export function evaluate(chapter, stones) {
  const blocks = occluders(chapter, stones)
  const dirs = Array.from({ length: HOURS }, (_, h) => sunDirection(h, chapter.season))
  return chapter.creatures.map(creature => Array.from({ length: HOURS }, (_, h) => {
    const need = creature.needs[h]
    const shaded = isShaded(creature.i, creature.j, blocks, dirs[h])
    const ok = need === '.' || (need === 'D' ? shaded : !shaded)
    return { need, shaded, ok }
  }))
}

export const summarize = grid => {
  const cells = grid.flat().filter(cell => cell.need !== '.')
  return { met: cells.filter(cell => cell.ok).length, total: cells.length, solved: cells.every(cell => cell.ok) }
}

export const blockedTiles = chapter => new Set([
  ...chapter.ruins.map(r => key(r.i, r.j)),
  ...chapter.creatures.map(c => key(c.i, c.j))
])

/** Point where the top of a stone's shadow lands on the plaza at an hour. */
export function shadowTip(stone, hour, season) {
  const dir = sunDirection(hour, season)
  const [x, z] = toWorld(stone.i, stone.j)
  const reach = (stone.h * LEVEL) / Math.max(dir[1], 0.05)
  return [x - dir[0] * reach, z - dir[2] * reach]
}
