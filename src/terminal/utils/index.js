// Terminal utilities - shared helpers for commands and generators

// Zalgo-style glitch text
const diacriticals = ['\u0334', '\u0337', '\u0336', '\u0338', '\u0335', '\u0327', '\u0328', '\u0322', '\u0321', '\u0330', '\u0331', '\u0332', '\u0333']

export const glitchText = (text, intensity = 0.3) => {
  return text.split('').map(c => {
    if (Math.random() < intensity && c !== ' ' && c !== '\n') {
      const glitch = diacriticals[Math.floor(Math.random() * diacriticals.length)]
      return c + glitch
    }
    return c
  }).join('')
}

// Generate random hex dump
export const generateHexDump = (lines = 4) => {
  let dump = ''
  for (let i = 0; i < lines; i++) {
    const bytes = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join(' ')
    dump += `0x${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}: ${bytes}\n`
  }
  return dump
}

// Get random quantum state
export const getQuantumState = () => {
  const states = ['superposition', 'entangled', 'collapsed', 'coherent', 'decoherent', 'oscillating', 'tunneling', 'interfering']
  return states[Math.floor(Math.random() * states.length)]
}

// Random element from array
export const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)]

// Random integer in range
export const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// Pad string for alignment
export const padEnd = (str, len) => str.padEnd(len)

// Generate random hash
export const randomHash = (length = 9) => Math.random().toString(36).substr(2, length)
