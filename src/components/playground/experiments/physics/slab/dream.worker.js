/**
 * slab.season() — the dreaming thread.
 * Re-runs the whole winter (both dreams when the cat has two) off the main
 * thread and hands back the strata as transferable arrays.
 */

import { runDream } from './sim.js'
import { WINTERS } from './winters.js'

self.onmessage = (event) => {
  const { id, winter, plan } = event.data || {}
  const w = WINTERS.find((x) => x.id === winter)
  if (!w) return
  const dreams = runDream(w, plan)
  const transfer = []
  for (const d of dreams) {
    for (const s of d.strata) transfer.push(s.offsets.buffer, s.data.buffer)
  }
  self.postMessage({ id, winter, dreams }, transfer)
}
