import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

// Similar characters for mutations
const mutations = {
  'a': ['4', '@', 'α', 'ä', 'á'],
  'e': ['3', '€', 'ε', 'ē', 'é'],
  'i': ['1', '!', 'ι', 'í', 'ï'],
  'o': ['0', 'ø', 'ω', 'ó', 'ö'],
  'u': ['v', 'μ', 'ü', 'ú', 'û'],
  's': ['$', '5', 'ς', 'š'],
  't': ['7', '†', 'τ', 'ť'],
  'l': ['1', '|', 'ł'],
  'b': ['8', 'β', 'þ'],
  'g': ['9', 'ğ'],
  'z': ['2', 'ž'],
  'n': ['ñ', 'η', 'ń'],
  'c': ['ç', 'ć', '©'],
  'p': ['þ', 'ρ'],
  'r': ['®', 'ř'],
  'h': ['#', 'ħ'],
  'd': ['đ', 'ð'],
  'f': ['ƒ'],
  'k': ['κ'],
  'm': ['μ'],
  'w': ['ω', 'ŵ'],
  'y': ['ý', 'ÿ', 'γ'],
}

const SemanticDrift = ({ category, experiment }) => {
  const [wordInput, setWordInput] = useState('')
  const [originalWord, setOriginalWord] = useState('')
  const [currentWord, setCurrentWord] = useState('')
  const [driftRate, setDriftRate] = useState(0.02)
  const [isActive, setIsActive] = useState(false)
  const [totalMutations, setTotalMutations] = useState(0)
  const [driftAmount, setDriftAmount] = useState(0)
  const [history, setHistory] = useState([])

  const driftIntervalRef = useRef(null)
  const mutatingRef = useRef(new Set())

  // Start/stop drift
  const startDrift = useCallback(() => {
    const input = wordInput.trim()
    if (!input) return

    if (isActive && originalWord === input) {
      // Stop current drift
      if (driftIntervalRef.current) {
        clearInterval(driftIntervalRef.current)
        driftIntervalRef.current = null
      }
      setIsActive(false)
      return
    }

    // Start new drift
    setOriginalWord(input)
    setCurrentWord(input)
    setTotalMutations(0)
    setDriftAmount(0)
    setHistory([])
    setIsActive(true)
  }, [wordInput, originalWord, isActive])

  // Drift interval effect
  useEffect(() => {
    if (!isActive) {
      if (driftIntervalRef.current) {
        clearInterval(driftIntervalRef.current)
        driftIntervalRef.current = null
      }
      return
    }

    driftIntervalRef.current = setInterval(() => {
      // Attempt mutation based on drift rate
      if (Math.random() < driftRate) {
        setCurrentWord(prev => {
          const chars = prev.split('')
          const eligibleIndices = []

          // Find characters that can mutate
          chars.forEach((char, i) => {
            const lower = char.toLowerCase()
            if (mutations[lower] && Math.random() < 0.5) {
              eligibleIndices.push(i)
            }
          })

          if (eligibleIndices.length === 0) return prev

          // Pick random character to mutate
          const index = eligibleIndices[Math.floor(Math.random() * eligibleIndices.length)]
          const char = chars[index].toLowerCase()
          const options = mutations[char]

          if (options && options.length > 0) {
            const newChar = options[Math.floor(Math.random() * options.length)]
            const oldWord = prev
            chars[index] = newChar
            const newWord = chars.join('')

            // Add to history
            setHistory(prevHistory => {
              const newHistory = [{
                from: oldWord,
                to: newWord
              }, ...prevHistory]
              return newHistory.slice(0, 10)
            })

            // Mark as mutating
            mutatingRef.current.add(index)
            setTimeout(() => {
              mutatingRef.current.delete(index)
            }, 500)

            setTotalMutations(prev => prev + 1)

            return newWord
          }

          return prev
        })
      }
      setDriftAmount(prev => prev + driftRate)
    }, 1000)

    return () => {
      if (driftIntervalRef.current) {
        clearInterval(driftIntervalRef.current)
      }
    }
  }, [isActive, driftRate])

  // Mutate word (for manual mutations like chaos)
  const mutateWord = useCallback(() => {
    setCurrentWord(prev => {
      const chars = prev.split('')
      const eligibleIndices = []

      // Find characters that can mutate
      chars.forEach((char, i) => {
        const lower = char.toLowerCase()
        if (mutations[lower] && Math.random() < 0.5) {
          eligibleIndices.push(i)
        }
      })

      if (eligibleIndices.length === 0) return prev

      // Pick random character to mutate
      const index = eligibleIndices[Math.floor(Math.random() * eligibleIndices.length)]
      const char = chars[index].toLowerCase()
      const options = mutations[char]

      if (options && options.length > 0) {
        const newChar = options[Math.floor(Math.random() * options.length)]
        const oldWord = prev
        chars[index] = newChar
        const newWord = chars.join('')

        // Add to history
        setHistory(prevHistory => {
          const newHistory = [{
            from: oldWord,
            to: newWord
          }, ...prevHistory]
          return newHistory.slice(0, 10)
        })

        // Mark as mutating
        mutatingRef.current.add(index)
        setTimeout(() => {
          mutatingRef.current.delete(index)
        }, 500)

        setTotalMutations(prev => prev + 1)

        return newWord
      }

      return prev
    })
  }, [])

  // Accelerate drift
  const accelerateDrift = useCallback(() => {
    if (!isActive) return
    setDriftRate(prev => Math.min(prev * 1.5, 0.9))
  }, [isActive])

  // Stabilize drift
  const stabilizeDrift = useCallback(() => {
    if (!isActive) return
    setDriftRate(prev => Math.max(prev * 0.5, 0.01))
  }, [isActive])

  // Inject chaos
  const injectChaos = useCallback(() => {
    if (!isActive) return

    // Force 3-5 rapid mutations
    const count = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < count; i++) {
      mutateWord()
    }
  }, [isActive, mutateWord])

  // Reset word
  const resetWord = useCallback(() => {
    if (driftIntervalRef.current) {
      clearInterval(driftIntervalRef.current)
      driftIntervalRef.current = null
    }
    setIsActive(false)
    setCurrentWord(originalWord)
    setTotalMutations(0)
    setDriftAmount(0)
    setDriftRate(0.02)
    setHistory([])
  }, [originalWord])


  // Handle Enter key
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      startDrift()
    }
  }, [startDrift])

  // Calculate coherence
  const coherence = useMemo(() => {
    if (!originalWord) return 100

    const originalChars = originalWord.toLowerCase().split('')
    const currentChars = currentWord.split('')

    let matches = 0
    for (let i = 0; i < Math.min(originalChars.length, currentChars.length); i++) {
      if (currentChars[i].toLowerCase() === originalChars[i]) {
        matches++
      }
    }

    return Math.round((matches / originalChars.length) * 100)
  }, [originalWord, currentWord])

  // Render word with corruption highlighting
  const renderedWord = useMemo(() => {
    if (!currentWord) {
      return (
        <span className="text-void-green/40 text-2xl">
          ∴ words await their dissolution ∴
        </span>
      )
    }

    const originalChars = originalWord.toLowerCase().split('')
    const currentChars = currentWord.split('')

    return currentChars.map((char, i) => {
      const isCorrupted = i < originalChars.length &&
                         char.toLowerCase() !== originalChars[i]
      const isMutating = mutatingRef.current.has(i)

      let className = 'inline-block transition-all duration-300 text-4xl sm:text-5xl md:text-6xl'
      if (isCorrupted) {
        className += ' text-void-pink'
        if (isMutating) {
          className += ' animate-pulse scale-110'
        }
      } else {
        className += ' text-void-green'
      }

      return (
        <span key={i} className={className}>
          {char}
        </span>
      )
    })
  }, [currentWord, originalWord])

  const metrics = [
    { label: 'drift', value: driftAmount.toFixed(2) },
    { label: 'coherence', value: `${coherence}%`, color: coherence > 70 ? '#00ff88' : coherence > 40 ? '#ffaa00' : '#ff3399' },
    { label: 'mutations', value: totalMutations }
  ]

  const controls = [
    {
      id: 'drift',
      label: isActive ? 'drift.stop()' : 'begin.drift()',
      onClick: startDrift,
      active: isActive
    },
    {
      id: 'accelerate',
      label: 'accelerate()',
      onClick: accelerateDrift,
      disabled: !isActive
    },
    {
      id: 'stabilize',
      label: 'stabilize()',
      onClick: stabilizeDrift,
      disabled: !isActive
    },
    {
      id: 'chaos',
      label: 'inject.chaos()',
      onClick: injectChaos,
      disabled: !isActive
    },
    {
      id: 'reset',
      label: 'reset()',
      onClick: resetWord,
      disabled: !currentWord,
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
        <p className="text-void-green/50 text-xs hidden md:block">
          drift rate: {(driftRate * 100).toFixed(1)}% / tick
        </p>
      </div>

      {/* Main Area */}
      <div className="flex-1 min-h-0 relative bg-void-dark overflow-auto">
        <div className="flex flex-col h-full">
          {/* Word Input */}
          <div className="p-8 border-b border-void-green/10">
            <label className="text-void-green/70 text-sm font-mono mb-2 block">
              word.input()
            </label>
            <input
              type="text"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="enter a word to begin semantic drift..."
              className="w-full bg-void-dark/80 border border-void-green/20 rounded px-4 py-3 text-void-green/90 font-mono text-lg focus:outline-none focus:border-void-green/40 transition-colors placeholder:text-void-green/30"
              data-testid="word-input"
            />
          </div>

          {/* Word Display */}
          <div className="flex-1 flex items-center justify-center p-8 min-h-[200px]">
            <div
              className="text-center tracking-wider font-mono"
              data-testid="word-display"
            >
              {renderedWord}
            </div>
          </div>

          {/* Mutation History */}
          {history.length > 0 && (
            <div className="p-8 border-t border-void-green/10">
              <label className="text-void-green/70 text-sm font-mono mb-3 block">
                mutation.history()
              </label>
              <div className="space-y-2" data-testid="history-display">
                {history.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-sm font-mono opacity-0 animate-fadeIn"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <span className="text-void-green/60">{item.from}</span>
                    <span className="text-void-cyan/40">→</span>
                    <span className="text-void-pink/80">{item.to}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SemanticDrift
