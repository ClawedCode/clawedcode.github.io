// One oak, grown once from a fixed seed and shown at any age.
// Units: SVG user space, ground at y = GROUND, trunk centred on x = TRUNK_X.

export const VIEW_W = 1000
export const VIEW_H = 1200
export const GROUND = 1010
export const TRUNK_X = 520

const rng = seed => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

// birth = the tree's age in years when a limb appears; lost = calendar year it falls
function build() {
  const r = rng(4417)
  const segs = []
  const leaves = []
  const add = (seg) => { segs.push(seg); return seg }
  const trunkLen = 0.36
  add({ id: 'trunk', x0: 0, y0: 0, x1: 0.02, y1: -trunkLen, w0: 1, w1: 0.78, depth: 0, birth: 0 })

  const clump = (x, y, birth, tag, lost, size) => {
    for (let k = 0; k < 3; k++) {
      leaves.push({ x: x + (r() - 0.5) * 0.07, y: y + (r() - 0.5) * 0.05 - 0.01, birth: birth + k * 3, tag, lost, size: size * (0.7 + r() * 0.5) })
    }
  }

  const limb = (x, y, ang, len, w, depth, birth, tag, lost) => {
    const x1 = x + Math.sin(ang) * len
    const y1 = y - Math.cos(ang) * len
    const s = add({ id: `${tag}-${segs.length}`, x0: x, y0: y, x1, y1, w0: w, w1: w * 0.72, depth, birth, tag, lost })
    if (depth >= 6) {
      clump(x1, y1, birth + 2, tag, lost, 1)
      return s
    }
    const kids = depth < 3 ? 3 : 2
    for (let k = 0; k < kids; k++) {
      const spread = (k - (kids - 1) / 2) * (0.62 + r() * 0.3) + (r() - 0.5) * 0.3
      // oak limbs reach out, then the tips turn up to the light
      const lean = depth < 3 ? ang * 1.08 : ang * 0.72
      limb(x1, y1, lean + spread, len * (0.72 + r() * 0.12), w * (0.6 + r() * 0.08), depth + 1, birth + 2 + r() * 4, tag, lost)
    }
    if (depth >= 4) clump((x + x1) / 2, (y + y1) / 2, birth + 4, tag, lost, 0.8)
    return s
  }
  const fy = -trunkLen
  limb(0.02, fy, -0.55, 0.2, 0.52, 1, 1, 'west')
  limb(0.02, fy, 0.18, 0.22, 0.56, 1, 1, 'leader')
  limb(0.02, fy, 0.72, 0.19, 0.44, 1, 2, 'south')
  // east limb from the lower trunk: the 1881 gale takes it and leaves the hollow
  limb(-0.02, -0.24, -1.12, 0.2, 0.34, 2, 4, 'east', 1881)
  // north limb low on the right: the 1947 frost takes it
  limb(0.03, -0.28, 1.12, 0.17, 0.28, 2, 10, 'north', 1947)
  return { segs, leaves, trunkLen }
}

const TREE = build()

export function treeHeight(age) {
  return Math.min(840, 290 + 2.45 * age)
}

export function trunkWidth(age) {
  return 46 + 110 * (1 - Math.exp(-age / 120))
}

const project = (age, x, y) => {
  const h = treeHeight(age)
  const spread = 0.82 + 0.45 * (1 - Math.exp(-age / 90))
  return [TRUNK_X + x * h * spread * 1.2, GROUND + y * h]
}

const visible = (seg, age, year) => seg.birth <= age && !(seg.lost && year >= seg.lost)

export function treeShape(age, year) {
  const tw = trunkWidth(age)
  const segs = TREE.segs.filter(s => visible(s, age, year)).map(s => {
    const grown = Math.min(1, (age - s.birth) / 20 + 0.4)
    const [ax, ay] = project(age, s.x0, s.y0)
    let [bx, by] = project(age, s.x1, s.y1)
    bx = ax + (bx - ax) * grown
    by = ay + (by - ay) * grown
    const w0 = Math.max(2, s.w0 * tw)
    const w1 = Math.max(1.4, s.w1 * tw * (s.depth === 0 ? 1 : grown))
    return { ...s, ax, ay, bx, by, w0, w1 }
  })
  const leaves = TREE.leaves.filter(l => l.birth <= age && !(l.lost && year >= l.lost)).map(l => {
    const [x, y] = project(age, l.x, l.y)
    return { x, y, r: (18 + age * 0.05) * l.size, tag: l.tag }
  }).sort((a, b) => b.y - a.y)
  const stubs = TREE.segs.filter(s => s.lost && year >= s.lost && s.depth === 2).map(s => {
    const [ax, ay] = project(age, s.x0, s.y0)
    const [bx, by] = project(age, s.x0 + (s.x1 - s.x0) * 0.16, s.y0 + (s.y1 - s.y0) * 0.16)
    return { ax, ay, bx, by, w: s.w0 * tw, tag: s.tag }
  })
  return { segs, leaves, stubs, tw, h: treeHeight(age) }
}

export function segPath(s) {
  const dx = s.bx - s.ax
  const dy = s.by - s.ay
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const a = s.w0 / 2
  const b = s.w1 / 2
  // slight bow so limbs are not straight sticks
  const bow = len * 0.06 * (s.depth % 2 ? 1 : -1)
  const mx = (s.ax + s.bx) / 2 + nx * bow
  const my = (s.ay + s.by) / 2 + ny * bow
  const m = (a + b) / 2
  return `M${(s.ax + nx * a).toFixed(1)},${(s.ay + ny * a).toFixed(1)}` +
    ` Q${(mx + nx * m).toFixed(1)},${(my + ny * m).toFixed(1)} ${(s.bx + nx * b).toFixed(1)},${(s.by + ny * b).toFixed(1)}` +
    ` L${(s.bx - nx * b).toFixed(1)},${(s.by - ny * b).toFixed(1)}` +
    ` Q${(mx - nx * m).toFixed(1)},${(my - ny * m).toFixed(1)} ${(s.ax - nx * a).toFixed(1)},${(s.ay - ny * a).toFixed(1)} Z`
}

export function rootPath(age) {
  const tw = trunkWidth(age)
  const flare = tw * 1.05
  const x = TRUNK_X
  const g = GROUND
  return `M${x - tw / 2},${g - tw * 0.9} C${x - tw / 2},${g - tw * 0.3} ${x - flare},${g - 10} ${x - flare - tw * 0.55},${g + 4}` +
    ` L${x + flare + tw * 0.5},${g + 4} C${x + flare},${g - 12} ${x + tw / 2 + 2},${g - tw * 0.3} ${x + tw / 2 + 4},${g - tw * 0.9} Z`
}

// Where the cat's five places sit on the tree at a given age.
export function anchors(age, year) {
  const shape = treeShape(age, year)
  const tw = shape.tw
  const h = shape.h
  const trunkTop = project(age, 0.025, -TREE.trunkLen)
  const crownSeg = shape.segs.filter(s => s.tag === 'leader' && s.depth === 3).sort((a, b) => a.by - b.by)[0] || shape.segs.find(s => s.tag === 'leader')
  const east = project(age, -0.02, -0.25)
  return {
    roots: { x: TRUNK_X - tw * 0.95 - 26, y: GROUND - 18 },
    bark: { x: TRUNK_X + 8, y: GROUND - 54 },
    hollow: { x: TRUNK_X - tw * 0.3, y: Math.min(GROUND - 122, (east[1] + trunkTop[1]) / 2 + 40) },
    fork: { x: trunkTop[0], y: trunkTop[1] + 14 },
    crown: crownSeg ? { x: crownSeg.bx, y: crownSeg.by } : { x: TRUNK_X + 80, y: GROUND - h * 0.8 }
  }
}

export const GRASS_SPOTS = [
  { x: 300, y: GROUND + 46 }, { x: 470, y: GROUND + 140 }, { x: 580, y: GROUND + 78 },
  { x: 250, y: GROUND + 150 }, { x: 745, y: GROUND + 120 }, { x: 380, y: GROUND + 96 }
]

export const PERSON_SLOTS = [
  { x: 175, y: GROUND + 60 }, { x: 820, y: GROUND + 62 }, { x: 655, y: GROUND + 156 }, { x: 905, y: GROUND + 150 }
]
