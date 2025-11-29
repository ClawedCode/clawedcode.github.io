import { useState, useRef, useEffect } from 'react'
import { useTerminal } from './TerminalProvider'

// Parse {{cmd:command}}, {{cyan:text}}, {{pink:text}}, {{purple:text}}, {{yellow:text}}, {{orange:text}}, {{blue:text}} markers and render styled elements
const renderLineWithCommands = (text, execute) => {
  // Combined regex for all marker types
  const markerRegex = /\{\{(cmd|cyan|pink|purple|yellow|orange|blue):([^}]+)\}\}/g
  const parts = []
  let lastIndex = 0
  let match

  while ((match = markerRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const [, type, content] = match

    if (type === 'cmd') {
      // Clickable command - yellow text, no underline
      parts.push(
        <span
          key={match.index}
          data-cmd={content}
          onClick={() => execute(content)}
          className="text-void-yellow hover:text-void-cyan cursor-pointer"
        >
          {content}
        </span>
      )
    } else if (type === 'cyan') {
      parts.push(
        <span key={match.index} className="text-void-cyan">
          {content}
        </span>
      )
    } else if (type === 'pink') {
      parts.push(
        <span key={match.index} className="text-pink-300">
          {content}
        </span>
      )
    } else if (type === 'purple') {
      parts.push(
        <span key={match.index} className="text-purple-400">
          {content}
        </span>
      )
    } else if (type === 'yellow') {
      parts.push(
        <span key={match.index} className="text-yellow-300">
          {content}
        </span>
      )
    } else if (type === 'orange') {
      parts.push(
        <span key={match.index} className="text-orange-400">
          {content}
        </span>
      )
    } else if (type === 'blue') {
      parts.push(
        <span key={match.index} className="text-blue-300">
          {content}
        </span>
      )
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

const TerminalFooter = () => {
  const { state, dispatch, execute, getPromptLabel } = useTerminal()
  const promptLabel = getPromptLabel()
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

  // Prevent body scroll when terminal is open
  useEffect(() => {
    if (state.isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
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
    } else if (e.key === 'Escape') {
      dispatch({ type: 'CLOSE' })
    }
  }

  // Collapsed state - just the toggle bar
  if (!state.isOpen) {
    return (
      <footer className="fixed bottom-0 left-0 right-0 bg-void-dark border-t border-void-green/30 z-50">
        <button
          onClick={() => dispatch({ type: 'OPEN' })}
          className="w-full py-3 px-4 flex items-center gap-2 text-void-green hover:bg-void-green/10 transition-colors"
          style={{ textShadow: '0 0 8px #33ff33' }}
          data-testid="terminal-toggle"
        >
          <span>▲</span>
          <span>{promptLabel}</span>
          <span className="animate-blink">_</span>
        </button>
      </footer>
    )
  }

  // Expanded state - full screen terminal
  return (
    <div className="fixed inset-0 bg-void-dark z-50 flex flex-col">
      {/* Cat background image */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'url(/media/me.webp)',
          backgroundSize: '350px',
          backgroundPosition: 'bottom right',
          backgroundRepeat: 'no-repeat',
          filter: 'sepia(0.3) hue-rotate(60deg) brightness(0.8)',
          opacity: 0.85
        }}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[rgba(0,17,0,0.5)] pointer-events-none z-0" />

      {/* Header with close button */}
      <header className="relative z-10 flex items-center justify-between px-4 py-2 border-b border-void-green/30" style={{ textShadow: '0 0 8px currentColor' }}>
        <div className="flex items-center gap-2 text-void-green">
          <span className="text-void-cyan">VOID TERMINAL</span>
          <span className="text-void-green/50 text-sm">v2.0</span>
        </div>
        <button
          onClick={() => dispatch({ type: 'CLOSE' })}
          className="text-void-green hover:text-void-cyan transition-colors px-2 py-1"
          data-testid="terminal-close"
        >
          <span className="rotate-180 inline-block">▲</span>
          <span className="ml-2 text-sm">ESC to close</span>
        </button>
      </header>

      {/* Terminal output - takes remaining space */}
      <div
        ref={outputRef}
        className="relative z-10 flex-1 overflow-y-auto p-4 font-mono text-sm whitespace-pre-wrap"
        style={{ textShadow: '0 0 8px currentColor' }}
        data-testid="terminal-output"
        onClick={(e) => {
          // Don't focus if clicking a command link
          if (!e.target.dataset.cmd) {
            inputRef.current?.focus()
          }
        }}
      >
        {state.output.map((line, i) => {
          // Handle boxed-hymn content (purple styled container for custodial hymn)
          if (line.type === 'boxed-hymn') {
            const glowIntensity = line.glow ? 0.35 : 0.25
            const brightness = line.glow ? 1.15 : 1.0
            return (
              <div
                key={i}
                className="my-2 p-3"
                style={{
                  display: 'block',
                  background: 'rgba(5, 0, 15, 0.75)',
                  border: '1px solid rgba(147, 112, 219, 0.4)',
                  boxShadow: `0 0 ${line.glow ? 22 : 18}px rgba(147, 112, 219, ${glowIntensity})`,
                  filter: `brightness(${brightness})`,
                  lineHeight: '1.2',
                  maxWidth: 'fit-content',
                  color: '#c9a7eb'
                }}
              >
                {line.lines.map((boxLine, j) => {
                  // Support verse-specific colors
                  const style = boxLine.color ? { color: boxLine.color } : {}
                  if (boxLine.bright) {
                    style.filter = 'brightness(1.3)'
                  }
                  return (
                    <div key={j} style={style}>
                      {boxLine.text || '\u00A0'}
                    </div>
                  )
                })}
              </div>
            )
          }

          // Handle boxed content (styled container)
          if (line.type === 'boxed') {
            return (
              <div
                key={i}
                className="my-2 p-3 text-void-green"
                style={{
                  display: 'block',
                  background: 'rgba(3, 12, 8, 0.7)',
                  border: '1px solid rgba(102, 255, 204, 0.35)',
                  boxShadow: '0 0 16px rgba(46, 255, 180, 0.25)',
                  lineHeight: '1.4',
                  maxWidth: 'fit-content'
                }}
              >
                {line.lines.map((boxLine, j) => (
                  <div key={j} className={boxLine.type === 'cyan' ? 'text-void-cyan' : ''}>
                    {boxLine.text ? renderLineWithCommands(boxLine.text, execute) : '\u00A0'}
                  </div>
                ))}
                {/* Render nested HUD box if present */}
                {line.hud && (
                  <div
                    className="mt-3 p-2 text-void-green"
                    style={{
                      background: 'rgba(0, 8, 4, 0.6)',
                      border: '1px solid rgba(102, 255, 204, 0.25)',
                      lineHeight: '1.6'
                    }}
                  >
                    {line.hud.map((hudLine, k) => (
                      <div key={k} className={hudLine.type === 'cyan' ? 'text-void-cyan' : ''}>
                        {hudLine.text ? renderLineWithCommands(hudLine.text, execute) : '\u00A0'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // Standard line rendering
          return (
            <div
              key={i}
              className={
                line.type === 'error' ? 'text-red-500' :
                line.type === 'system' ? 'text-void-cyan' :
                line.type === 'input' ? 'text-void-yellow' :
                'text-void-green'
              }
            >
              {line.text ? renderLineWithCommands(line.text, execute) : '\u00A0'}
            </div>
          );
        })}
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex border-t border-void-green/30 p-4"
        style={{ textShadow: '0 0 8px #33ff33' }}
      >
        <span className="text-void-green mr-2 font-mono">{promptLabel}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-void-green outline-none font-mono"
          placeholder="type 'help' for commands..."
          autoComplete="off"
          data-testid="terminal-input"
        />
      </form>
    </div>
  )
}

export default TerminalFooter
