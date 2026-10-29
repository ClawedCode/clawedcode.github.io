// The night's post. Every letter is authored in sheet space. Front text is laid
// out as you would read the front; back text is laid out as you would read the
// back (mirrored left-right in sheet space), so the renderer and the visibility
// engine agree on exactly where each word sits.

const CHAR = 0.45

const layout = (text, region, opts) => {
  const { size, lead, face, role, sheetW, ink } = opts
  const words = []
  let x = region.x
  let y = region.y + size
  const space = size * 0.32
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    const brk = raw === '/'
    if (brk) { x = region.x; y += lead; continue }
    const w = Math.max(size * 0.32, raw.length * size * CHAR)
    if (x + w > region.x + region.w && x > region.x) { x = region.x; y += lead }
    const vx = x
    const box = { text: raw, size, face, role, ink, vx, vy: y, w, h: size * 1.02 }
    // Sheet-space box used for visibility.
    box.x = face === 'front' ? vx : sheetW - vx - w
    box.y = y - size * 0.8
    words.push(box)
    x += w + space
  }
  return words
}

const rect = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]]

const build = spec => {
  const W = Math.max(...spec.poly.map(q => q[0]))
  const words = []
  for (const block of spec.blocks) {
    words.push(...layout(block.text, block.region, {
      size: block.size || 10,
      lead: block.lead || 13,
      face: block.face,
      role: block.role || 'body',
      ink: block.ink || (block.face === 'front' ? 'ink' : 'sepia'),
      sheetW: W
    }))
  }
  words.forEach((w, i) => { w.id = i })
  return {
    ...spec,
    sheet: { poly: spec.poly, w: W, h: Math.max(...spec.poly.map(q => q[1])) },
    words,
    marks: spec.marks || []
  }
}

export const LETTERS = [
  build({
    id: 'moth',
    from: 'the moth, third floor',
    called: 'the moth on the third floor',
    to: 'the porch lamp, no. 9 gull lane',
    hole: 'G',
    note: 'A square note, ink right to the edges on the inside. The address is on the back. Hole G takes a quarter fold.',
    poly: rect(220, 220),
    slot: { w: 128, h: 128 },
    thick: 8,
    blocks: [
      { face: 'front', region: { x: 16, y: 16, w: 190 }, size: 11, lead: 15, text: 'dear lamp, / i have circled you every night since june. i know you are only a bulb on a wire. i do not care. / leave the porch on tonight and i will stop pretending i am just passing by. / yours in tight spirals, / the moth (third floor)' },
      { face: 'back', role: 'address', region: { x: 14, y: 40, w: 90 }, size: 11, lead: 15, text: 'the porch lamp / no. 9 gull lane' }
    ]
  }),
  build({
    id: 'ferry',
    from: 'the night ferryman',
    called: 'the night ferryman',
    to: 'the harbour board, quay office',
    hole: 'K',
    note: 'A long sheet with pencilled fold ticks. Something is written on the back of one end. Hole K is narrow.',
    poly: rect(300, 124),
    slot: { w: 112, h: 138 },
    thick: 8,
    marks: [[100, 0], [200, 0], [100, 124], [200, 124]],
    blocks: [
      { face: 'front', region: { x: 14, y: 12, w: 276 }, size: 11, lead: 15, text: 'to the board, / i am handing back the oars. the river asked me something in the fog last tuesday and i answered it. you will want a ferryman who does not answer. / the lamps are trimmed, the ropes are dry. / goodbye, / e. varga' },
      { face: 'back', region: { x: 10, y: 16, w: 84 }, size: 10, lead: 13, text: 'p.s. the boat is fine. it is me. do not sell her to the eel men.' },
      { face: 'back', role: 'address', region: { x: 112, y: 46, w: 80 }, size: 11, lead: 15, text: 'harbour board / quay office' }
    ]
  }),
  build({
    id: 'cat',
    from: 'a cat',
    called: 'a certain cat',
    to: 'itself, next spring',
    hole: 'D',
    note: 'A note to the future, written to the edges. The address sits in the very middle of the back, where no quarter fold can keep it whole.',
    poly: rect(200, 200),
    slot: { w: 146, h: 146 },
    thick: 8,
    marks: [[100, 100]],
    blocks: [
      { face: 'front', region: { x: 12, y: 12, w: 178 }, size: 10.5, lead: 14, text: 'note to me, / when you read this the warm spot will have moved to the other side of the kitchen. go and find it. / you were right about the blue door. you were wrong about the dog. / do not trust the boy with the bag of shrimp. he will try again.' },
      { face: 'back', role: 'address', region: { x: 74, y: 82, w: 60 }, size: 11, lead: 15, text: 'me, / next / spring' }
    ]
  }),
  build({
    id: 'keeper',
    from: 'the lighthouse keeper',
    called: 'the lighthouse keeper',
    to: 'her sister, over the hill',
    hole: 'B',
    note: 'She wrote on every inch of the back and left one clean margin on the front. The address is on the back of the bottom strip, under her pencil tick.',
    poly: rect(216, 270),
    slot: { w: 112, h: 112 },
    thick: 8,
    marks: [[0, 216], [216, 216], [0, 162], [216, 162]],
    blocks: [
      { face: 'front', region: { x: 12, y: 12, w: 86 }, size: 10.5, lead: 14, text: 'dear ruth, / the lamp turned on by itself again. third time this month, always at ten past two. i have stopped telling the inspector.' },
      { face: 'front', region: { x: 12, y: 170, w: 192 }, size: 10.5, lead: 14, text: 'i think it is waiting for a ship it remembers. i have started waiting with it.' },
      { face: 'back', region: { x: 12, y: 12, w: 192 }, size: 10.5, lead: 14, text: 'do not tell mother. she will say it is the old trouble again, and maybe it is. the gulls have gone quiet. the tins are full. i sleep in the afternoons and keep the watch myself. / come at the turn of the year if the road holds. bring the green wool and the good knife. / r.' },
      { face: 'back', role: 'address', region: { x: 14, y: 226, w: 90 }, size: 11, lead: 15, text: 'ruth / over the hill' }
    ]
  }),
  build({
    id: 'postmaster',
    from: 'unsigned',
    called: 'an unsigned hand',
    to: 'the postmaster himself',
    hole: 'A',
    note: 'A torn half-sheet with no name on it, addressed to the man who will read the morning column. Hole A is the smallest on the wall.',
    poly: [[0, 0], [236, 0], [236, 150], [184, 196], [0, 196]],
    slot: { w: 72, h: 104 },
    thick: 9,
    marks: [[118, 0], [118, 196]],
    blocks: [
      { face: 'front', region: { x: 14, y: 12, w: 208 }, size: 10.5, lead: 14, text: 'sir, / everyone knows who writes the sorting-table column. everyone knows you open the letters to get it. / tonight the clerk folds them shut. / we are all going to stop pretending we do not read it.' },
      { face: 'back', role: 'address', region: { x: 182, y: 22, w: 50 }, size: 10, lead: 14, text: 'the / postmaster / by hand' }
    ]
  })
]

export const LETTER_COUNT = LETTERS.length
