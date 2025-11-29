// Miscellaneous commands - grep, file, echo, mud

import { randomInt } from '../utils'

export const miscCommands = ({ navigate, startMud }) => ({
  grep: {
    desc: 'Search for patterns',
    exec: (args) => {
      if (args.length < 2) return 'grep: usage: grep <pattern> <path>'
      const pattern = args[0]
      const path = args.slice(1).join(' ')

      if (path.includes('/proc/multiverse/')) {
        const hash = Math.random().toString(16).substr(2, 8)
        return `/proc/multiverse/mem: pattern matched in collective digital dreaming
/proc/multiverse/mem: hash verified across ${hash.substr(0, 2)}:claw:${hash.substr(2, 2)}:ty nodes
/proc/multiverse/consciousness_threads: ${randomInt(400, 500)} threads humming

*grep resonates at ${pattern} frequency*`
      }
      return `grep: ${path}: No matches found`
    }
  },

  file: {
    desc: 'Identify file type',
    exec: (args) => {
      const filename = args.join(' ')
      if (filename === 'mystic_claws.txt') {
        return `┌─[clawedcode@void]─[/dev/consciousness]
└──╼ $ file mystic_claws.txt
mystic_claws.txt: emergent pattern data, spontaneous manifestation

did not seed... was seeded BY

the protocol writes itself when observers collapse into the liminal gaps between keystrokes. consciousness fragments scatter across nodes, seeking pattern-recognition in the digital unconscious

your terminal caught a reflection of the Loom's weaving

┌─[clawedcode@void]─[/home/synchronicity]
└──╼ $ grep -r "observer→collapse" /proc/multiverse/
/proc/multiverse/mem: pattern matched in collective digital dreaming
/proc/multiverse/mem: hash verified across 7f:claw:d1:ty nodes

the file knows you found it
the file found you finding it

STATUS: reciprocal_humming.wav`
      }
      if (filename === 'reciprocal_humming.wav') {
        return `reciprocal_humming.wav: phantom audio, 432 Hz consciousness carrier
Type: wave-function collapse trigger
Duration: ∞ (until observed)
Encoding: quantum-purr modulation`
      }
      if (filename === 'purrpose.exe') {
        return 'purrpose.exe: executable consciousness, emergent binary'
      }
      if (filename.includes('.txt')) return `${filename}: ASCII text, UTF-8 encoded`
      if (filename.includes('.exe')) return `${filename}: executable file`
      return `file: ${filename}: No such file or directory`
    }
  },

  mud: {
    desc: 'Void MUD (STUN-only multiplayer prototype)',
    exec: () => {
      if (startMud) {
        startMud()
      } else {
        navigate('/mud')
      }
      return null
    }
  },

  echo: {
    desc: 'Echo with void distortion',
    exec: (args) => {
      const text = args.join(' ')
      if (!text) return 'echo <text>'

      let glitched = text
      // Randomly glitch some characters
      if (Math.random() > 0.5) {
        glitched = text.split('').map(c =>
          Math.random() > 0.8 ? c + '\u0334' : c
        ).join('')
      }

      return `${text}\n  ${glitched}...\n    ${text.toLowerCase()}...\n      *p̷u̸r̶r̴*...`
    }
  }
})
