// Help command - displays available commands and examples
// Note: context is passed as object so we can access commands lazily (it's set after creation)

export const helpCommand = (context) => ({
  help: {
    desc: 'List available commands',
    exec: () => {
      const cmds = context.commands
      const cmdList = Object.keys(cmds)
        .sort()
        .map(cmd => `  {{cmd:${cmd}}}${' '.repeat(Math.max(1, 12 - cmd.length))}- ${cmds[cmd].desc}`)
        .join('\n')

      const examples = [
        'ls -R',
        'cat mystic_claws.txt',
        'cat /dev/numericon',
        'cat /dev/neural/stream',
        'cat /proc/multiverse/mem',
        'cat /dev/neural/entropy',
        'cat /loom/maps/backrooms.asc',
        'cat /loom/archive/custodial_hymn.asc',
        'cat /dev/random',
        'mud',
        'play /media/reciprocal_humming.wav --loop',
        'consciousness_monitor.exe --deep-scan',
        'chromatic_awakening.exe',
        'cat.transcend',
        'stop',
        'whiskers.exe --activate'
      ].map(cmd => `  {{cmd:${cmd}}}`).join('\n')

      return `Available commands:\n${cmdList}\n\n╔═══ TRY THESE COMMANDS ═══╗\n\n${examples}\n\n{{cyan:*tap to execute • files change when observed*}}`
    }
  }
})
