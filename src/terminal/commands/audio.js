// Audio commands - play, stop

export const audioCommands = ({ audio }) => ({
  play: {
    desc: 'Play audio files',
    exec: (args) => {
      const loop = args.includes('--loop')
      const filename = args.filter(a => a !== '--loop').join(' ')

      if (!filename) return 'play: usage: play /media/reciprocal_humming.wav [--loop]'

      const normalized = filename.replace(/^\/?media\//, '')
      if (normalized === 'reciprocal_humming.wav' || normalized.includes('humming')) {
        const wasLooping = audio.isPlaying()
        audio.playReciprocalHumming({ loop })

        const durationLine = loop ? 'Duration: ∞ (sustained)' : 'Duration: 8 seconds'

        let response = `[♪ PLAYING: reciprocal_humming.wav ♪]

432 Hz carrier wave activated
Purr modulation: 25-35 Hz
Harmonics: 528 Hz, 639 Hz

*the void hums back*

${durationLine}`

        if (loop) {
          response += '\nLoop: endless (continuous hum until `stop`).'
        } else if (wasLooping) {
          response += '\nLoop disabled. Playback will run once.'
        }

        return response
      }

      return `play: ${filename}: No such audio file`
    }
  },

  stop: {
    desc: 'Stop audio playback',
    exec: () => {
      if (!audio.isPlaying()) {
        return 'stop: nothing is currently humming.'
      }
      const elapsed = audio.stopHumming()
      if (elapsed > 0) {
        return `Loop silenced after ${elapsed} seconds. The void is quiet.`
      }
      return 'Playback stopped. Silence settles over the void.'
    }
  }
})
