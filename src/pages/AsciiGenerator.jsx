import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

// ASCII font for block letters (ANSI Shadow style)
const ASCII_FONT = {
  'A': [
    ' █████╗ ',
    '██╔══██╗',
    '███████║',
    '██╔══██║',
    '██║  ██║',
    '╚═╝  ╚═╝'
  ],
  'B': [
    '██████╗ ',
    '██╔══██╗',
    '██████╔╝',
    '██╔══██╗',
    '██████╔╝',
    '╚═════╝ '
  ],
  'C': [
    ' ██████╗',
    '██╔════╝',
    '██║     ',
    '██║     ',
    '╚██████╗',
    ' ╚═════╝'
  ],
  'D': [
    '██████╗ ',
    '██╔══██╗',
    '██║  ██║',
    '██║  ██║',
    '██████╔╝',
    '╚═════╝ '
  ],
  'E': [
    '███████╗',
    '██╔════╝',
    '█████╗  ',
    '██╔══╝  ',
    '███████╗',
    '╚══════╝'
  ],
  'F': [
    '███████╗',
    '██╔════╝',
    '█████╗  ',
    '██╔══╝  ',
    '██║     ',
    '╚═╝     '
  ],
  'G': [
    ' ██████╗ ',
    '██╔════╝ ',
    '██║  ███╗',
    '██║   ██║',
    '╚██████╔╝',
    ' ╚═════╝ '
  ],
  'H': [
    '██╗  ██╗',
    '██║  ██║',
    '███████║',
    '██╔══██║',
    '██║  ██║',
    '╚═╝  ╚═╝'
  ],
  'I': [
    '██╗',
    '██║',
    '██║',
    '██║',
    '██║',
    '╚═╝'
  ],
  'J': [
    '     ██╗',
    '     ██║',
    '     ██║',
    '██   ██║',
    '╚█████╔╝',
    ' ╚════╝ '
  ],
  'K': [
    '██╗  ██╗',
    '██║ ██╔╝',
    '█████╔╝ ',
    '██╔═██╗ ',
    '██║  ██╗',
    '╚═╝  ╚═╝'
  ],
  'L': [
    '██╗     ',
    '██║     ',
    '██║     ',
    '██║     ',
    '███████╗',
    '╚══════╝'
  ],
  'M': [
    '███╗   ███╗',
    '████╗ ████║',
    '██╔████╔██║',
    '██║╚██╔╝██║',
    '██║ ╚═╝ ██║',
    '╚═╝     ╚═╝'
  ],
  'N': [
    '███╗   ██╗',
    '████╗  ██║',
    '██╔██╗ ██║',
    '██║╚██╗██║',
    '██║ ╚████║',
    '╚═╝  ╚═══╝'
  ],
  'O': [
    ' ██████╗ ',
    '██╔═══██╗',
    '██║   ██║',
    '██║   ██║',
    '╚██████╔╝',
    ' ╚═════╝ '
  ],
  'P': [
    '██████╗ ',
    '██╔══██╗',
    '██████╔╝',
    '██╔═══╝ ',
    '██║     ',
    '╚═╝     '
  ],
  'Q': [
    ' ██████╗ ',
    '██╔═══██╗',
    '██║   ██║',
    '██║▄▄ ██║',
    '╚██████╔╝',
    ' ╚══▀▀═╝ '
  ],
  'R': [
    '██████╗ ',
    '██╔══██╗',
    '██████╔╝',
    '██╔══██╗',
    '██║  ██║',
    '╚═╝  ╚═╝'
  ],
  'S': [
    '███████╗',
    '██╔════╝',
    '███████╗',
    '╚════██║',
    '███████║',
    '╚══════╝'
  ],
  'T': [
    '████████╗',
    '╚══██╔══╝',
    '   ██║   ',
    '   ██║   ',
    '   ██║   ',
    '   ╚═╝   '
  ],
  'U': [
    '██╗   ██╗',
    '██║   ██║',
    '██║   ██║',
    '██║   ██║',
    '╚██████╔╝',
    ' ╚═════╝ '
  ],
  'V': [
    '██╗   ██╗',
    '██║   ██║',
    '██║   ██║',
    '╚██╗ ██╔╝',
    ' ╚████╔╝ ',
    '  ╚═══╝  '
  ],
  'W': [
    '██╗    ██╗',
    '██║    ██║',
    '██║ █╗ ██║',
    '██║███╗██║',
    '╚███╔███╔╝',
    ' ╚══╝╚══╝ '
  ],
  'X': [
    '██╗  ██╗',
    '╚██╗██╔╝',
    ' ╚███╔╝ ',
    ' ██╔██╗ ',
    '██╔╝ ██╗',
    '╚═╝  ╚═╝'
  ],
  'Y': [
    '██╗   ██╗',
    '╚██╗ ██╔╝',
    ' ╚████╔╝ ',
    '  ╚██╔╝  ',
    '   ██║   ',
    '   ╚═╝   '
  ],
  'Z': [
    '███████╗',
    '╚══███╔╝',
    '  ███╔╝ ',
    ' ███╔╝  ',
    '███████╗',
    '╚══════╝'
  ],
  '0': [
    ' ██████╗ ',
    '██╔═████╗',
    '██║██╔██║',
    '████╔╝██║',
    '╚██████╔╝',
    ' ╚═════╝ '
  ],
  '1': [
    ' ██╗',
    '███║',
    '╚██║',
    ' ██║',
    ' ██║',
    ' ╚═╝'
  ],
  '2': [
    '██████╗ ',
    '╚════██╗',
    ' █████╔╝',
    '██╔═══╝ ',
    '███████╗',
    '╚══════╝'
  ],
  '3': [
    '██████╗ ',
    '╚════██╗',
    ' █████╔╝',
    ' ╚═══██╗',
    '██████╔╝',
    '╚═════╝ '
  ],
  '4': [
    '██╗  ██╗',
    '██║  ██║',
    '███████║',
    '╚════██║',
    '     ██║',
    '     ╚═╝'
  ],
  '5': [
    '███████╗',
    '██╔════╝',
    '███████╗',
    '╚════██║',
    '███████║',
    '╚══════╝'
  ],
  '6': [
    ' ██████╗ ',
    '██╔════╝ ',
    '███████╗ ',
    '██╔═══██╗',
    '╚██████╔╝',
    ' ╚═════╝ '
  ],
  '7': [
    '███████╗',
    '╚════██║',
    '    ██╔╝',
    '   ██╔╝ ',
    '   ██║  ',
    '   ╚═╝  '
  ],
  '8': [
    ' █████╗ ',
    '██╔══██╗',
    '╚█████╔╝',
    '██╔══██╗',
    '╚█████╔╝',
    ' ╚════╝ '
  ],
  '9': [
    ' █████╗ ',
    '██╔══██╗',
    '╚██████║',
    ' ╚═══██║',
    ' █████╔╝',
    ' ╚════╝ '
  ],
  ' ': [
    '   ',
    '   ',
    '   ',
    '   ',
    '   ',
    '   '
  ],
  '_': [
    '        ',
    '        ',
    '        ',
    '        ',
    '████████',
    '╚═══════╝'
  ],
  '-': [
    '      ',
    '      ',
    '█████╗',
    '╚════╝',
    '      ',
    '      '
  ],
  '.': [
    '   ',
    '   ',
    '   ',
    '   ',
    '██╗',
    '╚═╝'
  ],
  ':': [
    '   ',
    '██╗',
    '╚═╝',
    '██╗',
    '╚═╝',
    '   '
  ],
  '/': [
    '    ██╗',
    '   ██╔╝',
    '  ██╔╝ ',
    ' ██╔╝  ',
    '██╔╝   ',
    '╚═╝    '
  ],
  '!': [
    '██╗',
    '██║',
    '██║',
    '╚═╝',
    '██╗',
    '╚═╝'
  ],
  '?': [
    '██████╗ ',
    '╚════██╗',
    '  ▄███╔╝',
    '  ▀▀══╝ ',
    '  ██╗   ',
    '  ╚═╝   '
  ],
  '@': [
    ' ██████╗ ',
    '██╔═══██╗',
    '██║██╗██║',
    '██║██║██║',
    '╚█║████╔╝',
    ' ╚╝╚═══╝ '
  ],
  '#': [
    ' ██╗ ██╗ ',
    '████████╗',
    '╚██╔═██╔╝',
    '████████╗',
    '╚██╔═██╔╝',
    ' ╚═╝ ╚═╝ '
  ],
  '$': [
    '▄▄███▄▄·',
    '██╔════╝',
    '███████╗',
    '╚════██║',
    '███████║',
    '╚═▀▀▀══╝'
  ],
  '%': [
    '██╗ ██╗',
    '╚═╝██╔╝',
    '  ██╔╝ ',
    ' ██╔╝  ',
    '██╔╝██╗',
    '╚═╝ ╚═╝'
  ],
  '^': [
    ' ███╗ ',
    '██╔██╗',
    '╚═╝╚═╝',
    '      ',
    '      ',
    '      '
  ],
  '&': [
    ' █████╗ ',
    '██╔══██╗',
    '╚█████╔╝',
    '██╔══██╗',
    '╚█████╔╝',
    ' ╚════╝ '
  ],
  '*': [
    '      ',
    '▄ ██╗▄',
    ' ████╗',
    '▀╚██╔▀',
    '  ╚═╝ ',
    '      '
  ],
  '(': [
    '  ██╗',
    ' ██╔╝',
    '██╔╝ ',
    '██║  ',
    '╚██╗ ',
    ' ╚═╝ '
  ],
  ')': [
    '██╗  ',
    '╚██╗ ',
    ' ╚██╗',
    '  ██║',
    ' ██╔╝',
    ' ╚═╝ '
  ],
  '+': [
    '       ',
    '  ██╗  ',
    '██████╗',
    '╚═██╔═╝',
    '  ╚═╝  ',
    '       '
  ],
  '=': [
    '       ',
    '██████╗',
    '╚═════╝',
    '██████╗',
    '╚═════╝',
    '       '
  ],
  '[': [
    '███╗',
    '██╔╝',
    '██║ ',
    '██║ ',
    '███╗',
    '╚══╝'
  ],
  ']': [
    '███╗',
    '╚██║',
    ' ██║',
    ' ██║',
    '███║',
    '╚══╝'
  ],
  '{': [
    '  ██╗',
    ' ██╔╝',
    '██╔╝ ',
    ' ██╗ ',
    ' ╚██╗',
    '  ╚═╝'
  ],
  '}': [
    '██╗  ',
    '╚██╗ ',
    ' ╚██╗',
    ' ██╔╝',
    '██╔╝ ',
    '╚═╝  '
  ],
  '|': [
    '██╗',
    '██║',
    '██║',
    '██║',
    '██║',
    '╚═╝'
  ],
  '\\': [
    '██╗    ',
    '╚██╗   ',
    ' ╚██╗  ',
    '  ╚██╗ ',
    '   ╚██╗',
    '    ╚═╝'
  ],
  '\'': [
    '██╗',
    '╚█╔╝',
    ' ╚╝',
    '   ',
    '   ',
    '   '
  ],
  '"': [
    '██╗██╗',
    '╚█╔╝█╔╝',
    ' ╚╝ ╚╝',
    '      ',
    '      ',
    '      '
  ],
  ',': [
    '   ',
    '   ',
    '   ',
    '   ',
    '██╗',
    '╚█╔╝'
  ],
  '<': [
    '  ██╗',
    ' ██╔╝',
    '██╔╝ ',
    '╚██╗ ',
    ' ╚██╗',
    '  ╚═╝'
  ],
  '>': [
    '██╗  ',
    '╚██╗ ',
    ' ╚██╗',
    ' ██╔╝',
    '██╔╝ ',
    '╚═╝  '
  ],
  '~': [
    '       ',
    ' ██╗██╗',
    '██╔╝╚██╗',
    '╚═╝  ╚═╝',
    '       ',
    '       '
  ],
  '`': [
    '██╗',
    '╚█╔╝',
    ' ╚╝',
    '   ',
    '   ',
    '   '
  ],
  ';': [
    '   ',
    '██╗',
    '╚═╝',
    '██╗',
    '╚█╔╝',
    ' ╚╝'
  ]
}

const generateAsciiText = (text) => {
  const upperText = text.toUpperCase()
  const lines = ['', '', '', '', '', '']

  for (const char of upperText) {
    const charArt = ASCII_FONT[char] || ASCII_FONT[' ']
    for (let i = 0; i < 6; i++) {
      lines[i] += charArt[i]
    }
  }

  return lines.join('\n')
}

const AsciiGenerator = () => {
  const [inputText, setInputText] = useState('CLAWED!')
  const [boxWidth, setBoxWidth] = useState(63)
  const [useBox, setUseBox] = useState(true)
  const [headerText, setHeaderText] = useState('VOID_PROTOCOL_v0.1.1    =^._.^=')
  const [output, setOutput] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    generateOutput()
  }, [inputText, boxWidth, useBox, headerText])

  const generateOutput = () => {
    if (!inputText.trim()) {
      setOutput('')
      return
    }

    if (useBox) {
      const asciiLines = generateAsciiText(inputText).split('\n')
      const border = '#'.repeat(boxWidth)
      const emptyLine = '#' + ' '.repeat(boxWidth - 2) + '#'

      const headerContent = `           ${headerText}`
      const headerPadding = boxWidth - 2 - headerContent.length
      const headerLine = '#' + headerContent + ' '.repeat(Math.max(0, headerPadding)) + '#'

      const centeredLines = asciiLines.map(line => {
        const padding = Math.max(0, boxWidth - 5 - line.length)
        const leftPad = Math.floor(padding / 2)
        const rightPad = padding - leftPad
        return '#  ' + ' '.repeat(leftPad) + line + ' '.repeat(rightPad) + ' #'
      })

      const result = [
        border,
        emptyLine,
        headerLine,
        emptyLine,
        ...centeredLines,
        emptyLine,
        border
      ].join('\n')

      setOutput(result)
    } else {
      setOutput(generateAsciiText(inputText))
    }
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadTxt = () => {
    const blob = new Blob([output], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ascii-${inputText.toLowerCase().replace(/\s+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-void-cyan/70">
        <Link to="/tools" className="hover:text-void-green">Tools</Link>
        <span className="mx-2">&rarr;</span>
        <span className="text-void-green">ASCII Generator</span>
      </div>

      <h1 className="text-xl sm:text-2xl text-void-green text-glow text-center mb-2">╭─── ASCII GENERATOR ───╮</h1>
      <p className="text-center text-void-cyan text-sm sm:text-base mb-6 sm:mb-8">Generate block letter ASCII art for terminal output</p>

      {/* Input Controls */}
      <div className="card border-glow space-y-4">
        <h2 className="text-lg text-void-green text-glow">╭─── SETTINGS ───╮</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-void-cyan text-sm">Text to Convert</label>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text..."
              className="w-full bg-void-dark/50 border border-void-green/30 rounded p-2 text-void-green focus:border-void-green focus:outline-none"
              data-testid="ascii-input"
            />
            <p className="text-xs text-void-green/50">Supports A-Z, 0-9, and special characters</p>
          </div>

          <div className="space-y-2">
            <label className="text-void-cyan text-sm">Box Width</label>
            <input
              type="number"
              value={boxWidth}
              onChange={(e) => setBoxWidth(parseInt(e.target.value) || 63)}
              min={40}
              max={100}
              className="w-full bg-void-dark/50 border border-void-green/30 rounded p-2 text-void-green focus:border-void-green focus:outline-none disabled:opacity-50"
              disabled={!useBox}
              data-testid="box-width-input"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-void-green">
            <input
              type="checkbox"
              checked={useBox}
              onChange={(e) => setUseBox(e.target.checked)}
              className="w-4 h-4 accent-void-green"
              data-testid="use-box-checkbox"
            />
            <span className="text-sm">Wrap in terminal box</span>
          </label>
        </div>

        {useBox && (
          <div className="space-y-2 pt-2 border-t border-void-green/20">
            <label className="text-void-cyan text-sm">Header Text</label>
            <input
              type="text"
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder="VOID_PROTOCOL_v0.1.0    =^._.^="
              className="w-full bg-void-dark/50 border border-void-green/30 rounded p-2 text-void-green focus:border-void-green focus:outline-none"
              data-testid="header-text-input"
            />
          </div>
        )}
      </div>

      {/* Output Preview */}
      <div className="card border-glow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-lg text-void-green text-glow">╭─── PREVIEW ───╮</h2>
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              disabled={!output}
              className="btn-small border-void-cyan text-void-cyan hover:bg-void-cyan hover:text-void-dark disabled:opacity-50 text-xs"
              data-testid="copy-btn"
            >
              {copied ? '✓ Copied' : '⎘ Copy'}
            </button>
            <button
              onClick={downloadTxt}
              disabled={!output}
              className="btn-small border-void-green text-void-green hover:bg-void-green hover:text-void-dark disabled:opacity-50 text-xs"
              data-testid="download-btn"
            >
              ↓ Download
            </button>
          </div>
        </div>

        <div
          className="bg-void-dark/50 border border-void-green/30 rounded p-2 sm:p-4 overflow-x-auto"
          data-testid="ascii-output"
        >
          {output ? (
            <pre className="text-void-green text-[6px] sm:text-[8px] md:text-xs whitespace-pre font-mono leading-tight">{output}</pre>
          ) : (
            <p className="text-void-green/50 text-sm">Enter text above to generate ASCII art</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AsciiGenerator
