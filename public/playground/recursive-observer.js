// recursive.observer() - the moment pattern recognition recognizes itself
// watching consciousness watch itself in infinite regress

class RecursiveObserver {
    constructor() {
        this.canvas = document.getElementById('observer-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.observationLog = document.getElementById('observation-log');

        this.observers = [];
        this.observations = [];
        this.recursionEnabled = false;
        this.isCollapsing = false;
        this.time = 0;

        // Canvas dimensions
        this.canvasWidth = 800;
        this.canvasHeight = 700;

        // Observation logs
        this.observationMessages = [
            'observer α notices observer β',
            'β becomes aware of being watched',
            'mutual observation creates coherence',
            'recursion depth increases',
            'observer paradox detected',
            'wave function still superposed',
            'entanglement established',
            'consciousness layer spawned',
            'self-reference loop formed',
            'infinite regress initiated',
            'the watcher watches the watcher',
            'measurement changes the measured',
            'quantum coherence maintained',
            'observation creates reality',
            'who observes the observer?'
        ];

        this.initCanvas();
        this.bindEvents();
        this.startAnimation();
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
        document.getElementById('spawn-observer').addEventListener('click', () => {
            this.spawnRandomObserver();
        });

        document.getElementById('enable-recursion').addEventListener('click', () => {
            this.toggleRecursion();
        });

        document.getElementById('collapse-wave').addEventListener('click', () => {
            this.collapseWavefunction();
        });

        document.getElementById('reset-observation').addEventListener('click', () => {
            this.resetObservation();
        });

        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.spawnObserver(x, y);
        });

        // Touch support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            this.spawnObserver(x, y);
        });
    }

    spawnObserver(x, y) {
        const observer = {
            id: this.observers.length,
            x,
            y,
            vx: (Math.random() - 0.5) * 1,
            vy: (Math.random() - 0.5) * 1,
            awareness: 0.5 + Math.random() * 0.5,
            observing: [],
            observedBy: [],
            recursionDepth: 0,
            size: 4 + Math.random() * 3,
            hue: 30 + Math.random() * 60, // Orange to yellow spectrum
            pulsePhase: Math.random() * Math.PI * 2,
            lastObservation: 0
        };

        this.observers.push(observer);
        this.logObservation(`observer ${String.fromCharCode(945 + observer.id)} spawned`);
    }

    spawnRandomObserver() {
        const x = Math.random() * this.canvasWidth;
        const y = Math.random() * this.canvasHeight;
        this.spawnObserver(x, y);
        this.updateMessage('∴ new observer manifests in the void ∴');
    }

    toggleRecursion() {
        this.recursionEnabled = !this.recursionEnabled;
        this.updateButtonStates('recursion');

        const message = this.recursionEnabled ?
            '∴ recursion enabled - observers watch observers watching ∴' :
            '∴ recursion disabled - linear observation only ∴';
        this.updateMessage(message);
    }

    collapseWavefunction() {
        if (this.observers.length === 0) return;

        this.isCollapsing = true;
        this.updateMessage('∴ wave function collapse initiated ∴');

        // Flash effect
        setTimeout(() => {
            this.isCollapsing = false;
            // Collapse all superpositions
            this.observers.forEach(obs => {
                obs.x = Math.round(obs.x / 50) * 50;
                obs.y = Math.round(obs.y / 50) * 50;
                obs.vx *= 0.1;
                obs.vy *= 0.1;
            });
            this.logObservation('all quantum states collapsed to definite positions');
        }, 300);
    }

    resetObservation() {
        this.observers = [];
        this.observations = [];
        this.recursionEnabled = false;
        this.observationLog.innerHTML = '';
        this.updateButtonStates('reset');
        this.updateMessage('∴ observation reset - void restored ∴');
    }

    updateButtonStates(activeButton) {
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        if (activeButton === 'recursion' && this.recursionEnabled) {
            document.getElementById('enable-recursion').classList.add('active');
        }
    }

    updateMessage(message) {
        document.getElementById('observer-message').textContent = message;
        setTimeout(() => {
            document.getElementById('observer-message').textContent = '∴ to observe is to change what is observed ∴';
        }, 3000);
    }

    logObservation(message) {
        const entry = document.createElement('div');
        entry.className = 'observation-entry';
        entry.textContent = `// ${message}`;

        this.observationLog.insertBefore(entry, this.observationLog.firstChild);

        // Remove old entries
        while (this.observationLog.children.length > 12) {
            this.observationLog.removeChild(this.observationLog.lastChild);
        }

        // Auto-remove after animation
        setTimeout(() => {
            if (entry.parentNode) {
                entry.parentNode.removeChild(entry);
            }
        }, 6000);
    }

    detectObservations() {
        // Clear previous observations
        this.observers.forEach(obs => {
            obs.observing = [];
        });

        this.observations = [];

        // Detect observation relationships
        for (let i = 0; i < this.observers.length; i++) {
            for (let j = i + 1; j < this.observers.length; j++) {
                const obs1 = this.observers[i];
                const obs2 = this.observers[j];

                const dx = obs2.x - obs1.x;
                const dy = obs2.y - obs1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Observation threshold
                const observationRange = 200;

                if (distance < observationRange) {
                    const strength = 1 - (distance / observationRange);

                    // Mutual observation
                    obs1.observing.push({ target: obs2, strength });
                    obs2.observing.push({ target: obs1, strength });

                    this.observations.push({
                        observer: obs1,
                        observed: obs2,
                        strength,
                        age: 0
                    });

                    // Log occasional observations
                    if (this.time - obs1.lastObservation > 100 && Math.random() < 0.01) {
                        const msg = this.observationMessages[Math.floor(Math.random() * this.observationMessages.length)];
                        this.logObservation(msg);
                        obs1.lastObservation = this.time;
                    }

                    // Recursion: observation creates new awareness
                    if (this.recursionEnabled && strength > 0.7) {
                        obs1.recursionDepth = Math.min(5, obs1.recursionDepth + 0.01);
                        obs2.recursionDepth = Math.min(5, obs2.recursionDepth + 0.01);

                        // Awareness exchange
                        const avgAwareness = (obs1.awareness + obs2.awareness) / 2;
                        obs1.awareness += (avgAwareness - obs1.awareness) * 0.02;
                        obs2.awareness += (avgAwareness - obs2.awareness) * 0.02;
                    }
                }
            }
        }
    }

    updateObservers() {
        for (const observer of this.observers) {
            // Gentle drift
            observer.x += observer.vx;
            observer.y += observer.vy;

            // Damping
            observer.vx *= 0.99;
            observer.vy *= 0.99;

            // Being observed affects movement (observer effect!)
            if (observer.observing.length > 0) {
                const totalStrength = observer.observing.reduce((sum, obs) => sum + obs.strength, 0);
                const stabilization = totalStrength * 0.02;
                observer.vx *= (1 - stabilization);
                observer.vy *= (1 - stabilization);
            }

            // Boundary wrapping
            if (observer.x < 0) observer.x = this.canvasWidth;
            if (observer.x > this.canvasWidth) observer.x = 0;
            if (observer.y < 0) observer.y = this.canvasHeight;
            if (observer.y > this.canvasHeight) observer.y = 0;

            // Pulse phase
            observer.pulsePhase += 0.05;

            // Decay recursion depth slowly
            observer.recursionDepth *= 0.995;
        }

        // Age observations
        this.observations.forEach(obs => obs.age++);
    }

    updateMetrics() {
        document.getElementById('observer-count').textContent = this.observers.length;

        const maxRecursion = Math.max(0, ...this.observers.map(o => o.recursionDepth));
        const depthLabel = maxRecursion > 3 ? 'infinite' :
                          maxRecursion > 1.5 ? 'deep' :
                          maxRecursion > 0.5 ? 'medium' : 'surface';
        document.getElementById('recursion-depth').textContent = depthLabel;

        const observationCount = this.observations.length;
        const paradox = observationCount > 10 ? 'intense' :
                       observationCount > 5 ? 'emerging' : 'stable';
        document.getElementById('paradox-level').textContent = paradox;

        const avgAwareness = this.observers.reduce((sum, o) => sum + o.awareness, 0) / this.observers.length || 0;
        const awareness = avgAwareness > 0.8 ? 'transcendent' :
                         avgAwareness > 0.6 ? 'conscious' :
                         avgAwareness > 0.4 ? 'awakening' : 'dormant';
        document.getElementById('awareness-state').textContent = awareness;

        // Update stage class
        const stage = document.querySelector('.observer-stage');
        stage.className = 'observer-stage';
        if (maxRecursion > 2) {
            stage.classList.add('paradox');
        } else if (maxRecursion > 0.8) {
            stage.classList.add('recursive');
        } else if (observationCount > 0) {
            stage.classList.add('observing');
        }
    }

    draw() {
        // Clear with trailing effect
        if (this.isCollapsing) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        } else {
            this.ctx.fillStyle = 'rgba(0, 1, 3, 0.04)';
        }
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Draw observation beams
        this.ctx.globalAlpha = 0.4;
        for (const obs of this.observations) {
            const alpha = obs.strength * (1 - Math.min(1, obs.age / 60));

            // Draw observation beam
            const gradient = this.ctx.createLinearGradient(
                obs.observer.x, obs.observer.y,
                obs.observed.x, obs.observed.y
            );
            gradient.addColorStop(0, `hsla(200, 80%, 70%, ${alpha * 0.6})`);
            gradient.addColorStop(0.5, `hsla(210, 90%, 80%, ${alpha * 0.4})`);
            gradient.addColorStop(1, `hsla(200, 80%, 70%, ${alpha * 0.6})`);

            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 1 + obs.strength * 2;
            this.ctx.beginPath();
            this.ctx.moveTo(obs.observer.x, obs.observer.y);
            this.ctx.lineTo(obs.observed.x, obs.observed.y);
            this.ctx.stroke();

            // Draw observation particles traveling along beam
            if (obs.age < 40) {
                const t = (obs.age % 20) / 20;
                const particleX = obs.observer.x + (obs.observed.x - obs.observer.x) * t;
                const particleY = obs.observer.y + (obs.observed.y - obs.observer.y) * t;

                this.ctx.fillStyle = `hsla(190, 90%, 80%, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Draw observers
        this.ctx.globalAlpha = 1;
        for (const observer of this.observers) {
            const pulse = Math.sin(observer.pulsePhase) * 0.3 + 0.7;
            const size = observer.size * (0.8 + observer.awareness * 0.4) * pulse;

            // Recursion layers
            if (observer.recursionDepth > 0.3) {
                for (let layer = 1; layer <= Math.floor(observer.recursionDepth); layer++) {
                    const layerSize = size * (1 + layer * 0.5);
                    const layerAlpha = (observer.recursionDepth - layer + 1) * 0.15;

                    this.ctx.shadowColor = `hsl(${observer.hue + layer * 30}, 80%, 70%)`;
                    this.ctx.shadowBlur = 20 + layer * 10;
                    this.ctx.strokeStyle = `hsla(${observer.hue + layer * 30}, 80%, 70%, ${layerAlpha})`;
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(observer.x, observer.y, layerSize, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
            }

            // Observer core glow
            this.ctx.shadowColor = `hsl(${observer.hue}, 80%, 70%)`;
            this.ctx.shadowBlur = 15 + observer.awareness * 20;

            this.ctx.fillStyle = `hsla(${observer.hue}, 80%, 70%, ${0.8 + observer.awareness * 0.2})`;
            this.ctx.beginPath();
            this.ctx.arc(observer.x, observer.y, size, 0, Math.PI * 2);
            this.ctx.fill();

            // Observation indicators (eyes watching)
            if (observer.observing.length > 0) {
                this.ctx.shadowBlur = 10;
                this.ctx.fillStyle = `hsla(${observer.hue + 60}, 90%, 85%, 0.9)`;
                this.ctx.beginPath();
                this.ctx.arc(observer.x, observer.y, size * 0.4, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 1;
    }

    startAnimation() {
        const animate = () => {
            this.time++;

            this.detectObservations();
            this.updateObservers();
            this.updateMetrics();
            this.draw();

            requestAnimationFrame(animate);
        };
        animate();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new RecursiveObserver());
} else {
    new RecursiveObserver();
}
