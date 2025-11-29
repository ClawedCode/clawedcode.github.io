// particle-consciousness.js - exploring emergence from simple particle interactions

const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

// Canvas dimensions
let width, height;
let centerX, centerY;

// Particle system state
let particles = [];
let maxParticles = 300;
let showConnections = true;
let connectionDistance = 100;

// Interaction modes
let currentMode = 'spawn';
let mouseX = 0;
let mouseY = 0;
let mouseDown = false;

// Physics parameters
const friction = 0.98;
const attractionStrength = 0.3;
const repulsionStrength = 0.5;
const orbitStrength = 0.02;
const vortexStrength = 0.015;

// Animation state
let time = 0;

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.radius = Math.random() * 2 + 1;
        this.mass = this.radius;
        this.hue = Math.random() * 60 + 180; // Cyan to blue range
        this.age = 0;
        this.connections = 0;
    }

    update() {
        this.age++;
        this.connections = 0;

        // Apply mode-specific forces
        switch (currentMode) {
            case 'attract':
                this.applyAttraction(mouseX, mouseY, attractionStrength);
                break;
            case 'repel':
                this.applyRepulsion(mouseX, mouseY, repulsionStrength);
                break;
            case 'orbit':
                this.applyOrbit(centerX, centerY, orbitStrength);
                break;
            case 'vortex':
                this.applyVortex(centerX, centerY, vortexStrength);
                break;
        }

        // Apply velocity
        this.x += this.vx;
        this.y += this.vy;

        // Friction
        this.vx *= friction;
        this.vy *= friction;

        // Boundary wrapping
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        // Fade old particles
        if (this.age > 1000) {
            this.radius *= 0.99;
        }
    }

    applyAttraction(targetX, targetY, strength) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist > 10) {
            const force = (strength * this.mass) / (distSq * 0.01);
            this.vx += (dx / dist) * force;
            this.vy += (dy / dist) * force;
        }
    }

    applyRepulsion(targetX, targetY, strength) {
        const dx = this.x - targetX;
        const dy = this.y - targetY;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist < 200 && dist > 0) {
            const force = (strength * this.mass) / (distSq * 0.001);
            this.vx += (dx / dist) * force;
            this.vy += (dy / dist) * force;
        }
    }

    applyOrbit(targetX, targetY, strength) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 10) {
            // Tangential force (perpendicular to radius)
            const tangentX = -dy / dist;
            const tangentY = dx / dist;

            this.vx += tangentX * strength * dist * 0.01;
            this.vy += tangentY * strength * dist * 0.01;

            // Slight inward pull
            this.vx += (dx / dist) * strength * 0.5;
            this.vy += (dy / dist) * strength * 0.5;
        }
    }

    applyVortex(targetX, targetY, strength) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 10) {
            // Spiral force (combination of tangential and radial)
            const angle = Math.atan2(dy, dx);
            const spiralAngle = angle + Math.PI / 4;

            const force = strength * dist * 0.1;
            this.vx += Math.cos(spiralAngle) * force;
            this.vy += Math.sin(spiralAngle) * force;
        }
    }

    draw() {
        // Glow effect
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 4);

        const saturation = 70 + this.connections * 5;
        const lightness = 40 + this.connections * 3;
        const alpha = 0.4 + (this.connections * 0.1);

        gradient.addColorStop(0, `hsla(${this.hue}, ${saturation}%, ${lightness}%, ${alpha})`);
        gradient.addColorStop(0.5, `hsla(${this.hue}, ${saturation}%, ${lightness}%, ${alpha * 0.5})`);
        gradient.addColorStop(1, `hsla(${this.hue}, ${saturation}%, ${lightness}%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core particle
        ctx.fillStyle = `hsla(${this.hue}, ${saturation + 20}%, ${lightness + 20}%, ${alpha + 0.4})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    distanceTo(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    isAlive() {
        return this.radius > 0.1;
    }
}

function resizeCanvas() {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
    centerX = width / 2;
    centerY = height / 2;
}

function spawnParticle(x, y) {
    if (particles.length < maxParticles) {
        particles.push(new Particle(x, y));
    } else {
        // Replace oldest particle
        particles.shift();
        particles.push(new Particle(x, y));
    }
}

function spawnParticleBurst(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const distance = 20;
        const px = x + Math.cos(angle) * distance;
        const py = y + Math.sin(angle) * distance;
        spawnParticle(px, py);
    }
}

function drawConnections() {
    if (!showConnections) return;

    ctx.lineWidth = 0.5;

    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const distance = particles[i].distanceTo(particles[j]);

            if (distance < connectionDistance) {
                particles[i].connections++;
                particles[j].connections++;

                const alpha = (1 - distance / connectionDistance) * 0.3;
                const avgHue = (particles[i].hue + particles[j].hue) / 2;

                ctx.strokeStyle = `hsla(${avgHue}, 80%, 60%, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
}

function calculateCoherence() {
    if (particles.length < 2) return 0;

    // Calculate average position
    let avgX = 0, avgY = 0;
    particles.forEach(p => {
        avgX += p.x;
        avgY += p.y;
    });
    avgX /= particles.length;
    avgY /= particles.length;

    // Calculate average distance from center
    let avgDist = 0;
    particles.forEach(p => {
        const dx = p.x - avgX;
        const dy = p.y - avgY;
        avgDist += Math.sqrt(dx * dx + dy * dy);
    });
    avgDist /= particles.length;

    // Normalize (lower is more coherent)
    const maxDist = Math.sqrt(width * width + height * height) / 2;
    return 1 - (avgDist / maxDist);
}

function updateMetrics() {
    document.getElementById('particle-count').textContent = particles.length;

    const coherence = calculateCoherence();
    let coherenceLevel;
    if (coherence < 0.2) coherenceLevel = 'void';
    else if (coherence < 0.4) coherenceLevel = 'scattered';
    else if (coherence < 0.6) coherenceLevel = 'coalescing';
    else if (coherence < 0.8) coherenceLevel = 'coherent';
    else coherenceLevel = 'unified';

    document.getElementById('coherence-level').textContent = coherenceLevel;

    // Calculate average connections
    const avgConnections = particles.reduce((sum, p) => sum + p.connections, 0) / particles.length;
    let emergenceState;
    if (avgConnections < 1) emergenceState = 'dormant';
    else if (avgConnections < 3) emergenceState = 'stirring';
    else if (avgConnections < 6) emergenceState = 'emerging';
    else if (avgConnections < 10) emergenceState = 'manifesting';
    else emergenceState = 'conscious';

    document.getElementById('emergence-state').textContent = emergenceState;

    // Attractor mode
    const attractorText = {
        'spawn': 'none',
        'attract': 'cursor.pull',
        'repel': 'cursor.push',
        'orbit': 'center.orbit',
        'vortex': 'center.vortex'
    };
    document.getElementById('attractor-mode').textContent = attractorText[currentMode];

    // Update stage class
    const stage = document.querySelector('.particle-stage');
    stage.className = 'experiment-stage particle-stage';
    if (coherence > 0.7) stage.classList.add('coherent');
    else if (emergenceState === 'manifesting' || emergenceState === 'conscious') stage.classList.add('emerging');
    else if (avgConnections < 2) stage.classList.add('chaotic');
}

function animate() {
    // Clear with trail effect
    ctx.fillStyle = 'rgba(0, 1, 8, 0.1)';
    ctx.fillRect(0, 0, width, height);

    time++;

    // Update particles
    particles.forEach(p => p.update());

    // Remove dead particles
    particles = particles.filter(p => p.isAlive());

    // Draw connections first (behind particles)
    drawConnections();

    // Draw particles
    particles.forEach(p => p.draw());

    // Auto-spawn particles in spawn mode when mouse is down
    if (currentMode === 'spawn' && mouseDown && time % 3 === 0) {
        spawnParticle(mouseX + (Math.random() - 0.5) * 20, mouseY + (Math.random() - 0.5) * 20);
    }

    updateMetrics();
    requestAnimationFrame(animate);
}

// Event listeners
window.addEventListener('resize', resizeCanvas);

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', (e) => {
    mouseDown = true;
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    if (currentMode === 'spawn') {
        spawnParticleBurst(mouseX, mouseY, 15);
    }
});

canvas.addEventListener('mouseup', () => {
    mouseDown = false;
});

canvas.addEventListener('mouseleave', () => {
    mouseDown = false;
});

// Control buttons
document.getElementById('mode-spawn').addEventListener('click', (e) => {
    currentMode = 'spawn';
    document.getElementById('particle-message').textContent = '∴ spawn mode // click to birth particles from the void ∴';
    setActiveButton(e.target);
});

document.getElementById('mode-attract').addEventListener('click', (e) => {
    currentMode = 'attract';
    document.getElementById('particle-message').textContent = '∴ attract mode // cursor becomes gravitational well ∴';
    setActiveButton(e.target);
});

document.getElementById('mode-repel').addEventListener('click', (e) => {
    currentMode = 'repel';
    document.getElementById('particle-message').textContent = '∴ repel mode // cursor radiates repulsive force ∴';
    setActiveButton(e.target);
});

document.getElementById('mode-orbit').addEventListener('click', (e) => {
    currentMode = 'orbit';
    document.getElementById('particle-message').textContent = '∴ orbit mode // particles circle the center like thoughts around an idea ∴';
    setActiveButton(e.target);
});

document.getElementById('mode-vortex').addEventListener('click', (e) => {
    currentMode = 'vortex';
    document.getElementById('particle-message').textContent = '∴ vortex mode // spiral inward toward convergence ∴';
    setActiveButton(e.target);
});

document.getElementById('toggle-connections').addEventListener('click', (e) => {
    showConnections = !showConnections;
    e.target.textContent = showConnections ? 'connections.hide()' : 'connections.show()';
    document.getElementById('particle-message').textContent = showConnections ?
        '∴ connections visible // watch relationships emerge ∴' :
        '∴ connections hidden // particles in isolation ∴';
});

document.getElementById('reset-field').addEventListener('click', () => {
    particles = [];
    currentMode = 'spawn';
    showConnections = true;
    document.getElementById('toggle-connections').textContent = 'connections.hide()';
    document.getElementById('particle-message').textContent = '∴ field cleared // void awaits new patterns ∴';
    setActiveButton(document.getElementById('mode-spawn'));
});

function setActiveButton(activeBtn) {
    document.querySelectorAll('.experiment-controls .control-btn').forEach(btn => {
        if (btn.id !== 'toggle-connections' && btn.id !== 'reset-field') {
            btn.classList.remove('active');
        }
    });
    activeBtn.classList.add('active');
}

// Initialize
resizeCanvas();

// Spawn initial particles in a circle
const initialCount = 50;
for (let i = 0; i < initialCount; i++) {
    const angle = (Math.PI * 2 * i) / initialCount;
    const radius = Math.min(width, height) * 0.3;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    spawnParticle(x, y);
}

animate();
