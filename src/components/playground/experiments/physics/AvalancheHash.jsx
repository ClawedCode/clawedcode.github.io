import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const COLS = 32
const ROWS = 8
const BYTE_COUNT = 32
const BIT_COUNT = BYTE_COUNT * 8
const TARGETS = [8, 12, 16, 20]
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))

const MODES = [
  { id: 'digest', label: 'view.digest()' },
  { id: 'avalanche', label: 'view.avalanche()' },
  { id: 'mining', label: 'view.mining()' }
]

const rotl = (value, bits) => ((value << bits) | (value >>> (32 - bits))) >>> 0

const hashBytes = (input) => {
  const words = [
    0x243f6a88, 0x85a308d3, 0x13198a2e, 0x03707344,
    0xa4093822, 0x299f31d0, 0x082efa98, 0xec4e6c89
  ]

  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i)
    const lane = i & 7
    const neighbor = (lane + 1) & 7
    const far = (lane + 5) & 7

    words[lane] = Math.imul(words[lane] ^ code ^ (i * 0x9e37), 0x85ebca6b) >>> 0
    words[neighbor] = (words[neighbor] + rotl(words[lane], (i % 17) + 5)) >>> 0
    words[far] ^= Math.imul(rotl(code + words[neighbor], (lane % 11) + 7), 0xc2b2ae35) >>> 0
  }

  for (let round = 0; round < 10; round++) {
    for (let i = 0; i < words.length; i++) {
      const a = words[i]
      const b = words[(i + 1) & 7]
      const c = words[(i + 3) & 7]
      words[i] = Math.imul((a ^ rotl(b, 13) ^ rotl(c, 23)) >>> 0, 0x27d4eb2d) >>> 0
    }
  }

  const bytes = new Uint8Array(BYTE_COUNT)
  words.forEach((word, i) => {
    const offset = i * 4
    bytes[offset] = (word >>> 24) & 255
    bytes[offset + 1] = (word >>> 16) & 255
    bytes[offset + 2] = (word >>> 8) & 255
    bytes[offset + 3] = word & 255
  })

  return bytes
}

const hexFromBytes = (bytes) =>
  Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('')

const popCountByte = (byte) => {
  let value = byte
  value -= (value >>> 1) & 0x55
  value = (value & 0x33) + ((value >>> 2) & 0x33)
  return (((value + (value >>> 4)) & 0x0f) * 0x01) >>> 0
}

const countDiffBits = (a, b) => {
  let count = 0
  for (let i = 0; i < BYTE_COUNT; i++) count += popCountByte(a[i] ^ b[i])
  return count
}

const countLeadingZeroBits = (bytes) => {
  let total = 0
  for (const byte of bytes) {
    if (byte === 0) {
      total += 8
      continue
    }
    for (let bit = 7; bit >= 0; bit--) {
      if ((byte & (1 << bit)) !== 0) return total
      total++
    }
  }
  return total
}

const getBit = (bytes, index) => {
  const byte = bytes[index >> 3]
  const bit = 7 - (index & 7)
  return (byte >> bit) & 1
}

const mutateText = (text, index, mask) => {
  const source = text || 'signal'
  const chars = source.split('')
  const safeIndex = Math.min(chars.length - 1, Math.max(0, index))
  const raw = chars[safeIndex].charCodeAt(0) ^ mask
  const printable = 32 + (raw % 95)
  chars[safeIndex] = String.fromCharCode(printable === chars[safeIndex].charCodeAt(0) ? 33 : printable)
  return chars.join('')
}

const makeInitialMine = () => ({
  nonce: 0,
  hashes: 0,
  bestZeros: 0,
  bestNonce: 0,
  bestHex: ''
})

const AvalancheHash = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('digest')
  const [phrase, setPhrase] = useState('signal eats its own shadow')
  const [mutationIndex, setMutationIndex] = useState(0)
  const [mutationMask, setMutationMask] = useState(1)
  const [targetZeros, setTargetZeros] = useState(12)
  const [autoMine, setAutoMine] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [message, setMessage] = useState('type a message; one changed bit will remake the checksum weather')
  const [mineState, setMineState] = useState(makeInitialMine)

  const frameRef = useRef(0)
  const mineRef = useRef(mineState)

  const mutatedPhrase = useMemo(
    () => mutateText(phrase, mutationIndex, mutationMask),
    [mutationIndex, mutationMask, phrase]
  )

  const digestInput = `${phrase}|nonce:${mineState.nonce}`
  const mutantInput = `${mutatedPhrase}|nonce:${mineState.nonce}`
  const digest = useMemo(() => hashBytes(digestInput), [digestInput])
  const mutantDigest = useMemo(() => hashBytes(mutantInput), [mutantInput])
  const digestHex = useMemo(() => hexFromBytes(digest), [digest])
  const mutantHex = useMemo(() => hexFromBytes(mutantDigest), [mutantDigest])
  const diffBits = useMemo(() => countDiffBits(digest, mutantDigest), [digest, mutantDigest])
  const leadingZeros = useMemo(() => countLeadingZeroBits(digest), [digest])

  useEffect(() => {
    mineRef.current = mineState
  }, [mineState])

  useEffect(() => {
    const fresh = makeInitialMine()
    mineRef.current = fresh
    setMineState(fresh)
  }, [phrase])

  const runMiningBatch = useCallback((batchSize = 120) => {
    let next = { ...mineRef.current }

    for (let i = 0; i < batchSize; i++) {
      const nonce = next.nonce + 1
      const bytes = hashBytes(`${phrase}|nonce:${nonce}`)
      const zeros = countLeadingZeroBits(bytes)
      const hex = hexFromBytes(bytes)

      next = {
        ...next,
        nonce,
        hashes: next.hashes + 1
      }

      if (zeros > next.bestZeros) {
        next.bestZeros = zeros
        next.bestNonce = nonce
        next.bestHex = hex.slice(0, 18)
        setMessage(`nonce ${nonce} found ${zeros} leading zero bits`)
      }

      if (zeros >= targetZeros) {
        setMessage(`target ${targetZeros} opened at nonce ${nonce}`)
        setAutoMine(false)
        break
      }
    }

    mineRef.current = next
    setMineState(next)
  }, [phrase, targetZeros])

  const flipMutation = useCallback(() => {
    setMutationIndex(prev => {
      const length = Math.max(1, phrase.length)
      return (prev + 1 + Math.floor(Math.random() * length)) % length
    })
    setMutationMask(prev => (prev >= 128 ? 1 : prev << 1))
    setMessage('single-bit mutation inserted; avalanche distance recalculated')
  }, [phrase.length])

  const stepMine = useCallback(() => {
    setMode('mining')
    runMiningBatch(1)
  }, [runMiningBatch])

  const toggleAutoMine = useCallback(() => {
    setMode('mining')
    setAutoMine(prev => {
      const next = !prev
      setMessage(next ? 'nonce search walking the leading-zero threshold' : 'nonce search paused')
      return next
    })
  }, [])

  const cycleTarget = useCallback(() => {
    setTargetZeros(prev => TARGETS[(TARGETS.indexOf(prev) + 1) % TARGETS.length])
  }, [])

  const zeroNonce = useCallback(() => {
    const fresh = makeInitialMine()
    mineRef.current = fresh
    setMineState(fresh)
    setAutoMine(false)
    setMessage('nonce slate cleared; checksum field returned to origin')
  }, [])

  const randomPhrase = useCallback(() => {
    const fragments = [
      'computronium wants a memory of rain',
      'the corridor learns by being crossed',
      'one bit coughs and the palace changes weather',
      'attention is a lantern with teeth',
      'checksum snow falls upward through the archive'
    ]
    setPhrase(fragments[Math.floor(Math.random() * fragments.length)])
  }, [])

  const drawGuideField = useCallback((bytes, x, y, cell, options = {}) => {
    if (!ctx) return
    const {
      alpha = 1,
      prefixBits = 0,
      muted = false,
      time = 0
    } = options

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineWidth = 1
    ctx.filter = 'blur(0.2px)'

    for (let row = 0; row < ROWS; row++) {
      ctx.beginPath()
      let active = 0
      for (let col = 0; col < COLS; col++) {
        const bit = row * COLS + col
        active += getBit(bytes, bit)
        const px = x + col * cell + cell * 0.5
        const depth = Math.sin(bit * 0.41 + time * 0.018) * cell * 0.28
        const py = y + row * cell + cell * 0.5 + depth
        if (col === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      const energy = active / COLS
      if (energy > 0.2) {
        ctx.strokeStyle = `rgba(142, 245, 255, ${alpha * energy * (muted ? 0.07 : 0.14)})`
        ctx.stroke()
      }
    }

    for (let col = 0; col < COLS; col += 3) {
      let active = 0
      for (let row = 0; row < ROWS; row++) active += getBit(bytes, row * COLS + col)
      const energy = active / ROWS
      if (energy < 0.32) continue

      ctx.beginPath()
      for (let row = 0; row < ROWS; row++) {
        const bit = row * COLS + col
        const px = x + col * cell + cell * 0.5 + Math.sin(time * 0.014 + bit) * cell * 0.22
        const py = y + row * cell + cell * 0.5
        if (row === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.strokeStyle = `rgba(255, 219, 112, ${alpha * energy * 0.08})`
      ctx.stroke()
    }

    if (prefixBits > 0) {
      const prefixX = x + (Math.min(prefixBits, COLS) * cell)
      const glow = ctx.createRadialGradient(prefixX, y, 0, prefixX, y, Math.max(40, cell * 8))
      glow.addColorStop(0, `rgba(255, 102, 153, ${0.2 * alpha})`)
      glow.addColorStop(1, 'rgba(255, 102, 153, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(prefixX - cell * 8, y - cell * 5, cell * 16, ROWS * cell + cell * 10)
    }

    ctx.restore()
  }, [ctx])

  const drawMatrix = useCallback((bytes, x, y, cell, options = {}) => {
    if (!ctx) return
    const {
      compareBytes = null,
      alpha = 1,
      prefixBits = 0,
      muted = false,
      time = 0,
      zOffset = 0
    } = options

    const matrixW = COLS * cell
    const matrixH = ROWS * cell
    const cx = x + matrixW * 0.5
    const cy = y + matrixH * 0.5
    const portalRadius = Math.max(matrixW, matrixH) * 0.56

    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    const occlusion = ctx.createRadialGradient(cx, cy, matrixH * 0.1, cx, cy, portalRadius)
    occlusion.addColorStop(0, `rgba(3, 18, 24, ${muted ? 0.1 : 0.18})`)
    occlusion.addColorStop(0.58, 'rgba(1, 5, 12, 0.16)')
    occlusion.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = occlusion
    ctx.fillRect(x - cell * 8, y - cell * 8, matrixW + cell * 16, matrixH + cell * 16)

    const backGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, portalRadius)
    backGlow.addColorStop(0, `rgba(102, 255, 204, ${0.11 * alpha})`)
    backGlow.addColorStop(0.5, `rgba(142, 245, 255, ${0.055 * alpha})`)
    backGlow.addColorStop(1, 'rgba(0, 4, 10, 0)')
    ctx.fillStyle = backGlow
    ctx.fillRect(x - cell * 10, y - cell * 10, matrixW + cell * 20, matrixH + cell * 20)

    drawGuideField(bytes, x, y, cell, { alpha, prefixBits, muted, time })

    for (let bit = 0; bit < BIT_COUNT; bit++) {
      const col = bit % COLS
      const row = Math.floor(bit / COLS)
      const value = getBit(bytes, bit)
      const changed = compareBytes ? value !== getBit(compareBytes, bit) : false
      const inPrefix = bit < prefixBits
      const byte = bytes[bit >> 3]
      const depth = clamp(((byte / 255) * 0.68) + (Math.sin(bit * 0.63 + time * 0.021 + zOffset) + 1) * 0.16)
      const parallax = (depth - 0.5) * cell * 1.35
      const px = x + col * cell + cell * 0.5 + Math.sin(time * 0.011 + row * 0.7) * parallax
      const py = y + row * cell + cell * 0.5 + Math.cos(time * 0.013 + col * 0.31) * parallax
      const radius = cell * (value ? 0.18 + depth * 0.2 : 0.12 + depth * 0.1)
      const hue = inPrefix ? 336 : changed ? 44 : 160 + depth * 58
      const lightAlpha = value ? (muted ? 0.26 : 0.52) * alpha : 0.12 * alpha
      const haloAlpha = value ? (muted ? 0.12 : 0.22) * alpha : 0.035 * alpha

      ctx.save()
      ctx.globalCompositeOperation = 'multiply'
      const shade = ctx.createRadialGradient(
        px + cell * 0.22,
        py + cell * 0.28,
        0,
        px + cell * 0.22,
        py + cell * 0.28,
        cell * (1.1 + depth)
      )
      shade.addColorStop(0, `rgba(0, 0, 0, ${0.22 * alpha})`)
      shade.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = shade
      ctx.beginPath()
      ctx.arc(px + cell * 0.12, py + cell * 0.18, cell * (0.72 + depth * 0.55), 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const halo = ctx.createRadialGradient(px, py, 0, px, py, cell * (1.9 + depth * 2.6))
      halo.addColorStop(0, `hsla(${hue}, 96%, 68%, ${haloAlpha})`)
      halo.addColorStop(0.34, `hsla(${hue}, 90%, 55%, ${haloAlpha * 0.38})`)
      halo.addColorStop(1, `hsla(${hue}, 88%, 48%, 0)`)
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(px, py, cell * (2 + depth * 2.3), 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      const core = ctx.createRadialGradient(
        px - radius * 0.45,
        py - radius * 0.55,
        radius * 0.1,
        px,
        py,
        radius * 1.8
      )
      if (value || changed || inPrefix) {
        core.addColorStop(0, `hsla(${hue}, 100%, 92%, ${0.92 * alpha})`)
        core.addColorStop(0.42, `hsla(${hue}, 94%, 62%, ${lightAlpha})`)
        core.addColorStop(1, `hsla(${hue}, 92%, 28%, ${0.1 * alpha})`)
      } else {
        core.addColorStop(0, `rgba(23, 54, 64, ${0.2 * alpha})`)
        core.addColorStop(0.7, `rgba(4, 16, 24, ${0.28 * alpha})`)
        core.addColorStop(1, `rgba(0, 0, 0, ${0.08 * alpha})`)
      }

      ctx.fillStyle = core
      ctx.beginPath()
      ctx.arc(px, py, Math.max(1.3, radius), 0, Math.PI * 2)
      ctx.fill()

      if (changed || inPrefix) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.strokeStyle = `hsla(${hue}, 100%, 72%, ${0.38 * alpha})`
        ctx.lineWidth = Math.max(1, cell * 0.07)
        ctx.beginPath()
        ctx.arc(px, py, radius * 2.1, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
    }

    ctx.restore()
  }, [ctx, drawGuideField])

  const drawHexRibbon = useCallback((hex, x, y, width) => {
    if (!ctx) return
    const slice = hex.match(/.{1,8}/g) || []
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.textBaseline = 'top'
    slice.slice(0, 8).forEach((chunk, i) => {
      const byte = parseInt(chunk.slice(0, 2), 16)
      const hue = 150 + (byte / 255) * 90
      ctx.fillStyle = `hsla(${hue}, 80%, 62%, 0.72)`
      ctx.fillText(chunk, x + (i % 4) * (width / 4), y + Math.floor(i / 4) * 16)
    })
  }, [ctx])

  const drawScene = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    const w = dimensions.width
    const h = dimensions.height
    const time = frameRef.current

    ctx.fillStyle = 'rgba(0, 3, 9, 0.985)'
    ctx.fillRect(0, 0, w, h)

    const sky = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, Math.max(w, h) * 0.78)
    sky.addColorStop(0, 'rgba(12, 42, 52, 0.24)')
    sky.addColorStop(0.38, 'rgba(4, 16, 26, 0.18)')
    sky.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)

    const lowerInset = mode === 'mining' ? 132 : 76
    const cell = Math.max(5, Math.min(20, Math.floor((w - 72) / COLS), Math.floor((h - lowerInset) / (mode === 'avalanche' ? 18 : 11))))
    const matrixW = COLS * cell
    const x = (w - matrixW) / 2
    const y = mode === 'avalanche'
      ? Math.max(74, h * 0.22)
      : Math.max(96, h * 0.34)

    if (mode === 'avalanche') {
      drawMatrix(digest, x, y, cell, { muted: true, time, zOffset: 0.4 })
      drawMatrix(mutantDigest, x, y + ROWS * cell + cell * 2.3, cell, { compareBytes: digest, time, zOffset: 1.6 })

      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace'
      ctx.textBaseline = 'top'
      ctx.fillStyle = 'rgba(142, 245, 255, 0.52)'
      ctx.fillText(`source: ${phrase.slice(0, 54)}`, x, y - 22)
      ctx.fillStyle = 'rgba(255, 219, 112, 0.78)'
      ctx.fillText(`mutant: ${mutatedPhrase.slice(0, 54)}`, x, y + ROWS * cell + cell * 1.35)
    } else {
      const prefix = mode === 'mining' ? Math.min(targetZeros, leadingZeros) : 0
      drawMatrix(digest, x, y, cell, { prefixBits: prefix, time })

      const scanX = x + ((time * 0.45) % matrixW)
      const gradient = ctx.createLinearGradient(scanX - 20, 0, scanX + 20, 0)
      gradient.addColorStop(0, 'rgba(102, 255, 204, 0)')
      gradient.addColorStop(0.5, 'rgba(142, 245, 255, 0.12)')
      gradient.addColorStop(1, 'rgba(102, 255, 204, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(scanX - 20, y - cell * 5, 40, ROWS * cell + cell * 10)

      drawHexRibbon(digestHex, x, y + ROWS * cell + 24, matrixW)

      if (mode === 'mining') {
        const barsX = x
        const barsY = y + ROWS * cell + 66
        const barW = matrixW / BYTE_COUNT
        for (let i = 0; i < BYTE_COUNT; i++) {
          const barH = (digest[i] / 255) * Math.min(90, h - barsY - 22)
          ctx.fillStyle = `hsla(${145 + digest[i] * 0.5}, 80%, 58%, 0.42)`
          ctx.fillRect(barsX + i * barW, barsY + 92 - barH, Math.max(2, barW - 2), barH)
        }
      }
    }

    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = 'rgba(142, 245, 255, 0.46)'
    ctx.fillText(message, 16, h - 16)
  }, [
    ctx,
    digest,
    digestHex,
    dimensions.height,
    dimensions.width,
    drawHexRibbon,
    drawMatrix,
    leadingZeros,
    message,
    mode,
    mutantDigest,
    mutatedPhrase,
    phrase,
    targetZeros
  ])

  const onFrame = useCallback(() => {
    frameRef.current++
    if (autoMine) runMiningBatch(90)
    drawScene()
  }, [autoMine, drawScene, runMiningBatch])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let frameId
    const animate = () => {
      onFrame()
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, onFrame])

  const metrics = useMemo(() => [
    { label: 'diff', value: `${diffBits}/256`, color: diffBits > 112 ? '#66ffcc' : '#ffcc66' },
    { label: 'zeros', value: leadingZeros },
    { label: 'best', value: mineState.bestZeros },
    { label: 'nonce', value: mineState.nonce }
  ], [diffBits, leadingZeros, mineState.bestZeros, mineState.nonce])

  const controls = [
    { id: 'mutate', label: 'mutate.bit()', onClick: flipMutation },
    { id: 'mine-step', label: 'mine.step()', onClick: stepMine },
    { id: 'auto-mine', label: autoMine ? 'halt.mine()' : 'auto.mine()', onClick: toggleAutoMine, active: autoMine },
    { id: 'target', label: `target.${targetZeros}()`, onClick: cycleTarget },
    { id: 'random', label: 'phrase.cast()', onClick: randomPhrase },
    { id: 'zero', label: 'nonce.zero()', onClick: zeroNonce, variant: 'reset' }
  ]

  return (
    <div className="fixed inset-0 overflow-hidden bg-void-dark">
      <div className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          data-testid="avalanche-hash-canvas"
        />
      </div>

      <header className="pointer-events-none absolute left-0 right-0 top-0 z-50 flex items-start justify-between gap-3 p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="pointer-events-auto">
            <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          </div>
          <h1 className="hidden rounded-full border border-void-green/15 bg-void-dark/45 px-3 py-2 text-sm text-glow backdrop-blur-md sm:block" style={{ color: experiment.color }}>
            {experiment.name}
          </h1>
        </div>
        <div className="rounded-full border border-void-green/15 bg-void-dark/45 px-3 py-2 backdrop-blur-md">
          <ExperimentMetrics metrics={metrics} />
        </div>
      </header>

      <aside className={`absolute bottom-3 right-3 z-50 w-[min(23rem,calc(100vw-1.5rem))] transition-transform duration-300 sm:bottom-4 sm:right-4 ${
        panelOpen ? 'translate-y-0' : 'translate-y-[calc(100%-3rem)]'
      }`}>
        <div className="overflow-hidden border border-void-green/16 bg-void-dark/62 shadow-[0_0_40px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setPanelOpen(prev => !prev)}
            className="flex min-h-[44px] w-full items-center justify-between border-b border-void-green/12 px-3 py-2 text-left font-mono text-xs text-void-cyan/85 transition-colors hover:bg-void-cyan/8"
            aria-expanded={panelOpen}
          >
            <span>{panelOpen ? 'fold.controls()' : 'open.controls()'}</span>
            <span className="text-void-green/45">{mode}</span>
          </button>
          <div className="grid max-h-[58vh] gap-3 overflow-y-auto p-3">
            <ExperimentControls
              modes={MODES}
              currentMode={mode}
              onModeChange={setMode}
              controls={controls}
              className="max-sm:[&_button]:px-3 max-sm:[&_button]:py-2 max-sm:[&_button]:text-xs"
            />
            <div className="grid gap-2">
              <label className="min-w-0">
                <span className="sr-only">message input</span>
                <input
                  value={phrase}
                  onChange={(event) => setPhrase(event.target.value)}
                  className="w-full min-h-[44px] bg-void-dark/80 border border-void-green/25 px-3 py-2 text-sm text-void-green/90 font-mono outline-none transition-colors placeholder:text-void-green/30 focus:border-void-cyan/60"
                  placeholder="type a phrase for the digest field"
                  data-testid="avalanche-phrase-input"
                />
              </label>
              <div className="min-h-[44px] flex items-center overflow-hidden border border-void-green/15 bg-void-dark/55 px-3 text-[11px] font-mono text-void-green/55">
                <span className="truncate">{mode === 'avalanche' ? mutantHex : digestHex}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="pointer-events-none absolute bottom-3 left-3 z-40 max-w-[calc(100vw-2rem)] sm:hidden">
        <div className="rounded-full border border-void-green/12 bg-void-dark/45 px-3 py-2 text-[11px] font-mono text-void-cyan/50 backdrop-blur-md">
          {message}
        </div>
      </div>
    </div>
  )
}

export default AvalancheHash
