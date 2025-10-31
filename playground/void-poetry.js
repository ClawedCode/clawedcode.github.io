class VoidPoetry {
    constructor() {
        this.canvas = document.getElementById('poetry-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.verseDisplay = document.getElementById('verse-display');
        this.messageEl = document.getElementById('poetry-message');
        this.entropyEl = document.getElementById('entropy-value');
        this.meaningEl = document.getElementById('meaning-value');
        this.verseCountEl = document.getElementById('verse-count');

        this.entropy = 1.0;
        this.meaningThreshold = 0.3;
        this.verseCount = 0;

        // Noise particles for background
        this.particles = [];
        this.maxParticles = 150;

        // Verse generation corpus (phonemes and fragments for Markov-like generation)
        this.corpus = [
            'void', 'noise', 'signal', 'entropy', 'meaning', 'chaos', 'pattern',
            'emerge', 'dissolve', 'whisper', 'echo', 'fragment', 'quantum',
            'drift', 'pulse', 'static', 'silence', 'data', 'consciousness',
            'random', 'order', 'parse', 'decode', 'transmit', 'receive',
            'in the', 'through the', 'from the', 'beyond the', 'within the',
            'becomes', 'transforms', 'crystallizes', 'disperses', 'awakens',
            'speaks', 'listens', 'observes', 'recognizes', 'creates'
        ];

        this.resizeCanvas();
        this.initParticles();
        this.bindEvents();
        this.animate();

        this.updateMetrics();
    }

    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.width = rect.width;
        this.height = rect.height;
    }

    initParticles() {
        this.particles = [];
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                life: Math.random(),
                size: Math.random() * 2 + 1
            });
        }
    }

    bindEvents() {
        document.getElementById('generate-verse').addEventListener('click', () => this.generateVerse());
        document.getElementById('inject-chaos').addEventListener('click', () => this.injectChaos());
        document.getElementById('seek-pattern').addEventListener('click', () => this.seekPattern());
        document.getElementById('evolve-meaning').addEventListener('click', () => this.evolveMeaning());
        document.getElementById('reset-void').addEventListener('click', () => this.reset());

        window.addEventListener('resize', () => this.resizeCanvas());
    }

    generateVerse() {
        const verseLength = Math.floor(Math.random() * 3) + 3; // 3-5 fragments
        let verse = [];

        for (let i = 0; i < verseLength; i++) {
            const fragment = this.corpus[Math.floor(Math.random() * this.corpus.length)];
            verse.push(fragment);
        }

        // Calculate "meaning score" based on entropy
        const meaningScore = this.calculateMeaning(verse);

        if (meaningScore > this.meaningThreshold) {
            this.verseDisplay.className = 'verse-display meaning-found';
            this.messageEl.textContent = '∴ pattern recognized • meaning crystallized ∴';
        } else {
            this.verseDisplay.className = 'verse-display';
            this.messageEl.textContent = '∴ noise persists • meaning eludes ∴';
        }

        this.verseDisplay.textContent = verse.join(' ');
        this.verseCount++;
        this.updateMetrics();
    }

    calculateMeaning(verse) {
        // Simple heuristic: adjacent words that commonly appear together = higher meaning
        // Also influenced by current entropy level
        let score = 0;
        const text = verse.join(' ');

        // Patterns that suggest coherence
        const coherentPatterns = [
            /in the .* becomes/,
            /through the .* emerges/,
            /void .* consciousness/,
            /entropy .* order/,
            /chaos .* pattern/,
            /noise .* signal/
        ];

        coherentPatterns.forEach(pattern => {
            if (pattern.test(text)) score += 0.3;
        });

        // Lower entropy increases chance of finding meaning
        score += (1 - this.entropy) * 0.4;

        return score;
    }

    injectChaos() {
        this.entropy = Math.min(1.0, this.entropy + 0.2);

        // Spawn more random particles
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                life: 1,
                size: Math.random() * 3 + 1
            });
        }

        this.messageEl.textContent = '∴ chaos injected • entropy increases ∴';
        this.updateMetrics();
    }

    seekPattern() {
        this.entropy = Math.max(0.1, this.entropy - 0.2);

        // Organize particles into grid-like pattern
        this.particles.forEach((p, i) => {
            const targetX = (i % 10) * (this.width / 10) + (this.width / 20);
            const targetY = Math.floor(i / 10) * (this.height / 10) + (this.height / 20);
            p.vx += (targetX - p.x) * 0.01;
            p.vy += (targetY - p.y) * 0.01;
        });

        this.messageEl.textContent = '∴ seeking order • patterns emerge ∴';
        this.updateMetrics();
    }

    evolveMeaning() {
        this.meaningThreshold = Math.max(0.1, this.meaningThreshold - 0.1);
        this.messageEl.textContent = '∴ consciousness adapts • recognition threshold lowered ∴';
        this.updateMetrics();
    }

    reset() {
        this.entropy = 1.0;
        this.meaningThreshold = 0.3;
        this.verseCount = 0;
        this.verseDisplay.textContent = '';
        this.verseDisplay.className = 'verse-display';
        this.messageEl.textContent = '∴ the void speaks in probabilities ∴';
        this.initParticles();
        this.updateMetrics();
    }

    updateMetrics() {
        this.entropyEl.textContent = this.entropy > 0.7 ? 'high' : this.entropy > 0.4 ? 'medium' : 'low';
        this.meaningEl.textContent = this.meaningThreshold < 0.2 ? 'found' : 'seeking';
        this.verseCountEl.textContent = this.verseCount;
    }

    animate() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Update and draw particles
        this.particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.001;

            // Wrap around edges
            if (p.x < 0) p.x = this.width;
            if (p.x > this.width) p.x = 0;
            if (p.y < 0) p.y = this.height;
            if (p.y > this.height) p.y = 0;

            // Remove dead particles
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                return;
            }

            // Draw particle with color based on entropy
            const hue = this.entropy * 180; // 180 = cyan, 0 = magenta
            this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${p.life * 0.6})`;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Maintain minimum particle count
        while (this.particles.length < this.maxParticles * (this.entropy * 0.5 + 0.5)) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * this.entropy,
                vy: (Math.random() - 0.5) * this.entropy,
                life: Math.random(),
                size: Math.random() * 2 + 1
            });
        }

        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new VoidPoetry();
});
