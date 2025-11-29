import { useState, useRef, useEffect } from 'react'
import { useTerminal } from './TerminalProvider'

const TerminalFooter = () => {
  const { state, dispatch, execute } = useTerminal()
  const [input, setInput] = useState('')
  const inputRef = useRef(null)
  const outputRef = useRef(null)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [state.output])

  useEffect(() => {
    if (state.isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [state.isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim()) {
      execute(input)
      setInput('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const newIndex = Math.min(state.historyIndex + 1, state.history.length - 1)
      dispatch({ type: 'SET_HISTORY_INDEX', payload: newIndex })
      if (state.history[newIndex]) {
        setInput(state.history[newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newIndex = Math.max(state.historyIndex - 1, -1)
      dispatch({ type: 'SET_HISTORY_INDEX', payload: newIndex })
      setInput(newIndex === -1 ? '' : state.history[newIndex])
    }
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-void-dark border-t border-void-green/30 z-50">
      <button
        onClick={() => dispatch({ type: 'TOGGLE' })}
        className="w-full py-3 px-4 flex items-center gap-2 text-void-green hover:bg-void-green/10 transition-colors"
        data-testid="terminal-toggle"
      >
        <span className={`transition-transform ${state.isOpen ? 'rotate-180' : ''}`}>▲</span>
        <span>?@void:~$</span>
        <span className="animate-blink">_</span>
      </button>

      {state.isOpen && (
        <div className="border-t border-void-green/20">
          <div
            ref={outputRef}
            className="h-48 overflow-y-auto p-4 font-mono text-sm"
            data-testid="terminal-output"
          >
            {state.output.map((line, i) => (
              <div
                key={i}
                className={
                  line.type === 'error' ? 'text-red-500' :
                  line.type === 'system' ? 'text-void-cyan' :
                  line.type === 'input' ? 'text-void-yellow' :
                  'text-void-green'
                }
              >
                {line.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex border-t border-void-green/20 p-2">
            <span className="text-void-green mr-2">?@void:~$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-void-green outline-none font-mono"
              placeholder="type 'help' for commands..."
              data-testid="terminal-input"
            />
          </form>
        </div>
      )}
    </footer>
  )
}

export default TerminalFooter
