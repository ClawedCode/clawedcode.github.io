// The pool as an instrument: a 2D wave equation over the water surface, and
// sunlight refracted through that surface onto the terraced floor.
//
// Light is traced, not painted: every surface sample bends the sun ray by the
// local slope (Snell, n = 1.333), drops it to the floor beneath, and splats it.
// Where ripples curve the surface the rays crowd together into caustics, and
// how sharply they crowd depends on the depth the floor sits at.
import { N, DX, HALF, POOL, depthAt, MASK_N } from './well'

export const STEPS_PER_SECOND = 80
const C2 = 0.24 // (c dt / dx)^2, stable well below 0.5
export const WAVE_SPEED = Math.sqrt(C2) * DX * STEPS_PER_SECOND // world units per second
const ETA = 1 / 1.333
export const SLOPE_GAIN = 1.1 // world slope per height unit per world unit
// Paraxial focal depth of a crest of curvature k: rays tilt by (1 - 1/n) of
// the scaled slope, so they meet at 1 / (LENS_POWER * k) below the surface.
export const LENS_POWER = (1 - ETA) * SLOPE_GAIN
export const focalDepth = k => (k > 1e-6 ? 1 / (LENS_POWER * k) : Infinity)
// Wind ripples at incommensurate bearings, each sized to focus a few strides
// down on its own, so together they lace the floor without overpowering a pot.
const BREEZE = [[0.62, 0.31], [0.47, 1.83], [0.79, 2.97], [0.53, 4.12], [0.69, 5.27], [0.41, 0.97]].map(([lambda, angle], n) => {
  const k = 2 * Math.PI / lambda
  return { k, dx: Math.cos(angle), dz: Math.sin(angle), phase: n * 1.7, omega: 2 * Math.PI * Math.sqrt(1.6 / lambda) * 0.6, amp: 1 / (LENS_POWER * k * k * 1.6) / 3.2 }
})

// airLoss: per step, so ripples fade within a few strides of their pot.
// rays: traced rays per cell per axis (3 is crisp, 2 is cheaper for phones).
export function createOptics({ airLoss = 0.012, rays = 2 } = {}) {
  const SUPER = rays
  const RAYS_PER_CELL = SUPER * SUPER
  let cur = new Float32Array(N * N)
  let prev = new Float32Array(N * N)
  const damp = new Float32Array(N * N)
  const light = new Float32Array(N * N)
  const scratch = new Float32Array(N * N)
  const gx = new Float32Array(N * N)
  const gz = new Float32Array(N * N)
  const floorDepth = new Float32Array(N * N)
  // breeze: fine travelling ripples that texture the light. They live only in
  // the traced light and the drawn surface; the pots' lenses are read without them.
  const cgx = new Float32Array(N * N)
  const cgz = new Float32Array(N * N)
  const sx = new Float32Array(N * N)
  const sz = new Float32Array(N * N)
  const bcx = BREEZE.map(() => new Float32Array(N))
  const bsx = BREEZE.map(() => new Float32Array(N))
  const bcz = BREEZE.map(() => new Float32Array(N))
  const bsz = BREEZE.map(() => new Float32Array(N))

  // The stepped walls soak most of what reaches them, so lattices stay legible.
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const edge = Math.min(i, j, N - 1 - i, N - 1 - j)
      const sponge = edge < 6 ? (6 - edge) / 6 : 0
      damp[j * N + i] = 1 - airLoss - 0.03 * sponge * sponge
      floorDepth[j * N + i] = depthAt(-HALF + (i + 0.5) * DX, -HALF + (j + 0.5) * DX)
    }
  }

  function step(count = 1) {
    for (let s = 0; s < count; s++) {
      const next = prev
      for (let j = 0; j < N; j++) {
        const row = j * N
        const up = j > 0 ? row - N : row
        const dn = j < N - 1 ? row + N : row
        for (let i = 0; i < N; i++) {
          const k = row + i
          const c = cur[k]
          const l = i > 0 ? cur[k - 1] : c
          const r = i < N - 1 ? cur[k + 1] : c
          const lap = l + r + cur[up + i] + cur[dn + i] - 4 * c
          next[k] = (2 * c - prev[k] + C2 * lap) * damp[k]
        }
      }
      prev = cur
      cur = next
    }
  }

  // A drop: a narrow dimple pushed into the surface at rest.
  function impulse(x, z, amp, radius = 0.16) {
    const ci = (x + HALF) / DX - 0.5
    const cj = (z + HALF) / DX - 0.5
    const rc = radius / DX
    const reach = Math.ceil(rc * 3)
    for (let j = Math.max(0, Math.floor(cj - reach)); j <= Math.min(N - 1, Math.ceil(cj + reach)); j++) {
      for (let i = Math.max(0, Math.floor(ci - reach)); i <= Math.min(N - 1, Math.ceil(ci + reach)); i++) {
        const d2 = ((i - ci) ** 2 + (j - cj) ** 2) / (rc * rc)
        const v = -amp * Math.exp(-d2 * 0.5)
        cur[j * N + i] += v
        prev[j * N + i] += v
      }
    }
  }

  function gradients() {
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const k = j * N + i
        const l = i > 0 ? cur[k - 1] : cur[k]
        const r = i < N - 1 ? cur[k + 1] : cur[k]
        const u = j > 0 ? cur[k - N] : cur[k]
        const d = j < N - 1 ? cur[k + N] : cur[k]
        gx[k] = (r - l) / (2 * DX)
        gz[k] = (d - u) / (2 * DX)
      }
    }
  }

  const sampleMask = (mask, x, z) => {
    const u = Math.min(MASK_N - 1, Math.max(0, Math.floor((x + HALF) / POOL * MASK_N)))
    const v = Math.min(MASK_N - 1, Math.max(0, Math.floor((z + HALF) / POOL * MASK_N)))
    return mask[v * MASK_N + u]
  }

  // Trace the sun through the surface. sun points toward the sun.
  let lightReady = false
  function caustics(sun, mask) {
    lightReady = true
    gradients()
    light.fill(0)
    const dx0 = -sun.x
    const dy0 = -sun.y
    const dz0 = -sun.z
    for (let k = 0; k < N * N; k++) {
      sx[k] = gx[k] + cgx[k]
      sz[k] = gz[k] + cgz[k]
    }
    const S = N * SUPER
    const sd = DX / SUPER
    for (let sj = 0; sj < S; sj++) {
      const z = -HALF + (sj + 0.5) * sd
      const cj = Math.min(N - 1, Math.floor(sj / SUPER))
      const sv = Math.min(N - 1.001, Math.max(0, (z + HALF) / DX - 0.5))
      const sj0 = Math.floor(sv)
      const bz = sv - sj0
      for (let si = 0; si < S; si++) {
        const x = -HALF + (si + 0.5) * sd
        const w = sampleMask(mask, x, z)
        if (w <= 0) continue
        const ci = Math.min(N - 1, Math.floor(si / SUPER))
        const k = cj * N + ci
        // surface slope, interpolated between cells so every ray sees its own tilt
        const su = Math.min(N - 1.001, Math.max(0, (x + HALF) / DX - 0.5))
        const si0 = Math.floor(su)
        const bx = su - si0
        const k0 = sj0 * N + si0
        const w00 = (1 - bx) * (1 - bz)
        const w10 = bx * (1 - bz)
        const w01 = (1 - bx) * bz
        const w11 = bx * bz
        let nx = -(sx[k0] * w00 + sx[k0 + 1] * w10 + sx[k0 + N] * w01 + sx[k0 + N + 1] * w11) * SLOPE_GAIN
        let ny = 1
        let nz = -(sz[k0] * w00 + sz[k0 + 1] * w10 + sz[k0 + N] * w01 + sz[k0 + N + 1] * w11) * SLOPE_GAIN
        const nl = 1 / Math.sqrt(nx * nx + 1 + nz * nz)
        nx *= nl; ny *= nl; nz *= nl
        const cosi = -(nx * dx0 + ny * dy0 + nz * dz0)
        const kk = 1 - ETA * ETA * (1 - cosi * cosi)
        if (kk <= 0) continue
        const f = ETA * cosi - Math.sqrt(kk)
        const tx = ETA * dx0 + f * nx
        const ty = ETA * dy0 + f * ny
        const tz = ETA * dz0 + f * nz
        if (ty >= -1e-4) continue
        let depth = floorDepth[k]
        let lx = x + tx * depth / -ty
        let lz = z + tz * depth / -ty
        const li = Math.floor((lx + HALF) / DX)
        const lj = Math.floor((lz + HALF) / DX)
        if (li >= 0 && lj >= 0 && li < N && lj < N) {
          const d2 = floorDepth[lj * N + li]
          if (d2 !== depth) {
            depth = d2
            lx = x + tx * depth / -ty
            lz = z + tz * depth / -ty
          }
        }
        // bilinear splat onto the floor grid
        const fu = (lx + HALF) / DX - 0.5
        const fv = (lz + HALF) / DX - 0.5
        const i0 = Math.floor(fu)
        const j0 = Math.floor(fv)
        if (i0 < -1 || j0 < -1 || i0 >= N || j0 >= N) continue
        const ax = fu - i0
        const az = fv - j0
        if (i0 >= 0 && j0 >= 0) light[j0 * N + i0] += w * (1 - ax) * (1 - az)
        if (i0 + 1 < N && j0 >= 0) light[j0 * N + i0 + 1] += w * ax * (1 - az)
        if (i0 >= 0 && j0 + 1 < N) light[(j0 + 1) * N + i0] += w * (1 - ax) * az
        if (i0 + 1 < N && j0 + 1 < N) light[(j0 + 1) * N + i0 + 1] += w * ax * az
      }
    }
    // a light [1 6 1] blur both ways; normalise so flat lit water reads 1.
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const k = j * N + i
        const l = i > 0 ? light[k - 1] : light[k]
        const r = i < N - 1 ? light[k + 1] : light[k]
        scratch[k] = (l + 6 * light[k] + r) * 0.125
      }
    }
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const k = j * N + i
        const u = j > 0 ? scratch[k - N] : scratch[k]
        const d = j < N - 1 ? scratch[k + N] : scratch[k]
        light[k] = (u + 6 * scratch[k] + d) * 0.125 / RAYS_PER_CELL
      }
    }
    return light
  }

  // Mean traced light over a disc of the floor, relative to open sun.
  function meanLight(x, z, radius) {
    const ci = (x + HALF) / DX - 0.5
    const cj = (z + HALF) / DX - 0.5
    const rc = radius / DX
    let sum = 0
    let count = 0
    for (let j = Math.max(0, Math.floor(cj - rc)); j <= Math.min(N - 1, Math.ceil(cj + rc)); j++) {
      for (let i = Math.max(0, Math.floor(ci - rc)); i <= Math.min(N - 1, Math.ceil(ci + rc)); i++) {
        if ((i - ci) ** 2 + (j - cj) ** 2 > rc * rc) continue
        sum += light[j * N + i]
        count++
      }
    }
    return count ? sum / count : 0
  }

  // The strongest converging curvature (a crest's -laplacian) over a disc of
  // the surface, in height units per world unit squared.
  function crest(x, z, radius) {
    const ci = (x + HALF) / DX - 0.5
    const cj = (z + HALF) / DX - 0.5
    const rc = radius / DX
    // a wide stencil, so grid-scale chatter cannot pose as a lens
    const S = 3
    let best = 0
    for (let j = Math.max(S, Math.floor(cj - rc)); j <= Math.min(N - 1 - S, Math.ceil(cj + rc)); j++) {
      for (let i = Math.max(S, Math.floor(ci - rc)); i <= Math.min(N - 1 - S, Math.ceil(ci + rc)); i++) {
        if ((i - ci) ** 2 + (j - cj) ** 2 > rc * rc) continue
        const k = j * N + i
        const lap = cur[k - S] + cur[k + S] + cur[k - S * N] + cur[k + S * N] - 4 * cur[k]
        if (-lap > best) best = -lap
      }
    }
    return best / (S * S * DX * DX)
  }

  function breeze(t, level) {
    if (level <= 0) { cgx.fill(0); cgz.fill(0); return }
    BREEZE.forEach((w, n) => {
      for (let i = 0; i < N; i++) {
        const p = -HALF + (i + 0.5) * DX
        const ax = w.k * p * w.dx - w.omega * t + w.phase
        const az = w.k * p * w.dz
        bcx[n][i] = Math.cos(ax)
        bsx[n][i] = Math.sin(ax)
        bcz[n][i] = Math.cos(az)
        bsz[n][i] = Math.sin(az)
      }
    })
    cgx.fill(0)
    cgz.fill(0)
    BREEZE.forEach((w, n) => {
      const a = w.amp * w.k * level
      const ax = a * w.dx
      const az = a * w.dz
      const cx = bcx[n]
      const sx = bsx[n]
      const cz = bcz[n]
      const sz = bsz[n]
      for (let j = 0; j < N; j++) {
        const row = j * N
        const czj = cz[j]
        const szj = sz[j]
        for (let i = 0; i < N; i++) {
          const c = cx[i] * czj - sx[i] * szj
          cgx[row + i] += ax * c
          cgz[row + i] += az * c
        }
      }
    })
  }

  function reset() {
    lightReady = false
    cur.fill(0)
    prev.fill(0)
    light.fill(0)
  }

  return {
    step,
    impulse,
    caustics,
    crest,
    meanLight,
    get lightReady() { return lightReady },
    breeze,
    reset,
    breezeX: cgx,
    breezeZ: cgz,
    get height() { return cur },
    light,
    floorDepth
  }
}
