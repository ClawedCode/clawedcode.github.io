import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'compose', label: 'compose()' },
  { id: 'quake', label: 'quake()' },
  { id: 'fossil', label: 'fossilize()' }
]

const MAX_COLUMNS = 92
const STRATA_PALETTES = {
  vowel: ['#ffe36e', '#ff7a35', '#fff2a8'],
  consonant: ['#28ffd0', '#28a7ff', '#a6ff36'],
  digit: ['#dcff2e', '#ff55d6', '#ffffff'],
  mark: ['#ff2f68', '#9b5cff', '#40ffe0'],
  space: ['#415d86', '#89a9d8', '#172b46']
}

const KIND_HUES = {
  vowel: 38,
  consonant: 168,
  digit: 78,
  mark: 322,
  space: 208
}

const classifyChar = (char) => {
  if (char === ' ') return 'space'
  if (/[0-9]/.test(char)) return 'digit'
  if (/[aeiou]/i.test(char)) return 'vowel'
  if (/[a-z]/i.test(char)) return 'consonant'
  return 'mark'
}

const hexToRgb = (hex) => {
  const clean = hex.replace('#', '')
  const value = parseInt(clean, 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  }
}

const rgba = (hex, alpha) => {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const makeColumn = (char, index, previousAt) => {
  const now = performance.now()
  const gap = previousAt ? Math.min(1800, now - previousAt) : 360
  const code = char.charCodeAt(0)
  const kind = classifyChar(char)
  const bands = 4 + (code % 5)
  const palette = STRATA_PALETTES[kind]

  return {
    id: `${now}-${index}-${code}`,
    char,
    code,
    kind,
    bands: Array.from({ length: bands }, (_, i) => ({
      height: 0.12 + (((code >> (i % 6)) & 7) / 42),
      color: palette[(code + i) % palette.length],
      shear: ((code * (i + 3)) % 17) - 8
    })),
    gap,
    stress: Math.min(1, 140 / Math.max(40, gap)),
    velocity: Math.min(1, 620 / Math.max(70, gap)),
    fault: char === ' ' || /[.!?;:]/.test(char),
    birth: now,
    lift: 1
  }
}

const GraphemeSeismograph = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const inputRef = useRef(null)
  const columnsRef = useRef([])
  const wavesRef = useRef([])
  const lastKeyAtRef = useRef(0)
  const fossilRef = useRef(false)
  const quakeRef = useRef(false)

  const [mode, setMode] = useState('compose')
  const [text, setText] = useState('')
  const [faults, setFaults] = useState(0)
  const [stress, setStress] = useState(0)
  const [message, setMessage] = useState('type into the dark; letters settle as pressure strata')

  useEffect(() => {
    fossilRef.current = mode === 'fossil'
    quakeRef.current = mode === 'quake'
  }, [mode])

  const recomputeStats = useCallback(() => {
    const columns = columnsRef.current
    if (columns.length === 0) {
      setFaults(0)
      setStress(0)
      return
    }
    setFaults(columns.filter(col => col.fault).length)
    setStress(columns.reduce((sum, col) => sum + col.stress, 0) / columns.length)
  }, [])

  const addWave = useCallback((x, amp, hue = 170) => {
    wavesRef.current.push({
      x,
      amp,
      hue,
      birth: performance.now(),
      life: 1
    })
  }, [])

  const appendText = useCallback((nextText) => {
    const previous = text
    if (nextText.length < previous.length) {
      const removed = previous.length - nextText.length
      columnsRef.current.splice(Math.max(0, columnsRef.current.length - removed), removed)
      setText(nextText)
      recomputeStats()
      setMessage('backspace erosion exposed older sediment')
      return
    }

    const added = nextText.slice(previous.length)
    if (!added) return

    const cols = columnsRef.current
    for (const char of added) {
      const column = makeColumn(char, cols.length, lastKeyAtRef.current)
      cols.push(column)
      lastKeyAtRef.current = performance.now()
      if (cols.length > MAX_COLUMNS) cols.shift()

      const xRatio = cols.length / MAX_COLUMNS
      addWave(dimensions.width * xRatio, 12 + column.stress * 42, column.kind === 'vowel' ? 42 : 170)
    }

    setText(nextText)
    recomputeStats()
    setMessage(added.includes(' ') ? 'a word boundary slipped into a visible fault' : 'fresh graphemes compacting under attention')
  }, [addWave, dimensions.width, recomputeStats, text])

  const handleInput = useCallback((e) => {
    appendText(e.target.value)
  }, [appendText])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    if (nextMode === 'compose') setMessage('compose mode: type, erase, let pressure accumulate')
    else if (nextMode === 'quake') setMessage('quake mode: the whole manuscript trembles along hidden faults')
    else setMessage('fossil mode: animation slows; the inscription becomes mineral memory')
    inputRef.current?.focus()
  }, [])

  const seedCore = useCallback(() => {
    const phrase = 'strata remember what speech forgets'
    appendText(text ? `${text} ${phrase}` : phrase)
    requestAnimationFrame(() => {
      if (inputRef.current) inputRef.current.value = text ? `${text} ${phrase}` : phrase
    })
  }, [appendText, text])

  const strikeFault = useCallback(() => {
    const cols = columnsRef.current
    if (cols.length === 0) return
    const center = Math.floor(cols.length * (0.3 + Math.random() * 0.4))
    for (let i = Math.max(0, center - 5); i <= Math.min(cols.length - 1, center + 5); i++) {
      cols[i].fault = true
      cols[i].stress = Math.min(1, cols[i].stress + 0.42)
      cols[i].lift = 1.4
    }
    addWave(dimensions.width * (center / Math.max(1, cols.length)), 68, 8)
    recomputeStats()
    setMessage('a fault line cracked through the sentence-bed')
    inputRef.current?.focus()
  }, [addWave, dimensions.width, recomputeStats])

  const clearCore = useCallback(() => {
    columnsRef.current = []
    wavesRef.current = []
    lastKeyAtRef.current = 0
    setText('')
    setFaults(0)
    setStress(0)
    setMessage('the core sample was cleared; silence is fresh sediment')
    if (inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.focus()
    }
  }, [])

  const drawColumn = useCallback((col, x, width, baseY, maxHeight, time, index) => {
    const age = Math.min(1, (performance.now() - col.birth) / 420)
    const tremor = quakeRef.current ? Math.sin(time * 0.026 + index * 0.71) * (2 + col.stress * 9) : 0
    const fossilDim = fossilRef.current ? 0.76 : 1
    const heat = Math.min(1, col.velocity * 0.62 + col.stress * 0.5 + (col.fault ? 0.18 : 0))
    let y = baseY
    const totalBand = col.bands.reduce((sum, band) => sum + band.height, 0)
    const columnHeight = maxHeight * (0.42 + col.stress * 0.5 + (col.code % 23) / 82) * age
    const centerX = x + width / 2 + tremor

    col.lift += (1 - col.lift) * 0.04

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const aura = ctx.createRadialGradient(centerX, baseY - columnHeight * 0.52, 0, centerX, baseY - columnHeight * 0.52, width * (5.8 + heat * 4.6))
    aura.addColorStop(0, `hsla(${KIND_HUES[col.kind]}, 100%, ${58 + heat * 18}%, ${0.18 + heat * 0.2})`)
    aura.addColorStop(0.38, `hsla(${KIND_HUES[col.kind]}, 95%, 52%, ${0.08 + heat * 0.08})`)
    aura.addColorStop(1, `hsla(${KIND_HUES[col.kind]}, 80%, 30%, 0)`)
    ctx.fillStyle = aura
    ctx.fillRect(centerX - width * 9, baseY - columnHeight - 40, width * 18, columnHeight + 92)
    ctx.restore()

    for (const band of col.bands) {
      const h = (band.height / totalBand) * columnHeight
      y -= h
      const bandGradient = ctx.createLinearGradient(x, y, x + width, y + h)
      bandGradient.addColorStop(0, rgba(band.color, 0.42 + heat * 0.26))
      bandGradient.addColorStop(0.48, `hsla(${KIND_HUES[col.kind]}, 100%, ${62 + heat * 22}%, ${0.72 + heat * 0.2})`)
      bandGradient.addColorStop(1, rgba(band.color, 0.34 + heat * 0.24))
      ctx.fillStyle = bandGradient
      ctx.globalAlpha = 0.52 + fossilDim * 0.36
      ctx.beginPath()
      ctx.moveTo(x + tremor + band.shear * 0.08, y)
      ctx.lineTo(x + width + tremor + band.shear * 0.08, y + h * 0.08)
      ctx.lineTo(x + width + tremor - band.shear * 0.04, y + h)
      ctx.lineTo(x + tremor - band.shear * 0.04, y + h * 0.92)
      ctx.closePath()
      ctx.fill()

      ctx.globalAlpha = 0.18 + heat * 0.32
      ctx.strokeStyle = `hsla(${KIND_HUES[col.kind]}, 100%, 78%, 0.76)`
      ctx.lineWidth = 0.7
      ctx.stroke()
    }

    ctx.globalAlpha = 1
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = col.fault ? 'rgba(255, 84, 54, 0.9)' : `hsla(${KIND_HUES[col.kind]}, 100%, 74%, ${0.28 + heat * 0.35})`
    ctx.shadowColor = col.fault ? 'rgba(255, 70, 48, 0.9)' : `hsla(${KIND_HUES[col.kind]}, 100%, 62%, 0.9)`
    ctx.shadowBlur = 10 + heat * 15
    ctx.lineWidth = col.fault ? 2.4 : 1.35 + heat * 0.9
    ctx.beginPath()
    ctx.moveTo(x + tremor + width * 0.52, baseY - columnHeight - 6 * col.lift)
    ctx.lineTo(x + tremor + width * 0.52 + (col.fault ? Math.sin(index) * 7 : 0), baseY)
    ctx.stroke()
    ctx.restore()

    if (width > 8) {
      ctx.fillStyle = col.fault ? 'rgba(255, 226, 170, 0.98)' : `hsla(${KIND_HUES[col.kind]}, 100%, ${74 + heat * 12}%, ${0.7 + heat * 0.26})`
      ctx.shadowColor = `hsla(${KIND_HUES[col.kind]}, 100%, 62%, 0.85)`
      ctx.shadowBlur = 7 + heat * 10
      ctx.font = `${Math.max(9, Math.min(15, width * 0.9))}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(col.char === ' ' ? '_' : col.char, x + width / 2 + tremor, baseY - columnHeight - 10 * col.lift)
      ctx.shadowBlur = 0
    }
  }, [ctx])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    const time = performance.now()
    const { width, height } = dimensions

    const fade = fossilRef.current ? 0.22 : 0.38
    ctx.fillStyle = `rgba(0, 1, 8, ${fade})`
    ctx.fillRect(0, 0, width, height)

    const groundY = height * 0.76
    const topY = height * 0.18
    const coreHeight = groundY - topY

    const edgeGradient = ctx.createRadialGradient(width * 0.5, groundY - coreHeight * 0.42, 0, width * 0.5, groundY - coreHeight * 0.42, Math.max(width, height) * 0.74)
    edgeGradient.addColorStop(0, 'rgba(21, 70, 78, 0.28)')
    edgeGradient.addColorStop(0.24, 'rgba(22, 24, 66, 0.2)')
    edgeGradient.addColorStop(0.62, 'rgba(6, 8, 26, 0.38)')
    edgeGradient.addColorStop(1, 'rgba(0, 0, 6, 0.82)')
    ctx.fillStyle = edgeGradient
    ctx.fillRect(0, 0, width, height)

    const strataGradient = ctx.createLinearGradient(0, topY, 0, groundY + 40)
    strataGradient.addColorStop(0, 'rgba(40, 255, 208, 0.055)')
    strataGradient.addColorStop(0.48, 'rgba(255, 227, 110, 0.07)')
    strataGradient.addColorStop(1, 'rgba(255, 47, 104, 0.075)')
    ctx.fillStyle = strataGradient
    ctx.fillRect(0, topY, width, coreHeight + 50)

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    for (let x = -40; x < width + 40; x += 36) {
      const alpha = 0.035 + 0.025 * Math.sin(time * 0.0006 + x * 0.019)
      ctx.strokeStyle = `rgba(40, 255, 208, ${alpha})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + Math.sin(time * 0.0008 + x) * 4, topY - 48)
      ctx.lineTo(x + Math.cos(time * 0.0007 + x) * 8, height)
      ctx.stroke()
    }
    for (let y = topY - 20; y < height; y += 34) {
      ctx.strokeStyle = `rgba(255, 227, 110, ${0.025 + 0.018 * Math.cos(time * 0.0007 + y)})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, y + Math.sin(time * 0.001 + y) * 3)
      ctx.lineTo(width, y + Math.cos(time * 0.0008 + y) * 4)
      ctx.stroke()
    }
    for (let i = 0; i < 150; i++) {
      const x = (i * 89 + Math.sin(time * 0.00031 + i) * 8) % width
      const y = (i * 53 + Math.cos(time * 0.00027 + i * 1.7) * 7) % height
      const hue = i % 3 === 0 ? 172 : i % 3 === 1 ? 42 : 316
      ctx.fillStyle = `hsla(${hue}, 100%, 64%, ${0.025 + (i % 7) * 0.004})`
      ctx.fillRect(x, y, 1.2, 1.2)
    }
    ctx.restore()

    ctx.strokeStyle = 'rgba(120, 255, 220, 0.16)'
    ctx.lineWidth = 1
    for (let i = 0; i < 8; i++) {
      const y = topY + (coreHeight * i) / 7
      ctx.beginPath()
      ctx.moveTo(0, y + Math.sin(time * 0.0009 + i) * 2)
      ctx.lineTo(width, y + Math.cos(time * 0.0007 + i) * 2)
      ctx.stroke()
    }

    wavesRef.current = wavesRef.current.filter(wave => {
      const age = (time - wave.birth) / 1000
      wave.life = 1 - age / 1.8
      if (wave.life <= 0) return false

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = `hsla(${wave.hue}, 100%, 66%, ${wave.life * 0.7})`
      ctx.shadowColor = `hsla(${wave.hue}, 100%, 62%, 0.8)`
      ctx.shadowBlur = 12
      ctx.lineWidth = 1.7 + wave.life * 1.2
      ctx.beginPath()
      for (let x = 0; x <= width; x += 8) {
        const dx = Math.abs(x - wave.x)
        const envelope = Math.max(0, 1 - dx / (width * 0.62)) * wave.life
        const y = groundY + 34 + Math.sin(x * 0.045 - age * 11) * wave.amp * envelope
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.restore()
      return true
    })

    const columns = columnsRef.current
    const gap = Math.max(1, Math.min(5, width / 220))
    const colWidth = Math.max(5, Math.min(18, (width - gap * (MAX_COLUMNS - 1)) / MAX_COLUMNS))
    const usedWidth = columns.length * (colWidth + gap)
    const startX = Math.max(12, (width - usedWidth) / 2)

    columns.forEach((col, i) => {
      drawColumn(col, startX + i * (colWidth + gap), colWidth, groundY, coreHeight, time, i)
    })

    const underGradient = ctx.createLinearGradient(0, groundY, 0, height)
    underGradient.addColorStop(0, 'rgba(2, 8, 18, 0.5)')
    underGradient.addColorStop(1, 'rgba(0, 1, 8, 0.9)')
    ctx.fillStyle = underGradient
    ctx.fillRect(0, groundY + 3, width, height - groundY)
    ctx.strokeStyle = 'rgba(255, 227, 110, 0.38)'
    ctx.shadowColor = 'rgba(255, 227, 110, 0.5)'
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.moveTo(0, groundY + 3)
    ctx.lineTo(width, groundY + 3)
    ctx.stroke()
    ctx.shadowBlur = 0

    if (columns.length === 0) {
      ctx.fillStyle = 'rgba(40, 255, 208, 0.7)'
      ctx.shadowColor = 'rgba(40, 255, 208, 0.65)'
      ctx.shadowBlur = 18
      ctx.font = `${width < 520 ? 12 : 15}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('focus the input and type: each grapheme becomes sediment', width / 2, height / 2)
      ctx.shadowBlur = 0
    }
  }, [ctx, dimensions, drawColumn])

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

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const metrics = useMemo(() => ([
    { label: 'glyphs', value: columnsRef.current.length },
    { label: 'faults', value: faults },
    { label: 'stress', value: `${Math.round(stress * 100)}%` },
    { label: 'mode', value: mode }
  ]), [faults, mode, stress])

  const controls = useMemo(() => ([
    { id: 'sample', label: 'sample.core()', onClick: seedCore },
    { id: 'fault', label: 'strike.fault()', onClick: strikeFault },
    { id: 'clear', label: 'clear()', onClick: clearCore, variant: 'reset' }
  ]), [clearCore, seedCore, strikeFault])

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="relative z-50 flex items-center justify-between p-2 sm:p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1 className="text-xl text-glow hidden sm:block" style={{ color: experiment.color }}>
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      <div className="flex flex-col gap-2 p-2 sm:p-4 border-b border-void-cyan/20 bg-[radial-gradient(circle_at_22%_0%,rgba(40,255,208,0.16),transparent_34%),linear-gradient(90deg,rgba(255,47,104,0.08),rgba(0,1,8,0.74),rgba(255,227,110,0.08))] backdrop-blur-sm shadow-[0_0_32px_rgba(40,255,208,0.08)]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2">
          <ExperimentControls
            modes={MODES}
            currentMode={mode}
            onModeChange={handleModeChange}
            controls={controls}
            className="[&_button]:border-void-cyan/35 [&_button]:shadow-[0_0_18px_rgba(40,255,208,0.12),inset_0_0_18px_rgba(255,227,110,0.035)] [&_button:hover]:shadow-[0_0_24px_rgba(40,255,208,0.32),0_0_42px_rgba(255,47,104,0.12),inset_0_0_20px_rgba(40,255,208,0.08)] [&_button:hover]:-translate-y-0.5"
          />
          <p className="text-void-cyan/70 text-xs lg:text-right max-w-xl drop-shadow-[0_0_8px_rgba(40,255,208,0.24)]">{message}</p>
        </div>
        <input
          ref={inputRef}
          value={text}
          onChange={handleInput}
          className="w-full bg-void-dark/75 border border-void-cyan/35 focus:border-void-yellow/80 outline-none px-3 py-3 text-sm font-mono text-void-cyan placeholder:text-void-green/35 shadow-[inset_0_0_22px_rgba(40,255,208,0.07),0_0_18px_rgba(40,255,208,0.08)] focus:shadow-[inset_0_0_28px_rgba(40,255,208,0.12),0_0_24px_rgba(255,227,110,0.14)] transition-[border-color,box-shadow]"
          placeholder="type here: language compacts into visible geology"
          spellCheck="false"
          data-testid="grapheme-seismograph-input"
        />
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          data-testid="grapheme-seismograph-canvas"
        />
      </div>
    </div>
  )
}

export default GraphemeSeismograph
