import {
  SCENE_WGSL, JFA_SEED_WGSL, JFA_STEP_WGSL, CASCADE_WGSL, INTEGRATE_WGSL, SAMPLE_WGSL, DISPLAY_WGSL
} from './shaders'

export const SCENE_W = 400
export const SCENE_H = 500
export const MAX_LAMPS = 8
export const MAX_PROBES = 16
const BASE_INTERVAL = 1
const FLOAT = 'rgba16float'

export class GIUnavailableError extends Error {}

// Cascades needed for the top interval to reach across the room diagonal.
export const cascadeLevels = (w = SCENE_W, h = SCENE_H, base = BASE_INTERVAL) => {
  const diag = Math.hypot(w, h)
  let n = 1
  while ((base * (4 ** n - 1)) / 3 < diag) n += 1
  return n
}

export const cascadeInfo = (level, base = BASE_INTERVAL) => ({
  level,
  spacing: 2 ** level,
  rays: 4 ** (level + 1),
  start: (base * (4 ** level - 1)) / 3,
  end: (base * (4 ** (level + 1) - 1)) / 3
})

const probeCount = (size, level) => Math.ceil(size / 2 ** level)

/**
 * Owns every GPU resource for one canvas. Work is demand-driven: the GI passes
 * run only while `pending` frames remain (a change, then a few frames for the
 * bounce light to settle), and the display pass only when something changed.
 */
export async function createGI (canvas, { onLost } = {}) {
  if (!navigator.gpu) throw new GIUnavailableError('This browser has no WebGPU.')
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' })
  if (!adapter) throw new GIUnavailableError('WebGPU is present but no GPU adapter was offered.')
  const device = await adapter.requestDevice()
  let alive = true
  device.lost.then(info => {
    if (alive && info.reason !== 'destroyed') onLost?.(info.message || 'GPU device lost')
  })

  const context = canvas.getContext('webgpu')
  const format = navigator.gpu.getPreferredCanvasFormat()
  context.configure({ device, format, alphaMode: 'opaque' })

  const W = SCENE_W
  const H = SCENE_H
  const levels = cascadeLevels(W, H)
  let cw = 0
  let ch = 0
  for (let l = 0; l < levels; l++) {
    cw = Math.max(cw, probeCount(W, l) * 2 ** (l + 1))
    ch = Math.max(ch, probeCount(H, l) * 2 ** (l + 1))
  }

  const SAMPLED = GPUTextureUsage.TEXTURE_BINDING
  const STORE = GPUTextureUsage.STORAGE_BINDING
  const tex = (w, h, fmt, usage) => device.createTexture({ size: [w, h], format: fmt, usage })
  const paintTex = tex(W, H, 'rgba8unorm', SAMPLED | GPUTextureUsage.COPY_DST)
  const sceneTex = tex(W, H, FLOAT, SAMPLED | STORE)
  const irrTex = tex(W, H, FLOAT, SAMPLED | STORE)
  const seed = [tex(W, H, FLOAT, SAMPLED | STORE), tex(W, H, FLOAT, SAMPLED | STORE)]
  const cascades = [tex(cw, ch, FLOAT, SAMPLED | STORE), tex(cw, ch, FLOAT, SAMPLED | STORE)]
  const debugTex = tex(cw, ch, FLOAT, SAMPLED | STORE)

  const buffer = (size, usage) => device.createBuffer({ size, usage })
  const UNIFORM = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  const lampBuf = buffer(MAX_LAMPS * 32, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  const probeBuf = buffer(MAX_PROBES * 16, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST)
  const sampleOut = buffer(MAX_PROBES * 16, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC)
  const readBuf = buffer(MAX_PROBES * 16, GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST)
  const sceneU = buffer(16, UNIFORM)
  const integrateU = buffer(16, UNIFORM)
  const sampleU = buffer(16, UNIFORM)
  const displayU = buffer(48, UNIFORM)

  const compute = code => device.createComputePipeline({
    layout: 'auto',
    compute: { module: device.createShaderModule({ code }), entryPoint: 'main' }
  })
  const scenePipe = compute(SCENE_WGSL)
  const seedPipe = compute(JFA_SEED_WGSL)
  const stepPipe = compute(JFA_STEP_WGSL)
  const cascadePipe = compute(CASCADE_WGSL)
  const integratePipe = compute(INTEGRATE_WGSL)
  const samplePipe = compute(SAMPLE_WGSL)
  const displayModule = device.createShaderModule({ code: DISPLAY_WGSL })
  const displayPipe = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: displayModule, entryPoint: 'vs' },
    fragment: { module: displayModule, entryPoint: 'fs', targets: [{ format }] },
    primitive: { topology: 'triangle-list' }
  })
  const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' })

  const group = (pipe, entries, index = 0) => device.createBindGroup({
    layout: pipe.getBindGroupLayout(index),
    entries: entries.map((resource, binding) => ({
      binding,
      resource: resource instanceof GPUTexture ? resource.createView() : resource
    }))
  })

  const sceneGroup = group(scenePipe, [{ buffer: sceneU }, { buffer: lampBuf }, paintTex, irrTex, sceneTex])

  // Jump flood: seed, then steps of 256, 128 … 1, ping-ponging the seed pair.
  const seedU = buffer(16, UNIFORM)
  device.queue.writeBuffer(seedU, 0, new Int32Array([W, H, 0, 0]))
  const seedGroup = group(seedPipe, [{ buffer: seedU }, sceneTex, seed[0]])
  const jfaSteps = []
  let from = 0
  for (let step = 2 ** Math.ceil(Math.log2(Math.max(W, H))) / 2; step >= 1; step /= 2) {
    const u = buffer(16, UNIFORM)
    device.queue.writeBuffer(u, 0, new Int32Array([W, H, step, 0]))
    jfaSteps.push(group(stepPipe, [{ buffer: u }, seed[from], seed[1 - from]]))
    from = 1 - from
  }
  const seedFinal = seed[from]

  const cascadeU = []
  const cascadeGroups = []
  for (let l = 0; l < levels; l++) {
    const u = buffer(32, UNIFORM)
    cascadeU.push(u)
    const out = cascades[l % 2]
    const upper = cascades[(l + 1) % 2]
    cascadeGroups.push(group(cascadePipe, [{ buffer: u }, sceneTex, seedFinal, upper, out, debugTex]))
  }
  const writeCascadeParams = debugLevel => {
    for (let l = 0; l < levels; l++) {
      const data = new ArrayBuffer(32)
      const u32 = new Uint32Array(data)
      const f32 = new Float32Array(data)
      u32[0] = W; u32[1] = H; u32[2] = l; u32[3] = levels
      f32[4] = BASE_INTERVAL
      u32[5] = l === debugLevel ? 1 : 0
      device.queue.writeBuffer(cascadeU[l], 0, data)
    }
  }
  device.queue.writeBuffer(integrateU, 0, new Uint32Array([W, H, 0, 0]))
  const integrateGroup = group(integratePipe, [{ buffer: integrateU }, cascades[0], sceneTex, irrTex])
  const sampleGroup = group(samplePipe, [{ buffer: sampleU }, { buffer: probeBuf }, irrTex, { buffer: sampleOut }])
  const displayGroup = group(displayPipe, [{ buffer: displayU }, irrTex, sceneTex, paintTex, debugTex, sampler, { buffer: lampBuf }])

  const state = {
    lampCount: 0,
    probeCount: 0,
    bounce: 1.3,
    exposure: 2.0,
    xray: 0,
    debugLevel: -1,
    pending: 0,
    displayDirty: true,
    reading: false,
    measureStale: false,
    time: 0
  }
  writeCascadeParams(-1)
  const writeSceneParams = () => {
    const data = new ArrayBuffer(16)
    new Uint32Array(data, 0, 3).set([W, H, state.lampCount])
    new Float32Array(data, 12, 1)[0] = state.bounce
    device.queue.writeBuffer(sceneU, 0, data)
  }
  writeSceneParams()

  let latest = null
  let onMeasure = null

  const groups = n => Math.ceil(n / 8)

  function encodeGI (encoder) {
    const pass = encoder.beginComputePass()
    pass.setPipeline(scenePipe)
    pass.setBindGroup(0, sceneGroup)
    pass.dispatchWorkgroups(groups(W), groups(H))
    pass.setPipeline(seedPipe)
    pass.setBindGroup(0, seedGroup)
    pass.dispatchWorkgroups(groups(W), groups(H))
    pass.setPipeline(stepPipe)
    for (const g of jfaSteps) {
      pass.setBindGroup(0, g)
      pass.dispatchWorkgroups(groups(W), groups(H))
    }
    pass.setPipeline(cascadePipe)
    for (let l = levels - 1; l >= 0; l--) {
      pass.setBindGroup(0, cascadeGroups[l])
      pass.dispatchWorkgroups(groups(probeCount(W, l) * 2 ** (l + 1)), groups(probeCount(H, l) * 2 ** (l + 1)))
    }
    pass.setPipeline(integratePipe)
    pass.setBindGroup(0, integrateGroup)
    pass.dispatchWorkgroups(groups(W), groups(H))
    pass.end()
  }

  function encodeSample (encoder) {
    const pass = encoder.beginComputePass()
    pass.setPipeline(samplePipe)
    pass.setBindGroup(0, sampleGroup)
    pass.dispatchWorkgroups(1)
    pass.end()
    encoder.copyBufferToBuffer(sampleOut, 0, readBuf, 0, state.probeCount * 16)
  }

  function encodeDisplay (encoder) {
    const data = new ArrayBuffer(48)
    const f = new Float32Array(data)
    const u = new Uint32Array(data)
    f[0] = W; f[1] = H
    u[2] = state.debugLevel >= 0 && state.xray > 0 ? 1 : 0
    u[3] = state.lampCount
    f[4] = state.exposure; f[5] = state.bounce; f[6] = state.xray; f[7] = state.time
    if (state.debugLevel >= 0) {
      const l = state.debugLevel
      f[10] = (probeCount(W, l) * 2 ** (l + 1)) / cw
      f[11] = (probeCount(H, l) * 2 ** (l + 1)) / ch
    }
    device.queue.writeBuffer(displayU, 0, data)
    const pass = encoder.beginRenderPass({
      colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }]
    })
    pass.setPipeline(displayPipe)
    pass.setBindGroup(0, displayGroup)
    pass.draw(3)
    pass.end()
  }

  return {
    levels,
    width: W,
    height: H,
    raysPerFrame: Array.from({ length: levels }, (_, l) => probeCount(W, l) * probeCount(H, l) * 4 ** (l + 1)).reduce((a, b) => a + b, 0),
    adapterInfo: adapter.info || {},
    setPaint (rgba) {
      device.queue.writeTexture({ texture: paintTex }, rgba, { bytesPerRow: W * 4 }, [W, H])
      this.invalidate()
    },
    setLamps (list) {
      const data = new Float32Array(MAX_LAMPS * 8)
      list.slice(0, MAX_LAMPS).forEach((l, i) => {
        data.set([l.x, l.y, l.radius, l.on === false ? 0 : 1, l.color[0] * l.power, l.color[1] * l.power, l.color[2] * l.power, 1], i * 8)
      })
      device.queue.writeBuffer(lampBuf, 0, data)
      state.lampCount = Math.min(list.length, MAX_LAMPS)
      writeSceneParams()
      this.invalidate()
    },
    setProbes (list) {
      const data = new Float32Array(MAX_PROBES * 4)
      list.slice(0, MAX_PROBES).forEach((p, i) => data.set([p.x, p.y, p.radius || 8, 0], i * 4))
      device.queue.writeBuffer(probeBuf, 0, data)
      state.probeCount = Math.min(list.length, MAX_PROBES)
      device.queue.writeBuffer(sampleU, 0, new Uint32Array([state.probeCount, 0, 0, 0]))
      this.invalidate()
    },
    setView ({ xray, debugLevel, exposure, bounce } = {}) {
      if (xray !== undefined) state.xray = xray
      if (exposure !== undefined) state.exposure = exposure
      if (bounce !== undefined && bounce !== state.bounce) {
        state.bounce = bounce
        writeSceneParams()
        this.invalidate()
      }
      if (debugLevel !== undefined && debugLevel !== state.debugLevel) {
        state.debugLevel = debugLevel
        writeCascadeParams(debugLevel)
        this.invalidate(1)
      }
      state.displayDirty = true
    },
    onMeasure (fn) { onMeasure = fn },
    latest () { return latest },
    // Bounce light needs a few frames to propagate through repeated wall
    // re-emission; 24 frames settles even a chalk-lined room.
    invalidate (frames = 24) {
      state.pending = Math.max(state.pending, frames)
      state.displayDirty = true
    },
    get busy () { return state.pending > 0 },
    frame (time = 0) {
      if (!alive) return false
      state.time = time % 1000
      const runGI = state.pending > 0
      if (runGI) state.measureStale = true
      const read = state.measureStale && state.probeCount > 0 && !state.reading
      if (!runGI && !state.displayDirty && !read) return false
      const encoder = device.createCommandEncoder()
      if (runGI) {
        encodeGI(encoder)
        state.pending -= 1
      }
      if (read) {
        encodeSample(encoder)
        state.measureStale = false
      }
      if (runGI || state.displayDirty) encodeDisplay(encoder)
      device.queue.submit([encoder.finish()])
      state.displayDirty = false
      if (read) {
        state.reading = true
        const count = state.probeCount
        readBuf.mapAsync(GPUMapMode.READ).then(() => {
          if (!alive) return
          const values = new Float32Array(readBuf.getMappedRange().slice(0, count * 16))
          readBuf.unmap()
          state.reading = false
          latest = Array.from({ length: count }, (_, i) => [values[i * 4], values[i * 4 + 1], values[i * 4 + 2]])
          onMeasure?.(latest, state.pending === 0 && !state.measureStale)
        }).catch(() => { state.reading = false })
      }
      return true
    },
    destroy () {
      alive = false
      try { context.unconfigure() } catch { /* canvas already gone */ }
      device.destroy()
    }
  }
}
