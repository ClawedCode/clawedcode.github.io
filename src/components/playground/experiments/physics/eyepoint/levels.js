import { makeProp, CLEAR_RING } from './geometry'

// The evening, in order. Each commission names who must read the paint,
// who must not, what it says and what the carter has left you to work with.

export const PROLOGUE = {
  id: 'prologue',
  hour: 'late afternoon',
  sigil: 'visitor',
  pigment: { name: 'vermilion', color: '#d8361d', light: '#ff8a4c' },
  painter: { pos: [4.4, 1.35, 3.1], aim: [-1.6, 1.4, -5.2], fov: 64 },
  start: { pos: [-2.6, 2.6, 5.4] },
  lockAt: 0.86
}

export const COMMISSIONS = [
  {
    id: 'bench',
    numeral: 'I',
    title: 'the baker’s bench',
    hour: 'golden hour',
    client: 'the baker',
    letter: 'I sit on the bench by the stair every evening after the ovens. Paint me something whole to look at. Mind the arch: what goes through it goes into the sea.',
    sigil: 'rings',
    pigment: { name: 'ochre', color: '#e3961a', light: '#ffc35a' },
    seats: [{ id: 'baker', name: 'the baker', short: 'baker', pos: [-4.4, 1.2, 3.35], aim: [0.2, 1.9, -6.2], fov: 44, need: 0.96 }],
    watchers: [],
    coverage: 0.96,
    props: [['board', 'b1', 3.2, 4.6, 0], ['board', 'b2', 5.6, 4.6, 0], ['crate', 'c1', 7.4, 4.4, 0]],
    lesson: 'Paint only stays where something catches it. Move the boards into the arch, the window and the gaps until the rings are whole.'
  },
  {
    id: 'balcony',
    numeral: 'II',
    title: 'for the balcony only',
    hour: 'dusk',
    client: 'the widow on the balcony',
    letter: 'The watchman reads everything on these walls and repeats it at the tavern. I want an eye that only I can see from up here. To anyone at the foot of the stair it must be nonsense.',
    sigil: 'eye',
    pigment: { name: 'ultramarine', color: '#2a49c9', light: '#7f9bff' },
    seats: [{ id: 'widow', name: 'the widow', short: 'widow', pos: [9.3, 4.4, 0.4], aim: [-2.6, 2.4, -6.4], fov: 40, need: 0.85 }],
    watchers: [{ id: 'watch', name: 'the watchman', short: 'watchman', pos: [-5.6, 1.6, 5.4], aim: [0.6, 2.1, -6.2], fov: 84, max: 0.42, walk: [[0, 0, 0], [1.3, 0, -0.3], [2.6, 0, -0.6], [-0.8, 0, -1.6]] }],
    coverage: 0.85,
    props: [['board', 'b3', -0.8, 5.4, 0], ['board', 'b4', 1.4, 5.4, 0], ['slat', 's1', 3.4, 5.4, 0], ['screen', 'w2', 4.4, 3.9, 0], ['screen', 'w3', 5.6, 1.2, Math.PI / 2]],
    lesson: 'A flat wall reads from anywhere. Break the eye across things at different depths and it only closes up from the one place it was painted from. A board stood in his way hides nothing: he walks the lane. And the baker is still on the bench.'
  },
  {
    id: 'table',
    numeral: 'III',
    title: 'two at the table',
    hour: 'blue hour',
    client: 'two at the corner table',
    letter: 'We sit side by side at the table by the lamp. Write it so both of us can read it, and the night watch coming down the stair cannot.',
    sigil: 'word',
    pigment: { name: 'viridian', color: '#138a5c', light: '#5fe0a8' },
    wordPrompt: 'what should it say? five to seven letters; a short word sits on one wall, where the stair can read it',
    seats: [
      { id: 'left', name: 'the one on the left', short: 'left seat', pos: [-0.55, 1.15, 5.15], aim: [0.2, 1.9, -6.2], fov: 46, need: 0.85 },
      { id: 'right', name: 'the one on the right', short: 'right seat', pos: [0.45, 1.15, 5.2], aim: [0.2, 1.9, -6.2], fov: 46, need: 0.45 }
    ],
    watchers: [
      // one watch coming down the stair: judged from every step of his round, top to foot
      { id: 'stair', name: 'the night watch on the stair', short: 'stair watch', pos: [-8.0, 3.25, 3.6], aim: [0.5, 1.8, -6.2], fov: 84, max: 0.32, walk: [[-1.6, 1.4, -3.3], [-1.6, 1.4, -1.9], [0, 0, 0], [-0.8, 0.7, 0], [2.2, -1.65, 0.1], [3.6, -1.65, -0.5], [5.0, -1.65, -1.1]] }
    ],
    coverage: 0.82,
    props: [['screen', 'w1', 6.0, 4.9, 0], ['board', 'b5', 7.4, 2.6, Math.PI / 2], ['slat', 's2', 4.0, 2.4, 0], ['board', 'b6', 7.4, -0.4, Math.PI / 2], ['slat', 's3', 4.6, 1.2, Math.PI / 2]],
    lesson: 'Both seats sit close; the stair looks from far to the side. Stagger the paint just enough that a near eye can still join it up and a far one cannot. Keep the baker and the widow reading theirs.'
  }
]

// a watcher is not a fixed point: he walks his round, and reads whatever he can
// from the best spot on it. Every point keeps looking where he looks.
export const walkOf = w => (w.walk || [[0, 0, 0]]).map(([dx, dy, dz]) => ({
  ...w,
  pos: [w.pos[0] + dx, w.pos[1] + dy, w.pos[2] + dz],
  aim: [w.aim[0] + dx * 0.3, w.aim[1], w.aim[2] + dz * 0.3]
}))

// a sealed client still sits there: their message may fade this much, no more
export const KEEP = 0.12

export const propsFor = c => c.props.map(([shape, id, x, z, ry]) => makeProp(shape, id, x, z, ry))

// nobody wants a board in their face; the balcony is up out of reach
export const zonesFor = c => [...c.seats, ...c.watchers]
  .filter(e => e.pos[1] < 2.2)
  .map(e => ({ x: e.pos[0], z: e.pos[2], r: CLEAR_RING, who: e.name }))
