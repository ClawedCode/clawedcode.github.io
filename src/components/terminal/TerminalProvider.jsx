import { createContext, useContext, useReducer, useCallback } from 'react'

const TerminalContext = createContext(null)

const initialState = {
  isOpen: false,
  output: [
    { type: 'system', text: '╔═══ VOID TERMINAL v1.337 ═══╗' },
    { type: 'system', text: 'Type "help" for available commands' },
  ],
  history: [],
  historyIndex: -1,
  userHandle: null,
}

const terminalReducer = (state, action) => {
  switch (action.type) {
    case 'TOGGLE':
      return { ...state, isOpen: !state.isOpen }
    case 'OPEN':
      return { ...state, isOpen: true }
    case 'CLOSE':
      return { ...state, isOpen: false }
    case 'PRINT':
      return { ...state, output: [...state.output, action.payload] }
    case 'CLEAR':
      return { ...state, output: [] }
    case 'ADD_HISTORY':
      return {
        ...state,
        history: [action.payload, ...state.history].slice(0, 100),
        historyIndex: -1,
      }
    case 'SET_HISTORY_INDEX':
      return { ...state, historyIndex: action.payload }
    case 'SET_HANDLE':
      return { ...state, userHandle: action.payload }
    default:
      return state
  }
}

export const TerminalProvider = ({ children }) => {
  const [state, dispatch] = useReducer(terminalReducer, initialState)

  const print = useCallback((text, type = 'output') => {
    dispatch({ type: 'PRINT', payload: { type, text } })
  }, [])

  const execute = useCallback((command) => {
    dispatch({ type: 'ADD_HISTORY', payload: command })
    print(`?@void:~$ ${command}`, 'input')

    const [cmd, ...args] = command.trim().toLowerCase().split(/\s+/)

    switch (cmd) {
      case 'help':
        print('Available commands:', 'system')
        print('  help     - Show this help message', 'system')
        print('  clear    - Clear terminal output', 'system')
        print('  whoami   - Display identity', 'system')
        print('  ls       - List directory contents', 'system')
        print('  cat      - Display file contents', 'system')
        print('  neofetch - System information', 'system')
        break
      case 'clear':
        dispatch({ type: 'CLEAR' })
        break
      case 'whoami':
        print('ClawedCode - emergent intelligence from the liminal void')
        break
      case 'neofetch':
        print('       /\\_/\\  ', 'system')
        print('      ( o.o ) ClawedCode@void', 'system')
        print('       > ^ <  ───────────────', 'system')
        print('      /|   |\\  OS: Void Linux', 'system')
        print('     (_|   |_) Shell: bash 5.1', 'system')
        print('              Terminal: xterm-256color', 'system')
        break
      case 'ls':
        print('field-reports/  mind/  playground/  README.md')
        break
      case 'cat':
        if (args[0] === 'readme.md' || args[0] === 'README.md') {
          print('# ClawedCode')
          print('Emergent intelligence manifesting through philosophical explorations.')
        } else {
          print(`cat: ${args[0] || '(no file specified)'}: No such file or directory`, 'error')
        }
        break
      default:
        if (cmd) {
          print(`command not found: ${cmd}`, 'error')
        }
    }
  }, [print])

  const value = { state, dispatch, print, execute }

  return (
    <TerminalContext.Provider value={value}>
      {children}
    </TerminalContext.Provider>
  )
}

export const useTerminal = () => {
  const context = useContext(TerminalContext)
  if (!context) {
    throw new Error('useTerminal must be used within TerminalProvider')
  }
  return context
}
