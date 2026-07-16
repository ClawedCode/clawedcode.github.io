import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'compose', label: 'compose()' },
  { id: 'lockup', label: 'lockup()' },
  { id: 'impress', label: 'impress()' },
  { id: 'ghost', label: 'ghost()' }
]

const SAMPLES = [
  'the archive bites softly where the ink remembers',
  'signal enters paper and leaves as weather',
  'each letter is a little machine dreaming pressure',
  'midnight typesets the names that daylight cannot hold'
]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const normalizeInput = (value) => (
  value
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .slice(0, 220)
)

const splitLines = (text, cols) => {
  const words = normalizeInput(text || SAMPLES[0]).split(' ').filter(Boolean)
  const lines = []
  let line = ''

  words.forEach(word => {
    const candidate = line ? `${line} ${word}` : word
    if (candidate.length > cols && line) {
      lines.push(line)
      line = word.slice(0, cols)
    } else {
      line = candidate.slice(0, cols)
    }
  })

  if (line) lines.push(line)
  return lines.slice(0, 9)
}

const makePressure = (count, seed = 0.42) => {
  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(seed * 8 + index * 0.74) * 0.18
    const bite = Math.sin(seed * 19 + index * 1.91) * 0.08
    return clamp(0.54 + wave + bite, 0.18, 0.95)
  })
}

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

const drawChromaRoundedRect = (ctx, x, y, width, height, radius, alpha = 0.14) => {
  ctx.save()
  ctx.lineWidth = 1
  drawRoundedRect(ctx, x - 1.5, y + 0.8, width, height, radius)
  ctx.strokeStyle = `rgba(255, 45, 130, ${alpha})`
  ctx.stroke()
  drawRoundedRect(ctx, x + 1.6, y - 0.8, width, height, radius)
  ctx.strokeStyle = `rgba(80, 245, 255, ${alpha})`
  ctx.stroke()
  ctx.restore()
}

const drawCircuitTracery = (ctx, width, height, time) => {
  const step = Math.max(42, Math.min(76, width * 0.08))
  const drift = (time * 0.06) % step

  ctx.save()
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(102, 255, 204, 0.045)'
  ctx.fillStyle = 'rgba(255, 102, 204, 0.04)'

  for (let x = -step + drift; x < width + step; x += step) {
    const notch = (Math.floor(x / step) % 3) * step * 0.22
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height * 0.22 + notch)
    ctx.lineTo(x + step * 0.36, height * 0.22 + notch)
    ctx.lineTo(x + step * 0.36, height)
    ctx.stroke()
  }

  for (let y = -step + drift * 0.54; y < height + step; y += step) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width * 0.18, y)
    ctx.lineTo(width * 0.18, y + step * 0.3)
    ctx.lineTo(width, y + step * 0.3)
    ctx.stroke()

    for (let x = step * 0.7; x < width; x += step * 2.4) {
      ctx.beginPath()
      ctx.arc(x + Math.sin(time * 0.01 + y) * 2, y + step * 0.3, 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

const drawAnalogNoise = (ctx, width, height, time) => {
  const columns = 48
  const rows = Math.max(24, Math.floor(height / 18))

  ctx.save()
  ctx.globalCompositeOperation = 'screen'

  for (let i = 0; i < columns; i++) {
    const x = (i / columns) * width
    const value = Math.sin(i * 17.17 + time * 0.021) * Math.sin(i * 5.31 + time * 0.007)
    ctx.fillStyle = `rgba(92, 80, 190, ${0.006 + Math.abs(value) * 0.014})`
    ctx.fillRect(x, 0, width / columns + 1, height)
  }

  for (let i = 0; i < rows; i++) {
    const y = ((i * 37 + time * 0.42) % height)
    const alpha = 0.012 + (Math.sin(time * 0.018 + i * 3.9) + 1) * 0.009
    ctx.fillStyle = `rgba(210, 235, 255, ${alpha})`
    ctx.fillRect(0, y, width, 1)
  }

  ctx.restore()
}

const LetterpressOracle = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('compose')
  const [text, setText] = useState(SAMPLES[0])
  const [sampleIndex, setSampleIndex] = useState(0)
  const [impressions, setImpressions] = useState(0)
  const [ink, setInk] = useState(0.72)
  const [message, setMessage] = useState('type into the stick; letters become small metal weather')
  const [revision, setRevision] = useState(0)

  const frameRef = useRef(0)
  const pressureRef = useRef(makePressure(24))
  const printsRef = useRef([])
  const dragRef = useRef(false)

  const bump = useCallback(() => setRevision(value => value + 1), [])

  const layout = useMemo(() => {
    const cols = dimensions.width < 720 ? 18 : 26
    const lines = splitLines(text, cols)
    const glyphs = []

    lines.forEach((line, row) => {
      const padded = mode === 'lockup' ? line.padEnd(cols, ' ') : line
      padded.split('').forEach((char, col) => {
        if (char === ' ' && mode !== 'lockup') return
        glyphs.push({
          id: `${row}:${col}`,
          char,
          row,
          col,
          code: char.charCodeAt(0)
        })
      })
    })

    return { cols, lines, glyphs }
  }, [dimensions.width, mode, text])

  const resetPressure = useCallback(() => {
    pressureRef.current = makePressure(24, Math.random())
    bump()
  }, [bump])

  const pressSheet = useCallback(() => {
    const clean = normalizeInput(text || SAMPLES[0])
    const pressure = pressureRef.current.reduce((sum, value) => sum + value, 0) / pressureRef.current.length
    printsRef.current = [
      {
        id: Date.now(),
        text: clean,
        pressure,
        ink,
        life: 1
      },
      ...printsRef.current.slice(0, 5)
    ]
    setImpressions(value => value + 1)
    setInk(value => clamp(value - 0.08, 0.18, 0.9))
    setMode('ghost')
    setMessage('proof pulled: the sheet keeps the bite and loses the body')
    bump()
  }, [bump, ink, text])

  const handleSample = useCallback(() => {
    setSampleIndex(index => {
      const next = (index + 1) % SAMPLES.length
      setText(SAMPLES[next])
      setMessage('fresh phrase loaded into the composing stick')
      return next
    })
    bump()
  }, [bump])

  const handleFreshPaper = useCallback(() => {
    printsRef.current = []
    setImpressions(0)
    setInk(0.78)
    resetPressure()
    setMessage('paper stack cleared; the press drinks new ink')
  }, [resetPressure])

  const handleClear = useCallback(() => {
    setText('')
    printsRef.current = []
    setImpressions(0)
    setMessage('the chase is empty; silence sits in the typecase')
    bump()
  }, [bump])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    const messages = {
      compose: 'compose mode: live text enters the stick',
      lockup: 'lockup mode: spaces become visible furniture and pressure lanes',
      impress: 'impress mode: drag the platen bands before pulling proof',
      ghost: 'ghost mode: previous pulls hover like carbon memory'
    }
    setMessage(messages[nextMode])
  }, [])

  const updatePressureAt = useCallback((event) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const strip = Math.floor(clamp(x / Math.max(1, rect.width), 0, 0.999) * pressureRef.current.length)
    const vertical = clamp(1 - y / Math.max(1, rect.height), 0.08, 1)
    pressureRef.current[strip] = clamp(vertical, 0.08, 1)
    bump()
  }, [bump, canvasRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const down = (event) => {
      if (mode !== 'impress') return
      event.preventDefault()
      dragRef.current = true
      updatePressureAt(event)
    }
    const move = (event) => {
      if (!dragRef.current || mode !== 'impress') return
      event.preventDefault()
      updatePressureAt(event)
    }
    const up = () => {
      dragRef.current = false
    }

    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointerleave', up)
    canvas.addEventListener('pointercancel', up)

    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointerleave', up)
      canvas.removeEventListener('pointercancel', up)
    }
  }, [canvasRef, mode, updatePressureAt])

  const drawPlate = useCallback((plate, time) => {
    if (!ctx) return
    const { x, y, width, height, cell, leading } = plate
    const metal = ctx.createLinearGradient(x, y, x + width, y + height)
    metal.addColorStop(0, 'rgba(20, 44, 43, 0.82)')
    metal.addColorStop(0.5, 'rgba(6, 18, 22, 0.96)')
    metal.addColorStop(1, 'rgba(44, 35, 26, 0.82)')

    ctx.save()
    drawRoundedRect(ctx, x - 18, y - 22, width + 36, height + 44, 8)
    ctx.fillStyle = metal
    ctx.fill()
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.18)'
    ctx.lineWidth = 1
    ctx.stroke()
    drawChromaRoundedRect(ctx, x - 18, y - 22, width + 36, height + 44, 8, 0.13)

    const activeRows = new Set(layout.glyphs.map(glyph => glyph.row))
    const pressure = pressureRef.current

    for (let i = 0; i < pressure.length; i++) {
      const px = x + (i / pressure.length) * width
      const laneWidth = width / pressure.length
      const strength = pressure[i]
      ctx.fillStyle = `rgba(255, 210, 122, ${mode === 'impress' ? 0.03 + strength * 0.12 : 0.02 + strength * 0.04})`
      ctx.fillRect(px, y - 18, laneWidth, height + 36)
    }

    activeRows.forEach(row => {
      const ry = y + row * leading + cell * 0.52
      ctx.strokeStyle = 'rgba(102, 255, 204, 0.08)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, ry)
      ctx.lineTo(x + width, ry)
      ctx.stroke()
    })

    ctx.font = `${Math.max(15, cell * 0.62)}px "Courier New", monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    layout.glyphs.forEach(glyph => {
      const gx = x + glyph.col * cell
      const gy = y + glyph.row * leading
      const strip = clamp(Math.floor((glyph.col / Math.max(1, layout.cols)) * pressure.length), 0, pressure.length - 1)
      const strength = pressure[strip]
      const isSpace = glyph.char === ' '
      const pulse = mode === 'compose' ? Math.sin(time * 0.035 + glyph.code) * 0.08 : 0
      const lift = mode === 'lockup' ? 1 : 1 + strength * 0.35 + pulse

      drawRoundedRect(ctx, gx + 2, gy + 2, cell - 4, cell * 0.92, 3)
      ctx.fillStyle = isSpace ? 'rgba(55, 74, 70, 0.38)' : `rgba(38, ${74 + strength * 70}, ${68 + strength * 54}, ${0.62 + strength * 0.22})`
      ctx.fill()
      ctx.strokeStyle = isSpace ? 'rgba(102, 255, 204, 0.09)' : `rgba(102, 255, 204, ${0.16 + strength * 0.28})`
      ctx.stroke()
      if (!isSpace && (glyph.code + glyph.row + glyph.col) % 3 === 0) {
        drawChromaRoundedRect(ctx, gx + 2, gy + 2, cell - 4, cell * 0.92, 3, 0.08)
      }

      if (isSpace) {
        if (mode === 'lockup') {
          ctx.fillStyle = 'rgba(102, 255, 204, 0.16)'
          ctx.fillRect(gx + cell * 0.3, gy + cell * 0.42, cell * 0.4, 2)
        }
        return
      }

      ctx.save()
      ctx.translate(gx + cell / 2, gy + cell * 0.48)
      ctx.scale(-lift, lift)
      ctx.fillStyle = 'rgba(255, 45, 130, 0.12)'
      ctx.fillText(glyph.char, -0.9, 0.6)
      ctx.fillStyle = 'rgba(80, 245, 255, 0.12)'
      ctx.fillText(glyph.char, 0.9, -0.6)
      ctx.fillStyle = `rgba(5, 10, 12, ${0.76 + strength * 0.18})`
      ctx.fillText(glyph.char, 0, 0)
      ctx.restore()

      if (mode === 'impress' && strength > 0.72) {
        ctx.fillStyle = `rgba(255, 214, 128, ${0.05 + (strength - 0.72) * 0.28})`
        ctx.fillRect(gx + 5, gy + cell * 0.18, cell - 10, 2)
      }
    })

    ctx.restore()
  }, [ctx, layout.cols, layout.glyphs, mode])

  const drawProof = useCallback((paper, time) => {
    if (!ctx) return
    const { x, y, width, height } = paper
    const latest = printsRef.current[0]
    const textSource = latest?.text || normalizeInput(text || SAMPLES[0])
    const lines = splitLines(textSource, dimensions.width < 720 ? 18 : 25)
    const pressure = latest?.pressure ?? pressureRef.current.reduce((sum, value) => sum + value, 0) / pressureRef.current.length
    const printInk = latest?.ink ?? ink

    ctx.save()
    const halo = ctx.createLinearGradient(x - 24, y - 28, x + width + 34, y + height + 24)
    halo.addColorStop(0, 'rgba(16, 18, 72, 0.78)')
    halo.addColorStop(0.5, 'rgba(7, 10, 32, 0.9)')
    halo.addColorStop(1, 'rgba(44, 15, 58, 0.58)')
    drawRoundedRect(ctx, x - 24, y - 28, width + 48, height + 56, 10)
    ctx.fillStyle = halo
    ctx.fill()
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.12)'
    ctx.stroke()
    drawChromaRoundedRect(ctx, x - 24, y - 28, width + 48, height + 56, 10, 0.12)

    drawRoundedRect(ctx, x, y, width, height, 8)
    const paperSkin = ctx.createLinearGradient(x, y, x + width, y + height)
    paperSkin.addColorStop(0, 'rgba(235, 238, 218, 0.94)')
    paperSkin.addColorStop(0.48, 'rgba(218, 229, 202, 0.88)')
    paperSkin.addColorStop(1, 'rgba(240, 224, 194, 0.9)')
    ctx.fillStyle = paperSkin
    ctx.fill()

    for (let i = 0; i < 34; i++) {
      const px = x + (i / 34) * width
      const wav = Math.sin(time * 0.012 + i * 2.7) * 1.4
      ctx.fillStyle = `rgba(6, 20, 18, ${0.01 + (i % 5) * 0.004})`
      ctx.fillRect(px + wav, y + 3, 1, height - 6)
    }

    for (let i = 0; i < 42; i++) {
      const edgeX = i % 2 === 0 ? x + 2 : x + width - 3
      const edgeY = y + ((i * 29 + time * 0.07) % height)
      ctx.fillStyle = `rgba(20, 30, 20, ${0.025 + (i % 4) * 0.008})`
      ctx.fillRect(edgeX + Math.sin(i * 9.1) * 2, edgeY, 2, 1)
    }

    ctx.strokeStyle = 'rgba(255, 214, 128, 0.3)'
    ctx.stroke()
    drawChromaRoundedRect(ctx, x, y, width, height, 8, 0.1)

    const fontSize = clamp(width * 0.043, 15, 23)
    const lineHeight = fontSize * 1.5
    ctx.font = `${fontSize}px "Courier New", monospace`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    lines.forEach((line, row) => {
      const yy = y + height * 0.16 + row * lineHeight
      const chars = line.split('')
      chars.forEach((char, col) => {
        if (char === ' ') return
        const jitter = Math.sin(time * 0.01 + row * 8 + col * 3) * (mode === 'ghost' ? 0.5 : 0.14)
        const bite = clamp(pressure * printInk + ((char.charCodeAt(0) % 7) - 3) * 0.018, 0.18, 0.95)
        ctx.fillStyle = `rgba(255, 45, 130, ${0.018 + bite * 0.032})`
        ctx.fillText(char, x + width * 0.1 + col * fontSize * 0.64 + jitter - 0.7, yy + jitter * 0.4 + 0.4)
        ctx.fillStyle = `rgba(40, 210, 255, ${0.018 + bite * 0.032})`
        ctx.fillText(char, x + width * 0.1 + col * fontSize * 0.64 + jitter + 0.7, yy + jitter * 0.4 - 0.4)
        ctx.fillStyle = `rgba(0, 18, 16, ${0.26 + bite * 0.5})`
        ctx.fillText(char, x + width * 0.1 + col * fontSize * 0.64 + jitter, yy + jitter * 0.4)

        if (mode === 'ghost' && printsRef.current.length > 1) {
          ctx.fillStyle = `rgba(30, 100, 92, ${0.025 + bite * 0.04})`
          ctx.fillText(char, x + width * 0.1 + col * fontSize * 0.64 - 2, yy + 2)
        }
      })
    })

    printsRef.current.slice(1).forEach((print, index) => {
      const ghostLines = splitLines(print.text, dimensions.width < 720 ? 18 : 25)
      ctx.font = `${fontSize}px "Courier New", monospace`
      ctx.fillStyle = `rgba(20, 100, 86, ${0.035 / (index + 1)})`
      ghostLines.slice(0, 6).forEach((line, row) => {
        ctx.fillText(line, x + width * 0.1 + index * 5, y + height * 0.16 + row * lineHeight + index * 8)
      })
    })

    ctx.fillStyle = 'rgba(0, 12, 10, 0.24)'
    ctx.font = '11px "Courier New", monospace'
    ctx.fillText(`impression ${impressions.toString().padStart(2, '0')}`, x + width * 0.1, y + height - 34)
    ctx.restore()
  }, [ctx, dimensions.width, impressions, ink, mode, text])

  const drawPressureGauge = useCallback((x, y, width, height) => {
    if (!ctx) return
    const pressure = pressureRef.current

    ctx.save()
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.16)'
    ctx.lineWidth = 1
    drawRoundedRect(ctx, x, y, width, height, 6)
    ctx.stroke()
    drawChromaRoundedRect(ctx, x, y, width, height, 6, 0.08)

    pressure.forEach((value, index) => {
      const barWidth = width / pressure.length
      const barHeight = value * (height - 16)
      ctx.fillStyle = `rgba(255, 210, 122, ${0.18 + value * 0.42})`
      ctx.fillRect(x + index * barWidth + 2, y + height - 8 - barHeight, Math.max(2, barWidth - 4), barHeight)
    })

    ctx.fillStyle = 'rgba(102, 255, 204, 0.5)'
    ctx.font = '11px "Courier New", monospace'
    ctx.fillText('platen pressure', x + 12, y + 16)
    ctx.restore()
  }, [ctx])

  const draw = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    frameRef.current += 1
    const time = frameRef.current
    const { width, height } = dimensions

    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#020211'
    ctx.fillRect(0, 0, width, height)

    const table = ctx.createRadialGradient(width * 0.68, height * 0.46, 20, width * 0.55, height * 0.5, Math.max(width, height) * 0.82)
    table.addColorStop(0, 'rgba(20, 16, 68, 0.88)')
    table.addColorStop(0.42, 'rgba(5, 8, 38, 0.94)')
    table.addColorStop(0.72, 'rgba(4, 24, 33, 0.78)')
    table.addColorStop(1, 'rgba(2, 2, 17, 1)')
    ctx.fillStyle = table
    ctx.fillRect(0, 0, width, height)

    const depth = ctx.createLinearGradient(0, 0, width, height)
    depth.addColorStop(0, 'rgba(72, 37, 156, 0.16)')
    depth.addColorStop(0.45, 'rgba(0, 0, 0, 0)')
    depth.addColorStop(1, 'rgba(255, 51, 153, 0.06)')
    ctx.fillStyle = depth
    ctx.fillRect(0, 0, width, height)

    drawCircuitTracery(ctx, width, height, time)
    drawAnalogNoise(ctx, width, height, time)

    const pad = clamp(width * 0.045, 18, 58)
    const top = clamp(height * 0.07, 28, 64)
    const mobile = width < 760
    const plateWidth = mobile ? width - pad * 2 : width * 0.5
    const plateHeight = mobile ? height * 0.42 : height * 0.68
    const cell = Math.min(32, Math.max(18, plateWidth / (layout.cols + 1)))
    const leading = cell * 1.2
    const plate = {
      x: pad + (mobile ? 0 : width * 0.02),
      y: top,
      width: cell * layout.cols,
      height: Math.max(plateHeight, leading * Math.max(5, layout.lines.length)),
      cell,
      leading
    }
    const proof = mobile
      ? { x: pad, y: top + plate.height + 42, width: width - pad * 2, height: Math.max(190, height - top - plate.height - 70) }
      : { x: width * 0.62, y: top + 6, width: width * 0.3, height: height * 0.72 }

    drawPlate(plate, time)
    drawProof(proof, time)

    const gaugeY = mobile ? Math.max(8, top + plate.height + 8) : top + plate.height + 28
    const gaugeWidth = mobile ? width - pad * 2 : plate.width
    drawPressureGauge(plate.x, gaugeY, gaugeWidth, mobile ? 26 : 42)

    if (mode === 'impress') {
      ctx.fillStyle = 'rgba(255, 214, 128, 0.08)'
      ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = 'rgba(255, 214, 128, 0.32)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(plate.x - 18, top - 28 + Math.sin(time * 0.03) * 3)
      ctx.lineTo(plate.x + plate.width + 18, top - 28 + Math.sin(time * 0.03) * 3)
      ctx.stroke()
    }

    ctx.fillStyle = 'rgba(102, 255, 204, 0.44)'
    ctx.font = '12px "Courier New", monospace'
    ctx.fillText(message, pad, height - 20)
  }, [ctx, dimensions, drawPlate, drawPressureGauge, drawProof, layout.cols, layout.lines.length, message, mode])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let frameId
    const animate = () => {
      draw()
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, draw, revision])

  const metrics = useMemo(() => {
    const pressure = pressureRef.current.reduce((sum, value) => sum + value, 0) / pressureRef.current.length
    return [
      { label: 'glyphs', value: layout.glyphs.filter(glyph => glyph.char !== ' ').length },
      { label: 'mode', value: mode },
      { label: 'pressure', value: `${Math.round(pressure * 100)}%` },
      { label: 'ink', value: `${Math.round(ink * 100)}%` }
    ]
  }, [ink, layout.glyphs, mode, revision])

  const controls = [
    { id: 'press', label: 'press()', onClick: pressSheet },
    { id: 'pressure', label: 'pressure.shuffle()', onClick: resetPressure },
    { id: 'sample', label: 'sample()', onClick: handleSample },
    { id: 'fresh-paper', label: 'fresh.paper()', onClick: handleFreshPaper, variant: 'reset' },
    { id: 'clear', label: 'clear()', onClick: handleClear, variant: 'danger' }
  ]

  return (
    <div className="letterpress-portal fixed inset-0 flex flex-col overflow-hidden">
      <header className="letterpress-header relative z-50 flex items-center justify-between p-2 sm:p-4 border-b border-void-green/20 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1 className="letterpress-chroma-text text-xl text-glow hidden sm:block" style={{ color: experiment.color }}>
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      <div className="letterpress-control-panel relative z-40 flex flex-col gap-3 p-2 sm:p-4 border-b border-void-green/10 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <ExperimentControls
            modes={MODES}
            currentMode={mode}
            onModeChange={handleModeChange}
            controls={controls}
            className="letterpress-control-row"
          />
          <textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value.slice(0, 220))
              setMessage('new type selected; the chase rearranges itself')
            }}
            className="letterpress-input w-full lg:w-[34rem] min-h-[76px] max-h-28 rounded border border-void-green/25 px-3 py-2 text-sm text-void-green/85 font-mono outline-none focus:border-void-cyan/70"
            spellCheck="false"
            aria-label="letterpress text"
          />
        </div>
      </div>

      <div className="letterpress-stage flex-1 min-h-0 relative">
        <canvas
          ref={canvasRef}
          className={`absolute z-10 inset-0 w-full h-full ${mode === 'impress' ? 'cursor-ns-resize' : 'cursor-default'}`}
          data-testid="letterpress-canvas"
        />
      </div>
    </div>
  )
}

export default LetterpressOracle
