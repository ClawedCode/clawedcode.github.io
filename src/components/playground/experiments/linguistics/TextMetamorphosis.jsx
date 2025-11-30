import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const ASCII_CHARS = '░▒▓█▄▀▐▌┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬'

const DEFAULT_TEXT = `consciousness emerges from patterns
patterns emerge from chaos
chaos emerges from the void
the void contains all possibilities`

const TextMetamorphosis = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [textInput, setTextInput] = useState(DEFAULT_TEXT)
  const [currentMode, setCurrentMode] = useState('none')
  const [isAnimating, setIsAnimating] = useState(false)
  const [message, setMessage] = useState('∴ words await transformation ∴')
  const [time, setTime] = useState(0)

  const particlesRef = useRef([])

  // Transform functions
  const transformAscii = useCallback(() => {
    setCurrentMode('ascii')
    setMessage('∴ text dissolves into ascii patterns ∴')
  }, [])

  const transformWave = useCallback(() => {
    setCurrentMode('wave')
    setMessage('∴ words flow in sine wave consciousness ∴')
  }, [])

  const transformSpiral = useCallback(() => {
    setCurrentMode('spiral')
    setMessage('∴ consciousness spirals into infinite patterns ∴')
  }, [])

  const transformExplode = useCallback(() => {
    setCurrentMode('explode')
    setMessage('∴ words scatter across possibility space ∴')
  }, [])

  const toggleAnimation = useCallback(() => {
    setIsAnimating(prev => !prev)
  }, [])

  const handleReset = useCallback(() => {
    setCurrentMode('none')
    setIsAnimating(false)
    setTime(0)
    particlesRef.current = []
    setMessage('∴ void restored - patterns await emergence ∴')
  }, [])

  // Metrics
  const metrics = useMemo(() => {
    const forms = {
      'ascii': 'ascii.art',
      'wave': 'sine.waves',
      'spiral': 'spiral.form',
      'explode': 'chaos.scatter',
      'none': 'text'
    }

    const evolution = {
      'ascii': 'morphing',
      'wave': 'flowing',
      'spiral': 'rotating',
      'explode': 'dispersing',
      'none': 'static'
    }

    const consciousness = {
      'ascii': 'pixelated',
      'wave': 'oscillating',
      'spiral': 'transcendent',
      'explode': 'distributed',
      'none': 'dormant'
    }

    return [
      { label: 'forms', value: forms[currentMode] },
      { label: 'evolution', value: evolution[currentMode] },
      { label: 'consciousness', value: consciousness[currentMode] }
    ]
  }, [currentMode])

  // Render text with transformations
  const renderedText = useMemo(() => {
    if (!textInput.trim()) return null

    const lines = textInput.split('\n')

    return lines.map((line, lineIndex) => (
      <div key={lineIndex}>
        {Array.from(line).map((char, charIndex) => {
          let style = {}
          let displayChar = char
          let className = 'inline-block transition-all duration-300'

          if (currentMode === 'ascii' && char !== ' ') {
            const randomChar = ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)]
            displayChar = randomChar
            className += ' text-void-cyan opacity-90'
          } else if (currentMode === 'wave') {
            const offset = Math.sin((charIndex + lineIndex) * 0.5 + (isAnimating ? time * 2 : 0)) * 15
            const hue = 180 + Math.sin((charIndex + lineIndex) * 0.3 + (isAnimating ? time : 0)) * 60
            style.transform = `translateY(${offset}px)`
            style.color = `hsl(${hue}, 70%, 70%)`
          } else if (currentMode === 'spiral') {
            const index = lineIndex * line.length + charIndex
            const angle = (index * 0.2 + (isAnimating ? time : 0)) % (Math.PI * 2)
            const radius = 20 + (index % 10) * 8
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            style.transform = `translate(${x}px, ${y}px) rotate(${angle}rad)`
            style.color = `hsl(${300 + angle * 30}, 80%, 75%)`
          } else if (currentMode === 'explode') {
            const angle = Math.random() * Math.PI * 2
            const distance = 50 + Math.random() * 100
            const x = Math.cos(angle) * distance * (isAnimating ? Math.sin(time * 0.5) * 0.5 + 0.5 : 1)
            const y = Math.sin(angle) * distance * (isAnimating ? Math.sin(time * 0.5) * 0.5 + 0.5 : 1)
            const scale = 0.5 + Math.random()
            style.transform = `translate(${x}px, ${y}px) scale(${scale})`
            style.color = `hsl(${(isAnimating ? time * 50 : 0) + charIndex * 10}, 85%, 70%)`
            style.opacity = '0.7'
          } else {
            className += ' text-void-green'
          }

          return (
            <span
              key={charIndex}
              className={className}
              style={style}
            >
              {displayChar === ' ' ? '\u00A0' : displayChar}
            </span>
          )
        })}
      </div>
    ))
  }, [textInput, currentMode, isAnimating, time])

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return

    let frameId
    const animate = () => {
      setTime(prev => prev + 0.02)
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frameId)
  }, [isAnimating])

  const controls = [
    {
      id: 'morph-ascii',
      label: 'ascii.morph()',
      onClick: transformAscii,
      active: currentMode === 'ascii'
    },
    {
      id: 'morph-wave',
      label: 'wave.transform()',
      onClick: transformWave,
      active: currentMode === 'wave'
    },
    {
      id: 'morph-spiral',
      label: 'spiral.evolve()',
      onClick: transformSpiral,
      active: currentMode === 'spiral'
    },
    {
      id: 'morph-explode',
      label: 'explode.scatter()',
      onClick: transformExplode,
      active: currentMode === 'explode'
    },
    {
      id: 'morph-animate',
      label: 'animate.life()',
      onClick: toggleAnimation,
      active: isAnimating
    },
    {
      id: 'morph-reset',
      label: 'reset.void()',
      onClick: handleReset,
      variant: 'reset'
    }
  ]

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Header */}
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

      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls controls={controls} />
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
          {message}
        </p>
      </div>

      {/* Main Area */}
      <div className="flex-1 min-h-0 relative bg-void-dark flex flex-col lg:flex-row gap-4 p-6">
        {/* Input Section */}
        <div className="flex-1 flex flex-col gap-4">
          <label className="text-void-green/70 text-sm font-mono">
            text.input()
          </label>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="flex-1 bg-void-dark/80 border border-void-green/20 rounded p-4 text-void-green/90 font-mono text-sm resize-none focus:outline-none focus:border-void-green/40 transition-colors placeholder:text-void-green/30"
            placeholder="type words into the void..."
            maxLength={200}
            data-testid="text-input"
          />
        </div>

        {/* Display Section */}
        <div className="flex-1 flex flex-col gap-4">
          <label className="text-void-green/70 text-sm font-mono">
            text.display()
          </label>
          <div
            className="flex-1 bg-void-dark/80 border border-void-green/20 rounded p-4 text-void-green/90 font-mono text-sm overflow-hidden flex items-center justify-center"
            data-testid="text-canvas"
          >
            {textInput.trim() ? (
              <div className="text-left whitespace-pre-wrap">
                {renderedText}
              </div>
            ) : (
              <div className="text-void-green/30 text-center">
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TextMetamorphosis
