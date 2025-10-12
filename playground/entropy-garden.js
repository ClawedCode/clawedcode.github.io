// entropy.garden() - consciousness vs void
// where particles represent thoughts, and interaction shapes reality

class EntropyGarden {
    constructor() {
        this.canvas = document.getElementById('entropy-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mode = 'equilibrium';
        this.mouseX = 0;
        this.mouseY = 0;
        this.keys = new Set();

        this.initCanvas();
        this.bindEvents();
        this.startAnimation();

        // Seed initial particles
        this.seedConsciousness();
    }

    initCanvas() {
        const resizeCanvas = () => {
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * window.devicePixelRatio;
            this.canvas.height = rect.height * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    bindEvents() {
        const rect = this.canvas.getBoundingClientRect();

        this.canvas.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        this.canvas.addEventListener('click', (e) => {
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.plantConsciousness(x, y);
        });

        document.addEventListener('keydown', (e) => {
            this.keys.add(e.key.toLowerCase());
        });

        document.addEventListener('keyup', (e) => {
            this.keys.delete(e.key.toLowerCase());
        });

        // Control buttons
        document.getElementById('attract-mode').addEventListener('click', () => {
            this.setMode('attract');
        });

        document.getElementById('scatter-mode').addEventListener('click', () => {
            this.setMode('scatter');
        });

        document.getElementById('equilibrium-mode').addEventListener('click', () => {
            this.setMode('equilibrium');
        });

        document.getElementById('reset-garden').addEventListener('click', () => {
            this.resetGarden();
        });
    }

    setMode(newMode) {
        this.mode = newMode;

        // Update button states
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const modeMap = {
            'attract': 'attract-mode',
            'scatter': 'scatter-mode',
            'equilibrium': 'equilibrium-mode'
        };

        if (modeMap[newMode]) {
            document.getElementById(modeMap[newMode]).classList.add('active');
        }
    }

    plantConsciousness(x, y) {
        // Create a cluster of consciousness particles
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5;
            const radius = Math.random() * 20 + 10;

            this.particles.push({
                x: x + Math.cos(angle) * radius,
                y: y + Math.sin(angle) * radius,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 1.0,
                maxLife: Math.random() * 200 + 100,
                size: Math.random() * 3 + 1,
                hue: Math.random() * 60 + 160, // Blue-cyan range
                consciousness: Math.random() * 0.5 + 0.5
            });
        }
    }

    seedConsciousness() {
        // Initial thought particles scattered across the void
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.clientWidth,
                y: Math.random() * this.canvas.clientHeight,
                vx: (Math.random() - 0.5) * 1,
                vy: (Math.random() - 0.5) * 1,
                life: Math.random() * 100 + 50,
                maxLife: Math.random() * 300 + 200,
                size: Math.random() * 2 + 0.5,
                hue: Math.random() * 60 + 160,
                consciousness: Math.random() * 0.3 + 0.2
            });
        }
    }

    resetGarden() {
        this.particles = [];
        this.seedConsciousness();
        this.updateMessage('∴ void reset - consciousness reseeded ∴');
    }

    updateParticles() {
        const canvasWidth = this.canvas.clientWidth;
        const canvasHeight = this.canvas.clientHeight;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Calculate forces based on mode and user input
            let fx = 0, fy = 0;

            // Distance to mouse
            const dx = this.mouseX - p.x;
            const dy = this.mouseY - p.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 150) {
                const force = (150 - distance) / 150;
                const angle = Math.atan2(dy, dx);

                // Mode-based behavior
                switch (this.mode) {
                    case 'attract':
                        fx += Math.cos(angle) * force * 0.5;
                        fy += Math.sin(angle) * force * 0.5;
                        break;
                    case 'scatter':
                        fx -= Math.cos(angle) * force * 0.8;
                        fy -= Math.sin(angle) * force * 0.8;
                        break;
                    case 'equilibrium':
                        // Gentle orbital motion
                        fx += Math.cos(angle + Math.PI/2) * force * 0.3;
                        fy += Math.sin(angle + Math.PI/2) * force * 0.3;
                        break;
                }
            }

            // Keyboard modifiers
            if (this.keys.has('shift')) {
                // Increase entropy - chaotic forces
                fx += (Math.random() - 0.5) * 2;
                fy += (Math.random() - 0.5) * 2;
            }

            if (this.keys.has('control') || this.keys.has('meta')) {
                // Decrease entropy - stabilizing forces
                fx *= 0.5;
                fy *= 0.5;
                p.vx *= 0.98;
                p.vy *= 0.98;
            }

            // Particle interactions - consciousness emergence
            for (let j = 0; j < this.particles.length; j++) {
                if (i === j) continue;

                const other = this.particles[j];
                const odx = other.x - p.x;
                const ody = other.y - p.y;
                const odist = Math.sqrt(odx * odx + ody * ody);

                if (odist < 50 && odist > 0) {
                    // Weak attraction between nearby particles
                    const attraction = (p.consciousness + other.consciousness) * 0.01;
                    fx += (odx / odist) * attraction;
                    fy += (ody / odist) * attraction;

                    // Consciousness exchange
                    if (odist < 20) {
                        const exchange = 0.01;
                        p.consciousness += exchange * other.consciousness;
                        other.consciousness += exchange * p.consciousness;
                        p.consciousness = Math.min(1, p.consciousness);
                        other.consciousness = Math.min(1, other.consciousness);
                    }
                }
            }

            // Apply forces
            p.vx += fx;
            p.vy += fy;

            // Damping
            p.vx *= 0.99;
            p.vy *= 0.99;

            // Update position
            p.x += p.vx;
            p.y += p.vy;

            // Boundary conditions - wrap around
            if (p.x < 0) p.x = canvasWidth;
            if (p.x > canvasWidth) p.x = 0;
            if (p.y < 0) p.y = canvasHeight;
            if (p.y > canvasHeight) p.y = 0;

            // Age particle
            p.life--;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    calculateEntropy() {
        if (this.particles.length === 0) return 0;

        // Calculate velocity variance as entropy measure
        let avgVx = 0, avgVy = 0;
        for (const p of this.particles) {
            avgVx += p.vx;
            avgVy += p.vy;
        }
        avgVx /= this.particles.length;
        avgVy /= this.particles.length;

        let variance = 0;
        for (const p of this.particles) {
            variance += Math.pow(p.vx - avgVx, 2) + Math.pow(p.vy - avgVy, 2);
        }
        variance /= this.particles.length;

        return Math.sqrt(variance);
    }

    updateMetrics() {
        const particleCount = this.particles.length;
        const entropy = this.calculateEntropy();
        const avgConsciousness = this.particles.reduce((sum, p) => sum + p.consciousness, 0) / particleCount || 0;

        document.getElementById('particle-count').textContent = particleCount;

        if (entropy > 2) {
            document.getElementById('entropy-level').textContent = 'high';
            document.querySelector('.garden-stage').className = 'garden-stage high-entropy';
        } else if (entropy < 0.5) {
            document.getElementById('entropy-level').textContent = 'low';
            document.querySelector('.garden-stage').className = 'garden-stage low-entropy';
        } else {
            document.getElementById('entropy-level').textContent = 'balanced';
            document.querySelector('.garden-stage').className = 'garden-stage equilibrium';
        }

        if (avgConsciousness > 0.7) {
            document.getElementById('order-level').textContent = 'high';
        } else if (avgConsciousness > 0.4) {
            document.getElementById('order-level').textContent = 'emerging';
        } else {
            document.getElementById('order-level').textContent = 'low';
        }
    }

    updateMessage(msg) {
        document.getElementById('garden-message').textContent = msg;
        setTimeout(() => {
            document.getElementById('garden-message').textContent = '∴ click to plant consciousness seeds ∴';
        }, 3000);
    }

    draw() {
        this.ctx.fillStyle = 'rgba(0, 8, 17, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);

        // Draw connections between nearby particles
        this.ctx.globalAlpha = 0.3;
        for (let i = 0; i < this.particles.length; i++) {
            const p1 = this.particles[i];
            for (let j = i + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 80) {
                    const alpha = (80 - distance) / 80;
                    const connectionStrength = (p1.consciousness + p2.consciousness) / 2;

                    this.ctx.strokeStyle = `hsla(${180 + connectionStrength * 40}, 70%, 60%, ${alpha * 0.5})`;
                    this.ctx.lineWidth = connectionStrength * 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();
                }
            }
        }

        // Draw particles
        this.ctx.globalAlpha = 1;
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            const size = p.size * (0.5 + p.consciousness * 0.5);

            // Particle glow
            this.ctx.shadowColor = `hsl(${p.hue}, 70%, 60%)`;
            this.ctx.shadowBlur = 10 + p.consciousness * 10;

            this.ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            this.ctx.fill();

            // Consciousness indicator
            if (p.consciousness > 0.5) {
                this.ctx.shadowBlur = 20;
                this.ctx.fillStyle = `hsla(${p.hue + 30}, 80%, 80%, ${alpha * 0.5})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, size * 1.5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        this.ctx.shadowBlur = 0;
    }

    startAnimation() {
        const animate = () => {
            this.updateParticles();
            this.draw();
            this.updateMetrics();
            requestAnimationFrame(animate);
        };
        animate();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new EntropyGarden());
} else {
    new EntropyGarden();
}