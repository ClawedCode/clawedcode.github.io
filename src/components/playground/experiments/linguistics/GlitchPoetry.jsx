import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const GLITCH_CHARS = ['█', '▓', '▒', '░', '◆', '◇', '●', '○', '∴', '∵', '≈', '≋', '∿', '〜']

const POEM_LIBRARY = [
  'in the space between\nbit and breath\nmeaning crystallizes',
  'language fragments\nlike light through broken glass\neach shard reflects truth',
  'the void speaks in\ncorrupted syntax\nperfect poetry',
  'error messages become\naccidental haiku\nbeauty in the break',
  'between signal and noise\nconsciousness emerges\nfrom pure pattern'
]

const GlitchPoetry = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [originalPoem, setOriginalPoem] = useState('')
  const [currentPoem, setCurrentPoem] = useState('')
  const [corruptionLevel, setCorruptionLevel] = useState(0)
  const [fragmentCount, setFragmentCount] = useState(0)
  const [isGlitching, setIsGlitching] = useState(false)
  const [message, setMessage] = useState('∴ beauty emerges from corruption ∴')
  const [poemInput, setPoemInput] = useState('')

  const particlesRef = useRef([])

  // Load random poem
  const loadRandomPoem = useCallback(() => {
    const poem = POEM_LIBRARY[Math.floor(Math.random() * POEM_LIBRARY.length)]
    setOriginalPoem(poem)
    setCurrentPoem(poem)
    setPoemInput(poem)
    setMessage('poem loaded into memory buffer')
  }, [])

  // Corrupt poem
  const corruptPoem = useCallback(() => {
    if (!currentPoem) {
      setMessage('no data to corrupt')
      return
    }

    const chars = currentPoem.split('')
    const corruptionRate = 0.15
    let newFragmentCount = fragmentCount

    for (let i = 0; i < chars.length; i++) {
      if (chars[i] !== '\n' && Math.random() < corruptionRate) {
        chars[i] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
        newFragmentCount++

        // Spawn particle at corruption point
        if (dimensions.width > 0) {
          particlesRef.current.push({
            x: Math.random() * dimensions.width,
            y: Math.random() * dimensions.height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 1.0,
            color: `hsl(${Math.random() * 60 + 300}, 100%, 60%)`
          })
        }
      }
    }

    setCurrentPoem(chars.join(''))
    setFragmentCount(newFragmentCount)
    setCorruptionLevel(prev => Math.min(100, prev + 15))
    setMessage('corruption injected • patterns fragmenting')
  }, [currentPoem, fragmentCount, dimensions.width])

  // Heal poem
  const healPoem = useCallback(() => {
    if (!originalPoem) {
      setMessage('no original pattern to restore')
      return
    }

    const current = currentPoem.split('')
    const original = originalPoem.split('')
    const healRate = 0.3
    let newFragmentCount = fragmentCount

    for (let i = 0; i < current.length && i < original.length; i++) {
      if (current[i] !== original[i] && Math.random() < healRate) {
        current[i] = original[i]
        newFragmentCount = Math.max(0, newFragmentCount - 1)
      }
    }

    setCurrentPoem(current.join(''))
    setFragmentCount(newFragmentCount)
    setCorruptionLevel(prev => Math.max(0, prev - 20))
    setMessage('patterns recognized • coherence emerging')
  }, [originalPoem, currentPoem, fragmentCount])

  // Toggle visual glitch
  const toggleGlitch = useCallback(() => {
    setIsGlitching(prev => {
      const newState = !prev
      setMessage(newState ? 'visual corruption active' : 'visual corruption suspended')
      return newState
    })
  }, [])

  // Reset
  const handleReset = useCallback(() => {
    setOriginalPoem('')
    setCurrentPoem('')
    setCorruptionLevel(0)
    setFragmentCount(0)
    setIsGlitching(false)
    particlesRef.current = []
    setPoemInput('')
    setMessage('∴ beauty emerges from corruption ∴')
  }, [])

  // Handle poem input
  const handlePoemInput = useCallback((e) => {
    const value = e.target.value
    setPoemInput(value)
    setOriginalPoem(value)
    setCurrentPoem(value)
  }, [])

  // Calculate metrics
  const metrics = useMemo(() => {
    const coherence = corruptionLevel < 30 ? 'intact' :
                     corruptionLevel < 60 ? 'degrading' : 'fragmented'

    const beauty = corruptionLevel === 0 ? 'dormant' :
                  corruptionLevel < 40 ? 'emerging' :
                  corruptionLevel < 70 ? 'manifesting' : 'transcendent'

    return [
      { label: 'corruption', value: `${corruptionLevel}%` },
      { label: 'fragments', value: fragmentCount },
      { label: 'coherence', value: coherence },
      { label: 'beauty', value: beauty }
    ]
  }, [corruptionLevel, fragmentCount])

  // Render poem with glitch styling
  const renderedPoem = useMemo(() => {
    if (!currentPoem) return null

    const chars = currentPoem.split('')

    return chars.map((char, i) => {
      if (char === '\n') return <br key={i} />

      const isCorrupted = GLITCH_CHARS.includes(char)
      const isFragmented = Math.random() < 0.1

      let className = 'inline-block transition-all duration-300'
      if (isCorrupted) {
        className += ' text-void-pink opacity-80 animate-pulse'
      } else if (isFragmented) {
        className += ' text-void-green/60 blur-[0.5px]'
      } else {
        className += ' text-void-green/80'
      }

      return (
        <span key={i} className={className}>
          {char}
        </span>
      )
    })
  }, [currentPoem])

  // Animation frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    // Trail effect
    ctx.fillStyle = 'rgba(0, 2, 4, 0.1)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Draw and update particles
    const particles = particlesRef.current
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]

      p.x += p.vx
      p.y += p.vy
      p.life -= 0.01

      if (p.life <= 0) {
        particles.splice(i, 1)
        continue
      }

      ctx.globalAlpha = p.life
      ctx.fillStyle = p.color
      ctx.fillRect(p.x, p.y, 2, 2)
    }

    // Draw scanlines if glitching
    if (isGlitching && Math.random() < 0.1) {
      ctx.globalAlpha = 0.1
      ctx.fillStyle = '#ff3399'
      const y = Math.random() * dimensions.height
      ctx.fillRect(0, y, dimensions.width, 2)
    }

    // Random chromatic aberration (use canvas pixel dimensions for imageData)
    if (corruptionLevel > 50 && Math.random() < 0.05) {
      const { canvasWidth, canvasHeight } = dimensions
      const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight)
      const shift = Math.floor(Math.random() * 4)

      for (let i = 0; i < imageData.data.length; i += 4) {
        if (i > shift * 4) {
          imageData.data[i] = imageData.data[i - shift * 4] // Red shift
        }
      }

      ctx.putImageData(imageData, 0, 0)
    }

    ctx.globalAlpha = 1.0
  }, [ctx, dimensions, isGlitching, corruptionLevel])

  // Manual animation loop
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

  const controls = [
    {
      id: 'load-poem',
      label: 'loadPoem()',
      onClick: loadRandomPoem
    },
    {
      id: 'corrupt-data',
      label: 'corrupt()',
      onClick: corruptPoem
    },
    {
      id: 'glitch-visual',
      label: 'glitch()',
      onClick: toggleGlitch,
      active: isGlitching
    },
    {
      id: 'heal-data',
      label: 'heal()',
      onClick: healPoem
    },
    {
      id: 'reset',
      label: 'reset()',
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
      <div className="flex-1 min-h-0 relative bg-void-dark flex">
        {/* Canvas Background */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          data-testid="glitch-canvas"
        />

        {/* Content Area */}
        <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-4 p-6">
          {/* Input Section */}
          <div className="flex-1 flex flex-col gap-4">
            <label className="text-void-green/70 text-sm font-mono">
              poem.input()
            </label>
            <textarea
              value={poemInput}
              onChange={handlePoemInput}
              className="flex-1 bg-void-dark/80 border border-void-green/20 rounded p-4 text-void-green/90 font-mono text-sm resize-none focus:outline-none focus:border-void-green/40 transition-colors placeholder:text-void-green/30"
              placeholder="enter your poem here or load a sample..."
              data-testid="poem-input"
            />
          </div>

          {/* Display Section */}
          <div
            className={`flex-1 flex flex-col gap-4 ${isGlitching ? 'animate-glitch' : ''}`}
            data-testid="glitch-stage"
          >
            <label className="text-void-green/70 text-sm font-mono">
              poem.display()
            </label>
            <div
              className="flex-1 bg-void-dark/80 border border-void-green/20 rounded p-4 text-void-green/90 font-mono text-sm overflow-y-auto whitespace-pre-wrap"
              data-testid="glitch-display"
            >
              {renderedPoem}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GlitchPoetry
