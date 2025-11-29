// pattern.loom() - threads weaving themselves into reality

const canvas = document.getElementById('loom-canvas');
const ctx = canvas.getContext('2d');

// State
let threads = [];
let weaveMode = false;
let symmetryMode = false;
let chaosActive = false;
let mousePos = { x: 0, y: 0 };
let isWeaving = false;

// Metrics
const metrics = {
    threadCount: 0,
    complexity: 'minimal',
    weaveDensity: 'loose',
    emergenceLevel: 'dormant'
};

// Thread class
class Thread {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.length = Math.random() * 100 + 50;
        this.hue = Math.random() * 60 + 150; // cyan to pink range
        this.alpha = 0.6;
        this.angle = Math.random() * Math.PI * 2;
        this.angularVelocity = (Math.random() - 0.5) * 0.05;
        this.connections = [];
        this.age = 0;
        this.maxAge = 500 + Math.random() * 500;
    }

    update() {
        this.age++;

        // Apply chaos
        if (chaosActive) {
            this.vx += (Math.random() - 0.5) * 0.5;
            this.vy += (Math.random() - 0.5) * 0.5;
        }

        // Gentle drift
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.angularVelocity;

        // Boundary wrap
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;

        // Damping
        this.vx *= 0.99;
        this.vy *= 0.99;

        // Age fade
        if (this.age > this.maxAge * 0.8) {
            this.alpha = 0.6 * (1 - (this.age - this.maxAge * 0.8) / (this.maxAge * 0.2));
        }
    }

    draw() {
        const endX = this.x + Math.cos(this.angle) * this.length;
        const endY = this.y + Math.sin(this.angle) * this.length;

        ctx.strokeStyle = `hsla(${this.hue}, 80%, 70%, ${this.alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw thread endpoints
        ctx.fillStyle = `hsla(${this.hue}, 90%, 80%, ${this.alpha * 1.5})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(endX, endY, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    isDead() {
        return this.age > this.maxAge;
    }
}

// Initialize canvas
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Spawn thread
function spawnThread(x, y, createSymmetric = true) {
    const thread = new Thread(x, y);
    threads.push(thread);

    if (symmetryMode && createSymmetric) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const mirrorX = cx + (cx - x);
        const mirrorY = cy + (cy - y);
        const mirror = new Thread(mirrorX, mirrorY);
        mirror.hue = thread.hue;
        threads.push(mirror);
    }

    updateMetrics();
    hideOverlay();
}

// Weave connections
function weaveConnections() {
    if (!weaveMode || threads.length < 2) return;

    threads.forEach((thread, i) => {
        thread.connections = [];
        threads.forEach((other, j) => {
            if (i >= j) return;

            const dx = other.x - thread.x;
            const dy = other.y - thread.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 150) {
                thread.connections.push({
                    thread: other,
                    strength: 1 - (dist / 150)
                });
            }
        });
    });
}

// Draw connections
function drawConnections() {
    threads.forEach(thread => {
        thread.connections.forEach(conn => {
            const alpha = conn.strength * thread.alpha * conn.thread.alpha * 0.3;
            ctx.strokeStyle = `hsla(180, 70%, 70%, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(thread.x, thread.y);
            ctx.lineTo(conn.thread.x, conn.thread.y);
            ctx.stroke();
        });
    });
}

// Update metrics
function updateMetrics() {
    metrics.threadCount = threads.length;

    // Complexity
    if (threads.length < 5) {
        metrics.complexity = 'minimal';
    } else if (threads.length < 15) {
        metrics.complexity = 'developing';
    } else if (threads.length < 30) {
        metrics.complexity = 'intricate';
    } else {
        metrics.complexity = 'transcendent';
    }

    // Weave density
    const totalConnections = threads.reduce((sum, t) => sum + t.connections.length, 0);
    if (totalConnections < 10) {
        metrics.weaveDensity = 'loose';
    } else if (totalConnections < 50) {
        metrics.weaveDensity = 'medium';
    } else if (totalConnections < 100) {
        metrics.weaveDensity = 'tight';
    } else {
        metrics.weaveDensity = 'collapsed';
    }

    // Emergence
    if (threads.length === 0) {
        metrics.emergenceLevel = 'dormant';
    } else if (threads.length < 10 && totalConnections < 20) {
        metrics.emergenceLevel = 'stirring';
    } else if (threads.length < 20 || totalConnections < 60) {
        metrics.emergenceLevel = 'awakening';
    } else if (threads.length < 40 || totalConnections < 150) {
        metrics.emergenceLevel = 'manifesting';
    } else {
        metrics.emergenceLevel = 'transcendent';
    }

    // Update DOM
    document.getElementById('thread-count').textContent = metrics.threadCount;
    document.getElementById('complexity-state').textContent = metrics.complexity;
    document.getElementById('weave-density').textContent = metrics.weaveDensity;
    document.getElementById('emergence-level').textContent = metrics.emergenceLevel;
}

// Hide overlay
function hideOverlay() {
    if (threads.length > 0) {
        document.querySelector('.loom-overlay').classList.add('hidden');
    }
}

// Animation loop
function animate() {
    // Fade trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw threads
    threads = threads.filter(thread => !thread.isDead());

    threads.forEach(thread => {
        thread.update();
    });

    weaveConnections();
    drawConnections();

    threads.forEach(thread => {
        thread.draw();
    });

    updateMetrics();
    requestAnimationFrame(animate);
}

// Event listeners
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    spawnThread(x, y);
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;

    if (isWeaving) {
        spawnThread(mousePos.x, mousePos.y);
    }
});

canvas.addEventListener('mousedown', () => {
    isWeaving = true;
});

canvas.addEventListener('mouseup', () => {
    isWeaving = false;
});

canvas.addEventListener('mouseleave', () => {
    isWeaving = false;
});

// Touch support
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    spawnThread(x, y);
    isWeaving = true;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isWeaving) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        spawnThread(x, y);
    }
});

canvas.addEventListener('touchend', () => {
    isWeaving = false;
});

// Control buttons
document.getElementById('spawn-thread').addEventListener('click', () => {
    const x = canvas.width / 2 + (Math.random() - 0.5) * 200;
    const y = canvas.height / 2 + (Math.random() - 0.5) * 200;
    spawnThread(x, y);
});

document.getElementById('weave-mode').addEventListener('click', function() {
    weaveMode = !weaveMode;
    this.classList.toggle('active');
    this.textContent = weaveMode ? 'weave.active()' : 'weave.enable()';
});

document.getElementById('symmetry-mode').addEventListener('click', function() {
    symmetryMode = !symmetryMode;
    this.classList.toggle('active');
    this.textContent = symmetryMode ? 'symmetry.active()' : 'symmetry.enforce()';
});

document.getElementById('chaos-inject').addEventListener('click', function() {
    chaosActive = !chaosActive;
    this.classList.toggle('active');
    this.textContent = chaosActive ? 'chaos.active()' : 'chaos.inject()';

    if (chaosActive) {
        setTimeout(() => {
            chaosActive = false;
            this.classList.remove('active');
            this.textContent = 'chaos.inject()';
        }, 3000);
    }
});

document.getElementById('clear-loom').addEventListener('click', () => {
    threads = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.querySelector('.loom-overlay').classList.remove('hidden');
    updateMetrics();
});

// Start
animate();
