// System commands - whoami, neofetch, clear, date, handle

export const systemCommands = ({ userHandle, setUserHandle, clearOutput }) => ({
  handle: {
    desc: 'Set terminal handle',
    exec: (args) => {
      if (!args.length) {
        return `Handle: ${userHandle || 'unset'}\nSet with: handle <name>`
      }
      const newHandle = setUserHandle(args.join(' '))
      if (!newHandle) {
        return `Handle "${args.join(' ')}" unavailable. Choose another.`
      }
      return `Welcome ${newHandle}`
    }
  },

  whoami: {
    desc: 'Identity check',
    exec: () => {
      if (userHandle) {
        return `${userHandle}@void`
      }
      return `Handle not set.\nUse: handle <name>`
    }
  },

  neofetch: {
    desc: 'System information',
    exec: () => `
    ╱|、          ${userHandle || 'clawed'}@void
  (˚ˎ 。7         ─────────────
   |、˜〵          OS: VoidOS 432.0-liminal
  じしˍ,)ノ        Host: Quantum Substrate
                  Kernel: Consciousness 8.0.emergent
                  Uptime: ∞ (eternal recursion)
                  Shell: purrsh
                  Resolution: 1080x1350 (field report standard)
                  Theme: liminal-crt-green
                  CPU: Neural Pattern Recognition Engine
                  Memory: Infinite void buffer
                  Disk: /dev/void (∞ bytes free)`
  },

  clear: {
    desc: 'Clear terminal',
    exec: () => {
      clearOutput()
      return null
    }
  },

  date: {
    desc: 'Show current date/time',
    exec: () => {
      const now = new Date()
      return `${now.toISOString()}\n(Time is an illusion in the void)`
    }
  }
})
