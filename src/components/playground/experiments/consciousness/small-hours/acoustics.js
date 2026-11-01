// Two linear pressure fields over the floor plan, stepped with a 2D finite-difference
// wave equation. `alarm` carries everything that can wake a sleeper (paws, leaps, doors,
// barking). `cover` carries the house's own voice (clock, fridge, rain, the passing car).
// They share the walls, so a chime and a footstep bend through the same doorway.
import { PLAN, W, H, isDoor } from './house.js'

export const RES = 4
export const SW = W * RES
export const SH = H * RES
const N = SW * SH
const C2 = 0.24
const AIR = 0.995
const WALL = 0.8
const DOOR_SHUT = 0.9
const EAR_TAU = 0.35
const COVER_TAU = 1.1

const makeField = () => ({ p: new Float32Array(N), q: new Float32Array(N), r: new Float32Array(N), heat: new Float32Array(N) })

export function createAcoustics() {
  const damp = new Float32Array(N)
  const fields = { alarm: makeField(), cover: makeField() }
  let ears = []
  let exposure = 0

  function setDoors(doors) {
    for (let j = 0; j < SH; j++) {
      const cy = Math.floor(j / RES)
      for (let i = 0; i < SW; i++) {
        const cx = Math.floor(i / RES)
        const ch = PLAN[cy][cx]
        let d = AIR
        if (ch === '#') d = WALL
        else if (isDoor(ch) && !doors[ch]) d = DOOR_SHUT
        if (i === 0 || j === 0 || i === SW - 1 || j === SH - 1) d = 0
        damp[j * SW + i] = d
      }
    }
  }

  // Inject a soft pressure bump. Writing it into both time levels makes a ring that leaves
  // in every direction at once.
  function impulse(field, wx, wy, amp, radius = 0.85) {
    const f = fields[field]
    const ci = wx * RES - 0.5
    const cj = wy * RES - 0.5
    const r = Math.ceil(radius * 2.5)
    const inv = 1 / (2 * radius * radius)
    for (let j = Math.max(1, Math.floor(cj) - r); j <= Math.min(SH - 2, Math.ceil(cj) + r); j++) {
      for (let i = Math.max(1, Math.floor(ci) - r); i <= Math.min(SW - 2, Math.ceil(ci) + r); i++) {
        const k = j * SW + i
        if (damp[k] < 0.95) continue
        const v = amp * Math.exp(-((i - ci) ** 2 + (j - cj) ** 2) * inv)
        f.p[k] += v
        f.q[k] += v
      }
    }
  }

  // A continuous source (the fridge's hum) driven per step.
  function drive(field, wx, wy, value) {
    const f = fields[field]
    const i = Math.round(wx * RES - 0.5)
    const j = Math.round(wy * RES - 0.5)
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) f.p[(j + dj) * SW + i + di] += value * (di || dj ? 0.5 : 1)
  }

  function stepField(f, exposeHeat) {
    const { p, q, r } = f
    for (let j = 1; j < SH - 1; j++) {
      const row = j * SW
      for (let i = 1; i < SW - 1; i++) {
        const k = row + i
        const lap = p[k - 1] + p[k + 1] + p[k - SW] + p[k + SW] - 4 * p[k]
        r[k] = (2 * p[k] - q[k] + C2 * lap) * damp[k]
      }
    }
    f.r = q
    f.q = p
    f.p = r
    if (exposeHeat) {
      const heat = f.heat
      const np = f.p
      for (let k = 0; k < N; k++) heat[k] += np[k] * np[k]
    }
  }

  const sampleEar = (p, ear) => {
    let s = 0
    for (const k of ear.cells) s += p[k] * p[k]
    return s / ear.cells.length
  }

  function setEars(list) {
    ears = list.map(([wx, wy]) => {
      const ci = Math.round(wx * RES - 0.5)
      const cj = Math.round(wy * RES - 0.5)
      const cells = []
      for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) cells.push((cj + dj) * SW + ci + di)
      return { cells, alarm: 0, cover: 0, peak: 0 }
    })
  }

  // Advance `steps` substeps covering dt seconds. Returns smoothed ear energies.
  function step(steps, dt, hum) {
    const sub = dt / steps
    for (let s = 0; s < steps; s++) {
      if (hum) hum(s / steps, sub, drive)
      stepField(fields.alarm, exposure > 0)
      stepField(fields.cover, false)
      for (const ear of ears) {
        const a = sampleEar(fields.alarm.p, ear)
        const c = sampleEar(fields.cover.p, ear)
        ear.alarm += (a - ear.alarm) * Math.min(1, sub / EAR_TAU)
        ear.cover += (c - ear.cover) * Math.min(1, sub / COVER_TAU)
        ear.peak = Math.max(ear.peak * 0.995, ear.alarm)
      }
    }
    return ears
  }

  function clear() {
    for (const f of Object.values(fields)) { f.p.fill(0); f.q.fill(0); f.r.fill(0); f.heat.fill(0) }
    for (const ear of ears) { ear.alarm = 0; ear.cover = 0; ear.peak = 0 }
  }

  return {
    fields,
    damp,
    setDoors,
    setEars,
    impulse,
    step,
    clear,
    expose(on) { exposure = on ? 1 : 0 },
    get ears() { return ears }
  }
}
