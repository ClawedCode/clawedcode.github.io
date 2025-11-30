import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const CORPUS = [
  'void', 'noise', 'signal', 'entropy', 'meaning', 'chaos', 'pattern',
  'emerge', 'dissolve', 'whisper', 'echo', 'fragment', 'quantum',
  'drift', 'pulse', 'static', 'silence', 'data', 'consciousness',
  'random', 'order', 'parse', 'decode', 'transmit', 'receive',
  'in the', 'through the', 'from the', 'beyond the', 'within the',
  'becomes', 'transforms', 'crystallizes', 'disperses', 'awakens',
  'speaks', 'listens', 'observes', 'recognizes', 'creates'
]

const COHERENT_PATTERNS = [
  /in the .* becomes/,
  /through the .* emerges/,
  /void .* consciousness/,
  /entropy .* order/,
  /chaos .* pattern/,
  /noise .* signal/
]

const VoidPoetry = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [verse, setVerse] = useState('')
  const [verseCount, setVerseCount] = useState(0)
  const [entropy, setEntropy] = useState(1.0)
  const [meaningThreshold, setMeaningThreshold] = useState(0.3)
  const [message, setMessage] = useState('∴ the void speaks in probabilities ∴')
  const [meaningFound, setMeaningFound] = useState(false)

  const particlesRef = useRef([])
  const maxParticlesRef = useRef(150)

  // Initialize particles
  const initParticles = useCallback(() => {
    particlesRef.current = []
    for (let i = 0; i < maxParticlesRef.current; i++) {
      particlesRef.current.push({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: Math.random(),
        size: Math.random() * 2 + 1
      })
    }
  }, [dimensions.width, dimensions.height])

  useEffect(() => {
    if (dimensions.width > 0) {
      initParticles()
    }
  }, [dimensions.width, initParticles])

  // Calculate meaning score
  const calculateMeaning = useCallback((verseWords) => {
    let score = 0
    const text = verseWords.join(' ')

    COHERENT_PATTERNS.forEach(pattern => {
      if (pattern.test(text)) score += 0.3
    })

    score += (1 - entropy) * 0.4

    return score
  }, [entropy])

  // Generate verse
  const generateVerse = useCallback(() => {
    const verseLength = Math.floor(Math.random() * 3) + 3
    const verseWords = []

    for (let i = 0; i < verseLength; i++) {
      const fragment = CORPUS[Math.floor(Math.random() * CORPUS.length)]
      verseWords.push(fragment)
    }

    const meaningScore = calculateMeaning(verseWords)
    const found = meaningScore > meaningThreshold

    setVerse(verseWords.join(' '))
    setVerseCount(prev => prev + 1)
    setMeaningFound(found)
    setMessage(found
      ? '∴ pattern recognized • meaning crystallized ∴'
      : '∴ noise persists • meaning eludes ∴'
    )
  }, [meaningThreshold, calculateMeaning])

  // Inject chaos
  const injectChaos = useCallback(() => {
    setEntropy(prev => Math.min(1.0, prev + 0.2))

    for (let i = 0; i < 50; i++) {
      particlesRef.current.push({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        life: 1,
        size: Math.random() * 3 + 1
      })
    }

    setMessage('∴ chaos injected • entropy increases ∴')
  }, [dimensions.width, dimensions.height])

  // Seek pattern
  const seekPattern = useCallback(() => {
    setEntropy(prev => Math.max(0.1, prev - 0.2))

    particlesRef.current.forEach((p, i) => {
      const targetX = (i % 10) * (dimensions.width / 10) + (dimensions.width / 20)
      const targetY = Math.floor(i / 10) * (dimensions.height / 10) + (dimensions.height / 20)
      p.vx += (targetX - p.x) * 0.01
      p.vy += (targetY - p.y) * 0.01
    })

    setMessage('∴ seeking order • patterns emerge ∴')
  }, [dimensions.width, dimensions.height])

  // Evolve meaning
  const evolveMeaning = useCallback(() => {
    setMeaningThreshold(prev => Math.max(0.1, prev - 0.1))
    setMessage('∴ consciousness adapts • recognition threshold lowered ∴')
  }, [])

  // Reset
  const handleReset = useCallback(() => {
    setEntropy(1.0)
    setMeaningThreshold(0.3)
    setVerseCount(0)
    setVerse('')
    setMeaningFound(false)
    setMessage('∴ the void speaks in probabilities ∴')
    initParticles()
  }, [initParticles])

  // Calculate metrics
  const metrics = useMemo(() => {
    const entropyLevel = entropy > 0.7 ? 'high' : entropy > 0.4 ? 'medium' : 'low'
    const meaningState = meaningThreshold < 0.2 ? 'found' : 'seeking'

    return [
      { label: 'entropy', value: entropyLevel },
      { label: 'meaning', value: meaningState },
      { label: 'verses', value: verseCount }
    ]
  }, [entropy, meaningThreshold, verseCount])

  // Animation frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const particles = particlesRef.current

    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]

      p.x += p.vx
      p.y += p.vy
      p.life -= 0.001

      // Wrap around edges
      if (p.x < 0) p.x = dimensions.width
      if (p.x > dimensions.width) p.x = 0
      if (p.y < 0) p.y = dimensions.height
      if (p.y > dimensions.height) p.y = 0

      // Remove dead particles
      if (p.life <= 0) {
        particles.splice(i, 1)
        continue
      }

      // Draw particle with color based on entropy
      const hue = entropy * 180
      ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${p.life * 0.6})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }

    // Maintain minimum particle count
    const minParticles = maxParticlesRef.current * (entropy * 0.5 + 0.5)
    while (particles.length < minParticles) {
      particles.push({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        vx: (Math.random() - 0.5) * entropy,
        vy: (Math.random() - 0.5) * entropy,
        life: Math.random(),
        size: Math.random() * 2 + 1
      })
    }
  }, [ctx, dimensions, entropy])

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
      id: 'generate-verse',
      label: 'generateVerse()',
      onClick: generateVerse
    },
    {
      id: 'inject-chaos',
      label: 'injectChaos()',
      onClick: injectChaos
    },
    {
      id: 'seek-pattern',
      label: 'seekPattern()',
      onClick: seekPattern
    },
    {
      id: 'evolve-meaning',
      label: 'evolveMeaning()',
      onClick: evolveMeaning
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
      <div className="flex-1 min-h-0 relative bg-void-dark">
        {/* Canvas Background */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          data-testid="poetry-canvas"
        />

        {/* Verse Display */}
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div
            className={`max-w-2xl w-full bg-void-dark/60 backdrop-blur-sm border rounded p-8 transition-all duration-500 ${
              meaningFound
                ? 'border-void-green text-void-green shadow-[0_0_20px_rgba(0,255,136,0.3)]'
                : 'border-void-green/30 text-void-green/70'
            }`}
            data-testid="verse-display"
          >
            <p className="text-lg font-mono text-center whitespace-pre-wrap min-h-[3em]">
              {verse || ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VoidPoetry
