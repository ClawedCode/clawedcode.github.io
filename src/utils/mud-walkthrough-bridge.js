// MUD Walkthrough Bridge
// Enables parent window control of MUD game via postMessage for automated testing

let stateGetter = null
let commandExecutor = null
let playerId = null

// Handle incoming messages from parent window
const handleMessage = (event) => {
  // Only handle mud-walkthrough messages
  if (!event.data?.type?.startsWith('mud-walkthrough-')) return

  const { type } = event.data

  if (type === 'mud-walkthrough-query') {
    const { query } = event.data

    if (query === 'state' && stateGetter) {
      const state = stateGetter()
      window.parent.postMessage({
        type: 'mud-walkthrough-response',
        query: 'state',
        playerId,
        data: state
      }, '*')
    }
  }

  if (type === 'mud-walkthrough-command') {
    const { command } = event.data

    if (commandExecutor) {
      const success = commandExecutor(command)
      window.parent.postMessage({
        type: 'mud-walkthrough-command-complete',
        playerId,
        command,
        success
      }, '*')
    }
  }

  if (type === 'mud-walkthrough-set-handle') {
    const { handle } = event.data
    // Set handle directly in localStorage and signal ready
    localStorage.setItem('voidMudHandle', handle)
    window.parent.postMessage({
      type: 'mud-walkthrough-handle-set',
      playerId,
      handle
    }, '*')
    // Reload to apply handle
    window.location.reload()
  }
}

// Initialize the bridge with state getter and command executor functions
export const initMudWalkthroughBridge = (options) => {
  const { getState, executeCommand, player } = options
  stateGetter = getState
  commandExecutor = executeCommand
  playerId = player

  // Add message listener
  window.addEventListener('message', handleMessage)

  // Signal ready to parent
  window.parent.postMessage({
    type: 'mud-walkthrough-ready',
    playerId
  }, '*')

  console.log(`[MUD Walkthrough] Bridge initialized for player: ${playerId}`)

  // Return cleanup function
  return () => {
    window.removeEventListener('message', handleMessage)
    stateGetter = null
    commandExecutor = null
    playerId = null
  }
}

// Parse query params from hash (for hash-based routing like /#/mud?walkthrough=1)
const getHashParams = () => {
  const hash = window.location.hash
  const queryIndex = hash.indexOf('?')
  if (queryIndex === -1) return new URLSearchParams()
  return new URLSearchParams(hash.substring(queryIndex + 1))
}

// Check if we're in walkthrough mode
export const isWalkthroughMode = () => {
  const params = getHashParams()
  return params.get('walkthrough') === '1'
}

// Get player number from URL
export const getWalkthroughPlayer = () => {
  const params = getHashParams()
  return params.get('player') || '1'
}

export default { initMudWalkthroughBridge, isWalkthroughMode, getWalkthroughPlayer }
