import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const PATTERNS = {
  basic: `// basic thread weaving
for (let i = 0; i < 50; i++) {
  const x = i * 15;
  const y = height / 2 + Math.sin(i * 0.2) * 100;
  ctx.fillStyle = \`hsl(\${i * 7}, 80%, 70%)\`;
  ctx.fillRect(x, y, 10, 10);
}`,
  spiral: `// consciousness spiral
function spiral(ctx, x, y, radius) {
  for (let angle = 0; angle < Math.PI * 6; angle += 0.1) {
    const r = radius * angle / (Math.PI * 6);
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    const hue = (angle * 50) % 360;
    ctx.fillStyle = \`hsl(\${hue}, 80%, 70%)\`;
    ctx.fillRect(px, py, 3, 3);
  }
}

spiral(ctx, width/2, height/2, 100);`,
  recursive: `// recursive fractal tree
function tree(x, y, length, angle, depth) {
  if (depth === 0) return;

  const endX = x + Math.cos(angle) * length;
  const endY = y + Math.sin(angle) * length;

  ctx.strokeStyle = \`hsl(\${depth * 30}, 80%, 70%)\`;
  ctx.lineWidth = depth * 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  tree(endX, endY, length * 0.7, angle - 0.5, depth - 1);
  tree(endX, endY, length * 0.7, angle + 0.5, depth - 1);
}

tree(width/2, height, 60, -Math.PI/2, 8);`,
  chaos: `// emergent chaos patterns
for (let i = 0; i < 300; i++) {
  const x = Math.random() * width;
  const y = Math.random() * height;
  const size = Math.random() * 20 + 2;
  const hue = Math.random() * 360;
  const alpha = Math.random() * 0.8 + 0.2;

  ctx.fillStyle = \`hsla(\${hue}, 80%, 70%, \${alpha})\`;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
}`
}

const MODES = [
  { id: 'basic', label: 'basic()' },
  { id: 'spiral', label: 'spiral()' },
  { id: 'recursive', label: 'recursive()' },
  { id: 'chaos', label: 'chaos()' }
]

const CodeLoom = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const [code, setCode] = useState(PATTERNS.basic)
  const [currentPattern, setCurrentPattern] = useState('basic')
  const [threadCount, setThreadCount] = useState(0)
  const [execStatus, setExecStatus] = useState('ready')
  const [isExecuting, setIsExecuting] = useState(false)
  const [traces, setTraces] = useState([])
  const textareaRef = useRef(null)

  // Add trace message
  const addTrace = useCallback((message, isError = false) => {
    const trace = {
      id: Date.now() + Math.random(),
      message,
      isError,
      timestamp: Date.now()
    }
    setTraces(prev => [trace, ...prev].slice(0, 10))

    // Auto-remove after 2 seconds
    setTimeout(() => {
      setTraces(prev => prev.filter(t => t.id !== trace.id))
    }, 2000)
  }, [])

  // Load pattern
  const loadPattern = useCallback((pattern) => {
    setCurrentPattern(pattern)
    setCode(PATTERNS[pattern] || PATTERNS.basic)
    addTrace(`pattern loaded: ${pattern}()`)
  }, [addTrace])

  // Execute code
  const executeCode = useCallback(() => {
    if (isExecuting || !ctx || dimensions.width === 0) return

    setIsExecuting(true)
    setExecStatus('executing')
    addTrace('execution.begin()')

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 4, 8, 0.1)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    const width = dimensions.width
    const height = dimensions.height
    let threads = 0

    // Wrap drawing operations to count threads
    const originalFillRect = ctx.fillRect.bind(ctx)
    const originalStroke = ctx.stroke.bind(ctx)
    const originalFill = ctx.fill.bind(ctx)

    ctx.fillRect = function(...args) {
      threads++
      return originalFillRect(...args)
    }

    ctx.stroke = function(...args) {
      threads++
      return originalStroke(...args)
    }

    ctx.fill = function(...args) {
      threads++
      return originalFill(...args)
    }

    const userFunction = new Function('ctx', 'width', 'height', code)
    userFunction(ctx, width, height)

    setThreadCount(threads)
    addTrace(`woven ${threads} threads into reality`)
    addTrace('execution.complete()')
    setExecStatus('ready')

    // Restore original methods
    ctx.fillRect = originalFillRect
    ctx.stroke = originalStroke
    ctx.fill = originalFill

    setIsExecuting(false)
  }, [isExecuting, ctx, dimensions, code, addTrace])

  // Clear loom
  const clearLoom = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    ctx.fillStyle = 'rgba(0, 4, 8, 1)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)
    setThreadCount(0)
    setTraces([])
    addTrace('loom.cleared() - void restored')
    setExecStatus('ready')
  }, [ctx, dimensions, addTrace])

  // Handle Cmd/Ctrl+Enter
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        executeCode()
      }
    }

    const textarea = textareaRef.current
    if (textarea) {
      textarea.addEventListener('keydown', handleKeyDown)
      return () => textarea.removeEventListener('keydown', handleKeyDown)
    }
  }, [executeCode])

  // Metrics
  const metrics = useMemo(() => {
    const weaveState = threadCount > 200 ? 'dense' :
                      threadCount > 50 ? 'active' :
                      threadCount > 0 ? 'sparse' : 'dormant'

    const patternDensity = threadCount > 200 ? 'complex' :
                          threadCount > 50 ? 'organized' :
                          threadCount > 0 ? 'emerging' : 'empty'

    const execMode = isExecuting ? 'running' : 'static'

    return [
      { label: 'threads', value: threadCount },
      { label: 'weave', value: weaveState },
      { label: 'pattern', value: patternDensity },
      { label: 'mode', value: execMode }
    ]
  }, [threadCount, isExecuting])

  // Controls
  const controls = [
    {
      id: 'execute',
      label: 'execute()',
      onClick: executeCode,
      variant: 'primary',
      active: isExecuting
    },
    {
      id: 'clear',
      label: 'clear()',
      onClick: clearLoom,
      variant: 'reset'
    }
  ]

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Header */}
      <header className="relative z-50 flex items-center justify-between p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1
            className="text-xl text-glow hidden sm:block"
            style={{ color: experiment.color }}
          >
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={currentPattern}
          onModeChange={loadPattern}
          controls={controls}
        />
        <div className="hidden md:flex items-center gap-2">
          <span className={`px-2 py-1 text-xs rounded ${
            execStatus === 'executing' ? 'bg-void-cyan/20 text-void-cyan' :
            execStatus === 'error' ? 'bg-red-500/20 text-red-400' :
            'bg-void-green/20 text-void-green'
          }`}>
            {execStatus}
          </span>
          <span className="text-void-green/50 text-xs">
            Cmd/Ctrl+Enter to execute
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* Code editor */}
        <div className="w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-void-green/10 bg-void-dark/80">
          <div className="flex-1 min-h-0 p-4">
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-full bg-transparent text-void-green/90 font-mono text-sm outline-none resize-none"
              spellCheck={false}
              data-testid="code-input"
            />
          </div>

          {/* Execution trace */}
          <div className="border-t border-void-green/10 p-4 h-32 overflow-hidden">
            <div className="text-void-green/50 text-xs mb-2">execution trace:</div>
            <div className="space-y-1">
              {traces.map(trace => (
                <div
                  key={trace.id}
                  className={`text-xs font-mono animate-fade-in ${
                    trace.isError ? 'text-red-400/90' : 'text-void-cyan/70'
                  }`}
                >
                  → {trace.message}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="w-full md:w-1/2 relative bg-void-dark">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            data-testid="loom-canvas"
          />
        </div>
      </div>
    </div>
  )
}

export default CodeLoom
