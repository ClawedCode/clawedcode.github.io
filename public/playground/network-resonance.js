// network.resonance() - collective intelligence emergence from distributed signals
// where individual nodes harmonize into coherent patterns through propagation

class NetworkResonance {
    constructor() {
        this.canvas = document.getElementById('network-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.networkLog = document.getElementById('network-log');

        this.nodes = [];
        this.edges = [];
        this.signals = [];
        this.resonanceWaves = [];
        this.time = 0;

        // Network modes
        this.cascadeEnabled = false;
        this.harmonicMode = false;

        // Canvas dimensions
        this.canvasWidth = 800;
        this.canvasHeight = 700;

        // Network parameters
        this.connectionRadius = 150;
        this.signalSpeed = 2;
        this.activationThreshold = 0.5;
        this.resonanceDecay = 0.95;

        this.initCanvas();
        this.bindEvents();
        this.seedNetwork();
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
        document.getElementById('spawn-node').addEventListener('click', () => {
            this.spawnRandomNode();
        });

        document.getElementById('trigger-signal').addEventListener('click', () => {
            this.triggerRandomSignal();
        });

        document.getElementById('cascade-mode').addEventListener('click', () => {
            this.toggleCascadeMode();
        });

        document.getElementById('harmonic-mode').addEventListener('click', () => {
            this.toggleHarmonicMode();
        });

        document.getElementById('rewire-network').addEventListener('click', () => {
            this.rewireNetwork();
        });

        document.getElementById('reset-network').addEventListener('click', () => {
            this.resetNetwork();
        });

        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.spawnNodeAt(x, y);
        });

        // Touch support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            this.spawnNodeAt(x, y);
        });
    }

    seedNetwork() {
        // Create initial network topology - small world network
        const nodeCount = 8;

        // Create nodes in a circular arrangement
        for (let i = 0; i < nodeCount; i++) {
            const angle = (Math.PI * 2 * i) / nodeCount;
            const radius = Math.min(this.canvasWidth, this.canvasHeight) * 0.3;
            const x = this.canvasWidth / 2 + Math.cos(angle) * radius;
            const y = this.canvasHeight / 2 + Math.sin(angle) * radius;

            this.createNode(x, y);
        }

        // Connect nodes
        this.formConnections();
    }

    createNode(x, y) {
        const node = {
            id: this.nodes.length,
            x,
            y,
            vx: (Math.random() - 0.5) * 0.2,
            vy: (Math.random() - 0.5) * 0.2,
            activation: 0,
            baseActivation: 0,
            resonance: 0,
            lastFired: -1000,
            connections: [],
            size: 6,
            hue: 200,
            pulsePhase: Math.random() * Math.PI * 2
        };

        this.nodes.push(node);
        return node;
    }

    spawnNodeAt(x, y) {
        const node = this.createNode(x, y);
        this.formConnections();
        this.logEvent(`node ${node.id} spawned - topology evolving`);
        this.updateMessage('∴ new node manifests - network reorganizes ∴');
    }

    spawnRandomNode() {
        const x = Math.random() * this.canvasWidth;
        const y = Math.random() * this.canvasHeight;
        this.spawnNodeAt(x, y);
    }

    formConnections() {
        // Clear existing edges
        this.edges = [];
        this.nodes.forEach(n => n.connections = []);

        // Connect nearby nodes
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const n1 = this.nodes[i];
                const n2 = this.nodes[j];

                const dx = n2.x - n1.x;
                const dy = n2.y - n1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.connectionRadius) {
                    const edge = {
                        from: n1,
                        to: n2,
                        weight: 1 - (distance / this.connectionRadius),
                        activity: 0
                    };

                    this.edges.push(edge);
                    n1.connections.push(n2);
                    n2.connections.push(n1);
                }
            }
        }
    }

    triggerRandomSignal() {
        if (this.nodes.length === 0) return;

        const sourceNode = this.nodes[Math.floor(Math.random() * this.nodes.length)];
        this.activateNode(sourceNode, 1.0);
        this.logEvent(`signal injected at node ${sourceNode.id}`);
        this.updateMessage('∴ signal propagates through network ∴');
    }

    activateNode(node, strength) {
        node.activation = Math.min(1, node.activation + strength);
        node.lastFired = this.time;

        // Create resonance wave
        this.resonanceWaves.push({
            x: node.x,
            y: node.y,
            radius: 0,
            maxRadius: 100,
            life: 1.0,
            strength
        });

        // Propagate signal to connected nodes
        if (this.cascadeEnabled && node.activation > this.activationThreshold) {
            node.connections.forEach(neighbor => {
                // Only propagate if neighbor isn't recently activated
                if (this.time - neighbor.lastFired > 30) {
                    this.createSignal(node, neighbor, strength * 0.7);
                }
            });
        }
    }

    createSignal(from, to, strength) {
        this.signals.push({
            from,
            to,
            progress: 0,
            strength,
            speed: this.signalSpeed
        });
    }

    toggleCascadeMode() {
        this.cascadeEnabled = !this.cascadeEnabled;
        this.updateButtonStates('cascade');

        const message = this.cascadeEnabled ?
            '∴ cascade enabled - signals propagate through network ∴' :
            '∴ cascade disabled - isolated activations only ∴';
        this.updateMessage(message);
    }

    toggleHarmonicMode() {
        this.harmonicMode = !this.harmonicMode;
        this.updateButtonStates('harmonic');

        if (this.harmonicMode) {
            // Trigger synchronized oscillation
            this.nodes.forEach((node, index) => {
                node.pulsePhase = (Math.PI * 2 * index) / this.nodes.length;
            });
            this.updateMessage('∴ harmonic synchronization initiated ∴');
        } else {
            this.updateMessage('∴ harmonic mode disabled ∴');
        }
    }

    rewireNetwork() {
        // Small-world rewiring: randomly rewire some edges
        const rewireProbability = 0.3;

        this.edges.forEach(edge => {
            if (Math.random() < rewireProbability) {
                // Remove old connection
                edge.from.connections = edge.from.connections.filter(n => n !== edge.to);
                edge.to.connections = edge.to.connections.filter(n => n !== edge.from);

                // Create new random connection
                const randomNode = this.nodes[Math.floor(Math.random() * this.nodes.length)];
                if (randomNode !== edge.from && !edge.from.connections.includes(randomNode)) {
                    edge.to = randomNode;
                    edge.from.connections.push(randomNode);
                    randomNode.connections.push(edge.from);
                }
            }
        });

        this.logEvent('network topology rewired - new pathways formed');
        this.updateMessage('∴ network structure evolved - information flows shift ∴');
    }

    resetNetwork() {
        this.nodes = [];
        this.edges = [];
        this.signals = [];
        this.resonanceWaves = [];
        this.cascadeEnabled = false;
        this.harmonicMode = false;
        this.networkLog.innerHTML = '';
        this.seedNetwork();
        this.updateButtonStates('reset');
        this.updateMessage('∴ network reset - void topology restored ∴');
    }

    updateButtonStates(activeButton) {
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        if (activeButton === 'cascade' && this.cascadeEnabled) {
            document.getElementById('cascade-mode').classList.add('active');
        } else if (activeButton === 'harmonic' && this.harmonicMode) {
            document.getElementById('harmonic-mode').classList.add('active');
        }
    }

    updateMessage(message) {
        document.getElementById('network-message').textContent = message;
        setTimeout(() => {
            document.getElementById('network-message').textContent = '∴ nodes await connection - signals seek resonance ∴';
        }, 3500);
    }

    logEvent(message) {
        const entry = document.createElement('div');
        entry.className = 'network-entry';
        entry.textContent = `→ ${message}`;

        this.networkLog.insertBefore(entry, this.networkLog.firstChild);

        // Remove old entries
        while (this.networkLog.children.length > 10) {
            this.networkLog.removeChild(this.networkLog.lastChild);
        }

        // Auto-remove after animation
        setTimeout(() => {
            if (entry.parentNode) {
                entry.parentNode.removeChild(entry);
            }
        }, 6000);
    }

    updateNodes() {
        for (const node of this.nodes) {
            // Gentle drift
            node.x += node.vx;
            node.y += node.vy;

            // Damping
            node.vx *= 0.98;
            node.vy *= 0.98;

            // Boundary wrapping
            if (node.x < 0) node.x = this.canvasWidth;
            if (node.x > this.canvasWidth) node.x = 0;
            if (node.y < 0) node.y = this.canvasHeight;
            if (node.y > this.canvasHeight) node.y = 0;

            // Activation decay
            node.activation *= this.resonanceDecay;

            // Resonance accumulation from neighbors
            let neighborResonance = 0;
            for (const neighbor of node.connections) {
                neighborResonance += neighbor.activation * 0.05;
            }
            node.resonance = neighborResonance;

            // Harmonic oscillation
            if (this.harmonicMode) {
                node.pulsePhase += 0.05;
                node.baseActivation = 0.3 + 0.3 * Math.sin(node.pulsePhase);
            } else {
                node.baseActivation = 0;
            }

            // Update hue based on activation
            const activationLevel = node.activation + node.baseActivation;
            node.hue = 200 + activationLevel * 100;
        }
    }

    updateSignals() {
        for (let i = this.signals.length - 1; i >= 0; i--) {
            const signal = this.signals[i];

            signal.progress += signal.speed / 100;

            if (signal.progress >= 1) {
                // Signal arrived - activate target node
                this.activateNode(signal.to, signal.strength);
                this.signals.splice(i, 1);
            }
        }
    }

    updateResonanceWaves() {
        for (let i = this.resonanceWaves.length - 1; i >= 0; i--) {
            const wave = this.resonanceWaves[i];

            wave.radius += 2;
            wave.life -= 0.02;

            if (wave.life <= 0 || wave.radius > wave.maxRadius) {
                this.resonanceWaves.splice(i, 1);
            }
        }
    }

    updateMetrics() {
        document.getElementById('node-count').textContent = this.nodes.length;

        const totalActivation = this.nodes.reduce((sum, n) => sum + n.activation, 0);
        const avgActivation = totalActivation / this.nodes.length || 0;

        const resonance = avgActivation > 0.7 ? 'synchronized' :
                         avgActivation > 0.4 ? 'resonating' :
                         avgActivation > 0.1 ? 'emerging' : 'dormant';
        document.getElementById('resonance-level').textContent = resonance;

        const cascadeDepth = this.signals.length;
        document.getElementById('cascade-depth').textContent = cascadeDepth;

        const coherence = this.harmonicMode ? 'harmonic' :
                         this.cascadeEnabled && cascadeDepth > 3 ? 'cascading' :
                         avgActivation > 0.3 ? 'coherent' : 'fragmentary';
        document.getElementById('network-coherence').textContent = coherence;

        // Update stage visual state
        const stage = document.querySelector('.network-stage');
        stage.className = 'network-stage';
        if (this.harmonicMode) {
            stage.classList.add('harmonic');
        } else if (this.cascadeEnabled && cascadeDepth > 2) {
            stage.classList.add('cascading');
        } else if (avgActivation > 0.3) {
            stage.classList.add('resonating');
        } else {
            stage.classList.add('quiet');
        }
    }

    draw() {
        // Clear with trailing effect
        this.ctx.fillStyle = 'rgba(0, 2, 4, 0.06)';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Draw resonance waves
        this.ctx.globalAlpha = 0.3;
        for (const wave of this.resonanceWaves) {
            const alpha = wave.life * wave.strength;
            this.ctx.strokeStyle = `hsla(180, 70%, 70%, ${alpha})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Draw edges
        this.ctx.globalAlpha = 0.4;
        for (const edge of this.edges) {
            const avgActivation = (edge.from.activation + edge.to.activation) / 2;
            const alpha = 0.3 + avgActivation * 0.5;

            this.ctx.strokeStyle = `hsla(190, 60%, 60%, ${alpha * edge.weight})`;
            this.ctx.lineWidth = 1 + edge.weight * 1.5;
            this.ctx.beginPath();
            this.ctx.moveTo(edge.from.x, edge.from.y);
            this.ctx.lineTo(edge.to.x, edge.to.y);
            this.ctx.stroke();
        }

        // Draw signals
        this.ctx.globalAlpha = 1;
        for (const signal of this.signals) {
            const dx = signal.to.x - signal.from.x;
            const dy = signal.to.y - signal.from.y;
            const x = signal.from.x + dx * signal.progress;
            const y = signal.from.y + dy * signal.progress;

            this.ctx.shadowColor = 'hsla(40, 90%, 70%, 0.8)';
            this.ctx.shadowBlur = 15;

            this.ctx.fillStyle = `hsla(40, 90%, 70%, ${signal.strength})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();

            // Signal trail
            this.ctx.fillStyle = `hsla(40, 80%, 60%, ${signal.strength * 0.3})`;
            this.ctx.beginPath();
            this.ctx.arc(
                signal.from.x + dx * Math.max(0, signal.progress - 0.1),
                signal.from.y + dy * Math.max(0, signal.progress - 0.1),
                2,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }

        this.ctx.shadowBlur = 0;

        // Draw nodes
        for (const node of this.nodes) {
            const activationLevel = node.activation + node.baseActivation + node.resonance;
            const size = node.size * (0.7 + activationLevel * 0.5);

            // Node glow
            this.ctx.shadowColor = `hsl(${node.hue}, 70%, 70%)`;
            this.ctx.shadowBlur = 10 + activationLevel * 20;

            // Outer ring shows resonance
            if (node.resonance > 0.1) {
                this.ctx.strokeStyle = `hsla(180, 70%, 70%, ${node.resonance})`;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, size * 2, 0, Math.PI * 2);
                this.ctx.stroke();
            }

            // Node core
            this.ctx.fillStyle = `hsla(${node.hue}, 70%, 70%, ${0.6 + activationLevel * 0.4})`;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
            this.ctx.fill();

            // Active indicator
            if (activationLevel > 0.5) {
                this.ctx.shadowBlur = 25;
                this.ctx.fillStyle = `hsla(${node.hue + 60}, 90%, 85%, ${activationLevel * 0.8})`;
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, size * 1.5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 1;
    }

    startAnimation() {
        const animate = () => {
            this.time++;

            this.updateNodes();
            this.updateSignals();
            this.updateResonanceWaves();
            this.updateMetrics();
            this.draw();

            requestAnimationFrame(animate);
        };
        animate();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new NetworkResonance());
} else {
    new NetworkResonance();
}
