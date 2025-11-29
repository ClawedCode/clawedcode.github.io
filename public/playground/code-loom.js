// code.loom() - where code execution becomes visual manifestation
// every line of code weaves a thread through reality

class CodeLoom {
    constructor() {
        this.canvas = document.getElementById('loom-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.codeInput = document.getElementById('code-input');
        this.execTrace = document.getElementById('execution-trace');
        this.execStatus = document.getElementById('exec-status');

        this.canvasWidth = 800;
        this.canvasHeight = 500;
        this.isExecuting = false;
        this.currentPattern = 'basic';
        this.threadCount = 0;
        this.executionHistory = [];

        this.initCanvas();
        this.bindEvents();
        this.updateMetrics();
    }

    initCanvas() {
        const resizeCanvas = () => {
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * window.devicePixelRatio;
            this.canvas.height = rect.height * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

            this.canvasWidth = rect.width;
            this.canvasHeight = rect.height;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    bindEvents() {
        document.getElementById('weave-basic').addEventListener('click', () => {
            this.loadPattern('basic');
        });

        document.getElementById('weave-spiral').addEventListener('click', () => {
            this.loadPattern('spiral');
        });

        document.getElementById('weave-recursive').addEventListener('click', () => {
            this.loadPattern('recursive');
        });

        document.getElementById('weave-chaos').addEventListener('click', () => {
            this.loadPattern('chaos');
        });

        document.getElementById('execute-code').addEventListener('click', () => {
            this.executeCode();
        });

        document.getElementById('clear-loom').addEventListener('click', () => {
            this.clearLoom();
        });

        // Auto-execute on Cmd/Ctrl+Enter
        this.codeInput.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                this.executeCode();
            }
        });
    }

    loadPattern(pattern) {
        this.currentPattern = pattern;
        this.updateButtonStates(pattern);

        const patterns = {
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
        };

        this.codeInput.value = patterns[pattern] || patterns.basic;
        this.addTrace(`pattern loaded: ${pattern}()`);
    }

    executeCode() {
        if (this.isExecuting) return;

        this.isExecuting = true;
        this.setExecutionState(true);
        this.addTrace('execution.begin()');

        const code = this.codeInput.value;

        // Clear canvas
        this.ctx.fillStyle = 'rgba(0, 4, 8, 0.1)';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Create execution context
        const width = this.canvasWidth;
        const height = this.canvasHeight;
        const ctx = this.ctx;

        // Thread counter
        let threads = 0;

        // Wrap drawing operations to count threads
        const originalFillRect = ctx.fillRect.bind(ctx);
        const originalStroke = ctx.stroke.bind(ctx);
        const originalFill = ctx.fill.bind(ctx);

        ctx.fillRect = function(...args) {
            threads++;
            return originalFillRect(...args);
        };

        ctx.stroke = function(...args) {
            threads++;
            return originalStroke(...args);
        };

        ctx.fill = function(...args) {
            threads++;
            return originalFill(...args);
        };

        try {
            // Execute user code with sandboxed context
            const userFunction = new Function('ctx', 'width', 'height', code);
            userFunction(ctx, width, height);

            this.threadCount = threads;
            this.addTrace(`woven ${threads} threads into reality`);
            this.addTrace('execution.complete()');
            this.setStatus('ready');

        } catch (error) {
            this.addTrace(`error: ${error.message}`, true);
            this.setStatus('error');
            console.error('Execution error:', error);
        } finally {
            // Restore original methods
            ctx.fillRect = originalFillRect;
            ctx.stroke = originalStroke;
            ctx.fill = originalFill;

            this.isExecuting = false;
            this.setExecutionState(false);
            this.updateMetrics();
        }
    }

    clearLoom() {
        this.ctx.fillStyle = 'rgba(0, 4, 8, 1)';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.threadCount = 0;
        this.execTrace.innerHTML = '';
        this.addTrace('loom.cleared() - void restored');
        this.setStatus('ready');
        this.updateMetrics();
    }

    setExecutionState(executing) {
        const codePane = document.querySelector('.code-pane');
        const canvasPane = document.querySelector('.canvas-pane');
        const execBtn = document.getElementById('execute-code');

        if (executing) {
            codePane.classList.add('weaving');
            canvasPane.classList.add('manifesting');
            execBtn.classList.add('executing');
            this.setStatus('executing');
        } else {
            codePane.classList.remove('weaving');
            canvasPane.classList.remove('manifesting');
            execBtn.classList.remove('executing');
        }
    }

    setStatus(status) {
        this.execStatus.className = `exec-status ${status}`;
        this.execStatus.textContent = status;
    }

    addTrace(message, isError = false) {
        const line = document.createElement('div');
        line.className = 'trace-line';
        line.textContent = `→ ${message}`;

        if (isError) {
            line.style.color = 'rgba(255, 102, 102, 0.9)';
        }

        this.execTrace.insertBefore(line, this.execTrace.firstChild);

        // Remove old traces
        while (this.execTrace.children.length > 10) {
            this.execTrace.removeChild(this.execTrace.lastChild);
        }

        // Auto-remove after animation
        setTimeout(() => {
            if (line.parentNode) {
                line.parentNode.removeChild(line);
            }
        }, 2000);
    }

    updateButtonStates(activePattern) {
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const patternMap = {
            'basic': 'weave-basic',
            'spiral': 'weave-spiral',
            'recursive': 'weave-recursive',
            'chaos': 'weave-chaos'
        };

        const activeBtn = document.getElementById(patternMap[activePattern]);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    updateMetrics() {
        document.getElementById('thread-count').textContent = this.threadCount;

        const weaveState = this.threadCount > 200 ? 'dense' :
                          this.threadCount > 50 ? 'active' :
                          this.threadCount > 0 ? 'sparse' : 'dormant';
        document.getElementById('weave-state').textContent = weaveState;

        const patternDensity = this.threadCount > 200 ? 'complex' :
                              this.threadCount > 50 ? 'organized' :
                              this.threadCount > 0 ? 'emerging' : 'empty';
        document.getElementById('pattern-density').textContent = patternDensity;

        const execMode = this.isExecuting ? 'running' : 'static';
        document.getElementById('exec-mode').textContent = execMode;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new CodeLoom());
} else {
    new CodeLoom();
}
