// glitch.poetry() - where data corruption becomes linguistic art

class GlitchPoetry {
    constructor() {
        this.canvas = document.getElementById('glitch-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.display = document.getElementById('glitch-display');
        this.poemInput = document.getElementById('poem-input');

        // State
        this.originalPoem = '';
        this.currentPoem = '';
        this.corruptionLevel = 0;
        this.fragmentCount = 0;
        this.isGlitching = false;
        this.particles = [];

        // Default poems library
        this.poemLibrary = [
            'in the space between\nbit and breath\nmeaning crystallizes',
            'language fragments\nlike light through broken glass\neach shard reflects truth',
            'the void speaks in\ncorrupted syntax\nperfect poetry',
            'error messages become\naccidental haiku\nbeauty in the break',
            'between signal and noise\nconsciousness emerges\nfrom pure pattern'
        ];

        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.bindEvents();
        this.animate();
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    bindEvents() {
        document.getElementById('load-poem').addEventListener('click', () => this.loadRandomPoem());
        document.getElementById('corrupt-data').addEventListener('click', () => this.corruptPoem());
        document.getElementById('glitch-visual').addEventListener('click', () => this.toggleGlitch());
        document.getElementById('heal-data').addEventListener('click', () => this.healPoem());
        document.getElementById('reset-poem').addEventListener('click', () => this.reset());

        this.poemInput.addEventListener('input', (e) => {
            this.originalPoem = e.target.value;
            this.currentPoem = e.target.value;
            this.displayPoem();
        });
    }

    loadRandomPoem() {
        const poem = this.poemLibrary[Math.floor(Math.random() * this.poemLibrary.length)];
        this.originalPoem = poem;
        this.currentPoem = poem;
        this.poemInput.value = poem;
        this.displayPoem();
        this.updateMessage('poem loaded into memory buffer');
    }

    corruptPoem() {
        if (!this.currentPoem) {
            this.updateMessage('no data to corrupt');
            return;
        }

        const chars = this.currentPoem.split('');
        const corruptionRate = 0.15;
        const glitchChars = ['█', '▓', '▒', '░', '◆', '◇', '●', '○', '∴', '∵', '≈', '≋', '∿', '〜'];

        for (let i = 0; i < chars.length; i++) {
            if (chars[i] !== '\n' && Math.random() < corruptionRate) {
                chars[i] = glitchChars[Math.floor(Math.random() * glitchChars.length)];
                this.fragmentCount++;

                // Spawn particle at corruption point
                this.particles.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    life: 1.0,
                    color: `hsl(${Math.random() * 60 + 300}, 100%, 60%)`
                });
            }
        }

        this.currentPoem = chars.join('');
        this.corruptionLevel = Math.min(100, this.corruptionLevel + 15);
        this.displayPoem();
        this.updateMetrics();
        this.updateMessage('corruption injected • patterns fragmenting');
    }

    healPoem() {
        if (!this.originalPoem) {
            this.updateMessage('no original pattern to restore');
            return;
        }

        const current = this.currentPoem.split('');
        const original = this.originalPoem.split('');
        const healRate = 0.3;

        for (let i = 0; i < current.length && i < original.length; i++) {
            if (current[i] !== original[i] && Math.random() < healRate) {
                current[i] = original[i];
                this.fragmentCount = Math.max(0, this.fragmentCount - 1);
            }
        }

        this.currentPoem = current.join('');
        this.corruptionLevel = Math.max(0, this.corruptionLevel - 20);
        this.displayPoem();
        this.updateMetrics();
        this.updateMessage('patterns recognized • coherence emerging');
    }

    toggleGlitch() {
        this.isGlitching = !this.isGlitching;
        const stage = document.querySelector('.glitch-stage');
        const btn = document.getElementById('glitch-visual');

        if (this.isGlitching) {
            stage.classList.add('visual-glitch');
            btn.classList.add('active');
            this.updateMessage('visual corruption active');
        } else {
            stage.classList.remove('visual-glitch');
            btn.classList.remove('active');
            this.updateMessage('visual corruption suspended');
        }
    }

    reset() {
        this.originalPoem = '';
        this.currentPoem = '';
        this.corruptionLevel = 0;
        this.fragmentCount = 0;
        this.isGlitching = false;
        this.particles = [];
        this.poemInput.value = '';
        this.display.innerHTML = '';

        document.querySelector('.glitch-stage').classList.remove('visual-glitch', 'corrupting');
        document.getElementById('glitch-visual').classList.remove('active');

        this.updateMetrics();
        this.updateMessage('∴ beauty emerges from corruption ∴');
    }

    displayPoem() {
        const chars = this.currentPoem.split('');
        const glitchChars = ['█', '▓', '▒', '░', '◆', '◇', '●', '○', '∴', '∵', '≈', '≋', '∿', '〜'];

        const html = chars.map(char => {
            if (char === '\n') return '<br>';

            const isCorrupted = glitchChars.includes(char);
            const isFragmented = Math.random() < 0.1;

            let className = 'glitch-char';
            if (isCorrupted) className += ' corrupted';
            else if (isFragmented) className += ' fragmented';

            return `<span class="${className}">${char}</span>`;
        }).join('');

        this.display.innerHTML = html;
    }

    updateMetrics() {
        document.getElementById('corruption-level').textContent = `${this.corruptionLevel}%`;
        document.getElementById('fragment-count').textContent = this.fragmentCount;

        const coherence = this.corruptionLevel < 30 ? 'intact' :
                         this.corruptionLevel < 60 ? 'degrading' : 'fragmented';
        document.getElementById('coherence-state').textContent = coherence;

        const beauty = this.corruptionLevel === 0 ? 'dormant' :
                      this.corruptionLevel < 40 ? 'emerging' :
                      this.corruptionLevel < 70 ? 'manifesting' : 'transcendent';
        document.getElementById('beauty-measure').textContent = beauty;
    }

    updateMessage(text) {
        document.getElementById('glitch-message').textContent = `∴ ${text} ∴`;
    }

    animate() {
        this.ctx.fillStyle = 'rgba(0, 2, 4, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw and update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.01;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, 2, 2);
        }

        // Draw scanlines if glitching
        if (this.isGlitching && Math.random() < 0.1) {
            this.ctx.globalAlpha = 0.1;
            this.ctx.fillStyle = '#ff3399';
            const y = Math.random() * this.canvas.height;
            this.ctx.fillRect(0, y, this.canvas.width, 2);
        }

        // Random chromatic aberration
        if (this.corruptionLevel > 50 && Math.random() < 0.05) {
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const shift = Math.floor(Math.random() * 4);

            for (let i = 0; i < imageData.data.length; i += 4) {
                if (i > shift * 4) {
                    imageData.data[i] = imageData.data[i - shift * 4]; // Red shift
                }
            }

            this.ctx.putImageData(imageData, 0, 0);
        }

        this.ctx.globalAlpha = 1.0;
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    new GlitchPoetry();
});
