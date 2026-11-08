// Silhouette geometry for the villagers, the cat and the five small things.
// Plain path data so the main component stays readable. Feet at (0,0), up is -y.

export const LOOKS = {
  girl: { h: 150, skirt: 'long', hat: 'bonnet', shawl: true },
  sailor: { h: 166, skirt: false, hat: 'cap', jacket: 'short' },
  father: { h: 172, skirt: false, hat: 'top', jacket: 'long' },
  widow: { h: 150, skirt: 'long', hat: 'bonnet', stoop: 4 },
  boy: { h: 104, skirt: false, hat: 'cap', jacket: 'short', knees: true },
  smith: { h: 172, skirt: false, hat: 'none', apron: true },
  'girl-small': { h: 90, skirt: 'short', hat: 'bow' },
  vicar: { h: 168, skirt: 'cassock', hat: 'flat' },
  woman: { h: 156, skirt: 'mid', hat: 'scarf', jacket: 'aline' },
  surveyor: { h: 174, skirt: false, hat: 'trilby', jacket: 'suit', board: true },
  crew: { h: 168, skirt: false, hat: 'hard', jacket: 'overall' },
  kid: { h: 122, skirt: false, hat: 'hood', phones: true },
  chair: { h: 112, chair: true, hat: 'scarf' }
}

export function figurePaths(look) {
  const L = LOOKS[look] || LOOKS.woman
  const h = L.h
  const head = h * 0.13
  const neck = -h + head * 2
  const sh = h * 0.13 // half shoulder width
  const waist = -h * 0.52
  const paths = []
  if (L.chair) {
    // wheelchair: wheel, frame, seated body
    paths.push({ d: 'M-34,0 a26,26 0 1,0 52,0 a26,26 0 1,0 -52,0 M-22,0 a14,14 0 1,0 28,0 a14,14 0 1,0 -28,0', cls: 'wheel' })
    paths.push({ d: 'M-30,-34 L26,-34 L30,-30 L30,-26 L-26,-26 Z M26,-34 L34,-80 L40,-80 L32,-30 Z M18,-26 L30,0 L34,0 L22,-26 Z', cls: 'frame' })
    paths.push({ d: 'M-14,-36 C-20,-60 -18,-86 0,-92 C14,-88 20,-66 16,-36 Z M-16,-36 L-30,-36 L-34,-6 L-26,-6 L-22,-28 L-6,-28 Z', cls: 'body' })
    paths.push({ d: 'M0,-120 a13,13 0 1,0 0.1,0 Z', cls: 'head' })
    paths.push({ d: 'M-15,-112 C-16,-130 16,-134 15,-112 C14,-104 10,-100 6,-98 L-8,-98 C-12,-102 -15,-106 -15,-112 Z', cls: 'hat' })
    return { paths, h: 134 }
  }
  const s = L.stoop || 0
  // legs or skirt
  if (L.skirt === 'long' || L.skirt === 'cassock') {
    paths.push({ d: `M${-sh * 0.7 + s},${waist} L${-sh * 1.25},-2 Q0,4 ${sh * 1.25},-2 L${sh * 0.7 + s},${waist} Z`, cls: 'body' })
  } else if (L.skirt === 'mid' || L.skirt === 'short') {
    const hem = L.skirt === 'mid' ? -h * 0.2 : -h * 0.3
    paths.push({ d: `M${-sh * 0.7},${waist} L${-sh * 1.15},${hem} Q0,${hem + 6} ${sh * 1.15},${hem} L${sh * 0.7},${waist} Z`, cls: 'body' })
    paths.push({ d: `M-8,${hem} L-9,0 L-3,0 L-2,${hem} Z M2,${hem} L3,0 L9,0 L8,${hem} Z`, cls: 'body' })
  } else {
    const knee = L.knees ? -h * 0.24 : 0
    paths.push({ d: `M${-sh * 0.75},${waist} L${-sh * 0.8},-1 L${-sh * 0.12},-1 L0,${waist + 12} L${sh * 0.12},-1 L${sh * 0.8},-1 L${sh * 0.75},${waist} Z`, cls: 'body' })
    if (knee) paths.push({ d: `M${-sh * 0.82},${knee} L${sh * 0.82},${knee} L${sh * 0.82},${knee + 3} L${-sh * 0.82},${knee + 3} Z`, cls: 'trim' })
  }
  // torso
  const tLen = L.jacket === 'long' ? -h * 0.18 : L.jacket === 'aline' ? -h * 0.3 : waist
  paths.push({ d: `M${-sh + s},${neck + 4} Q${-sh - 4 + s},${(neck + tLen) / 2} ${-sh * (L.jacket === 'long' || L.jacket === 'aline' ? 1.05 : 0.78)},${tLen} L${sh * (L.jacket === 'long' || L.jacket === 'aline' ? 1.05 : 0.78)},${tLen} Q${sh + 4 + s},${(neck + tLen) / 2} ${sh + s},${neck + 4} Q${s},${neck - 3} ${-sh + s},${neck + 4} Z`, cls: 'body' })
  // arms
  paths.push({ d: `M${-sh + s},${neck + 6} Q${-sh - 8 + s},${waist + 4} ${-sh - 3},${waist + 22} L${-sh + 4},${waist + 22} Q${-sh + 2 + s},${waist} ${-sh + 6 + s},${neck + 14} Z M${sh + s},${neck + 6} Q${sh + 8 + s},${waist + 4} ${sh + 3},${waist + 22} L${sh - 4},${waist + 22} Q${sh - 2 + s},${waist} ${sh - 6 + s},${neck + 14} Z`, cls: 'body' })
  if (L.shawl) paths.push({ d: `M${-sh - 3 + s},${neck + 6} L${sh + 3 + s},${neck + 6} L${s},${neck + h * 0.2} Z`, cls: 'trim' })
  if (L.apron) paths.push({ d: `M${-sh * 0.7},${neck + 14} L${sh * 0.7},${neck + 14} L${sh * 0.9},${-h * 0.18} L${-sh * 0.9},${-h * 0.18} Z`, cls: 'trim' })
  if (L.board) paths.push({ d: `M${sh},${waist - 6} L${sh + 20},${waist - 12} L${sh + 24},${waist + 16} L${sh + 4},${waist + 22} Z`, cls: 'trim' })
  // head
  const hy = -h + head
  paths.push({ d: `M${s},${hy - head} a${head},${head} 0 1,0 0.1,0 Z`, cls: 'head' })
  const hat = {
    bonnet: `M${-head - 3 + s},${hy + 2} C${-head - 4 + s},${hy - head * 1.9} ${head + 4 + s},${hy - head * 1.9} ${head + 3 + s},${hy + 2} C${head + s},${hy - head * 0.6} ${-head + s},${hy - head * 0.6} ${-head - 3 + s},${hy + 2} Z`,
    cap: `M${-head - 2 + s},${hy - head * 0.35} C${-head + s},${hy - head * 1.5} ${head + s},${hy - head * 1.5} ${head + 1 + s},${hy - head * 0.4} L${head + 9 + s},${hy - head * 0.25} L${head + 8 + s},${hy - head * 0.05} Z`,
    top: `M${-head - 7 + s},${hy - head * 0.75} L${head + 7 + s},${hy - head * 0.75} L${head + 7 + s},${hy - head * 0.95} L${head + 1 + s},${hy - head * 0.95} L${head + 2 + s},${hy - head * 2.7} L${-head - 2 + s},${hy - head * 2.7} L${-head - 1 + s},${hy - head * 0.95} L${-head - 7 + s},${hy - head * 0.95} Z`,
    flat: `M${-head - 9 + s},${hy - head * 0.7} L${head + 9 + s},${hy - head * 0.7} L${head + 4 + s},${hy - head * 1.25} L${-head - 4 + s},${hy - head * 1.25} Z`,
    trilby: `M${-head - 8 + s},${hy - head * 0.6} L${head + 8 + s},${hy - head * 0.6} L${head + 3 + s},${hy - head * 0.85} C${head + 2 + s},${hy - head * 1.9} ${-head - 2 + s},${hy - head * 1.9} ${-head - 3 + s},${hy - head * 0.85} Z`,
    hard: `M${-head - 6 + s},${hy - head * 0.4} L${head + 6 + s},${hy - head * 0.4} C${head + 3 + s},${hy - head * 1.9} ${-head - 3 + s},${hy - head * 1.9} ${-head - 6 + s},${hy - head * 0.4} Z`,
    scarf: `M${-head - 2 + s},${hy + head * 0.5} C${-head - 4 + s},${hy - head * 1.7} ${head + 4 + s},${hy - head * 1.7} ${head + 2 + s},${hy + head * 0.5} L${head * 0.4 + s},${hy + head * 1.2} L${-head * 0.4 + s},${hy + head * 1.2} Z`,
    hood: `M${-head - 4 + s},${hy + head * 0.9} C${-head - 6 + s},${hy - head * 1.8} ${head + 6 + s},${hy - head * 1.8} ${head + 4 + s},${hy + head * 0.9} L${head * 0.6 + s},${hy + head * 0.4} C${head * 0.7 + s},${hy - head * 0.8} ${-head * 0.7 + s},${hy - head * 0.8} ${-head * 0.6 + s},${hy + head * 0.4} Z`,
    bow: `M${s - 2},${hy - head * 0.9} l-10,-6 l0,12 Z M${s + 2},${hy - head * 0.9} l10,-6 l0,12 Z`,
    none: ''
  }[L.hat]
  if (hat) paths.push({ d: hat, cls: L.hat === 'bow' ? 'trim' : 'hat' })
  if (L.phones) paths.push({ d: `M${-head - 3 + s},${hy} a3,5 0 1,0 0.1,0 Z M${head + 3 + s},${hy} a3,5 0 1,0 0.1,0 Z`, cls: 'trim' })
  return { paths, h }
}

// The void cat, sitting, facing left. About 74 units tall, feet at y = 0.
export const CAT_PATH = 'M-4,0 C-30,0 -36,-14 -34,-30 C-32,-46 -24,-54 -20,-60 L-25,-77 L-14,-66 C-10,-68 -4,-68 0,-66 L10,-78 L8,-60 C12,-52 12,-42 8,-34 C16,-28 22,-16 20,-4 C28,-6 34,-14 36,-24 C38,-30 44,-28 42,-20 C40,-8 30,2 14,2 Z'
export const CAT_EYES = [{ x: -16, y: -56 }, { x: -6, y: -56 }]

export const ICONS = {
  acorn: [
    { d: 'M-8,-2 C-9,9 -3,14 0,14 C3,14 9,9 8,-2 Z', cls: 'i-acorn' },
    { d: 'M-10,-2 C-10,-10 10,-10 10,-2 Z M-1,-9 L0,-14 L2,-9 Z', cls: 'i-cup' }
  ],
  sixpence: [
    { d: 'M-12,2 C-12,-7 -5,-12 1,-11 L4,1 L-2,12 C-8,11 -12,8 -12,2 Z', cls: 'i-silver' },
    { d: 'M1,-11 C8,-10 12,-5 12,1 C12,7 6,12 -2,12 L4,1 Z', cls: 'i-silver-dark' },
    { d: 'M1,-11 L4,1 L-2,12', cls: 'i-crease' },
    { d: 'M-8,-2 C-7,-6 -4,-8 -1,-8', cls: 'i-glint' }
  ],
  letter: [
    { d: 'M-14,-9 L14,-9 L14,9 L-14,9 Z', cls: 'i-paper' },
    { d: 'M-14,-9 L0,2 L14,-9', cls: 'i-fold' },
    { d: 'M-3,1 a3.5,3.5 0 1,0 0.1,0 Z', cls: 'i-seal' }
  ],
  marble: [
    { d: 'M-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0 Z', cls: 'i-marble' },
    { d: 'M-6,4 C-2,-6 4,6 7,-3', cls: 'i-twist' },
    { d: 'M-5,-5 a2.6,2.6 0 1,0 0.1,0 Z', cls: 'i-hi' }
  ],
  fieldcard: [
    { d: 'M-13,-9 L13,-9 L13,9 L-13,9 Z', cls: 'i-card' },
    { d: 'M-9,-4 L9,-4 M-9,0 L9,0 M-9,4 L2,4', cls: 'i-lines' }
  ]
}
