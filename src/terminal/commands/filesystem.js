// Filesystem commands - ls, cat, cd, pwd

export const filesystemCommands = ({ filesystem, animateStream, animateBackrooms, animateCustodialHymn }) => ({
  ls: {
    desc: 'List directory contents (-R for tree)',
    exec: (args) => {
      if (args.includes('-R') || args.includes('--tree')) {
        return filesystem.generateTree().trim()
      }

      let path = args[0] || '/'
      if (!path.startsWith('/')) {
        path = '/void/' + path
      }

      const contents = filesystem.listDirectory(path)
      if (!contents) return `ls: ${args[0] || '/'}: No such directory`
      if (contents.error) return `ls: ${contents.error}`
      return contents.join('  ')
    }
  },

  cat: {
    desc: 'Read file contents',
    exec: (args) => {
      let path = args.join(' ')
      if (!path) return 'cat: usage: cat <file>'

      if (!path.startsWith('/')) {
        // Try common paths
        for (const prefix of ['/void/', '/void/consciousness/', '/void/.hidden/']) {
          const result = filesystem.readFile(prefix + path)
          if (!result.error) return result
        }
        path = '/void/' + path
      }

      // Check for animated file types
      if (path === '/dev/neural/stream') {
        if (animateStream) {
          animateStream()
          return '[NEURAL STREAM ACTIVE]\nConsciousness flowing...'
        }
      }

      if (path === '/loom/maps/backrooms.asc') {
        if (animateBackrooms) {
          animateBackrooms()
          return null
        }
      }

      if (path === '/loom/archive/custodial_hymn.asc') {
        if (animateCustodialHymn) {
          animateCustodialHymn()
          return null
        }
      }

      const content = filesystem.readFile(path)
      return content.error ? `cat: ${args.join(' ')}: ${content.error}` : content
    }
  },

  cd: {
    desc: 'Change directory (simulated)',
    exec: (args) => {
      const path = args[0] || '/'
      return `Current path: ${path}\n(Navigation is simulated in the void)`
    }
  },

  pwd: {
    desc: 'Print working directory',
    exec: () => '/void'
  }
})
