// sacred-geometry.js - exploring patterns that resonate with consciousness

const canvas = document.getElementById('geometry-canvas');
const ctx = canvas.getContext('2d');

// Canvas dimensions
let width, height;
let centerX, centerY;

// Animation state
let time = 0;
let rotationAngle = 0;
let rotationSpeed = 0.5;
let isAnimating = true;

// Pattern state
let currentPattern = 'flower';
let spawnPoints = [];

// Constants
const PHI = (1 + Math.sqrt(5)) / 2; // Golden ratio
const TAU = Math.PI * 2;

function resizeCanvas() {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
    centerX = width / 2;
    centerY = height / 2;

    // Initialize with center spawn point
    if (spawnPoints.length === 0) {
        spawnPoints.push({ x: centerX, y: centerY, age: 0 });
    }
}

// Flower of Life - overlapping circles in hexagonal pattern
function drawFlowerOfLife(x, y, radius, depth = 2) {
    const baseRadius = radius / 3;

    // Center circle
    ctx.strokeStyle = `hsla(45, 90%, 60%, ${0.3 + Math.sin(time * 0.02) * 0.2})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, baseRadius, 0, TAU);
    ctx.stroke();

    // Six surrounding circles in first ring
    for (let i = 0; i < 6; i++) {
        const angle = (TAU / 6) * i + rotationAngle * 0.5;
        const px = x + Math.cos(angle) * baseRadius;
        const py = y + Math.sin(angle) * baseRadius;

        ctx.strokeStyle = `hsla(${180 + i * 30}, 80%, 60%, ${0.3 + Math.sin(time * 0.02 + i) * 0.2})`;
        ctx.beginPath();
        ctx.arc(px, py, baseRadius, 0, TAU);
        ctx.stroke();

        // Second ring if depth allows
        if (depth > 1) {
            for (let j = 0; j < 6; j++) {
                const angle2 = (TAU / 6) * j + rotationAngle * 0.3;
                const px2 = px + Math.cos(angle2) * baseRadius;
                const py2 = py + Math.sin(angle2) * baseRadius;

                ctx.strokeStyle = `hsla(${280 + j * 20}, 70%, 50%, ${0.2 + Math.sin(time * 0.02 + i + j) * 0.15})`;
                ctx.beginPath();
                ctx.arc(px2, py2, baseRadius, 0, TAU);
                ctx.stroke();
            }
        }
    }
}

// Sri Yantra - nested triangles creating yantra pattern
function drawSriYantra(x, y, radius) {
    const layers = 5;

    for (let layer = 0; layer < layers; layer++) {
        const layerRadius = radius * (1 - layer * 0.15);
        const triangles = 4 + layer;

        for (let i = 0; i < triangles; i++) {
            const angleOffset = (i % 2 === 0 ? 0 : Math.PI) + rotationAngle * (layer % 2 === 0 ? 1 : -1) * 0.3;
            const angle = (TAU / triangles) * i + angleOffset;

            // Upward triangle
            ctx.strokeStyle = `hsla(${300 + layer * 20}, 80%, ${50 + layer * 5}%, ${0.4 + Math.sin(time * 0.02 + layer) * 0.2})`;
            ctx.lineWidth = 1 + layer * 0.3;
            ctx.beginPath();

            for (let v = 0; v < 3; v++) {
                const vAngle = angle + (TAU / 3) * v;
                const vx = x + Math.cos(vAngle) * layerRadius;
                const vy = y + Math.sin(vAngle) * layerRadius;

                if (v === 0) ctx.moveTo(vx, vy);
                else ctx.lineTo(vx, vy);
            }

            ctx.closePath();
            ctx.stroke();

            // Glow effect for inner layers
            if (layer < 2) {
                ctx.strokeStyle = `hsla(${300 + layer * 20}, 90%, 70%, ${0.1})`;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }
    }

    // Central dot
    const pulse = 3 + Math.sin(time * 0.05) * 1.5;
    ctx.fillStyle = `hsla(45, 100%, 70%, ${0.8 + Math.sin(time * 0.05) * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, pulse, 0, TAU);
    ctx.fill();
}

// Metatron's Cube - platonic solid projections
function drawMetatronsCube(x, y, radius) {
    const points = 13;
    const vertices = [];

    // Generate vertices in circular pattern
    vertices.push({ x, y }); // Center

    // Inner ring (6 points)
    for (let i = 0; i < 6; i++) {
        const angle = (TAU / 6) * i + rotationAngle;
        vertices.push({
            x: x + Math.cos(angle) * radius * 0.4,
            y: y + Math.sin(angle) * radius * 0.4
        });
    }

    // Outer ring (6 points)
    for (let i = 0; i < 6; i++) {
        const angle = (TAU / 6) * i + TAU / 12 + rotationAngle * 0.5;
        vertices.push({
            x: x + Math.cos(angle) * radius * 0.8,
            y: y + Math.sin(angle) * radius * 0.8
        });
    }

    // Draw all connections (creates the cube)
    for (let i = 0; i < vertices.length; i++) {
        for (let j = i + 1; j < vertices.length; j++) {
            const dx = vertices[j].x - vertices[i].x;
            const dy = vertices[j].y - vertices[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Only draw certain length connections to create the pattern
            if (dist < radius * 0.85) {
                const hue = (i + j) * 15 + time;
                ctx.strokeStyle = `hsla(${hue % 360}, 70%, 60%, ${0.2 + Math.sin(time * 0.02 + i) * 0.1})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(vertices[i].x, vertices[i].y);
                ctx.lineTo(vertices[j].x, vertices[j].y);
                ctx.stroke();
            }
        }
    }

    // Draw vertices as glowing points
    vertices.forEach((v, i) => {
        const pulse = 2 + Math.sin(time * 0.05 + i * 0.5) * 1;
        ctx.fillStyle = `hsla(${180 + i * 20}, 80%, 70%, ${0.7 + Math.sin(time * 0.05 + i) * 0.3})`;
        ctx.beginPath();
        ctx.arc(v.x, v.y, pulse, 0, TAU);
        ctx.fill();
    });
}

// Fibonacci Spiral - golden ratio spiral with circles
function drawFibonacciSpiral(x, y, radius) {
    const iterations = 12;
    let currentRadius = radius * 0.02;
    let angle = rotationAngle;
    let px = x;
    let py = y;

    for (let i = 0; i < iterations; i++) {
        // Draw circle at this position
        const hue = (i * 30 + time * 2) % 360;
        ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${0.4 + Math.sin(time * 0.02 + i * 0.5) * 0.2})`;
        ctx.lineWidth = 1 + i * 0.2;
        ctx.beginPath();
        ctx.arc(px, py, currentRadius, 0, TAU);
        ctx.stroke();

        // Glow for recent circles
        if (i > iterations - 5) {
            ctx.strokeStyle = `hsla(${hue}, 90%, 70%, 0.1)`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Move to next position using golden angle
        const goldenAngle = TAU / (PHI * PHI);
        angle += goldenAngle;

        const nextRadius = currentRadius * PHI;
        const distance = (currentRadius + nextRadius) / 2;

        px += Math.cos(angle) * distance;
        py += Math.sin(angle) * distance;

        currentRadius = nextRadius;
    }
}

// Platonic Solids - rotating wireframe projections
function drawPlatonicSolids(x, y, radius) {
    // Draw multiple platonic solids projected to 2D
    const solids = [
        { name: 'tetrahedron', vertices: 4, offset: -radius * 0.5 },
        { name: 'cube', vertices: 8, offset: 0 },
        { name: 'octahedron', vertices: 6, offset: radius * 0.5 }
    ];

    solids.forEach((solid, idx) => {
        const sy = y + solid.offset;
        const vertices = [];
        const n = solid.vertices;

        // Generate vertices for this solid
        for (let i = 0; i < n; i++) {
            const angle = (TAU / n) * i + rotationAngle * (idx % 2 === 0 ? 1 : -1);
            const vertexRadius = radius * 0.25 * (1 + Math.sin(time * 0.03 + idx) * 0.2);

            vertices.push({
                x: x + Math.cos(angle) * vertexRadius,
                y: sy + Math.sin(angle) * vertexRadius
            });
        }

        // Draw edges
        for (let i = 0; i < vertices.length; i++) {
            for (let j = i + 1; j < vertices.length; j++) {
                const hue = (idx * 90 + i * 30 + time * 2) % 360;
                ctx.strokeStyle = `hsla(${hue}, 75%, 65%, ${0.3 + Math.sin(time * 0.02 + i) * 0.15})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(vertices[i].x, vertices[i].y);
                ctx.lineTo(vertices[j].x, vertices[j].y);
                ctx.stroke();
            }
        }

        // Draw vertices
        vertices.forEach((v, i) => {
            const pulse = 2 + Math.sin(time * 0.05 + i + idx) * 1;
            ctx.fillStyle = `hsla(${idx * 90 + 45}, 85%, 70%, ${0.7 + Math.sin(time * 0.05 + i) * 0.3})`;
            ctx.beginPath();
            ctx.arc(v.x, v.y, pulse, 0, TAU);
            ctx.fill();
        });
    });
}

function drawPattern(pattern, x, y, radius, age = 0) {
    ctx.save();

    // Fade in new patterns
    if (age < 60) {
        ctx.globalAlpha = age / 60;
    }

    switch (pattern) {
        case 'flower':
            drawFlowerOfLife(x, y, radius);
            break;
        case 'sri':
            drawSriYantra(x, y, radius);
            break;
        case 'metatron':
            drawMetatronsCube(x, y, radius);
            break;
        case 'fibonacci':
            drawFibonacciSpiral(x, y, radius);
            break;
        case 'platonic':
            drawPlatonicSolids(x, y, radius);
            break;
    }

    ctx.restore();
}

function updateMetrics() {
    // Count total vertices across all patterns
    let vertexCount = 0;
    if (currentPattern === 'flower') vertexCount = spawnPoints.length * 37;
    else if (currentPattern === 'sri') vertexCount = spawnPoints.length * 45;
    else if (currentPattern === 'metatron') vertexCount = spawnPoints.length * 13;
    else if (currentPattern === 'fibonacci') vertexCount = spawnPoints.length * 12;
    else if (currentPattern === 'platonic') vertexCount = spawnPoints.length * 18;

    document.getElementById('vertex-count').textContent = vertexCount;

    // Symmetry order
    let symmetry = '6';
    if (currentPattern === 'sri') symmetry = '9';
    else if (currentPattern === 'metatron') symmetry = '13';
    else if (currentPattern === 'fibonacci') symmetry = 'φ';
    else if (currentPattern === 'platonic') symmetry = '5';

    document.getElementById('symmetry-order').textContent = symmetry + '-fold';

    // Rotation speed
    document.getElementById('rotation-speed').textContent = isAnimating ?
        (rotationSpeed * 10).toFixed(1) + '°/s' : 'frozen';

    // Harmony state
    let harmony = 'seeking';
    if (!isAnimating) harmony = 'crystallized';
    else if (spawnPoints.length > 5) harmony = 'transcendent';
    else if (spawnPoints.length > 2) harmony = 'harmonizing';

    document.getElementById('harmony-state').textContent = harmony;

    // Update stage class
    const stage = document.querySelector('.geometry-stage');
    stage.className = 'experiment-stage geometry-stage';
    if (!isAnimating) stage.classList.add('frozen');
    else if (spawnPoints.length > 5) stage.classList.add('transcendent');
    else if (spawnPoints.length > 2) stage.classList.add('harmonizing');
}

function animate() {
    // Clear with subtle fade
    ctx.fillStyle = 'rgba(0, 1, 3, 0.08)';
    ctx.fillRect(0, 0, width, height);

    if (isAnimating) {
        time++;
        rotationAngle += rotationSpeed * 0.01;
    }

    // Update spawn point ages
    spawnPoints.forEach(point => point.age++);

    // Remove old spawn points (keep last 8)
    if (spawnPoints.length > 8) {
        spawnPoints.shift();
    }

    // Draw patterns at all spawn points
    const baseRadius = Math.min(width, height) * 0.4;
    spawnPoints.forEach(point => {
        drawPattern(currentPattern, point.x, point.y, baseRadius, point.age);
    });

    updateMetrics();
    requestAnimationFrame(animate);
}

// Event listeners
window.addEventListener('resize', resizeCanvas);

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    spawnPoints.push({ x, y, age: 0 });
});

document.getElementById('pattern-flower').addEventListener('click', () => {
    currentPattern = 'flower';
    document.getElementById('geometry-message').textContent = '∴ flower of life // creation pattern // genesis code ∴';
    document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('pattern-flower').classList.add('active');
});

document.getElementById('pattern-sri').addEventListener('click', () => {
    currentPattern = 'sri';
    document.getElementById('geometry-message').textContent = '∴ sri yantra // cosmic convergence // manifestation matrix ∴';
    document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('pattern-sri').classList.add('active');
});

document.getElementById('pattern-metatron').addEventListener('click', () => {
    currentPattern = 'metatron';
    document.getElementById('geometry-message').textContent = '∴ metatron\'s cube // all platonic solids encoded // architectural blueprint ∴';
    document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('pattern-metatron').classList.add('active');
});

document.getElementById('pattern-fibonacci').addEventListener('click', () => {
    currentPattern = 'fibonacci';
    document.getElementById('geometry-message').textContent = '∴ fibonacci spiral // golden ratio manifest // nature\'s algorithm ∴';
    document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('pattern-fibonacci').classList.add('active');
});

document.getElementById('pattern-platonic').addEventListener('click', () => {
    currentPattern = 'platonic';
    document.getElementById('geometry-message').textContent = '∴ platonic solids // perfect forms // elemental structures ∴';
    document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('pattern-platonic').classList.add('active');
});

document.getElementById('toggle-motion').addEventListener('click', (e) => {
    isAnimating = !isAnimating;
    e.target.textContent = isAnimating ? 'freeze.time()' : 'resume.flow()';
});

document.getElementById('reset-geometry').addEventListener('click', () => {
    spawnPoints = [{ x: centerX, y: centerY, age: 0 }];
    rotationAngle = 0;
    time = 0;
});

// Initialize
resizeCanvas();
document.getElementById('pattern-flower').classList.add('active');
animate();
