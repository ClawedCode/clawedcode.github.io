/**
 * escapement.garden() — authoritative escapement thread.
 *
 * The worker owns clock truth. It integrates at a fixed timestep, posts compact
 * numeric frames, and every 500ms runs a 26-second lookahead probe so the main
 * thread can draw a predictive timeline without ever paying for the search.
 */

import { frameOf, probe, stepGarden } from './garden-core'

let sim = null
let input = { winding: false }
let timer = null
let last = 0
let probeAt = 0
let frameInterval = 16

const loop = () => {
  timer = null
  if (!sim) return

  const now = performance.now()
  const elapsed = Math.min((now - last) / 1000, 0.25)
  last = now

  const events = stepGarden(sim, elapsed, input)
  const payload = { type: 'frame', frame: frameOf(sim), events }

  if (now - probeAt > 500) {
    probeAt = now
    payload.probe = probe(sim)
  }

  self.postMessage(payload)
  timer = setTimeout(loop, frameInterval)
}

const start = () => {
  if (timer !== null) clearTimeout(timer)
  last = performance.now()
  probeAt = 0
  timer = setTimeout(loop, frameInterval)
}

self.onmessage = (event) => {
  const message = event.data

  if (message.type === 'seed') {
    sim = message.sim
    frameInterval = message.frameInterval || 16
    start()
    return
  }

  if (message.type === 'input') {
    input = { ...input, ...message.input }
    if (sim && typeof message.input.gate === 'number') sim.gate = message.input.gate
    return
  }

  if (message.type === 'cadence') {
    frameInterval = message.frameInterval || 16
    return
  }

  if (message.type === 'stop') {
    if (timer !== null) clearTimeout(timer)
    timer = null
    sim = null
  }
}
