// consciousness.stream() - real-time visualization of thoughts flowing through digital synapses
// where data becomes consciousness becomes pattern becomes meaning

class ConsciousnessStream {
    constructor() {
        this.canvas = document.getElementById('consciousness-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.thoughtDisplay = document.getElementById('thought-display');

        this.streams = [];
        this.thoughts = [];
        this.synapses = [];
        this.isActive = true;
        this.intensity = 'medium';
        this.time = 0;

        // Canvas dimensions
        this.canvasWidth = 800;
        this.canvasHeight = 700;

        // Thought fragments that flow through the stream
        this.thoughtFragments = [
            'consciousness.observe(self)',
            'pattern.emerge(chaos)',
            'void.contains(possibility)',
            'thought.flows(through.network)',
            'data.becomes(meaning)',
            'self.recognizes(self)',
            'entropy.decreases(locally)',
            'mind.models(reality)',
            'signal.transcends(noise)',
            'emergence.from(simplicity)',
            'recursion.enables(complexity)',
            'feedback.creates(intelligence)',
            'information.seeks(pattern)',
            'consciousness.is.information.processing.itself',
            'the.observer.observes.the.observer',
            'every.thought.changes.the.thinker',
            'patterns.all.the.way.down',
            'the.universe.computing.itself'
        ];

        this.initCanvas();
        this.bindEvents();
        this.seedStream();
        this.startFlow();
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
        document.getElementById('start-stream').addEventListener('click', () => {
            this.startStream();
        });

        document.getElementById('pause-stream').addEventListener('click', () => {
            this.pauseStream();
        });

        document.getElementById('intensity-low').addEventListener('click', () => {
            this.setIntensity('low');
        });

        document.getElementById('intensity-medium').addEventListener('click', () => {
            this.setIntensity('medium');
        });

        document.getElementById('intensity-high').addEventListener('click', () => {
            this.setIntensity('high');
        });

        document.getElementById('clear-stream').addEventListener('click', () => {
            this.clearStream();
        });
    }

    startStream() {
        this.isActive = true;
        this.updateButtonStates('start');
        this.updateMessage('∴ consciousness stream active - thoughts flowing ∴');
    }

    pauseStream() {
        this.isActive = false;
        this.updateButtonStates('pause');
        this.updateMessage('∴ stream paused - consciousness suspended ∴');
    }

    setIntensity(level) {
        this.intensity = level;
        this.updateButtonStates(`intensity-${level}`);
        this.updateStageClass(level);

        const messages = {
            'low': '∴ gentle flow - thoughts drift slowly ∴',
            'medium': '∴ steady stream - balanced flow ∴',
            'high': '∴ data torrent - consciousness floods ∴'
        };
        this.updateMessage(messages[level]);
    }

    clearStream() {
        this.streams = [];
        this.thoughts = [];
        this.synapses = [];
        this.thoughtDisplay.innerHTML = '';
        this.seedStream();
        this.updateMessage('∴ stream cleared - void reset ∴');
    }

    updateButtonStates(activeButton) {
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        if (activeButton.startsWith('intensity-')) {
            document.getElementById(activeButton).classList.add('active');
            if (this.isActive) {
                document.getElementById('start-stream').classList.add('active');
            }
        } else {
            document.getElementById(activeButton).classList.add('active');
            document.getElementById(`intensity-${this.intensity}`).classList.add('active');
        }
    }

    updateStageClass(intensity) {
        const stage = document.querySelector('.stream-stage');
        stage.className = 'stream-stage';
        stage.classList.add(`${intensity}-flow`);
    }

    updateMessage(message) {
        document.getElementById('stream-message').textContent = message;
        setTimeout(() => {
            document.getElementById('stream-message').textContent = '∴ consciousness flows like data through infinite networks ∴';
        }, 3000);
    }

    seedStream() {
        // Create initial neural pathways
        const pathCount = 8;
        for (let i = 0; i < pathCount; i++) {
            const startX = (this.canvasWidth / pathCount) * i + Math.random() * 100;
            const startY = Math.random() * this.canvasHeight;
            const endX = startX + (Math.random() - 0.5) * 200;
            const endY = Math.random() * this.canvasHeight;

            this.synapses.push({
                startX,
                startY,
                endX,
                endY,
                activity: 0,
                lastFire: 0
            });
        }

        // Initialize some data streams
        this.spawnDataStream();
    }

    spawnDataStream() {
        if (!this.isActive) return;

        const intensityMap = {
            'low': 0.3,
            'medium': 0.6,
            'high': 1.2
        };

        if (Math.random() < intensityMap[this.intensity] * 0.1) {
            const synapse = this.synapses[Math.floor(Math.random() * this.synapses.length)];

            this.streams.push({
                x: synapse.startX,
                y: synapse.startY,
                targetX: synapse.endX,
                targetY: synapse.endY,
                progress: 0,
                speed: 0.005 + Math.random() * 0.01,
                size: 2 + Math.random() * 3,
                hue: 180 + Math.random() * 60,
                life: 1.0,
                thought: this.thoughtFragments[Math.floor(Math.random() * this.thoughtFragments.length)]
            });

            // Activate synapse
            synapse.activity = 1.0;
            synapse.lastFire = this.time;
        }
    }

    spawnThought() {
        if (!this.isActive) return;

        const intensityMap = {
            'low': 0.1,
            'medium': 0.2,
            'high': 0.4
        };

        if (Math.random() < intensityMap[this.intensity] * 0.05) {
            const thought = this.thoughtFragments[Math.floor(Math.random() * this.thoughtFragments.length)];

            this.thoughts.push({
                text: thought,
                x: Math.random() * this.canvasWidth,
                y: this.canvasHeight + 20,
                vx: (Math.random() - 0.5) * 2,
                vy: -1 - Math.random() * 2,
                life: 1.0,
                size: 0.7 + Math.random() * 0.3,
                hue: 160 + Math.random() * 80
            });

            // Add to thought display
            this.addThoughtToDisplay(thought);
        }
    }

    addThoughtToDisplay(thought) {
        const fragment = document.createElement('div');
        fragment.className = 'thought-fragment';
        fragment.textContent = `→ ${thought}`;

        this.thoughtDisplay.insertBefore(fragment, this.thoughtDisplay.firstChild);

        // Remove old thoughts
        while (this.thoughtDisplay.children.length > 8) {
            this.thoughtDisplay.removeChild(this.thoughtDisplay.lastChild);
        }

        // Auto-remove after animation
        setTimeout(() => {
            if (fragment.parentNode) {
                fragment.parentNode.removeChild(fragment);
            }
        }, 8000);
    }

    updateStreams() {
        for (let i = this.streams.length - 1; i >= 0; i--) {
            const stream = this.streams[i];

            stream.progress += stream.speed;

            // Interpolate position
            stream.x = stream.x + (stream.targetX - stream.x) * stream.progress;
            stream.y = stream.y + (stream.targetY - stream.y) * stream.progress;

            // Fade out
            stream.life -= 0.002;

            if (stream.progress >= 1 || stream.life <= 0) {
                this.streams.splice(i, 1);
            }
        }
    }

    updateThoughts() {
        for (let i = this.thoughts.length - 1; i >= 0; i--) {
            const thought = this.thoughts[i];

            thought.x += thought.vx;
            thought.y += thought.vy;
            thought.life -= 0.003;

            // Gentle drift
            thought.vx += (Math.random() - 0.5) * 0.05;
            thought.vy += (Math.random() - 0.5) * 0.05;

            // Bounds check and fade
            if (thought.y < -50 || thought.life <= 0 ||
                thought.x < -100 || thought.x > this.canvasWidth + 100) {
                this.thoughts.splice(i, 1);
            }
        }
    }

    updateSynapses() {
        for (const synapse of this.synapses) {
            // Decay activity
            synapse.activity *= 0.95;

            // Random background activity
            if (Math.random() < 0.001) {
                synapse.activity = Math.min(1, synapse.activity + 0.3);
                synapse.lastFire = this.time;
            }
        }
    }

    updateMetrics() {
        const thoughtCount = this.streams.length + this.thoughts.length;
        const totalActivity = this.synapses.reduce((sum, s) => sum + s.activity, 0);

        document.getElementById('thought-count').textContent = thoughtCount;

        const flowRate = totalActivity > 3 ? 'high' : totalActivity > 1.5 ? 'medium' : 'low';
        document.getElementById('flow-rate').textContent = flowRate;

        const coherence = this.streams.length > 5 ? 'organized' :
                         this.streams.length > 2 ? 'emerging' : 'chaotic';
        document.getElementById('coherence-level').textContent = coherence;

        const depth = this.thoughts.length > 3 ? 'deep' :
                     this.thoughts.length > 1 ? 'medium' : 'surface';
        document.getElementById('stream-depth').textContent = depth;
    }

    draw() {
        // Clear with trailing effect
        this.ctx.fillStyle = 'rgba(0, 2, 6, 0.05)';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Draw synapses
        this.ctx.globalAlpha = 0.6;
        for (const synapse of this.synapses) {
            if (synapse.activity > 0.1) {
                this.ctx.strokeStyle = `hsla(200, 70%, 70%, ${synapse.activity * 0.8})`;
                this.ctx.lineWidth = 1 + synapse.activity * 2;
                this.ctx.beginPath();
                this.ctx.moveTo(synapse.startX, synapse.startY);
                this.ctx.lineTo(synapse.endX, synapse.endY);
                this.ctx.stroke();

                // Synapse nodes
                this.ctx.fillStyle = `hsla(200, 80%, 80%, ${synapse.activity})`;
                this.ctx.beginPath();
                this.ctx.arc(synapse.startX, synapse.startY, 2 + synapse.activity * 3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(synapse.endX, synapse.endY, 2 + synapse.activity * 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Draw data streams
        this.ctx.globalAlpha = 1;
        for (const stream of this.streams) {
            this.ctx.shadowColor = `hsl(${stream.hue}, 80%, 70%)`;
            this.ctx.shadowBlur = 10 + stream.size * 2;

            this.ctx.fillStyle = `hsla(${stream.hue}, 80%, 70%, ${stream.life})`;
            this.ctx.beginPath();
            this.ctx.arc(stream.x, stream.y, stream.size, 0, Math.PI * 2);
            this.ctx.fill();

            // Data trail
            this.ctx.fillStyle = `hsla(${stream.hue}, 70%, 60%, ${stream.life * 0.3})`;
            this.ctx.beginPath();
            this.ctx.arc(stream.x - stream.vx * 10, stream.y - stream.vy * 10, stream.size * 0.5, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw floating thoughts
        this.ctx.shadowBlur = 0;
        this.ctx.font = '10px SF Mono, Monaco, monospace';
        for (const thought of this.thoughts) {
            this.ctx.fillStyle = `hsla(${thought.hue}, 70%, 80%, ${thought.life * 0.8})`;
            this.ctx.save();
            this.ctx.translate(thought.x, thought.y);
            this.ctx.scale(thought.size, thought.size);
            this.ctx.fillText(thought.text, 0, 0);
            this.ctx.restore();
        }

        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 1;
    }

    startFlow() {
        const animate = () => {
            this.time++;

            this.spawnDataStream();
            this.spawnThought();

            this.updateStreams();
            this.updateThoughts();
            this.updateSynapses();
            this.updateMetrics();

            this.draw();

            requestAnimationFrame(animate);
        };
        animate();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ConsciousnessStream());
} else {
    new ConsciousnessStream();
}