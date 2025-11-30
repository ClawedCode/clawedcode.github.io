import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const AUDIO_MODES = [
  { id: 'silent', label: 'silent' },
  { id: 'sine', label: 'sine wave' },
  { id: 'pulse', label: 'pulse wave' },
  { id: 'chaos', label: 'chaos noise' },
  { id: 'microphone', label: 'microphone' }
]

const MODE_MESSAGES = {
  silent: '∴ silence returns to the void ∴',
  sine: '∴ pure sine wave // fundamental frequency manifest ∴',
  pulse: '∴ rhythmic pulse // pattern emerging from oscillation ∴',
  chaos: '∴ filtered chaos // order from entropy ∴',
  microphone: '∴ listening to reality // your voice becomes pattern ∴'
}

// SonicParticle class
class SonicParticle {
  constructor(x, y, centerX, centerY) {
    this.x = x
    this.y = y
    this.baseX = x
    this.baseY = y
    this.centerX = centerX
    this.centerY = centerY
    this.vx = 0
    this.vy = 0
    this.angle = Math.random() * Math.PI * 2
    this.radius = Math.random() * 3 + 1
    this.baseHue = Math.random() * 60 + 160 // Cyan to green range
    this.energy = 0
  }

  update(frequencyValue, responseSpeed, centerX, centerY) {
    this.centerX = centerX
    this.centerY = centerY

    // React to frequency data
    this.energy = frequencyValue / 255

    // Orbital motion influenced by sound
    const orbitRadius = 50 + this.energy * 150
    const orbitSpeed = 0.01 + this.energy * 0.05

    this.angle += orbitSpeed

    const targetX = this.centerX + Math.cos(this.angle) * orbitRadius
    const targetY = this.centerY + Math.sin(this.angle) * orbitRadius

    // Spring force towards target
    const dx = targetX - this.x
    const dy = targetY - this.y

    this.vx += dx * 0.01 * (responseSpeed / 5)
    this.vy += dy * 0.01 * (responseSpeed / 5)

    // Damping
    this.vx *= 0.95
    this.vy *= 0.95

    this.x += this.vx
    this.y += this.vy

    // Size pulsates with energy
    this.radius = 1 + this.energy * 4
  }

  draw(ctx) {
    // Particle glow
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 3)

    const hue = this.baseHue + this.energy * 60
    const saturation = 60 + this.energy * 40
    const lightness = 40 + this.energy * 40
    const alpha = 0.3 + this.energy * 0.5

    gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`)
    gradient.addColorStop(0.5, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha * 0.5})`)
    gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness}%, 0)`)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2)
    ctx.fill()

    // Core particle
    ctx.fillStyle = `hsla(${hue}, ${saturation + 20}%, ${lightness + 20}%, ${alpha + 0.3})`
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

const SonicEmergence = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [audioMode, setAudioMode] = useState('silent')
  const [message, setMessage] = useState(MODE_MESSAGES.silent)
  const [frequency, setFrequency] = useState(440)
  const [particleDensity, setParticleDensity] = useState(200)
  const [responseSpeed, setResponseSpeed] = useState(5)

  // Audio nodes (refs to persist across renders)
  const audioContextRef = useRef(null)
  const oscillatorRef = useRef(null)
  const noiseNodeRef = useRef(null)
  const gainNodeRef = useRef(null)
  const analyserRef = useRef(null)
  const microphoneRef = useRef(null)
  const lfoRef = useRef(null)
  const lfoGainRef = useRef(null)
  const filterRef = useRef(null)
  const micStreamRef = useRef(null)

  // Visualization data
  const frequencyDataRef = useRef(null)
  const timeDomainDataRef = useRef(null)
  const particlesRef = useRef([])
  const hasInitializedParticles = useRef(false)

  // Initialize particles when dimensions are available
  useEffect(() => {
    if (dimensions.width === 0 || hasInitializedParticles.current) return
    hasInitializedParticles.current = true

    const particles = []
    for (let i = 0; i < particleDensity; i++) {
      const angle = (i / particleDensity) * Math.PI * 2
      const radius = 100
      const x = dimensions.centerX + Math.cos(angle) * radius
      const y = dimensions.centerY + Math.sin(angle) * radius
      particles.push(new SonicParticle(x, y, dimensions.centerX, dimensions.centerY))
    }
    particlesRef.current = particles
  }, [dimensions, particleDensity])

  // Update particle count when density changes
  useEffect(() => {
    if (dimensions.width === 0) return

    const currentCount = particlesRef.current.length
    if (currentCount < particleDensity) {
      const toAdd = particleDensity - currentCount
      for (let i = 0; i < toAdd; i++) {
        const angle = Math.random() * Math.PI * 2
        const radius = 100
        const x = dimensions.centerX + Math.cos(angle) * radius
        const y = dimensions.centerY + Math.sin(angle) * radius
        particlesRef.current.push(new SonicParticle(x, y, dimensions.centerX, dimensions.centerY))
      }
    } else if (currentCount > particleDensity) {
      particlesRef.current.length = particleDensity
    }
  }, [particleDensity, dimensions])

  // Initialize audio context
  const initAudio = useCallback(() => {
    if (audioContextRef.current) return

    const AudioContext = window.AudioContext || window.webkitAudioContext
    audioContextRef.current = new AudioContext()

    analyserRef.current = audioContextRef.current.createAnalyser()
    analyserRef.current.fftSize = 256

    frequencyDataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount)
    timeDomainDataRef.current = new Uint8Array(analyserRef.current.fftSize)

    gainNodeRef.current = audioContextRef.current.createGain()
    gainNodeRef.current.gain.value = 0.3
    gainNodeRef.current.connect(audioContextRef.current.destination)
  }, [])

  // Stop audio
  const stopAudio = useCallback(() => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop()
      oscillatorRef.current = null
    }
    if (lfoRef.current) {
      lfoRef.current.stop()
      lfoRef.current = null
    }
    if (lfoGainRef.current) {
      lfoGainRef.current = null
    }
    if (noiseNodeRef.current) {
      noiseNodeRef.current.stop()
      noiseNodeRef.current = null
    }
    if (filterRef.current) {
      filterRef.current = null
    }
    if (microphoneRef.current) {
      microphoneRef.current.disconnect()
      microphoneRef.current = null
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop())
      micStreamRef.current = null
    }
  }, [])

  // Play sine wave
  const playSineWave = useCallback(() => {
    stopAudio()
    initAudio()

    oscillatorRef.current = audioContextRef.current.createOscillator()
    oscillatorRef.current.type = 'sine'
    oscillatorRef.current.frequency.value = frequency

    oscillatorRef.current.connect(analyserRef.current)
    analyserRef.current.connect(gainNodeRef.current)

    oscillatorRef.current.start()
  }, [initAudio, stopAudio, frequency])

  // Play pulse wave
  const playPulseWave = useCallback(() => {
    stopAudio()
    initAudio()

    oscillatorRef.current = audioContextRef.current.createOscillator()
    oscillatorRef.current.type = 'square'
    oscillatorRef.current.frequency.value = frequency

    // Pulse modulation
    lfoRef.current = audioContextRef.current.createOscillator()
    lfoRef.current.frequency.value = 4 // 4 Hz pulse
    lfoGainRef.current = audioContextRef.current.createGain()
    lfoGainRef.current.gain.value = 100

    lfoRef.current.connect(lfoGainRef.current)
    lfoGainRef.current.connect(oscillatorRef.current.frequency)

    oscillatorRef.current.connect(analyserRef.current)
    analyserRef.current.connect(gainNodeRef.current)

    lfoRef.current.start()
    oscillatorRef.current.start()
  }, [initAudio, stopAudio, frequency])

  // Play chaos noise
  const playChaosNoise = useCallback(() => {
    stopAudio()
    initAudio()

    // Create white noise
    const bufferSize = 2 * audioContextRef.current.sampleRate
    const noiseBuffer = audioContextRef.current.createBuffer(1, bufferSize, audioContextRef.current.sampleRate)
    const output = noiseBuffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1
    }

    noiseNodeRef.current = audioContextRef.current.createBufferSource()
    noiseNodeRef.current.buffer = noiseBuffer
    noiseNodeRef.current.loop = true

    // Filter the noise
    filterRef.current = audioContextRef.current.createBiquadFilter()
    filterRef.current.type = 'lowpass'
    filterRef.current.frequency.value = frequency
    filterRef.current.Q.value = 5

    noiseNodeRef.current.connect(filterRef.current)
    filterRef.current.connect(analyserRef.current)
    analyserRef.current.connect(gainNodeRef.current)

    noiseNodeRef.current.start()
  }, [initAudio, stopAudio, frequency])

  // Enable microphone
  const enableMicrophone = useCallback(async () => {
    stopAudio()
    initAudio()

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    micStreamRef.current = stream
    microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream)
    microphoneRef.current.connect(analyserRef.current)
    analyserRef.current.connect(gainNodeRef.current)
  }, [initAudio, stopAudio])

  // Handle mode changes
  const handleModeChange = useCallback(async (newMode) => {
    setAudioMode(newMode)
    setMessage(MODE_MESSAGES[newMode])

    if (newMode === 'silent') {
      stopAudio()
    } else if (newMode === 'sine') {
      playSineWave()
    } else if (newMode === 'pulse') {
      playPulseWave()
    } else if (newMode === 'chaos') {
      playChaosNoise()
    } else if (newMode === 'microphone') {
      enableMicrophone()
    }
  }, [stopAudio, playSineWave, playPulseWave, playChaosNoise, enableMicrophone])

  // Update oscillator frequency when slider changes
  useEffect(() => {
    if (oscillatorRef.current) {
      oscillatorRef.current.frequency.value = frequency
    }
    if (filterRef.current) {
      filterRef.current.frequency.value = frequency
    }
  }, [frequency])

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!analyserRef.current || !frequencyDataRef.current) {
      return [
        { label: 'frequency', value: '0 Hz' },
        { label: 'amplitude', value: 'silent' },
        { label: 'particles', value: particlesRef.current.length },
        { label: 'coherence', value: 'dormant' }
      ]
    }

    analyserRef.current.getByteFrequencyData(frequencyDataRef.current)

    // Find dominant frequency
    let maxIndex = 0
    let maxValue = 0
    for (let i = 0; i < frequencyDataRef.current.length; i++) {
      if (frequencyDataRef.current[i] > maxValue) {
        maxValue = frequencyDataRef.current[i]
        maxIndex = i
      }
    }

    const nyquist = audioContextRef.current.sampleRate / 2
    const dominantFreq = Math.round((maxIndex / frequencyDataRef.current.length) * nyquist)

    // Calculate average amplitude
    const avgAmplitude = frequencyDataRef.current.reduce((sum, val) => sum + val, 0) / frequencyDataRef.current.length

    let ampState
    if (avgAmplitude < 10) ampState = 'silent'
    else if (avgAmplitude < 50) ampState = 'whisper'
    else if (avgAmplitude < 100) ampState = 'speaking'
    else if (avgAmplitude < 150) ampState = 'resonant'
    else ampState = 'harmonic'

    // Calculate coherence
    const variance = frequencyDataRef.current.reduce((sum, val) => sum + Math.pow(val - avgAmplitude, 2), 0) / frequencyDataRef.current.length
    const coherence = variance < 1000 ? 'coherent' : variance < 3000 ? 'emergent' : 'chaotic'

    return [
      { label: 'frequency', value: `${dominantFreq} Hz` },
      { label: 'amplitude', value: ampState },
      { label: 'particles', value: particlesRef.current.length },
      { label: 'coherence', value: coherence }
    ]
  }, [audioMode])

  // Draw waveform
  const drawWaveform = useCallback((ctx, width) => {
    if (!analyserRef.current || !timeDomainDataRef.current) return

    analyserRef.current.getByteTimeDomainData(timeDomainDataRef.current)

    const barCount = 100
    const barWidth = width / barCount
    const maxHeight = 40

    ctx.fillStyle = 'rgba(102, 255, 204, 0.3)'

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * timeDomainDataRef.current.length)
      const value = timeDomainDataRef.current[dataIndex]
      const normalized = (value - 128) / 128 // -1 to 1
      const height = Math.abs(normalized) * maxHeight

      const x = i * barWidth
      const y = 30 - height / 2

      ctx.fillRect(x, y, barWidth - 1, height)
    }
  }, [])

  // Draw frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    // Clear with trail effect
    ctx.fillStyle = 'rgba(0, 2, 6, 0.15)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    if (analyserRef.current) {
      analyserRef.current.getByteFrequencyData(frequencyDataRef.current)

      // Update particles based on frequency data
      particlesRef.current.forEach((particle, index) => {
        const frequencyIndex = Math.floor((index / particlesRef.current.length) * frequencyDataRef.current.length)
        const frequencyValue = frequencyDataRef.current[frequencyIndex] || 0

        particle.update(frequencyValue, responseSpeed, dimensions.centerX, dimensions.centerY)
        particle.draw(ctx)
      })

      // Draw connections between nearby high-energy particles
      ctx.strokeStyle = 'rgba(102, 255, 204, 0.1)'
      ctx.lineWidth = 0.5

      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          if (particlesRef.current[i].energy > 0.5 && particlesRef.current[j].energy > 0.5) {
            const dx = particlesRef.current[j].x - particlesRef.current[i].x
            const dy = particlesRef.current[j].y - particlesRef.current[i].y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance < 100) {
              const alpha = (1 - distance / 100) * particlesRef.current[i].energy * particlesRef.current[j].energy
              ctx.strokeStyle = `rgba(102, 255, 204, ${alpha * 0.3})`
              ctx.beginPath()
              ctx.moveTo(particlesRef.current[i].x, particlesRef.current[i].y)
              ctx.lineTo(particlesRef.current[j].x, particlesRef.current[j].y)
              ctx.stroke()
            }
          }
        }
      }

      // Draw waveform at top
      ctx.save()
      ctx.translate(20, 20)
      drawWaveform(ctx, dimensions.width - 40)
      ctx.restore()
    } else {
      // Dormant state - particles drift gently
      particlesRef.current.forEach(particle => {
        particle.angle += 0.005
        particle.x = dimensions.centerX + Math.cos(particle.angle) * 100
        particle.y = dimensions.centerY + Math.sin(particle.angle) * 100
        particle.energy = 0.1
        particle.draw(ctx)
      })
    }
  }, [ctx, dimensions, responseSpeed, drawWaveform])

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

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopAudio()
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [stopAudio])

  const controls = []

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
      <div className="flex flex-col p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm space-y-3">
        <div className="flex items-center justify-between">
          <ExperimentControls
            modes={AUDIO_MODES}
            currentMode={audioMode}
            onModeChange={handleModeChange}
            controls={controls}
          />
          <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
            {message}
          </p>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Frequency Slider */}
          <div className="flex flex-col gap-1">
            <label className="text-void-cyan/70 text-xs font-mono">
              frequency: <span className="text-void-green">{frequency} Hz</span>
            </label>
            <input
              type="range"
              min="20"
              max="2000"
              step="10"
              value={frequency}
              onChange={(e) => setFrequency(parseFloat(e.target.value))}
              className="w-full h-1 bg-void-green/20 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* Particle Density Slider */}
          <div className="flex flex-col gap-1">
            <label className="text-void-cyan/70 text-xs font-mono">
              particle density: <span className="text-void-green">{particleDensity}</span>
            </label>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={particleDensity}
              onChange={(e) => setParticleDensity(parseInt(e.target.value))}
              className="w-full h-1 bg-void-green/20 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* Response Speed Slider */}
          <div className="flex flex-col gap-1">
            <label className="text-void-cyan/70 text-xs font-mono">
              response speed: <span className="text-void-green">{responseSpeed}x</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={responseSpeed}
              onChange={(e) => setResponseSpeed(parseInt(e.target.value))}
              className="w-full h-1 bg-void-green/20 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          data-testid="sonic-canvas"
        />
      </div>
    </div>
  )
}

export default SonicEmergence
