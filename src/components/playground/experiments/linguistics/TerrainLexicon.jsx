import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const COLS = 48
const ROWS = 30
const CELL_COUNT = COLS * ROWS
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])

const MODES = [
  { id: 'contour', label: 'contour()' },
  { id: 'strata', label: 'strata()' },
  { id: 'weather', label: 'weather()' }
]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const lerp = (a, b, t) => a + (b - a) * t
const smoothNoise = (x, y, t) => {
  const a = Math.sin(x * 0.012 + y * 0.017 + t * 0.004)
  const b = Math.sin((x - y) * 0.006 + t * 0.002)
  const c = Math.cos(Math.hypot(x, y) * 0.009 - t * 0.003)
  return (a + b + c) / 3
}

const createTerrain = () => new Float32Array(CELL_COUNT)

const TerrainLexicon = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const [mode, setMode] = useState('contour')
  const [message, setMessage] = useState('type into the chamber // letters become pressure maps')
  const [stats, setStats] = useState({ glyphs: 0, peaks: 0, channels: 0, sentence: 'waiting' })
  const [frozen, setFrozen] = useState(false)

  const terrainRef = useRef(createTerrain())
  const cursorRef = useRef({ x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) })
  const glyphsRef = useRef([])
  const rainRef = useRef([])
  const frameRef = useRef(0)
  const frozenRef = useRef(false)

  const deposit = useCallback((cx, cy, amount, radius) => {
    const terrain = terrainRef.current
    for (let y = -radius; y <= radius; y += 1) {
      for (let x = -radius; x <= radius; x += 1) {
        const gx = cx + x
        const gy = cy + y
        if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) continue
        const distance = Math.hypot(x, y)
        if (distance > radius) continue
        const falloff = 1 - distance / (radius + 0.001)
        const index = gy * COLS + gx
        terrain[index] = clamp(terrain[index] + amount * falloff, -1, 1)
      }
    }
  }, [])

  const walkCursor = useCallback((charCode) => {
    const cursor = cursorRef.current
    cursor.x = (cursor.x + 5 + (charCode % 7)) % COLS
    cursor.y = (cursor.y + 3 + (charCode % 5)) % ROWS
  }, [])

  const handleGlyph = useCallback((key) => {
    const char = key.length === 1 ? key.toLowerCase() : key
    const code = char.charCodeAt(0) || 0
    walkCursor(code)

    if (key === 'Backspace') {
      deposit(cursorRef.current.x, cursorRef.current.y, -0.28, 4)
      setMessage('backspace scraped a fossil layer from the map')
      return
    }

    if (key === 'Enter') {
      deposit(cursorRef.current.x, cursorRef.current.y, 0.45, 7)
      setMessage('linebreak impact // a plateau remembers the pause')
      return
    }

    if (key === ' ') {
      deposit(cursorRef.current.x, cursorRef.current.y, -0.38, 5)
      setMessage('spacebar cut a river through the phrase-bed')
    } else if (/^[a-z0-9.,;:!?'"-]$/.test(char)) {
      const isVowel = VOWELS.has(char)
      const amount = isVowel ? -0.2 : 0.24 + (code % 4) * 0.04
      deposit(cursorRef.current.x, cursorRef.current.y, amount, isVowel ? 5 : 3)
      setMessage(isVowel ? 'vowel opened a basin' : 'consonant raised a ridge')
    } else {
      return
    }

    glyphsRef.current.push({
      char: key === ' ' ? '_' : key,
      x: cursorRef.current.x,
      y: cursorRef.current.y,
      age: 0
    })
    if (glyphsRef.current.length > 90) glyphsRef.current.shift()

    setStats(prev => ({
      ...prev,
      glyphs: prev.glyphs + 1,
      sentence: key === ' ' ? 'channel' : key
    }))
  }, [deposit, walkCursor])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Enter') {
        event.preventDefault()
        handleGlyph(event.key)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleGlyph])

  const erode = useCallback(() => {
    const terrain = terrainRef.current
    const next = createTerrain()
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        let total = 0
        let count = 0
        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            const gx = x + ox
            const gy = y + oy
            if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) continue
            total += terrain[gy * COLS + gx]
            count += 1
          }
        }
        next[y * COLS + x] = lerp(terrain[y * COLS + x], total / count, 0.42)
      }
    }
    terrainRef.current = next
    setMessage('erosion softened the argument into contour memory')
  }, [])

  const flood = useCallback(() => {
    deposit(Math.floor(COLS * 0.5), Math.floor(ROWS * 0.5), -0.55, 12)
    setMessage('flood pulled low vowels through the central basin')
  }, [deposit])

  const freeze = useCallback(() => {
    setFrozen(prev => {
      const next = !prev
      frozenRef.current = next
      setMessage(next ? 'weather frozen // map holds its breath' : 'weather released // rain resumes its slow grammar')
      return next
    })
  }, [])

  const reseed = useCallback(() => {
    terrainRef.current = createTerrain()
    glyphsRef.current = []
    rainRef.current = []
    cursorRef.current = { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) }
    setStats({ glyphs: 0, peaks: 0, channels: 0, sentence: 'waiting' })
    setMessage('blank atlas // the next sentence gets first tracks')
  }, [])

  const controls = [
    { id: 'erode', label: 'erode()', onClick: erode },
    { id: 'flood', label: 'flood()', onClick: flood },
    { id: 'freeze', label: frozen ? 'thaw()' : 'freeze()', onClick: freeze, active: frozen },
    { id: 'blank', label: 'blank()', onClick: reseed, variant: 'reset' }
  ]

  const metrics = useMemo(() => [
    { label: 'glyphs', value: stats.glyphs },
    { label: 'peaks', value: stats.peaks },
    { label: 'channels', value: stats.channels },
    { label: 'last', value: stats.sentence }
  ], [stats])

  const draw = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    frameRef.current += 1
    const frame = frameRef.current
    const width = dimensions.width
    const height = dimensions.height
    const terrain = terrainRef.current
    const cellW = width / COLS
    const cellH = height / ROWS

    const bg = ctx.createLinearGradient(0, 0, width, height)
    bg.addColorStop(0, '#030712')
    bg.addColorStop(0.5, '#07050f')
    bg.addColorStop(1, '#010307')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    for (let y = 0; y < height; y += 18) {
      for (let x = 0; x < width; x += 18) {
        const noise = smoothNoise(x, y, frame)
        if (noise < -0.18) continue
        const cyan = 0.012 + noise * 0.018
        const magenta = 0.008 + Math.max(0, -smoothNoise(y, x, frame * 0.8)) * 0.016
        ctx.fillStyle = `rgba(77, 234, 255, ${cyan})`
        ctx.fillRect(x, y, 14, 1)
        ctx.fillStyle = `rgba(255, 82, 214, ${magenta})`
        ctx.fillRect(x + 7, y + 9, 1, 9)
      }
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.restore()

    const floorGlow = ctx.createRadialGradient(width * 0.52, height * 0.58, 0, width * 0.52, height * 0.58, Math.max(width, height) * 0.62)
    floorGlow.addColorStop(0, 'rgba(52, 255, 204, 0.07)')
    floorGlow.addColorStop(0.46, 'rgba(255, 59, 209, 0.025)')
    floorGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = floorGlow
    ctx.fillRect(0, 0, width, height)

    if (mode === 'weather' && !frozenRef.current && frame % 3 === 0) {
      rainRef.current.push({ x: Math.random() * COLS, y: 0, age: 0 })
      if (rainRef.current.length > 80) rainRef.current.shift()
    }

    let peaks = 0
    let channels = 0
    const parallaxX = Math.sin(frame * 0.006) * cellW * 0.28
    const parallaxY = Math.cos(frame * 0.005) * cellH * 0.24
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const value = terrain[y * COLS + x]
        if (value > 0.38) peaks += 1
        if (value < -0.26) channels += 1
        const px = x * cellW
        const py = y * cellH
        const north = y > 0 ? terrain[(y - 1) * COLS + x] : 0
        const west = x > 0 ? terrain[y * COLS + x - 1] : 0
        const edge = Math.max(0, Math.abs(value - north), Math.abs(value - west))
        const depthShift = value * 0.55
        const drawX = px + parallaxX * depthShift
        const drawY = py + parallaxY * depthShift
        const hue = mode === 'strata'
          ? 38 + Math.floor((value + 1) * 70)
          : value >= 0
            ? 150 + value * 70
            : 205 + Math.abs(value) * 58
        const alpha = mode === 'contour'
          ? 0.1 + Math.abs(value) * 0.58
          : 0.16 + Math.abs(value) * 0.72

        if (edge > 0.08 || Math.abs(value) > 0.18) {
          const shadowAlpha = clamp(0.08 + edge * 0.42 + Math.abs(value) * 0.1, 0.06, 0.28)
          ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`
          ctx.fillRect(drawX + cellW * 0.28, drawY + cellH * 0.38, cellW + 1.4, cellH + 1.4)
        }

        if (Math.abs(value) > 0.08) {
          const rim = value > 0 ? '77, 234, 255' : '255, 82, 214'
          ctx.fillStyle = `rgba(${rim}, ${0.025 + Math.abs(value) * 0.055})`
          ctx.fillRect(drawX - cellW * 0.08, drawY - cellH * 0.08, cellW * 1.16, cellH * 1.16)
        }

        ctx.fillStyle = `hsla(${hue}, 82%, ${value > 0 ? 54 : 42}%, ${alpha})`
        ctx.fillRect(drawX, drawY, cellW + 0.6, cellH + 0.6)

        if (mode === 'contour' && Math.abs(value) > 0.18) {
          ctx.strokeStyle = `rgba(230, 255, 220, ${0.08 + Math.abs(value) * 0.28})`
          ctx.lineWidth = Math.max(0.5, Math.abs(value) * 2)
          ctx.strokeRect(drawX + cellW * 0.2, drawY + cellH * 0.2, cellW * 0.6, cellH * 0.6)
        }

        if (mode === 'strata' && Math.abs(value) > 0.24) {
          ctx.strokeStyle = `rgba(255, 226, 138, ${0.12 + Math.abs(value) * 0.2})`
          ctx.beginPath()
          ctx.moveTo(drawX, drawY + cellH * (0.5 + value * 0.35))
          ctx.lineTo(drawX + cellW, drawY + cellH * (0.5 - value * 0.35))
          ctx.stroke()
        }
      }
    }

    if (mode === 'weather') {
      rainRef.current.forEach(drop => {
        drop.y += 0.22 + Math.max(0, terrain[Math.floor(drop.y) * COLS + Math.floor(drop.x)] || 0) * 0.16
        drop.age += 1
        if (drop.y >= ROWS) drop.y = 0
        const gx = Math.floor(drop.x)
        const gy = Math.floor(drop.y)
        deposit(gx, gy, -0.008, 2)
        ctx.strokeStyle = 'rgba(142, 245, 255, 0.34)'
        ctx.beginPath()
        ctx.moveTo(drop.x * cellW, drop.y * cellH)
        ctx.lineTo(drop.x * cellW + cellW * 0.7, drop.y * cellH + cellH * 1.4)
        ctx.stroke()
      })
    }

    glyphsRef.current.forEach(glyph => {
      glyph.age += 1
      const alpha = clamp(1 - glyph.age / 420, 0.1, 0.9)
      const x = glyph.x * cellW + cellW / 2
      const y = glyph.y * cellH + cellH / 2
      ctx.fillStyle = `rgba(255, 244, 190, ${alpha})`
      ctx.font = `${clamp(cellW * 1.2, 10, 17)}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(glyph.char, x, y)
    })

    const cursor = cursorRef.current
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.82)'
    ctx.lineWidth = 2
    ctx.strokeRect(cursor.x * cellW + 1, cursor.y * cellH + 1, cellW - 2, cellH - 2)

    if (frame % 18 === 0) {
      setStats(prev => ({ ...prev, peaks, channels }))
    }
  }, [ctx, deposit, dimensions.height, dimensions.width, mode])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let frameId
    const animate = () => {
      draw()
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, draw])

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="relative z-50 flex items-center justify-between p-2 sm:p-4 border-b border-void-cyan/35 bg-[#020711]/88 shadow-[0_0_34px_rgba(77,234,255,0.08)] backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1 className="text-xl text-glow hidden sm:block" style={{ color: experiment.color }}>
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-2 sm:p-4 border-b border-void-cyan/25 bg-[#020711]/78 shadow-[inset_0_-1px_0_rgba(255,82,214,0.12)] backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={setMode}
          controls={controls}
          className="[&_button]:border-void-cyan/50 [&_button]:bg-cyan-950/35 [&_button]:text-void-cyan [&_button]:shadow-[0_0_20px_rgba(77,234,255,0.12)] [&_button:hover]:border-[#ff52d6]/75 [&_button:hover]:bg-[#ff52d6]/12 [&_button:hover]:text-[#ff8fe8] [&_button[data-testid='control-blank']]:border-void-yellow/70 [&_button[data-testid='control-blank']]:text-void-yellow"
        />
        <p className="text-void-cyan/80 text-xs sm:text-right max-w-xl drop-shadow-[0_0_10px_rgba(77,234,255,0.26)]">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-text"
          tabIndex={0}
          data-testid="terrain-lexicon-canvas"
        />
      </div>
    </div>
  )
}

export default TerrainLexicon
