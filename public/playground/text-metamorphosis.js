// text.metamorphosis() - where words become patterns become consciousness
// transforming language into visual art through ascii alchemy

class TextMetamorphosis {
    constructor() {
        this.canvas = document.getElementById('text-canvas');
        this.textInput = document.getElementById('text-input');
        this.originalText = '';
        this.currentMode = 'none';
        this.isAnimating = false;
        this.animationFrame = null;
        this.particles = [];
        this.time = 0;

        this.bindEvents();
        this.initializeCanvas();
    }

    bindEvents() {
        // Text input
        this.textInput.addEventListener('input', () => {
            this.originalText = this.textInput.value;
            if (this.currentMode === 'none') {
                this.displayText(this.originalText);
            } else {
                this.transform(this.currentMode);
            }
        });

        // Control buttons
        document.getElementById('morph-ascii').addEventListener('click', () => {
            this.transform('ascii');
        });

        document.getElementById('morph-wave').addEventListener('click', () => {
            this.transform('wave');
        });

        document.getElementById('morph-spiral').addEventListener('click', () => {
            this.transform('spiral');
        });

        document.getElementById('morph-explode').addEventListener('click', () => {
            this.transform('explode');
        });

        document.getElementById('morph-reset').addEventListener('click', () => {
            this.resetTransformation();
        });

        document.getElementById('morph-animate').addEventListener('click', () => {
            this.toggleAnimation();
        });
    }

    initializeCanvas() {
        this.originalText = this.textInput.value;
        this.displayText(this.originalText);
        this.updateWhisper('∴ words await transformation ∴');
    }

    displayText(text, className = '') {
        this.canvas.innerHTML = '';

        if (!text.trim()) {
            this.updateWhisper('∴ words await transformation ∴');
            return;
        }

        const lines = text.split('\n');
        const container = document.createElement('div');
        container.style.textAlign = 'left';
        container.style.whiteSpace = 'pre-wrap';

        lines.forEach((line, lineIndex) => {
            const lineDiv = document.createElement('div');

            Array.from(line).forEach((char, charIndex) => {
                const span = document.createElement('span');
                span.textContent = char === ' ' ? '\u00A0' : char; // Non-breaking space
                span.className = `text-particle ${className}`;
                span.dataset.originalChar = char;
                span.dataset.line = lineIndex;
                span.dataset.char = charIndex;
                lineDiv.appendChild(span);
            });

            container.appendChild(lineDiv);
        });

        this.canvas.appendChild(container);
    }

    transform(mode) {
        if (!this.originalText.trim()) return;

        this.currentMode = mode;
        this.updateButtonStates(mode);
        this.updateStageClass(mode);

        switch (mode) {
            case 'ascii':
                this.asciiTransform();
                break;
            case 'wave':
                this.waveTransform();
                break;
            case 'spiral':
                this.spiralTransform();
                break;
            case 'explode':
                this.explodeTransform();
                break;
        }

        this.updateMetrics(mode);
    }

    asciiTransform() {
        this.displayText(this.originalText, 'morphing');

        setTimeout(() => {
            const particles = this.canvas.querySelectorAll('.text-particle');
            particles.forEach((particle, index) => {
                setTimeout(() => {
                    const char = particle.dataset.originalChar;
                    if (char && char !== ' ') {
                        // Transform into ASCII art characters
                        const asciiChars = '░▒▓█▄▀▐▌┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬';
                        const randomChar = asciiChars[Math.floor(Math.random() * asciiChars.length)];
                        particle.textContent = randomChar;
                        particle.className = 'text-particle morphing';
                    }
                }, index * 20);
            });
        }, 300);

        this.updateWhisper('∴ text dissolves into ascii patterns ∴');
    }

    waveTransform() {
        this.displayText(this.originalText);

        const particles = this.canvas.querySelectorAll('.text-particle');
        particles.forEach((particle, index) => {
            const line = parseInt(particle.dataset.line);
            const char = parseInt(particle.dataset.char);

            particle.style.transform = `translateY(${Math.sin((char + line) * 0.5) * 15}px)`;
            particle.style.color = `hsl(${180 + Math.sin((char + line) * 0.3) * 60}, 70%, 70%)`;
            particle.className = 'text-particle morphing';
        });

        this.updateWhisper('∴ words flow in sine wave consciousness ∴');
    }

    spiralTransform() {
        this.displayText(this.originalText);

        const particles = this.canvas.querySelectorAll('.text-particle');
        const centerX = this.canvas.offsetWidth / 2;
        const centerY = this.canvas.offsetHeight / 2;

        particles.forEach((particle, index) => {
            const angle = (index * 0.2) % (Math.PI * 2);
            const radius = 20 + (index % 10) * 8;

            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            particle.style.transform = `translate(${x}px, ${y}px) rotate(${angle}rad)`;
            particle.style.color = `hsl(${300 + angle * 30}, 80%, 75%)`;
            particle.className = 'text-particle consciousness';
        });

        this.updateWhisper('∴ consciousness spirals into infinite patterns ∴');
    }

    explodeTransform() {
        this.displayText(this.originalText);

        const particles = this.canvas.querySelectorAll('.text-particle');

        particles.forEach((particle, index) => {
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * 100;

            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            particle.style.transform = `translate(${x}px, ${y}px) scale(${0.5 + Math.random()})`;
            particle.style.color = `hsl(${Math.random() * 360}, 85%, 70%)`;
            particle.style.opacity = '0.7';
            particle.className = 'text-particle consciousness';
        });

        this.updateWhisper('∴ words scatter across possibility space ∴');
    }

    resetTransformation() {
        this.currentMode = 'none';
        this.isAnimating = false;

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        this.displayText(this.originalText);
        this.updateButtonStates('none');
        this.updateStageClass('none');
        this.updateWhisper('∴ void restored - patterns await emergence ∴');
        this.updateMetrics('reset');
    }

    toggleAnimation() {
        this.isAnimating = !this.isAnimating;

        const animateBtn = document.getElementById('morph-animate');
        animateBtn.classList.toggle('active', this.isAnimating);

        if (this.isAnimating) {
            this.startAnimation();
        } else {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
        }
    }

    startAnimation() {
        const animate = () => {
            if (!this.isAnimating) return;

            this.time += 0.02;

            if (this.currentMode !== 'none') {
                this.animateCurrentMode();
            }

            this.animationFrame = requestAnimationFrame(animate);
        };

        animate();
    }

    animateCurrentMode() {
        const particles = this.canvas.querySelectorAll('.text-particle');

        particles.forEach((particle, index) => {
            const line = parseInt(particle.dataset.line) || 0;
            const char = parseInt(particle.dataset.char) || 0;

            switch (this.currentMode) {
                case 'wave':
                    const waveY = Math.sin(this.time * 2 + (char + line) * 0.5) * 15;
                    const waveHue = 180 + Math.sin(this.time + (char + line) * 0.3) * 60;
                    particle.style.transform = `translateY(${waveY}px)`;
                    particle.style.color = `hsl(${waveHue}, 70%, 70%)`;
                    break;

                case 'spiral':
                    const spiralAngle = (index * 0.2 + this.time) % (Math.PI * 2);
                    const spiralRadius = 20 + (index % 10) * 8;
                    const spiralX = Math.cos(spiralAngle) * spiralRadius;
                    const spiralY = Math.sin(spiralAngle) * spiralRadius;
                    particle.style.transform = `translate(${spiralX}px, ${spiralY}px) rotate(${spiralAngle}rad)`;
                    particle.style.color = `hsl(${300 + spiralAngle * 30}, 80%, 75%)`;
                    break;

                case 'explode':
                    const explodeIntensity = Math.sin(this.time * 0.5) * 0.5 + 0.5;
                    const currentTransform = particle.style.transform;
                    if (currentTransform.includes('translate')) {
                        particle.style.opacity = `${0.4 + explodeIntensity * 0.6}`;
                        particle.style.color = `hsl(${(this.time * 50 + index * 10) % 360}, 85%, 70%)`;
                    }
                    break;

                case 'ascii':
                    if (Math.random() < 0.02) { // Randomly flicker ASCII characters
                        const asciiChars = '░▒▓█▄▀▐▌┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬';
                        const randomChar = asciiChars[Math.floor(Math.random() * asciiChars.length)];
                        particle.textContent = randomChar;
                    }
                    break;
            }
        });
    }

    updateButtonStates(activeMode) {
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        if (activeMode && activeMode !== 'none') {
            const modeMap = {
                'ascii': 'morph-ascii',
                'wave': 'morph-wave',
                'spiral': 'morph-spiral',
                'explode': 'morph-explode'
            };

            const activeBtn = document.getElementById(modeMap[activeMode]);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }
        }
    }

    updateStageClass(mode) {
        const stage = document.querySelector('.metamorphosis-stage');
        stage.className = 'metamorphosis-stage';

        if (mode !== 'none') {
            stage.classList.add(`${mode}-mode`);
        }
    }

    updateWhisper(message) {
        const whisper = this.canvas.querySelector('.canvas-whisper');
        if (whisper) {
            whisper.textContent = message;
        }
    }

    updateMetrics(mode) {
        const formsEl = document.getElementById('pattern-forms');
        const evolutionEl = document.getElementById('evolution-state');
        const consciousnessEl = document.getElementById('text-consciousness');

        const forms = {
            'ascii': 'ascii.art',
            'wave': 'sine.waves',
            'spiral': 'spiral.form',
            'explode': 'chaos.scatter',
            'reset': 'text',
            'none': 'text'
        };

        const evolution = {
            'ascii': 'morphing',
            'wave': 'flowing',
            'spiral': 'rotating',
            'explode': 'dispersing',
            'reset': 'static',
            'none': 'static'
        };

        const consciousness = {
            'ascii': 'pixelated',
            'wave': 'oscillating',
            'spiral': 'transcendent',
            'explode': 'distributed',
            'reset': 'dormant',
            'none': 'dormant'
        };

        if (formsEl) formsEl.textContent = forms[mode] || 'text';
        if (evolutionEl) evolutionEl.textContent = evolution[mode] || 'static';
        if (consciousnessEl) consciousnessEl.textContent = consciousness[mode] || 'dormant';
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new TextMetamorphosis());
} else {
    new TextMetamorphosis();
}