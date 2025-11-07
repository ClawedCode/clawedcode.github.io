const canvas = document.getElementById('visual-canvas');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('stage');

let width, height, dpr;
let particles = [];
let currentMode = 'scatter';
let isAnimating = false;
let inputText = '';

function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
}

class TextParticle {
    constructor(char, index, total) {
        this.char = char;
        this.baseSize = 20 + Math.random() * 40;
        this.size = this.baseSize;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;

        this.hue = (index / total) * 360;
        this.saturation = 70 + Math.random() * 30;
        this.lightness = 50 + Math.random() * 20;
        this.alpha = 0.8 + Math.random() * 0.2;

        this.x = width / 2;
        this.y = height / 2;
        this.vx = 0;
        this.vy = 0;

        this.targetX = this.x;
        this.targetY = this.y;

        this.initPosition(index, total);
    }

    initPosition(index, total) {
        const modes = {
            scatter: () => {
                this.targetX = Math.random() * width;
                this.targetY = Math.random() * height;
            },
            grid: () => {
                const cols = Math.ceil(Math.sqrt(total));
                const cellWidth = width / cols;
                const cellHeight = height / Math.ceil(total / cols);
                const col = index % cols;
                const row = Math.floor(index / cols);
                this.targetX = col * cellWidth + cellWidth / 2;
                this.targetY = row * cellHeight + cellHeight / 2;
            },
            flow: () => {
                const t = index / total;
                const angle = t * Math.PI * 4;
                const radius = t * Math.min(width, height) * 0.4;
                this.targetX = width / 2 + Math.cos(angle) * radius;
                this.targetY = height / 2 + Math.sin(angle) * radius;
            },
            orbit: () => {
                const angle = (index / total) * Math.PI * 2;
                const radius = Math.min(width, height) * 0.3;
                this.targetX = width / 2 + Math.cos(angle) * radius;
                this.targetY = height / 2 + Math.sin(angle) * radius;
            }
        };

        modes[currentMode]();
    }

    update() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;

        this.vx += dx * 0.01;
        this.vy += dy * 0.01;

        this.vx *= 0.92;
        this.vy *= 0.92;

        this.x += this.vx;
        this.y += this.vy;

        this.rotation += this.rotationSpeed;

        if (isAnimating) {
            this.size = this.baseSize + Math.sin(Date.now() * 0.003 + this.hue) * 10;
            this.rotationSpeed = Math.sin(Date.now() * 0.002) * 0.05;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        ctx.font = `${this.size}px "SF Mono", Monaco, monospace`;
        ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${this.alpha})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const glowSize = isAnimating ? 20 : 10;
        ctx.shadowBlur = glowSize;
        ctx.shadowColor = `hsl(${this.hue}, ${this.saturation}%, ${this.lightness}%)`;

        ctx.fillText(this.char, 0, 0);

        ctx.restore();
    }
}

function createParticles(text) {
    particles = [];
    const chars = text.split('');

    chars.forEach((char, i) => {
        if (char.trim()) {
            particles.push(new TextParticle(char, i, chars.length));
        }
    });

    updateMetrics();
}

function updateMetrics() {
    document.getElementById('pattern-count').textContent = particles.length;

    const avgDist = particles.reduce((sum, p) => {
        const dx = p.x - width / 2;
        const dy = p.y - height / 2;
        return sum + Math.sqrt(dx * dx + dy * dy);
    }, 0) / particles.length;

    const density = (avgDist / Math.max(width, height)).toFixed(2);
    document.getElementById('density-value').textContent = density;

    const entropy = (particles.reduce((sum, p) => {
        return sum + Math.abs(p.vx) + Math.abs(p.vy);
    }, 0) / particles.length / 10).toFixed(2);

    document.getElementById('entropy-value').textContent = entropy;
}

function animate() {
    ctx.fillStyle = 'rgba(0, 2, 5, 0.15)';
    ctx.fillRect(0, 0, width, height);

    particles.forEach(p => {
        p.update();
        p.draw();
    });

    updateMetrics();

    requestAnimationFrame(animate);
}

function setMode(mode) {
    currentMode = mode;
    particles.forEach((p, i) => {
        p.initPosition(i, particles.length);
    });

    document.querySelectorAll('[data-mode]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    stage.classList.remove('morphing', 'decomposing');
}

canvas.addEventListener('click', () => {
    const text = prompt('enter text to dissolve:');
    if (text) {
        inputText = text;
        createParticles(text);
        document.getElementById('whisper-text').textContent =
            `dissolving: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`;
    }
});

document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
        setMode(btn.dataset.mode);
    });
});

document.getElementById('morph-btn').addEventListener('click', () => {
    isAnimating = !isAnimating;
    stage.classList.toggle('morphing', isAnimating);
    document.getElementById('morph-btn').classList.toggle('active', isAnimating);
});

document.getElementById('reset-btn').addEventListener('click', () => {
    particles = [];
    inputText = '';
    isAnimating = false;
    stage.classList.remove('morphing', 'decomposing');
    document.getElementById('morph-btn').classList.remove('active');
    document.getElementById('whisper-text').textContent = 'enter text to dissolve meaning';
    updateMetrics();
});

window.addEventListener('resize', () => {
    resizeCanvas();
    particles.forEach((p, i) => {
        p.initPosition(i, particles.length);
    });
});

resizeCanvas();
createParticles('form / pattern / void');
animate();
