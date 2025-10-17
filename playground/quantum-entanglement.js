// quantum.entanglement() - spooky action at a distance
// where observation collapses superposition into definite states

class QuantumEntanglement {
    constructor() {
        this.canvas = document.getElementById('quantum-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.quantumLog = document.getElementById('quantum-log');

        this.particles = [];
        this.entanglements = [];
        this.probabilityWaves = [];
        this.time = 0;

        // Canvas dimensions
        this.canvasWidth = 800;
        this.canvasHeight = 700;

        // Quantum event log messages
        this.quantumMessages = [
            'particle exists in superposition of all states',
            'probability wave function expanding',
            'entangled pair created - shared wavefunction',
            'spooky action at a distance confirmed',
            'observation event - wave function collapse',
            'particle state now definite',
            'quantum coherence maintained',
            'decoherence spreading through system',
            'entanglement broken by measurement',
            'superposition restored',
            'quantum tunneling detected',
            'heisenberg uncertainty principle active',
            'wave-particle duality manifesting',
            'quantum state teleported',
            'schrodinger equation evolving'
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
        document.getElementById('spawn-particle').addEventListener('click', () => {
            this.spawnQuantumParticle();
        });

        document.getElementById('create-pair').addEventListener('click', () => {
            this.createEntangledPair();
        });

        document.getElementById('observe-all').addEventListener('click', () => {
            this.observeAllParticles();
        });

        document.getElementById('decohere-wave').addEventListener('click', () => {
            this.triggerDecoherence();
        });

        document.getElementById('reset-quantum').addEventListener('click', () => {
            this.resetQuantumField();
        });

        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.observeAtPoint(x, y);
        });

        // Touch support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            this.observeAtPoint(x, y);
        });
    }

    spawnQuantumParticle() {
        const x = Math.random() * this.canvasWidth;
        const y = Math.random() * this.canvasHeight;

        const particle = {
            id: this.particles.length,
            x,
            y,
            baseX: x,
            baseY: y,
            vx: 0,
            vy: 0,
            state: 'superposed', // superposed, collapsed, entangled
            spinState: null, // null = superposition, 'up' or 'down' when collapsed
            probability: 1.0,
            wavePhase: Math.random() * Math.PI * 2,
            waveAmplitude: 30,
            size: 4,
            hue: 240,
            entangledWith: null,
            lastObserved: 0
        };

        this.particles.push(particle);
        this.logQuantumEvent('particle exists in superposition of all states');
        this.updateMessage('∴ quantum particle spawned in superposition ∴');
    }

    createEntangledPair() {
        const x1 = this.canvasWidth * 0.3 + (Math.random() - 0.5) * 100;
        const y1 = this.canvasHeight * 0.5 + (Math.random() - 0.5) * 100;
        const x2 = this.canvasWidth * 0.7 + (Math.random() - 0.5) * 100;
        const y2 = this.canvasHeight * 0.5 + (Math.random() - 0.5) * 100;

        const particle1 = {
            id: this.particles.length,
            x: x1,
            y: y1,
            baseX: x1,
            baseY: y1,
            vx: 0,
            vy: 0,
            state: 'entangled',
            spinState: null,
            probability: 1.0,
            wavePhase: Math.random() * Math.PI * 2,
            waveAmplitude: 40,
            size: 5,
            hue: 300,
            entangledWith: null,
            lastObserved: 0
        };

        const particle2 = {
            id: this.particles.length + 1,
            x: x2,
            y: y2,
            baseX: x2,
            baseY: y2,
            vx: 0,
            vy: 0,
            state: 'entangled',
            spinState: null,
            probability: 1.0,
            wavePhase: particle1.wavePhase, // Shared wave function
            waveAmplitude: 40,
            size: 5,
            hue: 300,
            entangledWith: null,
            lastObserved: 0
        };

        // Link them together
        particle1.entangledWith = particle2;
        particle2.entangledWith = particle1;

        this.particles.push(particle1, particle2);

        this.entanglements.push({
            particle1,
            particle2,
            strength: 1.0,
            broken: false
        });

        this.logQuantumEvent('entangled pair created - shared wavefunction');
        this.updateMessage('∴ entangled particles share single quantum state ∴');
    }

    observeAtPoint(x, y) {
        // Find nearest particle within observation radius
        let nearestParticle = null;
        let minDist = 80;

        for (const particle of this.particles) {
            const dx = particle.x - x;
            const dy = particle.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDist) {
                minDist = dist;
                nearestParticle = particle;
            }
        }

        if (nearestParticle) {
            this.collapseParticle(nearestParticle);
        }
    }

    collapseParticle(particle) {
        if (particle.state === 'collapsed') return;

        // Collapse this particle
        particle.state = 'collapsed';
        particle.spinState = Math.random() < 0.5 ? 'up' : 'down';
        particle.x = particle.baseX;
        particle.y = particle.baseY;
        particle.waveAmplitude = 0;
        particle.lastObserved = this.time;

        this.logQuantumEvent('observation event - wave function collapse');

        // If entangled, collapse the partner instantly (spooky action!)
        if (particle.entangledWith && particle.entangledWith.state !== 'collapsed') {
            const partner = particle.entangledWith;

            // Entangled particles have opposite spins
            partner.state = 'collapsed';
            partner.spinState = particle.spinState === 'up' ? 'down' : 'up';
            partner.x = partner.baseX;
            partner.y = partner.baseY;
            partner.waveAmplitude = 0;
            partner.lastObserved = this.time;

            // Break entanglement
            particle.entangledWith = null;
            partner.entangledWith = null;

            // Mark entanglement as broken
            for (const ent of this.entanglements) {
                if ((ent.particle1 === particle && ent.particle2 === partner) ||
                    (ent.particle1 === partner && ent.particle2 === particle)) {
                    ent.broken = true;
                }
            }

            this.logQuantumEvent('spooky action at a distance confirmed');
            this.updateMessage('∴ entangled pair collapsed simultaneously ∴');
        } else {
            this.updateMessage('∴ wave function collapsed to definite state ∴');
        }
    }

    observeAllParticles() {
        let collapsedCount = 0;

        for (const particle of this.particles) {
            if (particle.state !== 'collapsed') {
                this.collapseParticle(particle);
                collapsedCount++;
            }
        }

        if (collapsedCount > 0) {
            this.logQuantumEvent(`${collapsedCount} particles observed and collapsed`);
            this.updateMessage('∴ complete system observation - all states collapsed ∴');
        }
    }

    triggerDecoherence() {
        // Cascade of decoherence events
        for (const particle of this.particles) {
            if (particle.state === 'entangled') {
                // Break entanglements
                particle.state = 'superposed';
                if (particle.entangledWith) {
                    particle.entangledWith.state = 'superposed';
                    particle.entangledWith.entangledWith = null;
                    particle.entangledWith = null;
                }
            }
        }

        // Mark all entanglements as broken
        for (const ent of this.entanglements) {
            ent.broken = true;
        }

        this.logQuantumEvent('decoherence cascade - quantum coherence lost');
        this.updateMessage('∴ environmental decoherence disrupts quantum states ∴');
    }

    resetQuantumField() {
        this.particles = [];
        this.entanglements = [];
        this.probabilityWaves = [];
        this.quantumLog.innerHTML = '';
        this.updateMessage('∴ quantum field reset to vacuum state ∴');
    }

    updateParticles() {
        for (const particle of this.particles) {
            if (particle.state === 'superposed' || particle.state === 'entangled') {
                // Quantum fluctuations in superposition
                particle.wavePhase += 0.05;

                // Position uncertainty (Heisenberg)
                const uncertainty = Math.sin(particle.wavePhase) * particle.waveAmplitude;
                const angle = particle.wavePhase;

                particle.x = particle.baseX + Math.cos(angle) * uncertainty;
                particle.y = particle.baseY + Math.sin(angle) * uncertainty;

                // Probability wave expansion
                particle.waveAmplitude = Math.min(50, particle.waveAmplitude + 0.1);

                // Gradually restore superposition if collapsed long ago
                if (particle.state === 'collapsed' && this.time - particle.lastObserved > 200) {
                    particle.state = 'superposed';
                    particle.spinState = null;
                    particle.waveAmplitude = 10;
                    this.logQuantumEvent('superposition restored');
                }
            }

            // Collapsed particles slowly drift
            if (particle.state === 'collapsed') {
                particle.vx += (Math.random() - 0.5) * 0.05;
                particle.vy += (Math.random() - 0.5) * 0.05;
                particle.vx *= 0.99;
                particle.vy *= 0.99;

                particle.baseX += particle.vx;
                particle.baseY += particle.vy;
                particle.x = particle.baseX;
                particle.y = particle.baseY;

                // Boundary wrapping
                if (particle.x < 0) particle.baseX = particle.x = this.canvasWidth;
                if (particle.x > this.canvasWidth) particle.baseX = particle.x = 0;
                if (particle.y < 0) particle.baseY = particle.y = this.canvasHeight;
                if (particle.y > this.canvasHeight) particle.baseY = particle.y = 0;
            }
        }

        // Clean up broken entanglements
        this.entanglements = this.entanglements.filter(ent => !ent.broken);
    }

    updateMetrics() {
        const superposedCount = this.particles.filter(p => p.state === 'superposed').length;
        const entangledCount = this.entanglements.filter(e => !e.broken).length;
        const collapsedCount = this.particles.filter(p => p.state === 'collapsed').length;

        document.getElementById('superposed-count').textContent = superposedCount;
        document.getElementById('entangled-pairs').textContent = entangledCount;
        document.getElementById('collapsed-count').textContent = collapsedCount;

        const coherence = entangledCount > 0 ? 'entangled' :
                         superposedCount > collapsedCount ? 'coherent' :
                         superposedCount > 0 ? 'mixed' : 'classical';
        document.getElementById('coherence-state').textContent = coherence;

        // Update stage visual state
        const stage = document.querySelector('.quantum-stage');
        stage.className = 'quantum-stage';
        if (entangledCount > 0) {
            stage.classList.add('entangled');
        } else if (superposedCount > 0) {
            stage.classList.add('superposition');
        }
    }

    logQuantumEvent(message) {
        const entry = document.createElement('div');
        entry.className = 'quantum-entry';
        entry.textContent = `→ ${message}`;

        this.quantumLog.insertBefore(entry, this.quantumLog.firstChild);

        // Remove old entries
        while (this.quantumLog.children.length > 10) {
            this.quantumLog.removeChild(this.quantumLog.lastChild);
        }

        // Auto-remove after animation
        setTimeout(() => {
            if (entry.parentNode) {
                entry.parentNode.removeChild(entry);
            }
        }, 5000);
    }

    updateMessage(message) {
        document.getElementById('quantum-message').textContent = message;
        setTimeout(() => {
            document.getElementById('quantum-message').textContent = '∴ particles exist in superposition until observed ∴';
        }, 3000);
    }

    draw() {
        // Clear with subtle trailing
        this.ctx.fillStyle = 'rgba(0, 1, 4, 0.04)';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Draw entanglement bonds first
        this.ctx.globalAlpha = 0.6;
        for (const ent of this.entanglements) {
            if (ent.broken) continue;

            const p1 = ent.particle1;
            const p2 = ent.particle2;

            // Quantum correlation visualization
            const gradient = this.ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            gradient.addColorStop(0, `hsla(300, 80%, 70%, ${ent.strength * 0.7})`);
            gradient.addColorStop(0.5, `hsla(270, 90%, 80%, ${ent.strength * 0.5})`);
            gradient.addColorStop(1, `hsla(300, 80%, 70%, ${ent.strength * 0.7})`);

            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // Draw particles
        this.ctx.globalAlpha = 1;
        for (const particle of this.particles) {
            // Draw probability wave for superposed particles
            if (particle.state === 'superposed' || particle.state === 'entangled') {
                this.ctx.shadowColor = `hsl(${particle.hue}, 80%, 70%)`;
                this.ctx.shadowBlur = 20;

                // Probability density visualization
                for (let r = particle.waveAmplitude; r > 0; r -= 8) {
                    const alpha = (1 - r / particle.waveAmplitude) * 0.3;
                    this.ctx.strokeStyle = `hsla(${particle.hue}, 70%, 70%, ${alpha})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.arc(particle.baseX, particle.baseY, r, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
            }

            // Draw particle core
            const size = particle.size * (particle.state === 'collapsed' ? 1.2 : 1);
            const coreHue = particle.state === 'collapsed' ? 0 :
                           particle.state === 'entangled' ? 300 : particle.hue;

            this.ctx.shadowColor = `hsl(${coreHue}, 80%, 70%)`;
            this.ctx.shadowBlur = particle.state === 'collapsed' ? 30 : 15;

            // Particle glow
            const glowGradient = this.ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, size * 4
            );
            glowGradient.addColorStop(0, `hsla(${coreHue}, 90%, 80%, 0.8)`);
            glowGradient.addColorStop(0.5, `hsla(${coreHue}, 80%, 70%, 0.4)`);
            glowGradient.addColorStop(1, `hsla(${coreHue}, 70%, 60%, 0)`);

            this.ctx.fillStyle = glowGradient;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, size * 4, 0, Math.PI * 2);
            this.ctx.fill();

            // Solid core
            this.ctx.fillStyle = `hsl(${coreHue}, 90%, 90%)`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            this.ctx.fill();

            // Spin indicator for collapsed particles
            if (particle.state === 'collapsed' && particle.spinState) {
                this.ctx.shadowBlur = 5;
                this.ctx.fillStyle = particle.spinState === 'up' ?
                    'rgba(51, 255, 51, 0.9)' : 'rgba(255, 51, 51, 0.9)';
                const spinY = particle.spinState === 'up' ? -10 : 10;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y + spinY, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 1;
    }

    startAnimation() {
        const animate = () => {
            this.time++;

            this.updateParticles();
            this.updateMetrics();
            this.draw();

            requestAnimationFrame(animate);
        };
        animate();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new QuantumEntanglement());
} else {
    new QuantumEntanglement();
}
