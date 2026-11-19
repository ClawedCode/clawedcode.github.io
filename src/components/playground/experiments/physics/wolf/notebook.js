// The notebook: page one charts where you bowed and what the string did there
// (a Schelleng map built from your own strokes); page two is the body's response,
// drawn in when you knock on the bridge.
import { admittance, bodyPeaks, noteOf, D_MIN, D_MAX } from './strings.js'

export const MAP_COLS = 14
export const MAP_ROWS = 11
// x: bow distance from the bridge as a fraction of the vibrating length (log)
const BMIN = 0.014
const BMAX = 0.24
// y: weight per unit speed, N per (m/s) (log)
const RMIN = 0.6
const RMAX = 90

export const INK = '#2b2118'
export const REGIME_INK = {
  speak: '#1f3b3a',
  whistle: '#5f8fb8',
  crunch: '#b2452b',
  wolf: '#6d4a8e'
}

export function mapCell(beta, ratio) {
  const cx = Math.floor(((Math.log(beta) - Math.log(BMIN)) / (Math.log(BMAX) - Math.log(BMIN))) * MAP_COLS)
  const cy = Math.floor(((Math.log(ratio) - Math.log(RMIN)) / (Math.log(RMAX) - Math.log(RMIN))) * MAP_ROWS)
  if (cx < 0 || cy < 0 || cx >= MAP_COLS || cy >= MAP_ROWS) return -1
  return cy * MAP_COLS + cx
}

export const freshMap = () => Array.from({ length: MAP_COLS * MAP_ROWS }, () => ({ speak: 0, whistle: 0, crunch: 0 }))

function paper(ctx, w, h) {
  ctx.fillStyle = '#efe5cf'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(120, 140, 170, 0.18)'
  ctx.lineWidth = 1
  for (let y = 14; y < h; y += 14) {
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(w, y + 0.5)
    ctx.stroke()
  }
}

export function drawMap(ctx, w, h, map, live, trail) {
  paper(ctx, w, h)
  const m = { l: 34, r: 8, t: 10, b: 26 }
  const gw = w - m.l - m.r
  const gh = h - m.t - m.b
  const cw = gw / MAP_COLS
  const ch = gh / MAP_ROWS
  ctx.font = '600 10px Georgia, serif'
  // cells: what you heard there, as hatching density by majority
  for (let cy = 0; cy < MAP_ROWS; cy++) {
    for (let cx = 0; cx < MAP_COLS; cx++) {
      const c = map[cy * MAP_COLS + cx]
      const total = c.speak + c.whistle + c.crunch
      if (total < 0.08) continue
      let best = 'speak'
      if (c.whistle > c[best]) best = 'whistle'
      if (c.crunch > c[best]) best = 'crunch'
      const x = m.l + cx * cw
      const y = m.t + (MAP_ROWS - 1 - cy) * ch
      const a = Math.min(1, 0.25 + total * 0.6)
      ctx.globalAlpha = a * 0.85
      ctx.fillStyle = REGIME_INK[best]
      if (best === 'speak') {
        ctx.fillRect(x + 1.5, y + 1.5, cw - 3, ch - 3)
      } else {
        // whistle: fine single hatching; crunch: heavy cross-hatching
        ctx.save()
        ctx.beginPath()
        ctx.rect(x + 1, y + 1, cw - 2, ch - 2)
        ctx.clip()
        ctx.strokeStyle = REGIME_INK[best]
        ctx.lineWidth = best === 'crunch' ? 1.6 : 1.2
        ctx.beginPath()
        for (let k = -ch; k < cw + ch; k += best === 'crunch' ? 4 : 5) {
          ctx.moveTo(x + k, y + ch)
          ctx.lineTo(x + k + ch, y)
          if (best === 'crunch') {
            ctx.moveTo(x + k, y)
            ctx.lineTo(x + k + ch, y + ch)
          }
        }
        ctx.stroke()
        ctx.restore()
      }
    }
  }
  ctx.globalAlpha = 1
  // frame and axes
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.2
  ctx.strokeRect(m.l + 0.5, m.t + 0.5, gw, gh)
  ctx.fillStyle = INK
  ctx.textAlign = 'center'
  const tight = w < 220
  if (tight) ctx.font = '600 9px Georgia, serif'
  ctx.textAlign = 'left'
  ctx.fillText(tight ? '← bridge' : 'bridge', m.l, h - 8)
  ctx.textAlign = 'right'
  ctx.fillText(tight ? 'board →' : 'fingerboard →', w - m.r, h - 8)
  ctx.textAlign = 'center'
  ctx.save()
  ctx.translate(11, m.t + gh / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('weight ÷ speed →', 0, 0)
  ctx.restore()
  const toX = beta => m.l + ((Math.log(beta) - Math.log(BMIN)) / (Math.log(BMAX) - Math.log(BMIN))) * gw
  const toY = r => m.t + gh - ((Math.log(r) - Math.log(RMIN)) / (Math.log(RMAX) - Math.log(RMIN))) * gh
  // where the bow can physically go on this string, as a pencilled band
  if (live) {
    const x0 = toX(Math.max(BMIN, D_MIN / live.len))
    const x1 = toX(Math.min(BMAX, D_MAX / live.len))
    ctx.strokeStyle = 'rgba(43,33,24,0.35)'
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(x0, m.t + gh)
    ctx.lineTo(x0, m.t + gh - 6)
    ctx.moveTo(x1, m.t + gh)
    ctx.lineTo(x1, m.t + gh - 6)
    ctx.stroke()
    ctx.setLineDash([])
  }
  // trail of the pen
  if (trail.length > 1) {
    ctx.lineWidth = 1.6
    for (let i = 1; i < trail.length; i++) {
      const p = trail[i - 1]
      const q = trail[i]
      ctx.strokeStyle = REGIME_INK[q.regime] || INK
      ctx.globalAlpha = i / trail.length
      ctx.beginPath()
      ctx.moveTo(toX(p.beta), toY(p.ratio))
      ctx.lineTo(toX(q.beta), toY(q.ratio))
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
  if (live && live.ratio > 0) {
    const x = Math.min(m.l + gw, Math.max(m.l, toX(live.beta)))
    const y = Math.min(m.t + gh, Math.max(m.t, toY(live.ratio)))
    ctx.fillStyle = REGIME_INK[live.regime] || INK
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#efe5cf'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}

// page two: |Y(f)| with the D-string notes ruled in. reveal 0..1 is the pen drawing it
export function drawBody(ctx, w, h, collar, reveal, wanted, stringIdx) {
  paper(ctx, w, h)
  const m = { l: 10, r: 10, t: 16, b: 30 }
  const gw = w - m.l - m.r
  const gh = h - m.t - m.b
  const F0 = 135
  const F1 = 235
  const toX = f => m.l + ((Math.log(f) - Math.log(F0)) / (Math.log(F1) - Math.log(F0))) * gw
  ctx.font = '600 10px Georgia, serif'
  ctx.textAlign = 'center'
  // the notes this string can play here
  for (let semi = 0; semi <= 9; semi++) {
    const n = noteOf(stringIdx, semi)
    if (n.f0 < F0 || n.f0 > F1) continue
    const x = toX(n.f0)
    const want = wanted && wanted.includes(semi)
    ctx.strokeStyle = want ? 'rgba(43,33,24,0.7)' : 'rgba(43,33,24,0.2)'
    ctx.lineWidth = want ? 1.4 : 1
    ctx.beginPath()
    ctx.moveTo(x, m.t)
    ctx.lineTo(x, m.t + gh)
    ctx.stroke()
    ctx.fillStyle = want ? INK : 'rgba(43,33,24,0.45)'
    // on a narrow page only the notes that matter get a name
    if (w >= 230 || want) ctx.fillText(n.name, x, h - 12)
  }
  if (reveal <= 0) {
    ctx.fillStyle = 'rgba(43,33,24,0.65)'
    ctx.font = 'italic 13px Georgia, serif'
    ctx.fillText('knock on the bridge to hear the body', w / 2, m.t + gh / 2)
    return
  }
  const top = admittance(174, null)
  ctx.strokeStyle = REGIME_INK.wolf
  ctx.lineWidth = 2
  ctx.beginPath()
  const steps = 220
  for (let i = 0; i <= steps * reveal; i++) {
    const f = F0 * (F1 / F0) ** (i / steps)
    const y = m.t + gh - Math.min(1, admittance(f, collar) / top) * gh * 0.92
    if (i === 0) ctx.moveTo(toX(f), y)
    else ctx.lineTo(toX(f), y)
  }
  ctx.stroke()
  if (reveal >= 1) {
    ctx.fillStyle = REGIME_INK.wolf
    ctx.font = 'italic 11px Georgia, serif'
    for (const p of bodyPeaks(collar)) {
      if (p.f < F0 || p.f > F1 || p.rel < 0.2) continue
      const x = toX(p.f)
      const y = m.t + gh - Math.min(1, p.rel) * gh * 0.92
      ctx.fillText(p.rel > 0.6 ? 'wolf' : 'pup', x, Math.max(m.t + 8, y - 6))
    }
  }
}
