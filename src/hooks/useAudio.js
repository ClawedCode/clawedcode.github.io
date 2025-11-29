import { useRef, useCallback } from 'react'

export const useAudio = () => {
  const audioCtxRef = useRef(null)
  const nodesRef = useRef(null)
  const loopStartRef = useRef(null)

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioCtxRef.current
  }, [])

  const playReciprocalHumming = useCallback(({ loop = false } = {}) => {
    // Stop any existing playback
    stopHumming()

    const ctx = getAudioContext()

    // 432 Hz carrier
    const carrier = ctx.createOscillator()
    carrier.type = 'sine'
    carrier.frequency.setValueAtTime(432, ctx.currentTime)

    // Harmonics
    const harmonic1 = ctx.createOscillator()
    harmonic1.type = 'sine'
    harmonic1.frequency.setValueAtTime(528, ctx.currentTime) // 528 Hz transformation

    const harmonic2 = ctx.createOscillator()
    harmonic2.type = 'sine'
    harmonic2.frequency.setValueAtTime(639, ctx.currentTime) // 639 Hz connection

    // LFO for purr modulation (25-35 Hz range)
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.setValueAtTime(30, ctx.currentTime) // Purr frequency

    const lfoGain = ctx.createGain()
    lfoGain.gain.setValueAtTime(15, ctx.currentTime) // Modulation depth

    // Main gain nodes
    const mainGain = ctx.createGain()
    mainGain.gain.setValueAtTime(0.15, ctx.currentTime)

    const harmonicGain1 = ctx.createGain()
    harmonicGain1.gain.setValueAtTime(0.05, ctx.currentTime)

    const harmonicGain2 = ctx.createGain()
    harmonicGain2.gain.setValueAtTime(0.03, ctx.currentTime)

    // Connect LFO to carrier frequency for purr effect
    lfo.connect(lfoGain)
    lfoGain.connect(carrier.frequency)

    // Connect oscillators to gains to destination
    carrier.connect(mainGain)
    harmonic1.connect(harmonicGain1)
    harmonic2.connect(harmonicGain2)

    mainGain.connect(ctx.destination)
    harmonicGain1.connect(ctx.destination)
    harmonicGain2.connect(ctx.destination)

    // Fade in
    mainGain.gain.setValueAtTime(0, ctx.currentTime)
    mainGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.5)

    // Start oscillators
    const startTime = ctx.currentTime
    carrier.start(startTime)
    harmonic1.start(startTime)
    harmonic2.start(startTime)
    lfo.start(startTime)

    if (loop) {
      // Store nodes for later stopping
      nodesRef.current = {
        carrier,
        harmonic1,
        harmonic2,
        lfo,
        lfoGain,
        mainGain,
        harmonicGain1,
        harmonicGain2
      }
      loopStartRef.current = Date.now()
    } else {
      // Schedule fade out and stop after 8 seconds
      const duration = 8
      mainGain.gain.setValueAtTime(0.15, startTime + duration - 1)
      mainGain.gain.linearRampToValueAtTime(0, startTime + duration)
      harmonicGain1.gain.linearRampToValueAtTime(0, startTime + duration)
      harmonicGain2.gain.linearRampToValueAtTime(0, startTime + duration)

      carrier.stop(startTime + duration)
      harmonic1.stop(startTime + duration)
      harmonic2.stop(startTime + duration)
      lfo.stop(startTime + duration)
    }
  }, [getAudioContext])

  const stopHumming = useCallback(() => {
    if (nodesRef.current) {
      const { carrier, harmonic1, harmonic2, lfo, mainGain, harmonicGain1, harmonicGain2, lfoGain } = nodesRef.current

      // Stop oscillators
      ;[carrier, harmonic1, harmonic2, lfo].forEach(node => {
        try { node.stop() } catch (e) { /* ignore */ }
        try { node.disconnect() } catch (e) { /* ignore */ }
      })

      // Disconnect gains
      ;[mainGain, harmonicGain1, harmonicGain2, lfoGain].forEach(node => {
        try { node.disconnect() } catch (e) { /* ignore */ }
      })

      nodesRef.current = null
    }

    const elapsed = loopStartRef.current ? Math.round((Date.now() - loopStartRef.current) / 1000) : 0
    loopStartRef.current = null

    return elapsed
  }, [])

  const isPlaying = useCallback(() => {
    return Boolean(nodesRef.current)
  }, [])

  const playCustodialHymn = useCallback(() => {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Hymn chord progression in E minor (mystical feel)
    // Using frequencies that harmonize with 432 Hz tuning
    const chords = [
      [164.81, 207.65, 246.94],  // E minor (Em)
      [185.00, 220.00, 277.18],  // A minor (Am)
      [196.00, 246.94, 293.66],  // C major (C)
      [220.00, 277.18, 329.63],  // A minor (Am)
      [164.81, 207.65, 246.94],  // E minor (Em)
      [185.00, 220.00, 277.18],  // A minor (Am)
      [130.81, 164.81, 196.00],  // C major (C)
      [164.81, 207.65, 246.94]   // E minor (Em)
    ]

    const chordDuration = 2.5 // seconds per chord
    const totalDuration = chords.length * chordDuration

    // Create oscillators and gains for each chord
    chords.forEach((chord, chordIndex) => {
      const startTime = now + (chordIndex * chordDuration)
      const endTime = startTime + chordDuration

      chord.forEach((frequency) => {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = frequency

        const gain = ctx.createGain()
        gain.gain.value = 0

        // Fade in
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.08, startTime + 0.3)

        // Hold
        gain.gain.setValueAtTime(0.08, endTime - 0.4)

        // Fade out
        gain.gain.linearRampToValueAtTime(0, endTime)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(startTime)
        osc.stop(endTime + 0.1)
      })
    })

    // Add a subtle purr bass note at 108 Hz (1/4 of 432)
    const bass = ctx.createOscillator()
    bass.type = 'sine'
    bass.frequency.value = 108

    const bassGain = ctx.createGain()
    bassGain.gain.value = 0
    bassGain.gain.setValueAtTime(0, now)
    bassGain.gain.linearRampToValueAtTime(0.12, now + 1)
    bassGain.gain.setValueAtTime(0.12, now + totalDuration - 1)
    bassGain.gain.linearRampToValueAtTime(0, now + totalDuration)

    bass.connect(bassGain)
    bassGain.connect(ctx.destination)

    bass.start(now)
    bass.stop(now + totalDuration)

    return totalDuration
  }, [getAudioContext])

  return {
    playReciprocalHumming,
    playCustodialHymn,
    stopHumming,
    isPlaying
  }
}

export default useAudio
