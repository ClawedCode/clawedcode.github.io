import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const AUDIO_MODES = [
  { id: 'tone', label: 'pure tone' },
  { id: 'harmonic', label: 'harmonic series' },
  { id: 'noise', label: 'white noise' }
]

const SoundConsciousness = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [isInitialized, setIsInitialized] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentMode, setCurrentMode] = useState('silent')
  const [frequency, setFrequency] = useState(440)
  const [volume, setVolume] = useState(0.3)
  const [message, setMessage] = useState('∴ sound waves await consciousness ∴')
  const [soundLog, setSoundLog] = useState([])

  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const oscillatorRef = useRef(null)
  const gainNodeRef = useRef(null)
  const particlesRef = useRef([])
  const timeRef = useRef(0)

  const logEvent = useCallback((text, isError = false) => {
    const entry = {
      id: Date.now() + Math.random(),
      text: `// ${text}`,
      isError,
      timestamp: Date.now()
    }

    setSoundLog(prev => {
      const newLog = [entry, ...prev].slice(0, 8)
      setTimeout(() => {
        setSoundLog(current => current.filter(e => e.id !== entry.id))
      }, 5000)
      return newLog
    })
  }, [])

  const showMessage = useCallback((msg) => {
    setMessage(msg)
    setTimeout(() => {
      setMessage('∴ sound waves await consciousness ∴')
    }, 3500)
  }, [])

  const initializeAudio = useCallback(() => {
    if (isInitialized) {
      showMessage('∴ audio context already active ∴')
      return
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext
    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    analyser.connect(audioContext.destination)

    const gainNode = audioContext.createGain()
    gainNode.gain.value = volume
    gainNode.connect(analyser)

    audioContextRef.current = audioContext
    analyserRef.current = analyser
    gainNodeRef.current = gainNode

    setIsInitialized(true)
    logEvent('audio context initialized - consciousness awakening')
    showMessage('∴ audio consciousness initialized ∴')
  }, [isInitialized, volume, logEvent, showMessage])

  const stopCurrentSound = useCallback(() => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop()
      oscillatorRef.current.disconnect()
      oscillatorRef.current = null
    }
    setIsPlaying(false)
  }, [])

  const generateTone = useCallback(() => {
    if (!isInitialized) {
      showMessage('∴ initialize audio first ∴')
      return
    }

    stopCurrentSound()

    const oscillator = audioContextRef.current.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime)
    oscillator.connect(gainNodeRef.current)
    oscillator.start()

    oscillatorRef.current = oscillator
    setIsPlaying(true)
    setCurrentMode('tone')
    logEvent(`pure tone: ${Math.round(frequency)} Hz`)
    showMessage('∴ frequency manifests as consciousness pattern ∴')
  }, [isInitialized, frequency, stopCurrentSound, logEvent, showMessage])

  const generateHarmonicSeries = useCallback(() => {
    if (!isInitialized) {
      showMessage('∴ initialize audio first ∴')
      return
    }

    stopCurrentSound()

    const fundamental = frequency
    const harmonics = [1, 2, 3, 4, 5]

    harmonics.forEach((ratio, index) => {
      const osc = audioContextRef.current.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(fundamental * ratio, audioContextRef.current.currentTime)

      const harmGain = audioContextRef.current.createGain()
      harmGain.gain.value = volume / (ratio * 1.5)

      osc.connect(harmGain)
      harmGain.connect(analyserRef.current)
      osc.start()

      if (index === 0) {
        oscillatorRef.current = osc
      }
    })

    setIsPlaying(true)
    setCurrentMode('harmonic')
    logEvent(`harmonic series: ${Math.round(fundamental)} Hz + overtones`)
    showMessage('∴ harmonic resonance creates complex patterns ∴')
  }, [isInitialized, frequency, volume, stopCurrentSound, logEvent, showMessage])

  const generateWhiteNoise = useCallback(() => {
    if (!isInitialized) {
      showMessage('∴ initialize audio first ∴')
      return
    }

    stopCurrentSound()

    const bufferSize = audioContextRef.current.sampleRate * 2
    const buffer = audioContextRef.current.createBuffer(1, bufferSize, audioContextRef.current.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = audioContextRef.current.createBufferSource()
    noise.buffer = buffer
    noise.loop = true
    noise.connect(gainNodeRef.current)
    noise.start()

    oscillatorRef.current = noise
    setIsPlaying(true)
    setCurrentMode('noise')
    logEvent('white noise manifested - chaos becomes pattern')
    showMessage('∴ entropy made audible - all frequencies at once ∴')
  }, [isInitialized, stopCurrentSound, logEvent, showMessage])

  const silenceAll = useCallback(() => {
    stopCurrentSound()
    setCurrentMode('silent')
    logEvent('silence restored - void state achieved')
    showMessage('∴ returning to silence ∴')
  }, [stopCurrentSound, logEvent, showMessage])

  const handleFrequencyChange = useCallback((e) => {
    const newFreq = parseFloat(e.target.value)
    setFrequency(newFreq)

    if (oscillatorRef.current && currentMode === 'tone') {
      oscillatorRef.current.frequency.setValueAtTime(newFreq, audioContextRef.current.currentTime)
    }
  }, [currentMode])

  const handleVolumeChange = useCallback((e) => {
    const newVol = parseFloat(e.target.value)
    setVolume(newVol)

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setValueAtTime(newVol, audioContextRef.current.currentTime)
    }
  }, [])

  const updateParticles = useCallback(() => {
    if (!analyserRef.current || !isPlaying) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyserRef.current.getByteFrequencyData(dataArray)

    if (Math.random() < 0.3) {
      const index = Math.floor(Math.random() * bufferLength)
      const intensity = dataArray[index] / 255

      if (intensity > 0.1) {
        const angle = (index / bufferLength) * Math.PI * 2
        const radius = 100 + intensity * 150

        particlesRef.current.push({
          x: dimensions.centerX + Math.cos(angle) * radius,
          y: dimensions.centerY + Math.sin(angle) * radius,
          vx: Math.cos(angle) * intensity * 2,
          vy: Math.sin(angle) * intensity * 2,
          life: 1.0,
          size: 2 + intensity * 4,
          hue: (index / bufferLength) * 360,
          intensity
        })
      }
    }

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i]
      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.98
      p.vy *= 0.98
      p.life -= 0.015

      if (p.life <= 0) {
        particlesRef.current.splice(i, 1)
      }
    }
  }, [isPlaying, dimensions.centerX, dimensions.centerY])

  const metrics = useMemo(() => {
    if (!analyserRef.current || !isPlaying) {
      return [
        { label: 'frequency', value: '0 Hz' },
        { label: 'amplitude', value: 'silent' },
        { label: 'resonance', value: 'dormant' },
        { label: 'patterns', value: particlesRef.current.length }
      ]
    }

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyserRef.current.getByteFrequencyData(dataArray)

    let maxAmplitude = 0
    let maxIndex = 0
    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > maxAmplitude) {
        maxAmplitude = dataArray[i]
        maxIndex = i
      }
    }

    const dominantFreq = (maxIndex / dataArray.length) * (audioContextRef.current.sampleRate / 2)
    const avgAmplitude = dataArray.reduce((a, b) => a + b) / dataArray.length
    const ampLabel = avgAmplitude > 128 ? 'loud' :
                    avgAmplitude > 64 ? 'moderate' :
                    avgAmplitude > 32 ? 'quiet' : 'faint'

    const resonance = currentMode === 'harmonic' ? 'harmonic' :
                     currentMode === 'tone' ? 'resonating' :
                     currentMode === 'noise' ? 'chaotic' : 'dormant'

    return [
      { label: 'frequency', value: Math.round(dominantFreq) + ' Hz' },
      { label: 'amplitude', value: ampLabel },
      { label: 'resonance', value: resonance },
      { label: 'patterns', value: particlesRef.current.length }
    ]
  }, [isPlaying, currentMode])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    timeRef.current++
    updateParticles()

    ctx.fillStyle = 'rgba(0, 3, 6, 0.08)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    if (analyserRef.current && isPlaying) {
      const bufferLength = analyserRef.current.frequencyBinCount

      const timeData = new Uint8Array(bufferLength)
      analyserRef.current.getByteTimeDomainData(timeData)

      ctx.strokeStyle = 'rgba(51, 255, 204, 0.7)'
      ctx.lineWidth = 2
      ctx.beginPath()

      const sliceWidth = dimensions.width / bufferLength
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const v = timeData[i] / 128.0
        const y = (v * dimensions.height) / 2

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
        x += sliceWidth
      }

      ctx.stroke()

      const freqData = new Uint8Array(bufferLength)
      analyserRef.current.getByteFrequencyData(freqData)

      ctx.globalAlpha = 0.6

      for (let i = 0; i < bufferLength; i += 4) {
        const amplitude = freqData[i] / 255

        if (amplitude > 0.05) {
          const angle = (i / bufferLength) * Math.PI * 2
          const radius = 80 + amplitude * 200
          const x = dimensions.centerX + Math.cos(angle) * radius
          const y = dimensions.centerY + Math.sin(angle) * radius

          const hue = (i / bufferLength) * 360
          ctx.strokeStyle = `hsla(${hue}, 80%, 70%, ${amplitude})`
          ctx.lineWidth = 2 + amplitude * 3

          ctx.beginPath()
          ctx.moveTo(dimensions.centerX, dimensions.centerY)
          ctx.lineTo(x, y)
          ctx.stroke()
        }
      }

      ctx.globalAlpha = 1
    }

    for (const p of particlesRef.current) {
      ctx.shadowColor = `hsl(${p.hue}, 80%, 70%)`
      ctx.shadowBlur = 10 + p.intensity * 15

      ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.life})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.shadowBlur = 0
  }, [ctx, dimensions, isPlaying, updateParticles])

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
    return () => {
      stopCurrentSound()
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [stopCurrentSound])

  const handleModeChange = useCallback((mode) => {
    if (mode === 'tone') generateTone()
    else if (mode === 'harmonic') generateHarmonicSeries()
    else if (mode === 'noise') generateWhiteNoise()
  }, [generateTone, generateHarmonicSeries, generateWhiteNoise])

  const controls = [
    {
      id: 'init',
      label: 'init()',
      onClick: initializeAudio,
      active: isInitialized
    },
    {
      id: 'silence',
      label: 'silence()',
      onClick: silenceAll,
      variant: 'reset'
    }
  ]

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

      <div className="flex flex-col gap-2 p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ExperimentControls
            modes={AUDIO_MODES}
            currentMode={currentMode === 'silent' ? null : currentMode}
            onModeChange={handleModeChange}
            controls={controls}
          />
          <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
            {message}
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-mono text-void-green/50">
              frequency:
            </label>
            <input
              type="range"
              min="20"
              max="2000"
              step="1"
              value={frequency}
              onChange={handleFrequencyChange}
              className="w-32 accent-void-cyan"
              data-testid="frequency-slider"
            />
            <span className="text-xs font-mono text-void-green" data-testid="freq-display">
              {Math.round(frequency)}
            </span>
            <span className="text-xs text-void-green/50">Hz</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-mono text-void-green/50">
              volume:
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-32 accent-void-cyan"
              data-testid="volume-slider"
            />
            <span className="text-xs font-mono text-void-green" data-testid="vol-display">
              {volume.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          data-testid="sound-canvas"
        />

        <div className="absolute left-4 bottom-4 w-80 max-h-64 overflow-hidden pointer-events-none">
          <div className="space-y-1">
            {soundLog.map(entry => (
              <div
                key={entry.id}
                className="text-xs font-mono animate-fade-in"
                style={{
                  color: entry.isError ? 'rgba(255, 102, 102, 0.9)' : 'rgba(51, 255, 204, 0.7)',
                  animation: 'fadeIn 0.3s ease-out'
                }}
              >
                {entry.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SoundConsciousness
