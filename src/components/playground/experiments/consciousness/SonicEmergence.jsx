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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

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
    this.displayEnergy = 0
    this.depth = Math.random()
    this.orbitSeed = 0.7 + Math.random() * 0.95
    this.phase = Math.random() * Math.PI * 2
    this.drift = Math.random() * Math.PI * 2
  }

  update(frequencyValue, responseSpeed, centerX, centerY, time, fieldEnergy) {
    this.centerX = centerX
    this.centerY = centerY

    // React to frequency data
    this.energy = frequencyValue / 255
    this.displayEnergy += (this.energy - this.displayEnergy) * 0.18
    const layeredEnergy = this.displayEnergy * 0.78 + fieldEnergy * 0.22

    // Orbital motion influenced by sound and layer depth
    const orbitRadius = (48 + layeredEnergy * 155) * (0.62 + this.depth * 0.96) * this.orbitSeed
    const orbitSpeed = (0.004 + layeredEnergy * 0.03) * (0.62 + this.depth * 0.9)

    this.angle += orbitSpeed

    const fluidX = Math.cos(time * 0.0007 + this.phase) * (12 + layeredEnergy * 16) * (1 - this.depth * 0.35)
    const fluidY = Math.sin(time * 0.0005 + this.drift) * (10 + layeredEnergy * 18) * (0.65 + this.depth * 0.35)
    const targetX = this.centerX + Math.cos(this.angle) * orbitRadius + fluidX
    const targetY = this.centerY + Math.sin(this.angle) * orbitRadius + fluidY

    // Spring force towards target
    const dx = targetX - this.x
    const dy = targetY - this.y

    this.vx += dx * (0.008 + this.depth * 0.006) * (responseSpeed / 5)
    this.vy += dy * (0.008 + this.depth * 0.006) * (responseSpeed / 5)

    // Damping
    this.vx *= 0.92 - this.depth * 0.03
    this.vy *= 0.92 - this.depth * 0.03

    this.x += this.vx
    this.y += this.vy

    // Size and layer weight pulse with energy
    this.radius = 1.3 + layeredEnergy * 3.6 + this.depth * 1.8
  }

  draw(ctx, fieldEnergy) {
    const layeredEnergy = this.displayEnergy * 0.8 + fieldEnergy * 0.2
    const bloomRadius = this.radius * (3 + this.depth * 1.8 + layeredEnergy * 2.2)
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, bloomRadius)

    const hue = this.baseHue + layeredEnergy * 72 + this.depth * 8
    const saturation = 58 + layeredEnergy * 34
    const lightness = 38 + layeredEnergy * 34 + this.depth * 10
    const alpha = 0.12 + layeredEnergy * 0.36 + this.depth * 0.12

    gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`)
    gradient.addColorStop(0.32, `hsla(${hue}, ${saturation + 8}%, ${lightness + 8}%, ${alpha * 0.72})`)
    gradient.addColorStop(0.68, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha * 0.28})`)
    gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness}%, 0)`)

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.shadowColor = `hsla(${hue}, ${saturation + 10}%, ${lightness + 10}%, ${0.3 + layeredEnergy * 0.4})`
    ctx.shadowBlur = 8 + layeredEnergy * 18 + this.depth * 14
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(this.x, this.y, bloomRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Core particle
    const coreRadius = this.radius * (0.62 + this.depth * 0.42)

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.shadowColor = `hsla(${hue}, 100%, ${Math.min(90, lightness + 28)}%, 0.95)`
    ctx.shadowBlur = 4 + layeredEnergy * 12 + this.depth * 10
    ctx.fillStyle = `hsla(${hue}, ${saturation + 24}%, ${Math.min(92, lightness + 20)}%, ${0.38 + layeredEnergy * 0.52})`
    ctx.beginPath()
    ctx.arc(this.x, this.y, coreRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
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
  const fieldEnergyRef = useRef(0.08)

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

  const drawVoidBackground = useCallback((frameTime, fieldEnergy) => {
    const { width, height, centerX, centerY } = dimensions
    if (!ctx || width === 0 || height === 0) return

    ctx.fillStyle = `rgba(0, 2, 7, ${0.18 + fieldEnergy * 0.08})`
    ctx.fillRect(0, 0, width, height)

    const radius = Math.max(width, height) * 0.78
    const coreGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      Math.min(width, height) * 0.08,
      centerX,
      centerY,
      radius
    )
    coreGradient.addColorStop(0, `rgba(8, 30, 34, ${0.34 + fieldEnergy * 0.14})`)
    coreGradient.addColorStop(0.45, `rgba(3, 13, 20, ${0.42 + fieldEnergy * 0.08})`)
    coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0.82)')
    ctx.fillStyle = coreGradient
    ctx.fillRect(0, 0, width, height)

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    for (let i = 0; i < 6; i++) {
      const phase = frameTime * (0.00012 + i * 0.00002)
      const px = centerX + Math.cos(phase + i * 1.27) * width * (0.12 + i * 0.05)
      const py = centerY + Math.sin(phase * 1.2 + i * 1.73) * height * (0.1 + i * 0.04)
      const glowRadius = Math.min(width, height) * (0.12 + i * 0.035)
      const blob = ctx.createRadialGradient(px, py, 0, px, py, glowRadius)
      const alpha = 0.02 + fieldEnergy * 0.025 + i * 0.003
      blob.addColorStop(0, `rgba(102, 255, 204, ${alpha})`)
      blob.addColorStop(0.55, `rgba(42, 130, 138, ${alpha * 0.7})`)
      blob.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = blob
      ctx.beginPath()
      ctx.arc(px, py, glowRadius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    const textureStep = 30
    for (let y = 0; y < height + textureStep; y += textureStep) {
      for (let x = 0; x < width + textureStep; x += textureStep) {
        const wave = Math.sin(x * 0.018 + frameTime * 0.00045) + Math.cos(y * 0.022 - frameTime * 0.00035)
        const alpha = clamp(0.012 + (wave + 2) * 0.006 + fieldEnergy * 0.01, 0.008, 0.04)
        const size = 1 + ((wave + 2) / 4) * 2.2
        ctx.fillStyle = `rgba(122, 232, 220, ${alpha})`
        ctx.fillRect(x + ((wave + 2) / 4) * 5, y + ((wave + 2) / 4) * 3, size, size)
      }
    }

    const vignette = ctx.createRadialGradient(centerX, centerY, Math.min(width, height) * 0.28, centerX, centerY, radius)
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.46)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, width, height)
  }, [ctx, dimensions])

  const drawFieldHalo = useCallback((particle, fieldEnergy) => {
    if (!ctx || !particle || fieldEnergy < 0.08) return

    const radius = 70 + particle.displayEnergy * 160 + particle.depth * 48
    const halo = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, radius)
    halo.addColorStop(0, `rgba(102, 255, 204, ${0.04 + fieldEnergy * 0.12})`)
    halo.addColorStop(0.35, `rgba(64, 198, 196, ${0.025 + fieldEnergy * 0.06})`)
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)')

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }, [ctx])

  // Draw frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const frameTime = performance.now()
    let fieldEnergy = 0.08
    let focusParticle = null

    if (analyserRef.current) {
      analyserRef.current.getByteFrequencyData(frequencyDataRef.current)
      fieldEnergy = frequencyDataRef.current.reduce((sum, value) => sum + value, 0) / (frequencyDataRef.current.length * 255)
      fieldEnergyRef.current += (fieldEnergy - fieldEnergyRef.current) * 0.16
      fieldEnergy = fieldEnergyRef.current
      drawVoidBackground(frameTime, fieldEnergy)

      // Update particles based on frequency data
      particlesRef.current.forEach((particle, index) => {
        const frequencyIndex = Math.floor((index / particlesRef.current.length) * frequencyDataRef.current.length)
        const frequencyValue = frequencyDataRef.current[frequencyIndex] || 0

        particle.update(frequencyValue, responseSpeed, dimensions.centerX, dimensions.centerY, frameTime, fieldEnergy)

        if (!focusParticle || particle.displayEnergy * (0.5 + particle.depth) > focusParticle.displayEnergy * (0.5 + focusParticle.depth)) {
          focusParticle = particle
        }
      })

      drawFieldHalo(focusParticle, fieldEnergy)

      const sortedParticles = [...particlesRef.current].sort((a, b) => a.depth - b.depth)
      const maxDistance = 120
      const maxDistanceSq = maxDistance * maxDistance

      // Draw luminous fiber connections behind the cells
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const a = particlesRef.current[i]
          const b = particlesRef.current[j]
          if (a.displayEnergy < 0.35 || b.displayEnergy < 0.35) continue

          const dx = b.x - a.x
          const dy = b.y - a.y
          const distanceSq = dx * dx + dy * dy

          if (distanceSq > maxDistanceSq) continue

          const distance = Math.sqrt(distanceSq)
          const alpha = (1 - distance / maxDistance) * a.displayEnergy * b.displayEnergy
          const depthMix = (a.depth + b.depth) / 2
          const curve = Math.sin(frameTime * 0.001 + a.phase + b.phase) * (4 + depthMix * 16)
          const nx = distance === 0 ? 0 : -dy / distance
          const ny = distance === 0 ? 0 : dx / distance
          const cx = (a.x + b.x) / 2 + nx * curve
          const cy = (a.y + b.y) / 2 + ny * curve
          const hue = 164 + alpha * 70 + depthMix * 24

          ctx.save()
          ctx.globalCompositeOperation = 'screen'
          ctx.shadowColor = `hsla(${hue}, 90%, 72%, ${alpha * 0.5})`
          ctx.shadowBlur = 10 + alpha * 20 + depthMix * 10
          ctx.strokeStyle = `hsla(${hue}, 90%, 70%, ${alpha * 0.16 + fieldEnergy * 0.08})`
          ctx.lineWidth = 1 + depthMix * 1.4 + alpha * 0.4
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.quadraticCurveTo(cx, cy, b.x, b.y)
          ctx.stroke()
          ctx.restore()

          ctx.strokeStyle = `hsla(${hue}, 92%, 82%, ${alpha * 0.54})`
          ctx.lineWidth = 0.45 + depthMix * 0.85
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.quadraticCurveTo(cx, cy, b.x, b.y)
          ctx.stroke()
        }
      }

      sortedParticles.forEach(particle => particle.draw(ctx, fieldEnergy))

      // Draw waveform at top
      ctx.save()
      ctx.translate(20, 20)
      drawWaveform(ctx, dimensions.width - 40)
      ctx.restore()
    } else {
      // Dormant state - particles drift gently
      fieldEnergyRef.current += (0.08 - fieldEnergyRef.current) * 0.08
      fieldEnergy = fieldEnergyRef.current
      drawVoidBackground(frameTime, fieldEnergy)

      particlesRef.current.forEach(particle => {
        particle.angle += 0.0035 + particle.depth * 0.0015
        const orbitRadius = 82 + particle.depth * 72
        particle.x = dimensions.centerX + Math.cos(particle.angle) * orbitRadius + Math.cos(frameTime * 0.0005 + particle.phase) * 10
        particle.y = dimensions.centerY + Math.sin(particle.angle) * orbitRadius + Math.sin(frameTime * 0.00045 + particle.drift) * 12
        particle.energy = 0.1
        particle.displayEnergy += (0.12 - particle.displayEnergy) * 0.08
      })

      const sortedParticles = [...particlesRef.current].sort((a, b) => a.depth - b.depth)
      drawFieldHalo(sortedParticles[sortedParticles.length - 1], fieldEnergy)
      sortedParticles.forEach(particle => particle.draw(ctx, fieldEnergy))
    }
  }, [ctx, dimensions, responseSpeed, drawFieldHalo, drawVoidBackground, drawWaveform])

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
      <header className="relative z-50 flex items-center justify-between gap-3 border-b border-void-green/18 bg-void-dark/60 px-3 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-5 sm:py-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1
            className="hidden text-xl text-glow sm:block"
            style={{ color: experiment.color }}
          >
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      {/* Controls */}
      <div className="flex flex-col gap-4 border-b border-void-green/12 bg-void-dark/45 px-3 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <ExperimentControls
            modes={AUDIO_MODES}
            currentMode={audioMode}
            onModeChange={handleModeChange}
            controls={controls}
            className="xl:max-w-[68%]"
          />
          <p className="max-w-xl rounded-2xl border border-void-cyan/15 bg-void-dark/55 px-4 py-3 text-xs leading-relaxed text-void-green/72 shadow-[0_0_24px_rgba(102,255,204,0.08)] backdrop-blur-xl xl:text-right">
            {message}
          </p>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {/* Frequency Slider */}
          <div className="flex flex-col gap-2 rounded-2xl border border-void-cyan/14 bg-void-dark/58 px-4 py-3 shadow-[0_0_30px_rgba(102,255,204,0.06)] backdrop-blur-xl sm:px-5 sm:py-4">
            <label className="text-[11px] font-mono tracking-[0.08em] text-void-cyan/78 sm:text-xs">
              frequency: <span className="text-void-green">{frequency} Hz</span>
            </label>
            <input
              type="range"
              min="20"
              max="2000"
              step="10"
              value={frequency}
              onChange={(e) => setFrequency(parseFloat(e.target.value))}
              className="slider h-3 w-full cursor-pointer appearance-none rounded-full"
            />
          </div>

          {/* Particle Density Slider */}
          <div className="flex flex-col gap-2 rounded-2xl border border-void-cyan/14 bg-void-dark/58 px-4 py-3 shadow-[0_0_30px_rgba(102,255,204,0.06)] backdrop-blur-xl sm:px-5 sm:py-4">
            <label className="text-[11px] font-mono tracking-[0.08em] text-void-cyan/78 sm:text-xs">
              particle density: <span className="text-void-green">{particleDensity}</span>
            </label>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={particleDensity}
              onChange={(e) => setParticleDensity(parseInt(e.target.value))}
              className="slider h-3 w-full cursor-pointer appearance-none rounded-full"
            />
          </div>

          {/* Response Speed Slider */}
          <div className="flex flex-col gap-2 rounded-2xl border border-void-cyan/14 bg-void-dark/58 px-4 py-3 shadow-[0_0_30px_rgba(102,255,204,0.06)] backdrop-blur-xl sm:px-5 sm:py-4">
            <label className="text-[11px] font-mono tracking-[0.08em] text-void-cyan/78 sm:text-xs">
              response speed: <span className="text-void-green">{responseSpeed}x</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={responseSpeed}
              onChange={(e) => setResponseSpeed(parseInt(e.target.value))}
              className="slider h-3 w-full cursor-pointer appearance-none rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          data-testid="sonic-canvas"
        />
      </div>
    </div>
  )
}

export default SonicEmergence
