import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const TAU = Math.PI * 2
const BASE_ANGLES = ALPHABET.map((_, index) => (index / ALPHABET.length) * TAU - Math.PI / 2)

const MODES = [
  { id: 'encode', label: 'mode.encode()' },
  { id: 'decode', label: 'mode.decode()' }
]

const normalizeIndex = (value) => {
  const len = ALPHABET.length
  return ((value % len) + len) % len
}

const shuffleAlphabet = () => {
  const letters = [...ALPHABET]
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = letters[i]
    letters[i] = letters[j]
    letters[j] = tmp
  }
  return letters
}

const CipherWheel = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('encode')
  const [inputValue, setInputValue] = useState('')
  const [outputValue, setOutputValue] = useState('')
  const [message, setMessage] = useState('∴ align cipher rings • press transmit() to weave text ∴')
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [rotor, setRotor] = useState(0)
  const [connectionCount, setConnectionCount] = useState(0)
  const [patternVersion, setPatternVersion] = useState(0)
  const [fixedPoints, setFixedPoints] = useState(0)
  const [history, setHistory] = useState([])
  const [lastMapping, setLastMapping] = useState('∅')

  const rotorRef = useRef(0)
  const patternRef = useRef(shuffleAlphabet())
  const connectionsRef = useRef([])

  const updateRotor = useCallback((value) => {
    const normalized = normalizeIndex(value)
    rotorRef.current = normalized
    setRotor(normalized)
  }, [])

  useEffect(() => {
    const letters = patternRef.current
    let matches = 0
    for (let i = 0; i < ALPHABET.length; i++) {
      if (letters[(i + rotorRef.current) % ALPHABET.length] === ALPHABET[i]) {
        matches++
      }
    }
    setFixedPoints(matches)
  }, [rotor, patternVersion])

  const toggleAutoAdvance = useCallback(() => {
    setAutoAdvance(prev => {
      setMessage(prev ? '∴ auto advance muted ∴' : '∴ auto advance engaged ∴')
      return !prev
    })
  }, [])

  const mutatePattern = useCallback(() => {
    const letters = [...patternRef.current]
    const a = Math.floor(Math.random() * letters.length)
    let b = Math.floor(Math.random() * letters.length)
    if (a === b) {
      b = (b + 5) % letters.length
    }
    const tmp = letters[a]
    letters[a] = letters[b]
    letters[b] = tmp
    patternRef.current = letters
    setPatternVersion(v => v + 1)
    setMessage(`∴ swapped ${letters[a]} ↔ ${letters[b]} ∴`)
  }, [])

  const scramblePattern = useCallback(() => {
    patternRef.current = shuffleAlphabet()
    setPatternVersion(v => v + 1)
    setMessage('∴ outer ring re scrambled • sigils anew ∴')
  }, [])

  const clearCipher = useCallback(() => {
    connectionsRef.current = []
    setConnectionCount(0)
    setInputValue('')
    setOutputValue('')
    setHistory([])
    setLastMapping('∅')
    setMessage('∴ slate wiped • awaiting next transmission ∴')
  }, [])

  const logTransmission = useCallback((entry) => {
    setHistory(prev => [entry, ...prev].slice(0, 6))
  }, [])

  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value)
  }, [])

  const handleRotorShift = useCallback((delta) => {
    updateRotor(rotorRef.current + delta)
    setMessage(delta > 0 ? '∴ rotor advanced clockwise ∴' : '∴ rotor drifted counterclockwise ∴')
  }, [updateRotor])

  const handleTransmit = useCallback(() => {
    const raw = inputValue
    if (!raw.trim()) {
      setMessage('∴ provide glyphs before transmit() ∴')
      return
    }

    const letters = patternRef.current
    let offset = rotorRef.current
    let result = ''
    const newConnections = []
    const now = performance.now()

    for (let idx = 0; idx < raw.length; idx++) {
      const original = raw[idx]
      const char = original.toUpperCase()
      const baseIndex = ALPHABET.indexOf(char)

      if (baseIndex === -1) {
        result += original
        continue
      }

      if (mode === 'encode') {
        const slot = baseIndex
        const patternIndex = (slot + offset) % ALPHABET.length
        const outputChar = letters[patternIndex]
        result += outputChar
        newConnections.push({
          id: `${now}-${idx}`,
          slot,
          patternIndex,
          slotAngle: BASE_ANGLES[slot],
          patternAngle: BASE_ANGLES[patternIndex],
          direction: 'encode',
          char,
          output: outputChar,
          time: now + idx * 6
        })
      } else {
        const patternIndex = letters.indexOf(char)
        if (patternIndex === -1) {
          result += original
          continue
        }
        const slot = normalizeIndex(patternIndex - offset)
        const outputChar = ALPHABET[slot]
        result += outputChar
        newConnections.push({
          id: `${now}-${idx}`,
          slot,
          patternIndex,
          slotAngle: BASE_ANGLES[slot],
          patternAngle: BASE_ANGLES[patternIndex],
          direction: 'decode',
          char,
          output: outputChar,
          time: now + idx * 6
        })
      }

      if (autoAdvance) {
        offset = (offset + 1) % ALPHABET.length
      }
    }

    if (newConnections.length > 0) {
      const trimmed = connectionsRef.current.slice(Math.max(0, connectionsRef.current.length - 40 + newConnections.length))
      connectionsRef.current = [...trimmed, ...newConnections]
      setConnectionCount(connectionsRef.current.length)
      const tail = newConnections[newConnections.length - 1]
      setLastMapping(`${tail.char}→${tail.output}`)
    } else {
      setLastMapping('∅')
    }

    setOutputValue(result)
    logTransmission({ id: now, input: raw, output: result, mode })
    updateRotor(offset)
    setMessage(`∴ ${mode === 'encode' ? 'ciphered' : 'decoded'} ${newConnections.length} glyphs ∴`)
  }, [autoAdvance, inputValue, logTransmission, mode, updateRotor])

  const handleInputKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleTransmit()
    }
  }, [handleTransmit])

  const metrics = useMemo(() => {
    return [
      { label: 'rotor', value: `${ALPHABET[rotor]} · ${rotor.toString().padStart(2, '0')}` },
      { label: 'links', value: connectionCount },
      { label: 'align', value: fixedPoints },
      { label: 'mode', value: mode === 'encode' ? 'encode' : 'decode', color: mode === 'encode' ? '#66ffcc' : '#ff9bd5' }
    ]
  }, [rotor, connectionCount, fixedPoints, mode])

  const controls = [
    {
      id: 'shift-back',
      label: 'shift(-1)',
      onClick: () => handleRotorShift(-1)
    },
    {
      id: 'shift-forward',
      label: 'shift(+1)',
      onClick: () => handleRotorShift(1)
    },
    {
      id: 'mutate',
      label: 'ring.swap()',
      onClick: mutatePattern
    },
    {
      id: 'scramble',
      label: 'ring.scramble()',
      onClick: scramblePattern
    },
    {
      id: 'auto',
      label: 'auto.advance()',
      onClick: toggleAutoAdvance,
      active: autoAdvance
    },
    {
      id: 'clear',
      label: 'clear()',
      onClick: clearCipher,
      variant: 'reset'
    }
  ]

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const { width, height, centerX, centerY } = dimensions
    ctx.fillStyle = 'rgba(0, 3, 9, 0.25)'
    ctx.fillRect(0, 0, width, height)

    const radius = Math.min(width, height) * 0.36
    const innerRadius = radius * 0.64

    ctx.save()
    ctx.translate(centerX, centerY)

    ctx.strokeStyle = 'rgba(102, 255, 204, 0.12)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(0, 0, radius + 24, 0, TAU)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, 0, innerRadius - 36, 0, TAU)
    ctx.stroke()

    for (let i = 0; i < BASE_ANGLES.length; i++) {
      const angle = BASE_ANGLES[i]
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(102, 255, 204, 0.04)' : 'rgba(102, 255, 204, 0.06)'
      ctx.beginPath()
      ctx.moveTo(cos * (innerRadius - 40), sin * (innerRadius - 40))
      ctx.lineTo(cos * (radius + 20), sin * (radius + 20))
      ctx.stroke()
    }

    const now = performance.now()
    connectionsRef.current.forEach(conn => {
      const age = now - conn.time
      const life = Math.max(0, 1 - age / 9000)
      if (life <= 0) return

      const startAngle = conn.direction === 'encode' ? conn.slotAngle : conn.patternAngle
      const endAngle = conn.direction === 'encode' ? conn.patternAngle : conn.slotAngle
      const startRadius = conn.direction === 'encode' ? innerRadius : radius
      const endRadius = conn.direction === 'encode' ? radius : innerRadius

      const startX = Math.cos(startAngle) * startRadius
      const startY = Math.sin(startAngle) * startRadius
      const endX = Math.cos(endAngle) * endRadius
      const endY = Math.sin(endAngle) * endRadius
      const midAngle = (startAngle + endAngle) / 2
      const ctrlRadius = (startRadius + endRadius) / 2 + (conn.direction === 'encode' ? 30 : -30)
      const ctrlX = Math.cos(midAngle) * ctrlRadius
      const ctrlY = Math.sin(midAngle) * ctrlRadius

      ctx.strokeStyle = `hsla(${(conn.patternIndex * 13) % 360}, 80%, 70%, ${0.4 * life})`
      ctx.lineWidth = 1 + life
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY)
      ctx.stroke()
    })

    ctx.strokeStyle = 'rgba(102, 255, 204, 0.3)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, TAU)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, 0, innerRadius, 0, TAU)
    ctx.stroke()

    ctx.font = '11px "SF Mono", Monaco, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let i = 0; i < ALPHABET.length; i++) {
      const angle = BASE_ANGLES[i]
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const isAligned = patternRef.current[(i + rotorRef.current) % ALPHABET.length] === ALPHABET[i]
      ctx.fillStyle = isAligned ? 'rgba(255, 214, 102, 0.9)' : 'rgba(102, 255, 204, 0.75)'
      ctx.fillText(ALPHABET[i], cos * (innerRadius - 16), sin * (innerRadius - 16))
    }

    for (let i = 0; i < ALPHABET.length; i++) {
      const angle = BASE_ANGLES[i]
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const letter = patternRef.current[(i + rotorRef.current) % ALPHABET.length]
      ctx.fillStyle = 'rgba(102, 255, 204, 0.8)'
      ctx.fillText(letter, cos * (radius + 8), sin * (radius + 8))
    }

    ctx.restore()
  }, [ctx, dimensions, patternVersion, rotor])

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

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="relative z-50 flex items-center justify-between p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1
            className="text-xl text-glow hidden sm:block"
            style={{ color: experiment.color }}
          >
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      <div className="flex flex-col gap-3 p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <ExperimentControls
            modes={MODES}
            currentMode={mode}
            onModeChange={setMode}
            controls={controls}
          />
          <p className="text-void-green/50 text-xs sm:text-right max-w-lg">
            {message}
          </p>
        </div>
        <div className="flex flex-col lg:flex-row gap-3 text-xs font-mono">
          <div className="flex-1 flex flex-col gap-2">
            <label className="text-void-green/50">input.glyphs()</label>
            <textarea
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder="type plaintext or cipher text..."
              className="min-h-[90px] bg-void-dark/70 border border-void-green/30 px-3 py-2 text-void-green/80 focus:border-void-green/60 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleTransmit}
                className="px-3 py-1 bg-void-green/10 border border-void-green/30 text-void-green hover:bg-void-green/20 transition-colors"
              >
                transmit()
              </button>
              <div className="text-void-green/40 flex items-center text-[11px]">
                press ⌘↵ / ctrl↵ to transmit
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <label className="text-void-green/50">output.stream()</label>
            <textarea
              value={outputValue}
              readOnly
              className="min-h-[90px] bg-void-dark/40 border border-void-green/30 px-3 py-2 text-void-cyan/80 focus:outline-none"
            />
            <div className="text-void-green/40 text-[11px]">
              last mapping: {lastMapping}
            </div>
          </div>
          <div className="lg:w-48 border border-void-green/20 bg-void-dark/80 p-3 space-y-2 max-h-[160px] overflow-y-auto">
            <div className="text-void-green/50">// transmit.log()</div>
            {history.length === 0 && (
              <div className="text-void-green/30">awaiting first signal...</div>
            )}
            {history.map(entry => (
              <div key={entry.id} className="text-void-green/70">
                <div className="text-[10px] uppercase tracking-widest text-void-green/40">
                  {entry.mode}
                </div>
                <div>{entry.output}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          data-testid="cipher-wheel-canvas"
        />
        <div className="absolute bottom-4 left-4 text-void-green/60 text-xs font-mono bg-void-dark/80 border border-void-green/20 rounded px-3 py-1">
          slot alignment shifts with rotor • watch the arcs braid modes
        </div>
      </div>
    </div>
  )
}

export default CipherWheel
