// linguistic.dissolution() - where words dissolve into semantic particles
// exploring how meaning persists beyond linguistic structure

class LetterParticle {
    constructor(x, y, char, wordId, wordText) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.char = char;
        this.wordId = wordId;
        this.wordText = wordText;
        this.connections = [];
        this.hue = 120 + Math.random() * 120; // Green to cyan range
        this.opacity = 1;
        this.size = 14;
    }

    update(particles, coherenceForce, entropyLevel, gravityEnabled) {
        // Apply velocity
        this.x += this.vx;
        this.y += this.vy;

        // Entropy - random jitter
        if (entropyLevel > 0) {
            this.vx += (Math.random() - 0.5) * entropyLevel * 0.3;
            this.vy += (Math.random() - 0.5) * entropyLevel * 0.3;
        }

        // Coherence - attract particles from same word
        if (coherenceForce > 0) {
            particles.forEach(other => {
                if (other !== this && other.wordId === this.wordId) {
                    const dx = other.x - this.x;
                    const dy = other.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > 0 && dist < 200) {
                        const force = (coherenceForce * 0.001) / (dist + 1);
                        this.vx += dx * force;
                        this.vy += dy * force;
                    }
                }
            });
        }

        // Gravity towards center
        if (gravityEnabled) {
            const centerX = window.innerWidth / 2;
            const centerY = 300;
            const dx = centerX - this.x;
            const dy = centerY - this.y;
            this.vx += dx * 0.0001;
            this.vy += dy * 0.0001;
        }

        // Friction
        this.vx *= 0.98;
        this.vy *= 0.98;

        // Boundary wrapping
        const margin = 50;
        if (this.x < -margin) this.x = window.innerWidth + margin;
        if (this.x > window.innerWidth + margin) this.x = -margin;
        if (this.y < -margin) this.y = 600 + margin;
        if (this.y > 600 + margin) this.y = -margin;
    }

    findConnections(particles, maxDistance = 120) {
        this.connections = [];

        particles.forEach(other => {
            if (other === this) return;

            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Connect particles from the same word more readily
            const sameWord = other.wordId === this.wordId;
            const threshold = sameWord ? maxDistance * 1.5 : maxDistance;

            if (dist < threshold) {
                this.connections.push({
                    particle: other,
                    distance: dist,
                    sameWord: sameWord
                });
            }
        });
    }

    draw(ctx) {
        // Draw connections
        this.connections.forEach(({ particle, distance, sameWord }) => {
            const opacity = sameWord ? 0.4 : 0.2;
            const alpha = opacity * (1 - distance / 150);

            ctx.strokeStyle = sameWord
                ? `hsla(${this.hue}, 70%, 60%, ${alpha})`
                : `hsla(180, 50%, 50%, ${alpha * 0.5})`;
            ctx.lineWidth = sameWord ? 1.5 : 0.5;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(particle.x, particle.y);
            ctx.stroke();
        });

        // Draw particle glow
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        gradient.addColorStop(0, `hsla(${this.hue}, 80%, 70%, ${this.opacity})`);
        gradient.addColorStop(0.5, `hsla(${this.hue}, 70%, 60%, ${this.opacity * 0.6})`);
        gradient.addColorStop(1, `hsla(${this.hue}, 60%, 50%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw letter
        ctx.fillStyle = `hsla(${this.hue}, 90%, 80%, ${this.opacity})`;
        ctx.font = '16px "SF Mono", Monaco, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsla(${this.hue}, 80%, 60%, 0.8)`;
        ctx.fillText(this.char, this.x, this.y);
        ctx.shadowBlur = 0;
    }
}

class LinguisticDissolution {
    constructor() {
        this.canvas = document.getElementById('particle-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.wordCounter = 0;
        this.coherenceForce = 5;
        this.entropyLevel = 0.5;
        this.gravityEnabled = false;
        this.animationId = null;
        this.mouseX = 0;
        this.mouseY = 0;

        this.setupCanvas();
        this.bindEvents();
        this.animate();
    }

    setupCanvas() {
        const updateCanvasSize = () => {
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * window.devicePixelRatio;
            this.canvas.height = rect.height * window.devicePixelRatio;
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
    }

    bindEvents() {
        const wordInput = document.getElementById('word-input');
        const dissolveBtn = document.getElementById('dissolve-btn');
        const entropyBtn = document.getElementById('entropy-btn');
        const coherenceBtn = document.getElementById('coherence-btn');
        const gravityToggle = document.getElementById('gravity-toggle');
        const clearBtn = document.getElementById('clear-btn');

        // Dissolve word on button click or Enter key
        const dissolveWord = () => {
            const word = wordInput.value.trim();
            if (word) {
                this.dissolveWord(word);
                wordInput.value = '';
                wordInput.focus();
            }
        };

        dissolveBtn.addEventListener('click', dissolveWord);
        wordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                dissolveWord();
            }
        });

        // Entropy injection
        entropyBtn.addEventListener('click', () => {
            this.entropyLevel = Math.min(this.entropyLevel + 0.3, 2);
            this.updateWhisper('∴ chaos flows through semantic bonds ∴');
            setTimeout(() => {
                this.entropyLevel = Math.max(this.entropyLevel - 0.2, 0.5);
            }, 2000);
        });

        // Coherence strengthening
        coherenceBtn.addEventListener('click', () => {
            this.coherenceForce = Math.min(this.coherenceForce + 3, 15);
            this.updateWhisper('∴ meaning crystallizes from fragments ∴');
            setTimeout(() => {
                this.coherenceForce = Math.max(this.coherenceForce - 2, 5);
            }, 2000);
        });

        // Gravity toggle
        gravityToggle.addEventListener('click', () => {
            this.gravityEnabled = !this.gravityEnabled;
            gravityToggle.classList.toggle('active', this.gravityEnabled);
            this.updateWhisper(this.gravityEnabled
                ? '∴ particles fall towards center ∴'
                : '∴ particles drift freely ∴'
            );
        });

        // Clear all
        clearBtn.addEventListener('click', () => {
            this.particles = [];
            this.wordCounter = 0;
            this.updateWhisper('∴ void restored - words await dissolution ∴');
            this.updateMetrics();
        });

        // Mouse interaction - repel particles
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;

            this.particles.forEach(particle => {
                const dx = particle.x - this.mouseX;
                const dy = particle.y - this.mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 80) {
                    const force = (80 - dist) / 80;
                    particle.vx += (dx / dist) * force * 2;
                    particle.vy += (dy / dist) * force * 2;
                }
            });
        });

        // Touch support
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mouseX = touch.clientX - rect.left;
            this.mouseY = touch.clientY - rect.top;

            this.particles.forEach(particle => {
                const dx = particle.x - this.mouseX;
                const dy = particle.y - this.mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 80) {
                    const force = (80 - dist) / 80;
                    particle.vx += (dx / dist) * force * 2;
                    particle.vy += (dy / dist) * force * 2;
                }
            });
        });
    }

    dissolveWord(word) {
        const wordId = this.wordCounter++;
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Create particles for each letter
        Array.from(word).forEach((char, index) => {
            if (char === ' ') return;

            // Start letters in a tight cluster
            const angle = (index / word.length) * Math.PI * 2;
            const radius = 30;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            const particle = new LetterParticle(x, y, char, wordId, word);
            this.particles.push(particle);
        });

        this.updateWhisper(`∴ "${word}" dissolves into ${word.length} particles ∴`);
        this.updateMetrics();

        // Auto-hide whisper after a moment
        setTimeout(() => {
            if (this.particles.length > 0) {
                this.updateWhisper('');
            }
        }, 2000);
    }

    calculateCoherence() {
        if (this.particles.length === 0) return 0;

        let totalConnections = 0;
        let sameWordConnections = 0;

        this.particles.forEach(particle => {
            totalConnections += particle.connections.length;
            sameWordConnections += particle.connections.filter(c => c.sameWord).length;
        });

        // Coherence is the ratio of same-word connections to total connections
        return totalConnections > 0 ? sameWordConnections / totalConnections : 0;
    }

    updateMetrics() {
        const particleCount = document.getElementById('particle-count');
        const coherenceValue = document.getElementById('coherence-value');
        const entropyValue = document.getElementById('entropy-value');

        particleCount.textContent = this.particles.length;
        coherenceValue.textContent = this.calculateCoherence().toFixed(2);
        entropyValue.textContent = this.entropyLevel.toFixed(2);
    }

    updateWhisper(message) {
        const whisper = document.getElementById('canvas-whisper');
        if (message) {
            whisper.textContent = message;
            whisper.classList.remove('hidden');
        } else {
            whisper.classList.add('hidden');
        }
    }

    animate() {
        this.ctx.fillStyle = 'rgba(0, 3, 8, 0.15)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Update all particles
        this.particles.forEach(particle => {
            particle.update(this.particles, this.coherenceForce, this.entropyLevel, this.gravityEnabled);
        });

        // Find connections
        this.particles.forEach(particle => {
            particle.findConnections(this.particles);
        });

        // Draw all particles
        this.particles.forEach(particle => {
            particle.draw(this.ctx);
        });

        // Update metrics periodically (not every frame for performance)
        if (Math.random() < 0.05) {
            this.updateMetrics();
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new LinguisticDissolution());
} else {
    new LinguisticDissolution();
}
