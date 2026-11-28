import { SCENE_W, SCENE_H } from './gi'

export const W = SCENE_W
export const H = SCENE_H

// Albedo is what a painted wall gives back. The bounce pass multiplies the
// light reaching a wall face by it, so chalk throws light round corners and
// soot swallows it.
export const PIGMENTS = {
  soot: { id: 'soot', key: '1', label: 'Soot', albedo: [0.035, 0.03, 0.03], swatch: '#221c18', note: 'drinks light, throws clean shadow' },
  chalk: { id: 'chalk', key: '2', label: 'Chalk', albedo: [0.9, 0.87, 0.82], swatch: '#ece6da', note: 'throws light back round corners' },
  rose: { id: 'rose', key: '3', label: 'Rose', albedo: [0.92, 0.34, 0.22], swatch: '#e2654c', note: 'gives back only the warm part' },
  tide: { id: 'tide', key: '4', label: 'Tide', albedo: [0.12, 0.5, 0.92], swatch: '#3d8fe0', note: 'gives back only the cool part' }
}
export const PIGMENT_ORDER = ['soot', 'chalk', 'rose', 'tide']
const PIGMENT_INDEX = Object.fromEntries(PIGMENT_ORDER.map((id, i) => [id, i + 1]))

export const LAMP_KINDS = {
  amber: { id: 'amber', label: 'Amber', color: [1, 0.6, 0.26], power: 22, swatch: '#ffb15a' },
  moon: { id: 'moon', label: 'Moon', color: [0.36, 0.62, 1], power: 22, swatch: '#86b4ff' },
  rose: { id: 'rose', label: 'Ember', color: [1, 0.32, 0.22], power: 22, swatch: '#ff7a5c' },
  white: { id: 'white', label: 'Bulb', color: [1, 0.94, 0.86], power: 20, swatch: '#fff2dc' }
}
export const LAMP_RADIUS = 7
export const BRUSH = 6
const KEEP_OUT = 17

// Fixed architecture: stone (never erasable), described in scene pixels.
const stone = (x, y, w, h, pigment = 'stone') => ({ x, y, w, h, pigment })
const STONE_ALBEDO = [0.2, 0.17, 0.15]

export const ROOMS = [
  {
    id: 'first-patch',
    title: 'the first patch',
    brief: 'one lamp, one cat, and a hush asleep behind the shelf. light pools wherever nothing stops it. drag the lamp until the cat\'s ring closes, and keep the hush in the dark.',
    lesson: 'Radiance travels in straight lines until something stops it. The shelf is an occluder, and its shadow edge goes soft because the lamp is a disc rather than a point.',
    walls: [stone(40, 70, 130, 34), stone(282, 190, 22, 170), stone(0, 0, 400, 8), stone(0, 492, 400, 8), stone(0, 0, 8, 500), stone(392, 0, 8, 500)],
    lamps: [{ kind: 'amber', x: 330, y: 150 }],
    pigments: [],
    ink: 0,
    creatures: [
      { id: 'cat-a', kind: 'cat', name: 'Tarn', x: 120, y: 360, want: 'warm', need: 22, fur: '#cfa27a' },
      { id: 'hush', kind: 'hush', x: 345, y: 300, limit: 6 }
    ]
  },
  {
    id: 'soot-wall',
    title: 'a wall of soot',
    brief: 'the hush sleeps an arm\'s length from the cat, on open floor. there\'s only one lamp. paint soot between them and the shadow will do the rest. you have a little ink.',
    lesson: 'Painted pixels become occluders on the next frame. The distance field is rebuilt by jump flooding in nine passes, so a new wall changes every ray at once.',
    walls: [stone(0, 0, 400, 8), stone(0, 492, 400, 8), stone(0, 0, 8, 500), stone(392, 0, 8, 500), stone(186, 40, 28, 60), stone(186, 400, 28, 60)],
    lamps: [{ kind: 'amber', x: 200, y: 250 }],
    pigments: ['soot'],
    ink: 2600,
    creatures: [
      { id: 'cat-a', kind: 'cat', name: 'Wisp', x: 110, y: 250, want: 'warm', need: 24, fur: '#9a8f86' },
      { id: 'hush', kind: 'hush', x: 300, y: 250, limit: 7 }
    ]
  },
  {
    id: 'round-the-corner',
    title: 'round the corner',
    brief: 'the lamp has to stay in the cellar, behind the partition. no straight line reaches the cat. paint chalk where the light lands, and let it throw the light on for you.',
    lesson: 'Walls re-emit the light that reached them on the previous frame, scaled by their albedo. Run that every frame and one bounce becomes many. Chalk gives back most of it and soot almost none.',
    walls: [
      stone(0, 0, 400, 8), stone(0, 492, 400, 8), stone(0, 0, 8, 500), stone(392, 0, 8, 500),
      stone(8, 236, 300, 16),
      stone(8, 120, 120, 14), stone(128, 120, 14, 64)
    ],
    lamps: [{ kind: 'amber', x: 250, y: 400 }],
    lampPower: 1.6,
    lampZone: { x: 20, y: 270, w: 360, h: 210 },
    pigments: ['chalk', 'soot'],
    ink: 3200,
    creatures: [
      { id: 'cat-a', kind: 'cat', name: 'Ossa', x: 62, y: 195, want: 'warm', need: 7, fur: '#e2c8a4' },
      { id: 'hush', kind: 'hush', x: 60, y: 60, limit: 8 }
    ]
  },
  {
    id: 'two-moods',
    title: 'two moods',
    brief: 'Ember wants warm light and Sleet wants moonlight, and each one sulks in the other\'s colour. both lamps have to sit on the shelf between them. keep the pools apart, and don\'t wake the hush upstairs.',
    lesson: 'Every ray carries colour, and the cats read the mix. Where amber and moonlight overlap, neither cat sleeps. Rose and tide walls bounce only part of the spectrum, so a wall can also tint the light it throws.',
    walls: [stone(0, 0, 400, 8), stone(0, 492, 400, 8), stone(0, 0, 8, 500), stone(392, 0, 8, 500), stone(140, 230, 120, 14)],
    lamps: [{ kind: 'amber', x: 222, y: 445 }, { kind: 'moon', x: 178, y: 445 }],
    lampZone: { x: 175, y: 405, w: 50, h: 75 },
    pigments: ['soot', 'chalk', 'rose', 'tide'],
    ink: 2600,
    creatures: [
      { id: 'cat-a', kind: 'cat', name: 'Ember', x: 105, y: 400, want: 'warm', need: 20, fur: '#d9874e' },
      { id: 'cat-b', kind: 'cat', name: 'Sleet', x: 295, y: 400, want: 'cool', need: 20, fur: '#b9c4cf' },
      { id: 'hush', kind: 'hush', x: 200, y: 175, limit: 1.4 }
    ]
  },
  {
    id: 'studio',
    title: 'the studio',
    studio: true,
    brief: 'every lamp, every pigment, all the ink you want. no hush. build a room the cats would never leave.',
    lesson: 'Radiance cascades trade spatial and angular resolution between levels: each level has half the probes per axis and four times the directions. The whole room is solved again on every change.',
    walls: [
      stone(0, 0, 400, 8), stone(0, 492, 400, 8), stone(0, 0, 8, 500), stone(392, 0, 8, 500),
      stone(170, 150, 60, 16), stone(60, 300, 16, 80), stone(300, 250, 50, 16), { x: 220, y: 330, w: 70, h: 12, pigment: 'chalk' }
    ],
    lamps: [
      { kind: 'amber', x: 110, y: 430 }, { kind: 'moon', x: 330, y: 90 }, { kind: 'rose', x: 200, y: 110 },
      { kind: 'white', x: 340, y: 440 }
    ],
    lampPower: 0.4,
    pigments: ['soot', 'chalk', 'rose', 'tide'],
    ink: Infinity,
    creatures: [
      { id: 'cat-a', kind: 'cat', name: 'Tarn', x: 130, y: 170, want: 'warm', need: 22, fur: '#cfa27a' },
      { id: 'cat-b', kind: 'cat', name: 'Sleet', x: 280, y: 200, want: 'cool', need: 16, fur: '#b9c4cf' },
      { id: 'cat-c', kind: 'cat', name: 'Ember', x: 200, y: 380, want: 'warm', need: 20, fur: '#d9874e' }
    ]
  }
]

export const PUZZLE_COUNT = ROOMS.filter(r => !r.studio).length

export function buildFixedLayer (room) {
  const rgba = new Uint8Array(W * H * 4)
  const solid = new Uint8Array(W * H)
  for (const wall of room.walls) {
    const albedo = wall.pigment === 'stone' ? STONE_ALBEDO : PIGMENTS[wall.pigment].albedo
    const x0 = Math.max(0, Math.floor(wall.x))
    const y0 = Math.max(0, Math.floor(wall.y))
    const x1 = Math.min(W, Math.ceil(wall.x + wall.w))
    const y1 = Math.min(H, Math.ceil(wall.y + wall.h))
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = y * W + x
        solid[i] = 1
        rgba.set([albedo[0] * 255, albedo[1] * 255, albedo[2] * 255, 255], i * 4)
      }
    }
  }
  return { rgba, solid }
}

// The keep-out mask stops paint from burying a creature: a hush bricked up
// inside a wall would be "dark" without any light being shaped.
export function buildKeepOut (room) {
  const mask = new Uint8Array(W * H)
  for (const c of room.creatures) {
    const r = KEEP_OUT
    for (let y = Math.max(0, c.y - r); y < Math.min(H, c.y + r); y++) {
      for (let x = Math.max(0, c.x - r); x < Math.min(W, c.x + r); x++) {
        if ((x - c.x) ** 2 + (y - c.y) ** 2 <= r * r) mask[y * W + x] = 1
      }
    }
  }
  return mask
}

// Stamp one brush disc into the user layer (pigment indices). Returns the change
// in painted pixels so ink is spent and refunded exactly.
export function stamp (user, fixedSolid, keepOut, x, y, pigmentId, inkLeft) {
  const value = pigmentId ? PIGMENT_INDEX[pigmentId] : 0
  let delta = 0
  const r = BRUSH
  for (let py = Math.max(0, Math.floor(y - r)); py < Math.min(H, Math.ceil(y + r)); py++) {
    for (let px = Math.max(0, Math.floor(x - r)); px < Math.min(W, Math.ceil(x + r)); px++) {
      if ((px + 0.5 - x) ** 2 + (py + 0.5 - y) ** 2 > r * r) continue
      const i = py * W + px
      if (fixedSolid[i] || keepOut[i]) continue
      const was = user[i]
      if (value && !was) {
        if (inkLeft - delta <= 0) continue
        delta += 1
      } else if (!value && was) {
        delta -= 1
      }
      user[i] = value
    }
  }
  return delta
}

export function composite (fixed, user, out) {
  out.set(fixed.rgba)
  for (let i = 0; i < user.length; i++) {
    const v = user[i]
    if (!v || fixed.solid[i]) continue
    const a = PIGMENTS[PIGMENT_ORDER[v - 1]].albedo
    const o = i * 4
    out[o] = a[0] * 255
    out[o + 1] = a[1] * 255
    out[o + 2] = a[2] * 255
    out[o + 3] = 255
  }
  return out
}

export const luxOf = ([r, g, b]) => 100 * (0.2126 * r + 0.7152 * g + 0.0722 * b)

// A cat reads light as warm or cool only when one end of the spectrum clearly
// dominates. With amber and moonlight, the other lamp may contribute less than
// about 45% before the light reads as mixed.
const TINT = 1.6
export function tintOf ([r, , b]) {
  if (r > b * TINT) return 'warm'
  if (b > r * TINT) return 'cool'
  return 'mixed'
}

// What a creature thinks of the light it is sitting in.
export function judge (creature, rgb) {
  const lux = rgb ? luxOf(rgb) : 0
  const tint = rgb ? tintOf(rgb) : 'mixed'
  if (creature.kind === 'hush') {
    const ratio = lux / creature.limit
    return { lux, tint, ratio, ok: ratio <= 1, mood: ratio <= 0.5 ? 'deep asleep' : ratio <= 1 ? 'stirring' : 'awake' }
  }
  const ratio = lux / creature.need
  const tintOk = tint === creature.want
  const ok = ratio >= 1 && tintOk
  let mood = 'asleep in the patch'
  if (ratio < 0.35) mood = 'cold'
  else if (ratio < 1) mood = 'almost'
  else if (!tintOk) mood = creature.want === 'warm' ? 'too blue' : 'too warm'
  return { lux, tint, ratio, ok, mood }
}

export const clampToZone = (room, x, y) => {
  const z = room.lampZone || { x: 12, y: 12, w: W - 24, h: H - 24 }
  return [Math.min(z.x + z.w, Math.max(z.x, x)), Math.min(z.y + z.h, Math.max(z.y, y))]
}
